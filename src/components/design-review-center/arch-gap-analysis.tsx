'use client';

import { useMemo } from 'react';
import type { ArchitectureGapItem } from '@/lib/design-review-center/types';

interface Props {
  items: ArchitectureGapItem[];
}

const PRIORITY_CLS: Record<string, string> = {
  P0: 'bg-red-600 text-white',
  P1: 'bg-amber-500 text-white',
  P2: 'bg-blue-500 text-white',
};

const PRIORITY_SECTION: Record<string, { label: string; desc: string; border: string }> = {
  P0: { label: 'P0 立即处理', desc: '严重缺口 — 影响波段上市或OTB合规', border: 'border-red-200' },
  P1: { label: 'P1 本周处理', desc: '重要缺口 — 影响架构完整性和毛利结构', border: 'border-amber-200' },
  P2: { label: 'P2 计划处理', desc: '改善项 — 趋势机会或优化建议', border: 'border-blue-200' },
};

export default function ArchGapAnalysis({ items }: Props) {
  const grouped = useMemo(() => {
    const map: Record<string, ArchitectureGapItem[]> = {};
    for (const item of items) {
      if (!map[item.priority]) map[item.priority] = [];
      map[item.priority].push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 07</span>
          <h3 className="text-base font-semibold text-slate-900">架构缺口分析</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">识别架构中价格带、鞋型、角色、成本等关键缺口并给出补位建议</p>
      </div>

      <div className="p-6 space-y-6">
        {(['P0', 'P1', 'P2'] as const).map((p) => {
          const group = grouped[p];
          if (!group?.length) return null;
          const cfg = PRIORITY_SECTION[p];
          return (
            <div key={p}>
              <div className="mb-3 flex items-center gap-3">
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${PRIORITY_CLS[p]}`}>{cfg.label}</span>
                <span className="text-xs text-slate-500">{cfg.desc}</span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {group.length} 项
                </span>
              </div>
              <div className={`rounded-xl border ${cfg.border} divide-y divide-slate-100 overflow-hidden`}>
                {group.map((item) => (
                  <GapRow key={item.gapId} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GapRow({ item }: { item: ArchitectureGapItem }) {
  return (
    <div className="bg-white px-5 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex flex-wrap items-start gap-2 mb-2">
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {item.gapType}
        </span>
        <h4 className="font-semibold text-slate-900">{item.gapObject}</h4>
      </div>

      <p className="mb-2 text-sm text-slate-600">{item.gapReason}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-slate-500">
        {item.affectedWave && <span>波段：{item.affectedWave}</span>}
        {item.affectedSeries && <span>系列：{item.affectedSeries}</span>}
        {item.affectedConsumer && <span>目标客群：{item.affectedConsumer}</span>}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {item.expectedImpact && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
            <span className="font-semibold">预期影响：</span>{item.expectedImpact}
          </div>
        )}
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          <span className="font-semibold">建议行动：</span>{item.recommendedAction}
        </div>
      </div>
    </div>
  );
}
