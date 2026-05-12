'use client';
/**
 * src/components/inventory/InvActionCenterEnhanced.tsx
 * S3: 行动中心闭环版 — 完成/转交/撤销 + 进度条 + 累计指标 (V10)
 */
import { useState } from 'react';
import type { InventoryAction, ActionStatus } from '@/types/inventoryHealthTypes';
import { RISK_COLORS, RISK_LABELS, fmtK } from '@/types/inventoryHealthTypes';
import type { InvActionLog } from '@/types/invHealthV10Types';

const ACTION_TYPE_LABELS: Record<string, string> = { replenish: '补货', markdown: '折扣', transfer: '调拨', clearance: '清仓', monitor: '监控' };
const PRIORITY_COLOR = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-400', 'bg-gray-300'];

interface Props {
  actions: InventoryAction[];
  actionLog: InvActionLog;
  onNavigate?: (module: string) => void;
}

export default function InvActionCenterEnhanced({ actions, actionLog, onNavigate }: Props) {
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(
    () => Object.fromEntries(actions.map(a => [a.id, a.status]))
  );
  const [filter, setFilter] = useState<ActionStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const log = actionLog.weekSummary;

  function updateStatus(id: string, next: ActionStatus) {
    setStatuses(prev => ({ ...prev, [id]: next }));
  }

  const filtered = actions.filter(a => filter === 'all' || statuses[a.id] === filter);
  const completedCount = Object.values(statuses).filter(s => s === 'done').length;
  const inProgressCount = Object.values(statuses).filter(s => s === 'in_progress').length;
  const pendingCount = Object.values(statuses).filter(s => s === 'suggested' || s === 'pending').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">今日行动中心</h3>
            <p className="text-xs text-gray-400 mt-0.5">P0-P5 优先级行动 · 完成/转交/撤销闭环</p>
          </div>
          <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            🤖 智能生成今日行动 →
          </button>
        </div>

        {/* 进度条 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
            <div className="bg-emerald-500 h-full rounded-l-full transition-all"
              style={{ width: `${completedCount / actions.length * 100}%` }} />
            <div className="bg-blue-400 h-full transition-all"
              style={{ width: `${inProgressCount / actions.length * 100}%` }} />
            <div className="bg-amber-300 h-full rounded-r-full transition-all"
              style={{ width: `${pendingCount / actions.length * 100}%` }} />
          </div>
          <div className="text-xs text-gray-500 whitespace-nowrap">
            <span className="text-emerald-600 font-semibold">{completedCount}完成</span>
            {' · '}<span className="text-blue-500 font-semibold">{inProgressCount}进行中</span>
            {' · '}<span className="text-amber-500 font-semibold">{pendingCount}待处理</span>
          </div>
        </div>

        {/* 本周累计 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: '已处理SKU', val: `${log.processedSkuCount} 个`, color: 'text-emerald-600' },
            { label: '释放现金', val: fmtK(log.releasedCash), color: 'text-emerald-600' },
            { label: '减少WOS', val: `-${log.reducedWos}W`, color: 'text-emerald-600' },
          ].map(m => (
            <div key={m.label} className="bg-emerald-50 rounded-lg py-2">
              <div className={`text-sm font-bold ${m.color}`}>{m.val}</div>
              <div className="text-[10px] text-gray-400">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 过滤 */}
      <div className="px-5 py-2 border-b border-gray-50 flex gap-1 flex-wrap">
        {([['all','全部'],['suggested','建议'],['pending','待处理'],['in_progress','进行中'],['done','完成']] as [ActionStatus|'all',string][]).map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filter === k ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{l}</button>
        ))}
      </div>

      {/* 行动列表 */}
      <div className="divide-y divide-gray-50">
        {filtered.map(action => {
          const st = statuses[action.id];
          const expanded = expandedId === action.id;
          return (
            <div key={action.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <span className={`w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5 ${PRIORITY_COLOR[action.priority] || 'bg-gray-400'}`}>
                  P{action.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-900">{action.styleName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium"
                      style={{ backgroundColor: RISK_COLORS[action.riskLevel] }}>
                      {RISK_LABELS[action.riskLevel]}
                    </span>
                    <span className="text-[10px] text-gray-400">{ACTION_TYPE_LABELS[action.actionType]}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{action.riskReason}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span>截止 {action.deadline}</span>
                    <span>负责人: {action.owner}</span>
                    {action.expectedCashRelease > 0 && (
                      <span className="text-emerald-600">回笼 {fmtK(action.expectedCashRelease)}</span>
                    )}
                  </div>
                  {expanded && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                      <p><b>建议动作：</b>{action.recommendedAction}</p>
                      <p><b>预期效果：</b>{action.expectedImpact}</p>
                      {action.relatedModules.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-gray-400">关联：</span>
                          {action.relatedModules.map(m => (
                            <button key={m} onClick={() => onNavigate?.(m)}
                              className="text-blue-600 hover:underline">{m}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 操作按钮组 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(expanded ? null : action.id)}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs flex items-center justify-center transition-colors"
                    title="展开详情">{expanded ? '▲' : '▼'}</button>
                  {st !== 'done' && st !== 'closed' && (
                    <>
                      <button onClick={() => updateStatus(action.id, 'done')}
                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs flex items-center justify-center transition-colors"
                        title="完成">✓</button>
                      <button onClick={() => updateStatus(action.id, 'in_progress')}
                        className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 text-xs flex items-center justify-center transition-colors"
                        title="转交">→</button>
                      <button onClick={() => updateStatus(action.id, 'closed')}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 text-xs flex items-center justify-center transition-colors"
                        title="撤销">✕</button>
                    </>
                  )}
                  {(st === 'done' || st === 'closed') && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {st === 'done' ? '已完成' : '已撤销'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-xs text-gray-400">该状态下暂无行动</div>
        )}
      </div>
    </div>
  );
}
