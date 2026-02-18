'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface DynamicChartDemoProps {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge';
}

export default function DynamicChartDemo({ title, type }: DynamicChartDemoProps) {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        const chart = echarts.init(chartRef.current);

        // 根据类型生成不同的配置
        let option: echarts.EChartsOption = {};

        switch (type) {
            case 'bar':
                // 动态柱状图 - SKU价格带分布
                option = {
                    title: { text: title, left: 'center' },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' }
                    },
                    xAxis: {
                        type: 'category',
                        data: ['199元', '299元', '399元', '499元', '599元', '699元']
                    },
                    yAxis: { type: 'value', name: 'SKU 数量' },
                    series: [{
                        name: 'SKU数',
                        type: 'bar',
                        data: [12, 28, 35, 18, 8, 4],
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#83bff6' },
                                { offset: 1, color: '#188df0' }
                            ])
                        },
                        animationDelay: (idx: number) => idx * 100
                    }]
                };
                break;

            case 'line':
                // 动态折线图 - 售罄率曲线
                option = {
                    title: { text: title, left: 'center' },
                    tooltip: { trigger: 'axis' },
                    xAxis: {
                        type: 'category',
                        data: ['W1', 'W2', 'W3', 'W4', 'W6', 'W8', 'W10', 'W12']
                    },
                    yAxis: { type: 'value', name: '售罄率 %', max: 100 },
                    series: [{
                        name: '售罄率',
                        type: 'line',
                        data: [15, 28, 42, 58, 72, 81, 86, 89],
                        smooth: true,
                        itemStyle: { color: '#10b981' },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
                            ])
                        },
                        markLine: {
                            data: [{ type: 'average', name: '平均值' }]
                        }
                    }]
                };
                break;

            case 'pie':
                // 动态饼图 - 渠道占比
                option = {
                    title: { text: title, left: 'center' },
                    tooltip: { trigger: 'item' },
                    legend: { orient: 'vertical', left: 'left' },
                    series: [{
                        name: '渠道',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        itemStyle: {
                            borderRadius: 10,
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        label: { show: true, formatter: '{b}: {d}%' },
                        emphasis: {
                            label: { show: true, fontSize: 16, fontWeight: 'bold' }
                        },
                        data: [
                            { value: 60, name: '电商', itemStyle: { color: '#5470c6' } },
                            { value: 25, name: '直营店', itemStyle: { color: '#91cc75' } },
                            { value: 10, name: '加盟店', itemStyle: { color: '#fac858' } },
                            { value: 5, name: 'KA', itemStyle: { color: '#ee6666' } }
                        ],
                        animationType: 'scale',
                        animationEasing: 'elasticOut'
                    }]
                };
                break;

            case 'scatter':
                // 散点图 - SKU 价格 vs 售罄率
                const scatterData = Array.from({ length: 30 }, () => [
                    Math.random() * 500 + 200, // 价格
                    Math.random() * 60 + 40,   // 售罄率
                    Math.random() * 1000 + 500 // 销量（气泡大小）
                ]);

                option = {
                    title: { text: title, left: 'center' },
                    tooltip: {
                        formatter: (params: any) => {
                            const data = params.data;
                            return `价格: ¥${data[0]}<br/>售罄率: ${data[1].toFixed(1)}%<br/>销量: ${data[2].toFixed(0)}`;
                        }
                    },
                    xAxis: { name: '价格 (元)', min: 150, max: 750 },
                    yAxis: { name: '售罄率 (%)', min: 30, max: 100 },
                    series: [{
                        type: 'scatter',
                        symbolSize: (data: number[]) => Math.sqrt(data[2]) / 3,
                        data: scatterData,
                        itemStyle: {
                            color: (params: any) => {
                                const sellThrough = params.data[1];
                                return sellThrough > 80 ? '#10b981' : sellThrough > 60 ? '#f59e0b' : '#ef4444';
                            }
                        }
                    }]
                };
                break;

            case 'heatmap':
                // 热力图 - SKU × 价格带
                const hours = ['核心款', '增长款', '形象款'];
                const days = ['199', '299', '399', '499', '599', '699'];
                const heatmapData = hours.flatMap((hour, i) =>
                    days.map((day, j) => [j, i, Math.floor(Math.random() * 15)])
                );

                option = {
                    title: { text: title, left: 'center' },
                    tooltip: { position: 'top' },
                    grid: { height: '50%', top: '15%' },
                    xAxis: { type: 'category', data: days, splitArea: { show: true } },
                    yAxis: { type: 'category', data: hours, splitArea: { show: true } },
                    visualMap: {
                        min: 0,
                        max: 15,
                        calculable: true,
                        orient: 'horizontal',
                        left: 'center',
                        bottom: '5%',
                        inRange: { color: ['#e0f2fe', '#0ea5e9', '#0369a1'] }
                    },
                    series: [{
                        name: 'SKU数量',
                        type: 'heatmap',
                        data: heatmapData,
                        label: { show: true },
                        emphasis: {
                            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
                        }
                    }]
                };
                break;

            case 'gauge':
                // 仪表盘 - 平均售罄率
                option = {
                    title: { text: title, left: 'center' },
                    series: [{
                        type: 'gauge',
                        startAngle: 180,
                        endAngle: 0,
                        min: 0,
                        max: 100,
                        splitNumber: 10,
                        itemStyle: { color: '#10b981' },
                        progress: { show: true, width: 18 },
                        pointer: { show: false },
                        axisLine: { lineStyle: { width: 18 } },
                        axisTick: { distance: -30, splitNumber: 5, lineStyle: { width: 2, color: '#999' } },
                        splitLine: { distance: -40, length: 14, lineStyle: { width: 3, color: '#999' } },
                        axisLabel: { distance: -20, color: '#999', fontSize: 14 },
                        anchor: { show: false },
                        title: { show: false },
                        detail: {
                            valueAnimation: true,
                            width: '60%',
                            lineHeight: 40,
                            borderRadius: 8,
                            offsetCenter: [0, '-15%'],
                            fontSize: 40,
                            fontWeight: 'bolder',
                            formatter: '{value}%',
                            color: 'inherit'
                        },
                        data: [{ value: 82 }]
                    }]
                };
                break;
        }

        chart.setOption(option);

        // 响应式
        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
        };
    }, [title, type]);

    return <div ref={chartRef} className="w-full h-full min-h-[400px]" />;
}
