const fs = require('fs');
const path = require('path');

const root = process.cwd();
const skuPath = path.join(root, 'data', 'dashboard', 'dim_sku.json');
const planPath = path.join(root, 'data', 'dashboard', 'dim_plan.json');
const taxonomyPath = path.join(root, 'data', 'taxonomy', 'shoe_category_map.json');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hashString(input) {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickByHash(list, key) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[hashString(key) % list.length];
}

function buildTaxonomyMaps(taxonomy) {
  const l2ToL1 = new Map();
  const l1Set = new Set();

  (taxonomy.category_groups || []).forEach((group) => {
    const l1 = String(group.group || '').trim();
    if (!l1) return;
    l1Set.add(l1);
    (group.sub_categories || []).forEach((sub) => {
      const l2 = String(sub.name || '').trim();
      if (l2) l2ToL1.set(l2, l1);
    });
  });

  return { l2ToL1, l1Set };
}

const LEGACY_L2_ALIAS = {
  跑步: '阿甘鞋',
  竞速: '阿甘鞋',
  篮球: '板鞋',
  综训: '德训鞋',
  训练: '德训鞋',
};

const LEGACY_L1_ALIAS = {
  运动鞋: '休闲/街头',
  户外鞋: '户外鞋',
  '休闲/街头': '休闲/街头',
};

const BOOT_L2 = ['裸靴', '切尔西靴', '马丁靴', '长筒靴', '雪地靴', '短靴'];
const COMMUTE_L2 = ['乐福鞋', '牛津鞋', '德比鞋', '豆豆鞋', '穆勒鞋'];
const FASHION_L2 = ['浅口单鞋', '芭蕾舞鞋', '玛丽珍鞋'];
const SANDAL_L2 = ['凉鞋', '洞洞鞋', '拖鞋', '前空鞋', '中空鞋', '后空鞋'];
const OUTDOOR_L2 = ['徒步登山', '溯溪鞋', '越野鞋', '潮流机能'];

function mapByProductLine(row) {
  const productLine = String(row.product_line || '').trim();
  const season = String(row.season || '').trim();
  const skuKey = `${row.sku_id || ''}-${row.msrp || 0}-${season}`;

  if (productLine === '户外机能') {
    return {
      l1: '户外鞋',
      l2: season === 'Q2' ? pickByHash(['溯溪鞋', '潮流机能'], skuKey) : pickByHash(OUTDOOR_L2, skuKey),
    };
  }

  if (productLine === '通勤轻商务') {
    if (season === 'Q4') {
      return { l1: '靴类', l2: pickByHash(BOOT_L2, skuKey) };
    }
    if (season === 'Q2') {
      return { l1: '时尚/通勤', l2: pickByHash(FASHION_L2, skuKey) };
    }
    return { l1: '正装/通勤', l2: pickByHash(COMMUTE_L2, skuKey) };
  }

  if (productLine === '轻运动训练') {
    if (season === 'Q2' && Number(row.msrp || 0) <= 349) {
      return { l1: '凉拖鞋', l2: pickByHash(SANDAL_L2, skuKey) };
    }
    return { l1: '休闲/街头', l2: '德训鞋' };
  }

  if (productLine === '专业跑步') {
    if (season === 'Q2' && Number(row.msrp || 0) <= 299) {
      return { l1: '凉拖鞋', l2: pickByHash(['洞洞鞋', '拖鞋', '前空鞋'], skuKey) };
    }
    return { l1: '休闲/街头', l2: '阿甘鞋' };
  }

  if (productLine === '竞技篮球') {
    return { l1: '休闲/街头', l2: '板鞋' };
  }

  return null;
}

function normalizeSkuCategories(rows, l2ToL1, l1Set) {
  return rows.map((row) => {
    const fromProductLine = mapByProductLine(row);
    if (fromProductLine && l1Set.has(fromProductLine.l1)) {
      return {
        ...row,
        category_id: fromProductLine.l1,
        category_name: fromProductLine.l1,
        category_l1: fromProductLine.l1,
        category_l2: fromProductLine.l2,
      };
    }

    const rawL2 = String(row.category_l2 || '').trim();
    const mappedL2 = LEGACY_L2_ALIAS[rawL2] || rawL2;

    let categoryL1 = mappedL2 ? l2ToL1.get(mappedL2) : null;
    let categoryL2 = mappedL2;

    if (!categoryL1) {
      const rawL1 = String(row.category_id || row.category_name || '').trim();
      const mappedL1 = LEGACY_L1_ALIAS[rawL1] || rawL1;
      if (l1Set.has(mappedL1)) {
        categoryL1 = mappedL1;
      }
    }

    if (!categoryL1) {
      categoryL1 = '休闲/街头';
      categoryL2 = '板鞋';
    }

    if (!categoryL2 || !l2ToL1.has(categoryL2)) {
      if (categoryL1 === '户外鞋') categoryL2 = '徒步登山';
      else if (categoryL1 === '正装/通勤') categoryL2 = '乐福鞋';
      else if (categoryL1 === '时尚/通勤') categoryL2 = '浅口单鞋';
      else if (categoryL1 === '靴类') categoryL2 = '短靴';
      else if (categoryL1 === '凉拖鞋') categoryL2 = '凉鞋';
      else categoryL2 = '板鞋';
    }

    return {
      ...row,
      category_id: categoryL1,
      category_name: categoryL1,
      category_l1: categoryL1,
      category_l2: categoryL2,
    };
  });
}

