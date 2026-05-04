const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '../data/dashboard');
const factSalesPath = path.join(dataDir, 'fact_sales.json');
const dimSkuPath = path.join(dataDir, 'dim_sku.json');
const carryoverRegistryPath = path.join(dataDir, 'carryover_registry.json');

function hashNumber(input) {
  let hash = 0;
  const text = String(input || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeWave(value) {
  if (!value) return null;
  const match = /^W(\d{1,2})$/i.exec(String(value).trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  return `W${String(month).padStart(2, '0')}`;
}

function getMonthByWave(value) {
  const wave = normalizeWave(value);
  if (!wave) return null;
  return Number(wave.slice(1));
}

function resolveSalesSeasonYear(season, saleYear, saleMonth) {
  if (!Number.isFinite(saleYear) || !Number.isFinite(saleMonth)) return null;
  if (season === 'Q4' && saleMonth <= 4) return saleYear - 1;
  if (season === 'Q1' && saleMonth >= 12) return saleYear + 1;
  return saleYear;
}

function normalizeSeason(value) {
  const season = String(value || '').toUpperCase();
  return season === 'Q1' || season === 'Q2' || season === 'Q3' || season === 'Q4' ? season : null;
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

function inferCarryoverSchema(input, seed, registryEntry) {
  const registrySchema = resolveRegistrySchema(registryEntry, seed);
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

const carryoverRegistry = loadCarryoverRegistry();

const dimSku = JSON.parse(fs.readFileSync(dimSkuPath, 'utf8'));
const standardizedSku = dimSku.map((sku) => {
  const registryEntry = carryoverRegistry.get(String(sku.sku_id));
  const carryoverSchema = inferCarryoverSchema(sku, sku.sku_id, registryEntry);
  return {
    ...sku,
    dev_season_year: sku.dev_season_year ?? sku.season_year ?? null,
    dev_season: sku.dev_season ?? sku.season ?? null,
    ...carryoverSchema,
  };
});
fs.writeFileSync(dimSkuPath, JSON.stringify(standardizedSku, null, 2), 'utf8');

const skuMap = new Map(standardizedSku.map((sku) => [String(sku.sku_id), sku]));
const factSales = JSON.parse(fs.readFileSync(factSalesPath, 'utf8'));
const standardizedSales = factSales
  .map((record) => {
    const saleWave = normalizeWave(record.sale_wave || record.wave) || null;
    const saleMonth = Number(record.sale_month ?? getMonthByWave(saleWave) ?? record.week_num ?? 0) || null;
    const saleYearNumber = Number(record.sale_year ?? record.season_year ?? 0) || null;
    const salesSeason = normalizeSeason(record.sales_season || record.season);
    const salesSeasonYear = Number(
      record.sales_season_year ?? resolveSalesSeasonYear(salesSeason, saleYearNumber, saleMonth) ?? record.season_year ?? 0,
    ) || null;
    const sku = skuMap.get(String(record.sku_id)) || {};
    const registryEntry = carryoverRegistry.get(String(record.sku_id));
    const carryoverSchema = inferCarryoverSchema({ ...sku, ...record }, record.sku_id, registryEntry);

    return {
      ...record,
      sale_year: saleYearNumber === null ? null : String(saleYearNumber),
      sale_month: saleMonth,
      sale_wave: saleWave,
      sales_season_year: salesSeasonYear === null ? null : String(salesSeasonYear),
      sales_season: salesSeason,
      ...carryoverSchema,
    };
  })
  .sort((left, right) => {
    const yearDiff = Number(left.sale_year || 0) - Number(right.sale_year || 0);
    if (yearDiff !== 0) return yearDiff;
    const monthDiff = Number(left.sale_month || 0) - Number(right.sale_month || 0);
    if (monthDiff !== 0) return monthDiff;
    if (left.sku_id !== right.sku_id) return String(left.sku_id).localeCompare(String(right.sku_id));
    return String(left.channel_id || '').localeCompare(String(right.channel_id || ''));
  });

fs.writeFileSync(factSalesPath, JSON.stringify(standardizedSales, null, 2), 'utf8');

const carryoverSkuCount = standardizedSku.filter((sku) => sku.is_carryover).length;
const carryoverSalesCount = standardizedSales.filter((record) => record.is_carryover).length;
const janAprWinter23 = standardizedSales
  .filter((record) => Number(record.sale_year) === 2024)
  .filter((record) => Number(record.sale_month) >= 1 && Number(record.sale_month) <= 4)
  .filter((record) => record.sales_season === 'Q4' && String(record.sales_season_year) === '2023')
  .reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);

console.log(`registry entries: ${carryoverRegistry.size}`);
console.log(`standardized sku rows: ${standardizedSku.length}`);
console.log(`carryover sku rows: ${carryoverSkuCount}`);
console.log(`standardized sales rows: ${standardizedSales.length}`);
console.log(`carryover sales rows: ${carryoverSalesCount}`);
console.log(`jan-apr winter23 sales: ${(janAprWinter23 / 10000).toFixed(1)} wan`);
