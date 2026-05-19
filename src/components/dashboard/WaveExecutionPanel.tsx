'use client';

import { useSyncExternalStore } from 'react';
import ReactECharts from 'echarts-for-react';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { useMonthlyAchievementData } from '@/hooks/useMonthlyAchievementData';
import { useWavePlanning } from '@/hooks/useWavePlanning';
import { formatMoneyCny } from '@/config/numberFormat';
import {
    CHART_INK, CHART_TEXT_MUTED, CHART_TEXT_FAINT,
    CHART_LINE_DASHED, CHART_HIGHLIGHT_LIGHT,
} from '@/config/chartTheme';
import ChartCard from '@/components/charts/ChartCard';

const fmtAmt = (v: number) => formatMoneyCny(v);
const fmtAxisAmt = (v: number) => `${Math.round(v / 10000)}万`;

type TooltipParam = {
  axisValue?: string | number;
  marker?: string;
  value?: string | number | null;
};

const toTooltipParams = (params: unknown): TooltipParam[] => {
  if (Array.isArray(params)) return params as TooltipParam[];
  return params ? [params as TooltipParam] : [];
};

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
  onJumpToPlanning?: () => void;
};

export default function WaveExecutionPanel({ filters, compareMode, onJumpToPlanning }: Props) {
  const { newProductRampData } = useMonthlyAchievementData(filters, compareMode);
  const { waveSummaries } = useWavePlanning(filters);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // 波段上新完成率（sku_actual / sku_plan 均值）
  const validWaves = waveSummaries.filter((w) => w.sku_plan > 0);
  const waveCompletionRate =
    validWaves.length > 0
      ? validWaves.reduce((acc, w) => acc + w.sku_actual / w.sku_plan, 0) / validWaves.length
      : null;

  const completionTone =
    waveCompletionRate === null
      ? 'slate'
      : waveCompletionRate >= 0.9
      ? 'green'
      : waveCompletionRate >= 0.7
      ? 'amber'
      : 'red';

  const toneStyle = {
    green: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-400', label: '上新达标' },
    amber: { badge: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-400',   label: '上新偏缓' },
    red:   { badge: 'bg-rose-50 text-rose-700 ring-rose-200',           dot: 'bg-rose-500',    label: '上新滞后' },
    slate: { badge: 'bg-slate-50 text-slate-500 ring-slate-200',        dot: 'bg-slate-300',   label: '待数据'   },
  }[completionTone];

  const hasRampData = newProductRampData.length > 0;
  const hasWaveData = waveSummaries.length > 0;

  if (!hasRampData && !hasWaveData) return null;

  return (
    <div className="mt-6 rounded-section border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)] xl:p-7">
      <div className="flex flex-col gap-1 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Wave Execution</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">波段执行 · 新品起量</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            波段上新 SKU 完成率与新款上市后月度销售爬坡趋势。
          </p>
        </div>
        {onJumpToPlanning && (
          <button
            type="button"
            onClick={onJumpToPlanning}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/70 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 mt-2 xl:mt-0 self-start"
          >
            去波段企划
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_280px]">

        {/* 左：新品起量曲线 */}
        {hasRampData ? (
          <ChartCard
            title="新品起量曲线"
            subtitle="当年全新款从上市当月起按月净销售额走势；反映新品放量速度与承接健康度。"
            showMenu={false}
          >
            <div className="h-[240px]">
              {!mounted ? <ChartPlaceholder /> : (
                <ReactECharts
                  option={{
                    tooltip: {
                      trigger: 'axis',
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      textStyle: { color: '#fff', fontWeight: 600 },
                      padding: [12, 16],
                      borderRadius: 12,
                      formatter: (params: unknown) => {
                        const list = toTooltipParams(params);
                        const p0 = list[0];
                        const p1 = list[1];
                        const ramp = newProductRampData.find((d) => d.monthLabel === p0?.axisValue);
                        return [
                          p0?.axisValue ?? '',
                          p0 ? `${p0.marker ?? ''} 当月销售：${fmtAmt(Number(p0.value))}` : '',
                          p1 ? `${p1.marker ?? ''} 累计销售：${fmtAmt(Number(p1.value))}` : '',
                          ramp ? `涉及新品：${ramp.skuCount} 款` : '',
                        ].filter(Boolean).join('<br/>');
                      },
                    },
                    legend: { data: ['当月销售', '累计销售'], right: 0, top: 0, textStyle: { color: CHART_TEXT_MUTED, fontSize: 12 } },
                    grid: { top: 36, right: 16, bottom: 20, left: 16, containLabel: true },
                    xAxis: {
                      type: 'category',
                      data: newProductRampData.map((d) => d.monthLabel),
                      axisLine: { show: false },
                      axisTick: { show: false },
                      axisLabel: { color: CHART_TEXT_FAINT, fontSize: 11 },
                    },
                    yAxis: {
                      type: 'value',
                      splitLine: { lineStyle: { type: 'dashed', color: CHART_LINE_DASHED } },
                      axisLabel: { color: CHART_TEXT_FAINT, fontSize: 11, formatter: (v: number) => fmtAxisAmt(v) },
                    },
                    series: [
                      { name: '当月销售', type: 'bar', data: newProductRampData.map((d) => d.salesAmt), itemStyle: { color: CHART_HIGHLIGHT_LIGHT, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 36 },
                      { name: '累计销售', type: 'line', data: newProductRampData.map((d) => d.cumulativeAmt), lineStyle: { color: CHART_INK, width: 2 }, itemStyle: { color: CHART_INK }, symbol: 'circle', symbolSize: 6 },
                    ],
                  }}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              )}
            </div>
          </ChartCard>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 flex items-center justify-center text-sm text-slate-400">
            当前筛选下暂无新品销售数据
          </div>
        )}

        {/* 右：波段上新完成率 */}
        <div className="flex flex-col gap-4">
          {/* 总完成率 pill */}
          <div className={`rounded-panel p-5 ring-1 ring-inset ${toneStyle.badge} ${toneStyle.badge.replace('text-', 'ring-').replace('bg-', '')}`}>
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70">上新完成率</div>
            <div className="mt-2 text-4xl font-black tracking-tight">
              {waveCompletionRate !== null ? `${(waveCompletionRate * 100).toFixed(0)}%` : '--'}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
              <span className={`h-1.5 w-1.5 rounded-full ${toneStyle.dot}`} />
              {toneStyle.label}
            </div>
            <div className="mt-1 text-[11px] opacity-60">
              有效波段 {validWaves.length} 个 · SKU 计划 / 实际均值
            </div>
          </div>

          {/* 各波段明细 */}
          {hasWaveData && (
            <div className="rounded-panel border border-slate-100 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">波段明细</div>
              <div className="space-y-2.5">
                {waveSummaries.slice(0, 6).map((w) => {
                  const rate = w.sku_plan > 0 ? w.sku_actual / w.sku_plan : null;
                  const barColor = rate === null ? 'bg-slate-200' : rate >= 0.9 ? 'bg-emerald-400' : rate >= 0.7 ? 'bg-amber-400' : 'bg-rose-500';
                  const barWidth = rate !== null ? `${Math.min(rate * 100, 100).toFixed(0)}%` : '0%';
                  return (
                    <div key={w.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-slate-700 truncate max-w-[120px]">{w.wave}</span>
                        <span className="text-[11px] tabular-nums text-slate-500">
                          {w.sku_actual} / {w.sku_plan} 款
                          {rate !== null && <span className="ml-1 font-semibold">{(rate * 100).toFixed(0)}%</span>}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: barWidth }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
