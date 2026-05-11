/**
 * src/utils/salesForecastV8.ts
 * 销售预测 V8 工具函数库 — 鞋类专属计算
 */

// ── 类型定义 ──────────────────────────────────────────────────────────────────
export interface AccuracyHistoryEntry {
    period: string;
    predicted: number;
    actual: number;
    accuracy: number;
    deviation: number;
}

export interface DeviationItem {
    dimension: string;
    deviation: number;
    direction: string;
    reason: string;
    suggestion: string;
}

export interface ForecastAccuracySummary {
    overallAccuracy: number;
    trend: 'improving' | 'stable' | 'declining';
    topDeviations: DeviationItem[];
    healthStatus: 'good' | 'warning' | 'critical';
    quarters: AccuracyHistoryEntry[];
}

export interface WhatIfParams {
    trafficGrowth?: number;       // 客流增长率 delta
    conversionRate?: number;      // 转化率绝对值
    avgTicket?: number;           // 客单价绝对值
    pairsPerOrder?: number;       // 连带率绝对值
    refundRate?: number;          // 退款率绝对值
    roas?: number;                // ROAS
    temperatureDelta?: number;    // 气温偏差（℃）
}

export interface ScenarioProbability {
    conservative: number;
    base: number;
    optimistic: number;
}

export interface WeightedExpectedResult {
    expectedValue: number;
    weightedYoY: number;
    probabilities: ScenarioProbability;
}

export interface RampRiskFactors {
    sizeCoverageRate: number;      // 首铺尺码完整率 0-1
    waveMatchDays: number;         // 开店时间 vs 主销波段偏差天数
    newStyleRatio: number;         // 首铺新品占比 0-1
}

// ── 1. 预测准确率计算 ─────────────────────────────────────────────────────────
export function calcForecastAccuracy(
    quarters: AccuracyHistoryEntry[],
    topDeviations: DeviationItem[],
    benchmarks: { good: number; warning: number; critical: number },
): ForecastAccuracySummary {
    const overallAccuracy = quarters.reduce((s, q) => s + q.accuracy, 0) / Math.max(quarters.length, 1);
    const last2 = quarters.slice(-2);
    const trend: 'improving' | 'stable' | 'declining' =
        last2.length < 2 ? 'stable' :
        last2[1].accuracy > last2[0].accuracy + 0.01 ? 'improving' :
        last2[1].accuracy < last2[0].accuracy - 0.01 ? 'declining' : 'stable';

    const healthStatus: 'good' | 'warning' | 'critical' =
        overallAccuracy >= benchmarks.good ? 'good' :
        overallAccuracy >= benchmarks.warning ? 'warning' : 'critical';

    return { overallAccuracy, trend, topDeviations, healthStatus, quarters };
}

// ── 2. 鞋类季节系数 ───────────────────────────────────────────────────────────
export function calcSeasonalIndex(
    monthIndex: number,    // 0-based
    channel: 'physical' | 'ecommerce' | 'new_store',
    seasonalData: Record<string, number[]>,
): number {
    const arr = seasonalData[channel];
    if (!arr) return 1.0;
    return arr[monthIndex] ?? 1.0;
}

export function detectSeasonalAnomaly(
    forecastRevenue: number,
    baseRevenue: number,
    seasonalIndex: number,
    threshold = 0.15,
): boolean {
    if (baseRevenue <= 0) return false;
    const impliedIndex = forecastRevenue / baseRevenue;
    return Math.abs(impliedIndex - seasonalIndex) / seasonalIndex > threshold;
}

// ── 3. What-if 情景沙盒 ───────────────────────────────────────────────────────
export function applyWhatIfScenario(
    baseMonthlyRevenue: number,
    baseParams: { traffic: number; conversion: number; avgTicket: number; pairsPerOrder: number },
    overrides: WhatIfParams,
): number {
    const traffic = baseParams.traffic * (1 + (overrides.trafficGrowth ?? 0));
    const conversion = overrides.conversionRate ?? baseParams.conversion;
    const avgTicket = overrides.avgTicket ?? baseParams.avgTicket;
    const pairs = overrides.pairsPerOrder ?? baseParams.pairsPerOrder;
    // implied revenue from driver model
    const impliedRevenue = traffic * conversion * avgTicket * pairs;
    // blend with base (50/50) if only partial overrides
    const hasFullOverride = overrides.conversionRate !== undefined && overrides.avgTicket !== undefined;
    return hasFullOverride ? impliedRevenue : (impliedRevenue + baseMonthlyRevenue) / 2;
}

// ── 4. 气温敏感度回归 ─────────────────────────────────────────────────────────
export interface TempSensitivityResult {
    correlation: number;
    salesImpact: number;          // 相对于正常年份的销售变化率
    affectedCategoryImpacts: { category: string; impact: number }[];
}

export function calcTemperatureSensitivity(
    tempDelta: number,            // 与历史同期均值的偏差（℃）
    correlations: Array<{ categoryId: string; categoryLabel: string; sensitivityPerDegree: number; correlationWithTemp: number }>,
): TempSensitivityResult {
    const impacts = correlations.map(c => ({
        category: c.categoryLabel,
        impact: c.sensitivityPerDegree * tempDelta,
    }));
    const avgCorrelation = correlations.reduce((s, c) => s + Math.abs(c.correlationWithTemp), 0) / Math.max(correlations.length, 1);
    const totalImpact = impacts.reduce((s, i) => s + i.impact, 0) / Math.max(impacts.length, 1);
    return { correlation: avgCorrelation, salesImpact: totalImpact, affectedCategoryImpacts: impacts };
}

