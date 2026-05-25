'use client';

import type { ProductArchitectureDecisionSummary } from '@/lib/design-review-center/types';

interface Props {
  data: ProductArchitectureDecisionSummary;
}

const STATUS_CONFIG = {
  healthy: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: '架构健康' },
  warning: { bar: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: '存在风险' },
  high_risk: { bar: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: '高风险' },
};

export default function ArchDecisionSummary({ data }: Props) {
  const cfg = STATUS_CONFIG[data.architectureStatus];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Status header bar */}
      <div className={`${cfg.bar} h-1.5`} />

      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 ${cfg.bg}`}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 01</span>
          <h3 className="text-base font-semibold text-slate-900">产品架构决策摘要</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Metric chips */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricChip
            label="架构款式总数"
            value={`${data.totalStyleCount} 款`}
            sub={`共 ${data.totalSkuCount} SKU`}
            risk="healthy"
          />
          <MetricChip
            label="主推款 Hero"
            value={`${data.heroStyleCount} / ${data.heroStyleCount + data.missingHeroCount} 款`}
            sub={data.missingHeroCount > 0 ? `缺口 ${data.missingHeroCount} 款` : '已达标'}
            risk={data.missingHeroCount > 0 ? 'high_risk' : 'healthy'}
          />
          <MetricChip
            label="新开模数"
            value={`${data.newMoldCount} / ${data.newMoldLimit} 套`}
            sub={data.newMoldCount > data.newMoldLimit ? `超额 ${data.newMoldCount - data.newMoldLimit} 套` : '在控'}
            risk={data.newMoldCount > data.newMoldLimit ? 'high_risk' : 'healthy'}
          />
          <MetricChip
            label="OTB承接覆盖"
            value={`${Math.round(data.otbCoverage * 100)}%`}
            sub={data.otbBreached ? 'OTB超预算' : 'OTB正常'}
            risk={data.otbBreached ? 'high_risk' : 'healthy'}
          />
        </div>

        {/* Main issue + opportunity */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400">主要问题</p>
            <p className="text-sm text-red-800">{data.mainIssue}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">主要机会</p>
            <p className="text-sm text-emerald-800">{data.mainOpportunity}</p>
          </div>
        </div>

        {/* Suggest add / reduce */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">建议增加方向</p>
            <div className="flex flex-wrap gap-2">
              {data.suggestAddDirections.map((d) => (
                <span key={d} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  + {d}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">建议压缩方向</p>
            <div className="flex flex-wrap gap-2">
              {data.suggestReduceDirections.map((d) => (
                <span key={d} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                  − {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Alert row */}
        <div className="flex flex-wrap gap-3">
          {data.waveImpact && (
            <AlertBadge color="amber" text={`波段影响：${data.waveImpactReason ?? '波段节点存在风险'}`} />
          )}
          {data.costBreached && (
            <AlertBadge color="red" text="成本超标：架构成本估算超出OTB成本带" />
          )}
          {data.otbBreached && (
            <AlertBadge color="red" text="OTB超预算：请重新对齐OTB拆解" />
          )}
          <SharedEfficiencyBadge sharedSole={data.sharedSoleRate} sharedLast={data.sharedLastRate} />
        </div>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  sub,
  risk,
}: {
  label: string;
  value: string;
  sub: string;
  risk: 'healthy' | 'warning' | 'high_risk';
}) {
  const colors = {
    healthy: 'border-slate-200 bg-slate-50',
    warning: 'border-amber-200 bg-amber-50',
    high_risk: 'border-red-200 bg-red-50',
  };
  const textColors = {
    healthy: 'text-slate-700',
    warning: 'text-amber-800',
    high_risk: 'text-red-800',
  };
  const subColors = {
    healthy: 'text-slate-500',
    warning: 'text-amber-600',
    high_risk: 'text-red-600',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[risk]}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${textColors[risk]}`}>{value}</p>
      <p className={`text-xs ${subColors[risk]}`}>{sub}</p>
    </div>
  );
}

function AlertBadge({ color, text }: { color: 'red' | 'amber'; text: string }) {
  const cls =
    color === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${cls}`}>
      <span>{color === 'red' ? '⚠' : '◆'}</span>
      <span>{text}</span>
    </div>
  );
}

function SharedEfficiencyBadge({ sharedSole, sharedLast }: { sharedSole: number; sharedLast: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
      <span>共楦 {Math.round(sharedLast * 100)}%</span>
      <span className="text-slate-300">·</span>
      <span>共底 {Math.round(sharedSole * 100)}%</span>
    </div>
  );
}
