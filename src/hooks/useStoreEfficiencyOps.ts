'use client';

import { useMemo } from 'react';
import storeFormatCityTierRaw from '@/data/ops/store_format_city_tier.json';
import cityTierSalesBucketRaw from '@/data/ops/city_tier_sales_bucket.json';

interface StoreFormatCityTierRaw {
    store_format: string;
    city_tier: string;
    store_count: number;
    store_count_share: number;
    sales_share: number;
}

interface CityTierSalesBucketRaw {
    city_tier: string;
    sales_bucket: string;
    store_pct: number;
    sales_pct: number;
}

export interface StoreFormatTierCell {
    store_format: string;
    city_tier: string;
    store_count: number;
    store_count_share: number;
    sales_share: number;
    efficiency_gap: number;
}

export interface CityTierBucketCell {
    city_tier: string;
    sales_bucket: string;
    store_pct: number;
    sales_pct: number;
}

export interface StoreEfficiencyInsight {
    id: string;
    tone: 'good' | 'warn' | 'risk';
    text: string;
}

export interface StoreEfficiencyAction {
    id: string;
    priority: '高' | '中';
    text: string;
}

export interface CityTierBucketRow {
    city_tier: string;
    bucket_values: Record<string, { store_pct: number; sales_pct: number }>;
    low_output_store_pct: number;
    low_output_sales_pct: number;
    warning: boolean;
}

const CITY_TIER_ORDER = ['一线', '二线', '三线', '四线', '五线'] as const;
const SALES_BUCKET_ORDER = ['超高>200万', '高>150万', '中>80万', '低<80万'] as const;
const TAIL_TIERS = ['四线', '五线'] as const;
const LOW_OUTPUT_BUCKETS = ['中>80万', '低<80万'] as const;

const formatTierRows = storeFormatCityTierRaw as StoreFormatCityTierRaw[];
const tierBucketRows = cityTierSalesBucketRaw as CityTierSalesBucketRaw[];

function safeDiv(numerator: number, denominator: number) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
    return numerator / denominator;
}

function clampRatio(value: number) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function formatPct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

function getTierOrderIndex(tier: string) {
    const idx = CITY_TIER_ORDER.indexOf(tier as (typeof CITY_TIER_ORDER)[number]);
    return idx < 0 ? 99 : idx;
}

function getBucketOrderIndex(bucket: string) {
    const idx = SALES_BUCKET_ORDER.indexOf(bucket as (typeof SALES_BUCKET_ORDER)[number]);
    return idx < 0 ? 99 : idx;
}

