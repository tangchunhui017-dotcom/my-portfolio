'use client';

import { useMemo } from 'react';
import {
    useDimChannel,
    useDimSku,
    useFactSizeSalesInventory,
} from '@/hooks/useDashboardData';
import {
    matchesDashboardSkuCategoryFilters,
    type DashboardFilters,
} from '@/hooks/useDashboardFilter';
import { resolveDashboardLifecycleLabel } from '@/config/dashboardLifecycle';
import { matchesDashboardSeasonFilter } from '@/config/dashboardTime';
import { formatPriceBandLabel, matchesPriceBandFilter } from '@/config/priceBand';

type RiskTone = 'good' | 'warn' | 'risk';

interface SizeFactRecord {
    record_id: string;
    sku_id: string;
    channel_id: string;
    season_year?: string | number;
    season?: string;
    wave?: string;
    week_num: number;
    category_label?: string;
    size_code: string;
    size_label?: string;
    size_order?: number;
    size_band: 'small' | 'core' | 'large';
    is_core_size: boolean;
    unit_sold: number;
    estimated_demand_units: number;
    on_hand_unit: number;
    fill_rate: number;
    gap_rate: number;
    stockout_flag?: boolean;
}

interface DimSkuRecord {
    sku_id: string;
    sku_name: string;
    brand_name?: string;
    gender?: string;
    category_id?: string;
    category_name?: string;
    category_l2?: string;
    product_line?: string;
    season_year?: string | number;
    season?: string;
    dev_season_year?: string | number;
    dev_season?: string;
    price_band?: string;
    msrp?: number;
    lifecycle?: string;
    target_audience?: string;
    target_age_group?: string;
    color?: string;
    color_family?: string;
}

interface DimChannelRecord {
    channel_id: string;
    channel_type?: string;
    region?: string;
    city_tier?: string;
    store_format?: string;
}

interface SizeSnapshot {
    skuId: string;
    channelId: string;
    sizeCode: string;
    sizeLabel: string;
    sizeOrder: number;
    sizeBand: 'small' | 'core' | 'large';
    isCoreSize: boolean;
    salesUnits: number;
    demandUnits: number;
    latestOnHandUnits: number;
    latestFillRate: number;
    latestGapRate: number;
    latestStockoutFlag: boolean;
    latestOrder: number;
}

export interface SizeHealthCard {
    id: string;
    label: string;
    value: string;
    detail: string;
    tone: RiskTone;
}

export interface SizeHealthSkuRiskRow {
    skuId: string;
    skuName: string;
    category: string;
    priceBand: string;
    lifecycle: string;
    salesUnits: number;
    onHandUnits: number;
    fullSizeRate: number;
    stockoutRate: number;
    coreSizeSalesShare: number;
    edgeStockShare: number;
    stockoutSizes: string[];
    riskLabels: string[];
    action: string;
    priority: 'P0' | 'P1' | 'P2';
    riskScore: number;
}

export interface SizeHealthCategoryRisk {
    category: string;
    skuCount: number;
    stockoutSkuCount: number;
    edgeOverstockSkuCount: number;
    avgFullSizeRate: number;
    avgStockoutRate: number;
    riskScore: number;
}

export interface SizeHealthSizeGap {
    sizeCode: string;
    sizeLabel: string;
    demandUnits: number;
    salesUnits: number;
    onHandUnits: number;
    stockoutSlots: number;
    slotCount: number;
    stockoutRate: number;
}

export interface SizeHealthSummary {
    filteredRows: number;
    skuCount: number;
    fullSizeRate: number;
    stockoutRate: number;
    coreSizeSalesShare: number;
    edgeStockShare: number;
    stockoutSkuCount: number;
    edgeOverstockSkuCount: number;
    healthCards: SizeHealthCard[];
    riskRows: SizeHealthSkuRiskRow[];
    riskMap: Record<string, SizeHealthSkuRiskRow>;
    categoryRisks: SizeHealthCategoryRisk[];
    sizeGaps: SizeHealthSizeGap[];
    conclusion: string;
}

function safeDiv(numerator: number, denominator: number) {
    return denominator <= 0 ? 0 : numerator / denominator;
}

function fmtPct(value: number, digits = 0) {
    return `${(value * 100).toFixed(digits)}%`;
}

