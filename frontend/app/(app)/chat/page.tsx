"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Send, Bot, CircleUserRound, Sparkles, FileText, Loader, RefreshCw, CircleCheck,
    ChartBar, BookOpen, ExternalLink
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import type { ClauseSummary, SourceCitation } from "@/lib/api";
import { apiGet, apiPost } from "@/lib/auth-fetch";
import { useChat } from "@/contexts/ChatContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ChatMarkdown = ({ content }: { content: string }) => {
    return (
        <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
                components={{
                    p: ({ children }) => (
                        <p className="mb-3 last:mb-0 leading-relaxed text-foreground/90">{children}</p>
                    ),
                    h1: ({ children }) => (
                        <h1 className="text-xl font-bold mb-4 text-foreground border-b border-border/50 pb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
                            <span className="w-1 h-5 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-base font-semibold mb-2 text-foreground/90">{children}</h3>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-none space-y-2 mb-4 ml-0">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-5 mb-4 space-y-2">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-foreground/85 leading-relaxed flex items-start gap-2">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                            <span>{children}</span>
                        </li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-foreground/80">{children}</em>
                    ),
                    code: ({ children }) => (
                        <code className="bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">
                            {children}
                        </code>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-violet-500/50 pl-4 italic text-foreground/70 mb-3 bg-violet-500/5 py-2 rounded-r">
                            {children}
                        </blockquote>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

// Sources Panel Component
const SourcesPanel = ({ sources }: { sources: SourceCitation[] }) => {
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                    References
                </span>
            </div>
            <div className="space-y-2">
                {sources.map((source, idx) => (
                    <div
                        key={idx}
                        className="text-xs border-l-2 border-purple-500/30 pl-3 py-1 hover:border-purple-500/60 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white/80">
                                {source.clause_number && source.category
                                    ? `Section ${source.clause_number} (${source.category})`
                                    : `Source ${idx + 1}`}
                            </span>
                            <span className="text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                {source.relevance_score > 0
                                    ? `${Math.round(source.relevance_score * 100)}%`
                                    : "N/A"}
                            </span>
                        </div>
                        <div className="text-white/60 line-clamp-2">
                            &quot;{source.snippet}&quot;
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: SourceCitation[];
}

interface DocumentInfo {
    doc_id: string;
    filename: string;
    status: string;
    analysis: string | null;
    ready: boolean;
}

function ChatPageContent() {
    const searchParams = useSearchParams();
    const docIdParam = searchParams.get("doc_id") || searchParams.get("doc"); // Handle both doc_id and doc
    const sessionIdParam = searchParams.get("session_id");

    const [docId, setDocId] = useState<string | null>(docIdParam);
    const [sessionId, setSessionId] = useState<string | null>(sessionIdParam);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
    const [loadingDoc, setLoadingDoc] = useState(true);
    const [clauses, setClauses] = useState<ClauseSummary[]>([]);
    const [clausesLoading, setClausesLoading] = useState(false);
    const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { fetchRecentChats } = useChat();

    useEffect(() => {
        if (sessionId) {
            fetchSessionData();
        } else if (docId) {
            fetchDocumentAnalysis();
            fetchClauses();
        } else {
            setLoadingDoc(false);
        }
    }, [docId, sessionId]);

    const fetchSessionData = async () => {
        if (!sessionId) return;
        setLoadingDoc(true);
        try {
            // 1. Get session details to find doc_id
            const sessionRes = await apiGet(`/api/v1/chat/sessions/${sessionId}`);
            if (!sessionRes.ok) throw new Error("Failed to load session");
            const sessionData = await sessionRes.json();

            // Set docId from session
            const sessionDocId = sessionData.session?.document_ids?.[0];
            if (sessionDocId) {
                setDocId(sessionDocId);
            }

            // 2. Load messages
            const messagesRes = await apiGet(`/api/v1/chat/history/${sessionId}/messages`);
            if (messagesRes.ok) {
                const messagesData = await messagesRes.json();
                const historyMessages = messagesData.messages.map((msg: any) => ({
                    id: msg.message_id,
                    role: msg.role,
                    content: msg.content,
                    sources: msg.sources
                }));
                // Sort by creation time if needed (usually backend returns sorted)
                setMessages(historyMessages);
            }

            // 3. Load document info (analysis, title, etc)
            if (sessionDocId) {
                // calls fetchDocumentAnalysis logic reuse
                const response = await apiGet(`/api/v1/chat/${sessionDocId}/initial`);
                if (response.ok) {
                    const data = await response.json();
                    setDocumentInfo(data);
                    // Don't overwrite messages with initial analysis if we have history
                    if (messagesRes.ok) {
                        // already set messages
                    } else if (data.analysis) {
                        setMessages([{
                            id: "initial",
                            role: "assistant",
                            content: data.analysis
                        }]);
                    }
                    // Fetch clauses
                    const clausesResponse = await apiGet(`/api/v1/documents/${sessionDocId}/clauses`);
                    if (clausesResponse.ok) {
                        const clausesData = await clausesResponse.json();
                        setClauses(clausesData.clauses || []);
                    }
                }
            }

        } catch (error) {
            console.error("Failed to load session:", error);
        } finally {
            setLoadingDoc(false);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchDocumentAnalysis = async () => {
        setLoadingDoc(true);
        try {
            const response = await apiGet(`/api/v1/chat/${docId}/initial`);
            if (response.ok) {
                const data = await response.json();
                setDocumentInfo(data);

                // Capture session_id if returned (handles auto-persistence)
                if (data.session_id && !sessionId) {
                    setSessionId(data.session_id);
                    // Update URL gently
                    window.history.replaceState(null, "", `/chat?doc_id=${docId}&session_id=${data.session_id}`);
                }

                if (data.analysis) {
                    setMessages([{
                        id: "initial",
                        role: "assistant",
                        content: data.analysis
                    }]);
                    // Re-fetch clauses when document is ready
                    fetchClauses();
                } else if (data.status === "processing") {
                    // Also try to fetch clauses while processing (they may appear incrementally)
                    fetchClauses();
                    setTimeout(fetchDocumentAnalysis, 2000);
                }
            }
        } catch (error) {
            console.error("Failed to fetch document:", error);
        } finally {
            setLoadingDoc(false);
        }
    };

    const fetchClauses = async () => {
        if (!docId) return;
        setClausesLoading(true);
        try {
            const response = await apiGet(`/api/v1/documents/${docId}/clauses`);
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched clauses:", data.clauses?.length || 0, data.clauses);
                setClauses(data.clauses || []);
            }
        } catch (error) {
            console.error("Failed to fetch clauses:", error);
        } finally {
            setClausesLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !docId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            let response;
            let data;

            if (sessionId) {
                // Use session-specific endpoint
                response = await apiPost(`/api/v1/chat/sessions/${sessionId}/ask`, {
                    question: input
                });
            } else {
                // Use legacy endpoint for new chats
                response = await apiPost("/api/v1/chat", {
                    doc_id: docId,
                    question: input,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                });
            }

            if (!response.ok) throw new Error("Chat failed");
            data = await response.json();

            // If we just created a session via legacy endpoint, we might want to capture the ID?
            // The legacy endpoint return type ChatAnswerResponse includes session_id!
            if (!sessionId && data.session_id) {
                setSessionId(data.session_id);
                // Optionally update URL without reload? 
                window.history.replaceState(null, "", `/chat?session_id=${data.session_id}`);
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.answer,
                sources: data.sources || []
            }]);

            // Update recent chats list in sidebar
            fetchRecentChats();

        } catch (error) {
            console.error("Send error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!docId) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-violet-950/20">
                <header className="sticky top-0 z-10 border-b border-border/50 glass">
                    <div className="flex h-20 items-center px-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                <span className="gradient-text">Chat</span>
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Upload a document first</p>
                        </div>
                    </div>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="h-20 w-20 mx-auto rounded-full bg-violet-500/20 flex items-center justify-center mb-6">
                            <FileText className="h-10 w-10 text-violet-500" />
                        </div>
                        <h2 className="text-xl font-semibold">No document selected</h2>
                        <p className="text-muted-foreground mt-2">Upload a document to start chatting</p>
                        <Button asChild className="mt-6 bg-gradient-to-r from-violet-500 to-purple-600">
                            <a href="/upload">Upload Document</a>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-background via-background to-violet-950/20">
            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                <header className="shrink-0 border-b border-border/50 glass">
                    <div className="flex h-16 items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-semibold">{documentInfo?.filename || "Loading..."}</h1>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {documentInfo?.status === "completed" ? (
                                        <>
                                            <CircleCheck className="h-3 w-3 text-green-500" />
                                            <span className="text-green-500">Analysis complete</span>
                                        </>
                                    ) : (
                                        <>
                                            <Loader className="h-3 w-3 animate-spin" />
                                            <span>Analyzing...</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {documentInfo?.status === "processing" && (
                                <Button variant="outline" size="sm" onClick={fetchDocumentAnalysis}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            )}
                            {/* Analysis Panel Toggle Button */}
                            <Button
                                variant={analysisPanelOpen ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setAnalysisPanelOpen(!analysisPanelOpen)}
                                className="xl:hidden"
                            >
                                <ChartBar className="h-4 w-4 mr-2" />
                                Analysis
                            </Button>
                        </div>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto">
                    {loadingDoc ? (
                        <div className="flex flex-col items-center justify-center h-full py-20">
                            <Loader className="h-10 w-10 text-violet-500 animate-spin" />
                            <p className="text-muted-foreground mt-4">Analyzing your document...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-6 animate-float">
                                <Sparkles className="h-10 w-10 text-violet-500" />
                            </div>
                            <h2 className="text-xl font-semibold">Waiting for analysis...</h2>
                            <p className="text-muted-foreground mt-2 max-w-md">
                                Your document is being analyzed. Results will appear here shortly.
                            </p>
                            <Button variant="outline" onClick={fetchDocumentAnalysis} className="mt-4">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Check Status
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-4xl mx-auto pb-4">
                            {messages.map((message) => (
                                <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
                                    {message.role === "assistant" && (
                                        <Avatar className="h-10 w-10 shrink-0 shadow-lg">
                                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600">
                                                <Bot className="h-5 w-5 text-white" />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <Card className={`max-w-[85%] ${message.role === "user"
                                        ? "bg-gradient-to-r from-violet-600 to-purple-600 border-0 shadow-lg shadow-violet-500/20"
                                        : "glass-card border-border/50"
                                        }`}>
                                        <CardContent className="p-4">
                                            {message.role === "user" ? (
                                                <p className="text-white text-sm">{message.content}</p>
                                            ) : (
                                                <>
                                                    <ChatMarkdown content={message.content} />
                                                    {message.sources && message.sources.length > 0 && (
                                                        <SourcesPanel sources={message.sources} />
                                                    )}
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                    {message.role === "user" && (
                                        <Avatar className="h-10 w-10 shrink-0 shadow-lg">
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500">
                                                <CircleUserRound className="h-5 w-5 text-white" strokeWidth={1.5} />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4">
                                    <Avatar className="h-10 w-10 shrink-0 shadow-lg">
                                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600">
                                            <Bot className="h-5 w-5 text-white" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <Card className="glass-card border-border/50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                                                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                                                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                </div>
                                                <span className="text-sm text-muted-foreground">Thinking...</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-border/50 p-4 glass">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-4 items-end">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question about your document..."
                                className="min-h-[52px] max-h-32 resize-none bg-background/50 border-border/50"
                                disabled={!documentInfo?.ready}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading || !documentInfo?.ready}
                                className="bg-gradient-to-r from-violet-600 to-purple-600 h-[52px] px-6 shadow-lg shadow-violet-500/25"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis Panel - Desktop always visible, mobile toggleable */}
            <div className="hidden xl:block">
                <AnalysisPanel
                    isOpen={true}
                    onClose={() => { }}
                    clauses={clauses}
                    isLoading={clausesLoading}
                    documentName={documentInfo?.filename}
                />
            </div>

            {/* Mobile Analysis Panel */}
            <div className="xl:hidden">
                <AnalysisPanel
                    isOpen={analysisPanelOpen}
                    onClose={() => setAnalysisPanelOpen(false)}
                    clauses={clauses}
                    isLoading={clausesLoading}
                    documentName={documentInfo?.filename}
                />
            </div>
        </div >
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="h-8 w-8 text-violet-500 animate-spin" />
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    );
}
