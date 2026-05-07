'use client';

import { useState, useSyncExternalStore } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { formatMoneyCny } from '@/config/numberFormat';
import { useMonthlyAchievementData } from '@/hooks/useMonthlyAchievementData';
import { THRESHOLDS } from '@/config/thresholds';


// ─── 类型 ─────────────────────────────────────────────────────────────────────

type MainView = 'sales' | 'delta';
type Tone = 'neutral' | 'blue' | 'green' | 'yellow' | 'red';

type CardItem = { title: string; value: string; detail?: string; tone?: Tone };
type PillItem = { label: string; value: string; tone?: Tone };
type TooltipParam = {
  axisValue?: string | number;
  marker?: string;
  seriesName?: string;
  value?: string | number | null;
};

type Props = {
  filters: DashboardFilters;
  compareMode: CompareMode;
};

// ─── 格式化工具 ───────────────────────────────────────────────────────────────

const fmtAmt = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return formatMoneyCny(value);
};

const fmtSignedAmt = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return (value > 0 ? '+' : '') + formatMoneyCny(value);
};

const fmtPct = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return `${(value * 100).toFixed(digits)}%`;
};

const fmtSignedPct = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
};

const fmtAxisAmt = (value: number) => `${Math.round(value / 10000)}万`;
const compareLabel = (mode: CompareMode) =>
  mode === 'plan' ? '计划' : mode === 'yoy' ? '同比' : mode === 'mom' ? '环比' : '当前';

const toTooltipParams = (params: unknown): TooltipParam[] => {
  if (Array.isArray(params)) return params as TooltipParam[];
  return params ? [params as TooltipParam] : [];
};

const escapeCsvCell = (value: string | number) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const exportCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
  const csvRows = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
  const csv = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// ─── 状态判断 ─────────────────────────────────────────────────────────────────

function getWosStatus(wos: number | null) {
  if (wos === null || Number.isNaN(wos)) return { label: '待补库存口径', tone: 'neutral' as Tone };
  if (wos > THRESHOLDS.wos.overstocked) return { label: '积压风险', tone: 'red' as Tone };
  if (wos > THRESHOLDS.wos.healthy) return { label: '库存偏高', tone: 'yellow' as Tone };
  if (wos >= THRESHOLDS.wos.stockout) return { label: '库存健康', tone: 'blue' as Tone };
  return { label: '断货风险', tone: 'red' as Tone };
}

function getSellThroughStatus(st: number | null) {
  if (st === null || Number.isNaN(st)) return { label: '待补售罄口径', tone: 'neutral' as Tone };
  if (st >= 0.75) return { label: '售罄健康', tone: 'green' as Tone };
  if (st >= 0.55) return { label: '售罄平稳', tone: 'blue' as Tone };
  if (st >= 0.35) return { label: '售罄承压', tone: 'yellow' as Tone };
  return { label: '售罄偏弱', tone: 'red' as Tone };
}

function deltaTone(value: number | null | undefined): Tone {
  if (value === null || value === undefined || Number.isNaN(value)) return 'neutral';
  if (value > 0) return 'blue';
  if (value < 0) return 'red';
  return 'neutral';
}

// ─── UI 小组件 ────────────────────────────────────────────────────────────────

function statAccent(tone: Tone = 'neutral') {
  if (tone === 'blue') return 'bg-blue-500';
  if (tone === 'green') return 'bg-emerald-500';
  if (tone === 'yellow') return 'bg-amber-500';
  if (tone === 'red') return 'bg-[#E11D48]';
  return 'bg-slate-200';
}

function StatCard({ title, value, detail, tone = 'neutral' }: CardItem) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-2xl ring-1 ring-white/60 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-5 transition-all duration-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div className={`absolute top-0 left-0 w-1.5 h-full opacity-90 ${statAccent(tone)}`} />
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</div>
      <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{value}</div>
      {detail ? <div className="mt-1.5 text-[12px] font-medium leading-relaxed text-slate-500">{detail}</div> : null}
    </div>
  );
}

