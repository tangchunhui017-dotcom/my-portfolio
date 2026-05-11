/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'data', 'planning');
fs.mkdirSync(outDir, { recursive: true });

const channels = [
  { channelId: 'physical', channelName: '实体门店', share: 0.55 },
  { channelId: 'ecommerce', channelName: '电商', share: 0.35 },
  { channelId: 'franchise', channelName: '加盟/分销', share: 0.10 },
];

const categoryMetaMap = {
  休闲: { categoryId: '休闲/街头', categoryName: '休闲/街头', categoryL3: '板鞋' },
  训练: { categoryId: '休闲/街头', categoryName: '休闲/街头', categoryL3: '德训鞋' },
  跑步: { categoryId: '休闲/街头', categoryName: '休闲/街头', categoryL3: '阿甘鞋' },
  篮球: { categoryId: '休闲/街头', categoryName: '休闲/街头', categoryL3: '板鞋' },
  凉拖: { categoryId: '凉拖鞋', categoryName: '凉拖鞋', categoryL3: '凉鞋' },
  轻量跑步: { categoryId: '休闲/街头', categoryName: '休闲/街头', categoryL3: '阿甘鞋' },
  户外: { categoryId: '户外鞋', categoryName: '户外鞋', categoryL3: '潮流机能' },
  保暖: { categoryId: '靴类', categoryName: '靴类', categoryL3: '雪地靴' },
};

const roleLabel = {
  traffic: '引流波段',
  testing: '试销波段',
  main_sales: '主销波段',
  repeat: '翻单波段',
  clearance: '清尾波段',
};

const rolePlanningMeta = {
  traffic: {
    consumerScene: '节庆上新与门店引流',
    targetAudience: '18-28岁轻运动与城市通勤客群',
    channelFocus: ['直营门店', '电商首发'],
    productRoleFocus: ['basic', 'main'],
    planningNotes: '控制宽度，用入门价位和基础款承接年初客流。',
  },
  testing: {
    consumerScene: '开季试销与新品验证',
    targetAudience: '新品敏感客群与会员种子用户',
    channelFocus: ['核心直营', '内容电商'],
    productRoleFocus: ['test', 'main'],
    planningNotes: '小批量验证材质、色彩和价位接受度，保留快速调款空间。',
  },
  main_sales: {
    consumerScene: '季节主销与营销大促',
    targetAudience: '核心消费客群与高复购会员',
    channelFocus: ['直营门店', '电商', '加盟'],
    productRoleFocus: ['main', 'hero'],
    planningNotes: '聚焦主推品类和利润价位，确保核心尺码深度和上市前到仓。',
  },
  repeat: {
    consumerScene: '爆款翻单与活动补货',
    targetAudience: '已验证畅销款复购人群',
    channelFocus: ['电商', '高动销门店'],
    productRoleFocus: ['repeat', 'clearance'],
    planningNotes: '根据售罄率和尺码断码情况补深度，避免补宽导致库存尾货。',
  },
  clearance: {
    consumerScene: '季末清尾与库存结构修正',
    targetAudience: '价格敏感客群与奥莱渠道',
    channelFocus: ['奥莱', '特渠', '电商清仓'],
    productRoleFocus: ['clearance'],
    planningNotes: '以消化旧品和释放仓容为主，严控新品资源占用。',
  },
};

const categoryPlanningMeta = {
  '休闲/街头': {
    designTheme: '城市轻运动与日常百搭',
    colorStrategy: '黑白灰基础色打底，增加低饱和季节色',
    materialFocus: '透气网布、反绒、耐磨橡胶底',
    marketingMoment: '开学、五一、618、国庆',
    coreSizeRange: '女 35-39 / 男 39-44',
  },
  户外鞋: {
    designTheme: '轻户外、露营和城市机能',
    colorStrategy: '大地色、军绿、灰蓝为主，保留黑色核心款',
    materialFocus: '防泼水鞋面、防滑大底、耐磨包头',
    marketingMoment: '春秋出游、国庆、双11',
    coreSizeRange: '女 36-40 / 男 40-44',
  },
  凉拖鞋: {
    designTheme: '夏季清凉与轻便出行',
    colorStrategy: '白色、浅卡其、浅蓝和高明度点缀色',
    materialFocus: '轻量 EVA、快干织带、软弹鞋床',
    marketingMoment: '五一、端午、618、暑期',
    coreSizeRange: '女 35-39 / 男 40-44',
  },
  靴类: {
    designTheme: '秋冬保暖与通勤搭配',
    colorStrategy: '黑、棕、米白为核心，少量酒红/深绿',
    materialFocus: '绒面、皮革、防滑底、保暖内里',
    marketingMoment: '秋季上新、双11、冬季保暖',
    coreSizeRange: '女 35-40 / 男 39-44',
  },
};

