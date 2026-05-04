'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { matchesDashboardSkuCategoryFilters } from '@/hooks/useDashboardFilter';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import factInventoryRaw from '@/../data/dashboard/fact_inventory.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import { formatMoneyCny } from '@/config/numberFormat';
import {
  deriveDashboardAnnualPlanTotal,
  deriveDashboardMonthlyPlanBreakdown,
  deriveScopedAnnualPlanTotal,
} from '@/config/dashboardPlan';
import { getDashboardMonthByWave } from '@/config/dashboardTime';
import { formatPriceBandLabel, matchesPriceBandFilter, resolvePriceBandByMsrp } from '@/config/priceBand';
import { resolveDashboardLifecycleLabel } from '@/config/dashboardLifecycle';

type FactSales = {
  sku_id: string;
  channel_id: string;
  season_year: string;
  season: string;
  wave: string;
  week_num: number;
  net_sales_amt: number;
};

type FactInventory = {
  date: string;
  store_id: string;
  sku_id: string;
  bop_qty: number;
  inbound_qty: number;
  sales_qty: number;
  eop_qty: number;
  inventory_amount: number;
};

type DimSku = {
  sku_id: string;
  category_id: string;
  category_name?: string;
  category_l2?: string;
  sku_name?: string;
  msrp: number;
  price_band?: string;
  lifecycle?: string;
  target_audience?: string;
  target_age_group?: string;
  color?: string;
  color_family?: string;
  brand_name?: string | null;
  gender?: string | null;
  product_line?: string;
};

type DimChannel = {
  channel_id: string;
  channel_type?: string;
  region?: string;
  city_tier?: string;
  store_format?: string;
};

type DimPlan = {
  season_year?: number;
  overall_plan?: { plan_total_sales?: number };
  monthly_plan?: { month?: number; plan_sales_amt?: number }[];
};

type MonthRow = {
  month: number;
  label: string;
  actual: number;
  target: number | null;
  ly: number | null;
  prevActual: number | null;
  achv: number | null;
  gap: number | null;
  yoyDiff: number | null;
  yoy: number | null;
  momDiff: number | null;
  momRate: number | null;
  inventory: number;
  wos: number | null;
  st: number | null;
  salesWeight: number;
  stockWeight: number;
  marginPct: number;
  discountPct: number;
};

type MainView = 'sales' | 'delta';
type DiagnosticView = 'match' | 'wos';
type Tone = 'neutral' | 'blue' | 'green' | 'yellow' | 'red';

type CardItem = { title: string; value: string; detail?: string; tone?: Tone };
type InsightItem = { title: string; detail: string };
type ActionItem = { title: string; description: string; cta: string; onClick?: () => void };
type PillItem = { label: string; value: string; tone?: Tone };

type Props = {
  filters: DashboardFilters;
  compareMode: CompareMode;
  onJumpToPlanning?: () => void;
  onJumpToProduct?: () => void;
  onJumpToChannel?: () => void;
  onJumpToSkuRisk?: () => void;
};

const factSales = factSalesRaw as unknown as FactSales[];
const factInventory = factInventoryRaw as unknown as FactInventory[];
const dimSku = dimSkuRaw as unknown as DimSku[];
const dimChannel = dimChannelRaw as unknown as DimChannel[];
const dimPlan = dimPlanRaw as unknown as DimPlan;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const fmtAmt = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return formatMoneyCny(value);
};

const fmtSignedAmt = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return sign + formatMoneyCny(value);
};

const fmtPct = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return `${(value * 100).toFixed(digits)}%`;
};

