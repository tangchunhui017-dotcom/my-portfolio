'use client';

import { useMemo } from 'react';
import type { ArchHealthDimension, ArchRiskLevel } from '@/lib/design-review-center/types';

interface Props {
  dimensions: ArchHealthDimension[];
}

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

const RISK_BG: Record<ArchRiskLevel, string> = {
  healthy: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  high_risk: 'bg-red-50 border-red-200',
};

const RISK_LABEL: Record<ArchRiskLevel, string> = {
  healthy: '健康',
  warning: '预警',
  high_risk: '高风险',
};

export default function ArchHealthScore({ dimensions }: Props) {
  const overallScore = useMemo(() => {
    const avg = dimensions.reduce((s, d) => s + d.variance, 0) / dimensions.length;
    return Math.round(avg);
  }, [dimensions]);

  const overallRisk: ArchRiskLevel =
    overallScore >= 85 ? 'healthy' : overallScore >= 65 ? 'warning' : 'high_risk';

  const riskCounts = useMemo(() => ({
    high_risk: dimensions.filter((d) => d.riskLevel === 'high_risk').length,
    warning: dimensions.filter((d) => d.riskLevel === 'warning').length,
    healthy: dimensions.filter((d) => d.riskLevel === 'healthy').length,
  }), [dimensions]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 04</span>
          <h3 className="text-base font-semibold text-slate-900">架构健康评分</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">10维度量化评估架构完整性与执行可行性</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Overall score */}
        <div className="flex items-center gap-6">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={overallRisk === 'healthy' ? '#10b981' : overallRisk === 'warning' ? '#f59e0b' : '#ef4444'}
                strokeWidth="2.5"
                strokeDasharray={`${overallScore} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{overallScore}</span>
              <span className="text-[10px] text-slate-500">综合分</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex gap-4">
              {(['high_risk', 'warning', 'healthy'] as ArchRiskLevel[]).map((r) => (
                <div key={r} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${RISK_BG[r]}`}>
                  <span className={`text-xl font-bold ${RISK_TEXT[r]}`}>{riskCounts[r]}</span>
                  <span className={`text-xs ${RISK_TEXT[r]}`}>{RISK_LABEL[r]}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              共 {dimensions.length} 个评估维度 · 满分 100 分
            </p>
          </div>
        </div>

        {/* Dimension rows */}
        <div className="space-y-3">
          {dimensions.map((dim) => (
            <DimensionRow key={dim.dimensionKey} dim={dim} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DimensionRow({ dim }: { dim: ArchHealthDimension }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{dim.dimension}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${RISK_BG[dim.riskLevel]} ${RISK_TEXT[dim.riskLevel]}`}>
            {RISK_LABEL[dim.riskLevel]}
          </span>
        </div>
        <span className={`text-sm font-bold ${RISK_TEXT[dim.riskLevel]}`}>{dim.variance}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${RISK_BAR[dim.riskLevel]}`}
          style={{ width: `${dim.variance}%` }}
        />
      </div>
      {(dim.deductionReason || dim.recommendedAction) && (
        <div className="flex flex-wrap gap-3 text-xs">
          {dim.deductionReason && (
            <span className="text-red-600">扣分：{dim.deductionReason}</span>
          )}
          {dim.recommendedAction && (
            <span className="text-blue-600">建议：{dim.recommendedAction}</span>
          )}
        </div>
      )}
    </div>
  );
}
