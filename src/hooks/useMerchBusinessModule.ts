/**
 * src/hooks/useMerchBusinessModule.ts
 * 业务侧聚合 Hook —— 一次取齐某个 Tab 的中台配置 + 闭环上下游 + Override 统计。
 *
 * 用法：
 *   const mod = useMerchBusinessModule('otb');
 *   mod.metrics  → 已按 usedBy 过滤的指标列表
 *   mod.loop     → 闭环定义（上下游、必备指标、健康检查项）
 *   mod.overrides.metrics → 该 Tab 命中品牌覆盖的指标 id 列表
 *   mod.upstreamModules / downstreamModules → 链路面板可直接消费
 */
import { useMemo } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import { MERCH_BUSINESS_MODULES, type MerchBusinessModule } from '@/config/merchBusinessLoop';
import type {
    BrandMeta,
    DimensionDefinition,
    IndustryMeta,
    MetricDefinition,
    TabConfig,
    TabKey,
    ThresholdDefinition,
} from '@/types/merchConfig';

export interface MerchBusinessModuleSnapshot {
    brand: BrandMeta;
    industry: IndustryMeta;
    tabKey: TabKey;
    tabConfig: TabConfig | undefined;
    loop: MerchBusinessModule;
    metrics: MetricDefinition[];
    dimensions: DimensionDefinition[];
    thresholds: ThresholdDefinition[];
    overrides: {
        metrics: string[];
        dimensions: string[];
        thresholds: string[];
        tab: boolean;
    };
    upstreamModules: MerchBusinessModule[];
    downstreamModules: MerchBusinessModule[];
    /** 是否使用纯行业模板（没有任何品牌覆盖落到这个 Tab 上） */
    isUsingFallback: boolean;
    /** 闭环里 requiredMetrics 在指标库里没找到的（最常见的"配置漂移"信号） */
    missingRequiredMetrics: string[];
}

export function useMerchBusinessModule(tabKey: TabKey): MerchBusinessModuleSnapshot {
    const config = useMerchConfig();

    return useMemo<MerchBusinessModuleSnapshot>(() => {
        const loop = MERCH_BUSINESS_MODULES[tabKey];

        const metrics = Array.from(config.metrics.values()).filter((m) => m.usedBy.includes(tabKey));
        const dimensions = Array.from(config.dimensions.values()).filter(
            (d) => !d.scope || d.scope.includes(tabKey)
        );
        const thresholds = Array.from(config.thresholds.values()).filter((t) => t.appliedTo.includes(tabKey));

        const overrideMetricIds = metrics
            .map((m) => m.metricId)
            .filter((id) => config.overrideMap.metrics.has(id));
        const overrideDimensionIds = dimensions
            .map((d) => d.dimensionId)
            .filter((id) => config.overrideMap.dimensions.has(id));
        const overrideThresholdIds = thresholds
            .map((t) => t.thresholdId)
            .filter((id) => config.overrideMap.thresholds.has(id));
        const tabOverridden = config.overrideMap.tabs.has(tabKey);

        const upstreamModules = loop.upstreamTabs
            .map((t) => MERCH_BUSINESS_MODULES[t])
            .filter(Boolean);
        const downstreamModules = loop.downstreamTabs
            .map((t) => MERCH_BUSINESS_MODULES[t])
            .filter(Boolean);

        const missingRequiredMetrics = loop.requiredMetrics.filter((id) => !config.metrics.has(id));

        const isUsingFallback =
            overrideMetricIds.length === 0 &&
            overrideDimensionIds.length === 0 &&
            overrideThresholdIds.length === 0 &&
            !tabOverridden;

        return {
            brand: config.brand,
            industry: config.industry,
            tabKey,
            tabConfig: config.tabs.get(tabKey),
            loop,
            metrics,
            dimensions,
            thresholds,
            overrides: {
                metrics: overrideMetricIds,
                dimensions: overrideDimensionIds,
                thresholds: overrideThresholdIds,
                tab: tabOverridden,
            },
            upstreamModules,
            downstreamModules,
            isUsingFallback,
            missingRequiredMetrics,
        };
    }, [tabKey, config]);
}
