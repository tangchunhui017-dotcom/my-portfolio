'use client';
/**
 * src/components/otb/panels/wave/WaveDecisionSummary.tsx
 * 波段 OTB 决策摘要 — 8 张精简 KPI 卡（无冗余、无 emoji）
 */

import React, { useMemo } from 'react';
import { formatCurrency, safeNumber } from '@/utils/otbCalculations';
import {
    calcWaveBudgetSummary,
    type WaveContext,
    type WaveRow,
} from '@/utils/otbWavePlanning';
import type { CurrencyUnit } from '@/utils/otbCalculations';

interface WaveDecisionSummaryProps {
    waves: WaveRow[];
    annualSalesTarget: number;
    annualOtbBudget: number;
    currencyUnit: CurrencyUnit;
    currentDate?: Date;
    weightedGrossMargin?: number; // 来自价格&结构面板
}

// ─── 通用 KPI 卡片 ─────────────────────────────────────────────

interface KPICardProps {
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    tone?: 'default' | 'success' | 'warning' | 'danger';
}

function KPICard({ label, value, sub, tone = 'default' }: KPICardProps) {
    const bg = {
        default:  'bg-white border-slate-100',
        success:  'bg-emerald-50 border-emerald-200',
        warning:  'bg-amber-50 border-amber-200',
        danger:   'bg-rose-50 border-rose-200',
    }[tone];
    const textMain = {
        default:  'text-slate-700',
        success:  'text-emerald-700',
        warning:  'text-amber-700',
        danger:   'text-rose-700',
    }[tone];

    return (
        <div className={`rounded-xl border ${bg} p-3 shadow-sm space-y-1.5`}>
            <div className="text-[10px] text-slate-400 font-medium">{label}</div>
            <div className={`text-sm font-bold leading-tight ${textMain}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-500 leading-snug">{sub}</div>}
        </div>
    );
}

export default function WaveDecisionSummary({
    waves,
    annualSalesTarget,
    annualOtbBudget,
    currencyUnit,
    currentDate = new Date(),
    weightedGrossMargin,
}: WaveDecisionSummaryProps) {
    const context: WaveContext = useMemo(() => ({
        annualSalesTarget,
        annualOtbBudget,
        allWaves: waves,
        currentDate,
        currencyUnit,
    }), [annualSalesTarget, annualOtbBudget, waves, currentDate, currencyUnit]);

    const summary = useMemo(
        () => calcWaveBudgetSummary(waves, annualSalesTarget, annualOtbBudget, context),
        [waves, annualSalesTarget, annualOtbBudget, context],
    );

    // 生命周期分类
    const lifecycle = useMemo(() => {
        const launched: WaveRow[] = [];
        const current: WaveRow[] = [];
        const future: WaveRow[] = [];
        for (const w of waves) {
            const d = Math.floor((new Date(w.launchDate).getTime() - currentDate.getTime()) / 86400000);
            if (d < 0) launched.push(w);
            else if (d <= 120) current.push(w);
            else future.push(w);
        }
        return { launched, current, future };
    }, [waves, currentDate]);

    // 14 天内截止日预警数
    const urgentDeadlineCount = useMemo(() => {
        let count = 0;
        for (const w of lifecycle.current) {
            const check = (d?: string) => {
                if (!d) return;
                const days = Math.floor((new Date(d).getTime() - currentDate.getTime()) / 86400000);
                if (days >= -3 && days <= 14) count++;
            };
            check(w.orderDeadline);
            check(w.warehouseDeadline);
        }
        return count;
    }, [lifecycle.current, currentDate]);

    // 最近上市波段
    const nearestWave = useMemo(() => {
        return lifecycle.current
            .map(w => ({
                wave: w,
                days: Math.floor((new Date(w.launchDate).getTime() - currentDate.getTime()) / 86400000),
            }))
            .sort((a, b) => a.days - b.days)[0] ?? null;
    }, [lifecycle.current, currentDate]);

    const fc = (v: number) => formatCurrency(v, currencyUnit);

    const allocatedPct = annualOtbBudget > 0
        ? ((summary.allocatedOtb / annualOtbBudget) * 100).toFixed(1)
        : '--';
    const otbOverrun = summary.allocatedOtb > annualOtbBudget;
    const otbGapAmt = Math.abs(summary.otbGap);
    const salesAllocPct = annualSalesTarget > 0
        ? ((summary.allocatedSales / annualSalesTarget) * 100).toFixed(1)
        : '--';
    const salesOk = summary.salesGapSign === 'allocated';

    // 高风险波段名（OTB 超出计划 ≥15% 的波段）
    const highRiskNames = useMemo(() => {
        return waves
            .filter(w => {
                const forecast = safeNumber(w.forecastOtbBudget) ?? 0;
                const plan = safeNumber(w.planOtbBudget) ?? forecast;
                return plan > 0 && forecast > plan * 1.15;
            })
            .slice(0, 3)
            .map(w => w.waveName);
    }, [waves]);

    return (
        <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-700">波段 OTB 决策摘要</div>
            <div className="grid grid-cols-4 gap-2 xl:grid-cols-8">

                {/* [1] 销售目标分配 */}
                <KPICard
                    label="销售目标分配"
                    value={fc(annualSalesTarget)}
                    sub={`已分配 ${salesAllocPct}% ${salesOk ? '✓' : '⚠'}`}
                    tone={salesOk ? 'success' : summary.salesGapSign === 'overallocated' ? 'danger' : 'warning'}
                />

                {/* [2] OTB 预算分配 */}
                <KPICard
                    label="OTB 预算分配"
                    value={fc(annualOtbBudget)}
                    sub={
                        <span className={otbOverrun ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>
                            已分配 {fc(summary.allocatedOtb)} ({allocatedPct}%)
                            {otbOverrun && ` ✗ 超 ${fc(otbGapAmt)}`}
                        </span>
                    }
                    tone={otbOverrun ? 'danger' : 'success'}
                />

                {/* [3] 已上市波段 */}
                <KPICard
                    label="已上市波段"
                    value={`${lifecycle.launched.length} 个`}
                    sub={lifecycle.launched.length > 0
                        ? lifecycle.launched.map(w => w.waveName).slice(0, 3).join(' / ')
                        : '暂无'
                    }
                />

                {/* [4] 当前执行 */}
                <KPICard
                    label="当前执行"
                    value={`${lifecycle.current.length} 个`}
                    sub={urgentDeadlineCount > 0
                        ? <span className="text-amber-600">⚠ {urgentDeadlineCount} 项 14 天内截止</span>
                        : lifecycle.current.map(w => w.waveName).slice(0, 2).join(' / ')
                    }
                    tone={urgentDeadlineCount > 0 ? 'warning' : 'default'}
                />

                {/* [5] 未来计划 */}
                <KPICard
                    label="未来计划"
                    value={`${lifecycle.future.length} 个`}
                    sub={lifecycle.future.map(w => w.waveName).slice(0, 3).join(' / ')}
                />

                {/* [6] 加权毛利率 */}
                <KPICard
                    label="加权毛利率"
                    value={weightedGrossMargin !== undefined
                        ? `${(weightedGrossMargin * 100).toFixed(1)}%`
                        : '--'
                    }
                    sub="来自价格&结构"
                    tone={weightedGrossMargin !== undefined
                        ? weightedGrossMargin >= 0.40 ? 'success'
                        : weightedGrossMargin >= 0.35 ? 'warning' : 'danger'
                        : 'default'
                    }
                />

                {/* [7] 高风险波段 */}
                <KPICard
                    label="高风险波段"
                    value={`${summary.highRiskWaveCount} 个`}
                    sub={highRiskNames.length > 0 ? highRiskNames.join(' / ') : '暂无高风险'}
                    tone={summary.highRiskWaveCount > 0 ? 'danger' : 'success'}
                />

                {/* [8] 最近上市 */}
                <KPICard
                    label="最近上市"
                    value={nearestWave ? nearestWave.wave.waveName : '--'}
                    sub={nearestWave
                        ? <span className={nearestWave.days <= 30 ? 'text-amber-600 font-semibold' : ''}>
                            还有 {nearestWave.days} 天
                            {nearestWave.wave.orderDeadline && ` · 下单截止 ${nearestWave.wave.orderDeadline}`}
                          </span>
                        : '无待上市波段'
                    }
                    tone={nearestWave
                        ? nearestWave.days <= 14 ? 'danger' : nearestWave.days <= 30 ? 'warning' : 'default'
                        : 'default'
                    }
                />
            </div>
        </div>
    );
}
