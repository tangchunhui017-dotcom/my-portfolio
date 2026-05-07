'use client';

import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { useClearancePace, type ClearanceRiskRow } from '@/hooks/useClearancePace';
import { useSizeHealthAnalysis, type SizeHealthSkuRiskRow } from '@/hooks/useSizeHealthAnalysis';

type ActionType = '补货' | '调拨' | '降折' | '清退' | '下季调整';
type Priority = 'P0' | 'P1' | 'P2';
type Severity = 'ok' | 'warn' | 'danger';

type KpisSnapshot = {
    avgSellThrough: number;
    wos: number;
    avgMarginRate: number;
    top10Concentration?: number;
    activeSKUs?: number;
    totalNetSales?: number;
    newGoodsShare?: number;
    fullPriceSellThrough?: number | null;
    categoryActual?: Record<string, { actual_sales: number; actual_sell_through: number; actual_margin_rate: number }>;
} | null;

type Props = {
    filters: DashboardFilters;
    compareMode: CompareMode;
    kpis?: KpisSnapshot;
    onJumpToPlanning?: () => void;
    onJumpToProduct?: () => void;
    onJumpToChannel?: () => void;
    onJumpToSkuRisk?: () => void;
};

interface ActionCommand {
    id: string;
    type: ActionType;
    priority: Priority;
    title: string;
    target: string;
    reason: string;
    action: string;
    impact: string;
    cta: string;
    onClick?: () => void;
}

interface DiagnosisItem {
    title: string;
    detail: string;
    severity: Severity;
}

const priorityRank: Record<Priority, number> = { P0: 3, P1: 2, P2: 1 };

const actionStyle: Record<ActionType, { badge: string; rail: string }> = {
    补货: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100', rail: 'bg-emerald-400' },
    调拨: { badge: 'bg-sky-50 text-sky-700 ring-sky-100', rail: 'bg-sky-400' },
    降折: { badge: 'bg-orange-50 text-orange-700 ring-orange-100', rail: 'bg-orange-400' },
    清退: { badge: 'bg-rose-50 text-rose-700 ring-rose-100', rail: 'bg-rose-500' },
    下季调整: { badge: 'bg-violet-50 text-violet-700 ring-violet-100', rail: 'bg-violet-400' },
};

const severityStyle: Record<Severity, { badge: string; label: string }> = {
    ok: { badge: 'bg-emerald-50 text-emerald-700', label: '正常' },
    warn: { badge: 'bg-amber-50 text-amber-700', label: '关注' },
    danger: { badge: 'bg-rose-50 text-rose-700', label: '预警' },
};

function fmtPct(value: number, digits = 1) {
    return `${(value * 100).toFixed(digits)}%`;
}

function fmtUnits(value: number) {
    return `${Math.round(value).toLocaleString('zh-CN')} 双`;
}

function fmtMoneyWan(value: number) {
    return `¥${(value / 10000).toFixed(1)}万`;
}

function buildPriorityBadge(priority: Priority) {
    if (priority === 'P0') return 'bg-rose-500 text-white';
    if (priority === 'P1') return 'bg-amber-400 text-amber-950';
    return 'bg-slate-100 text-slate-500';
}

function mapSizeReplenishmentAction(row: SizeHealthSkuRiskRow, onClick?: () => void): ActionCommand {
    const missingSizes = row.stockoutSizes.slice(0, 4).join('/') || '核心尺码';
    return {
        id: `size-replenish-${row.skuId}`,
        type: '补货',
        priority: row.priority,
        title: `补齐 ${missingSizes}`,
        target: `${row.category} · ${row.skuName}`,
        reason: `核心齐码率 ${fmtPct(row.fullSizeRate, 0)}，断码率 ${fmtPct(row.stockoutRate, 0)}，当前仍有 ${row.salesUnits.toLocaleString('zh-CN')} 双销量承接。`,
        action: row.action,
        impact: '减少核心码断码造成的销售损失，优先保高动销尺码。',
        cta: '查看 SKU 风险',
        onClick,
    };
}

function mapClearanceAction(row: ClearanceRiskRow, onClick?: () => void): ActionCommand {
    const isClearance = row.actionType === '整款清退' || row.actionType === '边缘码清退';
    const type: ActionType = row.actionType === '降折观察'
        ? '降折'
        : row.actionType === '渠道调拨'
            ? '调拨'
            : isClearance
                ? '清退'
                : '补货';

    return {
        id: `clearance-${row.skuId}-${row.actionType}`,
        type,
        priority: row.priority,
        title: row.actionType,
        target: `${row.category} · ${row.skuName}`,
        reason: `${row.reason} 当前库存 ${fmtUnits(row.onHandUnits)}，金额 ${fmtMoneyWan(row.inventoryAmount)}。`,
        action: row.action,
        impact: type === '清退'
            ? `释放库存占用 ${fmtMoneyWan(row.inventoryAmount)}`
            : type === '降折'
                ? '用两周窗口验证价格弹性，避免直接甩货。'
                : type === '调拨'
                    ? '把库存转到更高动销渠道，减少无效折扣。'
                    : '避免把可动销款误放入清货池。',
        cta: '查看 SKU 明细',
        onClick,
    };
}

