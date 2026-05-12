'use client';
import type { CashPnlLinkage } from '@/types/pnlDecisionTypes';
import { fmtM } from '@/types/pnlDecisionTypes';

interface Props {
  linkage: CashPnlLinkage;
  onNavigate?: (module: string) => void;
}

export default function PnlCashLinkage({ linkage, onNavigate }: Props) {
  const {
    accountingNetProfit, operatingCashflow, inventoryCashTied,
    purchasePayment, clearanceCashback, accountsReceivable, cashGap,
    conclusion, drivers, otbRecommendation,
  } = linkage;

  const handleNavigate = (mod: string) => {
    if (onNavigate) { onNavigate(mod); return; }
    const tabBtn = document.querySelector(`[data-tab-key="${mod}"]`) as HTMLButtonElement | null;
    if (tabBtn) tabBtn.click();
  };

  const waterfall = [
    { label: '账面净利润', value: accountingNetProfit, base: 0, isStart: true },
    { label: '库存占用', value: -inventoryCashTied, delta: -inventoryCashTied },
    { label: '采购付款', value: -purchasePayment, delta: -purchasePayment },
    { label: '折旧摊销加回', value: 1218000, delta: 1218000 },
    { label: '清仓回款', value: clearanceCashback, delta: clearanceCashback },
    { label: '应收账款', value: -accountsReceivable, delta: -accountsReceivable },
    { label: '经营现金流', value: operatingCashflow, isEnd: true },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm text-center">
          <div className="text-[10px] text-slate-400 mb-1">账面净利润</div>
          <div className="text-base font-bold text-emerald-600">{fmtM(accountingNetProfit)}</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm text-center">
          <div className="text-[10px] text-slate-400 mb-1">经营现金流</div>
          <div className={`text-base font-bold ${operatingCashflow < accountingNetProfit * 0.6 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtM(operatingCashflow)}</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm text-center">
          <div className="text-[10px] text-slate-400 mb-1">库存占用现金</div>
          <div className="text-base font-bold text-rose-600">-{fmtM(inventoryCashTied)}</div>
        </div>
        <div className={`rounded-xl px-4 py-3 shadow-sm text-center border ${cashGap < 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className="text-[10px] text-slate-400 mb-1">现金缺口</div>
          <div className={`text-base font-bold ${cashGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtM(cashGap)}</div>
        </div>
      </div>

      {/* 利润→现金差异驱动因子 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <h4 className="text-xs font-bold text-slate-700 mb-3">利润→现金差异拆解</h4>
        <div className="space-y-2">
          {waterfall.map((item, i) => {
            const isDelta = !item.isStart && !item.isEnd;
            const isNeg = (item.delta ?? 0) < 0;
            return (
              <div key={i} className={`flex items-center gap-3 text-[11px] ${item.isEnd ? 'border-t border-slate-200 pt-2 mt-2' : ''}`}>
                <div className={`w-32 shrink-0 font-${item.isStart || item.isEnd ? 'bold' : 'medium'} text-slate-700`}>
                  {item.label}
                </div>
                <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden relative">
                  {isDelta ? (
                    <div
                      className={`absolute inset-y-0 rounded-full ${isNeg ? 'bg-rose-300' : 'bg-emerald-300'}`}
                      style={{ width: `${Math.min(100, Math.abs(item.delta ?? 0) / 15000000 * 100)}%`, left: isNeg ? 'auto' : '0', right: isNeg ? '0' : 'auto' }}
                    />
                  ) : (
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${item.isStart ? 'bg-emerald-400' : item.value > 0 ? 'bg-emerald-400' : 'bg-amber-300'}`}
                      style={{ width: `${Math.min(100, Math.abs(item.value) / 15000000 * 100)}%` }}
                    />
                  )}
                </div>
                <div className={`w-24 text-right font-medium ${isDelta ? (isNeg ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-800'}`}>
                  {isDelta && ((item.delta ?? 0) >= 0 ? '+' : '')}{fmtM(isDelta ? (item.delta ?? 0) : item.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 驱动因子说明 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {drivers.map(d => (
          <div key={d.driver} className={`flex items-start gap-2 text-[11px] px-3 py-2 rounded-lg ${d.amount < 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
            <span className={`font-bold shrink-0 ${d.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{d.amount >= 0 ? '+' : ''}{fmtM(d.amount)}</span>
            <span className="text-slate-600"><b className="text-slate-700">{d.driver}</b>：{d.explanation}</span>
          </div>
        ))}
      </div>

      {/* 结论 + OTB建议 */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
        <p className="text-[12px] text-amber-800">{conclusion}</p>
        <div className="flex items-start gap-2">
          <p className="text-[11px] text-amber-700 flex-1">{otbRecommendation}</p>
          <button
            onClick={() => handleNavigate('otb')}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors shrink-0 font-medium"
          >
            → 前往OTB
          </button>
        </div>
      </div>
    </div>
  );
}
