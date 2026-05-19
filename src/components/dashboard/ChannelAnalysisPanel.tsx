import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    ScatterChart,
    Scatter,
    ZAxis,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceArea,
    ReferenceLine,
} from 'recharts';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { getDashboardCompareMeta } from '@/config/dashboardCompare';
import { useChannelAnalysis } from '@/hooks/useChannelAnalysis';
import { useRegionQuarterOps, type RegionQuarterOpsRow } from '@/hooks/useRegionQuarterOps';
import {
    RegionalPerformancePanel,
    StorePerformanceRankingPanel,
    RegionalDesignSignalPanel,
    RelatedModuleLinksPanel,
} from '@/components/dashboard/channel/RegionStoreWorkbench';
import ChannelActionCenterEnhanced from '@/components/dashboard/channel/ChannelActionCenterEnhanced';
import TemperatureMatrixPanel from '@/components/dashboard/channel/TemperatureMatrixPanel';
import FittingFunnelChart from '@/components/dashboard/channel/FittingFunnelChart';
import ChannelDecisionCockpit from '@/components/dashboard/channel/ChannelDecisionCockpit';
import RegionDrilldownTabs from '@/components/dashboard/channel/RegionDrilldownTabs';
import ChannelSectionHeader from '@/components/dashboard/channel/ChannelSectionHeader';
import StoreWorkbench from '@/components/dashboard/channel/StoreWorkbench';
import ConfigDrivenThresholdsBar from '@/components/config/ConfigDrivenThresholdsBar';
import type {
    RegionStoreKpi,
    RegionStoreDecisionItem,
    StoreTierItem,
    RegionalPerformanceItem as RegionalPerformanceItemWB,
    StorePerformanceRankingItem,
    RegionalDesignSignalItem,
} from '@/components/dashboard/channel/types';

type HeatMetric = 'net_sales' | 'sell_through' | 'gm_rate';
type ChannelSystemScope = 'all' | 'offline' | 'online';
type RegionDimension = 'region' | 'platform';

const REGION_LABEL_MAP: Record<string, string> = {
    全国统管: '华中',
};

const OFFLINE_REGION_SPEC = [
    { value: '华东', label: '华东' },
    { value: '华南', label: '华南' },
    { value: '西南', label: '西南' },
    { value: '西北', label: '西北' },
    { value: '华北', label: '华北' },
    { value: '东北', label: '东北' },
    { value: '全国统管', label: '华中' },
] as const;

function getRegionLabel(region: string) {
    return REGION_LABEL_MAP[region] || region;
}

function getRegionFromPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return '';
    return (payload as { region?: string }).region || '';
}

function getTerminalPointFromPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return null;
    const value = payload as {
        point_id?: string;
        region?: string;
        city_tier?: string;
        store_format?: string;
    };
    if (!value.point_id || !value.region || !value.city_tier || !value.store_format) return null;
    return {
        point_id: value.point_id,
        region: value.region,
        city_tier: value.city_tier,
        store_format: value.store_format,
    };
}

function metricLabel(metric: HeatMetric) {
    if (metric === 'net_sales') return '净销售额';
    if (metric === 'sell_through') return '售罄率';
    return '毛利率';
}

function formatMoneyCny(value: number, digitsYi = 2, digitsWan = 1) {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 100_000_000) return `${sign}¥${(abs / 100_000_000).toFixed(digitsYi)}亿`;
    if (abs >= 10_000) return `${sign}¥${(abs / 10_000).toFixed(digitsWan)}万`;
    return `${sign}¥${Math.round(abs).toLocaleString('zh-CN')}`;
}

function formatMoneyFromWan(wanValue: number, digitsYi = 2, digitsWan = 1) {
    if (!Number.isFinite(wanValue)) return '—';
    return formatMoneyCny(wanValue * 10_000, digitsYi, digitsWan);
}

function formatMetric(metric: HeatMetric, value: number) {
    if (!Number.isFinite(value) || value <= 0) return '-';
    if (metric === 'net_sales') return formatMoneyCny(value);
    return `${(value * 100).toFixed(1)}%`;
}

function heatColor(metric: HeatMetric, value: number, min: number, max: number) {
    if (!Number.isFinite(value) || value <= 0 || max <= min) return '#f8fafc';
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

    if (metric === 'net_sales') return `rgba(37, 99, 235, ${0.15 + ratio * 0.55})`;
    if (metric === 'sell_through') return `rgba(16, 185, 129, ${0.15 + ratio * 0.55})`;
    return `rgba(217, 119, 6, ${0.15 + ratio * 0.55})`;
}

type OpsHeatUnit = '%' | 'pp' | '万双' | '双';

type OpsComparableRow = RegionQuarterOpsRow & {
    demand_base: number | null;
    ship_base: number | null;
    fill_rate_base: number | null;
    reorder_rate_base: number | null;
    store_avg_demand_base: number | null;
    store_avg_ship_base: number | null;
    demand_delta: number | null;
    ship_delta: number | null;
    fill_delta: number | null;
    reorder_delta: number | null;
    store_avg_demand_delta: number | null;
    store_avg_ship_delta: number | null;
};

type OpsHeatColumn = {
    label: string;
    unit: OpsHeatUnit;
    isDelta: boolean;
    getValue: (row: OpsComparableRow) => number | null;
};

function formatWanAmount(value: number) {
    return formatMoneyCny(value);
}

function formatWanPairs(value: number) {
    return `${(value / 10000).toFixed(1)}万双`;
}

function deltaClass(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return 'text-slate-400';
    return value >= 0 ? 'text-emerald-600' : 'text-rose-600';
}

function deltaArrow(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return value >= 0 ? '▲' : '▼';
}

function formatDelta(value: number | null | undefined, unit: '%' | 'pp') {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const numeric = value * 100;
    const sign = numeric >= 0 ? '+' : '';
    return `${sign}${numeric.toFixed(1)}${unit}`;
}

function formatOptionalPair(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return formatWanPairs(value);
}

function formatOptionalPct(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `${(value * 100).toFixed(1)}%`;
}

function safeRateDelta(current: number, baseline: number | null) {
    if (baseline === null || baseline <= 0) return null;
    return (current - baseline) / baseline;
}

function safeDiff(current: number, baseline: number | null) {
    if (baseline === null || Number.isNaN(baseline)) return null;
    return current - baseline;
}



