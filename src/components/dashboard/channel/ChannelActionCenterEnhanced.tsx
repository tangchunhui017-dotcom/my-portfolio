'use client';
/**
 * src/components/dashboard/channel/ChannelActionCenterEnhanced.tsx
 * S3: 行动中心闭环改造 — 完成/转交/撤销 + 进度条 + AI 生成
 */
import { useState, useMemo } from 'react';
import actionLogData from '../../../../data/planning/channel_action_log.json';
import { formatWan } from '@/utils/channelOpsV13';

type ActionStatus = 'pending' | 'completed' | 'transferred' | 'cancelled';
type ActionPriority = 'high' | 'medium' | 'low';

interface ActionItem {
    id: string;
    priority: ActionPriority;
    riskTag: string;
    subject: string;
    reason: string;
    action: string;
    salesImpact: string;
    inventoryImpact: string;
    cashImpact: string;
    relatedModule: string;
    status: ActionStatus;
    impactAmount: number;
    aiGenerated: boolean;
}

const rawData = actionLogData as {
    weekSummary: {
        total: number;
        completed: number;
        transferred: number;
        pending: number;
        totalImpactAmount: number;
    };
    actions: ActionItem[];
};

const PRIORITY_COLOR: Record<ActionPriority, string> = {
    high: 'border-rose-200 bg-rose-50/40',
    medium: 'border-amber-200 bg-amber-50/30',
    low: 'border-slate-200 bg-slate-50/40',
};

const PRIORITY_BADGE: Record<ActionPriority, string> = {
    high: 'border-rose-300 bg-rose-100 text-rose-700',
    medium: 'border-amber-300 bg-amber-100 text-amber-700',
    low: 'border-slate-300 bg-slate-100 text-slate-600',
};

const STATUS_LABEL: Record<ActionStatus, string> = {
    pending: '待处理',
    completed: '✓ 已完成',
    transferred: '→ 已转交',
    cancelled: '✕ 已撤销',
};

const STATUS_COLOR: Record<ActionStatus, string> = {
    pending: 'border-slate-200 bg-slate-50 text-slate-600',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    transferred: 'border-blue-200 bg-blue-50 text-blue-700',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-400 line-through',
};

// AI 智能生成的示例行动（基于决策摘要数据）
const AI_GENERATED_ACTIONS: ActionItem[] = [
    {
        id: 'AI-001',
        priority: 'high',
        riskTag: 'AI建议',
        subject: '华东 + 华南 双核战场协同',
        reason: '华东(87分A级)和华南(91分A级)合计贡献40%+销售额，但区域间库存调拨协同不足',
        action: '建立华东↔华南库存共享池，凉鞋旺季期间实现实时调拨，减少一方断货另一方积压',
        salesImpact: '+¥300万',
        inventoryImpact: '整体库存利用率+8pp',
        cashImpact: '减少积压损失¥120万',
        relatedModule: '库存健康',
        status: 'pending',
        impactAmount: 3000000,
        aiGenerated: true,
    },
    {
        id: 'AI-002',
        priority: 'medium',
        riskTag: 'AI建议',
        subject: '西北/东北 弱势区域复苏计划',
        reason: '西北(61分C级)和东北(72分B级)连续2季低于行业基准，拖累全国达成率',
        action: '制定专项复苏方案：西北重点压缩经销比例+加强直营，东北重点调整棉鞋选款+提升试穿转化',
        salesImpact: '+¥180万',
        inventoryImpact: '降低弱势区域WOS',
        cashImpact: '+¥100万',
        relatedModule: '损益分析',
        status: 'pending',
        impactAmount: 1800000,
        aiGenerated: true,
    },
];

function SectionHeader({ color, title, sub }: { color: string; title: string; sub: string }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className={`w-1 h-5 rounded-full ${color} inline-block`} />
            <div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-[11px] text-slate-500">{sub}</p>
            </div>
        </div>
    );
}

const LS_KEY = 'channel-action-states';

function loadStatusesFromStorage(): Record<string, ActionStatus> {
    try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
        if (raw) return JSON.parse(raw) as Record<string, ActionStatus>;
    } catch { /* ignore */ }
    const init: Record<string, ActionStatus> = {};
    rawData.actions.forEach(a => { init[a.id] = a.status as ActionStatus; });
    AI_GENERATED_ACTIONS.forEach(a => { init[a.id] = a.status; });
    return init;
}

