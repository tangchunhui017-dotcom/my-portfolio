'use client';
/**
 * src/components/forecast/ForecastTab.tsx
 * 销售预测 Tab — V8 鞋类业务 × 产品体验双视角
 * S1-S18: 渠道卡·多情景·参数·KPI·准确率·趋势图·月表·渠道驱动·品类结构·尺码风险·情景概率·输出口径
 */
import { useState } from 'react';
import { useForecast } from '@/hooks/useForecast';
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import ForecastMethodSwitcher from './ForecastMethodSwitcher';
import ForecastDriverPanel from './ForecastDriverPanel';
import ForecastMonthlyTable from './ForecastMonthlyTable';
import EcommerceCostPanel from './EcommerceCostPanel';
import NewStoreValidationPanel from './NewStoreValidationPanel';
import MerchMixForecastPanel from './MerchMixForecastPanel';
import PhysicalStoreDriverPanel from './PhysicalStoreDriverPanel';
import EcommerceFunnelPanel from './EcommerceFunnelPanel';
import NewStoreRampPanelV2 from './NewStoreRampPanelV2';
import SalesForecastSizeRiskPanel from './SalesForecastSizeRiskPanel';
import ForecastAccuracyCard from './ForecastAccuracyCard';
import MultiScenarioChart from './MultiScenarioChart';
import TemperatureSensitivityScatter from './TemperatureSensitivityScatter';
import ChannelSynergyPanel from './ChannelSynergyPanel';
import MarketShareForecast from './MarketShareForecast';
import ScenarioProbabilityPanel from './ScenarioProbabilityPanel';
import SalesForecastDownstreamOutputV2 from './SalesForecastDownstreamOutputV2';
import accuracyRaw from '../../../data/planning/sales_forecast_accuracy_history.json';
import memberRaw from '../../../data/planning/sales_forecast_member_contribution.json';

type MemberData = Record<string, { overallRate: number }>;
const memberData = memberRaw as unknown as MemberData;

// ── 渠道健康度（基于上期预测准确率）──────────────────────────────────────────
type AccuracyData = {
    channels: Record<string, { quarters: Array<{ period: string; accuracy: number; deviation: number }> }>;
};
const accuracyData = accuracyRaw as AccuracyData;

function getChannelHealth(channel: ForecastChannel): { dot: string; label: string; cls: string } {
    const quarters = accuracyData.channels[channel]?.quarters ?? [];
    if (quarters.length === 0) return { dot: '⚪', label: '无数据', cls: 'bg-slate-100 text-slate-500' };
    const latest = quarters[quarters.length - 1];
    const acc = latest.accuracy;
    if (acc >= 0.93) return { dot: '✓', label: `精度 ${(acc * 100).toFixed(0)}%`, cls: 'bg-emerald-500 text-white' };
    if (acc >= 0.85) return { dot: '⚠', label: `精度 ${(acc * 100).toFixed(0)}%`, cls: 'bg-amber-500 text-white' };
    return { dot: '✗', label: `精度 ${(acc * 100).toFixed(0)}%`, cls: 'bg-rose-500 text-white' };
}

// ── 渠道 UI 类型（含全渠道）──────────────────────────────────────────────────
type ChannelUI = ForecastChannel | 'all';

const CHANNEL_CARDS: {
    key: ChannelUI; label: string; icon: string;
    activeBg: string; activeBorder: string; accentText: string; desc: string;
}[] = [
    {
        key: 'physical', label: '实体店', icon: '🏪',
        activeBg: 'bg-sky-500', activeBorder: 'border-sky-500', accentText: 'text-sky-700',
        desc: '门店等级 · 坪效 · 客流 · 成交率 · 区域气温',
    },
    {
        key: 'ecommerce', label: '电商', icon: '🛒',
        activeBg: 'bg-violet-500', activeBorder: 'border-violet-500', accentText: 'text-violet-700',
        desc: '漏斗转化 · 活动节奏 · 平台结构 · 退货率',
    },
    {
        key: 'new_store', label: '新店', icon: '🆕',
        activeBg: 'bg-emerald-500', activeBorder: 'border-emerald-500', accentText: 'text-emerald-700',
        desc: '开店计划 · 爬坡曲线 · 首铺结构 · 盈亏平衡',
    },
    {
        key: 'all', label: '全渠道汇总', icon: '🌐',
        activeBg: 'bg-slate-700', activeBorder: 'border-slate-700', accentText: 'text-slate-700',
        desc: '三渠道合并 · 协同效应 · 竞争市场 · 品牌总盘',
    },
];

