'use client';

import type { DesignReviewOverview } from '@/lib/design-review-center/types';

interface SeasonOverviewCardsProps {
  overview: DesignReviewOverview;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const CARD_TONES = {
  primary: {
    line: 'from-sky-400 to-blue-500',
    badge: 'bg-sky-50 text-sky-700',
  },
  success: {
    line: 'from-emerald-400 to-teal-500',
    badge: 'bg-emerald-50 text-emerald-700',
  },
  strategy: {
    line: 'from-indigo-400 to-violet-500',
    badge: 'bg-indigo-50 text-indigo-700',
  },
  warning: {
    line: 'from-amber-400 to-orange-500',
    badge: 'bg-amber-50 text-amber-700',
  },
  accent: {
    line: 'from-rose-400 to-fuchsia-500',
    badge: 'bg-rose-50 text-rose-700',
  },
  neutral: {
    line: 'from-slate-500 to-slate-800',
    badge: 'bg-slate-100 text-slate-700',
  },
};

export default function SeasonOverviewCards({ overview }: SeasonOverviewCardsProps) {
  const cards = [
    {
      label: '本季开发总款数',
      value: String(overview.totalStyles),
      sub: `已立项 ${overview.initiatedStyles} / 开发中 ${overview.inDevelopmentStyles}`,
      tone: 'primary' as const,
    },
    {
      label: '已锁定 / 已取消',
      value: `${overview.lockedStyles} / ${overview.cancelledStyles}`,
      sub: '锁定款与取消款同步监控',
      tone: 'success' as const,
    },
    {
      label: '主推款锁定率',
      value: percent(overview.leadLockRate),
      sub: '只统计 lead style',
      tone: 'strategy' as const,
    },
    {
      label: '高风险款数',
      value: String(overview.highRiskStyles),
      sub: `延期 Gate ${overview.delayedGateCount}`,
      tone: 'warning' as const,
    },
    {
      label: '样鞋完成率',
      value: percent(overview.sampleCompletionRate),
      sub: '样鞋状态已完成占比',
      tone: 'accent' as const,
    },
    {
      label: 'BOM 锁定率',
      value: percent(overview.bomLockRate),
      sub: '进入锁价与上市承接前的核心指标',
      tone: 'neutral' as const,
    },
  ];

  const architectureCards = overview.architectureSummary
    ? [
        {
          label: '架构目标',
          value: `${overview.architectureSummary.styleTarget} / ${overview.architectureSummary.skuTarget}`,
          sub: `品类 ${overview.architectureSummary.categoryCount} / 主推占比 ${percent(overview.architectureSummary.leadStyleRate)}`,
          tone: 'primary' as const,
        },
        {
          label: '平台策略',
          value: `${percent(overview.architectureSummary.sharedOutsoleRate)} / ${percent(overview.architectureSummary.sharedLastRate)}`,
          sub: `新开模 ${percent(overview.architectureSummary.newToolingRate)} / 复用 ${percent(overview.architectureSummary.platformReuseRate)}`,
          tone: 'success' as const,
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-4">
      {[...cards, ...architectureCards].map((card) => {
        const tone = CARD_TONES[card.tone];
        return (
          <article key={card.label} className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{card.label}</div>
                <div className={['mt-3 h-1.5 w-14 rounded-full bg-gradient-to-r', tone.line].join(' ')} />
              </div>
              <span className={['rounded-full px-2 py-1 text-[11px] font-semibold', tone.badge].join(' ')}>概览</span>
            </div>
            <div className="mt-5 text-[30px] font-semibold tracking-tight text-slate-950">{card.value}</div>
            <div className="mt-3 text-sm leading-6 text-slate-500">{card.sub}</div>
          </article>
        );
      })}
    </div>
  );
}
