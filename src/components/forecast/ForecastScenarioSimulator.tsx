'use client';
/**
 * ForecastScenarioSimulator.tsx
 * 情景模拟器 — 6 情景 × 8 可调参数 × 8 输出
 */
import { useState, useMemo } from 'react';
import { formatMoneyCny } from '@/config/numberFormat';
import type { ForecastChannel } from '@/hooks/useForecast';

type ScenarioKey = 'conservative' | 'base' | 'optimistic' | 'highDiscount' | 'stockout' | 'overstock';

interface SimInput {
  growthRate: number;
  conversionRate: number;
  avgOrderValue: number;
  discountRate: number;
  returnRate: number;
  inventoryAvailability: number;
  newProductShare: number;
  otbBudget: number;
}

const SCENARIO_PRESETS: Record<ScenarioKey, { label: string; color: string; inputs: SimInput }> = {
  conservative: {
    label: '保守场景', color: 'text-amber-700 bg-amber-50 border-amber-300',
    inputs: { growthRate: -0.05, conversionRate: 0.22, avgOrderValue: 480, discountRate: 0.42, returnRate: 0.28, inventoryAvailability: 0.80, newProductShare: 0.45, otbBudget: 1800000 },
  },
  base: {
    label: '基准场景', color: 'text-sky-700 bg-sky-50 border-sky-300',
    inputs: { growthRate: 0.08, conversionRate: 0.26, avgOrderValue: 520, discountRate: 0.38, returnRate: 0.24, inventoryAvailability: 0.88, newProductShare: 0.52, otbBudget: 2200000 },
  },
  optimistic: {
    label: '乐观场景', color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    inputs: { growthRate: 0.18, conversionRate: 0.30, avgOrderValue: 560, discountRate: 0.35, returnRate: 0.20, inventoryAvailability: 0.95, newProductShare: 0.60, otbBudget: 2800000 },
  },
  highDiscount: {
    label: '高折扣场景', color: 'text-purple-700 bg-purple-50 border-purple-300',
    inputs: { growthRate: 0.12, conversionRate: 0.32, avgOrderValue: 420, discountRate: 0.52, returnRate: 0.30, inventoryAvailability: 0.85, newProductShare: 0.40, otbBudget: 2000000 },
  },
  stockout: {
    label: '缺货场景', color: 'text-rose-700 bg-rose-50 border-rose-300',
    inputs: { growthRate: 0.05, conversionRate: 0.20, avgOrderValue: 530, discountRate: 0.36, returnRate: 0.22, inventoryAvailability: 0.68, newProductShare: 0.55, otbBudget: 1600000 },
  },
  overstock: {
    label: '积压场景', color: 'text-orange-700 bg-orange-50 border-orange-300',
    inputs: { growthRate: -0.08, conversionRate: 0.18, avgOrderValue: 490, discountRate: 0.48, returnRate: 0.26, inventoryAvailability: 1.00, newProductShare: 0.38, otbBudget: 2600000 },
  },
};

function calcOutput(inputs: SimInput, baseRevenue = 1200000) {
  const grossSales = baseRevenue * (1 + inputs.growthRate) * (inputs.conversionRate / 0.26) * (inputs.avgOrderValue / 520);
  const netSales   = grossSales * (1 - inputs.returnRate);
  const gmRate     = Math.max(0, 0.45 - (inputs.discountRate - 0.38) * 0.8);
  const forecastGM = netSales * gmRate;
  const stockoutRisk = netSales * (1 - inputs.inventoryAvailability) * 0.6;
  const overstockRisk = inputs.otbBudget * Math.max(0, (1 - inputs.growthRate) * 0.5 - 0.1);
  const cashImpact = inputs.otbBudget - netSales * 0.3;
  const pnlImpact  = forecastGM - inputs.otbBudget * 0.15;
  return { grossSales, netSales, forecastGM, gmRate, stockoutRisk, overstockRisk, cashImpact, pnlImpact,
           forecastUnits: Math.round(netSales / inputs.avgOrderValue) };
}

