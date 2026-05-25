'use client';

import type { ArchInputRow, AlignStatus } from '@/lib/design-review-center/arch-derivations';

interface Props {
  rows: ArchInputRow[];
  onNavigateTab?: (tab: string) => void;
}

const STATUS_CLS: Record<AlignStatus, string> = {
  aligned: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  not_aligned: 'bg-rose-50 text-rose-700 border-rose-200',
  deviated: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABEL: Record<AlignStatus, string> = {
  aligned: '已承接',
  partial: '部分承接',
  not_aligned: '未承接',
  deviated: '偏离',
};

export default function ArchMerchInputAlignment({ rows, onNavigateTab }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <th className="w-32 px-4 py-3">输入维度</th>
              <th className="px-4 py-3">输入内容</th>
              <th className="px-4 py-3">架构承接结果</th>
              <th className="w-24 px-4 py-3">承接状态</th>
              <th className="w-14 px-4 py-3 text-right">系列</th>
              <th className="w-14 px-4 py-3 text-right">款数</th>
              <th className="w-14 px-4 py-3 text-right">任务</th>
              <th className="px-4 py-3">缺口 / 偏差</th>
              <th className="w-28 px-4 py-3">推荐动作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{row.dimension}</td>
                <td className="max-w-[200px] px-4 py-3 text-slate-600">
                  <span className="line-clamp-2">{row.inputSummary}</span>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-slate-600">
                  <span className="line-clamp-2">{row.archResult}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_CLS[row.alignStatus]}`}
                  >
                    {STATUS_LABEL[row.alignStatus]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-700">{row.seriesCount}</td>
                <td className="px-4 py-3 text-right text-slate-700">{row.styleCount}</td>
                <td className="px-4 py-3 text-right text-slate-700">{row.taskCount}</td>
                <td className="px-4 py-3 text-xs text-rose-600">
                  <span className="line-clamp-1">{row.gap || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.(row.jumpModule)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {row.recommendedAction}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
