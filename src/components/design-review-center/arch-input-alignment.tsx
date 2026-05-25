'use client';

import type { ArchitectureInputAlignment, ArchAlignmentStatus } from '@/lib/design-review-center/types';

interface Props {
  items: ArchitectureInputAlignment[];
}

const STATUS_LABEL: Record<ArchAlignmentStatus, string> = {
  aligned: '已承接',
  partial: '部分承接',
  not_aligned: '未承接',
  deviated: '存在偏离',
};

const STATUS_CLS: Record<ArchAlignmentStatus, string> = {
  aligned: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-blue-200 bg-blue-50 text-blue-700',
  not_aligned: 'border-slate-200 bg-slate-100 text-slate-600',
  deviated: 'border-red-200 bg-red-50 text-red-700',
};

const RISK_CLS: Record<string, string> = {
  low: 'text-emerald-600',
  medium: 'text-amber-600',
  high: 'text-red-600',
  none: 'text-slate-400',
};

export default function ArchInputAlignment({ items }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 02</span>
          <h3 className="text-base font-semibold text-slate-900">商品企划输入承接</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">校验产品架构对各项商品企划输入的承接情况，识别偏离风险</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">输入来源</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">输入摘要</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">架构转译</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">承接状态</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap text-center">已生成款</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap text-center">未承接需求</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">偏离风险</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">推荐行动</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.inputSource} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{item.inputSource}</td>
                <td className="px-5 py-3.5 text-slate-600 min-w-[200px]">
                  <p className="leading-relaxed">{item.inputSummary}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-700 min-w-[220px]">
                  <p className="leading-relaxed">{item.architectureTranslation}</p>
                  {item.deviation && (
                    <p className="mt-1 text-xs text-red-600">偏离：{item.deviation}</p>
                  )}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLS[item.alignmentStatus]}`}>
                    {STATUS_LABEL[item.alignmentStatus]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center font-mono text-slate-700">{item.generatedStyleCount}</td>
                <td className="px-5 py-3.5 text-center">
                  {item.unassignedRequirementCount > 0 ? (
                    <span className="font-mono font-bold text-red-600">{item.unassignedRequirementCount}</span>
                  ) : (
                    <span className="text-emerald-500">✓</span>
                  )}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className={`text-xs font-bold ${RISK_CLS[item.deviationRisk]}`}>
                    {{ low: '低', medium: '中', high: '高', none: '—' }[item.deviationRisk]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600 min-w-[220px]">
                  <p className="text-xs leading-relaxed">{item.recommendedAction}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
