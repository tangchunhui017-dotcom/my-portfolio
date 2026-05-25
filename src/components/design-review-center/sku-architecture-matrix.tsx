'use client';

import type { SkuArchitectureRow, SkuDevStatus } from '@/lib/design-review-center/types';

interface Props {
  rows: SkuArchitectureRow[];
}

const DEV_STATUS: Record<SkuDevStatus, { label: string; color: string; barColor: string }> = {
  planning:    { label: '企划中', color: 'text-slate-400',       barColor: 'bg-slate-300' },
  in_progress: { label: '开发中', color: 'text-blue-600',        barColor: 'bg-blue-400'  },
  completed:   { label: '已完成', color: 'text-green-600',       barColor: 'bg-emerald-400' },
  at_risk:     { label: '有风险', color: 'text-red-600 font-bold', barColor: 'bg-red-400'  },
};

const NEW_RATE_THRESHOLD = 0.65;

export default function SkuArchitectureMatrix({ rows }: Props) {
  const totalTarget = rows.reduce((s, r) => s + r.skuTarget, 0);
  const totalNew = rows.reduce((s, r) => s + (r.newCount ?? 0), 0);
  const totalCarryover = rows.reduce((s, r) => s + (r.carryoverCount ?? 0), 0);
  const riskCount = rows.filter((r) => r.riskStatus === 'high_risk').length;

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">SKU Architecture Matrix</div>
          <h2 className="text-xl font-bold text-slate-900">产品线结构 / SKU 架构</h2>
          <p className="mt-1 text-xs text-slate-400">
            {rows.length} 个系列 · 目标 {totalTarget} 款 · 新款 {totalNew} / 续款 {totalCarryover}
          </p>
        </div>
        {riskCount > 0 && (
          <div className="flex-shrink-0 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">
            {riskCount} 个系列存在高风险
          </div>
        )}
      </div>

      {/* Table — horizontally scrollable */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-[900px] w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50 text-left">
              {[
                { label: '产品线', align: '' },
                { label: '品类', align: '' },
                { label: '总款数', align: 'text-right' },
                { label: '新款', align: 'text-right' },
                { label: '续款', align: 'text-right' },
                { label: '新款占比', align: 'text-center' },
                { label: '主价格带', align: '' },
                { label: '开发进度', align: 'text-center' },
              ].map((h) => (
                <th key={h.label} className={`px-3 py-2 font-semibold text-slate-500 whitespace-nowrap ${h.align}`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const devCfg = DEV_STATUS[row.devStatus];
              const newCount = row.newCount ?? Math.round(row.skuTarget * 0.6);
              const carryoverCount = row.carryoverCount ?? (row.skuTarget - Math.round(row.skuTarget * 0.6));
              const total = newCount + carryoverCount;
              const newRate = total > 0 ? newCount / total : 0;
              const isOverThreshold = newRate > NEW_RATE_THRESHOLD;
              const pct = row.skuTarget > 0 ? Math.round((row.skuCount / row.skuTarget) * 100) : 0;

              return (
                <tr
                  key={row.seriesId}
                  className={`transition-colors hover:bg-slate-50 ${isOverThreshold ? 'bg-red-50/40' : ''}`}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.seriesName}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{row.category}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900">{row.skuTarget}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{newCount}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{carryoverCount}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        isOverThreshold
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {Math.round(newRate * 100)}%
                      {isOverThreshold && ' ↑'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{row.priceBand}</td>
                  <td className="px-3 py-2.5 text-center min-w-[120px]">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${devCfg.barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-semibold whitespace-nowrap ${devCfg.color}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className={`text-center text-[10px] mt-0.5 ${devCfg.color}`}>{devCfg.label}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.some((r) => {
        const n = r.newCount ?? Math.round(r.skuTarget * 0.6);
        const c = r.carryoverCount ?? (r.skuTarget - Math.round(r.skuTarget * 0.6));
        return (n + c) > 0 && n / (n + c) > NEW_RATE_THRESHOLD;
      }) && (
        <p className="mt-3 text-[11px] text-red-600">
          ⚠ 红色高亮系列新款占比超过 {Math.round(NEW_RATE_THRESHOLD * 100)}%，请确认资源投入是否支撑。
        </p>
      )}
    </section>
  );
}
