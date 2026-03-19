'use client';

interface DataFreshnessSummaryProps {
  snapshotDate: string;
  currentOwner?: string;
  syncMode: string;
  syncedEntities: string[];
  sourceCounts: {
    manual: number;
    openclaw: number;
  };
  syncCounts: {
    synced: number;
    pending: number;
    error: number;
  };
}

const syncModeLabel: Record<string, string> = {
  manual: '手动快照',
  openclaw: 'OpenClaw 同步',
  api: 'API 同步',
};

function getSyncBadge(syncCounts: DataFreshnessSummaryProps['syncCounts']) {
  if (syncCounts.error > 0) {
    return {
      label: `同步异常 ${syncCounts.error}`,
      className: 'bg-rose-100 text-rose-700 border border-rose-200',
    };
  }

  if (syncCounts.pending > 0) {
    return {
      label: `待同步 ${syncCounts.pending}`,
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    };
  }

  return {
    label: '同步正常',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  };
}

export default function DataFreshnessSummary({
  snapshotDate,
  currentOwner,
  syncMode,
  syncedEntities,
  sourceCounts,
  syncCounts,
}: DataFreshnessSummaryProps) {
  const syncBadge = getSyncBadge(syncCounts);
  const detailItems = [
    `同步模式：${syncModeLabel[syncMode] || syncMode}`,
    currentOwner ? `当前负责人：${currentOwner}` : null,
    syncCounts.pending > 0 ? `待同步 ${syncCounts.pending}` : null,
    syncCounts.error > 0 ? `异常 ${syncCounts.error}` : null,
    sourceCounts.openclaw > 0 ? `OpenClaw ${sourceCounts.openclaw}` : null,
    syncedEntities.length > 0 ? `覆盖：${syncedEntities.join(' / ')}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">数据时间</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {new Date(snapshotDate).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${syncBadge.className}`}>
            {syncBadge.label}
          </span>
        </div>
      </div>

      {detailItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {detailItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}
