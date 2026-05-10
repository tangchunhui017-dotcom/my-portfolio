'use client';
/**
 * src/components/otb/panels/OTBPriceStructurePanel.tsx
 * OTB 价格&结构规划面板
 *
 * 价格&结构工作台：
 *   structure         价格带策略 + 货品角色
 *   categorymatrix    品类×价格带矩阵
 *   pricing           定价校验
 */

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from 'react';
import type { CurrencyUnit } from '@/utils/otbCalculations';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import type { WaveOTBInput, CategoryDepthInput } from '@/utils/otbCalculations';
import type { OtbBusinessContext } from '@/hooks/useOtbBusinessContext';
import { formatCurrency } from '@/utils/otbCalculations';
import { resolveAllPriceBands, type PriceBandStrategyRow } from '@/utils/otbRuleResolver';
import {
    calcAverageRetailPrice,
    calcCostCeilingByMargin,
    calcCostCeilingByMarkup,
    calcFinalCostCeiling,
    calcPriceBandSalesAmount,
    calcRoleStyleCount,
    calcRoleDepth,
    normalizeRatio,
    normalizeActivePriceBands,
    isClearancePriceBand,
    diagnosePriceBandStructure,
    diagnoseProductRoleStructure,
    calcPricingCheck,
    calcWeightedAveragePrice,
    calcWeightedAverageCost,
    calcWeightedGrossMargin,
    calcWeightedMarkupRate,
    calcRoleBudgetByContribution,
    calcStyleContributionFactor,
    classifyStyleContribution,
    calcGrossProfitContributionByPriceBand,
    calcPriceBandProductionAmount,
    calcReplenishStrategy,
    type StructureDiagnosis,
} from '@/utils/otbPriceStructure';

// ─── JSON データ ────────────────────────────────────────────────
import priceBandStrategyData from '../../../../data/otb/price_band_strategy.json';
import productRoleStrategyData from '../../../../data/otb/product_role_strategy.json';
import waveAssortmentData from '../../../../data/otb/wave_assortment_structure.json';
import footwearTaxonomyData from '../../../../data/otb/footwear_taxonomy.json';
import categoryStructureRulesData from '../../../../data/otb/category_structure_rules.json';
import { resolveCategoryStructureRule, type CategoryStructureRuleRow } from '@/utils/otbRuleResolver';

// ─── 本地类型 ───────────────────────────────────────────────────

export interface LocalPriceBandRow {
    priceBandId: string;
    priceBandLabel: string;
    minPrice: number;
    maxPrice: number;
    role: string;
    targetSalesRatio: number;
    targetStyleRatio: number;
    targetSkuRatio: number;
    targetGrossMargin: number;
    targetMarkupRate: number;
    ruleSource?: string;
    isFallback?: boolean;
    isManualOverride?: boolean;
}

export interface LocalProductRoleRow {
    roleId: string;
    roleName: string;
    description: string;
    styleRatio: number;
    averageDepth: number;
    defaultDepthMultiplier: number;
    riskRule: string;
    isManualOverride?: boolean;
}

export interface LocalWaveRow {
    id: string;
    wave: string;
    launchDate: string;
    mainCategory: string;
    mainCategoryLabel: string;
    priceBandId: string;
    priceBandLabel: string;
    productRoleId: string;
    productRoleName: string;
    plannedStyleCount: number;
    averageDepth: number;
    deliveryRisk: string;
    // 波段元数据（从 WaveOTBInput 透传）
    season?: string;
    seasonLabel?: string;
    launchMonth?: number;
    waveRole?: string;
    priceBandFocus?: string[];
    productRoleFocus?: string[];
    waveOtbBudget?: number | null;
}

export interface LocalPricingRow {
    id: string;
    priceBandLabel: string;
    suggestedRetailPrice: number;
    financeRetailPrice: number;
    finalRetailPrice: number;
    actualCost: number;
    targetGrossMargin: number;
    targetMarkupRate: number;
    minPrice: number;
    maxPrice: number;
    priceBandId: string;
}

interface FootwearTaxonomyRow {
    categoryId: string;
    level1: string;
    level2: string;
    defaultSellThroughTarget?: number;
    defaultGrossMarginTarget?: number;
    defaultAverageDepth?: number;
}

export interface OTBPriceStructureOutput {
    priceBandRows: LocalPriceBandRow[];
    productRoleRows: LocalProductRoleRow[];
    waveRows: LocalWaveRow[];
    pricingRows: LocalPricingRow[];
    categoryDepthInputs: CategoryDepthInput[];
}

// ─── 诊断条 ─────────────────────────────────────────────────────

