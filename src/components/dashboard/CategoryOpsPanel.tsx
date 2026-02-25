'use client';

import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    useCategoryOps,
    type CategoryLevel,
    type CategoryOpsBizKpi,
    type CategoryOpsHeatPoint,
    type CategoryOpsKpiCard,
    type CategoryOpsPlanBiasCard,
    type CategoryOpsSkuActionRow,
    type CategoryOpsSunburstNode,
} from '@/hooks/useCategoryOps';
import { useCategoryStructure } from '@/hooks/useCategoryStructure';
import { useOtbInputSuggestion } from '@/hooks/useOtbInputSuggestion';
import { useSkuDepthAnalysis, type DepthGroupBy } from '@/hooks/useSkuDepthAnalysis';

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

function formatCategoryList(items: string[], limit = 3) {
    const list = items.filter(Boolean).slice(0, limit);
    return list.length ? list.join('、') : '—';
}

function formatPp(value: number) {
    if (!Number.isFinite(value)) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}pp`;
}

function formatSignedCount(value: number, suffix = '') {
    if (!Number.isFinite(value)) return '--';
    const rounded = Math.round(value);
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded.toLocaleString('zh-CN')}${suffix}`;
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

function formatHeatMetric(metricKey: CategoryOpsHeatPoint['metricKey'], value: number) {
    if (metricKey === 'sku_count') return formatSignedCount(value, '个');
    if (metricKey === 'net_sales') return formatAmount(value);
    return formatPct(value / 100);
}

function resolveQuadrantLabel(contribution: number, momentum: number, referenceContribution: number, referenceMomentum: number) {
    const highContribution = contribution >= referenceContribution;
    const highMomentum = momentum >= referenceMomentum;
    if (highContribution && highMomentum) return '现金牛';
    if (!highContribution && highMomentum) return '潜力';
    if (highContribution && !highMomentum) return '预警';
    return '研究';
}

function getDecisionTone(index: number) {
    if (index === 0) return 'border-rose-200 bg-rose-50/60';
    if (index === 1) return 'border-emerald-200 bg-emerald-50/60';
    return 'border-sky-200 bg-sky-50/60';
}

