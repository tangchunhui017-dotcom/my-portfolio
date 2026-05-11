'use client';
/**
 * src/components/forecast/MultiScenarioChart.tsx
 * S6 多情景叠加趋势图 — 季节带 + 大促节点 + 异常红点 + 可钻取
 */
import { useRef, useEffect, useState } from 'react';
import { useForecast } from '@/hooks/useForecast';
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import seasonalRaw from '../../../data/planning/sales_forecast_seasonal_index.json';
import campaignRaw from '../../../data/planning/sales_forecast_campaign_calendar.json';
import { detectSeasonalAnomaly } from '@/utils/salesForecastV8';

type SeasonalData = Record<string, number[]> & { labels: string[] };
type CampaignItem = { waveKey?: string; campaignName?: string; startDate?: string; peakDate?: string; budgetCny?: number; roas?: number };

const seasonal = seasonalRaw as unknown as SeasonalData;
const campaigns = campaignRaw as CampaignItem[];

// 判断月份对应的大促
function getCampaignForMonth(monthIdx: number): string | null {
    const m = monthIdx + 1; // 1-based
    const found = campaigns.find(c => {
        const date = c.peakDate ?? c.startDate;
        if (!date) return false;
        const parts = date.split('-');
        return parseInt(parts[1] ?? '0', 10) === m;
    });
    return found ? (found.campaignName ?? null) : null;
}

type EChartsInstance = { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void; on: (event: string, handler: (params: { dataIndex: number }) => void) => void };
type EChartsLib = { init: (el: HTMLElement, theme?: string) => EChartsInstance };

const CHANNEL_COLOR: Record<ForecastChannel, string> = {
    physical: '#0ea5e9',
    ecommerce: '#8b5cf6',
    new_store: '#10b981',
};

const SCENARIO_STYLE: Record<ForecastScenario, { dash: number[]; opacity: number }> = {
    conservative: { dash: [4, 4], opacity: 0.7 },
    base: { dash: [], opacity: 1 },
    optimistic: { dash: [6, 3], opacity: 0.7 },
};

interface Props {
    channel: ForecastChannel;
    activeScenarios: ForecastScenario[];
    onMonthClick?: (monthIdx: number) => void;
}

export default function MultiScenarioChart({ channel, activeScenarios, onMonthClick }: Props) {
    const chartRef = useRef<HTMLDivElement>(null);
    const conservative = useForecast(channel, 'conservative');
    const base = useForecast(channel, 'base');
    const optimistic = useForecast(channel, 'optimistic');
    const [tooltip, setTooltip] = useState<string | null>(null);

    const color = CHANNEL_COLOR[channel];
    const seaIdx = seasonal[channel] ?? [];

    useEffect(() => {
        if (!chartRef.current) return;
        let chart: EChartsInstance | null = null;
        const init = async () => {
            const echarts = (await import('echarts')) as unknown as EChartsLib;
            if (!chartRef.current || !base) return;
            chart = echarts.init(chartRef.current);

            const months = base.monthly.map(m => m.label);
            const scenarioMap = { conservative, base, optimistic };

            // Anomaly detection
            const anomalyPoints: Array<{ coord: [number, number]; label: string }> = [];
            base.monthly.forEach((m, i) => {
                if (detectSeasonalAnomaly(m.forecastRevenue, m.baseRevenue, seaIdx[i] ?? 1.0)) {
                    anomalyPoints.push({ coord: [i, m.forecastRevenue], label: `${m.label}偏离季节系数` });
                }
            });

            // Campaign markers (ecommerce only)
            const campaignMarkLines = channel === 'ecommerce' ? base.monthly.map((m, i) => {
                const c = getCampaignForMonth(i);
                return c ? { xAxis: i, label: { formatter: () => '⚡' + c, color: '#f59e0b', fontSize: 9 }, lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 } } : null;
            }).filter(Boolean) : [];

            const series: unknown[] = [];

            // Base bar (always show)
            series.push({
                name: '基准年', type: 'bar', data: base.monthly.map(m => m.baseRevenue),
                barMaxWidth: 20, itemStyle: { color: '#e2e8f0' }, z: 1, silent: true,
            });

            // Seasonal band (area)
            const seaHigh = base.monthly.map((m, i) => m.baseRevenue * (seaIdx[i] ?? 1) * 1.05);
            const seaLow = base.monthly.map((m, i) => m.baseRevenue * (seaIdx[i] ?? 1) * 0.95);
            series.push({
                name: '季节区间', type: 'line', data: seaHigh, lineStyle: { opacity: 0 },
                areaStyle: { color: color, opacity: 0.08 }, symbol: 'none', z: 2, silent: true,
            });
            series.push({
                name: '_seaLow', type: 'line', data: seaLow, lineStyle: { opacity: 0 },
                areaStyle: { color: '#fff', opacity: 1 }, symbol: 'none', z: 2, silent: true,
            });

            // Scenario lines
            (['conservative', 'base', 'optimistic'] as ForecastScenario[]).forEach(sc => {
                if (!activeScenarios.includes(sc)) return;
                const r = scenarioMap[sc];
                if (!r) return;
                const style = SCENARIO_STYLE[sc];
                const labels = { conservative: '保守', base: '基准', optimistic: '乐观' };
                series.push({
                    name: labels[sc], type: 'line',
                    data: r.monthly.map(m => m.forecastRevenue),
                    lineStyle: { color, width: sc === 'base' ? 2.5 : 1.5, type: style.dash.length ? 'dashed' : 'solid', opacity: style.opacity },
                    symbol: 'circle', symbolSize: sc === 'base' ? 5 : 3,
                    itemStyle: { color, opacity: style.opacity },
                    z: sc === 'base' ? 5 : 3,
                    markPoint: sc === 'base' && anomalyPoints.length ? {
                        data: anomalyPoints.map(p => ({
                            coord: p.coord, symbol: 'circle', symbolSize: 10,
                            itemStyle: { color: '#ef4444' }, label: { show: false },
                        })),
                    } : undefined,
                    markLine: sc === 'base' && campaignMarkLines.length ? { data: campaignMarkLines, symbol: 'none' } : undefined,
                });
            });

            chart.setOption({
                tooltip: {
                    trigger: 'axis',
                    formatter: (params: Array<{ seriesName: string; value: number; name: string }>) => {
                        const filtered = params.filter(p => !p.seriesName.startsWith('_') && p.seriesName !== '基准年' && p.seriesName !== '季节区间');
                        return filtered.map(p => `${p.seriesName}: ¥${(p.value / 10000).toFixed(0)}万`).join('<br/>');
                    },
                },
                legend: {
                    data: activeScenarios.map(s => ({ conservative: '保守', base: '基准', optimistic: '乐观' }[s])),
                    textStyle: { fontSize: 11 }, right: 12, top: 4,
                },
                grid: { left: 60, right: 16, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series,
            });

            chart.on('click', (params: { dataIndex: number }) => {
                onMonthClick?.(params.dataIndex);
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channel, activeScenarios, base, conservative, optimistic]);

    void tooltip;
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-slate-200 inline-block" /> 基准年</span>
                <span className="flex items-center gap-1"><span className="w-4 h-2 bg-sky-100 inline-block rounded" /> 季节区间</span>
                {channel === 'ecommerce' && <span className="flex items-center gap-1"><span className="text-amber-500">⚡</span> 大促节点</span>}
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 异常预警</span>
                <span className="ml-auto text-slate-400">点击月份可钻取详情</span>
            </div>
            <div ref={chartRef} style={{ height: 240 }} />
        </div>
    );
}
