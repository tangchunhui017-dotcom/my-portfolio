'use client';

import { Fragment, useState } from 'react';
import type { StyleSlot } from '@/lib/design-review-center/arch-derivations';

interface Props {
  slots: StyleSlot[];
  selectedCategory?: string;
}

const RISK_TEXT: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-600',
  high: 'text-rose-600',
  blocking: 'text-rose-700',
};

const DEV_LEVEL_CLS: Record<string, string> = {
  新款: 'bg-blue-100 text-blue-700',
  续款: 'bg-slate-100 text-slate-600',
  平台延伸: 'bg-violet-100 text-violet-700',
};

function DevLevelBadge({ devLevel }: { devLevel: string }) {
  const cls = DEV_LEVEL_CLS[devLevel] ?? 'bg-amber-100 text-amber-700';
  return (
    <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {devLevel}
    </span>
  );
}

const DESIGN_STATUS_LABEL: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  pending_review: '待评审',
  completed: '已完成',
  blocked: '被阻塞',
};

export default function ArchStyleSlotBreakdown({ slots, selectedCategory }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localCategory, setLocalCategory] = useState<string>('');

  const activeCategory = selectedCategory ?? localCategory;
  const categories = [...new Set(slots.map((s) => s.categoryName))];
  const visible = activeCategory
    ? slots.filter((s) => s.categoryName === activeCategory)
    : slots;

  const canDispatchCount = visible.filter((s) => s.canDispatch).length;
  const blockedCount = visible.filter((s) => s.blocked).length;

  return (
    <div className="space-y-3">
      {/* Category quick-filter (only shown when no external selectedCategory) */}
      {!selectedCategory && categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setLocalCategory('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              !localCategory
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部 ({slots.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setLocalCategory(cat === localCategory ? '' : cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                localCategory === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat} ({slots.filter((s) => s.categoryName === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span>共 {visible.length} 款</span>
        <span className="text-emerald-600 font-medium">可下发 {canDispatchCount}</span>
        <span className="text-amber-600 font-medium">
          待补充 {visible.length - canDispatchCount - blockedCount}
        </span>
        {blockedCount > 0 && (
          <span className="text-rose-600 font-medium">阻塞 {blockedCount}</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">款位名称</th>
                <th className="px-4 py-3">品类</th>
                <th className="px-4 py-3">系列</th>
                <th className="px-4 py-3">波段</th>
                <th className="px-4 py-3">开发类型</th>
                <th className="px-4 py-3">颜色数</th>
                <th className="px-4 py-3">价格带</th>
                <th className="px-4 py-3">目标成本</th>
                <th className="px-4 py-3">报价</th>
                <th className="px-4 py-3">底型 / 楦型</th>
                <th className="px-4 py-3">设计状态</th>
                <th className="w-20 px-4 py-3">可下发</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-8 text-center text-sm text-slate-400"
                  >
                    当前筛选无款位数据
                  </td>
                </tr>
              ) : (
                visible.map((slot) => (
                  <Fragment key={slot.slotId}>
                    <tr
                      className={`cursor-pointer hover:bg-slate-50/80 ${
                        slot.blocked ? 'bg-rose-50/30' : ''
                      } ${slot.isHero ? 'border-l-4 border-rose-500' : ''}`}
                      onClick={() =>
                        setExpandedId(expandedId === slot.slotId ? null : slot.slotId)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {slot.isHero && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                              HERO
                            </span>
                          )}
                          <span className="line-clamp-1 font-medium text-slate-900">
                            {slot.slotName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{slot.skuCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{slot.categoryName}</td>
                      <td className="max-w-[120px] px-4 py-3 text-slate-600">
                        <span className="line-clamp-1">{slot.seriesName || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {slot.waveId ? (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {slot.waveId.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{slot.developmentRole}</div>
                        <DevLevelBadge devLevel={slot.devLevel} />
                      </td>
                      <td className="px-4 py-3">
                        {slot.colors.length > 0 ? (
                          <span className="text-xs text-slate-600">×{slot.colors.length}色</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{slot.targetPriceBand || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {slot.targetCost ? `¥${slot.targetCost}` : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          slot.quotedCost &&
                          slot.targetCost &&
                          slot.quotedCost > slot.targetCost
                            ? 'text-rose-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {slot.quotedCost ? `¥${slot.quotedCost}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>{slot.outsole || '底型待定'}</div>
                        <div className="text-slate-400">{slot.last || '楦型待定'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs ${
                            RISK_TEXT[slot.riskLevel] ?? 'text-slate-500'
                          }`}
                        >
                          {DESIGN_STATUS_LABEL[slot.designStatus] ?? slot.designStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {slot.canDispatch ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            可下发
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            待补充
                          </span>
                        )}
                      </td>
                    </tr>

                    {expandedId === slot.slotId && (
                      <tr>
                        <td colSpan={12} className="bg-slate-50 px-6 py-4">
                          <div className="grid gap-4 text-sm md:grid-cols-4">
                            <div>
                              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                材料方向
                              </div>
                              <div className="text-slate-700">
                                {slot.materials.join('、') || '待定'}
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                颜色方向
                              </div>
                              {slot.colors.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {slot.colors.map((c) => (
                                    <span key={c} className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-slate-700">待定</div>
                              )}
                            </div>
                            <div>
                              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                负责人 / 截止日期
                              </div>
                              <div className="text-slate-700">
                                {slot.owner} · {slot.dueDate || '—'}
                              </div>
                            </div>
                            {slot.missingConditions.length > 0 && (
                              <div>
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                                  缺失条件
                                </div>
                                <div className="space-y-0.5">
                                  {slot.missingConditions.map((c) => (
                                    <div key={c} className="text-xs text-amber-600">
                                      · {c}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {slot.nextAction && (
                            <div className="mt-3 text-xs text-slate-500">
                              <span className="font-medium text-slate-600">下一步：</span>
                              {slot.nextAction}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
