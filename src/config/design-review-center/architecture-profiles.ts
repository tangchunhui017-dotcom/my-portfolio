import type { ArchitectureProfile } from '@/lib/design-review-center/types';

const CORE_DIMENSIONS = [
  { key: 'quantity', label: '数量', helperText: '先把 OTB 预算语言转成 SPU / SKU 目标，再作为开发任务池的上游约束。', resolverKey: 'quantity', visible: true, order: 10 },
  { key: 'soleType', label: '底型 / 大底科技', helperText: '底型决定平台开发费用的复用情况与抓地物理属性（硬约束）。', resolverKey: 'soleType', visible: true, order: 20 },
  { key: 'heelType', label: '跟型 / 跟高', helperText: '鞋跟形态与高度决定整体楦型的拔高角，是女性鞋类产品的时装气质分水岭。', resolverKey: 'heelType', visible: true, order: 25 },
  { key: 'lastType', label: '楦型 / 鞋头', helperText: '楦型或鞋头决定品类气质与舒适性，是主要脚感约束。', resolverKey: 'lastType', visible: true, order: 30 },
  { key: 'structureType', label: '结构类型', helperText: '鞋类结构按穿着方式和开口结构表达，替代服装的廓形 / 长短逻辑。', resolverKey: 'structureType', visible: true, order: 40 },
  { key: 'styleRole', label: '风格角色', helperText: '区分基本款、主推款、形象款、引流款和功能款（软约束）。', resolverKey: 'styleRole', visible: true, order: 50 },
  { key: 'developmentAndPlatform', label: '开发策略', helperText: '决定本季开模资源投放强弱，并明确底楦新旧属性，把动作翻译成开发执行语言。', resolverKey: 'developmentAndPlatform', visible: true, order: 60 },
] as const;

export const ARCHITECTURE_PROFILES: ArchitectureProfile[] = [
  {
    profileId: 'footwear-planning-ss-core',
    label: '春夏鞋类通用架构',
    description: '适合休闲、轻户外、轻商务混合项目，保留数量、角色、结构、底楦、开发属性与平台策略七大维度。',
    brandType: 'hybrid',
    seasonType: 'spring_summer',
    dimensionRows: [...CORE_DIMENSIONS],
  },
  {
    profileId: 'footwear-planning-business-core',
    label: '商务鞋架构',
    description: '偏商务通勤时，楦型、底型和工艺细节优先于季节性保暖结构。',
    brandType: 'business',
    seasonType: 'all_season',
    dimensionRows: [
      CORE_DIMENSIONS[0], // quantity
      CORE_DIMENSIONS[1], // soleType
      CORE_DIMENSIONS[2], // heelType
      CORE_DIMENSIONS[3], // lastType
      CORE_DIMENSIONS[5], // styleRole
      { key: 'craftDetail', label: '工艺细节', helperText: '适合表达轻商务、时装和品牌识别工艺的结构重点。', resolverKey: 'craftDetail', visible: true, order: 55 },
      CORE_DIMENSIONS[6], // development
    ],
  },
  {
    profileId: 'footwear-planning-fashion-aw',
    label: '秋冬时装鞋架构',
    description: '适合秋冬时装线，强调鞋头、跟型、工艺细节与保暖结构。',
    brandType: 'fashion',
    seasonType: 'autumn_winter',
    dimensionRows: [
      CORE_DIMENSIONS[0],
      CORE_DIMENSIONS[1],
      CORE_DIMENSIONS[2],
      CORE_DIMENSIONS[3],
      CORE_DIMENSIONS[4],
      CORE_DIMENSIONS[5],
      { key: 'craftDetail', label: '工艺细节', helperText: '适合表达装饰、包边、拼接、金属件等时装化工艺重点。', resolverKey: 'craftDetail', visible: true, order: 55 },
      { key: 'warmStructure', label: '保暖结构', helperText: '秋冬矩阵可单独增加保暖结构，便于区分加绒、袜套和防风处理。', resolverKey: 'warmStructure', visible: true, order: 58 },
      CORE_DIMENSIONS[6],
    ],
  },
  {
    profileId: 'footwear-planning-outdoor-aw',
    label: '秋冬户外鞋架构',
    description: '适合户外和功能导向项目，保暖、防护结构与平台策略优先。',
    brandType: 'outdoor',
    seasonType: 'autumn_winter',
    dimensionRows: [
      CORE_DIMENSIONS[0],
      CORE_DIMENSIONS[1],
      { key: 'warmStructure', label: '保暖结构', helperText: '防水袜套、保暖内里和包裹结构应单独管理。', resolverKey: 'warmStructure', visible: true, order: 25 },
      CORE_DIMENSIONS[2],
      CORE_DIMENSIONS[3],
      CORE_DIMENSIONS[4],
      CORE_DIMENSIONS[5],
      CORE_DIMENSIONS[6],
    ],
  },
];

export function getArchitectureProfile(profileId?: string | null) {
  if (profileId) {
    const matched = ARCHITECTURE_PROFILES.find((profile) => profile.profileId === profileId);
    if (matched) return matched;
  }

  return ARCHITECTURE_PROFILES[0];
}
