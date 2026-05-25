'use client';

import type { ColorAllocationItem } from '@/lib/design-review-center/types';

interface CrossSeriesColorAllocationProps {
  colors: ColorAllocationItem[];
}

const roleMeta: Record<ColorAllocationItem['role'], { label: string; bg: string; text: string }> = {
  primary: { label: '主色', bg: 'bg-slate-800', text: 'text-white' },
  secondary: { label: '辅色', bg: 'bg-slate-200', text: 'text-slate-700' },
  accent: { label: '点缀', bg: 'bg-amber-100', text: 'text-amber-700' },
};

const colorRoleMeta: Record<'primary' | 'secondary' | 'accent', { label: string }> = {
  primary: { label: '主' },
  secondary: { label: '辅' },
  accent: { label: '点' },
};

const allocationMeta: Record<'exclusive' | 'shared' | 'none', { label: string; border: string; text: string; bg: string }> = {
  exclusive: { label: '专属', border: 'border-red-300', text: 'text-red-700', bg: 'bg-red-50' },
  shared: { label: '共用', border: 'border-blue-300', text: 'text-blue-700', bg: 'bg-blue-50' },
  none: { label: '—', border: 'border-slate-200', text: 'text-slate-400', bg: 'bg-slate-50' },
};

export default function CrossSeriesColorAllocation({ colors }: CrossSeriesColorAllocationProps) {
  if (!colors.length) return null;

  // Derive series list from the first color item (all items share the same series)
  const seriesNames = colors[0].seriesOwnership.map((s) => s.seriesName);

  const totalNew = colors.filter((c) => c.isNew).length;
  const totalExclusive = colors.reduce(
    (sum, c) => sum + c.seriesOwnership.filter((s) => s.allocation === 'exclusive').length,
    0
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">跨系列色彩管控</div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">色彩分配矩阵</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            {colors.length} 个色彩
          </span>
          {totalNew > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {totalNew} 个新色
            </span>
          )}
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            {totalExclusive} 个专属占用
          </span>
        </div>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: `${240 + seriesNames.length * 120}px` }}>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[200px]">
                色彩
              </th>
              {seriesNames.map((name) => (
                <th key={name} className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[110px]">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {colors.map((color) => {
              const rm = roleMeta[color.role];
              return (
                <tr key={color.colorName} className="hover:bg-slate-50/60 transition-colors">
                  {/* Color info cell */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* Swatch */}
                      <div
                        className="h-8 w-8 rounded-lg border border-slate-200/80 flex-shrink-0 shadow-inner"
                        style={{ backgroundColor: color.hex }}
                        title={color.hex}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 text-xs">{color.colorName}</span>
                          {color.isNew && (
                            <span className="rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[9px] font-black text-amber-700 uppercase tracking-wide">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${rm.bg} ${rm.text}`}>
                            {rm.label}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">{color.hex}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Series cells */}
                  {color.seriesOwnership.map((so) => {
                    const am = allocationMeta[so.allocation];
                    const crm = colorRoleMeta[so.colorRole];
                    return (
                      <td key={so.seriesName} className="px-3 py-3.5 text-center">
                        {so.allocation === 'none' ? (
                          <span className="text-slate-300 text-base">—</span>
                        ) : (
                          <div className={`inline-flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1 ${am.border} ${am.bg}`}>
                            <span className={`text-[10px] font-black ${am.text}`}>{am.label}</span>
                            <span className={`text-[9px] font-bold ${am.text} opacity-70`}>{crm.label}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          <span className="text-slate-400">图例：</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-red-700">专属</span>
            仅此系列使用
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-blue-700">共用</span>
            跨系列共享
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-300 text-base leading-none">—</span>
            本系列未使用
          </span>
          <span className="text-slate-300">|</span>
          <span>主/辅/点 = 在该系列中的色彩层级</span>
          <span className="text-slate-300">|</span>
          <span className="rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-amber-700">NEW</span>
          <span>= 本季新色</span>
        </div>
      </div>
    </div>
  );
}
