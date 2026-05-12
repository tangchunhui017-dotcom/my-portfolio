'use client';
/**
 * ForecastTrendChart.tsx
 * 销售预测趋势图 — 目标/实际/预测/去年同期/置信区间/事件标注
 */
import { useEffect, useRef, useCallback } from 'react';
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { useForecast } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';

interface Props {
  channel: ForecastChannel;
  scenario: ForecastScenario;
}

const EVENTS = [
  { month: 2, label: '春节大促', color: '#f59e0b' },
  { month: 4, label: '新品上市', color: '#6366f1' },
  { month: 6, label: '618大促', color: '#ef4444' },
  { month: 9, label: '开学季', color: '#10b981' },
  { month: 11, label: '双11', color: '#ef4444' },
  { month: 12, label: '圣诞新年', color: '#f59e0b' },
];

export default function ForecastTrendChart({ channel, scenario }: Props) {
  const result = useForecast(channel, scenario);
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof import('echarts')['init']> | null>(null);

  const buildChart = useCallback(() => {
    if (!result || !chartRef.current) return;
    import('echarts').then(echarts => {
      if (!chartRef.current) return;
      if (!instanceRef.current || instanceRef.current.isDisposed()) {
        instanceRef.current = echarts.init(chartRef.current);
      }
      const chart = instanceRef.current;

      const months = result.monthly.map((_, i) => `${i + 1}月`);
      const forecastData = result.monthly.map(m => m.forecastRevenue ?? m.baseRevenue);
      const baseData = result.monthly.map(m => m.baseRevenue);
      const upperBand = forecastData.map(v => v * 1.12);
      const lowerBand = forecastData.map(v => v * 0.88);
      // 去年同期 (mock: -8%)
      const lyData = forecastData.map(v => v * 0.92);
      // 实际 (mock: first 4 months)
      const actualData = forecastData.map((v, i) => i < 4 ? v * (0.95 + Math.random() * 0.1) : null);

      const markLines = EVENTS.map(e => ({
        xAxis: e.month - 1,
        label: { formatter: e.label, position: 'insideEndTop', fontSize: 9, color: e.color },
        lineStyle: { color: e.color, type: 'dashed', width: 1.5, opacity: 0.7 },
      }));

      chart.setOption({
        animation: true,
        grid: { left: 60, right: 20, top: 40, bottom: 40 },
        tooltip: {
          trigger: 'axis',
          formatter: (params: {seriesName: string; value: number}[]) => {
            return params.map(p => `${p.seriesName}: ${typeof p.value === 'number' ? formatMoneyCny(p.value) : '-'}`).join('<br/>');
          },
        },
        legend: {
          data: ['目标', '去年同期', '实际', '预测', '置信区间'],
          top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 10 },
        },
        xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => v >= 1e6 ? (v / 1e4).toFixed(0) + '万' : v.toString() } },
        series: [
          {
            name: '置信区间', type: 'line', stack: 'confidence', data: lowerBand,
            lineStyle: { width: 0 }, areaStyle: { opacity: 0 }, symbol: 'none',
          },
          {
            name: '置信区间上', type: 'line', stack: 'confidence',
            data: upperBand.map((v, i) => v - lowerBand[i]),
            lineStyle: { width: 0 }, symbol: 'none',
            areaStyle: { color: 'rgba(99,102,241,0.1)' },
            tooltip: { show: false }, legendHoverLink: false, showInLegend: false,
          },
          {
            name: '目标', type: 'line', data: baseData.map(v => v * 1.05),
            lineStyle: { color: '#94a3b8', type: 'dashed', width: 1.5 },
            symbol: 'none', itemStyle: { color: '#94a3b8' },
          },
          {
            name: '去年同期', type: 'line', data: lyData,
            lineStyle: { color: '#cbd5e1', width: 1.5 },
            symbol: 'none', itemStyle: { color: '#cbd5e1' },
          },
          {
            name: '实际', type: 'bar', data: actualData,
            itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] },
            barWidth: '40%',
            markLine: {
              silent: true,
              symbol: ['none', 'none'],
              data: markLines,
            },
          },
          {
            name: '预测', type: 'line', data: forecastData,
            lineStyle: { color: '#6366f1', width: 2.5 },
            itemStyle: { color: '#6366f1' },
            symbol: 'circle', symbolSize: 5,
          },
        ],
      });
    });
  }, [result]);

  useEffect(() => {
    buildChart();
    const ro = new ResizeObserver(() => instanceRef.current?.resize());
    if (chartRef.current) ro.observe(chartRef.current);
    return () => { ro.disconnect(); instanceRef.current?.dispose(); };
  }, [buildChart]);

  return <div ref={chartRef} style={{ width: '100%', height: 280 }} />;
}
