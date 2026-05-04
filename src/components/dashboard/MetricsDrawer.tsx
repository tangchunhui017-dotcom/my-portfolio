'use client';

import { useState } from 'react';
import {
    APPAREL_TO_FOOTWEAR_TERMS,
    FOOTWEAR_CORE_METRICS,
    FOOTWEAR_LIFECYCLE_DEFINITIONS,
    FOOTWEAR_LIFECYCLE_STRUCTURE_METRICS,
    FOOTWEAR_SEASON_TRANSITION_METRICS,
    FOOTWEAR_SERIES_POSITIONING,
    FOOTWEAR_PLANNING_CUBE_AXES,
    FOOTWEAR_EXECUTION_MANDATES,
} from '@/config/footwearLanguage';
import {
    DASHBOARD_SEASON_LIFECYCLE_NOTE,
    DASHBOARD_SEASON_LIFECYCLE_ORDER,
    DASHBOARD_SEASON_LIFECYCLE_STANDARDS,
} from '@/config/dashboardSeasonLifecycleStandards';
import {
    FOOTWEAR_CATEGORY_HIERARCHY,
    FOOTWEAR_PUBLIC_ATTRIBUTE_TAGS,
    FOOTWEAR_SCENE_CATEGORY_PICKS,
} from '@/config/footwearTaxonomy';
import sizeRuleMatrixRaw from '@/../data/taxonomy/size_rule_matrix.json';
import sizeCurvesRaw from '@/../data/taxonomy/size_curves.json';

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

const CATEGORY_COLORS: Record<string, string> = {
    经营结果: 'bg-blue-100 text-blue-700',
    价格折扣: 'bg-amber-100 text-amber-700',
    效率结构: 'bg-emerald-100 text-emerald-700',
};

type SizeBandDefinition = {
    size_range: string[];
    small: string[];
    core: string[];
    large: string[];
};

type SizeRuleProfile = {
    profile_id: string;
    gender: string;
    line_type: string;
    band_definition: string;
    curve_default: string;
    curve_north: string;
    curve_south: string;
};

type SizeRuleMatrixData = {
    band_definitions: Record<string, SizeBandDefinition>;
    base_profiles: SizeRuleProfile[];
    dynamic_adjustments: {
        region_clusters: Record<string, string[]>;
        category_bias: Record<string, string[]>;
        channel_bias: Record<string, { edge_size_factor: number; note: string }>;
    };
};

type SizeCurvesData = {
    curves: Record<string, Record<string, number>>;
};

const sizeRuleMatrix = sizeRuleMatrixRaw as SizeRuleMatrixData;
const sizeCurves = sizeCurvesRaw as SizeCurvesData;

const GENDER_LABEL: Record<string, string> = {
    women: '女鞋',
    men: '男鞋',
    unisex: '中性',
};

const LINE_TYPE_LABEL: Record<string, string> = {
    fashion_casual: '时装休闲',
    sport_casual: '运动休闲',
};

const REGION_CLUSTER_LABEL: Record<string, string> = {
    north_china: '华北',
    northeast_china: '东北',
    northwest_china: '西北',
    south_china: '华南',
    southwest_china: '西南',
    east_china: '华东',
};

const CATEGORY_BIAS_LABEL: Record<string, string> = {
    boots: '冬靴',
    dad_shoes: '老爹鞋',
    running: '运动跑鞋',
    outdoor: '户外鞋',
    heels: '高跟鞋',
    pumps: '浅口单鞋',
    ballet: '芭蕾鞋',
    mary_jane: '玛丽珍',
};

const CHANNEL_BIAS_LABEL: Record<string, string> = {
    offline: '线下门店',
    online: '线上电商',
};

function formatCurve(curve: Record<string, number> | undefined) {
    if (!curve) return '—';
    return Object.entries(curve)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([size, qty]) => `${size}:${qty}`)
        .join(' / ');
}

function formatCodeList(codes: string[], labelMap: Record<string, string>) {
    if (!codes.length) return '—';
    return codes.map((code) => labelMap[code] || code).join('、');
}

