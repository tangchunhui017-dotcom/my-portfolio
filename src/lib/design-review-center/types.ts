import type {
  ActionStatus,
  AssetType,
  DevelopmentLevel,
  ExecutionStatus,
  GateGroup,
  GateType,
  ProjectStatus,
  ReviewConclusion,
  ReviewStatus,
  ReviewType,
  RiskLevel,
  SeriesRole,
  SourceType,
  Stage,
  SyncStatus,
} from '@/config/design-review-center/enums';

export type {
  ActionStatus,
  AssetType,
  DevelopmentLevel,
  ExecutionStatus,
  GateGroup,
  GateType,
  ProjectStatus,
  ReviewConclusion,
  ReviewStatus,
  ReviewType,
  RiskLevel,
  SeriesRole,
  SourceType,
  Stage,
  SyncStatus,
} from '@/config/design-review-center/enums';

export type DesignPhase = Stage;

export type MilestoneGateType = GateType | string;

export type MilestoneTrack = 'design_track' | 'cost_track' | 'development_track';

export type MilestoneCheckpointType = 'review' | 'cost' | 'handoff' | 'tooling' | 'lock' | string;

export type MilestoneStatus = 'not_started' | 'in_progress' | 'at_risk' | 'delayed' | 'completed';

export interface Project {
  projectId: string;
  year: string;
  season: string;
  quarter: string;
  brandName: string;
  projectName: string;
  projectOwner: string;
  currentStage: Stage;
  leadSeries: string[];
  targetLaunchDate: string;
  projectStatus: ProjectStatus;
  architectureProfileId?: string | null;
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
  projectId: string;
  waveId: string;
  targetWave: string;
  seriesName: string;
  themeDirection: string;
  designTheme: string;
  targetConsumer: string;
  usageScenarios: string[];
  occasion: string;
  priceBand: string;
  seriesRole: SeriesRole;
  currentStatus: Stage;
  styleKeywords: string[];
  themeKeywords: string[];
  targetCategories: string[];
  designLanguages: string[];
  materialDirections: string[];
  colorDirections: string[];
  soleDirections: string[];
  lastDirections: string[];
  productRoleMix: {
    hero: number;
    core: number;
    filler: number;
  };
  progress: number;
  milestoneStatus: Stage;
  dueDate: string;
  owner: string;
  heroImage: string;
  heroAssetId?: string;
  riskLevel: RiskLevel;
  source: SourceType;
  sourceId: string | null;
  syncStatus: SyncStatus;
}

export interface CategoryPlan {
  categoryPlanId: string;
  projectId: string;
  seriesId: string;
  categoryName: string;
  styleTarget: number;
  skuTarget: number;
  developmentLevel: DevelopmentLevel;
  sharedOutsoleStrategy: string;
  sharedLastStrategy: string;
  targetCostBand: string;
  targetWave: string;
  developmentRole: string;
  toolingNeed: string;
  currentStatus: Stage;
}

export interface StyleDevelopment {
  styleId: string;
  projectId: string;
  seriesId: string;
  categoryPlanId: string;
  skuCode: string;
  styleName: string;
  styleDisplayName: string;
  categoryName: string;
  waveId: string;
  developmentRole: string;
  developmentLevel: DevelopmentLevel;
  currentStage: Stage;
  designStatus: ExecutionStatus;
  sampleStatus: ExecutionStatus;
  materialStatus: ExecutionStatus;
  costStatus: ExecutionStatus;
  technicalStatus: ExecutionStatus;
  owner: string;
  riskLevel: RiskLevel;
  blocked: boolean;
  nextAction: string;
  dueDate: string;
  nextReviewDate: string | null;
  locked: boolean;
  cancelled: boolean;
  leadStyle: boolean;
  bomLocked: boolean;
  targetCost: number | null;
  quotedCost: number | null;
  lockedCost: number | null;
  outsole: string;
  last: string;
  materialPlan: string[];
  colorPlan: string[];
  thumbnailUrl: string;
  designSummary: string;
  reviewStatus: ReviewStatus;
  techPackStatus: ExecutionStatus;
  toolingStatus: ExecutionStatus;
  updatedAt: string;
  source: SourceType;
  sourceId: string | null;
  syncStatus: SyncStatus;
}

export interface GateNode {
  gateId: string;
  styleId: string;
  gateGroup: GateGroup;
  gateType: GateType;
  gateName: string;
  plannedDate: string;
  actualDate: string | null;
  completed: boolean;
  delayed: boolean;
  blocked: boolean;
  owner: string;
  impactWave: string;
  note: string;
}

export interface DesignAsset {
  assetId: string;
  styleId: string;
  versionNumber: number;
  assetType: AssetType;
  imageUrl: string;
  materialPlan: string[];
  colorPlan: string[];
  outsole: string;
  last: string;
  uploadedAt: string;
  isLatest: boolean;
  summary: string;
  deltaNote?: string | null;
}

export interface ReviewRecord {
  reviewId: string;
  styleId: string;
  reviewDate: string;
  reviewType: ReviewType;
  conclusion: ReviewConclusion;
  issueDescription: string;
  changeRequest: string;
  owner: string;
  dueDate: string;
  closed: boolean;
  blocked: boolean;
  impactScope: string;
  nextReviewDate: string | null;
}

export interface ActionItem {
  actionId: string;
  reviewId: string;
  styleId: string;
  actionType: string;
  actionDescription: string;
  status: ActionStatus;
  owner: string;
  dueDate: string;
  completedAt: string | null;
  reapproved: boolean;
}

export interface ChannelWeight {
  channel: string;
  weight: number;
}

export interface OTBStructure {
  otbStructureId: string;
  projectId: string;
  year: string;
  season: string;
  quarter: string;
  seriesId: string;
  categoryName: string;
  categoryBudgetShare: number;
  categoryBudgetAmount: number;
  priceBand: string;
  waveId: string;
  channelWeights: ChannelWeight[];
}

