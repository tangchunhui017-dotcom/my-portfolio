'use client';
/**
 * StoreWorkbench.tsx
 * 门店经营工作台 — 城市线级表现 + 门店分级策略 + 门店经营列表一体化
 */
import { useState, useMemo, useCallback, Fragment } from 'react';
import type { StoreTierItem } from './types';

// ─── 输入类型 ────────────────────────────────────────────────

export interface WorkbenchCityRow {
    region: string;
    city_tier: string;
    store_count: number;
    net_sales: number;
    sell_through: number;    // 0–1
    inventory_units: number;
}

export interface WorkbenchStoreRow {
    store_id: string;
    store_name: string;
    region: string;
    city_tier: string;
    store_format: string;
    net_sales: number;
    units: number;
    sell_through: number;    // 0–1
    gm_rate: number;
    inventory_units: number;
    store_efficiency: number;
    active_sku_count: number;
}

interface Props {
    cityRows: WorkbenchCityRow[];
    storeTiers: StoreTierItem[];
    /** 已按 activeDrillRegion 过滤，但未按城市线级 / 店态等级再次过滤 */
    stores: WorkbenchStoreRow[];
    activeDrillRegion: string;
    regionLabel: string;
    sectionScopeHint: string;
    formatMoney: (v: number) => string;
    getRegionLabel: (r: string) => string;
}

// ─── 内部类型 ────────────────────────────────────────────────

type StoreView = 'all' | 'top_sales' | 'top_growth' | 'top_margin' | 'efficient' | 'risk' | 'out_of_stock' | 'inefficient' | 'new_store' | 'outlet';
type StoreTierKey = 'all' | 'S' | 'A' | 'B' | 'outlet';

interface EnrichedStoreRow extends WorkbenchStoreRow {
    storeTier: 'S' | 'A' | 'B' | 'outlet';
    riskLevel: 'high' | 'medium' | 'healthy';
    wos: number;
    achievementRate: number;
    avgOrderValue: number;
    sqmEfficiency: number;
    sizeCompleteness: number;
    inventoryAmount: number;
    city: string;
    recommendedAction: string;
}

// ─── 工具函数 ────────────────────────────────────────────────

function deriveStoreTier(fmt: string): 'S' | 'A' | 'B' | 'outlet' {
    if (fmt.includes('Mall') || fmt.includes('旗舰')) return 'S';
    if (fmt.includes('Outlet') || fmt.includes('奥莱')) return 'outlet';
    if (fmt.includes('Street') || fmt.includes('主力')) return 'A';
    return 'B';
}

function deriveRiskLevel(row: WorkbenchStoreRow): 'high' | 'medium' | 'healthy' {
    if (row.sell_through < 0.25) return 'high';
    if (row.inventory_units > 1000) return 'medium';
    return 'healthy';
}

const REGION_CITY_MAP: Record<string, string> = {
    EAST: 'EA市', SOUTH: 'SO市', NORTH: 'NO市', WEST: 'WE市',
    SW: 'SW市', NW: 'NW市', NE: 'NE市', CENTRAL: 'CE市',
};
function deriveCity(storeId: string): string {
    const prefix = storeId.split('-')[0];
    return REGION_CITY_MAP[prefix] || prefix + '市';
}

function fmtPct(v: number, d = 1) {
    return `${(v * 100).toFixed(d)}%`;
}

function fmtNum(v: number) {
    return v.toLocaleString('zh-CN');
}

function riskBadgeClass(r: 'high' | 'medium' | 'healthy') {
    if (r === 'high') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (r === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}
function riskBadgeLabel(r: 'high' | 'medium' | 'healthy') {
    if (r === 'high') return '⚠ 高风险';
    if (r === 'medium') return '预警';
    return '健康';
}

function tierBadgeClass(t: string) {
    if (t === 'S') return 'bg-violet-100 text-violet-700 border-violet-200';
    if (t === 'A') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t === 'outlet') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-teal-100 text-teal-700 border-teal-200';
}

const VIEW_PRESETS: { key: StoreView; label: string }[] = [
    { key: 'all', label: '全部门店' },
    { key: 'top_sales', label: 'Top 销售' },
    { key: 'top_growth', label: 'Top 增长' },
    { key: 'top_margin', label: 'Top 毛利' },
    { key: 'efficient', label: '高效门店' },
    { key: 'risk', label: '高风险门店' },
    { key: 'out_of_stock', label: '缺货门店' },
    { key: 'inefficient', label: '低效门店' },
    { key: 'new_store', label: '新店' },
    { key: 'outlet', label: 'Outlet' },
];

