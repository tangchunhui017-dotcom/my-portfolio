import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    DASHBOARD_SEASON_ORDER,
    getDashboardMonthByWave,
    getDashboardSeasonByWave,
    type DashboardSeason,
    type DashboardWave,
} from '@/config/dashboardTime';
import {
    FOOTWEAR_KEY_ROLE_OPTIONS,
    FOOTWEAR_PRICE_BAND_POSITIONING,
    FOOTWEAR_SCENE_OPTIONS,
    type FootwearMerchKeyRole,
} from '@/config/footwearLanguage';

export type AnnualControlNodeType =
    | 'solar-term'
    | 'festival'
    | 'buying'
    | 'qotb'
    | 'sotb'
    | 'launch'
    | 'clearance'
    | 'marketing';

export type AnnualControlSeverity = 'low' | 'medium' | 'high';
export type AnnualControlTeamType = '商品' | '设计企划' | '品牌陈列';
export type AnnualControlLaneId = 'environment' | 'transition' | 'marketing' | 'risk' | 'action';
export type AnnualControlTone = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose';
export type AnnualControlModuleKey = 'overview' | 'otb' | 'planning' | 'inventory' | 'design-review';
export type AnnualControlHealthTone = 'emerald' | 'amber' | 'rose';
export type AnnualControlActionModule = 'category' | 'planning' | 'otb' | 'channel' | 'inventory' | 'design-review';

export interface AnnualControlModuleDeadlineInfo {
    deadline: string;
    daysLeft: number;
    targetWeek: number;
}

export const ANNUAL_CONTROL_PRICE_BAND_GUARDRAILS: Record<'PB1' | 'PB2' | 'PB3' | 'PB4', number> = {
    PB1: 0.85,
    PB2: 0.88,
    PB3: 0.9,
    PB4: 0.92,
};
export interface AnnualControlProject {
    brandId: string;
    year: number;
    season: DashboardSeason | 'all';
    quarter: DashboardSeason | 'all';
    currentStage: string;
    currentWave: DashboardWave | 'all';
    currentPriority: string;
    currentRisk: string;
}

export interface AnnualControlTimelineNode {
    month: number;
    week: number | null;
    nodeType: AnnualControlNodeType;
    label: string;
    relatedSeason: DashboardSeason;
    relatedWave: DashboardWave | 'all';
    relatedRegion: string | 'all';
    severity: AnnualControlSeverity;
    note?: string;
    tone?: AnnualControlTone;
}

export interface SeasonalInventoryTransition {
    season: DashboardSeason;
    seasonLabel: string;
    oldGoodsRatio: number;
    newGoodsRatio: number;
    actualOldGoodsRatio: number;
    actualNewGoodsRatio: number;
    sellThroughTarget: number;
    discountTarget: number;
    newGoodsDiscountTarget: number;
    oldGoodsDiscountTarget: number;
    actualNewGoodsDiscount: number;
    actualOldGoodsDiscount: number;
    launchWindow: string;
    sellWindow: string;
    markdownWindow: string;
    clearanceWindow: string;
    carryoverRisk: string;
    handoffFocus: string;
    nextSeasonLabel: string;
    timelinePlan: {
        launch: { start: number; end: number };
        mainSell: { start: number; end: number };
        clearance: { start: number; end: number };
        handoff: { start: number; end: number };
    };
    timelineActual: {
        launch: { start: number; end: number };
        mainSell: { start: number; end: number };
        clearance: { start: number; end: number };
        handoff: { start: number; end: number };
    };
    lifecyclePlan: {
        launch: number;
        mainSell: number;
        mature: number;
        clearance: number;
    };
    lifecycleActual: {
        launch: number;
        mainSell: number;
        mature: number;
        clearance: number;
    };
    discountPlanByStage: {
        launch: number;
        mainSell: number;
        clearance: number;
    };
    discountActualByStage: {
        launch: number;
        mainSell: number;
        clearance: number;
    };
}

export interface AnnualMerchandisingFocus {
    month: number;
    wave: DashboardWave;
    season: DashboardSeason;
    sceneId: string;
    mainCategory: string[];
    mainPriceBandId: 'PB1' | 'PB2' | 'PB3' | 'PB4';
    keyRole: FootwearMerchKeyRole;
    marketingLevel: 'S' | 'A' | 'B' | 'C';
    lifestyleSummary: string;
    priority: string;
}

export interface CrossFunctionalAction {
    month: number;
    teamType: AnnualControlTeamType;
    /** 后期由 OpenClaw / 飞书表回填的业务动作标题 */
    actionTitle: string;
    /** 动作说明，前端只负责展示 */
    actionDesc: string;
    /** 动作产出物，便于协同层直接看交付 */
    deliverable: string;
    /** 可由飞书同步真实状态，未配置时按时间自动推导 */
    statusLabel?: string;
    /** 预留给后期表格同步的稳定字段 */
    syncKey: string;
    priority: 'P0' | 'P1' | 'P2';
    riskFlag: boolean;
    relatedWave: DashboardWave;
    relatedSeason: DashboardSeason;
    relatedModule: 'category' | 'planning' | 'otb' | 'channel' | 'inventory' | 'design-review';
}

export interface AnnualControlActionMonthBrief {
    month: number;
    focusTitle: string;
    focusSummary: string;
    /** 预留给后期飞书表同步月份工作简述 */
    syncKey: string;
}

export interface AnnualControlClimateProfile {
    region: string | 'all';
    label: string;
    summary: string;
    temperatureBand: string;
}

export interface AnnualControlEnvironmentTemperatureRow {
    region: string;
    regionLabel: string;
    cityLabel: string;
    rangeLabel: string;
}

export interface AnnualControlEnvironmentMetrics {
    solarTerms: string[];
    solarTermSummary: string;
    climateLabel: string;
    climateBand: string;
    climateSummary: string;
    festivalLabel?: string;
    regionLabel: string;
    temperatureRows: AnnualControlEnvironmentTemperatureRow[];
}

export interface AnnualControlDesignReviewInput {
    currentSeason: string;
    currentWave: string;
    mainScene: string;
    mainPriceBand: string;
    mainCategories: string[];
    keyRole: string;
    newOldTarget: string;
    platformHint: string;
    platformStrategyHint: string;
    developmentHint: string;
    gateReminder: string;
    mainBottomType: string;
    mainLastShape: string;
}

export interface AnnualControlMonthAxisItem {
    month: number;
    wave: DashboardWave;
    season: DashboardSeason;
    seasonLabel: string;
    weekRange: string;
    mdRange: string;
    phaseLabel: string;
}

export interface AnnualControlDependencyMarker {
    id: string;
    relation: 'pre' | 'post';
    title: string;
    label: string;
    detail: string;
    fromMonth: number;
    toMonth: number;
    severity: AnnualControlSeverity;
    relatedModule: Exclude<AnnualControlModuleKey, 'overview'>;
}

export interface AnnualControlActionTrack {
    teamType: AnnualControlTeamType;
    ownerCode: '商' | '设' | '陈';
    title: string;
    detail: string;
    deliverable: string;
    statusLabel: string;
    weekLabel: string;
    priority: 'P0' | 'P1' | 'P2';
    riskFlag: boolean;
    syncKey?: string;
}

export interface AnnualControlUpcomingNode {
    label: string;
    detail: string;
    etaLabel: string;
    month: number;
    week: number | null;
    tone: AnnualControlTone;
}

export interface AnnualControlFootwearFocusSummary {
    scene: string;
    categories: string[];
    priceBandLabel: string;
    priceBandRange: string;
    keyRole: string;
    bottomType: string;
    lastShape: string;
    platformStrategyHint: string;
}

export interface AnnualControlMasterLaneCell {
    month: number;
    headline: string;
    description: string;
    chips: string[];
    tone: AnnualControlTone;
    emphasis?: boolean;
    supportingText?: string;
    footwearChips?: string[];
    actionTracks?: AnnualControlActionTrack[];
    monthWorkBrief?: {
        title: string;
        summary: string;
    };
    nextStepHint?: string;
    environmentMetrics?: AnnualControlEnvironmentMetrics;
    /** 货盘切换层专属指标，后期对接真实数据直接替换此字段 */
    transitionMetrics?: {
        /** 实际新品占比 0-1 */
        newGoodsActual: number;
        /** 目标新品占比 0-1 */
        newGoodsTarget: number;
        /** 实际新品折扣 0-1 */
        discountNewActual: number;
        /** 目标新品折扣 0-1 */
        discountNewTarget: number;
        /** 实际旧货折扣 0-1 */
        discountOldActual: number;
        /** 目标旧货折扣 0-1 */
        discountOldTarget: number;
        /** 生命周期阶段标签 */
        phaseLabel: string;
        /**
         * 4阶段货品生命周期占比（计划值 0-1，合计=1）
         * 新上市 → 新货主销 → 成熟/促销 → 老货清仓
         * 后期用实际 SKU/库存数据替换
         */
        lifecycle: {
            newLaunch: number;   // 新上市期占比
            newGoods: number;   // 新货主销占比
            mature: number;   // 成熟/促销占比
            clearance: number;   // 老货清仓占比
        };
        /**
         * 各生命周期阶段折扣计划（目标值 0-1）
         * 用于折扣守线管控，实际折扣用 discountNewActual / discountOldActual 表达
         */
        discountByStage: {
            newLaunch: number;   // 新上市期折扣目标（如 0.95 = 九五折）
            newGoods: number;   // 新货主销折扣目标
            mature: number;   // 成熟/促销折扣目标
            clearance: number;   // 清仓折扣目标
        };
    };
}


export interface AnnualControlMasterLane {
    id: AnnualControlLaneId;
    title: string;
    description: string;
    cells: AnnualControlMasterLaneCell[];
}

export type AnnualControlTransitionLifecycleStage = 'launch' | 'mainSell' | 'mature' | 'clearance';
export type AnnualControlTransitionRiskTone = 'stable' | 'watch' | 'risk';
export type AnnualControlTransitionOutputModuleKey = 'otb' | 'inventory' | 'planning' | 'design-review';

export interface AnnualControlTransitionStageSegment {
    stage: AnnualControlTransitionLifecycleStage;
    label: string;
    start: number;
    end: number;
    discountRate: number;
}

export interface AnnualControlTransitionMetricBandSegment {
    stage: AnnualControlTransitionLifecycleStage;
    start: number;
    end: number;
    value: number;
    label: string;
}

export interface AnnualControlTransitionMetricTimelineRange {
    start: number;
    end: number;
    value: number;
}

export interface AnnualControlTransitionMetricPlan {
    sellThroughPlan: Record<AnnualControlTransitionLifecycleStage, number>;
    newGoodsDiscountPlan: Record<AnnualControlTransitionLifecycleStage, number>;
    sellThroughMonthlyPlan: AnnualControlTransitionMetricTimelineRange[];
    newGoodsDiscountMonthlyPlan: AnnualControlTransitionMetricTimelineRange[];
    oldGoodsDiscountMonthlyPlan: AnnualControlTransitionMetricTimelineRange[];
    newOldMixTarget: {
        newGoods: number;
        oldGoods: number;
    };
    oldGoodsAverageDiscount: number;
}

export interface AnnualControlTransitionMetricOverride {
    scope: {
        brand?: string;
        market?: string;
        channel?: string;
        season?: DashboardSeason;
        wave?: DashboardWave;
        category?: string;
    };
    values: {
        sellThroughPlan?: Partial<Record<AnnualControlTransitionLifecycleStage, number>>;
        newGoodsDiscountPlan?: Partial<Record<AnnualControlTransitionLifecycleStage, number>>;
        sellThroughMonthlyPlan?: AnnualControlTransitionMetricTimelineRange[];
        newGoodsDiscountMonthlyPlan?: AnnualControlTransitionMetricTimelineRange[];
        oldGoodsDiscountMonthlyPlan?: AnnualControlTransitionMetricTimelineRange[];
        newOldMixTarget?: Partial<AnnualControlTransitionMetricPlan['newOldMixTarget']>;
        oldGoodsAverageDiscount?: number;
    };
}

export interface AnnualControlTransitionMetricConfig {
    defaults: Record<DashboardSeason, AnnualControlTransitionMetricPlan>;
    overrides: AnnualControlTransitionMetricOverride[];
}

export interface AnnualControlTransitionSummaryCard {
    headline: string;
    deviation: string;
    note: string;
}

export interface AnnualControlTransitionSeasonControl {
    season: DashboardSeason;
    seasonLabel: string;
    shortLabel: string;
    nextSeasonLabel: string;
    fullLifecycleLabel: string;
    carryInLabel?: string;
    carryOutLabel?: string;
    carryInPreviewRange?: { start: number; end: number };
    windows: {
        launch: string;
        mainSell: string;
        clearance: string;
    };
    handoffFocus: string;
    carryoverRisk: string;
    discount: {
        newPlan: number;
        newActual: number;
        oldPlan: number;
        oldActual: number;
    };
    planRange: { start: number; end: number };
    actualRange: { start: number; end: number };
    handoffPlan: { start: number; end: number };
    handoffActual: { start: number; end: number };
    ratio: {
        planNew: number;
        planOld: number;
        actualNew: number;
        actualOld: number;
        newGapPp: number;
        oldGapPp: number;
    };
    metrics: AnnualControlTransitionMetricPlan;
    planSegments: AnnualControlTransitionStageSegment[];
    actualSegments: AnnualControlTransitionStageSegment[];
    sellThroughPlanBand: AnnualControlTransitionMetricBandSegment[];
    newGoodsDiscountPlanBand: AnnualControlTransitionMetricBandSegment[];
    oldGoodsDiscountPlanBand: AnnualControlTransitionMetricBandSegment[];
    kpis: {
        newOldTargetLabel: string;
        newOldActualLabel: string;
        oldDiscountTargetLabel: string;
        oldDiscountActualLabel: string;
    };
    risk: {
        tone: AnnualControlTransitionRiskTone;
        status: string;
        note: string;
    };
    summary: AnnualControlTransitionSummaryCard;
}

export interface AnnualControlTransitionOutputField {
    key: string;
    label: string;
    value: string;
}

export interface AnnualControlTransitionOutputGroup {
    title: string;
    fields: AnnualControlTransitionOutputField[];
}

export interface AnnualControlTransitionControlModel {
    months: AnnualControlMonthAxisItem[];
    currentMonth: number;
    currentSeason: DashboardSeason;
    seasons: AnnualControlTransitionSeasonControl[];
    outputs: Record<AnnualControlTransitionOutputModuleKey, AnnualControlTransitionOutputGroup>;
}

export interface AnnualControlMasterViewModel {
    year: number;
    currentMonth: number;
    currentWeek: number;
    currentWeekLabel: string;
    currentWeekRatio: number;
    currentWave: DashboardWave;
    currentSeason: DashboardSeason;
    currentStageLabel: string;
    currentNodeLabel: string;
    scopeMonths: number[];
    months: AnnualControlMonthAxisItem[];
    timelineNodes: AnnualControlTimelineNode[];
    dependencies: AnnualControlDependencyMarker[];
    lanes: AnnualControlMasterLane[];
    nextNode: AnnualControlUpcomingNode | null;
    footwearFocus: AnnualControlFootwearFocusSummary | null;
    transitionControl: AnnualControlTransitionControlModel;
}

export interface AnnualControlModuleOutput {


    module: AnnualControlModuleKey;
    title: string;
    summary: string;
    bullets: string[];
}

export interface AnnualControlGanttBar {
    id: string;
    label: string;
    detail: string;
    startMonth: number;
    span: number;
    tone: AnnualControlTone;
    /** 预算额（万元）。后期可从 OTBReportRecord.otb_total 替换。 */
    budgetTarget?: number;
    /** 实际执行额（万元）。后期可从 OTBReportRecord.otb_used 替换。 */
    budgetActual?: number;
}


export interface AnnualControlDesignReserveFields {
    bottomTypeHint: string;
    lastShapeHint: string;
    platformStrategyHint: string;
}

export const ANNUAL_CONTROL_CLIMATE_PROFILES: AnnualControlClimateProfile[] = [
    { region: 'all', label: '\u5168\u56FD\u7EDF\u7B79', summary: '\u6309\u5B63\u8282\u5207\u6362\u7BA1\u7406\u4E0A\u65B0\u3001\u4E3B\u9500\u3001\u6298\u6263\u4E0E\u6E05\u8D27\uFF0C\u4E0D\u505A\u5355\u533A\u57DF\u5C40\u90E8\u4F18\u5316\u3002', temperatureBand: '\u56DB\u5B63\u8F6E\u52A8' },
    { region: '\u534E\u5357', label: '\u534E\u5357', summary: '\u9AD8\u6E29\u5468\u671F\u6700\u957F\uFF0C\u6E05\u51C9\u4E0E\u900F\u6C14\u9700\u6C42\u91CA\u653E\u66F4\u65E9\u3002', temperatureBand: '\u957F\u590F\u8F7B\u51AC' },
    { region: '\u534E\u4E1C', label: '\u534E\u4E1C', summary: '\u6362\u5B63\u5FEB\u3001\u96E8\u6C34\u91CD\uFF0C\u901A\u52E4\u4E0E\u9632\u6CFC\u6C34\u5207\u6362\u8282\u594F\u66F4\u5BC6\u3002', temperatureBand: '\u6E7F\u70ED\u6362\u5B63\u5FEB' },
    { region: '\u534E\u4E2D', label: '\u534E\u4E2D', summary: '\u6E7F\u51B7\u4E0E\u9177\u70ED\u5E76\u5B58\uFF0C\u5B63\u8282\u8854\u63A5\u548C\u8C03\u8D27\u8282\u594F\u8981\u66F4\u5E73\u6ED1\u3002', temperatureBand: '\u51B7\u70ED\u8DE8\u5EA6\u5927' },
    { region: '\u897F\u5357', label: '\u897F\u5357', summary: '\u5C71\u5730\u6E29\u5DEE\u548C\u96E8\u96FE\u5E76\u5B58\uFF0C\u8010\u78E8\u6293\u5730\u4E0E\u8F7B\u6237\u5916\u517C\u5BB9\u9700\u6C42\u66F4\u5F3A\u3002', temperatureBand: '\u6E29\u5DEE\u4E0E\u96E8\u96FE\u5E76\u5B58' },
    { region: '\u534E\u5317', label: '\u534E\u5317', summary: '\u6625\u79CB\u77ED\u3001\u51AC\u5B63\u524D\u7F6E\uFF0C\u9632\u98CE\u9632\u6C61\u4E0E\u8F7B\u4FDD\u6696\u8981\u66F4\u65E9\u51C6\u5907\u3002', temperatureBand: '\u51B7\u6696\u5207\u6362\u660E\u663E' },
    { region: '\u897F\u5317', label: '\u897F\u5317', summary: '\u5E72\u71E5\u6E29\u5DEE\u5927\uFF0C\u9632\u98CE\u9632\u5C18\u4E0E\u673A\u80FD\u4FDD\u6696\u8981\u66F4\u65E9\u542F\u52A8\u3002', temperatureBand: '\u5E72\u51B7\u6E29\u5DEE\u5927' },
    { region: '\u4E1C\u5317', label: '\u4E1C\u5317', summary: '\u6781\u5BD2\u957F\u51AC\u51B3\u5B9A\u4E86\u4FDD\u6696\u3001\u77ED\u9774\u4E0E\u9632\u6ED1\u673A\u80FD\u7684\u63D0\u65E9\u542F\u52A8\u3002', temperatureBand: '\u9AD8\u5BD2\u957F\u51AC' },
];

