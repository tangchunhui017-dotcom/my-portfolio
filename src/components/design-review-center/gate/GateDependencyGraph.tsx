'use client';

import { useMemo, useState } from 'react';
import type {
  GateDependencyData,
  GateDependencyLink,
  GateDependencyNode,
} from '@/lib/design-review-center/gate-derivations';

interface Props {
  data: GateDependencyData;
  onGateClick?: (gateId: string) => void;
}

const STATUS_CLS: Record<string, string> = {
  done:       'bg-emerald-50 border-emerald-200 text-emerald-700',
  inprogress: 'bg-sky-50 border-sky-200 text-sky-700',
  dueSoon:    'bg-amber-50 border-amber-200 text-amber-700',
  overdue:    'bg-amber-50 border-amber-200 text-amber-700',
  blocked:    'bg-rose-50 border-rose-200 text-rose-700',
  pending:    'bg-slate-50 border-slate-200 text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
  done:       '已完成',
  inprogress: '进行中',
  dueSoon:    '本周到期',
  overdue:    '逾期',
  blocked:    '阻塞',
  pending:    '待启动',
};

const GROUP_LABEL: Record<string, string> = {
  planning:    '企划',
  design:      '设计',
  development: '开发',
  cost:        '成本',
  launch:      '上市',
};

function formatShortDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function statusRank(node: GateDependencyNode) {
  if (node.status === 'blocked') return 0;
  if (node.status === 'overdue') return 1;
  if (node.status === 'dueSoon') return 2;
  return 3;
}

