'use client';

import { formatPriceBandLabel, resolvePriceBandByMsrp } from '@/config/priceBand';
import type { DashboardLifecycleLabel } from '@/config/dashboardLifecycle';

export interface SkuDrillData {
    name: string;
    price: number;
    sellThrough: number;
    units: number;
    lifecycle: DashboardLifecycleLabel;
}

interface SkuDetailModalProps {
    sku: SkuDrillData | null;
    onClose: () => void;
}

const LIFECYCLE_CONFIG: Record<DashboardLifecycleLabel, { color: string; icon: string; desc: string }> = {
    新品: {
        color: 'bg-blue-100 text-blue-700',
        icon: '🆕',
        desc: '当前筛选口径下的当季新品，用于观察上新承接效率与新品势能。',
    },
    次新品: {
        color: 'bg-amber-100 text-amber-700',
        icon: '🍂',
        desc: '上一季或去年同季仍在售的延续商品，用于观察承接去化与切换压力。',
    },
    老品: {
        color: 'bg-emerald-100 text-emerald-700',
        icon: '🧱',
        desc: '两年及以上仍在售的商品，作为现金流基盘与长尾库存观察对象。',
    },
};

function MetricRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="flex items-center justify-between border-b border-slate-50 py-3 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <div className="text-right">
                <span className={`text-sm font-bold ${color ?? 'text-slate-900'}`}>{value}</span>
                {sub ? <div className="text-xs text-slate-400">{sub}</div> : null}
            </div>
        </div>
    );
}

function ActionTag({ text, color }: { text: string; color: string }) {
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{text}</span>;
}

function getActions(sku: SkuDrillData) {
    const actions: Array<{ text: string; color: string }> = [];

    if (sku.sellThrough < 70) {
        actions.push({ text: '建议渠道调拨', color: 'bg-amber-100 text-amber-700' });
        actions.push({ text: '加大内容投放', color: 'bg-orange-100 text-orange-700' });
    }
    if (sku.sellThrough < 60) {
        actions.push({ text: '考虑折扣促销', color: 'bg-red-100 text-red-700' });
    }
    if (sku.sellThrough >= 80) {
        actions.push({ text: '关注补货节奏', color: 'bg-emerald-100 text-emerald-700' });
        actions.push({ text: '评估加深库存', color: 'bg-blue-100 text-blue-700' });
    }
    if (sku.lifecycle === '老品') {
        actions.push({ text: '优先处理老品占压', color: 'bg-emerald-100 text-emerald-700' });
    }
    if (sku.lifecycle === '次新品') {
        actions.push({ text: '观察承接去化节奏', color: 'bg-amber-100 text-amber-700' });
    }
    if (actions.length === 0) {
        actions.push({ text: '持续观察', color: 'bg-slate-100 text-slate-600' });
    }

    return actions;
}

export default function SkuDetailModal({ sku, onClose }: SkuDetailModalProps) {
    if (!sku) return null;

    const lifecycleConfig = LIFECYCLE_CONFIG[sku.lifecycle];
    const sellThroughColor = sku.sellThrough >= 80 ? 'text-emerald-600' : sku.sellThrough >= 65 ? 'text-amber-600' : 'text-red-600';
    const sellThroughGap = sku.sellThrough - 80;
    const actions = getActions(sku);
    const estimatedMargin = sku.price >= 600 ? 52 : sku.price >= 400 ? 48 : sku.price >= 300 ? 44 : 40;
    const estimatedRevenue = Math.round(sku.price * sku.units * 0.85);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="mb-1 flex items-center gap-2">
                                <span className="text-lg">{lifecycleConfig.icon}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lifecycleConfig.color}`}>
                                    {sku.lifecycle}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold">{sku.name}</h3>
                            <p className="mt-1 text-xs text-slate-300">{lifecycleConfig.desc}</p>
                        </div>
                        <button onClick={onClose} className="mt-1 text-2xl leading-none text-slate-400 hover:text-white">
                            ×
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white/10 p-3 text-center">
                            <div className="text-2xl font-bold">{sku.sellThrough}%</div>
                            <div className="mt-0.5 text-xs text-slate-300">售罄率</div>
                        </div>
                        <div className="rounded-xl bg-white/10 p-3 text-center">
                            <div className="text-2xl font-bold">¥{sku.price}</div>
                            <div className="mt-0.5 text-xs text-slate-300">MSRP</div>
                        </div>
                        <div className="rounded-xl bg-white/10 p-3 text-center">
                            <div className="text-2xl font-bold">{sku.units}</div>
                            <div className="mt-0.5 text-xs text-slate-300">销量(双)</div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4">
                    <div className="mb-4">
                        <MetricRow
                            label="售罄率"
                            value={`${sku.sellThrough}%`}
                            sub={sellThroughGap >= 0 ? `超出目标 +${sellThroughGap}pp` : `距目标 80% 差 ${Math.abs(sellThroughGap)}pp`}
                            color={sellThroughColor}
                        />
                        <MetricRow
                            label="估算净销售额"
                            value={`¥${(estimatedRevenue / 10000).toFixed(1)}万`}
                            sub="基于销量 × 折后价估算"
                        />
                        <MetricRow
                            label="估算毛利率"
                            value={`~${estimatedMargin}%`}
                            sub="基于价格带经验值"
                            color={estimatedMargin >= 48 ? 'text-emerald-600' : 'text-amber-600'}
                        />
                        <MetricRow label="价格带" value={formatPriceBandLabel(resolvePriceBandByMsrp(sku.price))} />
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">建议动作</div>
                        <div className="flex flex-wrap gap-2">
                            {actions.map((action, index) => (
                                <ActionTag key={`${action.text}-${index}`} text={action.text} color={action.color} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <p className="text-xs text-slate-400">点击图表其他气泡可切换 SKU</p>
                    <button onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}
