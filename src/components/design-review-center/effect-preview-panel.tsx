'use client';

import { useEffect, useMemo, useState } from 'react';
import AssetWall from '@/components/design-review-center/asset-wall';
import type { Asset, DesignItem, SeriesWithBrief, Wave } from '@/lib/design-review-center/types';

type VersionStage = NonNullable<Asset['versionStage']>;

interface EffectPreviewPanelProps {
  assets: Asset[];
  waves: Wave[];
  series: SeriesWithBrief[];
  items: DesignItem[];
}

interface EffectVersionChain {
  chainId: string;
  itemId: string;
  itemName: string;
  skuCode: string;
  seriesId: string;
  seriesName: string;
  waveLabel: string;
  stages: Partial<Record<VersionStage, Asset>>;
  stageCount: number;
  highlighted: boolean;
  latestCapturedAt: string | null;
}

const VERSION_STAGE_ORDER: VersionStage[] = ['sketch', 'render', 'first_sample', 'final_sample'];

const VERSION_STAGE_META: Record<VersionStage, { label: string; hint: string }> = {
  sketch: { label: '\u6982\u5ff5\u8349\u56fe', hint: '\u5148\u770b\u4e3b\u9898\u65b9\u5411\u3001\u8f6e\u5ed3\u6bd4\u4f8b\u548c\u7ed3\u6784\u8bed\u8a00\u3002' },
  render: { label: '\u6e32\u67d3\u56fe', hint: '\u786e\u8ba4\u914d\u8272\u3001CMF \u548c\u54c1\u724c\u8868\u8fbe\u3002' },
  first_sample: { label: '\u9996\u8f6e\u6837\u978b', hint: '\u91cd\u70b9\u770b\u56fe\u7269\u5dee\u5f02\u3001\u7ed3\u6784\u504f\u5dee\u548c\u521d\u7248\u6210\u672c\u3002' },
  final_sample: { label: '\u5b9a\u6837\u5b9e\u62cd', hint: '\u786e\u8ba4\u6700\u7ec8\u6837\u978b\u3001\u6210\u672c\u548c\u4e0a\u5e02\u7248\u672c\u3002' },
};

function formatDate(value: string | null | undefined) {
  if (!value) return '\u5f85\u8865\u5145';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN');
}

function buildEffectVersionChains(assets: Asset[], items: DesignItem[], series: SeriesWithBrief[], waves: Wave[]): EffectVersionChain[] {
  const effectAssets = assets.filter((asset) => asset.assetType === 'effect' && asset.relatedItemId && asset.versionStage);
  const groups = new Map<string, Asset[]>();

  effectAssets.forEach((asset) => {
    const chainId = asset.comparisonGroupId ?? asset.relatedItemId ?? asset.assetId;
    const current = groups.get(chainId) ?? [];
    current.push(asset);
    groups.set(chainId, current);
  });

  return [...groups.entries()]
    .map(([chainId, chainAssets]) => {
      const firstAsset = chainAssets[0];
      const item = items.find((record) => record.itemId === firstAsset.relatedItemId) ?? null;
      const relatedSeries = series.find((record) => record.seriesId === firstAsset.seriesId) ?? null;
      const relatedWave = waves.find((record) => record.waveId === relatedSeries?.waveId) ?? null;
      const stages = chainAssets.reduce<Partial<Record<VersionStage, Asset>>>((accumulator, asset) => {
        if (!asset.versionStage) return accumulator;
        accumulator[asset.versionStage] = asset;
        return accumulator;
      }, {});
      const latestCapturedAt = chainAssets
        .map((asset) => asset.capturedAt ?? asset.uploadedAt)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

      return {
        chainId,
        itemId: firstAsset.relatedItemId ?? item?.itemId ?? chainId,
        itemName: item?.itemName ?? firstAsset.title,
        skuCode: item?.skuCode ?? '--',
        seriesId: firstAsset.seriesId,
        seriesName: relatedSeries?.seriesName ?? firstAsset.seriesId,
        waveLabel: relatedWave?.waveName ?? relatedSeries?.waveId ?? '-',
        stages,
        stageCount: Object.keys(stages).length,
        highlighted: chainAssets.some((asset) => asset.selectedForReview || asset.featuredInReport),
        latestCapturedAt,
      };
    })
    .sort((left, right) => {
      if (left.highlighted !== right.highlighted) return left.highlighted ? -1 : 1;
      return new Date(right.latestCapturedAt ?? 0).getTime() - new Date(left.latestCapturedAt ?? 0).getTime();
    });
}

