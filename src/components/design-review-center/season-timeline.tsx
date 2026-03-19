'use client';

import type { Milestone, Timeline } from '@/lib/design-review-center/types';
import { GATE_TYPE_MAP, MILESTONE_STATUS_MAP, MILESTONE_TRACK_MAP } from '@/config/design-review-center/status-map';

interface SeasonTimelineProps {
  timeline: Timeline;
}

function sortByDate(left: Milestone, right: Milestone) {
  return new Date(left.plannedDate).getTime() - new Date(right.plannedDate).getTime();
}

export default function SeasonTimeline({ timeline }: SeasonTimelineProps) {
  const groupedTracks = timeline.milestones.reduce<Record<string, Milestone[]>>((accumulator, milestone) => {
    if (!accumulator[milestone.track]) accumulator[milestone.track] = [];
    accumulator[milestone.track].push(milestone);
    return accumulator;
  }, {});

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">季节多轨时间轴</h3>
          <p className="mt-1 text-sm text-slate-500">把设计、成本和开发节点拆开看，避免鞋企流程被误读成单线推进。</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {timeline.milestones.length} 个节点
        </span>
      </div>

      <div className="space-y-5">
        {Object.entries(MILESTONE_TRACK_MAP).map(([trackKey, trackMeta]) => {
          const milestones = [...(groupedTracks[trackKey] ?? [])].sort(sortByDate);

          return (
            <section key={trackKey} className={`rounded-2xl border ${trackMeta.borderColor} bg-white p-4`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className={`text-sm font-semibold ${trackMeta.accent}`}>{trackMeta.label}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {trackKey === 'design_track' && '概念、原型、样鞋等设计关键评审节点'}
                    {trackKey === 'cost_track' && '概念预估、样鞋核价、BOM 锁价等成本节点'}
                    {trackKey === 'development_track' && '工艺包移交、开模和最终锁定等开发节点'}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {milestones.length} 节点
                </span>
              </div>

              {milestones.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">当前筛选条件下没有该轨道节点。</div>
              ) : (
                <div className="relative overflow-x-auto pb-2">
                  <div className="absolute left-0 top-5 h-0.5 w-full bg-slate-200" />
                  <div className="relative flex min-w-max gap-4">
                    {milestones.map((milestone) => {
                      const statusConfig = MILESTONE_STATUS_MAP[milestone.status];
                      const gateConfig = GATE_TYPE_MAP[milestone.gateType];
                      const delayed = milestone.status === 'delayed' || milestone.status === 'at_risk';

                      return (
                        <article key={milestone.milestoneId} className="w-[200px] flex-shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm ${trackMeta.accent}`}>
                              {gateConfig.icon}
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="mt-4 text-sm font-semibold text-slate-900">{gateConfig.label}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{milestone.title}</div>
                          <div className="mt-3 space-y-1 text-xs text-slate-500">
                            <div>计划：{milestone.plannedDate}</div>
                            <div>实际：{milestone.actualDate ?? '待更新'}</div>
                            <div>负责人：{milestone.owner}</div>
                          </div>
                          {milestone.parallelGroup && (
                            <div className="mt-3 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                              并行组：{milestone.parallelGroup}
                            </div>
                          )}
                          {delayed && <div className="mt-3 text-xs font-medium text-red-600">需要关注</div>}
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
