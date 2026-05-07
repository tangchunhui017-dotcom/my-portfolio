'use client';
/**
 * src/components/otb/panels/OTBExecutionTrackingPanel.tsx
 * 执行跟踪 — OTB执行状态监控
 */
import { useState, useMemo, useCallback } from 'react';
import { calcExecutionStatus, formatCurrency, formatPct, type CurrencyUnit, type ExecutionTrackingInput, type ExecutionStatus } from '@/utils/otbCalculations';
import defaultData from '../../../../data/otb/otb_execution_tracking.json';

interface Props { currencyUnit: CurrencyUnit; }

const STATUS_CONFIG: Record<ExecutionStatus, { bg: string; text: string; dot: string }> = {
    '未开始':  { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
    '计划中':  { bg: 'bg-sky-100',   text: 'text-sky-700',   dot: 'bg-sky-400' },
    '已审批':  { bg: 'bg-indigo-100',text: 'text-indigo-700',dot: 'bg-indigo-400' },
    '已下单':  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
    '已到货':  { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500' },
    '偏差预警':{ bg: 'bg-rose-100',  text: 'text-rose-700',  dot: 'bg-rose-500' },
    '已关闭':  { bg: 'bg-slate-200', text: 'text-slate-600', dot: 'bg-slate-500' },
};

const ALL_STATUSES: ExecutionStatus[] = ['未开始', '计划中', '已审批', '已下单', '已到货', '偏差预警', '已关闭'];

function ExecNumberInput({ value, onChange, step = 1 }: { value: number; onChange: (value: number) => void; step?: number }) {
    return (
        <input
            type="number"
            value={value}
            step={step}
            onChange={event => onChange(parseFloat(event.target.value) || 0)}
            className="w-20 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none"
        />
    );
}

export default function OTBExecutionTrackingPanel({ currencyUnit }: Props) {
    const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all');
    const [records, setRecords] = useState<ExecutionTrackingInput[]>(defaultData as ExecutionTrackingInput[]);
    const today = useMemo(() => new Date(), []);

    const allRows = useMemo(
        () => records.map(r => calcExecutionStatus(r, today)),
        [records, today],
    );

    const filtered = statusFilter === 'all' ? allRows : allRows.filter(r => r.status === statusFilter);

    const atRisk = allRows.filter(r => r.orderRisk || r.arrivalRisk || r.developmentGap || r.milestoneRisks.length > 0);

    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);

    const updateRecord = useCallback(<K extends keyof ExecutionTrackingInput>(id: string, field: K, value: ExecutionTrackingInput[K]) => {
        setRecords(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    }, []);

    // Status counts
    const counts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
        acc[s] = allRows.filter(r => r.status === s).length;
        return acc;
    }, {});

    return (
        <div className="space-y-5">
            {/* 风险预警区 */}
            {atRisk.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-5 py-4 space-y-2">
                    <p className="text-xs font-semibold text-rose-800">⚠️ 执行风险预警（{atRisk.length} 项）</p>
                    {atRisk.map(r => (
                        <div key={r.id} className="text-xs text-rose-700 flex flex-wrap gap-2">
                            <span className="font-medium">{r.season} {r.wave} · {r.categoryLabel}</span>
                            {r.orderRisk && <span className="bg-rose-100 px-2 py-0.5 rounded-full">下单率{formatPct(r.budgetExecutionRate)}偏低，距上市{r.daysToLaunch}天</span>}
                            {r.arrivalRisk && <span className="bg-rose-200 px-2 py-0.5 rounded-full">到货率{formatPct(r.arrivalExecutionRate)}偏低，距上市{r.daysToLaunch}天</span>}
                            {r.developmentGap && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">开发{r.developedStyleCount}款 &lt; 计划{r.plannedStyleCount}款</span>}
                            {r.milestoneRisks.map(risk => (
                                <span key={risk} className="bg-rose-100 px-2 py-0.5 rounded-full">{risk}</span>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* 状态筛选 */}
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusFilter === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                    全部 ({allRows.length})
                </button>
                {ALL_STATUSES.filter(s => counts[s] > 0).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === s ? `${cfg.bg} ${cfg.text} border-transparent` : 'bg-white text-slate-600 border-slate-200'}`}>
                            {s} ({counts[s]})
                        </button>
                    );
                })}
            </div>

            {/* 执行跟踪表 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">OTB执行跟踪明细</h3>
                    <p className="text-xs text-slate-400 mt-0.5">蓝底单元格可编辑，风险状态自动重算</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-max text-xs w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                {['状态', '季节/波段', '品类', '计划款', '已开发', '已定价', '已下单款', '计划采购额',
                                    '实际下单额', '已到货额', '预算执行率', '到货执行率', '概念截止', '核价截止', '下单截止', '入仓日', '上市日期', '距上市', '节点风险'].map((h, i) => (
                                    <th key={i} className={`py-2 px-3 text-slate-400 font-medium whitespace-nowrap ${i > 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(row => {
                                const cfg = STATUS_CONFIG[row.status];
                                const berRate = row.budgetExecutionRate ?? 0;
                                const aerRate = row.arrivalExecutionRate ?? 0;
                                return (
                                    <tr key={row.id} className={`border-b border-slate-50 hover:bg-slate-50/60 ${(row.orderRisk || row.arrivalRisk) ? 'bg-rose-50/20' : ''}`}>
                                        <td className="py-2 px-3">
                                            <select
                                                value={records.find(item => item.id === row.id)?.status ?? row.status}
                                                onChange={event => updateRecord(row.id, 'status', event.target.value as ExecutionStatus)}
                                                className={`text-[10px] rounded-full px-2 py-1 border border-transparent font-medium ${cfg.bg} ${cfg.text}`}
                                            >
                                                {ALL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-2 px-3 font-medium whitespace-nowrap">{row.season} {row.wave}</td>
                                        <td className="py-2 px-3 whitespace-nowrap">{row.categoryLabel}</td>
                                        <td className="py-2 px-2 text-right"><ExecNumberInput value={row.plannedStyleCount} onChange={value => updateRecord(row.id, 'plannedStyleCount', Math.max(0, Math.round(value)))} /></td>
                                        <td className={`py-2 px-2 text-right ${row.developmentGap ? 'text-amber-600 font-medium' : ''}`}><ExecNumberInput value={row.developedStyleCount} onChange={value => updateRecord(row.id, 'developedStyleCount', Math.max(0, Math.round(value)))} /></td>
                                        <td className="py-2 px-2 text-right"><ExecNumberInput value={row.pricedStyleCount} onChange={value => updateRecord(row.id, 'pricedStyleCount', Math.max(0, Math.round(value)))} /></td>
                                        <td className="py-2 px-2 text-right"><ExecNumberInput value={row.orderedStyleCount} onChange={value => updateRecord(row.id, 'orderedStyleCount', Math.max(0, Math.round(value)))} /></td>
                                        <td className="py-2 px-2 text-right"><ExecNumberInput value={row.plannedPurchaseAmount} step={100000} onChange={value => updateRecord(row.id, 'plannedPurchaseAmount', value)} /></td>
                                        <td className="py-2 px-2 text-right"><ExecNumberInput value={row.orderedAmount} step={100000} onChange={value => updateRecord(row.id, 'orderedAmount', value)} /></td>
                                        <td className="py-2 px-2 text-right"><ExecNumberInput value={row.arrivedAmount} step={100000} onChange={value => updateRecord(row.id, 'arrivedAmount', value)} /></td>
                                        <td className={`py-2 px-3 text-right font-medium ${berRate >= 0.90 ? 'text-emerald-600' : berRate >= 0.80 ? 'text-slate-600' : berRate > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                            {row.budgetExecutionRate !== null ? formatPct(row.budgetExecutionRate) : '--'}
                                        </td>
                                        <td className={`py-2 px-3 text-right font-medium ${aerRate >= 0.90 ? 'text-emerald-600' : aerRate >= 0.70 ? 'text-slate-600' : aerRate > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                            {row.arrivalExecutionRate !== null ? formatPct(row.arrivalExecutionRate) : '--'}
                                        </td>
                                        <td className={`py-2 px-3 text-right whitespace-nowrap ${row.designNodeRisk ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>{row.conceptDueDate}</td>
                                        <td className={`py-2 px-3 text-right whitespace-nowrap ${row.costingNodeRisk ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>{row.costingDueDate}</td>
                                        <td className={`py-2 px-3 text-right whitespace-nowrap ${row.orderNodeRisk ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>{row.orderDueDate}</td>
                                        <td className={`py-2 px-3 text-right whitespace-nowrap ${row.warehouseNodeRisk ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>{row.warehouseDueDate}</td>
                                        <td className="py-2 px-2 whitespace-nowrap text-slate-500">
                                            <input
                                                type="date"
                                                value={row.launchDate}
                                                onChange={event => updateRecord(row.id, 'launchDate', event.target.value)}
                                                className="text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none"
                                            />
                                        </td>
                                        <td className={`py-2 px-3 text-right whitespace-nowrap ${row.daysToLaunch < 0 ? 'text-slate-400' : row.daysToLaunch < 15 ? 'text-rose-600 font-medium' : row.daysToLaunch < 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                                            {row.daysToLaunch < 0 ? `已过 ${Math.abs(row.daysToLaunch)}天` : `${row.daysToLaunch}天`}
                                        </td>
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                            {row.milestoneRisks.length > 0 ? (
                                                <span className="text-rose-600 font-medium">{row.milestoneRisks.join(' / ')}</span>
                                            ) : (
                                                <span className="text-emerald-600">节点正常</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-sm text-slate-400">暂无符合条件的记录</div>
                )}
            </div>

            {/* 进度汇总 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: '计划总采购额', value: fc(allRows.reduce((s, r) => s + r.plannedPurchaseAmount, 0)) },
                    { label: '实际已下单额', value: fc(allRows.reduce((s, r) => s + r.orderedAmount, 0)) },
                    { label: '实际已到货额', value: fc(allRows.reduce((s, r) => s + r.arrivedAmount, 0)) },
                    { label: '节点/执行风险项', value: `${atRisk.length} 项`, tone: atRisk.length > 0 ? 'warn' : 'ok' },
                ].map((c, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                        <p className="text-xs text-slate-400">{c.label}</p>
                        <p className={`text-base font-bold mt-1 ${c.tone === 'warn' ? 'text-amber-600' : c.tone === 'ok' ? 'text-emerald-600' : 'text-slate-800'}`}>{c.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
