'use client';
/**
 * src/components/dashboard/channel/FittingFunnelChart.tsx
 * S7b: 鞋类试穿 → 转化漏斗（按区域 / 门店等级）
 */
import { useState } from 'react';
import funnelData from '../../../../data/planning/channel_fitting_funnel.json';

interface RegionFunnel {
    region: string;
    traffic: number;
    fittingCount: number;
    fittingRate: number;
    conversionCount: number;
    fittingConversionRate: number;
    avgTicket: number;
    attachRate: number;
    status: 'healthy' | 'warning' | 'risk';
    alert: string | null;
}

const data = funnelData as {
    generatedAt: string;
    industryBenchmark: {
        fittingRate: { min: number; max: number; label: string };
        fittingConversionRate: { min: number; max: number; label: string };
    };
    regions: RegionFunnel[];
};

const STATUS_COLOR: Record<string, string> = {
    healthy: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    risk: 'border-rose-200 bg-rose-50',
};

const STATUS_LABEL: Record<string, string> = {
    healthy: '✅ 健康',
    warning: '⚠️ 注意',
    risk: '🔴 风险',
};

function fmtK(v: number): string {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
}

function FunnelBar({ label, value, benchmark, benchmarkLabel }: {
    label: string;
    value: number;
    benchmark: { min: number; max: number };
    benchmarkLabel: string;
}) {
    const pct = Math.round(value * 100);
    const bMin = Math.round(benchmark.min * 100);
    const bMax = Math.round(benchmark.max * 100);
    const isHealthy = value >= benchmark.min && value <= benchmark.max;
    const barColor = isHealthy ? 'bg-emerald-400' : value < benchmark.min ? 'bg-rose-400' : 'bg-amber-400';
    return (
        <div>
            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                <span>{label}</span>
                <span className="text-[9px]">行业健康:{bMin}-{bMax}%</span>
            </div>
            <div className="relative w-full h-5 bg-slate-100 rounded-full overflow-hidden">
                {/* benchmark band */}
                <div
                    className="absolute top-0 h-5 bg-emerald-100/70"
                    style={{
                        left: `${Math.min(benchmark.min * 100, 100)}%`,
                        width: `${Math.min((benchmark.max - benchmark.min) * 100, 100 - benchmark.min * 100)}%`,
                    }}
                />
                {/* actual bar */}
                <div
                    className={`absolute top-0 h-5 rounded-full ${barColor} transition-all`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-multiply">
                    {pct}%
                </span>
            </div>
        </div>
    );
}

export default function FittingFunnelChart() {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 rounded-full bg-sky-500 inline-block" />
                <h3 className="text-base font-bold text-slate-900">鞋类试穿 → 转化漏斗 👟</h3>
                <span className="ml-auto text-[10px] text-slate-400">{data.generatedAt} 更新</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                鞋类零售核心漏斗：进店 → 试穿 → 成交。
                绿色区间=行业健康值（试穿率{Math.round(data.industryBenchmark.fittingRate.min * 100)}-{Math.round(data.industryBenchmark.fittingRate.max * 100)}%，转化率{Math.round(data.industryBenchmark.fittingConversionRate.min * 100)}-{Math.round(data.industryBenchmark.fittingConversionRate.max * 100)}%）。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.regions.map((r) => (
                    <div
                        key={r.region}
                        className={`rounded-xl border p-3 cursor-pointer transition-shadow hover:shadow-md ${STATUS_COLOR[r.status]}`}
                        onClick={() => setSelected(selected === r.region ? null : r.region)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-800">{r.region}</span>
                            <span className="text-[10px]">{STATUS_LABEL[r.status]}</span>
                        </div>

                        {/* 漏斗数字 */}
                        <div className="flex items-center gap-0.5 mb-2 text-[10px] text-center">
                            <div className="flex-1 bg-white/70 rounded px-1 py-1">
                                <div className="text-slate-500">进店</div>
                                <div className="font-bold text-slate-800">{fmtK(r.traffic)}</div>
                            </div>
                            <span className="text-slate-400">→</span>
                            <div className="flex-1 bg-white/70 rounded px-1 py-1">
                                <div className="text-slate-500">试穿</div>
                                <div className="font-bold text-slate-800">{fmtK(r.fittingCount)}</div>
                            </div>
                            <span className="text-slate-400">→</span>
                            <div className="flex-1 bg-white/70 rounded px-1 py-1">
                                <div className="text-slate-500">成交</div>
                                <div className="font-bold text-slate-800">{fmtK(r.conversionCount)}</div>
                            </div>
                        </div>

                        {/* 指标条 */}
                        <div className="space-y-1.5">
                            <FunnelBar
                                label="试穿率"
                                value={r.fittingRate}
                                benchmark={data.industryBenchmark.fittingRate}
                                benchmarkLabel="试穿率健康区间"
                            />
                            <FunnelBar
                                label="试穿转化率"
                                value={r.fittingConversionRate}
                                benchmark={data.industryBenchmark.fittingConversionRate}
                                benchmarkLabel="转化率健康区间"
                            />
                        </div>

                        {/* 客单价/连带率 */}
                        <div className="mt-2 flex gap-2 text-[10px]">
                            <span className="flex-1 text-center bg-white/70 rounded px-1 py-1">
                                <span className="text-slate-500 block">客单价</span>
                                <span className="font-semibold text-slate-800">¥{r.avgTicket}</span>
                            </span>
                            <span className="flex-1 text-center bg-white/70 rounded px-1 py-1">
                                <span className="text-slate-500 block">连带率</span>
                                <span className="font-semibold text-slate-800">{r.attachRate.toFixed(1)}件</span>
                            </span>
                        </div>

                        {/* 异常预警 */}
                        {r.alert && selected === r.region && (
                            <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5 border border-rose-200 leading-relaxed">
                                ⚠️ {r.alert}
                            </div>
                        )}
                        {r.alert && selected !== r.region && (
                            <div className="mt-1.5 text-[9px] text-amber-600">⚠️ 有异常 · 点击查看</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