export default function GateDependencyGraph({ data, onGateClick }: Props) {
  const [expandedBlocker, setExpandedBlocker] = useState<string | null>(null);

  const nodeMap = useMemo(
    () => new Map(data.nodes.map((n) => [n.gateId, n])),
    [data.nodes],
  );

  const stats = useMemo(() => {
    const blocked = data.nodes.filter((n) => n.isBlocking).length;
    const overdue = data.nodes.filter((n) => n.status === 'overdue').length;
    const launchImpact = data.nodes.filter(
      (n) => (n.status === 'overdue' || n.status === 'blocked') && n.impactScope.includes('上市'),
    ).length;
    const hasPred = new Set(data.links.map((l) => l.to));
    const hasSucc = new Set(data.links.map((l) => l.from));
    const criticalChain = data.nodes.filter((n) => hasPred.has(n.gateId) && hasSucc.has(n.gateId)).length;
    const downstreamAffected = new Set(
      data.links
        .filter((link) => {
          const from = nodeMap.get(link.from);
          return from && (from.isBlocking || from.status === 'overdue' || from.status === 'dueSoon');
        })
        .map((link) => link.to),
    ).size;
    return { blocked, overdue, launchImpact, criticalChain, downstreamAffected };
  }, [data, nodeMap]);

  // Build blocking chains: each problematic node + its direct downstream dependents
  const blockingChains = useMemo(() => {
    const sources = data.nodes.filter((n) => n.isBlocking || n.status === 'overdue' || n.status === 'dueSoon');
    return sources
      .map((blocker) => {
        const impacts = data.links
          .filter((l) => l.from === blocker.gateId)
          .map((link) => ({ link, node: nodeMap.get(link.to) }))
          .filter(
            (i): i is { link: GateDependencyLink; node: GateDependencyNode } => !!i.node,
          );
        const upstream = data.links
          .filter((l) => l.to === blocker.gateId)
          .map((link) => ({ link, node: nodeMap.get(link.from) }))
          .filter(
            (i): i is { link: GateDependencyLink; node: GateDependencyNode } => !!i.node,
          );
        return { blocker, impacts, upstream };
      })
      .sort((a, b) => {
        const aScore =
          statusRank(a.blocker) * 100 -
          a.impacts.length * 8 -
          (a.blocker.impactScope.includes('上市') ? 20 : 0) -
          Math.max(0, a.blocker.delayDays);
        const bScore =
          statusRank(b.blocker) * 100 -
          b.impacts.length * 8 -
          (b.blocker.impactScope.includes('上市') ? 20 : 0) -
          Math.max(0, b.blocker.delayDays);
        return aScore - bScore;
      });
  }, [data, nodeMap]);

  // Wave-level completion summary
  const waveSummary = useMemo(() => {
    const byWave = new Map<string, { wave: string; total: number; done: number; blocked: number }>();
    data.nodes.forEach((n) => {
      if (!byWave.has(n.waveName)) {
        byWave.set(n.waveName, { wave: n.waveName, total: 0, done: 0, blocked: 0 });
      }
      const w = byWave.get(n.waveName)!;
      w.total++;
      if (n.status === 'done') w.done++;
      if (n.isBlocking || n.status === 'blocked') w.blocked++;
    });
    return Array.from(byWave.values()).sort((a, b) => a.wave.localeCompare(b.wave));
  }, [data.nodes]);

  if (data.nodes.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        暂无依赖数据
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── 统计条 ── */}
      <div className="grid gap-2 sm:grid-cols-5">
        {[
          { label: '关键链路节点', value: stats.criticalChain, cls: 'border-slate-200 bg-slate-50 text-slate-800' },
          { label: '阻塞节点', value: stats.blocked, cls: stats.blocked > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-800' },
          { label: '已逾期', value: stats.overdue, cls: stats.overdue > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-800' },
          { label: '影响上市', value: stats.launchImpact, cls: stats.launchImpact > 0 ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-slate-200 bg-slate-50 text-slate-800' },
          { label: '下游受影响', value: stats.downstreamAffected, cls: stats.downstreamAffected > 0 ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-800' },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border px-3 py-2 ${item.cls}`}>
            <div className="text-xl font-black tabular-nums">{item.value}</div>
            <div className="text-[11px] text-slate-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── 波段完成度提前展示 ── */}
      <div>
        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          各波段节点完成度
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {waveSummary.map((w) => {
            const pct = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
            const isRisky = w.blocked > 0;
            const cardCls = isRisky
              ? 'border-rose-200 bg-rose-50'
              : pct >= 80
                ? 'border-emerald-200 bg-emerald-50'
                : pct >= 50
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-slate-50';
            const numCls = isRisky
              ? 'text-rose-700'
              : pct >= 80
                ? 'text-emerald-700'
                : pct >= 50
                  ? 'text-amber-700'
                  : 'text-slate-600';
            const barCls = isRisky
              ? 'bg-rose-400'
              : pct >= 80
                ? 'bg-emerald-500'
                : pct >= 50
                  ? 'bg-amber-500'
                  : 'bg-slate-400';

            return (
              <div key={w.wave} className={`rounded-xl border px-3 py-3 ${cardCls}`}>
                <div className="mb-1 truncate text-xs font-medium text-slate-700">{w.wave}</div>
                <div className="flex items-end justify-between gap-1">
                  <span className={`text-2xl font-black tabular-nums ${numCls}`}>{pct}%</span>
                  <div className="text-right text-[10px] leading-tight text-slate-400">
                    <div>{w.done}/{w.total} 完成</div>
                    {w.blocked > 0 && <div className="text-rose-600">{w.blocked} 阻塞</div>}
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/60">
                  <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 阻塞 / 逾期链路 ── */}
      <div>
        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          阻塞 / 逾期链路{blockingChains.length > 0 ? ` · ${blockingChains.length} 条` : ''}
        </h4>

        {blockingChains.length > 0 ? (
          <div className="space-y-2">
            {blockingChains.map(({ blocker, impacts, upstream }) => {
              const isExpanded = expandedBlocker === blocker.gateId;
              const isBlocked = blocker.status === 'blocked';
              const headerCls = isBlocked ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50';
              const titleCls = isBlocked ? 'text-rose-800' : 'text-amber-800';
              const firstLink = impacts[0]?.link;
              const hasExpandContent =
                impacts.length > 0 || upstream.length > 0 || !!firstLink?.blockerReason || !!firstLink?.recommendedAction;

              return (
                <div key={blocker.gateId} className={`overflow-hidden rounded-xl border ${headerCls}`}>
                  {/* Header row */}
                  <div className="flex w-full items-center gap-3 px-4 py-3">
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                        STATUS_CLS[blocker.status] ?? ''
                      }`}
                    >
                      {STATUS_LABEL[blocker.status]}
                    </span>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        hasExpandContent
                          ? setExpandedBlocker(isExpanded ? null : blocker.gateId)
                          : undefined
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold ${titleCls}`}>
                          {blocker.gateShortName.split('\n')[0]}
                        </span>
                        <span className="text-xs text-slate-500">
                          {blocker.waveName} · {GROUP_LABEL[blocker.gateGroup] ?? blocker.gateGroup}
                        </span>
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {blocker.priority}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>{blocker.styleName}</span>
                        <span>负责人: {blocker.owner}</span>
                        <span>截止: {formatShortDate(blocker.plannedDate)}</span>
                        {blocker.delayDays > 0 ? (
                          <span className="font-semibold text-rose-600">逾期 {blocker.delayDays} 天</span>
                        ) : (
                          <span>距截止 {blocker.dueInDays} 天</span>
                        )}
                      </div>
                    </button>
                    {impacts.length > 0 && (
                      <span className="shrink-0 rounded-full border border-white bg-white/70 px-2 py-0.5 text-xs text-slate-600">
                        影响 {impacts.length} 个下游
                      </span>
                    )}
                    <button
                      className="shrink-0 text-xs text-slate-500 transition hover:text-slate-800"
                      onClick={() => onGateClick?.(blocker.gateId)}
                    >
                      详情 →
                    </button>
                    {hasExpandContent && (
                      <button
                        onClick={() => setExpandedBlocker(isExpanded ? null : blocker.gateId)}
                        className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
                      >
                        <svg
                          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && hasExpandContent && (
                    <div className="space-y-3 border-t border-white/60 bg-white/70 px-4 pb-4 pt-3">
                      <div className="grid gap-2 lg:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                          <div className="mb-1 font-semibold text-slate-600">当前节点判断</div>
                          <div className="text-slate-700">
                            {firstLink?.blockerReason || blocker.dependencyDescription}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                          <div className="mb-1 font-semibold text-slate-600">关闭标准</div>
                          <div className="text-slate-700">{blocker.closeCriteria}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {blocker.impactScope.map((scope) => (
                          <span
                            key={scope}
                            className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
                          >
                            影响 {scope}
                          </span>
                        ))}
                      </div>
                      {upstream.length > 0 && (
                        <div>
                          <div className="mb-1.5 text-xs font-medium text-slate-500">上游依赖</div>
                          <div className="flex flex-wrap gap-1.5">
                            {upstream.map(({ node }) => (
                              <button
                                key={node.gateId}
                                onClick={() => onGateClick?.(node.gateId)}
                                className={`rounded border px-2 py-1 text-xs ${STATUS_CLS[node.status] ?? ''}`}
                              >
                                {node.gateName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {impacts.length > 0 && (
                        <div>
                          <div className="mb-1.5 text-xs font-medium text-slate-500">下游影响节点</div>
                          <div className="space-y-1.5">
                            {impacts.map(({ link, node }) => (
                              <div key={node.gateId} className="flex items-center gap-2.5">
                                <svg
                                  className="h-3.5 w-3.5 shrink-0 text-slate-300"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                <button
                                  onClick={() => onGateClick?.(node.gateId)}
                                  className="text-sm font-medium text-slate-800 hover:underline"
                                >
                                  {link.toGateName}
                                </button>
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${STATUS_CLS[node.status] ?? ''}`}>
                                  {STATUS_LABEL[node.status] ?? node.status}
                                </span>
                                <span className="text-xs text-slate-400">{node.waveName} · {node.owner}</span>
                                {node.impactScope.slice(0, 2).map((scope) => (
                                  <span key={scope} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                    {scope}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-semibold text-slate-600">建议动作：</span>
                        <span className="text-slate-700">
                          {firstLink?.recommendedAction || blocker.nextAction}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span className="text-base">✓</span>
            <span>当前无节点阻塞，所有依赖链路畅通。</span>
          </div>
        )}
      </div>
    </div>
  );
}
