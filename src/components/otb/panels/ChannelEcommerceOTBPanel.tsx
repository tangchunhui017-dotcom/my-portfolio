'use client';
/**
 * src/components/otb/panels/ChannelEcommerceOTBPanel.tsx
 * 渠道经营决策台 — 渠道对比 + 分配 + 风险行动 v2.0
 */
import { useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import {
    calcChannelOTB, formatCurrency, formatPct, formatQty,
    type CurrencyUnit, type ChannelOTBInput,
} from '@/utils/otbCalculations';
import {
    calcChannelSummary, calcChannelAllocation, calcChannelQuarterMatrix,
    generateChannelActions, getChannelRole,
    calcInventoryComplianceWarnings, groupActionsByChannel,
    type ChannelAllocationRow, type MatrixCell, type ChannelDiagnosis, type CellRiskLevel,
    type ChannelRiskGroup,
} from '@/utils/otbChannelModel';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import defaultData from '../../../../data/otb/channel_otb_plan.json';
import channelsRaw from '../../../../data/otb/channels.json';

interface Props {
    currencyUnit: CurrencyUnit;
    filters: DashboardFilters;
}

interface ChannelRecord {
    channelId: string;
    channelName: string;
    channelType: string;
    defaultSellThroughTarget: number;
    defaultReturnRate: number;
    defaultDiscountRate: number;
    defaultStockToSalesRatio: number;
    salesWeight: number;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// ─── 渠道配色 ──────────────────────────────────────────────────────────────────

const CH_COLOR_HEX: Record<string, string> = {
    'direct-store': '#0ea5e9',
    'franchise':    '#8b5cf6',
    'ecommerce':    '#10b981',
    'livestream':   '#f43f5e',
    'outlet':       '#f59e0b',
    'special':      '#94a3b8',
};

// ─── 风险颜色 ──────────────────────────────────────────────────────────────────

const RISK_CELL_STYLE: Record<CellRiskLevel, string> = {
    healthy:   'bg-emerald-50 hover:bg-emerald-100',
    attention: 'bg-amber-50 hover:bg-amber-100',
    risk:      'bg-rose-50 hover:bg-rose-100',
};
const RISK_DOT_CLASS: Record<CellRiskLevel, string> = {
    healthy:   'bg-emerald-500',
    attention: 'bg-amber-500',
    risk:      'bg-rose-500',
};
const RISK_TEXT_CLASS: Record<CellRiskLevel, string> = {
    healthy:   'text-emerald-600',
    attention: 'text-amber-600',
    risk:      'text-rose-600',
};
const RISK_LABEL: Record<CellRiskLevel, string> = {
    healthy:   '健康',
    attention: '注意',
    risk:      '风险',
};
const PRIORITY_BADGE: Record<string, string> = {
    P0: 'bg-rose-600 text-white',
    P1: 'bg-amber-500 text-white',
    P2: 'bg-slate-200 text-slate-600',
};
const PRIORITY_CARD: Record<string, string> = {
    P0: 'border-rose-200 bg-rose-50',
    P1: 'border-amber-200 bg-amber-50',
    P2: 'border-slate-200 bg-slate-50',
};

// ─── 数据初始化 ────────────────────────────────────────────────────────────────

function getChannels(): ChannelRecord[] {
    return (channelsRaw as ChannelRecord[]).filter(c => c.channelId !== 'omni-channel');
}

function normalizeInitialRows(): ChannelOTBInput[] {
    const rawRows = defaultData as ChannelOTBInput[];
    return rawRows.map(row => {
        const role = getChannelRole(row.channel);
        // 对不允许新品 OTB 的渠道（奥莱）做归一化：把 newProductRatio 转为 carryover
        if (!role.allowNewOTB && row.newProductRatio > 0) {
            const nonNewRatio = row.repeatOrderRatio + row.carryoverRatio;
            return {
                ...row,
                newProductRatio: 0,
                repeatOrderRatio: nonNewRatio > 0 ? row.repeatOrderRatio / nonNewRatio : 0,
                carryoverRatio:   nonNewRatio > 0 ? row.carryoverRatio   / nonNewRatio : 1,
            };
        }
        return row;
    });
}

function resolveChannelScope(channelType: DashboardFilters['channel_type']): string[] {
    if (channelType === 'all')  return getChannels().map(c => c.channelId);
    if (channelType === '电商') return ['ecommerce'];
    if (channelType === '直营') return ['direct-store'];
    if (channelType === '加盟') return ['franchise'];
    if (channelType === '直播') return ['livestream'];
    if (channelType === '奥莱') return ['outlet'];
    if (channelType === '特渠') return ['special'];
    if (channelType === 'KA')   return ['special'];
    return ['direct-store'];
}

function resolveChannelScopeLabel(channelType: DashboardFilters['channel_type']): string {
    if (channelType === 'all') return '全渠道';
    if (channelType === '奥莱') return '奥莱/清仓';
    if (channelType === '特渠' || channelType === 'KA') return '特渠/团购';
    return channelType;
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function ChannelEcommerceOTBPanel({ currencyUnit, filters }: Props) {
    const [rows, setRows]                   = useState<ChannelOTBInput[]>(() => normalizeInitialRows());
    const [selectedCell, setSelected]       = useState<{ channelId: string; quarter: string } | null>(null);
    const [detailOpen, setDetailOpen]       = useState(false);
    const [helpOpen, setHelpOpen]           = useState(false);
    const [showPriceDetail, setShowPrice]   = useState(false);
    const [expandedChannel, setExpandedCh] = useState<string | null>(null);
    const detailRef = useRef<HTMLDivElement>(null);

    const update = useCallback((idx: number, field: keyof ChannelOTBInput, value: number) => {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    }, []);

    const activeChannels = useMemo(() => resolveChannelScope(filters.channel_type), [filters.channel_type]);
    const scopeLabel     = resolveChannelScopeLabel(filters.channel_type);

    const filtered   = useMemo(() => rows.filter(r => activeChannels.includes(r.channel)), [rows, activeChannels]);
    const computed   = useMemo(() => filtered.map(r => calcChannelOTB(r)), [filtered]);
    const summary    = useMemo(() => calcChannelSummary(computed), [computed]);
    const matrix     = useMemo(() => calcChannelQuarterMatrix(computed), [computed]);
    const allocation = useMemo(() => calcChannelAllocation(computed, getChannels()), [computed]);
    const actions    = useMemo(() => generateChannelActions(computed), [computed]);
    const riskGroups = useMemo(() => groupActionsByChannel(actions), [actions]);
    const invWarnings = useMemo(() => calcInventoryComplianceWarnings(computed, getChannels()), [computed]);

    const fc = useCallback((v: number | null | undefined) => formatCurrency(v, currencyUnit), [currencyUnit]);

    const uniqueChannels = useMemo(() =>
        Array.from(new Set(computed.map(r => r.channel))).map(id => ({
            id,
            label: computed.find(r => r.channel === id)?.channelLabel ?? id,
        })),
        [computed]
    );

    const matrixMap = useMemo(() => {
        const m: Record<string, MatrixCell> = {};
        matrix.forEach(cell => { m[`${cell.channelId}__${cell.quarter}`] = cell; });
        return m;
    }, [matrix]);

    // 跨渠道冲突检测
    const channelConflicts = useMemo(() => {
        const conflicts: Array<{ channelId: string; issue: string; severity: 'P0' | 'P1' }> = [];
        const outletRows = computed.filter(r => r.channel === 'outlet');
        const liveRows   = computed.filter(r => r.channel === 'livestream');
        for (const r of outletRows) {
            if (r.newProductRatio > 0.05) {
                conflicts.push({ channelId: 'outlet', issue: `奥莱新品占比 ${(r.newProductRatio * 100).toFixed(0)}% > 5%（${r.quarterLabel}），与品牌形象渠道形成档期冲突`, severity: 'P1' });
            }
        }
        for (const r of liveRows) {
            if (r.newProductRatio > 0.30 && r.discountRate < 0.70) {
                conflicts.push({ channelId: 'livestream', issue: `直播新品占比 ${(r.newProductRatio * 100).toFixed(0)}% > 30% 且折扣率 ${(r.discountRate * 100).toFixed(0)}% < 70%（${r.quarterLabel}），低折新品冲击全价渠道`, severity: 'P0' });
            }
        }
        return conflicts;
    }, [computed]);

    const openDetail = () => {
        setDetailOpen(true);
        setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    // ─── 渠道对比矩阵行定义 ─────────────────────────────────────────────────

    type CompareRowDef = {
        key: string;
        label: string;
        getValue: (a: ChannelAllocationRow) => string | number;
        isGoodHigh?: boolean;   // true = 高值绿
        isGoodLow?: boolean;    // true = 低值绿
        isNeutral?: boolean;
        isInt?: boolean;
    };

    const compareRows: CompareRowDef[] = [
        { key: 'salesRatio',     label: '销售占比',       getValue: a => (a.salesRatio * 100).toFixed(1) + '%',        isGoodHigh: true },
        { key: 'otbRatio',       label: '净OTB占比',      getValue: a => (a.otbRatio * 100).toFixed(1) + '%',           isNeutral: true },
        { key: 'stTarget',       label: '售罄目标',        getValue: a => computed.find(r => r.channel === a.channelId)
            ? (computed.filter(r => r.channel === a.channelId)[0]?.sellThroughTarget * 100).toFixed(0) + '%' : '-',     isGoodHigh: true },
        { key: 'returnRate',     label: '退货率',          getValue: a => (a.avgReturnRate * 100).toFixed(1) + '%',      isGoodLow: true },
        { key: 'discountRate',   label: '建议折扣',        getValue: a => (a.avgDiscountRate * 100).toFixed(0) + '%',    isNeutral: true },
        { key: 'newProductRatio',label: '新品占比',        getValue: a => (a.newProductRatio * 100).toFixed(0) + '%',    isGoodHigh: true },
        { key: 'targetS2S',      label: '库销比目标',      getValue: a => a.targetStockToSales.toFixed(1),               isNeutral: true },
        { key: 'actualS2S',      label: '当前库销比',      getValue: a => a.actualStockToSales.toFixed(1),               isNeutral: true },
        { key: 'role',           label: '角色定位',        getValue: a => getChannelRole(a.channelId).roleLabel,         isNeutral: true },
        { key: 'healthScore',    label: '健康度评分',      getValue: a => a.healthScore,                                 isGoodHigh: true, isInt: true },
    ];

    // ─── 渲染 ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 px-1">

            {/* ── 1. 上下文栏 ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="font-semibold text-slate-700">渠道口径</span>
                    <Divider />
                    <span className="font-semibold text-slate-600 bg-slate-100 rounded px-2 py-0.5">{scopeLabel}</span>
                    <Divider />
                    <span>2026-05-09</span>
                    <Divider />
                    <span className="text-amber-600 font-medium">草稿</span>
                    <Divider />
                    <span>单位：{currencyUnit}</span>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setHelpOpen(v => !v)}
                        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <span className="font-bold text-slate-400">?</span> 计算说明
                    </button>
                    {helpOpen && (
                        <div className="absolute right-0 top-8 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-4 text-[11px] text-slate-500 space-y-1.5">
                            <div className="font-semibold text-slate-700 mb-2 text-xs">计算公式说明</div>
                            <p>• <strong className="text-slate-600">有效售罄率</strong> = 投入售罄率 − 退货率</p>
                            <p>• <strong className="text-slate-600">理论投入金额（成本）</strong> = 销售目标 ÷ 有效售罄率 ÷ 折扣率 ÷ 加价倍率</p>
                            <p>• <strong className="text-slate-600">净新增 OTB</strong> = max(0, 理论投入 − 期初库存成本)</p>
                            <p>• <strong className="text-slate-600">期末预计库存</strong> = (期初库存 + 净OTB) × (1 − 有效售罄率)</p>
                            <p>• <strong className="text-slate-600">毛利率</strong> = 1 − 1 ÷ (加价倍率 × 折扣率)</p>
                            <p>• <strong className="text-slate-600">健康度评分</strong> = 售罄(30%) + 库存(25%) + 毛利(25%) + 风险(20%)</p>
                            <p className="text-slate-400 pt-1">↓ 标注的列为系统自动计算只读字段，蓝底单元格为可编辑输入</p>
                            <button type="button" onClick={() => setHelpOpen(false)} className="mt-2 text-xs text-slate-400 hover:text-slate-600 underline">关闭</button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2. KPI 卡片 ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 xl:grid-cols-7 gap-2">
                <KpiCard label="销售目标" value={fc(summary.totalSalesTarget)} color="normal" />
                <KpiCard label="净新增OTB" value={fc(summary.totalNetOTB)} color="sky" />
                <KpiCard
                    label="平均退货率"
                    value={summary.avgReturnRate !== null ? formatPct(summary.avgReturnRate) : '—'}
                    color={summary.avgReturnRate !== null && summary.avgReturnRate > 0.10 ? 'danger' : 'normal'}
                    sub="加权平均"
                />
                <KpiCard
                    label="平均有效售罄率"
                    value={summary.avgEffectiveSellThrough !== null ? formatPct(summary.avgEffectiveSellThrough) : '—'}
                    color="emerald"
                />
                <KpiCard
                    label="采购余量/缺口"
                    value={fc(summary.budgetBalance)}
                    color={summary.budgetBalance < 0 ? 'danger' : 'emerald'}
                    sub={summary.budgetBalance < 0 ? '缺口' : '余量'}
                />
                <KpiCard
                    label="季末预计库存"
                    value={fc(summary.totalProjectedEndingInventory)}
                    color="normal"
                    sub="成本口径"
                />
                <KpiCard
                    label="高风险渠道数"
                    value={`${summary.highRiskChannelCount} 个`}
                    color={summary.highRiskChannelCount > 0 ? 'danger' : 'emerald'}
                />
            </div>

            {/* ── 3. 库销比合规检查横幅 ──────────────────────────────────── */}
            {invWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-amber-700 font-semibold text-xs">⚠ 库销比合规预警</span>
                        <span className="text-[11px] text-amber-600">{invWarnings.length} 个渠道偏差 &gt; 30%</span>
                    </div>
                    {invWarnings.slice(0, 4).map(w => (
                        <div key={`${w.channelId}-${w.quarter}`} className="flex items-center gap-2 text-[11px] text-amber-700">
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${w.isOver ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                                {w.isOver ? '积压' : '紧张'}
                            </span>
                            <span className="font-medium">{w.channelLabel} {w.quarter}</span>
                            <span>实际库销比 <strong>{w.actualRatio.toFixed(1)}</strong>，目标 <strong>{w.targetRatio.toFixed(1)}</strong>，偏差 {(w.deviation * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── 4. 渠道对比矩阵 ────────────────────────────────────────── */}
            <section>
                <SectionHeader title="渠道对比矩阵" subtitle="行指标对比 · 同行极值高亮" />
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-max text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 text-[11px]">
                                <th className="py-2 px-3 text-left font-medium w-24">指标</th>
                                {allocation.map(a => (
                                    <th key={a.channelId} className="py-2 px-3 text-center font-medium">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span
                                                className="inline-block w-2 h-2 rounded-full"
                                                style={{ backgroundColor: CH_COLOR_HEX[a.channelId] ?? '#94a3b8' }}
                                            />
                                            <span>{a.channelLabel}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {compareRows.map(rowDef => {
                                const values = allocation.map(a => rowDef.getValue(a));
                                // 数值型才做极值高亮
                                const numVals = values.map(v => typeof v === 'number' ? v : parseFloat(String(v)));
                                const isNum = numVals.every(n => !isNaN(n));
                                const maxV = isNum ? Math.max(...numVals) : -Infinity;
                                const minV = isNum ? Math.min(...numVals) : Infinity;

                                return (
                                    <tr key={rowDef.key} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="py-2 px-3 text-slate-500 font-medium whitespace-nowrap">{rowDef.label}</td>
                                        {allocation.map((a, i) => {
                                            const v = values[i];
                                            const n = numVals[i];
                                            let cellCls = '';
                                            if (isNum && !isNaN(n) && !rowDef.isNeutral) {
                                                if (rowDef.isGoodHigh) {
                                                    if (n === maxV) cellCls = 'text-emerald-700 font-bold bg-emerald-50';
                                                    else if (n === minV) cellCls = 'text-rose-700 font-bold bg-rose-50';
                                                } else if (rowDef.isGoodLow) {
                                                    if (n === minV) cellCls = 'text-emerald-700 font-bold bg-emerald-50';
                                                    else if (n === maxV) cellCls = 'text-rose-700 font-bold bg-rose-50';
                                                }
                                            }
                                            return (
                                                <td key={a.channelId} className={`py-2 px-3 text-center ${cellCls}`}>
                                                    {v}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── 5. 预算分配条 ─────────────────────────────────────────── */}
            <section>
                <SectionHeader title="预算分配条" subtitle="渠道占比 · ⚠ 偏离目标 >5pp" />
                <div className="mt-2 space-y-2.5">
                    {[
                        { label: '销售目标', getValue: (a: ChannelAllocationRow) => a.salesRatio, targetKey: 'salesWeight' as const },
                        { label: '净新增OTB', getValue: (a: ChannelAllocationRow) => a.otbRatio, targetKey: null },
                        { label: '新品金额', getValue: (a: ChannelAllocationRow) => a.newProductShare, targetKey: null },
                        { label: '毛利贡献', getValue: (a: ChannelAllocationRow) => a.grossProfitShare, targetKey: null },
                    ].map(({ label, getValue, targetKey }) => (
                        <AllocationBarRow
                            key={label}
                            label={label}
                            allocation={allocation}
                            getValue={getValue}
                            channelDefs={getChannels()}
                            targetKey={targetKey}
                        />
                    ))}
                </div>
            </section>

            {/* ── 6. 渠道 × 季度矩阵 ───────────────────────────────────── */}
            <section>
                <SectionHeader title="渠道 × 季度矩阵" subtitle="点击单元格高亮 · 5行指标" />
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-max text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px]">
                                <th className="py-2 px-4 text-left font-medium">渠道</th>
                                {QUARTERS.map(q => (
                                    <th key={q} className="py-2 px-3 text-center font-medium w-36">{q}</th>
                                ))}
                                <th className="py-2 px-4 text-right font-medium">全年合计</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueChannels.map(({ id, label }) => {
                                const yearSales = QUARTERS.reduce((s, q) => s + (matrixMap[`${id}__${q}`]?.salesTarget ?? 0), 0);
                                const yearOTB   = QUARTERS.reduce((s, q) => s + (matrixMap[`${id}__${q}`]?.netOTB ?? 0), 0);
                                const yearGP    = QUARTERS.reduce((s, q) => s + (matrixMap[`${id}__${q}`]?.grossProfitContribution ?? 0), 0);
                                return (
                                    <tr key={id} className="border-b border-slate-100">
                                        <td className="py-2 px-4 font-semibold text-slate-700 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: CH_COLOR_HEX[id] ?? '#94a3b8' }} />
                                                {label}
                                            </div>
                                        </td>
                                        {QUARTERS.map(q => {
                                            const cell = matrixMap[`${id}__${q}`];
                                            if (!cell) return <td key={q} className="px-3 py-2 text-center text-slate-300">—</td>;
                                            const isSel = selectedCell?.channelId === id && selectedCell?.quarter === q;
                                            return (
                                                <td
                                                    key={q}
                                                    onClick={() => setSelected(isSel ? null : { channelId: id, quarter: q })}
                                                    className={`px-3 py-2 text-xs cursor-pointer transition-colors ${RISK_CELL_STYLE[cell.riskLevel]} ${isSel ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                >
                                                    <div className="text-center space-y-0.5">
                                                        <div className="font-semibold text-slate-800">{fc(cell.salesTarget)}</div>
                                                        <div className="text-sky-700">{fc(cell.netOTB)} <span className="text-slate-400 text-[10px]">OTB</span></div>
                                                        {cell.sellThroughAchievement !== null ? (
                                                            <div className={`text-[10px] ${cell.sellThroughAchievement < 0.90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                达成 {(cell.sellThroughAchievement * 100).toFixed(0)}%
                                                            </div>
                                                        ) : null}
                                                        <div className="text-slate-400 text-[10px]">期末库 {fc(cell.projectedEndingInventory)}</div>
                                                        <div className={`inline-flex items-center gap-1 mt-0.5 ${RISK_TEXT_CLASS[cell.riskLevel]}`}>
                                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${RISK_DOT_CLASS[cell.riskLevel]}`} />
                                                            {RISK_LABEL[cell.riskLevel]}
                                                            {cell.diagnoses.length > 0 && <span className="opacity-60">×{cell.diagnoses.length}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-2 text-right text-xs">
                                            <div className="font-semibold text-slate-800">{fc(yearSales)}</div>
                                            <div className="text-sky-700">{fc(yearOTB)}</div>
                                            <div className="text-violet-600 text-[10px]">毛利 {fc(yearGP)}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-sky-50 text-xs border-t border-sky-100 font-semibold">
                                <td className="px-4 py-2.5 text-slate-600">季度合计</td>
                                {QUARTERS.map(q => {
                                    const qCells = matrix.filter(c => c.quarter === q);
                                    return (
                                        <td key={q} className="px-3 py-2.5 text-center">
                                            <div className="text-slate-800">{fc(qCells.reduce((s, c) => s + c.salesTarget, 0))}</div>
                                            <div className="text-sky-700">{fc(qCells.reduce((s, c) => s + c.netOTB, 0))}</div>
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-right">
                                    <div className="text-slate-800">{fc(summary.totalSalesTarget)}</div>
                                    <div className="text-sky-700">{fc(summary.totalNetOTB)}</div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>

            {/* ── 7. 跨渠道款盘冲突预警 ──────────────────────────────────── */}
            {channelConflicts.length > 0 && (
                <section>
                    <SectionHeader title="跨渠道款盘冲突预警" subtitle={`${channelConflicts.length} 项冲突`} />
                    <div className="mt-2 space-y-2">
                        {channelConflicts.map((c, i) => (
                            <div key={i} className={`rounded-lg border px-4 py-3 text-xs flex items-start gap-2 ${c.severity === 'P0' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${c.severity === 'P0' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>{c.severity}</span>
                                <span className={c.severity === 'P0' ? 'text-rose-700' : 'text-amber-700'}>{c.issue}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── 8. 风险行动队列（按渠道分组） ──────────────────────────── */}
            <section>
                <SectionHeader
                    title="风险行动队列"
                    subtitle={actions.length > 0
                        ? `${actions.filter(a => a.priority === 'P0').length} 紧急 · ${actions.filter(a => a.priority === 'P1').length} 重要 · ${actions.filter(a => a.priority === 'P2').length} 建议`
                        : '无风险行动项'
                    }
                />
                {actions.length === 0 ? (
                    <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-xs text-emerald-700">
                        ✓ 全部渠道模型测算健康，暂无风险行动项
                    </div>
                ) : (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {riskGroups.slice(0, 6).map(group => (
                            <ChannelRiskGroupCard
                                key={group.channelId}
                                group={group}
                                expanded={expandedChannel === group.channelId}
                                onToggle={() => setExpandedCh(prev => prev === group.channelId ? null : group.channelId)}
                                fc={fc}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ── 9. 明细参数测算（折叠） ─────────────────────────────────── */}
            <div ref={detailRef}>
                <CollapsibleSection
                    title="明细参数测算"
                    subtitle="蓝底可编辑 · ↓ 为自动计算字段"
                    open={detailOpen}
                    onToggle={() => setDetailOpen(v => !v)}
                >
                    {/* 价格细节切换 */}
                    <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-50">
                        <button
                            type="button"
                            onClick={() => setShowPrice(v => !v)}
                            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${showPriceDetail ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}`}
                        >
                            {showPriceDetail ? '▲ 隐藏价格细节' : '▼ 显示价格细节'}
                        </button>
                        <span className="text-[11px] text-slate-400">切换后显示加价倍率/均价/投入双数/新旧品金额</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-max text-xs w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 text-[11px]">
                                    <th className="py-2 px-3 text-left font-medium">渠道</th>
                                    <th className="py-2 px-3 text-left font-medium">季度</th>
                                    <th className="py-2 px-3 text-right font-medium">销售目标</th>
                                    <th className="py-2 px-3 text-right font-medium">投入售罄率</th>
                                    <th className="py-2 px-3 text-right font-medium">退货率</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">有效售罄 ↓</th>
                                    <th className="py-2 px-3 text-right font-medium">折扣率</th>
                                    <th className="py-2 px-3 text-right font-medium">期初库存</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">理论投入 ↓</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">净OTB ↓</th>
                                    <th className="py-2 px-3 text-right font-medium">新品%</th>
                                    <th className="py-2 px-3 text-right font-medium">翻单%</th>
                                    {showPriceDetail && <>
                                        <th className="py-2 px-3 text-right font-medium">加价倍率</th>
                                        <th className="py-2 px-3 text-right font-medium">均价(零)</th>
                                        <th className="py-2 px-3 text-right font-medium">均价(成)</th>
                                        <th className="py-2 px-3 text-right font-medium whitespace-nowrap">投入双数 ↓</th>
                                        <th className="py-2 px-3 text-right font-medium">旧品%</th>
                                        <th className="py-2 px-3 text-right font-medium whitespace-nowrap">新品金额 ↓</th>
                                        <th className="py-2 px-3 text-right font-medium whitespace-nowrap">翻单金额 ↓</th>
                                        <th className="py-2 px-3 text-right font-medium whitespace-nowrap">旧品金额 ↓</th>
                                    </>}
                                </tr>
                            </thead>
                            <tbody>
                                {computed.map((row, fi) => {
                                    const globalIdx = rows.indexOf(filtered[fi]);
                                    const isSel = selectedCell?.channelId === row.channel && selectedCell?.quarter === row.quarter;
                                    const rowDiag = actions.filter(a => a.channelId === row.channel && a.quarter === row.quarter);
                                    const hasDanger = rowDiag.some(a => a.level === 'danger');
                                    const hasWarn   = rowDiag.some(a => a.level === 'warning');
                                    const rowBg     = isSel ? 'bg-sky-50' : hasDanger ? 'bg-rose-50/40' : hasWarn ? 'bg-amber-50/30' : '';
                                    const structOk  = Math.abs(row.newProductRatio + row.repeatOrderRatio + row.carryoverRatio - 1.0) < 0.05;
                                    return (
                                        <tr key={row.id} className={`border-b border-slate-50 ${rowBg} hover:bg-slate-50/50 transition-colors`}>
                                            <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">{row.channelLabel}</td>
                                            <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row.quarterLabel}</td>
                                            {/* 销售目标 */}
                                            <td className="py-1.5 px-2">
                                                <input type="number" value={row.salesTarget} step={500000} min={0}
                                                    onChange={e => update(globalIdx, 'salesTarget', parseFloat(e.target.value) || 0)}
                                                    className="w-24 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none focus:border-sky-400" />
                                            </td>
                                            {/* 投入售罄率 */}
                                            <td className="py-1.5 px-2">
                                                <input type="number" value={parseFloat((row.sellThroughTarget * 100).toFixed(1))} step={1} min={0} max={100}
                                                    onChange={e => update(globalIdx, 'sellThroughTarget', (parseFloat(e.target.value) || 0) / 100)}
                                                    className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none focus:border-sky-400" />
                                            </td>
                                            {/* 退货率 */}
                                            <td className="py-1.5 px-2">
                                                <input type="number" value={parseFloat((row.returnRate * 100).toFixed(1))} step={0.5} min={0} max={50}
                                                    onChange={e => update(globalIdx, 'returnRate', (parseFloat(e.target.value) || 0) / 100)}
                                                    className={`w-14 text-right text-xs border rounded px-1.5 py-1 focus:outline-none ${row.ecomReturnDanger ? 'bg-rose-50 border-rose-300' : 'bg-sky-50 border-sky-200 focus:border-sky-400'}`} />
                                            </td>
                                            {/* 有效售罄 */}
                                            <td className={`py-2 px-3 text-right font-medium ${row.ecomReturnDanger ? 'text-rose-600' : 'text-slate-600'}`}>
                                                {formatPct(row.effectiveSellThrough)}
                                            </td>
                                            {/* 折扣率 */}
                                            <td className="py-1.5 px-2">
                                                <input type="number" value={parseFloat((row.discountRate * 100).toFixed(1))} step={0.5} min={0} max={100}
                                                    onChange={e => update(globalIdx, 'discountRate', (parseFloat(e.target.value) || 0) / 100)}
                                                    className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none focus:border-sky-400" />
                                            </td>
                                            {/* 期初库存 */}
                                            <td className="py-1.5 px-2">
                                                <input type="number" value={row.beginningInventoryCost} step={100000} min={0}
                                                    onChange={e => update(globalIdx, 'beginningInventoryCost', parseFloat(e.target.value) || 0)}
                                                    className="w-24 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none focus:border-sky-400" />
                                            </td>
                                            {/* 理论投入 */}
                                            <td className="py-2 px-3 text-right text-slate-600">{fc(row.theoreticalInvestmentAmount)}</td>
                                            {/* 净OTB */}
                                            <td className="py-2 px-3 text-right font-semibold text-sky-700">{fc(row.netNewOTB)}</td>
                                            {/* 新品% */}
                                            <td className="py-1.5 px-2">
                                                <input type="number" value={parseFloat((row.newProductRatio * 100).toFixed(1))} step={1} min={0} max={100}
                                                    onChange={e => update(globalIdx, 'newProductRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                    className={`w-12 text-right text-xs border rounded px-1.5 py-1 focus:outline-none ${!structOk ? 'bg-amber-50 border-amber-300' : 'bg-sky-50 border-sky-200 focus:border-sky-400'}`} />
                                            </td>
                                            {/* 翻单% */}
                                            <td className="py-1.5 px-2">
                                                <input type="number" value={parseFloat((row.repeatOrderRatio * 100).toFixed(1))} step={1} min={0} max={100}
                                                    onChange={e => update(globalIdx, 'repeatOrderRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                    className={`w-12 text-right text-xs border rounded px-1.5 py-1 focus:outline-none ${!structOk ? 'bg-amber-50 border-amber-300' : 'bg-sky-50 border-sky-200 focus:border-sky-400'}`} />
                                            </td>
                                            {/* 价格细节列 */}
                                            {showPriceDetail && <>
                                                <td className="py-2 px-3 text-right text-slate-500">{row.markupRate.toFixed(1)}</td>
                                                <td className="py-2 px-3 text-right text-slate-500">{row.averageRetailPrice}</td>
                                                <td className="py-2 px-3 text-right text-slate-500">{row.averageCostPrice}</td>
                                                <td className="py-2 px-3 text-right text-emerald-700">{formatQty(row.investmentPairs)}</td>
                                                <td className="py-1.5 px-2">
                                                    <input type="number" value={parseFloat((row.carryoverRatio * 100).toFixed(1))} step={1} min={0} max={100}
                                                        onChange={e => update(globalIdx, 'carryoverRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                        className={`w-12 text-right text-xs border rounded px-1.5 py-1 focus:outline-none ${!structOk ? 'bg-amber-50 border-amber-300' : 'bg-sky-50 border-sky-200 focus:border-sky-400'}`} />
                                                </td>
                                                <td className="py-2 px-3 text-right text-slate-500">{fc(row.newProductAmount)}</td>
                                                <td className="py-2 px-3 text-right text-slate-500">{fc(row.repeatOrderAmount)}</td>
                                                <td className="py-2 px-3 text-right text-slate-400">{fc(row.carryoverAmount)}</td>
                                            </>}
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-sky-50 font-semibold text-xs border-t border-sky-100">
                                    <td className="py-2.5 px-3 text-slate-700" colSpan={2}>全年合计</td>
                                    <td className="py-2.5 px-3 text-right">{fc(summary.totalSalesTarget)}</td>
                                    <td colSpan={6} />
                                    <td className="py-2.5 px-3 text-right text-sky-700">{fc(summary.totalNetOTB)}</td>
                                    <td colSpan={showPriceDetail ? 9 : 1} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CollapsibleSection>
            </div>

        </div>
    );
}

// ─── 子组件 ───────────────────────────────────────────────────────────────────

function Divider() {
    return <span className="text-slate-300 select-none" aria-hidden="true">|</span>;
}

function KpiCard({ label, value, sub, color }: {
    label: string;
    value: string;
    sub?: string;
    color: 'normal' | 'sky' | 'emerald' | 'danger';
}) {
    const colorMap: Record<typeof color, string> = {
        normal:  'text-slate-800',
        sky:     'text-sky-700',
        emerald: 'text-emerald-600',
        danger:  'text-rose-600',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-400 leading-snug">{label}</p>
            <p className={`text-base font-bold mt-0.5 ${colorMap[color]}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
    );
}

function AllocationBarRow({ label, allocation, getValue, channelDefs, targetKey }: {
    label: string;
    allocation: ChannelAllocationRow[];
    getValue: (a: ChannelAllocationRow) => number;
    channelDefs: ChannelRecord[];
    targetKey: 'salesWeight' | null;
}) {
    const defMap = new Map(channelDefs.map(c => [c.channelId, c.salesWeight]));
    return (
        <div className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-right text-slate-400">{label}</span>
            <div className="flex-1 flex h-6 rounded overflow-hidden bg-slate-100">
                {allocation.map(a => {
                    const pct = getValue(a) * 100;
                    if (pct < 0.5) return null;
                    const targetW = targetKey ? (defMap.get(a.channelId) ?? 0) * 100 : null;
                    const hasWarning = targetW !== null && Math.abs(pct - targetW) > 5;
                    return (
                        <div
                            key={a.channelId}
                            style={{ width: `${pct}%`, backgroundColor: CH_COLOR_HEX[a.channelId] ?? '#94a3b8' }}
                            title={`${a.channelLabel}: ${pct.toFixed(1)}%${targetW !== null ? ` (目标 ${targetW.toFixed(1)}%)` : ''}`}
                            className="relative flex items-center justify-center"
                        >
                            {pct > 8 && (
                                <span className="text-[10px] text-white font-semibold">
                                    {pct.toFixed(0)}%{hasWarning ? ' ⚠' : ''}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ChannelRiskGroupCard({ group, expanded, onToggle, fc }: {
    group: ChannelRiskGroup;
    expanded: boolean;
    onToggle: () => void;
    fc: (v: number) => string;
}) {
    const topBadge = group.topPriority === 'P0' ? 'bg-rose-600 text-white' : group.topPriority === 'P1' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600';
    const cardBg   = group.topPriority === 'P0' ? 'border-rose-200 bg-rose-50' : group.topPriority === 'P1' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50';
    return (
        <div className={`rounded-lg border text-xs ${cardBg}`}>
            <button type="button" onClick={onToggle} className="w-full px-3 py-3 text-left flex items-start gap-2">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none mt-0.5 ${topBadge}`}>{group.topPriority}</span>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800">{group.channelLabel}</div>
                    <div className="text-slate-500 mt-0.5 text-[11px]">
                        {group.p0Count > 0 && <span className="text-rose-600 font-medium">P0×{group.p0Count} </span>}
                        {group.p1Count > 0 && <span className="text-amber-600 font-medium">P1×{group.p1Count} </span>}
                        {group.p2Count > 0 && <span className="text-slate-400">P2×{group.p2Count} </span>}
                        · 影响 {fc(group.totalImpact)}
                    </div>
                </div>
                <svg className={`w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {expanded && (
                <div className="border-t border-black/5 px-3 pb-3 space-y-2 pt-2">
                    {group.items.map(action => (
                        <div key={action.id} className="flex gap-2">
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none mt-0.5 ${PRIORITY_BADGE[action.priority]}`}>{action.priority}</span>
                            <div>
                                <div className="font-medium text-slate-700 text-[11px]">{action.title} · {action.quarter}</div>
                                <div className="text-slate-500 text-[11px]">{action.message}</div>
                                <div className="text-slate-600 text-[11px] mt-0.5"><span className="font-medium">建议：</span>{action.action}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CollapsibleSection({ title, subtitle, open, onToggle, children }: {
    title: string;
    subtitle?: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-slate-700">{title}</span>
                    {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
                </div>
                <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="border-t border-slate-100">{children}</div>}
        </div>
    );
}
