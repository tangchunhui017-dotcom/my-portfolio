import Link from 'next/link';

const mockCases = [
    {
        id: '2024-ss-core-running',
        title: '2024 SS 核心跑鞋系列',
        category: '跑鞋 Running',
        year: '2024',
        result: '售罄率 85-90%，毛利提升 5-8%',
        image: '/placeholder-case.jpg',
    },
    {
        id: '2023-fw-urban-outdoor',
        title: '2023 FW 城市轻户外',
        category: '户外鞋 Outdoor',
        year: '2023',
        result: 'GMV 增长 25-30%',
        image: '/placeholder-case.jpg',
    },
    // Add more placeholder cases as needed
];

export default function CaseStudiesPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="container mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">
                        Case Studies
                    </h1>
                    <p className="text-lg text-slate-600">
                        6-10 个深度案例，证明从洞察到复盘的商业闭环能力
                    </p>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-8">
                    <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">
                        全部 All
                    </button>
                    <button className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100">
                        跑鞋 Running
                    </button>
                    <button className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100">
                        户外 Outdoor
                    </button>
                    <button className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100">
                        休闲 Casual
                    </button>
                </div>

                {/* Case Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {mockCases.map((caseItem) => (
                        <Link
                            key={caseItem.id}
                            href={`/case-studies/${caseItem.id}`}
                            className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="aspect-video bg-slate-200 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                    案例图片占位
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="text-sm text-slate-500 mb-2">
                                    {caseItem.category} · {caseItem.year}
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-slate-700">
                                    {caseItem.title}
                                </h3>
                                <p className="text-sm text-emerald-600 font-medium">
                                    {caseItem.result}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Empty State for More Cases */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-lg overflow-hidden shadow-sm border-2 border-dashed border-slate-200"
                        >
                            <div className="aspect-video bg-slate-50 flex items-center justify-center">
                                <span className="text-slate-400">待添加案例 {i + 2}</span>
                            </div>
                            <div className="p-6">
                                <div className="h-4 bg-slate-100 rounded w-1/2 mb-3"></div>
                                <div className="h-6 bg-slate-100 rounded mb-3"></div>
                                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
