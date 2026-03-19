'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import factSales from '@/../data/dashboard/fact_sales.json';

type KpiState = {
  totalSales: number;
  avgSellThrough: number;
  avgMarginRate: number;
  activeSkus: number;
};

type Entry = {
  title: string;
  en: string;
  desc: string;
  href: string;
  gradient: string;
  tag: string;
};

type KpiMeta = {
  key: keyof KpiState | 'wave' | 'action';
  label: string;
  en: string;
  delta: string;
  up: boolean;
  format: (value: number) => string;
  static?: boolean;
};

function useLightKpis() {
  const [kpis, setKpis] = useState<KpiState>({
    totalSales: 0,
    avgSellThrough: 0,
    avgMarginRate: 0,
    activeSkus: 0,
  });

  useEffect(() => {
    const totalSales = factSales.reduce((sum, row) => sum + row.net_sales_amt, 0);
    const totalProfit = factSales.reduce((sum, row) => sum + row.gross_profit_amt, 0);
    const avgMarginRate = totalSales > 0 ? totalProfit / totalSales : 0;
    const skuLatest: Record<string, { st: number; week: number }> = {};

    factSales.forEach((row) => {
      if (!skuLatest[row.sku_id] || row.week_num > skuLatest[row.sku_id].week) {
        skuLatest[row.sku_id] = {
          st: row.cumulative_sell_through,
          week: row.week_num,
        };
      }
    });

    const sellThroughValues = Object.values(skuLatest).map((item) => item.st);
    const avgSellThrough = sellThroughValues.length
      ? sellThroughValues.reduce((sum, value) => sum + value, 0) / sellThroughValues.length
      : 0;

    setKpis({
      totalSales,
      avgSellThrough,
      avgMarginRate,
      activeSkus: sellThroughValues.length,
    });
  }, []);

  return kpis;
}

