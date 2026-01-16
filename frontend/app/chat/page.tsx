"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Sparkles, FileText, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface DocumentInfo {
    doc_id: string;
    filename: string;
    status: string;
    analysis: string | null;
    ready: boolean;
}

export default function ChatPage() {
    const searchParams = useSearchParams();
    const docId = searchParams.get("doc_id");

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
    const [loadingDoc, setLoadingDoc] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (docId) {
            fetchDocumentAnalysis();
        } else {
            setLoadingDoc(false);
        }
    }, [docId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchDocumentAnalysis = async () => {
        setLoadingDoc(true);
        try {
            const response = await fetch(`${API_URL}/api/v1/chat/${docId}/initial`);
            if (response.ok) {
                const data = await response.json();
                setDocumentInfo(data);

                if (data.analysis) {
                    setMessages([{
                        id: "initial",
                        role: "assistant",
                        content: data.analysis
                    }]);
                } else if (data.status === "processing") {
                    setTimeout(fetchDocumentAnalysis, 2000);
                }
            }
        } catch (error) {
            console.error("Failed to fetch document:", error);
        } finally {
            setLoadingDoc(false);
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
            const response = await fetch(`${API_URL}/api/v1/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doc_id: docId,
                    question: input,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok) throw new Error("Chat failed");

            const data = await response.json();

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.answer
            }]);
        } catch (error) {
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
        <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-violet-950/20">
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
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                        <span className="text-green-500">Analysis complete</span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Analyzing...</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {documentInfo?.status === "processing" && (
                        <Button variant="outline" size="sm" onClick={fetchDocumentAnalysis}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    )}
                </div>
            </header>

            <ScrollArea ref={scrollRef} className="flex-1 p-6">
                {loadingDoc ? (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
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
                                            <ChatMarkdown content={message.content} />
                                        )}
                                    </CardContent>
                                </Card>
                                {message.role === "user" && (
                                    <Avatar className="h-10 w-10 shrink-0 shadow-lg">
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500">
                                            <User className="h-5 w-5 text-white" />
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
            </ScrollArea>

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
    );
}
