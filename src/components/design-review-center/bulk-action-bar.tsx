'use client';

import { useMemo, useState } from 'react';
import { PHASE_MAP } from '@/config/design-review-center/status-map';
import type { DesignPhase, RiskLevel } from '@/lib/design-review-center/types';
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

const PRIORITY_OPTIONS: RiskLevel[] = ['medium', 'high', 'critical', 'low'];

const PRIORITY_LABELS: Record<RiskLevel, string> = {
  low: '\u4f4e',
  medium: '\u4e2d',
  high: '\u9ad8',
  critical: '\u4e25\u91cd',
};

const TASK_TYPE_OPTIONS = [
  { value: 'design', label: '\u8bbe\u8ba1\u4fee\u6539' },
  { value: 'sample', label: '\u6837\u978b\u8bc4\u5ba1' },
  { value: 'sourcing', label: '\u4f9b\u5e94\u94fe\u8ddf\u8fdb' },
  { value: 'testing', label: '\u6d4b\u8bd5\u9a8c\u8bc1' },
  { value: 'marketing', label: '\u4e0a\u5e02\u51c6\u5907' },
] as const;

const TEXT = {
  title: '\u6279\u91cf\u6d41\u8f6c',
  subtitle: '\u5df2\u9009 {count} \u6b3e\uff0c\u53ef\u6279\u91cf\u6539\u9636\u6bb5\u3001\u6539\u8d1f\u8d23\u4eba\u3001\u8bbe\u4e0b\u6b21\u8bc4\u5ba1\u65f6\u95f4\u6216\u751f\u6210\u5f85\u529e\u3002',
  clearSelection: '\u6e05\u7a7a\u9009\u62e9',
  applyPhase: '\u6279\u91cf\u6539\u9636\u6bb5',
  applyPhaseButton: '\u5e94\u7528\u9636\u6bb5',
  assignOwner: '\u6279\u91cf\u6539\u8d1f\u8d23\u4eba',
  assignOwnerButton: '\u5e94\u7528\u8d1f\u8d23\u4eba',
  pickOwner: '\u8bf7\u9009\u62e9\u8d1f\u8d23\u4eba',
  nextReviewDate: '\u6279\u91cf\u6539\u4e0b\u6b21\u8bc4\u5ba1\u65f6\u95f4',
  nextReviewDateButton: '\u5e94\u7528\u8bc4\u5ba1\u65f6\u95f4',
  taskTitle: '\u6279\u91cf\u751f\u6210\u5f85\u529e\u6807\u9898',
  taskTitlePlaceholder: '\u4f8b\u5982\uff1a\u8865\u5145\u7b2c\u4e8c\u8f6e\u914d\u8272\u4e0e\u5e2e\u9762\u4f18\u5316',
  dueDate: '\u5230\u671f\u65f6\u95f4',
  owner: '\u8d1f\u8d23\u4eba',
  keepOwner: '\u6cbf\u7528\u5355\u6b3e\u8d1f\u8d23\u4eba',
  priority: '\u4f18\u5148\u7ea7',
  createTask: '\u751f\u6210\u5f85\u529e',
  taskType: '\u4efb\u52a1\u7c7b\u578b',
  taskDescription: '\u4efb\u52a1\u8bf4\u660e',
  taskDescriptionPlaceholder: '\u4f8b\u5982\uff1a\u672c\u5468\u8bc4\u5ba1\u4f1a\u540e\u8865\u9f50\u914d\u8272\u65b9\u6848\uff0c\u5e76\u590d\u6838\u978b\u5934\u5305\u8986\u3002',
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
          <button type="button" onClick={onClearSelection} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            {TEXT.clearSelection}
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto]">
          <label className="text-sm text-slate-600">
            {TEXT.applyPhase}
            <select value={phase} onChange={(event) => setPhase(event.target.value as DesignPhase)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500">
              {PHASE_OPTIONS.map((phaseOption) => (
                <option key={phaseOption} value={phaseOption}>
                  {PHASE_MAP[phaseOption]?.label ?? phaseOption}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => onApplyPhase(phase)} className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            {TEXT.applyPhaseButton}
          </button>

          <label className="text-sm text-slate-600">
            {TEXT.assignOwner}
            <select value={owner} onChange={(event) => setOwner(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500">
              <option value="">{TEXT.pickOwner}</option>
              {ownerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => owner && onAssignOwner(owner)} disabled={!owner} className="self-end rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
            {TEXT.assignOwnerButton}
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="text-sm text-slate-600">
            {TEXT.nextReviewDate}
            <input type="date" value={nextReviewDate} onChange={(event) => setNextReviewDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500" />
          </label>
          <button type="button" onClick={() => nextReviewDate && onApplyNextReviewDate(nextReviewDate)} disabled={!nextReviewDate} className="self-end rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50">
            {TEXT.nextReviewDateButton}
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_auto]">
          <label className="text-sm text-slate-600 xl:col-span-2">
            {TEXT.taskTitle}
            <input value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} placeholder={TEXT.taskTitlePlaceholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500" />
          </label>

          <label className="text-sm text-slate-600">
            {TEXT.dueDate}
            <input type="date" value={taskDraft.dueDate} onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500" />
          </label>

          <label className="text-sm text-slate-600">
            {TEXT.owner}
            <select value={taskDraft.assignee} onChange={(event) => setTaskDraft((current) => ({ ...current, assignee: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500">
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
            <select value={taskDraft.priority} onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value as RiskLevel }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500">
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => canCreateTask && onCreateTasks(taskDraft)} disabled={!canCreateTask} className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
            {TEXT.createTask}
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <label className="text-sm text-slate-600">
            {TEXT.taskType}
            <select value={taskDraft.taskType} onChange={(event) => setTaskDraft((current) => ({ ...current, taskType: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500">
              {TASK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            {TEXT.taskDescription}
            <textarea rows={2} value={taskDraft.description} onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))} placeholder={TEXT.taskDescriptionPlaceholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500" />
          </label>
        </div>
      </div>
    </div>
  );
}