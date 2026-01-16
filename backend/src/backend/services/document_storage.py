from datetime import datetime
from typing import Dict, Optional
from uuid import uuid4
import os
import io

from PyPDF2 import PdfReader
from pdfminer.high_level import extract_text as extract_pdf_text

from backend.models.document import DocumentInfo, DocumentStatus


class DocumentStorage:
    def __init__(self):
        self._documents: Dict[str, DocumentInfo] = {}
        self._document_texts: Dict[str, str] = {}
        self._upload_dir = "/tmp/insightgpt_uploads"
        os.makedirs(self._upload_dir, exist_ok=True)

    def _extract_text_from_pdf(self, content: bytes) -> str:
        try:
            text = extract_pdf_text(io.BytesIO(content))
            return text
        except Exception:
            try:
                reader = PdfReader(io.BytesIO(content))
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text
            except Exception:
                return ""

    async def save_document(
        self,
        filename: str,
        content: bytes,
        content_type: str
    ) -> tuple[DocumentInfo, str]:
        doc_id = str(uuid4())
        now = datetime.utcnow()
        
        extracted_text = ""
        if content_type == "application/pdf":
            extracted_text = self._extract_text_from_pdf(content)
        
        doc_info = DocumentInfo(
            doc_id=doc_id,
            filename=filename,
            file_size=len(content),
            content_type=content_type,
            status=DocumentStatus.UPLOADED,
            created_at=now,
            updated_at=now
        )
        
        self._documents[doc_id] = doc_info
        self._document_texts[doc_id] = extracted_text
        
        file_path = os.path.join(self._upload_dir, f"{doc_id}_{filename}")
        with open(file_path, "wb") as f:
            f.write(content)
        
        return doc_info, extracted_text

    async def get_document(self, doc_id: str) -> Optional[DocumentInfo]:
        return self._documents.get(doc_id)

    async def get_document_text(self, doc_id: str) -> Optional[str]:
        return self._document_texts.get(doc_id)

    async def get_all_documents(self) -> list[DocumentInfo]:
        return list(self._documents.values())

    async def update_status(self, doc_id: str, status: DocumentStatus) -> Optional[DocumentInfo]:
        if doc_id in self._documents:
            doc = self._documents[doc_id]
            self._documents[doc_id] = DocumentInfo(
                doc_id=doc.doc_id,
                filename=doc.filename,
                file_size=doc.file_size,
                content_type=doc.content_type,
                status=status,
                created_at=doc.created_at,
                updated_at=datetime.utcnow()
            )
            return self._documents[doc_id]
        return None

    async def set_analysis(self, doc_id: str, analysis: str) -> None:
        if doc_id in self._documents:
            self._document_texts[f"{doc_id}_analysis"] = analysis

    async def get_analysis(self, doc_id: str) -> Optional[str]:
        return self._document_texts.get(f"{doc_id}_analysis")

    async def delete_document(self, doc_id: str) -> bool:
        if doc_id in self._documents:
            del self._documents[doc_id]
            self._document_texts.pop(doc_id, None)
            self._document_texts.pop(f"{doc_id}_analysis", None)
            return True
        return False


document_storage = DocumentStorage()


def get_document_storage() -> DocumentStorage:
    return document_storage
