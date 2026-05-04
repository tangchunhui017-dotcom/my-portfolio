'use client';

import { THRESHOLDS } from '@/config/thresholds';
import { FOOTWEAR_ANALYSIS_MODULES } from '@/config/footwearLanguage';
import type { CompareMode } from '@/hooks/useDashboardFilter';
import type { DashboardCompareMeta } from '@/config/dashboardCompare';
import { formatMoneyCny } from '@/config/numberFormat';

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
        good: { bg: 'bg-pink-50/60', border: 'border-pink-100', text: 'text-pink-700', grad: 'from-pink-400 via-rose-400 to-transparent' },
        warn: { bg: 'bg-amber-50/60', border: 'border-amber-100', text: 'text-amber-700', grad: 'from-amber-400 via-yellow-400 to-transparent' },
        danger: { bg: 'bg-red-50/60', border: 'border-red-100', text: 'text-red-700', grad: 'from-red-400 via-rose-500 to-transparent' },
        neutral: { bg: 'bg-slate-50/60', border: 'border-slate-100', text: 'text-slate-600', grad: 'from-slate-300 via-slate-400 to-transparent' },
    };
    const c = statusColors[item.status];
    const maskStyle = {
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor' as const,
        maskComposite: 'exclude' as const,
    };

    return (
        <div
            className={`relative rounded-2xl border ${c.bg} ${c.border} p-4 flex flex-col gap-1.5 transition-all duration-200 ${item.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''}`}
            onClick={item.onClick}
        >
            <div
                className={`absolute inset-0 pointer-events-none rounded-2xl border-l-[4px] border-transparent bg-gradient-to-b opacity-80 ${c.grad}`}
                style={maskStyle}
            />
            <div className="relative flex items-center justify-between">
                <span className="text-xl">{item.icon}</span>
                {item.delta !== undefined && (
                    <span className={`text-xs font-semibold ${item.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.delta >= 0 ? '▲' : '▼'} {Math.abs(item.delta).toFixed(1)}{item.deltaLabel || '%'}
                    </span>
                )}
            </div>
            <div className={`relative text-2xl font-bold ${c.text} leading-none`}>{item.value}</div>
            {item.subValue ? <div className="relative text-xs text-slate-400">{item.subValue}</div> : null}
            <div className="relative text-xs font-medium text-slate-400 mt-0.5">{item.label}</div>
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
        avgMarginRate: number;
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
    baselineKpis: BaselineKpis;
    compareMeta: DashboardCompareMeta;
    selectedModuleId?: string;
    onKpiClick?: (kpi: string) => void;
    onModuleChange?: (moduleId: string) => void;
}

function formatAmount(n: number) {
    return formatMoneyCny(n);
}

export default function OverviewKpiBar({
    kpis,
    compareMode,
    baselineKpis,
    compareMeta,
    selectedModuleId,
    onKpiClick,
    onModuleChange,
}: OverviewKpiBarProps) {
    const plan = kpis.planData?.overall_plan;


    const kpiItems: KpiItem[] = (() => {
        const st = kpis.avgSellThrough;
        const marginRate = kpis.avgMarginRate;
        const wos = kpis.wos;

        const calcDeltaPct = (current: number, baseline: number | undefined): number | undefined => {
            if (baseline === undefined || baseline === 0) return undefined;
            return ((current - baseline) / Math.abs(baseline)) * 100;
        };
        const calcDeltaPp = (current: number, baseline: number | undefined): number | undefined => {
            if (baseline === undefined) return undefined;
            return (current - baseline) * 100;
        };

        const salesDelta = (() => {
            if (compareMode === 'plan' && plan) return calcDeltaPct(kpis.totalNetSales, plan.plan_total_sales);
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis) return calcDeltaPct(kpis.totalNetSales, baselineKpis.totalNetSales);
            return undefined;
        })();

        const stDelta = (() => {
            if (compareMode === 'plan' && plan) return calcDeltaPp(st, plan.plan_avg_sell_through);
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis) return calcDeltaPp(st, baselineKpis.avgSellThrough);
            return undefined;
        })();

        const marginDelta = (() => {
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis) return calcDeltaPp(marginRate, baselineKpis.avgMarginRate);
            return undefined;
        })();

        const inventoryDelta = (() => {
            if (compareMode === 'plan' && plan) {
                return -((kpis.totalOnHandUnits - plan.plan_ending_inventory_units) / plan.plan_ending_inventory_units) * 100;
            }
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis?.totalOnHandUnits) {
                return calcDeltaPct(kpis.totalOnHandUnits, baselineKpis.totalOnHandUnits);
            }
            return undefined;
        })();

        const wosDelta = (() => {
            if (compareMode === 'plan' && plan) return -(wos - plan.plan_wos);
            if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis?.wos !== undefined) return wos - baselineKpis.wos;
            return undefined;
        })();

        const modeTag = compareMode !== 'none' ? compareMeta.modeLabel : undefined;
        const baselineSales = compareMode === 'plan' ? plan?.plan_total_sales : baselineKpis?.totalNetSales;
        const baselineSellThrough = compareMode === 'plan' ? plan?.plan_avg_sell_through : baselineKpis?.avgSellThrough;
        const baselineMargin = compareMode === 'plan' ? undefined : baselineKpis?.avgMarginRate;

        return [
            {
                label: '净销售额（鞋）',
                value: formatAmount(kpis.totalNetSales),
                subValue: baselineSales !== undefined ? `${modeTag} ${formatAmount(baselineSales)}` : undefined,
                delta: salesDelta,
                deltaLabel: '%',
                status: plan
                    ? (kpis.totalNetSales >= plan.plan_total_sales * 0.95 ? 'good' : kpis.totalNetSales >= plan.plan_total_sales * 0.85 ? 'warn' : 'danger')
                    : 'neutral',
                icon: '💰',
                onClick: () => onKpiClick?.('sales'),
            },
            {
                label: '季内累计售罄率',
                value: `${(st * 100).toFixed(1)}%`,
                subValue: baselineSellThrough !== undefined
                    ? `${modeTag} ${(baselineSellThrough * 100).toFixed(0)}%`
                    : `目标 ${(THRESHOLDS.sellThrough.target * 100).toFixed(0)}%`,
                delta: stDelta,
                deltaLabel: 'pp',
                status: st >= THRESHOLDS.sellThrough.target ? 'good' : st >= THRESHOLDS.sellThrough.warning ? 'warn' : 'danger',
                icon: '🎯',
                onClick: () => onKpiClick?.('sellThrough'),
            },
            {
                label: '毛利率',
                value: `${(marginRate * 100).toFixed(1)}%`,
                subValue: baselineMargin !== undefined
                    ? `${modeTag} ${(baselineMargin * 100).toFixed(1)}%`
                    : '折扣贡献后毛利效率',
                delta: marginDelta,
                deltaLabel: 'pp',
                status: marginRate >= 0.45 ? 'good' : marginRate >= 0.4 ? 'warn' : 'danger',
                icon: '💸',
                onClick: () => onKpiClick?.('margin'),
            },
            {
                label: '期末库存（双）',
                value: `${kpis.totalOnHandUnits.toLocaleString()} 双`,
                subValue: formatAmount(kpis.totalOnHandAmt),
                delta: inventoryDelta,
                deltaLabel: '%',
                status: wos <= 4 ? 'danger' : wos <= 8 ? 'warn' : wos <= 12 ? 'good' : 'warn',
                icon: '📦',
                onClick: () => onKpiClick?.('inventory'),
            },
            {
                label: '库存周转 WOS',
                value: `${wos.toFixed(1)} 周`,
                subValue: plan ? `目标 ${plan.plan_wos} 周` : '健康区间 5-8 周',
                delta: wosDelta,
                deltaLabel: ' 周',
                status: wos >= 4 && wos <= 10 ? 'good' : wos < 4 ? 'danger' : 'warn',
                icon: '🔄',
            },
            {
                label: '库存可售天数 DOS',
                value: `${kpis.dos.toFixed(0)} 天`,
                subValue: `≈ ${wos.toFixed(1)} 周 × 7`,
                status: kpis.dos >= 28 && kpis.dos <= 70 ? 'good' : kpis.dos < 28 ? 'danger' : 'warn',
                icon: '📅',
            },
        ];
    })();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <div className="mb-4">
                <div>
                    <h2 className="text-base font-bold text-slate-900">鞋类经营总览</h2>
                    <p className="text-xs text-slate-400 mt-0.5">库存健康快照 · 点击下方业务标签切换经营结论，点击指标卡联动下方图表</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpiItems.map((item) => (
                    <KpiMiniCard key={item.label} item={item} />
                ))}
            </div>

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
                    {'▲/▼ = 当期 vs ' + compareMeta.baselineLabel + '偏差'}
                </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
                {FOOTWEAR_ANALYSIS_MODULES.map((module) => {
                    const active = selectedModuleId === module.id;
                    return (
                        <button
                            key={module.id}
                            type="button"
                            onClick={() => onModuleChange?.(module.id)}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all duration-150 ${active
                                ? 'bg-pink-500 text-white shadow-sm shadow-pink-200'
                                : 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                                }`}
                            aria-pressed={active}
                        >
                            {module.title}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
