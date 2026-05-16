/**
 * src/utils/configLoader.ts
 * 多品牌配置加载器 — 读取 industry baseline + brand overrides → MergedMerchConfig
 */
import type {
    MergedMerchConfig,
    MetricDefinition,
    DimensionDefinition,
    ThresholdDefinition,
    TabConfig,
    TabKey,
    BrandMeta,
    IndustryMeta,
} from '@/types/merchConfig';
// TypeScript 数据文件代替直接 JSON 导入，避免 Turbopack JSON-bundling 问题
import { FOOTWEAR_INDUSTRY_DATA } from '@/data/footwearIndustryData';
import { DEFAULT_BRAND_DATA } from '@/data/defaultBrandData';

// ─── 类型转换助手 ──────────────────────────────────────────────────────────────

const industryMetrics = FOOTWEAR_INDUSTRY_DATA.metrics as unknown as MetricDefinition[];
const industryDimensions = FOOTWEAR_INDUSTRY_DATA.dimensions as unknown as DimensionDefinition[];
const industryThresholds = FOOTWEAR_INDUSTRY_DATA.thresholds as unknown as ThresholdDefinition[];
const industryMeta = FOOTWEAR_INDUSTRY_DATA.industryMeta as unknown as IndustryMeta;

const INDUSTRY_TABS: Record<TabKey, TabConfig> = {
    'overview': FOOTWEAR_INDUSTRY_DATA.tabs.overview as unknown as TabConfig,
    'annual-control': FOOTWEAR_INDUSTRY_DATA.tabs.annual_control as unknown as TabConfig,
    'region-store': FOOTWEAR_INDUSTRY_DATA.tabs.region_store as unknown as TabConfig,
    'consumer': FOOTWEAR_INDUSTRY_DATA.tabs.consumer as unknown as TabConfig,
    'category-ops': FOOTWEAR_INDUSTRY_DATA.tabs.category_ops as unknown as TabConfig,
    'wave-planning': FOOTWEAR_INDUSTRY_DATA.tabs.wave_planning as unknown as TabConfig,
    'otb': FOOTWEAR_INDUSTRY_DATA.tabs.otb as unknown as TabConfig,
    'cashflow': FOOTWEAR_INDUSTRY_DATA.tabs.cashflow as unknown as TabConfig,
    'forecast': FOOTWEAR_INDUSTRY_DATA.tabs.forecast as unknown as TabConfig,
    'pnl': FOOTWEAR_INDUSTRY_DATA.tabs.pnl as unknown as TabConfig,
    'competitor-trend': FOOTWEAR_INDUSTRY_DATA.tabs.competitor_trend as unknown as TabConfig,
    'inventory-health': FOOTWEAR_INDUSTRY_DATA.tabs.inventory_health as unknown as TabConfig,
};

// ─── 品牌注册表（静态，后续可扩展） ──────────────────────────────────────────

interface BrandEntry {
    meta: BrandMeta;
    metricOverrides: Array<Partial<MetricDefinition> & { metricId: string }>;
    dimensionOverrides: Array<Partial<DimensionDefinition> & { dimensionId: string }>;
    thresholdOverrides: Array<Partial<ThresholdDefinition> & { thresholdId: string }>;
    tabOverrides?: Partial<Record<TabKey, Partial<TabConfig>>>;
}

const BRAND_REGISTRY: Record<string, BrandEntry> = {
    default_brand: {
        meta: DEFAULT_BRAND_DATA.brandMeta as unknown as BrandMeta,
        metricOverrides: DEFAULT_BRAND_DATA.metricOverrides as unknown as Array<Partial<MetricDefinition> & { metricId: string }>,
        dimensionOverrides: DEFAULT_BRAND_DATA.dimensionOverrides as unknown as Array<Partial<DimensionDefinition> & { dimensionId: string }>,
        thresholdOverrides: DEFAULT_BRAND_DATA.thresholdOverrides as unknown as Array<Partial<ThresholdDefinition> & { thresholdId: string }>,
    },
};

// ─── 主合并函数 ────────────────────────────────────────────────────────────────

