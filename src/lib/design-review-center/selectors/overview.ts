import { isPastDue, isSameWeek, startOfDay } from '@/lib/design-review-center/helpers/date';
import { hasOperationalBlock, isHighRisk, isStyleActive } from '@/lib/design-review-center/helpers/status';
import type { ActionItem, ArchitectureSummary, DesignReviewMustDecideItem, DesignReviewOverview, GateNode, ReviewRecord, StyleDevelopment } from '@/lib/design-review-center/types';

function createDecisionItem(style: StyleDevelopment, reason: string): DesignReviewMustDecideItem {
  return {
    styleId: style.styleId,
    title: `${style.styleDisplayName} / ${style.skuCode}`,
    owner: style.owner,
    dueDate: style.dueDate,
    reason,
  };
}

export function createOverview(
  styles: StyleDevelopment[],
  gateNodes: GateNode[],
  reviewRecords: ReviewRecord[],
  actionItems: ActionItem[],
  referenceDate: string,
  architectureSummary: ArchitectureSummary | null = null,
): DesignReviewOverview {
  const activeStyles = styles.filter((style) => !style.cancelled);
  const leadStyles = activeStyles.filter((style) => style.leadStyle);
  const lockedLeadStyles = leadStyles.filter((style) => style.locked);
  const highRiskStyles = activeStyles.filter((style) => isHighRisk(style.riskLevel) || hasOperationalBlock(style));
  const completedSamples = activeStyles.filter((style) => style.sampleStatus === 'completed');
  const bomLockedStyles = activeStyles.filter((style) => style.bomLocked);
  const delayedGates = gateNodes.filter((gate) => gate.delayed);

  const mustDecide = activeStyles
    .filter(
      (style) =>
        style.blocked ||
        isSameWeek(style.nextReviewDate, referenceDate) ||
        isPastDue(style.dueDate, referenceDate) ||
        reviewRecords.some((record) => record.styleId === style.styleId && !record.closed && isSameWeek(record.dueDate, referenceDate)) ||
        actionItems.some((item) => item.styleId === style.styleId && item.status !== 'closed' && isSameWeek(item.dueDate, referenceDate)),
    )
    .sort((left, right) => startOfDay(left.dueDate) - startOfDay(right.dueDate))
    .slice(0, 5)
    .map((style) => {
      if (style.blocked) return createDecisionItem(style, '存在阻塞，需先确认替代材料、替代结构或责任人。');
      if (isPastDue(style.dueDate, referenceDate)) return createDecisionItem(style, '款式已到期，需决定是否提级推进、降本收口或转移波段。');
      return createDecisionItem(style, '本周存在评审或动作截止，需在周会内拍板。');
    });

  const blockers = activeStyles
    .filter((style) => style.blocked || style.riskLevel === 'blocking')
    .sort((left, right) => startOfDay(left.dueDate) - startOfDay(right.dueDate))
    .slice(0, 4)
    .map((style) => createDecisionItem(style, style.nextAction));

  const pendingDesignReviews = activeStyles.filter((style) => style.reviewStatus === 'review' || style.designStatus === 'pending_review').length;
  const designHighRiskCount = activeStyles.filter((style) => style.designStatus === 'blocked' || style.riskLevel === 'high' || style.riskLevel === 'blocking').length;
  const costGapCount = activeStyles.filter((style) => style.quotedCost != null && style.targetCost != null && style.quotedCost > style.targetCost).length;
  const blockedBomCount = activeStyles.filter((style) => !style.bomLocked && (style.materialStatus === 'blocked' || style.costStatus === 'blocked')).length;
  const delayedGateCount = delayedGates.length;
  const blockedDevelopmentCount = activeStyles.filter((style) => style.technicalStatus === 'blocked' || style.toolingStatus === 'blocked').length;

  return {
    totalStyles: styles.length,
    initiatedStyles: styles.filter((style) => style.currentStage !== 'planning' && !style.cancelled).length,
    inDevelopmentStyles: styles.filter((style) => isStyleActive(style)).length,
    lockedStyles: styles.filter((style) => style.locked).length,
    cancelledStyles: styles.filter((style) => style.cancelled).length,
    leadLockRate: leadStyles.length ? lockedLeadStyles.length / leadStyles.length : 0,
    highRiskStyles: highRiskStyles.length,
    delayedGateCount,
    sampleCompletionRate: activeStyles.length ? completedSamples.length / activeStyles.length : 0,
    bomLockRate: activeStyles.length ? bomLockedStyles.length / activeStyles.length : 0,
    mustDecide,
    blockers,
    designTrackSummary: `待评审 ${pendingDesignReviews} 款，设计高风险 ${designHighRiskCount} 款。`,
    costTrackSummary: `超目标成本 ${costGapCount} 款，BOM/材料待锁 ${blockedBomCount} 款。`,
    developmentTrackSummary: `延期 Gate ${delayedGateCount} 个，技术或开模阻塞 ${blockedDevelopmentCount} 款。`,
    architectureSummary,
  };
}
