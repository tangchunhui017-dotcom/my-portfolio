'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ASSET_TYPE_LABELS } from '@/config/design-review-center/labels';
import { REVIEW_CONCLUSION_MAP, RISK_LEVEL_MAP, STAGE_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { DesignVersionChain } from '@/lib/design-review-center/selectors/assets';

interface EffectPreviewPanelProps {
  chains: DesignVersionChain[];
}

export default function EffectPreviewPanel({ chains }: EffectPreviewPanelProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<string>(chains[0]?.styleId ?? '');

  useEffect(() => {
    if (!chains.length) {
      setSelectedStyleId('');
      return;
    }

    if (!chains.some((chain) => chain.styleId === selectedStyleId)) {
      setSelectedStyleId(chains[0].styleId);
    }
  }, [chains, selectedStyleId]);

  const selectedChain = useMemo(
    () => chains.find((chain) => chain.styleId === selectedStyleId) ?? null,
    [chains, selectedStyleId],
  );

  if (!chains.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无设计版本资产。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Version Chain</div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">从图到物追踪每款的版本演进</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              把概念草图、效果图、样鞋照片和材料配色变化挂到同一条业务链上，直接判断评审结论、阶段推进和风险标签。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">版本链</div><div className="mt-2 text-2xl font-semibold text-slate-950">{chains.length}</div></div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">最新版本</div><div className="mt-2 text-2xl font-semibold text-slate-950">{chains.filter((chain) => chain.versions.some((version) => version.isLatest)).length}</div></div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">高风险 / 阻塞</div><div className="mt-2 text-2xl font-semibold text-rose-600">{chains.filter((chain) => chain.riskLevel === 'high' || chain.riskLevel === 'blocking' || chain.blocked).length}</div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {chains.map((chain) => {
            const riskMeta = RISK_LEVEL_MAP[chain.riskLevel];
            const active = chain.styleId === selectedStyleId;
            return (
              <button
                key={chain.styleId}
                type="button"
                onClick={() => setSelectedStyleId(chain.styleId)}
                className={[
                  'w-full rounded-3xl border px-4 py-4 text-left transition',
                  active ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{chain.styleName}</div>
                    <div className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{chain.skuCode} / {chain.seriesName}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? 'bg-white/15 text-white' : `${riskMeta.bgColor} ${riskMeta.textColor}`}`}>
                    {chain.blocked ? '阻塞' : riskMeta.label}
                  </span>
                </div>
                <div className={`mt-3 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{chain.categoryName} / {chain.waveId.toUpperCase()}</div>
                <div className={`mt-2 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>v{chain.latestVersionNumber} / 最近更新 {formatDate(chain.latestUpdatedAt)}</div>
              </button>
            );
          })}
        </div>

        {selectedChain ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Style Header</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedChain.styleName}</h3>
                  <p className="mt-2 text-sm text-slate-500">{selectedChain.skuCode} / {selectedChain.seriesName} / {selectedChain.categoryName} / {selectedChain.waveId.toUpperCase()}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-3 py-1 ${STAGE_MAP[selectedChain.currentStage].bgColor} ${STAGE_MAP[selectedChain.currentStage].textColor}`}>{STAGE_MAP[selectedChain.currentStage].label}</span>
                  <span className={`rounded-full px-3 py-1 ${RISK_LEVEL_MAP[selectedChain.riskLevel].bgColor} ${RISK_LEVEL_MAP[selectedChain.riskLevel].textColor}`}>{selectedChain.blocked ? '阻塞' : RISK_LEVEL_MAP[selectedChain.riskLevel].label}</span>
                  {selectedChain.reviewConclusion ? (
                    <span className={`rounded-full px-3 py-1 ${REVIEW_CONCLUSION_MAP[selectedChain.reviewConclusion].bgColor} ${REVIEW_CONCLUSION_MAP[selectedChain.reviewConclusion].textColor}`}>{REVIEW_CONCLUSION_MAP[selectedChain.reviewConclusion].label}</span>
                  ) : null}
                  <Link href={`/design-review-center/item/${selectedChain.styleId}`} className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200">
                    查看详情
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedChain.versions.map((version, index) => {
                const stageMeta = STAGE_MAP[version.currentStage];
                const riskMeta = RISK_LEVEL_MAP[version.riskLevel];
                const previous = selectedChain.versions[index + 1] ?? null;
                return (
                  <article key={version.assetId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <img src={version.imageUrl} alt={version.assetId} className="aspect-[4/3] w-full object-cover" />
                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">v{version.versionNumber} / {ASSET_TYPE_LABELS[version.assetType]}</div>
                          <div className="mt-1 text-xs text-slate-500">上传于 {formatDate(version.uploadedAt)}</div>
                        </div>
                        {version.isLatest ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">最新</span> : null}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full px-3 py-1 ${stageMeta.bgColor} ${stageMeta.textColor}`}>{stageMeta.label}</span>
                        <span className={`rounded-full px-3 py-1 ${riskMeta.bgColor} ${riskMeta.textColor}`}>{riskMeta.label}</span>
                        {version.reviewConclusion ? <span className={`rounded-full px-3 py-1 ${REVIEW_CONCLUSION_MAP[version.reviewConclusion].bgColor} ${REVIEW_CONCLUSION_MAP[version.reviewConclusion].textColor}`}>{REVIEW_CONCLUSION_MAP[version.reviewConclusion].label}</span> : null}
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <div><div className="text-xs text-slate-400">材料方案</div><div className="mt-1 leading-6 text-slate-900">{version.materialPlan.join(' / ')}</div></div>
                        <div><div className="text-xs text-slate-400">配色方案</div><div className="mt-1 leading-6 text-slate-900">{version.colorPlan.join(' / ')}</div></div>
                        <div><div className="text-xs text-slate-400">底台</div><div className="mt-1 leading-6 text-slate-900">{version.outsole}</div></div>
                        <div><div className="text-xs text-slate-400">楦型</div><div className="mt-1 leading-6 text-slate-900">{version.last}</div></div>
                        <div><div className="text-xs text-slate-400">目标成本</div><div className="mt-1 leading-6 text-slate-900">{typeof version.targetCost === 'number' ? `¥ ${version.targetCost}` : '待补充'}</div></div>
                        <div><div className="text-xs text-slate-400">相对上轮变化</div><div className="mt-1 leading-6 text-slate-900">{version.deltaNote ?? (previous ? '本轮未补充变更说明' : '首版建立基准线')}</div></div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{version.summary}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
