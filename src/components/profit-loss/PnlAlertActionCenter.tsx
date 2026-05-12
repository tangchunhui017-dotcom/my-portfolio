'use client';
import { useState } from 'react';
import type { ProfitAlertAction, ActionStatus } from '@/types/pnlDecisionTypes';
import { fmtM, RISK_BG, RISK_COLORS, ACTION_STATUS_LABELS, ACTION_STATUS_COLORS } from '@/types/pnlDecisionTypes';

const STATUS_TABS: ActionStatus[] = ['suggested', 'pending', 'in_progress', 'done', 'closed'];

interface Props {
  actions: ProfitAlertAction[];
  onNavigate?: (module: string) => void;
}

export default function PnlAlertActionCenter({ actions, onNavigate }: Props) {
  const [activeStatus, setActiveStatus] = useState<ActionStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activeStatus === 'all' ? actions : actions.filter(a => a.status === activeStatus);
  const counts: Record<string, number> = {};
  actions.forEach(a => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
  const totalImpact = actions.reduce((s, a) => s + a.financialImpact, 0);
  const totalImprovement = actions.reduce((s, a) => s + a.improvementAmount, 0);

  const handleNavigate = (module: string) => {
    if (onNavigate) { onNavigate(module); return; }
    const tabBtn = document.querySelector(`[data-tab-key="${module}"]`) as HTMLButtonElement | null;
    if (tabBtn) tabBtn.click();
  };

  return (
    <div className="space-y-4">
      {/* 汇总条 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-center">
          <div className="text-[10px] text-rose-400 mb-1">利润风险总计</div>
          <div className="text-base font-bold text-rose-600">{fmtM(totalImpact)}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center">
          <div className="text-[10px] text-emerald-400 mb-1">预期改善潜力</div>
          <div className="text-base font-bold text-emerald-600">+{fmtM(totalImprovement)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
          <div className="text-[10px] text-amber-400 mb-1">高风险行动</div>
          <div className="text-base font-bold text-amber-600">{actions.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length} 条</div>
        </div>
        <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 text-center">
          <div className="text-[10px] text-sky-400 mb-1">待处理</div>
          <div className="text-base font-bold text-sky-600">{(counts['suggested'] ?? 0) + (counts['pending'] ?? 0)} 条</div>
        </div>
      </div>

      {/* 状态过滤 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveStatus('all')}
          className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-colors ${
            activeStatus === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部 ({actions.length})
        </button>
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeStatus === s
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {ACTION_STATUS_LABELS[s]} {counts[s] ? `(${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* 行动列表 */}
      <div className="space-y-2">
        {filtered.map(action => {
          const expanded = expandedId === action.id;
          return (
            <div key={action.id} className={`rounded-xl border ${RISK_BG[action.riskLevel]} p-4 transition-all`}>
              <div className="flex items-start gap-3">
                <div className="flex-none mt-0.5">
                  <span className="text-base font-black text-slate-300">#{action.priority}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-slate-800">{action.subject}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ACTION_STATUS_COLORS[action.status]}`}>
                      {ACTION_STATUS_LABELS[action.status]}
                    </span>
                    <span className={`text-[10px] font-medium ${RISK_COLORS[action.riskLevel]}`}>
                      {action.riskLevel === 'high' ? '⚠ 高风险' : action.riskLevel === 'critical' ? '🚨 紧急' : action.riskLevel === 'medium' ? '⚡ 中风险' : ''}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">{action.deadline} · {action.owner}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2">{action.riskReason}</p>
                  <div className="flex items-center gap-4 text-[11px] flex-wrap">
                    <span className="text-rose-600 font-medium">利润影响 {fmtM(action.financialImpact)}</span>
                    <span className="text-emerald-600 font-medium">改善空间 +{fmtM(action.improvementAmount)}</span>
                    <div className="flex gap-1.5 ml-auto">
                      {action.relatedModules.map(mod => (
                        <button
                          key={mod}
                          onClick={() => handleNavigate(mod)}
                          className="text-[10px] px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-colors"
                        >
                          → {mod.toUpperCase()}
                        </button>
                      ))}
                      <button
                        onClick={() => setExpandedId(expanded ? null : action.id)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                      >
                        {expanded ? '收起' : '查看行动建议'}
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-3 p-3 bg-white/60 rounded-lg border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-700 mb-1">推荐行动：</div>
                      <p className="text-[11px] text-slate-600">{action.recommendedAction}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[12px] text-slate-400">暂无该状态的行动项</div>
        )}
      </div>
    </div>
  );
}
