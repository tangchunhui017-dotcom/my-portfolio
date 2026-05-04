import {
    DASHBOARD_SEASON_LIFECYCLE_STANDARDS,
    type DashboardSeasonLifecycleSeason,
} from '@/config/dashboardSeasonLifecycleStandards';

export type DashboardSeasonTransitionPhaseStandard = 'launch' | 'main_sell' | 'handoff';
export type DashboardSeasonTransitionAlertStandard = 'handoff_gap' | 'inventory_drag' | 'launch_laggard';
export type DashboardSeasonTransitionRoleStandard = 'prev' | 'current' | 'next' | 'carryover' | 'non_main';

type DashboardSeasonTransitionTargetRange = {
    min: number;
    target: number;
    max: number;
};

function roundStandardValue(value: number, digits = 4) {
    return Number(value.toFixed(digits));
}

function resolveLifecyclePhaseAverageShare(phaseId: string) {
    const seasons = Object.values(DASHBOARD_SEASON_LIFECYCLE_STANDARDS);
    const total = seasons.reduce((sum, season) => {
        const phase = season.phases.find((item) => item.id === phaseId);
        return sum + (phase?.salesShare || 0);
    }, 0);
    return seasons.length ? roundStandardValue(total / seasons.length) : 0;
}

const CARRYOVER_SALES_SHARE_RANGE: DashboardSeasonTransitionTargetRange = {
    min: 0.2,
    target: 0.225,
    max: 0.25,
};

export const DASHBOARD_SEASON_TRANSITION_OTB_PARAMETER_STANDARD = {
    trackMix: {
        carryover: {
            skuShareRange: {
                min: 0.15,
                target: 0.18,
                max: 0.2,
            },
            salesShareRange: CARRYOVER_SALES_SHARE_RANGE,
        },
        seasonalTrackSalesShareTarget: roundStandardValue(1 - CARRYOVER_SALES_SHARE_RANGE.target),
    },
    seasonalTrackSalesWeights: {
        Q1: 0.12,
        Q2: 0.28,
        Q3: 0.2,
        Q4: 0.4,
    } as Record<DashboardSeasonLifecycleSeason, number>,
} as const;

export const DASHBOARD_SEASON_TRANSITION_PHASE_PARAMETER_STANDARD = {
    lifecycleContributionShares: {
        teaser: resolveLifecyclePhaseAverageShare('teaser'),
        ramp: resolveLifecyclePhaseAverageShare('ramp'),
        peak: resolveLifecyclePhaseAverageShare('peak'),
        steady: resolveLifecyclePhaseAverageShare('steady'),
        clearance: resolveLifecyclePhaseAverageShare('clearance'),
    },
    monthlyHandoffPhaseMapping: {
        launch: ['teaser', 'ramp'],
        main_sell: ['peak', 'steady'],
        handoff: ['steady', 'clearance'],
    } as Record<DashboardSeasonTransitionPhaseStandard, string[]>,
} as const;

export const DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD = {
    amountAchievement: {
        healthyMin: 0.92,
        warningMin: 0.85,
    },
    shareGap: {
        healthyPp: 0.03,
        warningPp: 0.05,
        riskPp: 0.08,
        mainChainWeakPp: 0.06,
        nextLaunchWarningPp: 0.04,
    },
    sellThrough: {
        shortageLikeAboveTarget: 0.05,
        weakBelowTarget: 0.08,
        floorOffsetFromTarget: 0.18,
        absoluteMin: 0.45,
    },
    carryoverSalesShare: {
        healthyGap: 0.025,
        warningGap: 0.03,
        riskGap: 0.05,
    },
} as const;

export const DASHBOARD_SEASON_TRANSITION_METRIC_STANDARD = {
    primaryMetric: {
        id: 'sales_amt',
        label: '金额',
        role: '主判定',
    },
    healthGuardrailMetric: {
        id: 'sell_through',
        label: '售罄率',
        role: '健康护栏',
    },
    supportingMetric: {
        id: 'unit_sold',
        label: '销量',
        role: '辅助解释',
    },
    phase2Enhancements: [
        { id: 'gross_margin_rate', label: '毛利率' },
        { id: 'discount_rate', label: '折扣率' },
    ],
} as const;

