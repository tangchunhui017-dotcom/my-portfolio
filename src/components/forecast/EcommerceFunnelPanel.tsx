'use client';
/**
 * src/components/forecast/EcommerceFunnelPanel.tsx
 * 电商漏斗预测 + 活动日历 + 平台结构
 */
import { useState, useMemo } from 'react';
import funnelRaw from '../../../data/planning/sales_forecast_ecommerce_funnel.json';
import campaignRaw from '../../../data/planning/sales_forecast_campaign_calendar.json';

type FunnelRow = {
    month: number; monthLabel: string;
    impressions: number; visitors: number; addToCartRate: number;
    conversionRate: number; avgOrderValue: number; grossGmvCny: number;
    refundRate: number; netSalesCny: number; adCostRate: number;
    platformFeeRate: number; logisticsCostRate: number; grossMarginRate: number;
    campaignNote?: string;
};

type CampaignRow = {
    campaignName: string; month: number; monthLabel: string;
    targetGmvCny: number; discountRate: number; adBudgetCny: number;
    waveKey: string; mainCategory: string; expectedRoi: number;
    inventoryRisk: 'low' | 'medium' | 'high'; note: string;
};

// Mock platform split (derived from totals)
const PLATFORMS = [
    { key: 'tmall',    label: '天猫',     sharePct: 0.40, refundRate: 0.24, adRate: 0.10, platformFee: 0.055, mainCategory: '跑步/休闲' },
    { key: 'douyin',   label: '抖音',     sharePct: 0.28, refundRate: 0.30, adRate: 0.18, platformFee: 0.030, mainCategory: '休闲/国潮' },
    { key: 'jd',       label: '京东',     sharePct: 0.18, refundRate: 0.18, adRate: 0.08, platformFee: 0.060, mainCategory: '运动/正装' },
    { key: 'video',    label: '视频号',   sharePct: 0.08, refundRate: 0.22, adRate: 0.12, platformFee: 0.010, mainCategory: '私域/新品' },
    { key: 'xiaohong', label: '小红书',   sharePct: 0.06, refundRate: 0.20, adRate: 0.25, platformFee: 0.000, mainCategory: '种草引流' },
];

function fmtCny(v: number) {
    return v >= 10000000 ? `${(v / 10000000).toFixed(2)}千万` : v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v);
}
function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function kNum(v: number) { return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v); }

const RISK_CFG = {
    low: { cls: 'bg-emerald-100 text-emerald-700', label: '低风险' },
    medium: { cls: 'bg-amber-100 text-amber-700', label: '中风险' },
    high: { cls: 'bg-rose-100 text-rose-700', label: '高风险' },
};

type ViewTab = 'funnel' | 'campaign' | 'platform';

