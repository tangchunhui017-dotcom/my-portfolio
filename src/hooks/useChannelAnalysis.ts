import { useMemo } from 'react';
import rawSalesData from '../../data/dashboard/fact_sales.json';
import rawChannelData from '../../data/dashboard/dim_channel.json';
import rawSkuData from '../../data/dashboard/dim_sku.json';
import { DashboardFilters } from '@/hooks/useDashboardFilter';

interface DimChannel {
    channel_id: string;
    channel_type: string;
    channel_name: string;
    is_online: boolean;
    region: string;
    city_tier: string;
    store_format: string;
}

interface DimSku {
    sku_id: string;
    category_id: string;
    msrp: number;
    lifecycle: string;
    target_audience?: string;
    target_age_group?: string;
    color?: string;
    color_family?: string;
}

interface FactSalesRecord {
    sku_id: string;
    channel_id: string;
    season_year: string | number;
    season: string;
    wave: string;
    week_num: number;
    unit_sold: number;
    net_sales_amt: number;
    gross_margin_rate: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface AggregatedStats {
    netSales: number;
    units: number;
}

interface RegionSplitStats {
    region: string;
    onlineSales: number;
    offlineSales: number;
    onlineUnits: number;
    offlineUnits: number;
    netSales: number;
    units: number;
}

interface RegionYearStats {
    netSales: number;
}

interface RegionChannelAccumulator {
    netSales: number;
    units: number;
    stWeighted: number;
    stWeight: number;
    gmWeighted: number;
    gmWeight: number;
}

interface StoreAccumulator {
    store_id: string;
    store_name: string;
    region: string;
    city_tier: string;
    store_format: string;
    net_sales: number;
    units: number;
    stWeighted: number;
    stWeight: number;
    gmWeighted: number;
    gmWeight: number;
}

interface StoreMetrics extends StoreAccumulator {
    sell_through: number;
    gm_rate: number;
    active_sku_count: number;
    inventory_units: number;
    store_efficiency: number;
}

interface FormatTierAccumulator {
    store_format: string;
    city_tier: string;
    store_count: number;
    net_sales: number;
    stWeighted: number;
    stWeight: number;
    gmWeighted: number;
    gmWeight: number;
}

export interface RegionPerformanceItem {
    region: string;
    target_sales: number;
    net_sales: number;
    yoy_sales: number;
    achv_rate: number;
    yoy_rate: number;
}

export interface RegionChannelMatrixCell {
    region: string;
    channel: string;
    net_sales: number;
    sell_through: number;
    gm_rate: number;
}

export interface CityTierBucketCell {
    city_tier: string;
    sales_bucket: string;
    store_count: number;
    store_count_share: number;
    net_sales: number;
    sales_share: number;
}

export interface CityTierBucketTopStore {
    store_id: string;
    store_name: string;
    region: string;
    city_tier: string;
    store_format: string;
    sales_bucket: string;
    net_sales: number;
    sales_share: number;
    sell_through: number;
    inventory_units: number;
    store_efficiency: number;
}

export interface StoreFormatMixItem {
    store_format: string;
    store_count: number;
    store_count_share: number;
    net_sales: number;
    sales_share: number;
}

export interface FormatTierMatrixCell {
    store_format: string;
    city_tier: string;
    store_count: number;
    net_sales: number;
    sell_through: number;
    gm_rate: number;
}

export interface RegionCityEfficiencyItem {
    region: string;
    city_tier: string;
    store_count: number;
    net_sales: number;
    sell_through: number;
    inventory_units: number;
}

export interface TerminalHealthPoint {
    point_id: string;
    region: string;
    city_tier: string;
    store_format: string;
    store_count: number;
    net_sales: number;
    sell_through: number;
    inventory_turnover: number;
    inventory_units: number;
}

export interface TerminalHealthRankItem {
    point_id: string;
    region: string;
    city_tier: string;
    store_format: string;
    store_count: number;
    net_sales: number;
    sell_through: number;
    inventory_turnover: number;
    diagnosis: string;
}

const PRICE_BANDS = [
    { id: 'PB1', min: 199, max: 299 },
    { id: 'PB2', min: 300, max: 399 },
    { id: 'PB3', min: 400, max: 499 },
    { id: 'PB4', min: 500, max: 599 },
    { id: 'PB5', min: 600, max: 699 },
    { id: 'PB6', min: 700, max: 9999 },
];

const AUDIENCE_TO_AGE_GROUP: Record<string, string[]> = {
    '18-23岁 GenZ': ['18-25'],
    '24-28岁 职场新人': ['26-35'],
    '29-35岁 资深中产': ['26-35'],
    '35岁以上': ['36-45', '46+'],
};

const TARGET_GROWTH_RATE = 0.08;
const SALES_BUCKETS = ['超高', '高', '中', '低'];
const CITY_TIER_ORDER = ['全国', '一线', '新一线', '二线', '三线', '四线'];

const salesRecords = rawSalesData as FactSalesRecord[];
const channels = rawChannelData as DimChannel[];
const skus = rawSkuData as DimSku[];

function sortByTierOrder(a: string, b: string) {
    const ai = CITY_TIER_ORDER.indexOf(a);
    const bi = CITY_TIER_ORDER.indexOf(b);
    const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (av !== bv) return av - bv;
    return a.localeCompare(b, 'zh-CN');
}

function getSalesBucketByRank(index: number, total: number) {
    if (total <= 1) return '超高';
    const ratio = index / (total - 1);
    if (ratio <= 0.25) return '超高';
    if (ratio <= 0.5) return '高';
    if (ratio <= 0.75) return '中';
    return '低';
}

function matchesPriceBand(msrp: number, selectedPriceBand: string | 'all') {
    if (selectedPriceBand === 'all') return true;
    const band = PRICE_BANDS.find((item) => item.id === selectedPriceBand);
    if (!band) return true;
    return msrp >= band.min && msrp <= band.max;
}

function matchesTargetAudience(sku: DimSku, selectedAudience: string | 'all') {
    if (selectedAudience === 'all') return true;
    if (sku.target_audience === selectedAudience) return true;
    if (sku.target_age_group === selectedAudience) return true;

    if (sku.target_age_group) {
        const mappedAgeGroups = AUDIENCE_TO_AGE_GROUP[selectedAudience];
        if (mappedAgeGroups?.includes(sku.target_age_group)) return true;
    }
    return false;
}

function matchesColor(sku: DimSku, selectedColor: string | 'all') {
    if (selectedColor === 'all') return true;
    return sku.color === selectedColor || sku.color_family === selectedColor;
}

function shouldIncludeRecord(
    sale: FactSalesRecord,
    sku: DimSku,
    channel: DimChannel,
    filters: DashboardFilters,
    yearOverride?: number
) {
    if (yearOverride !== undefined) {
        if (Number(sale.season_year) !== yearOverride) return false;
    } else if (filters.season_year !== 'all' && String(sale.season_year) !== String(filters.season_year)) {
        return false;
    }

    if (filters.season !== 'all' && sale.season !== filters.season) return false;
    if (filters.wave !== 'all' && sale.wave !== filters.wave) return false;

    if (filters.category_id !== 'all' && sku.category_id !== filters.category_id) return false;
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;

    if (filters.region !== 'all' && channel.region !== filters.region) return false;
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;

    if (!matchesTargetAudience(sku, filters.target_audience)) return false;
    if (!matchesColor(sku, filters.color)) return false;
    if (!matchesPriceBand(sku.msrp, filters.price_band)) return false;

    return true;
}

function accumulate(map: Record<string, AggregatedStats>, key: string, sale: FactSalesRecord) {
    if (!map[key]) map[key] = { netSales: 0, units: 0 };
    map[key].netSales += sale.net_sales_amt || 0;
    map[key].units += sale.unit_sold || 0;
}

function accumulateYear(map: Record<string, RegionYearStats>, key: string, sale: FactSalesRecord) {
    if (!map[key]) map[key] = { netSales: 0 };
    map[key].netSales += sale.net_sales_amt || 0;
}

function accumulateMatrix(map: Record<string, RegionChannelAccumulator>, key: string, sale: FactSalesRecord) {
    if (!map[key]) {
        map[key] = {
            netSales: 0,
            units: 0,
            stWeighted: 0,
            stWeight: 0,
            gmWeighted: 0,
            gmWeight: 0,
        };
    }
    const item = map[key];
    const unitWeight = Math.max(sale.unit_sold || 0, 1);
    const salesWeight = Math.max(sale.net_sales_amt || 0, 0);
    item.netSales += sale.net_sales_amt || 0;
    item.units += sale.unit_sold || 0;
    item.stWeighted += (sale.cumulative_sell_through || 0) * unitWeight;
    item.stWeight += unitWeight;
    item.gmWeighted += (sale.gross_margin_rate || 0) * salesWeight;
    item.gmWeight += salesWeight;
}

function getLatestYear(records: FactSalesRecord[]) {
    let latest = 0;
    records.forEach((record) => {
        const yearNum = Number(record.season_year);
        if (Number.isFinite(yearNum) && yearNum > latest) latest = yearNum;
    });
    return latest || new Date().getFullYear();
}

function toStoreMetrics(store: StoreAccumulator): StoreMetrics {
    return {
        ...store,
        sell_through: store.stWeight > 0 ? store.stWeighted / store.stWeight : 0,
        gm_rate: store.gmWeight > 0 ? store.gmWeighted / store.gmWeight : 0,
        active_sku_count: 0,
        inventory_units: 0,
        store_efficiency: 0,
    };
}

export function useChannelAnalysis(filters: DashboardFilters) {
    const channelMap = useMemo(() => {
        const map: Record<string, DimChannel> = {};
        channels.forEach((channel) => {
            map[channel.channel_id] = channel;
        });
        return map;
    }, []);

    const skuMap = useMemo(() => {
        const map: Record<string, DimSku> = {};
        skus.forEach((sku) => {
            map[sku.sku_id] = sku;
        });
        return map;
    }, []);

    return useMemo(() => {
        const regionStatsMap: Record<string, AggregatedStats> = {};
        const regionSplitMap: Record<string, RegionSplitStats> = {};
        const formatStatsMap: Record<string, AggregatedStats> = {};
        const tierStatsMap: Record<string, AggregatedStats> = {};
        const regionChannelMap: Record<string, RegionChannelAccumulator> = {};
        const storeMap: Record<string, StoreAccumulator> = {};
        const storeSkuSetMap: Record<string, Set<string>> = {};
        const storeSkuInventoryMap: Record<string, { week_num: number; on_hand_unit: number }> = {};

        const latestYear = getLatestYear(salesRecords);
        const currentYear = filters.season_year === 'all' ? latestYear : Number(filters.season_year);
        const baselineYear = currentYear - 1;
        const regionCurrentMap: Record<string, RegionYearStats> = {};
        const regionBaselineMap: Record<string, RegionYearStats> = {};

        salesRecords.forEach((sale) => {
            const channel = channelMap[sale.channel_id];
            const sku = skuMap[sale.sku_id];
            if (!channel || !sku) return;

            if (shouldIncludeRecord(sale, sku, channel, filters)) {
                const regionKey = channel.region || '未知大区';
                const formatKey = channel.store_format || '未知店态';
                const tierKey = channel.city_tier || '未知线级';

                accumulate(regionStatsMap, regionKey, sale);
                accumulate(formatStatsMap, formatKey, sale);
                accumulate(tierStatsMap, tierKey, sale);

                if (!regionSplitMap[regionKey]) {
                    regionSplitMap[regionKey] = {
                        region: regionKey,
                        onlineSales: 0,
                        offlineSales: 0,
                        onlineUnits: 0,
                        offlineUnits: 0,
                        netSales: 0,
                        units: 0,
                    };
                }
                const split = regionSplitMap[regionKey];
                if (channel.is_online) {
                    split.onlineSales += sale.net_sales_amt || 0;
                    split.onlineUnits += sale.unit_sold || 0;
                } else {
                    split.offlineSales += sale.net_sales_amt || 0;
                    split.offlineUnits += sale.unit_sold || 0;
                }
                split.netSales += sale.net_sales_amt || 0;
                split.units += sale.unit_sold || 0;

                const regionChannelKey = `${regionKey}__${channel.channel_type}`;
                accumulateMatrix(regionChannelMap, regionChannelKey, sale);

                const storeId = channel.channel_id;
                if (!storeMap[storeId]) {
                    storeMap[storeId] = {
                        store_id: storeId,
                        store_name: channel.channel_name || storeId,
                        region: regionKey,
                        city_tier: tierKey,
                        store_format: formatKey,
                        net_sales: 0,
                        units: 0,
                        stWeighted: 0,
                        stWeight: 0,
                        gmWeighted: 0,
                        gmWeight: 0,
                    };
                }
                const store = storeMap[storeId];
                const unitWeight = Math.max(sale.unit_sold || 0, 1);
                const salesWeight = Math.max(sale.net_sales_amt || 0, 0);
                store.net_sales += sale.net_sales_amt || 0;
                store.units += sale.unit_sold || 0;
                store.stWeighted += (sale.cumulative_sell_through || 0) * unitWeight;
                store.stWeight += unitWeight;
                store.gmWeighted += (sale.gross_margin_rate || 0) * salesWeight;
                store.gmWeight += salesWeight;

                if (!storeSkuSetMap[storeId]) storeSkuSetMap[storeId] = new Set<string>();
                storeSkuSetMap[storeId].add(sale.sku_id);

                const inventoryKey = `${storeId}__${sale.sku_id}`;
                const latestInventory = storeSkuInventoryMap[inventoryKey];
                if (!latestInventory || sale.week_num >= latestInventory.week_num) {
                    storeSkuInventoryMap[inventoryKey] = {
                        week_num: sale.week_num,
                        on_hand_unit: sale.on_hand_unit || 0,
                    };
                }
            }

            if (shouldIncludeRecord(sale, sku, channel, filters, currentYear)) {
                const regionKey = channel.region || '未知大区';
                accumulateYear(regionCurrentMap, regionKey, sale);
            }

            if (shouldIncludeRecord(sale, sku, channel, filters, baselineYear)) {
                const regionKey = channel.region || '未知大区';
                accumulateYear(regionBaselineMap, regionKey, sale);
            }
        });

        const regionStats = Object.entries(regionStatsMap)
            .map(([region, values]) => ({ region, ...values }))
            .sort((a, b) => b.netSales - a.netSales);

        const formatStats = Object.entries(formatStatsMap)
            .map(([store_format, values]) => ({ store_format, ...values }))
            .sort((a, b) => b.netSales - a.netSales);

        const tierStats = Object.entries(tierStatsMap)
            .map(([city_tier, values]) => ({ city_tier, ...values }))
            .sort((a, b) => b.netSales - a.netSales);

        const regionSplitStats = Object.values(regionSplitMap).sort((a, b) => b.netSales - a.netSales);

        const allRegionKeys = new Set<string>([
            ...Object.keys(regionCurrentMap),
            ...Object.keys(regionBaselineMap),
        ]);
        const regionPerformance: RegionPerformanceItem[] = Array.from(allRegionKeys)
            .map((region) => {
                const net_sales = regionCurrentMap[region]?.netSales || 0;
                const yoy_sales = regionBaselineMap[region]?.netSales || 0;
                const target_sales = yoy_sales * (1 + TARGET_GROWTH_RATE);
                const achv_rate = target_sales > 0 ? net_sales / target_sales : 0;
                const yoy_rate = yoy_sales > 0 ? (net_sales - yoy_sales) / yoy_sales : 0;
                return {
                    region,
                    target_sales,
                    net_sales,
                    yoy_sales,
                    achv_rate,
                    yoy_rate,
                };
            })
            .sort((a, b) => b.net_sales - a.net_sales);

        const regionChannelCells: RegionChannelMatrixCell[] = Object.entries(regionChannelMap).map(([key, value]) => {
            const [region, channel] = key.split('__');
            return {
                region,
                channel,
                net_sales: value.netSales,
                sell_through: value.stWeight > 0 ? value.stWeighted / value.stWeight : 0,
                gm_rate: value.gmWeight > 0 ? value.gmWeighted / value.gmWeight : 0,
            };
        });

        const regionOrder = Array.from(
            new Set(regionChannelCells.sort((a, b) => b.net_sales - a.net_sales).map((cell) => cell.region))
        );
        const channelOrder = Array.from(new Set(regionChannelCells.map((cell) => cell.channel)));

        const storeInventoryUnitsMap: Record<string, number> = {};
        Object.entries(storeSkuInventoryMap).forEach(([key, value]) => {
            const [storeId] = key.split('__');
            storeInventoryUnitsMap[storeId] = (storeInventoryUnitsMap[storeId] || 0) + (value.on_hand_unit || 0);
        });

        const stores = Object.values(storeMap)
            .map((store) => {
                const storeMetrics = toStoreMetrics(store);
                const activeSkuCount = storeSkuSetMap[store.store_id]?.size || 0;
                const inventoryUnits = storeInventoryUnitsMap[store.store_id] || 0;
                return {
                    ...storeMetrics,
                    active_sku_count: activeSkuCount,
                    inventory_units: inventoryUnits,
                    store_efficiency: activeSkuCount > 0 ? storeMetrics.net_sales / activeSkuCount : storeMetrics.net_sales,
                };
            })
            .sort((a, b) => b.net_sales - a.net_sales);
        const totalStoreSales = stores.reduce((sum, store) => sum + store.net_sales, 0);
        const totalStoreCount = stores.length;

        const cityTierBucketAccMap: Record<string, { city_tier: string; sales_bucket: string; store_count: number; net_sales: number }> = {};
        const cityTierBucketTopStores: Record<string, CityTierBucketTopStore[]> = {};
        stores.forEach((store, index) => {
            const bucket = getSalesBucketByRank(index, stores.length);
            const key = `${store.city_tier}__${bucket}`;
            if (!cityTierBucketAccMap[key]) {
                cityTierBucketAccMap[key] = {
                    city_tier: store.city_tier,
                    sales_bucket: bucket,
                    store_count: 0,
                    net_sales: 0,
                };
            }
            cityTierBucketAccMap[key].store_count += 1;
            cityTierBucketAccMap[key].net_sales += store.net_sales;

            if (!cityTierBucketTopStores[key]) cityTierBucketTopStores[key] = [];
            cityTierBucketTopStores[key].push({
                store_id: store.store_id,
                store_name: store.store_name,
                region: store.region,
                city_tier: store.city_tier,
                store_format: store.store_format,
                sales_bucket: bucket,
                net_sales: store.net_sales,
                sales_share: totalStoreSales > 0 ? store.net_sales / totalStoreSales : 0,
                sell_through: store.sell_through,
                inventory_units: store.inventory_units,
                store_efficiency: store.store_efficiency,
            });
        });

        Object.keys(cityTierBucketTopStores).forEach((key) => {
            cityTierBucketTopStores[key]
                .sort((a, b) => b.net_sales - a.net_sales)
                .splice(10);
        });

        const cityTierBucketCells: CityTierBucketCell[] = Object.values(cityTierBucketAccMap).map((item) => ({
            city_tier: item.city_tier,
            sales_bucket: item.sales_bucket,
            store_count: item.store_count,
            store_count_share: totalStoreCount > 0 ? item.store_count / totalStoreCount : 0,
            net_sales: item.net_sales,
            sales_share: totalStoreSales > 0 ? item.net_sales / totalStoreSales : 0,
        }));

        const cityTierOrder = Array.from(new Set(stores.map((store) => store.city_tier))).sort(sortByTierOrder);

        const formatMixMap: Record<string, { store_format: string; store_count: number; net_sales: number }> = {};
        stores.forEach((store) => {
            const key = store.store_format;
            if (!formatMixMap[key]) {
                formatMixMap[key] = {
                    store_format: store.store_format,
                    store_count: 0,
                    net_sales: 0,
                };
            }
            formatMixMap[key].store_count += 1;
            formatMixMap[key].net_sales += store.net_sales;
        });

        const storeFormatMix: StoreFormatMixItem[] = Object.values(formatMixMap)
            .map((item) => ({
                store_format: item.store_format,
                store_count: item.store_count,
                store_count_share: totalStoreCount > 0 ? item.store_count / totalStoreCount : 0,
                net_sales: item.net_sales,
                sales_share: totalStoreSales > 0 ? item.net_sales / totalStoreSales : 0,
            }))
            .sort((a, b) => b.net_sales - a.net_sales);

        const formatTierAccMap: Record<string, FormatTierAccumulator> = {};
        stores.forEach((store) => {
            const key = `${store.store_format}__${store.city_tier}`;
            if (!formatTierAccMap[key]) {
                formatTierAccMap[key] = {
                    store_format: store.store_format,
                    city_tier: store.city_tier,
                    store_count: 0,
                    net_sales: 0,
                    stWeighted: 0,
                    stWeight: 0,
                    gmWeighted: 0,
                    gmWeight: 0,
                };
            }
            const item = formatTierAccMap[key];
            const salesWeight = Math.max(store.net_sales, 0);
            item.store_count += 1;
            item.net_sales += store.net_sales;
            item.stWeighted += store.sell_through * salesWeight;
            item.stWeight += salesWeight;
            item.gmWeighted += store.gm_rate * salesWeight;
            item.gmWeight += salesWeight;
        });

        const formatTierCells: FormatTierMatrixCell[] = Object.values(formatTierAccMap).map((item) => ({
            store_format: item.store_format,
            city_tier: item.city_tier,
            store_count: item.store_count,
            net_sales: item.net_sales,
            sell_through: item.stWeight > 0 ? item.stWeighted / item.stWeight : 0,
            gm_rate: item.gmWeight > 0 ? item.gmWeighted / item.gmWeight : 0,
        }));

        const formatOrder = Array.from(new Set(storeFormatMix.map((item) => item.store_format)));
        const formatTierOrder = Array.from(new Set(formatTierCells.map((item) => item.city_tier))).sort(sortByTierOrder);

        const regionCityAccMap: Record<string, {
            region: string;
            city_tier: string;
            store_count: number;
            net_sales: number;
            stWeighted: number;
            stWeight: number;
            inventory_units: number;
        }> = {};

        stores.forEach((store) => {
            const key = `${store.region}__${store.city_tier}`;
            if (!regionCityAccMap[key]) {
                regionCityAccMap[key] = {
                    region: store.region,
                    city_tier: store.city_tier,
                    store_count: 0,
                    net_sales: 0,
                    stWeighted: 0,
                    stWeight: 0,
                    inventory_units: 0,
                };
            }
            const item = regionCityAccMap[key];
            const salesWeight = Math.max(store.net_sales, 1);
            item.store_count += 1;
            item.net_sales += store.net_sales;
            item.stWeighted += store.sell_through * salesWeight;
            item.stWeight += salesWeight;
            item.inventory_units += store.inventory_units;
        });

        const regionCityEfficiency: RegionCityEfficiencyItem[] = Object.values(regionCityAccMap)
            .map((item) => ({
                region: item.region,
                city_tier: item.city_tier,
                store_count: item.store_count,
                net_sales: item.net_sales,
                sell_through: item.stWeight > 0 ? item.stWeighted / item.stWeight : 0,
                inventory_units: item.inventory_units,
            }))
            .sort((a, b) => {
                if (a.region !== b.region) return a.region.localeCompare(b.region, 'zh-CN');
                return sortByTierOrder(a.city_tier, b.city_tier);
            });

        const regionDrillOrder = Array.from(new Set(stores.map((store) => store.region))).sort((a, b) => a.localeCompare(b, 'zh-CN'));

        const terminalHealthAccMap: Record<string, {
            region: string;
            city_tier: string;
            store_format: string;
            store_count: number;
            net_sales: number;
            inventory_units: number;
            st_weighted: number;
            st_weight: number;
            turnover_weighted: number;
            turnover_weight: number;
        }> = {};

        stores.forEach((store) => {
            const key = `${store.region}__${store.city_tier}__${store.store_format}`;
            if (!terminalHealthAccMap[key]) {
                terminalHealthAccMap[key] = {
                    region: store.region,
                    city_tier: store.city_tier,
                    store_format: store.store_format,
                    store_count: 0,
                    net_sales: 0,
                    inventory_units: 0,
                    st_weighted: 0,
                    st_weight: 0,
                    turnover_weighted: 0,
                    turnover_weight: 0,
                };
            }
            const item = terminalHealthAccMap[key];
            const salesWeight = Math.max(store.net_sales, 1);
            const inventoryBase = Math.max(store.inventory_units, 1);
            const turnover = store.units > 0 ? store.units / inventoryBase : 0;
            item.store_count += 1;
            item.net_sales += store.net_sales;
            item.inventory_units += store.inventory_units;
            item.st_weighted += store.sell_through * salesWeight;
            item.st_weight += salesWeight;
            item.turnover_weighted += turnover * salesWeight;
            item.turnover_weight += salesWeight;
        });

        const terminalHealthPoints: TerminalHealthPoint[] = Object.entries(terminalHealthAccMap)
            .map(([point_id, item]) => ({
                point_id,
                region: item.region,
                city_tier: item.city_tier,
                store_format: item.store_format,
                store_count: item.store_count,
                net_sales: item.net_sales,
                sell_through: item.st_weight > 0 ? item.st_weighted / item.st_weight : 0,
                inventory_turnover: item.turnover_weight > 0 ? item.turnover_weighted / item.turnover_weight : 0,
                inventory_units: item.inventory_units,
            }))
            .filter((item) => item.net_sales > 0)
            .sort((a, b) => b.net_sales - a.net_sales);

        const turnoverValues = terminalHealthPoints.map((item) => item.inventory_turnover);
        const salesValues = terminalHealthPoints.map((item) => item.net_sales);
        const minTurnover = turnoverValues.length ? Math.min(...turnoverValues) : 0;
        const maxTurnover = turnoverValues.length ? Math.max(...turnoverValues) : 1;
        const minSales = salesValues.length ? Math.min(...salesValues) : 0;
        const maxSales = salesValues.length ? Math.max(...salesValues) : 1;
        const avgTurnover = turnoverValues.length ? turnoverValues.reduce((s, v) => s + v, 0) / turnoverValues.length : 0;
        const avgSellThrough = terminalHealthPoints.length
            ? terminalHealthPoints.reduce((s, item) => s + item.sell_through, 0) / terminalHealthPoints.length
            : 0;

        const withScores = terminalHealthPoints.map((item) => {
            const turnoverNorm = maxTurnover > minTurnover
                ? (item.inventory_turnover - minTurnover) / (maxTurnover - minTurnover)
                : 0.5;
            const salesNorm = maxSales > minSales
                ? (item.net_sales - minSales) / (maxSales - minSales)
                : 0.5;
            const efficiencyScore = item.sell_through * 0.6 + turnoverNorm * 0.4;
            const laggingScore = (1 - item.sell_through) * 0.5 + (1 - turnoverNorm) * 0.3 + salesNorm * 0.2;
            return { ...item, efficiencyScore, laggingScore };
        });

        const efficiencyLeaderboard: TerminalHealthRankItem[] = withScores
            .filter((item) => item.sell_through >= avgSellThrough && item.inventory_turnover >= avgTurnover)
            .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
            .slice(0, 5)
            .map((item) => ({
                point_id: item.point_id,
                region: item.region,
                city_tier: item.city_tier,
                store_format: item.store_format,
                store_count: item.store_count,
                net_sales: item.net_sales,
                sell_through: item.sell_through,
                inventory_turnover: item.inventory_turnover,
                diagnosis: '高动销 + 高周转，建议优先配货',
            }));

        const laggingLeaderboard: TerminalHealthRankItem[] = withScores
            .sort((a, b) => b.laggingScore - a.laggingScore)
            .slice(0, 5)
            .map((item) => ({
                point_id: item.point_id,
                region: item.region,
                city_tier: item.city_tier,
                store_format: item.store_format,
                store_count: item.store_count,
                net_sales: item.net_sales,
                sell_through: item.sell_through,
                inventory_turnover: item.inventory_turnover,
                diagnosis: item.sell_through < avgSellThrough
                    ? '低售罄拖累，建议做调拨/促销去化'
                    : '周转偏慢，建议压缩深度并优化结构',
            }));

        return {
            regionStats,
            regionSplitStats,
            formatStats,
            tierStats,
            regionPerformance,
            regionChannelMatrix: {
                regions: regionOrder,
                channels: channelOrder,
                cells: regionChannelCells,
            },
            cityTierBucketMatrix: {
                tiers: cityTierOrder,
                buckets: SALES_BUCKETS,
                cells: cityTierBucketCells,
            },
            cityTierBucketTopStores,
            storeFormatMix,
            formatTierMatrix: {
                formats: formatOrder,
                tiers: formatTierOrder,
                cells: formatTierCells,
            },
            regionCityEfficiency,
            regionDrillOrder,
            storeDrillList: stores,
            terminalHealthPoints,
            efficiencyLeaderboard,
            laggingLeaderboard,
        };
    }, [channelMap, filters, skuMap]);
}
