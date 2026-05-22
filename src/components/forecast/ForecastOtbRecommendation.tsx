'use client';
/**
 * ForecastOtbRecommendation.tsx
 * 预测 → OTB 建议模块
 */
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { useForecast } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';
import { useOtbParams } from '@/context/MerchConfigContext';
import otbAssumptionsSeasons from '../../../data/otb/otb_assumptions.json';

interface OtbItem {
  action: string;
  category: string;
  wave: string;
  amount: number;
  skuCount: number;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}


const URGENCY_STYLE = {
  high:   { badge: 'bg-rose-100 text-rose-700',   dot: 'bg-rose-500' },
  medium: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  low:    { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
};

interface Props {
  channel: ForecastChannel;
  scenario: ForecastScenario;
  onJumpToOtb?: () => void;
}

export default function ForecastOtbRecommendation({ channel, scenario, onJumpToOtb }: Props) {
  const otbParams = useOtbParams();
  const _seasons = otbAssumptionsSeasons as unknown as { springAvgCost?: number; summerAvgCost?: number; autumnAvgCost?: number; winterAvgCost?: number };
  const avgCostAll = ((_seasons.springAvgCost ?? 125) + (_seasons.summerAvgCost ?? 105) + (_seasons.autumnAvgCost ?? 143) + (_seasons.winterAvgCost ?? 156)) / 4;
  const result = useForecast(channel, scenario);

  // ── OTB 公式推导 ──────────────────────────────────────────────────────────────────────
  const cp = otbParams.channelCostParams[channel] ?? otbParams.channelCostParams['physical'] ?? { markupRate: 4.2, discountRate: 0.90, returnRate: 0.04, sellThroughTarget: 0.82 };
  const { markupRate, discountRate, returnRate, sellThroughTarget } = cp;
  const approvedBudget = otbParams.approvedBudget;
  const annualForecast = result?.annualForecast ?? 0;
  const effectiveST = sellThroughTarget - (channel === 'ecommerce' ? returnRate : 0);
  const costOTB = effectiveST > 0 ? annualForecast / effectiveST / discountRate / markupRate : null;
  const budgetGap = costOTB !== null ? costOTB - approvedBudget : null;
  const plannedPairs = costOTB !== null && avgCostAll > 0 ? Math.round(costOTB / avgCostAll) : null;

  const derivedOTB: OtbItem[] = [];
  if (budgetGap !== null && budgetGap > 0) {
    derivedOTB.push({
      action: '预算超额预警',
      category: '全渠道',
      wave: '全年',
      amount: -budgetGap,
      skuCount: 0,
      reason: `预测销售 ${formatMoneyCny(annualForecast)} → OTB成本需求 ${formatMoneyCny(costOTB ?? 0)}，超出批准预算 ${formatMoneyCny(budgetGap)}`,
      urgency: budgetGap > approvedBudget * 0.15 ? 'high' : 'medium',
    });
    derivedOTB.push({
      action: '建议冻结',
      category: '低优先级波段',
      wave: 'W4 / W5',
      amount: -(budgetGap * 0.4),
      skuCount: Math.max(3, Math.round((budgetGap * 0.4) / (avgCostAll * 300))),
      reason: '收缩尾季波段或降低尾货深度，优先保主力波段投入额度',
      urgency: 'high',
    });
  } else if (budgetGap !== null && budgetGap < 0) {
    derivedOTB.push({
      action: '预算节余',
      category: '全渠道',
      wave: '全年',
      amount: Math.abs(budgetGap),
      skuCount: 0,
      reason: `预测销售推导OTB低于批准预算 ${formatMoneyCny(Math.abs(budgetGap))}，可追加主力款深度`,
      urgency: 'low',
    });
    derivedOTB.push({
      action: '追加采购',
      category: '主力爆款延伸',
      wave: 'W2 / W3',
      amount: Math.abs(budgetGap) * 0.5,
      skuCount: Math.max(2, Math.round((Math.abs(budgetGap) * 0.5) / (avgCostAll * 300))),
      reason: '将节余预算集中于春夏主销波段爆款深度，拉升整体售羄率',
      urgency: 'medium',
    });
  }
  if (channel === 'ecommerce') {
    const returnCostDrag = annualForecast * returnRate / markupRate / discountRate;
    derivedOTB.push({
      action: '退货成本对冲',
      category: '电商渠道',
      wave: '全年',
      amount: -returnCostDrag,
      skuCount: 0,
      reason: `退货率 ${(returnRate * 100).toFixed(0)}% 拉低有效售羄率，需额外投入约 ${formatMoneyCny(returnCostDrag)} 成本货値对冲退货损耗`,
      urgency: returnRate > 0.20 ? 'high' : 'medium',
    });
  }
  if (plannedPairs !== null) {
    derivedOTB.push({
      action: '投入双数估算',
      category: '全渠道',
      wave: '全年',
      amount: costOTB ?? 0,
      skuCount: plannedPairs,
      reason: `成本OTB ${formatMoneyCny(costOTB ?? 0)} ÷ 年均成本 ¥${avgCostAll.toFixed(0)}/双 ≈ ${plannedPairs.toLocaleString()} 双`,
      urgency: 'low',
    });
  }

  if (!result) return <div className="text-slate-400 text-xs p-4">加载中…</div>;

  const totalAdd    = derivedOTB.filter(o => o.amount > 0).reduce((s, o) => s + o.amount, 0);
  const totalFreeze = Math.abs(derivedOTB.filter(o => o.amount < 0).reduce((s, o) => s + o.amount, 0));
  const addSkus     = derivedOTB.filter(o => o.action === '追加采购').reduce((s, o) => s + o.skuCount, 0);
  const cutSkus     = derivedOTB.filter(o => o.action.includes('冻结') || o.action.includes('减少')).reduce((s, o) => s + o.skuCount, 0);
  const netCash     = totalAdd - totalFreeze;
  const inventoryCutPairs = budgetGap !== null && budgetGap > 0 ? Math.round(budgetGap * 0.4 / avgCostAll) : 0;
  const inventoryAddPairs = budgetGap !== null && budgetGap < 0 ? Math.round(Math.abs(budgetGap) * 0.5 / avgCostAll) : 0;
  const marginImpact = budgetGap !== null && budgetGap < 0
    ? Math.abs(budgetGap) * markupRate * discountRate * 0.5
    : (costOTB ?? 0) * markupRate * discountRate * 0.05;

  return (
    <div className="space-y-4">
      {/* 汇总看板 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '建议增加OTB', value: formatMoneyCny(totalAdd), tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: '建议冻结OTB', value: formatMoneyCny(totalFreeze), tone: 'text-rose-700 bg-rose-50 border-rose-200' },
          { label: '追加采购SKU', value: `${addSkus} 款`, tone: 'text-sky-700 bg-sky-50 border-sky-200' },
          { label: '减少采购SKU', value: `${cutSkus} 款`, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
        ].map(item => (
          <div key={item.label} className={`border rounded-xl px-4 py-3 ${item.tone}`}>
            <div className="text-[10px] opacity-70 mb-0.5">{item.label}</div>
            <div className="text-lg font-bold">{item.value}</div>
          </div>
        ))}
      </div>

      {/* 影响预览 */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-slate-400 mb-0.5">净现金变化</div>
          <div className={`font-bold ${netCash > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {netCash > 0 ? '+' : ''}{formatMoneyCny(netCash)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
            <div className="text-slate-400 mb-0.5">预计库存影响</div>
            <div className="font-bold text-sky-600">
                {inventoryCutPairs > 0 ? `-${inventoryCutPairs.toLocaleString()} 双`
                 : inventoryAddPairs > 0 ? `+${inventoryAddPairs.toLocaleString()} 双`
                 : '持平'}
            </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
            <div className="text-slate-400 mb-0.5">预计毛利影响</div>
            <div className="font-bold text-emerald-600">{formatMoneyCny(marginImpact)}</div>
        </div>
      </div>

      {/* 建议明细 */}
      <div className="space-y-2">
        {derivedOTB.map((item, i) => {
          const style = URGENCY_STYLE[item.urgency];
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
              <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${style.badge}`}>{item.action}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700">{item.category} · {item.wave}</div>
                <div className="text-[10px] text-slate-400">{item.reason}</div>
              </div>
              <div className={`text-sm font-bold shrink-0 ${item.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {item.amount > 0 ? '+' : ''}{formatMoneyCny(item.amount)}
              </div>
              <button
                onClick={onJumpToOtb}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors shrink-0">
                → OTB
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
