"""
Chat Session API endpoints for conversation memory management
"""
import logging
from typing import List, Optional, Dict, Annotated
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse

from backend.core.config import Settings, get_settings
from backend.models.chat import (
    CreateChatSessionRequest,
    CreateChatSessionResponse,
    UpdateSessionDocumentsRequest,
    UpdateSessionDocumentsResponse,
    ChatSessionListResponse,
    ChatSessionResponse,
    AddMessageRequest,
    AddMessageResponse,
    ChatQuestionRequest,
    ChatAnswerResponse,
    MessageRole
)
from backend.models.document import SupportedLanguage
from backend.models.user import User
from backend.services.chat_session_service import ChatSessionService
from backend.services.qa_service import QAService
from backend.dependencies.services import (
    get_chat_session_service,
    get_qa_service,
    get_firestore_client
)
from backend.dependencies.auth import get_current_user, get_current_user_optional
from backend.services.firestore_client import FirestoreClient

from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class LegacyChatRequest(BaseModel):
    doc_id: str
    question: str
    history: Optional[List[Dict[str, str]]] = None


@router.post("/", response_model=ChatAnswerResponse)
async def chat_legacy(
    request: LegacyChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    qa_service: QAService = Depends(get_qa_service),
    firestore: FirestoreClient = Depends(get_firestore_client)
):
    """
    Legacy chat endpoint for compatibility with frontend.
    Now persists messages to chat sessions for authenticated users.
    """
    try:
        user_id = current_user.id if current_user else None
        
        # 1. Format history
        conversation_context = ""
        if request.history:
            conversation_context += "Recent conversation:\n"
            for msg in request.history[-5:]: # Last 5 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                conversation_context += f"{role}: {content}\n"
            conversation_context += "\n"

        # 2. Retrieve Clauses (using QAService helper)
        clauses = await qa_service._get_document_clauses(request.doc_id)
        
        # 3. Search Relevant Clauses
        relevant_clauses = await qa_service._search_relevant_clauses(
            request.question, 
            clauses, 
            request.doc_id
        )

        # 4. Generate Answer
        enhanced_question = request.question
        if conversation_context:
            enhanced_question = f"Previous context:\n{conversation_context}\n\nCurrent question: {request.question}"

        qa_result = await qa_service.gemini_client.answer_question(
            question=enhanced_question,
            relevant_clauses=relevant_clauses,
            doc_id=request.doc_id,
            language=SupportedLanguage.ENGLISH
        )
        
        # 5. Format Sources
        sources = qa_service._format_sources_dict(relevant_clauses, qa_result.get("used_clause_ids", []))

        # 6. Persist message if user is authenticated
        session_id = f"doc_{request.doc_id}"
        message_id = str(uuid4())
        if user_id:
            try:
                # Check if session exists, create if not
                existing_session = await firestore.get_chat_session(session_id)
                if not existing_session:
                    # Get document info for title
                    doc = await firestore.get_document(request.doc_id)
                    title = f"Chat: {doc.get('filename', 'Document')}" if doc else "Document Chat"
                    await firestore.create_chat_session(
                        session_id=session_id,
                        user_id=user_id,
                        title=title,
                        document_ids=[request.doc_id]
                    )
                
                # Save user message
                await firestore.save_chat_message(
                    session_id=session_id,
                    message_id=f"user_{message_id}",
                    role="user",
                    content=request.question
                )
                
                # Save assistant response
                await firestore.save_chat_message(
                    session_id=session_id,
                    message_id=f"assistant_{message_id}",
                    role="assistant",
                    content=qa_result.get("answer", ""),
                    sources=sources
                )
            except Exception as persist_error:
                logger.warning(f"Failed to persist chat message: {persist_error}")

        # 7. Return Response
        return ChatAnswerResponse(
            session_id=session_id,
            message_id=message_id,
            answer=qa_result.get("answer", ""),
            used_clause_ids=qa_result.get("used_clause_ids", []),
            confidence=qa_result.get("confidence", 0.0),
            sources=sources,
            conversation_context_used=bool(conversation_context),
            response_language=SupportedLanguage.ENGLISH
        )

    except Exception as e:
        logger.error(f"Error in legacy chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{doc_id}/initial")
