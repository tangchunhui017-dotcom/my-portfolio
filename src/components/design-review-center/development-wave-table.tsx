'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { GATE_GROUP_LABELS, GATE_TYPE_LABELS } from '@/config/design-review-center/labels';
import { RISK_LEVEL_MAP, STAGE_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { GateGroup } from '@/lib/design-review-center/types';
import type { GateWaveGroup } from '@/lib/design-review-center/selectors/gates';

interface DevelopmentWaveTableProps {
  groups: GateWaveGroup[];
}

type GateFilter = 'all' | GateGroup;

function getGateStatusMeta(completed: boolean, delayed: boolean, blocked: boolean) {
  if (blocked) return { label: '阻塞', className: 'bg-rose-100 text-rose-700' };
  if (delayed) return { label: '延期', className: 'bg-amber-100 text-amber-700' };
  if (completed) return { label: '已完成', className: 'bg-emerald-100 text-emerald-700' };
  return { label: '进行中', className: 'bg-sky-100 text-sky-700' };
}

function filterLabel(filter: GateFilter) {
  return filter === 'all' ? '全部 Gate' : GATE_GROUP_LABELS[filter];
}

export default function DevelopmentWaveTable({ groups }: DevelopmentWaveTableProps) {
  const [gateFilter, setGateFilter] = useState<GateFilter>('all');

  const visibleGroups = useMemo(() => {
    return groups
      .map((group) => ({
        ...group,
        rows: gateFilter === 'all' ? group.rows : group.rows.filter((row) => row.gateGroup === gateFilter),
      }))
      .filter((group) => group.rows.length > 0);
  }, [gateFilter, groups]);

  const allRows = visibleGroups.flatMap((group) => group.rows);

  if (!groups.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无 Gate 节点。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Gate Control</div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">按波段和 Gate 分类统一管理研发推进</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              从企划前置、设计节点、技术开发、成本采购到上市承接，把单款推进节奏收敛到同一张 Gate 管理表里。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">Gate 总数</div><div className="mt-2 text-2xl font-semibold text-slate-950">{allRows.length}</div></div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">已完成</div><div className="mt-2 text-2xl font-semibold text-emerald-600">{allRows.filter((row) => row.completed).length}</div></div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">延期</div><div className="mt-2 text-2xl font-semibold text-amber-600">{allRows.filter((row) => row.delayed).length}</div></div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-400">阻塞</div><div className="mt-2 text-2xl font-semibold text-rose-600">{allRows.filter((row) => row.blocked).length}</div></div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(['all', 'planning', 'design', 'development', 'cost', 'launch'] as GateFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setGateFilter(filter)}
              className={[
                'rounded-full border px-4 py-2 text-sm font-semibold transition',
                gateFilter === filter ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
              ].join(' ')}
            >
              {filterLabel(filter)}
            </button>
          ))}
        </div>
      </section>

      {visibleGroups.map((group) => (
        <section key={group.waveId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{group.waveId.toUpperCase()}</div>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{group.waveName}</h3>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-white px-3 py-1">Gate {group.rows.length}</span>
                <span className="rounded-full bg-white px-3 py-1">延期 {group.rows.filter((row) => row.delayed).length}</span>
                <span className="rounded-full bg-white px-3 py-1">阻塞 {group.rows.filter((row) => row.blocked).length}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1360px] w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3">节点名称</th>
                  <th className="border-b border-slate-200 px-4 py-3">Gate 类型</th>
                  <th className="border-b border-slate-200 px-4 py-3">单款</th>
                  <th className="border-b border-slate-200 px-4 py-3">系列 / 品类</th>
                  <th className="border-b border-slate-200 px-4 py-3">计划 / 实际</th>
                  <th className="border-b border-slate-200 px-4 py-3">状态</th>
                  <th className="border-b border-slate-200 px-4 py-3">责任人</th>
                  <th className="border-b border-slate-200 px-4 py-3">影响波段</th>
                  <th className="border-b border-slate-200 px-4 py-3">备注</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => {
                  const gateStatus = getGateStatusMeta(row.completed, row.delayed, row.blocked);
                  const stageMeta = STAGE_MAP[row.currentStage];
                  const riskMeta = RISK_LEVEL_MAP[row.riskLevel];

                  return (
                    <tr key={row.gateId} className="align-top text-slate-700">
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="font-semibold text-slate-900">{row.gateName}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{GATE_GROUP_LABELS[row.gateGroup]}</span>
                          <span className={`rounded-full px-3 py-1 ${gateStatus.className}`}>{gateStatus.label}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">{GATE_TYPE_LABELS[row.gateType]}</td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <Link href={`/design-review-center/item/${row.styleId}`} className="font-medium text-slate-900 hover:text-slate-700">
                          {row.skuCode}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">{row.styleName}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="font-medium text-slate-900">{row.seriesName}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.categoryName}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="text-slate-900">计划 {formatDate(row.plannedDate)}</div>
                        <div className="mt-1 text-xs text-slate-500">实际 {formatDate(row.actualDate)}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageMeta.bgColor} ${stageMeta.textColor}`}>{stageMeta.label}</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskMeta.bgColor} ${riskMeta.textColor}`}>{riskMeta.label}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">{row.owner}</td>
                      <td className="border-b border-slate-100 px-4 py-4">{row.impactWave}</td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm leading-6 text-slate-600">{row.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
