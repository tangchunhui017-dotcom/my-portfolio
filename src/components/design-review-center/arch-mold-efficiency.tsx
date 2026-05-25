'use client';

import type { SharedLastSoleMoldEfficiency, ArchRiskLevel } from '@/lib/design-review-center/types';

interface Props {
  data: SharedLastSoleMoldEfficiency;
}

const RISK_CLS: Record<ArchRiskLevel, string> = {
  healthy: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  high_risk: 'border-red-200 bg-red-50',
};

const RISK_BAR: Record<ArchRiskLevel, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-400',
  high_risk: 'bg-red-500',
};

const RISK_TEXT: Record<ArchRiskLevel, string> = {
  healthy: 'text-emerald-700',
  warning: 'text-amber-700',
  high_risk: 'text-red-700',
};

const RISK_LABEL: Record<ArchRiskLevel, string> = {
  healthy: '健康',
  warning: '预警',
  high_risk: '高风险',
};

function riskFromRate(actual: number, target: number): ArchRiskLevel {
  const ratio = actual / target;
  if (ratio >= 0.9) return 'healthy';
  if (ratio >= 0.75) return 'warning';
  return 'high_risk';
}

export default function ArchMoldEfficiency({ data }: Props) {
  const lastRisk = riskFromRate(data.sharedLastRate, 0.75);
  const soleRisk = riskFromRate(data.sharedSoleRate, 0.75);
  const moldRisk = data.newMoldRisk;
  const platformRisk = riskFromRate(data.platformReuseRate, data.platformReuseTarget);

  const metrics = [
    {
      label: '共楦率',
      value: `${Math.round(data.sharedLastRate * 100)}%`,
      target: `目标 ≥75%`,
      progress: data.sharedLastRate,
      progressMax: 0.75,
      sub: `${data.sharedLastCount}/${data.sharedLastTarget} 款共楦`,
      risk: lastRisk,
    },
    {
      label: '共底率',
      value: `${Math.round(data.sharedSoleRate * 100)}%`,
      target: `目标 ≥75%`,
      progress: data.sharedSoleRate,
      progressMax: 0.75,
      sub: `${data.sharedSoleCount}/${data.sharedSoleTarget} 款共底`,
      risk: soleRisk,
    },
    {
      label: '新开模数',
      value: `${data.newMoldCount} 套`,
      target: `限额 ${data.moldBudget} 套`,
      progress: Math.min(data.newMoldCount / data.moldBudget, 1.5),
      progressMax: 1,
      sub: data.newMoldCount > data.moldBudget ? `超出 ${data.newMoldCount - data.moldBudget} 套` : '在控',
      risk: moldRisk,
    },
    {
      label: '平台复用率',
      value: `${Math.round(data.platformReuseRate * 100)}%`,
      target: `目标 ${Math.round(data.platformReuseTarget * 100)}%`,
      progress: data.platformReuseRate,
      progressMax: data.platformReuseTarget,
      sub: '中底/外底平台复用',
      risk: platformRisk,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 10</span>
          <h3 className="text-base font-semibold text-slate-900">共楦共底新模效率</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">量化共模平台化效率，识别新模超额风险与开发成本压力</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <MoldMetricCard key={m.label} {...m} />
          ))}
        </div>

        {/* Cost impact */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">开发成本影响</p>
          <p className="text-sm text-red-800">{data.developmentCostImpact}</p>
          {data.launchDelayRisk !== 'healthy' && (
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${RISK_CLS[data.launchDelayRisk]} ${RISK_TEXT[data.launchDelayRisk]}`}>
              上市延期风险：{RISK_LABEL[data.launchDelayRisk]}
            </span>
          )}
        </div>

        {/* Recommendation */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">优化建议</p>
          <p className="text-sm text-blue-800">{data.recommendedAction}</p>
        </div>
      </div>
    </div>
  );
}

function MoldMetricCard({
  label,
  value,
  target,
  progress,
  progressMax,
  sub,
  risk,
}: {
  label: string;
  value: string;
  target: string;
  progress: number;
  progressMax: number;
  sub: string;
  risk: ArchRiskLevel;
}) {
  const pct = Math.min((progress / progressMax) * 100, 100);
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${RISK_CLS[risk]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${RISK_TEXT[risk]}`}>{value}</p>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${RISK_CLS[risk]} ${RISK_TEXT[risk]}`}>
          {RISK_LABEL[risk]}
        </span>
      </div>
      <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>{target}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
          <div
            className={`h-full rounded-full ${RISK_BAR[risk]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
