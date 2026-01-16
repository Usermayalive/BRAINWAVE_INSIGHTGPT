"""
Firestore integration service for document and clause storage
"""
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from uuid import uuid4

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.firestore_v1.vector import Vector
from google.api_core.exceptions import GoogleAPIError, NotFound

from backend.core.config import get_settings
from backend.core.logging import get_logger, LogContext
from backend.models.document import DocumentStatus, RiskLevel

logger = get_logger(__name__)


class FirestoreError(Exception):

    pass


class FirestoreClient:

    
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[firestore.Client] = None
        self._db: Optional[firestore.Client] = None
        self._initialized = False
    
    @property
    def db(self) -> firestore.Client:

        if self._db is None or not self._initialized:
            try:
                # Get credentials path from settings
                credentials_path = self.settings.GOOGLE_APPLICATION_CREDENTIALS
                
                if credentials_path and credentials_path != "path/to/service-account.json":
                    from google.oauth2 import service_account
                    credentials = service_account.Credentials.from_service_account_file(
                        credentials_path
                    )
                    self._client = firestore.Client(
                        project=self.settings.PROJECT_ID,
                        database=self.settings.FIRESTORE_DATABASE,
                        credentials=credentials
                    )
                else:
                    # Fall back to default credentials (ADC)
                    self._client = firestore.Client(
                        project=self.settings.PROJECT_ID,
                        database=self.settings.FIRESTORE_DATABASE
                    )
                    
                self._db = self._client
                self._initialized = True
                logger.info("Firestore client initialized with connection pooling")
            except Exception as e:
                logger.error(f"Failed to initialize Firestore client: {e}")
                raise FirestoreError(f"Firestore initialization failed: {e}")
        
        return self._db
    
    def close(self):

        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            self._initialized = False
    
    # Document Operations
    
    async def create_document(
        self,
        doc_id: str,
        filename: str,
        file_size: int,
        page_count: int,
        session_id: Optional[str] = None,
        language: Optional[str] = "en",
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new document record with optional user association."""
        logger.info(f"Creating document record: {doc_id} for user: {user_id}")
        
        document_data = {
            "doc_id": doc_id,
            "filename": filename,
            "file_size": file_size,
            "page_count": page_count,
            "status": DocumentStatus.PROCESSING.value,
            "language": language,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "processed_at": None,
            "masked": False,
            "session_id": session_id,
            "user_id": user_id,
            "clause_count": 0,
            "processing_metadata": {}
        }
        
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            doc_ref.set(document_data)
            return document_data
            
        except GoogleAPIError as e:
            logger.error(f"Failed to create document: {e}")
            raise FirestoreError(f"Failed to create document: {e}")

    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:

        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            doc = doc_ref.get()
            return doc.to_dict() if doc.exists else None
        except GoogleAPIError as e:
            logger.error(f"Failed to get document {doc_id}: {e}")
            raise FirestoreError(f"Failed to get document: {e}")

    async def list_documents(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List all documents, ordered by creation date (newest first).
        
        Args:
            limit: Maximum number of documents to return
            
        Returns:
            List of document dictionaries
        """
        try:
            docs_ref = (
                self.db.collection("documents")
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .limit(limit)
            )
            docs = docs_ref.stream()
            return [{"doc_id": doc.id, **doc.to_dict()} for doc in docs]
        except GoogleAPIError as e:
            logger.error(f"Failed to list documents: {e}")
            raise FirestoreError(f"Failed to list documents: {e}")

    async def update_document_status(
        self, 
        doc_id: str, 
        status: DocumentStatus,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update document processing status."""
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            update_data = {
                "status": status.value,
                "updated_at": firestore.SERVER_TIMESTAMP
            }
            if status == DocumentStatus.COMPLETED:
                update_data["processed_at"] = firestore.SERVER_TIMESTAMP
            if metadata:
                update_data.update(metadata)
            
            doc_ref.update(update_data)
            return True
            
        except GoogleAPIError as e:
            logger.error(f"Failed to update document status: {e}")
            raise FirestoreError(f"Failed to update document status: {e}")

    # Clause Operations
    
    async def create_clauses(
        self, 
        doc_id: str, 
        clauses_data: List[Dict[str, Any]]
    ) -> List[str]:
        """Create multiple clause records for a document."""
        logger.info(f"Creating {len(clauses_data)} clause records for doc {doc_id}")
        
        batch = self.db.batch()
        clause_ids = []
        
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            clauses_collection = doc_ref.collection("clauses")
            
            for i, clause_data in enumerate(clauses_data):
                clause_id = clause_data.get("clause_id", f"{doc_id}_clause_{i}")
                clause_ref = clauses_collection.document(clause_id)
                
                firestore_clause_data = {
                    "clause_id": clause_id,
                    "doc_id": doc_id,
                    "order": clause_data.get("order", i + 1),
                    "original_text": clause_data.get("original_text", ""),
                    "summary": clause_data.get("summary", ""),
                    "category": clause_data.get("category", "Other"),
                    "risk_level": clause_data.get("risk_level", "moderate"),
                    "needs_review": clause_data.get("needs_review", False),
                    "readability_metrics": clause_data.get("readability_metrics", {}),
                    "negotiation_tip": clause_data.get("negotiation_tip"),
                    "language": clause_data.get("language", "en"),
                    "confidence": clause_data.get("confidence", 0.5),
                    "processing_method": clause_data.get("processing_method", "unknown"),
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                    "metadata": clause_data.get("metadata", {})
                }
                
                # Add embedding if present
                embedding = clause_data.get("embedding")
                if embedding:
                    firestore_clause_data["embedding"] = Vector(embedding)
                    
                batch.set(clause_ref, firestore_clause_data)
                clause_ids.append(clause_id)
            
            batch.commit()
            await self._update_clause_count(doc_id, len(clause_ids))
            
            return clause_ids
            
        except GoogleAPIError as e:
            logger.error(f"Failed to create clauses: {e}")
            raise FirestoreError(f"Failed to create clauses: {e}")

    async def _update_clause_count(self, doc_id: str, count: int) -> bool:
        """Update the clause count in the document record."""
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            doc_ref.update({
                "clause_count": count,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            logger.warning(f"Failed to update clause count: {e}")
            return False

    async def get_document_clauses(
        self, 
        doc_id: str, 
        order_by: str = "order"
    ) -> List[Dict[str, Any]]:
        """Get all clauses for a document."""
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            clauses_collection = doc_ref.collection("clauses")
            query = clauses_collection.order_by(order_by)
            return [clause.to_dict() for clause in query.stream()]
            
        except GoogleAPIError as e:
            logger.error(f"Failed to get clauses for document {doc_id}: {e}")
            raise FirestoreError(f"Failed to get clauses: {e}")

    async def get_clause(self, doc_id: str, clause_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific clause by ID."""
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            clause_ref = doc_ref.collection("clauses").document(clause_id)
            clause = clause_ref.get()
            return clause.to_dict() if clause.exists else None
        except GoogleAPIError as e:
            logger.error(f"Failed to get clause {clause_id}: {e}")
            raise FirestoreError(f"Failed to get clause: {e}")

    async def search_similar_clauses(
        self, 
        doc_id: str, 
        query_embedding: List[float], 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar clauses using vector search."""
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            clauses_collection = doc_ref.collection("clauses")
            
            # Vector search query
            # Requires an index on the 'embedding' field
            vector_query = clauses_collection.find_nearest(
                vector_field="embedding",
                query_vector=Vector(query_embedding),
                distance_measure=firestore.DistanceMeasure.COSINE,
                limit=limit
            )
            
            results = vector_query.get()
            return [doc.to_dict() for doc in results]
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise FirestoreError(f"Vector search failed: {e}")

    async def update_clause_embeddings(
        self,
        doc_id: str,
        embeddings_map: Dict[str, List[float]]
    ) -> bool:
        """
        Update embeddings for specific clauses.
        
        Args:
            doc_id: Document ID
            embeddings_map: Dictionary mapping clause_id to embedding vector
        """
        try:
            doc_ref = self.db.collection("documents").document(doc_id)
            clauses_collection = doc_ref.collection("clauses")
            batch = self.db.batch()
            
            count = 0
            for clause_id, embedding in embeddings_map.items():
                clause_ref = clauses_collection.document(clause_id)
                batch.update(clause_ref, {"embedding": Vector(embedding)})
                count += 1
                
                if count >= 400:  # Commit batch periodically
                    batch.commit()
                    batch = self.db.batch()
                    count = 0
            
            if count > 0:
                batch.commit()
                
            return True
        except Exception as e:
            logger.error(f"Failed to update clause embeddings: {e}")
            raise FirestoreError(f"Failed to update embeddings: {e}")

    # Negotiation Operations
    
    async def save_negotiation_history(
        self,
        negotiation_id: str,
        history_data: Dict[str, Any]
    ) -> bool:
        """Save negotiation history to Firestore."""
        logger.info(f"Saving negotiation history: {negotiation_id}")
        
        try:
            history_data["created_at"] = history_data.get("created_at", firestore.SERVER_TIMESTAMP)
            history_data["updated_at"] = firestore.SERVER_TIMESTAMP
            
            self.db.collection("negotiations").document(negotiation_id).set(
                history_data,
                merge=True
            )
            return True
            
        except GoogleAPIError as e:
            logger.error(f"Failed to save negotiation: {e}")
            raise FirestoreError(f"Failed to save negotiation: {e}")

    # User Management
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        try:
            users_ref = self.db.collection("users")
            # Use where with FieldFilter for consistency with other methods, or simple args
            query = users_ref.where(filter=FieldFilter("email", "==", email)).limit(1)
            results = query.get()
            
            if not results:
                return None
            
            doc = results[0]
            user_data = doc.to_dict()
            user_data["id"] = doc.id
            return user_data
        except Exception as e:
            logger.error(f"Failed to get user by email: {e}")
            raise FirestoreError(f"Failed to get user: {e}")

    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user."""
        try:
            # Use email as document ID for easy lookup, or auto-id
            # Let's use auto-id but enforce unique email via query check (done in service)
            doc_ref = self.db.collection("users").document()
            user_data["created_at"] = firestore.SERVER_TIMESTAMP
            doc_ref.set(user_data)
            return doc_ref.id
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise FirestoreError(f"Failed to create user: {e}")

    async def get_negotiation_history(
        self,
        doc_id: str,
        clause_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve negotiation history for a document or clause."""
        try:
            query = self.db.collection("negotiations").where(
                filter=FieldFilter("doc_id", "==", doc_id)
            )
            if clause_id:
                query = query.where(filter=FieldFilter("clause_id", "==", clause_id))
            
            docs = query.stream()
            history = []
            for doc in docs:
                data = doc.to_dict()
                data["negotiation_id"] = doc.id
                history.append(data)
            
            history.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
            return history
            
        except GoogleAPIError as e:
            logger.error(f"Failed to retrieve negotiations: {e}")
            raise FirestoreError(f"Failed to retrieve negotiations: {e}")

    # Session Operations
    
    async def create_session(self, session_id: Optional[str] = None) -> str:
        """Create a new session record."""
        if session_id is None:
            session_id = str(uuid4())
        
        try:
            session_data = {
                "session_id": session_id,
                "created_at": firestore.SERVER_TIMESTAMP,
                "last_activity": firestore.SERVER_TIMESTAMP,
                "locale": "en",
                "document_count": 0,
                "qa_count": 0
            }
            
            self.db.collection("sessions").document(session_id).set(session_data)
            return session_id
            
        except GoogleAPIError as e:
            logger.error(f"Failed to create session: {e}")
            raise FirestoreError(f"Failed to create session: {e}")
    
    async def update_session_activity(self, session_id: str) -> bool:
        """Update session last activity timestamp."""
        try:
            self.db.collection("sessions").document(session_id).update({
                "last_activity": firestore.SERVER_TIMESTAMP
            })
            return True
        except GoogleAPIError as e:
            logger.error(f"Failed to update session activity: {e}")
            return False

    async def get_document_statistics(self, doc_id: str) -> Dict[str, Any]:
        """Get aggregated statistics for a document."""
        try:
            document = await self.get_document(doc_id)
            if not document:
                raise FirestoreError(f"Document {doc_id} not found")
            
            clauses = await self.get_document_clauses(doc_id)
            
            risk_distribution = {"low": 0, "moderate": 0, "attention": 0}
            category_distribution = {}
            needs_review_count = 0
            
            for clause in clauses:
                risk = clause.get("risk_level", "moderate")
                risk_distribution[risk] = risk_distribution.get(risk, 0) + 1
                
                cat = clause.get("category", "Other")
                category_distribution[cat] = category_distribution.get(cat, 0) + 1
                
                if clause.get("needs_review"):
                    needs_review_count += 1
            
            return {
                "doc_id": doc_id,
                "total_clauses": len(clauses),
                "risk_distribution": risk_distribution,
                "category_distribution": category_distribution,
                "needs_review_count": needs_review_count,
                "generated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            raise FirestoreError(f"Failed to get stats: {e}")

    # Health check
    
    async def health_check(self) -> bool:
        """Check if Firestore is accessible."""
        try:
            collections = self.db.collections()
            list(collections)
            return True
        except Exception as e:
            logger.error(f"Firestore health check failed: {e}")
            return False

    # User-Specific Document Operations
    
    async def list_user_documents(
        self, 
        user_id: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        List documents for a specific user, ordered by creation date.
        
        Args:
            user_id: User ID to filter by
            limit: Maximum number of documents to return
            
        Returns:
            List of document dictionaries belonging to the user
        """
        try:
            docs_ref = (
                self.db.collection("documents")
                .where(filter=FieldFilter("user_id", "==", user_id))
                .limit(limit)
            )
            docs = docs_ref.stream()
            results = [{"doc_id": doc.id, **doc.to_dict()} for doc in docs]
            # Manual sort to avoid composite index requirement in dev
            results.sort(key=lambda x: x.get("created_at") or datetime.min, reverse=True)
            return results
        except GoogleAPIError as e:
            logger.error(f"Failed to list user documents: {e}")
            raise FirestoreError(f"Failed to list user documents: {e}")

    # Chat Session Operations
    
    async def create_chat_session(
        self,
        session_id: str,
        user_id: str,
        title: Optional[str] = None,
        document_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a new chat session for a user.
        
        Args:
            session_id: Unique session identifier
            user_id: User who owns this session
            title: Optional session title
            document_ids: Optional list of associated document IDs
            
        Returns:
            Created session data
        """
        logger.info(f"Creating chat session {session_id} for user {user_id}")
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "title": title or "New Conversation",
            "document_ids": document_ids or [],
            "message_count": 0,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "is_archived": False
        }
        
        try:
            self.db.collection("chat_sessions").document(session_id).set(session_data)
            return session_data
        except GoogleAPIError as e:
            logger.error(f"Failed to create chat session: {e}")
            raise FirestoreError(f"Failed to create chat session: {e}")

    async def get_chat_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a chat session by ID."""
        try:
            doc_ref = self.db.collection("chat_sessions").document(session_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["session_id"] = doc.id
                return data
            return None
        except GoogleAPIError as e:
            logger.error(f"Failed to get chat session {session_id}: {e}")
            raise FirestoreError(f"Failed to get chat session: {e}")

    async def list_user_chat_sessions(
        self,
        user_id: str,
        limit: int = 50,
        include_archived: bool = False
    ) -> List[Dict[str, Any]]:
        """
        List chat sessions for a user.
        
        Args:
            user_id: User ID to filter by
            limit: Maximum sessions to return
            include_archived: Whether to include archived sessions
            
        Returns:
            List of chat session dictionaries
        """
        try:
            query = (
                self.db.collection("chat_sessions")
                .where(filter=FieldFilter("user_id", "==", user_id))
            )
            
            if not include_archived:
                query = query.where(filter=FieldFilter("is_archived", "==", False))
            
            # query = query.order_by("updated_at", direction=firestore.Query.DESCENDING).limit(limit)
            query = query.limit(limit)
            
            sessions = []
            for doc in query.stream():
                data = doc.to_dict()
                data["session_id"] = doc.id
                sessions.append(data)
            
            # Manual sort to avoid composite index requirement
            sessions.sort(key=lambda x: x.get("updated_at") or datetime.min, reverse=True)
            
            return sessions
        except GoogleAPIError as e:
            logger.error(f"Failed to list user chat sessions: {e}")
            raise FirestoreError(f"Failed to list user chat sessions: {e}")

    async def save_chat_message(
        self,
        session_id: str,
        message_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save a chat message to a session.
        
        Args:
            session_id: Chat session ID
            message_id: Unique message identifier
            role: Message role (user, assistant, system)
            content: Message content
            sources: Optional source citations
            metadata: Optional additional metadata
            
        Returns:
            Saved message data
        """
        message_data = {
            "message_id": message_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "sources": sources or [],
            "metadata": metadata or {},
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        try:
            # Save message to subcollection
            session_ref = self.db.collection("chat_sessions").document(session_id)
            session_ref.collection("messages").document(message_id).set(message_data)
            
            # Update session metadata
            session_ref.update({
                "updated_at": firestore.SERVER_TIMESTAMP,
                "message_count": firestore.Increment(1),
                "last_message_preview": content[:100] if content else ""
            })
            
            return message_data
        except GoogleAPIError as e:
            logger.error(f"Failed to save chat message: {e}")
            raise FirestoreError(f"Failed to save chat message: {e}")

    async def get_chat_session_messages(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all messages for a chat session.
        
        Args:
            session_id: Chat session ID
            limit: Optional limit on messages to return
            
        Returns:
            List of messages ordered by creation time
        """
        try:
            session_ref = self.db.collection("chat_sessions").document(session_id)
            query = session_ref.collection("messages").order_by("created_at")
            
            if limit:
                query = query.limit(limit)
            
            messages = []
            for doc in query.stream():
                data = doc.to_dict()
                data["message_id"] = doc.id
                messages.append(data)
            
            return messages
        except GoogleAPIError as e:
            logger.error(f"Failed to get chat messages: {e}")
            raise FirestoreError(f"Failed to get chat messages: {e}")

    async def update_chat_session(
        self,
        session_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """
        Update a chat session's metadata.
        
        Args:
            session_id: Chat session ID
            updates: Dictionary of fields to update
            
        Returns:
            True if successful
        """
        try:
            updates["updated_at"] = firestore.SERVER_TIMESTAMP
            self.db.collection("chat_sessions").document(session_id).update(updates)
            return True
        except GoogleAPIError as e:
            logger.error(f"Failed to update chat session: {e}")
            raise FirestoreError(f"Failed to update chat session: {e}")

    async def delete_chat_session(self, session_id: str) -> bool:
        """
        Delete a chat session and all its messages.
        
        Args:
            session_id: Chat session ID
            
        Returns:
            True if successful
        """
        try:
            session_ref = self.db.collection("chat_sessions").document(session_id)
            
            # Delete all messages in subcollection
            messages = session_ref.collection("messages").stream()
            for msg in messages:
                msg.reference.delete()
            
            # Delete the session document
            session_ref.delete()
            return True
        except GoogleAPIError as e:
            logger.error(f"Failed to delete chat session: {e}")
            raise FirestoreError(f"Failed to delete chat session: {e}")

    async def archive_chat_session(self, session_id: str) -> bool:
        """Archive a chat session (soft delete)."""
        return await self.update_chat_session(session_id, {"is_archived": True})

