'use client';

import { useMemo, useRef, useState } from 'react';
import CategoryBreakdownPanel from '@/components/design-review-center/category-breakdown-panel';
import DevelopmentWaveTable from '@/components/design-review-center/development-wave-table';
import EffectPreviewPanel from '@/components/design-review-center/effect-preview-panel';
import FilterBar, { type FilterState } from '@/components/design-review-center/filter-bar';
import PlatformTopology from '@/components/design-review-center/PlatformTopology';
import PriceGapAnalysis from '@/components/design-review-center/PriceGapAnalysis';
import ProductArchitecturePanel from '@/components/design-review-center/product-architecture-panel';
import ProductPyramid from '@/components/design-review-center/ProductPyramid';
import RiskPanel from '@/components/design-review-center/risk-panel';
import SeasonHealthCard from '@/components/design-review-center/SeasonHealthCard';
import SeasonOverviewCards from '@/components/design-review-center/season-overview-cards';
import TaskPanel from '@/components/design-review-center/task-panel';
import ThemeDirectionPanel from '@/components/design-review-center/theme-direction-panel';
import WorkflowTabs from '@/components/design-review-center/workflow-tabs';
import { WORKFLOW_TABS, type WorkflowTabKey } from '@/config/design-review-center/workflow-tabs';
import type { DesignReviewCenterData } from '@/lib/design-review-center/assembler';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import { ExportButton } from '@/lib/design-review-center/ExportEngine';
import { createDesignVersionChains } from '@/lib/design-review-center/selectors/assets';
import { DEFAULT_DESIGN_REVIEW_FILTERS, filterDesignReviewCenterData } from '@/lib/design-review-center/selectors/filters';
import { createGateWaveGroups } from '@/lib/design-review-center/selectors/gates';
import { createReviewActionRows, createReviewDecisionRows, summarizeReviewDecisionCenter } from '@/lib/design-review-center/selectors/reviews';

interface DesignReviewCenterClientProps {
  data: DesignReviewCenterData;
}

