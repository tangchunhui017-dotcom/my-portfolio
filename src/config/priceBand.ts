export type PriceBandKey = 'PB1' | 'PB2' | 'PB3' | 'PB4' | 'PBX';

type PriceBandDefinition = {
    id: Exclude<PriceBandKey, 'PBX'>;
    label: string;
    min: number;
    maxExclusive: number;
};

export const PRICE_BANDS: PriceBandDefinition[] = [
    { id: 'PB1', label: '199-399', min: 199, maxExclusive: 399 },
    { id: 'PB2', label: '399-599', min: 399, maxExclusive: 599 },
    { id: 'PB3', label: '599-799', min: 599, maxExclusive: 800 },
    { id: 'PB4', label: '800+', min: 800, maxExclusive: Number.POSITIVE_INFINITY },
];

export const PRICE_BAND_LABELS: Record<PriceBandKey, string> = {
    PB1: '199-399',
    PB2: '399-599',
    PB3: '599-799',
    PB4: '800+',
    PBX: '未定义价格带',
};

const CANONICAL_BAND_SET = new Set<PriceBandKey>(['PB1', 'PB2', 'PB3', 'PB4', 'PBX']);

const LEGACY_TO_NEW_BAND_MAP: Record<string, Exclude<PriceBandKey, 'PBX'>> = {
    PB5: 'PB3',
    PB6: 'PB3',
    PB7: 'PB4',
};

function normalizeBandText(raw: string) {
    return String(raw || '').toUpperCase().replace(/\s/g, '');
}

function inBand(msrp: number, band: PriceBandDefinition) {
    return msrp >= band.min && msrp < band.maxExclusive;
}

export function normalizePriceBandKey(rawPriceBand?: string): PriceBandKey {
    const normalized = normalizeBandText(rawPriceBand || '');
    if (!normalized) return 'PBX';

    // 新四档口径（PB1~PB4）优先，避免被 legacy 逻辑错误重映射
    if (CANONICAL_BAND_SET.has(normalized as PriceBandKey)) {
        return normalized as PriceBandKey;
    }

    if (LEGACY_TO_NEW_BAND_MAP[normalized]) return LEGACY_TO_NEW_BAND_MAP[normalized];

    if (normalized.includes('199-399')) return 'PB1';
    if (normalized.includes('399-599')) return 'PB2';
    if (normalized.includes('599-799')) return 'PB3';
    if (normalized.includes('800+')) return 'PB4';

    if (normalized.includes('700+')) return 'PB3';
    if (normalized.includes('700-799') || normalized.includes('600-699')) return 'PB3';
    if (normalized.includes('500-599') || normalized.includes('400-499')) return 'PB2';
    if (normalized.includes('300-399') || normalized.includes('199-299')) return 'PB1';

    return 'PBX';
}

export function formatPriceBandLabel(priceBand?: string) {
    const normalized = normalizePriceBandKey(priceBand);
    return PRICE_BAND_LABELS[normalized];
}

export function getPriceBandSortRank(priceBand: string) {
    const normalized = normalizePriceBandKey(priceBand);
    if (normalized === 'PBX') return Number.MAX_SAFE_INTEGER;
    return Number(normalized.replace('PB', ''));
}

export function resolvePriceBandByMsrp(msrp: number): PriceBandKey {
    const value = Number(msrp);
    if (!Number.isFinite(value) || value <= 0) return 'PBX';

    const matched = PRICE_BANDS.find((band) => inBand(value, band));
    return matched?.id || 'PB4';
}

export function matchesPriceBandFilter(
    msrp: number,
    selectedPriceBand: string | 'all',
    skuPriceBand?: string,
) {
    if (selectedPriceBand === 'all') return true;

    const selectedKey = normalizePriceBandKey(selectedPriceBand);
    if (selectedKey === 'PBX') return true;

    const skuBandKey = normalizePriceBandKey(skuPriceBand);
    if (skuBandKey !== 'PBX') return skuBandKey === selectedKey;

    const selectedBand = PRICE_BANDS.find((band) => band.id === selectedKey);
    if (!selectedBand) return true;

    return inBand(Number(msrp), selectedBand);
}

export function normalizePlanPriceBandKey(priceBand: string) {
    return normalizePriceBandKey(priceBand);
}

export function getPriceBandOptionList() {
    return PRICE_BANDS.map((band) => ({ id: band.id, label: band.label }));
}
