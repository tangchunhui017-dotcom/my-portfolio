'use client';

import { useState, useMemo } from 'react';
import type { ArchitectureRiskActionItem, ArchActionStatus, ArchRiskType } from '@/lib/design-review-center/types';

interface Props {
  items: ArchitectureRiskActionItem[];
}

type StatusFilter = 'all' | ArchActionStatus;

const STATUS_FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '待处理' },
  { key: 'in_progress', label: '处理中' },
  { key: 'resolved', label: '已关闭' },
];

const ACTION_STATUS_CLS: Record<ArchActionStatus, string> = {
  open: 'border-red-200 bg-red-50 text-red-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const ACTION_STATUS_LABEL: Record<ArchActionStatus, string> = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已关闭',
};

const RISK_TYPE_LABEL: Record<ArchRiskType, string> = {
  category_gap: '品类缺口',
  price_congestion: '价格拥挤',
  insufficient_hero: 'Hero不足',
  too_many_test: '测试款过多',
  too_many_new_molds: '新模超额',
  insufficient_shared_sole: '共底不足',
  cost_overrun: '成本超标',
  brand_dna_deviation: '品牌偏离',
  unaccepted_merch_input: '企划未承接',
  wave_launch_risk: '波段风险',
};

export default function ArchRiskAction({ items }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    return statusFilter === 'all' ? items : items.filter((i) => i.actionStatus === statusFilter);
  }, [items, statusFilter]);

  const counts = useMemo(() => ({
    open: items.filter((i) => i.actionStatus === 'open').length,
    in_progress: items.filter((i) => i.actionStatus === 'in_progress').length,
    resolved: items.filter((i) => i.actionStatus === 'resolved').length,
  }), [items]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 11</span>
            <h3 className="text-base font-semibold text-slate-900">架构风险与行动中心</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">汇总架构缺口和风险项，明确负责人与完成期限</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {STATUS_FILTER_TABS.map((tab) => {
            const count = tab.key === 'all' ? items.length : counts[tab.key as ArchActionStatus] ?? 0;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${statusFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
                <span className="ml-1 text-slate-400">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {filtered.map((item) => (
          <RiskRow key={item.riskId} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">暂无符合条件的风险项</p>
        )}
      </div>
    </div>
  );
}

function RiskRow({ item }: { item: ArchitectureRiskActionItem }) {
  return (
    <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex flex-wrap items-start gap-2 mb-2">
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {RISK_TYPE_LABEL[item.riskType]}
        </span>
        <h4 className="font-semibold text-slate-900">{item.riskObject}</h4>
        <span className={`ml-auto shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${ACTION_STATUS_CLS[item.actionStatus]}`}>
          {ACTION_STATUS_LABEL[item.actionStatus]}
        </span>
      </div>

      <p className="mb-2 text-sm text-slate-700">{item.riskReason}</p>

      {item.expectedImpact && (
        <p className="mb-3 text-xs text-red-600">影响：{item.expectedImpact}</p>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
        {item.affectedWave && <span>波段：{item.affectedWave}</span>}
        {item.affectedSeries && <span>系列：{item.affectedSeries}</span>}
        {item.affectedStyleCount !== undefined && <span>影响款数：{item.affectedStyleCount}</span>}
        {item.owner && <span>负责人：{item.owner}</span>}
        {item.dueDate && <span>截止：{item.dueDate}</span>}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 flex items-start justify-between gap-3">
        <span>{item.recommendedAction}</span>
        {item.relatedRoute && (
          <a
            href={item.relatedRoute}
            className="shrink-0 text-blue-500 underline underline-offset-2 hover:text-blue-700"
          >
            查看详情 →
          </a>
        )}
      </div>
    </div>
  );
}
