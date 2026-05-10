'use client';

import type { AnnualOTBResult } from '@/utils/otbCalculations';
import { formatCurrency, type CurrencyUnit } from '@/utils/otbCalculations';

interface Props {
    result: AnnualOTBResult;
    currencyUnit: CurrencyUnit;
    savedAt: string | null;
    hasUnsavedChanges: boolean;
    onJumpToTab?: (tab: 'wave' | 'price' | 'category' | 'channel' | 'execution' | 'cashflow') => void;
}

type SyncStatus = 'synced' | 'pending' | 'diff' | 'risk';

interface DownstreamModule {
    key: string;
    label: string;
    desc: string;
    status: SyncStatus;
    detail?: string;
}

const STATUS_CONFIG: Record<SyncStatus, { label: string; color: string; bg: string; dot: string }> = {
    synced:  { label: '已同步',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' },
    pending: { label: '待生成',   color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-100',     dot: 'bg-slate-300' },
    diff:    { label: '待同步',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100',     dot: 'bg-amber-500' },
    risk:    { label: '高风险',   color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-100',       dot: 'bg-rose-500' },
};

function getModuleStatus(key: string, hasSaved: boolean, hasUnsaved: boolean, budgetGap: number | null): SyncStatus {
    if (!hasSaved) return 'pending';
    if (hasUnsaved) return 'diff';
    if (budgetGap !== null && budgetGap > 0 && ['wave', 'category', 'cashflow'].includes(key)) return 'risk';
    return 'synced';
}

export default function AnnualOTBDownstreamStatus({ result, currencyUnit, savedAt, hasUnsavedChanges, onJumpToTab }: Props) {
    const fc = (value: number | null | undefined) => formatCurrency(value, currencyUnit);
    const hasSaved = savedAt !== null;

    const modules: DownstreamModule[] = [
        {
            key: 'wave',
            label: '波段拆解',
            desc: '年度四季目标向波段销售目标与波段OTB传递',
            status: getModuleStatus('wave', hasSaved, hasUnsavedChanges, result.budgetGap),
            detail: `SS ${fc(result.ssSalesTarget)} · AW ${fc(result.awSalesTarget)}`,
        },
        {
            key: 'price',
            label: '价格&结构',
            desc: '年度销售目标向价格带、货品角色和新品结构传递',
            status: getModuleStatus('price', hasSaved, hasUnsavedChanges, result.budgetGap),
        },
        {
            key: 'category',
            label: '品类/款深',
            desc: '净OTB向品类款数、SKU、均深和投产金额传递',
            status: getModuleStatus('category', hasSaved, hasUnsavedChanges, result.budgetGap),
            detail: `净OTB ${fc(result.annualNewProductInvestmentBudget)}`,
        },
        {
            key: 'channel',
            label: '渠道模型',
            desc: '年度目标向直营、电商、加盟、直播等渠道结构传递',
            status: getModuleStatus('channel', hasSaved, hasUnsavedChanges, result.budgetGap),
        },
        {
            key: 'execution',
            label: '执行跟踪',
            desc: '采购预算向开发、定价、下单、到货节点传递',
            status: getModuleStatus('execution', hasSaved, hasUnsavedChanges, result.budgetGap),
        },
        {
            key: 'cashflow',
            label: '现金流',
            desc: 'OTB付款节奏与销售回款计划联动',
            status: getModuleStatus('cashflow', hasSaved, hasUnsavedChanges, result.budgetGap),
            detail: result.budgetGap !== null && result.budgetGap > 0 ? '预算缺口会放大现金流压力' : undefined,
        },
    ];

    const riskCount = modules.filter(item => item.status === 'risk').length;
    const diffCount = modules.filter(item => item.status === 'diff' || item.status === 'risk').length;

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800">下游承接状态</h3>
                    {riskCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-medium">
                            {riskCount}项高风险
                        </span>
                    )}
                    {riskCount === 0 && diffCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 font-medium">
                            {diffCount}项待同步
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    {!hasSaved && <span>年度OTB尚未保存</span>}
                    {hasSaved && hasUnsavedChanges && <span className="text-amber-500">有未保存变更，保存后下游重新同步</span>}
                    {hasSaved && !hasUnsavedChanges && <span className="text-emerald-600">已保存 {savedAt}</span>}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-slate-100">
                {modules.map(item => {
                    const config = STATUS_CONFIG[item.status];
                    const isClickable = !!onJumpToTab;
                    return (
                        <div
                            key={item.key}
                            className={`px-4 py-3.5 ${isClickable ? 'cursor-pointer hover:bg-slate-50/60 transition-colors' : ''}`}
                            onClick={isClickable ? () => onJumpToTab!(item.key as 'wave' | 'price' | 'category' | 'channel' | 'execution' | 'cashflow') : undefined}
                        >
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                {isClickable && <span className="text-[9px] text-slate-300">→</span>}
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${config.bg} ${config.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                {config.label}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">{item.desc}</p>
                            {item.detail && (
                                <p className={`text-[10px] mt-1 font-medium ${item.status === 'risk' ? 'text-rose-600' : 'text-slate-500'}`}>
                                    {item.detail}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {!hasSaved && (
                <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/40 text-[11px] text-slate-500">
                    保存年度OTB方案后，下游模块会按最新年度目标重新生成同步状态。
                </div>
            )}
        </div>
    );
}
