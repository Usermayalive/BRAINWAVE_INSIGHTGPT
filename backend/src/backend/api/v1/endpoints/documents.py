import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException

from backend.models.document import (
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentInfo,
    DocumentStatus
)
from backend.services.document_storage import get_document_storage
from backend.services.gemini_service import get_gemini_service

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    logger.info(f"Upload request received: {file.filename}")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await file.read()
    logger.info(f"File size: {len(content)} bytes")
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size: 10MB")
    
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    storage = get_document_storage()
    doc_info, extracted_text = await storage.save_document(
        filename=file.filename,
        content=content,
        content_type=file.content_type
    )
    
    logger.info(f"Document saved: {doc_info.doc_id}, extracted {len(extracted_text)} chars")
    
    await storage.update_status(doc_info.doc_id, DocumentStatus.PROCESSING)
    
    try:
        logger.info("Starting Gemini analysis...")
        gemini = get_gemini_service()
        result = gemini.analyze_document_sync(extracted_text, file.filename)
        
        if result["success"]:
            await storage.set_analysis(doc_info.doc_id, result["analysis"])
            await storage.update_status(doc_info.doc_id, DocumentStatus.COMPLETED)
            logger.info(f"Document {doc_info.doc_id} analysis completed")
        else:
            await storage.update_status(doc_info.doc_id, DocumentStatus.FAILED)
            logger.error(f"Analysis failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        await storage.update_status(doc_info.doc_id, DocumentStatus.FAILED)
    
    doc_info = await storage.get_document(doc_info.doc_id)
    
    return DocumentUploadResponse(
        doc_id=doc_info.doc_id,
        filename=doc_info.filename,
        status=doc_info.status,
        message="Document uploaded and analyzed" if doc_info.status == DocumentStatus.COMPLETED else "Analysis failed",
        file_size=doc_info.file_size,
        created_at=doc_info.created_at
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents():
    storage = get_document_storage()
    documents = await storage.get_all_documents()
    return DocumentListResponse(documents=documents, total=len(documents))


@router.get("/{doc_id}", response_model=DocumentInfo)
async def get_document(doc_id: str):
    storage = get_document_storage()
    doc = await storage.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{doc_id}/analysis")
async def get_document_analysis(doc_id: str):
    storage = get_document_storage()
    doc = await storage.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    analysis = await storage.get_analysis(doc_id)
    return {
        "doc_id": doc_id,
        "filename": doc.filename,
        "status": doc.status,
        "analysis": analysis
    }


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    storage = get_document_storage()
    deleted = await storage.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}