export type ArchitectureRoleKey = 'basic' | 'lead' | 'image' | 'traffic' | 'functional';
export type BaseArchitectureDimensionKey =
  | 'quantity'
  | 'styleRole'
  | 'structureType'
  | 'soleType'
  | 'lastType'
  | 'developmentAttribute'
  | 'platformStrategy';
export type ArchitectureDimensionKey = BaseArchitectureDimensionKey | string;
export type ArchitectureDimensionResolverKey = ArchitectureDimensionKey | string;
export type ArchitectureProfileBrandType = 'casual' | 'fashion' | 'outdoor' | 'business' | 'hybrid';
export type ArchitectureProfileSeasonType = 'spring_summer' | 'autumn_winter' | 'all_season';
export interface ArchitectureSeriesAllocation {
  seriesId: string;
  seriesName: string;
  count: number;
  colorHex: string;
  helperText?: string;
}
export interface ArchitectureCountItem {
  key: string;
  label: string;
  count: number;
  seriesIds: string[];
  seriesNames: string[];
  waveIds: string[];
  colorHexes: string[];
  allocations: ArchitectureSeriesAllocation[];
  helperText?: string;
  priceBand?: string;
  developmentLevel?: DevelopmentLevel;
  isNewTooling?: boolean;
  isSharedOutsole?: boolean;
  isSharedLast?: boolean;
}
export interface ArchitectureSummary {
  categoryCount: number;
  styleTarget: number;
  skuTarget: number;
  leadStyleCount: number;
  leadStyleRate: number;
  newToolingCount: number;
  newToolingRate: number;
  sharedOutsoleRate: number;
  sharedLastRate: number;
  platformReuseRate: number;
}
export interface ArchitectureDimensionConfig {
  key: ArchitectureDimensionKey;
  label: string;
  helperText: string;
  resolverKey: ArchitectureDimensionResolverKey;
  visible: boolean;
  order: number;
  appliesToCategories?: string[];
}
export interface ArchitectureProfile {
  profileId: string;
  label: string;
  description: string;
  brandType: ArchitectureProfileBrandType;
  seasonType: ArchitectureProfileSeasonType;
  dimensionRows: ArchitectureDimensionConfig[];
}
export interface ProductArchitectureCell {
  categoryName: string;
  dimensionKey: ArchitectureDimensionKey;
  items: ArchitectureCountItem[];
  total: number;
  summary: string;
}
export interface ArchitectureCategoryColumn {
  categoryName: string;
  styleTarget: number;
  skuTarget: number;
  priceBands: string[];
  waves: string[];
  seriesIds: string[];
}
export interface ArchitectureDimensionRow {
  key: ArchitectureDimensionKey;
  label: string;
  helperText: string;
  cells: ProductArchitectureCell[];
}
export interface ArchitecturePlatformInsight {
  insightId: string;
  title: string;
  value: string;
  summary: string;
  seriesIds: string[];
  colorHexes: string[];
  emphasis: 'neutral' | 'accent' | 'warning';
}
export interface ProductArchitectureMatrix {
  columns: ArchitectureCategoryColumn[];
  rows: ArchitectureDimensionRow[];
}
export interface ProductArchitectureInput {
  bridgeId: string;
  otbStructureId: string;
  projectId: string;
  seriesId: string;
  seriesName: string;
  seriesRole: SeriesRole;
  categoryPlanId: string | null;
  categoryName: string;
  waveId: string;
  waveName: string;
  priceBand: string;
  budgetShare: number;
  budgetAmount: number;
  channelWeights: ChannelWeight[];
  styleTarget: number;
  skuTarget: number;
  averageDepth: number;
  activeStyleCount: number;
  roleCounts: Record<ArchitectureRoleKey, number>;
  quantityItems: ArchitectureCountItem[];
  styleRoleItems: ArchitectureCountItem[];
  structureTypes: ArchitectureCountItem[];
  soleTypes: ArchitectureCountItem[];
  heelTypes: ArchitectureCountItem[];
  lastTypes: ArchitectureCountItem[];
  craftDetails: ArchitectureCountItem[];
  warmStructures: ArchitectureCountItem[];
  developmentAttributes: ArchitectureCountItem[];
  platformStrategies: ArchitectureCountItem[];
  sharedOutsoleStyleCount: number;
  sharedLastStyleCount: number;
  newToolingCount: number;
  platformReuseCount: number;
  seriesColorHex: string;
}
export interface ProductArchitectureView {
  profileId: string;
  profileLabel: string;
  inputs: ProductArchitectureInput[];
  summary: ArchitectureSummary;
  matrix: ProductArchitectureMatrix;
  platformInsights: ArchitecturePlatformInsight[];
  sourceSummary: string;
}

export interface ArchitectureSourceSummary {
  styleTarget: number;
  skuTarget: number;
  platformSummary: string;
  budgetShare: number;
  themeColorHex: string;
}

export interface DesignReviewFilterOption {
  value: string;
  label: string;
}

export interface DesignReviewFilterOptions {
  brands: DesignReviewFilterOption[];
  years: DesignReviewFilterOption[];
  quarters: DesignReviewFilterOption[];
  waves: DesignReviewFilterOption[];
  categoryL1s: DesignReviewFilterOption[];
  categoryL2s: DesignReviewFilterOption[];
  series: DesignReviewFilterOption[];
  owners: DesignReviewFilterOption[];
  stages: DesignReviewFilterOption[];
}

export interface DesignReviewFilters {
  brand: string;
  year: string;
  quarter: string;
  wave: string;
  categoryL1: string;
  categoryL2: string;
  series: string;
  owner: string;
  stage: string;
}

export interface DesignReviewMustDecideItem {
  styleId: string;
  title: string;
  owner: string;
  dueDate: string;
  reason: string;
}

