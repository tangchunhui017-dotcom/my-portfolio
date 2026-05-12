'use client';
/**
 * ForecastOtbRecommendation.tsx
 * 预测 → OTB 建议模块
 */
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { useForecast } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';

interface OtbItem {
  action: string;
  category: string;
  wave: string;
  amount: number;
  skuCount: number;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

const MOCK_OTB: OtbItem[] = [
  { action: '增加OTB', category: '凉鞋', wave: 'W3', amount: 380000, skuCount: 8,  reason: '预测缺货风险，补充W3凉鞋OTB',  urgency: 'high' },
  { action: '冻结OTB', category: '靴子', wave: 'W4', amount: 210000, skuCount: 5,  reason: '靴子预测下调22%，冻结超额OTB', urgency: 'high' },
  { action: '追加采购', category: '运动鞋', wave: 'W2', amount: 280000, skuCount: 12, reason: '运动鞋持续低估，追加主力款深度', urgency: 'medium' },
  { action: '减少采购', category: '时装鞋', wave: 'W4', amount: -180000, skuCount: 6,  reason: '时装鞋高价带预测偏乐观，收缩采购', urgency: 'medium' },
];

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
  const result = useForecast(channel, scenario);
  if (!result) return <div className="text-slate-400 text-xs p-4">加载中…</div>;

  const totalAdd    = MOCK_OTB.filter(o => o.amount > 0).reduce((s, o) => s + o.amount, 0);
  const totalFreeze = Math.abs(MOCK_OTB.filter(o => o.amount < 0).reduce((s, o) => s + o.amount, 0));
  const addSkus     = MOCK_OTB.filter(o => o.action === '追加采购').reduce((s, o) => s + o.skuCount, 0);
  const cutSkus     = MOCK_OTB.filter(o => o.action === '减少采购').reduce((s, o) => s + o.skuCount, 0);
  const netCash     = totalAdd - totalFreeze;

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
          <div className="font-bold text-sky-600">+1,400 / -800 双</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-slate-400 mb-0.5">预计毛利影响</div>
          <div className="font-bold text-emerald-600">+¥216万</div>
        </div>
      </div>

      {/* 建议明细 */}
      <div className="space-y-2">
        {MOCK_OTB.map((item, i) => {
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
