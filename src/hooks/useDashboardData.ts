'use client';
/**
 * src/hooks/useDashboardData.ts
 *
 * 统一的商品企划数据获取层。
 * 所有 dashboard hook 从这里取数据，SWR 保证同一个 key 只请求一次。
 *
 * 用法：
 *   const { data, isLoading, error } = useDashboardData();
 */
import useSWR from 'swr';
import { useMemo } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
});

// ---- 每张表独立 SWR hook（共享缓存） ----

// 维度表几乎不变，缓存 10 分钟
const DIM_OPTIONS = { revalidateOnFocus: false, dedupingInterval: 10 * 60 * 1000 } as const;
// 事实表可能每日更新，缓存 5 分钟
const FACT_OPTIONS = { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000, keepPreviousData: true } as const;

export function useDimSku() {
    return useSWR('/api/dashboard/dim-sku', fetcher, DIM_OPTIONS);
}

export function useDimWavePlan() {
    return useSWR('/api/dashboard/dim-wave-plan', fetcher, DIM_OPTIONS);
}

export function useDimChannel() {
    return useSWR('/api/dashboard/dim-channel', fetcher, DIM_OPTIONS);
}

export function useDimCompetitor() {
    return useSWR('/api/dashboard/dim-competitor', fetcher, DIM_OPTIONS);
}

export function useFactSales(year?: string, season?: string, wave?: string) {
    const params = new URLSearchParams();
    if (year && year !== 'all') params.set('year', year);
    if (season && season !== 'all') params.set('season', season);
    if (wave && wave !== 'all') params.set('wave', wave);
    const qs = params.toString();
    return useSWR(`/api/dashboard/fact-sales${qs ? `?${qs}` : ''}`, fetcher, FACT_OPTIONS);
}

/**
 * 按当前年 + 上一年并行拉取 fact_sales，合并后返回。
 * YoY 所需的上年数据会在当年数据加载后补入；SWR 全局去重保证无重复请求。
 * 当 season_year === 'all' 时退化为全量单次请求。
 */
export function useFactSalesForDashboard(season_year: number | 'all') {
    const yearParam     = season_year !== 'all' ? String(season_year) : undefined;
    const prevYearParam = season_year !== 'all' ? String(Number(season_year) - 1) : undefined;

    const curr = useFactSales(yearParam);
    const prev = useFactSales(prevYearParam);

    const data = useMemo(() => {
        if (!curr.data && !prev.data) return undefined;
        return [...(curr.data ?? []), ...(prev.data ?? [])];
    }, [curr.data, prev.data]);

    return {
        data,
        isLoading: curr.isLoading && prev.isLoading,
        isPartiallyLoaded: !!(curr.data || prev.data),
        error: curr.error || prev.error,
    };
}

export function useFactOps(year?: string, season?: string) {
    const params = new URLSearchParams();
    if (year && year !== 'all') params.set('year', year);
    if (season && season !== 'all') params.set('season', season);
    const qs = params.toString();
    return useSWR(`/api/dashboard/fact-ops${qs ? `?${qs}` : ''}`, fetcher, FACT_OPTIONS);
}

/**
 * 按当前年 + 上一年并行拉取 fact_ops，合并后返回。
 */
export function useFactOpsForDashboard(season_year: number | 'all') {
    const yearParam     = season_year !== 'all' ? String(season_year) : undefined;
    const prevYearParam = season_year !== 'all' ? String(Number(season_year) - 1) : undefined;

    const curr = useFactOps(yearParam);
    const prev = useFactOps(prevYearParam);

    const data = useMemo(() => {
        if (!curr.data && !prev.data) return undefined;
        return [...(curr.data ?? []), ...(prev.data ?? [])];
    }, [curr.data, prev.data]);

    return {
        data,
        isLoading: curr.isLoading && prev.isLoading,
        isPartiallyLoaded: !!(curr.data || prev.data),
        error: curr.error || prev.error,
    };
}

export function useFactInventory() {
    return useSWR('/api/dashboard/fact-inventory', fetcher, FACT_OPTIONS);
}

export function useFactSizeSalesInventory(year?: string, season?: string, wave?: string) {
    const params = new URLSearchParams();
    if (year && year !== 'all') params.set('year', year);
    if (season && season !== 'all') params.set('season', season);
    if (wave && wave !== 'all') params.set('wave', wave);
    const qs = params.toString();
    return useSWR(`/api/dashboard/fact-size-sales-inventory${qs ? `?${qs}` : ''}`, fetcher, FACT_OPTIONS);
}

export function useFactPlan() {
    return useSWR('/api/dashboard/fact-plan', fetcher, FACT_OPTIONS);
}

export function useFactCompetitor() {
    return useSWR('/api/dashboard/fact-competitor', fetcher, FACT_OPTIONS);
}

// ---- 新增假设参数 hooks ----
const ASSUMPTION_OPTIONS = { revalidateOnFocus: false, dedupingInterval: 30 * 60 * 1000 } as const;

export function useForecastAssumptions() {
    return useSWR('/api/dashboard/forecast-assumptions', fetcher, ASSUMPTION_OPTIONS);
}

export function usePnlAssumptions() {
    return useSWR('/api/dashboard/pnl-assumptions', fetcher, ASSUMPTION_OPTIONS);
}

export function useCashflowAssumptions() {
    return useSWR('/api/dashboard/cashflow-assumptions', fetcher, ASSUMPTION_OPTIONS);
}

export function useSalesForecasts() {
    return useSWR('/api/dashboard/sales-forecasts', fetcher, FACT_OPTIONS);
}

export function useOtbBridgeInputs() {
    return useSWR('/api/dashboard/otb-bridge-inputs', fetcher, FACT_OPTIONS);
}

export function useForecastMerchMixData() {
    return useSWR('/api/dashboard/forecast-merch-mix', fetcher, DIM_OPTIONS);
}

export function usePnlMerchAssumptions() {
    return useSWR('/api/dashboard/pnl-merch-assumptions', fetcher, DIM_OPTIONS);
}

export function useOtbModelAssumptions() {
    return useSWR('/api/dashboard/otb-model-assumptions', fetcher, DIM_OPTIONS);
}