export interface DesignReviewOverview {
  totalStyles: number;
  initiatedStyles: number;
  inDevelopmentStyles: number;
  lockedStyles: number;
  cancelledStyles: number;
  leadLockRate: number;
  highRiskStyles: number;
  delayedGateCount: number;
  sampleCompletionRate: number;
  bomLockRate: number;
  mustDecide: DesignReviewMustDecideItem[];
  blockers: DesignReviewMustDecideItem[];
  designTrackSummary: string;
  costTrackSummary: string;
  developmentTrackSummary: string;
  architectureSummary: ArchitectureSummary | null;
}

export interface ThemeStrategyRecord {
  seriesId: string;
  projectId: string;
  seriesName: string;
  themeDirection: string;
  targetConsumer: string;
  usageScenarios: string[];
  priceBand: string;
  targetWave: string;
  seriesRole: SeriesRole;
  categories: string[];
  designLanguages: string[];
  materialDirections: string[];
  colorDirections: string[];
  soleDirections: string[];
  lastDirections: string[];
  heroAsset: DesignAsset | null;
  latestAssets: DesignAsset[];
  benchmarkReferences: string[];
  skuTarget: number;
  targetCostBand: string;
  reviewDecisionStatus: 'pending' | 'in_progress' | 'approved';
  brandName?: string;
  year?: string;
  quarter?: string;
  owner?: string;
  quotedCostAverage?: number;
  costDriftAlert?: string;
  seriesProgress?: {
    planning: 'pending' | 'active' | 'done';
    design: 'pending' | 'active' | 'done';
    material: 'pending' | 'active' | 'done';
    sample: 'pending' | 'active' | 'done';
  };
}

export interface ProductArchitectureRecordView {
  seriesId: string;
  seriesName: string;
  categoryPlanId: string;
  categoryName: string;
  styleTarget: number;
  skuTarget: number;
  priceBand: string;
  developmentRole: string;
  developmentLevel: DevelopmentLevel;
  sharedOutsoleStrategy: string;
  sharedLastStrategy: string;
  toolingNeed: string;
  targetWave: string;
  currentStatus: Stage;
  activeStyleCount: number;
  lockedStyleCount: number;
  leadStyleCount: number;
}

export interface StyleTaskRow {
  styleId: string;
  skuCode: string;
  styleName: string;
  seriesId: string;
  seriesName: string;
  categoryName: string;
  waveId: string;
  developmentRole: string;
  developmentLevel: DevelopmentLevel;
  currentStage: Stage;
  designStatus: ExecutionStatus;
  sampleStatus: ExecutionStatus;
  materialStatus: ExecutionStatus;
  costStatus: ExecutionStatus;
  technicalStatus: ExecutionStatus;
  owner: string;
  riskLevel: RiskLevel;
  blocked: boolean;
  nextAction: string;
  dueDate: string;
  nextReviewDate: string | null;
  latestAction: ActionItem | null;
  nextGate: GateNode | null;
  latestReview: ReviewRecord | null;
  overdue: boolean;
  dueThisWeek: boolean;
  pendingReview: boolean;
  targetCost: number | null;
  quotedCost: number | null;
  lockedCost: number | null;
  thumbnailUrl: string;
  architectureSource: ArchitectureSourceSummary | null;
}

export interface StyleAggregate {
  style: StyleDevelopment;
  project: Project | null;
  series: Series | null;
  categoryPlan: CategoryPlan | null;
  wave: Wave | null;
  gateNodes: GateNode[];
  assets: DesignAsset[];
  reviewRecords: ReviewRecord[];
  actionItems: ActionItem[];
  latestAsset: DesignAsset | null;
  latestReview: ReviewRecord | null;
  nextGate: GateNode | null;
  openActions: ActionItem[];
  taskRow: StyleTaskRow;
  legacyItem: DesignItem;
}

export interface SeriesAggregate {
  series: Series;
  project: Project | null;
  wave: Wave | null;
  categoryPlans: CategoryPlan[];
  styles: StyleAggregate[];
  gateNodes: GateNode[];
  assets: DesignAsset[];
  reviewRecords: ReviewRecord[];
  actionItems: ActionItem[];
  themeStrategy: ThemeStrategyRecord;
  architectureRows: ProductArchitectureRecordView[];
  legacySeries: SeriesWithBrief;
}

export interface WaveAggregate {
  wave: Wave;
  series: Series[];
  styles: StyleDevelopment[];
  gateNodes: GateNode[];
  reviewRecords: ReviewRecord[];
  actionItems: ActionItem[];
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
  source: SourceType;
  sourceId: string | null;
  updatedBy: string;
  syncStatus: SyncStatus;
  outputPath: string | null;
}

export interface Timeline {
  milestones: Milestone[];
}

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
  assetType: 'moodboard' | 'material' | 'outsole' | 'color' | 'effect' | 'reference';
  seriesId: string;
  title: string;
  description: string;
  fileUrl: string;
  thumbnailUrl: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  featuredInReport?: boolean;
  relatedItemId?: string | null;
  comparisonGroupId?: string | null;
  versionStage?: 'sketch' | 'render' | 'first_sample' | 'final_sample' | null;
  versionNo?: number | null;
  capturedAt?: string | null;
  selectedForReview?: boolean;
  bomSummary?: string[];
  cmfSummary?: string[];
  estimatedCost?: number | null;
  source: SourceType;
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
  source: SourceType;
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
  source: SourceType;
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
  source: SourceType;
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

export interface ThemeDirectionBoard {
  boardId: 'silhouette' | 'cmf' | 'craft';
  title: string;
  subtitle: string;
  summary: string;
  assetIds: string[];
  focusPoints: string[];
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
  brandLongTermStrength: string;
  brandCoreStyles: string[];
  historicalAnchors: string[];
  keywords: string[];
  consumerScenes: string[];
  colorDirections: string[];
  materialDirections: string[];
  benchmarkReferences: string[];
  trendSignals: string[];
  marketOpportunities: string[];
  opportunitySummary: string;
  reviewFocus: string[];
  cmfFocus: {
    keyColors: string[];
    keyMaterials: string[];
    supplierPriorities: string[];
  };
  seriesIds: string[];
  seriesNames: string[];
  moodboardAssetIds: string[];
  directionBoards: ThemeDirectionBoard[];
  source: SourceType;
  sourceId: string | null;
  updatedAt: string;
  updatedBy: string;
  syncStatus: SyncStatus;
}

