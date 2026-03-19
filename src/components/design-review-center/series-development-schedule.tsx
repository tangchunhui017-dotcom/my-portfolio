'use client';

import type { Asset, SeriesDevelopmentPlanRow } from '@/lib/design-review-center/types';
import { PHASE_MAP } from '@/config/design-review-center/status-map';

interface SeriesDevelopmentScheduleProps {
  plans: SeriesDevelopmentPlanRow[];
  assets: Asset[];
}

export default function SeriesDevelopmentSchedule({ plans, assets }: SeriesDevelopmentScheduleProps) {
  const assetTitleById = new Map(assets.map((asset) => [asset.assetId, asset.title]));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">波段开发节奏表</h2>
          <p className="mt-1 text-sm text-slate-500">按周拆解款号、结构、材质、配色和评审重点，适合周会直接使用。</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <th className="p-4">周次</th>
              <th className="p-4">款号</th>
              <th className="p-4">名称</th>
              <th className="p-4">品类 / 角色</th>
              <th className="p-4">楦底方向</th>
              <th className="p-4">帮面结构</th>
              <th className="p-4">材料</th>
              <th className="p-4">配色</th>
              <th className="p-4">参考资产</th>
              <th className="p-4">评审重点</th>
              <th className="p-4">阶段</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan) => {
              const phaseConfig = PHASE_MAP[plan.phase] ?? PHASE_MAP.concept;
              return (
                <tr key={plan.rowId} className="align-top hover:bg-slate-50">
                  <td className="p-4 text-sm font-medium text-slate-900">{plan.weekLabel}</td>
                  <td className="p-4 text-sm text-slate-700">{plan.skuCode}</td>
                  <td className="p-4 text-sm text-slate-900">{plan.itemName}</td>
                  <td className="p-4 text-sm text-slate-600">{plan.category} / {plan.productRole}</td>
                  <td className="p-4 text-sm text-slate-600">{plan.silhouette}</td>
                  <td className="p-4 text-sm text-slate-600">{plan.upperConstruction}</td>
                  <td className="p-4 text-sm text-slate-600">{plan.materialFocus}</td>
                  <td className="p-4 text-sm text-slate-600">{plan.colorDirection}</td>
                  <td className="p-4 text-xs text-slate-500">
                    {plan.referenceAssetIds.map((assetId) => assetTitleById.get(assetId) ?? assetId).join(' / ')}
                  </td>
                  <td className="p-4 text-sm text-slate-700">{plan.reviewFocus}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${phaseConfig.bgColor} ${phaseConfig.textColor}`}>
                      {phaseConfig.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
