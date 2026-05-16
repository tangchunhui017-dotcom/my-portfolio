'use client';
/**
 * src/components/dashboard/MetricsDrawer.tsx
 * 鞋类指标口径与企划标准抽屉 — V2.
 *
 * 数据源迁移 (loop V1.4 后):
 *   ✅ 核心指标 / 库龄层级 / 库龄结构 / 季节承接 / 季节生命周期 / 尺码 / 企划魔方 / 类目
 *      已统一改为读取中台 useMerchConfig（避免与「中台配置」两份重复维护）。
 *   ⏸ 服装→鞋类术语映射 / 常青款最小规则 / 系列定位 + 公共属性 + 场景选品 / 执行要求
 *      继续保留为内联静态数据（属于业务文档/业务规则，不属于"指标/维度/阈值"基础设定）。
 */
import { useMemo, useState } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import type { DimensionDefinition, MetricDefinition } from '@/types/merchConfig';
import {
    APPAREL_TO_FOOTWEAR_TERMS,
    FOOTWEAR_SERIES_POSITIONING,
    FOOTWEAR_EXECUTION_MANDATES,
} from '@/config/footwearLanguage';
import {
    FOOTWEAR_PUBLIC_ATTRIBUTE_TAGS,
    FOOTWEAR_SCENE_CATEGORY_PICKS,
} from '@/config/footwearTaxonomy';

// ── 业务规则（属于业务文档，不入中台基础设定）──────────────────────────────────
const MINIMAL_CARRYOVER_RULES = [
    {
        title: '当前准入方式',
        detail: '现阶段以 carryover_registry 白名单为准；未入白名单的 SKU 默认仍按季节货处理，不自动升级为常青款。',
    },
    {
        title: '最小状态机',
        detail: '常青款只保留 active 和 phasing_out 两种状态。active 继续走常销逻辑；phasing_out 视为退出常青，重新回到季节货清货口径。',
    },
    {
        title: '监控逻辑分流',
        detail: '季节货看售罄率与换季承接；常青款看库存水位、断码率和补货，不触发季末清仓预警。',
    },
    {
        title: '前台展示口径',
        detail: '承接图按 上一季 / 当前季 / 下一季 / 常青款 / 其他非主承接 展示。常青款不再并入灰色非主承接桶。',
    },
];

// 把中台 metric.category 映射回抽屉显示的中文 badge
const METRIC_CATEGORY_BADGE: Record<string, { label: string; cls: string }> = {
    sales:               { label: '经营结果', cls: 'bg-blue-100 text-blue-700' },
    profitability:       { label: '经营结果', cls: 'bg-blue-100 text-blue-700' },
    'price-discount':    { label: '价格折扣', cls: 'bg-amber-100 text-amber-700' },
    efficiency:          { label: '效率结构', cls: 'bg-emerald-100 text-emerald-700' },
    assortment:          { label: '货盘结构', cls: 'bg-violet-100 text-violet-700' },
    'lifecycle-structure': { label: '库龄结构', cls: 'bg-slate-100 text-slate-700' },
    'season-transition': { label: '季节承接', cls: 'bg-amber-100 text-amber-700' },
};

// 抽屉里核心指标块的 category 白名单（对应原 FOOTWEAR_CORE_METRICS 三档分类）
const CORE_METRIC_CATEGORIES = new Set(['sales', 'profitability', 'price-discount', 'efficiency']);

interface SizePhaseMeta {
    id: string;
    label: string;
    salesShare: number;
    startDate: string;
    endDate: string;
    sellThroughTargetMin: number;
    sellThroughTargetMax: number;
}

interface SizeValueMeta {
    gender?: string;
    lineType?: string;
    profileId?: string;
    bandDefinition?: string;
    sizeRange?: string[];
    small?: string[];
    core?: string[];
    large?: string[];
    curves?: Record<string, Record<string, number>>;
    enabled?: boolean;
    note?: string;
}

interface SizeDimensionMeta {
    dynamicAdjustments?: {
        regionClusters?: Record<string, string[]>;
        categoryBias?: Record<string, string[]>;
        channelBias?: Record<string, { edgeSizeFactor: number; note: string }>;
    };
}

