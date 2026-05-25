'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { GateSlaData } from '@/lib/design-review-center/gate-derivations';

interface Props {
  data: GateSlaData;
}

function DeltaBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const good = inverse ? value < 0 : value > 0;
  const color = good ? 'text-emerald-600' : value === 0 ? 'text-slate-400' : 'text-rose-600';
  const sign = value > 0 ? '+' : '';
  return <span className={`text-xs font-semibold ${color}`}>{sign}{value} vs 上季</span>;
}

export default function GateSlaPanel({ data }: Props) {
  const trendOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 36, right: 12, top: 12, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: { axisValue: string; value: number }[]) => {
        const p = params[0];
        return `${p.axisValue}<br/>准时率: <strong>${p.value}%</strong>`;
      },
    },
    xAxis: {
      type: 'category',
      data: data.trendWeeks,
      axisLabel: { color: '#64748b', fontSize: 10 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        data: data.trendPassRates,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#0ea5e9', width: 2 },
        itemStyle: { color: '#0ea5e9' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(14,165,233,0.18)' },
              { offset: 1, color: 'rgba(14,165,233,0.02)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 },
          label: { show: true, formatter: '80%', color: '#f59e0b', fontSize: 10 },
          data: [{ yAxis: 80 }],
        },
      },
    ],
  }), [data]);

  const barOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 56, right: 48, top: 8, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: { axisValue: string; value: number }[]) => {
        const p = params[0];
        return `${p.axisValue}: 平均逾期 <strong>${p.value}天</strong>`;
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: data.byGroup.map((g) => g.groupName),
      inverse: true,
      axisLabel: { color: '#475569', fontSize: 11 },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: data.byGroup.map((g) => ({
          value: g.avgDelayDays,
          itemStyle: {
            color:
              g.avgDelayDays === 0
                ? '#10b981'
                : g.avgDelayDays <= 5
                  ? '#f59e0b'
                  : '#ef4444',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          color: '#64748b',
          fontSize: 10,
          formatter: (p: { value: number }) => (p.value > 0 ? `${p.value}d` : '准时'),
        },
        barMaxWidth: 18,
      },
    ],
  }), [data]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Card 1: Key metrics */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          节点 SLA 概览
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-black tabular-nums text-slate-900">
              {data.avgOverdueDays}
              <span className="ml-1 text-base font-normal text-slate-400">天</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">平均逾期天数</div>
            <div className="mt-1">
              <DeltaBadge value={data.deltaDaysVsLastSeason} inverse />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tabular-nums text-slate-900">
              {data.onTimeRate}
              <span className="ml-1 text-base font-normal text-slate-400">%</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">准时通过率</div>
            <div className="mt-1">
              <DeltaBadge value={data.deltaRateVsLastSeason} />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {data.byGroup.slice(0, 3).map((g) => (
            <div key={g.gateGroup} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{g.groupName}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${g.onTimeRate >= 80 ? 'bg-emerald-500' : g.onTimeRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${g.onTimeRate}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs tabular-nums text-slate-500">
                  {g.onTimeRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: By group bar chart */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          各类节点平均逾期（天）
        </div>
        <ReactECharts
          option={barOption}
          style={{ height: 160 }}
          opts={{ renderer: 'canvas' }}
        />
        <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs text-slate-500">
          <div>
            <span className="block text-base font-bold text-slate-700">
              {data.byGroup.reduce((s, g) => s + g.count, 0)}
            </span>
            总节点数
          </div>
          <div>
            <span className="block text-base font-bold text-emerald-600">
              {data.byGroup.reduce((s, g) => s + g.onTimeCount, 0)}
            </span>
            准时完成
          </div>
          <div>
            <span className="block text-base font-bold text-rose-600">
              {data.byGroup.filter((g) => g.avgDelayDays > 0).length}
            </span>
            逾期分类
          </div>
        </div>
      </div>

      {/* Card 3: Trend line */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          近 6 周节点准时率趋势
        </div>
        <ReactECharts
          option={trendOption}
          style={{ height: 160 }}
          opts={{ renderer: 'canvas' }}
        />
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="inline-block h-0.5 w-4 bg-amber-500" />
          80% 目标线
          <span className="ml-2 inline-block h-0.5 w-4 bg-sky-500" />
          实际准时率
        </div>
      </div>
    </div>
  );
}
