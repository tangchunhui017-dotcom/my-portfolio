'use client';
/**
 * src/components/otb/panels/wave/SeasonBudgetSummary.tsx
 * 季节预算分配汇总 — SS/AW 汇总、结构诊断、占比检查
 */

import { useMemo } from 'react';
import { formatCurrency, safeNumber, safeDiv } from '@/utils/otbCalculations';
import type { WaveRow } from '@/utils/otbWavePlanning';
import type { CurrencyUnit } from '@/utils/otbCalculations';

interface SeasonBudgetSummaryProps {
  waves: WaveRow[];
  annualSalesTarget: number;
  annualOtbBudget: number;
  currencyUnit: CurrencyUnit;
}

interface SeasonData {
  season: string;
  label: string;
  seasonLabel: string;
  color: string;
  salesTarget: number;
  salesPercent: number;
  otbBudget: number;
  otbPercent: number;
  waveCount: number;
}

function SeasonCard({ data, currencyUnit }: { data: SeasonData; currencyUnit: CurrencyUnit }) {
  const textColor = data.season === 'spring' ? 'text-green-700' :
                    data.season === 'summer' ? 'text-blue-700' :
                    data.season === 'autumn' ? 'text-orange-700' : 'text-red-700';

  return (
    <div className={`rounded-lg border ${data.color} p-3 flex flex-col gap-2`}>
      <div className={`text-sm font-bold ${textColor}`}>{data.seasonLabel}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-600">销售目标</span>
          <span className="font-semibold">{formatCurrency(data.salesTarget, currencyUnit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">占比</span>
          <span className="font-semibold">{data.salesPercent.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">OTB</span>
          <span className="font-semibold">{formatCurrency(data.otbBudget, currencyUnit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">波段数</span>
          <span className="font-semibold">{data.waveCount}</span>
        </div>
      </div>
    </div>
  );
}

export default function SeasonBudgetSummary({
  waves,
  annualSalesTarget,
  annualOtbBudget,
  currencyUnit,
}: SeasonBudgetSummaryProps) {
  const seasonData = useMemo(() => {
    const data: Record<string, SeasonData> = {
      spring: { season: 'spring', label: '春', seasonLabel: '春季', color: 'bg-green-50 border-green-100', salesTarget: 0, salesPercent: 0, otbBudget: 0, otbPercent: 0, waveCount: 0 },
      summer: { season: 'summer', label: '夏', seasonLabel: '夏季', color: 'bg-blue-50 border-blue-100', salesTarget: 0, salesPercent: 0, otbBudget: 0, otbPercent: 0, waveCount: 0 },
      autumn: { season: 'autumn', label: '秋', seasonLabel: '秋季', color: 'bg-orange-50 border-orange-100', salesTarget: 0, salesPercent: 0, otbBudget: 0, otbPercent: 0, waveCount: 0 },
      winter: { season: 'winter', label: '冬', seasonLabel: '冬季', color: 'bg-red-50 border-red-100', salesTarget: 0, salesPercent: 0, otbBudget: 0, otbPercent: 0, waveCount: 0 },
    };

    for (const wave of waves) {
      const seasonKey = wave.season;
      if (seasonKey in data && data[seasonKey]) {
        const d = data[seasonKey]!;
        d.salesTarget += safeNumber(wave.forecastSalesAmount) ?? 0;
        d.otbBudget += safeNumber(wave.forecastOtbBudget) ?? 0;
        d.waveCount += 1;
      }
    }

    // 计算百分比
    for (const key in data) {
      if (data[key]) {
        const d = data[key]!;
        d.salesPercent = (safeDiv(d.salesTarget, annualSalesTarget) ?? 0) * 100;
        d.otbPercent = (safeDiv(d.otbBudget, annualOtbBudget) ?? 0) * 100;
      }
    }

    return data;
  }, [waves, annualSalesTarget, annualOtbBudget]);

  const ssData = useMemo(() => ({
    sales: (safeNumber(seasonData.spring?.salesTarget) ?? 0) + (safeNumber(seasonData.summer?.salesTarget) ?? 0),
    otb: (safeNumber(seasonData.spring?.otbBudget) ?? 0) + (safeNumber(seasonData.summer?.otbBudget) ?? 0),
    waveCount: (seasonData.spring?.waveCount || 0) + (seasonData.summer?.waveCount || 0),
  }), [seasonData]);

  const awData = useMemo(() => ({
    sales: (safeNumber(seasonData.autumn?.salesTarget) ?? 0) + (safeNumber(seasonData.winter?.salesTarget) ?? 0),
    otb: (safeNumber(seasonData.autumn?.otbBudget) ?? 0) + (safeNumber(seasonData.winter?.otbBudget) ?? 0),
    waveCount: (seasonData.autumn?.waveCount || 0) + (seasonData.winter?.waveCount || 0),
  }), [seasonData]);

  // 诊断规则
  const diagnoses: Array<{ level: 'error' | 'warning' | 'success'; message: string }> = useMemo(() => {
    const results: Array<{ level: 'error' | 'warning' | 'success'; message: string }> = [];

    // 1. 四季销售占比合计 != 100%
    const totalPercent = Object.values(seasonData).reduce((sum, s) => sum + s.salesPercent, 0);
    if (Math.abs(totalPercent - 100) > 1) {
      results.push({
        level: 'error',
        message: `四季销售占比合计 ${totalPercent.toFixed(1)}%，非100%，结构错误`,
      });
    }

    // 2. 单季 OTB 占年度 OTB 超过 40%
    for (const season of Object.values(seasonData)) {
      if (season.otbPercent > 40) {
        results.push({
          level: 'warning',
          message: `${season.seasonLabel} OTB 占比 ${season.otbPercent.toFixed(1)}%，超过40%，集中风险`,
        });
      }
    }

    // 3. SS/AW 差异过大
    const ssPercent = ((safeDiv(ssData?.sales || 0, annualSalesTarget) ?? 0) * 100);
    const awPercent = ((safeDiv(awData?.sales || 0, annualSalesTarget) ?? 0) * 100);
    if (Math.abs(ssPercent - awPercent) > 20) {
      results.push({
        level: 'warning',
        message: `SS/AW 销售占比相差 ${Math.abs(ssPercent - awPercent).toFixed(1)}%，结构偏斜`,
      });
    }

    // 如果没有问题
    if (results.length === 0) {
      results.push({
        level: 'success',
        message: '季节结构平衡，无明显风险',
      });
    }

    return results;
  }, [seasonData, annualSalesTarget, ssData, awData]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-slate-700">季节预算分配</div>

      {/* SS / AW 级别汇总 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-4 space-y-3">
          <div className="text-sm font-bold text-sky-700">春夏 (SS)</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">销售目标</span>
              <span className="font-semibold">{formatCurrency(ssData.sales, currencyUnit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">占比</span>
              <span className="font-semibold">{(((safeDiv(ssData?.sales || 0, annualSalesTarget) ?? 0) * 100).toFixed(1))}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">OTB</span>
              <span className="font-semibold">{formatCurrency(ssData.otb, currencyUnit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">波段数</span>
              <span className="font-semibold">{ssData.waveCount}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 space-y-3">
          <div className="text-sm font-bold text-orange-700">秋冬 (AW)</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">销售目标</span>
              <span className="font-semibold">{formatCurrency(awData.sales, currencyUnit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">占比</span>
              <span className="font-semibold">{(((safeDiv(awData?.sales || 0, annualSalesTarget) ?? 0) * 100).toFixed(1))}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">OTB</span>
              <span className="font-semibold">{formatCurrency(awData.otb, currencyUnit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">波段数</span>
              <span className="font-semibold">{awData.waveCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 四季卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SeasonCard data={seasonData.spring} currencyUnit={currencyUnit} />
        <SeasonCard data={seasonData.summer} currencyUnit={currencyUnit} />
        <SeasonCard data={seasonData.autumn} currencyUnit={currencyUnit} />
        <SeasonCard data={seasonData.winter} currencyUnit={currencyUnit} />
      </div>

      {/* 诊断信息 */}
      <div className="space-y-2">
        {diagnoses.map((diag, idx) => {
          const bgColor = diag.level === 'error' ? 'bg-red-50 border-red-100' :
                         diag.level === 'warning' ? 'bg-orange-50 border-orange-100' :
                         'bg-green-50 border-green-100';
          const textColor = diag.level === 'error' ? 'text-red-700' :
                           diag.level === 'warning' ? 'text-orange-700' :
                           'text-green-700';
          const icon = diag.level === 'error' ? '❌' : 
                      diag.level === 'warning' ? '⚠️' : '✓';

          return (
            <div key={idx} className={`rounded border ${bgColor} px-3 py-2 flex items-start gap-2 text-xs ${textColor}`}>
              <span className="flex-shrink-0 pt-0.5">{icon}</span>
              <span>{diag.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
