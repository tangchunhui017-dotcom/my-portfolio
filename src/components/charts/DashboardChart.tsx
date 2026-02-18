'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface DashboardChartProps {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge';
    kpis: {
        weeklyData: Record<number, { units: number; sales: number; st: number }>;
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
    } | null;
    heatmapMetric?: 'sku' | 'sales' | 'st';
    onSkuClick?: (sku: { name: string; price: number; sellThrough: number; units: number; lifecycle: '新品' | '常青' | '清仓' }) => void;
}

const PRICE_BAND_NAMES: Record<string, string> = {
    PB1: '¥199-299', PB2: '¥300-399', PB3: '¥400-499',
    PB4: '¥500-599', PB5: '¥600-699', PB6: '¥700+',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardChart({ title, type, kpis, heatmapMetric = 'sku', onSkuClick }: DashboardChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);

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
                const bands = ['PB1', 'PB2', 'PB3', 'PB4', 'PB5', 'PB6'];
                const actualUnits = bands.map(b => kpis.priceBandSales[b]?.units ?? 0);
                const totalUnits = actualUnits.reduce((a, b) => a + b, 0);
                const actualPct = actualUnits.map(u => totalUnits > 0 ? Math.round(u / totalUnits * 100) : 0);
                // 模拟计划结构（理想金字塔）
                const plannedPct = [15, 25, 30, 18, 8, 4];
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
                // 售罄率曲线（当周动销 + 累计售罄 + 目标线）
                const weeks = Object.keys(kpis.weeklyData).map(Number).sort((a, b) => a - b);
                const stData = weeks.map(w => Math.round(kpis.weeklyData[w].st * 100));
                const weekLabels = weeks.map(w => `W${w}`);

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    tooltip: {
                        trigger: 'axis', formatter: (params: any) => {
                            const p = Array.isArray(params) ? params : [params];
                            return p.map((item: any) => `${item.seriesName}: ${item.value}%`).join('<br/>');
                        }
                    },
                    legend: { bottom: 0, data: ['累计售罄率', '目标线', '警戒线'] },
                    xAxis: { type: 'category', data: weekLabels },
                    yAxis: { type: 'value', name: '售罄率 %', max: 100 },
                    series: [
                        {
                            name: '累计售罄率', type: 'line', data: stData, smooth: true,
                            itemStyle: { color: '#10b981' },
                            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.25)' }, { offset: 1, color: 'rgba(16,185,129,0.02)' }]) },
                            markLine: {
                                silent: true,
                                data: [
                                    { yAxis: 80, name: '目标线', lineStyle: { color: '#3b82f6', type: 'dashed' }, label: { formatter: '目标 80%', color: '#3b82f6' } },
                                    { yAxis: 60, name: '警戒线', lineStyle: { color: '#ef4444', type: 'dashed' }, label: { formatter: '警戒 60%', color: '#ef4444' } },
                                ],
                            },
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
                // SKU × 价格带热力图
                const categories = ['运动', '休闲', '户外'];
                const bands = ['¥199-299', '¥300-399', '¥400-499', '¥500-599', '¥600-699', '¥700+'];

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
                    grid: { height: '55%', top: '15%' },
                    xAxis: { type: 'category', data: bands, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
                    yAxis: { type: 'category', data: categories, splitArea: { show: true } },
                    visualMap: {
                        min: 0,
                        max: maxVal || 10,
                        calculable: true,
                        orient: 'horizontal',
                        left: 'center',
                        bottom: '5%',
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
    }, [title, type, kpis, heatmapMetric, onSkuClick]);

    return <div ref={chartRef} className="w-full h-full min-h-[320px]" />;
}
