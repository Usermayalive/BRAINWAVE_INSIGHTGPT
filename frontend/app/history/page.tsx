"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, MessageSquare, CircleCheck, CircleAlert, Loader, ExternalLink } from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/auth-fetch";

interface DocumentItem {
    doc_id: string;
    filename: string;
    status: string;
    created_at: string | null;
    page_count: number;
    clause_count: number;
    language: string;
}

interface ChatSession {
    session_id: string;
    title: string;
    document_ids: string[];
    message_count: number;
    last_message_preview: string;
    created_at: string | null;
    updated_at: string | null;
}

export default function HistoryPage() {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch documents (authenticated - will filter by user)
            const docsResponse = await apiGet("/api/v1/documents/");
            if (!docsResponse.ok) {
                throw new Error("Failed to fetch documents");
            }
            const docsData = await docsResponse.json();
            setDocuments(docsData.documents || []);

            // Fetch chat history
            try {
                const chatResponse = await apiGet("/api/v1/chat/history/me");
                if (chatResponse.ok) {
                    const chatData = await chatResponse.json();
                    setChatSessions(chatData.sessions || []);
                }
            } catch (chatErr) {
                // Chat history might not be available if not authenticated
                console.log("Chat history not available:", chatErr);
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
            setError("Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Unknown date";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CircleCheck className="h-4 w-4 text-green-500" />;
            case "processing":
                return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
            case "failed":
            case "error":
                return <CircleAlert className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "completed":
                return "Analyzed";
            case "processing":
                return "Processing...";
            case "failed":
            case "error":
                return "Failed";
            case "pending":
                return "Pending";
            default:
                return status;
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
                <div className="flex h-16 items-center justify-between px-6">
                    <div>
                        <h1 className="text-2xl font-bold">Document History</h1>
                        <p className="text-sm text-muted-foreground">Your analyzed documents</p>
                    </div>
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        {loading ? (
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Clock className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                </div>
            </header>

            <div className="flex-1 p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Loader className="h-10 w-10 text-violet-500 animate-spin mb-4" />
                        <p className="text-muted-foreground">Loading document history...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-6">
                            <CircleAlert className="h-10 w-10 text-red-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-red-400">{error}</h2>
                        <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
                        <Button variant="outline" onClick={fetchData} className="mt-4">
                            Try Again
                        </Button>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                            <Clock className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-xl font-semibold">No documents yet</h2>
                        <p className="text-muted-foreground mt-2 max-w-md">
                            Upload your first document to start analyzing.
                        </p>
                        <Link href="/upload">
                            <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-600">
                                Upload Document
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {documents.map((doc) => (
                            <Card key={doc.doc_id} className="group hover:border-violet-500/50 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                                                <FileText className="h-5 w-5 text-violet-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-sm font-medium truncate">
                                                    {doc.filename}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    {formatDate(doc.created_at)}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs">
                                            {getStatusIcon(doc.status)}
                                            <span className={
                                                doc.status === "completed" ? "text-green-400" :
                                                    doc.status === "processing" ? "text-blue-400" :
                                                        doc.status === "failed" ? "text-red-400" : "text-yellow-400"
                                            }>
                                                {getStatusLabel(doc.status)}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                        <span>{doc.page_count} pages</span>
                                        <span>{doc.clause_count} clauses</span>
                                        <span className="uppercase">{doc.language}</span>
                                    </div>

                                    {doc.status === "completed" ? (
                                        <div className="flex gap-2">
                                            <Link href={`/chat?doc=${doc.doc_id}`} className="flex-1">
                                                <Button variant="outline" size="sm" className="w-full">
                                                    <MessageSquare className="h-4 w-4 mr-2" />
                                                    Chat
                                                </Button>
                                            </Link>
                                            <Link href={`/chat?doc=${doc.doc_id}`} className="flex-1">
                                                <Button size="sm" className="w-full bg-gradient-to-r from-violet-600 to-purple-600">
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    View
                                                </Button>
                                            </Link>
                                        </div>
                                    ) : doc.status === "processing" ? (
                                        <Button variant="outline" size="sm" className="w-full" disabled>
                                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                                            Processing...
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" className="w-full text-red-400" disabled>
                                            <CircleAlert className="h-4 w-4 mr-2" />
                                            {getStatusLabel(doc.status)}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
