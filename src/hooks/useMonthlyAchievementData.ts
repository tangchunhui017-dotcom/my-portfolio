'use client';

import { useMemo } from 'react';
import { matchesDashboardSkuCategoryFilters } from '@/hooks/useDashboardFilter';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import { useFactSalesForDashboard, useFactInventory, useDimSku, useDimChannel } from '@/hooks/useDashboardData';
import {
  deriveDashboardAnnualPlanTotal,
  deriveDashboardMonthlyPlanBreakdown,
  deriveScopedAnnualPlanTotal,
} from '@/config/dashboardPlan';
import { getDashboardMonthByWave } from '@/config/dashboardTime';
import { formatPriceBandLabel, matchesPriceBandFilter, resolvePriceBandByMsrp } from '@/config/priceBand';
import { resolveDashboardLifecycleLabel } from '@/config/dashboardLifecycle';

// ─── 数据类型 ─────────────────────────────────────────────────────────────────

export type FactSales = {
  sku_id: string;
  channel_id: string;
  season_year: string;
  season: string;
  wave: string;
  week_num: number;
  unit_sold: number;
  net_sales_amt: number;
  gross_sales_amt: number;
  discount_amt: number;
  gross_profit_amt: number;
  gross_margin_rate: number;
  cumulative_sell_through: number;
  is_carryover: boolean;
  launch_wave?: string;
};

export type FactInventory = {
  date: string;
  store_id: string;
  sku_id: string;
  bop_qty: number;
  inbound_qty: number;
  sales_qty: number;
  eop_qty: number;
  inventory_amount: number;
};

export type DimSku = {
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
  launch_wave?: string;
  is_carryover?: boolean;
};

export type DimChannel = {
  channel_id: string;
  channel_type?: string;
  channel_name?: string;
  region?: string;
  city_tier?: string;
  store_format?: string;
};

export type MonthRow = {
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
  /** 真实折扣率：折扣金额 / 吊牌销售额（来自 fact_sales.discount_amt / gross_sales_amt） */
  discountPct: number;
  /** 真实毛利率：毛利额 / 净销售额（来自 fact_sales.gross_profit_amt / net_sales_amt） */
  marginPct: number;
};

/** 渠道库存不均衡行 */
export type ChannelImbalanceRow = {
  channelType: string;
  inventoryShare: number;
  salesShare: number;
  /** 正值=库存占比高于销售占比（积压风险），负值=销售占比高于库存（断货风险） */
  imbalanceScore: number;
};

/** 新品起量曲线数据点 */
export type NewProductRampPoint = {
  monthsSinceLaunch: number;
  monthLabel: string;
  salesAmt: number;
  cumulativeAmt: number;
  skuCount: number;
};

export type MonthlyAchievementData = {
  selectedYear: number;
  selectedMonth: number | null;
  monthlyRows: MonthRow[];
  currentYearSales: FactSales[];
  skuMap: Record<string, DimSku>;
  hasAnyData: boolean;
  totalActual: number;
  totalTarget: number;
  totalLy: number;
  annualAchievement: number | null;
  annualGap: number | null;
  annualYoyDiff: number | null;
  annualYoyRate: number | null;
  latestActiveRow: MonthRow;
  focusRow: MonthRow;
  focusDriverSummary: {
    topCategory: { label: string; share: number } | null;
    topPriceBand: { label: string; share: number } | null;
  };
  channelImbalanceRows: ChannelImbalanceRow[];
  newProductRampData: NewProductRampPoint[];
};

// ─── 纯函数辅助 ───────────────────────────────────────────────────────────────

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const dimPlan = dimPlanRaw as unknown as {
  season_year?: number;
  overall_plan?: { plan_total_sales?: number };
  monthly_plan?: { month?: number; plan_sales_amt?: number }[];
};

function matchesTargetAudience(filters: DashboardFilters, sku: DimSku): boolean {
  if (filters.target_audience === 'all') return true;
  return sku.target_audience === filters.target_audience || sku.target_age_group === filters.target_audience;
}

function matchesColor(filters: DashboardFilters, sku: DimSku): boolean {
  if (filters.color === 'all') return true;
  return sku.color === filters.color || sku.color_family === filters.color;
}

