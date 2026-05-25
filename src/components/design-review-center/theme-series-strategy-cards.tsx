'use client';

import { useState } from 'react';
import type { SeriesStrategyCard } from '@/lib/design-review-center/types';

interface ThemeSeriesStrategyCardsProps {
  cards: SeriesStrategyCard[];
}

const decisionMeta: Record<
  SeriesStrategyCard['decisionStatus'],
  { label: string; bg: string; text: string; border: string }
> = {
  recommend_proceed: { label: '推荐推进', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  pending_review: { label: '待评审', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  needs_adjustment: { label: '需调整 ⚡', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  small_batch: { label: '小批量测试', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  cancel: { label: '建议取消', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
};

const roleMeta: Record<
  SeriesStrategyCard['seriesRole'],
  { label: string; bg: string; text: string }
> = {
  hero: { label: '主推', bg: 'bg-violet-100', text: 'text-violet-700' },
  image: { label: '形象', bg: 'bg-blue-100', text: 'text-blue-700' },
  profit: { label: '利润', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  test: { label: '测试', bg: 'bg-slate-100', text: 'text-slate-600' },
  traffic: { label: '流量', bg: 'bg-amber-100', text: 'text-amber-700' },
  base: { label: '基础', bg: 'bg-gray-100', text: 'text-gray-600' },
};

function SeriesCard({ card }: { card: SeriesStrategyCard }) {
  const dm = decisionMeta[card.decisionStatus];
  const rm = roleMeta[card.seriesRole];
  const mainChannels = card.mainChannels ?? [];

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${card.decisionStatus === 'needs_adjustment' ? 'border-red-200' : 'border-slate-200'}`}>
      {/* Decision Status Accent */}
      <div className={`h-1 w-full ${card.decisionStatus === 'recommend_proceed' ? 'bg-emerald-400' : card.decisionStatus === 'needs_adjustment' ? 'bg-red-500' : card.decisionStatus === 'small_batch' ? 'bg-blue-400' : card.decisionStatus === 'cancel' ? 'bg-rose-500' : 'bg-slate-300'}`} />

      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-black text-slate-900">{card.seriesName}</h4>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rm.bg} ${rm.text}`}>{rm.label}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{card.waveId}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 font-medium line-clamp-1">{card.targetConsumer}</p>
          </div>
          <div className={`flex-shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${dm.bg} ${dm.text} ${dm.border}`}>
            {dm.label}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          {card.relatedCategories.map((cat) => (
            <span key={cat} className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {cat}
            </span>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-base font-black text-slate-900">{card.targetSkuCount}</div>
            <div className="text-[9px] font-bold text-slate-400 mt-0.5">目标款</div>
          </div>
          <div className="rounded-lg bg-violet-50 p-2 text-center">
            <div className="text-base font-black text-violet-700">{card.heroStyleCount}</div>
            <div className="text-[9px] font-bold text-violet-400 mt-0.5">Hero</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-[11px] font-black text-slate-700 truncate">{card.costBand}</div>
            <div className="text-[9px] font-bold text-slate-400 mt-0.5">成本带</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-center">
            <div className="truncate text-[11px] font-black text-blue-700">{card.targetPriceBand}</div>
            <div className="mt-0.5 text-[9px] font-bold text-blue-400">目标零售价</div>
          </div>
        </div>

        {mainChannels.length > 0 && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">主渠道</div>
            <div className="flex flex-wrap gap-1">
              {mainChannels.map((channel) => (
                <span key={channel} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {channel}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        <div className="flex flex-wrap gap-1">
          {card.designKeywords.slice(0, 4).map((kw) => (
            <span key={kw} className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
              {kw}
            </span>
          ))}
        </div>

        {/* Decision Reason */}
        <div className={`rounded-lg px-3 py-2 border ${card.decisionStatus === 'needs_adjustment' || card.decisionStatus === 'cancel' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">决策依据</div>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">{card.decisionReason}</p>
        </div>

        {/* Recommended Action */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-600 font-bold">→</span>
          <p className="text-xs font-semibold text-blue-800 leading-relaxed">{card.recommendedAction}</p>
        </div>

        {/* Benchmark brands */}
        {card.benchmarkBrands.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Benchmark:</span>
            {card.benchmarkBrands.map((b) => (
              <span key={b} className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThemeSeriesStrategyCards({ cards }: ThemeSeriesStrategyCardsProps) {
  const [waveFilter, setWaveFilter] = useState<string | null>(null);
  const waves = Array.from(new Set(cards.map((c) => c.waveId))).sort();
  const filtered = waveFilter ? cards.filter((c) => c.waveId === waveFilter) : cards;

  // Summary counts
  const needsAction = cards.filter((c) => c.decisionStatus === 'needs_adjustment' || c.decisionStatus === 'cancel').length;
  const proceedCount = cards.filter((c) => c.decisionStatus === 'recommend_proceed').length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">系列策略卡</div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">各系列定位·决策·推荐行动</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {needsAction > 0 && (
            <span className="rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1">
              {needsAction} 个系列需决策
            </span>
          )}
          <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1">
            {proceedCount} 个推荐推进
          </span>
        </div>
      </div>

      {/* Wave Filter */}
      {waves.length > 1 && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">波段</span>
          <button
            onClick={() => setWaveFilter(null)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${waveFilter === null ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            全部
          </button>
          {waves.map((w) => (
            <button
              key={w}
              onClick={() => setWaveFilter(w === waveFilter ? null : w)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${waveFilter === w ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      <div className="p-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((card) => (
          <SeriesCard key={card.seriesId} card={card} />
        ))}
      </div>
    </div>
  );
}
