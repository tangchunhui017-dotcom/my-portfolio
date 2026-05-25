'use client';

import type { DesignLanguageRow } from '@/lib/design-review-center/types';

interface ThemeDesignLanguageProps {
  rows: DesignLanguageRow[];
}

const COLUMNS: { key: keyof DesignLanguageRow; label: string; sub: string; minW: string }[] = [
  { key: 'silhouette', label: '轮廓', sub: 'Silhouette', minW: 'min-w-[140px]' },
  { key: 'lastType', label: '楦型', sub: 'Last', minW: 'min-w-[120px]' },
  { key: 'outsole', label: '鞋底', sub: 'Outsole', minW: 'min-w-[130px]' },
  { key: 'material', label: '材料', sub: 'Material', minW: 'min-w-[140px]' },
  { key: 'color', label: '色彩', sub: 'Color', minW: 'min-w-[120px]' },
  { key: 'craft', label: '工艺', sub: 'Craft', minW: 'min-w-[130px]' },
  { key: 'functionalHighlight', label: '功能卖点', sub: 'Function', minW: 'min-w-[130px]' },
  { key: 'forbidden', label: '禁止事项', sub: 'Forbidden', minW: 'min-w-[120px]' },
  { key: 'benchmark', label: '参考竞品', sub: 'Benchmark', minW: 'min-w-[130px]' },
];

export default function ThemeDesignLanguage({ rows }: ThemeDesignLanguageProps) {
  const briefCount = rows.filter((r) => r.hasBrief).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">设计语言拆解矩阵</div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">每个系列的设计执行标准</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {briefCount} 个系列已进入 Brief
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
            {rows.length - briefCount} 个系列 Brief 待生成
          </span>
        </div>
      </div>

      {/* Note */}
      <div className="border-b border-slate-100 bg-amber-50/60 px-6 py-2.5">
        <p className="text-xs font-medium text-amber-800">
          <span className="font-bold">使用说明：</span>
          此矩阵是设计师出图的执行依据。每行代表一个系列的设计边界，
          <span className="font-bold text-red-600"> 禁止事项</span> 优先级高于所有创意判断。
          设计稿须与此矩阵校对后方可进入评审。
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[1200px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="sticky left-0 z-10 bg-slate-50/80 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[100px] border-r border-slate-100">
                系列
              </th>
              {COLUMNS.map((col) => (
                <th key={col.key} className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 ${col.minW}`}>
                  {col.label}
                  <span className="ml-1 font-normal text-slate-300">{col.sub}</span>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Brief</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">影响款</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.seriesId} className="group hover:bg-slate-50/60 transition-colors align-top">
                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/60 px-4 py-3.5 border-r border-slate-100">
                  <div className="font-black text-slate-900 text-sm whitespace-nowrap">{row.seriesName}</div>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-slate-600 leading-relaxed">{row.silhouette}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-slate-600 leading-relaxed">{row.lastType}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-slate-600 leading-relaxed">{row.outsole}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-slate-600 leading-relaxed">{row.material}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-slate-600 leading-relaxed">{row.color}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-slate-600 leading-relaxed">{row.craft}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-emerald-700 font-semibold leading-relaxed">{row.functionalHighlight}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-red-700 font-semibold leading-relaxed">{row.forbidden}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-indigo-700 font-semibold leading-relaxed">{row.benchmark}</p>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {row.hasBrief ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      已生成
                    </span>
                  ) : (
                    <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      生成 Brief
                    </button>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="font-black text-slate-900">{row.affectedSkuCount}</span>
                  <span className="text-[10px] text-slate-400 ml-0.5">款</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">
          <span className="text-red-500 font-bold">禁止事项</span> 由设计总监确认后不可单方面修改，须发起变更评审
        </p>
        <button className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          导出设计语言矩阵
        </button>
      </div>
    </div>
  );
}
