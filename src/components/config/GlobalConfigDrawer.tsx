'use client';
/**
 * src/components/config/GlobalConfigDrawer.tsx
 * 年度全局配置抽屉 — 业务域 + 二级 Tab 配置中心
 */
import { useState, type ReactNode } from 'react';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import { useMerchMetricConfig } from '@/hooks/useMerchMetricConfig';

interface Props {
    open: boolean;
    onClose: () => void;
}

type ConfigDomain = 'forecast' | 'cashflow' | 'pnl' | 'merch';
type ForecastSubTab = 'basis' | 'growth' | 'physical' | 'ecommerce' | 'newStore' | 'merch';
type CashflowSubTab = 'manualOutflows' | 'inventory';
type PnlSubTab = 'brandPnl' | 'channelCost' | 'markdownRules';
type MerchSubTab = 'metricDefs' | 'panelMetrics' | 'thresholds' | 'seasonLifecycle' | 'productAge' | 'categoryPrice' | 'channelMetric' | 'financialMetric' | 'cashflowMetric';

const DOMAINS: Array<{ key: ConfigDomain; label: string; desc: string }> = [
    { key: 'forecast', label: '销售预测', desc: '基准、方法、增长率、渠道参数、货盘结构' },
    { key: 'cashflow', label: '现金流', desc: '回款、支出、库存占款、清货模拟' },
    { key: 'pnl', label: '损益表', desc: '毛利、税费、渠道费用率、折扣规则' },
    { key: 'merch', label: '指标口径', desc: '指标定义、阈值、品类/价格/渠道/财务标准' },
];

const FORECAST_TABS: Array<{ key: ForecastSubTab; label: string }> = [
    { key: 'basis', label: '预测基准' },
    { key: 'growth', label: '增长率' },
    { key: 'physical', label: '实体店' },
    { key: 'ecommerce', label: '电商' },
    { key: 'newStore', label: '新店' },
    { key: 'merch', label: '货盘结构' },
];

const CASHFLOW_TABS: Array<{ key: CashflowSubTab; label: string }> = [
    { key: 'manualOutflows', label: '手工支出计划' },
    { key: 'inventory', label: '库存占款参数' },
];

const PNL_TABS: Array<{ key: PnlSubTab; label: string }> = [
    { key: 'brandPnl', label: '品牌损益口径' },
    { key: 'channelCost', label: '渠道费用率' },
    { key: 'markdownRules', label: '折扣损失规则' },
];

const MERCH_TAB_GROUPS: Array<{ title: string; desc: string; tabs: Array<{ key: MerchSubTab; label: string }> }> = [
    {
        title: '指标体系',
        desc: '统一指标定义、面板依赖和健康阈值',
        tabs: [
            { key: 'metricDefs', label: '指标定义' },
            { key: 'panelMetrics', label: '面板指标清单' },
            { key: 'thresholds', label: '业务阈值' },
        ],
    },
    {
        title: '商品标准',
        desc: '季节、库龄、品类价格带和渠道规则',
        tabs: [
            { key: 'seasonLifecycle', label: '季节生命周期' },
            { key: 'productAge', label: '货龄/库龄结构' },
            { key: 'categoryPrice', label: '品类/价格带' },
            { key: 'channelMetric', label: '渠道指标' },
        ],
    },
    {
        title: '经营财务',
        desc: '损益、费用、回款和资金规则',
        tabs: [
            { key: 'financialMetric', label: '财务指标' },
            { key: 'cashflowMetric', label: '现金流指标' },
        ],
    },
];

const BASE_WEIGHT_YEARS = ['2022', '2023', '2024'];
const MONTH_SHORT = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const OUTFLOW_LABELS: Array<{ key: 'marketing' | 'tradeShow' | 'platformFee' | 'staffCommission' | 'logistics' | 'rentDeposit' | 'fixedAsset' | 'travel' | 'financeCost' | 'other'; label: string }> = [
    { key: 'marketing', label: '营销费用' },
    { key: 'tradeShow', label: '展会/展厅' },
    { key: 'platformFee', label: '平台费用' },
    { key: 'staffCommission', label: '员工提成' },
    { key: 'logistics', label: '物流费用' },
    { key: 'rentDeposit', label: '租金押金' },
    { key: 'fixedAsset', label: '固定资产' },
    { key: 'travel', label: '差旅费' },
    { key: 'financeCost', label: '财务费用' },
    { key: 'other', label: '其他' },
];

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">{label}</label>
            {children}
            {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
        </div>
    );
}

function NumField({ label, value, onChange, step = 1, min = 0, pct = false, hint }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    pct?: boolean;
    hint?: string;
}) {
    return (
        <Field label={label} hint={hint}>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    step={step}
                    min={min}
                    value={pct ? +(value * 100).toFixed(2) : value}
                    onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onChange(pct ? v / 100 : v);
                    }}
                    className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm text-slate-800"
                />
                {pct && <span className="text-xs text-slate-400">%</span>}
            </div>
        </Field>
    );
}

