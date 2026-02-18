import DynamicChartDemo from '@/components/charts/DynamicChartDemo';

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="container mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">
                        数据看板 Dashboard
                    </h1>
                    <p className="text-lg text-slate-600">
                        企划数据看板 - 用数据讲述商业决策的故事
                    </p>
                </div>

                {/* Live Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Chart 1: Bar Chart */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <DynamicChartDemo title="SKU 价格带分布" type="bar" />
                    </div>

                    {/* Chart 2: Line Chart */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <DynamicChartDemo title="售罄率曲线" type="line" />
                    </div>

                    {/* Chart 3: Pie Chart */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <DynamicChartDemo title="渠道占比" type="pie" />
                    </div>

                    {/* Chart 4: Scatter Chart */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <DynamicChartDemo title="价格 vs 售罄率分析" type="scatter" />
                    </div>

                    {/* Chart 5: Heatmap */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <DynamicChartDemo title="SKU × 价格带热力图" type="heatmap" />
                    </div>

                    {/* Chart 6: Gauge */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <DynamicChartDemo title="平均售罄率" type="gauge" />
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                    <h3 className="text-2xl font-bold text-blue-900 mb-4">
                        ✨ ECharts 动态效果演示
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800">
                        <div>
                            <h4 className="font-semibold mb-2">🎬 动画效果</h4>
                            <ul className="space-y-1 text-sm">
                                <li>• 渐进式加载动画</li>
                                <li>• 数据更新过渡动画</li>
                                <li>• 悬停高亮效果</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">🎨 视觉增强</h4>
                            <ul className="space-y-1 text-sm">
                                <li>• 渐变色填充</li>
                                <li>• 阴影与光晕</li>
                                <li>• 响应式布局</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">🖱️ 交互能力</h4>
                            <ul className="space-y-1 text-sm">
                                <li>• 智能提示框 (Tooltip)</li>
                                <li>• 图例筛选</li>
                                <li>• 数据缩放</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">📊 高级功能</h4>
                            <ul className="space-y-1 text-sm">
                                <li>• 实时数据更新</li>
                                <li>• 多维度联动</li>
                                <li>• 导出图片/数据</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">
                        💡 提示
                    </h3>
                    <p className="text-amber-800">
                        以上所有图表都是<strong>真实的 ECharts 组件</strong>，支持悬停、点击、缩放等交互。
                        当您提供真实数据后，我们可以将这些图表替换为您的实际业务数据，并添加"发现 → 决策 → 结果"的结论卡。
                    </p>
                </div>
            </div>
        </div>
    );
}
