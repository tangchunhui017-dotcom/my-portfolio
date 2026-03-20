import { PHASE_MAP, RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';
import type {
  CategoryBreakdownRecord,
  ProductArchitectureRecord,
  ToolingBudgetLevel,
  ToolingStrategy,
} from '@/lib/design-review-center/types';

interface ProductArchitecturePanelProps {
  architectures: ProductArchitectureRecord[];
  breakdowns: CategoryBreakdownRecord[];
}

const TOOLING_STRATEGY_META: Record<ToolingStrategy, { label: string; className: string }> = {
  new_tooling: { label: '全新开模', className: 'bg-rose-100 text-rose-700' },
  new_upper_same_outsole: { label: '换面不换底', className: 'bg-amber-100 text-amber-700' },
  carry_over: { label: '经典延续', className: 'bg-emerald-100 text-emerald-700' },
};

const BUDGET_LEVEL_META: Record<ToolingBudgetLevel, { label: string; className: string }> = {
  tight: { label: '预算收敛', className: 'bg-slate-100 text-slate-700' },
  controlled: { label: '预算可控', className: 'bg-sky-100 text-sky-700' },
  strategic: { label: '战略投入', className: 'bg-fuchsia-100 text-fuchsia-700' },
};

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sum(items: number[]) {
  return items.reduce((total, current) => total + current, 0);
}

function weightedRatio(records: ProductArchitectureRecord[], selector: (record: ProductArchitectureRecord) => number) {
  const totalSku = sum(records.map((record) => record.plannedSkuCount));
  if (totalSku === 0) return 0;

  return records.reduce((total, record) => total + record.plannedSkuCount * selector(record), 0) / totalSku;
}

function SectionEyebrow({ label }: { label: string }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>;
}

function ChipGroup({ items }: { items: string[] }) {
  if (!items.length) return <div className="text-sm text-slate-400">待补充</div>;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function RatioBar({
  carryOver,
  sameOutsoleNewUpper,
  newTooling,
}: {
  carryOver: number;
  sameOutsoleNewUpper: number;
  newTooling: number;
}) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-emerald-500" style={{ width: `${carryOver}%` }} />
        <div className="bg-amber-400" style={{ width: `${sameOutsoleNewUpper}%` }} />
        <div className="bg-rose-500" style={{ width: `${newTooling}%` }} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
        <div>经典延续 {percent(carryOver)}</div>
        <div>换面不换底 {percent(sameOutsoleNewUpper)}</div>
        <div>全新开模 {percent(newTooling)}</div>
      </div>
    </div>
  );
}

