'use client';

import { Fragment } from 'react';
import type {
  TaskDependencies,
  SampleSubStatus,
  DepStatus,
} from '@/lib/design-review-center/task-pool-derivations';

const STAGE_META: { key: keyof TaskDependencies; label: string }[] = [
  { key: 'design', label: '设计' },
  { key: 'sample', label: '样鞋' },
  { key: 'material', label: '材料' },
  { key: 'cost', label: '成本' },
  { key: 'tech', label: '技术' },
];

const DEP_CLS: Record<DepStatus, { border: string; bg: string; text: string; label: string }> = {
  not_started: { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-400', label: '未开始' },
  in_progress: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-600', label: '进行中' },
  at_risk: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600', label: '待评审' },
  done: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-600', label: '完成' },
  blocked: { border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-600', label: '阻塞' },
};

interface Props {
  deps: TaskDependencies;
  sampleSub?: SampleSubStatus;
}

export default function TaskDependencyChain({ deps, sampleSub }: Props) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">任务依赖链</div>

      {/* 5-stage chain */}
      <div className="flex items-center gap-1">
        {STAGE_META.map((s, idx) => {
          const status = deps[s.key];
          const cls = DEP_CLS[status];
          return (
            <Fragment key={s.key}>
              <div className={`flex-1 rounded-lg border-2 ${cls.border} ${cls.bg} p-2 text-center`}>
                <div className={`text-[10px] font-bold ${cls.text}`}>{s.label}</div>
                <div className={`mt-0.5 text-[11px] font-semibold ${cls.text}`}>{cls.label}</div>
                {s.key === 'sample' && sampleSub && sampleSub.revisionRound > 0 && (
                  <div className="mt-0.5 text-[10px] text-amber-500">{sampleSub.revisionRound} 轮改样</div>
                )}
              </div>
              {idx < 4 && <div className="shrink-0 text-sm text-slate-300">→</div>}
            </Fragment>
          );
        })}
      </div>

      {/* Sample sub-status machine */}
      {sampleSub && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-white p-2">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            样鞋打样进度
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {[
              { label: '材料确认', done: sampleSub.materialConfirmed },
              { label: '样鞋出厂', done: sampleSub.sampleShipped },
              { label: '试穿反馈', done: sampleSub.fitTested },
            ].map((chip) => (
              <span
                key={chip.label}
                className={`rounded-full px-2 py-0.5 font-medium ${
                  chip.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {chip.done ? '✓' : '○'} {chip.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
