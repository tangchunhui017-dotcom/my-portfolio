'use client';

import { CORE_STRATEGIES, type CoreStrategy } from '@/data/brandMarketResearch';

const ACCENT: Record<
  string,
  { numText: string; cardBg: string; cardBorder: string; barBg: string; iconBg: string }
> = {
  indigo:  { numText: 'text-indigo-600',  cardBg: 'bg-gradient-to-br from-indigo-50/70 to-white',  cardBorder: 'border-indigo-100',  barBg: 'bg-indigo-500',  iconBg: 'bg-indigo-100' },
  amber:   { numText: 'text-amber-600',   cardBg: 'bg-gradient-to-br from-amber-50/70 to-white',   cardBorder: 'border-amber-100',   barBg: 'bg-amber-500',   iconBg: 'bg-amber-100' },
  rose:    { numText: 'text-rose-600',    cardBg: 'bg-gradient-to-br from-rose-50/70 to-white',    cardBorder: 'border-rose-100',    barBg: 'bg-rose-500',    iconBg: 'bg-rose-100' },
  cyan:    { numText: 'text-cyan-600',    cardBg: 'bg-gradient-to-br from-cyan-50/70 to-white',    cardBorder: 'border-cyan-100',    barBg: 'bg-cyan-500',    iconBg: 'bg-cyan-100' },
  emerald: { numText: 'text-emerald-600', cardBg: 'bg-gradient-to-br from-emerald-50/70 to-white', cardBorder: 'border-emerald-100', barBg: 'bg-emerald-500', iconBg: 'bg-emerald-100' },
  violet:  { numText: 'text-violet-600',  cardBg: 'bg-gradient-to-br from-violet-50/70 to-white',  cardBorder: 'border-violet-100',  barBg: 'bg-violet-500',  iconBg: 'bg-violet-100' },
};

const TAG_TONE: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  attack:   { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '⚔' },
  improve:  { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: '🛠' },
  defend:   { bg: 'bg-sky-100',     text: 'text-sky-700',     icon: '🛡' },
  stoploss: { bg: 'bg-slate-200',   text: 'text-slate-700',   icon: '⏸' },
};

function StrategyCard({ s }: { s: CoreStrategy }) {
  const c = ACCENT[s.accent];
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border ${c.cardBorder} ${c.cardBg} p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      {/* 左侧色条 */}
      <div className={`absolute inset-y-0 left-0 w-1 ${c.barBg}`} />

      {/* 编号 + 维度 */}
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-black tracking-tight ${c.numText}`}>{s.number}</span>
          <span className="text-base font-bold text-slate-900">{s.dimension}对策</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
          {s.dimension === '产品' ? 'PRODUCT' :
           s.dimension === '价格' ? 'PRICE' :
           s.dimension === '服务' ? 'SERVICE' :
           s.dimension === '渠道' ? 'CHANNEL' :
           s.dimension === '供应链' ? 'SUPPLY' :
           'ORG'}
        </span>
      </header>

      {/* 核心论点 */}
      <div className="mb-3">
        <h4 className="text-[15px] font-bold leading-snug text-slate-900">{s.thesis}</h4>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{s.description}</p>
      </div>

      {/* 战略行动 */}
      <ul className="mb-4 flex-1 space-y-2.5">
        {s.actions.map((a) => {
          const tag = TAG_TONE[a.tagTone];
          return (
            <li key={a.title} className="rounded-lg border border-slate-100 bg-white/70 px-3 py-2 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${tag.bg} ${tag.text}`}>
                  <span>{tag.icon}</span>
                  {a.tag}
                </span>
                <span className="text-[13px] font-bold text-slate-900">{a.title}</span>
              </div>
              <div className="mt-1 text-[11px] leading-snug text-slate-600">{a.detail}</div>
            </li>
          );
        })}
      </ul>

      {/* 目标 */}
      <footer className="flex items-center gap-2 rounded-lg bg-slate-900/95 px-3 py-2 text-xs text-white">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">目标</span>
        <span className="font-semibold">{s.target}</span>
      </footer>
    </article>
  );
}

export default function SixStrategies() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-600">
        从 PEST + SWOT + TOWS 收敛出的 <span className="font-semibold text-slate-900">六大可执行对策</span>，每条带战略象限标签和量化目标。
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CORE_STRATEGIES.map((s) => (
          <StrategyCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}
