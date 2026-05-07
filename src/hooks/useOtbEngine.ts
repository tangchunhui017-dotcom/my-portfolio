'use client';
/**
 * src/hooks/useOtbEngine.ts
 * OTB 采购预算引擎 — V4.0 P1
 *
 * 核心公式（来自 Excel OTB预算 + 拆解页）：
 *   requiredRetailInventory = salesForecast / targetSellThroughRate
 *   requiredCostInventory   = requiredRetailInventory / discountRate / markupMultiplier
 *   otbCostBudget           = max(0, requiredCostInventory − openingInventoryCost)
 *   otbRetailBudget         = otbCostBudget × markupMultiplier
 *
 * 电商渠道修正（退货率）：
 *   effectiveSellThrough    = targetSellThrough − returnRate  (必须 > 0)
 *   ecomRequiredRetail      = ecomSales / effectiveSellThrough
 */
import { useMemo } from 'react';
import { useFactInventory, useOtbModelAssumptions } from './useDashboardData';
import { useForecastEngine } from './useForecastEngine';
import type { ForecastScenario } from './useForecast';
import { useGlobalConfig } from '@/context/GlobalConfigContext';

// ── Raw JSON types ─────────────────────────────────────────────────────────────
interface RawSeasonSplit {
    key: string;
    label: string;
    months: number[];
    sales_share: number;
}
interface RawNewGoodsSplit {
    key: string;
    label: string;
    target_share: number;
}
interface RawOtbModelAssumptions {
    default_sell_through_target: number;
    default_ecommerce_return_rate: number;
    default_markup_multiplier: number;
    default_discount_rate: number;
    ending_inventory_policy: {
        safe_wos: number;
        warning_wos: number;
        danger_wos: number;
    };
    season_split: RawSeasonSplit[];
    new_goods_split: RawNewGoodsSplit[];
}

interface RawFactInventoryRow {
    date: string;
    store_id: string;
    sku_id: string;
    inventory_amount: number;
}

// ── Exported types ─────────────────────────────────────────────────────────────
export interface OtbAnnual {
    /** 年销售预测（实际售价） */
    salesForecast: number;
    /** 实体+加盟渠道销售 */
    physSalesForecast: number;
    /** 电商渠道销售 */
    ecomSalesForecast: number;
    /** 新店销售 */
    newStoreSalesForecast: number;
    /** 目标售罄率 */
    targetSellThroughRate: number;
    /** 实体所需零售货值（MSRP 口径） */
    physRequiredRetailInventory: number;
    /** 电商有效售罄率（扣除退货率后） */
    ecomEffectiveSellThrough: number;
    /** 电商所需零售货值 */
    ecomRequiredRetailInventory: number;
    /** 合计所需零售货值 */
    totalRequiredRetailInventory: number;
    /** 合计所需成本货值（除以折扣率和加价倍数） */
    totalRequiredCostInventory: number;
    /** 期初库存（成本口径，来自 fact_inventory） */
    openingInventoryCost: number;
    /** OTB 成本预算（max 0, 所需 − 期初） */
    otbCostBudget: number;
    /** OTB 零售预算（成本 × 加价倍数） */
    otbRetailBudget: number;
    /** 预计期末库存成本（简化估算） */
    endingInventoryCost: number;
    /** 周转周数（期末库存 / 周均销售成本） */
    endingWos: number;
}

export interface OtbSeasonRow {
    key: string;
    label: string;
    months: number[];
    salesShare: number;
    forecastSales: number;
    newGoodsShare: number;
    targetSellThrough: number;
    otbCostBudget: number;
    otbRetailBudget: number;
}

export interface OtbWaveRow {
    key: string;
    label: string;
    months: number[];
    forecastSales: number;
    waveShare: number;
    suggestedArrivalMonths: string;
    otbCostBudget: number;
}

export interface OtbCategoryRow {
    key: string;
    label: string;
    forecastSales: number;
    targetShare: number;
    grossMarginRate: number;
    sellThroughTarget: number;
    otbCostBudget: number;
    verdict: string;
}

export interface OtbPriceBandRow {
    key: string;
    label: string;
    forecastSales: number;
    otbCostBudget: number;
    risk: 'healthy' | 'over_weight' | 'under_weight';
}

export interface OtbEngineChecks {
    /** 渠道加总是否吻合年度预测 */
    totalMatchesForecast: boolean;
    /** 期末 WoS 是否在安全范围内 */
    inventoryEnough: boolean;
    /** OTB 预算是否为正 */
    budgetPositive: boolean;
    /** 电商退货率是否接近或超过售罄率（风险） */
    ecomReturnRateDanger: boolean;
    warnings: string[];
}

