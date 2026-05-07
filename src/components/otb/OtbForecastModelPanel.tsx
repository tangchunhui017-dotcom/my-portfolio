'use client';
/**
 * src/components/otb/OtbForecastModelPanel.tsx
 * OTB 预测模型面板 — V4.0 P2
 *
 * 使用 useOtbEngine() 驱动，展示：
 * 1. 业务结论 banner
 * 2. 年度 OTB 公式拆解表
 * 3. 季节拆解表
 * 4. 波段拆解表
 * 5. 品类 OTB 拆解表
 */
import { useState } from 'react';
import { useOtbEngine } from '@/hooks/useOtbEngine';
import type { ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';

const SCENARIOS: { key: ForecastScenario; label: string }[] = [
    { key: 'conservative', label: '保守' },
    { key: 'base', label: '基准' },
    { key: 'optimistic', label: '乐观' },
];

// ── Shared sub-components ──────────────────────────────────────────────────────
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return (
        <th className={`py-2 px-3 text-xs font-medium text-slate-400 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
            {children}
        </th>
    );
}
function Td({ children, right, bold, tone }: { children: React.ReactNode; right?: boolean; bold?: boolean; tone?: 'positive' | 'negative' | 'warning' | 'neutral' }) {
    const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : '';
    return (
        <td className={`py-2 px-3 text-xs ${right ? 'text-right' : ''} ${bold ? 'font-semibold' : ''} ${toneClass}`}>
            {children}
        </td>
    );
}
function SourceBadge({ source }: { source: 'template' | 'history' | 'configured' }) {
    const cls = source === 'history' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : source === 'configured' ? 'bg-sky-50 text-sky-700 border-sky-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
    const label = source === 'history' ? '历史推导' : source === 'configured' ? '配置驱动' : '模板假设';
    return (
        <span className={`ml-2 text-[10px] border px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
    );
}
function pct(v: number, decimals = 1) { return `${(v * 100).toFixed(decimals)}%`; }
function wanStr(v: number) { return `${(v / 10000).toFixed(0)}万`; }

// ── Main component ─────────────────────────────────────────────────────────────
export default function OtbForecastModelPanel() {
    const [scenario, setScenario] = useState<ForecastScenario>('base');
    const result = useOtbEngine(scenario);

    return (
        <div className="space-y-6">
            {/* 场景切换 */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">情景：</span>
                {SCENARIOS.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setScenario(s.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${scenario === s.key ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {!result && (
                <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
                    加载 OTB 引擎数据中…
                </div>
            )}

            {result && (
                <>
                    {/* ── 1. 业务结论 Banner ──────────────────────────────── */}
                    <div className={`rounded-xl border px-5 py-4 ${result.annual.otbCostBudget > 0 ? 'bg-sky-50 border-sky-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{result.annual.otbCostBudget > 0 ? '📦' : '✅'}</span>
                            <div className="space-y-1.5 flex-1">
                                <p className="text-sm font-semibold text-slate-800">
                                    年度 OTB 采购预算
                                    <SourceBadge source={result.source} />
                                </p>
                                <p className="text-xs text-slate-600">
                                    年销售预测 <span className="font-bold text-sky-700">{formatMoneyCny(result.annual.salesForecast)}</span>，
                                    目标售罄率 <span className="font-bold">{pct(result.annual.targetSellThroughRate)}</span>，
                                    需要成本货值 <span className="font-bold text-indigo-700">{formatMoneyCny(result.annual.totalRequiredCostInventory)}</span>，
                                    扣除期初库存 <span className="font-bold">{formatMoneyCny(result.annual.openingInventoryCost)}</span> 后，
                                    <span className={`font-bold ${result.checks.budgetPositive ? 'text-sky-700' : 'text-emerald-600'}`}>
                                        {result.checks.budgetPositive ? `OTB成本预算 ${formatMoneyCny(result.annual.otbCostBudget)}` : '现有库存足够，暂不需要采购'}
                                    </span>。
                                </p>
                                {result.annual.endingWos > 0 && (
                                    <p className="text-xs text-slate-500">
                                        预计期末库存 {wanStr(result.annual.endingInventoryCost)} 元（成本口径），
                                        约 <span className={`font-semibold ${result.annual.endingWos > 8 ? 'text-amber-600' : 'text-slate-700'}`}>
                                            {result.annual.endingWos.toFixed(1)} 周
                                        </span> 转速。
                                    </p>
                                )}
                                {/* 电商风险提示 */}
                                {result.checks.ecomReturnRateDanger && (
                                    <p className="text-xs text-rose-600 font-medium">
                                        ⚠️ 电商退货率接近售罄率，所需库存投入被放大，建议控制电商渠道退货率。
                                    </p>
                                )}
                            </div>
                        </div>
                        {result.checks.warnings.length > 0 && (
                            <ul className="mt-3 pl-9 space-y-0.5">
                                {result.checks.warnings.map((w, i) => (
                                    <li key={i} className="text-xs text-amber-700">• {w}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* ── 2. 年度 OTB 公式拆解表 ──────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">年度 OTB 公式拆解</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <Th>指标</Th>
                                        <Th right>数值</Th>
                                        <Th>公式说明</Th>
                                        <Th>数据来源</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {[
                                        { label: '年销售预测', value: formatMoneyCny(result.annual.salesForecast), formula: '实体店 + 电商 + 新店预测合计', src: '配置驱动' },
                                        { label: '├ 实体店销售', value: formatMoneyCny(result.annual.physSalesForecast), formula: 'useForecast(physical)', src: '配置驱动' },
                                        { label: '├ 电商销售', value: formatMoneyCny(result.annual.ecomSalesForecast), formula: 'useForecast(ecommerce)', src: '配置驱动' },
                                        { label: '└ 新店销售', value: formatMoneyCny(result.annual.newStoreSalesForecast), formula: 'useForecast(new_store)', src: '配置驱动' },
                                        { label: '目标售罄率', value: pct(result.annual.targetSellThroughRate), formula: 'otb_model_assumptions.json', src: '模板参数' },
                                        { label: '门店所需零售货值', value: formatMoneyCny(result.annual.physRequiredRetailInventory), formula: '(实体店+新店)销售 ÷ 售罄率', src: '公式推导' },
                                        { label: '电商有效售罄率', value: pct(result.annual.ecomEffectiveSellThrough), formula: '售罄率 − 退货率', src: '公式推导', tone: result.checks.ecomReturnRateDanger ? 'negative' as const : undefined },
                                        { label: '电商所需零售货值', value: formatMoneyCny(result.annual.ecomRequiredRetailInventory), formula: '电商销售 ÷ 有效售罄率', src: '公式推导' },
                                        { label: '合计所需零售货值', value: formatMoneyCny(result.annual.totalRequiredRetailInventory), formula: '实体 + 电商所需零售货值', src: '公式推导', bold: true },
                                        { label: '合计所需成本货值', value: formatMoneyCny(result.annual.totalRequiredCostInventory), formula: '零售货值 ÷ 折扣率 ÷ 加价倍数', src: '公式推导', bold: true },
                                        { label: '期初库存（成本/占款口径）', value: formatMoneyCny(result.annual.openingInventoryCost), formula: 'fact_inventory 最新月库存金额', src: 'fact_inventory' },
                                        { label: 'OTB 成本预算', value: formatMoneyCny(result.annual.otbCostBudget), formula: 'max(0, 所需成本 − 期初库存)', src: '公式推导', bold: true, tone: 'positive' as const },
                                        { label: 'OTB 零售预算', value: formatMoneyCny(result.annual.otbRetailBudget), formula: 'OTB成本 × 加价倍数', src: '公式推导', bold: true },
                                        { label: '预计期末库存（成本）', value: formatMoneyCny(result.annual.endingInventoryCost), formula: '期初 + OTB成本 − 当年成本销售', src: '公式推导', tone: result.annual.endingWos > 8 ? 'warning' as const : undefined },
                                        { label: '期末周转周数（WoS）', value: `${result.annual.endingWos.toFixed(1)} 周`, formula: '期末成本库存 ÷ 周均成本销售', src: '公式推导', tone: result.annual.endingWos > 8 ? 'warning' as const : undefined },
                                    ].map((row, i) => (
                                        <tr key={i} className={row.bold ? 'bg-slate-50/50' : ''}>
                                            <Td bold={row.bold}>{row.label}</Td>
                                            <Td right bold={row.bold} tone={row.tone}>{row.value}</Td>
                                            <Td>{row.formula}</Td>
                                            <Td><span className="text-[10px] text-slate-400">{row.src}</span></Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── 3. 季节拆解表 ──────────────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">季节拆解</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <Th>季节</Th>
                                        <Th>月份</Th>
                                        <Th right>销售占比</Th>
                                        <Th right>预测销售</Th>
                                        <Th right>新品占比</Th>
                                        <Th right>目标售罄率</Th>
                                        <Th right>OTB 成本预算</Th>
                                        <Th right>OTB 零售预算</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {result.bySeason.map(s => (
                                        <tr key={s.key}>
                                            <Td bold>{s.label}</Td>
                                            <Td>{s.months.join('、')}月</Td>
                                            <Td right>{pct(s.salesShare)}</Td>
                                            <Td right bold>{formatMoneyCny(s.forecastSales)}</Td>
                                            <Td right>{pct(s.newGoodsShare)}</Td>
                                            <Td right>{pct(s.targetSellThrough)}</Td>
                                            <Td right tone="positive">{formatMoneyCny(s.otbCostBudget)}</Td>
                                            <Td right>{formatMoneyCny(s.otbRetailBudget)}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── 4. 波段拆解表 ──────────────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">波段拆解</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <Th>波段</Th>
                                        <Th>销售月份</Th>
                                        <Th right>预测销售</Th>
                                        <Th right>波段占比</Th>
                                        <Th>到货建议</Th>
                                        <Th right>OTB 成本预算</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {result.byWave.map(w => (
                                        <tr key={w.key} className={w.waveShare >= 0.20 ? 'bg-sky-50/30' : ''}>
                                            <Td bold>
                                                {w.label}
                                                {w.waveShare >= 0.20 && <span className="ml-1.5 text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">主销波</span>}
                                            </Td>
                                            <Td>{w.months.join('、')}月</Td>
                                            <Td right bold>{formatMoneyCny(w.forecastSales)}</Td>
                                            <Td right>{pct(w.waveShare)}</Td>
                                            <Td><span className="text-xs text-slate-500">{w.suggestedArrivalMonths}</span></Td>
                                            <Td right tone="positive">{formatMoneyCny(w.otbCostBudget)}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── 5. 品类拆解表 ──────────────────────────────────── */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">品类 OTB 拆解</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <Th>品类</Th>
                                        <Th right>预测销售</Th>
                                        <Th right>目标占比</Th>
                                        <Th right>毛利率</Th>
                                        <Th right>售罄目标</Th>
                                        <Th right>OTB 成本预算</Th>
                                        <Th>判断</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {result.byCategory.map(cat => (
                                        <tr key={cat.key}>
                                            <Td bold>{cat.label}</Td>
                                            <Td right>{formatMoneyCny(cat.forecastSales)}</Td>
                                            <Td right>{pct(cat.targetShare)}</Td>
                                            <Td right tone={cat.grossMarginRate >= 0.60 ? 'positive' : cat.grossMarginRate >= 0.55 ? undefined : 'warning'}>
                                                {pct(cat.grossMarginRate)}
                                            </Td>
                                            <Td right>{pct(cat.sellThroughTarget)}</Td>
                                            <Td right tone="positive">{formatMoneyCny(cat.otbCostBudget)}</Td>
                                            <Td><span className="text-xs text-slate-500">{cat.verdict}</span></Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── 数据来源说明 ────────────────────────────────────── */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">数据来源说明：</span>
                        <SourceBadge source="history" /> 来自 dim_wave_plan 历史规划；
                        <SourceBadge source="configured" /> 来自全局配置 + useForecast 引擎；
                        <SourceBadge source="template" /> 历史数据缺失时的 forecast_merch_mix.json 兜底模板。
                    </div>
                </>
            )}
        </div>
    );
}
