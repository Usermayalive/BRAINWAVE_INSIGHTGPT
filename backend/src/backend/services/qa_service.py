"""
QA Service for handling Question & Answer logic with RAG and Chat Memory
"""
import logging
import json
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from fastapi import BackgroundTasks, HTTPException

from google.cloud.firestore import SERVER_TIMESTAMP

from backend.core.config import get_settings
from backend.models.qa import QuestionRequest, AnswerResponse, SourceCitation
from backend.models.chat import (
    ChatQuestionRequest, 
    ChatAnswerResponse, 
    MessageRole, 
    AddMessageRequest
)
from backend.models.document import SupportedLanguage
from backend.services.firestore_client import FirestoreClient, FirestoreError
from backend.services.embeddings_service import EmbeddingsService, EmbeddingsError
from backend.services.gemini_client import GeminiClient, GeminiError
from backend.services.chat_session_service import ChatSessionService
from backend.services.language_detection_service import LanguageDetectionService, DetectionMethod
from backend.services.cache_service import InMemoryCache, CacheKeys

logger = logging.getLogger(__name__)


class QAService:
    """Service for handling Question & Answer interactions."""

    def __init__(self):
        self.settings = get_settings()
        self.firestore_client = FirestoreClient()
        self.embeddings_service = EmbeddingsService()
        self.gemini_client = GeminiClient()
        self.chat_session_service = ChatSessionService()
        self.language_detection_service = LanguageDetectionService()
        self.cache_service = InMemoryCache() # We might want to inject this, but for now new instance/singleton via module is fine if logic permits. 
                                             # Actually better to use the singleton from dependencies if possible, but here we init. 
                                             # For better pattern, we should probably pass it or use get_cache().
        from backend.services.cache_service import get_cache
        self.cache_service = get_cache()

    async def ask_question(
        self,
        request: QuestionRequest,
        background_tasks: BackgroundTasks,
        language_override: Optional[SupportedLanguage] = None
    ) -> AnswerResponse:
        """
        Process a standard Q&A request for a document.
        """
        logger.info(f"Q&A request for doc_id: {request.doc_id}")

        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        # 1. Language Detection
        detected_language, response_language, detection_conf, detection_method = await self._handle_language_detection(
            request.question,
            request.auto_detect_language,
            language_override or request.language_override,
            request.session_id,
            request.session_context
        )

        # 2. Chat Session Context (if provided)
        conversation_context = ""
        conversation_context_used = False
        chat_session_id = request.chat_session_id

        if chat_session_id and request.use_conversation_memory:
            conversation_history, context_summary = await self.chat_session_service.get_conversation_context(
                chat_session_id,
                max_messages=10
            )
            
            if context_summary:
                conversation_context += f"Previous conversation summary: {context_summary}\n\n"
            
            if conversation_history:
                conversation_context += "Recent conversation:\n"
                for msg in conversation_history[-5:]:
                    conversation_context += f"{msg.role.value}: {msg.content}\n"
                conversation_context += "\n"
                
            conversation_context_used = len(conversation_history) > 0 or bool(context_summary)
            
            # Store user message in background
            background_tasks.add_task(
                self.chat_session_service.add_message,
                chat_session_id,
                AddMessageRequest(
                    role=MessageRole.USER,
                    content=request.question,
                    metadata={"doc_id": request.doc_id, "legacy_qa": True}
                )
            )

        # 3. Retrieve Clauses
        clauses = await self._get_document_clauses(request.doc_id)
        
        # 4. Search Relevant Clauses
        relevant_clauses = await self._search_relevant_clauses(
            request.question, 
            clauses, 
            request.doc_id
        )

        if not relevant_clauses:
             return self._create_empty_response(
                "I couldn't find relevant content in this document.",
                chat_session_id,
                conversation_context_used,
                detected_language,
                response_language,
                detection_conf,
                detection_method,
                background_tasks,
                request.doc_id
            )

        # 5. Generate Answer
        logger.info(f"Generating answer using Gemini for {len(relevant_clauses)} clauses")
        enhanced_question = request.question
        if conversation_context:
            enhanced_question = f"Previous context:\n{conversation_context}\n\nCurrent question: {request.question}"

        qa_result = await self.gemini_client.answer_question(
            question=enhanced_question,
            relevant_clauses=relevant_clauses,
            doc_id=request.doc_id,
            language=response_language
        )

        # 6. Format Sources
        sources = self._format_sources(relevant_clauses, qa_result.get("used_clause_ids", []))

        # 7. Background Tasks (History & Session Update)
        background_tasks.add_task(
            self._store_qa_history,
            request,
            qa_result,
            relevant_clauses
        )

        if chat_session_id:
            background_tasks.add_task(
                self.chat_session_service.add_message,
                chat_session_id,
                AddMessageRequest(
                    role=MessageRole.ASSISTANT,
                    content=qa_result.get("answer", ""),
                    sources=[source.model_dump() for source in sources],
                    metadata={
                        "used_clause_ids": qa_result.get("used_clause_ids", []),
                        "confidence": qa_result.get("confidence", 0.0),
                        "doc_id": request.doc_id,
                        "conversation_context_used": conversation_context_used
                    }
                )
            )

        return AnswerResponse(
            answer=qa_result.get("answer", ""),
            used_clause_ids=qa_result.get("used_clause_ids", []),
            confidence=qa_result.get("confidence", 0.0),
            sources=sources,
            chat_session_id=chat_session_id,
            conversation_context_used=conversation_context_used,
            detected_language=detected_language,
            response_language=response_language,
            language_detection_confidence=detection_conf,
            detection_method=detection_method
        )

    async def ask_chat_question(
        self,
        session_id: str,
        request: ChatQuestionRequest,
        background_tasks: BackgroundTasks,
        language_override: Optional[SupportedLanguage] = None
    ) -> ChatAnswerResponse:
        """
        Process a chat-based Q&A request with full session context.
        """
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        # 1. Validate Session & Documents
        session = await self.chat_session_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        if not session.selected_documents:
             raise HTTPException(
                status_code=400,
                detail="No documents selected in this chat session. Please add documents first."
            )
        
        # 2. Language Detection
        detected_language, response_language, detection_conf, detection_method = await self._handle_language_detection(
            request.question,
            request.auto_detect_language,
            language_override or request.language_override,
            session_id=session_id
        )

        # 3. Add User Message
        user_message_req = AddMessageRequest(
            role=MessageRole.USER,
            content=request.question,
            metadata={"include_history": request.include_conversation_history}
        )
        # We await this because we want to ensure message order
        await self.chat_session_service.add_message(session_id, user_message_req)

        # 4. Get Context
        conversation_context = ""
        conversation_context_used = False
        conversation_history = []
        context_summary = None

        if request.include_conversation_history:
            conversation_history, context_summary = await self.chat_session_service.get_conversation_context(
                session_id,
                max_messages=request.max_history_messages
            )
            conversation_context_used = len(conversation_history) > 0 or bool(context_summary)
            
            if context_summary:
                conversation_context += f"Previous conversation summary: {context_summary}\n\n"
            if conversation_history:
                conversation_context += "Recent conversation:\n"
                for msg in conversation_history[-5:]:
                    conversation_context += f"{msg.role.value}: {msg.content}\n"
                conversation_context += "\n"

        # 5. Search Across Documents
        all_relevant_clauses = []
        
        for doc_context in session.selected_documents:
            try:
                doc_clauses = await self._get_document_clauses(doc_context.doc_id)
                relevant = await self._search_relevant_clauses(
                    request.question,
                    doc_clauses,
                    doc_context.doc_id,
                    top_k=3 # fewer per doc since potentially multiple docs
                )
                all_relevant_clauses.extend(relevant)
            except HTTPException:
                continue # Skip if doc not found or processing error
            except Exception as e:
                logger.warning(f"Error searching document {doc_context.doc_id}: {e}")
        
        if not all_relevant_clauses:
             # Add assistant response about failure
            assistant_msg = await self.chat_session_service.add_message(
                session_id,
                AddMessageRequest(
                    role=MessageRole.ASSISTANT,
                    content="I couldn't find any clauses in the selected documents that relate to your question.",
                    metadata={"no_relevant_clauses": True}
                )
            )
            return ChatAnswerResponse(
                session_id=session_id,
                message_id=assistant_msg.message_id,
                answer="I couldn't find any clauses in the selected documents that relate to your question.",
                used_clause_ids=[],
                confidence=0.0,
                sources=[],
                conversation_context_used=conversation_context_used,
                detected_language=detected_language,
                response_language=response_language,
                language_detection_confidence=detection_conf,
                detection_method=detection_method,
                timestamp=assistant_msg.timestamp
            )

        # 6. Generate Answer
        enhanced_question = request.question
        if conversation_context:
            enhanced_question = f"Previous context:\n{conversation_context}\n\nCurrent question: {request.question}"

        qa_result = await self.gemini_client.answer_question(
            question=enhanced_question,
            relevant_clauses=all_relevant_clauses,
            doc_id=session.selected_documents[0].doc_id, # Compatibility
            language=response_language
        )

        sources = self._format_sources_dict(all_relevant_clauses, qa_result.get("used_clause_ids", []))

        # 7. Add Assistant Message
        assistant_message = await self.chat_session_service.add_message(
            session_id,
            AddMessageRequest(
                role=MessageRole.ASSISTANT,
                content=qa_result.get("answer", ""),
                sources=sources,
                metadata={
                    "used_clause_ids": qa_result.get("used_clause_ids", []),
                    "confidence": qa_result.get("confidence", 0.0),
                    "conversation_context_used": conversation_context_used,
                    "documents_processed": [doc.doc_id for doc in session.selected_documents]
                }
            )
        )

        return ChatAnswerResponse(
            session_id=session_id,
            message_id=assistant_message.message_id,
            answer=qa_result.get("answer", ""),
            used_clause_ids=qa_result.get("used_clause_ids", []),
            confidence=qa_result.get("confidence", 0.0),
            sources=sources,
            conversation_context_used=conversation_context_used,
            additional_insights=qa_result.get("additional_insights"),
            detected_language=detected_language,
            response_language=response_language,
            language_detection_confidence=detection_conf,
            detection_method=detection_method,
            timestamp=assistant_message.timestamp
        )

    # --- Helper Methods ---

    async def _handle_language_detection(
        self, 
        text: str, 
        auto_detect: bool, 
        override: Optional[SupportedLanguage],
        session_id: Optional[str] = None,
        context: Optional[str] = None
    ) -> Tuple[Optional[SupportedLanguage], SupportedLanguage, Optional[float], Optional[str]]:
        
        detected_language = None
        response_language = SupportedLanguage.ENGLISH # Default
        confidence = None
        method = None

        if auto_detect:
            result = await self.language_detection_service.detect_language_advanced(
                text=text,
                session_id=session_id,
                context=context
            )
            detected_language = result.language
            confidence = result.confidence
            method = result.method

            if override:
                response_language = override
            elif result.confidence > 0.8:
                response_language = detected_language
        elif override:
            response_language = override
        
        return detected_language, response_language, confidence, method

    async def _get_document_clauses(self, doc_id: str) -> List[Dict[str, Any]]:
        # Check cache
        cache_key = CacheKeys.document_clauses(doc_id)
        clauses = await self.cache_service.get(cache_key)
        
        if not clauses:
            clauses = await self.firestore_client.get_document_clauses(doc_id)
            if clauses:
                await self.cache_service.set(cache_key, clauses, ttl=1800)
        
        if not clauses:
            raise HTTPException(status_code=404, detail=f"No clauses found for document {doc_id}")
            
        return clauses

    async def _search_relevant_clauses(
        self, 
        question: str, 
        clauses: List[Dict[str, Any]], 
        doc_id: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        
        # Filter clauses with embeddings
        clauses_with_embeddings = [
            c for c in clauses 
            if c.get("embedding") and len(c.get("embedding", [])) > 0
        ]

        if not clauses_with_embeddings:
            # Fallback generation could happen here, keeping it simple for now as per updated port
            # In real scenario, we might trigger generation.
            logger.warning(f"No embeddings for doc {doc_id}")
            return []

        return await self.embeddings_service.search_similar_clauses(
            question=question,
            clause_embeddings=clauses_with_embeddings,
            top_k=top_k,
            min_similarity=0.2
        )

    def _format_sources(
        self, 
        clauses: List[Dict[str, Any]], 
        used_ids: List[str]
    ) -> List[SourceCitation]:
        sources = []
        for clause in clauses:
            if clause.get("clause_id") in used_ids:
                original_text = clause.get("original_text", "")
                snippet = original_text[:300] + "..." if len(original_text) > 300 else original_text
                
                sources.append(SourceCitation(
                    clause_id=clause["clause_id"],
                    clause_number=clause.get("order"),
                    category=clause.get("category"),
                    snippet=snippet,
                    relevance_score=clause.get("similarity", 0.0)
                ))
        return sources

    def _format_sources_dict(
        self, 
        clauses: List[Dict[str, Any]], 
        used_ids: List[str]
    ) -> List[Dict[str, Any]]:
        # Same as _format_sources but returns dict (for ChatAnswerResponse)
        sources = []
        for clause in clauses:
            if clause.get("clause_id") in used_ids:
                original_text = clause.get("original_text", "")
                snippet = original_text[:300] + "..." if len(original_text) > 300 else original_text
                
                sources.append({
                    "clause_id": clause["clause_id"],
                    "clause_number": clause.get("order"),
                    "category": clause.get("category"),
                    "snippet": snippet,
                    "relevance_score": clause.get("similarity", 0.0)
                })
        return sources

    async def _store_qa_history(
        self,
        request: QuestionRequest,
        qa_result: Dict[str, Any],
        relevant_clauses: List[Dict[str, Any]]
    ) -> None:
        try:
            qa_id = str(uuid4())
            qa_history = {
                "qa_id": qa_id,
                "doc_id": request.doc_id,
                "question": request.question,
                "answer": qa_result.get("answer", ""),
                "clause_ids": qa_result.get("used_clause_ids", []),
                "confidence": qa_result.get("confidence", 0.0),
                "timestamp": SERVER_TIMESTAMP,
                "session_id": request.session_id,
                "relevant_clause_count": len(relevant_clauses)
            }
            db = self.firestore_client.db
            qa_ref = db.collection("qa_history").document(qa_id)
            qa_ref.set(qa_history)
        except Exception as e:
            logger.error(f"Failed to store QA history: {e}")

    def _create_empty_response(
        self,
        message: str,
        chat_session_id: Optional[str],
        conversation_context_used: bool,
        detected_lang: Optional[SupportedLanguage],
        response_lang: SupportedLanguage,
        conf: Optional[float],
        method: Optional[str],
        background_tasks: BackgroundTasks,
        doc_id: str
    ) -> AnswerResponse:
        
        if chat_session_id:
             background_tasks.add_task(
                self.chat_session_service.add_message,
                chat_session_id,
                AddMessageRequest(
                    role=MessageRole.ASSISTANT,
                    content=message,
                    metadata={"no_relevant_clauses": True, "doc_id": doc_id}
                )
            )

        return AnswerResponse(
            answer=message,
            used_clause_ids=[],
            confidence=0.0,
            sources=[],
            chat_session_id=chat_session_id,
            conversation_context_used=conversation_context_used,
            detected_language=detected_lang,
            response_language=response_lang,
            language_detection_confidence=conf,
            detection_method=method
        )
