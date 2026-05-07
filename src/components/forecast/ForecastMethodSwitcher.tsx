'use client';
/**
 * src/components/forecast/ForecastMethodSwitcher.tsx
 */
import type { ForecastMethod } from '@/context/GlobalConfigContext';

interface Props {
    method: ForecastMethod;
    onChange: (m: ForecastMethod) => void;
}

const OPTIONS: { value: ForecastMethod; label: string }[] = [
    { value: 'growth_based', label: '增长率预测' },
    { value: 'driver_based', label: '驱动因子预测' },
    { value: 'hybrid', label: '混合预测' },
];

export default function ForecastMethodSwitcher({ method, onChange }: Props) {
    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {OPTIONS.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        method === opt.value
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
