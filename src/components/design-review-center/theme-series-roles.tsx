'use client';

import type { SeriesRoleMatrixRow, SeriesBusinessTask, SeriesDecisionStatus } from '@/lib/design-review-center/types';

interface ThemeSeriesRolesProps {
  rows: SeriesRoleMatrixRow[];
}

const ROLE_META: Record<SeriesRoleMatrixRow['seriesRole'], { label: string; abbr: string; bg: string; text: string; border: string }> = {
  hero: { label: 'Hero 主推', abbr: 'H', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  image: { label: '形象', abbr: 'I', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  profit: { label: '利润', abbr: 'P', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  traffic: { label: '流量', abbr: 'T', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  base: { label: '基础', abbr: 'B', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  test: { label: '测试', abbr: 'X', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

const TASK_META: Record<SeriesBusinessTask, { label: string; bg: string; text: string }> = {
  acquisition: { label: '拉新', bg: 'bg-blue-50', text: 'text-blue-600' },
  volume: { label: '走量', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  margin: { label: '毛利', bg: 'bg-violet-50', text: 'text-violet-600' },
  brand_image: { label: '形象', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  channel_exclusive: { label: '渠道专供', bg: 'bg-amber-50', text: 'text-amber-600' },
  test_market: { label: '市场测试', bg: 'bg-slate-50', text: 'text-slate-600' },
};

const DECISION_META: Record<SeriesDecisionStatus, { label: string; dot: string; text: string }> = {
  recommend_proceed: { label: '可推进', dot: 'bg-emerald-400', text: 'text-emerald-700' },
  pending_review: { label: '待评审', dot: 'bg-slate-400', text: 'text-slate-600' },
  needs_adjustment: { label: '需调整', dot: 'bg-red-500', text: 'text-red-700' },
  small_batch: { label: '小批量', dot: 'bg-blue-400', text: 'text-blue-700' },
  cancel: { label: '建议取消', dot: 'bg-rose-500', text: 'text-rose-700' },
};

export default function ThemeSeriesRoles({ rows }: ThemeSeriesRolesProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">系列角色与产品线分工</div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">每个系列承担什么业务角色</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['hero', 'image', 'profit', 'traffic', 'base'] as SeriesRoleMatrixRow['seriesRole'][]).map((role) => {
            const m = ROLE_META[role];
            return (
              <span key={role} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${m.bg} ${m.text} ${m.border}`}>
                <span className="font-black">{m.abbr}</span> {m.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[120px]">系列</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">角色</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">业务任务</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[120px]">目标消费者</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">主场景</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">价格带</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">SKU</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Hero</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">关键鞋型</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 min-w-[160px]">当前判断</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const rm = ROLE_META[row.seriesRole];
              const dm = DECISION_META[row.decisionStatus];
              return (
                <tr
                  key={row.seriesId}
                  className={`hover:bg-slate-50/60 transition-colors ${row.decisionStatus === 'needs_adjustment' ? 'bg-red-50/20' : ''}`}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-black text-slate-900">{row.seriesName}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{row.waveId}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${rm.bg} ${rm.text} ${rm.border}`}>
                      {rm.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {row.businessTasks.map((task) => {
                        const tm = TASK_META[task];
                        return (
                          <span key={task} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tm.bg} ${tm.text}`}>
                            {tm.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-slate-700 leading-relaxed">{row.targetConsumer}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-slate-600">{row.mainScenario}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-black text-slate-800 whitespace-nowrap">{row.mainPriceBand}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-base font-black text-slate-900">{row.skuTarget}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-xs font-black text-violet-700">
                      {row.heroStyleCount}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {row.keyShoeTypes.map((t) => (
                        <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${dm.dot}`} />
                      <div>
                        <div className={`text-[10px] font-bold ${dm.text} mb-0.5`}>{dm.label}</div>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{row.currentDecision}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
        <p className="text-[11px] text-slate-400 font-medium">
          角色定义：<span className="font-bold text-violet-600">Hero</span> 集中资源主推 ·
          <span className="font-bold text-blue-600 ml-2">形象</span> 建立品牌辨识度 ·
          <span className="font-bold text-emerald-600 ml-2">利润</span> 毛利贡献核心 ·
          <span className="font-bold text-amber-600 ml-2">流量</span> 拉新引流 ·
          <span className="font-bold text-slate-600 ml-2">基础</span> 保持品类覆盖
        </p>
      </div>
    </div>
  );
}
