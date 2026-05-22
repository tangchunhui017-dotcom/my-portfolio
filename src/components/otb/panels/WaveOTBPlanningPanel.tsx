'use client';
/**
 * src/components/otb/panels/WaveOTBPlanningPanel.tsx
 * 波段 OTB 拆解工作台 — 升级版
 * 新结构：决策摘要 → 四季经营卡片 → 波段表 → 风险动作 → 输出联动
 */

import { useMemo, useCallback, useState } from 'react';
import {
    calcWaveOTB,
    formatCurrency,
    formatPct,
    safeNumber,
    safeDiv,
    type CurrencyUnit,
    type WaveOTBInput,
    type WaveOTBRow,
} from '@/utils/otbCalculations';
import {
    getCurrentSeasonPhase,
    getSeasonColorClasses,
    type SeasonCalendar,
} from '@/utils/seasonCalendar';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import WaveDecisionSummary from './wave/WaveDecisionSummary';
import WaveRiskActionPanel from './wave/WaveRiskActionPanel';
import WaveOutputBridgePanel from './wave/WaveOutputBridgePanel';
import {
    diagnoseWaveRisk,
    generateWaveActions,
    calcWaveHealthScore,
    attributeOtbOverrun,
    scanUpcomingDeadlines,
    calcClosedWaveAchievement,
    type WaveAction,
    type WaveContext,
    type WaveRisk,
    type WaveRow,
    type UpcomingDeadlineItem,
    type ClosedWaveAchievement,
} from '@/utils/otbWavePlanning';
import { calcWeightedGrossMargin } from '@/utils/otbPriceStructure';
import type { OTBPriceStructureOutput } from './OTBPriceStructurePanel';
import defaultSeasons from '../../../../data/otb/season_calendar.json';

interface Props {
    currencyUnit: CurrencyUnit;
    ssSeasonSalesTarget: number;
    awSeasonSalesTarget: number;
    waves: WaveOTBInput[];
    onWavesChange: (waves: WaveOTBInput[]) => void;
    seasonSalesTargets?: Record<string, number>;
    annualOtbBudget: number;
    isLocked?: boolean;
    compareMode?: CompareMode;
    filters?: DashboardFilters;
    priceStructure?: OTBPriceStructureOutput | null;
    onJumpToTab?: (tab: 'price' | 'category' | 'execution') => void;
}

const MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WAVE_ROLES: Record<string, string> = {
    traffic: '引流',
    main_sales: '主销',
    image: '形象',
    testing: '测试',
    repeat: '翻单',
    clearance: '清尾',
};

type ExtendedWaveInput = WaveOTBInput & {
    waveRole?: WaveRow['waveRole'];
    forecastSalesAmount?: number;
    planSalesAmount?: number;
    lySalesAmount?: number;
    momSalesAmount?: number;
    planOtbBudget?: number;
    priceBandFocus?: string[];
    productRoleFocus?: string[];
    targetColorCount?: number;
    targetSkuCount?: number;
    arrivalRateTarget?: number;
    orderDeadline?: string;
    warehouseDeadline?: string;
};

type EditableWaveField = keyof ExtendedWaveInput;

type WaveDisplayRow = WaveOTBRow & {
    sourceIndex: number;
    waveRole: WaveRow['waveRole'];
    seasonId: string;
    phaseLabel: string;
    daysToLaunch: number;
    planSalesAmount: number;
    lySalesAmount: number;
    momSalesAmount: number;
    forecastSalesAmount: number;
    vsPlanRate: number | null;
    yoyRate: number | null;
    momRate: number | null;
    planOtbBudget: number;
    forecastOtbBudget: number;
    otbDiff: number;
    priceBandFocus: string[];
    productRoleFocus: string[];
    targetColorCount: number;
    targetSkuCount: number;
    arrivalRateTarget: number;
    orderDeadline?: string;
    warehouseDeadline?: string;
};

function resolveWaveSeasonId(row: Pick<WaveOTBRow, 'season' | 'launchMonth'>) {
    if (row.season === 'SS') {
        return row.launchMonth <= 4 ? 'spring' : 'summer';
    }
    return row.launchMonth <= 9 ? 'autumn' : 'winter';
}

function resolveWavePhaseLabel(daysToLaunch: number) {
    if (daysToLaunch > 90) return '准备期';
    if (daysToLaunch > 30) return '上市前';
    if (daysToLaunch >= 0) return '临近上市';
    if (daysToLaunch > -60) return '销售中';
    return '已过季';
}

function normalizeWaveFilterCode(wave: string | undefined) {
    const raw = String(wave || '').trim().toUpperCase();
    const numeric = raw.match(/\d+/)?.[0];
    return numeric ? `W${Number(numeric)}` : raw;
}

function resolveQuarterFromLaunchMonth(month: number) {
    return `Q${Math.max(1, Math.min(4, Math.ceil(month / 3)))}`;
}

function matchesWaveDisplayFilters(
    filters: DashboardFilters | undefined,
    row: Pick<WaveDisplayRow, 'launchDate' | 'launchMonth' | 'season' | 'wave'>,
) {
    if (!filters) return true;
    if (filters.season_year !== 'all' && String(row.launchDate?.slice(0, 4)) !== String(filters.season_year)) return false;
    if (filters.season !== 'all') {
        const selectedSeason = String(filters.season).toUpperCase();
        const rowSeason = String(row.season).toUpperCase();
        const rowQuarter = resolveQuarterFromLaunchMonth(row.launchMonth);
        if (selectedSeason !== rowSeason && selectedSeason !== rowQuarter) return false;
    }
    if (filters.wave !== 'all' && normalizeWaveFilterCode(row.wave) !== normalizeWaveFilterCode(String(filters.wave))) return false;
    return true;
}

function ratioTone(value: number | null, active: boolean) {
    if (!active) return 'text-slate-600';
    if (value === null) return 'bg-slate-50 text-slate-400';
    if (value >= 0.05) return 'bg-emerald-50 text-emerald-700 font-bold';
    if (value <= -0.05) return 'bg-rose-50 text-rose-700 font-bold';
    return 'bg-sky-50 text-sky-700 font-bold';
}

function formatSignedPctValue(value: number | null) {
    if (value === null) return '暂无基准';
    const sign = value > 0 ? '+' : '';
    return `${sign}${formatPct(value)}`;
}

function WaveNumberInput({ value, onChange, step = 1, width = 'w-16', disabled = false }: { value: number; onChange: (value: number) => void; step?: number; width?: string; disabled?: boolean }) {
    return (
        <input
            type="number"
            value={value}
            step={step}
            disabled={disabled}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className={`${width} text-right text-xs rounded px-1.5 py-1 focus:outline-none border ${
                disabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-sky-50 border-sky-200'
            }`}
        />
    );
}

