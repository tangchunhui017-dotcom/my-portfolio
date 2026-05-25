'use client';

import type { ColorSwatch, ColorRole } from '@/types/trendInsightTypes';

const ROLE_ORDER: ColorRole[] = ['主推色', '基础色', '撞色', '点缀色'];

const ROLE_LABEL_STYLES: Record<ColorRole, string> = {
    主推色: 'text-rose-600 font-semibold',
    基础色: 'text-slate-600 font-semibold',
    撞色: 'text-amber-600 font-semibold',
    点缀色: 'text-violet-600 font-semibold',
};

const ROLE_APPLICATION: Record<ColorRole, string> = {
    主推色: '鞋面主色 / 大面积帮面',
    基础色: '外底 / 鞋带 / 内里',
    撞色: 'Logo / 拉环 / 侧条',
    点缀色: '缝线 / 五金 / 鞋舌标',
};

function moodBarGradient(swatches: ColorSwatch[]): string {
    const hexes = swatches.map((s) => s.hex);
    if (hexes.length === 0) return 'linear-gradient(135deg, #f1f5f9, #e2e8f0)';
    if (hexes.length === 1) return `linear-gradient(135deg, ${hexes[0]}, ${hexes[0]}99)`;
    return `linear-gradient(135deg, ${hexes.join(', ')})`;
}

export default function SeasonalColorPalettePanel({ swatches }: { swatches: ColorSwatch[] }) {
    const grouped = ROLE_ORDER.reduce<Record<ColorRole, ColorSwatch[]>>(
        (acc, role) => {
            acc[role] = swatches.filter((s) => s.role === role);
            return acc;
        },
        { 主推色: [], 基础色: [], 撞色: [], 点缀色: [] }
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {ROLE_ORDER.map((role) => {
                const group = grouped[role];
                return (
                    <div key={role} className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                        {/* 色彩情绪条 16:5 比例 */}
                        <div
                            className="w-full"
                            style={{
                                paddingBottom: '31.25%',
                                background: moodBarGradient(group),
                                position: 'relative',
                            }}
                            aria-hidden="true"
                        />
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-xs ${ROLE_LABEL_STYLES[role]}`}>{role}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mb-2">{ROLE_APPLICATION[role]}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {group.map((swatch) => (
                                    <div key={swatch.id} className="rounded-md border border-slate-100 bg-slate-50 p-1.5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <div
                                                className="h-7 w-7 shrink-0 rounded border border-slate-200"
                                                style={{ backgroundColor: swatch.hex }}
                                                title={swatch.hex}
                                            />
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-medium leading-tight text-slate-700 truncate">
                                                    {swatch.name}
                                                </div>
                                                <div className="text-[9px] uppercase text-slate-400">{swatch.hex}</div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] leading-4 text-slate-500 line-clamp-2">
                                            {swatch.usageSuggestion}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
