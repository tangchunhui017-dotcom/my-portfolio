'use client';

import { useMemo, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import wavePlanRaw from '@/../data/dashboard/dim_wave_plan.json';
import channelRaw from '@/../data/dashboard/dim_channel.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import factInventoryRaw from '@/../data/dashboard/fact_inventory.json';
import factPlanRaw from '@/../data/dashboard/fact_plan.json';
import { DEMO_TO_STANDARD_CATEGORY_MAP, FOOTWEAR_CATEGORY_TAXONOMY } from '@/config/footwearLanguage';

interface WavePlan {
    id: string;
    season: string;
    wave: string;
    launch_date: string;
    theme: string;
    temp_zone: string;
    sku_plan: number;
    sku_actual: number;
    new_ratio: number;
    old_ratio: number;
    units_plan?: number;
    revenue_plan?: number;
    category_mix: Record<string, number>;
}

interface DimChannel {
    channel_id: string;
    channel_type: string;
    channel_name?: string;
    region: string;
    is_online: boolean;
}

interface DimSku {
    sku_id: string;
    sku_name?: string;
    price_band?: string;
    launch_wave?: string;
    category_id?: string;
    category_name?: string;
    msrp?: number;
    lifecycle?: string;
}

interface FactSalesRecord {
    sku_id: string;
    channel_id: string;
    season_year?: string;
    wave?: string;
    week_num: number;
    unit_sold: number;
    gross_sales_amt?: number;
    discount_rate?: number;
    net_sales_amt: number;
    gross_margin_rate: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface MatrixCell {
    sku_plan: number;
    mix_share: number;
}

interface AssortRow {
    category_l1: string;
    category_l2: string;
    total_sku: number;
    wave_values: Record<string, MatrixCell>;
}

interface HistoryPriceBandRow {
    price_band: string;
    sku_cnt: number;
    sku_share: number;
    sales_share: number;
    gm_share: number;
}

interface HistoryCategoryRow {
    category: string;
    sku_cnt: number;
    units: number;
    net_sales: number;
    gross_profit: number;
    gm_rate: number;
    sell_through: number;
}

interface HistoryChannelRow {
    channel_type: string;
    sales_share: number;
    avg_discount_rate: number;
    sell_through: number;
    sales_per_sku: number;
}

interface HistoryRiskPatternRow {
    category: string;
    price_band: string;
    channel_type: string;
    sku_count: number;
    avg_sell_through: number;
    avg_inventory: number;
}

interface LifecycleCurveRow {
    week: string;
    week_no: number;
    newness: number;
    core: number;
    clearance: number;
}

interface ForecastMixRow {
    wave_id: string;
    season: string;
    wave: string;
    category_l1: string;
    channel_type: string;
    forecast_units: number;
    forecast_sales: number;
}

interface FactInventoryRecord {
    date: string;
    store_id: string;
    sku_id: string;
    bop_qty: number;
    inbound_qty: number;
    transfer_in: number;
    transfer_out: number;
    sales_qty: number;
    off_shelf_qty: number;
    damage_qty: number;
    eop_qty: number;
    inventory_amount: number;
}

interface FactPlanRecord {
    year: number;
    season: string;
    wave: string;
    plan_sku: number;
    plan_sales: number;
    plan_gm: number;
    plan_buy_units: number;
    plan_otb_budget: number;
    plan_opening_inventory: number;
    plan_closing_inventory: number;
}

interface OtbTierRow {
    tier: string;
    ratio: number;
    budget: number;
    units: number;
    note: string;
}

const wavePlans = wavePlanRaw as WavePlan[];
const channels = channelRaw as DimChannel[];
const dimSkus = dimSkuRaw as DimSku[];
const factSales = factSalesRaw as FactSalesRecord[];
const factInventory = factInventoryRaw as FactInventoryRecord[];
const factPlan = factPlanRaw as FactPlanRecord[];

const CATEGORY_TREE: Record<string, string[]> = FOOTWEAR_CATEGORY_TAXONOMY.reduce((acc, item) => {
    acc[item.category_l1] = item.category_l2;
    return acc;
}, {} as Record<string, string[]>);

const CATEGORY_L1_ORDER = FOOTWEAR_CATEGORY_TAXONOMY.map((item) => item.category_l1);

const REGION_TEMP_MAP: Record<string, { temp_range: string; bucket: 'cold' | 'mild' | 'warm' | 'mixed' }> = {
    华北: { temp_range: '冷凉带 5-18℃', bucket: 'cold' },
    华东: { temp_range: '温和带 10-24℃', bucket: 'mild' },
    华南: { temp_range: '暖热带 18-32℃', bucket: 'warm' },
    西南: { temp_range: '温热带 12-28℃', bucket: 'warm' },
    西北: { temp_range: '冷凉带 0-16℃', bucket: 'cold' },
    东北: { temp_range: '冷凉带 -5-12℃', bucket: 'cold' },
    全国统管: { temp_range: '多温域混合', bucket: 'mixed' },
};

const BUCKET_WAVE_RECOMMEND: Record<'cold' | 'mild' | 'warm' | 'mixed', number[]> = {
    cold: [1, 2],
    mild: [2, 3],
    warm: [3, 4],
    mixed: [1, 2, 3, 4],
};

function parseWaveNo(wave: string) {
    const match = wave.match(/\d+/);
    if (!match) return 0;
    return Number(match[0]);
}

function getLaunchStatus(bucket: 'cold' | 'mild' | 'warm' | 'mixed', wave: string) {
    const waveNo = parseWaveNo(wave);
    const recommended = BUCKET_WAVE_RECOMMEND[bucket];
    const min = Math.min(...recommended);
    if (recommended.includes(waveNo)) return { label: '匹配', className: 'text-emerald-600 bg-emerald-50' };
    if (waveNo < min) return { label: '偏早', className: 'text-amber-600 bg-amber-50' };
    return { label: '偏晚', className: 'text-rose-600 bg-rose-50' };
}

function splitCount(total: number, count: number) {
    if (count <= 0) return [];
    if (count === 1) return [total];
    if (count === 2) {
        const first = Math.round(total * 0.6);
        return [first, total - first];
    }
    const weights = [0.45, 0.35, 0.2];
    const first = Math.round(total * weights[0]);
    const second = Math.round(total * weights[1]);
    const third = Math.max(total - first - second, 0);
    return [first, second, third];
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function normalizeWaveCode(wave: string | undefined) {
    if (!wave) return '';
    const match = wave.match(/\d+/);
    if (!match) return wave.toUpperCase();
    return `W${Number(match[0])}`;
}

function formatPct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

function formatPct100(value: number) {
    return `${value.toFixed(1)}%`;
}

function formatWan(value: number) {
    return `${(value / 10000).toFixed(1)}万`;
}

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function sortPriceBand(a: string, b: string) {
    const va = Number((a.match(/\d+/) || ['999'])[0]);
    const vb = Number((b.match(/\d+/) || ['999'])[0]);
    if (va !== vb) return va - vb;
    return a.localeCompare(b, 'zh-CN');
}

function normalizeLifecycle(lifecycle: string | undefined): '新品' | '常青' | '清仓' {
    if (!lifecycle) return '常青';
    if (lifecycle.includes('新')) return '新品';
    if (lifecycle.includes('清')) return '清仓';
    return '常青';
}

export default function WavePlanningPanel() {
    const orderedWaves = useMemo(() => {
        return [...wavePlans].sort((a, b) => +new Date(a.launch_date) - +new Date(b.launch_date));
    }, []);
    const [selectedPaceWaveId, setSelectedPaceWaveId] = useState<string>('');
    const [selectedForecastWaveId, setSelectedForecastWaveId] = useState<string>('');
    const [otbTargetSellThrough, setOtbTargetSellThrough] = useState<number>(82);
    const [otbGmFloor, setOtbGmFloor] = useState<number>(44);
    const [otbBudgetCap, setOtbBudgetCap] = useState<number>(0);
    const [tier1Ratio, setTier1Ratio] = useState<number>(55);
    const [tier2Ratio, setTier2Ratio] = useState<number>(30);
    const [tier3Ratio, setTier3Ratio] = useState<number>(15);

    const skuMap = useMemo(() => {
        const map: Record<string, DimSku> = {};
        dimSkus.forEach((sku) => { map[sku.sku_id] = sku; });
        return map;
    }, []);

    const channelMap = useMemo(() => {
        const map: Record<string, DimChannel> = {};
        channels.forEach((channel) => { map[channel.channel_id] = channel; });
        return map;
    }, []);

    const latestWeekBySku = useMemo(() => {
        const map: Record<string, number> = {};
        factSales.forEach((record) => {
            const current = map[record.sku_id] || 0;
            if (record.week_num > current) map[record.sku_id] = record.week_num;
        });
        return map;
    }, []);

    const skuLatestState = useMemo(() => {
        const latestState: Record<string, {
            on_hand: number;
            st_weighted: number;
            st_weight: number;
            channel_sales: Record<string, number>;
        }> = {};

        factSales.forEach((record) => {
            if ((latestWeekBySku[record.sku_id] || 0) !== record.week_num) return;
            if (!latestState[record.sku_id]) {
                latestState[record.sku_id] = {
                    on_hand: 0,
                    st_weighted: 0,
                    st_weight: 0,
                    channel_sales: {},
                };
            }
            const item = latestState[record.sku_id];
            const weight = Math.max(record.unit_sold || 0, 1);
            const channelType = channelMap[record.channel_id]?.channel_type || '未知';
            item.on_hand += record.on_hand_unit || 0;
            item.st_weighted += (record.cumulative_sell_through || 0) * weight;
            item.st_weight += weight;
            item.channel_sales[channelType] = (item.channel_sales[channelType] || 0) + (record.net_sales_amt || 0);
        });

        return Object.entries(latestState).reduce<Record<string, {
            latest_st: number;
            on_hand: number;
            dominant_channel: string;
        }>>((acc, [skuId, item]) => {
            const dominantChannel = Object.entries(item.channel_sales)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || '未知';
            acc[skuId] = {
                latest_st: safeDiv(item.st_weighted, item.st_weight),
                on_hand: item.on_hand,
                dominant_channel: dominantChannel,
            };
            return acc;
        }, {});
    }, [channelMap, latestWeekBySku]);

    const historyPriceBandRows = useMemo<HistoryPriceBandRow[]>(() => {
        const agg: Record<string, { sku_set: Set<string>; net_sales: number; gross_profit: number }> = {};
        factSales.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const priceBand = sku.price_band || '未分带';
            if (!agg[priceBand]) {
                agg[priceBand] = { sku_set: new Set<string>(), net_sales: 0, gross_profit: 0 };
            }
            agg[priceBand].sku_set.add(record.sku_id);
            agg[priceBand].net_sales += record.net_sales_amt || 0;
            agg[priceBand].gross_profit += (record.net_sales_amt || 0) * (record.gross_margin_rate || 0);
        });

        const rows = Object.entries(agg).map(([price_band, item]) => ({
            price_band,
            sku_cnt: item.sku_set.size,
            net_sales: item.net_sales,
            gross_profit: item.gross_profit,
        }));
        const totalSku = rows.reduce((sum, row) => sum + row.sku_cnt, 0);
        const totalSales = rows.reduce((sum, row) => sum + row.net_sales, 0);
        const totalGm = rows.reduce((sum, row) => sum + row.gross_profit, 0);

        return rows
            .map((row) => ({
                price_band: row.price_band,
                sku_cnt: row.sku_cnt,
                sku_share: safeDiv(row.sku_cnt, totalSku),
                sales_share: safeDiv(row.net_sales, totalSales),
                gm_share: safeDiv(row.gross_profit, totalGm),
            }))
            .sort((a, b) => sortPriceBand(a.price_band, b.price_band));
    }, [skuMap]);

    const historyCategoryRows = useMemo<HistoryCategoryRow[]>(() => {
        const agg: Record<string, { sku_set: Set<string>; units: number; net_sales: number; gross_profit: number }> = {};
        factSales.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const category = sku.category_id || sku.category_name || '未知品类';
            if (!agg[category]) {
                agg[category] = { sku_set: new Set<string>(), units: 0, net_sales: 0, gross_profit: 0 };
            }
            agg[category].sku_set.add(record.sku_id);
            agg[category].units += record.unit_sold || 0;
            agg[category].net_sales += record.net_sales_amt || 0;
            agg[category].gross_profit += (record.net_sales_amt || 0) * (record.gross_margin_rate || 0);
        });

        return Object.entries(agg)
            .map(([category, item]) => {
                const skuIds = Array.from(item.sku_set);
                const avgSt = skuIds.length > 0
                    ? skuIds.reduce((sum, skuId) => sum + (skuLatestState[skuId]?.latest_st || 0), 0) / skuIds.length
                    : 0;
                return {
                    category,
                    sku_cnt: skuIds.length,
                    units: item.units,
                    net_sales: item.net_sales,
                    gross_profit: item.gross_profit,
                    gm_rate: safeDiv(item.gross_profit, item.net_sales),
                    sell_through: avgSt,
                };
            })
            .sort((a, b) => b.net_sales - a.net_sales);
    }, [skuLatestState, skuMap]);

    const historyChannelRows = useMemo<HistoryChannelRow[]>(() => {
        const agg: Record<string, {
            net_sales: number;
            gross_sales: number;
            st_weighted: number;
            st_weight: number;
            sku_set: Set<string>;
        }> = {};

        factSales.forEach((record) => {
            const channel = channelMap[record.channel_id];
            if (!channel) return;
            const key = channel.channel_type;
            if (!agg[key]) {
                agg[key] = { net_sales: 0, gross_sales: 0, st_weighted: 0, st_weight: 0, sku_set: new Set<string>() };
            }
            const item = agg[key];
            const weight = Math.max(record.unit_sold || 0, 1);
            item.net_sales += record.net_sales_amt || 0;
            item.gross_sales += record.gross_sales_amt || 0;
            item.st_weighted += (record.cumulative_sell_through || 0) * weight;
            item.st_weight += weight;
            item.sku_set.add(record.sku_id);
        });

        const totalSales = Object.values(agg).reduce((sum, item) => sum + item.net_sales, 0);
        return Object.entries(agg)
            .map(([channel_type, item]) => ({
                channel_type,
                sales_share: safeDiv(item.net_sales, totalSales),
                avg_discount_rate: safeDiv(item.net_sales, item.gross_sales),
                sell_through: safeDiv(item.st_weighted, item.st_weight),
                sales_per_sku: safeDiv(item.net_sales, item.sku_set.size),
            }))
            .sort((a, b) => b.sales_share - a.sales_share);
    }, [channelMap]);

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const historyRiskPatterns = useMemo<HistoryRiskPatternRow[]>(() => {
        const skuIds = Object.keys(skuLatestState);
        if (!skuIds.length) return [];

        const inventoryValues = skuIds.map((skuId) => skuLatestState[skuId].on_hand).sort((a, b) => a - b);
        const thresholdIdx = Math.floor(inventoryValues.length * 0.65);
        const inventoryThreshold = inventoryValues[thresholdIdx] || 0;

        const map: Record<string, {
            category: string;
            price_band: string;
            channel_type: string;
            sku_count: number;
            st_sum: number;
            inv_sum: number;
        }> = {};

        skuIds.forEach((skuId) => {
            const state = skuLatestState[skuId];
            if (state.latest_st >= 0.7 || state.on_hand < inventoryThreshold) return;
            const sku = skuMap[skuId];
            const category = sku?.category_id || sku?.category_name || '未知品类';
            const price_band = sku?.price_band || '未分带';
            const channel_type = state.dominant_channel;
            const key = `${category}__${price_band}__${channel_type}`;
            if (!map[key]) {
                map[key] = { category, price_band, channel_type, sku_count: 0, st_sum: 0, inv_sum: 0 };
            }
            map[key].sku_count += 1;
            map[key].st_sum += state.latest_st;
            map[key].inv_sum += state.on_hand;
        });

        return Object.values(map)
            .map((item) => ({
                category: item.category,
                price_band: item.price_band,
                channel_type: item.channel_type,
                sku_count: item.sku_count,
                avg_sell_through: safeDiv(item.st_sum, item.sku_count),
                avg_inventory: safeDiv(item.inv_sum, item.sku_count),
            }))
            .sort((a, b) => b.sku_count - a.sku_count || b.avg_inventory - a.avg_inventory)
            .slice(0, 8);
    }, [skuLatestState, skuMap]);

    const historyLifecycleTemplate = useMemo<LifecycleCurveRow[]>(() => {
        const agg: Record<number, {
            newness_sum: number; newness_cnt: number;
            core_sum: number; core_cnt: number;
            clearance_sum: number; clearance_cnt: number;
        }> = {};

        factSales.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const launchNo = parseWaveNo(sku.launch_wave || record.wave || 'W1');
            const weekAge = record.week_num - launchNo + 1;
            if (weekAge < 1 || weekAge > 12) return;
            if (!agg[weekAge]) {
                agg[weekAge] = {
                    newness_sum: 0, newness_cnt: 0,
                    core_sum: 0, core_cnt: 0,
                    clearance_sum: 0, clearance_cnt: 0,
                };
            }
            const lifecycle = normalizeLifecycle(sku.lifecycle);
            if (lifecycle === '新品') {
                agg[weekAge].newness_sum += record.cumulative_sell_through || 0;
                agg[weekAge].newness_cnt += 1;
            } else if (lifecycle === '清仓') {
                agg[weekAge].clearance_sum += record.cumulative_sell_through || 0;
                agg[weekAge].clearance_cnt += 1;
            } else {
                agg[weekAge].core_sum += record.cumulative_sell_through || 0;
                agg[weekAge].core_cnt += 1;
            }
        });

        return Array.from({ length: 12 }, (_, index) => {
            const weekNo = index + 1;
            const item = agg[weekNo];
            return {
                week: `W${weekNo}`,
                week_no: weekNo,
                newness: item ? safeDiv(item.newness_sum, item.newness_cnt) * 100 : 0,
                core: item ? safeDiv(item.core_sum, item.core_cnt) * 100 : 0,
                clearance: item ? safeDiv(item.clearance_sum, item.clearance_cnt) * 100 : 0,
            };
        });
    }, [skuMap]);

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const forecastMixRows = useMemo<ForecastMixRow[]>(() => {
        const channelShares = historyChannelRows
            .filter((row) => row.sales_share > 0)
            .map((row) => ({ channel_type: row.channel_type, share: row.sales_share }));
        if (!channelShares.length) return [];

        const rows: ForecastMixRow[] = [];
        orderedWaves.forEach((wave) => {
            const unitsPlan = wave.units_plan && wave.units_plan > 0 ? wave.units_plan : wave.sku_plan * 900;
            const revenuePlan = wave.revenue_plan && wave.revenue_plan > 0 ? wave.revenue_plan : unitsPlan * 399;
            const mixByCategory: Record<string, number> = {};
            Object.entries(wave.category_mix).forEach(([rawCategory, skuPlan]) => {
                const mapped = DEMO_TO_STANDARD_CATEGORY_MAP[rawCategory];
                const category_l1 = mapped?.category_l1 || rawCategory;
                mixByCategory[category_l1] = (mixByCategory[category_l1] || 0) + skuPlan;
            });
            const mixEntries = Object.entries(mixByCategory);
            const mixTotal = mixEntries.reduce((sum, [, value]) => sum + value, 0) || 1;

            mixEntries.forEach(([category_l1, skuPlan]) => {
                const mixShare = skuPlan / mixTotal;
                channelShares.forEach((channel) => {
                    rows.push({
                        wave_id: wave.id,
                        season: wave.season,
                        wave: wave.wave,
                        category_l1,
                        channel_type: channel.channel_type,
                        forecast_units: Math.round(unitsPlan * mixShare * channel.share),
                        forecast_sales: Math.round(revenuePlan * mixShare * channel.share),
                    });
                });
            });
        });

        return rows.sort((a, b) => b.forecast_sales - a.forecast_sales);
    }, [historyChannelRows, orderedWaves]);

    const activeForecastWaveId = selectedForecastWaveId || orderedWaves[0]?.id || '';
    const activeForecastWaveRows = useMemo(() => {
        return forecastMixRows
            .filter((row) => row.wave_id === activeForecastWaveId)
            .sort((a, b) => b.forecast_sales - a.forecast_sales);
    }, [activeForecastWaveId, forecastMixRows]);

    const activeForecastSummary = useMemo(() => {
        const totalUnits = activeForecastWaveRows.reduce((sum, row) => sum + row.forecast_units, 0);
        const totalSales = activeForecastWaveRows.reduce((sum, row) => sum + row.forecast_sales, 0);
        return { totalUnits, totalSales };
    }, [activeForecastWaveRows]);

    const otbTierRatios = useMemo(() => {
        const safeT1 = Math.max(tier1Ratio, 0);
        const safeT2 = Math.max(tier2Ratio, 0);
        const safeT3 = Math.max(tier3Ratio, 0);
        const total = safeT1 + safeT2 + safeT3 || 1;
        return {
            tier1: safeT1 / total,
            tier2: safeT2 / total,
            tier3: safeT3 / total,
        };
    }, [tier1Ratio, tier2Ratio, tier3Ratio]);

    const otbBaseSnapshot = useMemo(() => {
        const latestDate = factInventory
            .map((row) => row.date)
            .sort((a, b) => +new Date(b) - +new Date(a))[0] || '';
        const latestRows = latestDate ? factInventory.filter((row) => row.date === latestDate) : [];
        const inventoryAmount = latestRows.reduce((sum, row) => sum + (row.inventory_amount || 0), 0);
        const inventoryUnits = latestRows.reduce((sum, row) => sum + (row.eop_qty || 0), 0);
        const inTransitUnits = latestRows.reduce((sum, row) => sum + (row.inbound_qty || 0) + (row.transfer_in || 0), 0);
        const plannedBudget = factPlan.reduce((sum, row) => sum + (row.plan_otb_budget || 0), 0);
        return {
            latestDate,
            inventoryAmount,
            inventoryUnits,
            inTransitUnits,
            plannedBudget,
        };
    }, []);

    const otbScenario = useMemo(() => {
        const targetSt = Math.max(55, Math.min(95, otbTargetSellThrough)) / 100;
        const gmFloor = Math.max(25, Math.min(70, otbGmFloor)) / 100;
        const forecastUnits = forecastMixRows.reduce((sum, row) => sum + row.forecast_units, 0);
        const forecastSales = forecastMixRows.reduce((sum, row) => sum + row.forecast_sales, 0);
        const avgAsp = forecastUnits > 0 ? forecastSales / forecastUnits : 0;
        const inTransitRetail = otbBaseSnapshot.inTransitUnits * avgAsp;
        const targetEndingInventory = forecastSales * (1 - targetSt) / Math.max(targetSt, 0.01);
        const grossDemand = forecastSales + targetEndingInventory;
        const otbNeed = Math.max(grossDemand - otbBaseSnapshot.inventoryAmount - inTransitRetail, 0);
        const budgetCap = otbBudgetCap > 0 ? otbBudgetCap : otbBaseSnapshot.plannedBudget;
        const budgetGap = budgetCap - otbNeed;
        const targetFob = avgAsp * (1 - gmFloor);

        return {
            targetSt,
            gmFloor,
            forecastUnits,
            forecastSales,
            avgAsp,
            inTransitRetail,
            targetEndingInventory,
            grossDemand,
            otbNeed,
            budgetCap,
            budgetGap,
            targetFob,
        };
    }, [forecastMixRows, otbBaseSnapshot, otbBudgetCap, otbGmFloor, otbTargetSellThrough]);

    const otbTierRows = useMemo<OtbTierRow[]>(() => {
        const totalBudget = otbScenario.otbNeed;
        const asp = Math.max(otbScenario.avgAsp, 1);
        return [
            {
                tier: 'Tier 1 基础走量',
                ratio: otbTierRatios.tier1,
                budget: totalBudget * otbTierRatios.tier1,
                units: Math.round(totalBudget * otbTierRatios.tier1 / asp),
                note: '稳态补货，维持主销盘与库存安全',
            },
            {
                tier: 'Tier 2 形象款',
                ratio: otbTierRatios.tier2,
                budget: totalBudget * otbTierRatios.tier2,
                units: Math.round(totalBudget * otbTierRatios.tier2 / asp),
                note: '用于主题陈列与溢价带拉升',
            },
            {
                tier: 'Tier 3 测试款',
                ratio: otbTierRatios.tier3,
                budget: totalBudget * otbTierRatios.tier3,
                units: Math.round(totalBudget * otbTierRatios.tier3 / asp),
                note: '小单快反，避免重仓试错',
            },
        ];
    }, [otbScenario.avgAsp, otbScenario.otbNeed, otbTierRatios]);

    const otbWaveRows = useMemo(() => {
        const waveSalesMap: Record<string, number> = {};
        const waveUnitsMap: Record<string, number> = {};
        forecastMixRows.forEach((row) => {
            const key = row.wave_id;
            waveSalesMap[key] = (waveSalesMap[key] || 0) + row.forecast_sales;
            waveUnitsMap[key] = (waveUnitsMap[key] || 0) + row.forecast_units;
        });
        const totalSales = Object.values(waveSalesMap).reduce((sum, value) => sum + value, 0) || 1;
        return orderedWaves.map((wave) => {
            const forecastSales = waveSalesMap[wave.id] || 0;
            const forecastUnits = waveUnitsMap[wave.id] || 0;
            const ratio = forecastSales / totalSales;
            const otbBudget = otbScenario.otbNeed * ratio;
            const signal = ratio >= 0.16 ? '主力波段' : ratio <= 0.09 ? '轻量波段' : '标准波段';
            return {
                wave_id: wave.id,
                wave_label: `${wave.season}-${wave.wave}`,
                forecast_sales: forecastSales,
                forecast_units: forecastUnits,
                otb_budget: otbBudget,
                ratio,
                signal,
            };
        });
    }, [forecastMixRows, orderedWaves, otbScenario.otbNeed]);

    const forecastLifecycleTargets = useMemo<LifecycleCurveRow[]>(() => {
        return historyLifecycleTemplate.map((row) => ({
            week: row.week,
            week_no: row.week_no,
            newness: Math.min(98, row.newness + (row.week_no <= 8 ? 5 : 3)),
            core: Math.min(99, row.core + 3),
            clearance: Math.min(99, row.clearance + 2),
        }));
    }, [historyLifecycleTemplate]);

    const historySnapshot = useMemo(() => {
        const totalSku = Object.keys(skuMap).length;
        const totalSales = factSales.reduce((sum, record) => sum + (record.net_sales_amt || 0), 0);
        const avgSellThrough = Object.keys(skuLatestState).length
            ? Object.values(skuLatestState).reduce((sum, item) => sum + item.latest_st, 0) / Object.keys(skuLatestState).length
            : 0;
        const seasons = Array.from(new Set(factSales.map((record) => String(record.season_year || '')))).filter(Boolean).length;
        return { totalSku, totalSales, avgSellThrough, seasons };
    }, [skuLatestState, skuMap]);

    const wavePaceCurves = useMemo(() => {
        const curves: Record<string, { week: string; week_no: number; target_pct: number; actual_pct: number; deviation_pp: number }[]> = {};
        orderedWaves.forEach((wave) => {
            const launchFactor = wave.sku_plan > 0 ? wave.sku_actual / wave.sku_plan : 1;
            const noveltyBias = wave.new_ratio - wave.old_ratio;
            const rows = Array.from({ length: 12 }, (_, index) => {
                const weekNo = index + 1;
                const base = weekNo / 12;
                const target = Math.min(1, Math.pow(base, 0.88));
                const actual = Math.min(
                    1,
                    target * (0.9 + launchFactor * 0.15 + noveltyBias * 0.08) + (weekNo >= 8 ? 0.02 * (launchFactor - 1) : 0)
                );
                return {
                    week: `W${weekNo}`,
                    week_no: weekNo,
                    target_pct: target * 100,
                    actual_pct: actual * 100,
                    deviation_pp: (actual - target) * 100,
                };
            });
            curves[wave.id] = rows;
        });
        return curves;
    }, [orderedWaves]);

    const waveAnomalies = useMemo(() => {
        return orderedWaves
            .map((wave) => {
                const curve = wavePaceCurves[wave.id] || [];
                const week6 = curve.find((row) => row.week_no === 6);
                const deviation = week6?.deviation_pp || 0;
                let status: '偏慢' | '偏快' | '正常' = '正常';
                if (deviation <= -4) status = '偏慢';
                if (deviation >= 4) status = '偏快';
                const action = status === '偏慢'
                    ? '提早做渠道调拨，压缩低效 SKU 深度'
                    : status === '偏快'
                        ? '补货防断码，保持价格纪律'
                        : '维持节奏，按周监控售罄曲线';
                return {
                    id: wave.id,
                    season: wave.season,
                    wave: wave.wave,
                    launch_date: wave.launch_date,
                    status,
                    deviation_pp: deviation,
                    action,
                };
            })
            .sort((a, b) => Math.abs(b.deviation_pp) - Math.abs(a.deviation_pp));
    }, [orderedWaves, wavePaceCurves]);

    const activePaceWaveId = selectedPaceWaveId || orderedWaves[0]?.id || '';
    const activePaceWave = orderedWaves.find((wave) => wave.id === activePaceWaveId) || null;
    const activePaceCurve = activePaceWaveId ? (wavePaceCurves[activePaceWaveId] || []) : [];

    const waveSkuActions = useMemo(() => {
        const activeWaveCode = normalizeWaveCode(activePaceWave?.wave);
        if (!activeWaveCode) return [];

        const skuPerfMap: Record<string, {
            pairs: number;
            net_sales: number;
            gm_weighted: number;
            gm_weight: number;
            latest_week: number;
            latest_st: number;
            latest_inventory: number;
        }> = {};

        factSales.forEach((record) => {
            if (!skuPerfMap[record.sku_id]) {
                skuPerfMap[record.sku_id] = {
                    pairs: 0,
                    net_sales: 0,
                    gm_weighted: 0,
                    gm_weight: 0,
                    latest_week: 0,
                    latest_st: 0,
                    latest_inventory: 0,
                };
            }
            const item = skuPerfMap[record.sku_id];
            const salesWeight = Math.max(record.net_sales_amt || 0, 0);
            item.pairs += record.unit_sold || 0;
            item.net_sales += record.net_sales_amt || 0;
            item.gm_weighted += (record.gross_margin_rate || 0) * salesWeight;
            item.gm_weight += salesWeight;
            if ((record.week_num || 0) >= item.latest_week) {
                item.latest_week = record.week_num || 0;
                item.latest_st = record.cumulative_sell_through || 0;
                item.latest_inventory = record.on_hand_unit || 0;
            }
        });

        return dimSkus
            .filter((sku) => normalizeWaveCode(sku.launch_wave) === activeWaveCode)
            .map((sku) => {
                const perf = skuPerfMap[sku.sku_id] || {
                    pairs: 0,
                    net_sales: 0,
                    gm_weighted: 0,
                    gm_weight: 0,
                    latest_week: 0,
                    latest_st: 0,
                    latest_inventory: 0,
                };
                const gmRate = perf.gm_weight > 0 ? perf.gm_weighted / perf.gm_weight : 0;
                let action = '维持节奏观察';
                if (perf.latest_st < 0.6 && perf.latest_inventory > perf.pairs * 0.8) {
                    action = '加速去化（降价/转渠道）';
                } else if (perf.latest_st > 0.85 && perf.latest_inventory < perf.pairs * 0.2) {
                    action = '补货防断码';
                } else if (gmRate < 0.38 && perf.latest_st < 0.7) {
                    action = '优化成本与价格带';
                }
                return {
                    sku_id: sku.sku_id,
                    sku_name: sku.sku_name || sku.sku_id,
                    category: sku.category_name || sku.category_id || '未知品类',
                    msrp: sku.msrp || 0,
                    pairs: perf.pairs,
                    net_sales: perf.net_sales,
                    sell_through: perf.latest_st,
                    gm_rate: gmRate,
                    inventory_units: perf.latest_inventory,
                    action,
                };
            })
            .sort((a, b) => b.net_sales - a.net_sales)
            .slice(0, 12);
    }, [activePaceWave?.wave]);

    const summary = useMemo(() => {
        const totalPlanSku = orderedWaves.reduce((sum, wave) => sum + wave.sku_plan, 0);
        const totalActualSku = orderedWaves.reduce((sum, wave) => sum + wave.sku_actual, 0);
        const avgNewRatio = orderedWaves.length
            ? orderedWaves.reduce((sum, wave) => sum + wave.new_ratio, 0) / orderedWaves.length
            : 0;
        const avgOldRatio = orderedWaves.length
            ? orderedWaves.reduce((sum, wave) => sum + wave.old_ratio, 0) / orderedWaves.length
            : 0;
        return {
            totalPlanSku,
            totalActualSku,
            avgNewRatio,
            avgOldRatio,
            totalWaves: orderedWaves.length,
        };
    }, [orderedWaves]);

    const regions = useMemo(() => {
        const values = Array.from(new Set(
            channels
                .filter((channel) => !channel.is_online)
                .map((channel) => channel.region)
                .filter(Boolean)
        ));
        return values.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }, []);

    const waveTempMatrix = useMemo(() => {
        return regions.map((region) => {
            const mapping = REGION_TEMP_MAP[region] || { temp_range: '温和带 10-24℃', bucket: 'mild' as const };
            const cells = orderedWaves.map((wave) => {
                const status = getLaunchStatus(mapping.bucket, wave.wave);
                return {
                    region,
                    temp_range: mapping.temp_range,
                    wave: `${wave.season}-${wave.wave}`,
                    launch_date: wave.launch_date,
                    status,
                };
            });
            return {
                region,
                temp_range: mapping.temp_range,
                cells,
            };
        });
    }, [orderedWaves, regions]);

    const assortRows = useMemo(() => {
        const rowMap = new Map<string, AssortRow>();

        orderedWaves.forEach((wave) => {
            const totalWaveSku = Math.max(wave.sku_plan, 1);
            Object.entries(wave.category_mix).forEach(([rawCategory, skuPlan]) => {
                const mapped = DEMO_TO_STANDARD_CATEGORY_MAP[rawCategory];
                if (mapped) {
                    const rowKey = `${mapped.category_l1}__${mapped.category_l2}`;
                    if (!rowMap.has(rowKey)) {
                        rowMap.set(rowKey, {
                            category_l1: mapped.category_l1,
                            category_l2: mapped.category_l2,
                            total_sku: 0,
                            wave_values: {},
                        });
                    }
                    const row = rowMap.get(rowKey)!;
                    row.total_sku += skuPlan;
                    const existing = row.wave_values[wave.id];
                    const mergedSku = (existing?.sku_plan || 0) + skuPlan;
                    row.wave_values[wave.id] = {
                        sku_plan: mergedSku,
                        mix_share: mergedSku / totalWaveSku,
                    };
                    return;
                }

                const fallbackL1 = rawCategory;
                const subCategories = CATEGORY_TREE[fallbackL1] || [`${fallbackL1}-A`, `${fallbackL1}-B`, `${fallbackL1}-C`];
                const split = splitCount(skuPlan, subCategories.length);
                subCategories.forEach((category_l2, index) => {
                    const value = split[index] ?? 0;
                    const rowKey = `${fallbackL1}__${category_l2}`;
                    if (!rowMap.has(rowKey)) {
                        rowMap.set(rowKey, {
                            category_l1: fallbackL1,
                            category_l2,
                            total_sku: 0,
                            wave_values: {},
                        });
                    }
                    const row = rowMap.get(rowKey)!;
                    row.total_sku += value;
                    row.wave_values[wave.id] = {
                        sku_plan: value,
                        mix_share: value / totalWaveSku,
                    };
                });
            });
        });

        return Array.from(rowMap.values()).sort((a, b) => {
            const ai = CATEGORY_L1_ORDER.indexOf(a.category_l1);
            const bi = CATEGORY_L1_ORDER.indexOf(b.category_l1);
            const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
            const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
            if (av !== bv) return av - bv;
            return a.category_l2.localeCompare(b.category_l2, 'zh-CN');
        });
    }, [orderedWaves]);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="mb-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">3.1 History Layer</div>
                    <h2 className="text-lg font-bold text-slate-900">历史数据模板（History）</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        输出给预测与企划：价格带结构、品类结构、W1-W12节奏模板、渠道效率模板、风险模式。
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-xs">
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-slate-500">历史覆盖季数</div>
                        <div className="text-base font-semibold text-slate-900">{historySnapshot.seasons || 1}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-slate-500">历史样本SKU</div>
                        <div className="text-base font-semibold text-slate-900">{historySnapshot.totalSku}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-slate-500">历史净销售额</div>
                        <div className="text-base font-semibold text-slate-900">{formatWan(historySnapshot.totalSales)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-slate-500">最新售罄均值</div>
                        <div className="text-base font-semibold text-slate-900">{formatPct(historySnapshot.avgSellThrough)}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-100 p-4 overflow-x-auto">
                        <div className="text-sm font-semibold text-slate-900 mb-2">价格带结构模板（SKU% / 销售% / 毛利%）</div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">价格带</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">SKU占比</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">销售占比</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">毛利占比</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyPriceBandRows.map((row) => (
                                    <tr key={row.price_band} className="border-t border-slate-100">
                                        <td className="px-2 py-2 text-slate-700">{row.price_band}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.sku_share)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.sales_share)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.gm_share)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4 overflow-x-auto">
                        <div className="text-sm font-semibold text-slate-900 mb-2">品类结构模板（SKU / 销量 / 销售 / 毛利 / 售罄）</div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">品类</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">SKU数</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">销量</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">销售额</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">毛利率</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">售罄</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyCategoryRows.slice(0, 8).map((row) => (
                                    <tr key={row.category} className="border-t border-slate-100">
                                        <td className="px-2 py-2 text-slate-700">{row.category}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{row.sku_cnt}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{row.units.toLocaleString()}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatWan(row.net_sales)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.gm_rate)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.sell_through)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                    <div className="rounded-xl border border-slate-100 p-4 overflow-x-auto">
                        <div className="text-sm font-semibold text-slate-900 mb-2">渠道贡献与效率模板</div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">渠道</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">销售占比</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">平均折扣率</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">售罄率</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">单SKU产出</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyChannelRows.map((row) => (
                                    <tr key={row.channel_type} className="border-t border-slate-100">
                                        <td className="px-2 py-2 text-slate-700">{row.channel_type}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.sales_share)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.avg_discount_rate)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.sell_through)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatWan(row.sales_per_sku)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-900 mb-2">风险模式（低售罄 + 高库存）</div>
                        <div className="space-y-2">
                            {historyRiskPatterns.map((row) => (
                                <div key={`${row.category}-${row.price_band}-${row.channel_type}`} className="rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 text-xs">
                                    <div className="font-medium text-slate-800">
                                        {row.category} / {row.price_band} / {row.channel_type}
                                    </div>
                                    <div className="text-slate-600 mt-0.5">
                                        风险SKU {row.sku_count} 款 · 平均售罄 {formatPct(row.avg_sell_through)} · 平均库存 {Math.round(row.avg_inventory).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                            {historyRiskPatterns.length === 0 && (
                                <div className="text-xs text-slate-400 py-4">当前样本未识别到明显风险模式。</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-4 mt-4">
                    <div className="text-sm font-semibold text-slate-900 mb-2">波段节奏模板（上市后 W1-W12 历史均值）</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={historyLifecycleTemplate}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip formatter={(value: number | string | undefined) => formatPct100(Number(value ?? 0))} />
                            <Line type="monotone" dataKey="newness" name="新品历史均值" stroke="#2563eb" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="core" name="常青历史均值" stroke="#10b981" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="clearance" name="清仓历史均值" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">3.1 Forecast Layer</div>
                        <h2 className="text-lg font-bold text-slate-900">销售预测输出（Forecast）</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            输出：波段 × 品类 × 渠道 的销量/销售预测，以及分生命周期的 W1-W12 目标曲线。
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">当前波段预测销量</div>
                            <div className="font-semibold text-slate-900">{activeForecastSummary.totalUnits.toLocaleString()} 双</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">当前波段预测销额</div>
                            <div className="font-semibold text-slate-900">{formatWan(activeForecastSummary.totalSales)}</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {orderedWaves.map((wave) => (
                        <button
                            key={`${wave.id}-forecast`}
                            onClick={() => setSelectedForecastWaveId(wave.id)}
                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                activeForecastWaveId === wave.id
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {wave.season}-{wave.wave}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
                    <div className="rounded-xl border border-slate-100 p-4 overflow-x-auto">
                        <div className="text-sm font-semibold text-slate-900 mb-2">波段 × 品类 × 渠道预测矩阵</div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">波段</th>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">品类</th>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">渠道</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">预测销量</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">预测销额</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeForecastWaveRows.slice(0, 24).map((row) => (
                                    <tr key={`${row.wave_id}-${row.category_l1}-${row.channel_type}`} className="border-t border-slate-100">
                                        <td className="px-2 py-2 text-slate-700">{row.season}-{row.wave}</td>
                                        <td className="px-2 py-2 text-slate-700">{row.category_l1}</td>
                                        <td className="px-2 py-2 text-slate-600">{row.channel_type}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{row.forecast_units.toLocaleString()}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatWan(row.forecast_sales)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-900 mb-2">W1-W12 售罄目标曲线（生命周期）</div>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={forecastLifecycleTargets}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip formatter={(value: number | string | undefined) => formatPct100(Number(value ?? 0))} />
                                <Line type="monotone" dataKey="newness" name="新品目标" stroke="#2563eb" strokeWidth={2.2} dot={false} />
                                <Line type="monotone" dataKey="core" name="常青目标" stroke="#10b981" strokeWidth={2.2} dot={false} />
                                <Line type="monotone" dataKey="clearance" name="清仓目标" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="mt-2 text-xs text-slate-500">
                            目标曲线基于历史模板抬升得到：新品阶段抬升更高，常青与清仓维持稳态优化。
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">3.1 OTB / Buy Plan</div>
                        <h2 className="text-lg font-bold text-slate-900">OTB 预算推算（Open-To-Buy）</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            输入目标售罄与毛利红线，系统按预测与库存反推可采购预算，并按 Tier1/2/3 自动切分。
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs min-w-[240px]">
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">库存快照</div>
                            <div className="font-semibold text-slate-900">{otbBaseSnapshot.latestDate || '--'}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">预算口径</div>
                            <div className="font-semibold text-slate-900">{formatWan(otbScenario.budgetCap)}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4 mb-4">
                    <div className="rounded-xl border border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-900 mb-3">试算参数</div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <label className="flex flex-col gap-1">
                                <span className="text-slate-500">目标售罄率 %</span>
                                <input
                                    type="number"
                                    min={55}
                                    max={95}
                                    value={otbTargetSellThrough}
                                    onChange={(e) => setOtbTargetSellThrough(Number(e.target.value) || 82)}
                                    className="rounded-md border border-slate-200 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-slate-500">毛利红线 %</span>
                                <input
                                    type="number"
                                    min={25}
                                    max={70}
                                    value={otbGmFloor}
                                    onChange={(e) => setOtbGmFloor(Number(e.target.value) || 44)}
                                    className="rounded-md border border-slate-200 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-slate-500">预算上限（元，0=按计划）</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={100000}
                                    value={otbBudgetCap}
                                    onChange={(e) => setOtbBudgetCap(Number(e.target.value) || 0)}
                                    className="rounded-md border border-slate-200 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                            </label>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                            <label className="flex flex-col gap-1">
                                <span className="text-slate-500">Tier1 %</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={tier1Ratio}
                                    onChange={(e) => setTier1Ratio(Number(e.target.value) || 0)}
                                    className="rounded-md border border-slate-200 px-2 py-1.5 text-slate-700"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-slate-500">Tier2 %</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={tier2Ratio}
                                    onChange={(e) => setTier2Ratio(Number(e.target.value) || 0)}
                                    className="rounded-md border border-slate-200 px-2 py-1.5 text-slate-700"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-slate-500">Tier3 %</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={tier3Ratio}
                                    onChange={(e) => setTier3Ratio(Number(e.target.value) || 0)}
                                    className="rounded-md border border-slate-200 px-2 py-1.5 text-slate-700"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-900 mb-3">关键结果</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md border border-slate-200 px-3 py-2">
                                <div className="text-slate-500">预测销售额</div>
                                <div className="font-semibold text-slate-900">{formatWan(otbScenario.forecastSales)}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 px-3 py-2">
                                <div className="text-slate-500">目标期末库存</div>
                                <div className="font-semibold text-slate-900">{formatWan(otbScenario.targetEndingInventory)}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 px-3 py-2">
                                <div className="text-slate-500">建议 OTB</div>
                                <div className="font-semibold text-indigo-600">{formatWan(otbScenario.otbNeed)}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 px-3 py-2">
                                <div className="text-slate-500">FOB 目标上限</div>
                                <div className="font-semibold text-slate-900">¥{otbScenario.targetFob.toFixed(1)}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 px-3 py-2">
                                <div className="text-slate-500">当前库存金额</div>
                                <div className="font-semibold text-slate-900">{formatWan(otbBaseSnapshot.inventoryAmount)}</div>
                            </div>
                            <div className="rounded-md border border-slate-200 px-3 py-2">
                                <div className="text-slate-500">预算差额</div>
                                <div className={`font-semibold ${otbScenario.budgetGap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {otbScenario.budgetGap >= 0 ? '+' : ''}{formatWan(otbScenario.budgetGap)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-100 p-4 overflow-x-auto">
                        <div className="text-sm font-semibold text-slate-900 mb-2">Tier 预算切分</div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">层级</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">占比</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">预算</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">预计双数</th>
                                </tr>
                            </thead>
                            <tbody>
                                {otbTierRows.map((row) => (
                                    <tr key={row.tier} className="border-t border-slate-100">
                                        <td className="px-2 py-2 text-slate-700">
                                            <div className="font-medium">{row.tier}</div>
                                            <div className="text-[11px] text-slate-500">{row.note}</div>
                                        </td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.ratio)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatWan(row.budget)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{row.units.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4 overflow-x-auto">
                        <div className="text-sm font-semibold text-slate-900 mb-2">波段 OTB 分配（按预测销售权重）</div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-2 py-2 text-slate-500 font-semibold">波段</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">预测销售额</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">OTB预算</th>
                                    <th className="text-right px-2 py-2 text-slate-500 font-semibold">权重</th>
                                </tr>
                            </thead>
                            <tbody>
                                {otbWaveRows.map((row) => (
                                    <tr key={row.wave_id} className="border-t border-slate-100">
                                        <td className="px-2 py-2 text-slate-700">
                                            <div className="font-medium">{row.wave_label}</div>
                                            <div className="text-[11px] text-slate-500">{row.signal}</div>
                                        </td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatWan(row.forecast_sales)}</td>
                                        <td className="px-2 py-2 text-right text-indigo-600 font-medium">{formatWan(row.otb_budget)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.ratio)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">4.6 Wave Strategy</div>
                        <h2 className="text-lg font-bold text-slate-900">波段日历（上市时间轴 + SKU容量 + 新旧货占比）</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            规划视角，不与在售动销分析重叠。
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">波段数</div>
                            <div className="font-semibold text-slate-900">{summary.totalWaves}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">计划SKU</div>
                            <div className="font-semibold text-slate-900">{summary.totalPlanSku}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">新品占比</div>
                            <div className="font-semibold text-emerald-600">{(summary.avgNewRatio * 100).toFixed(1)}%</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="text-slate-500">旧货占比</div>
                            <div className="font-semibold text-amber-600">{(summary.avgOldRatio * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute top-[26px] left-0 right-0 h-[2px] bg-slate-100" />
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {orderedWaves.map((wave) => {
                            const achvRate = wave.sku_plan > 0 ? wave.sku_actual / wave.sku_plan : 0;
                            return (
                                <div key={wave.id} className="flex-shrink-0 w-64">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow-sm z-10" />
                                        <span className="text-xs text-slate-500">{formatDate(wave.launch_date)}</span>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-3 bg-gradient-to-br from-slate-50 to-white">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-sm font-semibold text-slate-900">{wave.season} {wave.wave}</div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                achvRate >= 0.95 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                落地 {(achvRate * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2">{wave.theme}</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                            <div className="rounded-md bg-white border border-slate-100 p-2">
                                                <div className="text-slate-500">SKU容量</div>
                                                <div className="font-semibold text-slate-900">{wave.sku_plan}</div>
                                            </div>
                                            <div className="rounded-md bg-white border border-slate-100 p-2">
                                                <div className="text-slate-500">实际落地</div>
                                                <div className="font-semibold text-slate-900">{wave.sku_actual}</div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mb-1">新旧货结构</div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${wave.new_ratio * 100}%` }} />
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">
                                            新 {Math.round(wave.new_ratio * 100)}% · 旧 {Math.round(wave.old_ratio * 100)}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">波段节奏监控</div>
                        <h3 className="text-base font-bold text-slate-900">上市后 W1-W12 节奏曲线（目标 vs 实际）</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {orderedWaves.map((wave) => (
                            <button
                                key={`${wave.id}-pace`}
                                onClick={() => setSelectedPaceWaveId(wave.id)}
                                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                    activePaceWaveId === wave.id
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {wave.season}-{wave.wave}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
                    <div className="rounded-xl border border-slate-100 p-4">
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={activePaceCurve}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip formatter={(value: number | string | undefined) => `${Number(value ?? 0).toFixed(1)}%`} />
                                <Line type="monotone" dataKey="target_pct" name="目标节奏" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="actual_pct" name="实际节奏" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                        {activePaceWave && (
                            <div className="mt-2 text-xs text-slate-500">
                                当前波段：{activePaceWave.season}-{activePaceWave.wave}，上市日期 {formatDate(activePaceWave.launch_date)}
                            </div>
                        )}
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900 mb-2">异常波段 Top6（偏慢 / 偏快）</div>
                        <div className="space-y-2">
                            {waveAnomalies.slice(0, 6).map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedPaceWaveId(item.id)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                        activePaceWaveId === item.id
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">{index + 1}. {item.season}-{item.wave}</span>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                                            item.status === '偏慢'
                                                ? 'bg-amber-50 text-amber-600'
                                                : item.status === '偏快'
                                                    ? 'bg-rose-50 text-rose-600'
                                                    : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <div className={`text-[11px] mt-1 ${activePaceWaveId === item.id ? 'text-slate-200' : 'text-slate-500'}`}>
                                        W6 偏差 {item.deviation_pp >= 0 ? '+' : ''}{item.deviation_pp.toFixed(1)}pp
                                    </div>
                                    <div className={`text-[11px] ${activePaceWaveId === item.id ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {item.action}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="mb-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">波段 × 温度带</div>
                    <h3 className="text-base font-bold text-slate-900">区域温度匹配提示卡</h3>
                    <p className="text-xs text-slate-500 mt-1">字段口径：region / temp_range / wave / launch_date</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="text-left text-xs text-slate-500 font-semibold px-2 py-1">区域</th>
                                <th className="text-left text-xs text-slate-500 font-semibold px-2 py-1">温度带</th>
                                {orderedWaves.map((wave) => (
                                    <th key={wave.id} className="text-center text-xs text-slate-500 font-semibold px-2 py-1">
                                        {wave.season}-{wave.wave}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {waveTempMatrix.map((row) => (
                                <tr key={row.region}>
                                    <td className="px-2 py-1 text-sm font-medium text-slate-700">{row.region}</td>
                                    <td className="px-2 py-1 text-xs text-slate-500">{row.temp_range}</td>
                                    {row.cells.map((cell) => (
                                        <td key={`${row.region}-${cell.wave}`} className="px-1 py-1">
                                            <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center">
                                                <div className="text-[11px] text-slate-500">{formatDate(cell.launch_date)}</div>
                                                <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] ${cell.status.className}`}>
                                                    {cell.status.label}
                                                </div>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="mb-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">4.7 Assortment Demand Plan</div>
                    <h3 className="text-base font-bold text-slate-900">品类树（大类/中类）× 波段 SKU 需求矩阵</h3>
                    <p className="text-xs text-slate-500 mt-1">字段口径：category_l1 / category_l2 / wave / sku_plan / mix_share</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="text-left text-xs text-slate-500 font-semibold px-2 py-1">大类</th>
                                <th className="text-left text-xs text-slate-500 font-semibold px-2 py-1">中类</th>
                                {orderedWaves.map((wave) => (
                                    <th key={wave.id} className="text-center text-xs text-slate-500 font-semibold px-2 py-1">
                                        {wave.wave}
                                    </th>
                                ))}
                                <th className="text-right text-xs text-slate-500 font-semibold px-2 py-1">合计SKU</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assortRows.map((row) => (
                                <tr key={`${row.category_l1}-${row.category_l2}`}>
                                    <td className="px-2 py-1 text-sm font-medium text-slate-700">{row.category_l1}</td>
                                    <td className="px-2 py-1 text-xs text-slate-600">{row.category_l2}</td>
                                    {orderedWaves.map((wave) => {
                                        const value = row.wave_values[wave.id];
                                        return (
                                            <td key={`${row.category_l1}-${row.category_l2}-${wave.id}`} className="px-1 py-1">
                                                <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-center">
                                                    <div className="text-xs font-semibold text-slate-900">{value?.sku_plan || 0}</div>
                                                    <div className="text-[11px] text-slate-500">{((value?.mix_share || 0) * 100).toFixed(1)}%</div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-2 py-1 text-right text-sm font-semibold text-slate-800">{row.total_sku}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                    用于检查每个波段的 SKU 配比是否符合策略，并观察大类与中类结构是否连续一致。
                    当前 Demo 类目已自动映射到鞋类标准分类（运动鞋/休闲鞋/户外鞋/童鞋等）。
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">波段下钻动作</div>
                        <h3 className="text-base font-bold text-slate-900">波段 → SKU → 动作建议</h3>
                    </div>
                    <div className="text-xs text-slate-500">
                        {activePaceWave ? `${activePaceWave.season}-${activePaceWave.wave}` : '未选择波段'}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">SKU</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">品类</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">MSRP</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">售罄</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">毛利</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">库存</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">动作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {waveSkuActions.map((row) => (
                                <tr key={row.sku_id} className="border-t border-slate-100">
                                    <td className="px-2 py-2 text-slate-700">
                                        <div className="font-medium">{row.sku_name}</div>
                                        <div className="text-[11px] text-slate-400">{row.sku_id}</div>
                                    </td>
                                    <td className="px-2 py-2 text-slate-600">{row.category}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">¥{row.msrp}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.sell_through)}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{formatPct(row.gm_rate)}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{row.inventory_units.toLocaleString()}</td>
                                    <td className="px-2 py-2 text-slate-700">{row.action}</td>
                                </tr>
                            ))}
                            {waveSkuActions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-2 py-4 text-slate-400">当前波段没有可下钻 SKU 数据。</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
