'use client';
/**
 * src/components/inventory/InvSkuDrillDownModal.tsx
 * S4增强: 风险矩阵 SKU 钻取详情面板 (V10)
 */
import type { InventoryRiskMatrixItem } from '@/types/inventoryHealthTypes';
import { RISK_COLORS, RISK_LABELS, fmtK, pct } from '@/types/inventoryHealthTypes';

interface Props {
  item: InventoryRiskMatrixItem | null;
  onClose: () => void;
  onNavigate?: (module: string) => void;
}

const AI_SUGGESTIONS: Record<string, string[]> = {
  critical: ['立即启动清仓程序，折扣≥30%', '转奥莱/电商渠道清货', '停止后续补货计划'],
  high:     ['调整折扣策略，提速去化', '启动渠道调拨到高销速门店', '评估是否需要转特卖'],
  medium:   ['加强陈列与推广投入', '监控周销速，2周无改善升级处置', '评估是否调拨区域'],
  healthy:  ['维持现有策略，持续观察', '可考虑适当补货维持满码'],
  opportunity: ['核心码段断货，立即追加补货', '优先保障主力渠道供应'],
};

export default function InvSkuDrillDownModal({ item, onClose, onNavigate }: Props) {
  if (!item) return null;

  const suggestions = AI_SUGGESTIONS[item.riskLevel] ?? AI_SUGGESTIONS.medium;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: RISK_COLORS[item.riskLevel] }}>
                {RISK_LABELS[item.riskLevel]}
              </span>
            </div>
            <p className="text-xs text-gray-400">{item.category} · {item.waveId} · {item.channel}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        {/* KPI */}
        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-gray-50">
          {[
            { label: 'WOS', val: `${item.wos}W`, highlight: item.wos > 12 },
            { label: '售罄率', val: pct(item.sellThroughRate), highlight: item.sellThroughRate < 0.6 },
            { label: '库存成本', val: fmtK(item.inventoryCost), highlight: false },
          ].map(k => (
            <div key={k.label} className="text-center">
              <div className={`text-lg font-bold ${k.highlight ? 'text-red-600' : 'text-gray-900'}`}>{k.val}</div>
              <div className="text-[10px] text-gray-400">{k.label}</div>
            </div>
          ))}
        </div>

        {/* AI建议 */}
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="text-xs font-semibold text-gray-700 mb-2">🤖 AI 建议动作</div>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-semibold text-[10px]">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 跳转 */}
        <div className="px-5 py-3 flex gap-2">
          {['otb', 'pnl', 'forecast'].map(m => (
            <button key={m} onClick={() => { onNavigate?.(m); onClose(); }}
              className="flex-1 text-xs border border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-lg py-1.5 transition-colors text-gray-600">
              → {m === 'otb' ? 'OTB' : m === 'pnl' ? '损益' : '预测'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