export function loadMergedConfig(brandId: string = 'default_brand'): MergedMerchConfig {
    const brand = BRAND_REGISTRY[brandId] ?? BRAND_REGISTRY['default_brand'];

    // 1. 行业基线
    const metricsMap = new Map<string, MetricDefinition>();
    industryMetrics.forEach((m) => {
        metricsMap.set(m.metricId, { ...m, source: 'industry' });
    });

    const dimensionsMap = new Map<string, DimensionDefinition>();
    industryDimensions.forEach((d) => {
        dimensionsMap.set(d.dimensionId, { ...d, source: 'industry' });
    });

    const thresholdsMap = new Map<string, ThresholdDefinition>();
    industryThresholds.forEach((t) => {
        thresholdsMap.set(t.thresholdId, { ...t, source: 'industry' });
    });

    const tabsMap = new Map<TabKey, TabConfig>();
    (Object.entries(INDUSTRY_TABS) as Array<[TabKey, TabConfig]>).forEach(([key, cfg]) => {
        tabsMap.set(key, { ...cfg, tabKey: key });
    });

    // 2. 应用品牌覆盖
    const metricOverrideIds = new Set<string>();
    brand.metricOverrides?.forEach((override) => {
        const base = metricsMap.get(override.metricId);
        if (base) {
            metricsMap.set(override.metricId, { ...base, ...override, source: 'brand' });
            metricOverrideIds.add(override.metricId);
        }
    });

    const dimensionOverrideIds = new Set<string>();
    brand.dimensionOverrides?.forEach((override) => {
        const base = dimensionsMap.get(override.dimensionId);
        if (base) {
            dimensionsMap.set(override.dimensionId, { ...base, ...override, source: 'brand' });
            dimensionOverrideIds.add(override.dimensionId);
        }
    });

    const thresholdOverrideIds = new Set<string>();
    brand.thresholdOverrides?.forEach((override) => {
        const base = thresholdsMap.get(override.thresholdId);
        if (base) {
            thresholdsMap.set(override.thresholdId, { ...base, ...override, source: 'brand' });
            thresholdOverrideIds.add(override.thresholdId);
        }
    });

    // Tab 覆盖：按 section.id 做 deep merge，避免整个 sections 数组被替换后丢失行业默认 section。
    const tabOverrideIds = new Set<TabKey>();
    if (brand.tabOverrides) {
        (Object.entries(brand.tabOverrides) as Array<[TabKey, Partial<TabConfig> | undefined]>).forEach(
            ([tabKey, override]) => {
                if (!override) return;
                const base = tabsMap.get(tabKey);
                if (!base) return;

                // sections: 用 industry 的为骨架，按 id 合并 brand 覆盖项
                let mergedSections = base.sections;
                if (override.sections && override.sections.length > 0) {
                    const overrideMap = new Map(override.sections.map((s) => [s.id, s]));
                    mergedSections = base.sections.map((s) => {
                        const ov = overrideMap.get(s.id);
                        return ov ? { ...s, ...ov } : s;
                    });
                    // brand 新增的、industry 没有的 section
                    override.sections.forEach((s) => {
                        if (!base.sections.find((b) => b.id === s.id)) {
                            mergedSections.push(s);
                        }
                    });
                }

                const mergedCustomSettings = {
                    ...(base.customSettings ?? {}),
                    ...(override.customSettings ?? {}),
                };

                tabsMap.set(tabKey, {
                    ...base,
                    sections: mergedSections,
                    customSettings: mergedCustomSettings,
                });
                tabOverrideIds.add(tabKey);
            }
        );
    }

    return {
        brand: brand.meta,
        industry: industryMeta,
        metrics: metricsMap,
        dimensions: dimensionsMap,
        thresholds: thresholdsMap,
        tabs: tabsMap,
        overrideMap: {
            metrics: metricOverrideIds,
            dimensions: dimensionOverrideIds,
            thresholds: thresholdOverrideIds,
            tabs: tabOverrideIds,
        },
    };
}

export function listAvailableBrands(): BrandMeta[] {
    return Object.values(BRAND_REGISTRY).map((b) => b.meta);
}
