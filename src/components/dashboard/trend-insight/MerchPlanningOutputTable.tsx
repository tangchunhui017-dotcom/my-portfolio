'use client';

import type { TrendPlanningItem } from '@/types/trendInsightTypes';

const RISK_STYLES: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
};
const RISK_LABELS: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' };

const ACTION_JUMPS: Record<string, { label: string; tab: string }> = {
    进入波段企划: { label: '→ 波段企划', tab: 'planning' },
    进入OTB: { label: '→ OTB', tab: 'otb' },
    看竞品证据: { label: '→ 竞品', tab: 'competitor' },
};

export default function MerchPlanningOutputTable({
    rows,
    onJumpToTab,
}: {
    rows: TrendPlanningItem[];
    onJumpToTab?: (tab: string) => void;
}) {
    if (!rows || rows.length === 0) {
        return <p className="text-xs text-slate-400">暂无企划输出数据</p>;
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {['品牌', '季节', '品类', '波段', '商品角色', '建议款数', '价格带', '渠道', 'SKU深度', '进OTB', '风险', '动作建议'].map((h) => (
                            <th
                                key={h}
                                className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 whitespace-nowrap"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        const jump = ACTION_JUMPS[row.action];
                        return (
                            <tr
                                key={idx}
                                className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.brand}</td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.season}</td>
                                <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.category}</td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.wave}</td>
                                <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.productRole}</td>
                                <td className="px-3 py-2 text-center font-semibold text-slate-800">
                                    {row.suggestedStyleCount}
                                </td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.priceBand}</td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.channel}</td>
                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.skuDepth}</td>
                                <td className="px-3 py-2 text-center">
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                            row.enterOtb
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-slate-100 text-slate-400 border-slate-200'
                                        }`}
                                    >
                                        {row.enterOtb ? '是' : '否'}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${RISK_STYLES[row.risk]}`}
                                    >
                                        {RISK_LABELS[row.risk]}
                                    </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-600">{row.action}</span>
                                        {jump && onJumpToTab && (
                                            <button
                                                onClick={() => onJumpToTab(jump.tab)}
                                                className="text-[10px] text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 hover:bg-blue-50 transition-colors"
                                            >
                                                {jump.label}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
