import { ARCHITECTURE_ROLE_LABELS, DEVELOPMENT_LEVEL_LABELS } from '@/config/design-review-center/labels';
import { getArchitectureProfile, ARCHITECTURE_PROFILES } from '@/config/design-review-center/architecture-profiles';
import { uniqueValues } from '@/lib/design-review-center/helpers/date';
import { resolveSeriesThemeHex } from '@/lib/design-review-center/helpers/palette';
import { getArchitectureDimensionResolver } from '@/lib/design-review-center/selectors/architecture-resolvers';
import type {
  ArchitectureCountItem,
  ArchitectureDimensionConfig,
  ArchitectureProfile,
  ArchitectureRoleKey,
  ArchitectureSummary,
  CategoryPlan,
  OTBStructure,
  ProductArchitectureInput,
  ProductArchitectureView,
  Project,
  Series,
  StyleDevelopment,
  Wave,
} from '@/lib/design-review-center/types';

interface BuildProductArchitectureParams {
  otbStructures: OTBStructure[];
  projects: Project[];
  waves: Wave[];
  series: Series[];
  categoryPlans: CategoryPlan[];
  styles: StyleDevelopment[];
}

export interface ProductArchitectureComputation {
  view: ProductArchitectureView;
  byCategoryPlanId: Record<string, ProductArchitectureInput>;
  bySeriesCategory: Record<string, ProductArchitectureInput>;
}

const CATEGORY_PRESETS: Array<{
  match: string[];
  structures: string[];
  soles: string[];
  heels: string[];
  lasts: string[];
}> = [
  {
    match: ['乐福'],
    structures: ['浅口', '一脚蹬', '单鞋结构'],
    soles: ['乐福大底', '平底片底'],
    heels: ['平底跟', '2CM轻量低跟', '马蹄跟'],
    lasts: ['圆头', '杏仁头', '舒适楦'],
  },
  {
    match: ['德比'],
    structures: ['浅口', '系带', '单鞋结构'],
    soles: ['商务轻量底', '注塑底'],
    heels: ['德比低跟', '3CM内增高跟', '男士平跟'],
    lasts: ['圆头', '方头', '修长楦'],
  },
  {
    match: ['徒步', '户外', '机能'],
    structures: ['低帮', '系带', '包头'],
    soles: ['防滑橡胶底', '户外大底', '全掌防滑'],
    heels: ['平底无独立跟', '厚底减震跟'],
    lasts: ['宽楦', '圆头', '前掌滚动楦'],
  },
  {
    match: ['板鞋', '德训'],
    structures: ['低帮', '系带', '包头'],
    soles: ['cupsole大底', '德训生胶底'],
    heels: ['平底无独立跟'],
    lasts: ['圆头', '宽楦', '基础板鞋楦'],
  },
  {
    match: ['凉鞋'],
    structures: ['露趾', '搭扣', '露跟'],
    soles: ['凉鞋底', '轻量EVA底'],
    heels: ['5CM细跟', '平底', '3CM粗跟', '坡跟'],
    lasts: ['圆头', '宽楦', '方头'],
  },
  {
    match: ['短靴', '长靴', '靴'],
    structures: ['深口', '拉链', '靴型结构'],
    soles: ['防滑靴底', '防冻大底'],
    heels: ['6CM细高跟', '3CM粗跟', '猫跟', '平底'],
    lasts: ['方头', '圆头', '尖头', '修长窄楦'],
  },
  {
    match: ['高跟', '单鞋', '玛丽珍', '时装'],
    structures: ['浅口', '一字扣', '丁字带', '穆勒拖'],
    soles: ['真皮大底', '注塑底', '橡胶片底'],
    heels: ['8CM细高跟', '5CM猫跟', '异形跟', '防水台粗跟'],
    lasts: ['尖头', '小方头', '小圆头', '时装楦'],
  },
  {
    match: ['休闲'],
    structures: ['低帮', '系带', '浅口'],
    soles: ['超临界发泡', '厚底老爹底', '运动发泡底'],
    heels: ['平底无独立跟', '内增高跟'],
    lasts: ['圆头', '宽楦', '舒适楦'],
  },
];

function sum(values: number[]) {
  return values.reduce((total, current) => total + current, 0);
}

