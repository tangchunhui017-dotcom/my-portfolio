'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { THRESHOLDS } from '@/config/thresholds';
import { FOOTWEAR_CATEGORY_CORE_ORDER } from '@/config/categoryMapping';
import { PRICE_BANDS, PRICE_BAND_LABELS } from '@/config/priceBand';
import { DASHBOARD_LIFECYCLE_OPTIONS, type DashboardLifecycleLabel } from '@/config/dashboardLifecycle';

export type SellThroughCaliber = 'cohort' | 'active' | 'stage';

interface DashboardChartProps {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'bar-compare';
    compareMode?: 'category' | 'channel'; // used when type === 'bar-compare'
    kpis: {
        weeklyData: Record<number, { units: number; sales: number; st: number }>;
        cohortData?: Record<number, { st: number; skuCount: number }>;
        activeData?: Record<number, { st: number; skuCount: number }>;
        stageData?: Record<number, { st: number; skuCount: number }>;
        channelSales: Record<string, number>;
        priceBandSales: Record<string, { units: number; sales: number; grossProfit: number; onHandUnits: number }>;
        heatmapChartData?: {
            skuCounts: [number, number, number][];
            sales: [number, number, number][];
            sellThrough: [number, number, number][];
        };
        avgSellThrough: number;
        totalNetSales: number;
        scatterSkus?: { price: number; sellThrough: number; units: number; name: string; lifecycle: string }[];
        totalSkuCount?: number;
        // plan vs actual
        categoryActual?: Record<string, { actual_sales: number; actual_sell_through: number; actual_margin_rate: number }>;
        channelActual?: Record<string, { actual_sales: number; actual_sell_through: number; actual_margin_rate: number }>;
        planData?: {
            category_plan: { category_id: string; plan_sales_amt: number; plan_sell_through: number; plan_margin_rate: number }[];
            channel_plan: { channel_type: string; plan_sales_amt: number; plan_sell_through: number; plan_margin_rate: number }[];
        };
    } | null;
    heatmapMetric?: 'sku' | 'sales' | 'st';
    onSkuClick?: (sku: { name: string; price: number; sellThrough: number; units: number; lifecycle: DashboardLifecycleLabel }) => void;
    sellThroughCaliber?: SellThroughCaliber;
    onSellThroughCaliberChange?: (caliber: SellThroughCaliber) => void;
}

