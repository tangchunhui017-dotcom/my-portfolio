'use client';

import type { ProductRoleMixItem, ArchRiskLevel } from '@/lib/design-review-center/types';

interface Props {
  items: ProductRoleMixItem[];
}

const RISK_CLS: Record<ArchRiskLevel, string> = {
  healthy: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  high_risk: 'border-red-200 bg-red-50',
};

const RISK_TEXT: Record<ArchRiskLevel, string> = {
  healthy: 'text-emerald-700',
  warning: 'text-amber-700',
  high_risk: 'text-red-700',
};

const RISK_BAR: Record<ArchRiskLevel, string> = {
  healthy: 'bg-emerald-400',
  warning: 'bg-amber-400',
  high_risk: 'bg-red-500',
};

const RISK_LABEL: Record<ArchRiskLevel, string> = {
  healthy: '健康',
  warning: '预警',
  high_risk: '高风险',
};

export default function ArchProductRoleMix({ items }: Props) {
  const total = items.reduce((s, i) => s + i.currentStyleCount, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 05</span>
          <h3 className="text-base font-semibold text-slate-900">产品角色结构</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">各产品角色当前款数与目标配比健康度对比</p>
      </div>

      {/* Overall share bar */}
      <div className="px-6 pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">当前款数分布（共 {total} 款）</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          {items
            .filter((i) => i.currentStyleCount > 0)
            .map((i) => (
              <div
                key={i.role}
                title={`${i.roleLabel} ${i.currentStyleCount}款`}
                className={`h-full ${RISK_BAR[i.riskLevel]} opacity-70`}
                style={{ width: `${(i.currentStyleCount / Math.max(total, 1)) * 100}%` }}
              />
            ))}
        </div>
      </div>

      <div className="p-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <RoleCard key={item.role} item={item} />
        ))}
      </div>
    </div>
  );
}

function RoleCard({ item }: { item: ProductRoleMixItem }) {
  const shareVariance = item.targetShare > 0
    ? ((item.currentShare - item.targetShare) / item.targetShare) * 100
    : 0;

  return (
    <div className={`rounded-xl border p-3 space-y-2.5 ${RISK_CLS[item.riskLevel]}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-bold text-slate-800 leading-tight">{item.roleLabel}</p>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${RISK_CLS[item.riskLevel]} ${RISK_TEXT[item.riskLevel]}`}>
          {RISK_LABEL[item.riskLevel]}
        </span>
      </div>

      {/* Count */}
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${RISK_TEXT[item.riskLevel]}`}>{item.currentStyleCount}</span>
        <span className="text-xs text-slate-500">/ {item.plannedStyleCount} 款</span>
      </div>

      {/* Share comparison */}
      <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>占比 {Math.round(item.currentShare * 100)}%</span>
          <span>目标 {Math.round(item.targetShare * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
          <div
            className={`h-full rounded-full ${RISK_BAR[item.riskLevel]}`}
            style={{ width: `${Math.min((item.currentShare / Math.max(item.targetShare, 0.01)) * 100, 120)}%` }}
          />
        </div>
        {shareVariance !== 0 && (
          <p className={`mt-1 text-[11px] font-semibold ${shareVariance > 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {shareVariance > 0 ? '+' : ''}{Math.round(shareVariance)}% vs 目标
          </p>
        )}
      </div>

      {/* Price band & consumer */}
      <div className="text-[11px] text-slate-500 space-y-0.5">
        <p>{item.mainPriceBand}</p>
        <p className="truncate">{item.targetConsumer}</p>
      </div>

      {/* Action */}
      <p className="text-[11px] text-slate-600 leading-relaxed border-t border-white/50 pt-2">
        {item.recommendedAction}
      </p>
    </div>
  );
}
