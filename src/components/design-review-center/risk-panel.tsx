'use client';

import type { Risk } from '@/lib/design-review-center/types';

interface RiskPanelProps {
  risks: Risk[];
}

const riskTypeLabels: Record<string, string> = {
  supply_chain: '供应链',
  market: '市场',
  cost: '成本',
  design: '设计',
};

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
  low: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
};

const priorityLabels: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

const statusLabels: Record<string, string> = {
  open: '待处理',
  monitoring: '监控中',
  in_progress: '处理中',
  resolved: '已解决',
};

export default function RiskPanel({ risks }: RiskPanelProps) {
  const sortedRisks = [...risks].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">风险预警</h3>
          <p className="mt-1 text-sm text-slate-500">先看高风险阻塞，再看影响、概率和缓解动作是否明确。</p>
        </div>
        <span className="text-sm text-slate-600">{risks.length} 项</span>
      </div>
      <div className="space-y-3">
        {sortedRisks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">暂无风险</div>
        ) : (
          sortedRisks.map((risk) => {
            const colors = priorityColors[risk.priority];
            return (
              <div key={risk.riskId} className={'rounded-lg border ' + colors.border + ' ' + colors.bg + ' p-4 transition-all hover:shadow-md'}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{risk.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {riskTypeLabels[risk.riskType] ?? risk.riskType}
                      </span>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {statusLabels[risk.status] ?? risk.status}
                      </span>
                    </div>
                  </div>
                  <span className={'rounded-full px-2 py-1 text-xs font-semibold ' + colors.text}>
                    {priorityLabels[risk.priority] ?? risk.priority}
                  </span>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>{risk.description}</div>
                  <div className="rounded-xl bg-white/70 px-3 py-2 text-xs leading-6 text-slate-600">
                    <div>影响：{risk.impact}</div>
                    <div>概率：{risk.likelihood}</div>
                    <div>缓解动作：{risk.mitigation}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>责任人 {risk.owner}</span>
                  <span>识别于 {new Date(risk.identifiedAt).toLocaleDateString('zh-CN')}</span>
                  <span>到期 {new Date(risk.dueDate).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}