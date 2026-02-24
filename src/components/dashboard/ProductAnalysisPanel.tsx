'use client';

import { useState } from 'react';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import ProductBasicPanel from '@/components/dashboard/ProductBasicPanel';
import CategoryOpsPanel from '@/components/dashboard/CategoryOpsPanel';

type ProductSubTab = 'basic' | 'ops';

export default function ProductAnalysisPanel({
    filters,
    setFilters,
    compareMode = 'none',
}: {
    filters: DashboardFilters;
    setFilters: (next: DashboardFilters) => void;
    compareMode?: CompareMode;
}) {
    const [subTab, setSubTab] = useState<ProductSubTab>('basic');

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
                    <button
                        onClick={() => setSubTab('basic')}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                            subTab === 'basic'
                                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                                : 'text-slate-600 hover:text-slate-800'
                        }`}
                    >
                        基础画像
                    </button>
                    <button
                        onClick={() => setSubTab('ops')}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                            subTab === 'ops'
                                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                                : 'text-slate-600 hover:text-slate-800'
                        }`}
                    >
                        大盘与要素链路
                    </button>
                </div>
            </div>

            {subTab === 'basic' ? (
                <ProductBasicPanel filters={filters} setFilters={setFilters} />
            ) : (
                <CategoryOpsPanel filters={filters} setFilters={setFilters} compareMode={compareMode} />
            )}
        </div>
    );
}