// 城市线级专属配色（与 S/A/B/Outlet 分级卡片同一视觉语言）
const CITY_TIER_CONFIG: Record<string, { border: string; bg: string; ring: string; title: string; sub: string }> = {
    '一线':   { border: 'border-indigo-300', bg: 'bg-indigo-50',   ring: 'ring-indigo-300',  title: 'text-indigo-800',  sub: 'text-indigo-500' },
    '新一线': { border: 'border-blue-300',   bg: 'bg-blue-50',     ring: 'ring-blue-300',    title: 'text-blue-800',    sub: 'text-blue-500' },
    '二线':   { border: 'border-teal-300',   bg: 'bg-teal-50',     ring: 'ring-teal-300',    title: 'text-teal-800',    sub: 'text-teal-500' },
    '三线':   { border: 'border-emerald-300',bg: 'bg-emerald-50',  ring: 'ring-emerald-300', title: 'text-emerald-800', sub: 'text-emerald-500' },
    '四线':   { border: 'border-amber-300',  bg: 'bg-amber-50',    ring: 'ring-amber-300',   title: 'text-amber-800',   sub: 'text-amber-500' },
};
const CITY_TIER_DEFAULT = { border: 'border-slate-300', bg: 'bg-slate-50', ring: 'ring-slate-300', title: 'text-slate-800', sub: 'text-slate-500' };

