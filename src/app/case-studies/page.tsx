import Link from 'next/link';
import { loadCaseStudies } from '@/lib/openclaw/loader';
import { getDataSourceInfo, sortByUpdatedAt, formatUpdateTime } from '@/lib/openclaw/helpers';
import type { CaseStudyRecord } from '@/lib/openclaw/schema';

/* ── PJAR flow steps ── */
const PJAR_STEPS = [
  { key: 'problem', label: '发现', en: 'Problem', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'judgement', label: '判断', en: 'Judgement', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'action', label: '动作', en: 'Action', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'result', label: '结果', en: 'Result', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
] as const;

/* ── metric formatting ── */
function fmtMetric(key: string, val: unknown): string {
  if (typeof val === 'number') {
    if (key.includes('rate') || key.includes('through') || key.includes('reuse')) return `${(val * 100).toFixed(0)}%`;
    if (val >= 10000) return `${(val / 10000).toFixed(0)}万`;
    return String(val);
  }
  return String(val ?? '-');
}

const METRIC_LABELS: Record<string, string> = {
  sell_through: '售罄率',
  margin_rate: '毛利率',
  avg_revision_rounds: '平均修改轮次',
  mold_reuse_rate: '模具复用率',
  category_rank: '品类排名',
  brand_search_index: '品牌搜索指数',
};

function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key;
}

/* ── Case Card ── */
function CaseCard({ c }: { c: CaseStudyRecord }) {
  const agent = getDataSourceInfo(c.agent);
  const before = c.data_results?.before ?? {};
  const after = c.data_results?.after ?? {};
  const metricKeys = Object.keys(before);

  return (
    <Link
      href={`/case-studies/${c.id}`}
      className="group flex flex-col rounded-xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* header band */}
      <div className="flex items-center justify-between gap-3 rounded-t-xl bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${agent.color}`}>{agent.label}</span>
          {c.case_type && <span className="text-xs text-slate-400">{c.case_type}</span>}
        </div>
        <span className="text-xs text-slate-400">{c.season} · {c.wave}</span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">{c.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-3">{c.summary}</p>
        </div>

        {/* PJAR mini flow */}
        <div className="flex items-center gap-1">
          {PJAR_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-1">
              <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${step.color}`}>{step.label}</span>
              {i < PJAR_STEPS.length - 1 && <span className="text-slate-300 text-xs">→</span>}
            </div>
          ))}
        </div>

        {/* before / after metrics */}
        {metricKeys.length > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-400 mb-1">Before</p>
              {metricKeys.map(k => (
                <div key={k} className="flex items-center justify-between text-xs px-1 py-0.5">
                  <span className="text-slate-500">{metricLabel(k)}</span>
                  <span className="font-medium text-slate-600">{fmtMetric(k, before[k])}</span>
                </div>
              ))}
            </div>
            <div className="text-center border-l border-slate-200 pl-3">
              <p className="text-xs font-medium text-emerald-500 mb-1">After</p>
              {metricKeys.map(k => (
                <div key={k} className="flex items-center justify-between text-xs px-1 py-0.5">
                  <span className="text-slate-500">{metricLabel(k)}</span>
                  <span className="font-semibold text-emerald-600">{fmtMetric(k, after[k])}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        <span>{c.category} · {c.owner}</span>
        <span className="text-violet-500 font-medium group-hover:translate-x-0.5 transition-transform">查看详情 →</span>
      </div>
    </Link>
  );
}

/* ── Page ── */
export default function CaseStudiesPage() {
  const cases = sortByUpdatedAt(loadCaseStudies());

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -top-24 right-1/4 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-purple-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition mb-6">
            &larr; 返回首页
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600 mb-3">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" /><span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" /></span>
                深度案例库 Case Studies
              </span>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                问题 &rarr; 判断 &rarr; 动作 &rarr; 结果
              </h1>
              <p className="mt-2 text-base text-slate-500 max-w-xl">
                从洞察到复盘的商业闭环能力，每个案例完整呈现发现问题、形成判断、采取行动、验证结果的决策链路
              </p>
            </div>
            <div className="text-xs text-slate-400">
              共 {cases.length} 个案例
              {cases.length > 0 && <> &middot; 最近更新 {formatUpdateTime(cases[0].updated_at)}</>}
            </div>
          </div>

          {/* PJAR flow banner */}
          <div className="mt-8 flex flex-wrap items-center gap-2 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/60 to-purple-50/60 px-5 py-3">
            {PJAR_STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${step.color}`}>
                  <span className="text-sm font-semibold">{step.label}</span>
                  <span className="text-xs opacity-70">{step.en}</span>
                </div>
                {i < PJAR_STEPS.length - 1 && (
                  <svg className="h-4 w-4 text-violet-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Grid */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        {cases.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-400">暂无案例数据</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cases.map(c => <CaseCard key={c.id} c={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}