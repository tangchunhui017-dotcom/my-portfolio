import { isPastDue, isSameWeek, startOfDay } from '@/lib/design-review-center/helpers/date';
import { isActionOpen, isReviewOpen } from '@/lib/design-review-center/helpers/status';
import type { ActionItem, ActionStatus, ReviewConclusion, ReviewRecord, ReviewType, StyleAggregate } from '@/lib/design-review-center/types';

export interface ReviewDecisionRow {
  reviewId: string;
  styleId: string;
  skuCode: string;
  styleName: string;
  seriesName: string;
  categoryName: string;
  waveId: string;
  reviewDate: string;
  reviewType: ReviewType;
  conclusion: ReviewConclusion;
  issueDescription: string;
  changeRequest: string;
  owner: string;
  dueDate: string;
  blocked: boolean;
  impactScope: string;
  nextReviewDate: string | null;
  closed: boolean;
  openActionCount: number;
  actionStatuses: ActionStatus[];
  overdue: boolean;
  dueThisWeek: boolean;
}

export interface ReviewActionRow {
  actionId: string;
  reviewId: string;
  styleId: string;
  skuCode: string;
  styleName: string;
  seriesName: string;
  categoryName: string;
  waveId: string;
  reviewType: ReviewType | null;
  conclusion: ReviewConclusion | null;
  actionType: string;
  actionDescription: string;
  status: ActionItem['status'];
  owner: string;
  dueDate: string;
  completedAt: string | null;
  reapproved: boolean;
  blocked: boolean;
  impactScope: string;
  nextReviewDate: string | null;
  overdue: boolean;
  dueThisWeek: boolean;
}

export interface ReviewDecisionCenterSummary {
  openReviewCount: number;
  openActionCount: number;
  blockedCount: number;
  dueThisWeekReviewCount: number;
  dueThisWeekActionCount: number;
  overdueActionCount: number;
}

export function getLatestReviewByStyle(styleId: string, reviewRecords: ReviewRecord[]) {
  return [...reviewRecords]
    .filter((record) => record.styleId === styleId)
    .sort((left, right) => startOfDay(right.reviewDate) - startOfDay(left.reviewDate))[0] ?? null;
}

export function getOpenActionsByStyle(styleId: string, actionItems: ActionItem[]) {
  return [...actionItems]
    .filter((item) => item.styleId === styleId && isActionOpen(item))
    .sort((left, right) => startOfDay(left.dueDate) - startOfDay(right.dueDate));
}

export function getLatestActionByStyle(styleId: string, actionItems: ActionItem[]) {
  return [...actionItems]
    .filter((item) => item.styleId === styleId)
    .sort((left, right) => startOfDay(right.dueDate) - startOfDay(left.dueDate))[0] ?? null;
}

export function summarizeReviews(reviewRecords: ReviewRecord[], actionItems: ActionItem[]) {
  const openReviews = reviewRecords.filter(isReviewOpen);
  const openActions = actionItems.filter(isActionOpen);
  const blockedReviews = reviewRecords.filter((record) => record.blocked && isReviewOpen(record));

  return {
    openReviewCount: openReviews.length,
    openActionCount: openActions.length,
    blockedReviewCount: blockedReviews.length,
    latestReviewDate:
      [...reviewRecords]
        .sort((left, right) => startOfDay(right.reviewDate) - startOfDay(left.reviewDate))[0]?.reviewDate ?? null,
  };
}

