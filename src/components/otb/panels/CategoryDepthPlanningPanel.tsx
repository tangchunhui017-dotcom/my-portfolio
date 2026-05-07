'use client';
/**
 * src/components/otb/panels/CategoryDepthPlanningPanel.tsx
 * 品类/款数/深度测算 — 替代 Excel 中款数/均深/投产金额测算
 */
import { useState, useMemo, useCallback } from 'react';
import { calcCategoryDepth, calcWaveOTB, formatCurrency, formatPct, formatQty, type CurrencyUnit, type CategoryDepthInput, type WaveOTBInput } from '@/utils/otbCalculations';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import defaultItems from '../../../../data/otb/category_depth_plan.json';
import storeCapacityRaw from '../../../../data/otb/store_capacity.json';
import brandsRaw from '../../../../data/otb/brands.json';

interface Props {
    currencyUnit: CurrencyUnit;
    ssSeasonSalesTarget: number;
    awSeasonSalesTarget: number;
    waves: WaveOTBInput[];
    filters?: DashboardFilters;
}

type WaveFilter = 'all' | string;

interface StoreCapacityRecord {
    channelId: string;
    channelName: string;
    storeCount: number;
    avgSkuCapacityPerStore: number;
    avgDisplayPairsPerSku: number;
    safetyStockPairsPerSku: number;
    totalSkuCapacity: number;
    totalInitialAllocationCapacity: number;
}

interface BrandRecord {
    brandId: string;
    brandName: string;
    priceBands: Array<{ band: string; label: string; min: number; max: number }>;
}

function resolveChannelCapacityKey(channelType?: DashboardFilters['channel_type']) {
    if (channelType === '电商') return 'ecommerce';
    if (channelType === '加盟') return 'franchise';
    if (channelType === 'KA') return 'special';
    return 'direct-store';
}

function resolveBrand(filters?: DashboardFilters) {
    const brands = brandsRaw as BrandRecord[];
    if (!filters || filters.brand === 'all') return brands[0];
    return brands.find(brand => brand.brandName === filters.brand || brand.brandId === filters.brand) ?? brands[0];
}

