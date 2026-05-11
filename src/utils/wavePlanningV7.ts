/**
 * wavePlanningV7.ts — 鞋类波段企划 V7 工具函数
 * 包含：尺码深度健康度 / 配色策略 / 退货率预估 / 温层检测 / 决策生成 / 同期对比
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface SizeCurveEntry {
    size: string;
    weight: number;
    tier: 'core' | 'extended' | 'edge';
}

export interface FootwearSizeCurve {
    type: string;
    label: string;
    sizes: SizeCurveEntry[];
    coreRange: string[];
    edgeRange: string[];
    corePctTarget: number;
    edgePctWarning: number;
}

export interface SizeDepthPlan {
    size: string;
    quantity: number;
}

export interface SizeDepthHealth {
    plans: (SizeCurveEntry & { planQuantity: number; planPct: number })[];
    totalQuantity: number;
    corePct: number;
    edgePct: number;
    corePctTarget: number;
    edgePctWarning: number;
    coreHealthy: boolean;
    edgeHealthy: boolean;
    overallHealthy: boolean;
    warnings: string[];
}

export interface ColorwayEntry {
    tier: 'basic' | 'hero' | 'limited';
    name: string;
    skuCount: number;
}

export interface ColorwayBalance {
    basicPct: number;
    heroPct: number;
    limitedPct: number;
    basicTarget: number;
    heroTargetMin: number;
    heroTargetMax: number;
    limitedMax: number;
    basicHealthy: boolean;
    heroHealthy: boolean;
    limitedHealthy: boolean;
    overallHealthy: boolean;
    warnings: string[];
}

export interface ChannelMix {
    channel: string;
    label: string;
    revenuePct: number;
}

export interface ReturnRateBenchmark {
    channel: string;
    label: string;
    returnRatePct: number;
}

export interface ReturnImpact {
    weightedReturnRate: number;
    estimatedReturnRevenueLoss: number;
    netRevenuePct: number;
    channelDetails: { channel: string; label: string; pct: number; returnRate: number; impact: number }[];
    highRisk: boolean;
    warnings: string[];
}

export interface TemperatureWindow {
    category: string;
    label: string;
    tempMin: number;
    tempMax: number;
    peakTempMin: number;
    peakTempMax: number;
    launchAdvanceWeeks: number;
    notes: string;
}

export interface TemperatureCheckResult {
    category: string;
    launchMonth: number;
    regionAvgTemp: number;
    windowMin: number;
    windowMax: number;
    inWindow: boolean;
    deviation: number; // positive = too hot, negative = too cold
    severity: 'ok' | 'warning' | 'danger';
    message: string;
}

export type DecisionActionType = 'reorder' | 'cut' | 'addColor' | 'syncDownstream';

export interface DecisionAction {
    type: DecisionActionType;
    label: string;
    urgency: 'P0' | 'P1' | 'P2';
    summary: string;
    impactSku?: number;
    impactAmount?: number;
    deadline?: string;
    recommendation: string;
}

export interface WaveDecisionActions {
    reorder: DecisionAction | null;
    cut: DecisionAction | null;
    addColor: DecisionAction | null;
    syncDownstream: DecisionAction;
}

export interface HistoricalWaveRef {
    waveKey: string;
    season: string;
    wave: string;
    launchDate: string;
    plannedStyleCount: number;
    actualStyleCount?: number;
    plannedSkuCount: number;
    actualSkuCount?: number;
    sellThroughRate?: number;
    orderExecutionRate?: number;
    arrivalRate?: number;
    planSalesAmount: number;
    actualSalesAmount?: number;
    notes?: string;
}

export interface YoyComparison {
    hasData: boolean;
    lyWaveKey: string;
    lySellThrough: number | null;
    lyOrderExecRate: number | null;
    lyArrivalRate: number | null;
    lySalesAmount: number | null;
    lyPlannedStyles: number;
    lySalesVsPlan: number | null;
    trend: 'up' | 'down' | 'flat' | 'unknown';
    notes: string;
}

// ── 1. Footwear Size Depth Health ─────────────────────────────────────────────

/**
 * 计算鞋类尺码深度健康度
 * @param curve 标准尺码曲线（从 footwear_size_curves.json 读取）
 * @param plans 实际规划尺码数量
 */