function getSkuL1Shares(normalizedSkuRows) {
  const counts = new Map();
  normalizedSkuRows.forEach((row) => {
    const l1 = String(row.category_id || '').trim();
    if (!l1) return;
    counts.set(l1, (counts.get(l1) || 0) + 1);
  });
  const total = Array.from(counts.values()).reduce((sum, v) => sum + v, 0) || 1;
  const shares = {};
  counts.forEach((value, key) => {
    shares[key] = value / total;
  });
  return shares;
}

function normalizeCategoryPlan(plan, l1Set, skuL1Shares) {
  const categoryPlanRows = Array.isArray(plan.category_plan) ? plan.category_plan : [];
  if (categoryPlanRows.length === 0) return plan;

  const merged = new Map();

  function addPlanRow(categoryId, row, ratio = 1) {
    if (!categoryId || ratio <= 0) return;
    const prev = merged.get(categoryId) || {
      category_id: categoryId,
      plan_sales_amt: 0,
      plan_units: 0,
      plan_sku_count: 0,
      _stWeighted: 0,
      _gmWeighted: 0,
    };

    const sales = (Number(row.plan_sales_amt) || 0) * ratio;
    prev.plan_sales_amt += sales;
    prev.plan_units += (Number(row.plan_units) || 0) * ratio;
    prev.plan_sku_count += (Number(row.plan_sku_count) || 0) * ratio;
    prev._stWeighted += (Number(row.plan_sell_through) || 0) * sales;
    prev._gmWeighted += (Number(row.plan_margin_rate) || 0) * sales;
    merged.set(categoryId, prev);
  }

  const structuredCategories = ['休闲/街头', '时尚/通勤', '正装/通勤', '靴类', '凉拖鞋'];

  categoryPlanRows.forEach((row) => {
    const raw = String(row.category_id || '').trim();
    const mapped = LEGACY_L1_ALIAS[raw] || raw;

    if (mapped === '户外鞋') {
      addPlanRow('户外鞋', row, 1);
      return;
    }

    if (mapped === '休闲/街头') {
      const weighted = structuredCategories
        .map((categoryId) => ({ categoryId, share: Number(skuL1Shares[categoryId] || 0) }))
        .filter((item) => item.share > 0);

      if (weighted.length === 0) {
        addPlanRow('休闲/街头', row, 1);
        return;
      }

      const totalShare = weighted.reduce((sum, item) => sum + item.share, 0) || 1;
      weighted.forEach((item) => addPlanRow(item.categoryId, row, item.share / totalShare));
      return;
    }

    const categoryId = l1Set.has(mapped) ? mapped : '休闲/街头';
    addPlanRow(categoryId, row, 1);
  });

  const rows = Array.from(merged.values()).map((item) => {
    const sales = item.plan_sales_amt || 0;
    return {
      category_id: item.category_id,
      plan_sales_amt: Math.round(item.plan_sales_amt),
      plan_units: Math.round(item.plan_units),
      plan_sell_through: sales > 0 ? Number((item._stWeighted / sales).toFixed(4)) : 0,
      plan_margin_rate: sales > 0 ? Number((item._gmWeighted / sales).toFixed(4)) : 0,
      plan_sku_count: Math.round(item.plan_sku_count),
    };
  });

  return {
    ...plan,
    category_plan: rows,
  };
}

function summarize(rows) {
  const l1Count = {};
  const l2Count = {};
  rows.forEach((row) => {
    const l1 = row.category_id || '其他';
    const l2 = row.category_l2 || '其他';
    l1Count[l1] = (l1Count[l1] || 0) + 1;
    l2Count[l2] = (l2Count[l2] || 0) + 1;
  });
  return { l1Count, l2Count };
}

function main() {
  const taxonomy = readJson(taxonomyPath);
  const { l2ToL1, l1Set } = buildTaxonomyMaps(taxonomy);

  const skuRows = readJson(skuPath);
  const plan = readJson(planPath);

  const normalizedSkuRows = normalizeSkuCategories(skuRows, l2ToL1, l1Set);
  const skuL1Shares = getSkuL1Shares(normalizedSkuRows);
  const normalizedPlan = normalizeCategoryPlan(plan, l1Set, skuL1Shares);

  writeJson(skuPath, normalizedSkuRows);
  writeJson(planPath, normalizedPlan);

  const stat = summarize(normalizedSkuRows);
  console.log('[normalize-footwear-categories] done');
  console.log('[l1]', stat.l1Count);
  console.log('[l2 sample]', Object.keys(stat.l2Count).slice(0, 20));
  console.log('[plan categories]', (normalizedPlan.category_plan || []).map((row) => row.category_id));
}

main();