function resolveTone(value: number, warn: number, risk: number, reverse = false): RiskTone {
    if (reverse) {
        if (value <= risk) return 'risk';
        if (value <= warn) return 'warn';
        return 'good';
    }
    if (value >= risk) return 'risk';
    if (value >= warn) return 'warn';
    return 'good';
}

function matchesTargetAudience(sku: DimSkuRecord, selectedAudience: string | 'all') {
    if (selectedAudience === 'all') return true;
    return sku.target_audience === selectedAudience || sku.target_age_group === selectedAudience;
}

function matchesColor(sku: DimSkuRecord, selectedColor: string | 'all') {
    if (selectedColor === 'all') return true;
    return sku.color === selectedColor || sku.color_family === selectedColor;
}

function getTimeOrder(record: Pick<SizeFactRecord, 'season_year' | 'wave' | 'week_num'>) {
    const year = Number(record.season_year || 0);
    const wave = Number(String(record.wave || '').replace(/^W/i, '')) || 0;
    const week = Number(record.week_num || 0);
    return year * 10000 + wave * 100 + week;
}

function matchesTimeFilters(filters: DashboardFilters, record: SizeFactRecord) {
    if (filters.season_year !== 'all' && String(record.season_year) !== String(filters.season_year)) return false;
    if (!matchesDashboardSeasonFilter(filters.season, record.wave, record.season)) return false;
    if (filters.wave !== 'all' && record.wave !== filters.wave) return false;
    return true;
}

function matchesNonTimeFilters(filters: DashboardFilters, sku: DimSkuRecord, channel: DimChannelRecord) {
    if (!matchesDashboardSkuCategoryFilters(filters, sku)) return false;
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    if (filters.region !== 'all' && channel.region !== filters.region) return false;
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
    if (!matchesTargetAudience(sku, filters.target_audience)) return false;
    if (!matchesColor(sku, filters.color)) return false;
    if (!matchesPriceBandFilter(Number(sku.msrp || 0), filters.price_band, sku.price_band)) return false;

    const lifecycle = resolveDashboardLifecycleLabel(filters, {
        season_year: sku.dev_season_year ?? sku.season_year,
        season: sku.dev_season ?? sku.season,
        lifecycle: sku.lifecycle,
    });
    if (filters.lifecycle !== 'all' && lifecycle !== filters.lifecycle) return false;
    return true;
}

function buildPriority(score: number): 'P0' | 'P1' | 'P2' {
    if (score >= 85) return 'P0';
    if (score >= 55) return 'P1';
    return 'P2';
}

function buildAction(row: Pick<SizeHealthSkuRiskRow, 'stockoutRate' | 'fullSizeRate' | 'edgeStockShare' | 'stockoutSizes'>) {
    if (row.stockoutRate >= 0.35 || row.fullSizeRate < 0.65) {
        const sizes = row.stockoutSizes.slice(0, 4).join('/');
        return sizes ? `优先补齐 ${sizes} 核心尺码，并向高动销渠道调拨。` : '优先补齐核心尺码，并向高动销渠道调拨。';
    }
    if (row.edgeStockShare >= 0.38) return '收缩边缘码补货，优先做渠道转移或组合清退。';
    return '保持当前尺码结构，周度复核核心尺码库存。';
}

