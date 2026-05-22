'use client';
import { useState, useEffect } from 'react';
import TabConfigPanel from './TabConfigPanel';
import { useMerchConfig } from '@/context/MerchConfigContext';
import type { OtbChannelParams, OtbScenarioPreset } from '@/types/merchConfig';

const CHANNELS: { key: string; label: string }[] = [
    { key: 'physical',  label: '线下门店' },
    { key: 'ecommerce', label: '电商渠道' },
    { key: 'new_store', label: '新开门店' },
];

function NumInput({ value, onChange, step = 0.01, min = 0, max = 10 }: {
    value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
}) {
    return (
        <input
            type="number"
            value={value}
            step={step}
            min={min}
            max={max}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-20 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
    );
}

export default function OtbTabPanel() {
    const { otbParams, saveOtbParamsOverride, resetOtbParamsOverride } = useMerchConfig();

    const [channelDraft, setChannelDraft] = useState<Record<string, OtbChannelParams>>(
        () => ({ ...otbParams.channelCostParams })
    );
    const [scenarioDraft, setScenarioDraft] = useState<OtbScenarioPreset[]>(
        () => [...otbParams.otbScenarioPresets]
    );
    const [budgetDraft, setBudgetDraft] = useState<number>(otbParams.approvedBudget);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setChannelDraft({ ...otbParams.channelCostParams });
            setScenarioDraft([...otbParams.otbScenarioPresets]);
            setBudgetDraft(otbParams.approvedBudget);
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [otbParams]);

    function updateChannel(ch: string, field: keyof OtbChannelParams, val: number) {
        setChannelDraft(prev => ({ ...prev, [ch]: { ...prev[ch], [field]: val } }));
    }
    function updateScenario(idx: number, field: keyof OtbScenarioPreset, val: number | string) {
        setScenarioDraft(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    }

    function handleSave() {
        saveOtbParamsOverride({
            channelCostParams: channelDraft,
            otbScenarioPresets: scenarioDraft,
            approvedBudget: budgetDraft,
        });
    }
    function handleReset() {
        resetOtbParamsOverride();
    }

    return (
        <div className="space-y-6">
            <TabConfigPanel tabKey="otb" />

            {/* 渠道成本参数 */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-800">渠道成本参数</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">品牌加价倍率、折扣率、退货率、目标售罄率（各渠道独立）</p>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-slate-500">
                                <th className="text-left py-1.5 pr-4 font-medium">渠道</th>
                                <th className="text-right py-1.5 px-2 font-medium">加价倍率</th>
                                <th className="text-right py-1.5 px-2 font-medium">折扣率</th>
                                <th className="text-right py-1.5 px-2 font-medium">退货率</th>
                                <th className="text-right py-1.5 px-2 font-medium">目标售罄率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {CHANNELS.map(({ key, label }) => {
                                const cp = channelDraft[key] ?? { markupRate: 4.0, discountRate: 0.88, returnRate: 0.07, sellThroughTarget: 0.80 };
                                return (
                                    <tr key={key} className="border-t border-slate-50">
                                        <td className="py-2 pr-4 font-medium text-slate-700">{label}</td>
                                        <td className="py-2 px-2 text-right">
                                            <NumInput value={cp.markupRate} step={0.1} min={1} max={10} onChange={v => updateChannel(key, 'markupRate', v)} />
                                            <span className="ml-1 text-slate-400">×</span>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <NumInput value={cp.discountRate} step={0.01} min={0.1} max={1} onChange={v => updateChannel(key, 'discountRate', v)} />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <NumInput value={cp.returnRate} step={0.01} min={0} max={1} onChange={v => updateChannel(key, 'returnRate', v)} />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <NumInput value={cp.sellThroughTarget} step={0.01} min={0.1} max={1} onChange={v => updateChannel(key, 'sellThroughTarget', v)} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 情景预设 */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-800">OTB 情景预设</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">保守 / 标准 / 乐观三版情景的核心假设参数</p>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-slate-500">
                                <th className="text-left py-1.5 pr-4 font-medium">情景</th>
                                <th className="text-right py-1.5 px-2 font-medium">目标售罄率</th>
                                <th className="text-right py-1.5 px-2 font-medium">折扣率</th>
                                <th className="text-right py-1.5 px-2 font-medium">退货率</th>
                                <th className="text-right py-1.5 px-2 font-medium">加价倍率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scenarioDraft.map((s, idx) => (
                                <tr key={idx} className="border-t border-slate-50">
                                    <td className="py-2 pr-4 font-medium text-slate-700">{s.label}</td>
                                    <td className="py-2 px-2 text-right">
                                        <NumInput value={s.sellThroughRate} step={0.01} min={0.3} max={1} onChange={v => updateScenario(idx, 'sellThroughRate', v)} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <NumInput value={s.discountRate} step={0.01} min={0.1} max={1} onChange={v => updateScenario(idx, 'discountRate', v)} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <NumInput value={s.returnRate} step={0.01} min={0} max={0.8} onChange={v => updateScenario(idx, 'returnRate', v)} />
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <NumInput value={s.markupRate} step={0.1} min={1} max={10} onChange={v => updateScenario(idx, 'markupRate', v)} />
                                        <span className="ml-1 text-slate-400">×</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 批准预算 */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-center justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-slate-800">年度批准 OTB 预算</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">所有 OTB 预算缺口/节余计算的基准线</div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">¥</span>
                    <input
                        type="number"
                        value={budgetDraft}
                        step={100000}
                        min={0}
                        onChange={e => setBudgetDraft(parseInt(e.target.value) || 0)}
                        className="w-32 border border-slate-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={handleReset}
                    className="text-xs px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors">
                    重置为平台默认
                </button>
                <button
                    onClick={handleSave}
                    className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors">
                    保存品牌配置
                </button>
            </div>
        </div>
    );
}
