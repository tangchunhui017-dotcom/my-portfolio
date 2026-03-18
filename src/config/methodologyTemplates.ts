import { FOOTWEAR_CORE_METRICS } from '@/config/footwearLanguage';
import { THRESHOLDS } from '@/config/thresholds';

export type ThresholdValueType = 'ratio' | 'number';

export interface ThresholdRule {
    id: string;
    metric: string;
    valueType: ThresholdValueType;
    healthyLow: number | null;
    healthyHigh: number | null;
    warningLow: number | null;
    warningHigh: number | null;
    riskLow: number | null;
    riskHigh: number | null;
    note: string;
}

export interface FormulaRule {
    id: string;
    metric: string;
    displayUnit: string;
    formula: string;
    fields: string[];
    note: string;
}

export interface MethodologyTemplate {
    id: string;
    name: string;
    standard: string;
    description: string;
    builtIn: boolean;
    updatedAt: string;
    thresholds: ThresholdRule[];
    formulas: FormulaRule[];
}

type ThresholdOverride = Partial<
    Pick<
        ThresholdRule,
        'healthyLow' | 'healthyHigh' | 'warningLow' | 'warningHigh' | 'riskLow' | 'riskHigh' | 'note'
    >
>;

function cloneThresholdRules(rules: ThresholdRule[]) {
    return rules.map((rule) => ({ ...rule }));
}

function cloneFormulaRules(rules: FormulaRule[]) {
    return rules.map((rule) => ({ ...rule, fields: [...rule.fields] }));
}

function withThresholdOverrides(base: ThresholdRule[], overrides: Record<string, ThresholdOverride>) {
    return base.map((rule) => {
        const patch = overrides[rule.id];
        if (!patch) return { ...rule };
        return { ...rule, ...patch };
    });
}

function buildFormulaUnit(metricId: string) {
    if (['sell_through', 'discount_depth', 'discount_rate', 'margin_rate', 'gross_margin'].includes(metricId)) return '%';
    if (['retail_qty', 'active_sku', 'spu_depth'].includes(metricId)) return '双/款';
    if (['store_efficiency'].includes(metricId)) return '店均';
    if (['sell_ship_ratio', 'size_curve_fit_rate', 'core_size_sales_share', 'size_full_rate', 'size_stockout_rate'].includes(metricId)) return '%';
    return '金额';
}

const BASE_THRESHOLD_RULES: ThresholdRule[] = [
    {
        id: 'sell_through',
        metric: '售罄率',
        valueType: 'ratio',
        healthyLow: THRESHOLDS.sellThrough.target,
        healthyHigh: null,
        warningLow: THRESHOLDS.sellThrough.warning,
        warningHigh: null,
        riskLow: null,
        riskHigh: THRESHOLDS.sellThrough.danger,
        note: '越高越好，低于风险上限时优先处理库存和折扣。',
    },
    {
        id: 'margin_rate',
        metric: '毛利率',
        valueType: 'ratio',
        healthyLow: THRESHOLDS.marginRate.target,
        healthyHigh: null,
        warningLow: THRESHOLDS.marginRate.warning,
        warningHigh: null,
        riskLow: null,
        riskHigh: THRESHOLDS.marginRate.danger,
        note: '越高越好，低毛利品类需先查折扣与成本。',
    },
    {
        id: 'discount_depth',
        metric: '折扣深度',
        valueType: 'ratio',
        healthyLow: null,
        healthyHigh: THRESHOLDS.discountDepth.good,
        warningLow: null,
        warningHigh: THRESHOLDS.discountDepth.warning,
        riskLow: THRESHOLDS.discountDepth.danger,
        riskHigh: null,
        note: '越低越好，风险下限以上代表促销侵蚀毛利。',
    },
    {
        id: 'on_hand_unit',
        metric: '剩余库存',
        valueType: 'number',
        healthyLow: null,
        healthyHigh: THRESHOLDS.onHandUnit.high,
        warningLow: null,
        warningHigh: THRESHOLDS.onHandUnit.critical,
        riskLow: THRESHOLDS.onHandUnit.critical,
        riskHigh: null,
        note: '库存高于风险下限时需调拨或清货动作。',
    },
    {
        id: 'top10_concentration',
        metric: 'Top10 SKU集中度',
        valueType: 'ratio',
        healthyLow: null,
        healthyHigh: THRESHOLDS.top10Concentration.warning,
        warningLow: null,
        warningHigh: THRESHOLDS.top10Concentration.danger,
        riskLow: THRESHOLDS.top10Concentration.danger,
        riskHigh: null,
        note: '过度集中会导致结构脆弱，需分散主力SKU。',
    },
    {
        id: 'channel_concentration',
        metric: '渠道集中度',
        valueType: 'ratio',
        healthyLow: null,
        healthyHigh: THRESHOLDS.channelConcentration.warning,
        warningLow: null,
        warningHigh: 0.72,
        riskLow: 0.72,
        riskHigh: null,
        note: '单渠道占比过高会放大渠道风险。',
    },
    {
        id: 'sell_ship_ratio',
        metric: '销发比',
        valueType: 'ratio',
        healthyLow: 0.35,
        healthyHigh: 0.75,
        warningLow: 0.25,
        warningHigh: 0.85,
        riskLow: 0.85,
        riskHigh: 0.25,
        note: '双边阈值：过低代表配货积压，过高先排查缺货后再追加。',
    },
    {
        id: 'sku_utilization',
        metric: 'SKU利用率',
        valueType: 'ratio',
        healthyLow: 0.85,
        healthyHigh: null,
        warningLow: 0.55,
        warningHigh: null,
        riskLow: null,
        riskHigh: 0.55,
        note: '动销SKU/企划SKU，越高代表企划转化效率越好。',
    },
    {
        id: 'stockout_rate',
        metric: '断码率',
        valueType: 'ratio',
        healthyLow: null,
        healthyHigh: 0.25,
        warningLow: null,
        warningHigh: 0.35,
        riskLow: 0.35,
        riskHigh: null,
        note: '断码高时优先补核心尺码并调拨热区。',
    },
    {
        id: 'size_curve_fit_rate',
        metric: '尺码配比达成率',
        valueType: 'ratio',
        healthyLow: 0.8,
        healthyHigh: null,
        warningLow: 0.65,
        warningHigh: null,
        riskLow: null,
        riskHigh: 0.65,
        note: '越高越好，低于阈值说明尺码结构与需求偏离。',
    },
];

