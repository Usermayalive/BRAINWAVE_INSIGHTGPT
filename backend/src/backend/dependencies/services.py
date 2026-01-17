"""
Service dependencies for FastAPI with singleton pattern to optimize performance.
"""
import logging
from functools import lru_cache
from typing import Optional

from backend.services.firestore_client import FirestoreClient
from backend.services.embeddings_service import EmbeddingsService  # Phase 3
from backend.services.gemini_client import GeminiClient            # Phase 2
from backend.services.chat_session_service import ChatSessionService # Phase 4
from backend.services.cache_service import InMemoryCache, get_cache
from backend.services.document_orchestrator import DocumentOrchestrator # Phase 4
from backend.services.document_queue_manager import DocumentQueueManager # Phase 4
from backend.services.language_detection_service import LanguageDetectionService # Phase 2
from backend.services.language_detection_service import LanguageDetectionService # Phase 2
from backend.services.qa_service import QAService # Phase 3
from backend.services.privacy_service import PrivacyService # Phase 4
from backend.services.risk_analyzer import RiskAnalyzer # Phase 4
from backend.services.negotiation_service import NegotiationService # Phase 4

logger = logging.getLogger(__name__)

# Global service instances (singletons)
_firestore_client: Optional[FirestoreClient] = None
_embeddings_service: Optional[EmbeddingsService] = None
_gemini_client: Optional[GeminiClient] = None
_chat_session_service: Optional[ChatSessionService] = None
_document_orchestrator: Optional[DocumentOrchestrator] = None
_document_queue_manager: Optional[DocumentQueueManager] = None
_language_detection_service: Optional[LanguageDetectionService] = None
_qa_service: Optional[QAService] = None
_privacy_service: Optional[PrivacyService] = None
_risk_analyzer: Optional[RiskAnalyzer] = None
_negotiation_service: Optional[NegotiationService] = None


@lru_cache()
def get_cache_service() -> InMemoryCache:
    """
    Get singleton Cache service instance.
    Uses lru_cache to ensure only one instance is created.
    """
    return get_cache()


@lru_cache()
def get_firestore_client() -> FirestoreClient:
    """
    Get singleton Firestore client instance.
    Uses lru_cache to ensure only one instance is created.
    """
    global _firestore_client
    if _firestore_client is None:
        logger.info("Initializing singleton Firestore client")
        _firestore_client = FirestoreClient()
    return _firestore_client


# Phase 3: Embeddings Service
@lru_cache()
def get_embeddings_service() -> EmbeddingsService:
    """
    Get singleton Embeddings service instance.
    Uses lru_cache to ensure only one instance is created.
    """
    global _embeddings_service
    if _embeddings_service is None:
        logger.info("Initializing singleton Embeddings service")
        _embeddings_service = EmbeddingsService()
    return _embeddings_service


# Phase 2: Gemini Client
@lru_cache()
def get_gemini_client() -> GeminiClient:
    """
    Get singleton Gemini client instance.
    Uses lru_cache to ensure only one instance is created.
    """
    global _gemini_client
    if _gemini_client is None:
        logger.info("Initializing singleton Gemini client")
        _gemini_client = GeminiClient()
    return _gemini_client


# Phase 4: Chat Session Service
@lru_cache()
def get_chat_session_service() -> ChatSessionService:
    """
    Get singleton Chat Session service instance.
    Uses lru_cache to ensure only one instance is created.
    """
    global _chat_session_service
    if _chat_session_service is None:
        logger.info("Initializing singleton Chat Session service")
        _chat_session_service = ChatSessionService()
    return _chat_session_service


@lru_cache()
def get_document_orchestrator() -> DocumentOrchestrator:
    """
    Get singleton Document Orchestrator instance.
    """
    global _document_orchestrator
    if _document_orchestrator is None:
        logger.info("Initializing singleton Document Orchestrator")
        _document_orchestrator = DocumentOrchestrator()
    return _document_orchestrator


