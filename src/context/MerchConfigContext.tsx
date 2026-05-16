'use client';
/**
 * src/context/MerchConfigContext.tsx
 * 商品企划多品牌配置化 Context — 品牌切换 + 配置读取
 */
import {
    createContext,
    useContext,
    useMemo,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import type {
    MergedMerchConfig,
    MetricDefinition,
    DimensionDefinition,
    ThresholdDefinition,
    TabConfig,
    TabKey,
} from '@/types/merchConfig';
import { loadMergedConfig, listAvailableBrands } from '@/utils/configLoader';
import type { BrandMeta } from '@/types/merchConfig';

// ─── Context 类型 ─────────────────────────────────────────────────────────────

interface MerchConfigContextValue extends MergedMerchConfig {
    currentBrandId: string;
    switchBrand: (brandId: string) => void;
    availableBrands: BrandMeta[];
    saveMetricOverride: (metric: MetricDefinition) => void;
    resetMetricOverride: (metricId: string) => void;
    saveDimensionOverride: (dimension: DimensionDefinition) => void;
    resetDimensionOverride: (dimensionId: string) => void;
    saveThresholdOverride: (threshold: ThresholdDefinition) => void;
    resetThresholdOverride: (thresholdId: string) => void;
    saveTabOverride: (tabKey: TabKey, override: Partial<TabConfig>) => void;
    resetTabOverride: (tabKey: TabKey) => void;
}

const MerchConfigContext = createContext<MerchConfigContextValue | null>(null);

const BRAND_LS_KEY = 'merch_config_brand_id';
const METRIC_OVERRIDES_LS_KEY = 'merch_config_metric_overrides';
const DIMENSION_OVERRIDES_LS_KEY = 'merch_config_dimension_overrides';
const THRESHOLD_OVERRIDES_LS_KEY = 'merch_config_threshold_overrides';
const TAB_OVERRIDES_LS_KEY = 'merch_config_tab_overrides';

type StoredMetricOverride = Partial<MetricDefinition> & { metricId: string };
type StoredMetricOverrides = Record<string, Record<string, StoredMetricOverride>>;
type StoredDimensionOverride = Partial<DimensionDefinition> & { dimensionId: string };
type StoredDimensionOverrides = Record<string, Record<string, StoredDimensionOverride>>;
type StoredThresholdOverride = Partial<ThresholdDefinition> & { thresholdId: string };
type StoredThresholdOverrides = Record<string, Record<string, StoredThresholdOverride>>;
type StoredTabOverride = Partial<TabConfig>;
type StoredTabOverrides = Record<string, Partial<Record<TabKey, StoredTabOverride>>>;

function loadMetricOverrides(): StoredMetricOverrides {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(METRIC_OVERRIDES_LS_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as StoredMetricOverrides;
    } catch {
        return {};
    }
}

function loadDimensionOverrides(): StoredDimensionOverrides {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(DIMENSION_OVERRIDES_LS_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as StoredDimensionOverrides;
    } catch {
        return {};
    }
}

function loadThresholdOverrides(): StoredThresholdOverrides {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(THRESHOLD_OVERRIDES_LS_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as StoredThresholdOverrides;
    } catch {
        return {};
    }
}

function loadTabOverrides(): StoredTabOverrides {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(TAB_OVERRIDES_LS_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as StoredTabOverrides;
    } catch {
        return {};
    }
}

function persistMetricOverrides(overrides: StoredMetricOverrides) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(METRIC_OVERRIDES_LS_KEY, JSON.stringify(overrides));
    } catch {
        // ignore localStorage quota / privacy mode errors
    }
}

function persistDimensionOverrides(overrides: StoredDimensionOverrides) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(DIMENSION_OVERRIDES_LS_KEY, JSON.stringify(overrides));
    } catch {
        // ignore localStorage quota / privacy mode errors
    }
}

function persistThresholdOverrides(overrides: StoredThresholdOverrides) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(THRESHOLD_OVERRIDES_LS_KEY, JSON.stringify(overrides));
    } catch {
        // ignore localStorage quota / privacy mode errors
    }
}

