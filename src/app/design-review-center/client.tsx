'use client';

import { useEffect, useMemo, useState } from 'react';
import AssetWall from '@/components/design-review-center/asset-wall';
import BulkActionBar from '@/components/design-review-center/bulk-action-bar';
import CategoryBreakdownPanel from '@/components/design-review-center/category-breakdown-panel';
import DevelopmentWaveTable from '@/components/design-review-center/development-wave-table';
import DesignItemTable from '@/components/design-review-center/design-item-table';
import FilterBar, {
  DEFAULT_FILTERS,
  type FilterOption,
  type FilterState,
} from '@/components/design-review-center/filter-bar';
import ProductArchitecturePanel from '@/components/design-review-center/product-architecture-panel';
import RiskPanel from '@/components/design-review-center/risk-panel';
import SeasonOverviewCards from '@/components/design-review-center/season-overview-cards';
import SeasonTimeline from '@/components/design-review-center/season-timeline';
import TaskPanel from '@/components/design-review-center/task-panel';
import ThemeDirectionPanel from '@/components/design-review-center/theme-direction-panel';
import WorkflowTabs from '@/components/design-review-center/workflow-tabs';
import { WORKFLOW_TABS, type WorkflowTabKey } from '@/config/design-review-center/workflow-tabs';
import {
  applyDesignReviewActionIntents,
  commitDesignReviewActionIntents,
  createDesignReviewCommittedState,
  getDesignReviewActionMessage,
  loadDesignReviewCommittedState,
  saveDesignReviewCommittedState,
  type DesignReviewCommittedState,
} from '@/lib/design-review-center/action-intents';
import type { DesignReviewCenterData } from '@/lib/design-review-center/assembler';
import type { DesignItem, Risk, RiskLevel, SeriesWithBrief, Task, Wave } from '@/lib/design-review-center/types';
import {
  clearSyncedDesignReviewActionIntents,
  createDesignReviewNextReviewIntent,
  createDesignReviewOwnerAssignmentIntent,
  createDesignReviewPhaseTransitionIntent,
  createDesignReviewTaskGenerationIntent,
  getDesignReviewActionCounts,
  getDesignReviewActionLabel,
  getDesignReviewActionStatusLabel,
  loadDesignReviewActionIntents,
  markDesignReviewActionIntentsSynced,
  queueDesignReviewActionIntent,
  retryFailedDesignReviewActionIntents,
  saveDesignReviewActionIntents,
  type DesignReviewActionIntent,
} from '@/lib/openclaw/tasks';

interface DesignReviewCenterClientProps {
  data: DesignReviewCenterData;
}

const PRIORITY_ORDER: Record<RiskLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function startOfDay(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isPastDue(value: string | null | undefined, referenceDate: string) {
  return startOfDay(value) < startOfDay(referenceDate);
}

function isSameWeek(value: string | null | undefined, referenceDate: string) {
  if (!value) return false;
  const target = startOfDay(value);
  if (!Number.isFinite(target)) return false;
  const baselineDate = new Date(referenceDate);
  const day = baselineDate.getDay() === 0 ? 7 : baselineDate.getDay();
  const weekStart = new Date(baselineDate);
  weekStart.setDate(baselineDate.getDate() - day + 1);
  const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
  return target >= start && target < start + 7 * 24 * 60 * 60 * 1000;
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

function extractYear(value: string) {
  const matched = value.match(/20\d{2}/);
  return matched?.[0] ?? '';
}

function getQuarterFromDate(value: string) {
  const matched = value.match(/(20\d{2})-(\d{2})-\d{2}/);
  if (!matched) return '';
  return 'Q' + Math.ceil(Number(matched[2]) / 3);
}

function normalizeWaveId(value: string) {
  return value.trim().toLowerCase();
}

function getWaveYear(wave: Wave | undefined, fallbackYear: string) {
  if (!wave) return fallbackYear;
  const matched = wave.launchWindow.match(/20\d{2}/);
  return matched?.[0] ?? fallbackYear;
}

function getWaveQuarter(wave: Wave | undefined) {
  if (!wave) return '';
  const matched = wave.launchWindow.match(/20\d{2}-(\d{2})-\d{2}/);
  if (!matched) return '';
  return 'Q' + Math.ceil(Number(matched[1]) / 3);
}

function isHighRisk(level: RiskLevel | undefined) {
  return level === 'high' || level === 'critical';
}

function getLeadSeries(series: SeriesWithBrief[]) {
  return [...series].sort((left, right) => {
    const progressCompare = right.progress - left.progress;
    if (progressCompare !== 0) return progressCompare;
    return (right.brief?.plannedSkuCount ?? 0) - (left.brief?.plannedSkuCount ?? 0);
  })[0] ?? null;
}

function getDominantWave(series: SeriesWithBrief[], waves: Wave[], fallbackWaveId: string) {
  const counts = series.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.waveId] = (accumulator[item.waveId] ?? 0) + 1;
    return accumulator;
  }, {});

  const dominantWaveId = Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? normalizeWaveId(fallbackWaveId);
  return waves.find((wave) => normalizeWaveId(wave.waveId) === normalizeWaveId(dominantWaveId)) ?? waves[0] ?? null;
}

