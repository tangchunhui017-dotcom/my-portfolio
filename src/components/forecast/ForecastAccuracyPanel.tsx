'use client';
/**
 * ForecastAccuracyPanel.tsx
 * 预测准确率面板 — MAPE / Bias / 偏差最大品类、SKU、渠道
 */
import type { ForecastChannel } from '@/hooks/useForecast';
import accuracyRaw from '../../../data/planning/sales_forecast_accuracy_history.json';

type ChannelData = {
  quarters: Array<{ period: string; predicted: number; actual: number; accuracy: number; deviation: number }>;
  topDeviations: Array<{ dimension: string; deviation: number; direction: string; reason: string; suggestion: string }>;
  overallAccuracy: number;
  trend: string;
};
type AccuracyData = {
  channels: Record<string, ChannelData>;
  healthBenchmark: { good: number; warning: number; critical: number };
};
const data = accuracyRaw as AccuracyData;

function MetricBadge({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'red' | 'slate' }) {
  const cls = { green: 'bg-emerald-50 text-emerald-700 border-emerald-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', red: 'bg-rose-50 text-rose-700 border-rose-200', slate: 'bg-slate-50 text-slate-600 border-slate-200' }[tone];
  return (
    <div className={`border rounded-lg px-3 py-2 text-center ${cls}`}>
      <div className="text-[10px] opacity-70 mb-0.5">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

interface Props {
  channel: ForecastChannel;
}

export default function ForecastAccuracyPanel({ channel }: Props) {
  const chData = data.channels[channel];
  if (!chData) return <div className="text-slate-400 text-xs p-4">暂无数据</div>;

  const latest = chData.quarters[chData.quarters.length - 1];
  if (!latest) return <div className="text-slate-400 text-xs p-4">暂无季度数据</div>;

  const mape = 1 - latest.accuracy;
  const bias = latest.deviation; // positive = over-forecast
  const biasDir = bias > 0 ? '预测偏高' : '预测偏低';
  const biasTone: 'green' | 'amber' | 'red' = Math.abs(bias) < 0.05 ? 'green' : Math.abs(bias) < 0.12 ? 'amber' : 'red';
  const mapeTone: 'green' | 'amber' | 'red' = mape < 0.08 ? 'green' : mape < 0.15 ? 'amber' : 'red';
  const diffAmt = latest.predicted - latest.actual;
  const diffRate = latest.actual > 0 ? diffAmt / latest.actual : 0;

  return (
    <div className="space-y-4">
      {/* 核心指标 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <MetricBadge label="MAPE" value={`${(mape * 100).toFixed(1)}%`} tone={mapeTone} />
        <MetricBadge label="Bias方向" value={biasDir} tone={biasTone} />
        <MetricBadge label="上期预测" value={`¥${(latest.predicted / 1e6).toFixed(1)}M`} tone="slate" />
        <MetricBadge label="上期实际" value={`¥${(latest.actual / 1e6).toFixed(1)}M`} tone="slate" />
        <MetricBadge label="偏差金额" value={`${diffAmt >= 0 ? '+' : ''}¥${(Math.abs(diffAmt) / 1e4).toFixed(0)}万`} tone={Math.abs(diffAmt / latest.actual) < 0.05 ? 'green' : 'amber'} />
        <MetricBadge label="偏差率" value={`${(diffRate * 100).toFixed(1)}%`} tone={Math.abs(diffRate) < 0.05 ? 'green' : Math.abs(diffRate) < 0.12 ? 'amber' : 'red'} />
      </div>

      {/* 偏差最大的维度 */}
      {chData.topDeviations && chData.topDeviations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-600 mb-2">偏差最大的维度</h4>
          <div className="space-y-2">
            {chData.topDeviations.slice(0, 3).map((d, i) => (
              <div key={i} className="bg-slate-50 rounded-lg px-3 py-2.5 flex items-start gap-3">
                <div className="text-[10px] text-slate-400 w-4 shrink-0 font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-700">{d.dimension}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${d.direction === 'over' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                      {d.direction === 'over' ? '↑ 预测偏高' : '↓ 预测偏低'} {(Math.abs(d.deviation) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{d.reason}</p>
                  <p className="text-[10px] text-sky-600 mt-0.5">建议：{d.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 历史趋势 */}
      <div>
        <h4 className="text-xs font-semibold text-slate-600 mb-2">近期准确率趋势</h4>
        <div className="flex items-end gap-2 h-16">
          {chData.quarters.slice(-6).map((q, i) => {
            const h = Math.round(q.accuracy * 100);
            const barH = Math.max(10, h - 70) * 2;
            const bg = q.accuracy >= 0.93 ? 'bg-emerald-400' : q.accuracy >= 0.85 ? 'bg-amber-400' : 'bg-rose-400';
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className="text-[9px] text-slate-500">{h}%</div>
                <div className={`w-full rounded-t ${bg}`} style={{ height: barH }} />
                <div className="text-[9px] text-slate-400 truncate w-full text-center">{q.period}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
