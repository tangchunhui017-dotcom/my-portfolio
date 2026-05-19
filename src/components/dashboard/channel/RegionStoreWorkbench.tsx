'use client';
import { useState, useMemo } from 'react';
import type {
    RegionStoreKpi,
    RegionStoreDecisionItem,
    RegionStoreAction,
    StoreTierItem,
    RegionalPerformanceItem,
    StorePerformanceRankingItem,
    StoreProductFitItem,
    StoreInventorySizeHealthItem,
    ReplenishmentTransferItem,
    RegionalDesignSignalItem,
    NewStoreRampUpItem,
    StoreDetailItem,
    RiskLevel,
    ActionStatus,
    StoreLevel,
    StoreTierStoreRow,
} from './types';

// ─── 格式化工具 ──────────────────────────────────────────────

function fmtMoney(v: number) {
    if (!Number.isFinite(v)) return '—';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1e8) return `${sign}¥${(abs / 1e8).toFixed(1)}亿`;
    if (abs >= 1e4) return `${sign}¥${(abs / 1e4).toFixed(1)}万`;
    return `${sign}¥${Math.round(abs).toLocaleString()}`;
}
function fmtPct(v: number, digits = 1) {
    if (!Number.isFinite(v)) return '—';
    return `${(v * 100).toFixed(digits)}%`;
}
function fmtDiff(v: number, digits = 1) {
    if (!Number.isFinite(v)) return '—';
    const s = v >= 0 ? '+' : '';
    return `${s}${(v * 100).toFixed(digits)}pp`;
}

// ─── 颜色工具 ────────────────────────────────────────────────

