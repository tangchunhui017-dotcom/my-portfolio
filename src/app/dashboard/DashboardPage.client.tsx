'use client';

import { useDashboardFilter, CompareMode } from '@/hooks/useDashboardFilter';
import FilterBar from '@/components/dashboard/FilterBar';
import MetricsDrawer from '@/components/dashboard/MetricsDrawer';
import DashboardChart, { type SellThroughCaliber } from '@/components/charts/DashboardChart';
import SkuRiskList from '@/components/dashboard/SkuRiskList';
import DashboardSummaryButton from '@/components/dashboard/DashboardSummaryButton';
import SkuDetailModal, { SkuDrillData } from '@/components/dashboard/SkuDetailModal';
import OverviewKpiBar from '@/components/dashboard/OverviewKpiBar';
import AnnualControlPanel from '@/components/dashboard/AnnualControlPanel';
import NarrativeSummary from '@/components/dashboard/NarrativeSummary';
import ProductBasicPanel from '@/components/dashboard/ProductBasicPanel';
import CategoryOpsPanel from '@/components/dashboard/CategoryOpsPanel';
import CategoryFeedbackBanner from '@/components/dashboard/CategoryFeedbackBanner';
import WavePlanningPanel from '@/components/dashboard/WavePlanningPanel';
import ChannelAnalysisPanel from '@/components/dashboard/ChannelAnalysisPanel';
import CompetitorTrendPanel from '@/components/dashboard/CompetitorTrendPanel';
import MonthlyAchievementPanel from '@/components/dashboard/MonthlyAchievementPanel';
import ChannelInventoryPanel from '@/components/dashboard/ChannelInventoryPanel';
import AssortmentHealthBar from '@/components/dashboard/AssortmentHealthBar';
import SizeHealthPanel from '@/components/dashboard/SizeHealthPanel';
import WaveExecutionPanel from '@/components/dashboard/WaveExecutionPanel';
import LifecycleAssortmentPanel from '@/components/dashboard/LifecycleAssortmentPanel';
import ClearancePacePanel from '@/components/dashboard/ClearancePacePanel';
import { resolveDashboardLifecycleLabel, type DashboardLifecycleLabel } from '@/config/dashboardLifecycle';
import DiagnosisActionPanel from '@/components/dashboard/DiagnosisActionPanel';
import OtbBudgetStrip from '@/components/dashboard/OtbBudgetStrip';
import InventoryHealth from '@/components/dashboard/InventoryHealth';
import InventoryFeedbackBanner from '@/components/inventory/InventoryFeedbackBanner';
import PnlFeedbackBanner from '@/components/profit-loss/PnlFeedbackBanner';
import ForecastTab from '@/components/forecast/ForecastTab';
import ProfitLossTab from '@/components/profit-loss/ProfitLossTab';
import OtbTab from '@/components/otb/OtbTab';
import OtbNavigationContextPanel from '@/components/otb/OtbNavigationContextPanel';
import type { OtbNavigationContext } from '@/components/otb/types';
import CashflowPanel from '@/components/otb/CashflowPanel';
import ChartCard from '@/components/charts/ChartCard';
import MetricChips, { type MetricChipItem } from '@/components/charts/MetricChips';
import { FOOTWEAR_ANALYSIS_MODULES } from '@/config/footwearLanguage';
import { useState, useRef, useMemo, useEffect } from 'react';
import { formatMoneyCny } from '@/config/numberFormat';
import { THRESHOLDS } from '@/config/thresholds';
import { GlobalConfigProvider, useGlobalConfig } from '@/context/GlobalConfigContext';
import { MerchConfigProvider } from '@/context/MerchConfigContext';
import GlobalConfigDrawer from '@/components/config/GlobalConfigDrawer';
import BusinessLoopHeader from '@/components/dashboard/BusinessLoopHeader';
import { DASHBOARD_TAB_TO_CONFIG_TAB } from '@/config/dashboardTabMap';

type DashboardTab = 'overview' | 'annual-control' | 'consumer' | 'category' | 'channel' | 'planning' | 'otb' | 'cashflow' | 'forecast' | 'profit-loss' | 'competitor' | 'inventory';
type DashboardRecord = ReturnType<typeof useDashboardFilter>['filteredRecords'][number];
type DashboardFilterWindow = Window & { __openDashboardFilterBar?: () => void };

const OTB_NAVIGATION_CONTEXT_KEY = 'otb-navigation-context';
const OTB_NAVIGATION_CONTEXT_EVENT = 'otb-navigation-context-change';

function readStoredOtbNavigationContext(): OtbNavigationContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(OTB_NAVIGATION_CONTEXT_KEY);
        return raw ? (JSON.parse(raw) as OtbNavigationContext) : null;
    } catch {
        return null;
    }
}

