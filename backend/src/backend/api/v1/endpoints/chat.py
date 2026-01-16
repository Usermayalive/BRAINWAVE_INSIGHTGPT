import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from backend.services.document_storage import get_document_storage
from backend.services.gemini_service import get_gemini_service

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    doc_id: str
    question: str
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    answer: str
    doc_id: str
    filename: str
    success: bool


@router.post("", response_model=ChatResponse)
async def chat_about_document(request: ChatRequest):
    logger.info(f"Chat request for doc: {request.doc_id}")
    
    storage = get_document_storage()
    doc = await storage.get_document(request.doc_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document_text = await storage.get_document_text(request.doc_id)
    
    if not document_text:
        raise HTTPException(status_code=400, detail="Document text not available")
    
    gemini = get_gemini_service()
    result = gemini.chat_sync(
        question=request.question,
        document_text=document_text,
        filename=doc.filename
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Chat failed"))
    
    return ChatResponse(
        answer=result["answer"],
        doc_id=request.doc_id,
        filename=doc.filename,
        success=True
    )


@router.get("/{doc_id}/initial")
async def get_initial_analysis(doc_id: str):
    logger.info(f"Initial analysis request for doc: {doc_id}")
    
    storage = get_document_storage()
    doc = await storage.get_document(doc_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    analysis = await storage.get_analysis(doc_id)
    
    logger.info(f"Doc {doc_id} status: {doc.status}, has_analysis: {analysis is not None}")
    
    return {
        "doc_id": doc_id,
        "filename": doc.filename,
        "status": doc.status,
        "analysis": analysis,
        "ready": analysis is not None
    }
