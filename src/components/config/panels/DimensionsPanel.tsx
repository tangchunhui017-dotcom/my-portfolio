'use client';
/**
 * src/components/config/panels/DimensionsPanel.tsx
 * 维度定义管理面板 V18 — 横向 Tab + 行内编辑 + 中文化
 */
import { Fragment, useMemo, useState } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import type { DimensionDefinition, DimensionValue } from '@/types/merchConfig';

function formatPercentValue(value: unknown): string {
    if (typeof value !== 'number') return String(value);
    const percent = value <= 1 ? value * 100 : value;
    const formatted = Number.isInteger(percent) ? String(percent) : percent.toFixed(1).replace(/\.0$/, '');
    return `${formatted}%`;
}

function formatMetaObjectValue(value: Record<string, unknown>): string {
    const labels: Record<string, string> = {
        salesPerSqm: '坪效',
    };

    return Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${labels[k] ?? k}${String(v)}`)
        .join(' / ');
}

function formatMetaValue(key: string, value: unknown): string {
    if (Array.isArray(value)) return `${value.length}项`;
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (key === 'salesRatioTarget') return formatPercentValue(value);
    if (typeof value === 'object' && value !== null) return formatMetaObjectValue(value as Record<string, unknown>) || '已配置';
    return String(value);
}

// 元数据值转可读中文标签
function metaToChips(metadata: Record<string, unknown> | undefined): string[] {
    if (!metadata) return [];
    const priceMin = metadata.min ?? metadata.priceMin;
    const priceMax = metadata.max ?? metadata.priceMax;
    const priceChip = priceMin !== undefined || priceMax !== undefined
        ? [`价格范围: ${priceMin ?? '不限'}${priceMax !== undefined ? `-${priceMax}` : '+'}`]
        : [];

    return [
        ...priceChip,
        ...Object.entries(metadata)
        .filter(([k]) => !['allProvinces', 'allExamples', 'candidateCities', 'sourceType'].includes(k))
        .filter(([k]) => !['min', 'max', 'priceMin', 'priceMax'].includes(k))
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => {
            const labels: Record<string, string> = {
                provinces: '省份',
                examples: '代表城市',
                mappedCities: '已归入城市',
                tier: '城市级别',
                storeType: '店型',
                lastType: '楦型',
                priceMin: '最低价',
                priceMax: '最高价',
                channel: '渠道',
                role: '角色',
                gender: '性别',
                lineType: '鞋线',
                profileId: '尺码口径',
                bandDefinition: '码段',
                sizeRange: '尺码池',
                small: '小码',
                core: '核心码',
                large: '大码',
                enabled: '启用',
                criteria: '分级条件',
                salesRatioTarget: '目标销售占比',
                year: '年份',
                fiscalMonths: '财年月份',
                status: '状态',
                monthRange: '月份范围',
                planningMonths: '包含月份',
                mainCategories: '主导品类',
                season: '归属季节',
                seasonGroup: '季组',
                launchWindow: '上市窗口',
                waveRole: '波段角色',
                categoryLevel: '类目层级',
                subCategories: '二级品类',
                recommendedWaves: '推荐波段',
                ssRange: '春夏窗口',
                awRange: '秋冬窗口',
                ageRange: '库龄天数',
                targetSellThrough: '目标售罄率',
                inventoryAction: '库存动作',
            };
            const key = labels[k] ?? k;
            const val = formatMetaValue(k, v);
            return `${key}: ${val}`;
        }),
    ];
}

function getProvinceOptions(value: DimensionValue): string[] {
    const metadata = value.metadata as Record<string, unknown> | undefined;
    const allProvinces = metadata?.allProvinces;
    const provinces = metadata?.provinces;
    const source = Array.isArray(allProvinces) ? allProvinces : provinces;

    return Array.isArray(source) ? source.filter((item): item is string => typeof item === 'string') : [];
}

function getSelectedProvinces(value: DimensionValue): string[] {
    const metadata = value.metadata as Record<string, unknown> | undefined;
    const provinces = metadata?.provinces;

    return Array.isArray(provinces) ? provinces.filter((item): item is string => typeof item === 'string') : [];
}

type StructuredListConfig = {
    kind: 'region' | 'city_tier';
    key: string;
    allKey: string;
    title: string;
    options: string[];
    selected: string[];
    help: string;
};

function getArrayFromMetadata(value: DimensionValue, key: string): string[] {
    const raw = (value.metadata as Record<string, unknown> | undefined)?.[key];
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function getStructuredListConfig(dimensionType: string, value: DimensionValue): StructuredListConfig | null {
    if (dimensionType === 'region') {
        const options = getProvinceOptions(value);
        if (options.length === 0) return null;

        return {
            kind: 'region',
            key: 'provinces',
            allKey: 'allProvinces',
            title: '业务省份',
            options,
            selected: getSelectedProvinces(value),
            help: '默认包含该区域全部省份；取消勾选表示当前品牌暂不在该省做区域业务统计。',
        };
    }

    if (dimensionType === 'city_tier') {
        const metadata = getMeta(value);
        const candidateCities = getArrayFromMetadata(value, 'candidateCities');
        const mappedCities = getArrayFromMetadata(value, 'mappedCities');
        const allExamples = getArrayFromMetadata(value, 'allExamples');
        const examples = getArrayFromMetadata(value, 'examples');
        const options = candidateCities.length > 0 ? candidateCities : allExamples.length > 0 ? allExamples : examples;
        if (options.length === 0) return null;

        return {
            kind: 'city_tier',
            key: 'mappedCities',
            allKey: 'candidateCities',
            title: '已归入城市',
            options,
            selected: Array.isArray(metadata.mappedCities) ? mappedCities : examples,
            help: '当前为行业样例；接入门店主数据后，候选城市来自该品牌有店城市，未归类城市进入待配置。',
        };
    }

    return null;
}

const SIZE_GENDER_TABS = [
    { id: 'women', label: '女鞋' },
    { id: 'men', label: '男鞋' },
    { id: 'kids', label: '童鞋' },
] as const;

const SIZE_GENDER_LABEL: Record<string, string> = {
    women: '女鞋',
    men: '男鞋',
    kids: '童鞋',
    unisex: '中性',
};

const SIZE_LINE_LABEL: Record<string, string> = {
    fashion_casual: '时装休闲',
    sport_casual: '运动休闲',
};

function getMeta(value: DimensionValue): Record<string, unknown> {
    return (value.metadata ?? {}) as Record<string, unknown>;
}

function getStringArray(value: DimensionValue, key: string): string[] {
    const raw = getMeta(value)[key];
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function getSizeGender(value: DimensionValue): string {
    const gender = getMeta(value).gender;
    return typeof gender === 'string' ? gender : 'women';
}

function getSizeOptions(value: DimensionValue): string[] {
    const allSizeRange = getStringArray(value, 'allSizeRange');
    return allSizeRange.length > 0 ? allSizeRange : getStringArray(value, 'sizeRange');
}

function getSelectedSizes(value: DimensionValue): string[] {
    return getStringArray(value, 'sizeRange');
}

function isSizeProfileEnabled(value: DimensionValue): boolean {
    return getMeta(value).enabled !== false;
}

function sortSizes(sizes: string[]) {
    return [...sizes].sort((a, b) => Number(a) - Number(b));
}

function selectedBand(value: DimensionValue, key: 'small' | 'core' | 'large') {
    const selected = new Set(getSelectedSizes(value));
    return getStringArray(value, key).filter((size) => selected.has(size));
}

function formatSizeList(sizes: string[]) {
    return sizes.length > 0 ? sizes.join(' / ') : '—';
}

function filterStructuredOptions(config: StructuredListConfig, query: string) {
    const keyword = query.trim();
    return config.options
        .filter((item) => !config.selected.includes(item))
        .filter((item) => !keyword || item.includes(keyword));
}

function createCustomDimensionId(values: DimensionValue[]) {
    let index = values.length + 1;
    let id = `custom_${index}`;
    const ids = new Set(values.map((value) => value.id));

    while (ids.has(id)) {
        index += 1;
        id = `custom_${index}`;
    }

    return id;
}

function getDimensionCountSummary(dimension: DimensionDefinition): { label: string; title: string } {
    if (dimension.type === 'category') {
        const level1 = dimension.values.filter((value) => getCategoryLevel(value) === 1).length;
        const level2 = dimension.values.filter((value) => getCategoryLevel(value) === 2).length;
        const level3 = dimension.values.filter((value) => getCategoryLevel(value) === 3).length;
        return { label: `${level1}/${level2}/${level3}`, title: '一级/二级/三级品类数量' };
    }

    return { label: String(dimension.values.length), title: '维度值数量' };
}

export default function DimensionsPanel() {
    const { dimensions, overrideMap, saveDimensionOverride, resetDimensionOverride } = useMerchConfig();
    const dimList = Array.from(dimensions.values());
    const [activeId, setActiveId] = useState<string>(dimList[0]?.dimensionId ?? '');
    const active = dimensions.get(activeId);

    return (
        <div className="space-y-4">
            {/* 横向 Tab 栏 */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3 overflow-x-auto">
                {dimList.map((d) => {
                    const countSummary = getDimensionCountSummary(d);
                    return (
                        <button
                            key={d.dimensionId}
                            onClick={() => setActiveId(d.dimensionId)}
                            className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                activeId === d.dimensionId
                                    ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-600'
                            }`}
                        >
                            {d.label}
                            {overrideMap.dimensions.has(d.dimensionId) && (
                                <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-700 border border-amber-200">
                                    已覆盖
                                </span>
                            )}
                            <span className="ml-1 text-[10px] opacity-60" title={countSummary.title}>{countSummary.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* 维度值编辑器 — key 强制切 Tab 时重新挂载，避免 useState 初始值粘连 */}
            {active ? (
                active.type === 'size' ? (
                    <SizeDimensionEditor
                        key={`${active.dimensionId}:${JSON.stringify(active.values)}`}
                        dim={active}
                        isOverride={overrideMap.dimensions.has(active.dimensionId)}
                        onApply={saveDimensionOverride}
                        onReset={resetDimensionOverride}
                    />
                ) : active.type === 'category' ? (
                    <CategoryDimensionEditor
                        key={`${active.dimensionId}:${JSON.stringify(active.values)}`}
                        dim={active}
                        isOverride={overrideMap.dimensions.has(active.dimensionId)}
                        onApply={saveDimensionOverride}
                        onReset={resetDimensionOverride}
                    />
                ) : (
                    <DimensionValueEditor
                        key={`${active.dimensionId}:${JSON.stringify(active.values)}`}
                        dim={active}
                        isOverride={overrideMap.dimensions.has(active.dimensionId)}
                        onApply={saveDimensionOverride}
                        onReset={resetDimensionOverride}
                    />
                )
            ) : (
                <div className="text-sm text-slate-400">请选择上方维度类型</div>
            )}
        </div>
    );
}

