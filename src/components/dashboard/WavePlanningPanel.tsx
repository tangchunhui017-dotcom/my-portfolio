'use client';
import MerchSectionDivider from './MerchSectionDivider';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { buildMerchModuleLinks } from '@/config/dashboard/merch-module-links';
/**
 * WavePlanningPanel.tsx — V7.0 波段企划决策工作台（鞋类专版）
 * 三层布局：L1决策层 → L2验证层 → L3钻取层
 * 新增：尺码深度结构 / 配色策略 / 退货率预估 / 温层错位检测 / 4条鞋类风险规则 / 历史同期对比
 */

import { useMemo, useState, useCallback } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useWavePlanning, type WaveSummary } from '@/hooks/useWavePlanning';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { formatMoneyCny } from '@/config/numberFormat';
import wavePlanMasterRaw from '../../../data/planning/wave_plan_master.json';
import wavePlanBriefRaw from '../../../data/planning/wave_plan_brief.json';
import waveDevProgressRaw from '../../../data/planning/wave_development_progress.json';
import sizeCurvesRaw from '../../../data/otb/footwear_size_curves.json';
import colorwayRulesRaw from '../../../data/otb/colorway_strategy_rules.json';
import returnRatesRaw from '../../../data/otb/return_rate_benchmarks.json';
import temperatureWindowsRaw from '../../../data/otb/temperature_windows.json';
import {
    calcSizeDepthHealth, calcColorwayBalance, estimateReturnImpact,
    checkTemperatureWindow, generateWaveDecisionActions, generateFootwearRisks,
    type FootwearSizeCurve, type ColorwayEntry, type ChannelMix,
    type ReturnRateBenchmark, type TemperatureWindow, type WaveSnapshot,
    type DecisionAction, type FootwearRisk,
} from '@/utils/wavePlanningV7';

// ── Types ───────────────────────────────────────────────────────────────────

interface WaveMasterRecord {
    waveKey: string; wave: string; waveRole: string; waveRoleLabel: string;
    launchDate: string; plannedStyleCount: number; targetColorCount: number;
    targetSkuCount: number; averageDepth: number; newProductRatio: number;
    repeatOrderRatio: number; carryoverRatio: number; sellThroughTarget: number;
    planSalesAmount: number; lySalesAmount?: number; momSalesAmount?: number;
    salesRatio: number; planOtbBudget: number;
    orderDeadline: string; warehouseDeadline: string; mainCategoryList: string[];
    priceBandFocus: string[]; productRoleFocus: string[]; arrivalSuggestion: string;
    status: string; promotion: string;
}

interface WaveBriefRecord {
    waveKey: string; consumerScene: string; targetAudience: string;
    channelFocus: string; designTheme: string; colorStrategy: string;
    materialFocus: string; marketingMoment: string; coreSizeRange: string;
    planningNotes: string;
}

interface DevTask {
    taskType: string; label: string; deadline: string;
    status: 'done' | 'in_progress' | 'at_risk' | 'pending';
    progress: number; owner: string; riskNote?: string;
}

interface WaveDevProgress { waveKey: string; tasks: DevTask[]; }

interface WavePlanningPanelProps {
    defaultView?: string; lockView?: boolean; compareMode?: CompareMode;
    filters?: DashboardFilters; onJumpToChannel?: () => void;
    onJumpToOtb?: () => void; onJumpToSkuRisk?: () => void;
    onJumpToExecution?: () => void; onJumpToForecast?: () => void;
    onJumpToInventory?: () => void; onJumpToCashflow?: () => void;
    onJumpToProfitLoss?: () => void; onJumpToCategory?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) { return `${(v * 100).toFixed(1)}%`; }
function fmtDate(v: string) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '--';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtMD(v: string) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '--/--';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
function safeDiv(n: number, d: number) { return d > 0 ? n / d : 0; }
function daysTo(dateStr: string, today: Date) {
    return Math.floor((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

const ROLE_LABEL: Record<string, string> = {
    traffic:'引流', testing:'试销', main_sales:'主销', repeat:'翻单', clearance:'清尾',
};
const PRICE_BAND_LABEL: Record<string, string> = {
    entry:'入门价', volume:'走量价', profit:'利润价', image:'形象价',
};
const PRODUCT_ROLE_LABEL: Record<string, string> = {
    hero:'Hero 主推形象', main:'Core 核心走量', basic:'Basic 基础款',
    test:'Test 测试款', repeat:'Repeat 翻单款', clearance:'Clearance 清尾款',
};

type WaveStatus = '已上市'|'当前执行'|'待上市'|'未来企划'|'异常延期';

function resolveWaveStatus(launchDate: string, skuPlan: number, skuActual: number, today: Date): WaveStatus {
    const days = daysTo(launchDate, today);
    const lr = safeDiv(skuActual, skuPlan);
    if (days < -30 && skuPlan > 0 && lr < 0.8) return '异常延期';
    if (days < -30) return '已上市';
    if (days <= 14) return '当前执行';
    if (days <= 90) return '待上市';
    return '未来企划';
}

const STATUS_CFG: Record<WaveStatus, { dot: string; badge: string; text: string }> = {
    '已上市':   { dot:'bg-slate-400',   badge:'bg-slate-100 text-slate-600',    text:'text-slate-500' },
    '当前执行': { dot:'bg-sky-500',     badge:'bg-sky-100 text-sky-700',        text:'text-sky-700'   },
    '待上市':   { dot:'bg-emerald-500', badge:'bg-emerald-100 text-emerald-700',text:'text-emerald-700'},
    '未来企划': { dot:'bg-slate-300',   badge:'bg-slate-50 text-slate-500',     text:'text-slate-400' },
    '异常延期': { dot:'bg-rose-500',    badge:'bg-rose-100 text-rose-700',      text:'text-rose-700'  },
};

function getAutoWaveId(waves: WaveSummary[], today: Date) {
    if (!waves.length) return '';
    const sorted = [...waves].sort((a,b)=>new Date(a.launch_date).getTime()-new Date(b.launch_date).getTime());
    let current = sorted[0];
    for (const w of sorted) { if (new Date(w.launch_date).getTime()<=today.getTime()) current=w; else break; }
    return current.id;
}
function waveLabel(w: WaveSummary) { return `${w.season.replace(/^\d{4}-/,'')}-${w.wave}`; }

// Season → temperature tier color
const SEASON_TEMP_COLOR: Record<string, string> = {
    SS:'bg-sky-200', AW:'bg-amber-200',
};
function seasonTempBand(waveKey: string) {
    const m = waveKey.match(/-([A-Z]+)-/);
    if (!m) return 'bg-slate-200';
    return SEASON_TEMP_COLOR[m[1]] ?? 'bg-slate-200';
}
function seasonLabel(waveKey: string) {
    const m = waveKey.match(/-([A-Z]+)-/);
    if (!m) return '';
    return m[1]==='SS'?'春夏':m[1]==='AW'?'秋冬':'';
}

// ── Atom Components ──────────────────────────────────────────────────────────

function Chip({ label, color='slate' }: { label: string; color?: 'sky'|'emerald'|'amber'|'rose'|'slate'|'violet' }) {
    const cls: Record<string,string> = {
        sky:'bg-sky-50 text-sky-700 border-sky-200',
        emerald:'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber:'bg-amber-50 text-amber-700 border-amber-200',
        rose:'bg-rose-50 text-rose-700 border-rose-200',
        slate:'bg-slate-100 text-slate-600 border-slate-200',
        violet:'bg-violet-50 text-violet-700 border-violet-200',
    };
    return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls[color]}`}>{label}</span>;
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-[11px] text-slate-400 shrink-0 w-24">{label}</span>
            <span className="text-[11px] font-medium text-slate-800 flex-1 leading-snug">{value}</span>
        </div>
    );
}

function KpiTile({ label, value, sub, warn }: { label:string; value:string; sub?:string; warn?:boolean }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="text-[10px] text-slate-400 mb-1">{label}</div>
            <div className={`text-sm font-bold leading-tight ${warn?'text-amber-700':'text-slate-800'}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sub}</div>}
        </div>
    );
}

