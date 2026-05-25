'use client';

import { useTrendInsightData } from '@/hooks/useTrendInsightData';
import TrendSourceRadarPanel from './trend/TrendSourceRadarPanel';
import MacroTrendGridPanel from './trend/MacroTrendGridPanel';
import SeasonalColorPalettePanel from './trend/SeasonalColorPalettePanel';
import SilhouetteMaterialPanel from './trend/SilhouetteMaterialPanel';
import PatternDetailPanel from './trend/PatternDetailPanel';
import ShortTermHotspotPanel from './trend/ShortTermHotspotPanel';
import TrendFilterBar from './trend-insight/TrendFilterBar';
import TrendFitScorePanel from './trend-insight/TrendFitScorePanel';
import VisualLanguageMatrix from './trend-insight/VisualLanguageMatrix';
import FootwearTranslationMatrix from './trend-insight/FootwearTranslationMatrix';
import MerchPlanningOutputTable from './trend-insight/MerchPlanningOutputTable';
import DesignBriefPanel from './trend-insight/DesignBriefPanel';
import TrendVisualMoodboard from './trend-insight/TrendVisualMoodboard';
import VisualElementBoard from './trend-insight/VisualElementBoard';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import MerchSectionDivider from './MerchSectionDivider';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { buildMerchModuleLinks } from '@/config/dashboard/merch-module-links';

function formatInheritedFilters(filters?: DashboardFilters) {
    if (!filters) return ['继承 Dashboard 全局筛选'];
    const chips: string[] = [];
    if (filters.season_year !== 'all') chips.push(`${filters.season_year}年`);
    if (filters.season !== 'all') chips.push(filters.season);
    if (filters.wave !== 'all') chips.push(filters.wave);
    if (filters.brand !== 'all') chips.push(filters.brand);
    if (filters.category_l1 !== 'all') chips.push(filters.category_l1);
    if (filters.category_id !== 'all') chips.push(filters.category_id);
    if (filters.sub_category !== 'all') chips.push(filters.sub_category);
    if (filters.channel_type !== 'all') chips.push(filters.channel_type);
    if (filters.price_band !== 'all') chips.push(filters.price_band);
    if (filters.target_audience !== 'all') chips.push(filters.target_audience);
    if (filters.region !== 'all') chips.push(filters.region);
    return chips.length > 0 ? chips : ['全部品牌', '全部季节', '全部品类', '全渠道'];
}

