'use client';

import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import { formatMoneyCny } from '@/config/numberFormat';
import { matchCategoryL1, matchCategoryL2 } from '@/config/categoryMapping';
import { matchesPriceBandFilter } from '@/config/priceBand';

type FactSales = {
    sku_id: string;
    channel_id: string;
    season_year: string;
    season: string;
    week_num: number;
    net_sales_amt: number;
};
type DimSku = {
    sku_id: string;
    category_id: string;
    category_name?: string;
    category_l2?: string;
    sku_name?: string;
    product_line?: string;
    price_band?: string;
    msrp: number;
    lifecycle?: string;
    target_audience?: string;
    target_age_group?: string;
    color?: string;
    color_family?: string;
};
type DimChannel = {
    channel_id: string;
    channel_type?: string;
    region?: string;
    city_tier?: string;
    store_format?: string;
};
type DimPlan = { season_year?: number; overall_plan?: { plan_total_sales?: number } };

type MonthRow = {
    month: number;
    label: string;
    actual: number;
    target: number | null;
    ly: number | null;
    achv: number | null;
    gap: number | null;
    yoyDiff: number | null;
    yoy: number | null;
    deviation: number | null;
};
type QuarterRow = {
    quarter: string;
    actual: number;
    prevQuarter: number | null;
    qoqDiff: number | null;
    qoqRate: number | null;
};
type ActionItem = { title: string; detail: string; jumpLabel?: string; onClick?: () => void };

interface Props {
    filters: DashboardFilters;
    compareMode: CompareMode;
    onJumpToPlanning?: () => void;
    onJumpToProduct?: () => void;
    onJumpToChannel?: () => void;
    onJumpToSkuRisk?: () => void;
}

const factSales = factSalesRaw as unknown as FactSales[];
const dimSku = dimSkuRaw as unknown as DimSku[];
const dimChannel = dimChannelRaw as unknown as DimChannel[];
const dimPlan = dimPlanRaw as unknown as DimPlan;

const SEASON_MONTH_START: Record<string, number> = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 };

