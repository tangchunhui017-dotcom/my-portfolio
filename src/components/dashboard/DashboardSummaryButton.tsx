'use client';

import { useState } from 'react';
import { formatMoneyCny } from '@/config/numberFormat';

interface SummaryProps {
    kpis: {
        totalNetSales: number;
        avgSellThrough: number;
        avgMarginRate: number;
        avgDiscountDepth: number;
        activeSKUs: number;
        top10Concentration: number;
        channelSales: Record<string, number>;
        priceBandSales: Record<string, { units: number; sales: number; grossProfit: number; onHandUnits: number }>;
    } | null;
    filterSummary: string;
}

function generateSummary(kpis: SummaryProps['kpis'], filterSummary: string): string {
    if (!kpis) return '暂无数据，请调整筛选条件后重试。';

    const st = Math.round(kpis.avgSellThrough * 100);
    const margin = Math.round(kpis.avgMarginRate * 100);
    const discount = Math.round(kpis.avgDiscountDepth * 100);
    const sales = formatMoneyCny(kpis.totalNetSales);
    const top10 = Math.round(kpis.top10Concentration * 100);

    // 渠道最高/最低
    const channelEntries = Object.entries(kpis.channelSales).sort((a, b) => b[1] - a[1]);
    const topChannel = channelEntries[0]?.[0] ?? '--';
    const topChannelPct = kpis.totalNetSales > 0
        ? Math.round((channelEntries[0]?.[1] ?? 0) / kpis.totalNetSales * 100)
        : 0;

    // 价格带最强
    const bandEntries = Object.entries(kpis.priceBandSales).sort((a, b) => b[1].sales - a[1].sales);
    const topBandMap: Record<string, string> = {
        PB1: '199-399', PB2: '399-599', PB3: '599-799', PB4: '800+',
    };
    const topBand = topBandMap[bandEntries[0]?.[0]] ?? '--';

    // 风险判断
    const stStatus = st >= 80 ? '✅ 达成目标' : st >= 65 ? '⚠️ 接近目标' : '🔴 低于警戒线';
    const marginStatus = margin >= 50 ? '健康' : margin >= 40 ? '偏低' : '需关注';
    const discountStatus = discount <= 15 ? '折扣控制良好' : discount <= 25 ? '折扣略深' : '折扣过深，需控制';

    const lines = [
        `📊 **鞋类经营摘要** | 筛选范围：${filterSummary}`,
        ``,
        `**① 结果层**`,
        `本期净销售额 ${sales}，动销 SKU ${kpis.activeSKUs} 款（色码维度），Top 10 SKU 集中度 ${top10}%（${top10 > 60 ? '集中度偏高，存在断货/结构失衡风险' : '结构健康'}）。`,
        ``,
        `**② 效率层**`,
        `整体售罄率 ${st}%，${stStatus}。平均毛利率 ${margin}%（${marginStatus}），平均折扣深度 ${discount}%（${discountStatus}）。重点关注波段节奏与配色结构是否匹配销量。`,
        ``,
        `**③ 结构层**`,
        `渠道贡献：${topChannel} 渠道占比最高（${topChannelPct}%），是核心动销渠道。价格带表现：${topBand} 价格带销售额最强，建议下季度在该价格带增加核心鞋型 SKU 深度。`,
        ``,
        `**④ 行动建议**`,
        st < 70
            ? `⚡ 售罄率低于 70%，建议立即启动动销方案：对低动销鞋款进行渠道调拨（直营→电商/奥莱），并在 W8 前评估是否需要分波段折扣促销。`
            : discount > 20
                ? `⚡ 折扣深度超过 20%，建议收紧下季度促销力度，优先通过渠道调拨和配色优化消化库存，保护毛利率。`
                : `✅ 当前经营状态良好，建议聚焦 ${topBand} 价格带的核心鞋型深度补货，并提前锁定下季度 OTB 预算。`,
    ];

    return lines.join('\n');
}

export default function DashboardSummaryButton({ kpis, filterSummary }: SummaryProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const summary = generateSummary(kpis, filterSummary);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(summary.replace(/\*\*/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* 触发按钮 */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
                <span>✨</span> 生成摘要
            </button>

            {/* 弹窗 */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* 遮罩 */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />

                    {/* 内容卡 */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900">✨ 经营摘要</h3>
                                <p className="text-xs text-slate-400 mt-0.5">基于当前筛选条件自动生成 · 可复制用于汇报</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* 摘要内容 */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                                {summary.split('\n').map((line, i) => {
                                    if (line.startsWith('**') && line.endsWith('**')) {
                                        return (
                                            <div key={i} className="font-bold text-slate-900 mt-3 mb-1 not-italic font-sans">
                                                {line.replace(/\*\*/g, '')}
                                            </div>
                                        );
                                    }
                                    if (line === '') return <div key={i} className="h-1" />;
                                    return (
                                        <div key={i} className="font-sans">
                                            {line.replace(/\*\*/g, '')}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                            <p className="text-xs text-slate-400">数据已脱敏处理，仅供内部参考</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${copied
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                >
                                    {copied ? '✅ 已复制' : '📋 复制文本'}
                                </button>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    关闭
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
