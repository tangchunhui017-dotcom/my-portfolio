export const FILTER_PRESETS = [
  { key: 'showMine', label: '只看我负责' },
  { key: 'showHighRiskOnly', label: '只看高风险' },
  { key: 'showOverdueOnly', label: '只看逾期' },
  { key: 'showThisWeekOnly', label: '本周待办' },
  { key: 'clear', label: '清除筛选' },
] as const;

export type FilterPresetKey = (typeof FILTER_PRESETS)[number]['key'];
