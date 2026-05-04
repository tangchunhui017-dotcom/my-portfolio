'use client';

import { useState } from 'react';
import { formatMoneyCny } from '@/config/numberFormat';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';

type ActionItem = { title: string; description: string; cta: string; onClick?: () => void };
type InsightItem = { title: string; detail: string };

type Props = {
  filters: DashboardFilters;
  compareMode: CompareMode;
  onJumpToPlanning?: () => void;
  onJumpToProduct?: () => void;
  onJumpToChannel?: () => void;
  onJumpToSkuRisk?: () => void;
};

export default function DiagnosisActionPanel({
  filters,
  compareMode,
  onJumpToPlanning,
  onJumpToProduct,
  onJumpToChannel,
  onJumpToSkuRisk,
}: Props) {
  const [detailExpanded, setDetailExpanded] = useState(false);

  // Mock insights/actions logic based on filters (should ideally come from a hook or prop)
  // For now, we mirror the logic from MonthlyAchievementPanel but keep it modular
  const insights: InsightItem[] = [
    { title: '智能诊断 01', detail: '当前筛选条件下，主力品类去化节奏平稳，但高价带存在 15% 的库存溢出。' },
    { title: '智能诊断 02', detail: '区域联动分析显示，华东区 OTB 利用率达 92%，建议适度追加波段预算。' },
    { title: '智能诊断 03', detail: 'Top 10 SKU 贡献度集中，下位 SKU 存在滞销风险，建议启动生命周期置换。' },
  ];

  const actions: ActionItem[] = [
    { title: '校准月度计划节奏', description: '优先复核缺口月份的计划深度与节奏安排。', cta: '去波段企划', onClick: onJumpToPlanning },
    { title: '下钻拖累 SKU', description: '从缺口月份继续下钻到具体 SKU 与价带风险。', cta: '去 SKU 风险', onClick: onJumpToSkuRisk },
    { title: '复核渠道承接', description: '检查计划与渠道承接是否同步，避免计划落空。', cta: '去渠道结构', onClick: onJumpToChannel },
  ];

  return (
    <div className="space-y-6">
      {/* Intelligent Diagnosis & Action Flow */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">智能诊断与策略流 (Diagnosis & Action Flow)</h3>
          <p className="mt-1 text-sm text-slate-500">从数据异常直接诊断并推演具体操作链路。</p>
        </div>
        
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const action = actions[index];
            return (
              <div key={insight.title} className="group flex flex-col xl:flex-row overflow-hidden rounded-[20px] bg-slate-50/50 ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-indigo-100">
                {/* Left: Insight */}
                <div className="relative flex-1 p-5 xl:p-6 border-b xl:border-b-0 xl:border-r border-slate-100">
                  <div className="absolute left-0 top-0 h-full w-1 bg-slate-200 group-hover:bg-indigo-400 transition-colors" />
                  <div className="flex items-start gap-4">
                    <div className="text-2xl font-black italic text-slate-200 font-serif leading-none mt-1 group-hover:text-indigo-100 transition-colors">0{index + 1}</div>
                    <div>
                      <div className="text-[14px] font-bold text-slate-900">{insight.title}</div>
                      <div className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{insight.detail}</div>
                    </div>
                  </div>
                </div>
                
                {/* Right: Action */}
                <div className="flex-1 p-5 xl:p-6 flex flex-col justify-center bg-white/50 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 rounded-full bg-indigo-50 p-1 text-indigo-600">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-bold text-slate-900">{action.title}</div>
                      <div className="mt-1 text-[13px] leading-relaxed text-slate-600">{action.description}</div>
                      <button type="button" onClick={action.onClick} className="mt-3 flex items-center gap-1 text-[12px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
                        {action.cta}
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Details & Export */}
      <div className="bg-slate-50/80 rounded-[20px] border border-slate-200/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900">明细验证与导出 (Data Details)</div>
            <div className="mt-0.5 text-xs text-slate-500">提供决策背后的原始数据对账，支持跨看板下钻。</div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setDetailExpanded(!detailExpanded)}
              className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {detailExpanded ? '收起明细' : '查看明细'}
            </button>
            <button 
              type="button"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
            >
              导出报表
            </button>
          </div>
        </div>
        
        {detailExpanded && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <div className="max-w-xs mx-auto">
              <div className="mb-3 text-2xl">📊</div>
              <div className="text-sm font-bold text-slate-900 mb-1">明细列表加载中</div>
              <div className="text-xs text-slate-500">正在根据当前的全局筛选条件同步月度、波段及 SKU 维度的明细数据...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
