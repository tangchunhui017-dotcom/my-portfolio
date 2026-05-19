'use client';

import type { CompetitorLaunchCalendarItem } from '@/types/competitorTrendTypes';

const MONTH_LABELS: Record<number, string> = {
    1: '1月', 2: '2月', 3: '3月', 4: '4月', 5: '5月', 6: '6月',
    7: '7月', 8: '8月', 9: '9月', 10: '10月', 11: '11月', 12: '12月',
};

interface CompetitorLaunchCalendarPanelProps {
    items: CompetitorLaunchCalendarItem[];
    onJumpToPlanning?: (waveId: string) => void;
}

export default function CompetitorLaunchCalendarPanel({ items, onJumpToPlanning }: CompetitorLaunchCalendarPanelProps) {
    const sortedItems = [...items].sort((a, b) => a.launchMonth - b.launchMonth);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">竞品品牌</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">系列</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">上市月份</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">波段</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">主推品类</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">价格带</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">SKU数</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">主推渠道</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">折扣节点</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">热度变化</th>
                        <th className="text-left py-2 pr-3 text-slate-400 font-medium whitespace-nowrap">对本品影响</th>
                        <th className="text-left py-2 text-slate-400 font-medium whitespace-nowrap">建议应对</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {sortedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 pr-3 font-medium text-slate-800 whitespace-nowrap">{item.competitorBrand}</td>
                            <td className="py-2.5 pr-3 text-slate-600 max-w-[120px] truncate" title={item.competitorSeries}>{item.competitorSeries}</td>
                            <td className="py-2.5 pr-3 text-slate-700 whitespace-nowrap font-medium">{MONTH_LABELS[item.launchMonth]}</td>
                            <td className="py-2.5 pr-3 whitespace-nowrap">
                                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{item.launchWave}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{item.mainCategory}</td>
                            <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{item.priceBand}</td>
                            <td className="py-2.5 pr-3 text-slate-700 font-medium whitespace-nowrap">{item.skuCount}</td>
                            <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{item.mainChannel}</td>
                            <td className="py-2.5 pr-3 text-slate-500 max-w-[120px]">{item.discountTiming}</td>
                            <td className={`py-2.5 pr-3 font-medium whitespace-nowrap ${item.heatChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.heatChange > 0 ? '+' : ''}{item.heatChange}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-500 max-w-[160px]">{item.impactOnOurBrand}</td>
                            <td className="py-2.5">
                                <button
                                    onClick={() => item.suggestedResponse === '加入波段企划' && onJumpToPlanning?.(item.launchWave)}
                                    className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap hover:bg-amber-100 transition-colors"
                                >
                                    {item.suggestedResponse}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
