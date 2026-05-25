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
    description: '查看设计企划整体健康度、商品企划输入承接、风险和关键动作。',
  },
  {
    key: 'themeStrategy',
    label: '主题与系列策略',
    icon: '🎨',
    description: '定义本季主题、系列角色、目标人群、设计语言、材料、色彩和底型方向。',
  },
  {
    key: 'productArchitecture',
    label: '产品架构',
    icon: '🧱',
    description: '将商品企划输入拆解为系列、品类、鞋型、价格带、成本带和产品角色。',
  },
  {
    key: 'developmentTaskPool',
    label: '开发任务池',
    icon: '📁',
    description: '承接产品架构、波段研发节点、评审决议和商品企划输入，管理设计、样鞋、材料、成本、BOM和技术任务。',
  },
  {
    key: 'developmentGateTable',
    label: '波段研发节点',
    icon: '🗓️',
    description: '按波段管控研发节点、关键路径、延期阻塞、责任人、SLA和上市影响。',
  },
  {
    key: 'designVersionPreview',
    label: '设计版本',
    icon: '🖼️',
    description: '管理款式版本链、版本对比、素材完整度、商品企划匹配和提交评审准备。',
  },
  {
    key: 'reviewDecisionCenter',
    label: '评审决议',
    icon: '✅',
    description: '记录评审结论、修改动作、复审计划、通过/驳回/砍款/延期，并反馈商品企划。',
  },
];
