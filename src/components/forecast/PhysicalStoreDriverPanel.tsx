'use client';
/**
 * src/components/forecast/PhysicalStoreDriverPanel.tsx
 * 实体店业务驱动拆解：门店等级 + 经营驱动公式 + 区域气温联动
 */
import { useMemo, useState } from 'react';
import storeGradeRaw from '../../../data/planning/sales_forecast_store_grade.json';
import channelDriverRaw from '../../../data/planning/sales_forecast_channel_driver.json';

type StoreGradeRow = {
    storeGrade: string;
    gradeLabel: string;
    storeCount: number;
    salesPerStoreMonthlyCny: number;
    forecastAnnualCny: number;
    shareOfChannel: number;
    yoyGrowth: number;
    avgStoreSqm: number;
    salesPerSqmMonthly: number;
    monthlyTraffic: number;
    conversionRate: number;
    avgTransactionValue: number;
    pairsPerOrder: number;
    riskNote: string;
};

type RegionRow = {
    region: string;
    avgMonthlyTempC: number[];
    mainCategoryByMonth: string[];
    forecastMonthlyCny: number[];
    tempMatchStatus: string[];
    storeCountComparable: number;
    storeCountTotal: number;
    adjustmentSuggestion: string;
};

function fmtCny(v: number) {
    return v >= 10000000 ? `${(v / 10000000).toFixed(2)}千万` : v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v);
}
function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

const MONTH_SHORT = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const GRADE_COLOR: Record<string, string> = {
    S: 'bg-amber-100 text-amber-800 border-amber-300',
    A: 'bg-sky-100 text-sky-800 border-sky-300',
    B: 'bg-slate-100 text-slate-700 border-slate-300',
    C: 'bg-rose-50 text-rose-700 border-rose-200',
    outlet: 'bg-violet-100 text-violet-700 border-violet-200',
};

