'use client';

import type { CompareMode } from '@/hooks/useDashboardFilter';
import type { DashboardCompareMeta } from '@/config/dashboardCompare';
import { FOOTWEAR_ANALYSIS_MODULES } from '@/config/footwearLanguage';
import { THRESHOLDS } from '@/config/thresholds';
import { formatMoneyCny } from '@/config/numberFormat';

type OverviewModuleId = 'annual-performance' | 'region-channel' | 'category-quarter' | 'wave-plan' | 'consumer-color';
type Health = 'strong' | 'moderate' | 'weak';

type BaselineKpis = {
    totalNetSales: number;
    avgSellThrough: number;
    avgMarginRate?: number;
    avgDiscountDepth?: number;
    activeSKUs?: number;
    totalOnHandUnits?: number;
    wos?: number;
} | null;

type SummaryMetric = {
    label: string;
    value: string;
    onClick?: () => void;
    tip?: string;
};

interface NarrativeSummaryProps {
    selectedModuleId?: string;
    compareMode: CompareMode;
    baselineKpis: BaselineKpis;
    compareMeta: DashboardCompareMeta;
    kpis: {
        totalNetSales: number;
        totalGrossProfit: number;
        avgSellThrough: number;
        avgMarginRate: number;
        avgDiscountDepth: number;
        activeSKUs: number;
        wos: number;
        dos: number;
        totalOnHandUnits: number;
        channelSales: Record<string, number>;
        priceBandSales: Record<string, { sales: number }>;
        top10Concentration: number;
        planData?: {
            overall_plan: {
                plan_total_sales: number;
                plan_avg_sell_through: number;
                plan_avg_margin_rate?: number;
                plan_wos: number;
            };
        };
    };
    filterSummary: string;
    onSellThroughClick?: () => void;
    onMarginClick?: () => void;
    onDiscountClick?: () => void;
    onInventoryClick?: () => void;
    onSkuClick?: () => void;
    onChannelClick?: () => void;
}

const DEFAULT_MODULE_ID: OverviewModuleId = 'annual-performance';

const MODULE_META: Record<OverviewModuleId, { title: string; actionLabel: string }> = {
    'annual-performance': {
        title: '本季鞋类经营结论',
        actionLabel: '优先处理低售罄低毛利款，守住规模与利润双目标。',
    },
    'region-channel': {
        title: '区域与渠道效率结论',
        actionLabel: '用渠道分层调拨和折扣纪律优化效率，不做全渠道一刀切。',
    },
    'category-quarter': {
        title: '季度商品结构结论',
        actionLabel: '围绕核心价格带和主力品类做深，控制长尾 SKU 扩张。',
    },
    'wave-plan': {
        title: '波段企划执行结论',
        actionLabel: '按售罄节奏和库存承压度修正后续波段的上新与清货动作。',
    },
    'consumer-color': {
        title: '人群与色彩策略结论',
        actionLabel: '将资源集中在高转化人群和稳定色系，减少弱响应配色投入。',
    },
};

const PRICE_BAND_LABELS: Record<string, string> = {
    PB1: '199-399',
    PB2: '399-599',
    PB3: '599-799',
    PB4: '800+',
};

function calcDeltaPct(current: number, baseline: number | undefined): number | undefined {
    if (baseline === undefined || baseline === 0) return undefined;
    return ((current - baseline) / Math.abs(baseline)) * 100;
}

function calcDeltaPp(current: number, baseline: number | undefined): number | undefined {
    if (baseline === undefined) return undefined;
    return (current - baseline) * 100;
}

function formatSigned(value: number, digits = 1) {
    const absText = Math.abs(value).toFixed(digits);
    if (value > 0) return `+${absText}`;
    if (value < 0) return `-${absText}`;
    return absText;
}

function formatCompareDelta(label: string, delta: number | undefined, unit: string) {
    if (delta === undefined) return null;
    return `${label} ${formatSigned(delta)}${unit}`;
}

function getScopeLabel(filterSummary: string) {
    return filterSummary || '当前口径';
}

