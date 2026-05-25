'use client';

import type { TrendDirectionSnapshot } from '@/lib/design-review-center/types';

interface Props {
  data: TrendDirectionSnapshot;
}

export default function TrendDirectionSnapshotPanel({ data }: Props) {
  return (
    <section
      className="rounded-lg border border-violet-100 shadow-sm overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 50%, #f0f9ff 100%)' }}
    >
      <div className="px-6 py-4 flex flex-wrap items-center gap-6">
        {/* Left: Header */}
        <div className="flex-shrink-0 min-w-[140px]">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400 mb-1">
            Trend Direction
          </div>
          <div className="text-base font-bold text-slate-800">市场趋势方向</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{data.source}</div>
        </div>

        {/* Trend tags */}
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-[200px]">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-violet-100 border border-violet-200 px-3 py-1 text-[12px] font-semibold text-violet-700"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Color chips */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {data.colorStory.map((color) => (
            <div key={color.name} className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                style={{ background: color.hex }}
                title={color.name}
              />
              <span className="text-[10px] text-slate-500 whitespace-nowrap">{color.name}</span>
            </div>
          ))}
        </div>

        {/* Direction pills */}
        <div className="flex flex-col gap-1.5 flex-shrink-0 min-w-[200px]">
          <div className="flex gap-2 items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 w-14 flex-shrink-0">廓形</span>
            <span className="text-[12px] text-slate-700 leading-snug">{data.silhouetteDirection}</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 w-14 flex-shrink-0">材料</span>
            <span className="text-[12px] text-slate-700 leading-snug">{data.materialDirection}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
