'use client';
/**
 * src/components/otb/OtbTab.tsx
 * OTB 采购测算工作台 — V6.0
 *
 * 8 个子视图：
 * 1. 年度OTB总控   2. 月度OTB滚动   3. 季节日历（新）
 * 4. 季节/波段拆解  5. 品类/款数/深度  6. 渠道/电商模型
 * 7. 执行跟踪      8. 现金流预测
 */
import { useState, useCallback, useMemo } from 'react';
import AnnualOTBControlPanel, { type FourSeasonTargets } from './panels/AnnualOTBControlPanel';
import MonthlyOTBRollingPanel from './panels/MonthlyOTBRollingPanel';
import SeasonCalendarPanel from './panels/SeasonCalendarPanel';
import WaveOTBPlanningPanel from './panels/WaveOTBPlanningPanel';
import CategoryDepthPlanningPanel from './panels/CategoryDepthPlanningPanel';
import ChannelEcommerceOTBPanel from './panels/ChannelEcommerceOTBPanel';
import OTBExecutionTrackingPanel from './panels/OTBExecutionTrackingPanel';
import CashflowSubView from './CashflowSubView';
import OTBContextSummary, { DEFAULT_OTB_LOCAL_SETTINGS, type OTBLocalSettings } from './OTBContextSummary';
import OTBGovernancePanel from './OTBGovernancePanel';
import { calcWaveOTB, generateOTBInsights, type WaveOTBInput } from '@/utils/otbCalculations';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import defaultWaves from '../../../data/otb/wave_otb_plan.json';

type OtbSubView = 'annual' | 'monthly' | 'seasons' | 'wave' | 'category' | 'channel' | 'execution' | 'cashflow';

const SUB_VIEWS: { key: OtbSubView; label: string; icon: string }[] = [
    { key: 'annual',    label: '年度总控',  icon: '🎯' },
    { key: 'monthly',   label: '月度滚动',  icon: '📆' },
    { key: 'seasons',   label: '季节日历',  icon: '🗓️' },
    { key: 'wave',      label: '波段拆解',  icon: '🌊' },
    { key: 'category',  label: '品类/款深', icon: '📐' },
    { key: 'channel',   label: '渠道模型',  icon: '🏪' },
    { key: 'execution', label: '执行跟踪',  icon: '✅' },
    { key: 'cashflow',  label: '现金流',    icon: '💧' },
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
}

export default function OtbTab({ filters }: OtbTabProps) {
    const [subView, setSubView]     = useState<OtbSubView>('annual');
    const [settings, setSettings]   = useState<OTBLocalSettings>(DEFAULT_OTB_LOCAL_SETTINGS);
    const [waveInputs, setWaveInputs] = useState<WaveOTBInput[]>(defaultWaves as WaveOTBInput[]);

    // SS/AW targets driven by annual panel
    const [ssSeasonTarget, setSsSeasonTarget] = useState<number>(20000000);
    const [awSeasonTarget, setAwSeasonTarget] = useState<number>(30000000);

    // Four-season individual targets (spring/summer/autumn/winter)
    const [fourSeasonTargets, setFourSeasonTargets] = useState<FourSeasonTargets>({
        spring: 10000000, summer: 14000000, autumn: 11000000, winter: 15000000,
    });

    const handleComputedChange = useCallback((ss: number, aw: number, fourSeasons: FourSeasonTargets) => {
        setSsSeasonTarget(ss);
        setAwSeasonTarget(aw);
        setFourSeasonTargets(fourSeasons);
    }, []);

    const currencyUnit = settings.currencyUnit;
    const scenarioFactor = SCENARIO_TARGET_FACTORS[settings.scenario] ?? 1;
    const adjustedSsSeasonTarget = ssSeasonTarget * scenarioFactor;
    const adjustedAwSeasonTarget = awSeasonTarget * scenarioFactor;
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

    const insights = useMemo(
        () => generateOTBInsights({ waves: waveRows }),
        [waveRows],
    );

    // Season sales targets map for SeasonCalendarPanel
    const seasonSalesTargets = useMemo<Record<string, number>>(() => ({
        ...adjustedFourSeasonTargets,
    }), [adjustedFourSeasonTargets]);

    return (
        <div className="space-y-3">
            {/* 顶部标题 */}
            <div>
                <h2 className="text-base font-bold text-slate-800">OTB 采购测算工作台</h2>
                <p className="text-xs text-slate-400 mt-0.5">继承商品企划全局筛选，OTB 内部仅维护版本、场景、状态和计算口径</p>
            </div>

            {/* OTB 上下文摘要：全局筛选只读，OTB 专属设置可调整 */}
            <OTBContextSummary
                filters={filters}
                settings={settings}
                onSettingsChange={setSettings}
            />

            <OTBGovernancePanel settings={settings} />

            {/* 子视图 Tab 栏 */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3 overflow-x-auto">
                {SUB_VIEWS.map(v => (
                    <button
                        key={v.key}
                        onClick={() => setSubView(v.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-all flex-shrink-0 ${subView === v.key ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'}`}
                    >
                        <span>{v.icon}</span>
                        <span>{v.label}</span>
                    </button>
                ))}
            </div>

            {/* 面板内容区 */}
            {subView === 'annual' && (
                <AnnualOTBControlPanel
                    currencyUnit={currencyUnit}
                    onComputedChange={handleComputedChange}
                />
            )}
            {subView === 'monthly' && (
                <MonthlyOTBRollingPanel currencyUnit={currencyUnit} />
            )}
            {subView === 'seasons' && (
                <SeasonCalendarPanel
                    currencyUnit={currencyUnit}
                    seasonSalesTargets={seasonSalesTargets}
                />
            )}
            {subView === 'wave' && (
                <WaveOTBPlanningPanel
                    currencyUnit={currencyUnit}
                    ssSeasonSalesTarget={adjustedSsSeasonTarget}
                    awSeasonSalesTarget={adjustedAwSeasonTarget}
                    waves={waveInputs}
                    onWavesChange={setWaveInputs}
                />
            )}
            {subView === 'category' && (
                <CategoryDepthPlanningPanel
                    currencyUnit={currencyUnit}
                    ssSeasonSalesTarget={adjustedSsSeasonTarget}
                    awSeasonSalesTarget={adjustedAwSeasonTarget}
                    waves={waveInputs}
                    filters={filters}
                />
            )}
            {subView === 'channel' && (
                <ChannelEcommerceOTBPanel currencyUnit={currencyUnit} filters={filters} />
            )}
            {subView === 'execution' && (
                <OTBExecutionTrackingPanel currencyUnit={currencyUnit} />
            )}
            {subView === 'cashflow' && <CashflowSubView />}

            {/* 全局诊断洞察（非现金流页时显示） */}
            {subView !== 'cashflow' && insights.length > 0 && (
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