export function calcSizeDepthHealth(
    curve: FootwearSizeCurve,
    plans: SizeDepthPlan[],
): SizeDepthHealth {
    const planMap = new Map(plans.map(p => [p.size, p.quantity]));
    const totalQuantity = plans.reduce((s, p) => s + p.quantity, 0);
    const warnings: string[] = [];

    const enriched = curve.sizes.map(entry => {
        const planQuantity = planMap.get(entry.size) ?? Math.round(totalQuantity * entry.weight);
        const planPct = totalQuantity > 0 ? planQuantity / totalQuantity : entry.weight;
        return { ...entry, planQuantity, planPct };
    });

    const corePct = enriched.filter(e => e.tier === 'core').reduce((s, e) => s + e.planPct, 0);
    const edgePct = enriched.filter(e => e.tier === 'edge').reduce((s, e) => s + e.planPct, 0);

    const coreHealthy = corePct >= curve.corePctTarget * 0.90;
    const edgeHealthy = edgePct <= curve.edgePctWarning;

    if (!coreHealthy) warnings.push(`核心尺码占比 ${(corePct * 100).toFixed(1)}% 低于目标 ${(curve.corePctTarget * 100).toFixed(0)}%，可能中段断码`);
    if (!edgeHealthy) warnings.push(`边缘尺码占比 ${(edgePct * 100).toFixed(1)}% 超过警戒线 ${(curve.edgePctWarning * 100).toFixed(0)}%，高死库存风险`);

    return {
        plans: enriched,
        totalQuantity,
        corePct,
        edgePct,
        corePctTarget: curve.corePctTarget,
        edgePctWarning: curve.edgePctWarning,
        coreHealthy,
        edgeHealthy,
        overallHealthy: coreHealthy && edgeHealthy,
        warnings,
    };
}

// ── 2. Colorway Strategy Balance ──────────────────────────────────────────────

/**
 * 计算配色策略平衡度
 */
export function calcColorwayBalance(
    colorways: ColorwayEntry[],
    rules?: { basicColorPctMin?: number; heroColorPctMin?: number; heroColorPctMax?: number; limitedColorPctMax?: number },
): ColorwayBalance {
    const totalSku = colorways.reduce((s, c) => s + c.skuCount, 0);
    if (totalSku === 0) {
        return {
            basicPct: 0, heroPct: 0, limitedPct: 0,
            basicTarget: 0.40, heroTargetMin: 0.30, heroTargetMax: 0.50, limitedMax: 0.20,
            basicHealthy: true, heroHealthy: true, limitedHealthy: true, overallHealthy: true,
            warnings: [],
        };
    }

    const basicPct  = colorways.filter(c => c.tier === 'basic').reduce((s, c) => s + c.skuCount, 0) / totalSku;
    const heroPct   = colorways.filter(c => c.tier === 'hero').reduce((s, c) => s + c.skuCount, 0) / totalSku;
    const limitedPct = colorways.filter(c => c.tier === 'limited').reduce((s, c) => s + c.skuCount, 0) / totalSku;

    const basicTarget = rules?.basicColorPctMin ?? 0.40;
    const heroMin = rules?.heroColorPctMin ?? 0.30;
    const heroMax = rules?.heroColorPctMax ?? 0.50;
    const limitedMax = rules?.limitedColorPctMax ?? 0.20;

    const basicHealthy   = basicPct >= basicTarget;
    const heroHealthy    = heroPct >= heroMin && heroPct <= heroMax;
    const limitedHealthy = limitedPct <= limitedMax;

    const warnings: string[] = [];
    if (!basicHealthy)   warnings.push(`基础色占比 ${(basicPct * 100).toFixed(0)}% 偏低（建议 ≥${(basicTarget * 100).toFixed(0)}%），有断货风险`);
    if (!heroHealthy)    warnings.push(`主推色占比 ${(heroPct * 100).toFixed(0)}% 不在目标区间 ${(heroMin * 100).toFixed(0)}-${(heroMax * 100).toFixed(0)}%`);
    if (!limitedHealthy) warnings.push(`限量色占比 ${(limitedPct * 100).toFixed(0)}% 偏高（建议 ≤${(limitedMax * 100).toFixed(0)}%），滞销风险大`);

    return {
        basicPct, heroPct, limitedPct,
        basicTarget, heroTargetMin: heroMin, heroTargetMax: heroMax, limitedMax,
        basicHealthy, heroHealthy, limitedHealthy,
        overallHealthy: basicHealthy && heroHealthy && limitedHealthy,
        warnings,
    };
}

// ── 3. Return Rate Impact ─────────────────────────────────────────────────────

/**
 * 估算退货率影响
 * @param channelMix 渠道结构（各渠道收入占比）
 * @param benchmarks 退货率基准数据
 * @param planRevenue 计划销售额
 */
