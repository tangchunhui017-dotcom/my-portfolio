'use client';
/**
 * PnlActionCenterEnhanced.tsx — S2 利润行动闭环版
 * 完成/转交/撤销 + 进度条 + 累计指标 + AI建议
 */
import { useState } from 'react';
import actionRaw from '../../../data/planning/pnl_action_log.json';

type ActionData = typeof actionRaw;
const actionData = actionRaw as ActionData;
type Action = ActionData['actions'][number];
type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'transferred' | 'cancelled';

function fmtM(v: number) {
  const s = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1e8) return s + '¥' + (a / 1e8).toFixed(2) + '亿';
  if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
  return s + '¥' + a.toLocaleString();
}

const RISK_BG: Record<string, string> = {
  critical: 'border-rose-200 bg-rose-50/40',
  high: 'border-amber-200 bg-amber-50/30',
  medium: 'border-slate-200 bg-slate-50/30',
  low: 'border-slate-100 bg-white',
};

const STATUS_LABEL: Record<ActionStatus, string> = {
  pending: '待处理', in_progress: '进行中', completed: '已完成', transferred: '已转交', cancelled: '已撤销',
};

const STATUS_CLS: Record<ActionStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  transferred: 'bg-violet-100 text-violet-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

interface Props {
  onNavigate?: (module: string) => void;
}

export default function PnlActionCenterEnhanced({ onNavigate }: Props) {
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(() => {
    const init: Record<string, ActionStatus> = {};
    actionData.actions.forEach(a => { init[a.id] = a.status as ActionStatus; });
    return init;
  });
  const [expandedAi, setExpandedAi] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ActionStatus | 'all'>('all');

  const ws = actionData.weekSummary;
  const completed = Object.values(statuses).filter(s => s === 'completed').length;
  const transferred = Object.values(statuses).filter(s => s === 'transferred').length;
  const total = actionData.actions.length;
  const progress = total > 0 ? ((completed + transferred) / total) * 100 : 0;

  const filtered = actionData.actions.filter(a =>
    filterStatus === 'all' ? true : statuses[a.id] === filterStatus
  );

  const setStatus = (id: string, status: ActionStatus) => {
    setStatuses(s => ({ ...s, [id]: status }));
  };

  return (
    <div className="space-y-4">
      {/* 进度条 + 累计指标 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-700">
            本月 {total} 项 · 已完成 {completed} 项 · 已转交 {transferred} 项 · 待处理 {total - completed - transferred} 项
          </div>
          <button className="text-[11px] px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-colors font-medium">
            🤖 智能生成本月行动 →
          </button>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-emerald-50 rounded-xl px-3 py-2">
            <div className="text-[10px] text-emerald-600 mb-0.5">已挽回利润</div>
            <div className="text-sm font-black text-emerald-700">{fmtM(ws.recoveredProfit)}</div>
          </div>
          <div className="bg-sky-50 rounded-xl px-3 py-2">
            <div className="text-[10px] text-sky-600 mb-0.5">已释放现金</div>
            <div className="text-sm font-black text-sky-700">{fmtM(ws.releasedCash)}</div>
          </div>
          <div className="bg-violet-50 rounded-xl px-3 py-2">
            <div className="text-[10px] text-violet-600 mb-0.5">费用率降幅</div>
            <div className="text-sm font-black text-violet-700">-{(ws.reducedExpenseRate * 100).toFixed(1)}pp</div>
          </div>
        </div>
      </div>

      {/* 状态过滤 */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'in_progress', 'completed', 'transferred'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-colors ${
              filterStatus === s ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {s === 'all' ? `全部 (${total})` : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* 行动列表 */}
      <div className="space-y-2">
        {filtered.map(action => {
          const curStatus = statuses[action.id] as ActionStatus;
          const isDone = curStatus === 'completed' || curStatus === 'transferred' || curStatus === 'cancelled';
          return (
            <div key={action.id}
              className={`rounded-xl border p-4 transition-all ${RISK_BG[action.riskLevel]} ${isDone ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3 flex-wrap">
                <span className="text-base font-black text-slate-200 shrink-0">#{action.priority}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-slate-800">{action.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CLS[curStatus]}`}>
                      {STATUS_LABEL[curStatus]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] flex-wrap mb-2">
                    <span className="text-rose-600">风险 {fmtM(action.financialImpact)}</span>
                    <span className="text-emerald-600">改善潜力 +{fmtM(action.improvementPotential)}</span>
                    <span className="text-slate-400">{action.deadline} · {action.owner}</span>
                  </div>
                  {action.relatedModules.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {action.relatedModules.map((m: string) => (
                        <button key={m} onClick={() => onNavigate?.(m)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 transition-colors">
                          → {m}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* AI建议 */}
                  {action.aiSuggestion && (
                    <div className="mt-2">
                      <button onClick={() => setExpandedAi(expandedAi === action.id ? null : action.id)}
                        className="text-[10px] text-violet-600 hover:underline flex items-center gap-1">
                        🤖 AI建议 {expandedAi === action.id ? '▲' : '▼'}
                      </button>
                      {expandedAi === action.id && (
                        <div className="mt-1 text-[11px] text-violet-700 bg-violet-50 rounded-lg px-3 py-2 border border-violet-100">
                          {action.aiSuggestion}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* 操作按钮 */}
                {!isDone && (
                  <div className="flex gap-1 shrink-0 flex-wrap">
                    <button onClick={() => setStatus(action.id, 'completed')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium">
                      ✓ 完成
                    </button>
                    <button onClick={() => setStatus(action.id, 'transferred')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors font-medium">
                      → 转交
                    </button>
                    <button onClick={() => setStatus(action.id, 'cancelled')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors font-medium">
                      ✕ 撤销
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
