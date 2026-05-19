'use client';
/**
 * src/components/dashboard/channel/ChannelPortfolioScoreCard.tsx
 * S1.5: 季度区域组合得分卡（4维评分 + A/B/C/D + 趋势线 + 行业对标）
 */
import scoreData from '../../../../data/planning/channel_portfolio_score_history.json';

interface RegionScore {
    region: string;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    dimensions: {
        salesContribution: number;
        grossMarginContribution: number;
        turnoverEfficiency: number;
        riskControl: number;
    };
    quarterTrend: number[];
    industryBenchmark: number;
    suggestion: string;
}

const data = scoreData as { generatedAt: string; regions: RegionScore[] };

const GRADE_COLOR: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    B: 'bg-blue-100 text-blue-700 border-blue-300',
    C: 'bg-amber-100 text-amber-700 border-amber-300',
    D: 'bg-rose-100 text-rose-700 border-rose-300',
};

const SCORE_COLOR = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-amber-600';
    return 'text-rose-600';
};

function MiniSparkline({ values, benchmark }: { values: number[]; benchmark: number }) {
    const min = Math.min(...values, benchmark) - 5;
    const max = Math.max(...values, benchmark) + 5;
    const range = max - min;
    const w = 80;
    const h = 28;
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
    });
    const bY = h - ((benchmark - min) / range) * h;
    return (
        <svg width={w} height={h} className="inline-block">
            <line x1="0" y1={bY} x2={w} y2={bY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2" />
            <polyline points={pts.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            {values.map((v, i) => {
                const x = (i / (values.length - 1)) * w;
                const y = h - ((v - min) / range) * h;
                return <circle key={i} cx={x} cy={y} r="2" fill="#3b82f6" />;
            })}
        </svg>
    );
}

function DimBar({ label, value }: { label: string; value: number }) {
    const color = value >= 85 ? 'bg-emerald-400' : value >= 70 ? 'bg-blue-400' : value >= 55 ? 'bg-amber-400' : 'bg-rose-400';
    return (
        <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-16 text-slate-500 truncate">{label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
            </div>
            <span className="w-6 text-right font-semibold text-slate-700">{value}</span>
        </div>
    );
}

export default function ChannelPortfolioScoreCard() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block" />
                <h3 className="text-base font-bold text-slate-900">季度区域组合得分</h3>
                <span className="ml-auto text-[10px] text-slate-400">{data.generatedAt} 更新</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                4 维综合评分：销售贡献(30%) · 毛利贡献(25%) · 周转效率(25%) · 风险防控(20%)。
                虚线=行业基准，小折线=4季度趋势。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.regions.map((r) => (
                    <div key={r.region} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-800">{r.region}</span>
                            <span className={`text-xs font-bold border rounded-full px-2 py-0.5 ${GRADE_COLOR[r.grade]}`}>
                                {r.grade} 级
                            </span>
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <span className={`text-2xl font-black ${SCORE_COLOR(r.score)}`}>{r.score}</span>
                            <span className="text-[10px] text-slate-400 pb-1">/ 100</span>
                            <div className="ml-auto">
                                <MiniSparkline values={r.quarterTrend} benchmark={r.industryBenchmark} />
                            </div>
                        </div>
                        <div className="space-y-1 mb-2">
                            <DimBar label="销售贡献" value={r.dimensions.salesContribution} />
                            <DimBar label="毛利贡献" value={r.dimensions.grossMarginContribution} />
                            <DimBar label="周转效率" value={r.dimensions.turnoverEfficiency} />
                            <DimBar label="风险防控" value={r.dimensions.riskControl} />
                        </div>
                        <div className="text-[10px] text-slate-500 bg-white rounded-lg px-2 py-1.5 border border-slate-100 leading-relaxed">
                            💡 {r.suggestion}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                    <span className="w-4 border-t border-dashed border-slate-400" />行业基准
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-4 border-t border-blue-400 border-[1.5px]" />区域趋势
                </span>
                <span className="ml-auto">A≥85 / B≥70 / C≥55 / D&lt;55</span>
            </div>
        </div>
    );
}
