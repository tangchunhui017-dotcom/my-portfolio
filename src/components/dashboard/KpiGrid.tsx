'use client';

import KpiCard from './KpiCard';

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
    } | null;
}

function fmtSales(n: number) {
    if (n >= 100_000_000) return `¥${(n / 100_000_000).toFixed(2)}亿`;
    if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`;
    return `¥${n.toLocaleString()}`;
}

function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
}

export default function KpiGrid({ kpis }: KpiGridProps) {
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
                        label="净销售额"
                        value={fmtSales(kpis.totalNetSales)}
                        delta="+12.3%"
                        deltaPositive={true}
                        gap="+5.2%"
                        gapPositive={true}
                        hint="✅ 超额完成季度目标"
                        hintType="opportunity"
                    />
                    <KpiCard
                        group="outcome"
                        label="累计售罄率"
                        value={fmtPct(kpis.avgSellThrough)}
                        delta="+3.1pp"
                        deltaPositive={true}
                        gap={kpis.avgSellThrough >= 0.80 ? '+' + fmtPct(kpis.avgSellThrough - 0.80) : fmtPct(kpis.avgSellThrough - 0.80)}
                        gapPositive={kpis.avgSellThrough >= 0.80}
                        hint={kpis.avgSellThrough >= 0.80 ? '✅ 达成目标 80%' : '⚠️ 未达目标 80%，关注滞销款'}
                        hintType={kpis.avgSellThrough >= 0.80 ? 'opportunity' : 'warning'}
                    />
                    <KpiCard
                        group="outcome"
                        label="毛利率"
                        value={fmtPct(kpis.avgMarginRate)}
                        delta="+1.2pp"
                        deltaPositive={true}
                        gap="+0.8pp"
                        gapPositive={true}
                        hint="✅ 折扣管控有效"
                        hintType="opportunity"
                    />
                    <KpiCard
                        group="outcome"
                        label="总销量"
                        value={`${kpis.totalUnits.toLocaleString()} 双`}
                        delta="+8.5%"
                        deltaPositive={true}
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
                        group="efficiency"
                        label="动销 SKU 数"
                        value={`${kpis.activeSKUs} 款`}
                        hint={kpis.activeSKUs > 0 ? '✅ 全部款式有动销' : '⚠️ 存在零动销款'}
                        hintType={kpis.activeSKUs > 0 ? 'opportunity' : 'warning'}
                    />
                    <KpiCard
                        group="efficiency"
                        label="平均折扣深度"
                        value={fmtPct(kpis.avgDiscountDepth)}
                        delta="-0.5pp"
                        deltaPositive={true}
                        gap={kpis.avgDiscountDepth <= 0.12 ? '正常' : '偏高'}
                        gapPositive={kpis.avgDiscountDepth <= 0.12}
                        hint={kpis.avgDiscountDepth > 0.15 ? '⚠️ 折扣偏深，关注毛利侵蚀' : '✅ 折扣管控在合理区间'}
                        hintType={kpis.avgDiscountDepth > 0.15 ? 'warning' : 'opportunity'}
                    />
                    <KpiCard
                        group="efficiency"
                        label="毛利额"
                        value={fmtSales(kpis.totalGrossProfit)}
                        delta="+14.1%"
                        deltaPositive={true}
                        hint="💰 毛利额同比改善"
                        hintType="opportunity"
                    />
                    <KpiCard
                        group="efficiency"
                        label="吊牌总额"
                        value={fmtSales(kpis.totalGrossSales)}
                        hint="📋 含折扣前原价"
                        hintType="neutral"
                    />
                </div>
            </div>

            {/* Group C: 结构 */}
            <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    C · 结构 Structure
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard
                        group="structure"
                        label="Top10 SKU 集中度"
                        value={fmtPct(kpis.top10Concentration)}
                        hint={kpis.top10Concentration > 0.7 ? '⚠️ 集中度偏高，长尾风险' : '✅ SKU 结构分散合理'}
                        hintType={kpis.top10Concentration > 0.7 ? 'warning' : 'opportunity'}
                    />
                    <KpiCard
                        group="structure"
                        label="最强渠道"
                        value={topChannel ? topChannel[0] : '-'}
                        gap={topChannel ? fmtPct(topChannelPct) : '-'}
                        gapPositive={true}
                        hint={topChannelPct > 0.6 ? '⚠️ 渠道过度集中' : '✅ 渠道结构健康'}
                        hintType={topChannelPct > 0.6 ? 'warning' : 'opportunity'}
                    />
                    <KpiCard
                        group="structure"
                        label="核心价格带"
                        value={topPriceBand ? PRICE_BAND_NAMES[topPriceBand[0]] : '-'}
                        gap={topPriceBand ? fmtPct(topPriceBand[1].sales / kpis.totalNetSales) : '-'}
                        gapPositive={true}
                        hint="📊 销售额最高价格带"
                        hintType="neutral"
                    />
                    <KpiCard
                        group="structure"
                        label="折扣损失额"
                        value={fmtSales(kpis.totalGrossSales - kpis.totalNetSales)}
                        hint={
                            (kpis.totalGrossSales - kpis.totalNetSales) / kpis.totalGrossSales > 0.15
                                ? '⚠️ 折扣损失超15%，需审查促销策略'
                                : '✅ 折扣损失可控'
                        }
                        hintType={
                            (kpis.totalGrossSales - kpis.totalNetSales) / kpis.totalGrossSales > 0.15
                                ? 'warning' : 'opportunity'
                        }
                    />
                </div>
            </div>
        </div>
    );
}