function ContentCard({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                {desc && <p className="mt-1 text-xs text-slate-400">{desc}</p>}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function SubTabs<T extends string>({ tabs, active, onChange }: {
    tabs: Array<{ key: T; label: string }>;
    active: T;
    onChange: (key: T) => void;
}) {
    return (
        <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-100 pb-3">
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                        active === tab.key
                            ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

function GroupedSubTabs<T extends string>({ groups, active, onChange }: {
    groups: Array<{ title: string; desc: string; tabs: Array<{ key: T; label: string }> }>;
    active: T;
    onChange: (key: T) => void;
}) {
    return (
        <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {groups.map(group => (
                    <div key={group.title} className="rounded-xl bg-slate-50/70 p-3">
                        <div className="mb-2">
                            <div className="text-xs font-semibold text-slate-700">{group.title}</div>
                            <div className="mt-0.5 text-[11px] leading-4 text-slate-400">{group.desc}</div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {group.tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => onChange(tab.key)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                        active === tab.key
                                            ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function GlobalConfigDrawer({ open, onClose }: Props) {
    const {
        config,
        updateConfig,
        updateForecast,
        updatePhysicalDrivers,
        updateEcommerceDrivers,
        updateNewStoreDrivers,
        updateMonthlyGrowthRate,
        updateManualOutflow,
        markConfigured,
        resetConfig,
    } = useGlobalConfig();
    const [activeDomain, setActiveDomain] = useState<ConfigDomain>('forecast');
    const [forecastTab, setForecastTab] = useState<ForecastSubTab>('basis');
    const [cashflowTab, setCashflowTab] = useState<CashflowSubTab>('manualOutflows');
    const [pnlTab, setPnlTab] = useState<PnlSubTab>('brandPnl');
    const [merchTab, setMerchTab] = useState<MerchSubTab>('metricDefs');
    const merch = useMerchMetricConfig();
    const { brand, forecast } = config;

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
            <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">年度全局配置</h2>
                        <p className="mt-1 text-sm text-slate-400">左侧选择业务域，右侧按标签页维护具体参数。</p>
                    </div>
                    <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600">×</button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                    <aside className="border-b border-slate-100 bg-slate-50/80 p-3 md:w-64 md:border-b-0 md:border-r">
                        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto">
                            {DOMAINS.map((domain, index) => (
                                <button
                                    key={domain.key}
                                    onClick={() => setActiveDomain(domain.key)}
                                    className={`min-w-52 rounded-2xl border px-4 py-4 text-left transition-all md:min-w-0 ${
                                        activeDomain === domain.key
                                            ? 'border-sky-200 bg-white text-slate-900 shadow-sm'
                                            : 'border-transparent text-slate-500 hover:border-slate-100 hover:bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                                            activeDomain === domain.key ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-base font-semibold">{domain.label}</span>
                                    </div>
                                    <p className="mt-2 pl-10 text-xs text-slate-400">{domain.desc}</p>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        {activeDomain === 'forecast' && (
                            <>
                                <SubTabs tabs={FORECAST_TABS} active={forecastTab} onChange={setForecastTab} />

                                {forecastTab === 'basis' && (
                                    <div className="space-y-4">
                                        <ContentCard title="预测基准" desc="设置销售预测使用的财年、基准年、预测方法和历史基准口径。">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <NumField label="财年" value={brand.fiscalYear} onChange={v => updateConfig({ brand: { ...brand, fiscalYear: v } })} step={1} />
                                                <NumField label="基准年" value={brand.baseYear} onChange={v => updateConfig({ brand: { ...brand, baseYear: v } })} step={1} />
                                                <Field label="预测方法">
                                                    <select
                                                        value={forecast.method}
                                                        onChange={e => updateForecast({ method: e.target.value as typeof forecast.method })}
                                                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                                    >
                                                        <option value="growth_based">增长率预测</option>
                                                        <option value="driver_based">驱动因子预测</option>
                                                        <option value="hybrid">混合预测</option>
                                                    </select>
                                                </Field>
                                                <Field label="基准历史模式">
                                                    <select
                                                        value={forecast.baseMode}
                                                        onChange={e => updateForecast({ baseMode: e.target.value as typeof forecast.baseMode })}
                                                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                                    >
                                                        <option value="last_year">上一年</option>
                                                        <option value="avg_2year">两年均值</option>
                                                        <option value="avg_3year">三年均值</option>
                                                        <option value="custom_weights">自定义权重</option>
                                                    </select>
                                                </Field>
                                            </div>

                                            {forecast.baseMode === 'custom_weights' && (
                                                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                                    <p className="mb-3 text-xs font-medium text-slate-500">历史权重</p>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                        {BASE_WEIGHT_YEARS.map(year => (
                                                            <NumField
                                                                key={year}
                                                                label={year}
                                                                value={forecast.customWeights[year] ?? 0}
                                                                onChange={v => updateForecast({ customWeights: { ...forecast.customWeights, [year]: v } })}
                                                                pct
                                                                step={1}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </ContentCard>
                                    </div>
                                )}

                                {forecastTab === 'growth' && (
                                    <div className="space-y-4">
                                        <ContentCard title="增长率设置" desc="统一、季节、按月三种方式只展示当前选中的配置。">
                                            <div className="mb-5 max-w-xs">
                                                <Field label="增长率模式">
                                                    <select
                                                        value={forecast.growthRateMode}
                                                        onChange={e => updateForecast({ growthRateMode: e.target.value as typeof forecast.growthRateMode })}
                                                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                                    >
                                                        <option value="uniform">统一增长率</option>
                                                        <option value="seasonal">季节性增长率</option>
                                                        <option value="monthly_custom">按月自定义</option>
                                                    </select>
                                                </Field>
                                            </div>
                                            {forecast.growthRateMode === 'uniform' && (
                                                <NumField label="统一增长率" value={forecast.uniformGrowthRate} onChange={v => updateForecast({ uniformGrowthRate: v })} pct step={0.5} />
                                            )}
                                            {forecast.growthRateMode === 'seasonal' && (
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                    <NumField label="春季 3-5月" value={forecast.seasonalRates.spring} onChange={v => updateForecast({ seasonalRates: { ...forecast.seasonalRates, spring: v } })} pct step={0.5} />
                                                    <NumField label="夏季 6-8月" value={forecast.seasonalRates.summer} onChange={v => updateForecast({ seasonalRates: { ...forecast.seasonalRates, summer: v } })} pct step={0.5} />
                                                    <NumField label="秋季 9-11月" value={forecast.seasonalRates.autumn} onChange={v => updateForecast({ seasonalRates: { ...forecast.seasonalRates, autumn: v } })} pct step={0.5} />
                                                    <NumField label="冬季 12-2月" value={forecast.seasonalRates.winter} onChange={v => updateForecast({ seasonalRates: { ...forecast.seasonalRates, winter: v } })} pct step={0.5} />
                                                </div>
                                            )}
                                            {forecast.growthRateMode === 'monthly_custom' && (
                                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                                                    {forecast.monthlyGrowthRates.map((rate, i) => (
                                                        <div key={MONTH_SHORT[i]} className="flex flex-col gap-1">
                                                            <span className="text-[10px] text-slate-400">{MONTH_SHORT[i]}</span>
                                                            <input
                                                                type="number"
                                                                step={0.1}
                                                                value={+(rate * 100).toFixed(1)}
                                                                onChange={e => {
                                                                    const v = parseFloat(e.target.value);
                                                                    if (!isNaN(v)) updateMonthlyGrowthRate(i, v / 100);
                                                                }}
                                                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-xs"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </ContentCard>
                                    </div>
                                )}

                                {forecastTab === 'physical' && (
                                    <ContentCard title="实体店驱动参数" desc="用于实体店驱动因子预测和混合预测。">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <NumField label="客流提升" value={config.physicalDrivers.trafficLift} onChange={v => updatePhysicalDrivers({ trafficLift: v })} pct step={0.1} />
                                            <NumField label="转化率提升" value={config.physicalDrivers.conversionRateLift} onChange={v => updatePhysicalDrivers({ conversionRateLift: v })} pct step={0.1} />
                                            <NumField label="客单价提升" value={config.physicalDrivers.avgTicketLift} onChange={v => updatePhysicalDrivers({ avgTicketLift: v })} pct step={0.1} />
                                            <NumField label="件单价提升" value={config.physicalDrivers.avgUnitPriceLift} onChange={v => updatePhysicalDrivers({ avgUnitPriceLift: v })} pct step={0.1} />
                                            <NumField label="投放预算" value={config.physicalDrivers.investmentBudget} onChange={v => updatePhysicalDrivers({ investmentBudget: v })} step={10000} />
                                        </div>
                                    </ContentCard>
                                )}

                                {forecastTab === 'ecommerce' && (
                                    <ContentCard title="电商驱动参数" desc="用于电商预测、净销售、可变成本和费用率测算。">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <NumField label="退货率" value={config.ecommerceDrivers.refundRate} onChange={v => updateEcommerceDrivers({ refundRate: v })} pct step={0.1} />
                                            <NumField label="客单价提升" value={config.ecommerceDrivers.avgTicketLift} onChange={v => updateEcommerceDrivers({ avgTicketLift: v })} pct step={0.1} />
                                            <NumField label="转化率提升" value={config.ecommerceDrivers.conversionRateLift} onChange={v => updateEcommerceDrivers({ conversionRateLift: v })} pct step={0.1} />
                                            <NumField label="流量成本提升" value={config.ecommerceDrivers.trafficCostLift} onChange={v => updateEcommerceDrivers({ trafficCostLift: v })} pct step={0.1} />
                                            <NumField label="平台费率" value={config.ecommerceDrivers.platformFeeRate} onChange={v => updateEcommerceDrivers({ platformFeeRate: v })} pct step={0.1} />
                                            <NumField label="支付费率" value={config.ecommerceDrivers.paymentFeeRate} onChange={v => updateEcommerceDrivers({ paymentFeeRate: v })} pct step={0.01} />
                                            <NumField label="客服费率" value={config.ecommerceDrivers.customerServiceRate} onChange={v => updateEcommerceDrivers({ customerServiceRate: v })} pct step={0.1} />
                                        </div>
                                    </ContentCard>
                                )}

                                {forecastTab === 'newStore' && (
                                    <ContentCard title="新店预测模型" desc="新店没有历史销售，使用坪效、客流、平衡点三种方法校准。">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <Field label="城市能级">
                                                <select
                                                    value={config.newStoreDrivers.cityTier}
                                                    onChange={e => updateNewStoreDrivers({ cityTier: e.target.value as typeof config.newStoreDrivers.cityTier })}
                                                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                                >
                                                    <option value="tier1">一线城市</option>
                                                    <option value="tier2">二线城市</option>
                                                    <option value="tier3_plus">三线及以下</option>
                                                </select>
                                            </Field>
                                            <NumField label="面积(㎡)" value={config.newStoreDrivers.targetAreaSqm} onChange={v => updateNewStoreDrivers({ targetAreaSqm: v })} step={10} />
                                            <NumField label="年坪效(元/㎡)" value={config.newStoreDrivers.salesPerSqmAnnual} onChange={v => updateNewStoreDrivers({ salesPerSqmAnnual: v })} step={500} />
                                            <NumField label="平日客流" value={config.newStoreDrivers.weekdayTraffic} onChange={v => updateNewStoreDrivers({ weekdayTraffic: v })} step={100} />
                                            <NumField label="周末客流" value={config.newStoreDrivers.weekendTraffic} onChange={v => updateNewStoreDrivers({ weekendTraffic: v })} step={100} />
                                            <NumField label="进店率" value={config.newStoreDrivers.entryRate} onChange={v => updateNewStoreDrivers({ entryRate: v })} pct step={0.1} />
                                            <NumField label="成交转化率" value={config.newStoreDrivers.conversionRate} onChange={v => updateNewStoreDrivers({ conversionRate: v })} pct step={0.1} />
                                            <NumField label="客单价(元)" value={config.newStoreDrivers.avgTicket} onChange={v => updateNewStoreDrivers({ avgTicket: v })} step={10} />
                                            <NumField label="年租金(元)" value={config.newStoreDrivers.annualRent} onChange={v => updateNewStoreDrivers({ annualRent: v })} step={10000} />
                                            <NumField label="年人工(元)" value={config.newStoreDrivers.annualStaff} onChange={v => updateNewStoreDrivers({ annualStaff: v })} step={10000} />
                                            <NumField label="装修摊销/年" value={config.newStoreDrivers.renovationAmortizedAnnual} onChange={v => updateNewStoreDrivers({ renovationAmortizedAnnual: v })} step={5000} />
                                            <NumField label="水电费/年" value={config.newStoreDrivers.utilitiesAnnual} onChange={v => updateNewStoreDrivers({ utilitiesAnnual: v })} step={1000} />
                                            <NumField label="其他费用/年" value={config.newStoreDrivers.otherAnnual} onChange={v => updateNewStoreDrivers({ otherAnnual: v })} step={1000} />
                                        </div>
                                    </ContentCard>
                                )}
                                {forecastTab === 'merch' && (
                                    <ContentCard title="货盘结构参数" desc="品类、价格带、新老品、波段占比，影响货盘预测拆解视图的计算结果。修改后请同步编辑 data/dashboard/forecast_merch_mix.json。">
                                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 mb-4">
                                            当前货盘结构数据来源于 <code className="font-mono">data/dashboard/forecast_merch_mix.json</code>。如需调整各品类/价格带占比，请直接编辑该 JSON 文件，下次刷新后生效。
                                        </div>
                                        <div className="text-xs text-slate-500 space-y-1">
                                            <div>• <span className="font-medium">品类占比</span>：sneaker 32%、casual 28%、fashion 18%、sandal 12%、boot 10%</div>
                                            <div>• <span className="font-medium">价格带占比</span>：¥199–299（22%）、¥300–499（35%）、¥500–799（28%）、¥800–1199（10%）、¥1200+（5%）</div>
                                            <div>• <span className="font-medium">新老品结构</span>：新品 52%、延续款 30%、清货 18%</div>
                                            <div>• <span className="font-medium">波段峰值</span>：春夏主波（3–5月）、节假日波（9–11月）</div>
                                        </div>
                                    </ContentCard>
                                )}
                            </>
                        )}

                        {activeDomain === 'cashflow' && (
                            <>
                                <SubTabs tabs={CASHFLOW_TABS} active={cashflowTab} onChange={setCashflowTab} />
                                {cashflowTab === 'manualOutflows' && (
                                    <ContentCard title="现金流手工支出计划" desc="自动派生支出来自 OTB、固定费用和收入费率；这里维护不可自动推导的手工支出。">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-slate-400">
                                                        <th className="sticky left-0 bg-white py-1 pr-2 text-left whitespace-nowrap">科目</th>
                                                        {MONTH_SHORT.map(month => (
                                                            <th key={month} className="min-w-14 px-0.5 py-1 text-center">{month}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {OUTFLOW_LABELS.map(row => (
                                                        <tr key={row.key} className="border-b border-slate-50">
                                                            <td className="sticky left-0 bg-white py-1 pr-2 font-medium whitespace-nowrap text-slate-600">{row.label}</td>
                                                            {config.cashflowManualOutflows[row.key].map((value, i) => (
                                                                <td key={i} className="px-0.5 py-0.5">
                                                                    <input
                                                                        type="number"
                                                                        step={1000}
                                                                        min={0}
                                                                        value={value}
                                                                        onChange={e => {
                                                                            const v = parseFloat(e.target.value);
                                                                            if (!isNaN(v)) updateManualOutflow(row.key, i, v);
                                                                        }}
                                                                        className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right text-[10px]"
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </ContentCard>
                                )}
                                {cashflowTab === 'inventory' && (
                                    <ContentCard title="库存占款参数" desc="设置清货模拟的参数，影响库存压力面板中的清货回款和清货后现金缺口计算。">
                                        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-700 mb-4">
                                            当前清货模拟：取期末库存的 20% 参与清货，折扣率 50%，得出预计回款。如需调整此比例，可在 useCashflowInventoryPressure.ts 中修改 clearanceRate 和 clearanceDiscount 字段。
                                        </div>
                                        <div className="text-xs text-slate-500 space-y-2">
                                            <div>• <span className="font-medium">清货参与率</span>：20%（期末库存中参与清货的比例）</div>
                                            <div>• <span className="font-medium">清货折扣</span>：5折（清货销售价格为成本的 50%）</div>
                                            <div>• <span className="font-medium">建议授信系数</span>：1.2（现金缺口 × 1.2 = 建议授信额度）</div>
                                            <div>• <span className="font-medium">库存占款预警线</span>：库存/年销 &gt; 30% 时显示黄色预警</div>
                                        </div>
                                    </ContentCard>
                                )}
                            </>
                        )}

                        {activeDomain === 'pnl' && (
                            <>
                                <SubTabs tabs={PNL_TABS} active={pnlTab} onChange={setPnlTab} />
                                {pnlTab === 'brandPnl' && (
                                    <ContentCard title="品牌损益口径" desc="影响损益表、单店测算和利润桥的共同财务口径。">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <NumField label="加价倍数" value={brand.markupMultiplier} onChange={v => updateConfig({ brand: { ...brand, markupMultiplier: v } })} step={0.1} />
                                            <NumField label="折扣率" value={brand.avgDiscountRate} onChange={v => updateConfig({ brand: { ...brand, avgDiscountRate: v } })} pct step={0.5} />
                                            <NumField label="毛利率" value={brand.grossMarginRate} onChange={v => updateConfig({ brand: { ...brand, grossMarginRate: v } })} pct step={0.5} />
                                            <NumField label="税率" value={brand.taxRate} onChange={v => updateConfig({ brand: { ...brand, taxRate: v } })} pct step={0.5} />
                                            <NumField label="后台费率" value={brand.backendCostRate} onChange={v => updateConfig({ brand: { ...brand, backendCostRate: v } })} pct step={0.1} />
                                        </div>
                                        <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-700">
                                            参考关系：毛利率 = 1 - 1 / (加价倍数 × 折扣率)。如果手工维护毛利率，系统以当前毛利率字段作为损益计算口径。
                                        </div>
                                    </ContentCard>
                                )}
                                {pnlTab === 'channelCost' && (
                                    <ContentCard title="渠道费用率参考" desc="各渠道的运营费用率，影响渠道损益视图的贡献利润计算。如需调整请编辑 data/dashboard/pnl_merch_assumptions.json。">
                                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 mb-4">
                                            数据来源：<code className="font-mono">data/dashboard/pnl_merch_assumptions.json</code> — channel_cost_rates 节点。
                                        </div>
                                        <div className="text-xs text-slate-600 space-y-3">
                                            <div>
                                                <div className="font-semibold text-slate-700 mb-1">🏪 实体店（physical）</div>
                                                <div className="grid grid-cols-3 gap-2 text-slate-500">
                                                    <div>租金 10%</div><div>人工 6%</div><div>营销 4%</div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-700 mb-1">🛒 电商（ecommerce）</div>
                                                <div className="grid grid-cols-3 gap-2 text-slate-500">
                                                    <div>平台费 5%</div><div>退货 13.7%</div><div>—</div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-700 mb-1">🤝 加盟（franchise）</div>
                                                <div className="grid grid-cols-3 gap-2 text-slate-500">
                                                    <div>返利 4%</div><div>—</div><div>—</div>
                                                </div>
                                            </div>
                                        </div>
                                    </ContentCard>
                                )}
                                {pnlTab === 'markdownRules' && (
                                    <ContentCard title="折扣损失规则参考" desc="各折扣档位的销售额占比与最低折扣率，影响折扣损失面板中的让利金额计算。如需调整请编辑 data/dashboard/pnl_merch_assumptions.json。">
                                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 mb-4">
                                            数据来源：<code className="font-mono">data/dashboard/pnl_merch_assumptions.json</code> — markdown_rules 节点。
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-slate-600">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-slate-400 text-left">
                                                        <th className="py-1 pr-4">档位</th>
                                                        <th className="py-1 pr-4">最低折扣率</th>
                                                        <th className="py-1">销售额占比</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-slate-50">
                                                        <td className="py-1 pr-4 font-medium text-emerald-700">正价（full_price）</td>
                                                        <td className="py-1 pr-4">85%</td>
                                                        <td className="py-1">55%</td>
                                                    </tr>
                                                    <tr className="border-b border-slate-50">
                                                        <td className="py-1 pr-4 font-medium text-amber-700">促销（promo）</td>
                                                        <td className="py-1 pr-4">65%</td>
                                                        <td className="py-1">28%</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-1 pr-4 font-medium text-rose-700">清货（clearance）</td>
                                                        <td className="py-1 pr-4">30%</td>
                                                        <td className="py-1">17%</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </ContentCard>
                                )}
                            </>
                        )}

                        {activeDomain === 'merch' && (
                            <>
                                <GroupedSubTabs groups={MERCH_TAB_GROUPS} active={merchTab} onChange={setMerchTab} />

                                {merchTab === 'metricDefs' && (
                                    <div className="space-y-4">
                                        <ContentCard title="核心指标定义" desc="企划中台使用的所有指标 ID、中文名、计算公式与单位。只读展示，如需修改请编辑 data/merch_config/metric_definitions.json。">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-left text-slate-400">
                                                            <th className="py-2 pr-3 font-medium">指标ID</th>
                                                            <th className="py-2 pr-3 font-medium">名称</th>
                                                            <th className="py-2 pr-3 font-medium">单位</th>
                                                            <th className="py-2 pr-3 font-medium">公式</th>
                                                            <th className="py-2 font-medium">说明</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {merch.metricDefinitions.map(m => (
                                                            <tr key={m.metricId} className="border-b border-slate-50 hover:bg-slate-50">
                                                                <td className="py-1.5 pr-3 font-mono text-sky-700">{m.metricId}</td>
                                                                <td className="py-1.5 pr-3 font-medium text-slate-800">{m.label}</td>
                                                                <td className="py-1.5 pr-3 text-slate-500">{m.unit}</td>
                                                                <td className="py-1.5 pr-3 font-mono text-slate-500 max-w-[200px] truncate" title={m.formula}>{m.formula}</td>
                                                                <td className="py-1.5 text-slate-400 max-w-[220px]">{m.description}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'panelMetrics' && (
                                    <div className="space-y-4">
                                        <ContentCard title="面板指标清单" desc="每个仪表盘面板所使用的必用指标和可选指标。只读展示，如需修改请编辑 data/merch_config/metric_usage_by_panel.json。">
                                            <div className="space-y-4">
                                                {Object.entries(merch.metricUsageByPanel).map(([panelKey, usage]) => (
                                                    <div key={panelKey} className="rounded-xl border border-slate-100 p-4">
                                                        <div className="mb-2 flex items-center gap-2">
                                                            <span className="font-medium text-slate-800">{usage.label}</span>
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 font-mono">{panelKey}</span>
                                                        </div>
                                                        <div className="mb-1.5 flex flex-wrap gap-1">
                                                            {usage.requiredMetrics.map(id => (
                                                                <span key={id} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{id}</span>
                                                            ))}
                                                        </div>
                                                        {usage.optionalMetrics.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {usage.optionalMetrics.map(id => (
                                                                    <span key={id} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-400">{id}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'thresholds' && (
                                    <div className="space-y-4">
                                        <ContentCard title="业务健康阈值" desc="各指标的健康/关注/危险三级阈值。只读展示，如需修改请编辑 data/merch_config/business_thresholds.json。">
                                            <div className="space-y-4">
                                                {merch.businessThresholds.map(t => (
                                                    <div key={t.metricId} className="rounded-xl border border-slate-100 p-4">
                                                        <div className="mb-2 flex items-center gap-2">
                                                            <span className="font-medium text-slate-800">{t.label}</span>
                                                            <span className="text-xs text-slate-400">（{t.unit}）</span>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {t.rules.map((r, i) => (
                                                                <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs ${
                                                                    r.status === 'health' ? 'bg-emerald-50 text-emerald-700' :
                                                                    r.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                                                                    'bg-rose-50 text-rose-700'
                                                                }`}>
                                                                    <span className="font-semibold min-w-[32px]">
                                                                        {r.status === 'health' ? '正常' : r.status === 'warning' ? '关注' : '危险'}
                                                                    </span>
                                                                    <span className="font-mono">{r.condition} {r.value}</span>
                                                                    <span className="text-inherit/70">{r.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'seasonLifecycle' && (
                                    <div className="space-y-4">
                                        <ContentCard title="季节生命周期标准" desc="春夏秋冬四季各自的销售阶段划分与售罄率目标。数据源：data/merch_config/season_lifecycle_standards.json。">
                                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                                {Object.entries(merch.seasonLifecycle.seasons ?? {}).map(([seasonKey, season]) => (
                                                    <div key={seasonKey} className="rounded-xl border border-slate-100 p-4">
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <span className="text-base font-semibold text-slate-800">{season.label}</span>
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{season.english}</span>
                                                            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-600 font-mono">{seasonKey}</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {season.phases.map(phase => {
                                                                const phaseDef = (merch.seasonLifecycle.phases ?? []).find(p => p.phaseId === phase.phaseId);
                                                                return (
                                                                    <div key={phase.phaseId} className="flex items-center gap-3 text-xs">
                                                                        <span className="min-w-[80px] font-medium text-slate-700">{phaseDef?.label ?? phase.phaseId}</span>
                                                                        <span className="text-slate-400">销售占比 {(phase.salesShare * 100).toFixed(0)}%</span>
                                                                        <span className="ml-auto rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                                                            售罄目标 {(phase.sellThroughTargetMin * 100).toFixed(0)}%~{(phase.sellThroughTargetMax * 100).toFixed(0)}%
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'productAge' && (
                                    <div className="space-y-4">
                                        <ContentCard title="货龄/库龄分级标准" desc="商品上市天数对应的货龄等级、售罄目标与运营建议。数据源：data/merch_config/product_age_standards.json。">
                                            <div className="space-y-3">
                                                {merch.productAgeLevels.map(level => (
                                                    <div key={level.levelId} className="rounded-xl border border-slate-100 p-4">
                                                        <div className="mb-2 flex items-center gap-3">
                                                            <span className="font-semibold text-slate-800">{level.label}</span>
                                                            <span className="text-xs text-slate-400">{level.dayMin}~{level.dayMax === 9999 ? '∞' : level.dayMax} 天</span>
                                                            <span className="ml-auto rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                                                售罄目标 {(level.targetSellThroughMin * 100).toFixed(0)}%~{(level.targetSellThroughMax * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <p className="mb-2 text-xs text-slate-500">{level.description}</p>
                                                        <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-3">
                                                            <div className="rounded bg-amber-50 px-2 py-1 text-amber-700"><span className="font-medium">折扣建议：</span>{level.discountSuggestion}</div>
                                                            <div className="rounded bg-sky-50 px-2 py-1 text-sky-700"><span className="font-medium">OTB：</span>{level.otbAction}</div>
                                                            <div className="rounded bg-slate-50 px-2 py-1 text-slate-600"><span className="font-medium">库存动作：</span>{level.inventoryAction}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'categoryPrice' && (
                                    <div className="space-y-4">
                                        <ContentCard title="品类/价格带规则" desc="多维度价格带配置，支持按品牌、渠道、季节、品类精确匹配。数据源：data/merch_config/category_price_rules.json。">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-left text-slate-400">
                                                            <th className="py-2 pr-3 font-medium">价格带</th>
                                                            <th className="py-2 pr-3 font-medium">价格区间</th>
                                                            <th className="py-2 pr-3 font-medium">角色</th>
                                                            <th className="py-2 pr-3 font-medium">毛利目标</th>
                                                            <th className="py-2 pr-3 font-medium">售罄目标</th>
                                                            <th className="py-2 pr-3 font-medium">均深范围</th>
                                                            <th className="py-2 font-medium">销售占比目标</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {merch.categoryPriceRules.map(r => (
                                                            <tr key={r.ruleId} className="border-b border-slate-50 hover:bg-slate-50">
                                                                <td className="py-1.5 pr-3 font-medium text-slate-800">{r.priceBandLabel}</td>
                                                                <td className="py-1.5 pr-3 text-slate-500">¥{r.minPrice}~{r.maxPrice === 9999 ? '∞' : `¥${r.maxPrice}`}</td>
                                                                <td className="py-1.5 pr-3">
                                                                    <span className={`rounded-full px-2 py-0.5 ${
                                                                        r.priceBandRole === 'traffic-driver' ? 'bg-sky-50 text-sky-600' :
                                                                        r.priceBandRole === 'volume' ? 'bg-emerald-50 text-emerald-600' :
                                                                        r.priceBandRole === 'profit' ? 'bg-amber-50 text-amber-600' :
                                                                        r.priceBandRole === 'image' ? 'bg-purple-50 text-purple-600' :
                                                                        'bg-slate-50 text-slate-500'
                                                                    }`}>{r.priceBandRole}</span>
                                                                </td>
                                                                <td className="py-1.5 pr-3 text-slate-600">{(r.targetGrossMargin * 100).toFixed(0)}%</td>
                                                                <td className="py-1.5 pr-3 text-slate-600">{(r.defaultSellThroughTarget * 100).toFixed(0)}%</td>
                                                                <td className="py-1.5 pr-3 text-slate-600">{r.defaultDepthMin}~{r.defaultDepthMax}双</td>
                                                                <td className="py-1.5 text-slate-600">{r.targetSalesRatio !== null ? `${(r.targetSalesRatio * 100).toFixed(0)}%` : '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'channelMetric' && (
                                    <div className="space-y-4">
                                        <ContentCard title="渠道指标规则" desc="各渠道的默认运营参数基准。数据源：data/merch_config/channel_metric_rules.json。">
                                            <div className="space-y-3">
                                                {merch.channelMetricRules.map(ch => (
                                                    <div key={ch.channelId} className="rounded-xl border border-slate-100 p-4">
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <span className="font-semibold text-slate-800">{ch.channelLabel}</span>
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 font-mono">{ch.channelId}</span>
                                                            {ch.capacityConstraintEnabled && (
                                                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">容量约束</span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                                            <div className="rounded bg-slate-50 px-2 py-1.5">
                                                                <div className="text-slate-400">售罄目标</div>
                                                                <div className="font-semibold text-slate-700">{(ch.defaultSellThroughTarget * 100).toFixed(0)}%</div>
                                                            </div>
                                                            <div className="rounded bg-slate-50 px-2 py-1.5">
                                                                <div className="text-slate-400">折扣率基准</div>
                                                                <div className="font-semibold text-slate-700">{(ch.defaultDiscountRate * 100).toFixed(0)}%</div>
                                                            </div>
                                                            <div className="rounded bg-slate-50 px-2 py-1.5">
                                                                <div className="text-slate-400">退货率基准</div>
                                                                <div className="font-semibold text-slate-700">{(ch.defaultReturnRate * 100).toFixed(0)}%</div>
                                                            </div>
                                                            <div className="rounded bg-slate-50 px-2 py-1.5">
                                                                <div className="text-slate-400">毛利目标</div>
                                                                <div className="font-semibold text-slate-700">{(ch.defaultGrossMarginTarget * 100).toFixed(0)}%</div>
                                                            </div>
                                                            <div className="rounded bg-slate-50 px-2 py-1.5">
                                                                <div className="text-slate-400">存销比基准</div>
                                                                <div className="font-semibold text-slate-700">{ch.defaultStockToSalesRatio}×</div>
                                                            </div>
                                                            <div className="rounded bg-slate-50 px-2 py-1.5">
                                                                <div className="text-slate-400">回款账期</div>
                                                                <div className="font-semibold text-slate-700">{ch.defaultCollectionDays === 0 ? '当日' : `${ch.defaultCollectionDays}天`}</div>
                                                            </div>
                                                            <div className="rounded bg-slate-50 px-2 py-1.5">
                                                                <div className="text-slate-400">平台佣金率</div>
                                                                <div className="font-semibold text-slate-700">{(ch.defaultPlatformCommissionRate * 100).toFixed(0)}%</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'financialMetric' && (
                                    <div className="space-y-4">
                                        <ContentCard title="财务指标规则" desc="损益口径下的目标毛利率、净利率、税率和渠道费率基准。只读展示，如需修改请编辑 data/merch_config/financial_metric_rules.json。">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="space-y-2 text-sm">
                                                    <h4 className="font-semibold text-slate-700">全局目标</h4>
                                                    <div className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                        <span className="text-slate-500">目标毛利率</span>
                                                        <span className="font-semibold text-emerald-700">
                                                            {((merch.financialMetricRules.global?.targetGrossMarginRate ?? 0.52) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                        <span className="text-slate-500">目标净利率</span>
                                                        <span className="font-semibold text-emerald-700">
                                                            {((merch.financialMetricRules.global?.targetNetProfitRate ?? 0.12) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                        <span className="text-slate-500">增值税率</span>
                                                        <span className="font-semibold text-slate-700">
                                                            {((merch.financialMetricRules.global?.valueAddedTaxRate ?? 0.13) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <h4 className="font-semibold text-slate-700">渠道综合费率</h4>
                                                    {Object.entries(merch.financialMetricRules.channelFeeRates ?? {}).filter(([k]) => !k.startsWith('_')).map(([channelId, rate]) => (
                                                        <div key={channelId} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                            <span className="text-slate-500 font-mono text-xs">{channelId}</span>
                                                            <span className="font-semibold text-amber-700">{(rate * 100).toFixed(0)}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}

                                {merchTab === 'cashflowMetric' && (
                                    <div className="space-y-4">
                                        <ContentCard title="现金流指标规则" desc="回款账期、供应商付款条件和最低现金余额配置。只读展示，如需修改请编辑 data/merch_config/cashflow_metric_rules.json。">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="space-y-2 text-sm">
                                                    <h4 className="font-semibold text-slate-700">供应商付款条件</h4>
                                                    {(() => {
                                                        const sp = merch.cashflowMetricRules.supplierPayment;
                                                        return (
                                                            <>
                                                                <div className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                                    <span className="text-slate-500">定金比例</span>
                                                                    <span className="font-semibold text-sky-700">{(( sp?.depositRate ?? 0.30) * 100).toFixed(0)}%</span>
                                                                </div>
                                                                <div className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                                    <span className="text-slate-500">尾款比例</span>
                                                                    <span className="font-semibold text-sky-700">{(( sp?.balanceRate ?? 0.70) * 100).toFixed(0)}%</span>
                                                                </div>
                                                                <div className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                                    <span className="text-slate-500">尾款账期</span>
                                                                    <span className="font-semibold text-slate-700">{sp?.balancePaymentTermDays ?? 30}天</span>
                                                                </div>
                                                                {sp?.description && (
                                                                    <p className="text-xs text-slate-400 px-1">{sp.description}</p>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <h4 className="font-semibold text-slate-700">现金管理基准</h4>
                                                    {(() => {
                                                        const cm = merch.cashflowMetricRules.cashManagement;
                                                        return (
                                                            <>
                                                                <div className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                                                                    <span className="text-slate-500">最低现金余额</span>
                                                                    <span className="font-semibold text-slate-700">¥{((cm?.minimumCashBalance ?? 3000000) / 10000).toFixed(0)}万</span>
                                                                </div>
                                                                <div className="flex justify-between rounded-lg border border-amber-100 px-3 py-2">
                                                                    <span className="text-slate-500">资金缺口预警</span>
                                                                    <span className="font-semibold text-amber-700">¥{((cm?.fundingGapWarningThreshold ?? 1000000) / 10000).toFixed(0)}万</span>
                                                                </div>
                                                                <div className="flex justify-between rounded-lg border border-rose-100 px-3 py-2">
                                                                    <span className="text-slate-500">资金缺口危险</span>
                                                                    <span className="font-semibold text-rose-700">¥{((cm?.fundingGapDangerThreshold ?? 5000000) / 10000).toFixed(0)}万</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </ContentCard>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button onClick={resetConfig} className="text-sm text-slate-500 hover:text-red-500">
                        恢复默认
                    </button>
                    <button
                        onClick={() => { markConfigured(); onClose(); }}
                        className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600"
                    >
                        保存配置
                    </button>
                </div>
            </div>
        </>
    );
}
