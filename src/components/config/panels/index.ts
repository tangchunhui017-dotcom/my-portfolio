/**
 * src/components/config/panels/index.ts
 * 所有配置面板的统一导出
 */
export { default as MetricsPanel } from './MetricsPanel';
export { default as DimensionsPanel } from './DimensionsPanel';
export { default as ThresholdsPanel } from './ThresholdsPanel';
export { default as FormulaEditorPanel } from './FormulaEditorPanel';

export { default as OverviewTabPanel } from './OverviewTabPanel';
export { default as AnnualControlTabPanel } from './AnnualControlTabPanel';
export { default as RegionStoreTabPanel } from './RegionStoreTabPanel';
export { default as ConsumerTabPanel } from './ConsumerTabPanel';
export { default as CategoryOpsTabPanel } from './CategoryOpsTabPanel';
export { default as WavePlanningTabPanel } from './WavePlanningTabPanel';
export { default as OtbTabPanel } from './OtbTabPanel';
export { default as CashflowTabPanel } from './CashflowTabPanel';
export { default as ForecastTabPanel } from './ForecastTabPanel';
export { default as PnlTabPanel } from './PnlTabPanel';
export { default as CompetitorTabPanel } from './CompetitorTabPanel';
export { default as InventoryTabPanel } from './InventoryTabPanel';

export { default as BrandManagementPanel } from './BrandManagementPanel';
export { default as UserPreferencesPanel } from './UserPreferencesPanel';

// V18 新增面板
export { default as SeasonWaveConfigPanel } from './SeasonWaveConfigPanel';
export { default as BrandOverviewPanel } from './BrandOverviewPanel';
export { default as ConfigDependencyGraph } from './ConfigDependencyGraph';
export { default as ConfigChangeLog } from './ConfigChangeLog';
export { default as ConfigHealthCheck } from './ConfigHealthCheck';
export { default as MerchBusinessLoopPanel } from './MerchBusinessLoopPanel';
