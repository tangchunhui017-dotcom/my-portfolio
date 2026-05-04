'use client';

import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import { useProductAnalysis } from '@/hooks/useProductAnalysis';

type AgeHeatMetric = 'net_sales' | 'sell_through' | 'gm_rate';
type ColorHeatMetric = 'net_sales' | 'sell_through';
type TreemapAreaMetric = 'net_sales' | 'pairs_sold';
type TreemapColorMetric = 'sell_through' | 'gm_rate';
type ColorQuadrantKey = 'highEffHighSt' | 'highEffLowSt' | 'lowEffHighSt' | 'lowEffLowSt';

const AGE_COLORS: Record<string, string> = {
    '18-25': '#38BDF8',
    '26-35': '#2563EB',
    '36-45': '#7C3AED',
    '46+': '#C026D3',
    未知: '#94A3B8',
};

// 色系真实颜色映射
const COLOR_FAMILY_COLORS: Record<string, string> = {
    '黑色': '#1E293B',
    '白色': '#F8FAFC',
    '灰色': '#94A3B8',
    '米色': '#D4C5B9',
    '棕色': '#92400E',
    '卡其': '#A16207',
    '驼色': '#C2A679',
    '红色': '#DC2626',
    '粉色': '#EC4899',
    '橙色': '#F97316',
    '黄色': '#EAB308',
    '绿色': '#16A34A',
    '蓝色': '#2563EB',
    '紫色': '#9333EA',
    '彩色·鲜': '#10B981',
    '彩色·柔': '#F472B6',
    '中性色': '#78716C',
    '金属色': '#A8A29E',
};

const AGE_SCENE_HINTS = [
    '18-23：拉新潮流/社交场景（更吃辨识度与新廓形）',
    '24-33：通勤+周末两用（易搭配、显脚型、舒适）',
    '34-45：品质通勤（材质质感、脚感、耐穿）',
    '46+：舒适功能（足弓、防滑、轻量、易穿脱）',
];

const LINE_SELLING_POINT: Record<string, string> = {
    户外鞋: '抓地与耐磨',
    '休闲/街头': '穿搭辨识度与耐穿',
    '时尚/通勤': '楦型修饰与轻量舒适',
    '正装/通勤': '脚感与通勤耐用',
    靴类: '保暖防滑与版型',
    凉拖鞋: '透气快干与易穿脱',
};

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

function formatPct(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value * 100).toFixed(1)}%`;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function blendColor(from: [number, number, number], to: [number, number, number], ratio: number) {
    const t = clamp(ratio, 0, 1);
    return [
        Math.round(from[0] + (to[0] - from[0]) * t),
        Math.round(from[1] + (to[1] - from[1]) * t),
        Math.round(from[2] + (to[2] - from[2]) * t),
    ] as [number, number, number];
}

function getMetricColor(value: number, min: number, max: number, metric: AgeHeatMetric | ColorHeatMetric | TreemapColorMetric) {
    if (max <= min) return 'rgba(148,163,184,0.35)';
    const ratio = clamp((value - min) / (max - min), 0, 1);

    if (metric === 'sell_through') {
        const rgb = blendColor([239, 68, 68], [16, 185, 129], ratio);
        return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`;
    }
    if (metric === 'gm_rate') {
        const rgb = blendColor([249, 115, 22], [37, 99, 235], ratio);
        return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`;
    }

    const rgb = blendColor([241, 245, 249], [37, 99, 235], ratio);
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`;
}