const waves = [
  {
    id: 'SS-1A',
    seasonCode: 'SS',
    seasonLabel: '春夏',
    waveCode: '1A',
    waveRole: 'traffic',
    launchMonth: 1,
    launchDate: '2026-01-05',
    theme: '元旦/春节上新',
    salesRatio: 0.10,
    planSalesAmount: 2400000,
    lySalesAmount: 2200000,
    momSalesAmount: 2300000,
    newProductRatio: 0.60,
    repeatOrderRatio: 0.30,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.75,
    plannedStyleCount: 18,
    targetColorCount: 2,
    targetSkuCount: 36,
    averageDepth: 520,
    mainCategory: '休闲/训练',
    priceBandFocus: ['entry', 'volume'],
    productRoleFocus: ['basic', 'main'],
    arrivalMonth: 12,
    arrivalRateTarget: 0.80,
    arrivalSuggestion: '12月到货80%，1月首周补齐核心SKU',
    planOtbBudget: 1850000,
    orderDeadline: '2025-10-21',
    warehouseDeadline: '2025-12-21',
    status: 'approved',
  },
  {
    id: 'SS-1B',
    seasonCode: 'SS',
    seasonLabel: '春夏',
    waveCode: '1B',
    waveRole: 'testing',
    launchMonth: 2,
    launchDate: '2026-02-15',
    theme: '开学/春季试销',
    salesRatio: 0.12,
    planSalesAmount: 2800000,
    lySalesAmount: 2500000,
    momSalesAmount: 2600000,
    newProductRatio: 0.65,
    repeatOrderRatio: 0.25,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.78,
    plannedStyleCount: 20,
    targetColorCount: 2,
    targetSkuCount: 40,
    averageDepth: 580,
    mainCategory: '跑步/休闲',
    priceBandFocus: ['volume', 'profit'],
    productRoleFocus: ['test', 'main'],
    arrivalMonth: 1,
    arrivalRateTarget: 0.78,
    arrivalSuggestion: '1月到货78%，春节后滚动补齐',
    planOtbBudget: 2300000,
    orderDeadline: '2025-12-02',
    warehouseDeadline: '2026-01-31',
    status: 'approved',
  },
  {
    id: 'SS-2A',
    seasonCode: 'SS',
    seasonLabel: '春夏',
    waveCode: '2A',
    waveRole: 'main_sales',
    launchMonth: 3,
    launchDate: '2026-03-05',
    theme: '春季主推',
    salesRatio: 0.20,
    planSalesAmount: 4700000,
    lySalesAmount: 4300000,
    momSalesAmount: 4500000,
    newProductRatio: 0.70,
    repeatOrderRatio: 0.20,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.82,
    plannedStyleCount: 28,
    targetColorCount: 2,
    targetSkuCount: 56,
    averageDepth: 700,
    mainCategory: '跑步/休闲',
    priceBandFocus: ['volume', 'profit'],
    productRoleFocus: ['main', 'hero'],
    arrivalMonth: 2,
    arrivalRateTarget: 0.82,
    arrivalSuggestion: '2月到货82%，3月上市前补齐',
    planOtbBudget: 3900000,
    orderDeadline: '2025-12-19',
    warehouseDeadline: '2026-02-17',
    status: 'approved',
  },
  {
    id: 'SS-2B',
    seasonCode: 'SS',
    seasonLabel: '春夏',
    waveCode: '2B',
    waveRole: 'main_sales',
    launchMonth: 4,
    launchDate: '2026-04-05',
    theme: '清明/五一预热',
    salesRatio: 0.22,
    planSalesAmount: 5200000,
    lySalesAmount: 4700000,
    momSalesAmount: 4900000,
    newProductRatio: 0.70,
    repeatOrderRatio: 0.20,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.82,
    plannedStyleCount: 30,
    targetColorCount: 3,
    targetSkuCount: 90,
    averageDepth: 760,
    mainCategory: '跑步/篮球',
    priceBandFocus: ['volume', 'profit'],
    productRoleFocus: ['main', 'hero'],
    arrivalMonth: 3,
    arrivalRateTarget: 0.85,
    arrivalSuggestion: '3月到货85%，五一前锁定陈列',
    planOtbBudget: 4300000,
    orderDeadline: '2026-01-19',
    warehouseDeadline: '2026-03-20',
    status: 'approved',
  },
  {
    id: 'SS-3A',
    seasonCode: 'SS',
    seasonLabel: '春夏',
    waveCode: '3A',
    waveRole: 'main_sales',
    launchMonth: 5,
    launchDate: '2026-05-05',
    theme: '五一/夏季主推',
    salesRatio: 0.20,
    planSalesAmount: 4800000,
    lySalesAmount: 4400000,
    momSalesAmount: 4550000,
    newProductRatio: 0.60,
    repeatOrderRatio: 0.28,
    carryoverRatio: 0.12,
    sellThroughTarget: 0.80,
    plannedStyleCount: 28,
    targetColorCount: 3,
    targetSkuCount: 84,
    averageDepth: 720,
    mainCategory: '凉拖/轻量跑步',
    priceBandFocus: ['entry', 'volume'],
    productRoleFocus: ['main', 'hero'],
    arrivalMonth: 4,
    arrivalRateTarget: 0.80,
    arrivalSuggestion: '4月到货80%，5月主推陈列',
    planOtbBudget: 3500000,
    orderDeadline: '2026-02-18',
    warehouseDeadline: '2026-04-19',
    status: 'approved',
  },
  {
    id: 'SS-3B',
    seasonCode: 'SS',
    seasonLabel: '春夏',
    waveCode: '3B',
    waveRole: 'repeat',
    launchMonth: 6,
    launchDate: '2026-06-05',
    theme: '618/夏促翻单',
    salesRatio: 0.16,
    planSalesAmount: 3800000,
    lySalesAmount: 3500000,
    momSalesAmount: 3600000,
    newProductRatio: 0.45,
    repeatOrderRatio: 0.40,
    carryoverRatio: 0.15,
    sellThroughTarget: 0.78,
    plannedStyleCount: 24,
    targetColorCount: 2,
    targetSkuCount: 48,
    averageDepth: 650,
    mainCategory: '凉拖/休闲',
    priceBandFocus: ['entry', 'volume'],
    productRoleFocus: ['repeat', 'clearance'],
    arrivalMonth: 5,
    arrivalRateTarget: 0.75,
    arrivalSuggestion: '5月到货75%，618前补强爆款深度',
    planOtbBudget: 2100000,
    orderDeadline: '2026-03-21',
    warehouseDeadline: '2026-05-20',
    status: 'draft',
  },
  {
    id: 'AW-4A',
    seasonCode: 'AW',
    seasonLabel: '秋冬',
    waveCode: '4A',
    waveRole: 'testing',
    launchMonth: 7,
    launchDate: '2026-07-05',
    theme: '秋季试销/开学预热',
    salesRatio: 0.10,
    planSalesAmount: 2600000,
    lySalesAmount: 2300000,
    momSalesAmount: 2400000,
    newProductRatio: 0.60,
    repeatOrderRatio: 0.30,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.78,
    plannedStyleCount: 22,
    targetColorCount: 2,
    targetSkuCount: 44,
    averageDepth: 600,
    mainCategory: '训练/户外',
    priceBandFocus: ['volume', 'profit'],
    productRoleFocus: ['test', 'main'],
    arrivalMonth: 6,
    arrivalRateTarget: 0.75,
    arrivalSuggestion: '6月到货75%，小批量测试秋季结构',
    planOtbBudget: 1900000,
    orderDeadline: '2026-04-21',
    warehouseDeadline: '2026-06-20',
    status: 'draft',
  },
  {
    id: 'AW-4B',
    seasonCode: 'AW',
    seasonLabel: '秋冬',
    waveCode: '4B',
    waveRole: 'main_sales',
    launchMonth: 8,
    launchDate: '2026-08-05',
    theme: '开学季/秋季主推',
    salesRatio: 0.16,
    planSalesAmount: 4100000,
    lySalesAmount: 3700000,
    momSalesAmount: 3900000,
    newProductRatio: 0.68,
    repeatOrderRatio: 0.22,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.80,
    plannedStyleCount: 28,
    targetColorCount: 2,
    targetSkuCount: 56,
    averageDepth: 720,
    mainCategory: '跑步/休闲',
    priceBandFocus: ['volume', 'profit'],
    productRoleFocus: ['main', 'hero'],
    arrivalMonth: 7,
    arrivalRateTarget: 0.80,
    arrivalSuggestion: '7月到货80%，8月开学季集中上架',
    planOtbBudget: 3400000,
    orderDeadline: '2026-05-21',
    warehouseDeadline: '2026-07-20',
    status: 'draft',
  },
  {
    id: 'AW-5A',
    seasonCode: 'AW',
    seasonLabel: '秋冬',
    waveCode: '5A',
    waveRole: 'main_sales',
    launchMonth: 9,
    launchDate: '2026-09-05',
    theme: '秋季上新/国庆预热',
    salesRatio: 0.18,
    planSalesAmount: 4600000,
    lySalesAmount: 4200000,
    momSalesAmount: 4400000,
    newProductRatio: 0.70,
    repeatOrderRatio: 0.20,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.82,
    plannedStyleCount: 30,
    targetColorCount: 3,
    targetSkuCount: 90,
    averageDepth: 780,
    mainCategory: '跑步/户外',
    priceBandFocus: ['volume', 'profit'],
    productRoleFocus: ['main', 'hero'],
    arrivalMonth: 8,
    arrivalRateTarget: 0.82,
    arrivalSuggestion: '8月到货82%，国庆前补齐主推',
    planOtbBudget: 3800000,
    orderDeadline: '2026-06-21',
    warehouseDeadline: '2026-08-20',
    status: 'draft',
  },
  {
    id: 'AW-5B',
    seasonCode: 'AW',
    seasonLabel: '秋冬',
    waveCode: '5B',
    waveRole: 'main_sales',
    launchMonth: 10,
    launchDate: '2026-10-05',
    theme: '国庆/双11预热',
    salesRatio: 0.20,
    planSalesAmount: 5200000,
    lySalesAmount: 4700000,
    momSalesAmount: 4900000,
    newProductRatio: 0.70,
    repeatOrderRatio: 0.20,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.83,
    plannedStyleCount: 32,
    targetColorCount: 3,
    targetSkuCount: 96,
    averageDepth: 840,
    mainCategory: '篮球/户外',
    priceBandFocus: ['profit', 'image'],
    productRoleFocus: ['main', 'hero'],
    arrivalMonth: 9,
    arrivalRateTarget: 0.85,
    arrivalSuggestion: '9月到货85%，双11前锁定深度',
    planOtbBudget: 4200000,
    orderDeadline: '2026-07-21',
    warehouseDeadline: '2026-09-19',
    status: 'draft',
  },
  {
    id: 'AW-6A',
    seasonCode: 'AW',
    seasonLabel: '秋冬',
    waveCode: '6A',
    waveRole: 'main_sales',
    launchMonth: 11,
    launchDate: '2026-11-05',
    theme: '双11/冬季主销',
    salesRatio: 0.24,
    planSalesAmount: 6200000,
    lySalesAmount: 5600000,
    momSalesAmount: 5900000,
    newProductRatio: 0.72,
    repeatOrderRatio: 0.18,
    carryoverRatio: 0.10,
    sellThroughTarget: 0.84,
    plannedStyleCount: 36,
    targetColorCount: 3,
    targetSkuCount: 108,
    averageDepth: 920,
    mainCategory: '保暖/篮球',
    priceBandFocus: ['profit', 'image'],
    productRoleFocus: ['hero', 'main'],
    arrivalMonth: 10,
    arrivalRateTarget: 0.86,
    arrivalSuggestion: '10月到货86%，双11前完成核心款铺货',
    planOtbBudget: 5100000,
    orderDeadline: '2026-08-21',
    warehouseDeadline: '2026-10-20',
    status: 'draft',
  },
  {
    id: 'AW-6B',
    seasonCode: 'AW',
    seasonLabel: '秋冬',
    waveCode: '6B',
    waveRole: 'clearance',
    launchMonth: 12,
    launchDate: '2026-12-05',
    theme: '双12/新年清尾',
    salesRatio: 0.12,
    planSalesAmount: 3100000,
    lySalesAmount: 2900000,
    momSalesAmount: 3000000,
    newProductRatio: 0.50,
    repeatOrderRatio: 0.32,
    carryoverRatio: 0.18,
    sellThroughTarget: 0.80,
    plannedStyleCount: 24,
    targetColorCount: 2,
    targetSkuCount: 48,
    averageDepth: 650,
    mainCategory: '保暖/休闲',
    priceBandFocus: ['entry', 'volume'],
    productRoleFocus: ['repeat', 'clearance'],
    arrivalMonth: 11,
    arrivalRateTarget: 0.78,
    arrivalSuggestion: '11月到货78%，12月控制新品深度并清尾',
    planOtbBudget: 1850000,
    orderDeadline: '2026-09-21',
    warehouseDeadline: '2026-11-20',
    status: 'draft',
  },
];

