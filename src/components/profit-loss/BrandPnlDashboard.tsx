'use client';
/**
 * src/components/profit-loss/BrandPnlDashboard.tsx  V9
 * S1 锚点导航（高亮+导出+对比模式）
 * S2 年度利润总览（3排KPI含鞋类专属）
 * S3 预算偏差归因卡（新增）
 * S4 P&L利润桥（含钻取+LY叠加）
 * S5 月度趋势（前移+季节带+大促节点）
 * S6 渠道贡献诊断（含单店模型联动按钮）
 * S7 品类贡献诊断（含产品角色/库存周转/新品占比/尺码完整率+排序）
 * S8 折扣与清货侵蚀（含LY对比）
 * S9 现金流时点视图（新增）
 */
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { formatMoneyCny } from '@/config/numberFormat';
import brandAnnualRaw from '../../../data/planning/pnl_brand_annual.json';
import channelRaw from '../../../data/planning/pnl_channel_contribution.json';
import categoryRaw from '../../../data/planning/pnl_category_contribution.json';
import discountRaw from '../../../data/planning/pnl_discount_erosion.json';
import cashflowRaw from '../../../data/planning/pnl_cashflow_schedule.json';
import categoryRoleRaw from '../../../data/planning/pnl_category_role.json';
import BudgetVarianceWaterfall from './BudgetVarianceWaterfall';
import CashflowGapChart from './CashflowGapChart';
import FootwearKpiRow from './FootwearKpiRow';
import DimensionDrillDown from './DimensionDrillDown';
import CompareModeSwitcher from './CompareModeSwitcher';
import type { CompareMode } from './CompareModeSwitcher';

const brand = brandAnnualRaw as typeof brandAnnualRaw;
const channels = channelRaw as typeof channelRaw;
const categories = categoryRaw as typeof categoryRaw;
const discounts = discountRaw as typeof discountRaw;
const categoryRoles = categoryRoleRaw as typeof categoryRoleRaw;

