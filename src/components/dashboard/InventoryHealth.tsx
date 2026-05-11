'use client';
/**
 * src/components/dashboard/InventoryHealth.tsx  V2
 * 库存健康诊断与动作台 — 鞋类商品企划专用
 * 页面顺序：KPI总览 → 行动队列 → 四象限 → WOS分布 → 风险明细表 → 尺码/渠道 → 生命周期 → 联动说明
 */
import { useState } from 'react';
import invDataRaw from '../../../data/planning/inventory_health_plan.json';
import InvKpiBar from '@/components/inventory/InvKpiBar';
import InvActionQueue from '@/components/inventory/InvActionQueue';
import InvQuadrant from '@/components/inventory/InvQuadrant';
import InvWosDistribution from '@/components/inventory/InvWosDistribution';
import InvRiskTable from '@/components/inventory/InvRiskTable';
import InvSizeChannel from '@/components/inventory/InvSizeChannel';
import InvLifecycle from '@/components/inventory/InvLifecycle';
import { fmtCny, type StyleRecord } from '@/utils/inventoryHealth';

type InvData = typeof invDataRaw;
const invData = invDataRaw as InvData;
const styles = invData.styles as StyleRecord[];

// 锚点列表
const SECTIONS = [
    { anchor: 'inv-kpi', label: 'KPI 总览' },
    { anchor: 'inv-actions', label: '行动队列' },
    { anchor: 'inv-quadrant', label: '四象限' },
    { anchor: 'inv-wos', label: 'WOS 分布' },
    { anchor: 'inv-risk', label: '风险明细' },
    { anchor: 'inv-size', label: '尺码/渠道' },
    { anchor: 'inv-lifecycle', label: '生命周期' },
    { anchor: 'inv-linkage', label: '模块联动' },
];

