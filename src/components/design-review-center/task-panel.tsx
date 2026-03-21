'use client';

import type { Task } from '@/lib/design-review-center/types';

interface TaskPanelProps {
  tasks: Task[];
  referenceDate: string;
}

const taskTypeLabels: Record<string, string> = {
  design: '设计',
  sample: '样品',
  sourcing: '采购',
  testing: '测试',
  marketing: '营销',
};

const taskGroupLabels: Record<string, string> = {
  design: '设计修改',
  cost: '成本推进',
  development: '开发跟进',
  planning: '企划收敛',
};

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  low: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
};

const priorityLabels: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

const statusLabels: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
};

function startOfDay(dateValue: string) {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export default function TaskPanel({ tasks, referenceDate }: TaskPanelProps) {
  const baseline = startOfDay(referenceDate);

  const sortedTasks = [...tasks]
    .filter((task) => task.status !== 'completed')
    .sort((a, b) => startOfDay(a.dueDate) - startOfDay(b.dueDate));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">本周待办</h3>
          <p className="mt-1 text-sm text-slate-500">优先看本周到期、已逾期和评审后需要立即推进的任务。</p>
        </div>
        <span className="text-sm text-slate-600">{sortedTasks.length} 项</span>
      </div>
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">暂无待办</div>
        ) : (
          sortedTasks.map((task) => {
            const colors = priorityColors[task.priority];
            const isOverdue = startOfDay(task.dueDate) < baseline;
            const metaTags = [
              taskGroupLabels[task.taskGroup ?? ''] ?? '',
              taskTypeLabels[task.taskType] ?? task.taskType,
              statusLabels[task.status] ?? task.status,
            ].filter(Boolean);

            return (
              <div key={task.taskId} className={'rounded-lg border ' + colors.border + ' ' + colors.bg + ' p-4 transition-all hover:shadow-md'}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{task.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {metaTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {tag}
                        </span>
                      ))}
                      {isOverdue ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                          已逾期
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-700">
                      {task.description || '当前任务已建立，待补充更细的修改动作与交付要求。'}
                    </div>
                  </div>
                  <span className={'rounded-full px-2 py-1 text-xs font-semibold ' + colors.text}>
                    {priorityLabels[task.priority] ?? task.priority}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>责任人 {task.assignee}</span>
                  <span className={isOverdue ? 'font-semibold text-red-600' : ''}>
                    到期 {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                  </span>
                  {task.estimatedHours > 0 ? <span>预估 {task.estimatedHours} 小时</span> : null}
                  {task.tags.length > 0 ? <span>标签 {task.tags.join(' / ')}</span> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}