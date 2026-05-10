/**
 * src/utils/otbCalculations.ts
 * OTB 计算工具函数 — 所有金额以"元"为基础单位
 * 边界保护：杜绝 NaN / Infinity / 科学计数法
 */

// ── 安全数值 ─────────────────────────────────────────────────────────────────

export function safeNumber(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (!isFinite(n) || isNaN(n)) return null;
    return n;
}

export function safeDiv(a: number, b: number): number | null {
    const sa = safeNumber(a);
    const sb = safeNumber(b);
    if (sa === null || sb === null || sb === 0) return null;
    const r = sa / sb;
    return isFinite(r) ? r : null;
}

// ── 格式化函数 ────────────────────────────────────────────────────────────────

export type CurrencyUnit = 'yuan' | 'wan' | 'yi';

/**
 * 格式化货币金额，默认"万元"，防止科学计数法
 * @param value  原始值（元）
 * @param unit   yuan=元, wan=万元（默认）, yi=亿元
 */
export function formatCurrency(value: number | null | undefined, unit: CurrencyUnit = 'wan'): string {
    const n = safeNumber(value);
    if (n === null) return '--';
    const neg = n < 0;
    const abs = Math.abs(n);
    const prefix = neg ? '-¥' : '¥';
    switch (unit) {
        case 'yuan':
            return `${prefix}${Math.round(abs).toLocaleString('en-US')}`;
        case 'wan': {
            const wan = abs / 10000;
            if (wan >= 10000) return `${prefix}${(abs / 100000000).toFixed(2)}亿`;
            return `${prefix}${wan.toFixed(1)}万`;
        }
        case 'yi':
            return `${prefix}${(abs / 100000000).toFixed(2)}亿`;
    }
}

/** 格式化百分比，输入 0-1 小数 */
export function formatPct(v: number | null | undefined, decimals = 1): string {
    const n = safeNumber(v);
    if (n === null) return '--';
    return `${(n * 100).toFixed(decimals)}%`;
}

/** 格式化数量（件/双/款） */
export function formatQty(v: number | null | undefined, decimals = 0): string {
    const n = safeNumber(v);
    if (n === null) return '--';
    return n.toLocaleString('en-US', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
    });
}

// ── 年度 OTB ──────────────────────────────────────────────────────────────────
// 计算层级：年度 → SS/AW（大季）→ 四季（春夏秋冬）→ 波段（见 WaveOTBPlanningPanel）

export interface AnnualOTBInputs {
    annualSalesTarget: number;
    approvedBudget: number;
    carryoverRatio: number;
    springSalesRatio: number;
    summerSalesRatio: number;
    autumnSalesRatio: number;
    winterSalesRatio: number;
    springNewProductRatio: number;
    summerNewProductRatio: number;
    autumnNewProductRatio: number;
    winterNewProductRatio: number;
    springSellThroughTarget: number;
    summerSellThroughTarget: number;
    autumnSellThroughTarget: number;
    winterSellThroughTarget: number;
    maxCarryoverRatio?: number;
    defaultStockToSalesRatio?: number;
    defaultArrivalRate?: number;
}

export interface AnnualOTBResult {
    springTarget: number;
    summerTarget: number;
    autumnTarget: number;
    winterTarget: number;
    springNPSales: number;
    summerNPSales: number;
    autumnNPSales: number;
    winterNPSales: number;
    // 期初结转货值（= 季节销售目标 × 结转占比）
    springCarryover: number;
    summerCarryover: number;
    autumnCarryover: number;
    winterCarryover: number;
    // 采购 OTB = 销售目标 / 售罄率 − 期初结转
    springOTB: number | null;
    summerOTB: number | null;
    autumnOTB: number | null;
    winterOTB: number | null;
    ssSalesTarget: number;
    awSalesTarget: number;
    ssInvestmentBudget: number | null;
    awInvestmentBudget: number | null;
    annualNewProductInvestmentBudget: number | null;
    budgetGap: number | null;
    ssSeasonSalesTarget: number;
    awSeasonSalesTarget: number;
}