@lru_cache()
def get_document_queue_manager() -> DocumentQueueManager:
    """
    Get singleton Document Queue Manager instance.
    """
    global _document_queue_manager
    if _document_queue_manager is None:
        logger.info("Initializing singleton Document Queue Manager")
        _document_queue_manager = DocumentQueueManager()
    return _document_queue_manager


# Phase 2: Language Detection Service
@lru_cache()
def get_language_detection_service() -> LanguageDetectionService:
    """
    Get singleton Language Detection service instance.
    Uses lru_cache to ensure only one instance is created.
    """
    global _language_detection_service
    if _language_detection_service is None:
        logger.info("Initializing singleton Language Detection service")
        _language_detection_service = LanguageDetectionService()
    return _language_detection_service


# Phase 3: QA Service
@lru_cache()
def get_qa_service() -> QAService:
    """
    Get singleton QA service instance.
    """
    global _qa_service
    if _qa_service is None:
        logger.info("Initializing singleton QA service")
        _qa_service = QAService()
    return _qa_service


# Phase 4: Privacy & Risk Services
@lru_cache()
def get_privacy_service() -> PrivacyService:
    global _privacy_service
    if _privacy_service is None:
        logger.info("Initializing singleton Privacy service")
        _privacy_service = PrivacyService()
    return _privacy_service


@lru_cache()
def get_risk_analyzer() -> RiskAnalyzer:
    global _risk_analyzer
    if _risk_analyzer is None:
        logger.info("Initializing singleton Risk Analyzer")
        _risk_analyzer = RiskAnalyzer()
    return _risk_analyzer


@lru_cache()
def get_negotiation_service() -> NegotiationService:
    global _negotiation_service
    if _negotiation_service is None:
        logger.info("Initializing singleton Negotiation Service")
        # We need dependencies
        gemini_client = get_gemini_client()
        risk_analyzer = get_risk_analyzer()
        _negotiation_service = NegotiationService(
            gemini_client=gemini_client,
            risk_analyzer=risk_analyzer
        )
    return _negotiation_service


def reset_services():
    """
    Reset all service instances (useful for testing or reinitialization).
    """
    global _firestore_client, _embeddings_service, _gemini_client, _chat_session_service, _document_orchestrator, _language_detection_service
    
    logger.info("Resetting all service instances")
    
    _firestore_client = None
    # _embeddings_service = None
    # _gemini_client = None
    # _chat_session_service = None
    # _document_orchestrator = None
    # _language_detection_service = None
    
    # Clear lru_cache for all dependency functions
    get_firestore_client.cache_clear()
    get_embeddings_service.cache_clear()
    # get_embeddings_service.cache_clear()
    get_gemini_client.cache_clear()
    get_chat_session_service.cache_clear()
    get_document_orchestrator.cache_clear()
    get_document_queue_manager.cache_clear()
    get_language_detection_service.cache_clear()
    get_qa_service.cache_clear()
    get_privacy_service.cache_clear()
    get_qa_service.cache_clear()
    get_privacy_service.cache_clear()
    get_risk_analyzer.cache_clear()
    get_negotiation_service.cache_clear()
    get_cache_service.cache_clear()


async def initialize_services():
    """
    Initialize all services at startup for faster subsequent access.
    """
    logger.info("Pre-initializing all services for optimal performance")
    
    # Initialize all services
    firestore_client = get_firestore_client()
    embeddings_service = get_embeddings_service()
    # embeddings_service = get_embeddings_service()
    gemini_client = get_gemini_client()
    chat_session_service = get_chat_session_service()
    language_detection_service = get_language_detection_service()
    qa_service = get_qa_service()
    cache_service = get_cache_service()
    document_orchestrator = get_document_orchestrator()
    document_queue_manager = get_document_queue_manager()
    
    # Initialize Gemini client (async initialization)
    try:
        await gemini_client.initialize()
    except Exception as e:
        logger.warning(f"Gemini client initialization failed (continuing startup): {e}")
    
    # Start cache cleanup task
    from backend.services.cache_service import start_cache_cleanup_task
    await start_cache_cleanup_task()
    
    logger.info("All services pre-initialized successfully")
