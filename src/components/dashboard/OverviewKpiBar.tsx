'use client';

import { useMemo } from 'react';
import { THRESHOLDS } from '@/config/thresholds';
import { FOOTWEAR_ANALYSIS_MODULES } from '@/config/footwearLanguage';
import type { CompareMode } from '@/hooks/useDashboardFilter';

interface KpiItem {
    label: string;
    value: string;
    subValue?: string;
    delta?: number;
    deltaLabel?: string;
    status: 'good' | 'warn' | 'danger' | 'neutral';
    onClick?: () => void;
    icon: string;
}

function KpiMiniCard({ item }: { item: KpiItem }) {
    const statusColors = {
        good: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
        warn: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
        danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
        neutral: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
    };
    const c = statusColors[item.status];

    return (
        <div
            className={`rounded-2xl border ${c.bg} ${c.border} p-4 flex flex-col gap-1.5 transition-all duration-200 ${item.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''}`}
            onClick={item.onClick}
        >
            <div className="flex items-center justify-between">
                <span className="text-xl">{item.icon}</span>
                {item.delta !== undefined && (
                    <span className={`text-xs font-semibold ${item.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.delta >= 0 ? '▲' : '▼'} {Math.abs(item.delta).toFixed(1)}{item.deltaLabel || '%'}
                    </span>
                )}
            </div>
            <div className={`text-2xl font-bold ${c.text} leading-none`}>{item.value}</div>
            {item.subValue && <div className="text-xs text-slate-400">{item.subValue}</div>}
            <div className="text-xs font-medium text-slate-400 mt-0.5">{item.label}</div>
        </div>
    );
}

type BaselineKpis = {
    totalNetSales: number;
    avgSellThrough: number;
    totalOnHandUnits?: number;
    wos?: number;
    avgMarginRate?: number;
    avgDiscountDepth?: number;
    activeSKUs?: number;
} | null;

interface OverviewKpiBarProps {
    kpis: {
        totalNetSales: number;
        avgSellThrough: number;
        totalOnHandUnits: number;
        totalOnHandAmt: number;
        wos: number;
        dos: number;
        planData?: {
            overall_plan: {
                plan_total_sales: number;
                plan_avg_sell_through: number;
                plan_ending_inventory_units: number;
                plan_wos: number;
            };
        };
    };
    compareMode: CompareMode;
    onCompareModeChange: (mode: CompareMode) => void;
    baselineKpis: BaselineKpis;
    onKpiClick?: (kpi: string) => void;
}

function fmt万(n: number) {
    if (n >= 1e8) return `¥${(n / 1e8).toFixed(2)}亿`;
    if (n >= 1e4) return `¥${(n / 1e4).toFixed(1)}万`;
    return `¥${n.toLocaleString()}`;
}

export default function OverviewKpiBar({ kpis, compareMode, onCompareModeChange, baselineKpis, onKpiClick }: OverviewKpiBarProps) {
    const plan = kpis.planData?.overall_plan;

    const compareModeLabel: Record<CompareMode, string> = {
        none: '无对比',
        plan: 'vs 计划',
        mom: '环比上季',
        yoy: '同比去年',
    };

    const kpiItems: KpiItem[] = useMemo(() => {
        const st = kpis.avgSellThrough;
        const wos = kpis.wos;

        // 计算 delta 的辅助函数
        const calcDeltaPct = (current: number, baseline: number | undefined): number | undefined => {
            if (baseline === undefined || baseline === 0) return undefined;
            return ((current - baseline) / Math.abs(baseline)) * 100;
        };
        const calcDeltaPp = (current: number, baseline: number | undefined): number | undefined => {
            if (baseline === undefined) return undefined;
            return (current - baseline) * 100;
        };

        // 根据 compareMode 决定 delta 来源
        const salesDelta = (() => {
            if (compareMode === 'plan' && plan)
                return calcDeltaPct(kpis.totalNetSales, plan.plan_total_sales);
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis)
                return calcDeltaPct(kpis.totalNetSales, baselineKpis.totalNetSales);
            return undefined;
        })();

        const stDelta = (() => {
            if (compareMode === 'plan' && plan)
                return calcDeltaPp(st, plan.plan_avg_sell_through);
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis)
                return calcDeltaPp(st, baselineKpis.avgSellThrough);
            return undefined;
        })();

        const inventoryDelta = (() => {
            if (compareMode === 'plan' && plan)
                return -(kpis.totalOnHandUnits - plan.plan_ending_inventory_units) / plan.plan_ending_inventory_units * 100;
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis?.totalOnHandUnits)
                return calcDeltaPct(kpis.totalOnHandUnits, baselineKpis.totalOnHandUnits);
            return undefined;
        })();

        const wosDelta = (() => {
            if (compareMode === 'plan' && plan) return -(wos - plan.plan_wos);
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis?.wos !== undefined)
                return wos - baselineKpis.wos;
            return undefined;
        })();

        // subValue 说明标签
        const modeTag = compareMode !== 'none' ? compareModeLabel[compareMode] : undefined;
        const baselineSales = compareMode === 'plan' ? plan?.plan_total_sales : baselineKpis?.totalNetSales;
        const baselineST = compareMode === 'plan' ? plan?.plan_avg_sell_through : baselineKpis?.avgSellThrough;

        return [
            {
                label: '净销售额（鞋）',
                value: fmt万(kpis.totalNetSales),
                subValue: baselineSales !== undefined ? `${modeTag} ${fmt万(baselineSales)}` : undefined,
                delta: salesDelta,
                deltaLabel: '%',
                status: plan
                    ? (kpis.totalNetSales >= plan.plan_total_sales * 0.95 ? 'good'
                        : kpis.totalNetSales >= plan.plan_total_sales * 0.85 ? 'warn' : 'danger')
                    : 'neutral',
                icon: '💰',
                onClick: () => onKpiClick?.('sales'),
            },
            {
                label: '季内累计售罄率',
                value: `${(st * 100).toFixed(1)}%`,
                subValue: baselineST !== undefined
                    ? `${modeTag} ${(baselineST * 100).toFixed(0)}%`
                    : `目标 ${(THRESHOLDS.sellThrough.target * 100).toFixed(0)}%`,
                delta: stDelta,
                deltaLabel: 'pp',
                status: st >= THRESHOLDS.sellThrough.target ? 'good' : st >= THRESHOLDS.sellThrough.warning ? 'warn' : 'danger',
                icon: '🎯',
                onClick: () => onKpiClick?.('sellThrough'),
            },
            {
                label: '期末库存（双）',
                value: `${kpis.totalOnHandUnits.toLocaleString()} 双`,
                subValue: fmt万(kpis.totalOnHandAmt),
                delta: inventoryDelta,
                deltaLabel: '%',
                status: wos <= 4 ? 'danger' : wos <= 8 ? 'warn' : wos <= 12 ? 'good' : 'warn',
                icon: '📦',
                onClick: () => onKpiClick?.('inventory'),
            },
            {
                label: '库存周转 WOS',
                value: `${wos} 周`,
                subValue: plan ? `目标 ${plan.plan_wos} 周` : '健康区间 5-8 周',
                delta: wosDelta,
                deltaLabel: ' 周',
                status: wos >= 4 && wos <= 10 ? 'good' : wos < 4 ? 'danger' : 'warn',
                icon: '🔄',
            },
            {
                label: '库存可售天数 DOS',
                value: `${kpis.dos.toFixed(0)} 天`,
                subValue: `≈ ${wos} 周 × 7`,
                status: kpis.dos >= 28 && kpis.dos <= 70 ? 'good' : kpis.dos < 28 ? 'danger' : 'warn',
                icon: '📅',
            },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kpis, compareMode, baselineKpis]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-bold text-slate-900">鞋类经营总览</h2>
                    <p className="text-xs text-slate-400 mt-0.5">库存健康快照 — 点击指标卡联动下方图表</p>
                </div>
                {/* 对比方式切换（受控） */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                    {(['none', 'plan', 'mom', 'yoy'] as CompareMode[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => onCompareModeChange(key)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${compareMode === key
                                ? 'bg-white text-pink-600 shadow-sm font-semibold'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {compareModeLabel[key]}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid - 5 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {kpiItems.map((item) => (
                    <KpiMiniCard key={item.label} item={item} />
                ))}
            </div>

            {/* 状态说明 */}
            {compareMode === 'plan' && (
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span>▲/▼ = 实际 vs 计划偏差</span>
                    <span className="text-pink-500">●</span><span>达成目标</span>
                    <span className="text-amber-500">●</span><span>轻微偏差</span>
                    <span className="text-red-500">●</span><span>显著偏差</span>
                </div>
            )}
            {compareMode === 'yoy' && (
                <div className="text-xs text-slate-400 mt-3">
                    ▲/▼ = 当期 vs 去年同期偏差（基于同结构历史数据）
                </div>
            )}
            {compareMode === 'mom' && (
                <div className="text-xs text-slate-400 mt-3">
                    ▲/▼ = 当期 vs 上一季度环比偏差
                </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
                {FOOTWEAR_ANALYSIS_MODULES.map((m) => (
                    <span key={m.id} className="text-[10px] px-2 py-1 rounded-full bg-pink-50 text-pink-500 font-medium">
                        {m.title}
                    </span>
                ))}
            </div>
        </div>
    );
}
