'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import type { DashboardCompareMeta } from '@/config/dashboardCompare';
import {
    ANNUAL_CONTROL_ACTIONS,
    ANNUAL_CONTROL_PRICE_BAND_GUARDRAILS as PRICE_BAND_GUARDRAILS,
    buildAnnualControlDesignReviewInput,
    buildAnnualControlMasterView,
    buildAnnualControlModuleDeadline,
    formatAnnualControlScopeLabel,
    getAnnualControlFocus,
    getAnnualControlHealthCopy as getAnnualHealthCopy,
    getAnnualControlHealthTone as getAnnualHealthTone,
    getAnnualControlKeyRole,
    getAnnualControlMarginTone as getMarginTone,
    getAnnualControlNewGoodsTone as getNewGoodsTone,
    getAnnualControlPanelTone as getRiskPanelTone,
    getAnnualControlPriceBand,
    getAnnualControlRiskSeverity as calculateRiskSeverity,
    getAnnualControlScene,
    getAnnualControlSellThroughTone as getSellThroughTone,
    getAnnualControlStage,
    getAnnualControlTransitions,
    getAnnualControlWosHealthLabel as getWosHealthLabel,
    getAnnualControlWosTone as getWosTone,
    type AnnualControlHealthTone,
} from '@/config/annualControl';
import { THRESHOLDS } from '@/config/thresholds';
import AnnualControlMasterView from '@/components/dashboard/AnnualControlMasterView';

type JumpTab = 'category' | 'planning' | 'otb' | 'channel' | 'inventory';
type Tone = 'slate' | 'pink' | 'emerald' | 'amber' | 'rose' | 'sky';
type HealthTone = AnnualControlHealthTone;
type PriceBandId = 'PB1' | 'PB2' | 'PB3' | 'PB4';

type PriceBandMetric = {
    units?: number;
    sales: number;
    grossProfit?: number;
    onHandUnits?: number;
};

type DashboardKpis = {
    totalNetSales: number;
    avgSellThrough: number;
    avgMarginRate: number;
    avgDiscountDepth: number;
    activeSKUs: number;
    wos: number;
    totalOnHandUnits: number;
    totalUnits: number;
    priceBandSales: Record<string, PriceBandMetric>;
    channelSales: Record<string, number>;
    planData?: {
        overall_plan?: {
            plan_total_sales?: number;
            plan_avg_sell_through?: number;
            plan_avg_margin_rate?: number;
            plan_avg_discount_depth?: number;
            plan_ending_inventory_units?: number;
            plan_wos?: number;
        };
    };
};

type BaselineKpis = {
    avgSellThrough: number;
    avgMarginRate: number;
    avgDiscountDepth: number;
    totalOnHandUnits: number;
    wos: number;
};

type DashboardRecord = {
    sku_id: string;
    net_sales_amt: number;
};

type DashboardSku = {
    category_name?: string;
};

type RiskCard = {
    title: string;
    signal: string;
    impact: string;
    action: string;
    expectedImpact: string;
    channelPlan: string;
    tab: JumpTab;
    buttonLabel: string;
    tone: HealthTone;
    severity: number; // 0-100 风险评分
    deadline: string; // 建议处理截止时间
    daysLeft: number; // 剩余天数
    status?: 'pending' | 'in_progress' | 'resolved'; // 处理状态
};

type KeyActionCard = {
    title: string;
    owner: string;
    detail: string;
    expectedOutcome: string;
    collaborationStatus: string;
    deliverable: string;
    deadline: string;
    window: string;
    buttonLabel: string;
    tone: Tone;
    onClick: () => void;
};

interface AnnualControlPanelProps {
    filters: DashboardFilters;
    compareMode: CompareMode;
    compareMeta: DashboardCompareMeta;
    kpis: DashboardKpis | null;
    baselineKpis?: BaselineKpis | null;
    filteredRecords: DashboardRecord[];
    skuMap: Record<string, DashboardSku>;
    onJumpToTab: (tab: JumpTab) => void;
    onJumpToDesignReview: () => void;
}


const TONE_PANEL_CLASS: Record<Tone, string> = {
    slate: 'border-slate-200 bg-slate-50/75',
    pink: 'border-pink-200 bg-pink-50/85',
    emerald: 'border-emerald-200 bg-emerald-50/85',
    amber: 'border-amber-200 bg-amber-50/85',
    rose: 'border-rose-200 bg-rose-50/85',
    sky: 'border-sky-200 bg-sky-50/85',
};

const TONE_DOT_CLASS: Record<HealthTone, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    rose: 'bg-rose-500',
};

function SectionHeading({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
    );
}

function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
    const toneClass = {
        slate: 'bg-slate-100 text-slate-600',
        pink: 'bg-pink-100 text-pink-700',
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        rose: 'bg-rose-100 text-rose-700',
        sky: 'bg-sky-100 text-sky-700',
    }[tone];
    return (
        <span
            className={`inline-flex max-w-[220px] items-center truncate rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}
            title={typeof children === 'string' ? children : undefined}
        >
            {children}
        </span>
    );
}

function InsightCard({
    label,
    title,
    detail,
    tone = 'slate',
    children,
}: {
    label: string;
    title: string;
    detail: string;
    tone?: Tone;
    children?: ReactNode;
}) {
    const borderClass = {
        slate: 'border-l-slate-400 border-slate-200',
        pink: 'border-l-pink-400 border-slate-200',
        emerald: 'border-l-emerald-400 border-slate-200',
        amber: 'border-l-amber-400 border-slate-200',
        rose: 'border-l-rose-400 border-slate-200',
        sky: 'border-l-sky-400 border-slate-200',
    }[tone];

    const dotClass = {
        slate: 'bg-slate-400',
        pink: 'bg-pink-400',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-400',
        rose: 'bg-rose-500',
        sky: 'bg-sky-400',
    }[tone];

    return (
        <div className={`relative overflow-hidden rounded-[24px] border bg-white p-5 shadow-sm ${borderClass} border-l-[6px]`}>
            <div className="mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
            </div>
            <div className="text-lg font-bold leading-tight text-slate-900">{title}</div>
            <div className="mt-2 text-sm leading-relaxed text-slate-600">{detail}</div>
            {children ? <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-slate-50/50">{children}</div> : null}
        </div>
    );
}
function ModuleActionButton({
    label,
    onClick,
    fullWidth = false,
}: {
    label: string;
    onClick: () => void;
    fullWidth?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${
                fullWidth ? 'w-full' : ''
            } rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900`}
        >
            {label}
        </button>
    );
}

