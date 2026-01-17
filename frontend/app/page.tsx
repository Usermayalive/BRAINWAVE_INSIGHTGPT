"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, FileText, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Aurora from "@/components/Aurora";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0">
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
          amplitude={1.0}
          blend={0.5}
          speed={0.5}
        />
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">InsightGPT</span>
          </div>
          <Link href="/login">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
              Sign In
            </Button>
          </Link>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-white/80 text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Document Intelligence
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight max-w-4xl leading-tight">
            Understand your documents{" "}
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              instantly
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed">
            Upload contracts, legal documents, or any text. Get AI-powered analysis, risk assessment, and instant answers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 px-8 py-6 text-lg rounded-full font-medium transition-all"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-24 max-w-4xl w-full">
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-left hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Smart Analysis</h3>
              <p className="text-white/40 text-sm">
                Extract key clauses and insights from complex documents.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-left hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-pink-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Risk Detection</h3>
              <p className="text-white/40 text-sm">
                Identify potential risks and red flags automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-left hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Instant Q&A</h3>
              <p className="text-white/40 text-sm">
                Ask questions naturally and get accurate answers.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-white/20 text-sm">
          Built with AI • InsightGPT
        </footer>
      </div>
    </div>
  );
}