export default function EcommerceFunnelPanel() {
    const [view, setView] = useState<ViewTab>('funnel');
    const funnelData = funnelRaw as FunnelRow[];
    const campaignData = campaignRaw as CampaignRow[];

    const annual = useMemo(() => funnelData.reduce((acc, r) => ({
        grossGmv: acc.grossGmv + r.grossGmvCny,
        netSales: acc.netSales + r.netSalesCny,
        visitors: acc.visitors + r.visitors,
        impressions: acc.impressions + r.impressions,
    }), { grossGmv: 0, netSales: 0, visitors: 0, impressions: 0 }), [funnelData]);

    const avgRefundRate = annual.grossGmv > 0 ? 1 - annual.netSales / annual.grossGmv : 0;
    const avgConversion = annual.visitors > 0
        ? funnelData.reduce((s, r) => s + r.conversionRate * r.visitors, 0) / annual.visitors : 0;

    return (
        <div className="space-y-4">
            {/* ── 电商漏斗总览 KPI ── */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                <div className="text-xs font-semibold text-violet-800 mb-3">🔀 电商销售漏斗（年度）</div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-violet-900 mb-3">
                    {[
                        { label: '年曝光量', value: kNum(annual.impressions) },
                        { label: '年访客量', value: kNum(annual.visitors) },
                        { label: '支付GMV', value: fmtCny(annual.grossGmv) },
                        { label: '综合退款率', value: pct(avgRefundRate) },
                        { label: '年净销售额', value: fmtCny(annual.netSales) },
                    ].map((k, i) => (
                        <span key={k.label} className="flex items-center gap-1">
                            {i > 0 && <span className="text-violet-300 mx-1">→</span>}
                            <span className="rounded-lg bg-white border border-violet-200 px-3 py-2 text-center min-w-[84px]">
                                <div className="text-[10px] text-violet-500 mb-0.5">{k.label}</div>
                                <div className="font-bold">{k.value}</div>
                            </span>
                        </span>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div className="rounded-lg bg-white border border-violet-100 px-3 py-2">
                        <div className="text-violet-500 mb-0.5">综合转化率</div>
                        <div className="font-bold text-violet-800">{pct(avgConversion)}</div>
                        <div className="text-violet-400">访客→支付</div>
                    </div>
                    <div className="rounded-lg bg-white border border-violet-100 px-3 py-2">
                        <div className="text-violet-500 mb-0.5">净销售率</div>
                        <div className={`font-bold ${avgRefundRate > 0.25 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {pct(1 - avgRefundRate)}
                        </div>
                        <div className="text-violet-400">净销售/GMV</div>
                    </div>
                    <div className="rounded-lg bg-white border border-violet-100 px-3 py-2">
                        <div className="text-violet-500 mb-0.5">大促GMV占比</div>
                        <div className="font-bold text-violet-800">
                            {pct(campaignData.reduce((s, c) => s + c.targetGmvCny, 0) / annual.grossGmv)}
                        </div>
                        <div className="text-violet-400">活动/全年</div>
                    </div>
                </div>
            </div>

            {/* ── Tab切换 ── */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                {([['funnel', '月度漏斗'], ['campaign', '活动日历'], ['platform', '平台结构']] as [ViewTab, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setView(k)}
                        className={`px-3 py-1.5 rounded-md transition-colors ${view === k ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
                        {l}
                    </button>
                ))}
            </div>

            {/* ── 月度漏斗表 ── */}
            {view === 'funnel' && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['月份','曝光量','访客','转化率','客单价','支付GMV','退款率','净销售额','广告费率','毛利率','大促'].map(h => (
                                        <th key={h} className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${h === '月份' || h === '大促' ? 'text-left' : 'text-right'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {funnelData.map(r => (
                                    <tr key={r.month} className={`border-t border-slate-50 ${r.campaignNote ? 'bg-violet-50/30' : 'hover:bg-slate-50'}`}>
                                        <td className="py-2 px-3 font-medium text-slate-700">{r.monthLabel}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{kNum(r.impressions)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{kNum(r.visitors)}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{pct(r.conversionRate)}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">¥{r.avgOrderValue}</td>
                                        <td className="py-2 px-3 text-right font-medium text-slate-700">{fmtCny(r.grossGmvCny)}</td>
                                        <td className={`py-2 px-3 text-right ${r.refundRate > 0.27 ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>{pct(r.refundRate)}</td>
                                        <td className="py-2 px-3 text-right font-semibold text-slate-800">{fmtCny(r.netSalesCny)}</td>
                                        <td className={`py-2 px-3 text-right ${r.adCostRate > 0.14 ? 'text-amber-600' : 'text-slate-500'}`}>{pct(r.adCostRate)}</td>
                                        <td className={`py-2 px-3 text-right ${r.grossMarginRate < 0.42 ? 'text-rose-600' : 'text-emerald-600'}`}>{pct(r.grossMarginRate)}</td>
                                        <td className="py-2 px-3 text-[10px] text-violet-600 max-w-[100px]">{r.campaignNote ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 活动日历 ── */}
            {view === 'campaign' && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['活动','月份','目标GMV','折扣率','投放预算','预计ROI','主推波段','主推品类','库存风险','备注'].map(h => (
                                        <th key={h} className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${h === '活动' || h === '主推品类' || h === '备注' ? 'text-left' : 'text-right'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {campaignData.map(c => (
                                    <tr key={c.campaignName} className="border-t border-slate-50 hover:bg-slate-50">
                                        <td className="py-2 px-3 font-semibold text-violet-700">{c.campaignName}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{c.monthLabel}</td>
                                        <td className="py-2 px-3 text-right font-medium text-slate-700">{fmtCny(c.targetGmvCny)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{pct(c.discountRate)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{fmtCny(c.adBudgetCny)}</td>
                                        <td className={`py-2 px-3 text-right font-medium ${c.expectedRoi >= 3 ? 'text-emerald-600' : c.expectedRoi >= 2.5 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {c.expectedRoi.toFixed(1)}x
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-500 font-mono text-[10px]">{c.waveKey}</td>
                                        <td className="py-2 px-3 text-slate-600">{c.mainCategory}</td>
                                        <td className="py-2 px-3 text-right">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${RISK_CFG[c.inventoryRisk].cls}`}>
                                                {RISK_CFG[c.inventoryRisk].label}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-[11px] text-slate-400 max-w-[160px]">{c.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 border-t border-slate-50 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                        <span>全年大促目标GMV合计：<strong className="text-violet-700">{fmtCny(campaignData.reduce((s, c) => s + c.targetGmvCny, 0))}</strong></span>
                        <span>投放预算合计：<strong>{fmtCny(campaignData.reduce((s, c) => s + c.adBudgetCny, 0))}</strong></span>
                    </div>
                </div>
            )}

            {/* ── 平台结构 ── */}
            {view === 'platform' && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['平台','GMV占比','预测GMV','净销售额','退款率','广告费率','平台扣点','净毛利率','主推品类'].map(h => (
                                        <th key={h} className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${h === '平台' || h === '主推品类' ? 'text-left' : 'text-right'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {PLATFORMS.map(p => {
                                    const gmv = annual.grossGmv * p.sharePct;
                                    const net = gmv * (1 - p.refundRate);
                                    const netGm = 0.46 - p.adRate - p.platformFee - 0.04;
                                    return (
                                        <tr key={p.key} className="border-t border-slate-50 hover:bg-slate-50">
                                            <td className="py-2 px-3 font-semibold text-slate-700">{p.label}</td>
                                            <td className="py-2 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full rounded-full bg-violet-400" style={{ width: `${p.sharePct * 100}%` }} />
                                                    </div>
                                                    <span className="text-slate-600">{pct(p.sharePct)}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right font-medium text-slate-700">{fmtCny(gmv)}</td>
                                            <td className="py-2 px-3 text-right text-slate-600">{fmtCny(net)}</td>
                                            <td className={`py-2 px-3 text-right ${p.refundRate > 0.27 ? 'text-rose-600' : 'text-slate-500'}`}>{pct(p.refundRate)}</td>
                                            <td className={`py-2 px-3 text-right ${p.adRate > 0.15 ? 'text-amber-600' : 'text-slate-500'}`}>{pct(p.adRate)}</td>
                                            <td className="py-2 px-3 text-right text-slate-500">{pct(p.platformFee)}</td>
                                            <td className={`py-2 px-3 text-right font-semibold ${netGm > 0.2 ? 'text-emerald-600' : netGm > 0.1 ? 'text-amber-600' : 'text-rose-600'}`}>{pct(Math.max(0, netGm))}</td>
                                            <td className="py-2 px-3 text-slate-500">{p.mainCategory}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 border-t border-slate-50 text-[11px] text-slate-400">
                        净毛利率 = 毛利率(46%) − 广告费率 − 平台扣点 − 物流费率(4%)
                    </div>
                </div>
            )}
        </div>
    );
}
