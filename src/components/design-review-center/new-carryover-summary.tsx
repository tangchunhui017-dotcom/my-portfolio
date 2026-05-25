'use client';

import type { NewCarryoverSummary } from '@/lib/design-review-center/types';

interface Props {
  data: NewCarryoverSummary;
}

function RateBar({ rate, target }: { rate: number; target: number }) {
  const overTarget = rate > target;
  return (
    <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
      {/* target marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
        style={{ left: `${target * 100}%` }}
      />
      <div
        className={`h-full rounded-full transition-all ${overTarget ? 'bg-red-400' : 'bg-emerald-400'}`}
        style={{ width: `${Math.min(rate * 100, 100)}%` }}
      />
    </div>
  );
}

export default function NewCarryoverSummaryPanel({ data }: Props) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const overTarget = data.newRate > data.targetNewRate;

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
        New vs Carryover
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[28px] font-black text-slate-900">{pct(data.newRate)}</span>
        <span className="text-sm text-slate-500">新款率</span>
        {overTarget ? (
          <span className="ml-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600">
            ↑ 超目标 {pct(data.newRate - data.targetNewRate)}
          </span>
        ) : (
          <span className="ml-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            达标
          </span>
        )}
      </div>

      {/* Total counts */}
      <div className="flex gap-4 text-xs text-slate-600 mb-4">
        <span>新款 <strong className="text-slate-900">{data.newCount}</strong> 款</span>
        <span>续款 <strong className="text-slate-900">{data.carryoverCount}</strong> 款</span>
        <span className="text-slate-400">目标 {pct(data.targetNewRate)}</span>
      </div>

      {/* Per product line */}
      <div className="space-y-2.5">
        {data.byProductLine.map((line) => {
          const lineOver = line.newRate > data.targetNewRate;
          return (
            <div key={line.name}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={`font-medium ${lineOver ? 'text-red-600' : 'text-slate-700'}`}>
                  {line.name}
                </span>
                <span className="text-slate-400">
                  新 {line.newCount} / 续 {line.carryoverCount} · <strong className={lineOver ? 'text-red-600' : 'text-slate-700'}>{pct(line.newRate)}</strong>
                </span>
              </div>
              <RateBar rate={line.newRate} target={data.targetNewRate} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
