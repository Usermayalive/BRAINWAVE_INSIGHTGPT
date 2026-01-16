"""
Firestore integration service for document and clause storage
"""
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from uuid import uuid4

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
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
                # Configure client with connection pooling for better performance
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
        language: Optional[str] = "en"
    ) -> Dict[str, Any]:

        logger.info(f"Creating document record: {doc_id}")
        
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
                    "embedding": clause_data.get("embedding"),
                    "metadata": clause_data.get("metadata", {})
                }
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
