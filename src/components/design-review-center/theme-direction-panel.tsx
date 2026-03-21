'use client';

import { useState } from 'react';
import type { Asset, ThemeDirectionBoard, ThemeDirectionRecord } from '@/lib/design-review-center/types';

interface ThemeDirectionPanelProps {
  themes: ThemeDirectionRecord[];
  assets: Asset[];
}

const SERIES_NAME_MAP: Record<string, string> = {
  'Street Wave': '街头浪潮',
  'Urban Trail': '城市机能徒步',
  'City Classic': '都市经典商务',
  'Comfort Flex': '舒适弹行',
};

const THEME_ACCENT_MAP: Record<string, { color: string; soft: string; label: string }> = {
  th001: { color: '#84CC16', soft: '#F4FCE5', label: '街头机能主线' },
  th002: { color: '#7C4A2D', soft: '#F6EDE5', label: '商务舒适主线' },
};

const COLOR_SWATCH_MAP: Record<string, string> = {
  '黑色': '#111827',
  '经典黑': '#111827',
  '白色': '#F8FAFC',
  '米白': '#F8F3EA',
  '低饱和米白': '#D6CCB7',
  '灰色': '#94A3B8',
  '深灰': '#475569',
  '深棕': '#7C4A2D',
  '深棕商务色': '#7C4A2D',
  '深蓝': '#1D4ED8',
  '橙色': '#F97316',
  '荧光绿': '#84CC16',
  '驼色': '#C49A6C',
};

function getSwatchColor(label: string) {
  return COLOR_SWATCH_MAP[label] ?? '#CBD5E1';
}

function getColorCode(label: string) {
  return getSwatchColor(label).toUpperCase();
}

function isLightColor(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return false;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72;
}

function getSeriesDisplayName(label: string) {
  return SERIES_NAME_MAP[label] ?? label;
}

function getAssetUrl(asset?: Asset | null) {
  return asset?.fileUrl || asset?.thumbnailUrl || '';
}

function getThemeAccent(themeId: string) {
  return THEME_ACCENT_MAP[themeId] ?? { color: '#94A3B8', soft: '#F8FAFC', label: '主题主线' };
}

