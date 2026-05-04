'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ProductArchitectureView } from '@/lib/design-review-center/types';

interface PriceGapAnalysisProps {
  architecture: ProductArchitectureView;
}

interface PriceBandPoint {
  category: string;
  midPrice: number;
  skuCount: number;
  seriesName: string;
  priceBand: string;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  板鞋: '#2563EB',
  跑步鞋: '#10B981',
  休闲鞋: '#F59E0B',
  篮球鞋: '#EF4444',
  帆布鞋: '#8B5CF6',
  凉鞋: '#0891B2',
  运动鞋: '#E11D48',
};

function parsePriceMid(band: string): number {
  const matched = band.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (matched) return Math.round((Number(matched[1]) + Number(matched[2])) / 2);
  const single = band.match(/(\d+)/);
  if (single) return Number(single[1]);
  return 0;
}

function getColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] ?? ['#2563EB', '#F97316', '#7C3AED', '#16A34A', '#E11D48', '#0F766E'][index % 6];
}

function detectGaps(points: PriceBandPoint[]): { price: number; label: string }[] {
  if (points.length < 2) return [];

  const sortedPrices = [...new Set(points.map((p) => p.midPrice))].sort((a, b) => a - b);
  const gaps: { price: number; label: string }[] = [];

  for (let i = 1; i < sortedPrices.length; i++) {
    const gap = sortedPrices[i] - sortedPrices[i - 1];
    if (gap >= 150) {
      const midGap = Math.round((sortedPrices[i] + sortedPrices[i - 1]) / 2);
      gaps.push({ price: midGap, label: `¥${midGap} 断档区` });
    }
  }

  // 检测核心价格带（299/399/499/599）的覆盖盲区
  const corePrices = [299, 399, 499, 599];
  corePrices.forEach((cp) => {
    const nearby = points.some((p) => Math.abs(p.midPrice - cp) <= 60);
    if (!nearby && sortedPrices.length > 0) {
      const min = sortedPrices[0];
      const max = sortedPrices[sortedPrices.length - 1];
      if (cp >= min - 50 && cp <= max + 50) {
        gaps.push({ price: cp, label: `核心价位 ¥${cp} 无覆盖` });
      }
    }
  });

  return gaps;
}

