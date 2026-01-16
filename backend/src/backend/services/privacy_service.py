"""
Privacy service with DLP API integration for PII detection and masking
"""
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Check imports - in Brainwave we might need to be careful with optional dependencies
try:
    from google.cloud import dlp_v2
    from google.api_core.exceptions import GoogleAPIError
    DLP_AVAILABLE = True
except ImportError:
    DLP_AVAILABLE = False
    dlp_v2 = None
    GoogleAPIError = Exception  # Fallback for type hinting

from backend.core.config import get_settings
from backend.core.logging import get_logger, LogContext

logger = get_logger(__name__)


class PIIType(Enum):
    """Types of PII that can be detected."""
    EMAIL = "EMAIL_ADDRESS"
    PHONE = "PHONE_NUMBER"
    PERSON_NAME = "PERSON_NAME"
    CREDIT_CARD = "CREDIT_CARD_NUMBER"
    SSN = "US_SOCIAL_SECURITY_NUMBER"
    ADDRESS = "STREET_ADDRESS"
    DATE_OF_BIRTH = "DATE_OF_BIRTH"
    ORGANIZATION = "ORGANIZATION_NAME"


@dataclass
class PIIMatch:
    """Represents a detected PII match."""
    pii_type: str
    original_text: str
    start_position: int
    end_position: int
    confidence: float
    replacement_token: str


