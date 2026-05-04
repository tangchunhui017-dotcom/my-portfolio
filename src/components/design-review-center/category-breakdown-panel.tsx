'use client';

import { useMemo, useState } from 'react';
import DesignItemTable from '@/components/design-review-center/design-item-table';
import { DEVELOPMENT_LEVEL_LABELS } from '@/config/design-review-center/labels';
import { REVIEW_CONCLUSION_MAP, RISK_LEVEL_MAP, STAGE_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { StyleTaskRow } from '@/lib/design-review-center/types';

interface CategoryBreakdownPanelProps {
  rows: StyleTaskRow[];
}

type ViewMode = 'table' | 'card';
type FocusMode = 'all' | 'highRisk' | 'pendingReview' | 'dueSoon';

function focusLabel(mode: FocusMode) {
  if (mode === 'highRisk') return '高风险';
  if (mode === 'pendingReview') return '待评审';
  if (mode === 'dueSoon') return '即将到期';
  return '全部单款';
}

export default function CategoryBreakdownPanel({ rows }: CategoryBreakdownPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [focusMode, setFocusMode] = useState<FocusMode>('all');

  const filteredRows = useMemo(() => {
    if (focusMode === 'highRisk') {
      return rows.filter((row) => row.riskLevel === 'high' || row.riskLevel === 'blocking' || row.blocked);
    }

    if (focusMode === 'pendingReview') {
      return rows.filter((row) => row.pendingReview);
    }

    if (focusMode === 'dueSoon') {
      return rows.filter((row) => row.overdue || row.dueThisWeek);
    }

    return rows;
  }, [focusMode, rows]);

  const overdueCount = rows.filter((row) => row.overdue || row.dueThisWeek).length;
  const pendingReviewCount = rows.filter((row) => row.pendingReview).length;
  const blockedCount = rows.filter((row) => row.blocked).length;
  const architectureLinkedCount = rows.filter((row) => row.architectureSource).length;

  if (!rows.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无开发任务池内容。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Style Task Pool</div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">围绕单款推进设计、样鞋、材料、成本和技术闭环</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              这里不再按模块拆数据，而是以单款为中心，统一看到当前阶段、五项状态、风险、动作和下一次评审节点，同时承接 OTB 转译后的品类目标与平台策略。
            </p>
          </div>
          <div className="inline-flex rounded-[20px] border border-slate-200/80 bg-slate-50/90 p-1 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            {(['table', 'card'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={[
                  'rounded-xl px-4 py-2 text-sm font-semibold transition',
                  viewMode === mode ? 'bg-[var(--brand-50)] text-[var(--brand-600)] shadow-[0_8px_18px_rgba(242,78,123,0.12)]' : 'text-slate-500 hover:text-slate-900',
                ].join(' ')}
              >
                {mode === 'table' ? '表格视图' : '卡片视图'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
            <div className="text-sm text-slate-500">当前在研</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{rows.length}</div>
            <div className="mt-2 text-xs text-slate-500">当前筛选范围内的单款推进数</div>
          </article>
          <article className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
            <div className="text-sm text-slate-500">待评审</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{pendingReviewCount}</div>
            <div className="mt-2 text-xs text-slate-500">本轮还有评审或复审动作未关闭</div>
          </article>
          <article className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
            <div className="text-sm text-slate-500">阻塞款</div>
            <div className="mt-3 text-3xl font-semibold text-rose-600">{blockedCount}</div>
            <div className="mt-2 text-xs text-slate-500">材料、工厂、技术或底台存在硬阻塞</div>
          </article>
          <article className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
            <div className="text-sm text-slate-500">即将到期</div>
            <div className="mt-3 text-3xl font-semibold text-amber-600">{overdueCount}</div>
            <div className="mt-2 text-xs text-slate-500">已逾期或本周需要推进的单款</div>
          </article>
          <article className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
            <div className="text-sm text-slate-500">承接架构</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-700">{architectureLinkedCount}</div>
            <div className="mt-2 text-xs text-slate-500">已挂到 OTB 转译架构主线的单款</div>
          </article>
        </div>
      </section>

      <section className="space-y-4 rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'highRisk', 'pendingReview', 'dueSoon'] as FocusMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFocusMode(mode)}
                className={[
                  'rounded-full border px-4 py-2 text-sm font-semibold transition',
                  focusMode === mode ? 'border-[var(--brand-300)] bg-[var(--brand-50)] text-[var(--brand-600)] shadow-[0_8px_18px_rgba(242,78,123,0.12)]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')}
              >
                {focusLabel(mode)}
              </button>
            ))}
          </div>
          <div className="rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">{filteredRows.length} 款</div>
        </div>

        {viewMode === 'table' ? (
          <DesignItemTable rows={filteredRows} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((row) => {
              const stageMeta = STAGE_MAP[row.currentStage];
              const riskMeta = RISK_LEVEL_MAP[row.riskLevel];
              const reviewMeta = row.latestReview ? REVIEW_CONCLUSION_MAP[row.latestReview.conclusion] : null;

              return (
                <article key={row.styleId} className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{row.styleName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.skuCode} / {row.seriesName} / {row.categoryName}
                      </div>
                    </div>
                    <img src={row.thumbnailUrl} alt={row.styleName} className="h-14 w-14 rounded-2xl border border-slate-200 object-cover" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className={`rounded-full px-3 py-1 ${stageMeta.bgColor} ${stageMeta.textColor}`}>{stageMeta.label}</span>
                    <span className={`rounded-full px-3 py-1 ${riskMeta.bgColor} ${riskMeta.textColor}`}>{riskMeta.label}</span>
                    {row.blocked ? <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">阻塞</span> : null}
                    {reviewMeta ? <span className={`rounded-full px-3 py-1 ${reviewMeta.bgColor} ${reviewMeta.textColor}`}>{reviewMeta.label}</span> : null}
                  </div>

                  {row.architectureSource ? (
                    <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-white p-4 text-sm text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.architectureSource.themeColorHex }} />
                        架构来源
                      </div>
                      <div className="mt-2 font-medium text-slate-900">{row.architectureSource.styleTarget} 款 / SKU {row.architectureSource.skuTarget}</div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">预算占比 {Math.round(row.architectureSource.budgetShare * 100)}% · {row.architectureSource.platformSummary}</div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-slate-400">开发级别</div>
                      <div className="mt-1 font-medium text-slate-900">{DEVELOPMENT_LEVEL_LABELS[row.developmentLevel]}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">负责人</div>
                      <div className="mt-1 font-medium text-slate-900">{row.owner}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">下次评审</div>
                      <div className="mt-1 font-medium text-slate-900">{formatDate(row.nextReviewDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">截止时间</div>
                      <div className="mt-1 font-medium text-slate-900">{formatDate(row.dueDate)}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-slate-200/75 bg-white p-4 text-sm leading-6 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">下步动作</div>
                    <div className="mt-2">{row.nextAction}</div>
                    {row.nextGate ? <div className="mt-2 text-xs text-slate-500">下一 Gate：{row.nextGate.gateName}</div> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

