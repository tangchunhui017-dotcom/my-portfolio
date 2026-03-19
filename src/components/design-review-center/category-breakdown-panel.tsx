import type { CategoryBreakdownRecord } from '@/lib/design-review-center/types';

interface CategoryBreakdownPanelProps {
  breakdowns: CategoryBreakdownRecord[];
}

export default function CategoryBreakdownPanel({ breakdowns }: CategoryBreakdownPanelProps) {
  if (!breakdowns.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无开发品类分解内容。
      </div>
    );
  }

  const groupedBreakdowns = breakdowns.reduce<Record<string, CategoryBreakdownRecord[]>>((accumulator, record) => {
    if (!accumulator[record.seriesId]) accumulator[record.seriesId] = [];
    accumulator[record.seriesId].push(record);
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      {Object.values(groupedBreakdowns).map((records) => {
        const [firstRecord] = records;

        return (
          <section key={firstRecord.seriesId} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{firstRecord.waveId.toUpperCase()}</div>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{firstRecord.seriesName}</h3>
                <p className="mt-2 text-sm text-slate-500">{firstRecord.designConcept}</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {records.reduce((sum, record) => sum + record.plannedSkuCount, 0)} 款规划
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
                    <th className="px-3">当前关注点</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.breakdownId} className="rounded-2xl bg-slate-50 text-slate-700">
                      <td className="rounded-l-2xl px-3 py-4 font-semibold text-slate-900">{record.category}</td>
                      <td className="px-3 py-4">{record.plannedSkuCount}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {record.productRoles.map((role) => (
                            <span key={role} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="space-y-1">
                          {record.keyStructures.map((structure) => (
                            <div key={structure}>{structure}</div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {record.weekLabels.map((week) => (
                            <span key={week} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              {week}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="rounded-r-2xl px-3 py-4 text-sm text-slate-600">{record.focusNote}</td>
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