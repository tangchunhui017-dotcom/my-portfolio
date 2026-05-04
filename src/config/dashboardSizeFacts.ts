import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimSizeRaw from '@/../data/taxonomy/dim_size.json';
import sizeRuleMatrixRaw from '@/../data/taxonomy/size_rule_matrix.json';
import sizeCurvesRaw from '@/../data/taxonomy/size_curves.json';

export interface DashboardSizeFactSalesRecord {
    record_id?: string;
    sku_id: string;
    channel_id: string;
    season_year?: string | number;
    season?: string;
    wave?: string;
    week_num: number;
    unit_sold: number;
    net_sales_amt?: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

export interface DashboardSizeFactSkuMeta {
    sku_id: string;
    sku_name?: string;
    category_name?: string;
    category_l2?: string;
    product_line?: string;
    season_year?: string | number;
    season?: string;
    lifecycle?: string;
    gender?: string;
}

interface DimChannelRecord {
    channel_id: string;
    channel_type?: string;
    region?: string;
}

interface DimSizeRecord {
    size_code: string;
    size_order: number;
    size_label: string;
    active: boolean;
}

interface DimSizeData {
    sizes: DimSizeRecord[];
}

type SizeGenderKey = 'women' | 'men';
type SizeLineTypeKey = 'fashion_casual' | 'sport_casual';
type SizeRegionClusterKey = 'north' | 'south' | 'default';
type SizeChannelBiasKey = 'online' | 'offline';
type SizeCategoryBiasKey = 'upsize' | 'fit_strict' | 'none';
type SizeBandKey = 'small' | 'core' | 'large';

interface SizeBandDefinition {
    size_range: string[];
    small: string[];
    core: string[];
    large: string[];
}

interface SizeRuleProfile {
    profile_id: string;
    gender: SizeGenderKey;
    line_type: SizeLineTypeKey;
    band_definition: string;
    curve_default: string;
    curve_north: string;
    curve_south: string;
}

interface SizeRuleMatrixData {
    band_definitions: Record<string, SizeBandDefinition>;
    base_profiles: SizeRuleProfile[];
    dynamic_adjustments: {
        region_clusters: Record<'north' | 'south', string[]>;
        category_bias: Record<'upsize' | 'fit_strict', string[]>;
        channel_bias: Record<SizeChannelBiasKey, { edge_size_factor: number; note: string }>;
    };
}

interface SizeCurvesData {
    curves: Record<string, Record<string, number>>;
}

export interface VirtualDashboardSizeFactRecord {
    virtual_record_id: string;
    source_record_id: string;
    sku_id: string;
    channel_id: string;
    season_year: string | number | undefined;
    season: string | undefined;
    wave: string | undefined;
    week_num: number;
    category_label: string;
    size_code: string;
    size_order: number;
    size_label: string;
    size_band: SizeBandKey;
    is_core_size: boolean;
    estimated_demand_units: number;
    sales_units: number;
    on_hand_units: number;
    fill_rate: number;
    gap_rate: number;
    curve_share: number;
    size_profile_id: string;
    size_curve_id: string;
    gender_bucket: SizeGenderKey;
    line_type: SizeLineTypeKey;
    region_cluster: SizeRegionClusterKey;
    channel_bias: SizeChannelBiasKey;
}

const dimChannel = dimChannelRaw as DimChannelRecord[];
const dimSize = dimSizeRaw as DimSizeData;
const sizeRuleMatrix = sizeRuleMatrixRaw as SizeRuleMatrixData;
const sizeCurves = sizeCurvesRaw as SizeCurvesData;

const channelMap = new Map<string, DimChannelRecord>(dimChannel.map((item) => [item.channel_id, item]));
const sizeMetaMap = new Map<string, DimSizeRecord>(dimSize.sizes.map((item) => [item.size_code, item]));
const sizeProfileMap = new Map<string, SizeRuleProfile>(
    sizeRuleMatrix.base_profiles.map((profile) => [`${profile.gender}__${profile.line_type}`, profile] as const),
);

const WOMEN_HINTS = ['women', 'woman', 'female', 'lady', 'ladies', 'girl', '女'];
const MEN_HINTS = ['men', 'man', 'male', 'boy', '男'];
const UNISEX_HINTS = ['unisex', 'neutral', '中性'];
const SPORT_LINE_HINTS = ['sport', 'sports', 'running', 'runner', 'trail', 'hiking', 'outdoor', 'training', 'basket', 'soccer', 'tennis', '运动', '跑', '越野', '徒步', '登山', '户外', '机能'];
const UPSIZE_HINTS = ['boots', 'boot', 'dad', 'running', 'outdoor', '靴', '老爹', '跑', '户外', '越野', '徒步', '登山'];
const FIT_STRICT_HINTS = ['heels', 'heel', 'pump', 'pumps', 'ballet', 'mary_jane', 'maryjane', '高跟', '浅口', '芭蕾', '玛丽珍', '单鞋'];
const ONLINE_CHANNEL_HINTS = ['online', 'ecom', 'e-commerce', 'ec', '电商', '线上'];
const NORTH_REGION_HINTS = ['north_china', 'northeast_china', 'northwest_china', 'north', 'northeast', 'northwest', '华北', '东北', '西北'];
const SOUTH_REGION_HINTS = ['south_china', 'southwest_china', 'east_china', 'south', 'southwest', 'east', '华南', '西南', '华东'];

function safeDiv(numerator: number, denominator: number) {
    return denominator <= 0 ? 0 : numerator / denominator;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function normalizeToken(value?: string | null) {
    return String(value || '').trim().toLowerCase();
}

function includesAnyToken(text: string, tokens: string[]) {
    if (!text) return false;
    return tokens.some((token) => token && text.includes(token));
}

function resolveCategoryLabel(sku: DashboardSizeFactSkuMeta) {
    return sku.category_l2 || sku.category_name || sku.product_line || sku.sku_name || '未分类';
}

function resolveSizeLineType(sku: DashboardSizeFactSkuMeta): SizeLineTypeKey {
    const text = normalizeToken([sku.product_line, sku.category_l2, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
    if (includesAnyToken(text, SPORT_LINE_HINTS)) return 'sport_casual';
    return 'fashion_casual';
}

function resolveSizeGender(sku: DashboardSizeFactSkuMeta, lineType: SizeLineTypeKey): SizeGenderKey {
    const genderRaw = normalizeToken(sku.gender);
    if (includesAnyToken(genderRaw, WOMEN_HINTS)) return 'women';
    if (includesAnyToken(genderRaw, MEN_HINTS)) return 'men';
    if (includesAnyToken(genderRaw, UNISEX_HINTS)) return lineType === 'sport_casual' ? 'men' : 'women';

    const text = normalizeToken([sku.category_l2, sku.product_line, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
    if (includesAnyToken(text, FIT_STRICT_HINTS)) return 'women';
    if (includesAnyToken(text, UPSIZE_HINTS)) return lineType === 'sport_casual' ? 'men' : 'women';
    return lineType === 'fashion_casual' ? 'women' : 'men';
}

function normalizeRegionCluster(regionRaw?: string | null): SizeRegionClusterKey {
    const region = normalizeToken(regionRaw);
    if (!region) return 'default';

    const northClusters = (sizeRuleMatrix.dynamic_adjustments?.region_clusters?.north || []).map((item) => normalizeToken(item));
    const southClusters = (sizeRuleMatrix.dynamic_adjustments?.region_clusters?.south || []).map((item) => normalizeToken(item));
    if (includesAnyToken(region, northClusters) || includesAnyToken(region, NORTH_REGION_HINTS)) return 'north';
    if (includesAnyToken(region, southClusters) || includesAnyToken(region, SOUTH_REGION_HINTS)) return 'south';
    return 'default';
}

function normalizeChannelBias(channelTypeRaw?: string | null): SizeChannelBiasKey {
    const channelType = normalizeToken(channelTypeRaw);
    if (includesAnyToken(channelType, ONLINE_CHANNEL_HINTS)) return 'online';
    return 'offline';
}

function resolveSizeCategoryBias(sku: DashboardSizeFactSkuMeta): SizeCategoryBiasKey {
    const text = normalizeToken([sku.category_l2, sku.product_line, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
    const upsizeCodes = (sizeRuleMatrix.dynamic_adjustments?.category_bias?.upsize || []).map((item) => normalizeToken(item));
    const fitStrictCodes = (sizeRuleMatrix.dynamic_adjustments?.category_bias?.fit_strict || []).map((item) => normalizeToken(item));
    if (includesAnyToken(text, upsizeCodes) || includesAnyToken(text, UPSIZE_HINTS)) return 'upsize';
    if (includesAnyToken(text, fitStrictCodes) || includesAnyToken(text, FIT_STRICT_HINTS)) return 'fit_strict';
    return 'none';
}

function resolveSizeProfile(gender: SizeGenderKey, lineType: SizeLineTypeKey): SizeRuleProfile | null {
    return (
        sizeProfileMap.get(`${gender}__${lineType}`) ||
        sizeProfileMap.get(`women__${lineType}`) ||
        sizeProfileMap.get(`men__${lineType}`) ||
        sizeRuleMatrix.base_profiles?.[0] ||
        null
    );
}

function resolveCurveId(profile: SizeRuleProfile, regionCluster: SizeRegionClusterKey) {
    const preferred = regionCluster === 'north'
        ? profile.curve_north
        : regionCluster === 'south'
            ? profile.curve_south
            : profile.curve_default;
    return sizeCurves.curves[preferred] ? preferred : profile.curve_default;
}

function getBandKey(band: SizeBandDefinition | undefined, sizeCode: string): SizeBandKey {
    if (band?.small?.includes(sizeCode)) return 'small';
    if (band?.large?.includes(sizeCode)) return 'large';
    return 'core';
}

function normalizeWeights(sizeCodes: string[], seed: Record<string, number>) {
    const values = sizeCodes.map((sizeCode) => ({ sizeCode, weight: Math.max(0.0001, seed[sizeCode] ?? 0.0001) }));
    const total = values.reduce((sum, item) => sum + item.weight, 0) || 1;
    const result: Record<string, number> = {};
    values.forEach((item) => {
        result[item.sizeCode] = item.weight / total;
    });
    return result;
}

function allocateInteger(total: number, sizeCodes: string[], weights: Record<string, number>) {
    const safeTotal = Math.max(0, Math.round(total));
    const normalized = normalizeWeights(sizeCodes, weights);
    const allocations: Record<string, number> = {};
    const fractions: Array<{ sizeCode: string; fraction: number }> = [];
    let allocated = 0;

    sizeCodes.forEach((sizeCode) => {
        const exact = safeTotal * normalized[sizeCode];
        const base = Math.floor(exact);
        allocations[sizeCode] = base;
        allocated += base;
        fractions.push({ sizeCode, fraction: exact - base });
    });

    fractions.sort((a, b) => b.fraction - a.fraction || Number(a.sizeCode) - Number(b.sizeCode));
    let remainder = safeTotal - allocated;
    let cursor = 0;
    while (remainder > 0 && fractions.length) {
        const target = fractions[cursor % fractions.length];
        allocations[target.sizeCode] += 1;
        remainder -= 1;
        cursor += 1;
    }

    return allocations;
}

function buildSalesWeights(
    sizeCodes: string[],
    curve: Record<string, number>,
    band: SizeBandDefinition | undefined,
    categoryBias: SizeCategoryBiasKey,
    demandHeat: number,
) {
    const weights: Record<string, number> = {};
    sizeCodes.forEach((sizeCode) => {
        const bandKey = getBandKey(band, sizeCode);
        let weight = Math.max(0.2, Number(curve[sizeCode]) || 0.2);
        if (bandKey === 'core') weight *= 1 + Math.max(0, demandHeat) * 0.35;
        if (bandKey !== 'core') weight *= 1 - Math.max(0, demandHeat) * 0.08;
        if (categoryBias === 'upsize' && bandKey === 'large') weight *= 1.12;
        if (categoryBias === 'fit_strict' && bandKey === 'small') weight *= 1.1;
        weights[sizeCode] = weight;
    });
    return normalizeWeights(sizeCodes, weights);
}

function buildStockWeights(
    sizeCodes: string[],
    curve: Record<string, number>,
    band: SizeBandDefinition | undefined,
    channelBias: SizeChannelBiasKey,
    categoryBias: SizeCategoryBiasKey,
    demandHeat: number,
    inventoryPressure: number,
) {
    const shortageStress = clamp(Math.max(0, demandHeat) * 0.9 + Math.max(0, 0.45 - inventoryPressure) * 1.25, 0, 0.45);
    const overstockStress = clamp(Math.max(0, inventoryPressure - 0.58) * 1.4 + Math.max(0, 0.54 - demandHeat - 0.54) * 0.5, 0, 0.4);
    const edgeFactor = channelBias === 'online'
        ? Number(sizeRuleMatrix.dynamic_adjustments?.channel_bias?.online?.edge_size_factor || 1.15)
        : Number(sizeRuleMatrix.dynamic_adjustments?.channel_bias?.offline?.edge_size_factor || 0.8);

    const weights: Record<string, number> = {};
    sizeCodes.forEach((sizeCode) => {
        const bandKey = getBandKey(band, sizeCode);
        let weight = Math.max(0.2, Number(curve[sizeCode]) || 0.2);
        if (bandKey !== 'core') weight *= edgeFactor;
        if (shortageStress > 0) {
            if (bandKey === 'core') weight *= 1 - shortageStress * 0.5;
            else weight *= 1 + shortageStress * 0.25;
        }
        if (overstockStress > 0) {
            if (bandKey === 'core') weight *= 1 + overstockStress * 0.1;
            else weight *= 1 + overstockStress * 0.3;
        }
        if (categoryBias === 'upsize' && bandKey === 'large') weight *= 1.12;
        if (categoryBias === 'fit_strict' && bandKey === 'small') weight *= 1.08;
        weights[sizeCode] = weight;
    });
    return normalizeWeights(sizeCodes, weights);
}

export function deriveVirtualDashboardSizeFacts(
    records: DashboardSizeFactSalesRecord[],
    skuMap: Record<string, DashboardSizeFactSkuMeta | undefined>,
): VirtualDashboardSizeFactRecord[] {
    return records.flatMap((record, index) => {
        const sku = skuMap[record.sku_id];
        const channel = channelMap.get(record.channel_id);
        if (!sku || !channel) return [];

        const lineType = resolveSizeLineType(sku);
        const genderBucket = resolveSizeGender(sku, lineType);
        const profile = resolveSizeProfile(genderBucket, lineType);
        if (!profile) return [];

        const regionCluster = normalizeRegionCluster(channel.region);
        const channelBias = normalizeChannelBias(channel.channel_type);
        const categoryBias = resolveSizeCategoryBias(sku);
        const curveId = resolveCurveId(profile, regionCluster);
        const curve = sizeCurves.curves[curveId] || {};
        const band = sizeRuleMatrix.band_definitions[profile.band_definition];
        const sizeCodes = band?.size_range?.length
            ? band.size_range
            : Object.keys(curve).sort((a, b) => Number(a) - Number(b));
        if (!sizeCodes.length) return [];

        const units = Math.max(0, Number(record.unit_sold || 0));
        const onHandUnits = Math.max(0, Number(record.on_hand_unit || 0));
        const demandHeat = clamp(Number(record.cumulative_sell_through || 0) - 0.68, -0.2, 0.32);
        const inventoryPressure = safeDiv(onHandUnits, Math.max(onHandUnits + units, 1));
        const estimatedDemandUnits = Math.max(
            units,
            Math.round(safeDiv(units, Math.max(Number(record.cumulative_sell_through || 0), 0.18))),
        );

        const salesWeights = buildSalesWeights(sizeCodes, curve, band, categoryBias, demandHeat);
        const demandWeights = salesWeights;
        const stockWeights = buildStockWeights(sizeCodes, curve, band, channelBias, categoryBias, demandHeat, inventoryPressure);

        const allocatedSales = allocateInteger(units, sizeCodes, salesWeights);
        const allocatedDemand = allocateInteger(estimatedDemandUnits, sizeCodes, demandWeights);
        const allocatedStock = allocateInteger(onHandUnits, sizeCodes, stockWeights);
        const categoryLabel = resolveCategoryLabel(sku);

        return sizeCodes.map((sizeCode) => {
            const bandKey = getBandKey(band, sizeCode);
            const sizeMeta = sizeMetaMap.get(sizeCode) || {
                size_code: sizeCode,
                size_order: Number(sizeCode) || 0,
                size_label: `EU${sizeCode}`,
                active: true,
            };
            const demandUnits = Math.max(1, allocatedDemand[sizeCode] || 0);
            const salesUnits = allocatedSales[sizeCode] || 0;
            const stockUnits = allocatedStock[sizeCode] || 0;
            const inStockSupport = stockUnits * (bandKey === 'core' ? 0.15 : 0.1);
            const fillRate = clamp((salesUnits + inStockSupport) / demandUnits, 0.28, 0.98);
            const gapRate = clamp(
                Math.max(0.02, 1 - fillRate) + (bandKey === 'core' ? 0.05 : 0) + Math.max(0, 0.42 - inventoryPressure) * 0.08,
                0.02,
                0.65,
            );
            return {
                virtual_record_id: `VSF_${record.record_id || index}_${record.sku_id}_${record.channel_id}_${record.week_num}_${sizeCode}`,
                source_record_id: record.record_id || `ROW_${index}`,
                sku_id: record.sku_id,
                channel_id: record.channel_id,
                season_year: record.season_year,
                season: record.season,
                wave: record.wave,
                week_num: Number(record.week_num || 0),
                category_label: categoryLabel,
                size_code: sizeCode,
                size_order: sizeMeta.size_order,
                size_label: sizeMeta.size_label,
                size_band: bandKey,
                is_core_size: bandKey === 'core',
                estimated_demand_units: demandUnits,
                sales_units: salesUnits,
                on_hand_units: stockUnits,
                fill_rate: fillRate,
                gap_rate: gapRate,
                curve_share: salesWeights[sizeCode] || 0,
                size_profile_id: profile.profile_id,
                size_curve_id: curveId,
                gender_bucket: genderBucket,
                line_type: lineType,
                region_cluster: regionCluster,
                channel_bias: channelBias,
            } satisfies VirtualDashboardSizeFactRecord;
        });
    });
}