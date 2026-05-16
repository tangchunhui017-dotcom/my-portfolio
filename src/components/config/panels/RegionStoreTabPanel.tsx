'use client';
import TabConfigPanel from './TabConfigPanel';
import { useMerchConfig } from '@/context/MerchConfigContext';

function Threshold({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="font-bold text-slate-800 mt-1">{value}</div>
        </div>
    );
}

export default function RegionStoreTabPanel() {
    const { dimensions } = useMerchConfig();
    const regions = dimensions.get('region');

    return (
        <TabConfigPanel
            tabKey="region-store"
            customSections={[
                {
                    id: 'region-targets',
                    label: '区域销售目标',
                    render: () => (
                        <div className="grid grid-cols-2 gap-2">
                            {(regions?.values ?? []).map((r) => (
                                <div key={r.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                    <span className="text-sm text-slate-700">{r.label}</span>
                                    <input
                                        className="border border-slate-200 rounded px-2 py-1 w-28 text-sm text-right"
                                        placeholder="¥ 万"
                                    />
                                </div>
                            ))}
                        </div>
                    ),
                },
                {
                    id: 'transfer-rules',
                    label: '调拨自动化规则',
                    render: () => (
                        <div className="space-y-2 text-sm">
                            <div className="p-3 border border-slate-200 rounded-lg">
                                <div className="font-medium text-slate-700">断码自动调拨</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    触发条件:{' '}
                                    <code className="bg-slate-100 px-1 rounded">
                                        sourceWos &gt; 12 AND targetBrokenSize = true
                                    </code>
                                </div>
                            </div>
                            <button className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                                + 新增规则
                            </button>
                        </div>
                    ),
                },
                {
                    id: 'fitting-baseline',
                    label: '试穿/转化基准',
                    render: () => (
                        <div className="grid grid-cols-3 gap-3">
                            <Threshold label="试穿率健康线" value="35–45%" />
                            <Threshold label="试穿转化率健康线" value="25–35%" />
                            <Threshold label="连带率健康线" value="≥ 1.4 双/单" />
                        </div>
                    ),
                },
            ]}
        />
    );
}
