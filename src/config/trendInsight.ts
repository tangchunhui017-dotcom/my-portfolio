import type { TrendCycle, TrendSourceType, TrendStatus, TrendType } from '@/types/trendInsightTypes';

export const TREND_STATUS_OPTIONS: TrendStatus[] = ['主推', '辅助', '快反测试', '观望', '放弃'];

export const TREND_STATUS_STYLES: Record<TrendStatus, string> = {
    主推: 'bg-emerald-600 text-white',
    辅助: 'bg-blue-500 text-white',
    快反测试: 'bg-orange-500 text-white',
    观望: 'bg-amber-400 text-white',
    放弃: 'bg-slate-200 text-slate-500',
};

export const TREND_STATUS_BADGE_STYLES: Record<TrendStatus, string> = {
    主推: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    辅助: 'bg-blue-100 text-blue-700 border-blue-200',
    快反测试: 'bg-orange-100 text-orange-700 border-orange-200',
    观望: 'bg-amber-100 text-amber-700 border-amber-200',
    放弃: 'bg-slate-100 text-slate-500 border-slate-200',
};

export const TREND_TYPE_OPTIONS: Array<{ value: TrendType | ''; label: string }> = [
    { value: '', label: '全部类型' },
    { value: '宏观趋势', label: '宏观趋势' },
    { value: '短时流行', label: '短时流行' },
    { value: '材料趋势', label: '材料趋势' },
    { value: '设计细节', label: '设计细节' },
];

export const TREND_CYCLE_OPTIONS: Array<{ value: TrendCycle | ''; label: string }> = [
    { value: '', label: '全部周期' },
    { value: '年度', label: '年度' },
    { value: '跨季', label: '跨季' },
    { value: '季节性', label: '季节性' },
    { value: '快反', label: '快反' },
];

export const TREND_SOURCE_OPTIONS: Array<{ value: TrendSourceType | ''; label: string }> = [
    { value: '', label: '全部来源' },
    { value: '数据工具', label: '数据工具' },
    { value: '展会', label: '展会' },
    { value: '时装周', label: '时装周' },
    { value: '社媒平台', label: '社媒平台' },
    { value: '杂志', label: '杂志' },
];

export const TREND_ADAPT_STATUS_OPTIONS: Array<{ value: TrendStatus | ''; label: string }> = [
    { value: '', label: '全部状态' },
    ...TREND_STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
];

export function getTrendFitScore({
    brandFit,
    conversionPotential,
    designInnovation,
    landingRisk,
}: {
    brandFit: number;
    conversionPotential: number;
    designInnovation: number;
    landingRisk: number;
}) {
    return brandFit * 0.3 + conversionPotential * 0.3 + designInnovation * 0.2 + (10 - landingRisk) * 0.2;
}
