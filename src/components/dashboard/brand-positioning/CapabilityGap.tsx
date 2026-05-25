'use client';

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  CAPABILITY_RADAR,
  TOWS_MATRIX,
  type SwotDimensionKey,
} from '@/data/brandMarketResearch';

const QUADRANT_META: Record<
  'SO' | 'WO' | 'ST' | 'WT',
  { label: string; cn: string; tone: string; chip: string; ring: string; icon: string }
> = {
  SO: { label: 'SO',  cn: '进攻', tone: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-200', icon: '⚔' },
  WO: { label: 'WO', cn: '改良', tone: 'text-amber-700',   chip: 'bg-amber-100 text-amber-700',   ring: 'ring-amber-200',   icon: '🛠' },
  ST: { label: 'ST',  cn: '防御', tone: 'text-sky-700',     chip: 'bg-sky-100 text-sky-700',     ring: 'ring-sky-200',     icon: '🛡' },
  WT: { label: 'WT',  cn: '止损', tone: 'text-slate-700',   chip: 'bg-slate-200 text-slate-700',   ring: 'ring-slate-300',   icon: '⏸' },
};

const DIMENSION_TO_RADAR_IDX: Record<SwotDimensionKey, number> = {
  '产品': 0,
  '价格': 1,
  '服务': 2,
  '渠道': 3, // map 渠道 to "销售模式" axis
  '供应链': 4,
  '组织': 5,
};

// Maps dimensions in the matrix to radar dimension names
const RADAR_TO_TOWS_DIM: Record<number, SwotDimensionKey> = {
  0: '产品',
  1: '价格',
  2: '服务',
  3: '渠道',
  4: '供应链',
  5: '组织',
};

export default function CapabilityGap() {
  const [activeDim, setActiveDim] = useState<SwotDimensionKey>('服务');

  const radarOption: EChartsOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'transparent',
      textStyle: { color: '#fff', fontSize: 11 },
      padding: [6, 10],
    },
    legend: {
      bottom: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { fontSize: 11, color: '#475569' },
      data: ['现状能力', 'SS26 目标'],
    },
    radar: {
      shape: 'polygon',
      radius: '62%',
      center: ['50%', '46%'],
      indicator: CAPABILITY_RADAR.map((item) => ({
        name: `${item.dimension}\n${item.enName}`,
        max: 5,
      })),
      axisName: {
        color: '#475569',
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 14,
      },
      splitArea: {
        areaStyle: { color: ['rgba(248,250,252,0.4)', 'rgba(241,245,249,0.4)'] },
      },
      axisLine: { lineStyle: { color: 'rgba(203,213,225,0.6)' } },
      splitLine: { lineStyle: { color: 'rgba(203,213,225,0.6)' } },
    },
    series: [
      {
        type: 'radar',
        symbol: 'circle',
        symbolSize: 6,
        data: [
          {
            value: CAPABILITY_RADAR.map((d) => d.current),
            name: '现状能力',
            lineStyle: { color: '#a78bfa', width: 2 },
            itemStyle: { color: '#a78bfa' },
            areaStyle: { color: 'rgba(167,139,250,0.10)' },
          },
          {
            value: CAPABILITY_RADAR.map((d) => d.target),
            name: 'SS26 目标',
            lineStyle: { color: '#22c55e', width: 2.5 },
            itemStyle: { color: '#22c55e' },
            areaStyle: { color: 'rgba(34,197,94,0.18)' },
          },
        ],
      },
    ],
  }), []);

  const handleClick = (params: { dataIndex?: number; name?: string }) => {
    // ECharts radar click returns name like "产品力\nProduct"; use dataIndex if available
    if (typeof params.dataIndex === 'number') {
      const idx = params.dataIndex;
      const dim = RADAR_TO_TOWS_DIM[idx];
      if (dim) setActiveDim(dim);
    }
  };

  const towsForDim = useMemo(
    () => TOWS_MATRIX.filter((c) => c.dimension === activeDim),
    [activeDim],
  );

  const radarItem = CAPABILITY_RADAR[DIMENSION_TO_RADAR_IDX[activeDim]];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-600">
        能力差距 <span className="font-semibold text-rose-600">决定战略偏向</span>：补短板 or 放长板？
        <span className="ml-2 text-xs text-slate-400">点击雷达图任意维度，右侧切换为该维度的战略矩阵</span>
      </p>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_1fr]">
        {/* 左：雷达图 */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">CAPABILITY RADAR</div>
              <h4 className="mt-1 text-base font-bold text-slate-900">六大能力 · 现状 vs SS26 目标</h4>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> 现状</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> 目标</span>
            </div>
          </div>

          <div className="mt-2">
            <ReactECharts
              option={radarOption}
              style={{ height: 380 }}
              onEvents={{ click: handleClick }}
              notMerge
            />
          </div>

          {/* 6 维度差距快速汇总 */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {CAPABILITY_RADAR.map((item, idx) => {
              const dim = RADAR_TO_TOWS_DIM[idx];
              const isActive = dim === activeDim;
              return (
                <button
                  key={item.dimension}
                  type="button"
                  onClick={() => setActiveDim(dim)}
                  className={`rounded-lg border px-2 py-1.5 text-left transition-all ${
                    isActive ? 'border-indigo-300 bg-indigo-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-800">{item.dimension}</span>
                    <span className={`text-[11px] font-black ${item.gap >= 1.5 ? 'text-rose-600' : item.gap >= 1.0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      +{item.gap.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{item.current} → {item.target}</div>
                </button>
              );
            })}
          </div>
        </article>

        {/* 右：TOWS 推导 */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">TOWS DERIVATION</div>
              <h4 className="mt-1 text-base font-bold text-slate-900">
                <span className="text-indigo-600">{activeDim}</span> · 战略象限推导
              </h4>
            </div>
            {radarItem && (
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">能力差距</div>
                <div className={`text-lg font-black ${radarItem.gap >= 1.5 ? 'text-rose-600' : radarItem.gap >= 1.0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  +{radarItem.gap.toFixed(1)}
                </div>
              </div>
            )}
          </div>

          {radarItem && (
            <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">关键洞察：</span>{radarItem.note}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            {(['SO', 'WO', 'ST', 'WT'] as const).map((q) => {
              const cell = towsForDim.find((c) => c.quadrant === q);
              const meta = QUADRANT_META[q];
              return (
                <div key={q} className={`rounded-xl border border-slate-200 bg-white p-3 ring-1 ${meta.ring} shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${meta.tone}`}>
                      <span>{meta.icon}</span>
                      {meta.label} · {meta.cn}
                    </span>
                  </div>
                  {cell ? (
                    <>
                      <div className={`mt-2 text-sm font-bold ${meta.tone}`}>{cell.title}</div>
                      <div className="mt-1 text-[11px] leading-snug text-slate-600">{cell.detail}</div>
                    </>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-400">本维度无 {meta.cn} 战略</div>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}
