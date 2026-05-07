'use client';
/**
 * src/components/otb/panels/WaveOTBPlanningPanel.tsx
 * 季节/波段拆解 — 表格视图 + 时间轴视图
 */
import { useState, useMemo, useCallback } from 'react';
import {
    calcWaveOTB,
    formatCurrency,
    formatQty,
    safeNumber,
    type CurrencyUnit,
    type WaveOTBInput,
    type WaveOTBRow,
} from '@/utils/otbCalculations';

interface Props {
    currencyUnit: CurrencyUnit;
    ssSeasonSalesTarget: number;
    awSeasonSalesTarget: number;
    waves: WaveOTBInput[];
    onWavesChange: (waves: WaveOTBInput[]) => void;
}

const MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function WaveNumberInput({ value, onChange, step = 1, width = 'w-16' }: { value: number; onChange: (value: number) => void; step?: number; width?: string }) {
    return (
        <input
            type="number"
            value={value}
            step={step}
            onChange={event => onChange(parseFloat(event.target.value) || 0)}
            className={`${width} text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none`}
        />
    );
}

function WaveTextInput({ value, onChange, width = 'w-28' }: { value: string; onChange: (value: string) => void; width?: string }) {
    return (
        <input
            type="text"
            value={value}
            onChange={event => onChange(event.target.value)}
            className={`${width} text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none`}
        />
    );
}

