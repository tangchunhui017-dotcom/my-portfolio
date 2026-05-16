'use client';
/**
 * src/components/config/BrandSwitcher.tsx
 * 品牌切换器 — 显示当前品牌、行业模板信息，支持多品牌切换
 */
import { useMerchConfig } from '@/context/MerchConfigContext';

export default function BrandSwitcher({ compact = false }: { compact?: boolean }) {
    const { brand, industry, availableBrands, switchBrand, overrideMap } = useMerchConfig();
    const overrideCount =
        overrideMap.metrics.size + overrideMap.dimensions.size + overrideMap.thresholds.size;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-base leading-none">{brand.logo ?? '🏷️'}</span>
                <select
                    value={brand.brandId}
                    onChange={(e) => switchBrand(e.target.value)}
                    className="text-sm font-semibold text-slate-700 bg-transparent border-0 outline-none cursor-pointer"
                >
                    {availableBrands.map((b) => (
                        <option key={b.brandId} value={b.brandId}>
                            {b.brandName}
                        </option>
                    ))}
                </select>
                {overrideCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 font-medium">
                        覆盖 {overrideCount} 项
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm">
            <span className="text-xl leading-none">{brand.logo ?? '🏷️'}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <select
                        value={brand.brandId}
                        onChange={(e) => switchBrand(e.target.value)}
                        className="text-sm font-bold text-slate-800 bg-transparent border-0 outline-none cursor-pointer pr-1"
                    >
                        {availableBrands.map((b) => (
                            <option key={b.brandId} value={b.brandId}>
                                {b.brandName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                    <span>行业: {industry.label}</span>
                    <span>·</span>
                    <span>模板 v{industry.version}</span>
                    {overrideCount > 0 && (
                        <>
                            <span>·</span>
                            <span className="text-amber-600 font-medium">已覆盖 {overrideCount} 项</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