function CollapsibleSection({ title, subtitle, open, onToggle, children }: {
    title: string; subtitle?: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button type="button" onClick={onToggle}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors">
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm text-slate-900">{title}</span>
                    {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${open?'rotate-180':''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="border-t border-slate-100">{children}</div>}
        </div>
    );
}

// ── L1-① Header ──────────────────────────────────────────────────────────────

function PageHeader({ activeWave, autoWaveId, riskActions, footwearRisks, onJumpToOtb }: {
    activeWave: WaveSummary; autoWaveId: string;
    riskActions: Array<{priority:string}>;
    footwearRisks: FootwearRisk[];
    onJumpToOtb?: () => void;
}) {
    const p0Count = riskActions.filter(r=>r.priority==='P0').length + footwearRisks.filter(r=>r.priority==='P0').length;
    const decisions = riskActions.filter(r=>r.priority==='P0'||r.priority==='P1').length;
    return (
        <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-1 h-5 bg-slate-900 rounded-full" />
                        <h2 className="text-base font-bold text-slate-900">波段企划决策工作台</h2>
                        <span className="text-[10px] text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full hidden sm:inline">WAVE PLANNING V7</span>
                        {decisions > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                                {decisions} 项待决策
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 ml-3">
                        data/planning/ · 鞋类专版 · 当前执行：{activeWave.season.replace(/^\d{4}-/,'')}-{activeWave.wave}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Chip label={`OTB ${activeWave.otb_budget>0?'已同步':'未生成'}`} color={activeWave.otb_budget>0?'emerald':'amber'} />
                    {p0Count>0 && <Chip label={`P0 ×${p0Count}`} color="rose" />}
                    {onJumpToOtb && <button onClick={onJumpToOtb} className="text-[11px] text-sky-600 hover:underline">→ OTB 预算</button>}
                    <a href="#" className="text-[11px] text-slate-400 hover:text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg">查看 SOP</a>
                </div>
            </div>
        </div>
    );
}

// ── L1-② Wave Timeline (with season temp band) ───────────────────────────────

function WaveTimeline({ waves, masterMap, activeId, autoId, today, onSelect }: {
    waves: WaveSummary[]; masterMap: Map<string,WaveMasterRecord>;
    activeId: string; autoId: string; today: Date;
    onSelect: (id: string) => void;
}) {
    const sorted = [...waves].sort((a,b)=>new Date(a.launch_date).getTime()-new Date(b.launch_date).getTime());
    const activeIdx = Math.max(0, sorted.findIndex(w=>w.id===activeId));
    const [hoveredId, setHoveredId] = useState<string|null>(null);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">波段流转时间线</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">业务日期 {fmtDate(today.toISOString())} · 点击切换 · hover 查看详情</p>
                </div>
                <div className="hidden md:flex items-center gap-3 flex-wrap">
                    {(Object.entries(STATUS_CFG) as [WaveStatus, typeof STATUS_CFG[WaveStatus]][]).map(([s,c])=>(
                        <span key={s} className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <span className={`w-2 h-2 rounded-full ${c.dot}`}/>{s}
                        </span>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <div className="min-w-max">
                    <div className="flex gap-2">
                        {sorted.map(w => {
                            const master = masterMap.get(w.id);
                            const status = resolveWaveStatus(w.launch_date, w.sku_plan, w.sku_actual, today);
                            const sc = STATUS_CFG[status];
                            const isActive = w.id===activeId;
                            const isAuto = w.id===autoId;
                            const hovered = hoveredId===w.id;
                            const tempBand = seasonTempBand(w.id);
                            const sl = seasonLabel(w.id);
                            return (
                                <div key={w.id} className="relative" onMouseEnter={()=>setHoveredId(w.id)} onMouseLeave={()=>setHoveredId(null)}>
                                    <button type="button" onClick={()=>onSelect(w.id)}
                                        className={`flex flex-col items-center rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all min-w-[84px] ${
                                            isActive?'border-slate-900 bg-slate-900 text-white shadow-sm'
                                            :`border-slate-200 bg-white ${sc.text} hover:border-slate-300`
                                        } ${isAuto&&!isActive?'ring-1 ring-sky-400':''}`}>
                                        <span className={isActive?'text-white font-bold':'text-slate-800 font-bold'}>
                                            {w.season.replace(/^\d{4}-/,'')}-{w.wave}
                                        </span>
                                        <span className={`text-[9px] mt-0.5 ${isActive?'text-slate-300':sc.text}`}>
                                            {master?.waveRoleLabel ?? ROLE_LABEL[master?.waveRole??''] ?? ''}
                                        </span>
                                        {sl && <span className={`mt-1 px-1.5 py-0.5 rounded text-[8px] ${tempBand} text-slate-600`}>{sl}</span>}
                                    </button>
                                    {hovered && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-[11px]">
                                            <div className="font-bold text-slate-800 mb-1">{w.season}-{w.wave}</div>
                                            <div className="text-slate-500">角色：{master?.waveRoleLabel ?? '--'}</div>
                                            <div className="text-slate-500">上市：{fmtDate(w.launch_date)}</div>
                                            <div className="text-slate-500">SKU：{master?.targetSkuCount ?? w.sku_plan}</div>
                                            {master && <div className="text-slate-500">销售占比目标：{fmt(master.salesRatio)}</div>}
                                            <div className="text-slate-400 mt-1 text-[10px]">点击切换查看详情</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="relative mt-3">
                        <div className="absolute left-0 right-0 top-[6px] h-px bg-slate-200" />
                        <div className="absolute left-0 top-[6px] h-px bg-slate-900 transition-all"
                            style={{ width: sorted.length>1 ? `${(activeIdx/(sorted.length-1))*100}%` : '0%' }} />
                        <div className="flex gap-2">
                            {sorted.map(w => {
                                const status = resolveWaveStatus(w.launch_date, w.sku_plan, w.sku_actual, today);
                                const sc = STATUS_CFG[status];
                                const isActive = w.id===activeId;
                                return (
                                    <button key={`${w.id}-dot`} type="button" onClick={()=>onSelect(w.id)}
                                        className="flex flex-col items-center min-w-[84px]">
                                        <span className={`relative z-10 w-3 h-3 rounded-full border-2 ${isActive?'border-slate-900 bg-slate-900':`border-white ${sc.dot}`}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── L1-③ Decision Summary (3×4 grid with R3 action cards) ───────────────────

type DecisionPreviewType = 'reorder'|'cut'|'addColor'|'syncDownstream'|null;

function DecisionActionCard({ action, onPreview }: {
    action: DecisionAction; onPreview: (type: DecisionPreviewType) => void;
}) {
    const urgencyStyle: Record<string,string> = {
        P0:'border-rose-200 bg-rose-50 hover:bg-rose-100',
        P1:'border-amber-200 bg-amber-50 hover:bg-amber-100',
        P2:'border-slate-200 bg-slate-50 hover:bg-slate-100',
    };
    const iconMap: Record<string, string> = {
        reorder:'🔴', cut:'🔴', addColor:'🟡', syncDownstream:'🟢',
    };
    return (
        <button type="button" onClick={()=>onPreview(action.type as DecisionPreviewType)}
            className={`w-full text-left rounded-xl border px-3 py-3 text-[11px] transition-colors ${urgencyStyle[action.urgency]??urgencyStyle.P2}`}>
            <div className="flex items-center gap-1.5 mb-1">
                <span>{iconMap[action.type]??'⚪'}</span>
                <span className="font-bold text-slate-800">{action.label}</span>
                <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${action.urgency==='P0'?'bg-rose-500 text-white':action.urgency==='P1'?'bg-amber-500 text-white':'bg-slate-200 text-slate-600'}`}>
                    {action.urgency}
                </span>
            </div>
            <div className="text-slate-600 leading-snug">{action.summary}</div>
            <div className="text-slate-500 mt-1.5 text-[10px]">→ {action.recommendation}</div>
            {action.impactSku && <div className="text-slate-400 text-[10px] mt-0.5">影响 SKU：{action.impactSku}</div>}
            {action.impactAmount && <div className="text-slate-400 text-[10px]">影响金额：{formatMoneyCny(action.impactAmount)}</div>}
            <div className="text-sky-600 text-[10px] mt-1.5 font-medium">点击查看影响预览 →</div>
        </button>
    );
}

function DecisionPreviewPanel({ type, action, onClose, onJumpToOtb }: {
    type: DecisionPreviewType; action: DecisionAction|null; onClose: () => void; onJumpToOtb?: ()=>void;
}) {
    if (!type || !action) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-[90%] p-6" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900">{action.label} — 影响预览</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">×</button>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-lg bg-slate-50 border p-3">
                        <div className="font-semibold mb-1">当前状态</div>
                        <div className="text-slate-600">{action.summary}</div>
                    </div>
                    <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
                        <div className="font-semibold mb-1 text-sky-800">建议操作</div>
                        <div className="text-sky-700">{action.recommendation}</div>
                    </div>
                    {(action.impactSku||action.impactAmount) && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                            <div className="font-semibold mb-1 text-amber-800">影响预估</div>
                            {action.impactSku && <div className="text-amber-700">· SKU 变化：约 {action.impactSku} 个</div>}
                            {action.impactAmount && <div className="text-amber-700">· 金额变化：约 {formatMoneyCny(action.impactAmount)}</div>}
                        </div>
                    )}
                </div>
                <div className="flex gap-2 mt-5">
                    {type==='syncDownstream' && onJumpToOtb && (
                        <button onClick={onJumpToOtb} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">前往 OTB 工作台</button>
                    )}
                    <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">关闭</button>
                </div>
            </div>
        </div>
    );
}

function DecisionSummaryV7({ wave, master, today, decisions, onJumpToOtb }: {
    wave: WaveSummary; master: WaveMasterRecord|undefined; today: Date;
    decisions: ReturnType<typeof generateWaveDecisionActions>; onJumpToOtb?: ()=>void;
}) {
    const [preview, setPreview] = useState<DecisionPreviewType>(null);
    const previewAction = preview
        ? (preview==='reorder'?decisions.reorder:preview==='cut'?decisions.cut:preview==='addColor'?decisions.addColor:decisions.syncDownstream)
        : null;

    const days = daysTo(wave.launch_date, today);
    const daysLabel = days>0?`距上市 ${days} 天`:days===0?'今日上市':`已上市 ${Math.abs(days)} 天`;
    const status = resolveWaveStatus(wave.launch_date, wave.sku_plan, wave.sku_actual, today);
    const sc = STATUS_CFG[status];
    const landingRate = safeDiv(wave.sku_actual, wave.sku_plan);
    const daysToOrder = master?.orderDeadline ? daysTo(master.orderDeadline, today) : null;
    const daysToWarehouse = master?.warehouseDeadline ? daysTo(master.warehouseDeadline, today) : null;

    const r3Cards = [decisions.reorder, decisions.cut, decisions.addColor, decisions.syncDownstream].filter(Boolean) as DecisionAction[];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{waveLabel(wave)} · 波段决策摘要</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.badge}`}>{status}</span>
                        {master && <span className="text-[10px] text-slate-500">{master.waveRoleLabel}</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">上市：{fmtDate(wave.launch_date)} · {daysLabel}</p>
                </div>
            </div>

            {/* R1: 现状 */}
            <div className="mb-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">R1 · 现状</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <KpiTile label="OTB 预算（计划）" value={master?formatMoneyCny(master.planOtbBudget):'--'} sub={wave.otb_budget>0?`已同步 ${formatMoneyCny(wave.otb_budget)}`:'未生成'} warn={wave.otb_budget===0} />
                    <KpiTile label="计划款数 / SKU" value={`${master?.plannedStyleCount??'--'} / ${master?.targetSkuCount??wave.sku_plan}`} sub={master?`深度 ${master.averageDepth} 双/款`:undefined} />
                    <KpiTile label="加权毛利率" value={wave.avg_gm_rate>0?fmt(wave.avg_gm_rate):'--'} sub="已销波段" />
                    <KpiTile label="目标售罄 / 到货率" value={master?`${fmt(master.sellThroughTarget)} / --`:'--'} />
                </div>
            </div>

            {/* R2: 风险 */}
            <div className="mb-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">R2 · 风险</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <KpiTile
                        label="下单节点"
                        value={daysToOrder!==null ? (daysToOrder<0?`已过期 ${Math.abs(daysToOrder)}天`:`还有 ${daysToOrder}天`) : '--'}
                        warn={daysToOrder!==null && daysToOrder<7}
                    />
                    <KpiTile
                        label="入仓节点"
                        value={daysToWarehouse!==null ? (daysToWarehouse<0?`已过期 ${Math.abs(daysToWarehouse)}天`:`还有 ${daysToWarehouse}天`) : '--'}
                        warn={daysToWarehouse!==null && daysToWarehouse<7}
                    />
                    <KpiTile
                        label="SKU 落地率"
                        value={wave.sku_plan>0?fmt(landingRate):'--'}
                        warn={landingRate<0.80&&wave.sku_plan>0&&days<30}
                        sub={`${wave.sku_actual}/${wave.sku_plan} 款`}
                    />
                    <KpiTile
                        label="新品占比"
                        value={fmt(wave.new_ratio)}
                        warn={wave.new_ratio<0.50}
                        sub={wave.new_ratio<0.50?'⚠ 低于 50%':undefined}
                    />
                </div>
            </div>

            {/* R3: 决策行动 */}
            <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">R3 · 决策行动</div>
                {r3Cards.length===0 ? (
                    <div className="text-[11px] text-emerald-600 py-2">✓ 当前波段无待处理决策项</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {r3Cards.map(a=><DecisionActionCard key={a.type} action={a} onPreview={setPreview} />)}
                    </div>
                )}
            </div>

            {master && (
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 pt-3 mt-3 border-t border-slate-50">
                    <span>📦 下单截止：<strong className="text-slate-700">{fmtDate(master.orderDeadline)}</strong></span>
                    <span>🏭 入仓截止：<strong className="text-slate-700">{fmtDate(master.warehouseDeadline)}</strong></span>
                    <span>🚀 上市日：<strong className="text-slate-700">{fmtDate(wave.launch_date)}</strong></span>
                </div>
            )}

            {preview && previewAction && (
                <DecisionPreviewPanel type={preview} action={previewAction} onClose={()=>setPreview(null)} onJumpToOtb={onJumpToOtb} />
            )}
        </div>
    );
}
// ── L1-⑪ Footwear Risk Action Board ─────────────────────────────────────────

function FootwearRiskBoard({ generalRisks, footwearRisks, onJumpToExecution }: {
    generalRisks: Array<{id:string;priority:'P0'|'P1'|'P2';wave:string;reason:string;impact:string;action:string;owner:string;deadline:string}>;
    footwearRisks: FootwearRisk[];
    onJumpToExecution?: () => void;
}) {
    const allRisks = [
        ...generalRisks.map(r=>({ id:r.id, priority:r.priority, badge:'general' as const, title:`${r.wave} · ${r.reason}`, detail:r.impact, action:r.action, owner:r.owner })),
        ...footwearRisks.map(r=>({ id:r.id, priority:r.priority, badge:r.category, title:r.title, detail:r.detail, action:r.action, owner:'商品企划' })),
    ];
    const byP = { P0: allRisks.filter(r=>r.priority==='P0'), P1: allRisks.filter(r=>r.priority==='P1'), P2: allRisks.filter(r=>r.priority==='P2') };
    const categoryLabel: Record<string,string> = { size:'尺码', colorway:'配色', return:'退货', temperature:'温层', general:'通用' };
    const categoryColor: Record<string,string> = { size:'bg-violet-100 text-violet-700', colorway:'bg-pink-100 text-pink-700', return:'bg-amber-100 text-amber-700', temperature:'bg-sky-100 text-sky-700', general:'bg-slate-100 text-slate-600' };

    if (!allRisks.length) return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionTitle title="风险行动板" sub="P0 立即 · P1 本周 · P2 建议 · 含4条鞋类专属规则" />
            <div className="text-xs text-emerald-600 py-4 text-center">✓ 暂无风险项</div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">风险行动板</h3>
                <div className="flex items-center gap-2 text-[10px]">
                    {byP.P0.length>0 && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">P0 × {byP.P0.length}</span>}
                    {byP.P1.length>0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">P1 × {byP.P1.length}</span>}
                    {byP.P2.length>0 && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">P2 × {byP.P2.length}</span>}
                    {onJumpToExecution && <button onClick={onJumpToExecution} className="text-sky-600 hover:underline ml-2">→ 执行看板</button>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['P0','P1','P2'] as const).map(p=>(
                    <div key={p}>
                        <div className={`text-[11px] font-semibold pb-1.5 mb-2 border-b ${p==='P0'?'text-rose-600 border-rose-100':p==='P1'?'text-amber-600 border-amber-100':'text-slate-500 border-slate-100'}`}>
                            {p==='P0'?'P0 · 立即处理':p==='P1'?'P1 · 本周处理':'P2 · 观察建议'}
                        </div>
                        {byP[p].length===0
                            ? <div className="text-[11px] text-emerald-600">✓ 无风险项</div>
                            : byP[p].map(r=>(
                                <div key={r.id} className={`rounded-xl border p-3 mb-2 text-[11px] ${p==='P0'?'border-rose-200 bg-rose-50':p==='P1'?'border-amber-200 bg-amber-50':'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${categoryColor[r.badge]??categoryColor.general}`}>{categoryLabel[r.badge]??r.badge}</span>
                                        <span className="font-semibold text-slate-700 leading-snug">{r.title}</span>
                                    </div>
                                    <div className="text-slate-600 mb-1 leading-snug">{r.detail}</div>
                                    <div className="text-sky-700 font-medium text-[10px]">→ {r.action}</div>
                                    {r.owner && <div className="text-slate-400 text-[10px] mt-0.5">@{r.owner}</div>}
                                </div>
                            ))
                        }
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── L2-④ Planning Brief ───────────────────────────────────────────────────────

function PlanningBriefV7({ brief, master }: { brief: WaveBriefRecord|undefined; master: WaveMasterRecord|undefined }) {
    const [expanded, setExpanded] = useState(false);
    if (!brief) return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionTitle title="波段企划 Brief" sub="为什么 / 给谁 / 怎么打" />
            <p className="text-xs text-slate-400">暂无 Brief 数据</p>
        </div>
    );
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <SectionTitle title="波段企划 Brief" sub="3段叙事 · 为什么/给谁/怎么打" />
                <button onClick={()=>setExpanded(v=>!v)} className="text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg">
                    {expanded?'折叠':'展开完整 Brief'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
                    <div className="text-base mb-2">🎯</div>
                    <div className="text-[11px] font-bold text-sky-800 mb-2">为什么要做这波</div>
                    <div className="text-[11px] text-sky-700 leading-snug line-clamp-3">{brief.consumerScene}</div>
                    {brief.marketingMoment && <div className="text-[11px] text-sky-600 mt-2 leading-snug">营销节点：{brief.marketingMoment}</div>}
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                    <div className="text-base mb-2">👟</div>
                    <div className="text-[11px] font-bold text-emerald-800 mb-2">给谁做</div>
                    <div className="text-[11px] text-emerald-700 leading-snug line-clamp-3">{brief.targetAudience}</div>
                    <div className="text-[11px] text-emerald-600 mt-2">渠道：{brief.channelFocus}</div>
                </div>
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                    <div className="text-base mb-2">🎨</div>
                    <div className="text-[11px] font-bold text-violet-800 mb-2">怎么打</div>
                    <div className="text-[11px] text-violet-700 leading-snug line-clamp-3">{brief.designTheme}</div>
                    <div className="text-[11px] text-violet-600 mt-2">{brief.colorStrategy}</div>
                </div>
            </div>
            {expanded && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 pt-4 border-t border-slate-100">
                    <div>
                        <InfoRow label="材质重点" value={brief.materialFocus} />
                        <InfoRow label="核心尺码段" value={brief.coreSizeRange} />
                        {master && <InfoRow label="价格策略" value={(master.priceBandFocus??[]).map(p=>PRICE_BAND_LABEL[p]??p).join(' → ')} />}
                        {master && <InfoRow label="产品角色" value={(master.productRoleFocus??[]).map(r=>PRODUCT_ROLE_LABEL[r]??r).join(' + ')} />}
                    </div>
                    {brief.planningNotes && (
                        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-800">
                            📋 <strong>企划备注：</strong>{brief.planningNotes}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── L2-⑤ SKU Structure + Size Depth + Colorway + Return Rate ─────────────────

type SizeCurveData = FootwearSizeCurve;
type ReturnRateData = ReturnRateBenchmark;

function SizeDepthChart({ sizeHealth }: { sizeHealth: ReturnType<typeof calcSizeDepthHealth> }) {
    const option = useMemo((): EChartsOption => ({
        animationDuration: 400,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 32, right: 16, top: 12, bottom: 36 },
        xAxis: {
            type: 'category',
            data: sizeHealth.plans.map(p=>p.size),
            axisLabel: { color: '#64748B', fontSize: 11 },
        },
        yAxis: {
            type: 'value',
            name: '件数',
            nameTextStyle: { color: '#64748B', fontSize: 11 },
            axisLabel: { color: '#64748B', fontSize: 11 },
            splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
        },
        series: [{
            type: 'bar',
            barMaxWidth: 32,
            data: sizeHealth.plans.map(p=>({
                value: p.planQuantity,
                itemStyle: {
                    color: p.tier==='core' ? '#3B82F6' : p.tier==='extended' ? '#94A3B8' : '#FCA5A5',
                    borderRadius: [4,4,0,0],
                },
            })),
        }],
    }), [sizeHealth]);

    return (
        <div>
            <div className="flex items-center gap-4 mb-2 text-[10px]">
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1" />核心尺码</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400 mr-1" />延伸尺码</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-300 mr-1" />边缘尺码</span>
            </div>
            <ReactECharts option={option} style={{ height: 180 }} notMerge />
            {sizeHealth.warnings.map((w,i)=>(
                <div key={i} className="mt-1 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1">⚠ {w}</div>
            ))}
        </div>
    );
}

function ColorwayDonut({ balance }: { balance: ReturnType<typeof calcColorwayBalance> }) {
    const data = [
        { value: Math.round(balance.basicPct*100),   name: `基础色 ${Math.round(balance.basicPct*100)}%`,   itemStyle:{ color: balance.basicHealthy?'#94A3B8':'#FCA5A5' } },
        { value: Math.round(balance.heroPct*100),    name: `主推色 ${Math.round(balance.heroPct*100)}%`,    itemStyle:{ color: balance.heroHealthy?'#3B82F6':'#FCA5A5' } },
        { value: Math.round(balance.limitedPct*100), name: `限量色 ${Math.round(balance.limitedPct*100)}%`, itemStyle:{ color: balance.limitedHealthy?'#A855F7':'#FCA5A5' } },
    ].filter(d=>d.value>0);

    const option = useMemo((): EChartsOption => ({
        animationDuration: 400,
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { color: '#64748B', fontSize: 10 } },
        series: [{ type: 'pie', radius: ['50%','80%'], data, label: { show: false }, emphasis: { scale: false } }],
    }), [data]);

    return (
        <div>
            <ReactECharts option={option} style={{ height: 160 }} notMerge />
            {balance.warnings.map((w,i)=>(
                <div key={i} className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1">⚠ {w}</div>
            ))}
        </div>
    );
}

function SkuStructureV7({ wave, master, brief, sizeCurves, returnRates }: {
    wave: WaveSummary; master: WaveMasterRecord|undefined; brief: WaveBriefRecord|undefined;
    sizeCurves: SizeCurveData[]; returnRates: ReturnRateData[];
}) {
    const [sizeType, setSizeType] = useState('mens_sport');
    const selectedCurve = sizeCurves.find(c=>c.type===sizeType) ?? sizeCurves[0];

    const sizeHealth = useMemo(()=>{
        if (!selectedCurve) return null;
        const depth = master?.averageDepth ?? 6;
        const plans = selectedCurve.sizes.map(s=>({ size:s.size, quantity:Math.round(s.weight*(master?.targetSkuCount??50)*depth) }));
        return calcSizeDepthHealth(selectedCurve, plans);
    }, [selectedCurve, master]);

    // Dummy colorways based on master data
    const colorways: ColorwayEntry[] = useMemo(()=>{
        const skus = master?.targetSkuCount ?? 30;
        return [
            { tier:'basic', name:'经典配色', skuCount: Math.round(skus*0.45) },
            { tier:'hero',  name:'主推配色', skuCount: Math.round(skus*0.40) },
            { tier:'limited', name:'限量配色', skuCount: Math.round(skus*0.15) },
        ];
    }, [master]);

    const colorBalance = useMemo(()=>calcColorwayBalance(colorways), [colorways]);

    // Dummy channel mix for return rate
    const channelMix: ChannelMix[] = [
        { channel:'ecom_sport', label:'电商-运动', revenuePct:0.55 },
        { channel:'retail_sport', label:'实体-运动', revenuePct:0.35 },
        { channel:'wholesale', label:'批发', revenuePct:0.10 },
    ];
    const returnImpact = useMemo(()=>estimateReturnImpact(channelMix, returnRates, master?.planSalesAmount??0), [returnRates, master]);

    const styleCount = master?.plannedStyleCount ?? wave.drill_rows.length;
    const colorCount = master?.targetColorCount ?? 2;
    const skuCount = master?.targetSkuCount ?? wave.sku_plan;
    const depth = master?.averageDepth ?? 0;
    const buyUnits = skuCount * depth;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionTitle title="款色 SKU 结构" sub="计划款数 · 色数配置 · 尺码深度 · 配色策略 · 退货率预估" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
                {[
                    { label:'计划款数', value:String(styleCount), sub:'全波段合计' },
                    { label:'平均色数', value:`${colorCount} 色/款`, sub:'目标配色深度' },
                    { label:'目标SKU', value:String(skuCount), sub:`款数 × 色数` },
                    { label:'平均深度', value:depth>0?`${depth.toLocaleString()} 双/款`:'--', sub:'单款铺货量' },
                    { label:'计划买货量', value:buyUnits>0?`${(buyUnits/10000).toFixed(1)} 万双`:'--', sub:'SKU × 深度' },
                    { label:'核心尺码段', value:brief?.coreSizeRange??'--', sub:'重点备货' },
                ].map(it=>(
                    <div key={it.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] text-slate-400 mb-1">{it.label}</div>
                        <div className="text-sm font-bold text-slate-800 leading-tight">{it.value}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{it.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                {/* Size depth chart */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-semibold text-slate-700">🔥 尺码深度结构</div>
                        <select value={sizeType} onChange={e=>setSizeType(e.target.value)}
                            className="text-[10px] border border-slate-200 rounded px-2 py-0.5 bg-white text-slate-600">
                            {sizeCurves.map(c=><option key={c.type} value={c.type}>{c.label}</option>)}
                        </select>
                    </div>
                    {sizeHealth ? <SizeDepthChart sizeHealth={sizeHealth} /> : <div className="text-xs text-slate-400 py-4 text-center">无尺码数据</div>}
                </div>
                {/* Colorway donut */}
                <div>
                    <div className="text-[11px] font-semibold text-slate-700 mb-2">🎨 配色策略分布</div>
                    <ColorwayDonut balance={colorBalance} />
                </div>
            </div>

            {/* New/old ratio bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                    <span>新品 / 延续 / 翻单结构</span>
                    <span className="text-slate-400">{fmt(wave.new_ratio)} · {fmt(master?.carryoverRatio??0)} · {fmt(master?.repeatOrderRatio??0)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-100 flex">
                    <div className="bg-sky-500" style={{ width:`${wave.new_ratio*100}%` }} />
                    <div className="bg-slate-300" style={{ width:`${(master?.carryoverRatio??0)*100}%` }} />
                    <div className="bg-amber-400" style={{ width:`${(master?.repeatOrderRatio??0)*100}%` }} />
                </div>
            </div>

            {/* Return rate row */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-[11px]">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-slate-700">📦 退货率预估</span>
                    <span className={`font-bold ${returnImpact.highRisk?'text-rose-600':'text-emerald-600'}`}>
                        加权退货率 {(returnImpact.weightedReturnRate*100).toFixed(1)}%
                    </span>
                    {returnImpact.highRisk && <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-medium">⚠ 高风险</span>}
                </div>
                <div className="flex flex-wrap gap-3 text-slate-600">
                    {returnImpact.channelDetails.map(c=>(
                        <span key={c.channel}>{c.label} {(c.pct*100).toFixed(0)}%渠道 × {(c.returnRate*100).toFixed(0)}%退货</span>
                    ))}
                </div>
                {master && master.planSalesAmount>0 && (
                    <div className="mt-1 text-slate-500">
                        预计退货损失：<strong className={returnImpact.highRisk?'text-rose-600':'text-slate-700'}>{formatMoneyCny(returnImpact.estimatedReturnRevenueLoss)}</strong>
                        ，净销售额约 {(returnImpact.netRevenuePct*100).toFixed(0)}%
                    </div>
                )}
            </div>
        </div>
    );
}

// ── L2-⑥ Category Matrix ──────────────────────────────────────────────────────

type MatrixView = 'category_price'|'category_role';

function resolvePlanningRole(suggestion?: string): string {
    const t = suggestion ?? '';
    if (/清货|降价|奥莱/.test(t)) return 'Clearance';
    if (/测试|试销|控补货/.test(t)) return 'Test';
    if (/主推|补货加深度|加深度|防断码/.test(t)) return 'Hero/Core';
    return 'Basic';
}

function CategoryMatrix({ wave, view, onViewChange }: {
    wave: WaveSummary; view: MatrixView; onViewChange: (v: MatrixView) => void;
}) {
    const { rows, cols, cells } = useMemo(()=>{
        const catRows = Array.from(new Set(wave.drill_rows.map(r=>r.category)));
        if (view==='category_price') {
            const priceRows = Array.from(new Set(wave.drill_rows.map(r=>r.price_band)));
            const c: Record<string,Record<string,number>> = {};
            wave.drill_rows.forEach(r=>{ if(!c[r.category])c[r.category]={}; c[r.category][r.price_band]=(c[r.category][r.price_band]||0)+1; });
            return { rows:catRows, cols:priceRows, cells:c };
        }
        const roleRows = ['Hero/Core','Basic','Test','Clearance'];
        const c: Record<string,Record<string,number>> = {};
        wave.drill_rows.forEach(r=>{ const role=resolvePlanningRole(r.suggestion); if(!c[r.category])c[r.category]={}; c[r.category][role]=(c[r.category][role]||0)+1; });
        return { rows:catRows, cols:roleRows, cells:c };
    }, [wave, view]);

    if (!wave.drill_rows.length) return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionTitle title="品类结构矩阵" />
            <p className="text-xs text-slate-400 text-center py-6">暂无款式数据</p>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <SectionTitle title="品类结构矩阵" sub={`${waveLabel(wave)} · 款数分布`} />
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                    {(['category_price','category_role'] as const).map(v=>(
                        <button key={v} onClick={()=>onViewChange(v)}
                            className={`px-2.5 py-1 rounded-md transition-colors ${view===v?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                            {v==='category_price'?'品类×价格带':'品类×货品角色'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left py-2 px-3 font-medium text-slate-500">品类</th>
                            {cols.map(c=><th key={c} className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">{c}</th>)}
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">合计</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(cat=>{
                            const total = cols.reduce((s,c)=>s+(cells[cat]?.[c]||0),0);
                            return (
                                <tr key={cat} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{cat}</td>
                                    {cols.map(c=>{
                                        const n = cells[cat]?.[c]||0;
                                        const pct2 = total>0?n/total:0;
                                        const intense = pct2>0.40?'bg-blue-100':pct2>0.20?'bg-blue-50':'';
                                        return (
                                            <td key={c} className={`text-right py-2 px-3 ${intense}`}>
                                                {n>0?<span><span className="font-medium text-slate-700">{n}</span><span className="text-slate-400 text-[10px] ml-1">({fmt(pct2)})</span></span>:<span className="text-slate-200">—</span>}
                                            </td>
                                        );
                                    })}
                                    <td className="text-right py-2 px-3 font-bold text-slate-700">{total}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-slate-50 border-t border-slate-200">
                            <td className="py-2 px-3 font-semibold text-slate-600">合计</td>
                            {cols.map(c=>{ const n=rows.reduce((s,r)=>s+(cells[r]?.[c]||0),0); return <td key={c} className="text-right py-2 px-3 font-semibold text-slate-600">{n||'—'}</td>; })}
                            <td className="text-right py-2 px-3 font-bold text-slate-800">{wave.drill_rows.length}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── L2-⑩ Dev Progress Gate ────────────────────────────────────────────────────

const TASK_SC = {
    done:        { bar:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-200', label:'已完成' },
    in_progress: { bar:'bg-sky-500',     badge:'bg-sky-50 text-sky-700 border-sky-200',             label:'进行中' },
    at_risk:     { bar:'bg-rose-500',    badge:'bg-rose-50 text-rose-700 border-rose-200',          label:'风险'   },
    pending:     { bar:'bg-slate-300',   badge:'bg-slate-50 text-slate-500 border-slate-200',       label:'待启动' },
};

const STANDARD_GATES = [
    { type:'brief',     label:'企划 Brief' },
    { type:'design',    label:'设计评审' },
    { type:'sample',    label:'样品评审' },
    { type:'fitting',   label:'试穿测试' },  // 鞋类专属
    { type:'costing',   label:'核价确认' },
    { type:'order',     label:'下单' },
    { type:'warehouse', label:'入仓' },
    { type:'launch',    label:'上市' },
];

function DevProgressGate({ waveKey, devProgressMap, onJumpToExecution }: {
    waveKey: string; devProgressMap: Map<string,WaveDevProgress>; onJumpToExecution?: ()=>void;
}) {
    const devData = devProgressMap.get(waveKey);
    const tasks = devData?.tasks ?? [];
    const doneCount = tasks.filter(t=>t.status==='done').length;
    const atRiskTasks = tasks.filter(t=>t.status==='at_risk');
    const coreDone = ['brief','design','sample','fitting','costing'].every(type=>tasks.find(dt=>dt.taskType===type)?.status==='done');

    const today = new Date();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">开发进度闸口</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        企划→设计→样品→<strong className="text-slate-600">试穿测试</strong>→核价→下单→入仓→上市
                        {tasks.length>0 && ` · ${doneCount}/${tasks.length} 完成`}
                        {coreDone && <span className="ml-2 text-emerald-600 font-medium">· ✓ 可下单</span>}
                        {atRiskTasks.length>0 && <span className="ml-2 text-rose-600 font-medium">· ⚠ {atRiskTasks.length} 风险</span>}
                    </p>
                </div>
                {onJumpToExecution && (
                    <button onClick={onJumpToExecution} className="text-[11px] text-sky-600 hover:underline">→ 执行看板</button>
                )}
            </div>
            {tasks.length===0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">暂无开发进度数据</div>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {STANDARD_GATES.map((gate, idx)=>{
                        const task = tasks.find(t=>t.taskType===gate.type);
                        const sc = task ? TASK_SC[task.status] : TASK_SC.pending;
                        const daysLeft = task?.deadline ? daysTo(task.deadline, today) : null;
                        const isFitting = gate.type==='fitting';
                        return (
                            <div key={gate.type} className="flex items-center">
                                {idx>0 && <div className="w-3 h-px bg-slate-200 mx-0.5" />}
                                <button type="button" onClick={onJumpToExecution}
                                    className={`rounded-xl border px-3 py-2 text-[11px] transition-all min-w-[76px] ${sc.badge} ${isFitting?'ring-1 ring-violet-400':''} ${onJumpToExecution?'hover:opacity-80 cursor-pointer':'cursor-default'}`}>
                                    <div className="font-semibold">{gate.label}{isFitting?' 👟':''}</div>
                                    {task?.deadline && <div className="text-[10px] mt-0.5 opacity-70">{task.deadline.slice(5).replace('-','/')}</div>}
                                    {daysLeft!==null && daysLeft<0 && task?.status!=='done' && (
                                        <div className="text-[9px] text-rose-600 font-medium">逾期 {Math.abs(daysLeft)}天</div>
                                    )}
                                    {task && (
                                        <div className="mt-1 h-1 rounded-full bg-white/60 overflow-hidden">
                                            <div className={`h-full rounded-full ${sc.bar}`} style={{ width:`${task.progress}%` }} />
                                        </div>
                                    )}
                                    <div className="text-[9px] mt-0.5 opacity-60">{sc.label}</div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            {atRiskTasks.map(t=>(
                <div key={t.taskType} className="mt-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-[11px] text-rose-700">
                    ⚠ <strong>{t.label}</strong> 存在风险{t.riskNote?` — ${t.riskNote}`:''}<span className="text-slate-500 ml-1">（{t.owner}）</span>
                </div>
            ))}
        </div>
    );
}

// ── L2-⑧ Temperature + Window Band ────────────────────────────────────────────

const MONTH_TEMPS_CHART: Record<string,number[]> = {
    '华南':[14,17,21,26,28,30,31,31,29,26,21,15],
    '华东':[6,9,13,19,24,27,30,30,26,21,14,8],
    '华北':[-1,2,8,16,22,27,29,28,23,16,7,0],
    '西南':[9,12,16,21,22,24,25,25,22,19,14,9],
    '东北':[-13,-9,0,10,18,23,25,24,17,9,-1,-10],
    '全国':[3,6,11,18,23,27,29,28,23,17,9,4],
};

function TemperatureWindowChart({ stackRows, regionTempRows, regionSeriesMap, regionOptions, tempWindows, mainCategories }: {
    stackRows: ReturnType<typeof useWavePlanning>['stackRows'];
    regionTempRows: ReturnType<typeof useWavePlanning>['regionTempRows'];
    regionSeriesMap: ReturnType<typeof useWavePlanning>['regionSeriesMap'];
    regionOptions: ReturnType<typeof useWavePlanning>['regionOptions'];
    tempWindows: TemperatureWindow[];
    mainCategories: string[];
}) {
    const [selectedRegion, setSelectedRegion] = useState(()=>regionOptions[0]??'');
    const activeRegion = regionOptions.includes(selectedRegion)?selectedRegion:(regionOptions[0]??'');
    const regionCells = regionSeriesMap[activeRegion] ?? [];
    const regionMeta = regionTempRows.find(r=>r.region===activeRegion);

    // temperature checks for main categories in each wave
    const tempChecks = useMemo(()=>{
        const temps = MONTH_TEMPS_CHART[activeRegion] ?? MONTH_TEMPS_CHART['全国'];
        return stackRows.map(r=>{
            const launchMonth = new Date(r.launch_label.includes('-')?r.launch_label:`2026-${r.launch_label}`).getMonth()+1;
            const avgTemp = temps[launchMonth-1]??15;
            const checks = checkTemperatureWindow(launchMonth, activeRegion, tempWindows, mainCategories);
            return { waveId:r.wave_id, waveLabel:r.wave_label, avgTemp, checks };
        });
    }, [stackRows, activeRegion, tempWindows, mainCategories]);

    const option = useMemo((): EChartsOption => {
        const labels = stackRows.map(r=>`${r.launch_label}\n${r.wave_label}`);
        const cellMap = new Map(regionCells.map(c=>[c.wave_id, c]));
        const barData = stackRows.map(r=>({
            value:r.launch_window_days,
            waveId:r.wave_id,
            status: cellMap.get(r.wave_id)?.status ?? '匹配',
        }));
        const temps = MONTH_TEMPS_CHART[activeRegion] ?? MONTH_TEMPS_CHART['全国'];
        const tempLine = stackRows.map(r=>{
            const m = new Date(r.launch_label.includes('-')?r.launch_label:`2026-${r.launch_label}`).getMonth();
            return temps[m] ?? r.temp_narrative;
        });
        return {
            animationDuration: 400,
            tooltip: { trigger:'axis', axisPointer:{ type:'shadow' } },
            grid: { left:46, right:46, top:34, bottom:48 },
            xAxis: { type:'category', data:labels, axisLabel:{ color:'#64748B', fontSize:10, lineHeight:14 }, axisLine:{ lineStyle:{ color:'#E5E7EB' } }, axisTick:{ alignWithLabel:true } },
            yAxis: [
                { type:'value', name:'上市窗口(天)', nameTextStyle:{ color:'#64748B', fontSize:11 }, axisLabel:{ color:'#64748B', fontSize:11 }, splitLine:{ lineStyle:{ color:'#E5E7EB', type:'dashed' } } },
                { type:'value', name:'温度(°C)', nameTextStyle:{ color:'#64748B', fontSize:11 }, axisLabel:{ color:'#64748B', fontSize:11 }, splitLine:{ show:false } },
            ],
            series: [
                { name:'上市窗口', type:'bar', data:barData, barMaxWidth:28, itemStyle:{ borderRadius:[8,8,0,0], color: (p: { data?: unknown }) => { const s = (p.data as {status?: string})?.status; return s==='偏早'?'#F59E0B':s==='偏晚'?'#EF4444':'#93C5FD'; } } },
                { name:'月均温度', type:'line', yAxisIndex:1, smooth:true, symbol:'circle', symbolSize:7, data:tempLine, lineStyle:{ width:2, color:'#10B981' }, itemStyle:{ color:'#10B981' } },
            ],
        };
    }, [stackRows, regionCells, activeRegion]);

    const dangerWaves = tempChecks.filter(tc=>tc.checks.some(c=>c.severity==='danger'));

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">上市节奏 · 区域温度 + 温层窗口</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">区域：{activeRegion} · {regionMeta?.temp_range??'--'}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {regionOptions.map(r=>(
                        <button key={r} onClick={()=>setSelectedRegion(r)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${r===activeRegion?'border-slate-900 bg-slate-900 text-white':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{r}</button>
                    ))}
                </div>
            </div>
            <ReactECharts option={option} style={{ height:260 }} notMerge />
            {dangerWaves.length>0 && (
                <div className="mt-3 space-y-1">
                    {dangerWaves.map(tc=>(
                        tc.checks.filter(c=>c.severity==='danger').map(c=>(
                            <div key={`${tc.waveId}-${c.category}`} className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded px-3 py-1.5">
                                ⚠ <strong>{tc.waveLabel}</strong>：{c.message}
                            </div>
                        ))
                    ))}
                </div>
            )}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {tempWindows.slice(0,6).map(w=>(
                    <div key={w.category} className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 text-[10px] text-slate-600">
                        <div className="font-semibold text-slate-700">{w.category}</div>
                        <div className="mt-0.5 text-slate-500">最佳温层：{w.tempMin}~{w.tempMax}℃</div>
                        <div className="text-slate-400">{w.notes.slice(0,28)}…</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── WAVE DECISION KPI STRIP ───────────────────────────────────────────────────

type KpiStatus = 'healthy'|'opportunity'|'warning'|'danger'|'observe'|'neutral';

const KPI_SC: Record<KpiStatus, { bg:string; text:string; dot:string }> = {
    healthy:     { bg:'border-emerald-200 bg-emerald-50', text:'text-emerald-700', dot:'bg-emerald-500' },
    opportunity: { bg:'border-sky-200 bg-sky-50',         text:'text-sky-700',     dot:'bg-sky-500'     },
    warning:     { bg:'border-amber-200 bg-amber-50',     text:'text-amber-700',   dot:'bg-amber-500'   },
    danger:      { bg:'border-rose-200 bg-rose-50',       text:'text-rose-700',    dot:'bg-rose-500'    },
    observe:     { bg:'border-violet-200 bg-violet-50',   text:'text-violet-700',  dot:'bg-violet-500'  },
    neutral:     { bg:'border-slate-200 bg-slate-50',     text:'text-slate-600',   dot:'bg-slate-400'   },
};

interface WaveKpiCard {
    label: string; value: string; gap?: string; trend?: string; status: KpiStatus; sub?: string;
}

function deriveWaveKpis(wave: WaveSummary, master: WaveMasterRecord|undefined, devProgressMap: Map<string,WaveDevProgress>, today: Date): WaveKpiCard[] {
    const salesTarget = master?.planSalesAmount ?? 0;
    const forecastSales = salesTarget > 0 ? salesTarget * (0.85 + wave.new_ratio * 0.1) : 0;
    const salesGap = forecastSales - salesTarget;
    const otbBudget = master?.planOtbBudget ?? 0;
    const otbUsed = otbBudget * 0.85;
    const otbRemaining = otbBudget - otbUsed;
    const plannedSkus = master?.targetSkuCount ?? wave.sku_plan;
    const confirmedSkus = wave.sku_actual;
    const daysLeft = daysTo(wave.launch_date, today);
    const devData = devProgressMap.get(wave.id);
    const tasks = devData?.tasks ?? [];
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const readinessPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : (daysLeft > 60 ? 45 : 72);
    const landingRate = safeDiv(confirmedSkus, plannedSkus);
    const riskSt: KpiStatus = (daysLeft < 14 && landingRate < 0.8) || readinessPct < 50 ? 'danger'
        : (daysLeft < 30 && landingRate < 0.9) ? 'warning'
        : readinessPct > 90 ? 'healthy' : 'observe';
    const fmtM = (v: number) => v > 0 ? `¥${(v/10000).toFixed(0)}万` : '--';
    return [
        { label:'波段销售目标', value:fmtM(salesTarget), trend: master?.lySalesAmount ? `LY ${fmtM(master.lySalesAmount)}` : undefined, status:salesTarget>0?'healthy':'neutral' },
        { label:'预测销售额',   value:fmtM(forecastSales), gap:salesGap<0?`缺口 ${fmtM(Math.abs(salesGap))}`:undefined, status:salesGap>=0?'healthy':salesGap>-salesTarget*0.1?'warning':'danger', sub:salesTarget>0?`达成率 ${fmt(safeDiv(forecastSales,salesTarget))}`:undefined },
        { label:'波段OTB预算', value:fmtM(otbBudget), trend:otbBudget>0?`余额 ${fmtM(otbRemaining)}`:undefined, status:otbBudget>0?'healthy':'neutral' },
        { label:'已占用OTB',   value:fmtM(otbUsed), gap:`剩余 ${fmtM(otbRemaining)}`, status:otbRemaining<0?'danger':otbRemaining<otbBudget*0.1?'warning':'healthy', sub:otbBudget>0?`使用率 ${fmt(safeDiv(otbUsed,otbBudget))}`:undefined },
        { label:'计划SKU数',   value:String(plannedSkus), trend:master?`${master.plannedStyleCount}款×${master.targetColorCount}色`:undefined, status:plannedSkus>0?'healthy':'neutral' },
        { label:'已确认SKU数', value:String(confirmedSkus), gap:`未确认 ${Math.max(0,plannedSkus-confirmedSkus)}`, status:landingRate>0.9?'healthy':landingRate>0.75?'warning':'danger', sub:plannedSkus>0?`落地率 ${fmt(landingRate)}`:undefined },
        { label:'上市准备度',  value:`${readinessPct}%`, gap:`差距 ${100-readinessPct}%`, status:readinessPct>=90?'healthy':readinessPct>=70?'warning':'danger', sub:tasks.filter(t=>t.status==='at_risk').length>0?`⚠ ${tasks.filter(t=>t.status==='at_risk').length} 阻塞项`:undefined },
        { label:'风险等级',    value:riskSt==='danger'?'高风险':riskSt==='warning'?'预警':riskSt==='observe'?'观察':'健康', gap:daysLeft>=0?`距上市 ${daysLeft}天`:`已上市 ${Math.abs(daysLeft)}天`, status:riskSt, sub:riskSt==='danger'?'需立即处理':riskSt==='warning'?'关注进展':undefined },
    ];
}

function WaveDecisionKpis({ wave, master, devProgressMap, today }: {
    wave: WaveSummary; master: WaveMasterRecord|undefined;
    devProgressMap: Map<string,WaveDevProgress>; today: Date;
}) {
    const kpis = useMemo(() => deriveWaveKpis(wave, master, devProgressMap, today), [wave, master, devProgressMap, today]);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">波段决策总览</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">8项核心指标 · 绿=健康 蓝=机会 橙=预警 红=高风险 紫=观察</p>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {kpis.map(kpi => {
                    const sc = KPI_SC[kpi.status];
                    return (
                        <div key={kpi.label} className={`rounded-xl border px-4 py-3 ${sc.bg}`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                                <span className="text-[10px] text-slate-500 font-medium leading-tight">{kpi.label}</span>
                            </div>
                            <div className={`text-lg font-bold leading-tight ${sc.text}`}>{kpi.value}</div>
                            {kpi.gap && <div className={`text-[10px] mt-1 font-medium ${sc.text}`}>{kpi.gap}</div>}
                            {kpi.sub && <div className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</div>}
                            {kpi.trend && <div className="text-[10px] text-slate-400 mt-0.5">{kpi.trend}</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── WAVE DECISION SUMMARY CARD ────────────────────────────────────────────────

function WaveDecisionSummaryCard({ wave, master, devProgressMap, today, footwearRisks, onJumpToOtb }: {
    wave: WaveSummary; master: WaveMasterRecord|undefined;
    devProgressMap: Map<string,WaveDevProgress>; today: Date;
    footwearRisks: FootwearRisk[]; onJumpToOtb?: ()=>void;
}) {
    const daysLeft = daysTo(wave.launch_date, today);
    const landingRate = safeDiv(wave.sku_actual, wave.sku_plan);
    const otbBudget = master?.planOtbBudget ?? 0;
    const salesTarget = master?.planSalesAmount ?? 0;
    const devData = devProgressMap.get(wave.id);
    const tasks = devData?.tasks ?? [];
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const readinessPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : (daysLeft > 60 ? 45 : 72);
    const atRiskTasks = tasks.filter(t => t.status === 'at_risk');

    const issues: { tag: string; detail: string; sev: 'high' | 'mid' | 'low' }[] = [];
    if (wave.sku_plan > 0 && landingRate < 0.8 && daysLeft > 0 && daysLeft < 60)
        issues.push({ tag: 'SKU落地不足', detail: `落地率 ${fmt(landingRate)}，距上市 ${daysLeft}天仍有 ${wave.sku_plan - wave.sku_actual} 款未确认`, sev: 'high' });
    if (otbBudget === 0 && salesTarget > 0)
        issues.push({ tag: 'OTB未生成', detail: `销售目标 ${formatMoneyCny(salesTarget)} 缺少对应 OTB 预算`, sev: 'high' });
    if (wave.new_ratio < 0.5)
        issues.push({ tag: '新品占比偏低', detail: `新品 ${fmt(wave.new_ratio)}（建议 ≥50%），清货压力较大`, sev: 'mid' });
    if (atRiskTasks.length > 0)
        issues.push({ tag: '开发节点风险', detail: `${atRiskTasks.length} 个开发任务存在阻塞：${atRiskTasks.map(t => t.label).slice(0, 2).join('、')}`, sev: 'mid' });
    if (readinessPct < 70 && daysLeft > 0 && daysLeft < 45)
        issues.push({ tag: '上市准备不足', detail: `准备度 ${readinessPct}%，距上市 ${daysLeft}天`, sev: readinessPct < 50 ? 'high' : 'mid' });
    if (footwearRisks.filter(r => r.priority === 'P0').length > 0)
        issues.push({ tag: '鞋类P0风险', detail: footwearRisks.filter(r => r.priority === 'P0').map(r => r.title).slice(0, 2).join('；'), sev: 'high' });

    const highCount = issues.filter(i => i.sev === 'high').length;
    const midCount = issues.filter(i => i.sev === 'mid').length;
    const overallStatus = highCount > 0 ? '高风险' : midCount > 0 ? '需调整' : '可推进';
    const statusBg = highCount > 0 ? 'bg-rose-500' : midCount > 0 ? 'bg-amber-500' : 'bg-emerald-500';
    const cardBg = highCount > 0 ? 'bg-rose-50/60 border-rose-100' : midCount > 0 ? 'bg-amber-50/60 border-amber-100' : 'bg-emerald-50/60 border-emerald-100';

    const impacts = [
        { icon: '📈', label: '销售影响', value: salesTarget > 0 ? (highCount > 0 ? `风险缺口 ~¥${((salesTarget * 0.1) / 10000).toFixed(0)}万` : '目标可达成') : '--' },
        { icon: '💰', label: 'OTB影响', value: otbBudget > 0 ? `余额 ¥${((otbBudget * 0.15) / 10000).toFixed(0)}万` : '⚠ 预算未生成' },
        { icon: '📅', label: '上市时间', value: daysLeft > 0 ? `距上市 ${daysLeft}天` : `已上市 ${Math.abs(daysLeft)}天` },
        { icon: '📦', label: '库存影响', value: readinessPct >= 80 ? '入仓风险可控' : `准备度 ${readinessPct}%` },
    ];

    return (
        <div className={`rounded-2xl border px-5 py-4 shadow-sm ${cardBg}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">波段决策摘要</h3>
                    <span className={`text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusBg}`}>{overallStatus}</span>
                    {issues.length > 0 && <span className="text-[11px] text-slate-500">{issues.length} 个关注点</span>}
                </div>
                {onJumpToOtb && <button onClick={onJumpToOtb} className="text-[11px] text-sky-600 hover:underline">→ OTB 预算</button>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                {impacts.map(imp => (
                    <div key={imp.label} className="rounded-xl border border-white/80 bg-white/70 px-3 py-2.5">
                        <div className="text-[10px] text-slate-400 mb-1">{imp.icon} {imp.label}</div>
                        <div className="text-[12px] font-bold text-slate-800 leading-tight">{imp.value}</div>
                    </div>
                ))}
            </div>
            {issues.length > 0 ? (
                <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">主要关注点</div>
                    {issues.slice(0, 4).map((iss, i) => (
                        <div key={i} className={`flex items-start gap-2 text-[11px] rounded-lg px-3 py-2 ${iss.sev === 'high' ? 'bg-rose-100/80 text-rose-800' : iss.sev === 'mid' ? 'bg-amber-100/80 text-amber-800' : 'bg-slate-100/80 text-slate-700'}`}>
                            <span className={`shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${iss.sev === 'high' ? 'bg-rose-500 text-white' : iss.sev === 'mid' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'}`}>{iss.tag}</span>
                            <span className="leading-snug">{iss.detail}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">建议动作</div>
                    {['当前波段各项指标健康，可按计划推进', '建议确认下单截止节点和入仓时间', '同步波段数据至 OTB / 销售预测 / 库存'].map((a, i) => (
                        <div key={i} className="text-[11px] text-emerald-700 flex items-start gap-1.5">
                            <span className="shrink-0">{i === 0 ? '✓' : '·'}</span><span>{a}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── WAVE POSITIONING PANEL ────────────────────────────────────────────────────

const WAVE_POS_MAP: Record<string, { label:string; color:string }> = {
    traffic:    { label:'新品引爆',  color:'bg-sky-100 text-sky-800 border-sky-200'       },
    testing:    { label:'测试新品',  color:'bg-violet-100 text-violet-800 border-violet-200' },
    main_sales: { label:'销售承接',  color:'bg-emerald-100 text-emerald-800 border-emerald-200' },
    repeat:     { label:'补货加深',  color:'bg-amber-100 text-amber-800 border-amber-200'  },
    clearance:  { label:'清货过渡',  color:'bg-rose-100 text-rose-800 border-rose-200'     },
    image:      { label:'形象曝光',  color:'bg-indigo-100 text-indigo-800 border-indigo-200' },
};

function WavePositioningPanel({ master, brief }: {
    master: WaveMasterRecord|undefined; brief: WaveBriefRecord|undefined;
}) {
    const wavePos = WAVE_POS_MAP[master?.waveRole ?? ''] ?? { label: master?.waveRoleLabel ?? '--', color:'bg-slate-100 text-slate-700 border-slate-200' };
    const fields = [
        { icon:'🎯', label:'波段定位',   value:wavePos.label,      tag:wavePos.color },
        { icon:'👟', label:'目标消费者', value:brief?.targetAudience ?? '--' },
        { icon:'🏃', label:'使用场景',   value:brief?.consumerScene ?? '--' },
        { icon:'🏪', label:'渠道重点',   value:brief?.channelFocus ?? '--' },
        { icon:'📦', label:'商品任务',   value:`计划 ${master?.targetSkuCount??'--'} SKU / ${master?.plannedStyleCount??'--'} 款 · 主推：${(master?.mainCategoryList??[]).join('/')||'--'}` },
        { icon:'🎨', label:'设计关键词', value:brief?.designTheme ?? '--' },
        { icon:'💴', label:'价格策略',   value:(master?.priceBandFocus??[]).map(p=>PRICE_BAND_LABEL[p]??p).join(' → ') || '--' },
        { icon:'📊', label:'销售任务',   value:master ? `目标 ${formatMoneyCny(master.planSalesAmount)} · 售罄 ${fmt(master.sellThroughTarget)}` : '--' },
        { icon:'💹', label:'毛利策略',   value:master ? `OTB ${formatMoneyCny(master.planOtbBudget)} · 销售占比 ${fmt(master.salesRatio)}` : '--' },
    ];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-900">波段定位</h3>
                {master?.waveRole && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${wavePos.color}`}>{wavePos.label}</span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-0">
                {fields.map(f => (
                    <div key={f.label} className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0">
                        <span className="text-sm shrink-0">{f.icon}</span>
                        <span className="text-[11px] text-slate-400 shrink-0 w-20">{f.label}</span>
                        {f.tag
                            ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${f.tag}`}>{f.value}</span>
                            : <span className="text-[11px] font-medium text-slate-800 leading-snug">{f.value}</span>
                        }
                    </div>
                ))}
            </div>
            {brief?.planningNotes && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-[11px] text-amber-800">
                    <span className="font-semibold">企划备注：</span>{brief.planningNotes}
                </div>
            )}
        </div>
    );
}

// ── DESIGN DIRECTION BOARD ────────────────────────────────────────────────────

interface DesignCard {
    theme:string; shoeType:string; colorStory:string; material:string;
    functionBenefit:string; scene:string; skuTarget:number; budgetShare:string;
    salesTarget:string; risk?:string;
    lastType?:string; soleStructure?:string; footFeel?:string; targetAudience?:string;
    competitorRef?:string; designAction?:string;
}

function deriveDesignCards(brief: WaveBriefRecord|undefined, master: WaveMasterRecord|undefined): DesignCard[] {
    if (!brief || !master) return [];
    const totalSkus = master.targetSkuCount ?? 30;
    const totalSales = master.planSalesAmount ?? 0;
    const cats = master.mainCategoryList ?? ['休闲'];
    const roles = master.productRoleFocus ?? ['main', 'basic'];
    const cards: DesignCard[] = [];
    if (roles.includes('hero') || roles.includes('main')) {
        cards.push({
            theme: brief.designTheme + ' · 主推方向',
            shoeType: cats[0]?.includes('跑') ? '轻量跑鞋' : cats[0]?.includes('篮') ? '篮球鞋' : '城市休闲鞋',
            colorStory: brief.colorStrategy, material: brief.materialFocus,
            functionBenefit: '轻量 · 透气 · 耐磨 · 日常百搭',
            scene: brief.consumerScene,
            skuTarget: Math.round(totalSkus * 0.4), budgetShare: '40%',
            salesTarget: formatMoneyCny(totalSales * 0.45),
            risk: '核心SKU，确认颜色和尺码深度',
            lastType: cats[0]?.includes('跑') ? '标准竞技楦' : '标准 E 楦/宽头',
            soleStructure: cats[0]?.includes('跑') ? '碳板+EVA中底' : 'EVA+橡胶大底',
            footFeel: '轻量回弹 · 落地缓冲',
            targetAudience: brief.targetAudience,
            competitorRef: '参考主流运动品牌同价位款式',
            designAction: '确认主推色 + 建议加深度至 350 双/款',
        });
    }
    cards.push({
        theme: brief.designTheme + ' · 走量方向',
        shoeType: cats[0]?.includes('跑') ? '慢跑鞋' : '基础休闲鞋',
        colorStory: '黑白灰经典色 + 1-2个季节色', material: '经济型编织网布 + TPR底',
        functionBenefit: '性价比高 · 耐穿 · 基础款', scene: '日常通勤/日常穿着',
        skuTarget: Math.round(totalSkus * 0.35), budgetShare: '35%',
        salesTarget: formatMoneyCny(totalSales * 0.30),
        lastType: '标准 E 楦',
        soleStructure: 'TPR 一体底',
        footFeel: '轻便舒适 · 全天穿着',
        targetAudience: '大众消费群体',
        competitorRef: '参考走量款同价位竞品',
        designAction: '维持计划，追踪售罄率',
    });
    if (roles.includes('test') || roles.includes('image')) {
        cards.push({
            theme: brief.designTheme + ' · 形象/测试方向',
            shoeType: cats[0]?.includes('跑') ? '竞速跑鞋' : '设计师款',
            colorStory: '跳色 / 印花 / 限量色', material: brief.materialFocus + ' · 高端',
            functionBenefit: '品牌形象 · 拍照出片 · 话题性', scene: '时尚穿搭/社媒传播',
            skuTarget: Math.round(totalSkus * 0.15), budgetShare: '15%',
            salesTarget: formatMoneyCny(totalSales * 0.15),
            risk: '测试款，控制深度，快反备货',
            lastType: cats[0]?.includes('跑') ? '竞速窄楦' : '设计楦型',
            soleStructure: '特种材质底材',
            footFeel: '专业竞技 · 视觉冲击',
            targetAudience: '时尚消费者/专业运动者',
            competitorRef: '参考高端设计师品牌',
            designAction: '控制深度，快反备货方案就绪',
        });
    }
    cards.push({
        theme: '承接/补货方向',
        shoeType: '上季延续款 / 翻单款',
        colorStory: '延续畅销色', material: '同款材质',
        functionBenefit: '稳定销售 · 降低风险', scene: '补货维护',
        skuTarget: Math.round(totalSkus * 0.10), budgetShare: '10%',
        salesTarget: formatMoneyCny(totalSales * 0.10),
        lastType: '延续上季楦型',
        soleStructure: '延续上季底材',
        footFeel: '成熟稳定',
        targetAudience: '老顾客/品牌忠诚群体',
        competitorRef: '无需参考竞品',
        designAction: '延续上季设计，无需大改',
    });
    return cards.slice(0, 5);
}

function DesignDirectionBoard({ brief, master }: { brief: WaveBriefRecord|undefined; master: WaveMasterRecord|undefined }) {
    const cards = useMemo(() => deriveDesignCards(brief, master), [brief, master]);
    const [expanded, setExpanded] = useState(false);
    if (!brief) return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionTitle title="设计方向板" sub="设计主题 · 鞋型 · 颜色 · 材质 · 功能卖点" />
            <p className="text-xs text-slate-400 text-center py-4">暂无设计方向数据</p>
        </div>
    );
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">设计方向板</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cards.length} 个设计方向 · 主题/鞋型/颜色/材质/功能卖点</p>
                </div>
                <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg">
                    {expanded ? '收起' : '展开详情'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-sky-50 border border-sky-100 p-3.5">
                    <div className="text-[10px] font-bold text-sky-600 uppercase mb-1.5">设计主题</div>
                    <div className="text-sm font-bold text-sky-800">{brief.designTheme}</div>
                    {brief.marketingMoment && <div className="text-[10px] text-sky-600 mt-1">节点：{brief.marketingMoment}</div>}
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1.5">颜色故事</div>
                    <div className="text-[12px] font-medium text-emerald-800">{brief.colorStrategy}</div>
                </div>
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-3.5">
                    <div className="text-[10px] font-bold text-violet-600 uppercase mb-1.5">材质方向</div>
                    <div className="text-[12px] font-medium text-violet-800">{brief.materialFocus}</div>
                    <div className="text-[10px] text-violet-600 mt-1">核心尺码：{brief.coreSizeRange}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {(expanded ? cards : cards.slice(0, 4)).map((card, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="text-[10px] font-bold text-slate-700 mb-2 leading-tight">{card.theme}</div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] mb-2">
                            {[['鞋型', card.shoeType], ['楦型', card.lastType??'--'], ['鞋底', card.soleStructure??'--'], ['脚感', card.footFeel??'--'], ['配色', card.colorStory], ['场景', card.scene], ['材质', card.material], ['功能', card.functionBenefit]].map(([l,v]) => (
                                <div key={l} className="flex gap-1">
                                    <span className="text-slate-400 w-8 shrink-0">{l}</span>
                                    <span className="text-slate-700 leading-snug truncate" title={v}>{v}</span>
                                </div>
                            ))}
                        </div>
                        {card.targetAudience && (
                            <div className="text-[10px] text-slate-500 mb-1.5 bg-white/70 rounded px-1.5 py-0.5 truncate">👥 {card.targetAudience}</div>
                        )}
                        <div className="mt-1 pt-1.5 border-t border-slate-200 flex justify-between text-[10px] text-slate-500">
                            <span>{card.skuTarget} SKU · 预算 {card.budgetShare}</span><span>目标 {card.salesTarget}</span>
                        </div>
                        {card.designAction && <div className="mt-1 text-[10px] text-sky-600 font-medium">→ {card.designAction}</div>}
                        {card.risk && <div className="mt-1 text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">⚠ {card.risk}</div>}
                        {card.competitorRef && <div className="mt-0.5 text-[9px] text-slate-400">{card.competitorRef}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── SKU ROLE MIX PANEL ────────────────────────────────────────────────────────

const SKU_ROLE_CONFIGS = [
    { role:'hero',      en:'Hero',      zh:'主推款',   pct:0.15, bar:'bg-sky-500',     badge:'bg-sky-100 text-sky-800 border-sky-200',         desc:'品牌形象·主要推广·高曝光',      gm:0.55, action:'确认主推款颜色+深度' },
    { role:'core',      en:'Core',      zh:'核心款',   pct:0.30, bar:'bg-blue-500',    badge:'bg-blue-100 text-blue-800 border-blue-200',       desc:'主要销售贡献·全渠道铺货',        gm:0.48, action:'全渠道铺货，确保尺码完整' },
    { role:'volume',    en:'Volume',    zh:'走量款',   pct:0.25, bar:'bg-emerald-500', badge:'bg-emerald-100 text-emerald-800 border-emerald-200', desc:'大众价位·走量·稳定上架',        gm:0.42, action:'维持计划，追踪售罄率' },
    { role:'image',     en:'Image',     zh:'形象款',   pct:0.05, bar:'bg-violet-500',  badge:'bg-violet-100 text-violet-800 border-violet-200', desc:'高端形象·拉升品牌调性',          gm:0.58, action:'控制数量，重点渠道上架' },
    { role:'entry',     en:'Entry',     zh:'引流款',   pct:0.10, bar:'bg-amber-500',   badge:'bg-amber-100 text-amber-800 border-amber-200',   desc:'低价引流·拉新·促连带',           gm:0.35, action:'确认价格点，加强门店陈列' },
    { role:'premium',   en:'Premium',   zh:'高毛利款', pct:0.05, bar:'bg-indigo-500',  badge:'bg-indigo-100 text-indigo-800 border-indigo-200', desc:'高毛利率·利润贡献·精选渠道',    gm:0.62, action:'精选渠道，控制折扣深度' },
    { role:'test',      en:'Test',      zh:'测试款',   pct:0.05, bar:'bg-slate-400',   badge:'bg-slate-100 text-slate-700 border-slate-200',   desc:'小批量验证·快反准备·控制风险',   gm:0.45, action:'控制深度，准备快反方案' },
    { role:'clearance', en:'Clearance', zh:'清货款',   pct:0.05, bar:'bg-rose-400',    badge:'bg-rose-100 text-rose-800 border-rose-200',      desc:'承接尾货·促清货·改善库龄',       gm:0.32, action:'设置折扣档位，快速清货' },
] as const;

function SkuRoleMixPanel({ master, wave }: { master: WaveMasterRecord|undefined; wave: WaveSummary }) {
    const roles = useMemo(() => {
        const totalSkus = master?.targetSkuCount ?? wave.sku_plan ?? 40;
        const totalSales = master?.planSalesAmount ?? 0;
        const productRoles = master?.productRoleFocus ?? ['main', 'basic'];
        return SKU_ROLE_CONFIGS.map(rc => {
            let mult = 1;
            if ((rc.role==='hero'||rc.role==='core') && (productRoles.includes('hero')||productRoles.includes('main'))) mult = 1.3;
            if (rc.role==='test' && productRoles.includes('test')) mult = 1.5;
            if (rc.role==='clearance' && productRoles.includes('clearance')) mult = 2;
            if (rc.role==='volume' && productRoles.includes('basic')) mult = 1.3;
            const pct = rc.pct * mult;
            const skuCount = Math.max(1, Math.round(totalSkus * pct));
            const riskSt: KpiStatus = rc.role==='clearance'?'warning':rc.role==='test'?'observe':'healthy';
            return { ...rc, skuCount, pct, salesTarget: totalSales * pct, riskSt };
        });
    }, [master, wave]);
    const totalSkus = roles.reduce((s,r) => s+r.skuCount, 0);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">SKU角色结构</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Hero / Core / Volume / Image / Entry / Premium / Test / Clearance</p>
                </div>
                <span className="text-[11px] text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg">合计约 {totalSkus} SKU</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-2.5 mb-4 gap-0.5">
                {roles.map(r => r.skuCount > 0 && (
                    <div key={r.role} style={{width:`${(r.skuCount/totalSkus)*100}%`}} className={`${r.bar}`} title={`${r.zh}: ${r.skuCount}`} />
                ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {roles.map(r => {
                    const sc = KPI_SC[r.riskSt];
                    return (
                        <div key={r.role} className={`rounded-xl border px-3 py-3 ${sc.bg}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${r.bar}`} />
                                <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${r.badge}`}>{r.en}</span>
                                <span className="text-[10px] text-slate-600">{r.zh}</span>
                            </div>
                            <div className={`text-base font-bold ${sc.text}`}>{r.skuCount} <span className="text-[10px] font-normal text-slate-400">SKU</span></div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{fmt(r.skuCount/totalSkus)} · GM {fmt(r.gm)}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{r.desc}</div>
                            <div className="mt-1.5 text-[10px] text-sky-600 font-medium leading-snug">→ {r.action}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── FORECAST OTB FIT PANEL ────────────────────────────────────────────────────

type ForecastStatus = '预算充足'|'预算紧张'|'预算超配'|'预测不足'|'需要重算';

function ForecastOtbFitPanel({ wave, master, onJumpToOtb, onJumpToForecast }: {
    wave: WaveSummary; master: WaveMasterRecord|undefined;
    onJumpToOtb?: ()=>void; onJumpToForecast?: ()=>void;
}) {
    const data = useMemo(() => {
        const salesTarget = master?.planSalesAmount ?? 0;
        const forecastSales = salesTarget > 0 ? salesTarget * 0.92 : 0;
        const forecastUnits = master ? Math.round(master.targetSkuCount * master.averageDepth * 0.92) : 0;
        const salesGap = forecastSales - salesTarget;
        const otbBudget = master?.planOtbBudget ?? 0;
        const otbUsed = otbBudget * 0.85;
        const otbRemaining = otbBudget - otbUsed;
        const otbFitsSkuPlan = otbRemaining > 0 && otbBudget >= salesTarget * 0.65;
        let status: ForecastStatus = '需要重算';
        if (master) {
            if (salesGap < -salesTarget*0.15) status = '预测不足';
            else if (otbRemaining < 0) status = '预算超配';
            else if (otbRemaining < otbBudget*0.1) status = '预算紧张';
            else status = '预算充足';
        }
        const statusSt: KpiStatus = status==='预算充足'?'healthy':status==='预算紧张'?'warning':status==='需要重算'?'observe':'danger';
        const adjustments = status==='预算紧张'
            ? ['建议减少 5-8 个低优先级 SKU', '考虑调整入门价位比例', '优先确认 Hero/Core 款预算']
            : status==='预算超配'
            ? ['当前 OTB 超出合理范围', '建议冻结 Test 类 SKU 预算', '回收超配预算至下一波段']
            : status==='预测不足'
            ? ['销售预测低于目标 15%+', '建议重新评估上市节奏', '考虑加强营销支持力度']
            : ['当前预算与预测基本匹配', '维持计划，关注落地率', '可适当储备 5% 机动预算'];
        return { salesTarget, forecastSales, forecastUnits, salesGap, otbBudget, otbUsed, otbRemaining, otbFitsSkuPlan, status, statusSt, adjustments };
    }, [wave, master]);
    const sc = KPI_SC[data.statusSt];
    const metrics = [
        { label:'波段销售目标', value:formatMoneyCny(data.salesTarget), warn:false },
        { label:'预测销售额',   value:formatMoneyCny(data.forecastSales), warn:data.salesGap<0, emphasis:true },
        { label:'预测销量',     value:`${data.forecastUnits.toLocaleString()} 双`, warn:false },
        { label:'销售缺口',     value:data.salesGap>=0?`+${formatMoneyCny(data.salesGap)}`:formatMoneyCny(data.salesGap), warn:data.salesGap<0, emphasis:true },
        { label:'波段OTB预算',  value:formatMoneyCny(data.otbBudget), warn:false },
        { label:'已占用OTB',    value:formatMoneyCny(data.otbUsed), warn:false },
        { label:'剩余OTB',      value:formatMoneyCny(data.otbRemaining), warn:data.otbRemaining<0, emphasis:true },
        { label:'OTB支撑SKU',   value:data.otbFitsSkuPlan?'✓ 支撑':'✗ 不支撑', warn:!data.otbFitsSkuPlan, emphasis:true },
    ];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">OTB 预算摘要</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">波段预算 · 占用 · 剩余 · SKU支撑 · 建议动作</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full border text-[11px] font-bold ${sc.bg} ${sc.text}`}>{data.status}</span>
                    {onJumpToOtb && (
                        <button onClick={onJumpToOtb} className="text-[11px] px-2.5 py-1 border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">查看 OTB 波段预算</button>
                    )}
                    {onJumpToOtb && (
                        <button onClick={onJumpToOtb} className="text-[11px] px-2.5 py-1 bg-sky-600 text-white hover:bg-sky-700 rounded-lg transition-colors">提交 OTB 调整</button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                {[
                    { label: '波段 OTB 预算', value: formatMoneyCny(data.otbBudget), warn: data.otbBudget === 0 },
                    { label: '已占用 OTB', value: formatMoneyCny(data.otbUsed), warn: false },
                    { label: '剩余 OTB', value: formatMoneyCny(data.otbRemaining), warn: data.otbRemaining < 0 },
                    { label: '预算状态', value: data.status, warn: data.status !== '预算充足' },
                    { label: 'OTB 支撑 SKU 计划', value: data.otbFitsSkuPlan ? '✓ 支撑' : '✗ 不足', warn: !data.otbFitsSkuPlan },
                    { label: '建议增减 SKU', value: data.status === '预算紧张' ? '减少 5-8 个低优先级 SKU' : data.status === '预算超配' ? '冻结 Test 类 SKU' : data.status === '预测不足' ? '重评上市节奏' : '维持计划', warn: data.status !== '预算充足' },
                ].map(m => (
                    <div key={m.label} className={`rounded-xl border px-3 py-2.5 ${m.warn ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="text-[10px] text-slate-400 mb-1">{m.label}</div>
                        <div className={`text-sm font-bold leading-tight ${m.warn ? 'text-rose-700' : 'text-slate-800'}`}>{m.value}</div>
                    </div>
                ))}
            </div>
            <div className={`rounded-xl border p-3.5 ${sc.bg}`}>
                <div className={`text-[11px] font-bold mb-2 ${sc.text}`}>判断与建议</div>
                <div className="space-y-1">
                    {data.adjustments.map((a, i) => (
                        <div key={i} className={`text-[11px] ${sc.text} flex items-start gap-1.5`}>
                            <span className="shrink-0 mt-0.5">{i === 0 ? '→' : '·'}</span><span>{a}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── INVENTORY CONFLICT PANEL ──────────────────────────────────────────────────

interface ConflictCheck { id:string; type:string; title:string; description:string; riskSt:KpiStatus; action:string; value?:string; }

function InventoryConflictPanel({ wave, allWaves, master, onJumpToInventory }: {
    wave: WaveSummary; allWaves: WaveSummary[]; master: WaveMasterRecord|undefined; onJumpToInventory?: ()=>void;
}) {
    const conflicts = useMemo((): ConflictCheck[] => {
        const sorted = [...allWaves].sort((a,b)=>new Date(a.launch_date).getTime()-new Date(b.launch_date).getTime());
        const idx = sorted.findIndex(w=>w.id===wave.id);
        const prev = idx>0?sorted[idx-1]:null;
        const next = idx<sorted.length-1?sorted[idx+1]:null;
        const checks: ConflictCheck[] = [];
        if (prev) {
            const days = Math.floor((new Date(wave.launch_date).getTime()-new Date(prev.launch_date).getTime())/86400000);
            checks.push({ id:'prev', type:'上一波库存', title:`${prev.season.replace(/^\d{4}-/,'')}-${prev.wave} 库存情况`, description:`上波距今 ${days}天 · 落地率 ${fmt(safeDiv(prev.sku_actual,prev.sku_plan))}`, riskSt:days<45?'warning':'healthy', action:days<45?'加快上一波清货节奏':'上一波库存状态健康', value:`WOS ${Math.round(days/7)}周` });
        }
        if (next) {
            const days = Math.floor((new Date(next.launch_date).getTime()-new Date(wave.launch_date).getTime())/86400000);
            checks.push({ id:'next', type:'下一波冲突', title:`下波 ${next.season.replace(/^\d{4}-/,'')}-${next.wave} 上市节奏`, description:`距下一波上市 ${days}天`, riskSt:days<30?'danger':days<45?'warning':'healthy', action:days<30?'上市节奏偏紧，建议提前清货预案':'下一波档期充裕', value:`间隔 ${Math.round(days/7)}周` });
        }
        const markdownRisk = wave.new_ratio < 0.5;
        checks.push({ id:'markdown', type:'折扣风险', title:'尾货折扣压力', description:`新品占比 ${fmt(wave.new_ratio)} · ${markdownRisk?'新品占比偏低，清货压力大':'新品结构健康'}`, riskSt:markdownRisk?'warning':'healthy', action:markdownRisk?'增加新品比例或制定清货定价方案':'折扣风险可控', value:`新品 ${fmt(wave.new_ratio)}` });
        checks.push({ id:'size', type:'尺码风险', title:'核心尺码断档风险', description:master?`计划 ${master.targetSkuCount} SKU · 深度 ${master.averageDepth} 双/款`:'暂无尺码深度计划', riskSt:!master?'neutral':master.averageDepth<300?'warning':'healthy', action:!master?'请制定尺码深度计划':master.averageDepth<300?'建议提高核心尺码深度至 300+ 双/款':'尺码深度规划合理', value:master?`${master.averageDepth}双/款`:'--' });
        const launchMonth = new Date(wave.launch_date).getMonth()+1;
        const isPromo = [1,5,6,10,11,12].includes(launchMonth);
        checks.push({ id:'promo', type:'大促冲突', title:isPromo?'⚠ 大促月份上市':'上市节奏正常', description:`上市月份：${launchMonth}月 · ${isPromo?'大促期间注意渠道资源分配':'非大促月份，可聚焦正价销售'}`, riskSt:isPromo?'observe':'healthy', action:isPromo?'协调大促与新品上市资源':'可正常按计划上市', value:`${launchMonth}月` });
        return checks;
    }, [wave, allWaves, master]);
    const highRiskCount = conflicts.filter(c=>c.riskSt==='danger'||c.riskSt==='warning').length;
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">库存与前后波段冲突</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">上一波库存 · 下一波节奏 · 折扣风险 · 尺码断档 · 大促冲突</p>
                </div>
                <div className="flex items-center gap-2">
                    {highRiskCount>0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{highRiskCount} 个风险项</span>}
                    {onJumpToInventory && <button onClick={onJumpToInventory} className="text-[11px] text-sky-600 hover:underline">→ 库存健康</button>}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {conflicts.map(c => {
                    const sc = KPI_SC[c.riskSt];
                    return (
                        <div key={c.id} className={`rounded-xl border p-3.5 ${sc.bg}`}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                                <span className={`text-[10px] font-semibold ${sc.text}`}>{c.type}</span>
                                {c.value && <span className="ml-auto text-[10px] text-slate-400">{c.value}</span>}
                            </div>
                            <div className={`text-[11px] font-bold leading-snug mb-1 ${sc.text}`}>{c.title}</div>
                            <div className="text-[11px] text-slate-600 leading-snug mb-2">{c.description}</div>
                            <div className={`text-[10px] font-medium ${sc.text}`}>→ {c.action}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── LAUNCH READINESS PANEL ────────────────────────────────────────────────────

const READINESS_GATES = [
    { id:'brief',       label:'设计确认',     owner:'设计部门' },
    { id:'sample',      label:'样品确认',     owner:'商品企划' },
    { id:'costing',     label:'成本确认',     owner:'采购部门' },
    { id:'pricing',     label:'价格确认',     owner:'商品企划' },
    { id:'sku',         label:'SKU确认',      owner:'商品企划' },
    { id:'otb',         label:'OTB确认',      owner:'财务部门' },
    { id:'channel',     label:'渠道确认',     owner:'销售部门' },
    { id:'material',    label:'物料确认',     owner:'市场部门' },
    { id:'shoot',       label:'拍摄确认',     owner:'市场部门' },
    { id:'launch_date', label:'上市日期确认', owner:'商品企划' },
] as const;

const RDY_SC = {
    done:        { bar:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-200', icon:'✓' },
    in_progress: { bar:'bg-sky-500',     badge:'bg-sky-50 text-sky-700 border-sky-200',             icon:'↻' },
    at_risk:     { bar:'bg-rose-500',    badge:'bg-rose-50 text-rose-700 border-rose-200',          icon:'⚠' },
    pending:     { bar:'bg-slate-300',   badge:'bg-slate-50 text-slate-500 border-slate-200',       icon:'○' },
};

function LaunchReadinessPanel({ waveKey, devProgressMap, wave, today, onJumpToExecution }: {
    waveKey: string; devProgressMap: Map<string,WaveDevProgress>; wave: WaveSummary; today: Date; onJumpToExecution?: ()=>void;
}) {
    const devData = devProgressMap.get(waveKey);
    const rawTasks = devData?.tasks ?? [];
    const daysLeft = daysTo(wave.launch_date, today);
    const items = READINESS_GATES.map(gate => {
        const task = rawTasks.find(t => t.taskType === gate.id);
        if (task) return { ...gate, deadline: task.deadline, status: task.status, progress: task.progress, riskNote: task.riskNote };
        const autoStatus: DevTask['status'] = daysLeft > 90 ? 'pending' : daysLeft > 45 ? 'in_progress' : daysLeft > 14 ? 'at_risk' : 'pending';
        return { ...gate, deadline: undefined as string|undefined, status: autoStatus, progress: daysLeft > 90 ? 0 : daysLeft > 45 ? 40 : 20, riskNote: undefined as string|undefined };
    });
    const doneCount = items.filter(i => i.status === 'done').length;
    const blockedItems = items.filter(i => i.status === 'at_risk');
    const readinessPct = Math.round((doneCount / items.length) * 100);
    const overallSt: KpiStatus = blockedItems.length > 2 ? 'danger' : blockedItems.length > 0 ? 'warning' : readinessPct >= 90 ? 'healthy' : 'observe';
    const sc = KPI_SC[overallSt];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">上市准备度</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{doneCount}/{items.length} 项完成 {blockedItems.length>0?`· ${blockedItems.length} 个阻塞项`:''} · 准备度 {readinessPct}%</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${sc.text}`}>{readinessPct}%</span>
                    {onJumpToExecution && <button onClick={onJumpToExecution} className="text-[11px] text-sky-600 hover:underline">→ 执行看板</button>}
                </div>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
                <div className={`h-full rounded-full ${readinessPct>=90?'bg-emerald-500':readinessPct>=70?'bg-amber-500':'bg-rose-500'}`} style={{width:`${readinessPct}%`}} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {items.map(item => {
                    const stCfg = RDY_SC[item.status];
                    const daysToDeadline = item.deadline ? daysTo(item.deadline, today) : null;
                    return (
                        <div key={item.id} className={`rounded-xl border px-2.5 py-2.5 text-[10px] ${stCfg.badge}`}>
                            <div className="flex items-center gap-1 mb-1">
                                <span className="font-bold">{stCfg.icon}</span>
                                <span className="font-semibold truncate">{item.label}</span>
                            </div>
                            <div className="text-[9px] opacity-70 mb-1">{item.owner}</div>
                            {item.deadline && <div className="text-[9px] opacity-70">{item.deadline.slice(5).replace('-','/')}</div>}
                            {daysToDeadline !== null && daysToDeadline < 0 && item.status !== 'done' && (
                                <div className="text-[9px] text-rose-600 font-medium">逾期{Math.abs(daysToDeadline)}天</div>
                            )}
                            <div className="mt-1 h-1 rounded-full bg-white/60 overflow-hidden">
                                <div className={`h-full rounded-full ${stCfg.bar}`} style={{width:`${item.progress}%`}} />
                            </div>
                        </div>
                    );
                })}
            </div>
            {blockedItems.length > 0 && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <div className="text-[11px] font-bold text-rose-700 mb-2">⚠ 阻塞项 — 需立即处理</div>
                    <div className="space-y-1">
                        {blockedItems.map(b => (
                            <div key={b.id} className="text-[11px] text-rose-700 flex items-start gap-2">
                                <span className="shrink-0">·</span>
                                <span><strong>{b.label}</strong>{b.riskNote ? ` — ${b.riskNote}` : ''}<span className="text-slate-500 ml-1">（{b.owner}）</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── WAVE ACTION CENTER ────────────────────────────────────────────────────────

interface WaveActionItem {
    id:string; priority:'P0'|'P1'|'P2'; object:string; riskTag:string;
    reason:string; action:string; salesImpact:string;
    otbImpact?:string; inventoryImpact?:string;
    actionType:string; status:'建议中'|'待审批'|'执行中'|'已完成'|'已关闭';
}

function deriveWaveActions(wave: WaveSummary, master: WaveMasterRecord|undefined, today: Date): WaveActionItem[] {
    const acts: WaveActionItem[] = [];
    const daysLeft = daysTo(wave.launch_date, today);
    const salesTarget = master?.planSalesAmount ?? 0;
    const landingRate = safeDiv(wave.sku_actual, wave.sku_plan);
    const otbBudget = master?.planOtbBudget ?? 0;
    if (wave.sku_plan > 0 && landingRate < 0.8 && daysLeft < 60 && daysLeft > 0) {
        acts.push({ id:'sku-land', priority:'P0', object:'波段SKU', riskTag:'SKU落地率不足', reason:`落地率 ${fmt(landingRate)}，距上市 ${daysLeft}天仍有 ${wave.sku_plan-wave.sku_actual} 款未确认`, action:'立即追踪未落地款式，冻结低优先级SKU，确保 Hero/Core 款全部到位', salesImpact:`-${formatMoneyCny(salesTarget*(0.8-landingRate))}`, otbImpact:`节省 ${formatMoneyCny(otbBudget*(0.8-landingRate))}`, actionType:'冻结低优先级SKU', status:'建议中' });
    }
    if (otbBudget === 0 && salesTarget > 0) {
        acts.push({ id:'otb-miss', priority:'P0', object:'OTB预算', riskTag:'预算未生成', reason:`销售目标 ${formatMoneyCny(salesTarget)}，但 OTB 预算未生成`, action:'立即生成 OTB 预算并提交审批', salesImpact:'可能影响采购下单', otbImpact:`缺口约 ${formatMoneyCny(salesTarget*0.72)}`, actionType:'重新提交OTB审批', status:'建议中' });
    }
    if (wave.new_ratio < 0.5) {
        acts.push({ id:'new-ratio', priority:'P1', object:'品类结构', riskTag:'新品占比偏低', reason:`新品占比 ${fmt(wave.new_ratio)} 低于 50%，清货压力大`, action:'增加新品款数或调整翻单/延续款比例', salesImpact:`新品提升贡献约 ${formatMoneyCny(salesTarget*0.05)}`, inventoryImpact:'降低尾货积压风险', actionType:'增加主推款', status:'建议中' });
    }
    if (daysLeft > 0 && daysLeft < 14) {
        acts.push({ id:'urgent', priority:'P0', object:'上市节点', riskTag:'临近上市', reason:`距上市仅 ${daysLeft} 天，需确认所有准备事项`, action:'检查物料、渠道铺货、价格确认、SKU入仓状态', salesImpact:'延期上市影响首周销售', actionType:'提前上市', status:'待审批' });
    }
    if (salesTarget > 0 && salesTarget * 0.92 < salesTarget * 0.85) {
        acts.push({ id:'forecast-gap', priority:'P1', object:'销售预测', riskTag:'预测不足', reason:`预测销售额低于目标 ${fmt((salesTarget-salesTarget*0.92)/salesTarget)}`, action:'重新评估波段上市策略，加强营销投入或调整渠道首发', salesImpact:`缺口约 ${formatMoneyCny(salesTarget*0.08)}`, actionType:'调整渠道首发', status:'建议中' });
    }
    if (master && master.averageDepth < 300) {
        acts.push({ id:'size-depth', priority:'P1', object:'尺码结构', riskTag:'尺码深度不足', reason:`平均深度 ${master.averageDepth} 双/款，低于建议值 300 双/款`, action:'加深核心尺码备货，重点补充 38-42 码', salesImpact:'断码损失预计 3-5%', inventoryImpact:'提升售罄率', actionType:'加深核心尺码', status:'建议中' });
    }
    if (wave.otb_budget === 0 && salesTarget > 0) {
        acts.push({ id:'sync', priority:'P2', object:'下游联动', riskTag:'同步待确认', reason:'销售预测和库存计划尚未推送至 OTB 和销售预测模块', action:'推送波段企划数据至 OTB 预算和销售预测', salesImpact:'确保采购和预算对齐', actionType:'重新提交OTB审批', status:'建议中' });
    }
    return acts.slice(0, 8);
}

function WaveActionCenter({ wave, master, today, onJumpToOtb, onJumpToForecast, onJumpToInventory }: {
    wave: WaveSummary; master: WaveMasterRecord|undefined; today: Date;
    onJumpToOtb?: ()=>void; onJumpToForecast?: ()=>void; onJumpToInventory?: ()=>void;
}) {
    const actions = useMemo(() => deriveWaveActions(wave, master, today), [wave, master, today]);
    const p0 = actions.filter(a=>a.priority==='P0');
    const p1 = actions.filter(a=>a.priority==='P1');
    const p2 = actions.filter(a=>a.priority==='P2');
    if (!actions.length) return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionTitle title="波段行动中心" sub="最高优先级建议 · 自动生成" />
            <div className="text-xs text-emerald-600 py-4 text-center">✓ 当前波段无待处理行动项</div>
        </div>
    );
    const handleJump = (a: WaveActionItem) => {
        if (a.riskTag.includes('OTB') || a.actionType.includes('OTB')) onJumpToOtb?.();
        else if (a.riskTag.includes('预测')) onJumpToForecast?.();
        else if (a.riskTag.includes('库存') || a.riskTag.includes('尺码')) onJumpToInventory?.();
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">波段行动中心</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{actions.length} 条建议 · P0 立即 · P1 本周 · P2 观察</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                    {p0.length>0 && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">P0 × {p0.length}</span>}
                    {p1.length>0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">P1 × {p1.length}</span>}
                    {p2.length>0 && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">P2 × {p2.length}</span>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {actions.map(a => {
                    const bg = a.priority==='P0'?'border-rose-200 bg-rose-50':a.priority==='P1'?'border-amber-200 bg-amber-50':'border-slate-200 bg-slate-50';
                    const tx = a.priority==='P0'?'text-rose-700':a.priority==='P1'?'text-amber-700':'text-slate-600';
                    const pb = a.priority==='P0'?'bg-rose-500 text-white':a.priority==='P1'?'bg-amber-500 text-white':'bg-slate-300 text-slate-700';
                    const rb = a.priority==='P0'?'border-rose-300 bg-rose-100 text-rose-700':'border-amber-200 bg-amber-100 text-amber-700';
                    return (
                        <div key={a.id} className={`rounded-xl border p-3.5 ${bg}`}>
                            <div className="flex items-start gap-2 mb-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${pb}`}>{a.priority}</span>
                                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-semibold ${tx}`}>{a.object}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${rb}`}>{a.riskTag}</span>
                                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.status}</span>
                                </div>
                            </div>
                            <div className={`text-[11px] ${tx} mb-1.5 leading-snug`}>{a.reason}</div>
                            <div className="text-[11px] text-slate-700 font-medium mb-2">→ {a.action}</div>
                            <div className="border-t border-white/30 pt-2 mt-2">
                                <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 mb-2">
                                    <span>📈 {a.salesImpact || '--'}</span>
                                    {a.otbImpact && <span>💰 {a.otbImpact}</span>}
                                    {a.inventoryImpact && <span>📦 {a.inventoryImpact}</span>}
                                    <span>⏱ {a.status}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(a.riskTag.includes('OTB') || a.actionType.includes('OTB') || a.id === 'otb-miss') && (
                                        <button onClick={onJumpToOtb} className="text-[10px] px-2 py-0.5 rounded border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100">调整 OTB</button>
                                    )}
                                    {(a.id === 'sku-land' || a.riskTag.includes('SKU')) && (
                                        <button className="text-[10px] px-2 py-0.5 rounded border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100">调整 SKU 结构</button>
                                    )}
                                    {(a.riskTag.includes('预测') || a.id === 'forecast-gap') && (
                                        <button onClick={onJumpToForecast} className="text-[10px] px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100">查看销售预测</button>
                                    )}
                                    {(a.riskTag.includes('库存') || a.riskTag.includes('尺码') || a.id === 'size-depth') && (
                                        <button onClick={onJumpToInventory} className="text-[10px] px-2 py-0.5 rounded border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100">查看库存冲突</button>
                                    )}
                                    {a.id === 'new-ratio' && (
                                        <button className="text-[10px] px-2 py-0.5 rounded border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100">生成设计 Brief</button>
                                    )}
                                    {a.id === 'urgent' && (
                                        <button className="text-[10px] px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100">更新上市准备</button>
                                    )}
                                    {(a.id === 'sync' || (!['sku-land','otb-miss','new-ratio','urgent','forecast-gap','size-depth'].includes(a.id) && !a.riskTag.includes('OTB') && !a.riskTag.includes('SKU') && !a.riskTag.includes('预测') && !a.riskTag.includes('库存') && !a.riskTag.includes('尺码'))) && (
                                        <button onClick={() => handleJump(a)} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100">查看关联模块</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── SKU LINE LIST ─────────────────────────────────────────────────────────────

const SHOE_TYPE_MAP: Record<string, string> = {
    '运动休闲': '休闲鞋', '跑步': '跑鞋', '篮球': '篮球鞋', '训练': '训练鞋',
    '高跟': '高跟鞋', '凉鞋': '凉鞋', '靴': '短靴', '板鞋': '板鞋',
};
function deriveShoeType(category: string): string {
    for (const [key, val] of Object.entries(SHOE_TYPE_MAP)) {
        if (category.includes(key)) return val;
    }
    return '休闲鞋';
}

const PRIORITY_CATS = [
    { key: 'hero'        as const, label: 'Hero主推款', color: 'bg-sky-800 text-white border-sky-800' },
    { key: 'risk'        as const, label: '高风险款',   color: 'bg-rose-700 text-white border-rose-700' },
    { key: 'opportunity' as const, label: '高机会款',   color: 'bg-emerald-700 text-white border-emerald-700' },
    { key: 'pending'     as const, label: '待确认款',   color: 'bg-amber-700 text-white border-amber-700' },
    { key: 'blocked'     as const, label: '上市阻塞款', color: 'bg-slate-700 text-white border-slate-700' },
];

function WaveSkuLineList({ wave, master }: { wave: WaveSummary; master?: WaveMasterRecord }) {
    const [open, setOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [filter, setFilter] = useState<'hero'|'risk'|'opportunity'|'pending'|'blocked'>('hero');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'forecast_sales'|'suggested_depth'|'forecast_units'>('forecast_sales');
    const [sortAsc, setSortAsc] = useState(false);

    const otbPerSku = master && master.planOtbBudget > 0 && master.targetSkuCount > 0
        ? Math.round(master.planOtbBudget / master.targetSkuCount)
        : 0;

    const filterFn = useCallback((r: typeof wave.drill_rows[0], key: typeof filter) => {
        if (key === 'hero') return resolvePlanningRole(r.suggestion) === 'Hero/Core';
        if (key === 'risk') return resolvePlanningRole(r.suggestion) === 'Clearance' || (r.suggestion?.includes('⚠') ?? false);
        if (key === 'opportunity') return (r.suggestion?.includes('补货') || r.suggestion?.includes('加深')) ?? false;
        if (key === 'pending') return resolvePlanningRole(r.suggestion) === 'Test';
        if (key === 'blocked') return (r.suggestion?.includes('阻塞') || r.suggestion?.includes('延迟')) ?? false;
        return false;
    }, []);

    const filtered = useMemo(() => {
        let rows = wave.drill_rows.filter(r => showAll ? true : filterFn(r, filter));
        if (search) rows = rows.filter(r => r.style_id.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));
        return [...rows].sort((a, b) => {
            const av = (a as unknown as Record<string, number>)[sortBy] ?? 0;
            const bv = (b as unknown as Record<string, number>)[sortBy] ?? 0;
            return sortAsc ? av - bv : bv - av;
        });
    }, [wave, filter, search, sortBy, sortAsc, showAll, filterFn]);

    const counts = {
        hero:        wave.drill_rows.filter(r => filterFn(r, 'hero')).length,
        risk:        wave.drill_rows.filter(r => filterFn(r, 'risk')).length,
        opportunity: wave.drill_rows.filter(r => filterFn(r, 'opportunity')).length,
        pending:     wave.drill_rows.filter(r => filterFn(r, 'pending')).length,
        blocked:     wave.drill_rows.filter(r => filterFn(r, 'blocked')).length,
    };

    const toggleSort = useCallback((col: typeof sortBy) => {
        if (sortBy === col) setSortAsc(v => !v); else { setSortBy(col); setSortAsc(false); }
    }, [sortBy]);

    return (
        <CollapsibleSection title={`款式明细表（${wave.drill_rows.length} 款）`} subtitle="默认主推/高风险 · 含搜索/排序 · 点击查看全部" open={open} onToggle={() => setOpen(v => !v)}>
            <div className="px-5 py-3 border-b border-slate-50 flex flex-wrap items-center gap-2">
                <input placeholder="搜索款号/品类…" value={search} onChange={e => setSearch(e.target.value)} className="text-[11px] border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-40 focus:outline-none focus:border-sky-400" />
                {!showAll && PRIORITY_CATS.map(cat => (
                    <button key={cat.key} onClick={() => setFilter(cat.key)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${filter === cat.key ? cat.color : 'text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        {cat.label}({counts[cat.key]})
                    </button>
                ))}
                <button onClick={() => setShowAll(v => !v)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ml-auto ${showAll ? 'bg-sky-700 text-white border-sky-700' : 'text-sky-600 border-sky-200 hover:border-sky-400'}`}>
                    {showAll ? '收起精选' : `查看全部(${wave.drill_rows.length})`}
                </button>
            </div>
            {!wave.drill_rows.length ? <div className="px-5 py-6 text-[11px] text-slate-400 text-center">暂无款式数据</div> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>
                                {[
                                    { l: '款号', col: null, a: 'left' }, { l: '品类', col: null, a: 'left' },
                                    { l: '鞋型', col: null, a: 'left' }, { l: 'SKU角色', col: null, a: 'left' },
                                    { l: '价格带', col: null, a: 'left' }, { l: '上市日期', col: null, a: 'center' },
                                    { l: 'OTB预算', col: null, a: 'right' },
                                    { l: '预估销量', col: 'forecast_units' as const, a: 'right' },
                                    { l: '预估销额', col: 'forecast_sales' as const, a: 'right' },
                                    { l: '目标毛利', col: null, a: 'right' },
                                    { l: '上市状态', col: null, a: 'center' }, { l: '风险等级', col: null, a: 'center' },
                                    { l: '建议动作', col: null, a: 'left' },
                                ].map(h => (
                                    <th key={h.l} className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${h.a === 'right' ? 'text-right' : h.a === 'center' ? 'text-center' : 'text-left'} ${h.col ? 'cursor-pointer hover:text-slate-700' : ''}`} onClick={h.col ? () => toggleSort(h.col!) : undefined}>
                                        {h.l}{h.col && sortBy === h.col ? (sortAsc ? ' ↑' : ' ↓') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, i) => {
                                const role = resolvePlanningRole(row.suggestion);
                                const shoeType = deriveShoeType(row.category);
                                const estGm = row.price_band === 'image' ? 0.58 : row.price_band === 'profit' ? 0.48 : row.price_band === 'volume' ? 0.42 : 0.35;
                                const riskLevel = role === 'Clearance' ? '高风险' : role === 'Test' ? '观察' : '正常';
                                const riskColor = role === 'Clearance' ? 'bg-rose-50 text-rose-600' : role === 'Test' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
                                const stBadge = role === 'Hero/Core' ? 'bg-sky-100 text-sky-700' : role === 'Clearance' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600';
                                const launchStatus = role === 'Hero/Core' ? '待上市' : role === 'Clearance' ? '待清货' : '企划中';
                                const launchColor = role === 'Hero/Core' ? 'bg-sky-50 text-sky-600' : role === 'Clearance' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400';
                                return (
                                    <tr key={`${wave.id}-${row.style_id}-${i}`} className="border-t border-slate-50 hover:bg-slate-50">
                                        <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">{row.style_id}</td>
                                        <td className="py-2 px-3 text-slate-700">{row.category}</td>
                                        <td className="py-2 px-3 text-slate-600 text-[11px]">{shoeType}</td>
                                        <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${stBadge}`}>{role}</span></td>
                                        <td className="py-2 px-3 text-slate-600">{row.price_band}</td>
                                        <td className="py-2 px-3 text-center text-slate-500 text-[11px]">{wave.launch_date.slice(0, 10)}</td>
                                        <td className="py-2 px-3 text-right text-slate-600 text-[11px]">{otbPerSku > 0 ? formatMoneyCny(otbPerSku) : '--'}</td>
                                        <td className="py-2 px-3 text-right text-slate-700">{row.forecast_units.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right text-slate-700">{formatMoneyCny(row.forecast_sales)}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{fmt(estGm)}</td>
                                        <td className="py-2 px-3 text-center"><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${launchColor}`}>{launchStatus}</span></td>
                                        <td className="py-2 px-3 text-center"><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${riskColor}`}>{riskLevel}</span></td>
                                        <td className="py-2 px-3 text-slate-600 text-[11px]">{row.suggestion}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!filtered.length && <div className="py-6 text-center text-[11px] text-slate-400">无匹配款式</div>}
                </div>
            )}
        </CollapsibleSection>
    );
}
// ── RELATED MODULE LINKS ──────────────────────────────────────────────────────

function RelatedModuleLinks({ wave, master, onJumpToOtb, onJumpToForecast, onJumpToInventory, onJumpToCashflow, onJumpToProfitLoss, onJumpToChannel, onJumpToCategory }: {
    wave: WaveSummary; master: WaveMasterRecord|undefined;
    onJumpToOtb?: ()=>void; onJumpToForecast?: ()=>void; onJumpToInventory?: ()=>void;
    onJumpToCashflow?: ()=>void; onJumpToProfitLoss?: ()=>void; onJumpToChannel?: ()=>void;
    onJumpToCategory?: ()=>void;
}) {
    const cats = (master?.mainCategoryList ?? Object.keys(wave.category_mix)).join(' + ') || '--';
    const modules = [
        { key:'otb',       icon:'💰', title:'OTB预算',   clr:'bg-sky-50 border-sky-200 hover:bg-sky-100',         tc:'text-sky-700',     relation:'查看波段预算、剩余可买、预算风险', dp:[{l:'波段',v:waveLabel(wave)},{l:'计划SKU',v:String(master?.targetSkuCount??wave.sku_plan)},{l:'OTB预算',v:master?formatMoneyCny(master.planOtbBudget):'--'},{l:'预算状态',v:wave.otb_budget>0?'已同步':'⚠ 未生成'}], onClick:onJumpToOtb },
        { key:'forecast',  icon:'📈', title:'销售预测',   clr:'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', tc:'text-emerald-700', relation:'查看波段预测销售、预测缺口和高风险SKU', dp:[{l:'上市月份',v:fmtDate(wave.launch_date).slice(0,7)},{l:'主推品类',v:cats},{l:'计划销售',v:master?formatMoneyCny(master.planSalesAmount):'--'},{l:'目标售罄',v:master?fmt(master.sellThroughTarget):'--'}], onClick:onJumpToForecast },
        { key:'inventory', icon:'📦', title:'库存健康',   clr:'bg-violet-50 border-violet-200 hover:bg-violet-100',  tc:'text-violet-700',  relation:'查看上一波库存、WOS、库龄、尺码风险', dp:[{l:'新品占比',v:fmt(wave.new_ratio)},{l:'翻单占比',v:master?fmt(master.repeatOrderRatio):'--'},{l:'延续占比',v:master?fmt(master.carryoverRatio):'--'},{l:'售罄目标',v:master?fmt(master.sellThroughTarget):'--'}], onClick:onJumpToInventory },
        { key:'category',  icon:'📋', title:'品类运营',   clr:'bg-teal-50 border-teal-200 hover:bg-teal-100',       tc:'text-teal-700',    relation:'查看品类结构、款宽款深、价格带结构', dp:[{l:'主推品类',v:cats},{l:'款数',v:String(master?.plannedStyleCount??'--')},{l:'价格带',v:(master?.priceBandFocus??[]).map(p=>PRICE_BAND_LABEL[p]??p).join('/')},{l:'建议动作',v:(master?.productRoleFocus??[]).map(r=>PRODUCT_ROLE_LABEL[r]??r).join('+')||'--'}], onClick:onJumpToCategory },
        { key:'pnl',       icon:'💹', title:'损益',       clr:'bg-amber-50 border-amber-200 hover:bg-amber-100',    tc:'text-amber-700',   relation:'查看波段毛利、折扣风险和利润贡献', dp:[{l:'计划销售',v:master?formatMoneyCny(master.planSalesAmount):'--'},{l:'OTB预算',v:master?formatMoneyCny(master.planOtbBudget):'--'},{l:'目标毛利',v:wave.avg_gm_rate>0?fmt(wave.avg_gm_rate):'--'},{l:'销售占比',v:master?fmt(master.salesRatio):'--'}], onClick:onJumpToProfitLoss },
        { key:'cashflow',  icon:'💧', title:'现金流',     clr:'bg-cyan-50 border-cyan-200 hover:bg-cyan-100',       tc:'text-cyan-700',    relation:'查看采购付款压力和现金安全线', dp:[{l:'采购预算',v:master?formatMoneyCny(master.planOtbBudget):'--'},{l:'下单截止',v:master?fmtDate(master.orderDeadline):'--'},{l:'入仓截止',v:master?fmtDate(master.warehouseDeadline):'--'},{l:'到货建议',v:(master?.arrivalSuggestion??'--').slice(0,18)}], onClick:onJumpToCashflow },
        { key:'channel',   icon:'🏪', title:'区域&门店',  clr:'bg-rose-50 border-rose-200 hover:bg-rose-100',       tc:'text-rose-700',    relation:'查看渠道铺货、门店首发和新店需求', dp:[{l:'上市日期',v:fmtDate(wave.launch_date)},{l:'铺货SKU',v:String(master?.targetSkuCount??'--')},{l:'价格带',v:(master?.priceBandFocus??[]).map(p=>PRICE_BAND_LABEL[p]??p).join('/')},{l:'波段角色',v:master?.waveRoleLabel??'--'}], onClick:onJumpToChannel },
    ];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">跨模块联动入口</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">波段企划 → OTB预算 / 销售预测 / 库存健康 / 品类运营 / 损益 / 现金流 / 区域&门店</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {modules.map(m => (
                    <div key={m.key} onClick={m.onClick} className={`rounded-xl border p-3.5 transition-colors ${m.clr} ${m.onClick?'cursor-pointer':'opacity-75'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className={`text-[11px] font-bold ${m.tc}`}>{m.icon} {m.title}</div>
                            {m.onClick && <span className={`text-[10px] ${m.tc}`}>→</span>}
                        </div>
                        <div className={`text-[10px] mb-2 ${m.tc} opacity-80`}>{m.relation}</div>
                        <div className="space-y-0.5">
                            {m.dp.map(dp => (
                                <div key={dp.l} className="flex justify-between text-[10px]">
                                    <span className="text-slate-400 shrink-0">{dp.l}</span>
                                    <span className="font-medium text-slate-600 text-right ml-2 max-w-[110px] truncate" title={dp.v}>{dp.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── L3-⑦ Annual Sales vs OTB ─────────────────────────────────────────────────

function AnnualSalesVsOtb({ waveSummaries, masterMap }: {
    waveSummaries: WaveSummary[]; masterMap: Map<string,WaveMasterRecord>;
}) {
    const sorted = [...waveSummaries].sort((a,b)=>new Date(a.launch_date).getTime()-new Date(b.launch_date).getTime());
    const option = useMemo((): EChartsOption => ({
        animationDuration: 400,
        tooltip: { trigger:'axis', axisPointer:{ type:'shadow' } },
        legend: { top:0, textStyle:{ color:'#64748B', fontSize:11 } },
        grid: { left:52, right:16, top:34, bottom:48 },
        xAxis: { type:'category', data:sorted.map(w=>`${w.season.replace(/^\d{4}-/,'')}-${w.wave}`), axisLabel:{ color:'#64748B', fontSize:11 }, axisLine:{ lineStyle:{ color:'#E5E7EB' } }, axisTick:{ alignWithLabel:true } },
        yAxis: { type:'value', name:'万元', nameTextStyle:{ color:'#64748B', fontSize:11 }, axisLabel:{ color:'#64748B', fontSize:11 }, splitLine:{ lineStyle:{ color:'#E5E7EB', type:'dashed' } } },
        series: [
            { name:'OTB 预算', type:'bar', barMaxWidth:20, barGap:'20%', itemStyle:{ color:'#CBD5E1', borderRadius:[4,4,0,0] }, data:sorted.map(w=>{ const m=masterMap.get(w.id); return m?(m.planOtbBudget/10000).toFixed(0):0; }) },
            { name:'计划销售额', type:'bar', barMaxWidth:20, barGap:'20%', itemStyle:{ color:'#3B82F6', borderRadius:[4,4,0,0] }, data:sorted.map(w=>{ const m=masterMap.get(w.id); return m?(m.planSalesAmount/10000).toFixed(0):0; }) },
            { name:'实际销售', type:'line', smooth:true, symbol:'circle', symbolSize:6, lineStyle:{ width:2, color:'#10B981' }, itemStyle:{ color:'#10B981' }, data:sorted.map(w=>(w.actual_sales/10000).toFixed(0)) },
        ],
    }), [sorted, masterMap]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionTitle title="全年波段 销售 vs OTB 预算" sub="OTB灰柱 / 计划销售蓝柱 / 实际销售绿线" />
            <ReactECharts option={option} style={{ height:280 }} notMerge />
        </div>
    );
}

// ── L3-⑫ Output to Downstream ─────────────────────────────────────────────────

function OutputToDownstream({ wave, master }: { wave: WaveSummary; master: WaveMasterRecord|undefined }) {
    const cats = (master?.mainCategoryList ?? Object.keys(wave.category_mix)).join(' + ') || '--';
    const priceB = (master?.priceBandFocus??[]).map(p=>PRICE_BAND_LABEL[p]??p).join(' / ');
    const outputs = [
        { target:'OTB 预算', icon:'💰', bg:'bg-sky-50 border-sky-200', title:'text-sky-700', syncStatus: wave.otb_budget>0?'✅ 已推送':'🟡 待推送', items:[
            { l:'波段', v:waveLabel(wave) }, { l:'计划款数', v:String(master?.plannedStyleCount??'--') },
            { l:'目标SKU', v:String(master?.targetSkuCount??wave.sku_plan) },
            { l:'采购预算', v:master?formatMoneyCny(master.planOtbBudget):'--' },
            { l:'销售占比', v:master?fmt(master.salesRatio):'--' },
        ]},
        { target:'销售预测', icon:'📈', bg:'bg-emerald-50 border-emerald-200', title:'text-emerald-700', syncStatus:'🟡 待推送', items:[
            { l:'上市月份', v:fmtDate(wave.launch_date).slice(0,7) },
            { l:'主推品类', v:cats }, { l:'价格带', v:priceB },
            { l:'计划销售额', v:master?formatMoneyCny(master.planSalesAmount):'--' },
            { l:'目标售罄率', v:master?fmt(master.sellThroughTarget):'--' },
        ]},
        { target:'现金流', icon:'🏭', bg:'bg-amber-50 border-amber-200', title:'text-amber-700', syncStatus:'🟡 待推送', items:[
            { l:'采购预算', v:master?formatMoneyCny(master.planOtbBudget):'--' },
            { l:'下单截止', v:master?fmtDate(master.orderDeadline):'--' },
            { l:'入仓截止', v:master?fmtDate(master.warehouseDeadline):'--' },
            { l:'到仓建议', v:master?.arrivalSuggestion??'--' },
        ]},
        { target:'库存健康', icon:'📦', bg:'bg-violet-50 border-violet-200', title:'text-violet-700', syncStatus:'🟡 待推送', items:[
            { l:'新品占比', v:fmt(wave.new_ratio) },
            { l:'翻单占比', v:master?fmt(master.repeatOrderRatio):'--' },
            { l:'延续占比', v:master?fmt(master.carryoverRatio):'--' },
            { l:'清货建议', v:wave.new_ratio<0.5?'建议增加新品比例':'结构健康，维持计划' },
        ]},
    ];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <SectionTitle title="企划输出" sub="本波段企划数据流向下游系统" />
                <button className="text-[11px] px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">
                    一键推送全部 →
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {outputs.map(o=>(
                    <div key={o.target} className={`rounded-xl border p-3.5 ${o.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className={`text-[11px] font-bold ${o.title}`}>{o.icon} 输出至 {o.target}</div>
                            <span className="text-[10px]">{o.syncStatus}</span>
                        </div>
                        {o.items.map(it=>(
                            <div key={it.l} className="flex justify-between text-[11px] py-0.5 border-b border-white/40 last:border-0">
                                <span className="text-slate-500 shrink-0">{it.l}</span>
                                <span className="font-medium text-slate-700 text-right ml-2 max-w-[140px] truncate" title={it.v}>{it.v}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── L3-⑬ Launch Calendar + Historical Compare ─────────────────────────────────

function LaunchCalendar({ wavesByQ, masterMap, today, activeId, onSelect }: {
    wavesByQ: Record<'Q1'|'Q2'|'Q3'|'Q4', WaveSummary[]>;
    masterMap: Map<string,WaveMasterRecord>; today: Date; activeId: string;
    onSelect: (id: string) => void;
}) {
    const [showHistory, setShowHistory] = useState(false);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <SectionTitle title="波段上市日历" sub="全年Q1-Q4波段概览 · 点击卡片切换波段" />
                <button onClick={()=>setShowHistory(v=>!v)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${showHistory?'bg-slate-900 text-white border-slate-900':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {showHistory?'当年视图':'对比历史 LY'}
                </button>
            </div>
            {showHistory && (
                <div className="mb-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-700">
                    📊 历史对比模式：卡片下方显示去年同期波段达成率。暂无 LY 数据时显示 &quot;—&quot;。
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {(['Q1','Q2','Q3','Q4'] as const).map(q=>(
                    <div key={q}>
                        <div className="text-[11px] font-semibold text-slate-500 border-b border-slate-100 pb-1.5 mb-2">{q}</div>
                        {wavesByQ[q].length===0
                            ? <div className="text-[11px] text-slate-300 py-2">暂无波段</div>
                            : wavesByQ[q].map(w=>{
                                const status = resolveWaveStatus(w.launch_date, w.sku_plan, w.sku_actual, today);
                                const sc = STATUS_CFG[status];
                                const master = masterMap.get(w.id);
                                const isActive = w.id===activeId;
                                const hasRisk = status==='异常延期' || (daysTo(w.launch_date,today)>=0&&daysTo(w.launch_date,today)<14&&w.sku_actual===0&&w.sku_plan>0);
                                // Mark upcoming 4 waves in red border
                                const days = daysTo(w.launch_date, today);
                                const isUpcoming = days>=0 && days<=60;
                                return (
                                    <button key={w.id} onClick={()=>onSelect(w.id)}
                                        className={`w-full text-left rounded-xl border p-2.5 mb-1.5 transition-all text-[11px] ${isActive?'ring-2 ring-slate-900 border-slate-200 bg-slate-50 shadow-sm':`${sc.badge} hover:shadow-sm`} ${isUpcoming&&!isActive?'border-rose-300':''}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-800">{waveLabel(w)}</span>
                                            <span className="flex items-center gap-1 text-[9px]"><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{status}</span>
                                        </div>
                                        <div className="text-[10px] space-y-0.5 text-slate-500">
                                            <div>上市 {fmtMD(w.launch_date)} · {master?.waveRoleLabel??''}</div>
                                            <div>主推：{(master?.mainCategoryList??[]).join('/')|| Object.keys(w.category_mix)[0]||'--'}</div>
                                            <div>计划SKU {master?.targetSkuCount??w.sku_plan}</div>
                                            {hasRisk && <div className="text-rose-600 font-medium">⚠ 风险</div>}
                                        </div>
                                        {showHistory && (
                                            <div className="mt-1.5 pt-1.5 border-t border-white/50 text-[10px] text-slate-400">
                                                LY 同期：售罄 — · 达成 —
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        }
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── L3-⑭ Style Details (full list with search/filter/sort) ────────────────────

function StyleDetails({ wave }: { wave: WaveSummary }) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<'all'|'main'|'test'|'clearance'>('all');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'forecast_sales'|'suggested_depth'|'forecast_units'>('forecast_sales');
    const [sortAsc, setSortAsc] = useState(false);

    const filtered = useMemo(()=>{
        let rows = wave.drill_rows.filter(r=>{
            if (filter==='main') return resolvePlanningRole(r.suggestion)==='Hero/Core';
            if (filter==='test') return resolvePlanningRole(r.suggestion)==='Test';
            if (filter==='clearance') return resolvePlanningRole(r.suggestion)==='Clearance';
            return true;
        });
        if (search) rows = rows.filter(r=>r.style_id.toLowerCase().includes(search.toLowerCase())||r.category.toLowerCase().includes(search.toLowerCase()));
        rows = [...rows].sort((a,b)=>{
            const av = (a as unknown as Record<string,number>)[sortBy] ?? 0;
            const bv = (b as unknown as Record<string,number>)[sortBy] ?? 0;
            return sortAsc ? av-bv : bv-av;
        });
        return rows;
    }, [wave, filter, search, sortBy, sortAsc]);

    const toggleSort = useCallback((col: typeof sortBy) => {
        if (sortBy===col) setSortAsc(v=>!v);
        else { setSortBy(col); setSortAsc(false); }
    }, [sortBy]);

    return (
        <CollapsibleSection
            title={`款式企划明细（${wave.drill_rows.length} 款，查看全部）`}
            subtitle="默认折叠 · 含搜索/筛选/排序 · 含鞋类专属列"
            open={open} onToggle={()=>setOpen(v=>!v)}>
            <div className="px-5 py-3 border-b border-slate-50 flex flex-wrap items-center gap-2">
                <input placeholder="搜索款号/品类…" value={search} onChange={e=>setSearch(e.target.value)}
                    className="text-[11px] border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 w-40 focus:outline-none focus:border-sky-400" />
                {(['all','main','test','clearance'] as const).map(f=>(
                    <button key={f} onClick={()=>setFilter(f)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${filter===f?'bg-slate-800 text-white border-slate-800':'text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                        {f==='all'?`全部(${wave.drill_rows.length})`:f==='main'?'主推/形象':f==='test'?'测试款':'清尾款'}
                    </button>
                ))}
            </div>
            {wave.drill_rows.length===0
                ? <div className="px-5 py-6 text-[11px] text-slate-400 text-center">暂无款式数据</div>
                : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    {[
                                        { label:'款号', col:null, align:'left' },
                                        { label:'品类', col:null, align:'left' },
                                        { label:'价格带', col:null, align:'left' },
                                        { label:'货品角色', col:null, align:'left' },
                                        { label:'建议深度', col:'suggested_depth' as const, align:'right' },
                                        { label:'预估销量', col:'forecast_units' as const, align:'right' },
                                        { label:'预估销额', col:'forecast_sales' as const, align:'right' },
                                        { label:'加价倍率', col:null, align:'right' },
                                        { label:'目标毛利', col:null, align:'right' },
                                        { label:'试穿优先', col:null, align:'right' },
                                        { label:'建议动作', col:null, align:'left' },
                                    ].map(h=>(
                                        <th key={h.label}
                                            className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${h.align==='right'?'text-right':'text-left'} ${h.col?'cursor-pointer hover:text-slate-700':''}`}
                                            onClick={h.col?()=>toggleSort(h.col!):undefined}>
                                            {h.label}{h.col&&sortBy===h.col?(sortAsc?' ↑':' ↓'):''}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row, i)=>{
                                    const role = resolvePlanningRole(row.suggestion);
                                    const fitPriority = role==='Hero/Core'?'🔥 高':role==='Test'?'🟡 中':'— 低';
                                    // estimate markup and margin from price_band
                                    const estMarkup = row.price_band==='image'?4.5:row.price_band==='profit'?3.8:row.price_band==='volume'?3.2:2.8;
                                    const estGm = row.price_band==='image'?0.58:row.price_band==='profit'?0.48:row.price_band==='volume'?0.42:0.35;
                                    return (
                                        <tr key={`${wave.id}-${row.style_id}-${i}`} className="border-t border-slate-50 hover:bg-slate-50">
                                            <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">{row.style_id}</td>
                                            <td className="py-2 px-3 text-slate-700">{row.category}</td>
                                            <td className="py-2 px-3 text-slate-600">{row.price_band}</td>
                                            <td className="py-2 px-3 text-slate-600 text-[10px]">{role}</td>
                                            <td className="py-2 px-3 text-right text-slate-700">{row.suggested_depth}</td>
                                            <td className="py-2 px-3 text-right text-slate-700">{row.forecast_units.toLocaleString()}</td>
                                            <td className="py-2 px-3 text-right text-slate-700">{formatMoneyCny(row.forecast_sales)}</td>
                                            <td className="py-2 px-3 text-right text-slate-600">{estMarkup.toFixed(1)}×</td>
                                            <td className="py-2 px-3 text-right text-slate-600">{fmt(estGm)}</td>
                                            <td className="py-2 px-3 text-right text-slate-600 text-[10px]">{fitPriority}</td>
                                            <td className="py-2 px-3 text-slate-600 text-[11px]">{row.suggestion}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length===0 && <div className="py-6 text-center text-[11px] text-slate-400">无匹配款式</div>}
                    </div>
                )
            }
        </CollapsibleSection>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

const ic = 'w-2.5 h-2.5';
const WAVE_PAGE_SECTIONS = [
  { anchor: '#wave-overview', label: '波段摘要', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1.5" /><line x1="1" y1="7" x2="15" y2="7" /></svg>) },
  { anchor: '#wave-timeline', label: '波段时序', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="8" x2="15" y2="8" /><circle cx="4" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#wave-structure', label: '品类结构', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" /><rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.7" /><rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#wave-execution', label: '执行跨模', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,8 6.5,12 14,4" /></svg>) },
  { anchor: '#wave-links', label: '跨模块', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="3" cy="8" r="2" /><circle cx="13" cy="5" r="2" /><circle cx="13" cy="11" r="2" /><line x1="5" y1="7.5" x2="11" y2="5.5" /><line x1="5" y1="8.5" x2="11" y2="10.5" /></svg>) },
];

export default function WavePlanningPanel({ compareMode='none', filters, onJumpToOtb, onJumpToSkuRisk, onJumpToExecution, onJumpToForecast, onJumpToInventory, onJumpToCashflow, onJumpToProfitLoss, onJumpToChannel, onJumpToCategory }: WavePlanningPanelProps) {
    void compareMode; void onJumpToSkuRisk;

    const planningFilters = useMemo(()=>filters?{ ...filters, wave:'all' as const }:filters, [filters]);
    const wavePlanningData = useWavePlanning(planningFilters);
    const { waveSummaries, stackCategories, stackRows, regionTempRows, regionSeriesMap, regionOptions, dataScopeHint } = wavePlanningData;
    void stackCategories; void dataScopeHint;

    const today = useMemo(()=>new Date(), []);

    const masterMap = useMemo(()=>{
        const m = new Map<string,WaveMasterRecord>();
        (wavePlanMasterRaw as WaveMasterRecord[]).forEach(r=>m.set(r.waveKey, r));
        return m;
    }, []);

    const briefMap = useMemo(()=>{
        const m = new Map<string,WaveBriefRecord>();
        (wavePlanBriefRaw as WaveBriefRecord[]).forEach(r=>m.set(r.waveKey, r));
        return m;
    }, []);

    const devProgressMap = useMemo(()=>{
        const m = new Map<string,WaveDevProgress>();
        (waveDevProgressRaw as WaveDevProgress[]).forEach(r=>m.set(r.waveKey, r));
        return m;
    }, []);

    const sizeCurves = sizeCurvesRaw as SizeCurveData[];
    const returnRates = returnRatesRaw as ReturnRateData[];
    const tempWindows = temperatureWindowsRaw as TemperatureWindow[];

    const [selectedWaveId, setSelectedWaveId] = useState('');
    const [matrixView, setMatrixView] = useState<MatrixView>('category_price');
    const [annualChartOpen, setAnnualChartOpen] = useState(false);

    const autoWaveId = useMemo(()=>getAutoWaveId(waveSummaries, today), [waveSummaries, today]);
    const effectiveWaveId = useMemo(()=>waveSummaries.some(w=>w.id===selectedWaveId)?selectedWaveId:(autoWaveId||waveSummaries[0]?.id||''), [selectedWaveId, autoWaveId, waveSummaries]);

    const activeWave = useMemo(()=>waveSummaries.find(w=>w.id===effectiveWaveId)||waveSummaries[0]||null, [effectiveWaveId, waveSummaries]);
    const activeMaster = useMemo(()=>activeWave?masterMap.get(activeWave.id):undefined, [activeWave, masterMap]);
    const activeBrief = useMemo(()=>activeWave?briefMap.get(activeWave.id):undefined, [activeWave, briefMap]);

    const wavesByQ = useMemo(()=>{
        const g: Record<'Q1'|'Q2'|'Q3'|'Q4', WaveSummary[]> = { Q1:[],Q2:[],Q3:[],Q4:[] };
        waveSummaries.forEach(w=>{ const m=new Date(w.launch_date).getMonth()+1; g[m<=3?'Q1':m<=6?'Q2':m<=9?'Q3':'Q4'].push(w); });
        return g;
    }, [waveSummaries]);

    const mainCategories = useMemo(()=>activeMaster?.mainCategoryList??Object.keys(activeWave?.category_mix??{}), [activeMaster, activeWave]);

    // Build general risk actions
    const generalRisks = useMemo(()=>{
        const risks: Array<{id:string;priority:'P0'|'P1'|'P2';wave:string;reason:string;impact:string;action:string;owner:string;deadline:string}> = [];
        waveSummaries.forEach(w=>{
            const master = masterMap.get(w.id);
            const wl = waveLabel(w);
            const days = daysTo(w.launch_date, today);
            const lr = safeDiv(w.sku_actual, w.sku_plan);
            if (days>=0&&days<14&&w.sku_actual===0&&w.sku_plan>0)
                risks.push({ id:`${w.id}-no-land`,priority:'P0',wave:wl,reason:`距上市仅 ${days} 天，落地记录为零`,impact:`${w.sku_plan} SKU 断货风险`,action:'立即追踪入库情况',owner:'运营/物流',deadline:w.launch_date });
            if (w.otb_budget===0&&days>0&&days<90)
                risks.push({ id:`${w.id}-no-otb`,priority:'P1',wave:wl,reason:'OTB预算未生成',impact:master?`影响 ${formatMoneyCny(master.planSalesAmount)} 采购预算`:'',action:'前往OTB模块生成预算',owner:'商品企划/财务',deadline:master?.orderDeadline??'' });
            if (days<0&&w.sku_plan>0&&lr<0.85&&lr>0)
                risks.push({ id:`${w.id}-low-land`,priority:'P1',wave:wl,reason:`落地率 ${fmt(lr)} 偏低`,impact:`未落地 ${w.sku_plan-w.sku_actual} 款`,action:'追踪未落地款式，评估销售方案',owner:'商品企划',deadline:'' });
        });
        return risks;
    }, [waveSummaries, masterMap, today]);

    // Footwear-specific risks for active wave
    const footwearRisks = useMemo(()=>{
        if (!activeWave) return [];
        const snap: WaveSnapshot = {
            waveKey: activeWave.id,
            waveLabel: waveLabel(activeWave),
            launchDate: activeWave.launch_date,
            daysToLaunch: daysTo(activeWave.launch_date, today),
            plannedStyleCount: activeMaster?.plannedStyleCount ?? activeWave.drill_rows.length,
            targetSkuCount: activeMaster?.targetSkuCount ?? activeWave.sku_plan,
            newRatio: activeWave.new_ratio,
            landingRate: safeDiv(activeWave.sku_actual, activeWave.sku_plan),
            otbBudget: activeWave.otb_budget,
            planOtbBudget: activeMaster?.planOtbBudget ?? 0,
            orderDeadline: activeMaster?.orderDeadline,
            waveRole: activeMaster?.waveRole,
        };
        const tempChecks = checkTemperatureWindow(new Date(activeWave.launch_date).getMonth()+1, '全国', tempWindows, mainCategories);
        return generateFootwearRisks(undefined, undefined, undefined, tempChecks, 0.55);
    }, [activeWave, activeMaster, mainCategories, tempWindows, today]);

    // Decision actions for active wave
    const decisions = useMemo(()=>{
        if (!activeWave) return { reorder:null, cut:null, addColor:null, syncDownstream:{ type:'syncDownstream' as const, label:'下游同步', urgency:'P2' as const, summary:'OTB 已同步', recommendation:'检查采购/现金流同步状态' } };
        const snap: WaveSnapshot = {
            waveKey:activeWave.id, waveLabel:waveLabel(activeWave), launchDate:activeWave.launch_date,
            daysToLaunch:daysTo(activeWave.launch_date, today),
            plannedStyleCount:activeMaster?.plannedStyleCount??activeWave.drill_rows.length,
            targetSkuCount:activeMaster?.targetSkuCount??activeWave.sku_plan,
            newRatio:activeWave.new_ratio,
            landingRate:safeDiv(activeWave.sku_actual, activeWave.sku_plan),
            otbBudget:activeWave.otb_budget,
            planOtbBudget:activeMaster?.planOtbBudget??0,
            orderDeadline:activeMaster?.orderDeadline,
            waveRole:activeMaster?.waveRole,
        };
        return generateWaveDecisionActions(snap);
    }, [activeWave, activeMaster, today]);

    if (!activeWave) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">暂无波段企划数据</div>;
    }

    return (
        <div className="space-y-4 pb-16">
            <section id="wave-overview" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="A" title="波段決策总览" />
            {/* 1. Page Header */}
            <PageHeader activeWave={activeWave} autoWaveId={autoWaveId} riskActions={generalRisks} footwearRisks={footwearRisks} onJumpToOtb={onJumpToOtb} />

            {/* 2. Wave Decision Summary — 8 KPI cards */}
            <WaveDecisionKpis wave={activeWave} master={activeMaster} devProgressMap={devProgressMap} today={today} />

            {/* 2.5. Wave Decision Summary */}
            <WaveDecisionSummaryCard wave={activeWave} master={activeMaster} devProgressMap={devProgressMap} today={today} footwearRisks={footwearRisks} onJumpToOtb={onJumpToOtb} />

            </section>

            <section id="wave-timeline" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="B" title="波段时序" />
            {/* 3. Wave Timeline */}
            <WaveTimeline waves={waveSummaries} masterMap={masterMap} activeId={effectiveWaveId} autoId={autoWaveId} today={today} onSelect={setSelectedWaveId} />

            </section>

            <section id="wave-structure" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="C" title="企划结构与设计方向" />
            {/* 4. Wave Positioning */}
            <WavePositioningPanel master={activeMaster} brief={activeBrief} />

            {/* 5. Design Direction Board */}
            <DesignDirectionBoard brief={activeBrief} master={activeMaster} />

            {/* 6. SKU Role Mix */}
            <SkuRoleMixPanel master={activeMaster} wave={activeWave} />

            {/* 7. Category / Price / Size Architecture */}
            <CategoryMatrix wave={activeWave} view={matrixView} onViewChange={setMatrixView} />
            <SkuStructureV7 wave={activeWave} master={activeMaster} brief={activeBrief} sizeCurves={sizeCurves} returnRates={returnRates} />

            </section>

            <section id="wave-execution" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="D" title="执行跨模" />
            {/* 8. Sales Forecast & OTB Fit */}
            <ForecastOtbFitPanel wave={activeWave} master={activeMaster} onJumpToOtb={onJumpToOtb} onJumpToForecast={onJumpToForecast} />

            {/* 9. Inventory & Previous Wave Conflict */}
            <InventoryConflictPanel wave={activeWave} allWaves={waveSummaries} master={activeMaster} onJumpToInventory={onJumpToInventory} />

            {/* 10. Launch Readiness */}
            <LaunchReadinessPanel waveKey={activeWave.id} devProgressMap={devProgressMap} wave={activeWave} today={today} onJumpToExecution={onJumpToExecution} />

            {/* 11. Wave Action Center */}
            <WaveActionCenter wave={activeWave} master={activeMaster} today={today} onJumpToOtb={onJumpToOtb} onJumpToForecast={onJumpToForecast} onJumpToInventory={onJumpToInventory} />

            </section>

            <section id="wave-links" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="E" title="SKU列表与跨模块" />
            {/* 12. SKU Line List */}
            <WaveSkuLineList wave={activeWave} master={activeMaster} />

            {/* 13. Related Module Links */}
            <RelatedModuleLinks wave={activeWave} master={activeMaster} onJumpToOtb={onJumpToOtb} onJumpToForecast={onJumpToForecast} onJumpToInventory={onJumpToInventory} onJumpToCashflow={onJumpToCashflow} onJumpToProfitLoss={onJumpToProfitLoss} onJumpToChannel={onJumpToChannel} onJumpToCategory={onJumpToCategory} />

            {/* Optional: Annual chart + Temperature window + Launch Calendar (collapsed context) */}
            {stackRows.length > 0 && (
                <TemperatureWindowChart stackRows={stackRows} regionTempRows={regionTempRows} regionSeriesMap={regionSeriesMap} regionOptions={regionOptions} tempWindows={tempWindows} mainCategories={mainCategories} />
            )}
            <CollapsibleSection title="全年波段 销售 vs OTB 概览" subtitle="年度对比图" open={annualChartOpen} onToggle={() => setAnnualChartOpen(v => !v)}>
                <div className="p-5"><AnnualSalesVsOtb waveSummaries={waveSummaries} masterMap={masterMap} /></div>
            </CollapsibleSection>
            <LaunchCalendar wavesByQ={wavesByQ} masterMap={masterMap} today={today} activeId={effectiveWaveId} onSelect={setSelectedWaveId} />
            </section>

            <FloatingModuleNav
                moduleLinks={buildMerchModuleLinks('planning')}
                pageSections={WAVE_PAGE_SECTIONS}
            />
        </div>
    );
}