export default function CategoryDepthPlanningPanel({ currencyUnit, ssSeasonSalesTarget, awSeasonSalesTarget, waves, filters }: Props) {
    const [items, setItems] = useState<CategoryDepthInput[]>(defaultItems as CategoryDepthInput[]);
    const [waveFilter, setWaveFilter] = useState<WaveFilter>('all');

    const updateItem = useCallback((idx: number, field: keyof CategoryDepthInput, value: number | string) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    }, []);

    // Wave sales targets follow the editable wave plan in the previous tab.
    const waveSalesTargets = useMemo<Record<string, number>>(() => (
        calcWaveOTB(waves, ssSeasonSalesTarget, awSeasonSalesTarget).reduce<Record<string, number>>((acc, wave) => {
            acc[`${wave.season}-${wave.wave}`] = wave.plannedSalesAmount;
            return acc;
        }, {})
    ), [waves, ssSeasonSalesTarget, awSeasonSalesTarget]);

    const allRows = useMemo(() => calcCategoryDepth(items, waveSalesTargets), [items, waveSalesTargets]);

    const globallyScopedRows = useMemo(() => {
        if (!filters) return allRows;

        return allRows.filter(row => {
            const categoryText = `${row.category} ${row.categoryLabel}`.toLowerCase();
            // OTB mock category rows do not carry gender/level-1 fields yet, so only enforce
            // level-2/level-3 filters that can be matched safely against the category label.
            const categoryFilters = [filters.category_id, filters.sub_category]
                .filter(value => value !== 'all')
                .map(value => String(value).toLowerCase());

            return categoryFilters.every(value => categoryText.includes(value));
        });
    }, [allRows, filters]);

    const filtered = waveFilter === 'all'
        ? globallyScopedRows
        : globallyScopedRows.filter(r => `${r.season}-${r.wave}` === waveFilter);

    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);

    const waveOptions = Array.from(new Set(items.map(i => `${i.season}-${i.wave}`))).sort();
    const currentBrand = resolveBrand(filters);
    const priceBands = currentBrand.priceBands;
    const channelCapacity = (storeCapacityRaw as StoreCapacityRecord[]).find(item => item.channelId === resolveChannelCapacityKey(filters?.channel_type));
    const totalSku = filtered.reduce((sum, row) => sum + row.plannedSkuCount, 0);
    const totalProductionPairs = filtered.reduce((sum, row) => sum + (row.plannedProductionPairs ?? 0), 0);
    const skuOverCapacity = Boolean(channelCapacity && totalSku > channelCapacity.totalSkuCapacity);
    const firstAllocationShort = Boolean(channelCapacity && channelCapacity.totalInitialAllocationCapacity > 0 && totalProductionPairs < channelCapacity.totalInitialAllocationCapacity);
    const firstAllocationPressure = Boolean(channelCapacity && channelCapacity.totalInitialAllocationCapacity > 0 && totalProductionPairs > channelCapacity.totalInitialAllocationCapacity * 2.5);

    return (
        <div className="space-y-5">
            {/* 波段筛选 */}
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setWaveFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${waveFilter === 'all' ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                    全部波段
                </button>
                {waveOptions.map(w => (
                    <button key={w} onClick={() => setWaveFilter(w as WaveFilter)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${waveFilter === w ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {w}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">品类/款数/深度测算</h3>
                    <p className="text-xs text-slate-400 mt-0.5">蓝底单元格可编辑，其余自动计算</p>
                </div>
                {channelCapacity && (
                    <div className={`mx-5 mt-4 rounded-xl border px-4 py-3 text-xs ${
                        skuOverCapacity || firstAllocationShort || firstAllocationPressure
                            ? 'border-amber-100 bg-amber-50 text-amber-700'
                            : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    }`}>
                        渠道容量校验：{channelCapacity.channelName} · SKU容量 {formatQty(channelCapacity.totalSkuCapacity)} · 首铺容量 {formatQty(channelCapacity.totalInitialAllocationCapacity)}
                        <span className="ml-2">
                            当前 SKU {formatQty(totalSku)}，投产 {formatQty(totalProductionPairs)} 双。
                            {skuOverCapacity ? '款数/SKU 超过渠道容量。' : firstAllocationShort ? '投产量低于首铺需求。' : firstAllocationPressure ? '投产量远高于首铺容量，库存压力偏高。' : '容量结构正常。'}
                        </span>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="min-w-max text-xs w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                {['波段', '品类', '价格带', '价格带占比', '价格带OTB', '品类占比', '品类目标额', '零售均价', '成本均价', '毛利率', '售罄目标',
                                    '计划销售双数', '计划投产量', '计划款数', '计划色数', 'SKU数', '均深(双/款)', '投产金额', '诊断'].map((h, i) => (
                                    <th key={i} className={`py-2 px-3 text-slate-400 font-medium whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row) => {
                                const globalIdx = allRows.indexOf(row);
                                const depthOk = row.averageDepth !== null && row.averageDepth >= 300 && row.averageDepth <= 1200;
                                const depthClass = row.averageDepth === null ? '' : depthOk ? 'text-emerald-600' : 'text-amber-600';
                                const gmClass = row.grossMargin !== null ? ((row.grossMargin >= 0.50 ? 'text-emerald-600' : row.grossMargin >= 0.40 ? 'text-amber-600' : 'text-rose-600')) : '';
                                return (
                                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                                        <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{row.season} {row.wave}</td>
                                        <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">{row.categoryLabel}</td>
                                        <td className="py-2 px-2 text-right">
                                            <select
                                                value={row.priceBandId ?? priceBands[1]?.band ?? 'Volume'}
                                                onChange={e => {
                                                    const selected = priceBands.find(band => band.band === e.target.value);
                                                    updateItem(globalIdx, 'priceBandId', e.target.value);
                                                    updateItem(globalIdx, 'priceBandLabel', selected?.label ?? e.target.value);
                                                    updateItem(globalIdx, 'priceBandRole', selected?.label ?? e.target.value);
                                                }}
                                                className="w-24 text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none"
                                            >
                                                {priceBands.map(band => (
                                                    <option key={band.band} value={band.band}>{band.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat(((row.priceBandSalesRatio ?? 1) * 100).toFixed(1))} step={1}
                                                onChange={e => updateItem(globalIdx, 'priceBandSalesRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-sky-700">{fc(row.priceBandOTB)}</td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.categorySalesRatio * 100).toFixed(1))} step={1}
                                                onChange={e => updateItem(globalIdx, 'categorySalesRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium">{fc(row.categorySalesTarget)}</td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.retailPrice} step={10}
                                                onChange={e => updateItem(globalIdx, 'retailPrice', parseFloat(e.target.value) || 0)}
                                                className="w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.costPrice} step={5}
                                                onChange={e => updateItem(globalIdx, 'costPrice', parseFloat(e.target.value) || 0)}
                                                className="w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className={`py-2 px-3 text-right font-medium ${gmClass}`}>{formatPct(row.grossMargin)}</td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.sellThroughTarget * 100).toFixed(1))} step={1}
                                                onChange={e => updateItem(globalIdx, 'sellThroughTarget', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-3 text-right">{row.plannedSalesPairs !== null ? formatQty(row.plannedSalesPairs) : '--'}</td>
                                        <td className="py-2 px-3 text-right font-medium">{row.plannedProductionPairs !== null ? formatQty(row.plannedProductionPairs) : '--'}</td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.plannedStyleCount} step={1} min={1}
                                                onChange={e => updateItem(globalIdx, 'plannedStyleCount', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))}
                                                className="w-12 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.plannedColorCount} step={1} min={1}
                                                onChange={e => updateItem(globalIdx, 'plannedColorCount', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))}
                                                className="w-12 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-3 text-right">{formatQty(row.plannedSkuCount)}</td>
                                        <td className={`py-2 px-3 text-right font-medium ${depthClass}`}>
                                            {row.averageDepth !== null ? formatQty(row.averageDepth) : '--'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-sky-700">{fc(row.productionAmount)}</td>
                                        <td className={`py-2 px-3 text-xs whitespace-nowrap ${row.diagnosisLevel === 'danger' ? 'text-rose-600' : row.diagnosisLevel === 'warn' ? 'text-amber-600' : 'text-emerald-600'}`}>{row.diagnosis}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-sky-50 font-semibold text-xs">
                                <td className="py-2.5 px-3 text-slate-700" colSpan={4}>合计</td>
                                <td className="py-2.5 px-3 text-right text-sky-700">{fc(filtered.reduce((s, r) => s + (r.priceBandOTB ?? 0), 0))}</td>
                                <td />
                                <td className="py-2.5 px-3 text-right">{fc(filtered.reduce((s, r) => s + r.categorySalesTarget, 0))}</td>
                                <td colSpan={5} />
                                <td className="py-2.5 px-3 text-right">{formatQty(filtered.reduce((s, r) => s + (r.plannedProductionPairs ?? 0), 0))}</td>
                                <td className="py-2.5 px-3 text-right">{formatQty(filtered.reduce((s, r) => s + r.plannedStyleCount, 0))}</td>
                                <td />
                                <td className="py-2.5 px-3 text-right">{formatQty(filtered.reduce((s, r) => s + r.plannedSkuCount, 0))}</td>
                                <td />
                                <td className="py-2.5 px-3 text-right text-sky-700">{fc(filtered.reduce((s, r) => s + (r.productionAmount ?? 0), 0))}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
