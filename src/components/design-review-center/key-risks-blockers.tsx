'use client';

import { useState } from 'react';
import type { DesignRiskBlocker, DesignReviewMustDecideItem } from '@/lib/design-review-center/types';
import { formatDate } from '@/lib/design-review-center/helpers/date';

interface Props {
  risks: DesignRiskBlocker[];
  blockers: DesignReviewMustDecideItem[];
}

const RISK_TYPE_LABEL: Record<DesignRiskBlocker['riskType'], string> = {
  design_direction: '设计方向偏离',
  new_mold_excess: '新模过多',
  shared_sole_low: '共底不足',
  hero_style_low: '主推不足',
  sample_delay: '样品延期',
  bom_unlocked: 'BOM 未锁',
  cost_overrun: '成本超标',
  gate_delay: 'Gate 延期',
  review_rejected: '评审未通过',
  launch_risk: '上市风险',
};

const RISK_TYPE_COLOR: Record<DesignRiskBlocker['riskType'], string> = {
  design_direction: 'bg-violet-100 text-violet-700',
  new_mold_excess: 'bg-rose-100 text-rose-700',
  shared_sole_low: 'bg-amber-100 text-amber-700',
  hero_style_low: 'bg-orange-100 text-orange-700',
  sample_delay: 'bg-amber-100 text-amber-700',
  bom_unlocked: 'bg-rose-100 text-rose-700',
  cost_overrun: 'bg-rose-100 text-rose-700',
  gate_delay: 'bg-rose-100 text-rose-700',
  review_rejected: 'bg-slate-100 text-slate-600',
  launch_risk: 'bg-rose-200 text-rose-800',
};

const ACTION_STATUS_CONFIG: Record<
  DesignRiskBlocker['actionStatus'],
  { label: string; badge: string }
> = {
  open: { label: '待处理', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
  in_progress: { label: '处理中', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: '已解决', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function RiskCard({ risk }: { risk: DesignRiskBlocker }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = ACTION_STATUS_CONFIG[risk.actionStatus];

  return (
    <div className="rounded-lg border border-slate-200/70 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full text-left px-4 py-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RISK_TYPE_COLOR[risk.riskType]}`}>
                {RISK_TYPE_LABEL[risk.riskType]}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-900">{risk.riskObject}</div>
            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{risk.riskReason}</div>
            {/* Owner & resolve date inline */}
            <div className="flex flex-wrap gap-3 mt-1">
              {risk.owner && (
                <span className="text-[11px] text-slate-400">
                  负责人：<span className="font-medium text-slate-600">{risk.owner}</span>
                </span>
              )}
              {risk.dueDate && (
                <span className="text-[11px] text-slate-400">
                  预计解决：<span className="font-medium text-slate-600">{formatDate(risk.dueDate)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-slate-400">波段</div>
              <div className="text-xs font-semibold text-slate-600">{risk.affectedWave}</div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block mb-0.5">预期影响</span>
              <p className="text-slate-700">{risk.expectedImpact}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">责任人 / 截止</span>
              <p className="text-slate-700">
                {risk.owner} / {formatDate(risk.dueDate)}
              </p>
            </div>
            {risk.affectedStyle && (
              <div>
                <span className="text-slate-400 block mb-0.5">涉及款式</span>
                <p className="text-slate-700">{risk.affectedStyle}</p>
              </div>
            )}
            {risk.affectedLaunchDate && (
              <div>
                <span className="text-slate-400 block mb-0.5">影响上市</span>
                <p className="text-rose-600 font-medium">{risk.affectedLaunchDate}</p>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-blue-700">
            <span className="font-semibold">建议动作：</span>
            {risk.recommendedAction}
          </div>
        </div>
      )}
    </div>
  );
}

function BlockerCard({ item }: { item: DesignReviewMustDecideItem }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-[linear-gradient(180deg,#fff8f9_0%,#fff5f7_100%)] p-4 shadow-sm">
      <div className="font-semibold text-sm text-slate-900">{item.title}</div>
      <div className="mt-1.5 text-xs text-slate-600 leading-5">{item.reason}</div>
      <div className="mt-2 text-[11px] text-slate-400">
        责任人 {item.owner} / 截止 {formatDate(item.dueDate)}
      </div>
    </div>
  );
}

export default function KeyRisksBlockersPanel({ risks, blockers }: Props) {
  const openRisks = risks.filter((r) => r.actionStatus !== 'resolved');
  // 新增/关闭对比（模拟上周快照：假设新增 2 条、关闭 1 条）
  const MOCK_ADDED_VS_LAST_WEEK = 2;
  const MOCK_CLOSED_VS_LAST_WEEK = 1;

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
            Key Risks & Blockers
          </div>
          <h2 className="text-xl font-bold text-slate-900">关键风险与阻塞</h2>
          <p className="mt-1 text-xs text-slate-400">
            {openRisks.length} 项风险待处理 · {blockers.length} 个硬阻塞
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {openRisks.length > 0 && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              风险 {openRisks.length}
            </span>
          )}
          {blockers.length > 0 && (
            <span className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-800">
              阻塞 {blockers.length}
            </span>
          )}
        </div>
      </div>

      {/* Change summary vs last week */}
      <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 flex items-center gap-4 text-xs text-slate-600">
        <span className="font-semibold text-slate-500">相比上周：</span>
        <span>
          新增 <strong className="text-rose-600">{MOCK_ADDED_VS_LAST_WEEK}</strong> 条
        </span>
        <span>
          关闭 <strong className="text-emerald-600">{MOCK_CLOSED_VS_LAST_WEEK}</strong> 条
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Risks */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">风险项</h3>
          {risks.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-400 text-center">
              当前无设计风险
            </div>
          ) : (
            <div className="space-y-2">
              {risks.map((risk) => (
                <RiskCard key={risk.riskId} risk={risk} />
              ))}
            </div>
          )}
        </div>

        {/* Blockers */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">硬阻塞</h3>
          {blockers.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-400 text-center">
              当前无阻塞项，开发节奏可按计划推进
            </div>
          ) : (
            <div className="space-y-2">
              {blockers.map((item) => (
                <BlockerCard key={item.styleId} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
