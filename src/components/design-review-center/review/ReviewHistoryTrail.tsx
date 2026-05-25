'use client';

import { useMemo, useState } from 'react';
import type { ReviewDecisionRow } from '@/lib/design-review-center/selectors/reviews';
import { buildHistoryTrail } from '@/lib/design-review-center/review-decision-derivations';
import { REVIEW_TYPE_LABELS } from '@/config/design-review-center/labels';
import { REVIEW_CONCLUSION_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';

interface ReviewHistoryTrailProps {
  reviews: ReviewDecisionRow[];
}

const CONCLUSION_DOT: Record<string, string> = {
  pass:              'bg-emerald-500',
  pass_with_changes: 'bg-cyan-500',
  cost_down:         'bg-amber-500',
  structure_adjust:  'bg-violet-500',
  material_rework:   'bg-teal-500',
  next_round:        'bg-blue-500',
  hold:              'bg-slate-400',
  cancel:            'bg-rose-500',
};

export default function ReviewHistoryTrail({ reviews }: ReviewHistoryTrailProps) {
  const trail = useMemo(() => buildHistoryTrail(reviews), [reviews]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(() => trail[0]?.styleId ?? '');

  const selected = trail.find((t) => t.styleId === selectedStyleId);

  if (trail.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
        暂无评审记录
      </div>
    );
  }

  return (
    <div>
      {/* Style selector */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label htmlFor="trail-style-select" className="text-xs font-medium text-slate-500">
          选择款式
        </label>
        <select
          id="trail-style-select"
          value={selectedStyleId}
          onChange={(e) => setSelectedStyleId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
        >
          {trail.map((t) => (
            <option key={t.styleId} value={t.styleId}>
              {t.skuCode} {t.styleName}（{t.rounds.length} 轮）
            </option>
          ))}
        </select>
        {selected && (
          <span className="text-xs text-slate-400">
            {selected.seriesName} · {selected.waveId.toUpperCase()} · 共 {selected.rounds.length} 轮评审
          </span>
        )}
        {selected && selected.rounds.length > 1 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            多轮评审 · 注意方向一致性
          </span>
        )}
      </div>

      {/* Timeline */}
      {selected && (
        <div className="relative ml-3 border-l-2 border-slate-200 pl-1">
          <ol className="space-y-5 pb-2">
            {selected.rounds.map((round, idx) => {
              const isLatest = idx === selected.rounds.length - 1;
              const dotColor = round.blocked
                ? 'bg-rose-500'
                : CONCLUSION_DOT[round.conclusion] ?? 'bg-slate-300';
              const conclusionMeta = REVIEW_CONCLUSION_MAP[round.conclusion];
              const reviewLabel = REVIEW_TYPE_LABELS[round.reviewType as keyof typeof REVIEW_TYPE_LABELS] ?? round.reviewType;

              return (
                <li key={round.reviewId} className="relative pl-6">
                  {/* Dot */}
                  <span
                    className={[
                      'absolute -left-[9px] top-1.5 size-4 rounded-full border-2 border-white',
                      dotColor,
                      isLatest ? 'ring-2 ring-offset-1 ring-slate-300' : '',
                    ].join(' ')}
                  />

                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-600">第 {round.roundNumber} 轮</span>
                        <span>·</span>
                        <span>{reviewLabel}</span>
                        <span>·</span>
                        <span>{formatDate(round.reviewDate)}</span>
                        {isLatest && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            最新
                          </span>
                        )}
                      </div>
                      {conclusionMeta ? (
                        <span className={['rounded-full px-2.5 py-0.5 text-xs font-semibold', conclusionMeta.bgColor, conclusionMeta.textColor].join(' ')}>
                          {conclusionMeta.label}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {round.conclusion}
                        </span>
                      )}
                    </div>

                    {/* Issue description */}
                    {round.issueDescription && (
                      <div className="mt-2 text-xs leading-5 text-slate-700">
                        {round.issueDescription}
                      </div>
                    )}

                    {/* Change request */}
                    {round.changeRequest && (
                      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span className="font-semibold">必改项：</span>
                        {round.changeRequest}
                      </div>
                    )}

                    {/* Blocked notice */}
                    {round.blocked && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                        ⚠️ 本轮处于阻塞状态
                      </div>
                    )}

                    {/* Participants */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {round.participants.map((p) => (
                        <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {p}
                        </span>
                      ))}
                      <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                        决策人：{round.owner}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
