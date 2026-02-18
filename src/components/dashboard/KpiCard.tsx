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

const HINT_STYLES = {
    warning: 'text-red-600 bg-red-50',
    opportunity: 'text-emerald-600 bg-emerald-50',
    neutral: 'text-slate-500 bg-slate-50',
};

export default function KpiCard({
    label, value, delta, deltaPositive, gap, gapPositive,
    hint, hintType = 'neutral', onClick, group = 'outcome',
}: KpiCardProps) {
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

            {/* Main Value */}
            <div className="text-2xl font-bold text-slate-900 mb-2">{value}</div>

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
