'use client';

import { useState, useMemo } from 'react';
import type { OtbProductArchitectureBreakdown, ArchAlignmentStatus } from '@/lib/design-review-center/types';

interface Props {
  items: OtbProductArchitectureBreakdown[];
}

const ALIGN_CLS: Record<ArchAlignmentStatus, string> = {
  aligned: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  not_aligned: 'border-slate-200 bg-slate-100 text-slate-500',
  deviated: 'border-red-200 bg-red-50 text-red-700',
};

const ALIGN_LABEL: Record<ArchAlignmentStatus, string> = {
  aligned: '已对齐',
  partial: '部分对齐',
  not_aligned: '未对齐',
  deviated: '存在偏离',
};

export default function ArchOtbBreakdown({ items }: Props) {
  const waves = useMemo(() => [...new Set(items.map((i) => i.waveId))], [items]);
  const [activeWave, setActiveWave] = useState(waves[0]);
  const filtered = items.filter((i) => i.waveId === activeWave);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 03</span>
            <h3 className="text-base font-semibold text-slate-900">OTB → 产品架构拆解</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">按波段 × 品类校验架构款数与 OTB 预算的承接一致性</p>
        </div>
        {/* Wave tabs */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {waves.map((w) => (
            <button
              key={w}
              onClick={() => setActiveWave(w)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${activeWave === w ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {items.find((i) => i.waveId === w)?.waveName ?? w}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <OtbCard key={`${item.waveId}-${item.category}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function OtbCard({ item }: { item: OtbProductArchitectureBreakdown }) {
  const statusCls = ALIGN_CLS[item.alignmentStatus];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{item.category}</p>
          <p className="text-xs text-slate-500">{item.waveName}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusCls}`}>
          {ALIGN_LABEL[item.alignmentStatus]}
        </span>
      </div>

      {/* SKU comparison */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="企划 SKU" value={String(item.plannedSkuCount)} />
        <Stat label="架构 SKU" value={String(item.architectureSkuCount)} />
        <Stat
          label="缺口"
          value={(item.skuGap >= 0 ? '+' : '') + item.skuGap}
          highlight={item.skuGap !== 0}
          bad={item.skuGap < -2}
        />
      </div>

      {/* Role mini-grid */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">款式角色对比</p>
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: 'Hero', t: item.heroSkuTarget, a: item.heroSkuActual },
            { label: 'Core', t: item.coreSkuTarget, a: item.coreSkuActual },
            { label: 'Test', t: item.testSkuTarget, a: item.testSkuActual },
            { label: 'Image', t: item.imageSkuTarget, a: item.imageSkuActual },
          ].map(({ label, t, a }) => (
            <div key={label} className={`rounded-lg p-1.5 text-center text-[11px] ${a < t ? 'bg-amber-50 border border-amber-200' : a > t ? 'bg-red-50 border border-red-100' : 'bg-white border border-slate-200'}`}>
              <p className="font-bold text-slate-700">{a}/{t}</p>
              <p className="text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Price band */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <BandRow label="价格带目标" value={item.priceBandTarget} />
        <BandRow label="架构实际" value={item.priceBandActual} />
      </div>

      {/* Cost variance */}
      <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${item.costVariance > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <span className="text-slate-600">OTB预算 ¥{item.otbBudget}万 → 架构估算 ¥{item.architectureCostEstimate}万</span>
        <span className={`font-bold ${item.costVariance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
          {item.costVariance > 0 ? '+' : ''}{item.costVariance}万
        </span>
      </div>

      {/* New mold */}
      <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${item.newMoldActual > item.newMoldLimit ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
        <span className="text-slate-600">新模 {item.newMoldActual}/{item.newMoldLimit} 套</span>
        {item.newMoldActual > item.newMoldLimit && (
          <span className="font-bold text-red-700">超出 {item.newMoldActual - item.newMoldLimit} 套</span>
        )}
      </div>

      {/* Recommended action */}
      <p className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 leading-relaxed">
        {item.recommendedAction}
      </p>
    </div>
  );
}

function Stat({ label, value, highlight = false, bad = false }: { label: string; value: string; highlight?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-2">
      <p className={`text-base font-bold ${highlight ? (bad ? 'text-red-600' : 'text-amber-600') : 'text-slate-800'}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function BandRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}
