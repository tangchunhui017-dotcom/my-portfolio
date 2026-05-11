'use client';
/**
 * src/components/profit-loss/FootwearKpiRow.tsx
 * S2 第三排：鞋类专属 KPI 4 卡（库存周转/新品贡献/加权售罄率/CCC）
 */
import footwearKpiRaw from '../../../data/planning/pnl_footwear_kpi.json';

type FKpi = typeof footwearKpiRaw;
const fkpi = footwearKpiRaw as FKpi;

function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

interface KpiItem {
    label: string; value: string; unit: string; target: string;
    lyValue: string; verdict: string;
    tone: 'green' | 'amber' | 'red';
    health: string;
}

export default function FootwearKpiRow() {
    const it = fkpi.inventoryTurnover;
    const np = fkpi.newProductContribution;
    const st = fkpi.weightedSellThrough;
    const cc = fkpi.ccc;

    const kpis: KpiItem[] = [
        {
            label: '库存周转率', value: it.actual + ' 次/年', unit: '次/年', target: it.target + ' 次/年',
            lyValue: it.lastYear + ' 次/年', verdict: it.verdict,
            tone: it.actual >= it.healthMin && it.actual <= it.healthMax ? 'green' : it.actual < it.healthMin ? 'red' : 'amber',
            health: `健康线 ${it.healthMin}-${it.healthMax}`,
        },
        {
            label: '新品销售贡献率', value: pct(np.actual), unit: '%', target: pct(np.target),
            lyValue: pct(np.lastYear), verdict: np.verdict,
            tone: np.actual >= np.healthMin && np.actual <= np.healthMax ? 'green' : 'amber',
            health: `健康线 ${pct(np.healthMin)}-${pct(np.healthMax)}`,
        },
        {
            label: '加权售罄率', value: pct(st.actual), unit: '%', target: pct(st.target),
            lyValue: pct(st.lastYear), verdict: st.verdict,
            tone: st.actual >= st.healthMin ? 'green' : st.actual >= st.healthMin * 0.92 ? 'amber' : 'red',
            health: `健康线 ≥ ${pct(st.healthMin)}`,
        },
        {
            label: '现金转化周期 CCC', value: cc.ccc + ' 天', unit: '天', target: cc.target + ' 天',
            lyValue: cc.lastYear + ' 天', verdict: cc.verdict,
            tone: cc.ccc <= cc.target ? 'green' : cc.ccc <= cc.target * 1.15 ? 'amber' : 'red',
            health: `DSO ${cc.dso}d + DIO ${cc.dio}d - DPO ${cc.dpo}d`,
        },
    ];

    const toneClasses = {
        green: { badge: 'bg-emerald-100 text-emerald-700', card: 'border-emerald-100', val: 'text-emerald-700' },
        amber: { badge: 'bg-amber-100 text-amber-700', card: 'border-amber-100', val: 'text-amber-700' },
        red: { badge: 'bg-rose-100 text-rose-700', card: 'border-rose-100', val: 'text-rose-700' },
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(k => {
                const cls = toneClasses[k.tone];
                return (
                    <div key={k.label} className={`bg-white rounded-xl border ${cls.card} shadow-sm px-4 py-3 space-y-1`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">{k.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${cls.badge}`}>鞋类专属</span>
                        </div>
                        <div className={`text-base font-bold ${cls.val}`}>{k.value}</div>
                        <div className="text-[10px] text-slate-400">目标 {k.target} · 去年 {k.lyValue}</div>
                        <div className="text-[10px] text-slate-500">{k.health}</div>
                        <div className={`text-[10px] ${cls.val}`}>{k.verdict}</div>
                    </div>
                );
            })}
        </div>
    );
}
