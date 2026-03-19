import type { OpenClawRecord, DesignReviewRecord } from './schema';

export interface DashboardDataSet {
  summaries: OpenClawRecord[];
  latestUpdate: string | null;
  agentCount: number;
}

export interface ReviewListItem {
  id: string;
  style_number: string;
  title: string;
  series: string;
  wave: string;
  category: string;
  product_role: string;
  occasion_tag: string;
  stage: string;
  conclusion: string;
  risk_level: string;
  updated_at: string;
}

export function normalizeDesignReviewForList(reviews: DesignReviewRecord[]): ReviewListItem[] {
  return reviews.map(r => ({
    id: r.id,
    style_number: r.style_number,
    title: r.title,
    series: r.series ?? '',
    wave: r.wave,
    category: r.category ?? '',
    product_role: r.product_role ?? '',
    occasion_tag: r.occasion_tag ?? '',
    stage: r.stage,
    conclusion: r.conclusion,
    risk_level: r.risk_level,
    updated_at: r.updated_at,
  }));
}
