'use client';

import type { OwnerLoad } from '@/lib/design-review-center/task-pool-derivations';

function RateBar({
  value,
  overloaded,
  warning,
}: {
  value: number;
  overloaded: boolean;
  warning: boolean;
}) {
  const pct = Math.min(100, Math.round(value));
  const color = overloaded ? 'bg-rose-500' : warning ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

interface Props {
  loads: OwnerLoad[];
}

export default function ResourceLoadBoard({ loads }: Props) {
  if (loads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        暂无责任人数据
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {loads.map((load) => (
        <article
          key={load.owner}
          className={`rounded-2xl border p-5 ${
            load.overloaded
              ? 'border-rose-200 bg-rose-50/30'
              : load.warning
                ? 'border-amber-200 bg-amber-50/20'
                : 'border-slate-200 bg-white'
          }`}
        >
          <header className="mb-3 flex items-center justify-between">
            <div className="font-semibold text-slate-900">{load.owner}</div>
            <span
              className={`text-xs font-bold ${
                load.overloaded
                  ? 'text-rose-600'
                  : load.warning
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {load.overloaded ? '超载' : load.warning ? '满载' : '正常'}
            </span>
          </header>

          <div className="mb-2 flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-black tabular-nums ${
                load.overloaded ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {load.activeCount}
            </span>
            <span className="text-sm text-slate-400">/ {load.capacity} 款</span>
          </div>

          <RateBar
            value={(load.activeCount / load.capacity) * 100}
            overloaded={load.overloaded}
            warning={load.warning}
          />

          <div className="mt-3 text-xs text-slate-500">
            阻塞{' '}
            <span className={load.blockedCount > 0 ? 'font-bold text-rose-600' : ''}>{load.blockedCount}</span>
            {' · '}逾期{' '}
            <span className={load.overdueCount > 0 ? 'font-bold text-rose-600' : ''}>{load.overdueCount}</span>
            {' · '}本周到期{' '}
            <span className={load.dueThisWeekCount > 0 ? 'font-bold text-amber-600' : ''}>
              {load.dueThisWeekCount}
            </span>
          </div>

          {load.criticalTasks.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {load.criticalTasks.map((t) => (
                <li key={t.skuCode} className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-400">•</span>
                  <span className="flex-1 truncate text-slate-600">
                    {t.skuCode} {t.styleName}
                  </span>
                  <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                    {t.statusBadge}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