export default function DesignReviewCenterClient({ data }: DesignReviewCenterClientProps) {
  const defaultYear = data.projects[0]?.year ?? data.derived.filterOptions.years[0]?.value ?? '';
  const [activeTab, setActiveTab] = useState<WorkflowTabKey>('overview');
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_DESIGN_REVIEW_FILTERS, year: defaultYear });
  const [pyramidLayer, setPyramidLayer] = useState<string | null>(null);
  const architectureRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterDesignReviewCenterData(data, filters), [data, filters]);
  const taskRows = filtered.styles.map((aggregate) => aggregate.taskRow);
  const themeStrategies = filtered.series.map((aggregate) => aggregate.themeStrategy);
  const mustDecide = filtered.overview.mustDecide.slice(0, 4);
  const blockers = filtered.overview.blockers.slice(0, 4);
  const gateGroups = useMemo(() => createGateWaveGroups(filtered.styles), [filtered.styles]);
  const versionChains = useMemo(() => createDesignVersionChains(filtered.styles), [filtered.styles]);
  const reviewRows = useMemo(() => createReviewDecisionRows(filtered.styles, data.referenceDate), [data.referenceDate, filtered.styles]);
  const actionRows = useMemo(() => createReviewActionRows(filtered.styles, data.referenceDate), [data.referenceDate, filtered.styles]);
  const reviewSummary = useMemo(() => summarizeReviewDecisionCenter(reviewRows, actionRows), [actionRows, reviewRows]);

  const designTrackCards = [
    { title: '设计轨摘要', body: filtered.overview.designTrackSummary },
    { title: '成本轨摘要', body: filtered.overview.costTrackSummary },
    { title: '开发轨摘要', body: filtered.overview.developmentTrackSummary },
  ];

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
            <p className="mt-1 text-sm text-slate-500">围绕系列策略、产品架构、Gate、版本和评审闭环统一查看设计开发进度 · 数据时间 {data.referenceDate}</p>
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
          <div className="mt-8 space-y-8">
            <SeasonHealthCard overview={filtered.overview} />
            <SeasonOverviewCards overview={filtered.overview} />

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">本周必须拍板</div>
                <div className="mt-4 space-y-4">
                  {mustDecide.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-6 text-sm text-slate-500">当前筛选范围内暂无本周必须拍板事项。</div>
                  ) : (
                    mustDecide.map((item) => (
                      <div key={item.styleId} className="rounded-[24px] border border-slate-200/75 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4">
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</div>
                        <div className="mt-3 text-xs text-slate-500">负责人 {item.owner} / 截止 {formatDate(item.dueDate)}</div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">当前阻塞点</div>
                <div className="mt-4 space-y-4">
                  {blockers.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-6 text-sm text-slate-500">当前筛选范围内暂无硬阻塞，开发节奏可按计划推进。</div>
                  ) : (
                    blockers.map((item) => (
                      <div key={item.styleId} className="rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,#fff8f9_0%,#fff5f7_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <div className="font-medium text-slate-900">{item.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</div>
                        <div className="mt-3 text-xs text-slate-500">责任人 {item.owner} / 截止 {formatDate(item.dueDate)}</div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">三轨摘要</div>
                <div className="mt-4 space-y-4">
                  {designTrackCards.map((card) => (
                    <div key={card.title} className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4">
                      <div className="font-medium text-slate-900">{card.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{card.body}</div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </div>
        ) : null}

        {activeTab === 'themeStrategy' ? (
          <div className="mt-8">
            <ThemeDirectionPanel strategies={themeStrategies} />
          </div>
        ) : null}

        {activeTab === 'productArchitecture' ? (
          <div ref={architectureRef} className="mt-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold text-slate-950">产品架构</h2>
                <p className="mt-2 text-sm text-slate-500">用 OTB 转译结果驱动鞋类品类、风格角色、底楦结构、开发属性与平台策略，再向开发任务池下发约束。</p>
              </div>
              <ExportButton
                targetRef={architectureRef}
                config={{ filenamePrefix: '产品架构企划书', headerText: `${filtered.architecture.profileLabel} · 产品架构企划书` }}
              />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <ProductPyramid architecture={filtered.architecture} activeLayer={pyramidLayer} onLayerClick={setPyramidLayer} />
              <PriceGapAnalysis architecture={filtered.architecture} />
            </div>
            <PlatformTopology architecture={filtered.architecture} />
            <ProductArchitecturePanel architecture={filtered.architecture} pyramidFilter={pyramidLayer} />
          </div>
        ) : null}

        {activeTab === 'developmentTaskPool' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">开发任务池</h2>
              <p className="mt-2 text-sm text-slate-500">围绕单款推进中心跟踪设计、样鞋、材料、成本、技术与动作闭环，适合周会直接使用。</p>
            </div>
            <CategoryBreakdownPanel rows={taskRows} />
          </div>
        ) : null}

        {activeTab === 'developmentGateTable' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">波段与研发 Gate 表</h2>
              <p className="mt-2 text-sm text-slate-500">按标准 Gate 管理企划、设计、开发、成本和上市承接节点，统一跟踪计划、实际、风险和责任人。</p>
            </div>
            <DevelopmentWaveTable groups={gateGroups} />
          </div>
        ) : null}

        {activeTab === 'designVersionPreview' ? (
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">设计版本预览</h2>
              <p className="mt-2 text-sm text-slate-500">用单款版本链把材料、配色、底台、楦型、成本和评审结论放到同一视图里判断。</p>
            </div>
            <EffectPreviewPanel chains={versionChains} />
          </div>
        ) : null}

        {activeTab === 'reviewDecisionCenter' ? (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">评审决议中心</h2>
              <p className="mt-2 text-sm text-slate-500">以 ReviewRecord + ActionItem 作为闭环出口，统一推进未关闭动作、本周待复审和阻塞项。</p>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">未关闭评审</div><div className="mt-3 text-3xl font-semibold text-slate-950">{reviewSummary.openReviewCount}</div></article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">未关闭动作</div><div className="mt-3 text-3xl font-semibold text-slate-950">{reviewSummary.openActionCount}</div></article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">本周待复审</div><div className="mt-3 text-3xl font-semibold text-amber-600">{reviewSummary.dueThisWeekReviewCount + reviewSummary.dueThisWeekActionCount}</div></article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">阻塞 / 逾期</div><div className="mt-3 text-3xl font-semibold text-rose-600">{reviewSummary.blockedCount + reviewSummary.overdueActionCount}</div></article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <RiskPanel reviews={reviewRows} />
              <TaskPanel actions={actionRows} />
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
