const fs = require('fs');
const path = require('path');

const skuPath = path.join(__dirname, '../data/dashboard/dim_sku.json');
const factSalesPath = path.join(__dirname, '../data/dashboard/fact_sales.json');
const carryoverRegistryPath = path.join(__dirname, '../data/dashboard/carryover_registry.json');
const skus = JSON.parse(fs.readFileSync(skuPath, 'utf8'));

const SALE_YEAR = 2024;

const CHANNEL_MIX_BASE = {
  C01: 0.15,
  C02: 0.10,
  C03: 0.05,
  C04: 0.15,
  C05: 0.10,
  C06: 0.10,
  C07: 0.15,
  C08: 0.10,
  C09: 0.05,
  C10: 0.05,
};

const PRICE_BAND_CONFIG = {
  PB1: { baseUnits: 2100, marginRate: 0.40, stTarget: 0.82 },
  PB2: { baseUnits: 1600, marginRate: 0.44, stTarget: 0.80 },
  PB3: { baseUnits: 1200, marginRate: 0.47, stTarget: 0.78 },
  PB4: { baseUnits: 800, marginRate: 0.50, stTarget: 0.75 },
  PB5: { baseUnits: 500, marginRate: 0.53, stTarget: 0.70 },
  PB6: { baseUnits: 280, marginRate: 0.56, stTarget: 0.65 },
};

const LIFECYCLE_MODIFIER = {
  evergreen: { unitsMult: 1.3, stMult: 1.05, marginMult: 1.02 },
  new: { unitsMult: 1.0, stMult: 1.00, marginMult: 1.00 },
  clearance: { unitsMult: 0.7, stMult: 0.85, marginMult: 0.80 },
};

const SEASON_MONTH_PROFILES = {
  Q1: [
    { month: 1, weight: 0.27 },
    { month: 2, weight: 0.24 },
    { month: 3, weight: 0.20 },
    { month: 4, weight: 0.17 },
    { month: 5, weight: 0.12 },
  ],
  Q2: [
    { month: 3, weight: 0.07 },
    { month: 4, weight: 0.22 },
    { month: 5, weight: 0.23 },
    { month: 6, weight: 0.19 },
    { month: 7, weight: 0.13 },
    { month: 8, weight: 0.10 },
    { month: 9, weight: 0.06 },
  ],
  Q3: [
    { month: 6, weight: 0.06 },
    { month: 7, weight: 0.17 },
    { month: 8, weight: 0.19 },
    { month: 9, weight: 0.21 },
    { month: 10, weight: 0.18 },
    { month: 11, weight: 0.12 },
    { month: 12, weight: 0.07 },
  ],
  Q4: [
    { month: 10, weight: 0.09 },
    { month: 11, weight: 0.13 },
    { month: 12, weight: 0.15 },
    { month: 1, weight: 0.21 },
    { month: 2, weight: 0.22 },
    { month: 3, weight: 0.20 },
  ],
};

