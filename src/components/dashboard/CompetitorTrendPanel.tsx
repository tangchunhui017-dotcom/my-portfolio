
'use client';

import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useCompetitorAnalysis, type CompetitorBubblePoint } from '@/hooks/useCompetitorAnalysis';
import type { CompareMode } from '@/hooks/useDashboardFilter';
import { formatMoneyCny } from '@/config/numberFormat';
import { useCompetitorTrendData } from '@/hooks/useCompetitorTrendData';
import CompetitorTrendKpiStrip from '@/components/dashboard/competitor/CompetitorTrendKpiStrip';
import TrendDecisionSummaryPanel from '@/components/dashboard/competitor/TrendDecisionSummaryPanel';
import TrendActionCenter from '@/components/dashboard/competitor/TrendActionCenter';
import RisingCategoryTrendPanel from '@/components/dashboard/competitor/RisingCategoryTrendPanel';
import CategoryStrategyMatrixPanel from '@/components/dashboard/competitor/CategoryStrategyMatrixPanel';
import CompetitorDesignDnaPanel from '@/components/dashboard/competitor/CompetitorDesignDnaPanel';
import CompetitorLaunchCalendarPanel from '@/components/dashboard/competitor/CompetitorLaunchCalendarPanel';
import FieldVisitRecordPanel from '@/components/dashboard/competitor/FieldVisitRecordPanel';
import CompetitorGapAnalysisPanel from '@/components/dashboard/competitor/CompetitorGapAnalysisPanel';
import TrendPlanningRecommendationPanel from '@/components/dashboard/competitor/TrendPlanningRecommendationPanel';
import CompetitorMaterialGallery from '@/components/dashboard/competitor/CompetitorMaterialGallery';
import ResearchConclusionPanel from '@/components/dashboard/competitor/ResearchConclusionPanel';
import RelatedModuleLinks from '@/components/dashboard/competitor/RelatedModuleLinks';
import type { CompetitorDesignDna, CompetitorMaterialItem, TrendPlanningRecommendation } from '@/types/competitorTrendTypes';

type CompareContext = {
    point: CompetitorBubblePoint;
    ourPoint: CompetitorBubblePoint | null;
    skuGap: number;
    heatGap: number;
    pointCategoryShare: number;
    ourCategoryShare: number;
    categoryShareGap: number;
    pointBandShare: number;
    ourBandShare: number;
    bandShareGap: number;
};

type SkuStructureChartRow = {
    comp_brand: string;
    sku_yoy: number;
    sku_plan_gap: number;
    sku_mom: number;
    market_share: number;
    [key: string]: string | number;
};

function fmtPct(value: number) {
    if (!Number.isFinite(value)) return '-';
    return `${(value * 100).toFixed(1)}%`;
}

function fmtWan(value: number) {
    return formatMoneyCny(value);
}

function fmtInt(value: number) {
    if (!Number.isFinite(value)) return '-';
    return `${Math.round(value)}`;
}

