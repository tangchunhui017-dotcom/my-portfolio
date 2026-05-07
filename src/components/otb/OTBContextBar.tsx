'use client';
/**
 * src/components/otb/OTBContextBar.tsx
 * OTB 业务上下文选择栏 — 品牌 / 渠道 / 年度 / 季度 / 季节 / 版本 / 单位
 * 所有 OTB 面板通过此上下文联动筛选
 */
import type { CurrencyUnit } from '@/utils/otbCalculations';
import brandsData from '../../../data/otb/brands.json';
import channelsData from '../../../data/otb/channels.json';

// ── 类型定义 ─────────────────────────────────────────────────────────────────

export interface OTBContext {
    brandId: string;
    channelId: string;
    year: number;
    quarter: 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
    season: 'all' | 'spring' | 'summer' | 'autumn' | 'winter' | 'ss' | 'aw';
    versionId: string;
    currencyUnit: CurrencyUnit;
}

export const DEFAULT_OTB_CONTEXT: OTBContext = {
    brandId: 'id-claw-main',
    channelId: 'omni-channel',
    year: 2026,
    quarter: 'all',
    season: 'all',
    versionId: 'approved',
    currencyUnit: 'wan',
};

// ── 选项配置 ──────────────────────────────────────────────────────────────────

const QUARTER_OPTIONS = [
    { value: 'all', label: '全年' },
    { value: 'Q1',  label: 'Q1'  },
    { value: 'Q2',  label: 'Q2'  },
    { value: 'Q3',  label: 'Q3'  },
    { value: 'Q4',  label: 'Q4'  },
] as const;

const SEASON_OPTIONS = [
    { value: 'all',    label: '全季节' },
    { value: 'spring', label: '🌱 春'  },
    { value: 'summer', label: '☀️ 夏'  },
    { value: 'autumn', label: '🍂 秋'  },
    { value: 'winter', label: '❄️ 冬'  },
    { value: 'ss',     label: 'SS 春夏' },
    { value: 'aw',     label: 'AW 秋冬' },
] as const;

const VERSION_OPTIONS = [
    { value: 'draft',     label: '初版'        },
    { value: 'pre-order', label: '订货会前版'   },
    { value: 'approved',  label: '✅ 审批版'    },
    { value: 'executing', label: '⚡ 执行版'    },
    { value: 'rolling',   label: '🔄 滚动调整版' },
    { value: 'review',    label: '📊 复盘版'    },
] as const;

const UNIT_OPTIONS: { value: CurrencyUnit; label: string }[] = [
    { value: 'yuan', label: '元'  },
    { value: 'wan',  label: '万'  },
    { value: 'yi',   label: '亿'  },
];

const VERSION_STATUS_COLOR: Record<string, string> = {
    draft:     'text-slate-500',
    'pre-order': 'text-blue-600',
    approved:  'text-emerald-600',
    executing: 'text-sky-600',
    rolling:   'text-amber-600',
    review:    'text-purple-600',
};

// ── 内部子组件 ────────────────────────────────────────────────────────────────

interface SelectProps<T extends string> {
    label: string;
    value: T;
    onChange: (v: T) => void;
    options: readonly { value: string; label: string }[];
}

function CtxSelect<T extends string>({ label, value, onChange, options }: SelectProps<T>) {
    return (
        <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">{label}</span>
            <select
                value={value}
                onChange={e => onChange(e.target.value as T)}
                className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-sky-400 cursor-pointer hover:border-slate-300 transition-colors"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface Props {
    context: OTBContext;
    onChange: (ctx: OTBContext) => void;
}

export default function OTBContextBar({ context, onChange }: Props) {
    const update = <K extends keyof OTBContext>(key: K, value: OTBContext[K]) =>
        onChange({ ...context, [key]: value });

    // 品牌/渠道/版本显示名
    const currentBrand   = (brandsData as BrandDef[]).find(b => b.brandId === context.brandId);
    const currentChannel = (channelsData as ChannelDef[]).find(c => c.channelId === context.channelId);
    const currentVersion = VERSION_OPTIONS.find(v => v.value === context.versionId);
    const currentSeason  = SEASON_OPTIONS.find(s => s.value === context.season);

    // 面包屑路径
    const breadcrumb = [
        currentBrand?.brandName   ?? '?',
        currentChannel?.channelName ?? '?',
        String(context.year),
        currentSeason?.label.replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '').trim() ?? '全季节',
        currentVersion?.label.replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '').trim() ?? '?',
    ].join(' / ');

    const versionColor = VERSION_STATUS_COLOR[context.versionId] ?? 'text-slate-600';

    return (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
                {/* 品牌 */}
                <CtxSelect<string>
                    label="品牌"
                    value={context.brandId}
                    onChange={v => update('brandId', v)}
                    options={(brandsData as BrandDef[]).map(b => ({ value: b.brandId, label: b.brandName }))}
                />

                <span className="text-slate-200">|</span>

                {/* 渠道 */}
                <CtxSelect<string>
                    label="渠道"
                    value={context.channelId}
                    onChange={v => update('channelId', v)}
                    options={(channelsData as ChannelDef[]).map(c => ({ value: c.channelId, label: c.channelName }))}
                />

                <span className="text-slate-200">|</span>

                {/* 年度 */}
                <CtxSelect<string>
                    label="年度"
                    value={String(context.year)}
                    onChange={v => update('year', parseInt(v) as OTBContext['year'])}
                    options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
                />

                {/* 季度 */}
                <CtxSelect<OTBContext['quarter']>
                    label="季度"
                    value={context.quarter}
                    onChange={v => update('quarter', v)}
                    options={QUARTER_OPTIONS}
                />

                {/* 季节 */}
                <CtxSelect<OTBContext['season']>
                    label="季节"
                    value={context.season}
                    onChange={v => update('season', v)}
                    options={SEASON_OPTIONS}
                />

                <span className="text-slate-200">|</span>

                {/* 版本 */}
                <CtxSelect<string>
                    label="版本"
                    value={context.versionId}
                    onChange={v => update('versionId', v)}
                    options={VERSION_OPTIONS}
                />

                {/* 单位切换 — 靠右 */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[10px] text-slate-400 font-medium">单位</span>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                        {UNIT_OPTIONS.map(u => (
                            <button
                                key={u.value}
                                onClick={() => update('currencyUnit', u.value)}
                                className={`px-3 py-1 text-xs font-medium transition-all ${context.currencyUnit === u.value ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                {u.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 面包屑 + 版本状态 */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-500">当前路径</span>
                    <span>·</span>
                    <span>{breadcrumb}</span>
                </div>
                <span className={`text-[10px] font-semibold ${versionColor}`}>
                    {currentVersion?.label ?? context.versionId}
                </span>
            </div>
        </div>
    );
}

// ── 内部类型 ──────────────────────────────────────────────────────────────────
interface BrandDef {
    brandId: string;
    brandName: string;
    positioning?: string;
    defaultGrossMarginTarget?: number;
    defaultSellThroughTarget?: number;
    defaultMarkupRate?: number;
    defaultDiscountRate?: number;
    defaultStockToSalesRatio?: number;
    defaultNewProductRatio?: number;
}
interface ChannelDef {
    channelId: string;
    channelName: string;
    channelType?: string;
    defaultSellThroughTarget?: number;
    defaultReturnRate?: number;
    defaultDiscountRate?: number;
    defaultStockToSalesRatio?: number;
}
