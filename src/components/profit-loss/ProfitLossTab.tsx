'use client';
/**
 * src/components/profit-loss/ProfitLossTab.tsx
 * 损益 Tab
 */
import { useState, useRef, useEffect } from 'react';
import { useBrandPnl, useStorePnl } from '@/hooks/usePnl';
import type { StorePnlInput } from '@/hooks/usePnl';
import { useMerchMetricConfig } from '@/hooks/useMerchMetricConfig';
import { resolveBusinessThreshold } from '@/utils/merchMetricResolver';
import { formatMoneyCny } from '@/config/numberFormat';
import ChannelPnlPanel from './ChannelPnlPanel';
import CategoryPnlPanel from './CategoryPnlPanel';
import MarkdownLossPanel from './MarkdownLossPanel';
import type { ForecastScenario } from '@/hooks/useForecast';

type PnlView = 'brand' | 'store';
type BrandAnalysisView = 'summary' | 'channel' | 'category' | 'markdown';
type StoreTemplateKey = 'mall_flagship' | 'mall_standard' | 'street';

interface Filters {
    year?: string;
    season_year?: number | 'all';
    season?: string | 'all';
}

const STORE_TEMPLATES: { key: StoreTemplateKey; label: string }[] = [
    { key: 'mall_flagship', label: '商场旗舰店' },
    { key: 'mall_standard', label: '商场标准店' },
    { key: 'street', label: '街铺' },
];

function KpiCard({ label, value, sub, tone = 'default', estimated }: { label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'default'; estimated?: boolean }) {
    const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-800';
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 relative">
            {estimated && <div className="absolute top-2 right-2 text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">估算</div>}
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
    );
}

