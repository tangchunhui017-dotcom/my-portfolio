'use client';

import Link from 'next/link';
import type { SeriesWithBrief } from '@/lib/design-review-center/types';
import { RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';

interface SeriesExpressionCardProps {
  series: SeriesWithBrief;
}

export default function SeriesExpressionCard({ series }: SeriesExpressionCardProps) {
  const riskConfig = RISK_LEVEL_MAP[series.riskLevel];
  const heroCount = series.productRoleMix.hero;
  const coreCount = series.productRoleMix.core;
  const fillerCount = series.productRoleMix.filler;

  return (
    <Link href={`/design-review-center/series/${series.seriesId}`}>
      <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-slate-100">
          <img src={series.heroImage} alt={series.seriesName} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          {series.riskLevel !== 'low' && (
            <div className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${riskConfig.bgColor} ${riskConfig.textColor}`}>
              {riskConfig.icon} {riskConfig.label}
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900">{series.seriesName}</h4>
            <div className="mt-1 text-xs text-slate-500">{series.designTheme}</div>
          </div>
          <div className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{series.priceBand}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {series.styleKeywords.slice(0, 3).map((keyword) => (
            <span key={keyword} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {keyword}
            </span>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
          <div>
            <div className="text-slate-400">目标人群</div>
            <div className="mt-1 font-medium text-slate-700">{series.targetConsumer}</div>
          </div>
          <div>
            <div className="text-slate-400">场合</div>
            <div className="mt-1 font-medium text-slate-700">{series.occasion}</div>
          </div>
          <div>
            <div className="text-slate-400">品类</div>
            <div className="mt-1 font-medium text-slate-700">{series.targetCategories.join(' / ')}</div>
          </div>
          <div>
            <div className="text-slate-400">楦底方向</div>
            <div className="mt-1 font-medium text-slate-700">
              {series.brief?.silhouetteDirections?.slice(0, 2).join(' / ') ?? '待补充'}
            </div>
          </div>
        </div>

        {series.brief && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-medium text-slate-700">评审重点</div>
            <div className="mt-1 line-clamp-2">{series.brief.reviewFocus.join(' · ')}</div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-600">
          <div>
            <div className="text-lg font-semibold text-slate-900">{series.designItems.length}</div>
            <div>单款</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-rose-600">{series.risks.length}</div>
            <div>风险</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-amber-600">{series.tasks.length}</div>
            <div>待办</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-indigo-600">{series.assets.length}</div>
            <div>资产</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>角色: H{heroCount} / C{coreCount} / F{fillerCount}</span>
          <span>{series.owner}</span>
        </div>

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-600">进度</span>
            <span className="font-medium text-slate-900">{series.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${series.progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
