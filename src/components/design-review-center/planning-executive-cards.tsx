'use client';

import type { PlanningExecutiveSummaryCards, DesignPlanningOverallStatus } from '@/lib/design-review-center/types';

interface Props {
  cards: PlanningExecutiveSummaryCards;
}

const STATUS_CFG: Record<DesignPlanningOverallStatus, { label: string; dot: string; badge: string }> = {
  healthy:   { label: '健康',  dot: 'bg-green-500',  badge: 'border-green-200 bg-green-50  text-green-700'  },
  warning:   { label: '预警',  dot: 'bg-amber-500',  badge: 'border-amber-200 bg-amber-50  text-amber-700'  },
  high_risk: { label: '高风险', dot: 'bg-red-500',   badge: 'border-red-200   bg-red-50    text-red-700'    },
};

function Card({
  subtitle,
  title,
  accent,
  children,
}: {
  subtitle: string;
  title: string;
  accent?: 'warn' | 'risk';
  children: React.ReactNode;
}) {
  const border =
    accent === 'risk' ? 'border-l-4 border-l-red-400 border border-slate-200'
    : accent === 'warn' ? 'border-l-4 border-l-amber-400 border border-slate-200'
    : 'border border-slate-200';
  return (
    <div className={`rounded-lg bg-white p-4 shadow-sm ${border}`}>
      <div className="mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{subtitle}</div>
        <div className="text-xs font-bold text-slate-700 mt-0.5">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, color = 'text-slate-800' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default function PlanningExecutiveCardsPanel({ cards }: Props) {
  const statusCfg = STATUS_CFG[cards.overallStatus];
  const skuRate = cards.sku.planned > 0 ? Math.round((cards.sku.defined / cards.sku.planned) * 100) : 0;
  const marginDiff = cards.costMargin.forecastMarginRate - cards.costMargin.targetMarginRate;
  const isMarginRisk = marginDiff < -0.04;
  const isMarginWarn = marginDiff < -0.01;

  const BANNER_CFG: Record<DesignPlanningOverallStatus, { bg: string; text: string; msg: string }> = {
    healthy:   { bg: 'bg-emerald-600', text: 'text-white', msg: '本季整体状态健康，各模块推进正常，可按计划进入下一 Gate。' },
    warning:   { bg: 'bg-amber-500',   text: 'text-white', msg: '注意：部分模块存在偏差，需在本周内完成决策与对齐，避免影响节点。' },
    high_risk: { bg: 'bg-red-600',     text: 'text-white', msg: '高风险：存在阻塞性问题，须立即干预，当前节点可能延期。' },
  };
  const banner = BANNER_CFG[cards.overallStatus];

  return (
    <section className="rounded-lg border border-slate-200/80 bg-slate-50/70 shadow-sm overflow-hidden">
      {/* Health Banner */}
      <div className={`${banner.bg} ${banner.text} px-5 py-3 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-2.5">
          <div className={`h-2 w-2 rounded-full ${statusCfg.dot} bg-white opacity-80`} />
          <span className="text-sm font-bold">{statusCfg.label}</span>
          <span className="text-sm opacity-90 hidden sm:block">·</span>
          <span className="text-sm opacity-90 hidden sm:block">{banner.msg}</span>
        </div>
        <div className="text-[11px] opacity-80 whitespace-nowrap">设计企划总控</div>
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Design Planning Dashboard</div>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">设计企划总控看板</h2>
          </div>
        </div>

        {/* 6 Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">

          {/* 1. Gate */}
          <Card subtitle="Planning Gate" title="当前企划阶段">
            <div className="text-[32px] font-black text-slate-900 leading-none">{cards.gate.currentGate}</div>
            <div className="text-xs text-slate-500 mt-0.5">{cards.gate.currentGateLabel}</div>
            <div className="mt-2 space-y-1">
              <Stat label="下一 Gate" value={cards.gate.nextGateName} />
              <Stat
                label="截止"
                value={`${cards.gate.nextGateDate}（${cards.gate.daysLeft}天）`}
                color={cards.gate.daysLeft < 7 ? 'text-red-600' : cards.gate.daysLeft < 14 ? 'text-amber-600' : 'text-blue-700'}
              />
            </div>
          </Card>

          {/* 2. SKU */}
          <Card
            subtitle="SKU Status"
            title="SKU 完成度"
            accent={cards.sku.unconfirmed > cards.sku.planned * 0.35 ? 'warn' : undefined}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-black text-slate-900">{cards.sku.defined}</span>
              <span className="text-sm text-slate-400">/ {cards.sku.planned}</span>
            </div>
            <div className="my-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${skuRate}%` }} />
            </div>
            <Stat label="完成率" value={`${skuRate}%`} color="text-blue-700" />
            <Stat label="未确认" value={cards.sku.unconfirmed} color={cards.sku.unconfirmed > 5 ? 'text-amber-600' : 'text-slate-600'} />
          </Card>

          {/* 3. Key Styles */}
          <Card subtitle="Key Styles" title="重点款状态">
            <div className="grid grid-cols-3 gap-1 my-1">
              {[
                { label: 'Hero', value: cards.keyStyle.heroCount, color: 'text-violet-700' },
                { label: 'Core', value: cards.keyStyle.coreCount, color: 'text-slate-800' },
                { label: 'Support', value: cards.keyStyle.supportCount, color: 'text-slate-400' },
              ].map((item) => (
                <div key={item.label} className="text-center rounded bg-slate-50 py-1">
                  <div className={`text-[32px] font-black leading-none ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
            <Stat label="目标总款" value={`${cards.keyStyle.totalTarget} 款`} />
          </Card>

          {/* 4. Sample & Dev */}
          <Card
            subtitle="Sample Dev"
            title="样品与开发"
            accent={cards.sampleDev.blocked > 2 ? 'risk' : cards.sampleDev.blocked > 0 ? 'warn' : undefined}
          >
            <div className="space-y-0.5 mt-1">
              <Stat label="开发中" value={cards.sampleDev.inDevelopment} />
              <Stat label="待试穿" value={cards.sampleDev.pendingFitting} color="text-amber-600" />
              <Stat label="待确认" value={cards.sampleDev.pendingConfirmation} />
              <div className="border-t border-slate-100 mt-1 pt-1">
                <Stat label="阻塞" value={cards.sampleDev.blocked} color={cards.sampleDev.blocked > 0 ? 'text-red-600' : 'text-slate-600'} />
              </div>
            </div>
          </Card>

          {/* 5. Cost & Margin */}
          <Card
            subtitle="Cost Margin"
            title="成本与毛利"
            accent={isMarginRisk ? 'risk' : isMarginWarn ? 'warn' : undefined}
          >
            <div className={`text-[32px] font-black leading-none mt-1 ${isMarginRisk ? 'text-red-600' : isMarginWarn ? 'text-amber-600' : 'text-green-700'}`}>
              {(cards.costMargin.forecastMarginRate * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              目标 {(cards.costMargin.targetMarginRate * 100).toFixed(1)}%
              {isMarginWarn && (
                <span className={`ml-1 font-semibold ${isMarginRisk ? 'text-red-600' : 'text-amber-600'}`}>
                  ({(marginDiff * 100).toFixed(1)}%)
                </span>
              )}
            </div>
            <div className="mt-1.5 space-y-0.5">
              <Stat label="超成本款" value={`${cards.costMargin.overCostCount} 款`} color="text-red-600" />
              <Stat label="预测 FOB" value={`¥${cards.costMargin.forecastFob}`} />
            </div>
          </Card>

          {/* 6. Risk & Decision */}
          <Card
            subtitle="Risk Decision"
            title="风险与决策"
            accent={cards.riskDecision.highRiskCount > 3 ? 'risk' : cards.riskDecision.highRiskCount > 0 ? 'warn' : undefined}
          >
            <div className={`text-[32px] font-black leading-none mt-1 ${cards.riskDecision.highRiskCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {cards.riskDecision.highRiskCount}
            </div>
            <div className="text-[11px] text-slate-400">高风险款</div>
            <div className="mt-1.5 space-y-0.5">
              <Stat label="逾期决策" value={cards.riskDecision.overdueDecisionCount} color={cards.riskDecision.overdueDecisionCount > 0 ? 'text-amber-600' : 'text-slate-600'} />
              <div className="border-t border-slate-100 mt-1 pt-1">
                <Stat
                  label="本周必须处理"
                  value={cards.riskDecision.thisWeekMustHandle}
                  color={cards.riskDecision.thisWeekMustHandle > 0 ? 'text-red-600' : 'text-slate-600'}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
