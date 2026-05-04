'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEVELOPMENT_LEVEL_LABELS } from '@/config/design-review-center/labels';
import { EXECUTION_STATUS_MAP, REVIEW_CONCLUSION_MAP, RISK_LEVEL_MAP, STAGE_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { StyleTaskRow } from '@/lib/design-review-center/types';

interface DesignItemTableProps {
  rows: StyleTaskRow[];
}

type SortKey = 'dueDate' | 'nextReviewDate';
type SortOrder = 'asc' | 'desc';

function compareDateValue(aValue?: string | null, bValue?: string | null, sortOrder: SortOrder = 'asc') {
  const aTime = aValue ? new Date(aValue).getTime() : Number.POSITIVE_INFINITY;
  const bTime = bValue ? new Date(bValue).getTime() : Number.POSITIVE_INFINITY;
  return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
}

function SortButton({
  active,
  direction,
  label,
  onClick,
}: {
  active: boolean;
  direction: SortOrder;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900">
      {label}
      {active ? <span>{direction === 'asc' ? '↑' : '↓'}</span> : null}
    </button>
  );
}

export default function DesignItemTable({ rows }: DesignItemTableProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => compareDateValue(a[sortBy], b[sortBy], sortOrder));
  }, [rows, sortBy, sortOrder]);

  const triggerSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(key);
    setSortOrder('asc');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1480px] w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="p-4">款号</th>
              <th className="p-4">系列 / 品类</th>
              <th className="p-4">波段</th>
              <th className="p-4">开发角色</th>
              <th className="p-4">开发级别</th>
              <th className="p-4">当前阶段</th>
              <th className="p-4">设计 / 样鞋 / 材料</th>
              <th className="p-4">成本 / 技术</th>
              <th className="p-4">风险</th>
              <th className="p-4">负责人</th>
              <th className="p-4">下步动作</th>
              <th className="p-4">
                <SortButton active={sortBy === 'nextReviewDate'} direction={sortOrder} label="下次评审" onClick={() => triggerSort('nextReviewDate')} />
              </th>
              <th className="p-4">
                <SortButton active={sortBy === 'dueDate'} direction={sortOrder} label="截止时间" onClick={() => triggerSort('dueDate')} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-sm text-slate-400">
                  当前筛选条件下没有单款任务记录。
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const stageMeta = STAGE_MAP[row.currentStage];
                const riskMeta = RISK_LEVEL_MAP[row.riskLevel];
                const designMeta = EXECUTION_STATUS_MAP[row.designStatus];
                const sampleMeta = EXECUTION_STATUS_MAP[row.sampleStatus];
                const materialMeta = EXECUTION_STATUS_MAP[row.materialStatus];
                const costMeta = EXECUTION_STATUS_MAP[row.costStatus];
                const technicalMeta = EXECUTION_STATUS_MAP[row.technicalStatus];
                const latestReviewMeta = row.latestReview ? REVIEW_CONCLUSION_MAP[row.latestReview.conclusion] : null;

                return (
                  <tr
                    key={row.styleId}
                    className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50"
                    onClick={() => router.push(`/design-review-center/item/${row.styleId}`)}
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{row.skuCode}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.styleName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{row.seriesName}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.categoryName}</div>
                      {row.architectureSource ? (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.architectureSource.themeColorHex }} />
                          <span>架构 {row.architectureSource.styleTarget} 款 / SKU {row.architectureSource.skuTarget}</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="p-4 text-slate-600">{row.waveId.toUpperCase()}</td>
                    <td className="p-4 text-slate-600">{row.developmentRole}</td>
                    <td className="p-4 text-slate-600">
                      <div>{DEVELOPMENT_LEVEL_LABELS[row.developmentLevel]}</div>
                      {row.architectureSource ? <div className="mt-1 text-xs text-slate-400">预算占比 {Math.round(row.architectureSource.budgetShare * 100)}%</div> : null}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageMeta.bgColor} ${stageMeta.textColor}`}>{stageMeta.label}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 ${designMeta.bgColor} ${designMeta.textColor}`}>设计 {designMeta.label}</span>
                        <span className={`rounded-full px-2.5 py-1 ${sampleMeta.bgColor} ${sampleMeta.textColor}`}>样鞋 {sampleMeta.label}</span>
                        <span className={`rounded-full px-2.5 py-1 ${materialMeta.bgColor} ${materialMeta.textColor}`}>材料 {materialMeta.label}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 ${costMeta.bgColor} ${costMeta.textColor}`}>成本 {costMeta.label}</span>
                        <span className={`rounded-full px-2.5 py-1 ${technicalMeta.bgColor} ${technicalMeta.textColor}`}>技术 {technicalMeta.label}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskMeta.bgColor} ${riskMeta.textColor}`}>{riskMeta.label}</span>
                        {row.blocked ? <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">阻塞</span> : null}
                        {latestReviewMeta ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${latestReviewMeta.bgColor} ${latestReviewMeta.textColor}`}>{latestReviewMeta.label}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{row.owner}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{row.nextAction}</div>
                      {row.nextGate ? <div className="mt-1 text-xs text-slate-500">下一 Gate：{row.nextGate.gateName}</div> : null}
                      {row.architectureSource ? <div className="mt-1 text-xs text-slate-400">架构来源：{row.architectureSource.platformSummary}</div> : null}
                    </td>
                    <td className="p-4 text-xs text-slate-500">{formatDate(row.nextReviewDate)}</td>
                    <td className="p-4 text-xs text-slate-500">
                      <div>{formatDate(row.dueDate)}</div>
                      {row.overdue ? (
                        <div className="mt-1 font-semibold text-rose-600">已逾期</div>
                      ) : row.dueThisWeek ? (
                        <div className="mt-1 font-semibold text-amber-600">本周推进</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
