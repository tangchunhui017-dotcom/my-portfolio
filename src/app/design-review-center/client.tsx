'use client';

import { useMemo, useState } from 'react';
import TaskPoolWorkbench from '@/components/design-review-center/task-pool-workbench';
import BusinessInputTargetsPanel from '@/components/design-review-center/business-input-targets';
import CostMarginHealthPanel from '@/components/design-review-center/cost-margin-health';
import DesignPlanningWorkflowPanel from '@/components/design-review-center/design-planning-workflow';
import DevelopmentWaveTable from '@/components/design-review-center/development-wave-table';
import EffectPreviewPanel from '@/components/design-review-center/effect-preview-panel';
import EngineeringFeasibilityPanel from '@/components/design-review-center/engineering-feasibility';
import FilterBar, { type FilterState } from '@/components/design-review-center/filter-bar';
import KeyRisksBlockersPanel from '@/components/design-review-center/key-risks-blockers';
import PlanningExecutiveCardsPanel from '@/components/design-review-center/planning-executive-cards';

import SeasonDesignStrategyPanel from '@/components/design-review-center/season-design-strategy';
import SkuArchitectureMatrix from '@/components/design-review-center/sku-architecture-matrix';
import ThemeDirectionPanel from '@/components/design-review-center/theme-direction-panel';
import ProductArchitectureWorkbench from '@/components/design-review-center/product-architecture-workbench';
import ReviewDecisionWorkbench from '@/components/design-review-center/review-decision-workbench';
import WorkflowTabs from '@/components/design-review-center/workflow-tabs';
import TrendDirectionSnapshotPanel from '@/components/design-review-center/trend-direction-snapshot';
import NewCarryoverSummaryPanel from '@/components/design-review-center/new-carryover-summary';
import ProtoStatusSnapshotPanel from '@/components/design-review-center/proto-status-snapshot';
import MaterialStrategySnapshotPanel from '@/components/design-review-center/material-strategy-snapshot';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { WORKFLOW_TABS, type WorkflowTabKey } from '@/config/design-review-center/workflow-tabs';
import type { DesignReviewCenterData } from '@/lib/design-review-center/assembler';
import {
  buildSeasonDesignStrategies,
  buildCostMarginRows,
  buildDesignRiskBlockers,
  buildSkuArchitectureRows,
  deriveBusinessInputTargets,
  deriveEngineeringFeasibilityData,
  derivePlanningExecutiveSummaryCards,
  deriveNewCarryoverSummary,
  DESIGN_PLANNING_WORKFLOW_NODES,
  RELATED_MODULE_LINKS,
  WEEKLY_DECISION_ITEMS,
  TREND_DIRECTION_SNAPSHOT,
  MATERIAL_STRATEGY_SNAPSHOT,
  PROTO_STATUS_MOCK,
} from '@/lib/design-review-center/overview-mock-data';
import { createDesignVersionChains } from '@/lib/design-review-center/selectors/assets';
import { DEFAULT_DESIGN_REVIEW_FILTERS, filterDesignReviewCenterData } from '@/lib/design-review-center/selectors/filters';
import { createGateWaveGroups } from '@/lib/design-review-center/selectors/gates';
import { createReviewActionRows, createReviewDecisionRows, summarizeReviewDecisionCenter } from '@/lib/design-review-center/selectors/reviews';

interface DesignReviewCenterClientProps {
  data: DesignReviewCenterData;
}

function SectionDivider({ label, title }: { label: string; title: string }) {
  return (
    <div className="mt-12 mb-5 flex items-center gap-3">
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  );
}

