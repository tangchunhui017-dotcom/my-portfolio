'use client';
/**
 * src/components/profit-loss/StoreModelPanel.tsx  V9
 * S10 矩阵对比（StoreComparisonMatrix）
 * S11 货品深度配置参考
 * S12 评级公式（内嵌在Matrix中）
 * S13 模拟开店沙盒（StoreSandbox）
 */
import { useState } from 'react';
import StoreComparisonMatrix from './StoreComparisonMatrix';
import StoreSandbox from './StoreSandbox';
import StoreDcfModel from './StoreDcfModel';
import assortmentRaw from '../../../data/planning/pnl_store_assortment_depth.json';

type Assortment = typeof assortmentRaw;
const assortment = assortmentRaw as Assortment;

function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

export default function StoreModelPanel({ onNavigateToBrand }: {
    onNavigateToBrand?: (data: { annualRevenue: number; annualNetProfit: number }) => void;
}) {
    const [sandboxResult, setSandboxResult] = useState<{ annualRevenue: number; annualNetProfit: number } | null>(null);

    const handleLinkToBrand = (data: { annualRevenue: number; annualNetProfit: number }) => {
        setSandboxResult(data);
        onNavigateToBrand?.(data);
    };

    return (
        <div className="space-y-8">
            {/* S10 矩阵对比 */}
            <section id="store-matrix">
                <div className="border-b border-slate-100 pb-3 mb-4">
                    <h2 className="text-sm font-bold text-slate-800">S10 · 单店对比矩阵</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">旗舰店 / 标准店 / 街铺 — 多维对比 + 单店参数调整 + What-if 沙盒 · 点击评级 [A/B/C] 查看评分详情</p>
                </div>
                <StoreComparisonMatrix onLinkToBrandPnl={handleLinkToBrand} />
            </section>

            {/* S11 货品深度配置参考 */}
            <section id="store-assortment">
                <div className="border-b border-slate-100 pb-3 mb-4">
                    <h2 className="text-sm font-bold text-slate-800">S11 · 货品深度配置参考</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">鞋类特有：SKU 数 / 备货深度 / 尺码完整率 / 断码频率 · 与 OTB 采购计划联动</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {assortment.storeTypes.map(st => (
                        <div key={st.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="text-xs font-bold text-slate-800 mb-3">{st.label}</div>
                            <div className="space-y-2 text-[11px]">
                                {[
                                    { l: '首铺 SKU 数', v: st.initialSkuCount + ' SKU' },
                                    { l: '平均备货深度', v: st.avgDepthPerSku + ' 双/SKU' },
                                    { l: '尺码完整率', v: pct(st.sizeCompletion), warn: st.sizeCompletion < 0.88 },
                                    { l: '月断码次数', v: st.sizeStockoutPerMonth + ' 次/月', warn: st.sizeStockoutPerMonth > 5 },
                                    { l: '补货周期', v: st.replenishmentCycle + ' 天' },
                                    { l: '季末清仓率', v: pct(st.endSeasonClearanceRate), warn: st.endSeasonClearanceRate > 0.15 },
                                ].map(k => (
                                    <div key={k.l} className="flex justify-between">
                                        <span className="text-slate-400">{k.l}</span>
                                        <span className={`font-medium ${k.warn ? 'text-amber-600' : 'text-slate-700'}`}>{k.v}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-50">
                                <div className="text-[10px] text-slate-400">OTB建议</div>
                                <div className="text-[11px] text-slate-600 mt-0.5">{st.otbSuggestion}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* S13 模拟开店沙盒 */}
            <section id="store-sandbox">
                <div className="border-b border-slate-100 pb-3 mb-4">
                    <h2 className="text-sm font-bold text-slate-800">S13 · 模拟开店沙盒</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">设定各类门店扩张数量 → 年度增量收入 / 利润 / 初始投入 / 回本周期 → 可应用到品牌P&L</p>
                </div>
                <StoreSandbox onApplyToBrandPnl={handleLinkToBrand} />
                {sandboxResult && (
                    <div className="mt-3 text-[11px] px-4 py-2.5 bg-sky-50 border border-sky-200 text-sky-700 rounded-xl">
                        ✅ 已记录模拟结果：年度增量净收入 {(sandboxResult.annualRevenue / 10000).toFixed(0)}万，
                        净利润 {(sandboxResult.annualNetProfit / 10000).toFixed(0)}万。
                        切回"品牌年度 P&L"标签可在预算偏差模块看到联动。
                    </div>
                )}
            </section>

            {/* S16 单店长期投资回报模型（DCF）— V11 新增 */}
            <section id="store-dcf">
                <div className="border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-800">S16 · 长期投资回报模型（DCF）</h2>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">V11 新增</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">5年现金流贴现 · NPV / IRR / 回收期 · 折现率 & 永续增长率可调 · 三种店型对比</p>
                </div>
                <StoreDcfModel />
            </section>
        </div>
    );
}
