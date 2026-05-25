'use client';

import { useState } from 'react';
import type {
  ArchRiskDecisionItem,
  ArchRiskDecisionStatus,
  ArchRiskType,
} from '@/lib/design-review-center/arch-derivations';

interface Props {
  items: ArchRiskDecisionItem[];
  onNavigateTab?: (tab: string) => void;
}

const STATUS_FILTERS: { key: ArchRiskDecisionStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '待决策' },
  { key: 'in_progress', label: '处理中' },
  { key: 'resolved', label: '已解决' },
];

const STATUS_CLS: Record<ArchRiskDecisionStatus, string> = {
  open: 'bg-rose-50 text-rose-700 border-rose-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_LABEL: Record<ArchRiskDecisionStatus, string> = {
  open: '待决策',
  in_progress: '处理中',
  resolved: '已解决',
};

const RISK_TYPE_COLOR: Partial<Record<ArchRiskType, string>> = {
  'SKU 缺口': 'bg-amber-100 text-amber-700',
  'Hero 款不足': 'bg-purple-100 text-purple-700',
  '成本超标': 'bg-rose-100 text-rose-700',
  '新模超预算': 'bg-rose-100 text-rose-700',
  '缺少底型': 'bg-orange-100 text-orange-700',
  '缺少楦型': 'bg-orange-100 text-orange-700',
  '缺少材料方向': 'bg-amber-100 text-amber-700',
  '波段上市风险': 'bg-blue-100 text-blue-700',
  '设计任务未生成': 'bg-slate-200 text-slate-700',
  '商品输入未承接': 'bg-amber-100 text-amber-700',
  '款位未拆解': 'bg-amber-100 text-amber-700',
  '价格带冲突': 'bg-orange-100 text-orange-700',
};

export default function ArchRiskDecisions({ items, onNavigateTab }: Props) {
  const [filter, setFilter] = useState<ArchRiskDecisionStatus | 'all'>('all');

  const visible =
    filter === 'all' ? items : items.filter((i) => i.status === filter);

  const openCount = items.filter((i) => i.status === 'open').length;

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.key === 'all'
              ? items.length
              : items.filter((i) => i.status === f.key).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
              {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
        {openCount > 0 && (
          <span className="ml-auto mr-14 text-xs text-rose-600 font-medium">
            {openCount} 项需要本期决策
          </span>
        )}
      </div>

      {/* Risk list */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-400">
          当前筛选无风险决策项
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <div
              key={item.riskId}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                item.status === 'open'
                  ? 'border-rose-200'
                  : item.status === 'in_progress'
                    ? 'border-amber-200'
                    : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start gap-3 px-4 py-3">
                {/* Left: type + desc */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        RISK_TYPE_COLOR[item.riskType] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.riskType}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CLS[item.status]}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {item.riskObject}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {item.affectedSeries && (
                      <span>系列：{item.affectedSeries}</span>
                    )}
                    {item.affectedCategory && (
                      <span>品类：{item.affectedCategory}</span>
                    )}
                    {item.affectedSlots > 0 && (
                      <span>影响 {item.affectedSlots} 款</span>
                    )}
                    {item.owner && <span>负责：{item.owner}</span>}
                    {item.dueDate && <span>截止：{item.dueDate}</span>}
                  </div>
                  {item.recommendedOption && (
                    <div className="mt-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">推荐方案：</span>
                      {item.recommendedOption}
                    </div>
                  )}
                </div>

                {/* Right: action button */}
                {item.jumpModule && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.(item.jumpModule!)}
                    className="flex-shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    跳转处理
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