function buildPlanningAction(kpis: KpisSnapshot, onClick?: () => void): ActionCommand | null {
    if (!kpis) return null;

    const lowNewGoods = (kpis.newGoodsShare ?? 0) > 0 && (kpis.newGoodsShare ?? 0) < 0.35;
    const highConcentration = (kpis.top10Concentration ?? 0) > 0.7;
    const lowMargin = kpis.avgMarginRate < 0.4;
    const lowFullPrice = kpis.fullPriceSellThrough !== null && kpis.fullPriceSellThrough !== undefined && kpis.fullPriceSellThrough < 0.58;

    if (!lowNewGoods && !highConcentration && !lowMargin && !lowFullPrice) return null;

    const reasonParts = [
        lowNewGoods ? `新品贡献 ${fmtPct(kpis.newGoodsShare ?? 0)}` : null,
        highConcentration ? `Top10 集中度 ${fmtPct(kpis.top10Concentration ?? 0, 0)}` : null,
        lowMargin ? `毛利率 ${fmtPct(kpis.avgMarginRate)}` : null,
        lowFullPrice ? `正价售罄 ${fmtPct(kpis.fullPriceSellThrough ?? 0)}` : null,
    ].filter(Boolean);

    return {
        id: 'next-season-planning',
        type: '下季调整',
        priority: lowMargin || highConcentration ? 'P1' : 'P2',
        title: '调整下季货盘结构',
        target: '品类 / 价格带 / 新老品结构',
        reason: reasonParts.join('，') || '当前结构存在可优化空间。',
        action: '减少低效长尾宽度，提高核心价带和高动销品类深度；复盘新品上市节奏和首单深度。',
        impact: '降低下季库存分散和低毛利风险。',
        cta: '去品类运营',
        onClick,
    };
}

function buildKpiDiagnosis(kpis: KpisSnapshot): DiagnosisItem[] {
    if (!kpis) {
        return [{ title: '经营诊断', detail: '暂无 KPI 数据，请调整筛选条件后重试。', severity: 'warn' }];
    }

    const items: DiagnosisItem[] = [];
    items.push({
        title: kpis.avgSellThrough >= 0.75 ? '售罄节奏可控' : '售罄节奏偏慢',
        detail: `当前累计售罄率 ${fmtPct(kpis.avgSellThrough)}，${kpis.avgSellThrough >= 0.75 ? '整体去化节奏可控。' : '需优先处理低售罄库存和清货池。'}`,
        severity: kpis.avgSellThrough >= 0.75 ? 'ok' : kpis.avgSellThrough >= 0.65 ? 'warn' : 'danger',
    });
    items.push({
        title: kpis.wos > 12 ? '库存积压' : kpis.wos < 4 ? '库存偏紧' : '库存周转正常',
        detail: `当前 WOS ${kpis.wos.toFixed(1)} 周，${kpis.wos > 12 ? '需要清退或调拨。' : kpis.wos < 4 ? '需要补货和防断码。' : '处于可控区间。'}`,
        severity: kpis.wos > 12 ? 'danger' : kpis.wos < 4 ? 'warn' : 'ok',
    });
    items.push({
        title: kpis.avgMarginRate < 0.4 ? '毛利承压' : '毛利结构稳定',
        detail: `当前毛利率 ${fmtPct(kpis.avgMarginRate)}，${kpis.avgMarginRate < 0.4 ? '降折和清退动作需要控制毛利底线。' : '可继续用结构优化提升利润质量。'}`,
        severity: kpis.avgMarginRate < 0.38 ? 'danger' : kpis.avgMarginRate < 0.4 ? 'warn' : 'ok',
    });
    return items;
}

