'use client';
/**
 * src/components/otb/panels/CategoryDepthPlanningPanel.tsx
 * 品类/款深 — 测算工作台（重构版）
 *
 * 层级：顶部KPI → 结构诊断 → [汇总视图 | 明细测算 | 异常清单]
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
    calcCategoryDepth, calcWaveOTB,
    formatCurrency, formatPct, formatQty,
    type CurrencyUnit, type CategoryDepthInput, type CategoryDepthRow, type WaveOTBInput,
} from '@/utils/otbCalculations';
import {
    calcInitialAllocationDemand, calcCapacityCheck,
    diagnoseCategoryDepthRow, generateCategoryDepthInsights, resolveSeasonLabel, resolveWaveLifecycle,
    calcSeverityTier,
    type CategoryDepthInsight, type DepthDiagnosis, type WaveLifecycle,
} from '@/utils/otbCategoryDepth';
import { calcSizeDepthDistribution, diagnoseSizeDistribution, type SizeGroup } from '@/utils/otbSizeDepth';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import type { OTBPriceStructureOutput } from './OTBPriceStructurePanel';

import sizeGroupsData    from '../../../../data/otb/footwear_size_groups.json';
import defaultItems      from '../../../../data/otb/category_depth_plan.json';
import storeCapacityRaw  from '../../../../data/otb/store_capacity.json';
import brandsRaw         from '../../../../data/otb/brands.json';
import otbAssumptionsRaw from '../../../../data/otb/otb_assumptions.json';

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface Props {
    currencyUnit: CurrencyUnit;
    ssSeasonSalesTarget: number;
    awSeasonSalesTarget: number;
    waves: WaveOTBInput[];
    filters?: DashboardFilters;
    priceStructure?: OTBPriceStructureOutput | null;
    isLocked?: boolean;
    /** 跳转到其他子视图或主模块 */
    onJumpToTab?: (tab: string) => void;
}

type DetailFilter   = 'all' | 'issues' | 'override' | 'main' | 'hero' | 'test' | 'margin' | 'capacity';
type LifecycleFilter = 'active' | 'current' | 'planning' | 'closed' | 'all';

interface StoreCapacityRecord {
    channelId: string;
    channelName: string;
    storeCount: number;
    avgSkuCapacityPerStore: number;
    avgDisplayPairsPerSku: number;
    safetyStockPairsPerSku: number;
    totalSkuCapacity: number;
    totalInitialAllocationCapacity: number;
}

interface BrandRecord {
    brandId: string;
    brandName: string;
    priceBands: Array<{ band: string; label: string; min: number; max: number }>;
}

// ─── 辅助 ─────────────────────────────────────────────────────────────────────

function resolveChannelCapacityKey(channelType?: DashboardFilters['channel_type']) {
    if (channelType === '电商') return 'ecommerce';
    if (channelType === '加盟') return 'franchise';
    if (channelType === '直播') return 'livestream';
    if (channelType === '奥莱') return 'outlet';
    if (channelType === '特渠' || channelType === 'KA')  return 'special';
    return 'direct-store';
}

function resolveBrand(filters?: DashboardFilters) {
    const brands = brandsRaw as BrandRecord[];
    if (!filters || filters.brand === 'all') return brands[0];
    return brands.find(b => b.brandName === filters.brand || b.brandId === filters.brand) ?? brands[0];
}

const DETAIL_FILTER_OPTIONS: { key: DetailFilter; label: string }[] = [
    { key: 'all',      label: '全部' },
    { key: 'issues',   label: '只看异常' },
    { key: 'override', label: '手动覆盖' },
    { key: 'main',     label: '主推款' },
    { key: 'hero',     label: '爆款候选' },
    { key: 'test',     label: '测试款' },
    { key: 'margin',   label: '毛利异常' },
    { key: 'capacity', label: '容量异常' },
];

type PasteField = keyof CategoryDepthInput;

const EDITABLE_PASTE_FIELDS = new Set<PasteField>([
    'plannedStyleCount',
    'plannedColorCount',
    'averageDepthOverride',
    'costPrice',
    'sellThroughTarget',
    'retailPrice',
    'priceBandId',
    'priceBandLabel',
    'sizeGroupId',
]);

const POSITIONAL_PASTE_FIELDS: PasteField[] = [
    'plannedStyleCount',
    'plannedColorCount',
    'averageDepthOverride',
    'costPrice',
    'sellThroughTarget',
];

const PASTE_FIELD_ALIASES: Record<string, PasteField> = {
    id: 'id',
    season: 'season',
    '季节': 'season',
    wave: 'wave',
    '波段': 'wave',
    category: 'category',
    '品类': 'category',
    categorylabel: 'categoryLabel',
    '品类名称': 'categoryLabel',
    pricebandid: 'priceBandId',
    '价格带id': 'priceBandId',
    pricebandlabel: 'priceBandLabel',
    '价格带': 'priceBandLabel',
    productroleid: 'productRoleId',
    '货品角色id': 'productRoleId',
    productrolename: 'productRoleName',
    '货品角色': 'productRoleName',
    plannedstylecount: 'plannedStyleCount',
    '计划款数': 'plannedStyleCount',
    plannedcolorcount: 'plannedColorCount',
    '计划色数': 'plannedColorCount',
    averagedepth: 'averageDepthOverride',
    averagedepthoverride: 'averageDepthOverride',
    '均深': 'averageDepthOverride',
    '平均均深': 'averageDepthOverride',
    costprice: 'costPrice',
    '成本均价': 'costPrice',
    retailprice: 'retailPrice',
    '零售均价': 'retailPrice',
    sellthroughtarget: 'sellThroughTarget',
    '售罄目标': 'sellThroughTarget',
    sizegroupid: 'sizeGroupId',
    '尺码组': 'sizeGroupId',
};

function normalizePasteHeader(value: string) {
    return value.trim().toLowerCase().replace(/[\s_/-]/g, '');
}

function splitPastedRows(text: string) {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.includes('\t') ? line.split('\t') : line.split(','))
        .map(cells => cells.map(cell => cell.trim()));
}

