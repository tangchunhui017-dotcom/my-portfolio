'use client';
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
    planSalesAmount: number; salesRatio: number; planOtbBudget: number;
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
    onJumpToExecution?: () => void;
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

export default function WavePlanningPanel({ compareMode='none', filters, onJumpToOtb, onJumpToSkuRisk, onJumpToExecution }: WavePlanningPanelProps) {
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

            {/* ── L1 决策层 ── */}
            <PageHeader activeWave={activeWave} autoWaveId={autoWaveId} riskActions={generalRisks} footwearRisks={footwearRisks} onJumpToOtb={onJumpToOtb} />
            <WaveTimeline waves={waveSummaries} masterMap={masterMap} activeId={effectiveWaveId} autoId={autoWaveId} today={today} onSelect={setSelectedWaveId} />
            <DecisionSummaryV7 wave={activeWave} master={activeMaster} today={today} decisions={decisions} onJumpToOtb={onJumpToOtb} />
            <FootwearRiskBoard generalRisks={generalRisks} footwearRisks={footwearRisks} onJumpToExecution={onJumpToExecution} />

            {/* ── L2 验证层 ── */}
            <PlanningBriefV7 brief={activeBrief} master={activeMaster} />
            <SkuStructureV7 wave={activeWave} master={activeMaster} brief={activeBrief} sizeCurves={sizeCurves} returnRates={returnRates} />
            <CategoryMatrix wave={activeWave} view={matrixView} onViewChange={setMatrixView} />
            <DevProgressGate waveKey={activeWave.id} devProgressMap={devProgressMap} onJumpToExecution={onJumpToExecution} />
            {stackRows.length>0 && (
                <TemperatureWindowChart
                    stackRows={stackRows} regionTempRows={regionTempRows}
                    regionSeriesMap={regionSeriesMap} regionOptions={regionOptions}
                    tempWindows={tempWindows} mainCategories={mainCategories}
                />
            )}

            {/* ── L3 钻取层 ── */}
            <LaunchCalendar wavesByQ={wavesByQ} masterMap={masterMap} today={today} activeId={effectiveWaveId} onSelect={setSelectedWaveId} />
            <AnnualSalesVsOtb waveSummaries={waveSummaries} masterMap={masterMap} />
            <OutputToDownstream wave={activeWave} master={activeMaster} />
            <StyleDetails wave={activeWave} />

        </div>
    );
}