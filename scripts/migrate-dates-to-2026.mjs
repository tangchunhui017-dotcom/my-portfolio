/**
 * 日期迁移脚本：将模拟数据时间线对齐到 2026 年
 *
 * 策略：
 * - data/dashboard/: fact_sales/dim_sku 年份 +1（2023→2024, 2024→2025），dim_plan season_year 2024→2025
 * - data/footwear-planning/: 所有日期 +2 年（2024→2026），让企划项目当前处于 2026SS 开发中期
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function readJson(relativePath) {
  const content = readFileSync(join(ROOT, relativePath), 'utf-8');
  const normalized = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  return JSON.parse(normalized);
}

function writeJson(relativePath, data) {
  writeFileSync(join(ROOT, relativePath), JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Updated: ${relativePath}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────

/** 把 "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm:ssZ" 中的年份偏移 N 年 */
function shiftYear(value, delta) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/^(\d{4})([-T].*)$/, (_, y, rest) => `${Number(y) + delta}${rest}`);
}

/** 把 launchWindow "YYYY-MM-DD ~ YYYY-MM-DD" 中的年份偏移 N 年 */
function shiftLaunchWindow(value, delta) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, y, m, d) => `${Number(y) + delta}-${m}-${d}`);
}

/** 把 season 字符串 "2024SS" / "2024AW" 的年份偏移 N 年 */
function shiftSeasonLabel(value, delta) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/^(\d{4})(SS|AW|Q\d)$/, (_, y, suffix) => `${Number(y) + delta}${suffix}`);
}

/** 递归对象字段操作，只处理字符串值 */
function deepTransform(obj, transform) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return transform(obj);
  if (Array.isArray(obj)) return obj.map((item) => deepTransform(item, transform));
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepTransform(value, transform);
    }
    return result;
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 商品企划数据层（+1 年：2023→2024, 2024→2025）
// ─────────────────────────────────────────────────────────────────────────────

function migrateDashboardYears() {
  // fact_sales.json：season_year, sale_year, sales_season_year 字符串字段各 +1
  const factSales = readJson('data/dashboard/fact_sales.json');
  const migratedSales = factSales.map((record) => ({
    ...record,
    season_year: record.season_year ? String(Number(record.season_year) + 1) : record.season_year,
    sale_year: record.sale_year ? String(Number(record.sale_year) + 1) : record.sale_year,
    sales_season_year: record.sales_season_year ? String(Number(record.sales_season_year) + 1) : record.sales_season_year,
  }));
  writeJson('data/dashboard/fact_sales.json', migratedSales);

  // dim_sku.json：season_year, dev_season_year +1
  const dimSku = readJson('data/dashboard/dim_sku.json');
  const migratedSku = dimSku.map((sku) => ({
    ...sku,
    season_year: sku.season_year ? String(Number(sku.season_year) + 1) : sku.season_year,
    dev_season_year: sku.dev_season_year ? String(Number(sku.dev_season_year) + 1) : sku.dev_season_year,
    launch_date: shiftYear(sku.launch_date, 1),
  }));
  writeJson('data/dashboard/dim_sku.json', migratedSku);

  // dim_plan.json：season_year +1
  const dimPlan = readJson('data/dashboard/dim_plan.json');
  dimPlan.season_year = Number(dimPlan.season_year) + 1;
  writeJson('data/dashboard/dim_plan.json', dimPlan);

  // carryover_registry.json
  const carryover = readJson('data/dashboard/carryover_registry.json');
  const migratedCarryover = deepTransform(carryover, (str) => {
    // 仅对 YYYY-MM-DD 或 YYYY 格式的年份字符串做偏移
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return shiftYear(str, 1);
    if (/^\d{4}$/.test(str)) return String(Number(str) + 1);
    if (/^\d{4}(SS|AW|Q\d)/.test(str)) return shiftSeasonLabel(str, 1);
    return str;
  });
  writeJson('data/dashboard/carryover_registry.json', migratedCarryover);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 设计企划数据层（+2 年：2024→2026，让项目当前处于 2026SS 活跃期）
// ─────────────────────────────────────────────────────────────────────────────

const FOOTWEAR_FILES = [
  'data/footwear-planning/projects.json',
  'data/footwear-planning/waves.json',
  'data/footwear-planning/series.json',
  'data/footwear-planning/series-briefs.json',
  'data/footwear-planning/category-plans.json',
  'data/footwear-planning/style-developments.json',
  'data/footwear-planning/gate-nodes.json',
  'data/footwear-planning/design-assets.json',
  'data/footwear-planning/review-records.json',
  'data/footwear-planning/action-items.json',
  'data/footwear-planning/otb-structures.json',
  'data/footwear-planning/product-architectures.json',
  'data/footwear-planning/category-breakdowns.json',
  'data/footwear-planning/theme-directions.json',
  'data/footwear-planning/season-overview.json',
  'data/footwear-planning/series-development-plans.json',
];

function migrateFootwearYears() {
  const DELTA = 2; // 2024 → 2026

  for (const filePath of FOOTWEAR_FILES) {
    try {
      const data = readJson(filePath);
      const migrated = deepTransform(data, (str) => {
        // launchWindow "2024-MM-DD ~ 2024-MM-DD"
        if (/\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/.test(str)) {
          return shiftLaunchWindow(str, DELTA);
        }
        // ISO 日期 "2024-MM-DD" 或 "2024-MM-DDTHH:mm:ssZ"
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          return shiftYear(str, DELTA);
        }
        // 纯年份 "2024"
        if (/^2024$/.test(str)) {
          return '2026';
        }
        // 季节标签 "2024SS", "2024AW", "2024Q1"
        if (/^2024(SS|AW|Q\d)$/.test(str)) {
          return shiftSeasonLabel(str, DELTA);
        }
        return str;
      });
      writeJson(filePath, migrated);
    } catch (e) {
      console.warn(`⚠️  Skipped ${filePath}: ${e.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 执行
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📅 Step 1: 商品企划数据层 +1 年（2023→2024, 2024→2025）');
migrateDashboardYears();

console.log('\n📅 Step 2: 设计企划数据层 +2 年（2024→2026）');
migrateFootwearYears();

console.log('\n✨ 日期迁移完成！');
