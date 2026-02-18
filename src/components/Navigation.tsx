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
                    {/* Logo */}
                    <Link href="/" className="text-xl font-bold text-slate-900">
                        作品集
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
