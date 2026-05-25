'use client';

import type { FootwearTranslation } from '@/types/trendInsightTypes';

const DIMS: { key: keyof FootwearTranslation; label: string }[] = [
    { key: 'categories', label: '适配品类' },
    { key: 'lastShapes', label: '楦型方向' },
    { key: 'toeShapes', label: '鞋头方向' },
    { key: 'outsoleDirections', label: '鞋底方向' },
    { key: 'outsolePatterns', label: '大底纹路' },
    { key: 'midsoleMaterials', label: '中底材料' },
    { key: 'upperMaterials', label: '鞋面材料' },
    { key: 'upperStructures', label: '鞋面结构' },
    { key: 'laceAndClosure', label: '鞋带/闭合' },
    { key: 'detailApplications', label: '细节应用' },
    { key: 'productRoles', label: '商品角色' },
];

const ROLE_COLORS: Record<string, string> = {
    主推款: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    利润款: 'bg-blue-50 text-blue-700 border-blue-200',
    形象款: 'bg-violet-50 text-violet-700 border-violet-200',
    系列形象款: 'bg-violet-50 text-violet-700 border-violet-200',
    限量联名款: 'bg-rose-50 text-rose-700 border-rose-200',
    测试款: 'bg-amber-50 text-amber-700 border-amber-200',
    话题款: 'bg-amber-50 text-amber-700 border-amber-200',
    快反测试款: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function FootwearTranslationMatrix({ ft }: { ft: FootwearTranslation }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {DIMS.map(({ key, label }) => {
                const values = ft[key] as string[];
                if (!values || values.length === 0) return null;
                const isRoles = key === 'productRoles';
                return (
                    <div
                        key={key}
                        className={`rounded-lg border bg-white p-2.5 ${
                            isRoles ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100'
                        }`}
                    >
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                            {label}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {values.map((v) => {
                                const roleStyle = isRoles ? (ROLE_COLORS[v] ?? 'bg-slate-100 text-slate-600 border-slate-200') : null;
                                return (
                                    <span
                                        key={v}
                                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                                            roleStyle
                                                ? `border font-medium ${roleStyle}`
                                                : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {v}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
