import type { WaveOTBInput } from '@/utils/otbCalculations';
import {
    buildPlanningWaveKey,
    normalizePlanningSeasonCode,
    normalizePlanningWaveCode,
} from '@/config/merchPlanningDataArchitecture';
import wavePlanMasterRaw from '../../data/planning/wave_plan_master.json';

type RawWavePlanRecord = WaveOTBInput & {
    mainCategoryList?: string[];
    planSalesAmount?: number;
    lySalesAmount?: number;
    momSalesAmount?: number;
    targetColorCount?: number;
    targetSkuCount?: number;
    arrivalRateTarget?: number;
    orderDeadline?: string;
    warehouseDeadline?: string;
};

export interface WavePlanMasterRecord extends RawWavePlanRecord {
    fiscalYear: number;
    seasonCode: string;
    waveCode: string;
    waveKey: string;
    theme: string;
    launch_date: string;
    sku_plan: number;
    sku_actual: number;
    new_ratio: number;
    old_ratio: number;
    units_plan: number;
    revenue_plan: number;
    category_mix: Record<string, number>;
    planningSource: 'data/planning/wave_plan_master.json';
}

export interface WavePlanningCompatibleRecord {
    id: string;
    season: string;
    wave: string;
    launch_date: string;
    theme: string;
    temp_zone?: string;
    sku_plan: number;
    sku_actual: number;
    new_ratio: number;
    old_ratio: number;
    units_plan?: number;
    revenue_plan?: number;
    category_mix: Record<string, number>;
}

function toNumber(value: unknown, fallback = 0): number {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
}

function resolveFiscalYear(record: Pick<RawWavePlanRecord, 'launchDate'>): number {
    const year = Number(record.launchDate?.slice(0, 4));
    return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
}

function splitCategories(rawCategory: string | undefined): string[] {
    const categories = String(rawCategory || '')
        .split(/[\/,，、|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    return categories.length > 0 ? categories : ['全品类'];
}

function resolveWavePlanCategories(record: RawWavePlanRecord): string[] {
    if (Array.isArray(record.mainCategoryList) && record.mainCategoryList.length > 0) {
        return record.mainCategoryList
            .map((category) => String(category || '').trim())
            .filter(Boolean);
    }
    return splitCategories(record.mainCategory);
}

export function deriveCategoryMixFromWavePlan(record: RawWavePlanRecord): Record<string, number> {
    const categories = resolveWavePlanCategories(record);
    const plannedStyles = toNumber(record.plannedStyleCount, toNumber(record.targetSkuCount, 0));
    if (categories.length === 1) return { [categories[0]]: plannedStyles };

    const base = Math.floor(plannedStyles / categories.length);
    const remainder = plannedStyles - base * categories.length;
    return categories.reduce<Record<string, number>>((acc, category, index) => {
        acc[category] = base + (index < remainder ? 1 : 0);
        return acc;
    }, {});
}

export function toWavePlanMasterRecord(record: RawWavePlanRecord): WavePlanMasterRecord {
    const fiscalYear = resolveFiscalYear(record);
    const seasonCode = normalizePlanningSeasonCode(record.season);
    const waveCode = normalizePlanningWaveCode(record.wave);
    const targetSkuCount = toNumber(record.targetSkuCount, toNumber(record.plannedStyleCount, 0));
    const averageDepth = toNumber(record.averageDepth, 0);
    const unitsPlan = targetSkuCount > 0 && averageDepth > 0
        ? targetSkuCount * averageDepth
        : toNumber(record.plannedStyleCount, 0) * Math.max(averageDepth, 1);

    return {
        ...record,
        fiscalYear,
        seasonCode,
        waveCode,
        waveKey: buildPlanningWaveKey(fiscalYear, seasonCode, waveCode),
        theme: record.promotion,
        launch_date: record.launchDate,
        sku_plan: targetSkuCount,
        sku_actual: 0,
        new_ratio: toNumber(record.newProductRatio, 0),
        old_ratio: toNumber(record.repeatOrderRatio, 0) + toNumber(record.carryoverRatio, 0),
        units_plan: unitsPlan,
        revenue_plan: toNumber(record.planSalesAmount, 0),
        category_mix: deriveCategoryMixFromWavePlan(record),
        planningSource: 'data/planning/wave_plan_master.json',
    };
}

export const WAVE_PLAN_MASTER: WavePlanMasterRecord[] = (wavePlanMasterRaw as RawWavePlanRecord[])
    .map(toWavePlanMasterRecord)
    .sort((a, b) => a.launchMonth - b.launchMonth || a.launchDate.localeCompare(b.launchDate));

export function getWaveOtbInputs(): WaveOTBInput[] {
    return WAVE_PLAN_MASTER.map((record) => ({ ...record }));
}

export function getWavePlanningRecordsFromMaster(
    fiscalYear?: number | string | 'all',
): WavePlanningCompatibleRecord[] {
    return WAVE_PLAN_MASTER
        .filter((record) => {
            if (!fiscalYear || fiscalYear === 'all') return true;
            return String(record.fiscalYear) === String(fiscalYear);
        })
        .map((record) => ({
            id: record.waveKey,
            season: `${record.fiscalYear}-${record.seasonCode}`,
            wave: record.wave,
            launch_date: record.launchDate,
            theme: record.theme,
            temp_zone: '全国',
            sku_plan: record.sku_plan,
            sku_actual: record.sku_actual,
            new_ratio: record.new_ratio,
            old_ratio: record.old_ratio,
            units_plan: record.units_plan,
            revenue_plan: record.revenue_plan,
            category_mix: record.category_mix,
        }));
}

export function findWavePlanByBusinessKey(
    season: string,
    wave: string,
): WavePlanMasterRecord | undefined {
    const seasonCode = normalizePlanningSeasonCode(season);
    const waveCode = normalizePlanningWaveCode(wave);
    return WAVE_PLAN_MASTER.find((record) =>
        record.seasonCode === seasonCode && record.waveCode === waveCode
    );
}
