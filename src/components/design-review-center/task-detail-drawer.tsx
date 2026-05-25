'use client';

import { useEffect } from 'react';
import { STAGE_MAP, RISK_LEVEL_MAP, EXECUTION_STATUS_MAP } from '@/config/design-review-center/status-map';
import { DEVELOPMENT_LEVEL_LABELS } from '@/config/design-review-center/labels';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { StyleTaskRow } from '@/lib/design-review-center/types';
import type { TaskPriority } from '@/lib/design-review-center/task-pool-mock-data';
import TaskDependencyChain from './task-pool/TaskDependencyChain';
import TaskHistoryTimeline from './task-pool/TaskHistoryTimeline';
import {
  deriveTaskDependencies,
  deriveSampleSubStatus,
  deriveTaskHistory,
} from '@/lib/design-review-center/task-pool-derivations';

interface Props {
  row: StyleTaskRow | null;
  priority: TaskPriority | null;
  onClose: () => void;
}

const PRIORITY_META: Record<TaskPriority, { bg: string; text: string; border: string; label: string }> = {
  P0: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', label: 'P0 立即处理' },
  P1: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'P1 本周跟进' },
  P2: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'P2 计划推进' },
  P3: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: 'P3 正常推进' },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-slate-50 py-2 last:border-none">
      <span className="w-20 shrink-0 text-xs leading-5 text-slate-400">{label}</span>
      <span className="flex-1 text-sm text-slate-800">{value}</span>
    </div>
  );
}

function Pill({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>{label}</span>
  );
}

