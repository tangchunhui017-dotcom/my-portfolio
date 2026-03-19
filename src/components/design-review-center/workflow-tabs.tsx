'use client';

import type { WorkflowTabDefinition, WorkflowTabKey } from '@/config/design-review-center/workflow-tabs';

interface WorkflowTabsProps {
  tabs: WorkflowTabDefinition[];
  activeTab: WorkflowTabKey;
  onTabChange: (tab: WorkflowTabKey) => void;
}

export default function WorkflowTabs({ tabs, activeTab, onTabChange }: WorkflowTabsProps) {
  const activeDefinition = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  return (
    <section>
      <div className="overflow-x-auto scrollbar-hide border-b border-slate-200">
        <div className="flex min-w-max items-center gap-1">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={[
                  'px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-all duration-150 whitespace-nowrap',
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
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        <span className="font-semibold text-slate-900">{activeDefinition.label}</span>
        <span className="mx-2 text-slate-300">/</span>
        {activeDefinition.description}
      </div>
    </section>
  );
}
