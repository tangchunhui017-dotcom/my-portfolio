'use client';

import type { DashboardLifecycleLabel } from '@/config/dashboardLifecycle';

type SkuWosItem = {
    skuId: string;
    name: string;
    category: string;
    wos: number;
    onHandUnits: number;
    sellThrough: number;
    lifecycle: DashboardLifecycleLabel | '-';
    msrp: number;
};

interface InventoryHealthProps {
    skuWosData: SkuWosItem[];
}

// WOS 分桶定义
const WOS_BUCKETS = [
    { key: 'stockout', label: '< 4 周', desc: '断货风险', min: 0, max: 4, color: '#ef4444', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: '🔴' },
    { key: 'tight', label: '4–6 周', desc: '库存偏紧', min: 4, max: 6, color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: '🟠' },
    { key: 'healthy', label: '6–8 周', desc: '健康区间', min: 6, max: 8, color: '#22c55e', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: '🟢' },
    { key: 'high', label: '8–12 周', desc: '库存偏高', min: 8, max: 12, color: '#eab308', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: '🟡' },
    { key: 'overstock', label: '> 12 周', desc: '积压风险', min: 12, max: Infinity, color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: '🔴' },
];

function getBucket(wos: number) {
    return WOS_BUCKETS.find(b => wos >= b.min && wos < b.max) ?? WOS_BUCKETS[4];
}

