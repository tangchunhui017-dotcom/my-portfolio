'use client';

import { useResolvedThresholds } from '@/hooks/useResolvedThresholds';
import type { CompareMode } from '@/hooks/useDashboardFilter';
import type { DashboardCompareMeta } from '@/config/dashboardCompare';
import { formatMoneyCny } from '@/config/numberFormat';

// ── 季节进度条 ────────────────────────────────────────────────
const ST_TARGET = 0.8;

/** 根据 season 过滤器推算当季总周数 */
function resolveSeasonTotalWeeks(season: string): number {
    const s = String(season || 'all');
    // 单季: Q1/Q2/Q3/Q4 各 12 周
    if (/^Q[1-4]$/i.test(s) || /spring|summer|fall|autumn|winter/i.test(s)) return 12;
    // 半年: 上半年/下半年 24 周
    if (/half|h[12]/i.test(s)) return 24;
    // 全年 48 周
    return 48;
}

function SeasonProgressStrip({
    currentWeek,
    seasonLabel,
    avgSellThrough,
    seasonYear,
    season,
}: {
    currentWeek: number;
    seasonLabel: string;
    avgSellThrough: number;
    seasonYear: number | 'all';
    season: string;
}) {
    if (currentWeek === 0) return null;
    const SEASON_TOTAL_WEEKS = resolveSeasonTotalWeeks(season);
    const progress = Math.min(currentWeek / SEASON_TOTAL_WEEKS, 1);
    const expectedST = progress * ST_TARGET;
    const stGap = avgSellThrough - expectedST;
    const weeksLeft = Math.max(SEASON_TOTAL_WEEKS - currentWeek, 0);
    const yearLabel = seasonYear !== 'all' ? `${seasonYear}年` : '';
    const tone = stGap >= -0.02 ? 'emerald' : stGap >= -0.08 ? 'amber' : 'red';
    const toneText = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' }[tone];
    const toneBar = { emerald: 'bg-emerald-400', amber: 'bg-amber-400', red: 'bg-red-400' }[tone];
    const toneMsg = stGap >= -0.02 ? '✓ 售罄节奏正常' : stGap >= -0.08 ? '⚠ 售罄略慢' : '⚡ 售罄需加速';
    return (
        <div className="mb-4 bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        {yearLabel} {seasonLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">W{currentWeek} / W{SEASON_TOTAL_WEEKS}</span>
                    {weeksLeft > 0 && (
                        <span className="text-[11px] text-slate-400">
                            · 距季末 <span className="font-semibold text-slate-700">{weeksLeft} 周</span>
                        </span>
                    )}
                </div>
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${toneText}`}>
                    {toneMsg}
                    <span className="opacity-60">{stGap >= 0 ? '+' : ''}{(stGap * 100).toFixed(1)}pp</span>
                </span>
            </div>
            <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-slate-300/60 rounded-full"
                    style={{ width: `${Math.min(expectedST / ST_TARGET, 1) * 100}%` }}
                />
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${toneBar}`}
                    style={{ width: `${Math.min(avgSellThrough / ST_TARGET, 1) * 100}%` }}
                />
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-600/70 z-10"
                    style={{ left: `${Math.min(progress * 100, 99)}%` }}
                />
            </div>
            <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">开季</span>
                <span className="text-[10px] text-slate-400">目标线 {(ST_TARGET * 100).toFixed(0)}%</span>
                <span className="text-[10px] text-slate-400">季末 W{SEASON_TOTAL_WEEKS}</span>
            </div>
        </div>
    );
}

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
        good: { bg: 'bg-white', border: 'border-slate-100', accent: 'bg-emerald-400', text: 'text-slate-800' },
        warn: { bg: 'bg-white', border: 'border-slate-100', accent: 'bg-amber-400', text: 'text-slate-800' },
        danger: { bg: 'bg-white', border: 'border-slate-100', accent: 'bg-rose-500', text: 'text-slate-800' },
        neutral: { bg: 'bg-white', border: 'border-slate-100', accent: 'bg-slate-200', text: 'text-slate-800' },
    };
    const c = statusColors[item.status];

    return (
        <div
            className={`group relative rounded-2xl border ${c.bg} ${c.border} overflow-hidden shadow-sm p-4 flex flex-col gap-1.5 transition-all duration-200 ${item.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-slate-300' : ''}`}
            onClick={item.onClick}
        >
            {/* 左侧彩色提示条 */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${c.accent} transition-transform duration-300 ${item.onClick ? 'origin-left group-hover:scale-x-110' : ''}`} />
            <div className="relative flex items-center justify-between">
                <span className="text-xl">{item.icon}</span>
                {item.delta !== undefined && (
                    <span className={`text-xs font-semibold ${item.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.delta >= 0 ? '▲' : '▼'} {Math.abs(item.delta).toFixed(1)}{item.deltaLabel || '%'}
                    </span>
                )}
            </div>
            <div className={`relative text-2xl font-bold ${c.text} leading-none`}>{item.value}</div>
            {item.status === 'danger' && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
            )}
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
    fullPriceSellThrough?: number | null;
} | null;

