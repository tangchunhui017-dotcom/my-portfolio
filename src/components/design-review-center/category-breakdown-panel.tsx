import type { SeriesWithBrief } from '@/lib/design-review-center/types';

interface CategoryBreakdownPanelProps {
  series: SeriesWithBrief[];
}

export default function CategoryBreakdownPanel({ series }: CategoryBreakdownPanelProps) {
  if (!series.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无开发品类分解内容。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {series.map((item) => {
        const categoryMap = new Map<
          string,
          {
            count: number;
            roles: Set<string>;
            structures: Set<string>;
            weeks: Set<string>;
          }
        >();

        item.developmentPlan.forEach((row) => {
          const existing = categoryMap.get(row.category) ?? {
            count: 0,
            roles: new Set<string>(),
            structures: new Set<string>(),
            weeks: new Set<string>(),
          };
          existing.count += 1;
          existing.roles.add(row.productRole);
          existing.structures.add(row.upperConstruction);
          existing.weeks.add(row.weekLabel);
          categoryMap.set(row.category, existing);
        });

        return (
          <section key={item.seriesId} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.waveId.toUpperCase()}</div>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{item.seriesName}</h3>
                <p className="mt-2 text-sm text-slate-500">{item.brief?.designConcept ?? '待补充系列设计说明。'}</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {item.developmentPlan.length} 款开发计划
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-3">开发品类</th>
                    <th className="px-3">计划款数</th>
                    <th className="px-3">产品角色</th>
                    <th className="px-3">关键结构</th>
                    <th className="px-3">周次推进</th>
                  </tr>
                </thead>
                <tbody>
                  {[...categoryMap.entries()].map(([category, detail]) => (
                    <tr key={category} className="rounded-2xl bg-slate-50 text-slate-700">
                      <td className="rounded-l-2xl px-3 py-4 font-semibold text-slate-900">{category}</td>
                      <td className="px-3 py-4">{detail.count}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {[...detail.roles].map((role) => (
                            <span key={role} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="space-y-1">
                          {[...detail.structures].slice(0, 2).map((structure) => (
                            <div key={structure}>{structure}</div>
                          ))}
                        </div>
                      </td>
                      <td className="rounded-r-2xl px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {[...detail.weeks].map((week) => (
                            <span key={week} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              {week}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