function waveKey(wave) {
  return `2026-${wave.seasonCode}-${wave.waveCode}`;
}

function resolveCategoryMeta(name) {
  return categoryMetaMap[name] || { categoryId: name, categoryName: name, categoryL3: name };
}

function splitCategories(wave) {
  const byCategoryId = new Map();
  wave.mainCategory.split('/').forEach((rawName) => {
    const sourceCategoryName = rawName.trim();
    const meta = resolveCategoryMeta(sourceCategoryName);
    const current = byCategoryId.get(meta.categoryId) || {
      ...meta,
      sourceCategoryNames: [],
    };
    current.sourceCategoryNames.push(sourceCategoryName);
    byCategoryId.set(meta.categoryId, current);
  });
  return [...byCategoryId.values()];
}

function roundMoney(value) {
  return Math.round(value / 1000) * 1000;
}

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00+08:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function splitRows(wave) {
  const categories = splitCategories(wave);
  const styleBase = Math.floor(wave.plannedStyleCount / categories.length);
  const styleRem = wave.plannedStyleCount - styleBase * categories.length;
  const skuBase = Math.floor(wave.targetSkuCount / categories.length);
  const skuRem = wave.targetSkuCount - skuBase * categories.length;

  return categories.map((category, index) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    categoryL3: category.categoryL3,
    sourceCategoryNames: category.sourceCategoryNames,
    plannedStyleCount: styleBase + (index < styleRem ? 1 : 0),
    plannedSkuCount: skuBase + (index < skuRem ? 1 : 0),
    salesShare: 1 / categories.length,
  }));
}

function resolvePrimaryCategoryPlanningMeta(wave) {
  const primaryCategory = splitCategories(wave)[0]?.categoryName;
  return categoryPlanningMeta[primaryCategory] || {
    designTheme: `${wave.theme}主题开发`,
    colorStrategy: '核心黑白灰配色 + 季节重点色',
    materialFocus: '鞋面、底材和舒适脚感围绕波段场景配置',
    marketingMoment: wave.theme,
    coreSizeRange: '女 35-39 / 男 39-44',
  };
}

