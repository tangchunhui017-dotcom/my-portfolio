'use client';

import type { TrendDecisionSummary } from '@/types/competitorTrendTypes';

interface TrendDecisionSummaryPanelProps {
    summary: TrendDecisionSummary;
}

function DecisionRow({ icon, label, color, items }: { icon: string; label: string; color: string; items: string[] }) {
    if (!items.length) return null;
    return (
        <div className={`rounded-lg border p-3 ${color}`}>
            <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{icon}</span>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
            </div>
            <ul className="space-y-1">
                {items.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-1.5">
                        <span className="text-slate-400 flex-shrink-0">·</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function TrendDecisionSummaryPanel({ summary }: TrendDecisionSummaryPanelProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {/* 跟进趋势 */}
            <DecisionRow
                icon="✅"
                label="本月最值得跟进的趋势"
                color="bg-emerald-50 border-emerald-200"
                items={summary.followTrends}
            />

            {/* 不建议跟进 */}
            <DecisionRow
                icon="🚫"
                label="不建议继续跟进的趋势"
                color="bg-rose-50 border-rose-200"
                items={summary.avoidTrends}
            />

            {/* 最佳价格带/品类 */}
            <div className="rounded-lg border bg-blue-50 border-blue-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">💰</span>
                    <span className="text-xs font-semibold text-slate-700">最有机会价格带 & 品类</span>
                </div>
                <div className="space-y-1.5">
                    <div className="text-xs text-slate-600">
                        <span className="text-slate-400">价格带：</span>{summary.bestPriceBand}
                    </div>
                    <div className="text-xs text-slate-600">
                        <span className="text-slate-400">品类/鞋型：</span>{summary.bestCategoryStyle}
                    </div>
                </div>
            </div>

            {/* 进入设计计划 */}
            <DecisionRow
                icon="🎨"
                label="需要进入设计计划的趋势"
                color="bg-violet-50 border-violet-200"
                items={summary.enterDesignPlan}
            />

            {/* 进入波段企划 */}
            <DecisionRow
                icon="📋"
                label="需要进入波段企划的趋势"
                color="bg-sky-50 border-sky-200"
                items={summary.enterWavePlan}
            />

            {/* 小批量测试 */}
            <DecisionRow
                icon="🧪"
                label="需要小批量测试的趋势"
                color="bg-amber-50 border-amber-200"
                items={summary.smallBatchTest}
            />
        </div>
    );
}
