'use client';

import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import { getDashboardMonthByWave } from '@/config/dashboardTime';
import { formatPriceBandLabel } from '@/config/priceBand';
import type { CurrencyUnit } from '@/utils/otbCalculations';

export type OTBVersion = 'initial' | 'pre-order' | 'approved' | 'executing' | 'rolling' | 'review';
export type OTBScenario = 'standard' | 'conservative' | 'optimistic' | 'sprint' | 'clearance';
export type OTBApprovalStatus = 'draft' | 'submitted' | 'approved' | 'locked' | 'executing' | 'reviewed';
export type OTBSalesCaliber = 'gross_sales' | 'net_sales';
export type OTBInventoryCaliber = 'cost' | 'retail';
export type OTBProcurementCaliber = 'ordered' | 'arrived';

export interface OTBLocalSettings {
    version: OTBVersion;
    scenario: OTBScenario;
    approvalStatus: OTBApprovalStatus;
    salesCaliber: OTBSalesCaliber;
    inventoryCaliber: OTBInventoryCaliber;
    procurementCaliber: OTBProcurementCaliber;
    currencyUnit: CurrencyUnit;
}

export const DEFAULT_OTB_LOCAL_SETTINGS: OTBLocalSettings = {
    version: 'approved',
    scenario: 'standard',
    approvalStatus: 'executing',
    salesCaliber: 'net_sales',
    inventoryCaliber: 'cost',
    procurementCaliber: 'arrived',
    currencyUnit: 'wan',
};

const VERSION_OPTIONS: { value: OTBVersion; label: string }[] = [
    { value: 'initial', label: '初版' },
    { value: 'pre-order', label: '订货会前版' },
    { value: 'approved', label: '审批版' },
    { value: 'executing', label: '执行版' },
    { value: 'rolling', label: '滚动调整版' },
    { value: 'review', label: '复盘版' },
];

const SCENARIO_OPTIONS: { value: OTBScenario; label: string }[] = [
    { value: 'standard', label: '标准版' },
    { value: 'conservative', label: '保守版' },
    { value: 'optimistic', label: '乐观版' },
    { value: 'sprint', label: '冲刺版' },
    { value: 'clearance', label: '清库存版' },
];

const APPROVAL_OPTIONS: { value: OTBApprovalStatus; label: string }[] = [
    { value: 'draft', label: '草稿' },
    { value: 'submitted', label: '待审批' },
    { value: 'approved', label: '已审批' },
    { value: 'locked', label: '已锁定' },
    { value: 'executing', label: '执行中' },
    { value: 'reviewed', label: '已复盘' },
];

const SALES_CALIBER_OPTIONS: { value: OTBSalesCaliber; label: string }[] = [
    { value: 'gross_sales', label: '销售额口径' },
    { value: 'net_sales', label: '净销售口径' },
];

const INVENTORY_CALIBER_OPTIONS: { value: OTBInventoryCaliber; label: string }[] = [
    { value: 'cost', label: '库存成本' },
    { value: 'retail', label: '库存吊牌' },
];

const PROCUREMENT_CALIBER_OPTIONS: { value: OTBProcurementCaliber; label: string }[] = [
    { value: 'ordered', label: '采购下单' },
    { value: 'arrived', label: '采购到货' },
];

const UNIT_OPTIONS: { value: CurrencyUnit; label: string }[] = [
    { value: 'yuan', label: '元' },
    { value: 'wan', label: '万元' },
    { value: 'yi', label: '亿元' },
];

function formatGlobalValue(value: string | number | 'all', fallback: string) {
    if (value === 'all' || value === '' || value === undefined || value === null) return fallback;
    return String(value);
}

function resolveMonthLabel(filters: DashboardFilters) {
    if (filters.wave === 'all') return '全月份';
    const month = getDashboardMonthByWave(filters.wave);
    return month ? `${month}月` : String(filters.wave);
}

