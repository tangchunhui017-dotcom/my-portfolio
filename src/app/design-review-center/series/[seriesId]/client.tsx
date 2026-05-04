'use client';

import Link from 'next/link';
import { useState } from 'react';
import DataSourceBadge from '@/components/design-review-center/data-source-badge';
import SeriesDevelopmentSchedule from '@/components/design-review-center/series-development-schedule';
import { PHASE_MAP, REVIEW_STATUS_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';
import type { SeriesWithBrief, Timeline, Wave } from '@/lib/design-review-center/types';

interface SeriesDetailClientProps {
  series: SeriesWithBrief;
  waves: Wave[];
  timeline: Timeline;
}

const reportModeCards = [
  { key: 'progress', label: '系列推进度', tone: 'text-blue-600' },
  { key: 'review', label: '需重点关注单款', tone: 'text-amber-600' },
  { key: 'risk', label: '高风险问题', tone: 'text-rose-600' },
  { key: 'asset', label: '汇报资产', tone: 'text-indigo-600' },
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return '待定';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN');
}

export default function SeriesDetailClient({ series, waves, timeline }: SeriesDetailClientProps) {
  const [mode, setMode] = useState<'work' | 'report'>('work');

  const wave = waves.find((waveRecord) => waveRecord.waveId === series.waveId);
  const riskConfig = RISK_LEVEL_MAP[series.riskLevel];
  const phaseConfig = PHASE_MAP[series.milestoneStatus] ?? PHASE_MAP.concept;
  const highlightedMilestones = timeline.milestones.slice(0, 5);
  const featuredAssets = series.assets.filter((asset) => asset.featuredInReport);
  const reportAssets = featuredAssets.length > 0 ? featuredAssets : series.assets.slice(0, 4);
  const attentionItems = series.designItems.filter(
    (item) => item.riskLevel === 'high' || item.riskLevel === 'blocking' || item.reviewStatus === 'review' || item.reviewStatus === 'fail',
  );
  const openTasks = series.tasks.filter((task) => task.status !== 'completed');
  const urgentRisks = series.risks.filter((risk) => risk.priority === 'high' || risk.priority === 'blocking');
  const reportCards = {
    progress: {
      value: `${series.progress}%`,
      note: phaseConfig.label,
    },
    review: {
      value: String(attentionItems.length),
      note: attentionItems.length > 0 ? `优先看 ${attentionItems[0]?.itemName}` : '当前没有需额外关注的单款',
    },
    risk: {
      value: String(urgentRisks.length),
      note: urgentRisks.length > 0 ? urgentRisks[0]?.title ?? '-' : '当前没有高风险问题',
    },
    asset: {
      value: String(reportAssets.length),
      note: featuredAssets.length > 0 ? '优先展示汇报精选资产' : '当前使用默认重点资产',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/design-review-center" className="hover:text-slate-700">
            鞋类产品企划与设计开发协同中心
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">{series.seriesName}</span>
        </nav>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative min-h-[320px] bg-slate-100">
              <img src={series.heroImage} alt={series.seriesName} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${riskConfig.bgColor} ${riskConfig.textColor}`}>
                    {riskConfig.icon} {riskConfig.label}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${phaseConfig.bgColor} ${phaseConfig.textColor}`}>
                    {phaseConfig.label}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                    {wave?.waveName ?? series.waveId}
                  </span>
                </div>
                <h1 className="text-3xl font-bold">{series.seriesName}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">{series.designTheme}</p>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <DataSourceBadge source={series.source} syncStatus={series.syncStatus} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{series.priceBand}</span>
                </div>
                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMode('work')}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      mode === 'work' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    工作视图
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('report')}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      mode === 'report' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    汇报视图
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <div className="text-xs text-slate-400">所属波段</div>
                  <div className="mt-1 font-medium text-slate-900">{wave?.waveName ?? series.waveId}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">目标人群</div>
                  <div className="mt-1 font-medium text-slate-900">{series.targetConsumer}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">使用场景</div>
                  <div className="mt-1 font-medium text-slate-900">{series.occasion}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">负责人</div>
                  <div className="mt-1 font-medium text-slate-900">{series.owner}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">目标品类</div>
                  <div className="mt-1 font-medium text-slate-900">{series.targetCategories.join(' / ')}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">阶段截止</div>
                  <div className="mt-1 font-medium text-slate-900">{formatDate(series.dueDate)}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-4 text-center">
                <div>
                  <div className="text-xl font-semibold text-slate-900">{series.designItems.length}</div>
                  <div className="text-xs text-slate-500">单款</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-indigo-600">{series.assets.length}</div>
                  <div className="text-xs text-slate-500">资产</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-rose-600">{series.risks.length}</div>
                  <div className="text-xs text-slate-500">风险</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-amber-600">{series.tasks.length}</div>
                  <div className="text-xs text-slate-500">动作</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>系列推进度</span>
                  <span>{series.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${series.progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-8">
          {mode === 'report' ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {reportModeCards.map((card) => (
                  <article key={card.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm text-slate-500">{card.label}</div>
                    <div className={`mt-3 text-3xl font-bold ${reportCards[card.key].value === '0' ? 'text-slate-900' : card.tone}`}>
                      {reportCards[card.key].value}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">{reportCards[card.key].note}</div>
                  </article>
                ))}
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">汇报摘要</h2>
                      <p className="mt-1 text-sm text-slate-500">保留系列表达、评审重点和关键决策信息，适合周会或阶段汇报直接使用。</p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">汇报就绪</span>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">系列表达</div>
                      <div className="mt-3 text-sm leading-6 text-slate-700">{series.brief?.designConcept ?? series.designTheme}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">当前评审重点</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(series.brief?.reviewFocus ?? []).slice(0, 4).map((focus) => (
                          <span key={focus} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                            {focus}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">楦型 / 帮面 / 大底方向</div>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div>{series.brief?.silhouetteDirections.slice(0, 2).join(' / ') ?? '待补充'}</div>
                        <div>{series.brief?.upperConstructionKeywords.slice(0, 2).join(' / ') ?? '待补充'}</div>
                        <div>{series.brief?.outsoleDirections.slice(0, 2).join(' / ') ?? '待补充'}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">材料 / 配色方向</div>
                      <div className="mt-3 text-sm text-slate-700">{series.brief?.materialPackage.primary.join(' / ') ?? '待补充'}</div>
                      <div className="mt-2 text-xs text-slate-500">主色：{series.brief?.colorPackage.base.join(' / ') ?? '待补充'}</div>
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-800">重点风险与动作</h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">高风险问题</div>
                      <div className="mt-3 space-y-3">
                        {urgentRisks.length > 0 ? (
                          urgentRisks.slice(0, 3).map((risk) => (
                            <div key={risk.riskId} className="rounded-2xl bg-rose-50 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium text-slate-900">{risk.title}</div>
                                <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${RISK_LEVEL_MAP[risk.priority].bgColor} ${RISK_LEVEL_MAP[risk.priority].textColor}`}>
                                  {RISK_LEVEL_MAP[risk.priority].label}
                                </span>
                              </div>
                              <div className="mt-2 text-sm leading-6 text-slate-600">{risk.mitigation}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">当前没有高风险问题。</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">未关闭动作</div>
                      <div className="mt-3 space-y-3">
                        {openTasks.length > 0 ? (
                          openTasks.slice(0, 3).map((task) => (
                            <div key={task.taskId} className="rounded-2xl bg-amber-50 p-4">
                              <div className="font-medium text-slate-900">{task.title}</div>
                              <div className="mt-2 text-sm leading-6 text-slate-600">{task.description}</div>
                              <div className="mt-2 text-xs text-slate-500">负责人 {task.assignee} / 截止 {formatDate(task.dueDate)}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">当前没有未关闭动作。</div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-800">关键里程碑</h2>
                  <div className="mt-4 space-y-3">
                    {highlightedMilestones.map((milestone) => (
                      <div key={milestone.milestoneId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{milestone.title}</div>
                            <div className="mt-1 text-xs text-slate-500">计划 {formatDate(milestone.plannedDate)} / 负责人 {milestone.owner}</div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${RISK_LEVEL_MAP[milestone.riskLevel].bgColor} ${RISK_LEVEL_MAP[milestone.riskLevel].textColor}`}>
                            {RISK_LEVEL_MAP[milestone.riskLevel].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-slate-800">汇报资产</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{reportAssets.length} 张</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {reportAssets.map((asset) => (
                      <div key={asset.assetId} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="aspect-square bg-slate-100">
                          <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-slate-900">{asset.title}</div>
                            {asset.featuredInReport ? <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700">汇报精选</span> : null}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{asset.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-800">需重点关注单款</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{attentionItems.length} 款</span>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {attentionItems.length > 0 ? (
                    attentionItems.slice(0, 6).map((item) => {
                      const itemRisk = RISK_LEVEL_MAP[item.riskLevel ?? series.riskLevel];
                      const itemReview = REVIEW_STATUS_MAP[item.reviewStatus ?? 'pending'];
                      return (
                        <Link
                          key={item.itemId}
                          href={`/design-review-center/item/${item.itemId}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-slate-900">{item.itemName}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.skuCode} / {item.category}</div>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${itemRisk.bgColor} ${itemRisk.textColor}`}>
                              {itemRisk.label}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full px-2 py-1 font-medium ${itemReview.bgColor} ${itemReview.textColor}`}>
                              {itemReview.label}
                            </span>
                            <span className="rounded-full bg-white px-2 py-1 text-slate-600">{item.designer}</span>
                          </div>
                          <div className="mt-3 text-sm leading-6 text-slate-600">{item.reviewSummary ?? item.designNotes}</div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">当前没有需额外关注的单款。</div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              {series.brief ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-slate-800">系列策略表达</h2>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">设计概念</div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">{series.brief.designConcept}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">使用场景</div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">{series.brief.consumerScene}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">系列关键词</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {series.brief.styleKeywords.map((keyword) => (
                            <span key={keyword} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">对标参考</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {series.brief.benchmarkReferences.map((reference) => (
                            <span key={reference} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                              {reference}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">楦型方向</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {series.brief.silhouetteDirections.map((direction) => (
                            <span key={direction} className="rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-700">
                              {direction}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">帮面结构</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {series.brief.upperConstructionKeywords.map((keyword) => (
                            <span key={keyword} className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">大底方向</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {series.brief.outsoleDirections.map((direction) => (
                            <span key={direction} className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                              {direction}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">主材料 / 强调材料</div>
                          <div className="mt-2 text-sm leading-6 text-slate-700">{series.brief.materialPackage.primary.join(' / ')}</div>
                          <div className="mt-2 text-xs text-slate-500">强调：{series.brief.materialPackage.accent.join(' / ')}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">主色 / 强调色</div>
                          <div className="mt-2 text-sm leading-6 text-slate-700">{series.brief.colorPackage.base.join(' / ')}</div>
                          <div className="mt-2 text-xs text-slate-500">强调：{series.brief.colorPackage.accent.join(' / ')}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">当前评审焦点</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {series.brief.reviewFocus.map((focus) => (
                        <span key={focus} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                          {focus}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {series.developmentPlan.length > 0 ? <SeriesDevelopmentSchedule plans={series.developmentPlan} assets={series.assets} /> : null}

              <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-slate-800">关键里程碑</h2>
                  <div className="space-y-3">
                    {highlightedMilestones.map((milestone) => (
                      <div key={milestone.milestoneId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{milestone.title}</div>
                            <div className="mt-1 text-xs text-slate-500">计划 {formatDate(milestone.plannedDate)} / 负责人 {milestone.owner}</div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${RISK_LEVEL_MAP[milestone.riskLevel].bgColor} ${RISK_LEVEL_MAP[milestone.riskLevel].textColor}`}>
                            {RISK_LEVEL_MAP[milestone.riskLevel].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-slate-800">相关资产</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {series.assets.map((asset) => (
                      <div key={asset.assetId} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="aspect-square bg-slate-100">
                          <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-slate-900">{asset.title}</div>
                            {asset.featuredInReport ? <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700">汇报精选</span> : null}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{asset.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {series.designItems.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-slate-800">相关单款</h2>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {series.designItems.map((item) => (
                      <Link
                        key={item.itemId}
                        href={`/design-review-center/item/${item.itemId}`}
                        className="group rounded-lg border border-slate-200 bg-slate-50 p-3 transition-all hover:shadow-md"
                      >
                        <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-slate-100">
                          <img src={item.thumbnailUrl} alt={item.itemName} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        </div>
                        <div className="text-sm font-medium text-slate-900">{item.itemName}</div>
                        <div className="text-xs text-slate-500">{item.skuCode} / {item.category}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.designer}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
