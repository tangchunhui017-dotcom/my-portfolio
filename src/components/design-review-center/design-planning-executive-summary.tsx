'use client';

import type { DesignPlanningExecutiveSummary } from '@/lib/design-review-center/types';

interface Props {
  summary: DesignPlanningExecutiveSummary;
}

const STATUS_CONFIG = {
  healthy: {
    label: '健康',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    accent: 'border-l-emerald-500',
    bg: 'from-emerald-50/60 to-white',
  },
  warning: {
    label: '预警',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    accent: 'border-l-amber-500',
    bg: 'from-amber-50/60 to-white',
  },
  high_risk: {
    label: '高风险',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    accent: 'border-l-rose-500',
    bg: 'from-rose-50/60 to-white',
  },
} as const;

const ALIGNMENT_LABEL: Record<string, string> = {
  aligned: '已承接',
  partial: '部分承接',
  unassigned: '未承接',
  deviated: '存在偏离',
};
const ALIGNMENT_COLOR: Record<string, string> = {
  aligned: 'text-emerald-600',
  partial: 'text-amber-600',
  unassigned: 'text-slate-400',
  deviated: 'text-rose-600',
};

export default function DesignPlanningExecutiveSummaryPanel({ summary }: Props) {
  const cfg = STATUS_CONFIG[summary.overallStatus];

  const items: Array<{ icon: string; label: string; value: React.ReactNode; sub?: string }> = [
    {
      icon: '⚠️',
      label: '最大风险',
      value: <span className="text-rose-700 font-medium">{summary.biggestRisk}</span>,
    },
    {
      icon: '🟢',
      label: '最大机会',
      value: <span className="text-emerald-700 font-medium">{summary.biggestOpportunity}</span>,
    },
    {
      icon: '📋',
      label: '本周必须拍板',
      value: (
        <span className="text-violet-700 font-bold text-lg">{summary.mustDecideCount}</span>
      ),
      sub: '项待决策',
    },
    {
      icon: '🔗',
      label: '商品企划输入承接',
      value: (
        <span className={`font-medium ${ALIGNMENT_COLOR[summary.merchandiseInputStatus] ?? 'text-slate-600'}`}>
          {ALIGNMENT_LABEL[summary.merchandiseInputStatus] ?? summary.merchandiseInputStatus}
        </span>
      ),
    },
    {
      icon: '🌊',
      label: '波段影响',
      value: <span className="text-slate-700">{summary.waveImpact}</span>,
    },
    {
      icon: '💡',
      label: '建议动作',
      value: <span className="text-blue-700">{summary.suggestedAction}</span>,
    },
  ];

  return (
    <section
      className={`rounded-[28px] border border-slate-200/80 bg-gradient-to-br ${cfg.bg} p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]`}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Design Planning Executive Summary
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">设计企划总览摘要</h2>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${cfg.badge}`}>
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          本季状态：{cfg.label}
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex gap-3 rounded-2xl border-l-4 bg-white/70 px-4 py-3 shadow-sm ${cfg.accent}`}
          >
            <span className="text-base leading-none mt-0.5 flex-shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</div>
              <div className="mt-1 text-sm leading-snug flex items-baseline gap-1">
                {item.value}
                {item.sub && <span className="text-xs text-slate-400">{item.sub}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