export default function ChannelActionCenterEnhanced() {
    const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(loadStatusesFromStorage);
    const [showAll, setShowAll] = useState(false);
    const [showAI, setShowAI] = useState(false);

    const allActions = useMemo(() => {
        const base = rawData.actions.map(a => ({ ...a, status: statuses[a.id] ?? a.status as ActionStatus }));
        const ai = showAI ? AI_GENERATED_ACTIONS.map(a => ({ ...a, status: statuses[a.id] ?? a.status })) : [];
        return [...base, ...ai];
    }, [statuses, showAI]);

    const summary = useMemo(() => {
        const total = allActions.length;
        const completed = allActions.filter(a => statuses[a.id] === 'completed').length;
        const transferred = allActions.filter(a => statuses[a.id] === 'transferred').length;
        const cancelled = allActions.filter(a => statuses[a.id] === 'cancelled').length;
        const pending = total - completed - transferred - cancelled;
        const totalImpact = allActions
            .filter(a => statuses[a.id] === 'pending' || statuses[a.id] === 'completed')
            .reduce((sum, a) => sum + a.impactAmount, 0);
        return { total, completed, transferred, cancelled, pending, totalImpact };
    }, [allActions, statuses]);

    const progressPct = summary.total > 0
        ? Math.round(((summary.completed + summary.transferred) / summary.total) * 100)
        : 0;

    const updateStatus = (id: string, status: ActionStatus) => {
        setStatuses(prev => {
            const next = { ...prev, [id]: status };
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    };

    const visibleActions = showAll
        ? allActions
        : allActions.filter(a => statuses[a.id] === 'pending').slice(0, 5);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <SectionHeader
                color="bg-orange-500"
                title="行动中心（闭环版）"
                sub="完成 / 转交 / 撤销 · 实时进度追踪 · AI 智能生成"
            />

            {/* ── 进度概览 ── */}
            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-wrap items-center gap-4 mb-2 text-xs">
                    <span className="text-slate-600 font-medium">本周行动追踪</span>
                    <span className="text-slate-500">共 <strong className="text-slate-800">{summary.total}</strong> 项</span>
                    <span className="text-emerald-600">✓ 完成 <strong>{summary.completed}</strong></span>
                    <span className="text-blue-600">→ 转交 <strong>{summary.transferred}</strong></span>
                    <span className="text-rose-500">✕ 撤销 <strong>{summary.cancelled}</strong></span>
                    <span className="text-amber-600">⏳ 待处理 <strong>{summary.pending}</strong></span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>执行进度 {progressPct}%</span>
                    <span>累计影响金额 {formatWan(summary.totalImpact)}</span>
                </div>
            </div>

            {/* ── AI 生成按钮 ── */}
            <div className="flex items-center gap-2 mb-3">
                <button
                    onClick={() => setShowAI(v => !v)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        showAI
                            ? 'bg-violet-500 text-white border-violet-400'
                            : 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50'
                    }`}
                >
                    🤖 {showAI ? '隐藏 AI 建议' : 'AI 智能生成行动'}
                </button>
                {showAI && (
                    <span className="text-[10px] text-violet-500">基于决策摘要 3+3+3 + 风险数据智能生成</span>
                )}
            </div>

            {/* ── 行动列表 ── */}
            <div className="space-y-3">
                {visibleActions.map((a) => {
                    const currentStatus = statuses[a.id] ?? a.status;
                    const isResolved = currentStatus !== 'pending';
                    return (
                        <div
                            key={a.id}
                            className={`rounded-xl border px-4 py-3 transition-opacity ${PRIORITY_COLOR[a.priority]} ${isResolved ? 'opacity-60' : ''}`}
                        >
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${PRIORITY_BADGE[a.priority]}`}>
                                    {a.priority === 'high' ? '高优先' : a.priority === 'medium' ? '中优先' : '低优先'}
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${a.aiGenerated ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                                    {a.aiGenerated ? '🤖 ' : ''}{a.riskTag}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 truncate">{a.subject}</span>
                                <span className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${STATUS_COLOR[currentStatus]}`}>
                                    {STATUS_LABEL[currentStatus]}
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
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                    {a.relatedModule} →
                                </span>
                                {/* 闭环按钮 */}
                                {currentStatus === 'pending' && (
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <button
                                            onClick={() => updateStatus(a.id, 'completed')}
                                            className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                                        >
                                            ✓ 完成
                                        </button>
                                        <button
                                            onClick={() => updateStatus(a.id, 'transferred')}
                                            className="text-[10px] bg-blue-500 text-white px-2.5 py-1 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                        >
                                            → 转交
                                        </button>
                                        <button
                                            onClick={() => updateStatus(a.id, 'cancelled')}
                                            className="text-[10px] bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                                        >
                                            ✕ 撤销
                                        </button>
                                    </div>
                                )}
                                {currentStatus !== 'pending' && (
                                    <button
                                        onClick={() => updateStatus(a.id, 'pending')}
                                        className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 underline"
                                    >
                                        撤回
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── 展开/折叠 ── */}
            {allActions.length > (showAll ? 0 : 5) && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-3 w-full text-xs text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition-colors"
                >
                    {showAll
                        ? '▲ 折叠（仅显示待处理）'
                        : `▼ 展开全部 ${allActions.length} 条（含已处理）`}
                </button>
            )}
        </div>
    );
}
