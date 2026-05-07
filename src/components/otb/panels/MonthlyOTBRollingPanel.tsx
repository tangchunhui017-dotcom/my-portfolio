'use client';
/**
 * src/components/otb/panels/MonthlyOTBRollingPanel.tsx
 * 月度OTB滚动 — 对应 Excel《OTB预算》
 */
import { useState, useMemo, useCallback } from 'react';
import { calcMonthlyOTB, formatCurrency, formatPct, type CurrencyUnit, type MonthlyOTBInput } from '@/utils/otbCalculations';
import defaultData from '../../../../data/otb/monthly_otb_plan.json';

interface Props { currencyUnit: CurrencyUnit; }

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
type PlanScenario = 'standard' | 'conservative' | 'optimistic';
const SCENARIOS: { key: PlanScenario; label: string }[] = [
    { key: 'conservative', label: '保守版' },
    { key: 'standard', label: '标准版' },
    { key: 'optimistic', label: '乐观版' },
];

function Th({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
    return (
        <th className={`text-xs font-medium text-slate-400 whitespace-nowrap py-2 px-2.5 text-right bg-slate-50 border-b border-slate-100 ${sticky ? 'sticky left-0 z-10 text-left bg-slate-50' : ''}`}>
            {children}
        </th>
    );
}

function EditableCell({ value, onChange, step = 0.01, min }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) {
    return (
        <input
            type="number"
            value={value}
            step={step}
            min={min}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-full min-w-[72px] text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
    );
}

export default function MonthlyOTBRollingPanel({ currencyUnit }: Props) {
    const [beginning, setBeginning] = useState<number>(defaultData.month1BeginningInventoryCost);
    const [inputs, setInputs] = useState<MonthlyOTBInput[]>(defaultData.months as MonthlyOTBInput[]);
    const [scenario, setScenario] = useState<PlanScenario>('standard');
    const [savedAt, setSavedAt] = useState<string>('');

    const updateRow = useCallback((idx: number, field: keyof MonthlyOTBInput, value: number) => {
        setInputs(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    }, []);

    const rows = useMemo(() => calcMonthlyOTB(inputs, beginning), [inputs, beginning]);

    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);
    const totalForecast = inputs.reduce((s, m) => s + m.salesForecast, 0);
    const totalActual = rows.reduce((s, r) => s + r.actualPurchaseRequiredAmount, 0);
    const totalOriginal = inputs.reduce((s, m) => s + m.originalPurchaseBudget, 0);
    const totalDiff = totalActual - totalOriginal;

    const diagnoses: string[] = [];
    const h1Forecast = inputs.slice(0, 4).reduce((s, m) => s + m.salesForecast, 0);
    const h1Plan = totalForecast * 0.36;
    if (h1Forecast < h1Plan * 0.85) {
        const catchUp = (totalForecast - h1Forecast) / (inputs.slice(4).reduce((s, m) => s + m.salesForecast, 0) || 1);
        diagnoses.push(`⚠️ 1-4月销售预测落后，后续月份需提升 ${formatPct(catchUp - 1)} 才能追平全年目标`);
    }
    if (totalDiff > totalOriginal * 0.1) {
        diagnoses.push(`📦 实际所需采购超预算 ${fc(totalDiff)}（${formatPct(totalDiff / totalOriginal)}），采购资金压力增加`);
    } else if (totalDiff < -totalOriginal * 0.1) {
        diagnoses.push(`💡 实际所需采购低于预算 ${fc(Math.abs(totalDiff))}，预算偏保守，可提前锁定优质货品`);
    }

    const loadScenario = useCallback((nextScenario: PlanScenario) => {
        setScenario(nextScenario);
        const raw = window.localStorage.getItem(`otb-monthly-plan-${nextScenario}`);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw) as { beginning?: number; inputs?: MonthlyOTBInput[]; savedAt?: string };
            if (typeof parsed.beginning === 'number') setBeginning(parsed.beginning);
            if (Array.isArray(parsed.inputs)) setInputs(parsed.inputs);
            setSavedAt(parsed.savedAt ?? '');
        } catch {
            setSavedAt('');
        }
    }, []);

    const saveScenario = useCallback(() => {
        const nextSavedAt = new Date().toLocaleString('zh-CN', { hour12: false });
        window.localStorage.setItem(`otb-monthly-plan-${scenario}`, JSON.stringify({ beginning, inputs, savedAt: nextSavedAt }));
        setSavedAt(nextSavedAt);
    }, [beginning, inputs, scenario]);

    const exportCsv = useCallback(() => {
        const headers = ['月份', '月初库存成本', '销售收入预测', '平均加价倍率', '促销折扣率', '吊牌销售额', '销售成本', '目标存销比', '月末目标库存', '采购需金额', '实际到货比例', '实际所需采购金额', '原预算', '差异金额', '差异率'];
        const body = rows.map((row, idx) => [
            MONTH_LABELS[idx],
            row.beginningInventoryCost,
            row.salesForecast,
            row.markupRate,
            row.discountRate,
            row.retailSalesAmount,
            row.salesCost,
            row.stockToSalesRatio,
            row.endingInventoryCost,
            row.purchaseRequiredAmount,
            row.arrivalRate,
            row.actualPurchaseRequiredAmount,
            row.originalPurchaseBudget,
            row.budgetDiff,
            row.budgetDiffRate ?? '',
        ]);
        const csv = [headers, ...body]
            .map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `otb-monthly-${scenario}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [rows, scenario]);

    return (
        <div className="space-y-5">
            {/* 汇总卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: '月初库存（1月）', value: fc(beginning), editable: true },
                    { label: '全年销售预测', value: fc(totalForecast) },
                    { label: '全年实际所需采购', value: fc(totalActual) },
                    { label: '全年预算差异', value: totalDiff !== 0 ? (totalDiff > 0 ? `▲ ${fc(totalDiff)}` : `▼ ${fc(Math.abs(totalDiff))}`) : '--', tone: totalDiff > 0 ? 'warn' : 'ok' },
                ].map((c, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                        <p className="text-xs text-slate-400">{c.label}</p>
                        {i === 0 ? (
                            <input
                                type="number"
                                value={beginning}
                                step={100000}
                                onChange={e => setBeginning(parseFloat(e.target.value) || 0)}
                                className="text-sm font-bold text-slate-800 w-full mt-1 bg-transparent border-b border-dashed border-slate-300 focus:outline-none"
                            />
                        ) : (
                            <p className={`text-base font-bold mt-1 ${c.tone === 'warn' ? 'text-amber-600' : c.tone === 'ok' ? 'text-emerald-600' : 'text-slate-800'}`}>{c.value}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* 月度滚动表格 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-800">月度OTB滚动计划</h3>
                        <p className="text-xs text-slate-400 mt-0.5">蓝底单元格可编辑，其余自动推算{savedAt ? ` · ${scenario} 已保存 ${savedAt}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] flex-wrap justify-end">
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                            {SCENARIOS.map(item => (
                                <button
                                    key={item.key}
                                    onClick={() => loadScenario(item.key)}
                                    className={`px-2.5 py-1 text-[10px] font-medium ${scenario === item.key ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={saveScenario} className="bg-sky-50 border border-sky-200 text-sky-700 px-2 py-1 rounded">保存方案</button>
                        <button onClick={exportCsv} className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded hover:border-sky-300">导出CSV</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-max text-xs text-slate-700 w-full">
                        <thead>
                            <tr>
                                <Th sticky>月份</Th>
                                <Th>月初库存(成本)</Th>
                                <Th>销售预测</Th>
                                <Th>倍率</Th>
                                <Th>折扣率</Th>
                                <Th>吊牌销售额</Th>
                                <Th>销售成本</Th>
                                <Th>存销比</Th>
                                <Th>月末目标库存</Th>
                                <Th>采购需金额</Th>
                                <Th>到货率</Th>
                                <Th>实际所需采购</Th>
                                <Th>原预算</Th>
                                <Th>差异</Th>
                                <Th>差异率</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const diffRate = row.budgetDiffRate ?? 0;
                                const isOver = row.budgetDiff > 0 && Math.abs(diffRate) > 0.05;
                                const isUnder = row.budgetDiff < 0 && Math.abs(diffRate) > 0.05;
                                return (
                                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/60">
                                        <td className="sticky left-0 bg-white z-10 py-2 px-2.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100">{MONTH_LABELS[idx]}</td>
                                        <td className="py-2 px-2.5 text-right whitespace-nowrap">{fc(row.beginningInventoryCost)}</td>
                                        <td className="py-2 px-2 text-right whitespace-nowrap"><EditableCell value={row.salesForecast} step={100000} onChange={v => updateRow(idx, 'salesForecast', v)} /></td>
                                        <td className="py-2 px-2 text-right whitespace-nowrap"><EditableCell value={row.markupRate} step={0.1} onChange={v => updateRow(idx, 'markupRate', v)} /></td>
                                        <td className="py-2 px-2 text-right whitespace-nowrap"><EditableCell value={parseFloat((row.discountRate * 100).toFixed(1))} step={0.5} onChange={v => updateRow(idx, 'discountRate', v / 100)} /></td>
                                        <td className="py-2 px-2.5 text-right whitespace-nowrap text-slate-500">{fc(row.retailSalesAmount)}</td>
                                        <td className="py-2 px-2.5 text-right whitespace-nowrap text-slate-500">{fc(row.salesCost)}</td>
                                        <td className="py-2 px-2 text-right whitespace-nowrap"><EditableCell value={row.stockToSalesRatio} step={0.5} min={1} onChange={v => updateRow(idx, 'stockToSalesRatio', v)} /></td>
                                        <td className="py-2 px-2.5 text-right whitespace-nowrap text-slate-500">{fc(row.endingInventoryCost)}</td>
                                        <td className="py-2 px-2.5 text-right whitespace-nowrap">{fc(row.purchaseRequiredAmount)}</td>
                                        <td className="py-2 px-2 text-right whitespace-nowrap"><EditableCell value={parseFloat((row.arrivalRate * 100).toFixed(1))} step={1} onChange={v => updateRow(idx, 'arrivalRate', v / 100)} /></td>
                                        <td className="py-2 px-2.5 text-right whitespace-nowrap font-medium">{fc(row.actualPurchaseRequiredAmount)}</td>
                                        <td className="py-2 px-2 text-right whitespace-nowrap"><EditableCell value={row.originalPurchaseBudget} step={100000} onChange={v => updateRow(idx, 'originalPurchaseBudget', v)} /></td>
                                        <td className={`py-2 px-2.5 text-right whitespace-nowrap font-medium ${isOver ? 'text-rose-600' : isUnder ? 'text-emerald-600' : 'text-slate-600'}`}>{fc(row.budgetDiff)}</td>
                                        <td className={`py-2 px-2.5 text-right whitespace-nowrap ${isOver ? 'text-rose-600' : isUnder ? 'text-emerald-600' : 'text-slate-600'}`}>{formatPct(row.budgetDiffRate)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-sky-50 font-semibold">
                                <td className="sticky left-0 bg-sky-50 z-10 py-2.5 px-2.5 text-slate-700 border-r border-sky-100">合计</td>
                                <td />
                                <td className="py-2.5 px-2.5 text-right">{fc(totalForecast)}</td>
                                <td /><td /><td /><td /><td /><td />
                                <td className="py-2.5 px-2.5 text-right">{fc(rows.reduce((s, r) => s + r.purchaseRequiredAmount, 0))}</td>
                                <td />
                                <td className="py-2.5 px-2.5 text-right text-sky-700">{fc(totalActual)}</td>
                                <td className="py-2.5 px-2.5 text-right">{fc(totalOriginal)}</td>
                                <td className={`py-2.5 px-2.5 text-right ${totalDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fc(totalDiff)}</td>
                                <td className={`py-2.5 px-2.5 text-right ${totalDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatPct(totalOriginal > 0 ? totalDiff / totalOriginal : null)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* 诊断 */}
            {diagnoses.map((d, i) => (
                <div key={i} className="px-4 py-3 rounded-xl text-xs bg-amber-50 border border-amber-100 text-amber-700">{d}</div>
            ))}
        </div>
    );
}
