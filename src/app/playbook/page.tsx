export default function PlaybookPage() {
    const resources = [
        {
            category: '企划模板',
            items: [
                { name: 'Range Plan 模板', description: 'SKU × 价格带 × 渠道规划表' },
                { name: '季节波段计划', description: '上市节奏与补货逻辑' },
                { name: 'OTB 预算表', description: '采购预算测算工具' },
            ],
        },
        {
            category: '评审机制',
            items: [
                { name: '设计评审 Checklist', description: '从草图到 Tech Pack 的关键节点' },
                { name: '成本评审标准', description: 'FOB 成本控制与优化路径' },
                { name: '风险评估框架', description: '供应链与市场风险识别' },
            ],
        },
        {
            category: '方法论文档',
            items: [
                { name: 'STEPIC 趋势分析框架', description: '宏观驱动到商品化的转化逻辑' },
                { name: 'SKU 理性化精简', description: '长尾削减与效率优化' },
                { name: 'GTM 战役策划', description: '上市节奏与营销物料协同' },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="container mx-auto px-6 py-12 max-w-5xl">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">
                        Playbook
                    </h1>
                    <p className="text-lg text-slate-600">
                        方法论与资产 - 可下载的模板、评审机制、指标口径
                    </p>
                </div>

                {/* Resources */}
                <div className="space-y-12">
                    {resources.map((section) => (
                        <div key={section.category}>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">
                                {section.category}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {section.items.map((item) => (
                                    <div
                                        key={item.name}
                                        className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                            {item.name}
                                        </h3>
                                        <p className="text-sm text-slate-600 mb-4">
                                            {item.description}
                                        </p>
                                        <button className="text-sm font-medium text-slate-900 hover:text-slate-700 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            下载模板
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Note */}
                <div className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                        📚 资产化说明
                    </h3>
                    <p className="text-green-800">
                        这些模板和文档是从实际项目中提炼的可复用资产，体现了"总监级"的组织管理能力。
                        您可以将真实的模板文件（Excel/PDF）放入 <code className="bg-green-100 px-2 py-1 rounded">public/downloads</code> 文件夹，然后更新下载链接。
                    </p>
                </div>
            </div>
        </div>
    );
}