function DiagnosisBar({ diagnoses }: { diagnoses: StructureDiagnosis[] }) {
    const colorMap = {
        healthy: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        warning: 'bg-amber-50 border-amber-200 text-amber-700',
        danger:  'bg-rose-50 border-rose-200 text-rose-700',
    };
    const iconMap = { healthy: '✅', warning: '⚠️', danger: '🚨' };

    return (
        <div className="space-y-1.5">
            {diagnoses.map((d, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${colorMap[d.level]}`}>
                    <span>{iconMap[d.level]}</span>
                    <div>
                        <span className="font-semibold">{d.title}：</span>
                        <span>{d.message}</span>
                        {d.action && <span className="ml-1 opacity-70">→ {d.action}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── 毛利贡献迷你环形图 ───────────────────────────────────────────

const PB_DONUT_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#94a3b8'];

function GrossProfitDonut({
    contribs, bandLabels,
}: {
    contribs: { priceBandId: string; contribution: number }[];
    bandLabels: Record<string, string>;
}) {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    let cumOffset = 0;
    const total = contribs.reduce((s, c) => s + c.contribution, 0);
    if (total <= 0) {
        return (
            <div className="flex items-center justify-center w-[80px] h-[80px] text-[9px] text-slate-300">
                无数据
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center gap-0.5">
            <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
                <circle cx="40" cy="40" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                {contribs.map((c, i) => {
                    const len = (c.contribution / total) * circumference;
                    const dasharray = `${len} ${circumference - len}`;
                    const dashoffset = -cumOffset;
                    cumOffset += len;
                    return (
                        <circle
                            key={c.priceBandId}
                            cx="40" cy="40" r={radius}
                            fill="none"
                            stroke={PB_DONUT_COLORS[i % PB_DONUT_COLORS.length]}
                            strokeWidth="10"
                            strokeDasharray={dasharray}
                            strokeDashoffset={dashoffset}
                            transform="rotate(-90 40 40)"
                        >
                            <title>{bandLabels[c.priceBandId] ?? c.priceBandId}：{(c.contribution * 100).toFixed(1)}%</title>
                        </circle>
                    );
                })}
                <text x="40" y="44" textAnchor="middle" className="fill-slate-500" fontSize="9">毛利</text>
            </svg>
            <span className="text-[9px] text-slate-400">毛利贡献分布</span>
        </div>
    );
}

// ─── 价格带策略子视图 ────────────────────────────────────────────

function PriceBandStrategyView({
    rows,
    onRowChange,
    onNormalize,
    categorySalesTarget,
    currencyUnit,
    isLocked = false,
    rowRefs,
    flashKey,
}: {
    rows: LocalPriceBandRow[];
    onRowChange: (idx: number, field: keyof LocalPriceBandRow, value: number) => void;
    onNormalize: () => void;
    categorySalesTarget: number;
    currencyUnit: CurrencyUnit;
    isLocked?: boolean;
    rowRefs?: { current: Record<string, HTMLTableRowElement | null> };
    flashKey?: string | null;
}) {
    const diagnoses = useMemo(() => diagnosePriceBandStructure(rows), [rows]);
    const activeRows = useMemo(() => rows.filter(r => !isClearancePriceBand(r)), [rows]);
    const clearanceRows = useMemo(() => rows.filter(r => isClearancePriceBand(r)), [rows]);
    const { total: newProductTotal, isValid: salesOk } = useMemo(() => {
        const total = activeRows.reduce((s, r) => s + r.targetSalesRatio, 0);
        return { total, isValid: Math.abs(total - 1) < 0.001 };
    }, [activeRows]);
    const clearanceTotal = useMemo(
        () => clearanceRows.reduce((s, r) => s + r.targetSalesRatio, 0),
        [clearanceRows],
    );
    const gpContribs = useMemo(() => calcGrossProfitContributionByPriceBand(rows), [rows]);
    const gpContribMap = useMemo(() => Object.fromEntries(gpContribs.map(c => [c.priceBandId, c.contribution])), [gpContribs]);

    const renderRow = (row: LocalPriceBandRow, idx: number) => {
        const avgRetail = calcAverageRetailPrice(row.minPrice, row.maxPrice);
        const salesAmt = calcPriceBandSalesAmount(categorySalesTarget, row.targetSalesRatio);
        const ceilByMargin = calcCostCeilingByMargin(avgRetail, row.targetGrossMargin);
        const ceilByMarkup = calcCostCeilingByMarkup(avgRetail, row.targetMarkupRate);
        const costCeil = Math.min(ceilByMargin > 0 ? ceilByMargin : Infinity, ceilByMarkup > 0 ? ceilByMarkup : Infinity);
        const ceilLabel = ceilByMargin <= ceilByMarkup ? '毛利约束' : '倍率约束';
        // 新增：单款贡献度
        const styleFactor = calcStyleContributionFactor(row.targetSalesRatio, row.targetStyleRatio);
        const styleFactorLevel = classifyStyleContribution(styleFactor);
        const styleFactorColor = styleFactorLevel === 'healthy' ? 'text-emerald-600' : styleFactorLevel === 'danger' ? 'text-rose-600 font-semibold' : 'text-amber-600';
        // 新增：投产金额（成本口径）
        const prodAmt = calcPriceBandProductionAmount(salesAmt, 0.8, 0.85, row.targetMarkupRate);
        const avgCost = isFinite(costCeil) ? costCeil * 0.92 : 0;
        const prodPairs = avgCost > 0 ? Math.round(prodAmt / avgCost) : 0;
        // 毛利贡献占比
        const gpContrib = gpContribMap[row.priceBandId] ?? 0;
        const isFlashed = flashKey === `pb-${row.priceBandId}`;
        return (
            <tr
                key={row.priceBandId}
                ref={el => { if (rowRefs) rowRefs.current[row.priceBandId] = el; }}
                className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isFlashed ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}
            >
                <td className="py-2 px-2">
                    <span className="font-medium text-slate-800">{row.priceBandLabel}</span>
                    <div className="text-[10px] text-slate-400">{row.minPrice}–{row.maxPrice}元</div>
                    <div className="text-[10px] text-slate-400">{row.isManualOverride ? '手动覆盖' : row.ruleSource ?? '默认规则'}</div>
                </td>
                <td className="py-2 px-2 text-right">
                    <input type="number" min={0} max={100} step={0.5}
                        value={(row.targetSalesRatio * 100).toFixed(1)}
                        onChange={e => onRowChange(idx, 'targetSalesRatio', Number(e.target.value) / 100)}
                        disabled={isLocked}
                        className="w-16 text-right border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-sky-300 disabled:bg-slate-50"
                    />
                </td>
                <td className="py-2 px-2 text-right">
                    <input type="number" min={0} max={100} step={0.5}
                        value={(row.targetStyleRatio * 100).toFixed(1)}
                        onChange={e => onRowChange(idx, 'targetStyleRatio', Number(e.target.value) / 100)}
                        disabled={isLocked}
                        className="w-16 text-right border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-sky-300 disabled:bg-slate-50"
                    />
                </td>
                <td className={`py-2 px-2 text-right ${styleFactorColor}`}>
                    {row.targetStyleRatio > 0 ? styleFactor.toFixed(2) : '--'}
                </td>
                <td className="py-2 px-2 text-right">
                    <input type="number" min={0} max={100} step={0.5}
                        value={(row.targetGrossMargin * 100).toFixed(1)}
                        onChange={e => onRowChange(idx, 'targetGrossMargin', Number(e.target.value) / 100)}
                        disabled={isLocked}
                        className="w-16 text-right border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-sky-300 disabled:bg-slate-50"
                    />
                </td>
                <td className="py-2 px-2 text-right text-slate-700">{row.targetMarkupRate.toFixed(1)}x</td>
                <td className="py-2 px-2 text-right text-slate-700">{avgRetail.toFixed(0)}</td>
                <td className="py-2 px-2 text-right text-slate-700">{formatCurrency(salesAmt, currencyUnit)}</td>
                <td className="py-2 px-2 text-right">
                    <span className="text-slate-700">¥{isFinite(costCeil) ? costCeil.toFixed(0) : '--'}</span>
                    <div className="text-[10px] text-slate-400">{ceilLabel}</div>
                </td>
                <td className="py-2 px-2 text-right text-slate-700">{formatCurrency(prodAmt, currencyUnit)}</td>
                <td className="py-2 px-2 text-right text-slate-600">{prodPairs > 0 ? prodPairs.toLocaleString() : '--'}</td>
                <td className="py-2 px-2 text-right text-slate-600">{(gpContrib * 100).toFixed(1)}%</td>
            </tr>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-700">价格带目标结构</h4>
                    <p className="text-xs text-slate-400 mt-0.5">新品价格带合计应等于 100%；清仓承接单独管理，不计入新品合计</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <GrossProfitDonut
                        contribs={gpContribs.filter(c => activeRows.find(r => r.priceBandId === c.priceBandId))}
                        bandLabels={Object.fromEntries(activeRows.map(r => [r.priceBandId, r.priceBandLabel]))}
                    />
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${salesOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            新品合计 {(newProductTotal * 100).toFixed(1)}%
                        </span>
                        {clearanceTotal > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                清仓 {(clearanceTotal * 100).toFixed(1)}%（单独）
                            </span>
                        )}
                        <button disabled={isLocked} onClick={onNormalize}
                            className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50">
                            一键归一化
                        </button>
                    </div>
                </div>
            </div>

            {clearanceRows.length > 0 && clearanceTotal > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700">
                    ⚠️ <span>清仓承接不参与新品OTB，建议移入库存健康/清货预算，从新品OTB中移除。</span>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">价格带</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">销售占比%</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">款数占比%</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">单款贡献度</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">目标毛利%</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">目标倍率</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">均价(元)</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">目标销售额</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">成本上限</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">目标投产金额</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">目标投产双数</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">毛利贡献占比%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 新品价格带 */}
                        {activeRows.map(row => renderRow(row, rows.indexOf(row)))}
                        {/* 清仓承接（单独管理） */}
                        {clearanceRows.length > 0 && (
                            <>
                                <tr>
                                    <td colSpan={12} className="py-1 px-2 text-[10px] text-amber-600 bg-amber-50 border-t border-amber-100">
                                        ── 清仓承接（单独管理，不计入新品合计）──
                                    </td>
                                </tr>
                                {clearanceRows.map(row => renderRow(row, rows.indexOf(row)))}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            <DiagnosisBar diagnoses={diagnoses} />
        </div>
    );
}

// ─── 货品角色子视图 ──────────────────────────────────────────────

function ProductRoleView({
    rows,
    onRowChange,
    onNormalize,
    totalStyleCount,
    totalSalesTarget,
    avgRetailPrice,
    currencyUnit,
    isLocked = false,
    rowRefs,
    flashKey,
}: {
    rows: LocalProductRoleRow[];
    onRowChange: (idx: number, field: keyof LocalProductRoleRow, value: number) => void;
    onNormalize: () => void;
    totalStyleCount: number;
    totalSalesTarget: number;
    avgRetailPrice: number;
    currencyUnit: CurrencyUnit;
    isLocked?: boolean;
    rowRefs?: { current: Record<string, HTMLTableRowElement | null> };
    flashKey?: string | null;
}) {
    const diagInput = useMemo(() => rows.map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        styleRatio: r.styleRatio,
        averageDepth: r.averageDepth,
    })), [rows]);
    const diagnoses = useMemo(() => diagnoseProductRoleStructure(diagInput), [diagInput]);
    const total = rows.reduce((s, r) => s + r.styleRatio, 0);
    const isValid = Math.abs(total - 1) < 0.001;

    // 按销售贡献系数计算各角色预算（修正：不再用款数占比当销售占比）
    const roleBudgets = useMemo(
        () => calcRoleBudgetByContribution(rows, totalSalesTarget),
        [rows, totalSalesTarget],
    );
    const roleBudgetMap = useMemo(
        () => Object.fromEntries(roleBudgets.map(r => [r.roleId, r])),
        [roleBudgets],
    );

    const roleColors: Record<string, string> = {
        basic:  'bg-slate-100 text-slate-700',
        main:   'bg-sky-100 text-sky-700',
        hero:   'bg-amber-100 text-amber-700',
        image:  'bg-violet-100 text-violet-700',
        test:   'bg-rose-100 text-rose-700',
        repeat: 'bg-emerald-100 text-emerald-700',
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-semibold text-slate-700">货品角色结构</h4>
                    <p className="text-xs text-slate-400 mt-0.5">款数占比、均深配置影响整体库存结构与现金流</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        款数占比合计 {(total * 100).toFixed(1)}%
                    </span>
                    <button disabled={isLocked} onClick={onNormalize}
                        className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50">
                        一键归一化
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">货品角色</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">定位</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">款数占比%</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">销售贡献%</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">计划款数</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">均深(双)</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">角色预算</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">预计投产双</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">铺货建议</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const styleCount = calcRoleStyleCount(totalStyleCount, row.styleRatio);
                            const budgetInfo = roleBudgetMap[row.roleId];
                            const roleBudget = budgetInfo?.roleBudget ?? 0;
                            const salesContrib = budgetInfo?.salesContribution ?? 0;
                            const productionPairs = avgRetailPrice > 0
                                ? Math.round(roleBudget / (avgRetailPrice * 0.8))
                                : styleCount * 2 * row.averageDepth;
                            const replenish = calcReplenishStrategy(row.roleId, productionPairs);
                            const isFlashed = flashKey === `role-${row.roleId}`;
                            return (
                                <tr
                                    key={row.roleId}
                                    ref={el => { if (rowRefs) rowRefs.current[row.roleId] = el; }}
                                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isFlashed ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}
                                >
                                    <td className="py-2 px-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[row.roleId] || 'bg-slate-100 text-slate-700'}`}>
                                            {row.roleName}
                                        </span>
                                    </td>
                                    <td className="py-2 px-2 text-slate-500 max-w-[120px] truncate">{row.description}</td>
                                    <td className="py-2 px-2 text-right">
                                        <input type="number" min={0} max={100} step={0.5}
                                            value={(row.styleRatio * 100).toFixed(1)}
                                            onChange={e => onRowChange(idx, 'styleRatio', Number(e.target.value) / 100)}
                                            disabled={isLocked}
                                            className="w-16 text-right border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-sky-300 disabled:bg-slate-50"
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-600">{(salesContrib * 100).toFixed(1)}%</td>
                                    <td className="py-2 px-2 text-right text-slate-700 font-medium">{styleCount}</td>
                                    <td className="py-2 px-2 text-right">
                                        <input type="number" min={1} step={10}
                                            value={row.averageDepth}
                                            onChange={e => onRowChange(idx, 'averageDepth', Number(e.target.value))}
                                            disabled={isLocked}
                                            className="w-20 text-right border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-sky-300 disabled:bg-slate-50"
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-600">{formatCurrency(roleBudget, currencyUnit)}</td>
                                    <td className="py-2 px-2 text-right text-slate-600">{productionPairs.toLocaleString()}</td>
                                    <td className="py-2 px-2 text-slate-500 text-[11px]">{replenish}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <DiagnosisBar diagnoses={diagnoses} />
        </div>
    );
}

// ─── 结构策略视图（合并价格带策略 + 货品角色） ────────────────────

function StructureStrategyView({
    priceBandRows,
    onPriceBandRowChange,
    onPriceBandNormalize,
    productRoleRows,
    onProductRoleRowChange,
    onProductRoleNormalize,
    categorySalesTarget,
    totalStyleCount,
    avgRetailPrice,
    currencyUnit,
    isLocked = false,
    priceBandRefs,
    productRoleRefs,
    flashKey,
}: {
    priceBandRows: LocalPriceBandRow[];
    onPriceBandRowChange: (idx: number, field: keyof LocalPriceBandRow, value: number) => void;
    onPriceBandNormalize: () => void;
    productRoleRows: LocalProductRoleRow[];
    onProductRoleRowChange: (idx: number, field: keyof LocalProductRoleRow, value: number) => void;
    onProductRoleNormalize: () => void;
    categorySalesTarget: number;
    totalStyleCount: number;
    avgRetailPrice: number;
    currencyUnit: CurrencyUnit;
    isLocked?: boolean;
    priceBandRefs?: { current: Record<string, HTMLTableRowElement | null> };
    productRoleRefs?: { current: Record<string, HTMLTableRowElement | null> };
    flashKey?: string | null;
}) {
    return (
        <div className="space-y-8">
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-base font-bold text-sky-600">①</span>
                    <span className="text-sm font-semibold text-slate-700">新品价格带结构</span>
                </div>
                <PriceBandStrategyView
                    rows={priceBandRows}
                    onRowChange={onPriceBandRowChange}
                    onNormalize={onPriceBandNormalize}
                    categorySalesTarget={categorySalesTarget}
                    currencyUnit={currencyUnit}
                    isLocked={isLocked}
                    rowRefs={priceBandRefs}
                    flashKey={flashKey}
                />
            </div>
            <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-base font-bold text-sky-600">②</span>
                    <span className="text-sm font-semibold text-slate-700">货品角色结构</span>
                </div>
                <ProductRoleView
                    rows={productRoleRows}
                    onRowChange={onProductRoleRowChange}
                    onNormalize={onProductRoleNormalize}
                    totalStyleCount={totalStyleCount}
                    totalSalesTarget={categorySalesTarget}
                    avgRetailPrice={avgRetailPrice}
                    currencyUnit={currencyUnit}
                    isLocked={isLocked}
                    rowRefs={productRoleRefs}
                    flashKey={flashKey}
                />
            </div>
        </div>
    );
}

// ─── 品类矩阵视图 ─────────────────────────────────────────────────

// 差异化品类默认权重（按规模从大到小的品类顺序）
const DEFAULT_FALLBACK_WEIGHTS = [0.22, 0.20, 0.16, 0.12, 0.10, 0.08, 0.07, 0.05];

function CategoryPriceBandMatrixView({
    categorySalesTarget,
    priceBandRows,
    priceBandStrategyRows,
    businessContext,
    currencyUnit,
    isLocked = false,
}: {
    categorySalesTarget: number;
    priceBandRows: LocalPriceBandRow[];
    priceBandStrategyRows: PriceBandStrategyRow[];
    businessContext: OtbBusinessContext;
    currencyUnit: CurrencyUnit;
    isLocked?: boolean;
}) {
    const categories = useMemo(
        () => (footwearTaxonomyData as Array<{ categoryId: string; level2: string; seasonFit: string[] }>)
            .slice(0, 8),
        [],
    );

    // 只显示非清仓价格带
    const activePriceBandRows = useMemo(() => priceBandRows.filter(pb => !isClearancePriceBand(pb)), [priceBandRows]);

    // 手动单元格覆盖（key = `${categoryId}-${priceBandId}`），存储 0-1 权重
    const [cellOverrides, setCellOverrides] = useState<Record<string, number>>({});

    // 每个品类按规则解析各价格带权重（规则匹配 > fallback 差异化权重）
    const categoryPriceBandWeights = useMemo(() => {
        return categories.map((cat, catIdx) => {
            const resolved = resolveAllPriceBands(priceBandStrategyRows, {
                brandId: businessContext.brandId,
                channelId: businessContext.channelId,
                season: businessContext.season,
                categoryId: cat.categoryId,
            });
            const totalWeight = resolved.reduce((s, r) => s + r.targetSalesRatio, 0);
            const hasCategoryRule = resolved.length > 0 && !resolved[0].isFallback;
            return {
                categoryId: cat.categoryId,
                weights: resolved.length > 0
                    ? Object.fromEntries(resolved.map(r => [r.priceBandId, r.targetSalesRatio / (totalWeight || 1)]))
                    : Object.fromEntries(activePriceBandRows.map(pb => [pb.priceBandId, 1 / activePriceBandRows.length])),
                hasCategoryRule,
                fallbackWeight: DEFAULT_FALLBACK_WEIGHTS[catIdx] ?? (1 / categories.length),
            };
        });
    }, [categories, priceBandStrategyRows, businessContext, activePriceBandRows]);

    // 品类销售权重（从 category_structure_rules.json 解析 targetSalesRatio，fallback 差异化默认权重）
    const categorySalesWeights = useMemo(() => {
        const weights = categories.map((cat, catIdx) => {
            const rule = resolveCategoryStructureRule(
                categoryStructureRulesData as CategoryStructureRuleRow[],
                {
                    brandId: businessContext.brandId,
                    channelId: businessContext.channelId,
                    season: businessContext.season,
                    categoryLevel2: cat.categoryId,
                },
            );
            const fallback = DEFAULT_FALLBACK_WEIGHTS[catIdx] ?? (1 / categories.length);
            return { categoryId: cat.categoryId, weight: rule?.value?.targetSalesRatio ?? fallback };
        });
        const total = weights.reduce((s, w) => s + w.weight, 0);
        return weights.map(w => ({ ...w, weight: w.weight / (total || 1) }));
    }, [categories, businessContext]);

    // (getCellAmount removed - inline computation used in JSX below)

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">品类 × 价格带 目标销售额矩阵</h4>
            <p className="text-xs text-slate-400">各品类按规则独立分配价格带权重；清仓承接已移出矩阵。单元格可手动覆盖权重（%）。</p>

            {/* 3 摘要 mini 卡 */}
            {(() => {
                const catTotals = categories.map(cat => {
                    const sw = categorySalesWeights.find(c => c.categoryId === cat.categoryId)?.weight ?? 0;
                    return { label: cat.level2, total: categorySalesTarget * sw };
                });
                const maxCat = [...catTotals].sort((a, b) => b.total - a.total)[0];
                const pbTotals = activePriceBandRows.map(pb => {
                    const colTotal = categories.reduce((sum, cat) => {
                        const sw = categorySalesWeights.find(c => c.categoryId === cat.categoryId)?.weight ?? 0;
                        const overrideKey = `${cat.categoryId}-${pb.priceBandId}`;
                        const pbWeight = cellOverrides[overrideKey]
                            ?? categoryPriceBandWeights.find(c => c.categoryId === cat.categoryId)?.weights[pb.priceBandId] ?? 0;
                        return sum + categorySalesTarget * sw * pbWeight;
                    }, 0);
                    return { label: pb.priceBandLabel, total: colTotal };
                });
                const maxPb = [...pbTotals].sort((a, b) => b.total - a.total)[0];
                const matchedCount = categoryPriceBandWeights.filter(c => c.hasCategoryRule).length;
                return (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                            <div className="text-[10px] text-slate-400 mb-0.5">最大预算品类</div>
                            <div className="text-xs font-semibold text-slate-700">{maxCat?.label ?? '--'}</div>
                            <div className="text-[10px] text-slate-400">{formatCurrency(maxCat?.total ?? 0, currencyUnit)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                            <div className="text-[10px] text-slate-400 mb-0.5">最大价格带</div>
                            <div className="text-xs font-semibold text-slate-700">{maxPb?.label ?? '--'}</div>
                            <div className="text-[10px] text-slate-400">{formatCurrency(maxPb?.total ?? 0, currencyUnit)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                            <div className="text-[10px] text-slate-400 mb-0.5">规则匹配率</div>
                            <div className="text-xs font-semibold text-slate-700">{matchedCount}/{categories.length}</div>
                            <div className="text-[10px] text-slate-400">品类有独立规则</div>
                        </div>
                    </div>
                );
            })()}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">品类</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">规则</th>
                            {activePriceBandRows.map(pb => (
                                <th key={pb.priceBandId} className="text-right py-2 px-2 text-slate-500 font-medium">{pb.priceBandLabel}</th>
                            ))}
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">小计</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => {
                            const catMeta = categoryPriceBandWeights.find(c => c.categoryId === cat.categoryId);
                            const salesWeight = categorySalesWeights.find(c => c.categoryId === cat.categoryId)?.weight ?? (1 / categories.length);
                            const rowTotal = categorySalesTarget * salesWeight;
                            return (
                                <tr key={cat.categoryId} className={`border-b border-slate-50 hover:bg-slate-50 ${catMeta?.hasCategoryRule ? '' : 'bg-slate-50/40'}`}>
                                    <td className="py-2 px-2 text-slate-700 font-medium whitespace-nowrap">
                                        <span className={catMeta?.hasCategoryRule ? '' : 'text-slate-500'}>{cat.level2}</span>
                                    </td>
                                    <td className="py-2 px-2">
                                        {catMeta?.hasCategoryRule
                                            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">规则匹配</span>
                                            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">差异默认</span>
                                        }
                                    </td>
                                    {activePriceBandRows.map(pb => {
                                        const overrideKey = `${cat.categoryId}-${pb.priceBandId}`;
                                        const pbWeight = cellOverrides[overrideKey]
                                            ?? catMeta?.weights[pb.priceBandId] ?? 0;
                                        const amt = categorySalesTarget * salesWeight * pbWeight;
                                        const currentWeight = pbWeight * 100;
                                        return (
                                            <td key={pb.priceBandId} className="py-2 px-1 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-slate-700">{formatCurrency(amt, currencyUnit)}</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={parseFloat(currentWeight.toFixed(1))}
                                                        onChange={e => {
                                                            if (isLocked) return;
                                                            const newW = (parseFloat(e.target.value) || 0) / 100;
                                                            setCellOverrides(prev => ({ ...prev, [overrideKey]: newW }));
                                                        }}
                                                        disabled={isLocked}
                                                        className="w-14 text-right text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-sky-300"
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="py-2 px-2 text-right text-slate-700 font-semibold">
                                        {formatCurrency(rowTotal, currencyUnit)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-200">
                            <td className="py-2 px-2 font-semibold text-slate-700" colSpan={2}>合计</td>
                            {activePriceBandRows.map(pb => {
                                const colTotal = categories.reduce((sum, cat) => {
                                    const sw = categorySalesWeights.find(c => c.categoryId === cat.categoryId)?.weight ?? (1 / categories.length);
                                    const overrideKey = `${cat.categoryId}-${pb.priceBandId}`;
                                    const pbWeight = cellOverrides[overrideKey]
                                        ?? categoryPriceBandWeights.find(c => c.categoryId === cat.categoryId)?.weights[pb.priceBandId] ?? 0;
                                    return sum + categorySalesTarget * sw * pbWeight;
                                }, 0);
                                return (
                                    <td key={pb.priceBandId} className="py-2 px-2 text-right font-semibold text-slate-700">
                                        {formatCurrency(colTotal, currencyUnit)}
                                    </td>
                                );
                            })}
                            <td className="py-2 px-2 text-right font-bold text-sky-700">
                                {formatCurrency(categorySalesTarget, currencyUnit)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ─── 定价校验子视图 ──────────────────────────────────────────────

const ISSUE_LABEL: Record<string, string> = {
    healthy:             '健康 ✅',
    missing_price:       '缺少定价 ❌',
    price_out_of_band:   '价格带错位 ⚠️',
    cost_exceed:         '成本超限 🚨',
    markup_insufficient: '倍率不足 ⚠️',
    margin_insufficient: '毛利不足 ⚠️',
};

const ISSUE_COLOR: Record<string, string> = {
    healthy:             'text-emerald-600',
    missing_price:       'text-rose-700 font-bold',
    price_out_of_band:   'text-amber-600',
    cost_exceed:         'text-rose-600 font-semibold',
    markup_insufficient: 'text-amber-600',
    margin_insufficient: 'text-amber-600',
};

function PricingCheckView({
    rows, categoryDepthInputs, currencyUnit, showSkuLevel, onToggleSkuLevel,
}: {
    rows: LocalPricingRow[];
    categoryDepthInputs?: CategoryDepthInput[];
    currencyUnit: CurrencyUnit;
    showSkuLevel: boolean;
    onToggleSkuLevel: () => void;
}) {
    const skusByPriceBand = useMemo(() => {
        const map: Record<string, CategoryDepthInput[]> = {};
        (categoryDepthInputs ?? []).forEach(item => {
            const pbId = item.priceBandId ?? 'unknown';
            if (!map[pbId]) map[pbId] = [];
            map[pbId].push(item);
        });
        return map;
    }, [categoryDepthInputs]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-semibold text-slate-700">定价校验</h4>
                    <p className="text-xs text-slate-400">验证各价格带实际定价是否满足毛利、倍率和成本上限要求。</p>
                </div>
                <button
                    type="button"
                    onClick={onToggleSkuLevel}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        showSkuLevel ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    {showSkuLevel ? '收起 SKU 细分' : '展开 SKU 细分 ▸'}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">价格带</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">价格区间</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">最终售价</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">实际成本</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">成本上限</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">目标毛利%</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">实际毛利%</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">目标倍率</th>
                            <th className="text-right py-2 px-2 text-slate-500 font-medium">实际倍率</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">主要问题</th>
                            <th className="text-left py-2 px-2 text-slate-500 font-medium">建议动作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => {
                            const result = calcPricingCheck({
                                finalRetailPrice: row.finalRetailPrice,
                                actualCost: row.actualCost,
                                targetGrossMargin: row.targetGrossMargin,
                                targetMarkupRate: row.targetMarkupRate,
                                minPrice: row.minPrice,
                                maxPrice: row.maxPrice,
                                priceBandId: row.priceBandId,
                            });
                            const issueKey = result.primaryIssue;
                            const skus = skusByPriceBand[row.priceBandId] ?? [];
                            const skuOver = skus.filter(s => {
                                const ceil = result.costCeiling;
                                return ceil > 0 && (s.costPrice ?? 0) > ceil;
                            });
                            return (
                                <Fragment key={row.id}>
                                    <tr className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-2 px-2 font-medium text-slate-800">
                                            {row.priceBandLabel}
                                            {showSkuLevel && skus.length > 0 && (
                                                <div className={`text-[10px] ${skuOver.length > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                                                    {skus.length} 款 · {skuOver.length} 超成本
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2 px-2 text-right text-slate-500">{row.minPrice}–{row.maxPrice}</td>
                                        <td className="py-2 px-2 text-right text-slate-700 font-semibold">{row.finalRetailPrice > 0 ? row.finalRetailPrice : '--'}</td>
                                        <td className="py-2 px-2 text-right text-slate-600">{row.actualCost > 0 ? row.actualCost : '--'}</td>
                                        <td className="py-2 px-2 text-right text-slate-600">{result.costCeiling > 0 ? result.costCeiling.toFixed(0) : '--'}</td>
                                        <td className="py-2 px-2 text-right text-slate-500">{(row.targetGrossMargin * 100).toFixed(0)}%</td>
                                        <td className="py-2 px-2 text-right text-slate-700">{result.isMissingPrice ? '--' : `${(result.actualGrossMargin * 100).toFixed(1)}%`}</td>
                                        <td className="py-2 px-2 text-right text-slate-500">{row.targetMarkupRate > 0 ? `${row.targetMarkupRate.toFixed(1)}x` : '--'}</td>
                                        <td className="py-2 px-2 text-right text-slate-700">{result.isMissingPrice ? '--' : `${result.actualMarkupRate.toFixed(2)}x`}</td>
                                        <td className={`py-2 px-2 ${ISSUE_COLOR[issueKey] ?? 'text-slate-600'}`}>{ISSUE_LABEL[issueKey] ?? issueKey}</td>
                                        <td className="py-2 px-2 text-slate-500 text-[11px] max-w-[120px]">{result.suggestedAction || '--'}</td>
                                    </tr>
                                    {showSkuLevel && skus.map(sku => {
                                        const ceil = result.costCeiling;
                                        const over = ceil > 0 && (sku.costPrice ?? 0) > ceil;
                                        return (
                                            <tr key={sku.id} className={`border-b border-slate-50 ${over ? 'bg-rose-50/40' : 'bg-slate-50/30'}`}>
                                                <td className="py-1.5 px-2 pl-6 text-[11px] text-slate-500">
                                                    └ {sku.season} {sku.wave} · {sku.categoryLabel ?? sku.category}
                                                </td>
                                                <td className="py-1.5 px-2 text-right text-[11px] text-slate-400">--</td>
                                                <td className="py-1.5 px-2 text-right text-[11px] text-slate-600">{sku.retailPrice ? sku.retailPrice : '--'}</td>
                                                <td className={`py-1.5 px-2 text-right text-[11px] ${over ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>{sku.costPrice ? sku.costPrice : '--'}</td>
                                                <td className="py-1.5 px-2 text-right text-[11px] text-slate-400">{ceil > 0 ? ceil.toFixed(0) : '--'}</td>
                                                <td className="py-1.5 px-2 text-right text-[11px] text-slate-400">{((sku.grossMarginTarget ?? 0) * 100).toFixed(0)}%</td>
                                                <td colSpan={3} className="py-1.5 px-2"></td>
                                                <td className={`py-1.5 px-2 text-[10px] ${over ? 'text-rose-600' : 'text-emerald-600'}`}>{over ? '🚨 超成本上限' : '✓ 合规'}</td>
                                                <td className="py-1.5 px-2 text-[10px] text-slate-400">
                                                    {over ? `当前 ${sku.costPrice ?? 0} > 上限 ${ceil.toFixed(0)}，需压价 ${((sku.costPrice ?? 0) - ceil).toFixed(0)}元` : ''}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {showSkuLevel && (
                <p className="text-[10px] text-slate-400">
                    SKU 细分基于"输出到品类/款深"的 categoryDepthInputs，按 priceBandId 关联。当前共 {Object.values(skusByPriceBand).reduce((s, arr) => s + arr.length, 0)} 个 SKU。
                </p>
            )}
        </div>
    );
}

// ─── 主面板 ──────────────────────────────────────────────────────

interface OTBPriceStructurePanelProps {
    currencyUnit: CurrencyUnit;
    filters: DashboardFilters;
    businessContext: OtbBusinessContext;
    ssSeasonSalesTarget: number;
    awSeasonSalesTarget: number;
    waves: WaveOTBInput[];
    onStructureChange?: (output: OTBPriceStructureOutput) => void;
    isLocked?: boolean;
}

// 初始化价格带行（取跑步鞋作为默认品类）
function resolveCategoryForRules(context: OtbBusinessContext) {
    return context.categoryId && context.categoryId !== 'all' ? context.categoryId : 'running';
}

function initPriceBandRows(context?: OtbBusinessContext): LocalPriceBandRow[] {
    if (context) {
        const resolved = resolveAllPriceBands(priceBandStrategyData as PriceBandStrategyRow[], {
            brandId: context.brandId,
            channelId: context.channelId,
            season: context.season,
            categoryId: resolveCategoryForRules(context),
            priceBandId: context.priceBandId,
        });

        if (resolved.length > 0) {
            return resolved.map(row => ({
                priceBandId: row.priceBandId,
                priceBandLabel: row.priceBandLabel,
                minPrice: row.minPrice,
                maxPrice: row.maxPrice,
                role: row.role,
                targetSalesRatio: row.targetSalesRatio,
                targetStyleRatio: row.targetStyleRatio,
                targetSkuRatio: row.targetSkuRatio,
                targetGrossMargin: row.targetGrossMargin,
                targetMarkupRate: row.targetMarkupRate,
                ruleSource: row.ruleSource,
                isFallback: row.isFallback,
            }));
        }
    }

    const running = (priceBandStrategyData as LocalPriceBandRow[]).filter(
        r => (r as { categoryId?: string }).categoryId === 'running' &&
             (r as { channelId?: string }).channelId === 'all',
    );
    return running.length > 0 ? running : (priceBandStrategyData as LocalPriceBandRow[]).slice(0, 4);
}

// 初始化货品角色行
function initProductRoleRows(): LocalProductRoleRow[] {
    return (productRoleStrategyData as Array<{
        roleId: string;
        roleName: string;
        description: string;
        defaultStyleRatio: number;
        defaultDepthMultiplier: number;
        riskRule: string;
    }>).map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        description: r.description,
        styleRatio: r.defaultStyleRatio,
        averageDepth: calcRoleDepth(720, r.defaultDepthMultiplier),
        defaultDepthMultiplier: r.defaultDepthMultiplier,
        riskRule: r.riskRule,
    }));
}

// 初始化波段行
function initWaveRows(): LocalWaveRow[] {
    return (waveAssortmentData as Array<{
        id: string; wave: string; launchDate: string; mainCategory: string; mainCategoryLabel: string;
        priceBandId: string; priceBandLabel: string; productRoleId: string; productRoleName: string;
        plannedStyleCount: number; averageDepth: number; deliveryRisk: string;
        waveRole?: string; priceBandFocus?: string[]; productRoleFocus?: string[]; waveOtbBudget?: number | null;
    }>).map(r => ({
        id: r.id,
        wave: r.wave,
        launchDate: r.launchDate,
        mainCategory: r.mainCategory,
        mainCategoryLabel: r.mainCategoryLabel,
        priceBandId: r.priceBandId,
        priceBandLabel: r.priceBandLabel,
        productRoleId: r.productRoleId,
        productRoleName: r.productRoleName,
        plannedStyleCount: r.plannedStyleCount,
        averageDepth: r.averageDepth,
        deliveryRisk: r.deliveryRisk,
        waveRole: r.waveRole,
        priceBandFocus: r.priceBandFocus,
        productRoleFocus: r.productRoleFocus,
        waveOtbBudget: r.waveOtbBudget,
    }));
}

// 初始化定价校验行
function initPricingRows(priceBandRows: LocalPriceBandRow[]): LocalPricingRow[] {
    return priceBandRows.map(pb => {
        const avg = calcAverageRetailPrice(pb.minPrice, pb.maxPrice);
        const cost = calcCostCeilingByMargin(avg, pb.targetGrossMargin) * 0.92;
        return {
            id: pb.priceBandId,
            priceBandLabel: pb.priceBandLabel,
            suggestedRetailPrice: avg,
            financeRetailPrice: avg * 0.98,
            finalRetailPrice: avg,
            actualCost: Math.round(cost),
            targetGrossMargin: pb.targetGrossMargin,
            targetMarkupRate: pb.targetMarkupRate,
            minPrice: pb.minPrice,
            maxPrice: pb.maxPrice,
            priceBandId: pb.priceBandId,
        };
    });
}

function resolveWaveSeasonKey(wave: LocalWaveRow) {
    const season = wave.season?.toLowerCase();
    if (season === 'spring' || season === 'summer' || season === 'autumn' || season === 'winter') return season;

    const launchMonth = wave.launchMonth ?? (
        wave.launchDate ? new Date(wave.launchDate).getMonth() + 1 : null
    );
    if (launchMonth !== null && launchMonth >= 1 && launchMonth <= 3) return 'spring';
    if (launchMonth !== null && launchMonth >= 4 && launchMonth <= 6) return 'summer';
    if (launchMonth !== null && launchMonth >= 7 && launchMonth <= 9) return 'autumn';
    if (launchMonth !== null && launchMonth >= 10 && launchMonth <= 12) return 'winter';

    if (wave.id.startsWith('SS') || wave.id.startsWith('ws26-s') || wave.id.startsWith('ws26-su')) return 'summer';
    return 'winter';
}

function textMatches(a?: string, b?: string) {
    if (!a || !b) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function resolveCategoryLabelById(categoryId: string | undefined, fallback: string) {
    if (!categoryId) return fallback;
    return (footwearTaxonomyData as FootwearTaxonomyRow[]).find(category => category.categoryId === categoryId)?.level2 ?? fallback;
}

function findCategoryRule(
    rules: CategoryStructureRuleRow[],
    category: FootwearTaxonomyRow,
    season: string,
) {
    return rules.find(rule =>
        (rule.season === season || rule.season === 'all') &&
        (
            textMatches(rule.categoryLevel2, category.categoryId) ||
            textMatches(rule.categoryLevel2, category.level2) ||
            textMatches(rule.categoryLevel1, category.level1)
        )
    ) ?? resolveCategoryStructureRule(rules, {
        brandId: 'all',
        channelId: 'all',
        season,
        categoryLevel1: category.level1,
        categoryLevel2: category.level2,
    })?.value ?? null;
}

function buildWaveCategoryPool(wave: LocalWaveRow) {
    const season = resolveWaveSeasonKey(wave);
    const taxonomy = (footwearTaxonomyData as FootwearTaxonomyRow[]).slice(0, 8);
    const rules = categoryStructureRulesData as CategoryStructureRuleRow[];

    const candidates = taxonomy
        .map((category, index) => {
            const rule = findCategoryRule(rules, category, season);
            const fallbackWeight = DEFAULT_FALLBACK_WEIGHTS[index] ?? (1 / Math.max(1, taxonomy.length));
            const isMainCategory = category.categoryId === wave.mainCategory || category.level2 === wave.mainCategoryLabel;
            return {
                categoryId: category.categoryId,
                categoryLabel: isMainCategory ? wave.mainCategoryLabel : category.level2,
                targetSalesRatio: rule?.targetSalesRatio ?? fallbackWeight,
                targetStyleRatio: rule?.targetStyleRatio ?? fallbackWeight,
                sellThroughTarget: rule?.defaultSellThroughTarget ?? category.defaultSellThroughTarget ?? 0.8,
                grossMarginTarget: rule?.defaultGrossMarginTarget ?? category.defaultGrossMarginTarget,
                averageDepth: category.defaultAverageDepth,
                hasSeasonRule: Boolean(rule),
                isMainCategory,
            };
        })
        .filter(category => category.hasSeasonRule || category.isMainCategory);

    if (!candidates.some(category => category.isMainCategory)) {
        candidates.push({
            categoryId: wave.mainCategory,
            categoryLabel: wave.mainCategoryLabel,
            targetSalesRatio: 0.2,
            targetStyleRatio: 0.2,
            sellThroughTarget: 0.8,
            grossMarginTarget: undefined,
            averageDepth: wave.averageDepth,
            hasSeasonRule: false,
            isMainCategory: true,
        });
    }

    const totalSalesWeight = candidates.reduce((sum, category) => sum + category.targetSalesRatio, 0) || 1;
    const totalStyleWeight = candidates.reduce((sum, category) => sum + category.targetStyleRatio, 0) || 1;

    return candidates.map(category => ({
        ...category,
        salesWeight: category.targetSalesRatio / totalSalesWeight,
        styleWeight: category.targetStyleRatio / totalStyleWeight,
    }));
}

function focusMatches(focusValues: string[] | undefined, ...values: Array<string | undefined>) {
    if (!focusValues?.length) return false;
    const normalizedValues = values.filter(Boolean).map(value => String(value).trim().toLowerCase());
    return focusValues.some(focus => normalizedValues.includes(String(focus).trim().toLowerCase()));
}

function buildCategoryDepthInputs(
    priceBandRows: LocalPriceBandRow[],
    productRoleRows: LocalProductRoleRow[],
    waveRows: LocalWaveRow[],
): CategoryDepthInput[] {
    return waveRows.flatMap(wave => {
        const categoryPool = buildWaveCategoryPool(wave);
        const activePriceBands = priceBandRows.filter(priceBand => !isClearancePriceBand(priceBand));
        const focusedPriceBands = activePriceBands.filter(priceBand =>
            focusMatches(wave.priceBandFocus, priceBand.priceBandId, priceBand.priceBandLabel, priceBand.role)
        );
        const wavePriceBands = focusedPriceBands.length > 0 ? focusedPriceBands : activePriceBands;
        const focusedRoles = productRoleRows.filter(role =>
            focusMatches(wave.productRoleFocus, role.roleId, role.roleName)
        );
        const waveRoles = focusedRoles.length > 0 ? focusedRoles : productRoleRows;
        const priceBandStyleTotal = wavePriceBands.reduce((sum, priceBand) => sum + priceBand.targetStyleRatio, 0) || 1;
        const priceBandSalesTotal = wavePriceBands.reduce((sum, priceBand) => sum + priceBand.targetSalesRatio, 0) || 1;
        const roleStyleTotal = waveRoles.reduce((sum, role) => sum + role.styleRatio, 0) || 1;
        const targetStyleTotal = Math.max(1, Math.round(wave.plannedStyleCount));

        const candidates = categoryPool.flatMap(category => (
            wavePriceBands.flatMap(priceBand => (
                waveRoles.map(role => {
                    const styleWeight =
                        category.styleWeight *
                        (priceBand.targetStyleRatio / priceBandStyleTotal) *
                        (role.styleRatio / roleStyleTotal);
                    return { category, priceBand, role, styleWeight };
                })
            ))
        ));
        const totalCandidateWeight = candidates.reduce((sum, candidate) => sum + candidate.styleWeight, 0) || 1;
        const allocatedCandidates = candidates.map(candidate => {
            const rawStyles = targetStyleTotal * candidate.styleWeight / totalCandidateWeight;
            return {
                ...candidate,
                rawStyles,
                plannedStyleCount: Math.floor(rawStyles),
                remainder: rawStyles - Math.floor(rawStyles),
            };
        });
        let allocatedStyles = allocatedCandidates.reduce((sum, candidate) => sum + candidate.plannedStyleCount, 0);
        [...allocatedCandidates]
            .sort((a, b) => b.remainder - a.remainder || b.rawStyles - a.rawStyles)
            .slice(0, Math.max(0, targetStyleTotal - allocatedStyles))
            .forEach(candidate => {
                candidate.plannedStyleCount += 1;
                allocatedStyles += 1;
            });

        return allocatedCandidates
            .filter(candidate => candidate.plannedStyleCount > 0)
            .map(({ category, priceBand, role, plannedStyleCount }) => {
                const retailPrice = Math.max(1, calcAverageRetailPrice(priceBand.minPrice, priceBand.maxPrice));
                const grossMarginTarget = category.grossMarginTarget ?? priceBand.targetGrossMargin;
                const costCeiling = calcFinalCostCeiling(retailPrice, grossMarginTarget, priceBand.targetMarkupRate);
                const costPrice = Math.round(costCeiling * 0.92);
                const priceBandSalesRatio = priceBand.targetSalesRatio / priceBandSalesTotal;
                const roleSalesRatio = role.styleRatio / roleStyleTotal;
                const priceBandStyleCount = Math.max(
                    plannedStyleCount,
                    Math.round(targetStyleTotal * category.styleWeight * (priceBand.targetStyleRatio / priceBandStyleTotal)),
                );
                const derivedSeason = wave.season
                    ?? (wave.id.startsWith('SS') || wave.id.startsWith('ws26-s') || wave.id.startsWith('ws26-su') ? 'SS' : 'AW');
                return {
                    id: `${wave.id}-${category.categoryId}-${priceBand.priceBandId}-${role.roleId}`,
                    season: derivedSeason,
                    wave: wave.wave,
                    category: category.categoryId,
                    categoryLabel: category.categoryLabel,
                    priceBandId: priceBand.priceBandId,
                    priceBandLabel: priceBand.priceBandLabel,
                    priceBandRole: priceBand.priceBandLabel,
                    priceBandSalesRatio,
                    priceBandStyleCount,
                    productRoleId: role.roleId,
                    productRoleName: role.roleName,
                    productRoleSalesRatio: roleSalesRatio,
                    roleDepthMultiplier: role.defaultDepthMultiplier,
                    costCeiling,
                    targetMarkupRate: priceBand.targetMarkupRate,
                    grossMarginTarget,
                    isHeroProduct: role.roleId === 'hero',
                    isTestProduct: role.roleId === 'test',
                    isCarryoverProduct: role.roleId === 'repeat',
                    ruleSource: category.hasSeasonRule ? '品类规则' : priceBand.ruleSource,
                    categorySalesRatio: category.salesWeight,
                    retailPrice,
                    costPrice,
                    sellThroughTarget: category.sellThroughTarget,
                    plannedStyleCount,
                    plannedColorCount: 2,
                    // 波段生命周期透传字段
                    waveId: wave.id,
                    seasonLabel: wave.seasonLabel,
                    launchDate: wave.launchDate,
                    launchMonth: wave.launchMonth,
                    waveRole: wave.waveRole,
                    mainCategoryLabel: wave.mainCategoryLabel,
                    priceBandFocus: wave.priceBandFocus,
                    productRoleFocus: wave.productRoleFocus,
                    waveOtbBudget: wave.waveOtbBudget,
                };
            });
    });
}

// ─── 外部可调用的初始化函数 ──────────────────────────────────────

export function createOTBPriceStructureOutput(
    context: OtbBusinessContext,
    waves: WaveOTBInput[],
): OTBPriceStructureOutput {
    const priceBandRows = initPriceBandRows(context);
    const productRoleRows = initProductRoleRows();
    const templates = initWaveRows();
    const waveRows: LocalWaveRow[] = waves.map((wave, index) => {
        const template = templates[index % Math.max(1, templates.length)];
        return {
            ...template,
            id: wave.id,
            wave: wave.wave,
            launchDate: wave.launchDate,
            plannedStyleCount: wave.plannedStyleCount ?? template.plannedStyleCount,
            averageDepth: wave.averageDepth ?? template.averageDepth,
            season: wave.season,
            seasonLabel: wave.seasonLabel,
            launchMonth: wave.launchMonth,
            waveRole: wave.waveRole ?? template.waveRole,
            mainCategory: wave.mainCategory ?? template.mainCategory,
            mainCategoryLabel: resolveCategoryLabelById(wave.mainCategory, template.mainCategoryLabel),
            priceBandFocus: wave.priceBandFocus ?? template.priceBandFocus,
            productRoleFocus: wave.productRoleFocus ?? template.productRoleFocus,
            waveOtbBudget: wave.planOtbBudget ?? template.waveOtbBudget,
        };
    });
    const pricingRows = initPricingRows(priceBandRows);
    const categoryDepthInputs = buildCategoryDepthInputs(priceBandRows, productRoleRows, waveRows);
    return { priceBandRows, productRoleRows, waveRows, pricingRows, categoryDepthInputs };
}

export default function OTBPriceStructurePanel({
    currencyUnit,
    filters,
    businessContext,
    ssSeasonSalesTarget,
    awSeasonSalesTarget,
    waves,
    onStructureChange,
    isLocked = false,
}: OTBPriceStructurePanelProps) {
    // 渠道维度 toggle：null = 沿用 businessContext.channelId（即"全渠道"或上游筛选）
    const [channelOverride, setChannelOverride] = useState<string | null>(null);
    const effectiveContext = useMemo<OtbBusinessContext>(() => (
        channelOverride ? { ...businessContext, channelId: channelOverride } : businessContext
    ), [businessContext, channelOverride]);
    const resolvedInitialPriceBands = useMemo(() => initPriceBandRows(effectiveContext), [effectiveContext]);
    const [priceBandRowsOverride, setPriceBandRowsOverride] = useState<LocalPriceBandRow[] | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [showSkuDrilldown, setShowSkuDrilldown] = useState(false);
    const [sensitivityOpen, setSensitivityOpen] = useState(false);
    const [marginDelta, setMarginDelta] = useState(0);   // -0.05 ~ +0.05
    const priceBandRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
    const productRoleRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
    const [flashKey, setFlashKey] = useState<string | null>(null);
    // 切换渠道时重置 priceBand override（避免上次手动调整跨渠道污染）
    useEffect(() => { setPriceBandRowsOverride(null); }, [channelOverride]);
    const priceBandRows = priceBandRowsOverride ?? resolvedInitialPriceBands;
    const [productRoleRows, setProductRoleRows] = useState<LocalProductRoleRow[]>(initProductRoleRows);
    const waveRows = useMemo<LocalWaveRow[]>(() => {
        const templates = initWaveRows();
        return waves.map((wave, index) => {
            const template = templates[index % Math.max(1, templates.length)];
            return {
                ...template,
                id: wave.id,
                wave: wave.wave,
                launchDate: wave.launchDate,
                plannedStyleCount: wave.plannedStyleCount ?? template.plannedStyleCount,
                averageDepth: wave.averageDepth ?? template.averageDepth,
                season: wave.season,
                seasonLabel: wave.seasonLabel,
                launchMonth: wave.launchMonth,
                waveRole: wave.waveRole ?? template.waveRole,
                mainCategory: wave.mainCategory ?? template.mainCategory,
                mainCategoryLabel: resolveCategoryLabelById(wave.mainCategory, template.mainCategoryLabel),
                priceBandFocus: wave.priceBandFocus ?? template.priceBandFocus,
                productRoleFocus: wave.productRoleFocus ?? template.productRoleFocus,
                waveOtbBudget: wave.planOtbBudget ?? template.waveOtbBudget,
            };
        });
    }, [waves]);
    const pricingRows = useMemo(() => initPricingRows(priceBandRows), [priceBandRows]);

    const totalSalesTarget = ssSeasonSalesTarget + awSeasonSalesTarget;
    const totalStyleCount = waves.reduce((sum, wave) => sum + (wave.plannedStyleCount ?? 0), 0) || 60;

    const categoryDepthInputs = useMemo(
        () => buildCategoryDepthInputs(priceBandRows, productRoleRows, waveRows),
        [priceBandRows, productRoleRows, waveRows],
    );

    useEffect(() => {
        onStructureChange?.({
            priceBandRows,
            productRoleRows,
            waveRows,
            pricingRows,
            categoryDepthInputs,
        });
    }, [categoryDepthInputs, onStructureChange, priceBandRows, pricingRows, productRoleRows, waveRows]);

    // 价格带编辑
    const handlePriceBandRowChange = useCallback((idx: number, field: keyof LocalPriceBandRow, value: number) => {
        if (isLocked) return;
        setPriceBandRowsOverride(prev => (prev ?? resolvedInitialPriceBands).map((r, i) =>
            i === idx ? { ...r, [field]: value, isManualOverride: true } : r,
        ));
    }, [isLocked, resolvedInitialPriceBands]);

    const handlePriceBandNormalize = useCallback(() => {
        if (isLocked) return;
        setPriceBandRowsOverride(prev =>
            normalizeActivePriceBands(prev ?? resolvedInitialPriceBands, 'targetSalesRatio') as LocalPriceBandRow[]
        );
    }, [isLocked, resolvedInitialPriceBands]);

    // 货品角色编辑
    const handleProductRoleRowChange = useCallback((idx: number, field: keyof LocalProductRoleRow, value: number) => {
        if (isLocked) return;
        setProductRoleRows(prev => prev.map((r, i) =>
            i === idx ? { ...r, [field]: value, isManualOverride: true } : r,
        ));
    }, [isLocked]);

    const handleProductRoleNormalize = useCallback(() => {
        if (isLocked) return;
        setProductRoleRows(prev => normalizeRatio(prev, 'styleRatio') as LocalProductRoleRow[]);
    }, [isLocked]);

    // 季节筛选标签
    const handleResetDefaults = useCallback(() => {
        if (isLocked) return;
        setPriceBandRowsOverride(null);
        setProductRoleRows(initProductRoleRows());
    }, [isLocked]);

    const handleImportSuggestion = useCallback(() => {
        if (isLocked) return;
        setPriceBandRowsOverride(prev => normalizeActivePriceBands(prev ?? resolvedInitialPriceBands, 'targetSalesRatio').map(row => ({ ...row, isManualOverride: true })) as LocalPriceBandRow[]);
        setProductRoleRows(prev => normalizeRatio(prev, 'styleRatio').map(row => ({ ...row, isManualOverride: true })) as LocalProductRoleRow[]);
    }, [isLocked, resolvedInitialPriceBands]);

    const handleExportCsv = useCallback(() => {
        const lines = [
            'section,id,label,ratio,margin,markup,source',
            ...priceBandRows.map(row => [
                'priceBand',
                row.priceBandId,
                row.priceBandLabel,
                row.targetSalesRatio,
                row.targetGrossMargin,
                row.targetMarkupRate,
                row.ruleSource ?? '',
            ].join(',')),
            ...productRoleRows.map(row => [
                'productRole',
                row.roleId,
                row.roleName,
                row.styleRatio,
                '',
                '',
                row.isManualOverride ? 'manual override' : 'default',
            ].join(',')),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'otb-price-structure.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, [priceBandRows, productRoleRows]);

    const seasonLabel = filters.season === 'all' ? '全季节' : String(filters.season);

    // 顶部摘要计算
    const pbDiagnoses = useMemo(() => diagnosePriceBandStructure(priceBandRows), [priceBandRows]);
    const roleDiagInput = useMemo(() => productRoleRows.map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        styleRatio: r.styleRatio,
        averageDepth: r.averageDepth,
    })), [productRoleRows]);
    const roleDiagnoses = useMemo(() => diagnoseProductRoleStructure(roleDiagInput), [roleDiagInput]);
    const pbHealthy = pbDiagnoses.every(d => d.level === 'healthy');
    const roleHealthy = roleDiagnoses.every(d => d.level === 'healthy');
    const riskCount = [...pbDiagnoses, ...roleDiagnoses].filter(d => d.level === 'danger').length;
    const overrideCount = priceBandRows.filter(r => r.isManualOverride).length + productRoleRows.filter(r => r.isManualOverride).length;

    const avgRetailPrice = useMemo(() => {
        const activeRows = priceBandRows.filter(r => !isClearancePriceBand(r));
        if (activeRows.length === 0) return 500;
        const totalWeight = activeRows.reduce((s, r) => s + r.targetSalesRatio, 0);
        return activeRows.reduce((s, r) => {
            return s + calcAverageRetailPrice(r.minPrice, r.maxPrice) * (r.targetSalesRatio / (totalWeight || 1));
        }, 0);
    }, [priceBandRows]);

    const weightedKPIs = useMemo(() => ({
        avgPrice: calcWeightedAveragePrice(priceBandRows),
        avgCost: calcWeightedAverageCost(priceBandRows),
        grossMargin: calcWeightedGrossMargin(priceBandRows),
        markupRate: calcWeightedMarkupRate(priceBandRows),
    }), [priceBandRows]);

    const conclusionBar = useMemo(() => {
        const allDiags = [...pbDiagnoses, ...roleDiagnoses];
        const dangerCount = allDiags.filter(d => d.level === 'danger').length;
        const warnCount = allDiags.filter(d => d.level === 'warning').length;
        if (dangerCount === 0 && warnCount === 0) {
            return { level: 'healthy', text: '当前价格带和货品角色结构均健康，可进入品类矩阵分配阶段。' };
        }
        const primaryDangers = allDiags.filter(d => d.level === 'danger').map(d => d.title).join('、');
        const parts: string[] = [];
        if (dangerCount > 0) parts.push(`${dangerCount} 项结构异常`);
        if (warnCount > 0) parts.push(`${warnCount} 项风险提示`);
        return {
            level: dangerCount > 0 ? 'danger' : 'warning',
            text: `当前结构存在 ${parts.join('、')}（${primaryDangers}），建议先处理异常后再进行品类矩阵分配。`,
        };
    }, [pbDiagnoses, roleDiagnoses]);

    const outputStats = useMemo(() => {
        const totalStyles = totalStyleCount;
        const totalSku = productRoleRows.reduce((s, r) => s + calcRoleStyleCount(totalStyleCount, r.styleRatio) * 2, 0);
        const weightedDepth = Math.round(productRoleRows.reduce((s, r) => s + r.averageDepth * r.styleRatio, 0));
        const productionPairs = productRoleRows.reduce((s, r) => s + calcRoleStyleCount(totalStyleCount, r.styleRatio) * 2 * r.averageDepth, 0);
        const activeRows = priceBandRows.filter(r => !isClearancePriceBand(r));
        const totalPbWeight = activeRows.reduce((s, r) => s + r.targetSalesRatio, 0);
        const avgCostPrice = activeRows.reduce((s, r) => {
            const ceiling = calcFinalCostCeiling(calcAverageRetailPrice(r.minPrice, r.maxPrice), r.targetGrossMargin, r.targetMarkupRate);
            return s + ceiling * 0.92 * (r.targetSalesRatio / (totalPbWeight || 1));
        }, 0);
        const wgm = calcWeightedGrossMargin(priceBandRows);
        const wmr = calcWeightedMarkupRate(priceBandRows);
        // 加权售罄目标：从 category rules 简化处理，取 productRoleRows 加权
        const weightedSellThrough = 0.8; // 简化：使用默认值
        return {
            totalStyles,
            totalSku,
            weightedDepth,
            productionPairs,
            productionAmt: Math.round(productionPairs * avgCostPrice),
            riskCount,
            weightedGrossMargin: wgm,
            weightedMarkupRate: wmr,
            weightedSellThrough,
        };
    }, [totalStyleCount, productRoleRows, priceBandRows, riskCount]);

    const CHANNEL_OPTIONS: { key: string | null; label: string }[] = [
        { key: null,            label: '全渠道' },
        { key: 'direct-store',  label: '直营' },
        { key: 'ecommerce',     label: '电商' },
        { key: 'livestream',    label: '直播' },
        { key: 'outlet',        label: '奥莱' },
    ];

    const handleJumpToFirstAnomaly = useCallback(() => {
        const dangerPb = pbDiagnoses.find(d => d.level === 'danger');
        const dangerRole = roleDiagnoses.find(d => d.level === 'danger');
        const target = dangerPb
            ? { kind: 'pb' as const, key: priceBandRows.find(r => dangerPb.title.includes(r.priceBandLabel) || dangerPb.message.includes(r.priceBandLabel))?.priceBandId ?? priceBandRows[0]?.priceBandId }
            : dangerRole
            ? { kind: 'role' as const, key: productRoleRows.find(r => dangerRole.title.includes(r.roleName) || dangerRole.message.includes(r.roleName))?.roleId ?? productRoleRows[0]?.roleId }
            : null;
        if (!target || !target.key) return;
        const ref = target.kind === 'pb' ? priceBandRefs.current[target.key] : productRoleRefs.current[target.key];
        ref?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const flashId = `${target.kind}-${target.key}`;
        setFlashKey(flashId);
        setTimeout(() => setFlashKey(null), 1800);
    }, [pbDiagnoses, roleDiagnoses, priceBandRows, productRoleRows]);

    return (
        <div className="space-y-4">
            {/* 面板标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">价格&结构规划</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {seasonLabel} · SS目标 {formatCurrency(ssSeasonSalesTarget, currencyUnit)} / AW目标 {formatCurrency(awSeasonSalesTarget, currencyUnit)}
                        {overrideCount > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">手动覆盖 {overrideCount} 项</span>
                        )}
                    </p>
                    {/* 渠道维度 toggle */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 mr-0.5">渠道：</span>
                        {CHANNEL_OPTIONS.map(opt => {
                            const active = channelOverride === opt.key;
                            return (
                                <button
                                    key={opt.key ?? 'all'}
                                    type="button"
                                    onClick={() => setChannelOverride(opt.key)}
                                    className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                                        active ? 'bg-sky-500 text-white border-sky-500'
                                               : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <button
                        disabled={isLocked}
                        onClick={handleImportSuggestion}
                        className="px-2.5 py-1 rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        导入建议
                    </button>
                    <button
                        disabled={isLocked}
                        onClick={handleResetDefaults}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        恢复默认
                    </button>
                    <button onClick={handleExportCsv} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600">
                        导出CSV
                    </button>
                    <span>总目标 <span className="font-semibold text-slate-700">{formatCurrency(totalSalesTarget, currencyUnit)}</span></span>
                    <button
                        onClick={() => setHelpOpen(prev => !prev)}
                        className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-[11px] font-bold"
                        title="计算公式说明"
                    >
                        ?
                    </button>
                </div>
            </div>

            {/* 帮助浮层 */}
            {helpOpen && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800 space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sky-700">计算公式说明</span>
                        <button onClick={() => setHelpOpen(false)} className="text-sky-400 hover:text-sky-600 text-sm leading-none">×</button>
                    </div>
                    <div>• <strong>加权平均售价</strong> = Σ(价格带均价 × 销售占比)</div>
                    <div>• <strong>加权毛利率</strong> = Σ(毛利率 × 销售占比)</div>
                    <div>• <strong>单款贡献度</strong> = 销售占比 ÷ 款数占比</div>
                    <div>• <strong>角色预算</strong> = 销售贡献占比 × 总目标</div>
                    <div>• <strong>销售贡献占比</strong> = 款数占比 × 角色经验系数</div>
                    <div>• <strong>投产金额（成本口径）</strong> = 销售目标 × 售罄率 ÷ 折扣 ÷ 倍率</div>
                    <div>• <strong>成本上限</strong> = min(毛利约束, 倍率约束)</div>
                    <div>• <strong>毛利贡献占比</strong> = 销售占比 × 毛利率（归一化）</div>
                </div>
            )}

            {/* 顶部摘要区：7 KPI 卡 */}
            <div className="grid grid-cols-4 gap-2 xl:grid-cols-7">
                <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="text-[10px] text-slate-400 mb-1">总目标</div>
                    <div className="text-xs font-semibold text-sky-700">{formatCurrency(totalSalesTarget, currencyUnit)}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="text-[10px] text-slate-400 mb-1">加权售价</div>
                    <div className="text-xs font-semibold text-slate-700">¥{weightedKPIs.avgPrice.toFixed(0)}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="text-[10px] text-slate-400 mb-1">加权成本</div>
                    <div className="text-xs font-semibold text-slate-700">¥{weightedKPIs.avgCost.toFixed(0)}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="text-[10px] text-slate-400 mb-1">加权毛利率</div>
                    <div className="text-xs font-semibold text-slate-700">{(weightedKPIs.grossMargin * 100).toFixed(1)}%</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="text-[10px] text-slate-400 mb-1">加权倍率</div>
                    <div className="text-xs font-semibold text-slate-700">{weightedKPIs.markupRate.toFixed(2)}x</div>
                </div>
                <div className={`rounded-xl border p-3 shadow-sm ${pbHealthy && roleHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    <div className={`text-[10px] mb-1 ${pbHealthy && roleHealthy ? 'text-emerald-500' : 'text-rose-500'}`}>结构状态</div>
                    <div className={`text-xs font-semibold ${pbHealthy && roleHealthy ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {pbHealthy && roleHealthy ? '健康' : `${pbDiagnoses.filter(d => d.level === 'danger').length + roleDiagnoses.filter(d => d.level === 'danger').length} 项异常`}
                    </div>
                </div>
                <div className={`rounded-xl border p-3 shadow-sm ${riskCount === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    <div className={`text-[10px] mb-1 ${riskCount === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>风险数</div>
                    <div className={`text-xs font-semibold ${riskCount === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {riskCount === 0 ? '无' : `${riskCount} 项`}
                    </div>
                </div>
            </div>

            {/* 结构结论条 */}
            <div className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-3 ${
                conclusionBar.level === 'healthy' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                conclusionBar.level === 'danger'  ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                                    'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
                <span className="flex-1">{conclusionBar.text}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                    {conclusionBar.level !== 'healthy' && (
                        <button
                            type="button"
                            onClick={handleJumpToFirstAnomaly}
                            className="px-2 py-0.5 rounded bg-white/80 border border-current opacity-80 hover:opacity-100 text-[10px]"
                        >
                            ↓ 跳转到异常项
                        </button>
                    )}
                    <button
                        disabled={isLocked}
                        onClick={handlePriceBandNormalize}
                        className="px-2 py-0.5 rounded bg-white/70 border border-current opacity-70 hover:opacity-100 disabled:cursor-not-allowed text-[10px]"
                    >
                        一键归一化
                    </button>
                </div>
            </div>

            {/* 连续工作流内容 */}
            <div className="space-y-4">
                <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <StructureStrategyView
                        priceBandRows={priceBandRows}
                        onPriceBandRowChange={handlePriceBandRowChange}
                        onPriceBandNormalize={handlePriceBandNormalize}
                        productRoleRows={productRoleRows}
                        onProductRoleRowChange={handleProductRoleRowChange}
                        onProductRoleNormalize={handleProductRoleNormalize}
                        categorySalesTarget={totalSalesTarget}
                        totalStyleCount={totalStyleCount}
                        currencyUnit={currencyUnit}
                        isLocked={isLocked}
                        avgRetailPrice={avgRetailPrice}
                        priceBandRefs={priceBandRefs}
                        productRoleRefs={productRoleRefs}
                        flashKey={flashKey}
                    />
                </section>

                <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-base font-bold text-sky-600">③</span>
                        <span className="text-sm font-semibold text-slate-700">品类矩阵分配</span>
                    </div>
                    <CategoryPriceBandMatrixView
                        categorySalesTarget={totalSalesTarget}
                        priceBandRows={priceBandRows}
                        priceBandStrategyRows={priceBandStrategyData as PriceBandStrategyRow[]}
                        businessContext={businessContext}
                        currencyUnit={currencyUnit}
                        isLocked={isLocked}
                    />
                </section>

                <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-base font-bold text-sky-600">④</span>
                        <span className="text-sm font-semibold text-slate-700">定价校验</span>
                    </div>
                    <PricingCheckView
                        rows={pricingRows}
                        categoryDepthInputs={categoryDepthInputs}
                        currencyUnit={currencyUnit}
                        showSkuLevel={showSkuDrilldown}
                        onToggleSkuLevel={() => setShowSkuDrilldown(prev => !prev)}
                    />
                </section>

                <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-base font-bold text-sky-600">⑤</span>
                        <span className="text-sm font-semibold text-slate-700">输出到品类/款深</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 xl:grid-cols-9">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">计划总款数</div>
                            <div className="text-sm font-bold text-slate-700">{outputStats.totalStyles} 款</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">计划总SKU</div>
                            <div className="text-sm font-bold text-slate-700">{outputStats.totalSku} 个</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">加权均深</div>
                            <div className="text-sm font-bold text-slate-700">{outputStats.weightedDepth} 双</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">预计投产双数</div>
                            <div className="text-sm font-bold text-slate-700">{outputStats.productionPairs.toLocaleString()} 双</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">预计投产金额</div>
                            <div className="text-sm font-bold text-slate-700">{formatCurrency(outputStats.productionAmt, currencyUnit)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">加权毛利率</div>
                            <div className="text-sm font-bold text-slate-700">{(outputStats.weightedGrossMargin * 100).toFixed(1)}%</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">加权倍率</div>
                            <div className="text-sm font-bold text-slate-700">{outputStats.weightedMarkupRate.toFixed(2)}x</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] text-slate-400 mb-1">加权售罄目标</div>
                            <div className="text-sm font-bold text-slate-700">{(outputStats.weightedSellThrough * 100).toFixed(0)}%</div>
                        </div>
                        <div className={`rounded-lg border p-3 ${outputStats.riskCount > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                            <div className={`text-[10px] mb-1 ${outputStats.riskCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>结构风险</div>
                            <div className={`text-sm font-bold ${outputStats.riskCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {outputStats.riskCount === 0 ? '无风险' : `${outputStats.riskCount} 项`}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ⚙ 敏感度分析（折叠） */}
                <section className="bg-white rounded-xl border border-slate-100 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setSensitivityOpen(prev => !prev)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-base">⚙</span>
                            <span className="text-sm font-semibold text-slate-700">敏感度分析</span>
                            <span className="text-[11px] text-slate-400">毛利率 ±5pp 实时联动成本上限</span>
                        </div>
                        <span className={`text-slate-400 transition-transform ${sensitivityOpen ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    {sensitivityOpen && (
                        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-slate-500 shrink-0">目标毛利率调整</span>
                                <input
                                    type="range"
                                    min={-5}
                                    max={5}
                                    step={0.5}
                                    value={(marginDelta * 100).toFixed(1)}
                                    onChange={e => setMarginDelta(parseFloat(e.target.value) / 100)}
                                    className="flex-1 max-w-[300px] accent-sky-500"
                                />
                                <span className={`text-xs font-semibold w-16 text-right ${marginDelta > 0 ? 'text-emerald-600' : marginDelta < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                    {marginDelta > 0 ? '+' : ''}{(marginDelta * 100).toFixed(1)}pp
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setMarginDelta(0)}
                                    disabled={marginDelta === 0}
                                    className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    重置
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 text-[11px]">
                                            <th className="text-left py-1.5 px-2 font-medium">价格带</th>
                                            <th className="text-right py-1.5 px-2 font-medium">原毛利目标</th>
                                            <th className="text-right py-1.5 px-2 font-medium">调整后</th>
                                            <th className="text-right py-1.5 px-2 font-medium">原成本上限</th>
                                            <th className="text-right py-1.5 px-2 font-medium">新成本上限</th>
                                            <th className="text-right py-1.5 px-2 font-medium">空间变化</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceBandRows.filter(r => !isClearancePriceBand(r)).map(r => {
                                            const avgRetail = calcAverageRetailPrice(r.minPrice, r.maxPrice);
                                            const newMargin = Math.max(0, Math.min(0.99, r.targetGrossMargin + marginDelta));
                                            const oldCeil = calcFinalCostCeiling(avgRetail, r.targetGrossMargin, r.targetMarkupRate);
                                            const newCeil = calcFinalCostCeiling(avgRetail, newMargin, r.targetMarkupRate);
                                            const delta = newCeil - oldCeil;
                                            const pct = oldCeil > 0 ? (delta / oldCeil) * 100 : 0;
                                            return (
                                                <tr key={r.priceBandId} className="border-b border-slate-50">
                                                    <td className="py-1.5 px-2 font-medium text-slate-700">{r.priceBandLabel}</td>
                                                    <td className="py-1.5 px-2 text-right text-slate-500">{(r.targetGrossMargin * 100).toFixed(1)}%</td>
                                                    <td className="py-1.5 px-2 text-right text-slate-700 font-semibold">{(newMargin * 100).toFixed(1)}%</td>
                                                    <td className="py-1.5 px-2 text-right text-slate-500">¥{oldCeil.toFixed(0)}</td>
                                                    <td className={`py-1.5 px-2 text-right font-semibold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-700'}`}>¥{newCeil.toFixed(0)}</td>
                                                    <td className={`py-1.5 px-2 text-right text-[11px] ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                        {delta > 0 ? '+' : ''}¥{delta.toFixed(0)} ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                注：敏感度分析仅做即时模拟，不会修改实际目标毛利率。如要应用，请在 ① 价格带表格直接编辑。
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
