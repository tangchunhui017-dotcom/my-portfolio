'use client';
/**
 * src/hooks/useForecast.ts
 * 销售预测计算 Hook — v2.1 驱动因子预测增量升级
 */
import { useMemo } from 'react';
import { useForecastAssumptions, useSalesForecasts } from './useDashboardData';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import type { ForecastMethod, GlobalConfig } from '@/context/GlobalConfigContext';
import forecastAssumptionsFallback from '../../data/dashboard/forecast_assumptions.json';
import salesForecastsFallback from '../../data/dashboard/sales_forecasts.json';

export type { ForecastMethod };

export type ForecastChannel = 'physical' | 'ecommerce' | 'new_store';
export type ForecastScenario = 'conservative' | 'base' | 'optimistic';

// ---- 驱动预测行：实体店 ----
export interface PhysicalDriverForecastRow {
    month: number;
    label: string;
    baseSales: number;
    baseTraffic: number;
    baseConversionRate: number;
    baseAvgTicket: number;
    forecastTraffic: number;
    forecastConversionRate: number;
    forecastAvgTicket: number;
    driverForecastSales: number;
    growthForecastSales: number;
    hybridForecastSales: number;
    investmentBreakevenGap: number;
}

// ---- 驱动预测行：电商 ----
export interface EcommerceDriverForecastRow {
    month: number;
    label: string;
    grossSales: number;
    refundAmount: number;
    netSales: number;
    avgTicket: number;
    customers: number;
    conversionRate: number;
    traffic: number;
    trafficCostPerVisitor: number;
    trafficCost: number;
    platformFee: number;
    paymentFee: number;
    customerServiceCost: number;
    totalVariableCost: number;
    costToNetSalesRate: number;
}

// ---- 新店验证结果 ----
export interface NewStoreValidationResult {
    angle1Monthly: number;
    angle2Monthly: number;
    angle3Monthly: number;
    recommendedMonthly: number;
    minMonthly: number;
    maxMonthly: number;
    divergenceWarning: boolean;
    breakevenRequiredMonthlyTraffic: number;
    breakevenRequiredDailyTraffic: number;
    cityTierTrafficRange: [number, number];
    cityTierEntryRateRange: [number, number];
    trafficRealityStatus: 'reasonable' | 'aggressive' | 'unrealistic';
}

interface TriangleResult {
    efficiencyAnnual: number;
    footTrafficAnnual: number;
    breakEvenAnnual: number;
    median: number;
    min: number;
    max: number;
    divergenceWarning: boolean;
}

interface ChannelScenario {
    label: string;
    growthRate: number;
}

interface ChannelConfig {
    label: string;
    baseMonthlyRevenue: number;
    avgTransactionValue: number;
    conversionRate: number;
    monthlyFootTraffic?: number;
    monthlyPageViews?: number;
    refundRate: number;
    scenarios: Record<string, ChannelScenario>;
    storeArea?: number;
    efficiencyPerSqm?: number;
    openingMonthFactor?: number;
    rampUpMonths?: number;
    breakEvenSalesMonthly?: number;
    triangle?: {
        efficiencyMethod: { label: string; salesPerSqmPerYear: number };
        footTrafficMethod: { label: string; monthlyFootTraffic: number; conversionRate: number; avgTransactionValue: number };
        breakEvenMethod: { label: string; monthlyFixedCost: number; grossMarginRate: number; variableCostRate: number };
    };
    divergenceThreshold?: number;
    history?: Record<string, number[]>;
    drivers?: Record<string, number>;
    city_tier_benchmarks?: Record<string, { daily_traffic_range: [number, number]; entry_rate_range: [number, number] }>;
}
interface ForecastAssumptions {
    channels: Record<string, ChannelConfig>;
    seasonalIndex: Record<string, number>;
}

export interface MonthlyForecast {
    month: number;
    label: string;
    baseRevenue: number;
    forecastRevenue: number;
    forecastUnits: number;
    forecastFootTraffic?: number;
    // v2.1 extensions
    history?: Record<string, number>;
    weightedBase?: number;
    growthRate?: number;
    yoyVsLastYear?: number;
    historicalMom?: number;
    breakEvenGap?: number;
}

