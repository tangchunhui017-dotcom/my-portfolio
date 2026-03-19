import type { Asset, SeriesWithBrief, Wave } from '@/lib/design-review-center/types';

interface ThemeDirectionPanelProps {
  waves: Wave[];
  series: SeriesWithBrief[];
  assets: Asset[];
}

const COLOR_SWATCH_MAP: Record<string, string> = {
  黑色: '#111827',
  白色: '#f8fafc',
  米色: '#dcc9a3',
  米白: '#efe9dc',
  灰色: '#94a3b8',
  深灰: '#4b5563',
  深棕: '#6b3f26',
  深蓝: '#1e3a8a',
  酒红: '#7f1d3f',
  驼色: '#c28749',
  荧光绿: '#84cc16',
  荧光黄: '#eab308',
  橙色: '#f97316',
  橄榄绿: '#708238',
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function resolveSwatchColor(name: string) {
  return COLOR_SWATCH_MAP[name] ?? '#cbd5e1';
}

export default function ThemeDirectionPanel({ waves, series, assets }: ThemeDirectionPanelProps) {
  const themeGroups = waves.flatMap((wave) => {
    const relatedSeries = series.filter((item) => item.waveId === wave.waveId);
    if (!relatedSeries.length) return [];

    const briefs = relatedSeries.map((item) => item.brief).filter(Boolean);
    const relatedSeriesIds = new Set(relatedSeries.map((item) => item.seriesId));
    const moodboards = assets
      .filter((asset) => asset.assetType === 'moodboard' && relatedSeriesIds.has(asset.seriesId))
      .slice(0, 4);

    return [
      {
        waveId: wave.waveId,
        waveName: wave.waveName,
        theme: wave.theme,
        launchWindow: wave.launchWindow,
        seriesNames: relatedSeries.map((item) => item.seriesName),
        designConcepts: unique(briefs.map((brief) => brief?.designConcept ?? '')).slice(0, 2),
        scenes: unique(briefs.map((brief) => brief?.consumerScene ?? '')).slice(0, 3),
        keywords: unique(briefs.flatMap((brief) => brief?.styleKeywords ?? [])).slice(0, 8),
        materials: unique(
          briefs.flatMap((brief) => [
            ...(brief?.materialPackage.primary ?? []),
            ...(brief?.materialPackage.accent ?? []),
          ]),
        ).slice(0, 8),
        colors: unique(
          briefs.flatMap((brief) => [
            ...(brief?.colorPackage.base ?? []),
            ...(brief?.colorPackage.accent ?? []),
          ]),
        ).slice(0, 8),
        benchmarkReferences: unique(briefs.flatMap((brief) => brief?.benchmarkReferences ?? [])).slice(0, 6),
        reviewFocus: unique(briefs.flatMap((brief) => brief?.reviewFocus ?? [])).slice(0, 6),
        moodboards,
      },
    ];
  });

  if (!themeGroups.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">当前筛选条件下暂无主题方向内容。</div>;
  }

  return (
    <div className="space-y-6">
      {themeGroups.map((group) => (
        <article key={group.waveId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{group.waveName}</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">{group.theme}</h3>
                  <p className="mt-2 text-sm text-slate-500">上市窗口：{group.launchWindow}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.seriesNames.map((name) => (
                    <span key={name} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">Theme Narrative</div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  {group.designConcepts.map((concept) => (
                    <p key={concept}>{concept}</p>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">消费场景</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.scenes.map((scene) => (
                      <span key={scene} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {scene}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">情绪关键词</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">材料方向</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.materials.map((material) => (
                      <span key={material} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {material}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">色彩方向</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {group.colors.map((colorName) => (
                      <div key={colorName} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        <span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: resolveSwatchColor(colorName) }} />
                        {colorName}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:col-span-2 xl:col-span-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">本轮评审重点</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.reviewFocus.map((entry) => (
                      <span key={entry} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700">
                        {entry}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">对标参考</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.benchmarkReferences.map((reference) => (
                    <span key={reference} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      {reference}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/70 p-6 xl:border-l xl:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">情绪板</div>
                  <div className="mt-1 text-sm text-slate-500">用于周会讲主题与设计意图</div>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {group.moodboards.length} 张精选图
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {group.moodboards.length > 0 ? (
                  group.moodboards.map((asset) => (
                    <figure key={asset.assetId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <img src={asset.thumbnailUrl} alt={asset.title} className="h-36 w-full object-cover" />
                      <figcaption className="px-3 py-2 text-xs text-slate-600">{asset.title}</figcaption>
                    </figure>
                  ))
                ) : (
                  <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                    当前筛选下暂无情绪板资产。
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