async def get_initial_document_analysis(
    doc_id: str,
    chat_service: ChatSessionService = Depends(get_chat_session_service),
    qa_service: QAService = Depends(get_qa_service),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get initial document analysis for the chat page.
    Returns document info and initial AI analysis if processing is complete.
    If authenticated, ensures a chat session exists and persists the analysis.
    """
    try:
        from backend.dependencies.services import get_firestore_client, get_gemini_client
        
        firestore = get_firestore_client()
        document = await firestore.get_document(doc_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        status = document.get("status", "unknown")
        filename = document.get("filename", "Unknown document")
        
        # If document is not completed, return processing status
        if status != "completed":
            return {
                "doc_id": doc_id,
                "filename": filename,
                "status": status,
                "analysis": None,
                "ready": False
            }
        
        # Get clauses for initial analysis
        clauses = await firestore.get_document_clauses(doc_id)
        
        # Generate initial analysis summary
        gemini = get_gemini_client()
        
        if clauses:
            # Create summary of all clauses
            clause_summaries = []
            for clause in clauses:
                category = clause.get("category", "Other")
                summary = clause.get("summary", "")
                risk_level = clause.get("risk_level", "low")
                if summary:
                    clause_summaries.append(f"**{category}** (Risk: {risk_level}): {summary}")
            
            analysis = f"""## Document Analysis Complete

I've analyzed your document **{filename}** and identified **{len(clauses)} key sections**.

### Summary of Key Sections:

"""
            for i, summary in enumerate(clause_summaries[:7], 1):  # Show first 7
                analysis += f"{i}. {summary}\n\n"
            
            if len(clauses) > 7:
                analysis += f"\n*...and {len(clauses) - 7} more sections. Ask me about any specific section!*\n"
            
            analysis += """
---
Feel free to ask me any questions about this document!"""
        else:
            analysis = f"Document **{filename}** has been processed. Ask me questions about it!"
        
        # PERSISTENCE LOGIC
        session_id = None
        if current_user and analysis:
            try:
                # 1. Check if session already exists for this doc
                existing_sessions = await chat_service.list_sessions(
                    user_id=current_user.id, 
                    limit=20
                )
                
                # Check if any session is for THIS document
                for sess in existing_sessions:
                    # Check document context
                    if any(d.doc_id == doc_id for d in sess.selected_documents):
                        session_id = sess.session_id
                        # If session exists but has no messages, we should add the analysis
                        if sess.total_messages == 0:
                            logger.info(f"Found empty session {session_id} for doc {doc_id}, adding analysis")
                            await chat_service.add_message(
                                session_id,
                                AddMessageRequest(
                                    role=MessageRole.ASSISTANT,
                                    content=analysis
                                )
                            )
                        break
                
                # 2. If NO session exists, create one and add the analysis message
                if not session_id:
                    # Create session
                    create_req = CreateChatSessionRequest(
                        user_id=current_user.id,
                        title=f"Chat: {filename}",
                        selected_document_ids=[doc_id]
                    )
                    session, _ = await chat_service.create_session(create_req)
                    session_id = session.session_id
                    
                    # Add initial analysis as assistant message
                    await chat_service.add_message(
                        session_id,
                        AddMessageRequest(
                            role=MessageRole.ASSISTANT,
                            content=analysis
                        )
                    )
                    logger.info(f"Created new session {session_id} with initial analysis for doc {doc_id}")
            except Exception as persist_err:
                logger.error(f"Failed to persist initial analysis: {persist_err}")
                # Log traceback for better debugging
                import traceback
                logger.error(traceback.format_exc())

        return {
            "doc_id": doc_id,
            "filename": filename,
            "status": status,
            "analysis": analysis,
            "ready": True,
            "session_id": session_id  # Return session ID if available/created
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting initial analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions", response_model=CreateChatSessionResponse)
async def create_chat_session(
    request: CreateChatSessionRequest,
    chat_service: ChatSessionService = Depends(get_chat_session_service)
) -> CreateChatSessionResponse:
    """Create a new chat session."""
    try:
        session, selected_documents = await chat_service.create_session(request)
        return CreateChatSessionResponse(
            session_id=session.session_id,
            title=session.title,
            created_at=session.created_at,
            selected_documents=selected_documents
        )
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_chat_sessions(
    user_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
    current_user: Optional[User] = Depends(get_current_user_optional),
    chat_service: ChatSessionService = Depends(get_chat_session_service)
) -> ChatSessionListResponse:
    """List chat sessions. If authenticated, filters by current user."""
    try:
        # Use current user's ID if authenticated and no explicit user_id provided
        effective_user_id = user_id
        if current_user and not user_id:
            effective_user_id = current_user.id
        
        sessions = await chat_service.list_sessions(
            user_id=effective_user_id,
            limit=limit,
            include_archived=include_archived
        )
        return ChatSessionListResponse(
            sessions=sessions,
            total_count=len(sessions)
        )
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/me")
async def get_my_chat_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    firestore: FirestoreClient = Depends(get_firestore_client)
):
    """
    Get authenticated user's chat history.
    Returns list of chat sessions with message previews.
    """
    try:
        sessions = await firestore.list_user_chat_sessions(
            user_id=current_user.id,
            limit=limit,
            include_archived=False
        )
        
        # Format for frontend
        formatted_sessions = []
        for session in sessions:
            # Handle document_ids from either legacy field or selected_documents
            doc_ids = session.get("document_ids", [])
            if not doc_ids and session.get("selected_documents"):
                # Extract IDs from selected_documents objects
                doc_ids = [
                    d.get("doc_id") 
                    for d in session.get("selected_documents", []) 
                    if isinstance(d, dict) and d.get("doc_id")
                ]

            formatted_sessions.append({
                "session_id": session.get("session_id"),
                "title": session.get("title", "Untitled"),
                "document_ids": doc_ids,
                "message_count": session.get("message_count", 0),
                "last_message_preview": session.get("last_message_preview", ""),
                "created_at": session.get("created_at").isoformat() if session.get("created_at") else None,
                "updated_at": session.get("updated_at").isoformat() if session.get("updated_at") else None,
            })
        
        return {"sessions": formatted_sessions, "total": len(formatted_sessions)}
    except Exception as e:
        logger.error(f"Error getting user chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{session_id}/messages")
async def get_chat_session_messages(
    session_id: str,
    limit: Optional[int] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    firestore: FirestoreClient = Depends(get_firestore_client)
):
    """
    Get all messages for a chat session.
    """
    try:
        # Check session exists and belongs to user if authenticated
        session = await firestore.get_chat_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check authorization if user is authenticated
        if current_user and session.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        messages = await firestore.get_chat_session_messages(session_id, limit)
        
        # Format timestamps
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "message_id": msg.get("message_id"),
                "role": msg.get("role"),
                "content": msg.get("content"),
                "sources": msg.get("sources", []),
                "created_at": msg.get("created_at").isoformat() if msg.get("created_at") else None,
            })
        
        return {
            "session_id": session_id,
            "title": session.get("title"),
            "messages": formatted_messages
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: str,
    chat_service: ChatSessionService = Depends(get_chat_session_service)
) -> ChatSessionResponse:
    """Retrieve a chat session."""
    session = await chat_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionResponse(session=session)


@router.put("/sessions/{session_id}/documents", response_model=UpdateSessionDocumentsResponse)
async def update_session_documents(
    session_id: str,
    request: UpdateSessionDocumentsRequest,
    chat_service: ChatSessionService = Depends(get_chat_session_service)
) -> UpdateSessionDocumentsResponse:
    """Update session documents."""
    try:
        selected_documents = await chat_service.update_session_documents(session_id, request)
        return UpdateSessionDocumentsResponse(
            session_id=session_id,
            selected_documents=selected_documents,
            updated_at=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/messages", response_model=AddMessageResponse)
async def add_message_to_session(
    session_id: str,
    request: AddMessageRequest,
    chat_service: ChatSessionService = Depends(get_chat_session_service)
) -> AddMessageResponse:
    """Add a message to a session."""
    try:
        message = await chat_service.add_message(session_id, request)
        return AddMessageResponse(
            message_id=message.message_id,
            session_id=session_id,
            timestamp=message.timestamp
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/ask", response_model=ChatAnswerResponse)
async def ask_question_with_memory(
    session_id: str,
    request: ChatQuestionRequest,
    language: SupportedLanguage = SupportedLanguage.ENGLISH,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    qa_service: QAService = Depends(get_qa_service)
) -> ChatAnswerResponse:
    """Ask a question with chat memory."""
    return await qa_service.ask_chat_question(
        session_id=session_id,
        request=request,
        background_tasks=background_tasks,
        language_override=language
    )


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    chat_service: ChatSessionService = Depends(get_chat_session_service)
) -> JSONResponse:
    """Delete a chat session."""
    success = await chat_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete session")
    return JSONResponse(content={"message": "Deleted successfully"})


@router.put("/sessions/{session_id}/archive")
async def archive_chat_session(
    session_id: str,
    chat_service: ChatSessionService = Depends(get_chat_session_service)
) -> JSONResponse:
    """Archive a chat session."""
    success = await chat_service.archive_session(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to archive session")
    return JSONResponse(content={"message": "Archived successfully"})
