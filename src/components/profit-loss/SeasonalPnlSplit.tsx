'use client';
/**
 * SeasonalPnlSplit.tsx — S5b 春夏vs秋冬损益拆分
 */
import seasRaw from '../../../data/planning/pnl_seasonal_split.json';

type SeasData = typeof seasRaw;
const sData = seasRaw as SeasData;

function fmtM(v: number) {
  const s = v < 0 ? '-' : ''; const a = Math.abs(v);
  if (a >= 1e4) return s + '¥' + (a / 1e4).toFixed(0) + '万';
  return s + '¥' + a.toLocaleString();
}
function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

function SeasonCard({ data, color }: { data: typeof sData.springSummer; color: 'sky' | 'amber' }) {
  const clr = color === 'sky'
    ? { bg: 'bg-sky-50', border: 'border-sky-200', title: 'text-sky-800', gm: 'text-sky-700' }
    : { bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-amber-800', gm: 'text-amber-700' };
  return (
    <div className={`rounded-2xl border ${clr.border} ${clr.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-sm font-black ${clr.title}`}>{data.label}</div>
          <div className="text-[10px] text-slate-400">{data.months}</div>
        </div>
        <div className={`text-xl font-black ${clr.gm}`}>{pct(data.grossMarginRate)}<span className="text-[10px] font-normal ml-1">毛利率</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {[
          { l: '净收入', v: fmtM(data.netRevenue) },
          { l: '毛利', v: fmtM(data.grossProfit) },
          { l: 'EBIT', v: fmtM(data.ebit) },
          { l: '净利润', v: fmtM(data.netProfit), bold: true },
          { l: 'EBIT率', v: pct(data.ebitRate) },
          { l: '净利率', v: pct(data.netProfitRate) },
        ].map(k => (
          <div key={k.l} className="bg-white/60 rounded-lg px-2 py-1.5">
            <div className="text-[10px] text-slate-400">{k.l}</div>
            <div className={`font-${k.bold ? 'bold' : 'medium'} text-slate-800 mt-0.5`}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="text-[10px] text-slate-500 font-medium">品类结构</div>
        {data.topCategories.map(c => (
          <div key={c.key} className="flex items-center gap-2 text-[11px]">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span className="text-slate-700 w-20 shrink-0">{c.label}</span>
            <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color === 'sky' ? 'bg-sky-400' : 'bg-amber-400'}`}
                style={{ width: `${c.salesShare * 100}%` }} />
            </div>
            <span className="text-slate-400 w-10 text-right">{pct(c.salesShare)}</span>
            <span className={`font-medium w-12 text-right ${c.grossMarginRate >= 0.50 ? 'text-emerald-600' : 'text-amber-600'}`}>{pct(c.grossMarginRate)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeasonalPnlSplit() {
  const attr = sData.attribution;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SeasonCard data={sData.springSummer} color="sky" />
        <SeasonCard data={sData.autumnWinter} color="amber" />
      </div>
      {/* 差异归因 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="text-xs font-bold text-slate-700 mb-3">
          毛利率差异归因：秋冬高于春夏 {(attr.grossMarginGap * 100).toFixed(1)}pp
        </div>
        <div className="text-[11px] text-slate-500 mb-2">{attr.gapExplanation}</div>
        <div className="space-y-2">
          {attr.factors.map(f => (
            <div key={f.factor} className="flex items-center gap-3 text-[11px]">
              <span className="text-slate-700 font-medium w-32 shrink-0">{f.factor}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${(f.impact / attr.grossMarginGap) * 100}%` }} />
              </div>
              <span className="text-amber-600 font-medium w-16 text-right">+{(f.impact * 100).toFixed(1)}pp</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