const ANNUAL_CONTROL_SOLAR_TERM_MONTHLY: Record<number, { terms: string[]; summary: string }> = {
    1: { terms: ['\u5C0F\u5BD2', '\u5927\u5BD2'], summary: '\u5929\u6C14\u6700\u51B7\uFF0C\u4FDD\u6696\u4E0E\u8282\u524D\u793C\u8D60\u9700\u6C42\u540C\u6B65\u62AC\u5347\u3002' },
    2: { terms: ['\u7ACB\u6625', '\u96E8\u6C34'], summary: '\u6C14\u6E29\u56DE\u5347\uFF0C\u8F7B\u6362\u5B63\u4E0E\u9632\u6CFC\u6C34\u9700\u6C42\u5F00\u59CB\u8D77\u91CF\u3002' },
    3: { terms: ['\u60CA\u86F0', '\u6625\u5206'], summary: '\u6625\u6696\u548C\u8F7B\u6237\u5916\u9700\u6C42\u540C\u6B65\u653E\u5927\u3002' },
    4: { terms: ['\u6E05\u660E', '\u8C37\u96E8'], summary: '\u5347\u6E29\u53E0\u52A0\u964D\u96E8\uFF0C\u5047\u65E5\u51FA\u884C\u4E0E\u8F7B\u91CF\u978B\u578B\u8FDB\u5165\u4E3B\u63A8\u3002' },
    5: { terms: ['\u7ACB\u590F', '\u5C0F\u6EE1'], summary: '\u95F7\u70ED\u611F\u589E\u5F3A\uFF0C\u51C9\u978B\u548C\u4F4E\u95E8\u69DB\u8D70\u91CF\u5E26\u8981\u63D0\u524D\u94FA\u6DF1\u3002' },
    6: { terms: ['\u8292\u79CD', '\u590F\u81F3'], summary: '\u708E\u70ED\u4E0E\u6885\u96E8\u5E76\u884C\uFF0C\u6E05\u51C9\u3001\u901F\u5E72\u4E0E\u6293\u5730\u9700\u6C42\u66F4\u660E\u663E\u3002' },
    7: { terms: ['\u5C0F\u6691', '\u5927\u6691'], summary: '\u5168\u5E74\u6700\u70ED\u9636\u6BB5\uFF0C\u900F\u6C14\u3001\u8F7B\u91CF\u4E0E\u6691\u671F\u573A\u666F\u6210\u4E3A\u91CD\u70B9\u3002' },
    8: { terms: ['\u7ACB\u79CB', '\u5904\u6691'], summary: '\u6691\u70ED\u672A\u9000\u4F46\u65E9\u665A\u8F6C\u51C9\uFF0C\u79CB\u4E00\u6CE2\u8BD5\u9500\u4E0E\u8FD4\u6821\u9700\u6C42\u5F00\u59CB\u5207\u5165\u3002' },
    9: { terms: ['\u767D\u9732', '\u79CB\u5206'], summary: '\u663C\u591C\u6E29\u5DEE\u62C9\u5F00\uFF0C\u6362\u5B63\u901A\u52E4\u4E0E\u8F7B\u4FDD\u6696\u5F00\u59CB\u5360\u636E\u4E3B\u9648\u5217\u3002' },
    10: { terms: ['\u5BD2\u9732', '\u971C\u964D'], summary: '\u964D\u6E29\u52A0\u5FEB\uFF0C\u77ED\u9774\u3001\u9632\u98CE\u4E0E\u79CB\u51AC\u4FDD\u6696\u7ED3\u6784\u8981\u524D\u7F6E\u3002' },
    11: { terms: ['\u7ACB\u51AC', '\u5C0F\u96EA'], summary: '\u51B7\u7A7A\u6C14\u9891\u7E41\uFF0C\u4FDD\u6696\u4E3B\u63A8\u548C\u5927\u4FC3\u7206\u53D1\u8981\u540C\u6B65\u5B88\u4F4F\u5229\u6DA6\u3002' },
    12: { terms: ['\u5927\u96EA', '\u51AC\u81F3'], summary: '\u4E25\u5BD2\u4E0E\u8282\u5E86\u5E76\u884C\uFF0C\u6E05\u5C3E\u548C\u8DE8\u5E74\u8D27\u76D8\u9700\u8981\u540C\u6B65\u5207\u6362\u3002' },
};

const ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD: Record<string, { regionLabel: string; cityLabel: string; monthly: string[] }> = {
    '\u534E\u5357': {
        regionLabel: '\u534E\u5357',
        cityLabel: '\u5E7F\u5DDE',
        monthly: ['18.3 - 9.8\u00B0C', '18.4 - 11.3\u00B0C', '21.4 - 14.3\u00B0C', '25.4 - 18.3\u00B0C', '29.4 - 22.3\u00B0C', '31.4 - 24.3\u00B0C', '32.4 - 25.3\u00B0C', '32.4 - 25.3\u00B0C', '30.4 - 23.3\u00B0C', '27.4 - 20.3\u00B0C', '23.4 - 16.3\u00B0C', '20.4 - 13.3\u00B0C'],
    },
    '\u534E\u4E1C': {
        regionLabel: '\u534E\u4E1C',
        cityLabel: '\u4E0A\u6D77',
        monthly: ['9 - 2\u00B0C', '11 - 4\u00B0C', '15 - 8\u00B0C', '20 - 12\u00B0C', '25 - 17\u00B0C', '28 - 21\u00B0C', '33 - 25\u00B0C', '32 - 26\u00B0C', '28 - 22\u00B0C', '25 - 18\u00B0C', '20 - 13\u00B0C', '14 - 8\u00B0C'],
    },
    '\u534E\u4E2D': {
        regionLabel: '\u534E\u4E2D',
        cityLabel: '\u6B66\u6C49',
        monthly: ['8 - 1\u00B0C', '10 - 3\u00B0C', '15 - 8\u00B0C', '22 - 13\u00B0C', '27 - 18\u00B0C', '30 - 22\u00B0C', '33 - 26\u00B0C', '33 - 26\u00B0C', '29 - 21\u00B0C', '24 - 15\u00B0C', '17 - 9\u00B0C', '11 - 3\u00B0C'],
    },
    '\u897F\u5357': {
        regionLabel: '\u897F\u5357',
        cityLabel: '\u6210\u90FD',
        monthly: ['9 - 3\u00B0C', '12 - 5\u00B0C', '16 - 8\u00B0C', '22 - 13\u00B0C', '26 - 17\u00B0C', '28 - 19\u00B0C', '30 - 21\u00B0C', '30 - 21\u00B0C', '26 - 18\u00B0C', '22 - 14\u00B0C', '16 - 9\u00B0C', '11 - 5\u00B0C'],
    },
    '\u534E\u5317': {
        regionLabel: '\u534E\u5317',
        cityLabel: '\u5317\u4EAC',
        monthly: ['3 - -6\u00B0C', '6 - -3\u00B0C', '12 - 2\u00B0C', '20 - 8\u00B0C', '26 - 14\u00B0C', '30 - 20\u00B0C', '31 - 23\u00B0C', '30 - 22\u00B0C', '26 - 16\u00B0C', '19 - 8\u00B0C', '10 - 0\u00B0C', '3 - -6\u00B0C'],
    },
    '\u897F\u5317': {
        regionLabel: '\u897F\u5317',
        cityLabel: '\u897F\u5B89',
        monthly: ['5 - -2\u00B0C', '9 - 1\u00B0C', '15 - 6\u00B0C', '23 - 11\u00B0C', '28 - 16\u00B0C', '32 - 21\u00B0C', '34 - 24\u00B0C', '33 - 23\u00B0C', '28 - 17\u00B0C', '21 - 11\u00B0C', '13 - 4\u00B0C', '7 - -1\u00B0C'],
    },
    '\u4E1C\u5317': {
        regionLabel: '\u4E1C\u5317',
        cityLabel: '\u6C88\u9633',
        monthly: ['-6 - -18\u00B0C', '-1 - -14\u00B0C', '8 - -5\u00B0C', '18 - 5\u00B0C', '25 - 12\u00B0C', '29 - 18\u00B0C', '31 - 21\u00B0C', '30 - 20\u00B0C', '25 - 13\u00B0C', '17 - 5\u00B0C', '6 - -5\u00B0C', '-3 - -14\u00B0C'],
    },
};


const ANNUAL_CONTROL_ACTUAL_TEMPERATURE_SNAPSHOTS: Record<number, { capturedAt: string; values: Record<string, string> }> = {
    3: {
        capturedAt: '2026-03-12',
        values: {
            '\u534E\u5357': '28 - 13\u00B0C',
            '\u534E\u4E1C': '15 - 5\u00B0C',
            '\u534E\u4E2D': '19 - 11\u00B0C',
            '\u897F\u5357': '14 - 11\u00B0C',
            '\u534E\u5317': '11 - -1\u00B0C',
            '\u897F\u5317': '14 - 8\u00B0C',
            '\u4E1C\u5317': '12 - -7\u00B0C',
        },
    },
};

const ANNUAL_CONTROL_REGION_ALIASES: Record<string, string | 'all'> = {
    all: 'all',
    '\u4E1C': '\u534E\u4E1C',
    '\u5357': '\u534E\u5357',
    '\u897F': '\u897F\u5357',
    '\u5317': '\u534E\u5317',
    '\u4E1C\u5317': '\u4E1C\u5317',
    '\u534E\u4E1C': '\u534E\u4E1C',
    '\u534E\u5357': '\u534E\u5357',
    '\u534E\u5317': '\u534E\u5317',
    '\u534E\u4E2D': '\u534E\u4E2D',
    '\u897F\u5357': '\u897F\u5357',
    '\u897F\u5317': '\u897F\u5317',
    '\u5168\u56FD\u7EDF\u7BA1': '\u534E\u4E2D',
};

function normalizeAnnualControlRegion(region: string | 'all') {
    return ANNUAL_CONTROL_REGION_ALIASES[region] || region || 'all';
}

