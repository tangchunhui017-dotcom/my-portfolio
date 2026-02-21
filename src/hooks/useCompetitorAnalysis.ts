'use client';

import { useMemo } from 'react';
import dimCompetitorRaw from '@/../data/dashboard/dim_competitor.json';
import factCompetitorRaw from '@/../data/dashboard/fact_competitor.json';

interface CategoryMix {
    category: string;
    sku_count: number;
    ratio: number;
}

interface HotSku {
    rank: number;
    category: string;
    name: string;
    msrp: number;
    sell_through: number;
    buzz_score: number;
}

interface DimCompetitor {
    id: string;
    name: string;
    position: string;
    market_share: number;
    yoy: number;
    category_mix: CategoryMix[];
    trend_tags: string[];
    hot_skus: HotSku[];
}

interface FactCompetitor {
    competitor_name: string;
    category_name: string;
    price_band: string;
    price_band_name: string;
    estimated_sales_amt: number;
    estimated_units: number;
    market_share_pct: string;
}

export interface CompetitorSkuStructureRow {
    comp_brand: string;
    category_l2: string;
    sku_cnt: number;
    sku_share: number;
    sku_yoy: number;
}

export interface CompetitorBrandSummary {
    comp_brand: string;
    position: string;
    market_share: number;
    sku_total: number;
    sku_yoy: number;
}

export interface CompetitorGalleryItem {
    id: string;
    comp_brand: string;
    wave: string;
    region: string;
    temp_range: string;
    image_url: string;
    tags: string[];
    title: string;
    category: string;
    sell_through: number;
    buzz_score: number;
}

export interface PriceBandBenchmarkRow {
    comp_brand: string;
    category: string;
    price_band: string;
    price_band_name: string;
    net_sales: number;
    sales_share: number;
}

const dimCompetitors = dimCompetitorRaw as DimCompetitor[];
const factCompetitors = factCompetitorRaw as FactCompetitor[];

const REGION_POOL = [
    { region: '华东', temp_range: '温和带 10-24℃' },
    { region: '华南', temp_range: '暖热带 18-32℃' },
    { region: '华北', temp_range: '冷凉带 5-18℃' },
    { region: '西南', temp_range: '温热带 12-28℃' },
];

const WAVE_POOL = ['W1', 'W2', 'W3', 'W4'];
const REAL_IMAGE_POOL = [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1576672843344-f01907a9d40c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=80',
];

function parseBandRank(band: string) {
    const match = band.match(/\d+/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    return Number(match[0]);
}

export function useCompetitorAnalysis() {
    return useMemo(() => {
        const skuStructureRows: CompetitorSkuStructureRow[] = [];
        const brandSummary: CompetitorBrandSummary[] = dimCompetitors.map((brand) => {
            const skuTotal = brand.category_mix.reduce((sum, item) => sum + item.sku_count, 0);
            brand.category_mix.forEach((item) => {
                skuStructureRows.push({
                    comp_brand: brand.name,
                    category_l2: item.category,
                    sku_cnt: item.sku_count,
                    sku_share: item.ratio,
                    sku_yoy: brand.yoy,
                });
            });
            return {
                comp_brand: brand.name,
                position: brand.position,
                market_share: brand.market_share,
                sku_total: skuTotal,
                sku_yoy: brand.yoy,
            };
        }).sort((a, b) => b.market_share - a.market_share);

        const categories = Array.from(new Set(skuStructureRows.map((row) => row.category_l2)));
        const brands = brandSummary.map((item) => item.comp_brand);

        const brandCategoryMap = new Map<string, CompetitorSkuStructureRow>();
        skuStructureRows.forEach((row) => {
            brandCategoryMap.set(`${row.comp_brand}__${row.category_l2}`, row);
        });

        const skuStructureChartData = brandSummary.map((brand) => {
            const row: Record<string, string | number> = {
                comp_brand: brand.comp_brand,
                sku_yoy: brand.sku_yoy * 100,
                market_share: brand.market_share * 100,
            };
            categories.forEach((category) => {
                const hit = brandCategoryMap.get(`${brand.comp_brand}__${category}`);
                row[category] = (hit?.sku_share || 0) * 100;
            });
            return row;
        });

        let galleryIndex = 0;
        const galleryItems: CompetitorGalleryItem[] = [];
        dimCompetitors.forEach((brand, brandIndex) => {
            brand.hot_skus.forEach((sku, skuIndex) => {
                const regionItem = REGION_POOL[(brandIndex + skuIndex) % REGION_POOL.length];
                const wave = WAVE_POOL[(sku.rank + brandIndex) % WAVE_POOL.length];
                const tags = [sku.category, ...brand.trend_tags.slice(0, 2), `¥${sku.msrp}`];
                galleryItems.push({
                    id: `${brand.id}-${sku.rank}`,
                    comp_brand: brand.name,
                    wave,
                    region: regionItem.region,
                    temp_range: regionItem.temp_range,
                    image_url: REAL_IMAGE_POOL[galleryIndex++ % REAL_IMAGE_POOL.length],
                    tags,
                    title: sku.name,
                    category: sku.category,
                    sell_through: sku.sell_through,
                    buzz_score: sku.buzz_score,
                });
            });
        });

        const factAccMap: Record<string, { net_sales: number }> = {};
        factCompetitors.forEach((row) => {
            const key = `${row.competitor_name}__${row.category_name}__${row.price_band}__${row.price_band_name}`;
            if (!factAccMap[key]) factAccMap[key] = { net_sales: 0 };
            factAccMap[key].net_sales += row.estimated_sales_amt || 0;
        });

        const brandCategorySalesMap: Record<string, number> = {};
        Object.entries(factAccMap).forEach(([key, value]) => {
            const [comp_brand, category] = key.split('__');
            const brandCategoryKey = `${comp_brand}__${category}`;
            brandCategorySalesMap[brandCategoryKey] = (brandCategorySalesMap[brandCategoryKey] || 0) + value.net_sales;
        });

        const priceBandBenchmarkRows: PriceBandBenchmarkRow[] = Object.entries(factAccMap)
            .map(([key, value]) => {
                const [comp_brand, category, price_band, price_band_name] = key.split('__');
                const total = brandCategorySalesMap[`${comp_brand}__${category}`] || 0;
                return {
                    comp_brand,
                    category,
                    price_band,
                    price_band_name,
                    net_sales: value.net_sales,
                    sales_share: total > 0 ? value.net_sales / total : 0,
                };
            })
            .sort((a, b) => {
                if (a.comp_brand !== b.comp_brand) return a.comp_brand.localeCompare(b.comp_brand, 'zh-CN');
                if (a.category !== b.category) return a.category.localeCompare(b.category, 'zh-CN');
                return parseBandRank(a.price_band) - parseBandRank(b.price_band);
            });

        const waveOptions = Array.from(new Set(galleryItems.map((item) => item.wave)));
        const regionOptions = Array.from(new Set(galleryItems.map((item) => item.region)));

        return {
            brands,
            categories,
            brandSummary,
            skuStructureRows,
            skuStructureChartData,
            galleryItems,
            waveOptions,
            regionOptions,
            priceBandBenchmarkRows,
        };
    }, []);
}
