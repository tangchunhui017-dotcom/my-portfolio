import React from 'react';

interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    description?: string;
}

export default function MetricCard({
    label,
    value,
    unit = '',
    trend,
    trendValue,
    description
}: MetricCardProps) {
    const getTrendColor = () => {
        if (!trend) return '';
        return trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500';
    };

    const getTrendIcon = () => {
        if (!trend) return null;
        return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                {label}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-slate-900">{value}</span>
                {unit && <span className="text-lg text-slate-600">{unit}</span>}
            </div>

            {trend && trendValue && (
                <div className={`text-sm font-medium ${getTrendColor()} flex items-center gap-1`}>
                    <span>{getTrendIcon()}</span>
                    <span>{trendValue}</span>
                </div>
            )}

            {description && (
                <p className="text-sm text-slate-600 mt-2">{description}</p>
            )}
        </div>
    );
}
