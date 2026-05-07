'use client';

import factPlanRaw from '@/../data/dashboard/fact_plan.json';
import dimWavePlanRaw from '@/../data/dashboard/dim_wave_plan.json';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import { formatMoneyCny } from '@/config/numberFormat';

type FactPlanRow = {
  year: number;
  season: string;
  wave: string;
  plan_sku: number;
  plan_otb_budget: number;
  plan_buy_units: number;
};

type DimWavePlanRow = {
  id: string;
  season: string;
  wave: string;
  launch_date: string;
  sku_plan: number;
  sku_actual: number;
};

type Props = {
  filters: DashboardFilters;
};

export default function OtbBudgetStrip({ filters }: Props) {
  const factPlan = factPlanRaw as FactPlanRow[];
  const dimWavePlan = dimWavePlanRaw as DimWavePlanRow[];

  const today = new Date();
  const selectedYear =
    filters.season_year !== 'all' ? Number(filters.season_year) : null;

  const filteredPlan = selectedYear
    ? factPlan.filter((r) => r.year === selectedYear)
    : factPlan;

  if (filteredPlan.length === 0) return null;

  const waveInfoMap = new Map(dimWavePlan.map((w) => [w.id, w]));

  const waves = filteredPlan.map((r) => {
    const waveId = `${r.season}-${r.wave}`;
    const info = waveInfoMap.get(waveId);
    const isExecuted = info ? new Date(info.launch_date) <= today : false;
    return {
      waveId,
      season: r.season,
      wave: r.wave,
      otbBudget: r.plan_otb_budget,
      isExecuted,
    };
  });

  const totalBudget = waves.reduce((s, w) => s + w.otbBudget, 0);
  const executedBudget = waves
    .filter((w) => w.isExecuted)
    .reduce((s, w) => s + w.otbBudget, 0);
  const remainingBudget = totalBudget - executedBudget;
  const executionRate = totalBudget > 0 ? executedBudget / totalBudget : 0;
  const executedCount = waves.filter((w) => w.isExecuted).length;
  const totalCount = waves.length;

  // 季节标签：若同年有多个 season 则合并显示
  const seasons = [...new Set(waves.map((w) => w.season))];
  const seasonLabel =
    seasons.length === 1
      ? seasons[0]
      : `${selectedYear ?? '全部'}年 · ${seasons.length} 季`;

  const tone =
    executionRate >= 0.9
      ? 'emerald'
      : executionRate >= 0.5
      ? 'amber'
      : 'slate';

  const toneBar: Record<string, string> = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    slate: 'bg-slate-300',
  };
  const toneText: Record<string, string> = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    slate: 'text-slate-500',
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

        {/* 标题区 */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 whitespace-nowrap">
            OTB 预算
          </div>
          <div className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 whitespace-nowrap">
            {seasonLabel}
          </div>
        </div>

        {/* 数字区 */}
        <div className="flex flex-1 flex-wrap items-center gap-5">
          <div>
            <div className="text-[10px] font-medium text-slate-400">本季总预算</div>
            <div className="mt-0.5 text-[15px] font-black tracking-tight text-slate-900">
              {formatMoneyCny(totalBudget)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-400">
              已执行 ({executedCount}/{totalCount} 波)
            </div>
            <div className="mt-0.5 text-[15px] font-bold text-slate-700">
              {formatMoneyCny(executedBudget)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-400">剩余预算</div>
            <div
              className={`mt-0.5 text-[15px] font-bold ${
                remainingBudget > 0 ? 'text-sky-700' : 'text-slate-400'
              }`}
            >
              {remainingBudget > 0 ? formatMoneyCny(remainingBudget) : '—'}
            </div>
          </div>

          {/* 执行率 + 进度条 */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right">
              <div className="text-[10px] font-medium text-slate-400">执行率</div>
              <div className={`mt-0.5 text-[18px] font-black ${toneText[tone]}`}>
                {(executionRate * 100).toFixed(0)}%
              </div>
            </div>
            <div className="w-28">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${toneBar[tone]}`}
                  style={{ width: `${Math.min(executionRate * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                <span>0</span>
                <span>{formatMoneyCny(totalBudget)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