export interface ForecastResult {
    channel: ForecastChannel;
    scenario: ForecastScenario;
    annualForecast: number;
    annualYoY: number;
    monthlyAvg: number;
    forecastPairs: number;
    breakEvenGap: number;
    monthly: MonthlyForecast[];
    triangle?: TriangleResult;
    isEstimated: boolean;
    // v2.1 extensions
    method: ForecastMethod;
    physicalDriverRows?: PhysicalDriverForecastRow[];
    ecommerceDriverRows?: EcommerceDriverForecastRow[];
    newStoreValidation?: NewStoreValidationResult;
    annualGrowthBasedForecast: number;
    annualDriverBasedForecast: number;
    annualHybridForecast: number;
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// ---- 辅助函数 ----
function resolveMonthlyGrowthRate(
    month0: number,
    forecast: GlobalConfig['forecast'],
): number {
    if (forecast.growthRateMode === 'monthly_custom') {
        return forecast.monthlyGrowthRates[month0] ?? forecast.uniformGrowthRate;
    }
    if (forecast.growthRateMode === 'seasonal') {
        const sr = forecast.seasonalRates;
        if ([2, 3, 4].includes(month0)) return sr.spring;
        if ([5, 6, 7].includes(month0)) return sr.summer;
        if ([8, 9, 10].includes(month0)) return sr.autumn;
        return sr.winter;
    }
    return forecast.uniformGrowthRate;
}

function resolveWeightedBase(
    history: Record<string, number[]> | undefined,
    monthIdx: number,
    baseMode: GlobalConfig['forecast']['baseMode'],
    customWeights: Record<string, number>,
): { weightedBase: number; historyMap: Record<string, number> } {
    if (!history) return { weightedBase: 0, historyMap: {} };
    const years = Object.keys(history).sort();
    const historyMap: Record<string, number> = {};
    years.forEach(y => { historyMap[y] = (history[y] ?? [])[monthIdx] ?? 0; });

    if (baseMode === 'last_year') {
        const lastYear = years[years.length - 1];
        return { weightedBase: historyMap[lastYear] ?? 0, historyMap };
    }
    if (baseMode === 'avg_2year' && years.length >= 2) {
        const last2 = years.slice(-2);
        const avg = last2.reduce((s, y) => s + (historyMap[y] ?? 0), 0) / 2;
        return { weightedBase: avg, historyMap };
    }
    if (baseMode === 'avg_3year' && years.length >= 3) {
        const last3 = years.slice(-3);
        const avg = last3.reduce((s, y) => s + (historyMap[y] ?? 0), 0) / 3;
        return { weightedBase: avg, historyMap };
    }
    let weighted = 0;
    let totalW = 0;
    years.forEach(y => {
        const w = customWeights[y] ?? 0;
        weighted += (historyMap[y] ?? 0) * w;
        totalW += w;
    });
    return { weightedBase: totalW > 0 ? weighted / totalW : 0, historyMap };
}

function median3(a: number, b: number, c: number): number {
    return [a, b, c].sort((x, y) => x - y)[1];
}

export function useForecast(channel: ForecastChannel, scenario: ForecastScenario): ForecastResult | null {
    const { data: assumptionsRemote } = useForecastAssumptions() as { data: ForecastAssumptions | undefined };
    const { data: forecastsRemote } = useSalesForecasts();
    const { config: globalConfig } = useGlobalConfig();
    const assumptions = assumptionsRemote ?? (forecastAssumptionsFallback as unknown as ForecastAssumptions);
    const forecasts = forecastsRemote ?? salesForecastsFallback;

    return useMemo(() => {
        if (!assumptions) return null;
        const rawConfig = assumptions.channels[channel];
        if (!rawConfig) return null;

        const chData = rawConfig;
        const scenarioConfig = chData.scenarios[scenario];
        if (!scenarioConfig) return null;

        const grossMarginRate = globalConfig.brand.grossMarginRate;
        const forecast = globalConfig.forecast;
        const method: ForecastMethod = forecast.method;
        const seasonalIndex = assumptions.seasonalIndex || {};
        const scenarioGrowthRate = scenarioConfig.growthRate;
        const history = chData.history;
        const baseDrivers = chData.drivers ?? {};

        // Ecommerce base drivers
        const ed = globalConfig.ecommerceDrivers;
        const ecRefundRate = ed.refundRate;
        const ecBaseAvgTicket = (baseDrivers['avg_ticket'] as number | undefined) ?? 130;
        const ecBaseConversion = (baseDrivers['conversion_rate'] as number | undefined) ?? 0.015;
        const ecTrafficCost = (baseDrivers['traffic_cost_per_visitor'] as number | undefined) ?? 0.25;

        // Physical base drivers
        const pd = globalConfig.physicalDrivers;
        const phBaseAvgTicket = (baseDrivers['avg_ticket'] as number | undefined) ?? (chData.avgTransactionValue ?? 437);
        const phBaseConversion = (baseDrivers['conversion_rate'] as number | undefined) ?? (chData.conversionRate ?? 0.01);

        const fallbackBase = chData.baseMonthlyRevenue ?? 1000000;
        const growthForecasts: number[] = [];
        const driverForecasts: number[] = [];
        const physDriverRows: PhysicalDriverForecastRow[] = [];
        const ecomDriverRows: EcommerceDriverForecastRow[] = [];
        const monthly: MonthlyForecast[] = [];

        // 从 sales_forecasts 找基准年总额（如果有匹配渠道）
        let baseAnnualFromFact = 0;
        if (Array.isArray(forecasts?.forecasts)) {
            const channelLabel = channel === 'physical' ? '实体店' : channel === 'ecommerce' ? '网店' : '新店';
            const matched = (forecasts.forecasts as Array<{ scenarioType: string; forecastSales: number }>)
                .filter(f => f.scenarioType === channelLabel);
            baseAnnualFromFact = matched.reduce((s, f) => s + f.forecastSales, 0);
        }

        for (let i = 0; i < 12; i++) {
            const siKey = String(i + 1);
            const si = seasonalIndex[siKey] ?? 1.0;

            const { weightedBase, historyMap } = resolveWeightedBase(history, i, forecast.baseMode, forecast.customWeights);
            const baseRevenue = weightedBase > 0 ? weightedBase
                : baseAnnualFromFact > 0 ? (baseAnnualFromFact / 12) * si
                : fallbackBase * si;

            const configuredGrowth = resolveMonthlyGrowthRate(i, forecast);
            const effectiveGrowth = scenario === 'base' ? configuredGrowth : scenarioGrowthRate;
            const growthForecastSales = baseRevenue * (1 + effectiveGrowth);
            growthForecasts.push(growthForecastSales);

            let driverForecastSales = growthForecastSales;

            if (channel === 'physical') {
                const baseTraffic = phBaseAvgTicket > 0 && phBaseConversion > 0
                    ? baseRevenue / (phBaseAvgTicket * phBaseConversion)
                    : (chData.monthlyFootTraffic ?? 8200);
                const forecastTraffic = baseTraffic * (1 + pd.trafficLift);
                const forecastConversionRate = phBaseConversion * (1 + pd.conversionRateLift);
                const forecastAvgTicket = phBaseAvgTicket * (1 + pd.avgTicketLift);
                driverForecastSales = forecastTraffic * forecastConversionRate * forecastAvgTicket;
                const hybridForecastSales = (growthForecastSales + driverForecastSales) / 2;
                const investmentRequiredSalesLift = grossMarginRate > 0 ? pd.investmentBudget / grossMarginRate / 12 : 0;
                const investmentBreakevenGap = driverForecastSales - (baseRevenue + investmentRequiredSalesLift);
                physDriverRows.push({
                    month: i + 1, label: MONTH_LABELS[i],
                    baseSales: baseRevenue, baseTraffic, baseConversionRate: phBaseConversion, baseAvgTicket: phBaseAvgTicket,
                    forecastTraffic, forecastConversionRate, forecastAvgTicket,
                    driverForecastSales, growthForecastSales, hybridForecastSales, investmentBreakevenGap,
                });
            }

            if (channel === 'ecommerce') {
                const grossSales = growthForecastSales;
                const refundAmount = grossSales * ecRefundRate;
                const netSales = grossSales - refundAmount;
                const avgTicket = ecBaseAvgTicket * (1 + ed.avgTicketLift);
                const customers = avgTicket > 0 ? grossSales / avgTicket : 0;
                const conversionRate = ecBaseConversion * (1 + ed.conversionRateLift);
                const traffic = conversionRate > 0 ? customers / conversionRate : 0;
                const trafficCostPerVisitor = ecTrafficCost * (1 + ed.trafficCostLift);
                const trafficCost = traffic * trafficCostPerVisitor;
                const platformFee = grossSales * ed.platformFeeRate;
                const paymentFee = grossSales * ed.paymentFeeRate;
                const customerServiceCost = grossSales * ed.customerServiceRate;
                const totalVariableCost = trafficCost + platformFee + paymentFee + customerServiceCost;
                const costToNetSalesRate = netSales > 0 ? totalVariableCost / netSales : 0;
                ecomDriverRows.push({
                    month: i + 1, label: MONTH_LABELS[i],
                    grossSales, refundAmount, netSales, avgTicket, customers,
                    conversionRate, traffic, trafficCostPerVisitor, trafficCost,
                    platformFee, paymentFee, customerServiceCost, totalVariableCost, costToNetSalesRate,
                });
                driverForecastSales = netSales;
            }

            if (channel === 'new_store') {
                const ns = globalConfig.newStoreDrivers;
                const angle1Monthly = ns.salesPerSqmAnnual * ns.targetAreaSqm / 12;
                const angle2Monthly = (
                    ns.weekdayTraffic * ns.entryRate * ns.conversionRate * 22
                    + ns.weekendTraffic * ns.entryRate * ns.conversionRate * 8
                ) * ns.avgTicket;
                const annualFixed = ns.annualRent + ns.annualStaff + ns.renovationAmortizedAnnual + ns.utilitiesAnnual + ns.otherAnnual;
                const angle3Monthly = grossMarginRate > 0 ? annualFixed / grossMarginRate / 12 : 0;
                driverForecastSales = median3(angle1Monthly, angle2Monthly, angle3Monthly);
            }

            driverForecasts.push(driverForecastSales);

            let forecastRevenue: number;
            if (method === 'driver_based') forecastRevenue = driverForecastSales;
            else if (method === 'hybrid') forecastRevenue = (growthForecastSales + driverForecastSales) / 2;
            else forecastRevenue = growthForecastSales;

            const avgTxValue = chData.avgTransactionValue ?? 520;
            const forecastUnits = avgTxValue > 0 ? Math.round(forecastRevenue / avgTxValue) : 0;
            const forecastFootTraffic = channel === 'physical' && physDriverRows[i]
                ? Math.round(physDriverRows[i].forecastTraffic)
                : undefined;

            const years = history ? Object.keys(history).sort() : [];
            const lastYear = years[years.length - 1];
            const lastYearVal = lastYear && history ? (history[lastYear][i] ?? 0) : baseRevenue;
            const yoyVsLastYear = lastYearVal > 0 ? (forecastRevenue - lastYearVal) / lastYearVal : 0;
            const breakEvenMonthlyVal = chData.breakEvenSalesMonthly ?? 0;

            monthly.push({
                month: i + 1, label: MONTH_LABELS[i],
                baseRevenue, forecastRevenue, forecastUnits, forecastFootTraffic,
                history: historyMap, weightedBase, growthRate: effectiveGrowth,
                yoyVsLastYear, breakEvenGap: forecastRevenue - breakEvenMonthlyVal,
            });
        }

        const annualGrowthBased = growthForecasts.reduce((s, v) => s + v, 0);
        const annualDriverBased = driverForecasts.reduce((s, v) => s + v, 0);
        const annualHybrid = (annualGrowthBased + annualDriverBased) / 2;
        const annualForecast = method === 'growth_based' ? annualGrowthBased
            : method === 'driver_based' ? annualDriverBased
            : annualHybrid;

        const annualBase = monthly.reduce((s, m) => s + m.baseRevenue, 0);
        const annualYoY = annualBase > 0 ? (annualForecast - annualBase) / annualBase : 0;
        const monthlyAvg = annualForecast / 12;
        const pairAvgTicket = chData.avgTransactionValue ?? (channel === 'new_store' ? globalConfig.newStoreDrivers.avgTicket : 0);
        const forecastPairs = pairAvgTicket > 0
            ? Math.round(annualForecast / pairAvgTicket)
            : 0;

        const breakEvenMonthly = chData.breakEvenSalesMonthly ?? 0;
        const breakEvenGap = monthlyAvg - breakEvenMonthly;

        // ---- New store validation (v2.1) ----
        let newStoreValidation: NewStoreValidationResult | undefined;
        if (channel === 'new_store') {
            const ns = globalConfig.newStoreDrivers;
            const angle1Monthly = ns.salesPerSqmAnnual * ns.targetAreaSqm / 12;
            const angle2Monthly = (
                ns.weekdayTraffic * ns.entryRate * ns.conversionRate * 22
                + ns.weekendTraffic * ns.entryRate * ns.conversionRate * 8
            ) * ns.avgTicket;
            const annualFixed = ns.annualRent + ns.annualStaff + ns.renovationAmortizedAnnual + ns.utilitiesAnnual + ns.otherAnnual;
            const angle3Monthly = grossMarginRate > 0 ? annualFixed / grossMarginRate / 12 : 0;
            const recommendedMonthly = median3(angle1Monthly, angle2Monthly, angle3Monthly);
            const minMonthly = Math.min(angle1Monthly, angle2Monthly, angle3Monthly);
            const maxMonthly = Math.max(angle1Monthly, angle2Monthly, angle3Monthly);
            const divergenceWarning = minMonthly > 0 ? (maxMonthly - minMonthly) / minMonthly > 0.3 : false;
            const breakevenRequiredMonthlyTraffic = ns.avgTicket > 0 && ns.conversionRate > 0 && ns.entryRate > 0
                ? angle3Monthly / ns.avgTicket / ns.conversionRate / ns.entryRate : 0;
            const breakevenRequiredDailyTraffic = breakevenRequiredMonthlyTraffic / 30;
            const benchmarks = chData.city_tier_benchmarks ?? {};
            const tierBench = benchmarks[ns.cityTier] ?? { daily_traffic_range: [0, 5000] as [number, number], entry_rate_range: [0.01, 0.05] as [number, number] };
            const [, benchMax] = tierBench.daily_traffic_range;
            const trafficRealityStatus: 'reasonable' | 'aggressive' | 'unrealistic' =
                breakevenRequiredDailyTraffic <= benchMax ? 'reasonable'
                : breakevenRequiredDailyTraffic <= benchMax * 1.5 ? 'aggressive'
                : 'unrealistic';
            newStoreValidation = {
                angle1Monthly, angle2Monthly, angle3Monthly,
                recommendedMonthly, minMonthly, maxMonthly, divergenceWarning,
                breakevenRequiredMonthlyTraffic, breakevenRequiredDailyTraffic,
                cityTierTrafficRange: tierBench.daily_traffic_range,
                cityTierEntryRateRange: tierBench.entry_rate_range,
                trafficRealityStatus,
            };
        }

        // Legacy triangle (backward compat)
        let triangle: TriangleResult | undefined;
        if (channel === 'new_store' && chData.triangle && chData.storeArea) {
            const t = chData.triangle;
            const area = chData.storeArea;
            const efficiencyAnnual = t.efficiencyMethod.salesPerSqmPerYear * area * (1 + scenarioGrowthRate);
            const footTrafficAnnual = t.footTrafficMethod.monthlyFootTraffic
                * t.footTrafficMethod.conversionRate * t.footTrafficMethod.avgTransactionValue
                * 12 * (1 + scenarioGrowthRate);
            const contributionRate = t.breakEvenMethod.grossMarginRate - t.breakEvenMethod.variableCostRate;
            const breakEvenAnnual = contributionRate > 0
                ? (t.breakEvenMethod.monthlyFixedCost / contributionRate) * 12 * (1 + scenarioGrowthRate) : 0;
            const vals = [efficiencyAnnual, footTrafficAnnual, breakEvenAnnual].sort((a, b) => a - b);
            triangle = { efficiencyAnnual, footTrafficAnnual, breakEvenAnnual, median: vals[1], min: vals[0], max: vals[2], divergenceWarning: vals[0] > 0 ? (vals[2] - vals[0]) / vals[0] > (chData.divergenceThreshold ?? 0.3) : false };
        }

        const isEstimated = !history || Object.keys(history).length === 0;

        return {
            channel, scenario,
            annualForecast, annualYoY, monthlyAvg, forecastPairs, breakEvenGap,
            monthly, triangle, isEstimated,
            method,
            physicalDriverRows: channel === 'physical' ? physDriverRows : undefined,
            ecommerceDriverRows: channel === 'ecommerce' ? ecomDriverRows : undefined,
            newStoreValidation,
            annualGrowthBasedForecast: annualGrowthBased,
            annualDriverBasedForecast: annualDriverBased,
            annualHybridForecast: annualHybrid,
        };
    }, [assumptions, forecasts, channel, scenario, globalConfig]);
}

export function saveLocalForecastOverride(channel: ForecastChannel, overrides: Record<string, number>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`forecast_override_${channel}`, JSON.stringify(overrides));
}
