'use client';

import type { DesignVsSampleEntry } from '@/lib/design-review-center/version-preview-derivations';

interface Props {
  entries: DesignVsSampleEntry[];
  designImageUrl?: string | null;
  sampleImageUrl?: string | null;
}

export function DesignVsSampleCompare({ entries, designImageUrl, sampleImageUrl }: Props) {
  const gapCount = entries.filter((e) => e.hasGap).length;

  return (
    <div className="flex flex-col gap-4">
      {/* hero image compare row */}
      {(designImageUrl || sampleImageUrl) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Design side — violet */}
          <div className="rounded-xl border-2 border-violet-200 overflow-hidden bg-violet-50">
            <div className="px-3 py-1.5 bg-violet-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-xs font-bold text-violet-700 uppercase tracking-widest">DESIGN</span>
              <span className="text-xs text-violet-500 ml-auto">效果图</span>
            </div>
            {designImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={designImageUrl} alt="设计效果图" className="w-full aspect-square object-contain p-2" />
            ) : (
              <div className="aspect-square flex items-center justify-center text-violet-300 text-sm">暂无效果图</div>
            )}
          </div>

          {/* Sample side — amber */}
          <div className="rounded-xl border-2 border-amber-200 overflow-hidden bg-amber-50">
            <div className="px-3 py-1.5 bg-amber-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">SAMPLE</span>
              <span className="text-xs text-amber-500 ml-auto">实物照片</span>
            </div>
            {sampleImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sampleImageUrl} alt="实物样品" className="w-full aspect-square object-contain p-2" />
            ) : (
              <div className="aspect-square flex items-center justify-center text-amber-300 text-sm">暂无样品照片</div>
            )}
          </div>
        </div>
      )}

      {/* gap summary banner */}
      {gapCount > 0 && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 flex items-center gap-3">
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0 text-rose-500" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1.5 14.5 13.5H1.5L8 1.5z" />
            <line x1="8" y1="6" x2="8" y2="9.5" />
            <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-sm text-rose-700 font-medium">检测到 {gapCount} 项设计与实物差异，需确认后方可提交</span>
        </div>
      )}
      {gapCount === 0 && entries.length > 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center gap-3">
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0 text-emerald-500" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,8 6,12 14,4" />
          </svg>
          <span className="text-sm text-emerald-700 font-medium">设计与实物一致，无明显差异</span>
        </div>
      )}

      {/* detail rows */}
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
        {entries.map((entry) => (
          <div key={entry.label} className={`grid grid-cols-[80px_1fr_1fr] text-xs ${entry.hasGap ? 'bg-rose-50/40' : ''}`}>
            <div className="px-3 py-2.5 font-medium text-slate-600 flex items-center bg-slate-50/60 border-r border-slate-100">
              {entry.label}
            </div>
            <div className="px-3 py-2.5 text-violet-700 border-r border-slate-100 flex items-start gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0 mt-1" />
              <span>{entry.designValue ?? <span className="text-slate-300">未记录</span>}</span>
            </div>
            <div className="px-3 py-2.5 flex flex-col gap-0.5">
              <div className="text-amber-700 flex items-start gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1" />
                <span>{entry.sampleValue ?? <span className="text-slate-300">未记录</span>}</span>
              </div>
              {entry.hasGap && entry.gapNote && (
                <div className="text-rose-500 text-[10px] pl-2.5">{entry.gapNote}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
