import type { Risk, Task, DesignItem } from './types';

export interface PriorityScore {
  itemId: string;
  score: number;
  factors: string[];
}

const PRIORITY_WEIGHTS = {
  riskLevel: { critical: 40, high: 30, medium: 15, low: 5 },
  overdueDays: 2, // 每逾期一天加 2 分
  blockingIssue: 15,
  heroRole: 10,
};

export function calculateItemPriority(
  item: DesignItem,
  risks: Risk[],
  tasks: Task[],
): PriorityScore {
  let score = 0;
  const factors: string[] = [];

  // 产品角色权重
  if (item.productRole === 'hero') {
    score += PRIORITY_WEIGHTS.heroRole;
    factors.push('Hero 款');
  }

  // 逾期天数
  const dueDate = new Date(item.targetLaunchDate);
  const today = new Date();
  if (dueDate < today) {
    const overdueDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    score += overdueDays * PRIORITY_WEIGHTS.overdueDays;
    factors.push(`逾期 ${overdueDays} 天`);
  }

  // 关联风险
  const itemRisks = risks.filter((r) => r.seriesId === item.seriesId);
  for (const risk of itemRisks) {
    const riskScore = PRIORITY_WEIGHTS.riskLevel[risk.priority] ?? 0;
    if (riskScore > 0) {
      score += riskScore;
      factors.push(`${risk.priority} 风险: ${risk.title}`);
    }
  }

  return { itemId: item.itemId, score, factors };
}

export function rankByPriority(
  items: DesignItem[],
  risks: Risk[],
  tasks: Task[],
): PriorityScore[] {
  return items
    .map((item) => calculateItemPriority(item, risks, tasks))
    .sort((a, b) => b.score - a.score);
}