export function calcAnnualOTB(inputs: AnnualOTBInputs): AnnualOTBResult {
    const annual = safeNumber(inputs.annualSalesTarget) ?? 0;
    const carryover = safeNumber(inputs.carryoverRatio) ?? 0;

    const springTarget = annual * (safeNumber(inputs.springSalesRatio) ?? 0);
    const summerTarget = annual * (safeNumber(inputs.summerSalesRatio) ?? 0);
    const autumnTarget = annual * (safeNumber(inputs.autumnSalesRatio) ?? 0);
    const winterTarget = annual * (safeNumber(inputs.winterSalesRatio) ?? 0);

    const springNPSales = springTarget * (safeNumber(inputs.springNewProductRatio) ?? 0);
    const summerNPSales = summerTarget * (safeNumber(inputs.summerNewProductRatio) ?? 0);
    const autumnNPSales = autumnTarget * (safeNumber(inputs.autumnNewProductRatio) ?? 0);
    const winterNPSales = winterTarget * (safeNumber(inputs.winterNewProductRatio) ?? 0);

    // 期初结转货值：每季按统一结转占比估算（后续可细化为分季结转）
    const springCarryover = springTarget * carryover;
    const summerCarryover = summerTarget * carryover;
    const autumnCarryover = autumnTarget * carryover;
    const winterCarryover = winterTarget * carryover;

    const springST = safeNumber(inputs.springSellThroughTarget);
    const summerST = safeNumber(inputs.summerSellThroughTarget);
    const autumnST = safeNumber(inputs.autumnSellThroughTarget);
    const winterST = safeNumber(inputs.winterSellThroughTarget);

    // OTB = 季节销售目标 / 售罄率 − 期初结转（不买已有的货）
    // 年度总控是新品采购预算闸口，净 OTB 必须受新品占比影响。
    const springOTB  = springST  && springST  > 0 ? springNPSales  / springST  - springCarryover  : null;
    const summerOTB  = summerST  && summerST  > 0 ? summerNPSales  / summerST  - summerCarryover  : null;
    const autumnOTB  = autumnST  && autumnST  > 0 ? autumnNPSales  / autumnST  - autumnCarryover  : null;
    const winterOTB  = winterST  && winterST  > 0 ? winterNPSales  / winterST  - winterCarryover  : null;

    const ssSalesTarget = springTarget + summerTarget;
    const awSalesTarget = autumnTarget + winterTarget;
    const ssInv = springOTB !== null && summerOTB !== null ? springOTB + summerOTB : null;
    const awInv = autumnOTB !== null && winterOTB !== null ? autumnOTB + winterOTB : null;
    const annualInv = ssInv !== null && awInv !== null ? ssInv + awInv : null;
    const approved = safeNumber(inputs.approvedBudget) ?? 0;
    const gap = annualInv !== null ? annualInv - approved : null;

    return {
        springTarget, summerTarget, autumnTarget, winterTarget,
        springNPSales, summerNPSales, autumnNPSales, winterNPSales,
        springCarryover, summerCarryover, autumnCarryover, winterCarryover,
        springOTB, summerOTB, autumnOTB, winterOTB,
        ssSalesTarget, awSalesTarget,
        ssInvestmentBudget: ssInv,
        awInvestmentBudget: awInv,
        annualNewProductInvestmentBudget: annualInv,
        budgetGap: gap,
        ssSeasonSalesTarget: ssSalesTarget,
        awSeasonSalesTarget: awSalesTarget,
    };
}

// ── Annual OTB helper functions ───────────────────────────────────────────────

/** 加权平均售罄目标 = Σ (季节销售占比 × 季节售罄目标) */
export function calcWeightedSellThroughTarget(inputs: AnnualOTBInputs): number {
    return (
        (safeNumber(inputs.springSalesRatio) ?? 0) * (safeNumber(inputs.springSellThroughTarget) ?? 0) +
        (safeNumber(inputs.summerSalesRatio) ?? 0) * (safeNumber(inputs.summerSellThroughTarget) ?? 0) +
        (safeNumber(inputs.autumnSalesRatio) ?? 0) * (safeNumber(inputs.autumnSellThroughTarget) ?? 0) +
        (safeNumber(inputs.winterSalesRatio) ?? 0) * (safeNumber(inputs.winterSellThroughTarget) ?? 0)
    );
}

/** 季节平衡度 — 春夏 OTB / 年度净OTB */
export function calcSeasonBalance(result: AnnualOTBResult): { ssShare: number; balance: 'ok' | 'warn' | 'danger' } {
    const total = result.annualNewProductInvestmentBudget ?? 0;
    const ss = (result.ssInvestmentBudget ?? 0);
    const ssShare = total > 0 ? ss / total : 0.5;
    const balance: 'ok' | 'warn' | 'danger' =
        ssShare >= 0.40 && ssShare <= 0.60 ? 'ok'
        : ssShare >= 0.35 && ssShare <= 0.65 ? 'warn'
        : 'danger';
    return { ssShare, balance };
}

/** 单季最大 OTB 占年度净OTB 比例 */
export function calcMaxSeasonShare(result: AnnualOTBResult): { share: number; key: 'spring' | 'summer' | 'autumn' | 'winter' } {
    const total = result.annualNewProductInvestmentBudget ?? 0;
    const entries: Array<[number, 'spring' | 'summer' | 'autumn' | 'winter']> = [
        [result.springOTB ?? 0, 'spring'],
        [result.summerOTB ?? 0, 'summer'],
        [result.autumnOTB ?? 0, 'autumn'],
        [result.winterOTB ?? 0, 'winter'],
    ];
    const max = entries.reduce((a, b) => (a[0] >= b[0] ? a : b));
    return { share: total > 0 ? max[0] / total : 0, key: max[1] };
}

