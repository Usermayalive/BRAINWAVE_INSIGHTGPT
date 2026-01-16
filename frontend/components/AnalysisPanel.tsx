"use client";

import { X, Flame, BookOpen, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskHeatmap } from "@/components/RiskHeatmap";
import { ReadabilityPanel } from "@/components/ReadabilityPanel";
import type { ClauseSummary } from "@/lib/api";

export interface AnalysisPanelProps {
    isOpen: boolean;
    onClose: () => void;
    clauses: ClauseSummary[];
    isLoading?: boolean;
    error?: Error | null;
    documentName?: string;
}

/**
 * Right panel with risk analysis and document insights
 */
export const AnalysisPanel = ({
    isOpen,
    onClose,
    clauses,
    isLoading = false,
    error = null,
    documentName,
}: AnalysisPanelProps) => {
    // Calculate quick stats
    const totalClauses = clauses.length;
    const highRiskCount = clauses.filter((c) => c.risk_level === "attention").length;
    const moderateRiskCount = clauses.filter((c) => c.risk_level === "moderate").length;
    const lowRiskCount = clauses.filter((c) => c.risk_level === "low").length;

    // Calculate overall risk score (0-100)
    const riskScore = totalClauses > 0
        ? Math.round(((highRiskCount * 3 + moderateRiskCount * 1.5 + lowRiskCount * 0.5) / (totalClauses * 3)) * 100)
        : 0;

    const getRiskScoreColor = (score: number) => {
        if (score <= 30) return "text-emerald-400";
        if (score <= 60) return "text-yellow-400";
        return "text-red-400";
    };

    const getRiskScoreLabel = (score: number) => {
        if (score <= 30) return "Low Risk";
        if (score <= 60) return "Moderate Risk";
        return "High Risk";
    };

    return (
        <>
            {/* Mobile Overlay Background */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 xl:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Right Analysis Panel */}
            <aside
                className={`
        ${isOpen ? "flex" : "hidden"}
        xl:flex w-[26rem] shrink-0 flex-col border-l border-white/10 bg-zinc-950 h-full overflow-hidden
        fixed xl:relative top-0 right-0 z-30 xl:z-auto
        transition-transform duration-300 ease-out
      `}
            >
                <div className="p-4 flex flex-col h-full overflow-hidden">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <BarChart className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-white">
                                    Document Analysis
                                </h2>
                                {documentName && (
                                    <p className="text-xs text-white/50 truncate max-w-[180px]">
                                        {documentName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="xl:hidden hover:bg-white/10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Scrollable content area */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-2">
                        {/* Overall Risk Score */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs font-medium text-white/60 uppercase tracking-wide">
                                    Overall Risk Score
                                </div>
                                <div className={`text-xs font-medium ${getRiskScoreColor(riskScore)}`}>
                                    {getRiskScoreLabel(riskScore)}
                                </div>
                            </div>
                            <div className="flex items-end gap-3">
                                <div className={`text-4xl font-bold ${getRiskScoreColor(riskScore)}`}>
                                    {riskScore}
                                </div>
                                <div className="text-sm text-white/40 pb-1">/100</div>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${riskScore <= 30
                                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                        : riskScore <= 60
                                            ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                                            : "bg-gradient-to-r from-red-500 to-red-400"
                                        }`}
                                    style={{ width: `${riskScore}%` }}
                                />
                            </div>
                            <div className="mt-2 text-xs text-white/50">
                                Based on {totalClauses} analyzed sections
                            </div>
                        </div>

                        {/* Risk Analysis Section */}
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                                <Flame className="h-4 w-4 text-red-500" /> Risk Heat Map
                            </h3>

                            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10">
                                <RiskHeatmap
                                    clauses={clauses}
                                    isLoading={isLoading}
                                    error={error}
                                />
                            </div>
                        </div>

                        {/* Readability Section */}
                        <div>
                            <ReadabilityPanel
                                clauses={clauses}
                                isLoading={isLoading}
                                error={error}
                            />
                        </div>

                        {/* Quick Stats */}
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                                <BookOpen className="h-4 w-4 text-blue-500" /> Analysis Summary
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                                    <div className="text-2xl font-bold text-white">{totalClauses}</div>
                                    <div className="text-xs text-white/60">Total Sections</div>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                                    <div className="text-2xl font-bold text-purple-400">
                                        {clauses.filter((c) => c.needs_review).length}
                                    </div>
                                    <div className="text-xs text-white/60">Needs Review</div>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                                    <div className="text-2xl font-bold text-red-400">{highRiskCount}</div>
                                    <div className="text-xs text-white/60">High Risk Items</div>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                                    <div className="text-2xl font-bold text-emerald-400">{lowRiskCount}</div>
                                    <div className="text-xs text-white/60">Safe Items</div>
                                </div>
                            </div>
                        </div>

                        {/* Categories Breakdown */}
                        {clauses.length > 0 && (
                            <div>
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                                    Categories Found
                                </h3>
                                <div className="space-y-2">
                                    {Array.from(new Set(clauses.map((c) => c.category))).map((category) => {
                                        const categoryCount = clauses.filter((c) => c.category === category).length;
                                        const percentage = Math.round((categoryCount / totalClauses) * 100);
                                        return (
                                            <div key={category} className="flex items-center gap-2">
                                                <div className="flex-1 text-xs text-white/70">{category}</div>
                                                <div className="text-xs text-white/50">{categoryCount}</div>
                                                <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};
