'use client';
/**
 * src/components/profit-loss/ProfitLossTab.tsx  V9
 * 品牌损益驾驶舱 — 两级模式切换：品牌年度 P&L | 单店模型
 * V9：渠道诊断"→单店模型验证"按钮直接切换模式
 */
import { useState, useCallback } from 'react';
import BrandPnlDashboard from './BrandPnlDashboard';
import StoreModelPanel from './StoreModelPanel';

type PnlMode = 'brand' | 'store';

export default function ProfitLossTab() {
    const [mode, setMode] = useState<PnlMode>('brand');

    const handleGoToStore = useCallback((_channelKey: string) => {
        setMode('store');
        setTimeout(() => {
            const el = document.getElementById('store-matrix');
            el?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    }, []);

    return (
        <div className="space-y-5">
            {/* 顶部模式切换 */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-base font-bold text-slate-900">
                        {mode === 'brand' ? '品牌年度 P&L 驾驶舱' : '单店经营模型'}
                    </h1>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {mode === 'brand'
                            ? '年度利润桥 · 预算归因 · 渠道/品类/折扣三维诊断 · 鞋类专属KPI · 现金流时点'
                            : '矩阵对比(S10) · 货品深度(S11) · 评级公式(S12) · 开店沙盒(S13)'}
                    </p>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {([
                        { key: 'brand' as const, label: '品牌年度 P&L' },
                        { key: 'store' as const, label: '单店模型' },
                    ] as Array<{ key: PnlMode; label: string }>).map(m => (
                        <button key={m.key} onClick={() => setMode(m.key)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                mode === m.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {mode === 'brand' ? (
                <BrandPnlDashboard onGoToStore={handleGoToStore} />
            ) : (
                <StoreModelPanel />
            )}
        </div>
    );
}
