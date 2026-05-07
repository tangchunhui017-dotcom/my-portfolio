import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const DASHBOARD_DIR = path.join(ROOT, 'data', 'dashboard');
const TAXONOMY_DIR = path.join(ROOT, 'data', 'taxonomy');

const DEFAULT_YEARS = ['2025'];
const OUTPUT_FILE = path.join(DASHBOARD_DIR, 'fact_size_sales_inventory.json');

const WOMEN_HINTS = ['women', 'woman', 'female', 'lady', 'ladies', 'girl', '女'];
const MEN_HINTS = ['men', 'man', 'male', 'boy', '男'];
const UNISEX_HINTS = ['unisex', 'neutral', '中性'];
const SPORT_LINE_HINTS = ['sport', 'sports', 'running', 'runner', 'trail', 'hiking', 'outdoor', 'training', 'basket', 'soccer', 'tennis', '运动', '跑', '越野', '徒步', '登山', '户外', '机能'];
const UPSIZE_HINTS = ['boots', 'boot', 'dad', 'running', 'outdoor', '靴', '老爹', '跑', '户外', '越野', '徒步', '登山'];
const FIT_STRICT_HINTS = ['heels', 'heel', 'pump', 'pumps', 'ballet', 'mary_jane', 'maryjane', '高跟', '浅口', '芭蕾', '玛丽珍', '单鞋'];
const ONLINE_CHANNEL_HINTS = ['online', 'ecom', 'e-commerce', 'ec', '电商', '线上'];
const NORTH_REGION_HINTS = ['north_china', 'northeast_china', 'northwest_china', 'north', 'northeast', 'northwest', '华北', '东北', '西北'];
const SOUTH_REGION_HINTS = ['south_china', 'southwest_china', 'east_china', 'south', 'southwest', 'east', '华南', '西南', '华东'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeDiv(numerator, denominator) {
  return denominator <= 0 ? 0 : numerator / denominator;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function includesAnyToken(text, tokens) {
  return tokens.some((token) => token && text.includes(token));
}

function parseYearsArg() {
  const arg = process.argv.find((item) => item.startsWith('--years='));
  if (!arg) return DEFAULT_YEARS;
  const years = arg
    .slice('--years='.length)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return years.length ? years : DEFAULT_YEARS;
}

function resolveCategoryLabel(sku) {
  return sku.category_l2 || sku.category_name || sku.product_line || sku.sku_name || '未分类';
}

function resolveSizeLineType(sku) {
  const text = normalizeToken([sku.product_line, sku.category_l2, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
  return includesAnyToken(text, SPORT_LINE_HINTS) ? 'sport_casual' : 'fashion_casual';
}

function resolveSizeGender(sku, lineType) {
  const genderRaw = normalizeToken(sku.gender);
  if (includesAnyToken(genderRaw, WOMEN_HINTS)) return 'women';
  if (includesAnyToken(genderRaw, MEN_HINTS)) return 'men';
  if (includesAnyToken(genderRaw, UNISEX_HINTS)) return lineType === 'sport_casual' ? 'men' : 'women';

  const text = normalizeToken([sku.category_l2, sku.product_line, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
  if (includesAnyToken(text, FIT_STRICT_HINTS)) return 'women';
  if (includesAnyToken(text, UPSIZE_HINTS)) return lineType === 'sport_casual' ? 'men' : 'women';
  return lineType === 'fashion_casual' ? 'women' : 'men';
}

function normalizeRegionCluster(regionRaw, sizeRuleMatrix) {
  const region = normalizeToken(regionRaw);
  if (!region) return 'default';

  const northClusters = (sizeRuleMatrix.dynamic_adjustments?.region_clusters?.north || []).map(normalizeToken);
  const southClusters = (sizeRuleMatrix.dynamic_adjustments?.region_clusters?.south || []).map(normalizeToken);
  if (includesAnyToken(region, northClusters) || includesAnyToken(region, NORTH_REGION_HINTS)) return 'north';
  if (includesAnyToken(region, southClusters) || includesAnyToken(region, SOUTH_REGION_HINTS)) return 'south';
  return 'default';
}

function normalizeChannelBias(channelTypeRaw) {
  const channelType = normalizeToken(channelTypeRaw);
  return includesAnyToken(channelType, ONLINE_CHANNEL_HINTS) ? 'online' : 'offline';
}

function resolveSizeCategoryBias(sku, sizeRuleMatrix) {
  const text = normalizeToken([sku.category_l2, sku.product_line, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
  const upsizeCodes = (sizeRuleMatrix.dynamic_adjustments?.category_bias?.upsize || []).map(normalizeToken);
  const fitStrictCodes = (sizeRuleMatrix.dynamic_adjustments?.category_bias?.fit_strict || []).map(normalizeToken);
  if (includesAnyToken(text, upsizeCodes) || includesAnyToken(text, UPSIZE_HINTS)) return 'upsize';
  if (includesAnyToken(text, fitStrictCodes) || includesAnyToken(text, FIT_STRICT_HINTS)) return 'fit_strict';
  return 'none';
}

function getBandKey(band, sizeCode) {
  if (band?.small?.includes(sizeCode)) return 'small';
  if (band?.large?.includes(sizeCode)) return 'large';
  return 'core';
}

function normalizeWeights(sizeCodes, seed) {
  const values = sizeCodes.map((sizeCode) => ({ sizeCode, weight: Math.max(0.0001, seed[sizeCode] ?? 0.0001) }));
  const total = values.reduce((sum, item) => sum + item.weight, 0) || 1;
  return values.reduce((acc, item) => {
    acc[item.sizeCode] = item.weight / total;
    return acc;
  }, {});
}

function allocateInteger(total, sizeCodes, weights) {
  const safeTotal = Math.max(0, Math.round(total));
  const normalized = normalizeWeights(sizeCodes, weights);
  const allocations = {};
  const fractions = [];
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
    allocations[fractions[cursor % fractions.length].sizeCode] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return allocations;
}

function buildSalesWeights(sizeCodes, curve, band, categoryBias, demandHeat) {
  const weights = {};
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

function buildStockWeights(sizeCodes, curve, band, channelBias, categoryBias, demandHeat, inventoryPressure, sizeRuleMatrix) {
  const shortageStress = clamp(Math.max(0, demandHeat) * 0.9 + Math.max(0, 0.45 - inventoryPressure) * 1.25, 0, 0.45);
  const overstockStress = clamp(Math.max(0, inventoryPressure - 0.58) * 1.4, 0, 0.4);
  const edgeFactor = channelBias === 'online'
    ? Number(sizeRuleMatrix.dynamic_adjustments?.channel_bias?.online?.edge_size_factor || 1.15)
    : Number(sizeRuleMatrix.dynamic_adjustments?.channel_bias?.offline?.edge_size_factor || 0.8);
  const weights = {};

  sizeCodes.forEach((sizeCode) => {
    const bandKey = getBandKey(band, sizeCode);
    let weight = Math.max(0.2, Number(curve[sizeCode]) || 0.2);
    if (bandKey !== 'core') weight *= edgeFactor;
    if (shortageStress > 0) weight *= bandKey === 'core' ? 1 - shortageStress * 0.5 : 1 + shortageStress * 0.25;
    if (overstockStress > 0) weight *= bandKey === 'core' ? 1 + overstockStress * 0.1 : 1 + overstockStress * 0.3;
    if (categoryBias === 'upsize' && bandKey === 'large') weight *= 1.12;
    if (categoryBias === 'fit_strict' && bandKey === 'small') weight *= 1.08;
    weights[sizeCode] = weight;
  });

  return normalizeWeights(sizeCodes, weights);
}

function main() {
  const selectedYears = new Set(parseYearsArg());
  const dimSku = readJson(path.join(DASHBOARD_DIR, 'dim_sku.json'));
  const dimChannel = readJson(path.join(DASHBOARD_DIR, 'dim_channel.json'));
  const factSales = readJson(path.join(DASHBOARD_DIR, 'fact_sales.json'));
  const dimSize = readJson(path.join(TAXONOMY_DIR, 'dim_size.json'));
  const sizeRuleMatrix = readJson(path.join(TAXONOMY_DIR, 'size_rule_matrix.json'));
  const sizeCurves = readJson(path.join(TAXONOMY_DIR, 'size_curves.json'));

  const skuMap = new Map(dimSku.map((sku) => [sku.sku_id, sku]));
  const channelMap = new Map(dimChannel.map((channel) => [channel.channel_id, channel]));
  const sizeMetaMap = new Map((dimSize.sizes || []).map((item) => [item.size_code, item]));
  const profileMap = new Map((sizeRuleMatrix.base_profiles || []).map((profile) => [`${profile.gender}__${profile.line_type}`, profile]));
  const rows = [];

  factSales.forEach((record, index) => {
    const year = String(record.season_year || record.sale_year || '');
    if (!selectedYears.has(year)) return;

    const sku = skuMap.get(record.sku_id);
    const channel = channelMap.get(record.channel_id);
    if (!sku || !channel) return;

    const lineType = resolveSizeLineType(sku);
    const genderBucket = resolveSizeGender(sku, lineType);
    const profile =
      profileMap.get(`${genderBucket}__${lineType}`) ||
      profileMap.get(`women__${lineType}`) ||
      profileMap.get(`men__${lineType}`) ||
      sizeRuleMatrix.base_profiles?.[0];
    if (!profile) return;

    const regionCluster = normalizeRegionCluster(channel.region, sizeRuleMatrix);
    const channelBias = normalizeChannelBias(channel.channel_type);
    const categoryBias = resolveSizeCategoryBias(sku, sizeRuleMatrix);
    const curveId = regionCluster === 'north'
      ? profile.curve_north
      : regionCluster === 'south'
        ? profile.curve_south
        : profile.curve_default;
    const resolvedCurveId = sizeCurves.curves[curveId] ? curveId : profile.curve_default;
    const curve = sizeCurves.curves[resolvedCurveId] || {};
    const band = sizeRuleMatrix.band_definitions[profile.band_definition];
    const sizeCodes = band?.size_range?.length
      ? band.size_range
      : Object.keys(curve).sort((a, b) => Number(a) - Number(b));
    if (!sizeCodes.length) return;

    const units = Math.max(0, Number(record.unit_sold || 0));
    const onHandUnits = Math.max(0, Number(record.on_hand_unit || 0));
    const cumulativeSellThrough = Number(record.cumulative_sell_through || 0);
    const demandHeat = clamp(cumulativeSellThrough - 0.68, -0.2, 0.32);
    const inventoryPressure = safeDiv(onHandUnits, Math.max(onHandUnits + units, 1));
    const estimatedDemandUnits = Math.max(units, Math.round(safeDiv(units, Math.max(cumulativeSellThrough, 0.18))));

    const salesWeights = buildSalesWeights(sizeCodes, curve, band, categoryBias, demandHeat);
    const stockWeights = buildStockWeights(sizeCodes, curve, band, channelBias, categoryBias, demandHeat, inventoryPressure, sizeRuleMatrix);
    const allocatedSales = allocateInteger(units, sizeCodes, salesWeights);
    const allocatedDemand = allocateInteger(estimatedDemandUnits, sizeCodes, salesWeights);
    const allocatedStock = allocateInteger(onHandUnits, sizeCodes, stockWeights);
    const categoryLabel = resolveCategoryLabel(sku);

    sizeCodes.forEach((sizeCode) => {
      const bandKey = getBandKey(band, sizeCode);
      const sizeMeta = sizeMetaMap.get(sizeCode) || {
        size_code: sizeCode,
        size_order: Number(sizeCode) || 0,
        size_label: `EU${sizeCode}`,
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
      rows.push({
        record_id: `FSZ_${record.record_id || index}_${sizeCode}`,
        source_record_id: record.record_id || `ROW_${index}`,
        sku_id: record.sku_id,
        channel_id: record.channel_id,
        season_year: record.season_year,
        season: record.season,
        wave: record.wave,
        week_num: Number(record.week_num || 0),
        category_label: categoryLabel,
        size_code: sizeCode,
        size_label: sizeMeta.size_label,
        size_order: Number(sizeMeta.size_order || sizeCode),
        size_band: bandKey,
        is_core_size: bandKey === 'core',
        unit_sold: salesUnits,
        estimated_demand_units: demandUnits,
        on_hand_unit: stockUnits,
        fill_rate: round(fillRate),
        gap_rate: round(gapRate),
        curve_share: round(salesWeights[sizeCode] || 0),
        stockout_flag: bandKey === 'core' && stockUnits <= 1 && fillRate < 0.75 && salesUnits > 0,
        size_profile_id: profile.profile_id,
        size_curve_id: resolvedCurveId,
        gender_bucket: genderBucket,
        line_type: lineType,
        region_cluster: regionCluster,
        channel_bias: channelBias,
      });
    });
  });

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(rows)}\n`, 'utf8');

  const kb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(`generated ${rows.length} size fact rows for years ${Array.from(selectedYears).join(', ')}`);
  console.log(`output: ${path.relative(ROOT, OUTPUT_FILE)} (${kb} KB)`);
}

main();
