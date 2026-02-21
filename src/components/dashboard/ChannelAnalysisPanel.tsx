import { useMemo, useState } from 'react';
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
import { DashboardFilters } from '@/hooks/useDashboardFilter';
import { useChannelAnalysis } from '@/hooks/useChannelAnalysis';

type HeatMetric = 'net_sales' | 'sell_through' | 'gm_rate';

function getRegionFromPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return '';
    return (payload as { region?: string }).region || '';
}

function getStoreFormatFromPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return '';
    return (payload as { store_format?: string }).store_format || '';
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

function formatMetric(metric: HeatMetric, value: number) {
    if (!Number.isFinite(value) || value <= 0) return '-';
    if (metric === 'net_sales') return `${(value / 10000).toFixed(1)}万`;
    return `${(value * 100).toFixed(1)}%`;
}

function heatColor(metric: HeatMetric, value: number, min: number, max: number) {
    if (!Number.isFinite(value) || value <= 0 || max <= min) return '#f8fafc';
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

    if (metric === 'net_sales') return `rgba(37, 99, 235, ${0.15 + ratio * 0.55})`;
    if (metric === 'sell_through') return `rgba(16, 185, 129, ${0.15 + ratio * 0.55})`;
    return `rgba(217, 119, 6, ${0.15 + ratio * 0.55})`;
}