function persistTabOverrides(overrides: StoredTabOverrides) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(TAB_OVERRIDES_LS_KEY, JSON.stringify(overrides));
    } catch {
        // ignore localStorage quota / privacy mode errors
    }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MerchConfigProvider({
    children,
    defaultBrand = 'default_brand',
}: {
    children: ReactNode;
    defaultBrand?: string;
}) {
    const [brandId, setBrandId] = useState<string>(() => {
        if (typeof window === 'undefined') return defaultBrand;
        return localStorage.getItem(BRAND_LS_KEY) ?? defaultBrand;
    });
    const [metricOverrides, setMetricOverrides] = useState<StoredMetricOverrides>(() => loadMetricOverrides());
    const [dimensionOverrides, setDimensionOverrides] = useState<StoredDimensionOverrides>(() => loadDimensionOverrides());
    const [thresholdOverrides, setThresholdOverrides] = useState<StoredThresholdOverrides>(() => loadThresholdOverrides());
    const [tabOverrides, setTabOverrides] = useState<StoredTabOverrides>(() => loadTabOverrides());

    const merged = useMemo(() => {
        const base = loadMergedConfig(brandId);
        const brandMetricOverrides = metricOverrides[brandId] ?? {};
        const brandDimensionOverrides = dimensionOverrides[brandId] ?? {};
        const brandThresholdOverrides = thresholdOverrides[brandId] ?? {};
        const brandTabOverrides = tabOverrides[brandId] ?? {};
        if (
            Object.keys(brandMetricOverrides).length === 0 &&
            Object.keys(brandDimensionOverrides).length === 0 &&
            Object.keys(brandThresholdOverrides).length === 0 &&
            Object.keys(brandTabOverrides).length === 0
        ) return base;

        const nextMetrics = new Map(base.metrics);
        const nextMetricOverrideIds = new Set(base.overrideMap.metrics);

        Object.values(brandMetricOverrides).forEach((override) => {
            const current = nextMetrics.get(override.metricId);
            if (!current) return;
            nextMetrics.set(override.metricId, { ...current, ...override, source: 'brand' });
            nextMetricOverrideIds.add(override.metricId);
        });

        const nextDimensions = new Map(base.dimensions);
        const nextDimensionOverrideIds = new Set(base.overrideMap.dimensions);

        Object.values(brandDimensionOverrides).forEach((override) => {
            const current = nextDimensions.get(override.dimensionId);
            if (!current) return;
            nextDimensions.set(override.dimensionId, { ...current, ...override, source: 'brand' });
            nextDimensionOverrideIds.add(override.dimensionId);
        });

        const nextThresholds = new Map(base.thresholds);
        const nextThresholdOverrideIds = new Set(base.overrideMap.thresholds);

        Object.values(brandThresholdOverrides).forEach((override) => {
            const current = nextThresholds.get(override.thresholdId);
            if (!current) return;
            nextThresholds.set(override.thresholdId, { ...current, ...override, source: 'brand' });
            nextThresholdOverrideIds.add(override.thresholdId);
        });

        const nextTabs = new Map(base.tabs);
        const nextTabOverrideIds = new Set(base.overrideMap.tabs);

        (Object.entries(brandTabOverrides) as Array<[TabKey, StoredTabOverride | undefined]>).forEach(
            ([tabKey, override]) => {
                if (!override) return;
                const current = nextTabs.get(tabKey);
                if (!current) return;

                let mergedSections = current.sections;
                if (override.sections && override.sections.length > 0) {
                    const overrideSectionMap = new Map(override.sections.map((s) => [s.id, s]));
                    mergedSections = current.sections.map((s) => {
                        const ov = overrideSectionMap.get(s.id);
                        return ov ? { ...s, ...ov } : s;
                    });
                    override.sections.forEach((s) => {
                        if (!current.sections.find((c) => c.id === s.id)) {
                            mergedSections.push(s);
                        }
                    });
                }

                nextTabs.set(tabKey, {
                    ...current,
                    sections: mergedSections,
                    customSettings: { ...(current.customSettings ?? {}), ...(override.customSettings ?? {}) },
                });
                nextTabOverrideIds.add(tabKey);
            }
        );

        return {
            ...base,
            metrics: nextMetrics,
            dimensions: nextDimensions,
            thresholds: nextThresholds,
            tabs: nextTabs,
            overrideMap: {
                metrics: nextMetricOverrideIds,
                dimensions: nextDimensionOverrideIds,
                thresholds: nextThresholdOverrideIds,
                tabs: nextTabOverrideIds,
            },
        };
    }, [brandId, metricOverrides, dimensionOverrides, thresholdOverrides, tabOverrides]);

    const switchBrand = useCallback((next: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(BRAND_LS_KEY, next);
        }
        setBrandId(next);
    }, []);

    const availableBrands = useMemo(() => listAvailableBrands(), []);

    const saveMetricOverride = useCallback((metric: MetricDefinition) => {
        setMetricOverrides((prev) => {
            const next: StoredMetricOverrides = {
                ...prev,
                [brandId]: {
                    ...(prev[brandId] ?? {}),
                    [metric.metricId]: {
                        metricId: metric.metricId,
                        label: metric.label,
                        description: metric.description,
                        unit: metric.unit,
                        formula: metric.formula,
                        variables: metric.variables,
                        defaultMetricType: metric.defaultMetricType,
                        usedBy: metric.usedBy,
                        category: metric.category,
                    },
                },
            };
            persistMetricOverrides(next);
            return next;
        });
    }, [brandId]);

    const resetMetricOverride = useCallback((metricId: string) => {
        setMetricOverrides((prev) => {
            const brandOverrides = prev[brandId];
            if (!brandOverrides?.[metricId]) return prev;

            const nextBrandOverrides = { ...brandOverrides };
            delete nextBrandOverrides[metricId];
            const next: StoredMetricOverrides = { ...prev };

            if (Object.keys(nextBrandOverrides).length === 0) {
                delete next[brandId];
            } else {
                next[brandId] = nextBrandOverrides;
            }

            persistMetricOverrides(next);
            return next;
        });
    }, [brandId]);

    const saveDimensionOverride = useCallback((dimension: DimensionDefinition) => {
        setDimensionOverrides((prev) => {
            const next: StoredDimensionOverrides = {
                ...prev,
                [brandId]: {
                    ...(prev[brandId] ?? {}),
                    [dimension.dimensionId]: {
                        dimensionId: dimension.dimensionId,
                        label: dimension.label,
                        type: dimension.type,
                        values: dimension.values,
                        scope: dimension.scope,
                    },
                },
            };
            persistDimensionOverrides(next);
            return next;
        });
    }, [brandId]);

    const resetDimensionOverride = useCallback((dimensionId: string) => {
        setDimensionOverrides((prev) => {
            const brandOverrides = prev[brandId];
            if (!brandOverrides?.[dimensionId]) return prev;

            const nextBrandOverrides = { ...brandOverrides };
            delete nextBrandOverrides[dimensionId];
            const next: StoredDimensionOverrides = { ...prev };

            if (Object.keys(nextBrandOverrides).length === 0) {
                delete next[brandId];
            } else {
                next[brandId] = nextBrandOverrides;
            }

            persistDimensionOverrides(next);
            return next;
        });
    }, [brandId]);

    const saveThresholdOverride = useCallback((threshold: ThresholdDefinition) => {
        setThresholdOverrides((prev) => {
            const next: StoredThresholdOverrides = {
                ...prev,
                [brandId]: {
                    ...(prev[brandId] ?? {}),
                    [threshold.thresholdId]: {
                        thresholdId: threshold.thresholdId,
                        label: threshold.label,
                        unit: threshold.unit,
                        defaultValue: threshold.defaultValue,
                        warningValue: threshold.warningValue,
                        criticalValue: threshold.criticalValue,
                        comparator: threshold.comparator,
                        appliedTo: threshold.appliedTo,
                    },
                },
            };
            persistThresholdOverrides(next);
            return next;
        });
    }, [brandId]);

    const resetThresholdOverride = useCallback((thresholdId: string) => {
        setThresholdOverrides((prev) => {
            const brandOverrides = prev[brandId];
            if (!brandOverrides?.[thresholdId]) return prev;

            const nextBrandOverrides = { ...brandOverrides };
            delete nextBrandOverrides[thresholdId];
            const next: StoredThresholdOverrides = { ...prev };

            if (Object.keys(nextBrandOverrides).length === 0) {
                delete next[brandId];
            } else {
                next[brandId] = nextBrandOverrides;
            }

            persistThresholdOverrides(next);
            return next;
        });
    }, [brandId]);

    const saveTabOverride = useCallback((tabKey: TabKey, override: Partial<TabConfig>) => {
        setTabOverrides((prev) => {
            const next: StoredTabOverrides = {
                ...prev,
                [brandId]: {
                    ...(prev[brandId] ?? {}),
                    [tabKey]: override,
                },
            };
            persistTabOverrides(next);
            return next;
        });
    }, [brandId]);

    const resetTabOverride = useCallback((tabKey: TabKey) => {
        setTabOverrides((prev) => {
            const brandOverrides = prev[brandId];
            if (!brandOverrides?.[tabKey]) return prev;

            const nextBrandOverrides = { ...brandOverrides };
            delete nextBrandOverrides[tabKey];
            const next: StoredTabOverrides = { ...prev };

            if (Object.keys(nextBrandOverrides).length === 0) {
                delete next[brandId];
            } else {
                next[brandId] = nextBrandOverrides;
            }

            persistTabOverrides(next);
            return next;
        });
    }, [brandId]);

    const value: MerchConfigContextValue = {
        ...merged,
        currentBrandId: brandId,
        switchBrand,
        availableBrands,
        saveMetricOverride,
        resetMetricOverride,
        saveDimensionOverride,
        resetDimensionOverride,
        saveThresholdOverride,
        resetThresholdOverride,
        saveTabOverride,
        resetTabOverride,
    };

    return (
        <MerchConfigContext.Provider value={value}>
            {children}
        </MerchConfigContext.Provider>
    );
}

