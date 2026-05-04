'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { REVIEW_TYPE_LABELS } from '@/config/design-review-center/labels';
import { ACTION_STATUS_MAP, REVIEW_CONCLUSION_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { ReviewDecisionRow } from '@/lib/design-review-center/selectors/reviews';

interface RiskPanelProps {
  reviews: ReviewDecisionRow[];
}

type ReviewFilter = 'all' | 'open' | 'dueThisWeek' | 'blocked';

function filterLabel(filter: ReviewFilter) {
  if (filter === 'open') return '未关闭评审';
  if (filter === 'dueThisWeek') return '本周待复审';
  if (filter === 'blocked') return '阻塞项';
  return '全部评审';
}

export default function RiskPanel({ reviews }: RiskPanelProps) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('open');

  const filteredReviews = useMemo(() => {
    if (reviewFilter === 'open') return reviews.filter((review) => !review.closed);
    if (reviewFilter === 'dueThisWeek') return reviews.filter((review) => review.dueThisWeek);
    if (reviewFilter === 'blocked') return reviews.filter((review) => review.blocked);
    return reviews;
  }, [reviewFilter, reviews]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">评审决议</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">以 ReviewRecord 为主线，看结论、问题、修改要求、影响范围和动作状态。</p>
        </div>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">{filteredReviews.length} 条</div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(['all', 'open', 'dueThisWeek', 'blocked'] as ReviewFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setReviewFilter(filter)}
            className={[
              'rounded-full border px-4 py-2 text-sm font-semibold transition',
              reviewFilter === filter ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
            ].join(' ')}
          >
            {filterLabel(filter)}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            当前筛选条件下暂无评审决议记录。
          </div>
        ) : (
          filteredReviews.map((review) => {
            const conclusionMeta = REVIEW_CONCLUSION_MAP[review.conclusion];
            return (
              <article key={review.reviewId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link href={`/design-review-center/item/${review.styleId}`} className="text-base font-semibold text-slate-900 hover:text-slate-700">
                      {review.styleName}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">{review.skuCode} / {review.seriesName} / {review.categoryName} / {review.waveId.toUpperCase()}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className={`rounded-full px-3 py-1 ${conclusionMeta.bgColor} ${conclusionMeta.textColor}`}>{conclusionMeta.label}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-600">{REVIEW_TYPE_LABELS[review.reviewType]}</span>
                    {review.blocked ? <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">阻塞</span> : null}
                    {review.closed ? <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">已关闭</span> : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-400">问题描述</div>
                    <div className="mt-1 leading-6 text-slate-900">{review.issueDescription}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">修改要求</div>
                    <div className="mt-1 leading-6 text-slate-900">{review.changeRequest}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div><div className="text-xs text-slate-400">评审日期</div><div className="mt-1 font-medium text-slate-900">{formatDate(review.reviewDate)}</div></div>
                    <div><div className="text-xs text-slate-400">截止日期</div><div className="mt-1 font-medium text-slate-900">{formatDate(review.dueDate)}</div></div>
                    <div><div className="text-xs text-slate-400">下次评审</div><div className="mt-1 font-medium text-slate-900">{formatDate(review.nextReviewDate)}</div></div>
                    <div><div className="text-xs text-slate-400">责任人</div><div className="mt-1 font-medium text-slate-900">{review.owner}</div></div>
                    <div><div className="text-xs text-slate-400">影响范围</div><div className="mt-1 font-medium text-slate-900">{review.impactScope}</div></div>
                    <div>
                      <div className="text-xs text-slate-400">动作状态</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {review.actionStatuses.length ? review.actionStatuses.map((status, index) => (
                          <span key={`${review.reviewId}-${status}-${index}`} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_STATUS_MAP[status].bgColor} ${ACTION_STATUS_MAP[status].textColor}`}>
                            {ACTION_STATUS_MAP[status].label}
                          </span>
                        )) : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">无动作</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
