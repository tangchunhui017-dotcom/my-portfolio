'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { REVIEW_TYPE_LABELS } from '@/config/design-review-center/labels';
import { ACTION_STATUS_MAP, REVIEW_CONCLUSION_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { ReviewActionRow } from '@/lib/design-review-center/selectors/reviews';

interface TaskPanelProps {
  actions: ReviewActionRow[];
}

type ActionFilter = 'all' | 'open' | 'dueThisWeek' | 'blocked';

function filterLabel(filter: ActionFilter) {
  if (filter === 'open') return '未关闭动作';
  if (filter === 'dueThisWeek') return '本周待复审';
  if (filter === 'blocked') return '阻塞项';
  return '全部动作';
}

export default function TaskPanel({ actions }: TaskPanelProps) {
  const [actionFilter, setActionFilter] = useState<ActionFilter>('open');

  const filteredActions = useMemo(() => {
    if (actionFilter === 'open') return actions.filter((action) => action.status !== 'closed');
    if (actionFilter === 'dueThisWeek') return actions.filter((action) => action.dueThisWeek);
    if (actionFilter === 'blocked') return actions.filter((action) => action.blocked);
    return actions;
  }, [actionFilter, actions]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">动作闭环</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">以 ActionItem 为主线，看责任人、截止时间、复审状态和是否解除阻塞。</p>
        </div>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">{filteredActions.length} 条</div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(['all', 'open', 'dueThisWeek', 'blocked'] as ActionFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActionFilter(filter)}
            className={[
              'rounded-full border px-4 py-2 text-sm font-semibold transition',
              actionFilter === filter ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
            ].join(' ')}
          >
            {filterLabel(filter)}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {filteredActions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            当前筛选条件下暂无动作闭环记录。
          </div>
        ) : (
          filteredActions.map((action) => {
            const statusMeta = ACTION_STATUS_MAP[action.status];
            const conclusionMeta = action.conclusion ? REVIEW_CONCLUSION_MAP[action.conclusion] : null;
            return (
              <article key={action.actionId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{action.actionType}</div>
                    <div className="mt-1 text-xs text-slate-500">{action.skuCode} / {action.styleName} / {action.seriesName} / {action.categoryName}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className={`rounded-full px-3 py-1 ${statusMeta.bgColor} ${statusMeta.textColor}`}>{statusMeta.label}</span>
                    {action.blocked ? <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">阻塞</span> : null}
                    {conclusionMeta ? <span className={`rounded-full px-3 py-1 ${conclusionMeta.bgColor} ${conclusionMeta.textColor}`}>{conclusionMeta.label}</span> : null}
                  </div>
                </div>

                <div className="mt-4 text-sm leading-6 text-slate-700">{action.actionDescription}</div>

                <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div><div className="text-xs text-slate-400">责任人</div><div className="mt-1 font-medium text-slate-900">{action.owner}</div></div>
                    <div><div className="text-xs text-slate-400">截止时间</div><div className="mt-1 font-medium text-slate-900">{formatDate(action.dueDate)}</div></div>
                    <div><div className="text-xs text-slate-400">完成时间</div><div className="mt-1 font-medium text-slate-900">{formatDate(action.completedAt)}</div></div>
                    <div><div className="text-xs text-slate-400">评审类型</div><div className="mt-1 font-medium text-slate-900">{action.reviewType ? REVIEW_TYPE_LABELS[action.reviewType] : '待补充'}</div></div>
                    <div><div className="text-xs text-slate-400">影响范围</div><div className="mt-1 font-medium text-slate-900">{action.impactScope}</div></div>
                    <div><div className="text-xs text-slate-400">下次评审</div><div className="mt-1 font-medium text-slate-900">{formatDate(action.nextReviewDate)}</div></div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                  <div className="flex flex-wrap gap-3">
                    {action.reapproved ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">已复审通过</span> : null}
                    {action.overdue ? <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">已逾期</span> : null}
                    {action.dueThisWeek ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">本周待复审</span> : null}
                  </div>
                  <Link href={`/design-review-center/item/${action.styleId}`} className="font-medium text-slate-700 hover:text-slate-900">
                    查看单款详情
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
