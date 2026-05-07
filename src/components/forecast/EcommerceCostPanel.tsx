'use client';
/**
 * src/components/forecast/EcommerceCostPanel.tsx
 */
import type { EcommerceDriverForecastRow } from '@/hooks/useForecast';

interface Props {
    rows: EcommerceDriverForecastRow[];
}

function fmt(v: number) {
    return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toFixed(0);
}
function pct(v: number) {
    return `${(v * 100).toFixed(1)}%`;
}

export default function EcommerceCostPanel({ rows }: Props) {
    const annual = rows.reduce((acc, r) => ({
        grossSales: acc.grossSales + r.grossSales,
        refundAmount: acc.refundAmount + r.refundAmount,
        netSales: acc.netSales + r.netSales,
        trafficCost: acc.trafficCost + r.trafficCost,
        platformFee: acc.platformFee + r.platformFee,
        paymentFee: acc.paymentFee + r.paymentFee,
        customerServiceCost: acc.customerServiceCost + r.customerServiceCost,
        totalVariableCost: acc.totalVariableCost + r.totalVariableCost,
    }), {
        grossSales: 0, refundAmount: 0, netSales: 0, trafficCost: 0,
        platformFee: 0, paymentFee: 0, customerServiceCost: 0, totalVariableCost: 0,
    });
    const annualCostRate = annual.netSales > 0 ? annual.totalVariableCost / annual.netSales : 0;

    // Top 3 cost-peak months by totalVariableCost
    const sortedRows = [...rows].sort((a, b) => b.totalVariableCost - a.totalVariableCost);
    const top3 = sortedRows.slice(0, 3);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <h3 className="font-medium text-slate-700 mb-4">电商成本分析</h3>
            {/* Annual summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">毛销售额</p>
                    <p className="text-lg font-semibold">{fmt(annual.grossSales)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">退款金额</p>
                    <p className="text-lg font-semibold text-red-600">-{fmt(annual.refundAmount)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">净销售收入</p>
                    <p className="text-lg font-semibold text-emerald-700">{fmt(annual.netSales)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">变动成本率</p>
                    <p className="text-lg font-semibold text-amber-700">{pct(annualCostRate)}</p>
                </div>
            </div>
            {/* Cost breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">流量成本</p>
                    <p className="text-base font-medium">{fmt(annual.trafficCost)}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">平台佣金</p>
                    <p className="text-base font-medium">{fmt(annual.platformFee)}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">支付手续费</p>
                    <p className="text-base font-medium">{fmt(annual.paymentFee)}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">客服成本</p>
                    <p className="text-base font-medium">{fmt(annual.customerServiceCost)}</p>
                </div>
            </div>
            {/* Top 3 cost months */}
            <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-700 mb-2">费用高峰月份（前3）</p>
                <div className="flex gap-3">
                    {top3.map(r => (
                        <div key={r.month} className="text-sm">
                            <span className="font-medium">{r.label}</span>
                            <span className="text-slate-500 ml-1">{fmt(r.totalVariableCost)}</span>
                            <span className="text-xs text-amber-600 ml-1">({pct(r.costToNetSalesRate)})</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Monthly table */}
            <div className="overflow-x-auto mt-4 rounded-lg border border-slate-100">
                <table className="w-full text-xs text-slate-600 whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <th className="px-3 py-2 text-left">月份</th>
                            <th className="px-3 py-2 text-right">净销售</th>
                            <th className="px-3 py-2 text-right">退款</th>
                            <th className="px-3 py-2 text-right">流量成本</th>
                            <th className="px-3 py-2 text-right">平台费</th>
                            <th className="px-3 py-2 text-right">合计变动成本</th>
                            <th className="px-3 py-2 text-right">费率</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.month} className="border-b border-slate-50 hover:bg-slate-50/60">
                                <td className="px-3 py-1.5 font-medium">{r.label}</td>
                                <td className="px-3 py-1.5 text-right">{fmt(r.netSales)}</td>
                                <td className="px-3 py-1.5 text-right text-red-400">{fmt(r.refundAmount)}</td>
                                <td className="px-3 py-1.5 text-right">{fmt(r.trafficCost)}</td>
                                <td className="px-3 py-1.5 text-right">{fmt(r.platformFee)}</td>
                                <td className="px-3 py-1.5 text-right font-medium">{fmt(r.totalVariableCost)}</td>
                                <td className={`px-3 py-1.5 text-right ${r.costToNetSalesRate > 0.3 ? 'text-red-500' : 'text-slate-500'}`}>
                                    {pct(r.costToNetSalesRate)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
