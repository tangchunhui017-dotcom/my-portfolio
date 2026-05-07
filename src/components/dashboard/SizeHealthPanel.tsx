'use client';

import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    useSizeHealthAnalysis,
    type SizeHealthCard,
    type SizeHealthSkuRiskRow,
} from '@/hooks/useSizeHealthAnalysis';

type Props = {
    filters: DashboardFilters;
    onJumpToSkuRisk?: () => void;
};

const cardToneStyle: Record<SizeHealthCard['tone'], string> = {
    good: 'border-emerald-100 bg-emerald-50/80 text-emerald-900',
    warn: 'border-amber-100 bg-amber-50/80 text-amber-900',
    risk: 'border-rose-100 bg-rose-50/80 text-rose-900',
};

const riskBadgeStyle: Record<string, string> = {
    核心尺码断码: 'bg-rose-50 text-rose-700 ring-rose-100',
    边缘码积压: 'bg-amber-50 text-amber-700 ring-amber-100',
    核心尺码贡献弱: 'bg-sky-50 text-sky-700 ring-sky-100',
    尺码健康: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

function fmtPct(value: number, digits = 0) {
    return `${(value * 100).toFixed(digits)}%`;
}

function fmtNum(value: number) {
    return Math.round(value).toLocaleString('zh-CN');
}

function HealthCard({ card }: { card: SizeHealthCard }) {
    return (
        <div className={`rounded-2xl border px-4 py-3 ${cardToneStyle[card.tone]}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{card.label}</div>
            <div className="mt-2 text-[24px] font-black leading-none tracking-tight">{card.value}</div>
            <div className="mt-2 text-[11px] font-medium leading-5 opacity-65">{card.detail}</div>
        </div>
    );
}

function PriorityBadge({ priority }: { priority: SizeHealthSkuRiskRow['priority'] }) {
    const style = priority === 'P0'
        ? 'bg-rose-500 text-white'
        : priority === 'P1'
            ? 'bg-amber-400 text-amber-950'
            : 'bg-slate-100 text-slate-500';
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${style}`}>{priority}</span>;
}

export default function SizeHealthPanel({ filters, onJumpToSkuRisk }: Props) {
    const { summary, isLoading } = useSizeHealthAnalysis(filters);

    if (isLoading && !summary) {
        return (
            <section className="mb-6 rounded-section border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                <div className="animate-pulse space-y-4">
                    <div className="h-5 w-40 rounded bg-slate-100" />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-24 rounded-2xl bg-slate-100" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (!summary || summary.skuCount === 0) {
        return (
            <section className="mb-6 rounded-section border border-dashed border-slate-200 bg-white/90 p-5 text-sm text-slate-500">
                当前筛选条件下暂无尺码销售库存数据。
            </section>
        );
    }

    const visibleRiskRows = summary.riskRows.slice(0, 3);
    const visibleCategoryRisks = summary.categoryRisks.slice(0, 3);
    const visibleSizeGaps = summary.sizeGaps.slice(0, 4);

    return (
        <section className="mb-6 overflow-hidden rounded-section border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Size Health</div>
                    <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900">SKU 深度与断码诊断</h2>
                    <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-500">
                        用尺码层销售和最新库存判断：核心尺码是否断、边缘码是否压、哪些 SKU 需要补码或调拨。
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onJumpToSkuRisk}
                    className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                    查看 SKU 风险
                </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summary.healthCards.map((card) => (
                    <HealthCard key={card.id} card={card} />
                ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium leading-6 text-slate-600">
                <span className="font-bold text-slate-900">判断：</span>{summary.conclusion}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">高风险 SKU</h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                            展示 Top {visibleRiskRows.length} · {summary.stockoutSkuCount} 款断码
                        </span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                        {visibleRiskRows.length ? visibleRiskRows.map((row) => (
                            <button
                                type="button"
                                key={row.skuId}
                                onClick={onJumpToSkuRisk}
                                className="w-full rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left transition hover:border-rose-100 hover:bg-rose-50/40"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <PriorityBadge priority={row.priority} />
                                    <span className="truncate text-sm font-bold text-slate-900">{row.skuName}</span>
                                    <span className="text-[11px] font-medium text-slate-400">{row.category} · {row.priceBand}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {row.riskLabels.map((label) => (
                                        <span
                                            key={label}
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${riskBadgeStyle[label] || 'bg-slate-50 text-slate-500 ring-slate-100'}`}
                                        >
                                            {label}
                                        </span>
                                    ))}
                                    {row.stockoutSizes.length > 0 && (
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-inset ring-rose-100">
                                            缺码 {row.stockoutSizes.slice(0, 4).join('/')}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 grid gap-2 text-[11px] font-medium text-slate-500 sm:grid-cols-4">
                                    <span>齐码 {fmtPct(row.fullSizeRate)}</span>
                                    <span>断码 {fmtPct(row.stockoutRate)}</span>
                                    <span>边缘库存 {fmtPct(row.edgeStockShare)}</span>
                                    <span>库存 {fmtNum(row.onHandUnits)} 双</span>
                                </div>
                                <div className="mt-2 text-xs leading-5 text-slate-600">{row.action}</div>
                            </button>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                                当前没有高风险尺码 SKU。
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-800">品类尺码风险</h3>
                        <div className="mt-3 space-y-2">
                            {visibleCategoryRisks.map((row) => (
                                <div key={row.category} className="rounded-xl bg-slate-50 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="truncate text-xs font-bold text-slate-700">{row.category}</span>
                                        <span className="text-[11px] font-semibold text-rose-500">{row.stockoutSkuCount} 款断码</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                                        <span>齐码 {fmtPct(row.avgFullSizeRate)}</span>
                                        <span>断码 {fmtPct(row.avgStockoutRate)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-800">高缺口尺码</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {visibleSizeGaps.map((row) => (
                                <div key={row.sizeCode} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-100">
                                    {row.sizeLabel} · 断码 {fmtPct(row.stockoutRate)}
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-[11px] leading-5 text-slate-400">
                            库存口径使用当前筛选期内最新周快照，销量贡献使用筛选期累计。
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
