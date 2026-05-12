'use client';
import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { ProfitBridge } from '@/types/pnlDecisionTypes';
import { fmtM } from '@/types/pnlDecisionTypes';

type EChartsLib = { init: (el: HTMLElement) => EChartInstance };
type EChartInstance = {
  setOption: (opt: object) => void;
  resize: () => void;
  dispose: () => void;
};

interface Props {
  bridge: ProfitBridge;
}

export default function PnlProfitBridge({ bridge }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { targetNetProfit, actualNetProfit, totalGap, factors } = bridge;
  const sorted = useMemo(() => [...factors].sort((a, b) => a.impact - b.impact), [factors]);

  const buildOption = useCallback(() => {
    const labels = sorted.map(f => f.label);
    const positiveData = sorted.map(f => f.impact > 0 ? f.impact : 0);
    const negativeData = sorted.map(f => f.impact < 0 ? Math.abs(f.impact) : 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ dataIndex: number; value: number; seriesName: string }>) => {
          const idx = params[0]?.dataIndex ?? 0;
          const f = sorted[idx];
          if (!f) return '';
          const sign = f.impact >= 0 ? '+' : '';
          return `<b>${f.label}</b><br/>影响: ${sign}${fmtM(f.impact)}<br/><span style="color:#94a3b8;font-size:10px">${f.description}</span>`;
        },
      },
      grid: { left: 16, right: 80, top: 20, bottom: 16, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => fmtM(v), fontSize: 9 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, width: 110, overflow: 'truncate' },
        axisTick: { show: false },
      },
      series: [
        {
          name: '负向因子',
          type: 'bar',
          stack: 'bridge',
          data: negativeData,
          itemStyle: { color: '#f43f5e', borderRadius: [4, 0, 0, 4] },
          label: {
            show: true, position: 'left', fontSize: 9,
            formatter: (p: { dataIndex: number }) => {
              const f = sorted[p.dataIndex]; return f && f.impact < 0 ? fmtM(f.impact) : '';
            },
            color: '#f43f5e',
          },
        },
        {
          name: '正向因子',
          type: 'bar',
          stack: 'bridge',
          data: positiveData,
          itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
          label: {
            show: true, position: 'right', fontSize: 9,
            formatter: (p: { dataIndex: number }) => {
              const f = sorted[p.dataIndex]; return f && f.impact > 0 ? '+' + fmtM(f.impact) : '';
            },
            color: '#10b981',
          },
        },
      ],
    };
  }, [sorted]);

  useEffect(() => {
    if (!ref.current) return;
    let chart: EChartInstance | null = null;
    const init = async () => {
      const ec = (await import('echarts')) as unknown as EChartsLib;
      if (!ref.current) return;
      chart = ec.init(ref.current);
      chart.setOption(buildOption() as object);
    };
    init();
    const obs = new ResizeObserver(() => chart?.resize());
    if (ref.current) obs.observe(ref.current);
    return () => { obs.disconnect(); chart?.dispose(); };
  }, [buildOption]);

  return (
    <div className="space-y-4">
      {/* 总览 */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">计划净利润</span>
          <span className="font-bold text-slate-800">{fmtM(targetNetProfit)}</span>
        </div>
        <div className="text-slate-300">→</div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">实际净利润</span>
          <span className="font-bold text-emerald-600">{fmtM(actualNetProfit)}</span>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold ${totalGap < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
          差异 {totalGap >= 0 ? '+' : ''}{fmtM(totalGap)}
        </div>
      </div>
      {/* 桥图 */}
      <div ref={ref} style={{ height: Math.max(220, factors.length * 44) }} />
      {/* 因子说明 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {factors.map(f => (
          <div key={f.key} className={`flex items-start gap-2 text-[11px] px-3 py-2 rounded-lg ${f.type === 'negative' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
            <span className={`font-bold shrink-0 ${f.type === 'negative' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {f.impact >= 0 ? '+' : ''}{fmtM(f.impact)}
            </span>
            <span className="text-slate-600">{f.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
