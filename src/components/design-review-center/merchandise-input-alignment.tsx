'use client';

import { useState } from 'react';
import type { MerchandiseInputAlignment } from '@/lib/design-review-center/types';

interface Props {
  alignments: MerchandiseInputAlignment[];
}

const ALIGNMENT_CONFIG: Record<
  MerchandiseInputAlignment['alignmentStatus'],
  { label: string; badge: string; row: string }
> = {
  aligned: {
    label: '已承接',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    row: 'border-l-emerald-400',
  },
  partial: {
    label: '部分承接',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    row: 'border-l-amber-400',
  },
  unassigned: {
    label: '未承接',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    row: 'border-l-slate-300',
  },
  deviated: {
    label: '存在偏离',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    row: 'border-l-rose-400',
  },
};

const RISK_CONFIG: Record<
  MerchandiseInputAlignment['deviationRisk'],
  { label: string; color: string }
> = {
  none: { label: '无风险', color: 'text-emerald-600' },
  low: { label: '低风险', color: 'text-slate-500' },
  medium: { label: '中风险', color: 'text-amber-600' },
  high: { label: '高风险', color: 'text-rose-600' },
};

function AlignmentRow({ item }: { item: MerchandiseInputAlignment }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = ALIGNMENT_CONFIG[item.alignmentStatus];
  const riskCfg = RISK_CONFIG[item.deviationRisk];

  return (
    <div className={`rounded-2xl border-l-4 bg-white border border-slate-200/70 shadow-sm ${statusCfg.row}`}>
      <button
        type="button"
        className="w-full text-left px-4 py-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Source module */}
          <span className="font-semibold text-sm text-slate-900 min-w-[80px]">{item.sourceModule}</span>
          <span className="text-xs text-slate-400">{item.inputType}</span>

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {/* Generated tasks */}
            <span className="text-xs text-slate-500">
              已生成 <strong className="text-slate-800">{item.generatedTaskCount}</strong> 个任务
            </span>
            {item.unassignedInputCount > 0 && (
              <span className="text-xs text-rose-600 font-medium">
                未承接 {item.unassignedInputCount} 项
              </span>
            )}
            {/* Risk */}
            <span className={`text-xs font-medium ${riskCfg.color}`}>{riskCfg.label}</span>
            {/* Status badge */}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>
            {/* Chevron */}
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-600 leading-relaxed">{item.inputSummary}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={item.relatedRoute}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
            >
              {item.recommendedAction} ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MerchandiseInputAlignmentPanel({ alignments }: Props) {
  const totalUnassigned = alignments.reduce((s, a) => s + a.unassignedInputCount, 0);
  const alignedCount = alignments.filter((a) => a.alignmentStatus === 'aligned').length;
  const deviatedCount = alignments.filter(
    (a) => a.alignmentStatus === 'deviated' || a.alignmentStatus === 'unassigned',
  ).length;

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Merchandise Input Alignment
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">商品企划输入承接</h2>
          <p className="mt-1 text-xs text-slate-400">
            设计企划对商品企划 6 类输入的承接与偏离状态
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            已承接 {alignedCount} 项
          </span>
          {totalUnassigned > 0 && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              待承接 {totalUnassigned} 个输入
            </span>
          )}
          {deviatedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              偏离风险 {deviatedCount} 项
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {alignments.map((item) => (
          <AlignmentRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