function dedupeActions(actions: ActionCommand[]) {
    const seen = new Set<string>();
    return actions.filter((action) => {
        const key = `${action.type}-${action.target}-${action.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function buildFallbackAction(callbacks: Pick<Props, 'onJumpToPlanning'>): ActionCommand {
    return {
        id: 'fallback-planning',
        type: '下季调整',
        priority: 'P2',
        title: '维持周度复盘',
        target: '经营节奏',
        reason: '当前没有 P0/P1 高危动作，继续监控售罄、WOS、毛利和尺码完整度。',
        action: '保持现有补货节奏，周度复盘波段到货和清货池。',
        impact: '避免在健康状态下过度促销或过量补货。',
        cta: '去波段企划',
        onClick: callbacks.onJumpToPlanning,
    };
}

export default function DiagnosisActionPanel({
    filters,
    compareMode,
    kpis,
    onJumpToPlanning,
    onJumpToProduct,
    onJumpToChannel,
    onJumpToSkuRisk,
}: Props) {
    const { summary: sizeSummary } = useSizeHealthAnalysis(filters);
    const { summary: clearanceSummary } = useClearancePace(filters);

    const sizeActions = (sizeSummary?.riskRows ?? [])
        .filter((row) => row.riskLabels.includes('核心尺码断码'))
        .slice(0, 2)
        .map((row) => mapSizeReplenishmentAction(row, onJumpToSkuRisk));

    const clearanceActions = (clearanceSummary?.riskRows ?? [])
        .filter((row) => row.actionType !== '补码优先')
        .slice(0, 5)
        .map((row) => mapClearanceAction(row, row.actionType === '渠道调拨' ? onJumpToChannel : onJumpToSkuRisk));

    const planningAction = buildPlanningAction(kpis ?? null, onJumpToProduct);
    const actions = dedupeActions([
        ...sizeActions,
        ...clearanceActions,
        ...(planningAction ? [planningAction] : []),
    ])
        .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority])
        .slice(0, 5);
    const finalActions = actions.length ? actions : [buildFallbackAction({ onJumpToPlanning })];
    const diagnosisItems = buildKpiDiagnosis(kpis ?? null);
    const actionMix = (['补货', '调拨', '降折', '清退', '下季调整'] as ActionType[]).map((type) => ({
        type,
        count: finalActions.filter((item) => item.type === type).length,
    }));
    const p0Count = finalActions.filter((item) => item.priority === 'P0').length;
    const p1Count = finalActions.filter((item) => item.priority === 'P1').length;

    return (
        <section className="rounded-panel border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Action Command</div>
                    <h3 className="mt-1 text-[24px] font-semibold tracking-tight text-slate-900">行动闭环指挥台</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        把补货、调拨、降折、清退和下季企划调整统一成动作清单；当前对比模式：{compareMode === 'none' ? '无对比' : compareMode.toUpperCase()}。
                    </p>
                </div>
                <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                    <div className="rounded-2xl bg-rose-50 px-4 py-3 text-center text-rose-700">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">P0</div>
                        <div className="mt-1 text-2xl font-black">{p0Count}</div>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-amber-800">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">P1</div>
                        <div className="mt-1 text-2xl font-black">{p1Count}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-slate-600">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">动作</div>
                        <div className="mt-1 text-2xl font-black">{finalActions.length}</div>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
                <div className="space-y-3">
                    {finalActions.map((action, index) => {
                        const sty = actionStyle[action.type];
                        return (
                            <div key={action.id} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-indigo-100 hover:bg-white hover:shadow-md">
                                <div className={`absolute left-0 top-0 h-full w-1 ${sty.rail}`} />
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1 pl-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${buildPriorityBadge(action.priority)}`}>{action.priority}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${sty.badge}`}>{action.type}</span>
                                            <span className="text-[11px] font-semibold text-slate-400">#{index + 1}</span>
                                        </div>
                                        <div className="mt-2 text-base font-bold text-slate-900">{action.title}</div>
                                        <div className="mt-1 text-xs font-semibold text-slate-500">{action.target}</div>
                                        <div className="mt-2 text-[13px] leading-6 text-slate-600">{action.reason}</div>
                                        <div className="mt-2 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold leading-6 text-slate-800 ring-1 ring-slate-100">
                                            {action.action}
                                        </div>
                                        <div className="mt-2 text-[11px] font-medium text-slate-400">{action.impact}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={action.onClick}
                                        className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                    >
                                        {action.cta}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                        <h4 className="text-sm font-bold text-slate-800">动作结构</h4>
                        <div className="mt-3 space-y-2">
                            {actionMix.map((item) => (
                                <div key={item.type} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${actionStyle[item.type].badge}`}>{item.type}</span>
                                    <span className="text-xs font-black text-slate-700">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                        <h4 className="text-sm font-bold text-slate-800">诊断依据</h4>
                        <div className="mt-3 space-y-2.5">
                            {diagnosisItems.map((item) => {
                                const sty = severityStyle[item.severity];
                                return (
                                    <div key={item.title} className="rounded-xl bg-slate-50 px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-slate-800">{item.title}</span>
                                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${sty.badge}`}>{sty.label}</span>
                                        </div>
                                        <div className="mt-1 text-[11px] leading-5 text-slate-500">{item.detail}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
