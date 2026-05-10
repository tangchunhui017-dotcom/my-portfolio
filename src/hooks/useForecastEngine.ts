'use client';
/**
 * 统一经营预测引擎
 *
 * 口径原则：
 * 1. 渠道总额来自 useForecast 的配置/驱动预测。
 * 2. 品类、价格带、新老品、波段结构优先由 fact_sales + dim_sku 推导。
 * 3. fact_sales 不可用时才回退到 forecast_merch_mix.json 模板。
 */
import { useMemo } from 'react';
import { useDimSku, useDimWavePlan, useFactSales, useForecastMerchMixData } from './useDashboardData';
import { useForecast } from './useForecast';
import type { ForecastScenario } from './useForecast';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import { useMerchMetricConfig } from '@/hooks/useMerchMetricConfig';
import { resolveBusinessThreshold } from '@/utils/merchMetricResolver';

interface RawCategory {
    key: string;
    label: string;
    sales_share: number;
    gross_margin_rate: number;
    growth_rate: number;
}
interface RawPriceBand {
    key: string;
    label: string;
    sales_share: number;
    target_share: number;
}
interface RawLifecycle {
    key: string;
    label: string;
    sales_share: number;
    target_share: number;
}
interface RawWave {
    key: string;
    label: string;
    months: number[];
    sales_share: number;
}
interface RawMerchMix {
    categories: RawCategory[];
    price_bands: RawPriceBand[];
    lifecycle: RawLifecycle[];
    waves: RawWave[];
}

interface RawDimSku {
    sku_id: string;
    msrp: number;
    category_id?: string;
    category_name?: string;
    category_l1?: string;
    lifecycle?: string;
    launch_wave?: string;
    product_track?: string;
    is_carryover?: boolean;
}

interface RawDimWavePlan {
    wave: string;
    revenue_plan: number;
}

interface RawFactSales {
    sku_id: string;
    net_sales_amt: number;
    unit_sold: number;
    gross_profit_amt: number;
    sale_month?: number;
    sale_wave?: string;
    wave?: string;
    product_track?: string;
    is_carryover?: boolean;
}

export type EngineDataSource = 'history' | 'configured' | 'template';

export interface EngineChannelRow {
    channel: string;
    label: string;
    forecastSales: number;
    share: number;
    source: EngineDataSource;
}

export interface EngineCategoryRow {
    key: string;
    label: string;
    historicalShare: number;
    configuredTargetShare: number;
    finalShare: number;
    growthRate: number;
    forecastSales: number;
    forecastUnits: number;
    grossMarginRate: number;
    grossProfit: number;
    source: EngineDataSource;
}

export interface EnginePriceBandRow {
    key: string;
    label: string;
    historicalShare: number;
    targetShare: number;
    finalShare: number;
    forecastSales: number;
    avgPrice: number;
    competitorIndex?: number;
    risk: 'healthy' | 'over_weight' | 'under_weight';
    source: EngineDataSource;
}

export interface EngineLifecycleRow {
    key: string;
    label: string;
    historicalShare: number;
    targetShare: number;
    finalShare: number;
    forecastSales: number;
    source: EngineDataSource;
}

export interface EngineWaveRow {
    key: string;
    label: string;
    months: number[];
    historicalShare: number;
    targetShare: number;
    finalShare: number;
    forecastSales: number;
    launchTimingRisk?: string;
    source: EngineDataSource;
}

export interface ForecastEngineRisk {
    type: 'price_band' | 'category' | 'wave' | 'margin' | 'inventory' | 'data_quality';
    level: 'info' | 'warning' | 'danger';
    message: string;
    action: string;
}

