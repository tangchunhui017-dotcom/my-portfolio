'use client';

import dimPlanRaw from '@/../data/dashboard/dim_plan.json';

const dimPlan = dimPlanRaw as {
  overall_plan?: { plan_active_skus?: number; plan_avg_sell_through?: number };
};

const PLAN_ACTIVE_SKUS = dimPlan.overall_plan?.plan_active_skus ?? 296;

type Tone = 'green' | 'amber' | 'red' | 'slate';

type KpisSnapshot = {
  activeSKUs: number;
  totalNetSales: number;
  newGoodsShare: number;
  arrivalRateProxy: number | null;
} | null;

type Props = {
  kpis: KpisSnapshot;
  onJumpToCategory?: () => void;
};

function skuAchievementTone(actual: number, plan: number): Tone {
  const rate = plan > 0 ? actual / plan : 0;
  if (rate >= 0.9) return 'green';
  if (rate >= 0.7) return 'amber';
  return 'red';
}

function skuEfficiencyTone(efficiencyWan: number): Tone {
  if (efficiencyWan >= 50) return 'green';
  if (efficiencyWan >= 25) return 'amber';
  return 'red';
}

function newGoodsTone(share: number): Tone {
  if (share >= 0.2 && share <= 0.5) return 'green';
  if (share >= 0.1) return 'amber';
  return 'red';
}

function arrivalTone(rate: number | null): Tone {
  if (rate === null) return 'slate';
  if (rate >= 0.85) return 'green';
  if (rate >= 0.65) return 'amber';
  return 'red';
}

const toneStyles: Record<Tone, { dot: string; card: string; label: string }> = {
  green: { dot: 'bg-emerald-400', card: 'border-emerald-100 bg-emerald-50/80 text-emerald-900', label: '正常' },
  amber: { dot: 'bg-amber-400', card: 'border-amber-100 bg-amber-50/80 text-amber-900', label: '关注' },
  red:   { dot: 'bg-rose-500',  card: 'border-rose-100 bg-rose-50/80 text-rose-900', label: '预警' },
  slate: { dot: 'bg-slate-300', card: 'border-slate-100 bg-slate-50/80 text-slate-700', label: '--' },
};

function Chip({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
  onClick?: () => void;
}) {
  const sty = toneStyles[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-w-0 rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${sty.card}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${sty.dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="truncate text-[22px] font-black leading-none tracking-tight">{value}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold opacity-70 shadow-sm">
          {sty.label}
        </span>
      </div>
      {sub && <div className="mt-2 truncate text-[11px] font-medium opacity-60">{sub}</div>}
    </button>
  );
}

export default function AssortmentHealthBar({ kpis, onJumpToCategory }: Props) {
  if (!kpis) return null;

  const { activeSKUs, totalNetSales, newGoodsShare, arrivalRateProxy } = kpis;

  const skuRate = PLAN_ACTIVE_SKUS > 0 ? activeSKUs / PLAN_ACTIVE_SKUS : 0;
  const efficiencyWan = activeSKUs > 0 ? totalNetSales / activeSKUs / 10000 : 0;

  const chips: { label: string; value: string; sub?: string; tone: Tone }[] = [
    {
      label: '在售款数',
      value: `${activeSKUs} 款`,
      sub: `计划 ${PLAN_ACTIVE_SKUS} · 达成 ${(skuRate * 100).toFixed(0)}%`,
      tone: skuAchievementTone(activeSKUs, PLAN_ACTIVE_SKUS),
    },
    {
      label: '款效',
      value: `${efficiencyWan.toFixed(1)} 万/款`,
      tone: skuEfficiencyTone(efficiencyWan),
    },
    {
      label: '新品贡献',
      value: `${(newGoodsShare * 100).toFixed(1)}%`,
      tone: newGoodsTone(newGoodsShare),
    },
    {
      label: '到货执行率',
      value: arrivalRateProxy !== null ? `${(Math.min(arrivalRateProxy, 1) * 100).toFixed(0)}%` : '--',
      tone: arrivalTone(arrivalRateProxy),
    },
  ];

  return (
    <section className="mt-6 mb-6 overflow-hidden rounded-section border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Assortment Health</div>
          <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900">货盘结构健康</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            用款数、款效、新品贡献和到货执行率先判断这盘货是否支撑当前经营节奏。
          </p>
        </div>
        <button
          type="button"
          onClick={onJumpToCategory}
          className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
        >
          查看品类结构
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {chips.map((chip) => (
          <Chip key={chip.label} {...chip} onClick={onJumpToCategory} />
        ))}
      </div>
    </section>
  );
}
