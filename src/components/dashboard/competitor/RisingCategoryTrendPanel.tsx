'use client';

import type { RisingCategoryTrend, TrendStatusColor } from '@/types/competitorTrendTypes';

const COLOR_MAP: Record<TrendStatusColor, { badge: string; bar: string; text: string }> = {
    green:  { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', text: 'text-emerald-600' },
    blue:   { badge: 'bg-blue-100 text-blue-700',       bar: 'bg-blue-500',    text: 'text-blue-600' },
    orange: { badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500',   text: 'text-amber-600' },
    red:    { badge: 'bg-rose-100 text-rose-700',       bar: 'bg-rose-500',    text: 'text-rose-600' },
    purple: { badge: 'bg-violet-100 text-violet-700',   bar: 'bg-violet-500',  text: 'text-violet-600' },
    gray:   { badge: 'bg-slate-100 text-slate-500',     bar: 'bg-slate-400',   text: 'text-slate-500' },
};

interface RisingCategoryTrendPanelProps {
    trends: RisingCategoryTrend[];
}

export default function RisingCategoryTrendPanel({ trends }: RisingCategoryTrendPanelProps) {
    const maxGrowth = Math.max(...trends.map((t) => t.growthRate), 1);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">品类</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">鞋型</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">增长率</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">增长率图示</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">热度变化</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">SKU变化</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">价格带</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">竞品品牌</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">适合本品</th>
                        <th className="text-left py-2 text-slate-400 font-medium whitespace-nowrap">建议动作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {trends.map((trend) => {
                        const cfg = COLOR_MAP[trend.statusColor];
                        const growthPct = (trend.growthRate / maxGrowth) * 100;
                        return (
                            <tr key={trend.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 pr-3 font-medium text-slate-800 whitespace-nowrap">{trend.category}</td>
                                <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{trend.shoeType}</td>
                                <td className={`py-2.5 pr-3 font-semibold whitespace-nowrap ${cfg.text}`}>
                                    +{trend.growthRate}%
                                </td>
                                <td className="py-2.5 pr-3 w-28">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${cfg.bar}`}
                                                style={{ width: `${growthPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className={`py-2.5 pr-3 whitespace-nowrap ${trend.heatChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {trend.heatChange > 0 ? '+' : ''}{trend.heatChange}
                                </td>
                                <td className={`py-2.5 pr-3 whitespace-nowrap ${trend.skuChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {trend.skuChange > 0 ? '+' : ''}{trend.skuChange}
                                </td>
                                <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{trend.priceBand}</td>
                                <td className="py-2.5 pr-3 text-slate-500 max-w-[160px]">
                                    {trend.competitorBrands.slice(0, 3).join(' / ')}
                                    {trend.competitorBrands.length > 3 && ' ...'}
                                </td>
                                <td className="py-2.5 pr-3 whitespace-nowrap">
                                    {trend.fitForBrand ? (
                                        <span className="text-emerald-600 font-medium">✓ 适合</span>
                                    ) : (
                                        <span className="text-slate-400">观察</span>
                                    )}
                                </td>
                                <td className="py-2.5">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>
                                        {trend.recommendedAction}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
