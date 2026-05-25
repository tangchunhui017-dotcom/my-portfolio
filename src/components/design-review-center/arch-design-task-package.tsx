'use client';

import { useState } from 'react';
import type { DesignTaskPackage } from '@/lib/design-review-center/arch-derivations';

interface Props {
  packages: DesignTaskPackage[];
}

const STATUS_BADGE: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  blocked: 'bg-rose-100 text-rose-700',
};

const STATUS_LABEL: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  pending_review: '待评审',
  completed: '已完成',
  blocked: '被阻塞',
};

export default function ArchDesignTaskPackage({ packages }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    packages[0]?.taskId ?? null,
  );

  const selected = packages.find((p) => p.taskId === selectedId) ?? null;

  return (
    <div className="flex gap-4 xl:gap-6">
      {/* Left: task list */}
      <div className="w-72 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:w-80">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            任务列表 · {packages.length} 款
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
          {packages.map((pkg) => (
            <button
              key={pkg.taskId}
              type="button"
              onClick={() => setSelectedId(pkg.taskId)}
              className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                selectedId === pkg.taskId ? 'bg-slate-50 border-l-2 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {pkg.isHero && (
                      <span className="flex-shrink-0 rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-600">
                        HERO
                      </span>
                    )}
                    <span className="line-clamp-1 text-sm font-medium text-slate-900">
                      {pkg.styleName}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {pkg.categoryName} · {pkg.waveId || '—'}
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    STATUS_BADGE[pkg.designStatus] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {STATUS_LABEL[pkg.designStatus] ?? pkg.designStatus}
                </span>
              </div>
              {!pkg.canDispatch && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600">
                  <span>⚠</span>
                  <span>{pkg.missingConditions[0] ?? '待补充条件'}</span>
                </div>
              )}
            </button>
          ))}
          {packages.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              暂无任务包数据
            </div>
          )}
        </div>
      </div>

      {/* Right: task detail */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {selected ? (
          <div>
            {/* Header */}
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {selected.isHero && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
                        HERO
                      </span>
                    )}
                    <h4 className="text-base font-semibold text-slate-900">
                      {selected.styleName}
                    </h4>
                    <span className="text-sm text-slate-400">{selected.skuCode}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {selected.seriesName} · {selected.categoryName} · {selected.waveId || '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      STATUS_BADGE[selected.designStatus] ?? 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {STATUS_LABEL[selected.designStatus] ?? selected.designStatus}
                  </span>
                  {selected.canDispatch ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      可下发
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      待补充
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid gap-0 md:grid-cols-2">
              {/* Left col */}
              <div className="space-y-4 border-r border-slate-100 px-6 py-4">
                <Field label="鞋型要求" value={selected.shoeTypeRequirement} />
                <Field label="楦型要求" value={selected.lastRequirement} />
                <Field label="大底要求" value={selected.outsoleRequirement} />
                <Field
                  label="材料方向"
                  value={
                    selected.materialDirections.length > 0
                      ? selected.materialDirections.join('、')
                      : '待定'
                  }
                />
                <Field
                  label="颜色方向"
                  value={
                    selected.colorDirections.length > 0
                      ? selected.colorDirections.join('、')
                      : '待定'
                  }
                />
                {selected.featureKeywords.length > 0 && (
                  <Field
                    label="功能 / 设计关键词"
                    value={selected.featureKeywords.slice(0, 4).join('、')}
                  />
                )}
              </div>

              {/* Right col */}
              <div className="space-y-4 px-6 py-4">
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    输出物要求
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.outputRequirements.map((o) => (
                      <span
                        key={o}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
                <Field label="负责人" value={selected.owner || '—'} />
                <Field label="截止日期" value={selected.dueDate || '—'} />
                {selected.relatedGate && (
                  <Field label="关联节点" value={selected.relatedGate} />
                )}
                {selected.missingConditions.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                      缺失条件
                    </div>
                    <div className="space-y-1">
                      {selected.missingConditions.map((c) => (
                        <div key={c} className="text-xs text-amber-600">
                          · {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            选择左侧任务查看详情
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}
