'use client';
/**
 * src/components/config/GlobalConfigDrawer.tsx
 * V18 - 品牌商品企划运营中台 全局配置抽屉
 * 中文菜单区, 统一 Panel 渲染
 */
import { useState, type ComponentType } from 'react';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import { CONFIG_MENU, SECTION_META, type ConfigMenuSection } from './configMenuStructure';
import BrandSwitcher from './BrandSwitcher';
import {
    MetricsPanel, DimensionsPanel, ThresholdsPanel, FormulaEditorPanel,
    OverviewTabPanel, AnnualControlTabPanel, RegionStoreTabPanel, ConsumerTabPanel,
    CategoryOpsTabPanel, WavePlanningTabPanel, OtbTabPanel, CashflowTabPanel,
    ForecastTabPanel, PnlTabPanel, CompetitorTabPanel, InventoryTabPanel,
    BrandManagementPanel, UserPreferencesPanel,
    BrandOverviewPanel,
    ConfigDependencyGraph, ConfigChangeLog, ConfigHealthCheck,
    MerchBusinessLoopPanel,
} from './panels';

interface Props {
    open: boolean;
    onClose: () => void;
}

const PANEL_MAP: Record<string, ComponentType> = {
    MetricsPanel, DimensionsPanel, ThresholdsPanel, FormulaEditorPanel,
    OverviewTabPanel, AnnualControlTabPanel, RegionStoreTabPanel, ConsumerTabPanel,
    CategoryOpsTabPanel, WavePlanningTabPanel, OtbTabPanel, CashflowTabPanel,
    ForecastTabPanel, PnlTabPanel, CompetitorTabPanel, InventoryTabPanel,
    BrandManagementPanel, UserPreferencesPanel,
    BrandOverviewPanel,
    ConfigDependencyGraph, ConfigChangeLog, ConfigHealthCheck,
    MerchBusinessLoopPanel,
};

const SECTION_ORDER: ConfigMenuSection[] = [
    'brand-overview', 'basic-settings', 'business-modules', 'config-review', 'admin',
];

export default function GlobalConfigDrawer({ open, onClose }: Props) {
    const { markConfigured, resetConfig } = useGlobalConfig();
    const [activePanelId, setActivePanelId] = useState<string>(CONFIG_MENU[0].id);
    const [collapsedSections, setCollapsedSections] = useState<Set<ConfigMenuSection>>(new Set());

    if (!open) return null;

    const activeItem = CONFIG_MENU.find((m) => m.id === activePanelId) ?? CONFIG_MENU[0];

    function toggleSection(section: ConfigMenuSection) {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    }

    const PanelComponent = PANEL_MAP[activeItem.panelComponent];

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
            <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl">
                {/* 顶部标题栏 */}
                <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-slate-900">品牌商品企划运营中台</h2>
                            <span className="hidden sm:block text-slate-300">|</span>
                            <div className="hidden sm:block">
                                <BrandSwitcher compact />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        X
                    </button>
                </div>

                <div className="flex min-h-0 flex-1">
                    {/* 左侧统一菜单 */}
                    <aside className="w-56 flex-shrink-0 overflow-y-auto border-r border-slate-100 bg-slate-50/60 py-3">
                        <div className="sm:hidden px-3 pb-2">
                            <BrandSwitcher compact />
                        </div>
                        {SECTION_ORDER.map((section) => {
                            const items = CONFIG_MENU.filter((m) => m.section === section);
                            const meta = SECTION_META[section];
                            const collapsed = collapsedSections.has(section);
                            if (section === 'brand-overview') {
                                return (
                                    <div key={section} className="px-2 mb-1">
                                        {items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => setActivePanelId(item.id)}
                                                className={`w-full text-left px-3 py-3 rounded-xl border transition-all mb-1 ${
                                                    activePanelId === item.id
                                                        ? 'border-sky-200 bg-white text-sky-700 shadow-sm'
                                                        : 'border-transparent text-slate-700 hover:bg-white hover:border-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{item.icon}</span>
                                                    <span className="font-semibold text-sm">{item.label}</span>
                                                </div>
                                                <p className="mt-0.5 pl-6 text-[11px] text-slate-400 leading-4">
                                                    {item.description}
                                                </p>
                                            </button>
                                        ))}
                                        <div className="mx-2 my-1 border-b border-slate-100" />
                                    </div>
                                );
                            }
                            return (
                                <div key={section} className="px-2 mb-1">
                                    <button
                                        onClick={() => toggleSection(section)}
                                        className="w-full flex items-center justify-between px-2 py-1.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600"
                                    >
                                        <span>{meta.icon} {meta.label}</span>
                                        <span className="text-[9px]">{collapsed ? 'v' : '^'}</span>
                                    </button>
                                    {!collapsed && items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActivePanelId(item.id)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                                activePanelId === item.id
                                                    ? 'bg-sky-50 text-sky-700 font-medium'
                                                    : 'text-slate-600 hover:bg-white hover:text-slate-800'
                                            }`}
                                        >
                                            <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    ))}
                                    <div className="mx-2 my-1.5 border-b border-slate-100" />
                                </div>
                            );
                        })}
                    </aside>

                    {/* 右侧面板内容 */}
                    <main className="min-h-0 flex-1 overflow-y-auto">
                        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white/95 px-6 py-3 backdrop-blur-sm">
                            <span className="text-xl">{activeItem.icon}</span>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">{activeItem.label}</h3>
                                <p className="text-[11px] text-slate-400">{activeItem.description}</p>
                            </div>
                        </div>
                        <div className="px-6 py-5">
                            {PanelComponent ? (
                                <PanelComponent />
                            ) : (
                                <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                                    面板组件未找到：{activeItem.panelComponent}
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* 底部操作栏 */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
                    <button
                        onClick={resetConfig}
                        className="text-sm text-slate-500 hover:text-rose-500 transition-colors"
                    >
                        恢复默认
                    </button>
                    <button
                        onClick={() => { markConfigured(); onClose(); }}
                        className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors shadow-sm"
                    >
                        保存配置
                    </button>
                </div>
            </div>
        </>
    );
}
