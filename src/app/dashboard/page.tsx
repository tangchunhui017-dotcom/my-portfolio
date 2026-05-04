'use client';

import { useDashboardFilter, CompareMode } from '@/hooks/useDashboardFilter';
import FilterBar from '@/components/dashboard/FilterBar';
import MetricsDrawer from '@/components/dashboard/MetricsDrawer';
import DashboardChart, { type SellThroughCaliber } from '@/components/charts/DashboardChart';
import SkuRiskList from '@/components/dashboard/SkuRiskList';
import DashboardSummaryButton from '@/components/dashboard/DashboardSummaryButton';
import SkuDetailModal, { SkuDrillData } from '@/components/dashboard/SkuDetailModal';
import ChartMenu from '@/components/dashboard/ChartMenu';
import OverviewKpiBar from '@/components/dashboard/OverviewKpiBar';
import AnnualControlPanel from '@/components/dashboard/AnnualControlPanel';
import NarrativeSummary from '@/components/dashboard/NarrativeSummary';
import ProductBasicPanel from '@/components/dashboard/ProductBasicPanel';
import CategoryOpsPanel from '@/components/dashboard/CategoryOpsPanel';
import WavePlanningPanel from '@/components/dashboard/WavePlanningPanel';
import ChannelAnalysisPanel from '@/components/dashboard/ChannelAnalysisPanel';
import CompetitorTrendPanel from '@/components/dashboard/CompetitorTrendPanel';
import MonthlyAchievementPanel from '@/components/dashboard/MonthlyAchievementPanel';
import LifecycleAssortmentPanel from '@/components/dashboard/LifecycleAssortmentPanel';
import InventoryRadarPanel from '@/components/dashboard/InventoryRadarPanel';
import { resolveDashboardLifecycleLabel, type DashboardLifecycleLabel } from '@/config/dashboardLifecycle';
import DiagnosisActionPanel from '@/components/dashboard/DiagnosisActionPanel';
import InventoryHealth from '@/components/dashboard/InventoryHealth';
import ChartMetricStrip, { type ChartMetricStripItem } from '@/components/dashboard/ChartMetricStrip';
import { useState, useRef, useMemo } from 'react';
import { FOOTWEAR_CATEGORY_CORE_ORDER } from '@/config/categoryMapping';
import { formatMoneyCny } from '@/config/numberFormat';
import { THRESHOLDS } from '@/config/thresholds';

type DashboardTab = 'overview' | 'annual-control' | 'consumer' | 'category' | 'channel' | 'planning' | 'otb' | 'competitor' | 'inventory';

const TABS: { key: DashboardTab; label: string; icon: string }[] = [
    { key: 'overview', label: '总览', icon: '📊' },
    { key: 'annual-control', label: '年度总控', icon: '🗺️' },
    { key: 'channel', label: '区域&门店', icon: '🏪' },
    { key: 'consumer', label: '消费者画像', icon: '🧑‍🤝‍🧑' },
    { key: 'category', label: '品类运营', icon: '📋' },
    { key: 'planning', label: '波段企划', icon: '📅' },
    { key: 'otb', label: 'OTB预算', icon: '💰' },
    { key: 'competitor', label: '竞品&趋势', icon: '🧭' },
    { key: 'inventory', label: '库存健康', icon: '📦' },
];

const PRICE_BAND_NAMES: Record<string, string> = {
    PB1: '199-399',
    PB2: '399-599',
    PB3: '599-799',
    PB4: '800+',
};

function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
}

interface ConclusionCardProps {
    finding: string;
    decision: string;
    impact: string;
}

function ConclusionCard({ finding, decision, impact }: ConclusionCardProps) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2">
            <div className="flex gap-2">
                <span className="text-base">🔍</span>
                <div><span className="font-semibold text-slate-700">发现 </span><span className="text-slate-600">{finding}</span></div>
            </div>
            <div className="flex gap-2">
                <span className="text-base">⚡</span>
                <div><span className="font-semibold text-slate-700">决策 </span><span className="text-slate-600">{decision}</span></div>
            </div>
            <div className="flex gap-2">
                <span className="text-base">📈</span>
                <div><span className="font-semibold text-slate-700">结果 </span><span className="text-slate-600">{impact}</span></div>
            </div>
        </div>
    );
}

