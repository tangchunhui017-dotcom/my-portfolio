'use client';
/**
 * src/components/inventory/InvSeasonalCountdown.tsx
 * S12: 季节性必清倒计时 (V10) — 鞋类专属
 */
import type { InvSeasonalData } from '@/types/invHealthV10Types';

interface Props {
  data: InvSeasonalData;
  onGenerateClearanceTask?: (key: string) => void;
}

const RISK_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string; daysColor: string }> = {
  critical: { border: 'border-red-200',    bg: 'bg-red-50',      badge: 'bg-red-500',    badgeText: '紧急',   daysColor: 'text-red-600' },
  high:     { border: 'border-orange-200', bg: 'bg-orange-50',   badge: 'bg-orange-500', badgeText: '高风险', daysColor: 'text-orange-600' },
  medium:   { border: 'border-amber-200',  bg: 'bg-amber-50',    badge: 'bg-amber-400',  badgeText: '关注',   daysColor: 'text-amber-600' },
  low:      { border: 'border-emerald-200',bg: 'bg-emerald-50',  badge: 'bg-emerald-500',badgeText: '健康',   daysColor: 'text-emerald-600' },
};

export default function InvSeasonalCountdown({ data, onGenerateClearanceTask }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">🌡️ 季节性必清倒计时</h3>
        <p className="text-xs text-gray-400 mt-0.5">鞋类季节性极强，错过清货窗口即成死库存</p>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.categories.map(cat => {
          const rs = RISK_STYLES[cat.riskLevel] ?? RISK_STYLES.low;
          const overdue = cat.daysLeft < 0;
          return (
            <div key={cat.key} className={`rounded-xl border p-4 ${rs.border} ${rs.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm font-semibold text-gray-900">{cat.label}</span>
                </div>
                <span className={`text-[10px] text-white px-2 py-0.5 rounded-full font-semibold ${rs.badge}`}>{rs.badgeText}</span>
              </div>

              <div className={`text-3xl font-black mb-1 ${rs.daysColor}`}>
                {overdue ? `逾期${Math.abs(cat.daysLeft)}天` : `${cat.daysLeft}天`}
              </div>
              <div className="text-[10px] text-gray-500 mb-3">
                {overdue ? '已过季末清货窗口' : `距季末清货截止日 ${cat.deadline}`}
              </div>

              <div className="space-y-1 text-xs text-gray-600 mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">当前库存</span>
                  <span className="font-semibold">¥{(cat.currentInventoryAmount / 10000).toFixed(0)}万</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">风险库存</span>
                  <span className="font-semibold text-red-600">¥{(cat.estimatedRiskAmount / 10000).toFixed(0)}万</span>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 mb-3 bg-white/60 rounded-lg px-2 py-1.5">{cat.suggestion}</div>

              <button
                onClick={() => onGenerateClearanceTask?.(cat.key)}
                className="w-full text-xs bg-white border border-gray-200 hover:border-gray-400 text-gray-700 rounded-lg py-1.5 font-medium transition-colors">
                生成清货任务 →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
