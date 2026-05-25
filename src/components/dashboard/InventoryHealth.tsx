'use client';
/**
 * src/components/dashboard/InventoryHealth.tsx  V10
 * 鞋类品牌库存健康决策中心 — 14 Sections（四视角：财务/鞋类/产品/老板）
 */
import { useState, useEffect, useRef } from 'react';
import MerchSectionDivider from './MerchSectionDivider';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { buildMerchModuleLinks } from '@/config/dashboard/merch-module-links';
import invData    from '../../../data/planning/inventory_health_v2.json';
import scoreData  from '../../../data/planning/inv_health_score_history.json';
import actionLog  from '../../../data/planning/inv_action_log.json';
import brokenData from '../../../data/planning/inv_broken_size_detail.json';
import seasData   from '../../../data/planning/inv_seasonal_countdown.json';
import fbData     from '../../../data/planning/inv_feedback_signals.json';
import impairData from '../../../data/planning/inv_aging_impairment.json';

import type {
  InventoryAction,
  InventoryRiskMatrixItem,
  InventoryAgingItem,
  RiskSkuItem,
  WaveInventoryHealthItem,
  FinancialImpactScenario,
} from '@/types/inventoryHealthTypes';
import { fmtK, pct } from '@/types/inventoryHealthTypes';
import type {
  InvHealthScoreHistory,
  InvActionLog,
  InvBrokenSizeDetail,
  InvSeasonalData,
  InvFeedbackSignals,
  InvFeedbackSignal,
} from '@/types/invHealthV10Types';

import InvHealthScoreCard      from '@/components/inventory/InvHealthScoreCard';
import InvActionCenterEnhanced from '@/components/inventory/InvActionCenterEnhanced';
import InvRiskMatrix           from '@/components/inventory/InvRiskMatrix';
import InvSkuDrillDownModal    from '@/components/inventory/InvSkuDrillDownModal';
import InvTopRiskSku           from '@/components/inventory/InvTopRiskSku';
import InvBrokenSizeAnalysis   from '@/components/inventory/InvBrokenSizeAnalysis';
import InvWosDistribution      from '@/components/inventory/InvWosDistribution';
import InvAging                from '@/components/inventory/InvAging';
import InvSizeHeatmap          from '@/components/inventory/InvSizeHeatmap';
import InvWaveHealth           from '@/components/inventory/InvWaveHealth';
import InvLifecycle            from '@/components/inventory/InvLifecycle';
import InvSeasonalCountdown    from '@/components/inventory/InvSeasonalCountdown';
import InvScenarioMixer        from '@/components/inventory/InvScenarioMixer';
import InvFeedbackSignalCard   from '@/components/inventory/InvFeedbackSignalCard';

import { WOS_BUCKETS } from '@/utils/inventoryHealth';
import type { WosBucketStat } from '@/utils/inventoryHealth';

const data       = invData    as typeof invData;
const scoreHist  = scoreData  as InvHealthScoreHistory;
const actLog     = actionLog  as InvActionLog;
const brokenSize = brokenData as InvBrokenSizeDetail;
const seasonal   = seasData   as InvSeasonalData;
const feedback   = fbData     as InvFeedbackSignals;

interface Props {
  onJumpToTab?: (tab: string) => void;
}

const SECTIONS = [
  { anchor: 'inv-score',    label: '健康评分' },
  { anchor: 'inv-kpis',     label: '总览' },
  { anchor: 'inv-actions',  label: '行动中心' },
  { anchor: 'inv-matrix',   label: '风险矩阵' },
  { anchor: 'inv-risksku',  label: '风险SKU' },
  { anchor: 'inv-broken',   label: '断码分析' },
  { anchor: 'inv-wos',      label: 'WOS分布' },
  { anchor: 'inv-aging',    label: '库龄' },
  { anchor: 'inv-size',     label: '尺码热力图' },
  { anchor: 'inv-wave',     label: '波段健康' },
  { anchor: 'inv-lifecycle',label: '生命周期' },
  { anchor: 'inv-seasonal', label: '季节倒计时' },
  { anchor: 'inv-finance',  label: '方案推演' },
  { anchor: 'inv-links',    label: '联动模块' },
];

