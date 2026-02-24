'use client';

import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    useCategoryOps,
    type CategoryOpsBizKpi,
    type CategoryOpsHeatXAxis,
    type CategoryOpsHeatPoint,
    type CategoryOpsKpiCard,
    type CategoryOpsPlanBiasCard,
    type CategoryOpsSkuActionRow,
    type CategoryOpsSunburstNode,
} from '@/hooks/useCategoryOps';

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function formatAmount(value: number) {
    if (!Number.isFinite(value)) return '--';
    const absValue = Math.abs(value);
    if (absValue >= 100_000_000) return `¥${(value / 100_000_000).toFixed(2)}亿`;
    if (absValue >= 10_000) return `¥${(value / 10_000).toFixed(1)}万`;
    return `¥${Math.round(value).toLocaleString('zh-CN')}`;
}

function formatPairs(value: number) {
    if (!Number.isFinite(value)) return '--';
    if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(1)}万双`;
    return `${Math.round(value).toLocaleString('zh-CN')}双`;
}

function formatCount(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${Math.round(value).toLocaleString('zh-CN')}个`;
}

function formatPct(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value * 100).toFixed(1)}%`;
}

function formatPp(value: number) {
    if (!Number.isFinite(value)) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}pp`;
}

function formatBizValue(card: CategoryOpsBizKpi) {
    if (card.valueKind === 'amount') return formatAmount(card.value);
    if (card.valueKind === 'pairs') return formatPairs(card.value);
    if (card.valueKind === 'count') return formatCount(card.value);
    return formatPct(card.value);
}

function formatBizDelta(card: CategoryOpsBizKpi) {
    if (card.deltaValue === null) return '—';
    if (card.deltaKind === 'pp') return formatPp(card.deltaValue);
    const sign = card.deltaValue >= 0 ? '+' : '';
    return `${sign}${(card.deltaValue * 100).toFixed(1)}%`;
}

function blendColor(from: [number, number, number], to: [number, number, number], ratio: number) {
    const t = Math.max(0, Math.min(1, ratio));
    return [
        Math.round(from[0] + (to[0] - from[0]) * t),
        Math.round(from[1] + (to[1] - from[1]) * t),
        Math.round(from[2] + (to[2] - from[2]) * t),
    ] as [number, number, number];
}

type SellThroughColorScale = {
    min: number;
    max: number;
    mean: number;
};

function collectSellThroughValues(rows: CategoryOpsSunburstNode[]) {
    const values: number[] = [];
    rows.forEach((line) => {
        if (Number.isFinite(line.sellThrough)) values.push(line.sellThrough);
        line.children?.forEach((child) => {
            if (Number.isFinite(child.sellThrough)) values.push(child.sellThrough);
        });
    });
    return values;
}

