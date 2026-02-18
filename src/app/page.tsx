import MetricCard from '@/components/blocks/MetricCard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Design Strategy &amp; Business Growth
          </h1>
          <p className="text-xl text-slate-600 mb-4">
            鞋类企划设计总监 | Footwear Design &amp; Product Planning Director
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            从趋势洞察到商品企划，从设计开发到上市复盘 —— 打造商业闭环的全链路操盘手
          </p>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="container mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">核心能力</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            label="Trend Forecasting"
            value="趋势转化"
            description="Not just distinct style, but sellable trend"
          />
          <MetricCard
            label="Merchandising"
            value="组货逻辑"
            description="价格带布局与 SKU 金字塔"
          />
          <MetricCard
            label="Product Creation"
            value="开发协同"
            description="设计落地与供应链管理"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-12">
        <div className="bg-slate-900 text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">
            6-10 个深度案例，证明闭环能力
          </h2>
          <p className="text-slate-300 mb-6">
            洞察 → 策略 → 设计 → 开发 → 上市 → 复盘
          </p>
          <button className="bg-white text-slate-900 px-8 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
            查看案例 View Case Studies
          </button>
        </div>
      </section>
    </div>
  );
}
