'use client';
/**
 * src/components/otb/InventoryCashPressurePanel.tsx
 * 库存占款与现金压力面板 — V3.2
 */
import { useCashflowInventoryPressure } from '@/hooks/useCashflowInventoryPressure';
import type { ForecastScenario } from '@/hooks/useForecast';
import type { CashflowSimulationOptions } from '@/hooks/useCashflow';
import { formatMoneyCny } from '@/config/numberFormat';

function KpiCard({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'default' }) {
    const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-800';
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
    );
}

export default function InventoryCashPressurePanel({ scenario, simulationOptions }: { scenario: ForecastScenario; simulationOptions?: CashflowSimulationOptions }) {
    const data = useCashflowInventoryPressure(scenario, simulationOptions);
    if (!data) return <div className="flex items-center justify-center h-16 text-slate-400 text-sm">加载库存压力数据中…</div>;

    const {
        inventoryCapital, annualSales, inventoryToSalesRatio,
        cashGap, suggestedCreditLine, clearanceCashIn,
        cashGapAfterClearance, clearanceAppliedInCashflow, narrative,
    } = data;

    const hasCashGap = cashGap > 0;

    return (
        <div className="space-y-4">
            {/* 业务叙述 */}
            <div className={`rounded-xl border px-5 py-4 ${hasCashGap ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className={`text-xs font-semibold mb-1 ${hasCashGap ? 'text-rose-800' : 'text-emerald-800'}`}>
                    {hasCashGap ? '⚠️ 现金流压力预警' : '✅ 现金流整体安全'}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">{narrative}</p>
            </div>

            {/* KPI 网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="期末库存占款" value={formatMoneyCny(inventoryCapital)}
                    sub={`库存/年销 ${(inventoryToSalesRatio * 100).toFixed(1)}%`}
                    tone={inventoryToSalesRatio > 0.30 ? 'warning' : 'default'} />
                <KpiCard label="最大现金缺口" value={hasCashGap ? formatMoneyCny(cashGap) : '无缺口'}
                    tone={hasCashGap ? 'negative' : 'positive'} />
                <KpiCard label="建议授信额度" value={suggestedCreditLine > 0 ? formatMoneyCny(suggestedCreditLine) : '—'}
                    tone={suggestedCreditLine > 0 ? 'warning' : 'positive'}
                    sub="缺口 × 1.2 安全系数" />
                <KpiCard label="年销售额" value={formatMoneyCny(annualSales)} />
            </div>

            {/* 清货模拟 */}
            {(hasCashGap || clearanceAppliedInCashflow) && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-4">
                    <p className="text-xs font-semibold text-sky-800 mb-3">💡 清货回款模拟</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                            <div className="text-slate-500">清货回款（20%库存×5折）</div>
                            <div className="text-base font-bold text-sky-700 mt-1">{formatMoneyCny(clearanceCashIn)}</div>
                        </div>
                        <div>
                            <div className="text-slate-500">清货前现金缺口</div>
                            <div className="text-base font-bold text-rose-600 mt-1">{formatMoneyCny(cashGap)}</div>
                        </div>
                        <div>
                            <div className="text-slate-500">{clearanceAppliedInCashflow ? '当前模拟后缺口' : '清货后现金缺口'}</div>
                            <div className={`text-base font-bold mt-1 ${cashGapAfterClearance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {cashGapAfterClearance === 0 ? '✅ 缺口消除' : formatMoneyCny(cashGapAfterClearance)}
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3">
                        {clearanceAppliedInCashflow ? '当前现金流月表已计入本次清货回款。' : '清货应优先处理库龄 180 天以上、折后仍有正毛利的 SKU；建议结合 OTB 降低下季入货量。'}
                    </p>
                </div>
            )}
        </div>
    );
}