/** 敏感度模拟 — 不修改实际目标，仅返回调整后净OTB和预算缺口 */
export function calcSensitivityImpact(
    inputs: AnnualOTBInputs,
    deltas: { sellThrough?: number; carryover?: number; salesTarget?: number },
): { netOtb: number; budgetGap: number } {
    const adjustedInputs: AnnualOTBInputs = {
        ...inputs,
        annualSalesTarget: inputs.annualSalesTarget * (1 + (deltas.salesTarget ?? 0)),
        carryoverRatio: Math.max(0, Math.min(0.99, inputs.carryoverRatio + (deltas.carryover ?? 0))),
        springSellThroughTarget: Math.max(0.01, Math.min(0.99, inputs.springSellThroughTarget + (deltas.sellThrough ?? 0))),
        summerSellThroughTarget: Math.max(0.01, Math.min(0.99, inputs.summerSellThroughTarget + (deltas.sellThrough ?? 0))),
        autumnSellThroughTarget: Math.max(0.01, Math.min(0.99, inputs.autumnSellThroughTarget + (deltas.sellThrough ?? 0))),
        winterSellThroughTarget: Math.max(0.01, Math.min(0.99, inputs.winterSellThroughTarget + (deltas.sellThrough ?? 0))),
    };
    const adj = calcAnnualOTB(adjustedInputs);
    const netOtb = adj.annualNewProductInvestmentBudget ?? 0;
    const budgetGap = netOtb - (safeNumber(inputs.approvedBudget) ?? 0);
    return { netOtb, budgetGap };
}

// ── 月度 OTB ──────────────────────────────────────────────────────────────────

export interface MonthlyOTBInput {
    month: number;
    salesForecast: number;
    markupRate: number;
    discountRate: number;
    stockToSalesRatio: number;
    arrivalRate: number;
    originalPurchaseBudget: number;
}

export interface MonthlyOTBRow extends MonthlyOTBInput {
    beginningInventoryCost: number;
    retailSalesAmount: number;
    salesCost: number;
    endingInventoryCost: number;
    purchaseRequiredAmount: number;
    actualPurchaseRequiredAmount: number;
    budgetDiff: number;
    budgetDiffRate: number | null;
}

// ── 月度滚动状态 ──────────────────────────────────────────────────────────────

/**
 * 月度滚动所需状态。
 * 当前阶段实现预算重分配，actualPurchaseAmount / actualArrivalAmount / actualEndingInventory
 * 保留真实滚动语义，供后续扩展在途/库存测算使用。
 */
export interface MonthlyRollingState {
    lockedMonths: number[];                         // 已锁定的月份索引（0-based）
    actualSales: Record<number, number>;            // 实际销售额（元）
    actualPurchaseAmount: Record<number, number>;   // 实际下单金额（元）
    actualArrivalAmount: Record<number, number>;    // 实际到货金额（元）
    actualEndingInventory: Record<number, number>;  // 实际期末库存（元）
}

/**
 * 重分配剩余采购预算到未锁定月份。
 * @param annualPurchaseBudget 年度总采购预算（元）——不能传年度销售目标
 */
export function calcRollingOTBRebalance(
    inputs: MonthlyOTBInput[],
    state: MonthlyRollingState,
    annualPurchaseBudget: number,
): MonthlyOTBInput[] {
    const { lockedMonths, actualSales, actualPurchaseAmount } = state;

    // 已锁定月份实际消耗的采购额（有实际值用实际值，否则用原计划）
    const lockedSpent = lockedMonths.reduce(
        (sum, idx) => sum + (actualPurchaseAmount[idx] ?? inputs[idx]?.originalPurchaseBudget ?? 0),
        0,
    );
    const remainingBudget = annualPurchaseBudget - lockedSpent;

    const unlockedForecastSum = inputs
        .filter((_, idx) => !lockedMonths.includes(idx))
        .reduce((s, m) => s + m.salesForecast, 0);

    return inputs.map((input, idx) => {
        if (lockedMonths.includes(idx)) {
            // 锁定月份：用实际值替代预测值
            return {
                ...input,
                salesForecast: actualSales[idx] ?? input.salesForecast,
                originalPurchaseBudget: actualPurchaseAmount[idx] ?? input.originalPurchaseBudget,
            };
        }
        // 未锁定月份：按销售预测占比重新分配剩余预算
        const newBudget = unlockedForecastSum > 0
            ? remainingBudget * (input.salesForecast / unlockedForecastSum)
            : input.originalPurchaseBudget;
        return { ...input, originalPurchaseBudget: Math.round(newBudget) };
    });
}

