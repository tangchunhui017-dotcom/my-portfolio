'use client';
/**
 * src/hooks/usePnl.ts
 * 品牌 P&L 和单店盈利计算 Hook — v2.1 升级
 */
import { useMemo } from 'react';
import { usePnlAssumptions, useFactSales } from './useDashboardData';
import { useGlobalConfig } from '@/context/GlobalConfigContext';

interface PnlAssumptions {
    brand: {
        cogsRate: number;
        marketingRate: number;
        logisticsRate: number;
        laborRate: number;
        rentRate: number;
        adminRate: number;
        depreciationRate: number;
        otherOpexRate: number;
        taxRate: number;
        returnRate: number;
    };
    storeTemplates: Record<string, StoreTemplate>;
    storeGradeRules: Record<string, { label: string; minSalesPerSqmPerYear: number; minProfitRate: number }>;
}

interface StoreTemplate {
    label: string;
    area: number;
    fixedRent: number;
    propertyFee: number;
    revShareRate: number;
    staffCount: number;
    staffCostPerHead: number;
    fitoutCost: number;
    fitoutAmortizationMonths: number;
    depositMonths: number;
    targetMonthlyRevenue: number;
}

export interface BrandPnlResult {
    netRevenue: number;
    grossProfit: number;
    grossMarginRate: number;
    marketing: number;
    logistics: number;
    labor: number;
    rent: number;
    admin: number;
    depreciation: number;
    otherOpex: number;
    totalOpex: number;
    ebit: number;
    ebitRate: number;
    tax: number;
    netProfit: number;
    netProfitRate: number;
    isEstimated: boolean;
    monthlyBreakdown: Array<{
        month: number;
        label: string;
        netRevenue: number;
        grossProfit: number;
        grossMarginRate: number;
        ebit: number;
        ebitRate: number;
    }>;
}

export interface StorePnlInput {
    templateKey: 'mall_flagship' | 'mall_standard' | 'street';
    monthlyRevenue: number;
    overrides?: Partial<StoreTemplate>;
}

export interface StorePnlResult {
    template: StoreTemplate;
    monthlyRevenue: number;
    grossProfit: number;
    grossMarginRate: number;
    effectiveRent: number;
    rentMethod: 'fixed' | 'revshare' | 'guarantee';
    staffCost: number;
    fitoutAmortization: number;
    backendCost: number;
    mallDeduction: number;
    taxAmount: number;
    totalOpex: number;
    netProfit: number;
    profitRate: number;
    salesPerSqm: number;
    salesPerSqmPerYear: number;
    storeGrade: string;
    breakEvenMonthlySales: number;
    roi: number;
    paybackMonths: number;
    isEstimated: boolean;
}

