'use client';

import type { SeasonThemeStrategySummary, ThemeRiskDecisionItem } from '@/lib/design-review-center/types';

interface ThemeSeasonSummaryProps {
  data: SeasonThemeStrategySummary;
  risks?: ThemeRiskDecisionItem[];
}

const healthBandMeta = {
  healthy: { label: '主题健康', bar: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  warning: { label: '存在预警', bar: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  high_risk: { label: '高风险', bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
} as const;

export default function ThemeSeasonSummary({ data, risks }: ThemeSeasonSummaryProps) {
  const ss = data.seriesStructure;
  const hm = healthBandMeta[data.themeRiskLevel];
  const openRisks = risks?.filter((r) => r.actionStatus === 'open') ?? [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── 健康状态色带 ── */}
      <div className={`h-1.5 w-full ${hm.bar}`} />

      {/* ── Header: 主题名 + 健康状态 + 策略判断 ── */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">本季主题策略摘要</div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{data.seasonTheme}</h2>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${hm.bg} ${hm.text} ${hm.border}`}>
            <span className={`h-2 w-2 rounded-full ${hm.bar}`} />
            {hm.label}
          </span>
        </div>
        {data.strategyRationale && (
          <p className="mt-4 rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm font-semibold text-violet-900 leading-relaxed">
            <span className="font-black text-violet-600">策略判断：</span>
            {data.strategyRationale}
          </p>
        )}
      </div>

      {/* ── Row 1: 目标消费者 + 核心场景 ── */}
      <div className="grid divide-y sm:divide-y-0 sm:grid-cols-2 sm:divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-6 py-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">目标消费者</div>
          <p className="text-sm font-semibold text-slate-800">{data.targetConsumer}</p>
        </div>
        <div className="px-6 py-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">核心穿着场景</div>
          <p className="text-sm font-medium text-slate-700">{data.coreScenario}</p>
        </div>
      </div>

      {/* ── Row 2: 系列结构 + 商品目标 ── */}
      <div className="grid divide-y sm:divide-y-0 sm:grid-cols-2 sm:divide-x divide-slate-100 border-b border-slate-100">
        {/* 系列结构 */}
        <div className="px-6 py-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">系列结构</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-3">
              <div className="text-2xl font-black text-violet-700">{ss?.hero ?? data.seriesCount}</div>
              <div className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mt-0.5">Hero 系列</div>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-3">
              <div className="text-2xl font-black text-blue-700">{ss?.core ?? data.seriesInDevelopmentCount}</div>
              <div className="text-[9px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">核心系列</div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
              <div className="text-2xl font-black text-slate-700">{ss?.support ?? data.seriesPendingReviewCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">支撑系列</div>
            </div>
          </div>
        </div>

        {/* 商品目标 */}
        <div className="px-6 py-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">商品目标</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">总 SKU 目标</span>
              <span className="text-2xl font-black text-slate-900">{data.totalSkuTarget ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">毛利率目标</span>
              <span className="text-2xl font-black text-emerald-700">
                {data.targetGrossMarginRate ? `${Math.round(data.targetGrossMarginRate * 100)}%` : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">主力价格带</span>
              <span className="text-base font-black text-slate-800">{data.mainPriceBand ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">主力渠道</span>
              <span className="text-xs font-semibold text-slate-600">{data.mainChannel ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: 本周必须判断 ── */}
      {data.weeklyDecisions && data.weeklyDecisions.length > 0 && (
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black">{data.weeklyDecisions.length}</span>
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-600">本周必须判断</div>
          </div>
          <div className="divide-y divide-red-100 rounded-xl border border-red-200 bg-red-50/60 overflow-hidden">
            {data.weeklyDecisions.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-red-900 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 4: 关键风险快览（合并自 ThemeRiskDecision）── */}
      {openRisks.length > 0 && (
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">关键开放风险</div>
          <div className="flex flex-wrap gap-2">
            {openRisks.map((r) => (
              <div
                key={r.riskId}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-xs font-bold text-red-800">{r.riskObject}</span>
                <span className="text-[10px] text-red-600 font-semibold">{r.riskReason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
