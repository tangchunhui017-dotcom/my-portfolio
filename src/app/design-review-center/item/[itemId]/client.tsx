'use client';

import Link from 'next/link';
import type { Asset, DesignItem, SeriesDevelopmentPlanRow, SeriesWithBrief } from '@/lib/design-review-center/types';
import type { ChangeOrderRecord, DesignReviewRecord } from '@/lib/openclaw/schema';
import { PHASE_MAP, REVIEW_STATUS_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';
import { resolveFieldValue, resolveItemFieldDefinitions } from '@/config/design-review-center/field-definitions';
import DataSourceBadge from '@/components/design-review-center/data-source-badge';

interface ItemDetailClientProps {
  item: DesignItem;
  series: SeriesWithBrief;
  reviewRecord: DesignReviewRecord | null;
  changeOrders: ChangeOrderRecord[];
  developmentPlan: SeriesDevelopmentPlanRow | null;
  relatedAssets: Asset[];
}

const reviewConclusionMap: Record<string, { label: string; className: string }> = {
  Pass: { label: '通过', className: 'bg-emerald-100 text-emerald-700' },
  Review: { label: '待复审', className: 'bg-amber-100 text-amber-700' },
  Revise: { label: '需修改', className: 'bg-blue-100 text-blue-700' },
  Fail: { label: '不通过', className: 'bg-rose-100 text-rose-700' },
};

const stageMap: Record<string, string> = {
  Proto: '原型评审',
  SMS: '销售样',
  PP: '试生产',
  TOP: '最终确认',
};

const dimensionLabels: Record<string, string> = {
  last: '鞋楦 / 轮廓',
  upper: '帮面结构',
  outsole: '大底 / 模具',
  material: '材质 / 配色',
  bom: 'BOM / 成本',
  mold_reuse: '共模复用',
};

const fieldGroupLabels = {
  commercial: '商业与成本',
  design: '设计表达',
  development: '开发与交接',
} as const;

export default function ItemDetailClient({
  item,
  series,
  reviewRecord,
  changeOrders,
  developmentPlan,
  relatedAssets,
}: ItemDetailClientProps) {
  const phaseConfig = PHASE_MAP[item.designStatus] ?? PHASE_MAP.concept;
  const reviewConfig = REVIEW_STATUS_MAP[item.reviewStatus ?? 'pending'];
  const riskConfig = RISK_LEVEL_MAP[item.riskLevel ?? series.riskLevel];
  const reviewConclusion = reviewRecord ? reviewConclusionMap[reviewRecord.conclusion] : null;
  const reviewDimensions = reviewRecord?.dimensions ? Object.entries(reviewRecord.dimensions).filter(([, value]) => value) : [];
  const configuredFields = resolveItemFieldDefinitions(item);
  const groupedFields = configuredFields.reduce<Record<string, typeof configuredFields>>((accumulator, field) => {
    if (!accumulator[field.group]) accumulator[field.group] = [];
    accumulator[field.group].push(field);
    return accumulator;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/design-review-center" className="hover:text-slate-700">设计企划与评审中心</Link>
          <span className="mx-2">/</span>
          <Link href={`/design-review-center/series/${series.seriesId}`} className="hover:text-slate-700">{series.seriesName}</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">{item.itemName}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-square bg-slate-100">
                <img src={item.thumbnailUrl} alt={item.itemName} className="h-full w-full object-cover" />
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">产品信息</h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div><div className="text-xs text-slate-400">系列</div><div className="mt-1 font-medium text-slate-900">{series.seriesName}</div></div>
                <div><div className="text-xs text-slate-400">波段</div><div className="mt-1 font-medium text-slate-900">{item.waveId ?? series.waveId}</div></div>
                <div><div className="text-xs text-slate-400">品类</div><div className="mt-1 font-medium text-slate-900">{item.category}</div></div>
                <div><div className="text-xs text-slate-400">场合</div><div className="mt-1 font-medium text-slate-900">{item.occasion}</div></div>
                <div><div className="text-xs text-slate-400">产品角色</div><div className="mt-1 font-medium text-slate-900">{item.productRole}</div></div>
                <div><div className="text-xs text-slate-400">设计师</div><div className="mt-1 font-medium text-slate-900">{item.designer}</div></div>
                <div><div className="text-xs text-slate-400">材料</div><div className="mt-1 font-medium text-slate-900">{item.material}</div></div>
                <div><div className="text-xs text-slate-400">配色</div><div className="mt-1 font-medium text-slate-900">{item.colorway}</div></div>
                <div><div className="text-xs text-slate-400">目标上市</div><div className="mt-1 font-medium text-slate-900">{item.targetLaunchDate}</div></div>
                <div><div className="text-xs text-slate-400">下次评审</div><div className="mt-1 font-medium text-slate-900">{item.nextReviewDate ?? '待定'}</div></div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">字段配置视图</h2>
                  <p className="mt-1 text-sm text-slate-500">后续可按品类或品牌切换字段，不把鞋类字段写死在页面里。</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Schema-driven</span>
              </div>
              <div className="space-y-5">
                {Object.entries(groupedFields).map(([group, fields]) => (
                  <div key={group}>
                    <div className="text-sm font-semibold text-slate-900">{fieldGroupLabels[group as keyof typeof fieldGroupLabels]}</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {fields.map((field) => {
                        const value = resolveFieldValue(item, developmentPlan, field);
                        return (
                          <div key={`${group}-${field.key}`} className="rounded-2xl bg-slate-50 p-4">
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{field.label}</div>
                            <div className={`mt-2 text-sm ${value ? 'text-slate-800' : 'text-slate-400'}`}>
                              {value ?? field.placeholder ?? '待补充'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {relatedAssets.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-slate-800">关联资产</h2>
                <div className="grid grid-cols-2 gap-3">
                  {relatedAssets.map((asset) => (
                    <div key={asset.assetId} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <div className="aspect-square bg-slate-100">
                        <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-medium text-slate-900">{asset.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{asset.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${phaseConfig.bgColor} ${phaseConfig.textColor}`}>{phaseConfig.label}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${reviewConfig.bgColor} ${reviewConfig.textColor}`}>{reviewConfig.label}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${riskConfig.bgColor} ${riskConfig.textColor}`}>
                  <span>{riskConfig.icon}</span>
                  <span>{riskConfig.label}</span>
                </span>
                <DataSourceBadge source={item.source} syncStatus={item.syncStatus} updatedBy={item.updatedBy} updatedAt={item.updatedAt} />
              </div>
              <h1 className="mt-4 text-3xl font-bold text-slate-900">{item.itemName}</h1>
              <p className="mt-1 text-lg text-slate-500">{item.skuCode}</p>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {item.reviewSummary ?? item.designNotes}
              </div>
            </section>

            {developmentPlan && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-slate-800">开发表达</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">楦底方向</div>
                    <div className="mt-2 text-sm text-slate-700">{developmentPlan.silhouette}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">帮面结构</div>
                    <div className="mt-2 text-sm text-slate-700">{developmentPlan.upperConstruction}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">大底方向</div>
                    <div className="mt-2 text-sm text-slate-700">{developmentPlan.outsoleDirection}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">材料 / 配色</div>
                    <div className="mt-2 text-sm text-slate-700">{developmentPlan.materialFocus}</div>
                    <div className="mt-1 text-xs text-slate-500">{developmentPlan.colorDirection}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">本轮评审重点</div>
                  <div className="mt-2 text-sm text-slate-700">{developmentPlan.reviewFocus}</div>
                </div>
              </section>
            )}

            {reviewRecord && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-800">OpenClaw 评审链</h2>
                  {reviewConclusion && <span className={`rounded-full px-3 py-1 text-xs font-medium ${reviewConclusion.className}`}>{reviewConclusion.label}</span>}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{stageMap[reviewRecord.stage] ?? reviewRecord.stage}</span>
                </div>

                <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-4">
                  <div><div className="text-xs text-slate-400">评审日期</div><div className="mt-1 font-medium text-slate-900">{reviewRecord.review_date}</div></div>
                  <div><div className="text-xs text-slate-400">评审人</div><div className="mt-1 font-medium text-slate-900">{reviewRecord.reviewer}</div></div>
                  <div><div className="text-xs text-slate-400">下次评审</div><div className="mt-1 font-medium text-slate-900">{reviewRecord.next_review_date ?? '待定'}</div></div>
                  <div><div className="text-xs text-slate-400">OpenClaw 文件</div><div className="mt-1 font-medium text-slate-900">{reviewRecord.source_file}</div></div>
                </div>

                {reviewDimensions.length > 0 && (
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {reviewDimensions.map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">{dimensionLabels[key] ?? key}</div>
                          {value?.risk && <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${RISK_LEVEL_MAP[value.risk].bgColor} ${RISK_LEVEL_MAP[value.risk].textColor}`}>{RISK_LEVEL_MAP[value.risk].label}</span>}
                        </div>
                        {value?.score != null && <div className="mt-3 text-2xl font-bold text-slate-900">{value.score}<span className="ml-1 text-xs text-slate-400">/100</span></div>}
                        <div className="mt-3 text-sm leading-6 text-slate-600">{value?.comment}</div>
                      </div>
                    ))}
                  </div>
                )}

                {reviewRecord.change_actions && reviewRecord.change_actions.length > 0 && (
                  <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">评审修改动作</div>
                    <div className="mt-3 space-y-3">
                      {reviewRecord.change_actions.map((action, index) => (
                        <div key={`${action.type}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">{action.type}</span>
                            <span className="text-xs text-slate-500">{action.responsible}</span>
                          </div>
                          <div className="mt-2 text-sm text-slate-700">{action.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reviewRecord.version_history && reviewRecord.version_history.length > 0 && (
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-slate-900">版本历史</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {reviewRecord.version_history.map((version) => (
                        <div key={version.version} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-base font-semibold text-slate-900">{version.version}</div>
                            <div className="text-xs text-slate-500">{version.date}</div>
                          </div>
                          <div className="mt-2 text-sm leading-6 text-slate-600">{version.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {changeOrders.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-slate-800">修改单</h2>
                <div className="space-y-4">
                  {changeOrders.map((changeOrder) => (
                    <div key={changeOrder.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{changeOrder.change_type}</div>
                          <div className="mt-1 text-xs text-slate-500">{changeOrder.title}</div>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">{changeOrder.status}</span>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-700">{changeOrder.change_detail}</div>
                      <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <div><span className="text-slate-400">责任人：</span>{changeOrder.responsible}</div>
                        <div><span className="text-slate-400">截止时间：</span>{changeOrder.deadline}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">设计备注</h2>
              <p className="text-sm leading-6 text-slate-700">{item.designNotes}</p>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div><div className="text-xs text-slate-400">创建时间</div><div className="mt-1 text-slate-900">{new Date(item.createdAt).toLocaleString('zh-CN')}</div></div>
                <div><div className="text-xs text-slate-400">最后更新</div><div className="mt-1 text-slate-900">{new Date(item.updatedAt).toLocaleString('zh-CN')}</div></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}