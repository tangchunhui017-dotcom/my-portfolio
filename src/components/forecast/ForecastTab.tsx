'use client';
import MerchSectionDivider from '@/components/dashboard/MerchSectionDivider';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { buildMerchModuleLinks } from '@/config/dashboard/merch-module-links';
/**
 * ForecastTab.tsx — V9 销售预测决策工作台
 * 四个子视图：全渠道总控 / 实体店预测 / 电商预测 / 新店预测
 * 共用：筛选器 / KPI看板 / 行动中心 / 趋势图 / 准确率 / 驱动因素 / 风险表 / OTB建议 / 情景模拟 / 跨模块联动
 */
import { useState, useCallback } from 'react';
import { useForecast } from '@/hooks/useForecast';
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';
import { useGlobalConfig } from '@/context/GlobalConfigContext';

// 原有组件（保留）
import ForecastMethodSwitcher from './ForecastMethodSwitcher';
import ForecastDriverPanel from './ForecastDriverPanel';
import ForecastMonthlyTable from './ForecastMonthlyTable';
import EcommerceCostPanel from './EcommerceCostPanel';
import NewStoreValidationPanel from './NewStoreValidationPanel';
import MerchMixForecastPanel from './MerchMixForecastPanel';
import PhysicalStoreDriverPanel from './PhysicalStoreDriverPanel';
import EcommerceFunnelPanel from './EcommerceFunnelPanel';
import NewStoreRampPanelV2 from './NewStoreRampPanelV2';
import SalesForecastSizeRiskPanel from './SalesForecastSizeRiskPanel';
import ForecastAccuracyCard from './ForecastAccuracyCard';
import MultiScenarioChart from './MultiScenarioChart';
import TemperatureSensitivityScatter from './TemperatureSensitivityScatter';
import ChannelSynergyPanel from './ChannelSynergyPanel';
import MarketShareForecast from './MarketShareForecast';
import ScenarioProbabilityPanel from './ScenarioProbabilityPanel';
import SalesForecastDownstreamOutputV2 from './SalesForecastDownstreamOutputV2';

// 新增共享组件（V9）

import ForecastKpiBar from './ForecastKpiBar';
import ForecastActionCenter from './ForecastActionCenter';
import ForecastTrendChart from './ForecastTrendChart';
import ForecastAccuracyPanel from './ForecastAccuracyPanel';
import ForecastDriverAnalysis from './ForecastDriverAnalysis';
import ForecastOtbRecommendation from './ForecastOtbRecommendation';
import ForecastScenarioSimulator from './ForecastScenarioSimulator';
import ForecastRelatedLinks from './ForecastRelatedLinks';
import ForecastRiskTable from './ForecastRiskTable';

import accuracyRaw from '../../../data/planning/sales_forecast_accuracy_history.json';
import memberRaw from '../../../data/planning/sales_forecast_member_contribution.json';

type MemberData = Record<string, { overallRate: number }>;
const memberData = memberRaw as unknown as MemberData;

type AccuracyData = {
  channels: Record<string, { quarters: Array<{ period: string; accuracy: number; deviation: number }> }>;
};
const accuracyData = accuracyRaw as AccuracyData;

function getChannelHealth(channel: ForecastChannel): { dot: string; label: string; cls: string } {
  const quarters = accuracyData.channels[channel]?.quarters ?? [];
  if (quarters.length === 0) return { dot: '⚪', label: '无数据', cls: 'bg-slate-100 text-slate-500' };
  const latest = quarters[quarters.length - 1];
  const acc = latest.accuracy;
  if (acc >= 0.93) return { dot: '✓', label: `精度 ${(acc * 100).toFixed(0)}%`, cls: 'bg-emerald-500 text-white' };
  if (acc >= 0.85) return { dot: '⚠', label: `精度 ${(acc * 100).toFixed(0)}%`, cls: 'bg-amber-500 text-white' };
  return { dot: '✗', label: `精度 ${(acc * 100).toFixed(0)}%`, cls: 'bg-rose-500 text-white' };
}

// ── 子视图类型 ──────────────────────────────────────────────────────────────
type ForecastView = 'omni' | 'physical' | 'ecommerce' | 'new_store';

