'use client';

import type { WaveThemeBoardItem } from '@/lib/design-review-center/types';

interface ThemeWaveBoardProps {
  waves: WaveThemeBoardItem[];
  onWaveClick?: (waveId: string) => void;
}

const healthMeta: Record<
  WaveThemeBoardItem['themeHealth'],
  { label: string; bg: string; text: string; bar: string; border: string }
> = {
  healthy: { label: '健康', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-400', border: 'border-emerald-200' },
  warning: { label: '预警', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-400', border: 'border-amber-200' },
  high_risk: { label: '高风险', bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500', border: 'border-red-200' },
};

const riskMeta: Record<
  WaveThemeBoardItem['riskLevel'],
  { dot: string }
> = {
  low: { dot: 'bg-emerald-400' },
  medium: { dot: 'bg-amber-400' },
  high: { dot: 'bg-red-500' },
};

export default function ThemeWaveBoard({ waves, onWaveClick }: ThemeWaveBoardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">波段主题看板</div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">按波段审查主题健康与进度</h3>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {waves.map((wave) => {
          const hm = healthMeta[wave.themeHealth];
          const total = wave.statusDistribution.approved + wave.statusDistribution.in_progress + wave.statusDistribution.pending;

          return (
            <div
              key={wave.waveId}
              className="p-6 cursor-pointer hover:bg-slate-50/60 transition-colors"
              onClick={() => onWaveClick?.(wave.waveId)}
            >
              {/* Wave Title Row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-slate-900">{wave.waveName}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                      {wave.waveRole}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    上市目标：{wave.launchDate} · {wave.includedSeriesCount} 个系列
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold flex-shrink-0 ${hm.bg} ${hm.text} ${hm.border}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${riskMeta[wave.riskLevel].dot}`} />
                  {hm.label}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-black text-slate-900">{wave.targetStyleCount}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">目标款数</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <div className="text-2xl font-black text-emerald-700">{wave.confirmedStyleCount}</div>
                  <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">已定案</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <div className="text-2xl font-black text-amber-700">{wave.targetStyleCount - wave.confirmedStyleCount}</div>
                  <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">未确认</div>
                </div>
              </div>

              {/* Status Bar */}
              {total > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>系列状态分布</span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/50">
                    <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(wave.statusDistribution.approved / total) * 100}%` }} title={`已定案 ${wave.statusDistribution.approved}`} />
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${(wave.statusDistribution.in_progress / total) * 100}%` }} title={`进行中 ${wave.statusDistribution.in_progress}`} />
                    <div className="h-full bg-slate-300 transition-all" style={{ width: `${(wave.statusDistribution.pending / total) * 100}%` }} title={`待评审 ${wave.statusDistribution.pending}`} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[9px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{wave.statusDistribution.approved} 定案</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{wave.statusDistribution.in_progress} 进行中</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />{wave.statusDistribution.pending} 待评审</span>
                  </div>
                </div>
              )}

              {/* Cost Progress */}
              {wave.costProgress > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">成本进度</span>
                    <span className={`text-[10px] font-bold ${wave.costProgress > 100 ? 'text-red-600' : 'text-slate-600'}`}>
                      {wave.costProgress}% {wave.costProgress > 100 ? '⚡ 超额' : ''}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/50">
                    <div
                      className={`h-full rounded-full transition-all ${wave.costProgress > 100 ? 'bg-red-500' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(wave.costProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Recommended Action */}
              <div className={`rounded-lg border px-3 py-2 ${wave.riskLevel === 'high' ? 'border-red-100 bg-red-50' : wave.riskLevel === 'medium' ? 'border-amber-100 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${wave.riskLevel === 'high' ? 'text-red-600' : wave.riskLevel === 'medium' ? 'text-amber-600' : 'text-slate-500'}`}>
                  → 推荐行动
                </div>
                <p className={`text-xs font-semibold ${wave.riskLevel === 'high' ? 'text-red-900' : wave.riskLevel === 'medium' ? 'text-amber-900' : 'text-slate-700'}`}>
                  {wave.recommendedAction}
                </p>
              </div>

              {/* Immersive entry CTA */}
              <button
                onClick={(e) => { e.stopPropagation(); onWaveClick?.(wave.waveId); }}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                进入系列详情审查
              </button>

              {/* Business context */}
              {(wave.waveGoal || wave.mainPriceBand || wave.keyDeliverable || wave.weeklyAction) && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {wave.waveGoal && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">波段目标 </span>
                      <p className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">{wave.waveGoal}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {wave.heroSeries && wave.heroSeries.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Hero 系列 </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {wave.heroSeries.map((s) => (
                            <span key={s} className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {wave.mainPriceBand && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">主力价格带 </span>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{wave.mainPriceBand}</p>
                      </div>
                    )}
                  </div>
                  {wave.keyDeliverable && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">关键交付物 </span>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">{wave.keyDeliverable}</p>
                    </div>
                  )}
                  {wave.weeklyAction && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">本周行动 </span>
                      <p className="text-xs font-semibold text-blue-900 mt-0.5">{wave.weeklyAction}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