function assessHealth({
    kpis,
    compareMode,
    salesDeltaPct,
    stDeltaPp,
    marginDeltaPp,
}: {
    kpis: NarrativeSummaryProps['kpis'];
    compareMode: CompareMode;
    salesDeltaPct: number | undefined;
    stDeltaPp: number | undefined;
    marginDeltaPp: number | undefined;
}): Health {
    let score = 0;

    if (kpis.avgSellThrough >= THRESHOLDS.sellThrough.target) score += 2;
    else if (kpis.avgSellThrough >= THRESHOLDS.sellThrough.warning) score += 1;
    else score -= 2;

    if (kpis.avgMarginRate >= THRESHOLDS.marginRate.target) score += 2;
    else if (kpis.avgMarginRate >= THRESHOLDS.marginRate.warning) score += 1;
    else score -= 2;

    if (kpis.wos >= 4 && kpis.wos <= 10) score += 1;
    else if (kpis.wos < 3 || kpis.wos > 12) score -= 1;

    if (compareMode !== 'none') {
        if (salesDeltaPct !== undefined) score += salesDeltaPct >= 0 ? 1 : salesDeltaPct <= -8 ? -1 : 0;
        if (stDeltaPp !== undefined) score += stDeltaPp >= 0 ? 1 : stDeltaPp <= -3 ? -1 : 0;
        if (marginDeltaPp !== undefined) score += marginDeltaPp >= 0 ? 1 : marginDeltaPp <= -1 ? -1 : 0;
    }

    if (score >= 4) return 'strong';
    if (score >= 1) return 'moderate';
    return 'weak';
}

