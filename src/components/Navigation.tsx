'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
    { name: '首页', nameEn: 'Home', href: '/' },
    { name: '商品企划', nameEn: 'Merch Planning', href: '/dashboard' },
    { name: '设计企划', nameEn: 'Design Planning', href: '/design-review-center' },
    { name: '案例研究', nameEn: 'Case Studies', href: '/case-studies' },
    { name: '方法论', nameEn: 'Playbook', href: '/playbook' },
    { name: '作品画廊', nameEn: 'Gallery', href: '/gallery' },
    { name: '关于', nameEn: 'About', href: '/about' },
];

export default function Navigation() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
            <div className="container mx-auto px-6">
                <div className="flex h-[70px] items-center justify-between">
                    <Link href="/" className="group flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/60 bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_10px_25px_rgba(14,165,233,0.3)] transition-transform duration-200 group-hover:scale-[1.03]">
                            <svg className="h-[26px] w-[26px] text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.18)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* 八爪鱼 - 头部 */}
                                <ellipse cx="12" cy="8.5" rx="5.5" ry="5" fill="currentColor" />
                                {/* 眼睛 */}
                                <circle cx="9.8" cy="8" r="1.1" fill="rgba(30,58,138,0.9)" />
                                <circle cx="14.2" cy="8" r="1.1" fill="rgba(30,58,138,0.9)" />
                                <circle cx="9.8" cy="7.8" r="0.5" fill="white" />
                                <circle cx="14.2" cy="7.8" r="0.5" fill="white" />
                                {/* 触手 */}
                                <path d="M7.5 12C6 14 4.5 16.5 5 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M9 13C8 15.5 7.5 17.5 8.5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M11 13.5C10.5 16 10.5 18 11.5 19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M13 13.5C13.5 16 13.5 18 12.5 19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M15 13C16 15.5 16.5 17.5 15.5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M16.5 12C18 14 19.5 16.5 19 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[17px] font-bold leading-tight tracking-tight text-slate-950">ID Claw Studio</span>
                            <span className="text-[10px] font-medium tracking-[0.18em] text-slate-400">商品规划&设计</span>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-1.5 lg:flex">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={[
                                        'flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-2 transition-all duration-200',
                                        isActive
                                            ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                                            : 'text-slate-600 hover:bg-slate-100/85 hover:text-slate-900',
                                    ].join(' ')}
                                >
                                    <span className="text-xs font-semibold leading-tight">{item.name}</span>
                                    <span className={['text-[10px] leading-tight', isActive ? 'text-slate-300' : 'text-slate-400'].join(' ')}>{item.nameEn}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <button
                        className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div className="border-t border-slate-100 bg-white/95 backdrop-blur-xl lg:hidden">
                    <div className="container mx-auto space-y-1 px-6 py-3">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={[
                                        'flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-200',
                                        isActive ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50',
                                    ].join(' ')}
                                >
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <span className={['text-xs', isActive ? 'text-slate-300' : 'text-slate-400'].join(' ')}>{item.nameEn}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}
