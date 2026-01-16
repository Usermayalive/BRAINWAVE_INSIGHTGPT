from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentUploadResponse(BaseModel):
    doc_id: str
    filename: str
    status: DocumentStatus
    message: str
    file_size: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    file_size: int
    content_type: str
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentInfo]
    total: int
