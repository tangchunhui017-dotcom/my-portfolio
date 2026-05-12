'use client';
/**
 * src/components/inventory/InvRiskMatrix.tsx
 * 风险矩阵 — ECharts散点图 X:售罄率 Y:WOS
 */
import { useEffect, useRef, useState } from 'react';
import type { InventoryRiskMatrixItem } from '@/types/inventoryHealthTypes';
import { RISK_COLORS, RISK_LABELS } from '@/types/inventoryHealthTypes';

interface Props {
  data: InventoryRiskMatrixItem[];
  onSelectItem?: (item: InventoryRiskMatrixItem) => void;
}

const DIM_OPTS = [
  { value: 'all', label: '全部' },
  { value: 'running', label: '跑鞋' },
  { value: 'casual', label: '休闲' },
  { value: 'outdoor', label: '户外' },
  { value: 'training', label: '训练' },
  { value: 'boots', label: '靴' },
];

export default function InvRiskMatrix({ data, onSelectItem }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<unknown>(null);
  const [dim, setDim] = useState('all');

  const filtered = dim === 'all' ? data : data.filter(d => d.category === dim);

  useEffect(() => {
    if (!chartRef.current) return;
    let cancelled = false;
    import('echarts').then(echarts => {
      if (cancelled || !chartRef.current) return;
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      const chart = chartInstance.current as ReturnType<typeof echarts.init>;

      const seriesData = filtered.map(d => ({
        name: d.name,
        value: [d.sellThroughRate, d.wos, d.inventoryCost],
        riskLevel: d.riskLevel,
        itemStyle: { color: RISK_COLORS[d.riskLevel] || '#94a3b8' },
        sourceItem: d,
      }));

      // 点击钻取
      chart.off('click');
      if (onSelectItem) {
        chart.on('click', (params) => {
          const src = (params as unknown as { data?: { sourceItem?: InventoryRiskMatrixItem } }).data?.sourceItem;
          if (src) onSelectItem(src);
        });
      }

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (p: { name: string; value: [number, number, number]; data: { riskLevel: string } }) =>
            `<b>${p.name}</b><br/>售罄率: ${(p.value[0] * 100).toFixed(0)}%<br/>WOS: ${p.value[1].toFixed(1)}W<br/>库存成本: ¥${(p.value[2] / 10000).toFixed(0)}万<br/>风险: ${RISK_LABELS[p.data.riskLevel] || p.data.riskLevel}`,
        },
        grid: { left: 50, right: 30, top: 30, bottom: 40 },
        xAxis: {
          name: '售罄率',
          nameLocation: 'end',
          type: 'value',
          min: 0, max: 1,
          axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
          splitLine: { lineStyle: { color: '#f0f0f0' } },
          axisLine: { show: false },
        },
        yAxis: {
          name: 'WOS(周)',
          nameLocation: 'end',
          type: 'value',
          axisLabel: { formatter: (v: number) => `${v}W` },
          splitLine: { lineStyle: { color: '#f0f0f0' } },
          axisLine: { show: false },
        },
        series: [{
          type: 'scatter',
          data: seriesData,
          symbolSize: (val: [number, number, number]) => Math.max(12, Math.min(40, val[2] / 60000)),
          label: { show: true, position: 'right', formatter: (p: { name: string }) => p.name, fontSize: 10, color: '#6b7280' },
          emphasis: { label: { show: true, fontWeight: 'bold' } },
          markLine: {
            silent: true,
            lineStyle: { color: '#d1d5db', type: 'dashed' },
            data: [{ yAxis: 8 }, { xAxis: 0.5 }],
          },
        }],
      });

      const resizeObs = new ResizeObserver(() => chart.resize());
      resizeObs.observe(chartRef.current!);
      return () => { resizeObs.disconnect(); };
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">风险矩阵</h3>
          <p className="text-xs text-gray-500 mt-0.5">气泡大小代表库存成本 · 左上=积压 · 右下=缺货</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DIM_OPTS.map(o => (
            <button key={o.value} onClick={() => setDim(o.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                dim === o.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-400'
              }`}
            >{o.label}</button>
          ))}
        </div>
      </div>
      <div className="px-5 pb-4">
        <div ref={chartRef} style={{ height: 320 }} />
        <div className="flex gap-3 mt-3 flex-wrap">
          {Object.entries(RISK_LABELS).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[k] }} />{l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