type ECharts = { setOption: (o: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => ECharts };

function useChart(ref: React.RefObject<HTMLDivElement | null>, buildOption: () => unknown, deps: unknown[]) {
    useEffect(() => {
        if (!ref.current) return;
        let chart: ECharts | null = null;
        const initChart = async () => {
            const ec = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = ec.init(ref.current);
            chart.setOption(buildOption() as object);
        };
        initChart();
        const obs = new ResizeObserver(() => chart?.resize());
        if (ref.current) obs.observe(ref.current);
        return () => { obs.disconnect(); chart?.dispose(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

function pct(v: number, signed = false) { const s = (v * 100).toFixed(1) + '%'; return signed && v > 0 ? '+' + s : s; }
function fmtCny(v: number) {
    const a = Math.abs(v); const s = v < 0 ? '-' : '';
    if (a >= 1e8) return s + '¥' + (a / 1e8).toFixed(2) + '亿';
    if (a >= 1e7) return s + '¥' + (a / 1e7).toFixed(1) + '千万';
    if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
    return s + formatMoneyCny(a);
}

function KpiCard({ label, value, sub, tone = 'neutral', badge, note }: {
    label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'neutral'; badge?: string; note?: string;
}) {
    const tc = { positive: 'text-emerald-600', negative: 'text-rose-600', warning: 'text-amber-600', neutral: 'text-slate-800' }[tone];
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 relative">
            {badge && <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 whitespace-nowrap">{badge}</span>}
            <div className="text-[10px] text-slate-400 mb-1">{label}</div>
            <div className={`text-base font-bold ${tc}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
            {note && <div className="text-[10px] text-slate-300 mt-0.5">{note}</div>}
        </div>
    );
}

function SectionHeader({ title, sub, anchor }: { title: string; sub?: string; anchor: string }) {
    return (
        <div id={anchor} className="flex items-start gap-3 border-b border-slate-100 pb-3">
            <div>
                <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

const SECTIONS = [
    { anchor: 'pnl-overview', label: '年度总览' },
    { anchor: 'pnl-variance', label: '预算归因' },
    { anchor: 'pnl-bridge', label: '利润桥' },
    { anchor: 'pnl-monthly', label: '月度趋势' },
    { anchor: 'pnl-channel', label: '渠道诊断' },
    { anchor: 'pnl-category', label: '品类诊断' },
    { anchor: 'pnl-discount', label: '折扣侵蚀' },
    { anchor: 'pnl-cashflow', label: '现金流' },
];

// ── 导出菜单（PDF / Excel CSV）────────────────────────────────────────────────
function ExportMenu() {
    const [open, setOpen] = useState(false);
    const ba = brand.brandAnnual;

    const exportCsv = () => {
        const rows = [
            ['科目', '金额', '占净收入%'],
            ['吊牌GMV', ba.tagPriceSales, pct(ba.tagPriceSales / ba.netRevenue)],
            ['折扣折让', -ba.discountDeduction, pct(-ba.discountDeduction / ba.netRevenue)],
            ['退货退款', -ba.returnRefund, pct(-ba.returnRefund / ba.netRevenue)],
            ['净收入', ba.netRevenue, '100%'],
            ['商品成本 COGS', -ba.cogs, pct(-ba.cogs / ba.netRevenue)],
            ['入仓/头程物流', -ba.warehouseInboundLogistics, pct(-ba.warehouseInboundLogistics / ba.netRevenue)],
            ['毛利', ba.grossProfit, pct(ba.grossMarginRate)],
            ['平台/商场扣点', -(ba.platformDeduction + ba.mallDeduction), pct(-(ba.platformDeduction + ba.mallDeduction) / ba.netRevenue)],
            ['营销投放', -ba.marketingSpend, pct(-ba.marketingSpend / ba.netRevenue)],
            ['门店租金', -ba.storeRent, pct(-ba.storeRent / ba.netRevenue)],
            ['人工费用', -ba.laborCost, pct(-ba.laborCost / ba.netRevenue)],
            ['仓配物流', -ba.warehouseDistribution, pct(-ba.warehouseDistribution / ba.netRevenue)],
            ['装修摊销', -ba.fitoutAmortization, pct(-ba.fitoutAmortization / ba.netRevenue)],
            ['管理费用', -ba.adminExpense, pct(-ba.adminExpense / ba.netRevenue)],
            ['库存跌价+清货损失', -(ba.inventoryImpairment + ba.clearanceLoss), pct(-(ba.inventoryImpairment + ba.clearanceLoss) / ba.netRevenue)],
            ['EBIT', ba.ebit, pct(ba.ebitRate)],
            ['所得税', -ba.incomeTax, pct(-ba.incomeTax / ba.netRevenue)],
            ['净利润', ba.netProfit, pct(ba.netProfitRate)],
        ];
        const csv = '﻿' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `品牌年度P&L_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setOpen(false);
    };

    const exportPdf = () => {
        window.print();
        setOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setOpen(o => !o)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-colors font-medium flex items-center gap-1">
                📤 导出 <span className="text-[9px]">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20 min-w-[140px]">
                    <button onClick={exportCsv}
                        className="w-full px-3 py-2 text-[11px] text-left text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors flex items-center gap-2">
                        📊 Excel (CSV)
                    </button>
                    <button onClick={exportPdf}
                        className="w-full px-3 py-2 text-[11px] text-left text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors flex items-center gap-2 border-t border-slate-50">
                        📄 PDF (打印)
                    </button>
                </div>
            )}
        </div>
    );
}

// ── S4 利润桥 ─────────────────────────────────────────────────────────────────
function WaterfallChart({ onBarClick }: { onBarClick?: (label: string, value: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const items = brand.waterfallItems;
    const buildOption = useCallback(() => {
        const names = items.map(d => d.label);
        const absValues = items.map(d => Math.abs(d.value));
        const colors = items.map(d => {
            if (d.type === 'total' || d.type === 'subtotal') return d.value >= 0 ? '#10b981' : '#f43f5e';
            return d.value >= 0 ? '#38bdf8' : '#fb923c';
        });
        return {
            tooltip: { trigger: 'axis', formatter: (p: Array<{ dataIndex: number }>) => {
                const idx = p[0]?.dataIndex ?? 0; const item = items[idx];
                return item ? `${item.label}<br/>¥${(item.value / 10000).toFixed(0)}万<br/><span style="color:#94a3b8;font-size:10px">点击查看3维拆解</span>` : '';
            }},
            grid: { left: 12, right: 12, top: 20, bottom: 50, containLabel: true },
            xAxis: { type: 'category', data: names, axisLabel: { fontSize: 9, interval: 0, rotate: 28 } },
            yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 9 } },
            series: [{ type: 'bar', data: absValues.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })), barMaxWidth: 36, cursor: 'pointer',
                label: { show: true, position: 'top', fontSize: 8, formatter: (p: { dataIndex: number }) => {
                    const item = items[p.dataIndex]; if (!item) return '';
                    const sign = item.type === 'subtract' ? '-' : '';
                    return `${sign}${(Math.abs(item.value) / 10000).toFixed(0)}万`;
                }},
            }],
        };
    }, []);
    useEffect(() => {
        if (!ref.current) return;
        let chart: ECharts | null = null;
        const initChart = async () => {
            const ec = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = ec.init(ref.current);
            chart.setOption(buildOption() as object);
            if (onBarClick) {
                (chart as unknown as { on: (event: string, handler: (params: { dataIndex: number }) => void) => void })
                    .on('click', (p) => {
                        const item = items[p.dataIndex];
                        if (item) onBarClick(item.label, item.value);
                    });
            }
        };
        initChart();
        const obs = new ResizeObserver(() => chart?.resize());
        if (ref.current) obs.observe(ref.current);
        return () => { obs.disconnect(); chart?.dispose(); };
    }, [buildOption, onBarClick]);
    return <div ref={ref} style={{ height: 280 }} />;
}

// ── S5 月度趋势（季节带+大促节点+现金流入线）─────────────────────────────────
type CashflowSchedule = { monthly: Array<{ label: string; salesReceipt: number; purchasePayment: number; opexPayment: number; netCashflow: number }> };
const cashflowSchedule = cashflowRaw as CashflowSchedule;

function MonthlyTrendChart() {
    const ref = useRef<HTMLDivElement>(null);
    const monthly = brand.monthlyBreakdown;
    const cashByMonth = useMemo(() => {
        const map = new Map<string, number>();
        cashflowSchedule.monthly.forEach(m => map.set(m.label, m.salesReceipt));
        return map;
    }, []);
    const cashflowSeries = monthly.map(m => cashByMonth.get(m.label) ?? 0);

    const PROMO_MARKS = [
        { label: '618', coord: ['6月', 0] }, { label: '双11', coord: ['11月', 0] },
        { label: '双12', coord: ['12月', 0] }, { label: '春节', coord: ['2月', 0] },
    ];
    const buildOption = useCallback(() => ({
        tooltip: { trigger: 'axis' },
        legend: { data: ['净收入', '现金流入', '毛利率', 'EBIT率'], textStyle: { fontSize: 10 }, right: 8, top: 4 },
        grid: { left: 65, right: 65, top: 36, bottom: 28 },
        xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
        yAxis: [
            { type: 'value', name: '金额', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 9 } },
            { type: 'value', name: '利润率', min: 0, max: 0.8, axisLabel: { formatter: (v: number) => pct(v), fontSize: 9 } },
        ],
        visualMap: { show: false, type: 'piecewise', pieces: [
            { min: 0, max: 2, color: '#fef9c3' }, { min: 2, max: 5, color: '#dbeafe' },
            { min: 5, max: 8, color: '#d1fae5' }, { min: 8, max: 11, color: '#fef3c7' },
        ], dimension: 0 },
        series: [
            { name: '净收入', type: 'bar', data: monthly.map(m => m.netRevenue), barMaxWidth: 24, itemStyle: { color: '#cbd5e1' } },
            { name: '现金流入', type: 'line', data: cashflowSeries,
                lineStyle: { color: '#f97316', width: 2, type: 'dashed' }, symbol: 'diamond', symbolSize: 6, itemStyle: { color: '#f97316' } },
            { name: '毛利率', type: 'line', yAxisIndex: 1, data: monthly.map(m => m.grossMarginRate),
                lineStyle: { color: '#10b981', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#10b981' },
                markLine: { data: PROMO_MARKS.map(p => ({ name: p.label, xAxis: p.coord[0], label: { formatter: p.label, fontSize: 9 }, lineStyle: { type: 'dashed', color: '#94a3b8', width: 1 } })), silent: true },
            },
            { name: 'EBIT率', type: 'line', yAxisIndex: 1, data: monthly.map(m => m.ebitRate),
                lineStyle: { color: '#38bdf8', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#38bdf8' } },
        ],
    }), [monthly, cashflowSeries]);
    useChart(ref, buildOption, [cashflowSeries]);
    return <div ref={ref} style={{ height: 260 }} />;
}

// ── S6 渠道贡献（含→单店模型按钮）────────────────────────────────────────────
function ChannelDiagnosis({ onGoToStore }: { onGoToStore?: (channelKey: string) => void }) {
    const chList = channels.channels;
    return (
        <div className="space-y-3">
            {chList.map(ch => {
                const isHealthy = ch.contributionProfitRate >= 0.15;
                const isWarn = ch.contributionProfitRate >= 0.08;
                const bdr = isHealthy ? 'border-emerald-100 bg-emerald-50/30' : isWarn ? 'border-amber-100 bg-amber-50/30' : 'border-rose-100 bg-rose-50/30';
                const rateCls = isHealthy ? 'text-emerald-700 bg-emerald-100' : isWarn ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100';
                return (
                    <div key={ch.channel} className={`rounded-2xl border p-4 ${bdr}`}>
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                            <div>
                                <span className="font-bold text-slate-800 text-sm">{ch.label}</span>
                                <span className="ml-2 text-xs text-slate-400">净收入 {fmtCny(ch.netRevenue)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] px-2 py-1 rounded font-bold ${rateCls}`}>贡献利润率 {pct(ch.contributionProfitRate)}</span>
                                <span className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">{ch.action}</span>
                                {onGoToStore && (
                                    <button onClick={() => onGoToStore(ch.channel)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 transition-colors font-medium"
                                        title={ch.channel === 'physical' ? '验证实体店单店经营模型' : ch.channel === 'ecommerce' ? '电商渠道无单店模型，跳转后可对比线下基准' : '验证新店爬坡 / 投入 / 回本周期'}>
                                        → 单店模型验证
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] mb-3">
                            {[
                                { l: '净收入', v: fmtCny(ch.netRevenue) },
                                { l: '毛利率', v: pct(ch.grossMarginRate) },
                                { l: '贡献利润', v: fmtCny(ch.contributionProfit), bold: true },
                                { l: '退货率', v: pct(ch.returnRate), warn: ch.returnRate > 0.10 },
                                { l: '折扣率', v: pct(ch.discountRate), warn: ch.discountRate > 0.25 },
                                { l: '库存周转', v: ch.inventoryTurnover + '×' },
                            ].map(k => (
                                <div key={k.l} className="bg-white/70 rounded-lg px-2 py-1.5 text-center">
                                    <div className="text-[10px] text-slate-400">{k.l}</div>
                                    <div className={`font-${k.bold ? 'bold' : 'medium'} ${k.warn ? 'text-rose-600' : 'text-slate-700'} mt-0.5`}>{k.v}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {ch.costBreakdown.map((c: typeof ch.costBreakdown[number]) => (
                                <div key={c.item} className={`text-[10px] px-2 py-1 rounded-full ${c.rate > c.benchmark * 1.05 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {c.item} {pct(c.rate)}
                                    {c.rate > c.benchmark * 1.05 && <span className="ml-1 opacity-70">▲超{pct(c.rate - c.benchmark)}</span>}
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">{ch.verdict}</p>
                    </div>
                );
            })}
        </div>
    );
}

// ── S7 品类贡献（+产品角色/库存周转/新品占比/尺码完整率，可排序）────────────
type SortKey = 'salesAmount' | 'grossMarginRate' | 'sellThroughRate' | 'contributionProfitRate' | 'inventoryTurnover' | 'newRatio';

function CategoryDiagnosis() {
    const [sortKey, setSortKey] = useState<SortKey>('salesAmount');
    const [sortAsc, setSortAsc] = useState(false);

    const merged = categories.categories.map(cat => {
        const role = categoryRoles.categories.find(r => r.key === cat.key);
        return { ...cat, role: role?.role ?? '—', roleDesc: role?.roleDesc ?? '', newRatio: role?.newRatio ?? 0, inventoryTurnover: role?.inventoryTurnover ?? cat.inventoryTurnover, sizeCompletionRate: role?.sizeCompletionRate ?? 0 };
    });

    const sorted = [...merged].sort((a, b) => {
        const va = a[sortKey] as number; const vb = b[sortKey] as number;
        return sortAsc ? va - vb : vb - va;
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(a => !a); else { setSortKey(key); setSortAsc(false); }
    };

    const ROLE_CLS: Record<string, string> = { '主推': 'bg-emerald-100 text-emerald-700', '形象': 'bg-violet-100 text-violet-700', '补位': 'bg-sky-100 text-sky-700', '清尾': 'bg-slate-100 text-slate-500' };
    const SortTh = ({ label, sk }: { label: string; sk: SortKey }) => (
        <th className="py-2 px-2 font-medium text-slate-500 text-right cursor-pointer hover:text-slate-700 whitespace-nowrap select-none"
            onClick={() => handleSort(sk)}>
            {label} {sortKey === sk ? (sortAsc ? '↑' : '↓') : '·'}
        </th>
    );
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-[11px] text-slate-700">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left py-2 px-3 font-medium text-slate-500">品类</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500">产品角色</th>
                        <SortTh label="销售额" sk="salesAmount" />
                        <th className="text-right py-2 px-2 font-medium text-slate-500">占比</th>
                        <SortTh label="毛利率" sk="grossMarginRate" />
                        <th className="text-right py-2 px-2 font-medium text-slate-500">折扣率</th>
                        <SortTh label="售罄率" sk="sellThroughRate" />
                        <SortTh label="库存周转" sk="inventoryTurnover" />
                        <SortTh label="新品占比" sk="newRatio" />
                        <th className="text-right py-2 px-2 font-medium text-slate-500">尺码完整</th>
                        <SortTh label="贡献利润率" sk="contributionProfitRate" />
                        <th className="text-left py-2 px-3 font-medium text-slate-500">动作建议</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(cat => {
                        const gmCls = cat.grossMarginRate >= 0.50 ? 'text-emerald-600 font-semibold' : cat.grossMarginRate >= 0.42 ? 'text-slate-600' : 'text-amber-600';
                        const cpCls = cat.contributionProfitRate >= 0.20 ? 'text-emerald-700 font-bold' : cat.contributionProfitRate >= 0.10 ? 'text-amber-700 font-bold' : 'text-rose-600 font-bold';
                        const turnCls = cat.inventoryTurnover >= 4 ? 'text-emerald-600' : cat.inventoryTurnover >= 2.5 ? 'text-amber-600' : 'text-rose-600';
                        const sizeCls = cat.sizeCompletionRate >= 0.88 ? 'text-emerald-600' : 'text-amber-600';
                        return (
                            <tr key={cat.key} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-2 px-3 font-medium text-slate-800">{cat.label}</td>
                                <td className="py-2 px-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ROLE_CLS[cat.role] ?? 'bg-slate-100 text-slate-500'}`}>{cat.role}</span>
                                </td>
                                <td className="text-right py-2 px-2">{fmtCny(cat.salesAmount)}</td>
                                <td className="text-right py-2 px-2 text-slate-400">{pct(cat.salesShare)}</td>
                                <td className={`text-right py-2 px-2 ${gmCls}`}>{pct(cat.grossMarginRate)}</td>
                                <td className={`text-right py-2 px-2 ${cat.discountRate > 0.25 ? 'text-rose-600' : 'text-slate-600'}`}>{pct(cat.discountRate)}</td>
                                <td className={`text-right py-2 px-2 ${cat.sellThroughRate >= 0.80 ? 'text-emerald-600' : 'text-amber-600'}`}>{pct(cat.sellThroughRate)}</td>
                                <td className={`text-right py-2 px-2 ${turnCls}`}>{cat.inventoryTurnover.toFixed(1)}×</td>
                                <td className={`text-right py-2 px-2 ${cat.newRatio >= 0.35 ? 'text-slate-600' : 'text-amber-600'}`}>{pct(cat.newRatio)}</td>
                                <td className={`text-right py-2 px-2 ${sizeCls}`}>{pct(cat.sizeCompletionRate)}</td>
                                <td className={`text-right py-2 px-2 ${cpCls}`}>{pct(cat.contributionProfitRate)}</td>
                                <td className="py-2 px-3 text-[10px] text-slate-400 max-w-[120px]">{cat.action}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-700">
                ⚠️ 清货池贡献利润为负 — 建议与OTB联动控制下季清货款比例
            </div>
        </div>
    );
}

// ── S8 折扣侵蚀（+ LY 对比柱 + OTB 联动）──────────────────────────────────────
// LY 侵蚀基准（基于经验值占位 — 真实场景应来自 history JSON）
const LY_EROSION: Record<string, number> = {
    full_price: 0.62, campaign_discount: 0.027, clearance: 0.035,
    coupon_member: 0.018, return_refund: 0.041, inventory_markdown: 0.024,
};
// 行动计划 → OTB 关联映射（按优先级或关键词路由）
function resolveOtbAnchor(issue: string): string {
    if (/清货|库存|跌价/.test(issue)) return 'otb_clearance';
    if (/活动|促销|大促/.test(issue)) return 'otb_wave_plan';
    if (/退货|退款/.test(issue)) return 'otb_ecommerce';
    return 'otb_budget';
}

function DiscountErosion() {
    const { summary, erosionBreakdown, actionPlan } = discounts;
    const handleJumpToOtb = (anchor: string) => {
        const tabBtn = document.querySelector(`[data-tab-key="otb"]`) as HTMLButtonElement | null;
        if (tabBtn) tabBtn.click();
        setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 200);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { l: '吊牌GMV', v: fmtCny(summary.tagPriceSales) },
                    { l: '净收入', v: fmtCny(summary.actualNetRevenue) },
                    { l: '综合侵蚀率', v: pct(summary.erosionRate), tone: 'warning' as const },
                    { l: '正价销售占比', v: pct(summary.fullPriceShareActual), tone: (summary.fullPriceShareActual >= summary.fullPriceShareTarget ? 'positive' : 'warning') as 'positive' | 'warning' },
                ].map(k => <KpiCard key={k.l} label={k.l} value={k.v} tone={k.tone} />)}
            </div>
            <div className="space-y-2">
                {erosionBreakdown.map(e => {
                    const amount = e.isErosion ? (e.erosionAmount ?? e.markdownLoss ?? 0) : 0;
                    const isHighRisk = e.isErosion && (e.erosionRate ?? 0) > 0.03;
                    const currentRate = e.erosionRate ?? e.salesShare ?? 0;
                    const lyRate = LY_EROSION[e.type] ?? currentRate;
                    const yoyDelta = currentRate - lyRate;
                    const yoyWorse = yoyDelta > 0.005;
                    const yoyBetter = yoyDelta < -0.005;
                    return (
                        <div key={e.type} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${isHighRisk ? 'border-rose-100 bg-rose-50/40' : e.isErosion ? 'border-amber-100 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30'}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-semibold text-xs text-slate-800">{e.label}</span>
                                    {e.isErosion && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isHighRisk ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        侵蚀 {e.erosionRate ? pct(e.erosionRate) : e.salesShare ? pct(e.salesShare) : ''}
                                    </span>}
                                </div>
                                <p className="text-[11px] text-slate-500 mb-1.5">{e.verdict}</p>
                                {/* LY 对比双柱 */}
                                <div className="flex items-center gap-2 text-[10px]">
                                    <span className="text-slate-400 w-12">vs LY</span>
                                    <div className="flex-1 max-w-[200px] flex items-center gap-1">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                            <div className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${Math.min(100, lyRate * 1500)}%` }} title={`LY ${pct(lyRate)}`} />
                                        </div>
                                        <span className="text-slate-400 w-10 text-right">LY {pct(lyRate)}</span>
                                    </div>
                                    <div className="flex-1 max-w-[200px] flex items-center gap-1">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                            <div className={`absolute inset-y-0 left-0 ${yoyWorse ? 'bg-rose-400' : yoyBetter ? 'bg-emerald-400' : 'bg-sky-400'}`}
                                                 style={{ width: `${Math.min(100, currentRate * 1500)}%` }} title={`本年 ${pct(currentRate)}`} />
                                        </div>
                                        <span className={`w-10 text-right font-medium ${yoyWorse ? 'text-rose-600' : yoyBetter ? 'text-emerald-600' : 'text-sky-600'}`}>本 {pct(currentRate)}</span>
                                    </div>
                                    <span className={`text-[10px] font-medium ${yoyWorse ? 'text-rose-600' : yoyBetter ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {yoyDelta > 0 ? '+' : ''}{pct(yoyDelta)}
                                    </span>
                                </div>
                            </div>
                            {amount > 0 && <span className="text-sm font-bold text-rose-600 shrink-0">-{fmtCny(amount)}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 text-xs font-semibold text-slate-600 flex items-center justify-between">
                    <span>📋 优先改善行动计划</span>
                    <span className="text-[10px] text-slate-400 font-normal">点击 → 跳转 OTB 工作台对应模块</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {actionPlan.map(a => {
                        const otbAnchor = resolveOtbAnchor(a.issue);
                        return (
                            <div key={a.priority} className="flex items-start gap-3 px-4 py-3">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{a.priority}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span className="text-xs font-medium text-slate-700">{a.issue}</span>
                                        <span className="text-[10px] text-slate-400">期限: {a.deadline}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">→ {a.action}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">负责人: {a.owner}</p>
                                </div>
                                <button onClick={() => handleJumpToOtb(otbAnchor)}
                                    className="text-[10px] px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 transition-colors shrink-0"
                                    title="绑定到 OTB 工作台对应模块">
                                    → OTB
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── P&L 明细表 ────────────────────────────────────────────────────────────────
function PnlDetailTable({ open }: { open: boolean }) {
    if (!open) return null;
    const ba = brand.brandAnnual;
    const rows = [
        { name: '吊牌GMV', v: ba.tagPriceSales, indent: 0 },
        { name: '  - 折扣折让', v: -ba.discountDeduction, indent: 1 },
        { name: '  - 退货退款', v: -ba.returnRefund, indent: 1 },
        { name: '净收入', v: ba.netRevenue, indent: 0, bold: true },
        { name: '  - 商品成本 COGS', v: -ba.cogs, indent: 1 },
        { name: '  - 入仓/头程物流', v: -ba.warehouseInboundLogistics, indent: 1 },
        { name: '毛利', v: ba.grossProfit, indent: 0, bold: true },
        { name: '  - 平台/商场扣点', v: -(ba.platformDeduction + ba.mallDeduction), indent: 1 },
        { name: '  - 营销投放', v: -ba.marketingSpend, indent: 1 },
        { name: '  - 门店租金', v: -ba.storeRent, indent: 1 },
        { name: '  - 人工费用', v: -ba.laborCost, indent: 1 },
        { name: '  - 仓配物流', v: -ba.warehouseDistribution, indent: 1 },
        { name: '  - 装修摊销', v: -ba.fitoutAmortization, indent: 1 },
        { name: '  - 管理费用', v: -ba.adminExpense, indent: 1 },
        { name: '  - 库存跌价/清货损失', v: -(ba.inventoryImpairment + ba.clearanceLoss), indent: 1 },
        { name: 'EBIT', v: ba.ebit, indent: 0, bold: true },
        { name: '  - 所得税', v: -ba.incomeTax, indent: 1 },
        { name: '净利润', v: ba.netProfit, indent: 0, bold: true },
    ];
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-slate-700">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        {['科目', '金额', '占净收入%'].map(h => (
                            <th key={h} className={`py-2 px-4 font-medium text-slate-500 ${h === '科目' ? 'text-left' : 'text-right'}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className={`py-2 px-4 ${row.bold ? 'font-bold text-slate-900' : 'text-slate-600'}`} style={{ paddingLeft: `${16 + row.indent * 16}px` }}>{row.name}</td>
                            <td className={`text-right py-2 px-4 ${row.bold ? 'font-bold' : ''} ${row.v >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{fmtCny(row.v)}</td>
                            <td className="text-right py-2 px-4 text-slate-400">{brand.brandAnnual.netRevenue > 0 ? pct(row.v / brand.brandAnnual.netRevenue) : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
interface Props { onGoToStore?: (channelKey: string) => void; }

export default function BrandPnlDashboard({ onGoToStore }: Props) {
    const [detailOpen, setDetailOpen] = useState(false);
    const [compareMode, setCompareMode] = useState<CompareMode>('actual');
    const [drillItem, setDrillItem] = useState<{ label: string; value: number } | null>(null);
    const [activeAnchor, setActiveAnchor] = useState('pnl-overview');

    // IntersectionObserver — 锚点高亮
    useEffect(() => {
        const obs = new IntersectionObserver(
            entries => { entries.forEach(e => { if (e.isIntersecting) setActiveAnchor(e.target.id); }); },
            { rootMargin: '-40% 0px -55% 0px' }
        );
        SECTIONS.forEach(s => { const el = document.getElementById(s.anchor); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, []);

    const ba = brand.brandAnnual;
    const riskCls = ba.riskLevel === 'high' ? 'bg-rose-50 border-rose-200 text-rose-700' : ba.riskLevel === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700';

    return (
        <div className="space-y-6">
            {/* S1 锚点导航 + 导出 + 对比模式 */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 -mx-1 px-1 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-1 flex-wrap flex-1">
                        {SECTIONS.map(s => (
                            <a key={s.anchor} href={`#${s.anchor}`}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                    activeAnchor === s.anchor
                                        ? 'bg-sky-500 text-white shadow-sm'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600'
                                }`}>
                                {s.label}
                            </a>
                        ))}
                    </div>
                    <CompareModeSwitcher mode={compareMode} onChange={setCompareMode} />
                    <ExportMenu />
                </div>
            </div>

            {/* S2 年度利润总览 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-overview" title="年度利润总览" sub="财务结果 / 预算差异 / 鞋类专属 — 三排KPI" />
                <div className={`rounded-xl border px-4 py-2.5 text-xs flex items-center gap-2 ${riskCls}`}>
                    {ba.riskLevel === 'medium' ? '⚠️' : ba.riskLevel === 'high' ? '🔴' : '✅'}
                    <span className="font-semibold">风险等级: {ba.riskLevel === 'medium' ? '中等' : ba.riskLevel === 'high' ? '高风险' : '正常'}</span>
                    <span className="opacity-70">· 净收入超预算 {fmtCny(ba.budgetVarianceNetRevenue)}，净利润低于预算 {fmtCny(Math.abs(ba.budgetVarianceNetProfit))}</span>
                </div>
                {/* 第一排：财务结果 */}
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-0.5">财务结果</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <KpiCard label="吊牌GMV" value={fmtCny(ba.tagPriceSales)} sub="折前销售" />
                    <KpiCard label="净收入" value={fmtCny(ba.netRevenue)} sub="折扣+退货后" />
                    <KpiCard label="毛利率" value={pct(ba.grossMarginRate)} tone={ba.grossMarginRate >= 0.47 ? 'positive' : 'warning'} sub={fmtCny(ba.grossProfit)} />
                    <KpiCard label="EBIT率" value={pct(ba.ebitRate)} tone={ba.ebitRate >= 0.07 ? 'positive' : 'warning'} sub={fmtCny(ba.ebit)} />
                    <KpiCard label="净利率" value={pct(ba.netProfitRate)} tone={ba.netProfitRate >= 0.05 ? 'positive' : 'warning'} sub={fmtCny(ba.netProfit)} />
                </div>
                {/* 第二排：预算差异 */}
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-0.5 mt-1">预算差异</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiCard label="正价占比" value={pct(brand.priceStructure.fullPrice.salesShare)} tone={brand.priceStructure.fullPrice.salesShare >= 0.60 ? 'positive' : 'warning'} sub="目标 65%" />
                    <KpiCard label="库存跌价" value={fmtCny(ba.inventoryImpairment)} tone="negative" sub="含清货损失" />
                    <KpiCard label="净收入 vs 预算" value={ba.budgetVarianceNetRevenue >= 0 ? '+' + fmtCny(ba.budgetVarianceNetRevenue) : fmtCny(ba.budgetVarianceNetRevenue)} tone={ba.budgetVarianceNetRevenue >= 0 ? 'positive' : 'negative'} />
                    <KpiCard label="净利润 vs 预算" value={ba.budgetVarianceNetProfit >= 0 ? '+' + fmtCny(ba.budgetVarianceNetProfit) : fmtCny(ba.budgetVarianceNetProfit)} tone={ba.budgetVarianceNetProfit >= 0 ? 'positive' : 'negative'} />
                </div>
                {/* 第三排：鞋类专属 */}
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-0.5 mt-1">鞋类专属</div>
                <FootwearKpiRow />
            </div>

            {/* S3 预算偏差归因卡 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-variance" title="预算偏差归因" sub="利润桥：预算净利润 → 收入偏差 → 费用超支项 → 实际净利润 · Top5归因表" />
                <BudgetVarianceWaterfall />
            </div>

            {/* S4 P&L利润桥 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-bridge" title="P&L 利润桥" sub="吊牌GMV → 净收入 → 毛利 → EBIT → 净利润 · 点击柱子查看3维拆解" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <WaterfallChart onBarClick={(label, value) => setDrillItem({ label, value })} />
                    <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-sky-400 inline-block" /> 收入项</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-orange-400 inline-block" /> 费用/扣减</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-emerald-500 inline-block" /> 利润小计</span>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setDetailOpen(o => !o)}>
                        <span>📋 展开 P&L 明细表</span><span>{detailOpen ? '▲' : '▼'}</span>
                    </button>
                    <PnlDetailTable open={detailOpen} />
                </div>
            </div>

            {/* S5 月度趋势（前移） */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-monthly" title="月度趋势（净收入 / 毛利率 / EBIT率）" sub="季节带背景（春夏秋冬）· 大促节点垂直标记 · 鞋类季节性一览" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <MonthlyTrendChart />
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-400">
                        <span>■ 黄色: 春 ■ 蓝色: 夏 ■ 绿色: 秋 ■ 橙色: 冬 · 垂直虚线: 618/双11/双12/春节</span>
                    </div>
                </div>
            </div>

            {/* S6 渠道诊断 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-channel" title="渠道贡献诊断" sub="实体店 / 电商 / 新店 — 贡献利润率 + 专有费用 + 经营判断 · 点击→单店模型验证" />
                <ChannelDiagnosis onGoToStore={onGoToStore} />
            </div>

            {/* S7 品类诊断 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-category" title="品类贡献诊断" sub="点击列标题排序 · 产品角色/库存周转/新品占比/尺码完整率 — 四维鞋类专属" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <CategoryDiagnosis />
                </div>
            </div>

            {/* S8 折扣侵蚀 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-discount" title="折扣与清货侵蚀" sub="正价/活动/清货/优惠券/退货/库存跌价 六维度 + 行动计划" />
                <DiscountErosion />
            </div>

            {/* S9 现金流时点视图 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-cashflow" title="现金流时点视图" sub="月度销售收款 vs 采购/费用付款 · 现金缺口预警 · DSO/DPO/CCC · OTB联动" />
                <CashflowGapChart />
            </div>

            {/* 利润桥钻取弹窗 */}
            {drillItem && (
                <DimensionDrillDown itemLabel={drillItem.label} itemValue={drillItem.value} onClose={() => setDrillItem(null)} />
            )}
        </div>
    );
}
