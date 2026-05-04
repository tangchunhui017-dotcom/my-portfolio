import type { ArchitectureRoleKey, ProductArchitectureView } from '@/lib/design-review-center/types';

interface ProductArchitecturePanelProps {
  architecture: ProductArchitectureView;
  pyramidFilter?: string | null;
}

const PYRAMID_ROLE_MAP: Record<string, ArchitectureRoleKey[]> = {
  hero: ['lead', 'image'],
  core: ['traffic', 'functional'],
  filler: ['basic'],
};

const DISPLAY_THEME_COLORS = ['#2563EB', '#F97316', '#7C3AED', '#16A34A', '#E11D48', '#0F766E', '#CA8A04', '#0891B2'] as const;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function emphasisClass(emphasis: ProductArchitectureView['platformInsights'][number]['emphasis']) {
  if (emphasis === 'warning') return 'border-amber-200 bg-amber-50';
  if (emphasis === 'accent') return 'border-cyan-200 bg-cyan-50';
  return 'border-slate-200 bg-white';
}

function sum(values: number[]) {
  return values.reduce((total, current) => total + current, 0);
}

export default function ProductArchitecturePanel({ architecture, pyramidFilter }: ProductArchitecturePanelProps) {
  if (!architecture.inputs.length || !architecture.matrix.columns.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无 OTB 转译后的产品架构内容。
      </div>
    );
  }

  const summaryCards = [
    { label: '品类数', value: String(architecture.summary.categoryCount), sub: '当前筛选范围内的一级品类数' },
    { label: '款数目标', value: String(architecture.summary.styleTarget), sub: 'OTB 转译后的 SPU 目标' },
    { label: 'SKU 目标', value: String(architecture.summary.skuTarget), sub: '按价格带与深度校准后的 SKU 宽度' },
    { label: '主推款占比', value: percent(architecture.summary.leadStyleRate), sub: `主推款 ${architecture.summary.leadStyleCount} 款` },
    { label: '新开模占比', value: percent(architecture.summary.newToolingRate), sub: `新开模 ${architecture.summary.newToolingCount} 款` },
    { label: '共底率', value: percent(architecture.summary.sharedOutsoleRate), sub: '优先让底台策略成为开发约束' },
    { label: '共楦率', value: percent(architecture.summary.sharedLastRate), sub: '先稳定脚感、再做面层差异化' },
    { label: '平台复用率', value: percent(architecture.summary.platformReuseRate), sub: '成熟平台尽量跨系列承接' },
  ];

  const themeLegend = Array.from(
    new Map(
      architecture.inputs.map((input) => [
        input.seriesId,
        {
          seriesId: input.seriesId,
          seriesName: input.seriesName,
        },
      ]),
    ).values(),
  ).map((theme, index) => ({
    ...theme,
    themeColorHex: DISPLAY_THEME_COLORS[index % DISPLAY_THEME_COLORS.length],
  }));

  const themeColorMap = new Map(themeLegend.map((theme) => [theme.seriesId, theme.themeColorHex]));

  function getDisplayThemeColor(seriesId: string) {
    return themeColorMap.get(seriesId) ?? '#2563EB';
  }

  function renderThemeQuantitySeries(categoryName: string, mode: 'style' | 'sku') {
    const matchedInputs = architecture.inputs.filter((input) => input.categoryName === categoryName);

    return matchedInputs.map((input) => {
      const count = mode === 'style' ? input.styleTarget : input.skuTarget;
      return (
        <div key={`${mode}-${categoryName}-${input.seriesId}`} className="space-y-1 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {input.seriesName} {count}
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: count }, (_, index) => (
                <span
                  key={`${mode}-${categoryName}-${input.seriesId}-${index}`}
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: getDisplayThemeColor(input.seriesId) }}
                  title={`${input.seriesName} · ${mode === 'style' ? '款数' : 'SKU'} ${count}`}
                />
              ))}
            </div>
          </div>
          <div className="pl-0.5 text-[11px] text-slate-400">
            {mode === 'style' ? `预算占比 ${Math.round(input.budgetShare * 100)}%` : `价格带 ${input.priceBand}`}
          </div>
        </div>
      );
    });
  }

  function renderQuantityCard(categoryName: string, mode: 'style' | 'sku') {
    const matchedInputs = architecture.inputs.filter((input) => input.categoryName === categoryName);
    const total = sum(matchedInputs.map((input) => (mode === 'style' ? input.styleTarget : input.skuTarget)));
    const label = mode === 'style' ? '款数目标' : 'SKU 目标';

    return (
      <article className="rounded-[20px] border border-slate-200/75 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-slate-900">{label}</div>
            <div className="mt-2 space-y-1.5">{renderThemeQuantitySeries(categoryName, mode)}</div>
          </div>
          <div className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">{total}</div>
        </div>
      </article>
    );
  }
  function renderStructureAllocations(item: ProductArchitectureView['matrix']['rows'][number]['cells'][number]['items'][number]) {
    return item.allocations
      .sort((left, right) => right.count - left.count)
      .map((allocation) => (
        <div key={`${item.key}-${allocation.seriesId}`} className="space-y-1 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {allocation.seriesName} {allocation.count}
            </span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: allocation.count }, (_, index) => (
                <span
                  key={`${item.key}-${allocation.seriesId}-${index}`}
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: getDisplayThemeColor(allocation.seriesId) }}
                  title={`${allocation.seriesName} ${allocation.count}`}
                />
              ))}
            </div>
          </div>
          {allocation.helperText ? <div className="pl-0.5 text-[11px] text-slate-400">{allocation.helperText}</div> : null}
        </div>
      ));
  }

  function renderStructureCard(item: ProductArchitectureView['matrix']['rows'][number]['cells'][number]['items'][number]) {
    return (
      <article key={item.key} className="rounded-[20px] border border-slate-200/75 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-slate-900">{item.label}</div>
            <div className="mt-2 space-y-1.5">{renderStructureAllocations(item)}</div>
          </div>
          <div className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm shrink-0">{item.count}</div>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">OTB Translation</div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">把经营预算语言转成鞋类产品架构与开发语言</h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{architecture.sourceSummary}</p>
          </div>
          <div className="space-y-2 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] px-4 py-3 text-sm text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">结构模板</div>
              <div className="mt-1 font-medium text-slate-900">{architecture.profileLabel}</div>
            </div>
            <div>当前矩阵按一级品类展开，横向支持后续由真实 OTB 内容动态变化。</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.label} className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{card.sub}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Footwear Architecture Matrix</div>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">鞋类产品架构矩阵</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">横向按鞋类一级品类展开，纵向按数量、风格角色、结构类型、底型/跟型、楦型/鞋头、开发属性和平台策略表达。</p>
          <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="text-xs font-medium text-slate-500">色块说明：这里使用高对比显示色来代表不同主题 / 系列，数量行中的色块个数直接对应该主题在该品类中的款数或 SKU 分配。</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {themeLegend.map((theme) => (
                <div key={theme.seriesId} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.themeColorHex }} />
                  <span>{theme.seriesName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto drc-matrix-scroll">
          <table className="min-w-[1240px] w-full border-collapse">
            <thead className="bg-white sticky top-0 z-20 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="w-[220px] drc-column-sticky border-b border-slate-200/80 px-5 py-4 z-30">结构维度</th>
                {architecture.matrix.columns.map((column) => (
                  <th key={column.categoryName} className="min-w-[220px] border-b border-l border-slate-200/80 px-5 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">{column.categoryName}</div>
                    <div className="mt-2 text-[11px] leading-5 text-slate-500">{column.waves.join(' / ')} · {column.priceBands.join(' / ')}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">款数 {column.styleTarget}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">SKU {column.skuTarget}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {architecture.matrix.rows.map((row) => {
                // 定义跨列共享插槽以实现绝对的像素级对齐
                const GLOBAL_LABEL_ORDER = [
                  '基本款', '主推款', '形象款', '引流款', '功能款',
                  '新底', '继承底', '共底', '新楦', '继承楦', '共楦'
                ];
                
                const slotLabelsSet = new Set<string>();
                row.cells.forEach(cell => cell.items.forEach(item => slotLabelsSet.add(item.label)));
                
                const slotLabels = Array.from(slotLabelsSet).sort((a, b) => {
                  const indexA = GLOBAL_LABEL_ORDER.indexOf(a);
                  const indexB = GLOBAL_LABEL_ORDER.indexOf(b);
                  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                  if (indexA !== -1) return -1;
                  if (indexB !== -1) return 1;
                  return 0;
                });

                return (
                  <tr key={row.key} className="align-top">
                    <td className="drc-column-sticky border-b border-slate-200/80 bg-slate-50/95 backdrop-blur-sm px-5 py-5 align-middle z-10 shadow-[1px_0_0_rgba(0,0,0,0.04)]">
                      <div className="font-semibold text-slate-900">{row.label}</div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">{row.helperText}</div>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={`${row.key}-${cell.categoryName}`} className="align-middle border-b border-l border-slate-200/80 px-4 py-4">
                        {row.key === 'quantity' ? (
                          <div className="space-y-3">
                            {renderQuantityCard(cell.categoryName, 'style')}
                            {renderQuantityCard(cell.categoryName, 'sku')}
                            <div className="text-[11px] text-slate-400">{cell.summary}</div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 auto-rows-[104px] gap-3">
                            {slotLabels.length === 0 ? (
                              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 flex items-center justify-center">暂无数据</div>
                            ) : (
                              slotLabels.map(label => {
                                const item = cell.items.find(i => i.label === label);
                                // 金字塔联动：高亮/淡化 styleRole 行
                                const isRoleRow = row.key === 'styleRole';
                                const matchedRoles = pyramidFilter ? (PYRAMID_ROLE_MAP[pyramidFilter] ?? []) : [];
                                const isMatch = item && isRoleRow && matchedRoles.some((r) => item.label.toLowerCase().includes(r));
                                const isDimmed = item && isRoleRow && pyramidFilter && !isMatch;

                                return (
                                  <div key={label} className="h-full w-full">
                                    {item ? (
                                      <div
                                        className="h-full w-full transition-all duration-300"
                                        style={{ opacity: isDimmed ? 0.3 : 1, transform: isDimmed ? 'scale(0.98)' : 'scale(1)' }}
                                      >
                                        {renderStructureCard(item)}
                                      </div>
                                    ) : (
                                      <div className="h-full w-full" />
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Platform Strategy</div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">架构说明 / 平台策略区</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">这一段不展示经营金额，而是把共底、共楦、新开模和平台复用翻译成开发执行可承接的结构化说明。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {architecture.platformInsights.map((insight) => (
            <article key={insight.insightId} className={`rounded-2xl border p-4 shadow-sm ${emphasisClass(insight.emphasis)}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-500">{insight.title}</div>
                <div className="flex items-center gap-1.5">
                  {insight.seriesIds.slice(0, 4).map((seriesId, index) => (
                    <span key={`${insight.insightId}-${seriesId}-${index}`} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getDisplayThemeColor(seriesId) }} />
                  ))}
                </div>
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{insight.value}</div>
              <div className="mt-3 text-sm leading-6 text-slate-600">{insight.summary}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}