interface OverviewKpiBarProps {
    kpis: {
        totalNetSales: number;
        avgSellThrough: number;
        avgMarginRate: number;
        activeSKUs: number;
        totalOnHandUnits: number;
        totalOnHandAmt: number;
        wos: number;
        dos: number;
        fullPriceSellThrough?: number | null;
        discountedSellThrough?: number | null;
        newGoodsShare?: number;
        currentWeekNum?: number;
        seasonLabel?: string;
        arrivalRateProxy?: number | null;
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
    onKpiClick?: (kpi: string) => void;
    filters?: { season_year: number | 'all'; season?: string };
}

function formatAmount(n: number) {
    return formatMoneyCny(n);
}

export default function OverviewKpiBar({
    kpis,
    compareMode,
    baselineKpis,
    compareMeta,
    onKpiClick,
    filters,
}: OverviewKpiBarProps) {
    const plan = kpis.planData?.overall_plan;
    const THRESHOLDS = useResolvedThresholds();


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
                    : `目标 ${(THRESHOLDS.sellThrough.target * 100).toFixed(0)}% · 含折扣全品`,
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
                subValue: compareMode === 'none'
                    ? `库销比 ${(wos / 4.33).toFixed(1)} 月 · ${formatAmount(kpis.totalOnHandAmt)}`
                    : formatAmount(kpis.totalOnHandAmt),
                delta: inventoryDelta,
                deltaLabel: '%',
                status: wos < 4 ? 'danger' : wos <= 8 ? 'good' : wos <= 12 ? 'warn' : 'danger',
                icon: '📦',
                onClick: () => onKpiClick?.('inventory'),
            },
            {
                label: '库存周转 WOS',
                value: `${wos.toFixed(1)} 周`,
                subValue: plan ? `目标 ${plan.plan_wos} 周` : '健康区间 4-8 周',
                delta: wosDelta,
                deltaLabel: ' 周',
                status: wos >= 4 && wos <= 8 ? 'good' : (wos < 4 || wos > 12) ? 'danger' : 'warn',
                icon: '🔄',
                onClick: () => onKpiClick?.('wos'),
            },
            {
                label: '正价售罄率',
                value: kpis.fullPriceSellThrough != null ? `${(kpis.fullPriceSellThrough * 100).toFixed(1)}%` : '--',
                subValue: (() => {
                    if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis?.fullPriceSellThrough != null) {
                        return `${compareMeta.modeLabel} ${(baselineKpis.fullPriceSellThrough * 100).toFixed(1)}%`;
                    }
                    return kpis.discountedSellThrough != null
                        ? `折扣品(折扣>5%) ${(kpis.discountedSellThrough * 100).toFixed(1)}%`
                        : '正价=折扣深度<5% SKU均値';
                })(),
                delta: (() => {
                    if ((compareMode === 'yoy' || compareMode === 'mom') && baselineKpis?.fullPriceSellThrough != null && kpis.fullPriceSellThrough != null) {
                        return (kpis.fullPriceSellThrough - baselineKpis.fullPriceSellThrough) * 100;
                    }
                    return undefined;
                })(),
                deltaLabel: 'pp',
                status: kpis.fullPriceSellThrough == null ? 'neutral'
                    : kpis.fullPriceSellThrough >= 0.75 ? 'good'
                    : kpis.fullPriceSellThrough >= 0.60 ? 'warn' : 'danger',
                icon: '💰',
                onClick: () => onKpiClick?.('sellThrough'),
            },
        ];
    })();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <div className="mb-4">
                <div>
                    <h2 className="text-base font-bold text-slate-900">鞋类经营总览</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {filters?.season_year && filters.season_year !== 'all' ? `${filters.season_year}年` : '全年跊度'}·全渠道·全品类大盘
                    </p>
                </div>
            </div>
            <SeasonProgressStrip
                currentWeek={kpis.currentWeekNum ?? 0}
                seasonLabel={kpis.seasonLabel ?? '全年'}
                avgSellThrough={kpis.avgSellThrough}
                seasonYear={filters?.season_year ?? 'all'}
                season={String(filters?.season ?? 'all')}
            />
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
        </div>
    );
}
