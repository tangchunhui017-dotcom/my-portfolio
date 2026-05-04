import { promises as fs } from 'fs';
import path from 'path';
import type { ActionItem, CategoryPlan, DesignAsset, GateNode, OTBStructure, Project, ReviewRecord, Series, StyleDevelopment, Wave } from './types';
import { normalizeRiskLevel } from './helpers/status';

const DATA_DIR = path.join(process.cwd(), 'data', 'footwear-planning');

async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  const normalizedContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  return JSON.parse(normalizedContent) as T;
}

export async function loadProjects(): Promise<Project[]> {
  const data = await readJsonFile<{ projects: Project[] }>('projects.json');
  return data.projects;
}

export async function loadSeries(): Promise<Series[]> {
  const data = await readJsonFile<{ series: Series[] }>('series.json');
  return data.series.map((record) => ({
    ...record,
    riskLevel: normalizeRiskLevel(record.riskLevel),
  }));
}

export async function loadCategoryPlans(): Promise<CategoryPlan[]> {
  const data = await readJsonFile<{ categoryPlans: CategoryPlan[] }>('category-plans.json');
  return data.categoryPlans;
}

export async function loadStyleDevelopments(): Promise<StyleDevelopment[]> {
  const data = await readJsonFile<{ styles: StyleDevelopment[] }>('style-developments.json');
  return data.styles.map((record) => ({
    ...record,
    riskLevel: normalizeRiskLevel(record.riskLevel),
  }));
}

export async function loadGateNodes(): Promise<GateNode[]> {
  const data = await readJsonFile<{ gateNodes: GateNode[] }>('gate-nodes.json');
  return data.gateNodes;
}

export async function loadDesignAssets(): Promise<DesignAsset[]> {
  const data = await readJsonFile<{ assets: DesignAsset[] }>('design-assets.json');
  return data.assets;
}

export async function loadReviewRecords(): Promise<ReviewRecord[]> {
  const data = await readJsonFile<{ reviewRecords: ReviewRecord[] }>('review-records.json');
  return data.reviewRecords;
}

export async function loadActionItems(): Promise<ActionItem[]> {
  const data = await readJsonFile<{ actionItems: ActionItem[] }>('action-items.json');
  return data.actionItems;
}

export async function loadWaves(): Promise<Wave[]> {
  const data = await readJsonFile<{ waves: Wave[] }>('waves.json');
  return data.waves;
}

export async function loadOTBStructures(): Promise<OTBStructure[]> {
  const data = await readJsonFile<{ otbStructures: OTBStructure[] }>('otb-structures.json');
  return data.otbStructures;
}