export type ToolingStrategy = 'new_tooling' | 'new_upper_same_outsole' | 'carry_over';

export type ToolingBudgetLevel = 'tight' | 'controlled' | 'strategic';

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
  plannedSkuLimit: number;
  plannedSkuDepth: number;
  toolingStrategy: ToolingStrategy;
  toolingBudgetLevel: ToolingBudgetLevel;
  lastReuseType: string;
  outsoleReuseType: string;
  carryOverRatio: number;
  sameOutsoleNewUpperRatio: number;
  newToolingRatio: number;
  categoryMix: string[];
  silhouetteDirections: string[];
  upperDirections: string[];
  outsoleDirections: string[];
  reviewFocus: string[];
  architectureDecision: string;
  source: SourceType;
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
  subcategory: string;
  plannedSkuCount: number;
  productRoles: string[];
  keyStructures: string[];
  weekLabels: string[];
  processTags: string[];
  factoryProfile: string;
  lineType: string;
  capacityBand: string;
  technicalRiskLevel: RiskLevel;
  leadTimeRisk: RiskLevel;
  materialDependency: string[];
  focusNote: string;
  source: SourceType;
  sourceId: string | null;
  updatedAt: string;
  updatedBy: string;
  syncStatus: SyncStatus;
}

export type CriticalPathLevel = 'normal' | 'watch' | 'critical';

