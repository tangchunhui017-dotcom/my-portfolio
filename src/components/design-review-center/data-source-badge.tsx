'use client';

interface DataSourceBadgeProps {
  source: 'manual' | 'openclaw';
  syncStatus: 'synced' | 'pending' | 'error';
  updatedBy?: string;
  updatedAt?: string;
}

const sourceConfig = {
  manual: { label: '手动录入', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  openclaw: { label: 'OpenClaw', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
};

const syncConfig = {
  synced: { label: '已同步', dotColor: 'bg-emerald-400' },
  pending: { label: '待同步', dotColor: 'bg-amber-400' },
  error: { label: '同步异常', dotColor: 'bg-red-400' },
};

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN');
}

export default function DataSourceBadge({ source, syncStatus, updatedBy, updatedAt }: DataSourceBadgeProps) {
  const src = sourceConfig[source];
  const sync = syncConfig[syncStatus];
  const formattedDate = formatDate(updatedAt);

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${src.bgColor} ${src.textColor}`}>
      <span>{src.label}</span>
      <span className={`h-2 w-2 rounded-full ${sync.dotColor}`} title={sync.label} />
      <span>{sync.label}</span>
      {updatedBy ? <span className="text-slate-500">更新人：{updatedBy}</span> : null}
      {formattedDate ? <span className="text-slate-500">更新于 {formattedDate}</span> : null}
    </div>
  );
}
