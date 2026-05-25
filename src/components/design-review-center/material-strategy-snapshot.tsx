'use client';

import type { MaterialStrategySnapshot } from '@/lib/design-review-center/types';

interface Props {
  data: MaterialStrategySnapshot;
}

const RISK_CFG = {
  low:    { label: '低风险', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: '中风险', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  high:   { label: '高风险', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function MaterialStrategySnapshotPanel({ data }: Props) {
  const sustainablePct = Math.round(data.sustainableRatio.current * 100);
  const sustainableTargetPct = Math.round(data.sustainableRatio.target * 100);
  const reusePct = Math.round(data.platformReuseRate * 100);

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
        Material Strategy
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-4">材料战略快照</h3>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Strategic materials */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">战略材料</div>
          <div className="space-y-2">
            {data.strategicMaterials.map((m) => (
              <div key={m.name} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <div className="text-xs font-semibold text-slate-800">{m.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sustainability ratio + platform reuse */}
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">环保材料占比</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[28px] font-black text-slate-900">{sustainablePct}%</span>
              <span className="text-xs text-slate-400">目标 {sustainableTargetPct}%</span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-100">
              {/* Target marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                style={{ left: `${sustainableTargetPct}%` }}
              />
              <div
                className={`h-full rounded-full ${sustainablePct >= sustainableTargetPct ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${sustainablePct}%` }}
              />
            </div>
            {sustainablePct < sustainableTargetPct && (
              <p className="text-[11px] text-amber-600 mt-1">差距 {sustainableTargetPct - sustainablePct}pp，需加速替换</p>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">平台底型沿用率</div>
            <div className="text-[28px] font-black text-slate-900">{reusePct}%</div>
            <div className="text-[11px] text-slate-500">共用底型降低模具开发成本</div>
          </div>
        </div>

        {/* Supplier risks */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">关键供应商风险</div>
          <div className="space-y-2">
            {data.keySupplierRisks.map((s) => {
              const riskCfg = RISK_CFG[s.riskLevel];
              return (
                <div key={s.supplierName} className="flex items-start gap-2">
                  <span className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0 ${riskCfg.cls}`}>
                    {riskCfg.label}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">{s.supplierName}</div>
                    {s.isExclusive && (
                      <div className="text-[10px] text-violet-600 font-semibold">独占合作</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
