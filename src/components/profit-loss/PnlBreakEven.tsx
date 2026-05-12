'use client';
import type { BreakEvenAnalysis } from '@/types/pnlDecisionTypes';
import { fmtM, RISK_COLORS, RISK_BG } from '@/types/pnlDecisionTypes';

function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

interface Props {
  breakEven: BreakEvenAnalysis;
}

function SafetyBar({ current, target }: { current: number; target: number }) {
  const max = Math.max(current, target) * 1.2;
  const currentPct = Math.min(100, (current / max) * 100);
  const targetPct = Math.min(100, (target / max) * 100);
  const isAbove = current >= target;
  return (
    <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden mt-1">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-slate-200"
        style={{ width: `${targetPct}%` }}
      />
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${isAbove ? 'bg-emerald-400' : 'bg-rose-400'}`}
        style={{ width: `${currentPct}%` }}
      />
      <div
        className="absolute inset-y-0 w-0.5 bg-slate-400"
        style={{ left: `${targetPct}%` }}
        title={`保本线 ${fmtM(target)}`}
      />
    </div>
  );
}

export default function PnlBreakEven({ breakEven }: Props) {
  const { brand, channels, categories } = breakEven;

  return (
    <div className="space-y-6">
      {/* 品牌整体保本 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">品牌整体保本分析</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 mb-1">保本销售额</div>
            <div className="font-bold text-slate-800">{fmtM(brand.breakEvenSales)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-400 mb-1">实际销售额</div>
            <div className={`font-bold ${brand.currentSales >= brand.breakEvenSales ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtM(brand.currentSales)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-400 mb-1">安全边际</div>
            <div className={`font-bold ${brand.safetyMargin >= 0.10 ? 'text-emerald-600' : 'text-amber-600'}`}>{pct(brand.safetyMargin)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-400 mb-1">保本所需毛利率</div>
            <div className="font-bold text-slate-700">{pct(brand.breakEvenMargin)}</div>
          </div>
        </div>
        <SafetyBar current={brand.currentSales} target={brand.breakEvenSales} />
        <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
          <span>保本线 {fmtM(brand.breakEvenSales)}</span>
          <span>超出保本 {fmtM(brand.gapAmount)}，保本于 {brand.estimatedBreakEvenMonth}</span>
        </div>
      </div>

      {/* 渠道保本 */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">渠道保本分析</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {channels.map(ch => (
            <div key={ch.channel} className={`rounded-xl border p-4 ${RISK_BG[ch.riskLevel]}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-slate-800">{ch.label}</span>
                <span className={`text-[11px] font-bold ${RISK_COLORS[ch.riskLevel]}`}>
                  安全边际 {ch.safetyMargin >= 0 ? '+' : ''}{pct(ch.safetyMargin)}
                </span>
              </div>
              <SafetyBar current={ch.currentSales} target={ch.breakEvenSales} />
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>保本 {fmtM(ch.breakEvenSales)}</span>
                <span>实际 {fmtM(ch.currentSales)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 品类保本 */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">品类保本分析</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-right">
                <th className="text-left py-2 px-3 font-medium">品类</th>
                <th className="py-2 px-2 font-medium">保本销售额</th>
                <th className="py-2 px-2 font-medium">实际销售额</th>
                <th className="py-2 px-2 font-medium">安全边际</th>
                <th className="text-left py-2 px-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.category} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-800">{cat.label}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{fmtM(cat.breakEvenSales)}</td>
                  <td className={`py-2 px-2 text-right font-medium ${cat.currentSales >= cat.breakEvenSales ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtM(cat.currentSales)}</td>
                  <td className={`py-2 px-2 text-right font-bold ${cat.safetyMargin >= 0.10 ? 'text-emerald-600' : cat.safetyMargin >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {cat.safetyMargin >= 0 ? '+' : ''}{pct(cat.safetyMargin)}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      cat.riskLevel === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                      cat.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                      cat.riskLevel === 'critical' ? 'bg-rose-200 text-rose-800' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {cat.riskLevel === 'healthy' ? '盈利' : cat.riskLevel === 'critical' ? '亏损严重' : cat.riskLevel === 'high' ? '未保本' : '接近保本'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