function riskTagClass(tag: string) {
    if (tag.includes('供给不足')) return 'border-rose-200 bg-rose-50 text-rose-700';
    if (tag.includes('需求爆发')) return 'border-amber-200 bg-amber-50 text-amber-700';
    if (tag.includes('需求疲软')) return 'border-slate-200 bg-slate-100 text-slate-600';
    if (tag.includes('店效突破')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    return 'border-sky-200 bg-sky-50 text-sky-700';
}

function insightToneClass(tone: 'good' | 'warn' | 'risk') {
    if (tone === 'good') return 'border-emerald-200 bg-emerald-50/60';
    if (tone === 'warn') return 'border-amber-200 bg-amber-50/60';
    return 'border-rose-200 bg-rose-50/60';
}

function quadrantDesc(fillPct: number, reorderPct: number, fillMid: number, reorderMid: number) {
    if (fillPct >= fillMid && reorderPct >= reorderMid) return '第一象限：需求强劲，核心款追加';
    if (fillPct < fillMid && reorderPct >= reorderMid) return '第二象限：供给不足（优先调拨）';
    if (fillPct < fillMid && reorderPct < reorderMid) return '第三象限：需求疲软（谨慎配发控库存）';
    return '第四象限：供需健康平衡';
}

function getQuadrantKey(fillPct: number, reorderPct: number, fillMid: number, reorderMid: number) {
    const isFillHigh = fillPct >= fillMid;
    const isReorderHigh = reorderPct >= reorderMid;

    if (isFillHigh && isReorderHigh) return 'q1' as const;
    if (!isFillHigh && isReorderHigh) return 'q2' as const;
    if (!isFillHigh && !isReorderHigh) return 'q3' as const;
    return 'q4' as const;
}

function formatPpDiff(current: number, baseline: number) {
    let diff = current - baseline;
    if (Math.abs(diff) < 0.005) diff = 0;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)}pp`;
}

function getAxisRange(
    values: number[],
    fallbackMin: number,
    fallbackMax: number,
    padding: number,
    lowerBound: number,
    upperBound: number,
) {
    if (!values.length) return { min: fallbackMin, max: fallbackMax };
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max - min < padding) {
        min -= padding * 0.8;
        max += padding * 0.8;
    }
    min = Math.max(lowerBound, Math.floor((min - padding) * 10) / 10);
    max = Math.min(upperBound, Math.ceil((max + padding) * 10) / 10);
    if (max - min < 1) {
        max = Math.min(upperBound, min + 1);
    }
    return { min, max };
}

export default function ChannelAnalysisPanel({
    filters,
    setFilters,
    compareMode,
}: {
    filters: DashboardFilters;
    setFilters: (f: DashboardFilters) => void;
    compareMode: CompareMode;
}) {
    const [channelSystem, setChannelSystem] = useState<ChannelSystemScope>('offline');
    const [selectedEcomPlatform, setSelectedEcomPlatform] = useState<string>('all');
    const [regionDimension, setRegionDimension] = useState<RegionDimension>('region');
    const [regionAnalysisTab, setRegionAnalysisTab] = useState<'achieve' | 'detail'>('achieve');
    const channelScope = useMemo(
        () => ({
            system: channelSystem,
            platform: channelSystem === 'online' ? selectedEcomPlatform : ('all' as const),
        }),
        [channelSystem, selectedEcomPlatform],
    );

    const {
        regionPerformance,
        regionSplitStats,
        regionChannelMatrix,
        regionCityEfficiency,
        regionDrillOrder,
        storeDrillList,
        terminalHealthPoints,
        efficiencyLeaderboard,
        laggingLeaderboard,
        ecomPlatforms,
    } = useChannelAnalysis(filters, channelScope);
    const {
        rows: opsRows,
        insights: opsInsights,
        actions: opsActions,
        thresholds: opsThresholds,
    } = useRegionQuarterOps(filters, channelScope);

    const [regionHeatMetric, setRegionHeatMetric] = useState<HeatMetric>('sell_through');
    const [selectedDrillRegion, setSelectedDrillRegion] = useState<string>('');
    const [selectedDrillTier, setSelectedDrillTier] = useState<string>('all');
    const [selectedTerminalPointId, setSelectedTerminalPointId] = useState<string>('');
    const [selectedOpsRegion, setSelectedOpsRegion] = useState<string>('');
    const [storeSortKey, setStoreSortKey] = useState<string>('store_efficiency');
    const [storeSortOrder, setStoreSortOrder] = useState<'asc' | 'desc'>('desc');
    void storeSortKey; void storeSortOrder; void setStoreSortKey; void setStoreSortOrder; // reserved for future use
    const opsSectionRef = useRef<HTMLDivElement | null>(null);

    const channelSystemLabel = useMemo(() => {
        if (channelSystem === 'online') {
            return selectedEcomPlatform === 'all' ? '电商平台·全平台' : `电商平台·${selectedEcomPlatform}`;
        }
        if (channelSystem === 'offline') return '线下体系';
        return '全渠道';
    }, [channelSystem, selectedEcomPlatform]);
    const compareMeta = useMemo(() => getDashboardCompareMeta(compareMode, filters, 'channel'), [compareMode, filters]);
    const isCombinedRegionPlatformView = channelSystem === 'all';
    const showOnlineBar = channelSystem !== 'offline';
    const showOfflineBar = channelSystem !== 'online';

    useEffect(() => {
        let nextFilters = filters;
        let changed = false;

        if (channelSystem === 'online') {
            if (filters.channel_type !== 'all' && filters.channel_type !== '电商') {
                nextFilters = { ...nextFilters, channel_type: 'all' };
                changed = true;
            }
            if (filters.region !== 'all' && !ecomPlatforms.includes(filters.region)) {
                nextFilters = { ...nextFilters, region: 'all' };
                changed = true;
            }
        } else if (channelSystem === 'offline') {
            if (filters.channel_type === '电商') {
                nextFilters = { ...nextFilters, channel_type: 'all' };
                changed = true;
            }
            if (filters.region !== 'all' && ecomPlatforms.includes(filters.region)) {
                nextFilters = { ...nextFilters, region: 'all' };
                changed = true;
            }
        }

        if (changed) {
            setFilters(nextFilters);
        }
    }, [channelSystem, ecomPlatforms, filters, setFilters]);

    const geoRegionSet = useMemo(() => new Set<string>(OFFLINE_REGION_SPEC.map((item) => item.value)), []);
    const platformSet = useMemo(() => new Set<string>(ecomPlatforms), [ecomPlatforms]);
    const hasRegionDimensionData = useMemo(
        () => regionPerformance.some((item) => geoRegionSet.has(item.region)),
        [geoRegionSet, regionPerformance],
    );
    const hasPlatformDimensionData = useMemo(
        () => regionPerformance.some((item) => platformSet.has(item.region)),
        [platformSet, regionPerformance],
    );
    const effectiveRegionDimension = useMemo<RegionDimension>(() => {
        if (channelSystem === 'online') return 'platform';
        if (channelSystem === 'offline') return 'region';
        if (regionDimension === 'platform' && !hasPlatformDimensionData && hasRegionDimensionData) return 'region';
        if (regionDimension === 'region' && !hasRegionDimensionData && hasPlatformDimensionData) return 'platform';
        return regionDimension;
    }, [channelSystem, hasPlatformDimensionData, hasRegionDimensionData, regionDimension]);
    const regionDimensionLabel = isCombinedRegionPlatformView ? '区域+平台' : effectiveRegionDimension === 'region' ? '区域' : '平台渠道';
    const regionDimensionNoun = isCombinedRegionPlatformView ? '节点' : effectiveRegionDimension === 'region' ? '区域' : '平台';
    const sectionScopeHint = useMemo(
        () => `口径：${channelSystemLabel} · 当前维度：${regionDimensionLabel} · ${compareMeta.modeLabel}`,
        [channelSystemLabel, compareMeta.modeLabel, regionDimensionLabel],
    );

    const regionSplitMap = useMemo(() => {
        const map = new Map<string, (typeof regionSplitStats)[number]>();
        regionSplitStats.forEach((item) => {
            map.set(item.region, item);
        });
        return map;
    }, [regionSplitStats]);

    const regionKpiData = useMemo(() => {
        const visibleRows = regionPerformance.filter((item) => {
            if (isCombinedRegionPlatformView) {
                return geoRegionSet.has(item.region) || platformSet.has(item.region);
            }
            return effectiveRegionDimension === 'region' ? geoRegionSet.has(item.region) : platformSet.has(item.region);
        });
        const totalActual = visibleRows.reduce((sum, item) => sum + item.net_sales, 0);
        return visibleRows
            .map((item) => ({
                ...item,
                target_amt: item.target_sales,
                actual_amt: item.net_sales,
                online_amt: regionSplitMap.get(item.region)?.onlineSales || 0,
                offline_amt: regionSplitMap.get(item.region)?.offlineSales || 0,
                share_pct: totalActual > 0 ? (item.net_sales / totalActual) * 100 : 0,
                online_share_pct:
                    item.net_sales > 0 ? ((regionSplitMap.get(item.region)?.onlineSales || 0) / item.net_sales) * 100 : 0,
                offline_share_pct:
                    item.net_sales > 0 ? ((regionSplitMap.get(item.region)?.offlineSales || 0) / item.net_sales) * 100 : 0,
                yoy_pct: item.yoy_rate * 100,
                mom_pct: item.mom_rate * 100,
                plan_pct: (item.achv_rate - 1) * 100,
                achv_pct: item.achv_rate * 100,
            }))
            .sort((a, b) => b.actual_amt - a.actual_amt);
    }, [effectiveRegionDimension, geoRegionSet, isCombinedRegionPlatformView, platformSet, regionPerformance, regionSplitMap]);

    const regionTotals = useMemo(() => {
        const actual = regionPerformance.reduce((sum, item) => sum + item.net_sales, 0);
        const target = regionPerformance.reduce((sum, item) => sum + item.target_sales, 0);
        const yoy = regionPerformance.reduce((sum, item) => sum + item.yoy_sales, 0);
        const mom = regionPerformance.reduce((sum, item) => sum + item.mom_sales, 0);
        return {
            actual,
            target,
            yoy,
            mom,
            achv: target > 0 ? actual / target : 0,
            planRate: target > 0 ? (actual - target) / target : 0,
            yoyRate: yoy > 0 ? (actual - yoy) / yoy : 0,
            momRate: mom > 0 ? (actual - mom) / mom : 0,
        };
    }, [regionPerformance]);

    const channelShareStats = useMemo(() => {
        const online = regionSplitStats.reduce((sum, item) => sum + item.onlineSales, 0);
        const offline = regionSplitStats.reduce((sum, item) => sum + item.offlineSales, 0);
        const total = online + offline;
        return {
            online,
            offline,
            onlinePct: total > 0 ? (online / total) * 100 : 0,
            offlinePct: total > 0 ? (offline / total) * 100 : 0,
        };
    }, [regionSplitStats]);

    const regionCompareMeta = useMemo(() => {
        if (compareMode === 'plan') {
            return {
                lineKey: 'plan_pct',
                lineName: '较计划%',
                overallLabel: '整体较计划',
                overallValue: `${regionTotals.planRate >= 0 ? '+' : ''}${(regionTotals.planRate * 100).toFixed(1)}%`,
                overallClass: regionTotals.planRate >= 0 ? 'text-emerald-600' : 'text-rose-600',
            };
        }
        if (compareMode === 'yoy') {
            return {
                lineKey: 'yoy_pct',
                lineName: '同比%',
                overallLabel: '整体同比',
                overallValue: `${regionTotals.yoyRate >= 0 ? '+' : ''}${(regionTotals.yoyRate * 100).toFixed(1)}%`,
                overallClass: regionTotals.yoyRate >= 0 ? 'text-emerald-600' : 'text-rose-600',
            };
        }
        if (compareMode === 'mom') {
            return {
                lineKey: 'mom_pct',
                lineName: '环比%',
                overallLabel: '整体环比',
                overallValue: regionTotals.mom > 0
                    ? `${regionTotals.momRate >= 0 ? '+' : ''}${(regionTotals.momRate * 100).toFixed(1)}%`
                    : '—',
                overallClass: regionTotals.mom > 0
                    ? regionTotals.momRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    : 'text-slate-400',
            };
        }
        return {
            lineKey: null as string | null,
            lineName: '',
            overallLabel: '对比状态',
            overallValue: '无对比',
            overallClass: 'text-slate-700',
        };
    }, [compareMode, regionTotals.mom, regionTotals.momRate, regionTotals.planRate, regionTotals.yoyRate]);

    const regionReferenceMeta = useMemo(() => {
        if (compareMode === 'yoy') {
            return {
                label: '去年同期',
                value: regionTotals.yoy,
                dataKey: 'yoy_sales',
                seriesName: '去年同期',
            } as const;
        }
        if (compareMode === 'mom') {
            return {
                label: `${compareMeta.baselineLabel}销售额`,
                value: regionTotals.mom,
                dataKey: 'mom_sales',
                seriesName: compareMeta.baselineLabel,
            } as const;
        }
        return {
            label: '目标销售额',
            value: regionTotals.target,
            dataKey: 'target_amt',
            seriesName: '目标',
        } as const;
    }, [compareMeta.baselineLabel, compareMode, regionTotals.mom, regionTotals.target, regionTotals.yoy]);

    const regionMatrixCellMap = useMemo(() => {
        const map = new Map<string, (typeof regionChannelMatrix.cells)[number]>();
        regionChannelMatrix.cells.forEach((cell) => {
            map.set(`${cell.region}__${cell.channel}`, cell);
        });
        return map;
    }, [regionChannelMatrix]);

    const regionMatrixRange = useMemo(() => {
        const values = regionChannelMatrix.cells
            .map((cell) => cell[regionHeatMetric])
            .filter((value) => Number.isFinite(value) && value > 0);
        if (values.length === 0) return { min: 0, max: 1 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [regionChannelMatrix.cells, regionHeatMetric]);

    const regionDeltaRanking = useMemo(() => {
        if (compareMode === 'none') {
            const rows = regionKpiData
                .map((item) => ({
                    region: item.region,
                    delta: item.actual_amt,
                    rate: null as number | null,
                }))
                .sort((a, b) => b.delta - a.delta);
            return {
                topTitle: `Top3 销售${regionDimensionNoun}（当前）`,
                dragTitle: `Top3 低贡献${regionDimensionNoun}（当前）`,
                rateLabel: '当前',
                topGrow: rows.slice(0, 3),
                topDrag: [...rows].reverse().slice(0, 3),
            };
        }

        if (compareMode === 'plan') {
            const rows = regionKpiData
                .filter((item) => item.target_amt > 0)
                .map((item) => ({
                    region: item.region,
                    delta: item.actual_amt - item.target_amt,
                    rate: (item.actual_amt - item.target_amt) / item.target_amt,
                }))
                .sort((a, b) => b.delta - a.delta);
            return {
                topTitle: `Top3 超计划${regionDimensionNoun}（增量）`,
                dragTitle: `Top3 未达计划${regionDimensionNoun}（缺口）`,
                rateLabel: '较计划',
                topGrow: rows.slice(0, 3),
                topDrag: [...rows].reverse().slice(0, 3),
            };
        }

        if (compareMode === 'mom') {
            const rows = regionKpiData
                .filter((item) => item.mom_sales > 0)
                .map((item) => ({
                    region: item.region,
                    delta: item.actual_amt - item.mom_sales,
                    rate: item.mom_rate,
                }))
                .sort((a, b) => b.delta - a.delta);
            return {
                topTitle: `Top3 环比增长${regionDimensionNoun}（增量）`,
                dragTitle: `Top3 环比回落${regionDimensionNoun}（增量）`,
                rateLabel: '环比',
                topGrow: rows.slice(0, 3),
                topDrag: [...rows].reverse().slice(0, 3),
            };
        }

        const rows = regionKpiData
            .filter((item) => item.yoy_sales > 0)
            .map((item) => ({
                region: item.region,
                delta: item.actual_amt - item.yoy_sales,
                rate: item.yoy_rate,
            }))
            .sort((a, b) => b.delta - a.delta);
        return {
            topTitle: `Top3 增长${regionDimensionNoun}（同比增量）`,
            dragTitle: `Top3 拖累${regionDimensionNoun}（同比增量）`,
            rateLabel: '同比',
            topGrow: rows.slice(0, 3),
            topDrag: [...rows].reverse().slice(0, 3),
        };
    }, [compareMode, regionDimensionNoun, regionKpiData]);

    const regionDrillSet = useMemo(() => new Set(regionDrillOrder), [regionDrillOrder]);
    const drillRegionOptions = useMemo(() => {
        if (channelSystem === 'online') {
            const platforms = ecomPlatforms.length ? ecomPlatforms : regionDrillOrder;
            return platforms.map((platform) => ({
                value: platform,
                label: platform,
                disabled: !regionDrillSet.has(platform),
            }));
        }
        if (channelSystem === 'offline') {
            const ordered = OFFLINE_REGION_SPEC.map((item) => ({
                value: item.value,
                label: item.label,
                disabled: !regionDrillSet.has(item.value),
            }));
            const extras = regionDrillOrder
                .filter((region) => !OFFLINE_REGION_SPEC.some((item) => item.value === region))
                .map((region) => ({
                    value: region,
                    label: getRegionLabel(region),
                    disabled: false,
                }));
            return [...ordered, ...extras];
        }
        return regionDrillOrder.map((region) => ({
            value: region,
            label: getRegionLabel(region),
            disabled: false,
        }));
    }, [channelSystem, ecomPlatforms, regionDrillOrder, regionDrillSet]);

    const activeDrillRegion = useMemo(() => {
        if (selectedDrillRegion === 'all') return 'all';
        if (channelSystem === 'online' && selectedEcomPlatform !== 'all') return selectedEcomPlatform;
        if (filters.region !== 'all') return filters.region;
        if (selectedDrillRegion) return selectedDrillRegion;
        return 'all';
    }, [channelSystem, filters.region, selectedDrillRegion, selectedEcomPlatform]);
    const activeDrillRegionLabel = useMemo(
        () => (activeDrillRegion === 'all' ? '全部区域' : getRegionLabel(activeDrillRegion)),
        [activeDrillRegion],
    );

    const cityRowsForRegion = useMemo(() => {
        if (activeDrillRegion === 'all') {
            const tierMap = new Map<
                string,
                {
                    city_tier: string;
                    store_count: number;
                    net_sales: number;
                    inventory_units: number;
                    st_weighted: number;
                    st_weight: number;
                }
            >();

            regionCityEfficiency.forEach((row) => {
                const key = row.city_tier;
                if (!tierMap.has(key)) {
                    tierMap.set(key, {
                        city_tier: row.city_tier,
                        store_count: 0,
                        net_sales: 0,
                        inventory_units: 0,
                        st_weighted: 0,
                        st_weight: 0,
                    });
                }
                const item = tierMap.get(key)!;
                const weight = Math.max(row.net_sales, 1);
                item.store_count += row.store_count;
                item.net_sales += row.net_sales;
                item.inventory_units += row.inventory_units;
                item.st_weighted += row.sell_through * weight;
                item.st_weight += weight;
            });

            return Array.from(tierMap.values())
                .map((item) => ({
                    region: 'all',
                    city_tier: item.city_tier,
                    store_count: item.store_count,
                    net_sales: item.net_sales,
                    sell_through: item.st_weight > 0 ? item.st_weighted / item.st_weight : 0,
                    inventory_units: item.inventory_units,
                }))
                .sort((a, b) => b.net_sales - a.net_sales);
        }
        return regionCityEfficiency
            .filter((row) => row.region === activeDrillRegion)
            .sort((a, b) => b.net_sales - a.net_sales);
    }, [activeDrillRegion, regionCityEfficiency]);

    const drillTierOptions = useMemo(() => {
        return Array.from(new Set(cityRowsForRegion.map((row) => row.city_tier)));
    }, [cityRowsForRegion]);

    // 按 activeDrillRegion 过滤的门店列表（供 StoreWorkbench 使用，内部再按线级/等级/视图过滤）
    const regionFilteredStores = useMemo(() => {
        if (!activeDrillRegion || activeDrillRegion === 'all') return storeDrillList;
        return storeDrillList.filter((s) => s.region === activeDrillRegion);
    }, [activeDrillRegion, storeDrillList]);

    const terminalScatterData = useMemo(() => {
        return terminalHealthPoints.map((item) => ({
            ...item,
            sell_through_pct: item.sell_through * 100,
            net_sales_w: item.net_sales / 10000,
            bubble_size: Math.max(8, Math.sqrt(item.net_sales / 12000)),
        }));
    }, [terminalHealthPoints]);

    // 四象限阈值（均值线）
    const terminalQuadrantThresholds = useMemo(() => {
        if (!terminalHealthPoints.length) return { stThresh: 50, toThresh: 2 };
        const stAvg = terminalHealthPoints.reduce((s, i) => s + i.sell_through, 0) / terminalHealthPoints.length;
        const toAvg = terminalHealthPoints.reduce((s, i) => s + i.inventory_turnover, 0) / terminalHealthPoints.length;
        return { stThresh: stAvg * 100, toThresh: toAvg };
    }, [terminalHealthPoints]);

    // 按区域聚合体检卡片
    const terminalRegionCards = useMemo(() => {
        const { stThresh, toThresh } = terminalQuadrantThresholds;
        const map = new Map<string, {
            region: string; netSales: number;
            stWeighted: number; stWeight: number;
            toWeighted: number; toWeight: number;
            storeCount: number; riskCount: number;
        }>();
        terminalHealthPoints.forEach((p) => {
            if (!map.has(p.region)) {
                map.set(p.region, { region: p.region, netSales: 0, stWeighted: 0, stWeight: 0, toWeighted: 0, toWeight: 0, storeCount: 0, riskCount: 0 });
            }
            const item = map.get(p.region)!;
            const w = Math.max(p.net_sales, 1);
            item.netSales += p.net_sales;
            item.stWeighted += p.sell_through * w;
            item.stWeight += w;
            item.toWeighted += p.inventory_turnover * w;
            item.toWeight += w;
            item.storeCount += p.store_count;
            if ((p.sell_through * 100) < stThresh || p.inventory_turnover < toThresh) item.riskCount++;
        });
        return Array.from(map.values()).map((item) => {
            const avgST = item.stWeight > 0 ? (item.stWeighted / item.stWeight) * 100 : 0;
            const avgTO = item.toWeight > 0 ? item.toWeighted / item.toWeight : 0;
            const isSTHigh = avgST >= stThresh;
            const isTOHigh = avgTO >= toThresh;
            let action: string; let actionColor: string;
            if (isSTHigh && isTOHigh) { action = '维持/加深'; actionColor = 'emerald'; }
            else if (isSTHigh && !isTOHigh) { action = '补货/调拨'; actionColor = 'blue'; }
            else if (!isSTHigh && isTOHigh) { action = '检查结构'; actionColor = 'amber'; }
            else { action = '清货/控货'; actionColor = 'rose'; }
            return { region: item.region, netSales: item.netSales, avgST, avgTO, storeCount: item.storeCount, riskCount: item.riskCount, action, actionColor };
        }).sort((a, b) => b.netSales - a.netSales);
    }, [terminalHealthPoints, terminalQuadrantThresholds]);

    // 四象限 KPI 计数
    const terminalKpiCounts = useMemo(() => {
        const { stThresh, toThresh } = terminalQuadrantThresholds;
        let healthy = 0, hotStock = 0, risk = 0, lagging = 0;
        terminalScatterData.forEach((p) => {
            const stHigh = p.sell_through_pct >= stThresh;
            const toHigh = p.inventory_turnover >= toThresh;
            if (stHigh && toHigh) healthy++;
            else if (stHigh && !toHigh) hotStock++;
            else if (!stHigh && toHigh) risk++;
            else lagging++;
        });
        return { healthy, hotStock, risk, lagging };
    }, [terminalScatterData, terminalQuadrantThresholds]);

    // 按选中区域过滤散点数据
    const filteredTerminalScatterData = useMemo(() => {
        if (activeDrillRegion === 'all') return terminalScatterData;
        return terminalScatterData.filter((p) => p.region === activeDrillRegion);
    }, [terminalScatterData, activeDrillRegion]);

    const clearTerminalDrillSelection = useCallback(() => {
        setSelectedTerminalPointId('');
        setSelectedDrillRegion('');
        setSelectedDrillTier('all');
        setFilters({
            ...filters,
            region: 'all',
            city_tier: 'all',
            store_format: 'all',
        });
    }, [filters, setFilters]);

    const handleDrillRegionToggle = useCallback(
        (region: string) => {
            if (activeDrillRegion === region) {
                clearTerminalDrillSelection();
                return;
            }
            setSelectedTerminalPointId('');
            setSelectedDrillRegion(region);
            setSelectedDrillTier('all');
            setFilters({
                ...filters,
                region,
                city_tier: 'all',
                store_format: 'all',
            });
        },
        [activeDrillRegion, clearTerminalDrillSelection, filters, setFilters],
    );

    const handleStoreRowToggle = useCallback(
        (store: { region: string; city_tier: string; store_format: string }) => {
            const isActive =
                filters.region === store.region &&
                filters.city_tier === store.city_tier &&
                filters.store_format === store.store_format;
            if (isActive) {
                clearTerminalDrillSelection();
                return;
            }
            setSelectedTerminalPointId('');
            setSelectedDrillRegion(store.region);
            setSelectedDrillTier(store.city_tier);
            setFilters({
                ...filters,
                region: store.region,
                city_tier: store.city_tier,
                store_format: store.store_format,
            });
        },
        [clearTerminalDrillSelection, filters, setFilters],
    );

    const handleTerminalDrillToggle = useCallback(
        (payload: { point_id: string; region: string; city_tier: string; store_format: string }) => {
            if (selectedTerminalPointId === payload.point_id) {
                clearTerminalDrillSelection();
                return;
            }
            setSelectedTerminalPointId(payload.point_id);
            setSelectedDrillRegion(payload.region);
            setSelectedDrillTier(payload.city_tier);
            setFilters({
                ...filters,
                region: payload.region,
                city_tier: payload.city_tier,
                store_format: payload.store_format,
            });
        },
        [clearTerminalDrillSelection, filters, selectedTerminalPointId, setFilters],
    );

    const opsRowsWithCompare = useMemo<OpsComparableRow[]>(() => {
        return opsRows.map((row) => {
            let demandBase: number | null = null;
            let shipBase: number | null = null;
            let fillRateBase: number | null = null;
            let reorderRateBase: number | null = null;
            let storeAvgDemandBase: number | null = null;
            let storeAvgShipBase: number | null = null;

            if (compareMode === 'yoy') {
                demandBase = row.demand_ly > 0 ? row.demand_ly : null;
                shipBase = row.ship_ly > 0 ? row.ship_ly : null;
                fillRateBase = row.fill_rate_ly > 0 ? row.fill_rate_ly : null;
                reorderRateBase = row.reorder_rate_ly > 0 ? row.reorder_rate_ly : null;
                storeAvgDemandBase = row.store_avg_demand_ly > 0 ? row.store_avg_demand_ly : null;
                storeAvgShipBase = row.store_avg_ship_ly > 0 ? row.store_avg_ship_ly : null;
            } else if (compareMode === 'mom') {
                demandBase = row.demand_mom > 0 ? row.demand_mom : null;
                shipBase = row.ship_mom > 0 ? row.ship_mom : null;
                fillRateBase = row.fill_rate_mom > 0 ? row.fill_rate_mom : null;
                reorderRateBase = row.reorder_rate_mom > 0 ? row.reorder_rate_mom : null;
                storeAvgDemandBase = row.store_avg_demand_mom > 0 ? row.store_avg_demand_mom : null;
                storeAvgShipBase = row.store_avg_ship_mom > 0 ? row.store_avg_ship_mom : null;
            } else if (compareMode === 'plan') {
                const planRatio =
                    row.target_amt > 0 && row.actual_amt > 0 ? row.target_amt / row.actual_amt : null;
                demandBase = planRatio === null ? null : row.demand * planRatio;
                shipBase = planRatio === null ? null : row.ship * planRatio;
                fillRateBase = row.fill_rate_ly > 0 ? row.fill_rate_ly : null;
                reorderRateBase = row.reorder_rate_ly > 0 ? row.reorder_rate_ly : null;
                storeAvgDemandBase = planRatio === null ? null : row.store_avg_demand * planRatio;
                storeAvgShipBase = planRatio === null ? null : row.store_avg_ship * planRatio;
            }

            const showDelta = compareMode !== 'none';
            return {
                ...row,
                demand_base: demandBase,
                ship_base: shipBase,
                fill_rate_base: fillRateBase,
                reorder_rate_base: reorderRateBase,
                store_avg_demand_base: storeAvgDemandBase,
                store_avg_ship_base: storeAvgShipBase,
                demand_delta: showDelta ? safeRateDelta(row.demand, demandBase) : null,
                ship_delta: showDelta ? safeRateDelta(row.ship, shipBase) : null,
                fill_delta: showDelta ? safeDiff(row.fill_rate, fillRateBase) : null,
                reorder_delta: showDelta ? safeDiff(row.reorder_rate, reorderRateBase) : null,
                store_avg_demand_delta: showDelta ? safeRateDelta(row.store_avg_demand, storeAvgDemandBase) : null,
                store_avg_ship_delta: showDelta ? safeRateDelta(row.store_avg_ship, storeAvgShipBase) : null,
            };
        });
    }, [compareMode, opsRows]);

    const opsCompareTotals = useMemo(() => {
        const demand = opsRowsWithCompare.reduce((sum, row) => sum + row.demand, 0);
        const ship = opsRowsWithCompare.reduce((sum, row) => sum + row.ship, 0);
        const demandBase = opsRowsWithCompare.reduce((sum, row) => sum + (row.demand_base ?? 0), 0);
        const shipBase = opsRowsWithCompare.reduce((sum, row) => sum + (row.ship_base ?? 0), 0);
        const reorderNumerator = opsRowsWithCompare.reduce((sum, row) => sum + row.reorder_rate * row.demand, 0);
        const reorderBaseNumerator = opsRowsWithCompare.reduce((sum, row) => {
            if (row.reorder_rate_base === null || row.demand_base === null) return sum;
            return sum + row.reorder_rate_base * row.demand_base;
        }, 0);

        const storeAvgDemand = opsRowsWithCompare.length
            ? opsRowsWithCompare.reduce((sum, row) => sum + row.store_avg_demand, 0) / opsRowsWithCompare.length
            : 0;
        const storeAvgShip = opsRowsWithCompare.length
            ? opsRowsWithCompare.reduce((sum, row) => sum + row.store_avg_ship, 0) / opsRowsWithCompare.length
            : 0;
        const storeAvgDemandBases = opsRowsWithCompare
            .map((row) => row.store_avg_demand_base)
            .filter((value): value is number => value !== null);
        const storeAvgShipBases = opsRowsWithCompare
            .map((row) => row.store_avg_ship_base)
            .filter((value): value is number => value !== null);
        const storeAvgDemandBase = storeAvgDemandBases.length
            ? storeAvgDemandBases.reduce((sum, value) => sum + value, 0) / storeAvgDemandBases.length
            : null;
        const storeAvgShipBase = storeAvgShipBases.length
            ? storeAvgShipBases.reduce((sum, value) => sum + value, 0) / storeAvgShipBases.length
            : null;

        const fillRate = demand > 0 ? ship / demand : 0;
        const fillRateBase = demandBase > 0 ? shipBase / demandBase : null;
        const reorderRate = demand > 0 ? reorderNumerator / demand : 0;
        const reorderRateBase = demandBase > 0 ? reorderBaseNumerator / demandBase : null;
        const showDelta = compareMode !== 'none';

        return {
            demand,
            demand_base: demandBase > 0 ? demandBase : null,
            demand_delta: showDelta ? safeRateDelta(demand, demandBase > 0 ? demandBase : null) : null,
            ship,
            ship_base: shipBase > 0 ? shipBase : null,
            ship_delta: showDelta ? safeRateDelta(ship, shipBase > 0 ? shipBase : null) : null,
            fill_rate: fillRate,
            fill_rate_base: fillRateBase,
            fill_delta: showDelta ? safeDiff(fillRate, fillRateBase) : null,
            reorder_rate: reorderRate,
            reorder_rate_base: reorderRateBase,
            reorder_delta: showDelta ? safeDiff(reorderRate, reorderRateBase) : null,
            store_avg_demand: storeAvgDemand,
            store_avg_demand_base: storeAvgDemandBase,
            store_avg_demand_delta: showDelta ? safeRateDelta(storeAvgDemand, storeAvgDemandBase) : null,
            store_avg_ship: storeAvgShip,
            store_avg_ship_base: storeAvgShipBase,
            store_avg_ship_delta: showDelta ? safeRateDelta(storeAvgShip, storeAvgShipBase) : null,
        };
    }, [compareMode, opsRowsWithCompare]);

    const opsModeLabel = useMemo(() => compareMeta.modeLabel, [compareMeta.modeLabel]);
    const opsDeltaLabel = useMemo(() => compareMeta.deltaLabel, [compareMeta.deltaLabel]);
    const opsMomAvailable = useMemo(
        () => opsRowsWithCompare.some((row) => row.demand_base !== null || row.ship_base !== null),
        [opsRowsWithCompare],
    );
    const opsModeTip = useMemo(() => {
        if (compareMode === 'mom' && !opsMomAvailable) return `当前口径缺${compareMeta.baselineLabel}链路基线，差值项显示为 —。`;
        if (compareMode === 'none') return '无对比模式下展示当前值。';
        return '';
    }, [compareMeta.baselineLabel, compareMode, opsMomAvailable]);

    const opsKpis = useMemo<
        Array<{
            key: string;
            label: string;
            value: string;
            subLabel: string;
            delta: number | null;
            deltaUnit: '%' | 'pp';
        }>
    >(
        () => [
            {
                key: 'demand',
                label: '总需求',
                value: formatWanPairs(opsCompareTotals.demand),
                subLabel:
                    compareMode === 'none'
                        ? '订货需求'
                        : `${opsDeltaLabel} ${formatOptionalPair(opsCompareTotals.demand_base)}`,
                delta: opsCompareTotals.demand_delta,
                deltaUnit: '%',
            },
            {
                key: 'ship',
                label: '总配发',
                value: formatWanPairs(opsCompareTotals.ship),
                subLabel:
                    compareMode === 'none'
                        ? '配货出库'
                        : `${opsDeltaLabel} ${formatOptionalPair(opsCompareTotals.ship_base)}`,
                delta: opsCompareTotals.ship_delta,
                deltaUnit: '%',
            },
            {
                key: 'fill_rate',
                label: '配货满足率',
                value: `${(opsCompareTotals.fill_rate * 100).toFixed(1)}%`,
                subLabel:
                    compareMode === 'none'
                        ? '执行率口径'
                        : `${opsDeltaLabel} ${formatOptionalPct(opsCompareTotals.fill_rate_base)}`,
                delta: opsCompareTotals.fill_delta,
                deltaUnit: 'pp',
            },
            {
                key: 'reorder_rate',
                label: '追加订货率',
                value: `${(opsCompareTotals.reorder_rate * 100).toFixed(1)}%`,
                subLabel:
                    compareMode === 'none'
                        ? '补单率口径'
                        : `${opsDeltaLabel} ${formatOptionalPct(opsCompareTotals.reorder_rate_base)}`,
                delta: opsCompareTotals.reorder_delta,
                deltaUnit: 'pp',
            },
            {
                key: 'store_avg_demand',
                label: '店均订货',
                value: `${Math.round(opsCompareTotals.store_avg_demand)}双`,
                subLabel:
                    compareMode === 'none'
                        ? '店效需求'
                        : `${opsDeltaLabel} ${opsCompareTotals.store_avg_demand_base === null
                            ? '—'
                            : `${Math.round(opsCompareTotals.store_avg_demand_base)}双`
                        }`,
                delta: opsCompareTotals.store_avg_demand_delta,
                deltaUnit: '%',
            },
            {
                key: 'store_avg_ship',
                label: '店均发货',
                value: `${Math.round(opsCompareTotals.store_avg_ship)}双`,
                subLabel:
                    compareMode === 'none'
                        ? '店效供给'
                        : `${opsDeltaLabel} ${opsCompareTotals.store_avg_ship_base === null
                            ? '—'
                            : `${Math.round(opsCompareTotals.store_avg_ship_base)}双`
                        }`,
                delta: opsCompareTotals.store_avg_ship_delta,
                deltaUnit: '%',
            },
        ],
        [compareMode, opsCompareTotals, opsDeltaLabel],
    );

    const opsHeatColumns = useMemo<OpsHeatColumn[]>(() => {
        if (compareMode === 'none') {
            return [
                { label: '需求规模', unit: '万双', isDelta: false, getValue: (row) => row.demand / 10000 },
                { label: '配发规模', unit: '万双', isDelta: false, getValue: (row) => row.ship / 10000 },
                { label: '执行率', unit: '%', isDelta: false, getValue: (row) => row.fill_rate * 100 },
                { label: '补单率', unit: '%', isDelta: false, getValue: (row) => row.reorder_rate * 100 },
                { label: '店均订货', unit: '双', isDelta: false, getValue: (row) => row.store_avg_demand },
                { label: '店均发货', unit: '双', isDelta: false, getValue: (row) => row.store_avg_ship },
            ];
        }
        return [
            {
                label: `需求${opsDeltaLabel}`,
                unit: '%',
                isDelta: true,
                getValue: (row) => (row.demand_delta === null ? null : row.demand_delta * 100),
            },
            {
                label: `配发${opsDeltaLabel}`,
                unit: '%',
                isDelta: true,
                getValue: (row) => (row.ship_delta === null ? null : row.ship_delta * 100),
            },
            {
                label: `执行率${opsDeltaLabel}`,
                unit: 'pp',
                isDelta: true,
                getValue: (row) => (row.fill_delta === null ? null : row.fill_delta * 100),
            },
            {
                label: `补单率${opsDeltaLabel}`,
                unit: 'pp',
                isDelta: true,
                getValue: (row) => (row.reorder_delta === null ? null : row.reorder_delta * 100),
            },
            {
                label: `店均订货${opsDeltaLabel}`,
                unit: '%',
                isDelta: true,
                getValue: (row) => (row.store_avg_demand_delta === null ? null : row.store_avg_demand_delta * 100),
            },
            {
                label: `店均发货${opsDeltaLabel}`,
                unit: '%',
                isDelta: true,
                getValue: (row) => (row.store_avg_ship_delta === null ? null : row.store_avg_ship_delta * 100),
            },
        ];
    }, [compareMode, opsDeltaLabel]);

    const opsHeatData = useMemo(() => {
        return opsRowsWithCompare.flatMap((row, yIndex) =>
            opsHeatColumns.map((column, xIndex) => {
                const rawValue = column.getValue(row);
                const isMissing = rawValue === null || !Number.isFinite(rawValue);
                const value = isMissing ? 0 : Number(rawValue.toFixed(2));
                return [xIndex, yIndex, value, row.region, column.label, column.unit, isMissing ? 1 : 0, column.isDelta ? 1 : 0];
            }),
        );
    }, [opsHeatColumns, opsRowsWithCompare]);

    const opsHeatRange = useMemo(() => {
        const values = opsHeatData
            .filter((item) => Number(item[6]) === 0)
            .map((item) => Number(item[2]))
            .filter((value) => Number.isFinite(value));
        const isDelta = compareMode !== 'none';
        if (!values.length) {
            return isDelta ? { min: -10, max: 10, isDelta } : { min: 0, max: 100, isDelta };
        }
        if (isDelta) {
            const maxAbs = Math.max(...values.map((value) => Math.abs(value)));
            const bound = Math.max(10, Number(maxAbs.toFixed(0)));
            return { min: -bound, max: bound, isDelta };
        }
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { min: Number(min.toFixed(0)), max: Number(Math.max(max, min + 1).toFixed(0)), isDelta };
    }, [compareMode, opsHeatData]);

    const opsHeatOption = useMemo<EChartsOption>(
        () => ({
            animationDuration: 420,
            grid: { left: 110, right: 26, top: 24, bottom: 56 },
            tooltip: {
                trigger: 'item',
                borderColor: '#e2e8f0',
                formatter: (params: unknown) => {
                    const point = (params as { data?: (string | number)[] })?.data || [];
                    const region = String(point[3] || '-');
                    const metric = String(point[4] || '-');
                    const unit = String(point[5] || '%');
                    const isMissing = Number(point[6] || 0) === 1;
                    const isDelta = Number(point[7] || 0) === 1;
                    if (isMissing) return `${getRegionLabel(region)}<br/>${metric}：—`;
                    const value = Number(point[2] || 0);
                    const sign = isDelta && value >= 0 ? '+' : '';
                    return `${getRegionLabel(region)}<br/>${metric}：${sign}${value.toFixed(1)}${unit}`;
                },
            },
            xAxis: {
                type: 'category',
                data: opsHeatColumns.map((column) => column.label),
                axisLine: { lineStyle: { color: '#e2e8f0' } },
                axisLabel: { color: '#64748b', fontSize: 11 },
                splitArea: { show: true, areaStyle: { color: ['#ffffff', '#f8fafc'] } },
            },
            yAxis: {
                type: 'category',
                data: opsRowsWithCompare.map((row) => getRegionLabel(row.region)),
                axisLine: { lineStyle: { color: '#e2e8f0' } },
                axisLabel: { color: '#334155', fontSize: 11 },
            },
            visualMap: {
                min: opsHeatRange.min,
                max: opsHeatRange.max,
                orient: 'horizontal',
                left: 'center',
                bottom: 4,
                text: opsHeatRange.isDelta ? ['改善', '承压'] : ['高', '低'],
                textStyle: { color: '#64748b', fontSize: 10 },
                inRange: opsHeatRange.isDelta
                    ? { color: ['#ef4444', '#f8fafc', '#10b981'] }
                    : { color: ['#f8fafc', '#bfdbfe', '#2563eb'] },
                calculable: false,
            },
            series: [
                {
                    type: 'heatmap',
                    data: opsHeatData,
                    label: {
                        show: true,
                        formatter: (params: unknown) => {
                            const point = (params as { data?: (string | number)[] })?.data || [];
                            const isMissing = Number(point[6] || 0) === 1;
                            const isDelta = Number(point[7] || 0) === 1;
                            if (isMissing) return '—';
                            const value = Number(point[2] || 0);
                            const sign = isDelta && value >= 0 ? '+' : '';
                            return `${sign}${value.toFixed(1)}`;
                        },
                        color: '#0f172a',
                        fontSize: 10,
                    },
                    itemStyle: {
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: '#334155',
                            borderWidth: 1.2,
                        },
                    },
                },
            ],
        }),
        [opsHeatColumns, opsHeatData, opsHeatRange, opsRowsWithCompare],
    );

    const opsScatterRows = useMemo(() => {
        return opsRowsWithCompare.map((row) => ({
            ...row,
            fill_rate_pct: row.fill_rate * 100,
            reorder_rate_pct: row.reorder_rate * 100,
            actual_amt_w: row.actual_amt / 10000,
        }));
    }, [opsRowsWithCompare]);

    const opsScatterSizeRange = useMemo(() => {
        const values = opsScatterRows.map((row) => row.actual_amt_w);
        if (!values.length) return { min: 1, max: 1 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [opsScatterRows]);

    const opsScatterThresholds = useMemo(() => {
        const fillMidBase = compareMode !== 'none' ? opsCompareTotals.fill_rate_base : null;
        const reorderMidBase = compareMode !== 'none' ? opsCompareTotals.reorder_rate_base : null;
        return {
            fillMid: (fillMidBase ?? opsThresholds.fill_rate) * 100,
            reorderMid: (reorderMidBase ?? opsThresholds.reorder_rate) * 100,
        };
    }, [
        compareMode,
        opsCompareTotals.fill_rate_base,
        opsCompareTotals.reorder_rate_base,
        opsThresholds.fill_rate,
        opsThresholds.reorder_rate,
    ]);

    const opsScatterAxisRange = useMemo(() => {
        const fillValues = [...opsScatterRows.map((row) => row.fill_rate_pct), opsScatterThresholds.fillMid];
        const reorderValues = [...opsScatterRows.map((row) => row.reorder_rate_pct), opsScatterThresholds.reorderMid];
        const fillRange = getAxisRange(fillValues, 75, 100, 1.2, 70, 100);
        const reorderRange = getAxisRange(reorderValues, 6, 28, 1.4, 0, 35);
        return {
            fillMin: fillRange.min,
            fillMax: fillRange.max,
            reorderMin: reorderRange.min,
            reorderMax: reorderRange.max,
        };
    }, [opsScatterRows, opsScatterThresholds.fillMid, opsScatterThresholds.reorderMid]);

    const opsScatterPlotData = useMemo(() => {
        const duplicateCounter: Record<string, number> = {};
        const quadrantColorMap = {
            q1: { color: '#10b981', borderColor: '#059669' },
            q2: { color: '#ef4444', borderColor: '#dc2626' },
            q3: { color: '#64748b', borderColor: '#475569' },
            q4: { color: '#2563eb', borderColor: '#1d4ed8' },
        } as const;

        // Dynamic bucket sizing based on axis ranges to detect visual overlap
        const xRange = Math.max(0.1, opsScatterAxisRange.fillMax - opsScatterAxisRange.fillMin);
        const yRange = Math.max(0.1, opsScatterAxisRange.reorderMax - opsScatterAxisRange.reorderMin);
        const xBucket = xRange / 15; // roughly 1/15th of the chart width
        const yBucket = yRange / 15; // roughly 1/15th of the chart height

        return opsScatterRows.map((row) => {
            const bx = Math.round(row.fill_rate_pct / xBucket);
            const by = Math.round(row.reorder_rate_pct / yBucket);
            const bucketKey = `${bx}__${by}`;

            const dupIndex = duplicateCounter[bucketKey] || 0;
            duplicateCounter[bucketKey] = dupIndex + 1;

            const quadrantKey = getQuadrantKey(
                row.fill_rate_pct,
                row.reorder_rate_pct,
                opsScatterThresholds.fillMid,
                opsScatterThresholds.reorderMid,
            );
            const dotColor = quadrantColorMap[quadrantKey];

            // Generate a spiral or explicit spread for visually overlapping points
            let offsetX = 0;
            let offsetY = 0;
            if (dupIndex > 0) {
                const layer = Math.ceil((Math.sqrt(dupIndex + 1) - 1) / 2);
                const indexInLayer = dupIndex - ((2 * layer - 1) * (2 * layer - 1));
                const sideLength = layer * 2;
                const sideIndex = Math.floor(indexInLayer / sideLength);
                const posInSide = indexInLayer % sideLength;

                const step = 16; // pixels between points (reduced slightly to prevent bounding box leaps)

                if (sideIndex === 0) { // top
                    offsetX = (posInSide - layer + 1) * step;
                    offsetY = -layer * step;
                } else if (sideIndex === 1) { // right
                    offsetX = layer * step;
                    offsetY = (posInSide - layer + 1) * step;
                } else if (sideIndex === 2) { // bottom
                    offsetX = (layer - posInSide - 1) * step;
                    offsetY = layer * step;
                } else { // left
                    offsetX = -layer * step;
                    offsetY = (layer - posInSide - 1) * step;
                }

                // Prevent visual overlap across the threshold axes
                const isLeft = quadrantKey === 'q2' || quadrantKey === 'q3';
                const isBottom = quadrantKey === 'q3' || quadrantKey === 'q4';

                // If on the left, don't allow large positive X offsets that push past the center line
                if (isLeft && offsetX > 0) offsetX = -offsetX;
                // If on the right, don't allow large negative X offsets
                if (!isLeft && offsetX < 0) offsetX = -offsetX;

                // If on the bottom, ECharts positive Y offset is down, negative is up.
                // We want to prevent points from crossing UP over the threshold.
                if (isBottom && offsetY < 0) offsetY = -offsetY;
                // If on top, prevent points crossing DOWN over the threshold.
                if (!isBottom && offsetY > 0) offsetY = -offsetY;
            }

            return {
                ...row,
                value: [row.fill_rate_pct, row.reorder_rate_pct, row.actual_amt_w],
                symbolOffset: [offsetX, offsetY],
                itemStyle: {
                    color: dotColor.color,
                    borderColor: dotColor.borderColor,
                },
            };
        });
    }, [
        opsScatterAxisRange.fillMax,
        opsScatterAxisRange.fillMin,
        opsScatterAxisRange.reorderMax,
        opsScatterAxisRange.reorderMin,
        opsScatterRows,
        opsScatterThresholds.fillMid,
        opsScatterThresholds.reorderMid,
    ]);

    const opsScatterOption = useMemo<EChartsOption>(() => {
        const { fillMid, reorderMid } = opsScatterThresholds;
        return {
            animationDuration: 420,
            grid: { left: 52, right: 16, top: 16, bottom: 48 },
            tooltip: {
                trigger: 'item',
                borderColor: '#e2e8f0',
                formatter: (params: unknown) => {
                    const row = (params as { data?: Record<string, unknown> })?.data || {};
                    const fill = Number(row.fill_rate_pct || 0);
                    const reorder = Number(row.reorder_rate_pct || 0);
                    return [
                        `<b>${getRegionLabel(String(row.region || '-'))}</b>`,
                        `配货满足率：${fill.toFixed(2)}%（相对中线 ${formatPpDiff(fill, fillMid)}）`,
                        `追加订货率：${reorder.toFixed(2)}%（相对中线 ${formatPpDiff(reorder, reorderMid)}）`,
                        `区域业绩：${formatWanAmount(Number(row.actual_amt || 0))}`,
                        `象限：${quadrantDesc(fill, reorder, fillMid, reorderMid)}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                name: '配货满足率(%)',
                min: opsScatterAxisRange.fillMin,
                max: opsScatterAxisRange.fillMax,
                axisLine: { lineStyle: { color: '#e2e8f0' } },
                axisLabel: { color: '#64748b', fontSize: 11 },
                splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                name: '追加订货率(%)',
                min: opsScatterAxisRange.reorderMin,
                max: opsScatterAxisRange.reorderMax,
                axisLine: { lineStyle: { color: '#e2e8f0' } },
                axisLabel: { color: '#64748b', fontSize: 11 },
                splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
            },
            series: [
                {
                    type: 'scatter',
                    data: opsScatterPlotData,
                    symbolSize: (value: number[]) => {
                        const amount = Number(value?.[2] || 0);
                        const ratio = (amount - opsScatterSizeRange.min) / Math.max(1, opsScatterSizeRange.max - opsScatterSizeRange.min);
                        return 14 + ratio * 24;
                    },
                    itemStyle: {
                        opacity: 0.75,
                        borderWidth: 1,
                    },
                    emphasis: {
                        label: {
                            show: true,
                            formatter: (params: unknown) => {
                                const row = (params as { data?: { region?: string } })?.data;
                                return getRegionLabel(row?.region || '-');
                            },
                            color: '#0f172a',
                            fontSize: 11,
                            fontWeight: 600,
                        },
                        itemStyle: {
                            shadowBlur: 12,
                            shadowColor: 'rgba(15,23,42,0.22)',
                        },
                    },
                    markLine: {
                        symbol: 'none',
                        lineStyle: { type: 'dashed', color: '#94a3b8' },
                        label: { show: false },
                        data: [{ xAxis: fillMid }, { yAxis: reorderMid }],
                    },
                },
            ],
        };
    }, [
        opsScatterAxisRange.fillMax,
        opsScatterAxisRange.fillMin,
        opsScatterAxisRange.reorderMax,
        opsScatterAxisRange.reorderMin,
        opsScatterPlotData,
        opsScatterSizeRange.max,
        opsScatterSizeRange.min,
        opsScatterThresholds,
    ]);

    const opsQuadrantStats = useMemo(() => {
        const stats: Record<
            'q1' | 'q2' | 'q3' | 'q4',
            { key: string; title: string; toneClass: string; desc: string; count: number; sales: number }
        > = {
            q1: {
                key: 'q1',
                title: '第一象限',
                toneClass: 'text-emerald-600',
                desc: '高满足 + 高补单，需求强劲，核心款追加。',
                count: 0,
                sales: 0,
            },
            q2: {
                key: 'q2',
                title: '第二象限',
                toneClass: 'text-rose-600',
                desc: '低满足 + 高补单，供给不足（优先调拨）。',
                count: 0,
                sales: 0,
            },
            q3: {
                key: 'q3',
                title: '第三象限',
                toneClass: 'text-slate-600',
                desc: '低满足 + 低补单，需求疲软（谨慎配发控库存）。',
                count: 0,
                sales: 0,
            },
            q4: {
                key: 'q4',
                title: '第四象限',
                toneClass: 'text-sky-700',
                desc: '高满足 + 低补单，供需健康平衡。',
                count: 0,
                sales: 0,
            },
        };

        opsScatterRows.forEach((row) => {
            const key = getQuadrantKey(
                row.fill_rate_pct,
                row.reorder_rate_pct,
                opsScatterThresholds.fillMid,
                opsScatterThresholds.reorderMid,
            );
            stats[key].count += 1;
            stats[key].sales += row.actual_amt;
        });

        return [stats.q1, stats.q2, stats.q3, stats.q4];
    }, [opsScatterRows, opsScatterThresholds.fillMid, opsScatterThresholds.reorderMid]);

    const opsScatterEvents = useMemo(() => ({
        click: (params: unknown) => {
            const region = (params as { data?: { region?: string } })?.data?.region || '';
            if (!region) return;
            setSelectedOpsRegion(region);
        },
    }), []);

    const opsHeatEvents = useMemo(() => ({
        click: (params: unknown) => {
            const point = (params as { data?: (string | number)[] })?.data;
            const region = String(point?.[3] || '');
            if (!region) return;
            setSelectedOpsRegion(region);
        },
    }), []);

    const activeOpsRegion = selectedOpsRegion || opsRowsWithCompare[0]?.region || '';
    const activeOpsRow = useMemo(
        () => opsRowsWithCompare.find((row) => row.region === activeOpsRegion) || null,
        [activeOpsRegion, opsRowsWithCompare],
    );

    const opsHeatDescription = useMemo(() => {
        if (compareMode === 'none') {
            return '行=大区；列=需求规模 / 配发规模 / 执行率 / 补单率 / 店均订货 / 店均发货。';
        }
        return `行=大区；列=需求${opsDeltaLabel} / 配发${opsDeltaLabel} / 执行率${opsDeltaLabel}pp / 补单率${opsDeltaLabel}pp / 店均订货${opsDeltaLabel} / 店均发货${opsDeltaLabel}。`;
    }, [compareMode, opsDeltaLabel]);

    const handleRegionChartClick = (payload: unknown) => {
        const region = getRegionFromPayload(payload);
        if (!region) return;
        setSelectedOpsRegion(region);
        if (regionDrillSet.has(region)) {
            setSelectedDrillRegion(region);
            setSelectedDrillTier('all');
        }
        opsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const opsInsightsView = useMemo(() => {
        if (compareMode === 'mom' && !opsMomAvailable) {
            return [
                { id: 'ops-mom-1', tone: 'warn' as const, text: `环比口径缺少${compareMeta.baselineLabel}链路基线，差值项已自动降级显示为 —。` },
                ...opsInsights.slice(0, 2),
            ];
        }
        if (compareMode === 'none') {
            return [
                { id: 'ops-none-1', tone: 'good' as const, text: `当前总需求 ${formatWanPairs(opsCompareTotals.demand)}，总配发 ${formatWanPairs(opsCompareTotals.ship)}。` },
                { id: 'ops-none-2', tone: 'warn' as const, text: `当前执行率 ${(opsCompareTotals.fill_rate * 100).toFixed(1)}%，补单率 ${(opsCompareTotals.reorder_rate * 100).toFixed(1)}%。` },
                { id: 'ops-none-3', tone: 'risk' as const, text: '切换至 vs计划 / 同比去年 可查看差值预警。' },
            ];
        }
        return opsInsights.slice(0, 3);
    }, [
        compareMode,
        opsCompareTotals.demand,
        opsCompareTotals.fill_rate,
        opsCompareTotals.reorder_rate,
        opsCompareTotals.ship,
        opsInsights,
        opsMomAvailable,
        compareMeta.baselineLabel,
    ]);

    const opsActionsView = useMemo(() => {
        if (compareMode === 'mom' && !opsMomAvailable) {
            return [
                { id: 'ops-mom-action-1', priority: '中' as const, text: `补齐${compareMeta.baselineLabel}区域链路基线（需求/配发/补单）后，再启用环比动作阈值。` },
                ...opsActions.slice(0, 4),
            ].slice(0, 5);
        }
        return opsActions.slice(0, 5);
    }, [compareMeta.baselineLabel, compareMode, opsActions, opsMomAvailable]);

    // ─── V14 WorkBench data hooks (computed from real data) ───────────────
    const regionStoreKpis = useMemo<RegionStoreKpi[]>(() => {
        return [
            {
                key: 'total',
                label: '总销售额',
                value: formatWanAmount(regionTotals.actual),
                target: formatWanAmount(regionTotals.target),
                diffPct: regionTotals.planRate,
                yoyRate: regionTotals.yoyRate,
                status: regionTotals.achv >= 1 ? 'healthy' : regionTotals.achv >= 0.85 ? 'opportunity' : 'warning',
                sub: `达成率 ${(regionTotals.achv * 100).toFixed(1)}%`,
            },
            ...regionPerformance.slice(0, 7).map(r => ({
                key: r.region,
                label: getRegionLabel(r.region),
                value: formatWanAmount(r.net_sales),
                target: formatWanAmount(r.target_sales),
                diffPct: r.achv_rate - 1,
                yoyRate: r.yoy_rate,
                status: (r.achv_rate >= 1 ? 'healthy' : r.achv_rate >= 0.85 ? 'opportunity' : 'warning') as RegionStoreKpi['status'],
            })),
        ];
    }, [regionPerformance, regionTotals]);

    const regionStoreDecisionItems = useMemo<RegionStoreDecisionItem[]>(() => {
        const addRegions = regionPerformance.filter(r => r.yoy_rate > 0.1).map(r => getRegionLabel(r.region));
        const riskRegions = regionPerformance.filter(r => r.achv_rate < 0.85).map(r => getRegionLabel(r.region));
        const items: RegionStoreDecisionItem[] = [];
        if (addRegions.length > 0) items.push({
            id: 'dec-add', type: 'add', label: '加深配货区域',
            subjects: addRegions.slice(0, 3), reason: '同比增长超10%，保障安全库存', tone: 'good',
        });
        if (riskRegions.length > 0) items.push({
            id: 'dec-risk', type: 'control', label: '风险区域控货',
            subjects: riskRegions.slice(0, 3), reason: '达成率低于85%，建议控制新品投放', tone: 'risk',
        });
        items.push({
            id: 'dec-transfer', type: 'transfer_sku', label: '建议跨区调拨',
            subjects: ['高库存区→缺货门店'], reason: '平衡区域库存差异，提升整体售罄率', tone: 'warn',
        });
        return items;
    }, [regionPerformance]);

    const storeTierItemsV2 = useMemo<StoreTierItem[]>(() => {
        const tierConfig: Record<string, { label: string; colorClass: string; bgClass: string }> = {
            S: { label: '旗舰 S 级', colorClass: 'bg-violet-100 text-violet-700 border-violet-300', bgClass: 'border-violet-300 bg-violet-50/60' },
            A: { label: '主力 A 级', colorClass: 'bg-blue-100 text-blue-700 border-blue-300', bgClass: 'border-blue-300 bg-blue-50/60' },
            B: { label: '标准 B 级', colorClass: 'bg-teal-100 text-teal-700 border-teal-300', bgClass: 'border-teal-300 bg-teal-50/60' },
            outlet: { label: '奥莱 Outlet', colorClass: 'bg-orange-100 text-orange-700 border-orange-300', bgClass: 'border-orange-300 bg-orange-50/60' },
        };
        const groups: Record<string, { stores: typeof storeDrillList; sales: number }> = {
            S: { stores: [], sales: 0 }, A: { stores: [], sales: 0 },
            B: { stores: [], sales: 0 }, outlet: { stores: [], sales: 0 },
        };
        storeDrillList.forEach(s => {
            const tier = s.store_format.includes('Mall') ? 'S' : s.store_format.includes('Outlet') ? 'outlet' : s.store_format.includes('Street') ? 'A' : 'B';
            groups[tier].stores.push(s);
            groups[tier].sales += s.net_sales;
        });
        const totalSales = regionTotals.actual || 1;
        return (['S', 'A', 'B', 'outlet'] as const).map(tier => {
            const g = groups[tier];
            const avgGm = g.stores.length > 0 ? g.stores.reduce((acc, s) => acc + s.gm_rate, 0) / g.stores.length : 0;
            const totalUnits = g.stores.reduce((acc, s) => acc + s.inventory_units, 0);
            const weekSales = g.sales / 13;
            return {
                tier: tier as StoreTierItem['tier'],
                label: tierConfig[tier].label,
                colorClass: tierConfig[tier].colorClass,
                bgClass: tierConfig[tier].bgClass,
                storeCount: g.stores.length,
                salesContribution: g.sales / totalSales,
                grossMargin: avgGm,
                inventoryAmount: totalUnits * 280,
                wos: weekSales > 0 ? (totalUnits / (weekSales / 280)) : 0,
                skuWidth: tier === 'S' ? 180 : tier === 'A' ? 120 : tier === 'outlet' ? 60 : 90,
                skuDepth: tier === 'S' ? 3 : 2,
                newStyleRatio: tier === 'S' ? 0.35 : tier === 'outlet' ? 0.05 : 0.2,
                heroStyleRatio: tier === 'S' ? 0.25 : 0.15,
                replenishFrequency: tier === 'S' ? '每周' : '每两周',
                merchandiseStrategy: tier === 'S' ? '全系列铺货，Hero 款加深' : tier === 'outlet' ? '清货为主，限时折扣' : '主推款 + 核心色深度',
                stores: g.stores.slice(0, 20).map(s => ({
                    storeId: s.store_id,
                    storeName: s.store_name,
                    region: s.region,
                    format: s.store_format,
                    netSales: s.net_sales,
                    sellThrough: s.sell_through,
                    inventoryUnits: s.inventory_units,
                    wos: s.units > 0 ? s.inventory_units / (s.units / 13) : 0,
                    sizeCompleteness: s.sell_through > 0.5 ? 0.82 : 0.65,
                })),
            };
        });
    }, [regionTotals.actual, storeDrillList]);

    const regionalPerformanceItemsWB = useMemo<RegionalPerformanceItemWB[]>(() => {
        return regionPerformance.map(r => {
            const storesInRegion = storeDrillList.filter(s => s.region === r.region);
            const avgGm = storesInRegion.length > 0 ? storesInRegion.reduce((acc, s) => acc + s.gm_rate, 0) / storesInRegion.length : 0.38;
            const avgSt = storesInRegion.length > 0 ? storesInRegion.reduce((acc, s) => acc + s.sell_through, 0) / storesInRegion.length : 0.62;
            return {
                region: getRegionLabel(r.region),
                salesAmount: r.net_sales,
                salesTarget: r.target_sales,
                salesAchievementRate: r.achv_rate,
                grossMargin: avgGm,
                sellThroughRate: avgSt,
                inventoryAmount: storesInRegion.reduce((acc, s) => acc + s.inventory_units * 280, 0) || r.net_sales * 1.2,
                wos: 8,
                sizeCompleteness: 0.78,
                storeCount: storesInRegion.length || 1,
                efficientStoreCount: storesInRegion.filter(s => s.store_efficiency > 0.6).length || 1,
                inefficientStoreCount: storesInRegion.filter(s => s.store_efficiency <= 0.4).length,
                yoyRate: r.yoy_rate,
                recommendedAction: r.achv_rate >= 1.05 ? '追加配货' : r.achv_rate >= 0.85 ? '维持' : '控货促销',
                actionType: (r.achv_rate >= 1.05 ? 'add' : r.achv_rate >= 0.85 ? 'maintain' : 'control') as RegionalPerformanceItemWB['actionType'],
            };
        });
    }, [regionPerformance, storeDrillList]);

    const storePerformanceRankingsWB = useMemo<StorePerformanceRankingItem[]>(() => {
        return storeDrillList.slice(0, 20).map((s, i) => ({
            storeId: s.store_id,
            storeName: s.store_name,
            region: s.region,
            city: s.store_name.slice(0, 2) + '市',
            cityTier: s.city_tier,
            storeLevel: (s.store_format.includes('Mall') ? 'S' : s.store_format.includes('Outlet') ? 'outlet' : 'B') as StorePerformanceRankingItem['storeLevel'],
            salesAmount: s.net_sales,
            salesAchievementRate: Math.min(s.store_efficiency + 0.2, 1.5),
            grossMargin: s.gm_rate,
            salesPerSquareMeter: s.net_sales / 200,
            salesPerStaff: s.net_sales / 5,
            sellThroughRate: s.sell_through,
            wos: s.units > 0 ? s.inventory_units / (s.units / 13) : 0,
            sizeCompleteness: s.sell_through > 0.5 ? 0.82 : 0.65,
            riskLevel: (s.sell_through < 0.25 ? 'high' : s.inventory_units > 1000 ? 'medium' : 'healthy') as StorePerformanceRankingItem['riskLevel'],
            recommendedAction: s.sell_through < 0.25 ? '清货去化' : s.sell_through > 0.8 ? '追加补货' : '维持',
            rankType: (i < 5 ? 'top_sales' : i < 10 ? 'top_growth' : 'inefficient') as StorePerformanceRankingItem['rankType'],
        }));
    }, [storeDrillList]);

    const regionalDesignSignalItemsWB = useMemo<RegionalDesignSignalItem[]>(() => {
        return regionPerformance.slice(0, 5).map(r => ({
            region: getRegionLabel(r.region),
            highGrowthShoeTypes: r.yoy_rate > 0 ? ['运动休闲', '户外徒步'] : ['正装皮鞋'],
            highReturnShoeTypes: ['跑步鞋', '休闲板鞋'],
            highGrowthColors: ['白色', '黑色', '卡其'],
            highGrowthMaterials: ['针织', '牛皮', '橡胶底'],
            functionalDemand: '防滑、轻量化、宽楦',
            consumerFeedback: r.achv_rate > 1 ? '需求旺盛，主推款断货' : '促销意愿高，性价比敏感',
            designSuggestion: r.achv_rate > 1 ? '加宽可选色系，加深主推款库存' : '简化 SKU 宽度，聚焦 3 款核心',
            designAction: (r.achv_rate > 1 ? 'continue' : 'optimize_comfort') as RegionalDesignSignalItem['designAction'],
        }));
    }, [regionPerformance]);

    return (
        <div className="flex flex-col gap-6">

            {/* V17 配置驱动 — 区域门店相关阈值/维度 */}
            <ConfigDrivenThresholdsBar tabKey="region-store" />

            {/* ─── L1 5秒决策驾驶舱 ─── */}
            <ChannelDecisionCockpit kpis={regionStoreKpis} decisions={regionStoreDecisionItems} />

            {/* ─── L2 区域业绩 3视图（业绩达成 / 增长排名 / 业绩明细）─── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center border-b border-slate-100 px-4 pt-3 gap-1">
                    {([
                        { key: 'achieve' as const, label: '📊 业绩达成' },
                        { key: 'detail' as const, label: '📋 业绩明细' },
                    ]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setRegionAnalysisTab(tab.key)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                regionAnalysisTab === tab.key
                                    ? 'border-blue-500 text-blue-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="p-4">
                    {regionAnalysisTab === 'achieve' && (
                        <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <ChannelSectionHeader icon="🎯" title="区域业绩达成" subtitle="Target / Actual / Compare" colorBar="blue" />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {[
                                { key: 'all', label: '全渠道' },
                                { key: 'offline', label: '线下体系' },
                                { key: 'online', label: '电商平台' },
                            ].map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => {
                                        setChannelSystem(option.key as ChannelSystemScope);
                                        if (option.key === 'online') setRegionDimension('platform');
                                        if (option.key === 'offline') setRegionDimension('region');
                                        if (option.key !== 'online') setSelectedEcomPlatform('all');
                                        setSelectedDrillRegion('');
                                        setSelectedDrillTier('all');
                                        setSelectedTerminalPointId('');
                                        setSelectedOpsRegion('');
                                    }}
                                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${channelSystem === option.key
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-white'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {channelSystem === 'all' ? (
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                                全渠道混合视角
                            </div>
                        ) : (
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                                {[
                                    { key: 'region' as const, label: '区域维度', enabled: hasRegionDimensionData },
                                    { key: 'platform' as const, label: '平台维度', enabled: hasPlatformDimensionData },
                                ].map((option) => (
                                    <button
                                        key={option.key}
                                        onClick={() => {
                                            if (!option.enabled) return;
                                            setRegionDimension(option.key);
                                        }}
                                        disabled={!option.enabled}
                                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${effectiveRegionDimension === option.key
                                            ? 'bg-slate-900 text-white'
                                            : option.enabled
                                                ? 'text-slate-600 hover:bg-white'
                                                : 'text-slate-300 cursor-not-allowed'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {channelSystem === 'online' && (
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 max-w-full overflow-x-auto">
                                <button
                                    onClick={() => {
                                        setSelectedEcomPlatform('all');
                                        setSelectedDrillRegion('');
                                        setSelectedOpsRegion('');
                                    }}
                                    className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${selectedEcomPlatform === 'all'
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    全平台
                                </button>
                                {ecomPlatforms.map((platform) => (
                                    <button
                                        key={platform}
                                        onClick={() => {
                                            setSelectedEcomPlatform(platform);
                                            setSelectedDrillRegion(platform);
                                            setSelectedDrillTier('all');
                                            setSelectedOpsRegion(platform);
                                        }}
                                        className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${selectedEcomPlatform === platform
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {platform}
                                    </button>
                                ))}
                            </div>
                        )}
                        {filters.region !== 'all' && (
                            <button
                                onClick={() => setFilters({ ...filters, region: 'all' })}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                            >
                                清除区域 {getRegionLabel(filters.region)}
                            </button>
                        )}
                    </div>
                </div>
                <div className="mb-4 text-xs text-slate-500">
                    当前经营体系：{channelSystemLabel}。当前统计维度：{regionDimensionLabel}。当前对比口径：{compareMeta.modeLabel}{compareMode === 'none' ? '（无基线灰柱）' : `（灰色柱=${regionReferenceMeta.label}）`}。
                    {isCombinedRegionPlatformView
                        ? '全渠道视角下，柱图同时展示线下大区与电商平台，便于直接比较业绩体量。'
                        : '线上与线下采用独立运营口径，电商模式可按平台拆分查看。'}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">{regionReferenceMeta.label}</div>
                        <div className="text-slate-900 font-semibold">{formatMoneyCny(regionReferenceMeta.value)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">实际销售额</div>
                        <div className="text-slate-900 font-semibold">{formatMoneyCny(regionTotals.actual)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">整体达成率</div>
                        <div className={`font-semibold ${regionTotals.achv >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {(regionTotals.achv * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">{regionCompareMeta.overallLabel}</div>
                        <div className={`font-semibold ${regionCompareMeta.overallClass}`}>
                            {regionCompareMeta.overallValue}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                        电商占比 {(channelShareStats.onlinePct).toFixed(1)}%（{formatMoneyCny(channelShareStats.online)}）
                    </div>
                    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        线下占比 {(channelShareStats.offlinePct).toFixed(1)}%（{formatMoneyCny(channelShareStats.offline)}）
                    </div>
                </div>
                <div className="mb-2 text-xs text-slate-500">
                    {isCombinedRegionPlatformView ? '当前图表：线下大区 + 电商平台混合展示。顶部汇总卡按全渠道汇总。' : `当前维度：${regionDimensionLabel}（区域视角仅显示地理大区；平台视角仅显示电商平台）。顶部汇总卡按当前经营体系汇总。`}
                </div>

                {regionKpiData.length === 0 ? (
                    <div className="h-80 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
                        {isCombinedRegionPlatformView ? '当前全渠道视角暂无区域或平台数据。' : '当前维度暂无数据，请切换“区域维度/平台维度”查看。'}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={regionKpiData} margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="region"
                                tick={{ fontSize: 11, fill: '#475569' }}
                                tickFormatter={(value: string | number) => getRegionLabel(String(value))}
                            />
                            <YAxis
                                yAxisId="left"
                                tickFormatter={(v) => formatMoneyCny(Number(v), 1, 0)}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                            />
                            {regionCompareMeta.lineKey && (
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                            )}
                            <Tooltip
                                labelFormatter={(label, payload) => {
                                    const row = payload?.[0]?.payload as
                                        | {
                                            share_pct?: number;
                                        }
                                        | undefined;
                                    const regionLabel = getRegionLabel(String(label));
                                    if (!row) return regionLabel;
                                    return `${regionLabel} ｜ ${regionDimensionNoun}业绩占比 ${(row.share_pct || 0).toFixed(1)}%`;
                                }}
                                formatter={(value, name) => {
                                    const numeric = Number(value);
                                    const label = String(name ?? '-');
                                    if (!Number.isFinite(numeric)) return ['—', label];
                                    if (compareMode === 'none' && label === regionReferenceMeta.seriesName) return null;
                                    if (!label.includes('%') && numeric === 0 && (label.includes('线上') || label.includes('线下') || label.includes('电商'))) {
                                        return null;
                                    }
                                    const isPct = label.includes('%');
                                    return [isPct ? `${numeric.toFixed(1)}%` : formatMoneyCny(numeric), label];
                                }}
                            />
                            <Legend />
                            {compareMode !== 'none' && (
                                <Bar
                                    yAxisId="left"
                                    name={regionReferenceMeta.seriesName}
                                    dataKey={regionReferenceMeta.dataKey}
                                    fill="#94a3b8"
                                    onClick={handleRegionChartClick}
                                />
                            )}
                            {showOnlineBar && (
                                <Bar
                                    yAxisId="left"
                                    name={channelSystem === 'online' ? '实际-电商' : '实际-线上'}
                                    dataKey="online_amt"
                                    stackId="actual"
                                    fill="#2563eb"
                                    onClick={handleRegionChartClick}
                                />
                            )}
                            {showOfflineBar && (
                                <Bar
                                    yAxisId="left"
                                    name="实际-线下"
                                    dataKey="offline_amt"
                                    stackId="actual"
                                    fill="#14b8a6"
                                    radius={[6, 6, 0, 0]}
                                    onClick={handleRegionChartClick}
                                />
                            )}
                            {regionCompareMeta.lineKey && (
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    name={regionCompareMeta.lineName}
                                    dataKey={regionCompareMeta.lineKey}
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
                            <div className="mt-5 pt-4 border-t border-slate-100">
                                <ChannelSectionHeader icon="📈" title="区域增长排名" subtitle="本期 vs 上期 增量对比" colorBar="emerald" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="text-sm font-semibold text-emerald-700 mb-3">{regionDeltaRanking.topTitle}</div>
                    <div className="space-y-2">
                        {regionDeltaRanking.topGrow.length === 0 && (
                            <div className="text-xs text-slate-400">当前口径暂无可对比数据</div>
                        )}
                        {regionDeltaRanking.topGrow.map((item, index) => (
                            <div key={`${item.region}-grow`} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                                <div className="text-sm text-slate-700">{index + 1}. {getRegionLabel(item.region)}</div>
                                <div className="text-right">
                                    <div className="text-xs font-semibold text-emerald-700">
                                        {item.delta >= 0 ? '+' : '-'}{formatMoneyCny(Math.abs(item.delta))}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {item.rate === null ? '当前规模' : `${regionDeltaRanking.rateLabel} ${(item.rate * 100).toFixed(1)}%`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="text-sm font-semibold text-rose-700 mb-3">{regionDeltaRanking.dragTitle}</div>
                    <div className="space-y-2">
                        {regionDeltaRanking.topDrag.length === 0 && (
                            <div className="text-xs text-slate-400">当前口径暂无可对比数据</div>
                        )}
                        {regionDeltaRanking.topDrag.map((item, index) => (
                            <div key={`${item.region}-drag`} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2">
                                <div className="text-sm text-slate-700">{index + 1}. {getRegionLabel(item.region)}</div>
                                <div className="text-right">
                                    <div className={`text-xs font-semibold ${item.delta >= 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                                        {item.delta >= 0 ? '+' : '-'}{formatMoneyCny(Math.abs(item.delta))}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {item.rate === null ? '当前规模' : `${regionDeltaRanking.rateLabel} ${(item.rate * 100).toFixed(1)}%`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
                            </div>
                        </>
                    )}
                    {regionAnalysisTab === 'detail' && (
                        <RegionalPerformancePanel rows={regionalPerformanceItemsWB} />
                    )}
                </div>
            </div>

            {/* ─── L2 区域 × 气候适配 ─── */}
            <TemperatureMatrixPanel />

            {/* ─── L3 区域多维钻取（渠道热力 / 运营链路 / 城市线级）─── */}
            <RegionDrilldownTabs
                heatContent={(
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <ChannelSectionHeader icon="🔥" title="区域 × 渠道 热力矩阵" colorBar="violet" />
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {sectionScopeHint}
                        </span>
                        {(['net_sales', 'sell_through', 'gm_rate'] as HeatMetric[]).map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setRegionHeatMetric(metric)}
                                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${regionHeatMetric === metric
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {metricLabel(metric)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="text-left text-xs text-slate-500 px-2 py-2">区域 \ 渠道</th>
                                {regionChannelMatrix.channels.map((channel) => (
                                    <th key={channel} className="text-xs text-slate-500 font-medium px-3 py-2 whitespace-nowrap">
                                        {channel}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {regionChannelMatrix.regions.map((region) => (
                                <tr key={region}>
                                    <td className="text-sm text-slate-700 font-medium px-2 py-2 whitespace-nowrap">{getRegionLabel(region)}</td>
                                    {regionChannelMatrix.channels.map((channel) => {
                                        const key = `${region}__${channel}`;
                                        const cell = regionMatrixCellMap.get(key);
                                        const value = cell ? cell[regionHeatMetric] : 0;
                                        const bg = heatColor(regionHeatMetric, value, regionMatrixRange.min, regionMatrixRange.max);
                                        const isActive =
                                            (filters.region === 'all' || filters.region === region) &&
                                            (filters.channel_type === 'all' || filters.channel_type === channel);
                                        return (
                                            <td key={key} className="px-1 py-1">
                                                <button
                                                    onClick={() =>
                                                        setFilters({
                                                            ...filters,
                                                            region: filters.region === region ? 'all' : region,
                                                            channel_type: filters.channel_type === channel ? 'all' : channel,
                                                        })
                                                    }
                                                    className="w-full rounded-md border border-slate-200 text-xs px-2 py-2 text-slate-800 transition-opacity"
                                                    style={{ backgroundColor: bg, opacity: isActive ? 1 : 0.42 }}
                                                >
                                                    {formatMetric(regionHeatMetric, value)}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
                )}
                opsContent={(
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Regional Ops Dashboard</div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900">
                            区域企划运营链路（需求→发货→执行→补单→店效）
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            需求=订货需求，发货=配货出库，执行率=配货满足率，补单率=追加订货率。
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            口径说明：同比使用%，执行率/补单率差异使用pp；执行率=配货出库/订货需求；补单率为v0估算，接入真实补单字段后将切换为补单量/订货需求。
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            口径：{channelSystemLabel} · {opsModeLabel}
                        </div>
                        {opsModeTip && <div className="text-[11px] text-amber-600 mt-1">{opsModeTip}</div>}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
                    {opsKpis.map((kpi) => (
                        <div key={kpi.key} className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5">
                            <div className="text-[11px] text-slate-500 mb-1">{kpi.label}</div>
                            <div className="text-lg font-semibold text-slate-900 leading-none">{kpi.value}</div>
                            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-500">{kpi.subLabel}</span>
                                <span className={`font-semibold ${deltaClass(kpi.delta)}`}>
                                    {deltaArrow(kpi.delta)} {formatDelta(kpi.delta, kpi.deltaUnit)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-1">图1：链路差异热力矩阵表</div>
                        <div className="text-xs text-slate-500 mb-2">{opsHeatDescription}</div>
                        <ReactECharts
                            option={opsHeatOption}
                            style={{ height: 340, width: '100%' }}
                            onEvents={opsHeatEvents}
                            notMerge
                            lazyUpdate
                        />
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-1">图2：执行率 vs 补单率 四象限气泡散点图</div>
                        <div className="text-xs text-slate-500 mb-2">
                            X=配货满足率，Y=追加订货率，气泡大小=区域业绩；坐标轴按当前样本自动缩放，重叠点会自动错位展示。象限判定按1位小数对齐显示口径。
                        </div>
                        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_220px] gap-3">
                            <ReactECharts
                                option={opsScatterOption}
                                style={{ height: 340, width: '100%' }}
                                onEvents={opsScatterEvents}
                                notMerge
                                lazyUpdate
                            />
                            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                                <div className="text-slate-900 font-semibold mb-2">四象限说明</div>
                                <div className="space-y-2 text-slate-600">
                                    {opsQuadrantStats.map((quadrant) => (
                                        <div key={quadrant.key} className="rounded-md border border-slate-200 bg-white/70 p-2">
                                            <div>
                                                <span className={`${quadrant.toneClass} font-semibold`}>{quadrant.title}</span>
                                                ：{quadrant.desc}
                                            </div>
                                            <div className="mt-1 text-[11px] text-slate-500">
                                                区域数 {quadrant.count} · 合计业绩 {formatWanAmount(quadrant.sales)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="text-sm font-semibold text-slate-900">区域链路联动详情（图1/图2整合）</div>
                        <div className="text-xs text-slate-500">
                            {activeOpsRow
                                ? `${getRegionLabel(activeOpsRow.region)}：执行率 ${(activeOpsRow.fill_rate * 100).toFixed(1)}% ｜ 补单率 ${(activeOpsRow.reorder_rate * 100).toFixed(1)}% ｜ ${opsModeLabel}`
                                : '点击上方热力矩阵或气泡查看区域详情'}
                        </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                        {opsRowsWithCompare.map((row) => {
                            const active = row.region === activeOpsRegion;
                            return (
                                <button
                                    key={`ops-chip-${row.region}`}
                                    onClick={() => setSelectedOpsRegion(row.region)}
                                    className={`text-xs rounded-full border px-2.5 py-1 transition-colors ${active
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {getRegionLabel(row.region)}
                                </button>
                            );
                        })}
                    </div>

                    {activeOpsRow ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
                                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                    <div className="text-[11px] text-slate-500">区域业绩</div>
                                    <div className="text-sm font-semibold text-slate-900">{formatWanAmount(activeOpsRow.actual_amt)}</div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                    <div className="text-[11px] text-slate-500">订货需求</div>
                                    <div className="text-sm font-semibold text-slate-900">{formatWanPairs(activeOpsRow.demand)}</div>
                                    <div className={`text-[11px] ${deltaClass(activeOpsRow.demand_delta)}`}>
                                        {deltaArrow(activeOpsRow.demand_delta)} {formatDelta(activeOpsRow.demand_delta, '%')}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                    <div className="text-[11px] text-slate-500">配货出库</div>
                                    <div className="text-sm font-semibold text-slate-900">{formatWanPairs(activeOpsRow.ship)}</div>
                                    <div className={`text-[11px] ${deltaClass(activeOpsRow.ship_delta)}`}>
                                        {deltaArrow(activeOpsRow.ship_delta)} {formatDelta(activeOpsRow.ship_delta, '%')}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                    <div className="text-[11px] text-slate-500">执行率</div>
                                    <div className="text-sm font-semibold text-slate-900">{(activeOpsRow.fill_rate * 100).toFixed(1)}%</div>
                                    <div className={`text-[11px] ${deltaClass(activeOpsRow.fill_delta)}`}>
                                        {deltaArrow(activeOpsRow.fill_delta)} {formatDelta(activeOpsRow.fill_delta, 'pp')}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                    <div className="text-[11px] text-slate-500">补单率</div>
                                    <div className="text-sm font-semibold text-slate-900">{(activeOpsRow.reorder_rate * 100).toFixed(1)}%</div>
                                    <div className={`text-[11px] ${deltaClass(activeOpsRow.reorder_delta)}`}>
                                        {deltaArrow(activeOpsRow.reorder_delta)} {formatDelta(activeOpsRow.reorder_delta, 'pp')}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                    <div className="text-[11px] text-slate-500">店均订货</div>
                                    <div className="text-sm font-semibold text-slate-900">{Math.round(activeOpsRow.store_avg_demand)}双</div>
                                    <div className={`text-[11px] ${deltaClass(activeOpsRow.store_avg_demand_delta)}`}>
                                        {deltaArrow(activeOpsRow.store_avg_demand_delta)} {formatDelta(activeOpsRow.store_avg_demand_delta, '%')}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                    <div className="text-[11px] text-slate-500">店均发货</div>
                                    <div className="text-sm font-semibold text-slate-900">{Math.round(activeOpsRow.store_avg_ship)}双</div>
                                    <div className={`text-[11px] ${deltaClass(activeOpsRow.store_avg_ship_delta)}`}>
                                        {deltaArrow(activeOpsRow.store_avg_ship_delta)} {formatDelta(activeOpsRow.store_avg_ship_delta, '%')}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-3">
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <div className="text-[11px] text-slate-500 mb-1">风险标签</div>
                                    <div className="flex flex-wrap gap-1">
                                        {activeOpsRow.risk_tags.map((tag) => (
                                            <span
                                                key={`${activeOpsRow.region}-${tag}`}
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${riskTagClass(tag)}`}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <div className="text-[11px] text-slate-500 mb-1">智能策略</div>
                                    <div className="text-sm text-slate-700">{activeOpsRow.strategy}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
                            暂无可展示的区域链路详情
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-5">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-3">AI 总结摘要（Insights）</div>
                        <div className="space-y-2">
                            {opsInsightsView.slice(0, 3).map((insight, index) => (
                                <div
                                    key={insight.id}
                                    className={`rounded-lg border px-3 py-2 text-sm text-slate-700 ${insightToneClass(insight.tone)}`}
                                >
                                    <span className="font-semibold mr-1">{index + 1}.</span>
                                    {insight.text}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-3">运营动作指令（Actions）</div>
                        <div className="space-y-2">
                            {opsActionsView.slice(0, 5).map((action, index) => (
                                <div key={action.id} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-slate-500">{index + 1}.</span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${action.priority === '高'
                                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}
                                        >
                                            {action.priority}优先
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-700">{action.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
                )}
                cityContent={(
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <ChannelSectionHeader icon="🏙️" title="门店经营工作台" subtitle="城市线级 · 门店策略 · 运营列表" colorBar="sky" />
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                {sectionScopeHint}
                            </span>
                        </div>

                        {/* 区域筛选按钮 */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={clearTerminalDrillSelection}
                                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                    activeDrillRegion === 'all'
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                全部
                            </button>
                            {drillRegionOptions.map((regionOption) => (
                                <button
                                    key={regionOption.value}
                                    disabled={regionOption.disabled}
                                    onClick={() => {
                                        if (regionOption.disabled) return;
                                        handleDrillRegionToggle(regionOption.value);
                                    }}
                                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                        regionOption.disabled
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                            : activeDrillRegion === regionOption.value
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {regionOption.label}
                                </button>
                            ))}
                        </div>

                        {/* 统一工作台 */}
                        <StoreWorkbench
                            cityRows={cityRowsForRegion}
                            storeTiers={storeTierItemsV2}
                            stores={regionFilteredStores}
                            activeDrillRegion={activeDrillRegion}
                            regionLabel={activeDrillRegionLabel}
                            sectionScopeHint={sectionScopeHint}
                            formatMoney={formatMoneyCny}
                            getRegionLabel={getRegionLabel}
                        />
                    </div>
                )}
                terminalContent={(
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <ChannelSectionHeader icon="🩺" title="终端体检矩阵" subtitle="售罄率 × 库存周转 四象限诊断" colorBar="violet" />
                    <div className="flex flex-wrap items-center gap-2">
                        {activeDrillRegion !== 'all' && (
                            <button
                                onClick={clearTerminalDrillSelection}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                                {getRegionLabel(activeDrillRegion)} ✕ 清空筛选
                            </button>
                        )}
                        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {sectionScopeHint}
                        </div>
                    </div>
                </div>

                {/* ── 四象限 KPI ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {([
                        { count: terminalKpiCounts.healthy, label: '高效健康组合', hint: '建议维持 / 加深', border: 'border-emerald-100', bg: 'bg-emerald-50/60', num: 'text-emerald-700', sub: 'text-emerald-600' },
                        { count: terminalKpiCounts.hotStock, label: '热销缺货组合', hint: '建议补货 / 调拨', border: 'border-blue-100', bg: 'bg-blue-50/60', num: 'text-blue-700', sub: 'text-blue-600' },
                        { count: terminalKpiCounts.risk, label: '低效去化组合', hint: '建议检查结构', border: 'border-amber-100', bg: 'bg-amber-50/60', num: 'text-amber-700', sub: 'text-amber-600' },
                        { count: terminalKpiCounts.lagging, label: '滞销积压组合', hint: '建议清货 / 控货', border: 'border-rose-100', bg: 'bg-rose-50/60', num: 'text-rose-700', sub: 'text-rose-600' },
                    ] as const).map((kpi) => (
                        <div key={kpi.label} className={`rounded-xl border ${kpi.border} ${kpi.bg} p-3 text-center`}>
                            <div className={`text-2xl font-bold ${kpi.num}`}>{kpi.count}</div>
                            <div className={`text-xs mt-1 ${kpi.sub}`}>{kpi.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{kpi.hint}</div>
                        </div>
                    ))}
                </div>

                {/* ── 大区体检卡片（业务地图） ── */}
                {terminalRegionCards.length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-500 mb-2">大区体检分布（点击聚焦散点图）</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                            {terminalRegionCards.map((card) => (
                                <button
                                    key={card.region}
                                    onClick={() => handleDrillRegionToggle(card.region)}
                                    className={`text-left rounded-xl border p-2.5 transition-all ${
                                        activeDrillRegion === card.region
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-slate-800 truncate">{getRegionLabel(card.region)}</span>
                                        <span className={`ml-1 shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                            card.actionColor === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                                            card.actionColor === 'blue' ? 'bg-blue-100 text-blue-700' :
                                            card.actionColor === 'amber' ? 'bg-amber-100 text-amber-700' :
                                            'bg-rose-100 text-rose-700'
                                        }`}>{card.action}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-700 font-medium">{formatMoneyCny(card.netSales)}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        售罄 {card.avgST.toFixed(0)}% · 周转 {card.avgTO.toFixed(1)}x
                                    </div>
                                    {card.riskCount > 0 && (
                                        <div className="text-[10px] text-rose-500 mt-0.5">⚠ {card.riskCount} 组合需关注</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── 四象限散点图 ── */}
                <div className="rounded-xl border border-slate-100 p-3 mb-4">
                    <div className="text-xs text-slate-500 mb-2 flex flex-wrap gap-x-3">
                        <span>X=库存周转 · Y=售罄率 · 气泡=销售额 · 虚线=均值阈值</span>
                        {activeDrillRegion !== 'all' && (
                            <span className="text-blue-600 font-medium">聚焦：{getRegionLabel(activeDrillRegion)}</span>
                        )}
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <ScatterChart margin={{ top: 20, right: 24, left: 12, bottom: 24 }}>
                            {/* 象限背景 */}
                            <ReferenceArea
                                x1={terminalQuadrantThresholds.toThresh} y1={terminalQuadrantThresholds.stThresh}
                                fill="#d1fae5" fillOpacity={0.45}
                                label={{ value: '高效健康', position: 'insideTopRight', fontSize: 10, fill: '#059669' }}
                            />
                            <ReferenceArea
                                x2={terminalQuadrantThresholds.toThresh} y1={terminalQuadrantThresholds.stThresh}
                                fill="#dbeafe" fillOpacity={0.45}
                                label={{ value: '热销缺货', position: 'insideTopLeft', fontSize: 10, fill: '#2563eb' }}
                            />
                            <ReferenceArea
                                x1={terminalQuadrantThresholds.toThresh} y2={terminalQuadrantThresholds.stThresh}
                                fill="#fef3c7" fillOpacity={0.45}
                                label={{ value: '低效去化', position: 'insideBottomRight', fontSize: 10, fill: '#d97706' }}
                            />
                            <ReferenceArea
                                x2={terminalQuadrantThresholds.toThresh} y2={terminalQuadrantThresholds.stThresh}
                                fill="#fee2e2" fillOpacity={0.45}
                                label={{ value: '滞销积压', position: 'insideBottomLeft', fontSize: 10, fill: '#dc2626' }}
                            />
                            {/* 阈值基准线 */}
                            <ReferenceLine x={terminalQuadrantThresholds.toThresh} stroke="#94a3b8" strokeDasharray="5 4" label={{ value: `均值 ${terminalQuadrantThresholds.toThresh.toFixed(1)}x`, fontSize: 9, fill: '#94a3b8' }} />
                            <ReferenceLine y={terminalQuadrantThresholds.stThresh} stroke="#94a3b8" strokeDasharray="5 4" label={{ value: `均值 ${terminalQuadrantThresholds.stThresh.toFixed(0)}%`, fontSize: 9, fill: '#94a3b8', position: 'insideRight' }} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                type="number" dataKey="inventory_turnover" name="库存周转"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickFormatter={(v) => `${v.toFixed(1)}x`}
                                label={{ value: '库存周转', position: 'insideBottom', offset: -14, fontSize: 10, fill: '#64748b' }}
                            />
                            <YAxis
                                type="number" dataKey="sell_through_pct" name="售罄率"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickFormatter={(v) => `${v.toFixed(0)}%`}
                                label={{ value: '售罄率', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                            />
                            <ZAxis type="number" dataKey="net_sales_w" range={[80, 520]} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload as typeof terminalScatterData[0];
                                    const stHigh = d.sell_through_pct >= terminalQuadrantThresholds.stThresh;
                                    const toHigh = d.inventory_turnover >= terminalQuadrantThresholds.toThresh;
                                    const qMap = {
                                        HH: { label: '高效健康', action: '建议维持并加深主推款配比', color: 'text-emerald-700' },
                                        HL: { label: '热销缺货', action: '建议及时补货或跨区调拨', color: 'text-blue-700' },
                                        LH: { label: '低效去化', action: '建议检查尺码/款式结构', color: 'text-amber-700' },
                                        LL: { label: '滞销积压', action: '建议清货促销或控制补货', color: 'text-rose-700' },
                                    };
                                    const key = `${stHigh ? 'H' : 'L'}${toHigh ? 'H' : 'L'}` as keyof typeof qMap;
                                    const q = qMap[key];
                                    return (
                                        <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-3 text-xs max-w-[220px]">
                                            <div className="font-semibold text-slate-800 mb-1.5">
                                                {getRegionLabel(d.region)} / {d.city_tier} / {d.store_format}
                                            </div>
                                            <div className="text-slate-500">{d.store_count || 0} 家门店</div>
                                            <div className="mt-1 space-y-0.5 text-slate-700">
                                                <div>销售额：{formatMoneyFromWan(d.net_sales_w)}</div>
                                                <div>售罄率：{d.sell_through_pct.toFixed(1)}%</div>
                                                <div>库存周转：{d.inventory_turnover.toFixed(2)}x</div>
                                            </div>
                                            <div className={`mt-2 font-semibold ${q.color}`}>{q.label}</div>
                                            <div className="text-slate-500 mt-0.5">{q.action}</div>
                                        </div>
                                    );
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {/* 按象限分组渲染，不同颜色 */}
                            <Scatter
                                name="高效健康" fill="#10b981" fillOpacity={0.78} stroke="#059669"
                                data={filteredTerminalScatterData.filter((d) => d.sell_through_pct >= terminalQuadrantThresholds.stThresh && d.inventory_turnover >= terminalQuadrantThresholds.toThresh)}
                                onClick={(node: unknown) => { const p = getTerminalPointFromPayload((node as { payload?: unknown })?.payload); if (p) handleTerminalDrillToggle(p); }}
                            />
                            <Scatter
                                name="热销缺货" fill="#3b82f6" fillOpacity={0.78} stroke="#2563eb"
                                data={filteredTerminalScatterData.filter((d) => d.sell_through_pct >= terminalQuadrantThresholds.stThresh && d.inventory_turnover < terminalQuadrantThresholds.toThresh)}
                                onClick={(node: unknown) => { const p = getTerminalPointFromPayload((node as { payload?: unknown })?.payload); if (p) handleTerminalDrillToggle(p); }}
                            />
                            <Scatter
                                name="低效去化" fill="#f59e0b" fillOpacity={0.78} stroke="#d97706"
                                data={filteredTerminalScatterData.filter((d) => d.sell_through_pct < terminalQuadrantThresholds.stThresh && d.inventory_turnover >= terminalQuadrantThresholds.toThresh)}
                                onClick={(node: unknown) => { const p = getTerminalPointFromPayload((node as { payload?: unknown })?.payload); if (p) handleTerminalDrillToggle(p); }}
                            />
                            <Scatter
                                name="滞销积压" fill="#ef4444" fillOpacity={0.78} stroke="#dc2626"
                                data={filteredTerminalScatterData.filter((d) => d.sell_through_pct < terminalQuadrantThresholds.stThresh && d.inventory_turnover < terminalQuadrantThresholds.toThresh)}
                                onClick={(node: unknown) => { const p = getTerminalPointFromPayload((node as { payload?: unknown })?.payload); if (p) handleTerminalDrillToggle(p); }}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                    <div className="mt-1 text-[11px] text-slate-400">
                        点击气泡高亮该组合并联动下方红榜/黑榜；再次点击同一气泡取消联动恢复全量。
                    </div>
                </div>

                {/* ── 效率红榜 + 滞销黑榜 ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                        <div className="text-sm font-semibold text-emerald-700 mb-2">🏆 效率红榜</div>
                        <div className="space-y-2">
                            {efficiencyLeaderboard.length === 0 && (
                                <div className="text-xs text-slate-500">暂无满足条件的高效终端组合</div>
                            )}
                            {efficiencyLeaderboard.map((row, index) => (
                                <button
                                    key={`good-${row.point_id}`}
                                    onClick={() => handleTerminalDrillToggle(row)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                        selectedTerminalPointId === row.point_id
                                            ? 'border-emerald-700 bg-emerald-600 text-white'
                                            : 'border-emerald-200 bg-white/80 hover:bg-white'
                                    }`}
                                >
                                    <div className="text-xs font-medium">
                                        {index + 1}. {getRegionLabel(row.region)} / {row.city_tier} / {row.store_format}
                                    </div>
                                    <div className={`text-[11px] mt-1 ${selectedTerminalPointId === row.point_id ? 'text-emerald-100' : 'text-slate-600'}`}>
                                        {formatMoneyCny(row.net_sales)} · 售罄 {(row.sell_through * 100).toFixed(1)}% · 周转 {row.inventory_turnover.toFixed(2)}x
                                    </div>
                                    <div className={`text-[11px] ${selectedTerminalPointId === row.point_id ? 'text-emerald-200' : 'text-emerald-600'}`}>
                                        ✓ {row.diagnosis}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                        <div className="text-sm font-semibold text-rose-700 mb-2">⚠ 滞销黑榜</div>
                        <div className="space-y-2">
                            {laggingLeaderboard.length === 0 && (
                                <div className="text-xs text-slate-500">暂无明显滞销终端组合</div>
                            )}
                            {laggingLeaderboard.map((row, index) => (
                                <button
                                    key={`bad-${row.point_id}`}
                                    onClick={() => handleTerminalDrillToggle(row)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                        selectedTerminalPointId === row.point_id
                                            ? 'border-rose-700 bg-rose-600 text-white'
                                            : 'border-rose-200 bg-white/80 hover:bg-white'
                                    }`}
                                >
                                    <div className="text-xs font-medium">
                                        {index + 1}. {getRegionLabel(row.region)} / {row.city_tier} / {row.store_format}
                                    </div>
                                    <div className={`text-[11px] mt-1 ${selectedTerminalPointId === row.point_id ? 'text-rose-100' : 'text-slate-600'}`}>
                                        {formatMoneyCny(row.net_sales)} · 售罄 {(row.sell_through * 100).toFixed(1)}% · 周转 {row.inventory_turnover.toFixed(2)}x
                                    </div>
                                    <div className={`text-[11px] ${selectedTerminalPointId === row.point_id ? 'text-rose-200' : 'text-rose-600'}`}>
                                        ✗ {row.diagnosis}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
                )}
            />

            {/* ─── L4 鞋类试穿转化漏斗 ─── */}
            <FittingFunnelChart />

            {/* ─── L4 区域设计信号 ─── */}
            <RegionalDesignSignalPanel rows={regionalDesignSignalItemsWB} />

            {/* ─── L5 执行闭环 ─── */}
            <ChannelActionCenterEnhanced />

            {/* ─── Footer 跨模块联动 ─── */}
            <RelatedModuleLinksPanel />
        </div>
    );
}
