'use client';

import type { WorkflowTabKey } from '@/config/design-review-center/workflow-tabs';

interface Props {
  onNavigateTab?: (tab: WorkflowTabKey) => void;
}

const LINKS: { tab: WorkflowTabKey; label: string; desc: string; color: string }[] = [
  {
    tab: 'themeStrategy',
    label: '← 主题与系列策略',
    desc: '回顾系列方向与设计语言',
    color: 'border-slate-200 hover:border-slate-300',
  },
  {
    tab: 'developmentTaskPool',
    label: '生成开发任务 →',
    desc: '进入单款开发任务池，批量下发任务',
    color: 'border-blue-200 bg-blue-50/50 hover:border-blue-300',
  },
  {
    tab: 'designVersionPreview',
    label: '设计版本 →',
    desc: '进入版本链进行材料配色判断',
    color: 'border-blue-200 bg-blue-50/50 hover:border-blue-300',
  },
  {
    tab: 'developmentGateTable',
    label: '开发节点表 →',
    desc: '波段研发节点跟踪与里程碑确认',
    color: 'border-slate-200 hover:border-slate-300',
  },
  {
    tab: 'reviewDecisionCenter',
    label: '提交评审 →',
    desc: '进入评审决议，记录架构决策',
    color: 'border-violet-200 bg-violet-50/50 hover:border-violet-300',
  },
];

export default function ArchDownstreamLinks({ onNavigateTab }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {LINKS.map((link) => (
        <button
          key={link.tab}
          type="button"
          onClick={() => onNavigateTab?.(link.tab)}
          className={`rounded-xl border bg-white px-4 py-4 text-left shadow-sm transition-all hover:shadow-md ${link.color}`}
        >
          <div className="text-sm font-semibold text-slate-900">{link.label}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-500">{link.desc}</div>
        </button>
      ))}
    </div>
  );
}
