'use client';
/**
 * BreakEvenWhatIf.tsx — S9 保本分析增强版（5因子What-if滑块）
 */
import { useState, useMemo } from 'react';
import sensitivityRaw from '../../../data/planning/pnl_breakeven_sensitivity.json';

type SensData = typeof sensitivityRaw;
const sData = sensitivityRaw as SensData;

function fmtM(v: number) {
  const s = v < 0 ? '-' : ''; const a = Math.abs(v);
  if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
  return s + '¥' + a.toLocaleString();
}
function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

type SliderValues = Record<string, number>;

export default function BreakEvenWhatIf() {
  const [values, setValues] = useState<SliderValues>(() => {
    const init: SliderValues = {};
    sData.sliderConfig.forEach(s => { init[s.key] = s.baseValue; });
    return init;
  });

  const result = useMemo(() => {
    const gm = values['grossMarginRate'] ?? sData.baseCase.grossMarginRate;
    const mkt = values['marketingExpenseRate'] ?? sData.baseCase.marketingExpenseRate;
    const rent = values['rentRate'] ?? sData.baseCase.rentRate;
    const fixedCosts = sData.baseCase.fixedCosts;
    const currentSales = sData.baseCase.currentSales;
    const variableCostRate = (1 - gm) + mkt + rent + 0.07; // labor 7% fixed approx
    const contributionMarginRate = 1 - variableCostRate;
    const breakEvenSales = contributionMarginRate > 0.05 ? fixedCosts / contributionMarginRate : Infinity;
    const safetyMargin = currentSales > 0 ? (currentSales - breakEvenSales) / currentSales : 0;
    const netProfitRate = currentSales > 0 ? (currentSales * contributionMarginRate - fixedCosts) / currentSales : 0;
    return { breakEvenSales, safetyMargin, netProfitRate };
  }, [values]);

  const base = sData.baseCase;
  const beDelta = result.breakEvenSales - base.breakEvenSales;
  const npmDelta = result.netProfitRate - base.netProfitRate;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: '保本销售额', v: fmtM(result.breakEvenSales), delta: fmtM(beDelta), better: beDelta < 0 },
          { l: '安全边际', v: pct(result.safetyMargin), delta: pct(result.safetyMargin - base.safetyMargin), better: result.safetyMargin > base.safetyMargin },
          { l: '净利率', v: pct(result.netProfitRate), delta: pct(npmDelta), better: npmDelta > 0 },
        ].map(k => (
          <div key={k.l} className="bg-white border border-slate-100 rounded-xl px-3 py-3 shadow-sm text-center">
            <div className="text-[10px] text-slate-400 mb-1">{k.l}</div>
            <div className="text-sm font-black text-slate-800">{k.v}</div>
            <div className={`text-[10px] font-medium mt-0.5 ${k.better ? 'text-emerald-600' : 'text-rose-600'}`}>
              {k.delta !== pct(0) && k.delta !== fmtM(0) ? (k.better ? '▼ ' : '▲ ') + k.delta + ' vs 基准' : '= 基准'}
            </div>
          </div>
        ))}
      </div>

      {/* 滑块区 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="text-xs font-bold text-slate-700 mb-4">What-if 参数调整（拖动滑块）</div>
        <div className="space-y-4">
          {sData.sliderConfig.map(cfg => {
            const v = values[cfg.key] ?? cfg.baseValue;
            const isHigherBad = cfg.higherIsBad;
            const delta = v - cfg.baseValue;
            const isBetter = isHigherBad ? delta < 0 : delta > 0;
            const displayVal = cfg.unit === 'pct' ? pct(v) : cfg.unit === 'cny' ? '¥' + v : String(v);
            return (
              <div key={cfg.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700">{cfg.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800">{displayVal}</span>
                    {Math.abs(delta) > 0.0001 && (
                      <span className={`${isBetter ? 'text-emerald-600' : 'text-rose-600'} font-medium`}>
                        {isBetter ? '▲' : '▼'} {cfg.unit === 'pct' ? pct(Math.abs(delta)) : cfg.unit === 'cny' ? '¥' + Math.abs(delta) : Math.abs(delta)}
                      </span>
                    )}
                  </div>
                </div>
                <input type="range"
                  min={cfg.min} max={cfg.max} step={cfg.step}
                  value={v}
                  onChange={e => setValues(prev => ({ ...prev, [cfg.key]: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-full appearance-none bg-slate-200 accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span>{cfg.unit === 'pct' ? pct(cfg.min) : cfg.unit === 'cny' ? '¥' + cfg.min : cfg.min}</span>
                  <span className="text-slate-400">基准: {cfg.unit === 'pct' ? pct(cfg.baseValue) : cfg.unit === 'cny' ? '¥' + cfg.baseValue : cfg.baseValue}</span>
                  <span>{cfg.unit === 'pct' ? pct(cfg.max) : cfg.unit === 'cny' ? '¥' + cfg.max : cfg.max}</span>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => {
          const reset: SliderValues = {};
          sData.sliderConfig.forEach(s => { reset[s.key] = s.baseValue; });
          setValues(reset);
        }} className="mt-3 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          ↺ 重置为基准值
        </button>
      </div>

      {/* 预设方案 */}
      <div>
        <div className="text-[11px] font-semibold text-slate-500 mb-2">预设方案对比</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sData.scenarios.map(s => (
            <button key={s.name} onClick={() => setValues(prev => ({ ...prev, ...(s.overrides as unknown as Record<string, number>) }))}
              className="text-left rounded-xl border border-slate-200 px-3 py-2.5 hover:border-sky-300 hover:bg-sky-50/30 transition-all">
              <div className="text-xs font-bold text-slate-800">{s.name} — {s.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                净利率 {pct(s.netProfitRate)} · 保本额 ¥{(s.breakEvenSales / 1e4).toFixed(0)}万 · 安全边际 {pct(s.safetyMargin)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
