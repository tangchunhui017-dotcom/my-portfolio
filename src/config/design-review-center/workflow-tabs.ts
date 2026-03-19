export type WorkflowTabKey =
  | 'overview'
  | 'themeDirection'
  | 'productArchitecture'
  | 'categoryBreakdown'
  | 'developmentWaveTable'
  | 'effectPreview'
  | 'reviewActions';

export interface WorkflowTabDefinition {
  key: WorkflowTabKey;
  label: string;
  icon: string;
  description: string;
}

export const WORKFLOW_TABS: WorkflowTabDefinition[] = [
  {
    key: 'overview',
    label: '总览',
    icon: '📊',
    description: '先看数据快照、季节总览和本周重点快照，快速掌握整体进度。',
  },
  {
    key: 'themeDirection',
    label: '主题方向',
    icon: '🎨',
    description: '先看主题、情绪板、色彩和材料方向，把设计意图讲清楚。',
  },
  {
    key: 'productArchitecture',
    label: '产品架构',
    icon: '🧱',
    description: '围绕系列、角色、场景和价格带，确认本季鞋类产品骨架。',
  },
  {
    key: 'categoryBreakdown',
    label: '开发品类分解',
    icon: '🗂️',
    description: '把系列拆到开发品类和子类，明确每类开发数量与结构重点。',
  },
  {
    key: 'developmentWaveTable',
    label: '产品研发波段表',
    icon: '🗓️',
    description: '按波段和周次推进开发节奏，同时看阶段、成本、Tech Pack 与开模状态。',
  },
  {
    key: 'effectPreview',
    label: '设计效果预览',
    icon: '🖼️',
    description: '集中查看情绪板、材料板、楦底板、配色板和设计效果图。',
  },
  {
    key: 'reviewActions',
    label: '评审与动作',
    icon: '✅',
    description: '保留样鞋评审、风险、待办和 Action Queue，形成闭环。',
  },
];
