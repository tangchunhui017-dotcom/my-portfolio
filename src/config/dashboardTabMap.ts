/**
 * src/config/dashboardTabMap.ts
 * 12 个仪表盘 Tab 在两套 key 体系之间的双向映射。
 *
 * - DashboardTab：DashboardPage.client.tsx 内部使用的页面 key（历史命名）
 * - TabKey：商品企划中台配置体系使用的标准 key（src/types/merchConfig.ts）
 *
 * 任何跨界使用（页面跳转 → 配置查询、配置推送 → 页面切换）都必须通过此映射做转换，
 * 避免在新代码里再次出现 'category'/'profit-loss' 这类历史命名。
 */
import type { TabKey } from '@/types/merchConfig';

export type DashboardTab =
    | 'overview'
    | 'annual-control'
    | 'channel'
    | 'consumer'
    | 'category'
    | 'planning'
    | 'otb'
    | 'cashflow'
    | 'forecast'
    | 'profit-loss'
    | 'competitor'
    | 'inventory';

export const DASHBOARD_TAB_TO_CONFIG_TAB: Record<DashboardTab, TabKey> = {
    'overview':       'overview',
    'annual-control': 'annual-control',
    'channel':        'region-store',
    'consumer':       'consumer',
    'category':       'category-ops',
    'planning':       'wave-planning',
    'otb':            'otb',
    'cashflow':       'cashflow',
    'forecast':       'forecast',
    'profit-loss':    'pnl',
    'competitor':     'competitor-trend',
    'inventory':      'inventory-health',
};

export const CONFIG_TAB_TO_DASHBOARD_TAB: Record<TabKey, DashboardTab> = {
    'overview':         'overview',
    'annual-control':   'annual-control',
    'region-store':     'channel',
    'consumer':         'consumer',
    'category-ops':     'category',
    'wave-planning':    'planning',
    'otb':              'otb',
    'cashflow':         'cashflow',
    'forecast':         'forecast',
    'pnl':              'profit-loss',
    'competitor-trend': 'competitor',
    'inventory-health': 'inventory',
};

export function toConfigTab(tab: DashboardTab): TabKey {
    return DASHBOARD_TAB_TO_CONFIG_TAB[tab];
}

export function toDashboardTab(tab: TabKey): DashboardTab {
    return CONFIG_TAB_TO_DASHBOARD_TAB[tab];
}
