'use client';
/**
 * src/components/inventory/InvScenarioMixer.tsx
 * S13增强: 三方案组合推演 + KPI影响 (V10)
 */
import { useState } from 'react';
import type { FinancialImpactScenario } from '@/types/inventoryHealthTypes';
import { fmtK, pct } from '@/types/inventoryHealthTypes';

interface Props {
  data: FinancialImpactScenario[];
  onApplyToOtb?: () => void;
}

const SCENARIO_COLORS = ['#3b82f6', '#f97316', '#ef4444'];
const MONTHS = ['6月', '7月', '8月', '9月', '10月', '11月'];

export default function InvScenarioMixer({ data, onApplyToOtb }: Props) {
  const [mixRatios, setMixRatios] = useState<number[]>([70, 20, 10]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const total = mixRatios.reduce((s, v) => s + v, 0);

  function updateRatio(idx: number, val: number) {
    const newRatios = [...mixRatios];
    newRatios[idx] = Math.max(0, Math.min(100, val));
    setMixRatios(newRatios);
  }

  // 组合方案推演
  const mixedCashRelease = data.reduce((s, sc, i) => s + sc.estimatedCashRelease * (mixRatios[i] ?? 0) / 100, 0);
  const mixedMarkdownLoss = data.reduce((s, sc, i) => s + sc.markdownLoss * (mixRatios[i] ?? 0) / 100, 0);
  const mixedMarginImpact = data.reduce((s, sc, i) => s + sc.grossMarginImpact * (mixRatios[i] ?? 0) / 100, 0);

  const kpiImpact = {
    wos: { before: 9.2, after: 7.4 },
    healthyPct: { before: 0.38, after: 0.53 },
    cashRelease: mixedCashRelease,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Markdown / 现金 / 毛利三方案</h3>
        <p className="text-xs text-gray-400 mt-0.5">组合模式：A/B/C 方案按比例混合执行</p>
      </div>

      {/* 三方案卡片 */}
      <div className="px-5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((s, i) => (
          <button key={s.scenario}
            onClick={() => setSelectedScenario(selectedScenario === s.scenario ? null : s.scenario)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${selectedScenario === s.scenario ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm" style={{ color: SCENARIO_COLORS[i] }}>方案 {s.scenario}</span>
              <span className="text-xs text-gray-400">{s.estimatedWeeks}周</span>
            </div>
            <div className="font-bold text-sm text-gray-900 mb-1">{s.label}</div>
            <div className="text-xs text-gray-500 mb-3">{s.description}</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">现金回笼</span>
                <span className="font-semibold text-emerald-600">{fmtK(s.estimatedCashRelease)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">毛利损失</span>
                <span className="font-semibold text-red-500">{fmtK(Math.abs(s.markdownLoss))}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 组合比例调节 */}
      <div className="px-5 py-4 border-t border-gray-50 mt-4">
        <div className="text-xs font-semibold text-gray-700 mb-3">组合方案比例（合计 {total}%）</div>
        <div className="space-y-3">
          {data.map((s, i) => (
            <div key={s.scenario} className="flex items-center gap-3">
              <span className="w-12 text-xs font-semibold" style={{ color: SCENARIO_COLORS[i] }}>方案{s.scenario}</span>
              <input type="range" min={0} max={100} step={5} value={mixRatios[i] ?? 0}
                onChange={e => updateRatio(i, Number(e.target.value))}
                className="flex-1 accent-blue-500" />
              <span className="w-10 text-right text-xs font-semibold text-gray-700">{mixRatios[i]}%</span>
            </div>
          ))}
        </div>

        {/* 组合结果 */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="text-base font-bold text-emerald-700">{fmtK(mixedCashRelease)}</div>
            <div className="text-[10px] text-gray-400">预计现金回笼</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <div className="text-base font-bold text-red-600">{fmtK(Math.abs(mixedMarkdownLoss))}</div>
            <div className="text-[10px] text-gray-400">预计毛利损失</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="text-base font-bold text-blue-700">{fmtK(Math.abs(mixedMarginImpact))}</div>
            <div className="text-[10px] text-gray-400">毛利影响</div>
          </div>
        </div>

        {/* KPI推演 */}
        <div className="mt-4 bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-700 mb-3">方案执行后 KPI 预期变化</div>
          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            {[
              { label: 'WOS', before: `${kpiImpact.wos.before}W`, after: `${kpiImpact.wos.after}W`, good: true },
              { label: '健康占比', before: pct(kpiImpact.healthyPct.before), after: pct(kpiImpact.healthyPct.after), good: true },
              { label: '现金回笼', before: '-', after: fmtK(kpiImpact.cashRelease), good: true },
            ].map(k => (
              <div key={k.label}>
                <div className="text-gray-400 mb-1">{k.label}</div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-gray-500">{k.before}</span>
                  <span className="text-gray-300">→</span>
                  <span className={`font-bold ${k.good ? 'text-emerald-600' : 'text-red-600'}`}>{k.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 应用到OTB */}
      <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
        <button onClick={onApplyToOtb}
          className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          应用此方案到 OTB →
        </button>
      </div>
    </div>
  );
}