function parseNumberCell(value: string) {
    const cleaned = value.replace(/[,%￥¥,\s]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function parsePastedValue(field: PasteField, value: string): number | string | null {
    if (field === 'sellThroughTarget') {
        const parsed = parseNumberCell(value);
        if (parsed === null) return null;
        return value.includes('%') || parsed > 1 ? parsed / 100 : parsed;
    }
    if (
        field === 'plannedStyleCount' ||
        field === 'plannedColorCount' ||
        field === 'averageDepthOverride' ||
        field === 'costPrice' ||
        field === 'retailPrice'
    ) {
        const parsed = parseNumberCell(value);
        if (parsed === null) return null;
        return field === 'plannedStyleCount' || field === 'plannedColorCount'
            ? Math.max(1, Math.round(parsed))
            : Math.max(0, parsed);
    }
    return value;
}

function findPasteTargetIndex(items: CategoryDepthInput[], row: Partial<Record<PasteField, string | number>>) {
    const id = row.id != null ? String(row.id) : '';
    if (id) {
        const byId = items.findIndex(item => item.id === id);
        if (byId >= 0) return byId;
    }

    return items.findIndex(item => {
        const seasonOk = row.season == null || item.season === String(row.season);
        const waveOk = row.wave == null || item.wave === String(row.wave);
        const categoryOk = row.category == null && row.categoryLabel == null
            ? true
            : item.category === String(row.category ?? '') || item.categoryLabel === String(row.categoryLabel ?? '');
        const priceBandOk = row.priceBandId == null && row.priceBandLabel == null
            ? true
            : item.priceBandId === String(row.priceBandId ?? '') || item.priceBandLabel === String(row.priceBandLabel ?? '');
        const roleOk = row.productRoleId == null && row.productRoleName == null
            ? true
            : item.productRoleId === String(row.productRoleId ?? '') || item.productRoleName === String(row.productRoleName ?? '');
        return seasonOk && waveOk && categoryOk && priceBandOk && roleOk;
    });
}

function calcRowSizeStats(
    productionPairs: number | null,
    sizeGroupId: string | undefined,
    sizeGroups: SizeGroup[],
    overrides?: Record<string, number>,
) {
    const group = sizeGroups.find(g => g.sizeGroupId === (sizeGroupId ?? 'men'));
    const requiredSizeCount = group?.sizes.length ?? 0;
    const sizeRows = productionPairs !== null && productionPairs > 0
        ? calcSizeDepthDistribution(Math.round(productionPairs), sizeGroupId ?? 'men', sizeGroups, overrides)
        : [];
    const plannedSizeCount = sizeRows.filter(row => row.plannedPairs > 0).length;
    const sizeCoverageRate = requiredSizeCount > 0 ? plannedSizeCount / requiredSizeCount : null;
    const sizeWarnings = diagnoseSizeDistribution(sizeRows);

    return {
        sizeRows,
        sizeWarnings,
        requiredSizeCount,
        plannedSizeCount,
        sizeCoverageRate,
        sizeGroupLabel: group?.sizeGroupLabel ?? sizeGroupId ?? '未配置',
    };
}

type MatrixDimension = 'category-role' | 'category-price' | 'wave-category' | 'wave-role' | 'price-role';
type DrawerContext = { category?: string; roleId?: string; waveKey?: string } | null;

// ─── 波段时间线 ───────────────────────────────────────────────────────────────

const WAVE_ROLE_LABEL: Record<string, string> = {
    traffic:     '引流',
    main_sales:  '主销',
    clearance:   '清货',
    testing:     '试销',
    hero:        '爆款',
    image:       '形象',
    volume:      '走量',
};

interface WaveChipData {
    key: string;
    label: string;
    launchTime: number;
    lifecycle: WaveLifecycle;
    production: number;
    budget: number | null;
    issues: number;
    launchDate?: string;
    seasonLabel?: string;
    waveRole?: string;
    daysToLaunch?: number;
    capacityIssues: number;
    sizeIssues: number;
    budgetIssues: number;
}

const BUSINESS_DATE = new Date('2026-05-09');

function WaveTimeline({
    chips, selectedKey, onSelect, currencyUnit,
}: {
    chips: WaveChipData[];
    selectedKey: string | null;
    onSelect: (key: string | null) => void;
    currencyUnit: CurrencyUnit;
}) {
    const closed   = chips.filter(c => c.lifecycle === 'closed');
    const current  = chips.filter(c => c.lifecycle === 'current');
    const planning = chips.filter(c => c.lifecycle === 'planning');

    const renderChip = (chip: WaveChipData) => {
        const isSelected = selectedKey === chip.key;
        const baseClass = 'flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-left min-w-[140px]';
        const colorClass = chip.lifecycle === 'closed'
            ? isSelected ? 'border-slate-400 bg-slate-200' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            : chip.lifecycle === 'current'
            ? isSelected ? 'border-sky-500 bg-sky-100' : 'border-sky-200 bg-sky-50 hover:bg-sky-100'
            : isSelected ? 'border-emerald-500 bg-emerald-100' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100';
        const roleLabel = chip.waveRole ? (WAVE_ROLE_LABEL[chip.waveRole] ?? chip.waveRole) : null;
        const seasonBadge = chip.seasonLabel ?? (chip.key.startsWith('SS') ? '春夏' : '秋冬');
        const daysText = chip.daysToLaunch !== undefined
            ? chip.daysToLaunch > 0 ? `上市还有 ${chip.daysToLaunch} 天` : `已上市 ${Math.abs(chip.daysToLaunch)} 天`
            : null;
        return (
            <button key={chip.key} className={`${baseClass} ${colorClass}`}
                onClick={() => onSelect(isSelected ? null : chip.key)}>
                {/* 第1行：状态dot + 波段标题 + 季节 + 角色 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                        chip.lifecycle === 'closed' ? 'bg-slate-400' : chip.lifecycle === 'current' ? 'bg-sky-500' : 'bg-emerald-500'
                    }`} />
                    <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">{chip.label}</span>
                    <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500 whitespace-nowrap">{seasonBadge}</span>
                    {roleLabel && <span className="text-[9px] px-1 rounded bg-sky-100 text-sky-600 whitespace-nowrap">{roleLabel}</span>}
                </div>
                {/* 第2行：距上市天数 */}
                {daysText && (
                    <div className={`text-[10px] ${chip.daysToLaunch !== undefined && chip.daysToLaunch <= 30 && chip.daysToLaunch > 0 ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                        {daysText}
                    </div>
                )}
                {/* 第3行：预算 + 投产 */}
                <div className="text-[10px] text-slate-500 space-y-0.5">
                    {chip.budget !== null && <div>预算 {formatCurrency(chip.budget, currencyUnit)}</div>}
                    <div className="text-sky-600">投产 {formatCurrency(chip.production, currencyUnit)}</div>
                </div>
                {/* 第4行：异常分类 */}
                {chip.issues > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {chip.capacityIssues > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">容量×{chip.capacityIssues}</span>
                        )}
                        {chip.sizeIssues > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">尺码×{chip.sizeIssues}</span>
                        )}
                        {chip.budgetIssues > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">预算×{chip.budgetIssues}</span>
                        )}
                        {chip.issues - chip.capacityIssues - chip.sizeIssues - chip.budgetIssues > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-600">其他×{chip.issues - chip.capacityIssues - chip.sizeIssues - chip.budgetIssues}</span>
                        )}
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-4">
                {closed.length > 0 && (
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-slate-400 font-medium mb-1.5">已上市复盘</div>
                        <div className="flex flex-wrap gap-1.5">{closed.map(renderChip)}</div>
                    </div>
                )}
                {current.length > 0 && (
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-sky-600 font-medium mb-1.5">当前滚动</div>
                        <div className="flex flex-wrap gap-1.5">{current.map(renderChip)}</div>
                    </div>
                )}
                {planning.length > 0 && (
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-emerald-600 font-medium mb-1.5">未来计划</div>
                        <div className="flex flex-wrap gap-1.5">{planning.map(renderChip)}</div>
                    </div>
                )}
                {chips.length === 0 && (
                    <div className="text-xs text-slate-400 py-2">暂无波段数据</div>
                )}
            </div>
            {selectedKey && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                    <span className="text-[11px] text-sky-700">
                        已聚焦波段：<strong>{chips.find(c => c.key === selectedKey)?.label ?? selectedKey}</strong>
                    </span>
                    <button onClick={() => onSelect(null)}
                        className="text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">
                        清除筛选
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── 决策驾驶舱 ───────────────────────────────────────────────────────────────

function DecisionCockpit({
    kpi, insights, currencyUnit,
}: {
    kpi: {
        totalStyles: number; totalColors: number; totalSku: number;
        avgDepth: number; avgGrossMargin: number | null; mainProductRatio: number | null;
        totalAmt: number; capacityRiskCount: number; sizeRiskCount: number; issueCount: number;
    };
    insights: CategoryDepthInsight[];
    currencyUnit: CurrencyUnit;
}) {
    const topRisks = insights.filter(i => i.level !== 'healthy').slice(0, 3);
    return (
        <div className="grid grid-cols-12 gap-3">
            {/* 左 7/12：9 KPI */}
            <div className="col-span-12 xl:col-span-7 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-500 mb-2">口径 KPI</div>
                <div className="grid grid-cols-3 gap-2">
                    {/* 第1行：款数 / 色数 / SKU */}
                    <div>
                        <div className="text-[10px] text-slate-400">计划款数</div>
                        <div className="text-sm font-bold text-slate-700">{kpi.totalStyles.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">计划色数</div>
                        <div className="text-sm font-bold text-slate-700">{kpi.totalColors.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">计划 SKU</div>
                        <div className="text-sm font-bold text-slate-700">{kpi.totalSku.toLocaleString()}</div>
                    </div>
                    {/* 第2行：均深 / 平均毛利 / 主推占比 */}
                    <div>
                        <div className="text-[10px] text-slate-400">平均均深</div>
                        <div className="text-sm font-bold text-slate-700">{kpi.totalSku > 0 ? Math.round(kpi.avgDepth) : '--'} 双</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">平均毛利率</div>
                        <div className={`text-sm font-bold ${
                            kpi.avgGrossMargin === null ? 'text-slate-400' :
                            kpi.avgGrossMargin >= 0.50 ? 'text-emerald-600' :
                            kpi.avgGrossMargin >= 0.40 ? 'text-amber-600' : 'text-rose-600'
                        }`}>{kpi.avgGrossMargin !== null ? `${(kpi.avgGrossMargin * 100).toFixed(1)}%` : '--'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">主推占比</div>
                        <div className="text-sm font-bold text-sky-700">{kpi.mainProductRatio !== null ? `${(kpi.mainProductRatio * 100).toFixed(0)}%` : '--'}</div>
                    </div>
                    {/* 第3行：投产金额 / 容量风险 / 尺码风险 */}
                    <div>
                        <div className="text-[10px] text-slate-400">投产金额</div>
                        <div className="text-sm font-bold text-sky-700">{formatCurrency(kpi.totalAmt, currencyUnit)}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">容量风险款</div>
                        <div className={`text-sm font-bold ${kpi.capacityRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {kpi.capacityRiskCount > 0 ? `${kpi.capacityRiskCount} 款` : '无'}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">尺码覆盖不足</div>
                        <div className={`text-sm font-bold ${kpi.sizeRiskCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {kpi.sizeRiskCount > 0 ? `${kpi.sizeRiskCount} 款` : '无'}
                        </div>
                    </div>
                </div>
            </div>
            {/* 右 5/12：Top 风险 */}
            <div className="col-span-12 xl:col-span-5 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-500 mb-2">Top 风险</div>
                {topRisks.length === 0
                    ? <div className="text-xs text-emerald-600 py-1">✅ 当前口径结构健康，无风险提示</div>
                    : (
                        <div className="space-y-1.5">
                            {topRisks.map((risk, i) => (
                                <div key={i} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs border ${
                                    risk.level === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}>
                                    <span>{risk.level === 'danger' ? '🚨' : '⚠️'}</span>
                                    <div className="min-w-0">
                                        <span className="font-semibold">{risk.title}：</span>
                                        <span>{risk.message}</span>
                                        {risk.action && <span className="ml-1 opacity-70">→ {risk.action}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div>
        </div>
    );
}

// ─── 结构矩阵 ─────────────────────────────────────────────────────────────────

const MATRIX_DIM_OPTIONS: { key: MatrixDimension; label: string }[] = [
    { key: 'category-role',  label: '品类 × 货品角色' },
    { key: 'category-price', label: '品类 × 价格带' },
    { key: 'wave-category',  label: '波段 × 品类' },
    { key: 'wave-role',      label: '波段 × 货品角色' },
    { key: 'price-role',     label: '价格带 × 货品角色' },
];

function StructureMatrix({
    rows, dimension, onDimensionChange, currencyUnit, onCellClick, wavePlanMap,
}: {
    rows: CategoryDepthWorkbenchRow[];
    dimension: MatrixDimension;
    onDimensionChange: (d: MatrixDimension) => void;
    currencyUnit: CurrencyUnit;
    onCellClick: (ctx: DrawerContext) => void;
    wavePlanMap: Record<string, number>; // waveKey → averageDepth target
}) {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cellMap = new Map<string, CategoryDepthWorkbenchRow[]>();

    for (const r of rows) {
        const [rowKey, colKey] = resolveMatrixKeys(dimension, r);
        if (!rowKey || !colKey) continue;
        rowSet.add(rowKey);
        colSet.add(colKey);
        const cellKey = `${rowKey}|${colKey}`;
        if (!cellMap.has(cellKey)) cellMap.set(cellKey, []);
        cellMap.get(cellKey)!.push(r);
    }

    const rowKeys = [...rowSet];
    const colKeys = [...colSet];
    const totalAmt = rows.reduce((s, r) => s + (r.productionAmount ?? 0), 0);

    function resolveMatrixKeys(dim: MatrixDimension, row: CategoryDepthWorkbenchRow): [string, string] {
        switch (dim) {
            case 'category-role':  return [row.categoryLabel ?? row.category, row.productRoleName ?? row.productRoleId ?? '未分类'];
            case 'category-price': return [row.categoryLabel ?? row.category, row.priceBandLabel ?? row.priceBandId ?? '未分类'];
            case 'wave-category':  return [`${row.season}-${row.wave}`, row.categoryLabel ?? row.category];
            case 'wave-role':      return [`${row.season}-${row.wave}`, row.productRoleName ?? row.productRoleId ?? '未分类'];
            case 'price-role':     return [row.priceBandLabel ?? row.priceBandId ?? '未分类', row.productRoleName ?? row.productRoleId ?? '未分类'];
        }
    }

    function resolveDrawerCtx(dim: MatrixDimension, rowKey: string, colKey: string): DrawerContext {
        switch (dim) {
            case 'category-role':  return { category: rowKey, roleId: colKey };
            case 'category-price': return { category: rowKey };
            case 'wave-category':  return { waveKey: rowKey, category: colKey };
            case 'wave-role':      return { waveKey: rowKey, roleId: colKey };
            case 'price-role':     return { roleId: colKey };
        }
    }

    return (
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-600">结构矩阵</span>
                <div className="flex gap-1 flex-wrap">
                    {MATRIX_DIM_OPTIONS.map(opt => (
                        <button key={opt.key} onClick={() => onDimensionChange(opt.key)}
                            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                dimension === opt.key ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                <span className="text-[10px] text-slate-400 ml-auto">点击单元格 → 打开明细</span>
            </div>
            {rowKeys.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400">当前口径无数据</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="text-xs w-max min-w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap min-w-[120px]">
                                    {dimension === 'price-role' ? '价格带' : dimension.startsWith('wave') ? '波段' : '品类'}
                                </th>
                                {colKeys.map(ck => (
                                    <th key={ck} className="text-center py-2 px-2 text-slate-500 font-medium whitespace-nowrap min-w-[100px]">{ck}</th>
                                ))}
                                <th className="text-right py-2 px-3 text-slate-500 font-medium whitespace-nowrap">合计</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowKeys.map(rk => {
                                const rowTotal = rows.filter(r => {
                                    const [k] = resolveMatrixKeys(dimension, r);
                                    return k === rk;
                                });
                                const rowAmt = rowTotal.reduce((s, r) => s + (r.productionAmount ?? 0), 0);
                                const rowIssues = rowTotal.reduce((s, r) => s + r.detailedDiagnoses.length, 0);
                                return (
                                    <tr key={rk} className="border-b border-slate-50 hover:bg-slate-50/60">
                                        <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{rk}</td>
                                        {colKeys.map(ck => {
                                            const cell = cellMap.get(`${rk}|${ck}`) ?? [];
                                            if (cell.length === 0) return (
                                                <td key={ck} className="py-2 px-2 text-center text-slate-300 text-[10px]">—</td>
                                            );
                                            const styles = cell.reduce((s, r) => s + r.plannedStyleCount, 0);
                                            const colors = cell.reduce((s, r) => s + r.plannedColorCount, 0);
                                            const sku    = cell.reduce((s, r) => s + r.plannedSkuCount, 0);
                                            const pairs  = cell.reduce((s, r) => s + (r.plannedProductionPairs ?? 0), 0);
                                            const depth  = sku > 0 ? pairs / sku : 0;
                                            const amt    = cell.reduce((s, r) => s + (r.productionAmount ?? 0), 0);
                                            const amtRatio = totalAmt > 0 ? (amt / totalAmt * 100).toFixed(0) : '0';
                                            const issues = cell.reduce((s, r) => s + r.detailedDiagnoses.length, 0);
                                            const hasDanger = cell.some(r => r.detailedDiagnoses.some(d => d.level === 'danger'));
                                            // 均深目标对比（波段维度才有 wavePlanMap）
                                            const waveKey = cell[0] ? `${cell[0].season}-${cell[0].wave}` : '';
                                            const depthTarget = wavePlanMap[waveKey];
                                            const depthRatio = depthTarget && depthTarget > 0 ? depth / depthTarget : null;
                                            const depthBadge = depthRatio !== null
                                                ? depthRatio >= 0.7 && depthRatio <= 1.4
                                                    ? <span className="text-emerald-600">{Math.round(depth)}</span>
                                                    : depthRatio < 0.5 || depthRatio > 1.8
                                                    ? <span className="text-rose-600">{Math.round(depth)}</span>
                                                    : <span className="text-amber-600">{Math.round(depth)}</span>
                                                : <span>{Math.round(depth)}</span>;
                                            const depthVsTarget = depthTarget ? ` / 目标${depthTarget}` : '';
                                            const hasDiagTypes = { cap: false, size: false, budget: false };
                                            for (const r of cell) {
                                                for (const d of r.detailedDiagnoses) {
                                                    if (d.title.includes('容量') || d.title.includes('首铺') || d.title === 'SKU超容量') hasDiagTypes.cap = true;
                                                    if (d.title.includes('尺码')) hasDiagTypes.size = true;
                                                    if (d.title.includes('预算')) hasDiagTypes.budget = true;
                                                }
                                            }
                                            const cellColor = hasDanger ? 'bg-rose-50 hover:bg-rose-100 border border-rose-100'
                                                : issues > 0 ? 'bg-amber-50 hover:bg-amber-100 border border-amber-100'
                                                : 'bg-emerald-50/40 hover:bg-emerald-50 border border-transparent';
                                            return (
                                                <td key={ck} className="py-1 px-1">
                                                    <button
                                                        title={`${styles}款·${colors}色·${sku}SKU | 均深${Math.round(depth)}${depthVsTarget} | ${amtRatio}%`}
                                                        className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors ${cellColor}`}
                                                        onClick={() => onCellClick(resolveDrawerCtx(dimension, rk, ck))}>
                                                        {/* 行1：款·色·SKU */}
                                                        <div className="text-[10px] text-slate-700 font-medium">{styles}款·{colors}色·{sku}SKU</div>
                                                        {/* 行2：均深 vs 目标 */}
                                                        <div className="text-[10px] text-slate-500">
                                                            均深 {depthBadge}{depthTarget ? <span className="text-slate-400"> /{depthTarget}</span> : null}
                                                        </div>
                                                        {/* 行3：金额 + 占比 */}
                                                        <div className="text-[10px] font-semibold text-sky-700">{formatCurrency(amt, currencyUnit)} <span className="text-slate-400 font-normal">({amtRatio}%)</span></div>
                                                        {/* 行4：异常分类 badge */}
                                                        {issues > 0 && (
                                                            <div className="flex gap-0.5 mt-0.5 flex-wrap">
                                                                {hasDiagTypes.cap && <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 text-rose-700">容量</span>}
                                                                {hasDiagTypes.size && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700">尺码</span>}
                                                                {hasDiagTypes.budget && <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 text-violet-700">预算</span>}
                                                                {!hasDiagTypes.cap && !hasDiagTypes.size && !hasDiagTypes.budget && (
                                                                    <span className={`text-[9px] px-1 py-0.5 rounded ${hasDanger ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{issues}异常</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                        <td className="py-2 px-3 text-right">
                                            <div className="text-[10px] font-semibold text-sky-700">{formatCurrency(rowAmt, currencyUnit)}</div>
                                            {rowIssues > 0 && <div className="text-[9px] text-rose-600">{rowIssues} 异常</div>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-sky-50 border-t-2 border-slate-200">
                                <td className="py-2 px-3 font-semibold text-slate-700 text-xs">合计</td>
                                {colKeys.map(ck => {
                                    const colRows = rows.filter(r => resolveMatrixKeys(dimension, r)[1] === ck);
                                    const amt = colRows.reduce((s, r) => s + (r.productionAmount ?? 0), 0);
                                    return (
                                        <td key={ck} className="py-2 px-2 text-center text-[10px] font-semibold text-sky-700">
                                            {formatCurrency(amt, currencyUnit)}
                                        </td>
                                    );
                                })}
                                <td className="py-2 px-3 text-right font-semibold text-sky-700 text-xs">
                                    {formatCurrency(totalAmt, currencyUnit)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── 已上市波段复盘 ───────────────────────────────────────────────────────────

interface ClosedWaveReview {
    key: string;
    label: string;
    seasonLabel: string | null;
    launchDate: string | null;
    daysLaunched: number | null;
    planStyles: number | null;
    actualStyles: number;
    actualSku: number;
    planDepth: number | null;
    actualDepth: number;
    planBudget: number | null;
    actualAmt: number;
}

function ClosedWaveReviewCards({
    reviews, currencyUnit,
}: {
    reviews: ClosedWaveReview[];
    currencyUnit: CurrencyUnit;
}) {
    if (reviews.length === 0) return null;

    const renderDelta = (plan: number | null, actual: number, unit: '款' | '深' | '金额', currencyFormatter?: (v: number) => string) => {
        if (plan === null || plan === 0) {
            return <div className="text-[10px] text-slate-400">未设目标</div>;
        }
        const diff = actual - plan;
        const pct  = (diff / plan) * 100;
        const ok   = Math.abs(pct) <= 10;
        const warn = Math.abs(pct) > 10 && Math.abs(pct) <= 25;
        const cls  = ok ? 'text-emerald-600' : warn ? 'text-amber-600' : 'text-rose-600';
        const sign = diff > 0 ? '+' : '';
        const formatActual = unit === '金额' && currencyFormatter ? currencyFormatter(actual) : `${actual}`;
        const formatPlan   = unit === '金额' && currencyFormatter ? currencyFormatter(plan)   : `${plan}`;
        return (
            <div>
                <div className="text-xs font-semibold text-slate-700">{formatActual}</div>
                <div className={`text-[10px] ${cls}`}>
                    {sign}{pct.toFixed(0)}% vs 计划 {formatPlan}
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                <span className="text-[11px] font-semibold text-slate-600">已上市波段复盘</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">{reviews.length} 个波段</span>
                <span className="text-[10px] text-slate-400 ml-auto">实际 vs 计划 · ±10% 健康 · ±25% 警示</span>
            </div>
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {reviews.map(r => (
                    <div key={r.key} className="rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 space-y-2">
                        <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-slate-800 text-xs">{r.label}</span>
                            {r.seasonLabel && <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500">{r.seasonLabel}</span>}
                            {r.launchDate && (
                                <span className="ml-auto text-[10px] text-slate-400">
                                    {r.launchDate}{r.daysLaunched !== null && ` · 上市 ${r.daysLaunched} 天`}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                            <div>
                                <div className="text-[10px] text-slate-400 mb-0.5">款数</div>
                                {renderDelta(r.planStyles, r.actualStyles, '款')}
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 mb-0.5">均深</div>
                                {renderDelta(r.planDepth, r.actualDepth, '深')}
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 mb-0.5">投产金额</div>
                                {renderDelta(r.planBudget, r.actualAmt, '金额', v => formatCurrency(v, currencyUnit))}
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-500">
                            实际 <strong className="text-slate-700">{r.actualSku}</strong> SKU 投产
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── 行动队列 ─────────────────────────────────────────────────────────────────

function ActionQueue({
    rows, currencyUnit, isLocked, canRestoreSuggestion, onOpenDetail, onApplyDepthCut, onApplyStyleCut, onRestoreSuggestion,
}: {
    rows: CategoryDepthWorkbenchRow[];
    currencyUnit: CurrencyUnit;
    isLocked: boolean;
    canRestoreSuggestion: boolean;
    onOpenDetail: (ctx: DrawerContext) => void;
    onApplyDepthCut: (row: CategoryDepthWorkbenchRow) => void;
    onApplyStyleCut: (row: CategoryDepthWorkbenchRow) => void;
    onRestoreSuggestion: () => void;
}) {
    const sortedActionItems = useMemo(() => {
        const items = rows
            .flatMap(row => row.detailedDiagnoses.map(d => ({ row, issue: d })))
            .filter(({ row }) => row.waveLifecycle !== 'closed');

        items.sort((a, b) => {
            const tierA = calcSeverityTier({
                hasCapacityRisk:       a.row.hasCapacityRisk ?? false,
                sizeCoverageRate:      a.row.sizeCoverageRate ?? null,
                waveBudgetGapPositive: (a.row.waveBudgetGap ?? 0) > 0,
                grossMarginBelowTarget: (a.row.grossMargin ?? 1) < (a.row.grossMarginTarget ?? 0.4),
                diagnosisLevel:        a.issue.level,
            });
            const tierB = calcSeverityTier({
                hasCapacityRisk:       b.row.hasCapacityRisk ?? false,
                sizeCoverageRate:      b.row.sizeCoverageRate ?? null,
                waveBudgetGapPositive: (b.row.waveBudgetGap ?? 0) > 0,
                grossMarginBelowTarget: (b.row.grossMargin ?? 1) < (b.row.grossMarginTarget ?? 0.4),
                diagnosisLevel:        b.issue.level,
            });
            if (tierA !== tierB) return tierA - tierB;
            return (b.issue.impactAmount ?? 0) - (a.issue.impactAmount ?? 0);
        });
        return items;
    }, [rows]);
    const actionItems = sortedActionItems.slice(0, 6);

    if (sortedActionItems.length === 0) {
        return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-700">
                ✅ 当前口径无待处理行动项，结构健康。
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                <span className="text-[11px] font-semibold text-slate-600">行动队列</span>
                <span className="text-[10px] bg-rose-100 text-rose-700 rounded-full px-2 py-0.5 font-bold">{sortedActionItems.length}</span>
                <span className="text-[10px] text-slate-400 ml-auto">已排除已上市复盘波段（只读）</span>
            </div>
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {actionItems.map(({ row, issue }, idx) => {
                    const isDanger = issue.level === 'danger';
                    const tier = calcSeverityTier({
                        hasCapacityRisk:       row.hasCapacityRisk ?? false,
                        sizeCoverageRate:      row.sizeCoverageRate ?? null,
                        waveBudgetGapPositive: (row.waveBudgetGap ?? 0) > 0,
                        grossMarginBelowTarget: (row.grossMargin ?? 1) < (row.grossMarginTarget ?? 0.4),
                        diagnosisLevel:        issue.level,
                    });
                    const priority = tier <= 1 ? 'P0' : tier <= 3 ? 'P1' : 'P2';
                    const waveKey = `${row.season}-${row.wave}`;
                    return (
                        <div key={`${row.id}-${issue.title}-${idx}`}
                            className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${isDanger ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    priority === 'P0' ? 'bg-rose-600 text-white' : priority === 'P1' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>{priority}</span>
                                <span className={`text-[10px] font-semibold ${isDanger ? 'text-rose-700' : 'text-amber-700'}`}>{issue.title}</span>
                                <span className="ml-auto text-[10px] text-sky-700 font-semibold">{formatCurrency(issue.impactAmount, currencyUnit)}</span>
                            </div>
                            <div className="text-[10px] text-slate-600">
                                <span className="font-medium">{row.categoryLabel}</span>
                                {row.productRoleName && <span className="text-slate-400"> · {row.productRoleName}</span>}
                                <span className="text-slate-400"> · {resolveSeasonLabel(row.seasonLabel, row.season)} {row.wave}</span>
                            </div>
                            <div className={`text-[10px] ${isDanger ? 'text-rose-700' : 'text-amber-700'}`}>{issue.message}</div>
                            {issue.action && <div className="text-[10px] text-slate-500">→ {issue.action}</div>}
                            <div className="flex gap-1.5 pt-0.5">
                                <button
                                    onClick={() => onOpenDetail({ category: row.category, waveKey })}
                                    className="text-[10px] px-2 py-0.5 rounded border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100">
                                    打开明细
                                </button>
                                <button
                                    onClick={() => onApplyDepthCut(row)}
                                    disabled={isLocked}
                                    className="text-[10px] px-2 py-0.5 rounded border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-40">
                                    降均深
                                </button>
                                <button
                                    onClick={() => onApplyStyleCut(row)}
                                    disabled={isLocked}
                                    className="text-[10px] px-2 py-0.5 rounded border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-40">
                                    削款
                                </button>
                                {canRestoreSuggestion && (
                                    <button
                                        onClick={onRestoreSuggestion}
                                        disabled={isLocked}
                                        className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                                        恢复建议
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {sortedActionItems.length > actionItems.length && (
                <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
                    仍有 {sortedActionItems.length - actionItems.length} 项低优先级异常，请通过矩阵单元格或明细工作台继续下钻。
                </div>
            )}
        </div>
    );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export default function CategoryDepthPlanningPanel({
    currencyUnit, ssSeasonSalesTarget, awSeasonSalesTarget, waves, filters, priceStructure, isLocked = false, onJumpToTab,
}: Props) {
    const [detailFilter, setDetailFilter]     = useState<DetailFilter>('issues');
    const [showAllRows, setShowAllRows]       = useState(false);
    const [waveFilter, setWaveFilter]         = useState<string>('all');
    const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('active');
    const [matrixDimension, setMatrixDimension] = useState<MatrixDimension>('category-role');
    const [drawerOpen, setDrawerOpen]         = useState(false);
    const [drawerContext, setDrawerContext]   = useState<DrawerContext>(null);
    const [items, setItems]                   = useState<CategoryDepthInput[]>(defaultItems as CategoryDepthInput[]);
    const [structureItemsOverride, setStructureItemsOverride] = useState<CategoryDepthInput[] | null>(null);
    const [expandedSizeRows, setExpandedSizeRows] = useState<Set<string>>(new Set());
    const [sizeOverrides, setSizeOverrides]   = useState<Record<string, Record<string, number>>>({});
    const [batchDepthInput, setBatchDepthInput] = useState('');
    const [batchStyleInput, setBatchStyleInput] = useState('');
    const [batchMessage, setBatchMessage]     = useState<string | null>(null);
    const [showPasteBox, setShowPasteBox] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pasteResult, setPasteResult] = useState<string | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [showAdvancedCols, setShowAdvancedCols] = useState(false);
    const [batchPreview, setBatchPreview] = useState<{
        type: 'depth' | 'style';
        targetValue: number;
        targetCount: number;
        skippedCount: number;
        amountDelta: number;
    } | null>(null);

    const currentDate = useMemo(() => {
        const configuredDate = new Date(otbAssumptionsRaw.planningAsOfDate);
        return Number.isNaN(configuredDate.getTime()) ? new Date() : configuredDate;
    }, []);
    const currentDateLabel = useMemo(
        () => currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        [currentDate],
    );

    const sizeGroups = sizeGroupsData as SizeGroup[];

    const updateWorkingItems = useCallback((updater: (prev: CategoryDepthInput[]) => CategoryDepthInput[]) => {
        if (isLocked) return;
        if (priceStructure?.categoryDepthInputs?.length) {
            setStructureItemsOverride(prev => updater(prev ?? priceStructure.categoryDepthInputs));
            return;
        }
        setItems(updater);
    }, [isLocked, priceStructure]);

    const replaceWorkingItems = useCallback((nextItems: CategoryDepthInput[]) => {
        if (isLocked) return;
        if (priceStructure?.categoryDepthInputs?.length) {
            setStructureItemsOverride(nextItems);
            return;
        }
        setItems(nextItems);
    }, [isLocked, priceStructure]);

    const updateItem = useCallback((idx: number, field: keyof CategoryDepthInput, value: number | string) => {
        updateWorkingItems(prev =>
            prev.map((item, i) => i === idx ? { ...item, [field]: value, isManualOverride: true } : item)
        );
    }, [updateWorkingItems]);

    const resetToStructureSuggestion = useCallback(() => {
        if (isLocked) return;
        setStructureItemsOverride(null);
    }, [isLocked]);

    const applyDepthCutForRow = useCallback((row: CategoryDepthWorkbenchRow) => {
        if (isLocked || row.waveLifecycle === 'closed') return;
        const currentDepth = row.averageDepth ?? row.averageDepthOverride ?? 0;
        const targetDepth = row.productRoleId === 'test'
            ? Math.min(currentDepth || 400, 400)
            : currentDepth > 1200
                ? 1200
                : Math.max(1, Math.round((currentDepth || 300) * 0.9));
        updateWorkingItems(prev => prev.map(item =>
            item.id === row.id
                ? { ...item, averageDepthOverride: Math.round(targetDepth), isManualOverride: true }
                : item
        ));
        setBatchMessage(`已将 ${row.categoryLabel} / ${row.productRoleName ?? '未分类'} 均深调整为 ${Math.round(targetDepth)}`);
    }, [isLocked, updateWorkingItems]);

    const applyStyleCutForRow = useCallback((row: CategoryDepthWorkbenchRow) => {
        if (isLocked || row.waveLifecycle === 'closed') return;
        const nextStyleCount = Math.max(1, row.plannedStyleCount - 1);
        updateWorkingItems(prev => prev.map(item =>
            item.id === row.id
                ? { ...item, plannedStyleCount: nextStyleCount, isManualOverride: true }
                : item
        ));
        setBatchMessage(`已将 ${row.categoryLabel} / ${row.productRoleName ?? '未分类'} 款数调整为 ${nextStyleCount}`);
    }, [isLocked, updateWorkingItems]);

    const wavePlanRows = useMemo(
        () => calcWaveOTB(waves, ssSeasonSalesTarget, awSeasonSalesTarget),
        [waves, ssSeasonSalesTarget, awSeasonSalesTarget],
    );

    const waveSalesTargets = useMemo<Record<string, number>>(() => (
        wavePlanRows.reduce<Record<string, number>>((acc, wave) => {
            acc[`${wave.season}-${wave.wave}`] = wave.plannedSalesAmount;
            return acc;
        }, {})
    ), [wavePlanRows]);

    const waveOtbBudgets = useMemo<Record<string, number>>(() => (
        wavePlanRows.reduce<Record<string, number>>((acc, wave) => {
            acc[`${wave.season}-${wave.wave}`] = wave.otbBudget ?? 0;
            return acc;
        }, {})
    ), [wavePlanRows]);

    const waveMetadataByKey = useMemo(() => (
        wavePlanRows.reduce<Record<string, {
            waveId?: string;
            seasonLabel?: string;
            launchDate?: string;
            launchMonth?: number;
            waveRole?: string;
            priceBandFocus?: string[];
            productRoleFocus?: string[];
            waveOtbBudget?: number | null;
        }>>((acc, wave) => {
            acc[`${wave.season}-${wave.wave}`] = {
                waveId: wave.id,
                seasonLabel: wave.seasonLabel,
                launchDate: wave.launchDate,
                launchMonth: wave.launchMonth,
                waveRole: wave.waveRole,
                priceBandFocus: wave.priceBandFocus,
                productRoleFocus: wave.productRoleFocus,
                waveOtbBudget: wave.otbBudget ?? wave.planOtbBudget ?? null,
            };
            return acc;
        }, {})
    ), [wavePlanRows]);

    const workingItems = structureItemsOverride ?? priceStructure?.categoryDepthInputs ?? items;

    // wave plan depth targets (from wave_otb_plan.json averageDepth)
    const wavePlanDepthMap = useMemo(() => (
        waves.reduce<Record<string, number>>((acc, w) => {
            const key = `${w.season}-${w.wave}`;
            if (w.averageDepth) acc[key] = w.averageDepth;
            return acc;
        }, {})
    ), [waves]);
    const workingItemsWithWaveMeta = useMemo(() => (
        workingItems.map(item => {
            const meta = waveMetadataByKey[`${item.season}-${item.wave}`];
            if (!meta) return item;
            return {
                ...item,
                waveId: item.waveId ?? meta.waveId,
                seasonLabel: item.seasonLabel ?? meta.seasonLabel,
                launchDate: item.launchDate ?? meta.launchDate,
                launchMonth: item.launchMonth ?? meta.launchMonth,
                waveRole: item.waveRole ?? meta.waveRole,
                priceBandFocus: item.priceBandFocus ?? meta.priceBandFocus,
                productRoleFocus: item.productRoleFocus ?? meta.productRoleFocus,
                waveOtbBudget: item.waveOtbBudget ?? meta.waveOtbBudget ?? undefined,
            };
        })
    ), [waveMetadataByKey, workingItems]);
    const currentBrand    = resolveBrand(filters);
    const priceBands      = currentBrand.priceBands;
    const channelCapacity = (storeCapacityRaw as StoreCapacityRecord[]).find(
        c => c.channelId === resolveChannelCapacityKey(filters?.channel_type)
    );

    const allRows = useMemo<CategoryDepthWorkbenchRow[]>(() => {
        const baseRows = calcCategoryDepth(workingItemsWithWaveMeta, waveSalesTargets);
        const waveProductionTotals = baseRows.reduce<Record<string, number>>((acc, row) => {
            const key = `${row.season}-${row.wave}`;
            acc[key] = (acc[key] ?? 0) + (row.productionAmount ?? 0);
            return acc;
        }, {});

        return baseRows.map(row => {
            const lifecycle = resolveWaveLifecycle({ launchDate: row.launchDate ?? '', currentDate });
            const rowDemand = channelCapacity
                ? calcInitialAllocationDemand({
                    storeCount:             channelCapacity.storeCount,
                    skuCount:               row.plannedSkuCount,
                    avgDisplayPairsPerSku:  channelCapacity.avgDisplayPairsPerSku,
                    safetyStockPairsPerSku: channelCapacity.safetyStockPairsPerSku,
                })
                : null;
            const capacityCheck = channelCapacity && rowDemand
                ? calcCapacityCheck({
                    skuCount:         row.plannedSkuCount,
                    productionPairs:  row.plannedProductionPairs ?? 0,
                    totalSkuCapacity: channelCapacity.totalSkuCapacity,
                    initialDemand:    rowDemand.totalInitialDemand,
                })
                : null;
            const waveKey = `${row.season}-${row.wave}`;
            const waveOtbBudget = waveOtbBudgets[waveKey] ?? null;
            const waveBudgetGap = waveOtbBudget !== null ? (waveProductionTotals[waveKey] ?? 0) - waveOtbBudget : null;
            const sizeStats = calcRowSizeStats(
                row.plannedProductionPairs,
                row.sizeGroupId,
                sizeGroups,
                sizeOverrides[row.id],
            );

            const detailedDiagnoses: WorkbenchIssue[] = diagnoseCategoryDepthRow(row, rowDemand?.totalInitialDemand)
                .filter(issue => issue.level !== 'healthy')
                .map(issue => ({ ...issue, impactAmount: row.productionAmount ?? 0 }));

            if (capacityCheck?.isSkuOverCapacity) {
                detailedDiagnoses.push({
                    level: 'danger',
                    title: 'SKU超容量',
                    message: `计划 SKU ${row.plannedSkuCount} 超过渠道容量 ${channelCapacity?.totalSkuCapacity ?? 0}`,
                    action: '减少款数/色数，或拆分渠道投放',
                    impactAmount: row.productionAmount ?? 0,
                });
            }
            if (capacityCheck?.isInventoryPressure) {
                detailedDiagnoses.push({
                    level: 'warning',
                    title: '库存压力',
                    message: `投产量 ${Math.round(row.plannedProductionPairs ?? 0)} 双高于首铺需求 3 倍`,
                    action: '降低均深或分批到货',
                    impactAmount: row.productionAmount ?? 0,
                });
            }
            if (sizeStats.sizeCoverageRate !== null && sizeStats.sizeCoverageRate < 0.8) {
                detailedDiagnoses.push({
                    level: 'warning',
                    title: '尺码覆盖不足',
                    message: `尺码覆盖率 ${(sizeStats.sizeCoverageRate * 100).toFixed(0)}%，低于 80%`,
                    action: '补齐核心尺码或减少投放尺码组',
                    impactAmount: row.productionAmount ?? 0,
                });
            }
            for (const warning of sizeStats.sizeWarnings) {
                detailedDiagnoses.push({
                    level: 'warning',
                    title: '尺码结构风险',
                    message: warning,
                    action: '调整核心码、边码配比',
                    impactAmount: row.productionAmount ?? 0,
                });
            }
            if (waveBudgetGap !== null && waveBudgetGap > 0) {
                const gapRate = waveOtbBudget && waveOtbBudget > 0 ? waveBudgetGap / waveOtbBudget : 0;
                detailedDiagnoses.push({
                    level: gapRate > 0.1 ? 'danger' : 'warning',
                    title: '波段预算超额',
                    message: `${row.season} ${row.wave} 投产金额超出波段 OTB 预算 ${formatCurrency(waveBudgetGap, currencyUnit)}`,
                    action: '压缩款数/均深，或提交波段预算调整',
                    impactAmount: waveBudgetGap,
                });
            }
            if (row.diagnosisLevel !== 'ok' && detailedDiagnoses.length === 0) {
                detailedDiagnoses.push({
                    level: row.diagnosisLevel === 'danger' ? 'danger' : 'warning',
                    title: '款深异常',
                    message: row.diagnosis,
                    action: row.diagnosisLevel === 'danger' ? '立即处理' : '建议优化',
                    impactAmount: row.productionAmount ?? 0,
                });
            }

            const primary = detailedDiagnoses.find(issue => issue.level === 'danger') ?? detailedDiagnoses[0];

            return {
                ...row,
                diagnosis: primary ? `${primary.title}：${primary.message}` : row.diagnosis,
                diagnosisLevel: primary ? (primary.level === 'danger' ? 'danger' : 'warn') : row.diagnosisLevel,
                detailedDiagnoses,
                hasCapacityRisk: Boolean(capacityCheck?.isSkuOverCapacity || capacityCheck?.isInitialShort || capacityCheck?.isInventoryPressure),
                initialAllocationPairs: rowDemand?.initialAllocationPairs ?? null,
                replenishmentDemand: rowDemand?.safetyStockPairs ?? null,
                initialAllocationDemand: rowDemand?.totalInitialDemand ?? null,
                storeCapacity: channelCapacity?.totalSkuCapacity ?? null,
                isOverCapacity: Boolean(capacityCheck?.isSkuOverCapacity),
                isInitialShort: Boolean(capacityCheck?.isInitialShort),
                isInventoryPressure: Boolean(capacityCheck?.isInventoryPressure),
                plannedSizeCount: sizeStats.plannedSizeCount,
                requiredSizeCount: sizeStats.requiredSizeCount,
                sizeCoverageRate: sizeStats.sizeCoverageRate,
                sizeGroupLabel: sizeStats.sizeGroupLabel,
                waveOtbBudget,
                waveBudgetGap,
                waveLifecycle: lifecycle,
            };
        });
    }, [channelCapacity, currentDate, currencyUnit, sizeGroups, sizeOverrides, waveOtbBudgets, waveSalesTargets, workingItemsWithWaveMeta]);

    const globallyScopedRows = useMemo(() => {
        if (!filters) return allRows;
        return allRows.filter(row => {
            const categoryText = `${row.category} ${row.categoryLabel}`.toLowerCase();
            const categoryFilters = [filters.category_id, filters.sub_category]
                .filter(v => v !== 'all')
                .map(v => String(v).toLowerCase());
            return categoryFilters.every(v => categoryText.includes(v));
        });
    }, [allRows, filters]);

    const lifecycleScopedRows = useMemo(() => {
        switch (lifecycleFilter) {
            case 'active':   return globallyScopedRows.filter(r => r.waveLifecycle === 'current' || r.waveLifecycle === 'planning');
            case 'current':  return globallyScopedRows.filter(r => r.waveLifecycle === 'current');
            case 'planning': return globallyScopedRows.filter(r => r.waveLifecycle === 'planning');
            case 'closed':   return globallyScopedRows.filter(r => r.waveLifecycle === 'closed');
            default:         return globallyScopedRows;
        }
    }, [globallyScopedRows, lifecycleFilter]);

    const waveOptions = useMemo(() => {
        const waveMap = new Map<string, { key: string; label: string; launchTime: number }>();
        for (const row of lifecycleScopedRows) {
            const key = `${row.season}-${row.wave}`;
            const label = `${resolveSeasonLabel(row.seasonLabel, row.season)} ${row.wave}`;
            const launchTime = row.launchDate ? new Date(row.launchDate).getTime() : Number.MAX_SAFE_INTEGER;
            const existing = waveMap.get(key);
            if (!existing || launchTime < existing.launchTime) {
                waveMap.set(key, { key, label, launchTime });
            }
        }
        return Array.from(waveMap.values())
            .sort((a, b) => a.launchTime - b.launchTime || a.key.localeCompare(b.key));
    }, [lifecycleScopedRows]);

    const effectiveWaveFilter = waveFilter !== 'all' && waveOptions.some(option => option.key === waveFilter)
        ? waveFilter
        : 'all';

    const filtered = useMemo(() => (
        effectiveWaveFilter === 'all'
            ? lifecycleScopedRows
            : lifecycleScopedRows.filter(r => `${r.season}-${r.wave}` === effectiveWaveFilter)
    ), [lifecycleScopedRows, effectiveWaveFilter]);

    const closedWaveReviews = useMemo(() => {
        const closedRows = allRows.filter(r => r.waveLifecycle === 'closed');
        if (closedRows.length === 0) return [];
        const byWave = new Map<string, CategoryDepthWorkbenchRow[]>();
        for (const row of closedRows) {
            const key = `${row.season}-${row.wave}`;
            if (!byWave.has(key)) byWave.set(key, []);
            byWave.get(key)!.push(row);
        }
        return Array.from(byWave.entries()).map(([key, rows]) => {
            const planWave = waves.find(w => `${w.season}-${w.wave}` === key);
            const meta = waveMetadataByKey[key];
            const actualStyles = rows.reduce((s, r) => s + r.plannedStyleCount, 0);
            const actualSku    = rows.reduce((s, r) => s + r.plannedSkuCount, 0);
            const actualPairs  = rows.reduce((s, r) => s + (r.plannedProductionPairs ?? 0), 0);
            const actualAmt    = rows.reduce((s, r) => s + (r.productionAmount ?? 0), 0);
            const actualDepth  = actualSku > 0 ? Math.round(actualPairs / actualSku) : 0;
            const planStyles   = planWave?.plannedStyleCount ?? null;
            const planDepth    = planWave?.averageDepth ?? null;
            const planBudget   = planWave?.planOtbBudget ?? meta?.waveOtbBudget ?? null;
            const launchDate   = rows[0].launchDate ?? meta?.launchDate ?? null;
            const daysLaunched = launchDate
                ? Math.round((BUSINESS_DATE.getTime() - new Date(launchDate).getTime()) / 86400000)
                : null;
            return {
                key,
                label: `${rows[0].season} ${rows[0].wave}`,
                seasonLabel: rows[0].seasonLabel ?? meta?.seasonLabel ?? null,
                launchDate,
                daysLaunched,
                planStyles, actualStyles,
                actualSku,
                planDepth,  actualDepth,
                planBudget, actualAmt,
            };
        }).sort((a, b) => (a.launchDate ?? '').localeCompare(b.launchDate ?? ''));
    }, [allRows, waves, waveMetadataByKey]);

    const waveBudgetStats = useMemo(() => {
        const totalOtb = wavePlanRows.reduce((s, w) => s + (w.otbBudget ?? 0), 0);
        const lockedOrClosedAmount = allRows
            .filter(r => r.waveLifecycle === 'closed')
            .reduce((s, r) => s + (r.productionAmount ?? 0), 0);
        const currentUsed = allRows
            .filter(r => r.waveLifecycle === 'current')
            .reduce((s, r) => s + (r.productionAmount ?? 0), 0);
        const planningCommitted = allRows
            .filter(r => r.waveLifecycle === 'planning')
            .reduce((s, r) => s + (r.productionAmount ?? 0), 0);
        const remaining = Math.max(0, totalOtb - lockedOrClosedAmount - currentUsed);
        const overBudget = planningCommitted > remaining;
        return { totalOtb, lockedOrClosedAmount, currentUsed, planningCommitted, remaining, overBudget };
    }, [allRows, wavePlanRows]);

    const kpi = useMemo(() => {
        const totalStyles  = filtered.reduce((s, r) => s + r.plannedStyleCount, 0);
        const totalColors  = filtered.reduce((s, r) => s + r.plannedColorCount, 0);
        const totalSku     = filtered.reduce((s, r) => s + r.plannedSkuCount, 0);
        const totalPairs   = filtered.reduce((s, r) => s + (r.plannedProductionPairs ?? 0), 0);
        const avgDepth     = totalSku > 0 ? totalPairs / totalSku : 0;
        const totalAmt     = filtered.reduce((s, r) => s + (r.productionAmount ?? 0), 0);
        const issueCount   = filtered.reduce((s, r) => s + r.detailedDiagnoses.length, 0);
        // 加权平均毛利率
        const gmRows = filtered.filter(r => r.grossMargin !== null && (r.productionAmount ?? 0) > 0);
        const avgGrossMargin = gmRows.length > 0
            ? gmRows.reduce((s, r) => s + r.grossMargin! * (r.productionAmount ?? 0), 0)
              / gmRows.reduce((s, r) => s + (r.productionAmount ?? 0), 0)
            : null;
        // 主推款占比
        const mainAmt = filtered.filter(r => r.productRoleId === 'main').reduce((s, r) => s + (r.productionAmount ?? 0), 0);
        const mainProductRatio = totalAmt > 0 ? mainAmt / totalAmt : null;
        // 风险计数
        const capacityRiskCount = filtered.filter(r => r.hasCapacityRisk).length;
        const sizeRiskCount = filtered.filter(r => r.sizeCoverageRate !== null && r.sizeCoverageRate < 0.8).length;
        return { totalStyles, totalColors, totalSku, totalPairs, avgDepth, avgGrossMargin, mainProductRatio, totalAmt, capacityRiskCount, sizeRiskCount, issueCount };
    }, [filtered]);

    const insights = useMemo<CategoryDepthInsight[]>(() => {
        const baseInsights = generateCategoryDepthInsights(filtered);
        const capacityRiskCount = filtered.filter(row => row.hasCapacityRisk).length;
        const sizeCoverageRiskCount = filtered.filter(row => row.sizeCoverageRate !== null && row.sizeCoverageRate < 0.8).length;
        const overBudgetWaves = new Set(
            filtered
                .filter(row => row.waveBudgetGap !== null && row.waveBudgetGap > 0)
                .map(row => `${row.season}-${row.wave}`)
        );

        if (capacityRiskCount > 0) {
            baseInsights.push({
                level: 'warning',
                title: '容量/首铺风险',
                message: `${capacityRiskCount} 个款深组合存在 SKU 容量、首铺不足或库存压力`,
                action: '优先调整款数、色数和均深',
                affectedCount: capacityRiskCount,
            });
        }
        if (sizeCoverageRiskCount > 0) {
            baseInsights.push({
                level: 'warning',
                title: '尺码覆盖不足',
                message: `${sizeCoverageRiskCount} 个款深组合尺码覆盖率低于 80%`,
                action: '复核尺码组、核心码深度和边码配比',
                affectedCount: sizeCoverageRiskCount,
            });
        }
        if (overBudgetWaves.size > 0) {
            baseInsights.push({
                level: 'danger',
                title: '波段预算超额',
                message: `${overBudgetWaves.size} 个波段投产金额超过 OTB 预算`,
                action: '压缩非核心款深或提交预算调整',
                affectedCount: overBudgetWaves.size,
            });
        }

        return baseInsights;
    }, [filtered]);
    const waveChipData = useMemo<WaveChipData[]>(() => (
        waveOptions.map(opt => {
            const waveRows = allRows.filter(r => `${r.season}-${r.wave}` === opt.key);
            const lifecycle = waveRows[0]?.waveLifecycle ?? 'planning';
            const production = waveRows.reduce((s, r) => s + (r.productionAmount ?? 0), 0);
            const budget = waveRows[0]?.waveOtbBudget ?? null;
            const issues = waveRows.reduce((s, r) => s + r.detailedDiagnoses.length, 0);
            const launchDate = waveRows[0]?.launchDate;
            const seasonLabel = waveRows[0]?.seasonLabel;
            const waveRole = waveRows[0]?.waveRole;
            const daysToLaunch = launchDate
                ? Math.round((new Date(launchDate).getTime() - BUSINESS_DATE.getTime()) / 86400000)
                : undefined;
            // issue type breakdown
            const capacityIssues = waveRows.reduce((s, r) => s + r.detailedDiagnoses.filter(d =>
                d.title.includes('容量') || d.title.includes('首铺') || d.title === 'SKU超容量').length, 0);
            const sizeIssues = waveRows.reduce((s, r) => s + r.detailedDiagnoses.filter(d => d.title.includes('尺码')).length, 0);
            const budgetIssues = waveRows.reduce((s, r) => s + r.detailedDiagnoses.filter(d => d.title.includes('预算')).length, 0);
            return { ...opt, lifecycle, production, budget, issues, launchDate, seasonLabel, waveRole, daysToLaunch, capacityIssues, sizeIssues, budgetIssues };
        })
    ), [allRows, waveOptions]);

    const hasOverride = structureItemsOverride !== null;
    const sourceLabel = priceStructure?.categoryDepthInputs?.length
        ? (hasOverride ? '来源：价格&结构（含手动覆盖）' : '来源：价格&结构 → 品类/款深')
        : '来源：默认数据 / 手动录入';

    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);

    const openDrawer = useCallback((ctx: DrawerContext) => {
        setDrawerContext(ctx);
        setDrawerOpen(true);
        setShowAllRows(false);
    }, []);

    // 抽屉行：根据 drawerContext 过滤 filtered；明细、导出、粘贴和批量操作都必须使用这个上下文。
    const drawerRows = useMemo(() => {
        if (!drawerContext) return filtered;
        return filtered.filter(r => {
            const waveKey = `${r.season}-${r.wave}`;
            const matchWave = !drawerContext.waveKey || waveKey === drawerContext.waveKey;
            const matchCat  = !drawerContext.category || r.category === drawerContext.category || r.categoryLabel === drawerContext.category;
            const matchRole = !drawerContext.roleId   || r.productRoleId === drawerContext.roleId || r.productRoleName === drawerContext.roleId;
            return matchWave && matchCat && matchRole;
        });
    }, [drawerContext, filtered]);

    const detailRows = useMemo(() => {
        switch (detailFilter) {
            case 'issues':   return drawerRows.filter(r => r.diagnosisLevel !== 'ok');
            case 'override': return drawerRows.filter(r => r.isManualOverride);
            case 'main':     return drawerRows.filter(r => r.productRoleId === 'main');
            case 'hero':     return drawerRows.filter(r => r.productRoleId === 'hero' || r.isHeroProduct);
            case 'test':     return drawerRows.filter(r => r.productRoleId === 'test' || r.isTestProduct);
            case 'margin':   return drawerRows.filter(r => r.grossMargin !== null && r.grossMargin < (r.grossMarginTarget ?? 0.4));
            case 'capacity': return drawerRows.filter(r => r.hasCapacityRisk || (r.waveBudgetGap !== null && r.waveBudgetGap > 0));
            default:         return drawerRows;
        }
    }, [drawerRows, detailFilter]);

    const visibleDetailRows = showAllRows ? detailRows : detailRows.slice(0, 50);

    const exportCsv = useCallback(() => {
        const cols = ['id','season','wave','categoryLabel','priceBandLabel','productRoleName',
            'plannedStyleCount','plannedColorCount','plannedSkuCount','averageDepth',
            'plannedProductionPairs','productionAmount','grossMargin','sellThroughTarget',
            'initialAllocationPairs','replenishmentDemand','storeCapacity','sizeCoverageRate','diagnosis'];
        const header = cols.join(',');
        const body   = detailRows.map(r =>
            cols.map(c => {
                const v = (r as unknown as Record<string, unknown>)[c];
                return typeof v === 'number' ? v.toFixed(2) : (v ?? '');
            }).join(',')
        ).join('\n');
        const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'category_depth.csv'; a.click();
        URL.revokeObjectURL(url);
    }, [detailRows]);

    const downloadImportTemplate = useCallback(() => {
        const headers = 'id,季节,波段,品类,价格带,货品角色,计划款数,计划色数,均深,成本均价,售罄目标';
        const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'category_depth_import_template.csv'; a.click();
        URL.revokeObjectURL(url);
    }, []);

    const previewBatchDepth = useCallback(() => {
        const targetDepth = parseNumberCell(batchDepthInput);
        if (targetDepth === null || targetDepth <= 0 || isLocked) return;
        const target = Math.round(targetDepth);
        const activeRows = detailRows.filter(r => r.waveLifecycle !== 'closed');
        const skipped = detailRows.length - activeRows.length;
        const amountDelta = activeRows.reduce((s, r) => {
            const sku = r.plannedSkuCount;
            const newPairs = target * sku;
            const newAmt = newPairs * (r.costPrice ?? 0);
            const currentAmt = r.productionAmount ?? 0;
            return s + (newAmt - currentAmt);
        }, 0);
        setBatchPreview({ type: 'depth', targetValue: target, targetCount: activeRows.length, skippedCount: skipped, amountDelta });
        setBatchMessage(null);
    }, [batchDepthInput, detailRows, isLocked]);

    const previewBatchStyle = useCallback(() => {
        const targetStyleCount = parseNumberCell(batchStyleInput);
        if (targetStyleCount === null || targetStyleCount <= 0 || isLocked) return;
        const target = Math.max(1, Math.round(targetStyleCount));
        const activeRows = detailRows.filter(r => r.waveLifecycle !== 'closed');
        const skipped = detailRows.length - activeRows.length;
        const amountDelta = activeRows.reduce((s, r) => {
            const newSku = target * r.plannedColorCount;
            const newPairs = newSku * (r.averageDepth ?? 0);
            const newAmt = newPairs * (r.costPrice ?? 0);
            const currentAmt = r.productionAmount ?? 0;
            return s + (newAmt - currentAmt);
        }, 0);
        setBatchPreview({ type: 'style', targetValue: target, targetCount: activeRows.length, skippedCount: skipped, amountDelta });
        setBatchMessage(null);
    }, [batchStyleInput, detailRows, isLocked]);

    const confirmBatchPreview = useCallback(() => {
        if (!batchPreview || isLocked) return;
        const activeRows = detailRows.filter(r => r.waveLifecycle !== 'closed');
        const targetIds = new Set(activeRows.map(row => row.id));
        if (batchPreview.type === 'depth') {
            const target = batchPreview.targetValue;
            updateWorkingItems(prev => prev.map(item =>
                targetIds.has(item.id) ? { ...item, averageDepthOverride: target, isManualOverride: true } : item
            ));
            setBatchDepthInput('');
        } else {
            const target = batchPreview.targetValue;
            updateWorkingItems(prev => prev.map(item =>
                targetIds.has(item.id) ? { ...item, plannedStyleCount: target, isManualOverride: true } : item
            ));
            setBatchStyleInput('');
        }
        setBatchMessage(`已应用：${batchPreview.targetCount} 行更新${batchPreview.skippedCount > 0 ? `，跳过 ${batchPreview.skippedCount} 行已上市复盘波段` : ''}`);
        setBatchPreview(null);
    }, [batchPreview, detailRows, isLocked, updateWorkingItems]);

    const cancelBatchPreview = useCallback(() => {
        setBatchPreview(null);
    }, []);

    const applyPastedRows = useCallback(() => {
        if (isLocked) return;
        const rows = splitPastedRows(pasteText);
        if (rows.length === 0) {
            setPasteResult('没有可导入的粘贴内容');
            return;
        }

        const headerFields = rows[0].map(cell => PASTE_FIELD_ALIASES[normalizePasteHeader(cell)]);
        const hasHeader = headerFields.some(Boolean);
        const dataRows = hasHeader ? rows.slice(1) : rows;
        const nextItems = workingItems.map(item => ({ ...item }));
        const visibleTargetIds = visibleDetailRows.map(row => row.id);
        const detailTargetIds = new Set(detailRows.map(row => row.id));
        let changedCount = 0;
        let skippedCount = 0;

        dataRows.forEach((cells, rowIndex) => {
            const pastedFields: Partial<Record<PasteField, string | number>> = {};
            const fields = hasHeader ? headerFields : POSITIONAL_PASTE_FIELDS;

            fields.forEach((field, cellIndex) => {
                if (!field) return;
                const raw = cells[cellIndex];
                if (raw == null || raw === '') return;
                const parsed = parsePastedValue(field, raw);
                if (parsed !== null) pastedFields[field] = parsed;
            });

            const targetIndex = hasHeader
                ? findPasteTargetIndex(nextItems, pastedFields)
                : nextItems.findIndex(item => item.id === visibleTargetIds[rowIndex]);
            if (targetIndex < 0) return;
            if (!detailTargetIds.has(nextItems[targetIndex].id)) return;
            const targetLifecycle = resolveWaveLifecycle({
                launchDate: nextItems[targetIndex].launchDate ?? '',
                currentDate,
            });
            if (targetLifecycle === 'closed') {
                skippedCount += 1;
                return;
            }

            const updates = Object.entries(pastedFields).reduce<Partial<CategoryDepthInput>>((acc, [field, value]) => {
                const typedField = field as PasteField;
                if (EDITABLE_PASTE_FIELDS.has(typedField)) {
                    return { ...acc, [typedField]: value };
                }
                return acc;
            }, {});

            if (Object.keys(updates).length === 0) return;
            nextItems[targetIndex] = { ...nextItems[targetIndex], ...updates, isManualOverride: true };
            changedCount += 1;
        });

        replaceWorkingItems(nextItems);
        setPasteResult(changedCount > 0
            ? `已更新 ${changedCount} 行${skippedCount > 0 ? `，跳过 ${skippedCount} 行已上市复盘波段` : ''}`
            : skippedCount > 0
                ? `未更新可编辑行，跳过 ${skippedCount} 行已上市复盘波段`
                : '未匹配到可更新行'
        );
        if (changedCount > 0) setPasteText('');
    }, [currentDate, detailRows, isLocked, pasteText, replaceWorkingItems, visibleDetailRows, workingItems]);

    return (
        <div className="space-y-4">

            {/* Section 1 — 业务上下文头 */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-xs flex-wrap shadow-sm">
                {/* 左侧信息 */}
                <span className="text-slate-500">📅 <strong>{currentDateLabel}</strong></span>
                <span className="text-slate-200">|</span>
                <span className="text-slate-500">🏷 {filters?.brand && filters.brand !== 'all' ? filters.brand : currentBrand.brandName}
                    {filters?.channel_type && filters.channel_type !== 'all' ? ` · ${filters.channel_type}` : ''}
                </span>
                <span className="text-slate-200">|</span>
                <span className="text-slate-400">📌 {sourceLabel}</span>
                {/* 右侧操作组 */}
                <div className="ml-auto flex items-center gap-1.5">
                    <div className="relative">
                        <button onClick={() => setHelpOpen(p => !p)}
                            className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 text-[11px]">
                            ? 帮助
                        </button>
                        {helpOpen && (
                            <div className="absolute right-0 top-7 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-4 text-[11px] text-slate-600 space-y-2">
                                <div className="font-bold text-slate-700 mb-1">品类款深计算说明</div>
                                <div><strong>投产金额</strong> = 计划款数 × 计划色数 × 均深 × 成本均价</div>
                                <div><strong>均深</strong> = 投产双数 / SKU 数（SKU = 款 × 色）</div>
                                <div><strong>首铺需求</strong> = 门店数 × 每款展示双数</div>
                                <div><strong>补货需求</strong> = 门店数 × 安全库存/款</div>
                                <div><strong>尺码覆盖率</strong> = 实际有货码数 / 该组必需码数</div>
                                <div><strong>毛利率</strong> = (零售均价 - 成本均价) / 零售均价</div>
                                <div><strong>均深目标范围</strong>：目标 ×0.7 ~ ×1.4 为合理，超出 ×1.8 或低于 ×0.5 为危险</div>
                                <button onClick={() => setHelpOpen(false)} className="mt-2 text-slate-400 hover:text-slate-600 underline">关闭</button>
                            </div>
                        )}
                    </div>
                    {hasOverride && !isLocked && (
                        <button onClick={resetToStructureSuggestion}
                            className="px-2 py-0.5 rounded border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 text-[11px]">
                            恢复建议
                        </button>
                    )}
                    {isLocked && (
                        <span className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-0.5">🔒 已锁定</span>
                    )}
                </div>
            </div>

            {/* Section 2 — 波段时间线 */}
            <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500">口径：</span>
                    {([ ['active','当前+未来'],['current','当前滚动'],['planning','未来计划'],['closed','已上市复盘'],['all','全部'] ] as [LifecycleFilter, string][]).map(([key, label]) => (
                        <button key={key} onClick={() => { setLifecycleFilter(key); setWaveFilter('all'); }}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                lifecycleFilter === key
                                    ? key === 'closed' ? 'bg-slate-500 text-white border-slate-500'
                                      : key === 'all' ? 'bg-slate-700 text-white border-slate-700'
                                      : 'bg-sky-500 text-white border-sky-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
                <WaveTimeline
                    chips={waveChipData}
                    selectedKey={effectiveWaveFilter !== 'all' ? effectiveWaveFilter : null}
                    onSelect={key => setWaveFilter(key ?? 'all')}
                    currencyUnit={currencyUnit}
                />
            </div>

            {/* Section 3 — OTB 预算流 */}
            {waveBudgetStats.totalOtb > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap text-xs">
                        <span className="font-semibold text-slate-600">OTB 预算流</span>
                        <span className="text-slate-400">年度总预算 <strong className="text-sky-700">{fc(waveBudgetStats.totalOtb)}</strong></span>
                        <span className="text-slate-200">|</span>
                        <span className="text-slate-400">锁定 <strong className="text-slate-500">{fc(waveBudgetStats.lockedOrClosedAmount)}</strong></span>
                        <span className="text-slate-200">|</span>
                        <span className="text-slate-400">当前 <strong className="text-amber-600">{fc(waveBudgetStats.currentUsed)}</strong></span>
                        <span className="text-slate-200">|</span>
                        <span className="text-slate-400">可分配 <strong className={waveBudgetStats.overBudget ? 'text-rose-600' : 'text-emerald-600'}>{fc(waveBudgetStats.remaining)}</strong></span>
                        <span className="text-slate-200">|</span>
                        <span className="text-slate-400">计划投产 <strong className={waveBudgetStats.overBudget ? 'text-rose-600 font-bold' : 'text-sky-700'}>{fc(waveBudgetStats.planningCommitted)}</strong></span>
                        {waveBudgetStats.overBudget && (
                            <span className="ml-auto text-[11px] font-semibold text-rose-600">🚨 计划超预算</span>
                        )}
                    </div>
                    <div className="h-2 flex rounded-b-xl overflow-hidden">
                        {waveBudgetStats.totalOtb > 0 && (() => {
                            const total = waveBudgetStats.totalOtb;
                            const locked  = Math.min((waveBudgetStats.lockedOrClosedAmount / total) * 100, 100);
                            const current = Math.min((waveBudgetStats.currentUsed / total) * 100, 100);
                            const remain  = Math.min((waveBudgetStats.remaining / total) * 100, 100);
                            const plan    = waveBudgetStats.planningCommitted > waveBudgetStats.remaining
                                ? remain : Math.min((waveBudgetStats.planningCommitted / total) * 100, 100);
                            return (
                                <>
                                    <div style={{ width: `${locked}%` }}  className="bg-slate-400" />
                                    <div style={{ width: `${current}%` }} className="bg-amber-400" />
                                    <div style={{ width: `${plan}%` }}    className={waveBudgetStats.overBudget ? 'bg-rose-500' : 'bg-sky-400'} />
                                    <div style={{ width: `${Math.max(0, 100 - locked - current - plan)}%` }} className="bg-emerald-200" />
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Section 4 — 决策驾驶舱 */}
            <DecisionCockpit kpi={kpi} insights={insights} currencyUnit={currencyUnit} />

            {/* Section 5 — 结构矩阵 */}
            <StructureMatrix
                rows={filtered}
                dimension={matrixDimension}
                onDimensionChange={setMatrixDimension}
                currencyUnit={currencyUnit}
                onCellClick={openDrawer}
                wavePlanMap={wavePlanDepthMap}
            />

            {/* Section 6a — 已上市波段复盘 */}
            {closedWaveReviews.length > 0 && (
                <ClosedWaveReviewCards reviews={closedWaveReviews} currencyUnit={currencyUnit} />
            )}

            {/* Section 6 — 行动队列 */}
            <ActionQueue
                rows={filtered}
                currencyUnit={currencyUnit}
                isLocked={isLocked}
                canRestoreSuggestion={hasOverride}
                onOpenDetail={openDrawer}
                onApplyDepthCut={applyDepthCutForRow}
                onApplyStyleCut={applyStyleCutForRow}
                onRestoreSuggestion={resetToStructureSuggestion}
            />

            {/* 跨模块联动跳转 */}
            {onJumpToTab && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="mb-2 text-xs font-bold text-slate-600">跨模块联动</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onJumpToTab('pricestructure')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700 transition-colors hover:bg-sky-100">
                            💲 价格&结构
                        </button>
                        <button type="button" onClick={() => onJumpToTab('wave')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-700 transition-colors hover:bg-violet-100">
                            🌊 回波段预算
                        </button>
                        <button type="button" onClick={() => onJumpToTab('execution')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-200">
                            ✅ 查执行跟踪
                        </button>
                    </div>
                </div>
            )}

            {/* Section 7 — 明细抽屉/折叠面板 */}
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => setDrawerOpen(prev => !prev)}>
                        <span className="text-[12px] font-semibold text-slate-600">
                            {drawerOpen ? '▼' : '▶'} 明细测算工作台
                        </span>
                        <span className="truncate text-[11px] text-slate-400">
                            {drawerContext
                                ? `筛选：${[drawerContext.waveKey, drawerContext.category, drawerContext.roleId].filter(Boolean).join(' · ')} · ${drawerRows.length} 行`
                                : `全部 ${filtered.length} 行`}
                        </span>
                    </button>
                    {drawerContext && (
                        <button
                            type="button"
                            className="shrink-0 text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-100"
                            onClick={() => setDrawerContext(null)}>
                            清除筛选
                        </button>
                    )}
                    <span className="shrink-0 text-[11px] text-slate-400">蓝底单元格可编辑</span>
                </div>

                {drawerOpen && (
                    <div className="space-y-0 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-3 border-b border-slate-100 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {DETAIL_FILTER_OPTIONS.map(opt => (
                                    <button key={opt.key} onClick={() => { setDetailFilter(opt.key); setShowAllRows(false); }}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                            detailFilter === opt.key ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] text-slate-400">显示 {visibleDetailRows.length}/{detailRows.length} 行</span>
                                {batchMessage && (
                                    <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">{batchMessage}</span>
                                )}
                                <input value={batchDepthInput} onChange={e => setBatchDepthInput(e.target.value)}
                                    disabled={isLocked || batchPreview !== null}
                                    placeholder="均深"
                                    className="w-16 text-right text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:bg-slate-50" />
                                <button onClick={previewBatchDepth} disabled={isLocked || detailRows.length === 0 || batchPreview !== null}
                                    className="text-xs px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-50">
                                    📊 预览·均深
                                </button>
                                <input value={batchStyleInput} onChange={e => setBatchStyleInput(e.target.value)}
                                    disabled={isLocked || batchPreview !== null}
                                    placeholder="款数"
                                    className="w-16 text-right text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:bg-slate-50" />
                                <button onClick={previewBatchStyle} disabled={isLocked || detailRows.length === 0 || batchPreview !== null}
                                    className="text-xs px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-50">
                                    📊 预览·款数
                                </button>
                                <button onClick={() => setShowPasteBox(prev => !prev)}
                                    disabled={isLocked}
                                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                                    从 Excel 粘贴
                                </button>
                                <button onClick={downloadImportTemplate}
                                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                                    📋 下载导入模板
                                </button>
                                <button onClick={exportCsv} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">导出 CSV</button>
                                <button onClick={() => setShowAdvancedCols(prev => !prev)}
                                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${showAdvancedCols ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                                    {showAdvancedCols ? '收起高级字段' : '高级字段 ▸'}
                                </button>
                            </div>
                        </div>
                        {batchPreview && (
                            <div className="px-4 py-2.5 border-b border-amber-200 bg-amber-50">
                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                    <span className="text-amber-700 font-semibold">
                                        📊 批量{batchPreview.type === 'depth' ? '调均深' : '调款数'}预览
                                    </span>
                                    <span className="text-slate-200">|</span>
                                    <span className="text-slate-700">
                                        目标值 <strong className="text-slate-900">{batchPreview.targetValue}</strong>
                                    </span>
                                    <span className="text-slate-200">|</span>
                                    <span className="text-slate-700">
                                        将影响 <strong className="text-sky-700">{batchPreview.targetCount}</strong> 行
                                    </span>
                                    {batchPreview.skippedCount > 0 && (
                                        <span className="text-slate-500">（跳过 {batchPreview.skippedCount} 行已上市）</span>
                                    )}
                                    <span className="text-slate-200">|</span>
                                    <span className={batchPreview.amountDelta > 0 ? 'text-rose-600 font-semibold' : batchPreview.amountDelta < 0 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                                        投产金额 {batchPreview.amountDelta > 0 ? '↑' : batchPreview.amountDelta < 0 ? '↓' : '='} {fc(Math.abs(batchPreview.amountDelta))}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <button onClick={cancelBatchPreview}
                                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                                            取消
                                        </button>
                                        <button onClick={confirmBatchPreview}
                                            disabled={isLocked}
                                            className="text-xs px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50">
                                            ✓ 确认应用
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {showPasteBox && (
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                                    rows={4}
                                    placeholder="可粘贴表头：id、计划款数、计划色数、均深、成本均价、售罄目标"
                                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100" />
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-slate-400">{pasteResult ?? '无表头时按当前明细顺序更新：款数、色数、均深、成本、售罄。'}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setPasteText(''); setPasteResult(null); }}
                                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                                            清空
                                        </button>
                                        <button onClick={applyPastedRows}
                                            className="text-xs px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-500 text-white hover:bg-sky-600">
                                            应用粘贴
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="text-[11px] text-slate-400 px-4 py-1.5 bg-slate-50 border-b border-slate-100">
                            蓝底单元格可编辑，其余自动计算。前 3 列（季节/波段/品类）固定显示。
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-max text-xs w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="sticky left-0 z-20 min-w-[72px] bg-slate-50 text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">季节</th>
                                        <th className="sticky left-[72px] z-20 min-w-[88px] bg-slate-50 text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">波段</th>
                                        <th className="sticky left-[160px] z-20 min-w-[120px] bg-slate-50 text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">品类</th>
                                        <th className="text-center py-2 px-2 text-slate-500 font-medium whitespace-nowrap">波段状态</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">上市日期</th>
                                        <th className="text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">价格带</th>
                                        <th className="text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">货品角色</th>
                                        {showAdvancedCols && <th className="text-left py-2 px-2 text-slate-500 font-medium whitespace-nowrap">来源</th>}
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">零售均价</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">成本均价</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium">毛利率</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium">售罄目标</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium">计划款数</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium">计划色数</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium">SKU</th>
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium">均深</th>
                                        {showAdvancedCols && <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">投产双数</th>}
                                        <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">投产金额</th>
                                        {showAdvancedCols && <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">首铺需求</th>}
                                        {showAdvancedCols && <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">补货需求</th>}
                                        {showAdvancedCols && <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">门店容量</th>}
                                        <th className="text-center py-2 px-2 text-slate-500 font-medium whitespace-nowrap">容量诊断</th>
                                        {showAdvancedCols && <th className="text-right py-2 px-2 text-slate-500 font-medium whitespace-nowrap">尺码覆盖率</th>}
                                        {showAdvancedCols && <th className="text-center py-2 px-2 text-slate-500 font-medium whitespace-nowrap">超容量</th>}
                                        {showAdvancedCols && <th className="text-center py-2 px-2 text-slate-500 font-medium whitespace-nowrap">首铺不足</th>}
                                        {showAdvancedCols && <th className="text-left py-2 px-2 text-slate-500 font-medium whitespace-nowrap">尺码组</th>}
                                        <th className="text-center py-2 px-2 text-slate-500 font-medium whitespace-nowrap">尺码诊断</th>
                                        <th className="text-left py-2 px-3 text-slate-500 font-medium">诊断</th>
                                        <th className="py-2 px-2 text-slate-500 font-medium">尺码</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleDetailRows.map(row => {
                                        const globalIdx  = allRows.indexOf(row);
                                        const waveDepthTarget = wavePlanDepthMap[`${row.season}-${row.wave}`];
                                        const depthTarget = waveDepthTarget ?? 700;
                                        const depthRatio = row.averageDepth !== null ? row.averageDepth / depthTarget : null;
                                        const depthOk    = depthRatio !== null && depthRatio >= 0.7 && depthRatio <= 1.4;
                                        const depthClass = depthRatio === null ? '' :
                                            depthOk ? 'text-emerald-600' :
                                            (depthRatio < 0.5 || depthRatio > 1.8) ? 'text-rose-600' : 'text-amber-600';
                                        const gmClass    = row.grossMargin !== null
                                            ? (row.grossMargin >= 0.50 ? 'text-emerald-600' : row.grossMargin >= 0.40 ? 'text-amber-600' : 'text-rose-600')
                                            : '';
                                        return (
                                            <React.Fragment key={row.id}>
                                                <tr className={`border-b border-slate-50 hover:bg-slate-50/60 ${row.isManualOverride ? 'bg-amber-50/20' : ''} ${row.waveLifecycle === 'closed' ? 'opacity-70' : ''}`}>
                                                    <td className="sticky left-0 z-10 min-w-[72px] bg-white py-2 px-3 text-slate-700 whitespace-nowrap">{row.season}</td>
                                                    <td className="sticky left-[72px] z-10 min-w-[88px] bg-white py-2 px-3 text-slate-600 whitespace-nowrap">{row.wave}</td>
                                                    <td className="sticky left-[160px] z-10 min-w-[120px] bg-white py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                                                        {row.categoryLabel}
                                                        {row.isManualOverride && (
                                                            <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-600 border border-amber-200">已手动覆盖</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        {row.waveLifecycle === 'closed' && (
                                                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">已上市</span>
                                                        )}
                                                        {row.waveLifecycle === 'current' && (
                                                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200 whitespace-nowrap">当前滚动</span>
                                                        )}
                                                        {row.waveLifecycle === 'planning' && (
                                                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">未来计划</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-[11px] text-slate-500 whitespace-nowrap">
                                                        {row.launchDate ? row.launchDate.slice(0, 10) : '--'}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <select value={row.priceBandId ?? priceBands[1]?.band ?? 'Volume'}
                                                            onChange={e => {
                                                                const sel = priceBands.find(b => b.band === e.target.value);
                                                                updateItem(globalIdx, 'priceBandId', e.target.value);
                                                                updateItem(globalIdx, 'priceBandLabel', sel?.label ?? e.target.value);
                                                            }}
                                                            disabled={isLocked || row.waveLifecycle === 'closed'}
                                                            className="w-24 text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50">
                                                            {priceBands.map(b => <option key={b.band} value={b.band}>{b.label}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{row.productRoleName ?? '--'}</td>
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-2 text-slate-400 text-[10px] whitespace-nowrap">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(row.isManualOverride
                                                                    ? ['手动覆盖']
                                                                    : [priceStructure?.categoryDepthInputs?.length ? '价格&结构' : '默认录入', '波段拆解']
                                                                ).map(tag => (
                                                                    <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{tag}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="py-2 px-2 text-right">
                                                        <input type="number" value={row.retailPrice} step={10}
                                                            onChange={e => updateItem(globalIdx, 'retailPrice', parseFloat(e.target.value) || 0)}
                                                            disabled={isLocked || row.waveLifecycle === 'closed'}
                                                            className="w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50" />
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <input type="number" value={row.costPrice} step={5}
                                                            onChange={e => updateItem(globalIdx, 'costPrice', parseFloat(e.target.value) || 0)}
                                                            disabled={isLocked || row.waveLifecycle === 'closed'}
                                                            className="w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50" />
                                                    </td>
                                                    <td className={`py-2 px-3 text-right font-medium ${gmClass}`}>{formatPct(row.grossMargin)}</td>
                                                    <td className="py-2 px-2 text-right">
                                                        <input type="number" value={parseFloat((row.sellThroughTarget * 100).toFixed(1))} step={1}
                                                            onChange={e => updateItem(globalIdx, 'sellThroughTarget', (parseFloat(e.target.value) || 0) / 100)}
                                                            disabled={isLocked || row.waveLifecycle === 'closed'}
                                                            className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50" />
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <input type="number" value={row.plannedStyleCount} step={1} min={1}
                                                            onChange={e => updateItem(globalIdx, 'plannedStyleCount', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))}
                                                            disabled={isLocked || row.waveLifecycle === 'closed'}
                                                            className="w-12 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50" />
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <input type="number" value={row.plannedColorCount} step={1} min={1}
                                                            onChange={e => updateItem(globalIdx, 'plannedColorCount', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))}
                                                            disabled={isLocked || row.waveLifecycle === 'closed'}
                                                            className="w-12 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50" />
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-700">{formatQty(row.plannedSkuCount)}</td>
                                                    <td className="py-2 px-2 text-right">
                                                        <input type="number" value={row.averageDepth !== null ? Math.round(row.averageDepth) : ''} step={10} min={1}
                                                            onChange={e => updateItem(globalIdx, 'averageDepthOverride', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))}
                                                            disabled={isLocked || row.waveLifecycle === 'closed'}
                                                            title={waveDepthTarget ? `目标均深: ${waveDepthTarget}双` : undefined}
                                                            className={`w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50 ${depthClass}`} />
                                                    </td>
                                                    {/* 高级字段：投产双数（独立） */}
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-3 text-right text-slate-700">
                                                            {row.plannedProductionPairs !== null ? formatQty(row.plannedProductionPairs) : '--'}
                                                        </td>
                                                    )}
                                                    {/* 投产金额（含双数 tooltip） */}
                                                    <td className="py-2 px-3 text-right font-semibold text-sky-700" title={row.plannedProductionPairs !== null ? `${formatQty(row.plannedProductionPairs)} 双` : undefined}>
                                                        {fc(row.productionAmount)}
                                                        {row.plannedProductionPairs !== null && (
                                                            <div className="text-[9px] text-slate-400 font-normal">{formatQty(row.plannedProductionPairs)} 双</div>
                                                        )}
                                                    </td>
                                                    {/* 高级字段：首铺/补货/门店 */}
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-3 text-right text-slate-700">{row.initialAllocationPairs !== null ? formatQty(row.initialAllocationPairs) : '--'}</td>
                                                    )}
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-3 text-right text-slate-700">{row.replenishmentDemand !== null ? formatQty(row.replenishmentDemand) : '--'}</td>
                                                    )}
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-3 text-right text-slate-700">{row.storeCapacity !== null ? formatQty(row.storeCapacity) : '--'}</td>
                                                    )}
                                                    {/* 容量诊断（合并badge） */}
                                                    <td className="py-2 px-2 text-center">
                                                        {row.hasCapacityRisk ? (
                                                            <span className="inline-flex flex-col gap-0.5 items-center">
                                                                {row.isOverCapacity && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 whitespace-nowrap">超容量</span>}
                                                                {row.isInitialShort && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 whitespace-nowrap">首铺不足</span>}
                                                                {row.isInventoryPressure && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 whitespace-nowrap">库存压力</span>}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] text-emerald-600">✓</span>
                                                        )}
                                                    </td>
                                                    {/* 高级字段：尺码覆盖率/超容量/首铺不足/尺码组 */}
                                                    {showAdvancedCols && (
                                                        <td className={`py-2 px-3 text-right font-medium ${
                                                            row.sizeCoverageRate === null ? 'text-slate-400' :
                                                            row.sizeCoverageRate < 0.8 ? 'text-amber-600' : 'text-emerald-600'
                                                        }`}>
                                                            {row.sizeCoverageRate !== null ? `${(row.sizeCoverageRate * 100).toFixed(0)}%` : '--'}
                                                        </td>
                                                    )}
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-2 text-center">
                                                            {row.isOverCapacity
                                                                ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">是</span>
                                                                : <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">否</span>}
                                                        </td>
                                                    )}
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-2 text-center">
                                                            {row.isInitialShort
                                                                ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">是</span>
                                                                : <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">否</span>}
                                                        </td>
                                                    )}
                                                    {showAdvancedCols && (
                                                        <td className="py-2 px-2">
                                                            <select value={row.sizeGroupId ?? 'men'}
                                                                onChange={e => updateItem(globalIdx, 'sizeGroupId', e.target.value)}
                                                                disabled={isLocked || row.waveLifecycle === 'closed'}
                                                                className="w-20 text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none disabled:bg-slate-50">
                                                                {sizeGroups.map(g => <option key={g.sizeGroupId} value={g.sizeGroupId}>{g.sizeGroupLabel}</option>)}
                                                            </select>
                                                        </td>
                                                    )}
                                                    {/* 尺码诊断（合并 badge：覆盖率+组） */}
                                                    <td className="py-2 px-2 text-center">
                                                        {row.sizeCoverageRate !== null ? (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                                                                row.sizeCoverageRate < 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                                            }`}>
                                                                {(row.sizeCoverageRate * 100).toFixed(0)}%
                                                                {row.sizeGroupLabel ? ` · ${row.sizeGroupLabel}` : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px]">--</span>
                                                        )}
                                                    </td>
                                                    <td className={`py-2 px-3 text-xs whitespace-nowrap ${
                                                        row.diagnosisLevel === 'danger' ? 'text-rose-600' :
                                                        row.diagnosisLevel === 'warn'   ? 'text-amber-600' : 'text-emerald-600'
                                                    }`}>{row.diagnosis}</td>
                                                    <td className="py-2 px-2">
                                                        <button onClick={() => setExpandedSizeRows(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(row.id)) {
                                                                next.delete(row.id);
                                                            } else {
                                                                next.add(row.id);
                                                            }
                                                            return next;
                                                        })}
                                                            className="text-[10px] px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 whitespace-nowrap hover:bg-slate-200">
                                                            {expandedSizeRows.has(row.id) ? '▲ 收起' : '▼ 尺码'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expandedSizeRows.has(row.id) && row.plannedProductionPairs != null && row.plannedProductionPairs > 0 && (
                                                    <tr key={`${row.id}-size`} className="bg-sky-50/30">
                                                        <td colSpan={5} />
                                                        <td colSpan={showAdvancedCols ? 24 : 15} className="py-3 px-5">
                                                            {(() => {
                                                                const sizeStats = calcRowSizeStats(row.plannedProductionPairs, row.sizeGroupId, sizeGroups, sizeOverrides[row.id]);
                                                                const sizeRows = sizeStats.sizeRows;
                                                                const warnings = sizeStats.sizeWarnings;
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <div className="text-[11px] font-medium text-slate-600 mb-1">
                                                                            尺码深度分布 — 合计 {formatQty(row.plannedProductionPairs)} 双 · 覆盖 {sizeStats.plannedSizeCount}/{sizeStats.requiredSizeCount}
                                                                        </div>
                                                                        <div className="flex gap-1.5 flex-wrap">
                                                                            {sizeRows.map(sr => (
                                                                                <div key={sr.sizeId}
                                                                                    className={`rounded-lg border px-2.5 py-2 text-center text-xs w-16 ${
                                                                                        sr.isCoreSize ? 'bg-sky-100 border-sky-200' :
                                                                                        sr.isEdgeSize ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
                                                                                    }`}>
                                                                                    <div className="font-semibold text-slate-700">{sr.sizeLabel}</div>
                                                                                    <div className={`text-[10px] ${sr.discontinuityRisk === 'high' ? 'text-rose-600' : 'text-slate-500'}`}>
                                                                                        {sr.plannedPairs}双
                                                                                    </div>
                                                                                    <div className="text-[10px] text-slate-400">{(sr.weightRatio * 100).toFixed(0)}%</div>
                                                                                    <input type="number" value={parseFloat((sr.weightRatio * 100).toFixed(0))}
                                                                                        min={0} max={100} step={1}
                                                                                        onChange={e => {
                                                                                            const nw = (parseFloat(e.target.value) || 0) / 100;
                                                                                            setSizeOverrides(prev => ({
                                                                                                ...prev,
                                                                                                [row.id]: { ...(prev[row.id] ?? {}), [sr.sizeId]: nw },
                                                                                            }));
                                                                                        }}
                                                                                        disabled={isLocked || row.waveLifecycle === 'closed'}
                                                                                        className="w-full mt-1 text-center text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-400">蓝=核心码 红=边码 | 可调整各码比例</div>
                                                                        {warnings.map((w, wi) => (
                                                                            <div key={wi} className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">{w}</div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-sky-50 font-semibold text-xs border-t-2 border-slate-200">
                                        <td className="py-2.5 px-3 text-slate-700" colSpan={5}>合计</td>
                                        <td colSpan={showAdvancedCols ? 7 : 6} />
                                        <td className="py-2.5 px-3 text-right text-slate-400">--</td>
                                        <td className="py-2.5 px-3 text-right">{visibleDetailRows.reduce((s, r) => s + r.plannedStyleCount, 0)}</td>
                                        <td className="py-2.5 px-3 text-right">{visibleDetailRows.reduce((s, r) => s + r.plannedColorCount, 0)}</td>
                                        <td className="py-2.5 px-3 text-right">{formatQty(visibleDetailRows.reduce((s, r) => s + r.plannedSkuCount, 0))}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-400">--</td>
                                        {showAdvancedCols && <td className="py-2.5 px-3 text-right">{formatQty(visibleDetailRows.reduce((s, r) => s + (r.plannedProductionPairs ?? 0), 0))}</td>}
                                        <td className="py-2.5 px-3 text-right text-sky-700">{fc(visibleDetailRows.reduce((s, r) => s + (r.productionAmount ?? 0), 0))}</td>
                                        <td colSpan={showAdvancedCols ? 8 : 3} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        {detailRows.length > 50 && !showAllRows && (
                            <div className="flex items-center justify-center py-4 border-t border-slate-100">
                                <button onClick={() => setShowAllRows(true)}
                                    className="px-4 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100">
                                    显示全部 {detailRows.length} 行
                                </button>
                            </div>
                        )}
                        {showAllRows && detailRows.length > 50 && (
                            <div className="flex items-center justify-center py-4 border-t border-slate-100">
                                <button onClick={() => setShowAllRows(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs hover:bg-slate-50">
                                    收起（显示前 50 行）
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

type WorkbenchIssue = DepthDiagnosis & { impactAmount?: number };

interface CategoryDepthWorkbenchRow extends Omit<CategoryDepthRow, 'waveOtbBudget'> {
    detailedDiagnoses: WorkbenchIssue[];
    hasCapacityRisk: boolean;
    initialAllocationPairs: number | null;
    replenishmentDemand: number | null;
    initialAllocationDemand: number | null;
    storeCapacity: number | null;
    isOverCapacity: boolean;
    isInitialShort: boolean;
    isInventoryPressure: boolean;
    plannedSizeCount: number;
    requiredSizeCount: number;
    sizeCoverageRate: number | null;
    sizeGroupLabel: string;
    waveOtbBudget: number | null;
    waveBudgetGap: number | null;
    waveLifecycle: WaveLifecycle;
}