const BASE_FORMULA_RULES: FormulaRule[] = FOOTWEAR_CORE_METRICS.map((metric) => ({
    id: metric.id,
    metric: metric.name,
    displayUnit: buildFormulaUnit(metric.id),
    formula: metric.formula,
    fields: [],
    note: metric.note,
}));

const BALANCED_TEMPLATE: MethodologyTemplate = {
    id: 'footwear-balanced-v1',
    name: '鞋类平衡体系 v1',
    standard: 'Balanced',
    description: '默认体系：兼顾规模、毛利和库存健康，适合作为看板基础模板。',
    builtIn: true,
    updatedAt: '2026-02-26',
    thresholds: cloneThresholdRules(BASE_THRESHOLD_RULES),
    formulas: cloneFormulaRules(BASE_FORMULA_RULES),
};

const GROWTH_TEMPLATE: MethodologyTemplate = {
    id: 'footwear-growth-v1',
    name: '鞋类增长优先体系 v1',
    standard: 'Growth First',
    description: '适合增量阶段：放宽效率红线，优先看规模和渗透。',
    builtIn: true,
    updatedAt: '2026-02-26',
    thresholds: withThresholdOverrides(BASE_THRESHOLD_RULES, {
        sell_through: { healthyLow: 0.76, warningLow: 0.62, riskHigh: 0.48 },
        margin_rate: { healthyLow: 0.42, warningLow: 0.37, riskHigh: 0.32 },
        discount_depth: { healthyHigh: 0.12, warningHigh: 0.18, riskLow: 0.23 },
        on_hand_unit: { healthyHigh: 240, warningHigh: 560, riskLow: 560 },
        top10_concentration: { healthyHigh: 0.65, warningHigh: 0.78, riskLow: 0.78 },
        channel_concentration: { healthyHigh: 0.65, warningHigh: 0.75, riskLow: 0.75 },
        sell_ship_ratio: { healthyLow: 0.32, healthyHigh: 0.8, warningLow: 0.22, warningHigh: 0.9, riskLow: 0.9, riskHigh: 0.22 },
        sku_utilization: { healthyLow: 0.8, warningLow: 0.5, riskHigh: 0.5 },
        stockout_rate: { healthyHigh: 0.3, warningHigh: 0.4, riskLow: 0.4 },
        size_curve_fit_rate: { healthyLow: 0.75, warningLow: 0.6, riskHigh: 0.6 },
    }),
    formulas: cloneFormulaRules(BASE_FORMULA_RULES),
};

const PROFIT_TEMPLATE: MethodologyTemplate = {
    id: 'footwear-profit-v1',
    name: '鞋类利润优先体系 v1',
    standard: 'Profit First',
    description: '适合利润修复阶段：严格折扣与毛利阈值，控制结构风险。',
    builtIn: true,
    updatedAt: '2026-02-26',
    thresholds: withThresholdOverrides(BASE_THRESHOLD_RULES, {
        sell_through: { healthyLow: 0.82, warningLow: 0.68, riskHigh: 0.55 },
        margin_rate: { healthyLow: 0.48, warningLow: 0.43, riskHigh: 0.38 },
        discount_depth: { healthyHigh: 0.09, warningHigh: 0.13, riskLow: 0.18 },
        on_hand_unit: { healthyHigh: 180, warningHigh: 420, riskLow: 420 },
        top10_concentration: { healthyHigh: 0.55, warningHigh: 0.68, riskLow: 0.68 },
        channel_concentration: { healthyHigh: 0.55, warningHigh: 0.66, riskLow: 0.66 },
        sell_ship_ratio: { healthyLow: 0.4, healthyHigh: 0.72, warningLow: 0.3, warningHigh: 0.82, riskLow: 0.82, riskHigh: 0.3 },
        sku_utilization: { healthyLow: 0.88, warningLow: 0.62, riskHigh: 0.62 },
        stockout_rate: { healthyHigh: 0.2, warningHigh: 0.28, riskLow: 0.28 },
        size_curve_fit_rate: { healthyLow: 0.84, warningLow: 0.7, riskHigh: 0.7 },
    }),
    formulas: cloneFormulaRules(BASE_FORMULA_RULES),
};

export const BUILTIN_METHODOLOGY_TEMPLATES: MethodologyTemplate[] = [
    BALANCED_TEMPLATE,
    GROWTH_TEMPLATE,
    PROFIT_TEMPLATE,
];

export function cloneMethodologyTemplate(template: MethodologyTemplate): MethodologyTemplate {
    return {
        ...template,
        thresholds: cloneThresholdRules(template.thresholds),
        formulas: cloneFormulaRules(template.formulas),
    };
}
