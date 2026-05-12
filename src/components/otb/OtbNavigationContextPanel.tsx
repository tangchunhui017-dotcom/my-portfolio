'use client';

import { formatCurrency } from '@/utils/otbCalculations';
import type { OtbNavigationContext } from './types';

const MODULE_LABELS: Record<string, string> = {
    annual: '年度总控',
    monthly: '月度滚动',
    wave: '波段预算',
    category: '品类&款深',
    pricestructure: '价格&结构',
    channel: '渠道分配',
    execution: '执行跟踪',
    import: '数据导入',
    cashflow: '现金流',
    forecast: '销售预测',
    inventory: '库存健康',
    'profit-loss': '损益',
    planning: '波段企划',
};

type ImpactKind = 'money' | 'percent' | 'number';
type ImpactTone = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose';

interface ImpactDefinition {
    key: keyof OtbNavigationContext;
    label: string;
    kind: ImpactKind;
    unit?: string;
    tone?: ImpactTone;
}

const IMPACT_DEFINITIONS: ImpactDefinition[] = [
    { key: 'otbBudget',              label: 'OTB预算',   kind: 'money', tone: 'slate' },
    { key: 'otbUsed',                label: '已用OTB',   kind: 'money', tone: 'sky' },
    { key: 'otbVariance',            label: '预算偏差',   kind: 'money' },
    { key: 'orderedAmount',          label: '已下单',     kind: 'money', tone: 'sky' },
    { key: 'deliveredAmount',        label: '已到货',     kind: 'money', tone: 'emerald' },
    { key: 'purchasePayment',        label: '采购付款',   kind: 'money', tone: 'amber' },
    { key: 'cashGap',                label: '现金缺口',   kind: 'money', tone: 'rose' },
    { key: 'freezeAmount',           label: '冻结金额',   kind: 'money', tone: 'rose' },
    { key: 'forecastSales',          label: '预测销售',   kind: 'money', tone: 'sky' },
    { key: 'forecastGap',            label: '预测缺口',   kind: 'money' },
    { key: 'inventoryRiskAmount',    label: '库存风险',   kind: 'money', tone: 'amber' },
    { key: 'profitImpact',           label: '损益影响',   kind: 'money' },
    { key: 'grossMargin',            label: '毛利率',     kind: 'percent', tone: 'emerald' },
    { key: 'markdownRisk',           label: '折扣风险',   kind: 'percent', tone: 'amber' },
    { key: 'wos',                    label: 'WOS',        kind: 'number', unit: '周', tone: 'slate' },
    { key: 'plannedSkuCount',        label: '计划SKU',    kind: 'number', unit: '款', tone: 'slate' },
    { key: 'skuLimit',               label: 'SKU上限',    kind: 'number', unit: '款', tone: 'slate' },
    { key: 'skuWidth',               label: 'SKU宽度',    kind: 'number', unit: '款', tone: 'slate' },
    { key: 'averageDepth',           label: '平均深度',   kind: 'number', tone: 'slate' },
    { key: 'inventorySupportRate',   label: '库存支撑率', kind: 'percent', tone: 'emerald' },
    { key: 'sizeCompleteness',       label: '尺码完整率', kind: 'percent', tone: 'emerald' },
];

