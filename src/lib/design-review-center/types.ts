export type MilestoneGateType =
  | 'concept_review'
  | 'prototype_review'
  | 'sample_review'
  | 'costing_review'
  | 'final_lock'
  | 'target_cost_estimate'
  | 'sample_cost_review'
  | 'final_bom_lock'
  | 'tech_pack_handoff'
  | 'tooling_review';

export type MilestoneTrack = 'design_track' | 'cost_track' | 'development_track';

export type MilestoneCheckpointType = 'review' | 'cost' | 'handoff' | 'tooling' | 'lock';

export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'at_risk'
  | 'delayed'
  | 'completed';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DesignPhase =
  | 'planning'
  | 'concept'
  | 'prototype'
  | 'prototype_review'
  | 'sample_review'
  | 'costing'
  | 'costing_review'
  | 'locked'
  | 'completed';

export type ReviewStatus = 'pending' | 'pass' | 'review' | 'fail';

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface SeasonOverview {
  season: string;
  currentWave: string;
  currentOwner?: string;
  milestoneCountdown: {
    nextMilestone: string;
    daysLeft: number;
  };
  totalSeries: number;
  activeSeries: number;
  completedSeries: number;
  delayedMilestones: number;
  highRiskItems: number;
  assetCompletionRate: number;
  designHealthScore: number;
}

export interface Milestone {
  milestoneId: string;
  title: string;
  gateType: MilestoneGateType;
  track: MilestoneTrack;
  checkpointType: MilestoneCheckpointType;
  parallelGroup?: string;
  plannedDate: string;
  actualDate: string | null;
  status: MilestoneStatus;
  owner: string;
  riskLevel: RiskLevel;
  dependsOn: string[];
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  updatedBy: string;
  syncStatus: SyncStatus;
  outputPath: string | null;
}

export interface Timeline {
  milestones: Milestone[];
}

export interface Wave {
  waveId: string;
  waveName: string;
  launchWindow: string;
  theme: string;
  status: string;
  plannedSkuCount: number;
  actualSkuCount: number;
}

export interface Series {
  seriesId: string;
  waveId: string;
  seriesName: string;
  designTheme: string;
  occasion: string;
  targetConsumer: string;
  priceBand: string;
  styleKeywords: string[];
  targetCategories: string[];
  productRoleMix: {
    hero: number;
    core: number;
    filler: number;
  };
  progress: number;
  milestoneStatus: DesignPhase;
  dueDate: string;
  owner: string;
  heroImage: string;
  riskLevel: RiskLevel;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  syncStatus: SyncStatus;
}

export interface SeriesBrief {
  seriesId: string;
  season: string;
  waveId: string;
  designConcept: string;
  consumerScene: string;
  styleKeywords: string[];
  silhouetteDirections: string[];
  upperConstructionKeywords: string[];
  outsoleDirections: string[];
  benchmarkReferences: string[];
  reviewFocus: string[];
  materialPackage: {
    primary: string[];
    accent: string[];
  };
  colorPackage: {
    base: string[];
    accent: string[];
  };
  plannedSkuCount: number;
}

export interface Asset {
  assetId: string;
  assetType: 'moodboard' | 'material' | 'outsole' | 'color';
  seriesId: string;
  title: string;
  description: string;
  fileUrl: string;
  thumbnailUrl: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  featuredInReport?: boolean;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  syncStatus: SyncStatus;
}

export interface DesignItemReviewSummary {
  itemId: string;
  reviewStatus: ReviewStatus;
  riskLevel: RiskLevel;
  nextReviewDate: string | null;
  updatedBy: string;
  outputPath: string | null;
  reviewSummary?: string;
  openclawReviewId?: string;
  changeOrderIds?: string[];
}

export interface DesignItem {
  itemId: string;
  seriesId: string;
  seriesName?: string;
  waveId?: string;
  itemName: string;
  skuCode: string;
  productRole: string;
  category: string;
  occasion: string;
  designStatus: DesignPhase;
  reviewStatus?: ReviewStatus;
  riskLevel?: RiskLevel;
  nextReviewDate?: string | null;
  updatedBy?: string;
  outputPath?: string | null;
  reviewSummary?: string;
  openclawReviewId?: string;
  changeOrderIds?: string[];
  targetCostEstimate?: number | null;
  sampleQuotedCost?: number | null;
  finalLockedCost?: number | null;
  techPackStatus?: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  toolingStatus?: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  toolingNotes?: string;
  colorway: string;
  material: string;
  pricePoint: number;
  targetLaunchDate: string;
  designer: string;
  thumbnailUrl: string;
  designNotes: string;
  createdAt: string;
  updatedAt: string;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  syncStatus: SyncStatus;
}

