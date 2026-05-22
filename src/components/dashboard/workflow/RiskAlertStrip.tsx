'use client';

import type { NodeStatus, RiskLevel } from '@/config/bigMerchWorkflow';
import type { WorkflowFilter } from '@/config/bigMerchWorkflow';
import type { WorkflowNodeDef } from '@/config/bigMerchWorkflow';

interface RiskAlertStripProps {
  nodes: WorkflowNodeDef[];
  nodeStatuses: Record<string, NodeStatus>;
  nodeRisks: Record<string, RiskLevel>;
  activeFilter: WorkflowFilter | null;
  onFilter: (filter: WorkflowFilter | null) => void;
}

type ChipDef = {
  key: string;
  label: string;
  count: number;
  tone: string;
  filter: WorkflowFilter;
};

const TONE_CHIP: Record<string, string> = {
  rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  sky: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
};

const TONE_CHIP_ACTIVE: Record<string, string> = {
  rose: 'bg-rose-100 text-rose-800 border-rose-400 ring-1 ring-rose-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-400 ring-1 ring-amber-300',
  sky: 'bg-sky-100 text-sky-800 border-sky-400 ring-1 ring-sky-300',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-400 ring-1 ring-emerald-300',
  slate: 'bg-slate-100 text-slate-800 border-slate-400 ring-1 ring-slate-300',
};

export default function RiskAlertStrip({
  nodes,
  nodeStatuses,
  nodeRisks,
  activeFilter,
  onFilter,
}: RiskAlertStripProps) {
  const overdueNodes = nodes.filter((n) => nodeStatuses[n.id] === '延期');
  const collabNodes = nodes.filter((n) => nodeStatuses[n.id] === '待协同');
  const warningNodes = nodes.filter((n) => nodeStatuses[n.id] === '预警');
  const highRiskNodes = nodes.filter((n) => nodeRisks[n.id] === '高');

  const chips: ChipDef[] = [
    {
      key: 'overdue',
      label: `延期 ${overdueNodes.length}`,
      count: overdueNodes.length,
      tone: 'rose',
      filter: { status: ['延期'] as NodeStatus[] },
    },
    {
      key: 'collab',
      label: `待协同 ${collabNodes.length}`,
      count: collabNodes.length,
      tone: 'amber',
      filter: { status: ['待协同'] as NodeStatus[] },
    },
    {
      key: 'warning',
      label: `预警 ${warningNodes.length}`,
      count: warningNodes.length,
      tone: 'rose',
      filter: { status: ['预警'] as NodeStatus[] },
    },
    {
      key: 'highRisk',
      label: `高风险 ${highRiskNodes.length}`,
      count: highRiskNodes.length,
      tone: 'amber',
      filter: { riskLevel: ['高'] as RiskLevel[] },
    },
  ].filter((c) => c.count > 0);

  // 如果没有任何风险，显示健康状态
  if (chips.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-medium text-emerald-600">当前周期无风险预警</span>
      </div>
    );
  }

  function isChipActive(chip: ChipDef): boolean {
    if (!activeFilter) return false;
    const f = chip.filter;
    if (f.status && JSON.stringify(activeFilter.status) === JSON.stringify(f.status)) return true;
    if (f.riskLevel && JSON.stringify(activeFilter.riskLevel) === JSON.stringify(f.riskLevel)) return true;
    if (f.stage && JSON.stringify(activeFilter.stage) === JSON.stringify(f.stage)) return true;
    if (f.dept && JSON.stringify(activeFilter.dept) === JSON.stringify(f.dept)) return true;
    return false;
  }

  function handleChipClick(chip: ChipDef) {
    if (isChipActive(chip)) {
      onFilter(null);
    } else {
      onFilter(chip.filter);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">快速筛选</span>
      {chips.map((chip) => {
        const active = isChipActive(chip);
        const cls = active ? TONE_CHIP_ACTIVE[chip.tone] : TONE_CHIP[chip.tone];
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => handleChipClick(chip)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${cls}`}
          >
            {chip.label}
            {active && (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        );
      })}
      {activeFilter && (
        <button
          type="button"
          onClick={() => onFilter(null)}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          清除筛选
        </button>
      )}
    </div>
  );
}
