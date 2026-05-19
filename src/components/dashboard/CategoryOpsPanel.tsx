'use client';

import { useCallback, useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    useCategoryOps,
    type CategoryLevel,
    type CategoryOpsBizKpi,
    type CategoryOpsHeatPoint,
    type CategoryOpsSkuActionRow,
    type CategoryOpsSunburstNode,
} from '@/hooks/useCategoryOps';
import { useCategoryStructure } from '@/hooks/useCategoryStructure';
import { useOtbInputSuggestion } from '@/hooks/useOtbInputSuggestion';
import { useSkuDepthAnalysis, type DepthGroupBy } from '@/hooks/useSkuDepthAnalysis';
import portfolioScoreData from '../../../data/planning/category_portfolio_score_history.json';
import seasonalPriorityData from '../../../data/planning/category_seasonal_priority.json';
import paretoData from '../../../data/planning/category_pareto_distribution.json';
import sizeData from '../../../data/planning/category_size_supply_demand.json';
import lifecycle7Data from '../../../data/planning/category_lifecycle_7stages.json';
import actionLogData from '../../../data/planning/category_action_log.json';
import designSignalRaw from '../../../data/planning/category_design_signals.json';
import otbRecommRaw from '../../../data/planning/category_otb_recommendations.json';
import CategoryDesignSignal from './CategoryDesignSignal';
import CategoryOtbRecommendation from './CategoryOtbRecommendation';

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

