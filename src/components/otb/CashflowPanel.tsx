'use client';
/**
 * src/components/otb/CashflowPanel.tsx
 * 现金流决策工作台 V4.0 — 鞋类品牌商品企划现金决策工作台
 *
 * 模块：
 * 1. 筛选器  2. 现金总览8KPI  3. 预警行动中心  4. 月度预测图
 * 5. 利润→现金桥  6. 采购付款OTB  7. 库存变现  8. CCC
 * 9. 回款预测  10. 新店现金  11. 情景模拟  12. 明细表  13. 联动入口
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useCashflow } from '@/hooks/useCashflow';
import type { CashflowSimulationOptions, MonthlyCashflow } from '@/hooks/useCashflow';
import InventoryCashPressurePanel from './InventoryCashPressurePanel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CashAction {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  riskTag: string;
  object: string;
  problem: string;
  action: string;
  cashImprovement: number;
  salesImpact: string;
  marginImpact: string;
  status: '建议中' | '待审批' | '执行中' | '已完成' | '已关闭';
  relatedModule: string;
  relatedModuleKey: string;
}

interface PurchasePaymentItem {
  wave: string;
  supplier: string;
  orderAmount: number;
  otbBudget: number;
  depositPaid: number;
  balanceDue: number;
  paymentDueDate: string;
  arrivalDate: string;
  cashImpact: number;
  canDelay: boolean;
  recommendation: string;
}

interface InventoryScenario {
  key: string;
  label: string;
  discount: number;
  clearanceRate: number;
  cashIn: number;
  markdownLoss: number;
  grossMarginImpact: string;
  weeks: number;
  recommended: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtW = (v: number) => `¥${(v / 10000).toFixed(1)}万`;

function RiskBadge({ level }: { level: 'safe' | 'warning' | 'danger' | 'info' | 'purple' }) {
  const map: Record<string, string> = {
    safe: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  const label: Record<string, string> = { safe: '安全', warning: '预警', danger: '高风险', info: '机会', purple: '观察' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[level]}`}>
      {label[level]}
    </span>
  );
}

function SectionHeader({ icon, title, subtitle, badge }: { icon: string; title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
          {badge && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string; value: string; target?: string;
  delta?: string; deltaTone?: 'pos' | 'neg' | 'neutral';
  status: 'safe' | 'warning' | 'danger' | 'info' | 'purple' | 'gray'; sub?: string;
}
function KpiCard({ label, value, target, delta, deltaTone = 'neutral', status, sub }: KpiCardProps) {
  const borderMap: Record<string, string> = {
    safe: 'border-l-4 border-l-emerald-400', warning: 'border-l-4 border-l-amber-400',
    danger: 'border-l-4 border-l-rose-500', info: 'border-l-4 border-l-blue-400',
    purple: 'border-l-4 border-l-purple-400', gray: 'border-l-4 border-l-slate-200',
  };
  const valueMap: Record<string, string> = {
    safe: 'text-emerald-700', warning: 'text-amber-700', danger: 'text-rose-700',
    info: 'text-blue-700', purple: 'text-purple-700', gray: 'text-slate-500',
  };
  const deltaColors: Record<string, string> = { pos: 'text-emerald-600', neg: 'text-rose-600', neutral: 'text-slate-500' };
  return (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 ${borderMap[status]}`}>
      <div className="text-[11px] text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueMap[status]}`}>{value}</div>
      {target && <div className="text-[10px] text-slate-400 mt-0.5">目标 {target}</div>}
      {delta && <div className={`text-[10px] mt-0.5 font-medium ${deltaColors[deltaTone]}`}>{delta}</div>}
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── ECharts: Monthly Cash Forecast ───────────────────────────────────────────
function MonthlyCashForecastChart({ monthly, safetyLine }: { monthly: MonthlyCashflow[]; safetyLine: number }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current || monthly.length === 0) return;
    let chart: { setOption: (o: unknown) => void; resize: () => void; dispose: () => void } | null = null;
    const init = async () => {
      const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
      if (!chartRef.current) return;
      chart = echarts.init(chartRef.current) as typeof chart;
      chart!.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['现金流入', '现金流出', '期末现金', '安全线'], textStyle: { fontSize: 11 }, top: 4 },
        grid: { left: 60, right: 60, top: 44, bottom: 28 },
        xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
        yAxis: [
          { type: 'value', name: '金额(万)', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}`, fontSize: 10 }, nameTextStyle: { fontSize: 10 } },
          { type: 'value', name: '余额', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}`, fontSize: 10 }, nameTextStyle: { fontSize: 10 } },
        ],
        series: [
          { name: '现金流入', type: 'bar', stack: 'cf', data: monthly.map(m => m.collection), itemStyle: { color: '#10b981' }, barMaxWidth: 24 },
          { name: '现金流出', type: 'bar', stack: 'cf', data: monthly.map(m => -(m.otbDeposit + m.otbBalance + m.autoExpenses + m.manualExpenses)), itemStyle: { color: '#f87171' }, barMaxWidth: 24 },
          { name: '期末现金', type: 'line', yAxisIndex: 1, data: monthly.map(m => m.closingBalance), lineStyle: { color: '#38bdf8', width: 2.5 }, symbol: 'circle', symbolSize: 6, itemStyle: { color: '#38bdf8' }, areaStyle: { color: 'rgba(56,189,248,0.07)' } },
          { name: '安全线', type: 'line', yAxisIndex: 1, data: monthly.map(() => safetyLine), lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 }, symbol: 'none', itemStyle: { color: '#f59e0b' } },
        ],
      });
    };
    init();
    const obs = new ResizeObserver(() => chart?.resize());
    if (chartRef.current) obs.observe(chartRef.current);
    return () => { obs.disconnect(); chart?.dispose(); };
  }, [monthly, safetyLine]);
  return <div ref={chartRef} style={{ height: 280 }} />;
}

// ─── ECharts: OTB Payment Chart ───────────────────────────────────────────────
function OtbPaymentChart({ monthly }: { monthly: MonthlyCashflow[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current || monthly.length === 0) return;
    let chart: { setOption: (o: unknown) => void; resize: () => void; dispose: () => void } | null = null;
    const init = async () => {
      const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
      if (!chartRef.current) return;
      chart = echarts.init(chartRef.current) as typeof chart;
      chart!.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['OTB定金', 'OTB尾款', '销售回款', '净流出'], textStyle: { fontSize: 11 }, top: 4 },
        grid: { left: 60, right: 20, top: 44, bottom: 28 },
        xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
        series: [
          { name: 'OTB定金', type: 'bar', stack: 'otb', data: monthly.map(m => m.otbDeposit), itemStyle: { color: '#fb923c' }, barMaxWidth: 24 },
          { name: 'OTB尾款', type: 'bar', stack: 'otb', data: monthly.map(m => m.otbBalance), itemStyle: { color: '#f97316' }, barMaxWidth: 24 },
          { name: '销售回款', type: 'line', data: monthly.map(m => m.collection), lineStyle: { color: '#10b981', width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#10b981' } },
          { name: '净流出', type: 'line', data: monthly.map(m => m.paymentMinusCollection), lineStyle: { color: '#f43f5e', type: 'dashed', width: 1.5 }, symbol: 'none', itemStyle: { color: '#f43f5e' } },
        ],
      });
    };
    init();
    const obs = new ResizeObserver(() => chart?.resize());
    if (chartRef.current) obs.observe(chartRef.current);
    return () => { obs.disconnect(); chart?.dispose(); };
  }, [monthly]);
  return <div ref={chartRef} style={{ height: 220 }} />;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ACTIONS: CashAction[] = [
  { id: 'a1', priority: 'P1', riskTag: '现金缺口', object: '7月 / 春夏波二', problem: '7月OTB尾款集中到账，叠加6月采购定金，单月付款峰值超回款230%', action: '将春夏波二尾款延后至8月支付，协商供应商30天账期延期', cashImprovement: 87, salesImpact: '无影响', marginImpact: '无影响', status: '建议中', relatedModule: 'OTB预算', relatedModuleKey: 'otb' },
  { id: 'a2', priority: 'P1', riskTag: '采购付款压力', object: '秋冬波一 / 全品类', problem: '秋冬首批OTB预算偏高，现金安全线将连续3个月被突破', action: '冻结非核心SKU OTB ¥120万，将靴类首批下单量压缩20%', cashImprovement: 120, salesImpact: '-3.5%', marginImpact: '+0.8%', status: '待审批', relatedModule: 'OTB预算', relatedModuleKey: 'otb' },
  { id: 'a3', priority: 'P1', riskTag: '库存占用', object: '春夏尾货 / 运动凉鞋', problem: '上季运动凉鞋库存价值¥243万滞压，占用现金超计划线40%', action: '启动7折清货方案，预计8周内回款¥135万', cashImprovement: 135, salesImpact: '零售减少', marginImpact: '-12%毛利率', status: '执行中', relatedModule: '库存健康', relatedModuleKey: 'inventory' },
  { id: 'a4', priority: 'P2', riskTag: '回款延迟', object: '电商平台 / 抖音', problem: '抖音平台T+7结算周期，本月应收¥95万预计延迟14天到账', action: '申请平台备付金垫付或开启达人寄卖分佣模式加速回款', cashImprovement: 95, salesImpact: '无', marginImpact: '无', status: '建议中', relatedModule: '销售预测', relatedModuleKey: 'forecast' },
  { id: 'a5', priority: 'P2', riskTag: '新店投入过高', object: '华南区 / 3家拟开新店', problem: '三季度拟开华南3店，首铺+装修+押金合计需求¥180万，与OTB付款高峰重叠', action: '建议9月推迟2家，仅保留核心商圈旗舰店按计划开业', cashImprovement: 120, salesImpact: '延后营收约¥200万', marginImpact: '中性', status: '建议中', relatedModule: '区域&门店', relatedModuleKey: 'channel' },
  { id: 'a6', priority: 'P2', riskTag: '采购付款压力', object: '运营费用 / Q3营销', problem: 'Q3品牌营销预算¥65万集中在8月，与尾款付款高峰重叠', action: '将品牌营销费用分拆至9-10月分期释放，保留核心KOL投放', cashImprovement: 40, salesImpact: '短期推广减弱', marginImpact: '中性', status: '建议中', relatedModule: '损益', relatedModuleKey: 'profit-loss' },
  { id: 'a7', priority: 'P3', riskTag: '现金缺口', object: '加盟商回款 / 华东区', problem: '华东区3家加盟商逾期应收¥42万，超30天未结清', action: '启动催收流程，要求本月底前结清，否则暂停下季补货资格', cashImprovement: 42, salesImpact: '低风险', marginImpact: '无', status: '建议中', relatedModule: '区域&门店', relatedModuleKey: 'channel' },
];

const MOCK_PURCHASE: PurchasePaymentItem[] = [
  { wave: '春夏波二', supplier: '福建运动科技', orderAmount: 380, otbBudget: 400, depositPaid: 114, balanceDue: 266, paymentDueDate: '2026-07', arrivalDate: '2026-08', cashImpact: -266, canDelay: true, recommendation: '建议延后30天' },
  { wave: '秋冬波一', supplier: '广州时装皮革', orderAmount: 520, otbBudget: 500, depositPaid: 0, balanceDue: 156, paymentDueDate: '2026-07', arrivalDate: '2026-09', cashImpact: -156, canDelay: false, recommendation: '建议压缩20%' },
  { wave: '秋冬波一', supplier: '温州经典制鞋', orderAmount: 290, otbBudget: 280, depositPaid: 87, balanceDue: 203, paymentDueDate: '2026-08', arrivalDate: '2026-10', cashImpact: -203, canDelay: true, recommendation: '可延后45天' },
  { wave: '秋冬波二', supplier: '东莞运动品牌', orderAmount: 180, otbBudget: 200, depositPaid: 0, balanceDue: 54, paymentDueDate: '2026-09', arrivalDate: '2026-11', cashImpact: -54, canDelay: true, recommendation: '无压力' },
];

const MOCK_INV_SCENARIOS: InventoryScenario[] = [
  { key: 'light', label: '轻折扣去化', discount: 0.85, clearanceRate: 0.15, cashIn: 89, markdownLoss: 16, grossMarginImpact: '-8%', weeks: 10, recommended: false },
  { key: 'deep', label: '深折扣清仓', discount: 0.65, clearanceRate: 0.30, cashIn: 158, markdownLoss: 85, grossMarginImpact: '-22%', weeks: 6, recommended: true },
  { key: 'outlet', label: '转奥莱/批发', discount: 0.55, clearanceRate: 0.45, cashIn: 134, markdownLoss: 109, grossMarginImpact: '-28%', weeks: 4, recommended: false },
];

const MOCK_RECEIVABLES = [
  { channel: '直营门店', receivable: 312, expected: 312, dueDate: '当月', overdue: 0, overdueDays: 0, risk: 'safe' as const },
  { channel: '电商平台', receivable: 248, expected: 230, dueDate: 'T+7~14', overdue: 18, overdueDays: 14, risk: 'warning' as const },
  { channel: '加盟商', receivable: 186, expected: 144, dueDate: '次月', overdue: 42, overdueDays: 32, risk: 'danger' as const },
  { channel: '奥莱清货', receivable: 67, expected: 67, dueDate: '结款后', overdue: 0, overdueDays: 0, risk: 'safe' as const },
];

const MOCK_NEW_STORES = [
  { name: '上海静安旗舰店', openMonth: '2026-09', renovation: 45, deposit: 30, firstSku: 80, labor: 12, marketing: 15, total: 182, monthlySales: 65, payback: 34, delay: false },
  { name: '广州天河中心店', openMonth: '2026-09', renovation: 28, deposit: 20, firstSku: 55, labor: 10, marketing: 10, total: 123, monthlySales: 42, payback: 38, delay: true },
  { name: '深圳万象城店', openMonth: '2026-10', renovation: 32, deposit: 25, firstSku: 60, labor: 11, marketing: 12, total: 140, monthlySales: 50, payback: 36, delay: true },
];

const RELATED_LINKS = [
  { key: 'otb', icon: '🛒', label: 'OTB预算', relation: '采购付款、预算冻结、可承受采购金额', color: 'bg-orange-50 border-orange-100 text-orange-700' },
  { key: 'inventory', icon: '📦', label: '库存健康', relation: '库存变现、清货回款、Markdown损失', color: 'bg-red-50 border-red-100 text-red-700' },
  { key: 'forecast', icon: '📈', label: '销售预测', relation: '未来销售回款、销售缺口、渠道回款节奏', color: 'bg-blue-50 border-blue-100 text-blue-700' },
  { key: 'profit-loss', icon: '💹', label: '损益', relation: '利润与现金差异、毛利和净利影响', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  { key: 'planning', icon: '📅', label: '波段企划', relation: '上市节奏、波段采购金额、波段延后建议', color: 'bg-purple-50 border-purple-100 text-purple-700' },
  { key: 'category', icon: '👟', label: '品类运营', relation: '品类现金效率、低效SKU压缩', color: 'bg-pink-50 border-pink-100 text-pink-700' },
  { key: 'channel', icon: '🏪', label: '区域&门店', relation: '新店投入、门店现金回款、租金人工支出', color: 'bg-sky-50 border-sky-100 text-sky-700' },
];

const PRESET_SCENARIOS = [
  { key: 'base', label: '基准场景', color: 'bg-blue-100 text-blue-700' },
  { key: 'sales_down', label: '销售下滑', color: 'bg-rose-100 text-rose-700' },
  { key: 'high_otb', label: '高采购付款', color: 'bg-orange-100 text-orange-700' },
  { key: 'inv_glut', label: '库存积压', color: 'bg-amber-100 text-amber-700' },
  { key: 'delay_store', label: '延期开店', color: 'bg-purple-100 text-purple-700' },
  { key: 'clearance', label: '清货回款', color: 'bg-emerald-100 text-emerald-700' },
];

// ─── Profit to Cash Bridge ────────────────────────────────────────────────────
function ProfitToCashBridge() {
  const items = [
    { label: '净利润', value: 238, type: 'base', desc: '' },
    { label: '加：折旧摊销', value: 42, type: 'add', desc: '非现金支出加回' },
    { label: '减：库存增加', value: -187, type: 'sub', desc: '秋冬补货备货' },
    { label: '减：采购预付款', value: -156, type: 'sub', desc: 'OTB定金已付' },
    { label: '减：应收账款增加', value: -63, type: 'sub', desc: '加盟商未结款' },
    { label: '加：应付账款增加', value: 38, type: 'add', desc: '供应商欠款延期' },
    { label: '减：新店投入', value: -182, type: 'sub', desc: '上海静安旗舰店' },
    { label: '加：清货回款', value: 135, type: 'add', desc: '运动凉鞋7折清仓' },
    { label: '经营现金流', value: -135, type: 'result', desc: '账面盈利但现金净流出' },
  ];
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const isResult = item.type === 'result';
        const isBase = item.type === 'base';
        const pct = Math.min(100, Math.abs(item.value) / 250 * 100);
        return (
          <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isResult ? 'bg-slate-50 border border-slate-200' : isBase ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
            <div className="w-36 shrink-0">
              <span className={`text-xs font-medium ${isResult ? 'text-slate-800 font-semibold' : isBase ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>{item.label}</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.value > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className={`w-20 text-right text-xs font-semibold ${item.value > 0 ? 'text-emerald-700' : item.value < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                {item.value > 0 ? '+' : ''}¥{Math.abs(item.value)}万
              </div>
            </div>
            {item.desc && <div className="w-32 text-[10px] text-slate-400 shrink-0">{item.desc}</div>}
          </div>
        );
      })}
      <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
        <p className="text-xs text-amber-700">
          <strong>结论：</strong>净利润 ¥238万 vs 经营现金流 -¥135万，差异 ¥373万，主要来自：库存增加（¥187万）+ 采购预付（¥156万）+ 新店投入（¥182万）。
        </p>
      </div>
    </div>
  );
}

// ─── CCC Panel ────────────────────────────────────────────────────────────────
function CCCPanel({ dso, dpo, ccc }: { dso: number | null; dpo: number | null; ccc: number | null }) {
  const dio = 94; const actualDso = dso ?? 28; const actualDpo = dpo ?? 38; const actualCcc = ccc ?? 84;
  const metrics = [
    { label: 'DIO 库存周转天数', value: dio, target: 75, worse: dio > 75, delta: `${dio > 75 ? '+' : ''}${dio - 75}天` },
    { label: 'DSO 应收账款天数', value: actualDso, target: 21, worse: actualDso > 21, delta: `${actualDso > 21 ? '+' : ''}${actualDso - 21}天` },
    { label: 'DPO 应付账款天数', value: actualDpo, target: 45, worse: actualDpo < 45, delta: `${actualDpo - 45}天` },
    { label: 'CCC 现金转换周期', value: actualCcc, target: 51, worse: actualCcc > 51, delta: `${actualCcc > 51 ? '+' : ''}${actualCcc - 51}天` },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(d => (
          <div key={d.label} className={`rounded-xl border px-4 py-3 ${d.worse && d.label.includes('CCC') ? 'border-rose-200 bg-rose-50' : d.worse ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <div className="text-[10px] text-slate-500 mb-1">{d.label}</div>
            <div className={`text-2xl font-bold ${d.worse && d.label.includes('CCC') ? 'text-rose-700' : d.worse ? 'text-amber-700' : 'text-emerald-700'}`}>{d.value}<span className="text-sm font-normal">天</span></div>
            <div className="text-[10px] text-slate-400 mt-0.5">目标 {d.target}天</div>
            <div className={`text-[10px] font-medium mt-0.5 ${d.worse ? 'text-rose-600' : 'text-emerald-600'}`}>{d.delta} vs 目标</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-600">
        <strong className="text-slate-800">CCC = DIO + DSO - DPO</strong> = {dio} + {actualDso} - {actualDpo} = <strong className="text-rose-700">{actualCcc}天</strong>（目标51天）。CCC 越长，现金压力越大。当前超目标 <strong className="text-rose-600">{actualCcc - 51}天</strong>。
      </div>
    </div>
  );
}

// ─── Scenario Simulator ───────────────────────────────────────────────────────
interface SimParams {
  salesGrowth: number; collectionLag: number; otbAmount: number;
  purchaseRatio: number; inventoryLiquidation: number; markdownRate: number;
  newStoreCount: number; newStoreInvestment: number; opexRate: number;
}
function ScenarioSimulator({ baseYearEndBalance }: { baseYearEndBalance: number }) {
  const [activeScenario, setActiveScenario] = useState('base');
  const [params, setParams] = useState<SimParams>({ salesGrowth: 0, collectionLag: 0, otbAmount: 0, purchaseRatio: 100, inventoryLiquidation: 0, markdownRate: 20, newStoreCount: 3, newStoreInvestment: 150, opexRate: 0 });
  const PRESETS: Record<string, SimParams> = {
    base: { salesGrowth: 0, collectionLag: 0, otbAmount: 0, purchaseRatio: 100, inventoryLiquidation: 0, markdownRate: 20, newStoreCount: 3, newStoreInvestment: 150, opexRate: 0 },
    sales_down: { salesGrowth: -15, collectionLag: 7, otbAmount: 0, purchaseRatio: 100, inventoryLiquidation: 0, markdownRate: 25, newStoreCount: 3, newStoreInvestment: 150, opexRate: 5 },
    high_otb: { salesGrowth: 0, collectionLag: 0, otbAmount: 200, purchaseRatio: 120, inventoryLiquidation: 0, markdownRate: 20, newStoreCount: 3, newStoreInvestment: 150, opexRate: 0 },
    inv_glut: { salesGrowth: -8, collectionLag: 0, otbAmount: 0, purchaseRatio: 100, inventoryLiquidation: 0, markdownRate: 35, newStoreCount: 3, newStoreInvestment: 150, opexRate: 3 },
    delay_store: { salesGrowth: 0, collectionLag: 0, otbAmount: 0, purchaseRatio: 100, inventoryLiquidation: 0, markdownRate: 20, newStoreCount: 1, newStoreInvestment: 60, opexRate: 0 },
    clearance: { salesGrowth: -5, collectionLag: 0, otbAmount: -100, purchaseRatio: 80, inventoryLiquidation: 30, markdownRate: 35, newStoreCount: 3, newStoreInvestment: 150, opexRate: 0 },
  };
  const base = baseYearEndBalance / 10000;
  const output = useMemo(() => {
    const salesAdj = base * (params.salesGrowth / 100);
    const otbAdj = -params.otbAmount;
    const clearAdj = params.inventoryLiquidation * 5;
    const storeAdj = -(params.newStoreCount * params.newStoreInvestment - 3 * 150);
    const endingCash = Math.round(base + salesAdj + otbAdj + clearAdj + storeAdj);
    const maxGap = endingCash < 200 ? 200 - endingCash : 0;
    const runway = endingCash > 0 ? Math.min(24, endingCash / 80).toFixed(1) : '0';
    return { endingCash, maxGap, runway, belowSafety: endingCash < 500, freezeOtb: Math.max(0, -otbAdj) };
  }, [params, base]);
  const sliders: Array<{ key: keyof SimParams; label: string; min: number; max: number; step: number; format: (v: number) => string }> = [
    { key: 'salesGrowth', label: '销售增长率', min: -30, max: 30, step: 1, format: v => `${v > 0 ? '+' : ''}${v}%` },
    { key: 'collectionLag', label: '回款滞后天数', min: 0, max: 30, step: 1, format: v => `${v}天` },
    { key: 'otbAmount', label: 'OTB增减(万)', min: -300, max: 300, step: 10, format: v => `${v > 0 ? '+' : ''}¥${v}万` },
    { key: 'purchaseRatio', label: '采购付款比例', min: 50, max: 150, step: 5, format: v => `${v}%` },
    { key: 'inventoryLiquidation', label: '库存变现率%', min: 0, max: 50, step: 5, format: v => `${v}%` },
    { key: 'markdownRate', label: 'Markdown率%', min: 10, max: 50, step: 5, format: v => `${v}%` },
    { key: 'newStoreCount', label: '新店数量', min: 0, max: 8, step: 1, format: v => `${v}家` },
    { key: 'newStoreInvestment', label: '新店投入(万/家)', min: 50, max: 300, step: 10, format: v => `¥${v}万` },
    { key: 'opexRate', label: '运营费用增减%', min: -20, max: 20, step: 1, format: v => `${v > 0 ? '+' : ''}${v}%` },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map(s => (
            <button key={s.key} onClick={() => { setActiveScenario(s.key); setParams(PRESETS[s.key]); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeScenario === s.key ? s.color + ' border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {sliders.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 w-28 shrink-0">{s.label}</span>
            <input type="range" min={s.min} max={s.max} step={s.step} value={params[s.key]}
              onChange={e => setParams(p => ({ ...p, [s.key]: Number(e.target.value) }))}
              className="flex-1 h-1.5 accent-sky-500" />
            <span className="text-[11px] font-medium text-sky-700 w-14 text-right">{s.format(params[s.key])}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 content-start">
        {[
          { label: '期末现金', value: `¥${output.endingCash}万`, status: output.endingCash > 500 ? 'safe' : output.endingCash > 0 ? 'warning' : 'danger' },
          { label: '最大现金缺口', value: output.maxGap > 0 ? `¥${output.maxGap}万` : '无缺口', status: output.maxGap > 100 ? 'danger' : output.maxGap > 0 ? 'warning' : 'safe' },
          { label: '现金支撑月数', value: `${output.runway}个月`, status: Number(output.runway) > 6 ? 'safe' : Number(output.runway) > 3 ? 'warning' : 'danger' },
          { label: '低于安全线', value: output.belowSafety ? '是' : '否', status: output.belowSafety ? 'danger' : 'safe' },
          { label: '建议冻结OTB', value: output.freezeOtb > 0 ? `¥${output.freezeOtb}万` : '无需', status: output.freezeOtb > 0 ? 'warning' : 'safe' },
          { label: '对损益影响', value: params.salesGrowth !== 0 ? `销售${params.salesGrowth > 0 ? '+' : ''}${params.salesGrowth}%` : '中性', status: params.salesGrowth < -10 ? 'danger' : params.salesGrowth < 0 ? 'warning' : 'safe' },
        ].map(o => (
          <div key={o.label} className={`rounded-xl border px-4 py-3 ${o.status === 'danger' ? 'border-rose-200 bg-rose-50' : o.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <div className="text-[10px] text-slate-500 mb-1">{o.label}</div>
            <div className={`text-base font-bold ${o.status === 'danger' ? 'text-rose-700' : o.status === 'warning' ? 'text-amber-700' : 'text-emerald-700'}`}>{o.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
interface CashflowPanelProps {
  onJumpToTab?: (tab: string) => void;
}

export default function CashflowPanel({ onJumpToTab }: CashflowPanelProps) {
  const [safetyThreshold, setSafetyThreshold] = useState(5000000);
  const [actionStatuses, setActionStatuses] = useState<Record<string, CashAction['status']>>({});
  const [showAllDetail, setShowAllDetail] = useState(false);

  const simOptions = useMemo<CashflowSimulationOptions>(() => ({ cashSafetyThreshold: safetyThreshold }), [safetyThreshold]);
  const result = useCashflow('base', simOptions);
  const jump = useCallback((tab: string) => { onJumpToTab?.(tab); }, [onJumpToTab]);

  if (!result) return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">加载现金流数据中…</div>;

  const { monthly, yearEndBalance, maxGapMonth, maxGapAmount, totalCollection, otbPaymentTotal, cashSafetyMonths, dso, dpo, ccc, inventoryCashPressure } = result;
  const currentCash = monthly[0]?.openingBalance ?? 0;
  const minFutureCash = Math.min(...monthly.map(m => m.closingBalance));
  const minFutureMonth = monthly.find(m => m.closingBalance === minFutureCash)?.label ?? '--';
  const maxGapAbs = maxGapAmount < 0 ? Math.abs(maxGapAmount) : 0;
  const clearanceCashIn = inventoryCashPressure * 0.2 * 0.65;
  const dangerCount = result.dangerMonths.length;
  const breachCount = result.breachSafetyMonths.length;
  const isDanger = dangerCount > 0;
  const displayRows = showAllDetail
    ? monthly
    : monthly.filter((m, i) => i < 12 || m.alertLevel !== 'safe');

  return (
    <div className="space-y-5 pb-20">

      {/* 现金安全首屏判断条 */}
      <div className={`rounded-2xl border px-5 py-4 flex items-start gap-4 ${isDanger ? 'bg-rose-50 border-rose-200' : breachCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className={`text-2xl mt-0.5 ${isDanger ? 'text-rose-600' : breachCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {isDanger ? '⚠' : breachCount > 0 ? '⚡' : '✓'}
        </div>
        <div className="flex-1">
          <div className={`text-sm font-bold ${isDanger ? 'text-rose-800' : breachCount > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            {isDanger ? `现金高风险：${dangerCount}个月余额为负` : breachCount > 0 ? `现金预警：${breachCount}个月低于安全线${fmtW(safetyThreshold)}` : '现金安全：全年余额在安全线以上'}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            当前现金 {fmtW(currentCash)} · 年末余额 {fmtW(yearEndBalance)} · 可支撑 {cashSafetyMonths.toFixed(1)} 个月
            {maxGapMonth && <span className="text-rose-600"> · 最大缺口 {maxGapMonth}月 ({fmtW(maxGapAmount)})</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-500">安全线</span>
          <input type="range" min={1000000} max={10000000} step={500000} value={safetyThreshold}
            onChange={e => setSafetyThreshold(Number(e.target.value))} className="w-24 h-1.5 accent-sky-500" />
          <span className="text-xs font-semibold text-sky-700 w-12">{fmtW(safetyThreshold)}</span>
        </div>
      </div>

      {/* 2. 现金总览 8 KPIs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="💰" title="现金总览" subtitle="8个核心现金指标" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <KpiCard label="当前现金余额" value={fmtW(currentCash)} target={fmtW(safetyThreshold)}
            delta={currentCash >= safetyThreshold ? `超安全线 ${fmtW(currentCash - safetyThreshold)}` : `低于安全线 ${fmtW(safetyThreshold - currentCash)}`}
            deltaTone={currentCash >= safetyThreshold ? 'pos' : 'neg'} status={currentCash >= safetyThreshold ? 'safe' : 'danger'} />
          <KpiCard label="未来最低现金余额" value={fmtW(minFutureCash)} sub={`出现于 ${minFutureMonth}`}
            delta={minFutureCash < safetyThreshold ? `低于安全线 ${fmtW(safetyThreshold - minFutureCash)}` : '在安全线以上'}
            deltaTone={minFutureCash < safetyThreshold ? 'neg' : 'pos'} status={minFutureCash < 0 ? 'danger' : minFutureCash < safetyThreshold ? 'warning' : 'safe'} />
          <KpiCard label="现金安全线" value={fmtW(safetyThreshold)}
            delta={breachCount > 0 ? `${breachCount}个月低于安全线` : '全年安全'} deltaTone={breachCount > 0 ? 'neg' : 'pos'}
            status={breachCount > 0 ? 'warning' : 'safe'} />
          <KpiCard label="最大现金缺口" value={maxGapAbs > 0 ? `-${fmtW(maxGapAbs)}` : '无缺口'}
            sub={maxGapMonth ? `发生于 ${maxGapMonth}月` : ''} status={maxGapAbs > 0 ? 'danger' : 'safe'} />
          <KpiCard label="现金可支撑月数" value={`${cashSafetyMonths.toFixed(1)} 个月`}
            delta={cashSafetyMonths < 3 ? '资金紧张' : cashSafetyMonths < 6 ? '需关注' : '充裕'}
            deltaTone={cashSafetyMonths < 3 ? 'neg' : cashSafetyMonths < 6 ? 'neutral' : 'pos'}
            status={cashSafetyMonths < 3 ? 'danger' : cashSafetyMonths < 6 ? 'warning' : 'safe'} />
          <KpiCard label="采购付款压力" value={fmtW(otbPaymentTotal)}
            delta={otbPaymentTotal > totalCollection ? `超回款 ${fmtW(otbPaymentTotal - totalCollection)}` : '回款覆盖付款'}
            deltaTone={otbPaymentTotal > totalCollection ? 'neg' : 'pos'}
            status={otbPaymentTotal > totalCollection * 1.2 ? 'danger' : otbPaymentTotal > totalCollection ? 'warning' : 'safe'} />
          <KpiCard label="库存占用现金" value={fmtW(inventoryCashPressure)}
            sub={`库存/年销比 ${((inventoryCashPressure / (totalCollection * 1.1)) * 100).toFixed(0)}%`}
            status={inventoryCashPressure > totalCollection * 0.5 ? 'warning' : 'safe'} />
          <KpiCard label="预计清货回款" value={fmtW(clearanceCashIn)} delta="7折清仓方案" deltaTone="neutral" status="info" />
        </div>
      </div>

      {/* 3. 现金预警与行动中心 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="🎯" title="现金预警与行动中心" subtitle={`${MOCK_ACTIONS.length} 条高优先级行动建议`} badge={`${MOCK_ACTIONS.filter(a => a.priority === 'P1').length} 个P1`} />
        <div className="divide-y divide-slate-50">
          {MOCK_ACTIONS.map(action => {
            const status = actionStatuses[action.id] ?? action.status;
            const statusColors: Record<CashAction['status'], string> = { '建议中': 'bg-blue-100 text-blue-700', '待审批': 'bg-amber-100 text-amber-700', '执行中': 'bg-purple-100 text-purple-700', '已完成': 'bg-emerald-100 text-emerald-700', '已关闭': 'bg-slate-100 text-slate-500' };
            const priorityColors: Record<string, string> = { P1: 'bg-rose-100 text-rose-700', P2: 'bg-amber-100 text-amber-700', P3: 'bg-slate-100 text-slate-600' };
            return (
              <div key={action.id} className="px-5 py-4 hover:bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[action.priority]}`}>{action.priority}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">{action.riskTag}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800">{action.object}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[status]}`}>{status}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-1.5">{action.problem}</p>
                    <p className="text-[11px] text-slate-700 font-medium">→ {action.action}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500">
                      <span className="text-emerald-700 font-medium">现金改善 ¥{action.cashImprovement}万</span>
                      <span>销售：{action.salesImpact}</span>
                      <span>毛利：{action.marginImpact}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => jump(action.relatedModuleKey)} className="text-[10px] text-sky-600 hover:text-sky-800 border border-sky-200 rounded-lg px-2.5 py-1 whitespace-nowrap">→ {action.relatedModule}</button>
                    <select value={status} onChange={e => setActionStatuses(prev => ({ ...prev, [action.id]: e.target.value as CashAction['status'] }))}
                      className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none">
                      {(['建议中', '待审批', '执行中', '已完成', '已关闭'] as const).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100">
          <p className="text-xs text-emerald-700">
            <strong>全部执行后合计改善现金：¥{MOCK_ACTIONS.reduce((s, a) => s + a.cashImprovement, 0)}万</strong>
            （P1 三项：¥{MOCK_ACTIONS.filter(a => a.priority === 'P1').reduce((s, a) => s + a.cashImprovement, 0)}万）
          </p>
        </div>
      </div>

      {/* 4. 月度现金预测 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="📊" title="月度现金预测" subtitle="现金流入 / 流出 / 期末 / 安全线" />
        <div className="px-4 pb-4">
          <MonthlyCashForecastChart monthly={monthly} safetyLine={safetyThreshold} />
        </div>
        <div className="overflow-x-auto border-t border-slate-50">
          <table className="min-w-full text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-400">
                {['月份', '期初', '销售回款', '采购付款', '运营费用', '期末', '安全线', '缺口', '状态'].map(h => <th key={h} className="py-2 px-3 text-right first:text-left font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {monthly.slice(0, 6).map(m => {
                const purchase = m.otbDeposit + m.otbBalance;
                const gap = m.closingBalance < safetyThreshold ? m.closingBalance - safetyThreshold : 0;
                return (
                  <tr key={m.month} className={`border-b border-slate-50 ${m.alertLevel === 'danger' ? 'bg-rose-50/50' : m.alertLevel === 'warning' ? 'bg-amber-50/50' : ''}`}>
                    <td className="py-2 px-3 font-medium whitespace-nowrap">{m.label}</td>
                    <td className="py-2 px-3 text-right">{fmtW(m.openingBalance)}</td>
                    <td className="py-2 px-3 text-right text-emerald-600">{fmtW(m.collection)}</td>
                    <td className="py-2 px-3 text-right text-orange-600">{fmtW(purchase)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{fmtW(m.autoExpenses + m.manualExpenses)}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${m.closingBalance < 0 ? 'text-rose-700' : m.closingBalance < safetyThreshold ? 'text-amber-700' : 'text-slate-700'}`}>{fmtW(m.closingBalance)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{fmtW(safetyThreshold)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${gap < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{gap < 0 ? fmtW(gap) : '-'}</td>
                    <td className="py-2 px-3 text-center">{m.alertLevel === 'danger' ? <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full">危险</span> : m.alertLevel === 'warning' ? <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">预警</span> : <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">安全</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. 利润到现金桥 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="🌉" title="利润到现金桥" subtitle="解释为什么损益盈利但现金可能紧张" badge="净利润 vs 经营现金流" />
        <div className="px-5 py-4">
          <ProfitToCashBridge />
        </div>
        <div className="px-5 pb-4">
          <button onClick={() => jump('profit-loss')} className="text-xs text-sky-600 hover:text-sky-800 border border-sky-200 rounded-lg px-3 py-1.5">→ 查看损益详情</button>
        </div>
      </div>

      {/* 6. 采购付款与OTB占用 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="🛒" title="采购付款与OTB占用" subtitle="未来付款排期、可延期金额、建议冻结OTB" />
        <div className="p-4 space-y-4">
          {/* Payment calendar */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {monthly.map(m => {
              const payment = m.otbDeposit + m.otbBalance;
              const payPct = Math.min(100, (payment / (result.averageMonthlySpend * 0.5)) * 100);
              return (
                <div key={m.month} className="flex flex-col items-center gap-1">
                  <div className="text-[9px] text-slate-400">{m.label.replace('月', '')}</div>
                  <div className="w-full h-12 bg-slate-100 rounded-sm overflow-hidden flex flex-col-reverse">
                    <div className={`w-full rounded-sm ${payment > m.collection ? 'bg-rose-400' : 'bg-orange-300'}`} style={{ height: `${payPct}%` }} />
                  </div>
                  <div className="text-[8px] text-slate-500">{(payment / 10000).toFixed(0)}万</div>
                </div>
              );
            })}
          </div>
          {/* OTB payment table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-400">
                  {['波段', '供应商', '订单(万)', 'OTB预算', '定金已付', '尾款待付', '付款月', '到货月', '现金影响', '可延期', '建议'].map(h => <th key={h} className="py-2 px-3 text-right first:text-left font-medium whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {MOCK_PURCHASE.map((item, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium whitespace-nowrap">{item.wave}</td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-500">{item.supplier}</td>
                    <td className="py-2 px-3 text-right">{item.orderAmount}</td>
                    <td className="py-2 px-3 text-right">{item.otbBudget}</td>
                    <td className="py-2 px-3 text-right text-emerald-600">{item.depositPaid}</td>
                    <td className="py-2 px-3 text-right text-orange-600 font-medium">{item.balanceDue}</td>
                    <td className="py-2 px-3 text-right">{item.paymentDueDate}</td>
                    <td className="py-2 px-3 text-right">{item.arrivalDate}</td>
                    <td className={`py-2 px-3 text-right font-medium ${item.cashImpact < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{item.cashImpact}万</td>
                    <td className="py-2 px-3 text-center">{item.canDelay ? <span className="text-emerald-600">✓</span> : <span className="text-slate-400">-</span>}</td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{item.recommendation}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-700">
                  <td className="py-2 px-3" colSpan={5}>可延期合计</td>
                  <td className="py-2 px-3 text-right text-emerald-700">¥{MOCK_PURCHASE.filter(p => p.canDelay).reduce((s, p) => s + p.balanceDue, 0)}万</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={() => jump('otb')} className="text-xs text-sky-600 hover:text-sky-800 border border-sky-200 rounded-lg px-3 py-1.5">→ OTB预算</button>
          </div>
          <OtbPaymentChart monthly={monthly} />
        </div>
      </div>

      {/* 7. 库存变现与清货回款 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="📦" title="库存变现与清货回款" subtitle="三种清货方案对现金和毛利的影响" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '风险库存金额', value: fmtW(inventoryCashPressure * 0.35), status: 'danger' as const },
              { label: '可变现库存', value: fmtW(inventoryCashPressure * 0.30), status: 'warning' as const },
              { label: '预计清货回款', value: fmtW(clearanceCashIn), status: 'info' as const },
              { label: 'Markdown损失', value: fmtW(clearanceCashIn * 0.25), status: 'warning' as const },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border px-4 py-3 ${k.status === 'danger' ? 'border-rose-200 bg-rose-50' : k.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                <div className="text-[10px] text-slate-500 mb-1">{k.label}</div>
                <div className={`text-lg font-bold ${k.status === 'danger' ? 'text-rose-700' : k.status === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>{k.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MOCK_INV_SCENARIOS.map(s => (
              <div key={s.key} className={`rounded-xl border p-4 ${s.recommended ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800">{s.label}</span>
                  {s.recommended && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">推荐</span>}
                </div>
                <div className="text-xs text-slate-500 mb-2">{(s.discount * 10).toFixed(0)}折 · 清{(s.clearanceRate * 100).toFixed(0)}%库存 · {s.weeks}周</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">现金回款</span><span className="text-emerald-700 font-semibold">¥{s.cashIn}万</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Markdown损失</span><span className="text-rose-600">-¥{s.markdownLoss}万</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">毛利率影响</span><span className={s.markdownLoss > 80 ? 'text-rose-600' : 'text-amber-600'}>{s.grossMarginImpact}</span></div>
                </div>
              </div>
            ))}
          </div>
          <InventoryCashPressurePanel scenario="base" simulationOptions={simOptions} />
          <button onClick={() => jump('inventory')} className="text-xs text-sky-600 hover:text-sky-800 border border-sky-200 rounded-lg px-3 py-1.5">→ 库存健康</button>
        </div>
      </div>

      {/* 8. 现金转换周期 CCC */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="🔄" title="现金转换周期 CCC" subtitle="CCC = DIO + DSO - DPO，周期越长现金压力越大" />
        <div className="p-5">
          <CCCPanel dso={dso} dpo={dpo} ccc={ccc} />
        </div>
      </div>

      {/* 9. 回款预测 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="💳" title="回款预测" subtitle="按渠道拆分：直营 / 电商 / 加盟 / 奥莱" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-400">
                {['渠道', '应收(万)', '预计到账(万)', '结算周期', '逾期(万)', '逾期天数', '风险', '建议动作'].map(h => <th key={h} className="py-2 px-4 text-right first:text-left font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {MOCK_RECEIVABLES.map((r, i) => (
                <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 ${r.overdue > 0 ? 'bg-amber-50/30' : ''}`}>
                  <td className="py-2.5 px-4 font-medium whitespace-nowrap">{r.channel}</td>
                  <td className="py-2.5 px-4 text-right">{r.receivable}</td>
                  <td className={`py-2.5 px-4 text-right font-medium ${r.expected < r.receivable ? 'text-amber-700' : 'text-emerald-700'}`}>{r.expected}</td>
                  <td className="py-2.5 px-4 text-right text-slate-400">{r.dueDate}</td>
                  <td className={`py-2.5 px-4 text-right ${r.overdue > 0 ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>{r.overdue > 0 ? r.overdue : '-'}</td>
                  <td className={`py-2.5 px-4 text-right ${r.overdueDays > 30 ? 'text-rose-600' : r.overdueDays > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{r.overdueDays > 0 ? `${r.overdueDays}天` : '-'}</td>
                  <td className="py-2.5 px-4 text-center"><RiskBadge level={r.risk} /></td>
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap text-[10px]">{r.risk === 'danger' ? '启动催收，暂停补货' : r.risk === 'warning' ? '关注平台账期' : '正常跟进'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold text-slate-700 text-xs">
                <td className="py-2 px-4">合计</td>
                <td className="py-2 px-4 text-right">{MOCK_RECEIVABLES.reduce((s, r) => s + r.receivable, 0)}</td>
                <td className="py-2 px-4 text-right text-emerald-700">{MOCK_RECEIVABLES.reduce((s, r) => s + r.expected, 0)}</td>
                <td colSpan={3} />
                <td className="py-2 px-4 text-right text-rose-600">{MOCK_RECEIVABLES.reduce((s, r) => s + r.overdue, 0)}万逾期</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
          电商平台本月预计延迟¥18万 · 加盟商逾期¥42万超30天，建议暂停补货资格
        </div>
      </div>

      {/* 10. 新店现金需求 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="🏪" title="新店现金需求" subtitle="装修 / 押金 / 首铺 / 人员 / 开业营销" badge={`${MOCK_NEW_STORES.length} 家拟开店`} />
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-400">
                {['门店名称', '开业月', '装修', '押金', '首铺', '人员', '营销', '合计(万)', '月销售预测', '回本周期', '建议'].map(h => <th key={h} className="py-2 px-3 text-right first:text-left font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {MOCK_NEW_STORES.map((s, i) => (
                <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 ${s.delay ? 'opacity-60' : ''}`}>
                  <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                    {s.name}
                    {s.delay && <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">建议延期</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right">{s.openMonth}</td>
                  <td className="py-2.5 px-3 text-right">{s.renovation}</td>
                  <td className="py-2.5 px-3 text-right">{s.deposit}</td>
                  <td className="py-2.5 px-3 text-right">{s.firstSku}</td>
                  <td className="py-2.5 px-3 text-right">{s.labor}</td>
                  <td className="py-2.5 px-3 text-right">{s.marketing}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-700">{s.total}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">{s.monthlySales}万/月</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{s.payback}个月</td>
                  <td className="py-2.5 px-3 text-[10px] whitespace-nowrap">{s.delay ? <span className="text-amber-700">建议推迟至Q4</span> : <span className="text-emerald-700">按计划开业</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-700">
                <td className="py-2 px-3" colSpan={7}>新店需求合计</td>
                <td className="py-2 px-3 text-right text-rose-700">¥{MOCK_NEW_STORES.reduce((s, n) => s + n.total, 0)}万</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
          建议延期2家（广州天河+深圳万象城），释放现金 ¥{MOCK_NEW_STORES.filter(s => s.delay).reduce((s, n) => s + n.total, 0)}万。
        </div>
        <div className="px-5 pb-4">
          <button onClick={() => jump('channel')} className="text-xs text-sky-600 hover:text-sky-800 border border-sky-200 rounded-lg px-3 py-1.5">→ 区域&门店</button>
        </div>
      </div>

      {/* 11. 情景模拟 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="⚙️" title="现金情景模拟" subtitle="6 个预设场景 · 9 个可调参数 · 实时输出" />
        <div className="p-5">
          <ScenarioSimulator baseYearEndBalance={yearEndBalance} />
        </div>
      </div>

      {/* 12. 月度现金明细 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-lg">📋</span>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">月度现金明细</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">默认展示未来12个月及异常月份</p>
            </div>
          </div>
          <button onClick={() => setShowAllDetail(v => !v)} className="text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5">
            {showAllDetail ? '仅看异常 ▲' : '查看全部 ▼'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-400">
                {['月份', '期初', '销售回款', '清货回款', '采购付款', '运营费用', '新店投入', '税费', '融资', '融资还款', '期末', '安全线', '缺口', '状态'].map(h => <th key={h} className="py-2 px-3 text-right first:text-left font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((m, i) => {
                const purchase = m.otbDeposit + m.otbBalance;
                const gap = m.closingBalance < safetyThreshold ? m.closingBalance - safetyThreshold : 0;
                return (
                  <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 ${m.alertLevel === 'danger' ? 'bg-rose-50/40' : m.alertLevel === 'warning' ? 'bg-amber-50/40' : ''}`}>
                    <td className="py-2 px-3 font-medium whitespace-nowrap">{m.label}</td>
                    <td className="py-2 px-3 text-right">{fmtW(m.openingBalance)}</td>
                    <td className="py-2 px-3 text-right text-emerald-600">{fmtW(m.collection)}</td>
                    <td className="py-2 px-3 text-right text-blue-600">-</td>
                    <td className="py-2 px-3 text-right text-orange-600">{fmtW(purchase)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{fmtW(m.autoExpenses + m.manualExpenses)}</td>
                    <td className="py-2 px-3 text-right text-purple-600">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-emerald-400">-</td>
                    <td className="py-2 px-3 text-right text-rose-400">-</td>
                    <td className={`py-2 px-3 text-right font-semibold ${m.closingBalance < 0 ? 'text-rose-700' : m.closingBalance < safetyThreshold ? 'text-amber-700' : 'text-slate-700'}`}>{fmtW(m.closingBalance)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{fmtW(safetyThreshold)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${gap < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{gap < 0 ? fmtW(gap) : '-'}</td>
                    <td className="py-2 px-3 text-center">{m.alertLevel === 'danger' ? <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full">危险</span> : m.alertLevel === 'warning' ? <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">预警</span> : <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">安全</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 13. 跨模块联动入口 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader icon="🔗" title="跨模块联动入口" subtitle="现金流与其他模块的联动关系" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
          {RELATED_LINKS.map(link => (
            <button key={link.key} onClick={() => jump(link.key)}
              className={`flex flex-col gap-2 border rounded-xl p-4 text-left hover:shadow-md transition-all ${link.color}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{link.icon}</span>
                <span className="font-semibold text-sm">{link.label}</span>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">{link.relation}</p>
              <span className="text-[10px] font-medium opacity-70 mt-auto">点击跳转 →</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
