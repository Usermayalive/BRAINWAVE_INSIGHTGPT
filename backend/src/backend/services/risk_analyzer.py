"""
Risk analysis service with LLM + keyword approach
"""
import logging
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import re

from backend.core.logging import get_logger, LogContext
from backend.models.document import RiskLevel

logger = get_logger(__name__)


class RiskCategory(Enum):
    """Categories of legal risks."""
    INDEMNITY = "indemnity"
    LIABILITY = "liability"
    TERMINATION = "termination"
    PAYMENT = "payment"
    CONFIDENTIALITY = "confidentiality"
    IP_OWNERSHIP = "ip_ownership"
    DISPUTE_RESOLUTION = "dispute_resolution"
    GOVERNING_LAW = "governing_law"
    ASSIGNMENT = "assignment"
    MODIFICATION = "modification"
    AUTO_RENEWAL = "auto_renewal"
    JURISDICTION = "jurisdiction"


@dataclass
class RiskKeyword:
    """Represents a risk-associated keyword with metadata."""
    keyword: str
    risk_weight: float  # 0.0 to 1.0
    categories: List[RiskCategory]
    requires_context: bool = False
    negative_contexts: Optional[List[str]] = None  # Contexts that reduce risk


@dataclass
class RiskAssessment:
    """Result of risk analysis for a clause."""
    risk_level: RiskLevel
    confidence: float
    risk_score: float  # 0.0 to 1.0
    detected_keywords: List[str]
    risk_factors: List[str]
    llm_assessment: Optional[Dict[str, Any]]
    keyword_assessment: Dict[str, Any]
    needs_review: bool
    explanation: str