const wavePlanMaster = waves.map((wave) => {
  const categories = splitRows(wave);
  const mainCategoryList = categories.map((category) => category.categoryName);

  return {
    waveKey: waveKey(wave),
    fiscalYear: 2026,
    seasonCode: wave.seasonCode,
    season: wave.seasonCode,
    seasonLabel: wave.seasonLabel,
    waveCode: wave.waveCode,
    wave: wave.waveCode,
    id: wave.id,
    waveRole: wave.waveRole,
    waveRoleLabel: roleLabel[wave.waveRole],
    launchMonth: wave.launchMonth,
    launchDate: wave.launchDate,
    launch_date: wave.launchDate,
    theme: wave.theme,
    promotion: wave.theme,
    salesRatio: wave.salesRatio,
    planSalesAmount: wave.planSalesAmount,
    lySalesAmount: wave.lySalesAmount,
    momSalesAmount: wave.momSalesAmount,
    newProductRatio: wave.newProductRatio,
    repeatOrderRatio: wave.repeatOrderRatio,
    carryoverRatio: wave.carryoverRatio,
    sellThroughTarget: wave.sellThroughTarget,
    plannedStyleCount: wave.plannedStyleCount,
    targetColorCount: wave.targetColorCount,
    targetSkuCount: wave.targetSkuCount,
    averageDepth: wave.averageDepth,
    plannedBuyUnits: wave.targetSkuCount * wave.averageDepth,
    mainCategory: mainCategoryList.join('、'),
    mainCategoryList,
    sourceCategoryText: wave.mainCategory,
    priceBandFocus: wave.priceBandFocus,
    productRoleFocus: wave.productRoleFocus,
    arrivalMonth: wave.arrivalMonth,
    arrivalRateTarget: wave.arrivalRateTarget,
    arrivalSuggestion: wave.arrivalSuggestion,
    planOtbBudget: wave.planOtbBudget,
    orderDeadline: wave.orderDeadline,
    warehouseDeadline: wave.warehouseDeadline,
    status: wave.status,
    owner: '商品企划',
    sourceSystem: 'planning_mock',
    version: 'plan_2026_v1',
    updatedAt: '2026-05-10T00:00:00+08:00',
  };
});

const waveCategoryMix = waves.flatMap((wave) => splitRows(wave).map((category) => ({
  waveKey: waveKey(wave),
  fiscalYear: 2026,
  seasonCode: wave.seasonCode,
  waveCode: wave.waveCode,
  categoryId: category.categoryId,
  categoryName: category.categoryName,
  categoryL3: category.categoryL3,
  sourceCategoryNames: category.sourceCategoryNames,
  plannedStyleCount: category.plannedStyleCount,
  plannedSkuCount: category.plannedSkuCount,
  salesShare: Number(category.salesShare.toFixed(4)),
  plannedSalesAmount: roundMoney(wave.planSalesAmount * category.salesShare),
  plannedOtbBudget: roundMoney(wave.planOtbBudget * category.salesShare),
  averageDepth: wave.averageDepth,
  sellThroughTarget: wave.sellThroughTarget,
  priceBandFocus: wave.priceBandFocus,
  productRoleFocus: wave.productRoleFocus,
  owner: '商品企划',
  version: 'plan_2026_v1',
})));

const wavePlanBrief = waves.map((wave) => {
  const roleMeta = rolePlanningMeta[wave.waveRole];
  const categoryMeta = resolvePrimaryCategoryPlanningMeta(wave);
  const categories = splitCategories(wave).map((category) => category.categoryName).join('、');

  return {
    waveKey: waveKey(wave),
    consumerScene: `${wave.theme}，${roleMeta.consumerScene}`,
    targetAudience: roleMeta.targetAudience,
    channelFocus: roleMeta.channelFocus.join(' + '),
    designTheme: categoryMeta.designTheme,
    colorStrategy: categoryMeta.colorStrategy,
    materialFocus: categoryMeta.materialFocus,
    marketingMoment: categoryMeta.marketingMoment,
    coreSizeRange: categoryMeta.coreSizeRange,
    planningNotes: `${roleMeta.planningNotes} 主推品类：${categories}；到货策略：${wave.arrivalSuggestion}`,
    owner: '商品企划',
    version: 'plan_2026_v1',
    updatedAt: '2026-05-10T00:00:00+08:00',
  };
});

const salesForecastPlan = waves.flatMap((wave) => splitRows(wave).flatMap((category) => channels.map((channel) => {
  const amount = roundMoney(wave.planSalesAmount * category.salesShare * channel.share);
  const avgSellingPrice = wave.priceBandFocus.includes('image') ? 520 : wave.priceBandFocus.includes('profit') ? 430 : 330;

  return {
    forecastVersion: 'forecast_2026_base_v1',
    scenario: 'base',
    fiscalYear: 2026,
    month: wave.launchMonth,
    waveKey: waveKey(wave),
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    categoryL3: category.categoryL3,
    sourceCategoryNames: category.sourceCategoryNames,
    channelId: channel.channelId,
    channelName: channel.channelName,
    forecastSalesAmount: amount,
    forecastUnits: Math.round(amount / avgSellingPrice),
    avgSellingPrice,
    grossMarginRate: wave.priceBandFocus.includes('entry') ? 0.48 : wave.priceBandFocus.includes('image') ? 0.60 : 0.54,
    source: 'mock_wave_plan',
    status: wave.status === 'approved' ? 'locked' : 'draft',
  };
})));

