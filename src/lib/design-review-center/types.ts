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










