import type { Asset, ThemeDirectionRecord } from '@/lib/design-review-center/types';

interface ThemeDirectionPanelProps {
  themes: ThemeDirectionRecord[];
  assets: Asset[];
}

const SERIES_NAME_MAP: Record<string, string> = {
  'Street Wave': '\u8857\u5934\u6d6a\u6f6e',
  'Urban Trail': '\u57ce\u5e02\u673a\u80fd\u5f92\u6b65',
  'City Classic': '\u90fd\u5e02\u7ecf\u5178\u5546\u52a1',
  'Comfort Flex': '\u8212\u9002\u5f39\u884c',
};

const COLOR_SWATCH_MAP: Record<string, string> = {
  黑色: '#111827',
  经典黑: '#111827',
  白色: '#f8fafc',
  米白: '#efe9dc',
  驼色: '#dcc9a3',
  灰色: '#94a3b8',
  深灰: '#4b5563',
  深棕: '#6b3f26',
  深蓝: '#1e3a8a',
  橙色: '#f97316',
  荧光绿: '#84cc16',
  低饱和米白: '#d6ccb7',
  黑白基底: '#334155',
  深棕商务色: '#7c4a2d',
  橙色功能色: '#ea580c',
  荧光绿点缀: '#84cc16',
};

function getSwatchColor(label: string) {
  return COLOR_SWATCH_MAP[label] ?? '#cbd5e1';
}

function getSeriesDisplayName(label: string) {
  return SERIES_NAME_MAP[label] ?? label;
}

function SectionEyebrow({ label }: { label: string }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>;
}

function EmptyState() {
  return <div className="text-sm text-slate-400">待补充</div>;
}

function ChipGroup({
  items,
  tone = 'slate',
}: {
  items: string[];
  tone?: 'slate' | 'pink' | 'amber' | 'emerald';
}) {
  if (!items.length) return <EmptyState />;

  const className =
    tone === 'pink'
      ? 'border-pink-100 bg-pink-50 text-pink-700'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : tone === 'emerald'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-3 py-1 text-xs font-medium ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <EmptyState />;

  return (
    <div className="space-y-2 text-sm leading-6 text-slate-600">
      {items.map((item) => (
        <div key={item} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ColorGroup({ items }: { items: string[] }) {
  if (!items.length) return <EmptyState />;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          <span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: getSwatchColor(item) }} />
          {item}
        </div>
      ))}
    </div>
  );
}

export default function ThemeDirectionPanel({ themes, assets }: ThemeDirectionPanelProps) {
  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));

  if (!themes.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无主题方向内容。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {themes.map((theme) => {
        const moodboards = theme.moodboardAssetIds
          .map((assetId) => assetById.get(assetId))
          .filter(Boolean) as Asset[];

        return (
          <article key={theme.themeId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{theme.waveName}</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">{theme.themeName}</h3>
                  <p className="mt-2 text-sm text-slate-500">上市窗口：{theme.launchWindow}</p>
                </div>
                <ChipGroup items={theme.seriesNames.map(getSeriesDisplayName)} />
              </div>
            </header>

            <div className="grid gap-0 xl:grid-cols-[1.45fr_0.55fr]">
              <div className="space-y-6 p-6">
                <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
                  <SectionEyebrow label={'\u4e3b\u9898\u53d9\u4e8b'} />
                  <div className="mt-4 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <h4 className="text-xl font-semibold">主题叙事</h4>
                      <p className="mt-3 text-sm leading-7 text-white/90">{theme.themeStory}</p>
                      <div className="mt-5">
                        <div className="text-xs font-semibold uppercase tracking-wide text-white/55">消费情绪</div>
                        <p className="mt-2 text-sm leading-6 text-white/80">{theme.consumerMood}</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/55">情绪关键词</div>
                        <ChipGroup items={theme.keywords} tone="emerald" />
                      </div>
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/55">消费场景</div>
                        <ChipGroup items={theme.consumerScenes} />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <SectionEyebrow label={'\u54c1\u724c\u57fa\u56e0'} />
                    <h4 className="mt-3 text-xl font-semibold text-slate-950">品牌长期主风格</h4>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{theme.brandLongTermStrength}</p>
                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">核心风格标签</div>
                        <ChipGroup items={theme.brandCoreStyles} tone="amber" />
                      </div>
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">历史数据 / 竞品锚点</div>
                        <BulletList items={theme.historicalAnchors} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <SectionEyebrow label={'\u8d8b\u52bf\u4e0e\u673a\u4f1a'} />
                    <h4 className="mt-3 text-xl font-semibold text-slate-950">市场趋势与新机会</h4>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{theme.opportunitySummary}</p>
                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">趋势信号</div>
                        <BulletList items={theme.trendSignals} />
                      </div>
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">机会切入点</div>
                        <ChipGroup items={theme.marketOpportunities} tone="pink" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <SectionEyebrow label={'CMF \u951a\u70b9'} />
                      <h4 className="mt-3 text-xl font-semibold text-slate-950">CMF 落地锚点</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        主题方向确定后，同步锁定本季主打色、主打材料和优先供应商，避免设计概念和开发资源脱节。
                      </p>
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">核心色彩</div>
                          <ColorGroup items={theme.cmfFocus.keyColors} />
                        </div>
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">核心材料</div>
                          <ChipGroup items={theme.cmfFocus.keyMaterials} />
                        </div>
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">供应商优先级</div>
                          <BulletList items={theme.cmfFocus.supplierPriorities} />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                      <SectionEyebrow label={'\u8bc4\u5ba1\u63d0\u793a'} />
                      <div className="space-y-5">
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">评审重点</div>
                          <ChipGroup items={theme.reviewFocus} tone="amber" />
                        </div>
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">对标参考</div>
                          <ChipGroup items={theme.benchmarkReferences} />
                        </div>
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">色彩方向</div>
                          <ColorGroup items={theme.colorDirections} />
                        </div>
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">材料方向</div>
                          <ChipGroup items={theme.materialDirections} />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="border-t border-slate-200 bg-slate-50/70 p-6 xl:border-l xl:border-t-0">
                <SectionEyebrow label={'\u60c5\u7eea\u677f'} />
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  情绪板保留在右侧，用来承接主题故事、色彩材料和竞品参考，而不是单独承担方向判断。
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
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
              </aside>
            </div>
          </article>
        );
      })}
    </div>
  );
}