export function useSizeHealthAnalysis(filters: DashboardFilters) {
    const yearParam = filters.season_year !== 'all' ? String(filters.season_year) : undefined;
    const seasonParam = filters.season !== 'all' ? filters.season : undefined;
    const waveParam = filters.wave !== 'all' ? filters.wave : undefined;
    const sizeFactsResult = useFactSizeSalesInventory(yearParam, seasonParam, waveParam);
    const skuResult = useDimSku();
    const channelResult = useDimChannel();

    const summary = useMemo<SizeHealthSummary | null>(() => {
        const sizeFacts = (sizeFactsResult.data ?? []) as SizeFactRecord[];
        const dimSku = (skuResult.data ?? []) as DimSkuRecord[];
        const dimChannel = (channelResult.data ?? []) as DimChannelRecord[];

        if (!sizeFacts.length || !dimSku.length || !dimChannel.length) return null;

        const skuMap = new Map(dimSku.map((sku) => [sku.sku_id, sku]));
        const channelMap = new Map(dimChannel.map((channel) => [channel.channel_id, channel]));
        const snapshots = new Map<string, SizeSnapshot>();

        sizeFacts.forEach((record) => {
            const sku = skuMap.get(record.sku_id);
            const channel = channelMap.get(record.channel_id);
            if (!sku || !channel) return;
            if (!matchesTimeFilters(filters, record)) return;
            if (!matchesNonTimeFilters(filters, sku, channel)) return;

            const key = `${record.sku_id}__${record.channel_id}__${record.size_code}`;
            const order = getTimeOrder(record);
            const existing = snapshots.get(key);
            if (!existing) {
                snapshots.set(key, {
                    skuId: record.sku_id,
                    channelId: record.channel_id,
                    sizeCode: record.size_code,
                    sizeLabel: record.size_label || `EU${record.size_code}`,
                    sizeOrder: Number(record.size_order || record.size_code || 0),
                    sizeBand: record.size_band,
                    isCoreSize: Boolean(record.is_core_size),
                    salesUnits: Number(record.unit_sold || 0),
                    demandUnits: Number(record.estimated_demand_units || 0),
                    latestOnHandUnits: Number(record.on_hand_unit || 0),
                    latestFillRate: Number(record.fill_rate || 0),
                    latestGapRate: Number(record.gap_rate || 0),
                    latestStockoutFlag: Boolean(record.stockout_flag),
                    latestOrder: order,
                });
                return;
            }

            existing.salesUnits += Number(record.unit_sold || 0);
            existing.demandUnits += Number(record.estimated_demand_units || 0);
            if (order >= existing.latestOrder) {
                existing.latestOnHandUnits = Number(record.on_hand_unit || 0);
                existing.latestFillRate = Number(record.fill_rate || 0);
                existing.latestGapRate = Number(record.gap_rate || 0);
                existing.latestStockoutFlag = Boolean(record.stockout_flag);
                existing.latestOrder = order;
            }
        });

        const skuAggMap = new Map<string, {
            skuId: string;
            skuName: string;
            category: string;
            priceBand: string;
            lifecycle: string;
            salesUnits: number;
            demandUnits: number;
            onHandUnits: number;
            coreSalesUnits: number;
            edgeOnHandUnits: number;
            coreSlots: number;
            stockedCoreSlots: number;
            stockoutCoreSlots: number;
            stockoutSizes: Set<string>;
        }>();
        const sizeGapMap = new Map<string, SizeHealthSizeGap>();

        snapshots.forEach((snapshot) => {
            const sku = skuMap.get(snapshot.skuId);
            if (!sku) return;

            const lifecycle = resolveDashboardLifecycleLabel(filters, {
                season_year: sku.dev_season_year ?? sku.season_year,
                season: sku.dev_season ?? sku.season,
                lifecycle: sku.lifecycle,
            });
            const category = sku.category_l2 || sku.category_name || sku.product_line || '未分类';
            const priceBand = formatPriceBandLabel(sku.price_band);
            const skuAgg = skuAggMap.get(snapshot.skuId) || {
                skuId: snapshot.skuId,
                skuName: sku.sku_name || snapshot.skuId,
                category,
                priceBand,
                lifecycle,
                salesUnits: 0,
                demandUnits: 0,
                onHandUnits: 0,
                coreSalesUnits: 0,
                edgeOnHandUnits: 0,
                coreSlots: 0,
                stockedCoreSlots: 0,
                stockoutCoreSlots: 0,
                stockoutSizes: new Set<string>(),
            };

            skuAgg.salesUnits += snapshot.salesUnits;
            skuAgg.demandUnits += snapshot.demandUnits;
            skuAgg.onHandUnits += snapshot.latestOnHandUnits;
            if (snapshot.isCoreSize) {
                skuAgg.coreSalesUnits += snapshot.salesUnits;
                skuAgg.coreSlots += 1;
                if (snapshot.latestOnHandUnits > 1) skuAgg.stockedCoreSlots += 1;
                if (snapshot.latestStockoutFlag || (snapshot.latestOnHandUnits <= 1 && snapshot.salesUnits > 0)) {
                    skuAgg.stockoutCoreSlots += 1;
                    skuAgg.stockoutSizes.add(snapshot.sizeLabel);
                }
            } else {
                skuAgg.edgeOnHandUnits += snapshot.latestOnHandUnits;
            }
            skuAggMap.set(snapshot.skuId, skuAgg);

            const sizeGap = sizeGapMap.get(snapshot.sizeCode) || {
                sizeCode: snapshot.sizeCode,
                sizeLabel: snapshot.sizeLabel,
                demandUnits: 0,
                salesUnits: 0,
                onHandUnits: 0,
                stockoutSlots: 0,
                slotCount: 0,
                stockoutRate: 0,
            };
            sizeGap.demandUnits += snapshot.demandUnits;
            sizeGap.salesUnits += snapshot.salesUnits;
            sizeGap.onHandUnits += snapshot.latestOnHandUnits;
            if (snapshot.isCoreSize) {
                sizeGap.slotCount += 1;
                if (snapshot.latestStockoutFlag || (snapshot.latestOnHandUnits <= 1 && snapshot.salesUnits > 0)) {
                    sizeGap.stockoutSlots += 1;
                }
            }
            sizeGapMap.set(snapshot.sizeCode, sizeGap);
        });

        const riskRows = Array.from(skuAggMap.values()).map<SizeHealthSkuRiskRow>((row) => {
            const fullSizeRate = safeDiv(row.stockedCoreSlots, row.coreSlots);
            const stockoutRate = safeDiv(row.stockoutCoreSlots, row.coreSlots);
            const coreSizeSalesShare = safeDiv(row.coreSalesUnits, row.salesUnits);
            const edgeStockShare = safeDiv(row.edgeOnHandUnits, row.onHandUnits);
            const riskLabels: string[] = [];
            if (stockoutRate >= 0.25 || fullSizeRate < 0.75) riskLabels.push('核心尺码断码');
            if (edgeStockShare >= 0.35 && row.onHandUnits >= 80) riskLabels.push('边缘码积压');
            if (coreSizeSalesShare < 0.55 && row.salesUnits >= 20) riskLabels.push('核心尺码贡献弱');
            if (!riskLabels.length) riskLabels.push('尺码健康');

            const riskScore =
                stockoutRate * 55 +
                Math.max(0, 0.78 - fullSizeRate) * 45 +
                Math.max(0, edgeStockShare - 0.32) * 50 +
                Math.min(row.salesUnits / 180, 1) * 18;

            const base = {
                skuId: row.skuId,
                skuName: row.skuName,
                category: row.category,
                priceBand: row.priceBand,
                lifecycle: row.lifecycle,
                salesUnits: row.salesUnits,
                onHandUnits: row.onHandUnits,
                fullSizeRate,
                stockoutRate,
                coreSizeSalesShare,
                edgeStockShare,
                stockoutSizes: Array.from(row.stockoutSizes).sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))),
                riskLabels,
                priority: buildPriority(riskScore),
                riskScore,
            };
            return {
                ...base,
                action: buildAction(base),
            };
        });

        const riskyRows = riskRows
            .filter((row) => !row.riskLabels.includes('尺码健康'))
            .sort((a, b) => b.riskScore - a.riskScore || b.salesUnits - a.salesUnits);
        const riskMap = riskRows.reduce<Record<string, SizeHealthSkuRiskRow>>((acc, row) => {
            acc[row.skuId] = row;
            return acc;
        }, {});

        const categoryMap = new Map<string, {
            category: string;
            skuCount: number;
            stockoutSkuCount: number;
            edgeOverstockSkuCount: number;
            fullWeighted: number;
            stockoutWeighted: number;
            weight: number;
        }>();
        riskRows.forEach((row) => {
            const bucket = categoryMap.get(row.category) || {
                category: row.category,
                skuCount: 0,
                stockoutSkuCount: 0,
                edgeOverstockSkuCount: 0,
                fullWeighted: 0,
                stockoutWeighted: 0,
                weight: 0,
            };
            const weight = Math.max(row.salesUnits, 1);
            bucket.skuCount += 1;
            if (row.riskLabels.includes('核心尺码断码')) bucket.stockoutSkuCount += 1;
            if (row.riskLabels.includes('边缘码积压')) bucket.edgeOverstockSkuCount += 1;
            bucket.fullWeighted += row.fullSizeRate * weight;
            bucket.stockoutWeighted += row.stockoutRate * weight;
            bucket.weight += weight;
            categoryMap.set(row.category, bucket);
        });

        const categoryRisks = Array.from(categoryMap.values())
            .map<SizeHealthCategoryRisk>((row) => {
                const avgFullSizeRate = safeDiv(row.fullWeighted, row.weight);
                const avgStockoutRate = safeDiv(row.stockoutWeighted, row.weight);
                const riskScore = avgStockoutRate * 60 + Math.max(0, 0.78 - avgFullSizeRate) * 50 + safeDiv(row.edgeOverstockSkuCount, row.skuCount) * 25;
                return {
                    category: row.category,
                    skuCount: row.skuCount,
                    stockoutSkuCount: row.stockoutSkuCount,
                    edgeOverstockSkuCount: row.edgeOverstockSkuCount,
                    avgFullSizeRate,
                    avgStockoutRate,
                    riskScore,
                };
            })
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 5);

        const sizeGaps = Array.from(sizeGapMap.values())
            .map((row) => ({
                ...row,
                stockoutRate: safeDiv(row.stockoutSlots, row.slotCount),
            }))
            .filter((row) => row.slotCount > 0)
            .sort((a, b) => b.stockoutRate - a.stockoutRate || b.demandUnits - a.demandUnits)
            .slice(0, 6);

        const totalSalesUnits = riskRows.reduce((sum, row) => sum + row.salesUnits, 0);
        const totalOnHandUnits = riskRows.reduce((sum, row) => sum + row.onHandUnits, 0);
        const fullWeighted = riskRows.reduce((sum, row) => sum + row.fullSizeRate * Math.max(row.salesUnits, 1), 0);
        const stockoutWeighted = riskRows.reduce((sum, row) => sum + row.stockoutRate * Math.max(row.salesUnits, 1), 0);
        const coreSalesUnits = riskRows.reduce((sum, row) => sum + row.coreSizeSalesShare * row.salesUnits, 0);
        const edgeStockUnits = riskRows.reduce((sum, row) => sum + row.edgeStockShare * row.onHandUnits, 0);
        const weight = riskRows.reduce((sum, row) => sum + Math.max(row.salesUnits, 1), 0);
        const fullSizeRate = safeDiv(fullWeighted, weight);
        const stockoutRate = safeDiv(stockoutWeighted, weight);
        const coreSizeSalesShare = safeDiv(coreSalesUnits, totalSalesUnits);
        const edgeStockShare = safeDiv(edgeStockUnits, totalOnHandUnits);
        const stockoutSkuCount = riskRows.filter((row) => row.riskLabels.includes('核心尺码断码')).length;
        const edgeOverstockSkuCount = riskRows.filter((row) => row.riskLabels.includes('边缘码积压')).length;

        const healthCards: SizeHealthCard[] = [
            {
                id: 'full_size_rate',
                label: '核心齐码率',
                value: fmtPct(fullSizeRate),
                detail: `低于 75% 需要补齐核心码`,
                tone: resolveTone(fullSizeRate, 0.82, 0.75, true),
            },
            {
                id: 'stockout_rate',
                label: '核心断码率',
                value: fmtPct(stockoutRate),
                detail: `${stockoutSkuCount} 款存在断码风险`,
                tone: resolveTone(stockoutRate, 0.18, 0.28),
            },
            {
                id: 'core_sales_share',
                label: '核心尺码销量占比',
                value: fmtPct(coreSizeSalesShare),
                detail: `低于 60% 说明配码偏离需求`,
                tone: resolveTone(coreSizeSalesShare, 0.65, 0.58, true),
            },
            {
                id: 'edge_stock_share',
                label: '边缘码库存占比',
                value: fmtPct(edgeStockShare),
                detail: `${edgeOverstockSkuCount} 款边缘码偏厚`,
                tone: resolveTone(edgeStockShare, 0.26, 0.36),
            },
        ];

        const topRisk = riskyRows[0];
        const conclusion = topRisk
            ? `${topRisk.category}「${topRisk.skuName}」尺码风险最高，${topRisk.riskLabels.join('、')}，建议${topRisk.action}`
            : '当前筛选下尺码结构整体稳定，暂无需要立即补码或清退的高危 SKU。';

        return {
            filteredRows: Array.from(snapshots.values()).length,
            skuCount: riskRows.length,
            fullSizeRate,
            stockoutRate,
            coreSizeSalesShare,
            edgeStockShare,
            stockoutSkuCount,
            edgeOverstockSkuCount,
            healthCards,
            riskRows: riskyRows.slice(0, 6),
            riskMap,
            categoryRisks,
            sizeGaps,
            conclusion,
        };
    }, [channelResult.data, filters, sizeFactsResult.data, skuResult.data]);

    return {
        summary,
        isLoading: sizeFactsResult.isLoading || skuResult.isLoading || channelResult.isLoading,
        error: sizeFactsResult.error || skuResult.error || channelResult.error,
    };
}
