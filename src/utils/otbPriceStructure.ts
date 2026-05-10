/**
 * src/utils/otbPriceStructure.ts
 * OTB 价格&结构计算工具
 *
 * 所有金额底层用元，所有比例底层用 0-1
 * 不允许 NaN / Infinity / 科学计数法
 */

// ─── 基础安全函数 ───────────────────────────────────────────────

export function safeNum(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const n = Number(value);
    return isFinite(n) ? n : 0;
}

export function safeRatio(value: unknown): number {
    const n = safeNum(value);
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

export function safeDiv(numerator: number, denominator: number): number {
    if (!isFinite(denominator) || denominator === 0) return 0;
    const result = numerator / denominator;
    return isFinite(result) ? result : 0;
}

// ─── 诊断结果类型 ───────────────────────────────────────────────

export interface StructureDiagnosis {
    level: 'healthy' | 'warning' | 'danger';
    title: string;
    message: string;
    action?: string;
}

// ─── 规则来源类型 ───────────────────────────────────────────────

export type RuleSourceType =
    | 'exact_match'
    | 'brand_channel_category'
    | 'brand_channel'
    | 'brand_category'
    | 'channel_category'
    | 'category_default'
    | 'brand_default'
    | 'channel_default'
    | 'global_default';

export interface RuleWithSource<T> {
    value: T;
    source: RuleSourceType;
    sourceLabel: string;
    isFallback: boolean;
    isManualOverride?: boolean;
}

export function makeRule<T>(
    value: T,
    source: RuleSourceType,
    sourceLabel: string,
): RuleWithSource<T> {
    return {
        value,
        source,
        sourceLabel,
        isFallback: source === 'global_default',
    };
}

// ─── 价格带计算 ─────────────────────────────────────────────────

/** 零售均价 = (最低价 + 最高价) / 2 */
export function calcAverageRetailPrice(minPrice: number, maxPrice: number): number {
    return safeDiv(safeNum(minPrice) + safeNum(maxPrice), 2);
}

/** 按毛利目标反推成本上限 */
export function calcCostCeilingByMargin(retailPrice: number, grossMargin: number): number {
    const gm = safeRatio(grossMargin);
    return safeNum(retailPrice) * (1 - gm);
}

/** 按倍率目标反推成本上限 */
export function calcCostCeilingByMarkup(retailPrice: number, markupRate: number): number {
    return safeDiv(safeNum(retailPrice), safeNum(markupRate) || 1);
}

/** 最终成本上限 = min(毛利法, 倍率法) */
export function calcFinalCostCeiling(
    retailPrice: number,
    grossMargin: number,
    markupRate: number,
): number {
    const byMargin = calcCostCeilingByMargin(retailPrice, grossMargin);
    const byMarkup = calcCostCeilingByMarkup(retailPrice, markupRate);
    if (byMargin <= 0) return byMarkup;
    if (byMarkup <= 0) return byMargin;
    return Math.min(byMargin, byMarkup);
}

/** 价格带目标销售额 = 品类目标 × 价格带销售占比 */
export function calcPriceBandSalesAmount(
    categorySalesTarget: number,
    priceBandRatio: number,
): number {
    return safeNum(categorySalesTarget) * safeRatio(priceBandRatio);
}

/** 价格带计划销售双数 = 目标额 / 零售均价 */
export function calcPriceBandPairs(salesAmount: number, averageRetailPrice: number): number {
    return Math.round(safeDiv(safeNum(salesAmount), safeNum(averageRetailPrice)));
}

/** 价格带计划投产双数 = 计划销售双数 / 售罄目标 */
export function calcPriceBandProductionPairs(
    plannedPairs: number,
    sellThroughTarget: number,
): number {
    return Math.round(safeDiv(safeNum(plannedPairs), safeRatio(sellThroughTarget) || 0.8));
}

/** 价格带OTB金额 = 投产双数 × 成本均价 */
export function calcPriceBandOtbAmount(
    productionPairs: number,
    averageCostPrice: number,
): number {
    return safeNum(productionPairs) * safeNum(averageCostPrice);
}

// ─── 货品角色计算 ───────────────────────────────────────────────

/** 货品角色款数 = 总款数 × 角色款数占比 */
export function calcRoleStyleCount(totalStyleCount: number, roleStyleRatio: number): number {
    return Math.round(safeNum(totalStyleCount) * safeRatio(roleStyleRatio));
}

/** 货品角色均深 = 基础均深 × 深度系数 */
export function calcRoleDepth(baseDepth: number, roleDepthMultiplier: number): number {
    return Math.round(safeNum(baseDepth) * safeNum(roleDepthMultiplier));
}

/** SKU数 = 款数 × 色数 */
export function calcRoleSkuCount(styleCount: number, colorCount: number): number {
    return Math.round(safeNum(styleCount) * safeNum(colorCount));
}

/** 投产双数 = SKU数 × 均深 */
export function calcRoleProductionPairs(skuCount: number, averageDepth: number): number {
    return Math.round(safeNum(skuCount) * safeNum(averageDepth));
}

/** 投产金额 = 投产双数 × 成本均价 */
export function calcRoleProductionAmount(productionPairs: number, costPrice: number): number {
    return safeNum(productionPairs) * safeNum(costPrice);
}

// ─── 占比归一化 ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RatioRow = Record<string, any>;

/** 检查占比合计是否为 100%（0-1 范围） */
export function checkRatioTotal(
    rows: RatioRow[],
    field: string,
    tolerance = 0.001,
): { total: number; isValid: boolean } {
    const total = rows.reduce((sum, row) => sum + safeRatio(row[field] as number), 0);
    return { total, isValid: Math.abs(total - 1) < tolerance };
}

/** 一键归一化：按比例调整所有行，使合计 = 1.0 */
export function normalizeRatio<T extends RatioRow>(rows: T[], field: keyof T): T[] {
    const total = rows.reduce((sum, row) => sum + safeNum(row[field] as number), 0);
    if (total <= 0) return rows;
    return rows.map(row => ({
        ...row,
        [field]: safeDiv(safeNum(row[field] as number), total),
    }));
}

/** 判断是否为清仓/奥莱承接价格带 */
export function isClearancePriceBand(row: {
    priceBandId?: string;
    role?: string;
    priceBandLabel?: string;
}): boolean {
    return row.priceBandId === 'clearance'
        || row.role === 'clearance'
        || (row.priceBandLabel?.includes('清仓') ?? false);
}

/**
 * 只归一化新品价格带（排除清仓/奥莱承接），clearance 行保持原值
 */
export function normalizeActivePriceBands<T extends {
    targetSalesRatio: number;
    targetStyleRatio?: number;
    priceBandId?: string;
    role?: string;
    priceBandLabel?: string;
}>(rows: T[], field: 'targetSalesRatio' | 'targetStyleRatio'): T[] {
    const activeRows = rows.filter(r => !isClearancePriceBand(r));
    const total = activeRows.reduce((sum, r) => sum + safeNum(r[field] as number), 0);
    if (total <= 0) return rows;
    return rows.map(row => {
        if (isClearancePriceBand(row)) return row;
        return { ...row, [field]: safeDiv(safeNum(row[field] as number), total) };
    });
}

// ─── 毛利诊断 ───────────────────────────────────────────────────

export interface PriceBandDiagnosisInput {
    priceBandId: string;
    priceBandLabel: string;
    targetSalesRatio: number;
    targetStyleRatio: number;
    targetGrossMargin: number;
    targetMarkupRate: number;
    minPrice: number;
    maxPrice: number;
}

export function diagnosePriceBandStructure(
    rows: PriceBandDiagnosisInput[],
): StructureDiagnosis[] {
    const results: StructureDiagnosis[] = [];

    // 分离新品价格带和清仓承接
    const activeRows = rows.filter(r => !isClearancePriceBand(r));
    const clearanceRows = rows.filter(r => isClearancePriceBand(r));

    // 清仓承接在新品 OTB 中出现时需提示
    const clearanceTotal = clearanceRows.reduce((sum, r) => sum + safeRatio(r.targetSalesRatio), 0);
    if (clearanceTotal > 0) {
        results.push({
            level: 'warning',
            title: '清仓承接不参与新品OTB',
            message: `清仓承接价格带销售占比 ${(clearanceTotal * 100).toFixed(1)}%，不应占用新品 OTB 预算`,
            action: '建议将清仓承接移入库存健康/清货预算，从新品OTB中移除',
        });
    }

    // 只统计新品价格带合计
    const { total: salesTotal, isValid: salesOk } = checkRatioTotal(activeRows, 'targetSalesRatio');
    if (!salesOk && activeRows.length > 0) {
        results.push({
            level: 'danger',
            title: '新品价格带销售占比异常',
            message: `新品价格带销售占比合计 ${(salesTotal * 100).toFixed(1)}%，应等于 100%`,
            action: '点击"一键归一化"自动修正（只归一化新品价格带）',
        });
    }

    const { total: styleTotal, isValid: styleOk } = checkRatioTotal(activeRows, 'targetStyleRatio');
    if (!styleOk && activeRows.length > 0) {
        results.push({
            level: 'warning',
            title: '款数占比合计异常',
            message: `各新品价格带款数占比合计 ${(styleTotal * 100).toFixed(1)}%，应等于 100%`,
            action: '点击"一键归一化"自动修正',
        });
    }

    const entryRow = activeRows.find(r => r.priceBandId === 'entry');
    if (entryRow && safeRatio(entryRow.targetSalesRatio) > 0.25) {
        results.push({
            level: 'warning',
            title: '入门引流占比偏高',
            message: `入门价格带销售占比 ${(safeRatio(entryRow.targetSalesRatio) * 100).toFixed(0)}%，超过 25%，整体毛利压力大`,
            action: '建议适当降低入门款数或提高主力价格带',
        });
    }

    const imageRow = activeRows.find(r => r.priceBandId === 'image');
    if (imageRow && safeRatio(imageRow.targetStyleRatio) > 0.12) {
        results.push({
            level: 'warning',
            title: '形象款款数占比偏高',
            message: `形象价格带款数占比 ${(safeRatio(imageRow.targetStyleRatio) * 100).toFixed(0)}%，超过 12%，存在高价库存风险`,
            action: '建议减少形象款款数，提高主力走量比重',
        });
    }

    for (const row of activeRows) {
        if (safeNum(row.targetGrossMargin) < 0.35) {
            results.push({
                level: 'danger',
                title: `${row.priceBandLabel}毛利目标过低`,
                message: `${row.priceBandLabel} 毛利目标 ${(safeNum(row.targetGrossMargin) * 100).toFixed(0)}%，低于 35% 安全线`,
                action: '请检查成本上限或提高吊牌价',
            });
        }
    }

    if (results.length === 0) {
        results.push({
            level: 'healthy',
            title: '价格带结构健康',
            message: '各新品价格带销售、款数占比正常，毛利目标均达标，清仓承接已移出',
        });
    }

    return results;
}

// ─── 货品角色诊断 ────────────────────────────────────────────────

export interface ProductRoleDiagnosisInput {
    roleId: string;
    roleName: string;
    styleRatio: number;
    averageDepth: number;
    maxSalesRatioWarning?: number;
}

export function diagnoseProductRoleStructure(
    rows: ProductRoleDiagnosisInput[],
): StructureDiagnosis[] {
    const results: StructureDiagnosis[] = [];

    const { total, isValid } = checkRatioTotal(rows, 'styleRatio');
    if (!isValid) {
        results.push({
            level: 'danger',
            title: '货品角色款数占比合计异常',
            message: `各货品角色款数占比合计 ${(total * 100).toFixed(1)}%，应等于 100%`,
            action: '点击"一键归一化"',
        });
    }

    const heroRow = rows.find(r => r.roleId === 'hero');
    const mainRow = rows.find(r => r.roleId === 'main');
    const basicRow = rows.find(r => r.roleId === 'basic');
    const testRow = rows.find(r => r.roleId === 'test');
    const imageRow = rows.find(r => r.roleId === 'image');

    if (heroRow && safeNum(heroRow.averageDepth) > 1800) {
        results.push({
            level: 'warning',
            title: '爆款候选均深过高',
            message: `爆款候选均深 ${safeNum(heroRow.averageDepth)} 双，存在备货过多风险`,
            action: '建议分批备货，监控售罄后追单',
        });
    }

    // 爆款候选均深不足（低于主推款均深）
    if (heroRow && mainRow && safeNum(heroRow.averageDepth) < safeNum(mainRow.averageDepth)) {
        results.push({
            level: 'warning',
            title: '爆款深度不足',
            message: `爆款候选均深 ${safeNum(heroRow.averageDepth)} 低于主推款 ${safeNum(mainRow.averageDepth)}，爆款深度配置偏保守`,
            action: '建议爆款候选深度高于主推款，确保充足供货',
        });
    }

    if (testRow && safeNum(testRow.averageDepth) > 600) {
        results.push({
            level: 'danger',
            title: '测试款均深过高',
            message: `测试款均深 ${safeNum(testRow.averageDepth)} 双，试错库存风险大`,
            action: '建议测试款均深控制在 300-500 双以内',
        });
    }

    if (testRow && safeRatio(testRow.styleRatio) > 0.10) {
        results.push({
            level: 'warning',
            title: '测试款占比偏高',
            message: `测试款款数占比 ${(safeRatio(testRow.styleRatio) * 100).toFixed(0)}%，超过 10%，试错库存风险大`,
            action: '建议控制测试款占比在 10% 以内',
        });
    }

    if (imageRow && safeRatio(imageRow.styleRatio) > 0.10) {
        results.push({
            level: 'warning',
            title: '形象款款数占比偏高',
            message: `形象款款数占比 ${(safeRatio(imageRow.styleRatio) * 100).toFixed(0)}%，高于 10%，承担销售压力风险`,
            action: '形象款不应承担核心销售目标',
        });
    }

    // 基础款+主推款基本盘是否充足
    const basicsTotal = (basicRow ? safeRatio(basicRow.styleRatio) : 0) + (mainRow ? safeRatio(mainRow.styleRatio) : 0);
    if (rows.length > 0 && basicsTotal < 0.55) {
        results.push({
            level: 'warning',
            title: '基本盘款数不足',
            message: `基础款+主推款合计 ${(basicsTotal * 100).toFixed(0)}%，低于 55%，销售基本盘不稳定`,
            action: '建议增加基础款或主推款比例至合计 55% 以上',
        });
    }

    if (results.length === 0) {
        results.push({
            level: 'healthy',
            title: '货品角色结构健康',
            message: '各货品角色款数比例合理，均深配置符合规则',
        });
    }

    return results;
}

// ─── 品类 × 价格带矩阵诊断 ──────────────────────────────────────

export interface CategoryPriceBandRow {
    categoryId: string;
    categoryLabel: string;
    priceBandId: string;
    priceBandLabel: string;
    salesRatio: number;
    styleCount: number;
    targetGrossMargin: number;
    costCeiling: number;
    actualCostPrice?: number;
}

export function diagnoseCategoryPriceBandMatrix(
    rows: CategoryPriceBandRow[],
): StructureDiagnosis[] {
    const results: StructureDiagnosis[] = [];

    for (const row of rows) {
        if (row.actualCostPrice !== undefined && row.actualCostPrice > row.costCeiling && row.costCeiling > 0) {
            results.push({
                level: 'danger',
                title: `${row.categoryLabel} × ${row.priceBandLabel} 成本超限`,
                message: `实际成本 ${row.actualCostPrice}元 超过成本上限 ${row.costCeiling}元`,
                action: '请协商降低采购成本或调整吊牌价',
            });
        }
        if (safeNum(row.targetGrossMargin) < 0.35 && row.priceBandId !== 'clearance') {
            results.push({
                level: 'warning',
                title: `${row.categoryLabel} × ${row.priceBandLabel} 毛利目标偏低`,
                message: `目标毛利 ${(safeNum(row.targetGrossMargin) * 100).toFixed(0)}%，低于安全线 35%`,
                action: '建议检查定价或控制款数',
            });
        }
    }

    if (results.length === 0) {
        results.push({
            level: 'healthy',
            title: '品类×价格带矩阵健康',
            message: '所有品类价格带毛利目标均达标，无成本超限',
        });
    }

    return results;
}

// ─── 波段结构诊断 ───────────────────────────────────────────────

export interface WaveAssortmentRow {
    wave: string;
    mainCategory: string;
    priceBandId: string;
    productRoleId: string;
    plannedStyleCount: number;
    averageDepth: number;
    deliveryRisk: 'low' | 'mid' | 'high' | '低' | '中' | '高';
}

export function diagnoseWaveAssortmentStructure(
    rows: WaveAssortmentRow[],
): StructureDiagnosis[] {
    const results: StructureDiagnosis[] = [];

    for (const row of rows) {
        const riskStr = String(row.deliveryRisk);
        const isHighRisk = riskStr === 'high' || riskStr === '高';
        const isMidRisk  = riskStr === 'mid'  || riskStr === '中';
        if (isHighRisk && (row.productRoleId === 'hero' || row.productRoleId === 'main')) {
            results.push({
                level: 'danger',
                title: `${row.wave} 波段交期高风险`,
                message: `${row.wave} 波段 ${row.mainCategory} 主推/爆款候选交期风险高，可能影响上市节点`,
                action: '建议提前锁厂或启用备选供应商',
            });
        }
        if (isMidRisk && row.productRoleId === 'hero') {
            results.push({
                level: 'warning',
                title: `${row.wave} 波段爆款交期注意`,
                message: `${row.wave} 波段爆款候选交期中等风险，需要重点跟进`,
                action: '建议每周跟进工厂进度',
            });
        }
    }

    if (results.length === 0) {
        results.push({
            level: 'healthy',
            title: '波段结构健康',
            message: '所有波段交期风险可控，货品结构合理',
        });
    }

    return results;
}

// ─── 定价校验 ───────────────────────────────────────────────────

export interface PricingCheckInput {
    finalRetailPrice: number;
    actualCost: number;
    targetGrossMargin: number;
    targetMarkupRate: number;
    minPrice: number;
    maxPrice: number;
    priceBandId: string;
}

export interface PricingCheckResult {
    actualGrossMargin: number;
    actualMarkupRate: number;
    costCeiling: number;
    isCostExceedLimit: boolean;
    isMarginBelowTarget: boolean;
    isMarkupBelowTarget: boolean;
    isPriceOutOfBand: boolean;
    isMissingPrice: boolean;
    primaryIssue: 'healthy' | 'missing_price' | 'price_out_of_band' | 'cost_exceed' | 'markup_insufficient' | 'margin_insufficient';
    suggestedAction: string;
    diagnoses: StructureDiagnosis[];
}

export function calcPricingCheck(input: PricingCheckInput): PricingCheckResult {
    const { finalRetailPrice, actualCost, targetGrossMargin, targetMarkupRate, minPrice, maxPrice, priceBandId } = input;

    const isMissingPrice = finalRetailPrice <= 0;
    const actualGrossMargin = !isMissingPrice
        ? 1 - safeDiv(safeNum(actualCost), safeNum(finalRetailPrice))
        : 0;
    const actualMarkupRate = !isMissingPrice && actualCost > 0
        ? safeDiv(safeNum(finalRetailPrice), safeNum(actualCost))
        : 0;
    const costCeiling = calcFinalCostCeiling(finalRetailPrice, targetGrossMargin, targetMarkupRate);
    const isCostExceedLimit = !isMissingPrice && actualCost > costCeiling && costCeiling > 0;
    const isMarginBelowTarget = !isMissingPrice && actualGrossMargin < targetGrossMargin;
    const isMarkupBelowTarget = !isMissingPrice && targetMarkupRate > 0 && actualMarkupRate < targetMarkupRate;
    const isPriceOutOfBand = !isMissingPrice && priceBandId !== 'clearance' && maxPrice > 0
        && (finalRetailPrice < minPrice || finalRetailPrice > maxPrice);

    // 确定主要问题（优先级：缺少价格 > 价格带错位 > 成本超限 > 倍率不足 > 毛利不足）
    let primaryIssue: PricingCheckResult['primaryIssue'] = 'healthy';
    let suggestedAction = '';

    if (isMissingPrice) {
        primaryIssue = 'missing_price';
        suggestedAction = '请录入最终售价';
    } else if (isPriceOutOfBand) {
        primaryIssue = 'price_out_of_band';
        suggestedAction = '重新归类价格带或调整定价';
    } else if (isCostExceedLimit) {
        primaryIssue = 'cost_exceed';
        suggestedAction = '协商降低采购成本或提高吊牌价';
    } else if (isMarkupBelowTarget && isMarginBelowTarget) {
        primaryIssue = 'cost_exceed';
        suggestedAction = '同时不满足毛利和倍率目标，需重新定价';
    } else if (isMarkupBelowTarget) {
        primaryIssue = 'markup_insufficient';
        suggestedAction = '毛利可达但倍率不足，可放宽倍率目标或降低采购成本';
    } else if (isMarginBelowTarget) {
        primaryIssue = 'margin_insufficient';
        suggestedAction = '调整定价或压缩成本';
    }

    const diagnoses: StructureDiagnosis[] = [];
    if (isPriceOutOfBand) {
        diagnoses.push({
            level: 'warning',
            title: '价格带错位',
            message: `吊牌价 ${finalRetailPrice}元 超出价格带区间 ${minPrice}-${maxPrice}元`,
            action: suggestedAction,
        });
    }
    if (isCostExceedLimit) {
        diagnoses.push({
            level: 'danger',
            title: '成本超限',
            message: `实际成本 ${actualCost}元 超过成本上限 ${costCeiling.toFixed(0)}元`,
            action: suggestedAction,
        });
    } else if (isMarkupBelowTarget) {
        diagnoses.push({
            level: 'warning',
            title: '倍率不足',
            message: `实际倍率 ${actualMarkupRate.toFixed(2)}x，低于目标 ${targetMarkupRate.toFixed(2)}x（毛利约束未触发）`,
            action: suggestedAction,
        });
    } else if (isMarginBelowTarget) {
        diagnoses.push({
            level: 'warning',
            title: '毛利不足',
            message: `实际毛利 ${(actualGrossMargin * 100).toFixed(1)}%，低于目标 ${(targetGrossMargin * 100).toFixed(0)}%`,
            action: suggestedAction,
        });
    }
    if (diagnoses.length === 0) {
        diagnoses.push({
            level: 'healthy',
            title: '定价健康',
            message: '成本、毛利、倍率、价格带均符合目标',
        });
    }

    return {
        actualGrossMargin,
        actualMarkupRate,
        costCeiling,
        isCostExceedLimit,
        isMarginBelowTarget,
        isMarkupBelowTarget,
        isPriceOutOfBand,
        isMissingPrice,
        primaryIssue,
        suggestedAction,
        diagnoses,
    };
}

// ─── 加权平均计算 ────────────────────────────────────────────────

/** 加权平均售价 = Σ(价格带均价 × 销售占比) */
export function calcWeightedAveragePrice(rows: PriceBandDiagnosisInput[]): number {
    const activeRows = rows.filter(r => !isClearancePriceBand(r));
    const totalWeight = activeRows.reduce((s, r) => s + safeRatio(r.targetSalesRatio), 0);
    if (totalWeight <= 0) return 0;
    return activeRows.reduce((s, r) => {
        const avg = (safeNum(r.minPrice) + safeNum(r.maxPrice)) / 2;
        return s + avg * (safeRatio(r.targetSalesRatio) / totalWeight);
    }, 0);
}

/** 加权平均成本 = Σ(成本上限×0.92 × 销售占比) */
export function calcWeightedAverageCost(rows: PriceBandDiagnosisInput[]): number {
    const activeRows = rows.filter(r => !isClearancePriceBand(r));
    const totalWeight = activeRows.reduce((s, r) => s + safeRatio(r.targetSalesRatio), 0);
    if (totalWeight <= 0) return 0;
    return activeRows.reduce((s, r) => {
        const avg = (safeNum(r.minPrice) + safeNum(r.maxPrice)) / 2;
        const ceil = calcFinalCostCeiling(avg, r.targetGrossMargin, r.targetMarkupRate);
        return s + ceil * 0.92 * (safeRatio(r.targetSalesRatio) / totalWeight);
    }, 0);
}

/** 加权毛利率 = Σ(毛利率 × 销售占比) */
export function calcWeightedGrossMargin(rows: PriceBandDiagnosisInput[]): number {
    const activeRows = rows.filter(r => !isClearancePriceBand(r));
    const totalWeight = activeRows.reduce((s, r) => s + safeRatio(r.targetSalesRatio), 0);
    if (totalWeight <= 0) return 0;
    return activeRows.reduce((s, r) => s + safeRatio(r.targetGrossMargin) * (safeRatio(r.targetSalesRatio) / totalWeight), 0);
}

/** 加权目标倍率 = Σ(目标倍率 × 销售占比) */
export function calcWeightedMarkupRate(rows: PriceBandDiagnosisInput[]): number {
    const activeRows = rows.filter(r => !isClearancePriceBand(r));
    const totalWeight = activeRows.reduce((s, r) => s + safeRatio(r.targetSalesRatio), 0);
    if (totalWeight <= 0) return 0;
    return activeRows.reduce((s, r) => s + safeNum(r.targetMarkupRate) * (safeRatio(r.targetSalesRatio) / totalWeight), 0);
}

// ─── 销售贡献系数 ────────────────────────────────────────────────

/** 货品角色销售贡献经验系数（款数占比 × 系数 = 销售贡献占比） */
export const ROLE_SALES_FACTOR: Record<string, number> = {
    basic:  0.85,
    main:   1.45,
    hero:   2.10,
    image:  0.55,
    test:   0.45,
    repeat: 1.00,
};

/** 销售贡献 = 款数占比 × 角色经验系数 */
export function calcRoleSalesContribution(roleId: string, styleRatio: number): number {
    const factor = ROLE_SALES_FACTOR[roleId] ?? 1.0;
    return safeRatio(styleRatio) * factor;
}

/** 按销售贡献系数重新计算各角色预算（归一化后 × 总目标） */
export function calcRoleBudgetByContribution(
    rows: Array<{ roleId: string; styleRatio: number }>,
    totalSalesTarget: number,
): Array<{ roleId: string; salesContribution: number; roleBudget: number }> {
    const contributions = rows.map(r => ({
        roleId: r.roleId,
        rawContrib: calcRoleSalesContribution(r.roleId, r.styleRatio),
    }));
    const totalContrib = contributions.reduce((s, c) => s + c.rawContrib, 0) || 1;
    return contributions.map(c => ({
        roleId: c.roleId,
        salesContribution: c.rawContrib / totalContrib,
        roleBudget: (c.rawContrib / totalContrib) * safeNum(totalSalesTarget),
    }));
}

// ─── 单款贡献度 ──────────────────────────────────────────────────

/** 单款贡献度 = 销售占比 ÷ 款数占比 */
export function calcStyleContributionFactor(salesRatio: number, styleRatio: number): number {
    if (safeRatio(styleRatio) <= 0) return 0;
    return safeRatio(salesRatio) / safeRatio(styleRatio);
}

/** 分类单款贡献度：0.7-1.5 healthy, 1.5-2.5 warning, >2.5 danger, <0.7 warning */
export function classifyStyleContribution(factor: number): 'healthy' | 'warning' | 'danger' {
    if (factor >= 0.7 && factor <= 1.5) return 'healthy';
    if (factor > 2.5) return 'danger';
    return 'warning';
}

// ─── 毛利贡献占比 ────────────────────────────────────────────────

/** 毛利贡献占比 = 销售占比 × 毛利率（归一化后，合计=1） */
export function calcGrossProfitContributionByPriceBand(
    rows: PriceBandDiagnosisInput[],
): Array<{ priceBandId: string; contribution: number }> {
    const activeRows = rows.filter(r => !isClearancePriceBand(r));
    const rawValues = activeRows.map(r => ({
        priceBandId: r.priceBandId,
        raw: safeRatio(r.targetSalesRatio) * safeRatio(r.targetGrossMargin),
    }));
    const total = rawValues.reduce((s, v) => s + v.raw, 0) || 1;
    return rawValues.map(v => ({ priceBandId: v.priceBandId, contribution: v.raw / total }));
}

// ─── 投产金额（成本口径） ─────────────────────────────────────────

/**
 * 投产金额（成本口径）= 销售目标 × 售罄率 ÷ 折扣率 ÷ 倍率
 * @param salesAmt     价格带销售额目标
 * @param sellThrough  售罄目标（0-1）
 * @param discountRate 折扣率（0-1，默认0.85）
 * @param markupRate   目标倍率
 */
export function calcPriceBandProductionAmount(
    salesAmt: number,
    sellThrough: number,
    discountRate: number,
    markupRate: number,
): number {
    const st = safeRatio(sellThrough) || 0.8;
    const dr = safeRatio(discountRate) || 0.85;
    const mr = safeNum(markupRate) || 3.0;
    return safeNum(salesAmt) * st / dr / mr;
}

// ─── 动态铺货建议 ────────────────────────────────────────────────

/** 根据货品角色和投产双数生成动态铺货建议 */
export function calcReplenishStrategy(roleId: string, productionPairs: number): string {
    const pairs = Math.round(safeNum(productionPairs));
    switch (roleId) {
        case 'basic':
            return `分 ${pairs} 双一次铺货`;
        case 'main': {
            const first = Math.round(pairs * 0.7);
            const replen = pairs - first;
            return `${first} 双首铺，${replen} 双追单`;
        }
        case 'hero': {
            const first = Math.round(pairs * 0.4);
            const replen = pairs - first;
            return `${first} 双小批，${replen} 双追单`;
        }
        case 'image':
            return `${pairs} 双展示首铺`;
        case 'test':
            return `${pairs} 双小批试销`;
        case 'repeat':
            return `追单 ${pairs} 双`;
        default:
            return `${pairs} 双首铺`;
    }
}
