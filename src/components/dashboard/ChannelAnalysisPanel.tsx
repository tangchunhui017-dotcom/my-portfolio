import { useEffect, useMemo, useState } from 'react';
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
} from 'recharts';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { useChannelAnalysis } from '@/hooks/useChannelAnalysis';
import { useRegionQuarterOps, type RegionQuarterOpsRow } from '@/hooks/useRegionQuarterOps';
import StoreEfficiencyStrategyPanel from '@/components/dashboard/StoreEfficiencyStrategyPanel';

type HeatMetric = 'net_sales' | 'sell_through' | 'gm_rate';
type ChannelSystemScope = 'all' | 'offline' | 'online';

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

function getModeLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return 'vs计划';
    if (compareMode === 'yoy') return '同比去年';
    if (compareMode === 'mom') return '环比上季';
    return '无对比';
}

function getDeltaLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return '较计划';
    if (compareMode === 'yoy') return '较去年同期';
    if (compareMode === 'mom') return '较上季';
    return '当前值';
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
        cityTierBucketMatrix,
        storeFormatMix,
        formatTierMatrix,
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

    const [regionHeatMetric, setRegionHeatMetric] = useState<HeatMetric>('net_sales');
    const [selectedDrillRegion, setSelectedDrillRegion] = useState<string>('');
    const [selectedDrillTier, setSelectedDrillTier] = useState<string>('all');
    const [selectedTerminalPointId, setSelectedTerminalPointId] = useState<string>('');
    const [selectedOpsRegion, setSelectedOpsRegion] = useState<string>('');

    const channelSystemLabel = useMemo(() => {
        if (channelSystem === 'online') {
            return selectedEcomPlatform === 'all' ? '电商平台·全平台' : `电商平台·${selectedEcomPlatform}`;
        }
        if (channelSystem === 'offline') return '线下体系';
        return '全渠道';
    }, [channelSystem, selectedEcomPlatform]);
    const sectionScopeHint = useMemo(
        () => `口径：${channelSystemLabel} · ${getModeLabel(compareMode)}`,
        [channelSystemLabel, compareMode],
    );
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

    const regionSplitMap = useMemo(() => {
        const map = new Map<string, (typeof regionSplitStats)[number]>();
        regionSplitStats.forEach((item) => {
            map.set(item.region, item);
        });
        return map;
    }, [regionSplitStats]);

    const regionKpiData = useMemo(() => {
        const totalActual = regionPerformance.reduce((sum, item) => sum + item.net_sales, 0);
        return regionPerformance.map((item) => ({
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
        }));
    }, [regionPerformance, regionSplitMap]);

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
            const rows = regionPerformance
                .map((item) => ({
                    region: item.region,
                    delta: item.net_sales,
                    rate: null as number | null,
                }))
                .sort((a, b) => b.delta - a.delta);
            return {
                topTitle: 'Top3 销售区域（当前）',
                dragTitle: 'Top3 低贡献区域（当前）',
                rateLabel: '当前',
                topGrow: rows.slice(0, 3),
                topDrag: [...rows].reverse().slice(0, 3),
            };
        }

        if (compareMode === 'plan') {
            const rows = regionPerformance
                .filter((item) => item.target_sales > 0)
                .map((item) => ({
                    region: item.region,
                    delta: item.net_sales - item.target_sales,
                    rate: (item.net_sales - item.target_sales) / item.target_sales,
                }))
                .sort((a, b) => b.delta - a.delta);
            return {
                topTitle: 'Top3 超计划区域（增量）',
                dragTitle: 'Top3 未达计划区域（缺口）',
                rateLabel: '较计划',
                topGrow: rows.slice(0, 3),
                topDrag: [...rows].reverse().slice(0, 3),
            };
        }

        if (compareMode === 'mom') {
            const rows = regionPerformance
                .filter((item) => item.mom_sales > 0)
                .map((item) => ({
                    region: item.region,
                    delta: item.net_sales - item.mom_sales,
                    rate: item.mom_rate,
                }))
                .sort((a, b) => b.delta - a.delta);
            return {
                topTitle: 'Top3 环比增长区域（增量）',
                dragTitle: 'Top3 环比回落区域（增量）',
                rateLabel: '环比',
                topGrow: rows.slice(0, 3),
                topDrag: [...rows].reverse().slice(0, 3),
            };
        }

        const rows = regionPerformance
            .filter((item) => item.yoy_sales > 0)
            .map((item) => ({
                region: item.region,
                delta: item.net_sales - item.yoy_sales,
                rate: item.yoy_rate,
            }))
            .sort((a, b) => b.delta - a.delta);
        return {
            topTitle: 'Top3 增长区域（同比增量）',
            dragTitle: 'Top3 拖累区域（同比增量）',
            rateLabel: '同比',
            topGrow: rows.slice(0, 3),
            topDrag: [...rows].reverse().slice(0, 3),
        };
    }, [compareMode, regionPerformance]);

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

    const storeRowsForDrill = useMemo(() => {
        return storeDrillList
            .filter((store) => {
                if (!activeDrillRegion) return false;
                if (activeDrillRegion !== 'all' && store.region !== activeDrillRegion) return false;
                if (selectedDrillTier !== 'all' && store.city_tier !== selectedDrillTier) return false;
                return true;
            })
            .sort((a, b) => b.net_sales - a.net_sales)
            .slice(0, 12);
    }, [activeDrillRegion, selectedDrillTier, storeDrillList]);

    const terminalScatterData = useMemo(() => {
        return terminalHealthPoints.map((item) => ({
            ...item,
            sell_through_pct: item.sell_through * 100,
            net_sales_w: item.net_sales / 10000,
            bubble_size: Math.max(8, Math.sqrt(item.net_sales / 12000)),
        }));
    }, [terminalHealthPoints]);

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

    const opsModeLabel = useMemo(() => getModeLabel(compareMode), [compareMode]);
    const opsDeltaLabel = useMemo(() => getDeltaLabel(compareMode), [compareMode]);
    const opsMomAvailable = useMemo(
        () => opsRowsWithCompare.some((row) => row.demand_base !== null || row.ship_base !== null),
        [opsRowsWithCompare],
    );
    const opsModeTip = useMemo(() => {
        if (compareMode === 'mom' && !opsMomAvailable) return '当前口径缺上季链路基线，差值项显示为 —。';
        if (compareMode === 'none') return '无对比模式下展示当前值。';
        return '';
    }, [compareMode, opsMomAvailable]);

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
                        : `${opsDeltaLabel} ${
                              opsCompareTotals.store_avg_demand_base === null
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
                        : `${opsDeltaLabel} ${
                              opsCompareTotals.store_avg_ship_base === null
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

    const opsScatterOption = useMemo<EChartsOption>(() => {
        const fillMidBase = compareMode !== 'none' ? opsCompareTotals.fill_rate_base : null;
        const reorderMidBase = compareMode !== 'none' ? opsCompareTotals.reorder_rate_base : null;
        const fillMid = (fillMidBase ?? opsThresholds.fill_rate) * 100;
        const reorderMid = (reorderMidBase ?? opsThresholds.reorder_rate) * 100;
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
                        `配货满足率：${fill.toFixed(1)}%`,
                        `追加订货率：${reorder.toFixed(1)}%`,
                        `区域业绩：${formatWanAmount(Number(row.actual_amt || 0))}`,
                        `象限：${quadrantDesc(fill, reorder, fillMid, reorderMid)}`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'value',
                name: '配货满足率(%)',
                min: 75,
                max: 100,
                axisLine: { lineStyle: { color: '#e2e8f0' } },
                axisLabel: { color: '#64748b', fontSize: 11 },
                splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                name: '追加订货率(%)',
                min: 6,
                max: 28,
                axisLine: { lineStyle: { color: '#e2e8f0' } },
                axisLabel: { color: '#64748b', fontSize: 11 },
                splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
            },
            series: [
                {
                    type: 'scatter',
                    data: opsScatterRows.map((row) => ({
                        ...row,
                        value: [row.fill_rate_pct, row.reorder_rate_pct, row.actual_amt_w],
                    })),
                    symbolSize: (value: number[]) => {
                        const amount = Number(value?.[2] || 0);
                        const ratio = (amount - opsScatterSizeRange.min) / Math.max(1, opsScatterSizeRange.max - opsScatterSizeRange.min);
                        return 14 + ratio * 24;
                    },
                    itemStyle: {
                        color: '#2563eb',
                        opacity: 0.75,
                        borderColor: '#1d4ed8',
                        borderWidth: 1,
                    },
                    emphasis: {
                        itemStyle: {
                            color: '#1d4ed8',
                            shadowBlur: 12,
                            shadowColor: 'rgba(37,99,235,0.25)',
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
        compareMode,
        opsCompareTotals.fill_rate_base,
        opsCompareTotals.reorder_rate_base,
        opsScatterRows,
        opsScatterSizeRange.max,
        opsScatterSizeRange.min,
        opsThresholds.fill_rate,
        opsThresholds.reorder_rate,
    ]);

    const opsScatterEvents = useMemo(() => ({
        click: (params: unknown) => {
            const region = (params as { data?: { region?: string } })?.data?.region || '';
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

    const opsInsightsView = useMemo(() => {
        if (compareMode === 'mom' && !opsMomAvailable) {
            return [
                { id: 'ops-mom-1', tone: 'warn' as const, text: '环比上季口径缺少链路基线，差值项已自动降级显示为 —。' },
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
    ]);

    const opsActionsView = useMemo(() => {
        if (compareMode === 'mom' && !opsMomAvailable) {
            return [
                { id: 'ops-mom-action-1', priority: '中' as const, text: '补齐上季区域链路基线（需求/配发/补单）后，再启用环比动作阈值。' },
                ...opsActions.slice(0, 4),
            ].slice(0, 5);
        }
        return opsActions.slice(0, 5);
    }, [compareMode, opsActions, opsMomAvailable]);

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4" style={{ order: 10 }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-blue-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">区域业绩达成（Target / Actual / Compare）</h2>
                    </div>
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
                                        if (option.key !== 'online') setSelectedEcomPlatform('all');
                                        setSelectedDrillRegion('');
                                        setSelectedDrillTier('all');
                                        setSelectedTerminalPointId('');
                                        setSelectedOpsRegion('');
                                    }}
                                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                        channelSystem === option.key
                                            ? 'bg-slate-900 text-white'
                                            : 'text-slate-600 hover:bg-white'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {channelSystem === 'online' && (
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 max-w-full overflow-x-auto">
                                <button
                                    onClick={() => {
                                        setSelectedEcomPlatform('all');
                                        setSelectedDrillRegion('');
                                        setSelectedOpsRegion('');
                                    }}
                                    className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                                        selectedEcomPlatform === 'all'
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
                                        className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                                            selectedEcomPlatform === platform
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
                    当前经营体系：{channelSystemLabel}。当前对比口径：{getModeLabel(compareMode)}。线上与线下采用独立运营口径，电商模式可按平台拆分查看。
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">目标销售额</div>
                        <div className="text-slate-900 font-semibold">{formatMoneyCny(regionTotals.target)}</div>
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
                                return `${regionLabel} ｜ 区域业绩占比 ${(row.share_pct || 0).toFixed(1)}%`;
                            }}
                            formatter={(value: number | string | undefined, name: string | undefined) => {
                                const numeric = Number(value);
                                const label = name ?? '-';
                                if (!Number.isFinite(numeric)) return ['—', label];
                                if (label === '目标' && compareMode === 'none') return null;
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
                                name="目标"
                                dataKey="target_amt"
                                fill="#94a3b8"
                                onClick={(payload: unknown) => {
                                    const region = getRegionFromPayload(payload);
                                    if (!region) return;
                                    if (filters.region === region) setFilters({ ...filters, region: 'all' });
                                    else setFilters({ ...filters, region });
                                }}
                            />
                        )}
                        {showOnlineBar && (
                            <Bar
                                yAxisId="left"
                                name={channelSystem === 'online' ? '实际-电商' : '实际-线上'}
                                dataKey="online_amt"
                                stackId="actual"
                                fill="#2563eb"
                                onClick={(payload: unknown) => {
                                    const region = getRegionFromPayload(payload);
                                    if (!region) return;
                                    if (filters.region === region) setFilters({ ...filters, region: 'all' });
                                    else setFilters({ ...filters, region });
                                }}
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
                                onClick={(payload: unknown) => {
                                    const region = getRegionFromPayload(payload);
                                    if (!region) return;
                                    if (filters.region === region) setFilters({ ...filters, region: 'all' });
                                    else setFilters({ ...filters, region });
                                }}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ order: 20 }}>
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

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4" style={{ order: 80 }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-sky-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">区域 → 城市线级 → 店铺下钻（店数 / 售罄 / 库存）</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {sectionScopeHint}
                        </span>
                        <button
                            onClick={() => setSelectedDrillTier('all')}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                        >
                            清空线级过滤
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        onClick={() => {
                            setSelectedDrillRegion('all');
                            setSelectedDrillTier('all');
                            setFilters({
                                ...filters,
                                region: 'all',
                            });
                        }}
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
                                setSelectedDrillRegion(regionOption.value);
                                setSelectedDrillTier('all');
                                setFilters({
                                    ...filters,
                                    region: regionOption.value,
                                });
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

                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        onClick={() => setSelectedDrillTier('all')}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            selectedDrillTier === 'all'
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        全部线级
                    </button>
                    {drillTierOptions.map((tier) => (
                        <button
                            key={`${activeDrillRegion}-${tier}`}
                            onClick={() => setSelectedDrillTier((prev) => (prev === tier ? 'all' : tier))}
                            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                selectedDrillTier === tier
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {tier}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-4">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-2">{activeDrillRegionLabel || '未选择区域'} · 城市线级表现</div>
                        <div className="space-y-2">
                            {cityRowsForRegion.length === 0 && (
                                <div className="text-xs text-slate-400">当前区域暂无城市线级数据</div>
                            )}
                            {cityRowsForRegion.map((row) => (
                                <button
                                    key={`${row.region}-${row.city_tier}`}
                                    onClick={() => setSelectedDrillTier((prev) => (prev === row.city_tier ? 'all' : row.city_tier))}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                        selectedDrillTier === row.city_tier
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{row.city_tier}</span>
                                        <span className="text-xs">{row.store_count}店</span>
                                    </div>
                                    <div className={`text-[11px] mt-1 ${selectedDrillTier === row.city_tier ? 'text-slate-200' : 'text-slate-500'}`}>
                                        销售 {formatMoneyCny(row.net_sales)} · 售罄 {(row.sell_through * 100).toFixed(1)}%
                                    </div>
                                    <div className={`text-[11px] ${selectedDrillTier === row.city_tier ? 'text-slate-200' : 'text-slate-500'}`}>
                                        库存 {row.inventory_units.toLocaleString()}双
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 overflow-x-auto">
                        <div className="text-sm font-semibold text-slate-900 mb-2">
                            店铺列表 {activeDrillRegionLabel ? `· ${activeDrillRegionLabel}` : ''} {selectedDrillTier !== 'all' ? `· ${selectedDrillTier}` : ''}
                        </div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">店铺</th>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">店态</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">店效</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">售罄</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">库存</th>
                                </tr>
                            </thead>
                            <tbody>
                                {storeRowsForDrill.length === 0 && (
                                    <tr>
                                        <td className="px-2 py-3 text-slate-400" colSpan={5}>暂无店铺下钻数据</td>
                                    </tr>
                                )}
                                {storeRowsForDrill.map((store) => (
                                    <tr
                                        key={store.store_id}
                                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                                        onClick={() =>
                                            setFilters({
                                                ...filters,
                                                region: store.region,
                                                city_tier: store.city_tier,
                                                store_format: store.store_format,
                                            })
                                        }
                                    >
                                        <td className="px-2 py-2 text-slate-700">
                                            <div className="font-medium">{store.store_name}</div>
                                            <div className="text-[11px] text-slate-400">
                                                {activeDrillRegion === 'all'
                                                    ? `${getRegionLabel(store.region)} · ${store.store_id}`
                                                    : store.store_id}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-slate-600">{store.store_format}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatMoneyCny(store.store_efficiency, 2, 2)}/SKU</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{(store.sell_through * 100).toFixed(1)}%</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{store.inventory_units.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4" style={{ order: 70 }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-violet-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">渠道/终端体检矩阵（库存周转 × 售罄率）</h2>
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {sectionScopeHint}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            X=库存周转 | Y=售罄率 | 气泡=销售额（自动亿/万）
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">
                    <div className="rounded-xl border border-slate-100 p-3">
                        <ResponsiveContainer width="100%" height={320}>
                            <ScatterChart margin={{ top: 12, right: 24, left: 12, bottom: 12 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    type="number"
                                    dataKey="inventory_turnover"
                                    name="库存周转"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickFormatter={(v) => `${v.toFixed(1)}x`}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="sell_through_pct"
                                    name="售罄率"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                                />
                                <ZAxis type="number" dataKey="net_sales_w" range={[80, 520]} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    formatter={(value: number | string | undefined, name: string | undefined) => {
                                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                                        if (name === 'inventory_turnover') return [`${numericValue.toFixed(2)}x`, '库存周转'];
                                        if (name === 'sell_through_pct') return [`${numericValue.toFixed(1)}%`, '售罄率'];
                                        if (name === 'net_sales_w') return [formatMoneyFromWan(numericValue), '销售额'];
                                        return [Number.isFinite(numericValue) ? numericValue.toFixed(2) : '--', name ?? '-'];
                                    }}
                                    labelFormatter={(_, payload) => {
                                        const row = payload?.[0]?.payload as {
                                            region?: string;
                                            city_tier?: string;
                                            store_format?: string;
                                            store_count?: number;
                                        } | undefined;
                                        if (!row) return '';
                                        return `${getRegionLabel(row.region || '')} / ${row.city_tier} / ${row.store_format}（${row.store_count || 0}店）`;
                                    }}
                                />
                                <Scatter
                                    name="终端体检"
                                    data={terminalScatterData}
                                    fill="#6366f1"
                                    fillOpacity={0.72}
                                    stroke="#4338ca"
                                    onClick={(node: unknown) => {
                                        const payload = getTerminalPointFromPayload((node as { payload?: unknown })?.payload);
                                        if (!payload) return;
                                        setSelectedTerminalPointId(payload.point_id);
                                        setSelectedDrillRegion(payload.region);
                                        setSelectedDrillTier(payload.city_tier);
                                        setFilters({
                                            ...filters,
                                            region: payload.region,
                                            city_tier: payload.city_tier,
                                            store_format: payload.store_format,
                                        });
                                    }}
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                        <div className="mt-2 text-xs text-slate-500">
                            点击气泡可联动筛选到 `区域 + 城市级别 + 店态`，并同步下钻店铺与风险 SKU 列表。
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                            <div className="text-sm font-semibold text-emerald-700 mb-2">效率红榜</div>
                            <div className="space-y-2">
                                {efficiencyLeaderboard.length === 0 && (
                                    <div className="text-xs text-slate-500">暂无满足条件的高效终端组合</div>
                                )}
                                {efficiencyLeaderboard.map((row, index) => (
                                    <button
                                        key={`good-${row.point_id}`}
                                        onClick={() => {
                                            setSelectedTerminalPointId(row.point_id);
                                            setSelectedDrillRegion(row.region);
                                            setSelectedDrillTier(row.city_tier);
                                            setFilters({
                                                ...filters,
                                                region: row.region,
                                                city_tier: row.city_tier,
                                                store_format: row.store_format,
                                            });
                                        }}
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
                                            售罄 {(row.sell_through * 100).toFixed(1)}% · 周转 {row.inventory_turnover.toFixed(2)}x
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                            <div className="text-sm font-semibold text-rose-700 mb-2">滞销黑榜</div>
                            <div className="space-y-2">
                                {laggingLeaderboard.length === 0 && (
                                    <div className="text-xs text-slate-500">暂无明显滞销终端组合</div>
                                )}
                                {laggingLeaderboard.map((row, index) => (
                                    <button
                                        key={`bad-${row.point_id}`}
                                        onClick={() => {
                                            setSelectedTerminalPointId(row.point_id);
                                            setSelectedDrillRegion(row.region);
                                            setSelectedDrillTier(row.city_tier);
                                            setFilters({
                                                ...filters,
                                                region: row.region,
                                                city_tier: row.city_tier,
                                                store_format: row.store_format,
                                            });
                                        }}
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
                                            {row.diagnosis}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4" style={{ order: 30 }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">区域 × 渠道 热力矩阵</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {sectionScopeHint}
                        </span>
                        {(['net_sales', 'sell_through', 'gm_rate'] as HeatMetric[]).map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setRegionHeatMetric(metric)}
                                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                    regionHeatMetric === metric
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

            <div style={{ order: 50 }}>
                <div className="mb-2 flex justify-end">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                        {sectionScopeHint}
                    </span>
                </div>
                <StoreEfficiencyStrategyPanel
                    channelSystem={channelSystem}
                    storeFormatMix={storeFormatMix}
                    formatTierMatrix={formatTierMatrix}
                    cityTierBucketMatrix={cityTierBucketMatrix}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4" style={{ order: 40 }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Regional Ops Dashboard</div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900">
                            区域企划运营链路（需求→发货→执行→补单→店效）
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            需求=订货需求，发货=配货出库，执行率=配货满足率，补单率=追加订货率。
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
                        <ReactECharts option={opsHeatOption} style={{ height: 340, width: '100%' }} notMerge lazyUpdate />
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-1">图2：执行率 vs 补单率 四象限气泡散点图</div>
                        <div className="text-xs text-slate-500 mb-2">X=配货满足率，Y=追加订货率，气泡大小=区域业绩。</div>
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
                                    <div>
                                        <span className="text-emerald-600 font-semibold">第一象限</span>
                                        ：高满足 + 高补单，需求强劲，核心款追加。
                                    </div>
                                    <div>
                                        <span className="text-rose-600 font-semibold">第二象限</span>
                                        ：低满足 + 高补单，供给不足（优先调拨）。
                                    </div>
                                    <div>
                                        <span className="text-slate-600 font-semibold">第三象限</span>
                                        ：低满足 + 低补单，需求疲软（谨慎配发控库存）。
                                    </div>
                                    <div>
                                        <span className="text-sky-700 font-semibold">第四象限</span>
                                        ：高满足 + 低补单，供需健康平衡。
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">区域链路联动明细（点击气泡高亮）</div>
                        <div className="text-xs text-slate-500">
                            {activeOpsRow
                                ? `${getRegionLabel(activeOpsRow.region)}：执行率 ${(activeOpsRow.fill_rate * 100).toFixed(1)}% ｜ 补单率 ${(activeOpsRow.reorder_rate * 100).toFixed(1)}% ｜ ${opsModeLabel}`
                                : '点击上方气泡查看区域明细'}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-slate-500 font-semibold whitespace-nowrap">大区</th>
                                    <th className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">区域业绩</th>
                                    <th className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">订货需求</th>
                                    <th className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">配货出库</th>
                                    <th className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">执行率</th>
                                    <th className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">补单率</th>
                                    <th className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">店均订货</th>
                                    <th className="px-3 py-2 text-right text-slate-500 font-semibold whitespace-nowrap">店均发货</th>
                                    <th className="px-3 py-2 text-left text-slate-500 font-semibold whitespace-nowrap">风险标签</th>
                                    <th className="px-3 py-2 text-left text-slate-500 font-semibold whitespace-nowrap">智能策略</th>
                                </tr>
                            </thead>
                            <tbody>
                                {opsRowsWithCompare.map((row) => {
                                    const isActive = row.region === activeOpsRegion;
                                    return (
                                        <tr
                                            key={row.region}
                                            onClick={() => setSelectedOpsRegion(row.region)}
                                            className={`border-t border-slate-100 cursor-pointer transition-colors ${
                                                isActive ? 'bg-sky-50/60' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <td className="px-3 py-2 text-slate-800 font-semibold">{getRegionLabel(row.region)}</td>
                                            <td className="px-3 py-2 text-right text-slate-700">{formatWanAmount(row.actual_amt)}</td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                                <div>{formatWanPairs(row.demand)}</div>
                                                <div className={`text-[11px] ${deltaClass(row.demand_delta)}`}>
                                                    {deltaArrow(row.demand_delta)} {formatDelta(row.demand_delta, '%')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                                <div>{formatWanPairs(row.ship)}</div>
                                                <div className={`text-[11px] ${deltaClass(row.ship_delta)}`}>
                                                    {deltaArrow(row.ship_delta)} {formatDelta(row.ship_delta, '%')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                                <div>{(row.fill_rate * 100).toFixed(1)}%</div>
                                                <div className={`text-[11px] ${deltaClass(row.fill_delta)}`}>
                                                    {deltaArrow(row.fill_delta)} {formatDelta(row.fill_delta, 'pp')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                                <div>{(row.reorder_rate * 100).toFixed(1)}%</div>
                                                <div className={`text-[11px] ${deltaClass(row.reorder_delta)}`}>
                                                    {deltaArrow(row.reorder_delta)} {formatDelta(row.reorder_delta, 'pp')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                                <div>{Math.round(row.store_avg_demand)}双</div>
                                                <div className={`text-[11px] ${deltaClass(row.store_avg_demand_delta)}`}>
                                                    {deltaArrow(row.store_avg_demand_delta)} {formatDelta(row.store_avg_demand_delta, '%')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                                <div>{Math.round(row.store_avg_ship)}双</div>
                                                <div className={`text-[11px] ${deltaClass(row.store_avg_ship_delta)}`}>
                                                    {deltaArrow(row.store_avg_ship_delta)} {formatDelta(row.store_avg_ship_delta, '%')}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {row.risk_tags.map((tag) => (
                                                        <span
                                                            key={`${row.region}-${tag}`}
                                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${riskTagClass(tag)}`}
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 min-w-[280px]">{row.strategy}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                action.priority === '高'
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

        </div>
    );
}

