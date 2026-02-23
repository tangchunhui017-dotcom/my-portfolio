'use client';

import KpiCard from './KpiCard';
import type { CompareMode } from '@/hooks/useDashboardFilter';
import { formatMoneyCny } from '@/config/numberFormat';

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

function fmtSales(n: number) {
    return formatMoneyCny(n);
}

function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
}

/** 计算百分比差值 delta（字符串格式，带正负号） */
function pctDelta(current: number, baseline: number | undefined): string | undefined {
    if (baseline === undefined || baseline === 0) return undefined;
    const diff = ((current - baseline) / Math.abs(baseline)) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
}

/** 计算 pp 差值（百分点） */
function ppDelta(current: number, baseline: number | undefined): string | undefined {
    if (baseline === undefined) return undefined;
    const diff = (current - baseline) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`;
}

function isPositiveDelta(delta: string | undefined): boolean {
    if (!delta) return true;
    return !delta.startsWith('-');
}

export default function KpiGrid({ kpis, compareMode = 'none', baselineKpis, onSellThroughClick, onDiscountClick, onChannelClick, onMarginClick }: KpiGridProps) {
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

    // 渠道最大贡献
    const topChannel = Object.entries(kpis.channelSales).sort((a, b) => b[1] - a[1])[0];
    const topChannelPct = kpis.totalNetSales > 0 ? topChannel[1] / kpis.totalNetSales : 0;

    // 价格带集中度
    const priceBandEntries = Object.entries(kpis.priceBandSales).sort((a, b) => b[1].sales - a[1].sales);
    const topPriceBand = priceBandEntries[0];

    const PRICE_BAND_NAMES: Record<string, string> = {
        PB1: '¥199-299', PB2: '¥300-399', PB3: '¥400-499',
        PB4: '¥500-599', PB5: '¥600-699', PB6: '¥700+',
    };

    // 生成 Sparkline 数据（12周趋势）
    const stSparkline = kpis.weeklyData
        ? Object.keys(kpis.weeklyData).sort((a, b) => Number(a) - Number(b)).map(w => kpis.weeklyData![Number(w)].st * 100)
        : undefined;

    const marginSparkline = kpis.weeklyData
        ? Object.keys(kpis.weeklyData).sort((a, b) => Number(a) - Number(b)).map(w => kpis.weeklyData![Number(w)].marginRate * 100)
        : undefined;

    // 动态 delta（有 baselineKpis 时计算真实值）
    const hasBaseline = (compareMode === 'yoy' || compareMode === 'mom') && !!baselineKpis;
    const marginDelta = hasBaseline ? ppDelta(kpis.avgMarginRate, baselineKpis?.avgMarginRate) : '+1.2pp';
    const stDelta = hasBaseline ? ppDelta(kpis.avgSellThrough, baselineKpis?.avgSellThrough) : '+1.0pp';
    const currentDiscountRate = kpis.avgDiscountRate ?? (1 - kpis.avgDiscountDepth);
    const baselineDiscountRate = baselineKpis?.avgDiscountRate ?? (baselineKpis?.avgDiscountDepth !== undefined ? 1 - baselineKpis.avgDiscountDepth : undefined);
    const discountRateDelta = hasBaseline ? ppDelta(currentDiscountRate, baselineDiscountRate) : '+0.5pp';
    const profitDelta = hasBaseline ? pctDelta(kpis.totalGrossProfit, baselineKpis?.totalGrossProfit) : '+14.1%';

    const marginDeltaPositive = hasBaseline ? isPositiveDelta(marginDelta) : true;
    const stDeltaPositive = hasBaseline ? isPositiveDelta(stDelta) : true;
    const discountRateDeltaPositive = hasBaseline ? isPositiveDelta(discountRateDelta) : true;
    const profitDeltaPositive = hasBaseline ? isPositiveDelta(profitDelta) : true;

    const modeLabel = compareMode === 'yoy' ? 'YoY' : compareMode === 'mom' ? 'MoM' : '';

    return (
        <div>
            {/* Group A: 结果 */}
            <div className="mb-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    A · 结果 Outcome
                    {modeLabel && <span className="text-[10px] text-pink-400 bg-pink-50 px-1.5 py-0.5 rounded">{modeLabel} 对比</span>}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard
                        group="outcome"
                        label="毛利率"
                        value={fmtPct(kpis.avgMarginRate)}
                        delta={marginDelta}
                        deltaLabel={modeLabel}
                        deltaPositive={marginDeltaPositive}
                        gap="+0.8pp"
                        gapPositive={true}
                        hint={marginDelta ? (marginDeltaPositive ? '✅ 折扣管控有效' : '⚠️ 毛利率承压') : undefined}
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

            {/* Group B: 效率 */}
            <div className="mb-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    B · 效率 Efficiency
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard
                        variant="compact"
                        group="efficiency"
                        label="动销SKU（色码）"
                        value={`${kpis.activeSKUs} 款`}
                    />
                    <KpiCard
                        variant="compact"
                        group="efficiency"
                        label="平均折扣率"
                        value={fmtPct(currentDiscountRate)}
                        delta={discountRateDelta}
                        deltaLabel={modeLabel}
                        deltaPositive={discountRateDeltaPositive}
                        hint={`折扣深度 ${fmtPct(kpis.avgDiscountDepth)}`}
                        onClick={onDiscountClick}
                    />
                    <KpiCard
                        variant="compact"
                        group="efficiency"
                        label="毛利额"
                        value={fmtSales(kpis.totalGrossProfit)}
                        delta={profitDelta}
                        deltaLabel={modeLabel}
                        deltaPositive={profitDeltaPositive}
                    />
                    <KpiCard
                        variant="compact"
                        group="efficiency"
                        label="MSRP金额（吊牌额）"
                        value={fmtSales(kpis.totalGrossSales)}
                    />
                </div>
            </div>

            {/* Group C: 结构 */}
            <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    C · 结构 Structure
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 左框：集中度 + 渠道 */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-2 gap-3">
                        <KpiCard
                            variant="minimal"
                            group="structure"
                            label="Top10 集中度"
                            value={fmtPct(kpis.top10Concentration)}
                            hint={kpis.top10Concentration > 0.7 ? '⚠️ 集中度偏高' : '✅ 结构合理'}
                        />
                        <KpiCard
                            variant="minimal"
                            group="structure"
                            label="最强渠道"
                            value={topChannel ? topChannel[0] : '-'}
                            delta={topChannel ? fmtPct(topChannelPct) : '-'}
                            deltaPositive={true}
                            hint={topChannelPct > 0.6 ? '⚠️ 渠道过度集中' : '✅ 渠道健康'}
                            onClick={onChannelClick}
                        />
                    </div>
                    {/* 右框：价格带 + 折扣损失 */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-2 gap-3">
                        <KpiCard
                            variant="minimal"
                            group="structure"
                            label="核心价格带"
                            value={topPriceBand ? PRICE_BAND_NAMES[topPriceBand[0]] : '-'}
                            hint="📊 销售额最高价格带"
                        />
                        <KpiCard
                            variant="minimal"
                            group="structure"
                            label="折扣损失额"
                            value={fmtSales(kpis.totalGrossSales - kpis.totalNetSales)}
                            hint={
                                (kpis.totalGrossSales - kpis.totalNetSales) / kpis.totalGrossSales > 0.15
                                    ? '⚠️ 折扣损失超15%'
                                    : '✅ 折扣损失可控'
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
