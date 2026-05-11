'use client';
/**
 * src/components/forecast/ForecastDriverPanel.tsx
 * S3 关键参数滑块（不折叠）+ 其余参数可展开
 */
import { useState } from 'react';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import type { ForecastChannel } from '@/hooks/useForecast';

interface Props {
    channel: ForecastChannel;
}

function MethodHint({ method }: { method: string }) {
    const copy = method === 'driver_based'
        ? { tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', text: '当前为驱动因子预测：最终预测直接采用本面板参数计算结果。' }
        : method === 'hybrid'
        ? { tone: 'text-sky-700 bg-sky-50 border-sky-200', text: '当前为混合预测：最终预测取"增长率预测"和"驱动预测"的均值。' }
        : { tone: 'text-amber-700 bg-amber-50 border-amber-200', text: '当前为增长率预测：本面板参数仅用于对比分析，不参与最终预测；切换到"驱动因子预测"或"混合预测"后生效。' };
    return <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${copy.tone}`}>{copy.text}</div>;
}

// ── 关键参数滑块（带实时数值显示）─────────────────────────────────────────────
function KeySlider({
    label, value, onChange, min, max, step, unit, color, hint,
}: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step: number; unit: '%' | '元' | '元/㎡' | '人';
    color: 'sky' | 'violet' | 'emerald'; hint?: string;
}) {
    const colorCls = {
        sky: 'border-sky-200 bg-sky-50 accent-sky-500',
        violet: 'border-violet-200 bg-violet-50 accent-violet-500',
        emerald: 'border-emerald-200 bg-emerald-50 accent-emerald-500',
    }[color];
    const textCls = { sky: 'text-sky-700', violet: 'text-violet-700', emerald: 'text-emerald-700' }[color];
    const display = unit === '%' ? `${(value * 100).toFixed(1)}%` : value.toLocaleString();

    return (
        <div className={`rounded-xl border ${colorCls} px-4 py-3`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-700">{label}</span>
                <span className={`text-base font-bold ${textCls}`}>{display}{unit !== '%' && unit !== '人' && <span className="text-[10px] ml-0.5">{unit}</span>}</span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${color === 'sky' ? 'bg-sky-200' : color === 'violet' ? 'bg-violet-200' : 'bg-emerald-200'}`}
            />
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>{unit === '%' ? `${(min * 100).toFixed(0)}%` : min.toLocaleString()}</span>
                <span>{unit === '%' ? `${(max * 100).toFixed(0)}%` : max.toLocaleString()}</span>
            </div>
            {hint && <p className="text-[9px] text-slate-500 mt-1.5 italic">{hint}</p>}
        </div>
    );
}

// ── 次要参数（数字输入框）──────────────────────────────────────────────────────
function NumInput({ label, value, onChange, step = 0.01, min = 0, pct = false }: {
    label: string; value: number; onChange: (v: number) => void;
    step?: number; min?: number; pct?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">{label}</label>
            <div className="flex items-center gap-1">
                <input
                    type="number" step={step} min={min}
                    value={pct ? +(value * 100).toFixed(2) : value}
                    onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(pct ? v / 100 : v); }}
                    className="w-24 border border-slate-200 rounded px-2 py-1 text-sm text-right"
                />
                {pct && <span className="text-xs text-slate-400">%</span>}
            </div>
        </div>
    );
}

function CityTierSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">城市能级</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-sm">
                <option value="tier1">一线城市</option>
                <option value="tier2">二线城市</option>
                <option value="tier3_plus">三线及以下</option>
            </select>
        </div>
    );
}