export default function PhysicalStoreDriverPanel() {
    const [activeRegion, setActiveRegion] = useState('华东');
    const gradeData = storeGradeRaw as StoreGradeRow[];
    const regionData = channelDriverRaw as RegionRow[];
    const regions = regionData.map(r => r.region);
    const activeRegionRow = regionData.find(r => r.region === activeRegion) ?? regionData[0];

    const totals = useMemo(() => gradeData.reduce((acc, r) => ({
        storeCount: acc.storeCount + r.storeCount,
        forecastAnnual: acc.forecastAnnual + r.forecastAnnualCny,
    }), { storeCount: 0, forecastAnnual: 0 }), [gradeData]);

    // Weighted averages
    const wAvg = useMemo(() => {
        const total = totals.storeCount;
        return {
            traffic: gradeData.reduce((s, r) => s + r.monthlyTraffic * r.storeCount, 0) / total,
            conv: gradeData.reduce((s, r) => s + r.conversionRate * r.storeCount, 0) / total,
            atv: gradeData.reduce((s, r) => s + r.avgTransactionValue * r.storeCount, 0) / total,
            pairs: gradeData.reduce((s, r) => s + r.pairsPerOrder * r.storeCount, 0) / total,
        };
    }, [gradeData, totals]);

    const impliedMonthly = Math.round(totals.storeCount * wAvg.traffic * wAvg.conv * wAvg.atv * wAvg.pairs);

    return (
        <div className="space-y-4">
            {/* ── 经营驱动公式卡（What-if 滑块）── */}
            <PhysicalDriverFormulaWhatIf
                baseStoreCount={totals.storeCount}
                baseTraffic={wAvg.traffic}
                baseConv={wAvg.conv}
                baseAtv={wAvg.atv}
                basePairs={wAvg.pairs}
                baseMonthlyImplied={impliedMonthly}
            />

            {/* ── 门店等级预测表 ── */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-50">
                    <h4 className="text-sm font-bold text-slate-800">门店等级预测</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">S级旗舰 / A级标准 / B级社区 / C级县级 / 奥莱特渠</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>
                                {['等级','门店数','单店月均','年度预测','渠道占比','YoY','坪效/月','月均客流','成交率','客单价','连带率','风险'].map(h => (
                                    <th key={h} className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${['年度预测','单店月均'].includes(h)?'text-right':h==='风险'?'text-left':'text-right'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {gradeData.map(row => (
                                <tr key={row.storeGrade} className="border-t border-slate-50 hover:bg-slate-50">
                                    <td className="py-2 px-3">
                                        <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${GRADE_COLOR[row.storeGrade] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {row.gradeLabel}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-medium text-slate-700">{row.storeCount}</td>
                                    <td className="py-2 px-3 text-right text-slate-600">{fmtCny(row.salesPerStoreMonthlyCny)}</td>
                                    <td className="py-2 px-3 text-right font-semibold text-slate-800">{fmtCny(row.forecastAnnualCny)}</td>
                                    <td className="py-2 px-3 text-right text-slate-500">{pct(row.shareOfChannel)}</td>
                                    <td className={`py-2 px-3 text-right font-medium ${row.yoyGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {row.yoyGrowth >= 0 ? '+' : ''}{pct(row.yoyGrowth)}
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-500">¥{row.salesPerSqmMonthly.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-slate-500">{row.monthlyTraffic.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-slate-500">{pct(row.conversionRate)}</td>
                                    <td className="py-2 px-3 text-right text-slate-500">¥{row.avgTransactionValue}</td>
                                    <td className="py-2 px-3 text-right text-slate-500">{row.pairsPerOrder.toFixed(2)}</td>
                                    <td className="py-2 px-3 text-slate-500 max-w-[180px]">
                                        {row.riskNote
                                            ? <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">{row.riskNote}</span>
                                            : <span className="text-[10px] text-emerald-600">✓ 正常</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t border-slate-200 bg-slate-50">
                                <td className="py-2 px-3 font-bold text-slate-700">合计</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-700">{totals.storeCount}</td>
                                <td className="py-2 px-3 text-right text-slate-500">—</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-800">{fmtCny(totals.forecastAnnual)}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-600">100%</td>
                                <td colSpan={7} />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 区域气温影响 ── */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">区域气温影响</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">鞋类品类随气温节律波动，不同区域上市节奏需差异化调整</p>
                    </div>
                    <div className="flex gap-1">
                        {regions.map(r => (
                            <button key={r} onClick={() => setActiveRegion(r)}
                                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${r === activeRegion ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                {activeRegionRow && (
                    <div className="p-4">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-[11px] text-sky-800 flex-1">
                                <div className="font-bold mb-1">{activeRegionRow.region} 调整建议</div>
                                <div className="leading-snug">{activeRegionRow.adjustmentSuggestion}</div>
                            </div>
                            <div className="flex gap-3 text-[11px] text-slate-600">
                                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
                                    <div className="text-slate-400 mb-1">可比店</div>
                                    <div className="font-bold text-slate-700">{activeRegionRow.storeCountComparable}</div>
                                </div>
                                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
                                    <div className="text-slate-400 mb-1">门店总数</div>
                                    <div className="font-bold text-slate-700">{activeRegionRow.storeCountTotal}</div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left py-2 px-3 font-medium text-slate-500">月份</th>
                                        {MONTH_SHORT.map(m => (
                                            <th key={m} className="text-right py-2 px-2 font-medium text-slate-500 whitespace-nowrap">{m}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-t border-slate-50">
                                        <td className="py-2 px-3 font-medium text-slate-600">月均温度</td>
                                        {activeRegionRow.avgMonthlyTempC.map((t, i) => (
                                            <td key={i} className={`py-2 px-2 text-right text-[11px] font-medium ${t < 0 ? 'text-blue-600' : t > 25 ? 'text-rose-500' : 'text-slate-600'}`}>
                                                {t}°
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-t border-slate-50">
                                        <td className="py-2 px-3 font-medium text-slate-600">主推品类</td>
                                        {activeRegionRow.mainCategoryByMonth.map((c, i) => (
                                            <td key={i} className="py-2 px-2 text-right text-[10px] text-slate-500 whitespace-nowrap">{c.split('/')[0]}</td>
                                        ))}
                                    </tr>
                                    <tr className="border-t border-slate-50">
                                        <td className="py-2 px-3 font-medium text-slate-600">预测销售</td>
                                        {activeRegionRow.forecastMonthlyCny.map((v, i) => (
                                            <td key={i} className="py-2 px-2 text-right font-medium text-slate-700">{(v / 10000).toFixed(0)}万</td>
                                        ))}
                                    </tr>
                                    <tr className="border-t border-slate-50">
                                        <td className="py-2 px-3 font-medium text-slate-600">温度匹配</td>
                                        {activeRegionRow.tempMatchStatus.map((s, i) => (
                                            <td key={i} className="py-2 px-2 text-right">
                                                <span className={`text-[10px] ${s === '匹配' ? 'text-emerald-600' : s === '偏晚' ? 'text-rose-500' : 'text-amber-500'}`}>
                                                    {s === '匹配' ? '✓' : `⚠${s}`}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── What-if 驱动公式（含复购系数 + 气温系数 + 滑块）─────────────────────────
function PhysicalDriverFormulaWhatIf({
    baseStoreCount, baseTraffic, baseConv, baseAtv, basePairs, baseMonthlyImplied,
}: {
    baseStoreCount: number; baseTraffic: number; baseConv: number;
    baseAtv: number; basePairs: number; baseMonthlyImplied: number;
}) {
    // 每个因子的倍率（1.0 = 不变；可拖动 ±20%）
    const [trafficMul, setTrafficMul] = useState(1);
    const [convMul, setConvMul] = useState(1);
    const [atvMul, setAtvMul] = useState(1);
    const [pairsMul, setPairsMul] = useState(1);
    const [repurchaseMul, setRepurchaseMul] = useState(1);   // 新增：复购系数 0.85-1.15
    const [tempMul, setTempMul] = useState(1);               // 新增：区域气温系数 0.85-1.15

    const adjMonthly = Math.round(
        baseStoreCount * (baseTraffic * trafficMul) * (baseConv * convMul) *
        (baseAtv * atvMul) * (basePairs * pairsMul) * repurchaseMul * tempMul,
    );
    const deltaPct = baseMonthlyImplied > 0 ? (adjMonthly - baseMonthlyImplied) / baseMonthlyImplied : 0;

    // 边际贡献：单独变动该因子对销售的影响
    const marginal = {
        traffic: trafficMul - 1,
        conv: convMul - 1,
        atv: atvMul - 1,
        pairs: pairsMul - 1,
        repurchase: repurchaseMul - 1,
        temp: tempMul - 1,
    };

    const sliderColor = 'accent-sky-500';

    type Factor = { key: keyof typeof marginal; label: string; mul: number; setMul: (v: number) => void; baseValue: string; min: number; max: number; isNew?: boolean };
    const factors: Factor[] = [
        { key: 'traffic', label: '月均客流', mul: trafficMul, setMul: setTrafficMul, baseValue: Math.round(baseTraffic).toLocaleString(), min: 0.80, max: 1.20 },
        { key: 'conv', label: '成交率', mul: convMul, setMul: setConvMul, baseValue: pct(baseConv), min: 0.80, max: 1.20 },
        { key: 'atv', label: '客单价', mul: atvMul, setMul: setAtvMul, baseValue: `¥${Math.round(baseAtv)}`, min: 0.80, max: 1.20 },
        { key: 'pairs', label: '连带率', mul: pairsMul, setMul: setPairsMul, baseValue: basePairs.toFixed(2), min: 0.80, max: 1.20 },
        { key: 'repurchase', label: '复购系数', mul: repurchaseMul, setMul: setRepurchaseMul, baseValue: '1.00', min: 0.85, max: 1.15, isNew: true },
        { key: 'temp', label: '区域气温系数', mul: tempMul, setMul: setTempMul, baseValue: '1.00', min: 0.85, max: 1.15, isNew: true },
    ];

    const resetAll = () => {
        setTrafficMul(1); setConvMul(1); setAtvMul(1);
        setPairsMul(1); setRepurchaseMul(1); setTempMul(1);
    };

    return (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div className="text-xs font-semibold text-sky-800">📐 实体店销售驱动公式 — What-if 沙盒</div>
                    <p className="text-[10px] text-sky-600 mt-0.5">拖动滑块即时看销售影响 · 含新增「复购系数 × 气温系数」</p>
                </div>
                <button onClick={resetAll}
                    className="text-[10px] text-sky-700 border border-sky-200 px-2 py-1 rounded hover:bg-sky-100">
                    重置全部
                </button>
            </div>

            {/* 公式展示 */}
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-sky-900 mb-4">
                <span className="rounded-lg bg-white border border-sky-200 px-2.5 py-1.5 text-center min-w-[64px]">
                    <div className="text-[9px] text-sky-500">门店数</div>
                    <div className="font-bold text-xs">{baseStoreCount}</div>
                </span>
                {factors.map(f => (
                    <span key={f.key} className="inline-flex items-center gap-1">
                        <span className="text-sky-400">×</span>
                        <span className={`rounded-lg bg-white border px-2.5 py-1.5 text-center min-w-[72px] ${f.isNew ? 'border-amber-300 ring-1 ring-amber-100' : 'border-sky-200'}`}>
                            <div className="text-[9px] text-sky-500 flex items-center justify-center gap-0.5">
                                {f.label}
                                {f.isNew && <span className="text-[8px] bg-amber-400 text-white rounded px-0.5">新</span>}
                            </div>
                            <div className="font-bold text-xs">{f.baseValue}</div>
                            <div className={`text-[9px] ${f.mul === 1 ? 'text-slate-300' : f.mul > 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ×{f.mul.toFixed(2)}
                            </div>
                        </span>
                    </span>
                ))}
                <span className="text-sky-400">=</span>
                <span className="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-center min-w-[120px]">
                    <div className="text-[9px] opacity-80">月销合计</div>
                    <div className="font-bold text-sm">{fmtCny(adjMonthly)}</div>
                    {deltaPct !== 0 && (
                        <div className={`text-[9px] ${deltaPct > 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                            vs 基准 {deltaPct > 0 ? '+' : ''}{(deltaPct * 100).toFixed(1)}%
                        </div>
                    )}
                </span>
            </div>

            {/* 滑块面板 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {factors.map(f => (
                    <div key={f.key} className={`rounded-lg bg-white border px-3 py-2 ${f.isNew ? 'border-amber-200' : 'border-sky-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-600 font-medium">{f.label}</span>
                            <span className={`text-[10px] font-semibold ${marginal[f.key] === 0 ? 'text-slate-400' : marginal[f.key] > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {marginal[f.key] === 0 ? '基准' : `${marginal[f.key] > 0 ? '+' : ''}${(marginal[f.key] * 100).toFixed(1)}%`}
                            </span>
                        </div>
                        <input type="range" min={f.min} max={f.max} step={0.005}
                            value={f.mul} onChange={e => f.setMul(parseFloat(e.target.value))}
                            className={`w-full h-1 rounded-lg appearance-none ${f.isNew ? 'bg-amber-100' : 'bg-sky-100'} ${sliderColor} cursor-pointer`} />
                    </div>
                ))}
            </div>

            {/* 边际贡献提示 */}
            {Object.values(marginal).some(v => v !== 0) && (
                <div className="mt-3 text-[10px] text-sky-700 bg-sky-100/60 rounded-lg px-3 py-1.5">
                    💡 边际贡献：当前最大杠杆为
                    <strong className="mx-1">
                        {(() => {
                            const entries = Object.entries(marginal) as Array<[keyof typeof marginal, number]>;
                            const max = entries.reduce((a, b) => Math.abs(b[1]) > Math.abs(a[1]) ? b : a);
                            const labelMap = { traffic: '客流', conv: '成交率', atv: '客单价', pairs: '连带率', repurchase: '复购系数', temp: '气温系数' };
                            return `${labelMap[max[0]]} ${max[1] > 0 ? '+' : ''}${(max[1] * 100).toFixed(1)}%`;
                        })()}
                    </strong>
                    ，总影响 {deltaPct > 0 ? '+' : ''}{(deltaPct * 100).toFixed(1)}%
                </div>
            )}
        </div>
    );
}
