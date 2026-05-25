'use client';

import type { PriceCostRow } from '@/lib/design-review-center/arch-derivations';

interface Props {
  rows: PriceCostRow[];
}

function fmtCost(cost: number | null) {
  return cost != null ? `¥${Math.round(cost)}` : '—';
}

const MARGIN_CLS = {
  ok: 'text-emerald-600',
  warning: 'text-amber-600',
  high_risk: 'text-rose-600 font-semibold',
};

const MARGIN_LABEL = {
  ok: '正常',
  warning: '预警',
  high_risk: '高风险',
};

export default function ArchPriceCostMargin({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-400">
        当前筛选无价格成本数据
      </div>
    );
  }

  const totalOver = rows.reduce((sum, r) => sum + r.overCostCount, 0);
  const highRiskCount = rows.filter((r) => r.marginRisk === 'high_risk').length;

  // Weighted average gross margin
  const rowsWithMargin = rows.filter((r) => r.grossMarginRate != null);
  const avgMargin =
    rowsWithMargin.length > 0
      ? rowsWithMargin.reduce((sum, r) => sum + (r.grossMarginRate ?? 0), 0) / rowsWithMargin.length
      : null;

  return (
    <div className="space-y-3">
      {/* Weighted average margin summary */}
      {avgMargin != null && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
          <div className="text-xs font-medium uppercase tracking-widest text-slate-400">本季加权平均毛利率</div>
          <div
            className={`mt-2 text-3xl font-black ${
              avgMargin >= 0.45
                ? 'text-emerald-600'
                : avgMargin >= 0.35
                  ? 'text-amber-600'
                  : 'text-rose-600'
            }`}
          >
            {Math.round(avgMargin * 100)}%
          </div>
        </div>
      )}

      {/* Summary row */}
      {totalOver > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span className="font-semibold">
            {totalOver} 款成本超标 · {highRiskCount} 个系列高风险
          </span>
          <span className="text-rose-500">建议：降低材料等级、共用大底、减少颜色数</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">系列</th>
                <th className="px-4 py-3">价格带</th>
                <th className="px-4 py-3 text-right">SKU 目标</th>
                <th className="px-4 py-3 text-right">当前款数</th>
                <th className="px-4 py-3 text-right">目标成本均值</th>
                <th className="px-4 py-3 text-right">报价均值</th>
                <th className="px-4 py-3 text-right">超标款数</th>
                <th className="px-4 py-3 w-28">毛利率</th>
                <th className="px-4 py-3 w-20">毛利风险</th>
                <th className="px-4 py-3">推荐动作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 text-slate-600">{row.priceBand || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.skuTarget}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      row.skuActual < row.skuTarget
                        ? 'text-amber-600'
                        : row.skuActual > row.skuTarget
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {row.skuActual}
                    {row.priceGap && (
                      <span className="ml-1 text-[11px] text-rose-500">{row.priceGap}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {fmtCost(row.targetCostAvg)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      row.quotedCostAvg &&
                      row.targetCostAvg &&
                      row.quotedCostAvg > row.targetCostAvg
                        ? 'font-semibold text-rose-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {fmtCost(row.quotedCostAvg)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.overCostCount > 0 ? (
                      <span className="font-semibold text-rose-600">{row.overCostCount}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.grossMarginRate != null ? (
                      <div className="space-y-1">
                        <div
                          className={`text-sm font-bold ${
                            row.grossMarginRate >= 0.45
                              ? 'text-emerald-600'
                              : row.grossMarginRate >= 0.35
                                ? 'text-amber-600'
                                : 'text-rose-600'
                          }`}
                        >
                          {Math.round(row.grossMarginRate * 100)}%
                        </div>
                        <div className="h-1.5 w-20 rounded-full bg-slate-100">
                          <div
                            className={`h-1.5 rounded-full ${
                              row.grossMarginRate >= 0.45
                                ? 'bg-emerald-500'
                                : row.grossMarginRate >= 0.35
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.round(row.grossMarginRate * 100))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${MARGIN_CLS[row.marginRisk]}`}>
                    {MARGIN_LABEL[row.marginRisk]}
                  </td>
                  <td className="px-4 py-3">
                    {row.recommendedActions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.recommendedActions.slice(0, 2).map((a) => (
                          <span
                            key={a}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