function PnlWaterfallChart({ data }: { data: Array<{ name: string; value: number; isTotal?: boolean }> }) {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            // 瀑布图简化实现
            const names = data.map(d => d.name);
            const values = data.map(d => d.value);
            chart!.setOption({
                tooltip: { trigger: 'axis', formatter: (p: Array<{ name: string; value: number }>) => p.map(x => `${x.name}: ${formatMoneyCny(x.value)}`).join('<br/>') },
                grid: { left: 80, right: 20, top: 20, bottom: 40 },
                xAxis: { type: 'category', data: names, axisLabel: { fontSize: 10, rotate: 20 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series: [{
                    type: 'bar',
                    data: values.map((v, i) => ({
                        value: v,
                        itemStyle: { color: data[i].isTotal ? (v >= 0 ? '#10b981' : '#f43f5e') : v >= 0 ? '#38bdf8' : '#fb923c' },
                    })),
                    barMaxWidth: 40,
                    label: { show: true, position: 'top', fontSize: 9, formatter: (p: { value: number }) => `${(p.value / 10000).toFixed(1)}万` },
                }],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [data]);

    return <div ref={chartRef} style={{ height: 260 }} />;
}

function MonthlyTrendChart({ data }: { data: Array<{ label: string; netRevenue: number; grossMarginRate: number; ebitRate: number }> }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            chart!.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['净收入', '毛利率', 'EBIT率'], textStyle: { fontSize: 11 } },
                grid: { left: 60, right: 60, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: data.map(d => d.label), axisLabel: { fontSize: 10 } },
                yAxis: [
                    { type: 'value', name: '金额', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                    { type: 'value', name: '率', min: 0, max: 1, axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%`, fontSize: 10 } },
                ],
                series: [
                    { name: '净收入', type: 'bar', data: data.map(d => d.netRevenue), barMaxWidth: 24, itemStyle: { color: '#cbd5e1' } },
                    { name: '毛利率', type: 'line', yAxisIndex: 1, data: data.map(d => d.grossMarginRate), lineStyle: { color: '#10b981', width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#10b981' } },
                    { name: 'EBIT率', type: 'line', yAxisIndex: 1, data: data.map(d => d.ebitRate), lineStyle: { color: '#38bdf8', width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#38bdf8' } },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [data]);
    return <div ref={chartRef} style={{ height: 240 }} />;
}

function BrandPnlView({ filters, scenario }: { filters: Filters; scenario: ForecastScenario }) {
    const pnl = useBrandPnl(filters);
    const merchMetricConfig = useMerchMetricConfig();
    const grossMarginThreshold = resolveBusinessThreshold('grossMarginRate', merchMetricConfig).value;
    const grossMarginHealthyMin = grossMarginThreshold?.rules.find(rule => rule.status === 'health' && rule.condition === '>=')?.value ?? 0.4;
    const [analysisView, setAnalysisView] = useState<BrandAnalysisView>('summary');

    if (!pnl) return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">加载损益数据中…</div>;

    const estimated = pnl.isEstimated;
    const waterfallData = [
        { name: '净收入', value: pnl.netRevenue, isTotal: false },
        { name: 'COGS', value: -(pnl.netRevenue - pnl.grossProfit), isTotal: false },
        { name: '毛利', value: pnl.grossProfit, isTotal: true },
        { name: '营销', value: -pnl.marketing, isTotal: false },
        { name: '物流', value: -pnl.logistics, isTotal: false },
        { name: '人工', value: -pnl.labor, isTotal: false },
        { name: '租金', value: -pnl.rent, isTotal: false },
        { name: '管理', value: -pnl.admin, isTotal: false },
        { name: '折旧', value: -pnl.depreciation, isTotal: false },
        { name: 'EBIT', value: pnl.ebit, isTotal: true },
        { name: '税', value: -pnl.tax, isTotal: false },
        { name: '净利润', value: pnl.netProfit, isTotal: true },
    ];
    const ANALYSIS_VIEWS: { key: BrandAnalysisView; label: string; desc: string }[] = [
        { key: 'summary', label: '总P&L', desc: '收入到净利润' },
        { key: 'channel', label: '渠道贡献', desc: '渠道利润质量' },
        { key: 'category', label: '品类贡献', desc: '品类利润结构' },
        { key: 'markdown', label: '折扣侵蚀', desc: '促销清货损失' },
    ];

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
                {ANALYSIS_VIEWS.map(v => (
                    <button
                        key={v.key}
                        onClick={() => setAnalysisView(v.key)}
                        title={v.desc}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${analysisView === v.key ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'}`}
                    >
                        {v.label}
                    </button>
                ))}
            </div>

            {estimated && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    <span>⚠️</span>
                    <span>当前无匹配的事实销售数据，KPI 为零值占位。请检查筛选条件或导入数据。</span>
                </div>
            )}

            {analysisView === 'summary' && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        <KpiCard label="净收入" value={formatMoneyCny(pnl.netRevenue)} estimated={estimated} />
                        <KpiCard label="毛利" value={formatMoneyCny(pnl.grossProfit)} estimated={estimated} />
                        <KpiCard label="毛利率" value={`${(pnl.grossMarginRate * 100).toFixed(1)}%`} tone={pnl.grossMarginRate >= grossMarginHealthyMin ? 'positive' : 'warning'} estimated={estimated} />
                        <KpiCard label="EBIT" value={formatMoneyCny(pnl.ebit)} tone={pnl.ebit >= 0 ? 'positive' : 'negative'} estimated={estimated} />
                        <KpiCard label="EBIT率" value={`${(pnl.ebitRate * 100).toFixed(1)}%`} tone={pnl.ebitRate >= 0.05 ? 'positive' : pnl.ebitRate >= 0 ? 'warning' : 'negative'} estimated={estimated} />
                        <KpiCard label="净利润" value={formatMoneyCny(pnl.netProfit)} tone={pnl.netProfit >= 0 ? 'positive' : 'negative'} estimated={estimated} />
                        <KpiCard label="净利率" value={`${(pnl.netProfitRate * 100).toFixed(1)}%`} tone={pnl.netProfitRate >= 0.03 ? 'positive' : pnl.netProfitRate >= 0 ? 'warning' : 'negative'} estimated={estimated} />
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">P&L 利润桥（收入 → 净利润）</h3>
                        </div>
                        <div className="p-4">
                            <PnlWaterfallChart data={waterfallData} />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">月度趋势（净收入 / 毛利率 / EBIT率）</h3>
                        </div>
                        <div className="p-4">
                            <MonthlyTrendChart data={pnl.monthlyBreakdown} />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">P&L 明细表</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs text-slate-700">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-2 px-4 font-medium text-slate-500">科目</th>
                                        <th className="text-right py-2 px-4 font-medium text-slate-500">金额</th>
                                        <th className="text-right py-2 px-4 font-medium text-slate-500">占净收入%</th>
                                        <th className="text-right py-2 px-4 font-medium text-slate-500">数据来源</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: '净收入', value: pnl.netRevenue, source: estimated ? '估算' : '事实数据' },
                                        { name: '毛利', value: pnl.grossProfit, source: estimated ? '估算' : '事实数据' },
                                        { name: '营销费用', value: -pnl.marketing, source: '假设率' },
                                        { name: '物流费用', value: -pnl.logistics, source: '假设率' },
                                        { name: '人工费用', value: -pnl.labor, source: '假设率' },
                                        { name: '租金费用', value: -pnl.rent, source: '假设率' },
                                        { name: '管理费用', value: -pnl.admin, source: '假设率' },
                                        { name: '折旧摊销', value: -pnl.depreciation, source: '假设率' },
                                        { name: '其他费用', value: -pnl.otherOpex, source: '假设率' },
                                        { name: 'EBIT', value: pnl.ebit, source: '计算' },
                                        { name: '所得税', value: -pnl.tax, source: '假设率' },
                                        { name: '净利润', value: pnl.netProfit, source: '计算' },
                                    ].map(row => (
                                        <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="py-2 px-4 font-medium">{row.name}</td>
                                            <td className={`text-right py-2 px-4 ${row.value >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                                                {formatMoneyCny(row.value)}
                                            </td>
                                            <td className="text-right py-2 px-4 text-slate-500">
                                                {pnl.netRevenue > 0 ? `${(row.value / pnl.netRevenue * 100).toFixed(1)}%` : '-'}
                                            </td>
                                            <td className="text-right py-2 px-4">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${row.source === '事实数据' ? 'text-emerald-600 bg-emerald-50' : row.source === '估算' ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-100'}`}>
                                                    {row.source}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {analysisView === 'channel' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50">
                        <h3 className="font-semibold text-slate-800">渠道贡献</h3>
                        <p className="text-xs text-slate-400 mt-0.5">实体店 · 电商 · 新店 — 哪个渠道真正贡献利润</p>
                    </div>
                    <div className="p-5"><ChannelPnlPanel scenario={scenario} /></div>
                </div>
            )}

            {analysisView === 'category' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50">
                        <h3 className="font-semibold text-slate-800">品类贡献</h3>
                        <p className="text-xs text-slate-400 mt-0.5">哪些品类销售高但利润低</p>
                    </div>
                    <div className="p-5"><CategoryPnlPanel scenario={scenario} /></div>
                </div>
            )}

            {analysisView === 'markdown' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50">
                        <h3 className="font-semibold text-slate-800">折扣侵蚀</h3>
                        <p className="text-xs text-slate-400 mt-0.5">正价 / 活动 / 清货 — 折扣侵蚀了多少毛利</p>
                    </div>
                    <div className="p-5"><MarkdownLossPanel scenario={scenario} /></div>
                </div>
            )}
        </div>
    );
}

