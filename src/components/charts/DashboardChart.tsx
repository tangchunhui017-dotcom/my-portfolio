'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface DashboardChartProps {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge';
    kpis: {
        weeklyData: Record<number, { units: number; sales: number; st: number }>;
        channelSales: Record<string, number>;
        priceBandSales: Record<string, { units: number; sales: number }>;
        avgSellThrough: number;
        totalNetSales: number;
    } | null;
}

const PRICE_BAND_NAMES: Record<string, string> = {
    PB1: '¥199-299', PB2: '¥300-399', PB3: '¥400-499',
    PB4: '¥500-599', PB5: '¥600-699', PB6: '¥700+',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardChart({ title, type, kpis }: DashboardChartProps) {
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

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
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
                // 模拟各格子的SKU数量（基于实际数据结构）
                const heatData = [
                    [0, 0, 4], [1, 0, 6], [2, 0, 3], [3, 0, 2], [4, 0, 1], [5, 0, 0],
                    [0, 1, 2], [1, 1, 3], [2, 1, 5], [3, 1, 2], [4, 1, 1], [5, 1, 0],
                    [0, 2, 0], [1, 2, 1], [2, 2, 2], [3, 2, 3], [4, 2, 2], [5, 2, 2],
                ];

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    tooltip: { position: 'top', formatter: (p: any) => `${categories[p.data[1]]} × ${bands[p.data[0]]}: ${p.data[2]} 款` },
                    grid: { height: '55%', top: '15%' },
                    xAxis: { type: 'category', data: bands, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
                    yAxis: { type: 'category', data: categories, splitArea: { show: true } },
                    visualMap: {
                        min: 0, max: 6, calculable: true, orient: 'horizontal', left: 'center', bottom: '5%',
                        inRange: { color: ['#f0f9ff', '#3b82f6', '#1d4ed8'] },
                    },
                    series: [{
                        name: 'SKU数', type: 'heatmap', data: heatData,
                        label: { show: true, formatter: (p: any) => p.data[2] > 0 ? p.data[2] : '' },
                        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
                    }],
                };
                break;
            }

            case 'scatter': {
                // 价格 vs 售罄率（四象限）
                const scatterData = [
                    [199, 92, 250, '经典小白鞋', '常青'], [299, 88, 180, '都市休闲板鞋', '常青'],
                    [399, 85, 100, '轻盈跑鞋 Lite', '新品'], [499, 87, 120, '疾风跑鞋 Pro', '新品'],
                    [599, 73, 70, '城市轻户外鞋', '新品'], [699, 65, 45, '越野跑鞋 X1', '新品'],
                    [799, 70, 35, '竞速跑鞋 Elite', '新品'], [899, 66, 30, '防水徒步靴', '新品'],
                    [349, 58, 150, '经典跑鞋 Classic', '清仓'], [259, 53, 120, '复古休闲鞋', '清仓'],
                ];

                const LIFECYCLE_COLORS: Record<string, string> = { '新品': '#3b82f6', '常青': '#10b981', '清仓': '#ef4444' };

                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    tooltip: {
                        formatter: (p: any) => {
                            const d = p.data;
                            return `${d[3]}<br/>价格: ¥${d[0]}<br/>售罄率: ${d[1]}%<br/>生命周期: ${d[4]}`;
                        },
                    },
                    legend: { bottom: 0, data: ['新品', '常青', '清仓'] },
                    xAxis: { name: '价格 (元)', min: 150, max: 950, splitLine: { lineStyle: { type: 'dashed' } } },
                    yAxis: { name: '售罄率 %', min: 40, max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
                    series: ['新品', '常青', '清仓'].map(lifecycle => ({
                        name: lifecycle, type: 'scatter',
                        symbolSize: (d: number[]) => Math.sqrt(d[2]) * 1.5,
                        data: scatterData.filter(d => d[4] === lifecycle),
                        itemStyle: { color: LIFECYCLE_COLORS[lifecycle], opacity: 0.8 },
                    })),
                    // 四象限参考线
                    markLine: {
                        silent: true,
                        data: [
                            [{ coord: [500, 40] }, { coord: [500, 100] }],
                            [{ coord: [150, 75] }, { coord: [950, 75] }],
                        ],
                    },
                };
                break;
            }

            case 'gauge': {
                const stPct = Math.round(kpis.avgSellThrough * 100);
                option = {
                    title: { text: title, left: 'center', textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
                    series: [{
                        type: 'gauge', startAngle: 180, endAngle: 0, min: 0, max: 100, splitNumber: 5,
                        progress: { show: true, width: 20, itemStyle: { color: stPct >= 80 ? '#10b981' : stPct >= 60 ? '#f59e0b' : '#ef4444' } },
                        pointer: { show: false },
                        axisLine: { lineStyle: { width: 20, color: [[1, '#f1f5f9']] } },
                        axisTick: { show: false },
                        splitLine: { distance: -25, length: 14, lineStyle: { width: 2, color: '#cbd5e1' } },
                        axisLabel: { distance: -30, color: '#94a3b8', fontSize: 12 },
                        anchor: { show: false },
                        title: { show: false },
                        detail: {
                            valueAnimation: true, offsetCenter: [0, '-15%'], fontSize: 42, fontWeight: 'bolder',
                            formatter: '{value}%',
                            color: stPct >= 80 ? '#10b981' : stPct >= 60 ? '#f59e0b' : '#ef4444',
                        },
                        data: [{ value: stPct }],
                        markLine: {
                            silent: true,
                            data: [{ yAxis: 80, lineStyle: { color: '#3b82f6', type: 'dashed' } }],
                        },
                    }],
                };
                break;
            }
        }

        chart.setOption(option);
        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
    }, [title, type, kpis]);

    return <div ref={chartRef} className="w-full h-full min-h-[320px]" />;
}