export interface BrandPnlFilters {
    year?: string;
    season_year?: number | 'all';
    season?: string | 'all';
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function useBrandPnl(filters: BrandPnlFilters): BrandPnlResult | null {
    const { data: pnlAss } = usePnlAssumptions() as { data: PnlAssumptions | undefined };
    const yearParam = filters.year ?? (filters.season_year !== undefined && filters.season_year !== 'all' ? String(filters.season_year) : undefined);
    const seasonParam = filters.season !== undefined && filters.season !== 'all' ? filters.season : undefined;
    const { data: factSalesRaw } = useFactSales(yearParam, seasonParam);
    const { config: globalConfig } = useGlobalConfig();

    return useMemo(() => {
        if (!pnlAss) return null;
        const ass = pnlAss.brand;

        // v2.1: 优先用 GlobalConfig 的毛利率
        const effectiveGMR = globalConfig.brand.grossMarginRate;
        const effectiveTaxRate = globalConfig.brand.taxRate;

        type FactSalesRow = {
            net_sales_amt?: number | string;
            gross_margin_rate?: number | string;
            gross_profit?: number | string;
            gross_profit_amt?: number | string;
            sale_month?: number | string;
        };

        const factSales: FactSalesRow[] = Array.isArray(factSalesRaw) ? factSalesRaw : [];
        const isEstimated = factSales.length === 0;

        // 按月聚合
        const byMonth: Record<number, { netRev: number; grossProfit: number }> = {};
        for (let m = 1; m <= 12; m++) byMonth[m] = { netRev: 0, grossProfit: 0 };

        let totalNet = 0;
        let totalGross = 0;

        factSales.forEach((r: FactSalesRow) => {
            const netRev = Number(r.net_sales_amt || 0);
            const grossProfit = r.gross_profit_amt !== undefined
                ? Number(r.gross_profit_amt)
                : r.gross_profit !== undefined
                ? Number(r.gross_profit)
                : netRev * effectiveGMR;
            const month = Number(r.sale_month || 0);
            if (month >= 1 && month <= 12) {
                byMonth[month].netRev += netRev;
                byMonth[month].grossProfit += grossProfit;
            }
            totalNet += netRev;
            totalGross += grossProfit;
        });

        if (isEstimated) {
            const dummy = 0;
            return buildPnlResult(dummy, dummy, ass, effectiveTaxRate, [], true);
        }

        const grossMarginRate = totalNet > 0 ? totalGross / totalNet : 0;
        const marketing = totalNet * ass.marketingRate;
        const logistics = totalNet * ass.logisticsRate;
        const labor = totalNet * ass.laborRate;
        const rent = totalNet * ass.rentRate;
        const admin = totalNet * ass.adminRate;
        const depreciation = totalNet * ass.depreciationRate;
        const otherOpex = totalNet * ass.otherOpexRate;
        const totalOpex = marketing + logistics + labor + rent + admin + depreciation + otherOpex;
        const ebit = totalGross - totalOpex;
        const ebitRate = totalNet > 0 ? ebit / totalNet : 0;
        const tax = ebit > 0 ? ebit * effectiveTaxRate : 0;
        const netProfit = ebit - tax;
        const netProfitRate = totalNet > 0 ? netProfit / totalNet : 0;

        const monthlyBreakdown = MONTH_LABELS.map((label, i) => {
            const m = i + 1;
            const mNet = byMonth[m].netRev;
            const mGross = byMonth[m].grossProfit;
            const mGMRate = mNet > 0 ? mGross / mNet : 0;
            const mOpex = mNet * (ass.marketingRate + ass.logisticsRate + ass.laborRate + ass.rentRate + ass.adminRate + ass.depreciationRate + ass.otherOpexRate);
            const mEbit = mGross - mOpex;
            return { month: m, label, netRevenue: mNet, grossProfit: mGross, grossMarginRate: mGMRate, ebit: mEbit, ebitRate: mNet > 0 ? mEbit / mNet : 0 };
        });

        return {
            netRevenue: totalNet,
            grossProfit: totalGross,
            grossMarginRate,
            marketing,
            logistics,
            labor,
            rent,
            admin,
            depreciation,
            otherOpex,
            totalOpex,
            ebit,
            ebitRate,
            tax,
            netProfit,
            netProfitRate,
            isEstimated: false,
            monthlyBreakdown,
        };
    }, [pnlAss, factSalesRaw, globalConfig.brand.grossMarginRate, globalConfig.brand.taxRate]);
}

function buildPnlResult(
    totalNet: number,
    totalGross: number,
    ass: PnlAssumptions['brand'],
    effectiveTaxRate: number,
    monthlyBreakdown: BrandPnlResult['monthlyBreakdown'],
    isEstimated: boolean,
): BrandPnlResult {
    const grossMarginRate = totalNet > 0 ? totalGross / totalNet : 0;
    const marketing = totalNet * ass.marketingRate;
    const logistics = totalNet * ass.logisticsRate;
    const labor = totalNet * ass.laborRate;
    const rent = totalNet * ass.rentRate;
    const admin = totalNet * ass.adminRate;
    const depreciation = totalNet * ass.depreciationRate;
    const otherOpex = totalNet * ass.otherOpexRate;
    const totalOpex = marketing + logistics + labor + rent + admin + depreciation + otherOpex;
    const ebit = totalGross - totalOpex;
    const ebitRate = totalNet > 0 ? ebit / totalNet : 0;
    const tax = ebit > 0 ? ebit * effectiveTaxRate : 0;
    const netProfit = ebit - tax;
    const netProfitRate = totalNet > 0 ? netProfit / totalNet : 0;
    return {
        netRevenue: totalNet, grossProfit: totalGross, grossMarginRate,
        marketing, logistics, labor, rent, admin, depreciation, otherOpex,
        totalOpex, ebit, ebitRate, tax, netProfit, netProfitRate,
        isEstimated,
        monthlyBreakdown: monthlyBreakdown.length > 0 ? monthlyBreakdown
            : MONTH_LABELS.map((label, i) => ({ month: i + 1, label, netRevenue: 0, grossProfit: 0, grossMarginRate: 0, ebit: 0, ebitRate: 0 })),
    };
}

export function useStorePnl(input: StorePnlInput): StorePnlResult | null {
    const { data: pnlAss } = usePnlAssumptions() as { data: PnlAssumptions | undefined };
    const { config: globalConfig } = useGlobalConfig();

    return useMemo(() => {
        if (!pnlAss) return null;
        const baseTemplate = pnlAss.storeTemplates[input.templateKey];
        if (!baseTemplate) return null;

        const template: StoreTemplate = { ...baseTemplate, ...(input.overrides || {}) };
        const monthly = input.monthlyRevenue;

        // v2.1: 加价公式毛利率 = 1 - 1/(markupMultiplier × avgDiscountRate)
        const { markupMultiplier, avgDiscountRate, backendCostRate, taxRate } = globalConfig.brand;
        const grossMarginRate = markupMultiplier > 0 && avgDiscountRate > 0
            ? 1 - 1 / (markupMultiplier * avgDiscountRate)
            : globalConfig.brand.grossMarginRate;

        const grossProfit = monthly * grossMarginRate;

        // v2.1: 商场租金取三者最大值
        const fixedBase = template.fixedRent + template.propertyFee;
        const revShare = template.revShareRate > 0 ? monthly * template.revShareRate : 0;
        // guaranteed rent 从内部字段获得，如未定义则为 0
        const guaranteedRent = (template as StoreTemplate & { guaranteedRent?: number }).guaranteedRent ?? 0;
        const effectiveRent = Math.max(fixedBase, guaranteedRent, revShare);
        let rentMethod: 'fixed' | 'revshare' | 'guarantee';
        if (effectiveRent === revShare && revShare > 0) rentMethod = 'revshare';
        else if (effectiveRent === guaranteedRent && guaranteedRent > 0) rentMethod = 'guarantee';
        else rentMethod = 'fixed';

        const staffCost = template.staffCount * template.staffCostPerHead;
        const fitoutAmortization = template.fitoutCost / template.fitoutAmortizationMonths;
        const backendCost = monthly * backendCostRate;
        const mallDeduction = monthly * (template.revShareRate ?? 0);
        const taxAmount = monthly * taxRate;
        const totalOpex = effectiveRent + staffCost + fitoutAmortization + backendCost + taxAmount;
        const netProfit = grossProfit - totalOpex;
        const profitRate = monthly > 0 ? netProfit / monthly : 0;

        const salesPerSqm = template.area > 0 ? monthly / template.area : 0;
        const salesPerSqmPerYear = salesPerSqm * 12;

        // 店铺等级
        const rules = pnlAss.storeGradeRules;
        let storeGrade = 'C';
        if (salesPerSqmPerYear >= (rules.A?.minSalesPerSqmPerYear ?? Infinity) && profitRate >= (rules.A?.minProfitRate ?? 0)) storeGrade = 'A';
        else if (salesPerSqmPerYear >= (rules.B?.minSalesPerSqmPerYear ?? Infinity) && profitRate >= (rules.B?.minProfitRate ?? 0)) storeGrade = 'B';

        const breakEvenMonthlySales = grossMarginRate > 0 ? totalOpex / grossMarginRate : 0;

        const deposit = template.fixedRent * template.depositMonths;
        const totalInvestment = template.fitoutCost + deposit;
        const roi = totalInvestment > 0 ? (netProfit * 12) / totalInvestment : 0;
        const paybackMonths = netProfit > 0 ? Math.ceil(totalInvestment / netProfit) : 999;

        return {
            template, monthlyRevenue: monthly,
            grossProfit, grossMarginRate,
            effectiveRent, rentMethod,
            staffCost, fitoutAmortization,
            backendCost, mallDeduction, taxAmount,
            totalOpex, netProfit, profitRate,
            salesPerSqm, salesPerSqmPerYear, storeGrade,
            breakEvenMonthlySales, roi, paybackMonths,
            isEstimated: true,
        };
    }, [pnlAss, input.templateKey, input.monthlyRevenue, input.overrides, globalConfig.brand]);
}
