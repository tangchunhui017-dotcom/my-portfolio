'use client';

import type { TrendFitScore, TrendType } from '@/types/trendInsightTypes';
import { TREND_STATUS_BADGE_STYLES } from '@/config/trendInsight';

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
    const pct = Math.min(100, (score / max) * 100);
    const color = score >= 7 ? 'bg-emerald-400' : score >= 5 ? 'bg-amber-400' : 'bg-rose-400';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 w-6 text-right">{score}</span>
        </div>
    );
}

export default function TrendFitScorePanel({
    scores,
    trendType,
}: {
    scores: TrendFitScore;
    trendType: TrendType;
}) {
    const dims = [
        { label: '品牌契合度', key: 'brandFit', weight: '30%', score: scores.brandFit, invert: false },
        { label: '转化潜力', key: 'conversionPotential', weight: '30%', score: scores.conversionPotential, invert: false },
        { label: '设计创新性', key: 'designInnovation', weight: '20%', score: scores.designInnovation, invert: false },
        { label: '落地风险', key: 'landingRisk', weight: '20%', score: scores.landingRisk, invert: true },
    ] as const;

    return (
        <div className="space-y-3">
            {/* 综合评分 */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
                <div>
                    <div className="text-[11px] text-slate-400 mb-0.5">综合适配评分</div>
                    <div className="text-2xl font-bold text-slate-800">{scores.overall.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-400">
                        公式：品牌×30% + 转化×30% + 创新×20% + (10-风险)×20%
                    </div>
                </div>
                <div className="text-center">
                    <span
                        className={`text-sm font-bold px-4 py-1.5 rounded-full border ${
                            TREND_STATUS_BADGE_STYLES[scores.recommendation] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                    >
                        {scores.recommendation}
                    </span>
                </div>
            </div>

            {/* 各维度 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {dims.map(({ label, weight, score, invert }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-white p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-slate-600">{label}</span>
                            <span className="text-[10px] text-slate-400">{weight}{invert ? '（越低越好）' : ''}</span>
                        </div>
                        <ScoreBar score={score} />
                    </div>
                ))}
            </div>

            {/* 短时流行特别提示 */}
            {trendType === '短时流行' && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚡ 短时流行默认进入快反测试或小批量验证，不直接进入年度主推计划。
                </div>
            )}
        </div>
    );
}