const PRICE_BAND_KEYS = PRICE_BANDS.map((band) => band.id);
const PRICE_BAND_NAMES: Record<string, string> = PRICE_BANDS.reduce((acc, band) => {
    acc[band.id] = PRICE_BAND_LABELS[band.id];
    return acc;
}, {} as Record<string, string>);
const PRICE_BAND_LABEL_LIST = PRICE_BANDS.map((band) => band.label);

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardChart({ title, type, kpis, heatmapMetric = 'sku', onSkuClick, compareMode = 'category', sellThroughCaliber, onSellThroughCaliberChange }: DashboardChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [internalSellThroughCaliber, setInternalSellThroughCaliber] = useState<SellThroughCaliber>('active');
    const currentSellThroughCaliber = sellThroughCaliber ?? internalSellThroughCaliber;
    const handleSellThroughCaliberChange = (next: SellThroughCaliber) => {
        if (onSellThroughCaliberChange) onSellThroughCaliberChange(next);
        else setInternalSellThroughCaliber(next);
    };

    useEffect(() => {
        if (!chartRef.current) return;
        const chart = echarts.init(chartRef.current);
        let option: echarts.EChartsOption = {};

        if (!kpis) {
            chart.setOption({
                title: { text: title, left: 'center', top: 'center', textStyle: { color: '#94a3b8', fontSize: 14 } },
                graphic: [{ type: 'text', left: 'center', top: '55%', style: { text: '暂无数据', fill: '#94a3b8' } }],
            });
            return () => chart.dispose();
        }

        switch (type) {
            case 'bar': {
                // SKU 价格带分布（计划 vs 实际）
                const bands = PRICE_BAND_KEYS;
                const actualUnits = bands.map(b => kpis.priceBandSales[b]?.units ?? 0);
                const totalUnits = actualUnits.reduce((a, b) => a + b, 0);
                const actualPct = actualUnits.map(u => totalUnits > 0 ? Math.round(u / totalUnits * 100) : 0);
                // 模拟计划结构（理想金字塔）
                const plannedPct = [32, 34, 22, 12];
                // 各价格带的平均毛利率
                const marginRates = bands.map(b => {
                    const d = kpis.priceBandSales[b];
                    return d && d.sales > 0 ? Math.round(d.grossProfit / d.sales * 100) : 0;
                });
                // 各价格带剩余库存
                const onHandArr = bands.map(b => kpis.priceBandSales[b]?.onHandUnits ?? 0);

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' },
                        formatter: (params: any) => {
                            const p = Array.isArray(params) ? params : [params];
                            const idx = p[0]?.dataIndex ?? 0;
                            const bandName = bands.map(b => PRICE_BAND_NAMES[b])[idx];
                            const actual = actualPct[idx];
                            const planned = plannedPct[idx];
                            const gap = actual - planned;
                            const margin = marginRates[idx];
                            const onHand = onHandArr[idx];
                            const gapColor = gap > 0 ? '#10b981' : '#ef4444';
                            return [
                                `<div style="font-weight:bold;margin-bottom:6px">${bandName}</div>`,
                                `<div>实际占比: <b>${actual}%</b> &nbsp; 计划: ${planned}%</div>`,
                                `<div>差异: <b style="color:${gapColor}">${gap > 0 ? '+' : ''}${gap}pp</b></div>`,
                                `<div>平均毛利率: <b>${margin}%</b></div>`,
                                `<div>剩余库存: <b>${onHand} 双</b></div>`,
                            ].join('');
                        },
                    },
                    legend: { bottom: 0, data: ['实际占比%', '计划占比%'] },
                    xAxis: { type: 'category', data: bands.map(b => PRICE_BAND_NAMES[b]), axisLabel: { fontSize: 10 } },
                    yAxis: { type: 'value', name: '占比 %', max: 40 },
                    series: [
                        {
                            name: '实际占比%', type: 'bar', data: actualPct, barMaxWidth: 30,
                            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#93c5fd' }]) },
                            label: { show: true, position: 'top', formatter: '{c}%', fontSize: 10 },
                        },
                        {
                            name: '计划占比%', type: 'bar', data: plannedPct, barMaxWidth: 30,
                            itemStyle: { color: '#e2e8f0' },
                            label: { show: true, position: 'top', formatter: '{c}%', fontSize: 10, color: '#94a3b8' },
                        },
                    ],
                };
                break;
            }

            case 'line': {
                const calibers: Array<{
                    key: SellThroughCaliber;
                    label: string;
                    axisMode: 'relative' | 'calendar';
                    data?: Record<number, { st: number; skuCount: number }>;
                }> = [
                    { key: 'cohort', label: '同期群', axisMode: 'relative', data: kpis.cohortData },
                    { key: 'active', label: '自然波段', axisMode: 'calendar', data: kpis.activeData },
                    { key: 'stage', label: '新品群', axisMode: 'calendar', data: kpis.stageData },
                ];

                const currentCaliber = calibers.find((item) => item.key === currentSellThroughCaliber) || calibers[1];
                const data = currentCaliber.data || {};
                const sourceWeeks = Object.keys(data).map(Number).sort((a, b) => a - b);
                const isCalendarView = currentCaliber.axisMode === 'calendar';
                const weeks = isCalendarView ? Array.from({ length: 12 }, (_, index) => index + 1) : sourceWeeks;
                const stData = weeks.map((week) => {
                    const point = data[week];
                    return point ? Number((point.st * 100).toFixed(1)) : null;
                });
                const weekLabels = weeks.map((week) => `W${week}`);
                const targetPct = Number((THRESHOLDS.sellThrough.target * 100).toFixed(1));

                const quarterBands = [
                    { start: 1, end: 3, label: 'Q1 / 春' },
                    { start: 4, end: 6, label: 'Q2 / 夏' },
                    { start: 7, end: 9, label: 'Q3 / 秋' },
                    { start: 10, end: 12, label: 'Q4 / 冬' },
                ];
                const phaseMeta: Record<number, { short: string; label: string; quarter: string }> = {
                    1: { short: '新', label: '新品期', quarter: 'Q1 / 春' },
                    2: { short: '在', label: '在售期', quarter: 'Q1 / 春' },
                    3: { short: '折', label: '折扣期', quarter: 'Q1 / 春' },
                    4: { short: '新', label: '新品期', quarter: 'Q2 / 夏' },
                    5: { short: '在', label: '在售期', quarter: 'Q2 / 夏' },
                    6: { short: '折', label: '折扣期', quarter: 'Q2 / 夏' },
                    7: { short: '新', label: '新品期', quarter: 'Q3 / 秋' },
                    8: { short: '在', label: '在售期', quarter: 'Q3 / 秋' },
                    9: { short: '折', label: '折扣期', quarter: 'Q3 / 秋' },
                    10: { short: '新', label: '新品期', quarter: 'Q4 / 冬' },
                    11: { short: '在', label: '在售期', quarter: 'Q4 / 冬' },
                    12: { short: '折', label: '折扣期', quarter: 'Q4 / 冬' },
                };

                option = {
                    title: {
                        text: title,
                        subtext: isCalendarView
                            ? `口径: ${currentCaliber.label} · 自然波段 W1-W12（Q1春 / Q2夏 / Q3秋 / Q4冬；每季含 新品 / 在售 / 折扣）`
                            : `口径: ${currentCaliber.label} · 上市后相对波段（W1-W12）`,
                        left: 'center',
                        textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
                        subtextStyle: { fontSize: 10, color: '#64748b' },
                    },
                    tooltip: {
                        trigger: 'axis',
                        formatter: (params: any) => {
                            const points = Array.isArray(params) ? params : [params];
                            const dataIndex = points[0]?.dataIndex ?? 0;
                            const wave = weeks[dataIndex];
                            const skuCount = wave !== undefined ? data[wave]?.skuCount : 0;
                            const meta = phaseMeta[wave] || null;
                            const titleText = isCalendarView
                                ? `W${wave} · ${meta?.quarter || ''} · ${meta?.label || ''}`
                                : `上市后 W${wave}`;
                            return [
                                `<div style="font-weight:bold;margin-bottom:4px">${titleText}</div>`,
                                ...points.filter((item: any) => item.seriesType !== 'effectScatter').map((item: any) => `${item.seriesName}: ${item.value ?? '--'}%`),
                                skuCount ? `SKU数: <b>${skuCount}</b>` : '',
                            ].filter(Boolean).join('<br/>');
                        },
                    },
                    legend: { bottom: 0, data: ['累计售罄率'] },
                    xAxis: {
                        type: 'category',
                        data: weekLabels,
                        name: isCalendarView ? '自然波段 / 月份' : '上市后波段',
                        axisLabel: isCalendarView
                            ? {
                                interval: 0,
                                formatter: (_value: string, index: number) => {
                                    const wave = weeks[index];
                                    const meta = phaseMeta[wave];
                                    return meta ? `{wave|W${wave}}\n{phase|${meta.short}}` : `{wave|W${wave}}`;
                                },
                                rich: {
                                    wave: { fontSize: 11, color: '#475569', lineHeight: 18 },
                                    phase: { fontSize: 10, color: '#94a3b8', lineHeight: 14 },
                                },
                            }
                            : { fontSize: 11, color: '#475569' },
                    },
                    yAxis: { type: 'value', name: '售罄率 %', max: 100 },
                    series: [
                        {
                            name: '累计售罄率',
                            type: 'line',
                            data: stData,
                            smooth: true,
                            connectNulls: false,
                            z: 3,
                            itemStyle: { color: '#10b981' },
                            areaStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: 'rgba(16,185,129,0.20)' },
                                    { offset: 1, color: 'rgba(16,185,129,0.02)' },
                                ]),
                            },
                            markLine: {
                                silent: true,
                                symbol: 'none',
                                lineStyle: { color: '#94a3b8', type: 'dashed', width: 1.5 },
                                data: [{ yAxis: targetPct, name: '总览目标', label: { formatter: `总览目标 ${targetPct}%`, color: '#64748b', fontSize: 10 } }],
                            },
                            markArea: isCalendarView
                                ? {
                                    silent: true,
                                    data: quarterBands.map((band) => ([
                                        {
                                            xAxis: `W${band.start}`,
                                            itemStyle: { color: 'rgba(148,163,184,0.05)' },
                                            label: { show: true, position: 'insideTopLeft', formatter: band.label, color: '#64748b', fontSize: 10 },
                                        },
                                        { xAxis: `W${band.end}` },
                                    ])) as any,
                                }
                                : undefined,
                        },
                    ],
                };
                break;
            }
            case 'bar-compare': {
                // 品类 / 渠道计划 vs 实际 分组柱状图
                const isCategory = compareMode === 'category';
                const planItems = isCategory
                    ? (kpis.planData?.category_plan ?? [])
                    : (kpis.planData?.channel_plan ?? []);
                const actualMap = isCategory ? kpis.categoryActual ?? {} : kpis.channelActual ?? {};
                const labels = planItems.map(p => isCategory ? (p as any).category_id : (p as any).channel_type);

                const planST = planItems.map(p => Math.round(p.plan_sell_through * 100));
                const actualST = labels.map(l => Math.round((actualMap[l]?.actual_sell_through ?? 0) * 100));
                const planSales = planItems.map(p => Math.round(p.plan_sales_amt / 10000));    // 万
                const actualSales = labels.map(l => Math.round((actualMap[l]?.actual_sales ?? 0) / 10000));
                const planMargin = planItems.map(p => Math.round(p.plan_margin_rate * 100));
                const actualMargin = labels.map(l => Math.round((actualMap[l]?.actual_margin_rate ?? 0) * 100));

                option = {
                    title: {
                        text: title,
                        subtext: '计划 vs 实际（售罄率%）',
                        left: 'center',
                        textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
                        subtextStyle: { fontSize: 10, color: '#64748b' },
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' },
                        formatter: (params: any) => {
                            const p = Array.isArray(params) ? params : [params];
                            const idx = p[0]?.dataIndex ?? 0;
                            const label = labels[idx];
                            const achST = actualST[idx];
                            const planSTVal = planST[idx];
                            const gap = achST - planSTVal;
                            const gapColor = gap >= 0 ? '#10b981' : '#ef4444';
                            return [
                                `<div style="font-weight:bold;margin-bottom:6px">${label}</div>`,
                                `<div>售罄率: 实际 <b>${achST}%</b> vs 计划 ${planSTVal}% <b style="color:${gapColor}">${gap >= 0 ? '+' : ''}${gap}pp</b></div>`,
                                `<div>销售额: 实际 <b>¥${actualSales[idx]}万</b> vs 计划 ¥${planSales[idx]}万</div>`,
                                `<div>毛利率: 实际 <b>${actualMargin[idx]}%</b> vs 计划 ${planMargin[idx]}%</div>`,
                            ].join('');
                        },
                    },
                    legend: { bottom: 0, data: ['实际售罄率%', '计划售罄率%'] },
                    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 11 } },
                    yAxis: [
                        { type: 'value', name: '售罄率 %', max: 100, position: 'left' },
                    ],
                    series: [
                        {
                            name: '实际售罄率%', type: 'bar', data: actualST, barMaxWidth: 32,
                            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#93c5fd' }]), borderRadius: [4, 4, 0, 0] },
                            label: { show: true, position: 'top', formatter: '{c}%', fontSize: 10 },
                        },
                        {
                            name: '计划售罄率%', type: 'bar', data: planST, barMaxWidth: 32,
                            itemStyle: { color: '#e2e8f0', borderRadius: [4, 4, 0, 0] },
                            label: { show: true, position: 'top', formatter: '{c}%', fontSize: 10, color: '#94a3b8' },
                        },
                    ],
                };
                break;
            }

            case 'pie': {
                // 渠道占比（甜甜圈）
                const channelData = Object.entries(kpis.channelSales)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, value], i) => ({ name, value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } }));

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
                    legend: { orient: 'vertical', left: 'left', top: 'middle', textStyle: { fontSize: 11 } },
                    series: [{
                        name: '渠道', type: 'pie', radius: ['40%', '65%'],
                        avoidLabelOverlap: true,
                        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
                        label: { show: true, formatter: '{b}\n{d}%', fontSize: 10 },
                        data: channelData,
                        animationType: 'scale', animationEasing: 'elasticOut',
                    }],
                };
                break;
            }

            case 'heatmap': {
                // SKU × 价格带热力图（匹配 useDashboardFilter 的实际数据）
                const categories = FOOTWEAR_CATEGORY_CORE_ORDER;
                const bands = PRICE_BAND_LABEL_LIST;

                const data = kpis.heatmapChartData ? (
                    heatmapMetric === 'sales' ? kpis.heatmapChartData.sales :
                        heatmapMetric === 'st' ? kpis.heatmapChartData.sellThrough :
                            kpis.heatmapChartData.skuCounts
                ) : [];

                const maxVal = data.reduce((m, d) => Math.max(m, d[2]), 0);
                const unit = heatmapMetric === 'sales' ? '万' : heatmapMetric === 'st' ? '%' : '款';
                const label = heatmapMetric === 'sales' ? '销售额' : heatmapMetric === 'st' ? '售罄率' : 'SKU数';

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    tooltip: {
                        position: 'top',
                        formatter: (p: any) => `${categories[p.data[1]]} × ${bands[p.data[0]]}<br/>${label}: ${p.data[2]}${unit}`
                    },
                    grid: { height: '60%', top: '12%' },
                    xAxis: { type: 'category', data: bands, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
                    yAxis: { type: 'category', data: categories, splitArea: { show: true } },
                    visualMap: {
                        min: 0,
                        max: maxVal || 10,
                        calculable: true,
                        orient: 'horizontal',
                        left: 'center',
                        bottom: '3%',
                        inRange: { color: ['#f0f9ff', '#3b82f6', '#1d4ed8'] },
                    },
                    series: [{
                        name: label, type: 'heatmap', data: data,
                        label: { show: true, formatter: (p: any) => p.data[2] > 0 ? p.data[2] + (heatmapMetric === 'st' ? '%' : '') : '' },
                        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
                    }],
                };
                break;
            }

            case 'scatter': {
                // 使用真实数据（方案A：只展示需关注的 SKU）
                const rawScatter = kpis.scatterSkus ?? [];
                const totalCount = kpis.totalSkuCount ?? rawScatter.length;
                const atRiskCount = rawScatter.length;

                // 转换为 ECharts 格式：[price, st%, units, name, lifecycle]
                const scatterData = rawScatter.map(s => [
                    s.price,
                    Math.round(s.sellThrough * 100),
                    s.units,
                    s.name,
                    s.lifecycle,
                ]);

                const LIFECYCLE_COLORS: Record<DashboardLifecycleLabel, string> = { '新品': '#3b82f6', '次新品': '#f59e0b', '老品': '#10b981' };

                // 动态计算坐标轴范围
                const prices = rawScatter.map(s => s.price);
                const xMin = prices.length > 0 ? Math.max(150, Math.min(...prices) - 50) : 150;
                const xMax = prices.length > 0 ? Math.min(1000, Math.max(...prices) + 100) : 1000;

                option = {
                    title: {
                        text: title,
                        subtext: `${atRiskCount} 款需关注 / 共 ${totalCount} 款`,
                        left: 'center',
                        textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
                        subtextStyle: { fontSize: 11, color: '#64748b' },
                    },
                    tooltip: {
                        formatter: (p: any) => {
                            const d = p.data;
                            const stColor = d[1] < 70 ? '#ef4444' : d[1] > 92 ? '#10b981' : '#f59e0b';
                            return `<b>${d[3]}</b><br/>` +
                                `价格: ¥${d[0]}<br/>` +
                                `售罄率: <span style="color:${stColor};font-weight:bold">${d[1]}%</span><br/>` +
                                `销量: ${d[2].toLocaleString()} 双<br/>` +
                                `库龄层级: ${d[4]}`;
                        },
                    },
                    legend: { bottom: 0, data: DASHBOARD_LIFECYCLE_OPTIONS },
                    xAxis: { name: '价格 (元)', min: xMin, max: xMax, splitLine: { lineStyle: { type: 'dashed' } } },
                    yAxis: { name: '售罄率 %', min: 40, max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
                    series: DASHBOARD_LIFECYCLE_OPTIONS.map((lifecycle, idx) => ({
                        name: lifecycle, type: 'scatter',
                        symbolSize: (d: number[]) => Math.sqrt(d[2]) * 0.8 + 6,
                        data: scatterData.filter(d => d[4] === lifecycle),
                        itemStyle: { color: LIFECYCLE_COLORS[lifecycle], opacity: 0.75 },
                        cursor: onSkuClick ? 'pointer' : 'default',
                        ...(idx === 0 ? {
                            markLine: {
                                silent: true,
                                symbol: ['none', 'none'],
                                lineStyle: { type: 'dashed', color: '#94a3b8', width: 1 },
                                label: { show: false },
                                data: [
                                    { xAxis: 500 },
                                    { yAxis: 75 },
                                ],
                            },
                        } : {}),
                    })),
                };
                break;
            }

            case 'gauge': {
                const stPct = Math.round(kpis.avgSellThrough * 100);
                const gap = stPct - 80; // 距目标差距
                const progressColor = stPct >= 80 ? '#10b981' : stPct >= 65 ? '#f59e0b' : '#ef4444';

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    // 目标差距标注
                    graphic: [{
                        type: 'text',
                        left: 'center',
                        top: '68%',
                        style: {
                            text: gap >= 0
                                ? `✅ 超出目标 +${gap}pp`
                                : `目标 80% 差 ${Math.abs(gap)}pp`,
                            fill: gap >= 0 ? '#10b981' : '#f59e0b',
                            fontSize: 12,
                            fontWeight: 'bold',
                        },
                    }],
                    series: [{
                        type: 'gauge',
                        startAngle: 180,
                        endAngle: 0,
                        min: 0,
                        max: 100,
                        splitNumber: 5,
                        // 进度弧（主要显示层）
                        progress: {
                            show: true,
                            width: 18,
                            itemStyle: { color: progressColor },
                        },
                        // 背景轨道：三色区间（红/黄/绿）——宽度要小于 progress
                        axisLine: {
                            lineStyle: {
                                width: 18,
                                color: [
                                    [0.6, '#fecaca'],   // 0-60% 红色警戒
                                    [0.8, '#fde68a'],   // 60-80% 黄色过渡
                                    [1, '#a7f3d0'],   // 80-100% 绿色目标
                                ],
                            },
                        },
                        // 细长指针
                        pointer: {
                            show: true,
                            length: '60%',
                            width: 4,
                            itemStyle: { color: progressColor },
                        },
                        // 目标刻度线（在 80% 处加特殊标记）
                        axisTick: { show: false },
                        splitLine: {
                            show: true,
                            distance: -22,
                            length: 10,
                            lineStyle: { width: 2, color: '#94a3b8' },
                        },
                        axisLabel: {
                            distance: -35,
                            color: '#94a3b8',
                            fontSize: 11,
                            formatter: (val: number) => {
                                if (val === 80) return '{target|80\u76ee标}';
                                return String(val);
                            },
                            rich: {
                                target: { color: '#3b82f6', fontWeight: 'bold', fontSize: 11 },
                            },
                        },
                        anchor: {
                            show: true,
                            size: 12,
                            itemStyle: { color: progressColor, borderColor: '#fff', borderWidth: 2 },
                        },
                        title: { show: false },
                        detail: {
                            valueAnimation: true,
                            offsetCenter: [0, '20%'],
                            fontSize: 40,
                            fontWeight: 'bolder',
                            formatter: '{value}%',
                            color: progressColor,
                        },
                        data: [{ value: stPct }],
                    }],
                };
                break;
            }
        }

        chart.setOption(option);

        // 散点图点击事件：钉取 SKU 详情
        if (type === 'scatter' && onSkuClick) {
            chart.on('click', (params: any) => {
                const d = params.data;
                if (Array.isArray(d) && d.length >= 5) {
                    onSkuClick({
                        price: d[0],
                        sellThrough: d[1],
                        units: d[2],
                        name: d[3],
                        lifecycle: d[4] as DashboardLifecycleLabel,
                    });
                }
            });
        }

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }, [title, type, kpis, heatmapMetric, onSkuClick, compareMode, currentSellThroughCaliber]);

    // 热力图行列合计 + 结构空缺清单
    const heatmapTotals = (() => {
        if (type !== 'heatmap' || !kpis?.heatmapChartData) return null;
        const CATS = FOOTWEAR_CATEGORY_CORE_ORDER;
        const BANDS = PRICE_BAND_LABEL_LIST;
        const raw = heatmapMetric === 'sales' ? kpis.heatmapChartData.sales
            : heatmapMetric === 'st' ? kpis.heatmapChartData.sellThrough
                : kpis.heatmapChartData.skuCounts;

        // 构建 5×6 矩阵
        const matrix: number[][] = CATS.map(() => BANDS.map(() => 0));
        raw.forEach(([xIdx, yIdx, val]) => {
            if (yIdx < CATS.length && xIdx < BANDS.length) matrix[yIdx][xIdx] = val;
        });

        // 行合计（每个品类合计）
        const rowTotals = matrix.map(row => row.reduce((s, v) => s + v, 0));
        // 列合计（每个价格带合计）
        const colTotals = BANDS.map((_, ci) => matrix.reduce((s, row) => s + row[ci], 0));
        // 结构空缺：对于 SKU数指标，找出为 0 的格子
        const gaps = heatmapMetric === 'sku'
            ? CATS.flatMap((cat, yi) => BANDS.filter((_, xi) => matrix[yi][xi] === 0).map(band => `${cat} × ${band}`))
            : [];

        return { matrix, rowTotals, colTotals, gaps, cats: CATS, bands: BANDS };
    })();

    // 散点图四象限统计（在 render 阶段计算，避免 useEffect 内无法访问）
    const scatterQuadrants = (() => {
        if (type !== 'scatter' || !kpis?.scatterSkus) return null;
        const skus = kpis.scatterSkus;
        const PRICE_MID = 500;  // 价格分界线
        const ST_MID = 75;      // 售罄率分界线（%）
        const q = [
            { label: '⭐ 明星区', desc: '高价高售罄', color: '#10b981', skus: skus.filter(s => s.price >= PRICE_MID && s.sellThrough * 100 >= ST_MID) },
            { label: '🔥 走量区', desc: '低价高售罄', color: '#3b82f6', skus: skus.filter(s => s.price < PRICE_MID && s.sellThrough * 100 >= ST_MID) },
            { label: '⚠️ 风险区', desc: '高价低售罄', color: '#ef4444', skus: skus.filter(s => s.price >= PRICE_MID && s.sellThrough * 100 < ST_MID) },
            { label: '📦 滞销区', desc: '低价低售罄', color: '#f59e0b', skus: skus.filter(s => s.price < PRICE_MID && s.sellThrough * 100 < ST_MID) },
        ];
        const totalUnits = skus.reduce((s, r) => s + r.units, 0);
        return q.map(quad => ({
            ...quad,
            count: quad.skus.length,
            unitShare: totalUnits > 0 ? Math.round(quad.skus.reduce((s, r) => s + r.units, 0) / totalUnits * 100) : 0,
        }));
    })();

    return (
        <div className="w-full h-full min-h-[320px] flex flex-col">
            {type === 'pie' && kpis ? (
                // 渠道图：甜甜圈 + 右侧质量榜
                <div className="flex gap-4 h-full min-h-[320px]">
                    <div ref={chartRef} className="flex-1 min-w-0" />
                    <div className="w-52 flex-shrink-0 flex flex-col justify-center py-2 pr-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">渠道贡献排行</div>
                        {Object.entries(kpis.channelSales)
                            .sort((a, b) => b[1] - a[1])
                            .map(([channel, sales], i) => {
                                const total = Object.values(kpis.channelSales).reduce((s, v) => s + v, 0);
                                const pct = total > 0 ? Math.round(sales / total * 100) : 0;
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                                const color = colors[i % colors.length];
                                const salesWan = (sales / 10000).toFixed(0);
                                return (
                                    <div key={channel} className="mb-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-slate-700 font-medium truncate">{channel}</span>
                                            <span className="text-xs text-slate-500 ml-1 flex-shrink-0">¥{salesWan}万</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                                            </div>
                                            <span className="text-xs font-semibold w-8 text-right flex-shrink-0" style={{ color }}>{pct}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            ) : type === 'scatter' && scatterQuadrants ? (
                // 散点图：ECharts + 右侧四象限统计卡
                <div className="flex gap-3 h-full min-h-[320px]">
                    <div ref={chartRef} className="flex-1 min-w-0" />
                    <div className="w-44 flex-shrink-0 flex flex-col justify-center gap-2 py-2 pr-1">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">四象限分布</div>
                        {scatterQuadrants.map((q) => (
                            <div key={q.label} className="rounded-lg border border-slate-100 p-2.5 bg-slate-50">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: q.color }} />
                                    <span className="text-xs font-semibold text-slate-700 truncate">{q.label}</span>
                                </div>
                                <div className="text-xs text-slate-400 mb-1.5">{q.desc}</div>
                                <div className="flex justify-between">
                                    <span className="text-lg font-bold" style={{ color: q.color }}>{q.count}</span>
                                    <span className="text-xs text-slate-400 self-end mb-0.5">款</span>
                                    <span className="text-xs font-medium text-slate-500 self-end mb-0.5">{q.unitShare}% 销量</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div ref={chartRef} className="flex-1" />
            )}
            {type === 'heatmap' && heatmapTotals && (
                <div className="mt-3 px-1 space-y-2">
                    {/* 列合计（价格带合计行） */}
                    <div className="flex items-center gap-1 text-xs">
                        <span className="w-12 text-slate-400 flex-shrink-0 text-right">合计</span>
                        {heatmapTotals.colTotals.map((total, i) => (
                            <div key={i} className="flex-1 text-center font-semibold text-slate-700 bg-slate-100 rounded py-0.5">
                                {total > 0 ? total : '—'}
                            </div>
                        ))}
                        <div className="w-10 text-center font-bold text-slate-800 bg-blue-50 rounded py-0.5">
                            {heatmapTotals.colTotals.reduce((s, v) => s + v, 0)}
                        </div>
                    </div>
                    {/* 结构空缺清单（仅 SKU 数指标时显示） */}
                    {heatmapTotals.gaps.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                            <span className="text-xs text-slate-400 mr-1">结构空缺：</span>
                            {heatmapTotals.gaps.slice(0, 8).map(gap => (
                                <span key={gap} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100">
                                    {gap}
                                </span>
                            ))}
                            {heatmapTotals.gaps.length > 8 && (
                                <span className="text-xs text-slate-400">+{heatmapTotals.gaps.length - 8} 项</span>
                            )}
                        </div>
                    )}
                </div>
            )}
            {type === 'line' && (
                <div className="flex justify-center gap-2 mt-2 pb-2">
                    {[
                        { key: 'cohort' as const, label: '同期群' },
                        { key: 'active' as const, label: '自然波段' },
                        { key: 'stage' as const, label: '新品群' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => handleSellThroughCaliberChange(key)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${currentSellThroughCaliber === key
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}



