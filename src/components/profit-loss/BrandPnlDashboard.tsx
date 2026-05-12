'use client';
/**
 * src/components/profit-loss/BrandPnlDashboard.tsx  V11
 * 损益决策中心 V11（精简 × 决策力 × 联动）
 * 12 Section 结构（14→12，合并冗余，新增4个）：
 * S0  决策摘要1屏卡（新）
 * S1  锚点导航
 * S2  年度总览（含鞋类专属）
 * S3  利润行动（闭环改造：完成/转交/撤销）
 * S4  预算归因（合并差异桥）
 * S5  P&L利润桥
 * S6  月度趋势+滚动12月预测（升级）
 * S6b 季节性P&L拆分（新）
 * S7  贡献分析（Tab化：合并渠道/品类/波段/价格带）
 * S7b 80/20核心款+分销P&L（新）
 * S8  折扣侵蚀
 * S9  现金流时点（合并现金联动）
 * S10 保本分析+What-if滑块
 * S11 DuPont+ROE拆解（新）
 * footer 跨模块联动入口（折叠，不占主列）
 * 单店模型 S12-S16：保留+新增DCF（第5视图）
 */
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { formatMoneyCny } from '@/config/numberFormat';
import brandAnnualRaw from '../../../data/planning/pnl_brand_annual.json';
import channelRaw from '../../../data/planning/pnl_channel_contribution.json';
import categoryRaw from '../../../data/planning/pnl_category_contribution.json';
import discountRaw from '../../../data/planning/pnl_discount_erosion.json';
import cashflowRaw from '../../../data/planning/pnl_cashflow_schedule.json';
import categoryRoleRaw from '../../../data/planning/pnl_category_role.json';
import pnlDecisionRaw from '../../../data/planning/pnl_decision_center.json';
import BudgetVarianceWaterfall from './BudgetVarianceWaterfall';
import CashflowGapChart from './CashflowGapChart';
import FootwearKpiRow from './FootwearKpiRow';
import DimensionDrillDown from './DimensionDrillDown';
import CompareModeSwitcher from './CompareModeSwitcher';
import type { CompareMode } from './CompareModeSwitcher';
import PnlAlertActionCenter from './PnlAlertActionCenter';
import PnlProfitBridge from './PnlProfitBridge';
import PnlContributionTabs from './PnlContributionTabs';
import PnlCashLinkage from './PnlCashLinkage';
// V11 新增组件
import PnlDecisionSummary from './PnlDecisionSummary';
import PnlActionCenterEnhanced from './PnlActionCenterEnhanced';
import RollingForecastChart from './RollingForecastChart';
import SeasonalPnlSplit from './SeasonalPnlSplit';
import ParetoPnlChart from './ParetoPnlChart';
import BreakEvenWhatIf from './BreakEvenWhatIf';
import DupontTree from './DupontTree';
import IndustryBenchmark from './IndustryBenchmark';
import type { PnlDecisionData } from '@/types/pnlDecisionTypes';

const brand = brandAnnualRaw as typeof brandAnnualRaw;
const channels = channelRaw as typeof channelRaw;
const categories = categoryRaw as typeof categoryRaw;
const discounts = discountRaw as typeof discountRaw;
const categoryRoles = categoryRoleRaw as typeof categoryRoleRaw;
const pnlDecision = pnlDecisionRaw as unknown as PnlDecisionData;