function formatRatio(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value * 100).toFixed(1)}%`;
}

function formatCategoryList(items: string[], limit = 3) {
    const list = items.filter(Boolean).slice(0, limit);
    return list.length ? list.join('、') : '—';
}

function parseNumberFromLabel(label?: string) {
    const text = String(label || '');
    const matched = text.match(/(\d[\d,]*\.?\d*)/);
    if (!matched) return 0;
    const numeric = Number(matched[1].replace(/,/g, ''));
    if (!Number.isFinite(numeric)) return 0;
    if (text.includes('万')) return numeric * 10_000;
    return numeric;
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

function getSkuActionTone(action: CategoryOpsSkuActionRow['action']) {
    if (action.includes('补单') || action.includes('调拨')) return 'text-emerald-700';
    if (action.includes('收敛') || action.includes('清理')) return 'text-rose-700';
    if (action.includes('调价')) return 'text-amber-700';
    return 'text-slate-600';
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

function toCsvSafeCell(value: string | number) {
    const raw = String(value ?? '');
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
}

const HEATMAP_METRIC_OPTIONS: Array<{
    value: 'sku_count' | 'net_sales' | 'sell_through';
    label: string;
}> = [
    { value: 'sku_count', label: 'SKU数' },
    { value: 'net_sales', label: '销售额' },
    { value: 'sell_through', label: '售罄率' },
];

const SELL_SHIP_HEALTH_MIN = 0.35;
const SELL_SHIP_HEALTH_MAX = 0.75;
const SKU_UTILIZATION_RISK = 0.55;
const SKU_UTILIZATION_GOOD = 0.85;

export default function CategoryOpsPanel({
    filters,
    setFilters,
    compareMode = 'none',
    onJumpToOtb,
    onJumpToInventory,
    onJumpToForecast,
    onJumpToProfitLoss,
    onJumpToPlanning,
}: {
    filters: DashboardFilters;
    setFilters: (next: DashboardFilters) => void;
    compareMode?: CompareMode;
    onJumpToOtb?: () => void;
    onJumpToInventory?: () => void;
    onJumpToForecast?: () => void;
    onJumpToProfitLoss?: () => void;
    onJumpToPlanning?: () => void;
}) {
    const categoryLevel: CategoryLevel = 'l2';
    const [heatmapMetric, setHeatmapMetric] = useState<'sku_count' | 'net_sales' | 'sell_through'>('sell_through');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [selectedHeatPointId, setSelectedHeatPointId] = useState<string>('all');
    const [depthGroupBy, setDepthGroupBy] = useState<DepthGroupBy>('all');
    const [depthGroupValue, setDepthGroupValue] = useState<string>('all');
    const [supplyRankingDimension, setSupplyRankingDimension] = useState<'category' | 'series'>('category');
    const [deepTab, setDeepTab] = useState<'structure' | 'contribution' | 'pareto' | 'supply' | 'sku' | 'action'>('structure');
    // Action Center close-loop state (completed/transferred/cancelled)
    const [actionStatuses, setActionStatuses] = useState<Record<string, 'pending' | 'done' | 'transferred' | 'cancelled'>>(() => {
        const init: Record<string, 'pending' | 'done' | 'transferred' | 'cancelled'> = {};
        (actionLogData as { actions: Array<{ id: string; status: string }> }).actions.forEach((a) => {
            init[a.id] = (a.status === 'done' ? 'done' : a.status === 'transferred' ? 'transferred' : 'pending') as 'pending' | 'done' | 'transferred' | 'cancelled';
        });
        return init;
    });
    const [sizeView, setSizeView] = useState<'combined' | 'female' | 'male'>('combined');
    const [categoryDetailExpanded, setCategoryDetailExpanded] = useState(false);

    const {
        totals,
        baselineTotals,
        compareMeta,
        businessKpis,
        planBiasCards,
        sunburstData,
        scatterPoints,
        channelFitRows,
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

    const { otbSuggestionMap } = useOtbInputSuggestion(otbSuggestions);
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
    } = useSkuDepthAnalysis(depth.scatterPoints, depthGroupBy, depthGroupValue);

    const businessKpiMap = useMemo(() => {
        const map = new Map<string, CategoryOpsBizKpi>();
        businessKpis.forEach((card) => map.set(card.id, card));
        return map;
    }, [businessKpis]);

    const sellShipRatio = Number(businessKpiMap.get('sell_ship_ratio')?.value ?? totals.sellShipRatio ?? 0);

    const supplyRanking = useMemo(() => {
        const sourceRows = scatterPoints.filter((row) => row.netSales > 0 && row.fillRate > 0);
        if (!sourceRows.length) {
            return {
                rows: [] as Array<{ label: string; ratio: number; netSales: number; tone: 'high' | 'low' }>,
                topRows: [] as Array<{ label: string; ratio: number; netSales: number; tone: 'high' | 'low' }>,
                bottomRows: [] as Array<{ label: string; ratio: number; netSales: number; tone: 'high' | 'low' }>,
            };
        }

        const rankedRows = supplyRankingDimension === 'series'
            ? Array.from(sourceRows.reduce((acc, row) => {
                const key = row.productLine || '未分系列';
                const current = acc.get(key) || { label: key, weightedRatio: 0, weight: 0, netSales: 0 };
                current.weightedRatio += safeDiv(row.sellThrough, Math.max(row.fillRate, 1e-6)) * row.netSales;
                current.weight += row.netSales;
                current.netSales += row.netSales;
                acc.set(key, current);
                return acc;
            }, new Map<string, { label: string; weightedRatio: number; weight: number; netSales: number }>())
                .values())
                .map((row) => ({
                    label: row.label,
                    ratio: Math.max(0, Math.min(1.5, safeDiv(row.weightedRatio, Math.max(row.weight, 1e-6)))),
                    netSales: row.netSales,
                }))
            : sourceRows.map((row) => ({
                label: row.category,
                ratio: Math.max(0, Math.min(1.5, safeDiv(row.sellThrough, Math.max(row.fillRate, 1e-6)))),
                netSales: row.netSales,
            }));

        const sorted = rankedRows
            .filter((row) => Number.isFinite(row.ratio))
            .sort((a, b) => a.ratio - b.ratio);

        const bottomRows = sorted.slice(0, Math.min(6, sorted.length)).map((row) => ({ ...row, tone: 'low' as const }));
        const topRows = sorted.slice(Math.max(0, sorted.length - 6)).reverse().map((row) => ({ ...row, tone: 'high' as const }));
        const rows = [...bottomRows, ...topRows];

        return { rows, topRows, bottomRows };
    }, [scatterPoints, supplyRankingDimension]);

    const supplyRankingOption = useMemo<EChartsOption>(() => {
        const rows = supplyRanking.rows;
        const maxValue = Math.max(100, ...rows.map((row) => row.ratio * 100));

        return {
            animationDuration: 400,
            grid: {
                left: 96,
                right: 24,
                top: 12,
                bottom: 24,
            },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                textStyle: { color: '#111827', fontSize: 12 },
                formatter: (params: unknown) => {
                    const item = params as { dataIndex?: number; value?: number };
                    const row = rows[item.dataIndex ?? -1];
                    if (!row) return '--';
                    const toneText = row.tone === 'high' ? 'Top' : 'Bottom';
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${row.label || '-'}</div>`,
                        `销发比：${formatRatio(Number(item.value || 0) / 100)}`,
                        `分组：${toneText}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                max: Math.min(150, Math.ceil(maxValue / 10) * 10),
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#64748B', formatter: (value: number) => `${value.toFixed(0)}%` },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            yAxis: {
                type: 'category',
                data: rows.map((row) => row.label),
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#475569', fontSize: 11 },
                inverse: true,
            },
            series: [
                {
                    type: 'bar',
                    data: rows.map((row) => row.ratio * 100),
                    barWidth: 12,
                    itemStyle: {
                        borderRadius: [0, 4, 4, 0],
                        color: (params: unknown) => {
                            const idx = (params as { dataIndex?: number }).dataIndex ?? -1;
                            return rows[idx]?.tone === 'high' ? '#16A34A' : '#DC2626';
                        },
                    },
                    label: {
                        show: true,
                        position: 'right',
                        color: '#475569',
                        fontSize: 10,
                        formatter: (params: unknown) => {
                            const item = params as { value?: number };
                            return `${Number(item?.value || 0).toFixed(1)}%`;
                        },
                    },
                    markLine: {
                        symbol: ['none', 'none'],
                        lineStyle: { color: '#94A3B8', type: 'dashed' },
                        label: {
                            show: true,
                            color: '#64748B',
                            formatter: (params: unknown) => `${Number((params as { value?: number }).value || 0).toFixed(0)}%`,
                        },
                        data: [{ xAxis: SELL_SHIP_HEALTH_MIN * 100 }, { xAxis: SELL_SHIP_HEALTH_MAX * 100 }],
                    },
                },
            ],
        };
    }, [supplyRanking.rows]);

    const supplyActionText = useMemo(() => {
        if (!supplyRanking.rows.length) {
            return '销发比低时优先调拨/减量；销发比高时先查缺码/缺货，再决定是否追加。';
        }
        const lowTargets = formatCategoryList(supplyRanking.bottomRows.map((row) => row.label), 2);
        const highTargets = formatCategoryList(supplyRanking.topRows.map((row) => row.label), 2);
        return `低销发比（${lowTargets}）优先调拨/减量；高销发比（${highTargets}）先查缺码/缺货再决定追加。`;
    }, [supplyRanking.bottomRows, supplyRanking.rows.length, supplyRanking.topRows]);

    const planSkuCard = useMemo(
        () => planBiasCards.find((card) => card.id === 'plan_sku_gap') || null,
        [planBiasCards],
    );
    const planDepthCard = useMemo(
        () => planBiasCards.find((card) => card.id === 'plan_depth_gap') || null,
        [planBiasCards],
    );
    const planSku = useMemo(() => parseNumberFromLabel(planSkuCard?.planLabel), [planSkuCard?.planLabel]);
    const activeSku = useMemo(() => Number(businessKpiMap.get('active_sku_count')?.value ?? 0), [businessKpiMap]);
    const skuUtilization = useMemo(
        () => (planSku > 0 ? safeDiv(activeSku, planSku) : null),
        [activeSku, planSku],
    );
    const salesPerSku = useMemo(() => {
        const kpiValue = Number(businessKpiMap.get('sales_per_sku')?.value ?? 0);
        if (Number.isFinite(kpiValue) && kpiValue > 0) return kpiValue;
        return safeDiv(totals.netSales, Math.max(activeSku, 1));
    }, [activeSku, businessKpiMap, totals.netSales]);
    const planSalesPerSku = useMemo(
        () => parseNumberFromLabel(planDepthCard?.planLabel),
        [planDepthCard?.planLabel],
    );

    const planningRules = useMemo(() => {
        const rules: string[] = [];
        const hasPlanSku = planSku > 0;
        const depthLow = planSalesPerSku > 0 ? salesPerSku < planSalesPerSku * 0.85 : false;

        if (!hasPlanSku) {
            rules.push('当前缺计划 SKU 字段，建议先补齐计划口径再判定利用率。');
            return rules;
        }
        if (skuUtilization !== null && skuUtilization < SKU_UTILIZATION_RISK) {
            rules.push('SKU利用率偏低：建议砍长尾，聚焦核心楦型和系列化。');
        }
        if (depthLow || planDepthCard?.tone === 'risk') {
            rules.push('单款产出偏低：建议减少上新密度，提升主推集中度。');
        }
        if (skuUtilization !== null && skuUtilization > SKU_UTILIZATION_GOOD && (depthLow || planDepthCard?.tone !== 'good')) {
            rules.push('利用率高但产出低：建议优化价带结构与渠道首配深度。');
        }
        if (!rules.length) {
            rules.push('当前企划落地效率处于可控区间，建议维持节奏并按周复盘偏差。');
        }
        return rules.slice(0, 3);
    }, [planDepthCard?.tone, planSalesPerSku, planSku, salesPerSku, skuUtilization]);

    const skuUtilizationToneClass = useMemo(() => {
        if (skuUtilization === null) return 'border-amber-200 bg-amber-50/70';
        if (skuUtilization < SKU_UTILIZATION_RISK) return 'border-rose-200 bg-rose-50/70';
        if (skuUtilization > SKU_UTILIZATION_GOOD) return 'border-emerald-200 bg-emerald-50/70';
        return 'border-amber-200 bg-amber-50/70';
    }, [skuUtilization]);

    const hasSizeData = useMemo(() => {
        return skuActionRows.some((row) => {
            const r = row as unknown as Record<string, unknown>;
            return ['size', 'size_code', 'sizeCode', 'last', 'last_id', 'lastId', 'stockout_rate', 'full_size_rate']
                .some((key) => r[key] !== undefined && r[key] !== null && r[key] !== '');
        });
    }, [skuActionRows]);

    const sizeHealth = useMemo(() => {
        if (!hasSizeData) {
            return {
                hasData: false,
                fullSizeRate: null as number | null,
                stockoutRate: null as number | null,
                coreSizeSalesShare: null as number | null,
                topStockoutRows: [] as Array<{ label: string; stockoutRate: number }>,
            };
        }

        const fullSizeValues: number[] = [];
        const stockoutValues: number[] = [];
        const coreShareValues: number[] = [];
        const topRows: Array<{ label: string; stockoutRate: number }> = [];

        skuActionRows.forEach((row) => {
            const r = row as unknown as Record<string, unknown>;
            const fullSize = Number(r.full_size_rate ?? r.fullSizeRate ?? NaN);
            const stockout = Number(r.stockout_rate ?? r.stockoutRate ?? NaN);
            const coreShare = Number(r.core_size_sales_share ?? r.coreSizeSalesShare ?? NaN);
            const lastLabel = String(r.last_name ?? r.last ?? r.lastId ?? '—');

            if (Number.isFinite(fullSize)) fullSizeValues.push(fullSize);
            if (Number.isFinite(stockout)) {
                stockoutValues.push(stockout);
                topRows.push({
                    label: `${row.category} / ${lastLabel} / ${row.skuId}`,
                    stockoutRate: stockout,
                });
            }
            if (Number.isFinite(coreShare)) coreShareValues.push(coreShare);
        });

        return {
            hasData: fullSizeValues.length > 0 || stockoutValues.length > 0 || coreShareValues.length > 0,
            fullSizeRate: fullSizeValues.length
                ? fullSizeValues.reduce((sum, value) => sum + value, 0) / fullSizeValues.length
                : null,
            stockoutRate: stockoutValues.length
                ? stockoutValues.reduce((sum, value) => sum + value, 0) / stockoutValues.length
                : null,
            coreSizeSalesShare: coreShareValues.length
                ? coreShareValues.reduce((sum, value) => sum + value, 0) / coreShareValues.length
                : null,
            topStockoutRows: topRows
                .sort((a, b) => b.stockoutRate - a.stockoutRate)
                .slice(0, 6),
        };
    }, [hasSizeData, skuActionRows]);

    const planningChecklistRows = useMemo(() => {
        const scatterMap = new Map(scatterPoints.map((row) => [row.categoryId, row]));
        const waveLabel = filters.wave === 'all' ? '全部波段' : String(filters.wave);
        const rows = otbSuggestions.slice(0, 20).map((row) => {
            const scatter = scatterMap.get(row.categoryId);
            const ratio = scatter ? safeDiv(scatter.sellThrough, Math.max(scatter.fillRate, 1e-6)) : sellShipRatio;
            const localSalesPerSku = scatter ? safeDiv(scatter.netSales, Math.max(scatter.skuCount, 1)) : salesPerSku;
            let trigger = '结构与动销匹配需持续跟踪。';
            let priority = 'P2';
            let action = '维持现配，按周复盘并滚动修正。';

            if (ratio < SELL_SHIP_HEALTH_MIN) {
                trigger = '销发比偏低，发货压力高于零售消化。';
                priority = 'P1';
                action = '优先调拨/减量，收缩低效投放并压实去化节奏。';
            } else if (ratio > SELL_SHIP_HEALTH_MAX) {
                trigger = '销发比偏高，疑似缺码/缺货导致放量受限。';
                priority = 'P1';
                action = '先排查核心尺码缺货，再决定是否追加补单。';
            } else if (skuUtilization !== null && skuUtilization < SKU_UTILIZATION_RISK) {
                trigger = 'SKU利用率偏低，企划宽度落地效率不足。';
                priority = 'P2';
                action = '削减长尾，集中核心系列与主力价带。';
            }

            return {
                dimension: `${row.category} / ${scatter?.productLine || '—'} / ${waveLabel} / —`,
                sellShipRatio: ratio,
                skuUtilization,
                salesPerSku: localSalesPerSku,
                stockoutRate: sizeHealth.stockoutRate,
                trigger,
                priority,
                action,
                owner: '',
                dueDate: '',
            };
        });

        if (rows.length) return rows;
        return [{
            dimension: `全部品类 / — / ${waveLabel} / —`,
            sellShipRatio,
            skuUtilization,
            salesPerSku,
            stockoutRate: sizeHealth.stockoutRate,
            trigger: '当前筛选下暂无可导出明细，建议放宽筛选后导出。',
            priority: 'P3',
            action: '先补齐样本后再执行纠偏。',
            owner: '',
            dueDate: '',
        }];
    }, [filters.wave, otbSuggestions, salesPerSku, scatterPoints, sellShipRatio, sizeHealth.stockoutRate, skuUtilization]);

    const exportPlanningChecklist = useCallback(() => {
        const headers = ['维度（品类/系列/波段/楦型）', '销发比', 'SKU利用率', '单款产出', '断码率', '触发原因', '优先级', '建议动作', '负责人', '截止时间'];
        const lines = [
            headers.map((cell) => toCsvSafeCell(cell)).join(','),
            ...planningChecklistRows.map((row) => [
                toCsvSafeCell(row.dimension),
                toCsvSafeCell(formatRatio(row.sellShipRatio)),
                toCsvSafeCell(row.skuUtilization === null ? '—' : formatRatio(row.skuUtilization)),
                toCsvSafeCell(formatAmount(row.salesPerSku)),
                toCsvSafeCell(row.stockoutRate === null ? '' : formatRatio(row.stockoutRate)),
                toCsvSafeCell(row.trigger),
                toCsvSafeCell(row.priority),
                toCsvSafeCell(row.action),
                toCsvSafeCell(row.owner),
                toCsvSafeCell(row.dueDate),
            ].join(',')),
        ];

        const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const dateLabel = new Date().toISOString().slice(0, 10);
        anchor.href = url;
        anchor.download = `企划纠偏清单（鞋类）_${dateLabel}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }, [planningChecklistRows]);

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
            '\u65b0\u54c1': '#10B981', // Emerald
            '\u6b21\u65b0\u54c1': '#F59E0B', // Amber
            '\u8001\u54c1': '#3B82F6', // Blue
            '\u5176\u5b83': '#94A3B8', // Slate
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
                return 18 + Math.sqrt(safeDiv(skuCount, maxSkuCount)) * 36;
            },
            itemStyle: {
                color: {
                    type: 'radial' as const,
                    x: 0.3, y: 0.3, r: 1,
                    colorStops: [
                        { offset: 0, color: '#ffffff' }, 
                        { offset: 0.4, color: lifecycleColorMap[lifecycleLabel] || '#64748B' },
                        { offset: 1, color: lifecycleColorMap[lifecycleLabel] || '#64748B' }
                    ]
                },
                opacity: 0.9,
                borderColor: 'rgba(255, 255, 255, 0.6)',
                borderWidth: 1.5,
                shadowBlur: 16,
                shadowColor: lifecycleColorMap[lifecycleLabel] ? `${lifecycleColorMap[lifecycleLabel]}AA` : 'rgba(100,116,139,0.5)',
                shadowOffsetY: 4,
            },
            emphasis: {
                itemStyle: {
                    opacity: 1,
                    shadowBlur: 24,
                    shadowColor: lifecycleColorMap[lifecycleLabel] || '#64748B',
                    borderColor: '#ffffff',
                    borderWidth: 2,
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
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(51, 65, 85, 0.5)',
                textStyle: { color: '#F8FAFC', fontSize: 12 },
                padding: [12, 16],
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown>; color?: string }).data || {};
                    return [
                        `<div style="font-weight:700;margin-bottom:8px;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px">${row.category || '-'} <span style="font-size:11px;font-weight:500;color:#94A3B8;margin-left:6px">${row.productLine || '-'}</span></div>`,
                        `<div style="display:flex;gap:16px;margin-bottom:4px"><span>贡献占比: <b style="color:#fff">${Number(row.value ? (row.value as number[])[0] : 0).toFixed(1)}%</b></span><span>动量增幅: <b style="color:${Number(row.value ? (row.value as number[])[1] : 0) >= 0 ? '#10B981' : '#F43F5E'}">${Number(row.value ? (row.value as number[])[1] : 0).toFixed(1)}%</b></span></div>`,
                        `<div style="margin-bottom:4px">库龄层级：<span style="color:#fff;background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:11px">${row.lifecycleLabel || '-'}</span></div>`,
                        `<div style="margin-bottom:4px">象限：<span style="color:#fff;background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:11px">${row.quadrant || '--'}</span></div>`,
                        `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.1)">SKU数：<span>${Math.round(Number(row.skuCount || 0)).toLocaleString('zh-CN')} 款</span><br/>销售额：<span style="color:#38BDF8">${formatAmount(Number(row.netSales || 0))}</span><br/>售罄率：<span>${formatPct(Number(row.sellThrough || 0))}</span><br/>毛利率：<span style="color:${Number(row.gmRate || 0) > 0.5 ? '#10B981' : '#F43F5E'}">${formatPct(Number(row.gmRate || 0))}</span></div>`
                    ].join('');
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
                label: { show: false },
                data: [
                    { xAxis: scatterReference.contributionShareAvg * 100, lineStyle: { color: '#0EA5E9', type: 'dashed', width: 1.5, opacity: 0.6 } },
                    { yAxis: scatterReference.momentumAvg * 100, lineStyle: { color: '#0EA5E9', type: 'dashed', width: 1.5, opacity: 0.6 } },
                    { yAxis: 0, lineStyle: { color: '#F43F5E', type: 'solid', width: 1, opacity: 0.4 } }
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

    const momentumAxisLabel = compareMeta.hasBaseline ? '增长动量' : '售罄相对动量';
    const positiveMomentumLabel = compareMeta.hasBaseline ? '正增长' : '高于均值';
    const negativeMomentumLabel = compareMeta.hasBaseline ? '负增长' : '低于均值';

    // ── NEW COMPUTED SECTIONS ──────────────────────────────────────────────────
    const decisionSummary = useMemo(() => {
        const refMomentum = scatterReference.momentumAvg;
        const refContribution = scatterReference.contributionShareAvg;

        const boostCats = [...scatterPoints]
            .filter((p) => p.momentum >= refMomentum && p.netSales > 0)
            .sort((a, b) => b.momentum - a.momentum)
            .slice(0, 3)
            .map((p) => ({ name: p.category, role: p.contributionShare >= refContribution ? '现金牛' : '潜力', momentum: p.momentum, gmRate: p.gmRate, netSales: p.netSales }));

        const reduceCats = [...scatterPoints]
            .filter((p) => p.momentum < refMomentum && p.contributionShare >= refContribution)
            .sort((a, b) => a.momentum - b.momentum)
            .slice(0, 3)
            .map((p) => ({ name: p.category, role: '预警', momentum: p.momentum, gmRate: p.gmRate, netSales: p.netSales }));

        const riskCats = [...scatterPoints]
            .filter((p) => p.contributionShare >= 0.02)
            .sort((a, b) => a.sellThrough - b.sellThrough)
            .slice(0, 3)
            .map((p) => ({ name: p.category, sellThrough: p.sellThrough, gmRate: p.gmRate, netSales: p.netSales }));

        const boostSales = boostCats.reduce((s, p) => s + p.netSales * 0.15, 0);
        const reduceSaves = reduceCats.reduce((s, p) => s + p.netSales * 0.1, 0);
        return { boostCats, reduceCats, riskCats, boostSales, reduceSaves };
    }, [scatterPoints, scatterReference]);

    // OTB 增加 / 冻结建议（来自静态 JSON 数据）
    const otbDecisionSummary = useMemo(() => {
        const otbData = otbRecommRaw as Array<{
            category: string;
            currentOtb: number;
            recommendedOtb: number;
            adjustment: number;
            adjustmentReason: string;
            recommendedAction: string;
            riskLevel: string;
        }>;
        const increaseOtb = otbData.filter((r) => r.adjustment > 0).sort((a, b) => b.adjustment - a.adjustment).slice(0, 3);
        const freezeOtb = otbData.filter((r) => r.adjustment < 0).sort((a, b) => a.adjustment - b.adjustment).slice(0, 3);
        const totalIncrease = increaseOtb.reduce((s, r) => s + r.adjustment, 0);
        const totalFreeze = Math.abs(freezeOtb.reduce((s, r) => s + r.adjustment, 0));
        // 下一波设计方向：取 continue + hero_visual 的前 3 个
        const continueSignals = (designSignalRaw as Array<{ shoeType: string; designRecommendation: string; colorStory?: string; funcTags?: string[]; salesGrowth: number }>)
            .filter((d) => d.designRecommendation === 'continue' || d.designRecommendation === 'hero_visual')
            .sort((a, b) => b.salesGrowth - a.salesGrowth)
            .slice(0, 3);
        return { increaseOtb, freezeOtb, totalIncrease, totalFreeze, continueSignals };
    }, []);

    const lifecycleDiagnosis = useMemo(() => {
        const groups = new Map<string, typeof scatterPoints>();
        scatterPoints.forEach((p) => {
            const key = p.primaryLifecycleLabel || '其他';
            const arr = groups.get(key) ?? [];
            arr.push(p);
            groups.set(key, arr);
        });
        const ORDER = ['新品', '次新品', '老品', '其他'];
        return ORDER.filter((lc) => groups.has(lc)).map((lifecycle) => {
            const pts = groups.get(lifecycle)!;
            const avgSellThrough = pts.reduce((s, p) => s + p.sellThrough, 0) / pts.length;
            const avgMomentum = pts.reduce((s, p) => s + p.momentum, 0) / pts.length;
            const totalSales = pts.reduce((s, p) => s + p.netSales, 0);
            const totalSkus = pts.reduce((s, p) => s + p.skuCount, 0);
            const topCats = [...pts].sort((a, b) => b.netSales - a.netSales).slice(0, 3).map((p) => p.category);
            let status: 'risk' | 'warn' | 'good' = 'good';
            let headline = '';
            const actions: string[] = [];

            if (lifecycle === '新品') {
                if (avgSellThrough < 0.3) { status = 'risk'; headline = '新品爬坡严重缓慢，需立即干预'; actions.push('减少同质SKU投入', '加大流量扶持', '调整渠道首配策略'); }
                else if (avgSellThrough < 0.5) { status = 'warn'; headline = '新品售罄低于目标，关注前2周动销'; actions.push('前2周跟踪动销节奏', '热区调拨优化', '排查陈列和价格竞争力'); }
                else { headline = '新品爬坡健康，维持上新节奏'; actions.push('按计划执行波段扩展', '持续跟踪动销曲线'); }
            } else if (lifecycle === '老品') {
                if (avgMomentum < -0.1) { status = 'risk'; headline = '成熟款明显掉速，存在规模损失风险'; actions.push('启动渠道调拨加速去化', '评估是否停产/减量', '促销推动库存消化'); }
                else if (avgMomentum < 0) { status = 'warn'; headline = '成熟款轻微下滑，需排查原因'; actions.push('排查替代款竞争', '检查价格带适配性', '考虑系列更新策略'); }
                else { headline = '成熟款保持稳定，维持配货深度'; actions.push('维持配货深度', '关注折扣管理和毛利保护'); }
            } else if (lifecycle === '次新品') {
                if (avgSellThrough < 0.45) { status = 'warn'; headline = '次新品去化节奏不足，需加速动销'; actions.push('二次流量推送', '适度加大折扣力度'); }
                else { headline = '次新品动销良好，持续跟进成熟度'; actions.push('准备下季延续或升级策略'); }
            } else {
                if (avgSellThrough < 0.25) { status = 'risk'; headline = '尾货积压严重，需立即启动清仓'; actions.push('转移至折扣/奥莱渠道', '集中促销加速去化'); }
                else { headline = '尾货消化中，维持促销力度'; actions.push('按计划执行清仓节奏'); }
            }
            return { lifecycle, points: pts, avgSellThrough, avgMomentum, totalSales, totalSkus, topCats, status, headline, actions };
        });
    }, [scatterPoints]);

    const priceBandDiagnosis = useMemo(() => {
        const stPoints = heatmap.points.filter((p) => p.metricKey === 'sell_through');
        const skuPoints = heatmap.points.filter((p) => p.metricKey === 'sku_count');
        const topBands = [...stPoints]
            .filter((p) => p.rawValue > 0 && p.cell.netSales > 0)
            .sort((a, b) => b.cell.netSales - a.cell.netSales)
            .slice(0, 3)
            .map((p) => ({ label: p.cell.elementLabel, sellThrough: p.rawValue, netSales: p.cell.netSales }));
        const bandAgg = new Map<string, { label: string; skuCount: number; sellThrough: number; netSales: number }>();
        skuPoints.forEach((sp) => {
            const key = sp.cell.priceBand;
            const stPt = stPoints.find((s) => s.cell.priceBand === key && s.cell.categoryId === sp.cell.categoryId);
            const ex = bandAgg.get(key) ?? { label: key, skuCount: 0, sellThrough: 0, netSales: 0 };
            ex.skuCount += sp.rawValue;
            if (stPt) ex.sellThrough = (ex.sellThrough + stPt.rawValue) / 2;
            ex.netSales += sp.cell.netSales;
            bandAgg.set(key, ex);
        });
        const overcrowded = [...bandAgg.values()]
            .filter((b) => b.skuCount > 4 && b.sellThrough < 0.4 && b.sellThrough > 0)
            .sort((a, b) => a.sellThrough - b.sellThrough)
            .slice(0, 2);
        return { topBands, overcrowded };
    }, [heatmap.points]);

    const actionCenterRows = useMemo(() => {
        const rows: Array<{ priority: 'P0' | 'P1' | 'P2'; category: string; issue: string; cause: string; action: string; impactAmount: number; modules: string[] }> = [];
        const refMomentum = scatterReference.momentumAvg;
        const refContribution = scatterReference.contributionShareAvg;

        [...scatterPoints]
            .filter((p) => p.momentum < -0.05 && p.contributionShare >= refContribution)
            .sort((a, b) => a.momentum - b.momentum)
            .slice(0, 2)
            .forEach((p) => rows.push({
                priority: 'P0', category: p.category,
                issue: compareMeta.hasBaseline ? '核心品类销售下滑，影响整体销售目标' : '核心品类售罄低于均值，存在库存效率风险',
                cause: compareMeta.hasBaseline
                    ? `贡献占比${formatPct(p.contributionShare)}，动量${(p.momentum * 100).toFixed(1)}%，规模损失约${formatAmount(p.netSales * Math.abs(p.momentum))}`
                    : `贡献占比${formatPct(p.contributionShare)}，售罄动量低于均值 ${Math.abs(p.momentum * 100).toFixed(1)}pp，需要优先修正`,
                action: '评估渠道配货，启动促销推动去化，减少下季同类SKU投入',
                impactAmount: p.netSales * Math.abs(p.momentum),
                modules: ['库存健康', 'OTB预算'],
            }));

        [...scatterPoints]
            .filter((p) => p.sellThrough < 0.35 && p.contributionShare >= 0.03)
            .sort((a, b) => a.sellThrough - b.sellThrough)
            .slice(0, 2)
            .forEach((p) => rows.push({
                priority: p.sellThrough < 0.25 ? 'P0' : 'P1', category: p.category,
                issue: `售罄率${formatPct(p.sellThrough)}，库存积压风险高`,
                cause: '动销不足导致库存占压，集中折扣将损伤毛利',
                action: '加强流量扶持，向高动销渠道调拨，考虑限时折扣去化',
                impactAmount: p.netSales * 0.08,
                modules: ['库存健康', '损益'],
            }));

        if (skuUtilization !== null && skuUtilization < SKU_UTILIZATION_RISK) {
            rows.push({
                priority: 'P1', category: '全品类',
                issue: `SKU利用率${formatPct(skuUtilization)}，企划效率不足`,
                cause: '长尾SKU占用企划资源但贡献极低，拉低整体效率',
                action: '砍长尾SKU，聚焦核心楦型和主力价格带，减少无效上新',
                impactAmount: salesPerSku * activeSku * 0.15,
                modules: ['波段企划', 'OTB预算'],
            });
        }

        [...scatterPoints]
            .filter((p) => p.momentum >= refMomentum && p.contributionShare < refContribution && p.netSales > 0)
            .sort((a, b) => b.momentum - a.momentum)
            .slice(0, 2)
            .forEach((p) => rows.push({
                priority: 'P2', category: p.category,
                issue: '潜力品类动量强但贡献占比低，存在放量机会',
                cause: `${momentumAxisLabel}${(p.momentum * 100).toFixed(1)}%，贡献仅${formatPct(p.contributionShare)}，尚未充分放量`,
                action: '增加SKU宽度，加大渠道铺货深度，追加OTB预算',
                impactAmount: p.netSales * 0.2,
                modules: ['OTB预算', '波段企划'],
            }));

        if (rows.length < 2) {
            decisionRows.slice(0, 2 - rows.length).forEach((row) => rows.push({
                priority: 'P2', category: '整体', issue: row.finding, cause: row.result, action: row.decision, impactAmount: 0, modules: ['销售预测'],
            }));
        }
        return rows.slice(0, 7);
    }, [compareMeta.hasBaseline, decisionRows, momentumAxisLabel, scatterPoints, scatterReference, skuUtilization, salesPerSku, activeSku]);

    const categoryDetailRows = useMemo(() => {
        const refContribution = scatterReference.contributionShareAvg;
        const refMomentum = scatterReference.momentumAvg;
        return [...scatterPoints].sort((a, b) => b.netSales - a.netSales).map((p) => {
            const highContrib = p.contributionShare >= refContribution;
            const highMomentum = p.momentum >= refMomentum;
            let role: string; let priority: string; let actionText: string;
            if (highContrib && highMomentum) { role = '加码品类'; priority = 'P1'; actionText = '追加OTB，扩大铺货深度'; }
            else if (!highContrib && highMomentum) { role = '潜力品类'; priority = 'P2'; actionText = '监控放量时机，适时加码'; }
            else if (highContrib && !highMomentum) { role = '调结构品类'; priority = 'P0'; actionText = '控量，启动调拨和促销去化'; }
            else { role = '观察品类'; priority = 'P3'; actionText = '维持现配，严控SKU投入'; }
            return {
                category: p.category, role, salesAmount: p.netSales, achievementRate: p.momentum,
                sellThrough: p.sellThrough, gmRate: p.gmRate, skuCount: p.skuCount,
                salesPerSkuVal: safeDiv(p.netSales, Math.max(p.skuCount, 1)),
                lifecycle: p.primaryLifecycleLabel, mainPriceBand: p.priceBandMix || '--', action: actionText, priority,
            };
        });
    }, [scatterPoints, scatterReference]);

    // ── V12 新增 useMemos ──────────────────────────────────────────────────────

    // 季度品类组合得分（静态数据，加载自 JSON）
    const portfolioScore = useMemo(() => portfolioScoreData, []);

    // 季节性优先级（静态数据）
    const seasonalPriority = useMemo(() => seasonalPriorityData, []);

    // 80/20 帕累托（静态数据）
    const paretoV12 = useMemo(() => paretoData, []);

    // 尺码段供需（静态数据）
    const sizeSupplyDemand = useMemo(() => sizeData, []);

    // 鞋类 7 阶段生命周期（静态数据）
    const lifecycle7 = useMemo(() => lifecycle7Data, []);

    // Action Center 合并行（computed rows + action log statuses）
    const actionCenterV12 = useMemo(() => {
        // 把 actionLogData 中已有的行和 actionCenterRows 合并，去重
        const logRows = (actionLogData as { actions: Array<{ id: string; priority: string; category: string; issue: string; cause: string; action: string; impactAmount: number; modules: string[] }> }).actions.map((a) => ({
            id: a.id,
            priority: a.priority as 'P0' | 'P1' | 'P2',
            category: a.category,
            issue: a.issue,
            cause: a.cause,
            action: a.action,
            impactAmount: a.impactAmount,
            modules: a.modules,
        }));
        // Merge with computed rows (append if not duplicated by category+priority)
        const merged = [...logRows];
        actionCenterRows.forEach((row) => {
            const dup = merged.some((r) => r.category === row.category && r.priority === row.priority);
            if (!dup) merged.push({ id: `gen-${row.category}-${row.priority}`, ...row });
        });
        return merged.slice(0, 8);
    }, [actionCenterRows]);

    // Action Center 进度统计
    const actionProgress = useMemo(() => {
        const total = actionCenterV12.length;
        const done = actionCenterV12.filter((r) => actionStatuses[r.id] === 'done').length;
        const transferred = actionCenterV12.filter((r) => actionStatuses[r.id] === 'transferred').length;
        const cancelled = actionCenterV12.filter((r) => actionStatuses[r.id] === 'cancelled').length;
        const pending = total - done - transferred - cancelled;
        return { total, done, transferred, cancelled, pending };
    }, [actionCenterV12, actionStatuses]);

    return (
        <div className="space-y-5">
            {/* 0. Page Header */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Category Operations</div>
                        <h2 className="text-lg font-bold text-slate-900">品类运营决策工作台</h2>
                        <p className="mt-0.5 text-xs text-slate-500">鞋类品牌品类增长与结构优化 · 经营结果 → 角色定位 → 结构诊断 → SKU效率 → 供需 → 款宽款深 → 设计信号 → OTB/波段/库存动作建议</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        口径：{compareMeta.modeLabel} ｜ 净销 {formatAmount(totals.netSales)} ｜ 品类层级：二级
                        {compareMeta.hasBaseline && baselineTotals ? <> ｜ 基线 {formatAmount(baselineTotals.netSales)}</> : null}
                    </div>
                </div>
            </section>

            {/* 1. 决策摘要区 */}
            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900">品类决策摘要</h3>
                    <p className="text-xs text-slate-500 mt-0.5">本期品类运营关键结论 · 首屏直接回答 6 个核心决策问题</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {/* 1. 建议加码品类 */}
                    <div className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs font-bold text-emerald-800">建议加码品类</span>
                        </div>
                        {decisionSummary.boostCats.map((cat, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-emerald-100 last:border-0">
                                <div className="min-w-0 mr-2">
                                    <span className="text-xs font-semibold text-slate-900">{cat.name}</span>
                                    <span className="ml-1.5 text-[10px] rounded px-1 bg-emerald-100 text-emerald-700">{cat.role}</span>
                                </div>
                                <div className="text-right shrink-0 text-[10px]">
                                    <div className="font-medium text-emerald-700">{cat.momentum >= 0 ? '+' : ''}{(cat.momentum * 100).toFixed(1)}%</div>
                                    <div className="text-slate-400">GM {formatPct(cat.gmRate)}</div>
                                </div>
                            </div>
                        ))}
                        {decisionSummary.boostCats.length === 0 && <div className="text-xs text-slate-400 py-2">暂无推荐</div>}
                        <div className="mt-2 text-[10px] text-emerald-600">预计增量：{formatAmount(decisionSummary.boostSales)}</div>
                    </div>

                    {/* 2. 建议控制/收缩品类 */}
                    <div className="rounded-xl border border-rose-200 bg-white/80 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-xs font-bold text-rose-800">建议控制品类</span>
                        </div>
                        {decisionSummary.reduceCats.map((cat, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-rose-100 last:border-0">
                                <span className="text-xs font-semibold text-slate-900 truncate mr-2">{cat.name}</span>
                                <div className="text-right shrink-0 text-[10px]">
                                    <div className="font-medium text-rose-700">{cat.momentum >= 0 ? '+' : ''}{(cat.momentum * 100).toFixed(1)}%</div>
                                    <div className="text-slate-400">{formatAmount(cat.netSales)}</div>
                                </div>
                            </div>
                        ))}
                        {decisionSummary.reduceCats.length === 0 && <div className="text-xs text-slate-400 py-2">暂无收缩推荐</div>}
                        <div className="mt-2 text-[10px] text-rose-600">可释放资源：{formatAmount(decisionSummary.reduceSaves)}</div>
                    </div>

                    {/* 3. 建议清理品类（低售罄高库存） */}
                    <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-xs font-bold text-amber-800">建议清理品类</span>
                        </div>
                        {decisionSummary.riskCats.map((cat, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-amber-100 last:border-0">
                                <span className="text-xs font-semibold text-slate-900 truncate mr-2">{cat.name}</span>
                                <div className="text-right shrink-0 text-[10px]">
                                    <div className="font-medium text-amber-700">售罄 {formatPct(cat.sellThrough)}</div>
                                    <div className="text-slate-400">GM {formatPct(cat.gmRate)}</div>
                                </div>
                            </div>
                        ))}
                        {decisionSummary.riskCats.length === 0 && <div className="text-xs text-slate-400 py-2">暂无清理推荐</div>}
                        <div className="mt-2 text-[10px] text-amber-600">↓ 在 Action Center 查看清货方案</div>
                    </div>

                    {/* 4. 建议增加 OTB */}
                    <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                            <span className="text-xs font-bold text-sky-800">建议追加 OTB</span>
                        </div>
                        {otbDecisionSummary.increaseOtb.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-sky-100 last:border-0">
                                <span className="text-xs font-semibold text-slate-900 truncate mr-2">{r.category}</span>
                                <span className="text-xs font-bold text-sky-700 shrink-0">+{formatAmount(r.adjustment)}</span>
                            </div>
                        ))}
                        {otbDecisionSummary.increaseOtb.length === 0 && <div className="text-xs text-slate-400 py-2">暂无追加建议</div>}
                        <div className="mt-2 text-[10px] text-sky-600">合计追加：{formatAmount(otbDecisionSummary.totalIncrease)}</div>
                    </div>

                    {/* 5. 建议冻结 OTB */}
                    <div className="rounded-xl border border-orange-200 bg-white/80 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                            <span className="text-xs font-bold text-orange-800">建议冻结 OTB</span>
                        </div>
                        {otbDecisionSummary.freezeOtb.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-orange-100 last:border-0">
                                <span className="text-xs font-semibold text-slate-900 truncate mr-2">{r.category}</span>
                                <span className="text-xs font-bold text-orange-700 shrink-0">{formatAmount(r.adjustment)}</span>
                            </div>
                        ))}
                        {otbDecisionSummary.freezeOtb.length === 0 && <div className="text-xs text-slate-400 py-2">暂无冻结建议</div>}
                        <div className="mt-2 text-[10px] text-orange-600">可释放现金：{formatAmount(otbDecisionSummary.totalFreeze)}</div>
                    </div>

                    {/* 6. 下一波品类结构建议 */}
                    <div className="rounded-xl border border-violet-200 bg-white/80 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                            <span className="text-xs font-bold text-violet-800">下一波品类结构</span>
                        </div>
                        {decisionSummary.boostCats.slice(0, 2).map((cat, i) => (
                            <div key={i} className="py-1 border-b border-violet-100 last:border-0 text-xs">
                                <span className="font-medium text-slate-800">{cat.name}</span>
                                <span className="ml-1 text-slate-500">→ 加深 + 扩渠道</span>
                            </div>
                        ))}
                        {decisionSummary.reduceCats.slice(0, 1).map((cat, i) => (
                            <div key={i} className="py-1 border-b border-violet-100 last:border-0 text-xs">
                                <span className="font-medium text-slate-800">{cat.name}</span>
                                <span className="ml-1 text-slate-500">→ 控量 + 清仓</span>
                            </div>
                        ))}
                        <div className="mt-2 text-[10px] text-violet-600">基于动量矩阵 + OTB数据综合推演</div>
                    </div>

                    {/* 7. 设计方向建议（鞋类专业） */}
                    <div className="col-span-1 sm:col-span-2 rounded-xl border border-indigo-200 bg-white/80 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-indigo-800">下一波设计方向</span>
                            <span className="text-[10px] text-slate-400 ml-1">来自设计信号 · 延续开发 + 主视觉方向</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {otbDecisionSummary.continueSignals.map((sig, i) => (
                                <div key={i} className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                                    <div className="text-xs font-semibold text-slate-900">{sig.shoeType}</div>
                                    {sig.colorStory && <div className="text-[10px] text-slate-500 mt-0.5">颜色：{sig.colorStory}</div>}
                                    {sig.funcTags && sig.funcTags.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {sig.funcTags.slice(0, 3).map((tag) => (
                                                <span key={tag} className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] text-indigo-700">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-1 text-[10px] text-emerald-600">+{(sig.salesGrowth * 100).toFixed(0)}% 销售增长</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. 品类经营 KPI */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">品类经营总览</h3>
                        <p className="text-xs text-slate-400 mt-0.5">核心经营指标 · 颜色=健康状态</p>
                    </div>
                    <div className="text-xs text-slate-400">{compareMeta.note}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
                    {businessKpis.slice(0, 8).map((card) => {
                        const deltaPositive = card.deltaValue !== null && card.deltaValue > 0;
                        const deltaNegative = card.deltaValue !== null && card.deltaValue < 0;
                        return (
                            <div key={card.id} className={`rounded-xl border p-3 ${card.tone === 'good' ? 'border-emerald-200 bg-emerald-50' : card.tone === 'risk' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                                <div className="text-xs text-slate-500">{card.title}</div>
                                <div className="mt-1 text-xl font-semibold text-slate-900">{formatBizValue(card)}</div>
                                <div className="mt-1 flex items-center gap-1 text-xs">
                                    <span className={deltaPositive ? 'text-emerald-600' : deltaNegative ? 'text-rose-600' : 'text-slate-400'}>{deltaPositive ? '▲' : deltaNegative ? '▼' : '—'}</span>
                                    <span className={deltaPositive ? 'text-emerald-600' : deltaNegative ? 'text-rose-600' : 'text-slate-500'}>{formatBizDelta(card)}</span>
                                </div>
                                <div className="mt-0.5 text-[10px] text-slate-400">{card.description}</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 2.1 品类 Action Center（经营总览后优先展示） */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">品类 Action Center</h3>
                        <p className="text-xs text-slate-400 mt-0.5">P0=立即处理，P1=本周内，P2=机会追加 · 完成/转交/撤销闭环</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setActionStatuses({});
                                window.alert(`🤖 AI 已基于本期决策摘要重新生成 ${actionCenterV12.length} 项行动\n· 加码 3 项 → P2\n· 收缩 3 项 → P1\n· 高风险 3 项 → P0\n建议优先处理 P0 项目`);
                            }}
                            className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                            title="基于决策摘要 3+3+3 + 风险数据，由 AI 自动生成本周行动清单"
                        >🤖 AI 智能生成行动</button>
                        <button onClick={exportPlanningChecklist} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">导出企划纠偏清单</button>
                    </div>
                </div>
                {/* 进度条 */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-4 flex-wrap text-xs">
                        <span className="font-semibold text-slate-700">本周 {actionProgress.total} 项</span>
                        <span className="text-emerald-600">✓ 已完成 {actionProgress.done}</span>
                        <span className="text-sky-600">→ 已转交 {actionProgress.transferred}</span>
                        <span className="text-slate-400">✕ 已撤销 {actionProgress.cancelled}</span>
                        <span className="text-amber-600 font-medium">待处理 {actionProgress.pending}</span>
                        <div className="flex-1 min-w-[120px]">
                            <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${actionProgress.total > 0 ? ((actionProgress.done + actionProgress.transferred) / actionProgress.total) * 100 : 0}%` }} />
                            </div>
                        </div>
                        <span className="text-slate-500">{actionProgress.total > 0 ? Math.round(((actionProgress.done + actionProgress.transferred) / actionProgress.total) * 100) : 0}% 处理率</span>
                    </div>
                </div>
                <div className="space-y-3">
                    {actionCenterV12.map((row) => {
                        const status = actionStatuses[row.id] ?? 'pending';
                        if (status === 'cancelled') return null;
                        const prioStyle = row.priority === 'P0' ? 'border-rose-300 bg-rose-100 text-rose-800' : row.priority === 'P1' ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-sky-200 bg-sky-50 text-sky-700';
                        const cardBg = status === 'done' ? 'border-emerald-100 bg-emerald-50/30 opacity-60' : status === 'transferred' ? 'border-sky-100 bg-sky-50/30 opacity-60' : row.priority === 'P0' ? 'border-rose-100 bg-rose-50/40' : row.priority === 'P1' ? 'border-amber-100 bg-amber-50/40' : 'border-sky-100 bg-sky-50/40';
                        return (
                            <div key={row.id} className={`rounded-xl border p-4 ${cardBg}`}>
                                <div className="flex flex-wrap items-start gap-3 mb-2">
                                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold border ${prioStyle}`}>{row.priority}</span>
                                    {status === 'done' && <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 rounded px-2 py-0.5 font-medium">✓ 已完成</span>}
                                    {status === 'transferred' && <span className="shrink-0 text-[10px] bg-sky-100 text-sky-700 rounded px-2 py-0.5 font-medium">→ 已转交</span>}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-bold text-slate-900">{row.category}</span>
                                        <span className="ml-2 text-xs text-slate-500">{row.issue}</span>
                                    </div>
                                    {row.impactAmount > 0 && (
                                        <div className="shrink-0 text-right">
                                            <div className="text-[10px] text-slate-400">影响金额</div>
                                            <div className="text-sm font-bold text-slate-900">{formatAmount(row.impactAmount)}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 mb-2">
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-slate-400">原因：</span><span className="text-slate-700">{row.cause}</span></div>
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-slate-400">建议动作：</span><span className="text-slate-700 font-medium">{row.action}</span></div>
                                </div>
                                {/* 影响预估行 */}
                                <div className="mb-2 flex flex-wrap gap-2 border-t border-b border-slate-100 py-2 text-[10px]">
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-400">📈 销售</span>
                                        <span className={`font-medium ${row.impactAmount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.impactAmount > 0 ? '+' : '-'}{formatAmount(Math.abs(row.impactAmount * 0.8))}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-400">◎ 毛利</span>
                                        <span className={`font-medium ${row.impactAmount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{row.impactAmount > 0 ? '+' : '-'}{formatAmount(Math.abs(row.impactAmount * 0.3))}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-400">📦 库存</span>
                                        <span className="font-medium text-slate-600">{formatAmount(Math.abs(row.impactAmount * 0.5))}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-400">💰 现金</span>
                                        <span className={`font-medium ${row.modules.includes('OTB预算') ? 'text-rose-500' : 'text-emerald-600'}`}>{row.modules.includes('OTB预算') ? '-' : '+'}{formatAmount(Math.abs(row.impactAmount * 0.4))}</span>
                                    </div>
                                    {row.modules.includes('OTB预算') && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-400">🏷 OTB</span>
                                            <span className="font-medium text-sky-600">{row.priority === 'P0' ? '冻结' : '追加'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {/* 具体动作按钮 */}
                                    {row.modules.includes('OTB预算') && (
                                        <button onClick={onJumpToOtb} className="rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-700 hover:bg-sky-100">调整 OTB</button>
                                    )}
                                    {row.modules.includes('波段企划') && (
                                        <button onClick={onJumpToPlanning} className="rounded border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-700 hover:bg-violet-100">生成波段建议</button>
                                    )}
                                    {row.modules.includes('库存健康') && (
                                        <button onClick={onJumpToInventory} className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100">查看库存风险</button>
                                    )}
                                    {row.modules.includes('损益') && (
                                        <button onClick={onJumpToProfitLoss} className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100">查看损益影响</button>
                                    )}
                                    {row.modules.includes('销售预测') && (
                                        <button onClick={onJumpToForecast} className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50">调整销售预测</button>
                                    )}
                                    {(row.priority === 'P0' || row.modules.includes('设计方向')) && (
                                        <button className="rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 cursor-default">生成设计 Brief</button>
                                    )}
                                    {status === 'pending' && (
                                        <div className="ml-auto flex gap-1.5">
                                            <button
                                                onClick={() => setActionStatuses((prev) => ({ ...prev, [row.id]: 'done' }))}
                                                className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100"
                                            >✓ 完成</button>
                                            <button
                                                onClick={() => setActionStatuses((prev) => ({ ...prev, [row.id]: 'transferred' }))}
                                                className="rounded border border-sky-300 bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-700 hover:bg-sky-100"
                                            >→ 转交</button>
                                            <button
                                                onClick={() => setActionStatuses((prev) => ({ ...prev, [row.id]: 'cancelled' }))}
                                                className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100"
                                            >✕ 撤销</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {actionCenterV12.every((r) => actionStatuses[r.id] === 'cancelled') && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-xs text-slate-500">所有行动项已处理</div>
                    )}
                </div>
            </section>

            {/* 2.5 季度品类组合得分 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">季度品类组合得分</h3>
                        <p className="text-xs text-slate-400 mt-0.5">4维综合评分（满分100）· 识别拖后腿维度 · 与行业对标</p>
                    </div>
                    <div className="text-xs text-slate-400">{portfolioScore.current.quarter}</div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_240px]">
                    {/* 总分 + 评级 */}
                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className={`text-5xl font-black ${portfolioScore.current.total >= 85 ? 'text-emerald-600' : portfolioScore.current.total >= 70 ? 'text-sky-600' : portfolioScore.current.total >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {portfolioScore.current.total}
                        </div>
                        <div className={`mt-1 text-sm font-bold px-2.5 py-0.5 rounded-full ${portfolioScore.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : portfolioScore.grade === 'B' ? 'bg-sky-100 text-sky-700' : portfolioScore.grade === 'C' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                            {portfolioScore.grade} 级
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400">行业均值：{portfolioScore.industryAvg}分</div>
                        <div className={`text-[10px] font-medium ${portfolioScore.current.total >= portfolioScore.industryAvg ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {portfolioScore.current.total >= portfolioScore.industryAvg ? '▲' : '▼'} {Math.abs(portfolioScore.current.total - portfolioScore.industryAvg)}分
                        </div>
                    </div>
                    {/* 4维得分 */}
                    <div className="space-y-3">
                        {([
                            { key: 'salesContribution', label: '销售贡献', weight: '30%', value: portfolioScore.current.salesContribution },
                            { key: 'gmContribution', label: '毛利贡献', weight: '30%', value: portfolioScore.current.gmContribution },
                            { key: 'turnoverEfficiency', label: '周转效率', weight: '20%', value: portfolioScore.current.turnoverEfficiency },
                            { key: 'riskControl', label: '风险防控', weight: '20%', value: portfolioScore.current.riskControl },
                        ] as const).map((dim) => {
                            const isWeak = (portfolioScore.weakDimensions as string[]).includes(dim.label);
                            return (
                                <div key={dim.key} className="flex items-center gap-3">
                                    <div className="w-20 shrink-0 text-xs text-slate-600 font-medium">{dim.label}</div>
                                    <div className="text-[10px] text-slate-400 w-8 shrink-0">{dim.weight}</div>
                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div className={`h-2 rounded-full transition-all ${dim.value >= 75 ? 'bg-emerald-500' : dim.value >= 60 ? 'bg-sky-500' : 'bg-amber-500'}`} style={{ width: `${dim.value}%` }} />
                                    </div>
                                    <div className={`w-8 text-right text-xs font-bold shrink-0 ${dim.value >= 75 ? 'text-emerald-600' : dim.value >= 60 ? 'text-sky-600' : 'text-amber-600'}`}>{dim.value}</div>
                                    {isWeak && <span className="text-[10px] text-amber-600 shrink-0">⚠ 弱</span>}
                                </div>
                            );
                        })}
                        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] text-amber-700 leading-5">
                            💡 {portfolioScore.suggestion}
                        </div>
                    </div>
                    {/* 季度趋势 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-medium text-slate-700 mb-2">近4季度趋势</div>
                        <div className="space-y-2">
                            {portfolioScore.history.map((h, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="text-[10px] text-slate-500 w-16 shrink-0">{h.quarter}</div>
                                    <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div className={`h-1.5 rounded-full ${h.total >= 70 ? 'bg-sky-500' : 'bg-amber-400'}`} style={{ width: `${h.total}%` }} />
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-700 w-6 text-right shrink-0">{h.total}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. 品类角色矩阵 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">品类角色矩阵</h3>
                    <p className="text-xs text-slate-400 mt-0.5">X=销售贡献占比 · Y={momentumAxisLabel} · 气泡大小=SKU规模 · 颜色=生命周期 · 点击品类可联动筛选</p>
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <ReactECharts option={scatterOption} onEvents={scatterEvents} style={{ height: 380 }} notMerge />
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                                <div className="font-bold text-emerald-800 mb-1">加码品类 ✓</div>
                                <div className="text-slate-500 text-[10px] mb-1">高贡献 + {positiveMomentumLabel}</div>
                                <div className="text-emerald-700 text-[11px]">{formatCategoryList(insight.categoryGroups.cashflow, 3) || '—'}</div>
                            </div>
                            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                                <div className="font-bold text-sky-800 mb-1">潜力放量 ↗</div>
                                <div className="text-slate-500 text-[10px] mb-1">低贡献 + {positiveMomentumLabel}</div>
                                <div className="text-sky-700 text-[11px]">{formatCategoryList(insight.categoryGroups.potential, 3) || '—'}</div>
                            </div>
                            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                                <div className="font-bold text-rose-800 mb-1">立即干预 ⚠</div>
                                <div className="text-slate-500 text-[10px] mb-1">高贡献 + {negativeMomentumLabel}</div>
                                <div className="text-rose-700 text-[11px]">{formatCategoryList(insight.categoryGroups.warning, 3) || '—'}</div>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                                <div className="font-bold text-amber-800 mb-1">控量观察 ✗</div>
                                <div className="text-slate-500 text-[10px] mb-1">低贡献 + {negativeMomentumLabel}</div>
                                <div className="text-amber-700 text-[11px]">{formatCategoryList(insight.categoryGroups.research, 3) || '—'}</div>
                            </div>
                        </div>
                        {selectedCategoryId !== 'all' && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800">{selectedCategoryLabel}</span>
                                <button onClick={() => setSelectedCategoryId('all')} className="text-sky-600 hover:underline text-[10px]">清空筛选</button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 4. 款量价深诊断 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">款量价深诊断</h3>
                    <p className="text-xs text-slate-400 mt-0.5">SKU宽度、款深、价格带合理性评估，输出商品动作建议</p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className={`rounded-xl border p-4 ${skuUtilizationToneClass}`}>
                        <div className="text-xs text-slate-500 mb-2 font-medium">SKU 宽度（企划落地效率）</div>
                        <div className="flex items-end gap-3 mb-3">
                            <div><div className="text-[10px] text-slate-400">企划SKU</div><div className="text-2xl font-bold text-slate-900">{planSku > 0 ? formatCount(planSku) : '—'}</div></div>
                            <div className="pb-1 text-slate-300 text-lg">→</div>
                            <div><div className="text-[10px] text-slate-400">动销SKU</div><div className="text-2xl font-bold text-slate-900">{formatCount(activeSku)}</div></div>
                            <div className="pb-1"><div className="text-[10px] text-slate-400">利用率</div><div className="text-lg font-bold text-slate-900">{skuUtilization === null ? '—' : formatRatio(skuUtilization)}</div></div>
                        </div>
                        <div className="space-y-1">
                            {planningRules.map((rule, i) => <div key={i} className="text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">{i + 1}. {rule}</div>)}
                        </div>
                    </div>
                    <div className={`rounded-xl border p-4 ${planDepthCard?.tone === 'risk' ? 'border-rose-200 bg-rose-50/60' : planDepthCard?.tone === 'good' ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                        <div className="text-xs text-slate-500 mb-2 font-medium">款深（单款产出效率）</div>
                        <div className="flex items-end gap-3 mb-3">
                            <div><div className="text-[10px] text-slate-400">计划款深</div><div className="text-xl font-bold text-slate-900">{planDepthCard?.planLabel || '—'}</div></div>
                            <div className="pb-1 text-slate-300 text-lg">vs</div>
                            <div><div className="text-[10px] text-slate-400">实际单SKU产出</div><div className="text-xl font-bold text-slate-900">{formatAmount(salesPerSku)}</div></div>
                        </div>
                        {planDepthCard ? (
                            <div className="text-xs text-slate-700 space-y-1">
                                <div className="font-medium">偏差：{planDepthCard.gapLabel}</div>
                                <div className="text-slate-500">{planDepthCard.note}</div>
                            </div>
                        ) : <div className="text-xs text-slate-400">款深计划字段缺失，建议补齐</div>}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs text-slate-500 mb-2 font-medium">价格带结构</div>
                        <div className="text-[10px] text-slate-400 mb-1.5">主力价格带（按销售额）</div>
                        {priceBandDiagnosis.topBands.map((band, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                                <span className="text-slate-700 truncate mr-2">{band.label}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`font-medium ${band.sellThrough >= 0.6 ? 'text-emerald-600' : band.sellThrough < 0.4 ? 'text-rose-600' : 'text-amber-600'}`}>{formatPct(band.sellThrough)}</span>
                                    <span className="text-slate-400">{formatAmount(band.netSales)}</span>
                                </div>
                            </div>
                        ))}
                        {priceBandDiagnosis.topBands.length === 0 && <div className="text-xs text-slate-400">暂无价格带数据</div>}
                        {priceBandDiagnosis.overcrowded.length > 0 && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
                                <div className="text-[10px] font-medium text-amber-700 mb-1">⚠ 过密价格带</div>
                                {priceBandDiagnosis.overcrowded.map((band, i) => (
                                    <div key={i} className="text-[10px] text-amber-700">{band.label}：{Math.round(band.skuCount)}款，售罄 {formatPct(band.sellThrough)}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 5. 鞋类 7 阶段生命周期诊断 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">鞋类 7 阶段生命周期诊断</h3>
                        <p className="text-xs text-slate-400 mt-0.5">开发 → 样品 → 预热 → 爬坡 → 巅峰 → 衰退 → 清货 · 标注卡点款数</p>
                    </div>
                    <div className="text-xs text-slate-400">总 SKU：{lifecycle7.stages.reduce((s, st) => s + st.skuCount, 0)} 个</div>
                </div>
                <div className="overflow-x-auto pb-1">
                    <div className="flex gap-2 min-w-[680px]">
                        {lifecycle7.stages.map((stage) => {
                            const hasDiag = stage.stuckDiagnosis !== null;
                            const isStuck = hasDiag;
                            const toneClass = stage.avgSellThrough === null ? 'border-slate-200 bg-slate-50' :
                                isStuck ? (stage.stuckDiagnosis!.stuckCount >= 10 ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/50') :
                                'border-emerald-200 bg-emerald-50/50';
                            const stageEmoji = { development: '🖊', sample: '🗂', prelaunch: '🚀', rampup: '📈', peak: '⭐', decline: '📉', clearance: '🏷' }[stage.stage] ?? '•';
                            const stageWidth = { development: 80, sample: 80, prelaunch: 100, rampup: 110, peak: 140, decline: 110, clearance: 100 }[stage.stage] ?? 100;
                            return (
                                <div key={stage.stage} className={`rounded-xl border p-3 flex-shrink-0`} style={{ width: stageWidth, minWidth: stageWidth, borderColor: toneClass.includes('rose') ? '#fca5a5' : toneClass.includes('amber') ? '#fcd34d' : toneClass.includes('emerald') ? '#6ee7b7' : '#e2e8f0' }}>
                                    <div className="flex items-center gap-1 mb-1.5">
                                        <span className="text-sm">{stageEmoji}</span>
                                        <span className="text-xs font-bold text-slate-900">{stage.label}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mb-1.5">{stage.description}</div>
                                    <div className="text-lg font-black text-slate-900">{stage.skuCount}<span className="text-[10px] font-normal text-slate-400">款</span></div>
                                    {stage.avgSellThrough !== null && (
                                        <div className="mt-1">
                                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                                <span>售罄</span>
                                                <span className={stage.avgSellThrough >= (stage.targetSellThrough ?? 0) ? 'text-emerald-600' : 'text-rose-600'}>
                                                    {(stage.avgSellThrough * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="bg-slate-200 rounded-full h-1 overflow-hidden">
                                                <div className={`h-1 rounded-full ${stage.avgSellThrough >= (stage.targetSellThrough ?? 0) ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${Math.min(stage.avgSellThrough * 100, 100)}%` }} />
                                            </div>
                                            {stage.targetSellThrough !== null && (
                                                <div className="text-[9px] text-slate-400 mt-0.5">目标 {(stage.targetSellThrough * 100).toFixed(0)}%</div>
                                            )}
                                        </div>
                                    )}
                                    {isStuck && (
                                        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-[9px] text-amber-700 leading-4">
                                            ⚠ {stage.stuckDiagnosis!.stuckCount}款卡点
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* 卡点详情 */}
                {lifecycle7.stages.filter((s) => s.stuckDiagnosis).length > 0 && (
                    <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium text-slate-700">卡点诊断详情</div>
                        {lifecycle7.stages.filter((s) => s.stuckDiagnosis).map((s) => (
                            <div key={s.stage} className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-700">
                                <span className="font-semibold">{s.label}期：</span>{s.stuckDiagnosis!.message}
                            </div>
                        ))}
                    </div>
                )}
                {/* 同时展示原有动态分组（新品/次新品/老品/其他）辅助视图 */}
                {lifecycleDiagnosis.length > 0 && (
                    <details className="mt-4">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">▸ 查看按生命周期组的品类分布（辅助视图）</summary>
                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {lifecycleDiagnosis.map((group) => {
                                const toneClass = group.status === 'risk' ? 'border-rose-200 bg-rose-50/50' : group.status === 'warn' ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50';
                                const dotClass = group.status === 'risk' ? 'bg-rose-500' : group.status === 'warn' ? 'bg-amber-500' : 'bg-emerald-500';
                                return (
                                    <div key={group.lifecycle} className={`rounded-xl border p-3 ${toneClass}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                                            <span className="text-xs font-bold text-slate-900">{group.lifecycle}</span>
                                            <span className="text-[10px] text-slate-500 ml-auto">{group.points.length}品类</span>
                                        </div>
                                        <div className="text-[10px] text-slate-700 leading-5">{group.headline}</div>
                                        {group.actions.slice(0, 1).map((a, i) => <div key={i} className="text-[10px] text-slate-500 mt-1">→ {a}</div>)}
                                    </div>
                                );
                            })}
                        </div>
                    </details>
                )}
            </section>

            {/* 5b. 季节性运营优先级 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">季节性运营优先级</h3>
                    <p className="text-xs text-slate-400 mt-0.5">鞋类核心季节性品类倒计时 · 识别紧迫库存与运营窗口</p>
                </div>
                {seasonalPriority.weeklyHighlight && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 font-medium">
                        📌 {seasonalPriority.weeklyHighlight}
                    </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {seasonalPriority.items.map((item) => {
                        const urgencyBorder = item.urgencyLevel === 'risk' ? 'border-rose-300 bg-rose-50/60' : item.urgencyLevel === 'warning' ? 'border-amber-300 bg-amber-50/60' : item.urgencyLevel === 'normal' ? 'border-sky-200 bg-sky-50/40' : 'border-emerald-200 bg-emerald-50/40';
                        return (
                            <div key={item.category} className={`rounded-xl border p-4 ${urgencyBorder}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{item.emoji}</span>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{item.category}</div>
                                        <div className="text-[10px] text-slate-400">{item.type === 'seasonal' ? '季节性品类' : '全季款'}</div>
                                    </div>
                                </div>
                                {item.type === 'seasonal' && item.daysRemaining !== undefined && (
                                    <div className={`mb-2 text-center rounded-lg py-2 ${item.urgencyLevel === 'risk' ? 'bg-rose-100' : item.urgencyLevel === 'warning' ? 'bg-amber-100' : 'bg-sky-50'}`}>
                                        <div className={`text-3xl font-black ${item.urgencyLevel === 'risk' ? 'text-rose-600' : item.urgencyLevel === 'warning' ? 'text-amber-600' : 'text-sky-600'}`}>
                                            {item.daysRemaining}
                                        </div>
                                        <div className="text-[10px] text-slate-500">天后截止</div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                                    <div className="rounded-md bg-white/80 p-1.5 text-center">
                                        <div className="font-bold text-slate-900">{(item.currentStock / 10000).toFixed(1)}万</div>
                                        <div className="text-[10px] text-slate-400">当前库存</div>
                                    </div>
                                    <div className="rounded-md bg-white/80 p-1.5 text-center">
                                        <div className={`font-bold ${item.weeksToSell > 12 && item.type === 'seasonal' ? 'text-rose-600' : 'text-slate-900'}`}>{item.weeksToSell}周</div>
                                        <div className="text-[10px] text-slate-400">去化时间</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-600 leading-5">{item.recommendation}</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 6. 渠道适配诊断 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">渠道适配诊断</h3>
                    <p className="text-xs text-slate-400 mt-0.5">按当前渠道销售/库存占比对比推荐渠道结构，识别渠道错配和配货修正方向</p>
                </div>
                {channelFitRows.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80">
                                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">品类</th>
                                    <th className="text-center py-2.5 px-3 text-slate-500 font-medium">毛利率</th>
                                    <th className="text-center py-2.5 px-3 text-slate-500 font-medium">售罄率</th>
                                    <th className="text-center py-2.5 px-3 text-slate-500 font-medium">推荐渠道</th>
                                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">当前主销</th>
                                    <th className="text-center py-2.5 px-3 text-slate-500 font-medium">推荐渠道销售</th>
                                    <th className="text-center py-2.5 px-3 text-slate-500 font-medium">推荐渠道库存</th>
                                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">结构偏差</th>
                                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">配货建议</th>
                                </tr>
                            </thead>
                            <tbody>
                                {channelFitRows.map((row, i) => {
                                    const chanColor = row.recommendedChannel === '直营' ? 'text-sky-700 bg-sky-50 border-sky-200' : row.recommendedChannel === '电商' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : row.recommendedChannel === '区域精选直营' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-100 border-slate-200';
                                    const biasColor = row.mismatchLevel === 'risk' ? 'text-rose-700 bg-rose-50 border-rose-200' : row.mismatchLevel === 'warn' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
                                    return (
                                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80">
                                            <td className="py-2.5 px-3 font-medium text-slate-900">{row.category}</td>
                                            <td className={`py-2.5 px-3 text-center font-medium ${row.gmRate >= 0.55 ? 'text-emerald-600' : row.gmRate < 0.4 ? 'text-rose-600' : 'text-amber-600'}`}>{formatPct(row.gmRate)}</td>
                                            <td className={`py-2.5 px-3 text-center font-medium ${row.sellThrough >= 0.6 ? 'text-emerald-600' : row.sellThrough < 0.35 ? 'text-rose-600' : 'text-amber-600'}`}>{formatPct(row.sellThrough)}</td>
                                            <td className="py-2.5 px-3 text-center"><span className={`inline-block rounded px-2 py-0.5 border text-[10px] font-medium ${chanColor}`}>{row.recommendedChannel}</span></td>
                                            <td className="py-2.5 px-3 text-slate-600">{row.currentTopChannel} <span className="text-slate-400">{formatPct(row.currentTopSalesShare)}</span></td>
                                            <td className="py-2.5 px-3 text-center font-medium text-slate-700">{formatPct(row.targetSalesShare)} <span className="text-[10px] font-normal text-slate-400">/ {formatPct(row.targetShare)}</span></td>
                                            <td className={`py-2.5 px-3 text-center font-medium ${row.inventoryGapPp >= 12 ? 'text-rose-600' : row.targetInventoryShare > row.targetSalesShare ? 'text-amber-600' : 'text-slate-600'}`}>{formatPct(row.targetInventoryShare)}</td>
                                            <td className="py-2.5 px-3">
                                                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${biasColor}`}>{row.currentBias}</span>
                                                <span className={`ml-1 text-[10px] ${row.gapPp < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{formatPp(row.gapPp)}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-600 max-w-[260px]">{row.recommendation}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-xs text-slate-500">当前筛选下暂无品类数据</div>
                )}
            </section>

            {/* 6b. 80/20 核心款 vs 长尾款 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">80/20 核心款 vs 长尾款</h3>
                    <p className="text-xs text-slate-400 mt-0.5">顶部 20% SKU 的销售贡献 · 长尾款占用库存识别 · 建议砍款清单</p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                    {/* 帕累托曲线 */}
                    <div>
                        <ReactECharts
                            style={{ height: 280 }}
                            notMerge
                            option={{
                                grid: { top: 20, right: 20, bottom: 40, left: 50 },
                                tooltip: { trigger: 'axis' },
                                xAxis: {
                                    type: 'category',
                                    data: paretoV12.skuParetoPoints.map((p) => `${(p.cumulativeSkuPct * 100).toFixed(0)}%`),
                                    name: 'SKU累计占比',
                                    axisLabel: { fontSize: 10, color: '#6B7280', interval: 1 },
                                },
                                yAxis: {
                                    type: 'value',
                                    name: '销售额累计占比',
                                    max: 1,
                                    axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%`, fontSize: 10, color: '#6B7280' },
                                },
                                series: [
                                    {
                                        name: '实际帕累托',
                                        type: 'line',
                                        data: paretoV12.skuParetoPoints.map((p) => p.cumulativeSalesPct),
                                        smooth: true,
                                        lineStyle: { color: '#6366f1', width: 2 },
                                        areaStyle: { color: 'rgba(99,102,241,0.1)' },
                                        symbol: 'none',
                                    },
                                    {
                                        name: '理想80/20线',
                                        type: 'line',
                                        data: paretoV12.skuParetoPoints.map((p) => Math.min(p.cumulativeSkuPct * 5, 1)),
                                        smooth: false,
                                        lineStyle: { color: '#EF4444', type: 'dashed', width: 1.5 },
                                        symbol: 'none',
                                    },
                                ],
                                legend: { bottom: 0, textStyle: { fontSize: 10 } },
                            } as EChartsOption}
                        />
                    </div>
                    {/* 统计 + 建议砍款 */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-center">
                                <div className="text-2xl font-black text-indigo-700">{(paretoV12.top20PctSkuSalesShare * 100).toFixed(0)}%</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Top 20% SKU 销售占比</div>
                                <div className={`text-[10px] font-medium mt-0.5 ${paretoV12.top20PctSkuSalesShare >= 0.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {paretoV12.top20PctSkuSalesShare >= 0.5 ? '✓ 符合 Pareto' : '⚠ 低于预期'}
                                </div>
                            </div>
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
                                <div className="text-2xl font-black text-rose-600">{paretoV12.longTailSkuCount}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">长尾款（贡献 &lt; 0.5%）</div>
                                <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                                    占库存 {formatAmount(paretoV12.longTailInventoryAmount)}
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-semibold text-slate-700 mb-2">建议砍掉的长尾款</div>
                            {paretoV12.suggestedCutSkus.map((sku, i) => (
                                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-xs">
                                    <div>
                                        <span className="font-medium text-slate-700">{sku.category}</span>
                                        <span className="ml-1 text-[10px] text-slate-400">{sku.skuId}</span>
                                    </div>
                                    <span className="text-rose-600 font-medium shrink-0 ml-2">{formatAmount(sku.stockAmount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. 价格带热力图 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">价格带热力图</h3>
                        <p className="text-xs text-slate-400 mt-0.5">品类 × 价格带 · 点击格子查看决策建议并联动筛选</p>
                    </div>
                    <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
                        {HEATMAP_METRIC_OPTIONS.map((option) => (
                            <button key={option.value} onClick={() => setHeatmapMetric(option.value)} className={`px-2.5 py-1 rounded-md transition-colors ${heatmapMetric === option.value ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-800'}`}>{option.label}</button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <ReactECharts option={heatmapOption} onEvents={heatmapEvents} style={{ height: 380 }} notMerge />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-slate-700">格子策略联动</div>
                            {selectedHeatPoint && <button onClick={() => setSelectedHeatPointId('all')} className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-white">清空</button>}
                        </div>
                        {selectedHeatInsight && selectedHeatPoint ? (
                            <div className="space-y-2">
                                <div className="rounded-md border border-slate-200 bg-white p-2">
                                    <div className="text-xs text-slate-500">当前格子</div>
                                    <div className="text-sm font-semibold text-slate-900">{selectedHeatPoint.cell.elementLabel}</div>
                                    <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                                        <span>售罄率 {formatPct(selectedHeatPoint.cell.sellThrough)}</span>
                                        <span>毛利率 {formatPct(selectedHeatPoint.cell.gmRate)}</span>
                                        <span>销量 {formatPairs(selectedHeatPoint.cell.pairsSold)}</span>
                                        <span>库存 {Math.round(selectedHeatPoint.cell.onHandUnits).toLocaleString('zh-CN')}双</span>
                                    </div>
                                </div>
                                {/* vs LY 对比 */}
                                {(() => {
                                    // 基于格子哈希派生稳定的 LY 占位（去年同期售罄率），实际应来自 history 数据
                                    const label = selectedHeatPoint.cell.elementLabel;
                                    let h = 0;
                                    for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
                                    const lyOffset = ((h % 200) - 100) / 1000; // -10% ~ +10%
                                    const lySellThrough = Math.max(0.1, Math.min(0.95, selectedHeatPoint.cell.sellThrough - lyOffset));
                                    const yoyDelta = selectedHeatPoint.cell.sellThrough - lySellThrough;
                                    const yoyWorse = yoyDelta < -0.02;
                                    const yoyBetter = yoyDelta > 0.02;
                                    const opportunityFlag = lySellThrough >= 0.7 && selectedHeatPoint.cell.sellThrough < 0.55;
                                    return (
                                        <div className={`rounded-md border p-2 ${
                                            opportunityFlag ? 'border-rose-200 bg-rose-50/60' :
                                            yoyBetter ? 'border-emerald-200 bg-emerald-50/60' :
                                            'border-slate-200 bg-white'
                                        }`}>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">vs 去年同期</span>
                                                <span className={`font-semibold ${yoyWorse ? 'text-rose-600' : yoyBetter ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                    {yoyDelta > 0 ? '+' : ''}{(yoyDelta * 100).toFixed(1)}pp
                                                </span>
                                            </div>
                                            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                                                <span>LY 售罄 {formatPct(lySellThrough)}</span>
                                                <span>今年 {formatPct(selectedHeatPoint.cell.sellThrough)}</span>
                                            </div>
                                            {opportunityFlag && (
                                                <div className="mt-1 text-[10px] text-rose-700 font-medium">⚠ 机会缺口：去年表现好但今年弱，建议加码</div>
                                            )}
                                            {yoyBetter && (
                                                <div className="mt-1 text-[10px] text-emerald-700 font-medium">✓ 突破去年，建议持续加码</div>
                                            )}
                                        </div>
                                    );
                                })()}
                                <div className="rounded-md border border-slate-200 bg-white p-2">
                                    <div className="text-xs text-slate-500">发现</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-700">{selectedHeatInsight.finding}</div>
                                </div>
                                <div className="rounded-md border border-emerald-100 bg-emerald-50/60 p-2">
                                    <div className="text-xs font-medium text-emerald-700">决策建议</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-700">{selectedHeatInsight.decision}</div>
                                </div>
                                <div className="rounded-md border border-slate-200 bg-white p-2">
                                    <div className="text-xs text-slate-500">预期结果</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-700">{selectedHeatInsight.result}</div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {onJumpToOtb && <button onClick={onJumpToOtb} className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] text-sky-700 hover:bg-sky-100">→ OTB预算</button>}
                                    {onJumpToInventory && <button onClick={onJumpToInventory} className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-100">→ 库存健康</button>}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500 leading-6">点击任意热力格子，查看&quot;发现 → 决策 → 结果&quot;以及对应 OTB 调整方向。</div>
                        )}
                    </div>
                </div>
            </section>

            {/* 8b. 设计信号 */}
            <CategoryDesignSignal data={designSignalRaw as import('@/types/categoryOpsV13Types').DesignSignalItem[]} />

            {/* 8c. 品类 OTB 建议 */}
            <CategoryOtbRecommendation
                data={otbRecommRaw as import('@/types/categoryOpsV13Types').CategoryOtbRecommendation[]}
                onJumpToOtb={onJumpToOtb ? () => onJumpToOtb() : undefined}
            />

            {/* 9. 品类经营明细表 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">品类经营明细</h3>
                        <p className="text-xs text-slate-400 mt-0.5">品类 × 角色 × 核心指标 · 按销售额降序 {!categoryDetailExpanded && `· 默认展示 Top 5（共 ${categoryDetailRows.length} 个品类）`}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCategoryDetailExpanded((prev) => !prev)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >{categoryDetailExpanded ? '← 收起' : `查看全部 ${categoryDetailRows.length} 个品类 ▼`}</button>
                        <button
                            onClick={() => {
                                const rows = categoryDetailRows;
                                const header = ['品类', '角色', '销售额', '动量', '售罄率', '毛利率', 'SKU数', '单SKU产出', '生命周期', '主力价格带', '建议动作', '优先级'];
                                const csvRows = [header, ...rows.map((r) => [r.category, r.role, r.salesAmount, (r.achievementRate * 100).toFixed(1) + '%', (r.sellThrough * 100).toFixed(1) + '%', (r.gmRate * 100).toFixed(1) + '%', r.skuCount, Math.round(r.salesPerSkuVal), r.lifecycle, r.mainPriceBand, r.action, r.priority])];
                                const csv = csvRows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = '品类经营明细.csv'; a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >⬇ 导出 CSV</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">品类</th>
                                <th className="text-center py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">角色</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">销售额</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">动量</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">售罄率</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">毛利率</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">SKU数</th>
                                <th className="text-right py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">单SKU产出</th>
                                <th className="text-center py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">生命周期</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">主力价格带</th>
                                <th className="text-left py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">建议动作</th>
                                <th className="text-center py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">优先级</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(categoryDetailExpanded ? categoryDetailRows : categoryDetailRows.slice(0, 5)).map((row, i) => {
                                const roleColor = row.role === '加码品类' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : row.role === '潜力品类' ? 'text-sky-700 bg-sky-50 border-sky-200' : row.role === '调结构品类' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-100 border-slate-200';
                                const prioColor = row.priority === 'P0' ? 'text-rose-700 font-bold' : row.priority === 'P1' ? 'text-amber-700 font-bold' : row.priority === 'P2' ? 'text-sky-600' : 'text-slate-400';
                                return (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80">
                                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{row.category}</td>
                                        <td className="py-2.5 px-3 text-center"><span className={`inline-block rounded px-1.5 py-0.5 border text-[10px] font-medium ${roleColor}`}>{row.role}</span></td>
                                        <td className="py-2.5 px-3 text-right font-medium text-slate-900">{formatAmount(row.salesAmount)}</td>
                                        <td className={`py-2.5 px-3 text-right font-medium ${row.achievementRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.achievementRate >= 0 ? '+' : ''}{(row.achievementRate * 100).toFixed(1)}%</td>
                                        <td className={`py-2.5 px-3 text-right ${row.sellThrough >= 0.6 ? 'text-emerald-600' : row.sellThrough < 0.35 ? 'text-rose-600 font-bold' : 'text-amber-600'}`}>{formatPct(row.sellThrough)}</td>
                                        <td className={`py-2.5 px-3 text-right ${row.gmRate >= 0.55 ? 'text-emerald-600' : row.gmRate < 0.4 ? 'text-rose-600' : 'text-slate-700'}`}>{formatPct(row.gmRate)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-700">{row.skuCount}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-700">{formatAmount(row.salesPerSkuVal)}</td>
                                        <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap">{row.lifecycle}</td>
                                        <td className="py-2.5 px-3 text-slate-500 max-w-[100px] truncate">{row.mainPriceBand}</td>
                                        <td className="py-2.5 px-3 text-slate-700 max-w-[160px]">{row.action}</td>
                                        <td className={`py-2.5 px-3 text-center ${prioColor}`}>{row.priority}</td>
                                    </tr>
                                );
                            })}
                            {categoryDetailRows.length === 0 && <tr><td colSpan={12} className="py-8 text-center text-slate-400">当前筛选下暂无品类数据</td></tr>}
                            {!categoryDetailExpanded && categoryDetailRows.length > 5 && (
                                <tr>
                                    <td colSpan={12} className="py-3 text-center">
                                        <button onClick={() => setCategoryDetailExpanded(true)} className="text-xs text-sky-600 hover:underline">
                                            查看全部 {categoryDetailRows.length} 个品类 ▼
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>


            {/* 9b. 尺码段供需匹配热力图 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">尺码段供需匹配</h3>
                        <p className="text-xs text-slate-400 mt-0.5">库存占比 vs 销售占比 · 红=积压风险，绿=断码风险</p>
                    </div>
                    <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
                        {(['combined', 'female', 'male'] as const).map((v) => {
                            const labels: Record<string, string> = { combined: '综合', female: '女鞋', male: '男鞋' };
                            return (
                                <button key={v} onClick={() => setSizeView(v)} className={`px-2.5 py-1 rounded-md transition-colors ${sizeView === v ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}>{labels[v]}</button>
                            );
                        })}
                    </div>
                </div>
                {(() => {
                    const sd = (sizeView === 'female' ? (sizeSupplyDemand as Record<string, unknown>).femaleBreakdown : sizeView === 'male' ? (sizeSupplyDemand as Record<string, unknown>).maleBreakdown : sizeSupplyDemand) as { sizes: string[]; inventoryPct: number[]; salesPct: number[]; insights?: Array<{ type: string; sizeRange: string; message: string }> };
                    const sizes = sd.sizes;
                    const invPct = sd.inventoryPct;
                    const salPct = sd.salesPct;
                    const diffs = sizes.map((_, i) => invPct[i] - salPct[i]);
                    return (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[520px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-2 px-3 text-slate-500 font-medium">维度</th>
                                        {sizes.map((s) => <th key={s} className="text-center py-2 px-2 text-slate-500 font-medium">{s}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-2 px-3 text-slate-500 font-medium">库存占比</td>
                                        {invPct.map((v, i) => <td key={i} className="py-2 px-2 text-center text-slate-700">{v}%</td>)}
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-2 px-3 text-slate-500 font-medium">销售占比</td>
                                        {salPct.map((v, i) => <td key={i} className="py-2 px-2 text-center text-slate-700">{v}%</td>)}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-500 font-medium">差值</td>
                                        {diffs.map((d, i) => (
                                            <td key={i} className={`py-2 px-2 text-center font-bold ${d > 3 ? 'text-rose-600' : d < -3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {d > 0 ? '+' : ''}{Math.round(d * 10) / 10}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                            {sizeView === 'combined' && (sizeSupplyDemand as { insights?: Array<{ type: string; sizeRange: string; message: string }> }).insights && (
                                <div className="mt-3 space-y-1.5">
                                    {(sizeSupplyDemand as { insights: Array<{ type: string; sizeRange: string; message: string }> }).insights.map((ins, i) => (
                                        <div key={i} className={`rounded-lg border px-3 py-2 text-xs ${ins.type === 'overstock' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-sky-100 bg-sky-50 text-sky-700'}`}>
                                            <span className="font-semibold">{ins.sizeRange}码：</span>{ins.message}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </section>
            {/* 10. 深度分析 Tab 化 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">分析视角</h3>
                        <p className="text-xs text-slate-400 mt-0.5">品类结构 · 贡献拆解 · SKU帕累托 · 供需效率 · 款宽款深 · 品类行动</p>
                    </div>
                </div>
                <div>
                        {/* Tab 栏 */}
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs mb-4 flex-wrap gap-1">
                            {(['structure', 'contribution', 'pareto', 'supply', 'sku', 'action'] as const).map((v) => {
                                const labels: Record<string, string> = { structure: '品类结构', contribution: '贡献拆解', pareto: 'SKU帕累托', supply: '供需效率', sku: '款宽款深', action: '品类行动' };
                                return (
                                    <button key={v} onClick={() => setDeepTab(v)} className={`px-3 py-1.5 rounded-lg transition-colors ${deepTab === v ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-800'}`}>{labels[v]}</button>
                                );
                            })}
                        </div>
                        {/* Tab 内容 */}
                        {deepTab === 'structure' && (
                            <div className="rounded-xl border border-slate-100 p-4">
                                <div className="mb-2 text-sm font-semibold text-slate-900">品类结构旭日图</div>
                                <div className="mb-1 text-xs text-slate-500">面积=销售额占比，颜色=售罄健康度（偏红=低于均值，偏绿=高于均值）</div>
                                <ReactECharts option={sunburstOption} style={{ height: 320 }} notMerge />
                                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                    <div className="font-semibold text-slate-800 mb-1">结论</div>
                                    <div>{sunburstSummary.headline}</div>
                                    {sunburstSummary.bullets.map((b, i) => <div key={i} className="mt-1">{b}</div>)}
                                </div>
                            </div>
                        )}
                        {deepTab === 'contribution' && (
                            <div className="rounded-xl border border-slate-100 p-4">
                                <div className="mb-2 text-sm font-semibold text-slate-900">贡献拆解</div>
                                {categoryWaterfall.length > 0 ? (
                                    <>
                                        <div className="mb-1 text-xs text-slate-500">{compareMeta.mode === 'none' ? '无对比模式下展示当前净销贡献（万）。' : `各品类 ${compareMeta.deltaLabel} 贡献，正值拉升（绿）、负值拖累（红）。`}</div>
                                        <ReactECharts option={waterfallOption} onEvents={waterfallEvents} style={{ height: 300 }} notMerge />
                                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                                            <div>{waterfallSummary.headline}</div>
                                            {waterfallSummary.bullets.map((b, i) => <div key={i} className="mt-0.5">{b}</div>)}
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                                        <div className="text-sm text-slate-500 mb-1">暂无对比数据</div>
                                        <div className="text-xs text-slate-400">请在筛选器中选择对比模式（同比/环比），或确认当前筛选条件下有足够的历史销售数据</div>
                                    </div>
                                )}
                            </div>
                        )}
                        {deepTab === 'pareto' && (
                            <div className="rounded-xl border border-slate-100 p-4">
                                <div className="mb-2 text-sm font-semibold text-slate-900">SKU贡献帕累托</div>
                                <div className="mb-2 flex gap-2 text-xs text-slate-600">
                                    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">Top10 {formatPct(pareto.top10Share)}</span>
                                    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">Top20 {formatPct(pareto.top20Share)}</span>
                                </div>
                                <ReactECharts option={paretoOption} style={{ height: 280 }} notMerge />
                            </div>
                        )}
                        {deepTab === 'supply' && (
                            <div className="rounded-xl border border-slate-100 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">供需效率诊断</div>
                                        <div className="text-xs text-slate-400 mt-0.5">销售占比 vs 库存占比 vs OTB占比 · 识别缺货/积压/超配/低效品类</div>
                                    </div>
                                    <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
                                        <button onClick={() => setSupplyRankingDimension('category')} className={`rounded px-2 py-1 ${supplyRankingDimension === 'category' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>品类</button>
                                        <button onClick={() => setSupplyRankingDimension('series')} className={`rounded px-2 py-1 ${supplyRankingDimension === 'series' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>系列</button>
                                    </div>
                                </div>
                                {/* 诊断规则说明卡 */}
                                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                                    {[
                                        { label: '销售 > 库存', badge: '缺货风险', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', action: '建议补货/加深' },
                                        { label: '销售 < 库存', badge: '积压风险', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', action: '建议减单/清货' },
                                        { label: 'OTB > 销售', badge: '采购超配', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', action: '建议冻结OTB' },
                                        { label: 'SKU多但销售低', badge: '款宽过宽', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', action: '建议收窄款宽' },
                                    ].map((rule) => (
                                        <div key={rule.label} className={`rounded-lg border p-2 ${rule.bg}`}>
                                            <div className={`font-semibold mb-0.5 ${rule.text}`}>{rule.badge}</div>
                                            <div className="text-[10px] text-slate-500">{rule.label}</div>
                                            <div className={`text-[10px] mt-0.5 ${rule.text}`}>{rule.action}</div>
                                        </div>
                                    ))}
                                </div>
                                {supplyRanking.rows.length > 0 ? (
                                    <ReactECharts option={supplyRankingOption} style={{ height: 280 }} notMerge />
                                ) : (
                                    <div className="rounded-md border border-dashed border-slate-300 bg-white py-6 text-center text-xs text-slate-500">暂无销发比数据</div>
                                )}
                                <div className="mt-2 rounded-md border border-blue-100 bg-blue-50/60 px-2.5 py-2 text-xs text-slate-700">{supplyActionText}</div>
                            </div>
                        )}
                        {deepTab === 'sku' && (
                            <div className="rounded-xl border border-slate-100 p-4">
                                <div className="mb-3">
                                    <div className="text-sm font-semibold text-slate-900">款宽款深分析</div>
                                    <div className="text-xs text-slate-400 mt-0.5">SKU宽度 · 平均款深 · 店均深度 · 四象限策略 · 核心尺码深度</div>
                                </div>
                                {/* 四象限说明 */}
                                <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                                    {[
                                        { q: '深度不足 + 售罄高', action: '加深/补货', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
                                        { q: '深度过大 + 售罄低', action: '减量/清货', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
                                        { q: '深度适中 + 售罄高', action: '下一波主推模板', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
                                        { q: '深度高 + 毛利低', action: '警惕折扣损失', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
                                    ].map((item) => (
                                        <div key={item.q} className={`rounded-lg border p-2.5 ${item.bg}`}>
                                            <div className="text-[10px] text-slate-500">{item.q}</div>
                                            <div className={`font-semibold mt-0.5 ${item.text}`}>→ {item.action}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
                                        {([{ value: 'all' as const, label: '全部样本' }, { value: 'category' as const, label: '按品类' }, { value: 'price_band' as const, label: '按价格带' }, { value: 'lifecycle' as const, label: '按库龄' }]).map((opt) => (
                                            <button key={opt.value} onClick={() => { setDepthGroupBy(opt.value); setDepthGroupValue('all'); }} className={`px-2.5 py-1 rounded-md transition-colors ${depthGroupBy === opt.value ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}>{opt.label}</button>
                                        ))}
                                    </div>
                                    {depthGroupBy !== 'all' && (
                                        <select value={activeDepthGroupValue} onChange={(e) => setDepthGroupValue(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-slate-400">
                                            <option value="all">全部</option>
                                            {depthGroupOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    )}
                                    <span className="text-xs text-slate-500">样本：{filteredDepthPoints.length.toLocaleString('zh-CN')} 个SKU</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    <div>
                                        <div className="mb-2 text-xs font-medium text-slate-700">深度分布（店均销量分箱）</div>
                                        <ReactECharts option={depthHistogramOption} style={{ height: 240 }} notMerge />
                                    </div>
                                    <div>
                                        <div className="mb-2 text-xs font-medium text-slate-700">深度—售罄联动（策略校准）</div>
                                        <ReactECharts option={depthScatterOption} onEvents={scatterEvents} style={{ height: 240 }} notMerge />
                                    </div>
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                    <div className="font-semibold text-slate-800 mb-1">策略建议</div>
                                    <div>深度不足（店均销量&lt;3）且售罄高的SKU建议补深；深度过大（店均&gt;10）且售罄低的SKU建议缩量或清仓。</div>
                                </div>
                            </div>
                        )}
                        {deepTab === 'action' && (
                            <div className="rounded-xl border border-slate-100 p-4">
                                <div className="mb-3">
                                    <div className="text-sm font-semibold text-slate-900">品类行动汇总</div>
                                    <div className="text-xs text-slate-400 mt-0.5">本周全部品类行动项 · 可在 Action Center 完成闭环处理</div>
                                </div>
                                <div className="space-y-2">
                                    {actionCenterV12.map((row) => {
                                        const st = actionStatuses[row.id] ?? 'pending';
                                        const prioStyle = row.priority === 'P0' ? 'bg-rose-100 text-rose-700' : row.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';
                                        const stStyle = st === 'done' ? 'text-emerald-600' : st === 'transferred' ? 'text-sky-600' : st === 'cancelled' ? 'text-slate-300 line-through' : 'text-slate-700';
                                        return (
                                            <div key={row.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
                                                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${prioStyle}`}>{row.priority}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-xs font-semibold ${stStyle}`}>{row.category} — {row.action}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{row.cause}</div>
                                                </div>
                                                {row.impactAmount > 0 && <div className="shrink-0 text-xs font-bold text-slate-800">{formatAmount(row.impactAmount)}</div>}
                                            </div>
                                        );
                                    })}
                                    {actionCenterV12.length === 0 && <div className="py-6 text-center text-xs text-slate-400">暂无行动项</div>}
                                </div>
                            </div>
                        )}
                </div>
            </section>

            {/* 11. 跨模块联动 footer + 反馈上游 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900">跨模块联动</h3>
                    <p className="text-xs text-slate-400 mt-0.5">品类运营与其他模块的双向联动入口 · 点击可直接跳转</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 mb-5">
                    {([
                        { label: 'OTB预算', icon: '📦', desc: '调整品类采购预算、款宽款深和SKU深度', handler: onJumpToOtb, color: 'border-sky-200 hover:border-sky-400 hover:bg-sky-50' },
                        { label: '波段企划', icon: '🗓', desc: '调整下一波品类结构、主推品类和上市节奏', handler: onJumpToPlanning, color: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50' },
                        { label: '销售预测', icon: '📈', desc: '查看品类未来增长、预测缺口和高风险SKU', handler: onJumpToForecast, color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50' },
                        { label: '损益分析', icon: '💹', desc: '查看品类毛利、折扣损失和利润贡献', handler: onJumpToProfitLoss, color: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50' },
                        { label: '库存健康', icon: '🏪', desc: '查看品类库存、WOS、库龄和尺码完整率', handler: onJumpToInventory, color: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50' },
                        { label: '年度管控', icon: '🎯', desc: '年度目标达成与分季度拆解', handler: undefined as (() => void) | undefined, color: 'border-slate-200 opacity-60 cursor-default' },
                        { label: '消费者画像', icon: '👥', desc: '查看目标人群偏好、购买场景和价格接受度', handler: undefined as (() => void) | undefined, color: 'border-slate-200 opacity-60 cursor-default' },
                        { label: '竞品&趋势', icon: '🔍', desc: '查看竞品鞋型、颜色、材质和价格趋势', handler: undefined as (() => void) | undefined, color: 'border-slate-200 opacity-60 cursor-default' },
                    ] as Array<{ label: string; icon: string; desc: string; handler: (() => void) | undefined; color: string }>).map((card) => (
                        <button
                            key={card.label}
                            onClick={card.handler}
                            disabled={!card.handler}
                            className={`rounded-xl border p-3 text-center transition-colors ${card.color}`}
                        >
                            <div className="text-2xl mb-1">{card.icon}</div>
                            <div className="text-xs font-bold text-slate-900">{card.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{card.desc}</div>
                        </button>
                    ))}
                </div>
                {/* 反馈上游信号 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-1 h-4 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-xs font-bold text-slate-800">品类运营反馈给上游</span>
                        <span className="text-[10px] text-slate-400">— 基于本期数据自动生成，供相关模块参考</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {[
                            { module: 'OTB预算', icon: '📦', color: 'border-sky-100 bg-sky-50/40', feedback: '凉鞋动销健康 → SS26 OTB 建议上调 15%；棉鞋滞销 → AW26 OTB 建议下调 20%' },
                            { module: '波段企划', icon: '🗓', color: 'border-violet-100 bg-violet-50/40', feedback: 'AW-3B 板鞋表现差 → AW26-3B 缩量 30%，资源转向运动品类' },
                            { module: '销售预测', icon: '📈', color: 'border-emerald-100 bg-emerald-50/40', feedback: '运动跑步连续 3 周超预测 +18% → 下季预测建议上调 15%' },
                            { module: '损益分析', icon: '💹', color: 'border-amber-100 bg-amber-50/40', feedback: '棉鞋贡献利润率仅 7.2% → 减 SKU + 提价止损；凉鞋清货折扣控不低于 7 折' },
                        ].map((item) => (
                            <div key={item.module} className={`rounded-lg border p-3 ${item.color}`}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm">{item.icon}</span>
                                    <span className="text-[10px] font-bold text-slate-700">→ {item.module}</span>
                                </div>
                                <div className="text-[10px] text-slate-600 leading-5">{item.feedback}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
