'use client';
/**
 * src/components/dashboard/BrandPositioningPanel.tsx
 * 商品企划 · 品牌定位 Tab — 品牌定位标准库 + 商品企划判断台。
 *
 * 结构：3 幕剧
 *   01 品牌之眼      Hero + 品牌简介 + 品牌理念 + 品牌风格
 *   02 商业判断台   品牌定位（层级 + 象限）+ 系列结构 + 产品价格定位 + 客群定位 + 生活方式
 *   03 企划行动     策略矩阵 + 健康度 + 企划输出 + 跨模块入口
 *
 * 数据契约见 src/types/brandPositioning.ts；默认数据 data/planning/brand_positioning_footwear.json
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import MerchSectionDivider from './MerchSectionDivider';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { buildMerchModuleLinks } from '@/config/dashboard/merch-module-links';
import data from '../../../data/planning/brand_positioning_footwear.json';
import type {
    BrandPositioningSnapshot,
    BrandPositioningKpi,
    BrandIdentity,
    BrandPhilosophy,
    BrandDnaKeyword,
    SeriesPortfolioItem,
    PriceArchitectureItem,
    TargetConsumerSegment,
    ConsumerOverview,
    LifestyleScenarioItem,
    LifestyleOverview,
    BrandStrategyMatrixItem,
    BrandPositioningHealthCheck,
    BrandPositioningPlanningOutput,
    BrandPositioningRelatedModuleLink,
    RiskLevel,
    StrategyType,
} from '@/types/brandPositioning';
import type { DashboardTab } from '@/config/dashboardTabMap';
import PriceTierPyramid from '@/components/dashboard/brand-positioning/PriceTierPyramid';
import StyleQuadrant from '@/components/dashboard/brand-positioning/StyleQuadrant';
import MoodCollage from '@/components/dashboard/brand-positioning/MoodCollage';
import EnvironmentDiagnosis from '@/components/dashboard/brand-positioning/EnvironmentDiagnosis';
import CapabilityGap from '@/components/dashboard/brand-positioning/CapabilityGap';
import SixStrategies from '@/components/dashboard/brand-positioning/SixStrategies';

const snapshot = data as unknown as BrandPositioningSnapshot;

const STATUS_STYLE: Record<RiskLevel, { dot: string; chip: string; text: string }> = {
    healthy:     { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'text-emerald-600' },
    opportunity: { dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-700 border-sky-100',             text: 'text-sky-600' },
    warning:     { dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-100',       text: 'text-amber-600' },
    risk:        { dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 border-rose-100',          text: 'text-rose-600' },
    design:      { dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-700 border-violet-100',    text: 'text-violet-600' },
    low:         { dot: 'bg-slate-300',   chip: 'bg-slate-50 text-slate-600 border-slate-100',       text: 'text-slate-500' },
};

interface Props {
    onJumpToTab?: (tab: DashboardTab) => void;
}

const ic = 'w-2.5 h-2.5';
const BRAND_PAGE_SECTIONS = [
  { anchor: '#chapter-00', label: '品牌名片', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="6" r="3.5" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>) },
  { anchor: '#chapter-01', label: '品牌之眼', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 8s2.5-5.5 7-5.5S15 8 15 8s-2.5 5.5-7 5.5S1 8 1 8z" /><circle cx="8" cy="8" r="2" /></svg>) },
  { anchor: '#chapter-env', label: '环境诊断', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2v12" /></svg>) },
  { anchor: '#chapter-gap', label: '能力差距', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="8,2 14,5 14,11 8,14 2,11 2,5" /></svg>) },
  { anchor: '#chapter-strategies', label: '六大行动', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>) },
  { anchor: '#chapter-02', label: '商业判断', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,12 5,8 8.5,10 12,5 14,7" /><polyline points="11,4 14,4 14,7" /></svg>) },
  { anchor: '#chapter-03', label: '企划行动', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,8 6.5,12 14,4" /></svg>) },
];

export default function BrandPositioningPanel({ onJumpToTab }: Props) {
    return (
        <div className="space-y-10">
            <section id="chapter-00" className="scroll-mt-24">
                <MerchSectionDivider label="A" title="品牌名片" />
                <HeroAndIdentity identity={snapshot.identity} />
            </section>

            <section id="chapter-01" className="scroll-mt-24 space-y-10">
                <MerchSectionDivider label="B" title="品牌之眼" />
                <ChapterDivider chapter="01" title="品牌之眼" subtitle="品牌理念 · 品牌风格" />
                <BrandPhilosophySection philosophy={snapshot.philosophy} />
                <BrandStyleSection keywords={snapshot.dnaKeywords} />
            </section>

            <section id="chapter-env" className="scroll-mt-24 space-y-10">
                <MerchSectionDivider label="C" title="环境诊断" />
                <ChapterDivider chapter="02" title="环境诊断" subtitle="外部 PEST · 内部 SWOT 双轴扫描" />
                <EnvironmentDiagnosis />
            </section>

            <section id="chapter-gap" className="scroll-mt-24 space-y-10">
                <MerchSectionDivider label="D" title="能力差距与战略推导" />
                <ChapterDivider chapter="03" title="能力差距推导" subtitle="雷达图诊断 · TOWS 战略象限" />
                <CapabilityGap />
            </section>

            <section id="chapter-strategies" className="scroll-mt-24 space-y-10">
                <MerchSectionDivider label="E" title="六大战略行动" />
                <ChapterDivider chapter="04" title="核心对策" subtitle="产品 · 价格 · 服务 · 渠道 · 供应链 · 组织" />
                <SixStrategies />
            </section>

            <section id="chapter-02" className="scroll-mt-24 space-y-10">
                <MerchSectionDivider label="F" title="商业判断台" />
                <ChapterDivider chapter="05" title="商业判断台" subtitle="品牌层级 · 系列结构 · 价格 · 客群 · 生活方式" />
                <BrandTierSection />
                <SeriesPortfolioSection items={snapshot.seriesPortfolio} onJumpToTab={onJumpToTab} />
                <PriceArchitectureSection items={snapshot.priceArchitecture} />
                <TargetConsumerSection overview={snapshot.consumerOverview} segments={snapshot.targetConsumers} />
                <LifestyleScenarioSection overview={snapshot.lifestyleOverview} items={snapshot.lifestyleScenarios} />
            </section>

            <section id="chapter-03" className="scroll-mt-24 space-y-10">
                <MerchSectionDivider label="G" title="企划行动" />
                <ChapterDivider chapter="06" title="企划行动" subtitle="策略矩阵 · 健康度 · 企划输出 · 跨模块入口" />
                <KpiStatusBar kpis={snapshot.kpis} />
                <StrategyMatrixSection items={snapshot.strategyMatrix} />
                <PositioningHealthCheckSection items={snapshot.healthChecks} onJumpToTab={onJumpToTab} />
                <PlanningOutputSection items={snapshot.planningOutputs} />
                <RelatedModuleLinksSection items={snapshot.relatedModuleLinks} onJumpToTab={onJumpToTab} />
            </section>

            <FloatingModuleNav
                moduleLinks={buildMerchModuleLinks('brand-positioning')}
                pageSections={BRAND_PAGE_SECTIONS}
            />
        </div>
    );
}

/* ─── Chapter Nav (sticky) ───────────────────────────────────────────── */
const CHAPTER_NAV: Array<{ id: string; chapter: string; label: string }> = [
    { id: 'chapter-00', chapter: '00', label: '名片' },
    { id: 'chapter-01', chapter: '01', label: '品牌之眼' },
    { id: 'chapter-02', chapter: '02', label: '商业判断台' },
    { id: 'chapter-03', chapter: '03', label: '企划行动' },
];

