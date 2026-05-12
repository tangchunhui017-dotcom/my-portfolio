'use client';
/**
 * DupontTree.tsx — S10 DuPont + ROE拆解 + 行业对标
 */
import { useState } from 'react';
import dupontRaw from '../../../data/planning/pnl_dupont_analysis.json';
import benchRaw from '../../../data/planning/pnl_industry_benchmark.json';

type DupontData = typeof dupontRaw;
type BenchData = typeof benchRaw;
const dData = dupontRaw as DupontData;
const bData = benchRaw as BenchData;

function pct(v: number, d = 1) { return (v * 100).toFixed(d) + '%'; }
function fmt2(v: number) { return v.toFixed(2) + 'x'; }

type ViewTab = 'tree' | 'benchmark';

export default function DupontTree() {
  const [tab, setTab] = useState<ViewTab>('tree');
  const c = dData.current;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['tree', '杜邦树状分析'], ['benchmark', '行业对标']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'tree' && (
        <div className="space-y-4">
          {/* ROE 大数 */}
          <div className="bg-gradient-to-br from-violet-50 to-sky-50 border border-violet-200 rounded-2xl p-5">
            <div className="text-center mb-4">
              <div className="text-[11px] text-violet-500 font-medium">ROE = 净利率 × 资产周转率 × 权益乘数</div>
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                <div className="text-center">
                  <div className="text-2xl font-black text-violet-700">{pct(c.roe)}</div>
                  <div className="text-[10px] text-violet-500">ROE</div>
                </div>
                <div className="text-slate-400 text-lg">=</div>
                <div className="text-center">
                  <div className="text-xl font-black text-sky-700">{pct(c.netMargin)}</div>
                  <div className="text-[10px] text-sky-500">净利率</div>
                </div>
                <div className="text-slate-400">×</div>
                <div className="text-center">
                  <div className="text-xl font-black text-emerald-700">{fmt2(c.assetTurnover)}</div>
                  <div className="text-[10px] text-emerald-500">资产周转率</div>
                </div>
                <div className="text-slate-400">×</div>
                <div className="text-center">
                  <div className="text-xl font-black text-amber-700">{fmt2(c.equityMultiplier)}</div>
                  <div className="text-[10px] text-amber-500">权益乘数</div>
                </div>
              </div>
            </div>
          </div>

          {/* 三维拆解 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 净利率拆解 */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-sky-800">净利率 {pct(c.netMargin)}</div>
              <div className="text-[10px] text-sky-600">净利润 / 净收入</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>净收入</span><span>¥{(c.netRevenue / 1e4).toFixed(0)}万</span>
                </div>
                {dData.netMarginBreakdown.costDrivers.map(cd => (
                  <div key={cd.item} className="flex justify-between text-slate-600">
                    <span>{cd.item}</span>
                    <span className="text-rose-600">{pct(Math.abs(cd.impact))}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-sky-700 border-t border-sky-200 pt-1">
                  <span>净利率</span><span>{pct(c.netMargin)}</span>
                </div>
              </div>
            </div>

            {/* 资产周转率 */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-emerald-800">资产周转率 {fmt2(c.assetTurnover)}</div>
              <div className="text-[10px] text-emerald-600">净收入 / 总资产</div>
              <div className="space-y-1.5 text-[11px]">
                {[
                  { l: '库存周转率', v: fmt2(dData.assetTurnoverBreakdown.inventoryTurnover) },
                  { l: '应收周转率', v: fmt2(dData.assetTurnoverBreakdown.receivableTurnover) },
                  { l: '总资产周转率', v: fmt2(dData.assetTurnoverBreakdown.totalAssetTurnover), bold: true },
                ].map(k => (
                  <div key={k.l} className={`flex justify-between ${k.bold ? 'font-bold text-emerald-700 border-t border-emerald-200 pt-1' : 'text-slate-700'}`}>
                    <span>{k.l}</span><span>{k.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 杠杆 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-amber-800">权益乘数 {fmt2(c.equityMultiplier)}</div>
              <div className="text-[10px] text-amber-600">总资产 / 所有者权益</div>
              <div className="space-y-1.5 text-[11px]">
                {[
                  { l: '流动比率', v: dData.leverageBreakdown.currentRatio.toFixed(2) + 'x' },
                  { l: '资产负债率', v: pct(dData.leverageBreakdown.debtToEquity) },
                  { l: '利息保障倍数', v: dData.leverageBreakdown.interestCoverage.toFixed(1) + 'x' },
                ].map(k => (
                  <div key={k.l} className="flex justify-between text-slate-700">
                    <span>{k.l}</span><span className="font-medium">{k.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 text-[11px] text-violet-700">
            💡 {dData.insight}
          </div>
        </div>
      )}

      {tab === 'benchmark' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2 px-3 font-medium text-slate-500">公司</th>
                  {bData.kpiList.map(k => (
                    <th key={k.key} className="text-right py-2 px-3 font-medium text-slate-500">{k.label}</th>
                  ))}
                  <th className="text-left py-2 px-3 font-medium text-slate-500">备注</th>
                </tr>
              </thead>
              <tbody>
                {bData.companies.map(co => {
                  const isSelf = (co as { isSelf?: boolean }).isSelf;
                  return (
                    <tr key={co.id}
                      className={`border-b border-slate-50 ${isSelf ? 'bg-violet-50 font-bold' : 'hover:bg-slate-50'}`}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: co.color }} />
                          <span className={`${isSelf ? 'text-violet-700 font-bold' : 'text-slate-700'}`}>{co.label}</span>
                          {isSelf && <span className="text-[9px] bg-violet-200 text-violet-700 px-1 rounded">本品牌</span>}
                        </div>
                      </td>
                      {bData.kpiList.map(k => {
                        const val = (co as unknown as Record<string, number>)[k.key];
                        const self = bData.companies.find(c => (c as { isSelf?: boolean }).isSelf);
                        const selfVal = self ? (self as unknown as Record<string, number>)[k.key] : 0;
                        const isAboveSelf = val > selfVal;
                        return (
                          <td key={k.key} className={`text-right py-2 px-3 ${
                            isSelf ? 'text-violet-700' : isAboveSelf ? 'text-emerald-600' : 'text-slate-600'
                          }`}>
                            {k.format === 'pct' ? pct(val) : k.format === 'times' ? val.toFixed(1) + 'x' : val}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-[10px] text-slate-400">{(co as { note?: string }).note ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-slate-400 px-1">数据来源：{bData.source}</div>
        </div>
      )}
    </div>
  );
}