function buildSellThroughColorScale(rows: CategoryOpsSunburstNode[]): SellThroughColorScale {
    const values = collectSellThroughValues(rows);
    if (!values.length) {
        return { min: 0, max: 1, mean: 0.5 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { min, max, mean };
}

function getSellThroughColor(sellThrough: number, scale: SellThroughColorScale) {
    const lowAnchor = Math.min(scale.mean, scale.min);
    const highAnchor = Math.max(scale.mean, scale.max);
    const neutral: [number, number, number] = [203, 213, 225];

    if (sellThrough >= scale.mean) {
        const ratio = Math.max(0, Math.min(1, safeDiv(sellThrough - scale.mean, Math.max(highAnchor - scale.mean, 1e-6))));
        const rgb = blendColor(neutral, [16, 185, 129], ratio);
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`;
    }

    const ratio = Math.max(0, Math.min(1, safeDiv(scale.mean - sellThrough, Math.max(scale.mean - lowAnchor, 1e-6))));
    const rgb = blendColor(neutral, [239, 68, 68], ratio);
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`;
}

function getToneStyle(tone: CategoryOpsKpiCard['tone']) {
    if (tone === 'good') return 'border-emerald-200 bg-emerald-50/70';
    if (tone === 'risk') return 'border-rose-200 bg-rose-50/70';
    return 'border-amber-200 bg-amber-50/70';
}

function getPlanBiasToneClass(tone: CategoryOpsPlanBiasCard['tone']) {
    if (tone === 'good') return 'border-emerald-200 bg-emerald-50/60';
    if (tone === 'risk') return 'border-rose-200 bg-rose-50/60';
    return 'border-amber-200 bg-amber-50/60';
}

function getSkuActionTone(action: CategoryOpsSkuActionRow['action']) {
    if (action.includes('补单') || action.includes('调拨')) return 'text-emerald-700';
    if (action.includes('收敛') || action.includes('清理')) return 'text-rose-700';
    if (action.includes('调价')) return 'text-amber-700';
    return 'text-slate-600';
}

function renderKpiValue(card: CategoryOpsKpiCard) {
    if (card.valueKind === 'pp') return formatPp(card.value);
    return formatPct(card.value);
}

function withNodeColor(rows: CategoryOpsSunburstNode[]) {
    const colorScale = buildSellThroughColorScale(rows);

    return rows.map((line) => ({
        ...line,
        itemStyle: {
            color: getSellThroughColor(line.sellThrough, colorScale),
        },
        children: line.children?.map((child) => ({
            ...child,
            itemStyle: {
                color: getSellThroughColor(child.sellThrough, colorScale),
            },
        })),
    }));
}

function buildHeatPointMap(points: CategoryOpsHeatPoint[]) {
    const map = new Map<string, CategoryOpsHeatPoint>();
    points.forEach((point) => map.set(point.id, point));
    return map;
}

const HEATMAP_XAXIS_OPTIONS: Array<{
    value: CategoryOpsHeatXAxis;
    label: string;
}> = [
    { value: 'element', label: '品类×价格带' },
    { value: 'category', label: '仅品类' },
    { value: 'price_band', label: '仅价格带' },
];

export default function CategoryOpsPanel({
    filters,
    setFilters,
    compareMode = 'none',
}: {
    filters: DashboardFilters;
    setFilters: (next: DashboardFilters) => void;
    compareMode?: CompareMode;
}) {
    const [heatmapXAxis, setHeatmapXAxis] = useState<CategoryOpsHeatXAxis>('element');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

    const {
        totals,
        baselineTotals,
        compareMeta,
        businessKpis,
        planBiasCards,
        kpis,
        sunburstData,
        scatterPoints,
        scatterReference,
        categoryWaterfall,
        skuActionRows,
        heatmap,
        insight,
    } = useCategoryOps(
        filters,
        heatmapXAxis,
        compareMode,
    );

    const heatPointMap = useMemo(() => buildHeatPointMap(heatmap.points), [heatmap.points]);

    const activeCategoryId = useMemo(() => {
        if (selectedCategoryId !== 'all') return selectedCategoryId;
        if (filters.category_id !== 'all') return filters.category_id;
        return 'all';
    }, [filters.category_id, selectedCategoryId]);

    const actionRowsForView = useMemo(() => {
        const scoped = activeCategoryId === 'all'
            ? skuActionRows
            : skuActionRows.filter((row) => row.categoryId === activeCategoryId);
        return scoped.slice(0, 40);
    }, [activeCategoryId, skuActionRows]);

    const selectedCategoryLabel = useMemo(() => {
        if (activeCategoryId === 'all') return '全部品类';
        const matched = skuActionRows.find((row) => row.categoryId === activeCategoryId);
        return matched?.category || activeCategoryId;
    }, [activeCategoryId, skuActionRows]);

    const productLineColors = useMemo(() => {
        const palette = ['#2563EB', '#10B981', '#64748B', '#0EA5E9', '#7C3AED', '#F59E0B'];
        const map = new Map<string, string>();
        const lines = Array.from(new Set(scatterPoints.map((item) => item.productLine)));
        lines.forEach((line, index) => map.set(line, palette[index % palette.length]));
        return map;
    }, [scatterPoints]);

    const sunburstOption = useMemo<EChartsOption>(() => {
        const chartData = withNodeColor(sunburstData);

        return {
            animationDuration: 500,
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params: unknown) => {
                    const item = params as {
                        name?: string;
                        data?: {
                            value?: number;
                            sellThrough?: number;
                        };
                    };
                    const value = Number(item.data?.value || 0);
                    const sellThrough = Number(item.data?.sellThrough || 0);
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${item.name || '-'}</div>`,
                        `销售额：${formatAmount(value)}`,
                        `销售占比：${formatPct(safeDiv(value, totals.netSales))}`,
                        `售罄率：${formatPct(sellThrough)}`,
                    ].join('<br/>');
                },
            },
            series: [
                {
                    type: 'sunburst',
                    data: chartData,
                    radius: ['18%', '90%'],
                    sort: undefined,
                    minAngle: 8,
                    emphasis: {
                        focus: 'ancestor',
                    },
                    label: {
                        rotate: 'radial',
                        color: '#0F172A',
                        fontSize: 11,
                        minAngle: 8,
                    },
                    levels: [
                        {},
                        {
                            r0: '18%',
                            r: '52%',
                            label: { rotate: 0, fontWeight: 600 },
                        },
                        {
                            r0: '52%',
                            r: '90%',
                            label: { rotate: 'radial', fontSize: 10 },
                        },
                    ],
                },
            ],
        };
    }, [sunburstData, totals.netSales]);

    const scatterOption = useMemo<EChartsOption>(() => {
        const visibleProductLines = Array.from(new Set(scatterPoints.map((item) => item.productLine)));
        const maxSales = Math.max(1, ...scatterPoints.map((item) => item.netSales));

        const series = visibleProductLines.map((productLine) => ({
            name: productLine,
            type: 'scatter' as const,
            data: scatterPoints
                .filter((item) => item.productLine === productLine)
                .map((item) => ({
                    value: [item.asp, item.salesPerSkc],
                    categoryId: item.categoryId,
                    category: item.category,
                    productLine: item.productLine,
                    netSales: item.netSales,
                    sellThrough: item.sellThrough,
                    fillRate: item.fillRate,
                    reorderRate: item.reorderRate,
                    priceBandMix: item.priceBandMix,
                })),
            symbolSize: (value: unknown, params: unknown) => {
                const point = params as { data?: { netSales?: number } };
                const sales = Number(point.data?.netSales || 0);
                return 14 + Math.sqrt(safeDiv(sales, maxSales)) * 26;
            },
            itemStyle: {
                color: productLineColors.get(productLine) || '#64748B',
                opacity: 0.82,
                borderColor: '#ffffff',
                borderWidth: 1,
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 14,
                    shadowColor: 'rgba(15, 23, 42, 0.2)',
                },
            },
        }));

        return {
            animationDuration: 500,
            legend: {
                top: 4,
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { color: '#64748B', fontSize: 11 },
            },
            grid: {
                left: 56,
                right: 24,
                top: 40,
                bottom: 48,
            },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown> }).data || {};
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${row.category || '-'}</div>`,
                        `产品线：${row.productLine || '-'}`,
                        `ASP：${formatAmount(Number(row.value ? (row.value as number[])[0] : 0))}`,
                        `单款产出：${formatAmount(Number(row.value ? (row.value as number[])[1] : 0))}`,
                        `销售额：${formatAmount(Number(row.netSales || 0))}`,
                        `售罄率：${formatPct(Number(row.sellThrough || 0))}`,
                        `执行率：${formatPct(Number(row.fillRate || 0))}`,
                        `补单率：${formatPct(Number(row.reorderRate || 0))}`,
                        `核心价带：${row.priceBandMix || '--'}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                scale: true,
                name: 'ASP(元/双)',
                nameTextStyle: { color: '#6B7280', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: {
                    color: '#6B7280',
                    formatter: (value: number) => formatAmount(value),
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                scale: true,
                name: '单款产出额(元/SKC)',
                nameTextStyle: { color: '#6B7280', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: {
                    color: '#6B7280',
                    formatter: (value: number) => formatAmount(value),
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            series,
            markLine: {
                symbol: ['none', 'none'],
                lineStyle: { color: '#94A3B8', type: 'dashed' },
                label: { show: false },
                data: [
                    { xAxis: scatterReference.aspAvg },
                    { yAxis: scatterReference.salesPerSkcAvg },
                ],
            },
        };
    }, [scatterPoints, scatterReference, productLineColors]);

    const waterfallOption = useMemo<EChartsOption>(() => {
        let cumulative = 0;
        const categories = categoryWaterfall.map((item) => item.category);
        const helper: number[] = [];
        const values: Array<number | { value: number; itemStyle: { color: string } }> = [];

        categoryWaterfall.forEach((item) => {
            const deltaWan = item.deltaNetSales / 10_000;
            if (deltaWan >= 0) {
                helper.push(cumulative);
                values.push({ value: deltaWan, itemStyle: { color: '#10B981' } });
                cumulative += deltaWan;
            } else {
                helper.push(cumulative + deltaWan);
                values.push({ value: Math.abs(deltaWan), itemStyle: { color: '#EF4444' } });
                cumulative += deltaWan;
            }
        });

        return {
            animationDuration: 500,
            grid: {
                left: 52,
                right: 20,
                top: 28,
                bottom: 68,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: unknown) => {
                    const arr = params as Array<{ dataIndex: number }>;
                    const idx = arr?.[0]?.dataIndex ?? 0;
                    const row = categoryWaterfall[idx];
                    if (!row) return '--';
                    const sign = row.deltaNetSales >= 0 ? '+' : '';
                    const delta = `${sign}${(row.deltaNetSales / 10_000).toFixed(1)}万`;
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${row.category}</div>`,
                        `${compareMeta.mode === 'none' ? '当前净销贡献' : `${compareMeta.deltaLabel}贡献`}: ${delta}`,
                        `本期：${formatAmount(row.currentNetSales)}`,
                        `${compareMeta.hasBaseline ? `基线：${formatAmount(row.baselineNetSales)}` : ''}`,
                    ].filter(Boolean).join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: categories,
                axisLabel: { color: '#64748B', interval: 0, rotate: categories.length > 7 ? 18 : 0 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: '#64748B',
                    formatter: (value: number) => `${Math.round(value)}万`,
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            series: [
                {
                    type: 'bar',
                    stack: 'all',
                    data: helper,
                    itemStyle: { color: 'rgba(0,0,0,0)' },
                    emphasis: { disabled: true },
                    silent: true,
                },
                {
                    type: 'bar',
                    stack: 'all',
                    data: values,
                    barWidth: 28,
                    label: {
                        show: true,
                        position: 'top',
                        color: '#475569',
                        fontSize: 10,
                        formatter: (params: unknown) => {
                            const idx = (params as { dataIndex: number }).dataIndex;
                            const row = categoryWaterfall[idx];
                            if (!row) return '';
                            const sign = row.deltaNetSales >= 0 ? '+' : '-';
                            return `${sign}${Math.abs(row.deltaNetSales / 10_000).toFixed(1)}万`;
                        },
                    },
                },
            ],
        };
    }, [categoryWaterfall, compareMeta.deltaLabel, compareMeta.hasBaseline, compareMeta.mode]);

    const scatterEvents = useMemo(
        () => ({
            click: (params: { data?: { categoryId?: string } }) => {
                const clickedCategory = params?.data?.categoryId;
                if (!clickedCategory) return;
                setSelectedCategoryId((prev) => (prev === clickedCategory ? 'all' : clickedCategory));
            },
        }),
        [],
    );

    const waterfallEvents = useMemo(
        () => ({
            click: (params: { dataIndex?: number }) => {
                const idx = params?.dataIndex ?? -1;
                const point = categoryWaterfall[idx];
                if (!point) return;
                setSelectedCategoryId((prev) => (prev === point.categoryId ? 'all' : point.categoryId));
            },
        }),
        [categoryWaterfall],
    );

    const heatmapOption = useMemo<EChartsOption>(() => {
        const seriesData = heatmap.points.map((point) => ({
            id: point.id,
            value: [point.xIndex, point.yIndex, point.value],
            metricLabel: point.metricLabel,
            metricKey: point.metricKey,
            rawValue: point.rawValue,
            cell: point.cell,
        }));

        return {
            animationDuration: 500,
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown> }).data || {};
                    const cell = row.cell as CategoryOpsHeatPoint['cell'];
                    if (!cell) return '--';

                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${cell.elementLabel}</div>`,
                        `${row.metricLabel}: ${formatPp(Number(row.rawValue || 0))}`,
                        `售罄率：${formatPct(cell.sellThrough)}`,
                        `执行率：${formatPct(cell.fillRate)}`,
                        `补单率：${formatPct(cell.reorderRate)}`,
                        `净销售额：${formatAmount(cell.netSales)}`,
                    ].join('<br/>');
                },
            },
            grid: {
                left: 104,
                right: 18,
                top: 28,
                bottom: 108,
            },
            xAxis: {
                type: 'category',
                data: heatmap.xLabels,
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: {
                    color: '#6B7280',
                    fontSize: 10,
                    rotate: 0,
                    lineHeight: 14,
                    margin: 12,
                    interval: 0,
                    formatter: (value: string) => {
                        if (heatmapXAxis !== 'element') return value;
                        const [category, priceBand] = String(value || '').split(' / ');
                        if (!priceBand) return value;
                        return `${category}\n${priceBand}`;
                    },
                },
                splitArea: { show: false },
            },
            yAxis: {
                type: 'category',
                data: heatmap.yLabels,
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: {
                    color: '#6B7280',
                    fontSize: 11,
                    lineHeight: 15,
                    margin: 12,
                    formatter: (value: string) => {
                        const label = String(value || '');
                        if (label.includes('偏离')) {
                            const [metric, suffix] = label.split('偏离');
                            return `${metric}\n偏离${suffix}`;
                        }
                        if (label.includes('较')) {
                            const [metric, suffix] = label.split('较');
                            return `${metric}\n较${suffix}`;
                        }
                        return label;
                    },
                },
            },
            visualMap: {
                min: heatmap.min,
                max: heatmap.max,
                orient: 'horizontal',
                left: 'center',
                bottom: 14,
                text: ['健康', '风险'],
                textStyle: { color: '#6B7280', fontSize: 11 },
                calculable: false,
                inRange: {
                    color: ['#EF4444', '#F8FAFC', '#10B981'],
                },
            },
            series: [
                {
                    type: 'heatmap',
                    data: seriesData,
                    label: {
                        show: true,
                        formatter: (params: unknown) => {
                            const row = (params as { data?: Record<string, unknown> }).data;
                            if (!row) return '';
                            return formatPp(Number(row.rawValue || 0));
                        },
                        color: '#0F172A',
                        fontSize: 10,
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(15, 23, 42, 0.2)',
                        },
                    },
                },
            ],
        };
    }, [heatmap, heatmapXAxis]);

    const heatmapEvents = useMemo(
        () => ({
            click: (params: { data?: { id?: string } }) => {
                const pointId = params?.data?.id;
                if (!pointId) return;
                const selectedPoint = heatPointMap.get(pointId);
                if (!selectedPoint) return;

                if (heatmapXAxis === 'category') {
                    const targetCategory = selectedPoint.cell.categoryId || 'all';
                    const resetCurrentSelection =
                        filters.category_id === targetCategory && filters.price_band === 'all';
                    setFilters({
                        ...filters,
                        category_id: resetCurrentSelection ? 'all' : targetCategory,
                        price_band: 'all',
                    });
                    return;
                }

                if (heatmapXAxis === 'price_band') {
                    const targetBand = selectedPoint.cell.priceBand.startsWith('PB')
                        ? selectedPoint.cell.priceBand
                        : 'all';
                    const resetCurrentSelection =
                        filters.price_band === targetBand && filters.category_id === 'all';
                    setFilters({
                        ...filters,
                        category_id: 'all',
                        price_band: resetCurrentSelection ? 'all' : targetBand,
                    });
                    return;
                }

                const targetBand = selectedPoint.cell.priceBand.startsWith('PB')
                    ? selectedPoint.cell.priceBand
                    : 'all';
                const targetCategory = selectedPoint.cell.categoryId || 'all';
                const resetCurrentSelection =
                    filters.category_id === targetCategory &&
                    filters.price_band === targetBand;

                setFilters({
                    ...filters,
                    category_id: resetCurrentSelection ? 'all' : targetCategory,
                    price_band: resetCurrentSelection ? 'all' : targetBand,
                });
            },
        }),
        [filters, heatPointMap, heatmapXAxis, setFilters],
    );

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Category & Ops Elements</div>
                        <h2 className="text-lg font-bold text-slate-900">大盘与要素链路</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            复用 fact_sales + dim_sku 聚合，统一跟随全局口径（无对比 / vs计划 / 环比上季 / 同比去年）。
                        </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        口径：{compareMeta.modeLabel} ｜ 当前净销 {formatAmount(totals.netSales)} ｜ 当前销量 {formatPairs(totals.pairsSold)}
                        {compareMeta.hasBaseline && baselineTotals ? (
                            <> ｜ 基线净销 {formatAmount(baselineTotals.netSales)} ｜ 基线销量 {formatPairs(baselineTotals.pairsSold)}</>
                        ) : null}
                    </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{compareMeta.note}</span>
                    <span
                        className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700"
                        title="v0推导：fill_rate = ship / demand；reorder_rate = reorder / demand。当前用售罄、库存压力、需求变化近似推导，非供应链事实。"
                    >
                        v0推导口径ⓘ
                    </span>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-900">经营口径 KPI（本期 / 同期 / 同比）</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {businessKpis.map((card) => {
                        const deltaText = formatBizDelta(card);
                        const deltaPositive = card.deltaValue !== null && card.deltaValue > 0;
                        const deltaNegative = card.deltaValue !== null && card.deltaValue < 0;
                        return (
                            <div key={card.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">{card.title}</div>
                                <div className="mt-1 text-xl font-semibold text-slate-900">{formatBizValue(card)}</div>
                                <div className="mt-1 flex items-center gap-1 text-xs">
                                    <span className={deltaPositive ? 'text-emerald-600' : deltaNegative ? 'text-rose-600' : 'text-slate-400'}>
                                        {deltaPositive ? '▲' : deltaNegative ? '▼' : '—'}
                                    </span>
                                    <span className={deltaPositive ? 'text-emerald-600' : deltaNegative ? 'text-rose-600' : 'text-slate-500'}>
                                        {deltaText}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">{card.description}</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-900">企划执行偏差卡（闭环）</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {planBiasCards.map((card) => (
                        <div key={card.id} className={`rounded-xl border p-3 ${getPlanBiasToneClass(card.tone)}`}>
                            <div className="text-xs text-slate-500">{card.title}</div>
                            <div className="mt-1 text-sm text-slate-900">{card.actualLabel}</div>
                            <div className="text-sm text-slate-600">{card.planLabel}</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">偏差：{card.gapLabel}</div>
                            <div className="mt-1 text-xs text-slate-500">{card.note}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-2 text-sm font-semibold text-slate-900">模块A1：品类旭日图（Product Line → Category）</div>
                    <div className="mb-2 text-xs text-slate-500">面积=销售额占比，颜色=相对当期均值售罄率（低于均值偏红，高于均值偏绿）。</div>
                    <ReactECharts option={sunburstOption} style={{ height: 360 }} notMerge />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-2 text-sm font-semibold text-slate-900">模块A2：量价四象限（ASP × 单款产出）</div>
                    <div className="mb-2 text-xs text-slate-500">气泡大小=业绩金额，点击气泡可下钻动作表。</div>
                    <ReactECharts option={scatterOption} onEvents={scatterEvents} style={{ height: 320 }} notMerge />
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">高价高产：利润区，优先保深度。</div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">低价高产：走量区，控制断码。</div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">低价低产：收敛区，压缩宽度。</div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">高价低产：结构优化区，谨慎补货。</div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 text-sm font-semibold text-slate-900">模块A3：品类贡献瀑布图（拉升 / 拖累）</div>
                <div className="mb-2 text-xs text-slate-500">
                    {compareMeta.mode === 'none'
                        ? '无对比模式下展示当前净销贡献（万）。'
                        : `展示各品类 ${compareMeta.deltaLabel} 的销额贡献（万），正值拉升、负值拖累。`}
                </div>
                <ReactECharts option={waterfallOption} onEvents={waterfallEvents} style={{ height: 360 }} notMerge />
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-900">模块B：商品要素 × 运营链路健康度</div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {kpis.map((card) => (
                        <div key={card.id} className={`rounded-xl border px-3 py-3 ${getToneStyle(card.tone)}`}>
                            <div className="text-xs text-slate-500">{card.title}</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{card.element}</div>
                            <div className="mt-1 text-lg font-bold text-slate-900">{renderKpiValue(card)}</div>
                            <div className="mt-1 text-xs text-slate-500">{card.subValue}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">热力图（商品要素 × 运营链路）</div>
                        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
                            {HEATMAP_XAXIS_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setHeatmapXAxis(option.value)}
                                    className={`px-2.5 py-1 rounded-md transition-colors ${
                                        heatmapXAxis === option.value
                                            ? 'bg-white text-slate-900 shadow-sm font-semibold'
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-2 text-xs text-slate-500">
                        {compareMeta.mode === 'none'
                            ? '红=低于样本均值，绿=高于样本均值；'
                            : `红=低于基线（${compareMeta.deltaLabel}为负），绿=高于基线（${compareMeta.deltaLabel}为正）；`}
                        点击格子可联动筛选
                        {heatmapXAxis === 'category' && '品类'}
                        {heatmapXAxis === 'price_band' && '价格带'}
                        {heatmapXAxis === 'element' && '品类+价格带'}。
                    </div>
                    <ReactECharts option={heatmapOption} onEvents={heatmapEvents} style={{ height: 380 }} notMerge />
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-900">模块C：结论与动作清单（Insight & Actions）</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1 text-xs text-slate-500">发现（Finding）</div>
                        <div className="text-sm leading-6 text-slate-700">{insight.finding}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1 text-xs text-slate-500">原因（Cause）</div>
                        <div className="text-sm leading-6 text-slate-700">{insight.cause}</div>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1 text-xs font-semibold text-slate-600">同比结论（用于季度复盘）</div>
                        <ul className="space-y-1.5 text-sm leading-6 text-slate-700">
                            {insight.yoyConclusions.map((line, index) => (
                                <li key={`yoy-${index + 1}`}>{`${index + 1}. ${line}`}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1 text-xs font-semibold text-slate-600">店比结论（用于渠道配货）</div>
                        <ul className="space-y-1.5 text-sm leading-6 text-slate-700">
                            {insight.storeConclusions.map((line, index) => (
                                <li key={`store-${index + 1}`}>{`${index + 1}. ${line}`}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-semibold text-slate-600">品类分组（现金流 / 潜力 / 预警 / 研究）</div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-slate-700">
                            <span className="font-medium text-emerald-700">现金流：</span>
                            {insight.categoryGroups.cashflow.join('、') || '—'}
                        </div>
                        <div className="rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-sm text-slate-700">
                            <span className="font-medium text-sky-700">潜力：</span>
                            {insight.categoryGroups.potential.join('、') || '—'}
                        </div>
                        <div className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-sm text-slate-700">
                            <span className="font-medium text-rose-700">预警：</span>
                            {insight.categoryGroups.warning.join('、') || '—'}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-slate-700">
                            <span className="font-medium text-amber-700">研究：</span>
                            {insight.categoryGroups.research.join('、') || '—'}
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <div className="mb-2 text-xs font-semibold text-blue-600">建议动作（Actions）</div>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                        {insight.actions.map((action, index) => (
                            <li key={`${index + 1}-${action}`}>{`${index + 1}. ${action}`}</li>
                        ))}
                    </ul>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                            下钻动作表（点击品类触发）：{selectedCategoryLabel}
                        </div>
                        <button
                            onClick={() => setSelectedCategoryId('all')}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-white"
                        >
                            清空下钻
                        </button>
                    </div>
                    <div className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">SKU</th>
                                    <th className="px-3 py-2 text-left font-medium">价带</th>
                                    <th className="px-3 py-2 text-right font-medium">销量</th>
                                    <th className="px-3 py-2 text-right font-medium">销额</th>
                                    <th className="px-3 py-2 text-right font-medium">售罄</th>
                                    <th className="px-3 py-2 text-right font-medium">库存</th>
                                    <th className="px-3 py-2 text-right font-medium">折扣</th>
                                    <th className="px-3 py-2 text-left font-medium">建议动作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {actionRowsForView.map((row) => (
                                    <tr key={row.skuId} className="border-t border-slate-100 text-slate-700">
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-slate-900">{row.skuId}</div>
                                            <div className="text-xs text-slate-500">{row.category}</div>
                                        </td>
                                        <td className="px-3 py-2">{row.priceBandLabel}</td>
                                        <td className="px-3 py-2 text-right">{formatPairs(row.pairsSold)}</td>
                                        <td className="px-3 py-2 text-right">{formatAmount(row.netSales)}</td>
                                        <td className="px-3 py-2 text-right">{formatPct(row.sellThrough)}</td>
                                        <td className="px-3 py-2 text-right">{Math.round(row.onHandUnits).toLocaleString('zh-CN')}双</td>
                                        <td className="px-3 py-2 text-right">{formatPct(row.discountRate)}</td>
                                        <td className={`px-3 py-2 ${getSkuActionTone(row.action)}`} title={row.reason}>{row.action}</td>
                                    </tr>
                                ))}
                                {actionRowsForView.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">
                                            当前筛选下暂无 SKU 动作明细
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}
