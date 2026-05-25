'use client';

import type { ProtoStatus } from '@/lib/design-review-center/types';

interface Props {
  data: ProtoStatus;
}

const REASON_LABEL: Record<string, { label: string; cls: string }> = {
  factory:       { label: '工厂延误', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  material:      { label: '材料延误', cls: 'bg-red-100 text-red-700 border-red-200' },
  design_change: { label: '设计变更', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
};

export default function ProtoStatusSnapshotPanel({ data }: Props) {
  const completedPct = data.totalStyles > 0 ? data.protoCompleted / data.totalStyles : 0;
  const inProgressPct = data.totalStyles > 0 ? data.protoInProgress / data.totalStyles : 0;
  const notStartedPct = data.totalStyles > 0 ? data.protoNotStarted / data.totalStyles : 0;
  const completedDeg = completedPct * 360;
  const inProgressDeg = inProgressPct * 360;

  // SVG donut: 3 segments
  const r = 32;
  const cx = 40;
  const cy = 40;
  const stroke = 10;
  const circumference = 2 * Math.PI * r;

  const segCompletedLen = completedPct * circumference;
  const segInProgressLen = inProgressPct * circumference;
  const segNotStartedLen = notStartedPct * circumference;

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
        Proto Status
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-4">打样进度快照</h3>

      <div className="flex gap-6 items-center flex-wrap">
        {/* Donut chart */}
        <div className="relative flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            {/* Background ring */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            {/* Completed (green) */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#22c55e"
              strokeWidth={stroke}
              strokeDasharray={`${segCompletedLen} ${circumference - segCompletedLen}`}
              strokeDashoffset={circumference * 0.25}
              strokeLinecap="butt"
            />
            {/* InProgress (blue) */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={stroke}
              strokeDasharray={`${segInProgressLen} ${circumference - segInProgressLen}`}
              strokeDashoffset={circumference * 0.25 - segCompletedLen}
              strokeLinecap="butt"
            />
            {/* Center text */}
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f172a">
              {Math.round(completedPct * 100)}%
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#94a3b8">
              已完成
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="space-y-2 flex-1 min-w-[160px]">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-slate-600">已完成</span>
            <strong className="ml-auto text-slate-900">{data.protoCompleted} 款</strong>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-slate-600">进行中</span>
            <strong className="ml-auto text-slate-900">{data.protoInProgress} 款</strong>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 flex-shrink-0" />
            <span className="text-slate-600">未开始</span>
            <strong className="ml-auto text-slate-900">{data.protoNotStarted} 款</strong>
          </div>
        </div>

        {/* Next Gate countdown */}
        <div className="flex-shrink-0 text-center px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[28px] font-black text-slate-900 leading-none">{data.daysToNextGate}</div>
          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">天 · {data.nextGateName}</div>
        </div>
      </div>

      {/* Delayed items */}
      {data.delayedItems.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="text-[11px] font-semibold text-slate-500 mb-2">延误款项</div>
          <div className="space-y-1.5">
            {data.delayedItems.map((item) => {
              const cfg = REASON_LABEL[item.reason] ?? { label: item.reason, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
              return (
                <div key={item.styleCode} className="flex items-center gap-2 text-xs">
                  <code className="font-mono text-slate-700 flex-shrink-0">{item.styleCode}</code>
                  <span className="text-slate-400 flex-shrink-0">{item.plannedDate}</span>
                  <span className="text-red-500 font-semibold flex-shrink-0">+{item.delayDays}天</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