const HEATMAP_METRIC_OPTIONS: Array<{
    value: 'sku_count' | 'net_sales' | 'sell_through';
    label: string;
}> = [
    { value: 'sku_count', label: 'SKU数' },
    { value: 'net_sales', label: '销售额' },
    { value: 'sell_through', label: '售罄率' },
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
    const categoryLevel: CategoryLevel = 'l2';
    const [heatmapMetric, setHeatmapMetric] = useState<'sku_count' | 'net_sales' | 'sell_through'>('sell_through');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [selectedHeatPointId, setSelectedHeatPointId] = useState<string>('all');
    const [depthGroupBy, setDepthGroupBy] = useState<DepthGroupBy>('all');
    const [depthGroupValue, setDepthGroupValue] = useState<string>('all');
    const [showSkuPhase2, setShowSkuPhase2] = useState<boolean>(false);

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
        pareto,
        depth,
        otbSuggestions,
        skuActionRows,
        heatmap,
        insight,
        decisionRows,
    } = useCategoryOps(
        filters,
        'element',
        'cumulative',
        compareMode,
        categoryLevel,
    );

    const { otbSuggestionMap, expectedResult } = useOtbInputSuggestion(otbSuggestions);
    const { heatPointMap, selectedHeatPoint, selectedHeatInsight } = useCategoryStructure(
        heatmap.points,
        selectedHeatPointId,
        compareMeta,
        otbSuggestionMap,
    );

    const activeCategoryFilterId = useMemo(() => {
        if (filters.category_id === 'all') return 'all';
        return filters.category_id;
    }, [filters.category_id]);

    const actionRowsForView = useMemo(() => {
        let scoped = skuActionRows;
        if (selectedCategoryId !== 'all') {
            scoped = scoped.filter((row) => row.categoryId === selectedCategoryId);
        } else if (activeCategoryFilterId !== 'all') {
            scoped = scoped.filter((row) => row.categoryFilterId === activeCategoryFilterId);
        }
        return scoped.slice(0, 40);
    }, [activeCategoryFilterId, selectedCategoryId, skuActionRows]);

    const selectedCategoryLabel = useMemo(() => {
        if (selectedCategoryId !== 'all') {
            const matched = skuActionRows.find((row) => row.categoryId === selectedCategoryId);
            return matched?.category || selectedCategoryId;
        }
        if (activeCategoryFilterId !== 'all') {
            const matched = skuActionRows.find((row) => row.categoryFilterId === activeCategoryFilterId);
            return matched?.category || activeCategoryFilterId;
        }
        return '全部品类';
    }, [activeCategoryFilterId, selectedCategoryId, skuActionRows]);

    const {
        depthGroupOptions,
        activeDepthGroupValue,
        filteredDepthPoints,
        filteredDepthBins,
        filteredDepthSummary,
    } = useSkuDepthAnalysis(depth.scatterPoints, depthGroupBy, depthGroupValue);

    const chartDecisions = useMemo(() => {
        const fallback = decisionRows[0] || null;
        return {
            a1: decisionRows.find((row) => row.title.includes('主力品类')) || fallback,
            a2: decisionRows.find((row) => row.title.includes('链路')) || fallback,
            a3: decisionRows.find((row) => row.title.includes('OTB')) || fallback,
        };
    }, [decisionRows]);

    const sunburstSummary = useMemo(() => {
        const sortedLines = [...sunburstData].sort((a, b) => b.value - a.value);
        if (!sortedLines.length || totals.netSales <= 0) {
            return {
                headline: '当前筛选下暂无品类贡献数据。',
                bullets: ['请调整筛选条件后查看。', '可先切换年份、季节或渠道筛选。'],
            };
        }

        const topLine = sortedLines[0];
        const secondLine = sortedLines[1] || null;
        const allLeaves = sortedLines.flatMap((line) => (
            line.children?.length
                ? line.children.map((child) => ({
                    name: child.name,
                    value: child.value,
                    sellThrough: child.sellThrough,
                    parent: line.name,
                }))
                : [{
                    name: line.name,
                    value: line.value,
                    sellThrough: line.sellThrough,
                    parent: line.name,
                }]
        ));

        const topLeaf = [...allLeaves].sort((a, b) => b.value - a.value)[0] || null;
        const lowSellThroughLeaf = [...allLeaves]
            .filter((leaf) => safeDiv(leaf.value, Math.max(totals.netSales, 1)) >= 0.03)
            .sort((a, b) => a.sellThrough - b.sellThrough)[0] || null;

        return {
            headline: `${topLine.name} 是当前主力，贡献 ${formatPct(safeDiv(topLine.value, totals.netSales))}${secondLine ? `；第二为 ${secondLine.name}（${formatPct(safeDiv(secondLine.value, totals.netSales))}）` : ''}。`,
            bullets: [
                topLeaf
                    ? `二级品类销额最高：${topLeaf.name}（${formatAmount(topLeaf.value)}）。`
                    : '当前暂无稳定主力子品类。',
                lowSellThroughLeaf
                    ? `低效预警：${lowSellThroughLeaf.parent} / ${lowSellThroughLeaf.name} 的${compareMeta.sellThroughLabel}仅 ${formatPct(lowSellThroughLeaf.sellThrough)}。`
                    : '主要品类售罄差异不大，结构相对均衡。',
            ],
        };
    }, [compareMeta.sellThroughLabel, sunburstData, totals.netSales]);

    const scatterSummary = useMemo(() => {
        if (!scatterPoints.length) {
            return {
                headline: '当前筛选下暂无象限样本。',
                bullets: ['请调整筛选后查看象限分布。', '当前无法输出增长动量排名。'],
            };
        }

        const momentumLabel = compareMode === 'none' ? '售罄动量' : compareMeta.deltaLabel;
        const sortedByMomentum = [...scatterPoints].sort((a, b) => b.momentum - a.momentum);
        const topMomentum = sortedByMomentum[0];
        const lowMomentum = sortedByMomentum[sortedByMomentum.length - 1];

        return {
            headline: `现金牛 ${insight.categoryGroups.cashflow.length} 个，潜力 ${insight.categoryGroups.potential.length} 个，预警 ${insight.categoryGroups.warning.length} 个，研究 ${insight.categoryGroups.research.length} 个。`,
            bullets: [
                `${momentumLabel}上行最快：${topMomentum.category}（${(topMomentum.momentum * 100).toFixed(1)}%）；下行明显：${lowMomentum.category}（${(lowMomentum.momentum * 100).toFixed(1)}%）。`,
                `优先动作：先处理预警 ${formatCategoryList(insight.categoryGroups.warning, 2)}，同步加深现金流 ${formatCategoryList(insight.categoryGroups.cashflow, 2)}。`,
            ],
        };
    }, [compareMeta.deltaLabel, compareMode, insight.categoryGroups, scatterPoints]);

    const waterfallSummary = useMemo(() => {
        if (!categoryWaterfall.length) {
            return {
                headline: '当前筛选下暂无可用于瀑布图的品类贡献数据。',
                bullets: ['请切换对比模式或放宽筛选范围。', '当前无法识别拉升与拖累品类。'],
            };
        }

        const topPositive = [...categoryWaterfall]
            .filter((row) => row.deltaNetSales > 0)
            .sort((a, b) => b.deltaNetSales - a.deltaNetSales)[0] || null;
        const topNegative = [...categoryWaterfall]
            .filter((row) => row.deltaNetSales < 0)
            .sort((a, b) => a.deltaNetSales - b.deltaNetSales)[0] || null;
        const totalDelta = categoryWaterfall.reduce((sum, row) => sum + row.deltaNetSales, 0);
        const totalDeltaWan = `${totalDelta >= 0 ? '+' : ''}${(totalDelta / 10_000).toFixed(1)}万`;

        return {
            headline: compareMeta.mode === 'none'
                ? `当前 Top${categoryWaterfall.length} 品类净销贡献合计 ${formatAmount(totalDelta)}。`
                : `${compareMeta.deltaLabel}合计 ${totalDeltaWan}。`,
            bullets: [
                topPositive
                    ? `主要拉升：${topPositive.category}（+${(topPositive.deltaNetSales / 10_000).toFixed(1)}万）。`
                    : '暂无明显拉升品类。',
                topNegative
                    ? `主要拖累：${topNegative.category}（${(topNegative.deltaNetSales / 10_000).toFixed(1)}万）。`
                    : '暂无明显拖累品类。',
            ],
        };
    }, [categoryWaterfall, compareMeta.deltaLabel, compareMeta.mode]);

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
                    minAngle: 4,
                    emphasis: {
                        focus: 'ancestor',
                        label: {
                            show: true,
                        },
                    },
                    labelLayout: {
                        hideOverlap: true,
                    },
                    label: {
                        rotate: 0,
                        color: '#0F172A',
                        fontSize: 11,
                        overflow: 'truncate',
                        width: 86,
                    },
                    levels: [
                        {},
                        {
                            r0: '18%',
                            r: '52%',
                            label: {
                                rotate: 0,
                                fontWeight: 600,
                                formatter: (params: unknown) => {
                                    const item = params as {
                                        name?: string;
                                        value?: number;
                                        data?: { value?: number };
                                    };
                                    const value = Number(item.value ?? item.data?.value ?? 0);
                                    if (safeDiv(value, totals.netSales) < 0.05) return '';
                                    return item.name || '';
                                },
                            },
                        },
                        {
                            r0: '52%',
                            r: '90%',
                            label: {
                                rotate: 0,
                                fontSize: 10,
                                formatter: (params: unknown) => {
                                    const item = params as {
                                        name?: string;
                                        value?: number;
                                        data?: { value?: number };
                                    };
                                    const value = Number(item.value ?? item.data?.value ?? 0);
                                    if (safeDiv(value, totals.netSales) < 0.025) return '';
                                    return item.name || '';
                                },
                            },
                        },
                    ],
                },
            ],
        };
    }, [sunburstData, totals.netSales]);

    const scatterOption = useMemo<EChartsOption>(() => {
        const lifecycleColorMap: Record<string, string> = {
            新品: '#10B981',
            常青: '#2563EB',
            清仓: '#F59E0B',
            其他: '#64748B',
        };
        const visibleLifecycles = Array.from(new Set(scatterPoints.map((item) => item.primaryLifecycleLabel)));
        const maxSkuCount = Math.max(1, ...scatterPoints.map((item) => item.skuCount));
        const refContribution = scatterReference.contributionShareAvg;
        const refMomentum = scatterReference.momentumAvg;

        const series = visibleLifecycles.map((lifecycleLabel) => ({
            name: lifecycleLabel,
            type: 'scatter' as const,
            data: scatterPoints
                .filter((item) => item.primaryLifecycleLabel === lifecycleLabel)
                .map((item) => ({
                    value: [item.contributionShare * 100, item.momentum * 100],
                    categoryId: item.categoryId,
                    categoryFilterId: item.categoryFilterId,
                    category: item.category,
                    productLine: item.productLine,
                    lifecycleLabel: item.primaryLifecycleLabel,
                    skuCount: item.skuCount,
                    netSales: item.netSales,
                    sellThrough: item.sellThrough,
                    gmRate: item.gmRate,
                    fillRate: item.fillRate,
                    reorderRate: item.reorderRate,
                    priceBandMix: item.priceBandMix,
                    quadrant: resolveQuadrantLabel(
                        item.contributionShare,
                        item.momentum,
                        refContribution,
                        refMomentum,
                    ),
                })),
            symbolSize: (value: unknown, params: unknown) => {
                const point = params as { data?: { skuCount?: number } };
                const skuCount = Number(point.data?.skuCount || 0);
                return 14 + Math.sqrt(safeDiv(skuCount, maxSkuCount)) * 26;
            },
            itemStyle: {
                color: lifecycleColorMap[lifecycleLabel] || '#64748B',
                opacity: 0.84,
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
                        `生命周期：${row.lifecycleLabel || '-'}`,
                        `贡献占比：${Number(row.value ? (row.value as number[])[0] : 0).toFixed(1)}%`,
                        `${compareMode === 'none' ? '售罄动量' : compareMeta.deltaLabel}：${Number(row.value ? (row.value as number[])[1] : 0).toFixed(1)}%`,
                        `象限：${row.quadrant || '--'}`,
                        `SKU数：${Math.round(Number(row.skuCount || 0)).toLocaleString('zh-CN')}个`,
                        `销售额：${formatAmount(Number(row.netSales || 0))}`,
                        `售罄率：${formatPct(Number(row.sellThrough || 0))}`,
                        `毛利率：${formatPct(Number(row.gmRate || 0))}`,
                        `执行率：${formatPct(Number(row.fillRate || 0))}`,
                        `补单率：${formatPct(Number(row.reorderRate || 0))}`,
                        `核心价带：${row.priceBandMix || '--'}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                scale: true,
                name: '销售贡献占比(%)',
                nameTextStyle: { color: '#6B7280', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: {
                    color: '#6B7280',
                    formatter: (value: number) => `${value.toFixed(1)}%`,
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                scale: true,
                name: compareMode === 'none' ? '售罄动量(%)' : `${compareMeta.deltaLabel}(%)`,
                nameTextStyle: { color: '#6B7280', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: {
                    color: '#6B7280',
                    formatter: (value: number) => `${value.toFixed(1)}%`,
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            series,
            markLine: {
                symbol: ['none', 'none'],
                lineStyle: { color: '#94A3B8', type: 'dashed' },
                label: { show: false },
                data: [
                    { xAxis: scatterReference.contributionShareAvg * 100 },
                    { yAxis: scatterReference.momentumAvg * 100 },
                ],
            },
        };
    }, [compareMeta.deltaLabel, compareMode, scatterPoints, scatterReference]);

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

    const paretoOption = useMemo<EChartsOption>(() => {
        const displayPoints = pareto.points.slice(0, 20);
        const xLabels = displayPoints.map((point) => `Top${point.rank}`);
        const salesWan = displayPoints.map((point) => point.netSales / 10_000);
        const cumulativePct = displayPoints.map((point) => point.cumulativeShare * 100);

        return {
            animationDuration: 500,
            legend: {
                top: 0,
                textStyle: { color: '#64748B', fontSize: 11 },
            },
            grid: {
                left: 56,
                right: 56,
                top: 40,
                bottom: 54,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params: unknown) => {
                    const list = params as Array<{ dataIndex: number }>;
                    const idx = list?.[0]?.dataIndex ?? -1;
                    const row = displayPoints[idx];
                    if (!row) return '--';
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">Top${row.rank} · ${row.skuId}</div>`,
                        `品类：${row.category}`,
                        `单SKU销额：${formatAmount(row.netSales)}`,
                        `累计贡献：${formatPct(row.cumulativeShare)}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: xLabels,
                axisLabel: { color: '#64748B', fontSize: 10 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            yAxis: [
                {
                    type: 'value',
                    name: '销额(万)',
                    axisLabel: { color: '#64748B', formatter: (value: number) => `${Math.round(value)}` },
                    splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
                },
                {
                    type: 'value',
                    name: '累计贡献(%)',
                    min: 0,
                    max: 100,
                    axisLabel: { color: '#64748B', formatter: (value: number) => `${value.toFixed(0)}%` },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: '单SKU销额',
                    type: 'bar',
                    data: salesWan,
                    itemStyle: { color: '#94A3B8' },
                    barWidth: 14,
                },
                {
                    name: '累计贡献',
                    type: 'line',
                    yAxisIndex: 1,
                    data: cumulativePct,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: { width: 2, color: '#2563EB' },
                    itemStyle: { color: '#2563EB' },
                },
            ],
        };
    }, [pareto.points]);

    const depthHistogramOption = useMemo<EChartsOption>(() => {
        return {
            animationDuration: 500,
            grid: {
                left: 48,
                right: 24,
                top: 28,
                bottom: 36,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params: unknown) => {
                    const list = params as Array<{ dataIndex: number }>;
                    const idx = list?.[0]?.dataIndex ?? -1;
                    const row = filteredDepthBins[idx];
                    if (!row) return '--';
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${row.label}</div>`,
                        `SKU数：${Math.round(row.count).toLocaleString('zh-CN')}个`,
                        `占比：${formatPct(row.share)}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: filteredDepthBins.map((bin) => bin.label),
                axisLabel: { color: '#64748B', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#64748B', formatter: (value: number) => `${Math.round(value)}` },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            series: [
                {
                    type: 'bar',
                    data: filteredDepthBins.map((bin) => bin.count),
                    barWidth: 24,
                    itemStyle: { color: '#64748B' },
                    label: {
                        show: true,
                        position: 'top',
                        color: '#475569',
                        fontSize: 10,
                        formatter: (params: unknown) => {
                            const idx = (params as { dataIndex: number }).dataIndex;
                            const row = filteredDepthBins[idx];
                            return row ? formatPct(row.share) : '';
                        },
                    },
                },
            ],
        };
    }, [filteredDepthBins]);

    const depthScatterOption = useMemo<EChartsOption>(() => {
        const maxInventory = Math.max(1, ...filteredDepthPoints.map((point) => point.onHandUnits));
        return {
            animationDuration: 500,
            grid: {
                left: 56,
                right: 28,
                top: 24,
                bottom: 42,
            },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown> }).data || {};
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${row.category || '-'} · ${row.priceBand || '-'}</div>`,
                        `SKU：${row.skuId || '-'}`,
                        `单款销量：${Math.round(Number(row.value ? (row.value as number[])[0] : 0)).toLocaleString('zh-CN')}双`,
                        `${compareMeta.sellThroughLabel}：${Number(row.value ? (row.value as number[])[1] : 0).toFixed(1)}%`,
                        `库存：${Math.round(Number(row.onHandUnits || 0)).toLocaleString('zh-CN')}双`,
                        `毛利率：${formatPct(Number(row.gmRate || 0))}`,
                        `折扣深度：${formatPct(Number(row.discountRate || 0))}`,
                        `建议：${row.action || '--'}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                scale: true,
                name: '单款销量(双)',
                nameTextStyle: { color: '#6B7280', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#6B7280' },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                scale: true,
                name: `${compareMeta.sellThroughLabel}(%)`,
                nameTextStyle: { color: '#6B7280', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#6B7280', formatter: (value: number) => `${value.toFixed(1)}%` },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            visualMap: {
                min: 0,
                max: 100,
                dimension: 2,
                orient: 'horizontal',
                left: 'center',
                bottom: -2,
                text: ['毛利高', '毛利低'],
                textStyle: { color: '#64748B', fontSize: 11 },
                calculable: false,
                inRange: { color: ['#CBD5E1', '#10B981'] },
            },
            series: [
                {
                    type: 'scatter',
                    data: filteredDepthPoints.map((point) => ({
                        value: [point.pairsSold, point.sellThrough * 100, point.gmRate * 100],
                        skuId: point.skuId,
                        categoryId: point.categoryId,
                        category: point.category,
                        priceBand: point.priceBand,
                        lifecycleLabel: point.lifecycleLabel,
                        onHandUnits: point.onHandUnits,
                        gmRate: point.gmRate,
                        discountRate: point.discountRate,
                        action: point.action,
                    })),
                    symbolSize: (value: unknown, params: unknown) => {
                        const row = params as { data?: { onHandUnits?: number } };
                        const stock = Number(row.data?.onHandUnits || 0);
                        return 8 + Math.sqrt(safeDiv(stock, maxInventory)) * 20;
                    },
                    itemStyle: {
                        opacity: 0.82,
                        borderColor: '#ffffff',
                        borderWidth: 1,
                    },
                },
            ],
        };
    }, [compareMeta.sellThroughLabel, filteredDepthPoints]);

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
        const scopedPoints = heatmap.points.filter((point) => point.metricKey === heatmapMetric);
        const metricRange = heatmap.metricRange[heatmapMetric];
        const seriesData = scopedPoints.map((point) => ({
            id: point.id,
            value: [point.xIndex, point.yIndex, point.value],
            displayValue: point.value,
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
                    const metricKey = String(row.metricKey || '') as CategoryOpsHeatPoint['metricKey'];
                    const displayValue = Number(row.displayValue || 0);
                    const metricLabel = String(row.metricLabel || '--');
                    const sellThroughLabel = compareMeta.sellThroughLabel || '售罄率';

                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${cell.elementLabel}</div>`,
                        `${metricLabel}: ${formatHeatMetric(metricKey, displayValue)}`,
                        `SKU数：${Math.round(cell.skcCnt).toLocaleString('zh-CN')}个`,
                        `销量：${formatPairs(cell.pairsSold)}`,
                        `毛利率：${formatPct(cell.gmRate)}`,
                        `平均折扣：${formatPct(cell.discountRate)}`,
                        `${sellThroughLabel}：${formatPct(cell.sellThrough)}`,
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
                min: metricRange.min,
                max: metricRange.max,
                orient: 'horizontal',
                left: 'center',
                bottom: 14,
                text: heatmapMetric === 'sell_through' ? ['健康', '风险'] : ['高', '低'],
                textStyle: { color: '#6B7280', fontSize: 11 },
                calculable: false,
                inRange: {
                    color: heatmapMetric === 'sell_through'
                        ? ['#EF4444', '#F8FAFC', '#10B981']
                        : ['#F8FAFC', '#CBD5E1', '#334155'],
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
                            const metricKey = String(row.metricKey || '') as CategoryOpsHeatPoint['metricKey'];
                            return formatHeatMetric(metricKey, Number(row.displayValue || 0));
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
    }, [compareMeta.sellThroughLabel, heatmap, heatmapMetric]);

    const heatmapEvents = useMemo(
        () => ({
            click: (params: { data?: { id?: string } }) => {
                const pointId = params?.data?.id;
                if (!pointId) return;
                const selectedPoint = heatPointMap.get(pointId);
                if (!selectedPoint) return;

                setSelectedHeatPointId((prev) => (prev === pointId ? 'all' : pointId));

                const targetBand = selectedPoint.cell.priceBand.startsWith('PB')
                    ? selectedPoint.cell.priceBand
                    : 'all';
                const targetCategory = selectedPoint.cell.categoryFilterId || 'all';
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
        [filters, heatPointMap, setFilters],
    );

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Product Analysis</div>
                        <h2 className="text-lg font-bold text-slate-900">商品分析</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            复用 fact_sales + dim_sku 聚合，统一跟随全局口径（无对比 / vs计划 / 环比上季 / 同比去年）。
                        </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        口径：{compareMeta.modeLabel} ｜ 品类层级：二级品类 ｜ 当前净销 {formatAmount(totals.netSales)} ｜ 当前销量 {formatPairs(totals.pairsSold)}
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

            <section className="space-y-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-2 text-sm font-semibold text-slate-900">模块A1：品类旭日图（Product Line → Category）</div>
                        <div className="mb-2 text-xs text-slate-500">面积=销售额占比，颜色=相对当期均值售罄率（低于均值偏红，高于均值偏绿）。</div>
                        <ReactECharts option={sunburstOption} style={{ height: 360 }} notMerge />
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-1 text-xs font-semibold text-slate-600">A1 图表结论</div>
                            <div className="space-y-1.5 text-xs leading-6 text-slate-700">
                                <div>{sunburstSummary.headline}</div>
                                {sunburstSummary.bullets.map((line, index) => (
                                    <div key={`a1-summary-${index + 1}`}>{line}</div>
                                ))}
                            </div>
                            {chartDecisions.a1 ? (
                                <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs leading-6 text-slate-700">
                                    <span className="font-semibold text-slate-900">对应动作：</span>
                                    {chartDecisions.a1.decision}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-2 text-sm font-semibold text-slate-900">模块A2：品类经营四象限（贡献 × 增长）</div>
                        <div className="mb-2 text-xs text-slate-500">X=销额贡献占比，Y=增长动量（同比/计划或售罄动量），气泡大小=SKU数。</div>
                        <ReactECharts option={scatterOption} onEvents={scatterEvents} style={{ height: 320 }} notMerge />
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                            <span className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-1">现金牛：高贡献 + 正增长</span>
                            <span className="rounded-md border border-sky-200 bg-sky-50/60 px-2 py-1">潜力：低贡献 + 正增长</span>
                            <span className="rounded-md border border-rose-200 bg-rose-50/60 px-2 py-1">预警：高贡献 + 负增长</span>
                            <span className="rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1">研究：低贡献 + 负增长</span>
                        </div>
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-1 text-xs font-semibold text-slate-600">A2 图表结论</div>
                            <div className="space-y-1.5 text-xs leading-6 text-slate-700">
                                <div>{scatterSummary.headline}</div>
                                {scatterSummary.bullets.map((line, index) => (
                                    <div key={`a2-summary-${index + 1}`}>{line}</div>
                                ))}
                            </div>
                            {chartDecisions.a2 ? (
                                <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs leading-6 text-slate-700">
                                    <span className="font-semibold text-slate-900">对应动作：</span>
                                    {chartDecisions.a2.decision}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-2 text-sm font-semibold text-slate-900">模块A3：品类贡献瀑布图（拉升 / 拖累）</div>
                    <div className="mb-2 text-xs text-slate-500">
                        {compareMeta.mode === 'none'
                            ? '无对比模式下展示当前净销贡献（万）。'
                            : `展示各品类 ${compareMeta.deltaLabel} 的销额贡献（万），正值拉升、负值拖累。`}
                    </div>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <ReactECharts option={waterfallOption} onEvents={waterfallEvents} style={{ height: 360 }} notMerge />
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-1 text-xs font-semibold text-slate-600">A3 图表结论</div>
                            <div className="space-y-1.5 text-xs leading-6 text-slate-700">
                                <div>{waterfallSummary.headline}</div>
                                {waterfallSummary.bullets.map((line, index) => (
                                    <div key={`a3-summary-${index + 1}`}>{line}</div>
                                ))}
                            </div>
                            {chartDecisions.a3 ? (
                                <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs leading-6 text-slate-700">
                                    <span className="font-semibold text-slate-900">对应动作：</span>
                                    {chartDecisions.a3.decision}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-slate-900">SKU 二期模块（后续展开）</div>
                        <div className="text-xs text-slate-500">
                            当前先完成“品类层”决策主线；SKU 帕累托、单款深度、下钻动作先收起，避免干扰主评审。
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSkuPhase2((prev) => !prev)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        {showSkuPhase2 ? '收起 SKU 二期' : '展开 SKU 二期'}
                    </button>
                </div>
                {showSkuPhase2 ? (
                    <div className="mt-4 space-y-4">
                        <div className="rounded-xl border border-slate-100 p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">模块B3：SKU 贡献帕累托（Top 集中度）</div>
                                    <div className="text-xs text-slate-500">用于判断爆款集中度与结构风险，Top10/Top20 占比过高意味着对头部SKU依赖更强。</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        Top10集中度 <span className="font-semibold text-slate-900">{formatPct(pareto.top10Share)}</span>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        Top20集中度 <span className="font-semibold text-slate-900">{formatPct(pareto.top20Share)}</span>
                                    </div>
                                </div>
                            </div>
                            <ReactECharts option={paretoOption} style={{ height: 320 }} notMerge />
                        </div>

                        <div className="rounded-xl border border-slate-100 p-4">
                            <div className="mb-3 text-sm font-semibold text-slate-900">模块C：单款深度策略（深度分布 + 深度-售罄联动）</div>
                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                                    {[
                                        { value: 'all' as const, label: '全部样本' },
                                        { value: 'category' as const, label: '按品类' },
                                        { value: 'price_band' as const, label: '按价格带' },
                                        { value: 'lifecycle' as const, label: '按生命周期' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setDepthGroupBy(option.value);
                                                setDepthGroupValue('all');
                                            }}
                                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                                depthGroupBy === option.value
                                                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                                                    : 'text-slate-600 hover:text-slate-800'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                {depthGroupBy !== 'all' ? (
                                    <select
                                        value={activeDepthGroupValue}
                                        onChange={(event) => setDepthGroupValue(event.target.value)}
                                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-slate-400"
                                    >
                                        <option value="all">全部</option>
                                        {depthGroupOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : null}
                                <span className="text-slate-500">
                                    当前样本：{filteredDepthPoints.length.toLocaleString('zh-CN')} 个SKU
                                </span>
                            </div>
                            <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    S款：<span className="font-semibold text-slate-900">{filteredDepthSummary.sCount}</span>（阈值≥{Math.round(filteredDepthSummary.sThreshold)}双）
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    主推款：<span className="font-semibold text-slate-900">{filteredDepthSummary.mainCount}</span>（阈值≥{Math.round(filteredDepthSummary.mainThreshold)}双）
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    长尾款：<span className="font-semibold text-slate-900">{filteredDepthSummary.tailCount}</span>（阈值&lt;{Math.round(filteredDepthSummary.mainThreshold)}双）
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <div className="rounded-xl border border-slate-100 p-4">
                                    <div className="mb-2 text-sm font-medium text-slate-900">C1 单款深度分布（店均销量分箱）</div>
                                    <ReactECharts option={depthHistogramOption} style={{ height: 260 }} notMerge />
                                </div>
                                <div className="rounded-xl border border-slate-100 p-4">
                                    <div className="mb-2 text-sm font-medium text-slate-900">C2 深度—售罄联动（策略校准）</div>
                                    <ReactECharts option={depthScatterOption} style={{ height: 260 }} notMerge />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
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
                        <div className="text-sm font-semibold text-slate-900">热力图（品类 × 价格带）</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="inline-flex rounded-lg bg-slate-100 p-1">
                                {HEATMAP_METRIC_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setHeatmapMetric(option.value)}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${
                                            heatmapMetric === option.value
                                                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                                                : 'text-slate-600 hover:text-slate-800'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mb-2 text-xs text-slate-500">
                        当前指标：
                        {heatmapMetric === 'sku_count' ? 'SKU数' : heatmapMetric === 'net_sales' ? '销售额' : compareMeta.sellThroughLabel}
                        。点击格子可联动筛选“品类 + 价格带”，并输出对应策略建议。
                    </div>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <ReactECharts option={heatmapOption} onEvents={heatmapEvents} style={{ height: 380 }} notMerge />
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="text-xs font-semibold text-slate-700">格子联动策略</div>
                                {selectedHeatPoint ? (
                                    <button
                                        onClick={() => setSelectedHeatPointId('all')}
                                        className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-white"
                                    >
                                        清空
                                    </button>
                                ) : null}
                            </div>
                            {selectedHeatInsight && selectedHeatPoint ? (
                                <div className="space-y-2">
                                    <div className="rounded-md border border-slate-200 bg-white p-2">
                                        <div className="text-xs text-slate-500">当前格子</div>
                                        <div className="text-sm font-semibold text-slate-900">{selectedHeatPoint.cell.elementLabel}</div>
                                    </div>
                                    <div className="rounded-md border border-slate-200 bg-white p-2">
                                        <div className="text-xs text-slate-500">发现</div>
                                        <div className="mt-1 text-sm leading-6 text-slate-700">{selectedHeatInsight.finding}</div>
                                    </div>
                                    <div className="rounded-md border border-slate-200 bg-white p-2">
                                        <div className="text-xs text-slate-500">决策</div>
                                        <div className="mt-1 text-sm leading-6 text-slate-700">{selectedHeatInsight.decision}</div>
                                    </div>
                                    <div className="rounded-md border border-slate-200 bg-white p-2">
                                        <div className="text-xs text-slate-500">结果</div>
                                        <div className="mt-1 text-sm leading-6 text-slate-700">{selectedHeatInsight.result}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-xs leading-6 text-slate-500">
                                    点击任意热力格子后，这里会输出“发现 → 决策 → 结果”，并展示对应 OTB 调整原因。
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-900">模块D：行动清单（Insight & Actions）</div>
                <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                    {decisionRows.slice(0, 3).map((row, index) => (
                        <div key={row.id} className={`rounded-xl border p-3 ${getDecisionTone(index)}`}>
                            <div className="mb-1 text-xs font-semibold text-slate-700">{row.title}</div>
                            <div className="space-y-1.5 text-xs leading-6 text-slate-700">
                                <div><span className="font-medium">发现：</span>{row.finding}</div>
                                <div><span className="font-medium">决策：</span>{row.decision}</div>
                                <div><span className="font-medium">结果：</span>{row.result}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1 text-xs font-semibold text-slate-600">经营总评</div>
                        <div className="text-sm leading-6 text-slate-700">{insight.finding}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-700">
                            <span className="font-medium text-slate-900">原因：</span>
                            {insight.cause}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                <div className="mb-1 text-xs font-semibold text-slate-600">同比速记</div>
                                <ul className="space-y-1 text-xs leading-5 text-slate-700">
                                    {insight.yoyConclusions.slice(0, 2).map((line, index) => (
                                        <li key={`yoy-mini-${index + 1}`}>{`${index + 1}. ${line}`}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                <div className="mb-1 text-xs font-semibold text-slate-600">店比速记</div>
                                <ul className="space-y-1 text-xs leading-5 text-slate-700">
                                    {insight.storeConclusions.slice(0, 2).map((line, index) => (
                                        <li key={`store-mini-${index + 1}`}>{`${index + 1}. ${line}`}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-semibold text-slate-600">品类分组速览</div>
                        <div className="space-y-1.5 text-xs leading-6 text-slate-700">
                            <div>
                                <span className="font-medium text-emerald-700">现金流 {insight.categoryGroups.cashflow.length}：</span>
                                {formatCategoryList(insight.categoryGroups.cashflow)}
                            </div>
                            <div>
                                <span className="font-medium text-sky-700">潜力 {insight.categoryGroups.potential.length}：</span>
                                {formatCategoryList(insight.categoryGroups.potential)}
                            </div>
                            <div>
                                <span className="font-medium text-rose-700">预警 {insight.categoryGroups.warning.length}：</span>
                                {formatCategoryList(insight.categoryGroups.warning)}
                            </div>
                            <div>
                                <span className="font-medium text-amber-700">研究 {insight.categoryGroups.research.length}：</span>
                                {formatCategoryList(insight.categoryGroups.research)}
                            </div>
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

                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <div className="mb-2 text-xs font-semibold text-emerald-700">预计结果（Result）</div>
                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-3">
                        <div>
                            <div className="text-xs text-slate-500">OTB上调权重 / 下调权重</div>
                            <div className="font-semibold text-slate-900">
                                +{expectedResult.positiveShift.toFixed(1)}pp / -{expectedResult.negativeShift.toFixed(1)}pp
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">预计售罄改善</div>
                            <div className="font-semibold text-slate-900">+{expectedResult.sellThroughImprovePp.toFixed(1)}pp</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">预计折扣与毛利改善</div>
                            <div className="font-semibold text-slate-900">
                                折扣 -{expectedResult.discountImprovePp.toFixed(1)}pp / 毛利 +{expectedResult.gmImprovePp.toFixed(1)}pp
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-semibold text-slate-600">OTB 输入建议（草案）</div>
                    <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">品类</th>
                                    <th className="px-3 py-2 text-right font-medium">销售占比</th>
                                    <th className="px-3 py-2 text-right font-medium">毛利贡献占比</th>
                                    <th className="px-3 py-2 text-right font-medium">SKU占比</th>
                                    <th className="px-3 py-2 text-right font-medium">建议OTB权重</th>
                                    <th className="px-3 py-2 text-right font-medium">调整(pp)</th>
                                    <th className="px-3 py-2 text-left font-medium">原因</th>
                                </tr>
                            </thead>
                            <tbody>
                                {otbSuggestions.slice(0, 12).map((row) => (
                                    <tr key={row.categoryId} className="border-t border-slate-100 text-slate-700">
                                        <td className="px-3 py-2 font-medium text-slate-900">{row.category}</td>
                                        <td className="px-3 py-2 text-right">{formatPct(row.salesShare)}</td>
                                        <td className="px-3 py-2 text-right">{formatPct(row.gmShare)}</td>
                                        <td className="px-3 py-2 text-right">{formatPct(row.skuShare)}</td>
                                        <td className="px-3 py-2 text-right">{formatPct(row.suggestedWeight)}</td>
                                        <td className={`px-3 py-2 text-right ${row.deltaPp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {row.deltaPp >= 0 ? '+' : ''}{row.deltaPp.toFixed(1)}pp
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500">{row.reason}</td>
                                    </tr>
                                ))}
                                {otbSuggestions.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">
                                            当前筛选下暂无 OTB 建议
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showSkuPhase2 ? (
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
                ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                        SKU 下钻动作明细已收起，先聚焦品类层决策；点击上方“展开 SKU 二期”可查看。
                    </div>
                )}
            </section>
        </div>
    );
}
