'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import factSales from '@/../data/dashboard/fact_sales.json';

// 首页轻总览：从真实模拟数据计算
function useLightKpis() {
  const [kpis, setKpis] = useState({
    totalSales: 0,
    avgSellThrough: 0,
    avgMarginRate: 0,
    activeSKUs: 0,
  });

  useEffect(() => {
    const totalSales = factSales.reduce((s, r) => s + r.net_sales_amt, 0);
    const totalProfit = factSales.reduce((s, r) => s + r.gross_profit_amt, 0);
    const avgMarginRate = totalSales > 0 ? totalProfit / totalSales : 0;

    // 各SKU最新周售罄率均值
    const skuLatest: Record<string, { st: number; week: number }> = {};
    factSales.forEach(r => {
      if (!skuLatest[r.sku_id] || r.week_num > skuLatest[r.sku_id].week) {
        skuLatest[r.sku_id] = { st: r.cumulative_sell_through, week: r.week_num };
      }
    });
    const stVals = Object.values(skuLatest).map(v => v.st);
    const avgSellThrough = stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : 0;
    const activeSKUs = stVals.length;

    setKpis({ totalSales, avgSellThrough, avgMarginRate, activeSKUs });
  }, []);

  return kpis;
}

const CAPABILITIES = [
  {
    icon: '📊',
    label: '商品企划',
    en: 'Merchandising',
    desc: 'OTB 测算 · SKU 金字塔 · 价格带布局',
  },
  {
    icon: '🔍',
    label: '趋势研判',
    en: 'Trend Forecasting',
    desc: 'WGSN 方法论 · 宏观驱动 → 商品化',
  },
  {
    icon: '🎨',
    label: '设计开发',
    en: 'Product Creation',
    desc: '设计验证 · 供应链协同 · 可制造性',
  },
  {
    icon: '📈',
    label: '数据复盘',
    en: 'Data Analytics',
    desc: '售罄分析 · 渠道效率 · 动作清单',
  },
];

export default function Home() {
  const kpis = useLightKpis();

  function fmtSales(n: number) {
    if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `¥${(n / 10_000).toFixed(0)}万`;
    return `¥${n.toLocaleString()}`;
  }

  const LIGHT_KPIS = [
    {
      label: '季度净销售额',
      value: fmtSales(kpis.totalSales),
      delta: '+12.3%',
      positive: true,
      href: '/dashboard',
      icon: '💰',
    },
    {
      label: '平均售罄率',
      value: `${(kpis.avgSellThrough * 100).toFixed(1)}%`,
      delta: '+3.1pp',
      positive: true,
      href: '/dashboard',
      icon: '📦',
    },
    {
      label: '平均毛利率',
      value: `${(kpis.avgMarginRate * 100).toFixed(1)}%`,
      delta: '+1.2pp',
      positive: true,
      href: '/dashboard',
      icon: '📈',
    },
    {
      label: '动销 SKU 数',
      value: `${kpis.activeSKUs} 款`,
      delta: '全部动销',
      positive: true,
      href: '/dashboard',
      icon: '✅',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* Hero */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            鞋类企划设计总监 · Footwear Planning Director
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Design Strategy<br />
            <span className="text-blue-600">&amp; Business Growth</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl">
            从趋势洞察到商品企划，从设计开发到上市复盘 ——<br />
            打造商业闭环的全链路操盘手
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/case-studies"
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors"
            >
              查看案例 →
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-slate-400 transition-colors"
            >
              数据看板 →
            </Link>
          </div>
        </div>
      </section>

      {/* Light KPI Overview */}
      <section className="container mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">经营数据概览</h2>
            <p className="text-sm text-slate-400 mt-0.5">2024 春季 · 全渠道 · 脱敏数据</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
          >
            查看完整看板 →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LIGHT_KPIS.map(kpi => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{kpi.icon}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${kpi.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                  {kpi.positive ? '▲' : '▼'} {kpi.delta}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</div>
              <div className="text-xs text-slate-400">{kpi.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="container mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">核心能力</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {CAPABILITIES.map(cap => (
            <div
              key={cap.label}
              className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="text-3xl mb-4">{cap.icon}</div>
              <div className="font-bold text-slate-900 mb-0.5">{cap.label}</div>
              <div className="text-xs text-slate-400 mb-3">{cap.en}</div>
              <div className="text-sm text-slate-600 leading-relaxed">{cap.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-12">
        <div className="bg-slate-900 text-white rounded-2xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-transparent pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl font-bold mb-4">6-10 个深度案例，证明闭环能力</h2>
            <p className="text-slate-300 mb-8 text-lg">洞察 → 策略 → 设计 → 开发 → 上市 → 复盘</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/case-studies"
                className="bg-white text-slate-900 px-8 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
              >
                查看案例 View Case Studies
              </Link>
              <Link
                href="/about"
                className="border border-white/30 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                关于我 About
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