function SectionEyebrow({ label }: { label: string }) {
  return <div className="text-xs font-semibold tracking-[0.24em] text-slate-400">{label}</div>;
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

  const className = [
    'rounded-full border px-3 py-1 text-xs font-medium',
    tone === 'pink'
      ? 'border-pink-100 bg-pink-50 text-pink-700'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : tone === 'emerald'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-700',
  ].join(' ');

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={className}>
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

function ColorCodeBoard({ colors }: { colors: string[] }) {
  if (!colors.length) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-400">
        当前没有色卡信息
      </div>
    );
  }

  return (
    <div className="h-full bg-white p-5">
      <div className="text-xs font-semibold tracking-[0.22em] text-slate-400">主打色卡</div>
      <div className="mt-4 space-y-3">
        {colors.map((color) => {
          const swatch = getSwatchColor(color);
          const light = isLightColor(swatch);
          const textClass = light ? 'text-slate-900' : 'text-white';
          const codeClass = light ? 'text-slate-800/80' : 'text-white/75';

          return (
            <div
              key={color}
              className="relative overflow-hidden rounded-[26px] border border-slate-200 shadow-sm"
              style={{ backgroundColor: swatch }}
            >
              <div className="relative flex min-h-[88px] items-end p-5">
                <div>
                  <div className={`text-lg font-semibold ${textClass}`}>{color}</div>
                  <div className={`mt-1 font-mono text-xs uppercase tracking-[0.22em] ${codeClass}`}>{getColorCode(color)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThemeChapterHeader({
  theme,
  index,
}: {
  theme: ThemeDirectionRecord;
  index: number;
}) {
  const chapterNo = String(index + 1).padStart(2, '0');
  const accent = getThemeAccent(theme.themeId);

  return (
    <div className="space-y-5">
      {index > 0 ? <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" /> : null}
      <div
        className="overflow-hidden rounded-[28px] border border-slate-200 shadow-sm"
        style={{ background: `linear-gradient(90deg, ${accent.soft} 0%, #ffffff 42%)` }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="mt-1 h-14 w-1 rounded-full" style={{ backgroundColor: accent.color }} />
            <div>
              <div className="text-xs font-semibold tracking-[0.28em] text-slate-400">{`主题 ${chapterNo}`}</div>
              <h3 className="mt-3 text-3xl font-semibold text-slate-950">{theme.themeName}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {theme.waveName} · {theme.launchWindow}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: accent.color, color: '#ffffff' }}>
              {accent.label}
            </span>
            {theme.seriesNames.map((name) => (
              <span key={name} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {getSeriesDisplayName(name)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoodboardHero({ theme, moodboards }: { theme: ThemeDirectionRecord; moodboards: Asset[] }) {
  const heroAsset = moodboards[0];

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="relative min-h-[420px] bg-slate-100">
          {heroAsset ? (
            <img src={getAssetUrl(heroAsset)} alt={`${theme.themeName} 总情绪板`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-sm text-slate-500">
              当前没有总情绪板
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-6 text-white">
            <div className="text-xs font-semibold tracking-[0.24em] text-white/60">{theme.waveName}</div>
            <h3 className="mt-2 text-3xl font-semibold">{theme.themeName}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/90">{theme.themeStory}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {theme.seriesNames.map((name) => (
                <span key={name} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  {getSeriesDisplayName(name)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-h-[420px] grid-rows-[1fr_auto] gap-0 border-t border-slate-200 xl:border-l xl:border-t-0">
          <ColorCodeBoard colors={theme.cmfFocus.keyColors} />

          <div className="space-y-4 bg-slate-50 p-5">
            <div>
              <div className="text-xs font-semibold tracking-[0.22em] text-slate-400">主题情绪</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{theme.consumerMood}</p>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold tracking-[0.22em] text-slate-400">关键词</div>
              <ChipGroup items={theme.keywords} tone="emerald" />
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold tracking-[0.22em] text-slate-400">核心场景</div>
              <ChipGroup items={theme.consumerScenes} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function resolveBoardAssets(board: ThemeDirectionBoard, themeAssets: Asset[], assetById: Map<string, Asset>) {
  const explicitAssets = board.assetIds.map((assetId) => assetById.get(assetId)).filter(Boolean) as Asset[];
  if (explicitAssets.length) return explicitAssets;

  const preferredTypes: Record<ThemeDirectionBoard['boardId'], Asset['assetType'][]> = {
    silhouette: ['outsole', 'effect', 'reference'],
    cmf: ['material', 'color', 'moodboard'],
    craft: ['effect', 'reference', 'material'],
  };

  const fallback = themeAssets.filter((asset) => preferredTypes[board.boardId].includes(asset.assetType));
  return fallback.slice(0, 1);
}

function DirectionBoardShowcase({
  board,
  boardAssets,
}: {
  board: ThemeDirectionBoard;
  boardAssets: Asset[];
}) {
  const featuredAsset = boardAssets[0];

  return (
    <div className="overflow-hidden rounded-l-[28px] rounded-r-none border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-l-[28px] rounded-r-none bg-slate-100">
          {featuredAsset ? (
            <img src={getAssetUrl(featuredAsset)} alt={board.title} className="h-[580px] w-full object-cover" />
          ) : (
            <div className="flex h-[580px] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-500">
              当前没有方向板图片
            </div>
          )}
        </div>

        <div className="flex h-full flex-col bg-slate-50 p-6">
          <SectionEyebrow label="专题方向板" />
          <h5 className="mt-3 text-2xl font-semibold text-slate-950">{board.title}</h5>
          <p className="mt-2 text-sm font-medium text-slate-500">{board.subtitle}</p>
          <p className="mt-4 text-sm leading-7 text-slate-700">{board.summary}</p>

          <div className="mt-6">
            <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">先盯这些方向点</div>
            <ChipGroup items={board.focusPoints} tone="amber" />
          </div>

          {featuredAsset?.description ? (
            <div className="mt-6 rounded-l-[20px] rounded-r-none border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              {featuredAsset.description}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ThemeArticle({
  theme,
  assets,
}: {
  theme: ThemeDirectionRecord;
  assets: Asset[];
}) {
  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));
  const themeAssets = assets.filter((asset) => theme.seriesIds.includes(asset.seriesId));
  const moodboards = theme.moodboardAssetIds.map((assetId) => assetById.get(assetId)).filter(Boolean) as Asset[];
  const [activeBoardId, setActiveBoardId] = useState<ThemeDirectionBoard['boardId']>(theme.directionBoards[0]?.boardId ?? 'silhouette');
  const activeBoard = theme.directionBoards.find((board) => board.boardId === activeBoardId) ?? theme.directionBoards[0];
  const boardAssets = activeBoard ? resolveBoardAssets(activeBoard, themeAssets, assetById) : [];

  return (
    <article className="space-y-6">
      <MoodboardHero theme={theme} moodboards={moodboards} />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionEyebrow label="品牌长期擅长" />
          <h4 className="mt-3 text-2xl font-semibold text-slate-950">先看品牌原本就能赢什么</h4>
          <p className="mt-3 text-sm leading-7 text-slate-700">{theme.brandLongTermStrength}</p>
          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">核心风格标签</div>
              <ChipGroup items={theme.brandCoreStyles} tone="amber" />
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">历史热销 / 竞品锚点</div>
              <BulletList items={theme.historicalAnchors} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionEyebrow label="市场趋势与新机会" />
          <h4 className="mt-3 text-2xl font-semibold text-slate-950">再看今年为什么值得做</h4>
          <p className="mt-3 text-sm leading-7 text-slate-700">{theme.opportunitySummary}</p>
          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">趋势信号</div>
              <BulletList items={theme.trendSignals} />
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">可切入机会</div>
              <ChipGroup items={theme.marketOpportunities} tone="pink" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionEyebrow label="专题方向板" />
            <h4 className="mt-3 text-2xl font-semibold text-slate-950">用 3 块板把主题拆清楚</h4>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              不在一页里塞满很多小图，而是把型体、材料 CMF 和工艺细节分别做成大板面，评审时一次只看一个重点。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {theme.directionBoards.map((board) => {
              const isActive = board.boardId === activeBoardId;
              return (
                <button
                  key={board.boardId}
                  type="button"
                  onClick={() => setActiveBoardId(board.boardId)}
                  className={[
                    'rounded-full border px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                  ].join(' ')}
                >
                  {board.title}
                </button>
              );
            })}
          </div>
        </div>

        {activeBoard ? (
          <div className="mt-6">
            <DirectionBoardShowcase board={activeBoard} boardAssets={boardAssets} />
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionEyebrow label="资源与对标锚点" />
        <h4 className="mt-3 text-2xl font-semibold text-slate-950">把主题落到资源和参照上</h4>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_0.8fr]">
          <div>
            <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">核心色彩</div>
            <ColorGroup items={theme.cmfFocus.keyColors} />
            <div className="mb-3 mt-5 text-xs font-semibold tracking-[0.2em] text-slate-400">核心材料</div>
            <ChipGroup items={theme.cmfFocus.keyMaterials} />
          </div>
          <div>
            <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">供应商优先级</div>
            <BulletList items={theme.cmfFocus.supplierPriorities} />
          </div>
          <div>
            <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400">对标参考</div>
            <ChipGroup items={theme.benchmarkReferences} />
            <div className="mb-3 mt-5 text-xs font-semibold tracking-[0.2em] text-slate-400">覆盖系列</div>
            <ChipGroup items={theme.seriesNames.map((name) => getSeriesDisplayName(name))} tone="emerald" />
          </div>
        </div>
      </section>
    </article>
  );
}

export default function ThemeDirectionPanel({ themes, assets }: ThemeDirectionPanelProps) {
  if (!themes.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无主题方向内容。
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {themes.map((theme, index) => (
        <div key={theme.themeId} className="space-y-6">
          <ThemeChapterHeader theme={theme} index={index} />
          <ThemeArticle theme={theme} assets={assets} />
        </div>
      ))}
    </div>
  );
}