export const DASHBOARD_SEASON_TRANSITION_BASELINE_FIELD_STANDARD = [
    { id: 'gmv_plan', label: '月 GMV 计划', role: '金额主基线' },
    { id: 'prev_share_target', label: '上一季目标占比', role: '承接结构基线' },
    { id: 'current_share_target', label: '当前季目标占比', role: '承接结构基线' },
    { id: 'next_share_target', label: '下一季目标占比', role: '承接结构基线' },
    { id: 'carryover_share_target', label: '常青款目标占比', role: '承接结构基线' },
    { id: 'non_main_share_ceiling', label: '其他非主承接上限', role: '拖尾护栏' },
    { id: 'sell_through_target', label: '阶段售罄目标', role: '健康护栏' },
    { id: 'sell_through_floor', label: '售罄下限', role: '异常判定' },
    { id: 'inventory_drag_ceiling', label: '拖尾警戒线', role: '异常判定' },
    { id: 'launch_curve_target', label: '上新起量基线', role: '异常判定' },
] as const;

export const DASHBOARD_SEASON_TRANSITION_ANALYSIS_FIELD_STANDARD = [
    { id: 'sales_amt', label: '实际金额', role: '主判定' },
    { id: 'sales_share', label: '实际占比', role: '结构诊断' },
    { id: 'plan_sales_amt', label: '计划金额', role: '计划对照' },
    { id: 'plan_share', label: '计划占比', role: '计划对照' },
    { id: 'sales_gap', label: '金额偏差', role: '主判定' },
    { id: 'share_gap', label: '占比偏差', role: '结构诊断' },
    { id: 'sell_through', label: '加权售罄率', role: '健康护栏' },
    { id: 'alerts', label: '异常标签', role: '结果输出' },
    { id: 'diagnosis_label', label: '诊断结论', role: '结果输出' },
    { id: 'action_recommendation', label: '动作建议', role: '结果输出' },
] as const;

export const DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD = {
    mainChainCapacityFloor: 0.6,
    carryoverShareTargetByPhase: {
        launch: roundStandardValue(CARRYOVER_SALES_SHARE_RANGE.target * 1.02),
        main_sell: roundStandardValue(CARRYOVER_SALES_SHARE_RANGE.target * 0.95),
        handoff: roundStandardValue(CARRYOVER_SALES_SHARE_RANGE.target),
    },
    phaseProfiles: {
        launch: {
            prevMultiplier: 1,
            currentMultiplier: 1,
            nextAbsolute: 0.08,
            nonMainCeiling: 0.1,
        },
        main_sell: {
            prevMultiplier: 0.72,
            currentMultiplier: 1.08,
            nextAbsolute: 0.1,
            nonMainCeiling: 0.08,
        },
        handoff: {
            prevMultiplier: 0.45,
            currentMultiplier: 0.92,
            nextAbsolute: 0.18,
            nonMainCeiling: 0.1,
        },
    },
    nextSeasonWarmupMultiplier: {
        launch: 0.08,
        main_sell: 0.12,
        handoff: 0.26,
    },
    sellThroughFloor: {
        absoluteMin: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.sellThrough.absoluteMin,
        offsetFromTarget: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.sellThrough.floorOffsetFromTarget,
    },
    inventoryDragAllowance: {
        prevShareExtra: 0.08,
        floorByPhase: {
            launch: 0.24,
            main_sell: 0.18,
            handoff: 0.14,
        },
    },
} as const satisfies {
    mainChainCapacityFloor: number;
    carryoverShareTargetByPhase: Record<DashboardSeasonTransitionPhaseStandard, number>;
    phaseProfiles: Record<
        DashboardSeasonTransitionPhaseStandard,
        {
            prevMultiplier: number;
            currentMultiplier: number;
            nextAbsolute: number;
            nonMainCeiling: number;
        }
    >;
    nextSeasonWarmupMultiplier: Record<DashboardSeasonTransitionPhaseStandard, number>;
    sellThroughFloor: {
        absoluteMin: number;
        offsetFromTarget: number;
    };
    inventoryDragAllowance: {
        prevShareExtra: number;
        floorByPhase: Record<DashboardSeasonTransitionPhaseStandard, number>;
    };
};

