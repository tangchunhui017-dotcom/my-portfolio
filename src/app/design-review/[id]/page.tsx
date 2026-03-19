import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadDesignReviewById } from '@/lib/openclaw/loader';
import { getDataSourceInfo, formatUpdateTime } from '@/lib/openclaw/helpers';
import {
  REVIEW_STATUSES, SAMPLE_STAGES, RISK_LEVELS,
  PRODUCT_ROLE_OPTIONS, OCCASION_TAGS,
} from '@/config/business-dictionaries';

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
    low: 'bg-emerald-400', medium: 'bg-amber-400', high: 'bg-red-400',
  };
  return map[level] ?? 'bg-slate-300';
}

function lookup(list: { id: string; label: string }[], id: string) {
  return list.find(i => i.id === id || i.id === id.toLowerCase())?.label ?? id;
}

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number) {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 60) return 'text-amber-700';
  return 'text-red-700';
}

const DIMENSION_LABELS: Record<string, string> = {
  last: '鞋楦 Last',
  upper: '帮面 Upper',
  outsole: '大底 Outsole',
  material: '材料 Material',
  bom: 'BOM 成本',
  mold_reuse: '模具复用 Mold Reuse',
};

/* ── sub-components ── */

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-sky-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-slate-700">{value || '-'}</dd>
    </div>
  );
}

function DimensionCard({ name, dim }: { name: string; dim: { score?: number; comment: string; risk?: string } }) {
  const score = dim.score ?? 0;
  return (
    <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700">{DIMENSION_LABELS[name] ?? name}</span>
        {dim.risk && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${riskDot(dim.risk)}`} />
            {lookup(RISK_LEVELS, dim.risk)}
          </span>
        )}
      </div>
      {dim.score != null && (
        <div className="mb-3">
          <div className="flex items-end justify-between mb-1">
            <span className={`text-2xl font-bold ${scoreTextColor(score)}`}>{score}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${scoreColor(score)}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500 leading-relaxed">{dim.comment}</p>
    </div>
  );
}

/* ── page ── */

export default async function DesignReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = loadDesignReviewById(id);
  if (!r) notFound();

  const srcInfo = getDataSourceInfo(r.agent);
  const dims = r.dimensions ? Object.entries(r.dimensions).filter(([, v]) => v != null) as [string, { score?: number; comment: string; risk?: string }][] : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl space-y-6">

        {/* Back link */}
        <Link href="/design-review" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          返回评审列表
        </Link>

        {/* 1. Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <span className="font-mono text-sm text-slate-400">{r.style_number}</span>
            <div className="flex flex-wrap gap-2">
              <Badge className={stageStyle(r.stage)}>{lookup(SAMPLE_STAGES, r.stage)}</Badge>
              <Badge className={conclusionStyle(r.conclusion)}>{lookup(REVIEW_STATUSES.map(s => ({ id: s.english, label: s.label })), r.conclusion)}</Badge>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2 h-2 rounded-full ${riskDot(r.risk_level)}`} />
                {lookup(RISK_LEVELS, r.risk_level)}
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{r.title}</h1>
          <p className="text-sm text-slate-500 mt-2">{r.summary}</p>
        </div>

        {/* 2. Basic Info */}
        <Section title="基础信息">
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <InfoItem label="季节 Season" value={r.season} />
            <InfoItem label="波段 Wave" value={r.wave} />
            <InfoItem label="品类 Category" value={r.category} />
            <InfoItem label="产品角色" value={r.product_role ? lookup(PRODUCT_ROLE_OPTIONS, r.product_role) : undefined} />
            <InfoItem label="场景标签" value={r.occasion_tag ? lookup(OCCASION_TAGS, r.occasion_tag) : undefined} />
            <InfoItem label="价格带" value={r.price_band} />
          </dl>
        </Section>

        {/* 3. Review Info */}
        <Section title="评审信息">
          <div className="flex flex-col sm:flex-row gap-6">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              <InfoItem label="阶段 Stage" value={<Badge className={stageStyle(r.stage)}>{lookup(SAMPLE_STAGES, r.stage)}</Badge>} />
              <InfoItem label="评审日期" value={r.review_date} />
              <InfoItem label="评审人" value={r.reviewer} />
              <InfoItem label="下次评审" value={r.next_review_date || '待定'} />
            </dl>
            <div className="flex flex-col items-center justify-center px-6 py-4 rounded-xl border border-slate-100 bg-slate-50/50 min-w-[140px]">
              <span className="text-xs text-slate-400 mb-1">评审结论</span>
              <span className={`text-lg font-bold px-4 py-1.5 rounded-full border ${conclusionStyle(r.conclusion)}`}>
                {lookup(REVIEW_STATUSES.map(s => ({ id: s.english, label: s.label })), r.conclusion)}
              </span>
            </div>
          </div>
        </Section>

        {/* 4. Dimensions */}
        {dims.length > 0 && (
          <Section title="专业维度评分">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dims.map(([key, dim]) => (
                <DimensionCard key={key} name={key} dim={dim} />
              ))}
            </div>
          </Section>
        )}

        {/* 5. Change Actions */}
        {r.change_actions && r.change_actions.length > 0 && (
          <Section title="修改动作">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">类型</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">详情</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500">负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {r.change_actions.map((a, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-medium">{a.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{a.detail}</td>
                      <td className="px-4 py-2.5 text-slate-500">{a.responsible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* 6. Version History */}
        {r.version_history && r.version_history.length > 0 && (
          <Section title="版本历史">
            <div className="relative flex gap-0 overflow-x-auto pb-2">
              {r.version_history.map((v, i) => (
                <div key={i} className="flex flex-col items-center min-w-[140px] flex-shrink-0 relative">
                  {/* connector line */}
                  {i < r.version_history!.length - 1 && (
                    <div className="absolute top-3 left-1/2 w-full h-0.5 bg-sky-200" />
                  )}
                  <div className="relative z-10 w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {i + 1}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 mt-2">{v.version}</span>
                  <span className="text-xs text-slate-400">{v.date}</span>
                  <span className="text-xs text-slate-500 text-center mt-1 px-2 leading-relaxed">{v.summary}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 7. Source Tracking */}
        <Section title="来源追溯">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem label="数据引擎" value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${srcInfo.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {srcInfo.label}
              </span>
            } />
            <InfoItem label="源文件" value={<span className="font-mono text-xs">{r.source_file}</span>} />
            <InfoItem label="更新时间" value={formatUpdateTime(r.updated_at)} />
            <InfoItem label="发布级别" value={r.publish_level} />
          </dl>
        </Section>

        {/* 8. Back link */}
        <div className="pt-2 pb-8">
          <Link href="/design-review" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            返回评审列表
          </Link>
        </div>

      </div>
    </div>
  );
}
