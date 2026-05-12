'use client';
/**
 * IndustryBenchmark.tsx — 行业对标雷达图
 * 用于S10 DuPont分析中的行业对标视角
 */
import { useRef, useEffect, useCallback } from 'react';
import benchRaw from '../../../data/planning/pnl_industry_benchmark.json';

type BenchData = typeof benchRaw;
const bData = benchRaw as BenchData;

type ECharts = { setOption: (o: object) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => ECharts };

export default function IndustryBenchmark() {
  const ref = useRef<HTMLDivElement>(null);

  const buildOption = useCallback(() => {
    const indicators = bData.kpiList.map(k => ({
      name: k.label,
      max: k.format === 'pct' ? 0.65 : k.format === 'times' ? 6 : 0.25,
    }));

    const series = bData.companies.map(co => ({
      name: co.label,
      value: bData.kpiList.map(k => (co as unknown as Record<string, number>)[k.key]),
      lineStyle: { color: co.color, width: (co as { isSelf?: boolean }).isSelf ? 2 : 1 },
      itemStyle: { color: co.color },
      areaStyle: { color: co.color, opacity: (co as { isSelf?: boolean }).isSelf ? 0.15 : 0 },
    }));

    return {
      tooltip: { trigger: 'item' },
      legend: { data: bData.companies.map(c => c.label), textStyle: { fontSize: 10 }, bottom: 0 },
      radar: {
        indicator: indicators,
        radius: '60%',
        axisName: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        splitArea: { areaStyle: { color: ['#f8fafc', '#ffffff'] } },
      },
      series: [{ type: 'radar', data: series }],
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

  return (
    <div className="space-y-2">
      <div ref={ref} style={{ height: 280 }} />
      <div className="text-[10px] text-slate-400 text-center">{bData.source}</div>
    </div>
  );
}
