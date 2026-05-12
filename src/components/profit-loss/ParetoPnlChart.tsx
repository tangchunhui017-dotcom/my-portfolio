'use client';
/**
 * ParetoPnlChart.tsx — S6b 80/20核心款vs长尾款 + 分销结构P&L
 */
import { useState } from 'react';
import paretoRaw from '../../../data/planning/pnl_pareto_distribution.json';

type ParetoData = typeof paretoRaw;
const pData = paretoRaw as ParetoData;

function fmtM(v: number) {
  const s = v < 0 ? '-' : ''; const a = Math.abs(v);
  if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
  return s + '¥' + a.toLocaleString();
}
function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

type ViewTab = 'pareto' | 'distribution';

const RISK_BG: Record<string, string> = {
  healthy: 'border-emerald-200 bg-emerald-50/40',
  medium: 'border-amber-200 bg-amber-50/30',
  high: 'border-rose-200 bg-rose-50/30',
};
const RISK_TEXT: Record<string, string> = {
  healthy: 'text-emerald-700', medium: 'text-amber-700', high: 'text-rose-700',
};

export default function ParetoPnlChart() {
  const [tab, setTab] = useState<ViewTab>('pareto');
  const p = pData.pareto;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['pareto', '80/20 核心款'], ['distribution', '分销结构 P&L']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'pareto' && (
        <div className="space-y-4">
          {/* 帕累托图 */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="text-xs font-bold text-slate-700 mb-3">Top 20% SKU 贡献 80%+ 利润（Pareto验证）</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { l: 'Core SKU数', v: `${p.coreSkuCount} / ${p.totalSkuCount}`, sub: '占总SKU ' + pct(p.coreSkuPct) },
                { l: '核心款收入占比', v: pct(p.coreRevenuePct), tone: 'positive' },
                { l: '核心款利润占比', v: pct(p.coreProfitPct), tone: 'positive' },
                { l: '核心款贡献利润率', v: pct(p.coreContributionProfitRate), tone: 'positive' },
              ].map(k => (
                <div key={k.l} className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
                  <div className="text-[10px] text-slate-400 mb-0.5">{k.l}</div>
                  <div className={`text-sm font-black ${k.tone === 'positive' ? 'text-emerald-700' : 'text-slate-800'}`}>{k.v}</div>
                  {k.sub && <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>}
                </div>
              ))}
            </div>
            {/* 双列对比 */}
            <div className="grid grid-cols-2 gap-4 text-[11px] mb-3">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="font-bold text-emerald-800 mb-2">核心款（Top 20% SKU）</div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>净收入</span><span className="font-medium">{fmtM(p.coreNetRevenue)}</span></div>
                  <div className="flex justify-between"><span>总运营费用</span><span className="font-medium">{fmtM(p.coreTotalOpex)}</span></div>
                  <div className="flex justify-between"><span className="font-bold">贡献利润</span><span className="font-black text-emerald-700">{fmtM(p.coreContributionProfit)}</span></div>
                  <div className="flex justify-between"><span>贡献利润率</span><span className="text-emerald-700 font-bold">{pct(p.coreContributionProfitRate)}</span></div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="font-bold text-slate-700 mb-2">长尾款（Bottom 80% SKU）</div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>净收入</span><span className="font-medium">{fmtM(p.tailNetRevenue)}</span></div>
                  <div className="flex justify-between"><span>总运营费用</span><span className="font-medium">{fmtM(p.tailTotalOpex)}</span></div>
                  <div className="flex justify-between"><span className="font-bold">贡献利润</span><span className="font-black text-slate-800">{fmtM(p.tailContributionProfit)}</span></div>
                  <div className="flex justify-between"><span>贡献利润率</span><span className="text-amber-600 font-bold">{pct(p.tailContributionProfitRate)}</span></div>
                </div>
              </div>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 text-[11px] text-sky-700">
              💡 {p.decision}
            </div>
          </div>
          {/* Top核心款表格 */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-100">Top 核心款明细</div>
            <table className="min-w-full text-[11px]">
              <thead><tr className="border-b border-slate-50 bg-slate-50/50">
                {['SKU', '款式名', '销售额', '毛利率', '贡献利润'].map(h => (
                  <th key={h} className={`py-2 px-3 font-medium text-slate-400 ${h === 'SKU' || h === '款式名' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{p.topCoreSkus.map(s => (
                <tr key={s.skuId} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-slate-500">{s.skuId}</td>
                  <td className="py-2 px-3 font-medium text-slate-800">{s.label}</td>
                  <td className="text-right py-2 px-3">{fmtM(s.salesAmount)}</td>
                  <td className={`text-right py-2 px-3 font-bold ${s.grossMarginRate >= 0.5 ? 'text-emerald-700' : 'text-amber-700'}`}>{pct(s.grossMarginRate)}</td>
                  <td className="text-right py-2 px-3 font-bold text-emerald-700">{fmtM(s.contributionProfit)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'distribution' && (
        <div className="space-y-3">
          {pData.distribution.map(ch => (
            <div key={ch.channel} className={`rounded-2xl border p-4 ${RISK_BG[ch.riskLevel] ?? 'bg-white border-slate-100'}`}>
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div>
                  <span className="font-bold text-sm text-slate-800">{ch.label}</span>
                  <span className="ml-2 text-[10px] text-slate-400">净收入 {fmtM(ch.netRevenue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-1 rounded font-bold ${RISK_TEXT[ch.riskLevel]}`}>
                    贡献利润率 {pct(ch.contributionProfitRate)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-2">
                {[
                  { l: '净收入', v: fmtM(ch.netRevenue) },
                  { l: '毛利率', v: pct(ch.grossMarginRate) },
                  { l: '贡献利润', v: fmtM(ch.contributionProfit), bold: true },
                  { l: '运营费用', v: fmtM(ch.totalOpex) },
                ].map(k => (
                  <div key={k.l} className="bg-white/60 rounded-lg px-2 py-1.5 text-center">
                    <div className="text-[10px] text-slate-400">{k.l}</div>
                    <div className={`font-${k.bold ? 'bold' : 'medium'} text-slate-700 mt-0.5`}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-1">
                <p className="text-[11px] text-slate-500">{ch.verdict}</p>
                <span className="text-[10px] text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-full">{ch.action}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