function persistStoredOtbNavigationContext(context: OtbNavigationContext | null): OtbNavigationContext | null {
    const nextContext = context
        ? { ...context, createdAt: context.createdAt ?? new Date().toISOString() }
        : null;
    if (typeof window === 'undefined') return nextContext;
    try {
        if (nextContext) {
            sessionStorage.setItem(OTB_NAVIGATION_CONTEXT_KEY, JSON.stringify(nextContext));
        } else {
            sessionStorage.removeItem(OTB_NAVIGATION_CONTEXT_KEY);
        }
        window.dispatchEvent(new CustomEvent<OtbNavigationContext | null>(OTB_NAVIGATION_CONTEXT_EVENT, {
            detail: nextContext,
        }));
    } catch {
        /* noop */
    }
    return nextContext;
}

const TABS: { key: DashboardTab; label: string; icon: string }[] = [
    { key: 'overview', label: '总览', icon: '📊' },
    { key: 'annual-control', label: '年度总控', icon: '🗺️' },
    { key: 'channel', label: '区域&门店', icon: '🏪' },
    { key: 'consumer', label: '消费者画像', icon: '🧑‍🤝‍🧑' },
    { key: 'category', label: '品类运营', icon: '📋' },
    { key: 'planning', label: '波段企划', icon: '📅' },
    { key: 'otb', label: 'OTB预算', icon: '💰' },
    { key: 'cashflow', label: '现金流', icon: '💧' },
    { key: 'forecast', label: '销售预测', icon: '📈' },
    { key: 'profit-loss', label: '损益', icon: '💹' },
    { key: 'competitor', label: '竞品&趋势', icon: '🧭' },
    { key: 'inventory', label: '库存健康', icon: '📦' },
];

const PRICE_BAND_NAMES: Record<string, string> = {
    PB1: '199-399',
    PB2: '399-599',
    PB3: '599-799',
    PB4: '800+',
};

function OverviewSectionHeading({
    label,
    title,
    description,
    className = '',
}: {
    label: string;
    title: string;
    description: string;
    className?: string;
}) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">{title}</h2>
                <p className="max-w-2xl text-xs leading-5 text-slate-500">{description}</p>
            </div>
        </div>
    );
}


export default function DashboardPage() {
    return (
        <MerchConfigProvider>
            <GlobalConfigProvider>
                <DashboardPageInner />
            </GlobalConfigProvider>
        </MerchConfigProvider>
    );
}

