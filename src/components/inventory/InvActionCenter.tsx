'use client';
/**
 * src/components/inventory/InvActionCenter.tsx
 * 今日行动中心 — 支持状态切换
 */
import { useState } from 'react';
import type { InventoryAction, ActionStatus } from '@/types/inventoryHealthTypes';
import { RISK_COLORS, RISK_LABELS, ACTION_STATUS_LABELS, ACTION_STATUS_COLORS, fmtK } from '@/types/inventoryHealthTypes';

const ACTION_TYPE_LABELS: Record<string, string> = {
  replenish: '补货',
  markdown: '折扣',
  transfer: '调拨',
  clearance: '清仓',
  monitor: '监控',
};
const ACTION_TYPE_ICONS: Record<string, string> = {
  replenish: '📦',
  markdown: '🏷️',
  transfer: '↔️',
  clearance: '🧹',
  monitor: '👁️',
};
const RELATED_LABELS: Record<string, string> = {
  otb: 'OTB预算',
  forecast: '销售预测',
  wave: '波段企划',
  cashflow: '现金流',
  pnl: '损益',
};

const ALL_STATUSES: ActionStatus[] = ['suggested', 'pending', 'in_progress', 'done', 'closed'];

interface Props {
  actions: InventoryAction[];
  onNavigate?: (module: string) => void;
}

export default function InvActionCenter({ actions, onNavigate }: Props) {
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(
    () => Object.fromEntries(actions.map(a => [a.id, a.status]))
  );
  const [filter, setFilter] = useState<ActionStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function cycleStatus(id: string) {
    setStatuses(prev => {
      const cur = prev[id];
      const idx = ALL_STATUSES.indexOf(cur);
      const next = ALL_STATUSES[(idx + 1) % ALL_STATUSES.length];
      return { ...prev, [id]: next };
    });
  }

  const filtered = actions.filter(a => filter === 'all' || statuses[a.id] === filter);

  const countByStatus = (s: ActionStatus) => Object.values(statuses).filter(v => v === s).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">今日行动中心</h3>
          <p className="text-xs text-gray-500 mt-0.5">点击状态标签可快速切换执行进度</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...ALL_STATUSES] as (ActionStatus | 'all')[]).map(s => {
            const count = s === 'all' ? actions.length : countByStatus(s);
            return (
              <button key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                  filter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                }`}
              >
                {s === 'all' ? '全部' : ACTION_STATUS_LABELS[s]} {count > 0 && <span className="ml-0.5 opacity-80">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {filtered.map(action => {
          const status = statuses[action.id];
          const expanded = expandedId === action.id;
          return (
            <div key={action.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-sm mt-0.5">{ACTION_TYPE_ICONS[action.actionType]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">P{action.priority}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                      style={{ backgroundColor: RISK_COLORS[action.riskLevel] }}
                    >{RISK_LABELS[action.riskLevel]}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{action.styleName}</span>
                    <span className="text-xs text-gray-400">{ACTION_TYPE_LABELS[action.actionType]}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">{action.riskReason}</p>
                  {expanded && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1.5">
                      <div><span className="text-gray-500">建议动作：</span><span className="font-medium text-gray-900">{action.recommendedAction}</span></div>
                      <div><span className="text-gray-500">预期效果：</span><span className="text-gray-700">{action.expectedImpact}</span></div>
                      <div className="flex gap-4">
                        {action.expectedCashRelease > 0 && (
                          <div><span className="text-gray-500">现金回笼：</span><span className="font-semibold text-green-600">{fmtK(action.expectedCashRelease)}</span></div>
                        )}
                        {action.expectedMarginImpact !== 0 && (
                          <div><span className="text-gray-500">毛利影响：</span><span className={`font-semibold ${action.expectedMarginImpact > 0 ? 'text-blue-600' : 'text-red-500'}`}>{action.expectedMarginImpact > 0 ? '+' : ''}{fmtK(Math.abs(action.expectedMarginImpact))}</span></div>
                        )}
                        <div><span className="text-gray-500">截止：</span><span className="text-gray-700">{action.deadline}</span></div>
                        <div><span className="text-gray-500">负责人：</span><span className="text-gray-700">{action.owner}</span></div>
                      </div>
                      {action.relatedModules.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-gray-500">联动：</span>
                          {action.relatedModules.map(m => (
                            <button key={m} onClick={() => onNavigate?.(m)}
                              className="text-xs text-blue-600 hover:underline"
                            >{RELATED_LABELS[m] || m}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => cycleStatus(action.id)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium border transition-all"
                    style={{
                      color: ACTION_STATUS_COLORS[status],
                      borderColor: ACTION_STATUS_COLORS[status],
                    }}
                  >{ACTION_STATUS_LABELS[status]}</button>
                  <button
                    onClick={() => setExpandedId(expanded ? null : action.id)}
                    className="text-xs text-gray-400 hover:text-gray-700 px-1"
                  >{expanded ? '▲' : '▼'}</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">无符合条件的行动项</div>
        )}
      </div>
    </div>
  );
}
