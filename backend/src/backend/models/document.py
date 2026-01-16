"""
Pydantic models for document processing
"""
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SupportedLanguage(str, Enum):
    """Supported languages for document processing."""
    EN = "en"
    ES = "es"
    FR = "fr"
    DE = "de"


class DocumentStatus(str, Enum):
    """Status of document processing pipeline."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RiskLevel(str, Enum):
    """Risk assessment levels."""
    LOW = "low"
    MODERATE = "moderate"
class ReadabilityMetrics(BaseModel):
    """Readability scores for a text segment."""
    flesch_kincaid: float
    gunning_fog: float
    standard_score: float  # Normalized 0-100 score


class ClauseSummary(BaseModel):
    """Summary of a single clause."""
    clause_id: str
    original_text: str
    summary_text: str
    risk_level: RiskLevel
    category: str


class ClauseDetail(ClauseSummary):
    """Detailed clause information including analysis."""
    metrics: ReadabilityMetrics
    suggestions: List[str] = []
    negotiation_tips: List[str] = []