function DashboardPageInner() {
    const [configOpen, setConfigOpen] = useState(false);
    const { config } = useGlobalConfig();
    const [compareMode, setCompareMode] = useState<CompareMode>('none');
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [otbNavigationContext, setOtbNavigationContext] = useState<OtbNavigationContext | null>(() => readStoredOtbNavigationContext());
    // forecast / profit-loss 不参与比对模式，退化为 overview context
    const compareContext = (activeTab === 'forecast' || activeTab === 'profit-loss')
        ? 'overview' as const
        : activeTab as import('@/config/dashboardCompare').DashboardCompareContext;
    const { filters, setFilters, kpis, filterSummary, baselineKpis, compareMeta, filteredRecords, transitionRecords, skuMap } = useDashboardFilter(compareMode, compareContext);
    const [selectedSku, setSelectedSku] = useState<SkuDrillData | null>(null);
    const [selectedOverviewModuleId, setSelectedOverviewModuleId] = useState('annual-performance');
    const [overviewSellThroughCaliber, setOverviewSellThroughCaliber] = useState<SellThroughCaliber>('active');

    useEffect(() => {
        const handleContextChange = (event: Event) => {
            setOtbNavigationContext((event as CustomEvent<OtbNavigationContext | null>).detail ?? null);
        };
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === OTB_NAVIGATION_CONTEXT_KEY) {
                setOtbNavigationContext(readStoredOtbNavigationContext());
            }
        };
        window.addEventListener(OTB_NAVIGATION_CONTEXT_EVENT, handleContextChange);
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener(OTB_NAVIGATION_CONTEXT_EVENT, handleContextChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
    
    const effectiveCompareMode: CompareMode =
        (compareMode === 'mom' && !compareMeta.momAvailable) ||
            (compareMode === 'plan' && !compareMeta.planAvailable)
            ? 'none'
            : compareMode;

    const skuWosData = useMemo<Array<{
        skuId: string;
        name: string;
        category: string;
        wos: number;
        onHandUnits: number;
        sellThrough: number;
        lifecycle: DashboardLifecycleLabel | '-';
        msrp: number;
    }>>(() => {
        if (!filteredRecords || filteredRecords.length === 0) return [];
        const skuAgg: Record<string, { onHand: number; weeklyByWeek: Record<number, number>; week: number; st: number }> = {};
        filteredRecords.forEach((r: DashboardRecord) => {
            if (!skuAgg[r.sku_id]) {
                skuAgg[r.sku_id] = { onHand: 0, weeklyByWeek: {}, week: 0, st: 0 };
            }
            const entry = skuAgg[r.sku_id];
            entry.weeklyByWeek[r.week_num] = (entry.weeklyByWeek[r.week_num] ?? 0) + r.unit_sold;
            if (r.week_num > entry.week) {
                entry.onHand = r.on_hand_unit;
                entry.week = r.week_num;
                entry.st = r.cumulative_sell_through;
            }
        });
        return Object.entries(skuAgg).map(([skuId, d]) => {
            const sku = skuMap[skuId];
            // 近 4 周滚动均值
            const sortedWeeks = Object.keys(d.weeklyByWeek).map(Number).sort((a, b) => b - a);
            const rolling4 = sortedWeeks.slice(0, 4);
            const avgWeekly = rolling4.length > 0
                ? rolling4.reduce((s, w) => s + d.weeklyByWeek[w], 0) / rolling4.length
                : 0;
            const wos = avgWeekly > 0 ? Math.round((d.onHand / avgWeekly) * 10) / 10 : 0;
            return {
                skuId,
                name: sku?.sku_name || skuId,
                category: sku?.category_name || '-',
                wos,
                onHandUnits: d.onHand,
                sellThrough: d.st,
                lifecycle: sku ? resolveDashboardLifecycleLabel(filters, sku) : '-',
                msrp: sku?.msrp || 0,
            };
        });
    }, [filteredRecords, skuMap, filters]);

    const lineChartRef = useRef<HTMLDivElement>(null);
    const pieChartRef = useRef<HTMLDivElement>(null);
    const skuListRef = useRef<HTMLDivElement>(null);

    // 畅销/滞销 红黑榜
    const topBottomSkus = useMemo(() => {
        if (!filteredRecords || filteredRecords.length === 0) return { top: [], bottom: [] };
        const agg: Record<string, { name: string; category: string; sales: number; units: number; onHand: number; stRate: number; marginRate: number; price: number }> = {};
        filteredRecords.forEach((r: DashboardRecord) => {
            const id = r.sku_id;
            if (!agg[id]) {
                const info = skuMap?.[id];
                agg[id] = { name: info?.sku_name || id, category: info?.category_name || '--', sales: 0, units: 0, onHand: 0, stRate: 0, marginRate: 0, price: Number(info?.msrp || 0) };
            }
            agg[id].sales += Number(r.net_sales_amt || 0);
            agg[id].units += Number(r.unit_sold || 0);
            if (Number(r.on_hand_unit || 0) > agg[id].onHand) agg[id].onHand = Number(r.on_hand_unit || 0);
            agg[id].stRate = Number(r.cumulative_sell_through || 0);
            agg[id].marginRate = Number(r.gross_margin_rate || 0);
        });
        const entries = Object.values(agg);
        const top = [...entries].filter(s => s.sales > 0).sort((a, b) => b.sales - a.sales).slice(0, 10);
        const bottom = [...entries].filter(s => s.onHand > 0 && s.sales > 0).sort((a, b) => a.stRate - b.stRate).slice(0, 10);
        return { top, bottom };
    }, [filteredRecords, skuMap]);

    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    const jumpToTab = (tab: DashboardTab, context?: OtbNavigationContext | null) => {
        if (context) {
            const nextContext = persistStoredOtbNavigationContext({ ...context, targetModule: tab });
            setOtbNavigationContext(nextContext);
        }
        setActiveTab(tab);
    };
    const clearOtbNavigationContext = () => {
        setOtbNavigationContext(null);
        persistStoredOtbNavigationContext(null);
    };
    const jumpToSkuRisk = () => {
        setActiveTab('overview');
        window.requestAnimationFrame(() => {
            skuListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    };
    const jumpToDesignReview = () => {
        window.location.assign('/design-review-center');
    };

    const priceBandLeader = kpis
        ? Object.entries(kpis.priceBandSales).sort((a, b) => b[1].sales - a[1].sales)[0]
        : null;

    const priceBandMetricItems: MetricChipItem[] = kpis ? [
        { label: '核心价格带', value: priceBandLeader ? PRICE_BAND_NAMES[priceBandLeader[0]] : '-', detail: '销售额最高价格带', tone: 'amber' },
        { label: 'MSRP金额', value: formatMoneyCny(kpis.totalGrossSales), detail: '吊牌额', tone: 'slate' },
        { label: '毛利额', value: formatMoneyCny(kpis.totalGrossProfit), detail: '折扣贡献后毛利', tone: 'rose', detailTone: 'positive' },
    ] : [];

    // 品类饼图 metricStrip
    const topCategory = kpis
        ? Object.entries(kpis.categoryActual ?? {}).sort((a, b) => b[1].actual_sales - a[1].actual_sales)[0]
        : null;
    const categoryMetricItems: MetricChipItem[] = topCategory ? [
        {
            label: '首位品类',
            value: topCategory[0],
            detail: `售罄率 ${(topCategory[1].actual_sell_through * 100).toFixed(0)}%`,
            tone: 'emerald',
            detailTone: topCategory[1].actual_sell_through >= 0.75 ? 'positive' : 'warning',
        },
    ] : [];

    const barConclusion = (() => {
        if (!kpis) return {
            finding: '价格带分布分析中，可识别各价格段 SKU 集中度与销售贡献。',
            decision: '优化价格带结构，向高毛利价格段倾斜。',
            impact: '预计提升均价，改善整体毛利率。',
        };
        const pb = kpis.priceBandSales;
        const totalSales = kpis.totalNetSales;
        const bands = Object.entries(pb).sort((a, b) => b[1].sales - a[1].sales);
        const topBand = bands[0];
        const BAND_LABELS: Record<string, string> = {
            PB1: '199-399', PB2: '399-599', PB3: '599-799', PB4: '800+',
        };
        const topBandPct = topBand && totalSales > 0 ? Math.round(topBand[1].sales / totalSales * 100) : 0;
        const topBandLabel = topBand ? BAND_LABELS[topBand[0]] : '--';
        const highPriceSales = (pb['PB3']?.sales ?? 0) + (pb['PB4']?.sales ?? 0);
        const highPricePct = totalSales > 0 ? Math.round(highPriceSales / totalSales * 100) : 0;
        const lowPricePct = totalSales > 0 ? Math.round((pb['PB1']?.sales ?? 0) / totalSales * 100) : 0;
        return {
            finding: `${topBandLabel} 为最高贡献价格带，占净销售额 ${topBandPct}%；599+ 高价带贡献 ${highPricePct}%；199-399 低价带占比 ${lowPricePct}%。`,
            decision: highPricePct < 15
                ? '高价带占比偏低，下季度建议增加 599+ SKU 数量（目标 +3 款），收缩低价带至 10% 以内。'
                : `价格带结构合理，维持现有布局，重点提升 ${topBandLabel} 主力价格带深度。`,
            impact: '预计优化后均价提升 ￥30-50，毛利率改善 +1-2pp。',
        };
    })();

    const overviewSellThroughView = useMemo(() => {
        if (!kpis) return null;
        const sources: Record<SellThroughCaliber, {
            label: string;
            axisMode: 'relative' | 'calendar';
            data?: Record<number, { st: number; skuCount: number }>;
        }> = {
            cohort: { label: '同期群', axisMode: 'relative', data: kpis.cohortData },
            active: { label: '自然波段', axisMode: 'calendar', data: kpis.activeData },
            stage: { label: '新品群', axisMode: 'calendar', data: kpis.stageData },
        };
        const preferred = sources[overviewSellThroughCaliber];
        const preferredWeeks = Object.keys(preferred.data || {}).map(Number).sort((a, b) => a - b);
        const resolved = preferredWeeks.length > 0 ? preferred : sources.active;
        const data = resolved.data || {};
        const weeks = Object.keys(data).map(Number).sort((a, b) => a - b);
        const latestWeek = weeks[weeks.length - 1] ?? 0;
        const previousWeek = weeks.length > 1 ? weeks[weeks.length - 2] : latestWeek;
        const latestPoint = latestWeek ? data[latestWeek] : null;
        const previousPoint = previousWeek ? data[previousWeek] : latestPoint;
        const latestSellThrough = latestPoint?.st ?? kpis.avgSellThrough;
        const previousSellThrough = previousPoint?.st ?? latestSellThrough;
        return {
            ...resolved,
            weeks,
            latestWeek,
            latestSkuCount: latestPoint?.skuCount ?? 0,
            latestSellThrough,
            trendDeltaPp: (latestSellThrough - previousSellThrough) * 100,
        };
    }, [kpis, overviewSellThroughCaliber]);

    const lineConclusion = (() => {
        if (!kpis || !overviewSellThroughView) return {
            finding: '售罄率曲线反应当季动销节奏与去化效率。',
            decision: '对低动销款启动渠道调拨，加大流量投放。',
            impact: '预计追回目标线，减轻尾部库存压力。',
        };
        const targetPct = THRESHOLDS.sellThrough.target * 100;
        const latestPct = Number((overviewSellThroughView.latestSellThrough * 100).toFixed(1));
        const gapPp = Number((latestPct - targetPct).toFixed(1));
        const trendDeltaPp = Number(overviewSellThroughView.trendDeltaPp.toFixed(1));
        const directionText = Math.abs(trendDeltaPp) < 0.3
            ? '较前一观察点基本持平'
            : trendDeltaPp > 0
                ? '较前一观察点提升 ' + trendDeltaPp.toFixed(1) + 'pp'
                : '较前一观察点回落 ' + Math.abs(trendDeltaPp).toFixed(1) + 'pp';
        const waveContext = (() => {
            if (overviewSellThroughView.axisMode === 'relative') {
                return '上市后 W' + overviewSellThroughView.latestWeek;
            }
            const quarterIndex = Math.floor(Math.max(overviewSellThroughView.latestWeek - 1, 0) / 3);
            const phaseIndex = Math.max(overviewSellThroughView.latestWeek - 1, 0) % 3;
            const quarterLabels = ['Q1春', 'Q2夏', 'Q3秋', 'Q4冬'];
            const phaseLabels = ['新品期', '在售期', '折扣期'];
            return '自然波段 W' + overviewSellThroughView.latestWeek + '，' + (quarterLabels[quarterIndex] || '-') + ' · ' + (phaseLabels[phaseIndex] || '-') + '：';
        })();
        const statusText = gapPp >= 0
            ? waveContext + '累计售罄率 ' + latestPct + '%，较总览目标 ' + targetPct.toFixed(0) + '% 领先 ' + gapPp.toFixed(1) + 'pp'
            : waveContext + '累计售罄率 ' + latestPct + '%，距总览目标 ' + targetPct.toFixed(0) + '% 仍差 ' + Math.abs(gapPp).toFixed(1) + 'pp';
        return {
            finding: overviewSellThroughView.label + '口径下，' + statusText + '；' + directionText + '。' + (overviewSellThroughView.latestSkuCount > 0 ? '当前样本 ' + overviewSellThroughView.latestSkuCount + ' 个 SKU。' : ''),
            decision: overviewSellThroughView.axisMode === 'calendar'
                ? (gapPp < 0
                    ? '按四季节奏继续跟踪当前季度“新品 / 在售 / 折扣”三段去化，优先处理本季折扣段滞销款。'
                    : '当前季度节奏稳定，维持现有波段推进，提前准备下一季度新品承接。')
                : (gapPp < 0
                    ? '关注同期群上市后前 3 个波段的转化效率，避免新品爬坡慢于历史节奏。'
                    : '同期群去化健康，保持当前上新与补货节奏。'),
            impact: gapPp < 0
                ? (trendDeltaPp >= 0
                    ? '若维持当前斜率，季末仍有机会继续收敛目标差距。'
                    : '若不修正当前节奏，季末仍会承受去化与折扣压力。')
                : '按当前节奏推进，季末售罄率有望继续保持在目标线之上。',
        };
    })();

    const categoryPieConclusion = (() => {
        if (!kpis?.categoryActual) return {
            finding: '品类销售占比分析，识别主力品类与弱势品类。',
            decision: '加大首位品类资源投入，优化尾部品类 SKU 结构。',
            impact: '预计提升整体单款产出，改善毛利率。',
        };
        const cats = Object.entries(kpis.categoryActual)
            .sort((a, b) => b[1].actual_sales - a[1].actual_sales);
        const total = cats.reduce((s, [, d]) => s + d.actual_sales, 0);
        const topEntry = cats[0];
        const topName = topEntry ? topEntry[0] : '--';
        const topPct = topEntry && total > 0 ? Math.round(topEntry[1].actual_sales / total * 100) : 0;
        const lowST = cats.filter(([, d]) => d.actual_sell_through < 0.65);
        const byMargin = [...cats].sort((a, b) => b[1].actual_margin_rate - a[1].actual_margin_rate);
        const highMarginEntry = byMargin[0];
        const highMarginName = highMarginEntry ? highMarginEntry[0] : '--';
        const highMarginRate = highMarginEntry ? (highMarginEntry[1].actual_margin_rate * 100).toFixed(0) : '0';
        return {
            finding: `${topName} 为首位品类，占销售额 ${topPct}%；高毛利品类为 ${highMarginName}（${highMarginRate}%）；${lowST.length > 0 ? lowST.map(([c]) => c).join('、') + ' 售罄率偏低' : '各品类售罄节奏整体正常'}。`,
            decision: lowST.length > 0
                ? `对 ${lowST.map(([c]) => c).join('/')} 启动专项动销支持；下季度增加高毛利品类 ${highMarginName} 的 SKU 深度。`
                : `维持首位品类 ${topName} 的资源投入，同步拓展高毛利品类幅度。`,
            impact: '预计品类售罄均衡性提升，整体毛利率 +0.5-1.5pp。',
        };
    })();

    return (
        <>
            <div className="min-h-screen bg-slate-50">
                <FilterBar
                    filters={filters}
                    setFilters={setFilters}
                    filterSummary={filterSummary}
                    compareMode={effectiveCompareMode}
                    compareMeta={compareMeta}
                    onCompareModeChange={setCompareMode}
                    hideTrigger={true}
                />
                <div className="max-w-screen-2xl mx-auto px-6 pt-2 pb-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">商品企划</h1>
                            <p className="text-slate-500 mt-1 text-sm">30秒读懂经营结构 · 3分钟讲清洞察决策 · 10分钟钻取到 SKU 动作</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1 ml-4">
                            <button
                                type="button"
                                onClick={() => {
                                    const filterBarBridge = window as DashboardFilterWindow;
                                    if (filterBarBridge.__openDashboardFilterBar) {
                                        filterBarBridge.__openDashboardFilterBar();
                                        return;
                                    }
                                    window.dispatchEvent(new CustomEvent('open-filter-bar'));
                                }}
                                title="展开筛选器"
                                className="flex h-8 w-[42px] items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M4 5H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    <path d="M6.5 10H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    <path d="M8.5 15H11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                            </button>
                            <DashboardSummaryButton kpis={kpis} filterSummary={filterSummary} iconOnly={true} />
                            <MetricsDrawer iconOnly={true} />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-hide">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-all duration-150 whitespace-nowrap ${activeTab === tab.key
                                    ? 'border-pink-500 text-pink-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                        <div className="ml-auto pl-4 flex-shrink-0 pb-0.5">
                            <button
                                onClick={() => setConfigOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 transition-colors"
                            >
                                <span>⚙️</span>
                                <span>中台配置</span>
                                {!config.isConfigured && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />}
                            </button>
                        </div>
                    </div>

                    {/* 默认参数提示 */}
                    {!config.isConfigured && (activeTab === 'forecast' || activeTab === 'profit-loss' || activeTab === 'otb') && (
                        <div className="flex items-center gap-2 text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-4 py-2 mb-4">
                            <span>ℹ️</span>
                            <span>当前使用默认假设参数，点击右上角「中台配置」可自定义品牌参数与预测方法。</span>
                        </div>
                    )}

                    {otbNavigationContext && activeTab !== 'otb' && (
                        <OtbNavigationContextPanel
                            context={otbNavigationContext}
                            targetModule={activeTab}
                            onClear={clearOtbNavigationContext}
                            className="mb-4"
                        />
                    )}

                    <BusinessLoopHeader
                        tabKey={DASHBOARD_TAB_TO_CONFIG_TAB[activeTab]}
                        onJumpToTab={(tab) => jumpToTab(tab)}
                    />

                    {activeTab === 'overview' && kpis && (
                        <>
                            <OverviewSectionHeading
                                label="01 Business Result"
                                title="经营结果"
                                description="先看全年经营是否达成：销售、售罄、毛利、库存和节奏是否偏离目标。"
                                className="mb-3"
                            />
                            <OverviewKpiBar
                                kpis={kpis}
                                compareMode={effectiveCompareMode}
                                baselineKpis={baselineKpis}
                                compareMeta={compareMeta}
                                filters={filters}
                                onKpiClick={(kpiKey) => {
                                    if (kpiKey === 'sellThrough') scrollToSection(lineChartRef);
                                    else if (kpiKey === 'discount' || kpiKey === 'margin') scrollToSection(skuListRef);
                                    else if (kpiKey === 'inventory') scrollToSection(skuListRef);
                                }}
                            />
                        </>
                    )}
                    {activeTab === 'annual-control' && (
                        <AnnualControlPanel
                            filters={filters}
                            compareMode={effectiveCompareMode}
                            compareMeta={compareMeta}
                            kpis={kpis}
                            baselineKpis={baselineKpis}
                            filteredRecords={filteredRecords}
                            skuMap={skuMap}
                            onJumpToTab={jumpToTab}
                            onJumpToDesignReview={jumpToDesignReview}
                        />
                    )}
                    {activeTab === 'consumer' && (
                        <ProductBasicPanel
                            filters={filters}
                            setFilters={setFilters}
                            onJumpToTab={(tab) => jumpToTab(tab as DashboardTab)}
                        />
                    )}
                    {activeTab === 'category' && (
                        <>
                            <InventoryFeedbackBanner targetModule="category" onJumpToInventory={() => jumpToTab('inventory')} />
                            <PnlFeedbackBanner targetModule="category" onJumpToPnl={() => jumpToTab('profit-loss')} />
                            <CategoryOpsPanel
                                filters={filters}
                                setFilters={setFilters}
                                compareMode={effectiveCompareMode}
                                onJumpToOtb={() => jumpToTab('otb')}
                                onJumpToInventory={() => jumpToTab('inventory')}
                                onJumpToForecast={() => jumpToTab('forecast')}
                                onJumpToProfitLoss={() => jumpToTab('profit-loss')}
                                onJumpToPlanning={() => jumpToTab('planning')}
                            />
                        </>
                    )}
                    {activeTab === 'channel' && (
                        <ChannelAnalysisPanel filters={filters} setFilters={setFilters} compareMode={effectiveCompareMode} />
                    )}
                    {activeTab === 'planning' && (
                        <>
                            <InventoryFeedbackBanner targetModule="wave" onJumpToInventory={() => jumpToTab('inventory')} />
                            <PnlFeedbackBanner targetModule="planning" onJumpToPnl={() => jumpToTab('profit-loss')} />
                            <CategoryFeedbackBanner targetModule="planning" onJumpToCategory={() => jumpToTab('category')} />
                            <WavePlanningPanel
                                defaultView="wave"
                                lockView
                                compareMode={effectiveCompareMode}
                                filters={filters}
                                onJumpToChannel={() => jumpToTab('channel')}
                                onJumpToOtb={() => jumpToTab('otb')}
                                onJumpToSkuRisk={jumpToSkuRisk}
                                onJumpToForecast={() => jumpToTab('forecast')}
                                onJumpToInventory={() => jumpToTab('inventory')}
                                onJumpToCashflow={() => jumpToTab('cashflow')}
                                onJumpToProfitLoss={() => jumpToTab('profit-loss')}
                                onJumpToCategory={() => jumpToTab('category')}
                            />
                        </>
                    )}
                    {activeTab === 'otb' && (
                        <>
                            <InventoryFeedbackBanner targetModule="otb" onJumpToInventory={() => jumpToTab('inventory')} />
                            <PnlFeedbackBanner targetModule="otb" onJumpToPnl={() => jumpToTab('profit-loss')} />
                            <CategoryFeedbackBanner targetModule="otb" onJumpToCategory={() => jumpToTab('category')} />
                            <OtbTab filters={filters} compareMode={effectiveCompareMode} onJumpToTab={(tab, context) => jumpToTab(tab as DashboardTab, context)} />
                        </>
                    )}
                    {activeTab === 'cashflow' && (
                        <>
                            <InventoryFeedbackBanner targetModule="cashflow" onJumpToInventory={() => jumpToTab('inventory')} />
                            <CashflowPanel onJumpToTab={tab => jumpToTab(tab as DashboardTab)} />
                        </>
                    )}
                    {activeTab === 'forecast' && (
                        <>
                            <InventoryFeedbackBanner targetModule="forecast" onJumpToInventory={() => jumpToTab('inventory')} />
                            <PnlFeedbackBanner targetModule="forecast" onJumpToPnl={() => jumpToTab('profit-loss')} />
                            <CategoryFeedbackBanner targetModule="forecast" onJumpToCategory={() => jumpToTab('category')} />
                            <ForecastTab onJumpToTab={tab => jumpToTab(tab as DashboardTab)} />
                        </>
                    )}
                    {activeTab === 'profit-loss' && (
                        <>
                            <InventoryFeedbackBanner targetModule="pnl" onJumpToInventory={() => jumpToTab('inventory')} />
                            <CategoryFeedbackBanner targetModule="profit-loss" onJumpToCategory={() => jumpToTab('category')} />
                            <ProfitLossTab />
                        </>
                    )}
                    {activeTab === 'competitor' && (
                        <CompetitorTrendPanel
                            compareMode={effectiveCompareMode}
                            onJumpToPlanning={() => jumpToTab('planning')}
                            onJumpToChannel={() => jumpToTab('channel')}
                            onJumpToSkuRisk={jumpToSkuRisk}
                        />
                    )}
                    {activeTab === 'inventory' && (
                        <div className="space-y-6">
                            <InventoryHealth onJumpToTab={(tab) => jumpToTab(tab as DashboardTab)} />
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div>
                            <div className="mb-8">
                                {kpis && <NarrativeSummary
                                    selectedModuleId={selectedOverviewModuleId}
                                    compareMode={effectiveCompareMode}
                                    baselineKpis={baselineKpis}
                                    compareMeta={compareMeta}
                                    kpis={kpis}
                                    filterSummary={filterSummary}
                                    onSellThroughClick={() => scrollToSection(lineChartRef)}
                                    onMarginClick={() => scrollToSection(skuListRef)}
                                    onDiscountClick={() => scrollToSection(skuListRef)}
                                    onInventoryClick={() => scrollToSection(skuListRef)}
                                    onSkuClick={() => scrollToSection(skuListRef)}
                                    onChannelClick={() => scrollToSection(pieChartRef)}
                                />}
                                {/* 模块切换按鈕——紧接在叙述摘要下方，控制上方内容 */}
                                <div className="flex flex-wrap gap-1.5 mt-3 px-1">
                                    {FOOTWEAR_ANALYSIS_MODULES.map((module) => {
                                        const active = selectedOverviewModuleId === module.id;
                                        return (
                                            <button
                                                key={module.id}
                                                type="button"
                                                onClick={() => setSelectedOverviewModuleId(module.id)}
                                                className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all duration-150 ${
                                                    active
                                                        ? 'bg-pink-500 text-white shadow-sm shadow-pink-200'
                                                        : 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                                                }`}
                                                aria-pressed={active}
                                            >
                                                {module.title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <OverviewSectionHeading
                                label="02 Assortment & Pace"
                                title="货盘与节奏"
                                description="再判断货盘结构、尺码深度、月度达成、波段到货和清货节奏是否支撑经营。"
                                className="mb-3"
                            />

                            <OtbBudgetStrip filters={filters} />

                            <AssortmentHealthBar
                                kpis={kpis}
                                onJumpToCategory={() => jumpToTab('category')}
                            />

                            <SizeHealthPanel
                                filters={filters}
                                onJumpToSkuRisk={jumpToSkuRisk}
                            />

                            <MonthlyAchievementPanel
                                filters={filters}
                                compareMode={effectiveCompareMode}
                            />

                            <WaveExecutionPanel
                                filters={filters}
                                compareMode={effectiveCompareMode}
                                onJumpToPlanning={() => jumpToTab('planning')}
                            />

                            {/* 核心洞察图 — 售罄趋势独占一行，品类占比+价格带并排 */}
                            <div className="mt-6" ref={lineChartRef}>
                                <ChartCard
                                    title="售罄率曲线（累计）"
                                    subtitle="按口径切换查看本季 / 同期群 / 新品群的售罄节奏"
                                    conclusion={lineConclusion}
                                >
                                    <DashboardChart
                                        title=""
                                        type="line"
                                        kpis={kpis}
                                        sellThroughCaliber={overviewSellThroughCaliber}
                                        onSellThroughCaliberChange={setOverviewSellThroughCaliber}
                                    />
                                </ChartCard>
                            </div>
                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <div ref={pieChartRef}>
                                    <ChartCard
                                        title="品类销售占比"
                                        subtitle="识别首位品类与售罄节奏"
                                        metricStrip={<MetricChips items={categoryMetricItems} />}
                                        conclusion={categoryPieConclusion}
                                    >
                                        <DashboardChart title="" type="pie-category" kpis={kpis} />
                                    </ChartCard>
                                </div>
                                <ChartCard
                                    title="SKU 价格带分布"
                                    subtitle="计划 vs 实际 · 识别主力价格段"
                                    metricStrip={<MetricChips items={priceBandMetricItems} />}
                                    conclusion={barConclusion}
                                >
                                    <DashboardChart title="" type="bar" kpis={kpis} />
                                </ChartCard>
                            </div>

                            <OverviewSectionHeading
                                label="03 Risk & Action"
                                title="风险与动作"
                                description="最后锁定断货、积压、渠道错配和清退风险，并形成补货、调拨、降折、清退与下季调整动作。"
                                className="mt-8 mb-3"
                            />

                            <div className="mt-6 space-y-6">
                                <LifecycleAssortmentPanel
                                    records={filteredRecords}
                                    transitionRecords={transitionRecords}
                                    skuMap={skuMap}
                                    filters={filters}
                                    compareMode={effectiveCompareMode}
                                />

                                <ClearancePacePanel
                                    filters={filters}
                                    onJumpToSkuRisk={jumpToSkuRisk}
                                />

                                <ChannelInventoryPanel
                                    filters={filters}
                                    compareMode={effectiveCompareMode}
                                />

                                <DiagnosisActionPanel
                                    filters={filters}
                                    compareMode={effectiveCompareMode}
                                    kpis={kpis}
                                    onJumpToPlanning={() => jumpToTab('planning')}
                                    onJumpToProduct={() => jumpToTab('category')}
                                    onJumpToChannel={() => jumpToTab('channel')}
                                    onJumpToSkuRisk={jumpToSkuRisk}
                                />
                            </div>

                            <div className="mt-6 space-y-6" ref={skuListRef}>
                                {/* 畅销/滞销 红黑榜 */}
                                {(topBottomSkus.top.length > 0 || topBottomSkus.bottom.length > 0) && (
                                    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        {/* 畅销 Top 10 */}
                                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
                                                <span className="text-base">🔥</span>
                                                <h3 className="text-sm font-bold text-slate-800">畅销 Top 10</h3>
                                                <span className="text-xs text-slate-400 ml-1">按销售额排名</span>
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {topBottomSkus.top.map((sku, i) => (
                                                    <div key={sku.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                                        <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${i < 3 ? 'text-amber-500' : 'text-slate-300'}`}>{i + 1}</span>
                                                        {/* 图片占位 */}
                                                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-300 text-lg">👟</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-medium text-slate-800 truncate">{sku.name}</div>
                                                            <div className="text-[10px] text-slate-400">{sku.category}</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-xs font-bold text-emerald-600">{formatMoneyCny(sku.sales)}</div>
                                                            <div className="text-[10px] text-slate-400">{sku.units.toLocaleString()}双 · ST {(sku.stRate * 100).toFixed(0)}%</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* 滞销 Bottom 10 */}
                                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
                                                <span className="text-base">⚠️</span>
                                                <h3 className="text-sm font-bold text-slate-800">滞销 Bottom 10</h3>
                                                <span className="text-xs text-slate-400 ml-1">按售罄率排名（在库）</span>
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {topBottomSkus.bottom.map((sku, i) => (
                                                    <div key={sku.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                                        <span className="text-xs font-bold w-5 text-center flex-shrink-0 text-rose-300">{i + 1}</span>
                                                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-300 text-lg">👟</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-medium text-slate-800 truncate">{sku.name}</div>
                                                            <div className="text-[10px] text-slate-400">{sku.category} · 在库 {sku.onHand.toLocaleString()} 双</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-xs font-bold text-slate-700">{formatMoneyCny(sku.sales)} · {sku.units.toLocaleString()}双</div>
                                                            <div className={`text-[10px] font-medium ${sku.stRate < 0.5 ? 'text-rose-600' : 'text-amber-600'}`}>ST {(sku.stRate * 100).toFixed(0)}%</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 mb-5">
                                    <span className="w-1 h-5 rounded-full bg-rose-500 inline-block flex-shrink-0" />
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">SKU 风险列表 · 动作层</h3>
                                    <span className="text-xs text-slate-400 ml-1">— 点击品类/区域 Tab 查看完整分析</span>
                                </div>
                                <SkuRiskList
                                    filteredRecords={filteredRecords}
                                    filters={filters}
                                    filterSummary={filterSummary}
                                />

                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
                                    <span className="text-xl">💡</span>
                                    <div>
                                        <h4 className="font-semibold text-amber-900 mb-1">数据说明</h4>
                                        <p className="text-sm text-amber-800">
                                            本看板数据已脱敏处理，金额经指数化（×系数），结构与趋势真实反映业务逻辑。
                                            点击右上角 <strong>指标口径</strong> 查看各指标计算方式。
                                            筛选条件变更后，KPI 卡与图表实时同步更新。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>)}
                </div>
                <SkuDetailModal sku={selectedSku} onClose={() => setSelectedSku(null)} />
            </div>
            <GlobalConfigDrawer open={configOpen} onClose={() => setConfigOpen(false)} />
        </>
    );
}
