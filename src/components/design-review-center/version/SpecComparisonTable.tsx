'use client';

import type { SpecCompareRow } from '@/lib/design-review-center/version-preview-derivations';

interface Props {
  rows: SpecCompareRow[];
}

export function SpecComparisonTable({ rows }: Props) {
  if (rows.length === 0) return null;

  const nonCompliant = rows.filter((r) => r.isCompliant === false).length;

  return (
    <div className="flex flex-col gap-3">
      {/* compliance summary */}
      {nonCompliant > 0 ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 font-medium">
          ⚠ {nonCompliant} 项参数不在规格范围内，建议复核
        </div>
      ) : (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700 font-medium">
          ✓ 所有参数均在规格范围内
        </div>
      )}

      {/* table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-3 py-2 font-medium w-16">参数</th>
              <th className="px-3 py-2 font-medium">规格范围</th>
              <th className="px-3 py-2 font-medium text-violet-600">设计值</th>
              <th className="px-3 py-2 font-medium text-amber-600">实物值</th>
              <th className="px-3 py-2 font-medium">偏差</th>
              <th className="px-3 py-2 font-medium text-center">合规</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const outOfRange = row.isCompliant === false;
              return (
                <tr key={row.label} className={outOfRange ? 'bg-amber-50/60' : ''}>
                  <td className="px-3 py-2.5 font-semibold text-slate-700">{row.label}</td>
                  <td className="px-3 py-2.5 text-slate-400">
                    {row.standardMin}–{row.standardMax} {row.unit}
                  </td>
                  <td className="px-3 py-2.5 text-violet-700">
                    {row.designValue !== null ? `${row.designValue} ${row.unit}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-amber-700">
                    {row.sampleValue !== null ? `${row.sampleValue} ${row.unit}` : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.delta !== null ? (
                      <span className={row.delta > 0 ? 'text-rose-500' : row.delta < 0 ? 'text-sky-500' : 'text-slate-400'}>
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                        {row.deltaPercent !== null && (
                          <span className="text-[10px] ml-1 opacity-70">({row.deltaPercent.toFixed(1)}%)</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.isCompliant === true && (
                      <span className="text-emerald-500 font-bold">✓</span>
                    )}
                    {row.isCompliant === false && (
                      <span className="text-rose-500 font-bold">✗</span>
                    )}
                    {row.isCompliant === null && (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
