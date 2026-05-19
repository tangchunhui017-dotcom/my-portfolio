'use client';
/**
 * src/components/dashboard/channel/ChannelKpiCard.tsx
 * V15: 统一 KPI 卡组件
 */

type Tone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate';

interface ChannelKpiCardProps {
    label: string;
    value: string;
    subValue?: string;
    diffPct?: number | null;   // vs target / vs LW (+/-百分比)
    diffLabel?: string;
    tone?: Tone;
    icon?: string;
    compact?: boolean;
}

const TONE_STYLES: Record<Tone, { border: string; bg: string; value: string; diff: (v: number) => string }> = {
    emerald: {
        border: 'border-emerald-100',
        bg: 'bg-emerald-50/50',
        value: 'text-emerald-700',
        diff: (v) => v >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    sky: {
        border: 'border-sky-100',
        bg: 'bg-sky-50/40',
        value: 'text-sky-700',
        diff: (v) => v >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    amber: {
        border: 'border-amber-100',
        bg: 'bg-amber-50/40',
        value: 'text-amber-700',
        diff: (v) => v >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    rose: {
        border: 'border-rose-100',
        bg: 'bg-rose-50/40',
        value: 'text-rose-700',
        diff: (v) => v >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    violet: {
        border: 'border-violet-100',
        bg: 'bg-violet-50/40',
        value: 'text-violet-700',
        diff: (v) => v >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    slate: {
        border: 'border-slate-200',
        bg: 'bg-slate-50',
        value: 'text-slate-800',
        diff: (v) => v >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
};

export default function ChannelKpiCard({
    label,
    value,
    subValue,
    diffPct,
    diffLabel,
    tone = 'slate',
    icon,
    compact = false,
}: ChannelKpiCardProps) {
    const style = TONE_STYLES[tone];
    return (
        <div className={`rounded-xl border ${style.border} ${style.bg} ${compact ? 'p-3' : 'p-4'} flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5">
                {icon && <span className="text-sm leading-none">{icon}</span>}
                <span className="text-xs text-slate-500 font-medium leading-tight">{label}</span>
            </div>
            <div className={`${compact ? 'text-xl' : 'text-2xl'} font-bold ${style.value} leading-tight`}>
                {value}
            </div>
            {subValue && (
                <div className="text-[11px] text-slate-500">{subValue}</div>
            )}
            {diffPct !== undefined && diffPct !== null && (
                <div className={`text-xs font-medium ${style.diff(diffPct)}`}>
                    {diffPct >= 0 ? '▲' : '▼'} {Math.abs(diffPct).toFixed(1)}%
                    {diffLabel && <span className="text-slate-400 font-normal ml-1">{diffLabel}</span>}
                </div>
            )}
        </div>
    );
}
