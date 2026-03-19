import Link from 'next/link';
import { loadDesignReviews } from '@/lib/openclaw/loader';
import { getDataSourceInfo, formatUpdateTime, sortByUpdatedAt } from '@/lib/openclaw/helpers';
import { REVIEW_STATUSES, SAMPLE_STAGES, RISK_LEVELS } from '@/config/business-dictionaries';
import type { DesignReviewRecord } from '@/lib/openclaw/schema';

/* ── helpers ── */

function conclusionStyle(c: string) {
  const map: Record<string, string> = {
    Pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Review: 'bg-amber-50 text-amber-700 border-amber-200',
    Revise: 'bg-blue-50 text-blue-700 border-blue-200',
    Fail: 'bg-red-50 text-red-700 border-red-200',
  };
  return map[c] ?? 'bg-slate-50 text-slate-600 border-slate-200';
}

function stageStyle(s: string) {
  const map: Record<string, string> = {
    Proto: 'bg-sky-50 text-sky-700 border-sky-200',
    SMS: 'bg-violet-50 text-violet-700 border-violet-200',
    PP: 'bg-amber-50 text-amber-700 border-amber-200',
    TOP: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return map[s] ?? 'bg-slate-50 text-slate-600 border-slate-200';
}

function riskDot(level: string) {
  const map: Record<string, string> = {
    low: 'bg-emerald-400',
    medium: 'bg-amber-400',
    high: 'bg-red-400',
  };
  return map[level] ?? 'bg-slate-300';
}

function riskLabel(level: string) {
  return RISK_LEVELS.find(r => r.id === level)?.label ?? level;
}

function stageLabel(stage: string) {
  return SAMPLE_STAGES.find(s => s.id === stage.toLowerCase())?.label ?? stage;
}

function conclusionLabel(c: string) {
  return REVIEW_STATUSES.find(s => s.english === c)?.label ?? c;
}

/* ── sub-components ── */

function DataSourceBadge({ agent, updatedAt }: { agent: string; updatedAt: string }) {
  const info = getDataSourceInfo(agent);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${info.color}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {info.label}
      </span>
      <span className="text-slate-400">
        更新于 {formatUpdateTime(updatedAt)}
      </span>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {children}
    </span>
  );
}

function RiskIndicator({ level }: { level: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className={`w-2 h-2 rounded-full ${riskDot(level)}`} />
      {riskLabel(level)}
    </span>
  );
}

/* ── card for mobile ── */

function ReviewCard({ r }: { r: DesignReviewRecord }) {
  return (
    <Link
      href={`/design-review/${r.id}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-sky-200 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-mono text-slate-400">{r.style_number}</span>
          <h3 className="text-base font-semibold text-slate-800 mt-0.5">{r.title}</h3>
        </div>
        <Badge className={conclusionStyle(r.conclusion)}>{conclusionLabel(r.conclusion)}</Badge>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {r.series && <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{r.series}</span>}
        <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{r.wave}</span>
        {r.category && <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{r.category}</span>}
      </div>
      <div className="flex items-center gap-3 text-xs">
        <Badge className={stageStyle(r.stage)}>{stageLabel(r.stage)}</Badge>
        <RiskIndicator level={r.risk_level} />
        <span className="ml-auto text-slate-400">{formatUpdateTime(r.updated_at)}</span>
      </div>
    </Link>
  );
}

/* ── page ── */

export default function DesignReviewListPage() {
  const reviews = sortByUpdatedAt(loadDesignReviews());
  const latestUpdate = reviews[0]?.updated_at ?? '';
  const agent = reviews[0]?.agent ?? 'design-review';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            设计评审中心
            <span className="text-lg font-normal text-slate-400 ml-3">Design Review Center</span>
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            样鞋评审 · 维度打分 · 修改追踪 · 来源追溯
          </p>
          {latestUpdate && <DataSourceBadge agent={agent} updatedAt={latestUpdate} />}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-4">
          {reviews.map(r => <ReviewCard key={r.id} r={r} />)}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">款号</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">名称</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">系列</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">波段</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">品类</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">阶段</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">结论</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">风险</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-sky-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/design-review/${r.id}`} className="font-mono text-sky-600 hover:text-sky-800 hover:underline">
                        {r.style_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      <Link href={`/design-review/${r.id}`} className="hover:text-sky-700">{r.title}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{r.series ?? '-'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.wave}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.category ?? '-'}</td>
                    <td className="px-5 py-3.5"><Badge className={stageStyle(r.stage)}>{stageLabel(r.stage)}</Badge></td>
                    <td className="px-5 py-3.5"><Badge className={conclusionStyle(r.conclusion)}>{conclusionLabel(r.conclusion)}</Badge></td>
                    <td className="px-5 py-3.5"><RiskIndicator level={r.risk_level} /></td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{formatUpdateTime(r.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {reviews.length === 0 && (
          <div className="text-center py-20 text-slate-400">暂无评审记录</div>
        )}
      </div>
    </div>
  );
}
