'use client';

import type { ThemeSeriesResourceAllocation } from '@/lib/design-review-center/types';

interface ThemeResourceAllocationProps {
  rows: ThemeSeriesResourceAllocation[];
}

const riskMeta: Record<'low' | 'medium' | 'high', { dot: string; text: string; bg: string }> = {
  low: { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  medium: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
  high: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

const priorityMeta: Record<'high' | 'medium' | 'low', { label: string; bg: string; text: string }> = {
  high: { label: '高优', bg: 'bg-red-50', text: 'text-red-600' },
  medium: { label: '中等', bg: 'bg-amber-50', text: 'text-amber-600' },
  low: { label: '低优', bg: 'bg-slate-50', text: 'text-slate-500' },
};

export default function ThemeResourceAllocation({ rows }: ThemeResourceAllocationProps) {
  const totalNewMolds = rows.reduce((s, r) => s + r.newMoldCount, 0);
  const highRiskCount = rows.filter((r) => r.riskLevel === 'high').length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">资源分配</div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">款数·新模·共底楦·OTB约束</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1">
            新模合计 {totalNewMolds} 副
          </span>
          {highRiskCount > 0 && (
            <span className="rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1">
              {highRiskCount} 个系列高风险
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">系列</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">波段</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">目标款数</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Hero</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Core</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">测试</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">新模</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">共楦率</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">共底率</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">OTB 约束</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">风险</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">优先级</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">约束判断</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">建议动作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const rm = riskMeta[row.riskLevel];
              const pm = priorityMeta[row.developmentPriority];
              const constraintLabel = row.riskLevel === 'high'
                ? '超预算 / 需决策'
                : row.newMoldCount > 2
                  ? '新模偏多'
                  : row.riskLevel === 'medium'
                    ? '需跟踪'
                    : '可推进';

              return (
                <tr key={row.seriesId} className={`hover:bg-slate-50/60 transition-colors ${row.riskLevel === 'high' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 text-sm">{row.seriesName}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{row.costBand}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{row.waveId}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-black text-slate-900">{row.targetSkuCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">{row.heroStyleCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{row.coreStyleCount}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{row.testStyleCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.newMoldCount > 2 ? 'bg-red-50 text-red-700' : row.newMoldCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {row.newMoldCount} 副
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${row.sharedLastRate >= 0.7 ? 'text-emerald-600' : row.sharedLastRate >= 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                      {Math.round(row.sharedLastRate * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${row.sharedSoleRate >= 0.7 ? 'text-emerald-600' : row.sharedSoleRate >= 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                      {Math.round(row.sharedSoleRate * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{row.otbConstraint}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`flex items-center justify-center gap-1 text-xs font-bold ${rm.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${rm.dot}`} />
                      {row.riskLevel === 'high' ? '高' : row.riskLevel === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pm.bg} ${pm.text}`}>{pm.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${row.riskLevel === 'high' ? 'bg-red-50 text-red-700' : row.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {constraintLabel}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-700">{row.recommendedAction}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom: Recommended Actions for high risk items */}
      {rows.filter((r) => r.riskLevel !== 'low').length > 0 && (
        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50 space-y-2">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">需关注行动</div>
          {rows
            .filter((r) => r.riskLevel !== 'low')
            .map((r) => (
              <div key={r.seriesId} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${r.riskLevel === 'high' ? 'border-red-100 bg-red-50 text-red-900' : 'border-amber-100 bg-amber-50 text-amber-900'}`}>
                <span className={`flex-shrink-0 font-black ${r.riskLevel === 'high' ? 'text-red-600' : 'text-amber-600'}`}>{r.seriesName}:</span>
                <span className="font-medium">{r.recommendedAction}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