export interface ForecastEngineResult {
    meta: {
        fiscalYear: number;
        baseYear: number;
        scenario: ForecastScenario;
        dataQuality: 'actual_based' | 'mixed' | 'template';
    };
    totals: {
        annualSalesForecast: number;
        annualGrossProfitForecast: number;
        annualUnitsForecast: number;
        averageDiscountRate: number;
        averageMarkupMultiplier: number;
        weightedGrossMarginRate: number;
    };
    channelMix: EngineChannelRow[];
    categoryMix: EngineCategoryRow[];
    priceBandMix: EnginePriceBandRow[];
    lifecycleMix: EngineLifecycleRow[];
    waveMix: EngineWaveRow[];
    assumptions: {
        source: EngineDataSource;
        warnings: string[];
    };
    risks: ForecastEngineRisk[];
}

function normalizeShares<T extends { finalShare: number }>(rows: T[]): T[] {
    const total = rows.reduce((s, r) => s + r.finalShare, 0);
    if (total <= 0) return rows;
    return rows.map(r => ({ ...r, finalShare: r.finalShare / total }));
}

function allocateSales<T extends { finalShare: number; forecastSales: number }>(rows: T[], annualSales: number): T[] {
    return normalizeShares(rows).map(row => ({ ...row, forecastSales: row.finalShare * annualSales }));
}

function computeAvgMsrp(dimSku: RawDimSku[] | undefined, fallback: number): number {
    if (!dimSku || dimSku.length === 0) return fallback;
    const valid = dimSku.map(sku => Number(sku.msrp || 0)).filter(v => v > 0);
    if (valid.length === 0) return fallback;
    return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function normalizeWaveKey(value: string | undefined): string {
    if (!value) return 'UNKNOWN';
    const match = value.match(/W0?(\d+)/i);
    return match ? `W${Number(match[1])}` : value;
}

function priceBandFromMsrp(msrp: number | undefined): string {
    const price = Number(msrp || 0);
    if (price < 300) return '299-';
    if (price < 400) return '300-399';
    if (price < 500) return '400-499';
    if (price < 700) return '500-699';
    return '700+';
}

function lifecycleKeyFrom(sale: RawFactSales, sku?: RawDimSku): 'new' | 'carryover' | 'clearance' {
    const text = `${sku?.lifecycle ?? ''} ${sku?.product_track ?? ''} ${sale.product_track ?? ''}`.toLowerCase();
    if (text.includes('清') || text.includes('clearance')) return 'clearance';
    if (sku?.is_carryover || sale.is_carryover || text.includes('常青') || text.includes('evergreen') || text.includes('carry')) {
        return 'carryover';
    }
    return 'new';
}

function boundedGrowth(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-0.3, Math.min(0.5, value));
}

