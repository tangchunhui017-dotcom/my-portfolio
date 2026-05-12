'use client';
/**
 * src/components/inventory/InvHealthScoreCard.tsx
 * S1: 库存健康度评分卡 + 周改善对比 (V10)
 */
import type { InvHealthScoreHistory } from '@/types/invHealthV10Types';
import { fmtK } from '@/types/inventoryHealthTypes';

interface Props {
  data: InvHealthScoreHistory;
}

const SCORE_COLOR = (s: number) => s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
const SCORE_BG    = (s: number) => s >= 70 ? 'bg-emerald-50 border-emerald-200' : s >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
const SCORE_LABEL = (s: number) => s >= 70 ? '健康' : s >= 50 ? '待改善' : '高风险';

export default function InvHealthScoreCard({ data }: Props) {
  const cur = data.current;
  const vs  = data.vsLastWeek;
  const dim = Object.values(cur.dimensions);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">库存健康度评分</h3>
          <p className="text-xs text-gray-400 mt-0.5">5维加权综合评分 · 满分100分</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${SCORE_BG(cur.score)}`}
          style={{ color: SCORE_COLOR(cur.score) }}>
          {SCORE_LABEL(cur.score)}
        </span>
      </div>

      <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* 左: 大字评分 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <span className="text-6xl font-black" style={{ color: SCORE_COLOR(cur.score) }}>{cur.score}</span>
            <div className="mb-2 text-xs text-gray-400">
              <div>/ 100</div>
              <div className={`font-semibold mt-0.5 ${vs.scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {vs.scoreDelta >= 0 ? '▲' : '▼'} {Math.abs(vs.scoreDelta)} vs 上周
              </div>
            </div>
          </div>

          {/* 评分公式 */}
          <div className="space-y-2">
            {dim.map(d => (
              <div key={d.label} className="flex items-center gap-2">
                <div className="w-20 text-xs text-gray-500 shrink-0">{d.label}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${d.score}%`, backgroundColor: SCORE_COLOR(d.score) }} />
                </div>
                <div className="w-8 text-right text-xs font-semibold text-gray-700">{d.score}</div>
                <div className="w-8 text-right text-[10px] text-gray-400">{Math.round(d.weight * 100)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* 右: 周改善对比 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '风险库存缩减', val: fmtK(Math.abs(vs.riskAmountDelta)), good: vs.riskAmountDelta < 0, icon: '📉' },
            { label: '已处理SKU', val: `${vs.processedSkuCount} 个`, good: true, icon: '✅' },
            { label: '释放现金', val: fmtK(vs.releasedCash), good: true, icon: '💰' },
            { label: '本周健康分', val: String(cur.score), good: cur.score >= 50, icon: '📊' },
          ].map(item => (
            <div key={item.label}
              className={`rounded-xl border p-3 ${item.good ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'}`}>
              <div className="text-base mb-0.5">{item.icon}</div>
              <div className={`text-lg font-bold ${item.good ? 'text-emerald-700' : 'text-red-600'}`}>{item.val}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4周趋势迷你折线 */}
      <div className="px-5 pb-4">
        <div className="text-xs text-gray-400 mb-2">4周健康度趋势</div>
        <div className="flex items-end gap-2 h-10">
          {data.history.map((h, i) => {
            const maxScore = Math.max(...data.history.map(x => x.score));
            const pct = h.score / maxScore * 100;
            return (
              <div key={h.week} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-gray-400 font-semibold">{h.score}</div>
                <div className="w-full rounded-t-sm transition-all"
                  style={{ height: `${pct}%`, backgroundColor: SCORE_COLOR(h.score), minHeight: 4 }} />
                <div className="text-[9px] text-gray-400">{h.week}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
