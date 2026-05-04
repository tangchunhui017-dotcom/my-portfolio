export type WorkbenchSection =
  | 'overview'
  | 'waveBoard'
  | 'timeline'
  | 'riskTasks'
  | 'assetWall'
  | 'itemTable'
  | 'focusItems';

export type WorkbenchPresetKey = 'planning' | 'design' | 'development';

export type WorkbenchPresetDefaultFilters = Record<string, never>;

export interface WorkbenchPreset {
  key: WorkbenchPresetKey;
  label: string;
  description: string;
  snapshotTitle: string;
  snapshotDescription: string;
  sectionOrder: WorkbenchSection[];
  defaultFilters: WorkbenchPresetDefaultFilters;
}

export const WORKBENCH_PRESETS: WorkbenchPreset[] = [
  {
    key: 'planning',
    label: '商品企划',
    description: '前置波段系列、产品架构与市场风险。',
    snapshotTitle: '企划重点快照',
    snapshotDescription: '优先看系列结构、重点单款和本周需要拍板的风险事项。',
    sectionOrder: ['overview', 'waveBoard', 'timeline', 'riskTasks', 'focusItems', 'assetWall', 'itemTable'],
    defaultFilters: {},
  },
  {
    key: 'design',
    label: '设计师',
    description: '前置图像资产、单款评审和设计待办。',
    snapshotTitle: '设计重点快照',
    snapshotDescription: '优先看图像资产、待复审单款和本轮设计修改重点。',
    sectionOrder: ['overview', 'assetWall', 'itemTable', 'focusItems', 'waveBoard', 'timeline', 'riskTasks'],
    defaultFilters: {},
  },
  {
    key: 'development',
    label: '开发/供应链',
    description: '前置时间轴、成本节点与开模风险。',
    snapshotTitle: '开发重点快照',
    snapshotDescription: '优先看 Tech Pack、开模节点、成本评审与本周交付风险。',
    sectionOrder: ['overview', 'timeline', 'riskTasks', 'focusItems', 'itemTable', 'waveBoard', 'assetWall'],
    defaultFilters: {},
  },
];