export function useForecastEngine(scenario: ForecastScenario): ForecastEngineResult | null {
    const { config } = useGlobalConfig();
    const merchMetricConfig = useMerchMetricConfig();
    const grossMarginThreshold = resolveBusinessThreshold('grossMarginRate', merchMetricConfig).value;
    const grossMarginHealthyMin = grossMarginThreshold?.rules.find(rule => rule.status === 'health' && rule.condition === '>=')?.value ?? 0.50;
    const grossMarginWarningMin = grossMarginThreshold?.rules.find(rule => rule.status === 'warning' && rule.condition === '>=')?.value ?? 0.38;
    const { data: mixRaw } = useForecastMerchMixData() as { data: RawMerchMix | undefined };
    const { data: dimSkuRaw } = useDimSku() as { data: RawDimSku[] | undefined };
    const { data: dimWavePlanRaw } = useDimWavePlan() as { data: RawDimWavePlan[] | undefined };
    const { data: salesRaw } = useFactSales(String(config.brand.baseYear)) as { data: RawFactSales[] | undefined };
    const { data: prevSalesRaw } = useFactSales(String(config.brand.baseYear - 1)) as { data: RawFactSales[] | undefined };

    const physForecast = useForecast('physical', scenario);
    const ecomForecast = useForecast('ecommerce', scenario);
    const newStoreForecast = useForecast('new_store', scenario);

    return useMemo((): ForecastEngineResult | null => {
        if (!mixRaw || !physForecast || !ecomForecast || !newStoreForecast) return null;

        const fiscalYear = config.brand.fiscalYear;
        const baseYear = config.brand.baseYear;
        const avgDiscountRate = config.brand.avgDiscountRate;
        const avgMarkupMultiplier = config.brand.markupMultiplier;
        const grossMarginRateCfg = config.brand.grossMarginRate;

        const physSales = physForecast.annualForecast;
        const ecomSales = ecomForecast.annualForecast;
        const newStoreSales = newStoreForecast.annualForecast;
        const annualSalesForecast = physSales + ecomSales + newStoreSales;
        const baseTotal = annualSalesForecast > 0 ? annualSalesForecast : 1;

        const channelMix: EngineChannelRow[] = [
            { channel: 'physical', label: '实体店', forecastSales: physSales, share: physSales / baseTotal, source: 'configured' as EngineDataSource },
            { channel: 'ecommerce', label: '电商', forecastSales: ecomSales, share: ecomSales / baseTotal, source: 'configured' as EngineDataSource },
            { channel: 'new_store', label: '新店', forecastSales: newStoreSales, share: newStoreSales / baseTotal, source: 'configured' as EngineDataSource },
        ].filter(row => row.forecastSales > 0);

        const skuById = new Map((dimSkuRaw ?? []).map(sku => [sku.sku_id, sku]));
        const actualRows = (salesRaw ?? []).filter(row => Number(row.net_sales_amt || 0) > 0);
        const prevRows = (prevSalesRaw ?? []).filter(row => Number(row.net_sales_amt || 0) > 0);
        const actualTotal = actualRows.reduce((sum, row) => sum + Number(row.net_sales_amt || 0), 0);
        const hasActualSales = actualTotal > 0;
        const dataQuality: ForecastEngineResult['meta']['dataQuality'] = hasActualSales ? 'actual_based' : 'template';
        const warnings: string[] = [];

        if (!hasActualSales) {
            warnings.push('当前基准年 fact_sales 不可用，品类/价格带/波段结构回退到 forecast_merch_mix.json 模板假设。');
        }

        const avgMsrp = computeAvgMsrp(dimSkuRaw, 450);
        const avgActualTicket = avgMsrp * avgDiscountRate;

        let categoryMix: EngineCategoryRow[];
        if (hasActualSales) {
            const prevByCategory = new Map<string, number>();
            prevRows.forEach(row => {
                const sku = skuById.get(row.sku_id);
                const key = sku?.category_name ?? sku?.category_l1 ?? sku?.category_id ?? '未分类';
                prevByCategory.set(key, (prevByCategory.get(key) ?? 0) + Number(row.net_sales_amt || 0));
            });

            const grouped = new Map<string, { label: string; sales: number; grossProfit: number }>();
            actualRows.forEach(row => {
                const sku = skuById.get(row.sku_id);
                const key = sku?.category_name ?? sku?.category_l1 ?? sku?.category_id ?? '未分类';
                const current = grouped.get(key) ?? { label: key, sales: 0, grossProfit: 0 };
                current.sales += Number(row.net_sales_amt || 0);
                current.grossProfit += Number(row.gross_profit_amt || 0);
                grouped.set(key, current);
            });

            categoryMix = allocateSales(Array.from(grouped.entries()).map(([key, item]) => {
                const historicalShare = item.sales / actualTotal;
                const prevSales = prevByCategory.get(key) ?? 0;
                const growthRate = boundedGrowth(prevSales > 0 ? (item.sales - prevSales) / prevSales : 0);
                const grossMarginRate = item.sales > 0 ? item.grossProfit / item.sales : grossMarginRateCfg;
                return {
                    key,
                    label: item.label,
                    historicalShare,
                    configuredTargetShare: historicalShare,
                    finalShare: historicalShare * (1 + growthRate),
                    growthRate,
                    forecastSales: 0,
                    forecastUnits: 0,
                    grossMarginRate,
                    grossProfit: 0,
                    source: 'history' as EngineDataSource,
                };
            }), annualSalesForecast).map(row => ({
                ...row,
                forecastUnits: avgActualTicket > 0 ? Math.round(row.forecastSales / avgActualTicket) : 0,
                grossProfit: row.forecastSales * row.grossMarginRate,
            }));
        } else {
            const weightTotal = mixRaw.categories.reduce((s, c) => s + c.sales_share * (1 + c.growth_rate), 0);
            categoryMix = allocateSales(mixRaw.categories.map(cat => {
                const finalShare = weightTotal > 0 ? (cat.sales_share * (1 + cat.growth_rate)) / weightTotal : cat.sales_share;
                return {
                    key: cat.key,
                    label: cat.label,
                    historicalShare: cat.sales_share,
                    configuredTargetShare: cat.sales_share,
                    finalShare,
                    growthRate: cat.growth_rate,
                    forecastSales: 0,
                    forecastUnits: 0,
                    grossMarginRate: cat.gross_margin_rate,
                    grossProfit: 0,
                    source: 'template' as EngineDataSource,
                };
            }), annualSalesForecast).map(row => ({
                ...row,
                forecastUnits: avgActualTicket > 0 ? Math.round(row.forecastSales / avgActualTicket) : 0,
                grossProfit: row.forecastSales * row.grossMarginRate,
            }));
        }

        const priceTargets = new Map(mixRaw.price_bands.map(pb => [pb.key, pb]));
        let priceBandMix: EnginePriceBandRow[];
        if (hasActualSales) {
            const grouped = new Map<string, { label: string; sales: number; msrpSales: number }>();
            actualRows.forEach(row => {
                const sku = skuById.get(row.sku_id);
                const key = priceBandFromMsrp(sku?.msrp);
                const sales = Number(row.net_sales_amt || 0);
                const template = priceTargets.get(key);
                const current = grouped.get(key) ?? { label: template?.label ?? key, sales: 0, msrpSales: 0 };
                current.sales += sales;
                current.msrpSales += Number(sku?.msrp || 0) * sales;
                grouped.set(key, current);
            });
            priceBandMix = allocateSales(Array.from(grouped.entries()).map(([key, item]) => {
                const historicalShare = item.sales / actualTotal;
                const targetShare = priceTargets.get(key)?.target_share ?? historicalShare;
                const shareGap = historicalShare - targetShare;
                const risk: EnginePriceBandRow['risk'] = shareGap > 0.03 ? 'over_weight' : shareGap < -0.03 ? 'under_weight' : 'healthy';
                return {
                    key,
                    label: item.label,
                    historicalShare,
                    targetShare,
                    finalShare: historicalShare,
                    forecastSales: 0,
                    avgPrice: item.sales > 0 ? item.msrpSales / item.sales : 0,
                    risk,
                    source: 'history' as EngineDataSource,
                };
            }), annualSalesForecast);
        } else {
            priceBandMix = allocateSales(mixRaw.price_bands.map(pb => {
                const shareGap = pb.sales_share - pb.target_share;
                const risk: EnginePriceBandRow['risk'] = shareGap > 0.03 ? 'over_weight' : shareGap < -0.03 ? 'under_weight' : 'healthy';
                return {
                    key: pb.key,
                    label: pb.label,
                    historicalShare: pb.sales_share,
                    targetShare: pb.target_share,
                    finalShare: pb.sales_share,
                    forecastSales: 0,
                    avgPrice: 0,
                    risk,
                    source: 'template' as EngineDataSource,
                };
            }), annualSalesForecast);
        }

        const lifecycleTargets = new Map(mixRaw.lifecycle.map(lc => [lc.key, lc]));
        let lifecycleMix: EngineLifecycleRow[];
        if (hasActualSales) {
            const grouped = new Map<string, number>();
            actualRows.forEach(row => {
                const key = lifecycleKeyFrom(row, skuById.get(row.sku_id));
                grouped.set(key, (grouped.get(key) ?? 0) + Number(row.net_sales_amt || 0));
            });
            const labels: Record<string, string> = { new: '新品', carryover: '延续款', clearance: '清货款' };
            lifecycleMix = allocateSales(Array.from(grouped.entries()).map(([key, sales]) => {
                const historicalShare = sales / actualTotal;
                return {
                    key,
                    label: lifecycleTargets.get(key)?.label ?? labels[key] ?? key,
                    historicalShare,
                    targetShare: lifecycleTargets.get(key)?.target_share ?? historicalShare,
                    finalShare: historicalShare,
                    forecastSales: 0,
                    source: 'history' as EngineDataSource,
                };
            }), annualSalesForecast);
        } else {
            lifecycleMix = allocateSales(mixRaw.lifecycle.map(lc => ({
                key: lc.key,
                label: lc.label,
                historicalShare: lc.sales_share,
                targetShare: lc.target_share,
                finalShare: lc.sales_share,
                forecastSales: 0,
                source: 'template' as EngineDataSource,
            })), annualSalesForecast);
        }

        const waveTargets = new Map(mixRaw.waves.map(w => [w.key, w]));
        const wavePlanTotal = (dimWavePlanRaw ?? []).reduce((s, w) => s + Number(w.revenue_plan || 0), 0);
        let waveMix: EngineWaveRow[];
        if (hasActualSales) {
            const grouped = new Map<string, { sales: number; months: Set<number> }>();
            actualRows.forEach(row => {
                const sku = skuById.get(row.sku_id);
                const key = normalizeWaveKey(row.sale_wave ?? row.wave ?? sku?.launch_wave);
                const current = grouped.get(key) ?? { sales: 0, months: new Set<number>() };
                current.sales += Number(row.net_sales_amt || 0);
                if (row.sale_month) current.months.add(Number(row.sale_month));
                grouped.set(key, current);
            });
            waveMix = allocateSales(Array.from(grouped.entries()).map(([key, item]) => {
                const template = waveTargets.get(key);
                const historicalShare = item.sales / actualTotal;
                const finalShare = historicalShare;
                return {
                    key,
                    label: template?.label ?? key,
                    months: item.months.size > 0 ? Array.from(item.months).sort((a, b) => a - b) : (template?.months ?? []),
                    historicalShare,
                    targetShare: template?.sales_share ?? historicalShare,
                    finalShare,
                    forecastSales: 0,
                    launchTimingRisk: finalShare >= 0.25 ? `${template?.label ?? key} 销售占比 ${(finalShare * 100).toFixed(0)}%，建议提前 6-8 周锁定备货` : undefined,
                    source: 'history' as EngineDataSource,
                };
            }), annualSalesForecast);
        } else {
            waveMix = allocateSales(mixRaw.waves.map(w => {
                const matching = (dimWavePlanRaw ?? []).filter(wp => normalizeWaveKey(wp.wave) === w.key);
                const planShare = wavePlanTotal > 0 ? matching.reduce((s, wp) => s + Number(wp.revenue_plan || 0), 0) / wavePlanTotal : 0;
                const finalShare = planShare > 0 ? planShare : w.sales_share;
                const source: EngineDataSource = planShare > 0 ? 'history' : 'template';
                return {
                    key: w.key,
                    label: w.label,
                    months: w.months,
                    historicalShare: finalShare,
                    targetShare: w.sales_share,
                    finalShare,
                    forecastSales: 0,
                    launchTimingRisk: finalShare >= 0.25 ? `${w.label} 销售占比 ${(finalShare * 100).toFixed(0)}%，建议提前 6-8 周锁定备货` : undefined,
                    source,
                };
            }), annualSalesForecast);
        }

        const weightedGrossMarginRate = categoryMix.reduce((s, c) => s + c.finalShare * c.grossMarginRate, 0) || grossMarginRateCfg;
        const annualGrossProfitForecast = annualSalesForecast * weightedGrossMarginRate;
        const annualUnitsForecast = avgActualTicket > 0 ? Math.round(annualSalesForecast / avgActualTicket) : 0;

        const risks: ForecastEngineRisk[] = [];
        for (const pb of priceBandMix) {
            if (pb.risk === 'over_weight') {
                risks.push({
                    type: 'price_band',
                    level: 'warning',
                    message: `价格带「${pb.label}」超配 ${((pb.finalShare - pb.targetShare) * 100).toFixed(1)}pp`,
                    action: '建议将部分预算向更高贡献价格带转移，降低低价带库存压力',
                });
            } else if (pb.risk === 'under_weight') {
                risks.push({
                    type: 'price_band',
                    level: 'warning',
                    message: `价格带「${pb.label}」欠配 ${((pb.targetShare - pb.finalShare) * 100).toFixed(1)}pp`,
                    action: '建议补充该价格带 SKU，避免价格段缺口影响销售达成',
                });
            }
        }

        for (const cat of categoryMix) {
            if (cat.growthRate < -0.05) {
                risks.push({
                    type: 'category',
                    level: 'warning',
                    message: `品类「${cat.label}」历史增长率 ${(cat.growthRate * 100).toFixed(1)}%，存在下行风险`,
                    action: '建议审查竞品压力、上新节奏和价格策略',
                });
            }
        }

        const newLc = lifecycleMix.find(l => l.key === 'new');
        if (newLc && newLc.finalShare < newLc.targetShare - 0.03) {
            risks.push({
                type: 'category',
                level: 'warning',
                message: `新品占比 ${(newLc.finalShare * 100).toFixed(1)}%，低于目标 ${(newLc.targetShare * 100).toFixed(1)}%`,
                action: '建议提前锁定新款波段，增加新品 SKU 数量和深度',
            });
        }

        for (const wave of waveMix) {
            if (wave.finalShare >= 0.25) {
                risks.push({
                    type: 'wave',
                    level: 'info',
                    message: `波段「${wave.label}」销售占比 ${(wave.finalShare * 100).toFixed(1)}%，单波集中度高`,
                    action: '建议提前 6-8 周锁定备货计划，确保 OTB 按时到货',
                });
            }
        }

        if (weightedGrossMarginRate < grossMarginWarningMin) {
            risks.push({
                type: 'margin',
                level: 'danger',
                message: `加权毛利率 ${(weightedGrossMarginRate * 100).toFixed(1)}% 低于配置危险线 ${(grossMarginWarningMin * 100).toFixed(0)}%`,
                action: '检查各品类毛利配置，优先增加高毛利品类占比，审查折扣政策',
            });
        } else if (weightedGrossMarginRate < grossMarginHealthyMin) {
            risks.push({
                type: 'margin',
                level: 'warning',
                message: `加权毛利率 ${(weightedGrossMarginRate * 100).toFixed(1)}%，低于配置健康线 ${(grossMarginHealthyMin * 100).toFixed(0)}%`,
                action: '关注清货款对毛利的侵蚀，控制促销折扣深度',
            });
        }

        if (!hasActualSales) {
            risks.push({
                type: 'data_quality',
                level: 'info',
                message: '品类/价格带/新老品结构当前来自模板假设',
                action: '请补充 fact_sales 与 dim_sku 后切换为历史推导来源',
            });
        }

        return {
            meta: { fiscalYear, baseYear, scenario, dataQuality },
            totals: {
                annualSalesForecast,
                annualGrossProfitForecast,
                annualUnitsForecast,
                averageDiscountRate: avgDiscountRate,
                averageMarkupMultiplier: avgMarkupMultiplier,
                weightedGrossMarginRate,
            },
            channelMix,
            categoryMix,
            priceBandMix,
            lifecycleMix,
            waveMix,
            assumptions: {
                source: hasActualSales ? 'history' : 'template',
                warnings,
            },
            risks,
        };
    }, [
        config,
        mixRaw,
        dimSkuRaw,
        dimWavePlanRaw,
        salesRaw,
        prevSalesRaw,
        physForecast,
        ecomForecast,
        newStoreForecast,
        grossMarginHealthyMin,
        grossMarginWarningMin,
        scenario,
    ]);
}