export function estimateReturnImpact(
    channelMix: ChannelMix[],
    benchmarks: ReturnRateBenchmark[],
    planRevenue: number,
): ReturnImpact {
    const benchmarkMap = new Map(benchmarks.map(b => [b.channel, b.returnRatePct]));
    const warnings: string[] = [];

    const channelDetails = channelMix.map(c => {
        const returnRate = benchmarkMap.get(c.channel) ?? 0.08;
        return { channel: c.channel, label: c.label, pct: c.revenuePct, returnRate, impact: c.revenuePct * returnRate };
    });

    const weightedReturnRate = channelDetails.reduce((s, c) => s + c.impact, 0);
    const estimatedReturnRevenueLoss = planRevenue * weightedReturnRate;
    const netRevenuePct = 1 - weightedReturnRate;
    const highRisk = weightedReturnRate > 0.18;

    if (highRisk) warnings.push(`加权退货率 ${(weightedReturnRate * 100).toFixed(1)}% 偏高，净销售额损失约 ¥${(estimatedReturnRevenueLoss / 10000).toFixed(0)}万`);

    return { weightedReturnRate, estimatedReturnRevenueLoss, netRevenuePct, channelDetails, highRisk, warnings };
}

// ── 4. Temperature Window Check ───────────────────────────────────────────────

const MONTH_TEMPS: Record<string, number[]> = {
    '华南': [14, 17, 21, 26, 28, 30, 31, 31, 29, 26, 21, 15],
    '华东': [6, 9, 13, 19, 24, 27, 30, 30, 26, 21, 14, 8],
    '华北': [-1, 2, 8, 16, 22, 27, 29, 28, 23, 16, 7, 0],
    '西南': [9, 12, 16, 21, 22, 24, 25, 25, 22, 19, 14, 9],
    '东北': [-13, -9, 0, 10, 18, 23, 25, 24, 17, 9, -1, -10],
    '西北': [-5, 0, 7, 15, 20, 25, 28, 27, 21, 13, 4, -3],
    '全国': [3, 6, 11, 18, 23, 27, 29, 28, 23, 17, 9, 4],
};

/**
 * 检测波段温层错位
 */
export function checkTemperatureWindow(
    launchMonth: number,
    region: string,
    windows: TemperatureWindow[],
    categories: string[],
): TemperatureCheckResult[] {
    const temps = MONTH_TEMPS[region] ?? MONTH_TEMPS['全国'];
    const avgTemp = temps[launchMonth - 1] ?? 15;
    const results: TemperatureCheckResult[] = [];

    for (const cat of categories) {
        const window = windows.find(w => w.category === cat);
        if (!window) continue;

        const inWindow = avgTemp >= window.tempMin && avgTemp <= window.tempMax;
        let deviation = 0;
        if (avgTemp < window.tempMin) deviation = avgTemp - window.tempMin;
        else if (avgTemp > window.tempMax) deviation = avgTemp - window.tempMax;

        const absDev = Math.abs(deviation);
        const severity: 'ok' | 'warning' | 'danger' = absDev > 5 ? 'danger' : absDev > 2 ? 'warning' : 'ok';

        let message = '';
        if (severity === 'ok') {
            message = `${cat} 上市气温 ${avgTemp}℃，在温层窗口 ${window.tempMin}-${window.tempMax}℃ 内，节奏匹配`;
        } else if (deviation < 0) {
            message = `${cat} 上市气温 ${avgTemp}℃ 偏低 ${absDev.toFixed(0)}℃，${severity === 'danger' ? '⚠ 上市过早，建议延后' : '注意气温波动'}`;
        } else {
            message = `${cat} 上市气温 ${avgTemp}℃ 偏高 ${absDev.toFixed(0)}℃，${severity === 'danger' ? '⚠ 上市过晚，滞销风险' : '注意散热款补仓'}`;
        }

        results.push({ category: cat, launchMonth, regionAvgTemp: avgTemp, windowMin: window.tempMin, windowMax: window.tempMax, inWindow, deviation, severity, message });
    }

    return results;
}

// ── 5. Decision Actions Generator ────────────────────────────────────────────

export interface WaveSnapshot {
    waveKey: string;
    waveLabel: string;
    launchDate: string;
    daysToLaunch: number;
    plannedStyleCount: number;
    targetSkuCount: number;
    newRatio: number;
    landingRate: number; // sku_actual / sku_plan
    otbBudget: number;
    planOtbBudget: number;
    orderDeadline?: string;
    waveRole?: string;
}

