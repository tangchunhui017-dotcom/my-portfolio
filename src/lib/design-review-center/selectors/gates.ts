import { startOfDay } from '@/lib/design-review-center/helpers/date';
import type { GateGroup, GateNode, RiskLevel, Stage, StyleAggregate } from '@/lib/design-review-center/types';

export interface GateTableRow {
  gateId: string;
  styleId: string;
  skuCode: string;
  styleName: string;
  seriesName: string;
  categoryName: string;
  waveId: string;
  waveName: string;
  gateGroup: GateGroup;
  gateType: GateNode['gateType'];
  gateName: string;
  plannedDate: string;
  actualDate: string | null;
  completed: boolean;
  delayed: boolean;
  blocked: boolean;
  owner: string;
  impactWave: string;
  note: string;
  currentStage: Stage;
  riskLevel: RiskLevel;
}

export interface GateWaveGroup {
  waveId: string;
  waveName: string;
  total: number;
  completed: number;
  delayed: number;
  blocked: number;
  rows: GateTableRow[];
}

export function sortGateNodes(gateNodes: GateNode[]) {
  return [...gateNodes].sort((left, right) => startOfDay(left.plannedDate) - startOfDay(right.plannedDate));
}

export function getNextGateByStyle(styleId: string, gateNodes: GateNode[]) {
  return sortGateNodes(gateNodes).find((gate) => gate.styleId === styleId && !gate.completed) ?? null;
}

export function summarizeGates(gateNodes: GateNode[]) {
  return {
    total: gateNodes.length,
    completed: gateNodes.filter((gate) => gate.completed).length,
    delayed: gateNodes.filter((gate) => gate.delayed).length,
    blocked: gateNodes.filter((gate) => gate.blocked).length,
  };
}

export function groupGateNodesByWave(gateNodes: GateNode[], styleWaveLookup: Record<string, string>) {
  return gateNodes.reduce<Record<string, GateNode[]>>((accumulator, gate) => {
    const waveId = styleWaveLookup[gate.styleId] ?? 'unknown';
    if (!accumulator[waveId]) accumulator[waveId] = [];
    accumulator[waveId].push(gate);
    return accumulator;
  }, {});
}

export function createGateTableRows(styleAggregates: StyleAggregate[]): GateTableRow[] {
  return styleAggregates
    .flatMap((aggregate) =>
      aggregate.gateNodes.map((gate) => ({
        gateId: gate.gateId,
        styleId: aggregate.style.styleId,
        skuCode: aggregate.style.skuCode,
        styleName: aggregate.style.styleDisplayName,
        seriesName: aggregate.series?.seriesName ?? aggregate.style.seriesId,
        categoryName: aggregate.style.categoryName,
        waveId: aggregate.style.waveId,
        waveName: aggregate.wave?.waveName ?? aggregate.style.waveId.toUpperCase(),
        gateGroup: gate.gateGroup,
        gateType: gate.gateType,
        gateName: gate.gateName,
        plannedDate: gate.plannedDate,
        actualDate: gate.actualDate,
        completed: gate.completed,
        delayed: gate.delayed,
        blocked: gate.blocked,
        owner: gate.owner,
        impactWave: gate.impactWave,
        note: gate.note,
        currentStage: aggregate.style.currentStage,
        riskLevel: aggregate.style.riskLevel,
      })),
    )
    .sort((left, right) => {
      const waveCompare = left.waveId.localeCompare(right.waveId);
      if (waveCompare !== 0) return waveCompare;
      return startOfDay(left.plannedDate) - startOfDay(right.plannedDate);
    });
}

export function createGateWaveGroups(styleAggregates: StyleAggregate[]): GateWaveGroup[] {
  const rows = createGateTableRows(styleAggregates);
  const grouped = rows.reduce<Record<string, GateTableRow[]>>((accumulator, row) => {
    if (!accumulator[row.waveId]) accumulator[row.waveId] = [];
    accumulator[row.waveId].push(row);
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .map(([waveId, waveRows]) => ({
      waveId,
      waveName: waveRows[0]?.waveName ?? waveId.toUpperCase(),
      total: waveRows.length,
      completed: waveRows.filter((row) => row.completed).length,
      delayed: waveRows.filter((row) => row.delayed).length,
      blocked: waveRows.filter((row) => row.blocked).length,
      rows: waveRows,
    }))
    .sort((left, right) => left.waveId.localeCompare(right.waveId));
}
