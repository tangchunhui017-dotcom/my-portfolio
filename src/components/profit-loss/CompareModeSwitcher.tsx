'use client';
/**
 * src/components/profit-loss/CompareModeSwitcher.tsx
 * 对比模式切换：本年 / vs LY / vs 预算
 */
export type CompareMode = 'actual' | 'vs_ly' | 'vs_budget';

interface Props { mode: CompareMode; onChange: (m: CompareMode) => void; }

const OPTIONS: { key: CompareMode; label: string; icon: string }[] = [
    { key: 'actual', label: '本年实际', icon: '📊' },
    { key: 'vs_ly', label: 'vs 去年同期', icon: '📅' },
    { key: 'vs_budget', label: 'vs 预算', icon: '🎯' },
];

export default function CompareModeSwitcher({ mode, onChange }: Props) {
    return (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {OPTIONS.map(o => (
                <button key={o.key} onClick={() => onChange(o.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        mode === o.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}>
                    <span>{o.icon}</span><span>{o.label}</span>
                </button>
            ))}
        </div>
    );
}