export interface OtbEngineResult {
    annual: OtbAnnual;
    bySeason: OtbSeasonRow[];
    byWave: OtbWaveRow[];
    byCategory: OtbCategoryRow[];
    byPriceBand: OtbPriceBandRow[];
    checks: OtbEngineChecks;
    /** 来源：'template' for P1, 'history' for P3 */
    source: 'template' | 'history' | 'configured';
}

// ── Core formula helpers ──────────────────────────────────────────────────────
function requiredRetailInventory(sales: number, sellThrough: number): number {
    return sellThrough > 0 ? sales / sellThrough : 0;
}

function requiredCostInventory(retailInventory: number, discountRate: number, markupMultiplier: number): number {
    const denom = discountRate * markupMultiplier;
    return denom > 0 ? retailInventory / denom : 0;
}

function computeOtbCostBudget(requiredCost: number, openingCost: number): number {
    return Math.max(0, requiredCost - openingCost);
}

// ── Main Hook ─────────────────────────────────────────────────────────────────
export function useOtbEngine(scenario: ForecastScenario): OtbEngineResult | null {
    const engine        = useForecastEngine(scenario);
    const { data: invRaw }      = useFactInventory() as { data: RawFactInventoryRow[] | undefined };
    const { data: otbAssRaw }   = useOtbModelAssumptions() as { data: RawOtbModelAssumptions | undefined };
    const { config }            = useGlobalConfig();

    return useMemo((): OtbEngineResult | null => {
        if (!engine || !otbAssRaw) return null;

        const warnings: string[] = [];

        // ── Parameters ──
        const discountRate     = config.brand.avgDiscountRate;     // 0.85
        const markupMultiplier = config.brand.markupMultiplier;    // 3.2
        const grossMarginRate  = config.brand.grossMarginRate;     // 0.42
        const returnRate       = config.ecommerceDrivers.refundRate || otbAssRaw.default_ecommerce_return_rate;

        const targetSellThrough   = otbAssRaw.default_sell_through_target; // 0.80
        const safeWos             = otbAssRaw.ending_inventory_policy.safe_wos;
        const warningWos          = otbAssRaw.ending_inventory_policy.warning_wos;

        // ── Opening inventory from fact_inventory (latest month) ──
        let openingInventoryCost = 0;
        if (invRaw && invRaw.length > 0) {
            const latestDate = invRaw.reduce((max, r) => r.date > max ? r.date : max, '');
            const latestRows = invRaw.filter(r => r.date === latestDate);
            // fact_inventory.inventory_amount is used across the dashboard as inventory capital.
            // Keep the same cost/cash proxy here to avoid OTB and cashflow using different inventory bases.
            openingInventoryCost = latestRows.reduce((s, r) => s + Number(r.inventory_amount || 0), 0);
        }

        // ── Annual OTB ──
        const physSalesForecast  = engine.channelMix.find(c => c.channel === 'physical')?.forecastSales ?? 0;
        const ecomSalesForecast  = engine.channelMix.find(c => c.channel === 'ecommerce')?.forecastSales ?? 0;
        const newStoreSalesForecast = engine.channelMix.find(c => c.channel === 'new_store')?.forecastSales ?? 0;
        const salesForecast      = engine.totals.annualSalesForecast;

        // Store channels: existing physical stores + new stores
        const physRequiredRetail = requiredRetailInventory(physSalesForecast + newStoreSalesForecast, targetSellThrough);

        // Ecommerce with return rate adjustment
        const ecomEffectiveST = Math.max(0.01, targetSellThrough - returnRate);
        if (targetSellThrough - returnRate <= 0.10) {
            warnings.push('电商退货率接近目标售罄率，所需库存投入将大幅放大，存在高风险');
        }
        const ecomRequiredRetail = requiredRetailInventory(ecomSalesForecast, ecomEffectiveST);

        const totalRequiredRetail = physRequiredRetail + ecomRequiredRetail;
        const totalRequiredCost   = requiredCostInventory(totalRequiredRetail, discountRate, markupMultiplier);
        const otbCostBudget       = computeOtbCostBudget(totalRequiredCost, openingInventoryCost);
        const otbRetailBudget     = otbCostBudget * markupMultiplier;

        // Simplified ending inventory estimate
        const cogs                = salesForecast * (1 - grossMarginRate);
        const endingInventoryCost = Math.max(0, openingInventoryCost + otbCostBudget - cogs);
        const weeklyCogsRate      = cogs / 52;
        const endingWos           = weeklyCogsRate > 0 ? endingInventoryCost / weeklyCogsRate : 0;

        // WoS warning
        if (endingWos > warningWos) {
            warnings.push(`预计期末库存 ${endingWos.toFixed(1)} 周转周数，超过预警线（${warningWos} 周），建议提前清货`);
        }

        const annual: OtbAnnual = {
            salesForecast,
            physSalesForecast,
            ecomSalesForecast,
            newStoreSalesForecast,
            targetSellThroughRate: targetSellThrough,
            physRequiredRetailInventory: physRequiredRetail,
            ecomEffectiveSellThrough: ecomEffectiveST,
            ecomRequiredRetailInventory: ecomRequiredRetail,
            totalRequiredRetailInventory: totalRequiredRetail,
            totalRequiredCostInventory: totalRequiredCost,
            openingInventoryCost,
            otbCostBudget,
            otbRetailBudget,
            endingInventoryCost,
            endingWos,
        };

        // ── By season ──
        const bySeason: OtbSeasonRow[] = (otbAssRaw.season_split ?? []).map(ss => {
            const seasonSales  = salesForecast * ss.sales_share;
            const newGoodsSplit = otbAssRaw.new_goods_split ?? [];
            const newShare     = newGoodsSplit.find(ng => ng.key === 'new')?.target_share ?? 0.70;
            const seasonRetail = requiredRetailInventory(seasonSales, targetSellThrough);
            const seasonCost   = requiredCostInventory(seasonRetail, discountRate, markupMultiplier);
            const seasonOtb    = seasonCost * (otbCostBudget / (totalRequiredCost || 1));
            return {
                key: ss.key,
                label: ss.label,
                months: ss.months,
                salesShare: ss.sales_share,
                forecastSales: seasonSales,
                newGoodsShare: newShare,
                targetSellThrough,
                otbCostBudget: seasonOtb,
                otbRetailBudget: seasonOtb * markupMultiplier,
            };
        });

        // ── By wave ──
        const byWave: OtbWaveRow[] = engine.waveMix.map(w => {
            const waveCostBudget = otbCostBudget * w.finalShare;
            // Suggest arrival 2 months before first sale month
            const firstMonth      = Math.min(...w.months);
            const arrivalMonth    = ((firstMonth - 2 + 11) % 12) + 1; // 1-12, wrap around
            return {
                key: w.key,
                label: w.label,
                months: w.months,
                forecastSales: w.forecastSales,
                waveShare: w.finalShare,
                suggestedArrivalMonths: `${arrivalMonth}月到货`,
                otbCostBudget: waveCostBudget,
            };
        });

        // ── By category ──
        const byCategory: OtbCategoryRow[] = engine.categoryMix.map(cat => {
            const catOtb    = otbCostBudget * cat.finalShare;
            const verdict   = cat.grossMarginRate >= 0.60 ? '高毛利，优先备货'
                : cat.grossMarginRate >= 0.55 ? '毛利健康，按计划备货'
                : '毛利偏低，控制投入';
            return {
                key: cat.key,
                label: cat.label,
                forecastSales: cat.forecastSales,
                targetShare: cat.finalShare,
                grossMarginRate: cat.grossMarginRate,
                sellThroughTarget: targetSellThrough,
                otbCostBudget: catOtb,
                verdict,
            };
        });

        // ── By price band ──
        const byPriceBand: OtbPriceBandRow[] = engine.priceBandMix.map(pb => ({
            key: pb.key,
            label: pb.label,
            forecastSales: pb.forecastSales,
            otbCostBudget: otbCostBudget * pb.finalShare,
            risk: pb.risk,
        }));

        // ── Checks ──
        const channelTotal  = physSalesForecast + ecomSalesForecast;
        const checks: OtbEngineChecks = {
            totalMatchesForecast: Math.abs(channelTotal - salesForecast) < 1,
            inventoryEnough: endingWos <= safeWos,
            budgetPositive: otbCostBudget > 0,
            ecomReturnRateDanger: targetSellThrough - returnRate <= 0.10,
            warnings,
        };

        // Determine source
        const source = engine.meta.dataQuality === 'template' ? 'template' :
            engine.meta.dataQuality === 'mixed' ? 'configured' : 'history';

        return { annual, bySeason, byWave, byCategory, byPriceBand, checks, source };
    }, [engine, invRaw, otbAssRaw, config]);
}