export default function EffectPreviewPanel({ assets, waves, series, items }: EffectPreviewPanelProps) {
  const effectChains = useMemo(() => buildEffectVersionChains(assets, items, series, waves), [assets, items, series, waves]);
  const supportingAssets = useMemo(() => assets.filter((asset) => asset.assetType !== 'effect'), [assets]);
  const [selectedChainId, setSelectedChainId] = useState<string>(effectChains[0]?.chainId ?? '');

  useEffect(() => {
    if (!effectChains.length) {
      setSelectedChainId('');
      return;
    }

    if (!effectChains.some((chain) => chain.chainId === selectedChainId)) {
      setSelectedChainId(effectChains[0].chainId);
    }
  }, [effectChains, selectedChainId]);

  const selectedChain = effectChains.find((chain) => chain.chainId === selectedChainId) ?? null;
  const highlightedCount = effectChains.filter((chain) => chain.highlighted).length;
  const finalSampleCount = effectChains.filter((chain) => chain.stages.final_sample).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{'\u56fe\u7269\u5bf9\u6bd4\u7248\u672c\u94fe'}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Compare sketch, render, first sample, and final sample in one chain so the review can focus on visual drift, CMF changes, and cost movement.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{'\u7248\u672c\u94fe'}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{effectChains.length}</div>
              <div className="mt-1 text-xs text-slate-500">{'\u5f53\u524d\u7b5b\u9009\u8303\u56f4\u5185\u53ef\u8bc4\u5ba1\u7684\u5355\u6b3e'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{'\u91cd\u70b9\u8bc4\u5ba1'}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{highlightedCount}</div>
              <div className="mt-1 text-xs text-slate-500">{'\u5df2\u6807\u8bb0\u6c47\u62a5\u6216\u91cd\u70b9\u590d\u6838'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{'\u5b9a\u6837\u5b8c\u6210'}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{finalSampleCount}</div>
              <div className="mt-1 text-xs text-slate-500">{'\u5df2\u8fdb\u5165\u6700\u7ec8\u6837\u786e\u8ba4\u7684\u5355\u6b3e'}</div>
            </div>
          </div>
        </div>

        {effectChains.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            No version-chain assets are available in the current filter scope yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              {effectChains.map((chain) => {
                const active = chain.chainId === selectedChainId;
                return (
                  <button
                    key={chain.chainId}
                    type="button"
                    onClick={() => setSelectedChainId(chain.chainId)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{chain.itemName}</div>
                        <div className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{chain.skuCode} / {chain.seriesName}</div>
                      </div>
                      {chain.highlighted ? <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${active ? 'bg-white/15 text-white' : 'bg-pink-100 text-pink-700'}`}>{'\u91cd\u70b9'}</span> : null}
                    </div>
                    <div className={`mt-3 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{chain.waveLabel} / {'\u5b8c\u6210'} {chain.stageCount} / 4</div>
                    <div className={`mt-2 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{'\u6700\u8fd1\u66f4\u65b0'} {formatDate(chain.latestCapturedAt)}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-5">
              {selectedChain ? (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Version Chain</div>
                        <h4 className="mt-2 text-2xl font-semibold text-slate-950">{selectedChain.itemName}</h4>
                        <p className="mt-2 text-sm text-slate-500">{selectedChain.skuCode} / {selectedChain.seriesName} / {selectedChain.waveLabel}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                        <span className="rounded-full bg-white px-3 py-1">{'\u6700\u8fd1\u66f4\u65b0'} {formatDate(selectedChain.latestCapturedAt)}</span>
                        <span className="rounded-full bg-white px-3 py-1">{'\u5b8c\u6210'} {selectedChain.stageCount} / 4</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-4">
                    {VERSION_STAGE_ORDER.map((stage) => {
                      const asset = selectedChain.stages[stage] ?? null;
                      return (
                        <article key={stage} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-sm font-semibold text-slate-900">{VERSION_STAGE_META[stage].label}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">{VERSION_STAGE_META[stage].hint}</div>
                          </div>
                          {asset ? (
                            <>
                              <img src={asset.thumbnailUrl || asset.fileUrl} alt={asset.title} className="aspect-[4/5] w-full object-cover" />
                              <div className="space-y-3 p-4 text-sm text-slate-600">
                                <div className="font-medium text-slate-900">{asset.title}</div>
                                <div className="text-xs text-slate-500">{'\u62cd\u6444 / \u4e0a\u4f20'} {formatDate(asset.capturedAt ?? asset.uploadedAt)}</div>
                                {asset.bomSummary?.length ? <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">BOM</div><div className="leading-6">{asset.bomSummary.join(' / ')}</div></div> : null}
                                {asset.cmfSummary?.length ? <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">CMF</div><div className="leading-6">{asset.cmfSummary.join(' / ')}</div></div> : null}
                                {typeof asset.estimatedCost === 'number' ? <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{'\u9884\u4f30\u6210\u672c'}</div><div>¥ {asset.estimatedCost}</div></div> : null}
                              </div>
                            </>
                          ) : (
                            <div className="flex aspect-[4/5] items-center justify-center bg-slate-50 px-6 text-center text-sm text-slate-400">{'\u8be5\u9636\u6bb5\u7d20\u6750\u5f85\u8865\u5145'}</div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{'\u8f85\u52a9\u8bbe\u8ba1\u8d44\u4ea7'}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Keep moodboards, material boards, outsole boards, and color boards below the version chain for supporting review context.</p>
        </div>
        <AssetWall assets={supportingAssets} waves={waves} series={series} />
      </section>
    </div>
  );
}