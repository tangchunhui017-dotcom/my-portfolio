'use client';

import { useState } from 'react';
import type { MerchandisingInputAlignment } from '@/lib/design-review-center/types';

interface ThemeMerchInputProps {
  inputs: MerchandisingInputAlignment[];
}

const alignmentMeta: Record<
  MerchandisingInputAlignment['alignmentStatus'],
  { label: string; bg: string; text: string; dot: string }
> = {
  aligned: { label: '已承接', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  partial: { label: '部分承接', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  not_aligned: { label: '未承接', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  deviated: { label: '偏差 ⚠', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function ThemeMerchInput({ inputs }: ThemeMerchInputProps) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_ROWS = 5;
  const visibleInputs = expanded ? inputs : inputs.slice(0, INITIAL_ROWS);
  const hasMore = inputs.length > INITIAL_ROWS;
  const deviatedCount = inputs.filter((i) => i.alignmentStatus === 'deviated').length;
  const alignedCount = inputs.filter((i) => i.alignmentStatus === 'aligned').length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">上游输入承接矩阵</div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">企划输入是否已转化为设计要求</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {alignedCount} 已承接
          </span>
          {deviatedCount > 0 && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              {deviatedCount} 存在偏差
            </span>
          )}
        </div>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[110px]">输入来源</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[160px]">核心结论</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[160px]">对设计的要求</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[130px]">对系列/SKU影响</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">对齐状态</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[130px]">风险/偏差</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[160px]">下一动作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleInputs.map((input) => {
              const am = alignmentMeta[input.alignmentStatus];
              const isDeviated = input.alignmentStatus === 'deviated' || input.deviationRisk === 'high';
              return (
                <tr
                  key={input.inputSource}
                  className={`hover:bg-slate-50/60 transition-colors ${isDeviated ? 'bg-red-50/20' : ''}`}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-black text-slate-900 text-xs leading-snug">{input.inputSource}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      {(input as { coreConclusion?: string }).coreConclusion ?? input.inputSummary}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-medium text-blue-800 leading-relaxed">
                      {(input as { designRequirement?: string }).designRequirement ?? input.designTranslation}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      {(input as { skuImpact?: string }).skuImpact ?? `${input.generatedSeriesCount} 系列 / ${input.generatedTaskCount} 任务`}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${am.bg} ${am.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${am.dot}`} />
                      {am.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {(input as { deviation?: string }).deviation ? (
                      <p className={`text-xs font-semibold leading-relaxed ${isDeviated ? 'text-red-700' : 'text-amber-700'}`}>
                        {(input as { deviation?: string }).deviation}
                      </p>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">无明显偏差</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className={`text-xs font-semibold leading-relaxed ${isDeviated ? 'text-red-800' : 'text-slate-700'}`}>
                      {(input as { nextAction?: string }).nextAction ?? input.recommendedAction}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expand / Collapse toggle */}
      {hasMore && (
        <div className="border-t border-slate-100 px-6 py-3 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            {expanded ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                收起，仅显前 {INITIAL_ROWS} 条
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                展开全部 {inputs.length} 条输入
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
