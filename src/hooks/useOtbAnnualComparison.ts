'use client';

import { useMemo } from 'react';

import { useDimChannel, useDimSku, useFactPlan, useFactSalesForDashboard } from '@/hooks/useDashboardData';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import type { AnnualOTBInputs, AnnualOTBResult } from '@/utils/otbCalculations';

type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

interface FactSalesRecord {
    sku_id: string;
    channel_id: string;
    season_year?: string | number;
    sale_year?: string | number;
    season?: string;
    sales_season?: string;
    net_sales_amt?: number;
    cogs_amt?: number;
    cumulative_sell_through?: number;
}

interface FactPlanRecord {
    year?: number;
    plan_otb_budget?: number;
}

interface DimSkuRecord {
    sku_id: string;
    brand_name?: string;
    category_id?: string;
    category_name?: string;
    category_l2?: string;
    price_band?: string;
}

interface DimChannelRecord {
    channel_id: string;
    channel_type?: string;
}

export interface OtbAnnualSeasonBaseline {
    salesAmount: number | null;
    salesRatio: number | null;
    sellThroughRate: number | null;
    sourceLabel: string;
}

export interface OtbAnnualComparison {
    currentYear: number;
    previousYear: number;
    lySalesActual: number | null;
    lyOtbBudget: number | null;
    lyCogsAmount: number | null;
    salesDelta: number | null;
    salesDeltaRate: number | null;
    otbDelta: number | null;
    otbDeltaRate: number | null;
    seasonBaselines: Record<SeasonKey, OtbAnnualSeasonBaseline>;
    sourceLabel: string;
    isLoading: boolean;
    hasHistoryData: boolean;
}

const EMPTY_SEASON_BASELINES: Record<SeasonKey, OtbAnnualSeasonBaseline> = {
    spring: { salesAmount: null, salesRatio: null, sellThroughRate: null, sourceLabel: '无历史数据' },
    summer: { salesAmount: null, salesRatio: null, sellThroughRate: null, sourceLabel: '无历史数据' },
    autumn: { salesAmount: null, salesRatio: null, sellThroughRate: null, sourceLabel: '无历史数据' },
    winter: { salesAmount: null, salesRatio: null, sellThroughRate: null, sourceLabel: '无历史数据' },
};

