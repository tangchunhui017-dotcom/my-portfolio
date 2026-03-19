'use client';

interface ModeSwitchProps {
  mode: 'work' | 'report';
  onModeChange: (mode: 'work' | 'report') => void;
}

export default function ModeSwitch({ mode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-1 shadow-sm">
      <button
        onClick={() => onModeChange('work')}
        className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all ${
          mode === 'work'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="mr-2">💼</span>
        工作模式
      </button>
      <button
        onClick={() => onModeChange('report')}
        className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all ${
          mode === 'report'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="mr-2">📊</span>
        汇报模式
      </button>
    </div>
  );
}
