'use client';
/**
 * src/components/forecast/SalesForecastDownstreamOutput.tsx
 * 预测输出口径 → OTB / 现金流 / 损益 / 库存健康
 */
import type { ForecastChannel } from '@/hooks/useForecast';

interface DownstreamOutputProps {
    channel: ForecastChannel;
    annualForecast: number;
    grossMarginRate?: number;
    refundRate?: number;
    targetSellThrough?: number;
    forecastVersion?: string;
    isLocked?: boolean;
    onPushAll?: () => void;
}

function fmtCny(v: number) {
    return v >= 100000000 ? `${(v / 100000000).toFixed(2)}亿` : v >= 10000000 ? `${(v / 10000000).toFixed(2)}千万` : v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v);
}
function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

const CHANNEL_MARKUP: Record<ForecastChannel, number> = {
    physical: 3.8,
    ecommerce: 3.5,
    new_store: 3.8,
};

const CHANNEL_DISCOUNT: Record<ForecastChannel, number> = {
    physical: 0.72,
    ecommerce: 0.68,
    new_store: 0.75,
};

const CHANNEL_SELL_THROUGH: Record<ForecastChannel, number> = {
    physical: 0.82,
    ecommerce: 0.78,
    new_store: 0.75,
};

export default function SalesForecastDownstreamOutput({
    channel,
    annualForecast,
    grossMarginRate = 0.46,
    refundRate = 0.22,
    targetSellThrough,
    forecastVersion = 'forecast_2026_base_v1',
    isLocked = false,
    onPushAll,
}: DownstreamOutputProps) {
    const markup = CHANNEL_MARKUP[channel];
    const discount = CHANNEL_DISCOUNT[channel];
    const sellThrough = targetSellThrough ?? CHANNEL_SELL_THROUGH[channel];
    const effectiveSellThrough = channel === 'ecommerce' ? sellThrough - refundRate : sellThrough;

    // Derived downstream values
    const netSalesForecast = channel === 'ecommerce' ? annualForecast * (1 - refundRate) : annualForecast;
    const grossProfit = netSalesForecast * grossMarginRate;
    const requiredRetailInventory = netSalesForecast / Math.max(effectiveSellThrough, 0.1);
    const requiredCostInventory = requiredRetailInventory / Math.max(discount, 0.1) / Math.max(markup, 1);
    const targetEndingInventory = requiredRetailInventory * (1 - effectiveSellThrough);
    const cashflowPayable = requiredCostInventory * 0.65;   // ~65% paid in advance

    const outputs = [
        {
            target: 'OTB 预算',
            icon: '💰',
            bg: 'bg-sky-50 border-sky-100',
            titleCls: 'text-sky-700',
            syncStatus: isLocked ? '✅ 已冻结' : '🟡 草稿',
            items: [
                { l: '预测销售额', v: fmtCny(netSalesForecast) },
                { l: '目标售罄率', v: pct(effectiveSellThrough) },
                { l: '所需零售货值', v: fmtCny(requiredRetailInventory) },
                { l: '所需成本货值', v: fmtCny(requiredCostInventory), bold: true },
                { l: '加价倍率', v: `${markup.toFixed(1)}×` },
                { l: '折扣率', v: pct(discount) },
            ],
        },
        {
            target: '现金流',
            icon: '🏦',
            bg: 'bg-emerald-50 border-emerald-100',
            titleCls: 'text-emerald-700',
            syncStatus: isLocked ? '✅ 已推送' : '🟡 待推送',
            items: [
                { l: '净销售额', v: fmtCny(netSalesForecast) },
                { l: '预计回款率', v: '65%' },
                { l: '预计回款', v: fmtCny(netSalesForecast * 0.65) },
                { l: '采购应付款', v: fmtCny(cashflowPayable), bold: true },
                { l: '净现金流缺口', v: fmtCny(netSalesForecast * 0.65 - cashflowPayable) },
            ],
        },
        {
            target: '损益',
            icon: '📊',
            bg: 'bg-amber-50 border-amber-100',
            titleCls: 'text-amber-700',
            syncStatus: '🟡 待推送',
            items: [
                { l: '净销售额', v: fmtCny(netSalesForecast) },
                { l: '毛利率', v: pct(grossMarginRate) },
                { l: '毛利额', v: fmtCny(grossProfit), bold: true },
                channel === 'ecommerce'
                    ? { l: '广告+平台成本', v: pct(0.13 + 0.05) }
                    : { l: '租金/人工成本', v: pct(0.18) },
                { l: '渠道净利润估算', v: fmtCny(grossProfit * 0.55) },
            ],
        },
        {
            target: '库存健康',
            icon: '📦',
            bg: 'bg-violet-50 border-violet-100',
            titleCls: 'text-violet-700',
            syncStatus: '🟡 待推送',
            items: [
                { l: '目标期末库存', v: fmtCny(targetEndingInventory) },
                { l: '目标售罄率', v: pct(effectiveSellThrough) },
                { l: '所需铺货量', v: fmtCny(requiredRetailInventory) },
                { l: '建议安全库存', v: fmtCny(requiredRetailInventory * 0.15) },
                { l: '超库存风险阈值', v: fmtCny(targetEndingInventory * 1.3) },
            ],
        },
    ];

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">预测输出口径</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        预测版本：<span className="font-mono">{forecastVersion}</span>
                        {isLocked && <span className="ml-2 text-emerald-600 font-medium">· 已冻结</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!isLocked && (
                        <button
                            onClick={onPushAll}
                            className="text-[11px] px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            一键推送全部 →
                        </button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {outputs.map(o => (
                    <div key={o.target} className={`rounded-xl border p-3.5 ${o.bg}`}>
                        <div className="flex items-center justify-between mb-2.5">
                            <div className={`text-[11px] font-bold ${o.titleCls}`}>{o.icon} 输出至 {o.target}</div>
                            <span className="text-[10px]">{o.syncStatus}</span>
                        </div>
                        {o.items.map(it => (
                            <div key={it.l} className="flex justify-between text-[11px] py-0.5 border-b border-white/40 last:border-0">
                                <span className="text-slate-500 shrink-0">{it.l}</span>
                                <span className={`text-right ml-2 ${it.bold ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>{it.v}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {!isLocked && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-700">
                    ⚠ 当前为草稿版本。确认预测数字后请冻结版本，再推送至下游模块，避免下游多版本混用。
                </div>
            )}
        </div>
    );
}
