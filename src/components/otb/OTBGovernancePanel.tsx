'use client';

import { useState } from 'react';
import { formatCurrency } from '@/utils/otbCalculations';
import type { OTBLocalSettings } from './OTBContextSummary';
import changeRequestsRaw from '../../../data/otb/otb_change_requests.json';

export interface OTBVersionRecord {
    versionId: string;
    versionName: string;
    status: string;
    createdBy: string;
    updatedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    changeReason?: string;
    lockedFields?: string[];
}

interface OTBChangeRequestRecord {
    changeRequestId: string;
    sourceVersionId: string;
    targetVersionId: string;
    targetField: string;
    oldValue: number;
    newValue: number;
    changeReason: string;
    impactAmount: number;
    createdBy: string;
    createdAt: string;
    status: string;
}

const LOCKABLE_FIELDS = [
    'annualSalesTarget', 'seasonOTBBudget',
    'plannedPurchaseAmount', 'waveSalesRatio',
    'categorySalesRatio', 'plannedStyleCount',
    'priceBandSalesRatio',
];

const FIELD_LABELS: Record<string, string> = {
    annualSalesTarget:    '年度销售目标',
    seasonOTBBudget:      '季节OTB预算',
    plannedPurchaseAmount:'计划采购金额',
    waveSalesRatio:       '波段销售占比',
    categorySalesRatio:   '品类销售占比',
    plannedStyleCount:    '计划款数',
    priceBandSalesRatio:  '价格带占比',
    seasonSalesRatio:     '季节销售占比',
};

const STATUS_LABELS: Record<string, string> = {
    draft: '草稿',
    submitted: '待审批',
    approved: '已审批',
    locked: '已锁定',
    executing: '执行中',
    reviewed: '已复盘',
};

const STATUS_CLASSES: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    submitted: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    locked: 'bg-rose-50 text-rose-700 border-rose-200',
    executing: 'bg-sky-50 text-sky-700 border-sky-200',
    reviewed: 'bg-purple-50 text-purple-700 border-purple-200',
};

interface Props {
    settings: OTBLocalSettings;
    localVersions: OTBVersionRecord[];
    onVersionsChange: (versions: OTBVersionRecord[]) => void;
}

export default function OTBGovernancePanel({ settings, localVersions, onVersionsChange }: Props) {
    const changeRequests = changeRequestsRaw as OTBChangeRequestRecord[];

    const [approverName, setApproverName] = useState('');
    const [approvalComment, setApprovalComment] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const currentVersion = localVersions.find(v => v.versionId === settings.version)
        ?? localVersions.find(v => v.versionId === 'approved')
        ?? localVersions[0];
    const relatedRequests = changeRequests.filter(
        item => item.sourceVersionId === settings.version || item.targetVersionId === settings.version,
    );
    const lockedFields = currentVersion?.lockedFields ?? [];
    const isLocked = currentVersion?.status === 'locked' || currentVersion?.status === 'reviewed';

    function advanceVersionStatus(
        versionId: string,
        newStatus: string,
        meta?: { approvedBy?: string; changeReason?: string },
    ) {
        onVersionsChange(localVersions.map(v => {
            if (v.versionId !== versionId) return v;
            return {
                ...v,
                status: newStatus,
                approvedBy: meta?.approvedBy ?? v.approvedBy,
                approvedAt: (newStatus === 'approved' || newStatus === 'locked')
                    ? new Date().toISOString().split('T')[0]
                    : v.approvedAt,
                lockedFields: newStatus === 'locked' ? LOCKABLE_FIELDS : v.lockedFields,
                changeReason: meta?.changeReason ?? v.changeReason,
            };
        }));
    }

    return (
        <div className="px-5 py-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">OTB 版本治理</span>
                        {currentVersion && (
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASSES[currentVersion.status] ?? STATUS_CLASSES.draft}`}>
                                {STATUS_LABELS[currentVersion.status] ?? currentVersion.status}
                            </span>
                        )}
                        {isLocked && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                核心预算字段已锁定
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        {currentVersion?.versionName ?? settings.version}
                        {currentVersion?.approvedBy ? ` · ${currentVersion.approvedBy} 于 ${currentVersion.approvedAt} 审批` : ''}
                        {currentVersion?.updatedAt ? ` · 更新 ${currentVersion.updatedAt}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        {isLocked
                            ? '审批版/锁定版不允许直接覆盖核心预算。需要修改时，应创建滚动调整版并生成调整单。'
                            : '当前版本允许编辑，提交审批后会锁定年度目标、季节预算、波段占比、品类占比、计划款数和采购金额。'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-[560px] lg:justify-end">
                    {lockedFields.slice(0, 8).map(field => (
                        <span key={field} className="rounded-full bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                            🔒 {FIELD_LABELS[field] ?? field}
                        </span>
                    ))}
                    {lockedFields.length > 8 && (
                        <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] text-slate-500">+{lockedFields.length - 8}</span>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="ml-2 flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                        {isExpanded ? '收起治理面板' : '展开版本治理'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>

            {/* 操作区 */}
            {currentVersion && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                    {currentVersion.status === 'draft' && (
                        <button
                            onClick={() => advanceVersionStatus(currentVersion.versionId, 'submitted')}
                            className="px-3 py-1.5 text-xs rounded-lg bg-sky-500 text-white hover:bg-sky-600"
                        >
                            提交审批
                        </button>
                    )}
                    {currentVersion.status === 'submitted' && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    value={approverName}
                                    onChange={e => setApproverName(e.target.value)}
                                    placeholder="审批人姓名"
                                    className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-300"
                                />
                                <input
                                    value={approvalComment}
                                    onChange={e => setApprovalComment(e.target.value)}
                                    placeholder="审批意见（可选）"
                                    className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-300"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => advanceVersionStatus(currentVersion.versionId, 'approved', { approvedBy: approverName, changeReason: approvalComment })}
                                    disabled={!approverName}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-white disabled:opacity-50 hover:bg-emerald-600"
                                >
                                    审批通过
                                </button>
                                <button
                                    onClick={() => advanceVersionStatus(currentVersion.versionId, 'draft')}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200"
                                >
                                    驳回
                                </button>
                            </div>
                        </div>
                    )}
                    {currentVersion.status === 'approved' && (
                        <button
                            onClick={() => advanceVersionStatus(currentVersion.versionId, 'locked')}
                            className="px-3 py-1.5 text-xs rounded-lg bg-slate-700 text-white hover:bg-slate-800"
                        >
                            锁定版本（生成执行基准）
                        </button>
                    )}
                    {isLocked && (
                        <button
                            onClick={() => advanceVersionStatus(currentVersion.versionId, 'draft')}
                            className="px-3 py-1.5 text-xs rounded-lg bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200"
                        >
                            提交变更申请（解锁草稿）
                        </button>
                    )}
                </div>
            )}

            {relatedRequests.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[11px] font-semibold text-slate-500">预算调整历史</p>
                    <div className="grid gap-2 md:grid-cols-2">
                        {relatedRequests.map(request => (
                            <div key={request.changeRequestId} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-semibold text-slate-700">{request.changeRequestId}</span>
                                    <span className={`font-semibold ${request.impactAmount >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {formatCurrency(request.impactAmount)}
                                    </span>
                                </div>
                                <p className="mt-1 text-slate-500">{request.targetField} · {request.changeReason}</p>
                                <p className="mt-1 text-[10px] text-slate-400">{request.createdBy} · {request.createdAt} · {STATUS_LABELS[request.status] ?? request.status}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
}

