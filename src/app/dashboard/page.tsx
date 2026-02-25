'use client';

import { useDashboardFilter, CompareMode } from '@/hooks/useDashboardFilter';
import FilterBar from '@/components/dashboard/FilterBar';
import KpiGrid from '@/components/dashboard/KpiGrid';
import MetricsDrawer from '@/components/dashboard/MetricsDrawer';
import DashboardChart from '@/components/charts/DashboardChart';
import SkuRiskList from '@/components/dashboard/SkuRiskList';
import DashboardSummaryButton from '@/components/dashboard/DashboardSummaryButton';
import SkuDetailModal, { SkuDrillData } from '@/components/dashboard/SkuDetailModal';
import ChartMenu from '@/components/dashboard/ChartMenu';
import OverviewKpiBar from '@/components/dashboard/OverviewKpiBar';
import NarrativeSummary from '@/components/dashboard/NarrativeSummary';
import ProductAnalysisPanel from '@/components/dashboard/ProductAnalysisPanel';
import WavePlanningPanel from '@/components/dashboard/WavePlanningPanel';
import ChannelAnalysisPanel from '@/components/dashboard/ChannelAnalysisPanel';
import CompetitorTrendPanel from '@/components/dashboard/CompetitorTrendPanel';
import MonthlyAchievementPanel from '@/components/dashboard/MonthlyAchievementPanel';
import { useState, useRef } from 'react';
import { FOOTWEAR_CATEGORY_CORE_ORDER } from '@/config/categoryMapping';

type DashboardTab = 'overview' | 'product' | 'channel' | 'planning' | 'otb' | 'competitor';

const TABS: { key: DashboardTab; label: string; labelEn: string; icon: string }[] = [
    { key: 'overview', label: '总览', labelEn: 'Overview', icon: '📊' },
    { key: 'channel', label: '区域&门店', labelEn: 'Region&Store', icon: '🏪' },
    { key: 'product', label: '消费者&产品要素', labelEn: 'Consumer&Product', icon: '🧑‍🤝‍🧑' },
    { key: 'planning', label: '波段企划', labelEn: 'Wave Planning', icon: '🗓️' },
    { key: 'otb', label: 'OTB预算', labelEn: 'OTB Budget', icon: '💰' },
    { key: 'competitor', label: '竞品&趋势', labelEn: 'Competitor&Trend', icon: '🧭' },
];

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
    span?: 'full' | 'half';
    heatmapMetric?: 'sku' | 'sales' | 'st';
    onSkuClick?: (sku: SkuDrillData) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

