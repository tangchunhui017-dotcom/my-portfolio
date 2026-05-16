/**
 * src/components/config/configMenuStructure.ts
 * 全局配置抽屉左侧菜单结构定义 — V18 六段中文菜单
 */

export type ConfigMenuSection =
    | 'brand-overview'
    | 'basic-settings'
    | 'business-modules'
    | 'config-review'
    | 'admin';

export interface ConfigMenuItem {
    id: string;
    label: string;
    icon: string;
    description: string;
    panelComponent: string;
    section: ConfigMenuSection;
}

export const CONFIG_MENU: ConfigMenuItem[] = [
    // ── 1. 品牌总览 ──────────────────────────────────────────────
    {
        id: 'brand-overview',
        label: '品牌总览',
        icon: '🏷️',
        description: '品牌切换 / Override 差异 / 一键复制',
        panelComponent: 'BrandOverviewPanel',
        section: 'brand-overview',
    },

    // ── 2. 基础设定 ──────────────────────────────────────────────
    {
        id: 'metrics',
        label: '指标定义',
        icon: '📐',
        description: '公式 / 单位 / 分类',
        panelComponent: 'MetricsPanel',
        section: 'basic-settings',
    },
    {
        id: 'dimensions',
        label: '维度定义',
        icon: '🗂️',
        description: '区域/城市/季节/波段/品类',
        panelComponent: 'DimensionsPanel',
        section: 'basic-settings',
    },
    {
        id: 'thresholds',
        label: '阈值规则',
        icon: '⚠️',
        description: '业务红线 / 警戒线',
        panelComponent: 'ThresholdsPanel',
        section: 'basic-settings',
    },
    {
        id: 'formula-editor',
        label: '公式编辑器',
        icon: '🧮',
        description: '可视化公式编辑',
        panelComponent: 'FormulaEditorPanel',
        section: 'basic-settings',
    },

    // ── 3. 业务模块配置 ───────────────────────────────────────────
    {
        id: 'tab-overview',
        label: '总览',
        icon: '📊',
        description: '总览页配置',
        panelComponent: 'OverviewTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-annual-control',
        label: '年度总控',
        icon: '🗺️',
        description: '年度计划与目标拆分',
        panelComponent: 'AnnualControlTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-region-store',
        label: '区域&门店',
        icon: '🏪',
        description: '区域销售目标、调拨规则、阈值',
        panelComponent: 'RegionStoreTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-consumer',
        label: '消费者画像',
        icon: '🧑‍🤝‍🧑',
        description: '会员、客群、偏好',
        panelComponent: 'ConsumerTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-category-ops',
        label: '品类运营',
        icon: '📋',
        description: '品类、价格带、生命周期',
        panelComponent: 'CategoryOpsTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-wave-planning',
        label: '波段企划',
        icon: '📅',
        description: '季节配置、波段流转、上市节奏、生命周期',
        panelComponent: 'WavePlanningTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-otb',
        label: 'OTB 预算',
        icon: '💰',
        description: 'OTB 计算规则、审批流',
        panelComponent: 'OtbTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-cashflow',
        label: '现金流',
        icon: '💧',
        description: '回款/支出/清货模拟规则',
        panelComponent: 'CashflowTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-forecast',
        label: '销售预测',
        icon: '📈',
        description: '预测模型与情景参数',
        panelComponent: 'ForecastTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-pnl',
        label: '损益表',
        icon: '💹',
        description: '毛利/税费/折扣规则',
        panelComponent: 'PnlTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-competitor',
        label: '竞品&趋势',
        icon: '🧭',
        description: '竞品对标',
        panelComponent: 'CompetitorTabPanel',
        section: 'business-modules',
    },
    {
        id: 'tab-inventory',
        label: '库存健康',
        icon: '📦',
        description: '库龄/调拨/计提规则',
        panelComponent: 'InventoryTabPanel',
        section: 'business-modules',
    },

    // ── 4. 配置审查 ───────────────────────────────────────────────
    {
        id: 'config-business-loop',
        label: '业务闭环',
        icon: '🔁',
        description: '12 个模块的角色、上下游与必备指标',
        panelComponent: 'MerchBusinessLoopPanel',
        section: 'config-review',
    },
    {
        id: 'config-dependency',
        label: '依赖关系图',
        icon: '🔗',
        description: '指标→Tab 影响链路可视化',
        panelComponent: 'ConfigDependencyGraph',
        section: 'config-review',
    },
    {
        id: 'config-changelog',
        label: '变更日志',
        icon: '📜',
        description: '历史修改记录审计',
        panelComponent: 'ConfigChangeLog',
        section: 'config-review',
    },
    {
        id: 'config-health',
        label: '健康度检测',
        icon: '🩺',
        description: '自动扫描配置冲突与异常',
        panelComponent: 'ConfigHealthCheck',
        section: 'config-review',
    },

    // ── 5. 管理 ────────────────────────────────────────────────────
    {
        id: 'user-preferences',
        label: '用户偏好',
        icon: '👤',
        description: '主题、收藏、默认筛选',
        panelComponent: 'UserPreferencesPanel',
        section: 'admin',
    },
];

export const SECTION_META: Record<ConfigMenuSection, { label: string; icon: string }> = {
    'brand-overview': { label: '品牌总览', icon: '🏷️' },
    'basic-settings': { label: '基础设定', icon: '📐' },
    'business-modules': { label: '业务模块配置', icon: '🗂️' },
    'config-review':  { label: '配置审查', icon: '🔍' },
    'admin':          { label: '管理', icon: '⚙️' },
};