export function calcMonthlyOTB(inputs: MonthlyOTBInput[], month1Beginning: number): MonthlyOTBRow[] {
    // Pre-compute salesCost per month
    const salesCosts = inputs.map(m => {
        const sf = safeNumber(m.salesForecast) ?? 0;
        const dr = Math.max(0.01, safeNumber(m.discountRate) ?? 0.85);
        const mr = Math.max(0.01, safeNumber(m.markupRate) ?? 3.2);
        return sf / dr / mr;
    });

    const rows: MonthlyOTBRow[] = [];
    let beginning = Math.max(0, safeNumber(month1Beginning) ?? 0);

    for (let i = 0; i < inputs.length; i++) {
        const m = inputs[i];
        const sc = salesCosts[i];
        const sf = safeNumber(m.salesForecast) ?? 0;
        const dr = Math.max(0.01, safeNumber(m.discountRate) ?? 0.85);
        const ssr = Math.max(1, Math.round(safeNumber(m.stockToSalesRatio) ?? 3));
        const ar = Math.max(0.01, safeNumber(m.arrivalRate) ?? 0.95);
        const opb = safeNumber(m.originalPurchaseBudget) ?? 0;

        let ending = 0;
        for (let j = 1; j <= ssr; j++) {
            ending += salesCosts[i + j] ?? 0;
        }

        const purchaseRequired = sc + ending - beginning;
        const actualPurchaseRequired = purchaseRequired > 0 ? purchaseRequired / ar : purchaseRequired;
        const budgetDiff = actualPurchaseRequired - opb;
        const budgetDiffRate = opb !== 0 ? safeDiv(budgetDiff, opb) : null;

        rows.push({
            ...m,
            beginningInventoryCost: beginning,
            retailSalesAmount: sf / dr,
            salesCost: sc,
            endingInventoryCost: ending,
            purchaseRequiredAmount: purchaseRequired,
            actualPurchaseRequiredAmount: actualPurchaseRequired,
            budgetDiff,
            budgetDiffRate,
        });

        beginning = ending;
    }

    return rows;
}

// ── 波段 OTB ──────────────────────────────────────────────────────────────────

export interface WaveOTBInput {
    id: string;
    season: string;
    seasonLabel: string;
    wave: string;
    waveRole?: string;
    launchMonth: number;
    launchDate: string;
    promotion: string;
    salesRatio: number;
    newProductRatio: number;
    repeatOrderRatio: number;
    carryoverRatio: number;
    sellThroughTarget: number;
    plannedStyleCount?: number;
    averageDepth?: number;
    mainCategory?: string;
    priceBandFocus?: string[];
    productRoleFocus?: string[];
    arrivalMonth?: number;
    arrivalSuggestion?: string;
    planOtbBudget?: number;
}

export interface WaveOTBRow extends WaveOTBInput {
    seasonSalesTarget: number;
    plannedSalesAmount: number;
    newProductAmount: number;
    repeatOrderAmount: number;
    carryoverAmount: number;
    otbBudget: number | null;
}

export function calcWaveOTB(
    waves: WaveOTBInput[],
    ssSeasonSalesTarget: number,
    awSeasonSalesTarget: number,
): WaveOTBRow[] {
    return waves.map(w => {
        const seasonST = w.season === 'SS'
            ? (safeNumber(ssSeasonSalesTarget) ?? 0)
            : (safeNumber(awSeasonSalesTarget) ?? 0);
        const planned = seasonST * (safeNumber(w.salesRatio) ?? 0);
        const st = safeNumber(w.sellThroughTarget);
        const newAmt = planned * (safeNumber(w.newProductRatio) ?? 0);
        return {
            ...w,
            seasonSalesTarget: seasonST,
            plannedSalesAmount: planned,
            newProductAmount: newAmt,
            repeatOrderAmount: planned * (safeNumber(w.repeatOrderRatio) ?? 0),
            carryoverAmount: planned * (safeNumber(w.carryoverRatio) ?? 0),
            otbBudget: st && st > 0 ? newAmt / st : null,
        };
    });
}

// ── 品类深度 ──────────────────────────────────────────────────────────────────

export interface CategoryDepthInput {
    id: string;
    season: string;
    wave: string;
    category: string;
    categoryLabel: string;
    priceBandId?: string;
    priceBandLabel?: string;
    priceBandRole?: string;
    priceBandSalesRatio?: number;
    priceBandStyleCount?: number;
    productRoleId?: string;
    productRoleName?: string;
    productRoleSalesRatio?: number;
    roleDepthMultiplier?: number;
    costCeiling?: number;
    targetMarkupRate?: number;
    grossMarginTarget?: number;
    isHeroProduct?: boolean;
    isTestProduct?: boolean;
    isCarryoverProduct?: boolean;
    isManualOverride?: boolean;
    ruleSource?: string;
    categorySalesRatio: number;
    retailPrice: number;
    costPrice: number;
    sellThroughTarget: number;
    plannedStyleCount: number;
    plannedColorCount: number;
    averageDepthOverride?: number;
    sizeGroupId?: string;  // 尺码组ID（men / women / unisex / kids），缺省视为 'men'
    // 波段生命周期字段（来自波段拆解）
    waveId?: string;
    seasonLabel?: string;
    launchDate?: string;
    launchMonth?: number;
    waveRole?: string;
    mainCategoryLabel?: string;
    priceBandFocus?: string[];
    productRoleFocus?: string[];
    waveOtbBudget?: number | null;
    waveLifecycle?: 'closed' | 'current' | 'planning';
}

