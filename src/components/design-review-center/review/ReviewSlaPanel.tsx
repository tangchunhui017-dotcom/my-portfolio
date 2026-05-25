'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ReviewDecisionRow } from '@/lib/design-review-center/selectors/reviews';
import { buildSlaMetrics } from '@/lib/design-review-center/review-decision-derivations';

interface ReviewSlaPanelProps {
  reviews: ReviewDecisionRow[];
}

export default function ReviewSlaPanel({ reviews }: ReviewSlaPanelProps) {
  const sla = useMemo(() => buildSlaMetrics(reviews), [reviews]);

  const rateColor = sla.slaRate >= 80 ? '#059669' : sla.slaRate >= 60 ? '#d97706' : '#dc2626';

  const ringOption = {
    series: [
      {
        type: 'pie',
        radius: ['58%', '82%'],
        center: ['50%', '52%'],
        data: [
          { value: sla.slaRate, name: '达标', itemStyle: { color: rateColor } },
          { value: 100 - sla.slaRate, name: '未达标', itemStyle: { color: '#f1f5f9' } },
        ],
        label: {
          show: true,
          position: 'center',
          formatter: `${sla.slaRate}%`,
          fontSize: 22,
          fontWeight: 'bold',
          color: rateColor,
        },
        emphasis: { scale: false },
        silent: true,
      },
    ],
  };

  const barOption = {
    grid: { left: 4, right: 4, top: 8, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: sla.weeklyBuckets.map((b) => b.weekLabel),
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f8fafc' } },
      axisLabel: { fontSize: 10, color: '#94a3b8' },
    },
    tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 10, color: '#94a3b8' },
      data: ['总评审', '通过', '逾期'],
    },
    series: [
      {
        name: '总评审',
        type: 'bar',
        barWidth: 10,
        data: sla.weeklyBuckets.map((b) => b.total),
        itemStyle: { color: '#e2e8f0', borderRadius: [2, 2, 0, 0] },
      },
      {
        name: '通过',
        type: 'bar',
        barWidth: 10,
        data: sla.weeklyBuckets.map((b) => b.passed),
        itemStyle: { color: '#34d399', borderRadius: [2, 2, 0, 0] },
      },
      {
        name: '逾期',
        type: 'line',
        smooth: true,
        data: sla.weeklyBuckets.map((b) => b.overdue),
        lineStyle: { color: '#f87171', width: 2 },
        itemStyle: { color: '#f87171' },
        symbol: 'circle',
        symbolSize: 5,
      },
    ],
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {/* Card 1: 平均决议时长 */}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">平均决议时长</div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={[
            'text-5xl font-black tabular-nums',
            sla.avgSlaDays <= 7 ? 'text-emerald-600' : sla.avgSlaDays <= 14 ? 'text-amber-600' : 'text-rose-600',
          ].join(' ')}>
            {sla.avgSlaDays}
          </span>
          <span className="text-sm text-slate-500">天</span>
          <span className="ml-auto text-xs text-slate-400">目标 ≤7 天</span>
        </div>
        <div className="mt-1 text-xs text-slate-400">评审日 → 截止日窗口均值</div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">按时完成</span>
            <span className={['font-semibold', sla.slaCompliantCount === sla.slaTotal ? 'text-emerald-600' : 'text-slate-700'].join(' ')}>
              {sla.slaCompliantCount} / {sla.slaTotal} 条
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={[
                'h-full rounded-full transition-all',
                sla.slaRate >= 80 ? 'bg-emerald-400' : sla.slaRate >= 60 ? 'bg-amber-400' : 'bg-rose-400',
              ].join(' ')}
              style={{ width: `${sla.slaRate}%` }}
            />
          </div>
          <div className="text-right text-[11px] text-slate-400">
            {sla.slaTotal - sla.slaCompliantCount} 条逾期
          </div>
        </div>
      </article>

      {/* Card 2: SLA 达标率环形图 */}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SLA 达标率（≤7 天窗口）</div>
        <ReactECharts option={ringOption} style={{ height: 140 }} notMerge />
        <div className="mt-1 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-emerald-400" />
            达标 {sla.slaCompliantCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-rose-400" />
            逾期 {sla.slaTotal - sla.slaCompliantCount}
          </span>
        </div>
      </article>

      {/* Card 3: 近8周趋势 */}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">近 8 周评审趋势</div>
        {sla.weeklyBuckets.length > 0 ? (
          <ReactECharts option={barOption} style={{ height: 180 }} notMerge />
        ) : (
          <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">
            暂无趋势数据
          </div>
        )}
      </article>
    </div>
  );
}
