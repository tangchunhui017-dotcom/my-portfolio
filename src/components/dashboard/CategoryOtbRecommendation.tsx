'use client';

import type { CategoryOtbRecommendation } from '@/types/categoryOpsV13Types';

const RISK_CONFIG = {
    healthy:     { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: '健康' },
    opportunity: { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700',  label: '机会' },
    warning:     { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',   label: '预警' },
    high:        { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700',     label: '高风险' },
    observe:     { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-600',   label: '观察' },
    none:        { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-400',   label: '—' },
};

function fmtAmount(v: number) {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : v > 0 ? '+' : '';
    if (abs >= 100_000_000) return `${sign}¥${(abs / 100_000_000).toFixed(2)}亿`;
    if (abs >= 10_000) return `${sign}¥${(abs / 10_000).toFixed(1)}万`;
    return `${sign}¥${Math.round(abs).toLocaleString('zh-CN')}`;
}

interface Props {
    data: CategoryOtbRecommendation[];
    onJumpToOtb?: (category: string) => void;
}

export default function CategoryOtbRecommendation({ data, onJumpToOtb }: Props) {
    const totalAdjustment = data.reduce((sum, r) => sum + r.adjustment, 0);
    const increaseCount = data.filter((r) => r.adjustment > 0).length;
    const decreaseCount = data.filter((r) => r.adjustment < 0).length;

    return (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">品类 OTB 建议</h3>
                    <p className="mt-0.5 text-xs text-slate-400">基于售罄率、库存风险和增长趋势推算的品类采购预算调整建议</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 font-medium">
                        ↑ 加码 {increaseCount} 个品类
                    </span>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700 font-medium">
                        ↓ 削减 {decreaseCount} 个品类
                    </span>
                    <span className={`rounded-full px-3 py-1 font-semibold ${totalAdjustment >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        净调整 {fmtAmount(totalAdjustment)}
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {data.map((item) => {
                    const rc = RISK_CONFIG[item.riskLevel] ?? RISK_CONFIG.none;
                    const isIncrease = item.adjustment > 0;
                    const adjColor = isIncrease ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold';

                    return (
                        <div key={item.category} className={`rounded-xl border p-4 ${rc.border} ${rc.bg}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                {/* 左侧：品类 + 原因 + 建议动作 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-slate-900">{item.category}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rc.badge}`}>{rc.label}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isIncrease ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {item.recommendedAction}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{item.adjustmentReason}</p>
                                </div>

                                {/* 右侧：金额对比 */}
                                <div className="shrink-0 text-right">
                                    <div className="text-xs text-slate-400 mb-0.5">当前 → 建议</div>
                                    <div className="text-xs text-slate-600">
                                        {fmtAmount(item.currentOtb)} → {fmtAmount(item.recommendedOtb)}
                                    </div>
                                    <div className={`text-sm ${adjColor}`}>{fmtAmount(item.adjustment)}</div>
                                </div>
                            </div>

                            {/* 影响摘要行 */}
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[
                                    { label: '销售影响', value: item.expectedSalesImpact },
                                    { label: '毛利影响', value: item.expectedMarginImpact },
                                    { label: '库存影响', value: item.expectedInventoryImpact },
                                    { label: '现金影响', value: item.expectedCashImpact },
                                ].map(({ label, value }) => (
                                    <div key={label} className="rounded-lg bg-white/70 px-2 py-1.5 text-center border border-white">
                                        <div className={`text-xs font-semibold ${value > 0 ? 'text-emerald-700' : value < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                                            {fmtAmount(value)}
                                        </div>
                                        <div className="text-[9px] text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* 跳转 OTB */}
                            {onJumpToOtb && (
                                <div className="mt-2 text-right">
                                    <button
                                        onClick={() => onJumpToOtb(item.category)}
                                        className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2"
                                    >
                                        前往 OTB 预算 →
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {data.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                    暂无品类 OTB 建议数据
                </div>
            )}
        </section>
    );
}
