'use client';

import { useDashboardFilter } from '@/hooks/useDashboardFilter';
import FilterBar from '@/components/dashboard/FilterBar';
import KpiGrid from '@/components/dashboard/KpiGrid';
import MetricsDrawer from '@/components/dashboard/MetricsDrawer';
import DashboardChart from '@/components/charts/DashboardChart';

interface ConclusionCardProps {
    finding: string;
    decision: string;
    impact: string;
}

function ConclusionCard({ finding, decision, impact }: ConclusionCardProps) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2">
            <div className="flex gap-2">
                <span className="text-base">🔍</span>
                <div><span className="font-semibold text-slate-700">发现 </span><span className="text-slate-600">{finding}</span></div>
            </div>
            <div className="flex gap-2">
                <span className="text-base">⚡</span>
                <div><span className="font-semibold text-slate-700">决策 </span><span className="text-slate-600">{decision}</span></div>
            </div>
            <div className="flex gap-2">
                <span className="text-base">📈</span>
                <div><span className="font-semibold text-slate-700">结果 </span><span className="text-slate-600">{impact}</span></div>
            </div>
        </div>
    );
}

interface ChartCardProps {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge';
    kpis: ReturnType<typeof useDashboardFilter>['kpis'];
    conclusion: ConclusionCardProps;
    span?: 'full' | 'half';
}

function ChartCard({ title, type, kpis, conclusion, span = 'half' }: ChartCardProps) {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${span === 'full' ? 'col-span-2' : ''}`}>
            <div className="p-5">
                <DashboardChart title={title} type={type} kpis={kpis} />
            </div>
            <div className="px-5 pb-5">
                <ConclusionCard {...conclusion} />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { filters, setFilters, kpis, filterSummary } = useDashboardFilter();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Filter Bar */}
            <FilterBar filters={filters} setFilters={setFilters} filterSummary={filterSummary} />

            <div className="max-w-screen-2xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">企划数据看板</h1>
                        <p className="text-slate-500 mt-1">30秒读懂经营结果 · 3分钟讲清洞察决策 · 10分钟钻取到 SKU 动作</p>
                    </div>
                    <MetricsDrawer />
                </div>

                {/* KPI Grid */}
                <div className="mb-10">
                    <KpiGrid kpis={kpis} />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">图表矩阵 · 洞察层</span>
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Chart 1: Price Band Distribution */}
                    <ChartCard
                        title="SKU 价格带分布（计划 vs 实际）"
                        type="bar"
                        kpis={kpis}
                        conclusion={{
                            finding: '¥300-499 价格带实际占比 55%，高于计划 48%；¥600+ 价格带缺口明显。',
                            decision: '下季度增加高价带 SKU 数量（目标 +3 款），收缩 ¥199-299 低价带至 10%。',
                            impact: '预计提升均价 ¥35-50，毛利率改善 +1.5-2pp。',
                        }}
                    />

                    {/* Chart 2: Sell-Through Curve */}
                    <ChartCard
                        title="售罄率曲线（累计）"
                        type="line"
                        kpis={kpis}
                        conclusion={{
                            finding: `当前累计售罄率 ${kpis ? Math.round(kpis.avgSellThrough * 100) : '--'}%，W4 前节奏偏慢（低于目标线 8pp）。`,
                            decision: 'W4-W6 加大电商流量投放，对低动销款启动渠道调拨（直营→电商）。',
                            impact: '预计 W8 累计售罄率追回至目标线，减少清仓压力，保护毛利 +0.8pp。',
                        }}
                    />

                    {/* Chart 3: Channel Mix */}
                    <ChartCard
                        title="渠道销售占比"
                        type="pie"
                        kpis={kpis}
                        conclusion={{
                            finding: '电商渠道合计占比约 60%，直营门店贡献 25%，KA 渠道表现偏弱（<10%）。',
                            decision: '优化 KA 渠道陈列策略，聚焦 ¥399-599 主力价格带，减少 KA 清仓款比例。',
                            impact: '预计 KA 渠道售罄率提升 +5-8pp，减少折扣损失 ¥XX 万。',
                        }}
                    />

                    {/* Chart 4: Price vs Sell-Through Scatter */}
                    <ChartCard
                        title="价格 vs 售罄率分析（气泡=销量）"
                        type="scatter"
                        kpis={kpis}
                        conclusion={{
                            finding: '¥199-299 常青款售罄率 88-92%，位于高效区；¥600+ 新品集中在低售罄象限（<75%）。',
                            decision: '对 ¥600+ 低售罄新品：W8 前启动渠道调拨；W10 后视情况降价 10-15%。',
                            impact: '预计清仓库存减少 30%，避免季末大幅折扣，保护毛利 +1-2pp。',
                        }}
                    />

                    {/* Chart 5: Heatmap */}
                    <ChartCard
                        title="品类 × 价格带 SKU 热力图"
                        type="heatmap"
                        kpis={kpis}
                        conclusion={{
                            finding: '运动品类在 ¥199-399 低价带 SKU 过密（10款），户外品类 ¥600+ 布局合理。',
                            decision: '下季运动品类削减 ¥199-299 SKU 2-3 款，资源向 ¥499-599 形象款倾斜。',
                            impact: '预计 SKU 效率（单款产出）提升 +15%，降低库存分散风险。',
                        }}
                    />

                    {/* Chart 6: Gauge */}
                    <ChartCard
                        title="整体平均售罄率"
                        type="gauge"
                        kpis={kpis}
                        conclusion={{
                            finding: `整体售罄率 ${kpis ? Math.round(kpis.avgSellThrough * 100) : '--'}%，${kpis && kpis.avgSellThrough >= 0.8 ? '已达成目标 80%' : '距目标 80% 尚有差距'}。常青款拉高均值，新品拖累整体。`,
                            decision: '重点关注售罄率<70% 的新品（共 3 款），制定专项动销方案（直播/捆绑/渠道调拨）。',
                            impact: '若 3 款问题款售罄率提升至 75%，整体均值可改善 +2-3pp。',
                        }}
                    />

                </div>

                {/* Footer Note */}
                <div className="mt-10 bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
                    <span className="text-xl">💡</span>
                    <div>
                        <h4 className="font-semibold text-amber-900 mb-1">数据说明</h4>
                        <p className="text-sm text-amber-800">
                            本看板数据已脱敏处理，金额经指数化（×系数），结构与趋势真实反映业务逻辑。
                            点击右上角 <strong>指标口径</strong> 查看各指标计算方式。
                            筛选条件变更后，KPI 卡与图表实时同步更新。
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