type ECharts = { setOption: (o: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => ECharts };

function useChart(ref: React.RefObject<HTMLDivElement | null>, buildOption: () => unknown, deps: unknown[]) {
    useEffect(() => {
        if (!ref.current) return;
        let chart: ECharts | null = null;
        const initChart = async () => {
            const ec = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = ec.init(ref.current);
            chart.setOption(buildOption() as object);
        };
        initChart();
        const obs = new ResizeObserver(() => chart?.resize());
        if (ref.current) obs.observe(ref.current);
        return () => { obs.disconnect(); chart?.dispose(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

function pct(v: number, signed = false) { const s = (v * 100).toFixed(1) + '%'; return signed && v > 0 ? '+' + s : s; }
function fmtCny(v: number) {
    const a = Math.abs(v); const s = v < 0 ? '-' : '';
    if (a >= 1e8) return s + '¥' + (a / 1e8).toFixed(2) + '亿';
    if (a >= 1e7) return s + '¥' + (a / 1e7).toFixed(1) + '千万';
    if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
    return s + formatMoneyCny(a);
}

function KpiCard({ label, value, sub, tone = 'neutral', badge, note }: {
    label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'neutral'; badge?: string; note?: string;
}) {
    const tc = { positive: 'text-emerald-600', negative: 'text-rose-600', warning: 'text-amber-600', neutral: 'text-slate-800' }[tone];
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 relative">
            {badge && <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 whitespace-nowrap">{badge}</span>}
            <div className="text-[10px] text-slate-400 mb-1">{label}</div>
            <div className={`text-base font-bold ${tc}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
            {note && <div className="text-[10px] text-slate-300 mt-0.5">{note}</div>}
        </div>
    );
}

function SectionHeader({ title, sub, anchor, badge }: { title: string; sub?: string; anchor: string; badge?: string }) {
    return (
        <div id={anchor} className="flex items-start gap-3 border-b border-slate-100 pb-3">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                    {badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">V11 新增</span>}
                </div>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// V11 精简后 12 个 Section（去除合并项，新增4个）
const SECTIONS = [
    { anchor: 'pnl-decision', label: '决策摘要' },
    { anchor: 'pnl-overview', label: '年度总览' },
    { anchor: 'pnl-actions', label: '利润行动' },
    { anchor: 'pnl-variance', label: '预算归因' },
    { anchor: 'pnl-bridge', label: '利润桥' },
    { anchor: 'pnl-monthly', label: '滚动预测' },
    { anchor: 'pnl-seasonal', label: '季节P&L' },
    { anchor: 'pnl-contribution', label: '贡献分析' },
    { anchor: 'pnl-pareto', label: '80/20' },
    { anchor: 'pnl-discount', label: '折扣侵蚀' },
    { anchor: 'pnl-cashflow', label: '现金流' },
    { anchor: 'pnl-breakeven', label: '保本分析' },
    { anchor: 'pnl-dupont', label: 'DuPont' },
];

// ── 导出菜单 ────────────────────────────────────────────────────────────────
function ExportMenu() {
    const [open, setOpen] = useState(false);
    const ba = brand.brandAnnual;
    const exportCsv = () => {
        const rows = [
            ['科目', '金额', '占净收入%'],
            ['净收入', ba.netRevenue, '100%'],
            ['毛利', ba.grossProfit, pct(ba.grossMarginRate)],
            ['EBIT', ba.ebit, pct(ba.ebitRate)],
            ['净利润', ba.netProfit, pct(ba.netProfitRate)],
        ];
        const csv = '\ufeff' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = '品牌年度P&L_V11.csv'; a.click();
        URL.revokeObjectURL(url); setOpen(false);
    };
    return (
        <div className="relative">
            <button onClick={() => setOpen(o => !o)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-colors font-medium flex items-center gap-1">
                📤 导出 <span className="text-[9px]">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20 min-w-[140px]">
                    <button onClick={exportCsv}
                        className="w-full px-3 py-2 text-[11px] text-left text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors flex items-center gap-2">
                        📊 Excel (CSV)
                    </button>
                    <button onClick={() => { window.print(); setOpen(false); }}
                        className="w-full px-3 py-2 text-[11px] text-left text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors flex items-center gap-2 border-t border-slate-50">
                        📄 PDF (打印)
                    </button>
                </div>
            )}
        </div>
    );
}

// ── S5 利润桥（瀑布图）──────────────────────────────────────────────────────
function WaterfallChart({ onBarClick }: { onBarClick?: (label: string, value: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const items = brand.waterfallItems;
    const buildOption = useCallback(() => {
        const names = items.map(d => d.label);
        const absValues = items.map(d => Math.abs(d.value));
        const colors = items.map(d => {
            if (d.type === 'total' || d.type === 'subtotal') return d.value >= 0 ? '#10b981' : '#f43f5e';
            return d.value >= 0 ? '#38bdf8' : '#fb923c';
        });
        return {
            tooltip: { trigger: 'axis', formatter: (p: Array<{ dataIndex: number }>) => {
                const idx = p[0]?.dataIndex ?? 0; const item = items[idx];
                return item ? `${item.label}<br/>¥${(item.value / 10000).toFixed(0)}万` : '';
            }},
            grid: { left: 12, right: 12, top: 20, bottom: 50, containLabel: true },
            xAxis: { type: 'category', data: names, axisLabel: { fontSize: 9, interval: 0, rotate: 28 } },
            yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 9 } },
            series: [{ type: 'bar', data: absValues.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })), barMaxWidth: 36, cursor: 'pointer',
                label: { show: true, position: 'top', fontSize: 8, formatter: (p: { dataIndex: number }) => {
                    const item = items[p.dataIndex]; if (!item) return '';
                    const sign = item.type === 'subtract' ? '-' : '';
                    return `${sign}${(Math.abs(item.value) / 10000).toFixed(0)}万`;
                }},
            }],
        };
    }, []);
    useEffect(() => {
        if (!ref.current) return;
        let chart: ECharts | null = null;
        const initChart = async () => {
            const ec = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = ec.init(ref.current);
            chart.setOption(buildOption() as object);
            if (onBarClick) {
                (chart as unknown as { on: (event: string, handler: (params: { dataIndex: number }) => void) => void })
                    .on('click', (p) => {
                        const item = items[p.dataIndex];
                        if (item) onBarClick(item.label, item.value);
                    });
            }
        };
        initChart();
        const obs = new ResizeObserver(() => chart?.resize());
        if (ref.current) obs.observe(ref.current);
        return () => { obs.disconnect(); chart?.dispose(); };
    }, [buildOption, onBarClick]);
    return <div ref={ref} style={{ height: 280 }} />;
}

// ── S6 渠道贡献（合并到贡献分析Tab后仍保留单独展示渠道跳转按钮）────────────
function ChannelDiagnosis({ onGoToStore }: { onGoToStore?: (channelKey: string) => void }) {
    const chList = channels.channels;
    return (
        <div className="space-y-3">
            {chList.map(ch => {
                const isHealthy = ch.contributionProfitRate >= 0.15;
                const isWarn = ch.contributionProfitRate >= 0.08;
                const bdr = isHealthy ? 'border-emerald-100 bg-emerald-50/30' : isWarn ? 'border-amber-100 bg-amber-50/30' : 'border-rose-100 bg-rose-50/30';
                const rateCls = isHealthy ? 'text-emerald-700 bg-emerald-100' : isWarn ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100';
                return (
                    <div key={ch.channel} className={`rounded-2xl border p-4 ${bdr}`}>
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                            <div>
                                <span className="font-bold text-slate-800 text-sm">{ch.label}</span>
                                <span className="ml-2 text-xs text-slate-400">净收入 {fmtCny(ch.netRevenue)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] px-2 py-1 rounded font-bold ${rateCls}`}>贡献利润率 {pct(ch.contributionProfitRate)}</span>
                                <span className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">{ch.action}</span>
                                {onGoToStore && (
                                    <button onClick={() => onGoToStore(ch.channel)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 transition-colors font-medium">
                                        → 单店验证
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] mb-2">
                            {[
                                { l: '净收入', v: fmtCny(ch.netRevenue) },
                                { l: '毛利率', v: pct(ch.grossMarginRate) },
                                { l: '贡献利润', v: fmtCny(ch.contributionProfit), bold: true },
                                { l: '退货率', v: pct(ch.returnRate), warn: ch.returnRate > 0.10 },
                                { l: '折扣率', v: pct(ch.discountRate), warn: ch.discountRate > 0.25 },
                                { l: '库存周转', v: ch.inventoryTurnover + '×' },
                            ].map(k => (
                                <div key={k.l} className="bg-white/70 rounded-lg px-2 py-1.5 text-center">
                                    <div className="text-[10px] text-slate-400">{k.l}</div>
                                    <div className={`font-${k.bold ? 'bold' : 'medium'} ${k.warn ? 'text-rose-600' : 'text-slate-700'} mt-0.5`}>{k.v}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-500">{ch.verdict}</p>
                    </div>
                );
            })}
        </div>
    );
}

// ── S8 折扣侵蚀 ────────────────────────────────────────────────────────────
const LY_EROSION: Record<string, number> = {
    full_price: 0.62, campaign_discount: 0.027, clearance: 0.035,
    coupon_member: 0.018, return_refund: 0.041, inventory_markdown: 0.024,
};

function DiscountErosion() {
    const { summary, erosionBreakdown, actionPlan } = discounts;
    const handleJumpToOtb = (anchor: string) => {
        const tabBtn = document.querySelector('[data-tab-key="otb"]') as HTMLButtonElement | null;
        if (tabBtn) tabBtn.click();
        setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 200);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { l: '吊牌GMV', v: fmtCny(summary.tagPriceSales) },
                    { l: '净收入', v: fmtCny(summary.actualNetRevenue) },
                    { l: '综合侵蚀率', v: pct(summary.erosionRate), tone: 'warning' as const },
                    { l: '正价销售占比', v: pct(summary.fullPriceShareActual), tone: (summary.fullPriceShareActual >= summary.fullPriceShareTarget ? 'positive' : 'warning') as 'positive' | 'warning' },
                ].map(k => <KpiCard key={k.l} label={k.l} value={k.v} tone={k.tone} />)}
            </div>
            <div className="space-y-2">
                {erosionBreakdown.map(e => {
                    const amount = e.isErosion ? (e.erosionAmount ?? e.markdownLoss ?? 0) : 0;
                    const isHighRisk = e.isErosion && (e.erosionRate ?? 0) > 0.03;
                    const currentRate = e.erosionRate ?? e.salesShare ?? 0;
                    const lyRate = LY_EROSION[e.type] ?? currentRate;
                    const yoyDelta = currentRate - lyRate;
                    const yoyWorse = yoyDelta > 0.005;
                    const yoyBetter = yoyDelta < -0.005;
                    return (
                        <div key={e.type} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${isHighRisk ? 'border-rose-100 bg-rose-50/40' : e.isErosion ? 'border-amber-100 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30'}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-semibold text-xs text-slate-800">{e.label}</span>
                                    {e.isErosion && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isHighRisk ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        侵蚀 {e.erosionRate ? pct(e.erosionRate) : e.salesShare ? pct(e.salesShare) : ''}
                                    </span>}
                                </div>
                                <p className="text-[11px] text-slate-500 mb-1.5">{e.verdict}</p>
                                <div className="flex items-center gap-2 text-[10px]">
                                    <span className="text-slate-400 w-12">vs LY</span>
                                    <div className="flex-1 max-w-[180px] flex items-center gap-1">
                                        <div className="relative flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${Math.min(100, lyRate * 1500)}%` }} />
                                        </div>
                                        <span className="text-slate-400 w-10 text-right">LY {pct(lyRate)}</span>
                                    </div>
                                    <span className={`font-medium ${yoyWorse ? 'text-rose-600' : yoyBetter ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {yoyDelta > 0 ? '+' : ''}{pct(yoyDelta)}
                                    </span>
                                </div>
                            </div>
                            {amount > 0 && <span className="text-sm font-bold text-rose-600 shrink-0">-{fmtCny(amount)}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 text-xs font-semibold text-slate-600 flex items-center justify-between">
                    <span>📋 优先改善行动</span>
                    <span className="text-[10px] text-slate-400">点击 → 跳转 OTB 工作台</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {actionPlan.map(a => (
                        <div key={a.priority} className="flex items-start gap-3 px-4 py-3">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{a.priority}</span>
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-slate-700">{a.issue}</span>
                                <p className="text-[11px] text-slate-500">→ {a.action}</p>
                            </div>
                            <button onClick={() => handleJumpToOtb('otb_budget')}
                                className="text-[10px] px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 transition-colors shrink-0">
                                → OTB
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── P&L 明细表 ────────────────────────────────────────────────────────────
function PnlDetailTable({ open }: { open: boolean }) {
    if (!open) return null;
    const ba = brand.brandAnnual;
    const rows = [
        { name: '吊牌GMV', v: ba.tagPriceSales, indent: 0 },
        { name: '  - 折扣折让', v: -ba.discountDeduction, indent: 1 },
        { name: '  - 退货退款', v: -ba.returnRefund, indent: 1 },
        { name: '净收入', v: ba.netRevenue, indent: 0, bold: true },
        { name: '  - 商品成本 COGS', v: -ba.cogs, indent: 1 },
        { name: '  - 入仓/头程物流', v: -ba.warehouseInboundLogistics, indent: 1 },
        { name: '毛利', v: ba.grossProfit, indent: 0, bold: true },
        { name: '  - 平台/商场扣点', v: -(ba.platformDeduction + ba.mallDeduction), indent: 1 },
        { name: '  - 营销投放', v: -ba.marketingSpend, indent: 1 },
        { name: '  - 门店租金', v: -ba.storeRent, indent: 1 },
        { name: '  - 人工费用', v: -ba.laborCost, indent: 1 },
        { name: '  - 仓配物流', v: -ba.warehouseDistribution, indent: 1 },
        { name: '  - 装修摊销', v: -ba.fitoutAmortization, indent: 1 },
        { name: '  - 管理费用', v: -ba.adminExpense, indent: 1 },
        { name: '  - 库存跌价/清货损失', v: -(ba.inventoryImpairment + ba.clearanceLoss), indent: 1 },
        { name: 'EBIT', v: ba.ebit, indent: 0, bold: true },
        { name: '  - 所得税', v: -ba.incomeTax, indent: 1 },
        { name: '净利润', v: ba.netProfit, indent: 0, bold: true },
    ];
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-slate-700">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        {['科目', '金额', '占净收入%'].map(h => (
                            <th key={h} className={`py-2 px-4 font-medium text-slate-500 ${h === '科目' ? 'text-left' : 'text-right'}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className={`py-2 px-4 ${row.bold ? 'font-bold text-slate-900' : 'text-slate-600'}`} style={{ paddingLeft: `${16 + row.indent * 16}px` }}>{row.name}</td>
                            <td className={`text-right py-2 px-4 ${row.bold ? 'font-bold' : ''} ${row.v >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{fmtCny(row.v)}</td>
                            <td className="text-right py-2 px-4 text-slate-400">{brand.brandAnnual.netRevenue > 0 ? pct(row.v / brand.brandAnnual.netRevenue) : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
interface Props {
    onGoToStore?: (channelKey: string) => void;
}

export default function BrandPnlDashboard({ onGoToStore }: Props) {
    const [detailOpen, setDetailOpen] = useState(false);
    const [compareMode, setCompareMode] = useState<CompareMode>('actual');
    const [drillItem, setDrillItem] = useState<{ label: string; value: number } | null>(null);
    const [activeAnchor, setActiveAnchor] = useState('pnl-decision');
    const [footerOpen, setFooterOpen] = useState(false);

    const handleNavigate = (module: string) => {
        const tabBtn = document.querySelector(`[data-tab-key="${module}"]`) as HTMLButtonElement | null;
        if (tabBtn) tabBtn.click();
    };

    const handleScrollTo = (anchor: string) => {
        const el = document.getElementById(anchor);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            el.classList.add('ring-2', 'ring-sky-400', 'ring-offset-2');
            setTimeout(() => el.classList.remove('ring-2', 'ring-sky-400', 'ring-offset-2'), 1500);
        }
    };

    // IntersectionObserver — 锚点高亮
    useEffect(() => {
        const obs = new IntersectionObserver(
            entries => { entries.forEach(e => { if (e.isIntersecting) setActiveAnchor(e.target.id); }); },
            { rootMargin: '-40% 0px -55% 0px' }
        );
        SECTIONS.forEach(s => { const el = document.getElementById(s.anchor); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, []);

    const ba = brand.brandAnnual;
    const riskCls = ba.riskLevel === 'high' ? 'bg-rose-50 border-rose-200 text-rose-700' : ba.riskLevel === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700';

    return (
        <div className="space-y-6">
            {/* 锚点导航 + 导出 + 对比模式 */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 -mx-1 px-1 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-1 flex-wrap flex-1">
                        {SECTIONS.map(s => (
                            <a key={s.anchor} href={`#${s.anchor}`}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                    activeAnchor === s.anchor
                                        ? 'bg-sky-500 text-white shadow-sm'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600'
                                }`}>
                                {s.label}
                            </a>
                        ))}
                    </div>
                    <CompareModeSwitcher mode={compareMode} onChange={setCompareMode} />
                    <ExportMenu />
                </div>
            </div>

            {/* S0 决策摘要1屏卡 */}
            <div id="pnl-decision">
                <PnlDecisionSummary onScrollTo={handleScrollTo} />
            </div>

            {/* S2 年度利润总览 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-overview" title="年度利润总览" sub="财务结果 / 预算差异 / 鞋类专属 — 三排KPI" />
                <div className={`rounded-xl border px-4 py-2.5 text-xs flex items-center gap-2 ${riskCls}`}>
                    {ba.riskLevel === 'medium' ? '⚠️' : ba.riskLevel === 'high' ? '🔴' : '✅'}
                    <span className="font-semibold">风险等级: {ba.riskLevel === 'medium' ? '中等' : ba.riskLevel === 'high' ? '高风险' : '正常'}</span>
                    <span className="opacity-70">· 净收入超预算 {fmtCny(ba.budgetVarianceNetRevenue)}，净利润低于预算 {fmtCny(Math.abs(ba.budgetVarianceNetProfit))}</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-0.5">财务结果</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <KpiCard label="吊牌GMV" value={fmtCny(ba.tagPriceSales)} sub="折前销售" />
                    <KpiCard label="净收入" value={fmtCny(ba.netRevenue)} sub="折扣+退货后" />
                    <KpiCard label="毛利率" value={pct(ba.grossMarginRate)} tone={ba.grossMarginRate >= 0.47 ? 'positive' : 'warning'} sub={fmtCny(ba.grossProfit)} />
                    <KpiCard label="EBIT率" value={pct(ba.ebitRate)} tone={ba.ebitRate >= 0.07 ? 'positive' : 'warning'} sub={fmtCny(ba.ebit)} />
                    <KpiCard label="净利率" value={pct(ba.netProfitRate)} tone={ba.netProfitRate >= 0.05 ? 'positive' : 'warning'} sub={fmtCny(ba.netProfit)} />
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-0.5 mt-1">预算差异</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiCard label="正价占比" value={pct(brand.priceStructure.fullPrice.salesShare)} tone={brand.priceStructure.fullPrice.salesShare >= 0.60 ? 'positive' : 'warning'} sub="目标 65%" />
                    <KpiCard label="库存跌价" value={fmtCny(ba.inventoryImpairment)} tone="negative" sub="含清货损失" />
                    <KpiCard label="净收入 vs 预算" value={ba.budgetVarianceNetRevenue >= 0 ? '+' + fmtCny(ba.budgetVarianceNetRevenue) : fmtCny(ba.budgetVarianceNetRevenue)} tone={ba.budgetVarianceNetRevenue >= 0 ? 'positive' : 'negative'} />
                    <KpiCard label="净利润 vs 预算" value={ba.budgetVarianceNetProfit >= 0 ? '+' + fmtCny(ba.budgetVarianceNetProfit) : fmtCny(ba.budgetVarianceNetProfit)} tone={ba.budgetVarianceNetProfit >= 0 ? 'positive' : 'negative'} />
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-0.5 mt-1">鞋类专属</div>
                <FootwearKpiRow />
            </div>

            {/* S3 利润行动（闭环改造版）*/}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-actions" title="利润行动中心" sub="完成/转交/撤销闭环 · 进度追踪 · 累计指标 · AI建议生成" badge="V11" />
                <PnlActionCenterEnhanced onNavigate={handleNavigate} />
                {/* 旧版预警中心（标签区分，折叠默认显示新版）*/}
                <details className="group">
                    <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                        + 查看旧版预警行动中心（状态过滤）
                    </summary>
                    <div className="mt-2">
                        <PnlAlertActionCenter actions={pnlDecision.alertActions} onNavigate={handleNavigate} />
                    </div>
                </details>
            </div>

            {/* S4 预算归因（合并差异桥）*/}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-variance" title="预算归因（含差异桥）" sub="预算净利润 → 收入偏差 → 费用超支 → 实际净利润 · 利润差异因子正负分解" />
                <BudgetVarianceWaterfall />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="text-xs font-semibold text-slate-600 mb-3">利润差异桥（计划 vs 实际）</div>
                    <PnlProfitBridge bridge={pnlDecision.profitBridge} />
                </div>
            </div>

            {/* S5 P&L利润桥 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-bridge" title="P&L 利润桥" sub="吊牌GMV → 净收入 → 毛利 → EBIT → 净利润 · 点击柱子查看拆解" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <WaterfallChart onBarClick={(label, value) => setDrillItem({ label, value })} />
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setDetailOpen(o => !o)}>
                        <span>📋 展开 P&L 明细表</span><span>{detailOpen ? '▲' : '▼'}</span>
                    </button>
                    <PnlDetailTable open={detailOpen} />
                </div>
            </div>

            {/* S6 月度趋势 → 升级为滚动12月预测 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-monthly" title="月度趋势 + 滚动12月预测" sub="历史实线 + 未来预测虚线 + 置信区间 · 全年预测摘要" badge="V11" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <RollingForecastChart />
                </div>
            </div>

            {/* S6b 季节性P&L拆分（新增）*/}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-seasonal" title="季节性 P&L 拆分" sub="春夏（3-8月）vs 秋冬（9-2月）损益对比 · 毛利率差异归因" badge="V11" />
                <SeasonalPnlSplit />
            </div>

            {/* S7 贡献分析（Tab化：合并渠道/品类/波段/价格带）*/}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-contribution" title="经营贡献分析" sub="波段 / 价格带 / 品类 / 渠道 — Tab切换 · 合并原渠道/品类诊断 Section" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <PnlContributionTabs waveContribution={pnlDecision.waveContribution} priceBandContribution={pnlDecision.priceBandContribution} />
                </div>
                <details className="group">
                    <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                        + 展开详细渠道/品类诊断（含单店模型跳转）
                    </summary>
                    <div className="mt-2">
                        <ChannelDiagnosis onGoToStore={onGoToStore} />
                    </div>
                </details>
            </div>

            {/* S7b 80/20核心款 + 分销P&L（新增）*/}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-pareto" title="80/20 核心款 + 分销结构 P&L" sub="Top 20% SKU 贡献 80%+ 利润 · 直营/加盟/经销/电商分销对比" badge="V11" />
                <ParetoPnlChart />
            </div>

            {/* S8 折扣侵蚀 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-discount" title="折扣与清货侵蚀" sub="正价/活动/清货/优惠券/退货/库存跌价 六维度 + LY对比 + OTB联动" />
                <DiscountErosion />
            </div>

            {/* S9 现金流时点（合并现金联动）*/}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-cashflow" title="现金流时点（含损益联动）" sub="月度销售收款 vs 采购/费用付款 · 现金缺口 · DSO/DPO/CCC · 账面利润vs现金流差异" />
                <CashflowGapChart />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="text-xs font-semibold text-slate-600 mb-3">账面利润 vs 经营现金流联动</div>
                    <PnlCashLinkage linkage={pnlDecision.cashPnlLinkage} onNavigate={handleNavigate} />
                </div>
            </div>

            {/* S10 保本分析 + What-if滑块 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-breakeven" title="保本分析 + What-if 滑块" sub="5因子实时调节（毛利率/折扣率/客单价/营销费用率/租金）→ 实时看保本额+净利率变化" badge="V11" />
                <BreakEvenWhatIf />
            </div>

            {/* S11 DuPont + ROE拆解（新增）+ 行业对标雷达 */}
            <div className="space-y-3">
                <SectionHeader anchor="pnl-dupont" title="DuPont + ROE 拆解" sub="ROE = 净利率 × 资产周转率 × 权益乘数 · 三张卡拆解 + 行业对标（安踏/特步/李宁）" badge="V11" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <DupontTree />
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <IndustryBenchmark />
                    </div>
                </div>
            </div>

            {/* Footer: 跨模块联动（折叠，不占主列）*/}
            <div className="border-t border-slate-100 pt-4">
                <button onClick={() => setFooterOpen(o => !o)}
                    className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 transition-colors px-1">
                    <span className="font-semibold">🔗 跨模块联动入口</span>
                    <span>{footerOpen ? '▲ 收起' : '▼ 展开（6个关联模块）'}</span>
                </button>
                {footerOpen && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
                        {pnlDecision.relatedModules.map(mod => (
                            <button key={mod.id} onClick={() => handleNavigate(mod.id)}
                                className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left">
                                <span className="text-base">{mod.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate">{mod.label}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{mod.relationship}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 利润桥钻取弹窗 */}
            {drillItem && (
                <DimensionDrillDown itemLabel={drillItem.label} itemValue={drillItem.value} onClose={() => setDrillItem(null)} />
            )}
        </div>
    );
}
