'use client';

import type { WaveLaunchGroup } from '@/lib/design-review-center/arch-derivations';

interface Props {
  groups: WaveLaunchGroup[];
}

export default function ArchWaveLaunchPlan({ groups }: Props) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-400">
        当前筛选无波段数据（款位的 waveId 字段未分配）
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <article
          key={g.wave}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <header className="flex items-baseline justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                {g.wave}
              </div>
              <h4 className="mt-1 text-2xl font-black text-slate-900">
                {g.styleCount} 款 · {g.skuCount} SKU
              </h4>
            </div>
            {g.daysUntilLaunch != null && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  g.daysUntilLaunch < 30
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                距上市 {g.daysUntilLaunch} 天
              </span>
            )}
          </header>

          {/* 品类汇总 */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {g.categoryCounts.map((c) => (
              <span
                key={c.name}
                className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >
                {c.name} {c.count}
              </span>
            ))}
          </div>

          {/* 款位 chips */}
          <ul className="mt-4 max-h-48 space-y-1.5 overflow-y-auto">
            {g.slots.map((s) => (
              <li key={s.slotId} className="flex items-center gap-2 text-xs">
                {s.isHero && (
                  <span className="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-600">
                    HERO
                  </span>
                )}
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    s.isNew ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {s.isNew ? '新' : '续'}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700">{s.styleName}</span>
                {s.colorCount > 0 && (
                  <span className="flex-shrink-0 text-slate-400">×{s.colorCount}色</span>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
