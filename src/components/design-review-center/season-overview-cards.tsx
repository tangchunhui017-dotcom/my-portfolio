'use client';

import type { SeasonOverview } from '@/lib/design-review-center/types';

interface SeasonOverviewCardsProps {
  overview: SeasonOverview;
}

export default function SeasonOverviewCards({ overview }: SeasonOverviewCardsProps) {
  const cards = [
    {
      label: '当前季节 / 波段',
      value: `${overview.season} / ${overview.currentWave}`,
      sub: '',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      label: '距关键节点',
      value: `${overview.milestoneCountdown.daysLeft} 天`,
      sub: overview.milestoneCountdown.nextMilestone,
      color: 'from-violet-500 to-purple-500',
    },
    {
      label: '系列进度',
      value: `${overview.activeSeries} / ${overview.totalSeries}`,
      sub: `已完成 ${overview.completedSeries}`,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: '设计健康度',
      value: String(overview.designHealthScore),
      sub: '综合评分',
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: '资产完成度',
      value: `${Math.round(overview.assetCompletionRate * 100)}%`,
      sub: '图像资产',
      color: 'from-pink-500 to-rose-500',
    },
    {
      label: '风险项',
      value: String(overview.highRiskItems),
      sub: `延期节点 ${overview.delayedMilestones}`,
      color: 'from-red-500 to-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-medium text-slate-500">{card.label}</div>
          <div className={`bg-gradient-to-r ${card.color} bg-clip-text text-2xl font-bold text-transparent`}>
            {card.value}
          </div>
          {card.sub ? <div className="mt-1 text-xs text-slate-500">{card.sub}</div> : null}
        </article>
      ))}
    </div>
  );
}
