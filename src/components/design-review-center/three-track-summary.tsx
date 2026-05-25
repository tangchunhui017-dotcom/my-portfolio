'use client';

import type { ThreeTrackSummaryData } from '@/lib/design-review-center/types';

interface Props {
  data: ThreeTrackSummaryData;
}

interface TrackMetric {
  label: string;
  value: number;
  unit?: string;
  status: 'good' | 'warn' | 'danger' | 'neutral';
}

const STATUS_COLOR: Record<TrackMetric['status'], string> = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  danger: 'text-rose-600',
  neutral: 'text-slate-600',
};

const STATUS_BG: Record<TrackMetric['status'], string> = {
  good: 'bg-emerald-50',
  warn: 'bg-amber-50',
  danger: 'bg-rose-50',
  neutral: 'bg-slate-50',
};

function TrackCard({
  title,
  subtitle,
  icon,
  color,
  metrics,
}: {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  metrics: TrackMetric[];
}) {
  return (
    <article className={`rounded-[24px] border bg-white p-5 shadow-sm ${color}`}>
      {/* Track header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-lg">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Metric rows */}
      <div className="space-y-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${STATUS_BG[metric.status]}`}
          >
            <span className="text-xs text-slate-600">{metric.label}</span>
            <span className={`text-base font-bold ${STATUS_COLOR[metric.status]}`}>
              {metric.value}
              {metric.unit && (
                <span className="text-[11px] font-normal ml-0.5 opacity-70">{metric.unit}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ThreeTrackSummaryPanel({ data }: Props) {
  const designMetrics: TrackMetric[] = [
    {
      label: '待评审款数',
      value: data.design.pendingReviewCount,
      unit: '款',
      status: data.design.pendingReviewCount > 5 ? 'warn' : 'neutral',
    },
    {
      label: '设计高风险款',
      value: data.design.highRiskStyleCount,
      unit: '款',
      status: data.design.highRiskStyleCount > 3 ? 'danger' : data.design.highRiskStyleCount > 0 ? 'warn' : 'good',
    },
    {
      label: '设计方向偏离',
      value: data.design.directionDeviationCount,
      unit: '项',
      status: data.design.directionDeviationCount > 0 ? 'warn' : 'good',
    },
    {
      label: '本周必须拍板',
      value: data.design.mustDecideCount,
      unit: '项',
      status: data.design.mustDecideCount > 3 ? 'danger' : data.design.mustDecideCount > 0 ? 'warn' : 'good',
    },
  ];

  const costMetrics: TrackMetric[] = [
    {
      label: '超目标成本款',
      value: data.cost.overTargetCount,
      unit: '款',
      status: data.cost.overTargetCount > 5 ? 'danger' : data.cost.overTargetCount > 0 ? 'warn' : 'good',
    },
    {
      label: 'BOM 材料待锁',
      value: data.cost.unlockedBomCount,
      unit: '款',
      status: data.cost.unlockedBomCount > 3 ? 'danger' : data.cost.unlockedBomCount > 0 ? 'warn' : 'good',
    },
    {
      label: '毛利风险款',
      value: data.cost.marginRiskCount,
      unit: '款',
      status: data.cost.marginRiskCount > 0 ? 'warn' : 'good',
    },
    {
      label: '需成本复核事项',
      value: data.cost.costReviewCount,
      unit: '项',
      status: data.cost.costReviewCount > 5 ? 'warn' : 'neutral',
    },
  ];

  const devMetrics: TrackMetric[] = [
    {
      label: '延期 Gate 数',
      value: data.development.delayedGateCount,
      unit: '个',
      status: data.development.delayedGateCount > 2 ? 'danger' : data.development.delayedGateCount > 0 ? 'warn' : 'good',
    },
    {
      label: '样品延期款',
      value: data.development.delayedSampleCount,
      unit: '款',
      status: data.development.delayedSampleCount > 3 ? 'danger' : data.development.delayedSampleCount > 0 ? 'warn' : 'good',
    },
    {
      label: '技术风险款',
      value: data.development.technicalRiskCount,
      unit: '款',
      status: data.development.technicalRiskCount > 2 ? 'warn' : 'neutral',
    },
    {
      label: '可上市 SKU',
      value: data.development.readyToLaunchSkuCount,
      unit: '款',
      status: data.development.readyToLaunchSkuCount > 10 ? 'good' : 'neutral',
    },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
          Three-track Summary
        </div>
        <h2 className="text-xl font-bold text-slate-900">三轨摘要</h2>
        <p className="mt-1 text-xs text-slate-400">设计 / 成本 / 开发 三条主线状态快照</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <TrackCard
          title="设计轨摘要"
          subtitle="评审 · 风险 · 方向 · 拍板"
          icon="🎨"
          color="border-violet-100"
          metrics={designMetrics}
        />
        <TrackCard
          title="成本轨摘要"
          subtitle="成本 · BOM · 毛利 · 复核"
          icon="💰"
          color="border-amber-100"
          metrics={costMetrics}
        />
        <TrackCard
          title="开发轨摘要"
          subtitle="Gate · 样品 · 技术 · 上市"
          icon="⚙️"
          color="border-blue-100"
          metrics={devMetrics}
        />
      </div>
    </section>
  );
}