export function generateWaveDecisionActions(snap: WaveSnapshot): WaveDecisionActions {
    const daysToOrder = snap.orderDeadline
        ? Math.round((new Date(snap.orderDeadline).getTime() - Date.now()) / 86400000)
        : null;

    // Reorder suggestion
    let reorder: DecisionAction | null = null;
    if (snap.landingRate > 0 && snap.landingRate < 0.75 && snap.daysToLaunch > 0 && snap.daysToLaunch < 45) {
        reorder = {
            type: 'reorder',
            label: '追单建议',
            urgency: snap.landingRate < 0.60 ? 'P0' : 'P1',
            summary: `落地率仅 ${(snap.landingRate * 100).toFixed(0)}%，距上市 ${snap.daysToLaunch} 天`,
            impactSku: Math.round(snap.targetSkuCount * (0.80 - snap.landingRate)),
            recommendation: `建议在 ${daysToOrder !== null && daysToOrder > 0 ? `${daysToOrder}天内` : '本周内'}追加落地，重点补核心款深度`,
            deadline: snap.orderDeadline,
        };
    }

    // Cut suggestion
    let cut: DecisionAction | null = null;
    if (snap.plannedStyleCount > 80 && snap.daysToLaunch > 0 && snap.daysToLaunch < 90) {
        const excessStyles = Math.round(snap.plannedStyleCount * 0.15);
        cut = {
            type: 'cut',
            label: '砍款建议',
            urgency: 'P1',
            summary: `计划款数 ${snap.plannedStyleCount} 款偏多，建议精简`,
            impactSku: excessStyles,
            impactAmount: snap.planOtbBudget * 0.10,
            recommendation: `建议砍掉约 ${excessStyles} 款测试款/配色，集中深度到主推款`,
        };
    }

    // Add color suggestion
    let addColor: DecisionAction | null = null;
    if (snap.newRatio < 0.40 && snap.daysToLaunch > 30) {
        addColor = {
            type: 'addColor',
            label: '补色建议',
            urgency: 'P2',
            summary: `新品占比 ${(snap.newRatio * 100).toFixed(0)}% 偏低，核心款配色单一`,
            recommendation: '建议对销售前 20% 的核心款追加 1-2 个配色，提升视觉吸引力',
        };
    }

    // Sync downstream
    const syncDownstream: DecisionAction = {
        type: 'syncDownstream',
        label: '下游同步',
        urgency: snap.otbBudget === 0 ? 'P1' : 'P2',
        summary: snap.otbBudget === 0 ? 'OTB 预算尚未推送' : 'OTB 已同步',
        recommendation: snap.otbBudget === 0 ? '前往 OTB 工作台生成并推送本波段采购预算' : '本波段已推送至 OTB，检查采购/现金流同步状态',
    };

    return { reorder, cut, addColor, syncDownstream };
}

// ── 6. YoY Wave Comparison ────────────────────────────────────────────────────

/**
 * 同期波段对比
 */
export function compareWithLastYearWave(
    currentWaveKey: string,
    historicalWaves: HistoricalWaveRef[],
): YoyComparison {
    // Try to find matching last-year wave (replace year part)
    const parts = currentWaveKey.split('-'); // e.g. 2026-SS-3A
    if (parts.length < 3) return { hasData: false, lyWaveKey: '', lySellThrough: null, lyOrderExecRate: null, lyArrivalRate: null, lySalesAmount: null, lyPlannedStyles: 0, lySalesVsPlan: null, trend: 'unknown', notes: '无法解析波段标识' };

    const year = parseInt(parts[0], 10);
    const lyWaveKey = `${year - 1}-${parts.slice(1).join('-')}`;
    const ly = historicalWaves.find(h => h.waveKey === lyWaveKey);

    if (!ly) return { hasData: false, lyWaveKey, lySellThrough: null, lyOrderExecRate: null, lyArrivalRate: null, lySalesAmount: null, lyPlannedStyles: 0, lySalesVsPlan: null, trend: 'unknown', notes: '去年同期无记录' };

    const lySalesVsPlan = ly.planSalesAmount > 0 && ly.actualSalesAmount !== undefined
        ? ly.actualSalesAmount / ly.planSalesAmount
        : null;

    const trend = lySalesVsPlan === null ? 'unknown'
        : lySalesVsPlan >= 1.05 ? 'up'
        : lySalesVsPlan <= 0.90 ? 'down'
        : 'flat';

    return {
        hasData: true,
        lyWaveKey,
        lySellThrough: ly.sellThroughRate ?? null,
        lyOrderExecRate: ly.orderExecutionRate ?? null,
        lyArrivalRate: ly.arrivalRate ?? null,
        lySalesAmount: ly.actualSalesAmount ?? null,
        lyPlannedStyles: ly.plannedStyleCount,
        lySalesVsPlan,
        trend,
        notes: ly.notes ?? '',
    };
}

