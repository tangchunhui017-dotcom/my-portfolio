import ConclusionCard from '@/components/blocks/ConclusionCard';
import MetricCard from '@/components/blocks/MetricCard';

export const runtime = 'edge';

export default function CaseStudyDetailPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                {/* Breadcrumb */}
                <div className="text-sm text-slate-500 mb-6">
                    <a href="/case-studies" className="hover:text-slate-900">Case Studies</a>
                    <span className="mx-2">/</span>
                    <span className="text-slate-900">2024 SS 核心跑鞋系列</span>
                </div>

                {/* Header */}
                <div className="mb-12">
                    <div className="text-sm text-slate-500 mb-2">跑鞋 Running · 2024</div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">
                        2024 SS 核心跑鞋系列
                    </h1>
                    <p className="text-xl text-emerald-600 font-semibold">
                        售罄率 85-90%，毛利提升 5-8%
                    </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <MetricCard
                        label="售罄率"
                        value="85-90"
                        unit="%"
                        trend="up"
                        trendValue="+15%"
                    />
                    <MetricCard
                        label="毛利提升"
                        value="5-8"
                        unit="%"
                        trend="up"
                        trendValue="vs 上季"
                    />
                    <MetricCard
                        label="SKU 数量"
                        value="16"
                        description="核心款 8 + 增长款 6 + 形象款 2"
                    />
                </div>

                {/* Background */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">背景与目标</h2>
                    <div className="prose prose-slate max-w-none">
                        <p className="text-slate-700 leading-relaxed">
                            【此处为案例背景描述占位】市场机会、品牌定位、人群、渠道、价格带、竞品格局、目标 KPI 等内容将在您提供素材后填充。
                        </p>
                    </div>
                </section>

                {/* Insight */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">洞察</h2>
                    <ConclusionCard
                        discovery="【发现占位】趋势、用户、渠道数据、竞品拆解、关键矛盾"
                        decision="【决策占位】基于洞察做出的战略决策"
                        result="【结果占位】决策带来的直接影响"
                        variant="highlight"
                    />
                </section>

                {/* Strategy */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">策略</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">品类结构</h3>
                            <p className="text-slate-700">核心款 50% / 增长款 30% / 形象款 20%</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">价格带策略</h3>
                            <p className="text-slate-700">299元（引流）/ 399元（主力）/ 499元（利润）</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">SKU 架构</h3>
                            <p className="text-slate-700">16 SKU = 8 款式 × 2 配色平均</p>
                        </div>
                    </div>
                </section>

                {/* Design & Development */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">设计与开发</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                            <span className="text-slate-400">产品渲染图占位</span>
                        </div>
                        <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                            <span className="text-slate-400">实物图占位</span>
                        </div>
                    </div>
                </section>

                {/* Results */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">结果与复盘</h2>
                    <div className="bg-slate-50 rounded-lg p-6">
                        <p className="text-slate-700">
                            【此处将嵌入 ECharts 图表】售罄曲线、库存周转、折扣深度、渠道表现等数据可视化
                        </p>
                    </div>
                </section>

                {/* Assets */}
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">资产沉淀</h2>
                    <div className="flex gap-4">
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">
                            下载 Range Plan 模板
                        </button>
                        <button className="px-6 py-3 bg-white border border-slate-300 text-slate-900 rounded-lg font-medium hover:bg-slate-50">
                            下载评审 Checklist
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
