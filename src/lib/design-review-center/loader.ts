import { promises as fs } from 'fs';
import path from 'path';
import type {
  Asset,
  DesignItem,
  DesignItemReviewSummary,
  Risk,
  SeasonOverview,
  Series,
  SeriesBrief,
  SeriesDevelopmentPlanRow,
  SyncConfig,
  Task,
  Timeline,
  Wave,
  WeeklySnapshot,
} from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'footwear-planning');

async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  const normalizedContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  return JSON.parse(normalizedContent) as T;
}

export async function loadSeasonOverview(): Promise<SeasonOverview> {
  return readJsonFile<SeasonOverview>('season-overview.json');
}

export async function loadTimeline(): Promise<Timeline> {
  return readJsonFile<Timeline>('timeline.json');
}

export async function loadWaves(): Promise<Wave[]> {
  const data = await readJsonFile<{ waves: Wave[] }>('waves.json');
  return data.waves;
}

export async function loadSeries(): Promise<Series[]> {
  const data = await readJsonFile<{ series: Series[] }>('series.json');
  return data.series;
}

export async function loadSeriesBriefs(): Promise<SeriesBrief[]> {
  const data = await readJsonFile<{ briefs: SeriesBrief[] }>('series-briefs.json');
  return data.briefs;
}

export async function loadAssets(): Promise<Asset[]> {
  const data = await readJsonFile<{ assets: Asset[] }>('assets.json');
  return data.assets;
}

export async function loadDesignItems(): Promise<DesignItem[]> {
  const data = await readJsonFile<{ designItems: DesignItem[] }>('design-items.json');
  return data.designItems;
}

export async function loadDesignItemReviews(): Promise<DesignItemReviewSummary[]> {
  const data = await readJsonFile<{ reviews: DesignItemReviewSummary[] }>('design-item-reviews.json');
  return data.reviews;
}

export async function loadRisks(): Promise<Risk[]> {
  const data = await readJsonFile<{ risks: Risk[] }>('risks.json');
  return data.risks;
}

export async function loadTasks(): Promise<Task[]> {
  const data = await readJsonFile<{ tasks: Task[] }>('tasks.json');
  return data.tasks;
}

export async function loadSeriesDevelopmentPlans(): Promise<SeriesDevelopmentPlanRow[]> {
  const data = await readJsonFile<{ plans: SeriesDevelopmentPlanRow[] }>('series-development-plans.json');
  return data.plans;
}

export async function loadWeeklySnapshot(): Promise<WeeklySnapshot> {
  return readJsonFile<WeeklySnapshot>('weekly-snapshot.json');
}

export async function loadSyncConfig(): Promise<SyncConfig> {
  return readJsonFile<SyncConfig>('sync-config.json');
}
