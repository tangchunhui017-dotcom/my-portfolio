'use client';
/**
 * PnlDecisionSummary.tsx — S0 决策摘要1屏卡
 * 老板5秒抓核心：3行×4列（健康/风险/决策）
 */
import decisionRaw from '../../../data/planning/pnl_decision_summary.json';

type DecisionData = typeof decisionRaw;
const data = decisionRaw as DecisionData;

function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

function formatValue(v: number | string, format: string): string {
  if (format === 'pct') return pct(Number(v));
  if (format === 'days') return v + '天';
  if (format === 'score') return String(v) + '分';
  return String(v);
}

const STATUS_CFG = {
  healthy: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: '✅' },
  warning: { cls: 'bg-amber-50 border-amber-200 text-amber-700', icon: '⚠️' },
  danger:  { cls: 'bg-rose-50 border-rose-200 text-rose-700', icon: '🔴' },
};

const PRIORITY_DOT: Record<string, string> = {
  P0: 'bg-rose-500', P1: 'bg-amber-500', P2: 'bg-slate-400',
};

interface Props {
  onScrollTo?: (anchor: string) => void;
}

export default function PnlDecisionSummary({ onScrollTo }: Props) {
  const scroll = (anchor: string) => {
    if (onScrollTo) { onScrollTo(anchor); return; }
    const el = document.getElementById(anchor);
    if (el) { el.scrollIntoView({ behavior: 'smooth' }); el.classList.add('ring-2','ring-sky-400'); setTimeout(() => el.classList.remove('ring-2','ring-sky-400'), 1500); }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-sky-50/40 border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base font-black text-slate-800">🎯 决策摘要</span>
        <span className="text-[10px] text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">老板5秒抓核心</span>
      </div>

      {/* R1 健康指标 */}
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">健康状态</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.health.map(h => {
            const cfg = STATUS_CFG[h.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.warning;
            return (
              <div key={h.key} className={`rounded-xl border px-3 py-2.5 ${cfg.cls} cursor-pointer hover:shadow-sm transition-all`}
                onClick={() => h.key !== 'healthScore' && scroll('pnl-overview')}>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px]">{cfg.icon}</span>
                  <span className="text-[10px] font-medium opacity-80">{h.label}</span>
                </div>
                <div className="text-sm font-black">{formatValue(h.value, h.format)}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{h.targetLabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* R2 风险事件 */}
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Top 风险事件</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {data.risks.map(r => (
            <button key={r.id} onClick={() => scroll(r.scrollAnchor)}
              className="flex items-start gap-2 bg-white rounded-xl border border-rose-100 px-3 py-2.5 hover:border-rose-300 hover:shadow-sm transition-all text-left group">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[r.priority] ?? 'bg-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 leading-snug">{r.title}</div>
                <div className="text-[10px] text-rose-600 font-medium mt-0.5">-¥{(r.amount / 10000).toFixed(0)}万</div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className="bg-slate-100 px-1 py-0.5 rounded">{r.source}</span>
                  <span className="text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">→ 查看</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* R3 本月决策 */}
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">本月待决策</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {data.decisions.map(d => (
            <button key={d.id} onClick={() => scroll(d.scrollAnchor)}
              className="flex items-start gap-2 bg-white rounded-xl border border-sky-100 px-3 py-2.5 hover:border-sky-300 hover:shadow-sm transition-all text-left group">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[d.priority] ?? 'bg-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 leading-snug">{d.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{d.detail}</div>
                <div className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                  <span>⏰ {d.urgency}</span>
                  <span className="text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1">→ 分析</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
