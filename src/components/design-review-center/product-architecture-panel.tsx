import type { SeriesWithBrief } from '@/lib/design-review-center/types';
import { PHASE_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';

interface ProductArchitecturePanelProps {
  series: SeriesWithBrief[];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getSeriesDecision(series: SeriesWithBrief) {
  if (series.riskLevel === 'high' || series.riskLevel === 'critical') {
    return '当前优先锁定材料与交期，避免在概念未收口时继续拉长开发链路。';
  }
  if (series.progress < 40) {
    return '当前优先补齐楦底方向和主推款结构，先做骨架，再扩展 SKU 深度。';
  }
  return '当前可进入下一轮样式深度与成本联动校验，重点看主推款的量产稳定性。';
}

export default function ProductArchitecturePanel({ series }: ProductArchitecturePanelProps) {
  const summary = series.reduce(
    (accumulator, item) => ({
      hero: accumulator.hero + item.productRoleMix.hero,
      core: accumulator.core + item.productRoleMix.core,
      filler: accumulator.filler + item.productRoleMix.filler,
      plannedSku: accumulator.plannedSku + (item.brief?.plannedSkuCount ?? item.developmentPlan.length),
    }),
    { hero: 0, core: 0, filler: 0, plannedSku: 0 },
  );

  const totalRoleUnits = summary.hero + summary.core + summary.filler;
  const totalCategories = unique(series.flatMap((item) => item.developmentPlan.map((row) => row.category))).length;

  if (!series.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">当前筛选条件下暂无产品架构内容。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">在管系列</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{series.length}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">本轮筛选范围内参与产品架构讨论的系列数。</div>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">计划 SKU</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{summary.plannedSku}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">按 series brief 与开发行合并估算的本轮计划款数。</div>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">角色结构</div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="bg-slate-900" style={{ width: `${totalRoleUnits ? (summary.hero / totalRoleUnits) * 100 : 0}%` }} />
            <div className="bg-slate-500" style={{ width: `${totalRoleUnits ? (summary.core / totalRoleUnits) * 100 : 0}%` }} />
            <div className="bg-slate-300" style={{ width: `${totalRoleUnits ? (summary.filler / totalRoleUnits) * 100 : 0}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
            <div>Hero {summary.hero}</div>
            <div>Core {summary.core}</div>
            <div>Filler {summary.filler}</div>
          </div>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">品类覆盖</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{totalCategories}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">当前架构已覆盖的开发品类数量。</div>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {series.map((item) => {
          const categories = unique(item.developmentPlan.map((row) => row.category));
          const silhouettes = item.brief?.silhouetteDirections ?? [];
          const upperDirections = item.brief?.upperConstructionKeywords ?? [];
          const outsoleDirections = item.brief?.outsoleDirections ?? [];
          const reviewFocus = item.brief?.reviewFocus ?? [];
          const phaseMeta = PHASE_MAP[item.milestoneStatus] ?? PHASE_MAP.concept;
          const riskMeta = RISK_LEVEL_MAP[item.riskLevel] ?? RISK_LEVEL_MAP.medium;
          const totalUnits = item.productRoleMix.hero + item.productRoleMix.core + item.productRoleMix.filler;

          return (
            <article key={item.seriesId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                <div className="relative min-h-[220px] bg-slate-200">
                  <img src={item.heroImage} alt={item.seriesName} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">{item.waveId.toUpperCase()}</div>
                    <div className="mt-1 text-xl font-semibold">{item.seriesName}</div>
                    <div className="mt-1 text-sm text-white/80">{item.priceBand}</div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">消费场景</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">{item.brief?.consumerScene ?? item.occasion}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phaseMeta.bgColor} ${phaseMeta.textColor}`}>
                        {phaseMeta.label}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskMeta.bgColor} ${riskMeta.textColor}`}>
                        {riskMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>系列进度</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-900" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">产品角色结构</div>
                      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white">
                        <div className="bg-slate-900" style={{ width: `${totalUnits ? (item.productRoleMix.hero / totalUnits) * 100 : 0}%` }} />
                        <div className="bg-slate-500" style={{ width: `${totalUnits ? (item.productRoleMix.core / totalUnits) * 100 : 0}%` }} />
                        <div className="bg-slate-300" style={{ width: `${totalUnits ? (item.productRoleMix.filler / totalUnits) * 100 : 0}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                        <div>Hero {item.productRoleMix.hero}</div>
                        <div>Core {item.productRoleMix.core}</div>
                        <div>Filler {item.productRoleMix.filler}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">开发品类</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <span key={category} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">楦底与体量方向</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {silhouettes.map((entry) => (
                          <span key={entry} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">帮面与大底方向</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[...upperDirections, ...outsoleDirections].slice(0, 6).map((entry) => (
                          <span key={entry} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">本轮评审重点</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reviewFocus.map((entry) => (
                          <span key={entry} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">当前判断</div>
                      <p className="mt-3 text-sm leading-6 text-amber-900">{getSeriesDecision(item)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