export default function PriceGapAnalysis({ architecture }: PriceGapAnalysisProps) {
  const points = useMemo<PriceBandPoint[]>(() => {
    const result: PriceBandPoint[] = [];
    const categoryIndexMap = new Map<string, number>();
    let categoryCounter = 0;

    architecture.inputs.forEach((input) => {
      if (!categoryIndexMap.has(input.categoryName)) {
        categoryIndexMap.set(input.categoryName, categoryCounter++);
      }
      const idx = categoryIndexMap.get(input.categoryName)!;
      const mid = parsePriceMid(input.priceBand);
      if (mid > 0) {
        result.push({
          category: input.categoryName,
          midPrice: mid,
          skuCount: input.skuTarget,
          seriesName: input.seriesName,
          priceBand: input.priceBand,
          color: getColor(input.categoryName, idx),
        });
      }
    });

    return result;
  }, [architecture.inputs]);

  const gaps = useMemo(() => detectGaps(points), [points]);

  const chartOption = useMemo<EChartsOption>(() => {
    // 按品类分组构建散点系列
    const categoryMap = new Map<string, PriceBandPoint[]>();
    points.forEach((p) => {
      const arr = categoryMap.get(p.category) || [];
      arr.push(p);
      categoryMap.set(p.category, arr);
    });

    const series: any[] = [];
    categoryMap.forEach((pts, cat) => {
      series.push({
        name: cat,
        type: 'scatter',
        symbolSize: (data: number[]) => Math.max(14, Math.sqrt(data[1]) * 6),
        data: pts.map((p) => ({
          name: `${p.seriesName} · ${p.category}`,
          value: [p.midPrice, p.skuCount],
          itemStyle: { color: p.color, shadowBlur: 8, shadowColor: p.color + '40' },
        })),
        label: {
          show: true,
          formatter: (params: any) => params.data.name.split(' · ')[0],
          position: 'top',
          color: '#475569',
          fontSize: 10,
          distance: 8,
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: 'shiftY'
        },
      });
    });

    // 断档区域标线
    const markLineData = gaps.map((g) => ({
      xAxis: g.price,
      label: {
        formatter: g.label,
        color: '#EF4444',
        fontSize: 10,
        position: 'end' as const,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: [2, 6],
        borderRadius: 4,
      },
      lineStyle: { color: '#FCA5A5', type: 'dashed' as const, width: 2 },
    }));

    if (series.length > 0) {
      // 竞品火线对齐 (Pricing Battlefield)
      const battlefieldMarkArea = {
        itemStyle: {
          color: 'rgba(239, 68, 68, 0.05)',
        },
        label: {
          position: 'insideTop',
          color: '#DC2626',
          fontSize: 10,
          fontWeight: 'bold',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: [4, 8],
          borderRadius: 4,
          offset: [0, 6],
        },
        data: [
          [
            { name: '竞品核心攻击区 (Battlefield)', xAxis: 450 },
            { xAxis: 600 }
          ]
        ]
      };

      series[0].markArea = battlefieldMarkArea;

      if (markLineData.length > 0) {
        series[0].markLine = {
          silent: true,
          symbol: 'none',
          data: markLineData,
        };
      }
    }

    const allPrices = points.map((p) => p.midPrice);
    const minPrice = Math.min(...allPrices, 200);
    const maxPrice = Math.max(...allPrices, 800);

    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'rgba(0, 0, 0, 0.05)',
        textStyle: { color: '#0F172A', fontSize: 13 },
        formatter: (params: any) => {
          if (params.componentType === 'markArea') return params.name;
          const d = params.data;
          return `${d.name}<br/>中间价位：¥${d.value[0]}<br/>SKU 目标：${d.value[1]}`;
        },
      },
      // 加入 visualMap 构建热力感 (根据 SKU 数量调整视觉强度)
      visualMap: {
        show: false,
        dimension: 1, // 根据 Y 轴 (SKU数量) 渐变
        min: 0,
        max: 30,
        inRange: {
          opacity: [0.35, 1],
          symbolSize: [12, 36]
        }
      },
      legend: {
        type: 'scroll',
        top: 8,
        textStyle: { color: '#64748B', fontSize: 12 },
      },
      grid: { top: 48, left: 48, right: 32, bottom: 40, containLabel: true },
      xAxis: {
        type: 'value',
        name: '价格带中间价 (¥)',
        nameTextStyle: { color: '#64748B', align: 'center', padding: [10, 0, 0, 0] },
        nameLocation: 'middle',
        splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.04)', type: 'dashed' } },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#94A3B8', formatter: '¥{value}' },
        min: Math.floor((minPrice - 50) / 50) * 50,
        max: Math.ceil((maxPrice + 50) / 50) * 50,
      },
      yAxis: {
        type: 'value',
        name: 'SKU 目标数',
        nameTextStyle: { color: '#64748B' },
        splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.04)', type: 'dashed' } },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#94A3B8' },
      },
      series,
    };
  }, [points, gaps]);

  if (points.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选下暂无可用的价格带分布数据。
      </div>
    );
  }

  return (
    <section className="drc-glass-panel rounded-[30px] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)] flex flex-col h-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Pricing Battlefield
          </div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">价格带空隙与火线对齐</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            结合竞品强攻区（Battlefield），识别结构性兵力空虚与冗余。
          </p>
        </div>
        {gaps.length > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            发现 {gaps.length} 处战略空隙
          </div>
        )}
      </div>

      <div className="mt-6 flex-1 min-h-[360px] rounded-[24px] border border-slate-100/50 bg-white/40 overflow-hidden shadow-inner relative">
        <ReactECharts
          option={chartOption}
          notMerge={true}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </div>

      {/* 空隙摘要 */}
      {gaps.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {gaps.map((g) => (
            <div
              key={g.price}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/60 px-4 py-3 text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">
                !
              </span>
              <span className="text-slate-700">{g.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
