'use client';

import { useMemo, useState } from 'react';
import { THRESHOLDS } from '@/config/thresholds';

type CompareMode = 'none' | 'yoy' | 'mom' | 'plan';

interface KpiItem {
    label: string;
    value: string;
    subValue?: string;
    delta?: number;       // +/- 百分点或百分比
    deltaLabel?: string;
    status: 'good' | 'warn' | 'danger' | 'neutral';
    onClick?: () => void;
    icon: string;
}

function KpiMiniCard({ item }: { item: KpiItem }) {
    const statusColors = {
        good: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', delta: 'text-emerald-600' },
        warn: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', delta: 'text-amber-600' },
        danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', delta: 'text-red-600' },
        neutral: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', delta: 'text-slate-500' },
    };
    const c = statusColors[item.status];

    return (
        <div
            className={`rounded-xl border ${c.bg} ${c.border} p-4 flex flex-col gap-1.5 transition-all duration-200 ${item.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
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
            {item.subValue && <div className="text-xs text-slate-500">{item.subValue}</div>}
            <div className="text-xs font-medium text-slate-500 mt-0.5">{item.label}</div>
        </div>
    );
}

interface OverviewKpiBarProps {
    kpis: {
        totalNetSales: number;
        totalGrossProfit: number;
        avgMarginRate: number;
        avgSellThrough: number;
        activeSKUs: number;
        totalOnHandUnits: number;
        totalOnHandAmt: number;
        wos: number;
        dos: number;
        avgDiscountDepth: number;
        planData?: {
            overall_plan: {
                plan_total_sales: number;
                plan_avg_sell_through: number;
                plan_avg_margin_rate: number;
                plan_active_skus: number;
                plan_ending_inventory_units: number;
                plan_wos: number;
                plan_avg_discount_depth: number;
            };
        };
    };
    onKpiClick?: (kpi: string) => void;
}

function fmt万(n: number) {
    if (n >= 1e8) return `¥${(n / 1e8).toFixed(2)}亿`;
    if (n >= 1e4) return `¥${(n / 1e4).toFixed(1)}万`;
    return `¥${n.toLocaleString()}`;
}

export default function OverviewKpiBar({ kpis, onKpiClick }: OverviewKpiBarProps) {
    const [compareMode, setCompareMode] = useState<CompareMode>('plan');

    const plan = kpis.planData?.overall_plan;

    // 计算对比 delta（vs 计划）
    const getPlanDelta = (actual: number, planVal?: number): number | undefined => {
        if (compareMode !== 'plan' || planVal == null) return undefined;
        return ((actual - planVal) / planVal) * 100;
    };

    const kpiItems: KpiItem[] = useMemo(() => {
        const st = kpis.avgSellThrough;
        const margin = kpis.avgMarginRate;
        const discount = kpis.avgDiscountDepth;
        const wos = kpis.wos;

        return [
            {
                label: '净销售额',
                value: fmt万(kpis.totalNetSales),
                subValue: plan ? `计划 ${fmt万(plan.plan_total_sales)}` : undefined,
                delta: getPlanDelta(kpis.totalNetSales, plan?.plan_total_sales),
                deltaLabel: '%',
                status: plan ? (kpis.totalNetSales >= plan.plan_total_sales * 0.95 ? 'good' : kpis.totalNetSales >= plan.plan_total_sales * 0.85 ? 'warn' : 'danger') : 'neutral',
                icon: '💰',
                onClick: () => onKpiClick?.('sales'),
            },
            {
                label: '毛利额',
                value: fmt万(kpis.totalGrossProfit),
                subValue: `毛利率 ${(margin * 100).toFixed(1)}%`,
                delta: getPlanDelta(margin, plan?.plan_avg_margin_rate),
                deltaLabel: 'pp',
                status: margin >= THRESHOLDS.marginRate.target ? 'good' : margin >= THRESHOLDS.marginRate.warning ? 'warn' : 'danger',
                icon: '📊',
            },
            {
                label: '毛利率',
                value: `${(margin * 100).toFixed(1)}%`,
                subValue: plan ? `目标 ${(plan.plan_avg_margin_rate * 100).toFixed(0)}%` : `目标 ${(THRESHOLDS.marginRate.target * 100).toFixed(0)}%`,
                delta: plan ? (margin - plan.plan_avg_margin_rate) * 100 : undefined,
                deltaLabel: 'pp',
                status: margin >= THRESHOLDS.marginRate.target ? 'good' : margin >= THRESHOLDS.marginRate.warning ? 'warn' : 'danger',
                icon: '📈',
                onClick: () => onKpiClick?.('margin'),
            },
            {
                label: '累计售罄率',
                value: `${(st * 100).toFixed(1)}%`,
                subValue: plan ? `目标 ${(plan.plan_avg_sell_through * 100).toFixed(0)}%` : `目标 ${(THRESHOLDS.sellThrough.target * 100).toFixed(0)}%`,
                delta: plan ? (st - plan.plan_avg_sell_through) * 100 : undefined,
                deltaLabel: 'pp',
                status: st >= THRESHOLDS.sellThrough.target ? 'good' : st >= THRESHOLDS.sellThrough.warning ? 'warn' : 'danger',
                icon: '🎯',
                onClick: () => onKpiClick?.('sellThrough'),
            },
            {
                label: '动销 SKU',
                value: `${kpis.activeSKUs} 款`,
                subValue: plan ? `计划 ${plan.plan_active_skus} 款` : undefined,
                delta: getPlanDelta(kpis.activeSKUs, plan?.plan_active_skus),
                deltaLabel: '%',
                status: 'neutral',
                icon: '👟',
                onClick: () => onKpiClick?.('sku'),
            },
            {
                label: '期末库存（双）',
                value: `${kpis.totalOnHandUnits.toLocaleString()} 双`,
                subValue: fmt万(kpis.totalOnHandAmt),
                delta: plan ? -(kpis.totalOnHandUnits - plan.plan_ending_inventory_units) / plan.plan_ending_inventory_units * 100 : undefined,
                deltaLabel: '%',
                status: wos <= 4 ? 'danger' : wos <= 8 ? 'warn' : wos <= 12 ? 'good' : 'warn',
                icon: '📦',
                onClick: () => onKpiClick?.('inventory'),
            },
            {
                label: 'WOS（周转周数）',
                value: `${wos} 周`,
                subValue: plan ? `目标 ${plan.plan_wos} 周` : '目标 5-8 周',
                delta: plan ? -(wos - plan.plan_wos) : undefined,
                deltaLabel: ' 周',
                status: wos >= 4 && wos <= 10 ? 'good' : wos < 4 ? 'danger' : 'warn',
                icon: '🔄',
            },
            {
                label: 'DOS（天数）',
                value: `${kpis.dos.toFixed(0)} 天`,
                subValue: `≈ WOS × 7`,
                status: kpis.dos >= 28 && kpis.dos <= 70 ? 'good' : kpis.dos < 28 ? 'danger' : 'warn',
                icon: '📅',
            },
            {
                label: '平均折扣深度',
                value: `${(discount * 100).toFixed(1)}%`,
                subValue: plan ? `目标 ≤${(plan.plan_avg_discount_depth * 100).toFixed(0)}%` : `目标 ≤${(THRESHOLDS.discountDepth.warning * 100).toFixed(0)}%`,
                delta: plan ? -(discount - plan.plan_avg_discount_depth) * 100 : undefined,
                deltaLabel: 'pp',
                status: discount <= THRESHOLDS.discountDepth.warning ? 'good' : discount <= THRESHOLDS.discountDepth.danger ? 'warn' : 'danger',
                icon: '🏷️',
                onClick: () => onKpiClick?.('discount'),
            },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kpis, compareMode]);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-bold text-slate-900">经营总览</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Overview — 点击指标卡联动下方图表</p>
                </div>
                {/* 对比方式切换 */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    {([
                        { key: 'none', label: '无对比' },
                        { key: 'plan', label: 'vs 计划' },
                        { key: 'mom', label: '环比' },
                        { key: 'yoy', label: '同比' },
                    ] as { key: CompareMode; label: string }[]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setCompareMode(key)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${compareMode === key
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
                {kpiItems.map((item) => (
                    <KpiMiniCard key={item.label} item={item} />
                ))}
            </div>

            {/* 状态说明 */}
            {compareMode === 'plan' && (
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span>▲/▼ = 实际 vs 计划偏差</span>
                    <span className="text-emerald-600">●</span><span>达成目标</span>
                    <span className="text-amber-600">●</span><span>轻微偏差</span>
                    <span className="text-red-500">●</span><span>显著偏差</span>
                </div>
            )}
            {(compareMode === 'mom' || compareMode === 'yoy') && (
                <div className="text-xs text-slate-400 mt-3">
                    ⚠️ 同比/环比对比需历史期数据，当前展示 vs 计划模式下数值
                </div>
            )}
        </div>
    );
}
