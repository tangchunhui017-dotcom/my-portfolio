'use client';
/**
 * src/components/inventory/InvFeedbackSignalCard.tsx
 * S14: 联动反馈信号卡 (V10) — 可点击跳转 + 反馈信号
 */
import { useState } from 'react';
import type { InvFeedbackSignal } from '@/types/invHealthV10Types';

interface RelatedModule {
  id: string;
  label: string;
  desc: string;
  color: string;
  signal?: InvFeedbackSignal;
}

interface Props {
  modules: RelatedModule[];
  onJumpToTab?: (tabId: string) => void;
}

const PRIORITY_BADGE: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-yellow-100 text-yellow-700',
};

export default function InvFeedbackSignalCard({ modules, onJumpToTab }: Props) {
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());

  const accept = (id: string) => setAcceptedIds(prev => new Set([...prev, id]));
  const ignore = (id: string) => setIgnoredIds(prev => new Set([...prev, id]));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">联动模块</h3>
        <p className="text-xs text-gray-400 mt-0.5">点击跳转 · 库存反馈信号 · 双向联动</p>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {modules.map(m => {
          const sig = m.signal;
          const accepted = sig ? acceptedIds.has(sig.id) : false;
          const ignored  = sig ? ignoredIds.has(sig.id)  : false;
          return (
            <div key={m.id}
              className={`rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group ${accepted ? 'bg-emerald-50/40 border-emerald-200' : ignored ? 'opacity-50' : 'bg-white'}`}>
              {/* 模块头 */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: m.color }}>{m.label.slice(0, 2)}</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{m.label}</div>
                  <div className="text-[10px] text-gray-400">{m.desc}</div>
                </div>
              </div>

              {/* 反馈信号 */}
              {sig && !ignored && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${PRIORITY_BADGE[sig.priority] ?? PRIORITY_BADGE.P2}`}>{sig.priority}</span>
                    <span className="text-[10px] font-semibold text-amber-800">库存反馈</span>
                  </div>
                  <p className="text-[10px] text-amber-700 leading-relaxed">{sig.detail}</p>
                  {!accepted && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => accept(sig.id)}
                        className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded font-medium transition-colors">采纳</button>
                      <button onClick={() => ignore(sig.id)}
                        className="text-[10px] bg-gray-100 text-gray-500 hover:bg-gray-200 px-2 py-1 rounded font-medium transition-colors">忽略</button>
                    </div>
                  )}
                  {accepted && (
                    <div className="mt-2 text-[10px] text-emerald-600 font-semibold">✅ 已采纳</div>
                  )}
                </div>
              )}

              <button onClick={() => onJumpToTab?.(m.id)}
                className="w-full text-xs border border-gray-200 group-hover:border-blue-300 group-hover:text-blue-600 rounded-lg py-1.5 transition-colors text-gray-500 font-medium">
                → 跳转至 {m.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