function SectionHeader({ anchor, title, sub }: { anchor: string; title: string; sub?: string }) {
    return (
        <div id={anchor} className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800">{title}</h2>
            {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

export default function InventoryHealth() {
    const [activeAnchor, setActiveAnchor] = useState('inv-kpi');
    const clearanceMarginLoss = styles
        .filter(s => ['overstock', 'high'].includes(s.riskType))
        .reduce((sum, s) => sum + Math.min(0, s.financialImpact), 0);
    const plannedCashRecovery = Math.round(invData.summary.overstockAmount * 0.66 / 10000) * 10000;
    const financeCards = [
        { l: '断货机会损失', v: fmtCny(invData.summary.stockoutOpportunityLoss), tone: 'negative', note: '可避免损失' },
        { l: '积压占用现金', v: fmtCny(invData.summary.overstockAmount), tone: 'negative', note: '积压库存金额' },
        { l: '预计清货毛利损失', v: fmtCny(clearanceMarginLoss), tone: 'negative', note: '折扣侵蚀' },
        { l: '清货后现金回收', v: `+${fmtCny(plannedCashRecovery)}`, tone: 'positive', note: '按清货方案估算' },
    ];

    // IntersectionObserver 锚点高亮
    // (仅客户端，简单实现)
    const scrollTo = (anchor: string) => {
        setActiveAnchor(anchor);
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="space-y-6">
            {/* 顶部导航 */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 border-b border-slate-100 -mx-1 px-1">
                <div className="flex gap-1 flex-wrap">
                    {SECTIONS.map(s => (
                        <button key={s.anchor} onClick={() => scrollTo(s.anchor)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                activeAnchor === s.anchor
                                    ? 'bg-sky-500 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600'
                            }`}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* S1: KPI 总览 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-kpi" title="库存健康总览 KPI"
                    sub="库存金额 / 可售双数 / 整体WOS / 健康占比 / 机会损失 / 积压金额 / 补货&清货款数" />
                <InvKpiBar summary={invData.summary} styles={styles} />
            </section>

            {/* S2: 今日行动队列 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-actions" title="今日优先处理行动队列"
                    sub="按影响金额排序 · 含负责人/截止时间/联动去向 · 可按风险类型筛选" />
                <InvActionQueue items={invData.actionQueue} />
            </section>

            {/* S3: 库存四象限 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-quadrant" title="库存四象限诊断"
                    sub="高销缺货(补) / 高销充足(保) / 低销积压(清) / 低销正常(观) — 精准匹配动作" />
                <InvQuadrant styles={styles} />
            </section>

            {/* S4: WOS 分布 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-wos" title="WOS 分布"
                    sub="基于重点监控款式样本，支持 SKU款数 / 可售双数 / 库存金额 三种口径切换" />
                <InvWosDistribution styles={styles} />
            </section>

            {/* S5: 断货/积压风险明细表 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-risk" title="断货 / 积压风险明细表"
                    sub="重点风险款明细 · 断货按机会损失排序 · 积压按库存金额排序 · 含品类/波段/渠道/尺码断码 · 可筛选" />
                <InvRiskTable styles={styles} />
            </section>

            {/* S6: 尺码健康 + 渠道分布 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-size" title="尺码健康与渠道/区域分布"
                    sub="核心码覆盖率 / 断码率 / 边缘码积压率 | 各渠道库存健康/断货/积压占比" />
                <InvSizeChannel sizeHealth={invData.sizeHealth} channelDistribution={invData.channelDistribution} />
            </section>

            {/* S7: 波段生命周期 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-lifecycle" title="波段生命周期库存复盘"
                    sub="不同生命周期用不同WOS阈值 · 商品企划反写建议 · 下季加深/减量/尺码曲线修正" />
                <InvLifecycle lifecycleDistribution={invData.lifecycleDistribution} />
            </section>

            {/* S8: 模块联动说明 */}
            <section className="space-y-3">
                <SectionHeader anchor="inv-linkage" title="与其他模块联动"
                    sub="库存健康反向影响 OTB / 销售预测 / 现金流 / 损益 / 品类运营" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        { icon: '📦', title: 'OTB 预算', desc: '断货款→紧急追单，积压款→控单/停补，反写下期采购预算', color: 'border-sky-100 bg-sky-50/40' },
                        { icon: '📈', title: '销售预测', desc: '用实际销速/断码率/售罄率修正预测模型，防止过预测/欠预测', color: 'border-emerald-100 bg-emerald-50/40' },
                        { icon: '💰', title: '现金流', desc: '积压库存占用现金，清货回款释放现金，影响每月现金缺口', color: 'border-amber-100 bg-amber-50/40' },
                        { icon: '📊', title: '损益(P&L)', desc: '清货折扣侵蚀毛利，断货机会损失影响净收入，库存跌价影响营业利润', color: 'border-rose-100 bg-rose-50/40' },
                        { icon: '🗂️', title: '品类运营', desc: '按品类识别结构性过深/过浅，输出下季买量建议和尺码曲线修正', color: 'border-violet-100 bg-violet-50/40' },
                        { icon: '📋', title: '年度总控', desc: '输出库存周转次数、售罄率、断码率、清货率等年度经营指标', color: 'border-slate-100 bg-slate-50/40' },
                    ].map(l => (
                        <div key={l.title} className={`rounded-xl border p-4 ${l.color}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{l.icon}</span>
                                <span className="text-xs font-bold text-slate-800">{l.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">{l.desc}</p>
                        </div>
                    ))}
                </div>
                {/* 财务影响摘要 */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="text-xs font-bold text-slate-700 mb-3">💹 财务影响摘要</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        {financeCards.map(k => (
                            <div key={k.l} className={`rounded-xl border px-3 py-2.5 ${k.tone === 'positive' ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
                                <div className="text-slate-400 mb-1">{k.l}</div>
                                <div className={`font-bold text-sm ${k.tone === 'positive' ? 'text-emerald-700' : 'text-rose-700'}`}>{k.v}</div>
                                <div className="text-slate-400 text-[10px] mt-0.5">{k.note}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
