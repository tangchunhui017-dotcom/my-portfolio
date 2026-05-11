'use client';
/**
 * src/components/forecast/NewStoreRampPanelV2.tsx
 * S9c 新店爬坡模型 V2 — 鞋类专属风险因子 + 调整后曲线对比
 * S10c 新店首铺结构 — 尺码段 / 价格带 / 与品牌主销对比
 */
import { useState, useMemo } from 'react';
import newStorePlanRaw from '../../../data/planning/sales_forecast_new_store_plan.json';
import sizeCurvesRaw from '../../../data/otb/footwear_size_curves.json';
import { calcRampWithFootwearFactors } from '@/utils/salesForecastV8';

// ── 首铺结构数据（按店型派生）──────────────────────────────────────────────
type SizeCurve = { type: string; label: string; sizes: Array<{ size: string; weight: number; tier: 'core'|'extended'|'edge' }>; corePctTarget: number };
const sizeCurves = sizeCurvesRaw as SizeCurve[];

// 品牌主销结构（参考基准）— 来源于品牌全年主销
const BRAND_PRICE_BAND_BENCHMARK: Array<{ band: string; pct: number; label: string }> = [
    { band: '299以下', pct: 0.10, label: '入门' },
    { band: '300-399', pct: 0.22, label: '走量' },
    { band: '400-499', pct: 0.30, label: '主销' },
    { band: '500-699', pct: 0.25, label: '形象' },
    { band: '700以上', pct: 0.13, label: '高端' },
];

// 按店型 + 城市能级派生该新店首铺结构（vs 品牌主销）
function deriveFirstBatchStructure(storeType: string, cityTier: string) {
    // 旗舰店：形象+高端占比更高；社区店：走量+主销占比更高
    const isFlagship = storeType === 'flagship_s';
    const isStandardA = storeType === 'standard_a';
    const tier1 = cityTier === 'tier1';
    return BRAND_PRICE_BAND_BENCHMARK.map(b => {
        let shift = 0;
        if (isFlagship && (b.band === '500-699' || b.band === '700以上')) shift = 0.04;
        if (isFlagship && b.band === '299以下') shift = -0.04;
        if (isStandardA && b.band === '400-499') shift = 0.03;
        if (!isFlagship && !isStandardA && b.band === '300-399') shift = 0.05;
        if (!tier1 && b.band === '700以上') shift -= 0.03;
        return { ...b, firstBatchPct: Math.max(0.02, b.pct + shift) };
    });
}

type NewStorePlan = {
    storeId: string; storeName: string; storeOpenMonth: string;
    storeType: string; storeTypeLabel: string; cityTier: string; cityTierLabel: string;
    storeAreaSqm: number; firstBatchBudgetCny: number; firstBatchSkuCount: number;
    openingEventBudgetCny: number; rampPeriodMonths: number;
    matureStoreMonthlySalesCny: number; rampCurve: number[];
    breakEvenMonthlySalesCny: number; targetYear1AnnualCny: number;
    firstBatchNewStylePct: number; firstBatchBasicPct: number; firstBatchImagePct: number;
    sizeCompletenessRate: number; replenishmentCycleDays: number;
};

const plans = newStorePlanRaw as NewStorePlan[];
const RAMP_LABELS = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];

function pct(v: number) { return (v * 100).toFixed(0) + '%'; }
function fmtCny(v: number) { return v >= 10000 ? `¥${(v / 10000).toFixed(1)}万` : `¥${v.toLocaleString()}`; }

const SEV_COLOR = { high: 'text-rose-600 bg-rose-50 border-rose-200', medium: 'text-amber-600 bg-amber-50 border-amber-200', low: 'text-emerald-600 bg-emerald-50 border-emerald-200' };