const fmtAmt = (v: number | null | undefined) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '--';
    return formatMoneyCny(v);
};
const fmtPct = (v: number | null | undefined, digits = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(digits)}%`);
const divOrNull = (n: number, d: number | null | undefined) => (!d ? null : n / d);

function toMonth(record: FactSales): number | null {
    const start = SEASON_MONTH_START[record.season];
    if (!start) return null;
    const week = Math.max(1, Math.min(12, Number(record.week_num) || 1));
    return start + Math.floor((week - 1) / 4);
}
function matchAudience(sku: DimSku, selected: string | 'all') {
    return selected === 'all' || sku.target_audience === selected || sku.target_age_group === selected;
}
function matchColor(sku: DimSku, selected: string | 'all') {
    return selected === 'all' || sku.color === selected || sku.color_family === selected;
}
function top(rows: { label: string; value: number }[], dir: 'up' | 'down') {
    return [...rows]
        .sort((a, b) => (dir === 'up' ? b.value - a.value : a.value - b.value))
        .filter(r => (dir === 'up' ? r.value > 0 : r.value < 0))
        .slice(0, 3);
}
function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function StatCard({ title, value, tone = 'neutral' }: { title: string; value: string; tone?: 'neutral' | 'good' | 'warn' | 'danger' }) {
    const toneClass = tone === 'good'
        ? 'border-emerald-200 bg-emerald-50'
        : tone === 'warn'
            ? 'border-amber-200 bg-amber-50'
            : tone === 'danger'
                ? 'border-rose-200 bg-rose-50'
                : 'border-slate-200 bg-white';
    return (
        <div className={`rounded-xl border p-4 ${toneClass}`}>
            <div className="text-xs text-slate-500">{title}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
        </div>
    );
}

export default function MonthlyAchievementPanel({
    filters,
    compareMode,
    onJumpToPlanning,
    onJumpToProduct,
    onJumpToChannel,
    onJumpToSkuRisk,
}: Props) {
    const year = filters.season_year === 'all' ? 2024 : Number(filters.season_year);
    const skuMap = useMemo(() => Object.fromEntries(dimSku.map(s => [s.sku_id, s])), []);
    const channelMap = useMemo(() => Object.fromEntries(dimChannel.map(c => [c.channel_id, c])), []);

    const monthly = useMemo<MonthRow[]>(() => {
        const rows: MonthRow[] = Array.from({ length: 12 }, (_, idx) => ({
            month: idx + 1,
            label: `${idx + 1}月`,
            actual: 0,
            target: null,
            ly: null,
            achv: null,
            gap: null,
            yoyDiff: null,
            yoy: null,
            deviation: null,
        }));
        const current = new Map<number, number>();
        const ly = new Map<number, number>();
        const pass = (r: FactSales, y: number) => {
            if (String(r.season_year) !== String(y)) return false;
            const sku = skuMap[r.sku_id] as DimSku | undefined;
            const ch = channelMap[r.channel_id] as DimChannel | undefined;
            if (!sku || !ch) return false;
            if (!matchCategoryL1(filters.category_id, sku.category_name, sku.category_id, sku.sku_name, sku.category_l2, sku.product_line)) return false;
            if (!matchCategoryL2(filters.sub_category, sku.category_name, sku.category_id, sku.sku_name, sku.category_l2, sku.product_line)) return false;
            if (filters.channel_type !== 'all' && ch.channel_type !== filters.channel_type) return false;
            if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;
            if (filters.region !== 'all' && ch.region !== filters.region) return false;
            if (filters.city_tier !== 'all' && ch.city_tier !== filters.city_tier) return false;
            if (filters.store_format !== 'all' && ch.store_format !== filters.store_format) return false;
            if (!matchAudience(sku, filters.target_audience)) return false;
            if (!matchColor(sku, filters.color)) return false;
        if (!matchesPriceBandFilter(sku.msrp, filters.price_band, sku.price_band)) return false;
            return true;
        };
        factSales.forEach(r => {
            const month = toMonth(r);
            if (!month) return;
            if (pass(r, year)) current.set(month, (current.get(month) ?? 0) + r.net_sales_amt);
            if (pass(r, year - 1)) ly.set(month, (ly.get(month) ?? 0) + r.net_sales_amt);
        });
        rows.forEach(r => {
            r.actual = current.get(r.month) ?? 0;
            r.ly = ly.has(r.month) ? (ly.get(r.month) ?? 0) : null;
        });
        const planTotal = dimPlan.season_year === year && dimPlan.overall_plan?.plan_total_sales ? Number(dimPlan.overall_plan.plan_total_sales) : null;
        if (planTotal && planTotal > 0) {
            const totalActual = rows.reduce((s, r) => s + r.actual, 0);
            rows.forEach(r => { r.target = totalActual > 0 ? (planTotal * r.actual) / totalActual : planTotal / 12; });
        }
        const avg = rows.reduce((s, r) => s + r.actual, 0) / 12;
        rows.forEach(r => {
            r.achv = divOrNull(r.actual, r.target);
            r.gap = r.target === null ? null : r.actual - r.target;
            r.yoyDiff = r.ly === null ? null : r.actual - r.ly;
            r.yoy = divOrNull(r.yoyDiff ?? 0, r.ly);
            r.deviation = r.actual - avg;
        });
        return rows;
    }, [channelMap, filters, skuMap, year]);

    const quarterRows = useMemo<QuarterRow[]>(() => {
        const qs = [['Q1', [1, 2, 3]], ['Q2', [4, 5, 6]], ['Q3', [7, 8, 9]], ['Q4', [10, 11, 12]]] as const;
        const rows: QuarterRow[] = qs.map(([q, m]) => ({
            quarter: q,
            actual: monthly.filter(x => (m as readonly number[]).includes(x.month)).reduce((s, x) => s + x.actual, 0),
            prevQuarter: null,
            qoqDiff: null,
            qoqRate: null,
        }));
        return rows.map((row, i) => {
            if (i === 0) return row;
            const prev = rows[i - 1].actual;
            return { ...row, prevQuarter: prev, qoqDiff: row.actual - prev, qoqRate: divOrNull(row.actual - prev, prev) };
        });
    }, [monthly]);

    const totals = useMemo(() => {
        const actual = monthly.reduce((s, r) => s + r.actual, 0);
        const target = monthly.some(r => r.target !== null) ? monthly.reduce((s, r) => s + (r.target ?? 0), 0) : null;
        const ly = monthly.some(r => r.ly !== null) ? monthly.reduce((s, r) => s + (r.ly ?? 0), 0) : null;
        const yoyDiff = ly === null ? null : actual - ly;
        const growthMonths = monthly.filter(m => (m.yoyDiff ?? 0) > 0).length;
        const dragMonths = monthly.filter(m => (m.yoyDiff ?? 0) < 0).length;
        const latestQ = [...quarterRows].reverse().find(q => q.actual > 0) ?? quarterRows[quarterRows.length - 1];
        return {
            actual,
            target,
            ly,
            achv: divOrNull(actual, target),
            gap: target === null ? null : actual - target,
            yoyDiff,
            yoy: divOrNull(yoyDiff ?? 0, ly),
            growthMonths,
            dragMonths,
            latestQ,
            prevQ: latestQ?.prevQuarter ?? null,
            qoqDiff: latestQ?.qoqDiff ?? null,
            qoqRate: latestQ?.qoqRate ?? null,
        };
    }, [monthly, quarterRows]);

    const diffRows = useMemo(() => {
        if (compareMode === 'plan') return monthly.map(m => ({ label: m.label, value: m.gap ?? 0 }));
        if (compareMode === 'yoy') return monthly.map(m => ({ label: m.label, value: m.yoyDiff ?? 0 }));
        if (compareMode === 'mom') return quarterRows.map(q => ({ label: q.quarter, value: q.qoqDiff ?? 0 }));
        return monthly.map(m => ({ label: m.label, value: m.deviation ?? 0 }));
    }, [compareMode, monthly, quarterRows]);
    const topUp = useMemo(() => top(diffRows, 'up'), [diffRows]);
    const topDown = useMemo(() => top(diffRows, 'down'), [diffRows]);
    const maxMonth = useMemo(() => monthly.reduce((a, b) => (b.actual > a.actual ? b : a), monthly[0]), [monthly]);
    const minMonth = useMemo(() => monthly.reduce((a, b) => (b.actual < a.actual ? b : a), monthly[0]), [monthly]);

    const insights = useMemo(() => {
        const line1 = compareMode === 'plan'
            ? `年度累计销售 ${fmtAmt(totals.actual)}，达成率 ${fmtPct(totals.achv)}，缺口 ${fmtAmt(totals.gap)}。`
            : compareMode === 'yoy'
                ? `年度累计销售 ${fmtAmt(totals.actual)}，同比 ${fmtPct(totals.yoy)}，同比差额 ${fmtAmt(totals.yoyDiff)}。`
                : compareMode === 'mom'
                    ? `${totals.latestQ?.quarter ?? 'Q4'} 销售 ${fmtAmt(totals.latestQ?.actual ?? 0)}，较上季 ${fmtPct(totals.qoqRate)}。`
                    : `年度累计销售 ${fmtAmt(totals.actual)}，月均 ${fmtAmt(totals.actual / 12)}，峰值月 ${maxMonth.label}。`;
        const line2 = topDown.length
            ? `拖累Top月份：${topDown.map(x => `${x.label}(${fmtAmt(x.value)})`).join('、')}。`
            : '拖累Top月份：当前口径未出现明显负贡献月份。';
        const line3 = topUp.length
            ? `拉升Top月份：${topUp.map(x => `${x.label}(+${fmtAmt(x.value)})`).join('、')}。`
            : '拉升Top月份：当前口径未出现明显正贡献月份。';
        return [line1, line2, line3];
    }, [compareMode, maxMonth.label, topDown, topUp, totals]);

    const actions = useMemo<ActionItem[]>(() => {
        if (compareMode === 'plan' && (totals.gap ?? 0) < 0) {
            return [
                { title: '渠道补缺口', detail: '优先修复低效率渠道转化与店态效率。', jumpLabel: '去区域&门店', onClick: onJumpToChannel },
                { title: '商品结构修正', detail: '聚焦主推系列与核心价带，压缩低转化组合。', jumpLabel: '去消费者&产品要素', onClick: onJumpToProduct },
                { title: '库存动作包', detail: '对低售罄SKU执行调拨/下架/清仓，降低期末挤压。', jumpLabel: '去SKU风险清单', onClick: onJumpToSkuRisk },
                { title: '波段节奏校正', detail: '检查上市节奏与月销错配，微调补单窗口。', jumpLabel: '去波段&企划', onClick: onJumpToPlanning },
            ];
        }
        if (compareMode === 'yoy' && (totals.yoyDiff ?? 0) < 0) {
            return [
                { title: '止跌渠道修复', detail: '优先处理同比下滑区域与渠道组合。', jumpLabel: '去区域&门店', onClick: onJumpToChannel },
                { title: '价格带回正', detail: '回收高库存低动销价带，防止毛利继续受损。', jumpLabel: '去消费者&产品要素', onClick: onJumpToProduct },
                { title: '波段错配排查', detail: '复盘上市节奏与当月需求偏差，及时纠偏。', jumpLabel: '去波段&企划', onClick: onJumpToPlanning },
                { title: '风险SKU止损', detail: '对高库存且同比下滑SKU执行强制动作。', jumpLabel: '去SKU风险清单', onClick: onJumpToSkuRisk },
            ];
        }
        if (compareMode === 'mom' && (totals.qoqDiff ?? 0) < 0) {
            return [
                { title: '季度节奏纠偏', detail: '针对本季低于上季的品类提升波段资源倾斜。', jumpLabel: '去波段&企划', onClick: onJumpToPlanning },
                { title: '渠道强弱切换', detail: '收缩低产出店态，向高转化渠道补货。', jumpLabel: '去区域&门店', onClick: onJumpToChannel },
                { title: '风险款复盘', detail: '按季度差额回查SKU并形成下季修正清单。', jumpLabel: '去SKU风险清单', onClick: onJumpToSkuRisk },
            ];
        }
        return [
            { title: '保持主力月节奏', detail: '维持主力月份供给深度，避免断码。', jumpLabel: '去区域&门店', onClick: onJumpToChannel },
            { title: '提前校准下季结构', detail: '用当月结构结果反推下季配比。', jumpLabel: '去波段&企划', onClick: onJumpToPlanning },
            { title: '持续压降长尾风险', detail: '对低效率SKU小步快跑去化。', jumpLabel: '去SKU风险清单', onClick: onJumpToSkuRisk },
        ];
    }, [compareMode, onJumpToChannel, onJumpToPlanning, onJumpToProduct, onJumpToSkuRisk, totals.gap, totals.qoqDiff, totals.yoyDiff]);

    const diffTitle = compareMode === 'plan'
        ? '差额分解（Actual - Target）'
        : compareMode === 'yoy'
            ? '同比差额分解（Actual - LY）'
            : compareMode === 'mom'
                ? '季度差额分解（本季 - 上季）'
                : '月度偏离分解（Actual - 月均）';
    const diffValueLabel = compareMode === 'plan'
        ? '计划差额（实际 - 计划）'
        : compareMode === 'yoy'
            ? '同比差额（实际 - 去年同期）'
            : compareMode === 'mom'
                ? '季度差额（本季 - 上季）'
                : '偏离值（当月实际 - 月均）';

    return (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs tracking-wide text-slate-500 uppercase">Monthly Achievement</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">月度业绩达成</h2>
                    <p className="text-sm text-slate-500 mt-1">Overview → Charts → Insights → Actions</p>
                </div>
                <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                    口径：仅受年度/月份影响
                </div>
            </div>

            {filters.wave !== 'all' && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    当前已选波段 <strong>{filters.wave}</strong>，本模块按月统计，不受波段筛选影响。
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
                <StatCard title="年度实际" value={fmtAmt(totals.actual)} />
                {compareMode === 'plan' ? (
                    <>
                        <StatCard title="年度目标" value={fmtAmt(totals.target)} />
                        <StatCard title="达成率" value={fmtPct(totals.achv)} tone={(totals.achv ?? 0) >= 1 ? 'good' : 'warn'} />
                        <StatCard title="缺口" value={fmtAmt(totals.gap)} tone={(totals.gap ?? 0) >= 0 ? 'good' : 'danger'} />
                        <StatCard title="增长月/拖累月" value={`${totals.growthMonths}/${totals.dragMonths}`} />
                    </>
                ) : compareMode === 'yoy' ? (
                    <>
                        <StatCard title="去年同期" value={fmtAmt(totals.ly)} />
                        <StatCard title="同比" value={fmtPct(totals.yoy)} tone={(totals.yoy ?? 0) >= 0 ? 'good' : 'danger'} />
                        <StatCard title="同比差额" value={fmtAmt(totals.yoyDiff)} tone={(totals.yoyDiff ?? 0) >= 0 ? 'good' : 'danger'} />
                        <StatCard title="增长月/拖累月" value={`${totals.growthMonths}/${totals.dragMonths}`} />
                    </>
                ) : compareMode === 'mom' ? (
                    <>
                        <StatCard title="本季实际" value={fmtAmt(totals.latestQ?.actual ?? null)} />
                        <StatCard title="上季实际" value={fmtAmt(totals.prevQ)} />
                        <StatCard title="环比上季" value={fmtPct(totals.qoqRate)} tone={(totals.qoqRate ?? 0) >= 0 ? 'good' : 'danger'} />
                        <StatCard title="季度差额" value={fmtAmt(totals.qoqDiff)} tone={(totals.qoqDiff ?? 0) >= 0 ? 'good' : 'danger'} />
                    </>
                ) : (
                    <>
                        <StatCard title="月均销售" value={fmtAmt(totals.actual / 12)} />
                        <StatCard title="最高月" value={`${maxMonth.label} · ${fmtAmt(maxMonth.actual)}`} tone="good" />
                        <StatCard title="最低月" value={`${minMonth.label} · ${fmtAmt(minMonth.actual)}`} tone="warn" />
                        <StatCard title="增长月/拖累月" value={`${totals.growthMonths}/${totals.dragMonths}`} />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
                <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-900 mb-3">{compareMode === 'mom' ? '季度趋势（Q1-Q4）' : '月度趋势（Actual）'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        {compareMode === 'mom' ? (
                            <ComposedChart data={quarterRows} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="quarter" />
                                <YAxis tickFormatter={v => `${Math.round(Number(v) / 10000)}万`} />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload || payload.length === 0) return null;
                                        const actualItem = payload.find(item => String(item.dataKey) === 'actual') ?? payload[0];
                                        const value = Number(actualItem?.value ?? 0);
                                        return (
                                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                                <div className="text-sm font-semibold text-slate-900">{label}</div>
                                                <div className="text-sm text-slate-700 mt-1">季度实际：{fmtAmt(value)}</div>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar dataKey="actual" name="季度实际" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                <Line type="monotone" dataKey="actual" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        ) : (
                            <ComposedChart data={monthly} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" />
                                <YAxis tickFormatter={v => `${Math.round(Number(v) / 10000)}万`} />
                                <Tooltip
                                    formatter={(raw, name) => {
                                        const n = Number(raw ?? 0);
                                        const rawName = String(name ?? '');
                                        const label = rawName === 'target' || rawName === '计划'
                                            ? '计划'
                                            : rawName === 'ly' || rawName === '去年同期'
                                                ? '去年同期'
                                                : '当月实际';
                                        return [fmtAmt(n), label];
                                    }}
                                />
                                {compareMode === 'plan' && monthly.some(m => m.target !== null) && <Bar dataKey="target" name="计划" fill="#cbd5e1" radius={[6, 6, 0, 0]} />}
                                {compareMode === 'yoy' && monthly.some(m => m.ly !== null) && <Line type="monotone" dataKey="ly" name="去年同期" stroke="#94a3b8" strokeWidth={2} dot={false} />}
                                <Line type="monotone" dataKey="actual" name="实际" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3 }} />
                                <ReferenceDot x={maxMonth.label} y={maxMonth.actual} r={5} fill="#10b981" stroke="none" />
                                <ReferenceDot x={minMonth.label} y={minMonth.actual} r={5} fill="#ef4444" stroke="none" />
                            </ComposedChart>
                        )}
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-900 mb-3">{diffTitle}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={diffRows} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" />
                            <YAxis tickFormatter={v => `${Math.round(Number(v) / 10000)}万`} />
                            <Tooltip formatter={(raw) => {
                                const n = Number(raw ?? 0);
                                return [`${n >= 0 ? '+' : ''}${fmtAmt(n)}`, diffValueLabel];
                            }} />
                            <Bar dataKey="value" name={diffValueLabel} radius={[6, 6, 0, 0]}>
                                {diffRows.map((item, idx) => <Cell key={`${item.label}-${idx}`} fill={item.value >= 0 ? '#10b981' : '#ef4444'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                            <div className="text-xs font-semibold text-emerald-800 mb-1">Top3 正贡献</div>
                            {topUp.length ? topUp.map(item => <div key={`up-${item.label}`} className="text-sm text-emerald-900">{item.label}: +{fmtAmt(item.value)}</div>) : <div className="text-sm text-emerald-900">暂无明显正贡献</div>}
                        </div>
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                            <div className="text-xs font-semibold text-rose-800 mb-1">Top3 负贡献</div>
                            {topDown.length ? topDown.map(item => <div key={`down-${item.label}`} className="text-sm text-rose-900">{item.label}: {fmtAmt(item.value)}</div>) : <div className="text-sm text-rose-900">暂无明显负贡献</div>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
                <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-900 mb-3">自动结论 Insights（固定3条）</h3>
                    <div className="space-y-2">
                        {insights.map((x, i) => <div key={`ins-${i}`} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">{i + 1}. {x}</div>)}
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold text-slate-900 mb-3">可执行方案 Actions（固定3-5条）</h3>
                    <div className="space-y-2">
                        {actions.map((a, i) => (
                            <div key={`act-${i}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <div className="text-sm font-semibold text-slate-900">{i + 1}. {a.title}</div>
                                <div className="text-sm text-slate-600 mt-1">{a.detail}</div>
                                {a.jumpLabel && a.onClick && <button onClick={a.onClick} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2">{a.jumpLabel}</button>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-700 flex items-center justify-between">
                    明细验证与导出（折叠）
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            exportCsv(
                                `monthly-achievement-${year}.csv`,
                                ['月份', '实际', '目标', '达成率', '去年同期', '同比差额', '同比'],
                                monthly.map(r => [
                                    r.month,
                                    Math.round(r.actual),
                                    r.target === null ? '—' : Math.round(r.target),
                                    r.achv === null ? '—' : `${(r.achv * 100).toFixed(1)}%`,
                                    r.ly === null ? '—' : Math.round(r.ly),
                                    r.yoyDiff === null ? '—' : Math.round(r.yoyDiff),
                                    r.yoy === null ? '—' : `${(r.yoy * 100).toFixed(1)}%`,
                                ]),
                            );
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded border border-slate-300 bg-white"
                    >
                        导出 CSV
                    </button>
                </summary>
                <div className="px-4 pb-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-200">
                                <th className="py-2 pr-4">月份</th>
                                <th className="py-2 pr-4">实际</th>
                                <th className="py-2 pr-4">目标</th>
                                <th className="py-2 pr-4">达成率</th>
                                <th className="py-2 pr-4">去年同期</th>
                                <th className="py-2 pr-4">同比差额</th>
                                <th className="py-2 pr-4">同比</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthly.map(r => (
                                <tr key={`row-${r.month}`} className="border-b border-slate-100 text-slate-700">
                                    <td className="py-2 pr-4">{r.label}</td>
                                    <td className="py-2 pr-4">{fmtAmt(r.actual)}</td>
                                    <td className="py-2 pr-4">{fmtAmt(r.target)}</td>
                                    <td className="py-2 pr-4">{fmtPct(r.achv)}</td>
                                    <td className="py-2 pr-4">{fmtAmt(r.ly)}</td>
                                    <td className="py-2 pr-4">{fmtAmt(r.yoyDiff)}</td>
                                    <td className="py-2 pr-4">{fmtPct(r.yoy)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </section>
    );
}
