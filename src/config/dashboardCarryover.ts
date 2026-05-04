export type DashboardProductTrack = 'seasonal' | 'evergreen';
export type DashboardCarryoverType = 'iconic' | 'seasonal' | null;
export type DashboardCarryoverStatus = 'active' | 'phasing_out' | null;
export type DashboardMonitorMode = 'sell_through' | 'stock_water_level';
export type DashboardNonMainReason = 'carryover_active' | 'carryover_protected' | 'aged_tail' | 'future_preheat' | 'unclassified' | null;
export type DashboardCarryoverEntrySource = 'manual_whitelist' | 'seeded_from_mock_lifecycle' | 'rule_inferred' | null;

export interface DashboardCarryoverSchema {
    productTrack: DashboardProductTrack;
    isCarryover: boolean;
    carryoverType: DashboardCarryoverType;
    carryoverStatus: DashboardCarryoverStatus;
    carryoverProtectionEnd: string | null;
    carryoverEntrySource: DashboardCarryoverEntrySource;
    monitorMode: DashboardMonitorMode;
    nonMainReason: DashboardNonMainReason;
}

type CarryoverLikeInput = {
    lifecycle?: string | null;
    product_track?: string | null;
    is_carryover?: boolean | string | number | null;
    carryover_type?: string | null;
    carryover_status?: string | null;
    carryover_protection_end?: string | null;
    carryover_entry_source?: string | null;
    monitor_mode?: string | null;
    non_main_reason?: string | null;
};

function normalizeText(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

function normalizeLegacyLifecycle(value: unknown) {
    const text = normalizeText(value);
    if (!text) return null;
    if (text.includes('常青') || text.includes('carry') || text.includes('core') || text.includes('iconic')) return 'carryover';
    if (text.includes('清仓') || text.includes('clearance') || text.includes('old')) return 'clearance';
    if (text.includes('新品') || text.includes('new')) return 'new';
    return null;
}

function normalizeTrack(value: unknown): DashboardProductTrack | null {
    const text = normalizeText(value);
    if (!text) return null;
    if (text === 'evergreen' || text === 'carryover' || text === 'core') return 'evergreen';
    if (text === 'seasonal') return 'seasonal';
    return null;
}

function normalizeCarryoverFlag(value: unknown) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const text = normalizeText(value);
    if (!text) return null;
    if (text === 'true' || text === '1' || text === 'yes') return true;
    if (text === 'false' || text === '0' || text === 'no') return false;
    return null;
}

function normalizeCarryoverType(value: unknown): DashboardCarryoverType {
    const text = normalizeText(value);
    if (text === 'iconic') return 'iconic';
    if (text === 'seasonal') return 'seasonal';
    return null;
}

function normalizeCarryoverStatus(value: unknown): DashboardCarryoverStatus {
    const text = normalizeText(value);
    if (text === 'active') return 'active';
    if (text === 'phasing_out' || text === 'phasing-out') return 'phasing_out';
    return null;
}

function normalizeMonitorMode(value: unknown): DashboardMonitorMode | null {
    const text = normalizeText(value);
    if (text === 'sell_through' || text === 'sell-through') return 'sell_through';
    if (text === 'stock_water_level' || text === 'stock-water-level') return 'stock_water_level';
    return null;
}

function normalizeCarryoverEntrySource(value: unknown): DashboardCarryoverEntrySource {
    const text = normalizeText(value);
    if (text === 'manual_whitelist' || text === 'manual-whitelist') return 'manual_whitelist';
    if (text === 'seeded_from_mock_lifecycle' || text === 'seeded-from-mock-lifecycle') return 'seeded_from_mock_lifecycle';
    if (text === 'rule_inferred' || text === 'rule-inferred') return 'rule_inferred';
    return null;
}

function normalizeNonMainReason(value: unknown): DashboardNonMainReason {
    const text = normalizeText(value);
    if (text === 'carryover_active') return 'carryover_active';
    if (text === 'carryover_protected') return 'carryover_protected';
    if (text === 'aged_tail') return 'aged_tail';
    if (text === 'future_preheat') return 'future_preheat';
    if (text === 'unclassified') return 'unclassified';
    return null;
}

export function inferDashboardCarryoverSchema(input: CarryoverLikeInput): DashboardCarryoverSchema {
    const lifecycleKind = normalizeLegacyLifecycle(input.lifecycle);
    const explicitTrack = normalizeTrack(input.product_track);
    const explicitIsCarryover = normalizeCarryoverFlag(input.is_carryover);
    const carryoverType = normalizeCarryoverType(input.carryover_type);
    const carryoverStatus = normalizeCarryoverStatus(input.carryover_status);
    const carryoverProtectionEnd = input.carryover_protection_end ? String(input.carryover_protection_end) : null;
    const carryoverEntrySource = normalizeCarryoverEntrySource(input.carryover_entry_source);
    const explicitMonitorMode = normalizeMonitorMode(input.monitor_mode);
    const explicitNonMainReason = normalizeNonMainReason(input.non_main_reason);

    const inferredIsCarryover = explicitTrack === 'evergreen' || lifecycleKind === 'carryover';
    const isCarryover = explicitIsCarryover ?? inferredIsCarryover;
    const productTrack: DashboardProductTrack = explicitTrack || (isCarryover ? 'evergreen' : 'seasonal');

    if (productTrack === 'evergreen' || isCarryover) {
        return {
            productTrack: 'evergreen',
            isCarryover: true,
            carryoverType: carryoverType || 'iconic',
            carryoverStatus: carryoverStatus || 'active',
            carryoverProtectionEnd,
            carryoverEntrySource: carryoverEntrySource || 'rule_inferred',
            monitorMode: explicitMonitorMode || 'stock_water_level',
            nonMainReason: explicitNonMainReason || (carryoverProtectionEnd ? 'carryover_protected' : 'carryover_active'),
        };
    }

    if (lifecycleKind === 'clearance') {
        return {
            productTrack: 'seasonal',
            isCarryover: false,
            carryoverType: null,
            carryoverStatus: null,
            carryoverProtectionEnd: null,
            carryoverEntrySource: carryoverEntrySource || null,
            monitorMode: explicitMonitorMode || 'sell_through',
            nonMainReason: explicitNonMainReason || 'aged_tail',
        };
    }

    return {
        productTrack: 'seasonal',
        isCarryover: false,
        carryoverType: null,
        carryoverStatus: null,
        carryoverProtectionEnd: null,
        carryoverEntrySource: carryoverEntrySource || null,
        monitorMode: explicitMonitorMode || 'sell_through',
        nonMainReason: explicitNonMainReason || null,
    };
}