export default function NewStoreRampPanelV2() {
    const [selectedStore, setSelectedStore] = useState(0);
    // What-if sliders for risk factors
    const [sizeCoverage, setSizeCoverage] = useState<number[]>(plans.map(p => p.sizeCompletenessRate));
    const [waveMatchDays, setWaveMatchDays] = useState<number[]>(plans.map(() => 15));
    const [newStyleRatio, setNewStyleRatio] = useState<number[]>(plans.map(p => p.firstBatchNewStylePct));

    const store = plans[selectedStore] ?? plans[0];
    const storeIdx = selectedStore;

    const rampResult = useMemo(() => calcRampWithFootwearFactors(
        store.rampCurve,
        {
            sizeCoverageRate: sizeCoverage[storeIdx] ?? store.sizeCompletenessRate,
            waveMatchDays: waveMatchDays[storeIdx] ?? 15,
            newStyleRatio: newStyleRatio[storeIdx] ?? store.firstBatchNewStylePct,
        }
    ), [store, storeIdx, sizeCoverage, waveMatchDays, newStyleRatio]);

    const theoreticalYear1 = store.rampCurve.reduce((s, v) => s + v * store.matureStoreMonthlySalesCny, 0);
    const adjustedYear1 = rampResult.adjustedCurve.reduce((s, v) => s + v * store.matureStoreMonthlySalesCny, 0);
    const lossAmount = theoreticalYear1 - adjustedYear1;

    return (
        <div className="space-y-4">
            {/* 门店选择 */}
            <div className="flex gap-2 flex-wrap">
                {plans.map((p, i) => (
                    <button key={p.storeId} onClick={() => setSelectedStore(i)}
                        className={`px-3 py-1.5 text-[11px] rounded-full border transition-colors ${selectedStore === i ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {p.storeName}
                    </button>
                ))}
            </div>

            {/* 风险因子 What-if */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                <div className="text-xs font-semibold text-emerald-800 mb-2">🔧 鞋类爬坡风险因子调节（What-if）</div>
                {[
                    {
                        label: '首铺尺码完整率', key: 'size', value: (sizeCoverage[storeIdx] ?? store.sizeCompletenessRate) * 100,
                        min: 70, max: 100, step: 1, unit: '%', target: 95,
                        onChange: (v: number) => setSizeCoverage(prev => { const n = [...prev]; n[storeIdx] = v / 100; return n; }),
                        desc: '< 95% 开始影响爬坡速度，每缺口1%损失约2.5%销售',
                    },
                    {
                        label: '错过主销波段天数', key: 'wave', value: waveMatchDays[storeIdx] ?? 15,
                        min: 0, max: 90, step: 5, unit: '天', target: 30,
                        onChange: (v: number) => setWaveMatchDays(prev => { const n = [...prev]; n[storeIdx] = v; return n; }),
                        desc: '> 30天开始累积爬坡损失，最大损失 20%',
                    },
                    {
                        label: '首铺新品占比', key: 'new', value: (newStyleRatio[storeIdx] ?? store.firstBatchNewStylePct) * 100,
                        min: 20, max: 70, step: 5, unit: '%', target: 40,
                        onChange: (v: number) => setNewStyleRatio(prev => { const n = [...prev]; n[storeIdx] = v / 100; return n; }),
                        desc: '< 40% 新鲜感不足，爬坡速度放缓',
                    },
                ].map(f => (
                    <div key={f.key}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-slate-600">{f.label}</span>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-bold ${
                                    f.key === 'wave' ? (f.value > f.target ? 'text-rose-600' : 'text-emerald-600') :
                                    (f.value < f.target ? 'text-rose-600' : 'text-emerald-600')
                                }`}>{f.value.toFixed(0)}{f.unit}</span>
                                <span className="text-[10px] text-slate-400">目标: {f.key === 'wave' ? '<' : '≥'}{f.target}{f.unit}</span>
                            </div>
                        </div>
                        <input type="range" min={f.min} max={f.max} step={f.step} value={f.value}
                            onChange={e => f.onChange(Number(e.target.value))}
                            className="w-full h-1.5 rounded-lg appearance-none bg-emerald-200 cursor-pointer" />
                        <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                    </div>
                ))}
            </div>

            {/* 风险项 */}
            {rampResult.riskItems.length > 0 && (
                <div className="space-y-2">
                    {rampResult.riskItems.map((item, i) => (
                        <div key={i} className={`rounded-xl border px-3 py-2 text-[11px] ${SEV_COLOR[item.severity]}`}>
                            <div className="flex items-center justify-between">
                                <span>{item.factor}</span>
                                <span className="font-bold">爬坡损失 -{pct(item.loss)}</span>
                            </div>
                        </div>
                    ))}
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] flex justify-between font-medium">
                        <span className="text-rose-700">综合爬坡损失</span>
                        <span className="text-rose-700">-{pct(rampResult.lossRate)} （约 {fmtCny(lossAmount)}）</span>
                    </div>
                </div>
            )}

            {/* 爬坡曲线对比 */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">{store.storeName} — 爬坡曲线对比</div>
                    <div className="flex gap-3 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300 border-dashed border inline-block" /> 理论曲线</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> 调整后曲线</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 border-dashed border inline-block" /> 盈亏平衡线</span>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex gap-1 items-end" style={{ height: 120 }}>
                        {RAMP_LABELS.map((label, i) => {
                            const theoretical = rampResult.theoreticalCurve[i] ?? 0;
                            const adjusted = rampResult.adjustedCurve[i] ?? 0;
                            const maxV = Math.max(...rampResult.theoreticalCurve);
                            const tH = maxV > 0 ? (theoretical / maxV) * 100 : 0;
                            const aH = maxV > 0 ? (adjusted / maxV) * 100 : 0;
                            const breakEvenH = maxV > 0 ? (store.breakEvenMonthlySalesCny / store.matureStoreMonthlySalesCny / maxV) * 100 : 30;
                            return (
                                <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
                                    <div className="w-full flex gap-0.5 items-end" style={{ height: 100 }}>
                                        <div className="flex-1 bg-slate-200 rounded-t" style={{ height: `${tH}%` }} />
                                        <div className={`flex-1 rounded-t ${adjusted < theoretical * 0.85 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ height: `${aH}%` }} />
                                    </div>
                                    <span className="text-[9px] text-slate-400">{label}</span>
                                    <span className="text-[9px] font-medium text-emerald-600">{pct(adjusted)}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
                        <div className="text-center"><div className="text-slate-400">理论Year1</div><div className="font-bold text-slate-700">{fmtCny(theoreticalYear1)}</div></div>
                        <div className="text-center"><div className="text-slate-400">调整后Year1</div><div className={`font-bold ${adjustedYear1 < theoreticalYear1 * 0.9 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtCny(adjustedYear1)}</div></div>
                        <div className="text-center"><div className="text-slate-400">预期损失</div><div className={`font-bold ${lossAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{lossAmount > 0 ? '-' : ''}{fmtCny(lossAmount)}</div></div>
                    </div>
                </div>
            </div>

            {/* S10c 首铺结构（尺码段 + 价格带 + 与品牌主销对比）──────────────── */}
            <FirstBatchStructure store={store} />
        </div>
    );
}

// ── S10c 首铺结构组件 ──────────────────────────────────────────────────────
function FirstBatchStructure({ store }: { store: NewStorePlan }) {
    const [sizeType, setSizeType] = useState<string>('mens_sport');
    const curve = sizeCurves.find(c => c.type === sizeType) ?? sizeCurves[0];
    const priceStructure = useMemo(() => deriveFirstBatchStructure(store.storeType, store.cityTier), [store.storeType, store.cityTier]);

    const corePct = curve.sizes.filter(s => s.tier === 'core').reduce((sum, s) => sum + s.weight, 0);
    const edgePct = curve.sizes.filter(s => s.tier === 'edge').reduce((sum, s) => sum + s.weight, 0);
    const isCoreHealthy = corePct >= curve.corePctTarget;

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <div className="text-xs font-semibold text-slate-700">{store.storeName} — 首铺货品结构</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">尺码段分布 · 价格带分布 · 与品牌主销对比</p>
                </div>
                <select value={sizeType} onChange={e => setSizeType(e.target.value)}
                    className="text-[10px] border border-slate-200 rounded px-2 py-1 bg-white text-slate-600">
                    {sizeCurves.map(c => <option key={c.type} value={c.type}>{c.label}</option>)}
                </select>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 尺码段分布柱图 */}
                <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                        <span className="font-semibold text-slate-700">👟 尺码段分布</span>
                        <span className={isCoreHealthy ? 'text-emerald-600' : 'text-amber-600'}>
                            核心{pct(corePct)} · 边缘{pct(edgePct)}
                            {!isCoreHealthy && ' ⚠'}
                        </span>
                    </div>
                    <div className="flex items-end gap-1 h-24 bg-slate-50 rounded-lg p-2 border border-slate-100">
                        {curve.sizes.map(s => {
                            const maxW = Math.max(...curve.sizes.map(x => x.weight));
                            const h = (s.weight / maxW) * 100;
                            const color = s.tier === 'core' ? 'bg-sky-500' : s.tier === 'extended' ? 'bg-slate-400' : 'bg-rose-400';
                            return (
                                <div key={s.size} className="flex-1 flex flex-col items-center gap-1" title={`${s.size}码 · ${pct(s.weight)} · ${s.tier}`}>
                                    <div className={`${color} rounded-t w-full`} style={{ height: `${h}%` }} />
                                    <span className="text-[8px] text-slate-500">{s.size}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-3 mt-1 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-500 rounded-sm" />核心</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-400 rounded-sm" />延伸</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-400 rounded-sm" />边缘</span>
                    </div>
                </div>

                {/* 价格带分布 — 首铺 vs 品牌主销 */}
                <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                        <span className="font-semibold text-slate-700">💰 价格带分布</span>
                        <span className="text-slate-400">本店首铺 vs 品牌主销</span>
                    </div>
                    <div className="space-y-1.5">
                        {priceStructure.map(p => {
                            const diff = p.firstBatchPct - p.pct;
                            const isMajor = Math.abs(diff) > 0.05;
                            return (
                                <div key={p.band} className="flex items-center gap-2 text-[10px]">
                                    <span className="text-slate-600 w-16 shrink-0">{p.band}</span>
                                    <span className="text-slate-400 w-8 shrink-0">{p.label}</span>
                                    {/* 品牌基准（虚化背景）+ 首铺（实色） */}
                                    <div className="flex-1 h-3.5 rounded-full bg-slate-100 overflow-hidden relative">
                                        <div className="absolute inset-y-0 left-0 h-full bg-slate-300 opacity-60 rounded-full" style={{ width: `${p.pct * 200}%` }} />
                                        <div className="absolute inset-y-0 left-0 h-full bg-emerald-500 rounded-full" style={{ width: `${p.firstBatchPct * 200}%` }} />
                                    </div>
                                    <span className="text-emerald-700 w-9 text-right font-medium">{pct(p.firstBatchPct)}</span>
                                    <span className="text-slate-400 w-9 text-right">{pct(p.pct)}</span>
                                    <span className={`w-12 text-right font-medium ${isMajor ? (diff > 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>
                                        {diff > 0 ? '+' : ''}{pct(diff)}{isMajor && ' ⚠'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-3 mt-2 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" />本店首铺</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-sm" />品牌主销</span>
                    </div>
                </div>
            </div>

            {/* 综合判定 */}
            <div className="px-4 py-2 border-t border-slate-50 bg-slate-50/40">
                {(() => {
                    const majorDiffs = priceStructure.filter(p => Math.abs(p.firstBatchPct - p.pct) > 0.05);
                    const sizeIssue = !isCoreHealthy;
                    if (!sizeIssue && majorDiffs.length === 0) {
                        return <div className="text-[11px] text-emerald-700">✓ 首铺结构与品牌主销结构匹配良好</div>;
                    }
                    return (
                        <div className="text-[11px] text-amber-700">
                            ⚠ {sizeIssue && '核心尺码偏低，'}{majorDiffs.length > 0 && `${majorDiffs.length} 个价格带偏离品牌主销 >5pp`}
                            ，建议调整首铺结构降低爬坡风险
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