export function createReviewDecisionRows(styleAggregates: StyleAggregate[], referenceDate: string): ReviewDecisionRow[] {
  return styleAggregates
    .flatMap((aggregate) =>
      aggregate.reviewRecords.map((review) => {
        const relatedActions = aggregate.actionItems.filter((action) => action.reviewId === review.reviewId);
        const openActionCount = relatedActions.filter(isActionOpen).length;

        return {
          reviewId: review.reviewId,
          styleId: aggregate.style.styleId,
          skuCode: aggregate.style.skuCode,
          styleName: aggregate.style.styleDisplayName,
          seriesName: aggregate.series?.seriesName ?? aggregate.style.seriesId,
          categoryName: aggregate.style.categoryName,
          waveId: aggregate.style.waveId,
          reviewDate: review.reviewDate,
          reviewType: review.reviewType,
          conclusion: review.conclusion,
          issueDescription: review.issueDescription,
          changeRequest: review.changeRequest,
          owner: review.owner,
          dueDate: review.dueDate,
          blocked: review.blocked || aggregate.style.blocked,
          impactScope: review.impactScope,
          nextReviewDate: review.nextReviewDate,
          closed: review.closed,
          openActionCount,
          actionStatuses: relatedActions.map((action) => action.status),
          overdue: !review.closed && isPastDue(review.dueDate, referenceDate),
          dueThisWeek: !review.closed && (isSameWeek(review.dueDate, referenceDate) || isSameWeek(review.nextReviewDate, referenceDate)),
        };
      }),
    )
    .sort((left, right) => {
      if (left.blocked !== right.blocked) return left.blocked ? -1 : 1;
      if (left.closed !== right.closed) return left.closed ? 1 : -1;
      return startOfDay(left.dueDate) - startOfDay(right.dueDate);
    });
}

export function createReviewActionRows(styleAggregates: StyleAggregate[], referenceDate: string): ReviewActionRow[] {
  return styleAggregates
    .flatMap((aggregate) =>
      aggregate.actionItems.map((action) => {
        const review = aggregate.reviewRecords.find((record) => record.reviewId === action.reviewId) ?? null;
        return {
          actionId: action.actionId,
          reviewId: action.reviewId,
          styleId: aggregate.style.styleId,
          skuCode: aggregate.style.skuCode,
          styleName: aggregate.style.styleDisplayName,
          seriesName: aggregate.series?.seriesName ?? aggregate.style.seriesId,
          categoryName: aggregate.style.categoryName,
          waveId: aggregate.style.waveId,
          reviewType: review?.reviewType ?? null,
          conclusion: review?.conclusion ?? null,
          actionType: action.actionType,
          actionDescription: action.actionDescription,
          status: action.status,
          owner: action.owner,
          dueDate: action.dueDate,
          completedAt: action.completedAt,
          reapproved: action.reapproved,
          blocked: aggregate.style.blocked || review?.blocked || false,
          impactScope: review?.impactScope ?? aggregate.style.designSummary,
          nextReviewDate: review?.nextReviewDate ?? aggregate.style.nextReviewDate,
          overdue: isActionOpen(action) && isPastDue(action.dueDate, referenceDate),
          dueThisWeek: isActionOpen(action) && (isSameWeek(action.dueDate, referenceDate) || isSameWeek(review?.nextReviewDate, referenceDate)),
        };
      }),
    )
    .sort((left, right) => {
      if (left.blocked !== right.blocked) return left.blocked ? -1 : 1;
      if (isActionOpen({ status: left.status } as ActionItem) !== isActionOpen({ status: right.status } as ActionItem)) {
        return isActionOpen({ status: left.status } as ActionItem) ? -1 : 1;
      }
      return startOfDay(left.dueDate) - startOfDay(right.dueDate);
    });
}

export function summarizeReviewDecisionCenter(reviewRows: ReviewDecisionRow[], actionRows: ReviewActionRow[]): ReviewDecisionCenterSummary {
  return {
    openReviewCount: reviewRows.filter((row) => !row.closed).length,
    openActionCount: actionRows.filter((row) => row.status !== 'closed').length,
    blockedCount: reviewRows.filter((row) => row.blocked || row.openActionCount > 0 && row.actionStatuses.includes('in_progress')).length,
    dueThisWeekReviewCount: reviewRows.filter((row) => row.dueThisWeek).length,
    dueThisWeekActionCount: actionRows.filter((row) => row.dueThisWeek).length,
    overdueActionCount: actionRows.filter((row) => row.overdue).length,
  };
}
