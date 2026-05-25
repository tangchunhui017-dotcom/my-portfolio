'use client';

import type { SeasonThemeBanner } from '@/lib/design-review-center/types';

interface SeasonThemeBannerProps {
  data: SeasonThemeBanner;
}

function TrendCascadeBar({ trendCascade, themeName }: { trendCascade: SeasonThemeBanner['trendCascade']; themeName: string }) {
  return (
    <div className="mt-8 overflow-x-auto">
      <div className="flex min-w-[640px] items-stretch gap-0">
        {/* Node 1: 大趋势 */}
        <div className="flex-shrink-0 w-[22%]">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">大趋势</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 h-full">
            <div className="flex flex-wrap gap-1.5">
              {trendCascade.macroTrends.map((t) => (
                <span key={t} className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Arrow 1 */}
        <div className="flex items-center px-2 text-slate-300 text-lg font-black flex-shrink-0">→</div>

        {/* Node 2: 品牌解读 */}
        <div className="flex-shrink-0 w-[26%]">
          <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-2">品牌解读</div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 h-full flex items-center">
            <p className="text-xs font-bold text-indigo-900 leading-snug">{trendCascade.brandInterpretation}</p>
          </div>
        </div>

        {/* Arrow 2 */}
        <div className="flex items-center px-2 text-slate-300 text-lg font-black flex-shrink-0">→</div>

        {/* Node 3: 本季主题 */}
        <div className="flex-shrink-0 w-[18%]">
          <div className="text-[9px] font-black uppercase tracking-widest text-violet-500 mb-2">本季主题</div>
          <div className="rounded-xl border border-violet-300 bg-violet-100/70 p-3 h-full flex items-center justify-center">
            <span className="text-xs font-black text-violet-900 text-center leading-snug">{themeName}</span>
          </div>
        </div>

        {/* Arrow 3 */}
        <div className="flex items-center px-2 text-slate-300 text-lg font-black flex-shrink-0">→</div>

        {/* Node 4: 系列方向 */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2">系列落地方向</div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 h-full">
            <div className="flex flex-wrap gap-1.5">
              {trendCascade.seriesDirections.map((sd) => (
                <div key={sd.seriesName} className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1">
                  <span className="text-[10px] font-black text-emerald-800">{sd.seriesName}</span>
                  <span className="text-[9px] text-emerald-400">·</span>
                  <span className="text-[9px] font-medium text-emerald-600">{sd.trendBasis}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SeasonThemeBannerComponent({ data }: SeasonThemeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40 shadow-sm">
      {/* 左侧渐变彩条 */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 via-violet-500 to-emerald-400" />

      {/* Background decoration — 极淡 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" />
      </div>

      <div className="relative px-8 py-8">
        {/* Top row: tags */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
              {data.brandTag}
            </span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
              {data.seasonTag}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            主题宣言 · 趋势承接链路
          </div>
        </div>

        {/* Theme name + concept statement */}
        <div className="max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-none">
            {data.themeName}
          </h2>
          <p className="mt-3 text-base font-semibold italic text-indigo-700/80 sm:text-lg">
            "{data.conceptStatement}"
          </p>
        </div>

        {/* Trend cascade bar */}
        <TrendCascadeBar trendCascade={data.trendCascade} themeName={data.themeName} />
      </div>
    </div>
  );
}
