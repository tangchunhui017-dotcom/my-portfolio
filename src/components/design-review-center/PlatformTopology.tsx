'use client';

import { useMemo } from 'react';
import type { ProductArchitectureView } from '@/lib/design-review-center/types';

/* ──────────────────────────────────────────────
   底台谱系拓扑图 (Platform Topology)
   识别：
   - "吸血老平台"：承接过多 SKU 的成熟底台
   - "低性价比新平台"：只有单款挂靠的新开模
   ────────────────────────────────────────────── */

interface PlatformNode {
  soleName: string;
  skuCount: number;
  seriesNames: string[];
  seriesColors: string[];
  isShared: boolean;
  isNewTooling: boolean;
  /** 性价比判定：SKU <= 1 的新模具 = 低性价比 */
  isLowRoi: boolean;
  /** 过度集中判定：承接 ≥ 40% 的总 SKU */
  isOverloaded: boolean;
  /** 高效共用：SKU >= 4 且跨系列 */
  isHighEfficiency: boolean;
  /** 成熟平台：非新模且 SKU >= 6 */
  isMature: boolean;
  /** 虚拟ROI数据 */
  mockRoiMultiplier: string;
}

interface PlatformTopologyProps {
  architecture: ProductArchitectureView;
}

const DISPLAY_COLORS = ['#2563EB', '#F97316', '#7C3AED', '#16A34A', '#E11D48', '#0F766E', '#CA8A04', '#0891B2'];