function sortRisks(risks: Risk[]) {
  return [...risks].sort((left, right) => {
    const priorityCompare = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
    if (priorityCompare !== 0) return priorityCompare;
    return startOfDay(left.dueDate) - startOfDay(right.dueDate);
  });
}

function sortTasks(tasks: Task[]) {
  return [...tasks]
    .filter((task) => task.status !== 'completed')
    .sort((left, right) => startOfDay(left.dueDate) - startOfDay(right.dueDate));
}

function matchesOwner(series: SeriesWithBrief, owner: string) {
  if (!owner) return true;
  const ownerPool = uniqueOptions([
    series.owner,
    ...series.designItems.map((item) => item.designer),
    ...series.tasks.map((task) => task.assignee),
    ...series.risks.map((risk) => risk.owner),
  ]);
  return ownerPool.includes(owner);
}

function matchesPhase(series: SeriesWithBrief, phase: string) {
  if (!phase) return true;
  return (
    series.milestoneStatus === phase ||
    series.designItems.some((item) => item.designStatus === phase) ||
    series.developmentPlan.some((row) => row.phase === phase)
  );
}

function matchesQuickFilters(series: SeriesWithBrief, filters: FilterState, referenceDate: string) {
  if (filters.showHighRiskOnly) {
    const hasHighRisk =
      isHighRisk(series.riskLevel) ||
      series.designItems.some((item) => isHighRisk(item.riskLevel)) ||
      series.risks.some((risk) => isHighRisk(risk.priority));
    if (!hasHighRisk) return false;
  }

  if (filters.showOverdueOnly) {
    const hasOverdue =
      isPastDue(series.dueDate, referenceDate) ||
      series.designItems.some((item) => isPastDue(item.nextReviewDate ?? item.targetLaunchDate, referenceDate)) ||
      series.tasks.some((task) => task.status !== 'completed' && isPastDue(task.dueDate, referenceDate)) ||
      series.risks.some((risk) => risk.status !== 'resolved' && isPastDue(risk.dueDate, referenceDate));
    if (!hasOverdue) return false;
  }

  if (filters.showThisWeekOnly) {
    const hasThisWeek =
      series.designItems.some((item) => isSameWeek(item.nextReviewDate, referenceDate)) ||
      series.tasks.some((task) => task.status !== 'completed' && isSameWeek(task.dueDate, referenceDate));
    if (!hasThisWeek) return false;
  }

  return true;
}

function getQueueStatusClassName(status: DesignReviewActionIntent['status']) {
  if (status === 'pending_sync') return 'bg-amber-100 text-amber-800';
  if (status === 'synced') return 'bg-emerald-100 text-emerald-800';
  return 'bg-rose-100 text-rose-800';
}

