import { RISK_LEVEL_MAP } from '@/config/design-review-center/status-map';
import type { CategoryBreakdownRecord } from '@/lib/design-review-center/types';

interface CategoryBreakdownPanelProps {
  breakdowns: CategoryBreakdownRecord[];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function SectionEyebrow({ label }: { label: string }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>;
}

function ChipGroup({ items, tone = 'slate' }: { items: string[]; tone?: 'slate' | 'blue' }) {
  if (!items.length) return <div className="text-sm text-slate-400">待补充</div>;

  const className = tone === 'blue' ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-3 py-1 text-xs font-medium ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function CategoryBreakdownPanel({ breakdowns }: CategoryBreakdownPanelProps) {
  if (!breakdowns.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无开发品类分解内容。
      </div>
    );
  }

  const totalSku = breakdowns.reduce((sum, item) => sum + item.plannedSkuCount, 0);
  const subcategoryCount = unique(breakdowns.map((item) => item.subcategory)).length;
  const highTechRiskCount = breakdowns.filter((item) => item.technicalRiskLevel === 'high' || item.technicalRiskLevel === 'critical').length;
  const constrainedCapacityCount = breakdowns.filter((item) => item.capacityBand === '紧张').length;

  const groupedBySeries = breakdowns.reduce<Record<string, CategoryBreakdownRecord[]>>((accumulator, item) => {
    if (!accumulator[item.seriesId]) accumulator[item.seriesId] = [];
    accumulator[item.seriesId].push(item);
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <SectionEyebrow label="Development Breakdown" />
            <h3 className="text-2xl font-semibold text-slate-950">把产品架构拆到开发与供应链语言</h3>
            <p className="text-sm leading-7 text-slate-600">
              这一层不只看品类名称，而是把系列拆到二级鞋类、关键结构、工艺标签、工厂画像和交期风险，
              让企划、设计和开发在同一张表里对齐。
            </p>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">拆解判断</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <div>高工艺风险品类 <span className="font-semibold text-slate-950">{highTechRiskCount}</span></div>
                <div>产能紧张品类 <span className="font-semibold text-slate-950">{constrainedCapacityCount}</span></div>
                <div>二级品类数量 <span className="font-semibold text-slate-950">{subcategoryCount}</span></div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">开发行数</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{breakdowns.length}</div>
              <div className="mt-2 text-xs text-slate-500">进入拆解表的开发记录</div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">规划款数</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{totalSku}</div>
              <div className="mt-2 text-xs text-slate-500">当前筛选范围内的规划款数</div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">高工艺风险</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{highTechRiskCount}</div>
              <div className="mt-2 text-xs text-slate-500">冷粘、防水膜贴合、TPU 包覆等复杂结构</div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">产能紧张</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{constrainedCapacityCount}</div>
              <div className="mt-2 text-xs text-slate-500">需要前置锁定工厂与关键材料</div>
            </article>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow label="Master Breakdown Table" />
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">开发品类总表</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">先看二级品类、工艺难点、产线画像和风险，再进入系列级拆解。</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">{Object.keys(groupedBySeries).length} 个系列</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[1280px] w-full border-separate border-spacing-0 overflow-hidden rounded-3xl border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-200 px-4 py-4">品类</th>
                <th className="border-b border-slate-200 px-4 py-4">二级品类</th>
                <th className="border-b border-slate-200 px-4 py-4">系列</th>
                <th className="border-b border-slate-200 px-4 py-4">规划款数</th>
                <th className="border-b border-slate-200 px-4 py-4">工艺标签</th>
                <th className="border-b border-slate-200 px-4 py-4">工厂 / 产线</th>
                <th className="border-b border-slate-200 px-4 py-4">产能</th>
                <th className="border-b border-slate-200 px-4 py-4">技术风险</th>
                <th className="border-b border-slate-200 px-4 py-4">交期风险</th>
              </tr>
            </thead>
            <tbody>
              {breakdowns.map((item) => {
                const techRisk = RISK_LEVEL_MAP[item.technicalRiskLevel] ?? RISK_LEVEL_MAP.medium;
                const leadTimeRisk = RISK_LEVEL_MAP[item.leadTimeRisk] ?? RISK_LEVEL_MAP.medium;

                return (
                  <tr key={item.breakdownId} className="align-top text-slate-700">
                    <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">{item.category}</td>
                    <td className="border-b border-slate-100 px-4 py-4">{item.subcategory}</td>
                    <td className="border-b border-slate-100 px-4 py-4">{item.seriesName}</td>
                    <td className="border-b border-slate-100 px-4 py-4">{item.plannedSkuCount}</td>
                    <td className="border-b border-slate-100 px-4 py-4"><ChipGroup items={item.processTags} tone="blue" /></td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <div className="font-medium text-slate-900">{item.factoryProfile}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.lineType}</div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">{item.capacityBand}</td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${techRisk.bgColor} ${techRisk.textColor}`}>{techRisk.label}</span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${leadTimeRisk.bgColor} ${leadTimeRisk.textColor}`}>{leadTimeRisk.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-5">
        {Object.values(groupedBySeries).map((records) => {
          const [firstRecord] = records;
          const totalSeriesSku = records.reduce((sum, item) => sum + item.plannedSkuCount, 0);
          const materials = unique(records.flatMap((item) => item.materialDependency));
          const processes = unique(records.flatMap((item) => item.processTags));
          const constrainedRows = records.filter((item) => item.capacityBand === '紧张').length;

          return (
            <section key={firstRecord.seriesId} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{firstRecord.waveId.toUpperCase()}</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{firstRecord.seriesName}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{firstRecord.designConcept}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{totalSeriesSku} 款规划</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{records.length} 行拆解</span>
                  <span className={`rounded-full px-3 py-1 ${constrainedRows > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {constrainedRows > 0 ? `${constrainedRows} 行产能紧张` : '产能可控'}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-x-auto rounded-3xl border border-slate-200">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="border-b border-slate-200 px-4 py-4">品类</th>
                        <th className="border-b border-slate-200 px-4 py-4">二级品类</th>
                        <th className="border-b border-slate-200 px-4 py-4">产品角色</th>
                        <th className="border-b border-slate-200 px-4 py-4">关键结构</th>
                        <th className="border-b border-slate-200 px-4 py-4">周次</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((item) => (
                        <tr key={item.breakdownId} className="align-top text-slate-700">
                          <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">{item.category}</td>
                          <td className="border-b border-slate-100 px-4 py-4">{item.subcategory}</td>
                          <td className="border-b border-slate-100 px-4 py-4"><ChipGroup items={item.productRoles} /></td>
                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="space-y-1">
                              {item.keyStructures.map((structure) => (
                                <div key={structure}>{structure}</div>
                              ))}
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-4 py-4"><ChipGroup items={item.weekLabels} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <SectionEyebrow label="Process & Supply" />
                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">关键工艺</div>
                        <ChipGroup items={processes} tone="blue" />
                      </div>
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">材料依赖</div>
                        <ChipGroup items={materials} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {records.map((item) => {
                      const techRisk = RISK_LEVEL_MAP[item.technicalRiskLevel] ?? RISK_LEVEL_MAP.medium;
                      const leadTimeRisk = RISK_LEVEL_MAP[item.leadTimeRisk] ?? RISK_LEVEL_MAP.medium;

                      return (
                        <article key={`${item.breakdownId}-risk`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="text-sm font-semibold text-slate-900">{item.subcategory}</div>
                          <div className="mt-2 text-xs text-slate-500">{item.factoryProfile} / {item.lineType}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${techRisk.bgColor} ${techRisk.textColor}`}>技术 {techRisk.label}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${leadTimeRisk.bgColor} ${leadTimeRisk.textColor}`}>交期 {leadTimeRisk.label}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.capacityBand === '紧张' ? 'bg-amber-100 text-amber-700' : item.capacityBand === '平衡' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              产能 {item.capacityBand}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{item.focusNote}</p>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}