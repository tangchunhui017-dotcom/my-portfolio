'use client';
/**
 * src/components/config/panels/ThresholdsPanel.tsx
 * 阈值规则管理面板 — 行内编辑 + 真实保存（saveThresholdOverride）+ 还原
 */
import { useState } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import { ALL_TABS, type TabKey, type ThresholdDefinition } from '@/types/merchConfig';

const TAB_LABEL: Record<string, string> = {
    overview: '总览',
    'annual-control': '年度总控',
    'region-store': '区域&门店',
    consumer: '消费者画像',
    'category-ops': '品类运营',
    'wave-planning': '波段企划',
    otb: 'OTB预算',
    cashflow: '现金流',
    forecast: '销售预测',
    pnl: '损益表',
    'competitor-trend': '竞品&趋势',
    'inventory-health': '库存健康',
};

const UNIT_LABEL: Record<string, string> = {
    percent: '百分比',
    weeks: '周',
    days: '天',
    ratio: '比值',
    currency: '金额',
    pairs: '双数',
    count: '数量',
    times: '次数',
    sqm: '平方米',
};

export default function ThresholdsPanel() {
    const { thresholds, overrideMap, saveThresholdOverride, resetThresholdOverride } = useMerchConfig();
    const [filterTab, setFilterTab] = useState<TabKey | 'all'>('all');
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<{ defaultValue: string; warningValue: string; criticalValue: string }>({
        defaultValue: '',
        warningValue: '',
        criticalValue: '',
    });

    const list = Array.from(thresholds.values()).filter((t) => {
        if (filterTab !== 'all' && !t.appliedTo.includes(filterTab as TabKey)) return false;
        if (search && !`${t.label}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    function beginEdit(t: ThresholdDefinition) {
        setEditingId(t.thresholdId);
        setDraft({
            defaultValue: String(t.defaultValue ?? ''),
            warningValue: t.warningValue !== undefined && t.warningValue !== null ? String(t.warningValue) : '',
            criticalValue: t.criticalValue !== undefined && t.criticalValue !== null ? String(t.criticalValue) : '',
        });
    }

    function commitEdit(t: ThresholdDefinition) {
        const nextDefault = Number(draft.defaultValue);
        if (!Number.isFinite(nextDefault)) {
            setEditingId(null);
            return;
        }
        const parseOpt = (v: string) => {
            if (v.trim() === '') return undefined;
            const n = Number(v);
            return Number.isFinite(n) ? n : undefined;
        };
        saveThresholdOverride({
            ...t,
            defaultValue: nextDefault,
            warningValue: parseOpt(draft.warningValue),
            criticalValue: parseOpt(draft.criticalValue),
        });
        setEditingId(null);
    }

    function cancelEdit() {
        setEditingId(null);
    }

    function comparatorLabel(c?: string) {
        const map: Record<string, string> = { gte: '≥', lte: '≤', gt: '>', lt: '<', eq: '=' };
        return c ? (map[c] ?? c) : '—';
    }

    function formatThresholdValue(value: number | undefined, unit: string) {
        if (value === undefined || value === null) return '—';
        if (unit === 'percent') return `${(value * 100).toFixed(value * 100 % 1 === 0 ? 0 : 1)}%`;
        if (unit === 'weeks') return `${value}周`;
        if (unit === 'days') return `${value}天`;
        if (unit === 'ratio') return `${value}`;
        if (unit === 'currency') return `¥${value.toLocaleString()}`;
        if (unit === 'pairs') return `${value.toLocaleString()}双`;
        if (unit === 'count') return `${value}`;
        if (unit === 'times') return `${value}次`;
        return String(value);
    }

    function appliedToLabel(tabs: TabKey[]) {
        return tabs.map((tab) => TAB_LABEL[tab] ?? tab).join(' / ');
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    placeholder="搜索阈值规则..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[160px] outline-none focus:ring-2 focus:ring-sky-200"
                />
                <select
                    value={filterTab}
                    onChange={(e) => setFilterTab(e.target.value as TabKey | 'all')}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                    <option value="all">全部业务模块</option>
                    {ALL_TABS.map((t) => (
                        <option key={t} value={t}>{TAB_LABEL[t] ?? t}</option>
                    ))}
                </select>
                <span className="text-xs text-slate-400">{list.length} 条规则</span>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
                这里维护的是跨业务模块共用的数值阈值，如售罄率、毛利率、库存周数、库龄、折扣率。修改后立即保存到当前品牌覆盖（localStorage），点「↶ 还原」可回到行业模板默认值。
            </div>

            <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">规则名称</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">比较</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">
                                <span className="text-emerald-600">正常线</span>
                            </th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">
                                <span className="text-amber-500">警示线</span>
                            </th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">
                                <span className="text-rose-500">危险线</span>
                            </th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">单位</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">应用于</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">来源</th>
                            <th className="text-right px-4 py-2.5 text-slate-500 font-medium text-xs w-32">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((t) => {
                            const isEditing = editingId === t.thresholdId;
                            const isOverridden = overrideMap.thresholds.has(t.thresholdId);
                            return (
                                <tr key={t.thresholdId} className="border-t border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-4 py-2.5 text-slate-800 font-medium">{t.label}</td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                                        {comparatorLabel(t.comparator)}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                type="number"
                                                step="any"
                                                value={draft.defaultValue}
                                                onChange={(e) => setDraft({ ...draft, defaultValue: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitEdit(t);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                className="w-24 rounded border border-sky-300 px-2 py-1 text-xs outline-none ring-1 ring-sky-100"
                                            />
                                        ) : (
                                            <span className="font-semibold text-emerald-700 text-xs">
                                                {formatThresholdValue(t.defaultValue, t.unit)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="—"
                                                value={draft.warningValue}
                                                onChange={(e) => setDraft({ ...draft, warningValue: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitEdit(t);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                className="w-24 rounded border border-amber-300 px-2 py-1 text-xs outline-none ring-1 ring-amber-100"
                                            />
                                        ) : (
                                            <span className="font-semibold text-amber-500 text-xs">
                                                {formatThresholdValue(t.warningValue, t.unit)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="—"
                                                value={draft.criticalValue}
                                                onChange={(e) => setDraft({ ...draft, criticalValue: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitEdit(t);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                className="w-24 rounded border border-rose-300 px-2 py-1 text-xs outline-none ring-1 ring-rose-100"
                                            />
                                        ) : (
                                            <span className="font-semibold text-rose-500 text-xs">
                                                {formatThresholdValue(t.criticalValue, t.unit)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-400">{UNIT_LABEL[t.unit] ?? t.unit}</td>
                                    <td className="px-4 py-2.5 text-xs">
                                        <span
                                            className="rounded-full bg-sky-50 text-sky-600 px-2 py-0.5"
                                            title={appliedToLabel(t.appliedTo)}
                                        >
                                            {t.appliedTo.length} 模块
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {isOverridden ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                                品牌自定义
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-400">行业模板</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {isEditing ? (
                                            <span className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => commitEdit(t)}
                                                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                                                    title="保存（Enter）"
                                                >
                                                    ✓ 保存
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="text-xs text-slate-400 hover:text-slate-600"
                                                    title="取消（Esc）"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => beginEdit(t)}
                                                    className="text-slate-400 hover:text-sky-600 transition-colors"
                                                    title="编辑"
                                                >
                                                    ✏️
                                                </button>
                                                {isOverridden && (
                                                    <button
                                                        onClick={() => resetThresholdOverride(t.thresholdId)}
                                                        className="text-amber-500 hover:text-rose-600 transition-colors"
                                                        title="还原到行业模板"
                                                    >
                                                        ↶
                                                    </button>
                                                )}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {list.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                                    无匹配阈值规则
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