function resolveCategoryLabel(filters: DashboardFilters) {
    const parts = [
        filters.category_l1 !== 'all' ? filters.category_l1 : '',
        filters.category_id !== 'all' ? filters.category_id : '',
        filters.sub_category !== 'all' ? filters.sub_category : '',
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' / ') : '全品类';
}

function resolvePriceBandLabel(priceBand: DashboardFilters['price_band']) {
    if (priceBand === 'all') return '全价格带';
    return formatPriceBandLabel(priceBand);
}

function getOptionLabel<T extends string>(options: { value: T; label: string }[], value: T) {
    return options.find(option => option.value === value)?.label ?? value;
}

interface CompactSelectProps<T extends string> {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}

function CompactSelect<T extends string>({ label, value, options, onChange }: CompactSelectProps<T>) {
    return (
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="whitespace-nowrap">{label}</span>
            <select
                value={value}
                onChange={event => onChange(event.target.value as T)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-sky-300 focus:border-sky-400"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </label>
    );
}

interface Props {
    filters: DashboardFilters;
    settings: OTBLocalSettings;
    onSettingsChange: (settings: OTBLocalSettings) => void;
}

export default function OTBContextSummary({ filters, settings, onSettingsChange }: Props) {
    const update = <K extends keyof OTBLocalSettings>(key: K, value: OTBLocalSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const globalSummary = [
        formatGlobalValue(filters.brand, '全部品牌'),
        filters.season_year === 'all' ? '全部年度' : `${filters.season_year}年`,
        resolveMonthLabel(filters),
        formatGlobalValue(filters.channel_type, '全渠道'),
        resolveCategoryLabel(filters),
        resolvePriceBandLabel(filters.price_band),
    ];

    const detailSummary = [
        formatGlobalValue(filters.season, '全季节'),
        formatGlobalValue(filters.lifecycle, '全部库龄'),
        getOptionLabel(VERSION_OPTIONS, settings.version),
        getOptionLabel(SCENARIO_OPTIONS, settings.scenario),
        getOptionLabel(APPROVAL_OPTIONS, settings.approvalStatus),
        getOptionLabel(INVENTORY_CALIBER_OPTIONS, settings.inventoryCaliber),
        getOptionLabel(PROCUREMENT_CALIBER_OPTIONS, settings.procurementCaliber),
        getOptionLabel(UNIT_OPTIONS, settings.currencyUnit),
    ];

    return (
        <div className="px-5 py-3.5 border-b border-slate-100">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">当前口径</span>
                        <span className="text-[11px] text-slate-400">继承商品企划全局筛选，OTB 独立维护版本与场景</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                        {globalSummary.join(' · ')}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                        {detailSummary.join(' · ')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <CompactSelect
                        label="版本"
                        value={settings.version}
                        options={VERSION_OPTIONS}
                        onChange={value => update('version', value)}
                    />
                    <CompactSelect
                        label="场景"
                        value={settings.scenario}
                        options={SCENARIO_OPTIONS}
                        onChange={value => update('scenario', value)}
                    />
                    <CompactSelect
                        label="状态"
                        value={settings.approvalStatus}
                        options={APPROVAL_OPTIONS}
                        onChange={value => update('approvalStatus', value)}
                    />
                    <CompactSelect
                        label="销售"
                        value={settings.salesCaliber}
                        options={SALES_CALIBER_OPTIONS}
                        onChange={value => update('salesCaliber', value)}
                    />
                    <CompactSelect
                        label="库存"
                        value={settings.inventoryCaliber}
                        options={INVENTORY_CALIBER_OPTIONS}
                        onChange={value => update('inventoryCaliber', value)}
                    />
                    <CompactSelect
                        label="采购"
                        value={settings.procurementCaliber}
                        options={PROCUREMENT_CALIBER_OPTIONS}
                        onChange={value => update('procurementCaliber', value)}
                    />
                    <CompactSelect
                        label="单位"
                        value={settings.currencyUnit}
                        options={UNIT_OPTIONS}
                        onChange={value => update('currencyUnit', value)}
                    />
                </div>
            </div>
        </div>
    );
}
