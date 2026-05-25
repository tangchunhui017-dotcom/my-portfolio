'use client';

import { useEffect, useState } from 'react';
import type { DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';

interface Props {
  moduleLinks?: DesignPlanningRelatedModuleLink[];
  pageSections?: { anchor: string; label: string; icon?: React.ReactNode }[];
}

const PAGE_SECTIONS = [
  {
    anchor: '#section-status',
    label: '状态感知',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" />
        <rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.7" />
        <rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    anchor: '#section-market',
    label: '市场方向',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="8" cy="8" r="7" />
        <circle cx="8" cy="8" r="3.5" />
        <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    anchor: '#section-product',
    label: '产品结构',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    anchor: '#section-dev',
    label: '开发链路',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 1.5 14.5 5.5l-8 8-4 .5.5-4 8-8z" />
        <path d="M8.5 3.5l4 4" />
      </svg>
    ),
  },
  {
    anchor: '#section-finance',
    label: '财务健康',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1,12 4.5,8 7.5,10 11,5 15,7" />
        <polyline points="11,5 15,5 15,9" />
      </svg>
    ),
  },
  {
    anchor: '#section-risk',
    label: '进度风险',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5 14.5 13.5H1.5L8 1.5z" />
        <line x1="8" y1="6" x2="8" y2="9.5" />
        <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const IconInternal = (
  <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 flex-shrink-0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="12" height="12" rx="2" />
    <line x1="1" y1="4.5" x2="13" y2="4.5" />
    <line x1="4.5" y1="1" x2="4.5" y2="4.5" />
  </svg>
);

const IconExternal = (
  <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 flex-shrink-0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8" />
    <polyline points="9,1 13,1 13,5" />
    <line x1="13" y1="1" x2="6" y2="8" />
  </svg>
);

export default function FloatingModuleNav({ moduleLinks = [], pageSections }: Props) {
  const [hovered, setHovered] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  const sections = pageSections ?? PAGE_SECTIONS;
  const internal = moduleLinks.filter((l) => l.category === 'internal');
  const external = moduleLinks.filter((l) => l.category === 'external');

  // Scroll spy — 监听各 section 进入视口，高亮对应导航
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targets = sections
      .map((s) => ({ anchor: s.anchor, el: document.querySelector(s.anchor) }))
      .filter((t): t is { anchor: string; el: Element } => t.el !== null);
    if (targets.length === 0) return;

    const visibilityMap = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visibilityMap.set(e.target, e.intersectionRatio);
        });
        let bestAnchor: string | null = null;
        let bestTop = Infinity;
        targets.forEach((t) => {
          const ratio = visibilityMap.get(t.el) ?? 0;
          if (ratio > 0.05) {
            const top = t.el.getBoundingClientRect().top;
            if (top < bestTop) {
              bestTop = top;
              bestAnchor = t.anchor;
            }
          }
        });
        setActiveAnchor(bestAnchor);
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] }
    );

    targets.forEach((t) => observer.observe(t.el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setLinksOpen(false); }}
    >
      {/* ── In-page section anchors ── */}
      {sections.map((s) => {
        const isActive = activeAnchor === s.anchor;
        return (
          <a
            key={s.anchor}
            href={s.anchor}
            className={`flex h-5 items-center overflow-hidden rounded-l-full rounded-r-none border border-r-0 shadow-sm transition-all ${
              isActive
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                : 'bg-white/95 border-slate-200 text-slate-500 hover:bg-white hover:shadow-md hover:text-slate-800 hover:border-slate-300'
            }`}
            title={s.label}
          >
            {'icon' in s && (
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {(s as typeof PAGE_SECTIONS[number]).icon}
              </span>
            )}
            <span
              className={`whitespace-nowrap overflow-hidden text-[11px] font-semibold transition-all duration-200 ${hovered ? 'max-w-[80px] pr-3 opacity-100' : 'max-w-0 opacity-0'}`}
            >
              {s.label}
            </span>
          </a>
        );
      })}

      {/* ── Cross-module links toggle ── */}
      {moduleLinks.length > 0 && (
        <>
          <div className="my-0.5 h-px bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => setLinksOpen((v) => !v)}
            className="flex h-5 items-center overflow-hidden rounded-l-full rounded-r-none bg-white/95 border border-r-0 border-violet-200 shadow-sm text-violet-500 transition-all hover:bg-violet-50 hover:shadow-md hover:border-violet-300"
            title="跨模块导航"
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
              <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="3" cy="7" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="11" cy="11" r="1.5" />
                <line x1="4.4" y1="6.2" x2="9.6" y2="3.8" />
                <line x1="4.4" y1="7.8" x2="9.6" y2="10.2" />
              </svg>
            </span>
            <span
              className={`whitespace-nowrap overflow-hidden text-[11px] font-semibold transition-all duration-200 ${hovered ? 'max-w-[80px] pr-3 opacity-100' : 'max-w-0 opacity-0'}`}
            >
              跨模块
            </span>
          </button>

          {/* Expandable module link list */}
          {linksOpen && (
            <div className="absolute right-full mr-2 top-0 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {internal.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">本模块</div>
                  {internal.map((link) => (
                    <a
                      key={link.linkId}
                      href={link.relatedRoute}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                    >
                      {IconInternal}
                      <span className="truncate">{link.label}</span>
                    </a>
                  ))}
                </>
              )}
              {external.length > 0 && (
                <>
                  <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 mt-1">商品企划</div>
                  {external.map((link) => (
                    <a
                      key={link.linkId}
                      href={link.relatedRoute}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                    >
                      {IconExternal}
                      <span className="truncate">{link.label}</span>
                    </a>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