const RELATED_MODULES_WITH_SIGNALS = [
  { id: 'otb',      label: 'OTB 预算',   desc: '基于风险库存调整OTB，防止超买', color: '#3b82f6' },
  { id: 'forecast', label: '销售预测',   desc: '高风险SKU预测差异反映预测准确性', color: '#8b5cf6' },
  { id: 'wave',     label: '波段企划',   desc: '积压波段影响下波段货架预算分配', color: '#0ea5e9' },
  { id: 'cashflow', label: '现金流',     desc: '清仓方案直接影响现金回笼节奏', color: '#22c55e' },
  { id: 'pnl',      label: '损益',       desc: 'Markdown损失影响季度毛利预算', color: '#f97316' },
  { id: 'category', label: '品类运营',   desc: '断码与积压结构指导品类选款策略', color: '#ef4444' },
];

const KPI_CONFIGS = [
  { key: 'totalInventoryCost',    label: '总库存成本',   format: fmtK, targetKey: '',                  colorFn: () => '' },
  { key: 'totalInventoryRetail',  label: '总吊牌金额',   format: fmtK, targetKey: '',                  colorFn: () => '' },
  { key: 'overallWos',            label: '整体WOS',      format: (v: number) => v + 'W', targetKey: 'overallWos',      colorFn: (v: number, t: number) => v > t + 2 ? '#ef4444' : v < t - 1 ? '#3b82f6' : '#22c55e' },
  { key: 'healthySkuPct',         label: '健康SKU占比',  format: pct, targetKey: 'healthySkuPct',       colorFn: (v: number, t: number) => v < t - 0.1 ? '#ef4444' : v >= t ? '#22c55e' : '#f59e0b' },
  { key: 'riskInventoryAmount',   label: '风险库存金额', format: fmtK, targetKey: '',                  colorFn: () => '#f97316' },
  { key: 'brokenSizeSkuCount',    label: '断码SKU数',    format: (v: number) => String(v), targetKey: 'brokenSizeSkuCount', colorFn: (v: number, t: number) => v > t ? '#ef4444' : '#22c55e' },
  { key: 'estimatedMarkdownLoss', label: '预计清仓损失', format: fmtK, targetKey: '',                  colorFn: () => '#ef4444' },
  { key: 'estimatedCashRelease',  label: '预计现金回笼', format: fmtK, targetKey: '',                  colorFn: () => '#22c55e' },
];

