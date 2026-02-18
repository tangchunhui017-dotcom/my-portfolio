'use client';

import { useEffect, useRef, useState } from 'react';

interface TimelineItem {
    period: string;
    role: string;
    company: string;
    companyType: string;
    highlights: string[];
    achievements?: { metric: string; description: string }[];
    tags: string[];
}

export default function ExperienceTimeline({ items }: { items: TimelineItem[] }) {
    const [activeIndex, setActiveIndex] = useState(-1);
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        setActiveIndex((prev) => Math.max(prev, index));
                    }
                });
            },
            { threshold: 0.2 }
        );

        const items = timelineRef.current?.querySelectorAll('[data-index]');
        items?.forEach((item) => observer.observe(item));

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={timelineRef} className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-12">
                {items.map((item, index) => (
                    <div
                        key={index}
                        data-index={index}
                        className={`relative pl-16 transition-all duration-700 ${index <= activeIndex
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-8'
                            }`}
                    >
                        {/* Timeline Dot */}
                        <div
                            className={`absolute left-4 top-1 w-5 h-5 rounded-full border-4 transition-colors duration-500 ${index <= activeIndex
                                    ? 'bg-slate-900 border-slate-900'
                                    : 'bg-white border-slate-300'
                                }`}
                        />

                        {/* Period Badge */}
                        <div className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full mb-3">
                            {item.period}
                        </div>

                        {/* Company & Role */}
                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                            {item.role}
                        </h3>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-slate-700 font-medium">{item.company}</span>
                            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                                {item.companyType}
                            </span>
                        </div>

                        {/* Highlights */}
                        <ul className="space-y-2 mb-4">
                            {item.highlights.map((highlight, i) => (
                                <li key={i} className="flex items-start gap-3 text-slate-600">
                                    <span className="text-emerald-500 mt-1.5 flex-shrink-0">▸</span>
                                    <span className="leading-relaxed">{highlight}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Achievements */}
                        {item.achievements && (
                            <div className="flex flex-wrap gap-4 mb-4">
                                {item.achievements.map((ach, i) => (
                                    <div
                                        key={i}
                                        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg px-4 py-3 border border-slate-200"
                                    >
                                        <div className="text-lg font-bold text-slate-900">{ach.metric}</div>
                                        <div className="text-xs text-slate-500">{ach.description}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 text-xs font-medium bg-slate-800 text-slate-200 rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
