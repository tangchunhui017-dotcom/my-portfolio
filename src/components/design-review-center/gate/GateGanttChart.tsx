'use client';

import { useMemo, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { GateGanttItem } from '@/lib/design-review-center/gate-derivations';

type GanttView = 'wave' | 'owner' | 'risk';

interface Props {
  items: GateGanttItem[];
  referenceDate: string;
  onGateClick?: (gateId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  done: '#10b981',
  inprogress: '#0ea5e9',
  dueSoon: '#f59e0b',
  overdue: '#f87171',
  blocked: '#dc2626',
  pending: '#94a3b8',
};

const STATUS_LABEL: Record<string, string> = {
  done: '已完成',
  inprogress: '进行中',
  dueSoon: '本周到期',
  overdue: '逾期',
  blocked: '阻塞',
  pending: '待启动',
};

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const STATUS_SORT: Record<string, number> = { blocked: 0, overdue: 1, dueSoon: 2, inprogress: 3, pending: 4, done: 5 };

export default function GateGanttChart({ items, referenceDate, onGateClick }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [ganttView, setGanttView] = useState<GanttView>('wave');

  const displayItems = useMemo((): GateGanttItem[] => {
    const critical = items.filter(
      (i) =>
        i.isCriticalPath ||
        i.status === 'blocked' ||
        i.status === 'overdue' ||
        i.status === 'dueSoon' ||
        i.launchImpact,
    );
    let filtered = showAll ? [...items] : critical.length > 0 ? [...critical] : [...items];
    if (ganttView === 'owner') {
      filtered = [...filtered].sort((a, b) => {
        if (a.owner !== b.owner) return a.owner.localeCompare(b.owner);
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      });
    } else if (ganttView === 'risk') {
      filtered = [...filtered].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 9;
        const pb = PRIORITY_ORDER[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9);
      });
    }
    return filtered;
  }, [items, showAll, ganttView]);

  const option = useMemo(() => {
    if (displayItems.length === 0) return { series: [] };

    const categories = displayItems.map((i) => {
      if (ganttView === 'owner') return `${i.owner.slice(0, 4)} / ${i.gateShortName} / ${i.waveName}`;
      if (ganttView === 'risk') return `[${i.priority}] ${i.gateShortName} / ${i.owner}`;
      return `${i.waveName} / ${i.gateGroupName} / ${i.gateShortName} / ${i.owner}`;
    });

    const allMs = displayItems.flatMap((i) => [
      new Date(i.planStart).getTime(),
      new Date(i.planEnd).getTime(),
    ]);
    const minMs = Math.min(...allMs) - 3 * 86400000;
    const maxMs = Math.max(...allMs) + 3 * 86400000;
    const refMs = new Date(referenceDate).getTime();

    // slots: 0=idx,1=startMs,2=endMs,3=status,4=isCritical,5=gateName,6=waveName,7=styleName,8=owner,9=delayDays,10=launchImpact,11=impactScope,12=closeCriteria,13=nextAction,14=dueInDays
    const seriesData = displayItems.map((item, idx) => ({
      value: [
        idx,
        new Date(item.planStart).getTime(),
        new Date(item.planEnd).getTime(),
        item.status,
        item.isCriticalPath ? 1 : 0,
        item.gateName,
        item.waveName,
        item.styleName,
        item.owner,
        item.delayDays,
        item.launchImpact ? 1 : 0,
        item.impactScope.join('/'),
        item.closeCriteria,
        item.nextAction,
        item.dueInDays,
      ],
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 12 },
        formatter: (p: { data: { value: (string | number)[] } }) => {
          const v = p.data.value;
          const start = new Date(Number(v[1])).toISOString().slice(0, 10);
          const end = new Date(Number(v[2])).toISOString().slice(0, 10);
          const statusLabel = STATUS_LABEL[String(v[3])] ?? String(v[3]);
          const critical = v[4] === 1 ? '<br/>⚡ 关键路径' : '';
          const launchTag = v[10] === 1 ? '<br/>🔴 影响上市' : '';
          const delay = Number(v[9]) > 0 ? `<br/>逾期: <b>${v[9]} 天</b>` : '';
          const due = Number(v[14]) >= 0 ? `<br/>距截止: ${v[14]} 天` : '';
          return `<strong>${v[5]}</strong><br/>款式: ${v[7]}<br/>波段: ${v[6]}<br/>责任人: ${v[8]}<br/>计划: ${start} → ${end}<br/>状态: ${statusLabel}${delay}${due}<br/>影响范围: ${v[11]}<br/>关闭标准: ${v[12]}<br/>下一动作: ${v[13]}${critical}${launchTag}`;
        },
      },
      grid: { left: 210, right: 34, top: 8, bottom: 30, containLabel: false },
      xAxis: {
        type: 'time',
        min: minMs,
        max: maxMs,
        axisLabel: {
          formatter: (val: number) => {
            const d = new Date(val);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          },
          color: '#71717a',
          fontSize: 10,
        },
        splitLine: { show: true, lineStyle: { color: '#e2e8f0', type: 'dashed' } },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisTick: { lineStyle: { color: '#cbd5e1' } },
      },
      yAxis: {
        type: 'category',
        data: categories,
        inverse: false,
        axisLabel: { color: '#475569', fontSize: 10, width: 198, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'custom',
          renderItem: (
            _params: unknown,
            api: {
              value: (idx: number) => number;
              coord: (val: [number, number]) => [number, number];
              size: (val: [number, number]) => [number, number];
            },
          ) => {
            const idx = api.value(0);
            const start = api.coord([api.value(1), idx]);
            const end = api.coord([api.value(2), idx]);
            const status = displayItems[idx]?.status ?? 'pending';
            const isCritical = displayItems[idx]?.isCriticalPath ?? false;
            const barH = api.size([0, 1])[1] * 0.55;
            const barW = Math.max(4, end[0] - start[0]);

            return {
              type: 'group',
              children: [
                {
                  type: 'rect',
                  shape: { x: start[0], y: start[1] - barH / 2, width: barW, height: barH, r: 3 },
                  style: {
                    fill: STATUS_COLORS[status] ?? '#52525b',
                    stroke: isCritical ? '#fbbf24' : 'none',
                    lineWidth: isCritical ? 2 : 0,
                    opacity: 0.82,
                  },
                },
              ],
            };
          },
          data: seriesData,
          encode: { x: [1, 2], y: 0 },
          z: 2,
        },
        {
          type: 'line',
          data: [],
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#fb923c', type: 'solid', width: 1.5 },
            label: { show: true, formatter: '今日', color: '#fb923c', fontSize: 10, position: 'insideStartTop' },
            data: [{ xAxis: refMs }],
          },
          markArea: {
            silent: true,
            itemStyle: { color: 'rgba(251, 146, 60, 0.08)' },
            label: { show: true, formatter: '本周窗口', color: '#fb923c', fontSize: 10 },
            data: [[{ xAxis: refMs }, { xAxis: refMs + 7 * 86400000 }]],
          },
        },
      ],
    };
  }, [displayItems, referenceDate, ganttView]);

  const handleClick = useCallback(
    (params: { dataIndex?: number }) => {
      if (params.dataIndex !== undefined && onGateClick) {
        const item = displayItems[params.dataIndex];
        if (item) onGateClick(item.gateId);
      }
    },
    [displayItems, onGateClick],
  );

  const criticalCount = items.filter(
    (i) =>
      i.isCriticalPath ||
      i.status === 'blocked' ||
      i.status === 'overdue' ||
      i.status === 'dueSoon' ||
      i.launchImpact,
  ).length;
  const blockedCount = items.filter((i) => i.status === 'blocked').length;
  const overdueCount = items.filter((i) => i.status === 'overdue').length;
  const dueSoonCount = items.filter((i) => i.status === 'dueSoon').length;
  const launchImpactCount = items.filter((i) => i.launchImpact && i.status !== 'done').length;

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        暂无节点数据
      </div>
    );
  }

  const VIEWS: { key: GanttView; label: string }[] = [
    { key: 'wave', label: '按波段' },
    { key: 'owner', label: '按责任人' },
    { key: 'risk', label: '按风险' },
  ];

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        {[
          { label: '关键节点', value: criticalCount, cls: 'border-slate-200 bg-slate-50 text-slate-800' },
          { label: '阻塞', value: blockedCount, cls: 'border-rose-200 bg-rose-50 text-rose-700' },
          { label: '已逾期', value: overdueCount, cls: 'border-red-200 bg-red-50 text-red-700' },
          { label: '本周到期', value: dueSoonCount, cls: 'border-amber-200 bg-amber-50 text-amber-700' },
          { label: '影响上市', value: launchImpactCount, cls: 'border-orange-200 bg-orange-50 text-orange-700' },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border px-3 py-2 ${item.cls}`}>
            <div className="text-xl font-black tabular-nums">{item.value}</div>
            <div className="text-[11px] text-slate-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setGanttView(v.key)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                ganttView === v.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {showAll ? (
            <>
              仅关键{' '}
              <span className="rounded-full bg-amber-100 px-1.5 text-amber-700">{criticalCount}</span>
            </>
          ) : (
            <>
              显示全部{' '}
              <span className="text-slate-400">{items.length}</span>
            </>
          )}
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
        {Object.entries(STATUS_LABEL).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-5 rounded-sm border-2 border-amber-400 bg-white" />
          关键路径
        </span>
      </div>
      <ReactECharts
        option={option}
        style={{ height: Math.max(240, displayItems.length * 26 + 56) }}
        opts={{ renderer: 'canvas' }}
        onEvents={{ click: handleClick }}
      />
    </div>
  );
}