function statusColor(status: RegionStoreKpi['status']) {
    switch (status) {
        case 'healthy': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'opportunity': return 'border-blue-200 bg-blue-50 text-blue-700';
        case 'warning': return 'border-amber-200 bg-amber-50 text-amber-700';
        case 'risk': return 'border-rose-200 bg-rose-50 text-rose-700';
        case 'observe': return 'border-violet-200 bg-violet-50 text-violet-700';
        default: return 'border-slate-200 bg-slate-50 text-slate-500';
    }
}
function statusDot(status: RegionStoreKpi['status']) {
    switch (status) {
        case 'healthy': return 'bg-emerald-500';
        case 'opportunity': return 'bg-blue-500';
        case 'warning': return 'bg-amber-500';
        case 'risk': return 'bg-rose-500';
        case 'observe': return 'bg-violet-500';
        default: return 'bg-slate-400';
    }
}
function riskColor(r: RiskLevel) {
    switch (r) {
        case 'high': return 'text-rose-700 bg-rose-100 border-rose-200';
        case 'medium': return 'text-amber-700 bg-amber-100 border-amber-200';
        case 'low': return 'text-sky-700 bg-sky-100 border-sky-200';
        case 'healthy': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
        default: return 'text-slate-500 bg-slate-100 border-slate-200';
    }
}
function riskLabel(r: RiskLevel) {
    switch (r) {
        case 'high': return '高风险';
        case 'medium': return '预警';
        case 'low': return '关注';
        case 'healthy': return '健康';
        default: return '—';
    }
}
function priorityColor(p: 'high' | 'medium' | 'low') {
    switch (p) {
        case 'high': return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
}
function statusBadge(s: ActionStatus) {
    switch (s) {
        case 'in_progress': return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'closed': return 'bg-slate-100 text-slate-500 border-slate-200';
        default: return 'bg-violet-100 text-violet-700 border-violet-200';
    }
}
function statusText(s: ActionStatus) {
    switch (s) {
        case 'suggested': return '建议中';
        case 'pending': return '待审批';
        case 'in_progress': return '执行中';
        case 'completed': return '已完成';
        case 'closed': return '已关闭';
    }
}
function tierColor(t: StoreLevel) {
    switch (t) {
        case 'S': return 'bg-yellow-500 text-white';
        case 'A': return 'bg-blue-600 text-white';
        case 'B': return 'bg-teal-600 text-white';
        case 'C': return 'bg-orange-500 text-white';
        case 'D': return 'bg-rose-600 text-white';
        case 'outlet': return 'bg-purple-600 text-white';
        case 'new': return 'bg-emerald-600 text-white';
        case 'popup': return 'bg-pink-500 text-white';
        default: return 'bg-slate-500 text-white';
    }
}
function designActionLabel(a: RegionalDesignSignalItem['designAction']) {
    switch (a) {
        case 'continue': return '延续开发';
        case 'test': return '小批量测试';
        case 'reduce': return '减少开发';
        case 'optimize_comfort': return '优化脚感';
        case 'optimize_last': return '优化楦型';
        case 'optimize_material': return '优化材质';
        case 'adjust_color': return '调整颜色';
    }
}

// ─── SectionHeader ───────────────────────────────────────────

function SectionHeader({ color, title, sub }: { color: string; title: string; sub?: string }) {
    return (
        <div className="flex items-center gap-2 mb-1">
            <span className={`w-1 h-5 rounded-full inline-block ${color}`} />
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {sub && <span className="text-[11px] text-slate-400 ml-1">· {sub}</span>}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 1. Region & Store Executive Summary（8 KPI 卡）
// ═══════════════════════════════════════════════════════════════

export function RegionStoreExecutiveSummary({ kpis }: { kpis: RegionStoreKpi[] }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-blue-500" title="区域&门店总览" sub="核心经营指标一览" />
            <p className="text-xs text-slate-500 mb-4">
                首屏指标反映当前区域门店整体健康度，颜色代表状态：绿=健康 / 蓝=机会 / 橙=预警 / 红=高风险 / 紫=观察
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {kpis.map((kpi) => (
                    <div key={kpi.key} className={`rounded-xl border px-3 py-3 ${statusColor(kpi.status)}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(kpi.status)}`} />
                            <span className="text-[11px] font-medium truncate">{kpi.label}</span>
                        </div>
                        <div className="text-xl font-bold leading-none mb-1">{kpi.value}</div>
                        {kpi.target && (
                            <div className="text-[10px] opacity-70">目标 {kpi.target}</div>
                        )}
                        {kpi.diff && (
                            <div className={`text-[11px] font-semibold mt-1 ${(kpi.diffPct ?? 0) >= 0 ? 'opacity-90' : 'opacity-90'}`}>
                                {kpi.diff}
                            </div>
                        )}
                        {kpi.sub && (
                            <div className="text-[10px] opacity-60 mt-0.5 truncate">{kpi.sub}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 2. Decision Summary 决策摘要
// ═══════════════════════════════════════════════════════════════

const TONE_MAP = {
    good: 'border-emerald-200 bg-emerald-50/60 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50/60 text-amber-800',
    risk: 'border-rose-200 bg-rose-50/60 text-rose-800',
    info: 'border-blue-200 bg-blue-50/60 text-blue-800',
} as const;

const DECISION_TYPE_ICON: Record<RegionStoreDecisionItem['type'], string> = {
    add: '📈',
    control: '⚠️',
    risk_store: '🔴',
    replenish: '📦',
    clearance: '🏷️',
    transfer_sku: '🔄',
    new_store_risk: '🏗️',
    sku_adjust: '🗂️',
};

export function RegionStoreDecisionSummary({ items }: { items: RegionStoreDecisionItem[] }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-rose-500" title="决策摘要" sub="结论先行，快速定位风险与机会" />
            <p className="text-xs text-slate-500 mb-4">
                基于当前销售、库存、门店效率数据自动生成，供商品总监和销售总监快速决策。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                    <div key={item.id} className={`rounded-xl border px-3 py-3 ${TONE_MAP[item.tone]}`}>
                        <div className="flex items-start gap-2">
                            <span className="text-base leading-none mt-0.5 flex-shrink-0">{DECISION_TYPE_ICON[item.type]}</span>
                            <div className="min-w-0">
                                <div className="text-xs font-bold mb-1">{item.label}</div>
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    {item.subjects.slice(0, 4).map((s) => (
                                        <span key={s} className="inline-flex items-center rounded-full bg-white/70 border border-current/20 px-1.5 py-0.5 text-[10px] font-semibold">{s}</span>
                                    ))}
                                    {item.subjects.length > 4 && (
                                        <span className="text-[10px] opacity-60">+{item.subjects.length - 4}</span>
                                    )}
                                </div>
                                <div className="text-[11px] opacity-75 leading-relaxed">{item.reason}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 3. Action Center 行动中心
// ═══════════════════════════════════════════════════════════════

export function RegionStoreActionCenter({ actions }: { actions: RegionStoreAction[] }) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? actions : actions.slice(0, 6);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-orange-500" title="行动中心" sub="最高优先级建议，每条附影响估算" />
            <p className="text-xs text-slate-500 mb-4">
                行动建议按优先级排序，包含问题对象、原因、建议动作和三维影响估算。点击关联模块可跳转。
            </p>
            <div className="space-y-3">
                {visible.map((a) => (
                    <div
                        key={a.id}
                        className={`rounded-xl border px-4 py-3 ${a.priority === 'high' ? 'border-rose-200 bg-rose-50/40' : a.priority === 'medium' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-slate-50/40'}`}
                    >
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${priorityColor(a.priority)}`}>
                                {a.priority === 'high' ? '高优先' : a.priority === 'medium' ? '中优先' : '低优先'}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 px-2 py-0.5 text-[11px] font-semibold">
                                {a.riskTag}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">{a.subject}</span>
                            <span className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${statusBadge(a.status)}`}>
                                {statusText(a.status)}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs mb-2">
                            <div className="text-slate-600"><span className="font-medium text-slate-700">问题：</span>{a.reason}</div>
                            <div className="text-slate-600"><span className="font-medium text-slate-700">建议：</span>{a.action}</div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mb-2">
                            <span>📈 销售影响：<span className="font-semibold text-slate-700">{a.salesImpact}</span></span>
                            <span>📦 库存影响：<span className="font-semibold text-slate-700">{a.inventoryImpact}</span></span>
                            <span>💰 现金影响：<span className="font-semibold text-slate-700">{a.cashImpact}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">关联：</span>
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 cursor-pointer hover:bg-slate-50">
                                {a.relatedModule} →
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            {actions.length > 6 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-3 w-full text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition-colors"
                >
                    {showAll ? '▲ 折叠' : `▼ 展开全部 ${actions.length} 条建议`}
                </button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 4. Store Tiering 门店分级
// ═══════════════════════════════════════════════════════════════

export function StoreTieringPanel({ tiers }: { tiers: StoreTierItem[] }) {
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-purple-500" title="门店分级策略" sub="S/A/B/C/D/奥莱/新店/快闪 差异化商品配置" />
            <p className="text-xs text-slate-500 mb-4">
                不同等级门店对应不同商品策略。点击展开查看门店清单和指标。
            </p>
            <div className="space-y-2.5">
                {tiers.map((tier) => (
                    <div key={tier.tier} className={`rounded-xl border-2 overflow-hidden ${tier.bgClass}`}>
                        <button
                            className="w-full text-left px-4 py-3"
                            onClick={() => setExpanded(expanded === tier.tier ? null : tier.tier)}
                        >
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${tierColor(tier.tier)}`}>{tier.tier.toUpperCase()}</span>
                                <span className="text-sm font-semibold text-slate-800">{tier.label}</span>
                                <span className="text-xs text-slate-500">{tier.storeCount}家</span>
                                <span className="text-xs text-slate-500">贡献 {fmtPct(tier.salesContribution)}</span>
                                <span className="text-xs text-slate-500">毛利 {fmtPct(tier.grossMargin)}</span>
                                <span className="text-xs text-slate-500">WOS {tier.wos.toFixed(1)}周</span>
                                <span className="ml-auto text-xs text-slate-400">{expanded === tier.tier ? '▲' : '▼'}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="text-slate-600"><span className="font-medium">商品策略：</span>{tier.merchandiseStrategy}</div>
                                <div className="text-slate-500">SKU宽度 {tier.skuWidth} / 单款深度 {tier.skuDepth}</div>
                                <div className="text-slate-500">新品比 {fmtPct(tier.newStyleRatio)} / 主推比 {fmtPct(tier.heroStyleRatio)}</div>
                            </div>
                        </button>
                        {expanded === tier.tier && (
                            <div className="border-t border-current/10 bg-white/70 px-4 pb-3">
                                <div className="text-xs text-slate-500 mt-2 mb-1.5">门店清单（{tier.stores.length}家）</div>
                                <div className="max-h-48 overflow-auto">
                                    <table className="min-w-full text-xs">
                                        <thead className="sticky top-0 bg-slate-50">
                                            <tr>
                                                {['门店', '大区', '店态', '销售额', '售罄', 'WOS', '尺码完整率'].map((h) => (
                                                    <th key={h} className={`px-2 py-1.5 text-slate-500 font-medium ${h === '门店' ? 'text-left' : 'text-right'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tier.stores.slice(0, 30).map((s, i) => (
                                                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                    <td className="px-2 py-1.5 text-slate-700 font-medium">{s.storeName}</td>
                                                    <td className="px-2 py-1.5 text-right text-slate-500">{s.region}</td>
                                                    <td className="px-2 py-1.5 text-right text-slate-500">{s.format}</td>
                                                    <td className="px-2 py-1.5 text-right text-slate-700">{fmtMoney(s.netSales)}</td>
                                                    <td className={`px-2 py-1.5 text-right font-semibold ${s.sellThrough >= 0.7 ? 'text-emerald-600' : s.sellThrough >= 0.4 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(s.sellThrough)}</td>
                                                    <td className={`px-2 py-1.5 text-right ${s.wos > 12 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{s.wos.toFixed(1)}w</td>
                                                    <td className={`px-2 py-1.5 text-right ${s.sizeCompleteness < 0.7 ? 'text-amber-600' : 'text-slate-600'}`}>{fmtPct(s.sizeCompleteness)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 5. Regional Performance 区域经营表现
// ═══════════════════════════════════════════════════════════════

const ACTION_COLOR: Record<RegionalPerformanceItem['actionType'], string> = {
    add: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    maintain: 'bg-blue-100 text-blue-700 border-blue-200',
    control: 'bg-amber-100 text-amber-700 border-amber-200',
    clear: 'bg-rose-100 text-rose-700 border-rose-200',
};
const ACTION_LABEL: Record<RegionalPerformanceItem['actionType'], string> = {
    add: '加深配货',
    maintain: '维持现状',
    control: '控制库存',
    clear: '促销去化',
};

export function RegionalPerformancePanel({ rows }: { rows: RegionalPerformanceItem[] }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-indigo-500" title="区域经营表现" sub="销售 / 毛利 / 售罄 / 库存 / 尺码 / 建议" />
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {['区域', '销售额', '达成率', '毛利率', '售罄率', '库存额', 'WOS', '尺码完整', '门店数', '高效/低效', '建议'].map((h) => (
                                <th key={h} className={`px-3 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${h === '区域' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.region} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                                <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.region}</td>
                                <td className="px-3 py-2.5 text-right text-slate-700">{fmtMoney(row.salesAmount)}</td>
                                <td className={`px-3 py-2.5 text-right font-semibold ${row.salesAchievementRate >= 1 ? 'text-emerald-600' : row.salesAchievementRate >= 0.85 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(row.salesAchievementRate)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{fmtPct(row.grossMargin)}</td>
                                <td className={`px-3 py-2.5 text-right font-semibold ${row.sellThroughRate >= 0.7 ? 'text-emerald-600' : row.sellThroughRate >= 0.45 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(row.sellThroughRate)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{fmtMoney(row.inventoryAmount)}</td>
                                <td className={`px-3 py-2.5 text-right ${row.wos > 12 ? 'text-rose-600 font-semibold' : row.wos > 8 ? 'text-amber-600' : 'text-slate-600'}`}>{row.wos.toFixed(1)}w</td>
                                <td className={`px-3 py-2.5 text-right ${row.sizeCompleteness < 0.7 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>{fmtPct(row.sizeCompleteness)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{row.storeCount}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">
                                    <span className="text-emerald-600">{row.efficientStoreCount}</span>
                                    <span className="text-slate-400">/</span>
                                    <span className="text-rose-600">{row.inefficientStoreCount}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ACTION_COLOR[row.actionType]}`}>
                                        {ACTION_LABEL[row.actionType]}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 6. Store Performance Ranking 门店表现排名
// ═══════════════════════════════════════════════════════════════

type RankTab = 'top_sales' | 'top_growth' | 'top_margin' | 'risk' | 'inefficient';
const RANK_TABS: { key: RankTab; label: string }[] = [
    { key: 'top_sales', label: 'Top 销售' },
    { key: 'top_growth', label: 'Top 增长' },
    { key: 'top_margin', label: 'Top 毛利' },
    { key: 'risk', label: '风险门店' },
    { key: 'inefficient', label: '低效门店' },
];

export function StorePerformanceRankingPanel({ stores }: { stores: StorePerformanceRankingItem[] }) {
    const [activeTab, setActiveTab] = useState<RankTab>('top_sales');
    const [showAll, setShowAll] = useState(false);

    const filtered = useMemo(() => stores.filter((s) => s.rankType === activeTab), [stores, activeTab]);
    const visible = showAll ? filtered : filtered.slice(0, 8);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-sky-500" title="门店表现排名" sub="Top/风险/低效 多维榜单" />
            <div className="flex flex-wrap gap-1.5 mb-4">
                {RANK_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setShowAll(false); }}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${activeTab === tab.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {tab.label}
                        <span className="ml-1 text-[10px] opacity-60">({stores.filter((s) => s.rankType === tab.key).length})</span>
                    </button>
                ))}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {['#', '门店', '区域', '等级', '销售额', '达成率', '毛利率', '坪效', '售罄', 'WOS', '尺码完整', '风险', '建议'].map((h) => (
                                <th key={h} className={`px-2.5 py-2 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${['#', '门店', '区域'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.length === 0 && (
                            <tr><td colSpan={13} className="text-center py-6 text-slate-400">暂无数据</td></tr>
                        )}
                        {visible.map((s, i) => (
                            <tr key={s.storeId} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-2.5 py-2 text-slate-400 font-medium">{i + 1}</td>
                                <td className="px-2.5 py-2 text-slate-800 font-medium whitespace-nowrap">{s.storeName}</td>
                                <td className="px-2.5 py-2 text-slate-500">{s.region}</td>
                                <td className="px-2.5 py-2">
                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tierColor(s.storeLevel)}`}>{s.storeLevel.toUpperCase()}</span>
                                </td>
                                <td className="px-2.5 py-2 text-right text-slate-700">{fmtMoney(s.salesAmount)}</td>
                                <td className={`px-2.5 py-2 text-right font-semibold ${s.salesAchievementRate >= 1 ? 'text-emerald-600' : s.salesAchievementRate >= 0.85 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(s.salesAchievementRate)}</td>
                                <td className="px-2.5 py-2 text-right text-slate-600">{fmtPct(s.grossMargin)}</td>
                                <td className="px-2.5 py-2 text-right text-slate-600">{fmtMoney(s.salesPerSquareMeter)}/㎡</td>
                                <td className={`px-2.5 py-2 text-right font-semibold ${s.sellThroughRate >= 0.7 ? 'text-emerald-600' : s.sellThroughRate >= 0.4 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(s.sellThroughRate)}</td>
                                <td className={`px-2.5 py-2 text-right ${s.wos > 12 ? 'text-rose-600 font-semibold' : s.wos > 8 ? 'text-amber-600' : 'text-slate-600'}`}>{s.wos.toFixed(1)}w</td>
                                <td className={`px-2.5 py-2 text-right ${s.sizeCompleteness < 0.7 ? 'text-amber-600' : 'text-slate-600'}`}>{fmtPct(s.sizeCompleteness)}</td>
                                <td className="px-2.5 py-2 text-right">
                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${riskColor(s.riskLevel)}`}>{riskLabel(s.riskLevel)}</span>
                                </td>
                                <td className="px-2.5 py-2 text-right text-slate-500 whitespace-nowrap">{s.recommendedAction}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length > 8 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition-colors"
                >
                    {showAll ? '▲ 收起' : `▼ 查看全部 ${filtered.length} 家`}
                </button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 7. Store × Product Fit 门店商品匹配
// ═══════════════════════════════════════════════════════════════

export function StoreProductFitPanel({ rows }: { rows: StoreProductFitItem[] }) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? rows : rows.slice(0, 8);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-teal-500" title="门店商品匹配" sub="商圈 × 客群 × 鞋型 × 价格带 × SKU策略" />
            <p className="text-xs text-slate-500 mb-4">
                针对每家门店的商圈属性和目标客群，输出适配的品类、鞋型、价格带和 SKU 角色建议。
            </p>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {['门店', '等级', '商圈类型', '目标客群', '适合品类', '适合鞋型', '价格带', 'SKU角色', '建议SKU数', '建议深度', '主推款', '风险'].map((h) => (
                                <th key={h} className={`px-2.5 py-2 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${h === '门店' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, i) => (
                            <tr key={row.storeId} className={`border-b border-slate-100 hover:bg-teal-50/20 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-2.5 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                                    <div>{row.storeName}</div>
                                    <div className="text-[10px] text-slate-400">{row.region}</div>
                                </td>
                                <td className="px-2.5 py-2.5 text-right">
                                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tierColor(row.storeLevel)}`}>{row.storeLevel.toUpperCase()}</span>
                                </td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600 whitespace-nowrap">{row.businessDistrict}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600 whitespace-nowrap">{row.targetConsumer}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-700 font-medium">{row.fitCategory}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-700">{row.fitShoeType}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{row.fitPriceBand}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{row.fitSkuRole}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-700 font-semibold">{row.recommendedSkuCount}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{row.recommendedDepth}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600 whitespace-nowrap">{row.heroSkuSuggestion}</td>
                                <td className="px-2.5 py-2.5 text-right">
                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${riskColor(row.riskLevel)}`}>{riskLabel(row.riskLevel)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rows.length > 8 && (
                <button onClick={() => setShowAll(!showAll)} className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition-colors">
                    {showAll ? '▲ 收起' : `▼ 查看全部 ${rows.length} 家`}
                </button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 8. Store Inventory & Size Health 门店库存与尺码健康
// ═══════════════════════════════════════════════════════════════

export function StoreInventorySizeHealthPanel({ rows }: { rows: StoreInventorySizeHealthItem[] }) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? rows : rows.slice(0, 10);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-red-500" title="门店库存与尺码健康" sub="WOS / 库龄 / 尺码完整率 / 断码 / 黄金码" />
            <p className="text-xs text-slate-500 mb-4">
                核心码售罄率＞85%代表断码风险；WOS＞12周或低售罄率代表积压风险。
            </p>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {['门店', '库存额', '件数', 'WOS', '库龄(周)', '售罄率', '尺码完整', '核心码完整', '断码SKU', '黄金码缺货', '长尾码积压', '建议', '风险'].map((h) => (
                                <th key={h} className={`px-2.5 py-2 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${h === '门店' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, i) => (
                            <tr key={row.storeId} className={`border-b border-slate-100 hover:bg-red-50/10 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-2.5 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                                    <div>{row.storeName}</div>
                                    <div className="text-[10px] text-slate-400">{row.region}</div>
                                </td>
                                <td className="px-2.5 py-2.5 text-right text-slate-700">{fmtMoney(row.inventoryAmount)}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{row.inventoryUnits.toLocaleString()}</td>
                                <td className={`px-2.5 py-2.5 text-right font-semibold ${row.wos > 12 ? 'text-rose-600' : row.wos > 8 ? 'text-amber-600' : 'text-emerald-600'}`}>{row.wos.toFixed(1)}w</td>
                                <td className={`px-2.5 py-2.5 text-right ${row.inventoryAge > 16 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{row.inventoryAge}w</td>
                                <td className={`px-2.5 py-2.5 text-right font-semibold ${row.sellThroughRate >= 0.7 ? 'text-emerald-600' : row.sellThroughRate >= 0.4 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(row.sellThroughRate)}</td>
                                <td className={`px-2.5 py-2.5 text-right ${row.sizeCompleteness < 0.7 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>{fmtPct(row.sizeCompleteness)}</td>
                                <td className={`px-2.5 py-2.5 text-right ${row.coreSizeCompleteness < 0.8 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{fmtPct(row.coreSizeCompleteness)}</td>
                                <td className={`px-2.5 py-2.5 text-right ${row.brokenSizeSkuCount > 5 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{row.brokenSizeSkuCount}</td>
                                <td className={`px-2.5 py-2.5 text-right ${row.goldenSizeShortageAmount > 10000 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{fmtMoney(row.goldenSizeShortageAmount)}</td>
                                <td className={`px-2.5 py-2.5 text-right ${row.longTailSizeOverstockAmount > 10000 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>{fmtMoney(row.longTailSizeOverstockAmount)}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-500 whitespace-nowrap">{row.recommendedAction}</td>
                                <td className="px-2.5 py-2.5 text-right">
                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${riskColor(row.riskLevel)}`}>{riskLabel(row.riskLevel)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rows.length > 10 && (
                <button onClick={() => setShowAll(!showAll)} className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition-colors">
                    {showAll ? '▲ 收起' : `▼ 查看全部 ${rows.length} 家`}
                </button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 9. Replenishment & Transfer 补货调拨建议
// ═══════════════════════════════════════════════════════════════

const RT_ACTION_LABEL: Record<ReplenishmentTransferItem['actionType'], string> = {
    transfer: '跨店调拨',
    replenish: '追加补货',
    outlet: '转奥莱',
    stop: '停止补货',
    new_store_add: '新店追加',
};
const RT_ACTION_COLOR: Record<ReplenishmentTransferItem['actionType'], string> = {
    transfer: 'bg-sky-100 text-sky-700 border-sky-200',
    replenish: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    outlet: 'bg-purple-100 text-purple-700 border-purple-200',
    stop: 'bg-rose-100 text-rose-700 border-rose-200',
    new_store_add: 'bg-blue-100 text-blue-700 border-blue-200',
};

export function ReplenishmentTransferPanel({ rows }: { rows: ReplenishmentTransferItem[] }) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? rows : rows.slice(0, 6);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-sky-600" title="补货调拨建议" sub="来源 → 目标 · SKU · 尺码 · 预计影响" />
            <p className="text-xs text-slate-500 mb-4">
                包含跨店调拨、追加补货、转奥莱、停止补货和新店追加五类动作，按优先级排序。
            </p>
            <div className="space-y-2.5">
                {visible.map((row) => (
                    <div key={row.id} className={`rounded-xl border px-4 py-3 ${row.priority === 'high' ? 'border-rose-200 bg-rose-50/30' : row.priority === 'medium' ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-slate-50/30'}`}>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${priorityColor(row.priority)}`}>
                                {row.priority === 'high' ? '高优先' : row.priority === 'medium' ? '中优先' : '低优先'}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RT_ACTION_COLOR[row.actionType]}`}>
                                {RT_ACTION_LABEL[row.actionType]}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                                {row.fromStoreName} → {row.toStoreName}
                            </span>
                            <span className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${statusBadge(row.status)}`}>
                                {statusText(row.status)}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                            <div className="text-slate-600"><span className="font-medium text-slate-700">SKU：</span>{row.sku}</div>
                            <div className="text-slate-600"><span className="font-medium text-slate-700">尺码：</span>{row.size}</div>
                            <div className="text-slate-600"><span className="font-medium text-slate-700">数量：</span>{row.transferQuantity}双</div>
                            <div className="text-slate-600"><span className="font-medium text-slate-700">原因：</span>{row.reason}</div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                            <span>📈 销售提升：<span className="font-semibold text-slate-700">{fmtMoney(row.expectedSalesImpact)}</span></span>
                            <span>📦 库存改善：<span className="font-semibold text-slate-700">{fmtMoney(row.expectedInventoryImpact)}</span></span>
                        </div>
                    </div>
                ))}
            </div>
            {rows.length > 6 && (
                <button onClick={() => setShowAll(!showAll)} className="mt-3 w-full text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition-colors">
                    {showAll ? '▲ 折叠' : `▼ 展开全部 ${rows.length} 条`}
                </button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 10. Regional Design Signal 区域设计信号
// ═══════════════════════════════════════════════════════════════

const DESIGN_ACTION_COLOR: Record<RegionalDesignSignalItem['designAction'], string> = {
    continue: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    test: 'bg-sky-100 text-sky-700 border-sky-200',
    reduce: 'bg-rose-100 text-rose-700 border-rose-200',
    optimize_comfort: 'bg-amber-100 text-amber-700 border-amber-200',
    optimize_last: 'bg-amber-100 text-amber-700 border-amber-200',
    optimize_material: 'bg-violet-100 text-violet-700 border-violet-200',
    adjust_color: 'bg-pink-100 text-pink-700 border-pink-200',
};

export function RegionalDesignSignalPanel({ rows }: { rows: RegionalDesignSignalItem[] }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-pink-500" title="区域设计信号" sub="面向设计总监 · 区域鞋型/颜色/材质/功能偏好" />
            <p className="text-xs text-slate-500 mb-4">
                基于各区域销售表现和消费者反馈提炼的设计方向信号，供下一季 SKU 开发决策。
            </p>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {['区域', '高增长鞋型', '高退货鞋型', '高增长配色', '高增长材质', '功能诉求', '消费者反馈', '设计建议', '建议方向'].map((h) => (
                                <th key={h} className={`px-3 py-2 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${h === '区域' ? 'text-left' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.region} className={`border-b border-slate-100 hover:bg-pink-50/10 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.region}</td>
                                <td className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-1">{row.highGrowthShoeTypes.map((t) => <span key={t} className="inline-flex rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium">{t}</span>)}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-1">{row.highReturnShoeTypes.map((t) => <span key={t} className="inline-flex rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[10px] font-medium">{t}</span>)}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-1">{row.highGrowthColors.map((c) => <span key={c} className="inline-flex rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium">{c}</span>)}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-1">{row.highGrowthMaterials.map((m) => <span key={m} className="inline-flex rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-medium">{m}</span>)}</div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{row.functionalDemand}</td>
                                <td className="px-3 py-2.5 text-slate-500 max-w-[140px] truncate" title={row.consumerFeedback}>{row.consumerFeedback}</td>
                                <td className="px-3 py-2.5 text-slate-600 max-w-[160px] truncate" title={row.designSuggestion}>{row.designSuggestion}</td>
                                <td className="px-3 py-2.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DESIGN_ACTION_COLOR[row.designAction]}`}>
                                        {designActionLabel(row.designAction)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 11. New Store Ramp-up 新店爬坡
// ═══════════════════════════════════════════════════════════════

export function NewStoreRampUpPanel({ stores }: { stores: NewStoreRampUpItem[] }) {
    if (stores.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader color="bg-emerald-500" title="新店爬坡追踪" sub="开业月份 / 首配 / 爬坡达成 / 建议" />
            <p className="text-xs text-slate-500 mb-4">
                追踪新店第1/3/6月销售达成，判断是否按预期爬坡，及时调整首配和补货策略。
            </p>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {['新店', '区域', '开业月', '面积(㎡)', '首配SKU', '首配库存', '1月销售', '3月销售', '6月销售', '当前达成', '回本周期', '爬坡', '建议'].map((h) => (
                                <th key={h} className={`px-2.5 py-2 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${['新店', '区域'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {stores.map((s, i) => (
                            <tr key={s.storeId} className={`border-b border-slate-100 hover:bg-emerald-50/10 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-2.5 py-2.5 font-medium text-slate-800 whitespace-nowrap">{s.storeName}</td>
                                <td className="px-2.5 py-2.5 text-slate-500">{s.region}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{s.openMonth}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{s.storeArea}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{s.initialSkuCount}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{fmtMoney(s.initialInventoryAmount)}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-700">{fmtMoney(s.month1Sales)}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-700">{s.month3Sales > 0 ? fmtMoney(s.month3Sales) : '—'}</td>
                                <td className="px-2.5 py-2.5 text-right text-slate-700">{s.month6Sales > 0 ? fmtMoney(s.month6Sales) : '—'}</td>
                                <td className={`px-2.5 py-2.5 text-right font-semibold ${s.currentSalesAchievementRate >= 1 ? 'text-emerald-600' : s.currentSalesAchievementRate >= 0.8 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {fmtPct(s.currentSalesAchievementRate)}
                                </td>
                                <td className="px-2.5 py-2.5 text-right text-slate-600">{s.paybackPeriodMonths}月</td>
                                <td className="px-2.5 py-2.5 text-right">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.onTrack ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {s.onTrack ? '✓ 达标' : '✗ 偏慢'}
                                    </span>
                                </td>
                                <td className="px-2.5 py-2.5 text-right text-slate-500 whitespace-nowrap">{s.recommendedAction}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 12. Store Detail Table 门店明细表
// ═══════════════════════════════════════════════════════════════

type DetailTab = 'efficient' | 'risk' | 'shortage' | 'inefficient' | 'new' | 'all';
const DETAIL_TABS: { key: DetailTab; label: string }[] = [
    { key: 'efficient', label: '高效门店' },
    { key: 'risk', label: '高风险门店' },
    { key: 'shortage', label: '缺货门店' },
    { key: 'inefficient', label: '低效门店' },
    { key: 'new', label: '新店' },
    { key: 'all', label: '全部' },
];

export function StoreDetailTablePanel({ rows }: { rows: StoreDetailItem[] }) {
    const [activeTab, setActiveTab] = useState<DetailTab>('risk');
    const [showAll, setShowAll] = useState(false);
    const [collapsed, setCollapsed] = useState(true);

    const filtered = useMemo(() => {
        switch (activeTab) {
            case 'efficient': return rows.filter((r) => r.salesAchievementRate >= 1.05 && r.grossMargin >= 0.35);
            case 'risk': return rows.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium');
            case 'shortage': return rows.filter((r) => r.sellThroughRate > 0.8 && r.wos < 4);
            case 'inefficient': return rows.filter((r) => r.salesAchievementRate < 0.75 || r.sellThroughRate < 0.3);
            case 'new': return rows.filter((r) => r.storeLevel === 'new');
            default: return rows;
        }
    }, [rows, activeTab]);

    const exportCSV = () => {
        const headers = ['门店ID', '门店名', '区域', '城市', '等级', '销售额', '达成率', '毛利率', '库存额', 'WOS', '售罄率', '尺码完整', '坪效', '客单价', '风险等级', '建议'];
        const csvRows = [
            headers.join(','),
            ...filtered.map(r => [
                r.storeId, r.storeName, r.region, r.city, r.storeLevel,
                r.salesAmount.toFixed(0), (r.salesAchievementRate * 100).toFixed(1) + '%',
                (r.grossMargin * 100).toFixed(1) + '%', r.inventoryAmount.toFixed(0),
                r.wos.toFixed(1), (r.sellThroughRate * 100).toFixed(1) + '%',
                (r.sizeCompleteness * 100).toFixed(1) + '%', r.salesPerSquareMeter.toFixed(0),
                r.averageOrderValue.toFixed(0), r.riskLevel, `"${r.recommendedAction}"`,
            ].join(','))
        ];
        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `门店明细_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const visible = showAll ? filtered : filtered.slice(0, 10);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* 可折叠标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity flex-1"
                >
                    <span className="w-1 h-5 rounded-full bg-slate-500 inline-block" />
                    <span className="text-base font-bold text-slate-900">门店明细表</span>
                    <span className="text-xs text-slate-400">（{rows.length} 家门店）</span>
                    <span className="ml-1 text-xs text-slate-400">{collapsed ? '▼ 展开' : '▲ 收起'}</span>
                </button>
                <div className="shrink-0 ml-3 flex gap-1.5">
                    <button
                        onClick={exportCSV}
                        className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
                    >⬇ CSV</button>
                    <button
                        onClick={exportCSV}
                        className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Excel 可直接打开 CSV"
                    >📊 Excel</button>
                    <button
                        onClick={() => window.print()}
                        className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
                    >📄 PDF</button>
                </div>
            </div>
            {!collapsed && (
            <div className="p-4">
            <div className="flex flex-wrap gap-1.5 mb-4">
                {DETAIL_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setShowAll(false); }}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${activeTab === tab.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {tab.label}
                        <span className="ml-1 text-[10px] opacity-60">({
                            tab.key === 'efficient' ? rows.filter((r) => r.salesAchievementRate >= 1.05 && r.grossMargin >= 0.35).length :
                            tab.key === 'risk' ? rows.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium').length :
                            tab.key === 'shortage' ? rows.filter((r) => r.sellThroughRate > 0.8 && r.wos < 4).length :
                            tab.key === 'inefficient' ? rows.filter((r) => r.salesAchievementRate < 0.75 || r.sellThroughRate < 0.3).length :
                            tab.key === 'new' ? rows.filter((r) => r.storeLevel === 'new').length :
                            rows.length
                        })</span>
                    </button>
                ))}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            {['门店', '区域', '城市', '等级', '销售额', '达成率', '毛利率', '库存额', 'WOS', '售罄', '尺码完整', '坪效', '客单价', '风险', '建议'].map((h) => (
                                <th key={h} className={`px-2.5 py-2 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${['门店', '区域', '城市'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.length === 0 && (
                            <tr><td colSpan={15} className="text-center py-6 text-slate-400">暂无符合条件的门店</td></tr>
                        )}
                        {visible.map((row, i) => (
                            <tr key={row.storeId} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                                <td className="px-2.5 py-2 font-medium text-slate-800 whitespace-nowrap">{row.storeName}</td>
                                <td className="px-2.5 py-2 text-slate-500">{row.region}</td>
                                <td className="px-2.5 py-2 text-slate-500 whitespace-nowrap">{row.city}</td>
                                <td className="px-2.5 py-2">
                                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tierColor(row.storeLevel)}`}>{row.storeLevel.toUpperCase()}</span>
                                </td>
                                <td className="px-2.5 py-2 text-right text-slate-700">{fmtMoney(row.salesAmount)}</td>
                                <td className={`px-2.5 py-2 text-right font-semibold ${row.salesAchievementRate >= 1 ? 'text-emerald-600' : row.salesAchievementRate >= 0.85 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(row.salesAchievementRate)}</td>
                                <td className="px-2.5 py-2 text-right text-slate-600">{fmtPct(row.grossMargin)}</td>
                                <td className="px-2.5 py-2 text-right text-slate-600">{fmtMoney(row.inventoryAmount)}</td>
                                <td className={`px-2.5 py-2 text-right ${row.wos > 12 ? 'text-rose-600 font-semibold' : row.wos > 8 ? 'text-amber-600' : 'text-slate-600'}`}>{row.wos.toFixed(1)}w</td>
                                <td className={`px-2.5 py-2 text-right font-semibold ${row.sellThroughRate >= 0.7 ? 'text-emerald-600' : row.sellThroughRate >= 0.4 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(row.sellThroughRate)}</td>
                                <td className={`px-2.5 py-2 text-right ${row.sizeCompleteness < 0.7 ? 'text-amber-600' : 'text-slate-600'}`}>{fmtPct(row.sizeCompleteness)}</td>
                                <td className="px-2.5 py-2 text-right text-slate-600">{fmtMoney(row.salesPerSquareMeter)}</td>
                                <td className="px-2.5 py-2 text-right text-slate-600">{fmtMoney(row.averageOrderValue)}</td>
                                <td className="px-2.5 py-2 text-right">
                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${riskColor(row.riskLevel)}`}>{riskLabel(row.riskLevel)}</span>
                                </td>
                                <td className="px-2.5 py-2 text-right text-slate-500 whitespace-nowrap">{row.recommendedAction}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length > 10 && (
                <button onClick={() => setShowAll(!showAll)} className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition-colors">
                    {showAll ? '▲ 收起' : `▼ 查看全部 ${filtered.length} 家`}
                </button>
            )}
            </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 13. Related Module Links 跨模块联动入口
// ═══════════════════════════════════════════════════════════════

const DEFAULT_MODULE_LINKS = [
    { moduleKey: 'forecast', moduleName: '销售预测', relation: '查看区域/门店销售预测、目标缺口、新店爬坡', icon: '📊', colorClass: 'border-blue-200 bg-blue-50 text-blue-700' },
    { moduleKey: 'inventory', moduleName: '库存健康', relation: '查看门店库存、WOS、库龄和尺码完整率', icon: '📦', colorClass: 'border-teal-200 bg-teal-50 text-teal-700' },
    { moduleKey: 'otb', moduleName: 'OTB预算', relation: '调整渠道预算、门店首配、补货预算', icon: '💰', colorClass: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { moduleKey: 'wave', moduleName: '波段企划', relation: '确定哪些门店首发、哪些门店承接清货', icon: '🌊', colorClass: 'border-sky-200 bg-sky-50 text-sky-700' },
    { moduleKey: 'category', moduleName: '品类运营', relation: '调整区域品类结构、鞋型和价格带', icon: '👟', colorClass: 'border-violet-200 bg-violet-50 text-violet-700' },
    { moduleKey: 'consumer', moduleName: '消费者画像', relation: '查看商圈人群、价格接受度和风格偏好', icon: '👥', colorClass: 'border-pink-200 bg-pink-50 text-pink-700' },
    { moduleKey: 'pnl', moduleName: '损益', relation: '查看门店盈利、租金人工、费用率和利润', icon: '📈', colorClass: 'border-amber-200 bg-amber-50 text-amber-700' },
    { moduleKey: 'cashflow', moduleName: '现金流', relation: '查看门店回款、新店投入和库存占用现金', icon: '💵', colorClass: 'border-orange-200 bg-orange-50 text-orange-700' },
];

export function RelatedModuleLinksPanel() {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-100/60 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-slate-400 inline-block" />
                    <span className="text-sm font-semibold text-slate-700">跨模块联动入口</span>
                    <span className="text-[10px] text-slate-400">快速跳转相关模块，携带当前筛选上下文</span>
                </div>
                <span className="text-xs text-slate-400">{expanded ? '▲ 收起' : '▼ 展开'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {DEFAULT_MODULE_LINKS.map((link) => (
                            <button
                                key={link.moduleKey}
                                className={`rounded-xl border px-3 py-3 text-left transition-opacity hover:opacity-80 ${link.colorClass}`}
                            >
                                <div className="text-xl mb-1">{link.icon}</div>
                                <div className="text-sm font-bold mb-1">{link.moduleName}</div>
                                <div className="text-[10px] opacity-75 leading-relaxed">{link.relation}</div>
                                <div className="mt-2 text-[11px] font-semibold opacity-80">跳转 →</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 导出工具函数供主文件使用
// ═══════════════════════════════════════════════════════════════

export { fmtMoney, fmtPct };
