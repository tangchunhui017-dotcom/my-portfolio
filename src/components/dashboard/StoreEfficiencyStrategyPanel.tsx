'use client';

import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CityTierBucketCell, FormatTierMatrixCell, StoreFormatMixItem } from '@/hooks/useChannelAnalysis';

type ChannelSystemScope = 'all' | 'offline' | 'online';
type MatrixViewMode = 'store' | 'sales';
type BucketViewMode = 'store' | 'sales';

type MatrixCell = {
    store_format: string;
    city_tier: string;
    store_count: number;
    store_count_share: number;
    sales_share: number;
    efficiency_gap: number;
};

type BucketRow = {
    city_tier: string;
    bucket_values: Record<
        string,
        {
            store_pct: number;
            sales_pct: number;
            store_count: number;
            net_sales: number;
        }
    >;
    low_output_store_pct: number;
    low_output_sales_pct: number;
    warning: boolean;
};

type InsightTone = 'good' | 'warn' | 'risk';
type ActionPriority = '高' | '中';

type Insight = {
    id: string;
    tone: InsightTone;
    text: string;
};

type Action = {
    id: string;
    priority: ActionPriority;
    text: string;
};

const CITY_TIER_ORDER = ['全国', '一线', '新一线', '二线', '三线', '四线', '五线'];
const LOW_OUTPUT_THRESHOLD_STORE = 45;
const LOW_OUTPUT_THRESHOLD_SALES = 38;

function formatPct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

function formatWanAmount(value: number) {
    if (!Number.isFinite(value)) return '-';
    return `${(value / 10000).toFixed(1)}万`;
}

function safeDiv(numerator: number, denominator: number) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
    return numerator / denominator;
}

function clampRatio(value: number) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function tierSort(a: string, b: string) {
    const ai = CITY_TIER_ORDER.indexOf(a);
    const bi = CITY_TIER_ORDER.indexOf(b);
    const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (av !== bv) return av - bv;
    return a.localeCompare(b, 'zh-CN');
}

function getWarningThreshold(mode: BucketViewMode) {
    return mode === 'store' ? LOW_OUTPUT_THRESHOLD_STORE : LOW_OUTPUT_THRESHOLD_SALES;
}

function insightToneClass(tone: InsightTone) {
    if (tone === 'good') return 'border-emerald-200 bg-emerald-50/60';
    if (tone === 'warn') return 'border-amber-200 bg-amber-50/60';
    return 'border-rose-200 bg-rose-50/60';
}

function actionPriorityClass(priority: ActionPriority) {
    if (priority === '高') return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-amber-50 text-amber-700 border border-amber-200';
}