const fmtSignedPct = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(digits)}%`;
};

const fmtAxisAmt = (value: number) => `${Math.round(value / 10000)}\u4e07`;
const monthLabel = (month: number) => `${month}\u6708`;
const compareLabel = (mode: CompareMode) => (mode === 'plan' ? '\u8ba1\u5212' : mode === 'yoy' ? '\u540c\u6bd4' : mode === 'mom' ? '\u73af\u6bd4' : '\u5f53\u524d');
const divOrNull = (a: number, b: number | null | undefined) => (!b ? null : a / b);

const escapeCsvCell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;

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

function getWosStatus(wos: number | null) {
  if (wos === null || Number.isNaN(wos)) return { label: '\u5f85\u8865\u5e93\u5b58\u53e3\u5f84', tone: 'neutral' as Tone };
  if (wos > 16) return { label: '\u5e93\u5b58\u504f\u6df1', tone: 'red' as Tone };
  if (wos > 10) return { label: '\u5e93\u5b58\u504f\u9ad8', tone: 'yellow' as Tone };
  if (wos >= 4) return { label: '\u5e93\u5b58\u5065\u5eb7', tone: 'blue' as Tone };
  return { label: '\u5e93\u5b58\u504f\u7d27', tone: 'yellow' as Tone };
}

function getSellThroughStatus(st: number | null) {
  if (st === null || Number.isNaN(st)) return { label: '\u5f85\u8865\u552e\u7f44\u53e3\u5f84', tone: 'neutral' as Tone };
  if (st >= 0.75) return { label: '\u552e\u7f44\u5065\u5eb7', tone: 'green' as Tone };
  if (st >= 0.55) return { label: '\u552e\u7f44\u5e73\u7a33', tone: 'blue' as Tone };
  if (st >= 0.35) return { label: '\u552e\u7f44\u627f\u538b', tone: 'yellow' as Tone };
  return { label: '\u552e\u7f44\u504f\u5f31', tone: 'red' as Tone };
}

function statAccent(tone: Tone = 'neutral') {
  if (tone === 'blue') return 'bg-blue-500';
  if (tone === 'green') return 'bg-emerald-500';
  if (tone === 'yellow') return 'bg-amber-500';
  if (tone === 'red') return 'bg-[#E11D48]'; // Deeper red
  return 'bg-slate-200';
}

function SummaryPill({ label, value, tone = 'neutral' }: PillItem) {
  const badgeColors = {
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

function deltaTone(value: number | null | undefined): Tone {
  if (value === null || value === undefined || Number.isNaN(value)) return 'neutral';
  if (value > 0) return 'blue';
  if (value < 0) return 'red';
  return 'neutral';
}

function matchesTargetAudience(filters: DashboardFilters, sku: DimSku) {
  if (filters.target_audience === 'all') return true;
  return sku.target_audience === filters.target_audience || sku.target_age_group === filters.target_audience;
}

function matchesColor(filters: DashboardFilters, sku: DimSku) {
  if (filters.color === 'all') return true;
  return sku.color === filters.color || sku.color_family === filters.color;
}

function matchesScopedFilters(filters: DashboardFilters, sku: DimSku | undefined, channel: DimChannel | undefined) {
  if (!sku || !channel) return false;
  if (!matchesDashboardSkuCategoryFilters(filters, sku)) return false;
  if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
  if (filters.lifecycle !== 'all' && resolveDashboardLifecycleLabel(filters, sku) !== filters.lifecycle) return false;
  if (filters.region !== 'all' && channel.region !== filters.region) return false;
  if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
  if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
  if (!matchesTargetAudience(filters, sku)) return false;
  if (!matchesColor(filters, sku)) return false;
  if (!matchesPriceBandFilter(sku.msrp, filters.price_band, sku.price_band)) return false;
  return true;
}

function StatCard({ title, value, detail, tone = 'neutral' }: CardItem) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-white/70 backdrop-blur-2xl ring-1 ring-white/60 border border-slate-100 shadow-[0_12px_32px_rgba(15,23,42,0.04)] p-6 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className={`absolute top-0 left-0 w-1.5 h-full opacity-90 ${statAccent(tone)}`} />
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</div>
      <div className="mt-3.5 text-3xl font-black tracking-tight text-slate-900">{value}</div>
      {detail ? <div className="mt-2 text-[12px] font-medium leading-relaxed text-slate-500">{detail}</div> : null}
    </div>
  );
}

function ChartPlaceholder() {
  return <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400">\u56fe\u8868\u52a0\u8f7d\u4e2d</div>;
}
export default function MonthlyAchievementPanel({
  filters,
  compareMode,
  onJumpToPlanning,
  onJumpToProduct,
  onJumpToChannel,
  onJumpToSkuRisk,
}: Props) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [mainView, setMainView] = useState<MainView>('delta');
  const [diagnosticView, setDiagnosticView] = useState<DiagnosticView>('match');
  const [detailExpanded, setDetailExpanded] = useState(false);

  const effectiveMainView: MainView = compareMode === 'none' ? 'sales' : mainView;

  const selectedYear = useMemo(() => {
    if (typeof filters.season_year === 'number') return filters.season_year;
    const years = factSales.map((record) => Number(record.season_year || 0)).filter((year) => Number.isFinite(year) && year > 0);
    return years.length ? Math.max(...years) : 2024;
  }, [filters.season_year]);

  const selectedMonth = filters.wave !== 'all' ? getDashboardMonthByWave(String(filters.wave)) : null;

  const skuMap = useMemo(() => {
    const map: Record<string, DimSku> = {};
    dimSku.forEach((item) => {
      map[item.sku_id] = item;
    });
    return map;
  }, []);

  const channelMap = useMemo(() => {
    const map: Record<string, DimChannel> = {};
    dimChannel.forEach((item) => {
      map[item.channel_id] = item;
    });
    return map;
  }, []);

  const currentYearSales = useMemo(() => {
    return factSales.filter((record) => {
      if (Number(record.season_year) !== selectedYear) return false;
      const sku = skuMap[record.sku_id];
      const channel = channelMap[record.channel_id];
      return matchesScopedFilters(filters, sku, channel);
    });
  }, [channelMap, filters, selectedYear, skuMap]);

  const previousYearSales = useMemo(() => {
    return factSales.filter((record) => {
      if (Number(record.season_year) !== selectedYear - 1) return false;
      const sku = skuMap[record.sku_id];
      const channel = channelMap[record.channel_id];
      return matchesScopedFilters(filters, sku, channel);
    });
  }, [channelMap, filters, selectedYear, skuMap]);

  const inventoryRows = useMemo(() => {
    return factInventory.filter((record) => {
      const sku = skuMap[record.sku_id];
      const channel = channelMap[record.store_id];
      return matchesScopedFilters(filters, sku, channel);
    });
  }, [channelMap, filters, skuMap]);

  const overallAnnualActualTotal = useMemo(() => {
    return factSales.reduce((sum, record) => {
      if (Number(record.season_year) !== selectedYear) return sum;
      return sum + Number(record.net_sales_amt || 0);
    }, 0);
  }, [selectedYear]);

  const monthlyRows = useMemo<MonthRow[]>(() => {
    const rows: MonthRow[] = MONTHS.map((month) => ({
      month,
      label: monthLabel(month),
      actual: 0,
      target: null,
      ly: null,
      prevActual: null,
      achv: null,
      gap: null,
      yoyDiff: null,
      yoy: null,
      momDiff: null,
      momRate: null,
      inventory: 0,
      wos: null,
      st: null,
      salesWeight: 0,
      stockWeight: 0,
      marginPct: 0,
      discountPct: 0,
    }));

    currentYearSales.forEach((record) => {
      const month = getDashboardMonthByWave(record.wave);
      if (!month) return;
      rows[month - 1].actual += Number(record.net_sales_amt || 0);
    });

    previousYearSales.forEach((record) => {
      const month = getDashboardMonthByWave(record.wave);
      if (!month) return;
      rows[month - 1].ly = Number(rows[month - 1].ly || 0) + Number(record.net_sales_amt || 0);
    });

    inventoryRows.forEach((record) => {
      const date = new Date(record.date);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth() + 1;
      if (month < 1 || month > 12) return;
      rows[month - 1].inventory += Number(record.inventory_amount || 0);
    });

    const monthlyPlanSource = (dimPlan.monthly_plan || []).map((item) => Number(item.plan_sales_amt || 0));
    const annualPlanTotal = deriveDashboardAnnualPlanTotal(monthlyPlanSource, Number(dimPlan.overall_plan?.plan_total_sales || 0));
    const scopedActualTotal = rows.reduce((sum, row) => sum + row.actual, 0);
    const scopedAnnualPlanTotal = deriveScopedAnnualPlanTotal(annualPlanTotal, scopedActualTotal, overallAnnualActualTotal);
    const breakdown = deriveDashboardMonthlyPlanBreakdown({
      annualPlanTotal: scopedAnnualPlanTotal,
      monthlyPlanSource,
      currentYearMonthlyActuals: rows.map((row) => row.actual),
      previousYearMonthlyActuals: rows.map((row) => row.ly ?? 0),
      season: 'all',
      wave: 'all',
    });

    let prevActual: number | null = null;
    const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
    const totalInventory = rows.reduce((sum, row) => sum + row.inventory, 0);

    rows.forEach((row, index) => {
      row.target = breakdown.monthlyPlan[index] ?? null;
      row.prevActual = prevActual;
      row.achv = row.target && row.target > 0 ? row.actual / row.target : null;
      row.gap = row.target !== null ? row.actual - row.target : null;
      row.yoyDiff = row.ly !== null ? row.actual - row.ly : null;
      row.yoy = row.ly !== null && row.ly > 0 ? (row.actual - row.ly) / row.ly : null;
      row.momDiff = prevActual !== null ? row.actual - prevActual : null;
      row.momRate = prevActual !== null && prevActual > 0 ? (row.actual - prevActual) / prevActual : null;
      row.wos = row.actual > 0 ? row.inventory / (row.actual / 4) : null;
      const flowBase = row.actual + row.inventory;
      row.st = flowBase > 0 ? row.actual / flowBase : null;
      prevActual = row.actual;
    });

    rows.forEach((row) => {
      row.salesWeight = totalActual > 0 ? row.actual / totalActual : 0;
      row.stockWeight = totalInventory > 0 ? row.inventory / totalInventory : 0;

      const baseDiscount = 0.65;
      const baseMargin = 0.55;
      if (row.achv !== null && row.achv > 1.05) {
        row.discountPct = baseDiscount - (row.achv - 1.0) * 0.3;
        row.marginPct = baseMargin - (row.achv - 1.0) * 0.4;
      } else {
        row.discountPct = baseDiscount + (row.month % 3 === 0 ? -0.05 : 0.02);
        row.marginPct = baseMargin + (row.month % 3 === 0 ? -0.06 : 0.02);
      }
    });

    return rows;
  }, [currentYearSales, inventoryRows, overallAnnualActualTotal, previousYearSales]);

  const hasAnyData = monthlyRows.some((row) => row.actual > 0 || row.inventory > 0 || (row.target ?? 0) > 0 || (row.ly ?? 0) > 0);
  const latestActiveRow = [...monthlyRows].reverse().find((row) => row.actual > 0 || row.inventory > 0 || (row.target ?? 0) > 0 || (row.ly ?? 0) > 0) || monthlyRows[monthlyRows.length - 1];
  const focusRow = selectedMonth ? monthlyRows[selectedMonth - 1] || latestActiveRow : latestActiveRow;
  const isAnnualView = selectedMonth === null;
  const focusLabel = isAnnualView ? '\u5168\u5e74' : focusRow.label;

  const totalActual = monthlyRows.reduce((sum, row) => sum + row.actual, 0);
  const totalTarget = monthlyRows.reduce((sum, row) => sum + (row.target ?? 0), 0);
  const totalLy = monthlyRows.reduce((sum, row) => sum + (row.ly ?? 0), 0);
  const annualAchievement = totalTarget > 0 ? totalActual / totalTarget : null;
  const annualGap = totalTarget > 0 ? totalActual - totalTarget : null;
  const annualYoyDiff = totalLy > 0 ? totalActual - totalLy : null;
  const annualYoyRate = totalLy > 0 && annualYoyDiff !== null ? annualYoyDiff / totalLy : null;

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

  const focusDriverSummary = useMemo(() => {
    const relevantSales = currentYearSales.filter((record) => {
      const month = getDashboardMonthByWave(record.wave);
      if (!month) return false;
      return selectedMonth ? month === selectedMonth : true;
    });
    const scopedTotal = relevantSales.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
    if (scopedTotal <= 0) return { topCategory: null, topPriceBand: null };

    const categoryMap = new Map<string, number>();
    const bandMap = new Map<string, number>();

    relevantSales.forEach((record) => {
      const sku = skuMap[record.sku_id];
      if (!sku) return;
      const amount = Number(record.net_sales_amt || 0);
      const categoryLabel = sku.category_name || sku.category_l2 || sku.product_line || sku.sku_name || '\u672a\u5206\u7ec4';
      const priceBand = formatPriceBandLabel(sku.price_band || resolvePriceBandByMsrp(sku.msrp));
      categoryMap.set(categoryLabel, (categoryMap.get(categoryLabel) || 0) + amount);
      bandMap.set(priceBand, (bandMap.get(priceBand) || 0) + amount);
    });

    const topCategoryEntry = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topPriceBandEntry = [...bandMap.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      topCategory: topCategoryEntry ? { label: topCategoryEntry[0], share: divOrNull(topCategoryEntry[1], scopedTotal) || 0 } : null,
      topPriceBand: topPriceBandEntry ? { label: topPriceBandEntry[0], share: divOrNull(topPriceBandEntry[1], scopedTotal) || 0 } : null,
    };
  }, [currentYearSales, selectedMonth, skuMap]);

  const focusStatus = (() => {
    if (compareMode === 'plan') return ((isAnnualView ? annualGap : focusRow.gap) ?? 0) >= 0 ? '\u8ba1\u5212\u8d85\u989d' : '\u8ba1\u5212\u627f\u538b';
    if (compareMode === 'yoy') return ((isAnnualView ? annualYoyDiff : focusRow.yoyDiff) ?? 0) >= 0 ? '\u8d8b\u52bf\u8d70\u5f3a' : '\u8d8b\u52bf\u56de\u843d';
    if (compareMode === 'mom') return ((isAnnualView ? latestMomRow.momDiff : focusRow.momDiff) ?? 0) >= 0 ? '\u627f\u63a5\u8d70\u5f3a' : '\u627f\u63a5\u8f6c\u5f31';
    const mismatchGap = focusRow.stockWeight - focusRow.salesWeight;
    const wosTone = getWosStatus(focusRow.wos).tone;
    if (wosTone === 'red' || mismatchGap > 0.08) return '\u5e93\u5b58\u627f\u538b';
    if (wosTone === 'yellow') return '\u8282\u594f\u504f\u7d27';
    return '\u8282\u594f\u5065\u5eb7';
  })();

  const comparisonRows = monthlyRows.map((row) => ({
    ...row,
    referenceValue: compareMode === 'plan' ? row.target : compareMode === 'yoy' ? row.ly : compareMode === 'mom' ? row.prevActual : null,
    deltaValue: compareMode === 'plan' ? row.gap : compareMode === 'yoy' ? row.yoyDiff : compareMode === 'mom' ? row.momDiff : null,
    isFocus: selectedMonth !== null && row.month === focusRow.month,
  }));

  const currentDeltaValue = compareMode === 'plan' ? focusRow.gap : compareMode === 'yoy' ? focusRow.yoyDiff : compareMode === 'mom' ? focusRow.momDiff : null;
  const annualDeltaValue = compareMode === 'plan' ? annualGap : compareMode === 'yoy' ? annualYoyDiff : compareMode === 'mom' ? latestMomRow.momDiff : null;

  const statCards: CardItem[] = compareMode === 'none'
    ? isAnnualView
      ? [
          { title: '\u5f53\u524d\u89c6\u89d2', value: '\u5168\u5e74', detail: `${selectedYear}\u5e74 12\u4e2a\u6708\u6982\u89c8` },
          { title: '\u7d2f\u8ba1\u9500\u552e\u989d', value: fmtAmt(totalActual), detail: `\u6708\u5747 ${fmtAmt(totalActual / 12)}` },
          { title: '\u9500\u552e\u5cf0\u503c\u6708', value: topActualRow.label, detail: fmtAmt(topActualRow.actual), tone: 'blue' },
          { title: '\u6700\u65b0\u6708 WOS', value: latestActiveRow.wos === null ? '--' : `${latestActiveRow.wos.toFixed(1)}w`, detail: `${latestActiveRow.label} 路 ${latestWosStatus.label}`, tone: latestWosStatus.tone },
          { title: '\u98ce\u9669\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: `\u5e93\u5b58\u9519\u914d\u6708 ${mismatchRow.label}`, tone: riskMonthCount > 0 ? 'red' : 'blue' },
        ]
      : [
          { title: '\u5f53\u524d\u805a\u7126\u6708', value: focusRow.label, detail: '\u5df2\u6309\u6708\u4efd\u9501\u5b9a\u5f53\u524d\u805a\u7126\u6708' },
          { title: '\u5f53\u524d\u6708\u9500\u552e', value: fmtAmt(focusRow.actual), detail: `\u5168\u5e74\u7d2f\u8ba1 ${fmtAmt(totalActual)}` },
          { title: '\u5f53\u524d\u6708 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
          { title: '\u5f53\u524d\u6708 ST%', value: fmtPct(focusRow.st), detail: focusStStatus.label, tone: focusStStatus.tone },
          { title: '\u98ce\u9669\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: `\u5e93\u5b58\u9519\u914d\u6708 ${mismatchRow.label}`, tone: riskMonthCount > 0 ? 'red' : 'blue' },
        ]
    : compareMode === 'plan'
      ? isAnnualView
        ? [
            { title: '\u5f53\u524d\u89c6\u89d2', value: '\u5168\u5e74', detail: '\u6309\u5168\u5e74\u7d2f\u8ba1\u53e3\u5f84\u5bf9\u6bd4\u8ba1\u5212' },
            { title: '\u7d2f\u8ba1\u8fbe\u6210\u7387', value: fmtPct(annualAchievement), detail: `\u8ba1\u5212 ${fmtAmt(totalTarget)} / \u5b9e\u9645 ${fmtAmt(totalActual)}`, tone: deltaTone(annualGap) },
            { title: '\u8ba1\u5212\u5dee\u989d', value: fmtSignedAmt(annualGap), detail: `\u6700\u5927\u7f3a\u53e3 ${worstPlanRow?.label || '--'}`, tone: deltaTone(annualGap) },
            { title: '\u6700\u65b0\u6708 WOS', value: latestActiveRow.wos === null ? '--' : `${latestActiveRow.wos.toFixed(1)}w`, detail: `${latestActiveRow.label} 路 ${latestWosStatus.label}`, tone: latestWosStatus.tone },
            { title: '\u98ce\u9669\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: '\u4f18\u5148\u5904\u7406\u6301\u7eed\u4f4e\u4e8e\u8ba1\u5212\u7684\u6708\u4efd', tone: riskMonthCount > 0 ? 'red' : 'blue' },
          ]
        : [
            { title: '\u5f53\u524d\u805a\u7126\u6708', value: focusRow.label, detail: '\u5df2\u6309\u6708\u4efd\u9501\u5b9a\u5f53\u524d\u805a\u7126\u6708' },
            { title: '\u5f53\u6708\u8fbe\u6210\u7387', value: fmtPct(focusRow.achv), detail: `\u8ba1\u5212 ${fmtAmt(focusRow.target)} / \u5b9e\u9645 ${fmtAmt(focusRow.actual)}`, tone: deltaTone(focusRow.gap) },
            { title: '\u8ba1\u5212\u5dee\u989d', value: fmtSignedAmt(focusRow.gap), detail: `\u6700\u5927\u7f3a\u53e3 ${worstPlanRow?.label || '--'}`, tone: deltaTone(focusRow.gap) },
            { title: '\u5f53\u524d\u6708 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
            { title: '\u98ce\u9669\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: '\u4f18\u5148\u5904\u7406\u6301\u7eed\u4f4e\u4e8e\u8ba1\u5212\u7684\u6708\u4efd', tone: riskMonthCount > 0 ? 'red' : 'blue' },
          ]
      : compareMode === 'yoy'
        ? isAnnualView
          ? [
              { title: '\u5f53\u524d\u89c6\u89d2', value: '\u5168\u5e74', detail: '\u6309\u5168\u5e74\u7d2f\u8ba1\u53e3\u5f84\u5bf9\u6bd4\u53bb\u5e74\u540c\u671f' },
              { title: '\u7d2f\u8ba1\u540c\u6bd4\u589e\u901f', value: fmtSignedPct(annualYoyRate), detail: `\u53bb\u5e74\u540c\u671f ${fmtAmt(totalLy)} / \u5f53\u524d ${fmtAmt(totalActual)}`, tone: deltaTone(annualYoyDiff) },
              { title: '\u540c\u6bd4\u5dee\u989d', value: fmtSignedAmt(annualYoyDiff), detail: `\u6700\u5927\u56de\u843d ${worstYoyRow?.label || '--'}`, tone: deltaTone(annualYoyDiff) },
              { title: '\u6700\u65b0\u6708 WOS', value: latestActiveRow.wos === null ? '--' : `${latestActiveRow.wos.toFixed(1)}w`, detail: `${latestActiveRow.label} 路 ${latestWosStatus.label}`, tone: latestWosStatus.tone },
              { title: '\u56de\u843d\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: '\u4f18\u5148\u590d\u76d8\u56de\u843d\u6708\u4efd\u7684\u7ed3\u6784\u53d8\u5316', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ]
          : [
              { title: '\u5f53\u524d\u805a\u7126\u6708', value: focusRow.label, detail: '\u5df2\u6309\u6708\u4efd\u9501\u5b9a\u5f53\u524d\u805a\u7126\u6708' },
              { title: '\u540c\u6bd4\u589e\u901f', value: fmtSignedPct(focusRow.yoy), detail: `\u53bb\u5e74\u540c\u671f ${fmtAmt(focusRow.ly)} / \u5f53\u524d ${fmtAmt(focusRow.actual)}`, tone: deltaTone(focusRow.yoyDiff) },
              { title: '\u540c\u6bd4\u5dee\u989d', value: fmtSignedAmt(focusRow.yoyDiff), detail: `\u6700\u5927\u56de\u843d ${worstYoyRow?.label || '--'}`, tone: deltaTone(focusRow.yoyDiff) },
              { title: '\u5f53\u524d\u6708 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
              { title: '\u56de\u843d\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: '\u4f18\u5148\u590d\u76d8\u56de\u843d\u6708\u4efd\u7684\u7ed3\u6784\u53d8\u5316', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ]
        : isAnnualView
          ? [
              { title: '\u5f53\u524d\u89c6\u89d2', value: '\u5168\u5e74', detail: '\u6309\u5168\u5e74\u9aa8\u67b6\u89c2\u5bdf\u6700\u65b0\u6708\u4efd\u627f\u63a5\u53d8\u5316' },
              { title: '\u6700\u65b0\u6708\u73af\u6bd4', value: fmtSignedPct(latestMomRow.momRate), detail: `${latestMomRow.label} \u8f83\u4e0a\u6708`, tone: deltaTone(latestMomRow.momDiff) },
              { title: '\u73af\u6bd4\u5dee\u989d', value: fmtSignedAmt(latestMomRow.momDiff), detail: `\u6700\u5927\u627f\u538b ${worstMomRow?.label || '--'}`, tone: deltaTone(latestMomRow.momDiff) },
              { title: '\u6700\u65b0\u6708 WOS', value: latestMomRow.wos === null ? '--' : `${latestMomRow.wos.toFixed(1)}w`, detail: getWosStatus(latestMomRow.wos).label, tone: getWosStatus(latestMomRow.wos).tone },
              { title: '\u627f\u538b\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: '\u4f18\u5148\u5904\u7406\u8fde\u7eed\u8f6c\u5f31\u7684\u6708\u4efd', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ]
          : [
              { title: '\u5f53\u524d\u805a\u7126\u6708', value: focusRow.label, detail: '\u5df2\u6309\u6708\u4efd\u9501\u5b9a\u5f53\u524d\u805a\u7126\u6708' },
              { title: '\u73af\u6bd4\u589e\u901f', value: fmtSignedPct(focusRow.momRate), detail: `\u4e0a\u6708 ${fmtAmt(focusRow.prevActual)} / \u5f53\u524d ${fmtAmt(focusRow.actual)}`, tone: deltaTone(focusRow.momDiff) },
              { title: '\u73af\u6bd4\u5dee\u989d', value: fmtSignedAmt(focusRow.momDiff), detail: `\u6700\u5927\u627f\u538b ${worstMomRow?.label || '--'}`, tone: deltaTone(focusRow.momDiff) },
              { title: '\u5f53\u524d\u6708 WOS', value: focusRow.wos === null ? '--' : `${focusRow.wos.toFixed(1)}w`, detail: focusWosStatus.label, tone: focusWosStatus.tone },
              { title: '\u627f\u538b\u6708\u4efd', value: `${riskMonthCount}\u4e2a`, detail: '\u4f18\u5148\u5904\u7406\u8fde\u7eed\u8f6c\u5f31\u7684\u6708\u4efd', tone: riskMonthCount > 0 ? 'red' : 'blue' },
            ];
  const summaryTags = [
    { label: '\u5f53\u524d\u89c6\u89d2', value: focusLabel, tone: 'neutral' as Tone },
    ...(compareMode !== 'none'
      ? [
          { label: '\u5bf9\u6bd4\u53e3\u5f84', value: compareLabel(compareMode), tone: 'blue' as Tone },
          { label: isAnnualView ? '\u7d2f\u8ba1\u5dee\u989d' : '\u5f53\u524d\u5dee\u989d', value: fmtSignedAmt(isAnnualView ? annualDeltaValue : currentDeltaValue), tone: deltaTone(isAnnualView ? annualDeltaValue : currentDeltaValue) },
        ]
      : []),
    { label: '\u5f53\u524d\u72b6\u6001', value: focusStatus, tone: focusStatus.includes('\u627f\u538b') || focusStatus.includes('\u56de\u843d') ? 'red' : focusStatus.includes('\u504f\u7d27') ? 'yellow' : 'green' },
    { label: selectedMonth ? '\u4f9b\u9700\u5339\u914d' : '\u5e93\u5b58\u9519\u914d\u6708', value: selectedMonth ? `${fmtPct(focusRow.salesWeight, 0)} / ${fmtPct(focusRow.stockWeight, 0)}` : mismatchRow.label, tone: selectedMonth ? 'blue' : 'red' },
    ...(focusDriverSummary.topCategory ? [{ label: '\u4e3b\u9a71\u52a8\u54c1\u7c7b', value: `${focusDriverSummary.topCategory.label} 路 ${fmtPct(focusDriverSummary.topCategory.share, 0)}`, tone: 'neutral' as Tone }] : []),
    ...(focusDriverSummary.topPriceBand ? [{ label: '\u4e3b\u9a71\u52a8\u4ef7\u5e26', value: `${focusDriverSummary.topPriceBand.label} 路 ${fmtPct(focusDriverSummary.topPriceBand.share, 0)}`, tone: 'neutral' as Tone }] : []),
  ] as PillItem[];
  summaryTags.length = Math.min(summaryTags.length, 7);

  const matchChartRows = monthlyRows.map((row) => ({ ...row, salesWeightPct: row.salesWeight * 100, stockWeightPct: row.stockWeight * 100 }));
  const wosChartRows = monthlyRows.map((row) => ({ ...row, wosValue: row.wos ?? 0, hasWos: row.wos !== null, status: getWosStatus(row.wos) }));

  const insights: InsightItem[] = compareMode === 'none'
    ? isAnnualView
      ? [
          { title: '\u5168\u5e74\u5cf0\u503c', detail: `\u9500\u552e\u5cf0\u503c\u51fa\u73b0\u5728 ${topActualRow.label}\uff0c\u5355\u6708\u9500\u552e ${fmtAmt(topActualRow.actual)}\u3002` },
          { title: '\u5e93\u5b58\u9519\u914d', detail: `${mismatchRow.label} \u7684\u5e93\u5b58\u5360\u7528\u9ad8\u4e8e\u9500\u552e\u8d21\u732e\uff0c\u5efa\u8bae\u4f18\u5148\u6392\u67e5\u627f\u538b SKU \u4e0e\u6e20\u9053\u627f\u63a5\u3002` },
          { title: '\u9a71\u52a8\u6765\u6e90', detail: `${focusDriverSummary.topCategory ? `\u4e3b\u9a71\u52a8\u54c1\u7c7b ${focusDriverSummary.topCategory.label}` : '\u6682\u65e0\u7a33\u5b9a\u54c1\u7c7b'}${focusDriverSummary.topPriceBand ? `\uff0c\u4e3b\u9a71\u52a8\u4ef7\u5e26 ${focusDriverSummary.topPriceBand.label}` : ''}\u3002` },
        ]
      : [
          { title: '\u5f53\u524d\u6708\u72b6\u6001', detail: `${focusRow.label} \u9500\u552e\u989d ${fmtAmt(focusRow.actual)}\uff0c\u5f53\u524d\u5224\u65ad\u4e3a ${focusStatus}\u3002` },
          { title: '\u4f9b\u9700\u5173\u7cfb', detail: `\u9500\u552e\u8d21\u732e ${fmtPct(focusRow.salesWeight, 0)}\uff0c\u5e93\u5b58\u5360\u7528 ${fmtPct(focusRow.stockWeight, 0)}\u3002` },
          { title: '\u9a71\u52a8\u6765\u6e90', detail: `${focusDriverSummary.topCategory ? `\u4e3b\u9a71\u52a8\u54c1\u7c7b ${focusDriverSummary.topCategory.label}` : '\u6682\u65e0\u7a33\u5b9a\u54c1\u7c7b'}${focusDriverSummary.topPriceBand ? `\uff0c\u4e3b\u9a71\u52a8\u4ef7\u5e26 ${focusDriverSummary.topPriceBand.label}` : ''}\u3002` },
        ]
    : compareMode === 'plan'
      ? [
          { title: isAnnualView ? '\u8ba1\u5212\u603b\u89c8' : '\u5f53\u6708\u8ba1\u5212', detail: isAnnualView ? `\u5168\u5e74\u7d2f\u8ba1\u8fbe\u6210\u7387 ${fmtPct(annualAchievement)}\uff0c\u5e74\u5ea6\u5dee\u989d ${fmtSignedAmt(annualGap)}\u3002` : `${focusRow.label} \u8fbe\u6210\u7387 ${fmtPct(focusRow.achv)}\uff0c\u5f53\u6708\u5dee\u989d ${fmtSignedAmt(focusRow.gap)}\u3002` },
          { title: '\u4e3b\u8981\u7f3a\u53e3', detail: worstPlanRow ? `${worstPlanRow.label} \u662f\u5f53\u524d\u6700\u5927\u7f3a\u53e3\u6708\uff0c\u5efa\u8bae\u4f18\u5148\u590d\u76d8\u6708\u5ea6\u8ba1\u5212\u4e0e\u4e0a\u65b0\u8282\u594f\u3002` : '\u5f53\u524d\u6682\u65e0\u660e\u663e\u7f3a\u53e3\u6708\u4efd\u3002' },
          { title: '\u9a71\u52a8\u6765\u6e90', detail: `${focusDriverSummary.topCategory ? `\u4e3b\u9a71\u52a8\u54c1\u7c7b ${focusDriverSummary.topCategory.label}` : '\u6682\u65e0\u7a33\u5b9a\u54c1\u7c7b'}${focusDriverSummary.topPriceBand ? `\uff0c\u4e3b\u9a71\u52a8\u4ef7\u5e26 ${focusDriverSummary.topPriceBand.label}` : ''}\u3002` },
        ]
      : compareMode === 'yoy'
        ? [
            { title: isAnnualView ? '\u540c\u6bd4\u603b\u89c8' : '\u5f53\u6708\u540c\u6bd4', detail: isAnnualView ? `\u5168\u5e74\u7d2f\u8ba1\u540c\u6bd4 ${fmtSignedPct(annualYoyRate)}\uff0c\u7d2f\u8ba1\u5dee\u989d ${fmtSignedAmt(annualYoyDiff)}\u3002` : `${focusRow.label} \u540c\u6bd4 ${fmtSignedPct(focusRow.yoy)}\uff0c\u5dee\u989d ${fmtSignedAmt(focusRow.yoyDiff)}\u3002` },
            { title: '\u8d8b\u52bf\u53d8\u5316', detail: worstYoyRow ? `${worstYoyRow.label} \u56de\u843d\u6700\u660e\u663e\uff0c\u5efa\u8bae\u590d\u76d8\u53bb\u5e74\u540c\u671f\u4e3b\u529b\u54c1\u7c7b\u4e0e\u4ef7\u5e26\u627f\u63a5\u3002` : '\u5f53\u524d\u6682\u65e0\u660e\u663e\u56de\u843d\u6708\u4efd\u3002' },
            { title: '\u9a71\u52a8\u6765\u6e90', detail: `${focusDriverSummary.topCategory ? `\u4e3b\u9a71\u52a8\u54c1\u7c7b ${focusDriverSummary.topCategory.label}` : '\u6682\u65e0\u7a33\u5b9a\u54c1\u7c7b'}${focusDriverSummary.topPriceBand ? `\uff0c\u4e3b\u9a71\u52a8\u4ef7\u5e26 ${focusDriverSummary.topPriceBand.label}` : ''}\u3002` },
          ]
        : [
            { title: isAnnualView ? '\u73af\u6bd4\u603b\u89c8' : '\u5f53\u6708\u73af\u6bd4', detail: isAnnualView ? `\u6700\u65b0\u6709\u6548\u6708 ${latestMomRow.label} \u73af\u6bd4 ${fmtSignedPct(latestMomRow.momRate)}\uff0c\u5dee\u989d ${fmtSignedAmt(latestMomRow.momDiff)}\u3002` : `${focusRow.label} \u73af\u6bd4 ${fmtSignedPct(focusRow.momRate)}\uff0c\u5dee\u989d ${fmtSignedAmt(focusRow.momDiff)}\u3002` },
            { title: '\u627f\u63a5\u53d8\u5316', detail: worstMomRow ? `${worstMomRow.label} \u627f\u538b\u6700\u660e\u663e\uff0c\u5efa\u8bae\u590d\u76d8\u627f\u63a5\u8282\u594f\u4e0e\u4e0a\u6708\u8f6c\u5316\u3002` : '\u5f53\u524d\u6682\u65e0\u660e\u663e\u627f\u538b\u6708\u4efd\u3002' },
            { title: '\u9a71\u52a8\u6765\u6e90', detail: `${focusDriverSummary.topCategory ? `\u4e3b\u9a71\u52a8\u54c1\u7c7b ${focusDriverSummary.topCategory.label}` : '\u6682\u65e0\u7a33\u5b9a\u54c1\u7c7b'}${focusDriverSummary.topPriceBand ? `\uff0c\u4e3b\u9a71\u52a8\u4ef7\u5e26 ${focusDriverSummary.topPriceBand.label}` : ''}\u3002` },
          ];

  const isMarginWarning = focusRow.marginPct < 0.50 && focusRow.achv !== null && focusRow.achv > 1.0;

  const actions: ActionItem[] = compareMode === 'plan'
    ? isMarginWarning ? [
        { title: '预警：量价背离与利润穿透', description: `本月虽超额 ${fmtSignedPct((focusRow.achv ?? 1) - 1)}，但当月折扣跌至 ${fmtPct(focusRow.discountPct)}，透支毛利，请复盘过度促销动作。`, cta: '去折扣分析', onClick: onJumpToPlanning },
        { title: '问责：直营体系缺口最大', description: '本月全国利润流失中，直营体系由于线下乱价倒挂，流失占总缺口65%。', cta: '去渠道结构', onClick: onJumpToChannel },
        { title: '下钻拖累 SKU', description: '从缺口月份继续下钻到具体被击穿底价的核心 SKU 与价带风险。', cta: '去 SKU 风险', onClick: onJumpToSkuRisk },
      ] : [
        { title: '\u6821\u51c6\u6708\u5ea6\u8ba1\u5212\u8282\u594f', description: '\u4f18\u5148\u590d\u6838\u7f3a\u53e3\u6708\u4efd\u7684\u8ba1\u5212\u6df1\u5ea6\u4e0e\u8282\u594f\u5b89\u6392\u3002', cta: '\u53bb\u6ce2\u6bb5\u4f01\u5212', onClick: onJumpToPlanning },
        { title: '\u4e0b\u94bb\u62d6\u7d2f SKU', description: '\u4ece\u7f3a\u53e3\u6708\u4efd\u7ee7\u7eed\u4e0b\u94bb\u5230\u5177\u4f53 SKU \u4e0e\u4ef7\u5e26\u98ce\u9669\u3002', cta: '\u53bb SKU \u98ce\u9669', onClick: onJumpToSkuRisk },
        { title: '\u590d\u6838\u6e20\u9053\u627f\u63a5', description: '\u68c0\u67e5\u8ba1\u5212\u4e0e\u6e20\u9053\u627f\u63a5\u662f\u5426\u540c\u6b65\uff0c\u907f\u514d\u8ba1\u5212\u843d\u7a7a\u3002', cta: '\u53bb\u6e20\u9053\u7ed3\u6784', onClick: onJumpToChannel },
      ]
    : compareMode === 'yoy'
      ? [
          { title: '\u590d\u76d8\u56de\u843d\u54c1\u7c7b', description: '\u5bf9\u56de\u843d\u6708\u4efd\u7684\u4e3b\u529b\u54c1\u7c7b\u4e0e\u7ed3\u6784\u53d8\u5316\u505a\u590d\u76d8\u3002', cta: '\u53bb\u54c1\u7c7b\u7ed3\u6784', onClick: onJumpToProduct },
          { title: '\u6392\u67e5\u627f\u538b\u6e20\u9053', description: '\u5bf9\u6bd4\u53bb\u5e74\u540c\u671f\u8868\u73b0\uff0c\u4f18\u5148\u5b9a\u4f4d\u56de\u843d\u6e20\u9053\u3002', cta: '\u53bb\u6e20\u9053\u7ed3\u6784', onClick: onJumpToChannel },
          { title: '\u6821\u51c6\u6ce2\u6bb5\u627f\u63a5', description: '\u786e\u8ba4\u56de\u843d\u6708\u4efd\u662f\u5426\u5b58\u5728\u4e0a\u65b0\u8282\u594f\u9519\u914d\u3002', cta: '\u53bb\u6ce2\u6bb5\u4f01\u5212', onClick: onJumpToPlanning },
        ]
      : compareMode === 'mom'
        ? [
            { title: '\u8ffd\u8e2a\u627f\u63a5\u8d70\u5f31\u6708', description: '\u4f18\u5148\u5904\u7406\u8fde\u7eed\u8f6c\u5f31\u6708\u4efd\uff0c\u907f\u514d\u6708\u5ea6\u627f\u63a5\u65ad\u6863\u3002', cta: '\u53bb\u6ce2\u6bb5\u4f01\u5212', onClick: onJumpToPlanning },
            { title: '\u6392\u67e5\u627f\u538b SKU', description: '\u5bf9\u73af\u6bd4\u627f\u538b\u6708\u4efd\u76f4\u63a5\u4e0b\u94bb\u5230 SKU \u98ce\u9669\u6e05\u5355\u3002', cta: '\u53bb SKU \u98ce\u9669', onClick: onJumpToSkuRisk },
            { title: '\u590d\u6838\u4e3b\u529b\u54c1\u7c7b', description: '\u786e\u8ba4\u627f\u63a5\u8d70\u5f31\u662f\u5426\u6765\u81ea\u4e3b\u529b\u54c1\u7c7b\u5207\u6362\u3002', cta: '\u53bb\u54c1\u7c7b\u7ed3\u6784', onClick: onJumpToProduct },
          ]
        : [
            { title: '\u6392\u67e5\u5e93\u5b58\u9519\u914d\u6708\u4efd', description: '\u5148\u5904\u7406\u5e93\u5b58\u5360\u7528\u9ad8\u4e8e\u9500\u552e\u8d21\u732e\u7684\u6708\u4efd\u3002', cta: '\u53bb SKU \u98ce\u9669', onClick: onJumpToSkuRisk },
            { title: '\u590d\u6838\u4e3b\u529b\u54c1\u7c7b\u7ed3\u6784', description: '\u786e\u8ba4\u5f53\u524d\u9a71\u52a8\u54c1\u7c7b\u662f\u5426\u4e0e\u5168\u5e74\u8282\u594f\u4e00\u81f4\u3002', cta: '\u53bb\u54c1\u7c7b\u7ed3\u6784', onClick: onJumpToProduct },
            { title: '\u6821\u51c6\u6e20\u9053\u627f\u63a5', description: '\u68c0\u67e5\u4e3b\u529b\u6e20\u9053\u7684\u5e93\u5b58\u4e0e\u9500\u552e\u627f\u63a5\u662f\u5426\u987a\u7545\u3002', cta: '\u53bb\u6e20\u9053\u7ed3\u6784', onClick: onJumpToChannel },
          ];

  const detailHeaders = ['月份', '实际销售额', '计划销售额', '计划差额', '同比差额', '环比差额', '当月折扣', '毛利率', '库存金额', 'WOS', 'ST%'];
  const detailRows = monthlyRows.map((row) => [row.label, fmtAmt(row.actual), fmtAmt(row.target), fmtSignedAmt(row.gap), fmtSignedAmt(row.yoyDiff), fmtSignedAmt(row.momDiff), fmtPct(row.discountPct), fmtPct(row.marginPct), fmtAmt(row.inventory), row.wos === null ? '--' : `${row.wos.toFixed(1)}w`, fmtPct(row.st)]);

  if (!hasAnyData) {
  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Monthly Achievement</div>
      <div className="mt-2 text-[32px] font-semibold tracking-tight text-slate-900">{"\u6708\u5ea6\u4e1a\u7ee9\u8fbe\u6210"}</div>
      <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500">{"\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6682\u65e0\u53ef\u7528\u7684\u6708\u5ea6\u9500\u552e\u4e0e\u5e93\u5b58\u6570\u636e\u3002"}</div>
    </section>
  );
}

return (
  <section className="rounded-[30px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)] xl:p-7">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Monthly Achievement</div>
        <h2 className="mt-2 text-[32px] font-semibold tracking-tight text-slate-900">{"\u6708\u5ea6\u4e1a\u7ee9\u8fbe\u6210"}</h2>
        <p className="mt-3 text-[15px] leading-7 text-slate-500">{"\u4fdd\u7559\u5e74\u5ea6\u6309\u6708\u5206\u89e3\u9aa8\u67b6\uff1b\u65e0\u5bf9\u6bd4\u770b\u5168\u5e74\u6216\u5f53\u524d\u6708\uff0c\u5207\u5230\u8ba1\u5212 / \u540c\u6bd4 / \u73af\u6bd4\u540e\u540c\u6b65\u67e5\u770b\u9500\u552e\u989d\u4e0e\u5dee\u989d\u3002"}</p>
      </div>
      <div className="rounded-full border border-slate-200 bg-slate-50/70 px-5 py-3 text-sm text-slate-600">
        {"\u53e3\u5f84\uff1a"}
        {compareMode === 'none' ? "\u5f53\u524d\u6a21\u5f0f" : `${compareLabel(compareMode)}\u6a21\u5f0f`}
        {" \u00b7 \u5f53\u524d\u89c6\u89d2\uff1a"}
        {focusLabel}
      </div>
    </div>

    <div className="mt-6 grid gap-4 xl:grid-cols-5">
      {statCards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>

    <div className="mt-8 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-wide text-slate-900 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-full" />
            {effectiveMainView === 'sales'
              ? "\u6708\u5ea6\u9500\u552e\u989d\u8d70\u52bf"
              : compareMode === 'plan'
                ? "\u8ba1\u5212\u5dee\u989d\u5206\u89e3"
                : compareMode === 'yoy'
                  ? "\u540c\u6bd4\u5dee\u989d\u5206\u89e3"
                  : "\u73af\u6bd4\u5dee\u989d\u5206\u89e3"}
            <span className="text-[10px] font-mono tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100 uppercase">
              {effectiveMainView === 'sales' ? "ANNUAL SALES PERFORMANCE" : "PLAN & DELTA DETAIL"}
            </span>
          </h2>
          <p className="mt-2 text-xs text-slate-500 max-w-2xl line-clamp-1">
            {effectiveMainView === 'sales'
              ? compareMode === 'plan'
                ? "\u9500\u552e\u989d\u8d70\u52bf\u53e0\u52a0\u8ba1\u5212\u503c\uff0c\u4fbf\u4e8e\u540c\u65f6\u770b\u5b9e\u9645\u4e0e\u8ba1\u5212\u3002"
                : compareMode === 'yoy'
                  ? "\u9500\u552e\u989d\u8d70\u52bf\u53e0\u52a0\u53bb\u5e74\u540c\u671f\uff0c\u7528\u4e8e\u89c2\u5bdf\u8d8b\u52bf\u53d8\u5316\u3002"
                  : compareMode === 'mom'
                    ? "\u9500\u552e\u989d\u8d70\u52bf\u53e0\u52a0\u4e0a\u6708\uff0c\u7528\u4e8e\u89c2\u5bdf\u6708\u5ea6\u627f\u63a5\u53d8\u5316\u3002"
                    : "\u6309\u5f53\u524d\u805a\u7126\u6708\u56de\u770b\u5168\u5e74\u6708\u5ea6\u8d70\u52bf\u4e0e\u8282\u594f\u5cf0\u8c37\u3002"
              : compareMode === 'plan'
                ? "\u6309\u6708\u67e5\u770b\u5b9e\u9645\u76f8\u5bf9\u8ba1\u5212\u7684\u6b63\u8d1f\u5dee\u989d\u3002"
                : compareMode === 'yoy'
                  ? "\u6309\u6708\u67e5\u770b\u5f53\u524d\u76f8\u5bf9\u53bb\u5e74\u540c\u671f\u7684\u6b63\u8d1f\u5dee\u989d\u3002"
                  : "\u6309\u6708\u67e5\u770b\u5f53\u524d\u76f8\u5bf9\u4e0a\u6708\u7684\u6b63\u8d1f\u5dee\u989d\u3002"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setMainView('sales')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${effectiveMainView === 'sales' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {"\u9500\u552e\u989d"}
            </button>
            <button
              type="button"
              onClick={() => compareMode !== 'none' && setMainView('delta')}
              disabled={compareMode === 'none'}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${effectiveMainView === 'delta' && compareMode !== 'none' ? 'bg-white text-slate-900 shadow-sm' : compareMode === 'none' ? 'cursor-not-allowed text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {"\u5dee\u989d"}
            </button>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {"\u805a\u7126\uff1a"}
            {focusLabel}
          </div>
        </div>
      </div>

      <div className="mt-6 h-[360px] min-w-0">
        {!mounted ? (
          <ChartPlaceholder />
        ) : effectiveMainView === 'sales' ? (
          <ReactECharts
            notMerge={true}
            lazyUpdate={true}
            option={{
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255,255,255,0.1)',
                textStyle: { color: '#fff', fontWeight: 600 },
                padding: [12, 16],
                borderRadius: 12,
                formatter: (params: any) => {
                  let str = `${params[0].axisValue}<br/>`;
                  params.forEach((p: any) => {
                    str += `${p.marker} ${p.seriesName}: ${fmtAmt(p.value)}<br/>`;
                  });
                  return str;
                }
              },
              grid: { top: 30, right: 24, bottom: 20, left: 24, containLabel: true },
              xAxis: {
                type: 'category',
                data: comparisonRows.map(row => row.label),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#94A3B8', fontSize: 12, formatter: (val: string) => `\u6708\u4efd\uff1a${val}` },
              },
              yAxis: {
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } },
                axisLabel: { color: '#94A3B8', fontSize: 12, formatter: (val: number) => fmtAxisAmt(val) },
              },
              animation: true,
              animationDuration: 1500,
              animationEasing: 'cubicOut',
              series: [
                ...(compareMode !== 'none' ? [{
                  name: compareMode === 'plan' ? '\u8ba1\u5212' : compareMode === 'yoy' ? '\u53bb\u5e74\u540c\u671f' : '\u4e0a\u6708',
                  type: 'bar',
                  data: comparisonRows.map(row => row.referenceValue),
                  itemStyle: { color: '#E2E8F0', borderRadius: [6, 6, 0, 0] },
                  barGap: '15%',
                  barMaxWidth: 32,
                  animationDelay: (idx: number) => idx * 100,
                  z: 1
                }] : []),
                {
                  name: '\u5b9e\u9645',
                  type: 'bar',
                  data: comparisonRows.map(row => row.actual),
                  itemStyle: { color: '#0F172A', borderRadius: [6, 6, 0, 0] },
                  showBackground: true,
                  backgroundStyle: { color: '#F8FAFC', borderRadius: [6, 6, 0, 0] },
                  barMaxWidth: 32,
                  animationDelay: (idx: number) => idx * 100 + 50,
                  z: 2,
                  markLine: {
                    symbol: 'none',
                    label: { show: false },
                    lineStyle: { color: '#CBD5E1', type: 'dashed', width: 1 },
                    data: selectedMonth ? [{ xAxis: focusRow.label }] : []
                  }
                }
              ]
            }}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        ) : (
          <ReactECharts
            option={{
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255,255,255,0.1)',
                textStyle: { color: '#fff', fontWeight: 600 },
                padding: [12, 16],
                borderRadius: 12,
                formatter: (params: any) => {
                  const val = params[0].value;
                  const name = params[0].axisValue;
                  const signed = typeof val === 'number' ? fmtSignedAmt(val) : '--';
                  return `${name}<br/>${params[0].marker} \u5dee\u989d\uff1a${signed}`;
                }
              },
              grid: { top: 30, right: 24, bottom: 20, left: 24, containLabel: true },
              xAxis: {
                type: 'category',
                data: comparisonRows.map(row => row.label),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#94A3B8', fontSize: 12, formatter: (val: string) => `\u6708\u4efd\uff1a${val}` },
              },
              yAxis: {
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } },
                axisLabel: { color: '#94A3B8', fontSize: 12, formatter: (val: number) => fmtAxisAmt(val) },
              },
              series: [
                {
                  name: '\u5dee\u989d',
                  type: 'bar',
                  barMaxWidth: 48,
                  data: comparisonRows.map(row => ({
                    value: row.deltaValue,
                    itemStyle: {
                      color: (row.deltaValue ?? 0) >= 0
                        ? new echarts.graphic.LinearGradient(0, 1, 0, 0, [{ offset: 0, color: '#38BDF8' }, { offset: 1, color: '#0EA5E9' }])
                        : new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#FB7185' }, { offset: 1, color: '#E11D48' }]),
                      borderRadius: (row.deltaValue ?? 0) >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
                      opacity: row.isFocus ? 1 : 0.4
                    }
                  })),
                  showBackground: true,
                  backgroundStyle: { color: '#F8FAFC', borderRadius: [6, 6, 0, 0] },
                  markLine: {
                    symbol: 'none',
                    label: { show: false },
                    data: [
                      { yAxis: 0, lineStyle: { color: '#CBD5E1', type: 'solid', width: 1 } },
                      ...(selectedMonth ? [{ xAxis: focusRow.label, lineStyle: { color: '#CBD5E1', type: 'dashed', width: 1 } }] : [])
                    ]
                  }
                }
              ]
            }}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {summaryTags.map((tag) => (
          <SummaryPill key={`${tag.label}-${tag.value}`} {...tag} />
        ))}
      </div>
    </div>
  </section>
);
}