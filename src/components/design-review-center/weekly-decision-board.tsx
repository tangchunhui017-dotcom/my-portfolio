'use client';

import { useState } from 'react';
import type { WeeklyDecisionItem } from '@/lib/design-review-center/types';
import { formatDate } from '@/lib/design-review-center/helpers/date';

interface Props {
  items: WeeklyDecisionItem[];
  mustDecideItems?: Array<{ styleId: string; title: string; owner: string; dueDate: string; reason: string }>;
}

const DECISION_TYPE_LABEL: Record<WeeklyDecisionItem['decisionType'], string> = {
  design_direction: '设计方向',
  material: '材料确认',
  colorway: '配色确认',
  outsole: '鞋底确认',
  bom: 'BOM 确认',
  cost: '成本确认',
  cut_style: '是否砍款',
  delay: '是否延期',
  gate_entry: '进入节点评审',
};

const DECISION_TYPE_COLOR: Record<WeeklyDecisionItem['decisionType'], string> = {
  design_direction: 'bg-violet-100 text-violet-700',
  material: 'bg-blue-100 text-blue-700',
  colorway: 'bg-purple-100 text-purple-700',
  outsole: 'bg-slate-100 text-slate-600',
  bom: 'bg-amber-100 text-amber-700',
  cost: 'bg-amber-100 text-amber-700',
  cut_style: 'bg-rose-100 text-rose-700',
  delay: 'bg-orange-100 text-orange-700',
  gate_entry: 'bg-emerald-100 text-emerald-700',
};

const ACTION_STATUS_CONFIG: Record<
  WeeklyDecisionItem['actionStatus'],
  { label: string; badge: string }
> = {
  open: { label: '待拍板', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
  decided: { label: '已决策', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  escalated: { label: '已升级', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function DecisionCard({ item }: { item: WeeklyDecisionItem }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = ACTION_STATUS_CONFIG[item.actionStatus];

  return (
    <div className="rounded-lg border border-slate-200/75 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full text-left px-4 py-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DECISION_TYPE_COLOR[item.decisionType]}`}>
                {DECISION_TYPE_LABEL[item.decisionType]}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-900">{item.decisionObject}</div>
            <div className="text-xs text-slate-500 mt-1 leading-4">{item.currentProblem}</div>
          </div>
          <div className="flex-shrink-0 flex items-start gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-slate-400">截止</div>
              <div className="text-xs font-semibold text-slate-700">{formatDate(item.dueDate)}</div>
              <div className="text-[11px] text-slate-400 mt-1">{item.owner}</div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`}
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
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3 text-xs">
          {/* Options */}
          <div>
            <span className="font-semibold text-slate-500 block mb-2">可选方案</span>
            <div className="space-y-1.5">
              {item.options.map((opt, i) => (
                <div
                  key={opt}
                  className={`flex gap-2 rounded-xl px-3 py-2 ${
                    opt === item.recommendedOption
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="font-bold flex-shrink-0 text-slate-400">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span>{opt}</span>
                  {opt === item.recommendedOption && (
                    <span className="ml-auto flex-shrink-0 text-emerald-600 font-semibold">推荐</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Impact scope */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-amber-700">
            <span className="font-semibold">影响范围：</span>
            {item.affectedScope}
          </div>
          <div className="text-slate-400 sm:hidden">
            责任人 {item.owner} / 截止 {formatDate(item.dueDate)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyDecisionBoard({ items, mustDecideItems = [] }: Props) {
  const openItems = items.filter((i) => i.actionStatus !== 'decided');
  const totalCount = items.length + mustDecideItems.length;
  const openTotal = openItems.length + mustDecideItems.length;

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
            Weekly Decision Board
          </div>
          <h2 className="text-xl font-bold text-slate-900">本周拍板事项</h2>
          <p className="mt-1 text-xs text-slate-400">
            {totalCount} 项待决策 · {openTotal} 项未处理
          </p>
        </div>
        {openTotal > 0 && (
          <span className="flex-shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
            {openTotal} 项待拍板
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {items.length === 0 && mustDecideItems.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-400 text-center">
            本周无需拍板事项，开发节奏可按计划推进。
          </div>
        ) : (
          <>
            {/* Structured decision items */}
            {items.map((item) => (
              <DecisionCard key={item.decisionId} item={item} />
            ))}
            {/* Must-decide items from filtered overview data */}
            {mustDecideItems.length > 0 && (
              <div className="space-y-2">
                {mustDecideItems.map((item) => (
                  <div
                    key={item.styleId}
                    className="rounded-lg border border-slate-200/75 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4"
                  >
                    <div className="font-semibold text-sm text-slate-900">{item.title}</div>
                    <div className="mt-1.5 text-xs text-slate-600 leading-5">{item.reason}</div>
                    <div className="mt-2 text-[11px] text-slate-400">
                      负责人 {item.owner} / 截止 {formatDate(item.dueDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
