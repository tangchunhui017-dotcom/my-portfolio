'use client';

import type { WorkflowTabDefinition, WorkflowTabKey } from '@/config/design-review-center/workflow-tabs';

interface WorkflowTabsProps {
  tabs: WorkflowTabDefinition[];
  activeTab: WorkflowTabKey;
  onTabChange: (tab: WorkflowTabKey) => void;
}

export default function WorkflowTabs({ tabs, activeTab, onTabChange }: WorkflowTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap',
              active
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            ].join(' ')}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
