export default function GalleryPage() {
    const categories = [
        { name: '2024 春夏', count: 24 },
        { name: '2023 秋冬', count: 32 },
        { name: '跑鞋系列', count: 18 },
        { name: '户外系列', count: 15 },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="container mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">
                        Gallery
                    </h1>
                    <p className="text-lg text-slate-600">
                        视觉资产库 - 按季节/工艺/材料自动组织
                    </p>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat.name}
                            className="bg-white rounded-lg p-6 text-center hover:shadow-md transition-shadow"
                        >
                            <div className="text-2xl font-bold text-slate-900 mb-2">
                                {cat.count}
                            </div>
                            <div className="text-sm text-slate-600">{cat.name}</div>
                        </button>
                    ))}
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                <span className="text-slate-400">图片 {i + 1}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Auto-Gallery Note */}
                <div className="mt-12 bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">
                        🖼️ 自动画廊功能
                    </h3>
                    <p className="text-amber-800 mb-2">
                        将图片放入 <code className="bg-amber-100 px-2 py-1 rounded">public/gallery/[folder-name]</code> 文件夹，系统将自动生成画廊。
                    </p>
                    <p className="text-sm text-amber-700">
                        支持的功能：瀑布流布局、灯箱预览、构建期图片优化（WebP/AVIF）、按文件夹分类。
                    </p>
                </div>
            </div>
        </div>
    );
}
