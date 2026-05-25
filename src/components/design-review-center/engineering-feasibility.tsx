'use client';

import { useState } from 'react';
import type {
  EngineeringFeasibilityData,
  EngineeringItemStatus,
  MaterialRole,
} from '@/lib/design-review-center/types';

interface Props {
  data: EngineeringFeasibilityData;
}

const ITEM_STATUS: Record<EngineeringItemStatus, { label: string; cls: string }> = {
  confirmed:        { label: '已确认', cls: 'bg-green-50  text-green-700' },
  pending_fitting:  { label: '待试穿', cls: 'bg-amber-50  text-amber-700' },
  needs_adjustment: { label: '需调整', cls: 'bg-orange-50 text-orange-700' },
  not_started:      { label: '未开始', cls: 'bg-slate-100 text-slate-500' },
  at_risk:          { label: '有风险', cls: 'bg-red-50    text-red-700' },
};

const STRATEGY_LABEL: Record<string, string> = {
  carry_over:   '沿用旧底',
  new_tooling:  '新开模具',
  modify_tooling: '改模',
};

const MATERIAL_ROLE_LABEL: Record<MaterialRole, string> = {
  upper:   '帮面',
  lining:  '里料',
  insole:  '鞋垫',
  outsole: '大底',
};

const CRAFT_RISK_COLOR: Record<string, string> = {
  high:   'text-red-600',
  medium: 'text-amber-600',
  low:    'text-green-600',
};

const TEST_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  passed:     { label: '通过',   cls: 'bg-green-50  text-green-700' },
  in_progress:{ label: '测试中', cls: 'bg-blue-50   text-blue-700' },
  pending:    { label: '待测',   cls: 'bg-slate-100 text-slate-500' },
  failed:     { label: '不通过', cls: 'bg-red-50    text-red-700' },
};

function SubTitle({ children }: { children: string }) {
  return <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</div>;
}

function StatusBadge({ status }: { status: EngineeringItemStatus }) {
  const cfg = ITEM_STATUS[status];
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>{cfg.label}</span>;
}

