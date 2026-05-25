'use client';

import type { TrendTheme, TrendVisualImage } from '@/types/trendInsightTypes';

const LAYER_STYLES: Record<TrendVisualImage['layer'], string> = {
    趋势证据: 'bg-white/90 text-slate-800',
    色彩情绪: 'bg-amber-100/95 text-amber-800',
    材料肌理: 'bg-stone-100/95 text-stone-800',
    鞋类转译: 'bg-blue-100/95 text-blue-800',
    生活方式: 'bg-emerald-100/95 text-emerald-800',
    竞品参考: 'bg-violet-100/95 text-violet-800',
};

function imageStyle(url?: string) {
    if (!url) return undefined;
    return {
        backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.46)), url("${url}")`,
    };
}

function VisualTile({
    image,
    className = '',
    compact = false,
}: {
    image?: TrendVisualImage;
    className?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-xl bg-slate-100 bg-cover bg-center ${className}`}
            style={imageStyle(image?.url)}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
            {image && (
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${LAYER_STYLES[image.layer]}`}>
                        {image.layer}
                    </span>
                    <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold leading-tight`}>
                        {image.label}
                    </div>
                    {!compact && image.note && (
                        <div className="mt-1 text-xs leading-relaxed text-white/80">{image.note}</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function TrendVisualMoodboard({
    theme,
    status,
}: {
    theme: TrendTheme;
    status?: string | null;
}) {
    const images = theme.moodImages ?? [];
    const heroImage: TrendVisualImage = images[0] ?? {
        url: theme.coverImage ?? '',
        label: theme.name,
        layer: '趋势证据',
        note: theme.subtitle,
    };
    const supportingImages = images.length > 1 ? images.slice(1, 5) : images.slice(0, 4);

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <div
                    className="relative min-h-[360px] bg-slate-200 bg-cover bg-center lg:min-h-[460px]"
                    style={imageStyle(theme.coverImage ?? heroImage.url)}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/42 to-slate-950/8" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-7">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900">
                                VISUAL MOODBOARD
                            </span>
                            <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
                                {theme.sourceType} / {theme.trendCycle}
                            </span>
                            {status && (
                                <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
                                    {status}
                                </span>
                            )}
                        </div>
                        <h3 className="max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">
                            {theme.name}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/82">
                            {theme.subtitle}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {theme.keyWords.slice(0, 6).map((keyword) => (
                                <span
                                    key={keyword}
                                    className="rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20"
                                >
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid min-h-[360px] grid-cols-2 gap-2 bg-slate-50 p-3 lg:min-h-[460px]">
                    {supportingImages.map((image, index) => (
                        <VisualTile
                            key={`${image.url}-${index}`}
                            image={image}
                            compact
                            className={index === 0 ? 'col-span-2 min-h-[170px] lg:col-span-1' : 'min-h-[140px]'}
                        />
                    ))}
                    {supportingImages.length === 0 && (
                        <VisualTile image={heroImage} compact className="col-span-2 min-h-[280px]" />
                    )}
                </div>
            </div>

            <div className="grid gap-0 border-t border-slate-100 md:grid-cols-4">
                <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">核心色彩</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {theme.visualLanguage.colors.slice(0, 4).map((color) => (
                            <span key={color} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                {color}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">材料肌理</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {theme.visualLanguage.materials.slice(0, 4).map((material) => (
                            <span key={material} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700">
                                {material}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">鞋类转译</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {theme.footwearTranslation.categories.slice(0, 4).map((category) => (
                            <span key={category} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                                {category}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">企划判断</div>
                    <div className="mt-2 flex items-end gap-2">
                        <span className="text-3xl font-semibold text-slate-900">{theme.fitScores.overall}</span>
                        <span className="pb-1 text-xs text-slate-500">综合适配分</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
