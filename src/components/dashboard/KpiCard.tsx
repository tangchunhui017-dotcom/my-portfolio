'use client';

interface KpiCardProps {
    label: string;
    value: string;
    delta?: string;
    deltaLabel?: string;
    deltaPositive?: boolean;
    gap?: string;
    gapPositive?: boolean;
    hint?: string;
    hintType?: 'warning' | 'opportunity' | 'neutral';
    onClick?: () => void;
    group?: 'outcome' | 'efficiency' | 'structure';
    sparklineData?: number[];
    variant?: 'default' | 'compact' | 'highlight' | 'minimal';
}

// 颜色系统：与网站主色对齐（品牌粉 + emerald/amber/slate）
const GROUP_COLORS = {
    outcome: 'border-pink-400',
    efficiency: 'border-amber-400',
    structure: 'border-emerald-400',
};

const GROUP_BG = {
    outcome: 'bg-pink-50 text-pink-700',
    efficiency: 'bg-amber-50 text-amber-700',
    structure: 'bg-emerald-50 text-emerald-700',
};

const GROUP_GRADIENTS = {
    outcome: 'from-pink-500 to-pink-700',
    efficiency: 'from-amber-400 to-amber-600',
    structure: 'from-emerald-400 to-emerald-600',
};

const GROUP_STROKE = {
    outcome: '#ec4899',  // pink-500
    efficiency: '#f59e0b',  // amber-400
    structure: '#10b981',  // emerald-500
};

const HINT_STYLES = {
    warning: 'text-red-600 bg-red-50',
    opportunity: 'text-emerald-600 bg-emerald-50',
    neutral: 'text-slate-500 bg-slate-50',
};

export default function KpiCard({
    label, value, delta, deltaLabel, deltaPositive, gap, gapPositive,
    hint, hintType = 'neutral', onClick, group = 'outcome', sparklineData,
    variant = 'default',
}: KpiCardProps) {
    const generateSparkline = (data: number[]) => {
        if (!data || data.length === 0) return '';
        const width = 80, height = 24;
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    };

    // ── Highlight: 渐变色大卡 ────────────────────────────────────────
    if (variant === 'highlight') {
        return (
            <div
                onClick={onClick}
                className={`
                    bg-gradient-to-br ${GROUP_GRADIENTS[group]} text-white
                    rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-200
                    ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}
                `}
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white/75 uppercase tracking-widest">{label}</span>
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                </div>
                <div className="text-3xl font-bold mb-3">{value}</div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                        {delta && (
                            <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full font-medium">
                                {deltaPositive ? '↗' : '↘'} {delta}
                            </span>
                        )}
                    </div>
                    {sparklineData && (
                        <svg width="60" height="20" className="opacity-75">
                            <path d={generateSparkline(sparklineData)} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    )}
                </div>
            </div>
        );
    }

    // ── Compact: 紧凑小卡 ────────────────────────────────────────────
    if (variant === 'compact') {
        return (
            <div
                onClick={onClick}
                className={`
                    bg-white rounded-xl border-l-4 ${GROUP_COLORS[group]}
                    p-3 shadow-sm hover:shadow-md transition-all duration-200
                    ${onClick ? 'cursor-pointer' : ''}
                `}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-400 mb-1 font-medium">{label}</div>
                        <div className="text-xl font-bold text-slate-900">{value}</div>
                    </div>
                    <div className="text-right">
                        {delta && (
                            <div className={`text-xs font-semibold ${deltaPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                {deltaPositive ? '▲' : '▼'} {delta} {deltaLabel}
                            </div>
                        )}
                        {sparklineData && (
                            <svg width="40" height="16" className="mt-1">
                                <path d={generateSparkline(sparklineData)} fill="none" stroke={GROUP_STROKE[group]} strokeWidth="1.5" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Minimal: 结构区轻量卡 ─────────────────────────────────────────
    if (variant === 'minimal') {
        return (
            <div
                onClick={onClick}
                className={`
                    rounded-xl p-4 border border-slate-100 bg-slate-50/60
                    hover:bg-slate-50 transition-all duration-200
                    ${onClick ? 'cursor-pointer' : ''}
                `}
            >
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</div>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-slate-800">{value}</div>
                    {delta && (
                        <span className={`text-sm font-medium ${deltaPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {deltaPositive ? '+' : ''}{delta}
                        </span>
                    )}
                </div>
                {hint && <div className="text-xs text-slate-500 mt-1.5">{hint}</div>}
            </div>
        );
    }

    // ── Default: 标准卡片（KpiGrid 主用）──────────────────────────────
    return (
        <div
            onClick={onClick}
            className={`
                bg-white rounded-xl border-l-4 ${GROUP_COLORS[group]}
                p-4 shadow-sm hover:shadow-md transition-all duration-200
                ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}
            `}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${GROUP_BG[group]}`}>
                    {group === 'outcome' ? '结果' : group === 'efficiency' ? '效率' : '结构'}
                </span>
            </div>

            <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                {sparklineData && sparklineData.length > 0 && (
                    <svg width="80" height="24" className="opacity-60">
                        <path
                            d={generateSparkline(sparklineData)}
                            fill="none"
                            stroke={GROUP_STROKE[group]}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </div>

            <div className="flex items-center gap-3 mb-2">
                {delta && (
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${deltaPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {deltaPositive ? '▲' : '▼'} {delta} {deltaLabel || ''}
                    </span>
                )}
                {gap && (
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${gapPositive ? 'text-pink-600' : 'text-red-600'}`}>
                        {gapPositive ? '+' : ''}{gap} vs目标
                    </span>
                )}
            </div>

            {hint && (
                <div className={`text-xs px-2 py-1 rounded-md ${HINT_STYLES[hintType]}`}>
                    {hint}
                </div>
            )}
        </div>
    );
}
