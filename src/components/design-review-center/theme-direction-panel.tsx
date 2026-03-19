import type { Asset, ThemeDirectionRecord } from '@/lib/design-review-center/types';

interface ThemeDirectionPanelProps {
  themes: ThemeDirectionRecord[];
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

function resolveSwatchColor(name: string) {
  return COLOR_SWATCH_MAP[name] ?? '#cbd5e1';
}

export default function ThemeDirectionPanel({ themes, assets }: ThemeDirectionPanelProps) {
  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));

  if (!themes.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">当前筛选条件下暂无主题方向内容。</div>;
  }

  return (
    <div className="space-y-6">
      {themes.map((theme) => {
        const moodboards = theme.moodboardAssetIds.map((assetId) => assetById.get(assetId)).filter(Boolean) as Asset[];

        return (
          <article key={theme.themeId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{theme.waveName}</div>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">{theme.themeName}</h3>
                    <p className="mt-2 text-sm text-slate-500">上市窗口：{theme.launchWindow}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {theme.seriesNames.map((name) => (
                      <span key={name} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">Theme Narrative</div>
                  <p className="mt-4 text-sm leading-7 text-white/85">{theme.themeStory}</p>
                  <p className="mt-4 text-sm leading-7 text-white/65">消费情绪：{theme.consumerMood}</p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">消费场景</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {theme.consumerScenes.map((scene) => (
                        <span key={scene} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          {scene}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">情绪关键词</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {theme.keywords.map((keyword) => (
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
                      {theme.materialDirections.map((material) => (
                        <span key={material} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">色彩方向</div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {theme.colorDirections.map((colorName) => (
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
                      {theme.reviewFocus.map((entry) => (
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
                    {theme.benchmarkReferences.map((reference) => (
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
                    {moodboards.length} 张精选图
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {moodboards.length > 0 ? (
                    moodboards.map((asset) => (
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
        );
      })}
    </div>
  );
}