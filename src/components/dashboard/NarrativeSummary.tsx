'use client';

import { THRESHOLDS } from '@/config/thresholds';

interface NarrativeSummaryProps {
    kpis: {
        totalNetSales: number;
        totalGrossProfit: number;
        avgSellThrough: number;
        avgMarginRate: number;
        avgDiscountDepth: number;
        activeSKUs: number;
        wos: number;
        planData?: {
            overall_plan: {
                plan_total_sales: number;
                plan_avg_sell_through: number;
                plan_avg_margin_rate: number;
                plan_wos: number;
            };
        };
    };
    filterSummary: string;
}

function assessHealth(kpis: NarrativeSummaryProps['kpis']) {
    const st = kpis.avgSellThrough;
    const m = kpis.avgMarginRate;
    const plan = kpis.planData?.overall_plan;
    const salesAchieve = plan ? kpis.totalNetSales / plan.plan_total_sales : 1;

    if (st >= THRESHOLDS.sellThrough.target && m >= THRESHOLDS.marginRate.target && salesAchieve >= 0.95) return 'strong';
    if (st >= THRESHOLDS.sellThrough.warning && m >= THRESHOLDS.marginRate.warning) return 'moderate';
    return 'weak';
}

export default function NarrativeSummary({ kpis, filterSummary }: NarrativeSummaryProps) {
    const health = assessHealth(kpis);
    const plan = kpis.planData?.overall_plan;

    const st = (kpis.avgSellThrough * 100).toFixed(1);
    const margin = (kpis.avgMarginRate * 100).toFixed(1);
    const discount = (kpis.avgDiscountDepth * 100).toFixed(1);
    const stTarget = plan ? (plan.plan_avg_sell_through * 100).toFixed(0) : '80';
    const stDelta = plan ? ((kpis.avgSellThrough - plan.plan_avg_sell_through) * 100).toFixed(1) : null;
    const salesMillion = (kpis.totalNetSales / 10000).toFixed(0);
    const salesPlanAchieve = plan ? ((kpis.totalNetSales / plan.plan_total_sales) * 100).toFixed(0) : null;

    // 生成叙事段落
    const getPerformanceSentence = () => {
        if (health === 'strong') {
            return `当前筛选条件（${filterSummary}）下，整体经营表现**优于计划**。净销售额 ¥${salesMillion}万，计划达成率 ${salesPlanAchieve}%；累计售罄率 ${st}%，${stDelta && parseFloat(stDelta) > 0 ? `超出目标 +${stDelta}pp` : `达成目标`}，库存结构健康（WOS ${kpis.wos} 周）。`;
        }
        if (health === 'moderate') {
            return `当前筛选条件（${filterSummary}）下，整体经营表现**接近计划线**。净销售额 ¥${salesMillion}万${salesPlanAchieve ? `（达成率 ${salesPlanAchieve}%）` : ''}；售罄率 ${st}% 处于警戒线附近（目标 ${stTarget}%），${stDelta ? `偏差 ${stDelta}pp` : ''}，需关注折扣深度（${discount}%）是否继续扩大。`;
        }
        return `当前筛选条件（${filterSummary}）下，整体经营表现**低于计划预期**。售罄率 ${st}% 显著低于目标 ${stTarget}%${stDelta ? `（差距 ${Math.abs(parseFloat(stDelta)).toFixed(1)}pp）` : ''}，毛利率 ${margin}% 承压，需立即启动库存优化行动（折扣/调拨/组合促销）。`;
    };

    const getRiskSentence = () => {
        const risks = [];
        if (kpis.avgSellThrough < THRESHOLDS.sellThrough.warning) risks.push('售罄率偏低，高价格带SKU清货压力大');
        if (kpis.avgDiscountDepth > THRESHOLDS.discountDepth.danger) risks.push('折扣深度已超警戒线，毛利空间受损');
        if (kpis.wos > 12) risks.push(`WOS ${kpis.wos} 周，远超合理库存周期（5-8周），积压风险高`);
        if (kpis.wos < 4) risks.push(`WOS ${kpis.wos} 周偏低，明星款有断货风险`);
        return risks.length > 0 ? `主要风险项：${risks.slice(0, 2).join('；')}。` : '未识别高优先级风险。';
    };

    const getActionSentence = () => {
        if (health === 'strong') return '建议：维持当前节奏，聚焦补深 Top 款，提前锁定下波上市预算分配。';
        if (health === 'moderate') return '建议：对售罄率低于 70% 的 SKU 启动组合促销（搭赠或限时折扣），同时审查折扣上限策略，避免毛利进一步摊薄。';
        return '建议：立即开启 P0 级库存处置——定向渠道调拨（B2B/奥莱）+ 组合清仓，并冻结下期同品类追加预算，直至售罄达到警戒线以上。';
    };

    const healthConfig = {
        strong: { label: '经营健康', badge: '✅', bg: 'bg-emerald-50', border: 'border-emerald-200', labelColor: 'text-emerald-800' },
        moderate: { label: '关注中', badge: '⚠️', bg: 'bg-amber-50', border: 'border-amber-200', labelColor: 'text-amber-800' },
        weak: { label: '需处置', badge: '🚨', bg: 'bg-red-50', border: 'border-red-200', labelColor: 'text-red-800' },
    };
    const hc = healthConfig[health];

    // Markdown-like bold rendering
    const renderText = (text: string) =>
        text.split(/\*\*(.*?)\*\*/).map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-bold text-slate-900">{part}</strong> : part
        );

    return (
        <div className={`rounded-xl border ${hc.border} ${hc.bg} p-5 mb-6`}>
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{hc.badge}</span>
                <div>
                    <h2 className="text-base font-bold text-slate-900">本季经营结论</h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hc.bg} ${hc.labelColor} border ${hc.border}`}>{hc.label}</span>
                </div>
            </div>
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>{renderText(getPerformanceSentence())}</p>
                <p className="text-slate-600">{getRiskSentence()}</p>
                <p className="font-medium text-slate-800 border-t border-slate-200 pt-3 mt-3">{getActionSentence()}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>售罄率 <strong className="text-slate-800">{st}%</strong></span>
                <span>毛利率 <strong className="text-slate-800">{margin}%</strong></span>
                <span>折扣深度 <strong className="text-slate-800">{discount}%</strong></span>
                <span>WOS <strong className="text-slate-800">{kpis.wos} 周</strong></span>
                <span>动销SKU <strong className="text-slate-800">{kpis.activeSKUs} 款</strong></span>
            </div>
        </div>
    );
}
