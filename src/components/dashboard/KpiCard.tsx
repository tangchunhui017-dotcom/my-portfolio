'use client';

interface KpiCardProps {
    label: string;
    value: string;
    delta?: string;
    deltaPositive?: boolean;
    gap?: string;
    gapPositive?: boolean;
    hint?: string;
    hintType?: 'warning' | 'opportunity' | 'neutral';
    onClick?: () => void;
    group?: 'outcome' | 'efficiency' | 'structure';
    sparklineData?: number[]; // 12周趋势数据
    variant?: 'default' | 'compact' | 'highlight' | 'minimal'; // 新增布局变体
}

const GROUP_COLORS = {
    outcome: 'border-blue-500',
    efficiency: 'border-amber-500',
    structure: 'border-emerald-500',
};

const GROUP_BG = {
    outcome: 'bg-blue-50',
    efficiency: 'bg-amber-50',
    structure: 'bg-emerald-50',
};

const GROUP_GRADIENTS = {
    outcome: 'from-blue-500 to-blue-600',
    efficiency: 'from-amber-500 to-amber-600',
    structure: 'from-emerald-500 to-emerald-600',
};

const HINT_STYLES = {
    warning: 'text-red-600 bg-red-50',
    opportunity: 'text-emerald-600 bg-emerald-50',
    neutral: 'text-slate-500 bg-slate-50',
};

export default function KpiCard({
    label, value, delta, deltaPositive, gap, gapPositive,
    hint, hintType = 'neutral', onClick, group = 'outcome', sparklineData,
    variant = 'default',
}: KpiCardProps) {
    // 生成 SVG Sparkline 路径
    const generateSparkline = (data: number[]) => {
        if (!data || data.length === 0) return '';
        const width = 80;
        const height = 24;
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

    // 根据变体选择不同的布局
    if (variant === 'highlight') {
        return (
            <div
                onClick={onClick}
                className={`
                    bg-gradient-to-br ${GROUP_GRADIENTS[group]} text-white
                    rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200
                    ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}
                `}
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-white/80 uppercase tracking-wide">{label}</span>
                    <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                </div>

                <div className="text-3xl font-bold mb-2">{value}</div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                        {delta && (
                            <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded">
                                {deltaPositive ? '↗' : '↘'} {delta}
                            </span>
                        )}
                    </div>
                    {sparklineData && (
                        <svg width="60" height="20" className="opacity-80">
                            <path
                                d={generateSparkline(sparklineData)}
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div
                onClick={onClick}
                className={`
                    bg-white rounded-lg border ${GROUP_COLORS[group]}
                    p-3 shadow-sm hover:shadow-md transition-all duration-200
                    ${onClick ? 'cursor-pointer' : ''}
                `}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <div className="text-xl font-bold text-slate-900">{value}</div>
                    </div>
                    <div className="text-right">
                        {delta && (
                            <div className={`text-xs font-medium ${deltaPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {deltaPositive ? '+' : ''}{delta}
                            </div>
                        )}
                        {sparklineData && (
                            <svg width="40" height="16" className="mt-1">
                                <path
                                    d={generateSparkline(sparklineData)}
                                    fill="none"
                                    stroke={group === 'outcome' ? '#3b82f6' : group === 'efficiency' ? '#f59e0b' : '#10b981'}
                                    strokeWidth="1.5"
                                />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'minimal') {
        return (
            <div
                onClick={onClick}
                className={`
                    bg-emerald-50/60 rounded-lg p-4 border border-emerald-100 hover:bg-emerald-50 transition-all duration-200
                    ${onClick ? 'cursor-pointer' : ''}
                `}
            >
                <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">{label}</div>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-slate-800">{value}</div>
                    {delta && (
                        <span className={`text-sm ${deltaPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {deltaPositive ? '+' : ''}{delta}
                        </span>
                    )}
                </div>
                {hint && (
                    <div className="text-xs text-slate-600 mt-2">{hint}</div>
                )}
            </div>
        );
    }

    // Default variant (原有设计)
    return (
        <div
            onClick={onClick}
            className={`
                bg-white rounded-xl border-l-4 ${GROUP_COLORS[group]}
                p-4 shadow-sm hover:shadow-md transition-all duration-200
                ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}
            `}
        >
            {/* Label */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
                {group && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${GROUP_BG[group]} ${group === 'outcome' ? 'text-blue-600' : group === 'efficiency' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                        {group === 'outcome' ? '结果' : group === 'efficiency' ? '效率' : '结构'}
                    </span>
                )}
            </div>

            {/* Main Value + Sparkline */}
            <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                {sparklineData && sparklineData.length > 0 && (
                    <svg width="80" height="24" className="opacity-60">
                        <path
                            d={generateSparkline(sparklineData)}
                            fill="none"
                            stroke={group === 'outcome' ? '#3b82f6' : group === 'efficiency' ? '#f59e0b' : '#10b981'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </div>

            {/* Delta & Gap Row */}
            <div className="flex items-center gap-3 mb-2">
                {delta && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${deltaPositive ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                        {deltaPositive ? '▲' : '▼'} {delta} 同比
                    </span>
                )}
                {gap && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${gapPositive ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                        {gapPositive ? '+' : ''}{gap} vs目标
                    </span>
                )}
            </div>

            {/* Hint */}
            {hint && (
                <div className={`text-xs px-2 py-1 rounded-md ${HINT_STYLES[hintType]}`}>
                    {hint}
                </div>
            )}
        </div>
    );
}