export interface CategoryDepthRow extends CategoryDepthInput {
    waveSalesTarget: number;
    categorySalesTarget: number;
    priceBandSalesTarget: number;
    productRoleSalesTarget: number;
    priceBandPlannedPairs: number | null;
    priceBandProductionPairs: number | null;
    priceBandAverageDepth: number | null;
    priceBandOTB: number | null;
    grossMargin: number | null;
    plannedSalesPairs: number | null;
    plannedProductionPairs: number | null;
    plannedSkuCount: number;
    averageDepth: number | null;
    productionAmount: number | null;
    diagnosis: string;
    diagnosisLevel: 'ok' | 'warn' | 'danger';
}

export function calcCategoryDepth(
    items: CategoryDepthInput[],
    waveSalesTargets: Record<string, number>,
): CategoryDepthRow[] {
    return items.map(item => {
        const waveKey = `${item.season}-${item.wave}`;
        const wst = waveSalesTargets[waveKey] ?? 0;
        const catST = wst * (safeNumber(item.categorySalesRatio) ?? 0);
        const priceBandRatio = safeNumber(item.priceBandSalesRatio) ?? 1;
        const roleRatio = safeNumber(item.productRoleSalesRatio) ?? 1;
        const priceBandStyleCount = Math.max(1, Math.round(safeNumber(item.priceBandStyleCount) ?? safeNumber(item.plannedStyleCount) ?? 1));
        const priceBandST = catST * priceBandRatio;
        const roleST = priceBandST * roleRatio;
        const rp = safeNumber(item.retailPrice);
        const cp = safeNumber(item.costPrice);
        const st = safeNumber(item.sellThroughTarget);
        const styles = Math.max(1, Math.round(safeNumber(item.plannedStyleCount) ?? 1));
        const colors = Math.max(1, Math.round(safeNumber(item.plannedColorCount) ?? 1));
        const skuCount = styles * colors;

        const grossMargin = rp && cp && rp > 0 ? 1 - cp / rp : null;
        const salesPairs = rp && rp > 0 ? safeDiv(roleST, rp) : null;
        const calculatedProductionPairs = salesPairs !== null && st && st > 0 ? salesPairs / st : null;
        const requestedAverageDepth = safeNumber(item.averageDepthOverride);
        const productionPairs = requestedAverageDepth && requestedAverageDepth > 0
            ? requestedAverageDepth * skuCount
            : calculatedProductionPairs;
        const priceBandPlannedPairs = rp && rp > 0 ? safeDiv(priceBandST, rp) : null;
        const priceBandProductionPairs = priceBandPlannedPairs !== null && st && st > 0 ? priceBandPlannedPairs / st : null;
        const priceBandSkuCount = Math.max(1, priceBandStyleCount * colors);
        const priceBandAverageDepth = priceBandProductionPairs !== null ? priceBandProductionPairs / priceBandSkuCount : null;
        const priceBandOTB = productionPairs !== null && cp ? productionPairs * cp : null;
        const avgDepth = productionPairs !== null && skuCount > 0 ? productionPairs / skuCount : null;
        const productionAmount = productionPairs !== null && cp ? productionPairs * cp : null;

        let diagnosis = '✅ 结构健康';
        let diagnosisLevel: 'ok' | 'warn' | 'danger' = 'ok';

        if (grossMargin !== null && grossMargin < 0.4) {
            diagnosis = '🔴 毛利率偏低，建议核价或调整零售价';
            diagnosisLevel = 'danger';
        } else if ((safeNumber(item.categorySalesRatio) ?? 0) > 0.5) {
            diagnosis = '⚠️ 单一品类占比超50%，结构集中';
            diagnosisLevel = 'warn';
        } else if (avgDepth !== null && avgDepth < 300) {
            diagnosis = '⚠️ 均深偏低（<300双），款数可能过多';
            diagnosisLevel = 'warn';
        } else if (avgDepth !== null && avgDepth > 1200) {
            diagnosis = '⚠️ 均深偏高（>1200双），款数可能偏少';
            diagnosisLevel = 'warn';
        } else if ((item.priceBandRole === '入门引流' || item.priceBandId === 'Entry') && priceBandRatio > 0.35) {
            diagnosis = '⚠️ 入门引流价格带占比偏高，毛利压力增加';
            diagnosisLevel = 'warn';
        } else if ((item.priceBandRole === '品牌形象' || item.priceBandId === 'Image') && priceBandRatio > 0.18) {
            diagnosis = '⚠️ 品牌形象价格带占比偏高，库存风险增加';
            diagnosisLevel = 'warn';
        } else if ((item.priceBandRole === '主力走量' || item.priceBandId === 'Volume') && priceBandRatio < 0.35) {
            diagnosis = '⚠️ 主力价格带占比偏低，销售承接可能不足';
            diagnosisLevel = 'warn';
        }

        if (diagnosisLevel === 'ok' && item.productRoleId === 'test' && avgDepth !== null && avgDepth > 600) {
            diagnosis = 'Test role depth is too high; trial inventory risk';
            diagnosisLevel = 'warn';
        } else if (diagnosisLevel === 'ok' && item.productRoleId === 'image' && roleRatio > 0.15) {
            diagnosis = 'Image role ratio is high; inventory risk';
            diagnosisLevel = 'warn';
        } else if (item.costCeiling !== undefined && cp !== null && cp > item.costCeiling) {
            diagnosis = 'Cost exceeds price-band ceiling';
            diagnosisLevel = 'danger';
        }

        return {
            ...item,
            waveSalesTarget: wst,
            categorySalesTarget: catST,
            priceBandSalesTarget: priceBandST,
            productRoleSalesTarget: roleST,
            priceBandPlannedPairs,
            priceBandProductionPairs,
            priceBandAverageDepth,
            priceBandOTB,
            grossMargin,
            plannedSalesPairs: salesPairs,
            plannedProductionPairs: productionPairs,
            plannedSkuCount: skuCount,
            averageDepth: avgDepth,
            productionAmount,
            diagnosis,
            diagnosisLevel,
        };
    });
}

