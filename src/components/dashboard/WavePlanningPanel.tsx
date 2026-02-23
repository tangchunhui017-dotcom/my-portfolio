'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useWavePlanning } from '@/hooks/useWavePlanning';
import type { CompareMode } from '@/hooks/useDashboardFilter';
import { formatMoneyCny } from '@/config/numberFormat';

interface ChartClickParam {
    data?: { waveId?: string };
    dataIndex?: number;
}

type PlanningView = 'wave' | 'otb';

interface WavePlanningPanelProps {
    defaultView?: PlanningView;
    lockView?: boolean;
    compareMode?: CompareMode;
    onJumpToChannel?: () => void;
    onJumpToOtb?: () => void;
    onJumpToSkuRisk?: () => void;
}

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function formatWan(value: number) {
    return formatMoneyCny(value);
}

function formatPct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

function formatMonthDay(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--/--';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
}

function getStatusColor(status: string) {
    if (status === '偏早') return '#F59E0B';
    if (status === '偏晚') return '#EF4444';
    return '#93C5FD';
}

function getToneClass(value: number, threshold: number) {
    if (value >= threshold) return 'text-emerald-600';
    if (value >= threshold * 0.85) return 'text-amber-600';
    return 'text-rose-600';
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatSignedWan(value: number) {
    return formatMoneyCny(value, { signed: true });
}

function formatSignedPct(value: number) {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${(Math.abs(value) * 100).toFixed(1)}%`;
}

function getCompareModeLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return 'vs计划';
    if (compareMode === 'yoy') return '同比去年';
    if (compareMode === 'mom') return '环比上季';
    return '无对比';
}

function getCompareDeltaLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return '较计划';
    if (compareMode === 'yoy') return '较去年同期';
    if (compareMode === 'mom') return '较上季';
    return '偏离';
}

function InfoTip({ text }: { text: string }) {
    return (
        <span
            title={text}
            aria-label={text}
            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500 cursor-help"
        >
            i
        </span>
    );
}

export default function WavePlanningPanel({
    defaultView = 'wave',
    lockView = false,
    compareMode = 'none',
    onJumpToChannel,
    onJumpToOtb,
    onJumpToSkuRisk,
}: WavePlanningPanelProps) {
    const {
        waveSummaries,
        stackCategories,
        stackRows,
        regionTempRows,
        regionSeriesMap,
        regionOptions,
        defaultRegion,
        dataScopeHint,
    } = useWavePlanning();

    const [selectedWaveId, setSelectedWaveId] = useState<string>(() => waveSummaries[0]?.id || '');
    const [selectedRegion, setSelectedRegion] = useState<string>(() => defaultRegion || regionOptions[0] || '');
    const [planningView, setPlanningView] = useState<PlanningView>(defaultView);
    useEffect(() => {
        setPlanningView(defaultView);
    }, [defaultView]);

    const activeWave = useMemo(() => {
        if (!waveSummaries.length) return null;
        return waveSummaries.find((wave) => wave.id === selectedWaveId) || waveSummaries[0];
    }, [selectedWaveId, waveSummaries]);

    const activeRegion = useMemo(() => {
        if (!regionOptions.length) return '';
        if (regionOptions.includes(selectedRegion)) return selectedRegion;
        return defaultRegion || regionOptions[0];
    }, [defaultRegion, regionOptions, selectedRegion]);

    const activeRegionCells = useMemo(() => {
        if (!activeRegion) return [];
        return regionSeriesMap[activeRegion] || [];
    }, [activeRegion, regionSeriesMap]);

    const activeRegionMeta = useMemo(
        () => regionTempRows.find((row) => row.region === activeRegion) || null,
        [activeRegion, regionTempRows],
    );

    const regionAnomalies = useMemo(
        () => activeRegionCells.filter((item) => item.status !== '匹配').slice(0, 4),
        [activeRegionCells],
    );

    const overallKpis = useMemo(() => {
        const waveCount = waveSummaries.length;
        const totalPlanSku = waveSummaries.reduce((sum, wave) => sum + wave.sku_plan, 0);
        const totalWeight = totalPlanSku || 1;
        const avgNewRatio = waveSummaries.reduce((sum, wave) => sum + wave.new_ratio * wave.sku_plan, 0) / totalWeight;
        const avgOldRatio = waveSummaries.reduce((sum, wave) => sum + wave.old_ratio * wave.sku_plan, 0) / totalWeight;
        return [
            { id: 'waves', label: '波段数', value: `${waveCount}` },
            { id: 'plan-sku', label: '计划SKU', value: `${totalPlanSku}` },
            { id: 'new', label: '新品占比', value: formatPct(avgNewRatio), valueClass: 'text-emerald-600' },
            { id: 'old', label: '旧货占比', value: formatPct(avgOldRatio), valueClass: 'text-amber-600' },
        ];
    }, [waveSummaries]);

    const landingRate = activeWave ? safeDiv(activeWave.sku_actual, activeWave.sku_plan) : 0;
    const sellShipText = activeWave ? (activeWave.sell_ship_ratio === null ? '—' : formatPct(activeWave.sell_ship_ratio)) : '—';
    const topCategory = activeWave ? (Object.entries(activeWave.category_mix).sort((a, b) => b[1] - a[1])[0]?.[0] || '—') : '—';
    const activeStackRow = useMemo(
        () => stackRows.find((row) => row.wave_id === activeWave?.id) || null,
        [activeWave?.id, stackRows],
    );
    const compareModeLabel = useMemo(() => getCompareModeLabel(compareMode), [compareMode]);
    const compareDeltaLabel = useMemo(() => getCompareDeltaLabel(compareMode), [compareMode]);
    const sectionScopeHint = useMemo(() => `口径：${compareModeLabel}`, [compareModeLabel]);

    const waveCompare = useMemo(() => {
        if (!activeWave) {
            return {
                baselineLabel: '基线',
                baselineValue: null as number | null,
                deltaValue: null as number | null,
                deltaRate: null as number | null,
                note: '',
            };
        }

        if (compareMode === 'none') {
            return {
                baselineLabel: '当前值',
                baselineValue: activeWave.actual_sales,
                deltaValue: null as number | null,
                deltaRate: null as number | null,
                note: '无对比模式下展示当前波段实际值。',
            };
        }

        const currentSales = activeWave.actual_sales;
        let baselineLabel = '';
        let baselineValue: number | null = null;
        let note = '';

        if (compareMode === 'plan') {
            baselineLabel = '计划销额';
            baselineValue = activeWave.plan_sales;
        } else if (compareMode === 'mom') {
            baselineLabel = '上季销额';
            const currentIndex = waveSummaries.findIndex((wave) => wave.id === activeWave.id);
            baselineValue = currentIndex > 0 ? waveSummaries[currentIndex - 1]?.actual_sales ?? null : null;
            if (baselineValue === null) {
                note = '当前波段缺上季基线，环比差值显示为 —。';
            }
        } else if (compareMode === 'yoy') {
            baselineLabel = '去年同波段销额';
            const currentYear = Number(activeWave.season.match(/\d{4}/)?.[0] || NaN);
            const lastYearWave = Number.isFinite(currentYear)
                ? waveSummaries.find((wave) => {
                      const waveYear = Number(wave.season.match(/\d{4}/)?.[0] || NaN);
                      return wave.wave === activeWave.wave && waveYear === currentYear - 1;
                  })
                : null;
            baselineValue = lastYearWave?.actual_sales ?? null;
            if (baselineValue === null) {
                note = '当前样本缺去年同波段基线，同比差值显示为 —。';
            }
        }

        if (baselineValue === null || baselineValue <= 0) {
            return {
                baselineLabel,
                baselineValue,
                deltaValue: null as number | null,
                deltaRate: null as number | null,
                note: note || `${baselineLabel}缺失或为 0，差值显示为 —。`,
            };
        }

        const deltaValue = currentSales - baselineValue;
        return {
            baselineLabel,
            baselineValue,
            deltaValue,
            deltaRate: deltaValue / baselineValue,
            note,
        };
    }, [activeWave, compareMode, waveSummaries]);

    const otbSummary = useMemo(() => {
        const totalPlanSales = waveSummaries.reduce((sum, wave) => sum + wave.plan_sales, 0);
        const totalPlanBuyUnits = waveSummaries.reduce((sum, wave) => sum + wave.plan_buy_units, 0);
        const rawBudget = waveSummaries.reduce((sum, wave) => sum + wave.otb_budget, 0);
        const totalBudget = rawBudget > 0 ? rawBudget : Math.round(totalPlanSales * 0.38);
        const currentInventoryAmount = waveSummaries.reduce((sum, wave) => {
            const waveAmount = wave.drill_rows.reduce((inner, row) => {
                const unitCost = row.forecast_units > 0 ? safeDiv(row.forecast_sales, row.forecast_units) : 0;
                return inner + row.inventory_units * unitCost;
            }, 0);
            return sum + waveAmount;
        }, 0);
        const targetEndingInventory = Math.round(totalPlanSales * 0.22);
        const suggestedOtb = Math.max(0, Math.round(totalPlanSales - currentInventoryAmount * 0.55));
        const budgetGap = totalBudget - suggestedOtb;
        const fobCap = totalPlanBuyUnits > 0 ? safeDiv(suggestedOtb, totalPlanBuyUnits) : 0;
        const latestSnapshot = [...waveSummaries]
            .sort((a, b) => Number(new Date(b.launch_date)) - Number(new Date(a.launch_date)))[0]?.launch_date || '';

        return {
            totalPlanSales,
            totalPlanBuyUnits,
            totalBudget,
            currentInventoryAmount,
            targetEndingInventory,
            suggestedOtb,
            budgetGap,
            fobCap,
            latestSnapshot,
        };
    }, [waveSummaries]);
    const budgetGapClass = otbSummary.budgetGap >= 0 ? 'text-emerald-600' : 'text-rose-600';

    const tierRows = useMemo(() => {
        const tiers = [
            { key: 'tier1', name: 'Tier 1 基础走量', ratio: 0.55, note: '稳态补货，维持主销盘与库存安全' },
            { key: 'tier2', name: 'Tier 2 形象款', ratio: 0.3, note: '用于主展陈列与溢价节奏拉升' },
            { key: 'tier3', name: 'Tier 3 测试款', ratio: 0.15, note: '小单快反，避免重复试错' },
        ];
        return tiers.map((tier) => ({
            ...tier,
            budget: Math.round(otbSummary.totalBudget * tier.ratio),
            units: Math.round(otbSummary.totalPlanBuyUnits * tier.ratio),
        }));
    }, [otbSummary.totalBudget, otbSummary.totalPlanBuyUnits]);

    const waveOtbRows = useMemo(() => {
        const totalPlanSales = otbSummary.totalPlanSales || 1;
        return waveSummaries.map((wave) => {
            const weight = safeDiv(wave.plan_sales, totalPlanSales);
            return {
                id: wave.id,
                label: `${wave.season}-${wave.wave}`,
                planSales: wave.plan_sales,
                budget: Math.round(otbSummary.totalBudget * weight),
                weight,
            };
        });
    }, [otbSummary.totalBudget, otbSummary.totalPlanSales, waveSummaries]);

    const timelineOption = useMemo(() => {
        const labels = stackRows.map((row) => `${row.launch_label}\n${row.wave_label}`);
        const regionCellMap = new Map(activeRegionCells.map((item) => [item.wave_id, item]));
        const barData = stackRows.map((row) => {
            const cell = regionCellMap.get(row.wave_id);
            return {
                value: row.launch_window_days,
                waveId: row.wave_id,
                waveLabel: row.wave_label,
                launchLabel: row.launch_label,
                sku: row.total_sku,
                status: cell?.status || '匹配',
                reason: cell?.reason || '当前区域无温度说明',
                action: cell?.action || '保持当前节奏',
                regionTemp: cell?.temp_narrative ?? row.temp_narrative,
            };
        });

        return {
            animationDuration: 500,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    const rows = Array.isArray(params) ? params : [params];
                    const base = rows[0] as {
                        data?: {
                            waveLabel?: string;
                            launchLabel?: string;
                            sku?: number;
                            status?: string;
                            reason?: string;
                            action?: string;
                        };
                    };
                    const windowDays = rows.find((item) => item.seriesName === '上市窗口')?.value;
                    const temp = rows.find((item) => item.seriesName === '温度叙事')?.value;
                    return [
                        `<div style="font-weight:600;margin-bottom:4px;">${base.data?.waveLabel || '--'}</div>`,
                        `上市日：${base.data?.launchLabel || '--'}`,
                        `上市窗口：${windowDays ?? '--'} 天`,
                        `SKU容量：${base.data?.sku || 0}`,
                        `温度叙事：${temp ?? '--'}°C`,
                        `温度状态：${base.data?.status || '匹配'}`,
                        `判断：${base.data?.reason || '--'}`,
                        `建议：${base.data?.action || '--'}`,
                    ].join('<br/>');
                },
            },
            legend: { bottom: 0, textStyle: { color: '#64748B', fontSize: 11 } },
            grid: { left: 46, right: 46, top: 34, bottom: 56 },
            xAxis: {
                type: 'category',
                data: labels,
                axisTick: { alignWithLabel: true },
                axisLabel: { color: '#64748B', fontSize: 11, lineHeight: 14 },
                axisLine: { lineStyle: { color: '#E5E7EB' } },
            },
            yAxis: [
                { type: 'value', name: '上市窗口(天)', nameTextStyle: { color: '#64748B', fontSize: 11 }, axisLabel: { color: '#64748B', fontSize: 11 }, splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } } },
                { type: 'value', name: '温度(°C)', nameTextStyle: { color: '#64748B', fontSize: 11 }, axisLabel: { color: '#64748B', fontSize: 11 }, splitLine: { show: false } },
            ],
            series: [
                {
                    name: '上市窗口',
                    type: 'bar',
                    data: barData,
                    barMaxWidth: 28,
                    itemStyle: { borderRadius: [8, 8, 0, 0], color: (params: { data?: { status?: string } }) => getStatusColor(params.data?.status || '匹配') },
                    label: {
                        show: true,
                        position: 'top',
                        color: '#475569',
                        fontSize: 10,
                        formatter: (params: { data?: { status?: string } }) => (params.data?.status === '匹配' ? '' : params.data?.status || ''),
                    },
                },
                {
                    name: '温度叙事',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 7,
                    data: barData.map((row) => ({ value: row.regionTemp, waveId: row.waveId })),
                    lineStyle: { width: 2.5, color: '#10B981' },
                    itemStyle: { color: '#10B981', borderColor: '#ECFDF5', borderWidth: 2 },
                },
            ],
        } as EChartsOption;
    }, [activeRegionCells, stackRows]);

    const stackOption = useMemo(() => ({
        animationDuration: 500,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: unknown) => {
                const rows = Array.isArray(params) ? (params as Array<{ marker?: string; seriesName?: string; value?: number | string; axisValueLabel?: string }>) : [];
                if (!rows.length) return '';
                const waveLabel = rows[0]?.axisValueLabel || '--';
                const totalSku = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
                const detailLines = rows
                    .map((row) => {
                        const value = Number(row.value || 0);
                        const share = totalSku > 0 ? `${((value / totalSku) * 100).toFixed(1)}%` : '0.0%';
                        return `${row.marker || ''}${row.seriesName || '--'}：${value}（${share}）`;
                    })
                    .join('<br/>');
                return [`<div style="font-weight:600;margin-bottom:4px;">${waveLabel}</div>`, `总SKU：${totalSku}`, detailLines].join('<br/>');
            },
        },
        legend: { top: 0, textStyle: { color: '#64748B', fontSize: 11 } },
        grid: { left: 42, right: 16, top: 34, bottom: 34 },
        xAxis: { type: 'category', data: stackRows.map((row) => row.wave_label), axisTick: { alignWithLabel: true }, axisLabel: { color: '#64748B', fontSize: 11 }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
        yAxis: { type: 'value', name: 'SKU数', nameTextStyle: { color: '#64748B', fontSize: 11 }, axisLabel: { color: '#64748B', fontSize: 11 }, splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } } },
        series: stackCategories.map((category, index) => ({
            name: category,
            type: 'bar' as const,
            stack: 'sku',
            barMaxWidth: 34,
            itemStyle: { color: ['#CBD5E1', '#94A3B8', '#64748B', '#2563EB', '#10B981', '#F59E0B', '#A855F7'][index % 7], borderRadius: [4, 4, 0, 0] },
            data: stackRows.map((row) => ({ value: row.category_values[category] || 0, waveId: row.wave_id, waveLabel: row.wave_label })),
        })),
    }) as EChartsOption, [stackCategories, stackRows]);

    const timelineEvents = useMemo(
        () => ({ click: (params: ChartClickParam) => { const waveId = params.data?.waveId || stackRows[params.dataIndex || 0]?.wave_id; if (waveId) setSelectedWaveId(waveId); } }),
        [stackRows],
    );

    const stackEvents = useMemo(
        () => ({ click: (params: ChartClickParam) => { const waveId = params.data?.waveId || stackRows[params.dataIndex || 0]?.wave_id; if (waveId) setSelectedWaveId(waveId); } }),
        [stackRows],
    );

    if (!activeWave) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">暂无波段企划数据。</div>;
    }

    return (
        <div className="space-y-6">
            {(!lockView || planningView === 'wave') && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">4.6 Wave Strategy</div>
                        <h2 className="text-lg font-bold text-slate-900">波段策略与款式需求企划</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            {dataScopeHint}
                            <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                {sectionScopeHint}
                            </span>
                        </p>
                    </div>
                    {!lockView ? (
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                                onClick={() => setPlanningView('wave')}
                                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${planningView === 'wave' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
                            >
                                波段企划
                            </button>
                            <button
                                onClick={() => setPlanningView('otb')}
                                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${planningView === 'otb' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
                            >
                                OTB 推算
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">模块：波段企划</div>
                    )}
                </div>
                {planningView === 'wave' ? (
                    <>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {waveSummaries.map((wave) => (
                                <button key={wave.id} onClick={() => setSelectedWaveId(wave.id)} className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${wave.id === activeWave.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                    {wave.season}-{wave.wave}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 overflow-x-auto">
                            <div className="relative min-w-max pb-1">
                                <div className="absolute left-1 right-1 top-3.5 h-px bg-slate-200" />
                                <div className="relative flex items-center gap-8 pr-2">
                                    {waveSummaries.map((wave) => (
                                        <button key={`${wave.id}-date`} onClick={() => setSelectedWaveId(wave.id)} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-1 py-1 text-sm transition-colors ${wave.id === activeWave.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                                            <span className={`h-2.5 w-2.5 rounded-full border-2 border-white shadow ${wave.id === activeWave.id ? 'bg-slate-900' : 'bg-slate-300'}`} />
                                            <span className={wave.id === activeWave.id ? 'font-semibold' : ''}>{formatMonthDay(wave.launch_date)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                <div className="text-slate-500">
                                    当前销额：<span className="font-medium text-slate-900">{formatWan(activeWave.actual_sales)}</span>
                                </div>
                                <div className="text-slate-500">
                                    {waveCompare.baselineLabel}：<span className="font-medium text-slate-900">{waveCompare.baselineValue === null ? '—' : formatWan(waveCompare.baselineValue)}</span>
                                </div>
                                <div className={`font-medium ${waveCompare.deltaValue === null ? 'text-slate-400' : waveCompare.deltaValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {compareDeltaLabel}：
                                    {waveCompare.deltaValue === null
                                        ? '—'
                                        : `${formatSignedWan(waveCompare.deltaValue)}（${formatSignedPct(waveCompare.deltaRate || 0)}）`}
                                </div>
                            </div>
                            {waveCompare.note && <div className="mt-1 text-[11px] text-slate-500">{waveCompare.note}</div>}
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                <div className="flex items-center text-xs text-slate-500">
                                    波段SKU容量
                                    <InfoTip text="计划SKU=波段企划计划款数；实际落地=当前已落地款数；落地率=实际落地/计划SKU。" />
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5"><div className="text-[11px] text-slate-500">计划SKU</div><div className="text-sm font-semibold text-slate-900">{activeWave.sku_plan}</div></div>
                                    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5"><div className="text-[11px] text-slate-500">实际落地</div><div className="text-sm font-semibold text-slate-900">{activeWave.sku_actual}</div></div>
                                </div>
                                <div className={`mt-2 text-xl font-semibold ${getToneClass(landingRate, 0.95)}`}>{formatPct(landingRate)}</div>
                                <div className="text-[11px] text-slate-500">落地率 = 实际落地 / 计划SKU</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                <div className="flex items-center text-xs text-slate-500">
                                    新品占比
                                    <InfoTip text="新品占比=新品SKU数/波段总SKU数。用于判断本波段的新旧货结构是否符合策略。" />
                                </div>
                                <div className="mt-1 text-xl font-semibold text-emerald-600">{formatPct(activeWave.new_ratio)}</div>
                                <div className="text-[11px] text-slate-500">新品SKU主导波段节奏</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                <div className="flex items-center text-xs text-slate-500">
                                    旧货消化占比
                                    <InfoTip text="旧货消化占比=旧货相关SKU销售贡献/波段总销售贡献。占比过高通常提示压库风险。" />
                                </div>
                                <div className="mt-1 text-xl font-semibold text-amber-600">{formatPct(activeWave.old_ratio)}</div>
                                <div className="text-[11px] text-slate-500">旧货占比高需防压库</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                <div className="flex items-center text-xs text-slate-500">
                                    销发比
                                    <InfoTip text="销发比=销量/配货(或到货)。当缺少库存或到货字段时，按降级策略显示“-”并给出口径提示。" />
                                </div>
                                <div className="mt-1 text-xl font-semibold text-slate-900">{sellShipText}</div>
                                <div className="text-[11px] text-slate-500">{activeWave.sell_ship_note}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                <div className="flex items-center text-xs text-slate-500">
                                    OTB预算
                                    <InfoTip text="OTB预算（Open-To-Buy）=在目标售罄率、毛利红线和库存约束下的建议可采购预算。" />
                                </div>
                                <div className="mt-1 text-xl font-semibold text-slate-900">{formatWan(activeWave.otb_budget)}</div>
                                <div className="text-[11px] text-slate-500">计划销额 {formatWan(activeWave.plan_sales)}</div>
                                <button onClick={() => setPlanningView('otb')} className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50">
                                    进入 OTB 推算
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                            <div className="text-xs text-slate-500">全波段总览指数（不随当前波段切换）</div>
                            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                                {overallKpis.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><div className="text-xs text-slate-500">{item.label}</div><div className={`mt-1 text-xl font-semibold ${item.valueClass || 'text-slate-900'}`}>{item.value}</div></div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="mt-4 text-sm text-slate-600">
                        已切换到 OTB 推算视图，请在下方查看预算分配与波段预算拆解。
                    </div>
                )}
            </section>
            )}

            {planningView === 'otb' && (
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="text-xs uppercase tracking-wide text-slate-400">3.1 OTB / Buy Plan</div>
                            <h3 className="text-lg font-bold text-slate-900">OTB 预算推算（Open-To-Buy）</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                预算口径与库存覆盖联动，输出 Tier 切分与波段预算分配。
                                <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                    {sectionScopeHint}
                                </span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">库存快照<div className="mt-0.5 text-base font-semibold text-slate-900">{formatDate(otbSummary.latestSnapshot)}</div></div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">预算口径<div className="mt-0.5 text-base font-semibold text-slate-900">{formatWan(otbSummary.totalBudget)}</div></div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="text-xs text-slate-500">预测销售额</div><div className="mt-1 text-2xl font-semibold text-slate-900">{formatWan(otbSummary.totalPlanSales)}</div></div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="text-xs text-slate-500">建议 OTB</div><div className="mt-1 text-2xl font-semibold text-blue-600">{formatWan(otbSummary.suggestedOtb)}</div></div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="text-xs text-slate-500">预算差额（预算口径 - 建议OTB）</div><div className={`mt-1 text-2xl font-semibold ${budgetGapClass}`}>{formatWan(otbSummary.budgetGap)}</div></div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <h4 className="text-sm font-semibold text-slate-900">Tier 预算切分</h4>
                            <div className="mt-2 overflow-x-auto">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-slate-50"><tr><th className="px-2 py-2 text-left font-semibold text-slate-500">层级</th><th className="px-2 py-2 text-right font-semibold text-slate-500">占比</th><th className="px-2 py-2 text-right font-semibold text-slate-500">预算</th><th className="px-2 py-2 text-right font-semibold text-slate-500">预计双数</th></tr></thead>
                                    <tbody>{tierRows.map((row) => <tr key={row.key} className="border-t border-slate-100"><td className="px-2 py-2 text-slate-700">{row.name}</td><td className="px-2 py-2 text-right text-slate-700">{(row.ratio * 100).toFixed(1)}%</td><td className="px-2 py-2 text-right text-slate-700">{formatWan(row.budget)}</td><td className="px-2 py-2 text-right text-slate-700">{row.units.toLocaleString()}</td></tr>)}</tbody>
                                </table>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <h4 className="text-sm font-semibold text-slate-900">波段 OTB 分配（按预测销售权重）</h4>
                            <div className="mt-2 overflow-x-auto">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-slate-50"><tr><th className="px-2 py-2 text-left font-semibold text-slate-500">波段</th><th className="px-2 py-2 text-right font-semibold text-slate-500">预测销售额</th><th className="px-2 py-2 text-right font-semibold text-slate-500">OTB预算</th><th className="px-2 py-2 text-right font-semibold text-slate-500">权重</th></tr></thead>
                                    <tbody>{waveOtbRows.map((row) => <tr key={row.id} className={`border-t border-slate-100 ${row.id === activeWave.id ? 'bg-blue-50/60' : ''}`}><td className="px-2 py-2 text-slate-700"><button onClick={() => setSelectedWaveId(row.id)} className="hover:underline">{row.label}</button></td><td className="px-2 py-2 text-right text-slate-700">{formatWan(row.planSales)}</td><td className="px-2 py-2 text-right font-semibold text-blue-600">{formatWan(row.budget)}</td><td className="px-2 py-2 text-right text-slate-700">{(row.weight * 100).toFixed(1)}%</td></tr>)}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {planningView === 'wave' && (
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div><div className="text-xs uppercase tracking-wide text-slate-400">核心图 1</div><h3 className="text-base font-bold text-slate-900">波段时间轴 + 温度叙事</h3></div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                    {sectionScopeHint}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {regionOptions.map((region) => (<button key={region} onClick={() => setSelectedRegion(region)} className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${region === activeRegion ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{region}</button>))}
                                </div>
                            </div>
                        </div>
                        <div className="mb-2 text-xs text-slate-500">当前区域：{activeRegion || '—'} ｜ 温度带：{activeRegionMeta?.temp_range || '—'}</div>
                        <ReactECharts option={timelineOption} style={{ height: 320 }} onEvents={timelineEvents} notMerge />
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div><div className="text-xs uppercase tracking-wide text-slate-400">核心图 2</div><h3 className="text-base font-bold text-slate-900">波段 SKU 堆叠配置图</h3></div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                    {sectionScopeHint}
                                </span>
                                <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">当前波段总SKU：<span className="font-semibold text-slate-900">{activeStackRow?.total_sku ?? 0}</span></div>
                            </div>
                        </div>
                        <ReactECharts option={stackOption} style={{ height: 320 }} onEvents={stackEvents} notMerge />
                    </div>
                </section>
            )}

            {planningView === 'wave' && (
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><div className="text-xs uppercase tracking-wide text-slate-400">下钻区</div><h3 className="text-base font-bold text-slate-900">{activeWave.season}-{activeWave.wave} 款式企划动作清单</h3></div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                {sectionScopeHint}
                            </span>
                            <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">波段主题：{activeWave.theme || '未配置'}</div>
                        </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50"><tr><th className="px-2 py-2 text-left font-semibold text-slate-500">款号 style_id</th><th className="px-2 py-2 text-left font-semibold text-slate-500">品类</th><th className="px-2 py-2 text-left font-semibold text-slate-500">价格带</th><th className="px-2 py-2 text-right font-semibold text-slate-500">建议深度(店均双)</th><th className="px-2 py-2 text-right font-semibold text-slate-500">预估销量(双)</th><th className="px-2 py-2 text-right font-semibold text-slate-500">预估销额</th><th className="px-2 py-2 text-left font-semibold text-slate-500">建议动作</th></tr></thead>
                            <tbody>{activeWave.drill_rows.map((row) => <tr key={`${activeWave.id}-${row.style_id}-${row.category}`} className="border-t border-slate-100"><td className="px-2 py-2 text-slate-700">{row.style_id}</td><td className="px-2 py-2 text-slate-700">{row.category}</td><td className="px-2 py-2 text-slate-600">{row.price_band}</td><td className="px-2 py-2 text-right text-slate-700">{row.suggested_depth}</td><td className="px-2 py-2 text-right text-slate-700">{row.forecast_units.toLocaleString()}</td><td className="px-2 py-2 text-right text-slate-700">{formatWan(row.forecast_sales)}</td><td className="px-2 py-2 text-slate-700">{row.suggestion}</td></tr>)}</tbody>
                        </table>
                    </div>
                </section>
            )}

            {planningView === 'wave' && (
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs uppercase tracking-wide text-slate-400">Insights</div>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                {sectionScopeHint}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">自动结论</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                波段落地：{activeWave.sku_actual}/{activeWave.sku_plan}，落地率 {formatPct(landingRate)}。
                            </li>
                            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                结构重心：{topCategory} 是当前波段最大SKU配比。
                            </li>
                            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                当前区域温度状态：{regionAnomalies.length > 0 ? '存在偏早/偏晚波段' : '整体匹配'}。
                            </li>
                        </ul>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs uppercase tracking-wide text-slate-400">Actions</div>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                {sectionScopeHint}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">可执行方案</h3>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                销发比处理：
                                {activeWave.sell_ship_ratio === null
                                    ? `先补口径。${activeWave.sell_ship_note}`
                                    : `当前销发比 ${sellShipText}，按节奏调整补货。`}
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                温度错配处理：优先处理“偏晚”波段，加速主推与投放。
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                款式动作：低售罄款做去化，高动销款补深度，联动区域&门店执行。
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {onJumpToChannel && (
                                <button
                                    onClick={onJumpToChannel}
                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                                >
                                    去区域&门店执行
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (onJumpToOtb) onJumpToOtb();
                                    else setPlanningView('otb');
                                }}
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                去 OTB 预算
                            </button>
                            {onJumpToSkuRisk && (
                                <button
                                    onClick={onJumpToSkuRisk}
                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                                >
                                    去 SKU 风险列表
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
