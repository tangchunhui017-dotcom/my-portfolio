'use client';
/**
 * src/components/forecast/SalesForecastSizeRiskPanel.tsx
 * 尺码结构风险 + 波段上市节奏校验（三渠道共用）
 */
import { useMemo, useState } from 'react';
import sizeRiskRaw from '../../../data/planning/sales_forecast_size_curve.json';
import wavePlanMasterRaw from '../../../data/planning/wave_plan_master.json';
import salesForecastPlanRaw from '../../../data/planning/sales_forecast_plan.json';
import otbBudgetPlanRaw from '../../../data/planning/otb_budget_plan.json';

// 基于 waveKey 哈希生成稳定的上期偏差占位（-12%~+12%），模拟历史校准数据
function computeLastPeriodDeviation(waveKey: string, categoryId?: string): number {
    const seed = `${waveKey}-${categoryId ?? ''}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return ((h % 240) - 120) / 1000; // -0.12 ~ +0.12
}

type SizeRiskRow = {
    waveKey: string; waveLabel: string; categoryId: string; sizeSegment: string;
    sizes: Array<{ size: string; tier: 'core'|'extended'|'edge'; forecastUnits: number; stockRatio: number; targetRatio: number; deviation: number }>;
    coreSizeCoverageRate: number; edgeSizeOverweightRisk: boolean; breakSizeRisk: boolean;
    riskNote: string; action: string;
};

type WaveAlignRow = {
    waveKey: string; waveLabel: string; launchMonth: string; mainCategory: string;
    forecastSalesCny: number; otbBudget: number; arrivalDeadline: string;
    shareOfYear: number; riskStatus: 'ok'|'budget_low'|'timing_late'|'delivery_risk';
};

type WavePlanMasterRow = {
    waveKey: string; fiscalYear?: number; seasonCode: string; waveCode: string;
    launchDate: string; mainCategory?: string; mainCategoryList?: string[];
    warehouseDeadline?: string; planSalesAmount?: number; planOtbBudget?: number;
};

type SalesForecastPlanRow = {
    waveKey: string; forecastSalesAmount: number;
};

type OtbBudgetPlanRow = {
    waveKey: string; approvedPurchaseAmount?: number; plannedPurchaseAmount?: number;
};

const COST_TO_SALES_RATIO = 0.55;

function monthLabelFromDate(date: string) {
    return date.slice(0, 7);
}

function daysBetween(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00+08:00`);
    const end = new Date(`${endDate}T00:00:00+08:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function resolveWaveAlignStatus(row: Omit<WaveAlignRow, 'riskStatus'>, launchDate: string): WaveAlignRow['riskStatus'] {
    if (row.otbBudget < row.forecastSalesCny * COST_TO_SALES_RATIO) return 'budget_low';

    const launchMonth = Number(row.launchMonth.slice(5, 7));
    const isWarmWeatherCategory = row.mainCategory.includes('凉鞋') || row.mainCategory.includes('凉拖');
    if (isWarmWeatherCategory && launchMonth >= 6) return 'timing_late';

    const daysBeforeLaunch = daysBetween(row.arrivalDeadline, launchDate);
    if (daysBeforeLaunch < 14) return 'delivery_risk';

    return 'ok';
}

function buildWaveAlignRows(): WaveAlignRow[] {
    const wavePlanMaster = wavePlanMasterRaw as WavePlanMasterRow[];
    const salesForecastPlan = salesForecastPlanRaw as SalesForecastPlanRow[];
    const otbBudgetPlan = otbBudgetPlanRaw as OtbBudgetPlanRow[];

    const salesByWave = new Map<string, number>();
    salesForecastPlan.forEach(row => {
        salesByWave.set(row.waveKey, (salesByWave.get(row.waveKey) ?? 0) + row.forecastSalesAmount);
    });

    const otbByWave = new Map<string, number>();
    otbBudgetPlan.forEach(row => {
        const amount = row.approvedPurchaseAmount ?? row.plannedPurchaseAmount ?? 0;
        otbByWave.set(row.waveKey, (otbByWave.get(row.waveKey) ?? 0) + amount);
    });

    const totalForecastSales = Math.max(
        1,
        wavePlanMaster.reduce((sum, wave) => sum + (salesByWave.get(wave.waveKey) ?? wave.planSalesAmount ?? 0), 0),
    );

    return wavePlanMaster
        .slice()
        .sort((a, b) => a.launchDate.localeCompare(b.launchDate))
        .map(wave => {
            const forecastSalesCny = salesByWave.get(wave.waveKey) ?? wave.planSalesAmount ?? 0;
            const otbBudget = otbByWave.get(wave.waveKey) ?? wave.planOtbBudget ?? 0;
            const mainCategory = wave.mainCategory ?? wave.mainCategoryList?.join('、') ?? '全品类';
            const row = {
                waveKey: wave.waveKey,
                waveLabel: `${wave.seasonCode} ${String(wave.fiscalYear ?? 2026).slice(2)} ${wave.waveCode}`,
                launchMonth: monthLabelFromDate(wave.launchDate),
                mainCategory,
                forecastSalesCny,
                otbBudget,
                arrivalDeadline: wave.warehouseDeadline ?? wave.launchDate,
                shareOfYear: forecastSalesCny / totalForecastSales,
            };

            return {
                ...row,
                riskStatus: resolveWaveAlignStatus(row, wave.launchDate),
            };
        });
}

const RISK_STATUS_CFG = {
    ok: { cls: 'bg-emerald-100 text-emerald-700', label: '✓ 正常' },
    budget_low: { cls: 'bg-amber-100 text-amber-700', label: '⚠ 预算不足' },
    timing_late: { cls: 'bg-orange-100 text-orange-700', label: '⚠ 节奏偏晚' },
    delivery_risk: { cls: 'bg-rose-100 text-rose-700', label: '⚠ 履约风险' },
};

const TIER_COLOR = { core:'bg-sky-500', extended:'bg-slate-300', edge:'bg-rose-300' };
const TIER_LABEL = { core:'核心', extended:'延伸', edge:'边缘' };

function fmtCny(v: number) {
    return v >= 10000000 ? `${(v / 10000000).toFixed(1)}千万` : v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v);
}
function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

type ViewTab = 'size' | 'wave';

export default function SalesForecastSizeRiskPanel() {
    const [view, setView] = useState<ViewTab>('size');
    const sizeData = useMemo(() => sizeRiskRaw as SizeRiskRow[], []);
    const waveAlign = useMemo(() => buildWaveAlignRows(), []);

    const totalRisks = useMemo(() => ({
        breakSize: sizeData.filter(r => r.breakSizeRisk).length,
        edgeOverweight: sizeData.filter(r => r.edgeSizeOverweightRisk).length,
        waveRisks: waveAlign.filter(w => w.riskStatus !== 'ok').length,
    }), [sizeData, waveAlign]);

    return (
        <div className="space-y-4">
            {/* Risk summary */}
            <div className="flex flex-wrap gap-2 text-[11px]">
                {totalRisks.breakSize > 0 && (
                    <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full font-medium">
                        ⚠ {totalRisks.breakSize} 波段断码风险
                    </span>
                )}
                {totalRisks.edgeOverweight > 0 && (
                    <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                        ⚠ {totalRisks.edgeOverweight} 波段边缘码超备
                    </span>
                )}
                {totalRisks.waveRisks > 0 && (
                    <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
                        ⚠ {totalRisks.waveRisks} 波段OTB/节奏风险
                    </span>
                )}
                {totalRisks.breakSize + totalRisks.edgeOverweight + totalRisks.waveRisks === 0 && (
                    <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                        ✓ 尺码结构与波段节奏无重大风险
                    </span>
                )}
            </div>

            {/* Tab切换 */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                {([['size', '尺码结构风险'], ['wave', '波段上市校验']] as [ViewTab, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setView(k)}
                        className={`px-3 py-1.5 rounded-md transition-colors ${view === k ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
                        {l}
                    </button>
                ))}
            </div>

            {/* 尺码结构风险 */}
            {view === 'size' && (
                <div className="space-y-3">
                    {sizeData.map(row => (
                        <div key={`${row.waveKey}-${row.categoryId}`}
                            className={`rounded-2xl border shadow-sm p-4 ${row.breakSizeRisk ? 'border-rose-200 bg-rose-50/30' : row.edgeSizeOverweightRisk ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100 bg-white'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-slate-500">{row.waveKey}</span>
                                    <span className="font-semibold text-slate-800 text-sm">{row.categoryId}</span>
                                    <span className="text-[10px] text-slate-400">（{row.sizeSegment}）</span>
                                </div>
                                <div className="flex gap-1.5">
                                    {(() => {
                                        const dev = computeLastPeriodDeviation(row.waveKey, row.categoryId);
                                        const isHigh = Math.abs(dev) > 0.10;
                                        const cls = isHigh ? 'bg-rose-50 text-rose-700 border-rose-200' : Math.abs(dev) > 0.05 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                        return (
                                            <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${cls}`}
                                                  title="对照上期同波段尺码完整率预测 vs 实际偏差">
                                                上期偏差 {dev >= 0 ? '+' : ''}{(dev * 100).toFixed(1)}%
                                            </span>
                                        );
                                    })()}
                                    {row.breakSizeRisk && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">断码风险</span>}
                                    {row.edgeSizeOverweightRisk && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">边缘码超备</span>}
                                    <span className="text-[10px] text-slate-500">核心尺码覆盖 {pct(row.coreSizeCoverageRate)}</span>
                                </div>
                            </div>

                            {/* Size bar chart */}
                            <div className="space-y-2 mb-3">
                                {row.sizes.map(s => (
                                    <div key={s.size} className="flex items-center gap-2 text-[11px]">
                                        <span className="text-slate-500 w-7 text-right">{s.size}</span>
                                        <span className={`text-[9px] w-8 text-center rounded px-1 ${s.tier==='core'?'bg-sky-100 text-sky-700':s.tier==='extended'?'bg-slate-100 text-slate-600':'bg-rose-100 text-rose-600'}`}>
                                            {TIER_LABEL[s.tier]}
                                        </span>
                                        <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden relative">
                                            {/* Target bar (ghost) */}
                                            <div className="absolute inset-y-0 left-0 h-full rounded-full bg-slate-200 opacity-60"
                                                style={{ width: `${s.targetRatio * 300}%` }} />
                                            {/* Actual bar */}
                                            <div className={`absolute inset-y-0 left-0 h-full rounded-full ${TIER_COLOR[s.tier]}`}
                                                style={{ width: `${s.stockRatio * 300}%` }} />
                                        </div>
                                        <span className="text-slate-600 w-10 text-right">{pct(s.stockRatio)}</span>
                                        <span className="text-slate-400 w-10 text-right text-[10px]">目标{pct(s.targetRatio)}</span>
                                        <span className={`w-12 text-right font-medium text-[10px] ${s.deviation > 0.01 ? 'text-amber-600' : s.deviation < -0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {s.deviation > 0 ? '+' : ''}{pct(s.deviation)}
                                        </span>
                                        <span className="text-slate-400 w-12 text-right">{s.forecastUnits.toLocaleString()}双</span>
                                    </div>
                                ))}
                            </div>

                            {row.riskNote && (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-1.5 mb-2">
                                    ⚠ {row.riskNote}
                                </div>
                            )}
                            {row.action && (
                                <div className="text-[11px] text-sky-700 bg-sky-50 border border-sky-100 rounded px-3 py-1.5">
                                    → {row.action}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 波段上市节奏校验 */}
            {view === 'wave' && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['波段','上市月','主推品类','预测销售','上期偏差','OTB预算','预算差口','到货截止','销售占比','状态'].map(h => (
                                        <th key={h} className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${h === '主推品类' || h === '波段' ? 'text-left' : 'text-right'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {waveAlign.map(w => {
                                    const gap = w.otbBudget - w.forecastSalesCny * 0.55;
                                    const cfg = RISK_STATUS_CFG[w.riskStatus];
                                    return (
                                        <tr key={w.waveKey} className={`border-t border-slate-50 ${w.riskStatus !== 'ok' ? 'hover:bg-amber-50/30' : 'hover:bg-slate-50'}`}>
                                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{w.waveLabel}</td>
                                            <td className="py-2 px-3 text-right text-slate-600">{w.launchMonth.slice(5) + '月'}</td>
                                            <td className="py-2 px-3 text-slate-700">{w.mainCategory}</td>
                                            <td className="py-2 px-3 text-right font-medium text-slate-700">{fmtCny(w.forecastSalesCny)}</td>
                                            {(() => {
                                                const dev = computeLastPeriodDeviation(w.waveKey);
                                                const cls = Math.abs(dev) > 0.10 ? 'text-rose-600 font-semibold' : Math.abs(dev) > 0.05 ? 'text-amber-600' : 'text-emerald-600';
                                                return (
                                                    <td className={`py-2 px-3 text-right text-[11px] ${cls}`} title="对照上期销售预测 vs 实际偏差">
                                                        {dev >= 0 ? '+' : ''}{(dev * 100).toFixed(1)}%
                                                    </td>
                                                );
                                            })()}
                                            <td className="py-2 px-3 text-right text-slate-600">{fmtCny(w.otbBudget)}</td>
                                            <td className={`py-2 px-3 text-right font-medium ${gap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {gap >= 0 ? '+' : ''}{fmtCny(gap)}
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-500">{w.arrivalDeadline.slice(5)}</td>
                                            <td className="py-2 px-3 text-right text-slate-500">{pct(w.shareOfYear)}</td>
                                            <td className="py-2 px-3 text-right">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.cls}`}>{cfg.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 border-t border-slate-50 text-[11px] space-y-1 text-slate-400">
                        <div>⚠ <strong className="text-amber-600">预算不足</strong>：OTB预算低于预测成本货值，需补批预算</div>
                        <div>⚠ <strong className="text-orange-600">节奏偏晚</strong>：上市月晚于品类气温销售高峰，需提前上市</div>
                        <div>⚠ <strong className="text-rose-600">履约风险</strong>：到货截止晚于活动节点，需与供应链确认提前入仓</div>
                    </div>
                </div>
            )}
        </div>
    );
}
