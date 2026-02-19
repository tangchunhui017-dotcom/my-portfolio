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
    // 联动回调（可选）
    onSellThroughClick?: () => void;
    onMarginClick?: () => void;
    onDiscountClick?: () => void;
    onInventoryClick?: () => void;
    onSkuClick?: () => void;
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

export default function NarrativeSummary({
    kpis, filterSummary,
    onSellThroughClick, onMarginClick, onDiscountClick, onInventoryClick, onSkuClick,
}: NarrativeSummaryProps) {
    const health = assessHealth(kpis);
    const plan = kpis.planData?.overall_plan;

    const st = (kpis.avgSellThrough * 100).toFixed(1);
    const margin = (kpis.avgMarginRate * 100).toFixed(1);
    const discount = (kpis.avgDiscountDepth * 100).toFixed(1);
    const stTarget = plan ? (plan.plan_avg_sell_through * 100).toFixed(0) : '80';
    const stDelta = plan ? ((kpis.avgSellThrough - plan.plan_avg_sell_through) * 100).toFixed(1) : null;
    const salesMillion = (kpis.totalNetSales / 10000).toFixed(0);
    const salesPlanAchieve = plan ? ((kpis.totalNetSales / plan.plan_total_sales) * 100).toFixed(0) : null;

    const getPerformanceSentence = () => {
        if (health === 'strong') {
            return `当前筛选条件（${filterSummary}）下，整体经营表现**优于计划**。净销售额 ¥${salesMillion}万，计划达成率 ${salesPlanAchieve}%；累计售罄率 ${st}%，${stDelta && parseFloat(stDelta) > 0 ? `超出目标 +${stDelta}pp` : `达成目标`}，库存结构健康（WOS ${kpis.wos} 周）。`;
        }
        if (health === 'moderate') {
            return `当前筛选条件（${filterSummary}）下，整体经营表现**接近计划线**。净销售额 ¥${salesMillion}万${salesPlanAchieve ? `（达成率 ${salesPlanAchieve}%）` : ''}；售罄率 ${st}% 处于警戒线附近（目标 ${stTarget}%），${stDelta ? `偏差 ${stDelta}pp` : ''}，需关注折扣深度（${discount}%）是否继续扩大。`;
        }
        return `当前筛选条件（${filterSummary}）下，整体经营表现**低于计划预期**。售罄率 ${st}% 显著低于目标 ${stTarget}%${stDelta ? `（差距 ${Math.abs(parseFloat(stDelta)).toFixed(1)}pp）` : ''}，毛利率 ${margin}% 承压，需立即启动库存优化行动。`;
    };

    const getRiskSentence = () => {
        const risks: string[] = [];
        if (kpis.avgSellThrough < THRESHOLDS.sellThrough.warning) risks.push('售罄率偏低，高价格带SKU清货压力大');
        if (kpis.avgDiscountDepth > THRESHOLDS.discountDepth.danger) risks.push('折扣深度已超警戒线，毛利空间受损');
        if (kpis.wos > 12) risks.push(`WOS ${kpis.wos} 周，积压风险高`);
        if (kpis.wos < 4) risks.push(`WOS ${kpis.wos} 周偏低，明星款有断货风险`);
        return risks.length > 0 ? risks.slice(0, 2).join('；') : null;
    };

    const getActionSentence = () => {
        if (health === 'strong') return '维持当前节奏，聚焦补深 Top 款，提前锁定下波上市预算分配。';
        if (health === 'moderate') return '对售罄率低于 70% 的 SKU 启动组合促销（搭赠或限时折扣），同时审查折扣上限策略，避免毛利进一步摊薄。';
        return '立即开启 P0 级库存处置——定向渠道调拨（B2B/奥莱）+ 组合清仓，并冻结下期同品类追加预算，直至售罄达到警戒线以上。';
    };

    const healthConfig = {
        strong: {
            label: '经营健康', badge: '✅',
            accentBar: 'bg-emerald-500',
            headerBg: 'bg-gradient-to-r from-emerald-50 to-white',
            border: 'border-emerald-200',
            badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            actionBg: 'bg-emerald-600',
            riskColor: 'text-emerald-700',
        },
        moderate: {
            label: '关注中', badge: '⚠️',
            accentBar: 'bg-amber-500',
            headerBg: 'bg-gradient-to-r from-amber-50 to-white',
            border: 'border-amber-200',
            badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
            actionBg: 'bg-amber-500',
            riskColor: 'text-amber-700',
        },
        weak: {
            label: '需处置', badge: '🚨',
            accentBar: 'bg-red-500',
            headerBg: 'bg-gradient-to-r from-red-50 to-white',
            border: 'border-red-200',
            badgeBg: 'bg-red-100 text-red-800 border-red-300',
            actionBg: 'bg-red-600',
            riskColor: 'text-red-700',
        },
    };
    const hc = healthConfig[health];
    const risks = getRiskSentence();

    const renderText = (text: string) =>
        text.split(/\*\*(.*?)\*\*/).map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-bold text-slate-900">{part}</strong> : part
        );

    // 底部数据快捷联动项
    const dataLinks = [
        { label: '售罄率', value: `${st}%`, onClick: onSellThroughClick, tip: '→ 售罄曲线' },
        { label: '毛利率', value: `${margin}%`, onClick: onMarginClick, tip: '→ SKU列表' },
        { label: '折扣深度', value: `${discount}%`, onClick: onDiscountClick, tip: '→ SKU列表' },
        { label: 'WOS', value: `${kpis.wos} 周`, onClick: onInventoryClick, tip: '→ 库存分析' },
        { label: '动销SKU', value: `${kpis.activeSKUs} 款`, onClick: onSkuClick, tip: '→ SKU列表' },
    ];

    return (
        <div className={`rounded-xl border ${hc.border} overflow-hidden shadow-sm mb-6`}>
            <div className="flex">
                {/* 左侧强调竖条 */}
                <div className={`w-1.5 shrink-0 ${hc.accentBar}`} />

                <div className="flex-1">
                    {/* 头部区域 */}
                    <div className={`${hc.headerBg} px-5 pt-5 pb-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl leading-none">{hc.badge}</span>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">本季经营结论</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{filterSummary}</p>
                            </div>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${hc.badgeBg}`}>
                            {hc.label}
                        </span>
                    </div>

                    {/* 内容区域 */}
                    <div className="px-5 py-4 bg-white space-y-3">
                        <p className="text-sm text-slate-700 leading-relaxed">
                            {renderText(getPerformanceSentence())}
                        </p>
                        {risks && (
                            <p className={`text-sm font-medium ${hc.riskColor} flex items-start gap-2`}>
                                <span>⚡</span>
                                <span>主要风险：{risks}。</span>
                            </p>
                        )}
                    </div>

                    {/* 行动建议 - 独立高亮区 */}
                    <div className={`${hc.actionBg} px-5 py-3.5 flex items-start gap-3`}>
                        <span className="text-white text-base mt-0.5 shrink-0">→</span>
                        <p className="text-sm font-semibold text-white leading-relaxed">
                            {getActionSentence()}
                        </p>
                    </div>

                    {/* 底部数据联动条 */}
                    <div className="bg-slate-50 px-5 py-2.5 flex flex-wrap gap-2 border-t border-slate-100">
                        {dataLinks.map(({ label, value, onClick, tip }) =>
                            onClick ? (
                                <button
                                    key={label}
                                    onClick={onClick}
                                    title={tip}
                                    className="text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors duration-150 flex items-center gap-1 group"
                                >
                                    {label}
                                    <strong className="text-slate-700 font-semibold group-hover:text-blue-700">{value}</strong>
                                    <span className="text-slate-300 group-hover:text-blue-400 text-[10px]">↗</span>
                                </button>
                            ) : (
                                <span key={label} className="text-xs text-slate-400 px-2 py-1">
                                    {label} <strong className="text-slate-700 font-semibold">{value}</strong>
                                </span>
                            )
                        )}
                        <span className="ml-auto text-[10px] text-slate-300 self-center">点击指标跳转图表</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
