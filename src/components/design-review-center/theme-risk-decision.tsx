'use client';

import { useState } from 'react';
import type { ThemeRiskDecisionItem } from '@/lib/design-review-center/types';

interface ThemeRiskDecisionProps {
  risks: ThemeRiskDecisionItem[];
}

const RISK_TYPE_LABELS: Record<ThemeRiskDecisionItem['riskType'], string> = {
  brand_dna_deviation: '品牌 DNA 偏差',
  unclear_consumer: '消费者不清晰',
  insufficient_benchmark: '竞品参考不足',
  cost_overrun: '成本超标',
  too_many_new_molds: '新模数量超标',
  insufficient_series_sku: '系列款数不足',
  insufficient_hero: 'Hero 款不足',
  review_rejected: '评审退回',
  wave_launch_risk: '波段上市风险',
};

const RISK_TYPE_COLOR: Record<ThemeRiskDecisionItem['riskType'], string> = {
  cost_overrun: 'bg-red-100 text-red-700',
  too_many_new_molds: 'bg-amber-100 text-amber-700',
  wave_launch_risk: 'bg-red-100 text-red-700',
  brand_dna_deviation: 'bg-violet-100 text-violet-700',
  insufficient_hero: 'bg-amber-100 text-amber-700',
  insufficient_benchmark: 'bg-blue-100 text-blue-700',
  unclear_consumer: 'bg-blue-100 text-blue-700',
  insufficient_series_sku: 'bg-amber-100 text-amber-700',
  review_rejected: 'bg-red-100 text-red-700',
};

const statusMeta: Record<ThemeRiskDecisionItem['actionStatus'], { label: string; dot: string; text: string }> = {
  open: { label: '待处理', dot: 'bg-red-500', text: 'text-red-600' },
  in_progress: { label: '处理中', dot: 'bg-amber-400', text: 'text-amber-600' },
  resolved: { label: '已关闭', dot: 'bg-emerald-400', text: 'text-emerald-600' },
};

export default function ThemeRiskDecision({ risks }: ThemeRiskDecisionProps) {
  const [statusFilter, setStatusFilter] = useState<ThemeRiskDecisionItem['actionStatus'] | 'all'>('all');
  const filtered = statusFilter === 'all' ? risks : risks.filter((r) => r.actionStatus === statusFilter);

  const openCount = risks.filter((r) => r.actionStatus === 'open').length;
  const inProgressCount = risks.filter((r) => r.actionStatus === 'in_progress').length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">主题风险与决策中心</div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">关键风险 · 决策项 · 推荐行动</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {openCount > 0 && (
            <span className="rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1">
              {openCount} 待处理
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1">
              {inProgressCount} 处理中
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-6 py-2.5">
        {(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {s === 'all' ? '全部' : statusMeta[s].label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {filtered.map((risk) => {
          const sm = statusMeta[risk.actionStatus];
          return (
            <div key={risk.riskId} className={`p-5 hover:bg-slate-50/40 transition-colors ${risk.actionStatus === 'open' ? 'bg-red-50/20' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Left: Status indicator */}
                <div className="flex-shrink-0 mt-0.5 flex flex-col items-center gap-1.5">
                  <span className={`relative flex h-3 w-3`}>
                    {risk.actionStatus === 'open' && (
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75`} />
                    )}
                    <span className={`relative inline-flex h-3 w-3 rounded-full ${sm.dot}`} />
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Risk Object + Type */}
                  <div className="flex flex-wrap items-start gap-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{risk.riskObject}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_TYPE_COLOR[risk.riskType]}`}>
                      {RISK_TYPE_LABELS[risk.riskType]}
                    </span>
                  </div>

                  {/* Context */}
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    <span>波段: <span className="font-bold text-slate-700">{risk.affectedWave}</span></span>
                    <span>系列: <span className="font-bold text-slate-700">{risk.affectedSeries}</span></span>
                    <span>影响款数: <span className="font-bold text-slate-700">{risk.affectedStyleCount} 款</span></span>
                    <span>负责人: <span className="font-bold text-slate-700">{risk.owner}</span></span>
                    <span className={`font-bold ${risk.actionStatus === 'open' ? 'text-red-600' : 'text-slate-500'}`}>截止: {risk.dueDate}</span>
                  </div>

                  {/* Risk Reason */}
                  <p className="text-xs text-slate-600 leading-relaxed">{risk.riskReason}</p>

                  {/* Impact + Decision */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mb-0.5">预期影响</div>
                      <p className="text-xs font-medium text-amber-900">{risk.expectedImpact}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-blue-600 mb-0.5">需决策</div>
                      <p className="text-xs font-medium text-blue-900">{risk.decisionNeeded}</p>
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-violet-500 font-black text-xs flex-shrink-0">→</span>
                    <span className="text-xs font-semibold text-slate-800 leading-relaxed">{risk.recommendedAction}</span>
                  </div>
                </div>

                {/* Right: Status badge */}
                <div className={`flex-shrink-0 text-xs font-bold ${sm.text}`}>{sm.label}</div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            {statusFilter === 'resolved' ? '暂无已关闭风险' : '当前筛选条件下无风险项'}
          </div>
        )}
      </div>
    </div>
  );
}
