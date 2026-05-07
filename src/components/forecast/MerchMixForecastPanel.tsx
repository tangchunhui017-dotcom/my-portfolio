'use client';
/**
 * src/components/forecast/MerchMixForecastPanel.tsx
 * 销售预测货盘拆解面板 — 接入统一预测引擎来源标注
 */
import { useForecastMerchMix } from '@/hooks/useForecastMerchMix';
import { useForecastEngine } from '@/hooks/useForecastEngine';
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';

function pct(v: number, d = 1) {
    return `${(v * 100).toFixed(d)}%`;
}

function gapChip(gap: number) {
    if (Math.abs(gap) < 0.005) return <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">吻合</span>;
    if (gap > 0) return <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">+{pct(gap)}</span>;
    return <span className="text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">{pct(gap)}</span>;
}

function SourceBadge({ source }: { source: 'history' | 'configured' | 'template' | undefined }) {
    if (!source) return null;
    const cls = source === 'history' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : source === 'configured' ? 'bg-sky-50 text-sky-700 border-sky-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
    const label = source === 'history' ? '历史推导' : source === 'configured' ? '配置驱动' : '模板假设';
    return <span className={`ml-1.5 text-[10px] border px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

const CHANNEL_LABELS: Record<ForecastChannel | 'brand', string> = {
    brand: '品牌总盘',
    physical: '实体店',
    ecommerce: '电商',
    new_store: '新店',
};

export default function MerchMixForecastPanel({ scenario, channel = 'brand' }: { scenario: ForecastScenario; channel?: ForecastChannel | 'brand' }) {
    const result = useForecastMerchMix(scenario, channel);
    // P3: 接入统一预测引擎，用于来源标注和风险列表
    const engine = useForecastEngine(scenario);

    if (!result) return (
        <div className="flex items-center justify-center h-24 text-slate-400 text-sm">加载货盘预测中…</div>
    );

    const { categories, priceBands, lifecycle, waves, topCategory, priceBandIssue, newProductShortfall, peakWave, otbStructureSuggestion, totalAnnualForecast } = result;

    return (
        <div className="space-y-5">
            {/* 业务结论 */}
            <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-4 space-y-2">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-sky-800 uppercase tracking-wide">货盘预测业务结论</p>
                    {engine && <SourceBadge source={engine.assumptions.source} />}
                    {engine && <span className="text-[10px] text-slate-400">数据质量：{engine.meta.dataQuality === 'template' ? '模板兜底' : engine.meta.dataQuality === 'mixed' ? '历史+配置混合' : '历史推导'}</span>}
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                    <li>🎯 <strong>当前口径：</strong>{CHANNEL_LABELS[channel]}</li>
                    {topCategory && <li>📦 <strong>最大销售贡献品类：</strong>{topCategory.label}（预测占比 {pct(topCategory.salesShare)}，毛利 {pct(topCategory.grossMarginRate)}）</li>}
                    {priceBandIssue
                        ? <li>💰 <strong>价格带风险：</strong>{priceBandIssue}</li>
                        : <li>💰 <strong>价格带结构：</strong>各价格带占比接近目标，结构健康</li>}
                    {newProductShortfall < -0.02
                        ? <li>🆕 <strong>新品贡献：</strong>低于目标 {pct(Math.abs(newProductShortfall))}，建议加大新品引入力度</li>
                        : <li>🆕 <strong>新品贡献：</strong>新品销售占比 {pct((lifecycle.find(l => l.key === 'new')?.salesShare) ?? 0)}，接近目标</li>}
                    {peakWave && <li>📅 <strong>重点波段：</strong>{peakWave.label}（{pct(peakWave.salesShare)}）为年度峰值</li>}
                    <li>🏭 <strong>OTB 建议：</strong>{otbStructureSuggestion}</li>
                </ul>
            </div>

            {/* 1. 品类预测表 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                    <h3 className="font-semibold text-slate-800">品类预测拆解</h3>
                    <p className="text-xs text-slate-400 mt-0.5">年度预测 {formatMoneyCny(totalAnnualForecast)}（{CHANNEL_LABELS[channel]}）</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-slate-700">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                                <th className="text-left py-2 px-3 font-medium whitespace-nowrap">品类</th>
                                <th className="text-right py-2 px-3 font-medium whitespace-nowrap">预测销售额</th>
                                <th className="text-right py-2 px-3 font-medium whitespace-nowrap">销售占比</th>
                                <th className="text-right py-2 px-3 font-medium whitespace-nowrap">增长率</th>
                                <th className="text-right py-2 px-3 font-medium whitespace-nowrap">毛利率</th>
                                <th className="text-right py-2 px-3 font-medium whitespace-nowrap">预测毛利</th>
                                <th className="text-left py-2 px-3 font-medium whitespace-nowrap">经营判断</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.key} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-2 px-3 font-medium">{cat.label}</td>
                                    <td className="text-right py-2 px-3">{formatMoneyCny(cat.annualForecast)}</td>
                                    <td className="text-right py-2 px-3">{pct(cat.salesShare)}</td>
                                    <td className={`text-right py-2 px-3 ${cat.growthRate >= 0.10 ? 'text-emerald-600' : 'text-slate-600'}`}>+{pct(cat.growthRate)}</td>
                                    <td className={`text-right py-2 px-3 ${cat.grossMarginRate >= 0.60 ? 'text-emerald-600' : cat.grossMarginRate >= 0.55 ? 'text-slate-600' : 'text-amber-600'}`}>{pct(cat.grossMarginRate)}</td>
                                    <td className="text-right py-2 px-3 text-emerald-600">{formatMoneyCny(cat.grossProfit)}</td>
                                    <td className="py-2 px-3 text-slate-500">{cat.verdict}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. 价格带 + 新老品 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 价格带 */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50">
                        <h3 className="font-semibold text-slate-800">价格带结构</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-slate-700">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                                    <th className="text-left py-2 px-3 font-medium">价格带</th>
                                    <th className="text-right py-2 px-3 font-medium">预测销售额</th>
                                    <th className="text-right py-2 px-3 font-medium">当前占比</th>
                                    <th className="text-right py-2 px-3 font-medium">目标占比</th>
                                    <th className="text-center py-2 px-3 font-medium">差异</th>
                                    <th className="text-left py-2 px-3 font-medium">风险提示</th>
                                </tr>
                            </thead>
                            <tbody>
                                {priceBands.map(pb => (
                                    <tr key={pb.key} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-2 px-3 font-medium">{pb.label}</td>
                                        <td className="text-right py-2 px-3">{formatMoneyCny(pb.annualForecast)}</td>
                                        <td className="text-right py-2 px-3">{pct(pb.salesShare)}</td>
                                        <td className="text-right py-2 px-3 text-slate-400">{pct(pb.targetShare)}</td>
                                        <td className="text-center py-2 px-3">{gapChip(pb.shareGap)}</td>
                                        <td className="py-2 px-3 text-slate-500">{pb.risk}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 新老品 */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50">
                        <h3 className="font-semibold text-slate-800">新品 / 延续款 / 清货 结构</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-slate-700">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                                    <th className="text-left py-2 px-3 font-medium">生命周期</th>
                                    <th className="text-right py-2 px-3 font-medium">预测销售额</th>
                                    <th className="text-right py-2 px-3 font-medium">当前占比</th>
                                    <th className="text-right py-2 px-3 font-medium">目标占比</th>
                                    <th className="text-center py-2 px-3 font-medium">差异</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lifecycle.map(lc => (
                                    <tr key={lc.key} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-2 px-3 font-medium">{lc.label}</td>
                                        <td className="text-right py-2 px-3">{formatMoneyCny(lc.annualForecast)}</td>
                                        <td className="text-right py-2 px-3">{pct(lc.salesShare)}</td>
                                        <td className="text-right py-2 px-3 text-slate-400">{pct(lc.targetShare)}</td>
                                        <td className="text-center py-2 px-3">{gapChip(lc.shareGap)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 pb-4 pt-2">
                        {newProductShortfall < -0.02 && (
                            <p className="text-[10px] text-rose-500 bg-rose-50 rounded-lg px-3 py-2">
                                ⚠️ 新品销售低于目标 {pct(Math.abs(newProductShortfall))}，需在下个波段加大新品推广力度。
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. 波段预测 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                    <h3 className="font-semibold text-slate-800">波段销售预测</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-slate-700">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                                <th className="text-left py-2 px-3 font-medium">波段</th>
                                <th className="text-left py-2 px-3 font-medium">月份</th>
                                <th className="text-right py-2 px-3 font-medium">预测销售额</th>
                                <th className="text-right py-2 px-3 font-medium">占比</th>
                                <th className="text-center py-2 px-3 font-medium">标注</th>
                            </tr>
                        </thead>
                        <tbody>
                            {waves.map(w => (
                                <tr key={w.key} className={`border-b border-slate-50 hover:bg-slate-50 ${w.isPeak ? 'bg-sky-50/60' : ''}`}>
                                    <td className="py-2 px-3 font-medium">{w.label}</td>
                                    <td className="py-2 px-3 text-slate-400">{w.months.map(m => `${m}月`).join('、')}</td>
                                    <td className="text-right py-2 px-3 font-semibold">{formatMoneyCny(w.annualForecast)}</td>
                                    <td className="text-right py-2 px-3">{pct(w.salesShare)}</td>
                                    <td className="text-center py-2 px-3">
                                        {w.isPeak
                                            ? <span className="text-[10px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full font-semibold">销售峰值</span>
                                            : <span className="text-[10px] text-slate-400">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-5 pb-4 pt-2">
                    <p className="text-[10px] text-sky-600 bg-sky-50 rounded-lg px-3 py-2">
                        💡 {otbStructureSuggestion}
                    </p>
                </div>
            </div>

            {/* 4. 引擎风险提示（来自 useForecastEngine） */}
            {engine && engine.risks.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-5 py-4 space-y-2">
                    <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide">预测引擎风险提示</p>
                    <ul className="space-y-1.5">
                        {engine.risks.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-rose-700">
                                <span className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${risk.level === 'danger' ? 'bg-rose-500' : risk.level === 'warning' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                <span>{risk.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 5. 数据来源图例 */}
            {engine && (
                <div className="flex items-center gap-4 px-1 text-[10px] text-slate-400">
                    <span>数据来源：</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />历史推导</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />配置驱动</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />模板假设</span>
                </div>
            )}
        </div>
    );
}
