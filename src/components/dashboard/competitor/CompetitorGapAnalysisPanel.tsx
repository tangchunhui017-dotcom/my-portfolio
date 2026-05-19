'use client';

import type { CompetitorGapAnalysisItem, RiskLevel } from '@/types/competitorTrendTypes';

const RISK_CONFIG: Record<RiskLevel, { badge: string; label: string }> = {
    low:    { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '低风险' },
    medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: '中风险' },
    high:   { badge: 'bg-rose-50 text-rose-700 border-rose-200',          label: '高风险' },
};

interface CompetitorGapAnalysisPanelProps {
    items: CompetitorGapAnalysisItem[];
    onJumpToModule?: (moduleId: string) => void;
}

export default function CompetitorGapAnalysisPanel({ items, onJumpToModule }: CompetitorGapAnalysisPanelProps) {
    const sorted = [...items].sort((a, b) => {
        const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
        return order[a.riskLevel] - order[b.riskLevel];
    });

    return (
        <div className="space-y-3">
            {sorted.map((item) => {
                const riskCfg = RISK_CONFIG[item.riskLevel];
                return (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">{item.dimension}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${riskCfg.badge}`}>
                                    {riskCfg.label}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-lg bg-rose-50 border border-rose-100 p-2.5">
                                <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wide mb-1">竞品表现</div>
                                <div className="text-slate-700 leading-relaxed">{item.competitorPerformance}</div>
                            </div>
                            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                                <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1">本品表现</div>
                                <div className="text-slate-700 leading-relaxed">{item.ourPerformance}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">差距</div>
                                <div className="text-slate-700 font-medium leading-relaxed">{item.gap}</div>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                            <div className="text-xs text-slate-500">
                                <span className="text-slate-400">影响：</span>{item.impact}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded whitespace-nowrap">
                                    {item.recommendedAction}
                                </span>
                                {onJumpToModule && (
                                    <button
                                        onClick={() => onJumpToModule(item.relatedModule)}
                                        className="text-[11px] text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                                    >
                                        → {item.relatedModule}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
