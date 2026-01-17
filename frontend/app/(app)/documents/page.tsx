"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, ArrowUpFromLine, RefreshCw, Loader } from "lucide-react";
import { apiGet, apiDelete } from "@/lib/auth-fetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Document {
    doc_id: string;
    filename: string;
    status: string;
    created_at: string | null;
    page_count: number;
    clause_count: number;
    language: string;
    user_id?: string;
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            // Use authenticated fetch - will automatically filter by user if authenticated
            const response = await apiGet("/api/v1/documents");
            if (!response.ok) throw new Error("Failed to fetch documents");
            const data = await response.json();
            setDocuments(data.documents);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load documents");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleDelete = async (docId: string) => {
        setDeleting(docId);
        try {
            const response = await apiDelete(`/api/v1/documents/${docId}`);
            if (response.ok) {
                setDocuments(prev => prev.filter(d => d.doc_id !== docId));
            }
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setDeleting(null);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-violet-950/20">
            <header className="sticky top-0 z-10 border-b border-border/50 glass">
                <div className="flex h-20 items-center justify-between px-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <span className="gradient-text">Documents</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage your uploaded documents</p>
                    </div>
                    <Link href="/upload">
                        <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25">
                            <ArrowUpFromLine className="mr-2 h-4 w-4" />
                            Upload New
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="flex-1 p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search documents..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={fetchDocuments} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                {loading && documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader className="h-10 w-10 text-violet-500 animate-spin" />
                        <p className="text-muted-foreground mt-4">Loading documents...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-red-500">{error}</p>
                        <Button variant="outline" onClick={fetchDocuments} className="mt-4">
                            Try Again
                        </Button>
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                            <FileText className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-xl font-semibold">
                            {searchQuery ? "No documents found" : "No documents yet"}
                        </h2>
                        <p className="text-muted-foreground mt-2 max-w-md">
                            {searchQuery
                                ? "Try a different search term"
                                : "Upload your first document to start analyzing with AI."
                            }
                        </p>
                        {!searchQuery && (
                            <Link href="/upload">
                                <Button className="mt-6 bg-gradient-to-r from-violet-500 to-purple-600">
                                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                                    Upload Your First Document
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredDocuments.map((doc) => (
                            <Card key={doc.doc_id} className="glass-card hover-lift">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                                <FileText className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{doc.filename}</h3>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                    <span>{doc.page_count} pages</span>
                                                    <span>•</span>
                                                    <span>{doc.clause_count} clauses</span>
                                                    <span>•</span>
                                                    <span>{doc.created_at ? formatDate(doc.created_at) : "Unknown date"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={doc.status === "completed" ? "default" : doc.status === "processing" ? "secondary" : "destructive"}>
                                                {doc.status}
                                            </Badge>
                                            {doc.status === "completed" && (
                                                <Link href={`/chat?doc=${doc.doc_id}`}>
                                                    <Button size="sm" className="bg-gradient-to-r from-violet-600 to-purple-600">
                                                        View Analysis
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