const TONE_CLASS: Record<ImpactTone, string> = {
    slate:   'bg-white text-slate-700 border-slate-200',
    sky:     'bg-sky-50 text-sky-700 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
    rose:    'bg-rose-50 text-rose-700 border-rose-100',
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function formatImpactValue(value: number, kind: ImpactKind, unit?: string): string {
    if (kind === 'money') return formatCurrency(value, 'wan');
    if (kind === 'percent') return `${(value * 100).toFixed(Math.abs(value) < 0.1 ? 1 : 0)}%`;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit ?? ''}`;
}

function resolveTone(definition: ImpactDefinition, value: number): ImpactTone {
    if (definition.tone) return definition.tone;
    if (definition.key === 'profitImpact') return value >= 0 ? 'emerald' : 'rose';
    if (definition.key === 'otbVariance' || definition.key === 'forecastGap') return value > 0 ? 'rose' : 'amber';
    return 'slate';
}

function moduleLabel(moduleKey?: string): string {
    if (!moduleKey) return '目标模块';
    return MODULE_LABELS[moduleKey] ?? moduleKey;
}

function targetHint(targetModule: string | undefined, context: OtbNavigationContext): string {
    const target = targetModule ?? context.targetModule;
    if (target === 'cashflow') return '现金流页优先核对采购付款、现金缺口和冻结金额。';
    if (target === 'forecast') return '销售预测页优先校准预测销售、预测缺口和补货建议。';
    if (target === 'inventory') return '库存健康页优先查看库存风险、WOS、尺码完整率和支撑率。';
    if (target === 'profit-loss') return '损益页优先复核毛利率、折扣风险和利润影响。';
    if (target === 'monthly') return '月度滚动页优先回写剩余 OTB 和预算偏差。';
    if (target === 'wave' || target === 'planning') return '波段页优先重分配波段预算、SKU宽度和平均深度。';
    if (target === 'category') return '品类页优先核对品类预算、款深和价格带结构。';
    if (target === 'channel') return '渠道页优先核对渠道分配和库存支撑。';
    return '目标模块可按该对象继续钻取并回写 OTB 预算决策。';
}

function contextTime(createdAt?: string): string | null {
    if (!createdAt) return null;
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(2, '0')} ${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

export default function OtbNavigationContextPanel({
    context,
    targetModule,
    onClear,
    className = '',
}: {
    context: OtbNavigationContext | null;
    targetModule?: string;
    onClear?: () => void;
    className?: string;
}) {
    if (!context) return null;

    const impactItems = IMPACT_DEFINITIONS
        .map(definition => {
            const value = context[definition.key];
            if (!isFiniteNumber(value)) return null;
            const tone = resolveTone(definition, value);
            return {
                ...definition,
                value,
                tone,
                formatted: formatImpactValue(value, definition.kind, definition.unit),
            };
        })
        .filter((item): item is ImpactDefinition & { value: number; tone: ImpactTone; formatted: string } => item !== null);

    const scopeItems = [
        context.subject ? { label: '对象', value: context.subject } : null,
        context.waveName || context.waveId ? { label: '波段', value: context.waveName ?? context.waveId } : null,
        context.category ? { label: '品类', value: context.category } : null,
        context.channel ? { label: '渠道', value: context.channel } : null,
        context.region ? { label: '区域', value: context.region } : null,
        context.storeType ? { label: '门店', value: context.storeType } : null,
        context.skuId ? { label: 'SKU', value: context.skuId } : null,
        context.styleId ? { label: '款号', value: context.styleId } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);

    const resolvedTarget = targetModule ?? context.targetModule;
    const createdTime = contextTime(context.createdAt);

    return (
        <div className={`rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-xs text-slate-700 ${className}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">来自 OTB 的联动上下文</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-sky-700 border border-sky-100">
                            目标：{moduleLabel(resolvedTarget)}
                        </span>
                        {context.riskLevel && (
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                context.riskLevel === 'P0' ? 'bg-rose-600 text-white' :
                                context.riskLevel === 'P1' ? 'bg-amber-500 text-white' :
                                'bg-slate-200 text-slate-600'
                            }`}>
                                {context.riskLevel}
                            </span>
                        )}
                        {context.riskTag && (
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                {context.riskTag}
                            </span>
                        )}
                        {createdTime && <span className="text-[10px] text-slate-400">写入 {createdTime}</span>}
                    </div>
                    {scopeItems.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {scopeItems.map(item => (
                                <span key={`${item.label}-${item.value}`} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 border border-slate-200">
                                    <span className="text-slate-400">{item.label}</span> {item.value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {onClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                    >
                        清除联动
                    </button>
                )}
            </div>

            {impactItems.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
                    {impactItems.map(item => (
                        <div key={item.key} className={`rounded-lg border px-2.5 py-1.5 ${TONE_CLASS[item.tone]}`}>
                            <div className="text-[10px] opacity-70">{item.label}</div>
                            <div className="mt-0.5 font-semibold">{item.formatted}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-sky-100 pt-2 text-[11px] text-slate-500">
                {context.recommendedAction && (
                    <span className="font-medium text-slate-700">建议动作：{context.recommendedAction}</span>
                )}
                {context.replenishmentSuggestion && <span>{context.replenishmentSuggestion}</span>}
                <span>{targetHint(resolvedTarget, context)}</span>
            </div>
        </div>
    );
}
