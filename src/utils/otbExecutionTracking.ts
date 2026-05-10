/**
 * src/utils/otbExecutionTracking.ts
 * 采购执行与上市履约看板 — 诊断、汇总、波段聚合工具函数
 */

import { type ExecutionTrackingRow } from '@/utils/otbCalculations';

export const BUSINESS_DATE = new Date('2026-05-09');

// ─── 时间状态 ────────────────────────────────────────────────────────────────

export type ExecTimeStatus = 'closed' | 'current' | 'planning';

/** 判断波段相对业务日期的阶段：已上市 / 当前执行（开发节点已开始）/ 未来计划 */
export function resolveExecTimeStatus(launchDate: string, businessDate: Date = BUSINESS_DATE): ExecTimeStatus {
    const launch = new Date(launchDate);
    const diffDays = (launch.getTime() - businessDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return 'closed';
    if (diffDays <= 120) return 'current';
    return 'planning';
}

// ─── 执行阶段完成率 ──────────────────────────────────────────────────────────

export interface ExecStageRates {
    developmentRate: number | null;
    pricingRate:     number | null;
    orderRate:       number | null;
    arrivalRate:     number | null;
    currentStage: 'development' | 'pricing' | 'ordering' | 'arrival' | 'launched';
}

export function calcExecutionStage(row: ExecutionTrackingRow): ExecStageRates {
    const { plannedStyleCount, developedStyleCount, pricedStyleCount, orderedStyleCount, plannedPurchaseAmount, arrivedAmount, daysToLaunch } = row;
    const devRate     = plannedStyleCount > 0 ? developedStyleCount / plannedStyleCount : null;
    const pricingRate = plannedStyleCount > 0 ? pricedStyleCount / plannedStyleCount : null;
    const orderRate   = plannedStyleCount > 0 ? orderedStyleCount / plannedStyleCount : null;
    const arrivalRate = plannedPurchaseAmount > 0 ? arrivedAmount / plannedPurchaseAmount : null;

    let currentStage: ExecStageRates['currentStage'] = 'development';
    if (daysToLaunch < 0)                                  currentStage = 'launched';
    else if (arrivalRate !== null && arrivalRate > 0)      currentStage = 'arrival';
    else if (orderRate !== null && orderRate > 0)          currentStage = 'ordering';
    else if (pricingRate !== null && pricingRate > 0)      currentStage = 'pricing';

    return { developmentRate: devRate, pricingRate, orderRate, arrivalRate, currentStage };
}

// ─── 诊断类型 ────────────────────────────────────────────────────────────────

export type DiagLevel    = 'danger' | 'warning' | 'info';
export type DiagPriority = 'P0' | 'P1' | 'P2';

export interface ExecDiagnosis {
    id:               string;
    rowId:            string;
    season:           string;
    wave:             string;
    categoryLabel:    string;
    productRoleName?: string;
    level:            DiagLevel;
    priority:         DiagPriority;
    issue:            string;
    impactAmount:     number;
    impactLaunchDate: string;
    action:           string;
    owner:            string;
}

// ─── 单行诊断 ────────────────────────────────────────────────────────────────

export function diagnoseExecutionRow(row: ExecutionTrackingRow, businessDate: Date = BUSINESS_DATE): ExecDiagnosis[] {
    const results: ExecDiagnosis[] = [];
    const timeStatus = resolveExecTimeStatus(row.launchDate, businessDate);
    const ppa = row.plannedPurchaseAmount;
    const oa  = row.orderedAmount;
    const aa  = row.arrivedAmount;
    const isCurrent = timeStatus === 'current';

    function push(
        diagId:   string,
        level:    DiagLevel,
        priority: DiagPriority,
        issue:    string,
        impactAmount: number,
        action:   string,
        owner:    string,
    ) {
        results.push({
            id: `${row.id}-${diagId}`,
            rowId: row.id,
            season: row.season,
            wave: row.wave,
            categoryLabel: row.categoryLabel,
            productRoleName: row.productRoleName,
            level,
            priority,
            issue,
            impactAmount: Math.max(0, impactAmount),
            impactLaunchDate: row.launchDate,
            action,
            owner,
        });
    }

    const devRate   = row.plannedStyleCount > 0 ? row.developedStyleCount / row.plannedStyleCount : 1;
    const orderPct  = row.plannedStyleCount > 0 ? Math.round(row.orderedStyleCount  / row.plannedStyleCount  * 100) : 100;
    const arrivalPct = oa > 0 ? Math.round(aa / oa * 100) : 0;

    // 1. 设计开发滞后（截止已过且有缺口）
    if (row.designNodeRisk) {
        push('dev-lag', 'danger', 'P0',
            `开发滞后：已开发 ${row.developedStyleCount} / ${row.plannedStyleCount} 款 (${Math.round(devRate * 100)}%)，设计截止已过`,
            ppa * (1 - devRate),
            '立即召集设计评审，确认开发缺口款，尽快输出完整开发包',
            '设计开发',
        );
    } else if (row.developmentGap && (isCurrent || timeStatus === 'planning')) {
        push('dev-gap', 'warning', 'P1',
            `开发缺口：已开发 ${row.developedStyleCount} / ${row.plannedStyleCount} 款 (${Math.round(devRate * 100)}%)`,
            ppa * (1 - devRate),
            '优先锁定主推款开发进度，评估能否补充测试款',
            '设计开发',
        );
    }

    // 2. 核价滞后（截止已过）
    if (row.costingNodeRisk) {
        const pricingDevRate = row.developedStyleCount > 0 ? row.pricedStyleCount / row.developedStyleCount : 1;
        push('price-lag', 'danger', 'P0',
            `核价滞后：已定价 ${row.pricedStyleCount} / 已开发 ${row.developedStyleCount} 款 (${Math.round(pricingDevRate * 100)}%)，核价截止已过`,
            ppa * (1 - pricingDevRate),
            '立即启动快速核价流程，无法定价款转测试/清货处理',
            '商品/采购',
        );
    }

    // 3. 下单滞后（截止已过）
    if (row.orderNodeRisk) {
        push('order-lag', 'danger', 'P0',
            `下单滞后：已下单 ${row.orderedStyleCount} / ${row.plannedStyleCount} 款 (${orderPct}%)，下单截止已过`,
            ppa - oa,
            '48h 内关闭下单缺口，超期款提报备货风险',
            '采购',
        );
    } else if (isCurrent && ppa > 0 && oa < ppa * 0.85) {
        push('order-low', 'warning', 'P1',
            `采购不足：已下单 ${orderPct}% / 计划采购额，当前波段执行偏低`,
            ppa - oa,
            '检查未下单原因，评估对销售目标的影响，尽快补录采购订单',
            '采购',
        );
    }

    // 4. 到货滞后（截止已过）
    if (row.warehouseNodeRisk) {
        push('arrival-lag', 'danger', 'P0',
            `到货滞后：已到货 ${arrivalPct}% / 下单额，入仓截止已过`,
            oa - aa,
            '跟进工厂交货进度，协调仓储入仓时间窗口，优先主推款到货',
            '物流/仓储',
        );
    } else if (isCurrent && oa > 0 && aa < oa * 0.70) {
        push('arrival-low', 'warning', 'P1',
            `到货率偏低：已到货 ${arrivalPct}%，上市在即需加快到货节奏`,
            oa - aa,
            '优先推进主推款到货，爆款候选优先安排首批入仓',
            '物流',
        );
    }

    // 5. 采购超预算
    if (ppa > 0 && oa > ppa * 1.05) {
        push('over-budget', 'warning', 'P1',
            `采购超预算 ${Math.round((oa / ppa - 1) * 100)}%，实际下单超出计划`,
            oa - ppa,
            '提报预算超支审批，评估是否影响其他波段 OTB 余量',
            '商品企划',
        );
    }

    // 6. 主推款承接风险
    if (row.productRoleId === 'main' && orderPct < 90 && (isCurrent || row.orderNodeRisk)) {
        push('main-risk', 'danger', 'P0',
            `主推款承接风险：已下单 ${orderPct}% / 计划款数`,
            ppa - oa,
            '主推款下单优先级拉满，不足款评估翻单能力',
            '采购/商品企划',
        );
    }

    // 7. 爆款候选上市风险
    if (row.productRoleId === 'hero' && oa > 0 && aa < oa * 0.80 && isCurrent) {
        push('hero-risk', 'warning', 'P1',
            `爆款候选到货率 ${arrivalPct}% < 80%，上市首日备货不足`,
            oa - aa,
            '优先安排爆款候选首批到货，争取上市前完成全量入仓',
            '物流/门店运营',
        );
    }

    // 8. 形象款开发滞后
    if (row.productRoleId === 'image' && row.designNodeRisk) {
        push('image-dev', 'warning', 'P1',
            `形象款开发滞后，将影响品牌陈列形象`,
            ppa * 0.3,
            '形象款优先输出开发包，不可压缩开发周期',
            '设计开发',
        );
    }

    // 9. 毛利/定价风险
    if (row.pricingRisk) {
        push('pricing-risk', 'warning', 'P2',
            `定价/毛利风险：${row.pricingStatus ?? '毛利偏低'}${row.costRiskMessage ? ` (${row.costRiskMessage})` : ''}`,
            ppa * 0.1,
            '复核成本结构，与设计/供应商协商优化成本，或调整零售价',
            '商品/财务',
        );
    }

    return results;
}

// ─── 全局汇总 KPI ────────────────────────────────────────────────────────────

export interface ExecSummary {
    plannedPurchaseAmount: number;
    orderedAmount:         number;
    arrivedAmount:         number;
    plannedStyleCount:     number;
    developedStyleCount:   number;
    pricedStyleCount:      number;
    orderedStyleCount:     number;
    orderExecutionRate:    number | null;
    arrivalExecutionRate:  number | null;
    riskCount:             number;
    affectedWaveCount:     number;
    p0Count:               number;
    p1Count:               number;
    allDiagnoses:          ExecDiagnosis[];
}

export function calcExecutionSummary(rows: ExecutionTrackingRow[], businessDate: Date = BUSINESS_DATE): ExecSummary {
    const allDiagnoses = rows
        .flatMap(r => diagnoseExecutionRow(r, businessDate))
        .sort((a, b) => {
            const p: Record<DiagPriority, number> = { P0: 0, P1: 1, P2: 2 };
            return p[a.priority] - p[b.priority] || b.impactAmount - a.impactAmount;
        });

    const affectedWaves = new Set(
        allDiagnoses
            .filter(d => resolveExecTimeStatus(d.impactLaunchDate, businessDate) !== 'closed')
            .map(d => `${d.season}-${d.wave}`)
    );

    const totalPPA = rows.reduce((s, r) => s + r.plannedPurchaseAmount, 0);
    const totalOA  = rows.reduce((s, r) => s + r.orderedAmount, 0);
    const totalAA  = rows.reduce((s, r) => s + r.arrivedAmount, 0);

    return {
        plannedPurchaseAmount: totalPPA,
        orderedAmount:         totalOA,
        arrivedAmount:         totalAA,
        plannedStyleCount:     rows.reduce((s, r) => s + r.plannedStyleCount, 0),
        developedStyleCount:   rows.reduce((s, r) => s + r.developedStyleCount, 0),
        pricedStyleCount:      rows.reduce((s, r) => s + r.pricedStyleCount, 0),
        orderedStyleCount:     rows.reduce((s, r) => s + r.orderedStyleCount, 0),
        orderExecutionRate:    totalPPA > 0 ? totalOA / totalPPA : null,
        arrivalExecutionRate:  totalOA  > 0 ? totalAA / totalOA  : null,
        riskCount:             allDiagnoses.length,
        affectedWaveCount:     affectedWaves.size,
        p0Count:               allDiagnoses.filter(d => d.priority === 'P0').length,
        p1Count:               allDiagnoses.filter(d => d.priority === 'P1').length,
        allDiagnoses,
    };
}

// ─── 波段聚合 ────────────────────────────────────────────────────────────────

export interface WaveExecSummary {
    key:           string;    // `${season}-${wave}`
    season:        string;
    wave:          string;
    timeStatus:    ExecTimeStatus;
    launchDate:    string;
    daysToLaunch:  number;
    totalPlannedStyles:   number;
    totalDevelopedStyles: number;
    totalPricedStyles:    number;
    totalOrderedStyles:   number;
    totalPPA:      number;
    totalOA:       number;
    totalAA:       number;
    devRate:       number | null;
    pricingRate:   number | null;
    orderRate:     number | null;
    arrivalRate:   number | null;  // based on OA
    riskCount:     number;
    p0Count:       number;
    diagnoses:     ExecDiagnosis[];
}

export function calcWaveSummaries(rows: ExecutionTrackingRow[], businessDate: Date = BUSINESS_DATE): WaveExecSummary[] {
    const map = new Map<string, ExecutionTrackingRow[]>();
    for (const row of rows) {
        const key = `${row.season}-${row.wave}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row);
    }

    return Array.from(map.entries()).map(([key, wRows]) => {
        const first    = wRows[0];
        const ts       = resolveExecTimeStatus(first.launchDate, businessDate);
        const diagnoses = wRows
            .flatMap(r => diagnoseExecutionRow(r, businessDate))
            .sort((a, b) => {
                const p: Record<DiagPriority, number> = { P0: 0, P1: 1, P2: 2 };
                return p[a.priority] - p[b.priority];
            });

        const totalPPA  = wRows.reduce((s, r) => s + r.plannedPurchaseAmount, 0);
        const totalOA   = wRows.reduce((s, r) => s + r.orderedAmount, 0);
        const totalAA   = wRows.reduce((s, r) => s + r.arrivedAmount, 0);
        const totalPSC  = wRows.reduce((s, r) => s + r.plannedStyleCount, 0);
        const totalDSC  = wRows.reduce((s, r) => s + r.developedStyleCount, 0);
        const totalPriSC = wRows.reduce((s, r) => s + r.pricedStyleCount, 0);
        const totalOSC  = wRows.reduce((s, r) => s + r.orderedStyleCount, 0);

        return {
            key,
            season:        first.season,
            wave:          first.wave,
            timeStatus:    ts,
            launchDate:    first.launchDate,
            daysToLaunch:  first.daysToLaunch,
            totalPlannedStyles:   totalPSC,
            totalDevelopedStyles: totalDSC,
            totalPricedStyles:    totalPriSC,
            totalOrderedStyles:   totalOSC,
            totalPPA,
            totalOA,
            totalAA,
            devRate:       totalPSC > 0 ? totalDSC / totalPSC : null,
            pricingRate:   totalPSC > 0 ? totalPriSC / totalPSC : null,
            orderRate:     totalPSC > 0 ? totalOSC  / totalPSC : null,
            arrivalRate:   totalOA  > 0 ? totalAA   / totalOA  : null,
            riskCount:     diagnoses.length,
            p0Count:       diagnoses.filter(d => d.priority === 'P0').length,
            diagnoses,
        };
    });
}
