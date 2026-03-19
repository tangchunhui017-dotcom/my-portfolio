export type WorkbenchSection =
  | 'overview'
  | 'waveBoard'
  | 'timeline'
  | 'riskTasks'
  | 'assetWall'
  | 'itemTable'
  | 'focusItems';

export type WorkbenchPresetKey = 'planning' | 'design' | 'development';

export interface WorkbenchPresetQuickFilters {
  showMine: boolean;
  showHighRiskOnly: boolean;
  showOverdueOnly: boolean;
  showThisWeekOnly: boolean;
  phase: string;
}

export interface WorkbenchPreset {
  key: WorkbenchPresetKey;
  label: string;
  description: string;
  snapshotTitle: string;
  snapshotDescription: string;
  sectionOrder: WorkbenchSection[];
  defaultFilters: Partial<WorkbenchPresetQuickFilters>;
}

export const WORKBENCH_PRESETS: WorkbenchPreset[] = [
  {
    key: 'planning',
    label: '\u5546\u54c1\u4f01\u5212',
    description: '\u524d\u7f6e\u6ce2\u6bb5\u7cfb\u5217\u3001\u4ea7\u54c1\u6784\u67b6\u4e0e\u5e02\u573a\u98ce\u9669\u3002',
    snapshotTitle: '\u4f01\u5212\u91cd\u70b9\u5feb\u7167',
    snapshotDescription: '\u4f18\u5148\u770b\u7cfb\u5217\u7ed3\u6784\u3001\u91cd\u70b9\u5355\u6b3e\u548c\u672c\u5468\u9700\u8981\u62cd\u677f\u7684\u98ce\u9669\u4e8b\u9879\u3002',
    sectionOrder: ['overview', 'waveBoard', 'timeline', 'riskTasks', 'focusItems', 'assetWall', 'itemTable'],
    defaultFilters: { showThisWeekOnly: true },
  },
  {
    key: 'design',
    label: '\u8bbe\u8ba1\u5e08',
    description: '\u524d\u7f6e\u56fe\u50cf\u8d44\u4ea7\u3001\u5355\u6b3e\u8bc4\u5ba1\u548c\u8bbe\u8ba1\u5f85\u529e\u3002',
    snapshotTitle: '\u8bbe\u8ba1\u91cd\u70b9\u5feb\u7167',
    snapshotDescription: '\u4f18\u5148\u770b\u56fe\u50cf\u8d44\u4ea7\u3001\u5f85\u590d\u5ba1\u5355\u6b3e\u548c\u672c\u8f6e\u8bbe\u8ba1\u4fee\u6539\u91cd\u70b9\u3002',
    sectionOrder: ['overview', 'assetWall', 'itemTable', 'focusItems', 'waveBoard', 'timeline', 'riskTasks'],
    defaultFilters: { showMine: true },
  },
  {
    key: 'development',
    label: '\u5f00\u53d1/\u4f9b\u5e94\u94fe',
    description: '\u524d\u7f6e\u65f6\u95f4\u8f74\u3001\u6210\u672c\u8282\u70b9\u4e0e\u5f00\u6a21\u98ce\u9669\u3002',
    snapshotTitle: '\u5f00\u53d1\u91cd\u70b9\u5feb\u7167',
    snapshotDescription: '\u4f18\u5148\u770b Tech Pack\u3001\u5f00\u6a21\u8282\u70b9\u3001\u6210\u672c\u8bc4\u5ba1\u4e0e\u672c\u5468\u4ea4\u4ed8\u98ce\u9669\u3002',
    sectionOrder: ['overview', 'timeline', 'riskTasks', 'focusItems', 'itemTable', 'waveBoard', 'assetWall'],
    defaultFilters: { showHighRiskOnly: true, showOverdueOnly: true },
  },
];