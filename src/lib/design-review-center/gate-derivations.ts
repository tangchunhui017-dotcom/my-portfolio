import type { GateTableRow, GateWaveGroup } from './selectors/gates';

// ─── Gantt ─────────────────────────────────────────────────────────────────────

export type GanttStatus = 'done' | 'inprogress' | 'dueSoon' | 'overdue' | 'blocked' | 'pending';

export interface GateGanttItem {
  gateId: string;
  gateName: string;
  gateShortName: string;
  waveId: string;
  waveName: string;
  gateGroup: string;
  gateGroupName: string;
  planStart: string;
  planEnd: string;
  actualEnd: string | null;
  status: GanttStatus;
  isCriticalPath: boolean;
  predecessorIds: string[];
  // Enhanced fields for view / click / tooltip
  owner: string;
  priority: string;
  styleId: string;
  styleName: string;
  categoryName: string;
  delayDays: number;
  dueInDays: number;
  launchImpact: boolean;
  impactScope: string[];
  closeCriteria: string;
  nextAction: string;
}

// ─── Dependency graph ─────────────────────────────────────────────────────────

export interface GateDependencyNode {
  gateId: string;
  gateName: string;
  gateShortName: string;
  waveName: string;
  status: GanttStatus;
  isBlocking: boolean;
  gateGroup: string;
  gateGroupName: string;
  styleName: string;
  owner: string;
  plannedDate: string;
  delayDays: number;
  dueInDays: number;
  priority: string;
  nextAction: string;
  closeCriteria: string;
  impactScope: string[];
  dependencyDescription: string;
}

export interface GateDependencyLink {
  from: string;
  to: string;
  fromGateName: string;
  toGateName: string;
  depType: string;
  blockerReason: string;
  affectedWave: string;
  recommendedAction: string;
}

export interface GateDependencyData {
  nodes: GateDependencyNode[];
  links: GateDependencyLink[];
}

// ─── Resource load ─────────────────────────────────────────────────────────────

export interface ResourceLoad {
  owner: string;
  activeGateCount: number;
  overdueGateCount: number;
  completedGateCount: number;
  loadPct: number;
  capacity: number;
  gates: GateTableRow[];
}

// ─── SLA ──────────────────────────────────────────────────────────────────────

export interface GateSlaByGroup {
  gateGroup: string;
  groupName: string;
  avgDelayDays: number;
  count: number;
  onTimeCount: number;
  onTimeRate: number;
}

export interface GateSlaData {
  avgOverdueDays: number;
  onTimeRate: number;
  deltaDaysVsLastSeason: number;
  deltaRateVsLastSeason: number;
  byGroup: GateSlaByGroup[];
  trendWeeks: string[];
  trendPassRates: number[];
}

// ─── Static configs ────────────────────────────────────────────────────────────

const GATE_TYPE_SHORT: Partial<Record<string, string>> = {
  brief_lock: '企划锁定',
  wave_alignment: '波段对齐',
  series_direction: '系列方向',
  concept_complete: '概念完成',
  design_review: '设计评审',
  prototype_confirm: '原型确认',
  first_sample_review: '首样评审',
  second_sample_adjustment: '二样调整',
  last_confirm: '楦型确认',
  outsole_confirm: '底台确认',
  structure_confirm: '结构确认',
  tech_pack_output: 'Tech Pack',
  tooling_confirm: '开模确认',
  target_cost_confirm: '目标成本',
  sample_cost_review: '样品核价',
  cost_down_action: '降本行动',
  bom_lock: 'BOM 锁定',
  long_lead_material_lock: '长周期材料',
  lead_style_lock: '主推款锁定',
  marketing_sample_prepare: '拍摄样',
  launch_asset_prepare: '上市资料',
};

// Logical predecessor map: each gate type depends on which other gate types (within same wave)
const GATE_TYPE_PREDECESSORS: Partial<Record<string, string[]>> = {
  wave_alignment: ['brief_lock'],
  series_direction: ['wave_alignment'],
  concept_complete: ['series_direction'],
  design_review: ['concept_complete'],
  prototype_confirm: ['design_review'],
  outsole_confirm: ['design_review'],
  structure_confirm: ['design_review'],
  last_confirm: ['prototype_confirm'],
  tech_pack_output: ['outsole_confirm', 'last_confirm', 'structure_confirm'],
  tooling_confirm: ['outsole_confirm', 'last_confirm'],
  first_sample_review: ['tech_pack_output'],
  second_sample_adjustment: ['first_sample_review'],
  long_lead_material_lock: ['design_review'],
  target_cost_confirm: ['tech_pack_output'],
  sample_cost_review: ['second_sample_adjustment'],
  cost_down_action: ['sample_cost_review'],
  bom_lock: ['cost_down_action'],
  lead_style_lock: ['bom_lock'],
  marketing_sample_prepare: ['second_sample_adjustment'],
  launch_asset_prepare: ['marketing_sample_prepare', 'bom_lock'],
};

