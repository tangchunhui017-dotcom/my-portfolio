'use client';

import { THRESHOLDS } from '@/config/thresholds';

interface InsightsBannerProps {
    kpis: {
        avgSellThrough: number;
        avgMarginRate: number;
        avgDiscountDepth: number;
        totalNetSales: number;
        totalGrossSales: number;
        activeSKUs: number;
        scatterSkus?: { sellThrough: number; price: number }[];
        totalSkuCount?: number;
    } | null;
}

export default function InsightsBanner({ kpis }: InsightsBannerProps) {
    if (!kpis) return null;

    const st = kpis.avgSellThrough;
    const margin = kpis.avgMarginRate;
    const discount = kpis.avgDiscountDepth;
    const atRiskCount = kpis.scatterSkus?.length ?? 0;
    const totalSkus = kpis.totalSkuCount ?? kpis.activeSKUs;

    // 判断整体健康度
    const isHealthy = st >= THRESHOLDS.sellThrough.target && margin >= THRESHOLDS.marginRate.target;
    const isWarning = !isHealthy && (st >= THRESHOLDS.sellThrough.warning || margin >= THRESHOLDS.marginRate.warning);
    const isDanger = st < THRESHOLDS.sellThrough.warning || margin < THRESHOLDS.marginRate.danger;

    // 渐变背景配色
    const gradientClass = isDanger
        ? 'from-red-600 via-rose-500 to-orange-500'
        : isWarning
            ? 'from-amber-500 via-orange-400 to-yellow-400'
            : 'from-emerald-600 via-teal-500 to-cyan-500';

    // 核心洞察数字
    const stGap = Math.abs(st - THRESHOLDS.sellThrough.target);
    const stGapPP = (stGap * 100).toFixed(1);
    const stDir = st >= THRESHOLDS.sellThrough.target ? '超出' : '距目标';

    // 三条推荐动作
    const actions: string[] = [];
    if (st < THRESHOLDS.sellThrough.target) {
        actions.push(`${atRiskCount} 款 SKU 售罄率偏低，建议优先启动渠道调拨`);
    } else {
        actions.push(`售罄健康，关注 ${atRiskCount} 款需关注 SKU 的库存深度`);
    }
    if (discount > THRESHOLDS.discountDepth.warning) {
        actions.push(`折扣深度 ${(discount * 100).toFixed(1)}% 超警戒线，收敛促销力度`);
    } else {
        actions.push(`折扣管控良好（${(discount * 100).toFixed(1)}%），维持价格体系`);
    }
    if (margin < THRESHOLDS.marginRate.target) {
        actions.push(`毛利率 ${(margin * 100).toFixed(1)}% 低于目标，优化成本或调整折扣`);
    } else {
        actions.push(`毛利率 ${(margin * 100).toFixed(1)}% 达标，可适度加大走量款深度`);
    }

    // 一句话洞察
    const headline = isDanger
        ? `⚠️ 当前售罄率 ${(st * 100).toFixed(1)}%，${stDir}目标 ${stGapPP}pp，需立即干预`
        : isWarning
            ? `📊 售罄率 ${(st * 100).toFixed(1)}%，${stDir}目标 ${stGapPP}pp，关注节奏`
            : `✅ 售罄率 ${(st * 100).toFixed(1)}%，${stDir}目标 ${stGapPP}pp，整体健康`;

    return (
        <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${gradientClass} p-5 text-white shadow-lg`}>
            {/* 背景装饰 */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white" />
                <div className="absolute -left-4 -bottom-8 w-32 h-32 rounded-full bg-white" />
            </div>

            <div className="relative flex flex-col md:flex-row gap-5 items-start md:items-center">
                {/* 左：大数字 + 标签 */}
                <div className="flex-shrink-0">
                    <div className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
                        Insights · 当前经营洞察
                    </div>
                    <div className="text-4xl font-black tracking-tight">
                        {(st * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm opacity-80 mt-0.5">累计售罄率</div>
                    <div className="mt-2 text-xs opacity-75">
                        {totalSkus} 款在售 · {atRiskCount} 款需关注
                    </div>
                </div>

                {/* 中：分隔线 */}
                <div className="hidden md:block w-px h-16 bg-white opacity-30" />

                {/* 右：洞察 + 动作 */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-2 opacity-90">{headline}</div>
                    <ul className="space-y-1">
                        {actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs opacity-80">
                                <span className="flex-shrink-0 mt-0.5">
                                    {i === 0 ? '①' : i === 1 ? '②' : '③'}
                                </span>
                                <span>{action}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 右侧：毛利率 + 折扣深度 小指标 */}
                <div className="flex-shrink-0 flex gap-4 md:gap-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold">{(margin * 100).toFixed(1)}%</div>
                        <div className="text-xs opacity-70 mt-0.5">毛利率</div>
                        <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full ${margin >= THRESHOLDS.marginRate.target ? 'bg-white/20' : 'bg-red-900/30'}`}>
                            目标 {(THRESHOLDS.marginRate.target * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">{(discount * 100).toFixed(1)}%</div>
                        <div className="text-xs opacity-70 mt-0.5">折扣深度</div>
                        <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full ${discount <= THRESHOLDS.discountDepth.warning ? 'bg-white/20' : 'bg-red-900/30'}`}>
                            警戒 {(THRESHOLDS.discountDepth.warning * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
