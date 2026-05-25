'use client';

import { useState } from 'react';
import type { SeasonDesignStrategy } from '@/lib/design-review-center/types';

interface Props {
  strategies: SeasonDesignStrategy[];
}

function StrategyCard({ strategy }: { strategy: SeasonDesignStrategy }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-lg border border-violet-100 bg-[linear-gradient(135deg,#faf5ff_0%,#fff_60%)] p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-violet-400 mb-1">
            {strategy.seriesId}
          </div>
          <h3 className="text-base font-bold text-slate-900">{strategy.seasonTheme}</h3>
          {/* Trend tags */}
          {strategy.trendTags && strategy.trendTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {strategy.trendTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-600"
                >
                  🔗 {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {strategy.riskNote && (
          <span className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
            ⚠ 待完善
          </span>
        )}
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1.5">
        {strategy.designKeywords.map((kw) => (
          <span
            key={kw}
            className="rounded-full bg-violet-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700"
          >
            {kw}
          </span>
        ))}
      </div>

      {/* Core info grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="block text-slate-400 mb-0.5">目标人群</span>
          <span className="font-medium text-slate-700">{strategy.targetConsumer}</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="block text-slate-400 mb-0.5">使用场景</span>
          <span className="font-medium text-slate-700">{strategy.scenario}</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="block text-slate-400 mb-0.5">主鞋型</span>
          <span className="font-medium text-slate-700">{strategy.mainShoeTypes.join(' / ')}</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="block text-slate-400 mb-0.5">色彩故事</span>
          <span className="font-medium text-slate-700">{strategy.colorStory}</span>
        </div>
        {strategy.priceBand && (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <span className="block text-slate-400 mb-0.5">价格带</span>
            <span className="font-medium text-slate-700">{strategy.priceBand}</span>
          </div>
        )}
        {strategy.channels && strategy.channels.length > 0 && (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <span className="block text-slate-400 mb-0.5">主销渠道</span>
            <span className="font-medium text-slate-700">{strategy.channels.join(' · ')}</span>
          </div>
        )}
      </div>

      {/* Expand: material + functions + dont-rules */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {expanded ? '收起详情' : '展开材质 / 功能 / 禁区'}
      </button>

      {expanded && (
        <div className="space-y-3 text-xs border-t border-slate-100 pt-3">
          <div>
            <span className="font-semibold text-slate-500 block mb-1">材质方向</span>
            <p className="text-slate-700">{strategy.materialDirection}</p>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block mb-1">功能卖点</span>
            <div className="flex flex-wrap gap-1.5">
              {strategy.functionBenefits.map((f) => (
                <span key={f} className="rounded-full bg-blue-100/60 px-2 py-0.5 text-blue-700 font-medium">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block mb-1">设计边界</span>
            <p className="text-slate-600">{strategy.designBoundary}</p>
          </div>
          {/* Competitive diff */}
          {strategy.competitorDiff && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
              <span className="font-semibold text-blue-700 block mb-0.5">竞品差异化</span>
              <p className="text-blue-600">{strategy.competitorDiff}</p>
            </div>
          )}
          {/* Strategy basis */}
          {strategy.strategyBasis && (
            <div className="text-slate-400">
              <span className="font-semibold text-slate-500">策略依据：</span>
              {strategy.strategyBasis}
            </div>
          )}
          <div>
            <span className="font-semibold text-rose-500 block mb-1">禁区 Don&apos;ts</span>
            <ul className="space-y-1">
              {strategy.dontRules.map((rule) => (
                <li key={rule} className="flex gap-1.5 text-rose-600">
                  <span className="flex-shrink-0">✕</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          {strategy.riskNote && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700">
              ⚠ {strategy.riskNote}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function SeasonDesignStrategyPanel({ strategies }: Props) {
  if (strategies.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
          Season Design Strategy
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">本季设计策略摘要</h2>
        <div className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-400 text-center">
          暂无设计策略数据，请先完成系列策略配置。
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
          Season Design Strategy
        </div>
        <h2 className="text-xl font-bold text-slate-900">本季设计策略摘要</h2>
        <p className="mt-1 text-xs text-slate-400">
          {strategies.length} 个系列 · 设计方向、目标人群、材质色彩与功能卖点总览
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {strategies.map((s) => (
          <StrategyCard key={s.seriesId} strategy={s} />
        ))}
      </div>
    </section>
  );
}
