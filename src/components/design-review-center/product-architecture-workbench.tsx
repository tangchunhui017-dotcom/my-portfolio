'use client';

import { useState, useMemo } from 'react';
import type { FilteredDesignReviewCenterData } from '@/lib/design-review-center/selectors/filters';
import type { WorkflowTabKey } from '@/config/design-review-center/workflow-tabs';
import type { DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';

import ProductArchitecturePanel from './product-architecture-panel';
import ProductPyramid from './ProductPyramid';
import PriceGapAnalysis from './PriceGapAnalysis';
import ArchLandingSummary from './arch-landing-summary';
import ArchMerchInputAlignment from './arch-merch-input-alignment';
import ArchStyleSlotBreakdown from './arch-style-slot-breakdown';
import ArchPriceCostMargin from './arch-price-cost-margin';
import ArchRiskDecisions from './arch-risk-decisions';
import ArchWaveLaunchPlan from './arch-wave-launch-plan';
import FloatingModuleNav from './floating-module-nav';

import {
  buildProductArchLandingSummary,
  buildArchInputAlignmentRows,
  buildStyleSlotBreakdown,
  buildPriceCostMarginRows,
  buildArchRiskDecisions,
  buildWaveLaunchPlan,
} from '@/lib/design-review-center/arch-derivations';

const ARCH_MODULE_LINKS: DesignPlanningRelatedModuleLink[] = [
  {
    linkId: 'arch-theme-strategy',
    label: '主题与系列策略',
    description: '回顾系列方向与设计语言',
    actionLabel: '查看主题策略',
    relatedRoute: '/design-review-center?tab=themeStrategy',
    category: 'internal',
    icon: '🎨',
  },
  {
    linkId: 'arch-dev-pool',
    label: '开发任务池',
    description: '查看单款设计 brief 与下发状态',
    actionLabel: '查看开发任务',
    relatedRoute: '/design-review-center?tab=developmentTaskPool',
    category: 'internal',
    icon: '📁',
  },
  {
    linkId: 'arch-gate-table',
    label: '波段研发节点',
    description: '波段节点跟踪',
    actionLabel: '查看节点风险',
    relatedRoute: '/design-review-center?tab=developmentGateTable',
    category: 'internal',
    icon: '🗓️',
  },
  {
    linkId: 'arch-version',
    label: '设计版本',
    description: '材料配色判断',
    actionLabel: '查看设计版本',
    relatedRoute: '/design-review-center?tab=designVersionPreview',
    category: 'internal',
    icon: '🖼️',
  },
  {
    linkId: 'arch-review',
    label: '评审决议',
    description: '架构决议归档',
    actionLabel: '查看评审决议',
    relatedRoute: '/design-review-center?tab=reviewDecisionCenter',
    category: 'internal',
    icon: '✅',
  },
];

const navIconClass = 'w-2.5 h-2.5';
const ARCH_PAGE_SECTIONS = [
  {
    anchor: '#section-arch-overview',
    label: '总览',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" />
        <rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.7" />
        <rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    anchor: '#section-strategy',
    label: '战略',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5 14.5 13.5H1.5L8 1.5z" />
        <line x1="4.5" y1="9" x2="11.5" y2="9" />
        <line x1="6" y1="6" x2="10" y2="6" />
      </svg>
    ),
  },
  {
    anchor: '#section-matrix',
    label: '矩阵',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    anchor: '#section-wave',
    label: '波段',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 10 Q 4 4 7 10 T 13 10 T 15 10" />
        <circle cx="4" cy="8" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="10" cy="8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    anchor: '#section-style-slots',
    label: '款位',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="4" x2="14" y2="4" />
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="2" y1="12" x2="14" y2="12" />
        <circle cx="0.5" cy="4" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="0.5" cy="8" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="0.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    anchor: '#section-financial',
    label: '财务',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6.5" />
        <text x="8" y="11" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">¥</text>
      </svg>
    ),
  },
  {
    anchor: '#section-merch-input',
    label: '承接',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,8 6.5,12 14,4" />
      </svg>
    ),
  },
  {
    anchor: '#section-risk',
    label: '风险',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={navIconClass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5 14.5 13.5H1.5L8 1.5z" />
        <line x1="8" y1="6" x2="8" y2="9.5" />
        <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

interface Props {
  filtered: FilteredDesignReviewCenterData;
  onNavigateTab?: (tab: WorkflowTabKey) => void;
}

export default function ProductArchitectureWorkbench({ filtered, onNavigateTab }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pyramidLayer, setPyramidLayer] = useState<string | null>(null);

  const handleNavigateStr = onNavigateTab
    ? (tab: string) => onNavigateTab(tab as WorkflowTabKey)
    : undefined;

  const landingSummary = useMemo(() => buildProductArchLandingSummary(filtered), [filtered]);
  const inputRows = useMemo(() => buildArchInputAlignmentRows(filtered), [filtered]);
  const styleSlots = useMemo(() => buildStyleSlotBreakdown(filtered), [filtered]);
  const priceCostRows = useMemo(() => buildPriceCostMarginRows(filtered), [filtered]);
  const riskDecisions = useMemo(() => buildArchRiskDecisions(filtered), [filtered]);
  const waveLaunchGroups = useMemo(() => buildWaveLaunchPlan(filtered), [filtered]);

  return (
    <div className="space-y-12">
      {/* Section A · 架构落地总览 */}
      <section id="section-arch-overview" className="scroll-mt-24">
        <SectionDivider label="A" title="架构落地总览" />
        <ArchLandingSummary data={landingSummary} />
      </section>

      {/* Section B · 战略分层与价格定位 */}
      <section id="section-strategy" className="scroll-mt-24">
        <SectionDivider label="B" title="产品分层与价格定位" />
        <div className="grid gap-6 xl:grid-cols-2">
          <ProductPyramid
            architecture={filtered.architecture}
            activeLayer={pyramidLayer}
            onLayerClick={setPyramidLayer}
          />
          <PriceGapAnalysis architecture={filtered.architecture} />
        </div>
      </section>

      {/* Section C · 产品架构矩阵 */}
      <section id="section-matrix" className="scroll-mt-24">
        <SectionDivider label="C" title="鞋类产品架构矩阵" />
        <ProductArchitecturePanel
          architecture={filtered.architecture}
          pyramidFilter={pyramidLayer}
          onCategoryClick={setSelectedCategory}
        />
        {pyramidLayer && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            <span>
              金字塔过滤：<strong>{pyramidLayer}</strong> 层款式已高亮
            </span>
            <button
              type="button"
              onClick={() => setPyramidLayer(null)}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              × 清除
            </button>
          </div>
        )}
        {selectedCategory && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            <span>
              已选中品类：<strong>{selectedCategory}</strong>
              &nbsp;· 款位清单已联动筛选
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="ml-auto text-blue-500 hover:text-blue-700"
            >
              × 清除
            </button>
          </div>
        )}
      </section>

      {/* Section D · 波段上市分布 */}
      <section id="section-wave" className="scroll-mt-24">
        <SectionDivider label="D" title="波段上市分布" />
        <ArchWaveLaunchPlan groups={waveLaunchGroups} />
      </section>

      {/* Section E · 款位拆解清单 */}
      <section id="section-style-slots" className="scroll-mt-24">
        <SectionDivider label="E" title="款位拆解清单" />
        <ArchStyleSlotBreakdown
          slots={styleSlots}
          selectedCategory={selectedCategory ?? undefined}
        />
      </section>

      {/* Section F · 价格 / 成本 / 毛利 */}
      <section id="section-financial" className="scroll-mt-24">
        <SectionDivider label="F" title="价格 / 成本 / 毛利校验" />
        <ArchPriceCostMargin rows={priceCostRows} />
      </section>

      {/* Section G · 企划输入承接 */}
      <section id="section-merch-input" className="scroll-mt-24">
        <SectionDivider label="G" title="商品企划输入承接" />
        <ArchMerchInputAlignment rows={inputRows} onNavigateTab={handleNavigateStr} />
      </section>

      {/* Section H · 架构风险与待决策 */}
      <section id="section-risk" className="scroll-mt-24">
        <SectionDivider label="H" title="架构风险与待决策" />
        <ArchRiskDecisions items={riskDecisions} onNavigateTab={handleNavigateStr} />
      </section>

      <FloatingModuleNav moduleLinks={ARCH_MODULE_LINKS} pageSections={ARCH_PAGE_SECTIONS} />
    </div>
  );
}

function SectionDivider({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  );
}