export default function DesignReviewCenterClient({ data }: DesignReviewCenterClientProps) {
  const referenceDate = data.weeklySnapshot.snapshotDate;
  const seasonYear = extractYear(data.seasonOverview.season) || extractYear(referenceDate) || String(new Date(referenceDate).getFullYear());
  const currentOwner = data.seasonOverview.currentOwner?.trim() ?? '';
  const actorName = currentOwner || '评审中心';
  const [activeTab, setActiveTab] = useState<WorkflowTabKey>('overview');
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, year: seasonYear });
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState('');
  const [actionIntents, setActionIntents] = useState<DesignReviewActionIntent[]>([]);

  const baseItems = useMemo(() => data.series.flatMap((series) => series.designItems), [data.series]);
  const baseTasks = useMemo(() => data.series.flatMap((series) => series.tasks), [data.series]);
  const baseCommittedState = useMemo(() => createDesignReviewCommittedState(baseItems, baseTasks), [baseItems, baseTasks]);
  const [committedState, setCommittedState] = useState<DesignReviewCommittedState>(baseCommittedState);

  useEffect(() => {
    const storedIntents = loadDesignReviewActionIntents();
    const storedCommittedState = loadDesignReviewCommittedState();
    setActionIntents(storedIntents);
    setCommittedState(storedCommittedState ?? baseCommittedState);
  }, [baseCommittedState]);

  useEffect(() => {
    saveDesignReviewActionIntents(actionIntents);
  }, [actionIntents]);

  useEffect(() => {
    saveDesignReviewCommittedState(committedState);
  }, [committedState]);

  const projectedState = useMemo(() => {
    const pendingOrErrorIntents = actionIntents.filter((intent) => intent.status !== 'synced');
    return applyDesignReviewActionIntents({
      baseItems: committedState.designItems,
      baseTasks: committedState.tasks,
      intents: pendingOrErrorIntents,
    });
  }, [actionIntents, committedState.designItems, committedState.tasks]);

  const projectedSeries = useMemo(
    () =>
      data.series.map((series) => ({
        ...series,
        designItems: projectedState.designItems.filter((item) => item.seriesId === series.seriesId),
        tasks: projectedState.tasks.filter((task) => task.seriesId === series.seriesId),
      })),
    [data.series, projectedState.designItems, projectedState.tasks],
  );

  const waveById = useMemo(() => new Map(data.waves.map((wave) => [normalizeWaveId(wave.waveId), wave])), [data.waves]);

  const yearOptions = useMemo<FilterOption[]>(() => {
    const years = uniqueOptions([seasonYear, ...data.waves.map((wave) => getWaveYear(wave, seasonYear))]).sort();
    return years.map((year) => ({ value: year, label: year + '年' }));
  }, [data.waves, seasonYear]);

  const quarterOptions = useMemo<FilterOption[]>(() => {
    const values = data.waves
      .filter((wave) => !filters.year || getWaveYear(wave, seasonYear) === filters.year)
      .map((wave) => getWaveQuarter(wave))
      .filter(Boolean);
    return uniqueOptions(values)
      .sort()
      .map((quarter) => ({ value: quarter, label: quarter }));
  }, [data.waves, filters.year, seasonYear]);

  const scopedSeries = useMemo(() => {
    return projectedSeries.filter((series) => {
      const wave = waveById.get(normalizeWaveId(series.waveId));
      const waveYear = getWaveYear(wave, seasonYear);
      const waveQuarter = getWaveQuarter(wave);

      if (filters.year && waveYear !== filters.year) return false;
      if (filters.quarter && waveQuarter !== filters.quarter) return false;
      if (filters.wave && series.waveId !== filters.wave) return false;
      return true;
    });
  }, [filters.quarter, filters.wave, filters.year, projectedSeries, seasonYear, waveById]);

  const waveOptions = useMemo<FilterOption[]>(() => {
    const visibleWaveIds = new Set(scopedSeries.map((series) => series.waveId));
    return data.waves.filter((wave) => visibleWaveIds.has(wave.waveId)).map((wave) => ({ value: wave.waveId, label: wave.waveName }));
  }, [data.waves, scopedSeries]);

  const seriesOptions = useMemo<FilterOption[]>(() => {
    return scopedSeries.map((series) => ({ value: series.seriesId, label: series.seriesName }));
  }, [scopedSeries]);

  const ownerOptions = useMemo<FilterOption[]>(() => {
    const ownerSource = scopedSeries.filter((series) => !filters.series || series.seriesId === filters.series);
    return uniqueOptions([
      ...ownerSource.map((series) => series.owner),
      ...ownerSource.flatMap((series) => series.designItems.map((item) => item.designer)),
      ...ownerSource.flatMap((series) => series.tasks.map((task) => task.assignee)),
      ...ownerSource.flatMap((series) => series.risks.map((risk) => risk.owner)),
    ]).map((owner) => ({ value: owner, label: owner }));
  }, [filters.series, scopedSeries]);

  const filteredSeries = useMemo(() => {
    return scopedSeries.filter((series) => {
      const ownerToMatch = filters.showMine ? currentOwner : filters.owner;
      if (filters.series && series.seriesId !== filters.series) return false;
      if (!matchesOwner(series, ownerToMatch)) return false;
      if (!matchesPhase(series, filters.phase)) return false;
      return matchesQuickFilters(series, filters, referenceDate);
    });
  }, [currentOwner, filters, referenceDate, scopedSeries]);

  const filteredWaveIds = useMemo(() => new Set(filteredSeries.map((series) => series.waveId)), [filteredSeries]);
  const filteredWaves = useMemo(() => data.waves.filter((wave) => filteredWaveIds.has(wave.waveId)), [data.waves, filteredWaveIds]);
  const filteredAssets = useMemo(() => filteredSeries.flatMap((series) => series.assets), [filteredSeries]);
  const filteredItems = useMemo(() => filteredSeries.flatMap((series) => series.designItems), [filteredSeries]);
  const filteredTasks = useMemo(() => filteredSeries.flatMap((series) => series.tasks), [filteredSeries]);
  const filteredRisks = useMemo(() => filteredSeries.flatMap((series) => series.risks), [filteredSeries]);

  const filteredTimeline = useMemo(() => {
    const milestones = data.timeline.milestones.filter((milestone) => {
      const milestoneYear = extractYear(milestone.plannedDate);
      const milestoneQuarter = getQuarterFromDate(milestone.plannedDate);
      if (filters.year && milestoneYear !== filters.year) return false;
      if (filters.quarter && milestoneQuarter !== filters.quarter) return false;
      if (filters.showOverdueOnly && !isPastDue(milestone.plannedDate, referenceDate)) return false;
      if (filters.showThisWeekOnly && !isSameWeek(milestone.plannedDate, referenceDate)) return false;
      return true;
    });

    return { milestones };
  }, [data.timeline.milestones, filters.quarter, filters.showOverdueOnly, filters.showThisWeekOnly, filters.year, referenceDate]);

  useEffect(() => {
    const visibleIds = new Set(filteredItems.map((item) => item.itemId));
    setSelectedItemIds((current) => current.filter((itemId) => visibleIds.has(itemId)));
  }, [filteredItems]);

  const focusItems = useMemo(
    () =>
      [...filteredItems]
        .filter((item) => isHighRisk(item.riskLevel) || isPastDue(item.nextReviewDate ?? item.targetLaunchDate, referenceDate))
        .sort((left, right) => {
          const riskCompare = PRIORITY_ORDER[left.riskLevel ?? 'low'] - PRIORITY_ORDER[right.riskLevel ?? 'low'];
          if (riskCompare !== 0) return riskCompare;
          return startOfDay(left.nextReviewDate ?? left.targetLaunchDate) - startOfDay(right.nextReviewDate ?? right.targetLaunchDate);
        }),
    [filteredItems, referenceDate],
  );

  const focusRisks = useMemo(() => sortRisks(filteredRisks), [filteredRisks]);
  const focusTasks = useMemo(() => sortTasks(filteredTasks), [filteredTasks]);
  const dominantWave = useMemo(() => getDominantWave(filteredSeries, data.waves, data.seasonOverview.currentWave), [data.seasonOverview.currentWave, data.waves, filteredSeries]);
  const leadSeries = useMemo(() => getLeadSeries(filteredSeries), [filteredSeries]);
  const topBlockingRisk = focusRisks[0] ?? null;
  const topBlockingTask = focusTasks.find((task) => isPastDue(task.dueDate, referenceDate)) ?? focusTasks[0] ?? null;
  const delayedMilestone = filteredTimeline.milestones.find((milestone) => milestone.status === 'delayed' || milestone.status === 'at_risk') ?? null;

  const keyDecision = useMemo(() => {
    if (leadSeries) {
      return `${leadSeries.seriesName} 仍是当前主推系列，建议优先锁定 ${data.seasonOverview.milestoneCountdown.nextMilestone} 前的关键评审与主推 SKU。`;
    }
    return `当前暂无明确主推系列，建议先在 ${data.seasonOverview.milestoneCountdown.nextMilestone} 前收敛主题、系列和主推 SKU。`;
  }, [data.seasonOverview.milestoneCountdown.nextMilestone, leadSeries]);

  const blockerNote = useMemo(() => {
    if (topBlockingRisk) {
      return `${topBlockingRisk.title}，责任人 ${topBlockingRisk.owner}，请在 ${topBlockingRisk.dueDate} 前完成风险处理。`;
    }
    if (topBlockingTask) {
      return `${topBlockingTask.title}，责任人 ${topBlockingTask.assignee}，请在 ${topBlockingTask.dueDate} 前完成。`;
    }
    if (delayedMilestone) {
      return `${delayedMilestone.title} 已偏离计划，责任人 ${delayedMilestone.owner}，计划时间 ${delayedMilestone.plannedDate}。`;
    }
    return '当前没有高优先级阻塞项，可继续按计划推进主题、系列和样鞋评审。';
  }, [delayedMilestone, topBlockingRisk, topBlockingTask]);

  const overviewHighlights = [
    {
      label: '当前主题',
      value: dominantWave?.theme ?? '待确定',
      note: dominantWave ? `${dominantWave.waveName} / 上市窗口 ${dominantWave.launchWindow}` : '请先补充当前波段与主题定义。',
    },
    {
      label: '主推系列',
      value: leadSeries?.seriesName ?? '待确定',
      note: leadSeries ? `当前进度 ${leadSeries.progress}% / 价格带 ${leadSeries.priceBand}` : '请先确定当前主推系列。',
    },
    {
      label: '关键决策',
      value: data.seasonOverview.milestoneCountdown.nextMilestone,
      note: keyDecision,
    },
    {
      label: '当前阻塞点',
      value: topBlockingRisk?.title ?? topBlockingTask?.title ?? delayedMilestone?.title ?? '暂无重大阻塞',
      note: blockerNote,
    },
  ];

  const decisionCards = [
    {
      title: '本周主题判断',
      body: leadSeries
        ? `${leadSeries.seriesName} 仍然承接当前主题表达，建议优先确认主推配色、关键材料和主推 SKU 的评审节奏。`
        : '当前缺少明确的主推系列，建议先收敛主题表达与主推方向。',
    },
    {
      title: '本周推进重点',
      body: blockerNote,
    },
    {
      title: '本周流程建议',
      body: '先用年度、季度和波段收敛筛选范围，再进入主题、产品架构和研发波段表逐层判断，避免在全量数据里来回切换。',
    },
  ];

  const overviewCounts = [
    { label: '在管系列', value: String(filteredSeries.length), note: '当前筛选范围内的系列数' },
    { label: '重点关注单款', value: String(focusItems.length), note: '高风险或已逾期单款' },
    { label: '高风险事项', value: String(focusRisks.filter((risk) => isHighRisk(risk.priority)).length), note: '仅统计高风险与严重风险' },
    { label: '本周任务', value: String(focusTasks.filter((task) => isPastDue(task.dueDate, referenceDate) || isSameWeek(task.dueDate, referenceDate)).length), note: '本周到期或已逾期的任务' },
  ];

  const actionCounts = useMemo(() => getDesignReviewActionCounts(actionIntents), [actionIntents]);
  const latestIntent = actionIntents[actionIntents.length - 1] ?? null;
  const latestPendingIntent = [...actionIntents].reverse().find((intent) => intent.status === 'pending_sync') ?? null;
  const latestBatchId = committedState.export_batch_id;
  const recentIntents = useMemo(() => [...actionIntents].slice(-5).reverse(), [actionIntents]);

  const syncBanner = useMemo(() => {
    if (actionCounts.error > 0) {
      return {
        className: 'border-rose-200 bg-rose-50 text-rose-900',
        title: '存在同步异常',
        description: '本地动作队列里有异常记录，建议先重试或清理后再继续批量操作。',
      };
    }
    if (actionCounts.pending_sync > 0) {
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-900',
        title: '存在待同步动作',
        description: '当前批量动作已进入本地队列，后续可以继续对接 OpenClaw 导出或写回层。',
      };
    }
    if (actionCounts.synced > 0) {
      return {
        className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        title: '本地基线已更新',
        description: '最近一次批量动作已经写入本地基线，可继续推进评审和任务流转。',
      };
    }
    return {
      className: 'border-slate-200 bg-slate-50 text-slate-800',
      title: '当前无待同步动作',
      description: '页面当前以本地基线数据为准，如有新的批量动作会先进入 Action Queue。',
    };
  }, [actionCounts.error, actionCounts.pending_sync, actionCounts.synced]);

  const enqueueIntent = (intent: DesignReviewActionIntent) => {
    setActionIntents((current) => queueDesignReviewActionIntent(current, intent));
    setActionMessage(getDesignReviewActionMessage(intent));
    setSelectedItemIds([]);
  };

  const handleApplyPhase = (phase: DesignItem['designStatus']) => {
    if (selectedItemIds.length === 0) return;
    enqueueIntent(createDesignReviewPhaseTransitionIntent(selectedItemIds, phase, actorName));
  };

  const handleAssignOwner = (owner: string) => {
    if (selectedItemIds.length === 0 || !owner) return;
    enqueueIntent(createDesignReviewOwnerAssignmentIntent(selectedItemIds, owner, actorName));
  };

  const handleApplyNextReviewDate = (date: string) => {
    if (selectedItemIds.length === 0 || !date) return;
    enqueueIntent(createDesignReviewNextReviewIntent(selectedItemIds, date, actorName));
  };

  const handleCreateTasks = (draft: Parameters<typeof createDesignReviewTaskGenerationIntent>[1]) => {
    if (selectedItemIds.length === 0) return;
    enqueueIntent(createDesignReviewTaskGenerationIntent(selectedItemIds, draft, actorName));
  };

  const handleSyncPending = () => {
    const pendingIntents = actionIntents.filter((intent) => intent.status === 'pending_sync');
    if (pendingIntents.length === 0) return;

    const syncedAt = new Date().toISOString();
    const exportBatchId = `local-batch-${Date.now()}`;
    const nextCommittedState = commitDesignReviewActionIntents(committedState, pendingIntents, exportBatchId, syncedAt);

    setCommittedState(nextCommittedState);
    setActionIntents((current) =>
      markDesignReviewActionIntentsSynced(
        current,
        pendingIntents.map((intent) => intent.id),
        exportBatchId,
        syncedAt,
      ),
    );
    setActionMessage(`已将 ${pendingIntents.length} 条动作写入本地基线，批次 ${exportBatchId}。`);
  };

  const handleRetryErrors = () => {
    setActionIntents((current) => retryFailedDesignReviewActionIntents(current));
    setActionMessage('已将异常动作重新放回待同步队列。');
  };

  const handleClearSynced = () => {
    setActionIntents((current) => clearSyncedDesignReviewActionIntents(current));
    setActionMessage('已清理已同步动作。');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">设计企划与评审中心</h1>
            <p className="mt-3 text-base text-slate-500">
              主题方向、产品架构、开发品类、研发波段、设计效果与评审动作统一在一页里推进。
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            数据时间 {referenceDate}
          </div>
        </header>

        <div className="space-y-6 rounded-[32px] bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <FilterBar
            years={yearOptions}
            quarters={quarterOptions}
            waves={waveOptions}
            series={seriesOptions}
            owners={ownerOptions}
            filters={filters}
            onFilterChange={setFilters}
            currentOwnerLabel={currentOwner}
            defaultYear={seasonYear}
          />
          <WorkflowTabs tabs={WORKFLOW_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {activeTab === 'overview' ? (
          <div className="mt-8 space-y-8">
            <section className="grid gap-4 xl:grid-cols-4">
              {overviewHighlights.map((card) => (
                <article key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-medium text-slate-500">{card.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{card.note}</p>
                </article>
              ))}
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-3xl font-semibold text-slate-950">季节总览</h2>
                <p className="mt-2 text-sm text-slate-500">先确认当前季节、节奏、风险与资产健康度。</p>
              </div>
              <SeasonOverviewCards overview={data.seasonOverview} />
            </section>

            <section className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-950">本周重点快照</h2>
                  <p className="mt-2 text-sm text-slate-600">把当前筛选范围下需要拍板和跟进的内容集中在这里。</p>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">Unified Workflow</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewCounts.map((item) => (
                  <article key={item.label} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
                    <div className="text-sm text-slate-500">{item.label}</div>
                    <div className="mt-3 text-4xl font-semibold text-slate-950">{item.value}</div>
                    <div className="mt-3 text-sm text-slate-500">{item.note}</div>
                  </article>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {decisionCards.map((card) => (
                  <article key={card.title} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-3xl font-semibold text-slate-950">季节时间轴</h2>
                <p className="mt-2 text-sm text-slate-500">按设计、成本和开发三轨看关键节点。</p>
              </div>
              <SeasonTimeline timeline={filteredTimeline} />
            </section>
          </div>
        ) : null}

        {activeTab === 'themeDirection' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">主题方向</h2>
              <p className="mt-2 text-sm text-slate-500">围绕主题、情绪板、色彩和材料方向讲清设计意图。</p>
            </div>
            <ThemeDirectionPanel waves={filteredWaves} series={filteredSeries} assets={filteredAssets} />
          </div>
        ) : null}

        {activeTab === 'productArchitecture' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">产品架构</h2>
              <p className="mt-2 text-sm text-slate-500">围绕系列、角色、场景与价格带确认本季鞋类骨架。</p>
            </div>
            <ProductArchitecturePanel series={filteredSeries} />
          </div>
        ) : null}

        {activeTab === 'categoryBreakdown' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">开发品类分解</h2>
              <p className="mt-2 text-sm text-slate-500">把系列拆到开发品类和结构重点，便于样式与数量收敛。</p>
            </div>
            <CategoryBreakdownPanel series={filteredSeries} />
          </div>
        ) : null}

        {activeTab === 'developmentWaveTable' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">产品研发波段表</h2>
              <p className="mt-2 text-sm text-slate-500">按周次推进阶段、成本、Tech Pack 与开模状态。</p>
            </div>
            <DevelopmentWaveTable series={filteredSeries} />
          </div>
        ) : null}

        {activeTab === 'effectPreview' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">设计效果预览</h2>
              <p className="mt-2 text-sm text-slate-500">集中查看情绪板、材料板、楦底板、配色板和设计效果图。</p>
            </div>
            <AssetWall assets={filteredAssets} waves={filteredWaves} series={filteredSeries} showFeaturedOnlyByDefault={false} />
          </div>
        ) : null}

        {activeTab === 'reviewActions' ? (
          <div className="mt-8 space-y-6">
            <div className={'rounded-3xl border p-5 shadow-sm ' + syncBanner.className}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{syncBanner.title}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-90">{syncBanner.description}</p>
                  {actionMessage ? <p className="mt-3 text-sm font-medium">{actionMessage}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSyncPending}
                    disabled={actionCounts.pending_sync === 0}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    模拟同步待同步动作
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryErrors}
                    disabled={actionCounts.error === 0}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    重试异常
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSynced}
                    disabled={actionCounts.synced === 0}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    清理已同步
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white/70 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide opacity-70">待同步</div>
                  <div className="mt-2 text-2xl font-semibold">{actionCounts.pending_sync}</div>
                  <div className="mt-2 text-xs opacity-70">最新待同步 {latestPendingIntent ? getDesignReviewActionLabel(latestPendingIntent) : '暂无'}</div>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide opacity-70">已同步</div>
                  <div className="mt-2 text-2xl font-semibold">{actionCounts.synced}</div>
                  <div className="mt-2 text-xs opacity-70">最近批次 {latestBatchId ?? '暂无'}</div>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide opacity-70">异常</div>
                  <div className="mt-2 text-2xl font-semibold">{actionCounts.error}</div>
                  <div className="mt-2 text-xs opacity-70">优先处理异常后再推进批量流转</div>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide opacity-70">最近动作</div>
                  <div className="mt-2 text-base font-semibold">{latestIntent ? getDesignReviewActionLabel(latestIntent) : '暂无'}</div>
                  <div className="mt-2 text-xs opacity-70">{latestIntent?.created_at ? new Date(latestIntent.created_at).toLocaleString('zh-CN') : '暂无'}</div>
                </div>
              </div>
            </div>

            {selectedItemIds.length > 0 ? (
              <BulkActionBar
                selectedCount={selectedItemIds.length}
                ownerOptions={ownerOptions}
                onApplyPhase={handleApplyPhase}
                onAssignOwner={handleAssignOwner}
                onApplyNextReviewDate={handleApplyNextReviewDate}
                onCreateTasks={handleCreateTasks}
                onClearSelection={() => setSelectedItemIds([])}
              />
            ) : null}

            <section className="space-y-4">
              <div>
                <h2 className="text-3xl font-semibold text-slate-950">单款评审表</h2>
                <p className="mt-2 text-sm text-slate-500">保留批量流转和评审结论，形成开发闭环。</p>
              </div>
              <DesignItemTable items={filteredItems} selectedItemIds={selectedItemIds} onSelectionChange={setSelectedItemIds} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <RiskPanel risks={focusRisks} />
                <TaskPanel tasks={focusTasks} referenceDate={referenceDate} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Action Queue</h3>
                    <p className="mt-1 text-sm text-slate-500">本地动作意图队列，后续可直接接到 OpenClaw 导出或写回层。</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {actionIntents.length} 条
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {recentIntents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                      当前还没有批量动作进入队列。
                    </div>
                  ) : (
                    recentIntents.map((intent) => (
                      <article key={intent.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{getDesignReviewActionLabel(intent)}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              影响 {intent.item_ids.length} 款 / 发起人 {intent.created_by}
                            </div>
                          </div>
                          <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + getQueueStatusClassName(intent.status)}>
                            {getDesignReviewActionStatusLabel(intent.status)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>创建时间 {new Date(intent.created_at).toLocaleString('zh-CN')}</span>
                          {intent.export_batch_id ? <span>批次 {intent.export_batch_id}</span> : null}
                          {intent.last_synced_at ? <span>同步于 {new Date(intent.last_synced_at).toLocaleString('zh-CN')}</span> : null}
                        </div>

                        {intent.last_error ? (
                          <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">错误：{intent.last_error}</div>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