export const DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD = {
    alertPriority: ['handoff_gap', 'inventory_drag', 'launch_laggard'] as DashboardSeasonTransitionAlertStandard[],
    laneThresholds: {
        nonMainShareGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.warningPp,
        handoffShareGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.warningPp,
        prevTailShareGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.riskPp,
        nextLaunchShareGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.nextLaunchWarningPp,
    },
    summaryThresholds: {
        amountShortfallRatio: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.amountAchievement.healthyMin,
        mainChainWeakGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.mainChainWeakPp,
        launchCurrentGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.riskPp,
        launchNextGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.warningPp,
    },
    healthThresholds: {
        structureShiftGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.healthyPp,
        carryoverWarningGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.carryoverSalesShare.warningGap,
    },
    sellThroughThresholds: {
        shortageLikeGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.sellThrough.shortageLikeAboveTarget,
        demandWeakGap: DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.sellThrough.weakBelowTarget,
    },
    diagnosisCopy: {
        carryover: {
            label: '常青款独立监控',
            action: '常青款不走清仓路径，请转为关注补货、断码与库存水位。',
        },
        nonMainOverflow: {
            label: '其他非主承接占比超标',
            action: '压缩异常跨季货架和长尾货资源，避免挤占主季陈列与 OTB 预算。',
        },
        handoffGap: {
            shortageLabel: '缺货型承接断档',
            demandLabel: '动销型承接断档',
            shortageAction: '优先检查补货和到货率，避免主季窗口断货。',
            demandAction: '检查首波定价、陈列和主推资源，确认新季点火是否失效。',
        },
        prevInventoryDrag: {
            label: '前季尾货拖尾',
            action: '启动清场或移库指令，提前释放主季列展空间。',
        },
        nextLaunchLaggard: {
            label: '下一季预热低于计划',
            action: '盘点上架率、到货率和引流投放，避免换季接力棒起跑失速。',
        },
        healthy: {
            label: '符合基线',
            action: '按基线持续跟踪即可。',
        },
        summaryHandoffGap: {
            shortageLabel: '承接缺货断档',
            demandLabel: '承接动销断档',
            shortageAction: '当月 GMV 未接住，但售罄率偏高，优先补货或提前拉入下一季主推货。',
            demandAction: '当月 GMV 未接住，且售罄率不足，优先检查陈列、定价与首波上架效率。',
        },
        summaryInventoryDrag: {
            label: '长尾滞销拖尾',
            action: '前季或其他非主承接货季占比超标，建议启动清场/移库，常青款另行补货和库存水位监控。',
        },
        summaryLaunchLaggard: {
            label: '上新偏离',
            action: '新季起量低于基线，建议盘点到货率、上架率及首波定价。',
        },
        summaryCarryoverLow: {
            label: '常青底盘偏弱',
            action: '常青款贡献低于目标区间，建议补强常销核心款补货与常规陈列，避免全年底盘不足。',
        },
        summaryCarryoverHigh: {
            label: '常青挤占主季',
            action: '常青款占比高于目标区间，建议压缩常销排面，释放主季主推位与 OTB 资源。',
        },
        summaryStructureShift: {
            label: '主承接结构偏移',
            action: '当前主链结构偏离月度基线，建议按上一季收尾、当前季主推、下一季预热的节奏校正货盘。',
        },
        summaryHealthy: {
            label: '按基线推进',
            action: '当前结构合理，继续按 OTB 计划推进上新、主销和收尾即可。',
        },
    },
} as const;

export const DASHBOARD_SEASON_TRANSITION_DISPLAY_STANDARD = {
    chart: {
        structure: '计划基线 -> 实际承接 -> 异常诊断 -> 动作建议',
        laneOrder: ['prev', 'current', 'next', 'carryover', 'non_main'] as DashboardSeasonTransitionRoleStandard[],
        primarySignals: ['handoff_gap', 'inventory_drag', 'launch_laggard'] as DashboardSeasonTransitionAlertStandard[],
        tooltipMetrics: ['sales_amt', 'sales_share', 'sell_through', 'plan_gap'] as const,
    },
    brief: {
        sections: [
            { id: 'conclusion', label: '战略定性' },
            { id: 'basis', label: '判断依据' },
            { id: 'action', label: '执行长指令' },
        ],
        singleMonthWindowSuffix: '当前月',
        seasonWindowSuffix: '承接窗口',
        fullYearWindowLabel: '全年四季',
    },
} as const;

export function pickDashboardSeasonTransitionAlert(
    alerts: readonly DashboardSeasonTransitionAlertStandard[],
) {
    return (
        DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.alertPriority.find((alert) => alerts.includes(alert)) || null
    );
}

export function resolveDashboardSeasonTransitionScopeLabel(filters: {
    wave: string;
    season: string;
}) {
    if (filters.wave !== 'all') return DASHBOARD_SEASON_TRANSITION_DISPLAY_STANDARD.brief.singleMonthWindowSuffix;
    if (filters.season !== 'all') {
        return `${String(filters.season)}${DASHBOARD_SEASON_TRANSITION_DISPLAY_STANDARD.brief.seasonWindowSuffix}`;
    }
    return DASHBOARD_SEASON_TRANSITION_DISPLAY_STANDARD.brief.fullYearWindowLabel;
}

export function formatDashboardSeasonTransitionSingleMonthWindowLabel(focusLabel: string) {
    return `${focusLabel} · ${DASHBOARD_SEASON_TRANSITION_DISPLAY_STANDARD.brief.singleMonthWindowSuffix}`;
}
