'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { name: '首页', nameEn: 'Home', href: '/' },
    { name: '案例研究', nameEn: 'Case Studies', href: '/case-studies' },
    { name: '数据看板', nameEn: 'Dashboard', href: '/dashboard' },
    { name: '作品画廊', nameEn: 'Gallery', href: '/gallery' },
    { name: '方法论', nameEn: 'Playbook', href: '/playbook' },
    { name: '关于', nameEn: 'About', href: '/about' },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo (Stitch Style) */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-pink-300 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <svg className="w-5 h-5 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" d="M9.315 7.584C9.395 7.979 9.5 8.35 9.5 8.75v3.42l-2.614 4.356c-.525.875-.785 1.312-.767 1.803.018.491.317.893.916 1.697l.123.165c.67.9 1.005 1.35 1.483 1.603.479.253 1.037.253 2.153.253h2.412c1.116 0 1.674 0 2.153-.253.478-.253.813-.703 1.483-1.603l.123-.165c.599-.804.898-1.206.916-1.697.018-.49-.242-.928-.767-1.803L14.5 12.17V8.75c0-.4.105-.771.185-1.166l.574-2.87c.14-.7-.34-1.214-1.119-1.214h-4.28c-.78 0-1.26.514-1.12 1.214l.575 2.87zM11 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold text-slate-900 tracking-tight">Tang-Design Project</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-6">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`transition-colors hover:text-slate-900 flex flex-col items-center gap-0.5 ${isActive
                                        ? 'text-slate-900'
                                        : 'text-slate-600'
                                        }`}
                                >
                                    <span className={`text-sm font-medium ${isActive ? 'border-b-2 border-slate-900 pb-0.5' : ''}`}>
                                        {item.name}
                                    </span>
                                    <span className="text-xs text-slate-400">{item.nameEn}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mobile Menu Button */}
                    <button className="md:hidden text-slate-600 hover:text-slate-900">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </nav>
    );
}
