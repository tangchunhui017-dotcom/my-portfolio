'use client';
/**
 * 库存健康 KPI 总览条
 */
import type { StyleRecord } from '@/utils/inventoryHealth';
import { fmtCny } from '@/utils/inventoryHealth';
import { useResolvedThresholds } from '@/hooks/useResolvedThresholds';

interface Props {
    summary: {
        totalStockAmount: number;
        totalOnHandQty: number;
        totalAvailableQty: number;
        totalInTransitQty: number;
        overallWos: number;
        healthySkuPct: number;
        stockoutOpportunityLoss: number;
        overstockAmount: number;
        replenishCount: number;
        clearanceCount: number;
    };
    styles: StyleRecord[];
}

const STOCKOUT_RISKS = ['stockout', 'tight'];
const OVERSTOCK_RISKS = ['overstock', 'high'];

export default function InvKpiBar({ summary, styles }: Props) {
    const THRESHOLDS = useResolvedThresholds();
    const wosMin = THRESHOLDS.wos.stockout;
    const wosMax = THRESHOLDS.wos.healthy;
    const wosOverstocked = THRESHOLDS.wos.overstocked;
    const monitoredStyles = styles.length;
    const stockoutCount = styles.filter(s => STOCKOUT_RISKS.includes(s.riskType)).length;
    const overstockCount = styles.filter(s => OVERSTOCK_RISKS.includes(s.riskType)).length;

    const kpis = [
        { l: '库存总金额', v: fmtCny(summary.totalStockAmount), sub: null, tone: 'neutral' },
        { l: '可售库存（双）', v: summary.totalAvailableQty.toLocaleString(), sub: '在途 ' + summary.totalInTransitQty.toLocaleString() + ' 双', tone: 'neutral' },
        { l: '整体 WOS', v: summary.overallWos.toFixed(1) + ' 周', sub: `目标 ${wosMin}-${wosMax} 周`, tone: summary.overallWos >= wosMin && summary.overallWos <= wosMax ? 'positive' : summary.overallWos > wosOverstocked ? 'negative' : 'warning' },
        { l: '健康库存占比', v: (summary.healthySkuPct * 100).toFixed(0) + '%', sub: 'SKU 口径', tone: summary.healthySkuPct >= 0.50 ? 'positive' : 'warning' },
        { l: '断货机会损失', v: fmtCny(summary.stockoutOpportunityLoss), sub: stockoutCount + ' 款断货', tone: 'negative' },
        { l: '积压库存金额', v: fmtCny(summary.overstockAmount), sub: overstockCount + ' 款积压', tone: 'negative' },
        { l: '需补货款数', v: String(summary.replenishCount), sub: '→ OTB', tone: 'warning' },
        { l: '需清货款数', v: String(summary.clearanceCount), sub: '→ 损益', tone: 'warning' },
    ];

    const toneCls = { positive: 'text-emerald-600', negative: 'text-rose-600', warning: 'text-amber-600', neutral: 'text-slate-800' };

    // 整体健康判断
    const riskPct = 1 - summary.healthySkuPct;
    const status = riskPct > 0.35 ? 'danger' : riskPct > 0.18 ? 'warn' : 'good';
    const statusConf = {
        good: { label: '库存结构健康', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
        warn: { label: '结构偏差，需关注', cls: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500' },
        danger: { label: '结构失衡，立即处置', cls: 'bg-rose-50 border-rose-200 text-rose-700', dot: 'bg-rose-500' },
    }[status];

    return (
        <div className="space-y-3">
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium ${statusConf.cls}`}>
                <span className={`w-2 h-2 rounded-full ${statusConf.dot}`} />
                <span className="font-semibold">{statusConf.label}</span>
                <span className="opacity-70">·  全盘健康 SKU 占比 {(summary.healthySkuPct * 100).toFixed(0)}% · 重点监控 {monitoredStyles} 款 · 缺货/偏紧 {stockoutCount} 款 · 偏高/积压 {overstockCount} 款</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {kpis.map(k => (
                    <div key={k.l} className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-2.5">
                        <div className="text-[10px] text-slate-400 mb-1">{k.l}</div>
                        <div className={`font-bold text-sm ${toneCls[k.tone as keyof typeof toneCls]}`}>{k.v}</div>
                        {k.sub && <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