function SectionCard({
    label,
    title,
    description,
    badge,
    badgeColor,
    children,
}: {
    label: string;
    title: string;
    description: string;
    badge?: string;
    badgeColor?: 'emerald' | 'blue' | 'purple' | 'rose' | 'amber';
    children: React.ReactNode;
}) {
    const badgeStyles: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        purple: 'bg-violet-50 text-violet-700 border-violet-200',
        rose: 'bg-rose-50 text-rose-700 border-rose-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-1">
                        {label}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-400 to-violet-400 rounded-full" />
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{description}</p>
                </div>
                {badge && badgeColor && (
                    <span
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${badgeStyles[badgeColor]}`}
                    >
                        {badge}
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                {title}
            </div>
            {children}
        </div>
    );
}

const SECTION_ANCHORS = [
    { id: 'sec-trend-sources',   label: '01 趋势来源' },
    { id: 'sec-macro-trends',    label: '02 宏观趋势' },
    { id: 'sec-color',           label: '03 色彩企划' },
    { id: 'sec-silhouette',      label: '04 廓形材质' },
    { id: 'sec-pattern',         label: '05 图案细节' },
    { id: 'sec-hotspot',         label: '06 短时热点' },
    { id: 'sec-info-sources',    label: '07 资讯来源' },
];

function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const ic = 'w-2.5 h-2.5';
const TREND_PAGE_SECTIONS = [
  { anchor: '#sec-moodboard', label: '趋势主题', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6.5" height="8" rx="1" /><rect x="9.5" y="1" width="5.5" height="4" rx="1" /><rect x="9.5" y="7" width="5.5" height="8" rx="1" /><rect x="1" y="11" width="6.5" height="4" rx="1" /></svg>) },
  { anchor: '#sec-trend-sources', label: '来源扫描', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="6.5" r="4.5" /><line x1="9.5" y1="9.5" x2="14" y2="14" /></svg>) },
  { anchor: '#sec-macro-trends', label: '宏观趋势', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,12 5,8 8.5,10 12,5 14,7" /><polyline points="11,4 14,4 14,7" /></svg>) },
  { anchor: '#sec-color', label: '色彩企划', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6"><circle cx="5" cy="5" r="3" fill="currentColor" opacity="0.3" stroke="none" /><circle cx="11" cy="5" r="3" fill="currentColor" opacity="0.5" stroke="none" /><circle cx="8" cy="10" r="3" fill="currentColor" opacity="0.7" stroke="none" /></svg>) },
  { anchor: '#sec-silhouette', label: '廓形材质', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13 C3 9 5 5 8 3 C11 5 13 9 13 13 Z" /></svg>) },
  { anchor: '#sec-pattern', label: '图案细节', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="4" cy="4" r="1.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="4" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="8" cy="8" r="1.5" /></svg>) },
  { anchor: '#sec-hotspot', label: '流行热点', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2 C8 2 12 5 12 9 C12 11.2 10.2 13 8 13 C5.8 13 4 11.2 4 9 C4 6 7 4 7 4 C7 6 8 7 9 7 C9 7 8.5 5 8 2 Z" /></svg>) },
  { anchor: '#sec-info-sources', label: '信息来源', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="1.5" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="9" x2="9" y2="9" /></svg>) },
];

export default function TrendInsightPanel({
    filters,
    onJumpToTab,
}: {
    filters?: DashboardFilters;
    onJumpToTab?: (tab: string) => void;
}) {
    const data = useTrendInsightData(filters);
    const selectedStatus = data.selectedTheme
        ? data.trendStatuses[data.selectedTheme.id] ?? data.selectedTheme.defaultStatus
        : null;

    return (
        <div className="space-y-6">
            {/* ── Hero moodboard ── */}
            {data.selectedTheme && (
                <section id="sec-moodboard" className="scroll-mt-24">
                <MerchSectionDivider label="A" title="趋势主题速览" />
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            本季主推趋势 · 综合适配分 {data.selectedTheme.fitScores?.overall ?? '—'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                            在下方「02 宏观趋势」点击卡片可切换查看
                        </span>
                    </div>
                    <TrendVisualMoodboard theme={data.selectedTheme} status={selectedStatus} />
                </section>
            )}

            {/* 01 TREND SOURCES */}
            <section id="sec-trend-sources" className="scroll-mt-24">
            <MerchSectionDivider label="B" title="流行趋势来源" />
            <SectionCard
                label="01 TREND SOURCES"
                title="流行趋势来源扫描"
                description="8大社会驱动因子本季对鞋类商品企划的影响强度与关键信号。"
            >
                <TrendSourceRadarPanel sources={data.trendSources} />
            </SectionCard>
            </section>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500">
                        继承全局筛选
                    </span>
                    {formatInheritedFilters(filters).map((chip) => (
                        <span
                            key={chip}
                            className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700"
                        >
                            {chip}
                        </span>
                    ))}
                    <span className="ml-auto text-[11px] text-blue-500">
                        趋势页仅新增来源、周期、类型和状态筛选
                    </span>
                </div>
            </div>

            {/* 筛选条 */}
            <TrendFilterBar
                filters={data.filters}
                onChange={data.setFilters}
                resultCount={data.filteredThemes.length}
            />

            {/* 02 MACRO TRENDS */}
            <section id="sec-macro-trends" className="scroll-mt-24">
            <MerchSectionDivider label="C" title="宏观趋势主题" />
            <SectionCard
                label="02 MACRO TRENDS"
                title="本季趋势主题"
                description="点击趋势卡进入转译工作台，查看视觉语言解构、鞋型转译矩阵和商品企划输出。"
                badge="点击卡片查看详情"
                badgeColor="blue"
            >
                <MacroTrendGridPanel
                    trends={data.filteredThemes}
                    statuses={data.trendStatuses}
                    onStatusChange={data.updateTrendStatus}
                    selectedId={data.selectedTheme?.id}
                    onSelect={data.setSelectedThemeId}
                />
            </SectionCard>
            </section>

            {/* 趋势转译工作台 */}
            {data.selectedTheme && (
                <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-6">
                    {/* 工作台标题 */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400 mb-1">
                                TREND TRANSLATION WORKBENCH
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <div className="w-1 h-5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
                                趋势转译工作台：{data.selectedTheme.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {data.selectedTheme.trendType} · {data.selectedTheme.trendCycle} · 来源：{data.selectedTheme.sourceType}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${data.selectedTheme.tagColor} ${data.selectedTheme.tagTextColor}`}>
                                {selectedStatus}
                            </span>
                            <span className="text-[11px] px-2.5 py-1 rounded-full border font-medium bg-blue-50 text-blue-600 border-blue-200">
                                优先级 {data.selectedTheme.priority}
                            </span>
                        </div>
                    </div>

                    {/* 适配评分 */}
                    {data.selectedTheme.fitScores && (
                        <SubSection title="适配评分">
                            <TrendFitScorePanel
                                scores={data.selectedTheme.fitScores}
                                trendType={data.selectedTheme.trendType}
                            />
                        </SubSection>
                    )}

                    {/* 视觉语言 */}
                    {data.selectedTheme.visualLanguage && (
                        <SubSection title="视觉语言解构">
                            <VisualLanguageMatrix vl={data.selectedTheme.visualLanguage} />
                        </SubSection>
                    )}

                    {/* 色彩图文拆解 */}
                    {(data.selectedTheme.colorElements?.length ?? 0) > 0 && (
                        <SubSection title="色彩图文拆解">
                            <VisualElementBoard
                                title="色彩图文拆解"
                                description="从色相、明度、饱和度、比例和鞋类使用部位判断色彩是否可商品化。"
                                elements={data.selectedTheme.colorElements ?? []}
                                tone="color"
                            />
                        </SubSection>
                    )}

                    {/* 材质图文拆解 */}
                    {(data.selectedTheme.materialElements?.length ?? 0) > 0 && (
                        <SubSection title="材质图文拆解">
                            <VisualElementBoard
                                title="材质图文拆解"
                                description="把材质趋势拆成触感、光泽、轻重感、工艺和供应链可实现性。"
                                elements={data.selectedTheme.materialElements ?? []}
                                tone="material"
                            />
                        </SubSection>
                    )}

                    {/* 图案细节图文拆解 */}
                    {((data.selectedTheme.patternElements?.length ?? 0) + (data.selectedTheme.detailElements?.length ?? 0)) > 0 && (
                        <SubSection title="图案与细节图文拆解">
                            <VisualElementBoard
                                title="图案与细节图文拆解"
                                description="判断图案和细节是适合大面积使用、局部点缀、内容传播，还是只适合快反测试。"
                                elements={[...(data.selectedTheme.patternElements ?? []), ...(data.selectedTheme.detailElements ?? [])]}
                                tone="pattern"
                            />
                        </SubSection>
                    )}

                    {/* 造型结构图文拆解 */}
                    {(data.selectedTheme.silhouetteElements?.length ?? 0) > 0 && (
                        <SubSection title="造型结构图文拆解">
                            <VisualElementBoard
                                title="造型结构图文拆解"
                                description="把楦型、鞋头、底厚、帮高、鞋身比例转成可开发的鞋类结构语言。"
                                elements={data.selectedTheme.silhouetteElements ?? []}
                                tone="silhouette"
                            />
                        </SubSection>
                    )}

                    {/* 鞋类转译 */}
                    {data.selectedTheme.footwearTranslation && (
                        <SubSection title="鞋类转译矩阵">
                            <FootwearTranslationMatrix ft={data.selectedTheme.footwearTranslation} />
                        </SubSection>
                    )}

                    {/* 商品企划输出 */}
                    {data.selectedTheme.planningOutput && data.selectedTheme.planningOutput.length > 0 && (
                        <SubSection title="商品企划输出">
                            <MerchPlanningOutputTable
                                rows={data.selectedTheme.planningOutput}
                                onJumpToTab={onJumpToTab}
                            />
                        </SubSection>
                    )}

                    {/* 设计 Brief */}
                    {data.selectedTheme.designOutput && (
                        <SubSection title="设计 Brief">
                            <DesignBriefPanel output={data.selectedTheme.designOutput} />
                        </SubSection>
                    )}
                </div>
            )}

            {/* 03 COLOR DIRECTION */}
            <section id="sec-color" className="scroll-mt-24">
            <MerchSectionDivider label="D" title="色彩企划" />
            <SectionCard
                label="03 COLOR DIRECTION"
                title="季节色彩企划"
                description="本季主推色/基础色/撞色/点缀色，每个色彩的鞋类应用建议。"
            >
                <SeasonalColorPalettePanel swatches={data.colorSwatches} />
            </SectionCard>
            </section>

            {/* 04 SILHOUETTE & MATERIAL */}
            <section id="sec-silhouette" className="scroll-mt-24">
            <MerchSectionDivider label="E" title="廓形与材质" />
            <SectionCard
                label="04 SILHOUETTE & MATERIAL"
                title="廓形与材质趋势"
                description="底厚/楦型/帮高/整体廓形走向，以及鞋面材质本季趋势信号。"
            >
                <SilhouetteMaterialPanel
                    silhouettes={data.silhouetteDirections}
                    materials={data.materialDirections}
                />
            </SectionCard>
            </section>

            {/* 05 PATTERN & DETAILS */}
            <section id="sec-pattern" className="scroll-mt-24">
            <MerchSectionDivider label="F" title="图案与工艺" />
            <SectionCard
                label="05 PATTERN & DETAILS"
                title="图案与工艺细节"
                description="本季流行图案方向、鞋面工艺细节、功能件趋势，点击查看参考品牌和应用建议。"
            >
                <PatternDetailPanel patterns={data.patternDetails} />
            </SectionCard>
            </section>

            {/* 06 SHORT-TERM HOT */}
            <section id="sec-hotspot" className="scroll-mt-24">
            <MerchSectionDivider label="G" title="短时流行热点" />
            <SectionCard
                label="06 SHORT-TERM HOT"
                title="短时流行热点"
                description="小红书/抖音/Instagram当季爆款与上升款——峰值窗口、机会描述和参考关键词。"
                badge="市场热点"
                badgeColor="rose"
            >
                <ShortTermHotspotPanel hotspots={data.hotspots} />
            </SectionCard>
            </section>

            {/* 07 INFO SOURCES */}
            <section id="sec-info-sources" className="scroll-mt-24">
            <MerchSectionDivider label="H" title="信息来源" />
            <SectionCard
                label="07 INFO SOURCES"
                title="流行资讯获取来源"
                description="商品企划流行趋势研究的标准信息渠道：展会、时装周、杂志、社媒平台和数据工具。"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {data.infoSources.map((src) => (
                        <div key={src.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between mb-1.5">
                                <span className="text-sm font-semibold text-slate-800">{src.name}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                    {src.type}
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mb-1">最近查阅：{src.lastChecked}</div>
                            <p className="text-xs text-slate-500 leading-[1.5]">{src.note}</p>
                        </div>
                    ))}
                </div>
            </SectionCard>
            </section>

            <FloatingModuleNav
                moduleLinks={buildMerchModuleLinks('trend')}
                pageSections={TREND_PAGE_SECTIONS}
            />
        </div>
    );
}
