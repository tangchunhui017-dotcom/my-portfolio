'use client';
/**
 * src/components/profit-loss/ProfitLossTab.tsx  V9
 * 品牌损益驾驶舱 — 两级模式切换：品牌年度 P&L | 单店模型
 * V9：渠道诊断"→单店模型验证"按钮直接切换模式
 */
import { useState, useCallback } from 'react';
import MerchSectionDivider from '@/components/dashboard/MerchSectionDivider';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { buildMerchModuleLinks } from '@/config/dashboard/merch-module-links';
import BrandPnlDashboard from './BrandPnlDashboard';
import StoreModelPanel from './StoreModelPanel';

type PnlMode = 'brand' | 'store';

const ic = 'w-2.5 h-2.5';
const PNL_PAGE_SECTIONS = [
  { anchor: '#pnl-mode', label: '模式切换', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1.5" /><line x1="1" y1="7" x2="15" y2="7" /></svg>) },
  { anchor: '#pnl-content', label: '损益内容', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,12 5,8 8.5,10 12,5 14,7" /></svg>) },
];

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
            <section id="pnl-mode" className="scroll-mt-24">
            <MerchSectionDivider label="A" title="损益视图切换" />
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

            </section>

            <section id="pnl-content" className="scroll-mt-24">
            <MerchSectionDivider label="B" title="损益内容" />
            {mode === 'brand' ? (
                <BrandPnlDashboard onGoToStore={handleGoToStore} />
            ) : (
                <StoreModelPanel />
            )}
            </section>

            <FloatingModuleNav
                moduleLinks={buildMerchModuleLinks('profit-loss')}
                pageSections={PNL_PAGE_SECTIONS}
            />
        </div>
    );
}