const ic = 'w-2.5 h-2.5';
const svgProps = { viewBox: '0 0 16 16', fill: 'none' as const, className: ic, stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const INV_PAGE_SECTIONS = [
  { anchor: '#inv-score', label: '健康评分', icon: (<svg {...svgProps}><circle cx="8" cy="8" r="6" /><polyline points="5,8 7.5,10.5 11,6" /></svg>) },
  { anchor: '#inv-kpis', label: 'KPI 总览', icon: (<svg {...svgProps}><rect x="1" y="9" width="3" height="6" opacity="0.5" /><rect x="6" y="5" width="3" height="10" opacity="0.7" /><rect x="11" y="1" width="3" height="14" /></svg>) },
  { anchor: '#inv-actions', label: '行动中心', icon: (<svg {...svgProps}><polyline points="2,8 6.5,12 14,4" /></svg>) },
  { anchor: '#inv-matrix', label: '风险矩阵', icon: (<svg {...svgProps}><rect x="1" y="1" width="6" height="6" rx="0.5" opacity="0.5" /><rect x="9" y="1" width="6" height="6" rx="0.5" /><rect x="1" y="9" width="6" height="6" rx="0.5" /><rect x="9" y="9" width="6" height="6" rx="0.5" opacity="0.5" /></svg>) },
  { anchor: '#inv-risksku', label: '风险 SKU', icon: (<svg {...svgProps}><path d="M8 1.5 14.5 13.5H1.5L8 1.5z" /><line x1="8" y1="6" x2="8" y2="9" /><circle cx="8" cy="11" r="0.6" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#inv-broken', label: '断码分析', icon: (<svg {...svgProps}><line x1="2" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="14" y2="8" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#inv-wos', label: 'WOS 分布', icon: (<svg {...svgProps}><path d="M1 12 Q 4 6 7 10 T 13 8 T 15 9" /></svg>) },
  { anchor: '#inv-aging', label: '库龄', icon: (<svg {...svgProps}><circle cx="8" cy="8" r="6" /><polyline points="8,4 8,8 11,10" /></svg>) },
  { anchor: '#inv-size', label: '尺码热力', icon: (<svg {...svgProps}><rect x="1" y="1" width="4" height="4" fill="currentColor" stroke="none" opacity="0.3" /><rect x="6" y="1" width="4" height="4" fill="currentColor" stroke="none" opacity="0.7" /><rect x="11" y="1" width="4" height="4" fill="currentColor" stroke="none" /><rect x="1" y="6" width="4" height="4" fill="currentColor" stroke="none" opacity="0.5" /><rect x="6" y="6" width="4" height="4" fill="currentColor" stroke="none" opacity="0.4" /><rect x="11" y="6" width="4" height="4" fill="currentColor" stroke="none" opacity="0.6" /></svg>) },
  { anchor: '#inv-wave', label: '波段健康', icon: (<svg {...svgProps}><path d="M1 10 Q 4 4 7 10 T 13 10 T 15 10" /></svg>) },
  { anchor: '#inv-lifecycle', label: '生命周期', icon: (<svg {...svgProps}><circle cx="8" cy="8" r="6" /><path d="M14 8 a6 6 0 0 1 -6 6" strokeWidth="2.4" /></svg>) },
  { anchor: '#inv-seasonal', label: '季节倒计时', icon: (<svg {...svgProps}><rect x="2" y="3" width="12" height="11" rx="1" /><line x1="2" y1="6" x2="14" y2="6" /><line x1="5" y1="1" x2="5" y2="4" /><line x1="11" y1="1" x2="11" y2="4" /></svg>) },
  { anchor: '#inv-finance', label: '方案推演', icon: (<svg {...svgProps}><line x1="2" y1="13" x2="14" y2="13" /><polyline points="3,11 6,7 9,9 13,3" /></svg>) },
  { anchor: '#inv-links', label: '联动模块', icon: (<svg {...svgProps}><circle cx="4" cy="4" r="2" /><circle cx="12" cy="4" r="2" /><circle cx="8" cy="12" r="2" /><line x1="5" y1="5" x2="11" y2="5" /><line x1="5" y1="6" x2="8" y2="11" /><line x1="11" y1="6" x2="8" y2="11" /></svg>) },
];

export default function InventoryHealth({ onJumpToTab }: Props) {
  const [activeAnchor, setActiveAnchor] = useState('inv-score');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [drillItem, setDrillItem] = useState<InventoryRiskMatrixItem | null>(null);
  const kpis = data.kpis;

  // ── 数据适配 ──────────────────────────────────────────────────────────────
  const wosBucketMap: Record<string, number> = { lt4: 0, '4to8': 1, '8to12': 2, '12to20': 3, gt20: 4 };
  const wosPrecomputed: WosBucketStat[] = WOS_BUCKETS.map((bucket, i) => {
    const src = data.wosDistribution.find(d => wosBucketMap[d.bucket] === i);
    return { bucket, skuCount: src?.skuCount ?? 0, totalQty: 0, totalAmount: src?.inventoryCost ?? 0 };
  });

  const lifecycleAdapted = data.lifecycleInventory.map(d => ({
    lifecycle: d.label,
    label: d.label,
    wos: d.wos,
    skuCount: d.skuCount,
    stockAmount: d.inventoryCost,
    avgSellThrough: d.sellThroughRate,
    action: d.action,
  }));

  // 反馈信号映射
  const signalMap: Record<string, InvFeedbackSignal> = Object.fromEntries(
    feedback.signals.map(s => [s.targetModule, s])
  );
  const modulesWithSignals = RELATED_MODULES_WITH_SIGNALS.map(m => ({
    ...m,
    signal: signalMap[m.id],
  }));

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ anchor }) => {
      const el = sectionRefs.current[anchor];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveAnchor(anchor); },
        { threshold: 0.15 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  function scrollTo(anchor: string) {
    sectionRefs.current[anchor]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleNavigate(module: string) {
    onJumpToTab?.(module);
  }

  const vsLW = kpis.vsLastWeek as Record<string, number>;

  return (
    <div className="flex flex-col gap-0 min-h-screen bg-gray-50/50">
      <div className="flex-1 px-4 md:px-6 py-6 space-y-8 max-w-screen-2xl mx-auto w-full">

        {/* S1: 健康度评分 + 周改善 */}
        <section ref={el => { sectionRefs.current['inv-score'] = el; }} id="inv-score" className="scroll-mt-24">
          <MerchSectionDivider label="A" title="健康评分" />
          <InvHealthScoreCard data={scoreHist} />
        </section>

        {/* S2: KPI 总览 + vsLW */}
        <section ref={el => { sectionRefs.current['inv-kpis'] = el; }} id="inv-kpis" className="scroll-mt-24">
          <MerchSectionDivider label="B" title="KPI 总览" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {KPI_CONFIGS.map(cfg => {
              const raw = kpis[cfg.key as keyof typeof kpis];
              const val = typeof raw === 'number' ? raw : 0;
              const target = cfg.targetKey ? (kpis.targets as Record<string, number>)[cfg.targetKey] : 0;
              const color = cfg.colorFn(val, target) || '#6b7280';
              const chg = vsLW[cfg.key];
              const isNegativeGood = ['overallWos', 'riskInventoryAmount', 'brokenSizeSkuCount', 'estimatedMarkdownLoss'].includes(cfg.key);
              const chgGood = chg !== undefined ? (isNegativeGood ? chg < 0 : chg > 0) : true;
              // 目标缺口判定（"越低越好"指标缺口 = 实际-目标 > 0 即超标）
              let gapLabel: { text: string; cls: string } | null = null;
              if (cfg.targetKey && target > 0 && typeof val === 'number') {
                const delta = val - target;
                const isOver = isNegativeGood ? delta > 0 : delta < 0;
                if (Math.abs(delta) > target * 0.02) {
                  gapLabel = {
                    text: `vs目标 ${delta > 0 ? '+' : ''}${cfg.format(delta).replace(/^-/, '-')}`,
                    cls: isOver ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
                  };
                }
              }
              return (
                <div key={cfg.key} className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm relative">
                  {gapLabel && (
                    <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap ${gapLabel.cls}`}>
                      {gapLabel.text}
                    </span>
                  )}
                  <div className="text-xs text-gray-400 mb-1">{cfg.label}</div>
                  <div className="text-xl font-bold" style={{ color }}>{cfg.format(val)}</div>
                  {cfg.targetKey && target > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">目标 {cfg.format(target)}</div>
                  )}
                  {chg !== undefined && (
                    <div className={"text-xs mt-0.5 flex items-center gap-0.5 " + (chgGood ? 'text-green-600' : 'text-red-500')}>
                      <span>{chgGood ? '▼' : '▲'}</span>
                      <span>LW {chg > 0 ? '+' : ''}{(chg * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* S3: 行动中心闭环版 */}
        <section ref={el => { sectionRefs.current['inv-actions'] = el; }} id="inv-actions" className="scroll-mt-24">
          <MerchSectionDivider label="C" title="今日行动中心" />
          <InvActionCenterEnhanced
            actions={data.actions as InventoryAction[]}
            actionLog={actLog}
            onNavigate={handleNavigate}
          />
        </section>

        {/* S4: 风险矩阵 + 钻取 */}
        <section ref={el => { sectionRefs.current['inv-matrix'] = el; }} id="inv-matrix" className="scroll-mt-24">
          <MerchSectionDivider label="D" title="风险矩阵" />
          <div className="relative">
            <InvRiskMatrix data={data.riskMatrix as InventoryRiskMatrixItem[]} onSelectItem={setDrillItem} />
          </div>
        </section>

        {/* S5: 高风险SKU */}
        <section ref={el => { sectionRefs.current['inv-risksku'] = el; }} id="inv-risksku" className="scroll-mt-24">
          <MerchSectionDivider label="E" title="高风险 SKU 明细" />
          <InvTopRiskSku data={data.topRiskSkus as RiskSkuItem[]} onNavigate={handleNavigate} />
        </section>

        {/* S6: 断码 vs 满码分析（鞋类专属新增） */}
        <section ref={el => { sectionRefs.current['inv-broken'] = el; }} id="inv-broken" className="scroll-mt-24">
          <MerchSectionDivider label="F" title="断码 vs 满码分析" />
          <InvBrokenSizeAnalysis data={brokenSize} />
        </section>

        {/* S7: WOS 分布 */}
        <section ref={el => { sectionRefs.current['inv-wos'] = el; }} id="inv-wos" className="scroll-mt-24">
          <MerchSectionDivider label="G" title="WOS 分布" />
          <InvWosDistribution styles={[]} precomputedStats={wosPrecomputed} />
        </section>

        {/* S8: 库龄 + 跌价准备 */}
        <section ref={el => { sectionRefs.current['inv-aging'] = el; }} id="inv-aging" className="scroll-mt-24">
          <MerchSectionDivider label="H" title="库存库龄" />
          <InvAging data={data.agingBuckets as InventoryAgingItem[]} />
          {/* 跌价准备附加说明 */}
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="text-xs font-semibold text-amber-800 mb-2">会计跌价准备（财务视角）</div>
            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              {[
                { label: '正常库存(0-90天)', rate: '0%', amount: 0, bg: 'bg-emerald-50' },
                { label: '关注库存(91-180天)', rate: '30%', amount: (impairData as typeof impairData).calculation.watch.impairmentAmount, bg: 'bg-amber-100' },
                { label: '高风险库存(>180天)', rate: '55%', amount: (impairData as typeof impairData).calculation.risk.impairmentAmount, bg: 'bg-red-50' },
              ].map(r => (
                <div key={r.label} className={"rounded-lg py-2 px-3 " + r.bg}>
                  <div className="font-bold text-gray-800">{r.rate}</div>
                  <div className="text-gray-500">{r.label}</div>
                  {r.amount > 0 && <div className="text-red-600 font-semibold mt-0.5">计提 {fmtK(r.amount)}</div>}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-amber-700">
              合计跌价计提 <b>{fmtK((impairData as typeof impairData).totalImpairment)}</b> · {(impairData as typeof impairData).pnlImpact.note}
            </div>
          </div>
        </section>

        {/* S9: 尺码核心段热力图（鞋类强化） */}
        <section ref={el => { sectionRefs.current['inv-size'] = el; }} id="inv-size" className="scroll-mt-24">
          <MerchSectionDivider label="I" title="核心尺码段热力图" />
          <InvSizeHeatmap maleSizes={[]} femaleSizes={[]} />
        </section>

        {/* S10: 波段库存健康 */}
        <section ref={el => { sectionRefs.current['inv-wave'] = el; }} id="inv-wave" className="scroll-mt-24">
          <MerchSectionDivider label="J" title="波段库存健康" />
          <InvWaveHealth data={data.waveHealth as WaveInventoryHealthItem[]} onNavigate={handleNavigate} />
        </section>

        {/* S11: 生命周期 */}
        <section ref={el => { sectionRefs.current['inv-lifecycle'] = el; }} id="inv-lifecycle" className="scroll-mt-24">
          <MerchSectionDivider label="K" title="生命周期库存" />
          <InvLifecycle lifecycleDistribution={lifecycleAdapted as Parameters<typeof InvLifecycle>[0]['lifecycleDistribution']} />
        </section>

        {/* S12: 季节性必清倒计时（鞋类新增） */}
        <section ref={el => { sectionRefs.current['inv-seasonal'] = el; }} id="inv-seasonal" className="scroll-mt-24">
          <MerchSectionDivider label="L" title="季节性必清倒计时" />
          <InvSeasonalCountdown data={seasonal} />
        </section>

        {/* S13: 方案推演（组合模式） */}
        <section ref={el => { sectionRefs.current['inv-finance'] = el; }} id="inv-finance" className="scroll-mt-24">
          <MerchSectionDivider label="M" title="方案推演" />
          <InvScenarioMixer
            data={data.financialScenarios as FinancialImpactScenario[]}
            onApplyToOtb={() => handleNavigate('otb')}
          />
        </section>

        {/* S14: 联动模块（可点击 + 反馈信号） */}
        <section ref={el => { sectionRefs.current['inv-links'] = el; }} id="inv-links" className="scroll-mt-24">
          <MerchSectionDivider label="N" title="联动模块" />
          <InvFeedbackSignalCard
            modules={modulesWithSignals}
            onJumpToTab={handleNavigate}
          />
        </section>

      </div>

      {/* SKU钻取弹窗 */}
      <InvSkuDrillDownModal
        item={drillItem}
        onClose={() => setDrillItem(null)}
        onNavigate={handleNavigate}
      />
    <FloatingModuleNav
      moduleLinks={buildMerchModuleLinks('inventory')}
      pageSections={INV_PAGE_SECTIONS}
    />
    </div>
  );
}
