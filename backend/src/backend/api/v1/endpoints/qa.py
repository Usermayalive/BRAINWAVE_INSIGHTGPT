"""
Question and Answer endpoints
"""
import logging
from typing import Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse

from backend.core.config import Settings, get_settings
from backend.models.qa import QuestionRequest, AnswerResponse
from backend.models.document import SupportedLanguage
from backend.services.qa_service import QAService
from backend.dependencies.services import get_qa_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ask", response_model=AnswerResponse)
async def ask_question(
    request: QuestionRequest,
    language: SupportedLanguage = SupportedLanguage.ENGLISH,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    qa_service: QAService = Depends(get_qa_service)
) -> AnswerResponse:
    """
    Ask a question about document clauses using vector similarity search and grounded prompting.
    """
    return await qa_service.ask_question(
        request=request,
        background_tasks=background_tasks,
        language_override=language
    )

# Note: Streaming endpoint can be added here if needed, 
# reusing QAService components or extending QAService to support generators.