const VIEW_TABS: { key: ForecastView; label: string; icon: string; channel?: ForecastChannel; desc: string }[] = [
  { key: 'omni',      label: '全渠道总控', icon: '🌐', desc: '品牌全渠道预测总控台' },
  { key: 'physical',  label: '实体店预测', icon: '🏪', channel: 'physical',  desc: '门店销售预测与补货调拨决策' },
  { key: 'ecommerce', label: '电商预测',   icon: '🛒', channel: 'ecommerce', desc: '线上流量·转化·大促·退货预测' },
  { key: 'new_store', label: '新店预测',   icon: '🆕', channel: 'new_store', desc: '开业爬坡·首铺·保本·现金投入' },
];

const SCENARIOS: { key: ForecastScenario; label: string; activeColor: string }[] = [
  { key: 'conservative', label: '保守', activeColor: 'text-amber-600 bg-amber-50 border-amber-300 shadow-sm' },
  { key: 'base',         label: '基准', activeColor: 'text-sky-600 bg-sky-50 border-sky-300 shadow-sm' },
  { key: 'optimistic',   label: '乐观', activeColor: 'text-emerald-600 bg-emerald-50 border-emerald-300 shadow-sm' },
];

// ── 辅助组件 ─────────────────────────────────────────────────────────────────
function SectionCard({ title, sub, badge, children, id }: {
  title: string; sub?: string; badge?: React.ReactNode;
  children: React.ReactNode; id?: string;
}) {
  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">{title}</h3>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, tone = 'default' }: {
  label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'default';
}) {
  const tc = { positive: 'text-emerald-600', negative: 'text-rose-600', warning: 'text-amber-600', default: 'text-slate-800' }[tone];
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
      <div className="text-[10px] text-slate-400 mb-1">{label}</div>
      <div className={`text-base font-bold ${tc}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── 全渠道总控视图 ───────────────────────────────────────────────────────────
function OmniView({
  scenario, activeScenarios, onToggleScenario, onJumpToTab,
}: {
  scenario: ForecastScenario;
  activeScenarios: ForecastScenario[];
  onToggleScenario: (s: ForecastScenario) => void;
  onJumpToTab: (tab: string) => void;
}) {
  const physical   = useForecast('physical', scenario);
  const ecommerce  = useForecast('ecommerce', scenario);
  const newStore   = useForecast('new_store', scenario);

  if (!physical || !ecommerce || !newStore) {
    return <div className="h-24 text-slate-400 text-xs flex items-center justify-center">加载中…</div>;
  }

  const total       = physical.annualForecast + ecommerce.annualForecast + newStore.annualForecast;
  const totalPairs  = physical.forecastPairs + ecommerce.forecastPairs + newStore.forecastPairs;
  const physShare   = total > 0 ? physical.annualForecast / total : 0;
  const ecomShare   = total > 0 ? ecommerce.annualForecast / total : 0;
  const nsShare     = total > 0 ? newStore.annualForecast / total : 0;

  return (
    <div className="space-y-6">
      {/* S1: 全渠道预测总览 KPI */}
      <SectionCard title="全渠道预测总览" sub="品牌三渠道合并预测 — 销售额 / 目标缺口 / 毛利 / 现金风险">
        <div className="space-y-4">
          <ForecastKpiBar channel="all" scenario={scenario} />

          {/* 渠道贡献拆解 */}
          <div className="grid grid-cols-3 gap-4 mt-2">
            {[
              { label: '实体店', value: formatMoneyCny(physical.annualForecast), share: physShare, color: 'bg-sky-500' },
              { label: '电商',   value: formatMoneyCny(ecommerce.annualForecast), share: ecomShare, color: 'bg-violet-500' },
              { label: '新店',   value: formatMoneyCny(newStore.annualForecast),  share: nsShare,   color: 'bg-emerald-500' },
            ].map(ch => (
              <div key={ch.label} className="text-center">
                <div className="text-xs text-slate-500 mb-1">{ch.label}</div>
                <div className="text-sm font-bold text-slate-800">{ch.value}</div>
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 ${ch.color} rounded-full`} style={{ width: `${(ch.share * 100).toFixed(0)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 w-8">{(ch.share * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* S2: 全渠道行动中心 */}
      <SectionCard title="全渠道行动中心"
        sub="基于预测缺口 / 风险信号生成的优先行动建议（6-8条）"
        badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">8条待处理</span>}>
        <ForecastActionCenter onJumpToModule={tab => onJumpToTab(tab === 'OTB预算' ? 'otb' : tab === '库存健康' ? 'inventory' : tab === '波段企划' ? 'planning' : tab === '品类运营' ? 'category' : tab === '损益' ? 'profit-loss' : tab === '现金流' ? 'cashflow' : 'channel')} />
      </SectionCard>

      {/* S3: 全渠道销售预测趋势（使用实体店数据代表品牌总体趋势） */}
      <SectionCard title="全渠道销售预测趋势"
        sub="目标 / 实际 / 预测 / 去年同期 / 置信区间 / 关键事件标记">
        <ForecastTrendChart channel="physical" scenario={scenario} />
      </SectionCard>

      {/* S4: 三渠道协同 */}
      <SectionCard title="三渠道协同视图" sub="月度堆叠结构 · 客流转移 · 价格倒挂风险">
        <ChannelSynergyPanel />
      </SectionCard>

      {/* S5: 全渠道库存支撑率 + Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="全渠道 Forecast Accuracy" sub="MAPE / Bias / 偏差最大品类 SKU 渠道">
          <ForecastAccuracyPanel channel="physical" />
        </SectionCard>
        <SectionCard title="竞争市场视角" sub="行业规模 · 我的份额 · 竞品威胁评估">
          <MarketShareForecast />
        </SectionCard>
      </div>

      {/* S6: 品类 / 波段 / SKU 预测贡献 */}
      <SectionCard title="品类 / 波段 / SKU 预测贡献" sub="货品结构拆解 — 全渠道视角">
        <MerchMixForecastPanel scenario={scenario} channel="brand" />
      </SectionCard>

      {/* S7: 预测→OTB总建议 */}
      <SectionCard title="Forecast → OTB 总建议" sub="根据全渠道预测缺口生成采购预算调整建议">
        <ForecastOtbRecommendation channel="physical" scenario={scenario} onJumpToOtb={() => onJumpToTab('otb')} />
      </SectionCard>

      {/* S8: 情景模拟器 */}
      <SectionCard title="全渠道情景模拟器" sub="6场景 × 8参数 → 8输出结果实时计算">
        <ForecastScenarioSimulator channel="physical" />
      </SectionCard>

      {/* S9: 损益与现金影响 (下游输出) */}
      <SalesForecastDownstreamOutputV2
        channel="physical"
        annualForecast={physical.annualForecast + ecommerce.annualForecast + newStore.annualForecast}
        grossMarginRate={0.45}
        refundRate={0.06}
      />

      {/* S10: 跨模块联动 */}
      <SectionCard title="跨模块联动入口" sub="销售预测影响的其他模块 — 点击直接跳转">
        <ForecastRelatedLinks onJumpToTab={onJumpToTab} />
      </SectionCard>
    </div>
  );
}

// ── 实体店预测视图 ───────────────────────────────────────────────────────────
function PhysicalView({
  scenario, activeScenarios, onToggleScenario, onJumpToTab,
}: {
  scenario: ForecastScenario;
  activeScenarios: ForecastScenario[];
  onToggleScenario: (s: ForecastScenario) => void;
  onJumpToTab: (tab: string) => void;
}) {
  const result = useForecast('physical', scenario);
  const { config, updateForecast } = useGlobalConfig();
  const memberRate = memberData['physical']?.overallRate ?? 0;

  return (
    <div className="space-y-6">
      {/* S1: 实体店预测总览 */}
      <SectionCard title="实体店预测总览" sub="门店销售预测 — 8 核心 KPI">
        <ForecastKpiBar channel="physical" scenario={scenario} />
      </SectionCard>

      {/* S2: 实体店行动中心 */}
      <SectionCard title="实体店行动中心"
        sub="门店补货 / 调拨 / OTB / 波段调整行动建议"
        badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">5条待处理</span>}>
        <ForecastActionCenter channel="physical" onJumpToModule={tab => onJumpToTab(tab === 'OTB预算' ? 'otb' : tab === '库存健康' ? 'inventory' : tab === '波段企划' ? 'planning' : 'channel')} />
      </SectionCard>

      {/* S3: 实体店销售预测趋势 */}
      <SectionCard title="门店销售预测趋势"
        sub="目标 / 实际 / 预测 / 去年同期 / 大促活动标注">
        <ForecastTrendChart channel="physical" scenario={scenario} />
      </SectionCard>

      {/* S4: 预测参数 + 方法 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">预测方法 + 输入参数</h3>
          <ForecastMethodSwitcher method={config.forecast.method} onChange={m => updateForecast({ method: m })} />
        </div>
        <div className="px-5 py-4">
          <ForecastDriverPanel channel="physical" />
        </div>
      </div>

      {/* S5: 门店Forecast Accuracy */}
      <SectionCard title="门店 Forecast Accuracy" sub="MAPE / Bias / 偏差最大品类 SKU">
        <ForecastAccuracyPanel channel="physical" />
      </SectionCard>

      {/* S6: 预测驱动因素 */}
      <SectionCard title="门店预测驱动因素分析"
        sub="历史趋势·季节性·新品·客流·转化率·尺码·天气·退货 — 14个驱动因子">
        <ForecastDriverAnalysis channel="physical" />
      </SectionCard>

      {/* S7: 实体店经营驱动拆解 */}
      <SectionCard title="实体店经营驱动拆解"
        sub="门店等级预测 · 客流成交率坪效联动 · 区域气温影响">
        <PhysicalStoreDriverPanel />
      </SectionCard>

      {/* S8: 气温-销售相关性 */}
      <SectionCard title="气温-销售相关性分析" sub="散点回归 + 区域对比 + What-if 气温情景">
        <TemperatureSensitivityScatter />
      </SectionCard>

      {/* S9: 门店库存与尺码风险 */}
      <SectionCard title="门店库存 · 尺码断档风险" sub="缺货 / 积压 / 预测偏差 / 高增长机会 — 默认Top10">
        <ForecastRiskTable />
      </SectionCard>

      {/* S10: 多情景趋势 + 月度明细 */}
      <SectionCard title="多情景趋势对比 + 月度预测明细">
        <div className="space-y-4">
          <MultiScenarioChart channel="physical" activeScenarios={activeScenarios} />
          {result && <ForecastMonthlyTable result={result} channel="physical" />}
        </div>
      </SectionCard>

      {/* S11: Forecast → OTB */}
      <SectionCard title="Forecast → OTB 建议" sub="基于实体店预测缺口的采购预算调整建议">
        <ForecastOtbRecommendation channel="physical" scenario={scenario} onJumpToOtb={() => onJumpToTab('otb')} />
      </SectionCard>

      {/* S12: 情景模拟 */}
      <SectionCard title="实体店情景模拟器" sub="6场景 × 8参数 → 预测销售·毛利·库存·现金影响">
        <ForecastScenarioSimulator channel="physical" />
      </SectionCard>

      {/* S13: 情景概率 */}
      <SectionCard title="情景概率对比 + 加权期望值"
        sub="为三情景分配概率权重，计算概率加权预测金额">
        <ScenarioProbabilityPanel channel="physical" />
      </SectionCard>

      {/* S14: 尺码风险 */}
      <SectionCard title="👟 尺码结构风险 + 波段上市节奏校验">
        <SalesForecastSizeRiskPanel />
      </SectionCard>

      {/* S15: 下游输出 */}
      {result && (
        <SalesForecastDownstreamOutputV2
          channel="physical"
          annualForecast={result.annualForecast}
          grossMarginRate={config.brand.grossMarginRate}
          refundRate={0.06}
        />
      )}

      {/* S16: 跨模块联动 */}
      <SectionCard title="跨模块联动入口">
        <ForecastRelatedLinks onJumpToTab={onJumpToTab} />
      </SectionCard>
    </div>
  );
}

// ── 电商预测视图 ─────────────────────────────────────────────────────────────
function EcommerceView({
  scenario, activeScenarios, onJumpToTab,
}: {
  scenario: ForecastScenario;
  activeScenarios: ForecastScenario[];
  onJumpToTab: (tab: string) => void;
}) {
  const result = useForecast('ecommerce', scenario);
  const { config, updateForecast } = useGlobalConfig();

  return (
    <div className="space-y-6">
      {/* S1: 电商预测总览 */}
      <SectionCard title="电商预测总览" sub="线上销售 — 8 核心 KPI">
        <ForecastKpiBar channel="ecommerce" scenario={scenario} />
      </SectionCard>

      {/* 公式说明卡 */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-xs text-sky-800">
        <div className="font-semibold mb-1">📐 电商核心预测公式</div>
        <div className="font-mono bg-white rounded px-3 py-2 text-slate-700 text-[11px] mb-1">
          预测净销售额 = 访问量 × 转化率 × 客单价 × (1 - 退货率)
        </div>
        <div className="text-[10px] text-sky-600">
          流量、转化、客单价三要素决定毛销售，退货率决定净销售，是电商预测的核心驱动公式。
        </div>
      </div>

      {/* S2: 电商行动中心 */}
      <SectionCard title="电商行动中心"
        sub="爆款补货 / 退货风险 / 大促节奏 / 折扣控制行动建议"
        badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">6条待处理</span>}>
        <ForecastActionCenter channel="ecommerce" onJumpToModule={tab => onJumpToTab(tab === 'OTB预算' ? 'otb' : 'inventory')} />
      </SectionCard>

      {/* S3: 平台销售预测趋势 */}
      <SectionCard title="平台销售预测趋势"
        sub="目标 / 实际 / 预测 / 去年同期 / 大促活动标注">
        <ForecastTrendChart channel="ecommerce" scenario={scenario} />
      </SectionCard>

      {/* S4: 电商漏斗 */}
      <SectionCard title="流量 × 转化 × 客单价模型"
        sub="月度漏斗预测 · 大促节奏 · 平台GMV拆分 · 净销售率">
        <EcommerceFunnelPanel />
        {result?.ecommerceDriverRows && result.ecommerceDriverRows.length > 0 && (
          <div className="mt-5">
            <EcommerceCostPanel rows={result.ecommerceDriverRows} />
          </div>
        )}
      </SectionCard>

      {/* S5: 预测参数 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">预测方法 + 输入参数</h3>
          <ForecastMethodSwitcher method={config.forecast.method} onChange={m => updateForecast({ method: m })} />
        </div>
        <div className="px-5 py-4">
          <ForecastDriverPanel channel="ecommerce" />
        </div>
      </div>

      {/* S6: 电商 Forecast Accuracy */}
      <SectionCard title="电商 Forecast Accuracy" sub="MAPE / Bias / 偏差最大品类 平台 SKU">
        <ForecastAccuracyPanel channel="ecommerce" />
      </SectionCard>

      {/* S7: 预测驱动因素 */}
      <SectionCard title="电商预测驱动因素分析"
        sub="流量·转化·促销·退货·折扣·内容·直播 — 关键驱动因子">
        <ForecastDriverAnalysis channel="ecommerce" />
      </SectionCard>

      {/* S8: 爆款SKU缺货风险 */}
      <SectionCard title="爆款SKU缺货 / 积压 / 偏差风险" sub="缺货 / 积压 / 预测偏差 / 高增长机会 — Top10">
        <ForecastRiskTable />
      </SectionCard>

      {/* S9: 多情景趋势 + 月度明细 */}
      <SectionCard title="多情景趋势对比 + 月度预测明细">
        <div className="space-y-4">
          <MultiScenarioChart channel="ecommerce" activeScenarios={activeScenarios} />
          {result && <ForecastMonthlyTable result={result} channel="ecommerce" />}
        </div>
      </SectionCard>

      {/* S10: Forecast → OTB */}
      <SectionCard title="Forecast → OTB 建议" sub="基于电商预测缺口的采购预算调整建议">
        <ForecastOtbRecommendation channel="ecommerce" scenario={scenario} onJumpToOtb={() => onJumpToTab('otb')} />
      </SectionCard>

      {/* S11: 情景模拟 */}
      <SectionCard title="电商情景模拟器" sub="6场景 × 8参数 → 预测净销售·毛利·退货·现金影响">
        <ForecastScenarioSimulator channel="ecommerce" />
      </SectionCard>

      {/* S12: 货品结构 */}
      <SectionCard title="平台 / 品类 / SKU 预测贡献">
        <MerchMixForecastPanel scenario={scenario} channel="ecommerce" />
      </SectionCard>

      {/* S13: 尺码风险 */}
      <SectionCard title="👟 爆款尺码断档风险">
        <SalesForecastSizeRiskPanel />
      </SectionCard>

      {/* S14: 下游输出 */}
      {result && (
        <SalesForecastDownstreamOutputV2
          channel="ecommerce"
          annualForecast={result.annualForecast}
          grossMarginRate={config.brand.grossMarginRate}
          refundRate={config.ecommerceDrivers.refundRate}
        />
      )}

      {/* S15: 跨模块联动 */}
      <SectionCard title="跨模块联动入口">
        <ForecastRelatedLinks onJumpToTab={onJumpToTab} />
      </SectionCard>
    </div>
  );
}

// ── 新店预测视图 ─────────────────────────────────────────────────────────────
function NewStoreView({
  scenario, activeScenarios, onJumpToTab,
}: {
  scenario: ForecastScenario;
  activeScenarios: ForecastScenario[];
  onJumpToTab: (tab: string) => void;
}) {
  const result = useForecast('new_store', scenario);
  const { config, updateForecast } = useGlobalConfig();

  return (
    <div className="space-y-6">
      {/* S1: 新店预测总览 */}
      <SectionCard title="新店预测总览" sub="开业销售预测 — 8 核心 KPI">
        <ForecastKpiBar channel="new_store" scenario={scenario} />
      </SectionCard>

      {/* S2: 新店行动中心 */}
      <SectionCard title="新店行动中心"
        sub="首铺铺货 / 尺码配置 / 开业活动 / 保本检验行动建议"
        badge={<span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">3条待处理</span>}>
        <ForecastActionCenter channel="new_store" onJumpToModule={tab => onJumpToTab(tab === 'OTB预算' ? 'otb' : 'channel')} />
      </SectionCard>

      {/* S3: 新店爬坡曲线 */}
      <SectionCard title="新店开店计划 · 爬坡模型 V2"
        sub="鞋类专属风险因子：尺码完整率 · 波段错位 · 新品占比">
        <NewStoreRampPanelV2 />
      </SectionCard>

      {/* S4: 销售趋势 */}
      <SectionCard title="新店 12 个月销售预测趋势"
        sub="目标 / 预测 / 去年同店对比 / 置信区间">
        <ForecastTrendChart channel="new_store" scenario={scenario} />
      </SectionCard>

      {/* S5: 合规校验 */}
      {result?.newStoreValidation && (
        <SectionCard title="新店开店合规校验">
          <NewStoreValidationPanel data={result.newStoreValidation} />
        </SectionCard>
      )}

      {/* S6: 预测参数 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">预测方法 + 输入参数</h3>
          <ForecastMethodSwitcher method={config.forecast.method} onChange={m => updateForecast({ method: m })} />
        </div>
        <div className="px-5 py-4">
          <ForecastDriverPanel channel="new_store" />
        </div>
      </div>

      {/* S7: 驱动因素 */}
      <SectionCard title="新店预测驱动因素分析"
        sub="新品·季节性·开业客流·首铺尺码率·竞品影响">
        <ForecastDriverAnalysis channel="new_store" />
      </SectionCard>

      {/* S8: 风险表 */}
      <SectionCard title="新店首铺 SKU / 尺码风险" sub="缺货 / 积压 / 首铺偏差 Top10">
        <ForecastRiskTable />
      </SectionCard>

      {/* S9: 月度明细 */}
      <SectionCard title="新店月度预测明细">
        <div className="space-y-4">
          <MultiScenarioChart channel="new_store" activeScenarios={activeScenarios} />
          {result && <ForecastMonthlyTable result={result} channel="new_store" />}
        </div>
      </SectionCard>

      {/* S10: Forecast → OTB */}
      <SectionCard title="Forecast → OTB 建议 (新店首铺)" sub="新店首批铺货 OTB 建议">
        <ForecastOtbRecommendation channel="new_store" scenario={scenario} onJumpToOtb={() => onJumpToTab('otb')} />
      </SectionCard>

      {/* S11: 情景模拟 */}
      <SectionCard title="新店情景模拟器" sub="6场景 × 8参数 → 保本·现金·回本周期">
        <ForecastScenarioSimulator channel="new_store" />
      </SectionCard>

      {/* S12: SKU配置 */}
      <SectionCard title="新店 SKU / 尺码配置建议">
        <SalesForecastSizeRiskPanel />
      </SectionCard>

      {/* S13: 下游输出 */}
      {result && (
        <SalesForecastDownstreamOutputV2
          channel="new_store"
          annualForecast={result.annualForecast}
          grossMarginRate={config.brand.grossMarginRate}
          refundRate={0.06}
        />
      )}

      {/* S14: 跨模块联动 */}
      <SectionCard title="跨模块联动入口">
        <ForecastRelatedLinks onJumpToTab={onJumpToTab} />
      </SectionCard>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
interface Props {
  onJumpToTab?: (tab: string) => void;
}

const ic = 'w-2.5 h-2.5';
const FORECAST_PAGE_SECTIONS = [
  { anchor: '#forecast-nav', label: '预测视图', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1.5" /><line x1="1" y1="7" x2="15" y2="7" /></svg>) },
  { anchor: '#forecast-content', label: '预测内容', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,12 5,8 8.5,10 12,5 14,7" /><polyline points="11,4 14,4 14,7" /></svg>) },
];

export default function ForecastTab({ onJumpToTab }: Props) {
  const [activeView, setActiveView] = useState<ForecastView>('omni');
  const [activeScenarios, setActiveScenarios] = useState<ForecastScenario[]>(['base']);
  const { config, updateForecast } = useGlobalConfig();
  const primaryScenario: ForecastScenario = activeScenarios[0] ?? 'base';

  const toggleScenario = useCallback((sc: ForecastScenario) => {
    setActiveScenarios(prev => {
      if (prev.includes(sc)) {
        const next = prev.filter(s => s !== sc);
        return next.length > 0 ? next : [sc];
      }
      return [...prev, sc];
    });
  }, []);

  const handleJumpToTab = useCallback((tab: string) => {
    onJumpToTab?.(tab);
  }, [onJumpToTab]);

  const activeViewMeta = VIEW_TABS.find(v => v.key === activeView)!;

  return (
    <div className="space-y-5">
      <section id="forecast-nav" className="scroll-mt-24">
      <MerchSectionDivider label="A" title="预测视图切换" />
      {/* ── 子视图导航 ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-slate-100 overflow-x-auto scrollbar-hide">
          {VIEW_TABS.map(view => {
            const health = view.channel ? getChannelHealth(view.channel) : null;
            return (
              <button
                key={view.key}
                onClick={() => setActiveView(view.key)}
                className={`flex-1 min-w-[140px] flex flex-col items-center gap-1.5 px-4 py-3.5 border-b-2 transition-all ${
                  activeView === view.key
                    ? 'border-pink-500 bg-pink-50/30'
                    : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}>
                <div className="flex items-center gap-1.5">
                  <span>{view.icon}</span>
                  <span className={`text-sm font-semibold ${activeView === view.key ? 'text-pink-600' : 'text-slate-600'}`}>
                    {view.label}
                  </span>
                  {health && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${health.cls}`}>
                      {health.dot}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{view.desc}</span>
              </button>
            );
          })}
        </div>

        {/* 情景选择器 */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/50">
          <span className="text-[10px] text-slate-400">情景：</span>
          {SCENARIOS.map(s => {
            const isActive = activeScenarios.includes(s.key);
            return (
              <button key={s.key} onClick={() => toggleScenario(s.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isActive ? s.activeColor : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}>
                {s.label}
              </button>
            );
          })}
          <div className="ml-auto">
            <ForecastMethodSwitcher method={config.forecast.method} onChange={m => updateForecast({ method: m })} />
          </div>
        </div>
      </div>
      </section>

      <section id="forecast-content" className="scroll-mt-24">
      <MerchSectionDivider label="B" title="预测内容" />
      {/* ── 子视图内容 ──────────────────────────────────────────────────────── */}
      {activeView === 'omni' && (
        <OmniView
          scenario={primaryScenario}
          activeScenarios={activeScenarios}
          onToggleScenario={toggleScenario}
          onJumpToTab={handleJumpToTab}
        />
      )}
      {activeView === 'physical' && (
        <PhysicalView
          scenario={primaryScenario}
          activeScenarios={activeScenarios}
          onToggleScenario={toggleScenario}
          onJumpToTab={handleJumpToTab}
        />
      )}
      {activeView === 'ecommerce' && (
        <EcommerceView
          scenario={primaryScenario}
          activeScenarios={activeScenarios}
          onJumpToTab={handleJumpToTab}
        />
      )}
      {activeView === 'new_store' && (
        <NewStoreView
          scenario={primaryScenario}
          activeScenarios={activeScenarios}
          onJumpToTab={handleJumpToTab}
        />
      )}
      </section>

      <FloatingModuleNav
        moduleLinks={buildMerchModuleLinks('forecast')}
        pageSections={FORECAST_PAGE_SECTIONS}
      />
    </div>
  );
}