function hashNumber(input) {
  let hash = 0;
  const text = String(input || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seededRange(seed, min, max) {
  const normalized = (hashNumber(seed) % 10000) / 10000;
  return min + (max - min) * normalized;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = normalizeText(value);
  if (!text) return null;
  if (text === 'true' || text === '1' || text === 'yes') return true;
  if (text === 'false' || text === '0' || text === 'no') return false;
  return null;
}

function normalizeLegacyLifecycle(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.includes('常青') || text.includes('carry') || text.includes('core') || text.includes('iconic')) return 'carryover';
  if (text.includes('清仓') || text.includes('clearance') || text.includes('old')) return 'clearance';
  if (text.includes('新品') || text.includes('new')) return 'new';
  return null;
}

function normalizeProductTrack(value) {
  const text = normalizeText(value);
  if (text === 'evergreen' || text === 'carryover' || text === 'core') return 'evergreen';
  if (text === 'seasonal') return 'seasonal';
  return null;
}

function normalizeCarryoverType(value) {
  const text = normalizeText(value);
  if (text === 'iconic') return 'iconic';
  if (text === 'seasonal') return 'seasonal';
  return null;
}

function normalizeCarryoverStatus(value) {
  const text = normalizeText(value);
  if (text === 'active') return 'active';
  if (text === 'phasing_out' || text === 'phasing-out') return 'phasing_out';
  return null;
}

function normalizeCarryoverEntrySource(value) {
  const text = normalizeText(value);
  if (text === 'manual_whitelist' || text === 'manual-whitelist') return 'manual_whitelist';
  if (text === 'seeded_from_mock_lifecycle' || text === 'seeded-from-mock-lifecycle') return 'seeded_from_mock_lifecycle';
  if (text === 'rule_inferred' || text === 'rule-inferred') return 'rule_inferred';
  return null;
}

function normalizeMonitorMode(value) {
  const text = normalizeText(value);
  if (text === 'stock_water_level' || text === 'stock-water-level') return 'stock_water_level';
  if (text === 'sell_through' || text === 'sell-through') return 'sell_through';
  return null;
}

function normalizeNonMainReason(value) {
  const text = normalizeText(value);
  if (text === 'carryover_active') return 'carryover_active';
  if (text === 'carryover_protected') return 'carryover_protected';
  if (text === 'aged_tail') return 'aged_tail';
  if (text === 'future_preheat') return 'future_preheat';
  if (text === 'unclassified') return 'unclassified';
  return null;
}

function loadCarryoverRegistry() {
  if (!fs.existsSync(carryoverRegistryPath)) {
    return new Map();
  }

  const payload = JSON.parse(fs.readFileSync(carryoverRegistryPath, 'utf8'));
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  return new Map(entries.map((entry) => [String(entry.sku_id), entry]));
}

function resolveRegistrySchema(entry, seed) {
  if (!entry) return null;

  const isCarryover = normalizeBoolean(entry.is_carryover);
  const carryoverStatus = normalizeCarryoverStatus(entry.carryover_status) || 'active';
  const carryoverProtectionEnd = entry.carryover_protection_end ? String(entry.carryover_protection_end) : null;
  const carryoverEntrySource = normalizeCarryoverEntrySource(entry.carryover_entry_source || entry.entry_source) || 'manual_whitelist';
  const carryoverType = normalizeCarryoverType(entry.carryover_type) || (hashNumber(seed) % 100 < 45 ? 'seasonal' : 'iconic');
  const monitorMode = normalizeMonitorMode(entry.monitor_mode) || 'stock_water_level';
  const nonMainReason = normalizeNonMainReason(entry.non_main_reason)
    || (carryoverProtectionEnd ? 'carryover_protected' : 'carryover_active');

  if (isCarryover === false) {
    return {
      product_track: normalizeProductTrack(entry.product_track) || 'seasonal',
      is_carryover: false,
      carryover_type: null,
      carryover_status: null,
      carryover_protection_end: null,
      carryover_entry_source: carryoverEntrySource,
      monitor_mode: normalizeMonitorMode(entry.monitor_mode) || 'sell_through',
      non_main_reason: normalizeNonMainReason(entry.non_main_reason) || null,
    };
  }

  return {
    product_track: 'evergreen',
    is_carryover: true,
    carryover_type: carryoverType,
    carryover_status: carryoverStatus,
    carryover_protection_end: carryoverProtectionEnd,
    carryover_entry_source: carryoverEntrySource,
    monitor_mode: monitorMode,
    non_main_reason: nonMainReason,
  };
}

const carryoverRegistry = loadCarryoverRegistry();

function inferCarryoverSchema(input, seed) {
  const registrySchema = resolveRegistrySchema(carryoverRegistry.get(String(seed)), seed);
  if (registrySchema) return registrySchema;

  const lifecycleKind = normalizeLegacyLifecycle(input.lifecycle);
  const explicitTrack = normalizeProductTrack(input.product_track);
  const explicitIsCarryover = normalizeBoolean(input.is_carryover);
  const carryoverType = normalizeCarryoverType(input.carryover_type);
  const carryoverStatus = normalizeCarryoverStatus(input.carryover_status);
  const carryoverProtectionEnd = input.carryover_protection_end ? String(input.carryover_protection_end) : null;
  const carryoverEntrySource = normalizeCarryoverEntrySource(input.carryover_entry_source) || 'rule_inferred';
  const monitorMode = normalizeMonitorMode(input.monitor_mode);
  const nonMainReason = normalizeNonMainReason(input.non_main_reason);
  const inferredIsCarryover = explicitTrack === 'evergreen' || lifecycleKind === 'carryover';
  const isCarryover = explicitIsCarryover ?? inferredIsCarryover;
  const defaultCarryoverType = hashNumber(seed) % 100 < 45 ? 'seasonal' : 'iconic';

  if (isCarryover) {
    return {
      product_track: 'evergreen',
      is_carryover: true,
      carryover_type: carryoverType || defaultCarryoverType,
      carryover_status: carryoverStatus || 'active',
      carryover_protection_end: carryoverProtectionEnd,
      carryover_entry_source: carryoverEntrySource,
      monitor_mode: monitorMode || 'stock_water_level',
      non_main_reason: nonMainReason || (carryoverProtectionEnd ? 'carryover_protected' : 'carryover_active'),
    };
  }

  if (lifecycleKind === 'clearance') {
    return {
      product_track: 'seasonal',
      is_carryover: false,
      carryover_type: null,
      carryover_status: null,
      carryover_protection_end: null,
      carryover_entry_source: carryoverEntrySource,
      monitor_mode: monitorMode || 'sell_through',
      non_main_reason: nonMainReason || 'aged_tail',
    };
  }

  return {
    product_track: explicitTrack || 'seasonal',
    is_carryover: false,
    carryover_type: null,
    carryover_status: null,
    carryover_protection_end: null,
    carryover_entry_source: carryoverEntrySource,
    monitor_mode: monitorMode || 'sell_through',
    non_main_reason: nonMainReason || null,
  };
}

function resolveLifecycleBucket(sku) {
  const carryoverSchema = inferCarryoverSchema(sku, sku.sku_id);
  if (carryoverSchema.is_carryover) return 'evergreen';
  return normalizeLegacyLifecycle(sku.lifecycle) === 'clearance' ? 'clearance' : 'new';
}

function normalizeMix(mix) {
  const total = Object.values(mix).reduce((sum, value) => sum + value, 0);
  const normalized = {};
  Object.entries(mix).forEach(([channelId, value]) => {
    normalized[channelId] = value / total;
  });
  return normalized;
}

function getChannelMix(lifecycle, priceBand) {
  const mix = { ...CHANNEL_MIX_BASE };

  if (lifecycle === 'clearance') {
    mix.C01 += 0.05;
    mix.C02 += 0.03;
    mix.C03 += 0.02;
    mix.C09 += 0.03;
    mix.C10 += 0.03;
    mix.C04 -= 0.04;
    mix.C05 -= 0.04;
    mix.C06 -= 0.04;
    mix.C07 -= 0.02;
    mix.C08 -= 0.02;
  } else if (lifecycle === 'new') {
    mix.C04 += 0.04;
    mix.C05 += 0.03;
    mix.C06 += 0.03;
    mix.C01 -= 0.03;
    mix.C02 -= 0.03;
    mix.C03 -= 0.02;
    mix.C09 -= 0.01;
    mix.C10 -= 0.01;
  }

  if (priceBand === 'PB5' || priceBand === 'PB6') {
    mix.C04 += 0.03;
    mix.C05 += 0.02;
    mix.C06 += 0.02;
    mix.C01 -= 0.03;
    mix.C02 -= 0.02;
    mix.C03 -= 0.02;
  }

  return normalizeMix(mix);
}

function getSkuParams(sku) {
  const priceBandConfig = PRICE_BAND_CONFIG[sku.price_band] || PRICE_BAND_CONFIG.PB2;
  const lifecycleBucket = resolveLifecycleBucket(sku);
  const lifecycleConfig = LIFECYCLE_MODIFIER[lifecycleBucket] || LIFECYCLE_MODIFIER.new;
  const carryoverSchema = inferCarryoverSchema(sku, sku.sku_id);
  const seed = sku.sku_id;
  const unitsNoise = seededRange(`${seed}-units`, 0.90, 1.12);
  const stNoise = seededRange(`${seed}-st`, 0.95, 1.05);

  return {
    lifecycleBucket,
    carryoverSchema,
    totalInventory: Math.round(priceBandConfig.baseUnits * lifecycleConfig.unitsMult * unitsNoise),
    sellThroughTarget: Math.min(0.95, priceBandConfig.stTarget * lifecycleConfig.stMult * stNoise),
    marginRate: Math.min(0.65, priceBandConfig.marginRate * lifecycleConfig.marginMult),
    channelMix: getChannelMix(lifecycleBucket, sku.price_band),
  };
}

function getSeasonProfile(season) {
  return (SEASON_MONTH_PROFILES[season] || []).map((entry) => ({ ...entry }));
}

function getDiscountRate(stageIndex, stageCount, lifecycle) {
  const progress = stageCount <= 1 ? 1 : stageIndex / (stageCount - 1);

  if (lifecycle === 'clearance') {
    return Math.max(0.52, 0.78 - progress * 0.18);
  }

  if (lifecycle === 'evergreen') {
    return Math.max(0.84, 0.93 - progress * 0.08);
  }

  if (progress <= 0.35) return 0.98;
  if (progress <= 0.7) return 0.93;
  return Math.max(0.80, 0.90 - (progress - 0.7) * 0.18);
}

function resolveSalesSeasonYear(season, saleYear, saleMonth) {
  if (season === 'Q4' && saleMonth <= 4) return saleYear - 1;
  if (season === 'Q1' && saleMonth >= 12) return saleYear + 1;
  return saleYear;
}

function splitUnitsByChannel(totalUnits, mix) {
  const entries = Object.entries(mix).map(([channelId, ratio]) => {
    const raw = totalUnits * ratio;
    const base = Math.floor(raw);
    return {
      channelId,
      units: base,
      remainder: raw - base,
    };
  });

  let allocated = entries.reduce((sum, entry) => sum + entry.units, 0);
  let remainderUnits = totalUnits - allocated;

  entries
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((entry) => {
      if (remainderUnits <= 0) return;
      entry.units += 1;
      remainderUnits -= 1;
    });

  return entries
    .filter((entry) => entry.units > 0)
    .map(({ channelId, units }) => ({ channelId, units }));
}

const records = [];
let recordId = 1;

skus.forEach((sku) => {
  const params = getSkuParams(sku);
  const profile = getSeasonProfile(sku.season);
  if (profile.length === 0) return;

  let cumulativeSold = 0;
  let cumulativeWeight = 0;

  profile.forEach((entry, stageIndex) => {
    cumulativeWeight += entry.weight;
    const cumulativeSellThrough = Math.min(params.sellThroughTarget, params.sellThroughTarget * cumulativeWeight);
    const targetCumulativeSold = Math.round(params.totalInventory * cumulativeSellThrough);
    const monthSold = Math.max(0, targetCumulativeSold - cumulativeSold);
    cumulativeSold = targetCumulativeSold;

    if (monthSold <= 0) return;

    const discountRate = getDiscountRate(stageIndex, profile.length, params.lifecycleBucket);
    const netPrice = sku.msrp * discountRate;
    const salesSeasonYear = resolveSalesSeasonYear(sku.season, SALE_YEAR, entry.month);
    const channelUnits = splitUnitsByChannel(monthSold, params.channelMix);

    channelUnits.forEach(({ channelId, units }) => {
      const grossSales = units * sku.msrp;
      const netSales = units * netPrice;
      const discountAmount = grossSales - netSales;
      const cogs = netSales * (1 - params.marginRate);
      const grossProfit = netSales - cogs;

      records.push({
        record_id: `F${String(recordId++).padStart(6, '0')}`,
        sku_id: sku.sku_id,
        channel_id: channelId,
        sale_year: String(SALE_YEAR),
        sale_month: entry.month,
        sale_wave: `W${String(entry.month).padStart(2, '0')}`,
        sales_season_year: String(salesSeasonYear),
        sales_season: sku.season,
        season_year: String(SALE_YEAR),
        season: sku.season,
        product_track: params.carryoverSchema.product_track,
        is_carryover: params.carryoverSchema.is_carryover,
        carryover_type: params.carryoverSchema.carryover_type,
        carryover_status: params.carryoverSchema.carryover_status,
        carryover_protection_end: params.carryoverSchema.carryover_protection_end,
        carryover_entry_source: params.carryoverSchema.carryover_entry_source,
        monitor_mode: params.carryoverSchema.monitor_mode,
        non_main_reason: params.carryoverSchema.non_main_reason,
        wave: `W${String(entry.month).padStart(2, '0')}`,
        week_num: entry.month,
        unit_sold: units,
        gross_sales_amt: Math.round(grossSales),
        net_sales_amt: Math.round(netSales),
        discount_amt: Math.round(discountAmount),
        discount_rate: Number((1 - discountRate).toFixed(4)),
        cogs_amt: Math.round(cogs),
        gross_profit_amt: Math.round(grossProfit),
        gross_margin_rate: Number(params.marginRate.toFixed(4)),
        cumulative_sell_through: Number(cumulativeSellThrough.toFixed(4)),
        on_hand_unit: Math.max(0, params.totalInventory - cumulativeSold),
      });
    });
  });
});

records.sort((left, right) => {
  const monthDiff = Number(left.sale_month || 0) - Number(right.sale_month || 0);
  if (monthDiff !== 0) return monthDiff;
  if (left.sku_id !== right.sku_id) return left.sku_id.localeCompare(right.sku_id);
  return left.channel_id.localeCompare(right.channel_id);
});

const totalNetSales = records.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
const janAprWinter23 = records
  .filter((record) => Number(record.sale_month) >= 1 && Number(record.sale_month) <= 4)
  .filter((record) => record.sales_season === 'Q4' && String(record.sales_season_year) === '2023')
  .reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);

console.log(`registry entries: ${carryoverRegistry.size}`);
console.log(`generated records: ${records.length}`);
console.log(`total net sales: ${(totalNetSales / 10000).toFixed(1)} wan`);
console.log(`jan-apr winter23 sales: ${(janAprWinter23 / 10000).toFixed(1)} wan`);

fs.writeFileSync(factSalesPath, JSON.stringify(records, null, 2), 'utf8');
console.log('wrote data/dashboard/fact_sales.json');
