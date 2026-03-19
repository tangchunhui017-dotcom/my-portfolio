'use client';

import { useState } from 'react';
import type { OpenClawTask } from '@/lib/openclaw/tasks';
import { createTask, getTaskLabel } from '@/lib/openclaw/tasks';

const QUICK_ACTIONS: OpenClawTask['type'][] = [
  'competitor-analysis',
  'design-review',
  'wave-review',
  'weekly-summary',
];

export default function OpenClawEntryButton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleAction = (type: OpenClawTask['type']) => {
    const task = createTask(type);
    setToast(`已创建任务: ${getTaskLabel(type)} (${task.id})`);
    setOpen(false);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {open && (
          <div className="bg-white rounded-xl shadow-lg border border-indigo-100 p-2 mb-2 min-w-[200px] animate-in fade-in slide-in-from-bottom-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              OpenClaw 快捷任务
            </div>
            {QUICK_ACTIONS.map(type => (
              <button
                key={type}
                onClick={() => handleAction(type)}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
              >
                {getTaskLabel(type)}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          aria-label="OpenClaw 快捷任务"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          )}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </>
  );
}
