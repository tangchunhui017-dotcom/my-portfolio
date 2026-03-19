import { PHASE_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';
import type { ProductArchitectureRecord } from '@/lib/design-review-center/types';

interface ProductArchitecturePanelProps {
  architectures: ProductArchitectureRecord[];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export default function ProductArchitecturePanel({ architectures }: ProductArchitecturePanelProps) {
  const summary = architectures.reduce(
    (accumulator, item) => ({
      hero: accumulator.hero + item.roleMix.hero,
      core: accumulator.core + item.roleMix.core,
      filler: accumulator.filler + item.roleMix.filler,
      plannedSku: accumulator.plannedSku + item.plannedSkuCount,
    }),
    { hero: 0, core: 0, filler: 0, plannedSku: 0 },
  );

  const totalRoleUnits = summary.hero + summary.core + summary.filler;
  const totalCategories = unique(architectures.flatMap((item) => item.categoryMix)).length;

  if (!architectures.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">当前筛选条件下暂无产品架构内容。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">在管系列</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{architectures.length}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">当前筛选范围内参与产品架构讨论的系列数。</div>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">计划 SKU</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{summary.plannedSku}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">按独立架构记录统计的本轮计划款数。</div>
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
        {architectures.map((item) => {
          const phaseMeta = PHASE_MAP[item.phase] ?? PHASE_MAP.concept;
          const riskMeta = RISK_LEVEL_MAP[item.riskLevel] ?? RISK_LEVEL_MAP.medium;
          const totalUnits = item.roleMix.hero + item.roleMix.core + item.roleMix.filler;

          return (
            <article key={item.architectureId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                      <div className="mt-2 text-base font-semibold text-slate-900">{item.consumerScene}</div>
                      <div className="mt-2 text-sm text-slate-500">目标客群：{item.targetConsumer}</div>
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
                        <div className="bg-slate-900" style={{ width: `${totalUnits ? (item.roleMix.hero / totalUnits) * 100 : 0}%` }} />
                        <div className="bg-slate-500" style={{ width: `${totalUnits ? (item.roleMix.core / totalUnits) * 100 : 0}%` }} />
                        <div className="bg-slate-300" style={{ width: `${totalUnits ? (item.roleMix.filler / totalUnits) * 100 : 0}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                        <div>Hero {item.roleMix.hero}</div>
                        <div>Core {item.roleMix.core}</div>
                        <div>Filler {item.roleMix.filler}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">开发品类</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.categoryMix.map((category) => (
                          <span key={category} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">楦底与体量方向</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.silhouetteDirections.map((entry) => (
                          <span key={entry} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">帮面与大底方向</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[...item.upperDirections, ...item.outsoleDirections].slice(0, 6).map((entry) => (
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
                        {item.reviewFocus.map((entry) => (
                          <span key={entry} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">当前判断</div>
                      <p className="mt-3 text-sm leading-6 text-amber-900">{item.architectureDecision}</p>
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