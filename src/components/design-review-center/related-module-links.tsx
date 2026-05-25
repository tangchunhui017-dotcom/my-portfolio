'use client';

import type { DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';

interface Props {
  links: DesignPlanningRelatedModuleLink[];
}

export default function RelatedModuleLinksPanel({ links }: Props) {
  const internal = links.filter((l) => l.category === 'internal');
  const external = links.filter((l) => l.category === 'external');

  function LinkCard({ link }: { link: DesignPlanningRelatedModuleLink }) {
    return (
      <a
        href={link.relatedRoute}
        className={`flex flex-col gap-2 rounded-lg border p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
          link.category === 'internal'
            ? 'border-violet-100 bg-violet-50/50 hover:border-violet-200 hover:bg-violet-50'
            : 'border-sky-100 bg-sky-50/50 hover:border-sky-200 hover:bg-sky-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xl">{link.icon}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
              link.category === 'internal'
                ? 'bg-violet-100 text-violet-600'
                : 'bg-sky-100 text-sky-600'
            }`}
          >
            {link.category === 'internal' ? '内部' : '外部'}
          </span>
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-900">{link.label}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-4">{link.description}</div>
        </div>
        <div
          className={`mt-auto inline-flex items-center gap-1 text-xs font-semibold ${
            link.category === 'internal' ? 'text-violet-700' : 'text-sky-700'
          }`}
        >
          {link.actionLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
          Related Module Links
        </div>
        <h2 className="text-xl font-bold text-slate-900">跨模块入口</h2>
        <p className="mt-1 text-xs text-slate-400">
          设计企划内部子页 · 商品企划外部模块
        </p>
      </div>

      {/* Internal links */}
      {internal.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-violet-400">
            设计企划内部
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {internal.map((link) => (
              <LinkCard key={link.linkId} link={link} />
            ))}
          </div>
        </div>
      )}

      {/* External links */}
      {external.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-sky-400">
            商品企划外部
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {external.map((link) => (
              <LinkCard key={link.linkId} link={link} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
