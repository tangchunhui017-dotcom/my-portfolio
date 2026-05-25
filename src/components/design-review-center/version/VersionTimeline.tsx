'use client';

import type { VersionTimelinePoint } from '@/lib/design-review-center/version-preview-derivations';
import { CHANGE_DRIVER_LABEL_MAP } from '@/lib/design-review-center/version-preview-derivations';

const DRIVER_COLOR: Record<string, string> = {
  design:      'bg-violet-100 text-violet-700',
  merch:       'bg-sky-100 text-sky-700',
  development: 'bg-emerald-100 text-emerald-700',
  cost:        'bg-amber-100 text-amber-700',
  cmf:         'bg-pink-100 text-pink-700',
  unknown:     'bg-slate-100 text-slate-500',
};

const CONCLUSION_LABEL: Record<string, string> = {
  pass:             '通过',
  pass_with_changes:'附条件通过',
  hold:             '暂缓',
  cancel:           '取消',
  cost_down:        '需降本',
  structure_adjust: '结构调整',
  material_rework:  '材料返工',
  next_round:       '下轮审核',
};

const CONCLUSION_COLOR: Record<string, string> = {
  pass:             'text-emerald-600',
  pass_with_changes:'text-amber-600',
  hold:             'text-slate-500',
  cancel:           'text-rose-500',
  cost_down:        'text-amber-600',
  structure_adjust: 'text-orange-600',
  material_rework:  'text-rose-600',
  next_round:       'text-sky-600',
};

interface Props {
  points: VersionTimelinePoint[];
  onSelectVersion?: (versionNumber: number) => void;
  selectedVersion?: number | null;
}

export function VersionTimeline({ points, onSelectVersion, selectedVersion }: Props) {
  if (points.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-0 min-w-max relative">
        {/* connecting line */}
        <div className="absolute top-9 left-10 right-10 h-px bg-slate-200 z-0" />

        {points.map((pt, idx) => {
          const isSelected = selectedVersion === pt.versionNumber;
          const driverColor = DRIVER_COLOR[pt.changeDriver] ?? DRIVER_COLOR.unknown;
          return (
            <div
              key={`${pt.versionNumber}-${pt.uploadedAt ?? idx}`}
              className="relative flex flex-col items-center gap-2 px-3 cursor-pointer group"
              style={{ minWidth: 120 }}
              onClick={() => onSelectVersion?.(pt.versionNumber)}
            >
              {/* node dot */}
              <div
                className={`relative z-10 mt-1.5 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all
                  ${isSelected ? 'border-violet-500 shadow-md shadow-violet-200' : 'border-slate-200 group-hover:border-slate-300'}`}
              >
                {pt.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pt.thumbnailUrl} alt={`V${pt.versionNumber}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">无图</div>
                )}
                {pt.isLatest && (
                  <div className="absolute top-0.5 right-0.5 bg-violet-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-sm leading-none">
                    最新
                  </div>
                )}
              </div>

              {/* version label */}
              <div className="text-center">
                <div className={`text-xs font-semibold ${isSelected ? 'text-violet-600' : 'text-slate-700'}`}>
                  V{pt.versionNumber}
                </div>
                <div className="text-[10px] text-slate-400">
                  {pt.uploadedAt ? pt.uploadedAt.slice(0, 10) : '—'}
                </div>
              </div>

              {/* change driver chip */}
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${driverColor}`}>
                {CHANGE_DRIVER_LABEL_MAP[pt.changeDriver]}
              </span>

              {/* conclusion badge */}
              {pt.reviewConclusion && (
                <span className={`text-[10px] font-medium ${CONCLUSION_COLOR[pt.reviewConclusion] ?? 'text-slate-500'}`}>
                  {CONCLUSION_LABEL[pt.reviewConclusion] ?? pt.reviewConclusion}
                </span>
              )}

              {/* approved by */}
              {pt.approvedBy && (
                <div className="text-[10px] text-slate-400 text-center">
                  ✓ {pt.approvedBy}
                  {pt.approvalMeeting && (
                    <span className="block text-[9px] text-slate-300">{pt.approvalMeeting}</span>
                  )}
                </div>
              )}

              {/* connector arrow (not last) */}
              {idx < points.length - 1 && (
                <div className="absolute top-9 right-0 z-10 translate-x-1/2 -translate-y-1/2 text-slate-300 text-xs">›</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
