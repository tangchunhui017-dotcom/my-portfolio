'use client';

import type { CostMarginRow, CostMarginRowStatus } from '@/lib/design-review-center/types';

interface Props {
  rows: CostMarginRow[];
}

const STATUS_CFG: Record<CostMarginRowStatus, { badge: string; marginColor: string }> = {
  normal:     { badge: 'bg-green-50  text-green-700',  marginColor: 'text-green-700'  },
  warning:    { badge: 'bg-amber-50  text-amber-700',  marginColor: 'text-amber-700'  },
  over_target:{ badge: 'bg-red-50    text-red-700',    marginColor: 'text-red-700'    },
};

const STATUS_LABEL: Record<CostMarginRowStatus, string> = {
  normal:     '正常',
  warning:    '预警',
  over_target:'超目标',
};

function pct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

function Diff({ target, forecast }: { target: number; forecast: number }) {
  const diff = forecast - target;
  const str = diff >= 0 ? `+${(diff * 100).toFixed(1)}%` : `${(diff * 100).toFixed(1)}%`;
  const color = diff >= 0 ? 'text-green-600' : diff < -0.03 ? 'text-red-600' : 'text-amber-600';
  return <span className={`font-bold text-xs ${color}`}>{str}</span>;
}

export default function CostMarginHealthPanel({ rows }: Props) {
  const overCount     = rows.filter((r) => r.status === 'over_target').length;
  const warnCount     = rows.filter((r) => r.status === 'warning').length;
  const avgTarget     = rows.reduce((s, r) => s + r.targetMarginRate,   0) / rows.length;
  const avgForecast   = rows.reduce((s, r) => s + r.forecastMarginRate, 0) / rows.length;
  const avgTargetFob  = rows.reduce((s, r) => s + r.targetFob,  0) / rows.length;
  const avgForecastFob= rows.reduce((s, r) => s + r.forecastFob, 0) / rows.length;

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">Cost &amp; Margin Health</div>
        <h2 className="text-xl font-bold text-slate-900">成本、价格带与毛利健康</h2>
        <p className="mt-1 text-xs text-slate-400">按系列拆解 FOB 成本与毛利率，识别超预算款项</p>
      </div>

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-xl font-black text-slate-900">{pct(avgTarget)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">目标毛利率</div>
        </div>
        <div className={`rounded-lg border p-4 text-center ${avgForecast < avgTarget - 0.03 ? 'border-red-200 bg-red-50' : avgForecast < avgTarget ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <div className={`text-xl font-black ${avgForecast < avgTarget - 0.03 ? 'text-red-700' : avgForecast < avgTarget ? 'text-amber-700' : 'text-green-700'}`}>
            {pct(avgForecast)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">当前预测毛利</div>
        </div>
        <div className={`rounded-lg border p-4 text-center ${overCount > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
          <div className={`text-xl font-black ${overCount > 0 ? 'text-red-700' : 'text-slate-700'}`}>
            {overCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">超成本系列</div>
        </div>
        <div className={`rounded-lg border p-4 text-center ${warnCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
          <div className="text-xl font-black text-slate-700">¥{Math.round(avgForecastFob)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            平均 FOB（目标¥{Math.round(avgTargetFob)}）
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="overflow-x-auto -mx-1">
        <table className="min-w-[720px] w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50 text-left">
              {['系列', '品类', 'MSRP', '目标 FOB', '预测 FOB', '目标毛利', '预测毛利', '偏差', '状态', '优化建议'].map((h) => (
                <th key={h} className={`px-3 py-2 font-semibold text-slate-500 whitespace-nowrap ${h === '偏差' || h === '状态' ? 'text-center' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const cfg = STATUS_CFG[row.status];
              return (
                <tr key={row.seriesId} className={`hover:bg-slate-50 transition-colors ${row.status === 'over_target' ? 'bg-red-50/20' : ''}`}>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.seriesName}</td>
                  <td className="px-3 py-2.5 text-slate-500">{row.category}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">¥{row.msrp}</td>
                  <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">¥{row.targetFob}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                    <span className={row.forecastFob > row.targetFob ? 'text-red-600 font-bold' : 'text-slate-700'}>
                      ¥{row.forecastFob}
                    </span>
                    {row.lockedFob !== undefined && (
                      <span className="ml-1 text-green-600 text-[10px]">（锁¥{row.lockedFob}）</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{pct(row.targetMarginRate)}</td>
                  <td className={`px-3 py-2.5 font-bold whitespace-nowrap ${cfg.marginColor}`}>
                    {pct(row.forecastMarginRate)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Diff target={row.targetMarginRate} forecast={row.forecastMarginRate} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 min-w-[180px]">
                    {row.overTargetReason && (
                      <div className="text-red-600 mb-0.5 text-[11px]">{row.overTargetReason}</div>
                    )}
                    {row.optimizationSuggestion && (
                      <div className="text-blue-600 text-[11px]">→ {row.optimizationSuggestion}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