const salesForecastChannelDriver = [
  {
    region: '华东',
    avgMonthlyTempC: [6, 9, 13, 19, 24, 27, 30, 30, 26, 21, 14, 8],
    mainCategoryByMonth: ['棉鞋/靴', '棉鞋/靴', '休闲/板鞋', '休闲/板鞋', '运动/凉鞋', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '休闲/板鞋', '秋靴/休闲', '棉鞋/靴', '棉鞋/靴'],
    forecastMonthlyCny: [2850000, 2200000, 3100000, 3400000, 3800000, 4200000, 3900000, 3700000, 4100000, 4500000, 3600000, 3200000],
    tempMatchStatus: ['匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配'],
    storeCountComparable: 28,
    storeCountTotal: 32,
    adjustmentSuggestion: '华东3月气温回暖快，凉鞋可提前2周上市',
  },
  {
    region: '华南',
    avgMonthlyTempC: [14, 17, 21, 26, 28, 30, 31, 31, 29, 26, 21, 15],
    mainCategoryByMonth: ['休闲/运动', '休闲/运动', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '休闲/板鞋', '休闲/板鞋', '休闲/运动'],
    forecastMonthlyCny: [3200000, 3100000, 4200000, 4600000, 5100000, 5400000, 5200000, 5000000, 4900000, 4400000, 3800000, 3500000],
    tempMatchStatus: ['匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配'],
    storeCountComparable: 42,
    storeCountTotal: 48,
    adjustmentSuggestion: '华南全年气温高，凉鞋销售周期长，冬季厚底鞋应控制深度',
  },
  {
    region: '华北',
    avgMonthlyTempC: [-1, 2, 8, 16, 22, 27, 29, 28, 23, 16, 7, 0],
    mainCategoryByMonth: ['棉鞋/雪地靴', '棉鞋/靴', '休闲/板鞋', '休闲/运动', '运动/跑步', '运动/凉鞋', '凉鞋/运动', '凉鞋/运动', '秋靴/休闲', '秋靴/棉鞋', '棉鞋/靴', '棉鞋/雪地靴'],
    forecastMonthlyCny: [2400000, 1900000, 2700000, 3100000, 3500000, 3800000, 3600000, 3400000, 3800000, 4200000, 3300000, 2800000],
    tempMatchStatus: ['匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '偏晚', '匹配', '匹配'],
    storeCountComparable: 35,
    storeCountTotal: 40,
    adjustmentSuggestion: '华北10月气温骤降，秋靴/棉鞋建议提前4-6周备货',
  },
  {
    region: '西南',
    avgMonthlyTempC: [9, 12, 16, 21, 22, 24, 25, 25, 22, 19, 14, 9],
    mainCategoryByMonth: ['棉鞋/休闲', '休闲/板鞋', '休闲/板鞋', '运动/凉鞋', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '凉鞋/运动', '休闲/板鞋', '秋靴/休闲', '棉鞋/休闲', '棉鞋/休闲'],
    forecastMonthlyCny: [2100000, 2000000, 2500000, 2800000, 3100000, 3400000, 3300000, 3200000, 3100000, 3300000, 2600000, 2200000],
    tempMatchStatus: ['匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配'],
    storeCountComparable: 20,
    storeCountTotal: 22,
    adjustmentSuggestion: '西南气候温和，季节转换节奏居中，与全国节奏基本匹配',
  },
  {
    region: '东北',
    avgMonthlyTempC: [-13, -9, 0, 10, 18, 23, 25, 24, 17, 9, -1, -10],
    mainCategoryByMonth: ['棉鞋/雪地靴', '棉鞋/雪地靴', '棉鞋/春靴', '休闲/板鞋', '运动/跑步', '运动/凉鞋', '凉鞋/运动', '运动/跑步', '秋靴/休闲', '棉鞋/靴', '棉鞋/雪地靴', '棉鞋/雪地靴'],
    forecastMonthlyCny: [1400000, 1200000, 1600000, 1900000, 2100000, 2300000, 2200000, 2100000, 2400000, 2600000, 2000000, 1600000],
    tempMatchStatus: ['匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '匹配', '偏晚', '偏早', '匹配', '匹配'],
    storeCountComparable: 12,
    storeCountTotal: 14,
    adjustmentSuggestion: '东北秋冬来得早，秋靴9月即可上市，棉鞋10月开始备货',
  },
].map((row) => ({
  forecastVersion: 'forecast_2026_base_v1',
  scenario: 'base',
  channelType: 'physical',
  ...row,
}));

const salesForecastStoreGrade = [
  ['S', 'S级旗舰', 8, 680000, 0.28, 0.12, 320, 12000, 0.18, 315, 1.6, ''],
  ['A', 'A级标准', 42, 310000, 0.36, 0.08, 160, 6500, 0.16, 298, 1.5, ''],
  ['B', 'B级社区', 78, 145000, 0.22, 0.03, 100, 3800, 0.14, 272, 1.4, '社区店客流下滑，建议评估关店改址'],
  ['C', 'C级县级', 35, 72000, 0.09, -0.05, 72, 2200, 0.12, 273, 1.3, 'YoY负增长，需评估缩店或调整货盘结构'],
  ['outlet', '奥莱/特渠', 22, 95000, 0.05, 0.15, 120, 5000, 0.10, 190, 1.8, '折扣深，毛利率低，关注清货效率而非销售增长'],
].map(([storeGrade, gradeLabel, storeCount, salesPerStoreMonthlyCny, shareOfChannel, yoyGrowth, avgStoreSqm, monthlyTraffic, conversionRate, avgTransactionValue, pairsPerOrder, riskNote]) => ({
  forecastVersion: 'forecast_2026_base_v1',
  scenario: 'base',
  channelType: 'physical',
  storeGrade,
  gradeLabel,
  storeCount,
  salesPerStoreMonthlyCny,
  forecastAnnualCny: storeCount * salesPerStoreMonthlyCny * 12,
  shareOfChannel,
  yoyGrowth,
  avgStoreSqm,
  salesPerSqmMonthly: Math.round(salesPerStoreMonthlyCny / avgStoreSqm),
  monthlyTraffic,
  conversionRate,
  avgTransactionValue,
  pairsPerOrder,
  riskNote,
}));

const ecommerceFunnelInputs = [
  [1, 12000000, 480000, 0.08, 0.032, 315, 0.22, 0.08, 0.46, ''],
  [2, 10500000, 420000, 0.07, 0.029, 320, 0.20, 0.07, 0.46, ''],
  [3, 16000000, 640000, 0.10, 0.038, 299, 0.25, 0.12, 0.44, '38节大促'],
  [4, 13000000, 520000, 0.08, 0.033, 310, 0.22, 0.08, 0.46, ''],
  [5, 18000000, 720000, 0.11, 0.042, 305, 0.26, 0.13, 0.43, '518/51大促'],
  [6, 24000000, 960000, 0.13, 0.050, 289, 0.28, 0.15, 0.41, '618年中大促'],
  [7, 14000000, 560000, 0.09, 0.035, 275, 0.23, 0.09, 0.45, '暑期大促'],
  [8, 13500000, 540000, 0.08, 0.033, 280, 0.22, 0.08, 0.46, ''],
  [9, 16500000, 660000, 0.10, 0.040, 345, 0.24, 0.11, 0.47, '99大促秋季上新'],
  [10, 15000000, 600000, 0.09, 0.036, 360, 0.22, 0.09, 0.48, ''],
  [11, 38000000, 1520000, 0.16, 0.062, 278, 0.32, 0.18, 0.38, '双11年度最大大促'],
  [12, 20000000, 800000, 0.12, 0.048, 320, 0.26, 0.13, 0.44, '双12/年货节'],
];

const salesForecastEcommerceFunnel = ecommerceFunnelInputs.map(([month, impressions, visitors, addToCartRate, conversionRate, avgOrderValue, refundRate, adCostRate, grossMarginRate, campaignNote]) => {
  const grossGmvCny = Math.round(visitors * conversionRate * avgOrderValue);

  return {
    forecastVersion: 'forecast_2026_base_v1',
    scenario: 'base',
    channelType: 'ecommerce',
    month,
    monthLabel: `${month}月`,
    platform: 'all',
    impressions,
    visitors,
    addToCartRate,
    conversionRate,
    avgOrderValue,
    grossGmvCny,
    refundRate,
    netSalesCny: Math.round(grossGmvCny * (1 - refundRate)),
    adCostRate,
    platformFeeRate: 0.05,
    logisticsCostRate: 0.04,
    grossMarginRate,
    ...(campaignNote ? { campaignNote } : {}),
  };
});

const salesForecastCampaignCalendar = [
  ['38节', 3, 7500000, 0.82, 900000, '2026-SS-2A', '休闲/板鞋', 3.2, 'low', '上新节点配合春季上新'],
  ['51黄金周', 5, 9500000, 0.78, 1200000, '2026-SS-3A', '运动/跑步', 2.9, 'medium', '需提前2周备好库存'],
  ['618年中大促', 6, 14000000, 0.72, 2100000, '2026-SS-3B', '全品类', 2.6, 'high', '全年第二大节点，退货率偏高，需专项管控'],
  ['暑期大促', 7, 5500000, 0.85, 500000, '2026-AW-4A', '凉鞋/运动', 3.5, 'low', '凉鞋清货+AW新品预热'],
  ['99大促', 9, 9200000, 0.80, 1000000, '2026-AW-5A', '秋冬靴/运动', 3.1, 'medium', '秋冬新品首发节点'],
  ['双11', 11, 27000000, 0.68, 4800000, '2026-AW-6A', '全品类', 2.3, 'high', '全年最大节点，退货率最高，需要尺码备货充足'],
  ['双12/年货节', 12, 12500000, 0.74, 1600000, '2026-AW-6B', '棉鞋/靴/礼品', 2.8, 'medium', '节日礼品属性强，客单价偏高'],
].map(([campaignName, month, targetGmvCny, discountRate, adBudgetCny, linkedWaveKey, mainCategory, expectedRoi, inventoryRisk, note]) => ({
  forecastVersion: 'forecast_2026_base_v1',
  scenario: 'base',
  channelType: 'ecommerce',
  campaignName,
  month,
  monthLabel: `${month}月`,
  targetGmvCny,
  discountRate,
  adBudgetCny,
  waveKey: linkedWaveKey,
  mainCategory,
  expectedRoi,
  inventoryRisk,
  note,
}));

const salesForecastNewStorePlan = [
  ['2026-03', 'NS-2026-01', '深圳宝安万象汇', 'standard_a', 'A级标准店', 'tier1', '一线城市', 160, 480000, 120, 80000, 6, 310000, [0.42, 0.58, 0.72, 0.82, 0.88, 0.95, 1, 1, 1, 1, 1, 1], 140000, 2650000, 0.55, 0.35, 0.10, 0.92, 14],
  ['2026-04', 'NS-2026-02', '成都春熙路IFS', 'flagship_s', 'S级旗舰店', 'tier1', '一线城市', 320, 960000, 240, 180000, 4, 680000, [0.45, 0.62, 0.78, 0.90, 1, 1, 1, 1, 1, 1, 1, 1], 260000, 6820000, 0.60, 0.28, 0.12, 0.95, 10],
  ['2026-06', 'NS-2026-03', '西安大融城', 'standard_a', 'A级标准店', 'tier2', '二线城市', 140, 390000, 100, 60000, 6, 260000, [0.40, 0.55, 0.68, 0.78, 0.86, 0.92, 0.98, 1, 1, 1, 1, 1], 110000, 1980000, 0.50, 0.40, 0.10, 0.88, 18],
  ['2026-09', 'NS-2026-04', '长沙五一广场', 'standard_b', 'B级社区店', 'tier2', '二线城市', 100, 260000, 80, 40000, 6, 145000, [0.38, 0.52, 0.65, 0.75, 0.84, 0.92, 0.97, 1, 1, 1, 1, 1], 65000, 1040000, 0.45, 0.45, 0.10, 0.85, 21],
].map(([storeOpenMonth, storeId, storeName, storeType, storeTypeLabel, cityTier, cityTierLabel, storeAreaSqm, firstBatchBudgetCny, firstBatchSkuCount, openingEventBudgetCny, rampPeriodMonths, matureStoreMonthlySalesCny, rampCurve, breakEvenMonthlySalesCny, targetYear1AnnualCny, firstBatchNewStylePct, firstBatchBasicPct, firstBatchImagePct, sizeCompletenessRate, replenishmentCycleDays]) => ({
  forecastVersion: 'forecast_2026_base_v1',
  scenario: 'base',
  channelType: 'new_store',
  storeOpenMonth,
  storeId,
  storeName,
  storeType,
  storeTypeLabel,
  cityTier,
  cityTierLabel,
  storeAreaSqm,
  firstBatchBudgetCny,
  firstBatchSkuCount,
  openingEventBudgetCny,
  rampPeriodMonths,
  matureStoreMonthlySalesCny,
  rampCurve,
  breakEvenMonthlySalesCny,
  targetYear1AnnualCny,
  firstBatchNewStylePct,
  firstBatchBasicPct,
  firstBatchImagePct,
  sizeCompletenessRate,
  replenishmentCycleDays,
}));

const salesForecastSizeCurve = [
  {
    waveKey: '2026-SS-2A',
    waveLabel: 'SS 26 2A',
    categoryId: '运动/跑步',
    sizeSegment: 'mens_sport',
    sizes: [
      ['38', 'edge', 120, 0.045, 0.03],
      ['39', 'extended', 380, 0.140, 0.12],
      ['40', 'core', 620, 0.228, 0.22],
      ['41', 'core', 680, 0.250, 0.25],
      ['42', 'core', 580, 0.213, 0.22],
      ['43', 'extended', 280, 0.103, 0.12],
      ['44', 'edge', 60, 0.022, 0.03],
    ],
    coreSizeCoverageRate: 0.691,
    edgeSizeOverweightRisk: true,
    breakSizeRisk: false,
    riskNote: '38码库存备货超标25%，建议压缩',
    action: '减少38码备货量，将余量转移至42-43码',
  },
  {
    waveKey: '2026-SS-2A',
    waveLabel: 'SS 26 2A',
    categoryId: '女鞋/凉鞋',
    sizeSegment: 'womens_sport',
    sizes: [
      ['34', 'edge', 80, 0.040, 0.03],
      ['35', 'extended', 240, 0.120, 0.12],
      ['36', 'core', 460, 0.230, 0.23],
      ['37', 'core', 480, 0.240, 0.25],
      ['38', 'core', 440, 0.220, 0.22],
      ['39', 'extended', 200, 0.100, 0.12],
      ['40', 'edge', 100, 0.050, 0.03],
    ],
    coreSizeCoverageRate: 0.690,
    edgeSizeOverweightRisk: true,
    breakSizeRisk: false,
    riskNote: '40码女鞋超备，建议限量；39码偏少可能断码',
    action: '39码补货20%，40码减少备货',
  },
  {
    waveKey: '2026-AW-6A',
    waveLabel: 'AW 26 6A',
    categoryId: '棉鞋/靴',
    sizeSegment: 'mens_sport',
    sizes: [
      ['39', 'extended', 320, 0.105, 0.12],
      ['40', 'core', 620, 0.204, 0.22],
      ['41', 'core', 780, 0.257, 0.25],
      ['42', 'core', 720, 0.237, 0.22],
      ['43', 'extended', 440, 0.145, 0.12],
      ['44', 'edge', 160, 0.053, 0.04],
    ],
    coreSizeCoverageRate: 0.698,
    edgeSizeOverweightRisk: false,
    breakSizeRisk: true,
    riskNote: '40码偏少，可能出现断码风险',
    action: '40码追加备货15%，同时关注双11备货节点',
  },
].map((row) => ({
  forecastVersion: 'forecast_2026_base_v1',
  scenario: 'base',
  channelType: 'all',
  ...row,
  sizes: row.sizes.map(([size, tier, forecastUnits, stockRatio, targetRatio]) => ({
    size,
    tier,
    forecastUnits,
    stockRatio,
    targetRatio,
    deviation: Number((stockRatio - targetRatio).toFixed(3)),
  })),
}));

const otbBudgetPlan = waves.flatMap((wave) => splitRows(wave).map((category) => {
  const planned = roundMoney(wave.planOtbBudget * category.salesShare);

  return {
    otbVersion: 'approved_2026_v1',
    fiscalYear: 2026,
    waveKey: waveKey(wave),
    seasonCode: wave.seasonCode,
    waveCode: wave.waveCode,
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    categoryL3: category.categoryL3,
    sourceCategoryNames: category.sourceCategoryNames,
    plannedPurchaseAmount: planned,
    approvedPurchaseAmount: wave.status === 'approved' ? planned : roundMoney(planned * 0.95),
    budgetDiffAmount: wave.status === 'approved' ? 0 : roundMoney(planned * -0.05),
    sellThroughTarget: wave.sellThroughTarget,
    arrivalRateTarget: wave.arrivalRateTarget,
    plannedBuyUnits: Math.round(category.plannedSkuCount * wave.averageDepth),
    status: wave.status === 'approved' ? 'approved' : 'draft',
    owner: '商品计划',
  };
}));

const purchasePaymentPlan = waves.flatMap((wave) => [
  {
    paymentPlanId: `${waveKey(wave)}-deposit`,
    waveKey: waveKey(wave),
    supplierGroup: '核心供应商',
    paymentNode: 'deposit',
    paymentNodeLabel: '定金',
    paymentRatio: 0.30,
    paymentAmount: roundMoney(wave.planOtbBudget * 0.30),
    paymentMonth: ((wave.launchMonth - 3 - 1 + 12) % 12) + 1,
    paymentDate: wave.orderDeadline,
    sourceBudgetVersion: 'approved_2026_v1',
    status: wave.status === 'approved' ? 'confirmed' : 'planned',
  },
  {
    paymentPlanId: `${waveKey(wave)}-balance`,
    waveKey: waveKey(wave),
    supplierGroup: '核心供应商',
    paymentNode: 'balance',
    paymentNodeLabel: '尾款',
    paymentRatio: 0.70,
    paymentAmount: roundMoney(wave.planOtbBudget * 0.70),
    paymentMonth: ((wave.launchMonth - 1 - 1 + 12) % 12) + 1,
    paymentDate: wave.warehouseDeadline,
    sourceBudgetVersion: 'approved_2026_v1',
    status: wave.status === 'approved' ? 'confirmed' : 'planned',
  },
]);

const inventoryTargetPlan = waves.flatMap((wave) => splitRows(wave).flatMap((category) => channels.map((channel) => {
  const baseWos = wave.waveRole === 'traffic' ? 5 : wave.waveRole === 'clearance' ? 4 : wave.waveRole === 'testing' ? 6 : 7;
  const forecast = salesForecastPlan.find((row) =>
    row.waveKey === waveKey(wave) && row.categoryId === category.categoryId && row.channelId === channel.channelId
  );
  const weeklyUnits = Math.max(1, Math.round((forecast?.forecastUnits || 0) / 8));

  return {
    targetVersion: 'inventory_2026_v1',
    fiscalYear: 2026,
    waveKey: waveKey(wave),
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    categoryL3: category.categoryL3,
    sourceCategoryNames: category.sourceCategoryNames,
    channelId: channel.channelId,
    channelName: channel.channelName,
    targetWos: baseWos,
    targetEndingInventoryUnits: weeklyUnits * baseWos,
    maxWos: baseWos + 4,
    minWos: Math.max(3, baseWos - 2),
    clearanceAction: wave.waveRole === 'clearance' ? '清尾控深' : wave.waveRole === 'repeat' ? '翻单后滚动清理尾货' : '常规监控',
    replenishmentAction: wave.waveRole === 'main_sales' ? '主推款优先补货' : '按周观察',
    owner: '库存计划',
  };
})));

const businessDate = '2026-05-11';

function diffDays(date, baseDate = businessDate) {
  const d = new Date(`${date}T00:00:00+08:00`);
  const b = new Date(`${baseDate}T00:00:00+08:00`);
  return Math.round((d.getTime() - b.getTime()) / 86400000);
}

function resolveDevTaskState(wave, taskType, deadline) {
  const days = diffDays(deadline);
  if (wave.status === 'approved' && taskType !== 'review') {
    return { status: 'done', progress: 100 };
  }
  if (days < 0) {
    return taskType === 'review'
      ? { status: 'done', progress: 100 }
      : { status: 'at_risk', progress: taskType === 'order' ? 30 : 60 };
  }
  if (days <= 14) return { status: 'at_risk', progress: 60 };
  if (days <= 45) return { status: 'in_progress', progress: 60 };
  return { status: 'pending', progress: 0 };
}

const devTaskTemplates = [
  { taskType: 'brief', label: '企划确认', resolveDeadline: (wave) => addDays(wave.launchDate, -160), owner: '商品企划' },
  { taskType: 'design', label: '设计稿', resolveDeadline: (wave) => addDays(wave.launchDate, -130), owner: '设计' },
  { taskType: 'sample', label: '样品评审', resolveDeadline: (wave) => addDays(wave.launchDate, -110), owner: '商品企划/设计' },
  { taskType: 'cost', label: '成本核价', resolveDeadline: (wave) => addDays(wave.launchDate, -95), owner: '采购' },
  { taskType: 'order', label: '下单截止', resolveDeadline: (wave) => wave.orderDeadline, owner: '采购' },
  { taskType: 'warehouse', label: '入仓截止', resolveDeadline: (wave) => wave.warehouseDeadline, owner: '物流' },
  { taskType: 'launch', label: '上市日', resolveDeadline: (wave) => wave.launchDate, owner: '运营' },
  { taskType: 'review', label: '复盘日', resolveDeadline: (wave) => addDays(wave.launchDate, 30), owner: '商品企划' },
];

const waveDevelopmentProgress = waves.map((wave) => ({
  waveKey: waveKey(wave),
  tasks: devTaskTemplates.map((template) => {
    const deadline = template.resolveDeadline(wave);
    const state = resolveDevTaskState(wave, template.taskType, deadline);

    return {
      taskType: template.taskType,
      label: template.label,
      deadline,
      status: state.status,
      progress: state.progress,
      owner: template.owner,
      ...(state.status === 'at_risk'
        ? { riskNote: `截止日${deadline}，距业务日期${businessDate}还有${diffDays(deadline)}天，需跟进${template.label}进度` }
        : {}),
    };
  }),
}));

const taskTemplates = [
  { code: 'design', label: '设计开发', offset: -120, owner: '设计/商品企划' },
  { code: 'pricing', label: '核价确认', offset: -80, owner: '商品计划/财务' },
  { code: 'budget_approval', label: '预算审批', offset: -78, owner: '商品计划' },
  { code: 'purchase_order', label: '采购下单', offset: -75, owner: '采购' },
  { code: 'warehouse_inbound', label: '入仓履约', offset: -15, owner: '供应链/WMS' },
];

const feishuWorkflowTasks = waves.flatMap((wave) => taskTemplates.map((task, index) => {
  const dueDate = task.code === 'purchase_order'
    ? wave.orderDeadline
    : task.code === 'warehouse_inbound'
      ? wave.warehouseDeadline
      : addDays(wave.launchDate, task.offset);
  const approved = wave.status === 'approved';

  return {
    taskId: `${waveKey(wave)}-${task.code}`,
    sourceSystem: 'feishu_mock',
    sourceRecordId: `mock-${waveKey(wave)}-${index + 1}`,
    waveKey: waveKey(wave),
    sourceTab: task.code === 'budget_approval' ? 'otb' : 'planning',
    taskCode: task.code,
    taskName: task.label,
    owner: task.owner,
    taskStatus: approved ? 'done' : index <= 1 ? 'in_progress' : 'todo',
    progressRate: approved ? 1 : index <= 1 ? 0.6 : 0,
    dueDate,
    updatedAt: '2026-05-10T00:00:00+08:00',
    riskLevel: approved ? 'normal' : index >= 3 && wave.launchMonth <= 7 ? 'warning' : 'normal',
  };
}));

function readExistingPlanningJson(filename) {
  const filePath = path.join(outDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing planning mock data seed: ${filename}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const pnlBrandAnnual = readExistingPlanningJson('pnl_brand_annual.json');
const pnlChannelContribution = readExistingPlanningJson('pnl_channel_contribution.json');
const pnlCategoryContribution = readExistingPlanningJson('pnl_category_contribution.json');
const pnlDiscountErosion = readExistingPlanningJson('pnl_discount_erosion.json');
const pnlStoreModelAssumptions = readExistingPlanningJson('pnl_store_model_assumptions.json');

const readme = `# planning 模拟业务数据

这些 JSON 是当前项目的统一虚拟业务数据层，用来模拟后续真实业务接入后的表结构。

- wave_plan_master.json：波段企划总表，所有页面统一使用 waveKey。
- wave_plan_brief.json：波段企划 Brief，维护场景、客群、渠道、设计和尺码策略。
- wave_development_progress.json：波段开发进度闸口，模拟飞书/PLM节点状态。
- wave_category_mix.json：波段 x 品类结构。
- sales_forecast_plan.json：销售预测计划，按波段/品类/渠道。
- sales_forecast_channel_driver.json：销售预测区域气候驱动，按区域校验实体店季节节奏。
- sales_forecast_store_grade.json：销售预测门店等级，按店效、坪效、客流和转化拆解实体店目标。
- sales_forecast_ecommerce_funnel.json：销售预测电商漏斗，按曝光、访客、转化、客单和退款拆解GMV。
- sales_forecast_campaign_calendar.json：销售预测活动日历，绑定大促、折扣、投放和承接波段。
- sales_forecast_new_store_plan.json：销售预测新店爬坡，维护新店首批货、开业投入和成熟曲线。
- sales_forecast_size_curve.json：销售预测尺码曲线，校验核心码覆盖、边缘码超备和断码风险。
- otb_budget_plan.json：OTB预算计划，按版本/波段/品类。
- purchase_payment_plan.json：采购付款排期，供现金流读取。
- inventory_target_plan.json：库存健康目标，反向约束企划和OTB。
- feishu_workflow_tasks.json：飞书任务进度模拟表。

真实接入时优先替换这些表的数据源，而不是让各页面分散读取企业系统。
`;

const pnlReadmeAppendix = `
- pnl_brand_annual.json：品牌年度总 P&L，承接净收入、毛利、费用、EBIT、净利润和月度趋势。
- pnl_channel_contribution.json：渠道贡献利润，拆解实体店、电商、新店、加盟等渠道真实利润质量。
- pnl_category_contribution.json：品类贡献利润，支撑鞋类品类结构、毛利和费用分摊判断。
- pnl_discount_erosion.json：折扣侵蚀，量化正价、活动折扣、清货折扣对毛利的影响。
- pnl_store_model_assumptions.json：单店损益模型假设，维护客流、转化、租金、物业、押金和开店投入。
`;

const files = {
  'wave_plan_master.json': wavePlanMaster,
  'wave_plan_brief.json': wavePlanBrief,
  'wave_development_progress.json': waveDevelopmentProgress,
  'wave_category_mix.json': waveCategoryMix,
  'sales_forecast_plan.json': salesForecastPlan,
  'sales_forecast_channel_driver.json': salesForecastChannelDriver,
  'sales_forecast_store_grade.json': salesForecastStoreGrade,
  'sales_forecast_ecommerce_funnel.json': salesForecastEcommerceFunnel,
  'sales_forecast_campaign_calendar.json': salesForecastCampaignCalendar,
  'sales_forecast_new_store_plan.json': salesForecastNewStorePlan,
  'sales_forecast_size_curve.json': salesForecastSizeCurve,
  'pnl_brand_annual.json': pnlBrandAnnual,
  'pnl_channel_contribution.json': pnlChannelContribution,
  'pnl_category_contribution.json': pnlCategoryContribution,
  'pnl_discount_erosion.json': pnlDiscountErosion,
  'pnl_store_model_assumptions.json': pnlStoreModelAssumptions,
  'otb_budget_plan.json': otbBudgetPlan,
  'purchase_payment_plan.json': purchasePaymentPlan,
  'inventory_target_plan.json': inventoryTargetPlan,
  'feishu_workflow_tasks.json': feishuWorkflowTasks,
};

for (const [filename, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, filename), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

fs.writeFileSync(path.join(outDir, 'README.md'), `${readme}\n${pnlReadmeAppendix}`, 'utf8');
console.log(`generated ${Object.keys(files).length + 1} files in ${outDir}`);