export default function ChannelAnalysisPanel({
    filters,
    setFilters,
}: {
    filters: DashboardFilters;
    setFilters: (f: DashboardFilters) => void;
}) {
    const {
        regionPerformance,
        regionSplitStats,
        regionChannelMatrix,
        cityTierBucketMatrix,
        cityTierBucketTopStores,
        storeFormatMix,
        formatTierMatrix,
        regionCityEfficiency,
        regionDrillOrder,
        storeDrillList,
        terminalHealthPoints,
        efficiencyLeaderboard,
        laggingLeaderboard,
    } = useChannelAnalysis(filters);

    const [regionHeatMetric, setRegionHeatMetric] = useState<HeatMetric>('net_sales');
    const [formatTierMetric, setFormatTierMetric] = useState<HeatMetric>('net_sales');
    const [selectedTierBucketKey, setSelectedTierBucketKey] = useState<string>('');
    const [selectedDrillRegion, setSelectedDrillRegion] = useState<string>('');
    const [selectedDrillTier, setSelectedDrillTier] = useState<string>('all');
    const [selectedTerminalPointId, setSelectedTerminalPointId] = useState<string>('');

    const regionSplitMap = useMemo(() => {
        const map = new Map<string, (typeof regionSplitStats)[number]>();
        regionSplitStats.forEach((item) => {
            map.set(item.region, item);
        });
        return map;
    }, [regionSplitStats]);

    const regionKpiData = useMemo(() => {
        return regionPerformance.map((item) => ({
            ...item,
            target_w: Math.round(item.target_sales / 10000),
            actual_w: Math.round(item.net_sales / 10000),
            online_w: Math.round((regionSplitMap.get(item.region)?.onlineSales || 0) / 10000),
            offline_w: Math.round((regionSplitMap.get(item.region)?.offlineSales || 0) / 10000),
            yoy_pct: item.yoy_rate * 100,
            achv_pct: item.achv_rate * 100,
        }));
    }, [regionPerformance, regionSplitMap]);

    const regionTotals = useMemo(() => {
        const actual = regionPerformance.reduce((sum, item) => sum + item.net_sales, 0);
        const target = regionPerformance.reduce((sum, item) => sum + item.target_sales, 0);
        const yoy = regionPerformance.reduce((sum, item) => sum + item.yoy_sales, 0);
        return {
            actual,
            target,
            yoy,
            achv: target > 0 ? actual / target : 0,
            yoyRate: yoy > 0 ? (actual - yoy) / yoy : 0,
        };
    }, [regionPerformance]);

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

    const cityTierBucketCellMap = useMemo(() => {
        const map = new Map<string, (typeof cityTierBucketMatrix.cells)[number]>();
        cityTierBucketMatrix.cells.forEach((cell) => {
            map.set(`${cell.city_tier}__${cell.sales_bucket}`, cell);
        });
        return map;
    }, [cityTierBucketMatrix]);

    const defaultTierBucketKey = useMemo(() => {
        const sorted = [...cityTierBucketMatrix.cells].sort((a, b) => b.net_sales - a.net_sales);
        if (!sorted.length) return '';
        return `${sorted[0].city_tier}__${sorted[0].sales_bucket}`;
    }, [cityTierBucketMatrix.cells]);

    const activeTierBucketKey = selectedTierBucketKey || defaultTierBucketKey;
    const activeTierBucketTopStores = activeTierBucketKey ? (cityTierBucketTopStores[activeTierBucketKey] || []) : [];

    const [activeTier, activeBucket] = activeTierBucketKey.split('__');

    const storeFormatMixChartData = useMemo(() => {
        return storeFormatMix.map((item) => ({
            ...item,
            store_count_pct: item.store_count_share * 100,
            sales_pct: item.sales_share * 100,
        }));
    }, [storeFormatMix]);

    const formatTierCellMap = useMemo(() => {
        const map = new Map<string, (typeof formatTierMatrix.cells)[number]>();
        formatTierMatrix.cells.forEach((cell) => {
            map.set(`${cell.store_format}__${cell.city_tier}`, cell);
        });
        return map;
    }, [formatTierMatrix]);

    const formatTierRange = useMemo(() => {
        const values = formatTierMatrix.cells
            .map((cell) => cell[formatTierMetric])
            .filter((value) => Number.isFinite(value) && value > 0);
        if (values.length === 0) return { min: 0, max: 1 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [formatTierMatrix.cells, formatTierMetric]);

    const regionDeltaRanking = useMemo(() => {
        const rows = regionPerformance
            .filter((item) => item.yoy_sales > 0)
            .map((item) => ({
                ...item,
                delta_sales: item.net_sales - item.yoy_sales,
            }))
            .sort((a, b) => b.delta_sales - a.delta_sales);
        return {
            topGrow: rows.slice(0, 3),
            topDrag: [...rows].reverse().slice(0, 3),
        };
    }, [regionPerformance]);

    const activeDrillRegion = useMemo(() => {
        if (filters.region !== 'all') return filters.region;
        if (selectedDrillRegion) return selectedDrillRegion;
        return regionDrillOrder[0] || '';
    }, [filters.region, regionDrillOrder, selectedDrillRegion]);

    const cityRowsForRegion = useMemo(() => {
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
                if (store.region !== activeDrillRegion) return false;
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

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-blue-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">区域业绩达成（Target / Actual / YoY）</h2>
                    </div>
                    {filters.region !== 'all' && (
                        <button
                            onClick={() => setFilters({ ...filters, region: 'all' })}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                        >
                            清除区域 {filters.region}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">目标销售额</div>
                        <div className="text-slate-900 font-semibold">{(regionTotals.target / 10000).toFixed(1)}万</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">实际销售额</div>
                        <div className="text-slate-900 font-semibold">{(regionTotals.actual / 10000).toFixed(1)}万</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">整体达成率</div>
                        <div className={`font-semibold ${regionTotals.achv >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {(regionTotals.achv * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-slate-500 mb-1">整体同比</div>
                        <div className={`font-semibold ${regionTotals.yoyRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {(regionTotals.yoyRate * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={regionKpiData} margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis yAxisId="left" tickFormatter={(v) => `${v}万`} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip />
                        <Legend />
                        <Bar
                            yAxisId="left"
                            name="目标"
                            dataKey="target_w"
                            fill="#94a3b8"
                            onClick={(payload: unknown) => {
                                const region = getRegionFromPayload(payload);
                                if (!region) return;
                                if (filters.region === region) setFilters({ ...filters, region: 'all' });
                                else setFilters({ ...filters, region });
                            }}
                        />
                        <Bar
                            yAxisId="left"
                            name="实际-线上"
                            dataKey="online_w"
                            stackId="actual"
                            fill="#2563eb"
                            onClick={(payload: unknown) => {
                                const region = getRegionFromPayload(payload);
                                if (!region) return;
                                if (filters.region === region) setFilters({ ...filters, region: 'all' });
                                else setFilters({ ...filters, region });
                            }}
                        />
                        <Bar
                            yAxisId="left"
                            name="实际-线下"
                            dataKey="offline_w"
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
                        <Line yAxisId="right" type="monotone" name="同比%" dataKey="yoy_pct" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="text-sm font-semibold text-emerald-700 mb-3">Top3 增长区域（同比增量）</div>
                    <div className="space-y-2">
                        {regionDeltaRanking.topGrow.length === 0 && (
                            <div className="text-xs text-slate-400">暂无同比基线数据</div>
                        )}
                        {regionDeltaRanking.topGrow.map((item, index) => (
                            <div key={`${item.region}-grow`} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                                <div className="text-sm text-slate-700">{index + 1}. {item.region}</div>
                                <div className="text-right">
                                    <div className="text-xs font-semibold text-emerald-700">+{(item.delta_sales / 10000).toFixed(1)}万</div>
                                    <div className="text-[11px] text-slate-500">同比 {(item.yoy_rate * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="text-sm font-semibold text-rose-700 mb-3">Top3 拖累区域（同比增量）</div>
                    <div className="space-y-2">
                        {regionDeltaRanking.topDrag.length === 0 && (
                            <div className="text-xs text-slate-400">暂无同比基线数据</div>
                        )}
                        {regionDeltaRanking.topDrag.map((item, index) => (
                            <div key={`${item.region}-drag`} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2">
                                <div className="text-sm text-slate-700">{index + 1}. {item.region}</div>
                                <div className="text-right">
                                    <div className={`text-xs font-semibold ${item.delta_sales >= 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                                        {(item.delta_sales / 10000).toFixed(1)}万
                                    </div>
                                    <div className="text-[11px] text-slate-500">同比 {(item.yoy_rate * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-sky-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">区域 → 城市线级 → 店铺下钻（店数 / 售罄 / 库存）</h2>
                    </div>
                    <button
                        onClick={() => setSelectedDrillTier('all')}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                    >
                        清空线级过滤
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {regionDrillOrder.map((region) => (
                        <button
                            key={region}
                            onClick={() => {
                                setSelectedDrillRegion(region);
                                setSelectedDrillTier('all');
                                setFilters({
                                    ...filters,
                                    region: filters.region === region ? 'all' : region,
                                });
                            }}
                            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                activeDrillRegion === region
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {region}
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
                        <div className="text-sm font-semibold text-slate-900 mb-2">{activeDrillRegion || '未选择区域'} · 城市线级表现</div>
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
                                        销售 {(row.net_sales / 10000).toFixed(1)}万 · 售罄 {(row.sell_through * 100).toFixed(1)}%
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
                            店铺列表 {activeDrillRegion ? `· ${activeDrillRegion}` : ''} {selectedDrillTier !== 'all' ? `· ${selectedDrillTier}` : ''}
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
                                            <div className="text-[11px] text-slate-400">{store.store_id}</div>
                                        </td>
                                        <td className="px-2 py-2 text-slate-600">{store.store_format}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{(store.store_efficiency / 10000).toFixed(2)}万/SKU</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{(store.sell_through * 100).toFixed(1)}%</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{store.inventory_units.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-violet-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">渠道/终端体检矩阵（库存周转 × 售罄率）</h2>
                    </div>
                    <div className="text-xs text-slate-500">
                        X=库存周转 | Y=售罄率 | 气泡=销售额（万元）
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
                                        if (name === 'net_sales_w') return [`${numericValue.toFixed(1)}万`, '销售额'];
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
                                        return `${row.region} / ${row.city_tier} / ${row.store_format}（${row.store_count || 0}店）`;
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
                                            {index + 1}. {row.region} / {row.city_tier} / {row.store_format}
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
                                            {index + 1}. {row.region} / {row.city_tier} / {row.store_format}
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

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">区域 × 渠道 热力矩阵</h2>
                    </div>
                    <div className="flex items-center gap-2">
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
                                    <td className="text-sm text-slate-700 font-medium px-2 py-2 whitespace-nowrap">{region}</td>
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

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-fuchsia-500 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">城市级别 × 业绩规模矩阵</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-1">
                            <thead>
                                <tr>
                                    <th className="text-left text-xs text-slate-500 px-2 py-2">城市级别</th>
                                    {cityTierBucketMatrix.buckets.map((bucket) => (
                                        <th key={bucket} className="text-xs text-slate-500 font-medium px-3 py-2">
                                            {bucket}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cityTierBucketMatrix.tiers.map((tier) => (
                                    <tr key={tier}>
                                        <td className="text-sm text-slate-700 font-medium px-2 py-2 whitespace-nowrap">{tier}</td>
                                        {cityTierBucketMatrix.buckets.map((bucket) => {
                                            const key = `${tier}__${bucket}`;
                                            const cell = cityTierBucketCellMap.get(key);
                                            const isActive = activeTierBucketKey === key;
                                            return (
                                                <td key={key} className="px-1 py-1">
                                                    <button
                                                        onClick={() =>
                                                            setSelectedTierBucketKey((prev) => (prev === key ? '' : key))
                                                        }
                                                        className={`w-full rounded-md border text-xs px-2 py-2 text-left ${
                                                            isActive
                                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div>店数 {cell?.store_count ?? 0}</div>
                                                        <div className={isActive ? 'text-slate-200' : 'text-slate-500'}>
                                                            业绩占比 {((cell?.sales_share ?? 0) * 100).toFixed(1)}%
                                                        </div>
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-2">
                            Top10 店铺 {activeTier ? `· ${activeTier}` : ''} {activeBucket ? `· ${activeBucket}` : ''}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-auto">
                            {activeTierBucketTopStores.length === 0 && (
                                <div className="text-xs text-slate-400">暂无可下钻店铺数据</div>
                            )}
                            {activeTierBucketTopStores.map((store, index) => (
                                <div key={`${store.store_id}-${index}`} className="flex items-center justify-between text-xs">
                                    <div className="min-w-0">
                                        <div className="text-slate-700 truncate">{index + 1}. {store.store_name}</div>
                                        <div className="text-slate-400">{store.store_id}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-slate-900">{(store.net_sales / 10000).toFixed(1)}万</div>
                                        <div className="text-slate-400">{(store.sales_share * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-emerald-500 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">店态结构（店数占比 vs 业绩占比）</h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={storeFormatMixChartData} margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="store_format" tick={{ fontSize: 10, fill: '#475569' }} />
                        <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip />
                        <Legend />
                        <Bar
                            yAxisId="left"
                            name="店数占比%"
                            dataKey="store_count_pct"
                            fill="#10b981"
                            radius={[6, 6, 0, 0]}
                            onClick={(payload: unknown) => {
                                const storeFormat = getStoreFormatFromPayload(payload);
                                if (!storeFormat) return;
                                if (filters.store_format === storeFormat) setFilters({ ...filters, store_format: 'all' });
                                else setFilters({ ...filters, store_format: storeFormat });
                            }}
                        />
                        <Line yAxisId="right" type="monotone" name="业绩占比%" dataKey="sales_pct" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-cyan-500 inline-block" />
                        <h2 className="text-base font-bold text-slate-900">店态 × 城市级别 交叉矩阵</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['net_sales', 'sell_through', 'gm_rate'] as HeatMetric[]).map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setFormatTierMetric(metric)}
                                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                    formatTierMetric === metric
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
                                <th className="text-left text-xs text-slate-500 px-2 py-2">店态 \ 城市级别</th>
                                {formatTierMatrix.tiers.map((tier) => (
                                    <th key={tier} className="text-xs text-slate-500 font-medium px-3 py-2 whitespace-nowrap">
                                        {tier}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {formatTierMatrix.formats.map((format) => (
                                <tr key={format}>
                                    <td className="text-sm text-slate-700 font-medium px-2 py-2 whitespace-nowrap">{format}</td>
                                    {formatTierMatrix.tiers.map((tier) => {
                                        const key = `${format}__${tier}`;
                                        const cell = formatTierCellMap.get(key);
                                        const value = cell ? cell[formatTierMetric] : 0;
                                        const bg = heatColor(formatTierMetric, value, formatTierRange.min, formatTierRange.max);
                                        const isActive =
                                            (filters.store_format === 'all' || filters.store_format === format) &&
                                            (filters.city_tier === 'all' || filters.city_tier === tier);
                                        return (
                                            <td key={key} className="px-1 py-1">
                                                <button
                                                    onClick={() =>
                                                        setFilters({
                                                            ...filters,
                                                            store_format: filters.store_format === format ? 'all' : format,
                                                            city_tier: filters.city_tier === tier ? 'all' : tier,
                                                        })
                                                    }
                                                    className="w-full rounded-md border border-slate-200 text-xs px-2 py-2 text-left text-slate-800 transition-opacity"
                                                    style={{ backgroundColor: bg, opacity: isActive ? 1 : 0.42 }}
                                                >
                                                    <div>{formatMetric(formatTierMetric, value)}</div>
                                                    <div className="text-[11px] text-slate-600">店数 {cell?.store_count ?? 0}</div>
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
        </div>
    );
}