// ── 渠道/电商 OTB ─────────────────────────────────────────────────────────────

export interface ChannelOTBInput {
    id: string;
    channel: string;
    channelLabel: string;
    quarter: string;
    quarterLabel: string;
    salesTarget: number;
    sellThroughTarget: number;
    returnRate: number;
    discountRate: number;
    markupRate: number;
    averageRetailPrice: number;
    averageCostPrice: number;
    beginningInventoryCost: number;
    newProductRatio: number;
    repeatOrderRatio: number;
    carryoverRatio: number;
}

export interface ChannelOTBRow extends ChannelOTBInput {
    effectiveSellThrough: number | null;
    theoreticalInvestmentAmount: number | null;
    netNewOTB: number | null;
    investmentPairs: number | null;
    newProductAmount: number;
    repeatOrderAmount: number;
    carryoverAmount: number;
    ecomReturnDanger: boolean;
}

export function calcChannelOTB(input: ChannelOTBInput): ChannelOTBRow {
    const { salesTarget, sellThroughTarget, returnRate, discountRate, markupRate, averageCostPrice, beginningInventoryCost } = input;
    const st = safeNumber(salesTarget) ?? 0;
    const effective = (safeNumber(sellThroughTarget) ?? 0) - (safeNumber(returnRate) ?? 0);
    const ecomReturnDanger = effective <= 0.10;

    let theoreticalInvestment: number | null = null;
    if (effective > 0) {
        const dr = Math.max(0.01, safeNumber(discountRate) ?? 0.85);
        const mr = Math.max(0.01, safeNumber(markupRate) ?? 3.2);
        theoreticalInvestment = st / effective / dr / mr;
    }

    const netNewOTB = theoreticalInvestment !== null
        ? Math.max(0, theoreticalInvestment - (safeNumber(beginningInventoryCost) ?? 0))
        : null;

    const cp = safeNumber(averageCostPrice);
    const investmentPairs = netNewOTB !== null && cp && cp > 0 ? netNewOTB / cp : null;

    return {
        ...input,
        effectiveSellThrough: effective > 0 ? effective : null,
        theoreticalInvestmentAmount: theoreticalInvestment,
        netNewOTB,
        investmentPairs,
        newProductAmount: st * (safeNumber(input.newProductRatio) ?? 0),
        repeatOrderAmount: st * (safeNumber(input.repeatOrderRatio) ?? 0),
        carryoverAmount: st * (safeNumber(input.carryoverRatio) ?? 0),
        ecomReturnDanger,
    };
}

// ── 执行跟踪 ──────────────────────────────────────────────────────────────────

export type ExecutionStatus = '未开始' | '计划中' | '已审批' | '已下单' | '已到货' | '偏差预警' | '已关闭';