function SummaryPill({ label, value, tone = 'neutral' }: PillItem) {
  const badgeColors: Record<Tone, string> = {
    blue: 'ring-blue-200/50 bg-blue-50/80 text-blue-700',
    green: 'ring-emerald-200/50 bg-emerald-50/80 text-emerald-700',
    yellow: 'ring-amber-200/50 bg-amber-50/80 text-amber-700',
    red: 'ring-rose-200/50 bg-rose-50/80 text-rose-700',
    neutral: 'ring-slate-200/50 bg-slate-50 text-slate-600',
  };
  return (
    <div className={`inline-flex items-center gap-2.5 rounded-full ring-1 ring-inset px-4 py-1.5 text-[13px] backdrop-blur-md transition-shadow ${badgeColors[tone]}`}>
      <span className="font-medium opacity-70 tracking-wide">{label}</span>
      <span className="font-extrabold tracking-tight">{value}</span>
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400">
      图表加载中
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function MonthlyAchievementPanel({
  filters,
  compareMode,
}: Props) {
  const {
    selectedYear,
    selectedMonth,
    monthlyRows,
    hasAnyData,
    totalActual,
    totalTarget,
    totalLy,
    annualAchievement,
    annualGap,
    annualYoyDiff,
    annualYoyRate,
    latestActiveRow,
    focusRow,
    focusDriverSummary,
  } = useMonthlyAchievementData(filters, compareMode);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [mainView, setMainView] = useState<MainView>('delta');
  const [detailExpanded, setDetailExpanded] = useState(false);

  const effectiveMainView: MainView = compareMode === 'none' ? 'sales' : mainView;
  const isAnnualView = selectedMonth === null;
  const focusLabel = isAnnualView ? '全年' : focusRow.label;

  // ─── 衍生状态 ──────────────────────────────────────────────────────────────

  const latestMomRow = [...monthlyRows].reverse().find((row) => row.momDiff !== null) || latestActiveRow;
  const topActualRow = [...monthlyRows].sort((a, b) => b.actual - a.actual)[0] || focusRow;
  const mismatchRow = [...monthlyRows].sort((a, b) => (b.stockWeight - b.salesWeight) - (a.stockWeight - a.salesWeight))[0] || focusRow;
  const worstPlanRow = [...monthlyRows].filter((row) => row.gap !== null).sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))[0] || null;
  const worstYoyRow = [...monthlyRows].filter((row) => row.yoyDiff !== null).sort((a, b) => (a.yoyDiff ?? 0) - (b.yoyDiff ?? 0))[0] || null;
  const worstMomRow = [...monthlyRows].filter((row) => row.momDiff !== null).sort((a, b) => (a.momDiff ?? 0) - (b.momDiff ?? 0))[0] || null;
  const latestWosStatus = getWosStatus(latestActiveRow.wos);
  const focusWosStatus = getWosStatus(focusRow.wos);
  const focusStStatus = getSellThroughStatus(focusRow.st);

  const riskMonthCount = monthlyRows.filter((row) => {
    if (compareMode === 'plan') return (row.gap ?? 0) < 0;
    if (compareMode === 'yoy') return (row.yoyDiff ?? 0) < 0;
    if (compareMode === 'mom') return (row.momDiff ?? 0) < 0;
    return row.stockWeight - row.salesWeight > 0.08 || getWosStatus(row.wos).tone === 'red';
  }).length;

  const focusStatus = (() => {
    if (compareMode === 'plan') return ((isAnnualView ? annualGap : focusRow.gap) ?? 0) >= 0 ? '计划超额' : '计划承压';
    if (compareMode === 'yoy') return ((isAnnualView ? annualYoyDiff : focusRow.yoyDiff) ?? 0) >= 0 ? '趋势走强' : '趋势回落';
    if (compareMode === 'mom') return ((isAnnualView ? latestMomRow.momDiff : focusRow.momDiff) ?? 0) >= 0 ? '承接走强' : '承接转弱';
    const mismatchGap = focusRow.stockWeight - focusRow.salesWeight;
    const wosTone = getWosStatus(focusRow.wos).tone;
    if (wosTone === 'red' || mismatchGap > 0.08) return '库存承压';
    if (wosTone === 'yellow') return '节奏偏紧';
    return '节奏健康';
  })();

  const comparisonRows = monthlyRows.map((row) => ({
    ...row,
    referenceValue: compareMode === 'plan' ? row.target : compareMode === 'yoy' ? row.ly : compareMode === 'mom' ? row.prevActual : null,
    deltaValue: compareMode === 'plan' ? row.gap : compareMode === 'yoy' ? row.yoyDiff : compareMode === 'mom' ? row.momDiff : null,
    isFocus: selectedMonth !== null && row.month === focusRow.month,
  }));

  const currentDeltaValue = compareMode === 'plan' ? focusRow.gap : compareMode === 'yoy' ? focusRow.yoyDiff : compareMode === 'mom' ? focusRow.momDiff : null;
  const annualDeltaValue = compareMode === 'plan' ? annualGap : compareMode === 'yoy' ? annualYoyDiff : compareMode === 'mom' ? latestMomRow.momDiff : null;

  // ─── KPI 卡片数据 ──────────────────────────────────────────────────────────

  const statCards: CardItem[] = compareMode === 'none'
    ? isAnnualView
      ? [
          { title: '当前视角', value: '全年', detail: `${selectedYear}年 12 个月概览` },
          { title: '累计销售额', value: fmtAmt(totalActual), detail: `月均 ${fmtAmt(totalActual / 12)}` },
          { title: '销售峰值月', value: topActualRow.label, detail: fmtAmt(topActualRow.actual), tone: 'blue' },
          { title: '最新月 WOS', value: latestActiveRow.wos === null ? '--' : `${latestActiveRow.wos.toFixed(1)}w`, detail: `${latestActiveRow.label} · ${latestWosStatus.label}`, tone: latestWosStatus.tone },
          { title: '风险月份', value: `${riskMonthCount}个`, detail: `库存错配月 ${mismatchRow.label}`, tone: riskMonthCount > 0 ? 'red' : 'blue' },
        ]
      : [
          { title: '当前聚焦月', value: focusRow.label, detail: '已按月份锁定当前聚焦月' },
          { title: '当前月销售', value: fmtAmt(focusRow.actual), detail: `全年累计 ${fmtAmt(totalActual)}` },
          { title: '当前月 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
          { title: '当前月 ST%', value: fmtPct(focusRow.st), detail: focusStStatus.label, tone: focusStStatus.tone },
          { title: '风险月份', value: `${riskMonthCount}个`, detail: `库存错配月 ${mismatchRow.label}`, tone: riskMonthCount > 0 ? 'red' : 'blue' },
        ]
    : compareMode === 'plan'
      ? isAnnualView
        ? [
            { title: '当前视角', value: '全年', detail: '按全年累计口径对比计划' },
            { title: '累计达成率', value: fmtPct(annualAchievement), detail: `计划 ${fmtAmt(totalTarget)} / 实际 ${fmtAmt(totalActual)}`, tone: deltaTone(annualGap) },
            { title: '计划差额', value: fmtSignedAmt(annualGap), detail: `最大缺口 ${worstPlanRow?.label || '--'}`, tone: deltaTone(annualGap) },
            { title: '最新月 WOS', value: latestActiveRow.wos === null ? '--' : `${latestActiveRow.wos.toFixed(1)}w`, detail: `${latestActiveRow.label} · ${latestWosStatus.label}`, tone: latestWosStatus.tone },
            { title: '风险月份', value: `${riskMonthCount}个`, detail: '优先处理持续低于计划的月份', tone: riskMonthCount > 0 ? 'red' : 'blue' },
          ]
        : [
            { title: '当前聚焦月', value: focusRow.label, detail: '已按月份锁定当前聚焦月' },
            { title: '当月达成率', value: fmtPct(focusRow.achv), detail: `计划 ${fmtAmt(focusRow.target)} / 实际 ${fmtAmt(focusRow.actual)}`, tone: deltaTone(focusRow.gap) },
            { title: '计划差额', value: fmtSignedAmt(focusRow.gap), detail: `最大缺口 ${worstPlanRow?.label || '--'}`, tone: deltaTone(focusRow.gap) },
            { title: '当前月 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
            { title: '风险月份', value: `${riskMonthCount}个`, detail: '优先处理持续低于计划的月份', tone: riskMonthCount > 0 ? 'red' : 'blue' },
          ]
      : compareMode === 'yoy'
        ? isAnnualView
          ? [
              { title: '当前视角', value: '全年', detail: '按全年累计口径对比去年同期' },
              { title: '累计同比增速', value: fmtSignedPct(annualYoyRate), detail: `去年同期 ${fmtAmt(totalLy)} / 当前 ${fmtAmt(totalActual)}`, tone: deltaTone(annualYoyDiff) },
              { title: '同比差额', value: fmtSignedAmt(annualYoyDiff), detail: `最大回落 ${worstYoyRow?.label || '--'}`, tone: deltaTone(annualYoyDiff) },
              { title: '最新月 WOS', value: latestActiveRow.wos === null ? '--' : `${latestActiveRow.wos.toFixed(1)}w`, detail: `${latestActiveRow.label} · ${latestWosStatus.label}`, tone: latestWosStatus.tone },
              { title: '回落月份', value: `${riskMonthCount}个`, detail: '优先复盘回落月份的结构变化', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ]
          : [
              { title: '当前聚焦月', value: focusRow.label, detail: '已按月份锁定当前聚焦月' },
              { title: '同比增速', value: fmtSignedPct(focusRow.yoy), detail: `去年同期 ${fmtAmt(focusRow.ly)} / 当前 ${fmtAmt(focusRow.actual)}`, tone: deltaTone(focusRow.yoyDiff) },
              { title: '同比差额', value: fmtSignedAmt(focusRow.yoyDiff), detail: `最大回落 ${worstYoyRow?.label || '--'}`, tone: deltaTone(focusRow.yoyDiff) },
              { title: '当前月 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
              { title: '回落月份', value: `${riskMonthCount}个`, detail: '优先复盘回落月份的结构变化', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ]
        : isAnnualView
          ? [
              { title: '当前视角', value: '全年', detail: '按全年骨架观察最新月份承接变化' },
              { title: '最新月环比', value: fmtSignedPct(latestMomRow.momRate), detail: `${latestMomRow.label} 较上月`, tone: deltaTone(latestMomRow.momDiff) },
              { title: '环比差额', value: fmtSignedAmt(latestMomRow.momDiff), detail: `最大承压 ${worstMomRow?.label || '--'}`, tone: deltaTone(latestMomRow.momDiff) },
              { title: '最新月 WOS', value: latestMomRow.wos === null ? '--' : `${latestMomRow.wos.toFixed(1)}w`, detail: getWosStatus(latestMomRow.wos).label, tone: getWosStatus(latestMomRow.wos).tone },
              { title: '承压月份', value: `${riskMonthCount}个`, detail: '优先处理连续转弱的月份', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ]
          : [
              { title: '当前聚焦月', value: focusRow.label, detail: '已按月份锁定当前聚焦月' },
              { title: '环比增速', value: fmtSignedPct(focusRow.momRate), detail: `上月 ${fmtAmt(focusRow.prevActual)} / 当前 ${fmtAmt(focusRow.actual)}`, tone: deltaTone(focusRow.momDiff) },
              { title: '环比差额', value: fmtSignedAmt(focusRow.momDiff), detail: `最大承压 ${worstMomRow?.label || '--'}`, tone: deltaTone(focusRow.momDiff) },
              { title: '当前月 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
              { title: '承压月份', value: `${riskMonthCount}个`, detail: '优先处理连续转弱的月份', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ];

  const summaryTags = [
    { label: '当前视角', value: focusLabel, tone: 'neutral' as Tone },
    ...(compareMode !== 'none' ? [
      { label: '对比口径', value: compareLabel(compareMode), tone: 'blue' as Tone },
      { label: isAnnualView ? '累计差额' : '当前差额', value: fmtSignedAmt(isAnnualView ? annualDeltaValue : currentDeltaValue), tone: deltaTone(isAnnualView ? annualDeltaValue : currentDeltaValue) },
    ] : []),
    { label: '当前状态', value: focusStatus, tone: (focusStatus.includes('承压') || focusStatus.includes('回落') ? 'red' : focusStatus.includes('偏紧') ? 'yellow' : 'green') as Tone },
    { label: selectedMonth ? '供需匹配' : '库存错配月', value: selectedMonth ? `${fmtPct(focusRow.salesWeight, 0)} / ${fmtPct(focusRow.stockWeight, 0)}` : mismatchRow.label, tone: (selectedMonth ? 'blue' : 'red') as Tone },
    ...(focusDriverSummary.topCategory ? [{ label: '主驱动品类', value: `${focusDriverSummary.topCategory.label} · ${fmtPct(focusDriverSummary.topCategory.share, 0)}`, tone: 'neutral' as Tone }] : []),
    ...(focusDriverSummary.topPriceBand ? [{ label: '主驱动价带', value: `${focusDriverSummary.topPriceBand.label} · ${fmtPct(focusDriverSummary.topPriceBand.share, 0)}`, tone: 'neutral' as Tone }] : []),
  ].slice(0, 7) as PillItem[];

  const detailHeaders = ['月份', '实际销售额', '计划销售额', '计划差额', '同比差额', '环比差额', '当月折扣（实际）', '毛利率（实际）', '库存金额', 'WOS', 'ST%'];
  const detailRows = monthlyRows.map((row) => [
    row.label, fmtAmt(row.actual), fmtAmt(row.target), fmtSignedAmt(row.gap), fmtSignedAmt(row.yoyDiff), fmtSignedAmt(row.momDiff),
    fmtPct(row.discountPct), fmtPct(row.marginPct), fmtAmt(row.inventory), row.wos === null ? '--' : `${row.wos.toFixed(1)}w`, fmtPct(row.st),
  ]);

  if (!hasAnyData) {
    return (
      <section className="rounded-section border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Monthly Achievement</div>
        <div className="mt-2 text-[32px] font-semibold tracking-tight text-slate-900">月度业绩达成</div>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500">
          当前筛选条件下暂无可用的月度销售与库存数据。
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-section border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)] xl:p-7">

      {/* 面板标题行 */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Monthly Achievement</div>
          <h2 className="mt-2 text-[32px] font-semibold tracking-tight text-slate-900">月度业绩达成</h2>
          <p className="mt-3 text-[15px] leading-7 text-slate-500">
            保留年度按月分解骨架；无对比看全年或当前月，切到计划 / 同比 / 环比后同步查看销售额与差额。
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50/70 px-5 py-3 text-sm text-slate-600">
          口径：{compareMode === 'none' ? '当前模式' : `${compareLabel(compareMode)}模式`}
          {' · '}当前视角：{focusLabel}
        </div>
      </div>

      {/* KPI 卡片组 */}
      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        {statCards.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      {/* ── 主图表区 ── */}
      <div className="mt-8 rounded-panel border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-lg font-medium tracking-wide text-slate-700 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-full" />
              {effectiveMainView === 'sales' ? '月度销售额走势' : compareMode === 'plan' ? '计划差额分解' : compareMode === 'yoy' ? '同比差额分解' : '环比差额分解'}
            </h3>
            <p className="mt-2 text-xs text-slate-500 max-w-2xl line-clamp-1">
              {effectiveMainView === 'sales'
                ? compareMode === 'plan' ? '销售额走势叠加计划值，便于同时看实际与计划。' : compareMode === 'yoy' ? '销售额走势叠加去年同期，用于观察趋势变化。' : compareMode === 'mom' ? '销售额走势叠加上月，用于观察月度承接变化。' : '按当前聚焦月回看全年月度走势与节奏峰谷。'
                : compareMode === 'plan' ? '按月查看实际相对计划的正负差额。' : compareMode === 'yoy' ? '按月查看当前相对去年同期的正负差额。' : '按月查看当前相对上月的正负差额。'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              <button type="button" onClick={() => setMainView('sales')} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${effectiveMainView === 'sales' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                销售额
              </button>
              <button type="button" onClick={() => compareMode !== 'none' && setMainView('delta')} disabled={compareMode === 'none'} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${effectiveMainView === 'delta' && compareMode !== 'none' ? 'bg-white text-slate-900 shadow-sm' : compareMode === 'none' ? 'cursor-not-allowed text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}>
                差额
              </button>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">聚焦：{focusLabel}</div>
          </div>
        </div>

        <div className="mt-6 h-[360px] min-w-0">
          {!mounted ? <ChartPlaceholder /> : effectiveMainView === 'sales' ? (
            <ReactECharts notMerge={true} lazyUpdate={true} option={{
              tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontWeight: 600 }, padding: [12, 16], borderRadius: 12,
                formatter: (params: unknown) => { const list = toTooltipParams(params); let str = `${list[0]?.axisValue ?? ''}<br/>`; list.forEach((p) => { str += `${p.marker ?? ''} ${p.seriesName ?? ''}: ${fmtAmt(Number(p.value))}<br/>`; }); return str; }
              },
              grid: { top: 30, right: 24, bottom: 20, left: 24, containLabel: true },
              xAxis: { type: 'category', data: comparisonRows.map((row) => row.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94A3B8', fontSize: 12 } },
              yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } }, axisLabel: { color: '#94A3B8', fontSize: 12, formatter: (val: number) => fmtAxisAmt(val) } },
              animation: true, animationDuration: 1500, animationEasing: 'cubicOut',
              series: [
                ...(compareMode !== 'none' ? [{ name: compareMode === 'plan' ? '计划' : compareMode === 'yoy' ? '去年同期' : '上月', type: 'bar', data: comparisonRows.map((row) => row.referenceValue), itemStyle: { color: '#E2E8F0', borderRadius: [6, 6, 0, 0] }, barGap: '15%', barMaxWidth: 32, animationDelay: (idx: number) => idx * 100, z: 1 }] : []),
                { name: '实际', type: 'bar', data: comparisonRows.map((row) => row.actual), itemStyle: { color: '#0F172A', borderRadius: [6, 6, 0, 0] }, showBackground: true, backgroundStyle: { color: '#F8FAFC', borderRadius: [6, 6, 0, 0] }, barMaxWidth: 32, animationDelay: (idx: number) => idx * 100 + 50, z: 2,
                  markLine: { symbol: 'none', label: { show: false }, lineStyle: { color: '#CBD5E1', type: 'dashed', width: 1 }, data: selectedMonth ? [{ xAxis: focusRow.label }] : [] } },
              ],
            }} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
          ) : (
            <ReactECharts option={{
              tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontWeight: 600 }, padding: [12, 16], borderRadius: 12,
                formatter: (params: unknown) => { const first = toTooltipParams(params)[0]; const val = first?.value; const signed = typeof val === 'number' ? fmtSignedAmt(val) : '--'; return `${first?.axisValue ?? ''}<br/>${first?.marker ?? ''} 差额：${signed}`; }
              },
              grid: { top: 30, right: 24, bottom: 20, left: 24, containLabel: true },
              xAxis: { type: 'category', data: comparisonRows.map((row) => row.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94A3B8', fontSize: 12 } },
              yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } }, axisLabel: { color: '#94A3B8', fontSize: 12, formatter: (val: number) => fmtAxisAmt(val) } },
              series: [{ name: '差额', type: 'bar', barMaxWidth: 48,
                data: comparisonRows.map((row) => ({ value: row.deltaValue, itemStyle: {
                  color: (row.deltaValue ?? 0) >= 0 ? new echarts.graphic.LinearGradient(0, 1, 0, 0, [{ offset: 0, color: '#38BDF8' }, { offset: 1, color: '#0EA5E9' }]) : new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#FB7185' }, { offset: 1, color: '#E11D48' }]),
                  borderRadius: (row.deltaValue ?? 0) >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6], opacity: row.isFocus ? 1 : 0.4 }
                })),
                showBackground: true, backgroundStyle: { color: '#F8FAFC', borderRadius: [6, 6, 0, 0] },
                markLine: { symbol: 'none', label: { show: false }, data: [{ yAxis: 0, lineStyle: { color: '#CBD5E1', type: 'solid', width: 1 } }, ...(selectedMonth ? [{ xAxis: focusRow.label, lineStyle: { color: '#CBD5E1', type: 'dashed', width: 1 } }] : [])] },
              }],
            }} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {summaryTags.map((tag) => <SummaryPill key={`${tag.label}-${tag.value}`} {...tag} />)}
        </div>
      </div>

      {/* ── [item 7] 折扣深度走势图 ── */}
      <div className="mt-6 rounded-panel border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <div className="w-1.5 h-5 bg-gradient-to-b from-violet-400 to-purple-600 rounded-full" />
          折扣深度 &amp; 毛利率走势
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          数据来源：fact_sales.discount_amt / gross_sales_amt（折扣率）；gross_profit_amt / net_sales_amt（毛利率）。均为真实字段，非估算值。
        </p>
        <div className="mt-5 h-[260px]">
          {!mounted ? <ChartPlaceholder /> : (
            <ReactECharts option={{
              tooltip: { trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontWeight: 600 }, padding: [12, 16], borderRadius: 12,
                formatter: (params: unknown) => { const list = toTooltipParams(params); let str = `${list[0]?.axisValue ?? ''}<br/>`; list.forEach((p) => { const value = typeof p.value === 'number' ? p.value : Number(p.value); str += `${p.marker ?? ''} ${p.seriesName ?? ''}: ${fmtPct(value / 100)}<br/>`; }); return str; }
              },
              legend: { data: ['折扣率', '毛利率'], right: 0, top: 0, textStyle: { color: '#64748B', fontSize: 12 } },
              grid: { top: 36, right: 24, bottom: 20, left: 24, containLabel: true },
              xAxis: { type: 'category', data: monthlyRows.map((r) => r.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94A3B8', fontSize: 11 } },
              yAxis: { type: 'value', min: 0, max: 100, splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } }, axisLabel: { color: '#94A3B8', fontSize: 11, formatter: (v: number) => `${v}%` } },
              series: [
                { name: '折扣率', type: 'line', smooth: true, data: monthlyRows.map((r) => r.discountPct > 0 ? parseFloat((r.discountPct * 100).toFixed(1)) : null), lineStyle: { color: '#8B5CF6', width: 2 }, itemStyle: { color: '#8B5CF6' }, symbol: 'circle', symbolSize: 6, connectNulls: false },
                { name: '毛利率', type: 'line', smooth: true, data: monthlyRows.map((r) => r.marginPct > 0 ? parseFloat((r.marginPct * 100).toFixed(1)) : null), lineStyle: { color: '#10B981', width: 2 }, itemStyle: { color: '#10B981' }, symbol: 'circle', symbolSize: 6, connectNulls: false,
                  areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.15)' }, { offset: 1, color: 'rgba(16,185,129,0)' }]) } },
              ],
            }} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
          )}
        </div>
      </div>

      {/* ── 月度明细展开表 ── */}
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <button type="button" className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50/60" onClick={() => setDetailExpanded((prev) => !prev)}>
          <span>月度明细数据表</span>
          <span className="text-xs font-medium text-slate-400">{detailExpanded ? '收起' : '展开'}</span>
        </button>
        {detailExpanded && (
          <div className="border-t border-slate-100 px-5 pb-5">
            <div className="mb-3 flex justify-end pt-4">
              <button type="button" onClick={() => exportCsv('monthly_achievement.csv', detailHeaders, detailRows)} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300">
                导出 CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100">
                    {detailHeaders.map((h) => <th key={h} className="pb-2 pr-4 text-right font-semibold text-slate-500 first:text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/60">
                      {row.map((cell, ci) => <td key={ci} className="py-1.5 pr-4 tabular-nums first:font-medium first:text-left text-right">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