export default function TaskDetailDrawer({ row, priority, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (row) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [row]);

  if (!row) return null;

  const stageMeta = STAGE_MAP[row.currentStage];
  const riskMeta = RISK_LEVEL_MAP[row.riskLevel];
  const designMeta = EXECUTION_STATUS_MAP[row.designStatus];
  const sampleMeta = EXECUTION_STATUS_MAP[row.sampleStatus];
  const materialMeta = EXECUTION_STATUS_MAP[row.materialStatus];
  const costMeta = EXECUTION_STATUS_MAP[row.costStatus];
  const technicalMeta = EXECUTION_STATUS_MAP[row.technicalStatus];
  const priorityMeta = priority ? PRIORITY_META[priority] : PRIORITY_META.P3;
  const hasCostData = row.targetCost !== null || row.quotedCost !== null;
  const costOverTarget =
    row.targetCost !== null && row.quotedCost !== null && row.quotedCost > row.targetCost * 1.1;
  const taskDeps = deriveTaskDependencies(row);
  const sampleSub = deriveSampleSubStatus(row);
  const taskHistory = deriveTaskHistory(row);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label="任务详情"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityMeta.bg} ${priorityMeta.text} ${priorityMeta.border}`}
                >
                  {priorityMeta.label}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stageMeta.bgColor} ${stageMeta.textColor}`}>
                  {stageMeta.label}
                </span>
                {row.blocked ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                    阻塞中
                  </span>
                ) : null}
                {row.overdue ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                    已逾期
                  </span>
                ) : row.dueThisWeek ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    本周到期
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                <div className="truncate text-base font-bold text-slate-950">{row.skuCode}</div>
                <div className="truncate text-sm text-slate-500">{row.styleName}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="关闭"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

          {/* A · 基础信息 */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">A · 基础信息</h3>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-1">
              <InfoRow label="款号" value={<span className="font-mono font-semibold text-slate-900">{row.skuCode}</span>} />
              <InfoRow label="款名" value={row.styleName} />
              <InfoRow label="系列" value={row.seriesName} />
              <InfoRow label="品类" value={row.categoryName} />
              <InfoRow label="波段" value={<span className="font-medium uppercase">{row.waveId}</span>} />
              <InfoRow label="开发角色" value={row.developmentRole} />
              <InfoRow label="开发级别" value={DEVELOPMENT_LEVEL_LABELS[row.developmentLevel]} />
              <InfoRow label="负责人" value={row.owner} />
            </div>
          </section>

          {/* B · 任务进度 */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">B · 任务进度</h3>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-1">
              <InfoRow
                label="当前阶段"
                value={<Pill bg={stageMeta.bgColor} text={stageMeta.textColor} label={stageMeta.label} />}
              />
              <InfoRow
                label="设计 / 样鞋 / 材料"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    <Pill bg={designMeta.bgColor} text={designMeta.textColor} label={`设计 ${designMeta.label}`} />
                    <Pill bg={sampleMeta.bgColor} text={sampleMeta.textColor} label={`样鞋 ${sampleMeta.label}`} />
                    <Pill bg={materialMeta.bgColor} text={materialMeta.textColor} label={`材料 ${materialMeta.label}`} />
                  </div>
                }
              />
              <InfoRow
                label="成本 / 技术"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    <Pill bg={costMeta.bgColor} text={costMeta.textColor} label={`成本 ${costMeta.label}`} />
                    <Pill bg={technicalMeta.bgColor} text={technicalMeta.textColor} label={`技术 ${technicalMeta.label}`} />
                  </div>
                }
              />
              {hasCostData ? (
                <InfoRow
                  label="成本概况"
                  value={
                    <span className="text-slate-700">
                      目标 ¥{row.targetCost ?? '–'}
                      {row.quotedCost !== null ? (
                        <>
                          {' '}· 报价{' '}
                          <span className={costOverTarget ? 'font-semibold text-rose-600' : ''}>
                            ¥{row.quotedCost}
                          </span>
                          {costOverTarget ? <span className="ml-1 text-xs text-rose-500">(超标)</span> : null}
                        </>
                      ) : null}
                      {row.lockedCost !== null ? ` · 锁定 ¥${row.lockedCost}` : null}
                    </span>
                  }
                />
              ) : null}
            </div>
          </section>

          {/* B2 · 任务依赖链 */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">B2 · 任务依赖链</h3>
            <TaskDependencyChain deps={taskDeps} sampleSub={sampleSub} />
          </section>

          {/* C · 风险与阻塞 */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">C · 风险与阻塞</h3>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-1">
              <InfoRow
                label="风险等级"
                value={<Pill bg={riskMeta.bgColor} text={riskMeta.textColor} label={riskMeta.label} />}
              />
              <InfoRow
                label="阻塞状态"
                value={
                  row.blocked ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                      当前阻塞中
                    </span>
                  ) : (
                    <span className="text-emerald-600">无阻塞</span>
                  )
                }
              />
              {row.latestReview ? (
                <InfoRow
                  label="最近评审"
                  value={
                    <span className="text-slate-600">
                      {formatDate(row.latestReview.reviewDate)}
                      {row.latestReview.issueDescription ? ` · ${row.latestReview.issueDescription}` : null}
                    </span>
                  }
                />
              ) : null}
            </div>
          </section>

          {/* D · 下一步动作 */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">D · 下一步动作</h3>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-1">
              <InfoRow
                label="下步动作"
                value={<span className="font-medium text-slate-900">{row.nextAction}</span>}
              />
              <InfoRow
                label="截止时间"
                value={
                  <span
                    className={
                      row.overdue
                        ? 'font-semibold text-rose-600'
                        : row.dueThisWeek
                          ? 'font-medium text-amber-600'
                          : ''
                    }
                  >
                    {formatDate(row.dueDate)}
                  </span>
                }
              />
              {row.nextReviewDate ? (
                <InfoRow label="下次评审" value={formatDate(row.nextReviewDate)} />
              ) : null}
              {row.nextGate ? (
                <InfoRow
                  label="下一 Gate"
                  value={
                    <span className="font-medium text-indigo-700">
                      {row.nextGate.gateName}
                      {row.nextGate.plannedDate ? ` · ${formatDate(row.nextGate.plannedDate)}` : null}
                      {row.nextGate.delayed ? (
                        <span className="ml-2 text-xs font-normal text-rose-600">(已延期)</span>
                      ) : null}
                    </span>
                  }
                />
              ) : null}
              {row.latestAction ? (
                <InfoRow
                  label="最近行动"
                  value={<span className="text-slate-600">{row.latestAction.actionDescription}</span>}
                />
              ) : null}
            </div>
          </section>

          {/* E · 架构来源 */}
          {row.architectureSource ? (
            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">E · 架构来源</h3>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-1">
                <InfoRow
                  label="款 / SKU 目标"
                  value={`${row.architectureSource.styleTarget} 款 / ${row.architectureSource.skuTarget} SKU`}
                />
                <InfoRow label="平台摘要" value={row.architectureSource.platformSummary} />
                <InfoRow
                  label="预算占比"
                  value={`${Math.round(row.architectureSource.budgetShare * 100)}%`}
                />
              </div>
            </section>
          ) : null}
          {/* F · 任务历史 */}
          {taskHistory.length > 0 ? (
            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">F · 任务历史</h3>
              <TaskHistoryTimeline events={taskHistory} />
            </section>
          ) : null}
        </div>

        {/* Footer: cross-module jump buttons */}
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">跳转至相关模块</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/design-review-center?tab=reviewDecisionCenter&styleId=${row.styleId}&from=task-pool`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              ✅ 评审决议
            </a>
            {row.nextGate ? (
              <a
                href={`/design-review-center?tab=developmentGateTable&styleId=${row.styleId}&from=task-pool`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                🗓️ 波段研发节点
              </a>
            ) : null}
            {row.architectureSource ? (
              <a
                href={`/design-review-center?tab=productArchitecture&styleId=${row.styleId}&from=task-pool`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                🧱 产品架构
              </a>
            ) : null}
            <a
              href={`/design-review-center?tab=designVersionPreview&styleId=${row.styleId}&from=task-pool`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              🖼️ 设计版本
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
