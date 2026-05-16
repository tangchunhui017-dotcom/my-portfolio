'use client';
/**
 * src/components/config/panels/ConfigChangeLog.tsx
 * 配置变更日志 V18 — localStorage 持久化 + 表格展示
 */
import { useState, useEffect } from 'react';

interface ChangeRecord {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    field: string;
    before: string;
    after: string;
}

const LS_KEY = 'merch_config_changelog';

const DEMO_RECORDS: ChangeRecord[] = [
    {
        id: '1',
        timestamp: '2026-05-14 14:32',
        user: 'tang',
        action: '修改阈值',
        field: '断码率上限',
        before: '0.05',
        after: '0.08',
    },
    {
        id: '2',
        timestamp: '2026-05-13 10:15',
        user: 'tang',
        action: '新增维度值',
        field: 'region → 西北',
        before: '—',
        after: '西北（新疆/甘肃/青海）',
    },
    {
        id: '3',
        timestamp: '2026-05-12 16:48',
        user: 'tang',
        action: '覆盖指标公式',
        field: '售罄率',
        before: '行业模板',
        after: '品牌自定义',
    },
];

function loadLog(): ChangeRecord[] {
    if (typeof window === 'undefined') return DEMO_RECORDS;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return DEMO_RECORDS;
        return JSON.parse(raw) as ChangeRecord[];
    } catch {
        return DEMO_RECORDS;
    }
}

function saveLog(records: ChangeRecord[]) {
    if (typeof window !== 'undefined') {
        localStorage.setItem(LS_KEY, JSON.stringify(records));
    }
}

const ACTION_COLOR: Record<string, string> = {
    '修改阈值':   'bg-amber-50 text-amber-700',
    '新增维度值': 'bg-sky-50 text-sky-700',
    '覆盖指标公式': 'bg-purple-50 text-purple-700',
    '删除配置':   'bg-rose-50 text-rose-700',
    '导入配置':   'bg-emerald-50 text-emerald-700',
};

export default function ConfigChangeLog() {
    const [records, setRecords] = useState<ChangeRecord[]>([]);
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        setRecords(loadLog());
    }, []);

    function clearLog() {
        const empty: ChangeRecord[] = [];
        setRecords(empty);
        saveLog(empty);
    }

    const actions = Array.from(new Set(records.map((r) => r.action)));
    const filtered = filterAction === 'all' ? records : records.filter((r) => r.action === filterAction);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                    >
                        <option value="all">全部操作</option>
                        {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <span className="text-xs text-slate-400">{filtered.length} 条记录</span>
                </div>
                <div className="flex gap-2">
                    <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                        📥 导出 CSV
                    </button>
                    <button
                        onClick={clearLog}
                        className="rounded-lg border border-rose-100 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50"
                    >
                        🗑️ 清空日志
                    </button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                    暂无变更记录
                </div>
            ) : (
                <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">时间</th>
                                <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">用户</th>
                                <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">操作</th>
                                <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">配置项</th>
                                <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">变更前</th>
                                <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">变更后</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{r.timestamp}</td>
                                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{r.user}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_COLOR[r.action] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {r.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{r.field}</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-400">
                                        {r.before === '—' ? (
                                            <span className="text-slate-300">—</span>
                                        ) : (
                                            <code className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">{r.before}</code>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-700">
                                        <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{r.after}</code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="text-[10px] text-slate-400">
                变更记录持久化至本地存储（localStorage），清除浏览器缓存后将重置为演示数据
            </div>
        </div>
    );
}