export interface DevelopmentWaveRecord {
  rowId: string;
  season: string;
  waveId: string;
  waveName: string;
  seriesId: string;
  seriesName: string;
  weekLabel: string;
  dropDate: string;
  skuCode: string;
  itemName: string;
  category: string;
  productRole: string;
  silhouette: string;
  upperConstruction: string;
  outsoleDirection: string;
  materialFocus: string;
  colorDirection: string;
  longLeadMaterial: string[];
  materialLockDate: string | null;
  toolingStartDate: string | null;
  toolingTrialDate: string | null;
  toolingFreezeDate: string | null;
  techPackDueDate: string | null;
  criticalPathLevel: CriticalPathLevel;
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
  source: SourceType;
  sourceId: string | null;
  updatedAt: string;
  updatedBy: string;
  syncStatus: SyncStatus;
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

// ── 设计企划总控工作台 新增类型 ────────────────────────────────────────────────

export type DesignPlanningOverallStatus = 'healthy' | 'warning' | 'high_risk';
export type AlignmentStatus = 'aligned' | 'partial' | 'unassigned' | 'deviated';
export type DeviationRisk = 'high' | 'medium' | 'low' | 'none';
export type DesignRiskType =
  | 'design_direction'
  | 'new_mold_excess'
  | 'shared_sole_low'
  | 'hero_style_low'
  | 'sample_delay'
  | 'bom_unlocked'
  | 'cost_overrun'
  | 'gate_delay'
  | 'review_rejected'
  | 'launch_risk';
export type DecisionItemType =
  | 'design_direction'
  | 'material'
  | 'colorway'
  | 'outsole'
  | 'bom'
  | 'cost'
  | 'cut_style'
  | 'delay'
  | 'gate_entry';
export type WorkflowNodeStatus = 'completed' | 'in_progress' | 'at_risk' | 'blocked' | 'not_started';
export type DecisionActionStatus = 'open' | 'decided' | 'escalated';
export type RiskActionStatus = 'open' | 'in_progress' | 'resolved';
export type ModuleLinkCategory = 'internal' | 'external';

export interface DesignPlanningExecutiveSummary {
  overallStatus: DesignPlanningOverallStatus;
  biggestRisk: string;
  biggestOpportunity: string;
  mustDecideCount: number;
  merchandiseInputStatus: AlignmentStatus;
  waveImpact: string;
  suggestedAction: string;
}

export interface MerchandiseInputAlignment {
  id: string;
  sourceModule: string;
  inputType: string;
  inputSummary: string;
  alignmentStatus: AlignmentStatus;
  generatedTaskCount: number;
  unassignedInputCount: number;
  deviationRisk: DeviationRisk;
  recommendedAction: string;
  relatedRoute: string;
}

export interface SeasonDesignStrategy {
  seriesId: string;
  seasonTheme: string;
  designKeywords: string[];
  coreSeries: string[];
  heroStyles: string[];
  mainShoeTypes: string[];
  colorStory: string;
  materialDirection: string;
  functionBenefits: string[];
  targetConsumer: string;
  scenario: string;
  designBoundary: string;
  dontRules: string[];
  riskNote?: string;
  priceBand?: string;
  channels?: string[];
  /** 关联的趋势标签 */
  trendTags?: string[];
  /** 竞品差异化一句话摘要 */
  competitorDiff?: string;
  /** 策略依据 */
  strategyBasis?: string;
}

export interface DevelopmentKpi {
  key: string;
  label: string;
  current: number | string;
  target: number | string;
  diff: string;
  status: 'good' | 'warn' | 'danger' | 'neutral';
  relatedRoute?: string;
  isRate?: boolean;
}

export interface DesignPlanningWorkflowNode {
  nodeId: string;
  nodeName: string;
  completionRate: number;
  blockedCount: number;
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  owner: string;
  dueDate: string;
  status: WorkflowNodeStatus;
  relatedRoute: string;
}

export interface DesignRiskBlocker {
  riskId: string;
  riskType: DesignRiskType;
  riskObject: string;
  riskReason: string;
  affectedWave: string;
  affectedStyle?: string;
  affectedLaunchDate?: string;
  expectedImpact: string;
  owner: string;
  dueDate: string;
  recommendedAction: string;
  actionStatus: RiskActionStatus;
}

export interface WeeklyDecisionItem {
  decisionId: string;
  decisionObject: string;
  decisionType: DecisionItemType;
  currentProblem: string;
  options: string[];
  recommendedOption: string;
  affectedScope: string;
  owner: string;
  dueDate: string;
  actionStatus: DecisionActionStatus;
}

export interface ThreeTrackSummaryData {
  design: {
    pendingReviewCount: number;
    highRiskStyleCount: number;
    directionDeviationCount: number;
    mustDecideCount: number;
  };
  cost: {
    overTargetCount: number;
    unlockedBomCount: number;
    marginRiskCount: number;
    costReviewCount: number;
  };
  development: {
    delayedGateCount: number;
    delayedSampleCount: number;
    technicalRiskCount: number;
    readyToLaunchSkuCount: number;
  };
}

export interface DesignPlanningRelatedModuleLink {
  linkId: string;
  label: string;
  description: string;
  actionLabel: string;
  relatedRoute: string;
  queryParams?: Record<string, string>;
  category: ModuleLinkCategory;
  icon: string;
}

// ── 设计企划总控 V2 重构类型 ─────────────────────────────────────────────────────

export interface PlanningGateCard {
  currentGate: string;
  currentGateLabel: string;
  nextGateName: string;
  nextGateDate: string;
  daysLeft: number;
}

export interface PlanningSkuCard {
  planned: number;
  defined: number;
  unconfirmed: number;
}

export interface PlanningKeyStyleCard {
  heroCount: number;
  coreCount: number;
  supportCount: number;
  totalTarget: number;
}

export interface PlanningSampleDevCard {
  inDevelopment: number;
  pendingFitting: number;
  pendingConfirmation: number;
  blocked: number;
}

export interface PlanningCostMarginCard {
  targetMarginRate: number;
  forecastMarginRate: number;
  overCostCount: number;
  targetFob: number;
  forecastFob: number;
}

export interface PlanningRiskDecisionCard {
  highRiskCount: number;
  overdueDecisionCount: number;
  thisWeekMustHandle: number;
}

export interface PlanningExecutiveSummaryCards {
  gate: PlanningGateCard;
  sku: PlanningSkuCard;
  keyStyle: PlanningKeyStyleCard;
  sampleDev: PlanningSampleDevCard;
  costMargin: PlanningCostMarginCard;
  riskDecision: PlanningRiskDecisionCard;
  overallStatus: DesignPlanningOverallStatus;
}

export interface BusinessChannel {
  name: string;
  share: number;
  priority: 'primary' | 'secondary';
}

export interface BusinessCategoryMixItem {
  category: string;
  share: number;
  skuCount: number;
}

export interface BusinessPriceBandItem {
  band: string;
  label: string;
  msrpRange: string;
  targetSkus: number;
}

export interface BusinessInputTargets {
  consumer: {
    ageRange: string;
    gender: string;
    scenes: string[];
    priceSensitivity: string;
    /** 核心购买驱动（标签） */
    purchaseDrivers?: string[];
  };
  channels: BusinessChannel[];
  businessTargets: {
    salesAmount: string;
    salesVolume: string;
    marginTarget: string;
    launchWindow: string;
    /** 时间轴节点（可选）：首批/主销/末期 */
    launchPhases?: { label: string; date: string }[];
  };
  categoryMix: BusinessCategoryMixItem[];
  priceBands: BusinessPriceBandItem[];
  /** OTB 买手确认状态 */
  otbStatus?: OTBConfirmationStatus;
}

export type SkuDevStatus = 'planning' | 'in_progress' | 'completed' | 'at_risk';
export type SkuRiskStatus = 'normal' | 'warning' | 'high_risk';

export interface SkuArchitectureRow {
  seriesId: string;
  seriesName: string;
  category: string;
  targetConsumer: string;
  priceBand: string;
  skuCount: number;
  skuTarget: number;
  heroCount: number;
  coreCount: number;
  supportCount: number;
  scenario: string;
  outsolePlatform: string;
  last: string;
  devStatus: SkuDevStatus;
  riskStatus: SkuRiskStatus;
  /** 新款数量（可选，从架构数据推导） */
  newCount?: number;
  /** 续款数量（可选） */
  carryoverCount?: number;
}

export type EngineeringItemStatus =
  | 'confirmed'
  | 'pending_fitting'
  | 'needs_adjustment'
  | 'not_started'
  | 'at_risk';
export type MaterialRole = 'upper' | 'lining' | 'insole' | 'outsole';

export interface EngineeringLastStatus {
  lastCode: string;
  lastName: string;
  status: EngineeringItemStatus;
  fitTrial: string;
  affectedSeries: string[];
  note?: string;
}

export interface EngineeringOutsolePlatform {
  platformCode: string;
  platformName: string;
  strategy: 'carry_over' | 'new_tooling' | 'modify_tooling';
  affectedSeries: string[];
  estimatedCost: string;
  status: EngineeringItemStatus;
}

export interface EngineeringMaterialItem {
  materialRole: MaterialRole;
  materialName: string;
  supplier: string;
  status: EngineeringItemStatus;
  moq: string;
  leadTime: string;
  risk?: string;
}

export interface EngineeringCraftRisk {
  craftType: string;
  riskLevel: 'high' | 'medium' | 'low';
  affectedStyleCount: number;
  description: string;
}

export interface EngineeringSupplyChainItem {
  supplier: string;
  category: string;
  confirmed: boolean;
  moq: string;
  leadTime: string;
  hasAlternative: boolean;
}

export interface EngineeringTestItem {
  testType: string;
  status: 'passed' | 'in_progress' | 'pending' | 'failed';
  affectedCount: number;
}

export interface EngineeringFeasibilityData {
  lastStatuses: EngineeringLastStatus[];
  outsolePlatforms: EngineeringOutsolePlatform[];
  materialItems: EngineeringMaterialItem[];
  craftRisks: EngineeringCraftRisk[];
  supplyChainItems: EngineeringSupplyChainItem[];
  testItems: EngineeringTestItem[];
}

export type CostMarginRowStatus = 'normal' | 'warning' | 'over_target';

export interface CostMarginRow {
  seriesId: string;
  seriesName: string;
  category: string;
  msrp: number;
  targetFob: number;
  forecastFob: number;
  lockedFob?: number;
  targetMarginRate: number;
  forecastMarginRate: number;
  overTargetReason?: string;
  optimizationSuggestion?: string;
  status: CostMarginRowStatus;
}

// ── V2 新增：趋势、新续款、打样、材料战略、OTB ─────────────────────────────

export interface TrendColorItem {
  name: string;
  hex: string;
}

export interface TrendDirectionSnapshot {
  /** 3-5 个核心趋势标签 */
  tags: string[];
  /** 主色彩故事 */
  colorStory: TrendColorItem[];
  /** 廓形方向（一句话） */
  silhouetteDirection: string;
  /** 材料方向（一句话） */
  materialDirection: string;
  /** 趋势来源 */
  source: string;
}

export interface NewCarryoverByLine {
  name: string;
  newCount: number;
  carryoverCount: number;
  newRate: number;
}

export interface NewCarryoverSummary {
  newCount: number;
  carryoverCount: number;
  /** 0-1 */
  newRate: number;
  targetNewRate: number;
  byProductLine: NewCarryoverByLine[];
}

export interface ProtoDelayedItem {
  styleCode: string;
  plannedDate: string;
  delayDays: number;
  reason: 'factory' | 'material' | 'design_change';
}

export interface ProtoStatus {
  totalStyles: number;
  protoCompleted: number;
  protoInProgress: number;
  protoNotStarted: number;
  delayedItems: ProtoDelayedItem[];
  nextGateName: string;
  daysToNextGate: number;
}

export interface StrategicMaterial {
  name: string;
  description: string;
}

export interface SupplierRisk {
  supplierName: string;
  isExclusive: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MaterialStrategySnapshot {
  strategicMaterials: StrategicMaterial[];
  sustainableRatio: { current: number; target: number };
  keySupplierRisks: SupplierRisk[];
  /** 底型/楦型沿用率 0-1 */
  platformReuseRate: number;
}

export interface OTBConfirmationStatus {
  status: 'confirmed' | 'pending' | 'conflict';
  lastAlignedDate: string;
  conflictSummary?: string;
}

// ── 主题与系列策略页面专用类型 ──────────────────────────────────────────────

export interface SeasonThemeStrategySummary {
  seasonTheme: string;
  designKeywords: string[];
  targetConsumer: string;
  coreScenario: string;
  trendSources: string[];
  merchandisingSources: string[];
  competitorSources: string[];
  waveCount: number;
  seriesCount: number;
  seriesInDevelopmentCount: number;
  seriesPendingReviewCount: number;
  cancelledSeriesCount: number;
  /** 0-100 */
  themeHealthScore: number;
  themeRiskLevel: 'healthy' | 'warning' | 'high_risk';
  recommendedAction: string;
  // 新增业务字段
  strategyRationale?: string;
  weeklyDecisions?: string[];
  seriesStructure?: { hero: number; core: number; support: number };
  totalSkuTarget?: number;
  mainPriceBand?: string;
  targetGrossMarginRate?: number;
  mainChannel?: string;
}

export type MerchandisingAlignmentStatus =
  | 'aligned'
  | 'partial'
  | 'not_aligned'
  | 'deviated';

export interface MerchandisingInputAlignment {
  inputSource: string;
  inputSummary: string;
  coreConclusion?: string;
  designTranslation: string;
  designRequirement?: string;
  skuImpact?: string;
  alignmentStatus: MerchandisingAlignmentStatus;
  generatedSeriesCount: number;
  generatedTaskCount: number;
  deviationRisk: 'low' | 'medium' | 'high' | 'none';
  deviation?: string;
  nextAction?: string;
  recommendedAction: string;
  /** URL or tab key */
  jumpAction: string;
}

export interface WaveThemeBoardItem {
  waveId: string;
  waveName: string;
  waveRole: string;
  includedSeriesCount: number;
  targetStyleCount: number;
  confirmedStyleCount: number;
  costProgress: number;
  costBudget: number;
  statusDistribution: { approved: number; in_progress: number; pending: number };
  launchDate: string;
  themeHealth: 'healthy' | 'warning' | 'high_risk';
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: string;
  // 新增业务字段
  waveGoal?: string;
  heroSeries?: string[];
  mainPriceBand?: string;
  keyDeliverable?: string;
  weeklyAction?: string;
}

export type SeriesRole2 =
  | 'hero'
  | 'image'
  | 'profit'
  | 'test'
  | 'traffic'
  | 'base';

export type SeriesDecisionStatus =
  | 'recommend_proceed'
  | 'pending_review'
  | 'needs_adjustment'
  | 'small_batch'
  | 'cancel';

export interface SeriesStrategyCard {
  seriesId: string;
  seriesName: string;
  waveId: string;
  targetConsumer: string;
  seriesRole: SeriesRole2;
  relatedCategories: string[];
  targetSkuCount: number;
  heroStyleCount: number;
  costBand: string;
  targetPriceBand: string;
  mainChannels?: string[];
  colorPalette: string[];
  designKeywords: string[];
  benchmarkBrands: string[];
  decisionStatus: SeriesDecisionStatus;
  decisionReason: string;
  recommendedAction: string;
}

export interface ThemeSeriesResourceAllocation {
  waveId: string;
  seriesId: string;
  seriesName: string;
  targetSkuCount: number;
  heroStyleCount: number;
  coreStyleCount: number;
  testStyleCount: number;
  imageStyleCount: number;
  newMoldCount: number;
  sharedLastRate: number;
  sharedSoleRate: number;
  costBand: string;
  developmentPriority: 'high' | 'medium' | 'low';
  otbConstraint: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: string;
}

export type DirectionBoardType = 'material' | 'sole' | 'shoe_type' | 'craft';
export type DirectionBoardStatus = 'draft' | 'pending_review' | 'confirmed' | 'needs_adjustment' | 'task_generated';

export interface DirectionBoardItem {
  boardType: DirectionBoardType;
  boardTitle: string;
  directionDescription: string;
  keyElements: string[];
  validationStatus: DirectionBoardStatus;
  relatedSeriesId: string;
  relatedStyleCount: number;
  generatedTaskCount: number;
  reviewStatus: 'pending' | 'in_progress' | 'approved' | 'rejected';
  recommendedAction: string;
}

export type ThemeRiskType =
  | 'brand_dna_deviation'
  | 'unclear_consumer'
  | 'insufficient_benchmark'
  | 'cost_overrun'
  | 'too_many_new_molds'
  | 'insufficient_series_sku'
  | 'insufficient_hero'
  | 'review_rejected'
  | 'wave_launch_risk';

export interface ThemeRiskDecisionItem {
  riskId: string;
  riskObject: string;
  riskType: ThemeRiskType;
  riskReason: string;
  affectedWave: string;
  affectedSeries: string;
  affectedStyleCount: number;
  expectedImpact: string;
  decisionNeeded: string;
  recommendedAction: string;
  owner: string;
  dueDate: string;
  actionStatus: 'open' | 'in_progress' | 'resolved';
}

export interface ThemeSeriesRelatedModuleLink {
  linkId: string;
  label: string;
  description: string;
  relatedRoute: string;
  /** Context params to carry */
  queryParams?: Record<string, string>;
  category: 'internal' | 'external';
  actionLabel: string;
  icon: string;
}

// ─── 系列角色矩阵 ──────────────────────────────────────────────────────────

export type SeriesBusinessTask =
  | 'acquisition'       // 拉新
  | 'volume'            // 走量
  | 'margin'            // 毛利
  | 'brand_image'       // 形象
  | 'channel_exclusive' // 渠道专供
  | 'test_market';      // 市场测试

export interface SeriesRoleMatrixRow {
  seriesId: string;
  seriesName: string;
  waveId: string;
  seriesRole: SeriesRole2;
  businessTasks: SeriesBusinessTask[];
  targetConsumer: string;
  mainScenario: string;
  mainPriceBand: string;
  skuTarget: number;
  heroStyleCount: number;
  keyShoeTypes: string[];
  designKeywords: string[];
  mainChannels: string[];
  currentDecision: string;
  decisionStatus: SeriesDecisionStatus;
}

// ─── 设计语言拆解矩阵 ──────────────────────────────────────────────────────

export interface DesignLanguageRow {
  seriesId: string;
  seriesName: string;
  silhouette: string;
  lastType: string;
  outsole: string;
  material: string;
  color: string;
  craft: string;
  functionalHighlight: string;
  forbidden: string;
  benchmark: string;
  hasBrief: boolean;
  affectedSkuCount: number;
}

// ── 趋势承接链路 ────────────────────────────────────────────────────────────

export interface TrendCascade {
  macroTrends: string[];
  brandInterpretation: string;
  seriesDirections: {
    seriesName: string;
    trendBasis: string;
  }[];
}

// ── 本季主题宣言横幅 ─────────────────────────────────────────────────────────

export interface SeasonThemeBanner {
  themeName: string;
  /** 创意概念宣言，20字以内 */
  conceptStatement: string;
  brandTag: string;
  seasonTag: string;
  trendCascade: TrendCascade;
}

// ── 跨系列色彩分配 ───────────────────────────────────────────────────────────

export interface ColorAllocationItem {
  colorName: string;
  hex: string;
  role: 'primary' | 'secondary' | 'accent';
  /** 新色 vs 延续色 */
  isNew: boolean;
  seriesOwnership: {
    seriesName: string;
    allocation: 'exclusive' | 'shared' | 'none';
    colorRole: 'primary' | 'secondary' | 'accent';
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 产品架构工作台 — 新增类型（12 模块）
// ═══════════════════════════════════════════════════════════════════════════

export type ArchRiskLevel = 'healthy' | 'warning' | 'high_risk';
export type ArchActionStatus = 'open' | 'in_progress' | 'resolved';
export type ArchAlignmentStatus = 'aligned' | 'partial' | 'not_aligned' | 'deviated';
export type ProductRole =
  | 'hero' | 'core' | 'basic' | 'image'
  | 'trend' | 'test' | 'profit' | 'volume'
  | 'entry' | 'clearance';
export type ArchViewMode =
  | 'all' | 'hero' | 'high_risk' | 'pending_review'
  | 'over_cost' | 'unassigned_otb' | 'gap_fill' | 'pending_task';
export type ArchMatrixView =
  | 'wave_series' | 'category_price' | 'shoetype_role'
  | 'consumer_scene' | 'cost_risk';
export type DevStatus =
  | 'not_started' | 'briefed' | 'sketching' | 'proto'
  | 'revision' | 'confirmed' | 'cancelled';
export type StyleDecisionStatus =
  | 'push_forward' | 'needs_adjustment' | 'small_batch'
  | 'merge' | 'cancel' | 'submit_review' | 'generate_task';
export type ArchRiskType =
  | 'category_gap' | 'price_congestion' | 'insufficient_hero'
  | 'too_many_test' | 'too_many_new_molds' | 'insufficient_shared_sole'
  | 'cost_overrun' | 'brand_dna_deviation' | 'unaccepted_merch_input'
  | 'wave_launch_risk';

// ── 模块 1：产品架构决策摘要 ─────────────────────────────────────────────────

export interface ProductArchitectureDecisionSummary {
  architectureStatus: ArchRiskLevel;
  mainIssue: string;
  mainOpportunity: string;
  suggestAddDirections: string[];
  suggestReduceDirections: string[];
  waveImpact: boolean;
  waveImpactReason?: string;
  otbBreached: boolean;
  costBreached: boolean;
  totalStyleCount: number;
  heroStyleCount: number;
  missingHeroCount: number;
  totalSkuCount: number;
  newMoldCount: number;
  newMoldLimit: number;
  sharedSoleRate: number;
  sharedLastRate: number;
  otbCoverage: number;
}

// ── 模块 2：商品企划输入承接 ─────────────────────────────────────────────────

export interface ArchitectureInputAlignment {
  inputSource: string;
  inputSummary: string;
  architectureTranslation: string;
  alignmentStatus: ArchAlignmentStatus;
  generatedStyleCount: number;
  unassignedRequirementCount: number;
  deviationRisk: 'low' | 'medium' | 'high' | 'none';
  deviation?: string;
  recommendedAction: string;
  jumpAction: string;
}

// ── 模块 3：OTB → 产品架构拆解 ──────────────────────────────────────────────

export interface OtbProductArchitectureBreakdown {
  waveId: string;
  waveName: string;
  category: string;
  subCategory?: string;
  plannedSkuCount: number;
  architectureSkuCount: number;
  skuGap: number;
  skuWidth: number;
  skuDepth: number;
  heroSkuTarget: number;
  heroSkuActual: number;
  coreSkuTarget: number;
  coreSkuActual: number;
  testSkuTarget: number;
  testSkuActual: number;
  imageSkuTarget: number;
  imageSkuActual: number;
  priceBandTarget: string;
  priceBandActual: string;
  costBandTarget: string;
  costBandActual: string;
  otbBudget: number;
  architectureCostEstimate: number;
  costVariance: number;
  sharedSoleTarget: number;
  sharedLastTarget: number;
  newMoldLimit: number;
  newMoldActual: number;
  alignmentStatus: ArchAlignmentStatus;
  recommendedAction: string;
}

// ── 模块 4：架构健康评分 ─────────────────────────────────────────────────────

export interface ArchHealthDimension {
  dimension: string;
  dimensionKey: string;
  currentValue: number;
  targetValue: number;
  /** currentValue / targetValue * 100，≤100 */
  variance: number;
  riskLevel: ArchRiskLevel;
  deductionReason?: string;
  recommendedAction: string;
}

// ── 模块 5：产品角色结构 ─────────────────────────────────────────────────────

export interface ProductRoleMixItem {
  role: ProductRole;
  roleLabel: string;
  plannedStyleCount: number;
  currentStyleCount: number;
  targetShare: number;
  currentShare: number;
  mainPriceBand: string;
  targetConsumer: string;
  riskLevel: ArchRiskLevel;
  recommendedAction: string;
}

// ── 模块 6：品类鞋型价格架构 ────────────────────────────────────────────────

export interface CategoryShoeTypePriceItem {
  category: string;
  shoeType: string;
  priceBand: string;
  costBand: string;
  targetPriceBand: string;
  grossMarginSpace: number;
  skuCount: number;
  heroStyleCount: number;
  trendHeat: 'high' | 'medium' | 'low';
  riskLevel: ArchRiskLevel;
  gapType: 'opportunity' | 'over_developed' | 'missing_hero' | 'price_risk' | 'margin_risk' | null;
}

// ── 模块 7：架构缺口分析 ─────────────────────────────────────────────────────

export interface ArchitectureGapItem {
  gapId: string;
  gapType: string;
  gapObject: string;
  gapReason: string;
  affectedWave: string;
  affectedSeries: string;
  affectedConsumer?: string;
  expectedImpact: string;
  recommendedAction: string;
  priority: 'P0' | 'P1' | 'P2';
}

// ── 模块 8：产品架构矩阵款式 ────────────────────────────────────────────────

export interface ProductArchitectureMatrixItem {
  styleId: string;
  styleName: string;
  seriesName: string;
  waveName: string;
  category: string;
  shoeType: string;
  productRole: ProductRole;
  targetConsumer: string;
  priceBand: string;
  costBand: string;
  developmentStatus: DevStatus;
  reviewStatus: 'pending' | 'in_progress' | 'approved' | 'rejected';
  riskLevel: ArchRiskLevel;
  riskReason?: string;
  recommendedAction: string;
  sourceOtbPlanId?: string;
  sourceWavePlanId?: string;
  sourceCategoryPlanId?: string;
  isHero: boolean;
  isGapFill: boolean;
  isPendingTask: boolean;
}

// ── 模块 9：款式卡片评审 ─────────────────────────────────────────────────────

export interface StyleCardReviewItem extends ProductArchitectureMatrixItem {
  decisionStatus?: StyleDecisionStatus;
  decisionReason?: string;
  architectureFit: 'high' | 'medium' | 'low';
  brandFit: 'high' | 'medium' | 'low';
  consumerFit: 'high' | 'medium' | 'low';
  trendFit: 'high' | 'medium' | 'low';
  otbFit: 'high' | 'medium' | 'low';
  costRisk: ArchRiskLevel;
  launchRisk: ArchRiskLevel;
}

// ── 模块 10：共楦共底新模效率 ───────────────────────────────────────────────

export interface SharedLastSoleMoldEfficiency {
  sharedLastRate: number;
  sharedLastCount: number;
  sharedLastTarget: number;
  sharedSoleRate: number;
  sharedSoleCount: number;
  sharedSoleTarget: number;
  newMoldCount: number;
  moldBudget: number;
  newMoldRisk: ArchRiskLevel;
  platformReuseRate: number;
  platformReuseTarget: number;
  developmentCostImpact: string;
  launchDelayRisk: ArchRiskLevel;
  recommendedAction: string;
}

// ── 模块 11：架构风险与行动中心 ─────────────────────────────────────────────

export interface ArchitectureRiskActionItem {
  riskId: string;
  riskObject: string;
  riskType: ArchRiskType;
  riskReason: string;
  affectedWave: string;
  affectedSeries: string;
  affectedStyleCount: number;
  expectedImpact: string;
  recommendedAction: string;
  owner: string;
  dueDate: string;
  actionStatus: ArchActionStatus;
  relatedRoute?: string;
}

// ── 模块 12：跨模块入口 ─────────────────────────────────────────────────────

export interface ProductArchitectureRelatedModuleLink {
  linkId: string;
  label: string;
  description: string;
  category: 'internal' | 'external';
  actionLabel: string;
  jumpAction: string;
  queryParams?: Record<string, string>;
  icon: string;
}