function matchesChannelTypeFilter(selectedChannel: DashboardFilters['channel_type'], channel: DimChannel): boolean {
  if (selectedChannel === 'all') return true;
  const channelType = channel.channel_type ?? '';
  const channelText = `${channel.channel_name ?? ''} ${channel.store_format ?? ''}`;

  if (selectedChannel === '直播') {
    return channelType === '电商' && /直播|兴趣内容/.test(channelText);
  }
  if (selectedChannel === '奥莱') {
    return /奥莱|奥特莱斯|Outlet|折扣/i.test(channelText);
  }
  if (selectedChannel === '特渠') {
    return channelType === 'KA' || /特渠|团购/.test(channelText);
  }
  return channelType === selectedChannel;
}

function matchesScopedFilters(
  filters: DashboardFilters,
  sku: DimSku | undefined,
  channel: DimChannel | undefined,
): boolean {
  if (!sku || !channel) return false;
  if (!matchesDashboardSkuCategoryFilters(filters, sku)) return false;
  if (!matchesChannelTypeFilter(filters.channel_type, channel)) return false;
  if (filters.lifecycle !== 'all' && resolveDashboardLifecycleLabel(filters, sku) !== filters.lifecycle) return false;
  if (filters.region !== 'all' && channel.region !== filters.region) return false;
  if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
  if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
  if (!matchesTargetAudience(filters, sku)) return false;
  if (!matchesColor(filters, sku)) return false;
  if (!matchesPriceBandFilter(sku.msrp, filters.price_band, sku.price_band)) return false;
  return true;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMonthlyAchievementData(
  filters: DashboardFilters,
  compareMode: CompareMode,
): MonthlyAchievementData {
  void compareMode; // compareMode 保留供调用方将来扩展，当前计算层不依赖

  const { data: factSalesData } = useFactSalesForDashboard(filters.season_year);
  const { data: factInventoryData } = useFactInventory();
  const { data: dimSkuData } = useDimSku();
  const { data: dimChannelData } = useDimChannel();

  const factSales = useMemo(() => (factSalesData ?? []) as FactSales[], [factSalesData]);
  const factInventory = useMemo(() => (factInventoryData ?? []) as FactInventory[], [factInventoryData]);
  const dimSku = useMemo(() => (dimSkuData ?? []) as DimSku[], [dimSkuData]);
  const dimChannel = useMemo(() => (dimChannelData ?? []) as DimChannel[], [dimChannelData]);

  const selectedYear = useMemo(() => {
    if (typeof filters.season_year === 'number') return filters.season_year;
    const years = factSales
      .map((r) => Number(r.season_year || 0))
      .filter((y) => Number.isFinite(y) && y > 0);
    return years.length ? Math.max(...years) : 2024;
  }, [filters.season_year, factSales]);

  const selectedMonth = filters.wave !== 'all' ? getDashboardMonthByWave(String(filters.wave)) : null;

  const skuMap = useMemo(() => {
    const map: Record<string, DimSku> = {};
    dimSku.forEach((item) => { map[item.sku_id] = item; });
    return map;
  }, [dimSku]);

  const channelMap = useMemo(() => {
    const map: Record<string, DimChannel> = {};
    dimChannel.forEach((item) => { map[item.channel_id] = item; });
    return map;
  }, [dimChannel]);

  const currentYearSales = useMemo(() => {
    return factSales.filter((r) => {
      if (Number(r.season_year) !== selectedYear) return false;
      return matchesScopedFilters(filters, skuMap[r.sku_id], channelMap[r.channel_id]);
    });
  }, [channelMap, factSales, filters, selectedYear, skuMap]);

  const previousYearSales = useMemo(() => {
    return factSales.filter((r) => {
      if (Number(r.season_year) !== selectedYear - 1) return false;
      return matchesScopedFilters(filters, skuMap[r.sku_id], channelMap[r.channel_id]);
    });
  }, [channelMap, factSales, filters, selectedYear, skuMap]);

  const inventoryRows = useMemo(() => {
    return factInventory.filter((r) =>
      matchesScopedFilters(filters, skuMap[r.sku_id], channelMap[r.store_id]),
    );
  }, [channelMap, factInventory, filters, skuMap]);

  const overallAnnualActualTotal = useMemo(() => {
    return factSales.reduce((sum, r) => {
      if (Number(r.season_year) !== selectedYear) return sum;
      return sum + Number(r.net_sales_amt || 0);
    }, 0);
  }, [factSales, selectedYear]);

  // ─── 月度行计算（含所有修正）──────────────────────────────────────────────
  const monthlyRows = useMemo<MonthRow[]>(() => {
    const rows: MonthRow[] = MONTHS.map((month) => ({
      month,
      label: `${month}月`,
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

    // 月度中间累计器
    const byMonth = {
      discountAmt: new Array(12).fill(0) as number[],
      grossSalesAmt: new Array(12).fill(0) as number[],
      grossProfitAmt: new Array(12).fill(0) as number[],
      bopUnits: new Array(12).fill(0) as number[],
      inboundUnits: new Array(12).fill(0) as number[],
      soldUnits: new Array(12).fill(0) as number[],
      eopUnits: new Array(12).fill(0) as number[],
    };

    currentYearSales.forEach((r) => {
      const month = getDashboardMonthByWave(r.wave);
      if (!month) return;
      const idx = month - 1;
      rows[idx].actual += Number(r.net_sales_amt || 0);
      byMonth.discountAmt[idx] += Number(r.discount_amt || 0);
      byMonth.grossSalesAmt[idx] += Number(r.gross_sales_amt || 0);
      byMonth.grossProfitAmt[idx] += Number(r.gross_profit_amt || 0);
    });

    previousYearSales.forEach((r) => {
      const month = getDashboardMonthByWave(r.wave);
      if (!month) return;
      rows[month - 1].ly = Number(rows[month - 1].ly || 0) + Number(r.net_sales_amt || 0);
    });

    inventoryRows.forEach((r) => {
      const date = new Date(r.date);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth() + 1;
      if (month < 1 || month > 12) return;
      const idx = month - 1;
      rows[idx].inventory += Number(r.inventory_amount || 0);
      byMonth.bopUnits[idx] += Number(r.bop_qty || 0);
      byMonth.inboundUnits[idx] += Number(r.inbound_qty || 0);
      byMonth.soldUnits[idx] += Number(r.sales_qty || 0);
      byMonth.eopUnits[idx] += Number(r.eop_qty || 0);
    });

    const monthlyPlanSource = (dimPlan.monthly_plan || []).map((item) =>
      Number(item.plan_sales_amt || 0),
    );
    const annualPlanTotal = deriveDashboardAnnualPlanTotal(
      monthlyPlanSource,
      Number(dimPlan.overall_plan?.plan_total_sales || 0),
    );
    const scopedActualTotal = rows.reduce((sum, row) => sum + row.actual, 0);
    const scopedAnnualPlanTotal = deriveScopedAnnualPlanTotal(
      annualPlanTotal,
      scopedActualTotal,
      overallAnnualActualTotal,
    );
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

    rows.forEach((row, idx) => {
      row.target = breakdown.monthlyPlan[idx] ?? null;
      row.prevActual = prevActual;
      row.achv = row.target && row.target > 0 ? row.actual / row.target : null;
      row.gap = row.target !== null ? row.actual - row.target : null;
      row.yoyDiff = row.ly !== null ? row.actual - row.ly : null;
      row.yoy = row.ly !== null && row.ly > 0 ? (row.actual - row.ly) / row.ly : null;
      row.momDiff = prevActual !== null ? row.actual - prevActual : null;
      row.momRate = prevActual !== null && prevActual > 0 ? (row.actual - prevActual) / prevActual : null;
      // WOS 口径统一：期末库存双数 ÷ 周均销量双数（与 useDashboardFilter 口径一致）
      const weeklyUnits = byMonth.soldUnits[idx] / 4.33;
      row.wos = weeklyUnits > 0 ? byMonth.eopUnits[idx] / weeklyUnits : null;
      prevActual = row.actual;
    });

    rows.forEach((row, idx) => {
      row.salesWeight = totalActual > 0 ? row.actual / totalActual : 0;
      row.stockWeight = totalInventory > 0 ? row.inventory / totalInventory : 0;

      // [item 11] 真实折扣率：折扣金额 / 吊牌销售额
      row.discountPct =
        byMonth.grossSalesAmt[idx] > 0
          ? byMonth.discountAmt[idx] / byMonth.grossSalesAmt[idx]
          : 0;

      // [item 11] 真实毛利率：毛利额 / 净销售额
      row.marginPct =
        row.actual > 0 ? byMonth.grossProfitAmt[idx] / row.actual : 0;

      // [item 2] 正确售罄率：已售数量 / (期初 + 到货)
      const bopPlusInbound = byMonth.bopUnits[idx] + byMonth.inboundUnits[idx];
      row.st = bopPlusInbound > 0 ? byMonth.soldUnits[idx] / bopPlusInbound : null;
    });

    return rows;
  }, [currentYearSales, inventoryRows, overallAnnualActualTotal, previousYearSales]);

  // ─── 汇总聚合 ─────────────────────────────────────────────────────────────
  const totalActual = monthlyRows.reduce((sum, r) => sum + r.actual, 0);
  const totalTarget = monthlyRows.reduce((sum, r) => sum + (r.target ?? 0), 0);
  const totalLy = monthlyRows.reduce((sum, r) => sum + (r.ly ?? 0), 0);
  const annualAchievement = totalTarget > 0 ? totalActual / totalTarget : null;
  const annualGap = totalTarget > 0 ? totalActual - totalTarget : null;
  const annualYoyDiff = totalLy > 0 ? totalActual - totalLy : null;
  const annualYoyRate =
    totalLy > 0 && annualYoyDiff !== null ? annualYoyDiff / totalLy : null;

  const hasAnyData = monthlyRows.some(
    (r) => r.actual > 0 || r.inventory > 0 || (r.target ?? 0) > 0 || (r.ly ?? 0) > 0,
  );
  const latestActiveRow =
    [...monthlyRows]
      .reverse()
      .find((r) => r.actual > 0 || r.inventory > 0 || (r.target ?? 0) > 0 || (r.ly ?? 0) > 0) ||
    monthlyRows[monthlyRows.length - 1];
  const focusRow = selectedMonth ? monthlyRows[selectedMonth - 1] || latestActiveRow : latestActiveRow;

  // ─── 主驱动品类 / 价带 ────────────────────────────────────────────────────
  const focusDriverSummary = useMemo(() => {
    const relevantSales = currentYearSales.filter((r) => {
      const month = getDashboardMonthByWave(r.wave);
      if (!month) return false;
      return selectedMonth ? month === selectedMonth : true;
    });
    const scopedTotal = relevantSales.reduce((sum, r) => sum + Number(r.net_sales_amt || 0), 0);
    if (scopedTotal <= 0) return { topCategory: null, topPriceBand: null };

    const categoryMap = new Map<string, number>();
    const bandMap = new Map<string, number>();
    relevantSales.forEach((r) => {
      const sku = skuMap[r.sku_id];
      if (!sku) return;
      const amount = Number(r.net_sales_amt || 0);
      const categoryLabel =
        sku.category_name || sku.category_l2 || sku.product_line || sku.sku_name || '未分组';
      const priceBand = formatPriceBandLabel(sku.price_band || resolvePriceBandByMsrp(sku.msrp));
      categoryMap.set(categoryLabel, (categoryMap.get(categoryLabel) || 0) + amount);
      bandMap.set(priceBand, (bandMap.get(priceBand) || 0) + amount);
    });

    const topCategoryEntry = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topPriceBandEntry = [...bandMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const div = (a: number, b: number) => (b > 0 ? a / b : 0);

    return {
      topCategory: topCategoryEntry
        ? { label: topCategoryEntry[0], share: div(topCategoryEntry[1], scopedTotal) }
        : null,
      topPriceBand: topPriceBandEntry
        ? { label: topPriceBandEntry[0], share: div(topPriceBandEntry[1], scopedTotal) }
        : null,
    };
  }, [currentYearSales, selectedMonth, skuMap]);

  // ─── [item 5] 渠道库存分布不均衡度 ───────────────────────────────────────
  const channelImbalanceRows = useMemo<ChannelImbalanceRow[]>(() => {
    const inventoryByChannel = new Map<string, number>();
    const salesByChannel = new Map<string, number>();

    inventoryRows.forEach((r) => {
      const channel = channelMap[r.store_id];
      const ctype = channel?.channel_type || '其他';
      inventoryByChannel.set(ctype, (inventoryByChannel.get(ctype) || 0) + Number(r.inventory_amount || 0));
    });
    currentYearSales.forEach((r) => {
      const channel = channelMap[r.channel_id];
      const ctype = channel?.channel_type || '其他';
      salesByChannel.set(ctype, (salesByChannel.get(ctype) || 0) + Number(r.net_sales_amt || 0));
    });

    const totalInv = Array.from(inventoryByChannel.values()).reduce((s, v) => s + v, 0);
    const totalSales = Array.from(salesByChannel.values()).reduce((s, v) => s + v, 0);
    if (totalInv === 0 && totalSales === 0) return [];

    const channelTypes = new Set([...inventoryByChannel.keys(), ...salesByChannel.keys()]);
    return Array.from(channelTypes)
      .map((ctype) => {
        const inv = inventoryByChannel.get(ctype) || 0;
        const sales = salesByChannel.get(ctype) || 0;
        const invShare = totalInv > 0 ? inv / totalInv : 0;
        const salesShare = totalSales > 0 ? sales / totalSales : 0;
        return {
          channelType: ctype,
          inventoryShare: invShare,
          salesShare: salesShare,
          imbalanceScore: invShare - salesShare,
        };
      })
      .sort((a, b) => Math.abs(b.imbalanceScore) - Math.abs(a.imbalanceScore));
  }, [channelMap, currentYearSales, inventoryRows]);

  // ─── [item 4] 新品起量曲线 ────────────────────────────────────────────────
  const newProductRampData = useMemo<NewProductRampPoint[]>(() => {
    // 从 dim_sku 中找出当前年度的新品（非承接款 + 有上市 wave）
    const skuLaunchMonth = new Map<string, number>();
    dimSku.forEach((s) => {
      if (!s.is_carryover && s.launch_wave) {
        const lm = getDashboardMonthByWave(s.launch_wave);
        if (lm) skuLaunchMonth.set(s.sku_id, lm);
      }
    });

    const newSkuIds = new Set(skuLaunchMonth.keys());
    if (newSkuIds.size === 0) return [];

    const newSkuSales = currentYearSales.filter((r) => newSkuIds.has(r.sku_id));
    if (newSkuSales.length === 0) return [];

    // 按"上市起第 n 月"归组
    const monthOffsetMap = new Map<number, { amt: number; skuSet: Set<string> }>();
    newSkuSales.forEach((r) => {
      const saleMonth = getDashboardMonthByWave(r.wave);
      const launchMonth = skuLaunchMonth.get(r.sku_id);
      if (!saleMonth || !launchMonth) return;
      const offset = saleMonth - launchMonth;
      if (offset < 0 || offset > 11) return;
      if (!monthOffsetMap.has(offset)) monthOffsetMap.set(offset, { amt: 0, skuSet: new Set() });
      const entry = monthOffsetMap.get(offset)!;
      entry.amt += Number(r.net_sales_amt || 0);
      entry.skuSet.add(r.sku_id);
    });

    let cumulative = 0;
    return Array.from(monthOffsetMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([offset, data]) => {
        cumulative += data.amt;
        return {
          monthsSinceLaunch: offset,
          monthLabel: offset === 0 ? '上市当月' : `+${offset}月`,
          salesAmt: data.amt,
          cumulativeAmt: cumulative,
          skuCount: data.skuSet.size,
        };
      });
  }, [currentYearSales, dimSku]);

  return {
    selectedYear,
    selectedMonth,
    monthlyRows,
    currentYearSales,
    skuMap,
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
    channelImbalanceRows,
    newProductRampData,
  };
}