function InfoHoverTip({ title, lines }: { title: string; lines: string[] }) {
    return (
        <div className="relative group">
            <button
                type="button"
                aria-label={`${title}口径说明`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] text-slate-500 transition-colors hover:text-slate-700 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
                i
            </button>
            <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-30 w-[360px] max-w-[80vw] rounded-lg border border-slate-200 bg-white p-2.5 text-left text-[11px] leading-5 text-slate-600 shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="mb-1 text-[11px] font-semibold text-slate-800">{title}</div>
                <div className="space-y-0.5">
                    {lines.map((line) => (
                        <div key={line}>{line}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function pickTailTiers(tiers: string[]) {
    const explicit = tiers.filter((tier) => tier.includes('四线') || tier.includes('五线'));
    if (explicit.length > 0) return explicit;
    const sorted = [...tiers].sort(tierSort);
    return sorted.slice(Math.max(0, sorted.length - 2));
}

export default function StoreEfficiencyStrategyPanel({
    channelSystem = 'offline',
    storeFormatMix,
    formatTierMatrix,
    cityTierBucketMatrix,
}: {
    channelSystem?: ChannelSystemScope;
    storeFormatMix: StoreFormatMixItem[];
    formatTierMatrix: {
        formats: string[];
        tiers: string[];
        cells: FormatTierMatrixCell[];
    };
    cityTierBucketMatrix: {
        tiers: string[];
        buckets: string[];
        cells: CityTierBucketCell[];
    };
}) {
    const [matrixViewMode, setMatrixViewMode] = useState<MatrixViewMode>('store');
    const [bucketViewMode, setBucketViewMode] = useState<BucketViewMode>('store');

    const totalStoreCount = useMemo(
        () => storeFormatMix.reduce((sum, item) => sum + (item.store_count || 0), 0),
        [storeFormatMix],
    );

    const totalSales = useMemo(
        () => storeFormatMix.reduce((sum, item) => sum + (item.net_sales || 0), 0),
        [storeFormatMix],
    );

    const storeFormats = useMemo(() => {
        if (formatTierMatrix.formats.length > 0) return formatTierMatrix.formats;
        return Array.from(new Set(formatTierMatrix.cells.map((item) => item.store_format))).sort((a, b) =>
            a.localeCompare(b, 'zh-CN'),
        );
    }, [formatTierMatrix.cells, formatTierMatrix.formats]);

    const cityTiers = useMemo(() => {
        const source =
            formatTierMatrix.tiers.length > 0
                ? formatTierMatrix.tiers
                : Array.from(new Set(formatTierMatrix.cells.map((item) => item.city_tier)));
        return [...source].sort(tierSort);
    }, [formatTierMatrix.cells, formatTierMatrix.tiers]);

    const normalizedMatrixCells = useMemo<MatrixCell[]>(
        () =>
            formatTierMatrix.cells.map((cell) => {
                const storeShare = safeDiv(cell.store_count || 0, totalStoreCount || 1);
                const salesShare = safeDiv(cell.net_sales || 0, totalSales || 1);
                return {
                    store_format: cell.store_format,
                    city_tier: cell.city_tier,
                    store_count: cell.store_count,
                    store_count_share: clampRatio(storeShare),
                    sales_share: clampRatio(salesShare),
                    efficiency_gap: clampRatio(salesShare) - clampRatio(storeShare),
                };
            }),
        [formatTierMatrix.cells, totalSales, totalStoreCount],
    );

    const matrixHeatData = useMemo(() => {
        const xMap = new Map(cityTiers.map((tier, idx) => [tier, idx]));
        const yMap = new Map(storeFormats.map((format, idx) => [format, idx]));
        return normalizedMatrixCells.map((row) => [
            xMap.get(row.city_tier) ?? 0,
            yMap.get(row.store_format) ?? 0,
            (matrixViewMode === 'store' ? row.store_count_share : row.sales_share) * 100,
            row.store_count_share * 100,
            row.sales_share * 100,
            row.efficiency_gap * 100,
            row.store_count,
        ]);
    }, [cityTiers, matrixViewMode, normalizedMatrixCells, storeFormats]);

    const matrixRange = useMemo(() => {
        const values = matrixHeatData.map((row) => Number(row[2] || 0));
        if (values.length === 0) return { min: 0, max: 1 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [matrixHeatData]);

    const matrixOption = useMemo<EChartsOption>(
        () => ({
            animationDuration: 420,
            grid: { left: 88, right: 20, top: 24, bottom: 72 },
            tooltip: {
                trigger: 'item',
                borderColor: '#E5E7EB',
                formatter: (params: unknown) => {
                    const point = (params as { data?: (string | number)[] })?.data || [];
                    const xIdx = Number(point[0] || 0);
                    const yIdx = Number(point[1] || 0);
                    const storeShare = Number(point[3] || 0);
                    const salesShare = Number(point[4] || 0);
                    const gap = Number(point[5] || 0);
                    const count = Number(point[6] || 0);
                    const sign = gap >= 0 ? '+' : '';
                    return [
                        `<b>${storeFormats[yIdx] || '-'}</b> × ${cityTiers[xIdx] || '-'}`,
                        `店数：${count}店`,
                        `店数占比：${storeShare.toFixed(1)}%`,
                        `业绩占比：${salesShare.toFixed(1)}%`,
                        `效率差：${sign}${gap.toFixed(1)}pp`,
                    ].join('<br/>');
                },
            },
            xAxis: {
                type: 'category',
                data: cityTiers,
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisTick: { alignWithLabel: true },
                axisLabel: { color: '#64748B', fontSize: 11 },
            },
            yAxis: {
                type: 'category',
                data: storeFormats,
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#64748B', fontSize: 11 },
            },
            visualMap: {
                min: matrixRange.min,
                max: matrixRange.max,
                orient: 'horizontal',
                left: 'center',
                bottom: 2,
                calculable: false,
                text: ['高', '低'],
                textGap: 26,
                textStyle: { color: '#64748B', fontSize: 11 },
                inRange: {
                    color: ['#F8FAFC', '#E2E8F0', '#CBD5E1', '#94A3B8', '#334155'],
                },
            },
            series: [
                {
                    type: 'heatmap',
                    data: matrixHeatData,
                    label: {
                        show: true,
                        color: '#0F172A',
                        fontSize: 10,
                        formatter: (params: unknown) => {
                            const value = Number((params as { data?: (number | string)[] })?.data?.[2] || 0);
                            return `${value.toFixed(1)}%`;
                        },
                    },
                    itemStyle: {
                        borderColor: '#E2E8F0',
                        borderWidth: 1,
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: '#334155',
                            borderWidth: 1.2,
                        },
                    },
                },
            ],
        }),
        [cityTiers, matrixHeatData, matrixRange.max, matrixRange.min, storeFormats],
    );

    const salesBuckets = cityTierBucketMatrix.buckets;

    const lowOutputBuckets = useMemo(() => {
        const byName = salesBuckets.filter((bucket) => bucket.includes('低'));
        if (byName.length > 0) return byName;
        return salesBuckets.length > 0 ? [salesBuckets[salesBuckets.length - 1]] : [];
    }, [salesBuckets]);

    const cityTierBucketMap = useMemo(() => {
        const map = new Map<string, CityTierBucketCell>();
        cityTierBucketMatrix.cells.forEach((cell) => {
            map.set(`${cell.city_tier}__${cell.sales_bucket}`, cell);
        });
        return map;
    }, [cityTierBucketMatrix.cells]);

    const normalizedBucketRows = useMemo<BucketRow[]>(() => {
        const tiers = [...cityTierBucketMatrix.tiers].sort(tierSort);
        return tiers.map((tier) => {
            const rows = salesBuckets.map((bucket) => {
                const raw = cityTierBucketMap.get(`${tier}__${bucket}`);
                return {
                    sales_bucket: bucket,
                    store_count: Math.max(0, raw?.store_count || 0),
                    net_sales: Math.max(0, raw?.net_sales || 0),
                };
            });
            const tierStoreTotal = rows.reduce((sum, row) => sum + row.store_count, 0);
            const tierSalesTotal = rows.reduce((sum, row) => sum + row.net_sales, 0);
            const normalized = rows.map((row) => ({
                sales_bucket: row.sales_bucket,
                store_pct: safeDiv(row.store_count, tierStoreTotal || 1),
                sales_pct: safeDiv(row.net_sales, tierSalesTotal || 1),
                store_count: row.store_count,
                net_sales: row.net_sales,
            }));
            const lowOutputStorePct = normalized
                .filter((row) => lowOutputBuckets.includes(row.sales_bucket))
                .reduce((sum, row) => sum + row.store_pct, 0);
            const lowOutputSalesPct = normalized
                .filter((row) => lowOutputBuckets.includes(row.sales_bucket))
                .reduce((sum, row) => sum + row.sales_pct, 0);

            return {
                city_tier: tier,
                bucket_values: normalized.reduce<
                    Record<string, { store_pct: number; sales_pct: number; store_count: number; net_sales: number }>
                >((acc, row) => {
                    acc[row.sales_bucket] = {
                        store_pct: row.store_pct,
                        sales_pct: row.sales_pct,
                        store_count: row.store_count,
                        net_sales: row.net_sales,
                    };
                    return acc;
                }, {}),
                low_output_store_pct: lowOutputStorePct,
                low_output_sales_pct: lowOutputSalesPct,
                warning: lowOutputStorePct * 100 >= LOW_OUTPUT_THRESHOLD_STORE,
            };
        });
    }, [cityTierBucketMap, cityTierBucketMatrix.tiers, lowOutputBuckets, salesBuckets]);

    const tierStoreWeight = useMemo(() => {
        const map = new Map<string, number>();
        cityTierBucketMatrix.tiers.forEach((tier) => {
            const value = cityTierBucketMatrix.cells
                .filter((cell) => cell.city_tier === tier)
                .reduce((sum, cell) => sum + (cell.store_count_share || 0), 0);
            map.set(tier, value);
        });
        return map;
    }, [cityTierBucketMatrix.cells, cityTierBucketMatrix.tiers]);

    const tierSalesWeight = useMemo(() => {
        const map = new Map<string, number>();
        cityTierBucketMatrix.tiers.forEach((tier) => {
            const value = cityTierBucketMatrix.cells
                .filter((cell) => cell.city_tier === tier)
                .reduce((sum, cell) => sum + (cell.sales_share || 0), 0);
            map.set(tier, value);
        });
        return map;
    }, [cityTierBucketMatrix.cells, cityTierBucketMatrix.tiers]);

    const tailStats = useMemo(() => {
        const tailTiers = pickTailTiers(cityTierBucketMatrix.tiers);
        const tailStoreWeightTotal = tailTiers.reduce((sum, tier) => sum + (tierStoreWeight.get(tier) || 0), 0);
        const tailSalesWeightTotal = tailTiers.reduce((sum, tier) => sum + (tierSalesWeight.get(tier) || 0), 0);

        const lowStore = tailTiers.reduce((sum, tier) => {
            const row = normalizedBucketRows.find((item) => item.city_tier === tier);
            if (!row) return sum;
            return sum + row.low_output_store_pct * (tierStoreWeight.get(tier) || 0);
        }, 0);

        const lowSales = tailTiers.reduce((sum, tier) => {
            const row = normalizedBucketRows.find((item) => item.city_tier === tier);
            if (!row) return sum;
            return sum + row.low_output_sales_pct * (tierSalesWeight.get(tier) || 0);
        }, 0);

        return {
            tiers: tailTiers,
            lowStoreShare: safeDiv(lowStore, tailStoreWeightTotal || 1),
            lowSalesShare: safeDiv(lowSales, tailSalesWeightTotal || 1),
        };
    }, [cityTierBucketMatrix.tiers, normalizedBucketRows, tierSalesWeight, tierStoreWeight]);

    const bestCell = useMemo(
        () => [...normalizedMatrixCells].sort((a, b) => b.efficiency_gap - a.efficiency_gap)[0] || null,
        [normalizedMatrixCells],
    );

    const worstCell = useMemo(
        () => [...normalizedMatrixCells].sort((a, b) => a.efficiency_gap - b.efficiency_gap)[0] || null,
        [normalizedMatrixCells],
    );

    const warningTiers = useMemo(
        () =>
            normalizedBucketRows
                .filter((row) => row.warning)
                .map((row) => `${row.city_tier}（低产出${(row.low_output_store_pct * 100).toFixed(1)}%）`),
        [normalizedBucketRows],
    );

    const insights = useMemo<Insight[]>(
        () => [
            {
                id: 'tail-risk',
                tone: 'risk',
                text: `尾部风险警报：${tailStats.tiers.join('/')}低产出门店占比约${formatPct(
                    tailStats.lowStoreShare,
                )}，仅贡献${formatPct(tailStats.lowSalesShare)}业绩，存在结构拖累。`,
            },
            {
                id: 'eff-best',
                tone: 'good',
                text: bestCell
                    ? `高效样板：${bestCell.city_tier}·${bestCell.store_format}店数占比${formatPct(
                          bestCell.store_count_share,
                      )}，业绩占比${formatPct(bestCell.sales_share)}，效率溢价${(bestCell.efficiency_gap * 100).toFixed(1)}pp。`
                    : '高效样板：当前暂无显著高效店态组合。',
            },
            {
                id: 'eff-worst',
                tone: 'warn',
                text: worstCell
                    ? `结构背离：${worstCell.city_tier}·${worstCell.store_format}店数占比${formatPct(
                          worstCell.store_count_share,
                      )}，业绩占比${formatPct(worstCell.sales_share)}，效率缺口${(worstCell.efficiency_gap * 100).toFixed(1)}pp。`
                    : '结构背离：当前暂无明显低效店态组合。',
            },
        ],
        [bestCell, tailStats.lowSalesShare, tailStats.lowStoreShare, tailStats.tiers, worstCell],
    );

    const actions = useMemo<Action[]>(
        () => [
            {
                id: 'narrowing',
                priority: '高',
                text: '砍宽保利：对低产出长尾店群执行商品清单收敛，减少 Tier2/Tier3 下发，优先保留 Tier1 基础款。',
            },
            {
                id: 'depth',
                priority: '高',
                text: bestCell
                    ? `加深备货：向${bestCell.city_tier}·${bestCell.store_format}加深核心 SKU 深度，优先保障头部尺码完整度。`
                    : '加深备货：向高动销店态集中补深度，避免平均分货。',
            },
            {
                id: 'tier-rule',
                priority: '中',
                text: '级别定货矩阵：一/二线保留形象款试投，三线主打功能核心款，尾部线级执行“基础款+快反补单”组合。',
            },
            {
                id: 'warning',
                priority: '中',
                text:
                    warningTiers.length > 0
                        ? `预警店群：${warningTiers.join('，')}，建议同步压缩首单并加速去化节奏。`
                        : '预警店群：当前低产出占比可控，维持现有首单节奏并持续跟踪。',
            },
        ],
        [bestCell, warningTiers],
    );

    const bucketSeries = useMemo(
        () =>
            salesBuckets.map((bucket, idx) => ({
                name: bucket,
                type: 'bar' as const,
                stack: 'bucket',
                barMaxWidth: 40,
                itemStyle: {
                    color: ['#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1'][idx % 5],
                },
                data: normalizedBucketRows.map((row) => {
                    const value = row.bucket_values[bucket]?.[bucketViewMode === 'store' ? 'store_pct' : 'sales_pct'] || 0;
                    return value * 100;
                }),
            })),
        [bucketViewMode, normalizedBucketRows, salesBuckets],
    );

    const lowOutputLineData = useMemo(
        () =>
            normalizedBucketRows.map((row) =>
                (bucketViewMode === 'store' ? row.low_output_store_pct : row.low_output_sales_pct) * 100,
            ),
        [bucketViewMode, normalizedBucketRows],
    );

    const bucketWarningThreshold = getWarningThreshold(bucketViewMode);

    const bucketRuleText = useMemo(() => {
        const hasAbsoluteLabel = salesBuckets.some((bucket) => /[<>≤≥]|\d+/.test(bucket));
        if (hasAbsoluteLabel) {
            return `分档口径：${salesBuckets.join(' / ')}；低产出占比 = 中档 + 低档。`;
        }
        return '分档口径：当前筛选下按门店业绩分位分组，超高=前25%，高=25%-50%，中=50%-75%，低=后25%；低产出占比 = 中档 + 低档。';
    }, [salesBuckets]);

    const bucketThresholdText = useMemo(
        () =>
            `警戒线：低产出占比 ≥ ${bucketWarningThreshold}%（当前视角：${
                bucketViewMode === 'store' ? '按店数占比' : '按业绩占比'
            }）。`,
        [bucketViewMode, bucketWarningThreshold],
    );

    const bucketTooltipLines = useMemo(
        () => [
            bucketRuleText,
            bucketThresholdText,
            `当前视角：${bucketViewMode === 'store' ? '按店数占比%' : '按业绩占比%'}`,
        ],
        [bucketRuleText, bucketThresholdText, bucketViewMode],
    );

    const bucketOption = useMemo<EChartsOption>(
        () => ({
            animationDuration: 420,
            grid: { left: 52, right: 20, top: 28, bottom: 54 },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                borderColor: '#E5E7EB',
                formatter: (params: unknown) => {
                    const list = Array.isArray(params) ? (params as Array<{ axisValue?: string }>) : [];
                    const cityTier = list[0]?.axisValue || '';
                    const row = normalizedBucketRows.find((item) => item.city_tier === cityTier);
                    if (!row) return cityTier;
                    const detail = salesBuckets
                        .map((bucket) => {
                            const storePct = row.bucket_values[bucket]?.store_pct || 0;
                            const salesPct = row.bucket_values[bucket]?.sales_pct || 0;
                            const storeCount = row.bucket_values[bucket]?.store_count || 0;
                            const salesAmount = row.bucket_values[bucket]?.net_sales || 0;
                            const current = bucketViewMode === 'store' ? storePct : salesPct;
                            return `${bucket}：${(current * 100).toFixed(1)}%（店数${formatPct(storePct)} | ${storeCount}店；业绩${formatPct(
                                salesPct,
                            )} | ${formatWanAmount(salesAmount)}）`;
                        })
                        .join('<br/>');
                    const lowRatio =
                        (bucketViewMode === 'store' ? row.low_output_store_pct : row.low_output_sales_pct) * 100;
                    return [`<b>${cityTier}</b>`, detail, `低产出占比：${lowRatio.toFixed(1)}%`].join('<br/>');
                },
            },
            legend: {
                top: 0,
                icon: 'roundRect',
                itemWidth: 10,
                itemHeight: 8,
                textStyle: { color: '#64748B', fontSize: 11 },
            },
            xAxis: {
                type: 'category',
                data: normalizedBucketRows.map((row) => row.city_tier),
                axisLine: { lineStyle: { color: '#E5E7EB' } },
                axisLabel: { color: '#64748B', fontSize: 11 },
            },
            yAxis: {
                type: 'value',
                name: bucketViewMode === 'store' ? '店数占比%' : '业绩占比%',
                max: 100,
                axisLine: { show: false },
                axisLabel: { color: '#64748B', fontSize: 11, formatter: '{value}%' },
                splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } },
            },
            series: [
                ...bucketSeries,
                {
                    name: '低产出占比',
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    data: lowOutputLineData,
                    lineStyle: { color: '#EF4444', width: 2, type: 'dashed' },
                    itemStyle: { color: '#EF4444' },
                    markLine: {
                        symbol: 'none',
                        lineStyle: { color: '#EF4444', type: 'dashed' },
                        label: { color: '#EF4444', formatter: `警戒线 ${bucketWarningThreshold}%` },
                        data: [{ yAxis: bucketWarningThreshold }],
                    },
                },
            ],
        }),
        [bucketSeries, bucketViewMode, bucketWarningThreshold, lowOutputLineData, normalizedBucketRows, salesBuckets],
    );

    const matrixLabel = matrixViewMode === 'store' ? '店数占比' : '业绩占比';

    const showEmpty = storeFormats.length === 0 || cityTiers.length === 0 || salesBuckets.length === 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Store Efficiency Strategy</div>
                    <h2 className="text-base md:text-lg font-bold text-slate-900">门店能效结构与级别定货矩阵</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        用同源销售数据拆解“开店结构 vs 赚钱能力”，用于鞋类下发宽度与深度决策。
                    </p>
                </div>
                <div className="text-right">
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                        同源口径：fact_sales + dim_channel（按全局筛选实时分解）
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        当前体系：{channelSystem === 'online' ? '线上' : channelSystem === 'offline' ? '线下' : '全渠道'}
                    </div>
                </div>
            </div>

            {showEmpty ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    当前筛选下暂无门店结构数据
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
                        <div className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="text-sm font-semibold text-slate-900">图1：店态 × 城市级别 结构冷热矩阵</div>
                                <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
                                    <button
                                        onClick={() => setMatrixViewMode('store')}
                                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                            matrixViewMode === 'store' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
                                        }`}
                                    >
                                        看店数分布
                                    </button>
                                    <button
                                        onClick={() => setMatrixViewMode('sales')}
                                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                            matrixViewMode === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
                                        }`}
                                    >
                                        看业绩贡献
                                    </button>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 mb-2">
                                当前视角：{matrixLabel}。Tooltip 同时展示店数占比和业绩占比，快速识别“店多不赚钱”。
                            </div>
                            <ReactECharts option={matrixOption} style={{ height: 330, width: '100%' }} notMerge lazyUpdate />
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="text-sm font-semibold text-slate-900">图2：城市级别 × 门店业绩规模 长尾结构图</div>
                                    <InfoHoverTip title="分档口径说明" lines={bucketTooltipLines} />
                                </div>
                                <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
                                    <button
                                        onClick={() => setBucketViewMode('store')}
                                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                            bucketViewMode === 'store' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
                                        }`}
                                    >
                                        按店数占比
                                    </button>
                                    <button
                                        onClick={() => setBucketViewMode('sales')}
                                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                            bucketViewMode === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
                                        }`}
                                    >
                                        按业绩占比
                                    </button>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 mb-2">
                                观察增长是否依赖少数头部店，或被低产出门店拖累周转与折扣。
                            </div>
                            <div className="text-[11px] text-slate-500 mb-2">
                                当前口径门店总数：{totalStoreCount}店 ｜ 当前口径业绩：{formatWanAmount(totalSales)}
                            </div>
                            <ReactECharts option={bucketOption} style={{ height: 330, width: '100%' }} notMerge lazyUpdate />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 p-3">
                            <div className="text-sm font-semibold text-slate-900 mb-2">洞察摘要（Insights）</div>
                            <div className="space-y-2 text-xs">
                                {insights.map((item) => (
                                    <div key={item.id} className={`rounded-lg border p-2.5 ${insightToneClass(item.tone)}`}>
                                        {item.text}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3">
                            <div className="text-sm font-semibold text-slate-900 mb-2">商品企划动作（Actions）</div>
                            <div className="space-y-2 text-xs">
                                {actions.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`inline-flex h-5 items-center rounded px-2 text-[11px] font-semibold ${actionPriorityClass(item.priority)}`}>
                                                {item.priority}优先
                                            </span>
                                        </div>
                                        <div className="text-slate-700">{item.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