interface PlanningAxisMeta {
    title?: string;
    englishName?: string;
    coreLogic?: string;
}

interface CategoryValueMeta {
    level?: number;
    categoryLevel?: string;
}

const GENDER_LABEL: Record<string, string> = { women: '女鞋', men: '男鞋', kids: '童鞋', unisex: '中性' };
const LINE_TYPE_LABEL: Record<string, string> = { fashion_casual: '时装休闲', sport_casual: '运动休闲' };
const REGION_CLUSTER_LABEL: Record<string, string> = {
    north_china: '华北', northeast_china: '东北', northwest_china: '西北',
    south_china: '华南', southwest_china: '西南', east_china: '华东',
};
const CATEGORY_BIAS_LABEL: Record<string, string> = {
    boots: '冬靴', dad_shoes: '老爹鞋', running: '运动跑鞋', outdoor: '户外鞋',
    heels: '高跟鞋', pumps: '浅口单鞋', ballet: '芭蕾鞋', mary_jane: '玛丽珍',
};
const CHANNEL_BIAS_LABEL: Record<string, string> = { offline: '线下门店', online: '线上电商' };

function formatCurve(curve: Record<string, number> | undefined) {
    if (!curve) return '—';
    return Object.entries(curve)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([size, qty]) => `${size}:${qty}`)
        .join(' / ');
}

function formatCodeList(codes: string[] | undefined, labelMap: Record<string, string>) {
    if (!codes || codes.length === 0) return '—';
    return codes.map((code) => labelMap[code] || code).join('、');
}

// 类目层级递归渲染（最多 3 层）
function buildCategoryHierarchy(category: DimensionDefinition | undefined) {
    if (!category) return [];
    const l1 = category.values.filter((v) => (v.metadata as CategoryValueMeta | undefined)?.level === 1);
    return l1.map((l1Item) => {
        const l2 = category.values.filter((v) => v.parentId === l1Item.id);
        return {
            l1: l1Item,
            l2Children: l2.map((l2Item) => {
                const l3 = category.values
                    .filter((v) => v.parentId === l2Item.id)
                    .map((v) => v.label);
                return { l2: l2Item, l3 };
            }),
        };
    });
}