function SizeDimensionEditor({
    dim,
    isOverride,
    onApply,
    onReset,
}: {
    dim: DimensionDefinition;
    isOverride: boolean;
    onApply: (dimension: DimensionDefinition) => void;
    onReset: (dimensionId: string) => void;
}) {
    const [draftValues, setDraftValues] = useState<DimensionValue[]>(dim.values);
    const [activeGender, setActiveGender] = useState<string>(() => {
        const firstGender = dim.values.map(getSizeGender).find((gender) => gender === 'women' || gender === 'men' || gender === 'kids');
        return firstGender ?? 'women';
    });

    const isDirty = useMemo(() => JSON.stringify(draftValues) !== JSON.stringify(dim.values), [dim.values, draftValues]);
    const activeProfiles = draftValues.filter((value) => getSizeGender(value) === activeGender);
    const enabledCount = draftValues.filter(isSizeProfileEnabled).length;

    function updateProfile(valueId: string, nextMetadata: (metadata: Record<string, unknown>) => Record<string, unknown>) {
        setDraftValues((prev) =>
            prev.map((value) => {
                if (value.id !== valueId) return value;
                return { ...value, metadata: nextMetadata(getMeta(value)) };
            })
        );
    }

    function toggleProfileEnabled(value: DimensionValue) {
        updateProfile(value.id, (metadata) => ({ ...metadata, enabled: !isSizeProfileEnabled(value) }));
    }

    function updateSelectedSizes(value: DimensionValue, nextSizes: string[]) {
        updateProfile(value.id, (metadata) => ({ ...metadata, sizeRange: sortSizes(nextSizes) }));
    }

    function toggleSize(value: DimensionValue, size: string) {
        const selected = getSelectedSizes(value);
        const next = selected.includes(size)
            ? selected.filter((item) => item !== size)
            : [...selected, size];
        updateSelectedSizes(value, next);
    }

    function applyDimensionOverride() {
        onApply({ ...dim, values: draftValues });
    }

    function resetDimensionOverride() {
        onReset(dim.dimensionId);
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-800">{dim.label}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {draftValues.length} 组 · 已启用 {enabledCount} 组 · 适用范围: {dim.scope?.join(', ') ?? '全局'}
                        {isOverride && <span className="ml-2 text-amber-600">当前品牌已有覆盖</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isOverride && (
                        <button
                            onClick={resetDimensionOverride}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                        >
                            恢复行业默认
                        </button>
                    )}
                    <button
                        onClick={applyDimensionOverride}
                        disabled={!isDirty}
                        className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        应用到当前品牌
                    </button>
                </div>
            </div>

            <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                尺码口径按“性别组 + 鞋线 + 码段”管理；女鞋、男鞋复用鞋类指标口径中的成人鞋标准，童鞋作为品牌扩展组，启用后再维护独立童鞋尺码池。
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
                {SIZE_GENDER_TABS.map((tab) => {
                    const total = draftValues.filter((value) => getSizeGender(value) === tab.id).length;
                    const enabled = draftValues.filter((value) => getSizeGender(value) === tab.id && isSizeProfileEnabled(value)).length;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveGender(tab.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                activeGender === tab.id
                                    ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-600'
                            }`}
                        >
                            {tab.label}
                            <span className="ml-1 text-[10px] opacity-70">{enabled}/{total}</span>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-3">
                {activeProfiles.map((profile) => {
                    const metadata = getMeta(profile);
                    const enabled = isSizeProfileEnabled(profile);
                    const options = getSizeOptions(profile);
                    const selected = getSelectedSizes(profile);
                    const note = typeof metadata.note === 'string' ? metadata.note : '';
                    const lineType = typeof metadata.lineType === 'string' ? metadata.lineType : '';
                    const profileId = typeof metadata.profileId === 'string' ? metadata.profileId : '';

                    return (
                        <div
                            key={profile.id}
                            className={`rounded-xl border p-3 transition-colors ${
                                enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-75'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm font-semibold text-slate-800">{profile.label}</h4>
                                        {profileId && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                                {profileId}
                                            </span>
                                        )}
                                        {lineType && (
                                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-600">
                                                {SIZE_LINE_LABEL[lineType] ?? lineType}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        {SIZE_GENDER_LABEL[getSizeGender(profile)] ?? getSizeGender(profile)}
                                        {options.length > 0 ? ` · 尺码池 ${formatSizeList(selected)}` : ''}
                                    </p>
                                </div>
                                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={enabled}
                                        onChange={() => toggleProfileEnabled(profile)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-sky-500"
                                    />
                                    启用
                                </label>
                            </div>

                            {options.length > 0 ? (
                                <>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {options.map((size) => {
                                            const checked = selected.includes(size);
                                            return (
                                                <button
                                                    key={size}
                                                    onClick={() => toggleSize(profile, size)}
                                                    disabled={!enabled}
                                                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed ${
                                                        checked
                                                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                                    }`}
                                                >
                                                    {checked ? '✓ ' : '+ '}
                                                    {size}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => updateSelectedSizes(profile, options)}
                                            disabled={!enabled}
                                            className="text-[11px] text-sky-600 hover:text-sky-700 disabled:text-slate-300"
                                        >
                                            全选
                                        </button>
                                        <button
                                            onClick={() => updateSelectedSizes(profile, [])}
                                            disabled={!enabled}
                                            className="text-[11px] text-slate-400 hover:text-rose-500 disabled:text-slate-300"
                                        >
                                            清空
                                        </button>
                                    </div>

                                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                        <div className="text-[11px] font-semibold text-slate-700">码段标准</div>
                                        <div className="mt-1 text-[11px] leading-5 text-slate-600">
                                            小码：{formatSizeList(selectedBand(profile, 'small'))}<br />
                                            核心码：{formatSizeList(selectedBand(profile, 'core'))}<br />
                                            大码：{formatSizeList(selectedBand(profile, 'large'))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-xs leading-relaxed text-slate-500">
                                    {note || '该尺码组暂未配置行业标准，可在品牌侧接入独立尺码池后启用。'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                标准配比组和动态修正规则不在这里维护，继续由“鞋类指标口径与企划标准”统一管理，并在 OTB、首铺深度和补货建议中引用。
            </div>
        </div>
    );
}

const CATEGORY_LEVEL_LABEL: Record<number, string> = {
    1: '一级品类',
    2: '二级品类',
    3: '三级品类',
};

function getCategoryLevel(value: DimensionValue): number {
    const level = getMeta(value).level;
    if (typeof level === 'number') return level;
    if (!value.parentId) return 1;
    return 3;
}

function getCategoryChildren(values: DimensionValue[], parentId: string): DimensionValue[] {
    return values.filter((value) => value.parentId === parentId);
}

function getCategoryDescendantIds(values: DimensionValue[], id: string): Set<string> {
    const ids = new Set([id]);
    let changed = true;

    while (changed) {
        changed = false;
        values.forEach((value) => {
            if (value.parentId && ids.has(value.parentId) && !ids.has(value.id)) {
                ids.add(value.id);
                changed = true;
            }
        });
    }

    return ids;
}

function CategoryDimensionEditor({
    dim,
    isOverride,
    onApply,
    onReset,
}: {
    dim: DimensionDefinition;
    isOverride: boolean;
    onApply: (dimension: DimensionDefinition) => void;
    onReset: (dimensionId: string) => void;
}) {
    const [draftValues, setDraftValues] = useState<DimensionValue[]>(dim.values);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftLabel, setDraftLabel] = useState('');
    const [adding, setAdding] = useState<{ parentId?: string; level: 1 | 2 | 3 } | null>(null);
    const [newLabel, setNewLabel] = useState('');

    const isDirty = useMemo(() => JSON.stringify(draftValues) !== JSON.stringify(dim.values), [dim.values, draftValues]);
    const topCategories = draftValues.filter((value) => getCategoryLevel(value) === 1 && !value.parentId);
    const level1Count = draftValues.filter((value) => getCategoryLevel(value) === 1).length;
    const level2Count = draftValues.filter((value) => getCategoryLevel(value) === 2).length;
    const level3Count = draftValues.filter((value) => getCategoryLevel(value) === 3).length;

    function startEdit(value: DimensionValue) {
        setEditingId(value.id);
        setDraftLabel(value.label);
    }

    function cancelEdit() {
        setEditingId(null);
        setDraftLabel('');
    }

    function saveEdit(id: string) {
        const label = draftLabel.trim();
        if (!label) return;

        setDraftValues((prev) => prev.map((value) => value.id === id ? { ...value, label } : value));
        cancelEdit();
    }

    function removeCategory(id: string) {
        const ids = getCategoryDescendantIds(draftValues, id);
        setDraftValues((prev) => prev.filter((value) => !ids.has(value.id)));
        if (editingId && ids.has(editingId)) cancelEdit();
    }

    function startAdd(parentId: string | undefined, level: 1 | 2 | 3) {
        setAdding({ parentId, level });
        setNewLabel('');
    }

    function cancelAdd() {
        setAdding(null);
        setNewLabel('');
    }

    function addCategory() {
        const label = newLabel.trim();
        if (!label || !adding) return;

        setDraftValues((prev) => {
            const nextValue: DimensionValue = {
                id: createCustomDimensionId(prev),
                label,
                metadata: {
                    level: adding.level,
                    categoryLevel: CATEGORY_LEVEL_LABEL[adding.level],
                },
            };

            if (adding.parentId) nextValue.parentId = adding.parentId;
            return [...prev, nextValue];
        });
        cancelAdd();
    }

    function resetDimensionOverride() {
        onReset(dim.dimensionId);
        cancelEdit();
        cancelAdd();
    }

    function renderEditableLabel(value: DimensionValue, className: string) {
        if (editingId === value.id) {
            return (
                <span className="inline-flex min-w-0 items-center gap-2">
                    <input
                        autoFocus
                        value={draftLabel}
                        onChange={(event) => setDraftLabel(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') saveEdit(value.id);
                            if (event.key === 'Escape') cancelEdit();
                        }}
                        className="min-w-0 rounded-lg border border-sky-300 px-2 py-1 text-xs outline-none ring-2 ring-sky-100"
                    />
                    <button onClick={() => saveEdit(value.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">
                        保存
                    </button>
                    <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">
                        取消
                    </button>
                </span>
            );
        }

        return <span className={className}>{value.label}</span>;
    }

    function renderAddControl(parentId: string | undefined, level: 1 | 2 | 3, label: string) {
        const active = adding?.level === level && adding.parentId === parentId;

        if (active) {
            return (
                <span className="inline-flex items-center gap-2">
                    <input
                        autoFocus
                        value={newLabel}
                        onChange={(event) => setNewLabel(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') addCategory();
                            if (event.key === 'Escape') cancelAdd();
                        }}
                        placeholder={label}
                        className="rounded-lg border border-sky-300 px-2.5 py-1.5 text-xs outline-none ring-2 ring-sky-100"
                    />
                    <button onClick={addCategory} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">
                        添加
                    </button>
                    <button onClick={cancelAdd} className="text-xs text-slate-400 hover:text-slate-600">
                        取消
                    </button>
                </span>
            );
        }

        return (
            <button
                onClick={() => startAdd(parentId, level)}
                className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-sky-300 hover:text-sky-600"
            >
                + {label}
            </button>
        );
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-800">{dim.label}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        {level1Count} 个一级 · {level2Count} 个二级 · {level3Count} 个三级 · 适用范围: {dim.scope?.join(', ') ?? '全局'}
                        {isOverride && <span className="ml-2 text-amber-600">当前品牌已有覆盖</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isOverride && (
                        <button
                            onClick={resetDimensionOverride}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                        >
                            恢复行业默认
                        </button>
                    )}
                    <button
                        onClick={() => onApply({ ...dim, values: draftValues })}
                        disabled={!isDirty}
                        className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        应用到当前品牌
                    </button>
                </div>
            </div>

            <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                一级用于业务大盘汇总，二级用于品类经营看板，三级用于 SKU 主数据归类；品牌没有经营的品类可删除，新增品类会保存为品牌覆盖配置。
            </div>

            <div className="space-y-4">
                {topCategories.map((top) => {
                    const secondaries = getCategoryChildren(draftValues, top.id);
                    const tertiaryCount = secondaries.reduce((sum, secondary) => sum + getCategoryChildren(draftValues, secondary.id).length, 0);

                    return (
                        <section key={top.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {renderEditableLabel(top, 'text-base font-bold text-slate-800')}
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                            二级 {secondaries.length} · 三级 {tertiaryCount}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => startEdit(top)} className="text-xs text-slate-400 hover:text-sky-600">编辑</button>
                                    <button onClick={() => removeCategory(top.id)} className="text-xs text-slate-400 hover:text-rose-500">删除</button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {secondaries.map((secondary) => {
                                    const tertiaries = getCategoryChildren(draftValues, secondary.id);

                                    return (
                                        <div key={secondary.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    {renderEditableLabel(secondary, 'text-sm font-semibold text-slate-700')}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400">{tertiaries.length} 个三级</span>
                                                    <button onClick={() => startEdit(secondary)} className="text-xs text-slate-400 hover:text-sky-600">编辑</button>
                                                    <button onClick={() => removeCategory(secondary.id)} className="text-xs text-slate-400 hover:text-rose-500">删除</button>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {tertiaries.map((tertiary) => (
                                                    <span
                                                        key={tertiary.id}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                                                    >
                                                        {renderEditableLabel(tertiary, 'font-medium')}
                                                        {editingId !== tertiary.id && (
                                                            <>
                                                                <button onClick={() => startEdit(tertiary)} className="text-slate-400 hover:text-sky-600" title="编辑三级品类">
                                                                    ✎
                                                                </button>
                                                                <button onClick={() => removeCategory(tertiary.id)} className="text-slate-400 hover:text-rose-500" title="删除三级品类">
                                                                    ×
                                                                </button>
                                                            </>
                                                        )}
                                                    </span>
                                                ))}
                                                {tertiaries.length === 0 && <span className="text-xs text-slate-400">暂无三级品类</span>}
                                                {renderAddControl(secondary.id, 3, '新增三级')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-3">
                                {renderAddControl(top.id, 2, '新增二级品类')}
                            </div>
                        </section>
                    );
                })}
            </div>

            <div className="mt-3">
                {renderAddControl(undefined, 1, '新增一级品类')}
            </div>
        </div>
    );
}

function DimensionValueEditor({
    dim,
    isOverride,
    onApply,
    onReset,
}: {
    dim: DimensionDefinition;
    isOverride: boolean;
    onApply: (dimension: DimensionDefinition) => void;
    onReset: (dimensionId: string) => void;
}) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftLabel, setDraftLabel] = useState('');
    const [adding, setAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [draftValues, setDraftValues] = useState<DimensionValue[]>(dim.values);
    const [expandedId, setExpandedId] = useState<string | null>(dim.type === 'region' ? dim.values[0]?.id ?? null : null);
    const [cityPickerId, setCityPickerId] = useState<string | null>(null);
    const [citySearch, setCitySearch] = useState('');

    const isDirty = useMemo(() => JSON.stringify(draftValues) !== JSON.stringify(dim.values), [dim.values, draftValues]);
    const supportsGenericAdd = dim.type !== 'region';
    const supportsRowDuplicateDelete = supportsGenericAdd;

    function startEdit(v: DimensionValue) {
        setEditingId(v.id);
        setDraftLabel(v.label);
    }
    function cancelEdit() {
        setEditingId(null);
        setDraftLabel('');
    }
    function saveEdit(id: string) {
        setDraftValues((prev) =>
            prev.map((v) => v.id === id ? { ...v, label: draftLabel } : v)
        );
        setEditingId(null);
    }
    function addDimensionValue() {
        const label = newLabel.trim();
        if (!label) return;

        setDraftValues((prev) => [
            ...prev,
            {
                id: createCustomDimensionId(prev),
                label,
            },
        ]);
        setNewLabel('');
        setAdding(false);
    }
    function removeDimensionValue(id: string) {
        setDraftValues((prev) => prev.filter((value) => value.id !== id));
        if (editingId === id) cancelEdit();
        if (expandedId === id) setExpandedId(null);
    }
    function duplicateDimensionValue(value: DimensionValue) {
        setDraftValues((prev) => [
            ...prev,
            {
                ...value,
                id: createCustomDimensionId(prev),
                label: `${value.label} 副本`,
            },
        ]);
    }
    function updateStructuredList(
        valueId: string,
        config: StructuredListConfig,
        nextSelected: string[],
        nextOptions: string[] = config.options,
    ) {
        const selectedSet = new Set(nextSelected);
        setDraftValues((prev) =>
            prev.map((v) => {
                if (v.id !== valueId) {
                    if (config.kind !== 'city_tier') return v;

                    const metadata = getMeta(v);
                    const mappedCities = getArrayFromMetadata(v, 'mappedCities');
                    if (mappedCities.length === 0) return v;

                    const filteredCities = mappedCities.filter((city) => !selectedSet.has(city));
                    if (filteredCities.length === mappedCities.length) return v;

                    return {
                        ...v,
                        metadata: {
                            ...metadata,
                            mappedCities: filteredCities,
                        },
                    };
                }
                return {
                    ...v,
                    metadata: {
                        ...(v.metadata ?? {}),
                        [config.key]: nextSelected,
                        [config.allKey]: nextOptions,
                    },
                };
            })
        );
    }
    function toggleStructuredItem(value: DimensionValue, config: StructuredListConfig, item: string) {
        const nextSelected = config.selected.includes(item)
            ? config.selected.filter((selectedItem) => selectedItem !== item)
            : [...config.selected, item];

        updateStructuredList(value.id, config, nextSelected);
    }
    function addStructuredItem(value: DimensionValue, config: StructuredListConfig, item: string) {
        if (config.selected.includes(item)) return;
        updateStructuredList(value.id, config, [...config.selected, item]);
    }
    function addCustomCity(value: DimensionValue, config: StructuredListConfig) {
        const city = citySearch.trim();
        if (!city || config.selected.includes(city)) return;

        const nextOptions = config.options.includes(city) ? config.options : [...config.options, city];
        updateStructuredList(value.id, config, [...config.selected, city], nextOptions);
        setCitySearch('');
    }
    function removeStructuredItem(value: DimensionValue, config: StructuredListConfig, item: string) {
        updateStructuredList(value.id, config, config.selected.filter((selectedItem) => selectedItem !== item));
    }
    function selectAllStructuredItems(value: DimensionValue, config: StructuredListConfig) {
        updateStructuredList(value.id, config, config.options);
    }
    function clearAllStructuredItems(value: DimensionValue, config: StructuredListConfig) {
        updateStructuredList(value.id, config, []);
    }
    function applyDimensionOverride() {
        onApply({ ...dim, values: draftValues });
    }
    function resetDimensionOverride() {
        onReset(dim.dimensionId);
        setEditingId(null);
        setCityPickerId(null);
        setCitySearch('');
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800">{dim.label}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {draftValues.length} 项 · 适用范围: {dim.scope?.join(', ') ?? '全局'}
                        {isOverride && <span className="ml-2 text-amber-600">当前品牌已有覆盖</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isOverride && (
                        <button
                            onClick={resetDimensionOverride}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                        >
                            恢复行业默认
                        </button>
                    )}
                    <button
                        onClick={applyDimensionOverride}
                        disabled={!isDirty}
                        className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        应用到当前品牌
                    </button>
                </div>
            </div>

            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">名称</th>
                        <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">属性标签</th>
                        <th className="text-right px-4 py-2.5 text-slate-500 font-medium text-xs w-28">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {draftValues.map((v: DimensionValue) => {
                        const structuredList = getStructuredListConfig(dim.type, v);
                        const canExpandStructuredList = Boolean(structuredList);
                        const expanded = expandedId === v.id;

                        return (
                            <Fragment key={v.id}>
                                <tr className="border-t border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {canExpandStructuredList && (
                                                <button
                                                    onClick={() => setExpandedId(expanded ? null : v.id)}
                                                    className="flex h-5 w-5 items-center justify-center rounded text-[10px] text-slate-400 hover:bg-slate-100 hover:text-sky-600"
                                                    title={expanded ? '收起' : '展开'}
                                                >
                                                    {expanded ? '▼' : '▶'}
                                                </button>
                                            )}
                                            {editingId === v.id ? (
                                                <input
                                                    autoFocus
                                                    value={draftLabel}
                                                    onChange={(e) => setDraftLabel(e.target.value)}
                                                    className="rounded-lg border border-sky-300 px-2 py-1 text-sm outline-none ring-2 ring-sky-100 w-full"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEdit(v.id);
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-slate-800 font-medium">{v.label}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {metaToChips(v.metadata as Record<string, unknown> | undefined).map((chip) => (
                                                <span
                                                    key={chip}
                                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                                                >
                                                    {chip}
                                                </span>
                                            ))}
                                            {!v.metadata && <span className="text-xs text-slate-300">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {editingId === v.id ? (
                                            <span className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => saveEdit(v.id)}
                                                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                                                >
                                                    ✓ 保存
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="text-xs text-slate-400 hover:text-slate-600"
                                                >
                                                    ↶ 取消
                                                </button>
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => startEdit(v)}
                                                    className="text-slate-400 hover:text-sky-600 transition-colors"
                                                    title="编辑"
                                                >
                                                    ✏️
                                                </button>
                                                {supportsRowDuplicateDelete && (
                                                    <>
                                                        <button
                                                            onClick={() => removeDimensionValue(v.id)}
                                                            className="text-slate-400 hover:text-rose-500 transition-colors"
                                                            title="删除"
                                                        >
                                                            🗑️
                                                        </button>
                                                        <button
                                                            onClick={() => duplicateDimensionValue(v)}
                                                            className="text-slate-400 hover:text-amber-600 transition-colors"
                                                            title="复制"
                                                        >
                                                            📋
                                                        </button>
                                                    </>
                                                )}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                                {structuredList && expanded && (
                                    <tr className="border-t border-slate-100 bg-slate-50/60">
                                        <td colSpan={3} className="px-4 py-3">
                                            <div className="ml-7 space-y-2">
                                                {structuredList.kind === 'city_tier' ? (
                                                    <>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-xs font-medium text-slate-600">
                                                                {structuredList.title}：{structuredList.selected.length}/{structuredList.options.length}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setCityPickerId(cityPickerId === v.id ? null : v.id);
                                                                    setCitySearch('');
                                                                }}
                                                                className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-medium text-sky-600 hover:bg-sky-50"
                                                            >
                                                                + 添加城市
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {structuredList.selected.length > 0 ? (
                                                                structuredList.selected.map((item) => (
                                                                    <span
                                                                        key={item}
                                                                        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700"
                                                                    >
                                                                        {item}
                                                                        <button
                                                                            onClick={() => removeStructuredItem(v, structuredList, item)}
                                                                            className="text-sky-400 hover:text-rose-500"
                                                                            title="移除城市"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-slate-400">暂无城市归入该线级</span>
                                                            )}
                                                        </div>
                                                        {cityPickerId === v.id && (
                                                            <div className="mt-2 w-full max-w-xl rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                                                <input
                                                                    autoFocus
                                                                    value={citySearch}
                                                                    onChange={(event) => setCitySearch(event.target.value)}
                                                                    placeholder="搜索候选城市"
                                                                    className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                                                                />
                                                                <div className="max-h-40 overflow-y-auto">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {filterStructuredOptions(structuredList, citySearch)
                                                                            .map((item) => (
                                                                                <button
                                                                                    key={item}
                                                                                    onClick={() => addStructuredItem(v, structuredList, item)}
                                                                                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                                                                                >
                                                                                    + {item}
                                                                                </button>
                                                                            ))}
                                                                        {filterStructuredOptions(structuredList, citySearch).length === 0 && citySearch.trim() && (
                                                                            <button
                                                                                onClick={() => addCustomCity(v, structuredList)}
                                                                                className="rounded-full border border-dashed border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                                                                            >
                                                                                + 添加“{citySearch.trim()}”
                                                                            </button>
                                                                        )}
                                                                        {filterStructuredOptions(structuredList, citySearch).length === 0 && !citySearch.trim() && (
                                                                            <span className="text-xs text-slate-400">
                                                                                当前候选城市已全部归入，可搜索城市后作为品牌自定义城市加入。
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-xs font-medium text-slate-600">
                                                                {structuredList.title}：{structuredList.selected.length}/{structuredList.options.length}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => selectAllStructuredItems(v, structuredList)}
                                                                    className="text-[11px] text-sky-600 hover:text-sky-700"
                                                                >
                                                                    全选
                                                                </button>
                                                                <button
                                                                    onClick={() => clearAllStructuredItems(v, structuredList)}
                                                                    className="text-[11px] text-slate-400 hover:text-rose-500"
                                                                >
                                                                    清空
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {structuredList.options.map((item) => {
                                                                const selected = structuredList.selected.includes(item);
                                                                return (
                                                                    <button
                                                                        key={item}
                                                                        onClick={() => toggleStructuredItem(v, structuredList, item)}
                                                                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                                                            selected
                                                                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                                                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                                                        }`}
                                                                    >
                                                                        {selected ? '✓ ' : '+ '}
                                                                        {item}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                                <p className="text-[11px] text-slate-400">
                                                    {structuredList.help}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-3 flex flex-wrap items-center gap-3">
                {supportsGenericAdd ? (
                    adding ? (
                        <span className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={newLabel}
                                onChange={(event) => setNewLabel(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') addDimensionValue();
                                    if (event.key === 'Escape') {
                                        setAdding(false);
                                        setNewLabel('');
                                    }
                                }}
                                placeholder={`新增${dim.label}值`}
                                className="rounded-lg border border-sky-300 px-2.5 py-1.5 text-xs outline-none ring-2 ring-sky-100"
                            />
                            <button
                                onClick={addDimensionValue}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
                            >
                                ✓ 添加
                            </button>
                            <button
                                onClick={() => {
                                    setAdding(false);
                                    setNewLabel('');
                                }}
                                className="text-xs text-slate-400 hover:text-slate-600"
                            >
                                取消
                            </button>
                        </span>
                    ) : (
                        <button
                            onClick={() => setAdding(true)}
                            className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-sky-300 hover:text-sky-600 transition-colors"
                        >
                            + 新增维度值
                        </button>
                    )
                ) : (
                    <span className="text-[10px] text-slate-400">
                        区域为结构化维度，不通过通用入口新增；可展开区域后调整品牌业务省份。
                    </span>
                )}
                <span className="text-[10px] text-slate-400">编辑后点击“应用到当前品牌”，变更会保存为品牌覆盖配置</span>
            </div>
        </div>
    );
}
