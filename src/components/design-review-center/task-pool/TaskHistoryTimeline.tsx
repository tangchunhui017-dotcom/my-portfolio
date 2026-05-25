'use client';

import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { TaskHistoryEvent } from '@/lib/design-review-center/task-pool-derivations';

const TYPE_DOT: Record<TaskHistoryEvent['type'], string> = {
  created: 'border-slate-400',
  progressed: 'border-blue-400',
  blocked: 'border-rose-500',
  review: 'border-amber-400',
  completed: 'border-emerald-500',
};

const TYPE_CLS: Record<TaskHistoryEvent['type'], string> = {
  created: 'bg-white border-slate-200 text-slate-700',
  progressed: 'bg-blue-50 border-blue-100 text-blue-700',
  blocked: 'bg-rose-50 border-rose-200 text-rose-700',
  review: 'bg-amber-50 border-amber-100 text-amber-700',
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

interface Props {
  events: TaskHistoryEvent[];
}

export default function TaskHistoryTimeline({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">任务历史</div>
      <ol className="relative ml-3 space-y-3 border-l-2 border-slate-200">
        {events.map((e, i) => (
          <li key={i} className="relative ml-4">
            <span
              className={`absolute -left-[22px] size-3 rounded-full border-2 bg-white ${TYPE_DOT[e.type]}`}
            />
            <div className="text-[10px] text-slate-400">{formatDate(e.date)}</div>
            <div className={`mt-0.5 rounded-md border px-2 py-1 text-xs font-medium ${TYPE_CLS[e.type]}`}>
              {e.action}
            </div>
            {e.note && <div className="mt-0.5 text-[11px] text-slate-500">{e.note}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
