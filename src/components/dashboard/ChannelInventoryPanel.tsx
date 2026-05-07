'use client';

import { useSyncExternalStore } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { useMonthlyAchievementData } from '@/hooks/useMonthlyAchievementData';

const fmtPct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const fmtSignedPct = (value: number, digits = 1) =>
  `${value > 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;

function ChartPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400">
      图表加载中
    </div>
  );
}

type Props = {
  filters: DashboardFilters;
  compareMode: CompareMode;
};

type TooltipParam = { axisValue?: string | number };

const toTooltipParams = (params: unknown): TooltipParam[] => {
  if (Array.isArray(params)) return params as TooltipParam[];
  return params ? [params as TooltipParam] : [];
};

export default function ChannelInventoryPanel({ filters, compareMode }: Props) {
  const { channelImbalanceRows } = useMonthlyAchievementData(filters, compareMode);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (channelImbalanceRows.length === 0) return null;

  return (
    <div className="rounded-panel border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
        渠道库存分布不均衡度
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        各渠道类型库存占比与销售占比对比。正值（红色）表示库存积压风险；负值（蓝色）表示断货风险。
      </p>

      <div className="mt-5 h-[220px]">
        {!mounted ? <ChartPlaceholder /> : (
          <ReactECharts option={{
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              borderColor: 'rgba(255,255,255,0.1)',
              textStyle: { color: '#fff', fontWeight: 600 },
              padding: [12, 16],
              borderRadius: 12,
              formatter: (params: unknown) => {
                const first = toTooltipParams(params)[0];
                const row = channelImbalanceRows.find((r) => r.channelType === first?.axisValue);
                if (!row) return '';
                return [
                  `${row.channelType}`,
                  `库存占比：${fmtPct(row.inventoryShare)}`,
                  `销售占比：${fmtPct(row.salesShare)}`,
                  `不均衡分差：${fmtSignedPct(row.imbalanceScore)}`,
                ].join('<br/>');
              },
            },
            grid: { top: 16, right: 24, bottom: 20, left: 24, containLabel: true },
            xAxis: {
              type: 'category',
              data: channelImbalanceRows.map((r) => r.channelType),
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: { color: '#94A3B8', fontSize: 12 },
            },
            yAxis: {
              type: 'value',
              splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } },
              axisLabel: { color: '#94A3B8', fontSize: 11, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
            },
            series: [{
              name: '不均衡分差',
              type: 'bar',
              barMaxWidth: 48,
              data: channelImbalanceRows.map((r) => ({
                value: r.imbalanceScore,
                itemStyle: {
                  color: r.imbalanceScore > 0
                    ? new echarts.graphic.LinearGradient(0, 1, 0, 0, [{ offset: 0, color: '#FCA5A5' }, { offset: 1, color: '#EF4444' }])
                    : new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#93C5FD' }, { offset: 1, color: '#3B82F6' }]),
                  borderRadius: r.imbalanceScore > 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
                },
              })),
              markLine: {
                symbol: 'none',
                label: { show: false },
                data: [{ yAxis: 0, lineStyle: { color: '#CBD5E1', type: 'solid', width: 1 } }],
              },
            }],
          }} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs text-slate-600">
          <thead>
            <tr className="border-b border-slate-100">
              {['渠道类型', '库存占比', '销售占比', '不均衡分差'].map((h) => (
                <th key={h} className="py-2 pr-4 text-right font-semibold text-slate-500 first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channelImbalanceRows.map((row) => (
              <tr key={row.channelType} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="py-1.5 pr-4 font-medium">{row.channelType}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{fmtPct(row.inventoryShare)}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{fmtPct(row.salesShare)}</td>
                <td className={`py-1.5 text-right tabular-nums font-semibold ${row.imbalanceScore > 0.05 ? 'text-rose-600' : row.imbalanceScore < -0.05 ? 'text-blue-600' : 'text-slate-600'}`}>
                  {fmtSignedPct(row.imbalanceScore)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