function WaveTextInput({ value, onChange, width = 'w-28', disabled = false }: { value: string; onChange: (value: string) => void; width?: string; disabled?: boolean }) {
    return (
        <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
            className={`${width} text-xs rounded px-1.5 py-1 focus:outline-none border ${
                disabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-sky-50 border-sky-200'
            }`}
        />
    );
}

// 波段表格 — 18 主列 + 10 高级列，支持 compareMode 列隐藏、4 列固定、健康度、风险 tooltip
function WavePlanningTable({
    rows,
    riskByWave,
    actionByWave,
    healthScores,
    updateWave,
    fc,
    isLocked = false,
    compareMode = 'none',
    showAdvancedCols = false,
}: {
    rows: WaveDisplayRow[];
    riskByWave: Map<string, WaveRisk[]>;
    actionByWave: Map<string, WaveAction[]>;
    healthScores: Map<string, number>;
    updateWave: (idx: number, field: EditableWaveField, value: number | string) => void;
    fc: (value: number | null | undefined) => string;
    isLocked?: boolean;
    compareMode?: CompareMode;
    showAdvancedCols?: boolean;
}) {
    // compareMode 列可见性
    const showVsPlan = compareMode === 'plan' || compareMode === 'none';
    const showYoy   = compareMode === 'yoy'  || compareMode === 'none';
    const showMom   = compareMode === 'mom'  || compareMode === 'none';

    return (
        <div className="rounded-lg border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                款数、色数、SKU、品类与角色为「波段企划」输入的只读参考；本表负责预算金额、OTB占用、预算差异与采购风险。
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {/* 主列 — 固定前 4 列 */}
                            <th className="sticky left-0 z-20 bg-slate-50 py-2 px-2 font-medium text-slate-600 text-left whitespace-nowrap min-w-[80px]">波段</th>
                            <th className="sticky left-[80px] z-20 bg-slate-50 py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap min-w-[60px]">季节</th>
                            <th className="sticky left-[140px] z-20 bg-slate-50 py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap min-w-[100px]">上市日期</th>
                            <th className="sticky left-[240px] z-20 bg-slate-50 py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap min-w-[70px] border-r border-slate-200">距上市</th>
                            {/* 其余主列 */}
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">企划角色</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">企划品类</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">销售占比</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">预测销售</th>
                            {showVsPlan && <th className={`py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap ${compareMode === 'plan' ? 'bg-sky-50' : ''}`}>vs计划</th>}
                            {showYoy   && <th className={`py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap ${compareMode === 'yoy'  ? 'bg-sky-50' : ''}`}>YoY</th>}
                            {showMom   && <th className={`py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap ${compareMode === 'mom'  ? 'bg-sky-50' : ''}`}>MoM</th>}
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">企划款数</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">企划色数</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">企划SKU</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">均深</th>
                            <th className="py-2 px-2 font-medium text-violet-600 text-right whitespace-nowrap bg-violet-50">零售均价</th>
                            <th className="py-2 px-2 font-medium text-violet-600 text-right whitespace-nowrap bg-violet-50">投入双数</th>
                            <th className="py-2 px-2 font-medium text-violet-600 text-right whitespace-nowrap bg-violet-50">款均深度</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">OTB预算</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">预算差异</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">健康度</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">风险</th>
                            <th className="py-2 px-2 font-medium text-slate-600 text-right whitespace-nowrap">动作</th>
                            {/* 高级列 */}
                            {showAdvancedCols && <>
                                <th className="py-2 px-2 font-medium text-violet-600 text-right whitespace-nowrap bg-violet-50">成本OTB</th>
                                <th className="py-2 px-2 font-medium text-violet-600 text-right whitespace-nowrap bg-violet-50">首单可买双数</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">定位</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">阶段</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">节日推广</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">价格带</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">新品%</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">翻单%</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">旧品%</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">消化率</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">到货月份</th>
                                <th className="py-2 px-2 font-medium text-purple-600 text-right whitespace-nowrap bg-purple-50">到货率</th>
                            </>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const isHighlightPlan = compareMode === 'plan';
                            const isHighlightYoy = compareMode === 'yoy';
                            const isHighlightMom = compareMode === 'mom';
                            const waveRisks = riskByWave.get(row.id) ?? [];
                            const primaryRisk = waveRisks[0];
                            const primaryAction = actionByWave.get(row.id)?.[0];
                            const riskTone = primaryRisk?.level === 'danger'
                                ? 'bg-rose-50 text-rose-700'
                                : primaryRisk?.level === 'warning'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700';
                            const healthScore = healthScores.get(row.id) ?? 100;
                            const healthTone = healthScore >= 80 ? 'text-emerald-600 font-semibold'
                                : healthScore >= 60 ? 'text-amber-600 font-semibold'
                                : 'text-rose-600 font-semibold';

                            return (
                                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                                    {/* 固定前 4 列 */}
                                    <td className="sticky left-0 z-10 bg-white py-2 px-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-100">{row.wave}</td>
                                    <td className="sticky left-[80px] z-10 bg-white py-2 px-2 text-right text-slate-600 whitespace-nowrap">{row.seasonLabel}</td>
                                    <td className="sticky left-[140px] z-10 bg-white py-2 px-2 text-right text-slate-600 whitespace-nowrap">{row.launchDate}</td>
                                    <td className={`sticky left-[240px] z-10 bg-white py-2 px-2 text-right whitespace-nowrap border-r border-slate-200 ${row.daysToLaunch >= 0 && row.daysToLaunch < 60 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                                        {row.daysToLaunch >= 0 ? `${row.daysToLaunch}天` : '已上市'}
                                    </td>
                                    {/* 其余主列 */}
                                    <td className="py-2 px-2 text-right text-slate-600">{row.waveRole ? WAVE_ROLES[row.waveRole] : '--'}</td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveTextInput value={row.mainCategory ?? ''} onChange={v => updateWave(row.sourceIndex, 'mainCategory', v)} disabled={isLocked} width="w-20" />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={parseFloat((row.salesRatio * 100).toFixed(1))} step={0.5} onChange={v => updateWave(row.sourceIndex, 'salesRatio', v / 100)} disabled={isLocked} width="w-14" />
                                    </td>
                                    <td className="py-2 px-2 text-right font-medium">{fc(row.forecastSalesAmount)}</td>
                                    {showVsPlan && <td className={`py-2 px-2 text-right ${ratioTone(row.vsPlanRate, isHighlightPlan)}`}>{formatSignedPctValue(row.vsPlanRate)}</td>}
                                    {showYoy   && <td className={`py-2 px-2 text-right ${ratioTone(row.yoyRate, isHighlightYoy)}`}>{formatSignedPctValue(row.yoyRate)}</td>}
                                    {showMom   && <td className={`py-2 px-2 text-right ${ratioTone(row.momRate, isHighlightMom)}`}>{formatSignedPctValue(row.momRate)}</td>}
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={safeNumber(row.plannedStyleCount) ?? 0} onChange={v => updateWave(row.sourceIndex, 'plannedStyleCount', Math.max(0, Math.round(v)))} width="w-12" disabled={isLocked} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={row.targetColorCount} onChange={v => updateWave(row.sourceIndex, 'targetColorCount', Math.max(1, Math.round(v)))} width="w-12" disabled={isLocked} />
                                    </td>
                                    <td className="py-2 px-2 text-right font-medium text-slate-700">{row.targetSkuCount}</td>
                                    <td className="py-2 px-2 text-right">
                                        <WaveNumberInput value={safeNumber(row.averageDepth) ?? 0} step={10} onChange={v => updateWave(row.sourceIndex, 'averageDepth', Math.max(0, Math.round(v)))} width="w-14" disabled={isLocked} />
                                    </td>
                                    <td className="py-2 px-2 text-right text-violet-600 bg-violet-50/30 text-xs">
                                        {row.averageRetailPrice ? `¥${row.averageRetailPrice}` : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right text-violet-700 bg-violet-50/30 font-medium text-xs">
                                        {row.plannedPairs !== null ? row.plannedPairs.toLocaleString() + '双' : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right text-violet-600 bg-violet-50/30 text-xs">
                                        {row.styleDepthPairs !== null ? row.styleDepthPairs + '双/款' : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right font-semibold text-sky-700">{fc(row.forecastOtbBudget)}</td>
                                    <td className={`py-2 px-2 text-right font-medium ${row.otbDiff > 0 ? 'text-rose-600' : row.otbDiff < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{fc(row.otbDiff)}</td>
                                    {/* 健康度评分 */}
                                    <td className={`py-2 px-2 text-right ${healthTone}`}>{healthScore}</td>
                                    {/* 风险列（tooltip 含详情） */}
                                    <td className="py-2 px-2 text-right">
                                        {primaryRisk ? (
                                            <div
                                                title={`${primaryRisk.message}\n影响金额: ${fc(primaryRisk.impactAmount)}\n优先级: ${primaryRisk.priority}`}
                                                className="inline-flex items-center gap-1"
                                            >
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${riskTone} cursor-help`}>
                                                    {primaryRisk.priority === '高' ? '✗ ' : primaryRisk.priority === '中' ? '⚠ ' : ''}
                                                    {primaryRisk.title}
                                                </span>
                                                {waveRisks.length > 1 && (
                                                    <span className="text-[9px] text-slate-400">+{waveRisks.length - 1}</span>
                                                )}
                                            </div>
                                        ) : '--'}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">{primaryAction?.action ?? '--'}</td>
                                    {/* 高级列 */}
                                    {showAdvancedCols && <>
                                        <td className="py-2 px-2 text-right text-violet-700 bg-violet-50/30">{row.costOtbBudget !== null ? fc(row.costOtbBudget) : '-'}</td>
                                        <td className="py-2 px-2 text-right text-violet-700 bg-violet-50/30">{row.firstOrderPairs !== null ? row.firstOrderPairs.toLocaleString() + '双' : '-'}</td>
                                        <td className="py-2 px-2 text-right text-slate-600 bg-purple-50/30">{row.waveRole ? WAVE_ROLES[row.waveRole] : '--'}</td>
                                        <td className="py-2 px-2 text-right text-slate-600 bg-purple-50/30">{row.phaseLabel}</td>
                                        <td className="py-2 px-2 text-right text-slate-600 bg-purple-50/30">{row.promotion || '--'}</td>
                                        <td className="py-2 px-2 text-right text-slate-600 bg-purple-50/30">{row.priceBandFocus.join('/') || '--'}</td>
                                        <td className="py-2 px-2 text-right bg-purple-50/30">{formatPct(row.newProductRatio)}</td>
                                        <td className="py-2 px-2 text-right bg-purple-50/30">{formatPct(row.repeatOrderRatio)}</td>
                                        <td className="py-2 px-2 text-right bg-purple-50/30">{formatPct(row.carryoverRatio)}</td>
                                        <td className="py-2 px-2 text-right bg-purple-50/30">
                                            <WaveNumberInput value={parseFloat(((row.sellThroughTarget ?? 0.75) * 100).toFixed(1))} onChange={v => updateWave(row.sourceIndex, 'sellThroughTarget', v / 100)} width="w-12" disabled={isLocked} />
                                        </td>
                                        <td className="py-2 px-2 text-right text-slate-600 bg-purple-50/30">{MONTH_LABELS[row.arrivalMonth ?? 1]}</td>
                                        <td className="py-2 px-2 text-right bg-purple-50/30">{formatPct(row.arrivalRateTarget)}</td>
                                    </>}
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        {(() => {
                            const totalForecast = rows.reduce((s, r) => s + (r.forecastSalesAmount ?? 0), 0);
                            const totalOtb = rows.reduce((s, r) => s + (r.forecastOtbBudget ?? 0), 0);
                            const totalPlannedPairs = rows.reduce((s, r) => s + (r.plannedPairs ?? 0), 0);
                            const totalStyles = rows.reduce((s, r) => s + (safeNumber(r.plannedStyleCount) ?? 0), 0);
                            const colSpanBefore = 4 + 4 + (showVsPlan ? 1 : 0) + (showYoy ? 1 : 0) + (showMom ? 1 : 0) + 4;
                            return (
                                <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-xs">
                                    <td colSpan={colSpanBefore} className="sticky left-0 z-10 bg-slate-50 py-2 px-3 text-slate-700 whitespace-nowrap">
                                        合计（{rows.length} 波段）
                                    </td>
                                    <td className="py-2 px-2 text-right text-violet-700 bg-violet-50/30">
                                        {totalPlannedPairs > 0 ? totalPlannedPairs.toLocaleString() + '双' : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-500 bg-violet-50/30">
                                        {totalStyles > 0 ? totalStyles + '款' : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right text-sky-700">
                                        {fc(totalOtb)}
                                    </td>
                                    <td className="py-2 px-2 text-right text-slate-500">
                                        {fc(totalForecast)}
                                    </td>
                                    <td colSpan={showAdvancedCols ? 13 : 3} />
                                </tr>
                            );
                        })()}
                    </tfoot>
                    </table>
            </div>
        </div>
    );
}

// 季节卡片增强版
function SeasonCardsEnhanced({
    seasons,
    seasonSalesTargets,
    waves,
    riskByWave,
    actionByWave,
    currencyUnit,
}: {
    seasons: SeasonCalendar[];
    seasonSalesTargets?: Record<string, number>;
    waves: WaveDisplayRow[];
    riskByWave: Map<string, WaveRisk[]>;
    actionByWave: Map<string, WaveAction[]>;
    currencyUnit: CurrencyUnit;
}) {
    const today = useMemo(() => new Date(), []);
    const phaseInfos = useMemo(() => seasons.map(s => getCurrentSeasonPhase(today, s)), [today, seasons]);
    const totalSalesTarget = useMemo(
        () => seasons.reduce((sum, season) => sum + (safeNumber(seasonSalesTargets?.[season.seasonId]) ?? 0), 0),
        [seasonSalesTargets, seasons],
    );
    const totalOtbBudget = useMemo(
        () => waves.reduce((sum, wave) => sum + (safeNumber(wave.forecastOtbBudget) ?? 0), 0),
        [waves],
    );

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {seasons.map((season, idx) => {
                const info = phaseInfos[idx];
                const color = getSeasonColorClasses(season.colorScheme);
                const salesTarget = seasonSalesTargets?.[season.seasonId];
                const seasonWaves = waves.filter(wave => wave.seasonId === season.seasonId);
                const otbBudget = seasonWaves.reduce((sum, wave) => sum + (safeNumber(wave.forecastOtbBudget) ?? 0), 0);
                const salesShare = safeDiv(salesTarget ?? 0, totalSalesTarget);
                const otbShare = safeDiv(otbBudget, totalOtbBudget);
                const styleCount = seasonWaves.reduce((sum, wave) => sum + (safeNumber(wave.plannedStyleCount) ?? 0), 0);
                const skuCount = seasonWaves.reduce((sum, wave) => sum + wave.targetSkuCount, 0);
                const risks = seasonWaves.flatMap(wave => riskByWave.get(wave.id) ?? []);
                // 去重（按 riskType）后取前 2 条，danger 优先
                const topRisks = Array.from(
                    risks.reduce<Map<string, WaveRisk>>((map, r) => {
                        if (!map.has(r.riskType)) map.set(r.riskType, r);
                        return map;
                    }, new Map()).values()
                )
                .sort((a, b) => (a.level === 'danger' ? 0 : a.level === 'warning' ? 1 : 2) - (b.level === 'danger' ? 0 : b.level === 'warning' ? 1 : 2))
                .slice(0, 2);
                const primaryAction = seasonWaves
                    .flatMap(wave => actionByWave.get(wave.id) ?? [])
                    .find(Boolean);

                // OTB 与销售分配偏差
                const deviation = (otbShare ?? 0) - (salesShare ?? 0);
                const devStatus = Math.abs(deviation) <= 0.03 ? 'ok' : Math.abs(deviation) <= 0.08 ? 'warn' : 'danger';

                return (
                    <div key={season.seasonId} className={`rounded-lg border ${color.border} ${color.bg} p-3 space-y-2`}>
                        <div className={`text-sm font-bold ${color.text}`}>{season.seasonName}</div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-600">销售目标</span>
                                <span className="font-semibold">{formatCurrency(salesTarget || 0, currencyUnit)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">OTB预算</span>
                                <span className="font-semibold">{formatCurrency(otbBudget, currencyUnit)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">销售/OTB占比</span>
                                <span className={`font-semibold ${devStatus === 'danger' ? 'text-rose-600' : devStatus === 'warn' ? 'text-amber-600' : ''}`}>
                                    {salesShare !== null ? formatPct(salesShare) : '--'} / {otbShare !== null ? formatPct(otbShare) : '--'}
                                    {devStatus !== 'ok' && <span className="ml-1">{devStatus === 'danger' ? '✗' : '⚠'}</span>}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">波段/企划款/SKU</span>
                                <span className="font-semibold">{seasonWaves.length} / {styleCount} / {skuCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">阶段</span>
                                <span className="font-semibold">{info.phaseLabel}</span>
                            </div>
                            {topRisks.length > 0 ? (
                                topRisks.map(r => (
                                    <div key={r.riskType} className="flex justify-between gap-2">
                                        <span className="text-slate-600 shrink-0">
                                            {r.level === 'danger' ? '✗ 风险' : '⚠ 风险'}
                                        </span>
                                        <span className={`font-semibold text-right text-[11px] ${r.level === 'danger' ? 'text-rose-600' : 'text-amber-600'}`}>
                                            {r.title}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex justify-between gap-2">
                                    <span className="text-slate-600">状态</span>
                                    <span className="font-semibold text-emerald-600">健康</span>
                                </div>
                            )}
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-600 shrink-0">建议</span>
                                <span className="font-semibold text-right">{primaryAction?.action ?? '按计划推进'}</span>
                            </div>
                        </div>
                        {info.progressPct !== undefined && (
                            <div className="h-1 bg-white/60 rounded-full overflow-hidden">
                                <div className={`h-full ${color.progressBar}`} style={{ width: `${info.progressPct}%` }} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── 波段时间轴甘特图 ─────────────────────────────────────────────

const WAVE_ROLE_COLOR: Record<string, string> = {
    traffic:    '#0ea5e9',
    main_sales: '#10b981',
    image:      '#8b5cf6',
    testing:    '#f59e0b',
    repeat:     '#6366f1',
    clearance:  '#94a3b8',
};

function WaveTimelineGantt({
    waves, currentDate, currencyUnit,
}: {
    waves: WaveDisplayRow[];
    currentDate: Date;
    currencyUnit: CurrencyUnit;
}) {
    if (waves.length === 0) return null;
    const yearStart = new Date(currentDate.getFullYear(), 0, 1).getTime();
    const yearEnd   = new Date(currentDate.getFullYear() + 1, 0, 1).getTime();
    const yearSpan  = yearEnd - yearStart;
    const todayPct  = ((currentDate.getTime() - yearStart) / yearSpan) * 100;

    return (
        <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">波段时间轴</span>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    {Object.entries(WAVE_ROLES).map(([k, label]) => (
                        <span key={k} className="inline-flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: WAVE_ROLE_COLOR[k] ?? '#94a3b8' }} />
                            {label}
                        </span>
                    ))}
                </div>
            </div>
            {/* 月份刻度 */}
            <div className="relative h-5 border-b border-slate-200">
                {Array.from({ length: 12 }).map((_, i) => {
                    const pct = (i / 12) * 100;
                    return (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 border-l border-slate-100 text-[9px] text-slate-400 pl-0.5"
                            style={{ left: `${pct}%`, width: `${100 / 12}%` }}
                        >
                            {i + 1}月
                        </div>
                    );
                })}
                {/* 今日线 */}
                {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0 border-l-2 border-rose-500" style={{ left: `${todayPct}%` }} title={`业务日期 ${currentDate.toISOString().slice(0, 10)}`}>
                        <span className="absolute -top-2 -translate-x-1/2 text-[9px] font-semibold text-rose-600 whitespace-nowrap bg-white px-0.5">今</span>
                    </div>
                )}
            </div>
            {/* 波段轨道 */}
            <div className="relative" style={{ height: `${waves.length * 22 + 4}px` }}>
                {waves.map((w, idx) => {
                    const launchTs = new Date(w.launchDate).getTime();
                    const launchPct = ((launchTs - yearStart) / yearSpan) * 100;
                    // 销售期假设 60 天
                    const sellSpanPct = (60 * 86400000 / yearSpan) * 100;
                    const roleKey = w.waveRole ?? 'main_sales';
                    const color = WAVE_ROLE_COLOR[roleKey] ?? '#94a3b8';
                    const isLaunched = w.daysToLaunch < 0;
                    return (
                        <div key={w.id} className="absolute left-0 right-0" style={{ top: `${idx * 22}px`, height: '20px' }}>
                            <div
                                className={`absolute h-4 top-0.5 rounded ${isLaunched ? 'opacity-60' : ''}`}
                                style={{
                                    left: `${Math.max(0, launchPct)}%`,
                                    width: `${Math.min(100 - launchPct, sellSpanPct)}%`,
                                    backgroundColor: color,
                                    minWidth: '2px',
                                }}
                                title={`${w.season} ${w.wave} · ${w.launchDate} · ${WAVE_ROLES[roleKey] ?? roleKey} · OTB ${formatCurrency(w.forecastOtbBudget, currencyUnit)}`}
                            >
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 text-[10px] text-slate-600 whitespace-nowrap">
                                    {w.season} {w.wave}
                                </span>
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-1 text-[9px] text-slate-400 whitespace-nowrap">
                                    {isLaunched ? `已上市${Math.abs(w.daysToLaunch)}天` : `还有${w.daysToLaunch}天`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── 销售-OTB 偏差散点图 ──────────────────────────────────────────

function SalesOtbDeviationMatrix({
    waves, currencyUnit,
}: {
    waves: WaveDisplayRow[];
    currencyUnit: CurrencyUnit;
}) {
    if (waves.length === 0) return null;
    const totalSales = waves.reduce((s, w) => s + (w.forecastSalesAmount || 0), 0);
    const totalOtb   = waves.reduce((s, w) => s + (w.forecastOtbBudget || 0), 0);
    if (totalSales <= 0 || totalOtb <= 0) return null;

    // 0-30% 范围映射到 0-160px（留 20px 边距）
    const W = 200, H = 200, PAD = 24;
    const RANGE = 0.3;
    const x = (r: number) => PAD + (Math.min(r, RANGE) / RANGE) * (W - PAD * 2);
    const y = (r: number) => H - PAD - (Math.min(r, RANGE) / RANGE) * (H - PAD * 2);

    const points = waves.map(w => {
        const sShare = (w.forecastSalesAmount || 0) / totalSales;
        const oShare = (w.forecastOtbBudget || 0) / totalOtb;
        const dev = Math.abs(oShare - sShare);
        const status = dev <= 0.02 ? 'ok' : dev <= 0.05 ? 'warn' : 'danger';
        return { wave: w, sShare, oShare, status };
    });

    return (
        <div className="rounded-lg border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">销售-OTB 偏差矩阵</span>
                <span className="text-[10px] text-slate-400">理想点位于对角线（销售=OTB 占比）</span>
            </div>
            <div className="flex items-start gap-3">
                <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
                    {/* 网格线 */}
                    {[0.1, 0.2, 0.3].map(v => (
                        <g key={v}>
                            <line x1={x(v)} y1={PAD} x2={x(v)} y2={H - PAD} stroke="#f1f5f9" strokeWidth="1" />
                            <line x1={PAD} y1={y(v)} x2={W - PAD} y2={y(v)} stroke="#f1f5f9" strokeWidth="1" />
                        </g>
                    ))}
                    {/* 坐标轴 */}
                    <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#94a3b8" strokeWidth="1" />
                    <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#94a3b8" strokeWidth="1" />
                    {/* 对角线（理想线） */}
                    <line x1={x(0)} y1={y(0)} x2={x(RANGE)} y2={y(RANGE)} stroke="#10b981" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
                    {/* 数据点 */}
                    {points.map(p => (
                        <g key={p.wave.id}>
                            <circle
                                cx={x(p.sShare)}
                                cy={y(p.oShare)}
                                r="4"
                                fill={WAVE_ROLE_COLOR[p.wave.waveRole ?? 'main_sales'] ?? '#94a3b8'}
                                stroke={p.status === 'danger' ? '#ef4444' : p.status === 'warn' ? '#f59e0b' : 'white'}
                                strokeWidth={p.status === 'ok' ? 1 : 2}
                            >
                                <title>
                                    {p.wave.season} {p.wave.wave} · 销售 {(p.sShare * 100).toFixed(1)}% / OTB {(p.oShare * 100).toFixed(1)}% · 偏差 {((p.oShare - p.sShare) * 100).toFixed(1)}pp
                                </title>
                            </circle>
                        </g>
                    ))}
                    {/* 轴标签 */}
                    <text x={W - PAD} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="end">销售占比 →</text>
                    <text x={4} y={PAD - 4} fontSize="9" fill="#94a3b8">↑ OTB 占比</text>
                    <text x={x(0.3)} y={H - PAD + 12} fontSize="8" fill="#94a3b8" textAnchor="middle">30%</text>
                    <text x={PAD - 4} y={y(0.3) + 3} fontSize="8" fill="#94a3b8" textAnchor="end">30%</text>
                </svg>
                <div className="flex-1 text-[10px] text-slate-500 space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-600 mb-1">偏差分级</div>
                    <div>● 健康：偏差 ≤ 2pp</div>
                    <div>● 注意：偏差 2-5pp（橙色描边）</div>
                    <div>● 风险：偏差 &gt; 5pp（红色描边）</div>
                    <div className="pt-1 border-t border-slate-100 mt-2">
                        总销售 <strong>{formatCurrency(totalSales, currencyUnit)}</strong><br/>
                        总 OTB <strong>{formatCurrency(totalOtb, currencyUnit)}</strong><br/>
                        风险点 <strong className="text-rose-600">{points.filter(p => p.status === 'danger').length}</strong> 个
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── 已上市波段销售达成复盘卡片 ───────────────────────────────────

function ClosedWaveAchievementCards({
    closedReviews, currencyUnit,
}: {
    closedReviews: ClosedWaveAchievement[];
    currencyUnit: CurrencyUnit;
}) {
    if (closedReviews.length === 0) return null;
    const withActual = closedReviews.filter(r => r.actualSales !== null);
    const weightedAchievement = (() => {
        if (withActual.length === 0) return null;
        const sumPlan = withActual.reduce((s, r) => s + r.planSales, 0);
        const sumActual = withActual.reduce((s, r) => s + (r.actualSales ?? 0), 0);
        return sumPlan > 0 ? sumActual / sumPlan : null;
    })();

    return (
        <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">已上市波段销售复盘</span>
                <span className="text-[10px] text-slate-500">
                    {closedReviews.length} 个波段
                    {weightedAchievement !== null && (
                        <> · 加权达成 <strong className={weightedAchievement >= 1 ? 'text-emerald-600' : weightedAchievement >= 0.9 ? 'text-amber-600' : 'text-rose-600'}>{(weightedAchievement * 100).toFixed(1)}%</strong></>
                    )}
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {closedReviews.map(r => {
                    const hasActual = r.actualSales !== null && r.achievementPct !== null;
                    const status = !hasActual ? 'pending'
                        : (r.achievementPct ?? 0) >= 1 ? 'good'
                        : (r.achievementPct ?? 0) >= 0.9 ? 'warn' : 'bad';
                    const styleByStatus = {
                        pending: 'border-slate-200 bg-slate-50/40',
                        good:    'border-emerald-200 bg-emerald-50',
                        warn:    'border-amber-200 bg-amber-50',
                        bad:     'border-rose-200 bg-rose-50',
                    }[status];
                    const textByStatus = {
                        pending: 'text-slate-500',
                        good:    'text-emerald-700',
                        warn:    'text-amber-700',
                        bad:     'text-rose-700',
                    }[status];
                    return (
                        <div key={r.waveId} className={`rounded-lg border p-2.5 text-xs ${styleByStatus}`}>
                            <div className="flex items-baseline justify-between mb-1.5">
                                <span className="font-semibold text-slate-800">{r.waveName}</span>
                                <span className="text-[10px] text-slate-400">已上市 {r.daysLaunched} 天</span>
                            </div>
                            <div className="space-y-0.5 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">计划销售</span>
                                    <span className="text-slate-700">{formatCurrency(r.planSales, currencyUnit)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">实际销售</span>
                                    <span className={hasActual ? 'text-slate-700 font-semibold' : 'text-slate-400'}>
                                        {hasActual ? formatCurrency(r.actualSales ?? 0, currencyUnit) : '未录入'}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-0.5 border-t border-black/5">
                                    <span className="text-slate-500">达成率</span>
                                    <span className={`font-semibold ${textByStatus}`}>
                                        {hasActual && r.achievementPct !== null
                                            ? `${(r.achievementPct * 100).toFixed(1)}%`
                                            : '--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {withActual.length === 0 && (
                <p className="text-[10px] text-amber-600">提示：尚未录入实际销售数据。可在「执行跟踪」面板补录或通过 props 传入 executionRecords。</p>
            )}
        </div>
    );
}

export default function WaveOTBPlanningPanel({
    currencyUnit,
    ssSeasonSalesTarget,
    awSeasonSalesTarget,
    waves,
    onWavesChange,
    seasonSalesTargets,
    annualOtbBudget,
    isLocked = false,
    compareMode = 'none',
    filters,
    priceStructure,
    onJumpToTab,
}: Props) {
    const today = useMemo(() => new Date(), []);
    const seasons = defaultSeasons as SeasonCalendar[];

    const [helpOpen, setHelpOpen] = useState(false);
    const [showAdvancedCols, setShowAdvancedCols] = useState(false);

    const updateWave = useCallback((idx: number, field: EditableWaveField, value: number | string) => {
        onWavesChange(waves.map((wave, i) => i === idx ? { ...wave, [field]: value } : wave));
    }, [onWavesChange, waves]);

    const rows = useMemo(
        () => calcWaveOTB(waves, ssSeasonSalesTarget, awSeasonSalesTarget),
        [waves, ssSeasonSalesTarget, awSeasonSalesTarget],
    );

    const fc = (value: number | null | undefined) => formatCurrency(value, currencyUnit);

    const displayRows = useMemo<WaveDisplayRow[]>(() => {
        return rows.map((row, rowIndex) => {
            const matchedIndex = waves.findIndex(w => w.id === row.id);
            const sourceIndex = matchedIndex >= 0 ? matchedIndex : rowIndex;
            const source = waves[sourceIndex] as ExtendedWaveInput | undefined;
            const seasonId = resolveWaveSeasonId(row);
            const daysToLaunch = Math.floor((new Date(row.launchDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const forecastSalesAmount = safeNumber(source?.forecastSalesAmount) ?? row.plannedSalesAmount;
            const planSalesAmount = safeNumber(source?.planSalesAmount) ?? row.plannedSalesAmount;
            const lySalesAmount = safeNumber(source?.lySalesAmount) ?? row.plannedSalesAmount;
            const momSalesAmount = safeNumber(source?.momSalesAmount) ?? lySalesAmount;
            const forecastOtbBudget = safeNumber(row.otbBudget) ?? 0;
            const planOtbBudget = safeNumber(source?.planOtbBudget) ?? forecastOtbBudget;
            const targetColorCount = Math.max(1, Math.round(safeNumber(source?.targetColorCount) ?? 2));
            const targetSkuCount = Math.max(0, Math.round(safeNumber(source?.targetSkuCount) ?? ((safeNumber(row.plannedStyleCount) ?? 0) * targetColorCount)));

            return {
                ...row,
                sourceIndex,
                waveRole: source?.waveRole ?? 'main_sales',
                seasonId,
                phaseLabel: resolveWavePhaseLabel(daysToLaunch),
                daysToLaunch,
                planSalesAmount,
                lySalesAmount,
                momSalesAmount,
                forecastSalesAmount,
                vsPlanRate: safeDiv(forecastSalesAmount - planSalesAmount, planSalesAmount),
                yoyRate: safeDiv(forecastSalesAmount - lySalesAmount, lySalesAmount),
                momRate: safeDiv(forecastSalesAmount - momSalesAmount, momSalesAmount),
                planOtbBudget,
                forecastOtbBudget,
                otbDiff: forecastOtbBudget - planOtbBudget,
                priceBandFocus: source?.priceBandFocus ?? ['volume', 'profit'],
                productRoleFocus: source?.productRoleFocus ?? ['main', 'hero'],
                targetColorCount,
                targetSkuCount,
                arrivalRateTarget: safeNumber(source?.arrivalRateTarget) ?? 0.8,
                orderDeadline: source?.orderDeadline,
                warehouseDeadline: source?.warehouseDeadline,
            };
        });
    }, [rows, today, waves]);

    // 转换为波段拆解工具所需的格式
    const displayScope = useMemo(() => {
        const hasRowsForSelectedYear = !filters ||
            filters.season_year === 'all' ||
            displayRows.some(row => String(row.launchDate?.slice(0, 4)) === String(filters.season_year));
        const effectiveFilters = !hasRowsForSelectedYear && filters
            ? { ...filters, season_year: 'all' as const }
            : filters;
        const planScopeFilters = effectiveFilters ? { ...effectiveFilters, wave: 'all' as const } : undefined;
        const planScopeRows = displayRows.filter(row => matchesWaveDisplayFilters(planScopeFilters, row));
        const requestedRows = effectiveFilters?.wave && effectiveFilters.wave !== 'all'
            ? planScopeRows.filter(row => matchesWaveDisplayFilters(effectiveFilters, row))
            : planScopeRows;
        const waveFallback = Boolean(
            effectiveFilters?.wave &&
            effectiveFilters.wave !== 'all' &&
            requestedRows.length === 0 &&
            planScopeRows.length > 0,
        );

        return {
            rows: waveFallback ? planScopeRows : requestedRows,
            yearFallback: Boolean(filters && filters.season_year !== 'all' && !hasRowsForSelectedYear),
            waveFallback,
            fallbackYear: displayRows[0]?.launchDate?.slice(0, 4),
        };
    }, [displayRows, filters]);

    const scopedDisplayRows = displayScope.rows;

    const waveRowsForDiagnostics = useMemo<WaveRow[]>(() => {
        return scopedDisplayRows.map(row => ({
            waveId: row.id,
            waveName: row.wave,
            season: row.seasonId,
            waveRole: row.waveRole,
            launchDate: row.launchDate,
            arrivalMonth: row.arrivalMonth,
            mainCategory: row.mainCategory,
            planSalesAmount: row.planSalesAmount,
            lySalesAmount: row.lySalesAmount,
            forecastSalesAmount: row.forecastSalesAmount,
            forecastOtbBudget: row.forecastOtbBudget,
            planOtbBudget: row.planOtbBudget,
            averageDepth: safeNumber(row.averageDepth) ?? 0,
            targetStyleCount: safeNumber(row.plannedStyleCount) ?? 0,
            newProductRatio: row.newProductRatio,
            repeatRatio: row.repeatOrderRatio,
            oldProductRatio: row.carryoverRatio,
            sellThroughTarget: row.sellThroughTarget,
            priceBandFocus: row.priceBandFocus,
            productRoleFocus: row.productRoleFocus,
            targetColorCount: row.targetColorCount,
            targetSkuCount: row.targetSkuCount,
            arrivalRateTarget: row.arrivalRateTarget,
            orderDeadline: row.orderDeadline,
            warehouseDeadline: row.warehouseDeadline,
        }));
    }, [scopedDisplayRows]);

    const waveContext = useMemo<WaveContext>(() => ({
        annualSalesTarget: ssSeasonSalesTarget + awSeasonSalesTarget,
        annualOtbBudget,
        allWaves: waveRowsForDiagnostics,
        currentDate: today,
        currencyUnit,
    }), [annualOtbBudget, awSeasonSalesTarget, currencyUnit, ssSeasonSalesTarget, today, waveRowsForDiagnostics]);

    const riskByWave = useMemo(() => {
        const map = new Map<string, WaveRisk[]>();
        waveRowsForDiagnostics.forEach(wave => map.set(wave.waveId, diagnoseWaveRisk(wave, waveContext)));
        return map;
    }, [waveContext, waveRowsForDiagnostics]);

    const actionByWave = useMemo(() => {
        const map = new Map<string, WaveAction[]>();
        waveRowsForDiagnostics.forEach(wave => map.set(wave.waveId, generateWaveActions(wave, riskByWave.get(wave.waveId) ?? [])));
        return map;
    }, [riskByWave, waveRowsForDiagnostics]);

    // 健康度评分 Map<waveId, score>
    const healthScores = useMemo(() => {
        const map = new Map<string, number>();
        waveRowsForDiagnostics.forEach(wave => {
            const risks = riskByWave.get(wave.waveId) ?? [];
            map.set(wave.waveId, calcWaveHealthScore(wave, waveContext, risks).total);
        });
        return map;
    }, [waveRowsForDiagnostics, waveContext, riskByWave]);

    // 采购截止预警（14 天内）
    const upcomingDeadlines = useMemo<UpcomingDeadlineItem[]>(
        () => scanUpcomingDeadlines(waveRowsForDiagnostics, today, 14),
        [waveRowsForDiagnostics, today],
    );

    // OTB 超额归因
    const overrunInfo = useMemo(
        () => attributeOtbOverrun(waveRowsForDiagnostics, waveContext),
        [waveRowsForDiagnostics, waveContext],
    );

    // 已上市波段销售复盘（暂无 executionRecords prop，actualSales 为 null 占位）
    const closedWaveReviews = useMemo<ClosedWaveAchievement[]>(
        () => calcClosedWaveAchievement(waveRowsForDiagnostics, today),
        [waveRowsForDiagnostics, today],
    );

    // 加权毛利率（来自价格结构）
    const weightedGrossMargin = useMemo(() => {
        if (!priceStructure?.priceBandRows?.length) return undefined;
        return calcWeightedGrossMargin(priceStructure.priceBandRows);
    }, [priceStructure]);

    // 销售占比合计（用于验证提示）
    const totalSalesRatio = useMemo(
        () => scopedDisplayRows.reduce((s, row) => s + (row.salesRatio ?? 0), 0),
        [scopedDisplayRows],
    );

    const annualSalesTarget = ssSeasonSalesTarget + awSeasonSalesTarget;

    return (
        <div className="space-y-6">
            {/* 1. 波段决策摘要 */}
            <WaveDecisionSummary
                waves={waveRowsForDiagnostics}
                annualSalesTarget={annualSalesTarget}
                annualOtbBudget={annualOtbBudget}
                currencyUnit={currencyUnit}
                currentDate={today}
                weightedGrossMargin={weightedGrossMargin}
            />

            {/* 采购截止预警 banner */}
            {upcomingDeadlines.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs space-y-1">
                    <div className="font-semibold text-amber-800">⚠ 采购截止预警 — {upcomingDeadlines.length} 项</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {upcomingDeadlines.map((item, i) => (
                            <span key={i} className={`${item.days <= 3 ? 'text-rose-700 font-semibold' : 'text-amber-700'}`}>
                                {item.wave.waveName} · {item.type}
                                {item.days < 0 ? ` (已逾期 ${Math.abs(item.days)} 天)` : item.days === 0 ? ' (今天)' : ` (${item.days} 天后)`}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* OTB 超额归因卡片 */}
            {overrunInfo.isOverrun && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-xs space-y-2">
                    <div className="font-semibold text-rose-800">
                        ✗ OTB 超额归因 — 超出 {fc(overrunInfo.totalOverrun)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {overrunInfo.contributions.map((c, i) => (
                            <div key={i} className="bg-white rounded-md border border-rose-100 p-2 space-y-0.5">
                                <div className="font-semibold text-rose-700">{fc(c.amount)}</div>
                                <div className="text-rose-600">{c.factor}</div>
                                <div className="text-rose-400 text-[10px]">{(c.share * 100).toFixed(0)}% · {c.description}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. 季节卡片 */}
            <SeasonCardsEnhanced
                seasons={seasons}
                seasonSalesTargets={seasonSalesTargets}
                waves={scopedDisplayRows}
                riskByWave={riskByWave}
                actionByWave={actionByWave}
                currencyUnit={currencyUnit}
            />

            {/* 2a. 波段时间轴甘特图 */}
            <WaveTimelineGantt
                waves={scopedDisplayRows}
                currentDate={today}
                currencyUnit={currencyUnit}
            />

            {/* 2b. 偏差矩阵 + 已上市复盘 并排 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <SalesOtbDeviationMatrix
                    waves={scopedDisplayRows}
                    currencyUnit={currencyUnit}
                />
                <ClosedWaveAchievementCards
                    closedReviews={closedWaveReviews}
                    currencyUnit={currencyUnit}
                />
            </div>

            {/* 3. 波段规划表 */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700">波段规划表</div>
                    <div className="flex items-center gap-2">
                        {Math.abs(totalSalesRatio - 1) > 0.005 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${totalSalesRatio > 1.005 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                {totalSalesRatio > 1.005 ? '✗' : '⚠'} 销售占比合计 {(totalSalesRatio * 100).toFixed(1)}%
                                {totalSalesRatio > 1.005 ? ' (超分配)' : ' (未分配)'}
                            </span>
                        )}
                        <button
                            onClick={() => setShowAdvancedCols(v => !v)}
                            className={`text-xs px-2 py-1 rounded-md border transition-colors ${showAdvancedCols ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                            {showAdvancedCols ? '收起高级字段 ▲' : '高级字段 ▸'}
                        </button>
                        <button
                            onClick={() => setHelpOpen(v => !v)}
                            className="text-xs px-2 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100"
                        >
                            ? 说明
                        </button>
                    </div>
                </div>

                {helpOpen && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-xs text-slate-700 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-sky-800">字段说明</span>
                            <button onClick={() => setHelpOpen(false)} className="text-sky-500 hover:text-sky-700">✕ 关闭</button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <div><span className="font-medium">健康度</span>: 0-100 综合评分 = 销售达成(25) + 采购节奏(25) + 毛利合规(25) + 风险反向(25)</div>
                            <div><span className="font-medium">vs计划</span>: (预测销售 - 计划销售) / 计划销售</div>
                            <div><span className="font-medium">YoY</span>: (预测销售 - 去年同期) / 去年同期</div>
                            <div><span className="font-medium">MoM</span>: (预测销售 - 上期) / 上期</div>
                            <div><span className="font-medium">预算差异</span>: 预测 OTB - 计划 OTB（正=超额，负=节余）</div>
                            <div><span className="font-medium">均深</span>: 每款平均备货双数</div>
                        </div>
                    </div>
                )}

                {compareMode !== 'none' && (
                    <p className="text-xs text-slate-500">
                        {compareMode === 'plan' && '对比模式: 计划 — 仅显示 vs计划 列'}
                        {compareMode === 'yoy' && '对比模式: 同比 — 仅显示 YoY 列'}
                        {compareMode === 'mom' && '对比模式: 环比 — 仅显示 MoM 列'}
                    </p>
                )}
                <WavePlanningTable
                    rows={scopedDisplayRows}
                    riskByWave={riskByWave}
                    actionByWave={actionByWave}
                    healthScores={healthScores}
                    updateWave={updateWave}
                    fc={fc}
                    isLocked={isLocked}
                    compareMode={compareMode}
                    showAdvancedCols={showAdvancedCols}
                />
            </div>

            {/* 3b. 波段预算 vs 企划对比 */}
            {scopedDisplayRows.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-sm font-semibold text-slate-700">波段预算 vs 企划计划对比</h3>
                        <span className="text-[11px] text-slate-400">· OTB 预算能否支撑 SKU 结构目标</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-max w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 text-[11px]">
                                    <th className="py-2 px-3 text-left font-medium">波段</th>
                                    <th className="py-2 px-3 text-right font-medium">计划SKU数</th>
                                    <th className="py-2 px-3 text-right font-medium">计划色数</th>
                                    <th className="py-2 px-3 text-right font-medium">计划OTB</th>
                                    <th className="py-2 px-3 text-right font-medium">预测OTB</th>
                                    <th className="py-2 px-3 text-right font-medium">OTB偏差</th>
                                    <th className="py-2 px-3 text-right font-medium">每款均摊</th>
                                    <th className="py-2 px-3 text-center font-medium">状态</th>
                                    <th className="py-2 px-3 text-left font-medium">建议</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scopedDisplayRows.map(row => {
                                    const planOtb = row.planOtbBudget;
                                    const forecastOtb = row.forecastOtbBudget;
                                    const diff = forecastOtb - planOtb;
                                    const diffRate = planOtb > 0 ? diff / planOtb : 0;
                                    const skuCount = Math.max(1, row.targetSkuCount || row.plannedStyleCount || 1);
                                    const perSku = forecastOtb > 0 ? forecastOtb / skuCount : 0;
                                    const isOver = diffRate > 0.1;
                                    const isUnder = diffRate < -0.1;
                                    const suggestion = isOver
                                        ? `超配 ${(diffRate * 100).toFixed(0)}%，建议减少 SKU 数或缩减款深`
                                        : isUnder
                                        ? `欠配 ${Math.abs(diffRate * 100).toFixed(0)}%，建议追加预算或削减 SKU 计划`
                                        : '预算与企划基本匹配';
                                    return (
                                        <tr key={row.id} className={`border-b border-slate-50 ${isOver ? 'bg-rose-50/30' : isUnder ? 'bg-amber-50/30' : ''}`}>
                                            <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">{row.season} {row.wave}</td>
                                            <td className="py-2 px-3 text-right text-slate-600">{row.targetSkuCount || row.plannedStyleCount || '—'}</td>
                                            <td className="py-2 px-3 text-right text-slate-600">{row.targetColorCount || '—'}</td>
                                            <td className="py-2 px-3 text-right text-slate-500">{fc(planOtb)}</td>
                                            <td className="py-2 px-3 text-right font-semibold text-sky-700">{fc(forecastOtb)}</td>
                                            <td className={`py-2 px-3 text-right font-semibold ${isOver ? 'text-rose-600' : isUnder ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {diff >= 0 ? '+' : ''}{fc(diff)} ({diff >= 0 ? '+' : ''}{(diffRate * 100).toFixed(0)}%)
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-500">{fc(perSku)}</td>
                                            <td className="py-2 px-3 text-center">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                    isOver ? 'bg-rose-100 text-rose-700' :
                                                    isUnder ? 'bg-amber-100 text-amber-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {isOver ? '超配' : isUnder ? '欠配' : '匹配'}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-500 whitespace-nowrap">{suggestion}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. 风险和动作 */}
            <WaveRiskActionPanel
                waves={waveRowsForDiagnostics}
                annualSalesTarget={annualSalesTarget}
                annualOtbBudget={annualOtbBudget}
                currencyUnit={currencyUnit}
                currentDate={today}
            />

            {/* 5. 输出联动 */}
            <WaveOutputBridgePanel
                waves={waveRowsForDiagnostics}
                currencyUnit={currencyUnit}
                onJumpToTab={onJumpToTab}
            />
        </div>
    );
}