export default function InventoryHealth({ skuWosData }: InventoryHealthProps) {
    if (!skuWosData || skuWosData.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-slate-400">
                <div className="text-center">
                    <div className="text-4xl mb-2">📦</div>
                    <div>无库存数据</div>
                </div>
            </div>
        );
    }

    // 分桶统计
    const bucketCounts = WOS_BUCKETS.map(b => ({
        ...b,
        skus: skuWosData.filter(s => s.wos >= b.min && s.wos < b.max),
    }));
    const totalSkus = skuWosData.length;
    const maxCount = Math.max(...bucketCounts.map(b => b.skus.length), 1);

    // 需关注列表
    const stockoutRisk = [...skuWosData].filter(s => s.wos < 4).sort((a, b) => a.wos - b.wos).slice(0, 8);
    const overstockRisk = [...skuWosData].filter(s => s.wos > 12 && s.wos < 90).sort((a, b) => b.wos - a.wos).slice(0, 8);

    // 整体健康判断
    const healthyPct = bucketCounts.find(b => b.key === 'healthy')!.skus.length / totalSkus;
    const riskPct = (bucketCounts.find(b => b.key === 'stockout')!.skus.length + bucketCounts.find(b => b.key === 'overstock')!.skus.length) / totalSkus;
    const healthStatus = riskPct > 0.3 ? 'danger' : riskPct > 0.15 ? 'warn' : 'good';

    const statusConfig = {
        good: { label: '库存结构健康', badge: '✅', accentBar: 'bg-emerald-500', headerBg: 'bg-gradient-to-r from-emerald-50 to-white', border: 'border-emerald-200', badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
        warn: { label: '结构偏差，需关注', badge: '⚠️', accentBar: 'bg-amber-500', headerBg: 'bg-gradient-to-r from-amber-50 to-white', border: 'border-amber-200', badgeBg: 'bg-amber-100 text-amber-800 border-amber-300' },
        danger: { label: '结构失衡，立即处置', badge: '🚨', accentBar: 'bg-red-500', headerBg: 'bg-gradient-to-r from-red-50 to-white', border: 'border-red-200', badgeBg: 'bg-red-100 text-red-800 border-red-300' },
    };
    const sc = statusConfig[healthStatus];

    return (
        <div className={`rounded-2xl border ${sc.border} overflow-hidden shadow-sm`}>
            <div className="flex">
                {/* 左侧竖条 */}
                <div className={`w-1.5 shrink-0 ${sc.accentBar}`} />

                <div className="flex-1">
                    {/* 头部 */}
                    <div className={`${sc.headerBg} px-5 pt-5 pb-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl leading-none">📦</span>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">库存健康分布</h2>
                                <p className="text-xs text-slate-400 mt-0.5">WOS 分布 · 断货 / 积压风险识别 · 共 {totalSkus} 个在库 SKU</p>
                            </div>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${sc.badgeBg}`}>
                            {sc.badge} {sc.label}
                        </span>
                    </div>

                    <div className="px-5 py-4 bg-white">
                        {/* WOS 分布横向条形图 */}
                        <div className="mb-6">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">WOS 分布</h3>
                            <div className="space-y-2.5">
                                {bucketCounts.map(bucket => {
                                    const pct = bucket.skus.length / totalSkus * 100;
                                    const barWidth = bucket.skus.length / maxCount * 100;
                                    return (
                                        <div key={bucket.key} className="flex items-center gap-3">
                                            {/* 标签 */}
                                            <div className="w-20 shrink-0 text-right">
                                                <span className="text-xs font-medium text-slate-600">{bucket.label}</span>
                                            </div>
                                            {/* 条形 */}
                                            <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                                    style={{ width: `${Math.max(barWidth, 2)}%`, backgroundColor: bucket.color }}
                                                >
                                                    {bucket.skus.length > 0 && (
                                                        <span className="text-[10px] font-bold text-white">{bucket.skus.length}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* 占比 + 描述 */}
                                            <div className="w-28 shrink-0 flex items-center gap-1.5">
                                                <span className="text-xs font-semibold text-slate-700">{pct.toFixed(0)}%</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bucket.bg} ${bucket.text} border ${bucket.border}`}>
                                                    {bucket.desc}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 图例注释 */}
                            <div className="mt-3 text-xs text-slate-400 flex flex-wrap gap-3">
                                <span>🟢 6-8 周 = 健康区间</span>
                                <span>目标：健康区间 SKU 占比 &gt; 50%</span>
                                <span>当前健康占比：<strong className="text-slate-700">{(healthyPct * 100).toFixed(0)}%</strong></span>
                            </div>
                        </div>

                        {/* 风险 SKU 双列表 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 断货风险 */}
                            <div className={`rounded-xl border border-red-200 bg-red-50 p-4`}>
                                <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <span>🔴</span> 断货风险（WOS &lt; 4 周）
                                    <span className="ml-auto bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {stockoutRisk.length} 款
                                    </span>
                                </h4>
                                {stockoutRisk.length === 0 ? (
                                    <p className="text-xs text-red-400 text-center py-2">✅ 暂无断货风险</p>
                                ) : (
                                    <div className="space-y-2">
                                        {stockoutRisk.map(sku => (
                                            <div key={sku.skuId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">{sku.name}</p>
                                                    <p className="text-[10px] text-slate-400">{sku.category} · {sku.lifecycle} · ¥{sku.msrp}</p>
                                                </div>
                                                <div className="text-right ml-3 shrink-0">
                                                    <p className="text-sm font-bold text-red-600">{sku.wos}W</p>
                                                    <p className="text-[10px] text-slate-400">{sku.onHandUnits} 双</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 积压风险 */}
                            <div className={`rounded-xl border border-purple-200 bg-purple-50 p-4`}>
                                <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <span>🟣</span> 积压风险（WOS &gt; 12 周）
                                    <span className="ml-auto bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {overstockRisk.length} 款
                                    </span>
                                </h4>
                                {overstockRisk.length === 0 ? (
                                    <p className="text-xs text-purple-400 text-center py-2">✅ 暂无积压风险</p>
                                ) : (
                                    <div className="space-y-2">
                                        {overstockRisk.map(sku => (
                                            <div key={sku.skuId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-100">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">{sku.name}</p>
                                                    <p className="text-[10px] text-slate-400">{sku.category} · {sku.lifecycle} · ¥{sku.msrp}</p>
                                                </div>
                                                <div className="text-right ml-3 shrink-0">
                                                    <p className="text-sm font-bold text-purple-600">{sku.wos}W</p>
                                                    <p className="text-[10px] text-slate-400">{sku.onHandUnits} 双</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 底部说明 */}
                    <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 text-xs text-slate-400 flex flex-wrap gap-4">
                        <span>WOS = 期末库存 / 周均销量（单款口径）</span>
                        <span>数据基准：最新记录周</span>
                        <span className="ml-auto">风险阈值：断货 &lt;4W · 积压 &gt;12W</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
