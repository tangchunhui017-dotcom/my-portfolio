'use client';
/**
 * src/components/otb/panels/wave/WaveRiskActionPanel.tsx
 * 波段风险诊断和动作建议展示面板
 * 展示所有波段的风险等级、具体风险类型、建议动作、责任人和截止时间
 */

import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@/utils/otbCalculations';
import { 
  diagnoseWaveRisk, 
  generateWaveActions,
  type WaveRow,
  type WaveContext,
  type WaveRisk,
  type WaveAction,
} from '@/utils/otbWavePlanning';
import type { CurrencyUnit } from '@/utils/otbCalculations';

interface WaveRiskActionPanelProps {
  waves: WaveRow[];
  annualSalesTarget: number;
  annualOtbBudget: number;
  currencyUnit: CurrencyUnit;
  currentDate?: Date;
}

const riskTypeLabels: Record<string, string> = {
  budget_overrun: '预算超支',
  launch_delay: '上市延迟',
  arrival_delay: '商品结构',
  category_mismatch: '结构错配',
  role_mismatch: '角色错配',
  depth_too_high: '深度过高',
  depth_too_low: '款数过多',
  style_count_too_high: '款数过多',
  sell_through_too_low: '新鲜度不足',
  season_overlap: '季节重叠',
  cashflow_pressure: '现金流压力',
};

