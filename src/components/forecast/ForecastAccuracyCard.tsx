'use client';
/**
 * src/components/forecast/ForecastAccuracyCard.tsx
 * S5 预测精度卡 — 上期预测准确率 + Top3 偏差归因 + 校准建议
 */
import { useMemo } from 'react';
import type { ForecastChannel } from '@/hooks/useForecast';
import accuracyRaw from '../../../data/planning/sales_forecast_accuracy_history.json';
import { calcForecastAccuracy } from '@/utils/salesForecastV8';

type ChannelData = {
    quarters: Array<{ period: string; predicted: number; actual: number; accuracy: number; deviation: number }>;
    topDeviations: Array<{ dimension: string; deviation: number; direction: string; reason: string; suggestion: string }>;
    overallAccuracy: number;
    trend: string;
};

type AccuracyData = {
    channels: Record<string, ChannelData>;
    healthBenchmark: { good: number; warning: number; critical: number };
};

const data = accuracyRaw as AccuracyData;

const HEALTH_CFG = {
    good: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '✅', label: '预测健康' },
    warning: { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: '⚠️', label: '需要校准' },
    critical: { cls: 'bg-rose-100 text-rose-700 border-rose-200', icon: '🔴', label: '严重偏差' },
};

const TREND_CFG = {
    improving: { icon: '↗', cls: 'text-emerald-600', label: '持续提升' },
    stable: { icon: '→', cls: 'text-slate-500', label: '基本稳定' },
    declining: { icon: '↘', cls: 'text-rose-600', label: '准确率下滑' },
};

function pct(v: number, signed = false) {
    const s = (v * 100).toFixed(1) + '%';
    return signed && v > 0 ? '+' + s : s;
}

interface Props {
    channel: ForecastChannel;
}

export default function ForecastAccuracyCard({ channel }: Props) {
    const channelData = data.channels[channel];
    if (!channelData) return null;

    const summary = useMemo(() => calcForecastAccuracy(
        channelData.quarters,
        channelData.topDeviations,
        data.healthBenchmark,
    ), [channelData]);

    const healthCfg = HEALTH_CFG[summary.healthStatus];
    const trendCfg = TREND_CFG[summary.trend as keyof typeof TREND_CFG] ?? TREND_CFG.stable;

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-800">📈 预测精度 — 上期校准报告</h3>
                    <p className="text-xs text-slate-400 mt-0.5">基于过去4个季度的实际 vs 预测对比</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${healthCfg.cls}`}>
                        {healthCfg.icon} {healthCfg.label}
                    </span>
                    <span className={`text-[11px] ${trendCfg.cls} font-medium`}>
                        {trendCfg.icon} {trendCfg.label}
                    </span>
                </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 准确率总览 */}
                <div className="lg:col-span-1">
                    <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">季度准确率</div>
                    <div className="space-y-2">
                        {summary.quarters.map(q => {
                            const isGood = q.accuracy >= data.healthBenchmark.good;
                            const isWarn = q.accuracy >= data.healthBenchmark.warning;
                            return (
                                <div key={q.period} className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 w-18 shrink-0">{q.period}</span>
                                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${isGood ? 'bg-emerald-400' : isWarn ? 'bg-amber-400' : 'bg-rose-400'}`}
                                            style={{ width: `${q.accuracy * 100}%` }}
                                        />
                                    </div>
                                    <span className={`font-medium w-10 text-right ${isGood ? 'text-emerald-600' : isWarn ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {pct(q.accuracy)}
                                    </span>
                                    <span className={`text-[10px] w-8 text-right ${q.deviation > 0 ? 'text-amber-500' : 'text-sky-500'}`}>
                                        {pct(q.deviation, true)}
                                    </span>
                                </div>
                            );
                        })}
                        <div className="flex items-center gap-2 text-xs border-t border-slate-100 pt-2 mt-2">
                            <span className="text-slate-500 w-18 shrink-0 font-medium">综合准确率</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${summary.overallAccuracy >= data.healthBenchmark.good ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${summary.overallAccuracy * 100}%` }} />
                            </div>
                            <span className="font-bold w-10 text-right text-slate-800">{pct(summary.overallAccuracy)}</span>
                            <span className="w-8" />
                        </div>
                    </div>
                </div>

                {/* Top3 偏差归因 */}
                <div className="lg:col-span-2">
                    <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Top 3 偏差归因 + 校准建议</div>
                    <div className="space-y-2.5">
                        {summary.topDeviations.map((d, i) => (
                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold text-white ${Math.abs(d.deviation) > 0.10 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                                            {i + 1}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700">{d.dimension}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.direction === '偏低' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {d.direction} {pct(Math.abs(d.deviation), false)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-1">📋 {d.reason}</p>
                                <p className="text-[11px] text-sky-700 bg-sky-50 rounded px-2 py-1">→ {d.suggestion}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
