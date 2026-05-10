'use client';

/**
 * src/hooks/useOtbBusinessContext.ts
 * 合并 DashboardFilters（全局）+ OTBLocalSettings（OTB专属）
 * 生成用于规则解析和计算的业务上下文对象
 */

import { useMemo } from 'react';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import type { OTBLocalSettings } from '@/components/otb/OTBContextSummary';

export interface OtbBusinessContext {
    // 来自 DashboardFilters（全局）
    brandId: string;
    channelId: string;
    year: number | 'all';
    season: string;
    wave: string;
    categoryId: string;
    categoryLevel1: string;
    categoryLevel2: string;
    priceBandId: string;
    regionId: string;
    cityTier: string;
    storeFormat: string;
    lifecycle: string;

    // 来自 OTBLocalSettings（OTB专属）
    versionId: string;
    scenarioId: string;
    approvalStatus: string;
    salesMetricType: string;
    inventoryMetricType: string;
    purchaseMetricType: string;
    currencyUnit: string;

    // 便捷派生字段
    isSpring: boolean;
    isSummer: boolean;
    isAutumn: boolean;
    isWinter: boolean;
    isSS: boolean; // 春夏
    isAW: boolean; // 秋冬
    isAllSeason: boolean;
    isAllBrand: boolean;
    isAllChannel: boolean;
}

export function useOtbBusinessContext(
    filters: DashboardFilters,
    settings: OTBLocalSettings,
): OtbBusinessContext {
    return useMemo(() => {
        const season = String(filters.season || 'all');
        const isSpring  = season === 'spring'  || season === '春';
        const isSummer  = season === 'summer'  || season === '夏';
        const isAutumn  = season === 'autumn'  || season === '秋';
        const isWinter  = season === 'winter'  || season === '冬';
        const isSS      = isSpring || isSummer;
        const isAW      = isAutumn || isWinter;
        const isAllSeason = season === 'all' || (!isSpring && !isSummer && !isAutumn && !isWinter);

        const brandId    = String(filters.brand     || 'all');
        const channelId  = String(filters.channel_type || 'all');
        const categoryId = String(filters.category_id  || 'all');

        return {
            // 全局
            brandId,
            channelId,
            year:          filters.season_year ?? 'all',
            season,
            wave:          String(filters.wave         || 'all'),
            categoryId,
            categoryLevel1: String(filters.category_l1  || 'all'),
            categoryLevel2: String(filters.sub_category || 'all'),
            priceBandId:   String(filters.price_band   || 'all'),
            regionId:      String(filters.region       || 'all'),
            cityTier:      String(filters.city_tier    || 'all'),
            storeFormat:   String(filters.store_format || 'all'),
            lifecycle:     String(filters.lifecycle    || 'all'),

            // OTB 专属
            versionId:           String(settings.version         || 'approved'),
            scenarioId:          String(settings.scenario        || 'standard'),
            approvalStatus:      String(settings.approvalStatus  || 'executing'),
            salesMetricType:     String(settings.salesCaliber    || 'net_sales'),
            inventoryMetricType: String(settings.inventoryCaliber || 'cost'),
            purchaseMetricType:  String(settings.procurementCaliber || 'arrived'),
            currencyUnit:        String(settings.currencyUnit    || 'yuan'),

            // 派生
            isSpring,
            isSummer,
            isAutumn,
            isWinter,
            isSS,
            isAW,
            isAllSeason,
            isAllBrand:    brandId   === 'all',
            isAllChannel:  channelId === 'all',
        };
    }, [filters, settings]);
}