export default function DesignReviewCenterClient({ data }: DesignReviewCenterClientProps) {
  const defaultYear = data.projects[0]?.year ?? data.derived.filterOptions.years[0]?.value ?? '';
  const [activeTab, setActiveTab] = useState<WorkflowTabKey>('overview');
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_DESIGN_REVIEW_FILTERS, year: defaultYear });

  const filtered = useMemo(() => filterDesignReviewCenterData(data, filters), [data, filters]);
  const taskRows = filtered.styles.map((aggregate) => aggregate.taskRow);
  const themeStrategies = filtered.series.map((aggregate) => aggregate.themeStrategy);
  const blockers = filtered.overview.blockers.slice(0, 6);
  const gateGroups = useMemo(() => createGateWaveGroups(filtered.styles, data.referenceDate), [filtered.styles, data.referenceDate]);
  const versionChains = useMemo(() => createDesignVersionChains(filtered.styles), [filtered.styles]);
  const reviewRows = useMemo(() => createReviewDecisionRows(filtered.styles, data.referenceDate), [data.referenceDate, filtered.styles]);
  const actionRows = useMemo(() => createReviewActionRows(filtered.styles, data.referenceDate), [data.referenceDate, filtered.styles]);
  const reviewSummary = useMemo(() => summarizeReviewDecisionCenter(reviewRows, actionRows), [actionRows, reviewRows]);

  // 设计企划总控数据
  const skuArchitectureRows = useMemo(() => buildSkuArchitectureRows(filtered.series), [filtered.series]);
  const businessInputTargets = useMemo(() => deriveBusinessInputTargets(skuArchitectureRows), [skuArchitectureRows]);
  const costMarginRows = useMemo(() => buildCostMarginRows(filtered.series), [filtered.series]);
  const engineeringFeasibilityData = useMemo(() => deriveEngineeringFeasibilityData(skuArchitectureRows), [skuArchitectureRows]);
  const designRiskBlockers = useMemo(
    () => buildDesignRiskBlockers(skuArchitectureRows, data.referenceDate),
    [data.referenceDate, skuArchitectureRows],
  );
  const planningCards = useMemo(
    () => derivePlanningExecutiveSummaryCards(
      filtered.overview,
      skuArchitectureRows,
      WEEKLY_DECISION_ITEMS,
      costMarginRows,
      data.referenceDate,
    ),
    [costMarginRows, data.referenceDate, filtered.overview, skuArchitectureRows],
  );
  const seasonStrategies = useMemo(
    () => buildSeasonDesignStrategies(themeStrategies, skuArchitectureRows, businessInputTargets),
    [businessInputTargets, skuArchitectureRows, themeStrategies],
  );
  const newCarryoverSummary = useMemo(
    () => deriveNewCarryoverSummary(skuArchitectureRows),
    [skuArchitectureRows],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fbfcfe_0%,#f5f7fb_55%,#f3f6fb_100%)]">
      <FilterBar
        brands={filtered.filterOptions.brands}
        years={filtered.filterOptions.years}
        quarters={filtered.filterOptions.quarters}
        waves={filtered.filterOptions.waves}
        categoryL1s={filtered.filterOptions.categoryL1s}
        categoryL2s={filtered.filterOptions.categoryL2s}
        series={filtered.filterOptions.series}
        owners={filtered.filterOptions.owners}
        filters={filters}
        onFilterChange={setFilters}
        defaultYear={defaultYear}
        hideTrigger={true}
      />

      <div className="mx-auto max-w-[1600px] px-6 pb-8 pt-4">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">设计企划</h1>
            <p className="mt-1 text-sm text-slate-500">围绕主题策略、产品架构、开发任务、波段研发节点、设计版本和评审决议统一查看设计开发进度 · 数据时间 {data.referenceDate}</p>
          </div>

          <div className="ml-4 flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const filterBarBridge = window as Window & { __openDesignReviewFilterBar?: () => void };
                if (filterBarBridge.__openDesignReviewFilterBar) {
                  filterBarBridge.__openDesignReviewFilterBar();
                  return;
                }
                window.dispatchEvent(new CustomEvent('open-design-review-filter-bar'));
              }}
              title="展开筛选器"
              className="flex h-8 w-[42px] items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 5H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M6.5 10H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M8.5 15H11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <WorkflowTabs tabs={WORKFLOW_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' ? (
          <div className="mt-8">
            {/* ── A · 状态感知 ─────────────────────────────────── */}
            <div id="section-status" className="scroll-mt-24">
              <SectionDivider label="A" title="状态感知" />
              <div className="space-y-4">
                <PlanningExecutiveCardsPanel cards={planningCards} />
              </div>
            </div>

            {/* ── B · 市场与方向 ──────────────────────────────── */}
            <div id="section-market" className="scroll-mt-24">
              <SectionDivider label="B" title="市场与方向" />
              <div className="space-y-4">
                <TrendDirectionSnapshotPanel data={TREND_DIRECTION_SNAPSHOT} />
                <BusinessInputTargetsPanel targets={businessInputTargets} />
              </div>
            </div>

            {/* ── C · 产品结构 ──────────────────────────────────── */}
            <div id="section-product" className="scroll-mt-24">
              <SectionDivider label="C" title="产品结构" />
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                  <SeasonDesignStrategyPanel strategies={seasonStrategies} />
                  <NewCarryoverSummaryPanel data={newCarryoverSummary} />
                </div>
                <SkuArchitectureMatrix rows={skuArchitectureRows} />
              </div>
            </div>

            {/* ── D · 开发链路 ──────────────────────────────────── */}
            <div id="section-dev" className="scroll-mt-24">
              <SectionDivider label="D" title="开发链路" />
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <MaterialStrategySnapshotPanel data={MATERIAL_STRATEGY_SNAPSHOT} />
                  <ProtoStatusSnapshotPanel data={PROTO_STATUS_MOCK} />
                </div>
                <EngineeringFeasibilityPanel data={engineeringFeasibilityData} />
              </div>
            </div>

            {/* ── E · 财务健康 ──────────────────────────────────── */}
            <div id="section-finance" className="scroll-mt-24">
              <SectionDivider label="E" title="财务健康" />
              <div className="space-y-4">
                <CostMarginHealthPanel rows={costMarginRows} />
              </div>
            </div>

            {/* ── F · 进度与风险 ────────────────────────────────── */}
            <div id="section-risk" className="scroll-mt-24">
              <SectionDivider label="F" title="进度与风险" />
              <div className="space-y-4">
                <DesignPlanningWorkflowPanel nodes={DESIGN_PLANNING_WORKFLOW_NODES} />
                <KeyRisksBlockersPanel risks={designRiskBlockers} blockers={blockers} />
              </div>
            </div>

            {/* Floating side nav (always visible) */}
            <FloatingModuleNav moduleLinks={RELATED_MODULE_LINKS} />
          </div>
        ) : null}

        {activeTab === 'themeStrategy' ? (
          <div className="mt-8">
            <ThemeDirectionPanel strategies={themeStrategies} />
          </div>
        ) : null}

        {activeTab === 'productArchitecture' ? (
          <div className="mt-8">
            <ProductArchitectureWorkbench filtered={filtered} onNavigateTab={(tab) => setActiveTab(tab)} />
          </div>
        ) : null}

        {activeTab === 'developmentTaskPool' ? (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">开发任务池</h2>
              <p className="mt-2 text-sm text-slate-500">承接产品架构、波段研发节点、评审决议和商品企划输入，管理设计、样鞋、材料、成本、BOM 和技术任务。</p>
            </div>
            <TaskPoolWorkbench rows={taskRows} referenceDate={data.referenceDate} />
          </div>
        ) : null}

        {activeTab === 'developmentGateTable' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">波段研发节点</h2>
              <p className="mt-2 text-sm text-slate-500">按波段管控研发节点、关键路径、延期阻塞、责任人、SLA 和上市影响。</p>
            </div>
            <DevelopmentWaveTable groups={gateGroups} referenceDate={data.referenceDate} />
          </div>
        ) : null}

        {activeTab === 'designVersionPreview' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">设计版本</h2>
              <p className="mt-2 text-sm text-slate-500">管理款式版本链、版本对比、素材完整度、商品企划匹配和提交评审准备。</p>
            </div>
            <EffectPreviewPanel chains={versionChains} />
          </div>
        ) : null}

        {activeTab === 'reviewDecisionCenter' ? (
          <ReviewDecisionWorkbench reviews={reviewRows} actions={actionRows} summary={reviewSummary} />
        ) : null}
      </div>
    </div>
  );
}