function WaveSeasonTable({
    seasonRows,
    label,
    rows,
    updateWave,
    fc,
}: {
    seasonRows: WaveOTBRow[];
    label: string;
    rows: WaveOTBRow[];
    updateWave: (idx: number, field: keyof WaveOTBInput, value: number | string) => void;
    fc: (value: number | null | undefined) => string;
}) {
    const globalIdx = (row: WaveOTBRow) => rows.indexOf(row);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${label === '春夏 SS' ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'}`}>{label}</span>
                <span className="text-xs text-slate-400">销售目标：{fc(seasonRows[0]?.seasonSalesTarget)}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-max text-xs w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {['波段', '上市日期', '上市月份', '节日/推广', '销售占比', '预测销售额', '款数', '均深', '主推品类', '到货月份', '到货建议', '新品占比', '翻单占比', '旧品占比', '消化率', 'OTB预算'].map((header, i) => (
                                <th key={header} className={`py-2 px-3 text-slate-400 font-medium whitespace-nowrap ${i > 0 ? 'text-right' : 'text-left'}`}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {seasonRows.map(row => {
                            const idx = globalIdx(row);
                            const arrivalMonth = safeNumber(row.arrivalMonth) ?? Math.max(1, row.launchMonth - 1);
                            return (
                                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">{row.seasonLabel} {row.wave}</td>
                                    <td className="py-2 px-3 text-right text-slate-500 whitespace-nowrap">{row.launchDate}</td>
                                    <td className="py-2 px-3 text-right">{MONTH_LABELS[row.launchMonth]}</td>
                                    <td className="py-2 px-3 text-right text-slate-500">{row.promotion}</td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={parseFloat((row.salesRatio * 100).toFixed(1))} step={0.5} onChange={value => updateWave(idx, 'salesRatio', value / 100)} />
                                    </td>
                                    <td className="py-2 px-3 text-right font-medium">{fc(row.plannedSalesAmount)}</td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={safeNumber(row.plannedStyleCount) ?? 0} onChange={value => updateWave(idx, 'plannedStyleCount', Math.max(0, Math.round(value)))} width="w-14" />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={safeNumber(row.averageDepth) ?? 0} step={10} onChange={value => updateWave(idx, 'averageDepth', Math.max(0, Math.round(value)))} width="w-16" />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveTextInput value={row.mainCategory ?? ''} onChange={value => updateWave(idx, 'mainCategory', value)} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={arrivalMonth} onChange={value => updateWave(idx, 'arrivalMonth', Math.min(12, Math.max(1, Math.round(value))))} width="w-14" />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveTextInput value={row.arrivalSuggestion ?? `${MONTH_LABELS[arrivalMonth]}前到货80%`} onChange={value => updateWave(idx, 'arrivalSuggestion', value)} width="w-40" />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={parseFloat((row.newProductRatio * 100).toFixed(1))} onChange={value => updateWave(idx, 'newProductRatio', value / 100)} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={parseFloat((row.repeatOrderRatio * 100).toFixed(1))} onChange={value => updateWave(idx, 'repeatOrderRatio', value / 100)} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={parseFloat((row.carryoverRatio * 100).toFixed(1))} onChange={value => updateWave(idx, 'carryoverRatio', value / 100)} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={parseFloat((row.sellThroughTarget * 100).toFixed(1))} onChange={value => updateWave(idx, 'sellThroughTarget', value / 100)} />
                                    </td>
                                    <td className={`py-2 px-3 text-right font-semibold ${(safeNumber(row.otbBudget) ?? 0) > 0 ? 'text-sky-700' : 'text-slate-400'}`}>{fc(row.otbBudget)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-50 font-semibold text-xs">
                            <td className="py-2 px-3">合计</td>
                            <td colSpan={4} />
                            <td className="py-2 px-3 text-right">{fc(seasonRows.reduce((sum, row) => sum + row.plannedSalesAmount, 0))}</td>
                            <td className="py-2 px-3 text-right">{formatQty(seasonRows.reduce((sum, row) => sum + (safeNumber(row.plannedStyleCount) ?? 0), 0))}</td>
                            <td colSpan={8} />
                            <td className="py-2 px-3 text-right text-sky-700">{fc(seasonRows.reduce((sum, row) => sum + (row.otbBudget ?? 0), 0))}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default function WaveOTBPlanningPanel({ currencyUnit, ssSeasonSalesTarget, awSeasonSalesTarget, waves, onWavesChange }: Props) {
    const [view, setView] = useState<'table' | 'timeline'>('table');

    const updateWave = useCallback((idx: number, field: keyof WaveOTBInput, value: number | string) => {
        onWavesChange(waves.map((wave, i) => i === idx ? { ...wave, [field]: value } : wave));
    }, [onWavesChange, waves]);

    const rows = useMemo(
        () => calcWaveOTB(waves, ssSeasonSalesTarget, awSeasonSalesTarget),
        [waves, ssSeasonSalesTarget, awSeasonSalesTarget],
    );

    const fc = (value: number | null | undefined) => formatCurrency(value, currencyUnit);

    const ssRows = rows.filter(row => row.season === 'SS');
    const awRows = rows.filter(row => row.season === 'AW');

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                {(['table', 'timeline'] as const).map(item => (
                    <button
                        key={item}
                        onClick={() => setView(item)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${view === item ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'}`}
                    >
                        {item === 'table' ? '表格视图' : '时间轴视图'}
                    </button>
                ))}
                <span className="text-xs text-slate-400 ml-2">SS目标 {fc(ssSeasonSalesTarget)} · AW目标 {fc(awSeasonSalesTarget)}</span>
            </div>

            {view === 'table' && (
                <>
                    <WaveSeasonTable seasonRows={ssRows} label="春夏 SS" rows={rows} updateWave={updateWave} fc={fc} />
                    <WaveSeasonTable seasonRows={awRows} label="秋冬 AW" rows={rows} updateWave={updateWave} fc={fc} />
                </>
            )}

            {view === 'timeline' && (
                <div className="space-y-3">
                    <p className="text-xs text-slate-400">按上市月份排列，卡片展示销售目标、OTB预算、款数、均深、主推品类和到货节奏。</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        {[...rows].sort((a, b) => a.launchMonth - b.launchMonth).map(row => {
                            const arrivalMonth = safeNumber(row.arrivalMonth) ?? Math.max(1, row.launchMonth - 1);
                            return (
                                <div key={row.id} className={`rounded-xl border shadow-sm p-4 ${row.season === 'SS' ? 'bg-sky-50 border-sky-100' : 'bg-orange-50 border-orange-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-sm text-slate-800">{row.seasonLabel} {row.wave}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${row.season === 'SS' ? 'bg-sky-200 text-sky-800' : 'bg-orange-200 text-orange-800'}`}>{row.launchDate}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mb-2">{row.promotion}</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">销售目标</span>
                                            <span className="font-medium">{fc(row.plannedSalesAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">OTB预算</span>
                                            <span className="font-semibold text-sky-700">{fc(row.otbBudget)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">款数 / 均深</span>
                                            <span>{formatQty(row.plannedStyleCount)}款 / {formatQty(row.averageDepth)}双</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">主推品类</span>
                                            <span>{row.mainCategory ?? '--'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">到货月份</span>
                                            <span>{MONTH_LABELS[arrivalMonth]}</span>
                                        </div>
                                        <div className="text-[10px] rounded-lg bg-white/70 border border-white px-2 py-1 text-slate-600">
                                            {row.arrivalSuggestion ?? `${MONTH_LABELS[arrivalMonth]}前到货80%`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
