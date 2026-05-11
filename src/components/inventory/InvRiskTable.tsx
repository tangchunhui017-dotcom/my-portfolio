'use client';
/**
 * 风险明细表 — 断货/积压可排序，含筛选
 */
import { useState, useMemo } from 'react';
import {
    getCategoryLabel,
    getChannelLabel,
    getRiskBadgeStyle,
    getRiskLabel,
    fmtCny,
} from '@/utils/inventoryHealth';
import type { StyleRecord, RiskType } from '@/utils/inventoryHealth';

interface Props { styles: StyleRecord[]; }

type SortKey = 'wos' | 'stockAmount' | 'financialImpact' | 'sellThrough';

const ACTION_LINK_LABELS: Record<string, string> = { otb: '→ OTB', pnl: '→ 损益', transfer: '→ 调拨', forecast: '→ 预测' };

function SortableHeader({
    label,
    sortKey,
    activeSortKey,
    sortAsc,
    onSort,
}: {
    label: string;
    sortKey: SortKey;
    activeSortKey: SortKey;
    sortAsc: boolean;
    onSort: (key: SortKey) => void;
}) {
    return (
        <th
            className="py-2 px-3 text-right font-medium text-slate-400 cursor-pointer hover:text-slate-600 whitespace-nowrap text-[11px]"
            onClick={() => onSort(sortKey)}
        >
            {label} {activeSortKey === sortKey ? (sortAsc ? '↑' : '↓') : '·'}
        </th>
    );
}

export default function InvRiskTable({ styles }: Props) {
    const [view, setView] = useState<'stockout' | 'overstock'>('stockout');
    const [sortKey, setSortKey] = useState<SortKey>(view === 'stockout' ? 'financialImpact' : 'stockAmount');
    const [sortAsc, setSortAsc] = useState(false);
    const [catFilter, setCatFilter] = useState('all');

    const categories = useMemo(() => {
        const cats = Array.from(new Set(styles.map(s => s.category)));
        return ['all', ...cats];
    }, [styles]);

    const filtered = useMemo(() => {
        const riskTypes: RiskType[] = view === 'stockout' ? ['stockout', 'tight'] : ['overstock', 'high'];
        return styles
            .filter(s => riskTypes.includes(s.riskType) && (catFilter === 'all' || s.category === catFilter))
            .sort((a, b) => {
                const va = sortKey === 'financialImpact' ? Math.abs(a.financialImpact) : a[sortKey] as number;
                const vb = sortKey === 'financialImpact' ? Math.abs(b.financialImpact) : b[sortKey] as number;
                return sortAsc ? va - vb : vb - va;
            });
    }, [styles, view, sortKey, sortAsc, catFilter]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(a => !a); else { setSortKey(key); setSortAsc(false); }
    };

    const handleViewChange = (v: 'stockout' | 'overstock') => {
        setView(v);
        setSortKey(v === 'stockout' ? 'financialImpact' : 'stockAmount');
        setSortAsc(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button onClick={() => handleViewChange('stockout')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${view === 'stockout' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        🔴 断货风险 ({styles.filter(s => ['stockout','tight'].includes(s.riskType)).length})
                    </button>
                    <button onClick={() => handleViewChange('overstock')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${view === 'overstock' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        🟣 积压风险 ({styles.filter(s => ['overstock','high'].includes(s.riskType)).length})
                    </button>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {categories.map(c => (
                        <button key={c} onClick={() => setCatFilter(c)}
                            className={`px-2 py-1 rounded text-[10px] transition-colors ${catFilter === c ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                            {c === 'all' ? '全品类' : c}
                        </button>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-[11px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left py-2 px-3 font-medium text-slate-400">款式</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-400">品类/波段</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-400">渠道/区域</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-400">生命周期</th>
                            <SortableHeader label="WOS" sortKey="wos" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                            <SortableHeader label="库存金额" sortKey="stockAmount" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                            <SortableHeader label="售罄率" sortKey="sellThrough" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                            <SortableHeader label={view === 'stockout' ? '机会损失' : '毛利影响'} sortKey="financialImpact" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                            <th className="text-left py-2 px-3 font-medium text-slate-400">推荐动作</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-400">断码</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => {
                            const riskCls = getRiskBadgeStyle(s.riskType);
                            const impact = s.financialImpact;
                            const isOpportunityLoss = ['stockout', 'tight'].includes(s.riskType);
                            const impactClass = isOpportunityLoss || impact < 0 ? 'text-rose-600' : impact > 0 ? 'text-emerald-600' : 'text-slate-400';
                            const impactText = impact === 0 ? '—' : `${impact < 0 ? '-' : ''}${fmtCny(Math.abs(impact))}`;
                            return (
                                <tr key={`${s.styleId}-${s.channel}-${s.region}`} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[120px]">
                                        <div className="truncate">{s.name}</div>
                                        <div className="text-[10px] text-slate-400">¥{s.msrp}</div>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500">
                                        {getCategoryLabel(s.category)}
                                        <br />
                                        <span className="text-[10px] text-slate-300">{s.waveKey}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500">{getChannelLabel(s.channel)}<br /><span className="text-[10px] text-slate-300">{s.region}</span></td>
                                    <td className="py-2.5 px-3">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-[10px] text-slate-500">{s.lifecycle}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskCls}`}>{getRiskLabel(s.riskType)}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">{s.wos.toFixed(1)}W</td>
                                    <td className="py-2.5 px-3 text-right text-slate-600">{fmtCny(s.stockAmount)}</td>
                                    <td className={`py-2.5 px-3 text-right ${s.sellThrough >= 0.5 ? 'text-emerald-600' : s.sellThrough >= 0.3 ? 'text-amber-600' : 'text-rose-600'}`}>{(s.sellThrough * 100).toFixed(0)}%</td>
                                    <td className={`py-2.5 px-3 text-right font-bold ${impactClass}`}>
                                        {impactText}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded">{s.action}</span>
                                            {s.actionLink && <span className="text-[10px] text-sky-400">{ACTION_LINK_LABELS[s.actionLink]}</span>}
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                        {s.coreSize.brokenSizes.length > 0
                                            ? <span className="text-[10px] text-rose-600">{s.coreSize.brokenSizes.join(', ')}</span>
                                            : <span className="text-[10px] text-emerald-600">无断码</span>}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={10} className="py-10 text-center text-slate-400 text-xs">✅ 当前筛选无风险款式</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
