import type { RiskLevel } from '@/config/design-review-center/enums';
import type { ActionItem, ReviewRecord, StyleDevelopment } from '@/lib/design-review-center/types';

const RISK_ORDER: Record<RiskLevel, number> = {
  blocking: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function normalizeRiskLevel(value: string | null | undefined): RiskLevel {
  if (value === 'critical') return 'blocking';
  if (value === 'blocking' || value === 'high' || value === 'medium' || value === 'low') return value;
  return 'medium';
}

export function isHighRisk(level: RiskLevel | undefined) {
  return level === 'high' || level === 'blocking';
}

export function isBlockingRisk(level: RiskLevel | undefined) {
  return level === 'blocking';
}

export function getRiskPriority(level: RiskLevel | undefined) {
  return RISK_ORDER[level ?? 'medium'];
}

export function isStageClosed(stage: string | undefined) {
  return stage === 'locked' || stage === 'completed';
}

export function isStyleActive(style: StyleDevelopment) {
  return !style.cancelled && !isStageClosed(style.currentStage);
}

export function isActionOpen(action: ActionItem) {
  return action.status !== 'closed';
}

export function isReviewOpen(review: ReviewRecord) {
  return !review.closed;
}

export function hasOperationalBlock(style: StyleDevelopment) {
  return style.blocked || style.materialStatus === 'blocked' || style.technicalStatus === 'blocked' || style.toolingStatus === 'blocked';
}

