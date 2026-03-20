import { PHASE_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';
import type { CriticalPathLevel, DevelopmentWaveRecord } from '@/lib/design-review-center/types';

interface DevelopmentWaveTableProps {
  rows: DevelopmentWaveRecord[];
}

const DELIVERY_STATUS_META = {
  not_started: { label: '未启动', className: 'bg-slate-100 text-slate-700' },
  in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  blocked: { label: '已阻塞', className: 'bg-rose-100 text-rose-700' },
} as const;

const CRITICAL_PATH_META: Record<CriticalPathLevel, { label: string; className: string }> = {
  normal: { label: '正常路径', className: 'bg-slate-100 text-slate-700' },
  watch: { label: '重点关注', className: 'bg-amber-100 text-amber-700' },
  critical: { label: '关键路径', className: 'bg-rose-100 text-rose-700' },
};

function formatDate(value: string | null) {
  if (!value) return '待确认';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function sortRows(rows: DevelopmentWaveRecord[]) {
  return [...rows].sort((left, right) => {
    const dropCompare = left.dropDate.localeCompare(right.dropDate);
    if (dropCompare !== 0) return dropCompare;
    return left.weekLabel.localeCompare(right.weekLabel);
  });
}

function getCostMeta(row: DevelopmentWaveRecord) {
  if (row.finalLockedCost) return { label: `已锁价 ¥${row.finalLockedCost}`, className: 'bg-emerald-100 text-emerald-700' };
  if (row.sampleQuotedCost) return { label: `已核价 ¥${row.sampleQuotedCost}`, className: 'bg-amber-100 text-amber-700' };
  if (row.targetCostEstimate) return { label: `目标价 ¥${row.targetCostEstimate}`, className: 'bg-sky-100 text-sky-700' };
  return { label: '待补充', className: 'bg-slate-100 text-slate-700' };
}

export default function DevelopmentWaveTable({ rows }: DevelopmentWaveTableProps) {
  const sortedRows = sortRows(rows);

  if (!sortedRows.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无产品研发波段表内容。
      </div>
    );
  }

  const groupedRows = sortedRows.reduce<Record<string, DevelopmentWaveRecord[]>>((accumulator, row) => {
    if (!accumulator[row.waveId]) accumulator[row.waveId] = [];
    accumulator[row.waveId].push(row);
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedRows).map(([waveId, waveRows]) => {
        const earliestDrop = [...waveRows].sort((left, right) => left.dropDate.localeCompare(right.dropDate))[0] ?? null;
        const nearestMaterialLock = [...waveRows]
          .filter((row) => row.materialLockDate)
          .sort((left, right) => (left.materialLockDate ?? '').localeCompare(right.materialLockDate ?? ''))[0] ?? null;
        const nearestToolingFreeze = [...waveRows]
          .filter((row) => row.toolingFreezeDate)
          .sort((left, right) => (left.toolingFreezeDate ?? '').localeCompare(right.toolingFreezeDate ?? ''))[0] ?? null;

        const longLeadCount = waveRows.filter((row) => row.longLeadMaterial.length > 0).length;
        const criticalCount = waveRows.filter((row) => row.criticalPathLevel === 'critical').length;
        const blockedCount = waveRows.filter((row) => row.techPackStatus === 'blocked' || row.toolingStatus === 'blocked').length;

        return (
          <section key={waveId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{waveRows[0]?.waveName ?? waveId.toUpperCase()}</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">按上市倒推的研发节奏表</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    从 Drop Date 往前倒推材料锁定、Tech Pack、试模和锁模节点，先看关键路径，再看具体款式。
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-sm">
                  <div>
                    <div className="text-xs text-slate-400">长交期行数</div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">{longLeadCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">关键路径</div>
                    <div className="mt-1 text-lg font-semibold text-rose-600">{criticalCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">阻塞项</div>
                    <div className="mt-1 text-lg font-semibold text-rose-600">{blockedCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 bg-white px-6 py-5 xl:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">最早上市时间</div>
                <div className="mt-3 text-lg font-semibold text-slate-950">{earliestDrop ? formatDate(earliestDrop.dropDate) : '待确认'}</div>
                <div className="mt-2 text-sm text-slate-600">所有前置节点都应从这里倒推。</div>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">材料下单死线</div>
                <div className="mt-3 text-lg font-semibold text-slate-950">{nearestMaterialLock ? formatDate(nearestMaterialLock.materialLockDate) : '待确认'}</div>
                <div className="mt-2 text-sm text-slate-600">
                  {nearestMaterialLock ? `${nearestMaterialLock.skuCode} / ${nearestMaterialLock.longLeadMaterial.join('、')}` : '当前没有长交期材料锁定节点。'}
                </div>
              </article>
              <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">模具关键节点</div>
                <div className="mt-3 text-lg font-semibold text-slate-950">{nearestToolingFreeze ? formatDate(nearestToolingFreeze.toolingFreezeDate) : '待确认'}</div>
                <div className="mt-2 text-sm text-slate-600">
                  {nearestToolingFreeze ? `${nearestToolingFreeze.skuCode} / 锁模前必须完成试模验证` : '当前没有锁模节点。'}
                </div>
              </article>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1720px] w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="border-b border-slate-200 px-4 py-3">波段 / 周次</th>
                    <th className="border-b border-slate-200 px-4 py-3">Drop Date</th>
                    <th className="border-b border-slate-200 px-4 py-3">系列 / 款号</th>
                    <th className="border-b border-slate-200 px-4 py-3">结构方向</th>
                    <th className="border-b border-slate-200 px-4 py-3">长交期材料</th>
                    <th className="border-b border-slate-200 px-4 py-3">材料锁定</th>
                    <th className="border-b border-slate-200 px-4 py-3">Tech Pack 截止</th>
                    <th className="border-b border-slate-200 px-4 py-3">开模路径</th>
                    <th className="border-b border-slate-200 px-4 py-3">当前阶段</th>
                    <th className="border-b border-slate-200 px-4 py-3">成本状态</th>
                    <th className="border-b border-slate-200 px-4 py-3">负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {waveRows.map((row) => {
                    const phaseMeta = PHASE_MAP[row.phase] ?? PHASE_MAP.concept;
                    const costMeta = getCostMeta(row);
                    const techPackMeta = DELIVERY_STATUS_META[row.techPackStatus];
                    const toolingMeta = DELIVERY_STATUS_META[row.toolingStatus];
                    const riskMeta = RISK_LEVEL_MAP[row.riskLevel] ?? RISK_LEVEL_MAP.medium;
                    const criticalMeta = CRITICAL_PATH_META[row.criticalPathLevel];

                    return (
                      <tr key={row.rowId} className="align-top text-slate-700">
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="font-medium text-slate-900">{row.weekLabel}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.waveName}</div>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="font-medium text-slate-900">{formatDate(row.dropDate)}</div>
                          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${criticalMeta.className}`}>{criticalMeta.label}</div>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="font-semibold text-slate-900">{row.seriesName}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.skuCode} / {row.itemName}</div>
                          <div className="mt-2 text-xs text-slate-500">{row.category} / {row.productRole}</div>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="font-medium text-slate-900">{row.silhouette}</div>
                          <div className="mt-2 text-xs text-slate-500">帮面：{row.upperConstruction}</div>
                          <div className="mt-1 text-xs text-slate-500">大底：{row.outsoleDirection}</div>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          {row.longLeadMaterial.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {row.longLeadMaterial.map((material) => (
                                  <span key={material} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">{material}</span>
                                ))}
                              </div>
                              <div className="text-xs text-slate-500">{row.materialFocus}</div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm text-slate-400">无长交期材料</div>
                              <div className="mt-1 text-xs text-slate-500">{row.materialFocus}</div>
                            </div>
                          )}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="font-medium text-slate-900">{formatDate(row.materialLockDate)}</div>
                          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${riskMeta.bgColor} ${riskMeta.textColor}`}>{riskMeta.label}</div>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="font-medium text-slate-900">{formatDate(row.techPackDueDate)}</div>
                          <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${techPackMeta.className}`}>{techPackMeta.label}</div>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="text-xs text-slate-500">开模 {formatDate(row.toolingStartDate)}</div>
                          <div className="mt-1 text-xs text-slate-500">试模 {formatDate(row.toolingTrialDate)}</div>
                          <div className="mt-1 text-xs text-slate-500">锁模 {formatDate(row.toolingFreezeDate)}</div>
                          <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toolingMeta.className}`}>{toolingMeta.label}</div>
                          {row.toolingNotes ? <div className="mt-2 text-xs text-slate-500">{row.toolingNotes}</div> : null}
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${phaseMeta.bgColor} ${phaseMeta.textColor}`}>{phaseMeta.label}</span>
                          <div className="mt-2 text-xs text-slate-500">评审重点：{row.reviewFocus}</div>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${costMeta.className}`}>{costMeta.label}</span>
                        </td>
                        <td className="border-t border-slate-100 px-4 py-4">
                          <div className="font-medium text-slate-900">{row.owner}</div>
                          <div className="mt-1 text-xs text-slate-500">下次评审：{formatDate(row.nextReviewDate)}</div>
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