export default function EngineeringFeasibilityPanel({ data }: Props) {
  const riskCount = data.craftRisks.filter((r) => r.riskLevel === 'high').length;
  const mediumRiskCount = data.craftRisks.filter((r) => r.riskLevel === 'medium').length;
  const resolvedCount = data.craftRisks.filter((r) => r.riskLevel === 'low').length;
  const unconfirmedSupplier = data.supplyChainItems.filter((s) => !s.confirmed).length;
  const [expanded, setExpanded] = useState(false);

  const top3Risks = data.craftRisks
    .filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium')
    .slice(0, 3);

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">Engineering Feasibility</div>
          <h2 className="text-xl font-bold text-slate-900">开发可行性与工程承接</h2>
          <p className="mt-1 text-xs text-slate-400">楦型 · 鞋底平台 · 材料 · 工艺风险 · 供应链 · 测试状态</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors flex-shrink-0"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? '收起详情' : '展开详情'}
        </button>
      </div>

      {/* Collapsed summary view */}
      {!expanded && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <span className="text-[28px] font-black text-red-600 leading-none">{riskCount}</span>
              <span className="text-xs text-red-600 font-semibold">高风险</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <span className="text-[28px] font-black text-amber-600 leading-none">{mediumRiskCount}</span>
              <span className="text-xs text-amber-600 font-semibold">中风险</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <span className="text-[28px] font-black text-emerald-600 leading-none">{resolvedCount}</span>
              <span className="text-xs text-emerald-600 font-semibold">已解决</span>
            </div>
            {unconfirmedSupplier > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <span className="text-[28px] font-black text-slate-700 leading-none">{unconfirmedSupplier}</span>
                <span className="text-xs text-slate-600 font-semibold">供应商待确认</span>
              </div>
            )}
          </div>
          {top3Risks.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Top 风险项</div>
              <div className="space-y-2">
                {top3Risks.map((risk, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${risk.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {risk.riskLevel === 'high' ? '高' : '中'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{risk.craftType}</div>
                      <div className="text-slate-500 line-clamp-1">{risk.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full detail (expanded) */}
      {expanded && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {/* 1. 楦型状态 */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SubTitle>楦型状态</SubTitle>
          <div className="space-y-2">
            {data.lastStatuses.map((ls) => (
              <div key={ls.lastCode} className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <span className="text-xs font-bold text-slate-700">{ls.lastName}</span>
                    <span className="ml-1.5 text-[10px] text-slate-400">{ls.lastCode}</span>
                  </div>
                  <StatusBadge status={ls.status} />
                </div>
                <div className="text-[11px] text-slate-500">{ls.fitTrial}</div>
                {ls.note && (
                  <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-0.5">{ls.note}</div>
                )}
                <div className="mt-1 text-[11px] text-slate-400">涉及：{ls.affectedSeries.join('、')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 鞋底平台 */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SubTitle>鞋底平台</SubTitle>
          <div className="space-y-2">
            {data.outsolePlatforms.map((op) => (
              <div key={op.platformCode} className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <span className="text-xs font-bold text-slate-700">{op.platformName}</span>
                  </div>
                  <StatusBadge status={op.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] mt-1">
                  <span className={`font-semibold ${op.strategy === 'new_tooling' ? 'text-red-600' : op.strategy === 'modify_tooling' ? 'text-amber-600' : 'text-green-600'}`}>
                    {STRATEGY_LABEL[op.strategy]}
                  </span>
                  <span className="text-slate-500">{op.estimatedCost}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">涉及：{op.affectedSeries.join('、')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 材料状态 */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SubTitle>材料状态</SubTitle>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-1 text-left font-semibold text-slate-400">部位</th>
                  <th className="pb-1 text-left font-semibold text-slate-400">材料</th>
                  <th className="pb-1 text-left font-semibold text-slate-400">交期</th>
                  <th className="pb-1 text-center font-semibold text-slate-400">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.materialItems.map((m, i) => (
                  <tr key={i}>
                    <td className="py-1.5 text-slate-500">{MATERIAL_ROLE_LABEL[m.materialRole]}</td>
                    <td className="py-1.5 text-slate-700 font-medium">{m.materialName}</td>
                    <td className="py-1.5 text-slate-500">{m.leadTime}</td>
                    <td className="py-1.5 text-center">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. 工艺风险 */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SubTitle>工艺风险</SubTitle>
          <div className="space-y-2">
            {data.craftRisks.map((cr) => (
              <div key={cr.craftType} className="flex items-start gap-3 py-1 border-b border-slate-50 last:border-0">
                <div className={`mt-0.5 flex-shrink-0 text-xs font-bold ${CRAFT_RISK_COLOR[cr.riskLevel]}`}>
                  {cr.riskLevel === 'high' ? '高' : cr.riskLevel === 'medium' ? '中' : '低'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">{cr.craftType}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{cr.description}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">影响 {cr.affectedStyleCount} 款</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. 供应链状态 */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SubTitle>供应链状态</SubTitle>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-1 text-left font-semibold text-slate-400">供应商</th>
                  <th className="pb-1 text-left font-semibold text-slate-400">交期</th>
                  <th className="pb-1 text-center font-semibold text-slate-400">确认</th>
                  <th className="pb-1 text-center font-semibold text-slate-400">备选</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.supplyChainItems.map((sc) => (
                  <tr key={sc.supplier} className={!sc.confirmed ? 'bg-amber-50/40' : ''}>
                    <td className="py-1.5 font-medium text-slate-700 max-w-[120px] truncate">{sc.supplier}</td>
                    <td className="py-1.5 text-slate-500">{sc.leadTime}</td>
                    <td className="py-1.5 text-center">
                      {sc.confirmed ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-red-500 font-bold">✗</span>
                      )}
                    </td>
                    <td className="py-1.5 text-center">
                      {sc.hasAlternative ? (
                        <span className="text-slate-500">有</span>
                      ) : (
                        <span className="text-red-500 font-semibold">无</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. 测试状态 */}
        <div className="rounded-lg border border-slate-200 p-4">
          <SubTitle>测试状态</SubTitle>
          <div className="space-y-2">
            {data.testItems.map((t) => {
              const cfg = TEST_STATUS_CFG[t.status] ?? { label: t.status, cls: 'bg-slate-100 text-slate-500' };
              return (
                <div key={t.testType} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                  <div className="text-xs text-slate-700">{t.testType}</div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-400">{t.affectedCount} 款</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </section>
  );
}
