'use client';
/**
 * src/components/otb/OtbTab.tsx
 * 鞋类品牌商品企划采购预算决策工作台 — V7.0
 *
 * 子视图：年度总控 · 月度滚动 · 波段预算 · 品类&款深
 *         价格&结构 · 渠道分配 · 执行跟踪 · 数据导入
 *
 * 页面顺序：annual → monthly → wave → category → pricestructure → channel → execution → import
 */
import { useState, useCallback, useMemo } from 'react';
import AnnualOTBControlPanel, { type FourSeasonTargets } from './panels/AnnualOTBControlPanel';
import MonthlyOTBRollingPanel from './panels/MonthlyOTBRollingPanel';
import WaveOTBPlanningPanel from './panels/WaveOTBPlanningPanel';
import CategoryDepthPlanningPanel from './panels/CategoryDepthPlanningPanel';
import ChannelEcommerceOTBPanel from './panels/ChannelEcommerceOTBPanel';
import OTBExecutionTrackingPanel from './panels/OTBExecutionTrackingPanel';
import OTBDataImportPanel from './panels/OTBDataImportPanel';
import executionDefaultData from '../../../data/otb/otb_execution_tracking.json';
import type { ExecutionTrackingInput } from '@/utils/otbCalculations';
import OTBPriceStructurePanel, { createOTBPriceStructureOutput, type OTBPriceStructureOutput } from './panels/OTBPriceStructurePanel';
import OTBContextSummary, { DEFAULT_OTB_LOCAL_SETTINGS, type OTBLocalSettings } from './OTBContextSummary';
import OTBGovernancePanel, { type OTBVersionRecord } from './OTBGovernancePanel';
import { calcWaveOTB, generateOTBInsights, type WaveOTBInput } from '@/utils/otbCalculations';
import { useOtbBusinessContext } from '@/hooks/useOtbBusinessContext';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { getWaveOtbInputs } from '@/utils/wavePlanMaster';
import versionsRaw from '../../../data/otb/otb_versions.json';
import annualOtbDefaults from '../../../data/otb/otb_assumptions.json';
import type { OtbJumpHandler, OtbNavigationContext } from './types';

type OtbSubView = 'annual' | 'monthly' | 'wave' | 'pricestructure' | 'category' | 'channel' | 'execution' | 'import';

const SUB_VIEWS: { key: OtbSubView; label: string; icon: string }[] = [
    { key: 'annual',         label: '年度总控',  icon: '🎯' },
    { key: 'monthly',        label: '月度滚动',  icon: '📆' },
    { key: 'wave',           label: '波段预算',  icon: '🌊' },
    { key: 'category',       label: '品类&款深', icon: '📐' },
    { key: 'pricestructure', label: '价格&结构', icon: '🏷️' },
    { key: 'channel',        label: '渠道分配',  icon: '🏪' },
    { key: 'execution',      label: '执行跟踪',  icon: '✅' },
    { key: 'import',         label: '数据导入',  icon: '📥' },
];

const SCENARIO_TARGET_FACTORS: Record<OTBLocalSettings['scenario'], number> = {
    conservative: 0.9,
    standard: 1,
    optimistic: 1.08,
    sprint: 1.15,
    clearance: 0.85,
};

interface OtbTabProps {
    filters: DashboardFilters;
    compareMode?: CompareMode;
    /** 跳转到 Dashboard 其他主模块（cashflow / forecast / inventory / profit-loss 等） */
    onJumpToTab?: OtbJumpHandler;
}

