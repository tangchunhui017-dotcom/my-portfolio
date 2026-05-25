'use client';

import type { ThemeSeriesRelatedModuleLink } from '@/lib/design-review-center/types';

interface ThemeRelatedLinksProps {
  links: ThemeSeriesRelatedModuleLink[];
}

export default function ThemeRelatedLinks({ links }: ThemeRelatedLinksProps) {
  const internal = links.filter((l) => l.category === 'internal');
  const external = links.filter((l) => l.category === 'external');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">跨模块关联入口</div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">关联模块 · 快速跳转 · 生成动作</h3>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* Internal Links */}
        <div className="p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            设计企划内部模块
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {internal.map((link) => (
              <a
                key={link.linkId}
                href={link.relatedRoute}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm transition-all"
              >
                <span className="text-xl flex-shrink-0">{link.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{link.label}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{link.description}</div>
                </div>
                <svg className="h-4 w-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* External / Merch Links */}
        <div className="p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            商品企划输入来源
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {external.map((link) => (
              <a
                key={link.linkId}
                href={link.relatedRoute}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-sm transition-all"
              >
                <span className="text-xl flex-shrink-0">{link.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{link.label}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{link.description}</div>
                </div>
                <svg className="h-4 w-4 text-slate-300 group-hover:text-violet-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
