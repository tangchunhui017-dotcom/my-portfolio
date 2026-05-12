'use client';
/**
 * src/components/inventory/InvFinancialImpact.tsx
 * 三方案财务影响对比
 */
import { useState } from 'react';
import type { FinancialImpactScenario } from '@/types/inventoryHealthTypes';
import { fmtK, pct } from '@/types/inventoryHealthTypes';

interface Props {
  data: FinancialImpactScenario[];
}

const SCENARIO_COLORS = ['#3b82f6', '#f97316', '#ef4444'];

export default function InvFinancialImpact({ data }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Markdown / 现金 / 毛利 — 三方案对比</h3>
        <p className="text-xs text-gray-500 mt-0.5">针对当前积压库存的三种处置方案财务测算</p>
      </div>
      <div className="px-5 py-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((s, i) => {
            const isSelected = selected === s.scenario;
            return (
              <button
                key={s.scenario}
                onClick={() => setSelected(isSelected ? null : s.scenario)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm" style={{ color: SCENARIO_COLORS[i] }}>方案 {s.scenario}</span>
                  <span className="text-xs text-gray-400">{s.estimatedWeeks}周清仓</span>
                </div>
                <div className="font-bold text-base text-gray-900 mb-0.5">{s.label}</div>
                <div className="text-xs text-gray-500 mb-3">{s.description}</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">预计销售金额</span>
                    <span className="font-semibold text-gray-900">{fmtK(s.estimatedSalesAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">现金回笼</span>
                    <span className="font-semibold text-green-600">{fmtK(s.estimatedCashRelease)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Markdown损失</span>
                    <span className="font-semibold text-red-500">-{fmtK(s.markdownLoss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">毛利率影响</span>
                    <span className={`font-semibold ${s.grossMarginImpact < -0.15 ? 'text-red-500' : 'text-orange-500'}`}>{pct(s.grossMarginImpact)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">库存释放</span>
                    <span className="font-semibold text-blue-600">{fmtK(s.inventoryRelease)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {selected && (() => {
          const s = data.find(d => d.scenario === selected);
          if (!s) return null;
          return (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm border border-blue-100">
              <p className="font-semibold text-blue-900 mb-1">方案 {s.scenario} · {s.label} — 推荐理由</p>
              <p className="text-blue-700 text-xs">
                预计现金回笼 <b>{fmtK(s.estimatedCashRelease)}</b>，
                Markdown损失 <b>{fmtK(s.markdownLoss)}</b>，
                清仓周期约 <b>{s.estimatedWeeks}周</b>，
                毛利率变动 <b>{pct(s.grossMarginImpact)}</b>。
                {s.scenario === 'A' && ' 保护毛利，但清仓速度慢，适合库龄<90天品。'}
                {s.scenario === 'B' && ' 平衡现金与损益，适合大部分积压。'}
                {s.scenario === 'C' && ' 最快释放现金，毛利损失最大，适合库龄>180天尾货。'}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