// ── 主面板 ────────────────────────────────────────────────────────────────────
export default function ForecastDriverPanel({ channel }: Props) {
    const { config, updatePhysicalDrivers, updateEcommerceDrivers, updateNewStoreDrivers } = useGlobalConfig();
    const [showAll, setShowAll] = useState(false);

    if (channel === 'physical') {
        const pd = config.physicalDrivers;
        return (
            <div className="space-y-3">
                <MethodHint method={config.forecast.method} />
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-600">⚡ 关键驱动参数（拖动滑块实时影响预测）</p>
                    <button onClick={() => setShowAll(v => !v)} className="text-[10px] text-sky-600 hover:underline">
                        {showAll ? '▲ 收起其余参数' : '▼ 展开全部参数'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <KeySlider label="客流提升" value={pd.trafficLift} onChange={v => updatePhysicalDrivers({ trafficLift: v })}
                        min={-0.20} max={0.30} step={0.005} unit="%" color="sky"
                        hint="对销售影响最大：客流 +5% ≈ 销售 +5%（其他因素不变）" />
                    <KeySlider label="转化率提升" value={pd.conversionRateLift} onChange={v => updatePhysicalDrivers({ conversionRateLift: v })}
                        min={-0.10} max={0.30} step={0.005} unit="%" color="sky"
                        hint="试穿转化与陈列水平相关，弹性高" />
                    <KeySlider label="客单价提升" value={pd.avgTicketLift} onChange={v => updatePhysicalDrivers({ avgTicketLift: v })}
                        min={-0.10} max={0.20} step={0.005} unit="%" color="sky"
                        hint="连带 + 升级款拉升客单" />
                </div>
                {showAll && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] text-slate-500 mb-3">次要参数</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <NumInput label="件单价提升" value={pd.avgUnitPriceLift} onChange={v => updatePhysicalDrivers({ avgUnitPriceLift: v })} pct step={0.1} />
                            <NumInput label="投放预算(元)" value={pd.investmentBudget} onChange={v => updatePhysicalDrivers({ investmentBudget: v })} step={10000} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (channel === 'ecommerce') {
        const ed = config.ecommerceDrivers;
        return (
            <div className="space-y-3">
                <MethodHint method={config.forecast.method} />
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-600">⚡ 关键驱动参数（拖动滑块实时影响预测）</p>
                    <button onClick={() => setShowAll(v => !v)} className="text-[10px] text-violet-600 hover:underline">
                        {showAll ? '▲ 收起其余参数' : '▼ 展开全部参数'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <KeySlider label="转化率提升" value={ed.conversionRateLift} onChange={v => updateEcommerceDrivers({ conversionRateLift: v })}
                        min={-0.20} max={0.40} step={0.005} unit="%" color="violet"
                        hint="直接放大 GMV，最敏感参数" />
                    <KeySlider label="退货率" value={ed.refundRate} onChange={v => updateEcommerceDrivers({ refundRate: v })}
                        min={0.10} max={0.40} step={0.005} unit="%" color="violet"
                        hint="鞋类电商退货率 15-30%，决定净销售率" />
                    <KeySlider label="客单价提升" value={ed.avgTicketLift} onChange={v => updateEcommerceDrivers({ avgTicketLift: v })}
                        min={-0.10} max={0.30} step={0.005} unit="%" color="violet"
                        hint="折扣 vs 主推款比例的折中" />
                </div>
                {showAll && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] text-slate-500 mb-3">次要参数</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <NumInput label="流量成本提升" value={ed.trafficCostLift} onChange={v => updateEcommerceDrivers({ trafficCostLift: v })} pct step={0.1} />
                            <NumInput label="平台费率" value={ed.platformFeeRate} onChange={v => updateEcommerceDrivers({ platformFeeRate: v })} pct step={0.1} />
                            <NumInput label="支付费率" value={ed.paymentFeeRate} onChange={v => updateEcommerceDrivers({ paymentFeeRate: v })} pct step={0.01} />
                            <NumInput label="客服费率" value={ed.customerServiceRate} onChange={v => updateEcommerceDrivers({ customerServiceRate: v })} pct step={0.1} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // new_store
    const ns = config.newStoreDrivers;
    return (
        <div className="space-y-3">
            <MethodHint method={config.forecast.method} />
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-600">⚡ 关键驱动参数（拖动滑块实时影响预测）</p>
                <button onClick={() => setShowAll(v => !v)} className="text-[10px] text-emerald-600 hover:underline">
                    {showAll ? '▲ 收起其余参数' : '▼ 展开全部参数'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <KeySlider label="年坪效" value={ns.salesPerSqmAnnual} onChange={v => updateNewStoreDrivers({ salesPerSqmAnnual: v })}
                    min={5000} max={25000} step={500} unit="元/㎡" color="emerald"
                    hint="新店成熟期坪效，决定 Year1 上限" />
                <KeySlider label="客单价" value={ns.avgTicket} onChange={v => updateNewStoreDrivers({ avgTicket: v })}
                    min={150} max={800} step={10} unit="元" color="emerald"
                    hint="店型/城市能级影响" />
                <KeySlider label="进店率" value={ns.entryRate} onChange={v => updateNewStoreDrivers({ entryRate: v })}
                    min={0.05} max={0.40} step={0.005} unit="%" color="emerald"
                    hint="商圈位置与品牌力影响" />
            </div>
            {showAll && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-500 mb-3">次要参数</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <CityTierSelect value={ns.cityTier} onChange={v => updateNewStoreDrivers({ cityTier: v as typeof ns.cityTier })} />
                        <NumInput label="面积(㎡)" value={ns.targetAreaSqm} onChange={v => updateNewStoreDrivers({ targetAreaSqm: v })} step={10} />
                        <NumInput label="平日客流" value={ns.weekdayTraffic} onChange={v => updateNewStoreDrivers({ weekdayTraffic: v })} step={100} />
                        <NumInput label="周末客流" value={ns.weekendTraffic} onChange={v => updateNewStoreDrivers({ weekendTraffic: v })} step={100} />
                        <NumInput label="成交转化率" value={ns.conversionRate} onChange={v => updateNewStoreDrivers({ conversionRate: v })} pct step={0.1} />
                        <NumInput label="年租金(元)" value={ns.annualRent} onChange={v => updateNewStoreDrivers({ annualRent: v })} step={10000} />
                        <NumInput label="年人工(元)" value={ns.annualStaff} onChange={v => updateNewStoreDrivers({ annualStaff: v })} step={10000} />
                        <NumInput label="装修摊销/年" value={ns.renovationAmortizedAnnual} onChange={v => updateNewStoreDrivers({ renovationAmortizedAnnual: v })} step={5000} />
                        <NumInput label="水电费/年" value={ns.utilitiesAnnual} onChange={v => updateNewStoreDrivers({ utilitiesAnnual: v })} step={1000} />
                        <NumInput label="其他费用/年" value={ns.otherAnnual} onChange={v => updateNewStoreDrivers({ otherAnnual: v })} step={1000} />
                    </div>
                </div>
            )}
        </div>
    );
}
