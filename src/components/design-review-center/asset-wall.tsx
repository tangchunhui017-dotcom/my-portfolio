'use client';

import { useMemo, useState } from 'react';
import type { Asset, Wave, SeriesWithBrief } from '@/lib/design-review-center/types';

interface AssetWallProps {
  assets: Asset[];
  waves: Wave[];
  series: SeriesWithBrief[];
  showFeaturedOnlyByDefault?: boolean;
}

const assetTypeTabs = [
  { id: 'moodboard', label: '风格板' },
  { id: 'material', label: '材料板' },
  { id: 'outsole', label: '大底 / 楦型' },
  { id: 'color', label: '配色' },
] as const;

export default function AssetWall({ assets, waves, series, showFeaturedOnlyByDefault = false }: AssetWallProps) {
  const [activeTab, setActiveTab] = useState<typeof assetTypeTabs[number]['id']>('moodboard');
  const [selectedWave, setSelectedWave] = useState<string>('all');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(showFeaturedOnlyByDefault);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (asset.assetType !== activeTab) return false;
      if (showFeaturedOnly && !asset.featuredInReport) return false;
      if (selectedSeries !== 'all') return asset.seriesId === selectedSeries;
      if (selectedWave !== 'all') {
        const assetSeries = series.find((seriesRecord) => seriesRecord.seriesId === asset.seriesId);
        return assetSeries?.waveId === selectedWave;
      }
      return true;
    });
  }, [activeTab, assets, selectedSeries, selectedWave, series, showFeaturedOnly]);

  const availableSeries = selectedWave === 'all'
    ? series
    : series.filter((seriesRecord) => seriesRecord.waveId === selectedWave);

  const activeAsset = filteredAssets.find((asset) => asset.assetId === activeAssetId) ?? null;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">图像资产墙</h3>
              <div className="mt-1 text-sm text-slate-500">支持波段 / 系列筛选，并可切换只看汇报精选。</div>
            </div>
            <button
              type="button"
              onClick={() => setShowFeaturedOnly((current) => !current)}
              className={[
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                showFeaturedOnly ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ].join(' ')}
            >
              {showFeaturedOnly ? '只看汇报精选中' : '只看汇报精选'}
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {assetTypeTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedWave}
              onChange={(event) => {
                setSelectedWave(event.target.value);
                setSelectedSeries('all');
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">全部波段</option>
              {waves.map((wave) => (
                <option key={wave.waveId} value={wave.waveId}>
                  {wave.waveName}
                </option>
              ))}
            </select>

            <select
              value={selectedSeries}
              onChange={(event) => setSelectedSeries(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">全部系列</option>
              {availableSeries.map((seriesRecord) => (
                <option key={seriesRecord.seriesId} value={seriesRecord.seriesId}>
                  {seriesRecord.seriesName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredAssets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-400">
              当前筛选条件下没有 {assetTypeTabs.find((tab) => tab.id === activeTab)?.label} 资产。
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <button
                key={asset.assetId}
                type="button"
                onClick={() => setActiveAssetId(asset.assetId)}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition-all hover:shadow-lg"
              >
                <div className="aspect-square">
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                {asset.featuredInReport && (
                  <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                    汇报精选
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <div className="text-xs font-semibold text-white">{asset.title}</div>
                  <div className="mt-1 line-clamp-2 text-[11px] text-white/75">{asset.description}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setActiveAssetId(null)}>
          <div className="grid max-h-[90vh] w-full max-w-6xl gap-6 overflow-hidden rounded-3xl bg-white p-4 shadow-2xl lg:grid-cols-[1.4fr_0.8fr]" onClick={(event) => event.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl bg-slate-100">
              <img src={activeAsset.fileUrl} alt={activeAsset.title} className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col justify-between gap-4 p-2">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xl font-semibold text-slate-900">{activeAsset.title}</h4>
                  <button type="button" onClick={() => setActiveAssetId(null)} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200">
                    关闭
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{activeAsset.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeAsset.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div>系列：{series.find((seriesRecord) => seriesRecord.seriesId === activeAsset.seriesId)?.seriesName ?? activeAsset.seriesId}</div>
                <div className="mt-2">上传人：{activeAsset.uploadedBy}</div>
                <div className="mt-2">上传时间：{new Date(activeAsset.uploadedAt).toLocaleDateString('zh-CN')}</div>
                <div className="mt-2">来源：{activeAsset.source === 'openclaw' ? 'OpenClaw' : '手动录入'}</div>
                <div className="mt-2">汇报精选：{activeAsset.featuredInReport ? '是' : '否'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
