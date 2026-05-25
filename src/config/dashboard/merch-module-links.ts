import type { DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';

export const MERCH_TABS_META = [
  // ① 仪表入口
  { key: 'overview', label: '总览', icon: '📊' },
  // ② 市场战略输入
  { key: 'brand-positioning', label: '品牌定位', icon: '🧬' },
  { key: 'consumer', label: '消费者画像', icon: '🧑‍🤝‍🧑' },
  { key: 'trend', label: '流行趋势', icon: '✨' },
  { key: 'competitor', label: '竞品&趋势', icon: '🧭' },
  // ③ 年度顶层目标
  { key: 'annual-control', label: '年度总控', icon: '🗺️' },
  // ④ 结构拆解
  { key: 'category', label: '品类运营', icon: '📋' },
  { key: 'channel', label: '区域&门店', icon: '🏪' },
  { key: 'planning', label: '波段企划', icon: '📅' },
  // ⑤ 预测 + 预算
  { key: 'forecast', label: '销售预测', icon: '📈' },
  { key: 'otb', label: 'OTB预算', icon: '💰' },
  // ⑥ 财务结果
  { key: 'profit-loss', label: '损益', icon: '💹' },
  { key: 'cashflow', label: '现金流', icon: '💧' },
  // ⑦ 执行监控
  { key: 'inventory', label: '库存健康', icon: '📦' },
] as const;

/**
 * 当前 tab 之外的其他 tab，返回为跨模块链接数组
 */
export function buildMerchModuleLinks(currentTabKey: string): DesignPlanningRelatedModuleLink[] {
  return MERCH_TABS_META
    .filter((t) => t.key !== currentTabKey)
    .map((t) => ({
      linkId: `merch-${t.key}`,
      label: t.label,
      description: '',
      actionLabel: `查看${t.label}`,
      relatedRoute: `/dashboard?tab=${t.key}`,
      category: 'internal' as const,
      icon: t.icon,
    }));
}