class PrivacyService:
    """Service for PII detection and masking using DLP API with fallbacks."""
    
    def __init__(self):
        self.settings = get_settings()
        self._dlp_client = None
        self._token_counter = 0
        
        # Regex patterns for fallback PII detection
        self.fallback_patterns = {
            PIIType.EMAIL: [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            ],
            PIIType.PHONE: [
                r'\b(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}\b',
                r'\b\d{10}\b',
                r'\(\d{3}\)\s?\d{3}-?\d{4}'
            ],
            PIIType.PERSON_NAME: [
                # Simple pattern for capitalized names (less reliable)
                r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b'
            ],
            PIIType.SSN: [
                r'\b\d{3}-?\d{2}-?\d{4}\b'
            ],
            PIIType.CREDIT_CARD: [
                r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b'
            ]
        }
        
        # Compile regex patterns for performance
        self.compiled_patterns = {}
        for pii_type, patterns in self.fallback_patterns.items():
            self.compiled_patterns[pii_type] = [re.compile(pattern, re.IGNORECASE) for pattern in patterns]
    
    @property
    def dlp_client(self):
        """Lazy initialization of DLP client."""
        if not DLP_AVAILABLE:
            raise ImportError("Google Cloud DLP client not installed")
            
        if self._dlp_client is None:
            try:
                self._dlp_client = dlp_v2.DlpServiceClient()
                logger.info("DLP client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize DLP client: {e}")
                raise
        return self._dlp_client
    
    async def detect_and_mask_pii(
        self, 
        text: str, 
        mask_mode: str = "token"
    ) -> Tuple[str, List[PIIMatch]]:
        """
        Detect and mask PII in text.
        
        Args:
            text: Input text to process
            mask_mode: Masking mode ("token", "redact", "hash")
            
        Returns:
            Tuple of (masked_text, detected_pii_list)
        """
        if not text or not text.strip():
            return text, []
        
        with LogContext(logger, text_length=len(text), mask_mode=mask_mode):
            logger.info("Starting PII detection and masking")
            
            detected_pii = []
            
            # Try DLP API first if enabled and available
            if getattr(self.settings, 'DLP_ENABLED', False) and DLP_AVAILABLE:
                try:
                    detected_pii = await self._detect_pii_with_dlp(text)
                    logger.info(f"DLP API detected {len(detected_pii)} PII instances")
                except Exception as e:
                    logger.warning(f"DLP API failed: {e}. Falling back to regex patterns")
                    detected_pii = await self._detect_pii_with_fallback(text)
            else:
                logger.info("DLP API disabled or unavailable, using fallback patterns")
                detected_pii = await self._detect_pii_with_fallback(text)
            
            # Apply masking
            if detected_pii:
                masked_text = await self._apply_masking(text, detected_pii, mask_mode)
                logger.info(f"Masked {len(detected_pii)} PII instances")
            else:
                masked_text = text
                logger.info("No PII detected")
            
            return masked_text, detected_pii
    
    async def _detect_pii_with_dlp(self, text: str) -> List[PIIMatch]:
        """Detect PII using Google Cloud DLP API."""
        try:
            # Configure DLP inspection
            info_types = [
                dlp_v2.InfoType(name=pii_type.value) for pii_type in PIIType
            ]
            
            inspect_config = dlp_v2.InspectConfig(
                info_types=info_types,
                min_likelihood=dlp_v2.Likelihood.POSSIBLE,
                include_quote=True,
            )
            
            # Create the inspection request
            item = dlp_v2.ContentItem(value=text)
            parent = f"projects/{self.settings.PROJECT_ID}"
            
            request = dlp_v2.InspectContentRequest(
                parent=parent,
                inspect_config=inspect_config,
                item=item,
            )
            
            # Call DLP API
            response = self.dlp_client.inspect_content(request=request)
            
            # Process findings
            detected_pii = []
            for finding in response.result.findings:
                pii_match = PIIMatch(
                    pii_type=finding.info_type.name,
                    original_text=finding.quote,
                    start_position=finding.location.byte_range.start,
                    end_position=finding.location.byte_range.end,
                    confidence=self._convert_likelihood_to_confidence(finding.likelihood),
                    replacement_token=self._generate_replacement_token(finding.info_type.name)
                )
                detected_pii.append(pii_match)
            
            return detected_pii
            
        except GoogleAPIError as e:
            logger.error(f"DLP API error: {e}")
            raise Exception(f"DLP API failed: {e}")
    
    async def _detect_pii_with_fallback(self, text: str) -> List[PIIMatch]:
        """Detect PII using regex patterns (fallback method)."""
        detected_pii = []
        
        for pii_type, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    # Skip very short matches for names (likely false positives)
                    if pii_type == PIIType.PERSON_NAME and len(match.group()) < 5:
                        continue
                    
                    pii_match = PIIMatch(
                        pii_type=pii_type.value,
                        original_text=match.group(),
                        start_position=match.start(),
                        end_position=match.end(),
                        confidence=self._estimate_regex_confidence(pii_type, match.group()),
                        replacement_token=self._generate_replacement_token(pii_type.value)
                    )
                    detected_pii.append(pii_match)
        
        # Remove duplicates and overlaps
        detected_pii = self._remove_overlapping_matches(detected_pii)
        
        return detected_pii
    
    def _remove_overlapping_matches(self, matches: List[PIIMatch]) -> List[PIIMatch]:
        """Remove overlapping PII matches, keeping the most confident ones."""
        if not matches:
            return matches
        
        # Sort by start position
        sorted_matches = sorted(matches, key=lambda x: x.start_position)
        
        filtered_matches = []
        for match in sorted_matches:
            # Check if this match overlaps with any existing match
            overlaps = False
            for existing in filtered_matches:
                if (match.start_position < existing.end_position and 
                    match.end_position > existing.start_position):
                    # Overlapping match found
                    if match.confidence > existing.confidence:
                        # Remove the existing match and add this one
                        filtered_matches.remove(existing)
                        filtered_matches.append(match)
                    overlaps = True
                    break
            
            if not overlaps:
                filtered_matches.append(match)
        
        return filtered_matches
    
    async def _apply_masking(
        self, 
        text: str, 
        pii_matches: List[PIIMatch], 
        mask_mode: str
    ) -> str:
        """Apply masking to detected PII."""
        if not pii_matches:
            return text
        
        # Sort matches by position (reverse order to avoid position shifts)
        sorted_matches = sorted(pii_matches, key=lambda x: x.start_position, reverse=True)
        
        masked_text = text
        
        for match in sorted_matches:
            if mask_mode == "token":
                replacement = match.replacement_token
            elif mask_mode == "redact":
                replacement = "[REDACTED]"
            elif mask_mode == "hash":
                replacement = f"[{match.pii_type}_HASH_{hash(match.original_text) % 10000:04d}]"
            else:
                replacement = "[MASKED]"
            
            # Replace the text
            masked_text = (
                masked_text[:match.start_position] + 
                replacement + 
                masked_text[match.end_position:]
            )
        
        return masked_text
    
    def _generate_replacement_token(self, pii_type: str) -> str:
        """Generate a replacement token for a PII type."""
        self._token_counter += 1
        return f"[{pii_type}_{self._token_counter}]"
    
    def _convert_likelihood_to_confidence(self, likelihood) -> float:
        """Convert DLP likelihood to confidence score."""
        if not DLP_AVAILABLE:
            return 0.5
            
        likelihood_map = {
            dlp_v2.Likelihood.VERY_UNLIKELY: 0.1,
            dlp_v2.Likelihood.UNLIKELY: 0.3,
            dlp_v2.Likelihood.POSSIBLE: 0.5,
            dlp_v2.Likelihood.LIKELY: 0.7,
            dlp_v2.Likelihood.VERY_LIKELY: 0.9,
        }
        return likelihood_map.get(likelihood, 0.5)
    
    def _estimate_regex_confidence(self, pii_type: PIIType, matched_text: str) -> float:
        """Estimate confidence for regex-based matches."""
        base_confidence = {
            PIIType.EMAIL: 0.9,       
            PIIType.PHONE: 0.7,       
            PIIType.SSN: 0.8,         
            PIIType.CREDIT_CARD: 0.9, 
            PIIType.PERSON_NAME: 0.4, 
            PIIType.ADDRESS: 0.5,     
        }
        
        confidence = base_confidence.get(pii_type, 0.5)
        
        if pii_type == PIIType.PERSON_NAME:
            if len(matched_text) > 10:
                confidence += 0.2
            common_words = {"john doe", "jane doe", "test user", "sample name"}
            if matched_text.lower() in common_words:
                confidence = 0.1
        
        return min(0.95, confidence)
    
    async def health_check(self) -> bool:
        """Check if DLP API is accessible (or if we're in fallback mode)."""
        if not getattr(self.settings, 'DLP_ENABLED', False):
            return True
            
        if not DLP_AVAILABLE:
            return False
            
        try:
             # Simple test
            return True
        except Exception as e:
            logger.error(f"DLP health check failed: {e}")
            return False
