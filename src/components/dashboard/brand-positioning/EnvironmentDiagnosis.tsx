'use client';

import { useState } from 'react';
import {
  PEST_DATA,
  SWOT_DATA,
  type SwotDimensionKey,
  type SwotQuadrant,
} from '@/data/brandMarketResearch';

type ViewMode = 'pest' | 'swot';

const PEST_ACCENT: Record<string, { border: string; ring: string; bg: string; bgSoft: string; text: string; chip: string; dot: string }> = {
  indigo: { border: 'border-indigo-200', ring: 'ring-indigo-100', bg: 'bg-indigo-50/60', bgSoft: 'bg-indigo-50/30', text: 'text-indigo-700', chip: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  amber:  { border: 'border-amber-200',  ring: 'ring-amber-100',  bg: 'bg-amber-50/60',  bgSoft: 'bg-amber-50/30',  text: 'text-amber-700',  chip: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  rose:   { border: 'border-rose-200',   ring: 'ring-rose-100',   bg: 'bg-rose-50/60',   bgSoft: 'bg-rose-50/30',   text: 'text-rose-700',   chip: 'bg-rose-100 text-rose-700',   dot: 'bg-rose-500' },
  cyan:   { border: 'border-cyan-200',   ring: 'ring-cyan-100',   bg: 'bg-cyan-50/60',   bgSoft: 'bg-cyan-50/30',   text: 'text-cyan-700',   chip: 'bg-cyan-100 text-cyan-700',   dot: 'bg-cyan-500' },
};

const SWOT_ACCENT: Record<string, { border: string; bg: string; text: string; chip: string; barBg: string }> = {
  emerald: { border: 'border-emerald-200', bg: 'bg-gradient-to-br from-emerald-50/80 to-white', text: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-700', barBg: 'bg-emerald-500' },
  amber:   { border: 'border-amber-200',   bg: 'bg-gradient-to-br from-amber-50/80 to-white',   text: 'text-amber-700',   chip: 'bg-amber-100 text-amber-700',   barBg: 'bg-amber-500' },
  sky:     { border: 'border-sky-200',     bg: 'bg-gradient-to-br from-sky-50/80 to-white',     text: 'text-sky-700',     chip: 'bg-sky-100 text-sky-700',     barBg: 'bg-sky-500' },
  rose:    { border: 'border-rose-200',    bg: 'bg-gradient-to-br from-rose-50/80 to-white',    text: 'text-rose-700',    chip: 'bg-rose-100 text-rose-700',    barBg: 'bg-rose-500' },
};

const SWOT_DIMENSIONS: SwotDimensionKey[] = ['产品', '价格', '服务', '渠道', '供应链', '组织'];

function PestView() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PEST_DATA.map((d) => {
        const c = PEST_ACCENT[d.accent];
        return (
          <article key={d.key} className={`overflow-hidden rounded-2xl border ${c.border} bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
            {/* Header */}
            <div className={`relative ${c.bg} px-5 py-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-[0.24em] ${c.text} opacity-70`}>{d.subtitle}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${c.text}`}>{d.letter}</span>
                    <span className="text-base font-semibold text-slate-900">{d.title}</span>
                  </div>
                </div>
                <span className={`mt-1 h-2 w-2 rounded-full ${c.dot} shadow-[0_0_0_4px_rgba(255,255,255,0.6)]`} />
              </div>
            </div>

            {/* 环境信号 */}
            <div className="px-5 pt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">环境信号</div>
              <ul className="space-y-2">
                {d.signals.map((s) => (
                  <li key={s.keyword} className="flex items-start gap-2">
                    <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.dot}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{s.keyword}</div>
                      <div className="text-[11px] leading-snug text-slate-500">{s.brief}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mx-5 my-4 border-t border-dashed border-slate-200" />

            {/* 应对策略 */}
            <div className="px-5 pb-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <svg viewBox="0 0 12 12" fill="currentColor" className={`h-3 w-3 ${c.text}`}>
                  <path d="M7 0L1 7h4l-1 5 6-7H6l1-5z" />
                </svg>
                应对策略
              </div>
              <ul className="space-y-2">
                {d.responses.map((r) => (
                  <li key={r.keyword} className="flex items-start gap-2">
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${c.chip}`}>{r.keyword}</span>
                    <span className="text-[11px] leading-snug text-slate-600">{r.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SwotCellChip({ q, dim, focusDim }: { q: SwotQuadrant; dim: SwotDimensionKey; focusDim: SwotDimensionKey | 'all' }) {
  const item = q.items.find((i) => i.dimension === dim);
  const c = SWOT_ACCENT[q.accent];
  if (!item) return null;
  const isDimmed = focusDim !== 'all' && focusDim !== dim;
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-3 py-2 transition-opacity ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
      <div className="flex items-center gap-2">
        <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${c.chip}`}>{dim}</span>
        <span className={`text-xs font-bold ${c.text}`}>{item.keyword}</span>
      </div>
      <div className="mt-1 text-[11px] leading-snug text-slate-600">{item.description}</div>
    </div>
  );
}

function SwotView() {
  const [focusDim, setFocusDim] = useState<SwotDimensionKey | 'all'>('all');

  return (
    <div className="space-y-4">
      {/* 维度筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">维度聚焦</span>
        <button
          type="button"
          onClick={() => setFocusDim('all')}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
            focusDim === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部
        </button>
        {SWOT_DIMENSIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFocusDim(d === focusDim ? 'all' : d)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              focusDim === d
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* 2 × 2 SWOT */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SWOT_DATA.map((q) => {
          const c = SWOT_ACCENT[q.accent];
          return (
            <article key={q.key} className={`rounded-2xl border ${c.border} bg-white p-5 shadow-sm transition-all hover:shadow-md`}>
              <div className="mb-3 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${c.text}`}>{q.letter}</span>
                  <span className="text-base font-bold text-slate-900">{q.title}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{q.subtitle}</span>
                </div>
                <div className={`h-1.5 w-12 rounded-full ${c.barBg}`} />
              </div>
              <div className="space-y-2">
                {SWOT_DIMENSIONS.map((dim) => (
                  <SwotCellChip key={dim} q={q} dim={dim} focusDim={focusDim} />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function EnvironmentDiagnosis() {
  const [view, setView] = useState<ViewMode>('pest');

  return (
    <div className="space-y-5">
      {/* Tab 切换 + 导读 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm leading-6 text-slate-600">
            外部 <span className="font-semibold text-slate-900">8 大社会驱动信号</span> + 内部 <span className="font-semibold text-slate-900">6 维度能力盘点</span>，圈出本季战略落点。
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setView('pest')}
            className={`relative rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              view === 'pest'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            外部 · PEST
          </button>
          <button
            type="button"
            onClick={() => setView('swot')}
            className={`relative rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              view === 'swot'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            内部 · SWOT
          </button>
        </div>
      </div>

      {view === 'pest' ? <PestView /> : <SwotView />}
    </div>
  );
}