export default function PlatformTopology({ architecture }: PlatformTopologyProps) {
  const { nodes, totalSku, summary, capex } = useMemo(() => {
    // 从 soleTypes 维度聚合底台数据
    const soleMap = new Map<string, { count: number; seriesSet: Set<string>; seriesColorMap: Map<string, string>; isNewTooling: boolean; isShared: boolean }>();
    const seriesColorLookup = new Map<string, string>();

    architecture.inputs.forEach((input, idx) => {
      const color = DISPLAY_COLORS[idx % DISPLAY_COLORS.length];
      seriesColorLookup.set(input.seriesId, color);

      // 从 soleTypes 提取底台名称
      input.soleTypes.forEach((sole) => {
        const existing = soleMap.get(sole.label) || {
          count: 0,
          seriesSet: new Set<string>(),
          seriesColorMap: new Map<string, string>(),
          isNewTooling: false,
          isShared: false,
        };
        existing.count += sole.count;
        sole.seriesIds?.forEach((sid) => {
          existing.seriesSet.add(sid);
          const sc = seriesColorLookup.get(sid);
          if (sc) existing.seriesColorMap.set(sid, sc);
        });
        if (sole.isNewTooling) existing.isNewTooling = true;
        if (sole.isSharedOutsole) existing.isShared = true;
        soleMap.set(sole.label, existing);
      });
    });

    const totalSku = architecture.summary.skuTarget || 1;

    const nodes: PlatformNode[] = Array.from(soleMap.entries())
      .map(([name, data]) => {
        const isShared = data.isShared || data.seriesSet.size > 1;
        const isLowRoi = data.isNewTooling && data.count <= 1;
        const isHighEfficiency = isShared && data.count >= 4;
        const isMature = !data.isNewTooling && data.count >= 6;
        
        let multiplier = '1.0x';
        if (isHighEfficiency) multiplier = '3.5x';
        else if (isMature) multiplier = '2.8x';
        else if (isLowRoi) multiplier = '0.4x';
        else multiplier = `${(1 + Math.random()).toFixed(1)}x`;

        return {
          soleName: name,
          skuCount: data.count,
          seriesNames: Array.from(data.seriesSet).map((sid) => {
            const input = architecture.inputs.find((i) => i.seriesId === sid);
            return input?.seriesName ?? sid;
          }),
          seriesColors: Array.from(data.seriesColorMap.values()),
          isShared,
          isNewTooling: data.isNewTooling,
          isLowRoi,
          isOverloaded: data.count / totalSku >= 0.4,
          isHighEfficiency,
          isMature,
          mockRoiMultiplier: multiplier
        };
      })
      .sort((a, b) => b.skuCount - a.skuCount);

    const overloadedCount = nodes.filter((n) => n.isOverloaded).length;
    const lowRoiCount = nodes.filter((n) => n.isLowRoi).length;
    let summary = `共 ${nodes.length} 个底台平台，`;
    if (overloadedCount > 0) summary += `${overloadedCount} 个过度集中，`;
    if (lowRoiCount > 0) summary += `${lowRoiCount} 个新模低性价比，`;
    summary += `总承载 ${totalSku} SKU。`;

    // 统计算法：计算资产负荷率 (Capex Ratio)
    let newToolingCount = 0;
    let inheritedCount = 0;
    nodes.forEach(n => {
      if (n.isNewTooling) newToolingCount += n.skuCount;
      else inheritedCount += n.skuCount;
    });
    const totalAssetCount = newToolingCount + inheritedCount || 1;
    const newToolingRatio = Math.round((newToolingCount / totalAssetCount) * 100);
    const inheritedRatio = 100 - newToolingRatio;

    return { 
      nodes, 
      totalSku, 
      summary, 
      capex: { newToolingRatio, inheritedRatio, newToolingCount, inheritedCount } 
    };
  }, [architecture]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选下暂无底台结构数据。
      </div>
    );
  }

  return (
    <section className="drc-glass-panel rounded-[30px] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
        <div className="flex-1 max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Platform Topology & ROI
          </div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">底台谱系与 ROI 价值评估</h3>
          <p className="mt-1 text-sm text-slate-500">{summary}</p>
          
          {/* Asset Tooling Load Bar (Capex vs Opex) */}
          <div className="mt-6 flex flex-col gap-2 w-full max-w-xl">
            <div className="flex items-end justify-between font-medium text-xs">
              <span className={capex.inheritedRatio > 50 ? "text-emerald-700 font-semibold" : "text-slate-600"}>
                轻资产: 继承/共用模具 ({capex.inheritedRatio}%)
              </span>
              <span className={capex.newToolingRatio > 35 ? "text-rose-600 font-semibold" : "text-slate-600"}>
                {capex.newToolingRatio > 35 && <span className="mr-1">⚠️ 负荷超限</span>}
                重资产: 新编模具 ({capex.newToolingRatio}%)
              </span>
            </div>
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 ring-1 ring-inset ring-slate-900/5 shadow-inner">
              <div 
                className="bg-[linear-gradient(90deg,#34d399_0%,#10b981_100%)] transition-all duration-700" 
                style={{ width: `${capex.inheritedRatio}%` }} 
                title={`${capex.inheritedCount} SKU 采用继承底`}
              />
              <div 
                className="bg-[linear-gradient(90deg,#fb7185_0%,#f43f5e_100%)] transition-all duration-700" 
                style={{ width: `${capex.newToolingRatio}%` }} 
                title={`${capex.newToolingCount} SKU 采用新模定投`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap xl:flex-col gap-3 text-[11px] bg-slate-50/80 px-4 py-3 rounded-[20px] border border-slate-100 shrink-0">
          <span className="flex items-center gap-2 font-semibold text-blue-700 bg-blue-50/50 px-2 py-1 rounded-md">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            高效矩阵 (High Efficiency)
          </span>
          <span className="flex items-center gap-2 font-semibold text-rose-700 bg-rose-50/50 px-2 py-1 rounded-md">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            过度集中 (Risk)
          </span>
          <span className="flex items-center gap-2 font-semibold text-amber-600 bg-amber-50/50 px-2 py-1 rounded-md">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            单兵新模 (Low ROI)
          </span>
        </div>
      </div>

      {/* 底台节点拓扑 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {nodes.map((node) => {
          let ringColor = '#94A3B8'; // 默认 slate
          let bgGradient = 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)';
          let borderColor = '#E2E8F0';
          let badge = '';

          if (node.isOverloaded) {
            ringColor = '#EF4444';
            bgGradient = 'linear-gradient(180deg, #FFF5F5 0%, #FEF2F2 100%)';
            borderColor = '#FECACA';
            badge = '⚠ 过度集中 (Risk)';
          } else if (node.isLowRoi) {
            ringColor = '#F59E0B';
            bgGradient = 'linear-gradient(180deg, #FFFBEB 0%, #FEF9C3 100%)';
            borderColor = '#FDE68A';
            badge = '⚡ 单开低效 (Low ROI)';
          } else if (node.isHighEfficiency) {
            ringColor = '#3B82F6';
            bgGradient = 'linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%)';
            borderColor = '#BFDBFE';
            badge = '⭐ 高效矩阵 (Efficiency)';
          } else if (node.isShared) {
            ringColor = '#10B981';
            bgGradient = 'linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 100%)';
            borderColor = '#A7F3D0';
            badge = '✓ 跨系列共用';
          }

          const shareOfTotal = Math.round((node.skuCount / totalSku) * 100);

          return (
            <article
              key={node.soleName}
              className="drc-topo-card relative overflow-hidden rounded-[20px] border p-4 bg-white hover:bg-slate-50/50"
              style={{ borderColor }}
            >
              <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none" style={{ background: bgGradient }} />
              {/* 容量条 */}
              <div
                className="absolute bottom-0 left-0 h-1 transition-all duration-500 z-10"
                style={{ width: `${Math.min(shareOfTotal * 2, 100)}%`, backgroundColor: ringColor }}
              />

              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{node.soleName}</div>
                  {badge && (
                    <span 
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" 
                      style={{ color: ringColor, backgroundColor: ringColor + '15' }}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                {/* SKU 计数环 */}
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold bg-white"
                  style={{ borderColor: ringColor, color: ringColor }}
                >
                  {node.skuCount}
                </div>
              </div>

              {/* 系列色块 */}
              <div className="mt-3 flex flex-wrap gap-1 relative z-10" title="挂靠系列分布">
                {node.seriesColors.map((color, idx) => (
                  <span
                    key={`${node.soleName}-${idx}`}
                    className="h-2.5 w-2.5 rounded-sm ring-1 ring-black/5"
                    style={{ backgroundColor: color }}
                    title={node.seriesNames[idx] ?? ''}
                  />
                ))}
              </div>

              <div className="mt-2 text-[11px] text-slate-500 relative z-10">
                {node.seriesNames.slice(0, 2).join('、')}{node.seriesNames.length > 2 ? ` 等 ${node.seriesNames.length} 个系列` : ''}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs relative z-10">
                <span className="text-slate-500">摊销 ROI (历史)</span>
                <span className={`font-mono font-medium ${node.isLowRoi ? 'text-amber-600' : 'text-slate-900'}`}>{node.mockRoiMultiplier}</span>
              </div>
              
              {/* 智能建议 Hover */}
              {node.isLowRoi && (
                <div className="mt-2 text-[10px] text-amber-700 bg-amber-100/50 rounded px-2 py-1 relative z-10">
                  建议: 跨系列延展或并入成熟底台
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
