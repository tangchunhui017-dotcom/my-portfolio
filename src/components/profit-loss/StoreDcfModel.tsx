'use client';
/**
 * StoreDcfModel.tsx — S16 单店长期投资回报模型（DCF/IRR/NPV）
 */
import { useState, useMemo } from 'react';
import dcfRaw from '../../../data/planning/store_dcf_assumptions.json';
import { calcStoreDcf } from '@/utils/pnlV11';

type DcfData = typeof dcfRaw;
const dcfData = dcfRaw as DcfData;

function fmtM(v: number) {
  const s = v < 0 ? '-' : ''; const a = Math.abs(v);
  if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
  return s + '¥' + a.toLocaleString();
}
function pct(v: number, d = 1) { return (v * 100).toFixed(d) + '%'; }

export default function StoreDcfModel() {
  const [selectedTemplate, setSelectedTemplate] = useState(dcfData.storeTemplates[0].key);
  const [discountRate, setDiscountRate] = useState(dcfData.discountRate);
  const [terminalGrowth, setTerminalGrowth] = useState(dcfData.terminalGrowthRate);

  const template = dcfData.storeTemplates.find(t => t.key === selectedTemplate) ?? dcfData.storeTemplates[0];

  const annualCashFlows = useMemo(() => {
    return template.annualRevenueGrowthRate.map((_, i) => {
      const monthlyRev = template.monthlyRevenue[i] ?? template.monthlyRevenue[template.monthlyRevenue.length - 1];
      const annualRev = monthlyRev * 12;
      const grossProfit = annualRev * template.grossMarginRate;
      const totalOpex = template.fixedCostsPerMonth * 12 + annualRev * template.variableCostRate;
      return grossProfit - totalOpex;
    });
  }, [template]);

  const result = useMemo(() => calcStoreDcf({
    initialInvestment: template.initialInvestment,
    annualCashFlows,
    discountRate,
    terminalGrowthRate: terminalGrowth,
  }), [template, annualCashFlows, discountRate, terminalGrowth]);

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-slate-500 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
        📊 5年现金流贴现模型（DCF）— 帮助财务/老板决策"开店投资是否值得"
      </div>

      {/* 店型选择 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {dcfData.storeTemplates.map(t => (
          <button key={t.key} onClick={() => setSelectedTemplate(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedTemplate === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* KPI结果 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'NPV（净现值）', v: fmtM(result.npv), tone: result.npv > 0 ? 'positive' : 'negative' },
          { l: 'IRR（内部收益率）', v: pct(result.irr), tone: result.irr > discountRate ? 'positive' : 'negative' },
          { l: '回收期', v: result.paybackYears < 99 ? result.paybackYears.toFixed(1) + '年' : '未回本', tone: result.paybackYears <= 4 ? 'positive' : 'warning' },
          { l: '终值（TV）', v: fmtM(result.terminalValue), tone: 'neutral' },
        ].map(k => (
          <div key={k.l} className={`rounded-xl border px-3 py-3 text-center ${
            k.tone === 'positive' ? 'bg-emerald-50 border-emerald-200' :
            k.tone === 'negative' ? 'bg-rose-50 border-rose-200' :
            k.tone === 'warning' ? 'bg-amber-50 border-amber-200' :
            'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-[10px] text-slate-400 mb-1">{k.l}</div>
            <div className={`text-sm font-black ${
              k.tone === 'positive' ? 'text-emerald-700' : k.tone === 'negative' ? 'text-rose-700' : k.tone === 'warning' ? 'text-amber-700' : 'text-slate-700'
            }`}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* 年度现金流 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-600">5年年度现金流</div>
        <table className="min-w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-50">
              {['年度', '月均收入', '年度现金流', '贴现系数', '现值'].map(h => (
                <th key={h} className={`py-2 px-3 text-slate-400 font-medium ${h === '年度' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {annualCashFlows.map((cf, i) => {
              const factor = 1 / Math.pow(1 + discountRate, i + 1);
              const pv = cf * factor;
              const mRev = template.monthlyRevenue[i] ?? template.monthlyRevenue[template.monthlyRevenue.length - 1];
              return (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-700">第{i + 1}年</td>
                  <td className="text-right py-2 px-3">{fmtM(mRev)}</td>
                  <td className={`text-right py-2 px-3 font-medium ${cf >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtM(cf)}</td>
                  <td className="text-right py-2 px-3 text-slate-400">{factor.toFixed(3)}</td>
                  <td className={`text-right py-2 px-3 font-bold ${pv >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{fmtM(pv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 参数调整 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="text-xs font-bold text-slate-700 mb-3">模型参数</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">折现率 (WACC)</label>
            <input type="range" min={0.06} max={0.20} step={0.01} value={discountRate}
              onChange={e => setDiscountRate(Number(e.target.value))}
              className="w-full h-1.5 accent-sky-500" />
            <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
              <span>6%</span><span className="font-bold text-sky-600">{pct(discountRate)}</span><span>20%</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">永续增长率</label>
            <input type="range" min={0.00} max={0.05} step={0.005} value={terminalGrowth}
              onChange={e => setTerminalGrowth(Number(e.target.value))}
              className="w-full h-1.5 accent-emerald-500" />
            <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
              <span>0%</span><span className="font-bold text-emerald-600">{pct(terminalGrowth)}</span><span>5%</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-xl px-3 py-2.5 text-[11px] ${result.npv > 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
        {result.npv > 0
          ? `✅ 投资可行：NPV = ${fmtM(result.npv)}（正值），IRR(${pct(result.irr)}) > 折现率(${pct(discountRate)})，${result.paybackYears.toFixed(1)}年可回收投资。`
          : `⚠️ 投资谨慎：NPV = ${fmtM(result.npv)}（负值），建议降低初始投入或提升月均收入。`
        }
      </div>
    </div>
  );
}