function getAnnualControlTemperatureHigh(rangeLabel: string) {
    const match = rangeLabel.trim().match(/^-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : Number.NEGATIVE_INFINITY;
}


function getAnnualControlDisplayedTemperatureRange(regionKey: string, monthIndex: number, useActualSnapshot: boolean) {
    const snapshot = ANNUAL_CONTROL_ACTUAL_TEMPERATURE_SNAPSHOTS[monthIndex + 1];
    if (useActualSnapshot && snapshot?.values[regionKey]) return snapshot.values[regionKey];
    return ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD[regionKey].monthly[monthIndex];
}


export const ANNUAL_CONTROL_TIMELINE_NODES: AnnualControlTimelineNode[] = [
    { month: 1, week: 1, nodeType: 'festival', label: '元旦开门红', relatedSeason: 'Q1', relatedWave: 'W01', relatedRegion: 'all', severity: 'medium', note: '冬清货与春一波并行。' },
    { month: 1, week: 2, nodeType: 'launch', label: '春一波上市', relatedSeason: 'Q1', relatedWave: 'W01', relatedRegion: 'all', severity: 'high' },
    { month: 2, week: 5, nodeType: 'festival', label: '春节大促', relatedSeason: 'Q1', relatedWave: 'W02', relatedRegion: 'all', severity: 'high' },
    { month: 2, week: 7, nodeType: 'festival', label: '2.14 \u60C5\u4EBA\u8282', relatedSeason: 'Q1', relatedWave: 'W02', relatedRegion: 'all', severity: 'medium', note: '\u793C\u8D60\u4E0E\u6362\u5B63\u901A\u52E4\u9700\u6C42\u5E76\u884C\u3002' },
    { month: 2, week: 6, nodeType: 'qotb', label: 'Q3 OTB 锁量', relatedSeason: 'Q1', relatedWave: 'W02', relatedRegion: 'all', severity: 'medium' },
    { month: 3, week: 9, nodeType: 'festival', label: '3.8 \u5987\u5973\u8282', relatedSeason: 'Q1', relatedWave: 'W03', relatedRegion: 'all', severity: 'medium', note: '\u901A\u52E4\u5347\u7EA7\u4E0E\u9001\u793C\u9700\u6C42\u540C\u6B65\u91CA\u653E\u3002' },
    { month: 3, week: 10, nodeType: 'solar-term', label: '春分换季', relatedSeason: 'Q1', relatedWave: 'W03', relatedRegion: 'all', severity: 'medium' },
    { month: 3, week: 11, nodeType: 'buying', label: '秋季订货会', relatedSeason: 'Q1', relatedWave: 'W03', relatedRegion: 'all', severity: 'high' },
    { month: 4, week: 14, nodeType: 'launch', label: '夏一波上市', relatedSeason: 'Q2', relatedWave: 'W04', relatedRegion: 'all', severity: 'high' },
    { month: 4, week: 15, nodeType: 'marketing', label: '清明/五一预热', relatedSeason: 'Q2', relatedWave: 'W04', relatedRegion: 'all', severity: 'medium' },
    { month: 5, week: 18, nodeType: 'festival', label: '5.1 \u52B3\u52A8\u8282', relatedSeason: 'Q2', relatedWave: 'W05', relatedRegion: 'all', severity: 'high', note: '\u5047\u65E5\u51FA\u6E38\u548C\u900F\u6C14\u8F7B\u91CF\u4E3B\u63A8\u540C\u6B65\u653E\u5927\u3002' },
    { month: 5, week: 18, nodeType: 'sotb', label: 'Q4 SOTB 评审', relatedSeason: 'Q2', relatedWave: 'W05', relatedRegion: 'all', severity: 'medium' },
    { month: 5, week: 20, nodeType: 'festival', label: '端午场景切换', relatedSeason: 'Q2', relatedWave: 'W05', relatedRegion: 'all', severity: 'medium' },
    { month: 6, week: 23, nodeType: 'festival', label: '6.1 \u513F\u7AE5\u8282', relatedSeason: 'Q2', relatedWave: 'W06', relatedRegion: 'all', severity: 'medium', note: '\u4EB2\u5B50\u51FA\u884C\u4E0E\u8F7B\u91CF\u8212\u9002\u9700\u6C42\u63D0\u5347\u3002' },
    { month: 6, week: 23, nodeType: 'clearance', label: '春货退市窗口', relatedSeason: 'Q2', relatedWave: 'W06', relatedRegion: 'all', severity: 'high' },
    { month: 6, week: 24, nodeType: 'marketing', label: '\u5E74\u4E2D\u7279\u60E0', relatedSeason: 'Q2', relatedWave: 'W06', relatedRegion: 'all', severity: 'high', note: '\u5F15\u6D41\u4E0E\u8F6C\u5316\u7A97\u53E3\u540C\u6B65\u6253\u5F00\u3002' },
    { month: 6, week: 24, nodeType: 'buying', label: '冬季订货会', relatedSeason: 'Q2', relatedWave: 'W06', relatedRegion: 'all', severity: 'high' },
    { month: 7, week: 27, nodeType: 'launch', label: '秋一波上市', relatedSeason: 'Q3', relatedWave: 'W07', relatedRegion: 'all', severity: 'high' },
    { month: 7, week: 28, nodeType: 'festival', label: '暑期主推窗口', relatedSeason: 'Q3', relatedWave: 'W07', relatedRegion: 'all', severity: 'medium' },
    { month: 8, week: 32, nodeType: 'qotb', label: 'Q1 OTB 锁量', relatedSeason: 'Q3', relatedWave: 'W08', relatedRegion: 'all', severity: 'medium' },
    { month: 8, week: 33, nodeType: 'festival', label: '七夕送礼窗口', relatedSeason: 'Q3', relatedWave: 'W08', relatedRegion: 'all', severity: 'medium' },
    { month: 9, week: 36, nodeType: 'launch', label: '冬一波试销', relatedSeason: 'Q3', relatedWave: 'W09', relatedRegion: 'all', severity: 'high' },
    { month: 9, week: 38, nodeType: 'marketing', label: '中秋/国庆活动', relatedSeason: 'Q3', relatedWave: 'W09', relatedRegion: 'all', severity: 'high' },
    { month: 10, week: 41, nodeType: 'festival', label: '国庆主推期', relatedSeason: 'Q4', relatedWave: 'W10', relatedRegion: 'all', severity: 'high' },
    { month: 10, week: 42, nodeType: 'clearance', label: '夏货收尾窗口', relatedSeason: 'Q4', relatedWave: 'W10', relatedRegion: 'all', severity: 'medium' },
    { month: 11, week: 45, nodeType: 'festival', label: '双11 爆发', relatedSeason: 'Q4', relatedWave: 'W11', relatedRegion: 'all', severity: 'high' },
    { month: 11, week: 46, nodeType: 'qotb', label: 'Q2 OTB 锁量', relatedSeason: 'Q4', relatedWave: 'W11', relatedRegion: 'all', severity: 'medium' },
    { month: 12, week: 49, nodeType: 'marketing', label: '圣诞/跨年场景', relatedSeason: 'Q4', relatedWave: 'W12', relatedRegion: 'all', severity: 'medium' },
    { month: 12, week: 51, nodeType: 'clearance', label: '冬货折扣切换', relatedSeason: 'Q4', relatedWave: 'W12', relatedRegion: 'all', severity: 'high' },
];

export const SEASONAL_INVENTORY_TRANSITIONS: SeasonalInventoryTransition[] = [
    {
        season: 'Q1',
        seasonLabel: '春季切换',
        oldGoodsRatio: 0.52,
        newGoodsRatio: 0.48,
        actualOldGoodsRatio: 0.56,
        actualNewGoodsRatio: 0.44,
        sellThroughTarget: 0.7,
        discountTarget: 0.84,
        newGoodsDiscountTarget: 0.95,
        oldGoodsDiscountTarget: 0.82,
        actualNewGoodsDiscount: 0.93,
        actualOldGoodsDiscount: 0.8,
        launchWindow: '1月上旬-2月上旬',
        sellWindow: '2月上旬-3月上旬',
        markdownWindow: '3月中旬-3月末',
        clearanceWindow: '2月下旬-3月中旬',
        carryoverRisk: '冬货尾量与春一波承接重叠。',
        handoffFocus: '保住春一波上新完整度，压住冬货尾量。',
        nextSeasonLabel: '夏季',
        timelinePlan: {
            launch: { start: 1.05, end: 2.18 },
            mainSell: { start: 1.82, end: 3.18 },
            clearance: { start: 2.72, end: 3.92 },
            handoff: { start: 3.42, end: 4.18 },
        },
        timelineActual: {
            launch: { start: 1.14, end: 2.06 },
            mainSell: { start: 1.94, end: 3.04 },
            clearance: { start: 2.56, end: 4.06 },
            handoff: { start: 3.28, end: 4.24 },
        },
        lifecyclePlan: {
            launch: 0.32,
            mainSell: 0.44,
            mature: 0.16,
            clearance: 0.08,
        },
        lifecycleActual: {
            launch: 0.26,
            mainSell: 0.40,
            mature: 0.20,
            clearance: 0.14,
        },
        discountPlanByStage: {
            launch: 0.97,
            mainSell: 0.95,
            clearance: 0.82,
        },
        discountActualByStage: {
            launch: 0.95,
            mainSell: 0.93,
            clearance: 0.80,
        },
    },
    {
        season: 'Q2',
        seasonLabel: '夏季放量',
        oldGoodsRatio: 0.3,
        newGoodsRatio: 0.7,
        actualOldGoodsRatio: 0.35,
        actualNewGoodsRatio: 0.65,
        sellThroughTarget: 0.78,
        discountTarget: 0.8,
        newGoodsDiscountTarget: 0.93,
        oldGoodsDiscountTarget: 0.78,
        actualNewGoodsDiscount: 0.91,
        actualOldGoodsDiscount: 0.74,
        launchWindow: '4月上旬-4月下旬',
        sellWindow: '4月下旬-6月上旬',
        markdownWindow: '6月上旬-6月下旬',
        clearanceWindow: '5月下旬-6月下旬',
        carryoverRisk: '春货退市不及时会拖累夏季折扣。',
        handoffFocus: '夏季走量带做深，春货快速退出主陈列。',
        nextSeasonLabel: '秋季',
        timelinePlan: {
            launch: { start: 4.02, end: 5.08 },
            mainSell: { start: 4.76, end: 6.58 },
            clearance: { start: 6.04, end: 7.24 },
            handoff: { start: 6.68, end: 7.34 },
        },
        timelineActual: {
            launch: { start: 4.12, end: 4.98 },
            mainSell: { start: 4.88, end: 6.42 },
            clearance: { start: 5.86, end: 7.36 },
            handoff: { start: 6.54, end: 7.44 },
        },
        lifecyclePlan: {
            launch: 0.24,
            mainSell: 0.50,
            mature: 0.18,
            clearance: 0.08,
        },
        lifecycleActual: {
            launch: 0.18,
            mainSell: 0.47,
            mature: 0.21,
            clearance: 0.14,
        },
        discountPlanByStage: {
            launch: 0.95,
            mainSell: 0.93,
            clearance: 0.78,
        },
        discountActualByStage: {
            launch: 0.93,
            mainSell: 0.91,
            clearance: 0.74,
        },
    },
    {
        season: 'Q3',
        seasonLabel: '秋季承接',
        oldGoodsRatio: 0.16,
        newGoodsRatio: 0.84,
        actualOldGoodsRatio: 0.21,
        actualNewGoodsRatio: 0.79,
        sellThroughTarget: 0.75,
        discountTarget: 0.83,
        newGoodsDiscountTarget: 0.94,
        oldGoodsDiscountTarget: 0.8,
        actualNewGoodsDiscount: 0.92,
        actualOldGoodsDiscount: 0.77,
        launchWindow: '7月上旬-8月上旬',
        sellWindow: '8月上旬-10月上旬',
        markdownWindow: '9月下旬-10月中旬',
        clearanceWindow: '8月下旬-9月下旬',
        carryoverRisk: '夏货与秋装并行期易出现价格体系冲突。',
        handoffFocus: '秋一波主推与国庆场景同步，严控夏货尾部。',
        nextSeasonLabel: '冬季',
        timelinePlan: {
            launch: { start: 7.08, end: 8.22 },
            mainSell: { start: 7.96, end: 10.16 },
            clearance: { start: 9.64, end: 10.84 },
            handoff: { start: 9.94, end: 10.56 },
        },
        timelineActual: {
            launch: { start: 7.16, end: 8.08 },
            mainSell: { start: 8.08, end: 10.02 },
            clearance: { start: 9.48, end: 11.02 },
            handoff: { start: 9.84, end: 10.70 },
        },
        lifecyclePlan: {
            launch: 0.28,
            mainSell: 0.48,
            mature: 0.16,
            clearance: 0.08,
        },
        lifecycleActual: {
            launch: 0.22,
            mainSell: 0.45,
            mature: 0.19,
            clearance: 0.14,
        },
        discountPlanByStage: {
            launch: 0.96,
            mainSell: 0.94,
            clearance: 0.80,
        },
        discountActualByStage: {
            launch: 0.94,
            mainSell: 0.92,
            clearance: 0.77,
        },
    },
    {
        season: 'Q4',
        seasonLabel: '冬季利润期',
        oldGoodsRatio: 0.08,
        newGoodsRatio: 0.92,
        actualOldGoodsRatio: 0.12,
        actualNewGoodsRatio: 0.88,
        sellThroughTarget: 0.85,
        discountTarget: 0.85,
        newGoodsDiscountTarget: 0.96,
        oldGoodsDiscountTarget: 0.84,
        actualNewGoodsDiscount: 0.94,
        actualOldGoodsDiscount: 0.82,
        launchWindow: '10月上旬-11月上旬',
        sellWindow: '11月上旬-12月中旬',
        markdownWindow: '12月中旬-12月末',
        clearanceWindow: '11月下旬-12月末',
        carryoverRisk: '双11 后折扣拉深会侵蚀冬季利润。',
        handoffFocus: '冬季保暖主推与双11、圣诞档期节奏同步。',
        nextSeasonLabel: '次年春季',
        timelinePlan: {
            launch: { start: 10.06, end: 11.12 },
            mainSell: { start: 10.84, end: 12.24 },
            clearance: { start: 11.82, end: 12.96 },
            handoff: { start: 12.42, end: 12.98 },
        },
        timelineActual: {
            launch: { start: 10.14, end: 11.00 },
            mainSell: { start: 10.96, end: 12.12 },
            clearance: { start: 11.72, end: 12.98 },
            handoff: { start: 12.30, end: 12.98 },
        },
        lifecyclePlan: {
            launch: 0.24,
            mainSell: 0.50,
            mature: 0.18,
            clearance: 0.08,
        },
        lifecycleActual: {
            launch: 0.18,
            mainSell: 0.46,
            mature: 0.22,
            clearance: 0.14,
        },
        discountPlanByStage: {
            launch: 0.98,
            mainSell: 0.96,
            clearance: 0.84,
        },
        discountActualByStage: {
            launch: 0.96,
            mainSell: 0.94,
            clearance: 0.82,
        },
    },
];

export const ANNUAL_MERCH_FOCUS_TEMPLATE: AnnualMerchandisingFocus[] = [
    { month: 1, wave: 'W01', season: 'Q1', sceneId: 'festival-gifting', mainCategory: ['短靴', '长靴', '德训鞋'], mainPriceBandId: 'PB2', keyRole: '主推款', marketingLevel: 'A', lifestyleSummary: '冬季清货与春季首波并行，礼赠与通勤场景同时推进。', priority: '保障春一波上市与冬货尾量出清并行。' },
    { month: 2, wave: 'W02', season: 'Q1', sceneId: 'season-shift', mainCategory: ['德训鞋', '乐福鞋', '玛丽珍'], mainPriceBandId: 'PB2', keyRole: '主推款', marketingLevel: 'S', lifestyleSummary: '春节与情人节带动送礼和换季需求。', priority: '推动春装主销，清理冬装尾货。' },
    { month: 3, wave: 'W03', season: 'Q1', sceneId: 'commute', mainCategory: ['\u4e50\u798f\u978b', '\u739b\u4e3d\u73cd', '\u590d\u53e4\u8dd1'], mainPriceBandId: 'PB2', keyRole: '\u57fa\u672c\u6b3e', marketingLevel: 'B', lifestyleSummary: '3.8 \u5987\u5973\u8282\u4e0e\u6625\u5b63\u901a\u52e4\u6362\u5b63\u5e76\u884c\uff0c\u8f7b\u5347\u7ea7\u548c\u767e\u642d\u9700\u6c42\u653e\u5927\u3002', priority: '\u7a33\u4f4f\u901a\u52e4\u7206\u6b3e\uff0c\u653e\u5927\u739b\u4e3d\u73cd\u548c\u8f7b\u8fd0\u52a8\u767e\u642d\u6b3e\u7684\u8282\u5e86\u627f\u63a5\u3002' },
    { month: 4, wave: 'W04', season: 'Q2', sceneId: 'holiday-travel', mainCategory: ['凉鞋', '玛丽珍', '复古跑'], mainPriceBandId: 'PB2', keyRole: '引流款', marketingLevel: 'A', lifestyleSummary: '假日出行与五一预热，透气与轻量开始上升。', priority: '完成夏一波上新与五一主推搭配。' },
    { month: 5, wave: 'W05', season: 'Q2', sceneId: 'summer-cooling', mainCategory: ['\u51c9\u978b', '\u739b\u4e3d\u73cd', '\u4e50\u798f\u978b'], mainPriceBandId: 'PB1', keyRole: '\u5f15\u6d41\u6b3e', marketingLevel: 'A', lifestyleSummary: '5.1 \u52b3\u52a8\u8282\u51fa\u6e38\u4e0e\u6e05\u51c9\u901a\u52e4\u5e76\u884c\uff0c\u51c9\u978b\u548c\u4f4e\u95e8\u69db\u8d70\u91cf\u5e26\u53d1\u529b\u3002', priority: '\u5b8c\u6210\u4e94\u4e00\u4e3b\u63a8\u627f\u63a5\uff0c\u62c9\u5f00\u590f\u5b63\u4ef7\u683c\u5e26\u5c42\u6b21\u5e76\u63a7\u5236\u6625\u8d27\u5c3e\u90e8\u6298\u6263\u3002' },
    { month: 6, wave: 'W06', season: 'Q2', sceneId: 'light-outdoor', mainCategory: ['\u6237\u5916/\u673a\u80fd', '\u590d\u53e4\u8dd1', '\u51c9\u978b'], mainPriceBandId: 'PB2', keyRole: '\u4e3b\u63a8\u6b3e', marketingLevel: 'B', lifestyleSummary: '6.1 \u513f\u7ae5\u8282\u3001\u5e74\u4e2d\u7279\u60e0\u4e0e\u8f7b\u6237\u5916\u573a\u666f\u53e0\u52a0\uff0c\u5f3a\u8c03\u529f\u80fd\u3001\u8212\u9002\u4e0e\u5f15\u6d41\u5e76\u91cd\u3002', priority: '\u540c\u6b65\u63a8\u8fdb\u590f\u4e3b\u9500\u3001\u5e74\u4e2d\u7279\u60e0\u8f6c\u5316\u548c\u6625\u8d27\u9000\u5e02\u3002' },
    { month: 7, wave: 'W07', season: 'Q3', sceneId: 'holiday-travel', mainCategory: ['复古跑', '户外/机能', '德训鞋'], mainPriceBandId: 'PB2', keyRole: '主推款', marketingLevel: 'B', lifestyleSummary: '暑期出游和返校前夕，轻户外和复古跑适合做深。', priority: '秋一波上市，维持暑期主推热度。' },
    { month: 8, wave: 'W08', season: 'Q3', sceneId: 'festival-gifting', mainCategory: ['玛丽珍', '乐福鞋', '形象款'], mainPriceBandId: 'PB3', keyRole: '节庆/主题款', marketingLevel: 'B', lifestyleSummary: '七夕与返校季并行，礼赠与通勤升级共振。', priority: '提升形象升级带曝光，准备国庆前结构。' },
    { month: 9, wave: 'W09', season: 'Q3', sceneId: 'season-shift', mainCategory: ['短靴', '德训鞋', '复古跑'], mainPriceBandId: 'PB2', keyRole: '主推款', marketingLevel: 'A', lifestyleSummary: '换季过渡与中秋国庆双节来临，靴类与通勤过渡款进入焦点。', priority: '秋冬切换要快，夏货尾量要收。' },
    { month: 10, wave: 'W10', season: 'Q4', sceneId: 'autumn-warmth', mainCategory: ['短靴', '长靴', '户外/机能'], mainPriceBandId: 'PB3', keyRole: '主推款', marketingLevel: 'S', lifestyleSummary: '秋冬保暖和国庆场景并行，靴类与功能产品承接客单。', priority: '把冬一波做成利润窗口，压住夏货尾部。' },
    { month: 11, wave: 'W11', season: 'Q4', sceneId: 'festival-gifting', mainCategory: ['短靴', '乐福鞋', '复古跑'], mainPriceBandId: 'PB2', keyRole: '引流款', marketingLevel: 'S', lifestyleSummary: '双11 是流量冲刺窗口，主推款、引流款和形象款要分层。', priority: '兼顾规模与折扣红线，避免双11 后失速。' },
    { month: 12, wave: 'W12', season: 'Q4', sceneId: 'year-end-party', mainCategory: ['长靴', '玛丽珍', '形象款'], mainPriceBandId: 'PB3', keyRole: '形象款', marketingLevel: 'A', lifestyleSummary: '圣诞、跨年与聚会场景提升造型需求，形象升级带更有效。', priority: '收官清货与跨年形象主推同步推进。' },
];

export const ANNUAL_CONTROL_ACTION_MONTH_BRIEFS: AnnualControlActionMonthBrief[] = [
    { month: 1, focusTitle: '双节礼赠与春波承接', focusSummary: '春节前要稳住礼赠与通勤需求，确保春一波上市和冬货清尾同步推进。', syncKey: 'action-01-summary' },
    { month: 2, focusTitle: '春主销承接与秋订货前置', focusSummary: '情人节、元宵叠加春主销窗口，边拉动春季走量边冻结秋季订货方向。', syncKey: 'action-02-summary' },
    { month: 3, focusTitle: '妇女节换季与夏波预排', focusSummary: '3.8 节庆与换季通勤并行，春主销复盘和夏一波上市准备必须同月完成。', syncKey: 'action-03-summary' },
    { month: 4, focusTitle: '五一预热与春退夏进', focusSummary: '清明到五一是夏一波放量前的切换窗口，春尾货退出与夏货入口要同步完成。', syncKey: 'action-04-summary' },
    { month: 5, focusTitle: '劳动节承接与夏主销拉量', focusSummary: '劳动节假期后的凉鞋与透气款要持续拉量，同时控制春尾货折扣和库存尾部。', syncKey: 'action-05-summary' },
    { month: 6, focusTitle: '年中特惠与冬订货评审', focusSummary: '儿童节、年中特惠和轻户外场景叠加，本月既要做转化，也要完成冬季结构评审。', syncKey: 'action-06-summary' },
    { month: 7, focusTitle: '暑期主推与秋波预热', focusSummary: '暑期出游窗口要把轻户外和复古跑做深，同时为秋一波上市预留切换空间。', syncKey: 'action-07-summary' },
    { month: 8, focusTitle: '七夕返校与秋主销起量', focusSummary: '礼赠升级与返校通勤同步发生，秋季主销需要在七夕前后完成第一波起量。', syncKey: 'action-08-summary' },
    { month: 9, focusTitle: '双节承接与冬货切入', focusSummary: '中秋国庆双节会放大换季需求，秋主销、冬一波切入和夏货清尾要同时对齐。', syncKey: 'action-09-summary' },
    { month: 10, focusTitle: '冬主销启动与春季前置验证', focusSummary: '国庆后冬季主销启动，本月既要守利润带，也要把春季结构和 OTB 输入前置验证。', syncKey: 'action-10-summary' },
    { month: 11, focusTitle: '双11冲刺与利润红线盯控', focusSummary: '双11 是全年流量冲刺月，重点是守住折扣红线、补货节奏和双11后的热度延续。', syncKey: 'action-11-summary' },
    { month: 12, focusTitle: '跨年清尾与来年春波预热', focusSummary: '圣诞跨年与年终清尾并行，要把冬货收尾和次年春一波预热衔接成同一张计划。', syncKey: 'action-12-summary' },
];

export const ANNUAL_CONTROL_ACTIONS: CrossFunctionalAction[] = [
    { month: 1, teamType: '商品', actionTitle: '锁春一波首单深度', actionDesc: '核查主推鞋型的尺码完整度和首单深度，避免春节前断码。', deliverable: '春一波补深清单', syncKey: 'action-01-merch', priority: 'P0', riskFlag: true, relatedWave: 'W01', relatedSeason: 'Q1', relatedModule: 'planning' },
    { month: 1, teamType: '设计企划', actionTitle: '确认春主推卖点卡', actionDesc: '统一乐福鞋、德训鞋与长短靴的春季卖点话术，便于店端执行。', deliverable: '春主推卖点脚本', syncKey: 'action-01-design', priority: 'P1', riskFlag: false, relatedWave: 'W01', relatedSeason: 'Q1', relatedModule: 'design-review' },
    { month: 1, teamType: '品牌陈列', actionTitle: '切双节主视觉', actionDesc: '元旦与春节礼赠、通勤双主题并行，橱窗与卡台分区切换。', deliverable: '双节陈列指引', syncKey: 'action-01-vm', priority: 'P1', riskFlag: false, relatedWave: 'W01', relatedSeason: 'Q1', relatedModule: 'channel' },

    { month: 2, teamType: '商品', actionTitle: '盯春主销销补节奏', actionDesc: '根据情人节和元宵动销表现滚动补货，压住冬货尾量。', deliverable: '热销补货建议', syncKey: 'action-02-merch', priority: 'P0', riskFlag: false, relatedWave: 'W02', relatedSeason: 'Q1', relatedModule: 'category' },
    { month: 2, teamType: '设计企划', actionTitle: '冻结秋订货会主题', actionDesc: '明确秋季主打鞋型、价格带和形象款方向，进入订货会准备。', deliverable: '秋订货会主题版单', syncKey: 'action-02-design', priority: 'P0', riskFlag: true, relatedWave: 'W02', relatedSeason: 'Q1', relatedModule: 'design-review' },
    { month: 2, teamType: '品牌陈列', actionTitle: '搭情人节礼赠场', actionDesc: '围绕礼赠与轻通勤场景调整入口陈列，承接春主销。', deliverable: '礼赠陈列清单', syncKey: 'action-02-vm', priority: 'P1', riskFlag: false, relatedWave: 'W02', relatedSeason: 'Q1', relatedModule: 'channel' },

    { month: 3, teamType: '商品', actionTitle: '复盘春主销并排夏波', actionDesc: '复盘春季售罄、折扣和销配比，完成夏一波上市货盘排布。', deliverable: '春复盘与夏上市清单', syncKey: 'action-03-merch', priority: 'P0', riskFlag: false, relatedWave: 'W03', relatedSeason: 'Q1', relatedModule: 'category' },
    { month: 3, teamType: '设计企划', actionTitle: '锁夏通勤升级带', actionDesc: '聚焦玛丽珍、乐福鞋和复古跑，补齐夏一波卖点与系列组合。', deliverable: '夏一波款式优先级', syncKey: 'action-03-design', priority: 'P1', riskFlag: false, relatedWave: 'W03', relatedSeason: 'Q1', relatedModule: 'design-review' },
    { month: 3, teamType: '品牌陈列', actionTitle: '切3.8换季入口', actionDesc: '把妇女节升级款与春夏换季入口合并呈现，放大百搭与轻升级。', deliverable: '3.8换季橱窗包', syncKey: 'action-03-vm', priority: 'P1', riskFlag: false, relatedWave: 'W03', relatedSeason: 'Q1', relatedModule: 'channel' },

    { month: 4, teamType: '商品', actionTitle: '推夏一波并清春尾', actionDesc: '完成夏一波上新深度分配，同步拉春尾货分层退出。', deliverable: '春退市名单', syncKey: 'action-04-merch', priority: 'P0', riskFlag: false, relatedWave: 'W04', relatedSeason: 'Q2', relatedModule: 'inventory' },
    { month: 4, teamType: '设计企划', actionTitle: '校对五一出游主题', actionDesc: '把凉鞋、复古跑和轻通勤单品的出游表达统一到卖点脚本。', deliverable: '五一主推脚本', syncKey: 'action-04-design', priority: 'P1', riskFlag: false, relatedWave: 'W04', relatedSeason: 'Q2', relatedModule: 'design-review' },
    { month: 4, teamType: '品牌陈列', actionTitle: '上清明五一入口', actionDesc: '围绕假日出行和清凉通勤调整主入口和端架。', deliverable: '五一入口陈列包', syncKey: 'action-04-vm', priority: 'P1', riskFlag: false, relatedWave: 'W04', relatedSeason: 'Q2', relatedModule: 'channel' },

    { month: 5, teamType: '商品', actionTitle: '拉夏主销量带深度', actionDesc: '围绕凉鞋和低门槛价格带补深，确保劳动节承接后持续放量。', deliverable: '夏主销量带补货单', syncKey: 'action-05-merch', priority: 'P0', riskFlag: false, relatedWave: 'W05', relatedSeason: 'Q2', relatedModule: 'planning' },
    { month: 5, teamType: '设计企划', actionTitle: '整理年中特惠货池', actionDesc: '复盘夏主推反馈，前置梳理可进入年中特惠的货池与沟通点。', deliverable: '年中特惠货池建议', syncKey: 'action-05-design', priority: 'P1', riskFlag: false, relatedWave: 'W05', relatedSeason: 'Q2', relatedModule: 'otb' },
    { month: 5, teamType: '品牌陈列', actionTitle: '切5.1初夏主推', actionDesc: '把劳动节出游与初夏通勤双场景落到店端陈列。', deliverable: '初夏陈列物料清单', syncKey: 'action-05-vm', priority: 'P1', riskFlag: false, relatedWave: 'W05', relatedSeason: 'Q2', relatedModule: 'channel' },

    { month: 6, teamType: '商品', actionTitle: '收春退市并排特惠', actionDesc: '完成春货退市收官，同时把年中特惠和夏主销量带货池拉通。', deliverable: '退市复盘与特惠货池', syncKey: 'action-06-merch', priority: 'P0', riskFlag: false, relatedWave: 'W06', relatedSeason: 'Q2', relatedModule: 'inventory' },
    { month: 6, teamType: '设计企划', actionTitle: '评审冬订货会结构', actionDesc: '锁定冬季保暖、户外机能与双11结构占比，准备订货评审。', deliverable: '冬订货会结构版单', syncKey: 'action-06-design', priority: 'P0', riskFlag: true, relatedWave: 'W06', relatedSeason: 'Q2', relatedModule: 'design-review' },
    { month: 6, teamType: '品牌陈列', actionTitle: '上6.1与年中特惠', actionDesc: '统一儿童节、年中特惠和轻户外场景的店端传播节奏。', deliverable: '6.1/年中特惠陈列包', syncKey: 'action-06-vm', priority: 'P1', riskFlag: false, relatedWave: 'W06', relatedSeason: 'Q2', relatedModule: 'channel' },

    { month: 7, teamType: '商品', actionTitle: '补暑期轻户外走量', actionDesc: '对轻户外和复古跑高转化款补货，并预排秋一波上市深度。', deliverable: '暑期补货与秋预排', syncKey: 'action-07-merch', priority: 'P1', riskFlag: false, relatedWave: 'W07', relatedSeason: 'Q3', relatedModule: 'planning' },
    { month: 7, teamType: '设计企划', actionTitle: '确认秋一波主推鞋型', actionDesc: '把复古跑、机能鞋和返校通勤款的卖点与楦底方向锁清。', deliverable: '秋一波打样确认单', syncKey: 'action-07-design', priority: 'P1', riskFlag: false, relatedWave: 'W07', relatedSeason: 'Q3', relatedModule: 'design-review' },
    { month: 7, teamType: '品牌陈列', actionTitle: '切暑期出游陈列', actionDesc: '维持暑期主推热度，并为秋一波留出入口切换位。', deliverable: '暑期场景切换指引', syncKey: 'action-07-vm', priority: 'P1', riskFlag: false, relatedWave: 'W07', relatedSeason: 'Q3', relatedModule: 'channel' },

    { month: 8, teamType: '商品', actionTitle: '排七夕返校双货池', actionDesc: '把礼赠升级款和返校通勤款拆分货池，拉开价格带与节奏。', deliverable: '七夕/返校货池图', syncKey: 'action-08-merch', priority: 'P0', riskFlag: false, relatedWave: 'W08', relatedSeason: 'Q3', relatedModule: 'category' },
    { month: 8, teamType: '设计企划', actionTitle: '锁冬一波形象升级', actionDesc: '确认冬一波形象款、礼赠升级款与主推靴型的组合节奏。', deliverable: '冬一波形象款清单', syncKey: 'action-08-design', priority: 'P1', riskFlag: false, relatedWave: 'W08', relatedSeason: 'Q3', relatedModule: 'design-review' },
    { month: 8, teamType: '品牌陈列', actionTitle: '上七夕礼赠主题', actionDesc: '把七夕礼赠和返校切换合并呈现在主入口和重点端架。', deliverable: '七夕礼赠陈列包', syncKey: 'action-08-vm', priority: 'P1', riskFlag: false, relatedWave: 'W08', relatedSeason: 'Q3', relatedModule: 'channel' },

    { month: 9, teamType: '商品', actionTitle: '排双节货盘与冬承接', actionDesc: '完成中秋国庆档期货盘排布，确保秋主销与冬一波切换不断档。', deliverable: '双节货盘排布图', syncKey: 'action-09-merch', priority: 'P0', riskFlag: true, relatedWave: 'W09', relatedSeason: 'Q3', relatedModule: 'inventory' },
    { month: 9, teamType: '设计企划', actionTitle: '转译冬一波卖点', actionDesc: '把保暖、功能和造型升级卖点转成前台话术与训练素材。', deliverable: '冬卖点培训包', syncKey: 'action-09-design', priority: 'P1', riskFlag: false, relatedWave: 'W09', relatedSeason: 'Q3', relatedModule: 'design-review' },
    { month: 9, teamType: '品牌陈列', actionTitle: '切中秋国庆主入口', actionDesc: '围绕双节出游和返乡场景完成门店主入口切换。', deliverable: '双节入口陈列指引', syncKey: 'action-09-vm', priority: 'P1', riskFlag: false, relatedWave: 'W09', relatedSeason: 'Q3', relatedModule: 'channel' },

    { month: 10, teamType: '商品', actionTitle: '盯冬主销与双11货池', actionDesc: '压实冬主销利润带，同时提前排双11引流与主推货池。', deliverable: '双11货池清单', syncKey: 'action-10-merch', priority: 'P0', riskFlag: true, relatedWave: 'W10', relatedSeason: 'Q4', relatedModule: 'inventory' },
    { month: 10, teamType: '设计企划', actionTitle: '验春季结构与OTB', actionDesc: '前置验证春季品类、价格带和形象款比例，为 OTB 提供输入。', deliverable: '春季结构建议', syncKey: 'action-10-design', priority: 'P1', riskFlag: false, relatedWave: 'W10', relatedSeason: 'Q4', relatedModule: 'otb' },
    { month: 10, teamType: '品牌陈列', actionTitle: '切冬季主推入口', actionDesc: '国庆后快速转入冬季主入口，突出保暖和功能卖点。', deliverable: '冬季主推陈列图', syncKey: 'action-10-vm', priority: 'P1', riskFlag: false, relatedWave: 'W10', relatedSeason: 'Q4', relatedModule: 'channel' },

    { month: 11, teamType: '商品', actionTitle: '盯双11折扣红线', actionDesc: '按品类和价格带盯控折扣深度、库存与毛利底线。', deliverable: '折扣红线日报', syncKey: 'action-11-merch', priority: 'P0', riskFlag: true, relatedWave: 'W11', relatedSeason: 'Q4', relatedModule: 'inventory' },
    { month: 11, teamType: '设计企划', actionTitle: '复核春二波修正项', actionDesc: '结合双11反馈复核春二波的结构修正与形象款节奏。', deliverable: '春二波修正单', syncKey: 'action-11-design', priority: 'P1', riskFlag: false, relatedWave: 'W11', relatedSeason: 'Q4', relatedModule: 'design-review' },
    { month: 11, teamType: '品牌陈列', actionTitle: '推双11与初冬场景', actionDesc: '放大双11引流，同时保持初冬主推门店热度不断档。', deliverable: '双11门店执行包', syncKey: 'action-11-vm', priority: 'P1', riskFlag: false, relatedWave: 'W11', relatedSeason: 'Q4', relatedModule: 'channel' },

    { month: 12, teamType: '商品', actionTitle: '做跨年承接与清尾', actionDesc: '统筹冬货清尾和春一波上市承接，锁定跨年门店货盘。', deliverable: '跨年承接表', syncKey: 'action-12-merch', priority: 'P0', riskFlag: false, relatedWave: 'W12', relatedSeason: 'Q4', relatedModule: 'planning' },
    { month: 12, teamType: '设计企划', actionTitle: '做年度复盘与新年brief', actionDesc: '复盘年度主推鞋型与卖点表现，为下一年度主题切换提供输入。', deliverable: '年度复盘 brief', syncKey: 'action-12-design', priority: 'P1', riskFlag: false, relatedWave: 'W12', relatedSeason: 'Q4', relatedModule: 'design-review' },
    { month: 12, teamType: '品牌陈列', actionTitle: '收官跨年形象主题', actionDesc: '完成圣诞跨年形象收官，并预留新年开门红入口位置。', deliverable: '跨年门店主题包', syncKey: 'action-12-vm', priority: 'P1', riskFlag: false, relatedWave: 'W12', relatedSeason: 'Q4', relatedModule: 'channel' },
];
const NODE_TYPE_LABELS: Record<AnnualControlNodeType, string> = {
    'solar-term': '节气',
    festival: '节庆',
    buying: '订货会',
    qotb: 'QOTB',
    sotb: 'SOTB',
    launch: '上市',
    clearance: '清货',
    marketing: '营销',
};

export const ANNUAL_CONTROL_NODE_TYPE_LABELS = NODE_TYPE_LABELS;
export const ANNUAL_CONTROL_SEASON_LABELS: Record<DashboardSeason, string> = {
    Q1: '春季',
    Q2: '夏季',
    Q3: '秋季',
    Q4: '冬季',
};

export function getAnnualControlScopeMonths(filters: Pick<DashboardFilters, 'season' | 'wave'>) {
    if (filters.wave !== 'all') {
        const month = getDashboardMonthByWave(filters.wave);
        return month ? [month] : [];
    }
    if (filters.season !== 'all') {
        const index = DASHBOARD_SEASON_ORDER.indexOf(filters.season as DashboardSeason);
        if (index === -1) return [];
        const start = index * 3 + 1;
        return [start, start + 1, start + 2];
    }
    return Array.from({ length: 12 }, (_, idx) => idx + 1);
}

export function getAnnualControlFocusMonth(filters: Pick<DashboardFilters, 'season' | 'wave'>) {
    if (filters.wave !== 'all') return getDashboardMonthByWave(filters.wave);
    if (filters.season !== 'all') return getAnnualControlScopeMonths(filters)[0] ?? null;
    return null;
}

export function getAnnualControlStage(filters: Pick<DashboardFilters, 'season' | 'wave'>) {
    const focusMonth = getAnnualControlFocusMonth(filters);
    if (!focusMonth) {
        return {
            id: 'annual-overview',
            label: '年度统筹期',
            priority: '按季度切换管理上新、主销、折扣与清货窗口。',
            risk: '避免季度切换断层，确保新旧货承接不断档。',
            season: 'all' as const,
            wave: 'all' as const,
            nodeLabel: '全年经营节奏总览',
        };
    }
    const season = getDashboardSeasonByWave(`W${String(focusMonth).padStart(2, '0')}`) || 'Q1';
    const phaseIndex = (focusMonth - 1) % 3;
    const wave = `W${String(focusMonth).padStart(2, '0')}` as DashboardWave;
    const labels = [
        {
            id: 'launch',
            label: '上新启动',
            priority: '优先保障主推款上市完整度、首单深度与陈列同步。',
            risk: '若首波铺货不足，会直接拖慢整季售罄爬坡。',
        },
        {
            id: 'core-selling',
            label: '主销推进',
            priority: '聚焦主推款转化、渠道结构优化与活动放大。',
            risk: '若主销阶段节奏失速，后续只能通过折扣追量。',
        },
        {
            id: 'discount-switch',
            label: '折扣切换',
            priority: '收口折扣、老货退出并为下一波承接腾出陈列与预算。',
            risk: '若老货退出不及时，会挤压下一波新品承接空间。',
        },
    ][phaseIndex];

    return {
        ...labels,
        season,
        wave,
        nodeLabel: `${ANNUAL_CONTROL_SEASON_LABELS[season]} · ${wave}`,
    };
}

export function getAnnualControlTimeline(filters: Pick<DashboardFilters, 'season' | 'wave' | 'region'>) {
    const scopeMonths = new Set(getAnnualControlScopeMonths(filters));
    return ANNUAL_CONTROL_TIMELINE_NODES.filter((node) => {
        const monthMatch = scopeMonths.size === 12 || scopeMonths.has(node.month);
        const regionMatch = filters.region === 'all' || node.relatedRegion === 'all' || node.relatedRegion === filters.region;
        return monthMatch && regionMatch;
    });
}

export function getAnnualControlFocus(filters: Pick<DashboardFilters, 'season' | 'wave'>) {
    const focusMonth = getAnnualControlActiveMonth(filters);
    return ANNUAL_MERCH_FOCUS_TEMPLATE.find((item) => item.month === focusMonth) || null;
}

export function getAnnualControlTransitions(filters: Pick<DashboardFilters, 'season'>) {
    if (filters.season === 'all') return SEASONAL_INVENTORY_TRANSITIONS;
    return SEASONAL_INVENTORY_TRANSITIONS.filter((item) => item.season === filters.season);
}

export function getAnnualControlActions(filters: Pick<DashboardFilters, 'season' | 'wave'>) {
    const focusMonth = getAnnualControlFocusMonth(filters);
    if (focusMonth) return ANNUAL_CONTROL_ACTIONS.filter((item) => item.month === focusMonth);
    const scopeMonths = new Set(getAnnualControlScopeMonths(filters));
    return ANNUAL_CONTROL_ACTIONS.filter((item) => scopeMonths.has(item.month));
}

export function getAnnualControlClimate(region: string | 'all') {
    const normalizedRegion = normalizeAnnualControlRegion(region);
    return ANNUAL_CONTROL_CLIMATE_PROFILES.find((item) => item.region === normalizedRegion) || ANNUAL_CONTROL_CLIMATE_PROFILES[0];
}

export function getAnnualControlPriceBand(id: 'PB1' | 'PB2' | 'PB3' | 'PB4') {
    return FOOTWEAR_PRICE_BAND_POSITIONING.find((item) => item.id === id) || FOOTWEAR_PRICE_BAND_POSITIONING[1];
}

export function getAnnualControlKeyRole(role: FootwearMerchKeyRole) {
    return FOOTWEAR_KEY_ROLE_OPTIONS.find((item) => item.id === role) || FOOTWEAR_KEY_ROLE_OPTIONS[0];
}

export function getAnnualControlScene(sceneId: string) {
    return FOOTWEAR_SCENE_OPTIONS.find((item) => item.id === sceneId) || FOOTWEAR_SCENE_OPTIONS[0];
}

function getAnnualControlCompactCategoryLabel(category: string) {
    return {
        '德训鞋': '德训',
        '乐福鞋': '乐福',
        '玛丽珍': '玛丽珍',
        '复古跑': '复古跑',
        '凉鞋': '凉鞋',
        '短靴': '短靴',
        '长靴': '长靴',
        '户外/机能': '机能',
        '节庆/主题款': '节庆',
        '形象款': '形象',
    }[category] || category;
}

function getAnnualControlCompactPriceBandLabel(priceBandId: 'PB1' | 'PB2' | 'PB3' | 'PB4') {
    return {
        PB1: '299-399 入门',
        PB2: '399-599 走量',
        PB3: '599-799 升级',
        PB4: '799+ 形象',
    }[priceBandId];
}

function getAnnualControlCompactSceneLabel(sceneId: string) {
    return {
        'festival-gifting': '节礼',
        'season-shift': '换季',
        commute: '通勤',
        'holiday-travel': '假日',
        'summer-cooling': '夏凉',
        'light-outdoor': '轻户外',
        'autumn-warmth': '保暖',
        'year-end-party': '聚会',
    }[sceneId] || '场景';
}

function getAnnualControlCompactKeyRole(role: FootwearMerchKeyRole) {
    return {
        '主推款': '主推',
        '引流款': '引流',
        '基本款': '基本',
        '形象款': '形象',
        '节庆/主题款': '节庆',
    }[role] || role;
}

export function getAnnualControlDesignReserveFields(month: number) {
    return ANNUAL_CONTROL_DESIGN_RESERVE_FIELDS[month] || {
        bottomTypeHint: '底型策略预留',
        lastShapeHint: '楦型策略预留',
        platformStrategyHint: '平台策略预留',
    };
}

export function buildAnnualControlDesignReviewInput(params: {
    filters: Pick<DashboardFilters, 'season' | 'wave' | 'region'>;
    focus: AnnualMerchandisingFocus | null;
    transition: SeasonalInventoryTransition | null;
    stage: ReturnType<typeof getAnnualControlStage>;
}): AnnualControlDesignReviewInput {
    const focus = params.focus;
    const transition = params.transition;
    const scene = focus ? getAnnualControlScene(focus.sceneId) : FOOTWEAR_SCENE_OPTIONS[0];
    const priceBand = focus ? getAnnualControlPriceBand(focus.mainPriceBandId) : FOOTWEAR_PRICE_BAND_POSITIONING[1];
    const activeMonth = focus?.month || getAnnualControlActiveMonth(params.filters);
    const reserveFields = getAnnualControlDesignReserveFields(activeMonth);
    const regionHint = params.filters.region === 'all' ? '全国通用节奏' : params.filters.region + '区优先执行';
    const platformStrategy = reserveFields.platformStrategyHint || regionHint + '，当前重点围绕 ' + scene.label + ' 做平台表达。';

    return {
        currentSeason: focus ? ANNUAL_CONTROL_SEASON_LABELS[focus.season] : '全年统筹',
        currentWave: focus?.wave || '全年',
        mainScene: scene.label,
        mainPriceBand: priceBand.label + ' · ' + priceBand.range,
        mainCategories: focus?.mainCategory || ['待定品类'],
        keyRole: focus?.keyRole || '主推款',
        newOldTarget: transition ? '新 ' + Math.round(transition.newGoodsRatio * 100) + '% / 旧 ' + Math.round(transition.oldGoodsRatio * 100) + '%' : '按季度切换配置',
        platformHint: platformStrategy,
        platformStrategyHint: platformStrategy,
        developmentHint: focus?.priority || params.stage.priority,
        gateReminder: params.stage.risk,
        mainBottomType: reserveFields.bottomTypeHint,
        mainLastShape: reserveFields.lastShapeHint,
    };
}

export const ANNUAL_CONTROL_MONTH_AXIS: AnnualControlMonthAxisItem[] = [
    { month: 1, wave: 'W01', season: 'Q1', seasonLabel: '春季经营', weekRange: '周1-4', mdRange: 'MD 1-4', phaseLabel: '春上新' },
    { month: 2, wave: 'W02', season: 'Q1', seasonLabel: '春季经营', weekRange: '周5-8', mdRange: 'MD 5-8', phaseLabel: '春主销' },
    { month: 3, wave: 'W03', season: 'Q1', seasonLabel: '春季经营', weekRange: '周9-13', mdRange: 'MD 9-13', phaseLabel: '春收口' },
    { month: 4, wave: 'W04', season: 'Q2', seasonLabel: '夏季经营', weekRange: '周14-17', mdRange: 'MD 14-17', phaseLabel: '夏上新' },
    { month: 5, wave: 'W05', season: 'Q2', seasonLabel: '夏季经营', weekRange: '周18-22', mdRange: 'MD 18-22', phaseLabel: '夏主销' },
    { month: 6, wave: 'W06', season: 'Q2', seasonLabel: '夏季经营', weekRange: '周23-26', mdRange: 'MD 23-26', phaseLabel: '春退市' },
    { month: 7, wave: 'W07', season: 'Q3', seasonLabel: '秋季经营', weekRange: '周27-31', mdRange: 'MD 27-31', phaseLabel: '秋上新' },
    { month: 8, wave: 'W08', season: 'Q3', seasonLabel: '秋季经营', weekRange: '周32-35', mdRange: 'MD 32-35', phaseLabel: '节庆预热' },
    { month: 9, wave: 'W09', season: 'Q3', seasonLabel: '秋季经营', weekRange: '周36-39', mdRange: 'MD 36-39', phaseLabel: '秋冬承接' },
    { month: 10, wave: 'W10', season: 'Q4', seasonLabel: '冬季经营', weekRange: '周40-44', mdRange: 'MD 40-44', phaseLabel: '冬上新' },
    { month: 11, wave: 'W11', season: 'Q4', seasonLabel: '冬季经营', weekRange: '周45-48', mdRange: 'MD 45-48', phaseLabel: '双11冲刺' },
    { month: 12, wave: 'W12', season: 'Q4', seasonLabel: '冬季经营', weekRange: '周49-52', mdRange: 'MD 49-52', phaseLabel: '年末清货' },
];

export const ANNUAL_CONTROL_DESIGN_RESERVE_FIELDS: Record<number, AnnualControlDesignReserveFields> = {
    1: { bottomTypeHint: '防滑厚底（预留）', lastShapeHint: '圆楦保暖（预留）', platformStrategyHint: '线下保暖陈列优先，电商礼赠组合曝光。' },
    2: { bottomTypeHint: '轻量平底（预留）', lastShapeHint: '浅口方圆楦（预留）', platformStrategyHint: '线下做换季组合陈列，电商突出礼赠和通勤双场景。' },
    3: { bottomTypeHint: '轻弹通勤底（预留）', lastShapeHint: '方圆楦通勤楦（预留）', platformStrategyHint: '通勤走量带线上线下同推，线下更强调成套陈列。' },
    4: { bottomTypeHint: '轻量缓震底（预留）', lastShapeHint: '夏季浅口楦（预留）', platformStrategyHint: '线下做假日出行主题，电商强调轻量和出片感。' },
    5: { bottomTypeHint: '透气轻底（预留）', lastShapeHint: '露趾/浅口楦（预留）', platformStrategyHint: '电商放大入门带引流，线下维持凉鞋专区完整度。' },
    6: { bottomTypeHint: '抓地机能底（预留）', lastShapeHint: '宽楦户外楦（预留）', platformStrategyHint: '线下突出功能体验，电商强调轻户外场景和参数感。' },
    7: { bottomTypeHint: '轻弹运动底（预留）', lastShapeHint: '运动休闲楦（预留）', platformStrategyHint: '线下做返校与暑期出游并置，电商放大户外和复古跑转化。' },
    8: { bottomTypeHint: '精致轻底（预留）', lastShapeHint: '方头浅口楦（预留）', platformStrategyHint: '线下突出礼赠展示，电商强化节庆主题和套组转化。' },
    9: { bottomTypeHint: '秋季轻厚底（预留）', lastShapeHint: '短靴通勤楦（预留）', platformStrategyHint: '线下优先完成秋冬切换，电商强调换季过渡组合。' },
    10: { bottomTypeHint: '防滑厚底（预留）', lastShapeHint: '保暖长短靴楦（预留）', platformStrategyHint: '线下突出靴类陈列高度，电商强调保暖和机能标签。' },
    11: { bottomTypeHint: '电商爆发款底型（预留）', lastShapeHint: '大众适脚楦（预留）', platformStrategyHint: '电商承担引流爆发，线下守住利润和形象升级带。' },
    12: { bottomTypeHint: '节庆形象底（预留）', lastShapeHint: '造型感楦型（预留）', platformStrategyHint: '线下突出节庆氛围，电商强化礼赠和聚会场景表达。' },
};

export const ANNUAL_CONTROL_REGION_TEMPERATURE_SERIES: Record<string, string[]> = {
    all: ['\u5357\u9AD8\u5317\u4F4E', '\u5357\u6696\u5317\u51B7', '\u7531\u5357\u5411\u5317\u56DE\u6696', '\u5168\u56FD\u5165\u6625', '\u521D\u590F\u5317\u62AC', '\u534E\u5357\u9177\u70ED', '\u5168\u56FD\u9AD8\u6E29', '\u6691\u70ED\u6301\u7EED', '\u5317\u51C9\u5357\u70ED', '\u5168\u56FD\u964D\u6E29', '\u51B7\u7A7A\u6C14\u589E\u5F3A', '\u51AC\u5BD2\u6210\u578B'],
    '\u534E\u5357': ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD['\u534E\u5357'].monthly,
    '\u534E\u4E1C': ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD['\u534E\u4E1C'].monthly,
    '\u534E\u4E2D': ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD['\u534E\u4E2D'].monthly,
    '\u897F\u5357': ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD['\u897F\u5357'].monthly,
    '\u534E\u5317': ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD['\u534E\u5317'].monthly,
    '\u897F\u5317': ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD['\u897F\u5317'].monthly,
    '\u4E1C\u5317': ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD['\u4E1C\u5317'].monthly,
};

export const ANNUAL_CONTROL_BUDGET_GANTT_BARS: AnnualControlGanttBar[] = [
    { id: 'q3-otb-lock', label: 'Q3 OTB 锁量', detail: '2-3月完成秋季容量、主力价格带与主题资源锁定。', startMonth: 2, span: 2, tone: 'amber', budgetTarget: 2200, budgetActual: 2200 },
    { id: 'autumn-buying', label: '秋季订货会', detail: '3月冻结秋季主题、鞋型、主推款与节庆角色。', startMonth: 3, span: 1, tone: 'amber' },
    { id: 'q4-sotb-review', label: 'Q4 SOTB 评审', detail: '5-6月完成冬季货盘、利润结构与预算巡检。', startMonth: 5, span: 2, tone: 'rose', budgetTarget: 3500, budgetActual: 3500 },
    { id: 'winter-buying', label: '冬季订货会', detail: '6月前置锁定双11与冬保暖结构，避免旺季再补方向。', startMonth: 6, span: 1, tone: 'rose' },
    { id: 'q1-otb-lock', label: 'Q1 OTB 锁量', detail: '8-9月锁定次年春季通勤、礼赠与形象升级带资源。', startMonth: 8, span: 2, tone: 'emerald', budgetTarget: 2800, budgetActual: 1680 },
    { id: 'spring-buying', label: '春季订货会', detail: '9月冻结次年春季核心品类及重点节点投入。', startMonth: 9, span: 1, tone: 'emerald' },
    { id: 'q2-otb-lock', label: 'Q2 OTB 锁量', detail: '11-12月锁定次年夏季货盘，避免跨年后被动补结构。', startMonth: 11, span: 2, tone: 'sky', budgetTarget: 3100 },
    { id: 'summer-buying', label: '夏季订货会', detail: '12月冻结次年夏季爆款凉拖及户外面料运用。', startMonth: 12, span: 1, tone: 'sky' },
];

export const ANNUAL_CONTROL_TRANSITION_GANTT_BARS: AnnualControlGanttBar[] = [
    { id: 'spring-clearance-window', label: '冬货清货窗口', detail: '2-3月完成冬货退出，为春一波与春主销腾出陈列和预算。', startMonth: 2, span: 2, tone: 'rose' },
    { id: 'summer-handoff-window', label: '春退市 / 夏承接', detail: '5-6月控制春货尾量，确保夏主销走量带接得住。', startMonth: 5, span: 2, tone: 'emerald' },
    { id: 'autumn-handoff-window', label: '夏退市 / 秋承接', detail: '8-9月完成夏货退出和秋一波承接，避免价格体系冲突。', startMonth: 8, span: 2, tone: 'sky' },
    { id: 'winter-profit-window', label: '双11后清货 / 冬利润守线', detail: '11-12月既要清货，也要守住冬季利润和新品承接窗口。', startMonth: 11, span: 2, tone: 'amber' },
];

export function getAnnualControlActiveMonth(filters: Pick<DashboardFilters, 'season' | 'wave'>, referenceMonth = new Date().getMonth() + 1) {
    return getAnnualControlFocusMonth(filters) ?? Math.min(Math.max(referenceMonth, 1), 12);
}

export function getAnnualControlActiveWeekPosition(filters: Pick<DashboardFilters, 'season' | 'wave'>, referenceDate = new Date()) {
    const referenceMonth = referenceDate.getMonth() + 1;
    const currentMonth = getAnnualControlActiveMonth(filters, referenceMonth);
    const axisItem = ANNUAL_CONTROL_MONTH_AXIS.find((item) => item.month === currentMonth) || ANNUAL_CONTROL_MONTH_AXIS[0];
    const bounds = getAnnualControlWeekBounds(axisItem.weekRange);
    const slotCount = Math.max(1, bounds.end - bounds.start + 1);
    const followsRealTime = filters.wave === 'all' && filters.season === 'all' && currentMonth === referenceMonth;
    const dayOfMonth = followsRealTime ? referenceDate.getDate() : Math.ceil(new Date(referenceDate.getFullYear(), currentMonth, 0).getDate() / 2);
    const daysInMonth = new Date(referenceDate.getFullYear(), currentMonth, 0).getDate();

    // 更精确的周次定位：基于当前日期在月份中的实际位置
    const dayRatio = (dayOfMonth - 1) / Math.max(daysInMonth, 1);
    const slotIndex = followsRealTime
        ? Math.min(slotCount - 1, Math.max(0, Math.floor(dayRatio * slotCount)))
        : Math.floor(slotCount / 2);

    // 计算更精确的周内位置比例（0-1之间）
    const preciseSlotRatio = followsRealTime
        ? Math.min(1, Math.max(0, (dayRatio * slotCount) - slotIndex))
        : 0.5;

    const currentWeek = bounds.start + slotIndex;
    const currentWeekRatio = (slotIndex + preciseSlotRatio) / slotCount;

    return {
        currentWeek,
        currentWeekLabel: '周' + currentWeek,
        currentWeekRatio,
    };
}

export function getAnnualControlClimateSeries(region: string | 'all') {
    const normalizedRegion = normalizeAnnualControlRegion(region);
    return ANNUAL_CONTROL_REGION_TEMPERATURE_SERIES[normalizedRegion] || ANNUAL_CONTROL_REGION_TEMPERATURE_SERIES.all;
}

export function getAnnualControlSolarTermProfile(month: number) {
    return ANNUAL_CONTROL_SOLAR_TERM_MONTHLY[month] || ANNUAL_CONTROL_SOLAR_TERM_MONTHLY[1];
}

export function getAnnualControlEnvironmentTemperatureRows(
    region: string | 'all',
    month: number,
    sortMonth = month,
    useActualSnapshot = false,
): AnnualControlEnvironmentTemperatureRow[] {
    const monthIndex = Math.max(0, Math.min(11, month - 1));
    const sortMonthIndex = Math.max(0, Math.min(11, sortMonth - 1));
    const normalizedRegion = normalizeAnnualControlRegion(region);
    const regionKeys = normalizedRegion === 'all'
        ? Object.keys(ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD).sort((left, right) => {
            const rightHigh = getAnnualControlTemperatureHigh(getAnnualControlDisplayedTemperatureRange(right, sortMonthIndex, useActualSnapshot));
            const leftHigh = getAnnualControlTemperatureHigh(getAnnualControlDisplayedTemperatureRange(left, sortMonthIndex, useActualSnapshot));
            if (rightHigh !== leftHigh) return rightHigh - leftHigh;
            return left.localeCompare(right, 'zh-CN');
        })
        : [normalizedRegion].filter((item) => Boolean(ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD[item]));

    return regionKeys.map((regionKey) => {
        const snapshot = ANNUAL_CONTROL_REGION_CITY_TEMPERATURE_BOARD[regionKey];
        return {
            region: regionKey,
            regionLabel: snapshot.regionLabel,
            cityLabel: snapshot.cityLabel,
            rangeLabel: getAnnualControlDisplayedTemperatureRange(regionKey, monthIndex, useActualSnapshot),
        };
    });
}

const ANNUAL_CONTROL_ACTION_TEAM_ORDER: AnnualControlTeamType[] = ['商品', '设计企划', '品牌陈列'];

function getAnnualControlNodeTone(nodeType: AnnualControlNodeType, severity: AnnualControlSeverity): AnnualControlTone {
    if (nodeType === 'buying' || nodeType === 'festival' || nodeType === 'marketing') return severity === 'high' ? 'rose' : 'amber';
    if (nodeType === 'qotb' || nodeType === 'sotb') return 'emerald';
    if (nodeType === 'clearance') return 'rose';
    return 'sky';
}

function getAnnualControlWeekBounds(weekRange: string) {
    const match = weekRange.match(/(\d+)-(\d+)/);
    if (!match) return { start: 1, end: 4 };
    return { start: Number(match[1]), end: Number(match[2]) };
}

function stripReserveSuffix(value: string) {
    return value.replace('（预留）', '');
}

function getAnnualControlDefaultAction(teamType: AnnualControlTeamType, axisItem: AnnualControlMonthAxisItem, sceneLabel: string) {
    if (teamType === '商品') {
        return {
            actionTitle: `${axisItem.phaseLabel}货盘推进`,
            actionDesc: `围绕${axisItem.phaseLabel}节奏完成货盘推进和销补对齐。`,
            deliverable: `${axisItem.phaseLabel}货盘清单`,
        };
    }
    if (teamType === '设计企划') {
        return {
            actionTitle: `${ANNUAL_CONTROL_SEASON_LABELS[axisItem.season]}主题准备`,
            actionDesc: `围绕${ANNUAL_CONTROL_SEASON_LABELS[axisItem.season]}主题和主推鞋型做前置准备。`,
            deliverable: `${ANNUAL_CONTROL_SEASON_LABELS[axisItem.season]}主题版单`,
        };
    }
    return {
        actionTitle: `${sceneLabel}陈列切换`,
        actionDesc: `围绕${sceneLabel}场景完成门店入口与重点端架切换。`,
        deliverable: `${sceneLabel}陈列指引`,
    };
}

function getAnnualControlActionStatusLabel(actionMonth: number, currentMonth: number) {
    if (actionMonth < currentMonth) return '已落地';
    if (actionMonth > currentMonth) return '待执行';
    return '进行中';
}

export function buildAnnualControlUpcomingNode(filters: Pick<DashboardFilters, 'season' | 'wave' | 'region'>): AnnualControlUpcomingNode | null {
    const currentMonth = getAnnualControlActiveMonth(filters);
    const currentAxis = ANNUAL_CONTROL_MONTH_AXIS.find((item) => item.month === currentMonth) || ANNUAL_CONTROL_MONTH_AXIS[0];
    const currentWeekEnd = getAnnualControlWeekBounds(currentAxis.weekRange).end;
    const upcoming = ANNUAL_CONTROL_TIMELINE_NODES.filter((node) => {
        const regionMatch = filters.region === 'all' || node.relatedRegion === 'all' || node.relatedRegion === filters.region;
        if (!regionMatch) return false;
        if (node.month < currentMonth) return false;
        if (node.month === currentMonth && node.week !== null && node.week <= currentWeekEnd) return false;
        return true;
    }).sort((left, right) => {
        if (left.month !== right.month) return left.month - right.month;
        return (left.week ?? 99) - (right.week ?? 99);
    })[0];

    if (!upcoming) return null;

    const nextAxis = ANNUAL_CONTROL_MONTH_AXIS.find((item) => item.month === upcoming.month) || currentAxis;
    const nextWeek = upcoming.week ?? getAnnualControlWeekBounds(nextAxis.weekRange).start;
    const weeksAway = Math.max(1, nextWeek - currentWeekEnd);
    const monthsAway = Math.max(0, upcoming.month - currentMonth);

    return {
        label: upcoming.label,
        detail: upcoming.note || `${NODE_TYPE_LABELS[upcoming.nodeType]} · ${ANNUAL_CONTROL_SEASON_LABELS[upcoming.relatedSeason]}`,
        etaLabel: weeksAway <= 3 ? `${weeksAway}周后` : `${Math.max(1, monthsAway)}月后`,
        month: upcoming.month,
        week: upcoming.week,
        tone: getAnnualControlNodeTone(upcoming.nodeType, upcoming.severity),
    };
}
function getAnnualControlFestivalGrade(level: AnnualMerchandisingFocus['marketingLevel']) {
    return level === 'S' ? 'S级' : level + '级';
}

function getAnnualControlTeamOwnerCode(teamType: AnnualControlTeamType): '商' | '设' | '陈' {
    if (teamType === '商品') return '商';
    if (teamType === '设计企划') return '设';
    return '陈';
}

function formatAnnualControlGapPp(actual: number, target: number) {
    const diff = Math.round((actual - target) * 100);
    return (diff >= 0 ? '+' : '') + diff + 'pp';
}

function buildAnnualControlDependencies(filters: Pick<DashboardFilters, 'season' | 'wave'>): AnnualControlDependencyMarker[] {
    const currentMonth = getAnnualControlActiveMonth(filters);
    const currentWave = `W${String(currentMonth).padStart(2, '0')}` as DashboardWave;
    const currentSeason = getDashboardSeasonByWave(currentWave) || 'Q1';
    const currentTransition = SEASONAL_INVENTORY_TRANSITIONS.find((item) => item.season === currentSeason) || SEASONAL_INVENTORY_TRANSITIONS[0];
    const currentSeasonIndex = DASHBOARD_SEASON_ORDER.indexOf(currentSeason);
    const previousTransition = SEASONAL_INVENTORY_TRANSITIONS[(currentSeasonIndex + 3) % 4];
    const nextTransition = SEASONAL_INVENTORY_TRANSITIONS[(currentSeasonIndex + 1) % 4];
    const prevMonth = currentMonth === 1 ? 1 : currentMonth - 1;
    const nextMonth = currentMonth === 12 ? 12 : currentMonth + 1;
    const phaseIndex = (currentMonth - 1) % 3;

    if (phaseIndex === 0) {
        return [
            {
                id: 'pre-clearance',
                relation: 'pre',
                title: '前序依赖',
                label: `${previousTransition.seasonLabel}清货完成度`,
                detail: `上一季旧货若退出不足，会直接压缩 ${currentTransition.seasonLabel} 上市承接。`,
                fromMonth: prevMonth,
                toMonth: currentMonth,
                severity: 'high',
                relatedModule: 'inventory',
            },
            {
                id: 'post-launch',
                relation: 'post',
                title: '后续影响',
                label: `${currentTransition.seasonLabel}主销爬坡`,
                detail: `当前首单深度与陈列若不到位，会拖慢 ${currentTransition.seasonLabel} 的售罄爬坡。`,
                fromMonth: currentMonth,
                toMonth: nextMonth,
                severity: 'medium',
                relatedModule: 'planning',
            },
        ];
    }

    if (phaseIndex === 1) {
        return [
            {
                id: 'pre-launch-completion',
                relation: 'pre',
                title: '前序依赖',
                label: `${currentTransition.seasonLabel}上市完整度`,
                detail: '首波上市不完整，会让主销阶段只能靠补货追量。',
                fromMonth: prevMonth,
                toMonth: currentMonth,
                severity: 'medium',
                relatedModule: 'planning',
            },
            {
                id: 'post-discount-switch',
                relation: 'post',
                title: '后续影响',
                label: `${currentTransition.seasonLabel}折扣切换`,
                detail: '当前主销若卖不透，下一月只能用更深折扣和更重清货来收尾。',
                fromMonth: currentMonth,
                toMonth: nextMonth,
                severity: 'high',
                relatedModule: 'inventory',
            },
        ];
    }

    return [
        {
            id: 'pre-sell-through',
            relation: 'pre',
            title: '前序依赖',
            label: `${currentTransition.seasonLabel}售罄完成度`,
            detail: '当前折扣切换必须建立在主销阶段已完成既定售罄基础之上。',
            fromMonth: prevMonth,
            toMonth: currentMonth,
            severity: 'medium',
            relatedModule: 'planning',
        },
        {
            id: 'post-next-season-handoff',
            relation: 'post',
            title: '后续影响',
            label: `${nextTransition.seasonLabel}新品承接`,
            detail: '老货若在当前窗口退出过慢，会直接挤压下一季新品承接与预算窗口。',
            fromMonth: currentMonth,
            toMonth: nextMonth,
            severity: 'high',
            relatedModule: 'otb',
        },
    ];
}

const ANNUAL_CONTROL_TRANSITION_STAGE_ORDER: AnnualControlTransitionLifecycleStage[] = ['launch', 'mainSell', 'mature', 'clearance'];

const ANNUAL_CONTROL_TRANSITION_STAGE_LABELS: Record<AnnualControlTransitionLifecycleStage, string> = {
    launch: '\u4e0a\u65b0',
    mainSell: '\u4e3b\u9500',
    mature: '\u6210\u957f\u671f',
    clearance: '\u6e05\u8d27',
};

const ANNUAL_CONTROL_TRANSITION_LOOP_END = 12.98;
const ANNUAL_CONTROL_TRANSITION_DISPLAY_MAX = 24.0;

function clampAnnualControlTransitionPoint(point: number) {
    return Math.max(1.02, Math.min(ANNUAL_CONTROL_TRANSITION_DISPLAY_MAX, point));
}

function formatAnnualControlTransitionMonthPoint(point: number) {
    const safePoint = clampAnnualControlTransitionPoint(point);
    const normalizedPoint = safePoint > ANNUAL_CONTROL_TRANSITION_LOOP_END ? safePoint - 12 : safePoint;
    const month = Math.max(1, Math.min(12, Math.floor(normalizedPoint)));
    const offset = normalizedPoint - month;
    const slot = offset < 0.34 ? '上旬' : offset < 0.67 ? '中旬' : '下旬';
    const prefix = safePoint > ANNUAL_CONTROL_TRANSITION_LOOP_END ? '次年' : '';
    return prefix + month + '月' + slot;
}

function getAnnualControlTransitionShortLabel(season: DashboardSeason) {
    return {
        Q1: '\u6625',
        Q2: '\u590f',
        Q3: '\u79cb',
        Q4: '\u51ac',
    }[season];
}

function getAnnualControlTransitionDiscountValue(
    stage: AnnualControlTransitionLifecycleStage,
    discounts: SeasonalInventoryTransition['discountPlanByStage'] | SeasonalInventoryTransition['discountActualByStage'],
) {
    if (stage === 'launch') return discounts.launch;
    if (stage === 'mainSell') return discounts.mainSell;
    if (stage === 'mature') return (discounts.mainSell + discounts.clearance) / 2;
    return discounts.clearance;
}

function buildAnnualControlTransitionSegments(params: {
    range: { start: number; end: number };
    lifecycle: SeasonalInventoryTransition['lifecyclePlan'] | SeasonalInventoryTransition['lifecycleActual'];
    discounts: SeasonalInventoryTransition['discountPlanByStage'] | SeasonalInventoryTransition['discountActualByStage'];
}): AnnualControlTransitionStageSegment[] {
    const start = clampAnnualControlTransitionPoint(params.range.start);
    const end = Math.max(start + 0.32, clampAnnualControlTransitionPoint(params.range.end));
    const totalSpan = end - start;
    let cursor = start;

    return ANNUAL_CONTROL_TRANSITION_STAGE_ORDER.map((stage, index) => {
        const lifecycleShare = params.lifecycle[stage];
        const nextCursor = index === ANNUAL_CONTROL_TRANSITION_STAGE_ORDER.length - 1
            ? end
            : Math.min(end, Math.max(cursor + 0.08, cursor + totalSpan * lifecycleShare));
        const segment = {
            stage,
            label: ANNUAL_CONTROL_TRANSITION_STAGE_LABELS[stage],
            start: cursor,
            end: nextCursor,
            discountRate: getAnnualControlTransitionDiscountValue(stage, params.discounts),
        };
        cursor = nextCursor;
        return segment;
    });
}

const ANNUAL_CONTROL_TRANSITION_SEASON_WINDOWS: Record<DashboardSeason, {
    fullLifecycleLabel: string;
    carryInLabel?: string;
    carryOutLabel?: string;
    carryInPreviewRange?: { start: number; end: number };
    displayPlanRange: { start: number; end: number };
    displayActualRange: { start: number; end: number };
    handoffPlan: { start: number; end: number };
    handoffActual: { start: number; end: number };
    windows: {
        launch: string;
        mainSell: string;
        clearance: string;
    };
}> = {
    Q1: {
        fullLifecycleLabel: '12/10-5/27',
        displayPlanRange: { start: 12.29, end: 17.84 },
        displayActualRange: { start: 12.29, end: 17.84 },
        handoffPlan: { start: 15.18, end: 16.18 },
        handoffActual: { start: 15.28, end: 16.26 },
        windows: {
            launch: '12/10-2/10',
            mainSell: '2/11-3/31',
            clearance: '4/1-5/27',
        },
    },
    Q2: {
        fullLifecycleLabel: '3/5-9/30',
        displayPlanRange: { start: 3.13, end: 9.97 },
        displayActualRange: { start: 3.13, end: 9.97 },
        handoffPlan: { start: 6.72, end: 7.26 },
        handoffActual: { start: 6.84, end: 7.34 },
        windows: {
            launch: '3/5-4/25',
            mainSell: '4/26-7/31',
            clearance: '8/1-9/30',
        },
    },
    Q3: {
        fullLifecycleLabel: '6/25-12/2',
        displayPlanRange: { start: 6.80, end: 12.03 },
        displayActualRange: { start: 6.80, end: 12.03 },
        handoffPlan: { start: 9.96, end: 10.22 },
        handoffActual: { start: 10.04, end: 10.30 },
        windows: {
            launch: '6/25-7/31',
            mainSell: '8/1-10/10',
            clearance: '10/11-12/2',
        },
    },
    Q4: {
        fullLifecycleLabel: '9/30-次年4/1',
        carryOutLabel: '延续至次年 4/1',
        displayPlanRange: { start: 9.97, end: 16.00 },
        displayActualRange: { start: 9.97, end: 16.00 },
        handoffPlan: { start: 12.36, end: 13.18 },
        handoffActual: { start: 12.28, end: 13.10 },
        windows: {
            launch: '9/30-11/10',
            mainSell: '11/11-12/25',
            clearance: '12/26-次年4/1',
        },
    },
};

export const ANNUAL_CONTROL_TRANSITION_METRIC_CONFIG: AnnualControlTransitionMetricConfig = {
    defaults: {
        Q1: {
            sellThroughPlan: { launch: 0.24, mainSell: 0.58, mature: 0.76, clearance: 0.88 },
            newGoodsDiscountPlan: { launch: 0.99, mainSell: 0.96, mature: 0.93, clearance: 0.90 },
            sellThroughMonthlyPlan: [
                { start: 12.29, end: 13.92, value: 0.20 },
                { start: 13.92, end: 14.78, value: 0.37 },
                { start: 14.78, end: 15.62, value: 0.50 },
                { start: 15.62, end: 16.42, value: 0.65 },
                { start: 16.42, end: 17.84, value: 0.70 },
            ],
            newGoodsDiscountMonthlyPlan: [
                { start: 12.29, end: 13.92, value: 0.84 },
                { start: 13.92, end: 14.78, value: 0.86 },
                { start: 14.78, end: 15.62, value: 0.86 },
                { start: 15.62, end: 16.42, value: 0.85 },
                { start: 16.42, end: 17.84, value: 0.83 },
            ],
            oldGoodsDiscountMonthlyPlan: [
                { start: 12.29, end: 13.92, value: 0.86 },
                { start: 13.92, end: 14.78, value: 0.84 },
                { start: 14.78, end: 15.62, value: 0.82 },
                { start: 15.62, end: 16.42, value: 0.80 },
                { start: 16.42, end: 17.84, value: 0.78 },
            ],
            newOldMixTarget: { newGoods: 0.48, oldGoods: 0.52 },
            oldGoodsAverageDiscount: 0.82,
        },
        Q2: {
            sellThroughPlan: { launch: 0.22, mainSell: 0.64, mature: 0.82, clearance: 0.90 },
            newGoodsDiscountPlan: { launch: 0.98, mainSell: 0.95, mature: 0.92, clearance: 0.88 },
            sellThroughMonthlyPlan: [
                { start: 3.13, end: 4.04, value: 0.10 },
                { start: 4.04, end: 5.08, value: 0.25 },
                { start: 5.08, end: 6.16, value: 0.41 },
                { start: 6.16, end: 7.26, value: 0.55 },
                { start: 7.26, end: 8.38, value: 0.68 },
                { start: 8.38, end: 9.97, value: 0.78 },
            ],
            newGoodsDiscountMonthlyPlan: [
                { start: 3.13, end: 4.04, value: 0.90 },
                { start: 4.04, end: 5.08, value: 0.88 },
                { start: 5.08, end: 6.16, value: 0.86 },
                { start: 6.16, end: 7.26, value: 0.85 },
                { start: 7.26, end: 8.38, value: 0.83 },
                { start: 8.38, end: 9.97, value: 0.80 },
            ],
            oldGoodsDiscountMonthlyPlan: [
                { start: 3.13, end: 4.04, value: 0.84 },
                { start: 4.04, end: 5.08, value: 0.82 },
                { start: 5.08, end: 6.16, value: 0.80 },
                { start: 6.16, end: 7.26, value: 0.78 },
                { start: 7.26, end: 8.38, value: 0.74 },
                { start: 8.38, end: 9.97, value: 0.70 },
            ],
            newOldMixTarget: { newGoods: 0.70, oldGoods: 0.30 },
            oldGoodsAverageDiscount: 0.78,
        },
        Q3: {
            sellThroughPlan: { launch: 0.20, mainSell: 0.60, mature: 0.78, clearance: 0.88 },
            newGoodsDiscountPlan: { launch: 0.98, mainSell: 0.95, mature: 0.92, clearance: 0.89 },
            sellThroughMonthlyPlan: [
                { start: 6.80, end: 7.78, value: 0.11 },
                { start: 7.78, end: 8.82, value: 0.23 },
                { start: 8.82, end: 9.92, value: 0.45 },
                { start: 9.92, end: 11.06, value: 0.60 },
                { start: 11.06, end: 12.03, value: 0.70 },
            ],
            newGoodsDiscountMonthlyPlan: [
                { start: 6.80, end: 7.78, value: 0.88 },
                { start: 7.78, end: 8.82, value: 0.88 },
                { start: 8.82, end: 9.92, value: 0.85 },
                { start: 9.92, end: 11.06, value: 0.83 },
                { start: 11.06, end: 12.03, value: 0.80 },
            ],
            oldGoodsDiscountMonthlyPlan: [
                { start: 6.80, end: 7.78, value: 0.86 },
                { start: 7.78, end: 8.82, value: 0.84 },
                { start: 8.82, end: 9.92, value: 0.80 },
                { start: 9.92, end: 11.06, value: 0.76 },
                { start: 11.06, end: 12.03, value: 0.74 },
            ],
            newOldMixTarget: { newGoods: 0.84, oldGoods: 0.16 },
            oldGoodsAverageDiscount: 0.80,
        },
        Q4: {
            sellThroughPlan: { launch: 0.18, mainSell: 0.54, mature: 0.72, clearance: 0.84 },
            newGoodsDiscountPlan: { launch: 0.99, mainSell: 0.96, mature: 0.93, clearance: 0.90 },
            sellThroughMonthlyPlan: [
                { start: 9.97, end: 11.04, value: 0.10 },
                { start: 11.04, end: 12.04, value: 0.25 },
                { start: 12.04, end: 13.10, value: 0.48 },
                { start: 13.10, end: 14.10, value: 0.66 },
                { start: 14.10, end: 15.06, value: 0.70 },
                { start: 15.06, end: 16.00, value: 0.75 },
            ],
            newGoodsDiscountMonthlyPlan: [
                { start: 9.97, end: 11.04, value: 0.88 },
                { start: 11.04, end: 12.04, value: 0.86 },
                { start: 12.04, end: 13.10, value: 0.84 },
                { start: 13.10, end: 14.10, value: 0.80 },
                { start: 14.10, end: 15.06, value: 0.80 },
                { start: 15.06, end: 16.00, value: 0.80 },
            ],
            oldGoodsDiscountMonthlyPlan: [
                { start: 9.97, end: 11.04, value: 0.88 },
                { start: 11.04, end: 12.04, value: 0.86 },
                { start: 12.04, end: 13.10, value: 0.84 },
                { start: 13.10, end: 14.10, value: 0.84 },
                { start: 14.10, end: 15.06, value: 0.82 },
                { start: 15.06, end: 16.00, value: 0.80 },
            ],
            newOldMixTarget: { newGoods: 0.92, oldGoods: 0.08 },
            oldGoodsAverageDiscount: 0.84,
        },
    },
    overrides: [
        {
            scope: { market: '\u5357', season: 'Q2' },
            values: {
                sellThroughPlan: { mainSell: 0.60, mature: 0.78, clearance: 0.88 },
                newGoodsDiscountPlan: { mature: 0.94, clearance: 0.90 },
                newOldMixTarget: { newGoods: 0.72, oldGoods: 0.28 },
                oldGoodsAverageDiscount: 0.80,
            },
        },
        {
            scope: { market: '\u5317', season: 'Q4' },
            values: {
                sellThroughPlan: { launch: 0.20, mainSell: 0.58, mature: 0.76 },
                newGoodsDiscountPlan: { mainSell: 0.97, mature: 0.94 },
                newOldMixTarget: { newGoods: 0.90, oldGoods: 0.10 },
                oldGoodsAverageDiscount: 0.83,
            },
        },
    ],
};

function mergeAnnualControlTransitionMetricPlan(
    base: AnnualControlTransitionMetricPlan,
    patch: AnnualControlTransitionMetricOverride['values'],
): AnnualControlTransitionMetricPlan {
    return {
        sellThroughPlan: { ...base.sellThroughPlan, ...patch.sellThroughPlan },
        newGoodsDiscountPlan: { ...base.newGoodsDiscountPlan, ...patch.newGoodsDiscountPlan },
        sellThroughMonthlyPlan: patch.sellThroughMonthlyPlan ?? base.sellThroughMonthlyPlan,
        newGoodsDiscountMonthlyPlan: patch.newGoodsDiscountMonthlyPlan ?? base.newGoodsDiscountMonthlyPlan,
        oldGoodsDiscountMonthlyPlan: patch.oldGoodsDiscountMonthlyPlan ?? base.oldGoodsDiscountMonthlyPlan,
        newOldMixTarget: { ...base.newOldMixTarget, ...patch.newOldMixTarget },
        oldGoodsAverageDiscount: patch.oldGoodsAverageDiscount ?? base.oldGoodsAverageDiscount,
    };
}

function matchesAnnualControlTransitionMetricScope(
    scope: AnnualControlTransitionMetricOverride['scope'],
    params: { season: DashboardSeason; market?: string; brand?: string; channel?: string; wave?: DashboardWave; category?: string },
) {
    if (scope.season && scope.season !== params.season) return false;
    if (scope.market && scope.market !== params.market) return false;
    if (scope.brand && scope.brand !== params.brand) return false;
    if (scope.channel && scope.channel !== params.channel) return false;
    if (scope.wave && scope.wave !== params.wave) return false;
    if (scope.category && scope.category !== params.category) return false;
    return true;
}

function resolveAnnualControlTransitionMetricPlan(params: {
    season: DashboardSeason;
    market?: string;
    brand?: string;
    channel?: string;
    wave?: DashboardWave;
    category?: string;
}): AnnualControlTransitionMetricPlan {
    return ANNUAL_CONTROL_TRANSITION_METRIC_CONFIG.overrides.reduce((resolved, override) => {
        if (!matchesAnnualControlTransitionMetricScope(override.scope, params)) return resolved;
        return mergeAnnualControlTransitionMetricPlan(resolved, override.values);
    }, ANNUAL_CONTROL_TRANSITION_METRIC_CONFIG.defaults[params.season]);
}

function formatAnnualControlTransitionMetricPercent(value: number) {
    return Math.round(value * 100) + '%';
}

function getAnnualControlTransitionStageForBandRange(
    segments: AnnualControlTransitionStageSegment[],
    range: AnnualControlTransitionMetricTimelineRange,
): AnnualControlTransitionLifecycleStage {
    const midpoint = (range.start + range.end) / 2;
    const matchedSegment = segments.find((segment, index) => midpoint >= segment.start && (midpoint <= segment.end || index === segments.length - 1));
    return matchedSegment?.stage || segments[segments.length - 1]?.stage || 'launch';
}

function buildAnnualControlTransitionMetricBand(
    segments: AnnualControlTransitionStageSegment[],
    ranges: AnnualControlTransitionMetricTimelineRange[],
): AnnualControlTransitionMetricBandSegment[] {
    return ranges.map((range) => ({
        stage: getAnnualControlTransitionStageForBandRange(segments, range),
        start: range.start,
        end: range.end,
        value: range.value,
        label: formatAnnualControlTransitionMetricPercent(range.value),
    }));
}

function buildAnnualControlTransitionRisk(params: {
    transition: SeasonalInventoryTransition;
    planRange: { start: number; end: number };
    actualRange: { start: number; end: number };
    handoffPlan: { start: number; end: number };
    handoffActual: { start: number; end: number };
    metrics: AnnualControlTransitionMetricPlan;
}): AnnualControlTransitionSeasonControl['risk'] {
    const newGapPp = Math.round((params.transition.actualNewGoodsRatio - params.metrics.newOldMixTarget.newGoods) * 100);
    const oldGapPp = Math.round((params.transition.actualOldGoodsRatio - params.metrics.newOldMixTarget.oldGoods) * 100);
    const launchDelay = params.actualRange.start - params.planRange.start;
    const clearanceDelay = params.actualRange.end - params.planRange.end;
    const oldDiscountGapPp = Math.round((params.transition.actualOldGoodsDiscount - params.metrics.oldGoodsAverageDiscount) * 100);
    const handoffDelay = params.handoffActual.start - params.handoffPlan.start;

    if (newGapPp <= -5 || oldGapPp >= 5) {
        return { tone: 'risk', status: '\u7ed3\u6784\u504f\u5dee', note: '\u65b0\u54c1\u627f\u63a5\u4e0d\u8db3' };
    }
    if (clearanceDelay >= 0.24 || oldDiscountGapPp > 2) {
        return { tone: 'risk', status: '\u6e05\u8d27\u98ce\u9669', note: '\u8001\u8d27\u627f\u538b' };
    }
    if (launchDelay > 0.08 || handoffDelay > 0.08) {
        return { tone: 'watch', status: '\u5207\u6362\u504f\u6162', note: '\u9700\u524d\u7f6e\u5207\u6362' };
    }
    return { tone: 'stable', status: '\u627f\u63a5\u6b63\u5e38', note: '\u6309\u8ba1\u5212\u5207\u6362' };
}

function buildAnnualControlTransitionOutputs(params: {
    seasons: AnnualControlTransitionSeasonControl[];
    currentSeason: DashboardSeason;
    currentFocus: AnnualMerchandisingFocus | null;
    currentSceneLabel: string;
    currentKeyRole: string;
}): AnnualControlTransitionControlModel['outputs'] {
    const seasons = params.seasons;
    const currentIndex = Math.max(0, seasons.findIndex((item) => item.season === params.currentSeason));
    const currentControl = seasons[currentIndex] || seasons[0];
    const previousControl = seasons[(currentIndex + seasons.length - 1) % seasons.length] || seasons[0];
    const nextControl = seasons[(currentIndex + 1) % seasons.length] || seasons[0];
    const slowClearanceControl = seasons.reduce((top, item) => {
        const topDelay = top.actualRange.end - top.planRange.end;
        const itemDelay = item.actualRange.end - item.planRange.end;
        return itemDelay > topDelay ? item : top;
    }, seasons[0]);
    const oldPressureControl = seasons.reduce((top, item) => item.ratio.actualOld > top.ratio.actualOld ? item : top, seasons[0]);
    const nextSeasonFocus = ANNUAL_MERCH_FOCUS_TEMPLATE.find((item) => item.season === nextControl.season) || null;
    const currentCategories = params.currentFocus?.mainCategory.join(' / ') || '\u978b\u7c7b';

    return {
        otb: {
            title: '\u8f93\u51fa\u7ed9 OTB&\u8d27\u54c1\u7ed3\u6784',
            fields: [
                {
                    key: 'current_mix_gap',
                    label: '\u5f53\u524d\u5b63\u8282\u65b0\u65e7\u8d27\u5360\u6bd4\u504f\u5dee',
                    value: currentControl.kpis.newOldTargetLabel + ' \u00b7 ' + currentControl.kpis.newOldActualLabel,
                },
                {
                    key: 'current_new_discount_gap',
                    label: '\u5f53\u524d\u65b0\u54c1\u6298\u6263\u8282\u594f\u504f\u5dee',
                    value: '\u65b0\u54c1 ' + formatAnnualControlTransitionMetricPercent(currentControl.discount.newActual) + ' / \u8ba1\u5212 ' + formatAnnualControlTransitionMetricPercent(currentControl.discount.newPlan),
                },
                {
                    key: 'current_old_discount_gap',
                    label: '\u5f53\u524d\u8001\u8d27\u6298\u6263\u8282\u594f\u504f\u5dee',
                    value: '\u8001\u8d27 ' + formatAnnualControlTransitionMetricPercent(currentControl.discount.oldActual) + ' / \u8ba1\u5212 ' + formatAnnualControlTransitionMetricPercent(currentControl.discount.oldPlan),
                },
                {
                    key: 'adjustment_hint',
                    label: '\u5f53\u524d\u8d27\u76d8\u8c03\u6574\u5efa\u8bae',
                    value: currentControl.risk.tone === 'risk'
                        ? currentControl.handoffFocus
                        : '\u6309 ' + nextControl.windows.launch + ' \u524d\u7f6e\u9501\u5b9a ' + ANNUAL_CONTROL_SEASON_LABELS[nextControl.season] + ' \u4e0a\u65b0\u3002',
                },
            ],
        },
        inventory: {
            title: '\u8f93\u51fa\u7ed9 Inventory',
            fields: [
                {
                    key: 'slow_clearance_season',
                    label: '\u54ea\u4e2a\u5b63\u8282\u6e05\u8d27\u6ede\u540e',
                    value: ANNUAL_CONTROL_SEASON_LABELS[slowClearanceControl.season] + ' \u00b7 \u5b9e\u9645\u62d6\u540e\u81f3 ' + formatAnnualControlTransitionMonthPoint(slowClearanceControl.actualRange.end),
                },
                {
                    key: 'old_goods_pressure',
                    label: '\u54ea\u4e2a\u5b63\u8282\u8001\u8d27\u538b\u529b\u5927',
                    value: ANNUAL_CONTROL_SEASON_LABELS[oldPressureControl.season] + ' \u00b7 \u65e7\u8d27 ' + Math.round(oldPressureControl.ratio.actualOld * 100) + '%',
                },
                {
                    key: 'cashout_push_month',
                    label: '\u54ea\u4e2a\u6708\u4efd\u9700\u52a0\u901f\u53d8\u73b0',
                    value: formatAnnualControlTransitionMonthPoint(slowClearanceControl.actualRange.end - 0.32) + ' \u524d\u52a0\u6df1\u6e05\u5c3e\u3002',
                },
            ],
        },
        planning: {
            title: '\u8f93\u51fa\u7ed9 Wave Planning',
            fields: [
                {
                    key: 'current_main_sell_window',
                    label: '\u5f53\u524d\u4e3b\u9500\u7a97\u53e3',
                    value: ANNUAL_CONTROL_SEASON_LABELS[currentControl.season] + ' ' + currentControl.windows.mainSell,
                },
                {
                    key: 'next_launch_entry',
                    label: '\u4e0b\u4e00\u5b63\u4e0a\u65b0\u5207\u5165\u70b9',
                    value: ANNUAL_CONTROL_SEASON_LABELS[nextControl.season] + ' ' + nextControl.windows.launch,
                },
                {
                    key: 'festival_handoff_note',
                    label: '\u8282\u5e86\u5bf9\u5e94\u7684\u8d27\u76d8\u5b89\u6392',
                    value: params.currentSceneLabel + ' \u00b7 ' + currentControl.handoffFocus,
                },
            ],
        },
        'design-review': {
            title: '\u8f93\u51fa\u7ed9 Design Review Center',
            fields: [
                {
                    key: 'current_dominant_season',
                    label: '\u5f53\u524d\u4e3b\u63a8\u5b63\u8282',
                    value: ANNUAL_CONTROL_SEASON_LABELS[currentControl.season],
                },
                {
                    key: 'current_key_role',
                    label: '\u5f53\u524d\u4e3b\u63a8\u89d2\u8272',
                    value: params.currentKeyRole,
                },
                {
                    key: 'old_goods_exit_direction',
                    label: '\u5f53\u524d\u5e94\u9000\u51fa\u7684\u8001\u8d27\u65b9\u5411',
                    value: ANNUAL_CONTROL_SEASON_LABELS[previousControl.season] + ' \u5c3e\u8d27\u9000\u51fa\u4e3b\u9648\u5217\uff0c\u907f\u514d\u538b\u5236 ' + ANNUAL_CONTROL_SEASON_LABELS[currentControl.season] + ' \u65b0\u54c1\u63a5\u66ff\u3002',
                },
                {
                    key: 'next_new_goods_direction',
                    label: '\u4e0b\u4e00\u5b63\u5e94\u627f\u63a5\u7684\u65b0\u54c1\u65b9\u5411',
                    value: nextSeasonFocus
                        ? ANNUAL_CONTROL_SEASON_LABELS[nextControl.season] + ' ' + nextSeasonFocus.mainCategory.join(' / ')
                        : currentCategories + ' \u6309 ' + nextControl.windows.launch + ' \u63d0\u524d\u627f\u63a5\u3002',
                },
            ],
        },
    };
}

function buildAnnualControlTransitionControlModel(params: {
    months: AnnualControlMonthAxisItem[];
    currentMonth: number;
    currentSeason: DashboardSeason;
    currentFocus: AnnualMerchandisingFocus | null;
    currentSceneLabel: string;
    currentKeyRole: string;
    market?: string;
    brand?: string;
    channel?: string;
    wave?: DashboardWave;
    category?: string;
}): AnnualControlTransitionControlModel {
    const seasons: AnnualControlTransitionSeasonControl[] = SEASONAL_INVENTORY_TRANSITIONS.map((transition) => {
        const windowConfig = ANNUAL_CONTROL_TRANSITION_SEASON_WINDOWS[transition.season];
        const metrics = resolveAnnualControlTransitionMetricPlan({
            season: transition.season,
            market: params.market,
            brand: params.brand,
            channel: params.channel,
            wave: params.wave,
            category: params.category,
        });
        const newGapPp = Math.round((transition.actualNewGoodsRatio - metrics.newOldMixTarget.newGoods) * 100);
        const oldGapPp = Math.round((transition.actualOldGoodsRatio - metrics.newOldMixTarget.oldGoods) * 100);
        const planSegments = buildAnnualControlTransitionSegments({
            range: windowConfig.displayPlanRange,
            lifecycle: transition.lifecyclePlan,
            discounts: {
                launch: metrics.newGoodsDiscountPlan.launch,
                mainSell: metrics.newGoodsDiscountPlan.mainSell,
                clearance: metrics.newGoodsDiscountPlan.clearance,
            },
        });
        const actualSegments = buildAnnualControlTransitionSegments({
            range: windowConfig.displayActualRange,
            lifecycle: transition.lifecycleActual,
            discounts: transition.discountActualByStage,
        });
        const risk = buildAnnualControlTransitionRisk({
            transition,
            planRange: windowConfig.displayPlanRange,
            actualRange: windowConfig.displayActualRange,
            handoffPlan: windowConfig.handoffPlan,
            handoffActual: windowConfig.handoffActual,
            metrics,
        });

        return {
            season: transition.season,
            seasonLabel: ANNUAL_CONTROL_SEASON_LABELS[transition.season],
            shortLabel: getAnnualControlTransitionShortLabel(transition.season),
            nextSeasonLabel: transition.nextSeasonLabel,
            fullLifecycleLabel: windowConfig.fullLifecycleLabel,
            carryInLabel: windowConfig.carryInLabel,
            carryOutLabel: windowConfig.carryOutLabel,
            carryInPreviewRange: windowConfig.carryInPreviewRange,
            windows: windowConfig.windows,
            handoffFocus: transition.handoffFocus,
            carryoverRisk: transition.carryoverRisk,
            discount: {
                newPlan: metrics.newGoodsDiscountPlan.mainSell,
                newActual: transition.actualNewGoodsDiscount,
                oldPlan: metrics.oldGoodsAverageDiscount,
                oldActual: transition.actualOldGoodsDiscount,
            },
            planRange: windowConfig.displayPlanRange,
            actualRange: windowConfig.displayActualRange,
            handoffPlan: windowConfig.handoffPlan,
            handoffActual: windowConfig.handoffActual,
            ratio: {
                planNew: metrics.newOldMixTarget.newGoods,
                planOld: metrics.newOldMixTarget.oldGoods,
                actualNew: transition.actualNewGoodsRatio,
                actualOld: transition.actualOldGoodsRatio,
                newGapPp,
                oldGapPp,
            },
            metrics,
            planSegments,
            actualSegments,
            sellThroughPlanBand: buildAnnualControlTransitionMetricBand(planSegments, metrics.sellThroughMonthlyPlan),
            newGoodsDiscountPlanBand: buildAnnualControlTransitionMetricBand(planSegments, metrics.newGoodsDiscountMonthlyPlan),
            oldGoodsDiscountPlanBand: buildAnnualControlTransitionMetricBand(planSegments, metrics.oldGoodsDiscountMonthlyPlan),
            kpis: {
                newOldTargetLabel: 'OTB \u65b0 ' + Math.round(metrics.newOldMixTarget.newGoods * 100) + ' / \u65e7 ' + Math.round(metrics.newOldMixTarget.oldGoods * 100),
                newOldActualLabel: '\u5e93\u5b58 \u65b0 ' + Math.round(transition.actualNewGoodsRatio * 100) + ' / \u65e7 ' + Math.round(transition.actualOldGoodsRatio * 100),
                oldDiscountTargetLabel: '\u8ba1\u5212\u5747\u6298 ' + formatAnnualControlTransitionMetricPercent(metrics.oldGoodsAverageDiscount),
                oldDiscountActualLabel: '\u5b9e\u9645\u5747\u6298 ' + formatAnnualControlTransitionMetricPercent(transition.actualOldGoodsDiscount),
            },
            risk,
            summary: {
                headline: '\u5468\u671f ' + windowConfig.fullLifecycleLabel + ' \u00b7 \u4e3b\u9500 ' + windowConfig.windows.mainSell,
                deviation: '\u76ee\u6807 \u65b0 ' + Math.round(metrics.newOldMixTarget.newGoods * 100) + ' / \u5b9e\u9645 ' + Math.round(transition.actualNewGoodsRatio * 100),
                note: transition.handoffFocus,
            },
        };
    });

    return {
        months: params.months,
        currentMonth: params.currentMonth,
        currentSeason: params.currentSeason,
        seasons,
        outputs: buildAnnualControlTransitionOutputs({
            seasons,
            currentSeason: params.currentSeason,
            currentFocus: params.currentFocus,
            currentSceneLabel: params.currentSceneLabel,
            currentKeyRole: params.currentKeyRole,
        }),
    };
}

export interface AnnualControlKpiContext {
    wos?: number | null;
    wosGapWeeks?: number | null;
    sellThroughGapPp?: number | null;
    newGoodsGapPp?: number | null;
    marginGapPp?: number | null;
}

export function buildAnnualControlMasterView(
    filters: Pick<DashboardFilters, 'season_year' | 'season' | 'wave' | 'region'>,
    kpiContext?: AnnualControlKpiContext,
): AnnualControlMasterViewModel {
    const stage = getAnnualControlStage(filters);
    const realCurrentMonth = new Date().getMonth() + 1;
    const selectedYear = filters.season_year === 'all' ? new Date().getFullYear() : Number(filters.season_year) || new Date().getFullYear();
    const climate = getAnnualControlClimate(filters.region);
    const climateSeries = getAnnualControlClimateSeries(filters.region);
    const dependencies = buildAnnualControlDependencies(filters);
    const currentMonth = getAnnualControlActiveMonth(filters);
    const { currentWeek, currentWeekLabel, currentWeekRatio } = getAnnualControlActiveWeekPosition(filters);
    const currentWave = `W${String(currentMonth).padStart(2, '0')}` as DashboardWave;
    const currentSeason = getDashboardSeasonByWave(currentWave) || 'Q1';
    const scopeMonths = getAnnualControlScopeMonths(filters);
    const timelineNodes = getAnnualControlTimeline(filters);
    const nextNode = buildAnnualControlUpcomingNode(filters);
    const currentFocus = ANNUAL_MERCH_FOCUS_TEMPLATE.find((item) => item.month === currentMonth) || null;
    const currentPriceBand = currentFocus ? getAnnualControlPriceBand(currentFocus.mainPriceBandId) : FOOTWEAR_PRICE_BAND_POSITIONING[1];
    const currentReserveFields = getAnnualControlDesignReserveFields(currentMonth);
    const currentKeyRole = currentFocus ? getAnnualControlKeyRole(currentFocus.keyRole).id : '主推款';
    const currentSceneLabel = currentFocus ? getAnnualControlScene(currentFocus.sceneId).label : '\u5e74\u5ea6\u7edf\u7b79';
    const transitionControl = buildAnnualControlTransitionControlModel({
        months: ANNUAL_CONTROL_MONTH_AXIS,
        currentMonth,
        currentSeason,
        currentFocus,
        currentSceneLabel,
        currentKeyRole,
        market: filters.region,
        wave: currentWave,
        category: currentFocus?.mainCategory[0],
    });

    const footwearFocus: AnnualControlFootwearFocusSummary | null = currentFocus
        ? {
            scene: getAnnualControlScene(currentFocus.sceneId).label,
            categories: currentFocus.mainCategory,
            priceBandLabel: currentPriceBand.label,
            priceBandRange: currentPriceBand.range,
            keyRole: currentKeyRole,
            bottomType: stripReserveSuffix(currentReserveFields.bottomTypeHint),
            lastShape: stripReserveSuffix(currentReserveFields.lastShapeHint),
            platformStrategyHint: currentReserveFields.platformStrategyHint,
        }
        : null;

    const monthNodes = new Map<number, AnnualControlTimelineNode[]>();
    const monthActions = new Map<number, CrossFunctionalAction[]>();
    ANNUAL_CONTROL_MONTH_AXIS.forEach((item) => {
        monthNodes.set(item.month, ANNUAL_CONTROL_TIMELINE_NODES.filter((node) => node.month === item.month));
        monthActions.set(item.month, ANNUAL_CONTROL_ACTIONS.filter((action) => action.month === item.month));
    });

    const lanes: AnnualControlMasterLane[] = [
        { id: 'environment', title: '市场环境层', description: '节气 / 节庆 / 区域温度', cells: [] },
        { id: 'transition', title: '货盘切换层', description: '新旧货占比 / 生命周期 / 折扣计划', cells: [] },
        { id: 'marketing', title: '销售节奏层', description: '主推场景 / 鞋类 / 主力价格带', cells: [] },
        { id: 'risk', title: '节庆营销层', description: '节庆等级 / 关键款 / 清货与承接风险', cells: [] },
        { id: 'action', title: '部门动作层', description: '商品 / 设计企划 / 品牌陈列执行动作', cells: [] },
    ];

    ANNUAL_CONTROL_MONTH_AXIS.forEach((axisItem) => {
        const nodes = monthNodes.get(axisItem.month) || [];
        const focus = ANNUAL_MERCH_FOCUS_TEMPLATE.find((item) => item.month === axisItem.month) || null;
        const transition = SEASONAL_INVENTORY_TRANSITIONS.find((item) => item.season === axisItem.season) || SEASONAL_INVENTORY_TRANSITIONS[0];
        const actions = monthActions.get(axisItem.month) || [];
        const solarTerm = nodes.find((node) => node.nodeType === 'solar-term');
        const festivalNodes = [...nodes]
            .filter((node) => node.nodeType === 'festival' || node.nodeType === 'marketing')
            .sort((left, right) => {
                const severityRank = { high: 3, medium: 2, low: 1 };
                const severityGap = severityRank[right.severity] - severityRank[left.severity];
                if (severityGap !== 0) return severityGap;
                return (left.week ?? 99) - (right.week ?? 99);
            });
        const festival = festivalNodes[0] || null;
        const festivalLabel = festivalNodes.length ? [...festivalNodes].sort((left, right) => (left.week ?? 99) - (right.week ?? 99)).map((node) => node.label).join(' / ') : undefined;
        const solarTermProfile = getAnnualControlSolarTermProfile(axisItem.month);
        const useActualCurrentMonthTemperature = filters.season_year === 'all' || selectedYear === new Date().getFullYear();
        const environmentTemperatureRows = getAnnualControlEnvironmentTemperatureRows(filters.region, axisItem.month, realCurrentMonth, useActualCurrentMonthTemperature);
        const phaseLabel = ['上市期', '主销期', '折扣 / 清货期'][(axisItem.month - 1) % 3];
        const linkedDependency = dependencies.find((item) => item.fromMonth === axisItem.month || item.toMonth === axisItem.month);
        const scene = focus ? getAnnualControlScene(focus.sceneId) : FOOTWEAR_SCENE_OPTIONS[0];
        const compactCategories = focus ? focus.mainCategory.map(getAnnualControlCompactCategoryLabel).slice(0, 2) : ['鞋类'];
        const compactPriceBand = focus ? getAnnualControlCompactPriceBandLabel(focus.mainPriceBandId) : '399-599 走量';
        const compactScene = focus ? getAnnualControlCompactSceneLabel(focus.sceneId) : '通勤';
        const compactKeyRole = focus ? getAnnualControlCompactKeyRole(focus.keyRole) : '主推';
        const festivalGrade = focus ? getAnnualControlFestivalGrade(focus.marketingLevel) : 'B级';
        const reserveFields = getAnnualControlDesignReserveFields(axisItem.month);
        const shortBottomType = stripReserveSuffix(reserveFields.bottomTypeHint);
        const shortLastShape = stripReserveSuffix(reserveFields.lastShapeHint);
        const nextStepHint = nextNode && axisItem.month === currentMonth ? `${nextNode.etaLabel}进入 ${nextNode.label}` : undefined;
        const actionMonthBrief = ANNUAL_CONTROL_ACTION_MONTH_BRIEFS.find((item) => item.month === axisItem.month) || null;
        const isCurrentMonthRow = axisItem.month === currentMonth;
        const actionTracks: AnnualControlActionTrack[] = ANNUAL_CONTROL_ACTION_TEAM_ORDER.map((teamType) => {
            const action = actions.find((item) => item.teamType === teamType) || null;
            const fallbackAction = getAnnualControlDefaultAction(teamType, axisItem, scene.label);
            const kpiRiskFlag = isCurrentMonthRow
                ? ((kpiContext?.wos != null && kpiContext.wos > 12 && teamType === '商品') ||
                   (kpiContext?.sellThroughGapPp != null && kpiContext.sellThroughGapPp < -3 && (teamType === '商品' || teamType === '设计企划')) ||
                   (kpiContext?.newGoodsGapPp != null && kpiContext.newGoodsGapPp < -3 && teamType === '设计企划') ||
                   (kpiContext?.marginGapPp != null && kpiContext.marginGapPp < -1.5 && teamType === '商品'))
                : false;
            return {
                teamType,
                ownerCode: getAnnualControlTeamOwnerCode(teamType),
                title: action?.actionTitle || fallbackAction.actionTitle,
                detail: action?.actionDesc || fallbackAction.actionDesc,
                deliverable: action?.deliverable || fallbackAction.deliverable,
                statusLabel: action?.statusLabel || getAnnualControlActionStatusLabel(axisItem.month, currentMonth),
                weekLabel: action?.relatedWave || axisItem.wave,
                priority: action?.priority || 'P2',
                riskFlag: (action?.riskFlag || false) || kpiRiskFlag,
                syncKey: action?.syncKey,
            };
        });
        lanes[0].cells.push({
            month: axisItem.month,
            headline: solarTermProfile.terms.join(' / '),
            description: climate.label + ' · ' + climateSeries[axisItem.month - 1] + ' · ' + climate.temperatureBand,
            chips: [festival?.label || '节气窗口', climateSeries[axisItem.month - 1], climate.temperatureBand],
            tone: festival
                ? getAnnualControlNodeTone(festival.nodeType, festival.severity)
                : axisItem.season === 'Q2'
                    ? 'sky'
                    : axisItem.season === 'Q3'
                        ? 'amber'
                        : axisItem.season === 'Q4'
                            ? 'rose'
                            : 'emerald',
            emphasis: axisItem.month === currentMonth,
            supportingText: (solarTerm?.label && solarTerm.label !== solarTermProfile.terms.join(' / ')
                ? '节气节点：' + solarTerm.label + ' · '
                : '') + solarTermProfile.summary,
            nextStepHint,
            environmentMetrics: {
                solarTerms: solarTermProfile.terms,
                solarTermSummary: solarTermProfile.summary,
                climateLabel: climate.label,
                climateBand: climate.temperatureBand,
                climateSummary: climate.summary,
                festivalLabel,
                regionLabel: filters.region === 'all' ? '区域联看' : climate.label,
                temperatureRows: environmentTemperatureRows,
            },
        });

        // 根据当月所在生命周期阶段推导货品占比（计划参考值，后期替换为实际 SKU 数据）
        const lifecycleByPhase = {
            '上市期': { newLaunch: 0.32, newGoods: 0.48, mature: 0.14, clearance: 0.06 },
            '主销期': { newLaunch: 0.06, newGoods: 0.52, mature: 0.30, clearance: 0.12 },
            '折扣 / 清货期': { newLaunch: 0.00, newGoods: 0.12, mature: 0.28, clearance: 0.60 },
        }[phaseLabel] ?? { newLaunch: 0.10, newGoods: 0.50, mature: 0.28, clearance: 0.12 };

        lanes[1].cells.push({
            month: axisItem.month,
            headline: `${phaseLabel} · ${ANNUAL_CONTROL_SEASON_LABELS[axisItem.season]}`,
            description: `上市 ${transition.launchWindow} · 主销 ${transition.sellWindow} · 清货 ${transition.clearanceWindow}`,
            chips: [`新品折 ${Math.round(transition.newGoodsDiscountTarget * 100)}%`, `老货折 ${Math.round(transition.oldGoodsDiscountTarget * 100)}%`, `清货 ${transition.clearanceWindow}`],
            tone: axisItem.month === currentMonth ? 'rose' : axisItem.season === 'Q4' ? 'amber' : 'sky',
            emphasis: axisItem.month === currentMonth,
            supportingText: `偏差 新${formatAnnualControlGapPp(transition.actualNewGoodsRatio, transition.newGoodsRatio)} / 旧${formatAnnualControlGapPp(transition.actualOldGoodsRatio, transition.oldGoodsRatio)} · 新折 ${Math.round(transition.actualNewGoodsDiscount * 100)}%/${Math.round(transition.newGoodsDiscountTarget * 100)}% · 旧折 ${Math.round(transition.actualOldGoodsDiscount * 100)}%/${Math.round(transition.oldGoodsDiscountTarget * 100)}%`,
            nextStepHint,
            transitionMetrics: {
                newGoodsActual: transition.actualNewGoodsRatio,
                newGoodsTarget: transition.newGoodsRatio,
                discountNewActual: transition.actualNewGoodsDiscount,
                discountNewTarget: transition.newGoodsDiscountTarget,
                discountOldActual: transition.actualOldGoodsDiscount,
                discountOldTarget: transition.oldGoodsDiscountTarget,
                phaseLabel,
                lifecycle: lifecycleByPhase,
                discountByStage: {
                    newLaunch: Math.min(1, transition.newGoodsDiscountTarget + 0.04),
                    newGoods: transition.newGoodsDiscountTarget,
                    mature: (transition.newGoodsDiscountTarget + transition.oldGoodsDiscountTarget) / 2,
                    clearance: transition.oldGoodsDiscountTarget,
                },
            },
        });



        lanes[2].cells.push({
            month: axisItem.month,
            headline: `${compactScene} · ${compactCategories.join(' / ')}`,
            description: `${compactPriceBand} · ${compactKeyRole}`,
            chips: [compactPriceBand, compactKeyRole, compactScene],
            tone: focus?.marketingLevel === 'S' ? 'rose' : focus?.marketingLevel === 'A' ? 'amber' : 'sky',
            emphasis: axisItem.month === currentMonth,
            supportingText: axisItem.month === currentMonth ? `平台 ${reserveFields.platformStrategyHint}` : `导向 ${focus ? focus.priority : '待配置'}`,
            footwearChips: [`底 ${shortBottomType}`, `楦 ${shortLastShape}`],
            nextStepHint,
        });

        lanes[3].cells.push({
            month: axisItem.month,
            headline: `${festivalGrade}节庆 · ${festival?.label || axisItem.phaseLabel}`,
            description: `推 ${compactCategories[0]} · ${compactPriceBand} · ${compactKeyRole}`,
            chips: [festivalGrade, compactCategories[0], compactPriceBand],
            tone: linkedDependency?.severity === 'high' || focus?.marketingLevel === 'S' ? 'rose' : 'amber',
            emphasis: axisItem.month === currentMonth,
            supportingText: linkedDependency?.detail || `先控旧货退出，再放大 ${compactCategories[0]} 的 ${festivalGrade} 节庆窗口。`,
            nextStepHint,
        });

        lanes[4].cells.push({
            month: axisItem.month,
            headline: `${ANNUAL_CONTROL_SEASON_LABELS[axisItem.season]}跨部门执行`,
            description: `按 ${axisItem.phaseLabel} 节奏推进商品、设计企划与品牌陈列动作。`,
            chips: [axisItem.wave, axisItem.weekRange, axisItem.phaseLabel],
            tone: actionTracks.some((item) => item.priority === 'P0') ? 'rose' : actionTracks.some((item) => item.priority === 'P1') ? 'emerald' : 'slate',
            emphasis: axisItem.month === currentMonth,
            actionTracks,
            monthWorkBrief: {
                title: actionMonthBrief?.focusTitle || `${ANNUAL_CONTROL_SEASON_LABELS[axisItem.season]}动作重点`,
                summary: actionMonthBrief?.focusSummary || `按 ${axisItem.phaseLabel} 节奏推进商品、设计企划与品牌陈列动作。`,
            },
            supportingText: axisItem.month === currentMonth && nextNode ? `前置提醒：${nextNode.etaLabel}后进入 ${nextNode.label}` : undefined,
            nextStepHint,
        });
    });

    return {
        year: selectedYear,
        currentMonth,
        currentWeek,
        currentWeekLabel,
        currentWeekRatio,
        currentWave,
        currentSeason,
        currentStageLabel: stage.label,
        currentNodeLabel: stage.nodeLabel,
        scopeMonths,
        months: ANNUAL_CONTROL_MONTH_AXIS,
        timelineNodes,
        dependencies,
        lanes,
        nextNode,
        footwearFocus,
        transitionControl,
    };
}

export function buildAnnualControlModuleOutputs(params: {
    filters: Pick<DashboardFilters, 'season' | 'wave' | 'region'>;
    stage: ReturnType<typeof getAnnualControlStage>;
    focus: AnnualMerchandisingFocus | null;
    transition: SeasonalInventoryTransition | null;
    designReviewInput: AnnualControlDesignReviewInput;
}): AnnualControlModuleOutput[] {
    const focus = params.focus;
    const transition = params.transition;
    const sceneLabel = focus ? getAnnualControlScene(focus.sceneId).label : '年度统筹';
    const priceBand = focus ? getAnnualControlPriceBand(focus.mainPriceBandId) : FOOTWEAR_PRICE_BAND_POSITIONING[1];
    const inventoryRiskLevel = transition ? (transition.oldGoodsRatio >= 0.3 ? '高' : transition.oldGoodsRatio >= 0.16 ? '中' : '低') : '按季度判断';

    return [
        {
            module: 'overview',
            title: '输出给总览',
            summary: '先输出当前经营阶段、重点动作与主要风险，让总览先讲经营判断。',
            bullets: [`当前经营阶段：${params.stage.label}`, `当前重点动作：${params.stage.priority}`, `当前主要风险：${params.stage.risk}`],
        },
        {
            module: 'otb',
            title: '输出给 OTB&货品结构',
            summary: 'OTB 要接受当前预算节点、新旧货比例和鞋类价格带窗口的上位约束。',
            bullets: [
                `当前预算节点：${params.stage.nodeLabel}`,
                transition ? `新旧货约束：新 ${Math.round(transition.newGoodsRatio * 100)}% / 旧 ${Math.round(transition.oldGoodsRatio * 100)}%` : '新旧货约束：按季度切换配置',
                `主力价格带窗口：${priceBand.label} · ${priceBand.range}`,
                `季节切换要求：${transition?.handoffFocus || params.stage.priority}`,
            ],
        },
        {
            module: 'planning',
            title: '输出给波段企划',
            summary: '波段企划要接住当前节庆、场景、鞋型角色和承接要求。',
            bullets: [
                `主推场景：${sceneLabel}`,
                `主推品类：${focus ? focus.mainCategory.join(' / ') : '按当期主题配置'}`,
                `主推价格带：${priceBand.label} · ${priceBand.range}`,
                `上市承接要求：${transition ? transition.handoffFocus : params.stage.priority}`,
            ],
        },
        {
            module: 'inventory',
            title: '输出给库存健康',
            summary: '库存页先解释当前清货窗口、老货承压和新品承接风险等级。',
            bullets: [
                `当前清货窗口：${transition?.clearanceWindow || '按季度切换'}`,
                transition ? `老货承压阶段：旧货 ${Math.round(transition.oldGoodsRatio * 100)}%` : '老货承压阶段：跟随季度切换',
                `新货承接风险：${transition?.carryoverRisk || params.stage.risk}`,
                `库存切换风险等级：${inventoryRiskLevel}`,
            ],
        },
        {
            module: 'design-review',
            title: '输出给 Design Review Center',
            summary: '把总控层翻译成设计/企划可直接消费的鞋类字段与前置提醒。',
            bullets: [
                `主推季节 / 波段：${params.designReviewInput.currentSeason} · ${params.designReviewInput.currentWave}`,
                `主推场景 / 品类：${params.designReviewInput.mainScene} · ${params.designReviewInput.mainCategories.join(' / ')}`,
                `主推价格带 / 关键角色：${params.designReviewInput.mainPriceBand} · ${params.designReviewInput.keyRole}`,
                `开发重点 / 前置提醒：${params.designReviewInput.developmentHint} · ${params.designReviewInput.gateReminder}`,
                `底型 / 楦型 / 平台策略：${params.designReviewInput.mainBottomType} · ${params.designReviewInput.mainLastShape} · ${params.designReviewInput.platformStrategyHint}`,
            ],
        },
    ];
}

const ANNUAL_CONTROL_MODULE_RESPONSE_WEEKS: Record<AnnualControlActionModule, number> = {
    category: 1,
    planning: 2,
    otb: 2,
    channel: 2,
    inventory: 1,
    'design-review': 3,
};

function formatAnnualControlCalendarDate(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}年${month}月${day}日`;
}

export function getAnnualControlSellThroughTone(gapPp: number | null): AnnualControlHealthTone {
    if (gapPp === null) return 'amber';
    if (gapPp <= -3) return 'rose';
    if (gapPp < -1) return 'amber';
    return 'emerald';
}

export function getAnnualControlNewGoodsTone(gapPp: number | null): AnnualControlHealthTone {
    if (gapPp === null) return 'amber';
    if (gapPp <= -5) return 'rose';
    if (gapPp < -2) return 'amber';
    return 'emerald';
}

export function getAnnualControlMarginTone(gapPp: number | null): AnnualControlHealthTone {
    if (gapPp === null) return 'amber';
    if (gapPp <= -3) return 'rose';
    if (gapPp < -1) return 'amber';
    return 'emerald';
}

export function getAnnualControlWosTone(wos: number | null, gapWeeks: number | null): AnnualControlHealthTone {
    if (wos === null) return 'amber';
    if (gapWeeks !== null) {
        if (gapWeeks >= 1.2 || gapWeeks <= -1.2) return 'rose';
        if (gapWeeks >= 0.6 || gapWeeks <= -0.8) return 'amber';
        return 'emerald';
    }
    if (wos > 6 || wos < 2.2) return 'rose';
    if (wos > 5 || wos < 3) return 'amber';
    return 'emerald';
}

export function getAnnualControlWosHealthLabel(wos: number | null, gapWeeks: number | null) {
    if (wos === null) return '等待库存口径';
    if (gapWeeks !== null) {
        if (gapWeeks >= 1.2) return '库存偏深';
        if (gapWeeks <= -1.2) return '库存偏紧';
        if (gapWeeks >= 0.6 || gapWeeks <= -0.8) return '库存需盯';
        return '库存健康';
    }
    if (wos > 6) return '库存偏深';
    if (wos < 2.2) return '库存偏紧';
    if (wos > 5 || wos < 3) return '库存需盯';
    return '库存健康';
}

export function getAnnualControlHealthTone(params: {
    sellThroughGapPp: number | null;
    newGoodsGapPp: number | null;
    marginGapPp: number | null;
    wos: number | null;
    wosGapWeeks: number | null;
}): AnnualControlHealthTone {
    const tones = [
        getAnnualControlSellThroughTone(params.sellThroughGapPp),
        getAnnualControlNewGoodsTone(params.newGoodsGapPp),
        getAnnualControlMarginTone(params.marginGapPp),
        getAnnualControlWosTone(params.wos, params.wosGapWeeks),
    ];
    if (tones.includes('rose')) return 'rose';
    if (tones.includes('amber')) return 'amber';
    return 'emerald';
}

export function getAnnualControlHealthCopy(tone: AnnualControlHealthTone) {
    if (tone === 'rose') return '红灯：当前偏差已开始冲击年度路径。';
    if (tone === 'amber') return '黄灯：当前处于纠偏窗口，需盯紧退旧进新。';
    return '绿灯：经营进度、毛利和库存仍在年度路径内。';
}

export function getAnnualControlRiskSeverity(gapPp: number, tone: AnnualControlHealthTone): number {
    if (tone === 'rose') return Math.round(Math.min(100, 70 + Math.abs(gapPp) * 5));
    if (tone === 'amber') return Math.round(Math.min(69, 40 + Math.abs(gapPp) * 3));
    return Math.round(Math.min(39, Math.abs(gapPp) * 2));
}

export function getAnnualControlPanelTone(tone: AnnualControlHealthTone): AnnualControlHealthTone {
    return tone;
}

export function buildAnnualControlModuleDeadline(params: {
    year: number;
    currentWeek: number;
    module: AnnualControlActionModule;
    nextNode?: AnnualControlUpcomingNode | null;
}): AnnualControlModuleDeadlineInfo {
    const responseWeeks = ANNUAL_CONTROL_MODULE_RESPONSE_WEEKS[params.module];
    const desiredTargetWeek = params.currentWeek + responseWeeks;
    const nextNodeWeek = params.nextNode?.week ?? null;
    const targetWeek = nextNodeWeek !== null
        ? Math.max(params.currentWeek + 1, Math.min(desiredTargetWeek, nextNodeWeek))
        : desiredTargetWeek;
    const targetDate = new Date(params.year, 0, 1);
    targetDate.setDate(targetDate.getDate() + Math.max(0, (targetWeek - 1) * 7 + 3));

    return {
        deadline: formatAnnualControlCalendarDate(targetDate),
        daysLeft: Math.max(1, (targetWeek - params.currentWeek) * 7),
        targetWeek,
    };
}

export function formatAnnualControlScopeLabel(filters: Pick<DashboardFilters, 'season_year' | 'season' | 'wave'>) {
    const yearLabel = filters.season_year === 'all' ? '全部年度' : `${filters.season_year}年`;
    if (filters.wave !== 'all') return `${yearLabel} · ${filters.wave}`;
    if (filters.season !== 'all') return `${yearLabel} · ${filters.season}`;
    return `${yearLabel} · 全年统筹`;
}

















