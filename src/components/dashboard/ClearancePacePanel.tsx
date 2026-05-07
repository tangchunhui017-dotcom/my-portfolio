'use client';

import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    useClearancePace,
    type ClearanceKpiCard,
    type ClearanceRiskRow,
} from '@/hooks/useClearancePace';

type Props = {
    filters: DashboardFilters;
    onJumpToSkuRisk?: () => void;
};

const cardToneStyle: Record<ClearanceKpiCard['tone'], string> = {
    good: 'border-emerald-100 bg-emerald-50/80 text-emerald-900',
    warn: 'border-amber-100 bg-amber-50/80 text-amber-900',
    risk: 'border-rose-100 bg-rose-50/80 text-rose-900',
};

const actionStyle: Record<ClearanceRiskRow['actionType'], string> = {
    整款清退: 'bg-rose-50 text-rose-700 ring-rose-100',
    边缘码清退: 'bg-amber-50 text-amber-700 ring-amber-100',
    降折观察: 'bg-orange-50 text-orange-700 ring-orange-100',
    渠道调拨: 'bg-sky-50 text-sky-700 ring-sky-100',
    补码优先: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

function fmtPct(value: number, digits = 0) {
    return `${(value * 100).toFixed(digits)}%`;
}

function fmtMoneyWan(value: number) {
    return `¥${(value / 10000).toFixed(1)}万`;
}

function fmtUnits(value: number) {
    return Math.round(value).toLocaleString('zh-CN');
}

function PriorityBadge({ priority }: { priority: ClearanceRiskRow['priority'] }) {
    const style = priority === 'P0'
        ? 'bg-rose-500 text-white'
        : priority === 'P1'
            ? 'bg-amber-400 text-amber-950'
            : 'bg-slate-100 text-slate-500';
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${style}`}>{priority}</span>;
}

function KpiCard({ card }: { card: ClearanceKpiCard }) {
    return (
        <div className={`rounded-2xl border px-4 py-3 ${cardToneStyle[card.tone]}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{card.label}</div>
            <div className="mt-2 text-[24px] font-black leading-none tracking-tight">{card.value}</div>
            <div className="mt-2 text-[11px] font-medium leading-5 opacity-65">{card.detail}</div>
        </div>
    );
}

export default function ClearancePacePanel({ filters, onJumpToSkuRisk }: Props) {
    const { summary, isLoading } = useClearancePace(filters);

    if (isLoading && !summary) {
        return (
            <section className="rounded-section border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                <div className="animate-pulse space-y-4">
                    <div className="h-5 w-44 rounded bg-slate-100" />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-24 rounded-2xl bg-slate-100" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (!summary) {
        return (
            <section className="rounded-section border border-dashed border-slate-200 bg-white/90 p-5 text-sm text-slate-500">
                当前筛选条件下暂无可用于清货诊断的数据。
            </section>
        );
    }

    const visibleRiskRows = summary.riskRows.slice(0, 4);
    const visibleActionMix = summary.actionMix.slice(0, 4);

    return (
        <section className="overflow-hidden rounded-section border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Clearance Pace</div>
                    <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900">清货节奏诊断</h2>
                    <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-500">
                        区分整款清退、边缘码清退、降折观察和补码优先，避免把缺核心码的好款误判为清货款。
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onJumpToSkuRisk}
                    className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                >
                    查看 SKU 明细
                </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summary.kpiCards.map((card) => (
                    <KpiCard key={card.id} card={card} />
                ))}
            </div>

            <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm font-medium leading-6 text-slate-700">
                <span className="font-bold text-slate-900">判断：</span>{summary.conclusion}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-800">应清未清 Top SKU</h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                            展示 Top {visibleRiskRows.length} · {summary.clearanceSkuCount} 款应清
                        </span>
                    </div>

                    <div className="mt-3 space-y-2.5">
                        {visibleRiskRows.length ? visibleRiskRows.map((row) => (
                            <button
                                type="button"
                                key={`${row.skuId}-${row.actionType}`}
                                onClick={onJumpToSkuRisk}
                                className="w-full rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left transition hover:border-orange-100 hover:bg-orange-50/40"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <PriorityBadge priority={row.priority} />
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${actionStyle[row.actionType]}`}>
                                        {row.actionType}
                                    </span>
                                    <span className="truncate text-sm font-bold text-slate-900">{row.skuName}</span>
                                    <span className="text-[11px] font-medium text-slate-400">{row.category} · {row.lifecycle}</span>
                                </div>
                                <div className="mt-2 grid gap-2 text-[11px] font-medium text-slate-500 sm:grid-cols-5">
                                    <span>库存 {fmtUnits(row.onHandUnits)} 双</span>
                                    <span>金额 {fmtMoneyWan(row.inventoryAmount)}</span>
                                    <span>ST {fmtPct(row.sellThrough)}</span>
                                    <span>折扣 {fmtPct(row.discountRate)}</span>
                                    <span>WOS {row.wos.toFixed(1)}</span>
                                </div>
                                <div className="mt-2 text-xs leading-5 text-slate-600">{row.reason}</div>
                                <div className="mt-1 text-xs font-semibold leading-5 text-slate-800">{row.action}</div>
                            </button>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                                当前暂无明显应清未清 SKU。
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-800">动作结构</h3>
                        <div className="mt-3 space-y-2">
                            {visibleActionMix.map((item) => (
                                <div key={item.type} className="rounded-xl bg-slate-50 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${actionStyle[item.type]}`}>
                                            {item.type}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-500">{item.count} 款</span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-400">涉及库存 {fmtUnits(item.units)} 双</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-800">清货判断口径</h3>
                        <div className="mt-3 space-y-2 text-[11px] leading-5 text-slate-500">
                            <p>整款清退：老品、低售罄、高 WOS，且折扣后仍去化偏慢。</p>
                            <p>边缘码清退：库存主要卡在小码/大码，核心码不应被同步甩货。</p>
                            <p>补码优先：核心码断码但整款动销仍可，不进入清货池。</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
