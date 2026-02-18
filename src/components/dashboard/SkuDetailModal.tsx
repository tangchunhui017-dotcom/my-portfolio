'use client';

export interface SkuDrillData {
    name: string;
    price: number;
    sellThrough: number;
    units: number;
    lifecycle: '新品' | '常青' | '清仓';
}

interface SkuDetailModalProps {
    sku: SkuDrillData | null;
    onClose: () => void;
}

const LIFECYCLE_CONFIG = {
    '新品': { color: 'bg-blue-100 text-blue-700', icon: '🆕', desc: '本季新品，处于市场导入期' },
    '常青': { color: 'bg-emerald-100 text-emerald-700', icon: '🌿', desc: '经典款，稳定贡献现金流' },
    '清仓': { color: 'bg-red-100 text-red-700', icon: '🏷️', desc: '库存清理阶段，需加速动销' },
};

function MetricRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <div className="text-right">
                <span className={`text-sm font-bold ${color ?? 'text-slate-900'}`}>{value}</span>
                {sub && <div className="text-xs text-slate-400">{sub}</div>}
            </div>
        </div>
    );
}

function ActionTag({ text, color }: { text: string; color: string }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
            {text}
        </span>
    );
}

function getActions(sku: SkuDrillData): { text: string; color: string }[] {
    const actions: { text: string; color: string }[] = [];
    if (sku.sellThrough < 70) {
        actions.push({ text: '⚡ 建议渠道调拨', color: 'bg-amber-100 text-amber-700' });
        actions.push({ text: '📢 加大直播投放', color: 'bg-orange-100 text-orange-700' });
    }
    if (sku.sellThrough < 60) {
        actions.push({ text: '🏷️ 考虑折扣促销', color: 'bg-red-100 text-red-700' });
    }
    if (sku.sellThrough >= 80) {
        actions.push({ text: '✅ 关注补货节奏', color: 'bg-emerald-100 text-emerald-700' });
        actions.push({ text: '📦 评估加深库存', color: 'bg-blue-100 text-blue-700' });
    }
    if (sku.lifecycle === '清仓') {
        actions.push({ text: '🚨 优先清仓处理', color: 'bg-red-100 text-red-700' });
    }
    if (actions.length === 0) {
        actions.push({ text: '👀 持续观察', color: 'bg-slate-100 text-slate-600' });
    }
    return actions;
}

export default function SkuDetailModal({ sku, onClose }: SkuDetailModalProps) {
    if (!sku) return null;

    const lcConfig = LIFECYCLE_CONFIG[sku.lifecycle];
    const stColor = sku.sellThrough >= 80 ? 'text-emerald-600' : sku.sellThrough >= 65 ? 'text-amber-600' : 'text-red-600';
    const stGap = sku.sellThrough - 80;
    const actions = getActions(sku);

    // 估算毛利率（基于价格带的经验值）
    const estimatedMargin = sku.price >= 600 ? 52 : sku.price >= 400 ? 48 : sku.price >= 300 ? 44 : 40;
    const estimatedRevenue = Math.round(sku.price * sku.units * (1 - 0.15)); // 假设 15% 折扣

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 遮罩 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* 弹窗 */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{lcConfig.icon}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lcConfig.color}`}>
                                    {sku.lifecycle}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold">{sku.name}</h3>
                            <p className="text-slate-400 text-xs mt-1">{lcConfig.desc}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white text-2xl leading-none mt-1"
                        >
                            ×
                        </button>
                    </div>

                    {/* 核心指标横排 */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold">{sku.sellThrough}%</div>
                            <div className="text-xs text-slate-300 mt-0.5">售罄率</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold">¥{sku.price}</div>
                            <div className="text-xs text-slate-300 mt-0.5">MSRP</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold">{sku.units}</div>
                            <div className="text-xs text-slate-300 mt-0.5">销量 (双)</div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    {/* 详细指标 */}
                    <div className="mb-4">
                        <MetricRow
                            label="售罄率"
                            value={`${sku.sellThrough}%`}
                            sub={stGap >= 0 ? `超出目标 +${stGap}pp` : `距目标 80% 差 ${Math.abs(stGap)}pp`}
                            color={stColor}
                        />
                        <MetricRow
                            label="估算净销售额"
                            value={`¥${(estimatedRevenue / 10000).toFixed(1)}万`}
                            sub="基于销量 × 折后价"
                        />
                        <MetricRow
                            label="估算毛利率"
                            value={`~${estimatedMargin}%`}
                            sub="基于价格带经验值"
                            color={estimatedMargin >= 48 ? 'text-emerald-600' : 'text-amber-600'}
                        />
                        <MetricRow
                            label="价格带"
                            value={sku.price >= 700 ? '¥700+' : sku.price >= 600 ? '¥600-699' : sku.price >= 500 ? '¥500-599' : sku.price >= 400 ? '¥400-499' : sku.price >= 300 ? '¥300-399' : '¥199-299'}
                        />
                    </div>

                    {/* 建议动作 */}
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">建议动作</div>
                        <div className="flex flex-wrap gap-2">
                            {actions.map((a, i) => (
                                <ActionTag key={i} text={a.text} color={a.color} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-xs text-slate-400">点击图表其他气泡可切换 SKU</p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}
