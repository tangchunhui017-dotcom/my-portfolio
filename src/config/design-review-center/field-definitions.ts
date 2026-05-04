import type { DesignItem, FieldDefinition, SeriesDevelopmentPlanRow } from '@/lib/design-review-center/types';

const DEFAULT_FIELDS: FieldDefinition[] = [
  { key: 'pricePoint', label: '目标吊牌价', group: 'commercial', placeholder: '待补充' },
  { key: 'targetCostEstimate', label: '目标成本预估', group: 'commercial', placeholder: '待补充' },
  { key: 'sampleQuotedCost', label: '样鞋核价', group: 'commercial', placeholder: '待补充' },
  { key: 'finalLockedCost', label: '最终锁价', group: 'commercial', placeholder: '待补充' },
  { key: 'developmentPlan.silhouette', label: '楦型 / 体量方向', group: 'design', placeholder: '待补充' },
  { key: 'developmentPlan.upperConstruction', label: '帮面结构', group: 'design', placeholder: '待补充' },
  { key: 'developmentPlan.outsoleDirection', label: '大底方向', group: 'design', placeholder: '待补充' },
  { key: 'techPackStatus', label: 'Tech Pack 状态', group: 'development', placeholder: '待补充' },
  { key: 'toolingStatus', label: '开模状态', group: 'development', placeholder: '待补充' },
  { key: 'toolingNotes', label: '开模备注', group: 'development', placeholder: '待补充' },
];

const CATEGORY_FIELDS: Record<string, FieldDefinition[]> = {
  outdoor: [
    { key: 'developmentPlan.outsoleDirection', label: '抓地大底方向', group: 'design', placeholder: '待补充' },
    { key: 'toolingNotes', label: '功能开模备注', group: 'development', placeholder: '待补充' },
  ],
  dress: [
    { key: 'developmentPlan.silhouette', label: '楦型修长比例', group: 'design', placeholder: '待补充' },
    { key: 'techPackStatus', label: '工艺包确认', group: 'development', placeholder: '待补充' },
  ],
  loafer: [
    { key: 'developmentPlan.upperConstruction', label: '鞋口结构', group: 'design', placeholder: '待补充' },
    { key: 'toolingNotes', label: '鞋口稳定性备注', group: 'development', placeholder: '待补充' },
  ],
};

function resolveCategoryKey(category: string) {
  if (category.includes('徒步') || category.includes('机能') || category.includes('户外')) return 'outdoor';
  if (category.includes('德比') || category.includes('商务') || category.includes('正装')) return 'dress';
  if (category.includes('乐福')) return 'loafer';
  return 'default';
}

export function resolveItemFieldDefinitions(item: DesignItem) {
  const categoryKey = resolveCategoryKey(item.category);
  const mergedFields = [...DEFAULT_FIELDS, ...(CATEGORY_FIELDS[categoryKey] ?? [])];
  const uniqueFields = new Map<string, FieldDefinition>();

  mergedFields.forEach((field) => {
    uniqueFields.set(`${field.group}:${field.key}`, field);
  });

  return [...uniqueFields.values()];
}

function formatStatus(value?: string) {
  if (!value) return null;
  if (value === 'not_started') return '未开始';
  if (value === 'in_progress') return '进行中';
  if (value === 'completed') return '已完成';
  if (value === 'blocked') return '阻塞';
  return value;
}

function formatCurrency(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return `¥ ${value}`;
}

export function resolveFieldValue(
  item: DesignItem,
  developmentPlan: SeriesDevelopmentPlanRow | null,
  field: FieldDefinition,
) {
  if (field.key === 'developmentPlan.silhouette') return developmentPlan?.silhouette ?? null;
  if (field.key === 'developmentPlan.upperConstruction') return developmentPlan?.upperConstruction ?? null;
  if (field.key === 'developmentPlan.outsoleDirection') return developmentPlan?.outsoleDirection ?? null;

  const rawValue = item[field.key as keyof DesignItem];

  if (field.key === 'targetCostEstimate' || field.key === 'sampleQuotedCost' || field.key === 'finalLockedCost') {
    return formatCurrency(rawValue as number | null | undefined);
  }

  if (field.key === 'techPackStatus' || field.key === 'toolingStatus') {
    return formatStatus(rawValue as string | undefined);
  }

  if (typeof rawValue === 'number') return String(rawValue);
  if (typeof rawValue === 'string') return rawValue;
  return null;
}