// ─── 主 Hook ──────────────────────────────────────────────────────────────────

export function useMerchConfig(): MerchConfigContextValue {
    const ctx = useContext(MerchConfigContext);
    if (!ctx) {
        throw new Error('useMerchConfig must be used within <MerchConfigProvider>');
    }
    return ctx;
}

// ─── 便捷 Hooks ───────────────────────────────────────────────────────────────

export function useMetric(id: string): MetricDefinition | undefined {
    return useMerchConfig().metrics.get(id);
}

export function useDimension(id: string): DimensionDefinition | undefined {
    return useMerchConfig().dimensions.get(id);
}

export function useThreshold(id: string): ThresholdDefinition | undefined {
    return useMerchConfig().thresholds.get(id);
}

export function useTabConfig(tab: TabKey): TabConfig | undefined {
    return useMerchConfig().tabs.get(tab);
}

/**
 * 返回一个函数，可以根据 metricId + 变量值计算公式结果
 * 公式引擎错误时静默返回 null
 */
export function useEvalMetric(): (metricId: string, vars: Record<string, number>) => number | null {
    const { metrics } = useMerchConfig();
    return useCallback(
        (metricId: string, vars: Record<string, number>) => {
            const def = metrics.get(metricId);
            if (!def?.formula) return null;
            // 动态导入避免在 SSR 初始化阶段执行
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { evaluateFormula } = require('@/utils/formulaEngine') as typeof import('@/utils/formulaEngine');
                return evaluateFormula(def.formula, vars);
            } catch {
                return null;
            }
        },
        [metrics]
    );
}
