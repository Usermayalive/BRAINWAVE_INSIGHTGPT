"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpFromLine, FileText, X, CheckCircle2, Loader2, AlertCircle, MessageSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UploadedFile {
    file: File;
    status: "pending" | "uploading" | "success" | "error";
    docId?: string;
    error?: string;
}

export default function UploadPage() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        const newFiles = droppedFiles.map(file => ({ file, status: "pending" as const }));
        setFiles(newFiles);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const newFiles = selectedFiles.map(file => ({ file, status: "pending" as const }));
            setFiles(newFiles);
        }
    }, []);

    const removeFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        const file = files[0];

        const formData = new FormData();
        formData.append("file", file.file);

        try {
            setFiles([{ ...file, status: "uploading" }]);

            const response = await fetch(`${API_URL}/api/v1/documents/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Upload failed");
            }

            const result = await response.json();

            setFiles([{ ...file, status: "success", docId: result.doc_id }]);

            setTimeout(() => {
                router.push(`/chat?doc_id=${result.doc_id}`);
            }, 500);

        } catch (error) {
            setFiles([{
                ...file,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed"
            }]);
            setUploading(false);
        }
    };

    const uploadedFile = files[0];

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-violet-950/20">
            <header className="sticky top-0 z-10 border-b border-border/50 glass">
                <div className="flex h-20 items-center px-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <span className="gradient-text">Upload Document</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Upload a document for AI analysis</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-8 space-y-6 max-w-2xl mx-auto w-full">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Upload PDF</CardTitle>
                        <CardDescription>Upload your document and start chatting with AI about it</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!uploadedFile ? (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                  relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
                  ${isDragging
                                        ? "border-violet-500 bg-violet-500/10"
                                        : "border-border hover:border-violet-500/50 hover:bg-violet-500/5"
                                    }
                `}
                            >
                                <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 animate-float">
                                        <ArrowUpFromLine className="h-10 w-10 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold">Drop PDF here or click to upload</p>
                                        <p className="text-sm text-muted-foreground mt-1">PDF files up to 10MB</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div
                                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${uploadedFile.status === "success"
                                            ? "bg-green-500/10 border border-green-500/30"
                                            : uploadedFile.status === "error"
                                                ? "bg-red-500/10 border border-red-500/30"
                                                : "bg-muted/50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${uploadedFile.status === "success"
                                                ? "bg-green-500/20"
                                                : uploadedFile.status === "error"
                                                    ? "bg-red-500/20"
                                                    : "bg-violet-500/20"
                                            }`}>
                                            {uploadedFile.status === "uploading" ? (
                                                <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
                                            ) : uploadedFile.status === "success" ? (
                                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                            ) : uploadedFile.status === "error" ? (
                                                <AlertCircle className="h-6 w-6 text-red-500" />
                                            ) : (
                                                <FileText className="h-6 w-6 text-violet-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium truncate">{uploadedFile.file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                                                {uploadedFile.status === "success" && (
                                                    <span className="ml-2 text-green-500">• Redirecting to chat...</span>
                                                )}
                                                {uploadedFile.status === "error" && (
                                                    <span className="ml-2 text-red-500">• {uploadedFile.error}</span>
                                                )}
                                                {uploadedFile.status === "uploading" && (
                                                    <span className="ml-2 text-violet-500">• Uploading & analyzing...</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {uploadedFile.status === "pending" && (
                                        <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {uploadedFile.status === "pending" && (
                                    <Button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        size="lg"
                                        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25"
                                    >
                                        <MessageSquare className="mr-2 h-5 w-5" />
                                        Upload & Start Chat
                                    </Button>
                                )}

                                {uploadedFile.status === "error" && (
                                    <Button
                                        onClick={() => setFiles([])}
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                    >
                                        Try Again
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
