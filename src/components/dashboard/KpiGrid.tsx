'use client';

import KpiCard from './KpiCard';
import type { CompareMode } from '@/hooks/useDashboardFilter';

type BaselineKpis = {
    totalNetSales: number;
    totalGrossSales?: number;
    totalUnits?: number;
    totalGrossProfit?: number;
    avgSellThrough: number;
    avgMarginRate?: number;
    avgDiscountRate?: number;
    avgDiscountDepth?: number;
    activeSKUs?: number;
    wos?: number;
} | null;

interface KpiGridProps {
    kpis: {
        totalNetSales: number;
        totalGrossSales: number;
        totalUnits: number;
        totalGrossProfit: number;
        avgSellThrough: number;
        avgMarginRate: number;
        avgDiscountRate?: number;
        avgDiscountDepth: number;
        activeSKUs: number;
        top10Concentration: number;
        channelSales: Record<string, number>;
        priceBandSales: Record<string, { units: number; sales: number }>;
        weeklyData?: Record<number, { units: number; sales: number; st: number; marginRate: number }>;
    } | null;
    compareMode?: CompareMode;
    baselineKpis?: BaselineKpis;
    onSellThroughClick?: () => void;
    onDiscountClick?: () => void;
    onChannelClick?: () => void;
    onMarginClick?: () => void;
}

function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
}

function ppDelta(current: number, baseline: number | undefined): string | undefined {
    if (baseline === undefined) return undefined;
    const diff = (current - baseline) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`;
}

function isPositiveDelta(delta: string | undefined): boolean {
    if (!delta) return true;
    return !delta.startsWith('-');
}

export default function KpiGrid({ kpis, compareMode = 'none', baselineKpis, onSellThroughClick, onMarginClick }: KpiGridProps) {
    if (!kpis) {
        return (
            <div className="flex items-center justify-center h-40 text-slate-400">
                <div className="text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <div>无数据，建议放宽筛选条件</div>
                </div>
            </div>
        );
    }

    const stSparkline = kpis.weeklyData
        ? Object.keys(kpis.weeklyData).sort((a, b) => Number(a) - Number(b)).map((w) => kpis.weeklyData![Number(w)].st * 100)
        : undefined;

    const marginSparkline = kpis.weeklyData
        ? Object.keys(kpis.weeklyData).sort((a, b) => Number(a) - Number(b)).map((w) => kpis.weeklyData![Number(w)].marginRate * 100)
        : undefined;

    const hasBaseline = (compareMode === 'yoy' || compareMode === 'mom') && !!baselineKpis;
    const marginDelta = hasBaseline ? ppDelta(kpis.avgMarginRate, baselineKpis?.avgMarginRate) : '+1.2pp';
    const stDelta = hasBaseline ? ppDelta(kpis.avgSellThrough, baselineKpis?.avgSellThrough) : '+1.0pp';

    const marginDeltaPositive = hasBaseline ? isPositiveDelta(marginDelta) : true;
    const stDeltaPositive = hasBaseline ? isPositiveDelta(stDelta) : true;
    const modeLabel = compareMode === 'yoy' ? 'YoY' : compareMode === 'mom' ? 'MoM' : '';

    return (
        <div>
            <div className="mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    A · 结果 Outcome
                    {modeLabel ? <span className="text-[10px] text-pink-400 bg-pink-50 px-1.5 py-0.5 rounded">{modeLabel} 对比</span> : null}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <KpiCard
                        group="outcome"
                        label="毛利率"
                        value={fmtPct(kpis.avgMarginRate)}
                        delta={marginDelta}
                        deltaLabel={modeLabel}
                        deltaPositive={marginDeltaPositive}
                        gap="+0.8pp"
                        gapPositive={true}
                        hint={marginDeltaPositive ? '✅ 折扣管控有效' : '⚠️ 毛利率承压'}
                        hintType={marginDeltaPositive ? 'opportunity' : 'warning'}
                        sparklineData={marginSparkline}
                        onClick={onMarginClick}
                    />
                    <KpiCard
                        group="outcome"
                        label="季内售罄率"
                        value={fmtPct(kpis.avgSellThrough)}
                        delta={stDelta}
                        deltaLabel={modeLabel}
                        deltaPositive={stDeltaPositive}
                        hint={stDeltaPositive ? '✅ 去化节奏稳定' : '⚠️ 去化节奏偏慢'}
                        hintType={stDeltaPositive ? 'opportunity' : 'warning'}
                        sparklineData={stSparkline}
                        onClick={onSellThroughClick}
                    />
                </div>
            </div>
        </div>
    );
}