function StoreExpenseBreakdown({ result }: { result: NonNullable<ReturnType<typeof useStorePnl>> }) {
    const rentMethodLabel = result.rentMethod === 'revshare'
        ? '销售扣点取高'
        : result.rentMethod === 'guarantee'
        ? '保底租金取高'
        : '固定租金取高';
    const rows = [
        {
            label: '租金/扣点取高',
            value: result.effectiveRent,
            note: result.template.revShareRate > 0
                ? `${rentMethodLabel}；扣点参考 ${formatMoneyCny(result.mallDeduction)}`
                : rentMethodLabel,
        },
        {
            label: '人工工资',
            value: result.staffCost,
            note: `${result.template.staffCount} 人 × ${formatMoneyCny(result.template.staffCostPerHead)}`,
        },
        {
            label: '装修摊销',
            value: result.fitoutAmortization,
            note: `${result.template.fitoutAmortizationMonths} 个月摊销`,
        },
        {
            label: '后台费用',
            value: result.backendCost,
            note: '按品牌后台费用率估算',
        },
        {
            label: '税费',
            value: result.taxAmount,
            note: '按配置税率估算',
        },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
                <h4 className="text-sm font-semibold text-slate-700">费用拆解（月度）</h4>
                <p className="mt-1 text-xs text-slate-400">用于解释“月总费用”来源，后续接入真实门店账务后可替换为实际费用。</p>
            </div>
            <div className="divide-y divide-slate-50">
                {rows.map(row => {
                    const ratio = result.monthlyRevenue > 0 ? row.value / result.monthlyRevenue : 0;
                    return (
                        <div key={row.label} className="grid grid-cols-1 md:grid-cols-[minmax(120px,1fr)_120px_110px_minmax(160px,1fr)] gap-3 px-5 py-3 text-sm items-center">
                            <div>
                                <div className="font-medium text-slate-700">{row.label}</div>
                                <div className="mt-0.5 text-[10px] text-slate-400">{row.note}</div>
                            </div>
                            <div className="text-right font-semibold text-slate-800">{formatMoneyCny(row.value)}</div>
                            <div className="text-right text-xs text-slate-500">{(ratio * 100).toFixed(1)}%</div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${ratio >= 0.2 ? 'bg-rose-400' : ratio >= 0.1 ? 'bg-amber-400' : 'bg-sky-400'}`}
                                    style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(120px,1fr)_120px_110px_minmax(160px,1fr)] gap-3 px-5 py-3 text-sm items-center bg-slate-50">
                    <div className="font-semibold text-slate-800">费用合计</div>
                    <div className="text-right font-bold text-rose-600">{formatMoneyCny(result.totalOpex)}</div>
                    <div className="text-right text-xs font-semibold text-slate-600">
                        {result.monthlyRevenue > 0 ? `${(result.totalOpex / result.monthlyRevenue * 100).toFixed(1)}%` : '-'}
                    </div>
                    <div className="text-xs text-slate-400">净利润 = 毛利 - 费用合计</div>
                </div>
            </div>
        </div>
    );
}

function StorePnlView() {
    const [templateKey, setTemplateKey] = useState<StoreTemplateKey>('mall_standard');
    const [monthlyRevenue, setMonthlyRevenue] = useState(350000);

    const input: StorePnlInput = { templateKey, monthlyRevenue };
    const result = useStorePnl(input);

    const gradeColor = result?.storeGrade === 'A' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : result?.storeGrade === 'B' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-600 bg-rose-50 border-rose-200';

    return (
        <div className="space-y-5">
            {/* 模板选择 */}
            <div className="flex items-center gap-2 flex-wrap">
                {STORE_TEMPLATES.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTemplateKey(t.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${templateKey === t.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 参数输入 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">月销售额输入</h4>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min={50000}
                        max={2000000}
                        step={10000}
                        value={monthlyRevenue}
                        onChange={e => setMonthlyRevenue(Number(e.target.value))}
                        className="flex-1 accent-sky-500"
                    />
                    <div className="text-base font-bold text-slate-800 w-28 text-right">{formatMoneyCny(monthlyRevenue)}</div>
                </div>
            </div>

            {result && (
                <>
                    {/* 结果卡片 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <KpiCard label="月销售额" value={formatMoneyCny(result.monthlyRevenue)} estimated={true} />
                        <KpiCard label="月毛利" value={formatMoneyCny(result.grossProfit)} tone="positive" estimated={true} />
                        <KpiCard label="月总费用" value={formatMoneyCny(result.totalOpex)} tone="negative" estimated={true} />
                        <KpiCard
                            label="月净利润"
                            value={formatMoneyCny(result.netProfit)}
                            tone={result.netProfit >= 0 ? 'positive' : 'negative'}
                            estimated={true}
                        />
                        <KpiCard label="坪效（月）" value={`${formatMoneyCny(result.salesPerSqm)}/㎡`} estimated={true} />
                        <KpiCard
                            label="店铺等级"
                            value={result.storeGrade + '级'}
                            estimated={true}
                        />
                        <KpiCard label="损益平衡点" value={formatMoneyCny(result.breakEvenMonthlySales)} sub="月销要求" estimated={true} />
                        <KpiCard label="回本周期" value={result.paybackMonths < 999 ? `${result.paybackMonths}个月` : '亏损'} tone={result.paybackMonths < 36 ? 'positive' : result.paybackMonths < 60 ? 'warning' : 'negative'} estimated={true} />
                    </div>

                    {/* 店铺等级徽章 */}
                    <div className={`inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-sm font-semibold ${gradeColor}`}>
                        {result.storeGrade === 'A' ? '🏆' : result.storeGrade === 'B' ? '✅' : '⚠️'} 综合评定：{result.storeGrade}级店
                    </div>

                    {/* 商场租金取高逻辑可视化 */}
                    {result.template.revShareRate > 0 && (
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">🏬 商场租金取高逻辑</h4>
                            <div className="flex items-stretch gap-4">
                                <div className={`flex-1 rounded-lg border-2 p-4 ${result.rentMethod === 'fixed' ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="text-xs text-slate-500 mb-1">固定租金 + 物业费</div>
                                    <div className="text-base font-bold text-slate-800">{formatMoneyCny(result.template.fixedRent + result.template.propertyFee)}</div>
                                    {result.rentMethod === 'fixed' && <div className="text-[10px] text-sky-600 mt-1 font-medium">✓ 当前适用</div>}
                                </div>
                                <div className="flex items-center text-slate-400 text-sm font-bold">vs</div>
                                <div className={`flex-1 rounded-lg border-2 p-4 ${result.rentMethod === 'revshare' ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="text-xs text-slate-500 mb-1">销售额 × 扣点率 ({(result.template.revShareRate * 100).toFixed(0)}%)</div>
                                    <div className="text-base font-bold text-slate-800">{formatMoneyCny(result.monthlyRevenue * result.template.revShareRate)}</div>
                                    {result.rentMethod === 'revshare' && <div className="text-[10px] text-sky-600 mt-1 font-medium">✓ 当前适用（更高）</div>}
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-slate-500">实际支付租金（取高值）</span>
                                <span className="font-bold text-slate-800">{formatMoneyCny(result.effectiveRent)}</span>
                            </div>
                        </div>
                    )}

                    <StoreExpenseBreakdown result={result} />

                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-[10px] text-amber-700">
                        ⚠️ 单店测算所有结果均为假设估算，毛利基于品牌平均COGS率，实际结果以真实账期、成本结构为准。
                    </div>
                </>
            )}
        </div>
    );
}

export default function ProfitLossTab({ filters }: { filters: Filters }) {
    const [view, setView] = useState<PnlView>('brand');
    const scenario: ForecastScenario = 'base';

    const VIEWS: { key: PnlView; label: string }[] = [
        { key: 'brand', label: '品牌年度' },
        { key: 'store', label: '单店测算' },
    ];

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
                {VIEWS.map(v => (
                    <button
                        key={v.key}
                        onClick={() => setView(v.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${view === v.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                        {v.label}
                    </button>
                ))}
            </div>

            {view === 'brand' && <BrandPnlView filters={filters} scenario={scenario} />}
            {view === 'store' && <StorePnlView />}
        </div>
    );
}
