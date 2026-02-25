'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { THRESHOLDS } from '@/config/thresholds';
import { FOOTWEAR_CATEGORY_CORE_ORDER } from '@/config/categoryMapping';
import { PRICE_BANDS, PRICE_BAND_LABELS } from '@/config/priceBand';

type SellThroughCaliber = 'cohort' | 'active' | 'stage';

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
    onSkuClick?: (sku: { name: string; price: number; sellThrough: number; units: number; lifecycle: '新品' | '常青' | '清仓' }) => void;
}

const PRICE_BAND_KEYS = PRICE_BANDS.map((band) => band.id);
const PRICE_BAND_NAMES: Record<string, string> = PRICE_BANDS.reduce((acc, band) => {
    acc[band.id] = PRICE_BAND_LABELS[band.id];
    return acc;
}, {} as Record<string, string>);
const PRICE_BAND_LABEL_LIST = PRICE_BANDS.map((band) => band.label);

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardChart({ title, type, kpis, heatmapMetric = 'sku', onSkuClick, compareMode = 'category' }: DashboardChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [sellThroughCaliber, setSellThroughCaliber] = useState<SellThroughCaliber>('cohort');

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
                // 售罄率曲线（三种口径：同期群 / 在售 / 分阶段）
                const calibers = [
                    { key: 'cohort', label: '同期群', data: kpis.cohortData },
                    { key: 'active', label: '在售', data: kpis.activeData },
                    { key: 'stage', label: '分阶段', data: kpis.stageData },
                ];

                const currentCaliber = calibers.find(c => c.key === sellThroughCaliber) || calibers[0];
                const data = currentCaliber.data || {};

                const weeks = Object.keys(data).map(Number).sort((a, b) => a - b);
                const stData = weeks.map(w => Math.round(data[w].st * 100));
                const weekLabels = weeks.map(w => `W${w}`);

                // 分段目标线：W1-W8 新品期目标75%，W9-W12 折扣期目标92%
                // 用 markArea 标注两个阶段背景，markLine 画分段目标
                const newProductTarget = 75;  // W1-W8
                const markdownTarget = 92;    // W9-W12
                const w8Idx = weeks.findIndex(w => w >= 8);
                const w9Idx = weeks.findIndex(w => w >= 9);
                const w12Idx = weeks.findIndex(w => w >= 12);

                option = {
                    title: {
                        text: title,
                        subtext: `口径: ${currentCaliber.label} · W1-W8新品期目标${newProductTarget}% · W9-W12折扣期目标${markdownTarget}%`,
                        left: 'center',
                        textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
                        subtextStyle: { fontSize: 10, color: '#64748b' }
                    },
                    tooltip: {
                        trigger: 'axis', formatter: (params: any) => {
                            const p = Array.isArray(params) ? params : [params];
                            const weekIdx = p[0]?.dataIndex;
                            const wk = weeks[weekIdx];
                            const skuCount = weekIdx !== undefined ? data[wk]?.skuCount : 0;
                            const phase = wk <= 8 ? `新品期（目标${newProductTarget}%）` : wk <= 12 ? `折扣期（目标${markdownTarget}%）` : '清仓期';
                            return `<div style="font-weight:bold;margin-bottom:4px">W${wk} · ${phase}</div>` +
                                p.filter((item: any) => item.seriesType !== 'effectScatter').map((item: any) => `${item.seriesName}: ${item.value}%`).join('<br/>') +
                                (skuCount ? `<br/>SKU数: <b>${skuCount}</b>` : '');
                        }
                    },
                    legend: { bottom: 0, data: ['累计售罄率'] },
                    xAxis: { type: 'category', data: weekLabels, name: '周龄（Weeks Since Launch）' },
                    yAxis: { type: 'value', name: '售罄率 %', max: 100 },
                    series: [
                        {
                            name: '累计售罄率', type: 'line', data: stData, smooth: true,
                            z: 3,
                            itemStyle: { color: '#10b981' },
                            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.20)' }, { offset: 1, color: 'rgba(16,185,129,0.02)' }]) },
                            markLine: {
                                silent: true,
                                symbol: 'none',
                                data: ([
                                    // W1-W8 新品期目标（蓝色虚线）
                                    ...(w8Idx >= 0 ? [[
                                        { coord: [0, newProductTarget], name: 'W1-W8目标', lineStyle: { color: '#3b82f6', type: 'dashed', width: 1.5 }, label: { formatter: `新品期目标 ${newProductTarget}%`, color: '#3b82f6', fontSize: 10 } },
                                        { coord: [Math.min(w8Idx, weekLabels.length - 1), newProductTarget] },
                                    ]] : []),
                                    // W9-W12 折扣期目标（橙色虚线）
                                    ...(w9Idx >= 0 ? [[
                                        { coord: [w9Idx, markdownTarget], name: 'W9-W12目标', lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 }, label: { formatter: `折扣期目标 ${markdownTarget}%`, color: '#f59e0b', fontSize: 10 } },
                                        { coord: [Math.min(w12Idx >= 0 ? w12Idx : weekLabels.length - 1, weekLabels.length - 1), markdownTarget] },
                                    ]] : []),
                                ]) as any,
                            },
                            markArea: {
                                silent: true,
                                data: ([
                                    [{ xAxis: weekLabels[0], itemStyle: { color: 'rgba(59,130,246,0.04)' }, label: { show: true, position: 'insideTopLeft', formatter: '新品期', color: '#3b82f6', fontSize: 10 } },
                                    { xAxis: w8Idx >= 0 ? weekLabels[Math.min(w8Idx, weekLabels.length - 1)] : weekLabels[weekLabels.length - 1] }],
                                    ...(w9Idx >= 0 ? [[
                                        { xAxis: weekLabels[w9Idx], itemStyle: { color: 'rgba(245,158,11,0.04)' }, label: { show: true, position: 'insideTopLeft', formatter: '折扣期', color: '#f59e0b', fontSize: 10 } },
                                        { xAxis: w12Idx >= 0 ? weekLabels[Math.min(w12Idx, weekLabels.length - 1)] : weekLabels[weekLabels.length - 1] },
                                    ]] : []),
                                    ...(w12Idx >= 0 && w12Idx < weekLabels.length - 1 ? [[
                                        { xAxis: weekLabels[w12Idx + 1] ?? weekLabels[weekLabels.length - 1], itemStyle: { color: 'rgba(239,68,68,0.04)' }, label: { show: true, position: 'insideTopLeft', formatter: '清仓期', color: '#ef4444', fontSize: 10 } },
                                        { xAxis: weekLabels[weekLabels.length - 1] },
                                    ]] : []),
                                ]) as any,
                            },
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

                const LIFECYCLE_COLORS: Record<string, string> = { '新品': '#3b82f6', '常青': '#10b981', '清仓': '#ef4444' };

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
                                `生命周期: ${d[4]}`;
                        },
                    },
                    legend: { bottom: 0, data: ['新品', '常青', '清仓'] },
                    xAxis: { name: '价格 (元)', min: xMin, max: xMax, splitLine: { lineStyle: { type: 'dashed' } } },
                    yAxis: { name: '售罄率 %', min: 40, max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
                    series: ['新品', '常青', '清仓'].map((lifecycle, idx) => ({
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
                        lifecycle: d[4] as '新品' | '常青' | '清仓',
                    });
                }
            });
        }

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }, [title, type, kpis, heatmapMetric, onSkuClick, sellThroughCaliber]);

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
                        { key: 'active' as const, label: '在售' },
                        { key: 'stage' as const, label: '分阶段' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setSellThroughCaliber(key)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${sellThroughCaliber === key
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
