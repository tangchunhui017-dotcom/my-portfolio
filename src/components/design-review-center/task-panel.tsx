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

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  low: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
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
        <h3 className="text-lg font-semibold text-slate-900">本周待办</h3>
        <span className="text-sm text-slate-600">{sortedTasks.length} 项</span>
      </div>
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">暂无待办</div>
        ) : (
          sortedTasks.map((task) => {
            const colors = priorityColors[task.priority];
            const isOverdue = startOfDay(task.dueDate) < baseline;
            return (
              <div
                key={task.taskId}
                className={`rounded-lg border ${colors.border} ${colors.bg} p-4 transition-all hover:shadow-md`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{task.title}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {taskTypeLabels[task.taskType] ?? task.taskType} · {statusLabels[task.status] ?? task.status}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors.text}`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-slate-700">{task.description}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>负责人 {task.assignee}</span>
                  <span className={isOverdue ? 'font-semibold text-red-600' : ''}>
                    到期: {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
