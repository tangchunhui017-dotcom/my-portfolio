'use client';
/**
 * RollingForecastChart.tsx — S5 升级版月度趋势+滚动12月预测
 * 历史实线 + 未来虚线 + 置信区间
 */
import { useRef, useEffect, useCallback } from 'react';
import forecastRaw from '../../../data/planning/pnl_rolling_forecast.json';

type ForecastData = typeof forecastRaw;
const fData = forecastRaw as ForecastData;

type ECharts = { setOption: (o: object) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => ECharts };

function fmtM(v: number) {
  const a = Math.abs(v); const s = v < 0 ? '-' : '';
  if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
  return s + '¥' + v;
}

export default function RollingForecastChart() {
  const ref = useRef<HTMLDivElement>(null);

  const buildOption = useCallback(() => {
    const months = [...fData.history.map(h => h.month), ...fData.forecast.map(f => f.month)];
    const histRevenue = months.map(m => {
      const h = fData.history.find(x => x.month === m);
      return h ? h.netRevenue : null;
    });
    const fcstRevenue = months.map(m => {
      const f = fData.forecast.find(x => x.month === m);
      return f ? f.netRevenue : null;
    });
    const upper = months.map(m => {
      const f = fData.forecast.find(x => x.month === m);
      return f ? f.upper : null;
    });
    const lower = months.map(m => {
      const f = fData.forecast.find(x => x.month === m);
      return f ? f.lower : null;
    });
    const histGM = months.map(m => {
      const h = fData.history.find(x => x.month === m);
      return h ? h.grossMarginRate : null;
    });
    const fcstGM = months.map(m => {
      const f = fData.forecast.find(x => x.month === m);
      return f ? f.grossMarginRate : null;
    });

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['历史净收入','预测净收入','历史毛利率','预测毛利率'], textStyle: { fontSize: 10 }, top: 4, right: 8 },
      grid: { left: 65, right: 65, top: 40, bottom: 28 },
      xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: 'value', name: '净收入', axisLabel: { formatter: (v: number) => fmtM(v), fontSize: 9 } },
        { type: 'value', name: '利润率', min: 0, max: 0.7, axisLabel: { formatter: (v: number) => (v * 100).toFixed(0) + '%', fontSize: 9 } },
      ],
      series: [
        { name: '历史净收入', type: 'bar', data: histRevenue, barMaxWidth: 22, itemStyle: { color: '#94a3b8' },
          label: { show: false } },
        { name: '预测净收入', type: 'bar', data: fcstRevenue, barMaxWidth: 22, itemStyle: { color: '#38bdf8', opacity: 0.65 },
          label: { show: false } },
        { name: '置信区间-上', type: 'line', data: upper, lineStyle: { opacity: 0 }, symbol: 'none', stack: 'confidence', silent: true },
        { name: '置信区间-下', type: 'line', data: lower, lineStyle: { opacity: 0 }, symbol: 'none', stack: 'confidence',
          areaStyle: { color: '#bae6fd', opacity: 0.3 }, silent: true },
        { name: '历史毛利率', type: 'line', yAxisIndex: 1, data: histGM,
          lineStyle: { color: '#10b981', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#10b981' } },
        { name: '预测毛利率', type: 'line', yAxisIndex: 1, data: fcstGM,
          lineStyle: { color: '#10b981', width: 2, type: 'dashed' }, symbol: 'emptyCircle', symbolSize: 4, itemStyle: { color: '#10b981' } },
      ],
    };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    let chart: ECharts | null = null;
    const init = async () => {
      const ec = (await import('echarts')) as unknown as EChartsLib;
      if (!ref.current) return;
      chart = ec.init(ref.current);
      chart.setOption(buildOption());
    };
    init();
    const obs = new ResizeObserver(() => chart?.resize());
    if (ref.current) obs.observe(ref.current);
    return () => { obs.disconnect(); chart?.dispose(); };
  }, [buildOption]);

  const af = fData.annualForecast;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
          <div className="text-[10px] text-slate-400 mb-0.5">全年预测净收入</div>
          <div className="text-sm font-black text-slate-800">¥{(af.totalNetRevenue / 1e4).toFixed(0)}万</div>
        </div>
        <div className={`rounded-xl px-3 py-2.5 text-center ${af.vsLastYear >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <div className="text-[10px] text-slate-400 mb-0.5">vs 去年</div>
          <div className={`text-sm font-black ${af.vsLastYear >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {af.vsLastYear >= 0 ? '+' : ''}{(af.vsLastYear * 100).toFixed(1)}%
          </div>
        </div>
        <div className={`rounded-xl px-3 py-2.5 text-center ${af.vsBudget >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <div className="text-[10px] text-slate-400 mb-0.5">vs 预算</div>
          <div className={`text-sm font-black ${af.vsBudget >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {af.vsBudget >= 0 ? '+' : ''}{(af.vsBudget * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-sky-50 rounded-xl px-3 py-2.5 text-center">
          <div className="text-[10px] text-slate-400 mb-0.5">预测净利率</div>
          <div className="text-sm font-black text-sky-700">{(af.netProfitRate * 100).toFixed(1)}%</div>
        </div>
      </div>
      <div ref={ref} style={{ height: 260 }} />
      <div className="flex gap-4 text-[10px] text-slate-400 px-1">
        <span>■ 灰色柱 实际历史</span>
        <span>■ 蓝色柱 预测（含置信区间）</span>
        <span>── 实线 历史毛利率 · 虚线 预测毛利率</span>
      </div>
    </div>
  );
}