const SCENARIOS: { key: ForecastScenario; label: string; activeColor: string }[] = [
    { key: 'conservative', label: '保守', activeColor: 'text-amber-600 bg-amber-50 border-amber-300 shadow-sm' },
    { key: 'base', label: '基准', activeColor: 'text-sky-600 bg-sky-50 border-sky-300 shadow-sm' },
    { key: 'optimistic', label: '乐观', activeColor: 'text-emerald-600 bg-emerald-50 border-emerald-300 shadow-sm' },
];

const CHANNEL_COLORS: Record<ForecastChannel, string> = {
    physical: 'bg-sky-500', ecommerce: 'bg-violet-500', new_store: 'bg-emerald-500',
};

// ── 辅助组件 ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, tone = 'default' }: {
    label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'default';
}) {
    const tc = { positive: 'text-emerald-600', negative: 'text-rose-600', warning: 'text-amber-600', default: 'text-slate-800' }[tone];
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <div className="text-[10px] text-slate-400 mb-1">{label}</div>
            <div className={`text-base font-bold ${tc}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
    );
}

function SectionCard({ title, sub, children, badge }: {
    title: string; sub?: string; children: React.ReactNode; badge?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-start justify-between gap-2">
                <div>
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
                </div>
                {badge}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

// ── 全渠道汇总KPI ─────────────────────────────────────────────────────────────
function AllChannelKpis({ scenario }: { scenario: ForecastScenario }) {
    const physical = useForecast('physical', scenario);
    const ecommerce = useForecast('ecommerce', scenario);
    const newStore = useForecast('new_store', scenario);
    if (!physical || !ecommerce || !newStore) return <div className="h-16 text-slate-400 text-xs flex items-center justify-center">加载中…</div>;
    const total = physical.annualForecast + ecommerce.annualForecast + newStore.annualForecast;
    const totalBase = physical.monthly.reduce((s, m) => s + m.baseRevenue, 0)
        + ecommerce.monthly.reduce((s, m) => s + m.baseRevenue, 0)
        + newStore.monthly.reduce((s, m) => s + m.baseRevenue, 0);
    const totalYoY = totalBase > 0 ? (total - totalBase) / totalBase : 0;
    const totalPairs = physical.forecastPairs + ecommerce.forecastPairs + newStore.forecastPairs;
    const physShare = total > 0 ? physical.annualForecast / total : 0;
    const ecomShare = total > 0 ? ecommerce.annualForecast / total : 0;
    const nsShare = total > 0 ? newStore.annualForecast / total : 0;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard label="品牌年度总预测" value={formatMoneyCny(total)} tone="default" />
            <KpiCard label="品牌YoY" value={`${totalYoY >= 0 ? '+' : ''}${(totalYoY * 100).toFixed(1)}%`} tone={totalYoY >= 0 ? 'positive' : 'negative'} />
            <KpiCard label="品牌总双数" value={totalPairs.toLocaleString()} sub="双" />
            <KpiCard label="实体店占比" value={`${(physShare * 100).toFixed(0)}%`} sub={formatMoneyCny(physical.annualForecast)} />
            <KpiCard label="电商占比" value={`${(ecomShare * 100).toFixed(0)}%`} sub={formatMoneyCny(ecommerce.annualForecast)} />
            <KpiCard label="新店占比" value={`${(nsShare * 100).toFixed(0)}%`} sub={formatMoneyCny(newStore.annualForecast)} />
            <KpiCard label="月均品牌销售" value={formatMoneyCny(total / 12)} sub="三渠道合并" />
        </div>
    );
}

// ── 渠道KPI（单渠道）─────────────────────────────────────────────────────────
function ChannelKpis({ channel, scenario, grossMarginRate, refundRate }: {
    channel: ForecastChannel; scenario: ForecastScenario; grossMarginRate: number; refundRate: number;
}) {
    const result = useForecast(channel, scenario);
    if (!result) return <div className="h-16 text-slate-400 text-xs flex items-center justify-center">加载中…</div>;

    const memberRate = memberData[channel]?.overallRate ?? 0;
    const kpiFootwear: Array<{ label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'default' }> = [];
    if (channel === 'physical') {
        kpiFootwear.push(
            { label: '连带件数', value: '1.82', sub: '双/单' },
            { label: '尺码完整率', value: '91.5%', sub: '目标95%', tone: 'warning' },
            { label: '会员贡献占比', value: `${(memberRate * 100).toFixed(0)}%`, sub: '会员销售/总销售', tone: 'positive' },
            { label: '气温敏感系数', value: '0.68', sub: '旺季弹性高' },
        );
    } else if (channel === 'ecommerce') {
        kpiFootwear.push(
            { label: '综合退款率', value: `${(refundRate * 100).toFixed(1)}%`, sub: '净销售率' + `${((1 - refundRate) * 100).toFixed(1)}%`, tone: refundRate > 0.3 ? 'warning' : 'default' },
            { label: '会员贡献占比', value: `${(memberRate * 100).toFixed(0)}%`, sub: '复购+老客', tone: 'positive' },
            { label: '配对率', value: '67.2%', sub: '买双鞋概率' },
            { label: 'ROAS', value: '4.2×', sub: '广告回报' },
        );
    } else {
        kpiFootwear.push(
            { label: '新开门店数', value: '4', sub: '本年计划' },
            { label: '首铺尺码完整率', value: '88%', sub: '目标95%', tone: 'warning' },
            { label: '会员转化率', value: `${(memberRate * 100).toFixed(0)}%`, sub: '新店首年会员', tone: 'positive' },
            { label: 'Year1目标完成', value: '82%', sub: '综合预估' },
        );
    }

    return (
        <div className="space-y-3">
            {/* 4 通用KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="年度预测额" value={formatMoneyCny(result.annualForecast)} />
                <KpiCard label="YoY增长" value={`${result.annualYoY >= 0 ? '+' : ''}${(result.annualYoY * 100).toFixed(1)}%`} tone={result.annualYoY >= 0 ? 'positive' : 'negative'} />
                <KpiCard label="月均销售" value={formatMoneyCny(result.monthlyAvg)} />
                <KpiCard label="损益平衡差额" value={formatMoneyCny(result.breakEvenGap)} tone={result.breakEvenGap >= 0 ? 'positive' : 'negative'} sub={result.breakEvenGap >= 0 ? '高于平衡点' : '▼ 低于平衡点'} />
            </div>
            {/* 4 鞋类专属KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {kpiFootwear.map(k => <KpiCard key={k.label} {...k} />)}
            </div>
            {result.isEstimated && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
                    <span>⚠️</span><span>基准数据来自假设参数，以下预测为估算值。</span>
                </div>
            )}
        </div>
    );
}

// ── 渠道月度图 ────────────────────────────────────────────────────────────────
function ChannelMonthlyChart({ channel, scenario, activeScenarios }: {
    channel: ForecastChannel; scenario: ForecastScenario; activeScenarios: ForecastScenario[];
}) {
    const result = useForecast(channel, scenario);
    if (!result) return null;
    return (
        <div className="space-y-4">
            <MultiScenarioChart channel={channel} activeScenarios={activeScenarios} />
            <ForecastMonthlyTable result={result} channel={channel} />
        </div>
    );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function ForecastTab() {
    const [activeChannel, setActiveChannel] = useState<ChannelUI>('physical');
    const [activeScenarios, setActiveScenarios] = useState<ForecastScenario[]>(['base']);
    const [driverOpen, setDriverOpen] = useState(true);
    const { config, updateForecast } = useGlobalConfig();

    const primaryScenario: ForecastScenario = activeScenarios[0] ?? 'base';
    const isSingleChannel = activeChannel !== 'all';
    const singleChannel = isSingleChannel ? (activeChannel as ForecastChannel) : 'physical';

    // Hook — always called (rules of hooks)
    const primaryResult = useForecast(singleChannel, primaryScenario);

    const toggleScenario = (sc: ForecastScenario) => {
        setActiveScenarios(prev => {
            if (prev.includes(sc)) {
                // Keep at least one
                const next = prev.filter(s => s !== sc);
                return next.length > 0 ? next : [sc];
            }
            return [...prev, sc];
        });
    };

    const channelMeta = CHANNEL_CARDS.find(c => c.key === activeChannel)!;

    return (
        <div className="space-y-5">
            {/* ── S1: 渠道卡（4个）+ 预测健康度徽章 ───────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHANNEL_CARDS.map(c => {
                    const health = c.key === 'all' ? null : getChannelHealth(c.key as ForecastChannel);
                    return (
                        <button key={c.key} onClick={() => setActiveChannel(c.key)}
                            className={`relative flex items-start gap-2.5 px-3.5 py-3 rounded-2xl text-left border transition-all ${
                                activeChannel === c.key
                                    ? `${c.activeBg} text-white border-transparent shadow-md`
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}>
                            <span className="text-lg leading-none mt-0.5">{c.icon}</span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="font-semibold text-sm">{c.label}</div>
                                    {health && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none ${health.cls}`} title={`上季预测${health.label}`}>
                                            {health.dot}
                                        </span>
                                    )}
                                </div>
                                <div className={`text-[10px] mt-0.5 leading-snug ${activeChannel === c.key ? 'opacity-75' : 'text-slate-400'}`}>{c.desc}</div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── S2: 预测方法 + 多情景选择 ──────────────────────────────── */}
            <div className="flex items-center gap-4 flex-wrap bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
                <ForecastMethodSwitcher method={config.forecast.method} onChange={m => updateForecast({ method: m })} />
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">情景（可多选）:</span>
                    {SCENARIOS.map(s => {
                        const isActive = activeScenarios.includes(s.key);
                        return (
                            <button key={s.key} onClick={() => toggleScenario(s.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                    isActive ? s.activeColor : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}>
                                {s.label}
                                {isActive && activeScenarios.length > 1 && <span className="ml-1 opacity-60">●</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── S3: 驱动参数（仅单渠道时展示）──────────────────────────── */}
            {isSingleChannel && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setDriverOpen(o => !o)}>
                        <span className="flex items-center gap-2">
                            <span>⚙️</span>
                            <span>预测输入参数</span>
                            <span className="text-[10px] font-normal text-slate-400">{channelMeta.desc}</span>
                        </span>
                        <span className="text-slate-400 text-xs">{driverOpen ? '▲ 折叠' : '▼ 展开'}</span>
                    </button>
                    {driverOpen && (
                        <div className="px-5 pb-4 border-t border-slate-50">
                            <ForecastDriverPanel channel={singleChannel} />
                        </div>
                    )}
                </div>
            )}

            {/* ── S4: KPI 看板 ──────────────────────────────────────────── */}
            {activeChannel === 'all' ? (
                <AllChannelKpis scenario={primaryScenario} />
            ) : (
                <ChannelKpis
                    channel={singleChannel}
                    scenario={primaryScenario}
                    grossMarginRate={config.brand.grossMarginRate}
                    refundRate={singleChannel === 'ecommerce' ? config.ecommerceDrivers.refundRate : 0}
                />
            )}

            {/* ── S5: 预测精度校准报告（单渠道）───────────────────────────── */}
            {isSingleChannel && (
                <ForecastAccuracyCard channel={singleChannel} />
            )}

            {/* ── S6: 多情景趋势图 + S7: 月度明细表（单渠道）─────────────── */}
            {isSingleChannel && (
                <SectionCard
                    title="多情景趋势对比 + 月度预测明细"
                    sub={`渠道：${channelMeta.label} · 主情景：${SCENARIOS.find(s => s.key === primaryScenario)?.label}`}
                    badge={
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <div className={`w-2 h-2 rounded-full ${CHANNEL_COLORS[singleChannel]}`} />
                            {channelMeta.label}
                        </div>
                    }
                >
                    <ChannelMonthlyChart channel={singleChannel} scenario={primaryScenario} activeScenarios={activeScenarios} />
                </SectionCard>
            )}

            {/* ── S8/S9/S10: 渠道专属驱动面板 ──────────────────────────── */}
            {activeChannel === 'physical' && (
                <>
                    <SectionCard title="实体店经营驱动拆解" sub="门店等级预测 · 客流成交率坪效联动 · 区域气温影响">
                        <PhysicalStoreDriverPanel />
                    </SectionCard>
                    <SectionCard title="气温-销售相关性分析" sub="S10a 散点回归 + 区域对比 + What-if 气温情景">
                        <TemperatureSensitivityScatter />
                    </SectionCard>
                </>
            )}
            {activeChannel === 'ecommerce' && (
                <SectionCard title="电商漏斗 · 活动日历 · 平台结构" sub="月度漏斗预测 · 大促节奏 · 平台GMV拆分 · 净销售率">
                    <EcommerceFunnelPanel />
                    {primaryResult?.ecommerceDriverRows && primaryResult.ecommerceDriverRows.length > 0 && (
                        <div className="mt-5">
                            <EcommerceCostPanel rows={primaryResult.ecommerceDriverRows} />
                        </div>
                    )}
                </SectionCard>
            )}
            {activeChannel === 'new_store' && (
                <>
                    <SectionCard title="新店开店计划 · 爬坡模型 V2" sub="S9c 鞋类专属风险因子：尺码完整率 · 波段错位 · 新品占比">
                        <NewStoreRampPanelV2 />
                    </SectionCard>
                    {primaryResult?.newStoreValidation && (
                        <SectionCard title="开店合规校验">
                            <NewStoreValidationPanel data={primaryResult.newStoreValidation} />
                        </SectionCard>
                    )}
                </>
            )}

            {/* ── S13: 三渠道协同（全渠道视图）──────────────────────────── */}
            {activeChannel === 'all' && (
                <SectionCard title="三渠道协同视图" sub="S13 月度堆叠结构 · 客流转移 · 价格倒挂风险">
                    <ChannelSynergyPanel />
                </SectionCard>
            )}

            {/* ── S14: 竞争市场视角（全渠道）────────────────────────────── */}
            {activeChannel === 'all' && (
                <SectionCard title="竞争市场视角" sub="S14 行业规模 · 我的份额 · 竞品威胁评估">
                    <MarketShareForecast />
                </SectionCard>
            )}

            {/* ── S15: 货品结构（所有视图底部共享）─────────────────────── */}
            <SectionCard title="货品结构拆解" sub="品类 · 价格带 · 新旧品 · 波段结构（全渠道视角）">
                <MerchMixForecastPanel scenario={primaryScenario} channel={activeChannel === 'all' ? 'brand' : singleChannel} />
            </SectionCard>

            {/* ── S16: 尺码风险（默认展开）──────────────────────────────── */}
            <SectionCard title="👟 鞋类专属：尺码结构风险 + 波段上市节奏校验" sub="S16 默认展开 · 关注高断码风险SKU">
                <SalesForecastSizeRiskPanel />
            </SectionCard>

            {/* ── S17: 情景概率对比 + 加权期望值 ────────────────────────── */}
            <SectionCard title="情景概率对比 + 加权期望值" sub="S17 为三情景分配概率权重，计算概率加权预测金额">
                <ScenarioProbabilityPanel channel={singleChannel} />
            </SectionCard>

            {/* ── S18: 预测输出口径 V2 ───────────────────────────────────── */}
            <SalesForecastDownstreamOutputV2
                channel={singleChannel}
                annualForecast={primaryResult?.annualForecast ?? 0}
                grossMarginRate={config.brand.grossMarginRate}
                refundRate={singleChannel === 'ecommerce' ? config.ecommerceDrivers.refundRate : 0}
            />
        </div>
    );
}
