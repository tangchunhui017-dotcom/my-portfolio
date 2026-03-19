'use client';

interface DataSourceBadgeProps {
  source: 'manual' | 'openclaw';
  syncStatus: 'synced' | 'pending' | 'error';
  updatedBy?: string;
  updatedAt?: string;
}

const sourceConfig = {
  manual: { label: '手动录入', bgColor: 'bg-slate-100', textColor: 'text-slate-600', icon: '✏️' },
  openclaw: { label: 'OpenClaw', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', icon: '🔗' },
};

const syncConfig = {
  synced: { label: '已同步', dotColor: 'bg-emerald-400' },
  pending: { label: '待同步', dotColor: 'bg-amber-400' },
  error: { label: '同步异常', dotColor: 'bg-red-400' },
};

export default function DataSourceBadge({ source, syncStatus, updatedBy, updatedAt }: DataSourceBadgeProps) {
  const src = sourceConfig[source];
  const sync = syncConfig[syncStatus];

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${src.bgColor} ${src.textColor}`}>
      <span>{src.icon}</span>
      <span>{src.label}</span>
      <span className={`h-2 w-2 rounded-full ${sync.dotColor}`} title={sync.label} />
      {updatedBy && <span className="text-slate-400">· {updatedBy}</span>}
      {updatedAt && (
        <span className="text-slate-400">
          · {new Date(updatedAt).toLocaleDateString('zh-CN')}
        </span>
      )}
    </div>
  );
}
