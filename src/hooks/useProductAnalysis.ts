'use client';

import { useMemo } from 'react';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import { DashboardFilters } from '@/hooks/useDashboardFilter';

interface DimSku {
    sku_id: string;
    sku_name?: string;
    category_id: string;
    category_name?: string;
    price_band?: string;
    msrp: number;
    lifecycle: string;
    product_line?: string;
    target_age_group?: string;
    target_audience?: string;
    color?: string;
    color_family?: string;
}

interface DimChannel {
    channel_id: string;
    channel_type: string;
    region: string;
    city_tier: string;
    store_format: string;
}

interface FactSalesRecord {
    sku_id: string;
    channel_id: string;
    season_year: string | number;
    season: string;
    wave: string;
    unit_sold: number;
    net_sales_amt: number;
    gross_margin_rate: number;
    cumulative_sell_through: number;
}

interface SkuAgg {
    pairs_sold: number;
    net_sales: number;
    st_weighted: number;
    st_weight: number;
    gm_weighted: number;
    gm_weight: number;
}

export interface AgeLineCell {
    age_group: string;
    product_line: string;
    pairs_sold: number;
    net_sales: number;
    sales_share: number;
    pairs_share: number;
    asp: number;
    sell_through: number;
    gm_rate: number;
}

export interface AgePriceCell {
    age_group: string;
    price_band: string;
    pairs_sold: number;
    net_sales: number;
    sales_share: number;
    sell_through: number;
    gm_rate: number;
}

export interface ColorStat {
    color_family: string;
    pairs_sold: number;
    net_sales: number;
    sell_through: number;
    gm_rate: number;
    skc_cnt: number;
}

export interface ColorCategoryCell {
    color_family: string;
    category: string;
    net_sales: number;
    sell_through: number;
    gm_rate: number;
}

export interface SkuDrillRow {
    sku_id: string;
    sku_name: string;
    age_group: string;
    product_line: string;
    category: string;
    price_band: string;
    color_family: string;
    pairs_sold: number;
    net_sales: number;
    sell_through: number;
    gm_rate: number;
    asp: number;
}

const AGE_ORDER = ['18-25', '26-35', '36-45', '46+', '未知'];

const AUDIENCE_TO_AGE_GROUP: Record<string, string[]> = {
    '18-23岁 GenZ': ['18-25'],
    '24-28岁 职场新人': ['26-35'],
    '29-35岁 资深中产': ['26-35'],
    '35岁以上': ['36-45', '46+'],
};

const salesRecords = factSalesRaw as FactSalesRecord[];
const skus = dimSkuRaw as DimSku[];
const channels = dimChannelRaw as DimChannel[];

