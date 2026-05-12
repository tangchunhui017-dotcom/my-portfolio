'use client';
/**
 * src/components/otb/OtbFormulaBreakdown.tsx
 * OTB 核心公式展示组件 — 用于年度总控与月度滚动
 *
 * OTB 公式：
 *   OTB = 计划销售成本 + 目标期末库存 - 期初库存 - 在途库存 - 已下单未到货
 *   计划销售成本 = 计划销售额 × (1 - 目标毛利率)
 */
import type { CurrencyUnit } from '@/utils/otbCalculations';

interface OtbFormulaValues {
    /** 计划销售额（元） */
    plannedSales?: number;
    /** 目标毛利率（0~1） */
    targetGrossMargin?: number;
    /** 计划销售成本（元） */
    plannedCOGS?: number;
    /** 目标期末库存（元） */
    targetEndingInventory?: number;
    /** 期初库存（元） */
    beginningInventory?: number;
    /** 在途库存（元） */
    inTransitInventory?: number;
    /** 已下单未到货（元） */
    onOrderNotArrived?: number;
    /** 最终 OTB 预算（元） */
    otbBudget?: number;
    /** 货币单位 */
    currencyUnit?: CurrencyUnit;
}

interface OtbFormulaBreakdownProps {
    values?: OtbFormulaValues;
    /** 是否展开显示详细口径说明，默认 false */
    expanded?: boolean;
    /** 自定义 className */
    className?: string;
}

function fmtVal(v: number | undefined, unit: CurrencyUnit = 'wan'): string {
    if (v === undefined || isNaN(v)) return '—';
    if (unit === 'wan') {
        return `${(v / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 万元`;
    }
    if (unit === 'yi') {
        return `${(v / 100000000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 亿元`;
    }
    return `${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 元`;
}

function pct(v: number | undefined): string {
    if (v === undefined || isNaN(v)) return '—';
    return `${(v * 100).toFixed(1)}%`;
}

export default function OtbFormulaBreakdown({
    values = {},
    expanded = false,
    className = '',
}: OtbFormulaBreakdownProps) {
    const unit = values.currencyUnit ?? 'wan';
    const {
        plannedSales,
        targetGrossMargin,
        plannedCOGS,
        targetEndingInventory,
        beginningInventory,
        inTransitInventory,
        onOrderNotArrived,
        otbBudget,
    } = values;

    const derivedCOGS = plannedCOGS
        ?? (plannedSales !== undefined && targetGrossMargin !== undefined
            ? plannedSales * (1 - targetGrossMargin)
            : undefined);

    const derivedOTB = otbBudget
        ?? (derivedCOGS !== undefined
            && targetEndingInventory !== undefined
            && beginningInventory !== undefined
            && inTransitInventory !== undefined
            && onOrderNotArrived !== undefined
            ? derivedCOGS + targetEndingInventory - beginningInventory - inTransitInventory - onOrderNotArrived
            : undefined);

    const hasValues = derivedCOGS !== undefined || derivedOTB !== undefined || plannedSales !== undefined;

    return (
        <div className={`rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-700 font-semibold text-[11px] uppercase tracking-wide">OTB 核心公式</span>
                <span className="h-px flex-1 bg-blue-200" />
            </div>

            <div className="font-mono text-[12px] text-slate-700 leading-relaxed">
                <div className="flex flex-wrap gap-x-1 items-center">
                    <span className="font-bold text-blue-700">OTB</span>
                    <span className="text-slate-400">=</span>
                    <span className="text-emerald-700">计划销售成本</span>
                    <span className="text-slate-400">+</span>
                    <span className="text-indigo-700">目标期末库存</span>
                    <span className="text-slate-400">−</span>
                    <span className="text-orange-600">期初库存</span>
                    <span className="text-slate-400">−</span>
                    <span className="text-orange-500">在途库存</span>
                    <span className="text-slate-400">−</span>
                    <span className="text-orange-400">已下单未到货</span>
                </div>
                <div className="flex flex-wrap gap-x-1 items-center mt-1 text-[11px] text-slate-500">
                    <span className="text-emerald-700">计划销售成本</span>
                    <span className="text-slate-400">=</span>
                    <span>计划销售额</span>
                    <span className="text-slate-400">×</span>
                    <span>（1 − 目标毛利率）</span>
                </div>
            </div>

            {hasValues && (
                <div className="mt-3 border-t border-blue-200 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                        {plannedSales !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">计划销售额</span>
                                <span className="font-medium text-slate-700">{fmtVal(plannedSales, unit)}</span>
                            </div>
                        )}
                        {targetGrossMargin !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">目标毛利率</span>
                                <span className="font-medium text-slate-700">{pct(targetGrossMargin)}</span>
                            </div>
                        )}
                        {derivedCOGS !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-emerald-600">计划销售成本</span>
                                <span className="font-medium text-emerald-700">{fmtVal(derivedCOGS, unit)}</span>
                            </div>
                        )}
                        {targetEndingInventory !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-indigo-500">目标期末库存</span>
                                <span className="font-medium text-indigo-700">{fmtVal(targetEndingInventory, unit)}</span>
                            </div>
                        )}
                        {beginningInventory !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-orange-500">期初库存</span>
                                <span className="font-medium text-orange-700">−{fmtVal(beginningInventory, unit)}</span>
                            </div>
                        )}
                        {inTransitInventory !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-orange-400">在途库存</span>
                                <span className="font-medium text-orange-600">−{fmtVal(inTransitInventory, unit)}</span>
                            </div>
                        )}
                        {onOrderNotArrived !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-orange-300">已下单未到货</span>
                                <span className="font-medium text-orange-500">−{fmtVal(onOrderNotArrived, unit)}</span>
                            </div>
                        )}
                    </div>
                    {derivedOTB !== undefined && (
                        <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between items-center">
                            <span className="font-bold text-blue-700">OTB 可采购预算</span>
                            <span className="font-bold text-blue-800 text-sm">{fmtVal(derivedOTB, unit)}</span>
                        </div>
                    )}
                </div>
            )}

            {expanded && (
                <div className="mt-3 border-t border-blue-200 pt-2 text-[11px] text-slate-500 space-y-1">
                    <div>• <strong>计划销售成本</strong>：按计划销售额与目标综合毛利率换算，含税吊牌价口径</div>
                    <div>• <strong>在途库存</strong>：已发货但未入库（含海运/路运/快递在途）</div>
                    <div>• <strong>已下单未到货</strong>：已提交采购订单但未完成交货（含未来订单金额）</div>
                    <div>• <strong>期初/期末库存</strong>：均取成本价口径，不含在途</div>
                    <div>• OTB 为<strong>净可用预算上限</strong>，审批通过前不得超买</div>
                </div>
            )}
        </div>
    );
}
