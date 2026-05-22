'use client';

import { useState } from 'react';
import {
  DEPT_LABELS,
  STAGE_LABELS,
  WORKFLOW_NODES,
  getNodeDateRange,
  isCollabBlocker,
  type ActionPlanRuntime,
  type Blocker,
  type DeliverableStatus,
  type Department,
  type NodeRuntime,
  type NodeStatus,
  type RiskLevel,
  type Season,
  type WorkflowJumpTab,
  type WorkflowNodeDef,
} from '@/config/bigMerchWorkflow';

// ─── Props ────────────────────────────────────────────────────────────────────

interface NodeDetailDrawerProps {
  open: boolean;
  node: WorkflowNodeDef | null;
  runtime: NodeRuntime;
  nodeStatus: NodeStatus;
  nodeRisk: RiskLevel;
  activeSeason: Season;
  activeYear: number;
  isLocked: { locked: boolean; reason?: string };
  onClose: () => void;
  onUpdateActionPlan: (planId: string, update: Partial<ActionPlanRuntime>) => void;
  onUpdateDeliverable: (delivId: string, status: DeliverableStatus) => void;
  onAddBlocker: (blocker: Omit<Blocker, 'id' | 'ts'>) => void;
  onResolveBlocker: (blockerId: string) => void;
  onAddComment: (comment: { author: string; mentions: Department[]; body: string }) => void;
  onJumpToTab: (tab: WorkflowJumpTab) => void;
  onUpdateFootwearValue?: (key: string, value: string) => void;
  onUpdateQuestionAnswered: (index: number, answered: boolean) => void;
}

// ─── 常量 ─────────────────────────────────────────────────────────────────────

type DrawerTab = 'actions' | 'io' | 'questions' | 'blockers' | 'comments';

const DRAWER_TABS: { key: DrawerTab; label: string }[] = [
  { key: 'actions', label: '行动计划' },
  { key: 'io', label: '输入&输出' },
  { key: 'questions', label: '关键问题' },
  { key: 'blockers', label: '阻塞&协同' },
  { key: 'comments', label: '评论记录' },
];

const DELIV_STATUS_OPTIONS: { value: DeliverableStatus; label: string }[] = [
  { value: 'pending', label: '待提交' },
  { value: 'submitted', label: '已提交' },
  { value: 'approved', label: '已审批' },
  { value: 'rejected', label: '驳回' },
];

