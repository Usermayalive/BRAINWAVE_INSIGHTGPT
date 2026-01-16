import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowUpFromLine, MessageSquare, BarChart3, Clock, CheckCircle2, Sparkles, Zap } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-violet-950/20">
      <header className="sticky top-0 z-10 border-b border-border/50 glass">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back to InsightGPT</p>
          </div>
          <Link href="/upload">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:-translate-y-0.5">
              <ArrowUpFromLine className="mr-2 h-5 w-5" />
              Upload Document
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-lift glass-card overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold tracking-tight">0</div>
              <p className="text-xs text-muted-foreground mt-1">Upload your first document</p>
            </CardContent>
          </Card>

          <Card className="hover-lift glass-card overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chat Sessions</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold tracking-tight">0</div>
              <p className="text-xs text-muted-foreground mt-1">Start a conversation</p>
            </CardContent>
          </Card>

          <Card className="hover-lift glass-card overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Analyses Complete</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold tracking-tight">0</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for analysis</p>
            </CardContent>
          </Card>

          <Card className="hover-lift glass-card overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Processing</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold tracking-tight">--</div>
              <p className="text-xs text-muted-foreground mt-1">No data yet</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <Card className="lg:col-span-3 glass-card">
            <CardHeader>
              <CardTitle className="text-xl">Recent Documents</CardTitle>
              <CardDescription>Your recently uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center animate-float">
                    <FileText className="h-12 w-12 text-violet-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-glow">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mt-6">No documents yet</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">Upload your first document to unlock AI-powered insights and analysis</p>
                <Link href="/upload" className="mt-6">
                  <Button variant="outline" className="border-violet-500/50 hover:bg-violet-500/10 hover:border-violet-500">
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                    Get Started
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 glass-card">
            <CardHeader>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/upload" className="block">
                <div className="group p-4 rounded-xl border border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                      <ArrowUpFromLine className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold group-hover:text-violet-400 transition-colors">Upload Document</div>
                      <div className="text-sm text-muted-foreground">PDF, DOC, DOCX supported</div>
                    </div>
                    <Zap className="h-5 w-5 text-violet-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>

              <Link href="/chat" className="block">
                <div className="group p-4 rounded-xl border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold group-hover:text-blue-400 transition-colors">Start Chat</div>
                      <div className="text-sm text-muted-foreground">Ask questions about documents</div>
                    </div>
                    <Zap className="h-5 w-5 text-blue-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>

              <Link href="/history" className="block">
                <div className="group p-4 rounded-xl border border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold group-hover:text-emerald-400 transition-colors">Analytics</div>
                      <div className="text-sm text-muted-foreground">View insights and stats</div>
                    </div>
                    <Zap className="h-5 w-5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