function toNumber(value: unknown): number | null {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

function mapSeasonToAnnualSeason(value?: string): SeasonKey | null {
    const v = (value ?? '').toLowerCase();
    if (v.includes('spring') || v.includes('q1') || v.includes('春')) return 'spring';
    if (v.includes('summer') || v.includes('q2') || v.includes('夏')) return 'summer';
    if (v.includes('autumn') || v.includes('fall') || v.includes('q3') || v.includes('秋')) return 'autumn';
    if (v.includes('winter') || v.includes('q4') || v.includes('冬')) return 'winter';
    return null;
}

function matchesFilters(
    record: FactSalesRecord,
    filters: DashboardFilters,
    skuMap: Map<string, DimSkuRecord>,
    channelMap: Map<string, DimChannelRecord>,
) {
    const sku = skuMap.get(record.sku_id);
    const channel = channelMap.get(record.channel_id);

    if (filters.brand !== 'all' && sku?.brand_name !== filters.brand) return false;
    if (filters.category_id !== 'all' && sku?.category_id !== filters.category_id) return false;
    if (filters.sub_category !== 'all' && sku?.category_l2 !== filters.sub_category) return false;
    if (filters.channel_type !== 'all' && channel?.channel_type !== filters.channel_type) return false;
    if (filters.price_band !== 'all' && sku?.price_band !== filters.price_band) return false;

    return true;
}

function getRecordYear(record: FactSalesRecord) {
    return toNumber(record.season_year ?? record.sale_year);
}

export function useOtbAnnualComparison(
    filters: DashboardFilters,
    inputs: AnnualOTBInputs,
    result: AnnualOTBResult,
): OtbAnnualComparison {
    const currentYear = filters.season_year !== 'all' ? filters.season_year : new Date().getFullYear();
    const previousYear = currentYear - 1;

    const sales = useFactSalesForDashboard(currentYear);
    const plans = useFactPlan();
    const dimSku = useDimSku();
    const dimChannel = useDimChannel();

    return useMemo(() => {
        const skuMap = new Map<string, DimSkuRecord>(
            ((dimSku.data ?? []) as DimSkuRecord[]).map(row => [row.sku_id, row]),
        );
        const channelMap = new Map<string, DimChannelRecord>(
            ((dimChannel.data ?? []) as DimChannelRecord[]).map(row => [row.channel_id, row]),
        );

        const seasonAgg: Record<SeasonKey, { sales: number; stWeighted: number; stWeight: number }> = {
            spring: { sales: 0, stWeighted: 0, stWeight: 0 },
            summer: { sales: 0, stWeighted: 0, stWeight: 0 },
            autumn: { sales: 0, stWeighted: 0, stWeight: 0 },
            winter: { sales: 0, stWeighted: 0, stWeight: 0 },
        };

        let lySalesActual = 0;
        let lyCogsAmount = 0;

        for (const record of (sales.data ?? []) as FactSalesRecord[]) {
            if (getRecordYear(record) !== previousYear) continue;
            if (!matchesFilters(record, filters, skuMap, channelMap)) continue;

            const netSales = toNumber(record.net_sales_amt) ?? 0;
            const cogs = toNumber(record.cogs_amt) ?? 0;
            const st = toNumber(record.cumulative_sell_through);
            const seasonKey = mapSeasonToAnnualSeason(record.sales_season ?? record.season);

            lySalesActual += netSales;
            lyCogsAmount += cogs;

            if (seasonKey) {
                seasonAgg[seasonKey].sales += netSales;
                if (st !== null) {
                    const weight = Math.max(netSales, 1);
                    seasonAgg[seasonKey].stWeighted += st * weight;
                    seasonAgg[seasonKey].stWeight += weight;
                }
            }
        }

        const lyPlanBudget = ((plans.data ?? []) as FactPlanRecord[])
            .filter(row => row.year === previousYear)
            .reduce((sum, row) => sum + (toNumber(row.plan_otb_budget) ?? 0), 0);

        const lySales = lySalesActual > 0 ? lySalesActual : null;
        const lyCogs = lyCogsAmount > 0 ? lyCogsAmount : null;
        const lyOtb = lyPlanBudget > 0 ? lyPlanBudget : lyCogs;
        const currentOtb = result.annualNewProductInvestmentBudget;

        const seasonBaselines = { ...EMPTY_SEASON_BASELINES };
        (Object.keys(seasonAgg) as SeasonKey[]).forEach(key => {
            const item = seasonAgg[key];
            seasonBaselines[key] = {
                salesAmount: item.sales > 0 ? item.sales : null,
                salesRatio: lySales && item.sales > 0 ? item.sales / lySales : null,
                sellThroughRate: item.stWeight > 0 ? item.stWeighted / item.stWeight : null,
                sourceLabel: item.sales > 0 ? 'fact_sales 历史实际' : '无历史数据',
            };
        });

        return {
            currentYear,
            previousYear,
            lySalesActual: lySales,
            lyOtbBudget: lyOtb ?? null,
            lyCogsAmount: lyCogs,
            salesDelta: lySales ? inputs.annualSalesTarget - lySales : null,
            salesDeltaRate: lySales ? (inputs.annualSalesTarget - lySales) / lySales : null,
            otbDelta: lyOtb && currentOtb !== null ? currentOtb - lyOtb : null,
            otbDeltaRate: lyOtb && currentOtb !== null ? (currentOtb - lyOtb) / lyOtb : null,
            seasonBaselines,
            sourceLabel: lySales ? 'fact_sales 历史实际 + fact_plan OTB预算' : '缺少历史数据',
            isLoading: sales.isLoading || plans.isLoading || dimSku.isLoading || dimChannel.isLoading,
            hasHistoryData: !!lySales,
        };
    }, [
        currentYear,
        previousYear,
        sales.data,
        sales.isLoading,
        plans.data,
        plans.isLoading,
        dimSku.data,
        dimSku.isLoading,
        dimChannel.data,
        dimChannel.isLoading,
        filters,
        inputs.annualSalesTarget,
        result.annualNewProductInvestmentBudget,
    ]);
}
