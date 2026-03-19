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
        <h3 className="text-lg font-semibold text-slate-900">风险预警</h3>
        <span className="text-sm text-slate-600">{risks.length} 项</span>
      </div>
      <div className="space-y-3">
        {sortedRisks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">暂无风险</div>
        ) : (
          sortedRisks.map((risk) => {
            const colors = priorityColors[risk.priority];
            return (
              <div key={risk.riskId} className={`rounded-lg border ${colors.border} ${colors.bg} p-4 transition-all hover:shadow-md`}>
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{risk.title}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {riskTypeLabels[risk.riskType] ?? risk.riskType} / {statusLabels[risk.status] ?? risk.status}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors.text}`}>
                    {risk.priority.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-slate-700">{risk.description}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>责任人 {risk.owner}</span>
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
