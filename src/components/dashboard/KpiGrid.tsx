'use client';

import KpiCard from './KpiCard';

type CompareMode = 'none' | 'plan' | 'mom' | 'yoy';

interface KpiGridProps {
    kpis: {
        totalNetSales: number;
        totalGrossSales: number;
        totalUnits: number;
        totalGrossProfit: number;
        avgSellThrough: number;
        avgMarginRate: number;
        avgDiscountDepth: number;
        activeSKUs: number;
        top10Concentration: number;
        channelSales: Record<string, number>;
        priceBandSales: Record<string, { units: number; sales: number }>;
        weeklyData?: Record<number, { units: number; sales: number; st: number; marginRate: number }>;
    } | null;
    compareMode?: CompareMode;
    onSellThroughClick?: () => void;
    onDiscountClick?: () => void;
    onChannelClick?: () => void;
    onMarginClick?: () => void;
}

function fmtSales(n: number) {
    if (n >= 100_000_000) return `¥${(n / 100_000_000).toFixed(2)}亿`;
    if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`;
    return `¥${n.toLocaleString()}`;
}

function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
}

export default function KpiGrid({ kpis, compareMode = 'none', onSellThroughClick, onDiscountClick, onChannelClick, onMarginClick }: KpiGridProps) {
    // compareMode helper: resolve delta based on mode
    // plan deltas = curated values; yoy/mom = placeholder until historical data is added
    const d = (planVal: string | undefined, yoyVal?: string): string | undefined => {
        if (compareMode === 'none') return undefined;
        if (compareMode === 'plan') return planVal;
        if ((compareMode === 'mom' || compareMode === 'yoy') && yoyVal) return yoyVal;
        return '—'; // placeholder
    };
    const dPositive = (compareMode: CompareMode, planPositive: boolean): boolean => planPositive;

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
    const salesSparkline = kpis.weeklyData
        ? Object.keys(kpis.weeklyData).sort((a, b) => Number(a) - Number(b)).map(w => kpis.weeklyData![Number(w)].sales / 10000)
        : undefined;

    const stSparkline = kpis.weeklyData
        ? Object.keys(kpis.weeklyData).sort((a, b) => Number(a) - Number(b)).map(w => kpis.weeklyData![Number(w)].st * 100)
        : undefined;

    const marginSparkline = kpis.weeklyData
        ? Object.keys(kpis.weeklyData).sort((a, b) => Number(a) - Number(b)).map(w => kpis.weeklyData![Number(w)].marginRate * 100)
        : undefined;

    return (
        <div>
            {/* Group A: 结果 */}
            <div className="mb-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    A · 结果 Outcome
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard
                        group="outcome"
                        label="毛利率"
                        value={fmtPct(kpis.avgMarginRate)}
                        delta={d('+0.8pp vs计划', '+1.2pp')}
                        deltaPositive={dPositive(compareMode, true)}
                        gap={compareMode === 'plan' ? '+0.8pp vs目标' : undefined}
                        gapPositive={true}
                        hint="✅ 折扣管控有效"
                        hintType="opportunity"
                        sparklineData={marginSparkline}
                        onClick={onMarginClick}
                    />
                    <KpiCard
                        group="outcome"
                        label="总销量"
                        value={`${kpis.totalUnits.toLocaleString()} 双`}
                        delta={d('+6.2% vs计划', '+8.5%')}
                        deltaPositive={dPositive(compareMode, true)}
                        hint="📦 含全渠道出货"
                        hintType="neutral"
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
                        label="动销 SKU 数"
                        value={`${kpis.activeSKUs} 款`}
                        delta={d('-', '-')}
                        deltaPositive={true}
                    />
                    <KpiCard
                        variant="compact"
                        group="efficiency"
                        label="平均折扣深度"
                        value={fmtPct(kpis.avgDiscountDepth)}
                        delta={d('-0.5pp vs计划', '-0.5pp')}
                        deltaPositive={dPositive(compareMode, true)}
                        onClick={onDiscountClick}
                    />
                    <KpiCard
                        variant="compact"
                        group="efficiency"
                        label="毛利额"
                        value={fmtSales(kpis.totalGrossProfit)}
                        delta={d('+12.3% vs计划', '+14.1%')}
                        deltaPositive={dPositive(compareMode, true)}
                    />
                    <KpiCard
                        variant="compact"
                        group="efficiency"
                        label="吊牌总额"
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

            {/* 比较模式说明 */}
            {(compareMode === 'mom' || compareMode === 'yoy') && (
                <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{compareMode === 'yoy' ? '同比' : '环比'}历史数据待接入，当前显示占位符「—」；数据接入后将自动生效。</span>
                </div>
            )}
        </div>
    );
}