function ChartCard({ title, type, kpis, conclusion, headerAction, span = 'half', heatmapMetric, onSkuClick, containerRef, compareMode }: ChartCardProps) {
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
            <div className="p-5" ref={chartRef}>
                <DashboardChart title="" type={type} kpis={kpis} heatmapMetric={heatmapMetric} onSkuClick={onSkuClick} compareMode={compareMode} />
            </div>
            <div className="px-5 pb-5">
                <ConclusionCard {...conclusion} />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [compareMode, setCompareMode] = useState<CompareMode>('plan');
    const { filters, setFilters, kpis, filterSummary, baselineKpis, filteredRecords } = useDashboardFilter(compareMode);
    const [heatmapMetric, setHeatmapMetric] = useState<'sku' | 'sales' | 'st'>('sku');
    const [selectedSku, setSelectedSku] = useState<SkuDrillData | null>(null);
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

    // Refs for scroll targets
    const lineChartRef = useRef<HTMLDivElement>(null);
    const pieChartRef = useRef<HTMLDivElement>(null);
    const skuListRef = useRef<HTMLDivElement>(null);

    // 滚动到指定区域
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

    // 渠道销售贡献排名（真实数据，用于 Gauge 旁边的红黑榜）
    const totalChannelSales = kpis ? Object.values(kpis.channelSales).reduce((a, b) => a + b, 0) : 0;
    const channelPerformance = kpis ? Object.entries(kpis.channelSales).map(([type, sales]) => ({
        type,
        sales,
        pct: totalChannelSales > 0 ? Math.round(sales / totalChannelSales * 100) : 0,
    })).sort((a, b) => b.sales - a.sales) : [];

    // 散点图半动态 Conclusion（关键数字来自真实数据，文字框架固定）
    const scatterConclusion = (() => {
        if (!kpis?.scatterSkus) return {
            finding: '价格 vs 售罄率分布分析中，可识别高效区与低售罄风险区。',
            decision: '对低售罄高价款启动渠道调拨，视情况降价处理。',
            impact: '预计清仓库存减少，避免季末大幅折扣，保护毛利。',
        };
        const scatter = kpis.scatterSkus;
        const total = kpis.totalSkuCount ?? scatter.length;
        const lowSTCount = scatter.filter(s => s.sellThrough < 0.70).length;
        const highPriceLowSTCount = scatter.filter(s => s.price >= 599 && s.sellThrough < 0.75).length;
        const lowPriceEvergreen = scatter.filter(s => s.price < 399 && s.lifecycle === '常青');
        const lowPriceAvgST = lowPriceEvergreen.length > 0
            ? Math.round(lowPriceEvergreen.reduce((s, r) => s + r.sellThrough, 0) / lowPriceEvergreen.length * 100)
            : 0;
        const finding = lowPriceAvgST > 0
            ? `199-399 常青款均值售罄率 ${lowPriceAvgST}%，位于高效区；599+ 新品中 ${highPriceLowSTCount} 款低于 75% 警戒线（共 ${total} 款中 ${lowSTCount} 款需关注）。`
            : `当前筛选下共 ${lowSTCount} 款低售罄 SKU，其中 599+ 高价新品 ${highPriceLowSTCount} 款风险最高。`;
        const decision = highPriceLowSTCount > 0
            ? `对 ${highPriceLowSTCount} 款 599+ 低售罄新品：W8 前启动渠道调拨；W10 后视情况降价 10-15%。`
            : '当前高价带售罄健康，维持现有定价策略，关注库存深度。';
        return { finding, decision, impact: '预计清仓库存减少 30%，避免季末大幅折扣，保护毛利 +1-2pp。' };
    })();

    // ── 价格带柱状图 Conclusion ──────────────────────────────────
    const barConclusion = (() => {
        if (!kpis) return {
            finding: '价格带分布分析中，可识别各价格段 SKU 集中度与销售贡献。',
            decision: '优化价格带结构，向高毛利价格段倾斜。',
            impact: '预计提升均价，改善整体毛利率。',
        };
        const pb = kpis.priceBandSales;
        const totalSales = kpis.totalNetSales;
        // 找出销售额最高和最低的价格带
        const bands = Object.entries(pb).sort((a, b) => b[1].sales - a[1].sales);
        const topBand = bands[0];
        const BAND_LABELS: Record<string, string> = {
            PB1: '199-399', PB2: '399-599', PB3: '599-799', PB4: '800+',
        };
        const topBandPct = topBand && totalSales > 0 ? Math.round(topBand[1].sales / totalSales * 100) : 0;
        const topBandLabel = topBand ? BAND_LABELS[topBand[0]] : '--';
        // 高价带（PB3+PB4）占比
        const highPriceSales = (pb['PB3']?.sales ?? 0) + (pb['PB4']?.sales ?? 0);
        const highPricePct = totalSales > 0 ? Math.round(highPriceSales / totalSales * 100) : 0;
        // 低价带（PB1）占比
        const lowPricePct = totalSales > 0 ? Math.round((pb['PB1']?.sales ?? 0) / totalSales * 100) : 0;
        return {
            finding: `${topBandLabel} 为最高贡献价格带，占净销售额 ${topBandPct}%；599+ 高价带贡献 ${highPricePct}%，199-399 低价带占比 ${lowPricePct}%。`,
            decision: highPricePct < 15
                ? '高价带占比偏低，下季度建议增加 599+ SKU 数量（目标 +3 款），收缩低价带至 10% 以内。'
                : `价格带结构合理，维持现有布局，重点提升 ${topBandLabel} 主力价格带深度。`,
            impact: '预计优化后均价提升 ¥30-50，毛利率改善 +1-2pp。',
        };
    })();

    // ── 售罄率折线图 Conclusion ──────────────────────────────────
    const lineConclusion = (() => {
        if (!kpis) return {
            finding: '售罄率曲线反映当季动销节奏与去化效率。',
            decision: '对低动销款启动渠道调拨，加大流量投放。',
            impact: '预计追回目标线，减少清仓压力。',
        };
        const stPct = Math.round(kpis.avgSellThrough * 100);
        const TARGET_ST = 80;
        const gap = TARGET_ST - stPct;
        const weeks = Object.keys(kpis.weeklyData).map(Number).sort((a, b) => a - b);
        const latestWeek = weeks[weeks.length - 1] ?? 0;
        const statusText = gap > 0
            ? `当前累计售罄率 ${stPct}%，距目标 ${TARGET_ST}% 尚差 ${gap}pp`
            : `当前累计售罄率 ${stPct}%，已超目标 ${TARGET_ST}%（领先 ${Math.abs(gap)}pp）`;
        return {
            finding: `${statusText}，已录入 ${latestWeek} 周销售数据。`,
            decision: gap > 5
                ? `W${Math.min(latestWeek + 2, 12)} 前加大电商流量投放，对低动销款启动渠道调拨（直营→电商）。`
                : '售罄节奏健康，维持现有运营策略，关注高价带库存消化。',
            impact: gap > 5
                ? `预计 W${Math.min(latestWeek + 4, 12)} 累计售罄率追回至目标线，减少清仓压力，保护毛利 +0.8pp。`
                : '持续保持当前节奏，预计季末售罄率超目标 +3-5pp。',
        };
    })();

    // ── 渠道饼图 Conclusion ──────────────────────────────────────
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
                ? `优化 ${bottom.type} 渠道陈列策略，聚焦 399-599 主力价格带，减少清仓款比例。`
                : '渠道结构均衡，维持现有分配，关注各渠道售罄节奏差异。',
            impact: `预计 ${bottom.type} 渠道售罄率提升 +5-8pp，减少折扣损失。`,
        };
    })();

    // ── 热力图 Conclusion ──────────────────────────────────────
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
        // 找出 SKU 数为 0 的空格子数
        const emptyCells = skuCounts.filter(c => c[2] === 0).length;
        return {
            finding: `${maxCat}品类 ${maxBand} 价格带 SKU 最密集（${maxCount} 款）；共 ${emptyCells} 个品类×价格带格子无 SKU 布局。`,
            decision: maxCount > 8
                ? `${maxCat}品类 ${maxBand} SKU 过密，下季削减 2-3 款，资源向空白格子倾斜。`
                : '当前品类×价格带布局较均衡，重点填补空白格子，提升矩阵覆盖度。',
            impact: '预计 SKU 效率（单款产出）提升 +15%，降低库存分散风险。',
        };
    })();

    return (
        <>
            <div className="min-h-screen bg-slate-50">
                {/* Filter Bar */}
                <FilterBar
                    filters={filters}
                    setFilters={setFilters}
                    filterSummary={filterSummary}
                    compareMode={compareMode}
                    onCompareModeChange={setCompareMode}
                />

                <div className="max-w-screen-2xl mx-auto px-6 py-8">

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">企划数据看板</h1>
                            <p className="text-slate-500 mt-1">30秒读懂经营结果 · 3分钟讲清洞察决策 · 10分钟钻取到 SKU 动作</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <DashboardSummaryButton kpis={kpis} filterSummary={filterSummary} />
                            <MetricsDrawer />
                        </div>
                    </div>

                    {/* ── Tab 导航栏 ────────────────────────────────── */}
                    <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-all duration-150 ${activeTab === tab.key
                                    ? 'border-pink-500 text-pink-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                <span className="text-xs text-slate-400 hidden sm:inline">{tab.labelEn}</span>
                            </button>
                        ))}
                    </div>

                    {/* OverviewKpiBar - 始终显示（Overview Tab 内）*/}
                    {activeTab === 'overview' && kpis && (
                        <OverviewKpiBar
                            kpis={kpis}
                            compareMode={compareMode}
                            baselineKpis={baselineKpis}
                            onKpiClick={(kpiKey) => {
                                if (kpiKey === 'sellThrough') scrollToSection(lineChartRef);
                                else if (kpiKey === 'discount' || kpiKey === 'margin') scrollToSection(skuListRef);
                                else if (kpiKey === 'inventory') scrollToSection(skuListRef);
                            }}
                        />
                    )}

                    {/* ── 商品分析 Tab ──────────────────────────────── */}
                    {activeTab === 'product' && (
                        <ProductAnalysisPanel filters={filters} setFilters={setFilters} compareMode={compareMode} />
                    )}

                    {/* ── 渠道分析 Tab ──────────────────────────────── */}
                    {activeTab === 'channel' && (
                        <div className="space-y-8">
                            <ChannelAnalysisPanel filters={filters} setFilters={setFilters} compareMode={compareMode} />
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1 h-5 rounded-full bg-rose-500 inline-block" />
                                    <h3 className="text-base font-bold text-slate-900">区域联动风险 SKU 表</h3>
                                </div>
                                <SkuRiskList
                                    filteredRecords={filteredRecords}
                                    filterSummary={filterSummary}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── 波段企划 Tab ──────────────────────────────── */}
                    {activeTab === 'planning' && (
                        <WavePlanningPanel
                            defaultView="wave"
                            lockView
                            compareMode={compareMode}
                            onJumpToChannel={() => jumpToTab('channel')}
                            onJumpToOtb={() => jumpToTab('otb')}
                            onJumpToSkuRisk={jumpToSkuRisk}
                        />
                    )}

                    {/* ── OTB预算 Tab ──────────────────────────────── */}
                    {activeTab === 'otb' && (
                        <WavePlanningPanel
                            defaultView="otb"
                            lockView
                            compareMode={compareMode}
                            onJumpToChannel={() => jumpToTab('channel')}
                            onJumpToOtb={() => jumpToTab('otb')}
                            onJumpToSkuRisk={jumpToSkuRisk}
                        />
                    )}

                    {/* ── 竞品&趋势 Tab ──────────────────────────────── */}
                    {activeTab === 'competitor' && (
                        <CompetitorTrendPanel
                            compareMode={compareMode}
                            onJumpToPlanning={() => jumpToTab('planning')}
                            onJumpToChannel={() => jumpToTab('channel')}
                            onJumpToSkuRisk={jumpToSkuRisk}
                        />
                    )}


                    {/* ── Overview Tab 内容 ───────────────────────── */}
                    {activeTab === 'overview' && (
                        <div>
                            <MonthlyAchievementPanel
                                filters={filters}
                                compareMode={compareMode}
                                onJumpToPlanning={() => jumpToTab('planning')}
                                onJumpToProduct={() => jumpToTab('product')}
                                onJumpToChannel={() => jumpToTab('channel')}
                                onJumpToSkuRisk={jumpToSkuRisk}
                            />

                            {/* KPI Grid */}
                            <div className="mb-6">
                                <KpiGrid
                                    kpis={kpis}
                                    compareMode={compareMode}
                                    baselineKpis={baselineKpis}
                                    onSellThroughClick={() => scrollToSection(lineChartRef)}
                                    onDiscountClick={() => scrollToSection(skuListRef)}
                                    onChannelClick={() => scrollToSection(pieChartRef)}
                                    onMarginClick={() => scrollToSection(skuListRef)}
                                />
                            </div>

                            {/* NarrativeSummary */}
                            {kpis && (
                                <div className="mb-8">
                                    <NarrativeSummary
                                        kpis={kpis}
                                        filterSummary={filterSummary}
                                        onSellThroughClick={() => scrollToSection(lineChartRef)}
                                        onMarginClick={() => scrollToSection(skuListRef)}
                                        onDiscountClick={() => scrollToSection(skuListRef)}
                                        onInventoryClick={() => scrollToSection(skuListRef)}
                                        onSkuClick={() => scrollToSection(skuListRef)}
                                    />
                                </div>
                            )}


                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">图表矩阵 · 洞察层</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Chart Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* Chart 1: Price Band Distribution */}
                                <ChartCard
                                    title="SKU 价格带分布（计划 vs 实际）"
                                    type="bar"
                                    kpis={kpis}
                                    conclusion={barConclusion}
                                />

                                {/* Chart 2: Sell-Through Curve */}
                                <ChartCard
                                    title="售罄率曲线（累计）"
                                    type="line"
                                    kpis={kpis}
                                    conclusion={lineConclusion}
                                    containerRef={lineChartRef}
                                />

                                {/* Chart 3: Channel Mix */}
                                <ChartCard
                                    title="渠道销售占比"
                                    type="pie"
                                    kpis={kpis}
                                    conclusion={pieConclusion}
                                    containerRef={pieChartRef}
                                />

                                {/* Chart 4: Price vs Sell-Through Scatter */}
                                <ChartCard
                                    title="价格 vs 售罄率分析（气泡=销量）"
                                    type="scatter"
                                    kpis={kpis}
                                    onSkuClick={setSelectedSku}
                                    headerAction={
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <span>👆</span> 点击气泡查看 SKU 详情
                                        </span>
                                    }
                                    conclusion={scatterConclusion}
                                />

                                {/* Chart 5: Heatmap with Metric Toggle */}
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
                                    conclusion={heatmapConclusion}
                                />

                                {/* Chart 6: Gauge with Breakdown */}
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
                                                    <div key={c.type} className="flex justify-between items-center text-sm mb-2">
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
                                                    <div key={c.type} className="flex justify-between items-center text-sm mb-2">
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
                                            decision='重点关注售罄率<70% 的新品（共 3 款），制定专项动销方案。'
                                            impact='若 3 款问题款售罄率提升至 75%，整体均值可改善 +2-3pp。'
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Plan vs Actual - Divider */}
                            <div className="flex items-center gap-4 mt-8 mb-6">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">计划达成 · 结构对比</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Plan vs Actual Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                                <ChartCard
                                    title="品类结构计划 vs 实际（售罄率）"
                                    type="bar-compare"
                                    compareMode="category"
                                    kpis={kpis}
                                    conclusion={{
                                        finding: `当前品类中，休闲及跑步品类售罄率接近或超出计划目标；篮球/训练品类存在缺口。`,
                                        decision: '对低于计划 5pp 以上的品类启动针对性动销：组合促销或追加投放预算。',
                                        impact: '预计带动整体售罄率提升 +1.5-2pp，减少季末清仓压力。',
                                    }}
                                />
                                <ChartCard
                                    title="渠道结构计划 vs 实际（售罄率）"
                                    type="bar-compare"
                                    compareMode="channel"
                                    kpis={kpis}
                                    conclusion={{
                                        finding: `电商渠道表现相对计划较优；加盟和KA渠道售罄率明显低于目标，需重点关注。`,
                                        decision: '对加盟/KA渠道发起专项动销支持：追加联销或补贴政策，提升渠道动力。',
                                        impact: '预计提升加盟/KA渠道售罄率 +3-5pp，降低渠道库存积压。',
                                    }}
                                />
                            </div>

                            {/* SKU 风险列表 */}
                            <div className="mt-8" ref={skuListRef}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">SKU 风险列表 · 动作层</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                                <SkuRiskList
                                    filteredRecords={filteredRecords}
                                    filterSummary={filterSummary}
                                />
                            </div>

                            {/* Footer Note */}
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

                {/* SKU 钻取弹窗 */}
                <SkuDetailModal sku={selectedSku} onClose={() => setSelectedSku(null)} />
            </div>
        </>
    );
}