function roundRate(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getCategoryPreset(categoryName: string) {
  return CATEGORY_PRESETS.find((preset) => preset.match.some((keyword) => categoryName.includes(keyword))) ?? CATEGORY_PRESETS[CATEGORY_PRESETS.length - 1];
}

function buildDistributionMap(labels: string[], total: number) {
  const safeTotal = Math.max(0, total);
  const seed = labels.reduce<Record<string, number>>((accumulator, label) => {
    accumulator[label] = 0;
    return accumulator;
  }, {});

  if (!safeTotal || !labels.length) return seed;

  const base = Math.floor(safeTotal / labels.length);
  const remainder = safeTotal % labels.length;

  labels.forEach((label, index) => {
    seed[label] = base + (index < remainder ? 1 : 0);
  });

  return seed;
}

function toMarkerItem(
  key: string,
  label: string,
  count: number,
  seriesRecord: { seriesId: string; seriesName: string; colorDirections: string[]; seriesRole: Series['seriesRole'] },
  waveId: string,
  extra?: Partial<ArchitectureCountItem>,
): ArchitectureCountItem {
  const colorHex = resolveSeriesThemeHex(seriesRecord.colorDirections, seriesRecord.seriesRole);

  return {
    key,
    label,
    count,
    seriesIds: [seriesRecord.seriesId],
    seriesNames: [seriesRecord.seriesName],
    waveIds: [waveId],
    colorHexes: [colorHex],
    allocations: [
      {
        seriesId: seriesRecord.seriesId,
        seriesName: seriesRecord.seriesName,
        count,
        colorHex,
        helperText: extra?.helperText,
      },
    ],
    ...extra,
  };
}

function mergeArchitectureItems(items: ArchitectureCountItem[], limit = 4) {
  const map = new Map<string, ArchitectureCountItem>();

  items.forEach((item) => {
    const current = map.get(item.key);
    if (!current) {
      map.set(item.key, {
        ...item,
        seriesIds: [...item.seriesIds],
        seriesNames: [...item.seriesNames],
        waveIds: [...item.waveIds],
        colorHexes: [...item.colorHexes],
        allocations: item.allocations.map((allocation) => ({ ...allocation })),
      });
      return;
    }

    current.count += item.count;
    current.seriesIds = uniqueValues([...current.seriesIds, ...item.seriesIds]);
    current.seriesNames = uniqueValues([...current.seriesNames, ...item.seriesNames]);
    current.waveIds = uniqueValues([...current.waveIds, ...item.waveIds]);
    current.colorHexes = uniqueValues([...current.colorHexes, ...item.colorHexes]);
    item.allocations.forEach((allocation) => {
      const existingAllocation = current.allocations.find((entry) => entry.seriesId === allocation.seriesId);
      if (existingAllocation) {
        existingAllocation.count += allocation.count;
        existingAllocation.helperText = existingAllocation.helperText ?? allocation.helperText;
      } else {
        current.allocations.push({ ...allocation });
      }
    });
    current.helperText = current.helperText ?? item.helperText;
    current.priceBand = current.priceBand ?? item.priceBand;
    current.developmentLevel = current.developmentLevel ?? item.developmentLevel;
    current.isNewTooling = current.isNewTooling || item.isNewTooling;
    current.isSharedOutsole = current.isSharedOutsole || item.isSharedOutsole;
    current.isSharedLast = current.isSharedLast || item.isSharedLast;
  });

  return [...map.values()].sort((left, right) => right.count - left.count).slice(0, limit);
}

function mapStyleRoleKey(role: string): ArchitectureRoleKey {
  if (role.includes('主推')) return 'lead';
  if (role.includes('形象')) return 'image';
  if (role.includes('引流')) return 'traffic';
  if (role.includes('功能')) return 'functional';
  return 'basic';
}

function getRolePriority(seriesRecord: Series, categoryName: string, plan: CategoryPlan | null): ArchitectureRoleKey[] {
  const categoryIsFunctional = ['徒步', '户外', '机能'].some((keyword) => categoryName.includes(keyword));
  const priorityBySeriesRole: Record<Series['seriesRole'], ArchitectureRoleKey[]> = {
    hero: ['lead', 'basic', 'image', 'traffic', 'functional'],
    image: ['image', 'lead', 'functional', 'basic', 'traffic'],
    basic: ['basic', 'lead', 'traffic', 'image', 'functional'],
    traffic: ['traffic', 'basic', 'lead', 'functional', 'image'],
  };

  const basePriority = [...priorityBySeriesRole[seriesRecord.seriesRole]];
  const mappedPlanRole = plan ? mapStyleRoleKey(plan.developmentRole) : null;

  if (categoryIsFunctional) {
    basePriority.splice(1, 0, 'functional');
  }

  if (mappedPlanRole && !basePriority.includes(mappedPlanRole)) {
    basePriority.unshift(mappedPlanRole);
  }

  return Array.from(new Set(basePriority)) as ArchitectureRoleKey[];
}

function allocateRoleCounts(styleTarget: number, seriesRecord: Series, categoryName: string, plan: CategoryPlan | null, styles: StyleDevelopment[]) {
  const counts: Record<ArchitectureRoleKey, number> = {
    basic: 0,
    lead: 0,
    image: 0,
    traffic: 0,
    functional: 0,
  };

  styles.forEach((style) => {
    counts[mapStyleRoleKey(style.developmentRole)] += 1;
  });

  const priority = getRolePriority(seriesRecord, categoryName, plan);
  let remaining = Math.max(0, styleTarget - sum(Object.values(counts)));
  let pointer = 0;

  while (remaining > 0 && priority.length > 0) {
    counts[priority[pointer % priority.length]] += 1;
    pointer += 1;
    remaining -= 1;
  }

  return counts;
}

function createStyleRoleItems(roleCounts: Record<ArchitectureRoleKey, number>, seriesRecord: Series, waveId: string) {
  return Object.entries(roleCounts)
    .filter(([, count]) => count > 0)
    .map(([roleKey, count]) =>
      toMarkerItem(`role:${roleKey}`, ARCHITECTURE_ROLE_LABELS[roleKey as keyof typeof ARCHITECTURE_ROLE_LABELS], count, seriesRecord, waveId),
    );
}

function allocateDevelopmentCounts(styleTarget: number, plan: CategoryPlan | null, styles: StyleDevelopment[], seriesRecord: Series) {
  const counts = new Map<string, number>();

  styles.forEach((style) => {
    counts.set(style.developmentLevel, (counts.get(style.developmentLevel) ?? 0) + 1);
  });

  const priority: CategoryPlan['developmentLevel'][] = [
    plan?.developmentLevel ?? styles[0]?.developmentLevel ?? 'platform_extension',
    seriesRecord.seriesRole === 'traffic' ? 'new_color_refresh' : 'platform_extension',
    seriesRecord.seriesRole === 'hero' || seriesRecord.seriesRole === 'image' ? 'new_development' : 'new_upper_same_outsole',
    'reorder_optimization',
    'new_upper_same_outsole',
  ];

  let remaining = Math.max(0, styleTarget - sum([...counts.values()]));
  let pointer = 0;

  while (remaining > 0) {
    const current = priority[pointer % priority.length];
    counts.set(current, (counts.get(current) ?? 0) + 1);
    pointer += 1;
    remaining -= 1;
  }

  return [...counts.entries()].map(([level, count]) => ({ level, count })).filter((item) => item.count > 0);
}

function distributePresetItems(labels: string[], total: number, seriesRecord: Series, waveId: string, prefix: string, helperText?: string) {
  const distribution = buildDistributionMap(labels, total);
  return Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => toMarkerItem(`${prefix}:${label}`, label, count, seriesRecord, waveId, { helperText }));
}

