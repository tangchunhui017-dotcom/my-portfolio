'use client';
/**
 * src/components/inventory/InvWaveHealth.tsx
 * 波段库存健康
 */
import type { WaveInventoryHealthItem } from '@/types/inventoryHealthTypes';
import { RISK_COLORS, fmtK, pct } from '@/types/inventoryHealthTypes';

interface Props {
  data: WaveInventoryHealthItem[];
  onNavigate?: (module: string) => void;
}

function wosRisk(wos: number) {
  if (wos > 30) return 'critical';
  if (wos > 15) return 'high';
  if (wos < 6) return 'opportunity';
  return 'healthy';
}

export default function InvWaveHealth({ data, onNavigate }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">波段库存健康</h3>
        <p className="text-xs text-gray-500 mt-0.5">每个波段的库存状态与跨波影响</p>
      </div>
      <div className="divide-y divide-gray-50">
        {data.map(w => {
          const risk = wosRisk(w.wos);
          return (
            <div key={w.waveId} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{w.waveName}</span>
                    <span className="text-xs text-gray-400">{w.lifecycleStage}</span>
                    {w.affectsNextWave && (
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">跨波影响</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">上市：{w.launchDate} · {w.actualSkuCount}/{w.plannedSkuCount} SKU</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <div className="text-right"><div className="text-gray-400">库存成本</div><div className="font-semibold text-gray-900">{fmtK(w.inventoryCost)}</div></div>
                  <div className="text-right"><div className="text-gray-400">WOS</div>
                    <div className="font-semibold" style={{ color: RISK_COLORS[risk] }}>{w.wos}W</div></div>
                  <div className="text-right"><div className="text-gray-400">售罄率</div><div className="font-semibold text-gray-900">{pct(w.sellThroughRate)}</div></div>
                  <div className="text-right"><div className="text-gray-400">风险金额</div><div className="font-semibold text-red-500">{fmtK(w.riskInventoryAmount)}</div></div>
                </div>
              </div>
              {w.affectsNote && (
                <p className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-md mb-2">{w.affectsNote}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">建议：{w.action}</p>
                <div className="flex gap-2 text-xs">
                  {['wave', 'otb', 'forecast'].map(m => (
                    <button key={m} onClick={() => onNavigate?.(m)}
                      className="text-blue-500 hover:text-blue-700 hover:underline"
                    >{ { wave: '波段企划', otb: 'OTB', forecast: '销售预测' }[m] }</button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