const DELIV_STATUS_COLORS: Record<DeliverableStatus, string> = {
  pending: 'bg-slate-100 text-slate-500',
  submitted: 'bg-sky-100 text-sky-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const TAB_LABELS: Record<WorkflowJumpTab, string> = {
  category: '品类运营',
  planning: '波段企划',
  otb: 'OTB',
  channel: '区域门店',
  inventory: '库存健康',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabContent({
  activeTab,
  node,
  runtime,
  isLocked,
  onUpdateActionPlan,
  onUpdateDeliverable,
  onAddBlocker,
  onResolveBlocker,
  onAddComment,
  onUpdateFootwearValue,
  onUpdateQuestionAnswered,
}: {
  activeTab: DrawerTab;
  node: WorkflowNodeDef;
  runtime: NodeRuntime;
  isLocked: { locked: boolean; reason?: string };
  onUpdateActionPlan: (planId: string, update: Partial<ActionPlanRuntime>) => void;
  onUpdateDeliverable: (delivId: string, status: DeliverableStatus) => void;
  onAddBlocker: (blocker: Omit<Blocker, 'id' | 'ts'>) => void;
  onResolveBlocker: (blockerId: string) => void;
  onAddComment: (comment: { author: string; mentions: Department[]; body: string }) => void;
  onUpdateFootwearValue?: (key: string, value: string) => void;
  onUpdateQuestionAnswered: (index: number, answered: boolean) => void;
}) {
  // ── 行动计划 ──
  if (activeTab === 'actions') {
    const nextNodes = node.nextNodeIds
      .map((id) => WORKFLOW_NODES.find((item) => item.id === id))
      .filter((item): item is WorkflowNodeDef => Boolean(item));

    // 3.2 整体进度摘要
    const totalPlans = node.actionPlans.length;
    const completedPlans = node.actionPlans.filter((p) => runtime.actionPlans[p.id]?.checked).length;
    const overallPct = totalPlans === 0 ? 0 : Math.round((completedPlans / totalPlans) * 100);
    const progressBarColor = overallPct >= 80 ? 'bg-emerald-400' : overallPct >= 40 ? 'bg-amber-400' : 'bg-rose-400';

    return (
      <div className="space-y-3">
        {isLocked.locked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <span className="font-bold">软锁提示：</span> {isLocked.reason}
          </div>
        )}
        <div className="rounded-xl border border-sky-100 bg-sky-50/55 p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-sky-500">当前目标</div>
          <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">{node.workGoal}</div>
          {nextNodes.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sky-100 pt-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">下一节点</span>
              {nextNodes.map((nextNode) => (
                <span key={nextNode.id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-inset ring-sky-100">
                  {nextNode.id} · {nextNode.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* 3.2 整体进度摘要 */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="shrink-0 text-[11px] font-bold text-slate-500">整体完成度</span>
          <div className="flex-1 rounded-full bg-slate-100 h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${progressBarColor}`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-bold text-slate-700">{overallPct}%</span>
          <span className="shrink-0 text-[10px] text-slate-400">已完成 {completedPlans} / 共 {totalPlans} 项</span>
        </div>

        {node.actionPlans.map((plan) => {
          const rt = runtime.actionPlans[plan.id];
          const checked = rt?.checked ?? false;
          const progress = rt?.progress ?? 0;
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-4 transition ${
                checked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={isLocked.locked}
                  onClick={() => onUpdateActionPlan(plan.id, { checked: !checked, progress: !checked ? 100 : progress })}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                    checked
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  } disabled:opacity-50`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {plan.title}
                    </span>
                    {plan.required && (
                      <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-500">必要</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>主责：{DEPT_LABELS[plan.ownerDept]}</span>
                    {plan.collaboratorDepts.length > 0 && (
                      <span>协同：{plan.collaboratorDepts.map((d) => DEPT_LABELS[d]).join(' / ')}</span>
                    )}
                    {plan.metric && <span className="text-sky-600">指标：{plan.metric}</span>}
                  </div>
                  {/* 3.4 资源需求 */}
                  {plan.resourceNeeds && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-sky-600">
                      <span>⚡</span>
                      <span>资源需求：{plan.resourceNeeds}</span>
                    </div>
                  )}
                  {/* 进度条 */}
                  {!checked && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={progress}
                        disabled={isLocked.locked}
                        onChange={(e) => onUpdateActionPlan(plan.id, { progress: Number(e.target.value) })}
                        className="h-1.5 flex-1 accent-sky-500 disabled:opacity-50"
                      />
                      <span className="w-8 text-right text-[10px] font-bold text-slate-500">{progress}%</span>
                    </div>
                  )}
                  {/* 3.3 截止日 + 执行负责人 */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      type="date"
                      disabled={isLocked.locked}
                      value={rt?.due ?? ''}
                      onChange={(e) => onUpdateActionPlan(plan.id, { due: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 outline-none focus:border-sky-400 disabled:opacity-50"
                    />
                    <input
                      type="text"
                      disabled={isLocked.locked}
                      value={rt?.assignee ?? ''}
                      placeholder="姓名 / 工号"
                      onChange={(e) => onUpdateActionPlan(plan.id, { assignee: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 placeholder:text-slate-300 outline-none focus:border-sky-400 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── 输入&输出 ──
  if (activeTab === 'io') {
    return (
      <div className="space-y-5">
        {/* 输入资料 */}
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">输入资料</div>
          <div className="space-y-1.5">
            {node.inputMaterials.map((m, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* 必交输出物 */}
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">必交输出物</div>
          <div className="space-y-2">
            {node.deliverables.map((deliv) => {
              const currentStatus = runtime.deliverables[deliv.id] ?? 'pending';
              return (
                <div key={deliv.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold text-slate-800`}>{deliv.title}</span>
                      {deliv.required && (
                        <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-500">必要</span>
                      )}
                    </div>
                    <select
                      value={currentStatus}
                      disabled={isLocked.locked}
                      onChange={(e) => onUpdateDeliverable(deliv.id, e.target.value as DeliverableStatus)}
                      className={`rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold outline-none focus:border-slate-400 disabled:opacity-50 ${DELIV_STATUS_COLORS[currentStatus]}`}
                    >
                      {DELIV_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {deliv.reviewOwnerDept && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      审批人：{DEPT_LABELS[deliv.reviewOwnerDept]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 完成标准 */}
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">完成标准</div>
          <div className="space-y-1.5">
            {node.completionCriteria.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* 鞋类增强字段 */}
        {node.footwearAugment && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">鞋类专项</div>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600">Footwear</span>
            </div>
            <div className="space-y-2">
              {node.footwearAugment.fields.map((field, i) => (
                <div key={i} className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                  <div className="text-xs font-bold text-sky-700">{field.label}</div>
                  <div className="mt-0.5 text-xs text-slate-400 leading-relaxed">{field.hint}</div>
                  <div className="mt-2">
                    {field.type === 'select' ? (
                      <select
                        value={runtime.footwearValues?.[field.key] ?? ''}
                        onChange={(e) => onUpdateFootwearValue?.(field.key, e.target.value)}
                        className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-sky-400"
                      >
                        <option value="">-- 请选择 --</option>
                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={runtime.footwearValues?.[field.key] ?? ''}
                        onChange={(e) => onUpdateFootwearValue?.(field.key, e.target.value)}
                        placeholder={field.hint}
                        className="w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-sky-400"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 关键问题 ──
  if (activeTab === 'questions') {
    const totalQ = node.keyQuestions.length;
    const answeredCount = node.keyQuestions.filter((_, i) => runtime.questionsAnswered?.[i]).length;
    return (
      <div className="space-y-3">
        <div className="text-xs text-slate-400">
          共 {totalQ} 个关键问题需在本节点内解决。
          <span className="ml-1 text-[10px] text-emerald-600 font-bold">({answeredCount}/{totalQ} 已解答)</span>
        </div>
        {node.keyQuestions.map((q, i) => {
          const answered = runtime.questionsAnswered?.[i] ?? false;
          return (
            <div key={i} className={`rounded-xl border p-4 transition ${answered ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                  {i + 1}
                </span>
                <span className={`flex-1 text-sm font-medium leading-relaxed ${answered ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{q}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuestionAnswered(i, !answered)}
                  className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    answered
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-white text-slate-400 hover:border-emerald-400 hover:text-emerald-500'
                  }`}
                  title={answered ? '取消解答' : '标记解答'}
                >
                  {answered ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── 阻塞&协同 ──
  if (activeTab === 'blockers') {
    return <BlockersTab runtime={runtime} isLocked={isLocked} onAddBlocker={onAddBlocker} onResolveBlocker={onResolveBlocker} />;
  }

  // ── 评论记录 ──
  if (activeTab === 'comments') {
    return <CommentsTab runtime={runtime} onAddComment={onAddComment} />;
  }

  return null;
}

// ─── Blockers Tab ─────────────────────────────────────────────────────────────

function BlockersTab({
  runtime,
  isLocked,
  onAddBlocker,
  onResolveBlocker,
}: {
  runtime: NodeRuntime;
  isLocked: { locked: boolean; reason?: string };
  onAddBlocker: (blocker: Omit<Blocker, 'id' | 'ts'>) => void;
  onResolveBlocker: (blockerId: string) => void;
}) {
  const [form, setForm] = useState({ desc: '', action: '', raisedBy: 'merch' as Department, blockedBy: 'design' as Department });
  const [showForm, setShowForm] = useState(false);

  const activeBlockers = runtime.blockers.filter((b) => !b.resolved);
  const resolvedBlockers = runtime.blockers.filter((b) => b.resolved);

  return (
    <div className="space-y-4">
      {/* 活跃 blockers */}
      {activeBlockers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
          暂无未解决的阻塞
        </div>
      ) : (
        <div className="space-y-2">
          {activeBlockers.map((b) => (
            <div key={b.id} className={`rounded-xl border p-4 ${isCollabBlocker(b) ? 'border-amber-200 bg-amber-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{b.desc}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    由 <strong>{DEPT_LABELS[b.raisedBy]}</strong> 提出 · 阻塞方 <strong>{DEPT_LABELS[b.blockedBy]}</strong>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    <span className="font-bold">行动：</span>{b.action}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onResolveBlocker(b.id)}
                  className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition shrink-0"
                >
                  标记解决
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                {new Date(b.ts).toLocaleDateString('zh-CN')}
                {isCollabBlocker(b) && (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-600 font-bold">协同类</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加 Blocker */}
      {!showForm ? (
        <button
          type="button"
          disabled={isLocked.locked}
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700 transition disabled:opacity-50"
        >
          + 新增阻塞
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <textarea
            value={form.desc}
            onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
            placeholder="描述阻塞问题..."
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
          />
          <input
            value={form.action}
            onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
            placeholder="需要的协同/确认/反馈动作..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          <div className="flex gap-2">
            <select
              value={form.raisedBy}
              onChange={(e) => setForm((f) => ({ ...f, raisedBy: e.target.value as Department }))}
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none"
            >
              {Object.entries(DEPT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v} (提出)</option>
              ))}
            </select>
            <select
              value={form.blockedBy}
              onChange={(e) => setForm((f) => ({ ...f, blockedBy: e.target.value as Department }))}
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none"
            >
              {Object.entries(DEPT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v} (阻塞方)</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!form.desc.trim()) return;
                onAddBlocker({ ...form, resolved: false });
                setForm({ desc: '', action: '', raisedBy: 'merch', blockedBy: 'design' });
                setShowForm(false);
              }}
              className="flex-1 rounded-lg border border-slate-900 bg-slate-900 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              提交
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 已解决 */}
      {resolvedBlockers.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase text-slate-400">已解决 ({resolvedBlockers.length})</div>
          <div className="space-y-1.5">
            {resolvedBlockers.map((b) => (
              <div key={b.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400 line-through">
                {b.desc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Comments Tab ─────────────────────────────────────────────────────────────

function CommentsTab({
  runtime,
  onAddComment,
}: {
  runtime: NodeRuntime;
  onAddComment: (comment: { author: string; mentions: Department[]; body: string }) => void;
}) {
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('');

  return (
    <div className="space-y-4">
      {/* 评论列表 */}
      {runtime.comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
          暂无评论
        </div>
      ) : (
        <div className="space-y-3">
          {[...runtime.comments].reverse().map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{c.author || '匿名'}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(c.ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-700 leading-relaxed">{c.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* 添加评论 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="你的名字..."
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-slate-400"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="输入评论内容..."
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!body.trim()) return;
            onAddComment({ author: author || '匿名', mentions: [], body });
            setBody('');
          }}
          className="w-full rounded-lg border border-slate-900 bg-slate-900 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
        >
          发布评论
        </button>
      </div>
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export default function NodeDetailDrawer({
  open,
  node,
  runtime,
  nodeStatus,
  nodeRisk,
  activeSeason,
  activeYear,
  isLocked,
  onClose,
  onUpdateActionPlan,
  onUpdateDeliverable,
  onAddBlocker,
  onResolveBlocker,
  onAddComment,
  onJumpToTab,
  onUpdateFootwearValue,
  onUpdateQuestionAnswered,
}: NodeDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('actions');

  if (!open || !node) return null;

  const { start, end } = getNodeDateRange(node, activeSeason, activeYear);
  function fmtDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // 3.1 时间紧迫度计算
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  let urgencyBadge: { cls: string; label: string } | null = null;
  if (diffDays > 7) {
    urgencyBadge = { cls: 'bg-emerald-100 text-emerald-700', label: `还有 ${diffDays} 天` };
  } else if (diffDays >= 1) {
    urgencyBadge = { cls: 'bg-amber-100 text-amber-700', label: `仅剩 ${diffDays} 天` };
  } else {
    urgencyBadge = { cls: 'bg-rose-100 text-rose-700', label: `已逾期 ${Math.abs(diffDays)} 天` };
  }

  // 3.5 关键问题解答数
  const totalQ = node.keyQuestions.length;
  const answeredCount = node.keyQuestions.filter((_, i) => runtime.questionsAnswered?.[i]).length;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 抽屉面板 */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* 头部 */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex-1 min-w-0">
            {/* 锁定提示 */}
            {isLocked.locked && (
              <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                <span className="font-bold">🔒 Gate 锁定：</span>
                {isLocked.reason}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {STAGE_LABELS[node.stage]} · {node.id}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  nodeStatus === '已完成' ? 'bg-emerald-100 text-emerald-700' :
                  nodeStatus === '进行中' ? 'bg-sky-100 text-sky-700' :
                  nodeStatus === '延期' || nodeStatus === '预警' ? 'bg-rose-100 text-rose-700' :
                  nodeStatus === '待协同' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}
              >
                {nodeStatus}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  nodeRisk === '高' ? 'bg-rose-100 text-rose-700' :
                  nodeRisk === '中' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}
              >
                {nodeRisk}风险
              </span>
            </div>
            <h2 className="mt-1 text-lg font-black text-slate-900 leading-tight">{node.title}</h2>
            {/* 3.1 时间紧迫度徽章 */}
            {urgencyBadge && (
              <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${urgencyBadge.cls}`}>
                {urgencyBadge.label}
              </span>
            )}
            <div className="mt-1 text-xs text-slate-400">
              {fmtDate(start)} — {fmtDate(end)} · 主责：{DEPT_LABELS[node.ownerDept]}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab 导航 */}
        <div className="flex border-b border-slate-100 px-2">
          {DRAWER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-xs font-bold transition ${
                activeTab === tab.key
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {tab.key === 'questions' && totalQ > 0 && (
                <span className="ml-1 text-[10px] font-bold text-emerald-500">({answeredCount}/{totalQ})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <TabContent
            activeTab={activeTab}
            node={node}
            runtime={runtime}
            isLocked={isLocked}
            onUpdateActionPlan={onUpdateActionPlan}
            onUpdateDeliverable={onUpdateDeliverable}
            onAddBlocker={onAddBlocker}
            onResolveBlocker={onResolveBlocker}
            onAddComment={onAddComment}
            onUpdateFootwearValue={onUpdateFootwearValue}
            onUpdateQuestionAnswered={onUpdateQuestionAnswered}
          />
        </div>

        {/* 底部关联 TAB 跳转 */}
        {node.relatedTabs.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              关联 TAB 跳转
            </div>
            <div className="flex flex-wrap gap-2">
              {node.relatedTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { onJumpToTab(tab); onClose(); }}
                  className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100"
                >
                  → {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