// ── 7. Footwear-specific risk rules ──────────────────────────────────────────

export interface FootwearRisk {
    id: string;
    priority: 'P0' | 'P1' | 'P2';
    category: 'size' | 'colorway' | 'return' | 'temperature';
    title: string;
    detail: string;
    action: string;
}

export function generateFootwearRisks(
    sizeHealth?: SizeDepthHealth,
    colorwayBalance?: ColorwayBalance,
    returnImpact?: ReturnImpact,
    tempChecks?: TemperatureCheckResult[],
    ecomRevenuePct?: number,
): FootwearRisk[] {
    const risks: FootwearRisk[] = [];

    if (sizeHealth && !sizeHealth.edgeHealthy) {
        risks.push({
            id: 'size-edge-overweight',
            priority: 'P1',
            category: 'size',
            title: '边缘尺码超量',
            detail: `边缘尺码（偏小/偏大码）占比 ${(sizeHealth.edgePct * 100).toFixed(0)}%，超过警戒线 ${(sizeHealth.edgePctWarning * 100).toFixed(0)}%`,
            action: '重新分配尺码比例，将边缘尺码备货量调整为标准曲线的 80%',
        });
    }
    if (sizeHealth && !sizeHealth.coreHealthy) {
        risks.push({
            id: 'size-core-shortage',
            priority: 'P0',
            category: 'size',
            title: '核心尺码可能断货',
            detail: `核心尺码占比 ${(sizeHealth.corePct * 100).toFixed(0)}% 低于目标 ${(sizeHealth.corePctTarget * 100).toFixed(0)}%`,
            action: '立即追加核心尺码备货，防止上市首周断码',
        });
    }

    if (colorwayBalance && !colorwayBalance.overallHealthy) {
        const worst = !colorwayBalance.basicHealthy ? `基础色占比偏低 (${(colorwayBalance.basicPct * 100).toFixed(0)}%)`
            : !colorwayBalance.heroHealthy ? `主推色占比异常 (${(colorwayBalance.heroPct * 100).toFixed(0)}%)`
            : `限量色占比偏高 (${(colorwayBalance.limitedPct * 100).toFixed(0)}%)`;
        risks.push({
            id: 'colorway-imbalance',
            priority: 'P2',
            category: 'colorway',
            title: '配色策略失衡',
            detail: worst,
            action: '审查配色组合，将基础色保持在 40% 以上，限量色控制在 20% 以下',
        });
    }

    if (returnImpact?.highRisk) {
        risks.push({
            id: 'return-rate-high',
            priority: 'P1',
            category: 'return',
            title: '退货率超阈值',
            detail: `加权退货率 ${(returnImpact.weightedReturnRate * 100).toFixed(1)}%，电商占比较高`,
            action: '核实尺码测量标准，完善详情页尺码说明，评估净销售额对 OTB 的影响',
        });
    } else if (ecomRevenuePct !== undefined && ecomRevenuePct > 0.60 && !returnImpact) {
        risks.push({
            id: 'return-rate-not-estimated',
            priority: 'P1',
            category: 'return',
            title: '退货率未做预估',
            detail: `电商渠道占比 ${(ecomRevenuePct * 100).toFixed(0)}%，鞋类电商退货率基准为 15-25%，尚未录入预估`,
            action: '在 SKU 结构模块补充退货率预估，更新 OTB 净销售额测算',
        });
    }

    if (tempChecks) {
        for (const tc of tempChecks) {
            if (tc.severity === 'danger') {
                risks.push({
                    id: `temp-${tc.category}`,
                    priority: 'P0',
                    category: 'temperature',
                    title: `温层错位 — ${tc.category}`,
                    detail: tc.message,
                    action: `重新评估 ${tc.category} 上市时间，或聚焦温度匹配的地区渠道优先铺货`,
                });
            } else if (tc.severity === 'warning') {
                risks.push({
                    id: `temp-${tc.category}-warn`,
                    priority: 'P2',
                    category: 'temperature',
                    title: `温层偏差 — ${tc.category}`,
                    detail: tc.message,
                    action: '关注上市后首两周销售数据，必要时调整铺货节奏',
                });
            }
        }
    }

    return risks;
}
