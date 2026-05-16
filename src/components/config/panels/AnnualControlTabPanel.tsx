'use client';
import TabConfigPanel from './TabConfigPanel';
export default function AnnualControlTabPanel() {
    return (
        <TabConfigPanel
            tabKey="annual-control"
            customSections={[
                {
                    id: 'season-ratio',
                    label: '季节拆分比例',
                    render: () => (
                        <div className="grid grid-cols-2 gap-3">
                            {[{ label: '春夏 SS', key: 'ss' }, { label: '秋冬 AW', key: 'aw' }].map((s) => (
                                <div key={s.key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                    <span className="text-sm text-slate-700">{s.label}</span>
                                    <input className="border border-slate-200 rounded px-2 py-1 w-24 text-sm text-right" placeholder="%" />
                                </div>
                            ))}
                        </div>
                    ),
                },
            ]}
        />
    );
}