interface ChartCardProps {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'bar-compare';
    compareMode?: 'category' | 'channel';
    kpis: ReturnType<typeof useDashboardFilter>['kpis'];
    conclusion: ConclusionCardProps;
    headerAction?: React.ReactNode;
    metricStrip?: React.ReactNode;
    span?: 'full' | 'half';
    heatmapMetric?: 'sku' | 'sales' | 'st';
    onSkuClick?: (sku: SkuDrillData) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    sellThroughCaliber?: SellThroughCaliber;
    onSellThroughCaliberChange?: (caliber: SellThroughCaliber) => void;
}

function ChartCard({ title, type, kpis, conclusion, headerAction, metricStrip, span = 'half', heatmapMetric, onSkuClick, containerRef, compareMode, sellThroughCaliber, onSellThroughCaliberChange }: ChartCardProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const conclusionText = `${conclusion.finding} ${conclusion.decision} ${conclusion.impact}`;

    return (
        <div ref={containerRef} className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${span === 'full' ? 'col-span-2' : ''}`}>
            <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <div className="flex items-center gap-2">
                    {headerAction}
                    <ChartMenu
                        chartTitle={title}
                        chartRef={chartRef}
                        conclusion={conclusionText}
                    />
                </div>
            </div>
            {metricStrip ? <div className="border-b border-slate-50">{metricStrip}</div> : null}
            <div className="p-5" ref={chartRef}>
                <DashboardChart title="" type={type} kpis={kpis} heatmapMetric={heatmapMetric} onSkuClick={onSkuClick} compareMode={compareMode} sellThroughCaliber={sellThroughCaliber} onSellThroughCaliberChange={onSellThroughCaliberChange} />
            </div>
            <div className="px-5 pb-5">
                <ConclusionCard {...conclusion} />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [compareMode, setCompareMode] = useState<CompareMode>('none');
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const { filters, setFilters, kpis, filterSummary, baselineKpis, compareMeta, filteredRecords, transitionRecords, skuMap } = useDashboardFilter(compareMode, activeTab);
    const [heatmapMetric, setHeatmapMetric] = useState<'sku' | 'sales' | 'st'>('sku');
    const [selectedSku, setSelectedSku] = useState<SkuDrillData | null>(null);
    const [selectedOverviewModuleId, setSelectedOverviewModuleId] = useState('annual-performance');
    const [overviewSellThroughCaliber, setOverviewSellThroughCaliber] = useState<SellThroughCaliber>('active');
    
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
        filteredRecords.forEach((r: any) => {
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

    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    const jumpToTab = (tab: DashboardTab) => setActiveTab(tab);
    const jumpToSkuRisk = () => {
        setActiveTab('overview');
        window.requestAnimationFrame(() => {
            skuListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    };
    const jumpToDesignReview = () => {
        window.location.assign('/design-review-center');
    };

    const totalChannelSales = kpis ? Object.values(kpis.channelSales).reduce((a, b) => a + b, 0) : 0;
    const channelPerformance = kpis ? Object.entries(kpis.channelSales).map(([type, sales]) => ({
        type,
        sales,
        pct: totalChannelSales > 0 ? Math.round(sales / totalChannelSales * 100) : 0,
    })).sort((a, b) => b.sales - a.sales) : [];

    const currentDiscountRate = kpis ? kpis.avgDiscountRate ?? (1 - kpis.avgDiscountDepth) : 0;
    const discountLoss = kpis ? Math.max(kpis.totalGrossSales - kpis.totalNetSales, 0) : 0;
    const discountLossRatio = kpis && kpis.totalGrossSales > 0 ? discountLoss / kpis.totalGrossSales : 0;
    const priceBandLeader = kpis
        ? Object.entries(kpis.priceBandSales).sort((a, b) => b[1].sales - a[1].sales)[0]
        : null;
    const topChannel = channelPerformance[0];

    const priceBandMetricItems: ChartMetricStripItem[] = kpis ? [
        { label: '核心价格带', value: priceBandLeader ? PRICE_BAND_NAMES[priceBandLeader[0]] : '-', detail: '销售额最高价格带', tone: 'amber' },
        { label: 'MSRP金额', value: formatMoneyCny(kpis.totalGrossSales), detail: '吊牌额', tone: 'slate' },
        { label: '毛利额', value: formatMoneyCny(kpis.totalGrossProfit), detail: '折扣贡献后毛利', tone: 'pink', detailTone: 'positive' },
    ] : [];

    const channelMetricItems: ChartMetricStripItem[] = topChannel ? [
        {
            label: '最强渠道',
            value: topChannel.type,
            detail: `销售贡献 ${topChannel.pct}%`,
            tone: 'emerald',
            detailTone: topChannel.pct > 60 ? 'warning' : 'positive',
        },
    ] : [];

    const heatmapMetricItems: ChartMetricStripItem[] = kpis ? [
        { label: '动销SKU', value: `${kpis.activeSKUs} 款`, detail: '当前动销覆盖', tone: 'emerald' },
        {
            label: 'Top10 集中度',
            value: fmtPct(kpis.top10Concentration),
            detail: kpis.top10Concentration > 0.7 ? '集中度偏高' : '结构合理',
            tone: 'slate',
            detailTone: kpis.top10Concentration > 0.7 ? 'warning' : 'positive',
        },
    ] : [];

    const scatterMetricItems: ChartMetricStripItem[] = kpis ? [
        { label: '平均折扣率', value: fmtPct(currentDiscountRate), detail: `折扣深度 ${fmtPct(kpis.avgDiscountDepth)}`, tone: 'amber' },
        {
            label: '折扣损失额',
            value: formatMoneyCny(discountLoss),
            detail: discountLossRatio > 0.15 ? '折扣损失偏高' : '折扣损失可控',
            tone: 'pink',
            detailTone: discountLossRatio > 0.15 ? 'warning' : 'positive',
        },
    ] : [];

    const scatterConclusion = (() => {
        if (!kpis?.scatterSkus) return {
            finding: '价格 vs 售罄率分布分析中，可识别高效区与低售罄风险区。',
            decision: '对低售罄高价款启动渠道调拨，视情况降价处理。',
            impact: '预计尾部库存减少，避免季末大幅折价，保护毛利。',
        };
        const scatter = kpis.scatterSkus;
        const total = kpis.totalSkuCount ?? scatter.length;
        const lowSTCount = scatter.filter(s => s.sellThrough < 0.70).length;
        const highPriceLowSTCount = scatter.filter(s => s.price >= 599 && s.sellThrough < 0.75).length;
        const lowPriceEvergreen = scatter.filter(s => s.price < 399 && s.lifecycle === '\u8001\u54c1');
        const lowPriceAvgST = lowPriceEvergreen.length > 0
            ? Math.round(lowPriceEvergreen.reduce((s, r) => s + r.sellThrough, 0) / lowPriceEvergreen.length * 100)
            : 0;
        const finding = lowPriceAvgST > 0
            ? `199-399 \u8001\u54c1\u5747\u503c\u552e\u7f44\u7387 ${lowPriceAvgST}%，处于高效区；599+ 新品中有 ${highPriceLowSTCount} 款低于 75% 警戒线（共 ${total} 款中 ${lowSTCount} 款需关注）。`
            : `当前筛选下共 ${lowSTCount} 款低售罄 SKU，其中 599+ 高价新品 ${highPriceLowSTCount} 款风险最高。`;
        const decision = highPriceLowSTCount > 0
            ? `对 ${highPriceLowSTCount} 款 599+ 低售罄新品：W8 前启动渠道调拨；W10 后视情况降价 10-15%。`
            : '当前高价带售罄健康，维持现有定价策略，关注库存深度。';
        return { finding, decision, impact: '预计尾部库存减少 30%，避免季末大幅折价，保护毛利 +1-2pp。' };
    })();

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

    const pieConclusion = (() => {
        if (!kpis || channelPerformance.length === 0) return {
            finding: '渠道销售结构分析，识别高贡献与低效渠道。',
            decision: '优化低效渠道陈列策略，聚焦主力价格带。',
            impact: '预计渠道售罄率提升，减少折扣损失。',
        };
        const top = channelPerformance[0];
        const bottom = channelPerformance[channelPerformance.length - 1];
        const onlineSales = kpis.channelSales['电商'] ?? 0;
        const totalSales = kpis.totalNetSales;
        const onlinePct = totalSales > 0 ? Math.round(onlineSales / totalSales * 100) : 0;
        return {
            finding: `${top.type} 渠道贡献最高（${top.pct}%），${bottom.type} 渠道贡献最低（${bottom.pct}%）；电商渠道合计占比 ${onlinePct}%。`,
            decision: bottom.pct < 15
                ? `优化 ${bottom.type} 渠道陈列策略，聚焦 399-599 主力价格带，减少尾部低效款比例。`
                : '渠道结构均衡，维持现有分配，关注各渠道售罄节奏差异。',
            impact: `预计 ${bottom.type} 渠道售罄率提升 +5-8pp，减少折扣损失。`,
        };
    })();

    const heatmapConclusion = (() => {
        if (!kpis?.heatmapChartData) return {
            finding: '品类 × 价格带矩阵，识别 SKU 密度与销售效率分布。',
            decision: '削减低效格子 SKU，向高效格子倾斜资源。',
            impact: '预计 SKU 效率（单款产出）提升，降低库存分散风险。',
        };
        const skuCounts = kpis.heatmapChartData.skuCounts;
        const maxCell = skuCounts.reduce((a, b) => b[2] > a[2] ? b : a, [0, 0, 0]);
        const CATEGORIES = FOOTWEAR_CATEGORY_CORE_ORDER;
        const BANDS = ['199-399', '399-599', '599-799', '800+'];
        const maxCat = CATEGORIES[maxCell[1]] ?? '--';
        const maxBand = BANDS[maxCell[0]] ?? '--';
        const maxCount = maxCell[2];
        const emptyCells = skuCounts.filter(c => c[2] === 0).length;
        return {
            finding: `${maxCat}品类 ${maxBand} 价格带 SKU 最密集（${maxCount} 款）；共 ${emptyCells} 个品类×价格带格子无 SKU 布局。`,
            decision: maxCount > 8
                ? `${maxCat}品类 ${maxBand} SKU 过密，下季度削减 2-3 款，资源向空白格子倾斜。`
                : '当前品类×价格带布局较均衡，重点填补空白格子，提升矩阵覆盖度。',
            impact: '预计 SKU 效率（单款产出）提升 +15%，降低库存分散风险。',
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
                                    const filterBarBridge = window as any;
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
                    </div>

                    {activeTab === 'overview' && kpis && (
                        <>
                            <OverviewKpiBar
                                kpis={kpis}
                                compareMode={effectiveCompareMode}
                                baselineKpis={baselineKpis}
                                compareMeta={compareMeta}
                                selectedModuleId={selectedOverviewModuleId}
                                onModuleChange={setSelectedOverviewModuleId}
                                onKpiClick={(kpiKey) => {
                                    if (kpiKey === 'sellThrough') scrollToSection(lineChartRef);
                                    else if (kpiKey === 'discount' || kpiKey === 'margin') scrollToSection(skuListRef);
                                    else if (kpiKey === 'inventory') scrollToSection(skuListRef);
                                }}
                            />
                            <div className="mb-8">
                                <NarrativeSummary
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
                                />
                            </div>
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
                        <ProductBasicPanel filters={filters} setFilters={setFilters} />
                    )}
                    {activeTab === 'category' && (
                        <CategoryOpsPanel filters={filters} setFilters={setFilters} compareMode={effectiveCompareMode} />
                    )}
                    {activeTab === 'channel' && (
                        <div className="space-y-8">
                            <ChannelAnalysisPanel filters={filters} setFilters={setFilters} compareMode={effectiveCompareMode} />
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1 h-5 rounded-full bg-rose-500 inline-block" />
                                    <h3 className="text-base font-bold text-slate-900">区域联动风险 SKU 表</h3>
                                </div>
                                <SkuRiskList
                                    filteredRecords={filteredRecords}
                                    filters={filters}
                                    filterSummary={filterSummary}
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === 'planning' && (
                        <WavePlanningPanel
                            defaultView="wave"
                            lockView
                            compareMode={effectiveCompareMode}
                            onJumpToChannel={() => jumpToTab('channel')}
                            onJumpToOtb={() => jumpToTab('otb')}
                            onJumpToSkuRisk={jumpToSkuRisk}
                        />
                    )}
                    {activeTab === 'otb' && (
                        <WavePlanningPanel
                            defaultView="otb"
                            lockView
                            compareMode={effectiveCompareMode}
                            onJumpToChannel={() => jumpToTab('channel')}
                            onJumpToOtb={() => jumpToTab('otb')}
                            onJumpToSkuRisk={jumpToSkuRisk}
                        />
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
                            <InventoryHealth skuWosData={skuWosData} />
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div>
                            <MonthlyAchievementPanel
                                filters={filters}
                                compareMode={effectiveCompareMode}
                                onJumpToPlanning={() => jumpToTab('planning')}
                                onJumpToProduct={() => jumpToTab('category')}
                                onJumpToChannel={() => jumpToTab('channel')}
                                onJumpToSkuRisk={jumpToSkuRisk}
                            />

                            <div className="mt-8 space-y-6">
                                <LifecycleAssortmentPanel
                                    records={filteredRecords}
                                    transitionRecords={transitionRecords}
                                    skuMap={skuMap}
                                    filters={filters}
                                    compareMode={effectiveCompareMode}
                                />
                                <InventoryRadarPanel
                                    records={filteredRecords}
                                    skuMap={skuMap}
                                />
                                <DiagnosisActionPanel
                                    filters={filters}
                                    compareMode={effectiveCompareMode}
                                    onJumpToPlanning={() => jumpToTab('planning')}
                                    onJumpToProduct={() => jumpToTab('category')}
                                    onJumpToChannel={() => jumpToTab('channel')}
                                    onJumpToSkuRisk={jumpToSkuRisk}
                                />
                            </div>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">图表矩阵 · 洞察层</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <ChartCard
                                    title="SKU 价格带分布（计划 vs 实际）"
                                    type="bar"
                                    kpis={kpis}
                                    metricStrip={<ChartMetricStrip items={priceBandMetricItems} />}
                                    conclusion={barConclusion}
                                />
                                <ChartCard
                                    title="售罄率曲线（累计）"
                                    type="line"
                                    kpis={kpis}
                                    conclusion={lineConclusion}
                                    containerRef={lineChartRef}
                                    sellThroughCaliber={overviewSellThroughCaliber}
                                    onSellThroughCaliberChange={setOverviewSellThroughCaliber}
                                />
                                <ChartCard
                                    title="渠道销售占比"
                                    type="pie"
                                    kpis={kpis}
                                    metricStrip={<ChartMetricStrip items={channelMetricItems} />}
                                    conclusion={pieConclusion}
                                    containerRef={pieChartRef}
                                />
                                <ChartCard
                                    title="价格 vs 售罄率分析（气泡=销量）"
                                    type="scatter"
                                    kpis={kpis}
                                    onSkuClick={setSelectedSku}
                                    headerAction={
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <span>☝️</span> 点击气泡查看 SKU 详情
                                        </span>
                                    }
                                    metricStrip={<ChartMetricStrip items={scatterMetricItems} />}
                                    conclusion={scatterConclusion}
                                />
                                <ChartCard
                                    title={`品类 × 价格带热力图 (${heatmapMetric === 'sku' ? 'SKU数' : heatmapMetric === 'sales' ? '销售额' : '售罄率'})`}
                                    type="heatmap"
                                    kpis={kpis}
                                    heatmapMetric={heatmapMetric}
                                    headerAction={
                                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                                            {([
                                                { k: 'sku', l: 'SKU数' },
                                                { k: 'sales', l: '销售额' },
                                                { k: 'st', l: '售罄率' }
                                            ] as const).map(m => (
                                                <button
                                                    key={m.k}
                                                    onClick={() => setHeatmapMetric(m.k)}
                                                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${heatmapMetric === m.k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    {m.l}
                                                </button>
                                            ))}
                                        </div>
                                    }
                                    metricStrip={<ChartMetricStrip items={heatmapMetricItems} />}
                                    conclusion={heatmapConclusion}
                                />
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden col-span-1">
                                    <div className="px-5 py-4 border-b border-slate-50">
                                        <h3 className="font-semibold text-slate-800">整体平均售罄率</h3>
                                    </div>
                                    <div className="grid grid-cols-2">
                                        <div className="p-5 border-r border-slate-50">
                                            <DashboardChart title="" type="gauge" kpis={kpis} />
                                        </div>
                                        <div className="p-5 flex flex-col justify-center space-y-4">
                                            <div>
                                                <div className="text-xs font-medium text-emerald-600 mb-2">🚀 贡献最高渠道</div>
                                                {channelPerformance.slice(0, 2).map((c, i) => (
                                                    <div key={c.type} className="flex justify-between items-center text-sm mb-1">
                                                        <span className="text-slate-600">{i + 1}. {c.type}</span>
                                                        <div className="text-right">
                                                            <span className="font-bold text-slate-800">{c.pct}%</span>
                                                            <span className="text-xs text-slate-400 ml-1">占比</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-red-500 mb-2">🐢 贡献最低渠道</div>
                                                {channelPerformance.slice(-2).reverse().map((c, i) => (
                                                    <div key={c.type} className="flex justify-between items-center text-sm mb-1">
                                                        <span className="text-slate-600">{i + 1}. {c.type}</span>
                                                        <div className="text-right">
                                                            <span className="font-bold text-slate-800">{c.pct}%</span>
                                                            <span className="text-xs text-slate-400 ml-1">占比</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-5 pb-5">
                                        <ConclusionCard
                                            finding={`整体售罄率 ${kpis ? Math.round(kpis.avgSellThrough * 100) : '--'}%。电商渠道表现最优，KA 渠道拖后腿。`}
                                            decision='重点关注售罄率 < 70% 的新品（共 3 款），制定专项动销方案。'
                                            impact='若 3 款问题款售罄率提升至 75%，整体均值可改善 +2-3pp。'
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-8 mb-6">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">计划达成 · 结构对比</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                                <ChartCard
                                    title="品类结构计划 vs 实际（售罄率）"
                                    type="bar-compare"
                                    kpis={kpis}
                                    compareMode="category"
                                    conclusion={{
                                        finding: `当前品类中，休闲及跑步品类售罄率接近或超出计划目标；篮球/训练品类存在缺口。`,
                                        decision: '对低于计划 5pp 以上的品类启动针对性动销：组合促销或追加投放预算。',
                                        impact: '预计带动整体售罄率提升 +1.5-2pp，减轻季末尾货压力。',
                                    }}
                                />
                                <ChartCard
                                    title="渠道结构计划 vs 实际（售罄率）"
                                    type="bar-compare"
                                    kpis={kpis}
                                    compareMode="channel"
                                    conclusion={{
                                        finding: `电商渠道表现相对计划较优；加盟和KA渠道售罄率明显低于目标，需重点关注。`,
                                        decision: '对加盟/KA渠道发起专项动销支持：追加联销或补贴政策，提升渠道动力。',
                                        impact: '预计提升加盟/KA渠道售罄率 +3-5pp，降低渠道库存积压。',
                                    }}
                                />
                            </div>

                            <div className="mt-8" ref={skuListRef}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">SKU 风险列表 · 动作层</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                                <SkuRiskList
                                    filteredRecords={filteredRecords}
                                    filters={filters}
                                    filterSummary={filterSummary}
                                />
                            </div>

                            <div className="mt-10 bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
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
                        </div>)}
                </div>
                <SkuDetailModal sku={selectedSku} onClose={() => setSelectedSku(null)} />
            </div>
        </>
    );
}
