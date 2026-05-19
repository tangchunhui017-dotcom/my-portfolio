'use client';
/**
 * src/components/dashboard/channel/ChannelSectionHeader.tsx
 * V15: 统一 Section 标题组件
 */
import { ReactNode } from 'react';

interface ChannelSectionHeaderProps {
    icon?: string;
    title: string;
    subtitle?: string;
    badge?: string;
    badgeColor?: 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate';
    rightAction?: ReactNode;
    colorBar?: 'blue' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';
}

const BAR_COLOR: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
};

const BADGE_COLOR: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
};

export default function ChannelSectionHeader({
    icon,
    title,
    subtitle,
    badge,
    badgeColor = 'slate',
    rightAction,
    colorBar = 'blue',
}: ChannelSectionHeaderProps) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
                <span className={`w-1 h-5 rounded-full ${BAR_COLOR[colorBar]} inline-block mt-0.5 shrink-0`} />
                <div>
                    <div className="flex items-center gap-2">
                        {icon && <span className="text-base leading-none">{icon}</span>}
                        <h2 className="text-base font-bold text-slate-900">{title}</h2>
                        {badge && (
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE_COLOR[badgeColor]}`}>
                                {badge}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
            {rightAction && (
                <div className="shrink-0">{rightAction}</div>
            )}
        </div>
    );
}
