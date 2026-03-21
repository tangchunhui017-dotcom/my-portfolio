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
    description: '先看季节总览、关键节点和本周重点，快速掌握整体进度。',
  },
  {
    key: 'themeDirection',
    label: '主题方向',
    icon: '🎨',
    description: '先看品牌长期风格、市场趋势、情绪板与 CMF 方向，把设计意图讲清楚。',
  },
  {
    key: 'productArchitecture',
    label: '产品架构',
    icon: '🧱',
    description: '先看整季总架构，再看系列架构板，确认角色、价格带与共底共楦策略。',
  },
  {
    key: 'categoryBreakdown',
    label: '开发品类分解',
    icon: '🗂️',
    description: '把系列拆到一级品类、二级品类和工艺画像，提前看清开发难点。',
  },
  {
    key: 'developmentWaveTable',
    label: '产品研发波段表',
    icon: '🗓️',
    description: '从上市时间倒推材料锁定、工艺包与开模关键路径，收紧开发节奏。',
  },
  {
    key: 'effectPreview',
    label: '设计效果预览',
    icon: '🖼️',
    description: '集中查看草图、效果图、样鞋实拍与辅助板，判断图到物的一致性。',
  },
  {
    key: 'reviewActions',
    label: '评审与动作',
    icon: '✅',
    description: '保留样鞋评审、风险、待办和动作队列，形成推进闭环。',
  },
];
