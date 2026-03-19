import { PHASE_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';
import type { DesignItem, SeriesWithBrief } from '@/lib/design-review-center/types';

interface DevelopmentWaveTableProps {
  series: SeriesWithBrief[];
}

const DELIVERY_STATUS_META = {
  not_started: { label: '未启动', className: 'bg-slate-100 text-slate-700' },
  in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  blocked: { label: '阻塞', className: 'bg-rose-100 text-rose-700' },
} as const;

function getWeekRank(weekLabel: string) {
  const matched = weekLabel.match(/\d+/);
  return matched ? Number(matched[0]) : 999;
}

function resolveCostStatus(item?: DesignItem) {
  if (!item) return { label: '待补充', className: 'bg-slate-100 text-slate-700' };
  if (item.finalLockedCost) return { label: `已锁价 ￥${item.finalLockedCost}`, className: 'bg-emerald-100 text-emerald-700' };
  if (item.sampleQuotedCost) return { label: `已核价 ￥${item.sampleQuotedCost}`, className: 'bg-amber-100 text-amber-700' };
  if (item.targetCostEstimate) return { label: `目标 ￥${item.targetCostEstimate}`, className: 'bg-sky-100 text-sky-700' };
  return { label: '待补充', className: 'bg-slate-100 text-slate-700' };
}

function resolveDeliveryStatus(value?: keyof typeof DELIVERY_STATUS_META) {
  if (!value) return { label: '待补充', className: 'bg-slate-100 text-slate-700' };
  return DELIVERY_STATUS_META[value] ?? { label: '待补充', className: 'bg-slate-100 text-slate-700' };
}

export default function DevelopmentWaveTable({ series }: DevelopmentWaveTableProps) {
  const rows = series
    .flatMap((item) =>
      item.developmentPlan.map((plan) => ({
        ...plan,
        seriesName: item.seriesName,
        waveId: item.waveId,
        owner: item.designItems.find((designItem) => designItem.skuCode === plan.skuCode)?.designer ?? item.owner,
        itemDetail: item.designItems.find((designItem) => designItem.skuCode === plan.skuCode),
      })),
    )
    .sort((left, right) => {
      const waveCompare = left.waveId.localeCompare(right.waveId);
      if (waveCompare !== 0) return waveCompare;
      return getWeekRank(left.weekLabel) - getWeekRank(right.weekLabel);
    });

  const groupedRows = rows.reduce<Record<string, typeof rows>>((accumulator, row) => {
    if (!accumulator[row.waveId]) accumulator[row.waveId] = [];
    accumulator[row.waveId].push(row);
    return accumulator;
  }, {});

  if (!rows.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">当前筛选条件下暂无产品研发波段表内容。</div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedRows).map(([waveId, waveRows]) => {
        const seriesCount = new Set(waveRows.map((row) => row.seriesId)).size;
        const pendingCostCount = waveRows.filter((row) => !row.itemDetail?.finalLockedCost).length;
        const blockedCount = waveRows.filter(
          (row) => row.itemDetail?.techPackStatus === 'blocked' || row.itemDetail?.toolingStatus === 'blocked',
        ).length;

        return (
          <section key={waveId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{waveId.toUpperCase()}</div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">产品研发波段总表</h3>
                  <p className="mt-1 text-sm text-slate-500">按周次推进结构、成本、Tech Pack 与开模状态，适合周会快速扫表。</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-right">
                  <div>
                    <div className="text-xs text-slate-400">系列数</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{seriesCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">待锁价</div>
                    <div className="mt-1 text-lg font-semibold text-amber-600">{pendingCostCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">阻塞项</div>
                    <div className="mt-1 text-lg font-semibold text-rose-600">{blockedCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1480px] text-sm">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3">周次</th>
                    <th className="px-4 py-3">系列</th>
                    <th className="px-4 py-3">款号 / 品类</th>
                    <th className="px-4 py-3">结构方向</th>
                    <th className="px-4 py-3">材料 / 配色</th>
                    <th className="px-4 py-3">当前阶段</th>
                    <th className="px-4 py-3">成本状态</th>
                    <th className="px-4 py-3">Tech Pack</th>
                    <th className="px-4 py-3">开模状态</th>
                    <th className="px-4 py-3">负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {waveRows.map((row) => {
                    const phaseMeta = PHASE_MAP[row.phase] ?? PHASE_MAP.concept;
                    const costMeta = resolveCostStatus(row.itemDetail);
                    const techPackMeta = resolveDeliveryStatus(row.itemDetail?.techPackStatus);
                    const toolingMeta = resolveDeliveryStatus(row.itemDetail?.toolingStatus);
                    const riskMeta = row.itemDetail?.riskLevel ? RISK_LEVEL_MAP[row.itemDetail.riskLevel] : null;

                    return (
                      <tr key={row.rowId} className="border-t border-slate-100 align-top text-slate-700">
                        <td className="px-4 py-4 font-medium text-slate-900">{row.weekLabel}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{row.seriesName}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.productRole}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">{row.skuCode}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.itemName}</div>
                          <div className="mt-2 text-xs text-slate-500">{row.category}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">{row.silhouette}</div>
                          <div className="mt-2 text-xs text-slate-500">帮面：{row.upperConstruction}</div>
                          <div className="mt-1 text-xs text-slate-500">大底：{row.outsoleDirection}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">{row.materialFocus}</div>
                          <div className="mt-2 text-xs text-slate-500">{row.colorDirection}</div>
                          <div className="mt-2 text-xs text-slate-400">参考图 {row.referenceAssetIds.length} 张</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${phaseMeta.bgColor} ${phaseMeta.textColor}`}>
                            {phaseMeta.label}
                          </span>
                          <div className="mt-2 text-xs text-slate-500">评审重点：{row.reviewFocus}</div>
                          {riskMeta && (
                            <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${riskMeta.bgColor} ${riskMeta.textColor}`}>
                              {riskMeta.label}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${costMeta.className}`}>
                            {costMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${techPackMeta.className}`}>
                            {techPackMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toolingMeta.className}`}>
                            {toolingMeta.label}
                          </span>
                          {row.itemDetail?.toolingNotes ? <div className="mt-2 text-xs text-slate-500">{row.itemDetail.toolingNotes}</div> : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">{row.owner}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            下次评审：{row.itemDetail?.nextReviewDate ?? '待安排'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
