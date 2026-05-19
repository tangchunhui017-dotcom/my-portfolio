'use client';
/**
 * src/components/dashboard/ChannelFeedbackBanner.tsx
 * 区域&门店 → 上游模块反馈横幅（参考 CategoryFeedbackBanner 模式）
 * 支持 targetModule: 'otb' | 'planning' | 'forecast' | 'profit-loss' | 'category'
 */
import { useState } from 'react';
import fbData from '../../../data/planning/channel_feedback_signals.json';

type Signal = {
    id: string;
    targetModule: string;
    priority: 'P0' | 'P1' | 'P2';
    title: string;
    detail: string;
    impact: string;
    status: string;
};

const feedback = fbData as { generatedAt: string; signals: Signal[] };

interface Props {
    targetModule: 'otb' | 'planning' | 'forecast' | 'profit-loss' | 'category';
    onJumpToChannel?: () => void;
}

const PRIORITY_CFG: Record<string, { cls: string; label: string }> = {
    P0: { cls: 'bg-rose-100 text-rose-700 border-rose-200',   label: 'P0 紧急' },
    P1: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'P1 重要' },
    P2: { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: 'P2 建议' },
};

export default function ChannelFeedbackBanner({ targetModule, onJumpToChannel }: Props) {
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
        <div className="bg-gradient-to-r from-orange-50 to-amber-50/40 border border-orange-200 rounded-xl px-4 py-3 mb-4">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">🗺️</span>
                    <span className="text-xs font-bold text-slate-800">来自区域&门店的反馈</span>
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
                    {onJumpToChannel && (
                        <span
                            onClick={(e) => { e.stopPropagation(); onJumpToChannel(); }}
                            className="text-[10px] text-orange-600 hover:underline cursor-pointer"
                        >
                            → 查看区域&门店
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
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-slate-800 mb-0.5">{sig.title}</div>
                                    <div className="text-[11px] text-slate-500 leading-relaxed">{sig.detail}</div>
                                    <div className="text-[11px] text-orange-700 mt-1">影响：{sig.impact}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => accept(sig.id)}
                                        className="text-[10px] bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors"
                                    >
                                        ✓ 采纳
                                    </button>
                                    <button
                                        onClick={() => ignore(sig.id)}
                                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                                    >
                                        忽略
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
