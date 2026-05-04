export type WorkflowTabKey =
  | 'overview'
  | 'themeStrategy'
  | 'productArchitecture'
  | 'developmentTaskPool'
  | 'developmentGateTable'
  | 'designVersionPreview'
  | 'reviewDecisionCenter';

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
    description: '用驾驶舱视角看本季开发总盘、关键阻塞、锁定率和本周必须拍板事项。',
  },
  {
    key: 'themeStrategy',
    label: '主题与系列策略',
    icon: '🎨',
    description: '把目标人群、使用场景、主题语言、材料颜色和底楦方向放到系列策略语境里统一判断。',
  },
  {
    key: 'productArchitecture',
    label: '产品架构',
    icon: '🧱',
    description: '以系列、品类和平台策略为主线确认 SKU 宽度、开发级别、共底共楦与模具投入。',
  },
  {
    key: 'developmentTaskPool',
    label: '开发任务池',
    icon: '📁',
    description: '用单款任务池跟进设计、样鞋、材料、成本和技术状态，适合周会直接推进。',
  },
  {
    key: 'developmentGateTable',
    label: '波段与研发 Gate 表',
    icon: '🗓️',
    description: '按企划、设计、开发、成本和上市承接节点管理 Gate，明确计划、实际、风险和责任人。',
  },
  {
    key: 'designVersionPreview',
    label: '设计版本预览',
    icon: '🖼️',
    description: '围绕版本链、材料配色和评审结论判断图到物的一致性，并保留每轮修改说明。',
  },
  {
    key: 'reviewDecisionCenter',
    label: '评审决议中心',
    icon: '✅',
    description: '把评审结论、动作闭环、本周待复审和阻塞项收在最后一站统一推进。',
  },
];
