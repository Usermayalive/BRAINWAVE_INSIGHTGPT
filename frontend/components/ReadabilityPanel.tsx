"use client";

import { useMemo, useState } from "react";
import { BookOpen, TrendingUp, Target, Info, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ClauseSummary } from "@/lib/api";

interface ReadabilityPanelProps {
    clauses: ClauseSummary[];
    isLoading?: boolean;
    error?: unknown;
}

interface ClauseReadability {
    clause: ClauseSummary;
    grade: number;
    fleschScore: number;
    level: 'easy' | 'moderate' | 'difficult' | 'expert';
}

interface ReadabilityStats {
    averageGrade: number;
    averageFleschScore: number;
    totalClauses: number;
    highlyDifficultClauses: number;
    veryDifficultClauses: number;
    readabilityLevel: 'excellent' | 'good' | 'fair' | 'difficult' | 'very-difficult';
    difficultyDistribution: {
        easy: number;
        moderate: number;
        difficult: number;
        veryDifficult: number;
    };
    difficultClauses: ClauseReadability[];
}

function getReadabilityLevel(grade: number): ReadabilityStats['readabilityLevel'] {
    if (grade <= 6) return 'excellent';
    if (grade <= 9) return 'good';
    if (grade <= 13) return 'fair';
    if (grade <= 16) return 'difficult';
    return 'very-difficult';
}

function getFleschDescription(score: number): string {
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Difficult';
}

function getReadabilityColor(level: ReadabilityStats['readabilityLevel']): string {
    switch (level) {
        case 'excellent': return 'text-green-400';
        case 'good': return 'text-blue-400';
        case 'fair': return 'text-yellow-400';
        case 'difficult': return 'text-orange-400';
        case 'very-difficult': return 'text-red-400';
    }
}

function getClauseLevel(grade: number): ClauseReadability['level'] {
    if (grade <= 9) return 'easy';
    if (grade <= 13) return 'moderate';
    if (grade <= 16) return 'difficult';
    return 'expert';
}

