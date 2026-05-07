'use client';
/**
 * src/components/forecast/ForecastDriverPanel.tsx
 */
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import type { ForecastChannel } from '@/hooks/useForecast';

interface Props {
    channel: ForecastChannel;
}

function MethodHint({ method }: { method: string }) {
    const copy = method === 'driver_based'
        ? {
            tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            text: '当前为驱动因子预测：最终预测直接采用本面板参数计算结果。',
        }
        : method === 'hybrid'
        ? {
            tone: 'text-sky-700 bg-sky-50 border-sky-200',
            text: '当前为混合预测：最终预测取“增长率预测”和“驱动预测”的均值。',
        }
        : {
            tone: 'text-amber-700 bg-amber-50 border-amber-200',
            text: '当前为增长率预测：本面板参数仅用于对比分析，不参与最终预测；切换到“驱动因子预测”或“混合预测”后生效。',
        };

    return (
        <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${copy.tone}`}>
            {copy.text}
        </div>
    );
}

function NumInput({ label, value, onChange, step = 0.01, min = 0, pct = false }: {
    label: string; value: number; onChange: (v: number) => void;
    step?: number; min?: number; pct?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">{label}</label>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    step={step}
                    min={min}
                    value={pct ? +(value * 100).toFixed(2) : value}
                    onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onChange(pct ? v / 100 : v);
                    }}
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
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-sm"
            >
                <option value="tier1">一线城市</option>
                <option value="tier2">二线城市</option>
                <option value="tier3_plus">三线及以下</option>
            </select>
        </div>
    );
}

export default function ForecastDriverPanel({ channel }: Props) {
    const { config, updatePhysicalDrivers, updateEcommerceDrivers, updateNewStoreDrivers } = useGlobalConfig();

    if (channel === 'physical') {
        const pd = config.physicalDrivers;
        return (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm font-medium text-blue-700 mb-3">实体店驱动参数</p>
                <MethodHint method={config.forecast.method} />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <NumInput label="客单价提升" value={pd.avgTicketLift} onChange={v => updatePhysicalDrivers({ avgTicketLift: v })} pct step={0.1} />
                    <NumInput label="转化率提升" value={pd.conversionRateLift} onChange={v => updatePhysicalDrivers({ conversionRateLift: v })} pct step={0.1} />
                    <NumInput label="客流提升" value={pd.trafficLift} onChange={v => updatePhysicalDrivers({ trafficLift: v })} pct step={0.1} />
                    <NumInput label="件单价提升" value={pd.avgUnitPriceLift} onChange={v => updatePhysicalDrivers({ avgUnitPriceLift: v })} pct step={0.1} />
                    <NumInput label="投放预算(元)" value={pd.investmentBudget} onChange={v => updatePhysicalDrivers({ investmentBudget: v })} step={10000} pct={false} />
                </div>
            </div>
        );
    }

    if (channel === 'ecommerce') {
        const ed = config.ecommerceDrivers;
        return (
            <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
                <p className="text-sm font-medium text-violet-700 mb-3">电商渠道驱动参数</p>
                <MethodHint method={config.forecast.method} />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <NumInput label="退货率" value={ed.refundRate} onChange={v => updateEcommerceDrivers({ refundRate: v })} pct step={0.1} />
                    <NumInput label="客单价提升" value={ed.avgTicketLift} onChange={v => updateEcommerceDrivers({ avgTicketLift: v })} pct step={0.1} />
                    <NumInput label="转化率提升" value={ed.conversionRateLift} onChange={v => updateEcommerceDrivers({ conversionRateLift: v })} pct step={0.1} />
                    <NumInput label="流量成本提升" value={ed.trafficCostLift} onChange={v => updateEcommerceDrivers({ trafficCostLift: v })} pct step={0.1} />
                    <NumInput label="平台费率" value={ed.platformFeeRate} onChange={v => updateEcommerceDrivers({ platformFeeRate: v })} pct step={0.1} />
                    <NumInput label="支付费率" value={ed.paymentFeeRate} onChange={v => updateEcommerceDrivers({ paymentFeeRate: v })} pct step={0.01} />
                    <NumInput label="客服费率" value={ed.customerServiceRate} onChange={v => updateEcommerceDrivers({ customerServiceRate: v })} pct step={0.1} />
                </div>
            </div>
        );
    }

    // new_store
    const ns = config.newStoreDrivers;
    return (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-sm font-medium text-emerald-700 mb-3">新店驱动参数</p>
            <MethodHint method={config.forecast.method} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <CityTierSelect value={ns.cityTier} onChange={v => updateNewStoreDrivers({ cityTier: v as typeof ns.cityTier })} />
                <NumInput label="面积(㎡)" value={ns.targetAreaSqm} onChange={v => updateNewStoreDrivers({ targetAreaSqm: v })} step={10} pct={false} />
                <NumInput label="年坪效(元/㎡)" value={ns.salesPerSqmAnnual} onChange={v => updateNewStoreDrivers({ salesPerSqmAnnual: v })} step={500} pct={false} />
                <NumInput label="平日客流" value={ns.weekdayTraffic} onChange={v => updateNewStoreDrivers({ weekdayTraffic: v })} step={100} pct={false} />
                <NumInput label="周末客流" value={ns.weekendTraffic} onChange={v => updateNewStoreDrivers({ weekendTraffic: v })} step={100} pct={false} />
                <NumInput label="进店率" value={ns.entryRate} onChange={v => updateNewStoreDrivers({ entryRate: v })} pct step={0.1} />
                <NumInput label="成交转化率" value={ns.conversionRate} onChange={v => updateNewStoreDrivers({ conversionRate: v })} pct step={0.1} />
                <NumInput label="客单价(元)" value={ns.avgTicket} onChange={v => updateNewStoreDrivers({ avgTicket: v })} step={10} pct={false} />
                <NumInput label="年租金(元)" value={ns.annualRent} onChange={v => updateNewStoreDrivers({ annualRent: v })} step={10000} pct={false} />
                <NumInput label="年人工(元)" value={ns.annualStaff} onChange={v => updateNewStoreDrivers({ annualStaff: v })} step={10000} pct={false} />
                <NumInput label="装修摊销/年" value={ns.renovationAmortizedAnnual} onChange={v => updateNewStoreDrivers({ renovationAmortizedAnnual: v })} step={5000} pct={false} />
                <NumInput label="水电费/年" value={ns.utilitiesAnnual} onChange={v => updateNewStoreDrivers({ utilitiesAnnual: v })} step={1000} pct={false} />
                <NumInput label="其他费用/年" value={ns.otherAnnual} onChange={v => updateNewStoreDrivers({ otherAnnual: v })} step={1000} pct={false} />
            </div>
        </div>
    );
}
