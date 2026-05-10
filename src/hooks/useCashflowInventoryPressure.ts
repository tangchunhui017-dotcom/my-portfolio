'use client';
/**
 * src/hooks/useCashflowInventoryPressure.ts
 * 现金流库存占款压力 Hook — V3.2
 */
import { useMemo } from 'react';
import { useFactInventory } from './useDashboardData';
import { useCashflow } from './useCashflow';
import type { CashflowSimulationOptions } from './useCashflow';
import { useForecast } from './useForecast';
import type { ForecastScenario } from './useForecast';
import factInventoryFallback from '../../data/dashboard/fact_inventory.json';

interface FactInventoryRow {
    date: string;
    store_id: string;
    sku_id: string;
    bop_qty: number;
    inbound_qty: number;
    eop_qty: number;
    inventory_amount: number;
}

export interface InventoryPressureResult {
    /** 期末库存总金额（最新月加总） */
    endingInventoryAmount: number;
    /** 库存占款（进价 ≈ 库存金额 × (1 - grossMarginRate)，简化取库存金额） */
    inventoryCapital: number;
    /** 年销售额 */
    annualSales: number;
    /** 库存/年销售额比率 */
    inventoryToSalesRatio: number;
    /** 最大现金缺口（正数表示无缺口） */
    cashGap: number;
    /** 建议授信额度 */
    suggestedCreditLine: number;
    /** 清货回款模拟（假设清货率35%，折扣50%） */
    clearanceCashIn: number;
    /** 清货后最大现金缺口 */
    cashGapAfterClearance: number;
    /** 当前现金流动作模拟是否已包含清货回款 */
    clearanceAppliedInCashflow: boolean;
    /** 叙述性结论 */
    narrative: string;
}

export function useCashflowInventoryPressure(scenario: ForecastScenario, simulationOptions: CashflowSimulationOptions = {}): InventoryPressureResult | null {
    const { data: inventoryRaw } = useFactInventory() as { data: FactInventoryRow[] | undefined };
    const cashflow = useCashflow(scenario, simulationOptions);
    const baselineCashflow = useCashflow(scenario);
    const physForecast = useForecast('physical', scenario);
    const ecomForecast = useForecast('ecommerce', scenario);
    const newStoreForecast = useForecast('new_store', scenario);

    return useMemo(() => {
        const inventoryRows: FactInventoryRow[] = Array.isArray(inventoryRaw)
            ? inventoryRaw
            : (factInventoryFallback as FactInventoryRow[]);
        if (inventoryRows.length === 0 || !cashflow || !baselineCashflow || !physForecast || !ecomForecast || !newStoreForecast) return null;

        // 取最新日期的库存总金额
        const latestDate = inventoryRows.reduce((max, r) => r.date > max ? r.date : max, '');
        const latestRows = inventoryRows.filter(r => r.date === latestDate);
        const endingInventoryAmount = latestRows.reduce((s, r) => s + r.inventory_amount, 0);
        // 库存占款 = 库存金额（已含成本）
        const inventoryCapital = endingInventoryAmount;

        // 年销售额
        const annualSales = physForecast.annualForecast + ecomForecast.annualForecast + newStoreForecast.annualForecast;
        const inventoryToSalesRatio = annualSales > 0 ? inventoryCapital / annualSales : 0;

        // 现金缺口
        const rawCashGap = cashflow.maxGapAmount; // <= 0 时表示有缺口
        const cashGap = rawCashGap < 0 ? Math.abs(rawCashGap) : 0;
        const baselineRawCashGap = baselineCashflow.maxGapAmount;
        const baselineCashGap = baselineRawCashGap < 0 ? Math.abs(baselineRawCashGap) : 0;

        // 建议授信额度
        const suggestedCreditLine = cashGap > 0 ? cashGap * 1.2 : 0;

        // 清货回款模拟：20% 存货参与清货，折5折售出
        const clearanceRate = simulationOptions.clearanceInventoryRate ?? 0.20;
        const clearanceDiscount = simulationOptions.clearanceDiscount ?? 0.50;
        const clearanceCashIn = inventoryCapital * clearanceRate * clearanceDiscount;
        const clearanceAppliedInCashflow = Boolean(simulationOptions.clearanceInventoryRate && simulationOptions.clearanceInventoryRate > 0);

        // 清货后现金缺口
        const cashGapAfterClearance = clearanceAppliedInCashflow
            ? cashGap
            : Math.max(0, baselineCashGap - clearanceCashIn);

        // 叙述
        const gapMonthLabel = cashflow.maxGapMonth ? `${cashflow.maxGapMonth}月` : '无';
        const narrative = cashGap > 0
            ? `当前最大现金缺口 ${(cashGap / 10000).toFixed(0)} 万元（出现于${gapMonthLabel}），主要由 OTB 付款和库存占款造成；` +
            `若提前清货 ${(clearanceCashIn / 10000).toFixed(0)} 万元（${(clearanceRate * 100).toFixed(0)}%库存×5折），可将缺口降至约 ${(cashGapAfterClearance / 10000).toFixed(0)} 万元。` +
            (suggestedCreditLine > 0 ? `建议安排备用授信额度 ${(suggestedCreditLine / 10000).toFixed(0)} 万元。` : '')
            : `现金流整体安全，年末余额 ${(cashflow.yearEndBalance / 10000).toFixed(0)} 万元。库存占款 ${(inventoryCapital / 10000).toFixed(0)} 万元，库存/年销比为 ${(inventoryToSalesRatio * 100).toFixed(1)}%。`;

        return { endingInventoryAmount, inventoryCapital, annualSales, inventoryToSalesRatio, cashGap, suggestedCreditLine, clearanceCashIn, cashGapAfterClearance, clearanceAppliedInCashflow, narrative };
    }, [inventoryRaw, cashflow, baselineCashflow, physForecast, ecomForecast, newStoreForecast, simulationOptions.clearanceInventoryRate, simulationOptions.clearanceDiscount]);
}
