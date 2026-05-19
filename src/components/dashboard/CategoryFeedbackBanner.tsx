'use client';
/**
 * src/components/dashboard/CategoryFeedbackBanner.tsx
 * 品类运营 → 上游模块反馈横幅（参考 InventoryFeedbackBanner / PnlFeedbackBanner 模式）
 * 支持 targetModule: 'otb' | 'planning' | 'forecast' | 'profit-loss'
 */
import { useState } from 'react';
import fbData from '../../../data/planning/category_feedback_signals.json';

type Signal = {
    id: string;
    targetModule: string;
    priority: 'P0' | 'P1' | 'P2';
    category: string;
    finding: string;
    recommendation: string;
    impactAmount: number;
    source: string;
};

const feedback = fbData as { generatedAt: string; signals: Signal[] };

interface Props {
    targetModule: 'otb' | 'planning' | 'forecast' | 'profit-loss' | 'channel';
    onJumpToCategory?: () => void;
}

const PRIORITY_CFG: Record<string, { cls: string; label: string }> = {
    P0: { cls: 'bg-rose-100 text-rose-700 border-rose-200',   label: 'P0 紧急' },
    P1: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'P1 重要' },
    P2: { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: 'P2 建议' },
};

function formatAmount(v: number) {
    if (v >= 100_000_000) return `¥${(v / 100_000_000).toFixed(2)}亿`;
    if (v >= 10_000) return `¥${(v / 10_000).toFixed(1)}万`;
    return `¥${Math.round(v).toLocaleString('zh-CN')}`;
}

export default function CategoryFeedbackBanner({ targetModule, onJumpToCategory }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [resolved, setResolved] = useState<Set<string>>(new Set());

    const signals = feedback.signals.filter(
        (s) => s.targetModule === targetModule && !resolved.has(s.id)
    );
    if (signals.length === 0) return null;

    const accept = (id: string) => setResolved((prev) => new Set(prev).add(id));
    const ignore = (id: string) => setResolved((prev) => new Set(prev).add(id));

    const p0 = signals.filter((s) => s.priority === 'P0').length;
    const p1 = signals.filter((s) => s.priority === 'P1').length;

    return (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/40 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">🏷️</span>
                    <span className="text-xs font-bold text-slate-800">来自品类运营的反馈</span>
                    <span className="text-[10px] text-slate-500">共 {signals.length} 条</span>
                    {p0 > 0 && (
                        <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                            P0 × {p0}
                        </span>
                    )}
                    {p1 > 0 && (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                            P1 × {p1}
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400">{feedback.generatedAt} 更新</span>
                </div>
                <div className="flex items-center gap-2">
                    {onJumpToCategory && (
                        <span
                            onClick={(e) => { e.stopPropagation(); onJumpToCategory(); }}
                            className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                        >
                            → 查看品类运营
                        </span>
                    )}
                    <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
                </div>
            </button>

            {expanded && (
                <div className="mt-3 space-y-2">
                    {signals.map((sig) => {
                        const cfg = PRIORITY_CFG[sig.priority] ?? PRIORITY_CFG['P2'];
                        return (
                            <div
                                key={sig.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 flex flex-col sm:flex-row sm:items-start gap-2"
                            >
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${cfg.cls}`}>
                                        {cfg.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">{sig.category}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-slate-700 font-medium">{sig.finding}</div>
                                    <div className="text-[10px] text-emerald-700 mt-0.5">建议：{sig.recommendation}</div>
                                    {sig.impactAmount > 0 && (
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            预计影响：{formatAmount(sig.impactAmount)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => accept(sig.id)}
                                        className="text-[10px] rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-700 hover:bg-emerald-100"
                                    >
                                        ✓ 采纳
                                    </button>
                                    <button
                                        onClick={() => ignore(sig.id)}
                                        className="text-[10px] rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500 hover:bg-slate-100"
                                    >
                                        ✕ 忽略
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
