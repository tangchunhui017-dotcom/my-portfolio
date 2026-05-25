'use client';

import type { ArchLandingSummary } from '@/lib/design-review-center/arch-derivations';

interface Props {
  data: ArchLandingSummary;
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

const HEALTH_MAP = {
  healthy: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    label: '架构健康',
  },
  warning: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    label: '待改善',
  },
  high_risk: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
    label: '高风险',
  },
};

export default function ArchLandingSummary({ data }: Props) {
  const h = HEALTH_MAP[data.healthStatus];

  const metrics: { label: string; value: string; sub: string; risk: boolean }[] = [
    {
      label: 'SKU 目标',
      value: String(data.skuTarget),
      sub: '商品企划 OTB 目标',
      risk: false,
    },
    {
      label: '已拆解款位',
      value: String(data.styleDecomposed),
      sub: data.skuGap > 0 ? `缺口 ${data.skuGap} 款` : '已全部拆解',
      risk: data.skuGap > 0,
    },
    {
      label: '已生成设计任务',
      value: String(data.taskGenerated),
      sub: `待下发 ${data.styleDecomposed - data.taskGenerated} 款`,
      risk: data.taskGenerated < data.styleDecomposed,
    },
    {
      label: 'Hero 款数',
      value: String(data.heroCount),
      sub: '建议 ≥ 2 款',
      risk: data.heroCount < 2,
    },
    {
      label: '新模数量',
      value: String(data.newToolingCount),
      sub: `共底率 ${pct(data.sharedSoleRate)} · 共楦率 ${pct(data.sharedLastRate)}`,
      risk: data.newToolingCount > 6,
    },
    {
      label: '新款 / 续款',
      value: `${data.newCount} / ${data.carryoverCount}`,
      sub: '新款 / 续款 拆解数',
      risk: false,
    },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 shadow-sm">
      <div className="relative px-8 py-7 border-b border-slate-100/80">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 via-blue-500 to-cyan-400" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-500">
              Product Architecture Workbench
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">产品架构工作台</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              商品企划 OTB → 品类 / 系列 / 款型 / 底楦 / SKU 系统拆解 · 产出设计任务包与开发约束
            </p>
            {data.mustDecideCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                本周必决策 {data.mustDecideCount} 项
              </div>
            )}
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${h.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${h.dot}`} />
            <span className="text-xs font-bold uppercase tracking-widest">{h.label}</span>
          </div>
        </div>

        {data.biggestRisk && data.biggestRisk !== '无显著架构风险' && (
          <div className="relative mt-4 rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm px-4 py-2.5 text-sm text-slate-700">
            <span className="font-semibold text-slate-500">最大风险：</span>
            {data.biggestRisk}
            {data.recommendedAction && (
              <span className="ml-3 text-indigo-600">· 推荐：{data.recommendedAction}</span>
            )}
          </div>
        )}
      </div>

      {/* KPI 网格 */}
      <div className="grid grid-cols-2 gap-px bg-slate-200/60 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white/80 backdrop-blur-sm px-5 py-4">
            <div className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
              {m.label}
            </div>
            <div className={`mt-2 text-2xl font-black ${m.risk ? 'text-rose-600' : 'text-slate-900'}`}>
              {m.value}
            </div>
            <div className={`mt-1 text-[11px] leading-4 ${m.risk ? 'text-rose-500' : 'text-slate-500'}`}>
              {m.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
