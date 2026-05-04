export const DASHBOARD_DEFAULT_BRAND = 'OpenClaw Footwear';

export const DASHBOARD_BRAND_OPTIONS = [{ value: DASHBOARD_DEFAULT_BRAND, label: DASHBOARD_DEFAULT_BRAND }] as const;

export const DASHBOARD_CATEGORY_L1_OPTIONS = [
  { value: '男鞋', label: '男鞋' },
  { value: '女鞋', label: '女鞋' },
  { value: '童鞋', label: '童鞋' },
  { value: '中性鞋', label: '中性鞋' },
] as const;

export function resolveDashboardBrand(brandName?: string | null) {
  return String(brandName || '').trim() || DASHBOARD_DEFAULT_BRAND;
}

export function matchesDashboardBrand(filterBrand: string | 'all', brandName?: string | null) {
  if (filterBrand === 'all') return true;
  return resolveDashboardBrand(brandName) === filterBrand;
}

export function resolveDashboardCategoryL1(gender?: string | null) {
  const normalized = String(gender || '').trim();
  if (normalized.includes('童')) return '童鞋';
  if (normalized.includes('男')) return '男鞋';
  if (normalized.includes('女')) return '女鞋';
  if (normalized.includes('中性')) return '中性鞋';
  return '其他';
}

export function matchesDashboardCategoryL1(filterCategoryL1: string | 'all', gender?: string | null) {
  if (filterCategoryL1 === 'all') return true;
  return resolveDashboardCategoryL1(gender) === filterCategoryL1;
}