export default function MetricsDrawer({ iconOnly = false }: { iconOnly?: boolean }) {
    const [open, setOpen] = useState(false);

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
                                <p className="text-xs text-slate-500 mt-0.5">统一字段定义，保证看板口径一致、可追溯。</p>
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
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">核心指标口径</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {FOOTWEAR_CORE_METRICS.map((metric) => (
                                        <div key={metric.id} className="border border-slate-100 rounded-lg p-3">
                                            <div className="flex items-start justify-between mb-1.5 gap-2">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">{metric.name}</h4>
                                                    <p className="text-[11px] text-slate-400">{metric.english}</p>
                                                </div>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${CATEGORY_COLORS[metric.category]}`}>
                                                    {metric.category}
                                                </span>
                                            </div>
                                            <div className="text-xs font-mono bg-slate-50 text-slate-600 px-2.5 py-2 rounded-md mb-2">
                                                {metric.formula}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{metric.note}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">库龄层级口径</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {FOOTWEAR_LIFECYCLE_DEFINITIONS.map((item) => (
                                        <div key={item.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{item.label}</h4>
                                                <p className="text-[11px] text-slate-400">{item.english}</p>
                                            </div>
                                            <div className="mt-2 rounded-md bg-white border border-slate-100 px-2.5 py-2 text-xs text-slate-700 leading-relaxed">
                                                {item.rule}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">{item.note}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 leading-relaxed">
                                    口径说明：库龄层级分组以当前筛选的年/季为锚点；当筛选只到年、未锁定季节时，默认按商品归属季在该年内进行划分。
                                </div>
                            </section>
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">库龄层级销售结构</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {FOOTWEAR_LIFECYCLE_STRUCTURE_METRICS.map((item) => (
                                        <div key={item.id} className="border border-slate-100 rounded-lg p-3">
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{item.label}</h4>
                                                <p className="text-[11px] text-slate-400">{item.english}</p>
                                            </div>
                                            <div className="mt-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs font-mono text-slate-600">
                                                {item.formula}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">{item.note}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">季节承接节奏</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {FOOTWEAR_SEASON_TRANSITION_METRICS.map((item) => (
                                        <div key={item.id} className="border border-slate-100 rounded-lg bg-slate-50 p-3">
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{item.label}</h4>
                                                <p className="text-[11px] text-slate-400">{item.english}</p>
                                            </div>
                                            <div className="mt-2 rounded-md border border-slate-100 bg-white px-2.5 py-2 text-xs font-mono text-slate-600">
                                                {item.formula}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">{item.note}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                                    口径说明：季节承接节奏与库龄层级销售结构是两个维度。前者观察春夏秋冬货盘在预热、上新、主销、平销、清货各阶段的计划与实际偏差；后者观察新品、次新品、老品在销售结果中的结构占比与切换质量。
                                </div>
                            </section>
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">季节销售生命周期标准</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {DASHBOARD_SEASON_LIFECYCLE_ORDER.map((season) => {
                                        const item = DASHBOARD_SEASON_LIFECYCLE_STANDARDS[season];
                                        return (
                                            <div key={season} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900">{item.label}</h4>
                                                        <p className="text-[11px] text-slate-400">{item.english}</p>
                                                    </div>
                                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
                                                        {item.windowLabel}
                                                    </span>
                                                </div>
                                                <div className="mt-3 space-y-2">
                                                    {item.phases.map((phase) => (
                                                        <div key={`${season}-${phase.id}`} className="rounded-md border border-slate-100 bg-white px-2.5 py-2">
                                                            <div className="flex items-center justify-between gap-3 text-xs">
                                                                <span className="font-semibold text-slate-800">{phase.label}</span>
                                                                <span className="text-slate-500">{phase.rangeLabel}</span>
                                                            </div>
                                                            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                                                                <span>阶段占比 {(phase.salesShare * 100).toFixed(0)}%</span>
                                                                <span>累计售罄率目标 {phase.sellThroughTargetLabel}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                                    {DASHBOARD_SEASON_LIFECYCLE_NOTE}
                                </div>
                            </section>
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">常青款最小规则</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {MINIMAL_CARRYOVER_RULES.map((item) => (
                                        <div key={item.title} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                            <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                                            <div className="mt-2 text-xs leading-relaxed text-slate-600">{item.detail}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                                    当前版本先满足基础业务：常青款以白名单为准，季节货继续执行春/夏/秋/冬 5 阶段口径；后续再根据真实业务数据逐步引入自动准入算法和更细的保护期管理。
                                </div>
                            </section>
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">尺码标准、配比与动态修正规则</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">码段标准（小码 / 核心码 / 大码）</div>
                                        <div className="space-y-2">
                                            {sizeRuleMatrix.base_profiles.map((profile) => {
                                                const band = sizeRuleMatrix.band_definitions[profile.band_definition];
                                                return (
                                                    <div key={profile.profile_id} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="text-xs font-semibold text-slate-800">
                                                            {(GENDER_LABEL[profile.gender] || profile.gender)} · {(LINE_TYPE_LABEL[profile.line_type] || profile.line_type)}
                                                        </div>
                                                        <div className="text-[11px] text-slate-600 mt-1">尺码池：{band?.size_range.join(' / ') || '—'}</div>
                                                        <div className="text-[11px] text-slate-600 mt-0.5">
                                                            小码：{band?.small.join(' / ') || '—'} ｜ 核心码：{band?.core.join(' / ') || '—'} ｜ 大码：{band?.large.join(' / ') || '—'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">标准配比组（10双装）</div>
                                        <div className="space-y-2">
                                            {sizeRuleMatrix.base_profiles.map((profile) => (
                                                <div key={`${profile.profile_id}-curve`} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                    <div className="text-xs font-semibold text-slate-800">
                                                        {(GENDER_LABEL[profile.gender] || profile.gender)} · {(LINE_TYPE_LABEL[profile.line_type] || profile.line_type)}
                                                    </div>
                                                    <div className="text-[11px] text-slate-600 mt-1">标准：{formatCurve(sizeCurves.curves[profile.curve_default])}</div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">北区：{formatCurve(sizeCurves.curves[profile.curve_north])}</div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">南区：{formatCurve(sizeCurves.curves[profile.curve_south])}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 border border-slate-100 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-slate-700 mb-2">动态修正规则</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                            <div className="text-[11px] font-semibold text-slate-700">地域变量</div>
                                            <div className="text-[11px] text-slate-600 mt-1">
                                                北区：{formatCodeList(sizeRuleMatrix.dynamic_adjustments.region_clusters.north || [], REGION_CLUSTER_LABEL)}
                                            </div>
                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                南区：{formatCodeList(sizeRuleMatrix.dynamic_adjustments.region_clusters.south || [], REGION_CLUSTER_LABEL)}
                                            </div>
                                        </div>
                                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                            <div className="text-[11px] font-semibold text-slate-700">品类变量</div>
                                            <div className="text-[11px] text-slate-600 mt-1">
                                                偏大一码：{formatCodeList(sizeRuleMatrix.dynamic_adjustments.category_bias.upsize || [], CATEGORY_BIAS_LABEL)}
                                            </div>
                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                贴脚精配：{formatCodeList(sizeRuleMatrix.dynamic_adjustments.category_bias.fit_strict || [], CATEGORY_BIAS_LABEL)}
                                            </div>
                                        </div>
                                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                            <div className="text-[11px] font-semibold text-slate-700">渠道变量</div>
                                            {Object.entries(sizeRuleMatrix.dynamic_adjustments.channel_bias || {}).map(([channel, rule]) => (
                                                <div key={channel} className="text-[11px] text-slate-600 mt-1">
                                                    <span className="font-medium text-slate-700">{CHANNEL_BIAS_LABEL[channel] || channel}：</span>
                                                    边缘码系数 {rule.edge_size_factor}，{rule.note}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">服装字段 → 鞋类字段映射</h3>
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
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">类目与场景标准</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">类目层级</div>
                                        <div className="space-y-3">
                                            {FOOTWEAR_CATEGORY_HIERARCHY.map((group) => (
                                                <div key={group.l1} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                    <div className="text-xs font-semibold text-slate-800">{group.l1}</div>
                                                    <div className="mt-2 space-y-2">
                                                        {group.items.map((item) => (
                                                            <div key={`${group.l1}-${item.l2}`} className="rounded border border-slate-200 bg-white px-2 py-1.5">
                                                                <div className="text-[11px] font-medium text-slate-700">{item.l2}</div>
                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                    {item.l3.map((leaf) => (
                                                                        <span
                                                                            key={`${group.l1}-${item.l2}-${leaf}`}
                                                                            className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                                                        >
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
                                            <div className="text-xs font-semibold text-slate-700 mb-2">系列定位</div>
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
                                            <div className="text-xs font-semibold text-slate-700 mb-2">公共属性标签</div>
                                            <div className="space-y-2">
                                                {FOOTWEAR_PUBLIC_ATTRIBUTE_TAGS.map((attr) => (
                                                    <div key={attr.group} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="text-[11px] font-medium text-slate-700 mb-1">{attr.group}</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {attr.tags.map((tag) => (
                                                                <span
                                                                    key={`${attr.group}-${tag}`}
                                                                    className="text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600"
                                                                >
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
                                    <div className="text-xs font-semibold text-slate-700 mb-2">场景选品建议</div>
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

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">三维企划魔方（X/Y/Z）</h3>
                                <div className="space-y-3">
                                    {FOOTWEAR_PLANNING_CUBE_AXES.map((axis) => (
                                        <div key={axis.axis} className="border border-slate-100 rounded-lg p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                <div className="text-xs font-semibold text-slate-800">轴 {axis.axis} · {axis.title}</div>
                                                <div className="text-[11px] text-slate-500">{axis.english}</div>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-2">{axis.coreLogic}</p>
                                            <div className="space-y-2">
                                                {axis.values.map((item) => (
                                                    <div key={`${axis.axis}-${item.code}`} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">{item.code}</span>
                                                            <span className="text-xs font-medium text-slate-800">{item.label}</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">范围：{item.scope}</div>
                                                        <div className="text-[11px] text-slate-600 mt-0.5">企划导向：{item.planningFocus}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">执行要求（上线前强校验）</h3>
                                <div className="space-y-2">
                                    {FOOTWEAR_EXECUTION_MANDATES.map((item) => (
                                        <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                                            <div className="text-xs text-slate-600 mt-1">{item.detail}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-500">
                                当前为 Demo 口径。接入真实 ERP/CRM 后，只需替换数据源，不改口径定义。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