const GROUP_ORDER = ['planning', 'design', 'development', 'cost', 'launch'] as const;

const GROUP_NAME: Record<string, string> = {
  planning: '企划',
  design: '设计',
  development: '开发',
  cost: '成本',
  launch: '上市',
};

function rowToGanttStatus(row: GateTableRow): GanttStatus {
  if (row.completed) return 'done';
  if (row.blocked) return 'blocked';
  if (row.normalizedStatus === 'delayed') return 'overdue';
  if (row.dueInDays >= 0 && row.dueInDays <= 7) return 'dueSoon';
  if (row.dueInDays <= 14) return 'inprogress';
  return 'pending';
}

function resolveImpactScope(row: GateTableRow): string[] {
  const impacts: string[] = [];
  if (row.businessImpact.launch) impacts.push('上市');
  if (row.businessImpact.sample) impacts.push('样品');
  if (row.businessImpact.cost) impacts.push('成本');
  if (row.businessImpact.bom) impacts.push('BOM');
  if (row.businessImpact.otb) impacts.push('OTB');
  if (row.businessImpact.tooling) impacts.push('开模');
  return impacts.length > 0 ? impacts : [GROUP_NAME[row.gateGroup] ?? row.gateGroup];
}

function resolveCloseCriteria(row: GateTableRow): string {
  const missing = row.missingDeliverables
    .filter((item) => item.required)
    .slice(0, 2)
    .map((item) => item.label);

  if (missing.length > 0) {
    return `补齐 ${missing.join('、')}，由 ${row.owner} 确认后关闭`;
  }

  const exit = row.exitCriteria[0]?.label;
  if (exit) return exit;

  return '责任人提交完成确认，评审会议确认后关闭';
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildGanttItems(groups: GateWaveGroup[]): GateGanttItem[] {
  return groups
    .flatMap((group) =>
      group.rows.map((row): GateGanttItem => {
        const status = rowToGanttStatus(row);
        const planEndMs = new Date(row.plannedDate).getTime() + 2 * 86400000;
        const planEnd = new Date(planEndMs).toISOString().slice(0, 10);
        const isCriticalPath =
          row.priority === 'P0' ||
          (row.priority === 'P1' && row.businessImpact.launch);

        const predecessorTypes = GATE_TYPE_PREDECESSORS[row.gateType] ?? [];
        const predecessorIds = group.rows
          .filter((r) => predecessorTypes.includes(r.gateType))
          .map((r) => r.gateId);

        return {
          gateId: row.gateId,
          gateName: row.gateName,
          gateShortName: GATE_TYPE_SHORT[row.gateType] ?? row.gateName.slice(0, 5),
          waveId: row.waveId,
          waveName: row.waveName,
          gateGroup: row.gateGroup,
          gateGroupName: GROUP_NAME[row.gateGroup] ?? row.gateGroup,
          planStart: row.plannedDate,
          planEnd: row.actualDate ?? planEnd,
          actualEnd: row.actualDate,
          status,
          isCriticalPath,
          predecessorIds,
          owner: row.owner,
          priority: row.priority,
          styleId: row.styleId,
          styleName: row.styleName,
          categoryName: row.categoryName,
          delayDays: row.delayDays,
          dueInDays: row.dueInDays,
          launchImpact: row.businessImpact.launch,
          impactScope: resolveImpactScope(row),
          closeCriteria: resolveCloseCriteria(row),
          nextAction: row.nextAction,
        };
      }),
    )
    .sort((a, b) => {
      if (a.waveId !== b.waveId) return a.waveId.localeCompare(b.waveId);
      return (
        GROUP_ORDER.indexOf(a.gateGroup as (typeof GROUP_ORDER)[number]) -
        GROUP_ORDER.indexOf(b.gateGroup as (typeof GROUP_ORDER)[number])
      );
    });
}

export function buildDependencyData(groups: GateWaveGroup[]): GateDependencyData {
  const nodes: GateDependencyNode[] = [];
  const links: GateDependencyLink[] = [];

  groups.forEach((group) => {
    group.rows.forEach((row) => {
      const status = rowToGanttStatus(row);

      nodes.push({
        gateId: row.gateId,
        gateName: row.gateName,
        gateShortName:
          (GATE_TYPE_SHORT[row.gateType] ?? row.gateName.slice(0, 5)) +
          '\n' +
          row.waveName,
        waveName: row.waveName,
        status,
        isBlocking: row.blocked || (row.normalizedStatus === 'delayed' && row.priority === 'P0'),
        gateGroup: row.gateGroup,
        gateGroupName: GROUP_NAME[row.gateGroup] ?? row.gateGroup,
        styleName: row.styleName,
        owner: row.owner,
        plannedDate: row.plannedDate,
        delayDays: row.delayDays,
        dueInDays: row.dueInDays,
        priority: row.priority,
        nextAction: row.nextAction,
        closeCriteria: resolveCloseCriteria(row),
        impactScope: resolveImpactScope(row),
        dependencyDescription: row.dependencySummary.description,
      });

      const predecessorTypes = GATE_TYPE_PREDECESSORS[row.gateType] ?? [];
      group.rows.forEach((pred) => {
        if (predecessorTypes.includes(pred.gateType)) {
          links.push({
            from: pred.gateId,
            to: row.gateId,
            fromGateName: pred.gateName,
            toGateName: row.gateName,
            depType: '前置依赖',
            blockerReason: pred.blocked ? pred.riskReason : '',
            affectedWave: row.waveName,
            recommendedAction: pred.blocked
              ? `先解除 ${pred.gateName} 阻塞，再推进 ${row.gateName}`
              : `按计划推进 ${row.gateName}`,
          });
        }
      });
    });
  });

  return { nodes, links };
}

export function buildResourceLoads(groups: GateWaveGroup[]): ResourceLoad[] {
  const allRows = groups.flatMap((g) => g.rows);
  const ownerMap = new Map<string, GateTableRow[]>();

  allRows.forEach((row) => {
    if (!ownerMap.has(row.owner)) ownerMap.set(row.owner, []);
    ownerMap.get(row.owner)!.push(row);
  });

  const CAPACITY = 5;

  return Array.from(ownerMap.entries())
    .map(([owner, gates]): ResourceLoad => {
      const active = gates.filter((g) => !g.completed);
      const overdue = active.filter(
        (g) => g.normalizedStatus === 'delayed' || g.blocked,
      );
      const done = gates.filter((g) => g.completed);
      return {
        owner,
        activeGateCount: active.length,
        overdueGateCount: overdue.length,
        completedGateCount: done.length,
        loadPct: Math.min(120, Math.round((active.length / CAPACITY) * 100)),
        capacity: CAPACITY,
        gates: active,
      };
    })
    .sort((a, b) => b.activeGateCount - a.activeGateCount);
}

export function buildSlaData(groups: GateWaveGroup[], referenceDate: string): GateSlaData {
  const allRows = groups.flatMap((g) => g.rows);
  const delayed = allRows.filter((r) => r.delayDays > 0 && !r.completed);
  const completed = allRows.filter((r) => r.completed);

  const avgOverdueDays =
    delayed.length > 0
      ? Math.round(delayed.reduce((s, r) => s + r.delayDays, 0) / delayed.length)
      : 0;

  const onTimeCount = completed.filter((r) => r.actualDelayDays === 0).length;
  const onTimeRate =
    completed.length > 0 ? Math.round((onTimeCount / completed.length) * 100) : 0;

  const byGroup: GateSlaByGroup[] = GROUP_ORDER.map((group) => {
    const rows = allRows.filter((r) => r.gateGroup === group);
    const delayedRows = rows.filter((r) => r.delayDays > 0);
    const avgDelay =
      delayedRows.length > 0
        ? Math.round(delayedRows.reduce((s, r) => s + r.delayDays, 0) / delayedRows.length)
        : 0;
    const groupDone = rows.filter((r) => r.completed);
    const onTime = groupDone.filter((r) => r.actualDelayDays === 0).length;
    const onTimeR =
      groupDone.length > 0 ? Math.round((onTime / groupDone.length) * 100) : 0;
    return {
      gateGroup: group,
      groupName: GROUP_NAME[group] ?? group,
      avgDelayDays: avgDelay,
      count: rows.length,
      onTimeCount: onTime,
      onTimeRate: onTimeR,
    };
  }).filter((g) => g.count > 0);

  // Last 6 weeks trend (mock, seeded from real metrics)
  const refMs = new Date(referenceDate).getTime();
  const trendWeeks: string[] = [];
  const trendPassRates: number[] = [];
  const seed = onTimeRate;
  for (let w = 5; w >= 0; w--) {
    const d = new Date(refMs - w * 7 * 86400000);
    trendWeeks.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const rate = Math.max(0, Math.min(100, seed - w * 3 + (w % 2 === 0 ? 5 : -3)));
    trendPassRates.push(rate);
  }

  return {
    avgOverdueDays,
    onTimeRate,
    deltaDaysVsLastSeason: Math.max(1, Math.round(avgOverdueDays * 0.25)),
    deltaRateVsLastSeason: -Math.max(1, Math.round((100 - onTimeRate) * 0.12)),
    byGroup: byGroup.sort((a, b) => b.avgDelayDays - a.avgDelayDays),
    trendWeeks,
    trendPassRates,
  };
}
