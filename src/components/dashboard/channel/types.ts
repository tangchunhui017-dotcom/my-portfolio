// ── 区域&门店工作台 类型定义 ─────────────────────────────────

export type RiskLevel = 'high' | 'medium' | 'low' | 'healthy' | 'none';
export type ActionStatus = 'suggested' | 'pending' | 'in_progress' | 'completed' | 'closed';
export type StoreLevel = 'S' | 'A' | 'B' | 'C' | 'D' | 'outlet' | 'new' | 'popup';
export type ActionType =
    | 'replenish'
    | 'transfer'
    | 'reduce'
    | 'clearance'
    | 'size_deepen'
    | 'display'
    | 'price_adjust'
    | 'sku_restructure'
    | 'tier_adjust'
    | 'delay_replenish'
    | 'reduce_inventory';

export interface RegionStoreKpi {
    key: string;
    label: string;
    value: string;
    target?: string;
    diff?: string;
    diffPct?: number;
    yoyRate?: number;
    momRate?: number;
    status: 'healthy' | 'opportunity' | 'warning' | 'risk' | 'observe' | 'none';
    sub?: string;
}

export interface RegionStoreDecisionItem {
    id: string;
    type: 'add' | 'control' | 'risk_store' | 'replenish' | 'clearance' | 'transfer_sku' | 'new_store_risk' | 'sku_adjust';
    label: string;
    subjects: string[];
    reason: string;
    tone: 'good' | 'warn' | 'risk' | 'info';
}

export interface RegionStoreAction {
    id: string;
    priority: 'high' | 'medium' | 'low';
    subject: string;
    subjectType: 'region' | 'store' | 'sku' | 'size' | 'category' | 'wave';
    riskTag: string;
    reason: string;
    action: string;
    actionType: ActionType;
    salesImpact: string;
    inventoryImpact: string;
    cashImpact: string;
    relatedModule: string;
    status: ActionStatus;
}

export interface StoreTierItem {
    tier: StoreLevel;
    label: string;
    colorClass: string;
    bgClass: string;
    storeCount: number;
    salesContribution: number;   // 0-1
    grossMargin: number;          // 0-1
    inventoryAmount: number;
    wos: number;
    skuWidth: number;
    skuDepth: number;
    newStyleRatio: number;        // 0-1
    heroStyleRatio: number;       // 0-1
    replenishFrequency: string;
    merchandiseStrategy: string;
    stores: StoreTierStoreRow[];
}

export interface StoreTierStoreRow {
    storeId: string;
    storeName: string;
    region: string;
    format: string;
    netSales: number;
    sellThrough: number;
    inventoryUnits: number;
    wos: number;
    sizeCompleteness: number;
}

export interface RegionalPerformanceItem {
    region: string;
    salesAmount: number;
    salesTarget: number;
    salesAchievementRate: number;
    grossMargin: number;
    sellThroughRate: number;
    inventoryAmount: number;
    wos: number;
    sizeCompleteness: number;
    storeCount: number;
    efficientStoreCount: number;
    inefficientStoreCount: number;
    yoyRate: number;
    recommendedAction: string;
    actionType: 'add' | 'maintain' | 'control' | 'clear';
}

export interface StorePerformanceRankingItem {
    storeId: string;
    storeName: string;
    region: string;
    city: string;
    cityTier: string;
    storeLevel: StoreLevel;
    salesAmount: number;
    salesAchievementRate: number;
    grossMargin: number;
    salesPerSquareMeter: number;
    salesPerStaff: number;
    sellThroughRate: number;
    wos: number;
    sizeCompleteness: number;
    riskLevel: RiskLevel;
    recommendedAction: string;
    rankType: 'top_sales' | 'top_growth' | 'top_margin' | 'risk' | 'inefficient';
}

export interface StoreProductFitItem {
    storeId: string;
    storeName: string;
    region: string;
    businessDistrict: string;
    storeLevel: StoreLevel;
    targetConsumer: string;
    fitCategory: string;
    fitShoeType: string;
    fitPriceBand: string;
    fitSkuRole: string;
    recommendedSkuCount: number;
    recommendedDepth: number;
    heroSkuSuggestion: string;
    riskLevel: RiskLevel;
}

export interface StoreInventorySizeHealthItem {
    storeId: string;
    storeName: string;
    region: string;
    inventoryAmount: number;
    inventoryUnits: number;
    wos: number;
    inventoryAge: number;
    sellThroughRate: number;
    sizeCompleteness: number;
    coreSizeCompleteness: number;
    brokenSizeSkuCount: number;
    goldenSizeShortageAmount: number;
    longTailSizeOverstockAmount: number;
    recommendedAction: string;
    riskLevel: RiskLevel;
}

export interface ReplenishmentTransferItem {
    id: string;
    fromStoreId: string;
    fromStoreName: string;
    toStoreId: string;
    toStoreName: string;
    sku: string;
    size: string;
    transferQuantity: number;
    expectedSalesImpact: number;
    expectedInventoryImpact: number;
    actionType: 'transfer' | 'replenish' | 'outlet' | 'stop' | 'new_store_add';
    priority: 'high' | 'medium' | 'low';
    status: ActionStatus;
    reason: string;
}

export interface RegionalDesignSignalItem {
    region: string;
    highGrowthShoeTypes: string[];
    highReturnShoeTypes: string[];
    highGrowthColors: string[];
    highGrowthMaterials: string[];
    functionalDemand: string;
    consumerFeedback: string;
    designSuggestion: string;
    designAction: 'continue' | 'test' | 'reduce' | 'optimize_comfort' | 'optimize_last' | 'optimize_material' | 'adjust_color';
}

export interface NewStoreRampUpItem {
    storeId: string;
    storeName: string;
    region: string;
    openMonth: string;
    storeArea: number;
    initialSkuCount: number;
    initialInventoryAmount: number;
    month1Sales: number;
    month3Sales: number;
    month6Sales: number;
    currentSalesAchievementRate: number;
    paybackPeriodMonths: number;
    onTrack: boolean;
    recommendedAction: string;
}

export interface StoreDetailItem {
    storeId: string;
    storeName: string;
    region: string;
    city: string;
    cityTier: string;
    storeType: string;
    storeLevel: StoreLevel;
    businessDistrict: string;
    salesAmount: number;
    salesAchievementRate: number;
    grossMargin: number;
    inventoryAmount: number;
    wos: number;
    sellThroughRate: number;
    sizeCompleteness: number;
    traffic: number;
    conversionRate: number;
    pairPerTicket: number;
    averageOrderValue: number;
    salesPerSquareMeter: number;
    rentCost: number;
    laborCost: number;
    profitMargin: number;
    riskLevel: RiskLevel;
    recommendedAction: string;
}

export interface RegionStoreRelatedModuleLink {
    moduleKey: string;
    moduleName: string;
    relation: string;
    icon: string;
    colorClass: string;
    params: Record<string, string>;
}
