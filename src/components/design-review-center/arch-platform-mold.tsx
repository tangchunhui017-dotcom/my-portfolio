'use client';

import type { PlatformMoldSummary } from '@/lib/design-review-center/arch-derivations';

interface Props {
  data: PlatformMoldSummary;
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function RateBar({ rate }: { rate: number }) {
  const cls =
    rate >= 0.5 ? 'bg-emerald-500' : rate >= 0.35 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full ${cls}`}
        style={{ width: `${Math.round(rate * 100)}%` }}
      />
    </div>
  );
}

export default function ArchPlatformMold({ data }: Props) {
  const summaryCards = [
    {
      label: '共底率',
      value: pct(data.sharedSoleRate),
      risk: data.sharedSoleRate < 0.4,
      rate: data.sharedSoleRate,
      sub: '低于 40% 建议重新规划底型平台',
    },
    {
      label: '共楦率',
      value: pct(data.sharedLastRate),
      risk: data.sharedLastRate < 0.4,
      rate: data.sharedLastRate,
      sub: '低于 40% 建议重新规划楦型平台',
    },
    {
      label: '平台复用率',
      value: pct(data.platformReuseRate),
      risk: data.platformReuseRate < 0.3,
      rate: data.platformReuseRate,
      sub: '成熟平台尽量跨系列承接',
    },
    {
      label: '新模数量',
      value: `${data.newToolingCount} / ${data.newToolingBudget}`,
      risk: data.overBudget,
      rate: Math.min(1, data.newToolingCount / data.newToolingBudget),
      sub: data.overBudget ? '已超预算，需决策' : '在预算范围内',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border bg-white p-4 shadow-sm ${
              c.risk ? 'border-rose-200' : 'border-slate-200'
            }`}
          >
            <div className="text-xs text-slate-500">{c.label}</div>
            <div
              className={`mt-2 text-2xl font-semibold ${
                c.risk ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {c.value}
            </div>
            <RateBar rate={c.label === '新模数量' ? 1 - Math.min(1, data.newToolingCount / data.newToolingBudget) : c.rate} />
            <div className="mt-1.5 text-[11px] text-slate-400">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Cost impact banner */}
      {data.overBudget && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span className="font-semibold">成本影响：</span>
          {data.costImpact}
        </div>
      )}

      {/* Per-category table */}
      {data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-3">品类</th>
                  <th className="px-4 py-3">底型平台</th>
                  <th className="px-4 py-3">楦型平台</th>
                  <th className="px-4 py-3 text-right">共底款数</th>
                  <th className="px-4 py-3 text-right">共楦款数</th>
                  <th className="px-4 py-3 text-right">新模</th>
                  <th className="px-4 py-3 text-right">款数目标</th>
                  <th className="px-4 py-3">推荐动作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={item.categoryName} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.categoryName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {item.outsoles.join('、') || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {item.lasts.join('、') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          item.sharedSoleRate < 0.4
                            ? 'font-medium text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {item.sharedSole}
                      </span>
                      <span className="text-slate-400">
                        {' '}
                        ({pct(item.sharedSoleRate)})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          item.sharedLastRate < 0.4
                            ? 'font-medium text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {item.sharedLast}
                      </span>
                      <span className="text-slate-400">
                        {' '}
                        ({pct(item.sharedLastRate)})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.newTooling > 0 ? (
                        <span className="font-medium text-rose-600">{item.newTooling}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {item.styleCount}
                    </td>
                    <td className="px-4 py-3">
                      {item.recommendedActions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.recommendedActions.map((a) => (
                            <span
                              key={a}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-500">无需调整</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
