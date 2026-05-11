'use client';
/**
 * src/components/forecast/MarketShareForecast.tsx
 * S14 竞争市场视角 — 行业规模 + 我的份额 + 竞品影响
 */
import { useForecast } from '@/hooks/useForecast';
import industryRaw from '../../../data/planning/sales_forecast_industry_market.json';
import { calcMarketShareForecast } from '@/utils/salesForecastV8';

type CategoryMarket = { category: string; market2025: number; market2026: number; growthRate: number; ourShare: number };
type Competitor = { name: string; estimatedOpenStores2026: number; newProductLaunch: string; promotionRisk: string; salesImpact: number };
type IndustryData = {
    totalMarketForecast2026: number;
    categoryMarketSize: CategoryMarket[];
    competitors: Competitor[];
    ourShareForecast: { physical: number; ecommerce: number; combined: number };
};

const industry = industryRaw as IndustryData;

const RISK_COLOR: Record<string, string> = {
    高: 'text-rose-600 bg-rose-50 border-rose-200',
    中: 'text-amber-600 bg-amber-50 border-amber-200',
    低: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

function fmtB(v: number) {
    return v >= 1e11 ? `${(v / 1e11).toFixed(1)}千亿` : v >= 1e8 ? `${(v / 1e8).toFixed(0)}亿` : `${(v / 1e6).toFixed(0)}百万`;
}
function pct(v: number) { return (v * 100).toFixed(3) + '%'; }

export default function MarketShareForecast() {
    const physical = useForecast('physical', 'base');
    const ecommerce = useForecast('ecommerce', 'base');
    const totalForecast = (physical?.annualForecast ?? 0) + (ecommerce?.annualForecast ?? 0);

    const shareResult = calcMarketShareForecast(
        totalForecast, industry.totalMarketForecast2026,
        industry.ourShareForecast.combined,
    );

    return (
        <div className="space-y-4">
            {/* 总市场 + 我的份额 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: '行业总市场(2026E)', v: fmtB(industry.totalMarketForecast2026), sub: '全品类鞋类零售', color: 'text-slate-700' },
                    { label: '我的年度预测', v: fmtB(totalForecast), sub: '实体+电商合并', color: 'text-sky-700' },
                    { label: '综合市场份额', v: pct(shareResult.myShareRate), sub: shareResult.vsLastYearShare > 0 ? `↑ 提升${pct(shareResult.vsLastYearShare)}` : `↓ 下滑${pct(Math.abs(shareResult.vsLastYearShare))}`, color: shareResult.vsLastYearShare >= 0 ? 'text-emerald-700' : 'text-rose-700' },
                    { label: '提升空间', v: fmtB(Math.max(0, shareResult.opportunityGap)), sub: '追赶目标份额缺口', color: 'text-violet-700' },
                ].map(k => (
                    <div key={k.label} className="rounded-xl border border-slate-100 bg-white shadow-sm px-3 py-2.5">
                        <div className="text-[10px] text-slate-400 mb-1">{k.label}</div>
                        <div className={`text-base font-bold ${k.color}`}>{k.v}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* 品类市场 */}
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 text-xs font-semibold text-slate-600">品类市场规模 + 增速</div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>{['品类','2025市场','2026预测','增速','我的份额'].map(h => (
                                <th key={h} className={`py-2 px-3 font-medium text-slate-500 ${h === '品类' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody>
                            {industry.categoryMarketSize.map(c => (
                                <tr key={c.category} className="border-t border-slate-50 hover:bg-slate-50">
                                    <td className="py-2 px-3 text-slate-700">{c.category}</td>
                                    <td className="py-2 px-3 text-right text-slate-500">{fmtB(c.market2025)}</td>
                                    <td className="py-2 px-3 text-right font-medium text-slate-700">{fmtB(c.market2026)}</td>
                                    <td className={`py-2 px-3 text-right font-medium ${c.growthRate > 0.07 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        +{(c.growthRate * 100).toFixed(1)}%
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-500">{pct(c.ourShare)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 竞品影响 */}
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 text-xs font-semibold text-slate-600">竞品威胁评估（2026年）</div>
                <div className="divide-y divide-slate-50">
                    {industry.competitors.map(c => (
                        <div key={c.name} className="flex items-start gap-3 px-4 py-3">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${RISK_COLOR[c.promotionRisk] ?? ''}`}>
                                {c.promotionRisk}风险
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-medium text-xs text-slate-700">{c.name}</span>
                                    <span className="text-[10px] text-slate-400">新开 {c.estimatedOpenStores2026} 家门店</span>
                                </div>
                                <p className="text-[11px] text-slate-500">{c.newProductLaunch}</p>
                            </div>
                            <span className="text-[11px] font-medium text-rose-600 shrink-0">
                                {(c.salesImpact * 100).toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
                    综合竞品压力：预计对我方年度销售造成
                    <span className="font-bold text-rose-600 mx-1">
                        {(industry.competitors.reduce((s, c) => s + Math.abs(c.salesImpact), 0) * 100).toFixed(1)}%
                    </span>
                    的潜在下行压力
                </div>
            </div>
        </div>
    );
}
