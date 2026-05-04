'use client';

import { useMemo, useState } from 'react';
import type { ProductArchitectureView, ArchitectureRoleKey } from '@/lib/design-review-center/types';

/* ──────────────────────────────────────────────
   金字塔分层模型 (Product Pyramid)
   Hero (尖刀/形象款) → Core (走量/利润款) → Filler (补充/基础款)
   ────────────────────────────────────────────── */

interface PyramidLayer {
  key: 'hero' | 'core' | 'filler';
  label: string;
  subLabel: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  roleKeys: ArchitectureRoleKey[];
}

interface ProductPyramidProps {
  architecture: ProductArchitectureView;
  activeLayer: string | null;
  onLayerClick: (layer: string | null) => void;
}

const LAYERS: Omit<PyramidLayer, 'count'>[] = [
  {
    key: 'hero',
    label: '形象 / 尖刀款',
    subLabel: 'Hero · Image',
    color: '#E11D48',
    bgColor: '#FFF1F2',
    borderColor: '#FECDD3',
    roleKeys: ['lead', 'image'],
  },
  {
    key: 'core',
    label: '核心 / 走量款',
    subLabel: 'Core · Traffic',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    roleKeys: ['traffic', 'functional'],
  },
  {
    key: 'filler',
    label: '基础 / 补充款',
    subLabel: 'Filler · Basic',
    color: '#64748B',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    roleKeys: ['basic'],
  },
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function ProductPyramid({ architecture, activeLayer, onLayerClick }: ProductPyramidProps) {
  const layers = useMemo<PyramidLayer[]>(() => {
    const totals: Record<ArchitectureRoleKey, number> = { basic: 0, lead: 0, image: 0, traffic: 0, functional: 0 };
    architecture.inputs.forEach((input) => {
      (Object.keys(input.roleCounts) as ArchitectureRoleKey[]).forEach((k) => {
        totals[k] += input.roleCounts[k];
      });
    });

    return LAYERS.map((layer) => ({
      ...layer,
      count: layer.roleKeys.reduce((sum, k) => sum + (totals[k] || 0), 0),
    }));
  }, [architecture.inputs]);

  const totalCount = layers.reduce((s, l) => s + l.count, 0);

  if (totalCount === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选下暂无角色分配数据，无法展示产品分层。
      </div>
    );
  }

  return (
    <section className="h-full flex flex-col rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Product Pyramid
          </div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">产品分层结构</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            点击层级可过滤下方矩阵表。总款数 {totalCount}。
          </p>
        </div>
        {activeLayer && (
          <button
            type="button"
            onClick={() => onLayerClick(null)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            清除过滤
          </button>
        )}
      </div>

      {/* 金字塔可视化 */}
      <div className="flex-1 flex flex-col justify-center items-center gap-2 mt-8 py-4">
        {layers.map((layer, i) => {
          const widthPct = 40 + i * 25; // 40% → 65% → 90%
          const isActive = activeLayer === layer.key;
          const isDimmed = activeLayer !== null && !isActive;
          const share = totalCount > 0 ? layer.count / totalCount : 0;

          return (
            <button
              key={layer.key}
              type="button"
              onClick={() => onLayerClick(isActive ? null : layer.key)}
              className="group relative transition-all duration-300"
              style={{
                width: `${widthPct}%`,
                opacity: isDimmed ? 0.35 : 1,
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              <div
                className="relative overflow-hidden rounded-2xl border-2 px-5 py-4 transition-all duration-300"
                style={{
                  backgroundColor: layer.bgColor,
                  borderColor: isActive ? layer.color : layer.borderColor,
                  boxShadow: isActive ? `0 8px 24px ${layer.color}25` : 'none',
                }}
              >
                {/* 背景装饰条 */}
                <div
                  className="absolute left-0 top-0 h-full transition-all duration-500"
                  style={{
                    width: `${Math.round(share * 100)}%`,
                    backgroundColor: layer.color,
                    opacity: 0.08,
                  }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-sm font-semibold" style={{ color: layer.color }}>
                      {layer.label}
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono text-slate-400">{layer.subLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-slate-900">{layer.count}</div>
                    <div className="text-[10px] text-slate-400">{percent(share)}</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 底部角色图例 */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
        <span>Lead = 主推/旗舰</span>
        <span>·</span>
        <span>Image = 形象/话题</span>
        <span>·</span>
        <span>Traffic = 引流/走量</span>
        <span>·</span>
        <span>Functional = 功能/专业</span>
        <span>·</span>
        <span>Basic = 基础/补位</span>
      </div>
    </section>
  );
}
