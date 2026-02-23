'use client';

import { useMemo } from 'react';
import dimCompetitorRaw from '@/../data/dashboard/dim_competitor.json';
import factCompetitorRaw from '@/../data/dashboard/fact_competitor.json';

interface CategoryMix {
    category: string;
    sku_count: number;
    ratio: number;
}

interface PriceBandMix {
    band: string;
    ratio: number;
    sku_count: number;
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
    price_band_mix: PriceBandMix[];
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
    sku_plan_gap: number;
    sku_mom: number;
}

export interface CompetitorBrandSummary {
    comp_brand: string;
    position: string;
    market_share: number;
    sku_total: number;
    sku_plan_base: number;
    sku_mom_base: number;
    sku_plan_gap: number;
    sku_mom: number;
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

export interface CompetitorBubblePoint {
    id: string;
    comp_brand: string;
    category: string;
    price_band: string;
    price_band_name: string;
    band_order: number;
    price_mid: number;
    sku_cnt: number;
    heat: number;
    net_sales: number;
}

export interface CompetitorRadarRow {
    comp_brand: string;
    scores: number[];
}

export interface CompetitorSuppressedCategory {
    category: string;
    comp_brand: string;
    comp_share: number;
    our_share: number;
    gap: number;
}

export interface CompetitorWeakBand {
    price_band_name: string;
    top_brand: string;
    top_sku_cnt: number;
    our_sku_cnt: number;
    share: number;
    gap: number;
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

const RADAR_INDICATORS = ['温度适应性', '陈列面积', '款式新颖度', '价格力', '主推科技'];

const DEFAULT_BAND_MID: Record<number, number> = {
    1: 199,
    2: 249,
    3: 349,
    4: 449,
    5: 599,
    6: 799,
};

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

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function parseBandOrder(rawBand: string) {
    const pbMatch = rawBand.match(/PB\s*(\d+)/i);
    if (pbMatch) return Number(pbMatch[1]);
    const fallback = rawBand.match(/\d+/);
    return fallback ? Number(fallback[0]) : Number.MAX_SAFE_INTEGER;
}

function parseBandName(rawBand: string) {
    const name = rawBand.replace(/^PB\s*\d+\s*/i, '').trim();
    return name || rawBand;
}

function parseBandMidpoint(name: string, order: number) {
    const numbers = name.match(/\d+/g)?.map(Number) || [];
    if (numbers.length >= 2) {
        return Math.round((numbers[0] + numbers[1]) / 2);
    }
    if (numbers.length === 1) {
        const single = numbers[0];
        if (/\+|以上|>=|≥/i.test(name)) return single + 120;
        if (/<=|≤|以下/i.test(name)) return Math.max(99, single - 40);
        return single;
    }
    return DEFAULT_BAND_MID[order] || 399;
}

function avg(numbers: number[], fallback = 0) {
    if (!numbers.length) return fallback;
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function deriveSkuBaselines(brand: DimCompetitor, skuTotal: number) {
    const planGap = clamp(brand.yoy * 0.32 + (brand.market_share - 0.12) * 0.12, -0.12, 0.16);
    const momGap = clamp(brand.yoy * 0.4 + (brand.market_share - 0.1) * 0.1, -0.12, 0.18);
    const skuPlanBase = Math.max(1, Math.round(skuTotal / (1 + planGap)));
    const skuMomBase = Math.max(1, Math.round(skuTotal / (1 + momGap)));
    return {
        skuPlanBase,
        skuMomBase,
        skuPlanGap: safeDiv(skuTotal - skuPlanBase, skuPlanBase),
        skuMom: safeDiv(skuTotal - skuMomBase, skuMomBase),
    };
}

export function useCompetitorAnalysis() {
    return useMemo(() => {
        const skuStructureRows: CompetitorSkuStructureRow[] = [];
        const brandSummary: CompetitorBrandSummary[] = dimCompetitors
            .map((brand) => {
                const skuTotal = brand.category_mix.reduce((sum, item) => sum + item.sku_count, 0);
                const baselines = deriveSkuBaselines(brand, skuTotal);
                brand.category_mix.forEach((item) => {
                    skuStructureRows.push({
                        comp_brand: brand.name,
                        category_l2: item.category,
                        sku_cnt: item.sku_count,
                        sku_share: item.ratio,
                        sku_yoy: brand.yoy,
                        sku_plan_gap: baselines.skuPlanGap,
                        sku_mom: baselines.skuMom,
                    });
                });
                return {
                    comp_brand: brand.name,
                    position: brand.position,
                    market_share: brand.market_share,
                    sku_total: skuTotal,
                    sku_plan_base: baselines.skuPlanBase,
                    sku_mom_base: baselines.skuMomBase,
                    sku_plan_gap: baselines.skuPlanGap,
                    sku_mom: baselines.skuMom,
                    sku_yoy: brand.yoy,
                };
            })
            .sort((a, b) => b.market_share - a.market_share);

        const brands = brandSummary.map((item) => item.comp_brand);
        const categories = Array.from(new Set(skuStructureRows.map((row) => row.category_l2)));
        const ourBrandName = dimCompetitors.find((item) => item.id === 'OUR')?.name || brandSummary[0]?.comp_brand || '本品牌';

        const brandCategoryMap = new Map<string, CompetitorSkuStructureRow>();
        skuStructureRows.forEach((row) => {
            brandCategoryMap.set(`${row.comp_brand}__${row.category_l2}`, row);
        });

        const skuStructureChartData = brandSummary.map((brand) => {
            const row: Record<string, string | number> = {
                comp_brand: brand.comp_brand,
                sku_yoy: brand.sku_yoy * 100,
                sku_plan_gap: brand.sku_plan_gap * 100,
                sku_mom: brand.sku_mom * 100,
                market_share: brand.market_share * 100,
            };
            categories.forEach((category) => {
                const hit = brandCategoryMap.get(`${brand.comp_brand}__${category}`);
                row[category] = (hit?.sku_share || 0) * 100;
            });
            return row;
        });

        const bubblePoints: CompetitorBubblePoint[] = [];
        dimCompetitors.forEach((brand) => {
            const avgBuzz = avg(brand.hot_skus.map((item) => item.buzz_score), 68);
            const categoryBuzzMap = new Map<string, number>();
            const categorySellThroughMap = new Map<string, number>();

            categories.forEach((category) => {
                const hotRows = brand.hot_skus.filter((item) => item.category === category);
                categoryBuzzMap.set(category, avg(hotRows.map((item) => item.buzz_score), avgBuzz));
                categorySellThroughMap.set(category, avg(hotRows.map((item) => item.sell_through), 0.72));
            });

            brand.category_mix.forEach((category) => {
                brand.price_band_mix.forEach((band) => {
                    if ((band.sku_count || 0) <= 0 || (category.ratio || 0) <= 0) return;

                    const bandOrder = parseBandOrder(band.band);
                    const bandName = parseBandName(band.band);
                    const priceMid = parseBandMidpoint(bandName, bandOrder);
                    const skuCnt = Math.max(1, Math.round((band.sku_count || 0) * (category.ratio || 0)));
                    const sellThrough = categorySellThroughMap.get(category.category) || 0.72;
                    const categoryBuzz = categoryBuzzMap.get(category.category) || avgBuzz;
                    const heat = clamp(
                        Math.round(sellThrough * 100 * 0.45 + categoryBuzz * 0.35 + brand.market_share * 100 * 0.2 + brand.yoy * 100),
                        25,
                        98,
                    );
                    const netSales = Math.round(skuCnt * priceMid * (0.75 + heat / 120) * (0.8 + brand.market_share));

                    bubblePoints.push({
                        id: `${brand.id}-${category.category}-${bandOrder}`,
                        comp_brand: brand.name,
                        category: category.category,
                        price_band: `PB${bandOrder}`,
                        price_band_name: bandName,
                        band_order: bandOrder,
                        price_mid: priceMid,
                        sku_cnt: skuCnt,
                        heat,
                        net_sales: netSales,
                    });
                });
            });
        });

        const priceBandOptions = Array.from(new Set(bubblePoints.map((item) => item.price_band_name))).sort((a, b) => {
            const orderA = bubblePoints.find((item) => item.price_band_name === a)?.band_order || 99;
            const orderB = bubblePoints.find((item) => item.price_band_name === b)?.band_order || 99;
            return orderA - orderB;
        });

        const ourShareByCategory = new Map(
            skuStructureRows
                .filter((row) => row.comp_brand === ourBrandName)
                .map((row) => [row.category_l2, row.sku_share]),
        );

        const suppressedCategories: CompetitorSuppressedCategory[] = categories
            .map((category) => {
                const competitors = skuStructureRows
                    .filter((row) => row.category_l2 === category && row.comp_brand !== ourBrandName)
                    .sort((a, b) => b.sku_share - a.sku_share);
                const top = competitors[0];
                if (!top) {
                    return {
                        category,
                        comp_brand: '—',
                        comp_share: 0,
                        our_share: ourShareByCategory.get(category) || 0,
                        gap: 0,
                    };
                }
                const ourShare = ourShareByCategory.get(category) || 0;
                return {
                    category,
                    comp_brand: top.comp_brand,
                    comp_share: top.sku_share,
                    our_share: ourShare,
                    gap: top.sku_share - ourShare,
                };
            })
            .filter((row) => row.comp_share >= 0.6)
            .sort((a, b) => b.gap - a.gap)
            .slice(0, 3);

        const bandBrandAgg = new Map<string, Map<string, { skuCnt: number; netSales: number }>>();
        bubblePoints.forEach((point) => {
            if (!bandBrandAgg.has(point.price_band_name)) {
                bandBrandAgg.set(point.price_band_name, new Map<string, { skuCnt: number; netSales: number }>());
            }
            const brandMap = bandBrandAgg.get(point.price_band_name)!;
            const prev = brandMap.get(point.comp_brand) || { skuCnt: 0, netSales: 0 };
            prev.skuCnt += point.sku_cnt;
            prev.netSales += point.net_sales;
            brandMap.set(point.comp_brand, prev);
        });

        const weakPriceBands: CompetitorWeakBand[] = Array.from(bandBrandAgg.entries())
            .map(([priceBandName, brandMap]) => {
                const ourValue = brandMap.get(ourBrandName) || { skuCnt: 0, netSales: 0 };
                const topCompetitor = Array.from(brandMap.entries())
                    .filter(([brand]) => brand !== ourBrandName)
                    .sort((a, b) => b[1].skuCnt - a[1].skuCnt)[0];
                const topBrand = topCompetitor?.[0] || '—';
                const topSkuCnt = topCompetitor?.[1].skuCnt || 0;
                const share = safeDiv(topSkuCnt, topSkuCnt + ourValue.skuCnt);
                return {
                    price_band_name: priceBandName,
                    top_brand: topBrand,
                    top_sku_cnt: topSkuCnt,
                    our_sku_cnt: ourValue.skuCnt,
                    share,
                    gap: topSkuCnt - ourValue.skuCnt,
                };
            })
            .filter((item) => item.gap > 0 && item.share >= 0.6)
            .sort((a, b) => b.gap - a.gap)
            .slice(0, 3);

        const radarRows: CompetitorRadarRow[] = dimCompetitors.map((brand) => {
            const outdoorRatio = brand.category_mix.find((item) => item.category.includes('户外'))?.ratio || 0;
            const lowPriceRatio = brand.price_band_mix
                .filter((item) => parseBandOrder(item.band) <= 2)
                .reduce((sum, item) => sum + item.ratio, 0);
            const highPriceRatio = brand.price_band_mix
                .filter((item) => parseBandOrder(item.band) >= 5)
                .reduce((sum, item) => sum + item.ratio, 0);
            const avgSellThrough = avg(brand.hot_skus.map((item) => item.sell_through), 0.72);
            const avgBuzz = avg(brand.hot_skus.map((item) => item.buzz_score), 70);

            const tempFit = clamp(Math.round(avgSellThrough * 100 * 0.7 + outdoorRatio * 30), 40, 95);
            const display = clamp(Math.round(45 + brand.market_share * 220), 35, 95);
            const newness = clamp(Math.round(55 + brand.yoy * 130 + Math.min(brand.trend_tags.length, 6) * 2), 35, 95);
            const pricePower = clamp(Math.round(45 + lowPriceRatio * 35 + (1 - highPriceRatio) * 20), 30, 95);
            const tech = clamp(Math.round(40 + avgBuzz * 0.6), 35, 95);

            return {
                comp_brand: brand.name,
                scores: [tempFit, display, newness, pricePower, tech],
            };
        });

        let galleryIndex = 0;
        const galleryItems: CompetitorGalleryItem[] = [];
        dimCompetitors.forEach((brand, brandIndex) => {
            brand.hot_skus.forEach((sku, skuIndex) => {
                const regionItem = REGION_POOL[(brandIndex + skuIndex) % REGION_POOL.length];
                const wave = WAVE_POOL[(sku.rank + brandIndex) % WAVE_POOL.length];
                const tags = [sku.category, ...brand.trend_tags.slice(0, 2), `￥${sku.msrp}`];
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
                return parseBandOrder(a.price_band) - parseBandOrder(b.price_band);
            });

        const waveOptions = Array.from(new Set(galleryItems.map((item) => item.wave)));
        const regionOptions = Array.from(new Set(galleryItems.map((item) => item.region)));

        return {
            brands,
            categories,
            brandSummary,
            ourBrandName,
            skuStructureRows,
            skuStructureChartData,
            bubblePoints,
            priceBandOptions,
            radarIndicators: RADAR_INDICATORS,
            radarRows,
            suppressedCategories,
            weakPriceBands,
            galleryItems,
            waveOptions,
            regionOptions,
            priceBandBenchmarkRows,
        };
    }, []);
}