export default function WaveRiskActionPanel({
  waves,
  annualSalesTarget,
  annualOtbBudget,
  currencyUnit,
  currentDate = new Date(),
}: WaveRiskActionPanelProps) {
  const context: WaveContext = useMemo(() => ({
    annualSalesTarget,
    annualOtbBudget,
    allWaves: waves,
    currentDate,
    currencyUnit,
  }), [annualSalesTarget, annualOtbBudget, waves, currentDate, currencyUnit]);

  const allRisks = useMemo(() => {
    const risks: Array<WaveRisk & { wave: WaveRow }> = [];
    for (const wave of waves) {
      const waveRisks = diagnoseWaveRisk(wave, context);
      for (const risk of waveRisks) {
        risks.push({ ...risk, wave });
      }
    }
    return risks.sort((a, b) => {
      const levelOrder = { danger: 0, warning: 1, healthy: 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  }, [waves, context]);

  const allActions = useMemo(() => {
    const actions: WaveAction[] = [];
    for (const wave of waves) {
      const waveRisks = diagnoseWaveRisk(wave, context);
      const waveActions = generateWaveActions(wave, waveRisks);
      actions.push(...waveActions);
    }
    return actions;
  }, [waves, context]);

  const [activeTab, setActiveTab] = React.useState('risks');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'P0' | 'P1' | 'P2'>('all');

  // 优先级映射
  const PRIORITY_MAP: Record<string, 'P0' | 'P1' | 'P2'> = { '高': 'P0', '中': 'P1', '低': 'P2' };

  const p0Count = useMemo(() => allRisks.filter(r => r.priority === '高').length, [allRisks]);
  const p1Count = useMemo(() => allRisks.filter(r => r.priority === '中').length, [allRisks]);
  const p2Count = useMemo(() => allRisks.filter(r => r.priority === '低').length, [allRisks]);

  const filteredRisks = useMemo(() => {
    if (priorityFilter === 'all') return allRisks;
    return allRisks.filter(r => PRIORITY_MAP[r.priority] === priorityFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRisks, priorityFilter]);

  const tabsContent = [
    {
      id: 'risks',
      label: `风险诊断 (${allRisks.length})`,
      content: <RiskGrid risks={filteredRisks} currencyUnit={currencyUnit} />,
    },
    {
      id: 'actions',
      label: `动作建议 (${allActions.length})`,
      content: <ActionGrid actions={allActions} currencyUnit={currencyUnit} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-slate-700">波段风险与动作</div>

      {/* 标签页 */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabsContent.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 优先级筛选器（仅风险 tab 显示） */}
      {activeTab === 'risks' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">优先级:</span>
          {([
            { key: 'all', label: `全部 (${allRisks.length})` },
            { key: 'P0', label: `紧急 P0 (${p0Count})`, cls: 'border-rose-200 text-rose-700 bg-rose-50' },
            { key: 'P1', label: `重要 P1 (${p1Count})`, cls: 'border-amber-200 text-amber-700 bg-amber-50' },
            { key: 'P2', label: `建议 P2 (${p2Count})`, cls: 'border-slate-200 text-slate-600 bg-slate-50' },
          ] as const).map(chip => (
            <button
              key={chip.key}
              onClick={() => setPriorityFilter(chip.key as typeof priorityFilter)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                priorityFilter === chip.key
                  ? `${'cls' in chip ? chip.cls : 'border-sky-200 text-sky-700 bg-sky-50'} font-semibold ring-1 ring-offset-0 ring-current`
                  : `${'cls' in chip ? chip.cls : 'border-sky-100 text-sky-600 bg-sky-50/50'} opacity-70 hover:opacity-100`
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* 内容 */}
      <div className="bg-white rounded-lg border border-slate-100 p-4 overflow-x-auto">
        {tabsContent.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}

interface RiskGridProps {
  risks: Array<WaveRisk & { wave: WaveRow }>;
  currencyUnit: CurrencyUnit;
}

const RiskGrid: React.FC<RiskGridProps> = ({ risks, currencyUnit }) => {
  if (risks.length === 0) {
    return <div className="text-center py-6 text-slate-500 text-sm">暂无风险</div>;
  }

  return (
    <div className="space-y-2">
      {risks.map((risk, idx) => {
        const levelColor = risk.level === 'danger' ? 'bg-red-50 border-l-4 border-red-500' :
                          risk.level === 'warning' ? 'bg-orange-50 border-l-4 border-orange-500' :
                          'bg-green-50 border-l-4 border-green-500';
        const levelBadge = risk.level === 'danger' ? 'bg-red-100 text-red-700' :
                          risk.level === 'warning' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700';
        const levelIcon = risk.level === 'danger' ? '🔴' :
                         risk.level === 'warning' ? '🟡' : '🟢';

        return (
          <div key={idx} className={`rounded border ${levelColor} p-3 space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-lg">{levelIcon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-700">{risk.waveName}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${levelBadge}`}>
                      {riskTypeLabels[risk.riskType] || risk.riskType}
                    </span>
                    {risk.priority && <span className="text-xs text-slate-500">优先级: {risk.priority}</span>}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{risk.message}</div>
                  {risk.impactAmount > 0 && (
                    <div className="text-xs text-slate-600 mt-1">
                      影响金额: {formatCurrency(risk.impactAmount, currencyUnit)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ActionGridProps {
  actions: WaveAction[];
  currencyUnit: CurrencyUnit;
}

const ActionGrid: React.FC<ActionGridProps> = ({ actions, currencyUnit }) => {
  if (actions.length === 0) {
    return <div className="text-center py-6 text-slate-500 text-sm">暂无动作建议</div>;
  }

  // 按优先级排序
  const priorityOrder: Record<string, number> = { '高': 0, '中': 1, '低': 2 };
  const sortedActions = [...actions].sort((a, b) => {
    // 首先按责任部门分组
    if (a.owner !== b.owner) {
      const ownerOrder: Record<string, number> = { '采购': 0, '企划': 1, '商品': 2, '财务': 3 };
      return (ownerOrder[a.owner] ?? 99) - (ownerOrder[b.owner] ?? 99);
    }
    return 0;
  });

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50">
          <th className="py-2 px-3 text-left font-semibold text-slate-600">波段</th>
          <th className="py-2 px-3 text-left font-semibold text-slate-600">建议动作</th>
          <th className="py-2 px-3 text-left font-semibold text-slate-600">责任部门</th>
          <th className="py-2 px-3 text-left font-semibold text-slate-600">截止时间</th>
          <th className="py-2 px-3 text-right font-semibold text-slate-600">预期节省</th>
        </tr>
      </thead>
      <tbody>
        {sortedActions.map((action, idx) => (
          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 px-3 font-medium text-slate-700">{action.waveName}</td>
            <td className="py-2 px-3 text-slate-600">{action.action}</td>
            <td className="py-2 px-3">
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {action.owner}
              </span>
            </td>
            <td className="py-2 px-3 text-slate-600">{action.deadline}</td>
            <td className="py-2 px-3 text-right">
              {action.estimatedSavings > 0 ? formatCurrency(action.estimatedSavings, currencyUnit) : '--'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