function ChapterNav() {
    const [activeId, setActiveId] = useState<string>('chapter-00');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const targets = CHAPTER_NAV
            .map((c) => document.getElementById(c.id))
            .filter((el): el is HTMLElement => el !== null);
        if (targets.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                // 取最靠近顶部的可见 entry
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActiveId(visible[0].target.id);
            },
            { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
        );
        targets.forEach((t) => observer.observe(t));
        return () => observer.disconnect();
    }, []);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveId(id);
        }
    };

    return (
        <nav className="sticky top-0 z-30 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 bg-white/85 backdrop-blur border-b border-slate-100">
            <ul className="flex items-center gap-1 overflow-x-auto">
                {CHAPTER_NAV.map((c) => {
                    const isActive = c.id === activeId;
                    return (
                        <li key={c.id} className="flex-shrink-0">
                            <a
                                href={`#${c.id}`}
                                onClick={(e) => handleClick(e, c.id)}
                                className={`flex items-baseline gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap ${
                                    isActive
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                            >
                                <span className={`font-mono tabular-nums text-[10px] tracking-wider ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                    {c.chapter}
                                </span>
                                <span className="font-medium">{c.label}</span>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

/* ─── Hero + 品牌简介（合并） ─────────────────────────────────────────── */
function HeroAndIdentity({ identity }: { identity: BrandIdentity }) {
    const { positioningVersion, positioningStatus, updatedAt, year, season } = snapshot;
    const heritage = `自 ${identity.foundedYear}${identity.country ? ` · ${identity.country}` : ''}${identity.enterChinaYear ? ` · ${identity.enterChinaYear} 年进入中国` : ''}`;
    const fields: Array<{ label: string; value: string }> = [
        { label: '创始人',   value: identity.founder },
        { label: '经营方向', value: identity.businessScope },
        { label: '商品品类', value: identity.productCategories.join('、') },
    ];
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(99,102,241,0.30)] hover:border-indigo-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_0_4px_rgba(238,242,255,0.9)]" />
            <div className="text-[10px] tracking-[0.32em] text-indigo-500 uppercase">BRAND POSITIONING · CHAPTER 00</div>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8">
                <div className="space-y-6">
                    {/* 品牌主标题 */}
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
                            {identity.brandName}
                        </h1>
                        {identity.brandNameEnglish && identity.brandNameEnglish !== identity.brandName && (
                            <div className="mt-1 text-base text-slate-400 tracking-wider">{identity.brandNameEnglish}</div>
                        )}
                        <div className="mt-2 text-[11px] text-slate-500 tracking-wide">{heritage}</div>
                    </div>

                    {/* 品牌简介字段（创始人、经营方向、品类）
                        Slogan + 主题关键词已在 Chapter 01 · 品牌理念 中呈现，此处不重复 */}
                    <ul className="space-y-2.5 pt-5 border-t border-slate-100">
                        {fields.map((f) => (
                            <li key={f.label} className="grid grid-cols-[88px_1fr] gap-4 items-baseline">
                                <span className="text-xs text-slate-400 tracking-wider">{f.label}</span>
                                <span className="text-sm text-slate-800">{f.value}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Brand Mission pull-quote */}
                    <figure className="pl-4 border-l-2 border-slate-300 max-w-xl">
                        <blockquote className="text-base text-slate-700 italic leading-relaxed">
                            &ldquo;{identity.brandMission}&rdquo;
                        </blockquote>
                        <figcaption className="mt-2 text-[11px] text-slate-400 tracking-wider uppercase">Brand Mission</figcaption>
                    </figure>

                    {/* 折叠的品牌故事 + 承诺 */}
                    <details open className="pt-4 border-t border-slate-100">
                        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-800 select-none">
                            展开品牌叙事（故事 / 承诺）
                        </summary>
                        <div className="mt-3 space-y-3 text-sm text-slate-600 leading-7">
                            <p>{identity.brandStory}</p>
                            <p><span className="text-slate-400 text-xs mr-2">承诺</span>{identity.brandPromise}</p>
                        </div>
                    </details>

                    {/* 元数据 chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-4 border-t border-slate-100">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{year} · {season ?? '全年'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{positioningVersion}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{positioningStatus}</span>
                        <span className="text-slate-400">更新于 {updatedAt}</span>
                    </div>
                </div>

                {/* 右侧：单张 mood 图（高度跟随左列文本，via grid items-stretch + h-full） */}
                <ImageSlot
                    url={identity.mainImage ?? undefined}
                    label={`${identity.brandName} · Hero`}
                    ratio=""
                    className="h-full min-h-[480px]"
                    slotKey="hero"
                />
            </div>
        </section>
    );
}

/* ─── KPI Status Bar ─────────────────────────────────────────────────── */
function KpiStatusBar({ kpis }: { kpis: BrandPositioningKpi[] }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(16,185,129,0.30)] hover:border-emerald-300 px-4 py-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-70" />
            <div className="pointer-events-none absolute top-2 right-3 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(209,250,229,0.9)]" />
            <div className="flex items-center gap-2 py-2 overflow-x-auto" role="list">
                {kpis.map((kpi) => {
                    const style = STATUS_STYLE[kpi.status];
                    return (
                        <button
                            key={kpi.kpiId}
                            type="button"
                            title={`${kpi.label} · 目标 ${kpi.targetValue}${kpi.variance !== '—' ? ' · ' + kpi.variance : ''}\n${kpi.description}`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} flex-shrink-0`} />
                            <span className="text-[11px] text-slate-500">{kpi.label}</span>
                            <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums">{kpi.currentValue}</span>
                            {kpi.variance !== '—' && (
                                <span className={`text-[10px] font-mono ${style.text}`}>{kpi.variance}</span>
                            )}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="ml-auto flex-shrink-0 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1"
                >
                    {expanded ? '收起 ↑' : '展开完整 ↓'}
                </button>
            </div>
            {expanded && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 pb-4">
                    {kpis.map((kpi) => {
                        const style = STATUS_STYLE[kpi.status];
                        return (
                            <div key={kpi.kpiId} className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-[11px] text-slate-500">{kpi.label}</div>
                                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                </div>
                                <div className="text-2xl font-semibold text-slate-900 tracking-tight font-mono tabular-nums">{kpi.currentValue}</div>
                                <div className="flex items-center gap-1.5 text-[11px]">
                                    <span className="text-slate-400">目标 {kpi.targetValue}</span>
                                    {kpi.variance !== '—' && <span className={style.text}>{kpi.variance}</span>}
                                </div>
                                <div className="text-[11px] text-slate-500 leading-5">{kpi.description}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

/* ─── Chapter Divider ────────────────────────────────────────────────── */
function ChapterDivider({ chapter, title, subtitle }: { chapter: string; title: string; subtitle: string }) {
    return (
        <div className="pt-12 pb-2">
            <div className="flex items-center gap-4 mb-3">
                <span className="text-[11px] tracking-[0.4em] text-slate-400 uppercase font-medium">Chapter {chapter}</span>
                <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="flex items-baseline gap-3">
                <span className="inline-block w-8 h-[2px] bg-slate-900" />
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-11">{subtitle}</p>
        </div>
    );
}

/* ─── 工具：把任意像素宽高 → 贴近常见宽高比的字符串（"1:1" / "3:4" 等） ─ */
function formatAspectRatio(w: number, h: number): string {
    if (w <= 0 || h <= 0) return '';
    const r = w / h;
    const COMMON: Array<[string, number]> = [
        ['1:1', 1],
        ['5:4', 5 / 4], ['4:5', 4 / 5],
        ['4:3', 4 / 3], ['3:4', 3 / 4],
        ['3:2', 3 / 2], ['2:3', 2 / 3],
        ['16:10', 16 / 10], ['10:16', 10 / 16],
        ['16:9', 16 / 9], ['9:16', 9 / 16],
        ['2:1', 2], ['1:2', 0.5],
        ['21:9', 21 / 9],
    ];
    for (const [label, val] of COMMON) {
        if (Math.abs(r - val) / val < 0.05) return label;
    }
    return r >= 1 ? `${r.toFixed(2)}:1` : `1:${(1 / r).toFixed(2)}`;
}

/* ─── 拖放上传：把 File resize 到 ≤1024px 后转 JPEG dataURL ──────────── */
async function resizeImageToDataUrl(file: File, maxSize = 1024, quality = 0.85): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.onload = () => {
            const img = document.createElement('img');
            img.onerror = () => reject(new Error('Image load error'));
            img.onload = () => {
                let w = img.naturalWidth;
                let h = img.naturalHeight;
                if (w > maxSize || h > maxSize) {
                    if (w >= h) {
                        h = Math.round((h * maxSize) / w);
                        w = maxSize;
                    } else {
                        w = Math.round((w * maxSize) / h);
                        h = maxSize;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('No canvas context'));
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}

/* ─── Image Slot (placeholder when url missing) + 拖放上传 ───────────── */
function ImageSlot({
    url, label, ratio = 'aspect-[4/5]', className = '', slotKey,
}: {
    url?: string;
    label?: string;
    ratio?: string;
    className?: string;
    /** 启用拖放上传 — 文件以 base64 形式存到 localStorage 的 `bp:img:{slotKey}` */
    slotKey?: string;
}) {
    const storageKey = slotKey ? `bp:img:${slotKey}` : null;
    const [uploaded, setUploaded] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [aspectText, setAspectText] = useState('');

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) setUploaded(stored);
        } catch { /* noop */ }
    }, [storageKey]);

    // 检测实际渲染宽高 → 显示宽高比
    useEffect(() => {
        const el = containerRef.current;
        if (!el || typeof window === 'undefined') return;
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setAspectText(formatAspectRatio(width, height));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        if (!storageKey) return;
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        if (!storageKey) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };
    const handleDrop = async (e: React.DragEvent) => {
        if (!storageKey) return;
        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (!file.type.startsWith('image/')) {
            setError('请拖入图片文件');
            setTimeout(() => setError(null), 1800);
            return;
        }
        setUploading(true);
        setError(null);
        try {
            const dataUrl = await resizeImageToDataUrl(file);
            setUploaded(dataUrl);
            try { localStorage.setItem(storageKey, dataUrl); }
            catch { setError('存储已满，请删除部分图片'); setTimeout(() => setError(null), 2500); }
        } catch {
            setError('图片处理失败');
            setTimeout(() => setError(null), 1800);
        } finally {
            setUploading(false);
        }
    };
    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setUploaded(null);
        if (storageKey) {
            try { localStorage.removeItem(storageKey); } catch { /* noop */ }
        }
    };

    const finalUrl = uploaded ?? url;
    const dragHandlers = storageKey ? {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
    } : {};

    if (finalUrl) {
        return (
            <div
                ref={containerRef}
                className={`${ratio} relative w-full h-full rounded-md overflow-hidden group ${
                    isDragOver ? 'ring-2 ring-sky-400 ring-offset-1' : ''
                } ${className}`}
                {...dragHandlers}
            >
                {/* 图片绝对定位 + object-contain：按比例完整显示，不裁剪，aspect 不匹配时留白 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={finalUrl}
                    alt={label ?? ''}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-contain"
                    draggable={false}
                />
                {storageKey && uploaded && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="移除上传图片"
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/85 hover:bg-white shadow-sm text-slate-600 hover:text-slate-900 flex items-center justify-center text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                        ×
                    </button>
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-[10px] text-slate-500 uppercase tracking-wider z-10">
                        处理中…
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`${ratio} w-full rounded-md bg-gradient-to-br from-slate-50 via-white to-slate-50 border ${
                isDragOver ? 'border-solid border-sky-400 bg-sky-50/60' : 'border-dashed border-slate-200'
            } flex flex-col items-center justify-center text-slate-300 relative overflow-hidden transition-colors ${className}`}
            {...dragHandlers}
        >
            {aspectText && (
                <div className="absolute top-1.5 left-2 text-[9px] text-slate-400/70 font-mono tabular-nums tracking-wider">
                    {aspectText}
                </div>
            )}
            <span className="absolute top-1.5 right-2 text-[10px] text-slate-300 leading-none">✱</span>
            <div className={`text-[10px] uppercase tracking-[0.3em] ${isDragOver ? 'text-sky-500' : 'text-slate-300'}`}>
                {uploading ? '处理中…' : isDragOver ? '松开上传' : 'Mood'}
            </div>
            {label && !isDragOver && !uploading && (
                <div className="mt-1 text-[11px] text-slate-400 px-3 text-center truncate max-w-[90%]">{label}</div>
            )}
            {error && (
                <div className="mt-1 text-[10px] text-rose-500">{error}</div>
            )}
            <div className="absolute bottom-1.5 right-2 text-[9px] text-slate-300 tracking-wider uppercase">
                {storageKey ? '拖图上传' : '占位'}
            </div>
        </div>
    );
}

/* ─── 03 品牌理念 ────────────────────────────────────────────────────── */
function BrandPhilosophySection({ philosophy }: { philosophy: BrandPhilosophy }) {
    const keywordCount = philosophy.themeKeywords.length;
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(245,158,11,0.30)] hover:border-amber-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_4px_rgba(254,243,199,0.9)]" />
            <SectionTitle index="03" label="品牌理念" hint="精神内核 · 设计精髓 · 价值观" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 mt-6">
                <div className="space-y-6">
                    <p className="text-3xl font-medium text-slate-800 leading-snug tracking-wide">
                        {philosophy.themeKeywords.map((k, i) => (
                            <span key={k}>
                                {k}
                                {i < keywordCount - 1 && <span className="text-slate-300 mx-2.5">·</span>}
                            </span>
                        ))}
                    </p>
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                        {philosophy.manifesto.map((line, i) => (
                            <p key={i} className="text-sm text-slate-600 leading-7">{line}</p>
                        ))}
                    </div>
                </div>
                <MoodCollage
                    images={philosophy.moodImages}
                    variant="magazine"
                    storagePrefix="bp:philosophy"
                    label="Mood"
                    renderImageSlot={(p) => <ImageSlot {...p} />}
                />
            </div>
        </section>
    );
}

/* ─── 04 品牌风格 (Brand Style / DNA) ────────────────────────────────── */
function BrandStyleSection({ keywords }: { keywords: BrandDnaKeyword[] }) {
    const [activeId, setActiveId] = useState(keywords[0].keywordId);
    const active = keywords.find((k) => k.keywordId === activeId) ?? keywords[0];
    const activeIndex = keywords.findIndex((k) => k.keywordId === activeId);
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-pink-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(244,63,94,0.30)] hover:border-rose-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(255,228,230,0.9)]" />
            <SectionTitle
                index="04"
                label="品牌风格"
                hint={`4 个 DNA 关键词 · 当前 ${active.keywordEnglish} ${active.keywordName}`}
               
            />
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 mt-6">
                {/* Keyword tabs */}
                <nav className="space-y-1 lg:border-r lg:border-slate-100 lg:pr-4">
                    {keywords.map((k, i) => {
                        const isActive = k.keywordId === activeId;
                        return (
                            <button
                                key={k.keywordId}
                                type="button"
                                onClick={() => setActiveId(k.keywordId)}
                                className={`w-full text-left py-2.5 px-3 border-l-2 transition-colors ${
                                    isActive
                                        ? 'border-slate-900 bg-slate-50/50'
                                        : 'border-transparent hover:bg-slate-50'
                                }`}
                            >
                                <div className={`text-[10px] uppercase tracking-[0.2em] ${isActive ? 'text-slate-500' : 'text-slate-300'}`}>
                                    {String(i + 1).padStart(2, '0')} · {k.keywordEnglish}
                                </div>
                                <div className={`mt-0.5 text-lg font-medium ${isActive ? 'text-slate-900' : 'text-slate-300'}`}>
                                    {k.keywordName}
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Active keyword detail */}
                <div className="space-y-6 min-w-0">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                            关键词 {String(activeIndex + 1).padStart(2, '0')} · {active.keywordEnglish}
                        </div>
                        <h3 className="mt-1.5 text-3xl font-semibold text-slate-900 tracking-tight">{active.keywordName}</h3>
                        <div className="mt-4 space-y-2 max-w-3xl">
                            {active.poeticDescription.map((line, i) => (
                                <p key={i} className="text-base text-slate-600 leading-8">{line}</p>
                            ))}
                        </div>
                    </div>

                    {/* Mood gallery */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {active.moodImages.map((url, i) => (
                            <ImageSlot
                                key={`${active.keywordId}-${i}`}
                                url={url ?? undefined}
                                label={`${active.keywordName} · ${String(i + 1).padStart(2, '0')}`}
                                ratio="aspect-[3/4]"
                                slotKey={`style:${active.keywordId}:${i}`}
                            />
                        ))}
                    </div>

                    {/* Folded data layer · 企划落地 */}
                    <details open className="border-t border-slate-100 pt-4 group">
                        <summary className="cursor-pointer list-none flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 select-none">
                            <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                            查看企划落地（商品 / 设计 / 视觉 / 材质 / 色彩 · 可做 / 不可做）
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.assign('/design-review-center'); }}
                                className="ml-auto text-[11px] px-2 py-0.5 rounded-md border border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"
                            >
                                关联设计计划 ↗
                            </button>
                        </summary>
                        <p className="mt-3 text-sm text-slate-600 leading-6">{active.keywordDefinition}</p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                            <Expression label="商品表达" value={active.productExpression} />
                            <Expression label="设计表达" value={active.designExpression} />
                            <Expression label="视觉表达" value={active.visualExpression} />
                            <Expression label="材质表达" value={active.materialExpression} />
                            <Expression label="色彩表达" value={active.colorExpression} />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-6 pt-3 border-t border-slate-50">
                            <RuleList title="可做" items={active.doRules} tone="emerald" />
                            <RuleList title="不可做" items={active.dontRules} tone="rose" />
                        </div>
                    </details>
                </div>
            </div>
        </section>
    );
}

function Expression({ label, value }: { label: string; value: string }) {
    if (!value || value === '—') return null;
    return (
        <div>
            <div className="text-slate-400">{label}</div>
            <div className="text-slate-700 leading-5">{value}</div>
        </div>
    );
}

function RuleList({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'rose' }) {
    const palette = tone === 'emerald'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
        : 'text-rose-700 bg-rose-50 border-rose-100';
    return (
        <div>
            <div className={`text-[11px] font-semibold mb-1.5 ${tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700'}`}>{title}</div>
            <ul className="space-y-1">
                {items.map((rule) => (
                    <li key={rule} className={`text-[11px] px-2 py-1 rounded-md border ${palette}`}>
                        {tone === 'emerald' ? '✓ ' : '✕ '}{rule}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ─── 05 品牌定位 (金字塔 + 风格象限) ────────────────────────────────── */
function BrandTierSection() {
    const t = snapshot.tier;
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/50 via-white to-sky-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(6,182,212,0.30)] hover:border-cyan-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(207,250,254,0.9)]" />
            <SectionTitle index="05" label="品牌定位" hint="价格层级金字塔 · 风格象限定位" />

            <div className="mt-6 rounded-xl border border-slate-100 bg-white p-6">
                <PriceTierPyramid tierLadder={t.tierLadder} brandName={snapshot.identity.brandName} />
                <p className="mt-4 text-[11px] text-slate-500 leading-6 max-w-3xl">
                    <span className="text-slate-700 font-medium">{t.brandTier}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    {t.brandPositionDescription}
                </p>
            </div>

            {t.styleQuadrant && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-white p-6">
                    <StyleQuadrant data={t.styleQuadrant} brandName={snapshot.identity.brandName} />
                </div>
            )}
        </section>
    );
}

/* ─── 06 系列结构策略 ─────────────────────────────────────────────────── */
function SeriesPortfolioSection({ items, onJumpToTab }: { items: SeriesPortfolioItem[]; onJumpToTab?: (tab: DashboardTab) => void }) {
    const totals = useMemo(() => ({
        targetMin: items.reduce((s, x) => s + x.targetShareMin, 0),
        targetMax: items.reduce((s, x) => s + x.targetShareMax, 0),
        current:   items.reduce((s, x) => s + x.currentShare, 0),
    }), [items]);
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(16,185,129,0.30)] hover:border-emerald-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(209,250,229,0.9)]" />
            <SectionTitle
                index="06"
                label="系列划分与占比"
                hint="3 大系列 · 角色 / 占比 / 价格 / OTB"
               
                rightSlot={(
                    <span className="text-[11px] text-slate-500">
                        合计：目标 {totals.targetMin}%–{totals.targetMax}% · 当前 <span className="font-semibold text-slate-700">{totals.current}%</span>
                    </span>
                )}
            />
            <div className="mt-6 space-y-4">
                {items.map((s, i) => (
                    <SeriesRow key={s.seriesId} series={s} accent={i === 1} flipped={i === 1} onJumpToTab={onJumpToTab} />
                ))}
            </div>
        </section>
    );
}

function SeriesRow({
    series: s, accent = false, flipped = false, onJumpToTab,
}: { series: SeriesPortfolioItem; accent?: boolean; flipped?: boolean; onJumpToTab?: (tab: DashboardTab) => void }) {
    const style = STATUS_STYLE[s.riskLevel];
    const off = s.currentShare < s.targetShareMin
        ? `偏低 ${(s.targetShareMin - s.currentShare).toFixed(0)}pp`
        : s.currentShare > s.targetShareMax
            ? `偏高 ${(s.currentShare - s.targetShareMax).toFixed(0)}pp`
            : '在区间内';
    return (
        <article className={`grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 rounded-2xl border border-slate-200 p-6 lg:p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${
            accent ? 'bg-gradient-to-r from-amber-50/20 to-transparent' : 'bg-white'
        }`}>
            <div className={`space-y-5 ${flipped ? 'lg:order-2' : ''}`}>
                <div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                        <h4 className="text-2xl font-semibold text-slate-900 tracking-tight">{s.seriesName}</h4>
                        <span className="text-2xl font-mono tabular-nums text-slate-900">
                            {s.targetShareMin === s.targetShareMax ? `${s.targetShareMin}%` : `${s.targetShareMin}-${s.targetShareMax}%`}
                        </span>
                    </div>
                    <div className="mt-1.5 text-xs text-slate-400 tracking-wider">
                        【{s.seriesRole}】
                    </div>
                </div>

                <div className="space-y-1.5 max-w-xl">
                    {s.poeticDescription.map((line, i) => (
                        <p key={i} className="text-sm text-slate-600 leading-7">{line}</p>
                    ))}
                </div>

                <details open className="pt-3 border-t border-slate-100 group">
                    <summary className="cursor-pointer list-none flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 select-none">
                        <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                        <span>查看企划落地</span>
                        <span className={`ml-auto px-2 py-0.5 rounded-full border text-[10px] ${style.chip}`}>
                            <span className={`inline-block w-1 h-1 rounded-full mr-1 ${style.dot}`} />
                            {off} · 当前 {s.currentShare}%
                        </span>
                    </summary>
                    <div className="mt-4">
                        <ShareBar targetMin={s.targetShareMin} targetMax={s.targetShareMax} current={s.currentShare} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <Field label="目标客群"     value={s.targetConsumer} />
                        <Field label="价格带"       value={`¥${s.targetPriceBand[0]}-${s.targetPriceBand[1]}`} />
                        <Field label="目标毛利率"   value={`${Math.round(s.targetGrossMargin * 100)}%`} />
                        <Field label="建议 SKU 数"  value={String(s.suggestedSkuCount)} />
                        <Field label="建议 OTB 占比" value={`${Math.round(s.suggestedOtbShare * 100)}%`} />
                        <Field label="企划角色"     value={s.planningRole} />
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-50">
                        <div className="text-[11px] text-slate-400 mb-1">建议动作</div>
                        <div className="text-xs text-slate-700 leading-6">{s.recommendedAction}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <ActionButton label="调整系列OTB" onClick={() => onJumpToTab?.('otb')} />
                        <ActionButton label="调整品类结构" onClick={() => onJumpToTab?.('category')} />
                        <ActionButton label="调整波段主题" onClick={() => onJumpToTab?.('planning')} />
                    </div>
                </details>
            </div>

            <MoodCollage
                images={s.moodImages}
                variant="magazine"
                storagePrefix={`bp:series:${s.seriesId}`}
                label={s.seriesName}
                renderImageSlot={(p) => <ImageSlot {...p} />}
            />
        </article>
    );
}

function ShareBar({ targetMin, targetMax, current }: { targetMin: number; targetMax: number; current: number }) {
    const max = 100;
    const tMinPct = (targetMin / max) * 100;
    const tMaxPct = (targetMax / max) * 100;
    const curPct = Math.min((current / max) * 100, 100);
    return (
        <div>
            <div className="relative h-2 rounded-full bg-slate-100 overflow-visible">
                <div
                    className="absolute top-0 h-2 bg-sky-100 rounded-full"
                    style={{ left: `${tMinPct}%`, width: `${tMaxPct - tMinPct}%` }}
                    title={`目标区间 ${targetMin}-${targetMax}%`}
                />
                <div
                    className="absolute -top-0.5 h-3 w-[3px] bg-slate-700 rounded-full"
                    style={{ left: `calc(${curPct}% - 1.5px)` }}
                    title={`当前 ${current}%`}
                />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>目标 {targetMin}-{targetMax}%</span>
                <span className="font-medium text-slate-600">当前 {current}%</span>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-slate-400">{label}</div>
            <div className="text-slate-700 font-medium">{value}</div>
        </div>
    );
}

function ActionButton({ label, onClick }: { label: string; onClick?: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className="text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {label} ↗
        </button>
    );
}

/* ─── Section title ──────────────────────────────────────────────────── */
function SectionTitle({ index, label, hint, rightSlot }: { index: string; label: string; hint?: string; rightSlot?: React.ReactNode }) {
    return (
        <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{index}</div>
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{label}</h3>
                    {hint && <span className="text-[11px] text-slate-400">· {hint}</span>}
                </div>
            </div>
            {rightSlot}
        </div>
    );
}

/* ─── 07 产品价格定位 (转置矩阵：行=渠道，列=品类) ────────────────────── */
function PriceArchitectureSection({ items }: { items: PriceArchitectureItem[] }) {
    const [showDetail, setShowDetail] = useState(false);
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/50 via-white to-purple-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(139,92,246,0.30)] hover:border-violet-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(237,233,254,0.9)]" />
            <SectionTitle
                index="07"
                label="产品价格定位"
                hint="品类 × 渠道 · 细分品类 + 价格区间"
               
                rightSlot={
                    <button
                        type="button"
                        onClick={() => setShowDetail((v) => !v)}
                        className="text-[11px] text-slate-500 hover:text-slate-800"
                    >
                        {showDetail ? '收起企划落地 ↑' : '展开企划落地（毛利 / 底线 / 风险）↓'}
                    </button>
                }
            />
            <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th
                                    className="relative w-[120px] min-w-[120px] border-r border-slate-200 bg-white p-0 text-left align-bottom"
                                    style={{ height: 90 }}
                                >
                                    {/* 对角分隔单元格 */}
                                    <svg viewBox="0 0 120 90" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                        <line x1="0" y1="0" x2="120" y2="90" stroke="#cbd5e1" strokeWidth="1" />
                                    </svg>
                                    <span className="absolute top-2 right-3 text-[11px] text-slate-500">品类</span>
                                    <span className="absolute bottom-2 left-3 text-[11px] text-slate-500">渠道</span>
                                </th>
                                {items.map((it) => (
                                    <th
                                        key={it.category}
                                        className="border-r border-slate-200 last:border-r-0 px-4 py-3 text-center font-semibold text-slate-800 whitespace-nowrap"
                                    >
                                        {it.category}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="border-r border-slate-200 px-4 py-3 text-slate-700 font-medium bg-slate-50/50 align-top">
                                    细分品类
                                </td>
                                {items.map((it) => (
                                    <td key={`sub-${it.category}`} className="border-r border-slate-200 last:border-r-0 px-4 py-3 align-top bg-slate-50/50">
                                        <div className="flex flex-col gap-0.5 text-slate-700 text-center">
                                            {(it.subCategories ?? []).map((sc) => (
                                                <span key={sc} className="text-sm">{sc}</span>
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="border-r border-slate-200 px-4 py-3 text-slate-700 font-medium align-middle">
                                    {items[0]?.channel ?? '线上'}
                                </td>
                                {items.map((it) => (
                                    <td key={`price-${it.category}`} className="border-r border-slate-200 last:border-r-0 px-4 py-3 text-center align-middle">
                                        <div className="text-sm font-mono tabular-nums text-slate-900">
                                            ¥{it.corePriceBand[0].toLocaleString()} - ¥{it.corePriceBand[1].toLocaleString()}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            {showDetail && (
                                <>
                                    <tr className="border-t border-slate-200 bg-slate-50/40">
                                        <td className="border-r border-slate-200 px-4 py-2.5 text-[11px] text-slate-500">毛利率 / 折扣安全线</td>
                                        {items.map((it) => (
                                            <td key={`gm-${it.category}`} className="border-r border-slate-200 last:border-r-0 px-4 py-2.5 text-center text-[11px] text-slate-600 font-mono tabular-nums">
                                                {Math.round(it.targetGrossMargin * 100)}% / {Math.round(it.markdownSafetyLine * 100)}%
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-50/40">
                                        <td className="border-r border-slate-200 px-4 py-2.5 text-[11px] text-slate-500">价格底线 / 上限</td>
                                        {items.map((it) => (
                                            <td key={`pf-${it.category}`} className="border-r border-slate-200 last:border-r-0 px-4 py-2.5 text-center text-[11px] text-slate-600 font-mono tabular-nums">
                                                ¥{it.priceFloor} / ¥{it.priceCeiling}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-t border-slate-200 bg-slate-50/40">
                                        <td className="border-r border-slate-200 px-4 py-2.5 text-[11px] text-slate-500">角色 / 状态</td>
                                        {items.map((it) => {
                                            const style = STATUS_STYLE[it.riskLevel];
                                            return (
                                                <td key={`role-${it.category}`} className="border-r border-slate-200 last:border-r-0 px-4 py-2.5 text-center align-middle">
                                                    <div className="text-[11px] text-slate-700">{it.pricingRole}</div>
                                                    <div className="mt-1 inline-flex items-center gap-1">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {showDetail && (
                <div className="mt-3 space-y-1.5">
                    {items.map((it) => {
                        const style = STATUS_STYLE[it.riskLevel];
                        return (
                            <div key={`note-${it.category}`} className="flex items-start gap-2 text-[11px]">
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${style.dot} flex-shrink-0`} />
                                <span className="text-slate-700 font-medium w-24 flex-shrink-0">{it.category}</span>
                                <span className="text-slate-600 leading-5">{it.recommendedAction}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

/* ─── 08 客群定位 ─────────────────────────────────────────────────────── */
function TargetConsumerSection({
    overview, segments,
}: { overview: ConsumerOverview; segments: TargetConsumerSegment[] }) {
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/50 via-white to-orange-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(244,63,94,0.30)] hover:border-rose-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(255,228,230,0.9)]" />
            <SectionTitle index="08" label="客群定位" hint="生活方式 · 年龄分层 · 心理画像" />

            {/* Overview 杂志层：年龄数据 + 诗意文案上层 → portrait 横排带下层
                （堆叠以打破"左文右图"复读机感，与品牌理念/系列/生活方式形成节奏对比） */}
            <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-x-10 gap-y-4 items-start">
                    <div className="flex items-baseline gap-6 flex-wrap">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Central Age</div>
                            <div className="mt-1 text-[11px] text-slate-400">中心年龄层</div>
                            <div className="text-xl font-semibold text-slate-900 font-mono tabular-nums">{overview.centralAgeRange}</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Mental Age</div>
                            <div className="mt-1 text-[11px] text-slate-400">心理年龄层</div>
                            <div className="text-xl font-semibold text-slate-900 font-mono tabular-nums">{overview.mentalAgeRange}</div>
                        </div>
                    </div>
                    <div className="space-y-1.5 lg:border-l lg:border-slate-100 lg:pl-10 max-w-2xl">
                        {overview.poeticSummary.map((line, i) => (
                            <p key={i} className="text-sm text-slate-600 leading-7">{line}</p>
                        ))}
                    </div>
                </div>
                <MoodCollage
                    images={overview.portraitImages}
                    variant="row"
                    storagePrefix="bp:consumer-portrait"
                    label="Portrait"
                    renderImageSlot={(p) => <ImageSlot {...p} />}
                />
            </div>

            {/* 年龄分层：3 列长文 persona */}
            <div className="mt-10">
                <div className="text-sm text-slate-500 mb-4">年龄层细分及占比</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {segments.map((seg) => {
                        const delta = (seg.actualShare ?? 0) - seg.targetShare;
                        const deltaTone = Math.abs(delta) <= 2 ? 'text-slate-500' : delta > 0 ? 'text-sky-600' : 'text-rose-600';
                        return (
                            <div key={seg.segmentName} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                <div className="flex items-baseline gap-3">
                                    <h4 className="text-lg font-semibold text-slate-800 tracking-tight">{seg.ageRange}</h4>
                                    <span className="text-2xl font-mono tabular-nums text-slate-900">{seg.targetShare}%</span>
                                    {seg.actualShare !== undefined && (
                                        <span className={`text-[11px] font-mono ${deltaTone}`}>
                                            实际 {seg.actualShare}% · {delta >= 0 ? '+' : ''}{delta}pp
                                        </span>
                                    )}
                                </div>
                                <ul className="space-y-1.5">
                                    {seg.personaDescription.map((line, i) => (
                                        <li key={i} className="text-[13px] text-slate-600 leading-7">{line}</li>
                                    ))}
                                </ul>
                                <details open className="pt-3 border-t border-slate-100 group">
                                    <summary className="cursor-pointer list-none flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 select-none">
                                        <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                                        查看企划落地（价格 / 动机 / 标签）
                                    </summary>
                                    <div className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
                                        <Field label="价格接受度" value={`¥${seg.priceAcceptance[0]}-${seg.priceAcceptance[1]}`} />
                                        <Field label="主要动机"   value={seg.purchaseMotivation} />
                                        <Field label="主要阻力"   value={seg.purchaseBarrier} />
                                        <Field label="产品建议"   value={seg.productSuggestion} />
                                    </div>
                                    <div className="mt-3 space-y-1.5">
                                        <TagRow label="职业"     items={seg.occupationTags}     tone="slate" />
                                        <TagRow label="生活方式" items={seg.lifestyleTags}      tone="sky" />
                                        <TagRow label="风格"     items={seg.stylePreference}    tone="violet" />
                                        <TagRow label="场景"     items={seg.scenarioPreference} tone="emerald" />
                                    </div>
                                </details>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 职业子模块（PPT 样式：左标题 + 竖排列表 + 右 4 图非对称拼图） */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
                    <div>
                        <h4 className="text-2xl font-semibold text-slate-800 tracking-[0.6em] pl-1">职 业</h4>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mt-2 pl-1">Occupation</div>
                        <ul className="mt-8 pl-1 space-y-3">
                            {overview.occupations.map((o) => (
                                <li key={o} className="text-sm text-slate-500 tracking-wide">{o}</li>
                            ))}
                        </ul>
                    </div>
                    <MoodCollage
                        images={overview.occupationImages}
                        variant="grid"
                        storagePrefix="bp:consumer-occupation"
                        label="Occupation"
                        renderImageSlot={(p) => <ImageSlot {...p} />}
                    />
                </div>
            </div>
        </section>
    );
}

function TagRow({ label, items, tone }: { label: string; items: string[]; tone: 'slate' | 'sky' | 'violet' | 'emerald' }) {
    const palette: Record<string, string> = {
        slate:   'bg-slate-50 text-slate-600 border-slate-100',
        sky:     'bg-sky-50 text-sky-700 border-sky-100',
        violet:  'bg-violet-50 text-violet-700 border-violet-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };
    return (
        <div className="flex items-start gap-2 text-[11px]">
            <span className="text-slate-400 w-12 flex-shrink-0 pt-0.5">{label}</span>
            <div className="flex flex-wrap gap-1">
                {items.map((t) => (
                    <span key={t} className={`px-1.5 py-0.5 rounded-md border ${palette[tone]}`}>{t}</span>
                ))}
            </div>
        </div>
    );
}

/* ─── 09 生活方式与场景 ────────────────────────────────────────────────── */
function LifestyleScenarioSection({
    overview, items,
}: { overview: LifestyleOverview; items: LifestyleScenarioItem[] }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/15 via-white to-white shadow-sm px-6 lg:px-8 py-8 lg:py-10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <SectionTitle index="09" label="生活方式与场景" hint="品牌承接的 10 个生活方式场景" />

            {/* 杂志层：生活方式 slash 串 + 诗意 + 5 portrait */}
            <div className="mt-6">
                <div className="text-sm text-slate-500 mb-3">生活方式</div>
                <div className="text-xl font-medium text-slate-800 tracking-wide leading-relaxed">
                    {overview.scenarios.map((s, i) => (
                        <span key={s}>
                            {s}
                            {i < overview.scenarios.length - 1 && <span className="text-slate-300 mx-2">/</span>}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
                <div className="space-y-1.5 max-w-md">
                    {overview.poeticSummary.map((line, i) => (
                        <p key={i} className="text-sm text-slate-600 leading-7">{line}</p>
                    ))}
                </div>
                <MoodCollage
                    images={overview.moodImages}
                    variant="center-tall"
                    storagePrefix="bp:lifestyle"
                    label="Lifestyle"
                    renderImageSlot={(p) => <ImageSlot {...p} />}
                />
            </div>

            {/* 10 场景细节卡（折叠） */}
            <details open className="mt-8 group">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 select-none pb-3 border-b border-slate-100">
                    <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                    展开 10 个场景的企划落地（关联品类 / 鞋型 / 设计 / 渠道建议）
                </summary>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {items.map((it) => (
                        <div key={it.scenario} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="text-base font-semibold text-slate-900">{it.scenario}</div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">{it.lifestyleKeyword}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {it.relatedCategory.map((c) => (
                                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-100">{c}</span>
                                ))}
                            </div>
                            <div className="text-[11px] text-slate-600 leading-5 pt-2 border-t border-slate-50">{it.productOpportunity}</div>
                            <div className="text-[10px] text-slate-400">
                                <div>设计 · {it.designSuggestion}</div>
                                <div>渠道 · {it.channelSuggestion}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </details>
        </section>
    );
}

/* ─── 10 品牌策略矩阵 ─────────────────────────────────────────────────── */
const STRATEGY_TONE: Record<StrategyType, { chip: string; label: string }> = {
    'SO 进攻': { chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'SO 进攻' },
    'WO 改良': { chip: 'bg-sky-50 text-sky-700 border-sky-100',             label: 'WO 改良' },
    'ST 防御': { chip: 'bg-amber-50 text-amber-700 border-amber-100',       label: 'ST 防御' },
    'WT 止损': { chip: 'bg-rose-50 text-rose-700 border-rose-100',          label: 'WT 止损' },
};

function StrategyMatrixSection({ items }: { items: BrandStrategyMatrixItem[] }) {
    return (
        <section className="group relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/50 via-white to-purple-50/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(139,92,246,0.30)] hover:border-violet-300 px-6 lg:px-8 py-8 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 opacity-70" />
            <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(237,233,254,0.9)]" />
            <SectionTitle index="10" label="品牌策略矩阵" hint="6 维度 × 4 策略类型 · 当前问题/机会/威胁/动作" />
            <div className="mt-3 rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 text-[11px]">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">维度</th>
                                <th className="px-3 py-2 text-left font-medium">类型</th>
                                <th className="px-3 py-2 text-left font-medium">策略 / 描述</th>
                                <th className="px-3 py-2 text-left font-medium">当前问题</th>
                                <th className="px-3 py-2 text-left font-medium">机会 / 威胁</th>
                                <th className="px-3 py-2 text-left font-medium">预期影响</th>
                                <th className="px-3 py-2 text-left font-medium">关联模块 / 负责人</th>
                                <th className="px-3 py-2 text-left font-medium">状态</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((it) => {
                                const tone = STRATEGY_TONE[it.strategyType];
                                return (
                                    <tr key={it.strategyId} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{it.strategyDimension}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] ${tone.chip}`}>{tone.label}</span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                            <div className="font-medium text-slate-900">{it.strategyName}</div>
                                            <div className="text-slate-500 text-[11px] mt-0.5 leading-5">{it.strategyDescription}</div>
                                        </td>
                                        <td className="px-3 py-2 text-slate-600 max-w-[200px]">{it.currentProblem}</td>
                                        <td className="px-3 py-2 text-slate-600 max-w-[200px]">
                                            <div>机会 · {it.opportunity}</div>
                                            {it.threat !== '—' && <div className="text-rose-600">威胁 · {it.threat}</div>}
                                        </td>
                                        <td className="px-3 py-2 text-emerald-700 max-w-[180px]">{it.expectedImpact}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                            <div>{it.relatedModule}</div>
                                            <div className="text-[10px] text-slate-400">{it.owner}</div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-50 text-slate-600 border border-slate-100">{it.status}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
        </section>
    );
}

/* ─── 11 品牌定位健康度 ───────────────────────────────────────────────── */
function PositioningHealthCheckSection({
    items, onJumpToTab,
}: { items: BrandPositioningHealthCheck[]; onJumpToTab?: (tab: DashboardTab) => void }) {
    const summary = useMemo(() => ({
        risk:        items.filter((x) => x.riskLevel === 'risk').length,
        warning:     items.filter((x) => x.riskLevel === 'warning').length,
        opportunity: items.filter((x) => x.riskLevel === 'opportunity').length,
        healthy:     items.filter((x) => x.riskLevel === 'healthy').length,
        design:      items.filter((x) => x.riskLevel === 'design').length,
    }), [items]);
    return (
        <div className="space-y-4">
            <SectionTitle
                index="11"
                label="品牌定位健康度"
                hint="7 项校验 · 品类边界 / 波段 DNA / OTB / 价格 / 客群 / 竞品 / 设计"
               
                rightSlot={
                    <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        <Pill tone="risk" count={summary.risk} label="风险" />
                        <Pill tone="warning" count={summary.warning} label="预警" />
                        <Pill tone="design" count={summary.design} label="设计" />
                        <Pill tone="opportunity" count={summary.opportunity} label="机会" />
                        <Pill tone="healthy" count={summary.healthy} label="健康" />
                    </div>
                }
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                    {items.map((it) => {
                        const style = STATUS_STYLE[it.riskLevel];
                        return (
                            <div key={it.checkId} className="px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                                <span className={`mt-1.5 w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[180px_1fr_1fr_140px] gap-3 items-start">
                                    <div>
                                        <div className="text-sm font-medium text-slate-800">{it.checkItem}</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">{it.relatedModule}</div>
                                    </div>
                                    <div className="text-xs">
                                        <div className="text-slate-400">目标 · <span className="text-slate-600">{it.targetStandard}</span></div>
                                        <div className="text-slate-400 mt-0.5">当前 · <span className="text-slate-700 font-medium">{it.currentStatus}</span> <span className={style.text}>{it.variance !== '—' && it.variance}</span></div>
                                        {it.riskReason && <div className="text-rose-500 text-[11px] mt-0.5">⚠ {it.riskReason}</div>}
                                    </div>
                                    <div className="text-xs text-slate-700 leading-5">{it.recommendedAction}</div>
                                    <div className="text-right">
                                        <button
                                            type="button"
                                            onClick={() => onJumpToTab && onJumpToTab(mapRelatedToDashboardTab(it.relatedModule))}
                                            disabled={!onJumpToTab}
                                            className="text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 transition-colors"
                                        >
                                            {it.jumpAction} ↗
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Pill({ tone, count, label }: { tone: RiskLevel; count: number; label: string }) {
    const style = STATUS_STYLE[tone];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${style.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            <span className="font-medium">{count}</span>
            <span>{label}</span>
        </span>
    );
}

const RELATED_TO_TAB: Record<string, DashboardTab> = {
    '消费者画像':   'consumer',
    '竞品&趋势':    'competitor',
    '品类运营':     'category',
    '波段企划':     'planning',
    'OTB预算':      'otb',
    '损益':         'profit-loss',
    '现金流':       'cashflow',
    '区域&门店':    'channel',
    '库存健康':     'inventory',
    '年度总控':     'annual-control',
    '总览':         'overview',
};

function mapRelatedToDashboardTab(label: string): DashboardTab {
    // 取第一个匹配到的关键词（如 "区域&门店 / 竞品&趋势" → 区域&门店）
    const key = Object.keys(RELATED_TO_TAB).find((k) => label.startsWith(k) || label.includes(k));
    return key ? RELATED_TO_TAB[key] : 'overview';
}

/* ─── 12 定位到企划输出 ───────────────────────────────────────────────── */
function PlanningOutputSection({ items }: { items: BrandPositioningPlanningOutput[] }) {
    return (
        <div className="space-y-4">
            <SectionTitle index="12" label="定位到企划输出" hint="品牌定位 → 各企划模块的标准输出" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {items.map((out) => (
                    <div key={out.outputId} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-5 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-base">{out.targetIcon}</span>
                            <span className="text-sm font-semibold text-slate-800">{out.targetModule}</span>
                        </div>
                        <ul className="space-y-1.5 pt-2 border-t border-slate-100">
                            {out.outputs.map((o) => (
                                <li key={o.label} className="text-[11px]">
                                    <div className="text-slate-400">{o.label}</div>
                                    <div className="text-slate-700 leading-5">{o.value}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── 13 跨模块联动入口 ───────────────────────────────────────────────── */
function RelatedModuleLinksSection({
    items, onJumpToTab,
}: { items: BrandPositioningRelatedModuleLink[]; onJumpToTab?: (tab: DashboardTab) => void }) {
    return (
        <div className="space-y-4">
            <SectionTitle index="13" label="跨模块联动入口" hint="品牌定位与下游模块的关系 + 动作化入口" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-3">
                {items.map((it) => {
                    const tab = mapRelatedToDashboardTab(it.targetModule);
                    const isExternal = it.targetModule === '设计计划';
                    return (
                        <button
                            key={it.linkId}
                            type="button"
                            onClick={() => isExternal ? window.location.assign('/design-review-center') : onJumpToTab?.(tab)}
                            disabled={!isExternal && !onJumpToTab}
                            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 text-left space-y-2 hover:border-sky-300 hover:bg-sky-50/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-base">{it.targetIcon}</span>
                                <span className="text-sm font-semibold text-slate-800">{it.targetModule}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 leading-5">{it.relationship}</div>
                            <div className="text-[11px] text-sky-700 font-medium pt-2 border-t border-slate-100">
                                {it.actionLabel} ↗
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
