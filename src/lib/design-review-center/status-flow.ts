// 状态流转规则：定义每个阶段可以流转到哪些下一阶段
export const STATUS_FLOW: Record<string, string[]> = {
  planning: ['concept'],
  concept: ['prototype', 'planning'],
  prototype: ['sample_review', 'concept'],
  prototype_review: ['sample_review', 'prototype'],
  sample_review: ['costing', 'prototype'],
  costing: ['locked', 'sample_review'],
  costing_review: ['locked', 'costing'],
  locked: ['completed'],
  completed: [],
};

// 各阶段操作权限
export const STATUS_PERMISSIONS: Record<string, string[]> = {
  planning: ['planner', 'director'],
  concept: ['designer', 'planner'],
  prototype: ['designer'],
  prototype_review: ['designer', 'director'],
  sample_review: ['director', 'planner'],
  costing: ['planner'],
  costing_review: ['planner', 'director'],
  locked: ['director'],
  completed: ['director'],
};

export function canTransition(from: string, to: string): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false;
}

export function getNextStages(current: string): string[] {
  return STATUS_FLOW[current] ?? [];
}

export function hasPermission(stage: string, role: string): boolean {
  return STATUS_PERMISSIONS[stage]?.includes(role) ?? false;
}