function createSoleItems(styleTarget: number, styles: StyleDevelopment[], plan: CategoryPlan | null, seriesRecord: Series, waveId: string, presetLabels: string[]) {
  const counts = new Map<string, number>();

  styles.forEach((style) => {
    counts.set(style.outsole, (counts.get(style.outsole) ?? 0) + 1);
  });

  const remaining = Math.max(0, styleTarget - sum([...counts.values()]));
  const fallbackLabels = [plan?.sharedOutsoleStrategy ?? presetLabels[0], ...presetLabels].filter(Boolean) as string[];
  const distributed = buildDistributionMap(uniqueValues(fallbackLabels), remaining);

  Object.entries(distributed).forEach(([label, count]) => {
    counts.set(label, (counts.get(label) ?? 0) + count);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => toMarkerItem(`sole:${label}`, label, count, seriesRecord, waveId, { helperText: plan?.sharedOutsoleStrategy }));
}

function createHeelItems(styleTarget: number, styles: StyleDevelopment[], plan: CategoryPlan | null, seriesRecord: Series, waveId: string, presetLabels: string[]) {
  const remaining = Math.max(0, styleTarget);
  // 对于 heel，由于原模型没有强绑定的 style.heel 属性，我们纯用 preset 生成
  const fallbackLabels = presetLabels;
  const distributed = buildDistributionMap(uniqueValues(fallbackLabels), remaining);

  return Object.entries(distributed)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => toMarkerItem(`heel:${label}`, label, count, seriesRecord, waveId, { helperText: '高度/形态约束' }));
}