export default function ProductArchitecturePanel({ architectures, breakdowns }: ProductArchitecturePanelProps) {
  if (!architectures.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无产品架构内容。
      </div>
    );
  }

  const totalSku = sum(architectures.map((record) => record.plannedSkuCount));
  const totalSkuLimit = sum(architectures.map((record) => record.plannedSkuLimit));
  const avgSkuDepth = Math.round(sum(architectures.map((record) => record.plannedSkuDepth)) / architectures.length);
  const reuseRatio = 100 - weightedRatio(architectures, (record) => record.newToolingRatio);
  const carryOverRatio = weightedRatio(architectures, (record) => record.carryOverRatio);
  const sameOutsoleRatio = weightedRatio(architectures, (record) => record.sameOutsoleNewUpperRatio);
  const newToolingRatio = weightedRatio(architectures, (record) => record.newToolingRatio);

  const categorySummary = unique(breakdowns.map((record) => record.category))
    .map((category) => {
      const categoryRows = breakdowns.filter((record) => record.category === category);
      const relatedSeriesIds = unique(categoryRows.map((record) => record.seriesId));
      const relatedArchitectures = architectures.filter((record) => relatedSeriesIds.includes(record.seriesId));

      const toolingMix = categoryRows.reduce(
        (summary, row) => {
          const architecture = relatedArchitectures.find((record) => record.seriesId === row.seriesId);
          if (!architecture) return summary;
          summary.total += row.plannedSkuCount;
          if (architecture.toolingStrategy === 'carry_over') summary.carryOver += row.plannedSkuCount;
          if (architecture.toolingStrategy === 'new_upper_same_outsole') summary.sameOutsole += row.plannedSkuCount;
          if (architecture.toolingStrategy === 'new_tooling') summary.newTooling += row.plannedSkuCount;
          return summary;
        },
        { total: 0, carryOver: 0, sameOutsole: 0, newTooling: 0 },
      );

      return {
        category,
        plannedSkuCount: sum(categoryRows.map((record) => record.plannedSkuCount)),
        seriesNames: unique(categoryRows.map((record) => record.seriesName)),
        priceBands: unique(relatedArchitectures.map((record) => record.priceBand)),
        scenes: unique(relatedArchitectures.map((record) => record.consumerScene)),
        silhouettes: unique(relatedArchitectures.flatMap((record) => record.silhouetteDirections)).slice(0, 3),
        outsoles: unique(relatedArchitectures.flatMap((record) => record.outsoleDirections)).slice(0, 3),
        toolingText: `延续 ${toolingMix.carryOver} / 同底 ${toolingMix.sameOutsole} / 新模 ${toolingMix.newTooling}`,
      };
    })
    .sort((left, right) => right.plannedSkuCount - left.plannedSkuCount);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <SectionEyebrow label="Architecture Summary" />
            <h3 className="text-2xl font-semibold text-slate-950">先定整季骨架，再看系列落点</h3>
            <p className="text-sm leading-7 text-slate-600">
              产品架构阶段先回答三个问题：哪些品类是主推、哪些系列可以共底共楦、哪些款型必须为主题投入新模具。先把结构收住，再谈单款扩展。
            </p>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">整季架构判断</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <div>模具复用率 <span className="font-semibold text-slate-950">{percent(reuseRatio)}</span></div>
                <div>全新开模占比 <span className="font-semibold text-slate-950">{percent(newToolingRatio)}</span></div>
                <div>SKU 上限使用率 <span className="font-semibold text-slate-950">{totalSkuLimit ? percent((totalSku / totalSkuLimit) * 100) : '0%'}</span></div>
                <div>平均单款深度 <span className="font-semibold text-slate-950">{avgSkuDepth}</span></div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">在管系列</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{architectures.length}</div>
              <div className="mt-2 text-xs text-slate-500">进入本轮架构判断的系列数量</div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">规划 SKU</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{totalSku}</div>
              <div className="mt-2 text-xs text-slate-500">SKU 上限 {totalSkuLimit}</div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">模具复用率</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{percent(reuseRatio)}</div>
              <div className="mt-2 text-xs text-slate-500">延续款 + 换面不换底</div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">覆盖品类</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{categorySummary.length}</div>
              <div className="mt-2 text-xs text-slate-500">整季重点品类布局</div>
            </article>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">开模策略总览</div>
              <div className="mt-2 text-sm text-slate-600">先看延续、同底换面和全新开模比例，再决定本季的研发预算压在哪些系列上。</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">经典延续 {percent(carryOverRatio)}</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">换面不换底 {percent(sameOutsoleRatio)}</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-700">全新开模 {percent(newToolingRatio)}</span>
            </div>
          </div>
          <div className="mt-4">
            <RatioBar carryOver={carryOverRatio} sameOutsoleNewUpper={sameOutsoleRatio} newTooling={newToolingRatio} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow label="Master Architecture Board" />
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">整季产品架构总表</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">先看整季品类、场景、价格带和开模策略，再进入各系列的局部架构判断。</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">{categorySummary.length} 个重点品类</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[1120px] w-full border-separate border-spacing-0 overflow-hidden rounded-3xl border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-200 px-5 py-4">架构维度</th>
                {categorySummary.map((summary) => (
                  <th key={summary.category} className="border-b border-slate-200 px-5 py-4">{summary.category}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: '规划款数', render: (summary: (typeof categorySummary)[number]) => `${summary.plannedSkuCount} 款` },
                { label: '覆盖系列', render: (summary: (typeof categorySummary)[number]) => summary.seriesNames.join(' / ') },
                { label: '价格带', render: (summary: (typeof categorySummary)[number]) => summary.priceBands.join(' / ') },
                { label: '主要场景', render: (summary: (typeof categorySummary)[number]) => summary.scenes.join(' / ') },
                { label: '楦型 / 鞋头 / 体量', render: (summary: (typeof categorySummary)[number]) => summary.silhouettes.join(' / ') },
                { label: '底型 / 底台方向', render: (summary: (typeof categorySummary)[number]) => summary.outsoles.join(' / ') },
                { label: '开模策略', render: (summary: (typeof categorySummary)[number]) => summary.toolingText },
              ].map((row) => (
                <tr key={row.label} className="align-top text-slate-700">
                  <td className="border-t border-slate-200 bg-slate-50 px-5 py-4 font-semibold text-slate-700">{row.label}</td>
                  {categorySummary.map((summary) => (
                    <td key={`${row.label}-${summary.category}`} className="border-t border-slate-200 px-5 py-4">{row.render(summary)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-5">
        {architectures.map((record) => {
          const phaseMeta = PHASE_MAP[record.phase] ?? PHASE_MAP.concept;
          const riskMeta = RISK_LEVEL_MAP[record.riskLevel] ?? RISK_LEVEL_MAP.medium;
          const toolingMeta = TOOLING_STRATEGY_META[record.toolingStrategy];
          const budgetMeta = BUDGET_LEVEL_META[record.toolingBudgetLevel];
          const totalRoles = record.roleMix.hero + record.roleMix.core + record.roleMix.filler;
          const skuUsage = record.plannedSkuLimit ? (record.plannedSkuCount / record.plannedSkuLimit) * 100 : 0;

          return (
            <article key={record.architectureId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-0 xl:grid-cols-[250px_1fr]">
                <div className="relative min-h-[260px] bg-slate-200">
                  <img src={record.heroImage} alt={record.seriesName} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">{record.waveId.toUpperCase()}</div>
                    <div className="mt-1 text-2xl font-semibold">{record.seriesName}</div>
                    <div className="mt-2 text-sm text-white/80">{record.designTheme} / {record.priceBand}</div>
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">目标人群与场景</div>
                      <div className="mt-2 text-lg font-semibold text-slate-950">{record.targetConsumer}</div>
                      <div className="mt-2 text-sm text-slate-500">{record.consumerScene}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phaseMeta.bgColor} ${phaseMeta.textColor}`}>{phaseMeta.label}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskMeta.bgColor} ${riskMeta.textColor}`}>{riskMeta.label}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toolingMeta.className}`}>{toolingMeta.label}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${budgetMeta.className}`}>{budgetMeta.label}</span>
                    </div>
                  </div>

                  <section className="rounded-2xl bg-slate-50 p-5">
                    <SectionEyebrow label="Architecture Decision" />
                    <p className="mt-3 text-sm leading-7 text-slate-700">{record.architectureDecision}</p>
                  </section>

                  <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div>
                        <SectionEyebrow label="Tooling Strategy" />
                        <div className="mt-3 text-lg font-semibold text-slate-950">共底 / 共楦与模具策略</div>
                      </div>
                      <div className="space-y-3 text-sm leading-6 text-slate-700">
                        <div><span className="font-semibold text-slate-950">楦型策略：</span>{record.lastReuseType}</div>
                        <div><span className="font-semibold text-slate-950">大底策略：</span>{record.outsoleReuseType}</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">新老款比例</div>
                        <div className="mt-4">
                          <RatioBar
                            carryOver={record.carryOverRatio}
                            sameOutsoleNewUpper={record.sameOutsoleNewUpperRatio}
                            newTooling={record.newToolingRatio}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                      <div>
                        <SectionEyebrow label="SKU Control" />
                        <div className="mt-3 text-lg font-semibold text-slate-950">SKU 宽度与深度控制</div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">规划款数</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{record.plannedSkuCount}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">SKU 上限</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{record.plannedSkuLimit}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">单款深度</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-950">{record.plannedSkuDepth}</div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>上限使用率</span>
                          <span>{percent(skuUsage)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${skuUsage >= 100 ? 'bg-rose-500' : skuUsage >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(skuUsage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <SectionEyebrow label="Role Mix" />
                      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white">
                        <div className="bg-slate-900" style={{ width: `${totalRoles ? (record.roleMix.hero / totalRoles) * 100 : 0}%` }} />
                        <div className="bg-slate-500" style={{ width: `${totalRoles ? (record.roleMix.core / totalRoles) * 100 : 0}%` }} />
                        <div className="bg-slate-300" style={{ width: `${totalRoles ? (record.roleMix.filler / totalRoles) * 100 : 0}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                        <div>Hero {record.roleMix.hero}</div>
                        <div>Core {record.roleMix.core}</div>
                        <div>Filler {record.roleMix.filler}</div>
                      </div>
                      <div className="mt-5">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">开发品类</div>
                        <ChipGroup items={record.categoryMix} />
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <SectionEyebrow label="Shape & Review" />
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">楦底方向</div>
                          <ChipGroup items={record.silhouetteDirections} />
                        </div>
                        <div>
                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">帮面方向</div>
                          <ChipGroup items={record.upperDirections} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">大底方向</div>
                        <ChipGroup items={record.outsoleDirections} />
                      </div>
                      <div className="mt-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">当前评审重点</div>
                        <ChipGroup items={record.reviewFocus} />
                      </div>
                    </section>
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