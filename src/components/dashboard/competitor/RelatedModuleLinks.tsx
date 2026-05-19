'use client';

import type { CompetitorTrendRelatedModuleLink } from '@/types/competitorTrendTypes';

interface RelatedModuleLinksProps {
    links: CompetitorTrendRelatedModuleLink[];
    onJumpToModule: (tab: string) => void;
}

export default function RelatedModuleLinks({ links, onJumpToModule }: RelatedModuleLinksProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {links.map((link) => (
                <button
                    key={link.moduleId}
                    onClick={() => onJumpToModule(link.targetTab)}
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-150"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{link.icon}</span>
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                            {link.moduleName}
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        {link.relationship}
                    </div>
                    <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                        <span>{link.ctaLabel}</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                </button>
            ))}
        </div>
    );
}
