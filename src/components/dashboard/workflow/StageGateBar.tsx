'use client';

import { useState } from 'react';
import { WORKFLOW_GATES } from '@/config/bigMerchWorkflow';

interface StageGateBarProps {
  gateStatuses: Record<string, { passed: boolean; canPass: boolean; reason?: string }>;
  onPassGate: (gateId: string, passedBy: string, notes?: string) => void;
}

interface FormState {
  passedBy: string;
  notes: string;
  open: boolean;
}

const GATE_COLORS = {
  passed: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  locked: 'border-slate-200 bg-slate-50 text-slate-500',
};

export default function StageGateBar({ gateStatuses, onPassGate }: StageGateBarProps) {
  const [forms, setForms] = useState<Record<string, FormState>>({});

  const getForm = (gateId: string): FormState =>
    forms[gateId] ?? { passedBy: '', notes: '', open: false };

  const setForm = (gateId: string, update: Partial<FormState>) =>
    setForms((prev) => ({ ...prev, [gateId]: { ...getForm(gateId), ...update } }));

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {WORKFLOW_GATES.map((gate) => {
        const status = gateStatuses[gate.id];
        const passed = status?.passed ?? false;
        const canPass = status?.canPass ?? false;
        const reason = status?.reason;
        const form = getForm(gate.id);

        return (
          <div
            key={gate.id}
            className={`group relative flex flex-col gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition shrink-0 ${
              passed ? GATE_COLORS.passed : GATE_COLORS.locked
            }`}
            title={!form.open ? (reason ?? gate.description) : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                  passed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {passed ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </span>

              <span>{gate.title}</span>

              {!passed && !form.open && (
                <button
                  type="button"
                  disabled={!canPass}
                  onClick={() => setForm(gate.id, { open: true })}
                  title={canPass ? '前置节点已完成，可标记通过' : reason}
                  className="ml-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-500"
                >
                  标记通过
                </button>
              )}
            </div>

            {!passed && form.open && (
              <div className="flex flex-col gap-1.5 min-w-[200px]">
                <input
                  type="text"
                  value={form.passedBy}
                  onChange={(e) => setForm(gate.id, { passedBy: e.target.value })}
                  placeholder="通过人 *"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-400"
                />
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm(gate.id, { notes: e.target.value })}
                  placeholder="备注（可选）"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-400"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!form.passedBy.trim()}
                    onClick={() => {
                      onPassGate(gate.id, form.passedBy.trim(), form.notes.trim() || undefined);
                      setForm(gate.id, { open: false, passedBy: '', notes: '' });
                    }}
                    className="flex-1 rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    确认通过
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(gate.id, { open: false })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}