function formatSales(value: number) {
  if (value >= 1_000_000) return `CNY ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `CNY ${(value / 10_000).toFixed(0)}W`;
  return `CNY ${value.toLocaleString()}`;
}

const MAIN_ENTRIES: Entry[] = [
  {
    title: '\u4f01\u5212\u9a7e\u9a76\u8231',
    en: 'Dashboard',
    desc: 'OTB / KPI / Wave planning / Actions',
    href: '/dashboard',
    gradient: 'from-pink-500 to-rose-600',
    tag: '01',
  },
  {
    title: '\u8bbe\u8ba1\u4f01\u5212\u4e0e\u8bc4\u5ba1\u4e2d\u5fc3',
    en: 'Design Center',
    desc: 'Theme / Architecture / Review / Actions',
    href: '/design-review-center',
    gradient: 'from-sky-500 to-cyan-600',
    tag: '02',
  },
  {
    title: '\u6df1\u5ea6\u6848\u4f8b\u5e93',
    en: 'Case Studies',
    desc: 'Problem / Judgment / Action / Result',
    href: '/case-studies',
    gradient: 'from-violet-500 to-purple-600',
    tag: '03',
  },
  {
    title: '\u65b9\u6cd5\u8bba Playbook',
    en: 'Playbook',
    desc: 'SOP / Formula / Threshold / Templates',
    href: '/playbook',
    gradient: 'from-amber-500 to-orange-600',
    tag: '04',
  },
];

const KPI_META: KpiMeta[] = [
  {
    key: 'totalSales',
    label: '\u51c0\u9500\u552e\u989d',
    en: 'Net Sales',
    delta: '+12.5%',
    up: true,
    format: (value) => formatSales(value),
  },
  {
    key: 'avgSellThrough',
    label: '\u5e73\u5747\u552e\u7f44\u7387',
    en: 'Sell-through',
    delta: '+3.2pp',
    up: true,
    format: (value) => `${(value * 100).toFixed(1)}%`,
  },
  {
    key: 'avgMarginRate',
    label: '\u5e73\u5747\u6bdb\u5229\u7387',
    en: 'Margin Rate',
    delta: '-0.8pp',
    up: false,
    format: (value) => `${(value * 100).toFixed(1)}%`,
  },
  {
    key: 'activeSkus',
    label: '\u52a8\u9500 SKU \u6570',
    en: 'Active SKUs',
    delta: '+18',
    up: true,
    format: (value) => String(value),
  },
  {
    key: 'wave',
    label: '\u5f53\u524d\u6ce2\u6bb5',
    en: 'Current Wave',
    delta: 'W2',
    up: true,
    format: () => '2024SS / W2',
    static: true,
  },
  {
    key: 'action',
    label: '\u5f53\u524d\u91cd\u70b9\u52a8\u4f5c',
    en: 'Current Action',
    delta: '\u8865\u8d27',
    up: true,
    format: () => '\u8865\u8d27 + \u6837\u978b\u590d\u5ba1',
    static: true,
  },
];

const CAPABILITIES = [
  { zh: '\u5546\u54c1\u4f01\u5212', en: 'Merchandising' },
  { zh: 'OTB \u9884\u7b97', en: 'OTB Budget' },
  { zh: '\u6ce2\u6bb5\u89c4\u5212', en: 'Wave Planning' },
  { zh: '\u8bbe\u8ba1\u8bc4\u5ba1', en: 'Design Review' },
  { zh: '\u8d8b\u52bf\u8f6c\u8bd1', en: 'Trend Translation' },
  { zh: '\u4e0a\u5e02\u6267\u884c', en: 'Launch Execution' },
  { zh: '\u590d\u76d8\u4f18\u5316', en: 'Postmortem' },
] as const;

const AGENTS = [
  { id: 'planner', label: '\u4f01\u5212\u5f15\u64ce', status: 'active' },
  { id: 'design-review', label: '\u8bc4\u5ba1\u5f15\u64ce', status: 'active' },
  { id: 'research', label: '\u7814\u7a76\u5f15\u64ce', status: 'active' },
  { id: 'director', label: '\u51b3\u7b56\u5f15\u64ce', status: 'active' },
  { id: 'ops-merch', label: '\u8fd0\u8425\u5f15\u64ce', status: 'standby' },
] as const;

export default function HomePage() {
  const kpis = useLightKpis();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="relative overflow-hidden bg-white py-20">
        <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-1.5 text-sm text-pink-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
              <span className="inline-flex h-2 w-2 rounded-full bg-pink-500" />
            </span>
            {'\u978b\u5c65\u4ea7\u54c1\u4f01\u5212\u4e0e\u8bbe\u8ba1\u5e73\u53f0 / Powered by OpenClaw'}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Footwear Planning
            <br />
            <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              &amp; Design Platform
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-500">
            {'\u4ece\u8d8b\u52bf\u6d1e\u5bdf\u5230\u5546\u54c1\u4f01\u5212\uff0c\u4ece\u8bbe\u8ba1\u5f00\u53d1\u5230\u4e0a\u5e02\u590d\u76d8\uff0c\u6253\u9020\u9762\u5411\u978b\u7c7b\u4ea7\u54c1\u56e2\u961f\u7684\u5168\u94fe\u8def\u51b3\u7b56\u5e73\u53f0\u3002'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
              {'\u8fdb\u5165\u9a7e\u9a76\u8231 ->'}
            </Link>
            <Link href="/design-review-center" className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
              {'\u8bbe\u8ba1\u8bc4\u5ba1 ->'}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MAIN_ENTRIES.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${entry.gradient} p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div>
                <div className="mb-4 inline-flex rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">{entry.tag}</div>
                <h3 className="text-lg font-semibold">{entry.title}</h3>
                <p className="text-sm text-white/80">{entry.en}</p>
                <p className="mt-2 text-sm text-white/70">{entry.desc}</p>
              </div>
              <span className="mt-4 self-end text-white/60 transition group-hover:translate-x-1 group-hover:text-white">-&gt;</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{'\u7ecf\u8425\u6570\u636e\u603b\u89c8'}</h2>
              <p className="mt-1 text-sm text-slate-500">{'2024 \u6625\u5b63 / \u5168\u6e20\u9053 / \u8131\u654f\u6570\u636e'}</p>
            </div>
            <Link href="/dashboard" className="text-sm font-medium text-pink-600 hover:text-pink-700">
              {'\u67e5\u770b\u5b8c\u6574\u770b\u677f ->'}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {KPI_META.map((meta) => {
              const value = meta.static ? meta.format(0) : meta.format(kpis[meta.key as keyof KpiState] ?? 0);
              return (
                <div key={meta.key} className="relative rounded-xl bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ${meta.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {meta.delta}
                  </span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{meta.label}</p>
                  <p className="text-xs text-slate-400">{meta.en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{'\u5e73\u53f0\u80fd\u529b\u5730\u56fe'}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Capability Map</span>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {CAPABILITIES.map((item) => (
            <div key={item.en} className="flex flex-col items-center gap-2 rounded-xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm font-semibold text-slate-800">{item.zh}</p>
              <p className="text-xs text-slate-400">{item.en}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/60 p-8">
            <h2 className="text-xl font-bold text-slate-900">OpenClaw Agent System</h2>
            <p className="mt-1 text-sm text-slate-500">{'\u6570\u636e\u6765\u6e90\u4e0e\u7cfb\u7edf\u8054\u52a8'}</p>
            <div className="mt-6 flex flex-wrap gap-4">
              {AGENTS.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 shadow-sm">
                  <span className={`h-2 w-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  <span className="text-sm font-medium text-slate-700">{agent.id}</span>
                  <span className="text-xs text-slate-400">{agent.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-xs text-slate-400">
              <span>{'\u6570\u636e\u66f4\u65b0\u65f6\u95f4\uff1a2024-03-15 08:30'}</span>
              <span>{'\u53d1\u5e03\u7b49\u7ea7\uff1adashboard'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-900 py-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pink-900/20 to-indigo-900/20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">{'\u4ece\u6d1e\u5bdf\u5230\u590d\u76d8\uff0c\u5b8c\u6574\u7684\u4e1a\u52a1\u5224\u65ad\u94fe'}</h2>
          <p className="mt-3 text-sm text-slate-400">
            {'\u8d8b\u52bf\u8fc7\u6ee4 -> \u6ce2\u6bb5\u77e9\u9635 -> OTB \u63a8\u6f14 -> \u8bbe\u8ba1\u7b80\u62a5 -> \u8bc4\u5ba1\u95ed\u73af -> \u4e0a\u5e02\u590d\u76d8'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/case-studies" className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100">
              {'\u67e5\u770b\u6848\u4f8b Case Studies'}
            </Link>
            <Link href="/about" className="rounded-lg border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white">
              {'\u5173\u4e8e\u5e73\u53f0 About'}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}