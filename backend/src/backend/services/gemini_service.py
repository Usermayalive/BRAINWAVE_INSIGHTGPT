import logging
import google.generativeai as genai
from typing import Optional

from backend.core.config import get_settings

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        settings = get_settings()
        logger.info(f"Initializing Gemini with model: {settings.GEMINI_MODEL}")
        
        if not settings.GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY is not set in .env!")
            raise ValueError("GEMINI_API_KEY is required")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        logger.info("Gemini initialized successfully")

    def analyze_document_sync(self, text: str, filename: str) -> dict:
        logger.info(f"Starting document analysis for: {filename}")
        logger.info(f"Text length: {len(text)} characters")
        
        if not text or len(text) < 10:
            logger.warning("Document text is too short or empty")
            return {
                "success": False,
                "error": "Document text is empty or too short. The PDF might be scanned/image-based.",
                "analysis": None
            }

        prompt = f"""You are InsightGPT, an expert AI legal document analyzer. Analyze this document and provide a comprehensive, professionally formatted analysis.

📄 **Document:** {filename}

---

**Document Content:**
{text[:25000]}

---

**Provide your analysis in exactly this format:**

# 📋 Document Analysis

## 📝 Executive Summary
Provide a clear, 3-4 sentence summary explaining what this document is about, who the parties are, and its main purpose. Write in plain English that anyone can understand.

## 🎯 Key Points

List the most important points from this document. Format each point as:
- **[Topic]:** Clear explanation of this point

Include at least 4-5 key points covering the most critical aspects.

## 📊 Document Type
Identify what type of document this is (e.g., Terms of Service, Privacy Policy, Employment Contract, NDA, Lease Agreement, etc.)

## ⚠️ Risk Analysis

Identify any clauses or terms that could be concerning. For each risk:
- **🔴 High Risk:** [Description of serious concerns that need immediate attention]
- **🟡 Moderate Risk:** [Description of items worth noting]
- **🟢 Low Risk:** [Standard clauses that are generally acceptable]

## 📅 Important Details
List any significant:
- Dates and deadlines
- Financial amounts or fees
- Specific requirements or obligations
- Contact information or addresses

## ✅ Recommended Actions
Based on this analysis, what should the reader do? List 2-3 actionable recommendations.

---

**Remember:**
- Use simple, clear language (8th grade reading level)
- Highlight anything unusual or concerning
- Be objective and professional
- Format with proper markdown for readability"""

        try:
            logger.info("Calling Gemini API...")
            response = self.model.generate_content(prompt)
            logger.info("Gemini API call successful")
            return {
                "success": True,
                "analysis": response.text
            }
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": str(e),
                "analysis": None
            }

    def chat_sync(self, question: str, document_text: str, filename: str) -> dict:
        logger.info(f"Chat request for document: {filename}")
        
        prompt = f"""You are InsightGPT, a helpful AI assistant that helps users understand documents. You have been provided with a document and the user has a question about it.

📄 **Document:** {filename}

**Document Content:**
{document_text[:25000]}

---

**User Question:** {question}

---

**Instructions:**
1. Answer the question based ONLY on the document content above
2. If the answer isn't in the document, clearly say so
3. Use simple, clear language
4. Reference specific parts of the document when relevant
5. Format your response with markdown for readability
6. Be concise but thorough"""

        try:
            response = self.model.generate_content(prompt)
            return {
                "success": True,
                "answer": response.text
            }
        except Exception as e:
            logger.error(f"Gemini chat failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "answer": None
            }


_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