function fmtPct(value: number, digits = 1) {
    return `${(value * 100).toFixed(digits)}%`;
}

function fmtSignedPctGap(value: number, digits = 1) {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(value).toFixed(digits)}pct`;
}

function fmtSignedWeeks(value: number, digits = 1) {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(value).toFixed(digits)}周`;
}

function fmtFold(rate: number) {
    return `${(rate * 10).toFixed(1)}折`;
}
function compactCategoryLabel(label: string) {
    return label.replace('户外/机能', '机能').replace('鞋', '');
}

function matchesFocusCategory(categoryName: string | undefined, focusCategory: string) {
    const source = categoryName || '';
    if (focusCategory === '户外/机能') return source.includes('户外') || source.includes('机能');
    return source.includes(focusCategory);
}

export default function AnnualControlPanel({
    filters,
    compareMode,
    compareMeta,
    kpis,
    baselineKpis = null,
    filteredRecords,
    skuMap,
    onJumpToTab,
    onJumpToDesignReview,
}: AnnualControlPanelProps) {
    // 风险卡片状态管理
    const [riskStatuses, setRiskStatuses] = useState<Record<string, 'pending' | 'in_progress' | 'resolved'>>({});

    const stage = useMemo(() => getAnnualControlStage(filters), [filters]);
    const focus = useMemo(() => getAnnualControlFocus(filters), [filters]);
    const transitions = useMemo(() => getAnnualControlTransitions(filters), [filters]);
    const currentTransition = useMemo(() => {
        if (focus) return transitions.find((item) => item.season === focus.season) || transitions[0] || null;
        if (filters.season !== 'all') return transitions.find((item) => item.season === filters.season) || transitions[0] || null;
        return transitions[0] || null;
    }, [filters.season, focus, transitions]);
    const masterView = useMemo(() => {
        const plan = kpis?.planData?.overall_plan;
        const st = currentTransition?.sellThroughTarget ?? plan?.plan_avg_sell_through ?? THRESHOLDS.sellThrough.target;
        const mg = plan?.plan_avg_margin_rate ?? THRESHOLDS.marginRate.target;
        const wt = plan?.plan_wos ?? null;
        return buildAnnualControlMasterView(filters, {
            wos: kpis?.wos,
            wosGapWeeks: kpis && wt !== null ? kpis.wos - wt : null,
            sellThroughGapPp: kpis ? (kpis.avgSellThrough - st) * 100 : null,
            newGoodsGapPp: currentTransition ? (currentTransition.actualNewGoodsRatio - currentTransition.newGoodsRatio) * 100 : null,
            marginGapPp: kpis ? (kpis.avgMarginRate - mg) * 100 : null,
        });
    }, [filters, kpis, currentTransition]);
    const designReviewInput = useMemo(
        () => buildAnnualControlDesignReviewInput({ filters, focus, transition: currentTransition, stage }),
        [currentTransition, filters, focus, stage],
    );
    const currentActions = useMemo(
        () => ANNUAL_CONTROL_ACTIONS.filter((item) => item.month === masterView.currentMonth).sort((a, b) => a.priority.localeCompare(b.priority)),
        [masterView.currentMonth],
    );

    const topActualCategories = useMemo(() => {
        const salesMap = new Map<string, number>();
        filteredRecords.forEach((record) => {
            const categoryName = skuMap[record.sku_id]?.category_name || '未标注品类';
            salesMap.set(categoryName, (salesMap.get(categoryName) || 0) + Number(record.net_sales_amt || 0));
        });
        return [...salesMap.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, 3)
            .map(([name]) => name);
    }, [filteredRecords, skuMap]);

    const focusCategoryPerformance = useMemo(() => {
        if (!focus) return [] as Array<[string, number]>;
        const salesMap = new Map<string, number>();
        focus.mainCategory.forEach((item) => salesMap.set(item, 0));
        filteredRecords.forEach((record) => {
            const categoryName = skuMap[record.sku_id]?.category_name;
            focus.mainCategory.forEach((item) => {
                if (matchesFocusCategory(categoryName, item)) {
                    salesMap.set(item, (salesMap.get(item) || 0) + Number(record.net_sales_amt || 0));
                }
            });
        });
        return [...salesMap.entries()].sort((left, right) => right[1] - left[1]);
    }, [filteredRecords, focus, skuMap]);

    const actualPriceBand = useMemo(() => {
        if (!kpis) return null;
        const winner = Object.entries(kpis.priceBandSales || {}).sort((left, right) => right[1].sales - left[1].sales)[0];
        if (!winner) return null;
        return {
            id: winner[0] as PriceBandId,
            config: getAnnualControlPriceBand(winner[0] as PriceBandId),
            metrics: winner[1],
        };
    }, [kpis]);

    const targetPriceBand = focus ? getAnnualControlPriceBand(focus.mainPriceBandId) : null;
    const targetPriceBandMetrics = targetPriceBand && kpis ? kpis.priceBandSales[targetPriceBand.id] : null;
    const targetPriceBandShare = targetPriceBandMetrics && kpis && kpis.totalNetSales > 0 ? targetPriceBandMetrics.sales / kpis.totalNetSales : null;
    const actualLeaderShare = actualPriceBand && kpis && kpis.totalNetSales > 0 ? actualPriceBand.metrics.sales / kpis.totalNetSales : null;
    const focusCategoriesLabel = focus ? focus.mainCategory.map((item) => compactCategoryLabel(item)).slice(0, 3).join(' / ') : null;
    const focusRoleLabel = focus ? getAnnualControlKeyRole(focus.keyRole).id.replace('/主题款', '') : null;
    const sceneLabel = focus ? getAnnualControlScene(focus.sceneId).label : '年度统筹';
    const scopeLabel = formatAnnualControlScopeLabel(filters);

    const plan = kpis?.planData?.overall_plan;
    const sellThroughTarget = currentTransition?.sellThroughTarget ?? plan?.plan_avg_sell_through ?? THRESHOLDS.sellThrough.target;
    const sellThroughGapPp = kpis ? (kpis.avgSellThrough - sellThroughTarget) * 100 : null;
    const marginTarget = plan?.plan_avg_margin_rate ?? THRESHOLDS.marginRate.target;
    const marginGapPp = kpis ? (kpis.avgMarginRate - marginTarget) * 100 : null;
    const actualDiscountRate = kpis ? 1 - kpis.avgDiscountDepth : null;
    const discountGuardrail = targetPriceBand ? PRICE_BAND_GUARDRAILS[targetPriceBand.id] : null;
    const discountGuardrailGapPp =
        actualDiscountRate !== null && discountGuardrail !== null ? (actualDiscountRate - discountGuardrail) * 100 : null;
    const wosTarget = plan?.plan_wos ?? baselineKpis?.wos ?? null;
    const wosGapWeeks = kpis && wosTarget !== null ? kpis.wos - wosTarget : null;
    const wosGapBasisLabel = plan?.plan_wos != null ? '较计划' : baselineKpis?.wos != null ? '较基线' : '较口径';
    const newGoodsGapPp = currentTransition ? (currentTransition.actualNewGoodsRatio - currentTransition.newGoodsRatio) * 100 : null;

    const focusContributionShare =
        kpis && kpis.totalNetSales > 0 && focusCategoryPerformance.length > 0
            ? focusCategoryPerformance.reduce((sum, [, sales]) => sum + sales, 0) / kpis.totalNetSales
            : null;
    const alignedFocusCount = focus
        ? topActualCategories.filter((item) => focus.mainCategory.some((category) => matchesFocusCategory(item, category))).length
        : 0;
    const displayShiftPct =
        newGoodsGapPp !== null && newGoodsGapPp < 0 ? Math.min(20, Math.max(10, Math.round(Math.abs(newGoodsGapPp) * 2.4))) : 12;
    const sellThroughRecoveryPp =
        sellThroughGapPp !== null && sellThroughGapPp < 0 ? Math.min(2.5, Math.max(1.2, Math.abs(sellThroughGapPp) * 0.6)) : 0;

    const actualLeaderMarginRate =
        actualPriceBand && actualPriceBand.metrics.sales > 0 && typeof actualPriceBand.metrics.grossProfit === 'number'
            ? actualPriceBand.metrics.grossProfit / actualPriceBand.metrics.sales
            : null;
    const targetBandMarginRate =
        targetPriceBandMetrics && targetPriceBandMetrics.sales > 0 && typeof targetPriceBandMetrics.grossProfit === 'number'
            ? targetPriceBandMetrics.grossProfit / targetPriceBandMetrics.sales
            : null;
    const priceBandMismatch = Boolean(targetPriceBand && actualPriceBand && targetPriceBand.id !== actualPriceBand.id && targetPriceBandShare !== null && actualLeaderShare !== null && actualLeaderShare - targetPriceBandShare >= 0.08);

    const annualHealthTone = getAnnualHealthTone({
        sellThroughGapPp,
        newGoodsGapPp,
        marginGapPp,
        wos: kpis?.wos ?? null,
        wosGapWeeks,
    });
    const riskCards = useMemo(() => {
        const cards: RiskCard[] = [];

        if (kpis && sellThroughGapPp !== null && sellThroughGapPp < -1) {
            const tone = getSellThroughTone(sellThroughGapPp);
            const severity = calculateRiskSeverity(sellThroughGapPp, tone);
            const { deadline, daysLeft } = buildAnnualControlModuleDeadline({ year: masterView.year, currentWeek: masterView.currentWeek, module: 'category', nextNode: masterView.nextNode });
            const cardKey = '售罄追赶压力';

            cards.push({
                title: cardKey,
                signal: `当前售罄率 ${fmtPct(kpis.avgSellThrough)}，较阶段目标落后 ${fmtSignedPctGap(sellThroughGapPp)}。`,
                impact: `W04-W05 至少追回 ${sellThroughRecoveryPp.toFixed(1)}pct，否则夏一波会被动承接春尾压力。`,
                action: '先处理主推鞋型和走量带深度，再追回节前售罄缺口。',
                expectedImpact: `挽回约 ${sellThroughRecoveryPp.toFixed(1)}% 售罄损失`,
                channelPlan: '电商端加速春尾出清，线下端维持夏季新品折扣与形象。',
                tab: 'category',
                buttonLabel: '回到品类运营',
                tone,
                severity,
                deadline,
                daysLeft,
                status: riskStatuses[cardKey] || 'pending',
            });
        }

        if (currentTransition && newGoodsGapPp !== null && newGoodsGapPp < -2) {
            const tone = getNewGoodsTone(newGoodsGapPp);
            const severity = calculateRiskSeverity(newGoodsGapPp, tone);
            const { deadline, daysLeft } = buildAnnualControlModuleDeadline({ year: masterView.year, currentWeek: masterView.currentWeek, module: 'planning', nextNode: masterView.nextNode });
            const cardKey = '退旧进新错配';

            cards.push({
                title: cardKey,
                signal: `当前新品 ${fmtPct(currentTransition.actualNewGoodsRatio)} / 旧货 ${fmtPct(currentTransition.actualOldGoodsRatio)}，新品落后目标 ${fmtSignedPctGap(newGoodsGapPp)}。`,
                impact: `旧货仍占 ${fmtPct(currentTransition.actualOldGoodsRatio, 0)} 主陈列，会挤压五一前的夏一波承接空间。`,
                action: `强控春一波/二波尾货进入清仓区，腾挪 ${displayShiftPct}% 陈列位给当前主推主题。`,
                expectedImpact: `释放约 ${displayShiftPct}% 核心陈列带宽`,
                channelPlan: '库存与波段企划同步收口旧货，门店主入口优先让位给夏季主推组合。',
                tab: 'planning',
                buttonLabel: '处理退旧进新',
                tone,
                severity,
                deadline,
                daysLeft,
                status: riskStatuses[cardKey] || 'pending',
            });
        }

        if (
            targetPriceBand &&
            kpis &&
            ((marginGapPp !== null && marginGapPp < -1) || priceBandMismatch || (discountGuardrailGapPp !== null && discountGuardrailGapPp < 0))
        ) {
            const tone = marginGapPp !== null && marginGapPp <= -3 ? 'rose' : 'amber';
            const severity = calculateRiskSeverity(marginGapPp ?? -2, tone);
            const { deadline, daysLeft } = buildAnnualControlModuleDeadline({ year: masterView.year, currentWeek: masterView.currentWeek, module: 'otb', nextNode: masterView.nextNode });
            const cardKey = '价格带与毛利守线';

            cards.push({
                title: cardKey,
                signal: `主走量带应守住 ${targetPriceBand.range}，折扣红线 ${discountGuardrail ? fmtFold(discountGuardrail) : '待配置'}，当前平均成交约 ${actualDiscountRate ? fmtFold(actualDiscountRate) : '待数据'}。`,
                impact: `毛利较计划 ${marginGapPp !== null ? fmtSignedPctGap(marginGapPp) : '待对比'}${priceBandMismatch && actualPriceBand ? `，成交重心偏到 ${actualPriceBand.config.range}` : ''}。`,
                action: `优先守住 ${targetPriceBand.range} 的折扣红线，再回到 OTB 校正价格带深度。`,
                expectedImpact: `止损毛利率回弹至 ${targetBandMarginRate !== null ? fmtPct(targetBandMarginRate) : fmtPct(marginTarget)}`,
                channelPlan: '线下保折扣、保形象；电商承接低效尾货，不让主走量带被异常折扣拖垮。',
                tab: 'otb',
                buttonLabel: '查看 OTB 缺口',
                tone,
                severity,
                deadline,
                daysLeft,
                status: riskStatuses[cardKey] || 'pending',
            });
        }

        if (cards.length === 0) {
            const { deadline, daysLeft } = buildAnnualControlModuleDeadline({ year: masterView.year, currentWeek: masterView.currentWeek, module: 'planning', nextNode: masterView.nextNode });

            cards.push({
                title: '当前暂无高优先级异常',
                signal: '售罄、库存和结构仍在当前年度路径内。',
                impact: '本周重点保持节奏推进，不要提前放大折扣或打乱上新顺序。',
                action: '维持主推主题与价格带守线，继续盯下一节点承接。',
                expectedImpact: '维持年度经营稳健性',
                channelPlan: '电商与线下维持同口径表达，不额外制造结构扰动。',
                tab: 'planning',
                buttonLabel: '查看当前节奏',
                tone: 'emerald',
                severity: 0,
                deadline,
                daysLeft,
                status: 'resolved',
            });
        }

        // 按风险评分排序，最高风险在前
        return cards.sort((a, b) => b.severity - a.severity).slice(0, 3);
    }, [
        actualDiscountRate,
        actualPriceBand,
        currentTransition,
        discountGuardrail,
        discountGuardrailGapPp,
        displayShiftPct,
        kpis,
        marginGapPp,
        marginTarget,
        masterView.currentWeek,
        masterView.nextNode,
        masterView.year,
        newGoodsGapPp,
        priceBandMismatch,
        riskStatuses,
        sellThroughGapPp,
        sellThroughRecoveryPp,
        targetBandMarginRate,
        targetPriceBand,
    ]);

    // 处理风险状态变更
    const handleRiskStatusChange = (title: string, newStatus: 'pending' | 'in_progress' | 'resolved') => {
        setRiskStatuses((prev) => ({
            ...prev,
            [title]: newStatus,
        }));
    };

    const keyActions = useMemo(() => {
        const mappedP0 = currentActions
            .filter((item) => item.priority === 'P0')
            .map<KeyActionCard>((action) => {
                const buttonLabel = action.relatedModule === 'design-review' ? '打开 DRC' : '前往处理';
                const deadlineInfo = buildAnnualControlModuleDeadline({
                    year: masterView.year,
                    currentWeek: masterView.currentWeek,
                    module: action.relatedModule,
                    nextNode: masterView.nextNode,
                });
                const actionTone: Tone = action.riskFlag ? 'rose' : 'amber';
                return {
                    title: action.actionTitle,
                    owner:
                        action.teamType === '商品'
                            ? '商品 / 波段企划 / 库存'
                            : action.teamType === '设计企划'
                                ? '设计企划 / 商品 / DRC'
                                : '品牌陈列 / 渠道 / 商品',
                    detail: action.actionDesc,
                    expectedOutcome: '按计划推进阶段目标偏差收回',
                    collaborationStatus: '跨部门协同推进中',
                    deliverable: action.deliverable,
                    deadline: deadlineInfo.deadline,
                    window: masterView.nextNode ? `${masterView.currentWeekLabel} · ${masterView.nextNode.etaLabel}` : masterView.currentWeekLabel,
                    buttonLabel,
                    tone: actionTone,
                    onClick:
                        action.relatedModule === 'design-review'
                            ? onJumpToDesignReview
                            : () =>
                                onJumpToTab(
                                    action.relatedModule === 'planning'
                                        ? 'planning'
                                        : action.relatedModule === 'inventory'
                                            ? 'inventory'
                                            : action.relatedModule === 'otb'
                                                ? 'otb'
                                                : action.relatedModule === 'channel'
                                                    ? 'channel'
                                                    : 'category',
                                ),
                };
            });

        const derived: KeyActionCard[] = [];

        if (sellThroughGapPp !== null && sellThroughGapPp < -1) {
            const deadlineInfo = buildAnnualControlModuleDeadline({ year: masterView.year, currentWeek: masterView.currentWeek, module: 'category', nextNode: masterView.nextNode });
            derived.push({
                title: '追回当前售罄缺口',
                owner: '商品 / 渠道 / 电商',
                detail: `优先盯主推鞋型、门店深度和主走量带，把当前 ${fmtSignedPctGap(sellThroughGapPp)} 的售罄偏差收回到安全区。`,
                expectedOutcome: `单周强追售罄 ${sellThroughRecoveryPp.toFixed(1)}pct`,
                collaborationStatus: '已关联 OTB 动态调整',
                deliverable: '售罄追赶清单 + 主推鞋型深度复核',
                deadline: deadlineInfo.deadline,
                window: masterView.nextNode ? `${masterView.currentWeekLabel} · ${masterView.nextNode.etaLabel}` : masterView.currentWeekLabel,
                buttonLabel: '回到品类运营',
                tone: 'rose',
                onClick: () => onJumpToTab('category'),
            });
        }

        if (currentTransition && newGoodsGapPp !== null && newGoodsGapPp < -2) {
            const deadlineInfo = buildAnnualControlModuleDeadline({ year: masterView.year, currentWeek: masterView.currentWeek, module: 'planning', nextNode: masterView.nextNode });
            derived.push({
                title: '腾位处理春退夏进',
                owner: '商品 / 波段企划 / 品牌陈列',
                detail: `按当前新品缺口 ${fmtSignedPctGap(newGoodsGapPp)} 处理旧货退出，优先给 ${sceneLabel} 留出 ${displayShiftPct}% 主陈列位。`,
                expectedOutcome: `释放门店核心陈列带宽约 ${displayShiftPct}%`,
                collaborationStatus: '企划部已锁定退市清单',
                deliverable: '退市名单 + 五一主题腾位方案',
                deadline: deadlineInfo.deadline,
                window: masterView.nextNode ? `${masterView.currentWeekLabel} · ${masterView.nextNode.etaLabel}` : masterView.currentWeekLabel,
                buttonLabel: '前往波段企划',
                tone: 'amber',
                onClick: () => onJumpToTab('planning'),
            });
        }

        if (targetPriceBand && ((marginGapPp !== null && marginGapPp < -1) || priceBandMismatch || (discountGuardrailGapPp !== null && discountGuardrailGapPp < 0))) {
            const deadlineInfo = buildAnnualControlModuleDeadline({ year: masterView.year, currentWeek: masterView.currentWeek, module: 'otb', nextNode: masterView.nextNode });
            derived.push({
                title: '守住主走量带折扣红线',
                owner: 'OTB / 商品 / 渠道',
                detail: `把 ${targetPriceBand.range} 主走量带的成交与折扣重新拉回 ${discountGuardrail ? fmtFold(discountGuardrail) : '目标折扣'} 红线，避免毛利继续偏离。`,
                expectedOutcome: `保障主走量带毛利贡献率达 ${targetBandMarginRate !== null ? fmtPct(targetBandMarginRate) : fmtPct(marginTarget)}`,
                collaborationStatus: '待渠道部总负责人确认',
                deliverable: 'OTB 缺口校正单 + 价格带守线表',
                deadline: deadlineInfo.deadline,
                window: masterView.nextNode ? `${masterView.currentWeekLabel} · ${masterView.nextNode.label}` : masterView.currentWeekLabel,
                buttonLabel: '查看 OTB 缺口',
                tone: 'rose',
                onClick: () => onJumpToTab('otb'),
            });
        }

        const actionMap = new Map<string, KeyActionCard>();
        [...mappedP0, ...derived].forEach((item) => {
            if (!actionMap.has(item.title)) actionMap.set(item.title, item);
        });
        return [...actionMap.values()].slice(0, 3);
    }, [
        currentActions,
        currentTransition,
        discountGuardrail,
        discountGuardrailGapPp,
        displayShiftPct,
        marginGapPp,
        marginTarget,
        masterView.currentWeek,
        masterView.currentWeekLabel,
        masterView.nextNode,
        masterView.year,
        newGoodsGapPp,
        onJumpToDesignReview,
        onJumpToTab,
        priceBandMismatch,
        sceneLabel,
        sellThroughGapPp,
        sellThroughRecoveryPp,
        targetBandMarginRate,
        targetPriceBand,
    ]);

    const estimatedNewGoodsUnitsGap =
        kpis && newGoodsGapPp !== null && newGoodsGapPp < 0
            ? Math.round((kpis.totalOnHandUnits * Math.abs(newGoodsGapPp)) / 100)
            : null;

    const estimatedSellThroughUnitsGap =
        kpis && sellThroughGapPp !== null && sellThroughGapPp < 0
            ? Math.round(((kpis.totalOnHandUnits + kpis.totalUnits) * Math.abs(sellThroughGapPp)) / 100)
            : null;

    const wosDiagnosis = wosGapWeeks !== null && wosGapWeeks > 0.6
        ? (newGoodsGapPp !== null && newGoodsGapPp < -2 ? '主因：旧货清货迟缓' : '主因：下一波段新品建仓')
        : (wosGapWeeks !== null && wosGapWeeks < -0.8 ? '主因：走量款断码缺货' : '');

    const currentBottleneck =
        newGoodsGapPp !== null && newGoodsGapPp < -2
            ? `春退 / 夏进重叠，新品落后目标 ${fmtSignedPctGap(newGoodsGapPp)}。`
            : sellThroughGapPp !== null && sellThroughGapPp < -1
                ? `当前售罄落后目标 ${fmtSignedPctGap(sellThroughGapPp)}，主推鞋型需要追回节奏。`
                : priceBandMismatch && actualPriceBand
                    ? `成交重心偏到 ${actualPriceBand.config.range}，主走量带需要回正。`
                    : wosGapWeeks !== null && Math.abs(wosGapWeeks) >= 0.6
                        ? `${getWosHealthLabel(kpis?.wos ?? null, wosGapWeeks)}，${wosGapBasisLabel} ${fmtSignedWeeks(wosGapWeeks)}。`
                        : '当前主路径仍可控，优先盯下一节点承接。';

    const countdownAction = currentTransition && wosGapWeeks !== null && wosGapWeeks > 0.6 && newGoodsGapPp !== null && newGoodsGapPp < -2
        ? `大促前还需消化 ${fmtPct(currentTransition.actualOldGoodsRatio, 0)} 旧货释放店容。`
        : `主推款到仓率健康，维持目前筹备节奏。`;

    const countdownLabel = masterView.nextNode
        ? `当前周次 ${masterView.currentWeekLabel} · 距 ${masterView.nextNode.label}还有 ${masterView.nextNode.etaLabel} · ${countdownAction}`
        : `当前周次 ${masterView.currentWeekLabel} · 等待下一节点`;

    const healthFooterItems = [
        {
            label: '售罄偏差',
            tone: getSellThroughTone(sellThroughGapPp),
            value: sellThroughGapPp !== null ? fmtSignedPctGap(sellThroughGapPp) : '待对比',
            detail: sellThroughGapPp !== null
                ? (estimatedSellThroughUnitsGap ? `当前 ${fmtPct(kpis?.avgSellThrough || 0)} vs 目标 ${fmtPct(sellThroughTarget)} · 换算滞销约 ${estimatedSellThroughUnitsGap.toLocaleString('zh-CN')} 双` : `当前 ${fmtPct(kpis?.avgSellThrough || 0)} vs 目标 ${fmtPct(sellThroughTarget)}`)
                : '等待售罄对比',
        },
        {
            label: 'WOS 异常',
            tone: getWosTone(kpis?.wos ?? null, wosGapWeeks),
            value: kpis ? `${kpis.wos.toFixed(1)}周` : '待数据',
            detail:
                wosGapWeeks !== null
                    ? `${getWosHealthLabel(kpis?.wos ?? null, wosGapWeeks)} · ${wosGapBasisLabel} ${fmtSignedWeeks(wosGapWeeks)}${wosDiagnosis ? ` · ${wosDiagnosis}` : ''}`
                    : getWosHealthLabel(kpis?.wos ?? null, wosGapWeeks),
        },
        {
            label: '毛利守线',
            tone: getMarginTone(marginGapPp),
            value: marginGapPp !== null ? fmtSignedPctGap(marginGapPp) : '待对比',
            detail:
                marginGapPp !== null
                    ? `毛利 ${fmtPct(kpis?.avgMarginRate || 0)}${discountGuardrail ? ` · 折扣红线 ${fmtFold(discountGuardrail)}` : ''}`
                    : '等待毛利与折扣对比',
        },
        {
            label: '新货结构',
            tone: getNewGoodsTone(newGoodsGapPp),
            value: newGoodsGapPp !== null ? fmtSignedPctGap(newGoodsGapPp) : '待对比',
            detail: currentTransition
                ? `实际新货 ${fmtPct(currentTransition.actualNewGoodsRatio)} vs 目标 ${fmtPct(currentTransition.newGoodsRatio)}${estimatedNewGoodsUnitsGap ? ` · 约补足 ${estimatedNewGoodsUnitsGap.toLocaleString('zh-CN')} 双` : ''}`
                : '等待新旧货结构口径',
        },
    ];

    const collaborationItems = [
        {
            key: 'otb',
            title: 'OTB',
            subtitle: '货盘 / 预算',
            metric: currentTransition ? fmtPct(currentTransition.actualNewGoodsRatio) : '待数据',
            metricLabel: '新货占比',
            tone: (priceBandMismatch || (newGoodsGapPp !== null && newGoodsGapPp < -2) || (marginGapPp !== null && marginGapPp < -1))
                ? ((priceBandMismatch || (marginGapPp !== null && marginGapPp <= -2)) ? 'rose' : 'amber')
                : 'slate',
            detail: targetPriceBand
                ? `${targetPriceBand.range} 需守住 ${discountGuardrail ? fmtFold(discountGuardrail) : '折扣红线'}。`
                : '当前结构与预算需联动校正。',
            buttonLabel: (priceBandMismatch || (newGoodsGapPp !== null && newGoodsGapPp < -2) || (marginGapPp !== null && marginGapPp < -1)) ? '查看 OTB 缺口' : '进入 OTB',
            onClick: () => onJumpToTab('otb'),
        },
        {
            key: 'planning',
            title: 'Planning',
            subtitle: '波段 / 节奏',
            metric: masterView.currentWave,
            metricLabel: '当前波段',
            tone: (newGoodsGapPp !== null && newGoodsGapPp < -2) || alignedFocusCount < 2 ? 'amber' : 'slate',
            detail: currentTransition
                ? `春退 / 夏进正在重叠，建议腾挪 ${displayShiftPct}% 陈列位格。`
                : '当前波段承接需在企划层确认。',
            buttonLabel: (newGoodsGapPp !== null && newGoodsGapPp < -2) || alignedFocusCount < 2 ? '处理波段承接' : '进入企划',
            onClick: () => onJumpToTab('planning'),
        },
        {
            key: 'inventory',
            title: 'Inventory',
            subtitle: '库存 / 清货',
            metric: kpis ? `${kpis.wos.toFixed(1)}周` : '待数据',
            metricLabel: 'WOS周转',
            tone: getWosTone(kpis?.wos ?? null, wosGapWeeks) === 'rose'
                ? 'rose'
                : getWosTone(kpis?.wos ?? null, wosGapWeeks) === 'amber'
                    ? 'amber'
                    : 'slate',
            detail: currentTransition
                ? `旧货 ${fmtPct(currentTransition.actualOldGoodsRatio)} 仍在压当前承接。`
                : '库存健康页需确认旧货退出节奏。',
            buttonLabel: getWosTone(kpis?.wos ?? null, wosGapWeeks) !== 'emerald' ? '处理库存承压' : '进入库存',
            onClick: () => onJumpToTab('inventory'),
        },
        {
            key: 'drc',
            title: 'DRC',
            subtitle: '回传 / 设计',
            metric: focusContributionShare !== null ? fmtPct(focusContributionShare) : '待数据',
            metricLabel: '重点贡献',
            tone: focusContributionShare !== null && focusContributionShare < 0.35 ? 'amber' : 'slate',
            detail: `验证 ${designReviewInput.mainLastShape} 与 ${designReviewInput.mainBottomType} 在当前主推场景的试销反馈。`,
            buttonLabel: focusContributionShare !== null && focusContributionShare < 0.35 ? '查看回传任务' : '打开 DRC',
            onClick: onJumpToDesignReview,
        },
    ] as const;
    const collaborationIssueCount = collaborationItems.filter((item) => item.tone !== 'slate').length;
    const firstCollaborationIssue = collaborationItems.find((item) => item.tone !== 'slate') ?? null;

    return (
        <div className="space-y-8">
            <AnnualControlMasterView model={masterView} />

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <SectionHeading
                        title="经营体征"
                        description="把健康度诊断和目标对齐合在一层，只回答两件事：偏离了多少，以及卡点现在卡在哪。"
                    />
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Pill tone="pink">当前 {masterView.currentWave}</Pill>
                        <Pill tone="slate">{scopeLabel}</Pill>
                        {compareMode !== 'none' ? <Pill tone="sky">{compareMeta.modeLabel}</Pill> : null}
                        {focusCategoriesLabel ? <Pill tone="amber">{focusCategoriesLabel}</Pill> : null}
                        {masterView.nextNode ? <Pill tone="amber">{masterView.nextNode.etaLabel} · {masterView.nextNode.label}</Pill> : null}
                    </div>
                </div>

                <div className={`mt-6 rounded-[28px] border p-6 ${TONE_PANEL_CLASS[getRiskPanelTone(annualHealthTone)]}`}>
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex-1 max-w-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-700">
                                    <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT_CLASS[annualHealthTone]} shadow-sm animate-pulse`} />
                                    年度经营健康灯
                                </div>
                                {/* 健康度趋势指示 */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-400">本周趋势</span>
                                    {annualHealthTone === 'rose' ? (
                                        <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                        </svg>
                                    ) : annualHealthTone === 'amber' ? (
                                        <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <div className={`mt-3 text-2xl font-bold tracking-tight ${annualHealthTone === 'rose' ? 'text-rose-700' : annualHealthTone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{getAnnualHealthCopy(annualHealthTone)}</div>

                            <div className={`mt-4 flex items-start gap-3 rounded-2xl bg-white/60 p-4 border border-white backdrop-blur-sm ${annualHealthTone === 'rose' ? 'ring-1 ring-rose-200/50' : 'ring-1 ring-amber-200/50'}`}>
                                <div className={`mt-0.5 ${annualHealthTone === 'rose' ? 'text-rose-500' : annualHealthTone === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {annualHealthTone === 'rose' || annualHealthTone === 'amber' ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-slate-900">当前卡点</div>
                                    <div className="text-sm leading-6 text-slate-600">{currentBottleneck}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 xl:max-w-[40%] xl:justify-end">
                            <span className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm">{stage.priority}</span>
                            {currentTransition ? <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">{currentTransition.handoffFocus}</span> : null}
                            {focusRoleLabel ? <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-600 shadow-sm">{focusRoleLabel}</span> : null}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {healthFooterItems.map((item, index) => {
                            const valueColor = item.tone === 'rose' ? 'text-rose-600' : item.tone === 'amber' ? 'text-amber-600' : 'text-emerald-600';
                            const isWorst = item.tone === 'rose';
                            const parsedValue = Number.parseFloat(item.value);
                            const progressWidth = Number.isFinite(parsedValue) ? Math.min(100, Math.abs(parsedValue) * 10) : 0;
                            return (
                                <div
                                    key={item.label}
                                    className={`relative overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 transition hover:shadow-md ${
                                        isWorst ? 'ring-rose-200 ring-2' : 'ring-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                            <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT_CLASS[item.tone]}`} />
                                            {item.label}
                                        </div>
                                        {/* 排名标识 */}
                                        {index === 0 && isWorst && (
                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-600 uppercase">最差</span>
                                        )}
                                    </div>
                                    <div className={`mt-3 text-3xl font-black tabular-nums tracking-tighter ${valueColor}`}>{item.value}</div>
                                    <div className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</div>
                                    {/* 进度条 */}
                                    {item.tone !== 'emerald' && (
                                        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full transition-all ${item.tone === 'rose' ? 'bg-rose-500' : 'bg-amber-400'}`}
                                                style={{ width: `${progressWidth}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                目标对齐区
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase font-bold text-slate-500">Alignment</span>
                            </h3>
                            <p className="text-sm text-slate-400">仅保留当前阶段最紧要的三张动作卡片，聚焦重点攻坚指标。</p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {compareMode !== 'none' ? `当前对比：${compareMeta.modeLabel}` : '当前未开启对比'}
                        </div>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-3">
                        <InsightCard
                            label="切换重叠期"
                            title={currentTransition ? `实际新货 ${fmtPct(currentTransition.actualNewGoodsRatio)} vs 目标 ${fmtPct(currentTransition.newGoodsRatio)}` : '当前切换窗口等待口径。'}
                            detail={
                                currentTransition
                                    ? `强控春一波 / 二波尾货进清仓区，腾挪 ${displayShiftPct}% 陈列位给 ${sceneLabel}。`
                                    : '按季度切换节奏管理新旧货。'
                            }
                            tone={getRiskPanelTone(getNewGoodsTone(newGoodsGapPp))}
                        >
                            {newGoodsGapPp !== null ? <Pill tone={getRiskPanelTone(getNewGoodsTone(newGoodsGapPp))}>新品 {fmtSignedPctGap(newGoodsGapPp)}</Pill> : null}
                            {estimatedNewGoodsUnitsGap ? <Pill tone="amber">约补足 {estimatedNewGoodsUnitsGap.toLocaleString('zh-CN')} 双</Pill> : null}
                        </InsightCard>

                        <InsightCard
                            label="价格带守线"
                            title={targetPriceBand ? `${targetPriceBand.range} 走量带` : '当前主走量带等待口径。'}
                            detail={
                                targetPriceBand
                                    ? `折扣需守住 ${discountGuardrail ? fmtFold(discountGuardrail) : '红线'}，保障当前阶段毛利。${priceBandMismatch && actualPriceBand ? ` 当前成交偏到 ${actualPriceBand.config.range}。` : ''}`
                                    : '等待价格带与毛利守线数据。'
                            }
                            tone={priceBandMismatch || (marginGapPp !== null && marginGapPp < -1) ? 'rose' : 'amber'}
                        >
                            {targetBandMarginRate !== null ? <Pill tone="slate">目标带毛利 {fmtPct(targetBandMarginRate)}</Pill> : null}
                            {actualLeaderMarginRate !== null ? <Pill tone="amber">成交带毛利 {fmtPct(actualLeaderMarginRate)}</Pill> : null}
                        </InsightCard>

                        <InsightCard
                            label="当前波段倒计时"
                            title={`${masterView.currentWave} · ${stage.label}`}
                            detail={countdownLabel}
                            tone="sky"
                        >
                            <Pill tone="sky">{masterView.currentWeekLabel}</Pill>
                            {masterView.nextNode ? <Pill tone="amber">{masterView.nextNode.label}</Pill> : null}
                            <Pill tone="slate">夏上新 / 春出清 / 冬评审</Pill>
                        </InsightCard>
                    </div>
                </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <SectionHeading
                    title="风险干预中心"
                    description="发现背离并挂载确定性动作。仅展示会改变季度经营路径的 P0 级事项。"
                />
                <div className="mt-8 grid gap-8 xl:grid-cols-2">
                    <div className="space-y-4 flex flex-col">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-bold uppercase tracking-wider text-slate-400">损益影响与风险探测</div>
                        </div>
                        <div className="grid gap-4 flex-1">
                            {riskCards.map((card, index) => {
                                const tone = getRiskPanelTone(card.tone);
                                const isTopRisk = index === 0 && card.severity >= 70;
                                const urgencyLevel = card.daysLeft <= 3 ? 'critical' : card.daysLeft <= 7 ? 'high' : 'normal';

                                return (
                                    <div
                                        key={card.title}
                                        className={`group relative rounded-2xl border bg-white shadow-sm transition hover:shadow-md border-l-[6px] ${
                                            isTopRisk ? 'p-6 ring-2 ring-rose-100' : 'p-5 border-slate-100'
                                        }`}
                                        style={{ borderLeftColor: tone === 'rose' ? '#f43f5e' : tone === 'amber' ? '#fbbf24' : '#10b981' }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`${isTopRisk ? 'text-xl' : 'text-lg'} font-bold text-slate-900`}>{card.title}</div>
                                                    {card.status === 'in_progress' && (
                                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">处理中</span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-black tracking-tighter ${
                                                        tone === 'rose' ? 'bg-rose-100 text-rose-600' :
                                                        tone === 'amber' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-emerald-100 text-emerald-600'
                                                    }`}>
                                                        {tone === 'rose' ? 'High Priority' : tone === 'amber' ? 'Medium Priority' : 'Low Priority'}
                                                    </span>
                                                    <span className="text-xs text-slate-400">风险评分: <span className="font-bold text-slate-600">{card.severity}</span></span>
                                                </div>
                                            </div>

                                            {/* 倒计时标签 */}
                                            <div className={`flex flex-col items-end gap-1 ${isTopRisk ? 'scale-110' : ''}`}>
                                                <div className={`rounded-lg px-3 py-1.5 text-center ${
                                                    urgencyLevel === 'critical' ? 'bg-rose-500 text-white animate-pulse' :
                                                    urgencyLevel === 'high' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                                                        {urgencyLevel === 'critical' ? '紧急' : urgencyLevel === 'high' ? '重要' : '常规'}
                                                    </div>
                                                    <div className="text-lg font-black leading-none mt-0.5">
                                                        {card.daysLeft > 0 ? `${card.daysLeft}天` : '已逾期'}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-slate-400 whitespace-nowrap">{card.deadline}</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3">
                                            <div className="flex gap-3 text-sm leading-relaxed">
                                                <span className="w-16 shrink-0 font-bold text-slate-400">异常信号</span>
                                                <span className="text-slate-800 font-medium">{card.signal}</span>
                                            </div>
                                            <div className="flex gap-3 text-sm leading-relaxed">
                                                <span className="w-16 shrink-0 font-bold text-slate-400">损益预测</span>
                                                <span className="text-slate-600 italic">{card.impact}</span>
                                            </div>
                                            <div className="flex gap-3 text-sm leading-relaxed">
                                                <span className="w-16 shrink-0 font-bold text-slate-400">核心动作</span>
                                                <span className="text-slate-900 font-bold">{card.action}</span>
                                            </div>
                                            <div className="flex gap-3 text-sm leading-relaxed items-center">
                                                <span className="w-16 shrink-0 font-bold text-slate-400">预期战果</span>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                                                    tone === 'rose' ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' :
                                                    tone === 'amber' ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' :
                                                    'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                                                }`}>
                                                    {card.expectedImpact}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4 gap-3">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                                                <span className="text-xs text-slate-400 truncate">涉及渠道计划：<span className="text-slate-600 font-medium">{card.channelPlan}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* 快速状态切换按钮 */}
                                                {card.status !== 'resolved' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRiskStatusChange(
                                                                card.title,
                                                                card.status === 'pending' ? 'in_progress' : 'resolved'
                                                            );
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                                        title={card.status === 'pending' ? '标记为处理中' : '标记为已解决'}
                                                    >
                                                        {card.status === 'pending' ? (
                                                            <>
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                开始处理
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                标记完成
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => onJumpToTab(card.tab)}
                                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition ${
                                                        isTopRisk
                                                            ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {card.buttonLabel}
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4 flex flex-col">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-bold uppercase tracking-wider text-slate-400">P0 异常干预执行清单</div>
                        </div>
                        <div className="grid gap-4 flex-1">
                            {keyActions.length > 0 ? (
                                keyActions.map((action) => (
                                    <div key={action.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md border-t-[6px] h-full flex flex-col" style={{ borderTopColor: action.tone === 'rose' ? '#f43f5e' : '#fbbf24' }}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-base font-black text-slate-900 tracking-tight">{action.title}</div>
                                                <div className="mt-1 text-[11px] font-bold text-slate-400 lowercase tracking-widest leading-none">Owner: <span className="text-slate-500 uppercase">{action.owner}</span></div>
                                            </div>
                                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white ${action.tone === 'rose' ? 'bg-rose-500' : 'bg-amber-400'}`}>P0</span>
                                        </div>
                                        
                                        <div className="mt-5 text-sm font-medium leading-relaxed text-slate-600 flex-1">
                                            {action.detail}
                                        </div>

                                        <div className="mt-5 space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-400">协同状态</span>
                                                <span className="font-bold text-slate-700 underline decoration-slate-200 underline-offset-4">{action.collaborationStatus}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-400">预期战果</span>
                                                <span className="font-black text-slate-900">{action.expectedOutcome}</span>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-2">
                                            <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 ring-1 ring-slate-200/50">截止 {action.deadline}</span>
                                            <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase text-sky-600 ring-1 ring-sky-200/50">剩余 {action.window}</span>
                                        </div>

                                        <div className="mt-6 border-t border-slate-50 pt-5">
                                            <ModuleActionButton label={action.buttonLabel} onClick={action.onClick} fullWidth />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                                    <div className="text-sm font-bold text-slate-400">当前主路径稳健，暂无 P0 级干预项</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                    <SectionHeading
                        title="协作枢纽"
                        description="跨模块输出降成异常亮灯导航。正常模块默认置灰，异常模块展开深度处理入口。"
                    />
                    {/* 快速处理 */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">快速处理:</span>
                        <button
                            type="button"
                            onClick={() => firstCollaborationIssue?.onClick()}
                            disabled={!firstCollaborationIssue}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                firstCollaborationIssue
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                            }`}
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {firstCollaborationIssue ? `优先处理异常 (${collaborationIssueCount})` : '当前无异常'}
                        </button>
                    </div>
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {collaborationItems.map((item) => {
                        const hasIssue = item.tone !== 'slate';
                        const accentColor = item.tone === 'rose' ? '#f43f5e' : item.tone === 'amber' ? '#fbbf24' : '#f1f5f9';
                        const isUrgent = item.tone === 'rose';

                        return (
                            <div
                                key={item.key}
                                className={`group relative flex flex-col rounded-[24px] border bg-white p-5 transition hover:shadow-md border-l-[6px] ${
                                    hasIssue ? 'shadow-sm' : 'opacity-75 hover:opacity-100'
                                } ${isUrgent ? 'ring-2 ring-rose-100' : 'border-slate-100'}`}
                                style={{ borderLeftColor: accentColor }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className={`text-base font-black tracking-tight ${hasIssue ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {item.title}
                                    </div>
                                    {/* 状态图标 */}
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                        isUrgent ? 'bg-rose-100' :
                                        hasIssue ? 'bg-amber-100' :
                                        'bg-slate-100'
                                    }`}>
                                        {hasIssue ? (
                                            <svg className={`h-4 w-4 ${isUrgent ? 'text-rose-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{item.subtitle}</span>
                                    {hasIssue && (
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                            isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            {isUrgent ? '紧急' : '关注'}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.metricLabel}:</span>
                                    <span className={`text-2xl font-black tabular-nums tracking-tighter ${
                                        hasIssue ? (isUrgent ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'
                                    }`}>
                                        {item.metric}
                                    </span>
                                </div>

                                <div className={`mt-3 flex-grow text-sm leading-relaxed font-medium ${
                                    hasIssue ? 'text-slate-700' : 'text-slate-500'
                                }`}>
                                    {hasIssue ? item.detail : '该模块核心指标在预设区间内波动，暂无异常风险。'}
                                </div>

                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={item.onClick}
                                        className={`w-full rounded-xl border px-4 py-2.5 text-xs font-bold shadow-sm transition ${
                                            hasIssue
                                                ? isUrgent
                                                    ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                                    : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {item.buttonLabel}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}