function fmtPP(value: number) {
    if (!Number.isFinite(value)) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}pp`;
}

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function getCompareModeLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return 'vs计划';
    if (compareMode === 'yoy') return '同比去年';
    if (compareMode === 'mom') return '环比前周期';
    return '无对比';
}

function getCompareDeltaLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return '较计划';
    if (compareMode === 'yoy') return '同比';
    if (compareMode === 'mom') return '较前周期';
    return '对比';
}

function getSkuDeltaMetricKey(compareMode: CompareMode): 'sku_yoy' | 'sku_plan_gap' | 'sku_mom' | null {
    if (compareMode === 'yoy') return 'sku_yoy';
    if (compareMode === 'plan') return 'sku_plan_gap';
    if (compareMode === 'mom') return 'sku_mom';
    return null;
}

function getSkuDeltaMetricName(compareMode: CompareMode) {
    if (compareMode === 'yoy') return 'SKU同比';
    if (compareMode === 'plan') return 'SKU较计划';
    if (compareMode === 'mom') return 'SKU较前周期';
    return '';
}

function InfoTip({ text }: { text: string }) {
    return (
        <span
            title={text}
            aria-label={text}
            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500 cursor-help"
        >
            i
        </span>
    );
}

function gradientBySeed(seed: string) {
    const gradients = [
        'linear-gradient(135deg, #334155 0%, #1f2937 100%)',
        'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        'linear-gradient(135deg, #0f766e 0%, #0f172a 100%)',
        'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
        'linear-gradient(135deg, #4c1d95 0%, #581c87 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash += seed.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
}

function galleryBackground(imageUrl: string) {
    if (/^https?:\/\//i.test(imageUrl)) {
        return {
            backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.45), rgba(15,23,42,0.1)), url("${imageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        } as const;
    }
    return { background: gradientBySeed(imageUrl) } as const;
}

const BRAND_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#7C3AED', '#EF4444', '#0EA5E9'];
const SHARE_COLORS = ['#3B82F6', '#06B6D4', '#22C55E', '#8B5CF6', '#F97316', '#EC4899', '#64748B'];

interface CompetitorTrendPanelProps {
    compareMode?: CompareMode;
    onJumpToPlanning?: () => void;
    onJumpToChannel?: () => void;
    onJumpToSkuRisk?: () => void;
}

export default function CompetitorTrendPanel({
    compareMode = 'none',
    onJumpToPlanning,
    onJumpToChannel,
    onJumpToSkuRisk,
}: CompetitorTrendPanelProps = {}) {
    const {
        brands,
        categories,
        ourBrandName,
        brandSummary,
        skuStructureRows,
        skuStructureChartData,
        bubblePoints,
        priceBandOptions,
        radarIndicators,
        radarRows,
        suppressedCategories,
        weakPriceBands,
        galleryItems,
        waveOptions,
        regionOptions,
    } = useCompetitorAnalysis();

    const [selectedBrand, setSelectedBrand] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPriceBand, setSelectedPriceBand] = useState<string>('all');
    const [selectedContextId, setSelectedContextId] = useState<string>('');
    const [selectedWave, setSelectedWave] = useState<string>('all');
    const [selectedRegion, setSelectedRegion] = useState<string>('all');
    const compareModeLabel = useMemo(() => getCompareModeLabel(compareMode), [compareMode]);
    const compareDeltaLabel = useMemo(() => getCompareDeltaLabel(compareMode), [compareMode]);
    const sectionScopeHint = useMemo(() => `口径：${compareModeLabel}`, [compareModeLabel]);
    const skuDeltaMetricKey = useMemo(() => getSkuDeltaMetricKey(compareMode), [compareMode]);
    const skuDeltaMetricName = useMemo(() => getSkuDeltaMetricName(compareMode), [compareMode]);
    const showSkuDeltaLine = skuDeltaMetricKey !== null;
    const competitorCompareHint = useMemo(() => {
        if (compareMode === 'yoy') return '同比口径下展示 SKU 同比线。';
        if (compareMode === 'plan') return '计划口径下展示 SKU 较计划线。';
        if (compareMode === 'mom') return '环比口径下展示 SKU 较前周期线。';
        return '无对比口径下仅展示当前结构。';
    }, [compareMode]);

    const categoryShareMap = useMemo(() => {
        const map = new Map<string, number>();
        skuStructureRows.forEach((row) => {
            map.set(`${row.comp_brand}__${row.category_l2}`, row.sku_share);
        });
        return map;
    }, [skuStructureRows]);

    const bandCategoryTotalMap = useMemo(() => {
        const map = new Map<string, number>();
        bubblePoints.forEach((point) => {
            const key = `${point.price_band_name}__${point.category}`;
            map.set(key, (map.get(key) || 0) + point.sku_cnt);
        });
        return map;
    }, [bubblePoints]);

    const filteredBubblePoints = useMemo(() => {
        return bubblePoints.filter((point) => {
            if (selectedBrand !== 'all' && point.comp_brand !== selectedBrand) return false;
            if (selectedCategory !== 'all' && point.category !== selectedCategory) return false;
            if (selectedPriceBand !== 'all' && point.price_band_name !== selectedPriceBand) return false;
            return true;
        });
    }, [bubblePoints, selectedBrand, selectedCategory, selectedPriceBand]);

    const selectedPoint = useMemo(() => {
        if (!filteredBubblePoints.length) return null;
        return filteredBubblePoints.find((item) => item.id === selectedContextId) || filteredBubblePoints[0];
    }, [filteredBubblePoints, selectedContextId]);

    const compareContext = useMemo<CompareContext | null>(() => {
        if (!selectedPoint) return null;

        const ourPoint =
            bubblePoints.find(
                (item) =>
                    item.comp_brand === ourBrandName &&
                    item.category === selectedPoint.category &&
                    item.price_band_name === selectedPoint.price_band_name,
            ) || null;

        const pointCategoryShare = categoryShareMap.get(`${selectedPoint.comp_brand}__${selectedPoint.category}`) || 0;
        const ourCategoryShare = categoryShareMap.get(`${ourBrandName}__${selectedPoint.category}`) || 0;

        const bandKey = `${selectedPoint.price_band_name}__${selectedPoint.category}`;
        const bandTotal = bandCategoryTotalMap.get(bandKey) || 0;
        const pointBandShare = safeDiv(selectedPoint.sku_cnt, bandTotal);
        const ourBandShare = safeDiv(ourPoint?.sku_cnt || 0, bandTotal);

        return {
            point: selectedPoint,
            ourPoint,
            skuGap: selectedPoint.sku_cnt - (ourPoint?.sku_cnt || 0),
            heatGap: selectedPoint.heat - (ourPoint?.heat || 0),
            pointCategoryShare,
            ourCategoryShare,
            categoryShareGap: pointCategoryShare - ourCategoryShare,
            pointBandShare,
            ourBandShare,
            bandShareGap: pointBandShare - ourBandShare,
        };
    }, [bandCategoryTotalMap, bubblePoints, categoryShareMap, ourBrandName, selectedPoint]);

    const competitorRows = useMemo(
        () => brandSummary.filter((row) => row.comp_brand !== ourBrandName),
        [brandSummary, ourBrandName],
    );

    const leadingCompetitor = useMemo(
        () => [...competitorRows].sort((a, b) => b.market_share - a.market_share)[0] || null,
        [competitorRows],
    );

    const ourSummary = useMemo(
        () => brandSummary.find((row) => row.comp_brand === ourBrandName) || null,
        [brandSummary, ourBrandName],
    );
    const ourSkuDeltaRate = useMemo(() => {
        if (!ourSummary) return null;
        if (compareMode === 'yoy') return ourSummary.sku_yoy;
        if (compareMode === 'plan') return ourSummary.sku_plan_gap;
        if (compareMode === 'mom') return ourSummary.sku_mom;
        return null;
    }, [compareMode, ourSummary]);

    const brandColorMap = useMemo(() => {
        const map = new Map<string, string>();
        brands.forEach((brand, idx) => {
            map.set(brand, BRAND_COLORS[idx % BRAND_COLORS.length]);
        });
        return map;
    }, [brands]);

    const bubbleOption = useMemo<EChartsOption>(() => {
        const visibleBrands = selectedBrand === 'all' ? brands : brands.filter((brand) => brand === selectedBrand);

        const xValues = filteredBubblePoints.map((item) => item.price_mid);
        const minX = xValues.length ? Math.min(...xValues) - 40 : 120;
        const maxX = xValues.length ? Math.max(...xValues) + 40 : 860;

        const series = visibleBrands.map((brand) => ({
            name: brand,
            type: 'scatter' as const,
            data: filteredBubblePoints
                .filter((point) => point.comp_brand === brand)
                .map((point) => ({
                    id: point.id,
                    value: [point.price_mid, point.sku_cnt, point.heat, point.net_sales],
                    compBrand: point.comp_brand,
                    category: point.category,
                    priceBandName: point.price_band_name,
                    skuCnt: point.sku_cnt,
                    heat: point.heat,
                    netSales: point.net_sales,
                    categoryShare: categoryShareMap.get(`${point.comp_brand}__${point.category}`) || 0,
                    bandCategoryShare: safeDiv(
                        point.sku_cnt,
                        bandCategoryTotalMap.get(`${point.price_band_name}__${point.category}`) || 0,
                    ),
                })),
            symbolSize: (value: number[]) => {
                const heat = value?.[2] || 0;
                const sales = value?.[3] || 0;
                return Math.max(12, Math.min(44, heat * 0.28 + Math.sqrt(sales / 12000)));
            },
            itemStyle: {
                color: brandColorMap.get(brand) || '#64748B',
                opacity: 0.82,
                borderColor: '#ffffff',
                borderWidth: 1.2,
            },
            emphasis: {
                scale: true,
                focus: 'series' as const,
                itemStyle: {
                    shadowBlur: 14,
                    shadowColor: 'rgba(15,23,42,0.25)',
                },
            },
        }));

        return {
            color: BRAND_COLORS,
            animationDuration: 500,
            grid: { left: 56, right: 18, top: 48, bottom: 44 },
            legend: {
                top: 8,
                textStyle: { color: '#6B7280', fontSize: 11 },
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
            },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params) => {
                    const payload = Array.isArray(params) ? params[0] : params;
                    const row = (payload as { data?: Record<string, unknown> })?.data || {};
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${row.compBrand || '-'}</div>`,
                        `品类：${row.category ?? '-'}`,
                        `价格带：${row.priceBandName ?? '-'}`,
                        `SKU火力：${Number(row.skuCnt ?? 0).toLocaleString()}`,
                        `销量热度：${Number(row.heat ?? 0).toFixed(1)}`,
                        `品牌内品类占比：${(Number(row.categoryShare ?? 0) * 100).toFixed(1)}%`,
                        `同价带份额：${(Number(row.bandCategoryShare ?? 0) * 100).toFixed(1)}%`,
                        `估算销售额：${formatMoneyCny(Number(row.netSales ?? 0))}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                name: '价格带中位价(元)',
                min: minX,
                max: maxX,
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: {
                    color: '#6B7280',
                    formatter: (value: number) => `¥${value}`,
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                name: 'SKU 数量',
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#6B7280' },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            series,
        };
    }, [bandCategoryTotalMap, brandColorMap, brands, categoryShareMap, filteredBubblePoints, selectedBrand]);

    const bubbleEvents = useMemo(
        () => ({
            click: (params: { data?: { id?: string } }) => {
                if (params?.data?.id) setSelectedContextId(params.data.id);
            },
        }),
        [],
    );

    const radarBrandsToShow = useMemo(() => {
        if (selectedBrand === 'all') {
            return brands;
        }
        if (selectedBrand === ourBrandName) {
            return [ourBrandName];
        }
        return [ourBrandName, selectedBrand];
    }, [brands, ourBrandName, selectedBrand]);

    const radarMap = useMemo(() => {
        const map = new Map<string, number[]>();
        radarRows.forEach((row) => map.set(row.comp_brand, row.scores));
        return map;
    }, [radarRows]);

    const radarOption = useMemo<EChartsOption>(() => {
        const seriesData = radarBrandsToShow.map((brand) => {
            const color = brandColorMap.get(brand) || '#64748B';
            return {
            name: brand,
            value: radarMap.get(brand) || [0, 0, 0, 0, 0],
            lineStyle: { width: 2, color },
            areaStyle: { color, opacity: 0.1 },
            symbol: 'circle',
            symbolSize: 5,
            itemStyle: { color },
        };
        });

        return {
            animationDuration: 500,
            legend: {
                top: 4,
                textStyle: { color: '#6B7280', fontSize: 11 },
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
            },
            radar: {
                center: ['50%', '60%'],
                radius: '74%',
                splitNumber: 5,
                name: { color: '#6B7280', fontSize: 11 },
                splitLine: { lineStyle: { color: '#E5E7EB' } },
                splitArea: { areaStyle: { color: ['rgba(248,250,252,0.75)', 'rgba(248,250,252,0.35)'] } },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                indicator: radarIndicators.map((name) => ({ name, max: 100 })),
            },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
            },
            series: [{ type: 'radar', data: seriesData }],
        } as unknown as EChartsOption;
    }, [brandColorMap, radarBrandsToShow, radarIndicators, radarMap]);

    const shareComparisonRows = useMemo(() => {
        const rows = skuStructureChartData as SkuStructureChartRow[];
        if (selectedBrand === 'all' || selectedBrand === ourBrandName) return rows;
        return rows.filter((row) => row.comp_brand === selectedBrand || row.comp_brand === ourBrandName);
    }, [ourBrandName, selectedBrand, skuStructureChartData]);

    const shareStackOption = useMemo<EChartsOption>(() => {
        const metricValues = showSkuDeltaLine && skuDeltaMetricKey
            ? shareComparisonRows.map((row) => Number(row[skuDeltaMetricKey] || 0))
            : [0];
        const upper = Math.max(20, Math.ceil((Math.max(...metricValues, 0) + 2) / 5) * 5);
        const lower = Math.min(-10, Math.floor((Math.min(...metricValues, 0) - 2) / 5) * 5);

        return {
            animationDuration: 500,
            grid: { left: 56, right: 58, top: 38, bottom: 50 },
            legend: {
                top: 6,
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { color: '#6B7280', fontSize: 11 },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: unknown) => {
                    const items = (Array.isArray(params) ? params : [params]) as Array<{
                        axisValueLabel?: string;
                        marker?: string;
                        seriesName?: string;
                        value?: number | string;
                    }>;
                    const axisLabel = items[0]?.axisValueLabel || '';
                    const lines = [`<div style="font-weight:600;margin-bottom:4px;">${axisLabel}</div>`];
                    items.forEach((item) => {
                        lines.push(`${item.marker ?? ''}${item.seriesName ?? '-'}：${item.value ?? 0}%`);
                    });
                    return lines.join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: shareComparisonRows.map((row) => row.comp_brand),
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#6B7280' },
                axisTick: { alignWithLabel: true },
            },
            yAxis: [
                {
                    type: 'value',
                    min: 0,
                    max: 100,
                    axisLine: { show: false },
                    axisLabel: { color: '#6B7280', formatter: '{value}%' },
                    splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
                },
                {
                    type: 'value',
                    show: showSkuDeltaLine,
                    min: lower,
                    max: upper,
                    axisLine: { show: false },
                    axisLabel: { color: '#6B7280', formatter: '{value}%' },
                    splitLine: { show: false },
                },
            ],
            series: [
                ...categories.map((category, idx) => ({
                    name: category,
                    type: 'bar' as const,
                    stack: 'category-share',
                    barMaxWidth: 42,
                    itemStyle: { color: SHARE_COLORS[idx % SHARE_COLORS.length] },
                    data: shareComparisonRows.map((row) => Number(row[category] || 0)),
                    emphasis: { focus: 'series' as const },
                })),
                ...(showSkuDeltaLine && skuDeltaMetricKey
                    ? [
                          {
                              name: skuDeltaMetricName,
                              type: 'line' as const,
                              yAxisIndex: 1,
                              smooth: true,
                              symbol: 'circle',
                              symbolSize: 7,
                              itemStyle: { color: '#111827' },
                              lineStyle: { color: '#111827', width: 2.2 },
                              data: shareComparisonRows.map((row) => Number(row[skuDeltaMetricKey] || 0)),
                          },
                      ]
                    : []),
            ],
        };
    }, [categories, shareComparisonRows, showSkuDeltaLine, skuDeltaMetricKey, skuDeltaMetricName]);

    const insight = useMemo(() => {
        if (!compareContext) {
            return {
                conclusion: '当前筛选暂无可用竞品点位。',
                risk: '无法判断防御薄弱点，请放宽筛选后再观察。',
                action: '建议先恢复"全部品牌"，再按价格带逐步查看。',
            };
        }

        const { point, skuGap, heatGap, categoryShareGap, bandShareGap } = compareContext;

        const leadText =
            skuGap > 0
                ? `竞品SKU火力高出本品 ${skuGap} 款`
                : `本品SKU火力领先 ${Math.abs(skuGap)} 款`;

        const riskText =
            skuGap > 0 || heatGap > 0 || categoryShareGap > 0 || bandShareGap > 0
                ? '该点位存在份额被抢占风险，需优先补位。'
                : '该点位防守稳定，可转向利润率优化。';

        const actionText =
            skuGap > 0
                ? '建议在"波段·企划"补该价带SKU宽度，并在"区域·门店"优先投放高动销店型。'
                : '建议维持SKU宽度，转看"总览"观察毛利与折扣，避免无效扩款。';

        return {
            conclusion: `${point.comp_brand} 在 ${point.price_band_name}×${point.category} 布局 ${point.sku_cnt} 款，热度 ${point.heat}，${leadText}。`,
            risk: `${riskText} 品牌内品类占比差 ${fmtPP(categoryShareGap)}，同价带份额差 ${fmtPP(bandShareGap)}。`,
            action: actionText,
        };
    }, [compareContext]);

    const filteredGallery = useMemo(() => {
        return galleryItems.filter((item) => {
            if (selectedBrand !== 'all' && item.comp_brand !== selectedBrand) return false;
            if (selectedWave !== 'all' && item.wave !== selectedWave) return false;
            if (selectedRegion !== 'all' && item.region !== selectedRegion) return false;
            return true;
        });
    }, [galleryItems, selectedBrand, selectedRegion, selectedWave]);

    // ── New V2 data ──────────────────────────────────────────────────────────
    const [v2CompetitorBrand, setV2CompetitorBrand] = useState('all');
    const [v2Category, setV2Category] = useState('all');
    const [v2ShoeType, setV2ShoeType] = useState('all');
    const [v2PriceBand, setV2PriceBand] = useState('all');

    const trendData = useCompetitorTrendData({
        competitorBrand: v2CompetitorBrand,
        category: v2Category,
        shoeType: v2ShoeType,
        priceBand: v2PriceBand,
    });

    // 跳转处理器
    const handleJumpToDesign = (_item: CompetitorDesignDna | CompetitorMaterialItem | TrendPlanningRecommendation) => {
        window.location.assign('/design-review-center');
    };
    const handleJumpToPlanningWithWave = (_waveId: string) => {
        onJumpToPlanning?.();
    };
    const handleJumpToModuleByName = (moduleRef: string) => {
        if (moduleRef.includes('波段') || moduleRef.includes('planning')) onJumpToPlanning?.();
    };

    return (
        <div className="space-y-8">

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* Page Header & Filters                                           */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-1">
                        COMPETITOR &amp; TREND
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
                        <div className="w-1.5 h-7 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full" />
                        竞品&amp;趋势决策工作台
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 max-w-3xl">
                        发现竞品价格、品类、鞋型、设计、上市节奏和热度机会；判断本品与竞品的差距；输出到波段企划、OTB预算、设计计划和品类运营。
                    </p>
                </div>

                {/* 筛选器 */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400 flex-shrink-0">筛选：</span>
                    {[
                        {
                            label: '竞品品牌', value: v2CompetitorBrand, setter: setV2CompetitorBrand,
                            options: [['all', '全部竞品'], ...trendData.competitorBrandOptions.map((b) => [b, b])],
                        },
                        {
                            label: '品类', value: v2Category, setter: setV2Category,
                            options: [['all', '全部品类'], ...trendData.categoryOptions.map((c) => [c, c])],
                        },
                        {
                            label: '鞋型', value: v2ShoeType, setter: setV2ShoeType,
                            options: [['all', '全部鞋型'], ...trendData.shoeTypeOptions.map((s) => [s, s])],
                        },
                        {
                            label: '价格带', value: v2PriceBand, setter: setV2PriceBand,
                            options: [['all', '全部价格带'], ...trendData.priceBandOptions.map((p) => [p, p])],
                        },
                        {
                            label: '品牌', value: selectedBrand, setter: setSelectedBrand,
                            options: [['all', '全部品牌'], ...brands.map((b) => [b, b])],
                        },
                        {
                            label: '品类结构', value: selectedCategory, setter: setSelectedCategory,
                            options: [['all', '全部'], ...categories.map((c) => [c, c])],
                        },
                        {
                            label: '价格带结构', value: selectedPriceBand, setter: setSelectedPriceBand,
                            options: [['all', '全部'], ...priceBandOptions.map((p) => [p, p])],
                        },
                    ].map(({ label, value, setter, options }) => (
                        <div key={label} className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">{label}</span>
                            <select
                                value={value}
                                onChange={(e) => setter(e.target.value)}
                                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                            >
                                {options.map(([val, lbl]) => (
                                    <option key={val} value={val}>{lbl}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 1. KPI Strip                                                    */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="01 EXECUTIVE SUMMARY"
                title="竞品趋势总览"
                description="8个核心KPI快速判断哪些趋势值得跟进、哪些价格带有机会、哪些有风险。"
            >
                <CompetitorTrendKpiStrip kpis={trendData.kpis} />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 2. Decision Summary                                             */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="02 DECISION SUMMARY"
                title="趋势决策摘要"
                description="本月最值得跟进、不建议跟进、最有机会价格带、需进入设计计划和波段企划的趋势。"
            >
                <TrendDecisionSummaryPanel summary={trendData.decisionSummary} />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 3. Action Center                                                */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="03 ACTION CENTER"
                title="趋势行动中心"
                description="按优先级排列的6-8条高价值建议，每条包含趋势证据、建议动作和预计商业影响。"
                badge="优先处理"
                badgeColor="emerald"
            >
                <TrendActionCenter
                    actions={trendData.actions}
                    onJumpToPlanning={handleJumpToPlanningWithWave}
                    onJumpToDesign={() => handleJumpToDesign(trendData.designDnaList[0])}
                    onJumpToOtb={onJumpToPlanning}
                />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 4. Price × SKU Heat Map (original ECharts section)             */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-1">04 PRICE × SKU HEAT MAP</div>
                    <h3 className="text-lg font-semibold text-slate-900">价格 × SKU火力 × 热度散点图</h3>
                    <p className="text-xs text-slate-500 mt-0.5">气泡大小=热度，X轴=价格带中位价，Y轴=SKU数量。高热+低SKU为机会区；高热+高SKU为红海区。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">市场领跑品牌</div>
                        <div className="mt-1 text-base font-semibold text-slate-900">{leadingCompetitor?.comp_brand || '-'}</div>
                        <div className="text-xs text-slate-500 mt-1">份额 {fmtPct(leadingCompetitor?.market_share || 0)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">本品SKU总量</div>
                        <div className="mt-1 text-base font-semibold text-slate-900">{fmtInt(ourSummary?.sku_total || 0)}</div>
                        <div className="text-xs text-slate-500 mt-1">{compareDeltaLabel} {ourSkuDeltaRate === null ? '—' : fmtPct(ourSkuDeltaRate)}</div>
                    </div>
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                        <div className="text-xs text-rose-600">竞品压制品类</div>
                        <div className="mt-1 text-base font-semibold text-rose-700">{suppressedCategories.length} 个</div>
                        <div className="text-xs text-slate-500 mt-1">竞品占比 &gt;60%</div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <div className="text-xs text-amber-600">防御薄弱价格带</div>
                        <div className="mt-1 text-base font-semibold text-amber-700">{weakPriceBands.length} 个</div>
                        <div className="text-xs text-slate-500 mt-1">竞品SKU明显高于本品</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">当前点位占比差</div>
                        <div className="mt-1 text-base font-semibold text-slate-900">
                            {compareContext ? fmtPP(compareContext.categoryShareGap) : '-'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {compareContext ? `同价带差 ${fmtPP(compareContext.bandShareGap)}` : '点击气泡后显示'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-7 rounded-xl border border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-900 mb-2">竞品气泡散点（点击气泡联动洞察）</div>
                        <ReactECharts option={bubbleOption} onEvents={bubbleEvents} style={{ height: 360 }} notMerge />
                    </div>
                    <div className="xl:col-span-5 space-y-4">
                        <div className="rounded-xl border border-slate-100 p-4">
                            <div className="text-sm font-semibold text-slate-900 mb-2">EPIC 竞品雷达（预览）</div>
                            <ReactECharts option={radarOption} style={{ height: 280 }} notMerge />
                        </div>
                        <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
                            <div className="text-sm font-semibold text-slate-900">联动洞察</div>
                            <div className="mt-3 space-y-2 text-xs text-slate-700 leading-5">
                                <div><span className="text-slate-500">结论：</span>{insight.conclusion}</div>
                                <div><span className="text-slate-500">风险：</span>{insight.risk}</div>
                                <div><span className="text-slate-500">建议：</span>{insight.action}</div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {onJumpToPlanning && (
                                    <button onClick={onJumpToPlanning} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">去波段企划补位</button>
                                )}
                                {onJumpToSkuRisk && (
                                    <button onClick={onJumpToSkuRisk} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">去 SKU 风险列表</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { zone: '机会区', rule: '高热度 + 低SKU', action: '建议小批量切入', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                        { zone: '红海区', rule: '高热度 + 高SKU', action: '谨慎进入，差异化切入', color: 'bg-rose-50 border-rose-200 text-rose-700' },
                        { zone: '风险区', rule: '低热度 + 高SKU', action: '避免加码', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                        { zone: '观察区', rule: '中热度 + 中SKU', action: '结合品牌定位判断', color: 'bg-slate-50 border-slate-200 text-slate-600' },
                    ].map(({ zone, rule, action, color }) => (
                        <div key={zone} className={`rounded-lg border p-3 ${color}`}>
                            <div className="text-xs font-semibold mb-1">{zone}</div>
                            <div className="text-[11px]">{rule}</div>
                            <div className="text-[11px] mt-1 opacity-80">{action}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 p-4">
                    <div className="text-sm font-semibold text-slate-900 mb-2">品牌 × 品类结构占比（100%堆叠）</div>
                    <ReactECharts option={shareStackOption} style={{ height: 300 }} notMerge />
                </div>

                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                        <div className="text-xs font-semibold text-rose-700 mb-2">压制品类（需优先防御）</div>
                        <div className="space-y-1.5 text-xs text-slate-700">
                            {suppressedCategories.length > 0 ? suppressedCategories.map((row) => (
                                <div key={`${row.category}-${row.comp_brand}`}>
                                    {row.category}：{row.comp_brand} 占比 {fmtPct(row.comp_share)}，本品 {fmtPct(row.our_share)}
                                </div>
                            )) : <div className="text-slate-400">当前无绝对压制品类</div>}
                        </div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <div className="text-xs font-semibold text-amber-700 mb-2">薄弱价格带（需补位）</div>
                        <div className="space-y-1.5 text-xs text-slate-700">
                            {weakPriceBands.length > 0 ? weakPriceBands.map((row) => (
                                <div key={`${row.price_band_name}-${row.top_brand}`}>
                                    {row.price_band_name}：{row.top_brand} {row.top_sku_cnt} 款，本品 {row.our_sku_cnt} 款
                                </div>
                            )) : <div className="text-slate-400">当前无明显薄弱价格带</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 5. EPIC Competitor Radar                                        */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="05 EPIC COMPETITOR RADAR"
                title="EPIC 竞品雷达"
                description="E=情绪吸引力 · P=产品力 · I=社媒影响力 · C=商业效率。每个竞品的EPIC总分与可借鉴点。"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {trendData.epicRadars.map((radar) => (
                        <div key={radar.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">{radar.competitorBrand}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{radar.competitorSeries}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-blue-600">{radar.epicTotalScore}</div>
                                    <div className="text-[10px] text-slate-400">EPIC总分</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 mb-3">
                                {[
                                    { label: 'E', value: radar.epicEmotionScore, color: 'bg-rose-100 text-rose-700' },
                                    { label: 'P', value: radar.epicProductScore, color: 'bg-blue-100 text-blue-700' },
                                    { label: 'I', value: radar.epicInfluenceScore, color: 'bg-violet-100 text-violet-700' },
                                    { label: 'C', value: radar.epicCommercialScore, color: 'bg-emerald-100 text-emerald-700' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className={`rounded text-center py-1.5 ${color}`}>
                                        <div className="text-[10px] font-semibold">{label}</div>
                                        <div className="text-sm font-bold">{value}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                                <div><span className="text-slate-400">强项：</span><span className="text-emerald-600">{radar.strengths.join('、')}</span></div>
                                <div><span className="text-slate-400">弱项：</span><span className="text-rose-500">{radar.weaknesses.join('、')}</span></div>
                                <div><span className="text-slate-400">可借鉴：</span><span className="text-blue-600">{radar.learnable.join('、')}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 6. Rising Category & Style Trend                               */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="06 RISING CATEGORY & STYLE"
                title="升量品类与鞋型趋势"
                description="品类和鞋型增长率、热度变化、SKU变化、竞品品牌和建议动作。"
                badge="趋势上升"
                badgeColor="blue"
            >
                <RisingCategoryTrendPanel trends={trendData.risingTrends} />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 7. [NEW] Category Strategy Matrix                               */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="07 CATEGORY STRATEGY MATRIX"
                title="鞋型品类策略矩阵"
                description="回答核心战略问题：哪些鞋型应该守住/跟进/切入/观望/退出？CORE核心品类 × MORE延伸品类 × 成熟度四列布局。"
                badge="品类战略"
                badgeColor="purple"
            >
                <CategoryStrategyMatrixPanel cells={trendData.categoryMatrix} />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 8. Competitor Design DNA                                        */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="08 COMPETITOR DESIGN DNA"
                title="竞品设计DNA"
                description="廓形、楦型、鞋底结构、鞋面材质、颜色故事、工艺细节、功能卖点和可借鉴点。"
                badge="设计机会"
                badgeColor="purple"
            >
                <CompetitorDesignDnaPanel
                    dnaList={trendData.designDnaList}
                    onJumpToDesign={handleJumpToDesign}
                />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 9. Competitor Launch Calendar                                   */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="09 LAUNCH CALENDAR"
                title="竞品上市节奏"
                description="竞品品牌上市月份、波段、价格带、主推渠道、折扣节点、完成率、促销类型和对本品影响。"
            >
                <CompetitorLaunchCalendarPanel
                    items={trendData.launchCalendar}
                    onJumpToPlanning={handleJumpToPlanningWithWave}
                />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 10. [NEW] Field Visit Records                                   */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="10 FIELD VISIT RECORDS"
                title="走访记录表"
                description="团队商圈走访记录库：录入橱窗主推、货品结构、促销、店员话术和核心发现，沉淀每季竞品观察。"
                badge="数据采集"
                badgeColor="amber"
            >
                <FieldVisitRecordPanel />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 11. Gap Analysis                                                 */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="11 GAP ANALYSIS"
                title="本品 vs 竞品差距分析"
                description="价格带、SKU数量、鞋型、功能卖点、上市节奏、社媒热度等维度的差距和建议动作。"
                badge="高优先级"
                badgeColor="rose"
            >
                <CompetitorGapAnalysisPanel
                    items={trendData.gapAnalysis}
                    onJumpToModule={handleJumpToModuleByName}
                />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 12. Trend → Planning Recommendation                            */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="12 TREND → PLANNING"
                title="趋势到企划建议"
                description="每个趋势的适合品类、鞋型、价格带、SKU数、波段、渠道、设计建议和OTB影响。"
            >
                <TrendPlanningRecommendationPanel
                    recommendations={trendData.planningRecs}
                    onJumpToPlanning={(rec) => handleJumpToPlanningWithWave(rec.recommendedWaveId)}
                    onJumpToOtb={onJumpToPlanning}
                    onJumpToDesign={handleJumpToDesign}
                />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 13. Competitor Material Gallery                                */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="13 MATERIAL GALLERY"
                title="竞品素材库"
                description="默认展示Top 12素材，按分类过滤。每张素材包含可借鉴点、风险点和一键跳转按钮。"
            >
                <CompetitorMaterialGallery
                    materials={trendData.materials}
                    onJumpToDesign={handleJumpToDesign}
                    onJumpToPlanning={() => onJumpToPlanning?.()}
                />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 14. [NEW] Research Conclusion Report                            */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="14 RESEARCH CONCLUSION REPORT"
                title="调研结论报告"
                description="将本TAB所有分析模块聚合为标准化结论报告，输出核心发现、机会鞋型、风险提示和各部门行动建议。"
                badge="可交付"
                badgeColor="emerald"
            >
                <ResearchConclusionPanel report={trendData.conclusionReport} />
            </SectionCard>

            {/* ─────────────────────────────────────────────────────────────── */}
            {/* 15. Related Module Links                                        */}
            {/* ─────────────────────────────────────────────────────────────── */}
            <SectionCard
                label="15 CROSS-MODULE LINKS"
                title="跨模块联动入口"
                description="竞品趋势发现之后，下一步要在哪个模块执行？点击直达对应功能。"
            >
                <RelatedModuleLinks
                    links={trendData.relatedLinks}
                    onJumpToModule={(tab) => {
                        if (tab === 'planning') onJumpToPlanning?.();
                        else if (tab === 'channel') onJumpToChannel?.();
                        else if (tab === 'inventory') onJumpToSkuRisk?.();
                        else if (tab === 'design') window.location.assign('/design-review-center');
                    }}
                />
            </SectionCard>

        </div>
    );
}


function SectionCard({
    label,
    title,
    description,
    badge,
    badgeColor,
    children,
}: {
    label: string;
    title: string;
    description: string;
    badge?: string;
    badgeColor?: 'emerald' | 'blue' | 'purple' | 'rose' | 'amber';
    children: React.ReactNode;
}) {
    const badgeStyles: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        blue:    'bg-blue-50 text-blue-700 border-blue-200',
        purple:  'bg-violet-50 text-violet-700 border-violet-200',
        rose:    'bg-rose-50 text-rose-700 border-rose-200',
        amber:   'bg-amber-50 text-amber-700 border-amber-200',
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-1">{label}</div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-400 to-violet-400 rounded-full" />
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{description}</p>
                </div>
                {badge && badgeColor && (
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${badgeStyles[badgeColor]}`}>
                        {badge}
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}