export interface ExecutionTrackingInput {
    id: string;
    season: string;
    wave: string;
    category: string;
    categoryLabel: string;
    priceBandId?: string;
    priceBandLabel?: string;
    productRoleId?: string;
    productRoleName?: string;
    costCeiling?: number;
    targetGrossMargin?: number;
    actualGrossMargin?: number;
    pricingStatus?: string;
    costRisk?: string;
    plannedStyleCount: number;
    developedStyleCount: number;
    pricedStyleCount: number;
    orderedStyleCount: number;
    plannedPurchaseAmount: number;
    orderedAmount: number;
    arrivedAmount: number;
    launchDate: string;
    conceptDueDate?: string;
    sampleDueDate?: string;
    reviewDueDate?: string;
    costingDueDate?: string;
    orderDueDate?: string;
    bulkProductionDueDate?: string;
    warehouseDueDate?: string;
    status: ExecutionStatus;
    sellThroughRate?: number;
    sellThroughBenchmark?: number;
    reorderTriggered?: boolean;
}

export interface ExecutionTrackingRow extends ExecutionTrackingInput {
    budgetExecutionRate: number | null;
    arrivalExecutionRate: number | null;
    daysToLaunch: number;
    orderRisk: boolean;
    arrivalRisk: boolean;
    developmentGap: boolean;
    conceptDueDate: string;
    sampleDueDate: string;
    reviewDueDate: string;
    costingDueDate: string;
    orderDueDate: string;
    bulkProductionDueDate: string;
    warehouseDueDate: string;
    designNodeRisk: boolean;
    costingNodeRisk: boolean;
    orderNodeRisk: boolean;
    warehouseNodeRisk: boolean;
    pricingRisk: boolean;
    productRoleRisk: boolean;
    costRiskMessage: string | null;
    milestoneRisks: string[];
}

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function formatISODate(date: Date) {
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function resolveMilestone(rawDate: string | undefined, launchDateObj: Date, daysBeforeLaunch: number) {
    if (rawDate) return rawDate;
    return formatISODate(addDays(launchDateObj, -daysBeforeLaunch));
}

function isDatePassed(rawDate: string, today: Date) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getTime() < today.getTime();
}