// ── 5. 渠道客流转移估算 ───────────────────────────────────────────────────────
export interface ChannelTransferResult {
    physToOnlineMonthly: number;
    onlineToPhysMonthly: number;
    netOnlineGain: number;
    priceArbitrageRiskLevel: 'low' | 'medium' | 'high';
}

export function calcChannelTransfer(
    physicalStoreCount: number,
    avgMonthlyTrafficPerStore: number,
    physToOnlineRate: number,
    onlineToPhysRate: number,
    onlineMonthlyOrders: number,
    priceGap: number,
): ChannelTransferResult {
    const physToOnlineMonthly = Math.round(physicalStoreCount * avgMonthlyTrafficPerStore * physToOnlineRate);
    const onlineToPhysMonthly = Math.round(onlineMonthlyOrders * onlineToPhysRate);
    const netOnlineGain = physToOnlineMonthly - onlineToPhysMonthly;
    const priceArbitrageRiskLevel: 'low' | 'medium' | 'high' = priceGap > 0.12 ? 'high' : priceGap > 0.06 ? 'medium' : 'low';
    return { physToOnlineMonthly, onlineToPhysMonthly, netOnlineGain, priceArbitrageRiskLevel };
}

// ── 6. 市场份额预测 ───────────────────────────────────────────────────────────
export interface MarketShareResult {
    myForecast: number;
    industryTotal: number;
    myShareRate: number;
    vsLastYearShare: number;     // 份额变化
    opportunityGap: number;      // 追赶目标的差口（元）
}

export function calcMarketShareForecast(
    myForecast: number,
    industryTotal: number,
    lastYearShare: number,
): MarketShareResult {
    const myShareRate = myForecast / Math.max(industryTotal, 1);
    const vsLastYearShare = myShareRate - lastYearShare;
    const targetShare = lastYearShare * 1.1; // 目标：份额提升10%
    const opportunityGap = (targetShare - myShareRate) * industryTotal;
    return { myForecast, industryTotal, myShareRate, vsLastYearShare, opportunityGap };
}

// ── 7. 情景概率加权期望值 ─────────────────────────────────────────────────────
export function calcWeightedExpectedValue(
    scenarios: { conservative: number; base: number; optimistic: number },
    probabilities: ScenarioProbability,
): WeightedExpectedResult {
    const totalProb = probabilities.conservative + probabilities.base + probabilities.optimistic;
    const norm = {
        conservative: probabilities.conservative / totalProb,
        base: probabilities.base / totalProb,
        optimistic: probabilities.optimistic / totalProb,
    };
    const expectedValue =
        scenarios.conservative * norm.conservative +
        scenarios.base * norm.base +
        scenarios.optimistic * norm.optimistic;
    // YoY: assume base is 0% reference, conservative = base*0.92, optimistic = base*1.12
    const weightedYoY = (expectedValue - scenarios.base) / Math.max(scenarios.base, 1);
    return { expectedValue, weightedYoY, probabilities: norm };
}

// ── 8. 鞋类爬坡风险调整 ───────────────────────────────────────────────────────
export interface RampAdjustmentResult {
    adjustedCurve: number[];        // 调整后月度系数
    theoreticalCurve: number[];     // 理论系数
    lossRate: number;               // 综合损失率
    riskItems: { factor: string; loss: number; severity: 'low' | 'medium' | 'high' }[];
}

export function calcRampWithFootwearFactors(
    baseCurve: number[],
    factors: RampRiskFactors,
): RampAdjustmentResult {
    const riskItems: { factor: string; loss: number; severity: 'low' | 'medium' | 'high' }[] = [];

    // 尺码完整率风险
    const sizeLoss = factors.sizeCoverageRate < 0.95
        ? Math.max(0, (0.95 - factors.sizeCoverageRate) * 2.5)  // 每1%缺口损失2.5%
        : 0;
    if (sizeLoss > 0) {
        riskItems.push({
            factor: `首铺尺码完整率 ${(factors.sizeCoverageRate * 100).toFixed(0)}%（目标95%）`,
            loss: sizeLoss,
            severity: sizeLoss > 0.15 ? 'high' : sizeLoss > 0.08 ? 'medium' : 'low',
        });
    }

    // 波段错过风险
    const waveLoss = factors.waveMatchDays > 30
        ? Math.min(0.20, (factors.waveMatchDays - 30) * 0.005)  // 超过30天开始损失
        : 0;
    if (waveLoss > 0) {
        riskItems.push({
            factor: `错过主销波段 ${factors.waveMatchDays} 天`,
            loss: waveLoss,
            severity: waveLoss > 0.12 ? 'high' : waveLoss > 0.06 ? 'medium' : 'low',
        });
    }

    // 新旧品配比风险
    const newRatioLoss = factors.newStyleRatio < 0.40
        ? (0.40 - factors.newStyleRatio) * 0.8  // 新品<40% → 爬坡放缓
        : 0;
    if (newRatioLoss > 0) {
        riskItems.push({
            factor: `新品占比 ${(factors.newStyleRatio * 100).toFixed(0)}%（建议≥40%）`,
            loss: newRatioLoss,
            severity: newRatioLoss > 0.10 ? 'high' : newRatioLoss > 0.05 ? 'medium' : 'low',
        });
    }

    const totalLoss = Math.min(0.40, sizeLoss + waveLoss + newRatioLoss);
    const adjustFactor = 1 - totalLoss;

    const adjustedCurve = baseCurve.map((v, i) => {
        // 损失集中在前6个月
        const monthlyFactor = i < 6 ? adjustFactor : Math.min(1, adjustFactor + (1 - adjustFactor) * ((i - 6) / 6));
        return Math.round(v * monthlyFactor * 100) / 100;
    });

    return {
        adjustedCurve,
        theoreticalCurve: baseCurve,
        lossRate: totalLoss,
        riskItems,
    };
}