export default function OtbTab({ filters, compareMode = 'none', onJumpToTab }: OtbTabProps) {
    const [subView, setSubView]     = useState<OtbSubView>('annual');
    const [settings, setSettings]   = useState<OTBLocalSettings>(DEFAULT_OTB_LOCAL_SETTINGS);
    const [waveInputs, setWaveInputs] = useState<WaveOTBInput[]>(() => getWaveOtbInputs());
    const [priceStructure, setPriceStructure] = useState<OTBPriceStructureOutput | null>(null);
    const [lastNavigationContext, setLastNavigationContext] = useState<OtbNavigationContext | null>(null);
    const businessContext = useOtbBusinessContext(filters, settings);

    // 版本治理状态（提升至此，以便派生锁定信息）
    const [localVersions, setLocalVersions] = useState<OTBVersionRecord[]>(() => {
        if (typeof window === 'undefined') return versionsRaw as OTBVersionRecord[];
        try {
            const saved = localStorage.getItem('otb-versions-state');
            return saved ? (JSON.parse(saved) as OTBVersionRecord[]) : (versionsRaw as OTBVersionRecord[]);
        } catch {
            return versionsRaw as OTBVersionRecord[];
        }
    });

    const handleVersionsChange = useCallback((versions: OTBVersionRecord[]) => {
        setLocalVersions(versions);
        try { localStorage.setItem('otb-versions-state', JSON.stringify(versions)); } catch { /* noop */ }
    }, []);

    const currentVersion = localVersions.find(v => v.versionId === settings.version)
        ?? localVersions.find(v => v.versionId === 'approved')
        ?? localVersions[0];
    const isOtbLocked = !['draft', 'rolling_adjustment'].includes(currentVersion?.status ?? 'locked');
    // 执行跟踪记录（提升 state，支持 CSV 导入联动）
    const [executionRecords, setExecutionRecords] = useState<ExecutionTrackingInput[]>(
        executionDefaultData as ExecutionTrackingInput[]
    );

    // SS/AW targets driven by annual panel
    const [ssSeasonTarget, setSsSeasonTarget] = useState<number>(20000000);
    const [awSeasonTarget, setAwSeasonTarget] = useState<number>(30000000);
    const [annualApprovedBudget, setAnnualApprovedBudget] = useState<number>(annualOtbDefaults.approvedBudget);

    // Four-season individual targets (spring/summer/autumn/winter)
    const [fourSeasonTargets, setFourSeasonTargets] = useState<FourSeasonTargets>({
        spring: 10000000, summer: 14000000, autumn: 11000000, winter: 15000000,
    });

    const handleComputedChange = useCallback((ss: number, aw: number, fourSeasons: FourSeasonTargets, approvedBudget?: number) => {
        setSsSeasonTarget(ss);
        setAwSeasonTarget(aw);
        setFourSeasonTargets(fourSeasons);
        if (typeof approvedBudget === 'number') setAnnualApprovedBudget(approvedBudget);
    }, []);

    const currencyUnit = settings.currencyUnit;
    const scenarioFactor = SCENARIO_TARGET_FACTORS[settings.scenario] ?? 1;
    const adjustedSsSeasonTarget = ssSeasonTarget * scenarioFactor;
    const adjustedAwSeasonTarget = awSeasonTarget * scenarioFactor;
    const adjustedAnnualApprovedBudget = annualApprovedBudget * scenarioFactor;
    const adjustedFourSeasonTargets = useMemo<FourSeasonTargets>(() => ({
        spring: fourSeasonTargets.spring * scenarioFactor,
        summer: fourSeasonTargets.summer * scenarioFactor,
        autumn: fourSeasonTargets.autumn * scenarioFactor,
        winter: fourSeasonTargets.winter * scenarioFactor,
    }), [fourSeasonTargets, scenarioFactor]);

    const waveRows = useMemo(
        () => calcWaveOTB(waveInputs, adjustedSsSeasonTarget, adjustedAwSeasonTarget),
        [waveInputs, adjustedSsSeasonTarget, adjustedAwSeasonTarget],
    );

    const defaultPriceStructure = useMemo(
        () => createOTBPriceStructureOutput(businessContext, waveInputs),
        [businessContext, waveInputs],
    );
    const effectivePriceStructure = priceStructure ?? defaultPriceStructure;

    const insights = useMemo(
        () => generateOTBInsights({ waves: waveRows }),
        [waveRows],
    );

    // 四季销售目标，传给波段拆解面板的季节上下文条
    const seasonSalesTargets = useMemo<Record<string, number>>(() => ({
        ...adjustedFourSeasonTargets,
    }), [adjustedFourSeasonTargets]);

    /**
     * OTB 内部跳转处理器
     * - OTB 子视图键名（annual/monthly/wave/category/pricestructure/channel/execution）→ setSubView
     * - 外部模块键名（cashflow/forecast/inventory/profit-loss 等）→ 向上冒泡给 Dashboard
     */
    const persistNavigationContext = useCallback((context: OtbNavigationContext | null) => {
        const nextContext = context
            ? { ...context, createdAt: context.createdAt ?? new Date().toISOString() }
            : null;
        setLastNavigationContext(nextContext);
        if (typeof window === 'undefined') return;
        try {
            if (nextContext) {
                sessionStorage.setItem('otb-navigation-context', JSON.stringify(nextContext));
            } else {
                sessionStorage.removeItem('otb-navigation-context');
            }
            window.dispatchEvent(new CustomEvent<OtbNavigationContext | null>('otb-navigation-context-change', {
                detail: nextContext,
            }));
        } catch {
            /* noop */
        }
    }, []);

    const handleOtbJump = useCallback((tab: string, context?: OtbNavigationContext) => {
        const otbSubViews: OtbSubView[] = ['annual', 'monthly', 'wave', 'category', 'pricestructure', 'channel', 'execution', 'import'];
        const normalizedContext = context
            ? { ...context, source: context.source ?? 'otb', targetModule: tab }
            : null;
        persistNavigationContext(normalizedContext);
        // AnnualPanel 使用 'price' 代表价格结构子视图
        if (tab === 'price') { setSubView('pricestructure'); return; }
        if ((otbSubViews as string[]).includes(tab)) {
            setSubView(tab as OtbSubView);
        } else {
            onJumpToTab?.(tab, normalizedContext ?? undefined);
        }
    }, [onJumpToTab, persistNavigationContext]);

    return (
        <div className="space-y-3">
            {/* 顶部标题与轻量级子导航 */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">鞋类品牌商品企划采购预算决策工作台</h2>
                <div className="flex items-center gap-4 mt-3 sm:mt-0 overflow-x-auto no-scrollbar">
                    {SUB_VIEWS.map(v => (
                        <button
                            key={v.key}
                            onClick={() => setSubView(v.key)}
                            className={`flex items-center gap-1 text-sm font-medium whitespace-nowrap pb-1 border-b-2 transition-colors ${
                                subView === v.key 
                                    ? 'border-sky-500 text-sky-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }`}
                        >
                            <span className="opacity-70 text-[10px]">{v.icon}</span>
                            <span>{v.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 统一的 OTB 顶部控制台 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                <OTBContextSummary
                    filters={filters}
                    settings={settings}
                    onSettingsChange={setSettings}
                />
                <OTBGovernancePanel
                    settings={settings}
                    localVersions={localVersions}
                    onVersionsChange={handleVersionsChange}
                />
                {lastNavigationContext && (
                    <div className="flex flex-wrap items-center gap-2 bg-sky-50 px-5 py-2.5 text-xs text-sky-700 border-t border-sky-100">
                        <span className="font-semibold">联动上下文</span>
                        <span>{lastNavigationContext.subject ?? 'OTB 业务对象'}</span>
                        {lastNavigationContext.waveId && <span>波段 {lastNavigationContext.waveId}</span>}
                        {lastNavigationContext.category && <span>品类 {lastNavigationContext.category}</span>}
                        {lastNavigationContext.recommendedAction && <span>建议 {lastNavigationContext.recommendedAction}</span>}
                        <span className="text-sky-500">已写入 sessionStorage，目标模块可读取参数。</span>
                    </div>
                )}
                {isOtbLocked && (
                    <div className="flex items-center gap-2 bg-rose-50 px-5 py-2.5 text-xs text-rose-700 border-t border-rose-100">
                        <span className="text-sm">🔒</span>
                        <span>
                            版本已锁定（{currentVersion?.versionName}）。核心预算字段只读，如需调整请在版本治理中提交变更申请。
                        </span>
                    </div>
                )}
            </div>



            {/* 面板内容区 */}
            {subView === 'annual' && (
                <AnnualOTBControlPanel
                    currencyUnit={currencyUnit}
                    filters={filters}
                    onComputedChange={handleComputedChange}
                    isLocked={isOtbLocked}
                    compareMode={compareMode}
                    onJumpToTab={handleOtbJump}
                />
            )}
            {subView === 'monthly' && (
                <MonthlyOTBRollingPanel
                    currencyUnit={currencyUnit}
                    filters={filters}
                    isLocked={isOtbLocked}
                    versionStatus={currentVersion?.status}
                    versionName={currentVersion?.versionName}
                    onJumpToTab={handleOtbJump}
                />
            )}
            {subView === 'wave' && (
                <WaveOTBPlanningPanel
                    currencyUnit={currencyUnit}
                    ssSeasonSalesTarget={adjustedSsSeasonTarget}
                    awSeasonSalesTarget={adjustedAwSeasonTarget}
                    waves={waveInputs}
                    onWavesChange={setWaveInputs}
                    isLocked={isOtbLocked}
                    seasonSalesTargets={seasonSalesTargets}
                    annualOtbBudget={adjustedAnnualApprovedBudget}
                    compareMode={compareMode}
                    filters={filters}
                    onJumpToTab={handleOtbJump}
                />
            )}
            {subView === 'pricestructure' && (
                <OTBPriceStructurePanel
                    currencyUnit={currencyUnit}
                    filters={filters}
                    businessContext={businessContext}
                    ssSeasonSalesTarget={adjustedSsSeasonTarget}
                    awSeasonSalesTarget={adjustedAwSeasonTarget}
                    waves={waveInputs}
                    onStructureChange={setPriceStructure}
                    isLocked={isOtbLocked}
                    onJumpToTab={handleOtbJump}
                />
            )}
            {subView === 'category' && (
                <CategoryDepthPlanningPanel
                    currencyUnit={currencyUnit}
                    ssSeasonSalesTarget={adjustedSsSeasonTarget}
                    awSeasonSalesTarget={adjustedAwSeasonTarget}
                    waves={waveInputs}
                    filters={filters}
                    priceStructure={effectivePriceStructure}
                    isLocked={isOtbLocked}
                    onJumpToTab={handleOtbJump}
                />
            )}
            {subView === 'channel' && (
                <ChannelEcommerceOTBPanel
                    currencyUnit={currencyUnit}
                    filters={filters}
                    onJumpToTab={handleOtbJump}
                />
            )}
            {subView === 'execution' && (
                <OTBExecutionTrackingPanel
                    currencyUnit={currencyUnit}
                    priceStructure={effectivePriceStructure}
                    records={executionRecords}
                    onRecordsChange={setExecutionRecords}
                    onJumpToTab={handleOtbJump}
                />
            )}
            {subView === 'import' && (
                <OTBDataImportPanel
                    currencyUnit={currencyUnit}
                    onExecutionImport={setExecutionRecords}
                    onWavePlanImport={setWaveInputs}
                    onMonthlySalesImport={() => {
                        /* 月度销售实际值导入：数据传递到月度滚动面板通过 localStorage 或 state lift */
                    }}
                />
            )}

            {/* 全局诊断洞察 */}
            {insights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.slice(0, 2).map((item, index) => (
                        <div
                            key={`${item.title}-${index}`}
                            className={`rounded-xl border px-4 py-3 text-xs ${
                                item.level === 'danger'
                                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                                    : item.level === 'warn'
                                      ? 'bg-amber-50 border-amber-100 text-amber-700'
                                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            }`}
                        >
                            <p className="font-semibold">{item.title}</p>
                            <p className="mt-1 opacity-90">{item.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