function createLastItems(styleTarget: number, styles: StyleDevelopment[], plan: CategoryPlan | null, seriesRecord: Series, waveId: string, presetLabels: string[]) {
  const counts = new Map<string, number>();

  styles.forEach((style) => {
    counts.set(style.last, (counts.get(style.last) ?? 0) + 1);
  });

  const remaining = Math.max(0, styleTarget - sum([...counts.values()]));
  const fallbackLabels = [plan?.sharedLastStrategy ?? presetLabels[0], ...presetLabels].filter(Boolean) as string[];
  const distributed = buildDistributionMap(uniqueValues(fallbackLabels), remaining);

  Object.entries(distributed).forEach(([label, count]) => {
    counts.set(label, (counts.get(label) ?? 0) + count);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => toMarkerItem(`last:${label}`, label, count, seriesRecord, waveId, { helperText: plan?.sharedLastStrategy }));
}

function createCraftDetailItems(seriesRecord: Series, plan: CategoryPlan | null, styleTarget: number, waveId: string) {
  const labels = uniqueValues([
    ...seriesRecord.designLanguages.slice(0, 3),
    ...(plan?.toolingNeed ? [plan.toolingNeed] : []),
  ]).slice(0, 3);

  return distributePresetItems(labels.length ? labels : ['工艺包边', '拼接结构'], Math.max(1, Math.round(styleTarget * 0.8)), seriesRecord, waveId, 'craft', plan?.toolingNeed);
}

function createWarmStructureItems(categoryName: string, seriesRecord: Series, styleTarget: number, waveId: string) {
  const applicable = ['徒步', '户外', '靴'].some((keyword) => categoryName.includes(keyword));
  if (!applicable) return [];

  const labels = categoryName.includes('靴') ? ['加绒内里', '防风包边', '加厚鞋口'] : ['防水袜套', '保暖内里', '包覆结构'];
  return distributePresetItems(labels, Math.max(1, Math.round(styleTarget * 0.7)), seriesRecord, waveId, 'warm', '秋冬或功能场景下重点看保暖和包覆结构。');
}

function inferPlatformMetrics(styleTarget: number, plan: CategoryPlan | null, seriesRecord: Series, waveId: string) {
  const outsoleText = plan?.sharedOutsoleStrategy ?? '';
  const lastText = plan?.sharedLastStrategy ?? '';
  const toolingText = plan?.toolingNeed ?? '';
  const sharedOutsoleRate = roundRate(outsoleText.includes('共底') || outsoleText.includes('复用') || outsoleText.includes('沿用') || outsoleText.includes('延续') ? 0.68 : 0.32);
  const sharedLastRate = roundRate(lastText.includes('共楦') || lastText.includes('复用') || lastText.includes('沿用') || lastText.includes('延展') ? 0.64 : 0.3);
  const newToolingCount = toolingText.includes('新开') || plan?.developmentLevel === 'new_development' ? Math.max(1, Math.round(styleTarget * 0.4)) : 0;
  const platformReuseCount = Math.max(0, styleTarget - newToolingCount);
  const extensionCount = plan?.developmentLevel === 'platform_extension' || toolingText.includes('延展') ? Math.max(1, Math.round(styleTarget * 0.34)) : 0;
  const sharedOutsoleStyleCount = Math.max(0, Math.round(styleTarget * sharedOutsoleRate));
  const newLastStyleCount = Math.max(1, Math.round(styleTarget * (lastText.includes('新楦') ? 0.8 : 0.3)));
  const inheritedLastStyleCount = Math.max(0, styleTarget - newLastStyleCount);

  const items: ArchitectureCountItem[] = [];

  // 按照业务需求废弃独立显示“共底”和“共楦”，全部收敛到“新底/继承底”与“新楦/继承楦”二元逻辑。

  if (newLastStyleCount > 0) {
    items.push(
      toMarkerItem('platform:new-last', '新楦', newLastStyleCount, seriesRecord, waveId)
    );
  }

  if (inheritedLastStyleCount > 0) {
    items.push(
      toMarkerItem('platform:inherited-last', '继承楦', inheritedLastStyleCount, seriesRecord, waveId)
    );
  }

  return {
    sharedOutsoleRate,
    sharedLastRate,
    sharedOutsoleStyleCount,
    sharedLastStyleCount: 0, // 保留以避免类型断档
    newToolingCount,
    platformReuseCount,
    items,
  };
}

function inferSeasonType(projects: Project[]): ArchitectureProfile['seasonType'] {
  const seasonText = projects.map((project) => project.season).join(' ').toUpperCase();
  if (seasonText.includes('FW') || seasonText.includes('AW')) return 'autumn_winter';
  if (seasonText.includes('SS') || seasonText.includes('SPRING') || seasonText.includes('SUMMER')) return 'spring_summer';
  return 'all_season';
}

function inferBrandType(series: Series[], inputs: ProductArchitectureInput[]): ArchitectureProfile['brandType'] {
  const categoryText = uniqueValues(inputs.map((input) => input.categoryName)).join(' / ');
  const seriesText = series.map((record) => record.themeDirection).join(' / ');

  if (['徒步', '户外', '机能'].some((keyword) => categoryText.includes(keyword) || seriesText.includes(keyword))) return 'outdoor';
  if (['高跟', '玛丽珍', '长靴', '短靴'].some((keyword) => categoryText.includes(keyword))) return 'fashion';
  if (categoryText && categoryText.split(' / ').every((item) => ['乐福鞋', '德比鞋', '牛津鞋', '正装鞋'].some((keyword) => item.includes(keyword)))) return 'business';
  if (series.length > 1) return 'hybrid';
  return 'casual';
}

function selectArchitectureProfile(projects: Project[], series: Series[], inputs: ProductArchitectureInput[]) {
  const explicitProfileId = projects.find((project) => project.architectureProfileId)?.architectureProfileId ?? null;
  if (explicitProfileId) return getArchitectureProfile(explicitProfileId);

  const seasonType = inferSeasonType(projects);
  const brandType = inferBrandType(series, inputs);

  if (brandType === 'outdoor' && seasonType === 'autumn_winter') {
    return getArchitectureProfile('footwear-planning-outdoor-aw');
  }

  if (brandType === 'fashion' && seasonType === 'autumn_winter') {
    return getArchitectureProfile('footwear-planning-fashion-aw');
  }

  if (brandType === 'business') {
    return getArchitectureProfile('footwear-planning-business-core');
  }

  return getArchitectureProfile('footwear-planning-ss-core');
}

function createProductArchitectureInput(
  otb: OTBStructure,
  waveById: Record<string, Wave>,
  seriesById: Record<string, Series>,
  categoryPlans: CategoryPlan[],
  styles: StyleDevelopment[],
  totalPlanStyleTarget: number,
  totalPlanSkuTarget: number,
): ProductArchitectureInput | null {
  const seriesRecord = seriesById[otb.seriesId];
  if (!seriesRecord) return null;

  const matchedPlan =
    categoryPlans.find((plan) => plan.seriesId === otb.seriesId && plan.categoryName === otb.categoryName) ??
    categoryPlans.find((plan) => plan.projectId === otb.projectId && plan.categoryName === otb.categoryName) ??
    null;

  const matchedStyles = styles.filter((style) => style.seriesId === otb.seriesId && style.categoryName === otb.categoryName && !style.cancelled);
  const preset = getCategoryPreset(otb.categoryName);
  const budgetDrivenStyleTarget = Math.max(1, Math.round(totalPlanStyleTarget * otb.categoryBudgetShare));
  const budgetDrivenSkuTarget = Math.max(budgetDrivenStyleTarget, Math.round(totalPlanSkuTarget * otb.categoryBudgetShare));
  const styleTarget = matchedPlan ? Math.max(1, Math.round((budgetDrivenStyleTarget + matchedPlan.styleTarget) / 2)) : budgetDrivenStyleTarget;
  const skuTarget = matchedPlan ? Math.max(styleTarget, Math.round((budgetDrivenSkuTarget + matchedPlan.skuTarget) / 2)) : budgetDrivenSkuTarget;
  const roleCounts = allocateRoleCounts(styleTarget, seriesRecord, otb.categoryName, matchedPlan, matchedStyles);
  const developmentCounts = allocateDevelopmentCounts(styleTarget, matchedPlan, matchedStyles, seriesRecord);
  const quantitySeriesRecord = { seriesId: otb.seriesId, seriesName: seriesRecord.seriesName, colorDirections: seriesRecord.colorDirections, seriesRole: seriesRecord.seriesRole };
  const quantityItems = [
    toMarkerItem('quantity:spu', '款数目标', styleTarget, quantitySeriesRecord, otb.waveId, { helperText: `预算占比 ${percent(otb.categoryBudgetShare)} / 平均深度 ${Number((skuTarget / styleTarget).toFixed(1))}` }),
    toMarkerItem('quantity:sku', 'SKU 目标', skuTarget, quantitySeriesRecord, otb.waveId, { helperText: `价格带 ${otb.priceBand}` }),
  ];
  const styleRoleItems = createStyleRoleItems(roleCounts, seriesRecord, otb.waveId);
  const structureTypes = distributePresetItems(preset.structures, styleTarget, seriesRecord, otb.waveId, 'structure');
  const soleTypes = createSoleItems(styleTarget, matchedStyles, matchedPlan, seriesRecord, otb.waveId, preset.soles);
  const heelTypes = createHeelItems(styleTarget, matchedStyles, matchedPlan, seriesRecord, otb.waveId, preset.heels);
  const lastTypes = createLastItems(styleTarget, matchedStyles, matchedPlan, seriesRecord, otb.waveId, preset.lasts);
  const craftDetails = createCraftDetailItems(seriesRecord, matchedPlan, styleTarget, otb.waveId);
  const warmStructures = createWarmStructureItems(otb.categoryName, seriesRecord, styleTarget, otb.waveId);
  const platformMetrics = inferPlatformMetrics(styleTarget, matchedPlan, seriesRecord, otb.waveId);
  const wave = waveById[otb.waveId];

  return {
    bridgeId: `architecture-${otb.otbStructureId}`,
    otbStructureId: otb.otbStructureId,
    projectId: otb.projectId,
    seriesId: otb.seriesId,
    seriesName: seriesRecord.seriesName,
    seriesRole: seriesRecord.seriesRole,
    categoryPlanId: matchedPlan?.categoryPlanId ?? null,
    categoryName: otb.categoryName,
    waveId: otb.waveId,
    waveName: wave?.waveName ?? otb.waveId.toUpperCase(),
    priceBand: otb.priceBand,
    budgetShare: otb.categoryBudgetShare,
    budgetAmount: otb.categoryBudgetAmount,
    channelWeights: otb.channelWeights,
    styleTarget,
    skuTarget,
    averageDepth: Number((skuTarget / styleTarget).toFixed(1)),
    activeStyleCount: matchedStyles.length,
    roleCounts,
    quantityItems,
    styleRoleItems,
    structureTypes,
    soleTypes,
    heelTypes,
    lastTypes,
    craftDetails,
    warmStructures,
    developmentAttributes: developmentCounts
      .filter((item) => item.level !== 'new_color_refresh' && item.level !== 'reorder_optimization')
      .map((item) => {
      const label = DEVELOPMENT_LEVEL_LABELS[item.level as keyof typeof DEVELOPMENT_LEVEL_LABELS];
      const mergedKey =
        label === '新底' ? 'development:new_tooling' :
        label === '继承底' ? 'development:inherited' :
        `development:${item.level}`;

      return toMarkerItem(mergedKey, label, item.count, seriesRecord, otb.waveId, {
        helperText: matchedPlan?.toolingNeed,
        developmentLevel: item.level as ProductArchitectureInput['developmentAttributes'][number]['developmentLevel'],
      });
    }),
    platformStrategies: platformMetrics.items,
    sharedOutsoleStyleCount: platformMetrics.sharedOutsoleStyleCount,
    sharedLastStyleCount: platformMetrics.sharedLastStyleCount,
    newToolingCount: platformMetrics.newToolingCount,
    platformReuseCount: platformMetrics.platformReuseCount,
    seriesColorHex: resolveSeriesThemeHex(seriesRecord.colorDirections, seriesRecord.seriesRole),
  };
}

function isDimensionApplicable(config: ArchitectureDimensionConfig, categoryName: string) {
  if (!config.appliesToCategories?.length) return true;
  return config.appliesToCategories.some((value) => categoryName.includes(value));
}

function createMatrix(inputs: ProductArchitectureInput[], profile: ArchitectureProfile): ProductArchitectureView['matrix'] {
  const columnNames = uniqueValues(inputs.map((input) => input.categoryName));
  const columns = columnNames.map((categoryName) => {
    const matchedInputs = inputs.filter((input) => input.categoryName === categoryName);
    return {
      categoryName,
      styleTarget: sum(matchedInputs.map((input) => input.styleTarget)),
      skuTarget: sum(matchedInputs.map((input) => input.skuTarget)),
      priceBands: uniqueValues(matchedInputs.map((input) => input.priceBand)),
      waves: uniqueValues(matchedInputs.map((input) => input.waveId.toUpperCase())),
      seriesIds: uniqueValues(matchedInputs.map((input) => input.seriesId)),
    };
  });

  const rows = profile.dimensionRows
    .filter((config) => config.visible)
    .sort((left, right) => left.order - right.order)
    .map((config) => ({
      key: config.key,
      label: config.label,
      helperText: config.helperText,
      cells: columns.map((column) => {
        const matchedInputs = inputs.filter((input) => input.categoryName === column.categoryName);

        if (!isDimensionApplicable(config, column.categoryName)) {
          return {
            categoryName: column.categoryName,
            dimensionKey: config.key,
            items: [],
            total: 0,
            summary: '当前品类不启用',
          };
        }

        const resolver = getArchitectureDimensionResolver(config.resolverKey);
        const rawItems = resolver ? resolver({ matchedInputs }) : [];
        const items = mergeArchitectureItems(rawItems, config.resolverKey === 'quantity' ? 2 : 5);
        const priceSummary = uniqueValues(matchedInputs.map((input) => input.priceBand)).join(' / ');
        const waveSummary = uniqueValues(matchedInputs.map((input) => input.waveId.toUpperCase())).join(' / ');

        return {
          categoryName: column.categoryName,
          dimensionKey: config.key,
          items,
          total: sum(items.map((item) => item.count)),
          summary: config.resolverKey === 'quantity' ? `${waveSummary} / ${priceSummary}` : items.length ? `${matchedInputs.length} 个系列来源` : '暂无分配',
        };
      }),
    }));

  return { columns, rows };
}

function createPlatformInsights(inputs: ProductArchitectureInput[], summary: ArchitectureSummary) {
  const sortedByNewTooling = [...inputs].sort((left, right) => right.newToolingCount - left.newToolingCount);
  const sortedBySharedOutsole = [...inputs].sort(
    (left, right) => right.sharedOutsoleStyleCount / Math.max(right.styleTarget, 1) - left.sharedOutsoleStyleCount / Math.max(left.styleTarget, 1),
  );
  const crossSeriesCategories = uniqueValues(
    Object.entries(
      inputs.reduce<Record<string, string[]>>((accumulator, input) => {
        if (!accumulator[input.categoryName]) accumulator[input.categoryName] = [];
        accumulator[input.categoryName].push(input.seriesId);
        return accumulator;
      }, {}),
    )
      .filter(([, seriesIds]) => uniqueValues(seriesIds).length > 1)
      .map(([categoryName]) => categoryName),
  );
  const topPlatformLabels = mergeArchitectureItems(inputs.flatMap((input) => input.platformStrategies), 3).map((item) => item.label).join(' / ');

  return [
    {
      insightId: 'architecture-shared-outsole',
      title: '共底逻辑',
      value: percent(summary.sharedOutsoleRate),
      summary:
        sortedBySharedOutsole.length > 0
          ? `优先在 ${sortedBySharedOutsole.slice(0, 2).map((item) => item.categoryName).join('、')} 上用成熟底台压住开模节奏。`
          : '当前筛选范围内暂无共底策略。',
      seriesIds: uniqueValues(sortedBySharedOutsole.slice(0, 2).map((item) => item.seriesId)),
      colorHexes: uniqueValues(sortedBySharedOutsole.slice(0, 2).map((item) => item.seriesColorHex)),
      emphasis: 'neutral' as const,
    },
    {
      insightId: 'architecture-shared-last',
      title: '共楦逻辑',
      value: percent(summary.sharedLastRate),
      summary: `当前共楦率 ${percent(summary.sharedLastRate)}，先把脚感与穿着体验稳定在平台层。`,
      seriesIds: uniqueValues(inputs.filter((input) => input.sharedLastStyleCount > 0).map((input) => input.seriesId)).slice(0, 3),
      colorHexes: uniqueValues(inputs.filter((input) => input.sharedLastStyleCount > 0).map((input) => input.seriesColorHex)).slice(0, 3),
      emphasis: 'neutral' as const,
    },
    {
      insightId: 'architecture-new-tooling',
      title: '新开模分布',
      value: `${summary.newToolingCount} 款`,
      summary:
        sortedByNewTooling.length > 0
          ? `重点集中在 ${sortedByNewTooling.filter((item) => item.newToolingCount > 0).slice(0, 2).map((item) => `${item.seriesName} ${item.categoryName}`).join('、')}。`
          : '当前筛选范围内暂无新开模重点。',
      seriesIds: uniqueValues(sortedByNewTooling.filter((item) => item.newToolingCount > 0).map((item) => item.seriesId)).slice(0, 3),
      colorHexes: uniqueValues(sortedByNewTooling.filter((item) => item.newToolingCount > 0).map((item) => item.seriesColorHex)).slice(0, 3),
      emphasis: summary.newToolingRate >= 0.35 ? 'warning' as const : 'accent' as const,
    },
    {
      insightId: 'architecture-platform-reuse',
      title: '重点平台说明',
      value: percent(summary.platformReuseRate),
      summary: crossSeriesCategories.length > 0 ? `跨系列优先复用 ${crossSeriesCategories.join('、')}，平台关键词集中在 ${topPlatformLabels}。` : `平台关键词集中在 ${topPlatformLabels || '共底 / 共楦 / 新开模'}。`,
      seriesIds: uniqueValues(inputs.map((input) => input.seriesId)).slice(0, 4),
      colorHexes: uniqueValues(inputs.map((input) => input.seriesColorHex)).slice(0, 4),
      emphasis: 'accent' as const,
    },
  ];
}

function createArchitectureSummary(inputs: ProductArchitectureInput[]): ArchitectureSummary {
  const totalStyleTarget = sum(inputs.map((input) => input.styleTarget));
  const totalLeadStyleCount = sum(inputs.map((input) => input.roleCounts.lead));
  const totalNewToolingCount = sum(inputs.map((input) => input.newToolingCount));
  const totalSharedOutsoleCount = sum(inputs.map((input) => input.sharedOutsoleStyleCount));
  const totalSharedLastCount = sum(inputs.map((input) => input.sharedLastStyleCount));
  const totalPlatformReuseCount = sum(inputs.map((input) => input.platformReuseCount));

  return {
    categoryCount: uniqueValues(inputs.map((input) => input.categoryName)).length,
    styleTarget: totalStyleTarget,
    skuTarget: sum(inputs.map((input) => input.skuTarget)),
    leadStyleCount: totalLeadStyleCount,
    leadStyleRate: totalStyleTarget ? roundRate(totalLeadStyleCount / totalStyleTarget) : 0,
    newToolingCount: totalNewToolingCount,
    newToolingRate: totalStyleTarget ? roundRate(totalNewToolingCount / totalStyleTarget) : 0,
    sharedOutsoleRate: totalStyleTarget ? roundRate(totalSharedOutsoleCount / totalStyleTarget) : 0,
    sharedLastRate: totalStyleTarget ? roundRate(totalSharedLastCount / totalStyleTarget) : 0,
    platformReuseRate: totalStyleTarget ? roundRate(totalPlatformReuseCount / totalStyleTarget) : 0,
  };
}

export function buildProductArchitectureComputation({ otbStructures, projects, waves, series, categoryPlans, styles }: BuildProductArchitectureParams): ProductArchitectureComputation {
  const waveById = Object.fromEntries(waves.map((record) => [record.waveId, record]));
  const seriesById = Object.fromEntries(series.map((record) => [record.seriesId, record]));
  const totalPlanStyleTarget = Math.max(1, sum(categoryPlans.map((plan) => plan.styleTarget)));
  const totalPlanSkuTarget = Math.max(totalPlanStyleTarget, sum(categoryPlans.map((plan) => plan.skuTarget)));

  const inputs = otbStructures
    .map((otb) => createProductArchitectureInput(otb, waveById, seriesById, categoryPlans, styles, totalPlanStyleTarget, totalPlanSkuTarget))
    .filter((item): item is ProductArchitectureInput => item !== null);

  const profile = selectArchitectureProfile(projects, series, inputs);
  const summary = createArchitectureSummary(inputs);
  const matrix = createMatrix(inputs, profile);
  const platformInsights = createPlatformInsights(inputs, summary);
  const byCategoryPlanId = Object.fromEntries(inputs.filter((input) => input.categoryPlanId).map((input) => [input.categoryPlanId as string, input]));
  const bySeriesCategory = Object.fromEntries(inputs.map((input) => [`${input.seriesId}:${input.categoryName}`, input]));

  return {
    view: {
      profileId: profile.profileId,
      profileLabel: profile.label,
      inputs,
      summary,
      matrix,
      platformInsights,
      sourceSummary: `当前采用 ${profile.label}，基于 ${otbStructures.length} 条 OTB 品类经营输入转译，覆盖 ${summary.categoryCount} 个一级品类、${summary.styleTarget} 款架构目标和 ${summary.skuTarget} 个 SKU 目标。`,
    },
    byCategoryPlanId,
    bySeriesCategory,
  };
}
