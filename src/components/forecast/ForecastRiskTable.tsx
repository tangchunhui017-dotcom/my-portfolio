'use client';
/**
 * ForecastRiskTable.tsx
 * 预测风险 SKU / 品类表格 — 4 维度 × Top 10
 */
import { useState } from 'react';

type RiskView = 'stockout' | 'overstock' | 'deviation' | 'opportunity';

const VIEW_CONFIG: Record<RiskView, { label: string; icon: string; color: string }> = {
  stockout:    { label: 'Top10 缺货风险', icon: '🔴', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  overstock:   { label: 'Top10 积压风险', icon: '🟠', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  deviation:   { label: 'Top10 预测偏差', icon: '🟣', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  opportunity: { label: 'Top10 高增长机会', icon: '🟢', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

interface RiskRow {
  sku: string; style: string; category: string; wave: string; channel: string;
  lifecycle: string; forecastQty: number; actualQty: number; deviation: number;
  currentStock: number; wos: number; sizeComplete: number; stockoutDate?: string;
  eosStock: number; margin: number; riskLevel: '高' | '中' | '低'; action: string;
}

function genRows(view: RiskView): RiskRow[] {
  const cats = ['运动鞋', '凉鞋', '靴子', '休闲鞋', '时装鞋'];
  const channels = ['直营', '电商', '加盟', 'KA'];
  const rows: RiskRow[] = [];
  for (let i = 1; i <= 10; i++) {
    const cat = cats[i % cats.length];
    const ch  = channels[i % channels.length];
    const fq  = 800 + i * 120;
    const aq  = view === 'stockout'    ? fq * (0.6 + i * 0.02) :
                view === 'overstock'   ? fq * (0.3 + i * 0.02) :
                view === 'deviation'   ? fq * (1.2 + i * 0.03) :
                fq * (1.1 + i * 0.04);
    rows.push({
      sku: `SKU-${String(1000 + i * 17).padStart(5, '0')}`,
      style: `${cat}款式${i.toString().padStart(2, '0')}`,
      category: cat, wave: `W${(i % 4) + 1}`, channel: ch,
      lifecycle: i % 3 === 0 ? '新品' : i % 3 === 1 ? '延续款' : '清货',
      forecastQty: fq, actualQty: Math.round(aq),
      deviation: parseFloat(((aq - fq) / fq * 100).toFixed(1)),
      currentStock: Math.round(fq * (view === 'stockout' ? 0.4 : 1.8)),
      wos: parseFloat((view === 'stockout' ? 2.5 + i * 0.3 : 18 - i * 0.5).toFixed(1)),
      sizeComplete: view === 'stockout' ? 72 + i : 88 + i % 8,
      stockoutDate: view === 'stockout' ? `2026-0${5 + Math.floor(i / 4)}-${10 + i * 2}` : undefined,
      eosStock: Math.round(fq * (view === 'overstock' ? 0.6 - i * 0.04 : 0.1 + i * 0.01)),
      margin: 38 + i * 1.5,
      riskLevel: i <= 3 ? '高' : i <= 7 ? '中' : '低',
      action: view === 'stockout' ? '紧急补货' : view === 'overstock' ? '加速去化' : view === 'deviation' ? '重新校准预测' : '增加资源',
    });
  }
  return rows;
}

const RISK_BADGE: Record<string, string> = {
  高: 'bg-rose-100 text-rose-700', 中: 'bg-amber-100 text-amber-700', 低: 'bg-slate-100 text-slate-500',
};

export default function ForecastRiskTable() {
  const [view, setView] = useState<RiskView>('stockout');
  const rows = genRows(view);
  const cfg  = VIEW_CONFIG[view];

  return (
    <div className="space-y-3">
      {/* 视图切换 */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(VIEW_CONFIG) as [RiskView, typeof VIEW_CONFIG[RiskView]][]).map(([key, v]) => (
          <button key={key}
            onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              view === key ? v.color + ' shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
            }`}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['SKU', '款式', '品类', '波段', '渠道', '周期', '预测量', '实际量', '偏差', '库存', 'WOS', '尺码率', '缺货日', '季末库', '毛利率', '风险', '建议'].map(h => (
                <th key={h} className="px-2 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-2 py-2 font-mono text-slate-600">{row.sku}</td>
                <td className="px-2 py-2 text-slate-700">{row.style}</td>
                <td className="px-2 py-2 text-slate-500">{row.category}</td>
                <td className="px-2 py-2 text-slate-500">{row.wave}</td>
                <td className="px-2 py-2 text-slate-500">{row.channel}</td>
                <td className="px-2 py-2 text-slate-500">{row.lifecycle}</td>
                <td className="px-2 py-2 text-slate-700">{row.forecastQty.toLocaleString()}</td>
                <td className="px-2 py-2 text-slate-700">{row.actualQty.toLocaleString()}</td>
                <td className={`px-2 py-2 font-medium ${row.deviation > 0 ? 'text-purple-600' : 'text-sky-600'}`}>
                  {row.deviation > 0 ? '+' : ''}{row.deviation}%
                </td>
                <td className="px-2 py-2 text-slate-700">{row.currentStock.toLocaleString()}</td>
                <td className={`px-2 py-2 font-medium ${row.wos < 4 ? 'text-rose-600' : row.wos > 16 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {row.wos}w
                </td>
                <td className={`px-2 py-2 ${row.sizeComplete < 85 ? 'text-rose-600' : 'text-slate-600'}`}>
                  {row.sizeComplete}%
                </td>
                <td className="px-2 py-2 text-slate-400">{row.stockoutDate ?? '—'}</td>
                <td className="px-2 py-2 text-slate-500">{row.eosStock.toLocaleString()}</td>
                <td className="px-2 py-2 text-slate-600">{row.margin.toFixed(1)}%</td>
                <td className="px-2 py-2">
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${RISK_BADGE[row.riskLevel]}`}>{row.riskLevel}</span>
                </td>
                <td className="px-2 py-2 text-sky-600 whitespace-nowrap">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
