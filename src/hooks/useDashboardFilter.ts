'use client';

import { useState, useMemo } from 'react';
import factSales from '@/../data/dashboard/fact_sales.json';
import dimSku from '@/../data/dashboard/dim_sku.json';
import dimChannel from '@/../data/dashboard/dim_channel.json';

export interface DashboardFilters {
    season_year: number | 'all';
    season: string | 'all';
    wave: string | 'all';
    category_lv1: string | 'all';
    channel_type: string | 'all';
    price_band: string | 'all'; // 'PB1' | 'PB2' ...
    lifecycle: string | 'all';
}

export const DEFAULT_FILTERS: DashboardFilters = {
    season_year: 2024,
    season: 'all',
    wave: 'all',
    category_lv1: 'all',
    channel_type: 'all',
    price_band: 'all',
    lifecycle: 'all',
};

const PRICE_BANDS = [
    { id: 'PB1', min: 199, max: 299 },
    { id: 'PB2', min: 300, max: 399 },
    { id: 'PB3', min: 400, max: 499 },
    { id: 'PB4', min: 500, max: 599 },
    { id: 'PB5', min: 600, max: 699 },
    { id: 'PB6', min: 700, max: 9999 },
];

export function useDashboardFilter() {
    const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

    const skuMap = useMemo(() => {
        const map: Record<string, typeof dimSku[0]> = {};
        dimSku.forEach(s => { map[s.sku_id] = s; });
        return map;
    }, []);

    const channelMap = useMemo(() => {
        const map: Record<string, typeof dimChannel[0]> = {};
        dimChannel.forEach(c => { map[c.channel_id] = c; });
        return map;
    }, []);

    const filteredRecords = useMemo(() => {
        return factSales.filter(record => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;

            if (filters.season_year !== 'all' && record.season_year !== filters.season_year) return false;
            if (filters.season !== 'all' && record.season !== filters.season) return false;
            if (filters.wave !== 'all' && record.wave !== filters.wave) return false;
            if (filters.category_lv1 !== 'all' && sku.category_lv1 !== filters.category_lv1) return false;
            if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
            if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;

            if (filters.price_band !== 'all') {
                const band = PRICE_BANDS.find(b => b.id === filters.price_band);
                if (band && (sku.msrp < band.min || sku.msrp > band.max)) return false;
            }

            return true;
        });
    }, [filters, skuMap, channelMap]);

    // ── KPI 计算 ──────────────────────────────────────────────
    const kpis = useMemo(() => {
        if (filteredRecords.length === 0) return null;

        const totalNetSales = filteredRecords.reduce((s, r) => s + r.net_sales_amt, 0);
        const totalGrossSales = filteredRecords.reduce((s, r) => s + r.gross_sales_amt, 0);
        const totalUnits = filteredRecords.reduce((s, r) => s + r.unit_sold, 0);
        const totalGrossProfit = filteredRecords.reduce((s, r) => s + r.gross_profit_amt, 0);
        const totalDiscountAmt = filteredRecords.reduce((s, r) => s + r.discount_amt, 0);

        // 售罄率：取各SKU最新周的累计售罄率均值
        const skuLatestST: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (!skuLatestST[r.sku_id] || r.week_num > (skuLatestST[r.sku_id + '_week'] ?? 0)) {
                skuLatestST[r.sku_id] = r.cumulative_sell_through;
                (skuLatestST as Record<string, number>)[r.sku_id + '_week'] = r.week_num;
            }
        });
        const skuIds = Object.keys(skuLatestST).filter(k => !k.includes('_week'));
        const avgSellThrough = skuIds.length > 0
            ? skuIds.reduce((s, id) => s + skuLatestST[id], 0) / skuIds.length
            : 0;

        const avgMarginRate = totalNetSales > 0 ? totalGrossProfit / totalNetSales : 0;
        const avgDiscountDepth = totalGrossSales > 0 ? totalDiscountAmt / totalGrossSales : 0;

        // 动销 SKU 数（有销售记录的唯一SKU）
        const activeSKUs = new Set(filteredRecords.map(r => r.sku_id)).size;

        // 渠道结构
        const channelSales: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const ch = channelMap[r.channel_id];
            if (ch) {
                channelSales[ch.channel_type] = (channelSales[ch.channel_type] || 0) + r.net_sales_amt;
            }
        });

        // 价格带结构
        const priceBandSales: Record<string, { units: number; sales: number }> = {};
        filteredRecords.forEach(r => {
            const sku = skuMap[r.sku_id];
            if (!sku) return;
            const band = PRICE_BANDS.find(b => sku.msrp >= b.min && sku.msrp <= b.max);
            if (band) {
                if (!priceBandSales[band.id]) priceBandSales[band.id] = { units: 0, sales: 0 };
                priceBandSales[band.id].units += r.unit_sold;
                priceBandSales[band.id].sales += r.net_sales_amt;
            }
        });

        // 周售罄曲线（用于折线图）
        const weeklyData: Record<number, { units: number; sales: number; st: number }> = {};
        filteredRecords.forEach(r => {
            if (!weeklyData[r.week_num]) weeklyData[r.week_num] = { units: 0, sales: 0, st: 0 };
            weeklyData[r.week_num].units += r.unit_sold;
            weeklyData[r.week_num].sales += r.net_sales_amt;
        });
        // 累计售罄（用最新周均值）
        Object.keys(weeklyData).forEach(w => {
            const week = parseInt(w);
            const weekRecords = filteredRecords.filter(r => r.week_num === week);
            const stVals = weekRecords.map(r => r.cumulative_sell_through);
            weeklyData[week].st = stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : 0;
        });

        // Top SKU
        const skuSales: Record<string, number> = {};
        filteredRecords.forEach(r => {
            skuSales[r.sku_id] = (skuSales[r.sku_id] || 0) + r.net_sales_amt;
        });
        const sortedSkus = Object.entries(skuSales).sort((a, b) => b[1] - a[1]);
        const top10Sales = sortedSkus.slice(0, 10).reduce((s, [, v]) => s + v, 0);
        const top10Concentration = totalNetSales > 0 ? top10Sales / totalNetSales : 0;

        return {
            totalNetSales,
            totalGrossSales,
            totalUnits,
            totalGrossProfit,
            avgSellThrough,
            avgMarginRate,
            avgDiscountDepth,
            activeSKUs,
            channelSales,
            priceBandSales,
            weeklyData,
            top10Concentration,
            sortedSkus: sortedSkus.slice(0, 10).map(([id, sales]) => ({
                sku: skuMap[id],
                sales,
                pct: totalNetSales > 0 ? sales / totalNetSales : 0,
            })),
        };
    }, [filteredRecords, skuMap, channelMap]);

    const filterSummary = useMemo(() => {
        const parts: string[] = [];
        if (filters.season_year !== 'all') parts.push(`${filters.season_year}年`);
        if (filters.season !== 'all') parts.push(`${filters.season}季`);
        if (filters.wave !== 'all') parts.push(filters.wave);
        if (filters.category_lv1 !== 'all') parts.push(filters.category_lv1);
        if (filters.channel_type !== 'all') parts.push(filters.channel_type);
        if (filters.lifecycle !== 'all') parts.push(filters.lifecycle);
        if (filters.price_band !== 'all') {
            const band = PRICE_BANDS.find(b => b.id === filters.price_band);
            if (band) parts.push(`¥${band.min}-${band.max === 9999 ? '700+' : band.max}`);
        }
        return parts.length > 0 ? parts.join(' · ') : '全部数据';
    }, [filters]);

    return {
        filters,
        setFilters,
        filteredRecords,
        kpis,
        filterSummary,
        skuMap,
        channelMap,
    };
}
