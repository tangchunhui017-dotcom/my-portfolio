'use client';

import { useState, useMemo } from 'react';
import type { StyleCardReviewItem, ArchRiskLevel, StyleDecisionStatus, ArchViewMode } from '@/lib/design-review-center/types';

interface Props {
  items: StyleCardReviewItem[];
  viewMode?: ArchViewMode;
}

type FilterTab = ArchViewMode;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'hero', label: 'Hero款' },
  { key: 'high_risk', label: '高风险' },
  { key: 'pending_review', label: '待评审' },
  { key: 'over_cost', label: '成本超标' },
  { key: 'unassigned_otb', label: 'OTB未承接' },
  { key: 'gap_fill', label: '缺口补位' },
  { key: 'pending_task', label: '待生成任务' },
];

const DECISION_CLS: Record<StyleDecisionStatus, string> = {
  push_forward: 'bg-emerald-500 text-white',
  needs_adjustment: 'bg-amber-500 text-white',
  small_batch: 'bg-blue-500 text-white',
  merge: 'bg-violet-500 text-white',
  cancel: 'bg-red-500 text-white',
  submit_review: 'bg-indigo-500 text-white',
  generate_task: 'bg-teal-500 text-white',
};

const DECISION_LABEL: Record<StyleDecisionStatus, string> = {
  push_forward: '推进',
  needs_adjustment: '需调整',
  small_batch: '小批量',
  merge: '合并',
  cancel: '取消',
  submit_review: '提交评审',
  generate_task: '生成任务',
};

const RISK_CLS: Record<ArchRiskLevel, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  high_risk: 'border-red-200 bg-red-50 text-red-700',
};

const FIT_DOT: Record<string, string> = {
  high: 'bg-emerald-400',
  medium: 'bg-amber-400',
  low: 'bg-red-400',
  warning: 'bg-amber-400',
};

export default function ArchStyleCardReview({ items, viewMode }: Props) {
  const [localFilter, setLocalFilter] = useState<FilterTab>('all');
  // workbench-level viewMode takes priority; local tabs work when viewMode is not set
  const activeFilter: FilterTab = viewMode ?? localFilter;

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'hero':            return items.filter((i) => i.isHero);
      case 'high_risk':       return items.filter((i) => i.riskLevel === 'high_risk');
      case 'pending_review':  return items.filter((i) => i.reviewStatus === 'pending' || i.reviewStatus === 'in_progress');
      case 'over_cost':       return items.filter((i) => i.costRisk === 'high_risk');
      case 'unassigned_otb':  return items.filter((i) => i.otbFit === 'low');
      case 'gap_fill':        return items.filter((i) => i.isGapFill);
      case 'pending_task':    return items.filter((i) => i.isPendingTask);
      default:                return items;
    }
  }, [items, activeFilter]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 09</span>
            <h3 className="text-base font-semibold text-slate-900">款式卡片评审</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">对每款进行架构、品牌、消费者、趋势及成本适配度综合评估</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {FILTER_TABS.map((tab) => {
            let count = 0;
            if (tab.key === 'all') count = items.length;
            else if (tab.key === 'hero') count = items.filter((i) => i.isHero).length;
            else if (tab.key === 'high_risk') count = items.filter((i) => i.riskLevel === 'high_risk').length;
            else if (tab.key === 'pending_review') count = items.filter((i) => i.reviewStatus === 'pending' || i.reviewStatus === 'in_progress').length;
            else if (tab.key === 'over_cost') count = items.filter((i) => i.costRisk === 'high_risk').length;
            else if (tab.key === 'unassigned_otb') count = items.filter((i) => i.otbFit === 'low').length;
            else if (tab.key === 'gap_fill') count = items.filter((i) => i.isGapFill).length;
            else if (tab.key === 'pending_task') count = items.filter((i) => i.isPendingTask).length;
            return (
              <button
                key={tab.key}
                onClick={() => setLocalFilter(tab.key)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-slate-400">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <StyleCard key={item.styleId} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-slate-400">暂无符合条件的款式</p>
        )}
      </div>
    </div>
  );
}

function StyleCard({ item }: { item: StyleCardReviewItem }) {
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${RISK_CLS[item.riskLevel]}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {item.isHero && (
              <span className="rounded bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">HERO</span>
            )}
            {item.isGapFill && (
              <span className="rounded bg-blue-100 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">缺口补位</span>
            )}
          </div>
          <p className="font-semibold text-slate-900 leading-tight">{item.styleName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{item.waveName} · {item.priceBand}</p>
        </div>
        {item.decisionStatus && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${DECISION_CLS[item.decisionStatus]}`}>
            {DECISION_LABEL[item.decisionStatus]}
          </span>
        )}
      </div>

      {/* Fit scores */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">适配度评估</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '架构', value: item.architectureFit },
            { label: '品牌', value: item.brandFit },
            { label: '消费者', value: item.consumerFit },
            { label: '趋势', value: item.trendFit },
            { label: 'OTB', value: item.otbFit },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1 text-xs text-slate-600">
              <span className={`h-2 w-2 rounded-full ${FIT_DOT[value] ?? 'bg-slate-300'}`} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Risk tags */}
      <div className="flex flex-wrap gap-1.5">
        {item.costRisk !== 'healthy' && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.costRisk === 'high_risk' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            成本{item.costRisk === 'high_risk' ? '高风险' : '预警'}
          </span>
        )}
        {item.launchRisk !== 'healthy' && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.launchRisk === 'high_risk' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            上市{item.launchRisk === 'high_risk' ? '高风险' : '预警'}
          </span>
        )}
        {item.riskReason && (
          <span className="text-[11px] text-slate-500 leading-relaxed">{item.riskReason}</span>
        )}
      </div>

      {/* Decision reason */}
      {item.decisionReason && (
        <p className="border-t border-white/60 pt-2 text-[11px] text-slate-600 leading-relaxed">
          {item.decisionReason}
        </p>
      )}
    </div>
  );
}