export function calcExecutionStatus(row: ExecutionTrackingInput, today = new Date()): ExecutionTrackingRow {
    const ppa = safeNumber(row.plannedPurchaseAmount) ?? 0;
    const oa = safeNumber(row.orderedAmount) ?? 0;
    const aa = safeNumber(row.arrivedAmount) ?? 0;

    const budgetExecutionRate = ppa > 0 ? safeDiv(oa, ppa) : null;
    const arrivalExecutionRate = oa > 0 ? safeDiv(aa, oa) : null;

    const launchDateObj = new Date(row.launchDate);
    const daysToLaunch = Math.round((launchDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const conceptDueDate = resolveMilestone(row.conceptDueDate, launchDateObj, 120);
    const sampleDueDate = resolveMilestone(row.sampleDueDate, launchDateObj, 100);
    const reviewDueDate = resolveMilestone(row.reviewDueDate, launchDateObj, 90);
    const costingDueDate = resolveMilestone(row.costingDueDate, launchDateObj, 80);
    const orderDueDate = resolveMilestone(row.orderDueDate, launchDateObj, 75);
    const bulkProductionDueDate = resolveMilestone(row.bulkProductionDueDate, launchDateObj, 30);
    const warehouseDueDate = resolveMilestone(row.warehouseDueDate, launchDateObj, 15);

    const orderRisk = budgetExecutionRate !== null && budgetExecutionRate < 0.80 && daysToLaunch > 0 && daysToLaunch < 30;
    const arrivalRisk = arrivalExecutionRate !== null && arrivalExecutionRate < 0.70 && daysToLaunch > 0 && daysToLaunch < 15;
    const developmentGap = row.developedStyleCount < row.plannedStyleCount;

    const designNodeRisk = isDatePassed(conceptDueDate, today) && row.developedStyleCount < row.plannedStyleCount;
    const costingNodeRisk = isDatePassed(costingDueDate, today) && row.pricedStyleCount < row.developedStyleCount;
    const orderNodeRisk = isDatePassed(orderDueDate, today) && row.orderedStyleCount < row.plannedStyleCount;
    const warehouseNodeRisk = isDatePassed(warehouseDueDate, today) && aa < oa;
    const targetGrossMargin = safeNumber(row.targetGrossMargin);
    const actualGrossMargin = safeNumber(row.actualGrossMargin);
    const costCeiling = safeNumber(row.costCeiling);
    const pricingRisk =
        row.pricingStatus === '毛利异常' ||
        row.pricingStatus === '成本超限' ||
        (targetGrossMargin !== null && actualGrossMargin !== null && actualGrossMargin < targetGrossMargin);
    const productRoleRisk =
        (row.productRoleId === 'main' && (developmentGap || orderNodeRisk)) ||
        (row.productRoleId === 'hero' && (orderNodeRisk || warehouseNodeRisk)) ||
        (row.productRoleId === 'image' && row.orderedStyleCount > Math.max(2, row.plannedStyleCount * 0.8)) ||
        (row.productRoleId === 'test' && oa > ppa * 0.25);
    const costRiskMessage = pricingRisk
        ? (costCeiling !== null ? `cost ceiling ${formatCurrency(costCeiling)}` : 'pricing margin risk')
        : null;
    const milestoneRisks = [
        designNodeRisk ? '设计开发滞后' : '',
        costingNodeRisk ? '核价滞后' : '',
        orderNodeRisk ? '下单滞后' : '',
        warehouseNodeRisk ? '入仓/到货风险' : '',
        pricingRisk ? '定价/毛利风险' : '',
        productRoleRisk ? '货品角色执行风险' : '',
    ].filter(Boolean);

    const status: ExecutionStatus = row.status !== '已关闭' && (orderRisk || arrivalRisk || developmentGap || milestoneRisks.length > 0)
        ? '偏差预警'
        : row.status;

    return {
        ...row,
        conceptDueDate,
        sampleDueDate,
        reviewDueDate,
        costingDueDate,
        orderDueDate,
        bulkProductionDueDate,
        warehouseDueDate,
        status,
        budgetExecutionRate,
        arrivalExecutionRate,
        daysToLaunch,
        orderRisk,
        arrivalRisk,
        developmentGap,
        designNodeRisk,
        costingNodeRisk,
        orderNodeRisk,
        warehouseNodeRisk,
        pricingRisk,
        productRoleRisk,
        costRiskMessage,
        milestoneRisks,
    };
}

// ── 统一洞察 ──────────────────────────────────────────────────────────────────

export interface OTBInsight {
    level: 'ok' | 'warn' | 'danger';
    title: string;
    message: string;
}

export function generateOTBInsights(input: {
    annual?: AnnualOTBResult | null;
    monthly?: MonthlyOTBRow[];
    waves?: WaveOTBRow[];
    categories?: CategoryDepthRow[];
    channels?: ChannelOTBRow[];
    executions?: ExecutionTrackingRow[];
} = {}): OTBInsight[] {
    const insights: OTBInsight[] = [];

    if (input.annual?.budgetGap !== null && input.annual?.budgetGap !== undefined) {
        if (input.annual.budgetGap > 0) {
            insights.push({
                level: 'warn',
                title: '年度预算存在缺口',
                message: `年度新品投入预算高于批准预算 ${formatCurrency(input.annual.budgetGap)}，需要压缩波段或追加预算。`,
            });
        } else {
            insights.push({
                level: 'ok',
                title: '年度预算仍有余量',
                message: `当前年度新品投入预算低于批准预算 ${formatCurrency(Math.abs(input.annual.budgetGap))}。`,
            });
        }
    }

    if (input.monthly?.length) {
        const totalDiff = input.monthly.reduce((sum, row) => sum + (safeNumber(row.budgetDiff) ?? 0), 0);
        if (totalDiff > 0) {
            insights.push({
                level: 'warn',
                title: '月度采购高于原预算',
                message: `滚动采购金额高于原预算 ${formatCurrency(totalDiff)}，需要提前确认现金流和供应商账期。`,
            });
        }
    }

    if (input.waves?.length) {
        const weakWaves = input.waves.filter(row => (safeNumber(row.sellThroughTarget) ?? 0) < 0.75);
        if (weakWaves.length > 0) {
            insights.push({
                level: 'warn',
                title: '部分波段消化率偏低',
                message: `${weakWaves.map(row => `${row.season}${row.wave}`).join('、')} 的消化率低于75%，建议降低首单深度或提高翻单比例。`,
            });
        }
    }

    if (input.categories?.length) {
        const dangerRows = input.categories.filter(row => row.diagnosisLevel === 'danger');
        const warnRows = input.categories.filter(row => row.diagnosisLevel === 'warn');
        if (dangerRows.length > 0) {
            insights.push({
                level: 'danger',
                title: '品类测算存在硬风险',
                message: `${dangerRows.length} 个品类存在毛利或参数风险，需要先调整价格/成本再下单。`,
            });
        } else if (warnRows.length > 0) {
            insights.push({
                level: 'warn',
                title: '品类深度需要复核',
                message: `${warnRows.length} 个品类存在均深或结构预警，建议复核款数和色数。`,
            });
        }
    }

    if (input.channels?.some(row => row.ecomReturnDanger)) {
        insights.push({
            level: 'danger',
            title: '渠道投入参数异常',
            message: '存在售罄目标扣除退货率后过低的渠道，请先修正退货率或售罄目标。',
        });
    }

    if (input.executions?.length) {
        const riskRows = input.executions.filter(row => row.orderRisk || row.arrivalRisk || row.developmentGap);
        if (riskRows.length > 0) {
            insights.push({
                level: 'danger',
                title: 'OTB执行进度有风险',
                message: `${riskRows.length} 条执行记录存在开发、下单或到货风险，需要跟进上市前节点。`,
            });
        }
    }

    if (insights.length === 0) {
        insights.push({
            level: 'ok',
            title: 'OTB测算结构健康',
            message: '当前预算、波段、品类和执行数据暂无明显异常。',
        });
    }

    return insights;
}