const TIER_CARD_CONFIG = {
    S: { label: '旗舰 S 级', border: 'border-violet-300', bg: 'bg-violet-50', num: 'text-violet-700', badge: 'bg-violet-100 text-violet-700 border-violet-200', ring: 'ring-violet-300' },
    A: { label: '主力 A 级', border: 'border-blue-300', bg: 'bg-blue-50', num: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200', ring: 'ring-blue-300' },
    B: { label: '标准 B 级', border: 'border-teal-300', bg: 'bg-teal-50', num: 'text-teal-700', badge: 'bg-teal-100 text-teal-700 border-teal-200', ring: 'ring-teal-300' },
    outlet: { label: '奥莱 Outlet', border: 'border-orange-300', bg: 'bg-orange-50', num: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200', ring: 'ring-orange-300' },
} as const;

// ─── 组件 ────────────────────────────────────────────────────

export default function StoreWorkbench({
    cityRows,
    storeTiers,
    stores,
    activeDrillRegion,
    regionLabel,
    sectionScopeHint,
    formatMoney,
    getRegionLabel,
}: Props) {
    const [selectedCityTier, setSelectedCityTier] = useState<string>('all');
    const [selectedStoreTier, setSelectedStoreTier] = useState<StoreTierKey>('all');
    const [selectedStoreView, setSelectedStoreView] = useState<StoreView>('all');
    const [expandedStoreId, setExpandedStoreId] = useState<string>('');

    // 大区切换时重置内部筛选
    const handleCityTierToggle = useCallback((tier: string) => {
        setSelectedCityTier((prev) => (prev === tier ? 'all' : tier));
        setExpandedStoreId('');
    }, []);

    const handleStoreTierToggle = useCallback((tier: StoreTierKey) => {
        setSelectedStoreTier((prev) => (prev === tier ? 'all' : tier));
        setExpandedStoreId('');
    }, []);

    const handleStoreViewChange = useCallback((view: StoreView) => {
        setSelectedStoreView(view);
        setExpandedStoreId('');
    }, []);

    // 丰富店铺数据
    const enrichedStores = useMemo<EnrichedStoreRow[]>(() => {
        return stores.map((s) => ({
            ...s,
            storeTier: deriveStoreTier(s.store_format),
            riskLevel: deriveRiskLevel(s),
            wos: s.units > 0 ? s.inventory_units / (s.units / 13) : 0,
            achievementRate: Math.min(s.store_efficiency / 1500 + 0.8, 1.5),
            avgOrderValue: s.units > 0 ? s.net_sales / s.units : 350,
            sqmEfficiency: s.net_sales / 200,
            sizeCompleteness: s.sell_through > 0.5 ? 0.82 : 0.65,
            inventoryAmount: s.inventory_units * 280,
            city: deriveCity(s.store_id),
            recommendedAction: s.sell_through < 0.25 ? '清货去化' : s.sell_through > 0.8 ? '追加补货' : '维持',
        }));
    }, [stores]);

    // 按城市线级计算风险门店数
    const cityRiskMap = useMemo(() => {
        const map = new Map<string, number>();
        enrichedStores.forEach((s) => {
            if (s.riskLevel === 'high') {
                map.set(s.city_tier, (map.get(s.city_tier) || 0) + 1);
            }
        });
        return map;
    }, [enrichedStores]);

    // 最终展示的门店列表（应用所有筛选）
    const displayedStores = useMemo<EnrichedStoreRow[]>(() => {
        let rows = enrichedStores;

        if (selectedCityTier !== 'all') {
            rows = rows.filter((s) => s.city_tier === selectedCityTier);
        }
        if (selectedStoreTier !== 'all') {
            rows = rows.filter((s) => s.storeTier === selectedStoreTier);
        }

        switch (selectedStoreView) {
            case 'top_sales':
                return [...rows].sort((a, b) => b.net_sales - a.net_sales).slice(0, 10);
            case 'top_growth':
                return [...rows].sort((a, b) => b.store_efficiency - a.store_efficiency).slice(0, 10);
            case 'top_margin':
                return [...rows].sort((a, b) => b.gm_rate - a.gm_rate).slice(0, 10);
            case 'efficient':
                return rows
                    .filter((s) => s.store_efficiency >= 3000)
                    .sort((a, b) => b.store_efficiency - a.store_efficiency);
            case 'risk':
                return rows
                    .filter((s) => s.riskLevel !== 'healthy')
                    .sort((a, b) => {
                        const order = { high: 0, medium: 1, healthy: 2 };
                        return order[a.riskLevel] - order[b.riskLevel];
                    });
            case 'out_of_stock':
                return rows
                    .filter((s) => s.sell_through > 0.8 || s.wos < 4)
                    .sort((a, b) => a.wos - b.wos);
            case 'inefficient':
                return rows
                    .filter((s) => s.store_efficiency < 1200)
                    .sort((a, b) => a.store_efficiency - b.store_efficiency);
            case 'new_store':
                return rows.filter((s) => s.store_id.includes('NEW') || s.store_format.includes('新店'));
            case 'outlet':
                return rows.filter((s) => s.storeTier === 'outlet');
            default:
                return [...rows].sort((a, b) => b.net_sales - a.net_sales);
        }
    }, [enrichedStores, selectedCityTier, selectedStoreTier, selectedStoreView]);

    // 口径描述
    const scopeDesc = useMemo(() => {
        const parts: string[] = [regionLabel];
        if (selectedCityTier !== 'all') parts.push(selectedCityTier);
        if (selectedStoreTier !== 'all') parts.push(TIER_CARD_CONFIG[selectedStoreTier].label);
        return parts.join(' · ');
    }, [regionLabel, selectedCityTier, selectedStoreTier]);

    return (
        <div className="space-y-4">

            {/* ── Section 1：城市线级表现 ── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-700">
                        {activeDrillRegion === 'all' ? '全部区域' : getRegionLabel(activeDrillRegion)} · 城市线级表现
                    </div>
                    {selectedCityTier !== 'all' && (
                        <button
                            onClick={() => handleCityTierToggle('all')}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            清空线级筛选
                        </button>
                    )}
                </div>

                {cityRows.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 p-4 text-xs text-slate-400">
                        当前区域暂无城市线级数据
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                        {cityRows.map((row) => {
                            const isActive = selectedCityTier === row.city_tier;
                            const riskCount = cityRiskMap.get(row.city_tier) || 0;
                            const ccfg = CITY_TIER_CONFIG[row.city_tier] ?? CITY_TIER_DEFAULT;
                            return (
                                <button
                                    key={`${row.region}-${row.city_tier}`}
                                    onClick={() => handleCityTierToggle(row.city_tier)}
                                    className={`text-left rounded-xl border-2 p-2.5 transition-all ${ccfg.border} ${ccfg.bg} ${
                                        isActive
                                            ? `ring-2 ring-offset-1 ${ccfg.ring}`
                                            : 'opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-bold ${ccfg.title}`}>
                                            {row.city_tier}
                                        </span>
                                        <span className={`text-[10px] ${ccfg.sub}`}>
                                            {row.store_count}店
                                        </span>
                                    </div>
                                    <div className={`text-[11px] font-semibold ${ccfg.title}`}>
                                        {formatMoney(row.net_sales)}
                                    </div>
                                    <div className={`text-[10px] mt-0.5 ${ccfg.sub}`}>
                                        售罄 {fmtPct(row.sell_through)} · 库存 {fmtNum(row.inventory_units)}双
                                    </div>
                                    {riskCount > 0 && (
                                        <div className="text-[10px] mt-1 text-rose-500">
                                            ⚠ {riskCount}家高风险
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Section 2：门店分级策略（手风琴彩色外框）── */}
            {storeTiers.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-700">门店分级策略 · <span className="text-slate-400 font-normal text-xs">S/A/B/C/D/奥莱/新店/快闪 差异化商品配置</span></div>
                        {selectedStoreTier !== 'all' && (
                            <button
                                onClick={() => handleStoreTierToggle('all')}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                                清空等级筛选
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">不同等级门店对应不同商品策略。点击卡片可在下方门店明细表中筛选该等级门店。</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {storeTiers.map((tier) => {
                            const cfg = TIER_CARD_CONFIG[tier.tier as keyof typeof TIER_CARD_CONFIG];
                            if (!cfg) return null;
                            const isActive = selectedStoreTier === tier.tier;
                            return (
                                <button
                                    key={tier.tier}
                                    onClick={() => handleStoreTierToggle(tier.tier as StoreTierKey)}
                                    className={`text-left rounded-xl border-2 p-3 transition-all ${cfg.border} ${cfg.bg} ${
                                        isActive ? `ring-2 ring-offset-1 ${cfg.ring}` : 'opacity-80 hover:opacity-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                                            {tier.tier === 'outlet' ? 'OUTLET' : tier.tier.toUpperCase()}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-800">{tier.label}</span>
                                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border font-medium ${cfg.badge}`}>
                                            {tier.storeCount}店
                                        </span>
                                    </div>
                                    <div className="text-[11px] space-y-1">
                                        <div className="flex justify-between text-slate-600">
                                            <span className="text-slate-400">贡献</span>
                                            <span className="font-medium">{fmtPct(tier.salesContribution)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span className="text-slate-400">毛利率</span>
                                            <span className="font-medium">{fmtPct(tier.grossMargin)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span className="text-slate-400">WOS</span>
                                            <span className="font-medium">{tier.wos.toFixed(1)}周</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span className="text-slate-400">SKU</span>
                                            <span className="font-medium">{tier.skuWidth}款×{tier.skuDepth}深</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span className="text-slate-400">新品比</span>
                                            <span className="font-medium">{fmtPct(tier.newStyleRatio, 0)}</span>
                                        </div>
                                    </div>
                                    <div className={`mt-2 text-[10px] rounded px-1.5 py-1 bg-white/60 ${cfg.num} font-medium line-clamp-2`}>
                                        {tier.merchandiseStrategy}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Section 3：门店经营列表 ── */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* 列表标题 */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-800">
                        门店明细表 · {scopeDesc} · 共 {displayedStores.length} 店
                    </div>
                    <div className="text-[11px] text-slate-400">{sectionScopeHint}</div>
                </div>

                {/* 视图预设按钮（带计数徽标）*/}
                <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-slate-100 bg-white">
                    {VIEW_PRESETS.map((preset) => {
                        let count = 0;
                        const base = enrichedStores.filter((s) => {
                            if (selectedCityTier !== 'all' && s.city_tier !== selectedCityTier) return false;
                            if (selectedStoreTier !== 'all' && s.storeTier !== selectedStoreTier) return false;
                            return true;
                        });
                        switch (preset.key) {
                            case 'all': count = base.length; break;
                            case 'top_sales': case 'top_growth': case 'top_margin': count = Math.min(base.length, 10); break;
                            case 'efficient': count = base.filter((s) => s.store_efficiency >= 3000).length; break;
                            case 'risk': count = base.filter((s) => s.riskLevel !== 'healthy').length; break;
                            case 'out_of_stock': count = base.filter((s) => s.sell_through > 0.8 || s.wos < 4).length; break;
                            case 'inefficient': count = base.filter((s) => s.store_efficiency < 1200).length; break;
                            case 'new_store': count = base.filter((s) => s.store_id.includes('NEW') || s.store_format.includes('\u65b0\u5e97')).length; break;
                            case 'outlet': count = base.filter((s) => s.storeTier === 'outlet').length; break;
                        }
                        return (
                            <button
                                key={preset.key}
                                onClick={() => handleStoreViewChange(preset.key)}
                                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                    selectedStoreView === preset.key
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
                                }`}
                            >
                                {preset.label} <span className="opacity-60">({count})</span>
                            </button>
                        );
                    })}
                </div>

                {/* 表格 */}
                <div className="overflow-auto max-h-[580px]">
                    <table className="min-w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-3 py-2 text-slate-500 font-semibold min-w-[140px]">门店</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">区域</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">城市</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">等级</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">店态</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">销售额</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">达成率</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">毛利率</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">库存额</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">WOS</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">售罄</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">尺码完整</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">坪效</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">客单价</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">风险</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">建议</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedStores.length === 0 && (
                                <tr>
                                    <td colSpan={16} className="px-3 py-6 text-center text-slate-400 text-xs">
                                        暂无满足筛选条件的门店
                                    </td>
                                </tr>
                            )}
                            {displayedStores.map((store) => {
                                const isExpanded = expandedStoreId === store.store_id;
                                return (
                                    <Fragment key={store.store_id}>
                                        {/* 主行 */}
                                        <tr
                                            key={store.store_id}
                                            onClick={() => setExpandedStoreId(isExpanded ? '' : store.store_id)}
                                            className={`border-t border-slate-100 cursor-pointer transition-colors ${
                                                isExpanded ? 'bg-blue-50' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-slate-800 flex items-center gap-1">
                                                    <span className={`text-[9px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                    {store.store_name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{store.store_id}</div>
                                            </td>
                                            <td className="px-2 py-2 text-slate-600">{getRegionLabel(store.region)}</td>
                                            <td className="px-2 py-2 text-slate-600">{store.city}</td>
                                            <td className="px-2 py-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tierBadgeClass(store.storeTier)}`}>
                                                    {store.storeTier === 'outlet' ? 'Outlet' : store.storeTier + '级'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-slate-600 max-w-[80px] truncate">{store.store_format}</td>
                                            <td className="px-2 py-2 text-right font-medium text-slate-800">
                                                {formatMoney(store.net_sales)}
                                            </td>
                                            <td className={`px-2 py-2 text-right font-medium ${store.achievementRate >= 1 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {fmtPct(store.achievementRate)}
                                            </td>
                                            <td className="px-2 py-2 text-right text-slate-700">{fmtPct(store.gm_rate)}</td>
                                            <td className="px-2 py-2 text-right text-slate-700">
                                                {formatMoney(store.inventoryAmount)}
                                            </td>
                                            <td className={`px-2 py-2 text-right font-medium ${store.wos > 16 ? 'text-rose-700' : store.wos < 6 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                {store.wos.toFixed(1)}w
                                            </td>
                                            <td className={`px-2 py-2 text-right font-medium ${store.sell_through >= 0.6 ? 'text-emerald-700' : store.sell_through < 0.3 ? 'text-rose-700' : 'text-amber-700'}`}>
                                                {fmtPct(store.sell_through)}
                                            </td>
                                            <td className={`px-2 py-2 text-right ${store.sizeCompleteness < 0.7 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                {fmtPct(store.sizeCompleteness, 0)}
                                            </td>
                                            <td className="px-2 py-2 text-right text-slate-700">
                                                ¥{Math.round(store.sqmEfficiency).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 text-right text-slate-700">
                                                ¥{Math.round(store.avgOrderValue)}
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskBadgeClass(store.riskLevel)}`}>
                                                    {riskBadgeLabel(store.riskLevel)}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-slate-600 max-w-[80px] truncate">
                                                {store.recommendedAction}
                                            </td>
                                        </tr>

                                        {/* 展开详情行 */}
                                        {isExpanded && (
                                            <tr key={`${store.store_id}-detail`} className="border-t border-blue-100 bg-blue-50/60">
                                                <td colSpan={16} className="px-4 py-3">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                                        <div className="bg-white rounded-lg border border-blue-100 p-2.5">
                                                            <div className="text-[10px] text-slate-400 mb-1">基础信息</div>
                                                            <div className="text-xs space-y-0.5 text-slate-700">
                                                                <div>区域：{getRegionLabel(store.region)}</div>
                                                                <div>城市线级：{store.city_tier}</div>
                                                                <div>店态：{store.store_format}</div>
                                                                <div>等级：{store.storeTier === 'outlet' ? 'Outlet' : store.storeTier + '级'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-blue-100 p-2.5">
                                                            <div className="text-[10px] text-slate-400 mb-1">销售指标</div>
                                                            <div className="text-xs space-y-0.5 text-slate-700">
                                                                <div>销售额：{formatMoney(store.net_sales)}</div>
                                                                <div>达成率：{fmtPct(store.achievementRate)}</div>
                                                                <div>毛利率：{fmtPct(store.gm_rate)}</div>
                                                                <div>坪效：{Math.round(store.sqmEfficiency).toLocaleString()}/㎡</div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-blue-100 p-2.5">
                                                            <div className="text-[10px] text-slate-400 mb-1">库存健康</div>
                                                            <div className="text-xs space-y-0.5 text-slate-700">
                                                                <div>售罄率：{fmtPct(store.sell_through)}</div>
                                                                <div>库存：{fmtNum(store.inventory_units)}双</div>
                                                                <div>WOS：{store.wos.toFixed(1)}周</div>
                                                                <div>尺码完整度：{fmtPct(store.sizeCompleteness, 0)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-blue-100 p-2.5">
                                                            <div className="text-[10px] text-slate-400 mb-1">客单指标</div>
                                                            <div className="text-xs space-y-0.5 text-slate-700">
                                                                <div>客单价：¥{Math.round(store.avgOrderValue)}</div>
                                                                <div>活跃SKU：{store.active_sku_count}款</div>
                                                                <div>店效：{Math.round(store.store_efficiency).toLocaleString()}</div>
                                                                <div>销量：{fmtNum(store.units)}双</div>
                                                            </div>
                                                        </div>
                                                        <div className={`bg-white rounded-lg border p-2.5 ${store.riskLevel === 'high' ? 'border-rose-200' : store.riskLevel === 'medium' ? 'border-amber-200' : 'border-emerald-200'}`}>
                                                            <div className="text-[10px] text-slate-400 mb-1">风险 & 建议</div>
                                                            <div className="text-xs space-y-1 text-slate-700">
                                                                <div>
                                                                    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${riskBadgeClass(store.riskLevel)}`}>
                                                                        {riskBadgeLabel(store.riskLevel)}
                                                                    </span>
                                                                </div>
                                                                {store.sell_through < 0.25 && (
                                                                    <div className="text-rose-700">售罄率过低（{fmtPct(store.sell_through)}），存在库存积压风险</div>
                                                                )}
                                                                {store.inventory_units > 1000 && (
                                                                    <div className="text-amber-700">库存偏高（{fmtNum(store.inventory_units)}双），建议清货或调拨</div>
                                                                )}
                                                                {store.wos > 16 && (
                                                                    <div className="text-amber-700">WOS偏高（{store.wos.toFixed(1)}周），周转压力较大</div>
                                                                )}
                                                                <div className="font-medium text-slate-800 mt-1">建议：{store.recommendedAction}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* 底部导出按钮 */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
                    <div className="text-[11px] text-slate-400">
                        点击行展开门店详情 · 点击线级/等级卡片筛选门店列表
                    </div>
                    <div className="flex gap-1.5">
                        {['CSV', 'Excel', 'PDF'].map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => {
                                    const rows = displayedStores.map((s) => [
                                        s.store_name, getRegionLabel(s.region), s.city, s.city_tier,
                                        s.storeTier, s.store_format,
                                        s.net_sales.toFixed(0),
                                        fmtPct(s.achievementRate), fmtPct(s.gm_rate),
                                        s.inventoryAmount.toFixed(0),
                                        s.wos.toFixed(1), fmtPct(s.sell_through),
                                        fmtPct(s.sizeCompleteness, 0),
                                        Math.round(s.sqmEfficiency), Math.round(s.avgOrderValue),
                                        s.riskLevel, s.recommendedAction,
                                    ]);
                                    const header = ['门店', '区域', '城市', '城市线级', '等级', '店态', '销售额', '达成率', '毛利率', '库存额', 'WOS', '售罄率', '尺码完整', '坪效', '客单价', '风险', '建议'];
                                    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
                                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `门店经营列表_${scopeDesc}_${new Date().toISOString().slice(0, 10)}.csv`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="text-[11px] px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                            >
                                ↓ {fmt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
