'use client';
import { useState } from 'react';
import type { WaveContributionItem, PriceBandItem } from '@/types/pnlDecisionTypes';
import { fmtM, RISK_COLORS, RISK_BG } from '@/types/pnlDecisionTypes';

function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

type TabKey = 'wave' | 'priceBand' | 'category' | 'channel';

interface Props {
  waveContribution: WaveContributionItem[];
  priceBandContribution: PriceBandItem[];
}

function WaveTab({ data }: { data: WaveContributionItem[] }) {
  const maxSales = Math.max(...data.map(d => d.salesAmount));
  return (
    <div className="space-y-2">
      {data.map(wave => (
        <div key={wave.waveId} className={`rounded-xl border p-4 ${RISK_BG[wave.riskLevel]}`}>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-bold text-sm text-slate-800">{wave.waveName}</span>
                {wave.launchDate && <span className="text-[10px] text-slate-400">{wave.launchDate}</span>}
                <span className={`text-[10px] font-medium ${RISK_COLORS[wave.riskLevel]}`}>
                  {wave.riskLevel === 'critical' ? '🚨 紧急处理' : wave.riskLevel === 'high' ? '⚠ 高风险' : wave.riskLevel === 'medium' ? '⚡ 关注' : '✅ 健康'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${wave.netProfit < 0 ? 'bg-rose-400' : wave.riskLevel === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${(wave.salesAmount / maxSales) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{fmtM(wave.salesAmount)}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px]">
                {[
                  { l: '毛利率', v: pct(wave.grossMargin), warn: wave.grossMargin < 0.45 },
                  { l: '折扣率', v: pct(wave.discountRate), warn: wave.discountRate > 0.25 },
                  { l: '净利润', v: fmtM(wave.netProfit), warn: wave.netProfit < 0 },
                  { l: '净利率', v: pct(wave.netMargin), warn: wave.netMargin < 0 },
                  { l: 'ROI',    v: wave.roi.toFixed(1) + 'x', warn: wave.roi < 1.2 },
                  { l: '库存减值', v: fmtM(wave.inventoryWriteDown), warn: wave.inventoryWriteDown > 500000 },
                ].map(k => (
                  <div key={k.l} className="bg-white/70 rounded px-1.5 py-1 text-center">
                    <div className="text-slate-400">{k.l}</div>
                    <div className={`font-medium mt-0.5 ${k.warn ? 'text-rose-600' : 'text-slate-700'}`}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-xs px-2 py-1 rounded ${wave.netProfit < 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{wave.action}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PriceBandTab({ data }: { data: PriceBandItem[] }) {
  const maxSales = Math.max(...data.map(d => d.salesAmount));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[11px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-right">
            <th className="text-left py-2 px-3 font-medium">价格带</th>
            <th className="py-2 px-2 font-medium">销售额</th>
            <th className="py-2 px-2 font-medium">占比</th>
            <th className="py-2 px-2 font-medium">毛利率</th>
            <th className="py-2 px-2 font-medium">折扣率</th>
            <th className="py-2 px-2 font-medium">净利润</th>
            <th className="py-2 px-2 font-medium">净利率</th>
            <th className="py-2 px-2 font-medium">ROI</th>
            <th className="text-left py-2 px-3 font-medium">建议</th>
          </tr>
        </thead>
        <tbody>
          {data.map(pb => {
            const totalSales = data.reduce((s, d) => s + d.salesAmount, 0);
            const share = pb.salesAmount / totalSales;
            return (
              <tr key={pb.priceBand} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-800">{pb.label}</td>
                <td className="py-2 px-2 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pb.netProfit < 0 ? 'bg-rose-400' : 'bg-sky-400'}`}
                        style={{ width: `${(pb.salesAmount / maxSales) * 100}%` }} />
                    </div>
                    <span>{fmtM(pb.salesAmount)}</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right text-slate-400">{pct(share)}</td>
                <td className={`py-2 px-2 text-right font-medium ${pb.grossMargin >= 0.50 ? 'text-emerald-600' : pb.grossMargin >= 0.42 ? 'text-slate-600' : 'text-amber-600'}`}>{pct(pb.grossMargin)}</td>
                <td className={`py-2 px-2 text-right ${pb.discountRate > 0.25 ? 'text-rose-600' : 'text-slate-600'}`}>{pct(pb.discountRate)}</td>
                <td className={`py-2 px-2 text-right font-bold ${pb.netProfit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtM(pb.netProfit)}</td>
                <td className={`py-2 px-2 text-right ${pb.netMargin < 0 ? 'text-rose-600' : pb.netMargin < 0.05 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct(pb.netMargin)}</td>
                <td className={`py-2 px-2 text-right ${pb.roi < 1.2 ? 'text-rose-600' : pb.roi < 2.0 ? 'text-amber-600' : 'text-emerald-600'}`}>{pb.roi.toFixed(1)}x</td>
                <td className="py-2 px-3 text-slate-500 max-w-[120px]">{pb.action}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PnlContributionTabs({ waveContribution, priceBandContribution }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('wave');
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'wave', label: '波段利润' },
    { key: 'priceBand', label: '价格带利润' },
    { key: 'category', label: '品类利润' },
    { key: 'channel', label: '渠道利润' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all ${
              activeTab === tab.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'wave' && <WaveTab data={waveContribution} />}
      {activeTab === 'priceBand' && <PriceBandTab data={priceBandContribution} />}
      {(activeTab === 'category' || activeTab === 'channel') && (
        <div className="py-8 text-center text-slate-400 text-sm">
          该维度数据请查看下方品类/渠道诊断区域
        </div>
      )}
    </div>
  );
}