export function ReadabilityPanel({ clauses, isLoading, error }: ReadabilityPanelProps) {
    const [showDifficultClauses, setShowDifficultClauses] = useState(false);
    const [selectedClause, setSelectedClause] = useState<ClauseReadability | null>(null);

    const stats = useMemo<ReadabilityStats>(() => {
        if (!clauses || clauses.length === 0) {
            return {
                averageGrade: 0,
                averageFleschScore: 0,
                totalClauses: 0,
                highlyDifficultClauses: 0,
                veryDifficultClauses: 0,
                readabilityLevel: 'fair',
                difficultyDistribution: {
                    easy: 0,
                    moderate: 0,
                    difficult: 0,
                    veryDifficult: 0,
                },
                difficultClauses: [],
            };
        }

        let totalOriginalGrade = 0;
        let totalFleschScore = 0;
        let validClauses = 0;
        let highlyDifficultCount = 0;
        let veryDifficultCount = 0;
        const difficultClausesList: ClauseReadability[] = [];

        const distribution = {
            easy: 0,
            moderate: 0,
            difficult: 0,
            veryDifficult: 0,
        };

        clauses.forEach((clause) => {
            if (clause.readability_metrics) {
                const grade = clause.readability_metrics.original_grade || 12;
                const fleschScore = clause.readability_metrics.flesch_score || 50;

                totalOriginalGrade += grade;
                totalFleschScore += fleschScore;
                validClauses++;

                if (grade > 16) {
                    veryDifficultCount++;
                    distribution.veryDifficult++;
                    difficultClausesList.push({
                        clause,
                        grade,
                        fleschScore,
                        level: 'expert'
                    });
                } else if (grade > 13) {
                    highlyDifficultCount++;
                    distribution.difficult++;
                    difficultClausesList.push({
                        clause,
                        grade,
                        fleschScore,
                        level: 'difficult'
                    });
                } else if (grade > 9) {
                    distribution.moderate++;
                } else {
                    distribution.easy++;
                }
            }
        });

        const averageGrade = validClauses > 0 ? totalOriginalGrade / validClauses : 12;
        const averageFleschScore = validClauses > 0 ? totalFleschScore / validClauses : 50;

        return {
            averageGrade,
            averageFleschScore,
            totalClauses: clauses.length,
            highlyDifficultClauses: highlyDifficultCount,
            veryDifficultClauses: veryDifficultCount,
            readabilityLevel: getReadabilityLevel(averageGrade),
            difficultyDistribution: distribution,
            difficultClauses: difficultClausesList.sort((a, b) => b.grade - a.grade),
        };
    }, [clauses]);

    if (error) {
        return (
            <Card className="p-4 border-red-500/50 bg-red-500/10">
                <div className="text-sm text-red-400">
                    Failed to load readability metrics
                </div>
            </Card>
        );
    }

    if (isLoading || stats.totalClauses === 0) {
        return (
            <Card className="p-4 border-border/50 bg-card">
                <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium text-foreground">Readability Analysis</h4>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-4 bg-muted rounded mb-2"></div>
                                <div className="h-6 bg-muted rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        Upload a document to view readability metrics
                    </div>
                )}
            </Card>
        );
    }

    const difficultyLabel = stats.readabilityLevel === 'very-difficult' || stats.readabilityLevel === 'difficult'
        ? '⚠️ Complex'
        : stats.readabilityLevel === 'fair'
            ? '📖 Moderate'
            : '✓ Accessible';

    return (
        <div className="space-y-4">
            {/* Header with Title */}
            <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Readability Analysis
                </h3>
            </div>

            {/* Your Document's Score - Clear and Prominent */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-card to-muted/50 border border-border shadow-sm">
                <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Document Readability
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-3xl font-bold ${getReadabilityColor(stats.readabilityLevel)}`}>
                        {stats.averageGrade > 16 ? "Graduate" : stats.averageGrade > 13 ? "College" : stats.averageGrade > 9 ? "High School" : "Easy"}
                    </span>
                    <span className="text-sm text-muted-foreground">Level</span>
                </div>
                <div className="text-sm text-foreground/80">
                    {stats.averageGrade > 16
                        ? "Requires graduate-level education to fully understand"
                        : stats.averageGrade > 13
                            ? "Requires college-level education to understand"
                            : stats.averageGrade > 9
                                ? "Accessible to high school graduates and above"
                                : "Easy to understand for most readers"}
                </div>
            </div>

            {/* Main Metrics Grid - Now with clearer labels */}
            <div className="grid grid-cols-2 gap-3">
                {/* Grade Level Metric */}
                <div className="text-center p-3 rounded-lg bg-card border border-border/50 shadow-sm">
                    <div className={`text-2xl font-bold ${getReadabilityColor(stats.readabilityLevel)}`}>
                        {stats.averageGrade.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Grade Level</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                        Years of education needed
                    </div>
                </div>

                {/* Reading Ease Metric */}
                <div className="text-center p-3 rounded-lg bg-card border border-border/50 shadow-sm">
                    <div className="text-2xl font-bold text-purple-500">
                        {Math.round(stats.averageFleschScore)}/100
                    </div>
                    <div className="text-xs text-muted-foreground">Reading Ease</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                        Higher = easier to read
                    </div>
                </div>
            </div>

            {/* Explanation Card */}
            <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="text-[11px] text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-500">📊</span>
                        <span><strong>Grade Level</strong> = School grade needed (12 = 12th grade)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-purple-500">📈</span>
                        <span><strong>Reading Ease</strong> = Ease score (0-100, 60+ is easy)</span>
                    </div>
                </div>
            </div>

            {/* Sections Needing Attention - With References */}
            {stats.difficultClauses.length > 0 && (
                <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 overflow-hidden">
                    <Button
                        variant="ghost"
                        className="w-full p-3 flex items-center justify-between hover:bg-orange-500/10"
                        onClick={() => setShowDifficultClauses(!showDifficultClauses)}
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-600 dark:text-orange-300">
                                {stats.difficultClauses.length} Complex Section{stats.difficultClauses.length > 1 ? 's' : ''} Found
                            </span>
                        </div>
                        {showDifficultClauses ? (
                            <ChevronUp className="h-4 w-4 text-orange-500" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-orange-500" />
                        )}
                    </Button>

                    {showDifficultClauses && (
                        <div className="p-3 pt-0 space-y-2">
                            <div className="text-xs text-orange-600/70 dark:text-orange-200/70 mb-2">
                                Click on a section to view in detail:
                            </div>
                            {stats.difficultClauses.map((item, idx) => (
                                <div
                                    key={item.clause.clause_id}
                                    className="p-2 rounded bg-card border border-border/50 hover:border-orange-500/30 cursor-pointer transition-colors group shadow-sm"
                                    title="Click to view full details"
                                    onClick={() => setSelectedClause(item)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-orange-600 dark:text-orange-300">
                                                    Section {item.clause.order}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-200">
                                                    {item.clause.category}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground line-clamp-2">
                                                {item.clause.summary}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className={`text-sm font-bold ${item.level === 'expert' ? 'text-red-500' : 'text-orange-500'}`}>
                                                Grade {item.grade.toFixed(0)}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/70">
                                                {item.level === 'expert' ? 'Very Complex' : 'Complex'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Complexity Distribution */}
            <div>
                <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Complexity Distribution</div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                    <div className="text-center p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        <div className="font-medium">{stats.difficultyDistribution.easy}</div>
                        <div className="text-[10px] opacity-70 mt-1">Easy</div>
                    </div>
                    <div className="text-center p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300">
                        <div className="font-medium">{stats.difficultyDistribution.moderate}</div>
                        <div className="text-[10px] opacity-70 mt-1">Mod</div>
                    </div>
                    <div className="text-center p-2 rounded bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-300">
                        <div className="font-medium">{stats.difficultyDistribution.difficult}</div>
                        <div className="text-[10px] opacity-70 mt-1">Hard</div>
                    </div>
                    <div className="text-center p-2 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300">
                        <div className="font-medium">{stats.difficultyDistribution.veryDifficult}</div>
                        <div className="text-[10px] opacity-70 mt-1">Expert</div>
                    </div>
                </div>
            </div>

            {/* Insight with Actionable Advice */}
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300 uppercase tracking-wide">Insight</span>
                </div>
                <div className="text-xs text-foreground/80">
                    {stats.averageGrade > 16
                        ? "This document requires graduate-level reading comprehension. Consider simplifying for general audiences."
                        : stats.averageGrade > 13
                            ? "Suitable for college-level readers. Some technical sections may need review."
                            : "Accessible to most readers. Well-structured for general consumption."}
                </div>
            </div>

            {/* Learn More Link */}
            <div className="text-center">
                <a
                    href="https://readabilityformulas.com/flesch-reading-ease-readability-formula.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"
                >
                    Learn more about readability metrics
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>

            {/* Clause Detail Modal */}
            {selectedClause && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedClause(null)}
                >
                    <div
                        className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${selectedClause.level === 'expert'
                                    ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                                    : 'bg-orange-500/20 text-orange-600 dark:text-orange-300'
                                    }`}>
                                    Grade {selectedClause.grade.toFixed(0)}
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    Section {selectedClause.clause.order}: {selectedClause.clause.category}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedClause(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </Button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                            {/* Summary */}
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Summary</div>
                                <p className="text-sm text-foreground/90 leading-relaxed">
                                    {selectedClause.clause.summary}
                                </p>
                            </div>

                            {/* Readability Metrics */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <div className="text-xs text-muted-foreground mb-1">Reading Grade</div>
                                    <div className={`text-lg font-bold ${selectedClause.grade > 16 ? 'text-red-500' :
                                        selectedClause.grade > 13 ? 'text-orange-500' : 'text-yellow-500'
                                        }`}>
                                        {selectedClause.grade.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-muted-foreground/70">
                                        {selectedClause.grade > 16 ? 'Graduate Level' :
                                            selectedClause.grade > 13 ? 'College Level' : 'High School'}
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <div className="text-xs text-muted-foreground mb-1">Flesch Score</div>
                                    <div className="text-lg font-bold text-purple-500">
                                        {selectedClause.fleschScore.toFixed(0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground/70">
                                        {getFleschDescription(selectedClause.fleschScore)}
                                    </div>
                                </div>
                            </div>

                            {/* Risk Level */}
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                <div className="text-xs text-muted-foreground mb-1">Risk Assessment</div>
                                <div className={`text-sm font-medium ${selectedClause.clause.risk_level === 'attention' ? 'text-red-500' :
                                    selectedClause.clause.risk_level === 'moderate' ? 'text-yellow-500' : 'text-emerald-500'
                                    }`}>
                                    {selectedClause.clause.risk_level === 'attention' ? '⚠️ High Risk' :
                                        selectedClause.clause.risk_level === 'moderate' ? '⚡ Moderate Risk' : '✓ Low Risk'}
                                </div>
                            </div>

                            {/* Recommendation */}
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <div className="text-xs text-blue-600 dark:text-blue-300 font-medium mb-1">💡 Recommendation</div>
                                <p className="text-xs text-foreground/80">
                                    {selectedClause.grade > 16
                                        ? "Consider simplifying this section for broader accessibility. Complex language may hinder understanding."
                                        : selectedClause.grade > 13
                                            ? "This section is suitable for readers with higher education. May need clarification for general audiences."
                                            : "This section has moderate complexity. Most adult readers should understand it."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
