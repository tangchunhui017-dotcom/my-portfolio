'use client';
/**
 * ForecastKpiBar.tsx
 * 销售预测 — 8 核心 KPI 卡片（首屏总览）
 */
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { useForecast } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';
import { useGlobalConfig } from '@/context/GlobalConfigContext';

type KpiTone = 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'gray';

interface KpiItem {
  label: string;
  value: string;
  target?: string;
  diff?: string;
  diffTone?: KpiTone;
  mom?: string;
  riskTone?: KpiTone;
  sub?: string;
}

const TONE_CLS: Record<KpiTone, { border: string; badge: string; val: string }> = {
  green:  { border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700', val: 'text-emerald-700' },
  blue:   { border: 'border-l-sky-400',     badge: 'bg-sky-100 text-sky-700',         val: 'text-sky-700' },
  orange: { border: 'border-l-amber-400',   badge: 'bg-amber-100 text-amber-700',     val: 'text-amber-700' },
  red:    { border: 'border-l-rose-400',    badge: 'bg-rose-100 text-rose-700',       val: 'text-rose-700' },
  purple: { border: 'border-l-purple-400',  badge: 'bg-purple-100 text-purple-700',   val: 'text-purple-700' },
  gray:   { border: 'border-l-slate-300',   badge: 'bg-slate-100 text-slate-500',     val: 'text-slate-500' },
};

function KpiCard({ item }: { item: KpiItem }) {
  const tone = item.riskTone ?? 'gray';
  const tc = TONE_CLS[tone];
  return (
    <div className={`bg-white rounded-xl border border-slate-100 border-l-4 ${tc.border} shadow-sm px-4 py-3 flex flex-col gap-1`}>
      <div className="text-[10px] text-slate-400 leading-tight">{item.label}</div>
      <div className={`text-lg font-bold ${tc.val}`}>{item.value}</div>
      {item.target && (
        <div className="text-[10px] text-slate-400">目标 <span className="text-slate-600">{item.target}</span></div>
      )}
      {item.diff && (
        <div className={`text-[10px] font-medium ${item.diffTone ? TONE_CLS[item.diffTone].val : 'text-slate-500'}`}>{item.diff}</div>
      )}
      {item.mom && (
        <div className="text-[10px] text-slate-400">环比 {item.mom}</div>
      )}
      {item.sub && (
        <div className={`text-[10px] px-1.5 py-0.5 rounded-full self-start ${tc.badge}`}>{item.sub}</div>
      )}
    </div>
  );
}

interface Props {
  channel: ForecastChannel | 'all';
  scenario: ForecastScenario;
}

export default function ForecastKpiBar({ channel, scenario }: Props) {
  const physResult = useForecast('physical', scenario);
  const ecomResult = useForecast('ecommerce', scenario);
  const nsResult   = useForecast('new_store', scenario);
  const { config } = useGlobalConfig();

  const isSingle = channel !== 'all';
  const singleCh = isSingle ? channel as ForecastChannel : 'physical';
  const singleResult = isSingle ? (
    channel === 'physical' ? physResult :
    channel === 'ecommerce' ? ecomResult : nsResult
  ) : null;

  if (!physResult || !ecomResult || !nsResult) {
    return <div className="h-24 text-slate-400 text-xs flex items-center justify-center">加载中…</div>;
  }

  const totalForecast = isSingle
    ? (singleResult?.annualForecast ?? 0)
    : physResult.annualForecast + ecomResult.annualForecast + nsResult.annualForecast;

  const totalBase = isSingle
    ? (singleResult?.monthly.reduce((s, m) => s + m.baseRevenue, 0) ?? 0)
    : [physResult, ecomResult, nsResult].reduce((s, r) => s + r.monthly.reduce((a, m) => a + m.baseRevenue, 0), 0);

  const forecastGap = totalForecast * 0.94 - totalForecast; // mock target = forecast * 0.94
  const targetSales = totalForecast * 1.05; // mock
  const gap = totalForecast - targetSales;
  const achieveRate = targetSales > 0 ? totalForecast / targetSales : 0;
  const gmRate = config.brand.grossMarginRate;
  const forecastGM = totalForecast * gmRate;
  const refundRate = channel === 'ecommerce' ? config.ecommerceDrivers.refundRate : 0.06;
  const stockoutRisk = totalForecast * 0.04;
  const overStockRisk = totalForecast * 0.07;
  const mape = isSingle ? 0.082 : 0.095;
  const forecastPairs = isSingle
    ? (singleResult?.forecastPairs ?? 0)
    : physResult.forecastPairs + ecomResult.forecastPairs + nsResult.forecastPairs;

  const gapTone: KpiTone = gap >= 0 ? 'green' : gap > -totalForecast * 0.05 ? 'orange' : 'red';
  const mapeTone: KpiTone = mape <= 0.08 ? 'green' : mape <= 0.12 ? 'orange' : 'red';

  const items: KpiItem[] = [
    {
      label: '预测销售额',
      value: formatMoneyCny(totalForecast),
      target: formatMoneyCny(targetSales),
      diff: gap >= 0 ? `+${formatMoneyCny(gap)}` : formatMoneyCny(gap),
      diffTone: gap >= 0 ? 'green' : 'red',
      riskTone: achieveRate >= 1 ? 'green' : achieveRate >= 0.95 ? 'blue' : 'orange',
      sub: '年度预测',
    },
    {
      label: '目标达成率',
      value: `${(achieveRate * 100).toFixed(1)}%`,
      target: '100%',
      diff: `${((achieveRate - 1) * 100).toFixed(1)}pp`,
      diffTone: achieveRate >= 1 ? 'green' : 'orange',
      riskTone: achieveRate >= 1 ? 'green' : achieveRate >= 0.95 ? 'blue' : 'red',
      sub: achieveRate >= 1 ? '超额' : '缺口',
    },
    {
      label: '预测销量',
      value: `${forecastPairs.toLocaleString()} 双`,
      riskTone: 'blue',
      sub: '预测双数',
    },
    {
      label: '预测毛利',
      value: formatMoneyCny(forecastGM),
      target: `${(gmRate * 100).toFixed(0)}% 毛利率`,
      riskTone: gmRate >= 0.45 ? 'green' : gmRate >= 0.38 ? 'blue' : 'orange',
      sub: `毛利率 ${(gmRate * 100).toFixed(0)}%`,
    },
    {
      label: '预测缺口',
      value: gap >= 0 ? `+${formatMoneyCny(gap)}` : formatMoneyCny(gap),
      riskTone: gapTone,
      sub: gap >= 0 ? '领先目标' : '低于目标',
    },
    {
      label: '缺货风险金额',
      value: formatMoneyCny(stockoutRisk),
      riskTone: stockoutRisk > totalForecast * 0.05 ? 'red' : 'orange',
      sub: '机会损失',
    },
    {
      label: '积压风险金额',
      value: formatMoneyCny(overStockRisk),
      riskTone: overStockRisk > totalForecast * 0.08 ? 'red' : 'orange',
      sub: '尾货风险',
    },
    {
      label: '预测准确率',
      value: `${((1 - mape) * 100).toFixed(1)}%`,
      target: '92%',
      diff: `MAPE ${(mape * 100).toFixed(1)}%`,
      diffTone: mapeTone,
      riskTone: mapeTone,
      sub: '上季度',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {items.map(item => <KpiCard key={item.label} item={item} />)}
    </div>
  );
}
