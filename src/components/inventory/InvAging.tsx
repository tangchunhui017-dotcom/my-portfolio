'use client';
/**
 * src/components/inventory/InvAging.tsx
 * 库存库龄分析
 */
import type { InventoryAgingItem } from '@/types/inventoryHealthTypes';
import { RISK_COLORS, RISK_LABELS, fmtK, pct } from '@/types/inventoryHealthTypes';

interface Props {
  data: InventoryAgingItem[];
}

export default function InvAging({ data }: Props) {
  const totalCost = data.reduce((s, d) => s + d.inventoryCost, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">库存库龄 Aging</h3>
        <p className="text-xs text-gray-500 mt-0.5">库龄越长清仓难度越大，超过90天需立即评估处置方案</p>
      </div>

      {/* 进度条可视化 */}
      <div className="px-5 py-4 space-y-3">
        {data.map(d => {
          const barPct = d.inventoryCost / totalCost;
          return (
            <div key={d.bucket}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{d.label}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: RISK_COLORS[d.riskLevel] }}
                  >{RISK_LABELS[d.riskLevel]}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-600">
                  <span><span className="text-gray-400">库存成本</span> <b className="text-gray-900">{fmtK(d.inventoryCost)}</b></span>
                  <span><span className="text-gray-400">SKU</span> <b className="text-gray-900">{d.skuCount}</b></span>
                  <span><span className="text-gray-400">售罄率</span> <b className="text-gray-900">{pct(d.sellThroughRate)}</b></span>
                  <span><span className="text-gray-400">WOS</span> <b className="text-gray-900">{d.wos}W</b></span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(barPct * 100).toFixed(1)}%`,
                    backgroundColor: RISK_COLORS[d.riskLevel],
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">建议：{d.action}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
