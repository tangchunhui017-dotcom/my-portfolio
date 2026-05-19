'use client';
/**
 * PnlFeedbackBanner.tsx — 损益反馈横幅
 * 复用 InventoryFeedbackBanner 视觉模式，但来源改为 P&L
 */
import { useState } from 'react';
import fbData from '../../../data/planning/pnl_feedback_signals.json';

type FbData = typeof fbData;
const feedback = fbData as FbData;
type Signal = FbData['signals'][number];

interface Props {
  targetModule: 'otb' | 'planning' | 'forecast' | 'category' | 'channel';
  onJumpToPnl?: () => void;
}

const PRIORITY_CFG: Record<string, { cls: string; label: string }> = {
  P0: { cls: 'bg-rose-100 text-rose-700 border-rose-200', label: 'P0 紧急' },
  P1: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'P1 重要' },
  P2: { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: 'P2 建议' },
};

export default function PnlFeedbackBanner({ targetModule, onJumpToPnl }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const signals = feedback.signals.filter(s => s.targetModule === targetModule && !resolved.has(s.id));
  if (signals.length === 0) return null;

  const accept = (id: string) => setResolved(prev => new Set(prev).add(id));
  const ignore = (id: string) => setResolved(prev => new Set(prev).add(id));

  const p0 = signals.filter(s => s.priority === 'P0').length;
  const p1 = signals.filter(s => s.priority === 'P1').length;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-amber-50/40 border border-violet-200 rounded-xl px-4 py-3 mb-4">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">💹</span>
          <span className="text-xs font-bold text-slate-800">来自损益分析的反馈</span>
          <span className="text-[10px] text-slate-500">共 {signals.length} 条</span>
          {p0 > 0 && <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-medium">P0 × {p0}</span>}
          {p1 > 0 && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-medium">P1 × {p1}</span>}
        </div>
        <div className="flex items-center gap-2">
          {onJumpToPnl && (
            <span onClick={(e) => { e.stopPropagation(); onJumpToPnl(); }}
              className="text-[10px] text-violet-600 hover:underline cursor-pointer">→ 查看损益详情</span>
          )}
          <span className="text-[10px] text-slate-400">{expanded ? '▲ 收起' : '▼ 展开'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {signals.map(s => (
            <SignalCard key={s.id} signal={s} onAccept={() => accept(s.id)} onIgnore={() => ignore(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalCard({ signal, onAccept, onIgnore }: {
  signal: Signal;
  onAccept: () => void;
  onIgnore: () => void;
}) {
  const cfg = PRIORITY_CFG[signal.priority] ?? PRIORITY_CFG.P2;
  return (
    <div className="bg-white border border-slate-100 rounded-lg px-3 py-2.5 flex items-start gap-3">
      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border whitespace-nowrap shrink-0 ${cfg.cls}`}>
        {cfg.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-800">{signal.title}</div>
        <div className="text-[11px] text-slate-600 mt-0.5">{signal.detail}</div>
        {signal.impact && (
          <div className="text-[10px] text-emerald-600 mt-1">→ 预期效果：{signal.impact}</div>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={onAccept}
          className="text-[10px] px-2.5 py-1 rounded-md bg-violet-500 text-white hover:bg-violet-600 transition-colors font-medium">
          采纳
        </button>
        <button onClick={onIgnore}
          className="text-[10px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
          忽略
        </button>
      </div>
    </div>
  );
}
