/**
 * API service layer for BRAINWAVE InsightGPT document analysis
 * Handles all communication with the FastAPI backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ========================================
// TYPE DEFINITIONS
// ========================================

export type DocumentStatus = "pending" | "processing" | "completed" | "failed";
export type RiskLevel = "low" | "moderate" | "attention";

export interface DocumentUploadResponse {
    doc_id: string;
    status: DocumentStatus;
    filename: string;
    message: string;
    created_at: string;
}

export interface ReadabilityMetrics {
    original_grade: number;
    summary_grade: number;
    delta: number;
    flesch_score: number;
}

export interface ClauseSummary {
    clause_id: string;
    order: number;
    category: string;
    risk_level: RiskLevel;
    summary: string;
    language?: string;
    readability_metrics?: ReadabilityMetrics;
    needs_review: boolean;
}

export interface ClauseDetail extends ClauseSummary {
    doc_id: string;
    original_text: string;
    negotiation_tip?: string;
}

export interface SourceCitation {
    clause_id?: string;
    clause_number?: number;
    category?: string;
    snippet: string;
    relevance_score: number;
}

export interface AnswerResponse {
    answer: string;
    used_clause_ids: string[];
    used_clause_numbers?: number[];
    sources: SourceCitation[];
    confidence: number;
    response_time_ms?: number;
    token_usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    additional_insights?: string;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    doc_id: string;
    question: string;
    history?: ChatMessage[];
}

export interface DocumentStatusResponse {
    doc_id: string;
    status: DocumentStatus;
    filename?: string;
    created_at?: string;
    processed_at?: string;
    error_message?: string;
    clause_count?: number;
    page_count?: number;
    message?: string;
}

// ========================================
// API FUNCTIONS
// ========================================

/**
 * Upload a document for analysis
 */
export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/v1/documents/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload document");
    }

    return response.json();
}

/**
 * Get document status
 */
export async function getDocumentStatus(docId: string): Promise<DocumentStatusResponse> {
    const response = await fetch(`${API_URL}/api/v1/documents/${docId}/status`);

    if (!response.ok) {
        throw new Error("Failed to get document status");
    }

    return response.json();
}

/**
 * Get document clauses
 */
export async function getDocumentClauses(docId: string): Promise<ClauseSummary[]> {
    const response = await fetch(`${API_URL}/api/v1/documents/${docId}/clauses`);

    if (!response.ok) {
        throw new Error("Failed to get document clauses");
    }

    const data = await response.json();
    return data.clauses || [];
}

/**
 * Ask a question about a document
 */
export async function askQuestion(
    docId: string,
    question: string,
    history?: ChatMessage[]
): Promise<AnswerResponse> {
    const response = await fetch(`${API_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            doc_id: docId,
            question,
            history: history?.map((m) => ({ role: m.role, content: m.content })),
        }),
    });

    if (!response.ok) {
        throw new Error("Chat request failed");
    }

    return response.json();
}

/**
 * Get initial document analysis
 */
export async function getInitialAnalysis(docId: string): Promise<{
    doc_id: string;
    filename: string;
    status: string;
    analysis: string | null;
    ready: boolean;
}> {
    const response = await fetch(`${API_URL}/api/v1/chat/${docId}/initial`);

    if (!response.ok) {
        throw new Error("Failed to get initial analysis");
    }

    return response.json();
}
