'use client';

import type { ProductArchitectureRelatedModuleLink } from '@/lib/design-review-center/types';

interface Props {
  links: ProductArchitectureRelatedModuleLink[];
  onInternalNavigate?: (tab: string, queryParams?: Record<string, string>) => void;
}

export default function ArchRelatedLinks({ links, onInternalNavigate }: Props) {
  const internal = links.filter((l) => l.category === 'internal');
  const external = links.filter((l) => l.category === 'external');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MODULE 12</span>
          <h3 className="text-base font-semibold text-slate-900">跨模块入口</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">快速跳转至设计企划内部模块或商品企划相关输入页面</p>
      </div>

      <div className="p-6 grid gap-6 md:grid-cols-2">
        {/* Internal links */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">设计企划内部模块</p>
          <div className="space-y-2">
            {internal.map((link) => (
              <LinkRow
                key={link.linkId}
                link={link}
                onNavigate={
                  onInternalNavigate
                    ? () => onInternalNavigate(link.jumpAction, link.queryParams)
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* External links */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">商品企划外部输入</p>
          <div className="space-y-2">
            {external.map((link) => (
              <LinkRow key={link.linkId} link={link} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  link,
  onNavigate,
}: {
  link: ProductArchitectureRelatedModuleLink;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{link.label}</p>
        <p className="text-xs text-slate-500 truncate">{link.description}</p>
      </div>
      {onNavigate ? (
        <button
          onClick={onNavigate}
          className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          {link.actionLabel}
        </button>
      ) : (
        <a
          href={typeof link.jumpAction === 'string' && link.jumpAction.startsWith('/') ? link.jumpAction : '#'}
          className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.actionLabel}
        </a>
      )}
    </div>
  );
}