const PARAM_CONFIGS = [
  { key: 'growthRate',            label: '销售增长率',   min: -0.2, max: 0.3, step: 0.01, unit: '%', scale: 100 },
  { key: 'conversionRate',        label: '转化率',       min: 0.1,  max: 0.5, step: 0.01, unit: '%', scale: 100 },
  { key: 'avgOrderValue',         label: '客单价',       min: 300,  max: 800, step: 10,   unit: '元', scale: 1 },
  { key: 'discountRate',          label: '折扣率',       min: 0.25, max: 0.65, step: 0.01, unit: '%', scale: 100 },
  { key: 'returnRate',            label: '退货率',       min: 0.05, max: 0.5, step: 0.01, unit: '%', scale: 100 },
  { key: 'inventoryAvailability', label: '库存可售率',   min: 0.5,  max: 1.0, step: 0.01, unit: '%', scale: 100 },
  { key: 'newProductShare',       label: '新品贡献率',   min: 0.2,  max: 0.8, step: 0.01, unit: '%', scale: 100 },
  { key: 'otbBudget',             label: 'OTB投入金额',  min: 1000000, max: 4000000, step: 100000, unit: '元', scale: 1 },
] as const;

interface Props { channel: ForecastChannel; }

export default function ForecastScenarioSimulator({ channel }: Props) {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('base');
  const [customInputs, setCustomInputs] = useState<SimInput>(SCENARIO_PRESETS.base.inputs);

  const handlePreset = (key: ScenarioKey) => {
    setActiveScenario(key);
    setCustomInputs(SCENARIO_PRESETS[key].inputs);
  };

  const output = useMemo(() => calcOutput(customInputs), [customInputs]);

  return (
    <div className="space-y-4">
      {/* 情景选择 */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(SCENARIO_PRESETS) as [ScenarioKey, typeof SCENARIO_PRESETS[ScenarioKey]][]).map(([key, preset]) => (
          <button key={key}
            onClick={() => handlePreset(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activeScenario === key ? preset.color + ' shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
            }`}>
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* 参数滑块 */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-600">可调参数</h4>
          {PARAM_CONFIGS.map(cfg => {
            const raw = customInputs[cfg.key as keyof SimInput] as number;
            const displayVal = cfg.unit === '%' ? (raw * cfg.scale).toFixed(1) + '%' : '¥' + raw.toLocaleString();
            return (
              <div key={cfg.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-600">{cfg.label}</span>
                  <span className="text-[11px] font-semibold text-slate-800">{displayVal}</span>
                </div>
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={raw}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setCustomInputs(prev => ({ ...prev, [cfg.key]: val }));
                    setActiveScenario('base'); // 修改后退出预设
                  }}
                  className="w-full h-1.5 rounded-full accent-sky-500 cursor-pointer"
                />
              </div>
            );
          })}
        </div>

        {/* 模拟输出 */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-600">模拟结果</h4>
          {[
            { label: '预测销售额（毛）', value: formatMoneyCny(output.grossSales),  tone: 'text-slate-800' },
            { label: '预测净销售额',    value: formatMoneyCny(output.netSales),     tone: 'text-slate-800' },
            { label: '预测毛利',        value: formatMoneyCny(output.forecastGM),   tone: 'text-emerald-700' },
            { label: '毛利率',          value: (output.gmRate * 100).toFixed(1) + '%', tone: output.gmRate >= 0.42 ? 'text-emerald-700' : 'text-amber-700' },
            { label: '预测销量',        value: output.forecastUnits.toLocaleString() + ' 双', tone: 'text-slate-800' },
            { label: '缺货风险',        value: formatMoneyCny(output.stockoutRisk), tone: 'text-rose-700' },
            { label: '积压风险',        value: formatMoneyCny(output.overstockRisk), tone: 'text-amber-700' },
            { label: '现金影响',        value: formatMoneyCny(output.cashImpact),   tone: output.cashImpact < 0 ? 'text-emerald-700' : 'text-rose-700' },
            { label: '损益影响（毛利-OTB费）', value: formatMoneyCny(output.pnlImpact), tone: output.pnlImpact > 0 ? 'text-emerald-700' : 'text-rose-700' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-[11px] text-slate-500">{item.label}</span>
              <span className={`text-sm font-bold ${item.tone}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
