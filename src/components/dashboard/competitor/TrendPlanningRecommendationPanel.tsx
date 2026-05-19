'use client';

import type { TrendPlanningRecommendation, TrendStatusColor, RiskLevel } from '@/types/competitorTrendTypes';

const STATUS_CONFIG: Record<TrendStatusColor, { bg: string; border: string; badge: string }> = {
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
    blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700' },
    orange: { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
    red:    { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700' },
    purple: { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700' },
    gray:   { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-500' },
};

const RISK_LABELS: Record<RiskLevel, string> = {
    low: '低风险', medium: '中风险', high: '高风险',
};

interface TrendPlanningRecommendationPanelProps {
    recommendations: TrendPlanningRecommendation[];
    onJumpToPlanning?: (rec: TrendPlanningRecommendation) => void;
    onJumpToOtb?: (rec: TrendPlanningRecommendation) => void;
    onJumpToDesign?: (rec: TrendPlanningRecommendation) => void;
}

export default function TrendPlanningRecommendationPanel({
    recommendations,
    onJumpToPlanning,
    onJumpToOtb,
    onJumpToDesign,
}: TrendPlanningRecommendationPanelProps) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {recommendations.map((rec) => {
                const cfg = STATUS_CONFIG[rec.statusColor];
                return (
                    <div key={rec.trendId} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-800">{rec.trendName}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{rec.trendId}</div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.badge}`}>{rec.recommendedAction}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    rec.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700' :
                                    rec.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-rose-100 text-rose-700'
                                }`}>{RISK_LABELS[rec.riskLevel]}</span>
                            </div>
                        </div>

                        <div className="text-xs text-slate-500 mb-3 leading-relaxed">
                            <span className="text-slate-400">趋势证据：</span>{rec.trendEvidence}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                            <div><span className="text-slate-400">品类：</span><span className="text-slate-700">{rec.fitCategory}</span></div>
                            <div><span className="text-slate-400">鞋型：</span><span className="text-slate-700">{rec.fitShoeType}</span></div>
                            <div><span className="text-slate-400">价格带：</span><span className="text-slate-700">{rec.recommendedPriceBand}</span></div>
                            <div><span className="text-slate-400">SKU数：</span><span className="text-slate-700">{rec.recommendedSkuCount} 款</span></div>
                            <div><span className="text-slate-400">波段：</span><span className="text-slate-700">{rec.recommendedWaveId}</span></div>
                            <div><span className="text-slate-400">渠道：</span><span className="text-slate-700">{rec.recommendedChannel}</span></div>
                        </div>

                        <div className="text-xs text-slate-600 mb-2">
                            <span className="text-slate-400">设计建议：</span>{rec.designSuggestion}
                        </div>
                        <div className="text-xs text-slate-600 mb-3">
                            <span className="text-slate-400">OTB影响：</span>{rec.otbImpact}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/60">
                            {onJumpToPlanning && (
                                <button
                                    onClick={() => onJumpToPlanning(rec)}
                                    className="text-[11px] px-2.5 py-1 rounded-md bg-white/80 text-slate-700 border border-slate-200 hover:bg-white transition-colors"
                                >
                                    加入波段企划
                                </button>
                            )}
                            {onJumpToOtb && (
                                <button
                                    onClick={() => onJumpToOtb(rec)}
                                    className="text-[11px] px-2.5 py-1 rounded-md bg-white/80 text-slate-700 border border-slate-200 hover:bg-white transition-colors"
                                >
                                    生成OTB建议
                                </button>
                            )}
                            {onJumpToDesign && (
                                <button
                                    onClick={() => onJumpToDesign(rec)}
                                    className="text-[11px] px-2.5 py-1 rounded-md bg-white/80 text-slate-700 border border-slate-200 hover:bg-white transition-colors"
                                >
                                    生成趋势Brief
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
