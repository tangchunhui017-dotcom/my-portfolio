'use client';
/**
 * src/components/profit-loss/DimensionDrillDown.tsx
 * S4: 利润桥柱子点击 → 该科目 按渠道/品类/月份 3维拆解面板
 */
import { useRef, useEffect, useState } from 'react';
import channelRaw from '../../../data/planning/pnl_channel_contribution.json';
import categoryRaw from '../../../data/planning/pnl_category_contribution.json';
import brandRaw from '../../../data/planning/pnl_brand_annual.json';

type DrillDim = 'channel' | 'category' | 'monthly';

interface Props { itemLabel: string; itemValue: number; onClose: () => void; }

type ECharts = { setOption: (o: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => ECharts };

function fmtCny(v: number) {
    const abs = Math.abs(v);
    if (abs >= 1e4) return `¥${(abs / 10000).toFixed(1)}万`;
    return `¥${abs.toLocaleString()}`;
}

function DrillChart({ dim, itemLabel }: { dim: DrillDim; itemLabel: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        let chart: ECharts | null = null;
        const init = async () => {
            const ec = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = ec.init(ref.current);
            let names: string[] = [], values: number[] = [], colors: string[] = [];
            if (dim === 'channel') {
                const chs = (channelRaw as typeof channelRaw).channels;
                names = chs.map(c => c.label);
                values = chs.map(c => c.netRevenue * 0.15); // 近似费用按收入比例
                colors = ['#38bdf8', '#8b5cf6', '#10b981'];
            } else if (dim === 'category') {
                const cats = (categoryRaw as typeof categoryRaw).categories;
                names = cats.map(c => c.label);
                values = cats.map(c => c.salesAmount * 0.12);
                colors = cats.map((_, i) => ['#38bdf8','#8b5cf6','#10b981','#f59e0b','#ef4444','#6366f1','#64748b'][i % 7]);
            } else {
                const monthly = (brandRaw as typeof brandRaw).monthlyBreakdown;
                names = monthly.map(m => m.label);
                values = monthly.map(m => m.netRevenue * 0.15);
                colors = ['#38bdf8'];
            }
            chart.setOption({
                tooltip: { trigger: 'axis' },
                grid: { left: 16, right: 16, top: 16, bottom: 36, containLabel: true },
                xAxis: { type: 'category', data: names, axisLabel: { fontSize: 9, rotate: dim === 'monthly' ? 0 : 20 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 9 } },
                series: [{ type: 'bar', data: values.map((v, i) => ({ value: v, itemStyle: { color: Array.isArray(colors) && colors.length > 1 ? colors[i] : colors[0] } })), barMaxWidth: 32,
                    label: { show: true, position: 'top', fontSize: 8, formatter: (p: { value: number }) => fmtCny(p.value) } }],
            });
        };
        init();
        const obs = new ResizeObserver(() => chart?.resize());
        if (ref.current) obs.observe(ref.current);
        return () => { obs.disconnect(); chart?.dispose(); };
    }, [dim]);
    return <div ref={ref} style={{ height: 200 }} />;
}

export default function DimensionDrillDown({ itemLabel, itemValue, onClose }: Props) {
    const dims: { key: DrillDim; label: string }[] = [
        { key: 'channel', label: '按渠道' },
        { key: 'category', label: '按品类' },
        { key: 'monthly', label: '按月份' },
    ];
    const [activeDim, setActiveDim] = useState<DrillDim>('channel');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">{itemLabel}</h3>
                        <p className="text-[11px] text-slate-400">金额: {fmtCny(itemValue)} · 3维拆解</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {dims.map(d => (
                        <button key={d.key} onClick={() => setActiveDim(d.key)}
                            className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all ${activeDim === d.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                            {d.label}
                        </button>
                    ))}
                </div>
                <DrillChart dim={activeDim} itemLabel={itemLabel} />
                <p className="text-[10px] text-slate-400 text-center">* 拆解数据为近似估算，供参考决策用</p>
            </div>
        </div>
    );
}
