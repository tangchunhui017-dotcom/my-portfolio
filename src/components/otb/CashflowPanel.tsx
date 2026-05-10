'use client';
/**
 * src/components/otb/CashflowPanel.tsx
 * 现金流管理面板 V3.0 — 独立顶层标签
 *
 * P0: 业务上下文头部 / 安全水位监测 / 合并预警Banner / 8张KPI卡片
 *     多选动作模拟 + 滑块 / 账期参数折叠面板 / 3张图表 / 增强明细表
 * P1: 备用金滑块 / 安全水位阈值可调 / 业务日期纵线 / 表格3新列
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useCashflow, generateCashflowEvents, calcCashSafetyAlerts } from '@/hooks/useCashflow';
import type { CashflowSimulationOptions, MonthlyCashflow, CashflowResult, SpendCategory } from '@/hooks/useCashflow';
import { formatMoneyCny } from '@/config/numberFormat';
import InventoryCashPressurePanel from './InventoryCashPressurePanel';

// ─── Business date (2026-05-10) ────────────────────────────────────────────
const BUSINESS_MONTH = 5; // 5月

// ─── Simulation definitions ─────────────────────────────────────────────────
type SimKey = 'delay_otb' | 'reduce_first_otb' | 'clearance_cash';
interface SimDef {
    key: SimKey;
    label: string;
    desc: string;
    hasSlider?: boolean;
    sliderLabel?: string;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    format?: (v: number) => string;
}

const SIMULATIONS: SimDef[] = [
    {
        key: 'delay_otb',
        label: 'OTB付款后移',
        desc: '模拟供应商账期谈判，将付款时间整体后移',
        hasSlider: true,
        sliderLabel: '后移月数',
        min: 0,
        max: 3,
        step: 1,
        defaultValue: 1,
        format: (v: number) => `${v}个月`,
    },
    {
        key: 'reduce_first_otb',
        label: '首批OTB减量',
        desc: '压缩前两波段OTB下单量，缓解现金压力',
        hasSlider: true,
        sliderLabel: '减量比例',
        min: 0,
        max: 0.4,
        step: 0.05,
        defaultValue: 0.2,
        format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    {
        key: 'clearance_cash',
        label: '提前清货回款',
        desc: '模拟期末库存折价清货，提前获取现金流',
        hasSlider: true,
        sliderLabel: '清货折扣',
        min: 0.3,
        max: 0.7,
        step: 0.05,
        defaultValue: 0.5,
        format: (v: number) => `${(v * 10).toFixed(1)}折`,
    },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function alertTag(level: MonthlyCashflow['alertLevel']) {
    if (level === 'danger') return <span className="inline-block text-[9px] font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded-full">危</span>;
    if (level === 'warning') return <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">预警</span>;
    return <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">安全</span>;
}

function KpiCard({
    label,
    value,
    sub,
    tone = 'default',
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: 'positive' | 'negative' | 'warning' | 'default';
}) {
    const toneClass =
        tone === 'positive' ? 'text-emerald-600'
        : tone === 'negative' ? 'text-rose-600'
        : tone === 'warning' ? 'text-amber-600'
        : 'text-slate-800';
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
    );
}

// ─── Charts ─────────────────────────────────────────────────────────────────

function CashflowChart({ monthly }: { monthly: MonthlyCashflow[] }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || monthly.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            const businessDateMark = {
                type: 'line' as const,
                xAxis: BUSINESS_MONTH - 1,
                lineStyle: { color: '#6366f1', type: 'dashed' as const, width: 1.5 },
                label: { show: true, formatter: '业务日期', position: 'insideEndTop' as const, fontSize: 9, color: '#6366f1' },
            };
            chart!.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['净现金流', '期末余额'], textStyle: { fontSize: 11 } },
                grid: { left: 70, right: 70, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: [
                    { type: 'value', name: '净现金流', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                    { type: 'value', name: '期末余额', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                ],
                series: [
                    {
                        name: '净现金流',
                        type: 'bar',
                        data: monthly.map(m => ({
                            value: m.netCashflow,
                            itemStyle: { color: m.netCashflow >= 0 ? '#10b981' : '#f43f5e' },
                        })),
                        barMaxWidth: 28,
                        markLine: { data: [businessDateMark], symbol: 'none' },
                    },
                    {
                        name: '期末余额',
                        type: 'line',
                        yAxisIndex: 1,
                        data: monthly.map(m => m.closingBalance),
                        lineStyle: { color: '#38bdf8', width: 2 },
                        symbol: 'circle',
                        symbolSize: 5,
                        itemStyle: { color: '#38bdf8' },
                        areaStyle: { color: 'rgba(56,189,248,0.08)' },
                    },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [monthly]);
    return <div ref={chartRef} style={{ height: 240 }} />;
}

function OtbPaymentChart({ monthly }: { monthly: MonthlyCashflow[] }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || monthly.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            const businessDateMark = {
                type: 'line' as const,
                xAxis: BUSINESS_MONTH - 1,
                lineStyle: { color: '#6366f1', type: 'dashed' as const, width: 1.5 },
                label: { show: true, formatter: '业务日期', position: 'insideEndTop' as const, fontSize: 9, color: '#6366f1' },
            };
            chart!.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['OTB定金', 'OTB尾款', '当月回款'], textStyle: { fontSize: 11 } },
                grid: { left: 70, right: 20, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series: [
                    {
                        name: 'OTB定金',
                        type: 'bar',
                        stack: 'payment',
                        data: monthly.map(m => m.otbDeposit),
                        itemStyle: { color: '#fb923c' },
                        barMaxWidth: 28,
                        markLine: { data: [businessDateMark], symbol: 'none' },
                    },
                    { name: 'OTB尾款', type: 'bar', stack: 'payment', data: monthly.map(m => m.otbBalance), itemStyle: { color: '#f97316' }, barMaxWidth: 28 },
                    { name: '当月回款', type: 'line', data: monthly.map(m => m.collection), lineStyle: { color: '#10b981', width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#10b981' } },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [monthly]);
    return <div ref={chartRef} style={{ height: 220 }} />;
}

// 支出按科目分类堆叠图（替代原"自动 vs 手工"）
const SPEND_CATEGORY_COLORS: Record<SpendCategory, string> = {
    '采购付款': '#fb923c',
    '营销费用': '#a78bfa',
    '人力成本': '#60a5fa',
    '租金/办公': '#94a3b8',
    '其他/手工': '#f59e0b',
};

function ExpenseStackedChart({ monthly }: { monthly: MonthlyCashflow[] }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || monthly.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const categories: SpendCategory[] = ['采购付款', '营销费用', '人力成本', '租金/办公', '其他/手工'];
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            chart!.setOption({
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { data: categories, textStyle: { fontSize: 11 } },
                grid: { left: 70, right: 20, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series: categories.map(cat => ({
                    name: cat,
                    type: 'bar',
                    stack: 'expense',
                    data: monthly.map(m => m.spendByCategory[cat] ?? 0),
                    itemStyle: { color: SPEND_CATEGORY_COLORS[cat] },
                    barMaxWidth: 28,
                })),
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [monthly]);
    return <div ref={chartRef} style={{ height: 200 }} />;
}

// OTB 付款 vs 销售回款 差值图（正=净流出，负=净流入）
function PaymentVsCollectionChart({ monthly }: { monthly: MonthlyCashflow[] }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || monthly.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            chart!.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['OTB付款', '销售回款', '净流出'], textStyle: { fontSize: 11 } },
                grid: { left: 70, right: 20, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series: [
                    {
                        name: 'OTB付款',
                        type: 'bar',
                        data: monthly.map(m => m.otbDeposit + m.otbBalance),
                        itemStyle: { color: '#f97316' },
                        barMaxWidth: 18,
                    },
                    {
                        name: '销售回款',
                        type: 'bar',
                        data: monthly.map(m => m.collection),
                        itemStyle: { color: '#10b981' },
                        barMaxWidth: 18,
                    },
                    {
                        name: '净流出',
                        type: 'line',
                        data: monthly.map(m => m.paymentMinusCollection),
                        lineStyle: { color: '#f43f5e', width: 2 },
                        symbol: 'circle',
                        symbolSize: 5,
                        itemStyle: { color: '#f43f5e' },
                        markLine: {
                            silent: true,
                            symbol: 'none',
                            lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
                            data: [{ yAxis: 0 }],
                        },
                    },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [monthly]);
    return <div ref={chartRef} style={{ height: 200 }} />;
}

// 授信额度池小卡
function CreditPoolCard({ result }: { result: CashflowResult }) {
    const cp = result.creditPool;
    const usedPct = cp.total > 0 ? (cp.used / cp.total) * 100 : 0;
    const suggestedExceedsAvailable = result.suggestedCreditAmount > cp.available;
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">授信额度池</span>
                <span className="text-[10px] text-slate-400">到期 {cp.expireDate}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs mb-2">
                <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">总授信</div>
                    <div className="text-slate-700 font-semibold">{formatMoneyCny(cp.total)}</div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">已用</div>
                    <div className="text-amber-600 font-semibold">{formatMoneyCny(cp.used)}</div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">可用</div>
                    <div className="text-emerald-600 font-semibold">{formatMoneyCny(cp.available)}</div>
                </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full ${usedPct > 80 ? 'bg-rose-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, usedPct)}%` }}
                />
            </div>
            <div className="text-[10px] text-slate-500">
                已用率 {usedPct.toFixed(1)}%
                {result.suggestedCreditAmount > 0 && (
                    <>
                        {' · '}
                        <span className={suggestedExceedsAvailable ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                            建议授信 {formatMoneyCny(result.suggestedCreditAmount)}
                            {suggestedExceedsAvailable && '（超出可用余量）'}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}

// 现金流事件标记小卡
function CashflowEventsCard({ monthly }: { monthly: MonthlyCashflow[] }) {
    const events = useMemo(() => generateCashflowEvents(monthly), [monthly]);
    if (events.length === 0) return null;
    const typeColor: Record<string, string> = {
        payment: 'bg-orange-100 text-orange-700',
        collection: 'bg-emerald-100 text-emerald-700',
        milestone: 'bg-rose-100 text-rose-700',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">现金流关键事件</span>
                <span className="text-[10px] text-slate-400">{events.length} 项</span>
            </div>
            <div className="space-y-2">
                {events.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`shrink-0 px-2 py-0.5 rounded-full font-semibold ${typeColor[ev.type]}`}>
                            {ev.label}
                        </span>
                        <span className="text-slate-700 flex-1">{ev.title}</span>
                        {ev.amount !== undefined && (
                            <span className={`text-[11px] font-medium ${ev.type === 'milestone' && ev.amount < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                {formatMoneyCny(ev.amount)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// 3 场景并行对比表
function ScenarioCompareTable({ baseResult, simulationOptions }: {
    baseResult: CashflowResult;
    simulationOptions: CashflowSimulationOptions;
}) {
    const [open, setOpen] = useState(false);
    // 三个对比场景：当前 / 加 OTB 后移 1 月 / 加 备用金 500 万
    const scenarioA = useCashflow('base', { ...simulationOptions, delayOtbPaymentsMonths: 1 });
    const scenarioB = useCashflow('base', { ...simulationOptions, extraOpeningCash: 5000000 });
    if (!scenarioA || !scenarioB) return null;

    const rows = [
        { key: 'yearEnd', label: '年末余额', fmt: (v: number) => formatMoneyCny(v) },
        { key: 'netCash', label: '净现金流', fmt: (v: number) => formatMoneyCny(v) },
        { key: 'maxGap', label: '最大缺口月', fmt: (v: number | null) => v !== null ? `${v}月` : '无' },
        { key: 'dangerCount', label: '危险月份数', fmt: (v: number) => `${v} 个月` },
        { key: 'breachCount', label: '跌破水位月数', fmt: (v: number) => `${v} 个月` },
        { key: 'suggested', label: '建议授信', fmt: (v: number) => v > 0 ? formatMoneyCny(v) : '无需' },
    ];
    const getValue = (r: CashflowResult, key: string) => {
        switch (key) {
            case 'yearEnd': return r.yearEndBalance;
            case 'netCash': return r.netCashflow;
            case 'maxGap': return r.maxGapMonth;
            case 'dangerCount': return r.dangerMonths.length;
            case 'breachCount': return r.breachSafetyMonths.length;
            case 'suggested': return r.suggestedCreditAmount;
            default: return null;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
            >
                <div className="flex items-center gap-2">
                    <span className="text-base">⚙</span>
                    <span className="text-sm font-semibold text-slate-700">3 场景并行对比</span>
                    <span className="text-[11px] text-slate-400">基准 / OTB 后移 1 月 / 加备用金 500 万</span>
                </div>
                <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && (
                <div className="px-4 pb-4 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                                <th className="text-left py-2 px-3 font-medium">指标</th>
                                <th className="text-right py-2 px-3 font-medium">当前基准</th>
                                <th className="text-right py-2 px-3 font-medium">OTB 后移 1 月</th>
                                <th className="text-right py-2 px-3 font-medium">加备用金 500 万</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const baseValue = getValue(baseResult, r.key);
                                const aValue = getValue(scenarioA, r.key);
                                const bValue = getValue(scenarioB, r.key);
                                return (
                                    <tr key={r.key} className="border-b border-slate-50">
                                        <td className="py-2 px-3 font-medium text-slate-700">{r.label}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{r.fmt(baseValue as number & null)}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{r.fmt(aValue as number & null)}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{r.fmt(bValue as number & null)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className="text-[10px] text-slate-400 mt-2">仅模拟，不修改实际场景。可在上方动作模拟中应用对比方案。</p>
                </div>
            )}
        </div>
    );
}

// 现金流告警分析（基于 calcCashSafetyAlerts）
function SafetyAlertSummary({ monthly, threshold }: { monthly: MonthlyCashflow[]; threshold: number }) {
    const { breachMonths, consecutiveBreaches, maxConsecutiveLength } = useMemo(
        () => calcCashSafetyAlerts(monthly, threshold), [monthly, threshold]
    );
    if (breachMonths.length === 0) return null;
    return (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <strong>水位告警</strong>：{breachMonths.length} 个月跌破水位
            {maxConsecutiveLength > 1 && (
                <>
                    ，最长连续 <strong className="text-rose-700">{maxConsecutiveLength}</strong> 个月（
                    {consecutiveBreaches
                        .filter(r => r.length === maxConsecutiveLength)
                        .map(r => `${r.start}-${r.end}月`)
                        .join('、')}
                    ）
                </>
            )}
        </div>
    );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function CashflowPanel() {
    // Simulation multi-select state
    const [activeSims, setActiveSims] = useState<Set<SimKey>>(new Set());
    const [sliderValues, setSliderValues] = useState<Record<SimKey, number>>({
        delay_otb: 1,
        reduce_first_otb: 0.2,
        clearance_cash: 0.5,
    });

    // Extra cash slider
    const [extraCash, setExtraCash] = useState(0);
    // Safety threshold
    const [safetyThreshold, setSafetyThreshold] = useState(5000000);

    // Account terms override
    const [showTerms, setShowTerms] = useState(false);
    const [depositLead, setDepositLead] = useState<number | undefined>(undefined);
    const [balanceLead, setBalanceLead] = useState<number | undefined>(undefined);

    // Help popup
    const [helpOpen, setHelpOpen] = useState(false);

    // Context detail
    const [showContext, setShowContext] = useState(false);

    const simulationOptions = useMemo<CashflowSimulationOptions>(() => {
        const opts: CashflowSimulationOptions = {
            extraOpeningCash: extraCash,
            cashSafetyThreshold: safetyThreshold,
        };
        if (depositLead !== undefined) opts.depositLeadMonths = depositLead;
        if (balanceLead !== undefined) opts.balanceLeadMonths = balanceLead;

        if (activeSims.has('delay_otb')) opts.delayOtbPaymentsMonths = sliderValues.delay_otb;
        if (activeSims.has('reduce_first_otb')) opts.reduceFirstOtbRate = sliderValues.reduce_first_otb;
        if (activeSims.has('clearance_cash')) {
            opts.clearanceInventoryRate = 0.2;
            opts.clearanceDiscount = sliderValues.clearance_cash;
            opts.clearanceMonth = 1;
        }
        return opts;
    }, [activeSims, sliderValues, extraCash, safetyThreshold, depositLead, balanceLead]);

    const result = useCashflow('base', simulationOptions);

    function toggleSim(key: SimKey) {
        setActiveSims(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    const hasAlert = result && (result.dangerMonths.length > 0 || result.warningMonths.length > 0);
    const isDanger = result && result.dangerMonths.length > 0;

    return (
        <div className="space-y-6 pb-20">

            {/* ── 业务上下文头部 ───────────────────────────────────── */}
            <div className="bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-sky-800">现金流管理 · 2026年度</span>
                            <span className="text-[10px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-medium">业务日期 2026-05-10</span>
                        </div>
                        <p className="text-xs text-sky-600 mt-1">
                            综合 OTB 采购付款排期、渠道销售回款与运营支出，监测全年现金流健康状况
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => setShowContext(v => !v)}
                            className="text-xs text-sky-600 hover:text-sky-800 border border-sky-200 rounded-lg px-3 py-1.5"
                        >
                            {showContext ? '收起' : '业务说明'}
                        </button>
                        <button
                            onClick={() => setHelpOpen(v => !v)}
                            className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm font-bold hover:bg-sky-200 flex items-center justify-center"
                        >
                            ?
                        </button>
                    </div>
                </div>
                {showContext && (
                    <div className="mt-3 pt-3 border-t border-sky-100 text-xs text-sky-700 space-y-1">
                        <p>• 回款逻辑：实体店当月到账，电商50%当月+50%次月，加盟商次月结清</p>
                        <p>• OTB付款：定金提前3个月（30%），尾款提前1个月（70%），可在账期参数中调整</p>
                        <p>• 安全水位：期末余额低于阈值触发预警，低于0触发危险；默认阈值500万可调</p>
                        <p>• 多选模拟：可同时启用多项动作，评估组合策略效果</p>
                    </div>
                )}
            </div>

            {/* ── 现金安全水位监测条 ──────────────────────────────── */}
            {result && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-700">现金安全水位监测</div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">安全阈值</span>
                            <input
                                type="range"
                                min={1000000}
                                max={10000000}
                                step={500000}
                                value={safetyThreshold}
                                onChange={e => setSafetyThreshold(Number(e.target.value))}
                                className="w-28 h-1.5 accent-sky-500"
                            />
                            <span className="text-xs font-medium text-sky-700 w-12 text-right">{formatMoneyCny(safetyThreshold)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {result.monthly.slice(0, 12).map(m => {
                            const pct = Math.max(0, Math.min(100, (m.closingBalance / (safetyThreshold * 2)) * 100));
                            const color = m.alertLevel === 'danger' ? 'bg-rose-500' : m.alertLevel === 'warning' ? 'bg-amber-400' : 'bg-emerald-400';
                            return (
                                <div key={m.month}>
                                    <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                                        <span>{m.label}</span>
                                        <span className={m.alertLevel === 'danger' ? 'text-rose-600' : m.alertLevel === 'warning' ? 'text-amber-600' : 'text-emerald-600'}>
                                            {(m.closingBalance / 10000).toFixed(0)}万
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {result.breachSafetyMonths.length > 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                            ⚠ 以下月份余额低于安全水位（{formatMoneyCny(safetyThreshold)}）：
                            {result.breachSafetyMonths.map(m => `${m}月`).join('、')}
                        </p>
                    )}
                </div>
            )}

            {/* ── 预警 Banner ──────────────────────────────────────── */}
            {hasAlert && result && (
                <div className={`rounded-xl border px-5 py-4 ${isDanger ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-start gap-3">
                        <span className={`text-base font-bold mt-0.5 ${isDanger ? 'text-rose-600' : 'text-amber-600'}`}>
                            {isDanger ? '✗' : '⚠'}
                        </span>
                        <div>
                            <div className={`text-sm font-bold ${isDanger ? 'text-rose-700' : 'text-amber-700'}`}>
                                现金流预警
                            </div>
                            {result.dangerMonths.length > 0 && (
                                <div className="text-xs text-rose-600 mt-1">
                                    危险月份：{result.dangerMonths.map(m => `${m}月`).join('、')} — 期末余额为负，建议提前安排备用金或调整下单节奏
                                </div>
                            )}
                            {result.warningMonths.length > 0 && (
                                <div className="text-xs text-amber-600 mt-1">
                                    预警月份：{result.warningMonths.map(m => `${m}月`).join('、')} — 余额低于安全水位，建议提前协调回款
                                </div>
                            )}
                            <div className="text-xs text-slate-400 mt-2">
                                可在下方多选动作模拟快速评估：OTB付款后移、首批下单压缩、清货提前回款
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── KPI 卡片区 ─────────────────────────────────────── */}
            {result && (
                <>
                    {/* 财务核心 4张 */}
                    <div>
                        <div className="text-xs font-medium text-slate-400 mb-2">财务核心指标</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <KpiCard
                                label="年度净现金流"
                                value={formatMoneyCny(result.netCashflow)}
                                tone={result.netCashflow >= 0 ? 'positive' : 'negative'}
                                sub={result.netCashflow >= 0 ? '年度资金正流入' : '年度资金净流出'}
                            />
                            <KpiCard
                                label="年末期末余额"
                                value={formatMoneyCny(result.yearEndBalance)}
                                tone={result.yearEndBalance >= safetyThreshold ? 'positive' : result.yearEndBalance >= 0 ? 'warning' : 'negative'}
                                sub={`支撑约 ${result.cashSafetyMonths.toFixed(1)} 个月运营`}
                            />
                            <KpiCard
                                label="月均支出"
                                value={formatMoneyCny(result.averageMonthlySpend)}
                                sub="固定+变动+采购"
                            />
                            <KpiCard
                                label="最危险月"
                                value={result.maxGapMonth ? `${result.maxGapMonth}月` : '无'}
                                sub={result.maxGapAmount < 0 ? formatMoneyCny(result.maxGapAmount) : '现金流健康'}
                                tone={result.maxGapMonth ? 'negative' : 'positive'}
                            />
                        </div>
                    </div>

                    {/* OTB联动 4张 */}
                    <div>
                        <div className="text-xs font-medium text-slate-400 mb-2">OTB联动现金流</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <KpiCard label="计划采购额" value={formatMoneyCny(result.otbPlannedPurchaseAmount)} />
                            <KpiCard
                                label="OTB付款合计"
                                value={formatMoneyCny(result.otbPaymentTotal)}
                                tone={result.otbPaymentTotal > result.totalCollection ? 'negative' : 'default'}
                                sub="定金+尾款"
                            />
                            <KpiCard
                                label="付款/回款比"
                                value={result.paymentToCollectionRatio !== null ? `${(result.paymentToCollectionRatio * 100).toFixed(1)}%` : '--'}
                                tone={result.paymentToCollectionRatio !== null && result.paymentToCollectionRatio > 1 ? 'negative' : 'positive'}
                                sub={result.paymentToCollectionRatio !== null && result.paymentToCollectionRatio > 1 ? '付款>回款，现金承压' : '回款覆盖付款'}
                            />
                            <KpiCard label="总回款" value={formatMoneyCny(result.totalCollection)} tone="positive" sub="三渠道合计" />
                        </div>
                    </div>
                </>
            )}

            {/* ── 动作模拟（多选 + 滑块）─────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-slate-700">动作模拟</span>
                    <span className="text-xs text-slate-400">可多选组合评估</span>
                    {activeSims.size > 0 && (
                        <button
                            onClick={() => setActiveSims(new Set())}
                            className="ml-auto text-xs text-rose-500 hover:text-rose-700"
                        >
                            清除全部
                        </button>
                    )}
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {SIMULATIONS.map(sim => {
                        const active = activeSims.has(sim.key);
                        return (
                            <button
                                key={sim.key}
                                onClick={() => toggleSim(sim.key)}
                                title={sim.desc}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}
                            >
                                {active ? '✓ ' : ''}{sim.label}
                            </button>
                        );
                    })}
                </div>

                {/* Sliders for active sims */}
                {SIMULATIONS.filter(s => activeSims.has(s.key) && s.hasSlider).map(sim => (
                    <div key={sim.key} className="flex items-center gap-3 mb-2 pl-2">
                        <span className="text-xs text-slate-500 w-28 shrink-0">{sim.label} — {sim.sliderLabel}</span>
                        <input
                            type="range"
                            min={sim.min}
                            max={sim.max}
                            step={sim.step}
                            value={sliderValues[sim.key]}
                            onChange={e => setSliderValues(prev => ({ ...prev, [sim.key]: Number(e.target.value) }))}
                            className="flex-1 h-1.5 accent-amber-500"
                        />
                        <span className="text-xs font-medium text-amber-700 w-12 text-right">
                            {sim.format!(sliderValues[sim.key])}
                        </span>
                    </div>
                ))}

                {/* Extra opening cash slider */}
                <div className="mt-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-28 shrink-0">增加备用金</span>
                        <input
                            type="range"
                            min={0}
                            max={10000000}
                            step={500000}
                            value={extraCash}
                            onChange={e => setExtraCash(Number(e.target.value))}
                            className="flex-1 h-1.5 accent-emerald-500"
                        />
                        <span className="text-xs font-medium text-emerald-700 w-16 text-right">
                            {extraCash === 0 ? '不增加' : formatMoneyCny(extraCash)}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 pl-0.5">模拟股东借款或授信额度注入，调整期初余额</p>
                </div>
            </div>

            {/* ── 账期参数面板（折叠）──────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowTerms(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                    <span className="text-sm font-semibold text-slate-700">账期假设参数</span>
                    <span className="text-xs text-slate-400">{showTerms ? '收起 ▲' : '展开 ▼'}</span>
                </button>
                {showTerms && (
                    <div className="px-5 pb-4 border-t border-slate-50 pt-3 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-32 shrink-0">OTB定金 — 提前月数</span>
                            <input
                                type="range"
                                min={1}
                                max={6}
                                step={1}
                                value={depositLead ?? 3}
                                onChange={e => setDepositLead(Number(e.target.value))}
                                className="flex-1 h-1.5 accent-sky-500"
                            />
                            <span className="text-xs font-medium text-sky-700 w-12 text-right">{depositLead ?? 3}个月</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-32 shrink-0">OTB尾款 — 提前月数</span>
                            <input
                                type="range"
                                min={0}
                                max={3}
                                step={1}
                                value={balanceLead ?? 1}
                                onChange={e => setBalanceLead(Number(e.target.value))}
                                className="flex-1 h-1.5 accent-sky-500"
                            />
                            <span className="text-xs font-medium text-sky-700 w-12 text-right">{balanceLead ?? 1}个月</span>
                        </div>
                        <p className="text-[10px] text-slate-400">修改账期假设将覆盖数据文件中的默认配置，仅影响本次模拟</p>
                    </div>
                )}
            </div>

            {result ? (
                <>
                    {/* ── 库存占款 & 清货模拟 ─────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">库存占款 · 现金缺口 · 清货模拟</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                清货折扣可在上方动作模拟中调整；默认20%库存量参与清货
                            </p>
                        </div>
                        <div className="p-5">
                            <InventoryCashPressurePanel scenario="base" simulationOptions={simulationOptions} />
                        </div>
                    </div>

                    {/* ── OTB联动建议 ─────────────────────────────── */}
                    {result.cashflowAdvice.length > 0 && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-xs text-amber-700 space-y-1">
                            {result.cashflowAdvice.map((advice, i) => (
                                <p key={i}>• {advice}</p>
                            ))}
                        </div>
                    )}

                    {/* ── 月度净现金流图 ───────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">月度净现金流 + 期末余额</h3>
                            <p className="text-xs text-slate-400 mt-0.5">紫色虚线为业务日期（2026-05-10），绿色柱为正向现金流，红色柱为净流出</p>
                        </div>
                        <div className="p-4">
                            <CashflowChart monthly={result.monthly} />
                        </div>
                    </div>

                    {/* ── OTB付款排期图 ───────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">OTB 付款排期 vs 销售回款</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                定金提前{depositLead ?? 3}个月支付，尾款提前{balanceLead ?? 1}个月支付；绿线为当月实际回款
                            </p>
                        </div>
                        <div className="p-4">
                            <OtbPaymentChart monthly={result.monthly} />
                        </div>
                    </div>

                    {/* ── 支出按科目分类堆叠图 ───────────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">支出按科目分类</h3>
                            <p className="text-xs text-slate-400 mt-0.5">采购付款 / 营销 / 人力 / 租金 / 其他 — 按经验比例从固定支出与可变支出拆分</p>
                        </div>
                        <div className="p-4">
                            <ExpenseStackedChart monthly={result.monthly} />
                        </div>
                    </div>

                    {/* ── OTB付款 vs 销售回款 差值图 ───────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">OTB付款 vs 销售回款（差值）</h3>
                            <p className="text-xs text-slate-400 mt-0.5">红线=净流出（付款 - 回款），高于 0 表示当月入不敷出</p>
                        </div>
                        <div className="p-4">
                            <PaymentVsCollectionChart monthly={result.monthly} />
                        </div>
                    </div>

                    {/* ── 授信池 + 事件标记 + 安全告警 三栏并排 ─────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <CreditPoolCard result={result} />
                        <CashflowEventsCard monthly={result.monthly} />
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2">
                            <span className="text-sm font-semibold text-slate-700 block">水位连续告警</span>
                            <SafetyAlertSummary monthly={result.monthly} threshold={safetyThreshold} />
                            <p className="text-[10px] text-slate-400">
                                当余额连续多月低于水位时风险等级升级，建议提前安排授信或调整付款节奏。
                            </p>
                        </div>
                    </div>

                    {/* ── 3 场景并行对比 ─────────────────────────── */}
                    <ScenarioCompareTable baseResult={result} simulationOptions={simulationOptions} />

                    {/* ── 月度现金流明细表 ─────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">月度现金流明细</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs text-slate-700">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="text-left py-2 px-3 font-medium text-slate-500 whitespace-nowrap">月份</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">期初余额</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">回款</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">OTB定金</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">OTB尾款</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">自动支出</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">手工支出</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">净现金流</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">期末余额</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">余额支撑月</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">OTB占支出%</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">vs LY</th>
                                        <th className="text-center py-2 px-3 font-medium text-slate-500 whitespace-nowrap">状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.monthly.map(m => (
                                        <tr
                                            key={m.month}
                                            className={`border-b border-slate-50 hover:bg-slate-50 ${m.alertLevel === 'danger' ? 'bg-rose-50/50' : m.alertLevel === 'warning' ? 'bg-amber-50/50' : ''}`}
                                        >
                                            <td className="py-2 px-3 font-medium whitespace-nowrap">
                                                {m.label}
                                                {m.month === BUSINESS_MONTH && (
                                                    <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-600 px-1 rounded">当前</span>
                                                )}
                                            </td>
                                            <td className="text-right py-2 px-3">{formatMoneyCny(m.openingBalance)}</td>
                                            <td className="text-right py-2 px-3 text-emerald-600">{formatMoneyCny(m.collection)}</td>
                                            <td className="text-right py-2 px-3 text-orange-500">{formatMoneyCny(m.otbDeposit)}</td>
                                            <td className="text-right py-2 px-3 text-orange-600">{formatMoneyCny(m.otbBalance)}</td>
                                            <td className="text-right py-2 px-3 text-slate-500">{formatMoneyCny(m.autoExpenses)}</td>
                                            <td className="text-right py-2 px-3 text-amber-600">{formatMoneyCny(m.manualExpenses)}</td>
                                            <td className={`text-right py-2 px-3 font-medium ${m.netCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {formatMoneyCny(m.netCashflow)}
                                            </td>
                                            <td className={`text-right py-2 px-3 font-bold ${m.closingBalance >= safetyThreshold ? 'text-emerald-600' : m.closingBalance >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {formatMoneyCny(m.closingBalance)}
                                            </td>
                                            <td className={`text-right py-2 px-3 ${m.cashRunwayMonths >= 3 ? 'text-emerald-600' : m.cashRunwayMonths >= 1 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {m.cashRunwayMonths.toFixed(1)}月
                                            </td>
                                            <td className="text-right py-2 px-3 text-slate-500">
                                                {(m.otbPaymentShare * 100).toFixed(0)}%
                                            </td>
                                            <td className="text-right py-2 px-3 text-slate-400 text-[11px]">
                                                {m.yoyDelta !== null
                                                    ? `${m.yoyDelta >= 0 ? '+' : ''}${(m.yoyDelta * 100).toFixed(1)}%`
                                                    : '-'}
                                            </td>
                                            <td className="text-center py-2 px-3">{alertTag(m.alertLevel)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">加载现金流数据中…</div>
            )}

            {/* ── ? 帮助浮层 ──────────────────────────────────────── */}
            {helpOpen && (
                <div className="fixed bottom-6 right-6 w-80 bg-sky-50 border border-sky-100 rounded-2xl shadow-xl p-5 z-50">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-sky-800">现金流面板说明</span>
                        <button onClick={() => setHelpOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                    </div>
                    <div className="space-y-2 text-xs text-slate-600">
                        <p><span className="font-medium text-rose-600">✗ 危险</span>：期末余额 &lt; 0，立即采取行动</p>
                        <p><span className="font-medium text-amber-600">⚠ 预警</span>：期末余额低于安全水位</p>
                        <p><span className="font-medium text-emerald-600">✓ 安全</span>：余额高于安全水位</p>
                        <p className="pt-1 border-t border-sky-100"><span className="font-medium">动作模拟</span>：多选后通过滑块精细调整参数，可同时叠加评估组合策略</p>
                        <p><span className="font-medium">备用金滑块</span>：调整期初余额，模拟注资或授信额度</p>
                        <p><span className="font-medium">账期参数</span>：展开后可手动覆盖定金/尾款的提前月数</p>
                        <p><span className="font-medium">余额支撑月</span>：期末余额 ÷ 月均支出，评估资金缓冲</p>
                    </div>
                </div>
            )}
        </div>
    );
}
