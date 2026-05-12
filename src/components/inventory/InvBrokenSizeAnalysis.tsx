'use client';
/**
 * src/components/inventory/InvBrokenSizeAnalysis.tsx
 * S6: 断码 vs 满码分析 (V10) — 鞋类专属
 */
import type { InvBrokenSizeDetail } from '@/types/invHealthV10Types';
import { fmtK, pct } from '@/types/inventoryHealthTypes';

interface Props {
  data: InvBrokenSizeDetail;
}

export default function InvBrokenSizeAnalysis({ data }: Props) {
  const s = data.summary;
  const healthThreshold = s.healthyThreshold;
  const isRisk = s.brokenSizeAmountPct > healthThreshold;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">👟 断码 vs 满码分析</h3>
          <p className="text-xs text-gray-400 mt-0.5">鞋类核心指标：断码是死库存第一元凶</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${isRisk ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
          断码占比 {pct(s.brokenSizeAmountPct)} {isRisk ? '⚠️ 超标' : '✅ 健康'}
        </span>
      </div>

      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-50">
        {[
          { label: '核心款断码占用', val: fmtK(s.coreOccupyAmount), sub: `${s.coreBrokenSkuCount} 款`, color: 'text-red-600', bg: 'bg-red-50' },
          { label: '非核心断码占用', val: fmtK(s.totalOccupyAmount - s.coreOccupyAmount), sub: `${s.nonCoreBrokenSkuCount} 款`, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: '健康线 < 12%', val: pct(s.brokenSizeAmountPct), sub: '当前断码率', color: isRisk ? 'text-red-600' : 'text-emerald-600', bg: isRisk ? 'bg-red-50' : 'bg-emerald-50' },
        ].map(m => (
          <div key={m.label} className={`rounded-xl p-4 ${m.bg}`}>
            <div className={`text-xl font-bold ${m.color}`}>{m.val}</div>
            <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Top断码款表格 */}
      <div className="px-5 py-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">Top 断码款明细</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium pr-3">款式</th>
                <th className="pb-2 font-medium pr-3">品类</th>
                <th className="pb-2 font-medium pr-3">缺码段</th>
                <th className="pb-2 font-medium pr-3">占用金额</th>
                <th className="pb-2 font-medium pr-3">核心款</th>
                <th className="pb-2 font-medium">建议</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.topBrokenSkus.map(sku => (
                <tr key={sku.skuId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2 pr-3 font-medium text-gray-800">{sku.styleName}</td>
                  <td className="py-2 pr-3 text-gray-500">{sku.category}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-0.5">
                      {sku.missingSizes.map(sz => (
                        <span key={sz} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-medium">{sz}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-semibold text-red-600">{fmtK(sku.occupyAmount)}</td>
                  <td className="py-2 pr-3">
                    {sku.isCore
                      ? <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">核心</span>
                      : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="py-2 text-gray-600">{sku.suggestAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
