'use client';
/**
 * src/components/forecast/ScenarioProbabilityPanel.tsx
 * S17 情景对比 + 概率打分 + 加权期望值
 */
import { useState, useMemo } from 'react';
import { useForecast } from '@/hooks/useForecast';
import type { ForecastChannel } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';
import { calcWeightedExpectedValue } from '@/utils/salesForecastV8';

interface Props {
    channel: ForecastChannel;
}

const KEY_ASSUMPTIONS = {
    conservative: { growth: '≤0%', traffic: '客流-5%', conversion: '转化率持平', refund: '退款率+3pp' },
    base: { growth: '+8-12%', traffic: '客流+5%', conversion: '转化率+0.5pp', refund: '退款率持平' },
    optimistic: { growth: '+18-25%', traffic: '客流+12%', conversion: '转化率+1pp', refund: '退款率-2pp' },
};

const LABELS = { conservative: '保守', base: '基准', optimistic: '乐观' };
const COLORS = {
    conservative: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-400' },
    base: { text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', bar: 'bg-sky-500' },
    optimistic: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' },
};

type ScenarioKey = 'conservative' | 'base' | 'optimistic';

export default function ScenarioProbabilityPanel({ channel }: Props) {
    const conservative = useForecast(channel, 'conservative');
    const base = useForecast(channel, 'base');
    const optimistic = useForecast(channel, 'optimistic');

    const [probabilities, setProbabilities] = useState({ conservative: 30, base: 50, optimistic: 20 });

    const totalProb = probabilities.conservative + probabilities.base + probabilities.optimistic;
    const normalizedProbs = {
        conservative: probabilities.conservative / totalProb,
        base: probabilities.base / totalProb,
        optimistic: probabilities.optimistic / totalProb,
    };

    const weightedResult = useMemo(() => {
        if (!conservative || !base || !optimistic) return null;
        return calcWeightedExpectedValue(
            { conservative: conservative.annualForecast, base: base.annualForecast, optimistic: optimistic.annualForecast },
            normalizedProbs,
        );
    }, [conservative, base, optimistic, probabilities]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateProb = (key: ScenarioKey, val: number) => {
        setProbabilities(prev => ({ ...prev, [key]: Math.max(5, Math.min(90, val)) }));
    };

    const scenarios: ScenarioKey[] = ['conservative', 'base', 'optimistic'];
    const dataMap = { conservative, base, optimistic };

    return (
        <div className="space-y-4">
            {/* 三情景对比 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {scenarios.map(sc => {
                    const data = dataMap[sc];
                    const c = COLORS[sc];
                    const assump = KEY_ASSUMPTIONS[sc];
                    const prob = normalizedProbs[sc];
                    return (
                        <div key={sc} className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className={`font-bold text-sm ${c.text}`}>{LABELS[sc]}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${c.text}`}>{(prob * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                            {data && (
                                <>
                                    <div className={`text-xl font-bold ${c.text} mb-1`}>{formatMoneyCny(data.annualForecast)}</div>
                                    <div className={`text-xs ${c.text} mb-3`}>
                                        {data.annualYoY >= 0 ? '+' : ''}{(data.annualYoY * 100).toFixed(1)}% YoY
                                    </div>
                                </>
                            )}
                            <div className="space-y-1 text-[10px] text-slate-600 mb-3">
                                <div>增长预期：<span className="font-medium">{assump.growth}</span></div>
                                <div>客流假设：<span className="font-medium">{assump.traffic}</span></div>
                                <div>转化率：<span className="font-medium">{assump.conversion}</span></div>
                                <div>退款率：<span className="font-medium">{assump.refund}</span></div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 mb-1">概率打分 {probabilities[sc]}%</div>
                                <input type="range" min={5} max={90} step={5} value={probabilities[sc]}
                                    onChange={e => updateProb(sc, Number(e.target.value))}
                                    className="w-full h-1.5 rounded-lg appearance-none bg-slate-200 cursor-pointer" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 加权期望值 */}
            {weightedResult && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="text-xs font-semibold text-slate-600 mb-3">📊 概率加权期望值</div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">加权期望年度预测</div>
                            <div className="text-xl font-bold text-slate-800">{formatMoneyCny(weightedResult.expectedValue)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">vs 基准偏差</div>
                            <div className={`text-xl font-bold ${weightedResult.weightedYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {weightedResult.weightedYoY >= 0 ? '+' : ''}{(weightedResult.weightedYoY * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 mb-2">情景分布</div>
                            <div className="flex gap-0.5 h-4 rounded overflow-hidden">
                                {scenarios.map(sc => (
                                    <div key={sc} className={COLORS[sc].bar} style={{ width: `${normalizedProbs[sc] * 100}%` }} />
                                ))}
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                <span>保守{(normalizedProbs.conservative * 100).toFixed(0)}%</span>
                                <span>基准{(normalizedProbs.base * 100).toFixed(0)}%</span>
                                <span>乐观{(normalizedProbs.optimistic * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
