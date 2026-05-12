'use client';
/**
 * src/components/inventory/InvTopRiskSku.tsx
 * 高风险SKU完整字段表格
 */
import { Fragment, useState } from 'react';
import type { RiskSkuItem } from '@/types/inventoryHealthTypes';
import { RISK_COLORS, RISK_LABELS, fmtK, pct } from '@/types/inventoryHealthTypes';

const RELATED_LABELS: Record<string, string> = {
  otb: 'OTB', forecast: '预测', wave: '波段', cashflow: '现金流', pnl: '损益',
};

type SortKey = 'wos' | 'sellThroughRate' | 'inventoryCost' | 'forecastVariance';

interface Props {
  data: RiskSkuItem[];
  onNavigate?: (module: string) => void;
}

export default function InvTopRiskSku({ data, onNavigate }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('wos');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  const sorted = [...data].sort((a, b) => {
    const v = a[sortKey] - b[sortKey];
    return sortDesc ? -v : v;
  });

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`flex items-center gap-0.5 hover:text-blue-600 ${sortKey === k ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}
      >
        {label}
        <span className="text-xs">{sortKey === k ? (sortDesc ? '▼' : '▲') : '↕'}</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">高风险 SKU 明细</h3>
        <p className="text-xs text-gray-500 mt-0.5">点击行展开详情 · 支持跳转至OTB/预测/波段/损益</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-gray-600 font-medium min-w-[160px]">款式</th>
              <th className="px-3 py-2.5 text-center"><SortBtn k="wos" label="WOS" /></th>
              <th className="px-3 py-2.5 text-center"><SortBtn k="sellThroughRate" label="售罄率" /></th>
              <th className="px-3 py-2.5 text-center"><SortBtn k="inventoryCost" label="库存成本" /></th>
              <th className="px-3 py-2.5 text-center"><SortBtn k="forecastVariance" label="预测差异" /></th>
              <th className="px-3 py-2.5 text-center text-gray-600 font-medium">风险</th>
              <th className="px-3 py-2.5 text-center text-gray-600 font-medium">联动</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map(sku => {
              const exp = expandedId === sku.skuId;
              return (
                <Fragment key={sku.skuId}>
                  <tr
                    onClick={() => setExpandedId(exp ? null : sku.skuId)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{sku.styleName}</div>
                      <div className="text-gray-400">{sku.waveName} · {sku.channel === 'ecommerce' ? '电商' : '实体'}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-semibold ${sku.wos < 6 ? 'text-blue-600' : sku.wos > 20 ? 'text-red-500' : 'text-gray-700'}`}>{sku.wos}W</span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-700">{pct(sku.sellThroughRate)}</td>
                    <td className="px-3 py-3 text-center font-medium text-gray-800">{fmtK(sku.inventoryCost)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`${sku.forecastVariance < -0.1 ? 'text-red-500' : sku.forecastVariance > 0.1 ? 'text-green-600' : 'text-gray-600'}`}>
                        {sku.forecastVariance > 0 ? '+' : ''}{pct(sku.forecastVariance)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: RISK_COLORS[sku.riskLevel] }}>
                        {RISK_LABELS[sku.riskLevel]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {sku.relatedModules.map(m => (
                          <button key={m}
                            onClick={e => { e.stopPropagation(); onNavigate?.(m); }}
                            className="text-blue-500 hover:text-blue-700 hover:underline text-xs"
                          >{RELATED_LABELS[m] || m}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {exp && (
                    <tr className="bg-blue-50/20">
                      <td colSpan={7} className="px-6 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div><span className="text-gray-500">风险原因：</span><span className="text-gray-800">{sku.riskReason}</span></div>
                          <div><span className="text-gray-500">建议动作：</span><span className="font-medium text-gray-900">{sku.recommendedAction}</span></div>
                          <div><span className="text-gray-500">预计现金回笼：</span><span className="font-semibold text-green-600">{fmtK(sku.expectedCashRelease)}</span></div>
                          <div><span className="text-gray-500">毛利影响：</span><span className={`font-semibold ${sku.expectedMarginImpact >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{sku.expectedMarginImpact > 0 ? '+' : ''}{fmtK(Math.abs(sku.expectedMarginImpact))}</span></div>
                          <div><span className="text-gray-500">尺码完整率：</span><span>{pct(sku.sizeCompleteness)}</span></div>
                          <div><span className="text-gray-500">核心码完整率：</span><span>{pct(sku.coreSizeCompleteness)}</span></div>
                          <div><span className="text-gray-500">折扣率：</span><span>{pct(sku.markdownRate)}</span></div>
                          <div><span className="text-gray-500">库存吊牌：</span><span>{fmtK(sku.inventoryRetail)}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
