'use client';

// 单个骨架块
function SkeletonBlock({ className = '' }: { className?: string }) {
    return (
        <div className={`bg-slate-200 rounded animate-pulse ${className}`} />
    );
}

// KPI 卡骨架
function KpiCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border-l-4 border-slate-200 p-4 space-y-3">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-7 w-24" />
            <div className="flex gap-2">
                <SkeletonBlock className="h-3 w-12" />
                <SkeletonBlock className="h-3 w-12" />
            </div>
            <SkeletonBlock className="h-3 w-full" />
        </div>
    );
}

// 图表卡骨架
function ChartCardSkeleton({ tall = false }: { tall?: boolean }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-6 w-24 rounded-lg" />
            </div>
            <div className={`p-5 ${tall ? 'h-80' : 'h-64'}`}>
                {/* 模拟图表内容 */}
                <div className="h-full flex items-end gap-2">
                    {[60, 80, 45, 90, 55, 70].map((h, i) => (
                        <div
                            key={i}
                            className="flex-1 bg-slate-200 rounded-t animate-pulse"
                            style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                        />
                    ))}
                </div>
            </div>
            <div className="px-5 pb-5 space-y-2">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-4/5" />
                <SkeletonBlock className="h-3 w-3/5" />
            </div>
        </div>
    );
}

// SKU 表格行骨架
function TableRowSkeleton() {
    return (
        <tr className="border-b border-slate-50">
            <td className="px-4 py-3">
                <SkeletonBlock className="h-3 w-28 mb-1" />
                <SkeletonBlock className="h-3 w-16" />
            </td>
            <td className="px-4 py-3">
                <SkeletonBlock className="h-3 w-12 mb-1" />
                <SkeletonBlock className="h-3 w-16" />
            </td>
            <td className="px-4 py-3 text-right"><SkeletonBlock className="h-3 w-12 ml-auto" /></td>
            <td className="px-4 py-3 text-right"><SkeletonBlock className="h-3 w-10 ml-auto" /></td>
            <td className="px-4 py-3 text-right"><SkeletonBlock className="h-3 w-10 ml-auto" /></td>
            <td className="px-4 py-3 text-right"><SkeletonBlock className="h-3 w-10 ml-auto" /></td>
            <td className="px-4 py-3 text-right"><SkeletonBlock className="h-3 w-12 ml-auto" /></td>
            <td className="px-4 py-3"><SkeletonBlock className="h-5 w-14 rounded-full" /></td>
        </tr>
    );
}

export default function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Filter Bar Skeleton */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm px-6 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    {[80, 96, 80, 96, 80, 96, 80].map((w, i) => (
                        <SkeletonBlock key={i} className={`h-8 w-${w === 80 ? '20' : '24'} rounded-lg`} />
                    ))}
                    <SkeletonBlock className="h-8 w-16 rounded-lg ml-auto" />
                </div>
                <div className="mt-2">
                    <SkeletonBlock className="h-3 w-48" />
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-6 py-8">
                {/* Header Skeleton */}
                <div className="flex items-start justify-between mb-8">
                    <div className="space-y-2">
                        <SkeletonBlock className="h-8 w-48" />
                        <SkeletonBlock className="h-4 w-80" />
                    </div>
                    <SkeletonBlock className="h-9 w-24 rounded-lg" />
                </div>

                {/* KPI Grid Skeleton */}
                <div className="mb-10 space-y-4">
                    <SkeletonBlock className="h-4 w-32" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
                    </div>
                    <SkeletonBlock className="h-4 w-32 mt-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
                    </div>
                    <SkeletonBlock className="h-4 w-32 mt-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex-1 h-px bg-slate-200" />
                    <SkeletonBlock className="h-3 w-32" />
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Chart Grid Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <ChartCardSkeleton key={i} tall={i >= 4} />
                    ))}
                </div>

                {/* SKU Risk List Skeleton */}
                <div className="mt-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-slate-200" />
                        <SkeletonBlock className="h-3 w-40" />
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between">
                            <SkeletonBlock className="h-5 w-32" />
                            <SkeletonBlock className="h-8 w-24 rounded-lg" />
                        </div>
                        <div className="px-6 py-3 flex gap-2 border-b border-slate-100 bg-slate-50">
                            {[60, 60, 60, 60, 60].map((_, i) => (
                                <SkeletonBlock key={i} className="h-6 w-16 rounded-full" />
                            ))}
                        </div>
                        <table className="w-full">
                            <tbody>
                                {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