export interface Risk {
  riskId: string;
  seriesId: string;
  riskType: string;
  priority: RiskLevel;
  title: string;
  description: string;
  impact: string;
  likelihood: string;
  mitigation: string;
  owner: string;
  status: string;
  identifiedAt: string;
  dueDate: string;
  resolvedAt?: string;
  updatedAt: string;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  syncStatus: SyncStatus;
}

export interface Task {
  taskId: string;
  seriesId: string;
  taskType: string;
  taskGroup?: 'design' | 'cost' | 'development' | 'planning';
  priority: RiskLevel;
  title: string;
  description: string;
  assignee: string;
  status: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  dependencies: string[];
  tags: string[];
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  syncStatus: SyncStatus;
}

export interface SeriesDevelopmentPlanRow {
  rowId: string;
  seriesId: string;
  weekLabel: string;
  skuCode: string;
  itemName: string;
  category: string;
  productRole: string;
  silhouette: string;
  upperConstruction: string;
  outsoleDirection: string;
  materialFocus: string;
  colorDirection: string;
  referenceAssetIds: string[];
  reviewFocus: string;
  phase: DesignPhase;
}

export interface ThemeDirectionRecord {
  themeId: string;
  season: string;
  waveId: string;
  waveName: string;
  launchWindow: string;
  themeName: string;
  themeStory: string;
  consumerMood: string;
  keywords: string[];
  consumerScenes: string[];
  colorDirections: string[];
  materialDirections: string[];
  benchmarkReferences: string[];
  reviewFocus: string[];
  seriesIds: string[];
  seriesNames: string[];
  moodboardAssetIds: string[];
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  updatedAt: string;
  updatedBy: string;
  syncStatus: SyncStatus;
}

export interface ProductArchitectureRecord {
  architectureId: string;
  season: string;
  waveId: string;
  seriesId: string;
  seriesName: string;
  designTheme: string;
  targetConsumer: string;
  consumerScene: string;
  priceBand: string;
  progress: number;
  phase: DesignPhase;
  riskLevel: RiskLevel;
  heroImage: string;
  roleMix: {
    hero: number;
    core: number;
    filler: number;
  };
  plannedSkuCount: number;
  categoryMix: string[];
  silhouetteDirections: string[];
  upperDirections: string[];
  outsoleDirections: string[];
  reviewFocus: string[];
  architectureDecision: string;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  updatedAt: string;
  updatedBy: string;
  syncStatus: SyncStatus;
}

export interface CategoryBreakdownRecord {
  breakdownId: string;
  season: string;
  waveId: string;
  seriesId: string;
  seriesName: string;
  designConcept: string;
  category: string;
  plannedSkuCount: number;
  productRoles: string[];
  keyStructures: string[];
  weekLabels: string[];
  focusNote: string;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  updatedAt: string;
  updatedBy: string;
  syncStatus: SyncStatus;
}

export interface DevelopmentWaveRecord {
  rowId: string;
  season: string;
  waveId: string;
  waveName: string;
  seriesId: string;
  seriesName: string;
  weekLabel: string;
  skuCode: string;
  itemName: string;
  category: string;
  productRole: string;
  silhouette: string;
  upperConstruction: string;
  outsoleDirection: string;
  materialFocus: string;
  colorDirection: string;
  referenceAssetIds: string[];
  reviewFocus: string;
  phase: DesignPhase;
  owner: string;
  riskLevel: RiskLevel;
  targetCostEstimate: number | null;
  sampleQuotedCost: number | null;
  finalLockedCost: number | null;
  techPackStatus: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  toolingStatus: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  toolingNotes?: string;
  nextReviewDate: string | null;
  source: 'manual' | 'openclaw';
  sourceId: string | null;
  updatedAt: string;
  updatedBy: string;
  syncStatus: SyncStatus;
}

export interface WeeklySnapshot {
  weekId: string;
  previousWeek?: string;
  snapshotDate: string;
  completedMilestones: string[];
  newRisks: string[];
  resolvedRisks: string[];
  newTasks: string[];
  completedTasks: string[];
  seriesProgressDelta: Record<string, { from: number; to: number }>;
}

export interface SyncConfig {
  syncMode: string;
  conflictResolution: string;
  lastSyncTime: string | null;
  openclawEndpoint: string;
  syncedEntities: string[];
}

export interface SeriesWithBrief extends Series {
  brief?: SeriesBrief;
  assets: Asset[];
  designItems: DesignItem[];
  risks: Risk[];
  tasks: Task[];
  developmentPlan: SeriesDevelopmentPlanRow[];
}

export interface FieldDefinition {
  key: keyof DesignItem | 'developmentPlan.silhouette' | 'developmentPlan.upperConstruction' | 'developmentPlan.outsoleDirection';
  label: string;
  group: 'commercial' | 'design' | 'development';
  placeholder?: string;
}