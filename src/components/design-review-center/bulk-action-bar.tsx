'use client';

import { useMemo, useState } from 'react';
import { PHASE_MAP } from '@/config/design-review-center/status-map';
import type { RiskLevel } from '@/config/design-review-center/enums';
import type { DesignPhase } from '@/lib/design-review-center/types';
import type { DesignReviewTaskDraft } from '@/lib/openclaw/tasks';

interface OwnerOption {
  value: string;
  label: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  ownerOptions: OwnerOption[];
  onApplyPhase: (phase: DesignPhase) => void;
  onAssignOwner: (owner: string) => void;
  onApplyNextReviewDate: (date: string) => void;
  onCreateTasks: (draft: DesignReviewTaskDraft) => void;
  onClearSelection: () => void;
}

const PHASE_OPTIONS: DesignPhase[] = [
  'planning',
  'concept',
  'prototype',
  'prototype_review',
  'sample_review',
  'costing',
  'costing_review',
  'locked',
  'completed',
];

const PRIORITY_OPTIONS: RiskLevel[] = ['blocking', 'high', 'medium', 'low'];

const PRIORITY_LABELS: Record<RiskLevel, string> = {
  blocking: '阻塞',
  high: '高',
  medium: '中',
  low: '低',
};

const TASK_TYPE_OPTIONS = [
  { value: 'design', label: '设计修改' },
  { value: 'sample', label: '样鞋评审' },
  { value: 'sourcing', label: '供应链跟进' },
  { value: 'testing', label: '测试验证' },
  { value: 'marketing', label: '上市准备' },
] as const;

const TEXT = {
  title: '批量流转',
  subtitle: '已选 {count} 款，可集中改阶段、改负责人、设回评时间或批量生成待办。',
  clearSelection: '清空选择',
  applyPhase: '批量改阶段',
  applyPhaseButton: '应用阶段',
  assignOwner: '批量改负责人',
  assignOwnerButton: '应用负责人',
  pickOwner: '请选择负责人',
  nextReviewDate: '批量设回评时间',
  nextReviewDateButton: '应用回评时间',
  taskTitle: '批量生成待办标题',
  taskTitlePlaceholder: '例如：补第二轮配色并复核鞋头包覆',
  dueDate: '到期时间',
  owner: '负责人',
  keepOwner: '沿用单款负责人',
  priority: '优先级',
  createTask: '生成待办',
  taskType: '任务类型',
  taskDescription: '任务说明',
  taskDescriptionPlaceholder: '例如：评审会后补齐第二轮配色方案，并复核大底包边与鞋头比例。',
} as const;

export default function BulkActionBar({
  selectedCount,
  ownerOptions,
  onApplyPhase,
  onAssignOwner,
  onApplyNextReviewDate,
  onCreateTasks,
  onClearSelection,
}: BulkActionBarProps) {
  const [phase, setPhase] = useState<DesignPhase>('sample_review');
  const [owner, setOwner] = useState<string>('');
  const [nextReviewDate, setNextReviewDate] = useState<string>('');
  const [taskDraft, setTaskDraft] = useState<DesignReviewTaskDraft>({
    title: '',
    description: '',
    dueDate: '',
    assignee: '',
    priority: 'high',
    taskType: 'design',
  });

  const canCreateTask = useMemo(() => Boolean(taskDraft.title.trim() && taskDraft.dueDate), [taskDraft.dueDate, taskDraft.title]);
  const subtitle = TEXT.subtitle.replace('{count}', String(selectedCount));

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{TEXT.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {TEXT.clearSelection}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">阶段流转</div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <label className="text-sm text-slate-600">
                {TEXT.applyPhase}
                <select
                  value={phase}
                  onChange={(event) => setPhase(event.target.value as DesignPhase)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                >
                  {PHASE_OPTIONS.map((phaseOption) => (
                    <option key={phaseOption} value={phaseOption}>
                      {PHASE_MAP[phaseOption]?.label ?? phaseOption}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => onApplyPhase(phase)}
                className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {TEXT.applyPhaseButton}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">责任人与回评</div>
            <div className="grid gap-3">
              <label className="text-sm text-slate-600">
                {TEXT.assignOwner}
                <select
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                >
                  <option value="">{TEXT.pickOwner}</option>
                  {ownerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => owner && onAssignOwner(owner)}
                disabled={!owner}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {TEXT.assignOwnerButton}
              </button>
              <label className="text-sm text-slate-600">
                {TEXT.nextReviewDate}
                <input
                  type="date"
                  value={nextReviewDate}
                  onChange={(event) => setNextReviewDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                />
              </label>
              <button
                type="button"
                onClick={() => nextReviewDate && onApplyNextReviewDate(nextReviewDate)}
                disabled={!nextReviewDate}
                className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {TEXT.nextReviewDateButton}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">生成待办</div>
            <div className="grid gap-3">
              <label className="text-sm text-slate-600">
                {TEXT.taskTitle}
                <input
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder={TEXT.taskTitlePlaceholder}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm text-slate-600">
                  {TEXT.dueDate}
                  <input
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  {TEXT.owner}
                  <select
                    value={taskDraft.assignee}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, assignee: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                  >
                    <option value="">{TEXT.keepOwner}</option>
                    {ownerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  {TEXT.priority}
                  <select
                    value={taskDraft.priority}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value as RiskLevel }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <label className="text-sm text-slate-600">
                  {TEXT.taskType}
                  <select
                    value={taskDraft.taskType}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, taskType: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                  >
                    {TASK_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  {TEXT.taskDescription}
                  <textarea
                    rows={2}
                    value={taskDraft.description}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder={TEXT.taskDescriptionPlaceholder}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => canCreateTask && onCreateTasks(taskDraft)}
                disabled={!canCreateTask}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {TEXT.createTask}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

