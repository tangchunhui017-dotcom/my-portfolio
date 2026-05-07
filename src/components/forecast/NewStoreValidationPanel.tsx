'use client';
/**
 * src/components/forecast/NewStoreValidationPanel.tsx
 */
import type { NewStoreValidationResult } from '@/hooks/useForecast';

interface Props {
    data: NewStoreValidationResult;
}

function fmt(v: number) {
    return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toFixed(0);
}

const STATUS_CONFIG = {
    reasonable: { label: '客流可达', cls: 'bg-emerald-100 text-emerald-700' },
    aggressive: { label: '偏乐观', cls: 'bg-amber-100 text-amber-700' },
    unrealistic: { label: '难以实现', cls: 'bg-red-100 text-red-600' },
};

const TIER_LABELS: Record<string, string> = {
    tier1: '一线城市',
    tier2: '二线城市',
    tier3_plus: '三线及以下',
};

interface AngleCardProps {
    title: string;
    monthly: number;
    annual: number;
    color: string;
}
function AngleCard({ title, monthly, annual, color }: AngleCardProps) {
    return (
        <div className={`rounded-xl border p-4 ${color}`}>
            <p className="text-xs font-medium mb-1 opacity-70">{title}</p>
            <p className="text-xl font-bold">{fmt(monthly)}</p>
            <p className="text-xs opacity-60">月均 · 年合计 {fmt(annual)}</p>
        </div>
    );
}

export default function NewStoreValidationPanel({ data }: Props) {
    const statusCfg = STATUS_CONFIG[data.trafficRealityStatus];
    const [tierMin, tierMax] = data.cityTierTrafficRange;

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-slate-700">新店三角验证</h3>
                {data.divergenceWarning && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                        ⚠️ 三种方法差异超过30%，建议核查假设
                    </span>
                )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
                <AngleCard title="① 坪效法" monthly={data.angle1Monthly} annual={data.angle1Monthly * 12} color="border-blue-100 bg-blue-50" />
                <AngleCard title="② 客流驱动法" monthly={data.angle2Monthly} annual={data.angle2Monthly * 12} color="border-violet-100 bg-violet-50" />
                <AngleCard title="③ 损益平衡法" monthly={data.angle3Monthly} annual={data.angle3Monthly * 12} color="border-emerald-100 bg-emerald-50" />
            </div>

            {/* Recommended */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 mb-0.5">建议月销售目标（三法中位数）</p>
                    <p className="text-2xl font-bold text-slate-800">{fmt(data.recommendedMonthly)}</p>
                    <p className="text-xs text-slate-400">范围 {fmt(data.minMonthly)} — {fmt(data.maxMonthly)}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">年化合计</p>
                    <p className="text-lg font-semibold text-slate-700">{fmt(data.recommendedMonthly * 12)}</p>
                </div>
            </div>

            {/* Traffic reality check */}
            <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-medium text-slate-700">客流现实性检验</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>{statusCfg.label}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                        <p className="text-xs text-slate-500">盈亏平衡所需月均客流</p>
                        <p className="font-semibold">{fmt(data.breakevenRequiredMonthlyTraffic)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">折算日均客流</p>
                        <p className="font-semibold">{data.breakevenRequiredDailyTraffic.toFixed(0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">{TIER_LABELS[Object.keys(TIER_LABELS)[0]] ?? '参考城市'} 基准日均客流</p>
                        <p className="font-semibold text-slate-500">{tierMin.toLocaleString()} — {tierMax.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
