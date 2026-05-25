'use client';

import type { ColorwayEntry } from '@/lib/design-review-center/version-preview-derivations';

const STATUS_LABEL: Record<string, string> = {
  active:    '在用',
  pending:   '待确认',
  cancelled: '已取消',
};

const STATUS_COLOR: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-slate-100 text-slate-400 border-slate-200',
};

interface Props {
  entries: ColorwayEntry[];
}

export function ColorwayMatrix({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">暂无配色方案数据</div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`rounded-xl border p-3 flex flex-col gap-2 ${entry.status === 'cancelled' ? 'opacity-50' : ''}`}
        >
          {/* color swatch row */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-8 h-8 rounded-lg border border-black/10 flex-shrink-0"
              style={{ background: entry.primaryColor }}
            />
            <div className="flex gap-0.5 flex-wrap">
              {entry.secondaryColors.slice(0, 4).map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm border border-black/10"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* name */}
          <div className="text-xs font-medium text-slate-700 leading-tight line-clamp-2">
            {entry.name}
          </div>

          {/* status + cost delta row */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[entry.status]}`}
            >
              {STATUS_LABEL[entry.status]}
            </span>
            {entry.costDelta !== null && (
              <span
                className={`text-[10px] font-medium ${entry.costDelta > 0 ? 'text-rose-500' : entry.costDelta < 0 ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {entry.costDelta > 0 ? `+¥${entry.costDelta}` : entry.costDelta < 0 ? `-¥${Math.abs(entry.costDelta)}` : '成本持平'}
              </span>
            )}
          </div>

          {/* source version */}
          <div className="text-[10px] text-slate-400">来自 V{entry.sourceVersionNumber}</div>
        </div>
      ))}
    </div>
  );
}
