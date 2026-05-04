export function startOfDay(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isPastDue(value: string | null | undefined, referenceDate: string) {
  return startOfDay(value) < startOfDay(referenceDate);
}

export function isSameWeek(value: string | null | undefined, referenceDate: string) {
  if (!value) return false;
  const target = startOfDay(value);
  if (!Number.isFinite(target)) return false;

  const baselineDate = new Date(referenceDate);
  const day = baselineDate.getDay() === 0 ? 7 : baselineDate.getDay();
  const weekStart = new Date(baselineDate);
  weekStart.setDate(baselineDate.getDate() - day + 1);
  const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();

  return target >= start && target < start + 7 * 24 * 60 * 60 * 1000;
}

export function extractYear(value: string | null | undefined) {
  if (!value) return '';
  const matched = value.match(/20\d{2}/);
  return matched?.[0] ?? '';
}

export function getQuarterFromDate(value: string | null | undefined) {
  if (!value) return '';
  const matched = value.match(/(20\d{2})-(\d{2})-\d{2}/);
  if (!matched) return '';
  return 'Q' + Math.ceil(Number(matched[2]) / 3);
}

export function getQuarterFromLaunchWindow(value: string | null | undefined) {
  if (!value) return '';
  const matched = value.match(/(20\d{2}-\d{2}-\d{2})/);
  return matched ? getQuarterFromDate(matched[1]) : '';
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '待定';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN');
}

export function pickLatestDate(values: Array<string | null | undefined>) {
  const valid = values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return valid[0] ?? new Date().toISOString().slice(0, 10);
}

export function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}
