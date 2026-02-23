
'use client';

import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useCompetitorAnalysis, type CompetitorBubblePoint } from '@/hooks/useCompetitorAnalysis';
import type { CompareMode } from '@/hooks/useDashboardFilter';
import { formatMoneyCny } from '@/config/numberFormat';

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
    if (compareMode === 'mom') return '环比上季';
    return '无对比';
}

function getCompareDeltaLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return '较计划';
    if (compareMode === 'yoy') return '同比';
    if (compareMode === 'mom') return '较上季';
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
    if (compareMode === 'mom') return 'SKU较上季';
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
        if (compareMode === 'mom') return '环比口径下展示 SKU 较上季线。';
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
                        `品类：${row.category || '-'}`,
                        `价格带：${row.priceBandName || '-'}`,
                        `SKU火力：${fmtInt(Number(row.skuCnt || 0))}`,
                        `销量热度：${fmtInt(Number(row.heat || 0))}`,
                        `品牌内品类占比：${fmtPct(Number(row.categoryShare || 0))}`,
                        `同价带份额：${fmtPct(Number(row.bandCategoryShare || 0))}`,
                        `估算销额：${fmtWan(Number(row.netSales || 0))}`,
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
                    formatter: (value: number) => `¥${Math.round(value)}`,
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                name: 'SKU数量',
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
                        lines.push(`${item.marker || ''} ${item.seriesName || ''}：${Number(item.value || 0).toFixed(1)}%`);
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
                action: '建议先恢复“全部品牌”，再按价格带逐段查看。',
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
                ? '建议在“波段&企划”补该价带SKU宽度，并在“区域&门店”优先投放高动销店态。'
                : '建议维持SKU宽度，转去“总览”观察毛利与折扣，避免无效扩款。';

        return {
            conclusion: `${point.comp_brand} 在 ${point.price_band_name}×${point.category} 布局 ${point.sku_cnt} 款，热度 ${point.heat}；${leadText}。`,
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

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">4.8 Competitor Mix</div>
                        <h2 className="text-lg font-bold text-slate-900">竞品防御沙盘（价格带 × SKU火力 × 热度）</h2>
                        <div className="mt-1 text-xs text-slate-500">
                            口径：竞品品牌 / 二级品类 / 价格带 / SKU数量 / 热度指数（Demo）
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {sectionScopeHint}
                        </span>
                        <select
                            value={selectedBrand}
                            onChange={(event) => setSelectedBrand(event.target.value)}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
                        >
                            <option value="all">全部品牌</option>
                            {brands.map((brand) => (
                                <option key={brand} value={brand}>
                                    {brand}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedCategory}
                            onChange={(event) => setSelectedCategory(event.target.value)}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
                        >
                            <option value="all">全部品类</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedPriceBand}
                            onChange={(event) => setSelectedPriceBand(event.target.value)}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
                        >
                            <option value="all">全部价格带</option>
                            {priceBandOptions.map((band) => (
                                <option key={band} value={band}>
                                    {band}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center text-xs text-slate-500">
                            市场领跑品牌
                            <InfoTip text="按市场份额（market_share）排序，展示当前份额最高的竞品品牌。" />
                        </div>
                        <div className="mt-1 text-base font-semibold text-slate-900">
                            {leadingCompetitor?.comp_brand || '-'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">份额 {fmtPct(leadingCompetitor?.market_share || 0)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center text-xs text-slate-500">
                            本品牌SKU总量
                            <InfoTip text="本品牌SKU总量=本品牌各品类SKU数量汇总；支持较计划（sku_plan_gap）/较上季（sku_mom）/同比（sku_yoy）三种口径。" />
                        </div>
                        <div className="mt-1 text-base font-semibold text-slate-900">{fmtInt(ourSummary?.sku_total || 0)}</div>
                        <div className="text-xs text-slate-500 mt-1">
                            {ourSkuDeltaRate === null ? `${compareDeltaLabel} —` : `${compareDeltaLabel} ${fmtPct(ourSkuDeltaRate)}`}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center text-xs text-slate-500">
                            竞品压制品类
                            <InfoTip text="压制规则：竞品在某品类的SKU占比 > 60%，用于识别需优先防御的品类。" />
                        </div>
                        <div className="mt-1 text-base font-semibold text-rose-600">{suppressedCategories.length} 个</div>
                        <div className="text-xs text-slate-500 mt-1">规则：竞品SKU占比 &gt; 60%</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center text-xs text-slate-500">
                            防御薄弱价格带
                            <InfoTip text="薄弱规则：同价格带内竞品SKU数量明显高于本品牌，且差值为正。" />
                        </div>
                        <div className="mt-1 text-base font-semibold text-amber-600">{weakPriceBands.length} 个</div>
                        <div className="text-xs text-slate-500 mt-1">规则：竞品SKU明显高于本品</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center text-xs text-slate-500">
                            当前点位占比差
                            <InfoTip text="占比差=竞品占比-本品牌占比；含品牌内品类占比差与同价带份额差（pp）。" />
                        </div>
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
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">核心图1：竞品气泡散点（点击气泡联动洞察）</div>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                {sectionScopeHint}
                            </span>
                        </div>
                        <ReactECharts option={bubbleOption} onEvents={bubbleEvents} style={{ height: 360 }} notMerge />
                    </div>

                    <div className="xl:col-span-5 space-y-4">
                        <div className="rounded-xl border border-slate-100 p-4">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-slate-900">核心图2：STEPIC 市调雷达</div>
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                    {sectionScopeHint}
                                </span>
                            </div>
                            <ReactECharts option={radarOption} style={{ height: 340 }} notMerge />
                        </div>

                        <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
                            <div className="text-sm font-semibold text-slate-900">联动洞察（结论 / 风险 / 建议）</div>
                            <div className="mt-3 space-y-2 text-xs text-slate-700 leading-5">
                                <div>
                                    <span className="text-slate-500">结论：</span>
                                    {insight.conclusion}
                                </div>
                                <div>
                                    <span className="text-slate-500">风险：</span>
                                    {insight.risk}
                                </div>
                                <div>
                                    <span className="text-slate-500">建议：</span>
                                    {insight.action}
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {onJumpToPlanning && (
                                    <button
                                        onClick={onJumpToPlanning}
                                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        去波段&企划补位
                                    </button>
                                )}
                                {onJumpToChannel && (
                                    <button
                                        onClick={onJumpToChannel}
                                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        去区域&门店执行
                                    </button>
                                )}
                                {onJumpToSkuRisk && (
                                    <button
                                        onClick={onJumpToSkuRisk}
                                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        去 SKU 风险列表
                                    </button>
                                )}
                            </div>

                            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                                <div className="text-xs font-semibold text-slate-700 mb-2">当前点位占比比较</div>
                                {compareContext ? (
                                    <div className="space-y-1.5 text-xs text-slate-600">
                                        <div className="flex items-center justify-between">
                                            <span>{compareContext.point.comp_brand} 品牌内品类占比</span>
                                            <span className="font-medium text-slate-900">{fmtPct(compareContext.pointCategoryShare)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>{ourBrandName} 品牌内品类占比</span>
                                            <span className="font-medium text-slate-900">{fmtPct(compareContext.ourCategoryShare)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>品牌内占比差</span>
                                            <span className="font-medium text-slate-900">{fmtPP(compareContext.categoryShareGap)}</span>
                                        </div>
                                        <div className="h-px bg-slate-200 my-1" />
                                        <div className="flex items-center justify-between">
                                            <span>{compareContext.point.comp_brand} 同价带份额</span>
                                            <span className="font-medium text-slate-900">{fmtPct(compareContext.pointBandShare)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>{ourBrandName} 同价带份额</span>
                                            <span className="font-medium text-slate-900">{fmtPct(compareContext.ourBandShare)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>同价带份额差</span>
                                            <span className="font-medium text-slate-900">{fmtPP(compareContext.bandShareGap)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400">点击气泡后显示本品与竞品的占比差异</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">补充图：品牌 × 品类结构占比（100%堆叠）</div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {sectionScopeHint}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                        {showSkuDeltaLine
                            ? '柱子看结构占比，黑线看SKU同比，便于判断“结构偏移 + 扩款节奏”是否一致。'
                            : competitorCompareHint}
                    </div>
                    <ReactECharts option={shareStackOption} style={{ height: 320 }} notMerge />
                </div>

                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                        <div className="text-xs font-semibold text-rose-700 mb-2">压制品类 Top3（需优先防御）</div>
                        <div className="space-y-1.5 text-xs text-slate-700">
                            {suppressedCategories.length > 0 ? (
                                suppressedCategories.map((row) => (
                                    <div key={`${row.category}-${row.comp_brand}`}>
                                        {row.category}：{row.comp_brand} 占比 {fmtPct(row.comp_share)}，本品 {fmtPct(row.our_share)}
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-400">当前无绝对压制品类</div>
                            )}
                        </div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <div className="text-xs font-semibold text-amber-700 mb-2">薄弱价格带 Top3（需补位）</div>
                        <div className="space-y-1.5 text-xs text-slate-700">
                            {weakPriceBands.length > 0 ? (
                                weakPriceBands.map((row) => (
                                    <div key={`${row.price_band_name}-${row.top_brand}`}>
                                        {row.price_band_name}：{row.top_brand} {row.top_sku_cnt} 款，本品 {row.our_sku_cnt} 款
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-400">当前无明显薄弱价格带</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">市调画廊沉淀</div>
                        <h3 className="text-base font-bold text-slate-900">竞品波段素材（品牌 / 波段 / 区域）</h3>
                        <div className="mt-1 text-xs text-slate-500">用于沉淀主推 Look、陈列策略与温度带打法。</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            口径：素材标签 / 波段 / 区域（Demo）
                        </span>
                        <select
                            value={selectedWave}
                            onChange={(event) => setSelectedWave(event.target.value)}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
                        >
                            <option value="all">全部波段</option>
                            {waveOptions.map((wave) => (
                                <option key={wave} value={wave}>
                                    {wave}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedRegion}
                            onChange={(event) => setSelectedRegion(event.target.value)}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
                        >
                            <option value="all">全部区域</option>
                            {regionOptions.map((region) => (
                                <option key={region} value={region}>
                                    {region}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredGallery.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="h-32 px-3 py-2 flex items-end justify-between text-white" style={galleryBackground(item.image_url)}>
                                <span className="text-xs bg-white/20 backdrop-blur px-2 py-1 rounded-full">{item.comp_brand}</span>
                                <span className="text-xs bg-black/25 px-2 py-1 rounded-full">{item.wave}</span>
                            </div>
                            <div className="p-3">
                                <div className="text-sm font-semibold text-slate-900 line-clamp-1">{item.title}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {item.region} / {item.temp_range} / {item.category}
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs">
                                    <span className="text-slate-500">售罄</span>
                                    <span className="font-semibold text-emerald-600">{fmtPct(item.sell_through)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs mt-1">
                                    <span className="text-slate-500">热度分</span>
                                    <span className="font-semibold text-slate-700">{fmtInt(item.buzz_score)}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {item.tags.map((tag) => (
                                        <span key={`${item.id}-${tag}`} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
