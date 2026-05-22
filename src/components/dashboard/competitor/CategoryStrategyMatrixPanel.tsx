'use client';

import type { CategoryStrategyMatrixCell, CategoryStrategy, ShoeTypeMaturity, OurPosition } from '@/types/competitorTrendTypes';

const STRATEGY_STYLES: Record<CategoryStrategy, { bg: string; text: string; border: string; dot: string }> = {
    '守住':   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
    '跟进加码': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    '小批切入': { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
    '观望':   { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400' },
    '退出':   { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
};

const POSITION_STYLES: Record<OurPosition, string> = {
    '强势':   'bg-emerald-100 text-emerald-700 border border-emerald-200',
    '持平':   'bg-blue-100 text-blue-700 border border-blue-200',
    '薄弱':   'bg-amber-100 text-amber-700 border border-amber-200',
    '未布局': 'bg-slate-100 text-slate-500 border border-slate-200',
};

const PRIORITY_STYLES: Record<'H' | 'M' | 'L', string> = {
    H: 'bg-rose-500 text-white',
    M: 'bg-amber-400 text-white',
    L: 'bg-slate-300 text-slate-600',
};

const MATURITY_COLS: ShoeTypeMaturity[] = ['成熟', '成长', '潜力', '机会'];

interface Props {
    cells: CategoryStrategyMatrixCell[];
}

function MatrixCell({ cell }: { cell: CategoryStrategyMatrixCell }) {
    const s = STRATEGY_STYLES[cell.strategy];
    return (
        <div className="relative rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-1.5 hover:shadow-sm transition-shadow">
            {/* Priority badge top-right */}
            <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_STYLES[cell.seasonPriority]}`}>
                {cell.seasonPriority}
            </span>

            {/* Shoe type name */}
            <div className="font-semibold text-slate-800 text-sm pr-6 leading-tight">{cell.shoeType}</div>

            {/* Strategy tag */}
            <span className={`self-start text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
                {cell.strategy}
            </span>

            {/* Reason */}
            <p className="text-[11px] text-slate-500 leading-[1.4]">{cell.strategyReason}</p>

            {/* Our position */}
            <span className={`self-start text-[10px] px-1.5 py-0.5 rounded-full ${POSITION_STYLES[cell.ourPosition]}`}>
                本品：{cell.ourPosition}
            </span>

            {/* Top competitor brands */}
            {cell.topCompetitorBrands.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {cell.topCompetitorBrands.slice(0, 2).map((brand) => (
                        <span key={brand} className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                            {brand}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CategoryStrategyMatrixPanel({ cells }: Props) {
    const coreCells = cells.filter((c) => c.coreMore === 'core');
    const moreCells = cells.filter((c) => c.coreMore === 'more');

    const strategies: CategoryStrategy[] = ['守住', '跟进加码', '小批切入', '观望', '退出'];

    return (
        <div className="space-y-4">
            {/* Strategy Legend */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-400 mr-1">策略图例：</span>
                {strategies.map((s) => {
                    const st = STRATEGY_STYLES[s];
                    return (
                        <span key={s} className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {s}
                        </span>
                    );
                })}
                <span className="ml-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>优先级：</span>
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">H</span>高
                    <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">M</span>中
                    <span className="bg-slate-300 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">L</span>低
                </span>
            </div>

            {/* Matrix grid */}
            {[
                { label: 'CORE 核心鞋型', sublabel: '稳定基本盘，占SKU计划60%+', data: coreCells },
                { label: 'MORE 延伸鞋型', sublabel: '增量机会，占SKU计划40%以下', data: moreCells },
            ].map(({ label, sublabel, data }) => (
                <div key={label} className="rounded-xl border border-slate-100 overflow-hidden">
                    {/* Row header */}
                    <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{label}</span>
                        <span className="text-[11px] text-slate-400">{sublabel}</span>
                    </div>

                    {/* Maturity columns header */}
                    <div className="grid grid-cols-4 border-b border-slate-100">
                        {MATURITY_COLS.map((col) => (
                            <div key={col} className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center border-r last:border-r-0 border-slate-100">
                                {col}
                            </div>
                        ))}
                    </div>

                    {/* Cards */}
                    <div className="grid grid-cols-4 gap-0">
                        {MATURITY_COLS.map((maturity) => {
                            const colCells = data.filter((c) => c.maturity === maturity);
                            return (
                                <div key={maturity} className="border-r last:border-r-0 border-slate-100 p-2 space-y-2 min-h-[80px]">
                                    {colCells.length === 0 ? (
                                        <div className="text-[11px] text-slate-300 text-center mt-4">—</div>
                                    ) : (
                                        colCells.map((cell) => (
                                            <MatrixCell key={cell.id} cell={cell} />
                                        ))
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Summary counts */}
            <div className="flex flex-wrap gap-3 pt-1">
                {strategies.map((s) => {
                    const count = cells.filter((c) => c.strategy === s).length;
                    const st = STRATEGY_STYLES[s];
                    return (
                        <div key={s} className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border ${st.bg} ${st.text} ${st.border}`}>
                            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                            {s}：{count} 款
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
