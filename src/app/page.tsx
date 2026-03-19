'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import factSales from '@/../data/dashboard/fact_sales.json';

/* ── lightweight KPI hook ── */
function useLightKpis() {
  const [kpis, setKpis] = useState({ totalSales: 0, avgSellThrough: 0, avgMarginRate: 0, activeSKUs: 0 });
  useEffect(() => {
    const totalSales = factSales.reduce((s, r) => s + r.net_sales_amt, 0);
    const totalProfit = factSales.reduce((s, r) => s + r.gross_profit_amt, 0);
    const avgMarginRate = totalSales > 0 ? totalProfit / totalSales : 0;
    const skuLatest: Record<string, { st: number; week: number }> = {};
    factSales.forEach(r => {
      if (!skuLatest[r.sku_id] || r.week_num > skuLatest[r.sku_id].week)
        skuLatest[r.sku_id] = { st: r.cumulative_sell_through, week: r.week_num };
    });
    const stVals = Object.values(skuLatest).map(v => v.st);
    const avgSellThrough = stVals.length ? stVals.reduce((a, b) => a + b, 0) / stVals.length : 0;
    setKpis({ totalSales, avgSellThrough, avgMarginRate, activeSKUs: stVals.length });
  }, []);
  return kpis;
}

function fmtSales(n: number) {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(0)}万`;
  return `¥${n.toLocaleString()}`;
}

/* ── data arrays ── */
const MAIN_ENTRIES = [
  { title: '企划驾驶舱', en: 'Dashboard', desc: 'OTB · 波段 · KPI · 决策建议', href: '/dashboard', gradient: 'from-pink-500 to-rose-600',
    icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg> },
  { title: '设计评审中心', en: 'Design Review', desc: '样鞋评审 · 维度打分 · 修改追踪', href: '/design-review', gradient: 'from-sky-500 to-cyan-600',
    icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg> },
  { title: '深度案例库', en: 'Case Studies', desc: '问题 → 判断 → 动作 → 结果', href: '/case-studies', gradient: 'from-violet-500 to-purple-600',
    icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
  { title: '方法论 Playbook', en: 'Playbook', desc: 'SOP · 阈值 · 公式 · 模板', href: '/playbook', gradient: 'from-amber-500 to-orange-600',
    icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg> },
];

const KPI_META: { key: string; label: string; en: string; delta: string; up: boolean; fmt: (v: number) => string; static?: boolean }[] = [
  { key: 'totalSales', label: '季度净销售额', en: 'Net Sales', delta: '+12.5%', up: true, fmt: (v) => fmtSales(v) },
  { key: 'avgSellThrough', label: '平均售罄率', en: 'Sell-through', delta: '+3.2pp', up: true, fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: 'avgMarginRate', label: '平均毛利率', en: 'Margin Rate', delta: '-0.8pp', up: false, fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: 'activeSKUs', label: '动销 SKU', en: 'Active SKUs', delta: '+18', up: true, fmt: (v) => String(v) },
  { key: 'wave', label: '当前波段', en: 'Current Wave', delta: 'W2', up: true, fmt: () => 'W2', static: true },
  { key: 'action', label: '重点动作', en: 'Key Action', delta: '补货', up: true, fmt: () => '补货', static: true },
];

const CAPABILITIES = [
  { zh: '商品企划', en: 'Merchandising', icon: '📋' },
  { zh: 'OTB预算', en: 'OTB Budget', icon: '💰' },
  { zh: '波段规划', en: 'Wave Planning', icon: '🌊' },
  { zh: '设计评审', en: 'Design Review', icon: '✏️' },
  { zh: '趋势转译', en: 'Trend Translation', icon: '🔍' },
  { zh: '上市执行', en: 'Launch Execution', icon: '🚀' },
  { zh: '复盘优化', en: 'Postmortem', icon: '📊' },
];

const AGENTS = [
  { id: 'planner', label: '企划引擎', status: 'active' },
  { id: 'design-review', label: '评审引擎', status: 'active' },
  { id: 'research', label: '研究引擎', status: 'active' },
  { id: 'director', label: '决策引擎', status: 'active' },
  { id: 'ops-merch', label: '运营引擎', status: 'standby' },
] as const;

/* ── Page Component ── */
export default function HomePage() {
  const kpis = useLightKpis();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white py-20">
        <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-1.5 text-sm text-pink-700">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" /><span className="inline-flex h-2 w-2 rounded-full bg-pink-500" /></span>
            鞋履产品企划与设计平台 · Powered by OpenClaw
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Footwear Planning<br />
            <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">&amp; Design Platform</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
            从趋势洞察到商品企划，从设计开发到上市复盘 —— 打造商业闭环的全链路决策平台
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">进入驾驶舱 →</Link>
            <Link href="/design-review" className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">设计评审 →</Link>
          </div>
        </div>
      </section>

      {/* ── Main Entry Cards ── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MAIN_ENTRIES.map(c => (
            <Link key={c.href} href={c.href} className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
              <div>
                <div className="mb-4 inline-flex rounded-xl bg-white/20 p-2.5">{c.icon}</div>
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-white/80">{c.en}</p>
                <p className="mt-2 text-sm text-white/70">{c.desc}</p>
              </div>
              <span className="mt-4 self-end text-white/60 transition group-hover:translate-x-1 group-hover:text-white">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Core KPI ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">经营数据概览</h2>
              <p className="mt-1 text-sm text-slate-500">2024 春季 · 全渠道 · 脱敏数据</p>
            </div>
            <Link href="/dashboard" className="text-sm font-medium text-pink-600 hover:text-pink-700">查看完整看板 →</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {KPI_META.map(m => {
              const val = m.static ? m.fmt(0) : m.fmt((kpis as Record<string, number>)[m.key] ?? 0);
              return (
                <div key={m.key} className="relative rounded-xl bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ${m.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{m.delta}</span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{val}</p>
                  <p className="mt-1 text-xs text-slate-500">{m.label}</p>
                  <p className="text-xs text-slate-400">{m.en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Capability Map ── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">平台能力地图</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Capability Map</span>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {CAPABILITIES.map(c => (
            <div key={c.en} className="flex flex-col items-center gap-2 rounded-xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="text-2xl">{c.icon}</span>
              <p className="text-sm font-semibold text-slate-800">{c.zh}</p>
              <p className="text-xs text-slate-400">{c.en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── OpenClaw Integration ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/60 p-8">
            <h2 className="text-xl font-bold text-slate-900">OpenClaw Agent System</h2>
            <p className="mt-1 text-sm text-slate-500">数据来源与系统联动</p>
            <div className="mt-6 flex flex-wrap gap-4">
              {AGENTS.map(a => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 shadow-sm">
                  <span className={`h-2 w-2 rounded-full ${a.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  <span className="text-sm font-medium text-slate-700">{a.id}</span>
                  <span className="text-xs text-slate-400">{a.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-xs text-slate-400">
              <span>数据更新时间：2024-03-15 08:30</span>
              <span>发布等级：dashboard</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative bg-slate-900 py-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pink-900/20 to-indigo-900/20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">从洞察到复盘，完整的业务判断链</h2>
          <p className="mt-3 text-sm text-slate-400">趋势过滤 → 波段矩阵 → OTB 推演 → 设计简报 → 评审闭环 → 上市复盘</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/case-studies" className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100">查看案例 Case Studies</Link>
            <Link href="/about" className="rounded-lg border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white">关于平台 About</Link>
          </div>
        </div>
      </section>
    </main>
  );
}