class RiskAnalyzer:
    """Service for analyzing legal clause risks using hybrid approach."""
    
    def __init__(self):
        self.risk_keywords = self._initialize_risk_keywords()
        self.compiled_patterns = self._compile_keyword_patterns()
        
        # Risk level thresholds
        self.risk_thresholds = {
            "low": 0.3,
            "moderate": 0.6,
            "attention": 0.8
        }
    
    def _initialize_risk_keywords(self) -> List[RiskKeyword]:
        """Initialize risk keywords."""
        
        keywords = [
            # High-risk indemnification terms
            RiskKeyword(
                keyword="indemnify|indemnification|indemnities",
                risk_weight=0.8,
                categories=[RiskCategory.INDEMNITY],
                requires_context=True,
                negative_contexts=["mutual indemnification", "limited indemnification"]
            ),
            RiskKeyword(
                keyword="hold harmless",
                risk_weight=0.9,
                categories=[RiskCategory.INDEMNITY, RiskCategory.LIABILITY]
            ),
            RiskKeyword(
                keyword="defend",
                risk_weight=0.7,
                categories=[RiskCategory.INDEMNITY],
                requires_context=True,
                negative_contexts=["right to defend", "option to defend"]
            ),
            # Unlimited liability terms
            RiskKeyword(
                keyword="unlimited",
                risk_weight=0.95,
                categories=[RiskCategory.LIABILITY]
            ),
            RiskKeyword(
                keyword="without limit|no limit",
                risk_weight=0.9,
                categories=[RiskCategory.LIABILITY]
            ),
            RiskKeyword(
                keyword="consequential damages",
                risk_weight=0.8,
                categories=[RiskCategory.LIABILITY],
                negative_contexts=["excluding consequential", "no consequential"]
            ),
            RiskKeyword(
                keyword="punitive damages",
                risk_weight=0.85,
                categories=[RiskCategory.LIABILITY],
                negative_contexts=["excluding punitive", "no punitive"]
            ),
             # Automatic renewal risks
            RiskKeyword(
                keyword="automatic renewal|auto-renewal|automatically renew",
                risk_weight=0.7,
                categories=[RiskCategory.AUTO_RENEWAL, RiskCategory.TERMINATION]
            ),
            RiskKeyword(
                keyword="perpetual|in perpetuity",
                risk_weight=0.9,
                categories=[RiskCategory.TERMINATION, RiskCategory.AUTO_RENEWAL]
            ),
             # Termination risks
            RiskKeyword(
                keyword="terminate without cause|terminate for convenience",
                risk_weight=0.8,
                categories=[RiskCategory.TERMINATION]
            ),
             # Assignment risks
            RiskKeyword(
                keyword="assignment without consent|assign without consent",
                risk_weight=0.7,
                categories=[RiskCategory.ASSIGNMENT]
            ),
             # IP and confidentiality risks
            RiskKeyword(
                keyword="work for hire|work made for hire",
                risk_weight=0.8,
                categories=[RiskCategory.IP_OWNERSHIP]
            ),
        ]
        
        return keywords
    
    def _compile_keyword_patterns(self) -> Dict[str, re.Pattern]:
        """Compile regex patterns for efficient keyword matching."""
        patterns = {}
        
        for risk_keyword in self.risk_keywords:
            try:
                pattern = re.compile(
                    rf'\b({risk_keyword.keyword})\b',
                    re.IGNORECASE | re.MULTILINE
                )
                patterns[risk_keyword.keyword] = pattern
            except re.error as e:
                logger.error(f"Failed to compile pattern {risk_keyword.keyword}: {e}")
        
        return patterns
    
    async def analyze_clause_risk(
        self, 
        clause_text: str,
        clause_summary: Optional[str] = None,
        llm_risk_assessment: Optional[str] = None,
        clause_category: Optional[str] = None
    ) -> RiskAssessment:
        """
        Analyze risk level of a clause using hybrid approach.
        """
        with LogContext(logger, clause_length=len(clause_text), category=clause_category):
            logger.info("Analyzing clause risk")
            
            # Step 1: Keyword-based analysis
            keyword_assessment = await self._analyze_keywords(clause_text, clause_summary)
            
            # Step 2: Parse LLM assessment
            llm_assessment = self._parse_llm_assessment(llm_risk_assessment)
            
            # Step 3: Hybrid scoring
            hybrid_score = await self._calculate_hybrid_score(
                keyword_assessment, llm_assessment, clause_category
            )
            
            # Step 4: Determine final risk level
            final_risk_level = self._determine_risk_level(hybrid_score)
            
            # Step 5: Conflict detection and review flagging
            needs_review = await self._detect_conflicts(
                keyword_assessment, llm_assessment, hybrid_score
            )
            
            # Step 6: Generate explanation
            explanation = await self._generate_risk_explanation(
                keyword_assessment, llm_assessment, final_risk_level, needs_review
            )
            
            assessment = RiskAssessment(
                risk_level=final_risk_level,
                confidence=self._calculate_confidence(keyword_assessment, llm_assessment),
                risk_score=hybrid_score,
                detected_keywords=keyword_assessment["detected_keywords"],
                risk_factors=keyword_assessment["risk_factors"],
                llm_assessment=llm_assessment,
                keyword_assessment=keyword_assessment,
                needs_review=needs_review,
                explanation=explanation
            )
            
            return assessment
    
    async def _analyze_keywords(
        self, 
        clause_text: str, 
        clause_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze clause using keyword patterns."""
        analysis_text = clause_text
        if clause_summary:
            analysis_text += f"\n{clause_summary}"
        
        detected_keywords = []
        risk_factors = []
        category_scores = {category: 0.0 for category in RiskCategory}
        total_risk_score = 0.0
        
        for risk_keyword in self.risk_keywords:
            pattern = self.compiled_patterns.get(risk_keyword.keyword)
            if not pattern:
                continue
            
            matches = pattern.findall(analysis_text)
            
            if matches:
                detected_keywords.extend([match.lower() if isinstance(match, str) else match[0].lower() for match in matches])
                
                keyword_risk = risk_keyword.risk_weight
                
                if risk_keyword.negative_contexts:
                    for neg_context in risk_keyword.negative_contexts:
                        if re.search(neg_context, analysis_text, re.IGNORECASE):
                            keyword_risk *= 0.5
                            risk_factors.append(f"Mitigated: {neg_context}")
                            break
                
                total_risk_score += keyword_risk
                
                for category in risk_keyword.categories:
                    category_scores[category] = max(category_scores[category], keyword_risk)
                
                risk_factors.append(f"High-risk keyword: {matches[0]}")
        
        if detected_keywords:
            total_risk_score = min(1.0, total_risk_score / len(detected_keywords))
        
        return {
            "risk_score": total_risk_score,
            "detected_keywords": list(set(detected_keywords)),
            "risk_factors": risk_factors,
            "category_scores": category_scores,
            "keyword_count": len(set(detected_keywords)),
            "method": "keyword_analysis"
        }
    
    def _parse_llm_assessment(self, llm_risk_assessment: Optional[str]) -> Optional[Dict[str, Any]]:
        """Parse and validate LLM risk assessment."""
        if not llm_risk_assessment:
            return None
        
        assessment_lower = llm_risk_assessment.lower().strip()
        
        risk_level_map = {
            "low": 0.2,
            "moderate": 0.5,
            "attention": 0.8,
            "high": 0.8,
            "critical": 0.9
        }
        
        risk_score = 0.5
        for level, score in risk_level_map.items():
            if level in assessment_lower:
                risk_score = score
                break
        
        return {
            "original_assessment": llm_risk_assessment,
            "normalized_level": assessment_lower,
            "risk_score": risk_score,
            "confidence": 0.8,
            "method": "llm_assessment"
        }
    
    async def _calculate_hybrid_score(
        self, 
        keyword_assessment: Dict[str, Any],
        llm_assessment: Optional[Dict[str, Any]],
        clause_category: Optional[str]
    ) -> float:
        """Calculate hybrid risk score."""
        keyword_score = keyword_assessment.get("risk_score", 0.0)
        
        if llm_assessment:
            llm_score = llm_assessment.get("risk_score", 0.5)
            
            if keyword_assessment.get("keyword_count", 0) > 0:
                hybrid_score = (keyword_score * 0.7) + (llm_score * 0.3)
            else:
                hybrid_score = (keyword_score * 0.3) + (llm_score * 0.7)
        else:
            hybrid_score = keyword_score
        
        if clause_category:
            category_multiplier = self._get_category_risk_multiplier(clause_category)
            hybrid_score *= category_multiplier
        
        return min(1.0, hybrid_score)
    
    def _get_category_risk_multiplier(self, clause_category: str) -> float:
        """Get risk multiplier based on clause category."""
        high_risk_categories = {
            "Indemnity": 1.2,
            "Liability": 1.15,
            "Termination": 1.1,
            "Assignment": 1.1
        }
        return high_risk_categories.get(clause_category, 1.0)
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """Convert risk score to risk level."""
        if risk_score >= self.risk_thresholds["attention"]:
            return RiskLevel.ATTENTION
        elif risk_score >= self.risk_thresholds["moderate"]:
            return RiskLevel.MODERATE
        else:
            return RiskLevel.LOW
    
    async def _detect_conflicts(
        self,
        keyword_assessment: Dict[str, Any],
        llm_assessment: Optional[Dict[str, Any]],
        hybrid_score: float
    ) -> bool:
        """Detect conflicts between LLM and keyword assessments."""
        needs_review = False
        
        if llm_assessment:
            if abs(keyword_assessment["risk_score"] - llm_assessment["risk_score"]) > 0.4:
                needs_review = True
        
        if hybrid_score >= 0.8:
            needs_review = True
        
        if keyword_assessment.get("keyword_count", 0) >= 3:
            needs_review = True
        
        return needs_review
    
    def _calculate_confidence(
        self,
        keyword_assessment: Dict[str, Any],
        llm_assessment: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate confidence in the risk assessment."""
        base_confidence = 0.6
        if keyword_assessment.get("keyword_count", 0) > 0:
            base_confidence += 0.2
        if llm_assessment:
            keyword_score = keyword_assessment.get("risk_score", 0.0)
            llm_score = llm_assessment.get("risk_score", 0.5)
            agreement = 1.0 - abs(keyword_score - llm_score)
            base_confidence += agreement * 0.2
        return min(1.0, base_confidence)
    
    async def _generate_risk_explanation(
        self,
        keyword_assessment: Dict[str, Any],
        llm_assessment: Optional[Dict[str, Any]],
        risk_level: RiskLevel,
        needs_review: bool
    ) -> str:
        """Generate human-readable risk explanation."""
        explanation_parts = []
        level_explanations = {
            RiskLevel.LOW: "This clause appears to have minimal risk.",
            RiskLevel.MODERATE: "This clause contains terms that require attention.",
            RiskLevel.ATTENTION: "This clause contains potentially problematic terms."
        }
        explanation_parts.append(level_explanations.get(risk_level, ""))
        
        detected_keywords = keyword_assessment.get("detected_keywords", [])
        if detected_keywords:
            explanation_parts.append(f"Keywords: {', '.join(detected_keywords[:3])}.")
            
        if needs_review:
            explanation_parts.append("Manual review recommended.")
            
        return " ".join(explanation_parts)

    async def analyze_document_risk_profile(
        self, 
        clause_assessments: List[RiskAssessment]
    ) -> Dict[str, Any]:
        """Analyze overall risk profile for a document."""
        if not clause_assessments:
            return {
                "overall_risk_level": "low",
                "total_clauses": 0
            }
        
        risk_distribution = {"low": 0, "moderate": 0, "attention": 0}
        total_risk_score = 0.0
        
        for assessment in clause_assessments:
            risk_distribution[assessment.risk_level.value] += 1
            total_risk_score += assessment.risk_score
            
        attention_ratio = risk_distribution["attention"] / len(clause_assessments)
        
        if attention_ratio >= 0.3:
            overall_risk = "attention"
        elif attention_ratio >= 0.1:
            overall_risk = "moderate"
        else:
            overall_risk = "low"
        
        return {
            "overall_risk_level": overall_risk,
            "total_clauses": len(clause_assessments),
            "risk_distribution": risk_distribution,
            "average_risk_score": total_risk_score / len(clause_assessments)
        }