export default function ProductBasicPanel({
    filters,
    setFilters,
}: {
    filters: DashboardFilters;
    setFilters: (next: DashboardFilters) => void;
}) {
    const {
        totals,
        ageLineCells,
        agePriceCells,
        colorStats,
        colorCategoryCells,
        ageGroups,
        productLines,
        priceBands,
        categories,
        colorFamilies,
        ageGroupTotals,
        skuDrillRows,
    } = useProductAnalysis(filters);

    const [ageHeatMetric, setAgeHeatMetric] = useState<AgeHeatMetric>('net_sales');
    const [colorHeatMetric, setColorHeatMetric] = useState<ColorHeatMetric>('net_sales');
    const [treemapAreaMetric, setTreemapAreaMetric] = useState<TreemapAreaMetric>('net_sales');
    const [treemapColorMetric, setTreemapColorMetric] = useState<TreemapColorMetric>('sell_through');

    const ageStackRows = useMemo(() => {
        return productLines.map((line) => {
            const lineCells = ageLineCells.filter((item) => item.product_line === line);
            const lineSales = lineCells.reduce((sum, item) => sum + item.net_sales, 0);

            const ageValues = ageGroups.map((age) => {
                const hit = lineCells.find((item) => item.age_group === age);
                const share = safeDiv(hit?.net_sales || 0, lineSales) * 100;
                return Number(share.toFixed(2));
            });

            return {
                line,
                ageValues,
                lineSales,
            };
        });
    }, [ageGroups, ageLineCells, productLines]);

    const ageStackOption = useMemo<EChartsOption>(() => {
        const series = ageGroups.map((age, ageIndex) => ({
            name: age,
            type: 'bar' as const,
            stack: 'age',
            data: ageStackRows.map((row) => row.ageValues[ageIndex]),
            itemStyle: {
                color: AGE_COLORS[age] || '#94A3B8',
                borderRadius: ageIndex === ageGroups.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0],
            },
        }));

        return {
            animationDuration: 500,
            legend: {
                top: 0,
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { color: '#64748B', fontSize: 11 },
            },
            grid: { left: 84, right: 18, top: 30, bottom: 26 },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: unknown) => {
                    const rows = (Array.isArray(params) ? params : [params]) as Array<{
                        axisValueLabel?: string;
                        marker?: string;
                        seriesName?: string;
                        value?: number;
                    }>;
                    const title = rows[0]?.axisValueLabel || '';
                    const body = rows.map((item) => `${item.marker || ''}${item.seriesName || ''}：${Number(item.value || 0).toFixed(1)}%`).join('<br/>');
                    return `<div style="font-weight:600;margin-bottom:4px;">${title}</div>${body}`;
                },
            },
            xAxis: {
                type: 'value',
                max: 100,
                axisLabel: {
                    color: '#6B7280',
                    formatter: (value: number) => `${Math.round(value)}%`,
                },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            yAxis: {
                type: 'category',
                data: ageStackRows.map((row) => row.line),
                axisLabel: { color: '#475569', fontSize: 11 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            series,
        };
    }, [ageGroups, ageStackRows]);

    const ageStackEvents = useMemo(
        () => ({
            click: (params: { seriesName?: string }) => {
                const age = params?.seriesName;
                if (!age) return;

                const nextAudience = filters.target_audience === age ? 'all' : age;
                setFilters({
                    ...filters,
                    target_audience: nextAudience,
                });
            },
        }),
        [filters, setFilters],
    );

    const agePriceCellMap = useMemo(() => {
        const map = new Map<string, (typeof agePriceCells)[number]>();
        agePriceCells.forEach((item) => map.set(`${item.age_group}__${item.price_band}`, item));
        return map;
    }, [agePriceCells]);

    const ageHeatData = useMemo(() => {
        const values: number[] = [];
        const points: Array<{
            id: string;
            xIndex: number;
            yIndex: number;
            value: number;
            age: string;
            priceBand: string;
            cell: (typeof agePriceCells)[number] | null;
        }> = [];

        ageGroups.forEach((age, yIndex) => {
            priceBands.forEach((band, xIndex) => {
                const cell = agePriceCellMap.get(`${age}__${band}`) || null;
                const metricValue = cell ? cell[ageHeatMetric] : 0;
                const value = ageHeatMetric === 'net_sales' ? metricValue / 10_000 : metricValue * 100;
                points.push({
                    id: `${age}__${band}`,
                    xIndex,
                    yIndex,
                    value,
                    age,
                    priceBand: band,
                    cell,
                });
                values.push(value);
            });
        });

        return {
            points,
            min: Math.min(...values, 0),
            max: Math.max(...values, 1),
        };
    }, [ageGroups, ageHeatMetric, agePriceCellMap, priceBands]);

    const ageHeatOption = useMemo<EChartsOption>(() => {
        return {
            animationDuration: 500,
            grid: { left: 64, right: 16, top: 16, bottom: 80 },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown> }).data || {};
                    const cell = row.cell as (typeof agePriceCells)[number] | null;
                    if (!cell) return '暂无数据';
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${cell.age_group} / ${cell.price_band}</div>`,
                        `销售额：${formatAmount(cell.net_sales)}`,
                        `售罄率：${formatPct(cell.sell_through)}`,
                        `毛利率：${formatPct(cell.gm_rate)}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: priceBands,
                axisLabel: { color: '#64748B', fontSize: 10 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            yAxis: {
                type: 'category',
                data: ageGroups,
                axisLabel: { color: '#64748B', fontSize: 10 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            visualMap: {
                min: ageHeatData.min,
                max: ageHeatData.max,
                orient: 'horizontal',
                left: 'center',
                bottom: 10,
                text: ['高', '低'],
                textStyle: { color: '#64748B', fontSize: 10 },
                inRange: {
                    color: ageHeatMetric === 'sell_through'
                        ? ['#FEE2E2', '#FCA5A5', '#EF4444', '#DC2626', '#10B981']
                        : ageHeatMetric === 'gm_rate'
                        ? ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#2563EB']
                        : ['#F1F5F9', '#CBD5E1', '#64748B', '#475569', '#1E293B']
                },
                calculable: false,
            },
            series: [
                {
                    type: 'heatmap',
                    data: ageHeatData.points.map((item) => ({
                        id: item.id,
                        value: [item.xIndex, item.yIndex, item.value],
                        age: item.age,
                        priceBand: item.priceBand,
                        cell: item.cell,
                    })),
                    label: {
                        show: true,
                        color: '#0F172A',
                        fontSize: 10,
                        formatter: (params: unknown) => {
                            const data = (params as { data?: Record<string, unknown> }).data || {};
                            const value = Number((data.value as number[])?.[2] || 0);
                            if (ageHeatMetric === 'net_sales') return `${value.toFixed(1)}万`;
                            return `${value.toFixed(1)}%`;
                        },
                    },
                },
            ],
        };
    }, [ageGroups, ageHeatData, ageHeatMetric, priceBands]);

    const ageHeatEvents = useMemo(
        () => ({
            click: (params: { data?: { age?: string; priceBand?: string } }) => {
                const age = params?.data?.age;
                const priceBand = params?.data?.priceBand;
                if (!age || !priceBand) return;

                const isSame = filters.target_audience === age && filters.price_band === priceBand;
                setFilters({
                    ...filters,
                    target_audience: isSame ? 'all' : age,
                    price_band: isSame ? 'all' : priceBand,
                });
            },
        }),
        [filters, setFilters],
    );

    const treemapColorRange = useMemo(() => {
        const values = colorStats
            .map((item) => item[treemapColorMetric])
            .filter((value) => Number.isFinite(value));

        if (!values.length) {
            return { min: 0, max: 1 };
        }

        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const rawSpan = rawMax - rawMin;

        if (rawSpan <= 0) {
            const center = rawMax;
            return {
                min: clamp(center - 0.05, 0, 1),
                max: clamp(center + 0.05, 0, 1),
            };
        }

        if (rawSpan < 0.03) {
            const center = (rawMin + rawMax) / 2;
            return {
                min: clamp(center - 0.04, 0, 1),
                max: clamp(center + 0.04, 0, 1),
            };
        }

        return {
            min: rawMin,
            max: rawMax,
        };
    }, [colorStats, treemapColorMetric]);

    const treemapOption = useMemo<EChartsOption>(() => {
        const data = colorStats.map((item) => {
            // 使用真实色系颜色
            const baseColor = COLOR_FAMILY_COLORS[item.color_family] || '#94A3B8';

            // 根据指标调整透明度（售罄率或毛利率越高，颜色越饱和）
            const metricValue = item[treemapColorMetric];
            const opacity = treemapColorRange.max > treemapColorRange.min
                ? 0.5 + 0.5 * clamp((metricValue - treemapColorRange.min) / (treemapColorRange.max - treemapColorRange.min), 0, 1)
                : 0.85;

            return {
                name: item.color_family,
                value: treemapAreaMetric === 'net_sales' ? item.net_sales : item.pairs_sold,
                sellThrough: item.sell_through,
                gmRate: item.gm_rate,
                netSales: item.net_sales,
                pairsSold: item.pairs_sold,
                skcCnt: item.skc_cnt,
                itemStyle: {
                    color: baseColor,
                    opacity: opacity,
                    borderColor: metricValue >= (treemapColorRange.min + treemapColorRange.max) / 2 ? '#10B981' : '#F59E0B',
                    borderWidth: 2,
                },
            };
        });

        return {
            animationDuration: 500,
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown> }).data || {};
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${row.name || '-'}</div>`,
                        `销量：${Math.round(Number(row.pairsSold || 0)).toLocaleString('zh-CN')}双`,
                        `销售额：${formatAmount(Number(row.netSales || 0))}`,
                        `售罄率：${formatPct(Number(row.sellThrough || 0))}`,
                        `毛利率：${formatPct(Number(row.gmRate || 0))}`,
                        `SKC：${Math.round(Number(row.skcCnt || 0))}`,
                    ].join('<br/>');
                },
            },
            series: [
                {
                    type: 'treemap',
                    roam: false,
                    data,
                    breadcrumb: { show: false },
                    label: {
                        show: true,
                        formatter: (params: { data?: { name?: string } }) => {
                            return params?.data?.name || '';
                        },
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontWeight: 600,
                    },
                    upperLabel: { show: false },
                    itemStyle: {
                        borderColor: '#ffffff',
                        borderWidth: 1,
                    },
                } as any,
            ],
        };
    }, [colorStats, treemapAreaMetric, treemapColorMetric, treemapColorRange]);

    const treemapEvents = useMemo(
        () => ({
            click: (params: { data?: { name?: string } }) => {
                const colorFamily = params?.data?.name;
                if (!colorFamily) return;
                const nextColor = filters.color === colorFamily ? 'all' : colorFamily;
                setFilters({
                    ...filters,
                    color: nextColor,
                });
            },
        }),
        [filters, setFilters],
    );

    const colorCategoryCellMap = useMemo(() => {
        const map = new Map<string, (typeof colorCategoryCells)[number]>();
        colorCategoryCells.forEach((item) => map.set(`${item.color_family}__${item.category}`, item));
        return map;
    }, [colorCategoryCells]);

    const colorHeatData = useMemo(() => {
        const values: number[] = [];
        const points: Array<{
            id: string;
            xIndex: number;
            yIndex: number;
            value: number;
            colorFamily: string;
            category: string;
            cell: (typeof colorCategoryCells)[number] | null;
        }> = [];

        colorFamilies.forEach((colorFamily, yIndex) => {
            categories.forEach((category, xIndex) => {
                const cell = colorCategoryCellMap.get(`${colorFamily}__${category}`) || null;
                const metricValue = cell ? cell[colorHeatMetric] : 0;
                const value = colorHeatMetric === 'net_sales' ? metricValue / 10_000 : metricValue * 100;
                points.push({
                    id: `${colorFamily}__${category}`,
                    xIndex,
                    yIndex,
                    value,
                    colorFamily,
                    category,
                    cell,
                });
                values.push(value);
            });
        });

        return {
            points,
            min: Math.min(...values, 0),
            max: Math.max(...values, 1),
        };
    }, [categories, colorCategoryCellMap, colorFamilies, colorHeatMetric]);

    const colorHeatOption = useMemo<EChartsOption>(() => {
        return {
            animationDuration: 500,
            grid: { left: 84, right: 16, top: 16, bottom: 82 },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown> }).data || {};
                    const cell = row.cell as (typeof colorCategoryCells)[number] | null;
                    if (!cell) return '暂无数据';
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${cell.color_family} / ${cell.category}</div>`,
                        `销售额：${formatAmount(cell.net_sales)}`,
                        `售罄率：${formatPct(cell.sell_through)}`,
                        `毛利率：${formatPct(cell.gm_rate)}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: categories,
                axisLabel: { color: '#64748B', fontSize: 10 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            yAxis: {
                type: 'category',
                data: colorFamilies,
                axisLabel: { color: '#64748B', fontSize: 10 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            visualMap: {
                min: colorHeatData.min,
                max: colorHeatData.max,
                orient: 'horizontal',
                left: 'center',
                bottom: 10,
                text: ['高', '低'],
                textStyle: { color: '#64748B', fontSize: 10 },
                inRange: {
                    color: colorHeatMetric === 'sell_through'
                        ? ['#FEE2E2', '#FCA5A5', '#EF4444', '#DC2626', '#10B981']
                        : ['#F1F5F9', '#CBD5E1', '#64748B', '#475569', '#1E293B']
                },
                calculable: false,
            },
            series: [
                {
                    type: 'heatmap',
                    data: colorHeatData.points.map((item) => ({
                        id: item.id,
                        value: [item.xIndex, item.yIndex, item.value],
                        colorFamily: item.colorFamily,
                        category: item.category,
                        cell: item.cell,
                    })),
                    label: {
                        show: true,
                        color: '#0F172A',
                        fontSize: 10,
                        formatter: (params: unknown) => {
                            const data = (params as { data?: Record<string, unknown> }).data || {};
                            const value = Number((data.value as number[])?.[2] || 0);
                            if (colorHeatMetric === 'net_sales') return `${value.toFixed(1)}万`;
                            return `${value.toFixed(1)}%`;
                        },
                    },
                },
            ],
        };
    }, [categories, colorFamilies, colorHeatData, colorHeatMetric]);

    const colorHeatEvents = useMemo(
        () => ({
            click: (params: { data?: { colorFamily?: string; category?: string } }) => {
                const colorFamily = params?.data?.colorFamily;
                const category = params?.data?.category;
                if (!colorFamily || !category) return;

                const isSame = filters.color === colorFamily && filters.category_id === category;
                setFilters({
                    ...filters,
                    color: isSame ? 'all' : colorFamily,
                    category_id: isSame ? 'all' : category,
                });
            },
        }),
        [filters, setFilters],
    );

    const audienceRanking = useMemo(() => {
        return Object.entries(ageGroupTotals)
            .map(([ageGroup, values]) => {
                const salesShare = safeDiv(values.net_sales, totals.net_sales);
                const pairsShare = safeDiv(values.pairs_sold, totals.pairs_sold);
                return {
                    ageGroup,
                    sales: values.net_sales,
                    pairs: values.pairs_sold,
                    salesShare,
                    pairsShare,
                    asp: safeDiv(values.net_sales, values.pairs_sold),
                };
            })
            .sort((a, b) => b.sales - a.sales);
    }, [ageGroupTotals, totals.net_sales, totals.pairs_sold]);

    const topAudience = audienceRanking[0] || null;

    const topAudiencePriceBand = useMemo(() => {
        if (!topAudience) return null;
        return agePriceCells
            .filter((item) => item.age_group === topAudience.ageGroup)
            .sort((a, b) => b.net_sales - a.net_sales)[0] || null;
    }, [agePriceCells, topAudience]);

    const topAudienceLine = useMemo(() => {
        if (!topAudience) return null;
        return ageLineCells
            .filter((item) => item.age_group === topAudience.ageGroup)
            .sort((a, b) => b.net_sales - a.net_sales)[0] || null;
    }, [ageLineCells, topAudience]);

    const productLineRanking = useMemo(() => {
        const lineSalesMap = ageLineCells.reduce<Record<string, number>>((acc, item) => {
            acc[item.product_line] = (acc[item.product_line] || 0) + item.net_sales;
            return acc;
        }, {});
        return Object.entries(lineSalesMap)
            .map(([line, sales]) => ({ line, sales }))
            .sort((a, b) => b.sales - a.sales);
    }, [ageLineCells]);

    const topProductLine = productLineRanking[0]?.line || '--';
    const secondProductLine = productLineRanking[1]?.line || '--';
    const colorRanking = useMemo(() => [...colorStats].sort((a, b) => b.net_sales - a.net_sales), [colorStats]);

    const colorStrategySummary = useMemo(() => {
        if (!colorRanking.length) {
            return {
                topColor: null as (typeof colorRanking)[number] | null,
                oppColor: null as (typeof colorRanking)[number] | null,
                riskColor: null as (typeof colorRanking)[number] | null,
                sellThroughMedian: 0,
                quadrants: {
                    highEffHighSt: [] as typeof colorRanking,
                    highEffLowSt: [] as typeof colorRanking,
                    lowEffHighSt: [] as typeof colorRanking,
                    lowEffLowSt: [] as typeof colorRanking,
                },
            };
        }

        const topColor = colorRanking[0];
        const totalPairs = colorRanking.reduce((sum, item) => sum + item.pairs_sold, 0);
        const totalSkc = colorRanking.reduce((sum, item) => sum + item.skc_cnt, 0);
        const stSorted = [...colorRanking].map((item) => item.sell_through).sort((a, b) => a - b);
        const middleIndex = Math.floor(stSorted.length / 2);
        const sellThroughMedian =
            stSorted.length % 2 === 0
                ? safeDiv(stSorted[middleIndex - 1] + stSorted[middleIndex], 2)
                : stSorted[middleIndex];

        const enriched = colorRanking.map((item) => {
            const pairsShare = safeDiv(item.pairs_sold, totalPairs);
            const skcShare = safeDiv(item.skc_cnt, totalSkc);
            return {
                ...item,
                pairsShare,
                skcShare,
                structureGap: pairsShare - skcShare,
                riskScore: (1 - item.sell_through) * item.net_sales,
            };
        });

        const oppColor =
            [...enriched]
                .filter((item) => item.sell_through >= sellThroughMedian)
                .sort((a, b) => b.structureGap - a.structureGap)[0] || enriched[0];
        const riskColor = [...enriched].sort((a, b) => b.riskScore - a.riskScore)[0];

        const quadrants = {
            highEffHighSt: enriched
                .filter((item) => item.structureGap >= 0 && item.sell_through >= sellThroughMedian)
                .sort((a, b) => b.structureGap - a.structureGap),
            highEffLowSt: enriched
                .filter((item) => item.structureGap >= 0 && item.sell_through < sellThroughMedian)
                .sort((a, b) => b.structureGap - a.structureGap),
            lowEffHighSt: enriched
                .filter((item) => item.structureGap < 0 && item.sell_through >= sellThroughMedian)
                .sort((a, b) => b.sell_through - a.sell_through),
            lowEffLowSt: enriched
                .filter((item) => item.structureGap < 0 && item.sell_through < sellThroughMedian)
                .sort((a, b) => b.riskScore - a.riskScore),
        };

        return { topColor, oppColor, riskColor, sellThroughMedian, quadrants };
    }, [colorRanking]);

    const personaSnapshotSummary = useMemo(() => {
        const topColor = colorStrategySummary.topColor?.color_family || '--';
        const oppColor = colorStrategySummary.oppColor?.color_family || '--';
        const riskColor = colorStrategySummary.riskColor?.color_family || '--';
        const topAge = topAudience?.ageGroup || '--';

        return `主力客群：${topAge}；主力场景线：${topProductLine}；主色系：${topColor}；机会色：${oppColor}；风险色：${riskColor}。`;
    }, [colorStrategySummary, topAudience, topProductLine]);

    const audienceCoreFinding = useMemo(() => {
        if (!topAudience) return '当前口径下暂无可用客群数据。';
        const topBand = topAudiencePriceBand?.price_band || '--';
        const leadLine = topAudienceLine?.product_line || '--';
        return `主力客群为 ${topAudience.ageGroup}（销售占比 ${formatPct(topAudience.salesShare)}），主要贡献来自 ${leadLine}；该客群对 ${topBand} 价带支撑最明显。`;
    }, [topAudience, topAudienceLine, topAudiencePriceBand]);

    const audienceAction = useMemo(() => {
        if (!topAudience) return '建议先补齐客群画像数据后再进行投放策略细分。';
        const topBand = topAudiencePriceBand?.price_band || '--';
        const leadLine = topAudienceLine?.product_line || '--';
        const sceneHint = AGE_SCENE_HINTS.find((hint) => hint.startsWith(topAudience.ageGroup)) || '请结合终端反馈补充场景画像。';
        return `围绕 ${topAudience.ageGroup} 做场景线配置（${sceneHint}），在 ${leadLine} 保障主色系与核心楦型覆盖，并于 ${topBand} 形成核心款/升级款/形象款价带梯度。`;
    }, [topAudience, topAudienceLine, topAudiencePriceBand]);

    const colorCoreFinding = useMemo(() => {
        if (!colorRanking.length) return '当前口径下暂无色系结构数据。';
        const baseColorSet = new Set(['黑色', '白色', '灰色']);
        const baseSales = colorRanking
            .filter((item) => baseColorSet.has(item.color_family))
            .reduce((sum, item) => sum + item.net_sales, 0);
        const baseShare = safeDiv(baseSales, totals.net_sales);
        return `基础色盘贡献 ${formatPct(baseShare)}，当前色盘结构${baseShare >= 0.7 ? '稳健' : '偏离主盘'}。鞋类黑/白/灰属于场景可穿性与搭配兼容性底盘色，应稳定覆盖通勤与老品基盘款。`;
    }, [colorRanking, totals.net_sales]);

    const colorAction = useMemo(() => {
        if (!colorRanking.length) return '建议先补齐色系销售数据后再做结构动作。';
        const riskColor = colorStrategySummary.riskColor?.color_family || '--';
        return `${riskColor} 列入结构预警：企划侧收缩低动销品类配比，设计侧减少同质化配色，改用材质/细节（如金属件、皮料纹理、拼接）做差异化。`;
    }, [colorRanking, colorStrategySummary.riskColor]);

    const topAudienceSecond = audienceRanking[1] || null;

    const personaCards = useMemo(() => {
        const topColor = colorStrategySummary.topColor;
        const oppColor = colorStrategySummary.oppColor;
        const riskColor = colorStrategySummary.riskColor;

        return {
            audience: {
                top1: topAudience,
                top2: topAudienceSecond,
            },
            color: {
                top: topColor,
            },
            opportunityAndRisk: {
                opportunity: oppColor,
                risk: riskColor,
            },
        };
    }, [colorStrategySummary, topAudience, topAudienceSecond]);

    const colorQuadrantMeta: Array<{
        key: ColorQuadrantKey;
        title: string;
        action: string;
    }> = [
        {
            key: 'highEffHighSt',
            title: '高效率 × 高售罄（老品基盘主色）',
            action: '加深度：核心楦型/核心场景全覆盖，首配优先。',
        },
        {
            key: 'highEffLowSt',
            title: '高效率 × 低售罄（结构偏差）',
            action: '不急扩色：先优化材质观感、卖点表达与终端陈列。',
        },
        {
            key: 'lowEffHighSt',
            title: '低效率 × 高售罄（机会色）',
            action: '小步扩张：增加陈列位或少量扩 SKC，在热销品类先试点。',
        },
        {
            key: 'lowEffLowSt',
            title: '低效率 × 低售罄（风险色）',
            action: '缩 SKU 做点缀：集中节庆/主题节点，不做全季铺开。',
        },
    ];

    const topGlobalPriceBand = useMemo(() => {
        const ranking = [...agePriceCells].sort((a, b) => b.net_sales - a.net_sales);
        return ranking[0]?.price_band || '--';
    }, [agePriceCells]);

    const playbookRows = useMemo(() => {
        const topAge = topAudience?.ageGroup || '--';
        const topColor = colorStrategySummary.topColor?.color_family || '--';
        const oppColor = colorStrategySummary.oppColor?.color_family || '--';
        const riskColor = colorStrategySummary.riskColor?.color_family || '--';
        const linePoint = LINE_SELLING_POINT[topProductLine] || '脚感与穿着场景表达';

        return [
            `目标客群：${topAge}（围绕通勤/周末双场景配置主推款）。`,
            `场景线主推：${topProductLine}（主推） / ${secondProductLine}（次推）。`,
            `价带梯度：${topGlobalPriceBand} 为核心款价带，向上预留形象款价带。`,
            `配色策略：主色=${topColor}；机会色=${oppColor}（试点放量）；风险色=${riskColor}（收缩）。`,
            `设计卖点模板：${linePoint}，同步强调楦型修饰与材质工艺。`,
            '渠道表达要点：门店陈列主推色与电商主图统一，避免线上线下表达割裂。',
        ];
    }, [colorStrategySummary, secondProductLine, topAudience, topGlobalPriceBand, topProductLine]);

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Basic Demographics</div>
                        <h2 className="text-lg font-bold text-slate-900">基础画像：客群 × 场景 × 配色策略（鞋类）</h2>
                        <p className="mt-1 text-xs text-slate-500">全图统一 ECharts；点击图元可联动全局筛选。</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        口径：净销 {formatAmount(totals.net_sales)} ｜ 销量 {Math.round(totals.pairs_sold).toLocaleString('zh-CN')}双
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-400">Persona Snapshot</div>
                <div className="mt-2 text-base font-medium text-slate-800">{personaSnapshotSummary}</div>
                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium text-slate-500">主力年龄段 Top1/Top2</div>
                        <div className="mt-2 text-sm text-slate-700">
                            <div className="font-semibold">
                                Top1：{personaCards.audience.top1?.ageGroup || '--'}（销占 {formatPct(personaCards.audience.top1?.salesShare || 0)}，双占{' '}
                                {formatPct(personaCards.audience.top1?.pairsShare || 0)}，ASP {formatAmount(personaCards.audience.top1?.asp || 0)}）
                            </div>
                            <div className="mt-1">
                                Top2：{personaCards.audience.top2?.ageGroup || '--'}（销占 {formatPct(personaCards.audience.top2?.salesShare || 0)}，双占{' '}
                                {formatPct(personaCards.audience.top2?.pairsShare || 0)}，ASP {formatAmount(personaCards.audience.top2?.asp || 0)}）
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium text-slate-500">主力色系 Top1</div>
                        <div className="mt-2 text-sm text-slate-700">
                            <div className="font-semibold">{personaCards.color.top?.color_family || '--'}</div>
                            <div className="mt-1">
                                销量 {Math.round(personaCards.color.top?.pairs_sold || 0).toLocaleString('zh-CN')} 双 · 售罄{' '}
                                {formatPct(personaCards.color.top?.sell_through || 0)}
                            </div>
                            <div className="mt-1">SKC {personaCards.color.top?.skc_cnt || 0}</div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium text-slate-500">机会色 & 风险色</div>
                        <div className="mt-2 text-sm text-slate-700">
                            <div className="font-semibold">机会色：{personaCards.opportunityAndRisk.opportunity?.color_family || '--'}</div>
                            <div className="mt-1">
                                结构效率领先，售罄 {formatPct(personaCards.opportunityAndRisk.opportunity?.sell_through || 0)}。
                            </div>
                            <div className="mt-2 font-semibold">风险色：{personaCards.opportunityAndRisk.risk?.color_family || '--'}</div>
                            <div className="mt-1">
                                风险得分高，建议优先排查低动销品类配比。
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-lg font-bold text-slate-900">年龄段占比堆叠条（产品线）</div>
                        <div className="text-xs text-slate-400">单位：各产品线内销售占比 %</div>
                        {filters.target_audience !== 'all' && (
                            <button
                                onClick={() => setFilters({ ...filters, target_audience: 'all' })}
                                className="text-xs rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 hover:bg-slate-100"
                            >
                                清除年龄筛选
                            </button>
                        )}
                    </div>
                    <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {AGE_SCENE_HINTS.map((hint) => (
                            <div key={hint}>{hint}</div>
                        ))}
                    </div>
                    <ReactECharts option={ageStackOption} onEvents={ageStackEvents} style={{ height: 300 }} notMerge />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-1">
                    <div className="text-lg font-bold text-slate-900">主力客群结构</div>
                    <div className="mt-4 space-y-3">
                        {audienceRanking.slice(0, 4).map((item) => (
                            <div key={item.ageGroup} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xl font-bold leading-none text-slate-900">{item.ageGroup}</div>
                                        <div className="mt-2 text-sm text-slate-600">
                                            销售占比 {formatPct(item.salesShare)} · 双数占比 {formatPct(item.pairsShare)}
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            ASP {formatAmount(item.asp)} · 销售额 {formatAmount(item.sales)}
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">{formatPct(item.salesShare)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-400">人群结论</div>
                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-pink-500 text-sm font-medium">核心发现</div>
                        <div className="mt-2 text-base leading-7 text-slate-800">{audienceCoreFinding}</div>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                        <div className="text-blue-500 text-sm font-medium">建议动作</div>
                        <div className="mt-2 text-base leading-7 text-slate-800">{audienceAction}</div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">年龄段 × 价格带</div>
                        <div className="text-lg font-bold text-slate-900">偏好热力图（销售 / 售罄 / 毛利）</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
                        {(['net_sales', 'sell_through', 'gm_rate'] as AgeHeatMetric[]).map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setAgeHeatMetric(metric)}
                                className={`text-xs px-2 py-1 rounded ${
                                    ageHeatMetric === metric
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {metric === 'net_sales' ? '销售占比' : metric === 'sell_through' ? '售罄率' : '毛利率'}
                            </button>
                        ))}
                    </div>
                </div>
                <ReactECharts option={ageHeatOption} onEvents={ageHeatEvents} style={{ height: 360 }} notMerge />
                <div className="mt-3 text-sm text-slate-500">
                    点击格子定位“客群 × 价带”策略组合：用于确定核心款价带与形象款上探价带，指导下季 SKU 价带梯度与主推资源分配。
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-lg font-bold text-slate-900">色系 Treemap（面积可切换）</div>
                        <div className="flex flex-wrap gap-1">
                            <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                                {(['net_sales', 'pairs_sold'] as TreemapAreaMetric[]).map((metric) => (
                                    <button
                                        key={metric}
                                        onClick={() => setTreemapAreaMetric(metric)}
                                        className={`text-xs px-2 py-1 rounded ${
                                            treemapAreaMetric === metric
                                                ? 'bg-slate-900 text-white'
                                                : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {metric === 'net_sales' ? '面积=销售额' : '面积=销量'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                                {(['sell_through', 'gm_rate'] as TreemapColorMetric[]).map((metric) => (
                                    <button
                                        key={metric}
                                        onClick={() => setTreemapColorMetric(metric)}
                                        className={`text-xs px-2 py-1 rounded ${
                                            treemapColorMetric === metric
                                                ? 'bg-slate-900 text-white'
                                                : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {metric === 'sell_through' ? '颜色=售罄' : '颜色=毛利'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <ReactECharts option={treemapOption} onEvents={treemapEvents} style={{ height: 320 }} notMerge />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-1">
                    <div className="text-lg font-bold text-slate-900">色系排行榜</div>
                    <div className="mt-4 space-y-3">
                        {colorRanking.slice(0, 6).map((item, index) => (
                            <div key={`${item.color_family}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xl font-bold leading-none text-slate-900">
                                            {index + 1}. {item.color_family}
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600">
                                            销量 {Math.round(item.pairs_sold).toLocaleString('zh-CN')} 双 · SKC {item.skc_cnt}
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            售罄 {formatPct(item.sell_through)} · 毛利 {formatPct(item.gm_rate)}
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold leading-none text-slate-900">{formatAmount(item.net_sales)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Color Strategy</div>
                        <div className="text-lg font-bold text-slate-900">色系策略四象限（结构效率 × 售罄）</div>
                    </div>
                    <div className="text-xs text-slate-500">结构效率差 = 销量占比 - SKC占比；售罄中位数：{formatPct(colorStrategySummary.sellThroughMedian)}</div>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {colorQuadrantMeta.map((item) => {
                        const rows = colorStrategySummary.quadrants[item.key];
                        const preview = rows.slice(0, 3).map((row) => row.color_family).join('、') || '—';
                        return (
                            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-base font-bold text-slate-900">{item.title}</div>
                                <div className="mt-2 text-sm text-slate-600">代表色：{preview}</div>
                                <div className="mt-2 text-sm text-slate-700">{item.action}</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-400">颜色结论</div>
                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-slate-600 text-sm font-medium">核心发现</div>
                        <div className="mt-2 text-base leading-7 text-slate-800">{colorCoreFinding}</div>
                    </div>
                    <div className="rounded-xl border border-pink-200 bg-pink-50/30 p-4">
                        <div className="text-pink-500 text-sm font-medium">建议动作</div>
                        <div className="mt-2 text-base leading-7 text-slate-800">{colorAction}</div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">色系 × 品类</div>
                        <div className="text-lg font-bold text-slate-900">颜色 × 品类适配热力图（用于配色策略校准）</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
                        {(['net_sales', 'sell_through'] as ColorHeatMetric[]).map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setColorHeatMetric(metric)}
                                className={`text-xs px-2 py-1 rounded ${
                                    colorHeatMetric === metric
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {metric === 'net_sales' ? '销售额' : '售罄率'}
                            </button>
                        ))}
                    </div>
                </div>
                <ReactECharts option={colorHeatOption} onEvents={colorHeatEvents} style={{ height: 360 }} notMerge />
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Default Playbook</div>
                        <h3 className="text-lg font-bold text-slate-900">鞋类企划&设计默认配置（基于画像）</h3>
                    </div>
                    <div className="text-xs text-slate-500">用于给下季企划给出默认配置，不替代商品分析与 OTB 预算模块</div>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {playbookRows.map((row) => (
                        <div key={row} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {row}
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">SKU Drilldown</div>
                        <h3 className="text-base font-bold text-slate-900">客群/颜色下钻明细（Top20）</h3>
                    </div>
                    <div className="text-xs text-slate-500">当前筛选口径</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">SKU</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">客群</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">品类/产品线</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">价格带/色系</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">销售额</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">售罄</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">毛利</th>
                            </tr>
                        </thead>
                        <tbody>
                            {skuDrillRows.slice(0, 20).map((row) => (
                                <tr key={row.sku_id} className="border-t border-slate-100">
                                    <td className="px-2 py-2 text-slate-700">
                                        <div className="font-medium">{row.sku_name}</div>
                                        <div className="text-[11px] text-slate-400">{row.sku_id}</div>
                                    </td>
                                    <td className="px-2 py-2 text-slate-600">{row.age_group}</td>
                                    <td className="px-2 py-2 text-slate-600">{row.category} / {row.product_line}</td>
                                    <td className="px-2 py-2 text-slate-600">{row.price_band} / {row.color_family}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{formatAmount(row.net_sales)}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.sell_through)}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.gm_rate)}</td>
                                </tr>
                            ))}
                            {skuDrillRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-2 py-4 text-slate-400">
                                        当前筛选下暂无 SKU 明细。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
