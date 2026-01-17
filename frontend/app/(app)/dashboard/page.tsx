"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowUpFromLine, MessageSquare, BarChart3, Clock, CheckCircle2, Sparkles, Zap, Loader } from "lucide-react";
import { apiGet } from "@/lib/auth-fetch";

export default function Dashboard() {
  const [stats, setStats] = useState({
    documents: 0,
    chats: 0,
    processing: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [docsRes, chatsRes] = await Promise.all([
          apiGet("/api/v1/documents/"),
          apiGet("/api/v1/chat/history/me")
        ]);

        let docsCount = 0;
        let processingCount = 0;
        let completedCount = 0;
        let chatsCount = 0;

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          const docs = docsData.documents || [];
          docsCount = docs.length;
          processingCount = docs.filter((d: any) => d.status === 'processing').length;
          completedCount = docs.filter((d: any) => d.status === 'completed').length;
        }

        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          chatsCount = (chatsData.sessions || []).length;
        }

        setStats({
          documents: docsCount,
          chats: chatsCount,
          processing: processingCount,
          completed: completedCount
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-violet-500/5 dark:to-violet-950/20">
      <header className="sticky top-0 z-10 border-b border-border/40 glass">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your documents and analysis</p>
          </div>
          <Link href="/upload">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/20 transition-all duration-300">
              <ArrowUpFromLine className="mr-2 h-5 w-5" />
              Upload Document
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card border-border/40 shadow-sm hover:border-violet-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">{stats.documents}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Uploaded files</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/40 shadow-sm hover:border-violet-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chat Sessions</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">{stats.chats}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Active conversations</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/40 shadow-sm hover:border-violet-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Analyzed</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">{stats.completed}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Fully processed</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/40 shadow-sm hover:border-violet-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Loader className={`h-4 w-4 text-violet-500 ${stats.processing > 0 ? 'animate-spin' : ''}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-3xl font-bold tracking-tight text-violet-500">{stats.processing}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Currently analyzing</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Action Area */}
          <Card className="lg:col-span-2 glass-card border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Common tasks to get started</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Link href="/upload" className="block h-full">
                <div className="group h-full p-6 rounded-xl border border-border/40 bg-muted/20 hover:bg-violet-500/5 hover:border-violet-500/20 transition-all duration-300 cursor-pointer flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                      <ArrowUpFromLine className="h-6 w-6 text-violet-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-violet-500 transition-colors">Upload Document</div>
                      <div className="text-sm text-muted-foreground">Analyze new files</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-auto">
                    Upload PDF or DOCX files for AI analysis and clause segmentation.
                  </p>
                </div>
              </Link>

              <Link href="/chat" className="block h-full">
                <div className="group h-full p-6 rounded-xl border border-border/40 bg-muted/20 hover:bg-zinc-500/5 hover:border-zinc-500/20 transition-all duration-300 cursor-pointer flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-zinc-500/10 flex items-center justify-center group-hover:bg-zinc-500/20 transition-colors">
                      <MessageSquare className="h-6 w-6 text-zinc-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-zinc-500 transition-colors">Continue Chat</div>
                      <div className="text-sm text-muted-foreground">Resume conversations</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-auto">
                    Ask questions about your documents or review previous sessions.
                  </p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Side Info */}
          <Card className="glass-card border-border/40 shadow-sm bg-gradient-to-br from-violet-950/20 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <CardTitle className="text-lg font-semibold">Did you know?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                InsightGPT can analyze complex legal documents in seconds, extracting key clauses and identifying potential risks automatically.
              </p>
              <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/10">
                <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Tip</div>
                <p className="text-xs text-muted-foreground">
                  Try uploading a contract and asking "What are the termination conditions?" to see it in action.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