function parseBandRank(band: string) {
    const match = band.match(/\d+/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    return Number(match[0]);
}

function sortPriceBands(a: string, b: string) {
    return parseBandRank(a) - parseBandRank(b);
}

function matchesPriceBand(msrp: number, selectedPriceBand: string | 'all') {
    if (selectedPriceBand === 'all') return true;
    const bandMap: Record<string, [number, number]> = {
        PB1: [199, 299],
        PB2: [300, 399],
        PB3: [400, 499],
        PB4: [500, 599],
        PB5: [600, 699],
        PB6: [700, 9999],
        PB7: [800, 9999],
    };
    const range = bandMap[selectedPriceBand];
    if (!range) return true;
    return msrp >= range[0] && msrp <= range[1];
}

function matchesTargetAudience(sku: DimSku, selectedAudience: string | 'all') {
    if (selectedAudience === 'all') return true;
    if (sku.target_audience === selectedAudience) return true;
    if (sku.target_age_group === selectedAudience) return true;
    if (sku.target_age_group) {
        const mapped = AUDIENCE_TO_AGE_GROUP[selectedAudience];
        if (mapped?.includes(sku.target_age_group)) return true;
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
    filters: DashboardFilters
) {
    if (filters.season_year !== 'all' && String(sale.season_year) !== String(filters.season_year)) return false;
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

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

export function useProductAnalysis(filters: DashboardFilters) {
    return useMemo(() => {
        const skuMap: Record<string, DimSku> = {};
        skus.forEach((sku) => {
            skuMap[sku.sku_id] = sku;
        });

        const channelMap: Record<string, DimChannel> = {};
        channels.forEach((channel) => {
            channelMap[channel.channel_id] = channel;
        });

        const skuAggMap: Record<string, SkuAgg> = {};
        salesRecords.forEach((sale) => {
            const sku = skuMap[sale.sku_id];
            const channel = channelMap[sale.channel_id];
            if (!sku || !channel) return;
            if (!shouldIncludeRecord(sale, sku, channel, filters)) return;

            if (!skuAggMap[sale.sku_id]) {
                skuAggMap[sale.sku_id] = {
                    pairs_sold: 0,
                    net_sales: 0,
                    st_weighted: 0,
                    st_weight: 0,
                    gm_weighted: 0,
                    gm_weight: 0,
                };
            }
            const bucket = skuAggMap[sale.sku_id];
            const unitWeight = Math.max(sale.unit_sold || 0, 1);
            const salesWeight = Math.max(sale.net_sales_amt || 0, 0);
            bucket.pairs_sold += sale.unit_sold || 0;
            bucket.net_sales += sale.net_sales_amt || 0;
            bucket.st_weighted += (sale.cumulative_sell_through || 0) * unitWeight;
            bucket.st_weight += unitWeight;
            bucket.gm_weighted += (sale.gross_margin_rate || 0) * salesWeight;
            bucket.gm_weight += salesWeight;
        });

        const ageLineMap: Record<string, {
            age_group: string;
            product_line: string;
            pairs_sold: number;
            net_sales: number;
            st_weighted: number;
            st_weight: number;
            gm_weighted: number;
            gm_weight: number;
        }> = {};

        const agePriceMap: Record<string, {
            age_group: string;
            price_band: string;
            pairs_sold: number;
            net_sales: number;
            st_weighted: number;
            st_weight: number;
            gm_weighted: number;
            gm_weight: number;
        }> = {};

        const colorMap: Record<string, {
            color_family: string;
            pairs_sold: number;
            net_sales: number;
            st_weighted: number;
            st_weight: number;
            gm_weighted: number;
            gm_weight: number;
            skc_cnt: number;
        }> = {};

        const colorCategoryMap: Record<string, {
            color_family: string;
            category: string;
            net_sales: number;
            st_weighted: number;
            st_weight: number;
            gm_weighted: number;
            gm_weight: number;
        }> = {};

        Object.entries(skuAggMap).forEach(([skuId, agg]) => {
            const sku = skuMap[skuId];
            if (!sku) return;

            const age_group = sku.target_age_group || '未知';
            const product_line = sku.product_line || '未定义产品线';
            const price_band = sku.price_band || 'PBX';
            const color_family = sku.color_family || '未知';
            const category = sku.category_name || sku.category_id || '未知品类';

            const ageLineKey = `${age_group}__${product_line}`;
            if (!ageLineMap[ageLineKey]) {
                ageLineMap[ageLineKey] = {
                    age_group,
                    product_line,
                    pairs_sold: 0,
                    net_sales: 0,
                    st_weighted: 0,
                    st_weight: 0,
                    gm_weighted: 0,
                    gm_weight: 0,
                };
            }
            ageLineMap[ageLineKey].pairs_sold += agg.pairs_sold;
            ageLineMap[ageLineKey].net_sales += agg.net_sales;
            ageLineMap[ageLineKey].st_weighted += agg.st_weighted;
            ageLineMap[ageLineKey].st_weight += agg.st_weight;
            ageLineMap[ageLineKey].gm_weighted += agg.gm_weighted;
            ageLineMap[ageLineKey].gm_weight += agg.gm_weight;

            const agePriceKey = `${age_group}__${price_band}`;
            if (!agePriceMap[agePriceKey]) {
                agePriceMap[agePriceKey] = {
                    age_group,
                    price_band,
                    pairs_sold: 0,
                    net_sales: 0,
                    st_weighted: 0,
                    st_weight: 0,
                    gm_weighted: 0,
                    gm_weight: 0,
                };
            }
            agePriceMap[agePriceKey].pairs_sold += agg.pairs_sold;
            agePriceMap[agePriceKey].net_sales += agg.net_sales;
            agePriceMap[agePriceKey].st_weighted += agg.st_weighted;
            agePriceMap[agePriceKey].st_weight += agg.st_weight;
            agePriceMap[agePriceKey].gm_weighted += agg.gm_weighted;
            agePriceMap[agePriceKey].gm_weight += agg.gm_weight;

            if (!colorMap[color_family]) {
                colorMap[color_family] = {
                    color_family,
                    pairs_sold: 0,
                    net_sales: 0,
                    st_weighted: 0,
                    st_weight: 0,
                    gm_weighted: 0,
                    gm_weight: 0,
                    skc_cnt: 0,
                };
            }
            colorMap[color_family].pairs_sold += agg.pairs_sold;
            colorMap[color_family].net_sales += agg.net_sales;
            colorMap[color_family].st_weighted += agg.st_weighted;
            colorMap[color_family].st_weight += agg.st_weight;
            colorMap[color_family].gm_weighted += agg.gm_weighted;
            colorMap[color_family].gm_weight += agg.gm_weight;
            colorMap[color_family].skc_cnt += 1;

            const colorCategoryKey = `${color_family}__${category}`;
            if (!colorCategoryMap[colorCategoryKey]) {
                colorCategoryMap[colorCategoryKey] = {
                    color_family,
                    category,
                    net_sales: 0,
                    st_weighted: 0,
                    st_weight: 0,
                    gm_weighted: 0,
                    gm_weight: 0,
                };
            }
            colorCategoryMap[colorCategoryKey].net_sales += agg.net_sales;
            colorCategoryMap[colorCategoryKey].st_weighted += agg.st_weighted;
            colorCategoryMap[colorCategoryKey].st_weight += agg.st_weight;
            colorCategoryMap[colorCategoryKey].gm_weighted += agg.gm_weighted;
            colorCategoryMap[colorCategoryKey].gm_weight += agg.gm_weight;
        });

        const totalNetSales = Object.values(ageLineMap).reduce((sum, item) => sum + item.net_sales, 0);
        const totalPairs = Object.values(ageLineMap).reduce((sum, item) => sum + item.pairs_sold, 0);

        const ageLineCells: AgeLineCell[] = Object.values(ageLineMap).map((item) => ({
            age_group: item.age_group,
            product_line: item.product_line,
            pairs_sold: item.pairs_sold,
            net_sales: item.net_sales,
            sales_share: safeDiv(item.net_sales, totalNetSales),
            pairs_share: safeDiv(item.pairs_sold, totalPairs),
            asp: safeDiv(item.net_sales, item.pairs_sold),
            sell_through: safeDiv(item.st_weighted, item.st_weight),
            gm_rate: safeDiv(item.gm_weighted, item.gm_weight),
        }));

        const agePriceCells: AgePriceCell[] = Object.values(agePriceMap).map((item) => ({
            age_group: item.age_group,
            price_band: item.price_band,
            pairs_sold: item.pairs_sold,
            net_sales: item.net_sales,
            sales_share: safeDiv(item.net_sales, totalNetSales),
            sell_through: safeDiv(item.st_weighted, item.st_weight),
            gm_rate: safeDiv(item.gm_weighted, item.gm_weight),
        }));

        const colorStats: ColorStat[] = Object.values(colorMap)
            .map((item) => ({
                color_family: item.color_family,
                pairs_sold: item.pairs_sold,
                net_sales: item.net_sales,
                sell_through: safeDiv(item.st_weighted, item.st_weight),
                gm_rate: safeDiv(item.gm_weighted, item.gm_weight),
                skc_cnt: item.skc_cnt,
            }))
            .sort((a, b) => b.net_sales - a.net_sales);

        const colorCategoryCells: ColorCategoryCell[] = Object.values(colorCategoryMap).map((item) => ({
            color_family: item.color_family,
            category: item.category,
            net_sales: item.net_sales,
            sell_through: safeDiv(item.st_weighted, item.st_weight),
            gm_rate: safeDiv(item.gm_weighted, item.gm_weight),
        }));

        const skuDrillRows: SkuDrillRow[] = Object.entries(skuAggMap)
            .map(([skuId, agg]) => {
                const sku = skuMap[skuId];
                if (!sku) return null;
                return {
                    sku_id: skuId,
                    sku_name: sku.sku_name || skuId,
                    age_group: sku.target_age_group || '未知',
                    product_line: sku.product_line || '未定义产品线',
                    category: sku.category_name || sku.category_id || '未知品类',
                    price_band: sku.price_band || 'PBX',
                    color_family: sku.color_family || '未知',
                    pairs_sold: agg.pairs_sold,
                    net_sales: agg.net_sales,
                    sell_through: safeDiv(agg.st_weighted, agg.st_weight),
                    gm_rate: safeDiv(agg.gm_weighted, agg.gm_weight),
                    asp: safeDiv(agg.net_sales, agg.pairs_sold),
                };
            })
            .filter((row): row is SkuDrillRow => Boolean(row))
            .sort((a, b) => b.net_sales - a.net_sales);

        const productLineTotals = ageLineCells.reduce<Record<string, number>>((acc, item) => {
            acc[item.product_line] = (acc[item.product_line] || 0) + item.net_sales;
            return acc;
        }, {});

        const ageGroupTotals = ageLineCells.reduce<Record<string, { net_sales: number; pairs_sold: number }>>((acc, item) => {
            if (!acc[item.age_group]) acc[item.age_group] = { net_sales: 0, pairs_sold: 0 };
            acc[item.age_group].net_sales += item.net_sales;
            acc[item.age_group].pairs_sold += item.pairs_sold;
            return acc;
        }, {});

        const ageGroups = Array.from(new Set(ageLineCells.map((item) => item.age_group))).sort((a, b) => {
            const ai = AGE_ORDER.indexOf(a);
            const bi = AGE_ORDER.indexOf(b);
            const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
            const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
            if (av !== bv) return av - bv;
            return a.localeCompare(b, 'zh-CN');
        });

        const productLines = Array.from(new Set(ageLineCells.map((item) => item.product_line)))
            .sort((a, b) => (productLineTotals[b] || 0) - (productLineTotals[a] || 0));

        const priceBands = Array.from(new Set(agePriceCells.map((item) => item.price_band))).sort(sortPriceBands);
        const categories = Array.from(new Set(colorCategoryCells.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        const colorFamilies = colorStats.map((item) => item.color_family);

        return {
            totals: {
                net_sales: totalNetSales,
                pairs_sold: totalPairs,
            },
            ageLineCells,
            agePriceCells,
            colorStats,
            colorCategoryCells,
            skuDrillRows,
            ageGroups,
            productLines,
            priceBands,
            categories,
            colorFamilies,
            ageGroupTotals,
        };
    }, [filters]);
}
