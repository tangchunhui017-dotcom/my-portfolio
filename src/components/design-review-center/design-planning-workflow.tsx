'use client';

import type { DesignPlanningWorkflowNode } from '@/lib/design-review-center/types';

interface Props {
  nodes: DesignPlanningWorkflowNode[];
}

const STATUS_CONFIG: Record<
  DesignPlanningWorkflowNode['status'],
  { label: string; dot: string; ring: string; text: string }
> = {
  completed: { label: '已完成', dot: 'bg-emerald-500', ring: 'ring-emerald-300', text: 'text-emerald-600' },
  in_progress: { label: '进行中', dot: 'bg-blue-500', ring: 'ring-blue-300', text: 'text-blue-600' },
  at_risk: { label: '有风险', dot: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-amber-600' },
  blocked: { label: '阻塞', dot: 'bg-rose-500', ring: 'ring-rose-300', text: 'text-rose-600' },
  not_started: { label: '未开始', dot: 'bg-slate-300', ring: 'ring-slate-200', text: 'text-slate-400' },
};

const RISK_LEVEL_BADGE: Record<
  DesignPlanningWorkflowNode['riskLevel'],
  { label: string; badge: string }
> = {
  none: { label: '无风险', badge: 'bg-emerald-100 text-emerald-600' },
  low: { label: '低', badge: 'bg-slate-100 text-slate-500' },
  medium: { label: '中', badge: 'bg-amber-100 text-amber-600' },
  high: { label: '高', badge: 'bg-rose-100 text-rose-600' },
};

function percent(v: number) {
  return `${Math.round(v * 100)}%`;
}

export default function DesignPlanningWorkflowPanel({ nodes }: Props) {
  const totalCompleted = nodes.filter((n) => n.status === 'completed').length;
  const totalBlocked = nodes.reduce((s, n) => s + n.blockedCount, 0);

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
            Design Planning Workflow
          </div>
          <h2 className="text-xl font-bold text-slate-900">设计企划流程总览</h2>
          <p className="mt-1 text-xs text-slate-400">
            {totalCompleted}/{nodes.length} 节点完成
            {totalBlocked > 0 && (
              <span className="ml-2 text-rose-500 font-medium">· {totalBlocked} 个阻塞</span>
            )}
          </p>
        </div>
      </div>

      {/* Flow nodes */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:gap-0 lg:items-start">
        {nodes.map((node, index) => {
          const statusCfg = STATUS_CONFIG[node.status];
          const riskCfg = RISK_LEVEL_BADGE[node.riskLevel];
          const isLast = index === nodes.length - 1;

          return (
            <div key={node.nodeId} className="flex items-start lg:flex-col lg:items-center lg:flex-1 lg:min-w-[80px]">
              {/* Node */}
              <div className="flex flex-col items-center lg:items-center">
                {/* Circle indicator */}
                <div
                  className={`h-8 w-8 rounded-full ${statusCfg.dot} ring-4 ${statusCfg.ring} flex items-center justify-center text-white text-[11px] font-bold shadow-sm flex-shrink-0`}
                >
                  {node.status === 'completed' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Progress bar below circle (desktop: horizontal connector) */}
                {!isLast && (
                  <div className="hidden lg:block w-full h-0.5 mt-3.5 bg-slate-200 -mx-1" />
                )}
              </div>

              {/* Node info */}
              <div className="ml-4 lg:ml-0 lg:mt-3 lg:text-center flex-1 lg:flex-none lg:w-full">
                <a
                  href={node.relatedRoute}
                  className={`text-xs font-bold ${statusCfg.text} hover:underline block`}
                >
                  {node.nodeName}
                </a>
                <div className="mt-1 h-1 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      node.status === 'completed'
                        ? 'bg-emerald-500'
                        : node.status === 'at_risk' || node.status === 'blocked'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: percent(node.completionRate) }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">{percent(node.completionRate)}</span>
                  {node.blockedCount > 0 && (
                    <span className="text-[10px] text-rose-500 font-semibold">
                      {node.blockedCount} 阻塞
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${riskCfg.badge}`}>
                    {riskCfg.label}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 hidden lg:block truncate">{node.owner}</div>
              </div>

              {/* Vertical connector (mobile) */}
              {!isLast && (
                <div className="lg:hidden w-0.5 h-4 bg-slate-200 ml-4 mt-1 self-start" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