export function useStoreEfficiencyOps() {
    return useMemo(() => {
        const normalizedFormatTierCells: StoreFormatTierCell[] = formatTierRows
            .map((row) => ({
                store_format: row.store_format,
                city_tier: row.city_tier,
                store_count: Math.max(0, row.store_count || 0),
                store_count_share: clampRatio(row.store_count_share || 0),
                sales_share: clampRatio(row.sales_share || 0),
                efficiency_gap: clampRatio(row.sales_share || 0) - clampRatio(row.store_count_share || 0),
            }))
            .sort((a, b) => {
                if (a.store_format !== b.store_format) return a.store_format.localeCompare(b.store_format, 'zh-CN');
                return getTierOrderIndex(a.city_tier) - getTierOrderIndex(b.city_tier);
            });

        const storeFormats = Array.from(new Set(normalizedFormatTierCells.map((row) => row.store_format)));
        const cityTiers = Array.from(
            new Set(normalizedFormatTierCells.map((row) => row.city_tier).concat(tierBucketRows.map((row) => row.city_tier))),
        ).sort((a, b) => getTierOrderIndex(a) - getTierOrderIndex(b));

        const totalStoreCount = normalizedFormatTierCells.reduce((sum, row) => sum + row.store_count, 0);
        const cityTierStoreCountMap = cityTiers.reduce<Record<string, number>>((acc, tier) => {
            acc[tier] = normalizedFormatTierCells
                .filter((row) => row.city_tier === tier)
                .reduce((sum, row) => sum + row.store_count, 0);
            return acc;
        }, {});
        const cityTierWeightMap = cityTiers.reduce<Record<string, number>>((acc, tier) => {
            acc[tier] = safeDiv(cityTierStoreCountMap[tier] || 0, totalStoreCount || 1);
            return acc;
        }, {});

        const bucketSourceMap = new Map<string, CityTierSalesBucketRaw>();
        tierBucketRows.forEach((row) => {
            bucketSourceMap.set(`${row.city_tier}__${row.sales_bucket}`, row);
        });

        const cityTierBucketCells: CityTierBucketCell[] = [];
        const cityTierBucketRowsNormalized: CityTierBucketRow[] = cityTiers.map((tier) => {
            const buckets = SALES_BUCKET_ORDER.map((bucket) => {
                const hit = bucketSourceMap.get(`${tier}__${bucket}`);
                return {
                    sales_bucket: bucket,
                    store_pct: clampRatio(hit?.store_pct || 0),
                    sales_pct: clampRatio(hit?.sales_pct || 0),
                };
            });
            const storeTotal = buckets.reduce((sum, row) => sum + row.store_pct, 0);
            const salesTotal = buckets.reduce((sum, row) => sum + row.sales_pct, 0);
            const normalized = buckets.map((row) => ({
                sales_bucket: row.sales_bucket,
                store_pct: safeDiv(row.store_pct, storeTotal || 1),
                sales_pct: safeDiv(row.sales_pct, salesTotal || 1),
            }));

            normalized.forEach((row) => {
                cityTierBucketCells.push({
                    city_tier: tier,
                    sales_bucket: row.sales_bucket,
                    store_pct: row.store_pct,
                    sales_pct: row.sales_pct,
                });
            });

            const lowOutputStorePct = normalized
                .filter((row) => LOW_OUTPUT_BUCKETS.includes(row.sales_bucket as (typeof LOW_OUTPUT_BUCKETS)[number]))
                .reduce((sum, row) => sum + row.store_pct, 0);
            const lowOutputSalesPct = normalized
                .filter((row) => LOW_OUTPUT_BUCKETS.includes(row.sales_bucket as (typeof LOW_OUTPUT_BUCKETS)[number]))
                .reduce((sum, row) => sum + row.sales_pct, 0);

            return {
                city_tier: tier,
                bucket_values: normalized.reduce<Record<string, { store_pct: number; sales_pct: number }>>((acc, row) => {
                    acc[row.sales_bucket] = { store_pct: row.store_pct, sales_pct: row.sales_pct };
                    return acc;
                }, {}),
                low_output_store_pct: lowOutputStorePct,
                low_output_sales_pct: lowOutputSalesPct,
                warning: lowOutputStorePct >= 0.45,
            };
        });

        const bestEfficiencyCell =
            [...normalizedFormatTierCells].sort((a, b) => b.efficiency_gap - a.efficiency_gap)[0] || null;
        const worstEfficiencyCell =
            [...normalizedFormatTierCells].sort((a, b) => a.efficiency_gap - b.efficiency_gap)[0] || null;

        const tailTierWeighted = cityTierBucketRowsNormalized
            .filter((row) => TAIL_TIERS.includes(row.city_tier as (typeof TAIL_TIERS)[number]))
            .reduce(
                (sum, row) => {
                    const tierWeight = cityTierWeightMap[row.city_tier] || 0;
                    return {
                        store: sum.store + row.low_output_store_pct * tierWeight,
                        sales: sum.sales + row.low_output_sales_pct * tierWeight,
                    };
                },
                { store: 0, sales: 0 },
            );

        const warningTiers = cityTierBucketRowsNormalized
            .filter((row) => row.warning)
            .map((row) => `${row.city_tier}${formatPct(row.low_output_store_pct)}`);

        const insights: StoreEfficiencyInsight[] = [
            {
                id: 'tail-risk',
                tone: 'risk',
                text: `尾部风险警报：四/五线低产出（<150万）门店占比约 ${formatPct(tailTierWeighted.store)}，但仅贡献 ${formatPct(tailTierWeighted.sales)} 业绩，渠道碎片化明显。`,
            },
            {
                id: 'eff-best',
                tone: 'good',
                text: bestEfficiencyCell
                    ? `高效样板：${bestEfficiencyCell.city_tier}${bestEfficiencyCell.store_format}店数占比 ${formatPct(bestEfficiencyCell.store_count_share)}，业绩占比 ${formatPct(bestEfficiencyCell.sales_share)}，效率溢价 +${(bestEfficiencyCell.efficiency_gap * 100).toFixed(1)}pp。`
                    : '高效样板：当前暂无显著高效店态。',
            },
            {
                id: 'eff-worst',
                tone: 'warn',
                text: worstEfficiencyCell
                    ? `结构背离：${worstEfficiencyCell.city_tier}${worstEfficiencyCell.store_format}店数占比 ${formatPct(worstEfficiencyCell.store_count_share)}，业绩占比 ${formatPct(worstEfficiencyCell.sales_share)}，效率缺口 ${(worstEfficiencyCell.efficiency_gap * 100).toFixed(1)}pp。`
                    : '结构背离：当前暂无明显低效店态。',
            },
        ];

        const actions: StoreEfficiencyAction[] = [
            {
                id: 'narrowing',
                priority: '高',
                text: '砍宽保利：对四/五线低产出长尾店群执行 Assortment Narrowing，收敛SKU宽度，严格限制 Tier 2/3 下发，仅保留 Tier 1 现金流款。',
            },
            {
                id: 'depth',
                priority: '高',
                text: bestEfficiencyCell
                    ? `加深备货：向${bestEfficiencyCell.city_tier}${bestEfficiencyCell.store_format}倾斜主推爆款深度，优先保障头部尺码完整，避免断码损失。`
                    : '加深备货：向高动销店态集中补深度，减少平均分货。',
            },
            {
                id: 'tier-matrix',
                priority: '中',
                text: '级别定货矩阵：一/二线保留联名与高价性能款试投，三线以核心功能款为主，四/五线执行“基础款+快反补单”组合。',
            },
            {
                id: 'warning-tier',
                priority: '中',
                text:
                    warningTiers.length > 0
                        ? `预警店群：${warningTiers.join('、')}低产出占比偏高，建议同步压缩上市首单并加速清货节奏。`
                        : '预警店群：当前四/五线低产出占比在安全区间，可保持现有首单节奏。',
            },
        ];

        return {
            storeFormats,
            cityTiers,
            salesBuckets: [...SALES_BUCKET_ORDER],
            formatTierCells: normalizedFormatTierCells,
            cityTierBucketCells,
            cityTierBucketRows: cityTierBucketRowsNormalized,
            tailTierWeighted,
            warningTiers,
            insights,
            actions,
        };
    }, []);
}

