'use client';

import { useState } from 'react';
import type { DesignSignalItem } from '@/types/categoryOpsV13Types';

const REC_CONFIG: Record<DesignSignalItem['designRecommendation'], { label: string; bg: string; text: string; border: string }> = {
    continue:       { label: '延续开发',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    small_batch:    { label: '小批量测试',     bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
    reduce:         { label: '减少开发',       bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    stop:           { label: '停止开发',       bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
    hero_visual:    { label: '主推视觉方向',   bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
};

const RISK_DOT: Record<DesignSignalItem['riskLevel'], string> = {
    healthy:     'bg-emerald-400',
    opportunity: 'bg-violet-400',
    warning:     'bg-amber-400',
    high:        'bg-rose-500',
    observe:     'bg-slate-400',
    none:        'bg-slate-200',
};

interface Props {
    data: DesignSignalItem[];
}

export default function CategoryDesignSignal({ data }: Props) {
    const [filter, setFilter] = useState<DesignSignalItem['designRecommendation'] | 'all'>('all');

    const filtered = filter === 'all' ? data : data.filter((d) => d.designRecommendation === filter);

    const recCounts = (['continue', 'hero_visual', 'small_batch', 'reduce', 'stop'] as const).map((key) => ({
        key,
        count: data.filter((d) => d.designRecommendation === key).length,
        ...REC_CONFIG[key],
    }));

    return (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">设计信号</h3>
                    <p className="mt-0.5 text-xs text-slate-400">鞋型 · 颜色 · 材质 · 功能卖点趋势 · 反哺设计方向决策</p>
                </div>
                {/* 汇总徽章 */}
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setFilter('all')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        全部 {data.length}
                    </button>
                    {recCounts.filter((r) => r.count > 0).map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setFilter(r.key)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === r.key ? `${r.bg} ${r.text} ${r.border}` : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            {r.label} {r.count}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {filtered.map((item) => {
                    const rec = REC_CONFIG[item.designRecommendation];
                    const riskDot = RISK_DOT[item.riskLevel];
                    const growthSign = item.salesGrowth >= 0 ? '+' : '';
                    return (
                        <div key={item.id} className={`rounded-xl border p-4 ${rec.border} ${rec.bg}`}>
                            {/* 头部 */}
                            <div className="mb-2 flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`inline-block h-2 w-2 rounded-full ${riskDot}`} />
                                        <span className="text-xs font-bold text-slate-900">{item.shoeType}</span>
                                    </div>
                                    <div className="mt-0.5 text-xs text-slate-500">{item.seriesName}</div>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${rec.border} ${rec.text}`}>
                                    {rec.label}
                                </span>
                            </div>

                            {/* 标签行 */}
                            <div className="mb-3 flex flex-wrap gap-1">
                                {[item.color, item.material, item.functionBenefit].map((tag) => (
                                    <span key={tag} className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-600 border border-white">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* 指标行 */}
                            <div className="mb-2 grid grid-cols-3 gap-1 text-center">
                                <div className={`rounded py-1 ${item.salesGrowth > 0.2 ? 'bg-emerald-100' : item.salesGrowth < 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                                    <div className={`text-xs font-bold ${item.salesGrowth > 0.2 ? 'text-emerald-700' : item.salesGrowth < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                                        {growthSign}{(item.salesGrowth * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-[9px] text-slate-400">销售增长</div>
                                </div>
                                <div className={`rounded py-1 ${item.sellThroughRate >= 0.7 ? 'bg-emerald-100' : item.sellThroughRate < 0.5 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                    <div className={`text-xs font-bold ${item.sellThroughRate >= 0.7 ? 'text-emerald-700' : item.sellThroughRate < 0.5 ? 'text-amber-700' : 'text-slate-600'}`}>
                                        {(item.sellThroughRate * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-[9px] text-slate-400">售罄率</div>
                                </div>
                                <div className={`rounded py-1 ${item.grossMargin >= 0.45 ? 'bg-emerald-100' : item.grossMargin < 0.38 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                                    <div className={`text-xs font-bold ${item.grossMargin >= 0.45 ? 'text-emerald-700' : item.grossMargin < 0.38 ? 'text-rose-700' : 'text-slate-600'}`}>
                                        {(item.grossMargin * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-[9px] text-slate-400">毛利率</div>
                                </div>
                            </div>

                            {/* 功能标签 */}
                            {item.funcTags && item.funcTags.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1">
                                    {item.funcTags.map((tag) => (
                                        <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-medium text-white">{tag}</span>
                                    ))}
                                </div>
                            )}

                            {/* 鞋类专业字段 */}
                            {(item.lastType || item.soleStructure || item.colorStory || item.wearingScene) && (
                                <div className="mb-2 rounded-lg border border-white/60 bg-white/50 p-2 space-y-1">
                                    {item.lastType && (
                                        <div className="flex gap-1.5 text-[10px]">
                                            <span className="shrink-0 text-slate-400 w-12">楦型</span>
                                            <span className="text-slate-700 leading-4">{item.lastType}</span>
                                        </div>
                                    )}
                                    {item.soleStructure && (
                                        <div className="flex gap-1.5 text-[10px]">
                                            <span className="shrink-0 text-slate-400 w-12">鞋底</span>
                                            <span className="text-slate-700 leading-4">{item.soleStructure}</span>
                                        </div>
                                    )}
                                    {item.colorStory && (
                                        <div className="flex gap-1.5 text-[10px]">
                                            <span className="shrink-0 text-slate-400 w-12">颜色故事</span>
                                            <span className="text-slate-700 leading-4">{item.colorStory}</span>
                                        </div>
                                    )}
                                    {item.wearingScene && (
                                        <div className="flex gap-1.5 text-[10px]">
                                            <span className="shrink-0 text-slate-400 w-12">场景</span>
                                            <span className="text-slate-700 leading-4">{item.wearingScene}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 竞品参考 */}
                            {item.competitorRef && (
                                <div className="mb-1.5 flex gap-1.5 text-[10px]">
                                    <span className="shrink-0 text-slate-400">竞品</span>
                                    <span className="text-slate-500 leading-4">{item.competitorRef}</span>
                                </div>
                            )}

                            {/* 设计建议 */}
                            {item.designAdvice && (
                                <div className="mb-1.5 rounded-md border border-amber-100 bg-amber-50/80 px-2 py-1 text-[10px] text-amber-700 leading-4">
                                    💡 {item.designAdvice}
                                </div>
                            )}

                            {/* 消费者反馈 */}
                            <p className="text-[10px] leading-relaxed text-slate-500 line-clamp-2">{item.consumerFeedback}</p>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                    当前筛选下暂无设计信号数据
                </div>
            )}
        </section>
    );
}