export default function MetricsDrawer({ iconOnly = false }: { iconOnly?: boolean }) {
    const [open, setOpen] = useState(false);
    const { metrics, dimensions } = useMerchConfig();

    const coreMetrics = useMemo<MetricDefinition[]>(
        () => Array.from(metrics.values()).filter(
            (m) => m.defaultMetricType !== 'reference' && m.category && CORE_METRIC_CATEGORIES.has(m.category)
        ),
        [metrics],
    );
    const lifecycleStructureMetrics = useMemo<MetricDefinition[]>(
        () => Array.from(metrics.values()).filter((m) => m.category === 'lifecycle-structure'),
        [metrics],
    );
    const seasonTransitionMetrics = useMemo<MetricDefinition[]>(
        () => Array.from(metrics.values()).filter((m) => m.category === 'season-transition'),
        [metrics],
    );

    const inventoryAge = dimensions.get('inventory_age');
    const season = dimensions.get('season');
    const sizeDim = dimensions.get('size');
    const category = dimensions.get('category');
    const axisX = dimensions.get('planning_axis_x');
    const axisY = dimensions.get('planning_axis_y');
    const axisZ = dimensions.get('planning_axis_z');

    const sizeProfiles = (sizeDim?.values ?? []).filter((v) => {
        const meta = v.metadata as SizeValueMeta | undefined;
        return meta?.enabled !== false && meta?.profileId; // 排除 kids 这种未启用的 placeholder
    });
    const sizeDimMeta = (sizeDim?.metadata as SizeDimensionMeta | undefined) ?? {};
    const categoryHierarchy = useMemo(() => buildCategoryHierarchy(category), [category]);

    return (
        <>
            {iconOnly ? (
                <button
                    onClick={() => setOpen(true)}
                    className="flex h-8 w-[42px] items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                    title="指标口径"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </button>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    title="指标口径说明"
                >
                    <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold">i</span>
                    <span className="hidden sm:inline">指标口径</span>
                </button>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

                    <div className="w-full max-w-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">鞋类指标口径与企划标准</h2>
                                <p className="text-xs text-slate-500 mt-0.5">所有指标 / 维度 / 阈值来源于「中台配置」，修改请在中台进行。</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                                aria-label="关闭"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                            {/* ── 1. 核心指标口径（中台读取） ───────────────────────── */}
                            <section>
                                <SectionTitle>核心指标口径</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {coreMetrics.map((m) => {
                                        const badge = METRIC_CATEGORY_BADGE[m.category ?? ''] ?? METRIC_CATEGORY_BADGE.efficiency;
                                        return (
                                            <div key={m.metricId} className="border border-slate-100 rounded-lg p-3">
                                                <div className="flex items-start justify-between mb-1.5 gap-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900">{m.label}</h4>
                                                        <p className="text-[11px] text-slate-400">{m.englishName ?? m.metricId}</p>
                                                    </div>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-mono bg-slate-50 text-slate-600 px-2.5 py-2 rounded-md mb-2">
                                                    {m.formula || '—'}
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">{m.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                <SourceTag>来自「中台配置 → 指标定义」（共 {coreMetrics.length} 项）</SourceTag>
                            </section>

                            {/* ── 2. 库龄层级口径（中台读取） ───────────────────────── */}
                            <section>
                                <SectionTitle>库龄层级口径</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {(inventoryAge?.values ?? []).map((v) => {
                                        const meta = (v.metadata ?? {}) as { ageRange?: string; targetSellThrough?: string; inventoryAction?: string };
                                        return (
                                            <div key={v.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                                                <h4 className="font-semibold text-slate-900">{v.label}</h4>
                                                <p className="text-[11px] text-slate-400">{v.id}</p>
                                                <div className="mt-2 rounded-md bg-white border border-slate-100 px-2.5 py-2 text-xs text-slate-700 leading-relaxed">
                                                    {meta.ageRange ?? '—'}
                                                </div>
                                                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                                                    目标售罄 {meta.targetSellThrough ?? '—'} · {meta.inventoryAction ?? ''}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                                <SourceTag>来自「中台配置 → 维度定义 → 库龄段」</SourceTag>
                            </section>

                            {/* ── 3. 库龄层级销售结构（中台读取） ────────────────────── */}
                            <section>
                                <SectionTitle>库龄层级销售结构</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {lifecycleStructureMetrics.map((m) => (
                                        <div key={m.metricId} className="border border-slate-100 rounded-lg p-3">
                                            <h4 className="font-semibold text-slate-900">{m.label}</h4>
                                            <p className="text-[11px] text-slate-400">{m.englishName ?? m.metricId}</p>
                                            <div className="mt-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs font-mono text-slate-600">
                                                {m.formula || '—'}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">{m.description}</p>
                                        </div>
                                    ))}
                                </div>
                                <SourceTag>来自「中台配置 → 指标定义 → category: lifecycle-structure」</SourceTag>
                            </section>

                            {/* ── 4. 季节承接节奏（中台读取） ───────────────────────── */}
                            <section>
                                <SectionTitle>季节承接节奏</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {seasonTransitionMetrics.map((m) => (
                                        <div key={m.metricId} className="border border-slate-100 rounded-lg bg-slate-50 p-3">
                                            <h4 className="font-semibold text-slate-900">{m.label}</h4>
                                            <p className="text-[11px] text-slate-400">{m.englishName ?? m.metricId}</p>
                                            <div className="mt-2 rounded-md border border-slate-100 bg-white px-2.5 py-2 text-xs font-mono text-slate-600">
                                                {m.formula || '（业务侧输入，无前端公式）'}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">{m.description}</p>
                                        </div>
                                    ))}
                                </div>
                                <SourceTag>来自「中台配置 → 指标定义 → category: season-transition」</SourceTag>
                            </section>

                            {/* ── 5. 季节销售生命周期标准（中台读取 / season 维度） ──── */}
                            <section>
                                <SectionTitle>季节销售生命周期标准</SectionTitle>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {(season?.values ?? []).map((seasonValue) => {
                                        const meta = (seasonValue.metadata ?? {}) as { phases?: SizePhaseMeta[]; monthRange?: string };
                                        const phases = meta.phases ?? [];
                                        return (
                                            <div key={seasonValue.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900">{seasonValue.label}</h4>
                                                        <p className="text-[11px] text-slate-400">{seasonValue.id}</p>
                                                    </div>
                                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
                                                        {meta.monthRange ?? '—'}
                                                    </span>
                                                </div>
                                                <div className="mt-3 space-y-2">
                                                    {phases.map((phase) => (
                                                        <div key={`${seasonValue.id}-${phase.id}`} className="rounded-md border border-slate-100 bg-white px-2.5 py-2">
                                                            <div className="flex items-center justify-between gap-3 text-xs">
                                                                <span className="font-semibold text-slate-800">{phase.label}</span>
                                                                <span className="text-slate-500">{phase.startDate} ~ {phase.endDate}</span>
                                                            </div>
                                                            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                                                                <span>阶段占比 {(phase.salesShare * 100).toFixed(0)}%</span>
                                                                <span>累计售罄率目标 {(phase.sellThroughTargetMin * 100).toFixed(0)}-{(phase.sellThroughTargetMax * 100).toFixed(0)}%</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <SourceTag>来自「中台配置 → 维度定义 → 季节」每季 phases metadata</SourceTag>
                            </section>

                            {/* ── 6. 常青款最小规则（业务规则，保留内联） ──────────────── */}
                            <section>
                                <SectionTitle>常青款最小规则</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {MINIMAL_CARRYOVER_RULES.map((item) => (
                                        <div key={item.title} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                            <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                                            <div className="mt-2 text-xs leading-relaxed text-slate-600">{item.detail}</div>
                                        </div>
                                    ))}
                                </div>
                                <RuleTag>业务规则（不属于中台基础设定）</RuleTag>
                            </section>

                            {/* ── 7. 尺码标准、配比与动态修正（中台读取 / size 维度） ──── */}
                            <section>
                                <SectionTitle>尺码标准、配比与动态修正规则</SectionTitle>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">码段标准（小码 / 核心码 / 大码）</div>
                                        <div className="space-y-2">
                                            {sizeProfiles.map((profile) => {
                                                const meta = (profile.metadata ?? {}) as SizeValueMeta;
                                                return (
                                                    <div key={profile.id} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="text-xs font-semibold text-slate-800">
                                                            {GENDER_LABEL[meta.gender ?? ''] ?? meta.gender} · {LINE_TYPE_LABEL[meta.lineType ?? ''] ?? meta.lineType}
                                                        </div>
                                                        <div className="text-[11px] text-slate-600 mt-1">尺码池：{(meta.sizeRange ?? []).join(' / ') || '—'}</div>
                                                        <div className="text-[11px] text-slate-600 mt-0.5">
                                                            小码：{(meta.small ?? []).join(' / ') || '—'} ｜ 核心码：{(meta.core ?? []).join(' / ') || '—'} ｜ 大码：{(meta.large ?? []).join(' / ') || '—'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">标准配比组（10双装）</div>
                                        <div className="space-y-2">
                                            {sizeProfiles.map((profile) => {
                                                const meta = (profile.metadata ?? {}) as SizeValueMeta;
                                                const curves = meta.curves ?? {};
                                                return (
                                                    <div key={`${profile.id}-curve`} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="text-xs font-semibold text-slate-800">
                                                            {GENDER_LABEL[meta.gender ?? ''] ?? meta.gender} · {LINE_TYPE_LABEL[meta.lineType ?? ''] ?? meta.lineType}
                                                        </div>
                                                        <div className="text-[11px] text-slate-600 mt-1">标准：{formatCurve(curves.standard)}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">北区：{formatCurve(curves.north)}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">南区：{formatCurve(curves.south)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 border border-slate-100 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-slate-700 mb-2">动态修正规则</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                            <div className="text-[11px] font-semibold text-slate-700">地域变量</div>
                                            <div className="text-[11px] text-slate-600 mt-1">
                                                北区：{formatCodeList(sizeDimMeta.dynamicAdjustments?.regionClusters?.north, REGION_CLUSTER_LABEL)}
                                            </div>
                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                南区：{formatCodeList(sizeDimMeta.dynamicAdjustments?.regionClusters?.south, REGION_CLUSTER_LABEL)}
                                            </div>
                                        </div>
                                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                            <div className="text-[11px] font-semibold text-slate-700">品类变量</div>
                                            <div className="text-[11px] text-slate-600 mt-1">
                                                偏大一码：{formatCodeList(sizeDimMeta.dynamicAdjustments?.categoryBias?.upsize, CATEGORY_BIAS_LABEL)}
                                            </div>
                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                贴脚精配：{formatCodeList(sizeDimMeta.dynamicAdjustments?.categoryBias?.fitStrict, CATEGORY_BIAS_LABEL)}
                                            </div>
                                        </div>
                                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                            <div className="text-[11px] font-semibold text-slate-700">渠道变量</div>
                                            {Object.entries(sizeDimMeta.dynamicAdjustments?.channelBias ?? {}).map(([channel, rule]) => (
                                                <div key={channel} className="text-[11px] text-slate-600 mt-1">
                                                    <span className="font-medium text-slate-700">{CHANNEL_BIAS_LABEL[channel] || channel}：</span>
                                                    边缘码系数 {rule.edgeSizeFactor}，{rule.note}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <SourceTag>来自「中台配置 → 维度定义 → 尺码」每 profile metadata + dimension metadata.dynamicAdjustments</SourceTag>
                            </section>

                            {/* ── 8. 服装→鞋类术语映射（业务文档，保留内联） ──────────── */}
                            <section>
                                <SectionTitle>服装字段 → 鞋类字段映射</SectionTitle>
                                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">原字段（服装）</th>
                                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">标准字段（鞋类）</th>
                                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">说明</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {APPAREL_TO_FOOTWEAR_TERMS.map((item) => (
                                                <tr key={`${item.apparel}-${item.footwear}`} className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-slate-600">{item.apparel}</td>
                                                    <td className="px-3 py-2 text-slate-800 font-medium">{item.footwear}</td>
                                                    <td className="px-3 py-2 text-slate-500">{item.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <RuleTag>跨产线术语翻译表（业务文档）；指标级别的 aliases 已在中台指标定义中维护</RuleTag>
                            </section>

                            {/* ── 9. 类目层级（中台读取）+ 系列定位/属性/场景（业务文档） ── */}
                            <section>
                                <SectionTitle>类目与场景标准</SectionTitle>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {/* 类目层级 — 从 category 维度读 */}
                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">
                                            类目层级 <span className="text-[10px] text-slate-400">（中台 · category 维度）</span>
                                        </div>
                                        <div className="space-y-3">
                                            {categoryHierarchy.map((group) => (
                                                <div key={group.l1.id} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                    <div className="text-xs font-semibold text-slate-800">{group.l1.label}</div>
                                                    <div className="mt-2 space-y-2">
                                                        {group.l2Children.map((sub) => (
                                                            <div key={sub.l2.id} className="rounded border border-slate-200 bg-white px-2 py-1.5">
                                                                <div className="text-[11px] font-medium text-slate-700">{sub.l2.label}</div>
                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                    {sub.l3.map((leaf) => (
                                                                        <span key={`${sub.l2.id}-${leaf}`} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                                            {leaf}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border border-slate-100 rounded-lg p-3 space-y-3">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-700 mb-2">系列定位 <span className="text-[10px] text-slate-400">（业务文档）</span></div>
                                            <div className="space-y-2">
                                                {FOOTWEAR_SERIES_POSITIONING.map((item) => (
                                                    <div key={item.series} className="rounded-md bg-slate-50 px-2.5 py-2">
                                                        <div className="text-xs font-medium text-slate-800">{item.series}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-semibold text-slate-700 mb-2">公共属性标签 <span className="text-[10px] text-slate-400">（业务文档）</span></div>
                                            <div className="space-y-2">
                                                {FOOTWEAR_PUBLIC_ATTRIBUTE_TAGS.map((attr) => (
                                                    <div key={attr.group} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="text-[11px] font-medium text-slate-700 mb-1">{attr.group}</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {attr.tags.map((tag) => (
                                                                <span key={`${attr.group}-${tag}`} className="text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 border border-slate-100 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-slate-700 mb-2">场景选品建议 <span className="text-[10px] text-slate-400">（业务规则）</span></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {FOOTWEAR_SCENE_CATEGORY_PICKS.map((scene) => (
                                            <div key={scene.scene} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                <div className="text-xs font-semibold text-slate-800">{scene.scene}</div>
                                                <div className="text-[11px] text-slate-600 mt-1">适用一级：{scene.l1Focus.join(' / ')}</div>
                                                <div className="text-[11px] text-slate-600 mt-1">推荐二级：{scene.l2Recommended.join('、')}</div>
                                                <div className="text-[11px] text-slate-600 mt-1">推荐三级：{scene.l3Recommended.join('、')}</div>
                                                <div className="text-[11px] text-slate-500 mt-1">{scene.notes}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* ── 10. 三维企划魔方 X/Y/Z（中台读取） ────────────────── */}
                            <section>
                                <SectionTitle>三维企划魔方（X/Y/Z）</SectionTitle>
                                <div className="space-y-3">
                                    {[
                                        { axisCode: 'X', dim: axisX },
                                        { axisCode: 'Y', dim: axisY },
                                        { axisCode: 'Z', dim: axisZ },
                                    ].map(({ axisCode, dim }) => {
                                        if (!dim) return null;
                                        const meta = (dim.metadata ?? {}) as PlanningAxisMeta;
                                        return (
                                            <div key={axisCode} className="border border-slate-100 rounded-lg p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                    <div className="text-xs font-semibold text-slate-800">轴 {axisCode} · {meta.title ?? dim.label}</div>
                                                    <div className="text-[11px] text-slate-500">{meta.englishName ?? ''}</div>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-2">{meta.coreLogic ?? ''}</p>
                                                <div className="space-y-2">
                                                    {dim.values.map((v) => {
                                                        const vMeta = (v.metadata ?? {}) as { scope?: string; planningFocus?: string };
                                                        return (
                                                            <div key={`${axisCode}-${v.id}`} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">{v.id}</span>
                                                                    <span className="text-xs font-medium text-slate-800">{v.label}</span>
                                                                </div>
                                                                <div className="text-[11px] text-slate-500">范围：{vMeta.scope ?? '—'}</div>
                                                                <div className="text-[11px] text-slate-600 mt-0.5">企划导向：{vMeta.planningFocus ?? '—'}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <SourceTag>来自「中台配置 → 维度定义 → planning_axis_x/y/z」</SourceTag>
                            </section>

                            {/* ── 11. 执行要求（业务规则，保留内联） ─────────────────── */}
                            <section>
                                <SectionTitle>执行要求（上线前强校验）</SectionTitle>
                                <div className="space-y-2">
                                    {FOOTWEAR_EXECUTION_MANDATES.map((item) => (
                                        <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                                            <div className="text-xs text-slate-600 mt-1">{item.detail}</div>
                                        </div>
                                    ))}
                                </div>
                                <RuleTag>业务校验规则（不属于中台基础设定）</RuleTag>
                            </section>

                            { /* 找不到核心维度时的兜底提示 */ }
                            {!inventoryAge || !season || !sizeDim || !category || !axisX ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
                                    ⚠️ 中台部分维度未找到（库龄段 / 季节 / 尺码 / 类目 / 企划魔方）。请前往「中台配置 → 维度定义」检查。
                                </div>
                            ) : null}
                        </div>

                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-500">
                                抽屉内容现已与中台同源；指标 / 维度 / 阈值修改请在右上角「中台配置」抽屉内进行。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-bold text-slate-900 mb-3">{children}</h3>;
}

function SourceTag({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-1.5 text-[11px] leading-relaxed text-sky-700">
            🔗 {children}
        </div>
    );
}

function RuleTag({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] leading-relaxed text-slate-500">
            📜 {children}
        </div>
    );
}