export default function NarrativeSummary({
    selectedModuleId,
    compareMode,
    baselineKpis,
    compareMeta,
    kpis,
    filterSummary,
    onSellThroughClick,
    onMarginClick,
    onDiscountClick,
    onInventoryClick,
    onSkuClick,
    onChannelClick,
}: NarrativeSummaryProps) {
    const moduleId = selectedModuleId && Object.prototype.hasOwnProperty.call(MODULE_META, selectedModuleId)
        ? (selectedModuleId as OverviewModuleId)
        : DEFAULT_MODULE_ID;
    const selectedModule = FOOTWEAR_ANALYSIS_MODULES.find((module) => module.id === moduleId) ?? FOOTWEAR_ANALYSIS_MODULES[0];
    const moduleMeta = MODULE_META[moduleId];
    const plan = kpis.planData?.overall_plan;
    const scopeLabel = getScopeLabel(filterSummary);
    const compareLabel = compareMode === 'none' ? '当前表现' : compareMeta.modeLabel;

    const salesBaseline = compareMode === 'plan' ? plan?.plan_total_sales : baselineKpis?.totalNetSales;
    const sellThroughBaseline = compareMode === 'plan' ? plan?.plan_avg_sell_through : baselineKpis?.avgSellThrough;
    const marginBaseline = compareMode === 'plan' ? plan?.plan_avg_margin_rate : baselineKpis?.avgMarginRate;
    const wosBaseline = compareMode === 'plan' ? plan?.plan_wos : baselineKpis?.wos;

    const salesDeltaPct = compareMode === 'none' ? undefined : calcDeltaPct(kpis.totalNetSales, salesBaseline);
    const stDeltaPp = compareMode === 'none' ? undefined : calcDeltaPp(kpis.avgSellThrough, sellThroughBaseline);
    const marginDeltaPp = compareMode === 'none' ? undefined : calcDeltaPp(kpis.avgMarginRate, marginBaseline);
    const wosDelta = compareMode === 'none' || wosBaseline === undefined ? undefined : kpis.wos - wosBaseline;

    const salesCompareText = compareMode === 'none' ? null : formatCompareDelta(compareLabel, salesDeltaPct, '%');
    const stCompareText = compareMode === 'none' ? null : formatCompareDelta(compareLabel, stDeltaPp, 'pp');
    const marginCompareText = compareMode === 'none' ? null : formatCompareDelta(compareLabel, marginDeltaPp, 'pp');
    const wosCompareText = compareMode === 'none' || wosDelta === undefined ? null : `${compareLabel} ${formatSigned(wosDelta)}周`;

    const salesDisplay = formatMoneyCny(kpis.totalNetSales);
    const grossProfitDisplay = formatMoneyCny(kpis.totalGrossProfit);
    const stDisplay = `${(kpis.avgSellThrough * 100).toFixed(1)}%`;
    const marginDisplay = `${(kpis.avgMarginRate * 100).toFixed(1)}%`;
    const discountDisplay = `${(kpis.avgDiscountDepth * 100).toFixed(1)}%`;
    const wosDisplay = `${kpis.wos.toFixed(1)} 周`;
    const activeSkuDisplay = `${kpis.activeSKUs} 款`;
    const top10Display = `${(kpis.top10Concentration * 100).toFixed(1)}%`;

    const channelEntries = Object.entries(kpis.channelSales ?? {}).sort((a, b) => b[1] - a[1]);
    const totalChannelSales = channelEntries.reduce((sum, [, sales]) => sum + sales, 0);
    const topChannel = channelEntries[0];
    const bottomChannel = channelEntries[channelEntries.length - 1];
    const topChannelName = topChannel?.[0] ?? '暂无';
    const bottomChannelName = bottomChannel?.[0] ?? '暂无';
    const topChannelPct = topChannel && totalChannelSales > 0 ? Math.round((topChannel[1] / totalChannelSales) * 100) : 0;

    const priceBandEntries = Object.entries(kpis.priceBandSales ?? {}).sort((a, b) => (b[1]?.sales ?? 0) - (a[1]?.sales ?? 0));
    const corePriceBand = priceBandEntries[0] ? PRICE_BAND_LABELS[priceBandEntries[0][0]] ?? priceBandEntries[0][0] : '暂无';

    const health = assessHealth({
        kpis,
        compareMode,
        salesDeltaPct,
        stDeltaPp,
        marginDeltaPp,
    });

    const healthConfig = {
        strong: {
            label: '经营健康',
            badge: '✅',
            judgement: '节奏健康',
            accentBar: 'bg-emerald-500',
            headerBg: 'bg-gradient-to-r from-emerald-50 to-white',
            border: 'border-emerald-200',
            badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            actionBg: 'bg-emerald-600',
            riskColor: 'text-emerald-700',
        },
        moderate: {
            label: '关注中',
            badge: '⚠️',
            judgement: '接近警戒线',
            accentBar: 'bg-amber-500',
            headerBg: 'bg-gradient-to-r from-amber-50 to-white',
            border: 'border-amber-200',
            badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
            actionBg: 'bg-amber-500',
            riskColor: 'text-amber-700',
        },
        weak: {
            label: '需要处置',
            badge: '🚨',
            judgement: '需要干预',
            accentBar: 'bg-red-500',
            headerBg: 'bg-gradient-to-r from-red-50 to-white',
            border: 'border-red-200',
            badgeBg: 'bg-red-100 text-red-800 border-red-300',
            actionBg: 'bg-red-600',
            riskColor: 'text-red-700',
        },
    } as const;

    const hc = healthConfig[health];

    const getPerformanceSentence = () => {
        const compareSuffix = (text: string | null) => (text ? `（${text}）` : '');

        switch (moduleId) {
            case 'region-channel':
                return `当前筛选条件（${scopeLabel}）下，${selectedModule.title}呈现**${hc.judgement}**。${topChannel ? `${topChannelName} 是当前主力渠道（贡献 ${topChannelPct}%）` : '渠道结构仍在调整'}，尾部渠道为 ${bottomChannelName}，折扣深度 ${discountDisplay}，WOS ${wosDisplay}${compareSuffix(wosCompareText)}。`;
            case 'category-quarter':
                return `当前筛选条件（${scopeLabel}）下，${selectedModule.title}呈现**${hc.judgement}**。核心价格带集中在 ${corePriceBand}，Top10 集中度 ${top10Display}，动销 SKU ${activeSkuDisplay}，毛利率 ${marginDisplay}${compareSuffix(marginCompareText)}。`;
            case 'wave-plan':
                return `当前筛选条件（${scopeLabel}）下，${selectedModule.title}呈现**${hc.judgement}**。售罄率 ${stDisplay}${compareSuffix(stCompareText)}，动销 SKU ${activeSkuDisplay}，WOS ${wosDisplay}${compareSuffix(wosCompareText)}，说明上新与去化节奏${health === 'weak' ? '存在错位' : '基本可控'}。`;
            case 'consumer-color':
                return `当前筛选条件（${scopeLabel}）下，${selectedModule.title}呈现**${hc.judgement}**。当前成交集中在 ${corePriceBand} 价格带，毛利率 ${marginDisplay}${compareSuffix(marginCompareText)}，折扣深度 ${discountDisplay}，动销 SKU ${activeSkuDisplay}，说明主销人群更偏向稳定走量款。`;
            case 'annual-performance':
            default:
                return `当前筛选条件（${scopeLabel}）下，${selectedModule.title}呈现**${hc.judgement}**。净销售额 ${salesDisplay}${compareSuffix(salesCompareText)}，售罄率 ${stDisplay}${compareSuffix(stCompareText)}，毛利率 ${marginDisplay}${compareSuffix(marginCompareText)}。`;
        }
    };

    const getRiskSentence = () => {
        const risks: string[] = [];

        if (compareMode !== 'none' && stDeltaPp !== undefined && stDeltaPp < -2) {
            risks.push(`${compareLabel}售罄率落后 ${Math.abs(stDeltaPp).toFixed(1)}pp`);
        }
        if (compareMode !== 'none' && marginDeltaPp !== undefined && marginDeltaPp < -1) {
            risks.push(`${compareLabel}毛利率回落 ${Math.abs(marginDeltaPp).toFixed(1)}pp`);
        }
        if (kpis.avgDiscountDepth > THRESHOLDS.discountDepth.danger) {
            risks.push(`折扣深度 ${discountDisplay} 已接近上限`);
        }
        if (kpis.wos > 12) {
            risks.push(`WOS ${wosDisplay}，库存积压风险偏高`);
        }
        if (kpis.wos < 4) {
            risks.push(`WOS ${wosDisplay}，核心鞋型存在断货风险`);
        }

        switch (moduleId) {
            case 'region-channel':
                if (topChannelPct > 55) risks.push(`${topChannelName} 占比 ${topChannelPct}%，渠道集中度偏高`);
                if (topChannelName !== bottomChannelName) risks.push(`${bottomChannelName} 去化效率偏弱`);
                break;
            case 'category-quarter':
                if (kpis.top10Concentration > 0.7) risks.push(`Top10 集中度 ${top10Display}，头部集中偏高`);
                if (kpis.activeSKUs < 180) risks.push(`动销 SKU 仅 ${activeSkuDisplay}，结构宽度不足`);
                break;
            case 'wave-plan':
                if (kpis.avgSellThrough < THRESHOLDS.sellThrough.warning && kpis.wos > 8) risks.push('上市与去化节奏存在错位，后波段承压');
                break;
            case 'consumer-color':
                if (corePriceBand === '199-399' && kpis.avgMarginRate < THRESHOLDS.marginRate.warning) risks.push('低价带成交占比偏高，价格带上移不足');
                if (kpis.avgDiscountDepth > THRESHOLDS.discountDepth.warning) risks.push('人群与配色匹配度不足，导致促销依赖升高');
                break;
            case 'annual-performance':
            default:
                if (compareMode !== 'none' && salesDeltaPct !== undefined && salesDeltaPct < -8) risks.push(`${compareLabel}净销售额偏离 ${Math.abs(salesDeltaPct).toFixed(1)}%`);
                break;
        }

        return risks.length > 0 ? risks.slice(0, 2).join('；') : null;
    };

    const getActionSentence = () => {
        switch (moduleId) {
            case 'region-channel':
                if (health === 'strong') return '复制主力渠道的上新与投放节奏，把验证范围扩到次优渠道，逐步降低集中度风险。';
                if (health === 'moderate') return '对低效渠道做货品调拨和陈列优化，先提升去化，再决定是否追加预算。';
                return '立即对尾部渠道止损，按渠道分层处理库存与活动预算，避免全渠道同步降折。';
            case 'category-quarter':
                if (health === 'strong') return '继续补深主力品类和核心价格带，同时控制长尾 SKU 的扩张速度。';
                if (health === 'moderate') return '围绕高售罄品类补深，压缩低效率子类，把结构拉回核心盘。';
                return '暂停低效品类追单，启动结构清退和跨渠道去化，先把资源回收到主力品类。';
            case 'wave-plan':
                if (health === 'strong') return '按当前售罄节奏推进下一波段上新，提前锁定主力款的补单窗口。';
                if (health === 'moderate') return '前置修正后续波段密度，根据售罄和库存节奏调整上市与开折阈值。';
                return '暂停低效波段的追加投放，优先做调拨和清货，把去化节奏拉回健康区间。';
            case 'consumer-color':
                if (health === 'strong') return '继续围绕高转化价格带和稳定色系铺货，放大对核心人群的命中率。';
                if (health === 'moderate') return '收缩弱响应配色和边缘人群投放，把资源集中到主销组合。';
                return '立即减少低转化配色和弱人群货盘，避免折扣继续吞噬毛利。';
            case 'annual-performance':
            default:
                if (health === 'strong') return '维持当前节奏，把资源继续投向主力波段与高效渠道，扩大正向反馈。';
                if (health === 'moderate') return '对售罄率低于 70% 的鞋款启动组合促销与渠道调拨，同时审查配色结构与折扣上限。';
                return '立即启动库存与渠道协同动作，优先处理低效 SKU 与低效渠道，避免毛利进一步摊薄。';
        }
    };

    const metrics: SummaryMetric[] = (() => {
        switch (moduleId) {
            case 'region-channel':
                return [
                    { label: '主力渠道', value: topChannel ? `${topChannelName} ${topChannelPct}%` : '暂无', onClick: onChannelClick, tip: '跳转渠道结构图' },
                    { label: '尾部渠道', value: bottomChannelName },
                    { label: '折扣深度', value: discountDisplay, onClick: onDiscountClick, tip: '跳转 SKU 风险列表' },
                    { label: 'WOS', value: wosDisplay, onClick: onInventoryClick, tip: '跳转库存相关图表' },
                ];
            case 'category-quarter':
                return [
                    { label: '核心价格带', value: corePriceBand },
                    { label: 'Top10 集中度', value: top10Display },
                    { label: '动销 SKU', value: activeSkuDisplay, onClick: onSkuClick, tip: '跳转 SKU 风险列表' },
                    { label: '毛利率', value: marginDisplay, onClick: onMarginClick, tip: '跳转 SKU 风险列表' },
                ];
            case 'wave-plan':
                return [
                    { label: '售罄率', value: stDisplay, onClick: onSellThroughClick, tip: '跳转售罄曲线' },
                    { label: 'WOS', value: wosDisplay, onClick: onInventoryClick, tip: '跳转库存相关图表' },
                    { label: '动销 SKU', value: activeSkuDisplay, onClick: onSkuClick, tip: '跳转 SKU 风险列表' },
                    { label: '折扣深度', value: discountDisplay, onClick: onDiscountClick, tip: '跳转 SKU 风险列表' },
                ];
            case 'consumer-color':
                return [
                    { label: '核心价格带', value: corePriceBand },
                    { label: '毛利率', value: marginDisplay, onClick: onMarginClick, tip: '跳转 SKU 风险列表' },
                    { label: '折扣深度', value: discountDisplay, onClick: onDiscountClick, tip: '跳转 SKU 风险列表' },
                    { label: '动销 SKU', value: activeSkuDisplay, onClick: onSkuClick, tip: '跳转 SKU 风险列表' },
                ];
            case 'annual-performance':
            default:
                return [
                    { label: '净销售额', value: salesDisplay },
                    { label: '售罄率', value: stDisplay, onClick: onSellThroughClick, tip: '跳转售罄曲线' },
                    { label: '毛利率', value: marginDisplay, onClick: onMarginClick, tip: '跳转 SKU 风险列表' },
                    { label: 'WOS', value: wosDisplay, onClick: onInventoryClick, tip: '跳转库存相关图表' },
                    { label: '毛利额', value: grossProfitDisplay },
                ];
        }
    })();

    const risks = getRiskSentence();
    const hasMetricLinks = metrics.some((metric) => metric.onClick);

    const renderText = (text: string) =>
        text.split(/\*\*(.*?)\*\*/).map((part, index) => (
            index % 2 === 1 ? <strong key={index} className="font-bold text-slate-900">{part}</strong> : part
        ));

    return (
        <div className={`rounded-xl border ${hc.border} overflow-hidden shadow-sm`}>
            <div className="flex">
                <div className={`w-1.5 shrink-0 ${hc.accentBar}`} />
                <div className="flex-1">
                    <div className={`${hc.headerBg} px-5 pt-5 pb-4 flex items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl leading-none">{hc.badge}</span>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">{moduleMeta.title}</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{scopeLabel} · {selectedModule.focus.join(' / ')} · {compareLabel}</p>
                            </div>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full border whitespace-nowrap ${hc.badgeBg}`}>
                            {hc.label}
                        </span>
                    </div>

                    <div className="px-5 py-4 bg-white space-y-3">
                        <p className="text-sm text-slate-700 leading-relaxed">{renderText(getPerformanceSentence())}</p>
                        {risks ? (
                            <p className={`text-sm font-medium ${hc.riskColor} flex items-start gap-2`}>
                                <span>⚡</span>
                                <span>主要风险：{risks}。</span>
                            </p>
                        ) : null}
                    </div>

                    <div className={`${hc.actionBg} px-5 py-3.5 flex items-start gap-3`}>
                        <span className="text-white text-base mt-0.5 shrink-0">→</span>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-white leading-relaxed">{getActionSentence()}</p>
                            <p className="text-[11px] text-white/80">动作主线：{moduleMeta.actionLabel}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 px-5 py-2.5 flex flex-wrap gap-2 border-t border-slate-100">
                        {metrics.map(({ label, value, onClick, tip }) =>
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
                        <span className="ml-auto text-[10px] text-slate-300 self-center">
                            {hasMetricLinks ? '点击证据指标联动下方图表' : '切换上方业务标签自动更新经营结论'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
