'use client';

import { formatCurrency } from '@/utils/otbCalculations';
import type { OTBLocalSettings } from './OTBContextSummary';
import versionsRaw from '../../../data/otb/otb_versions.json';
import changeRequestsRaw from '../../../data/otb/otb_change_requests.json';

interface OTBVersionRecord {
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
}

export default function OTBGovernancePanel({ settings }: Props) {
    const versions = versionsRaw as OTBVersionRecord[];
    const changeRequests = changeRequestsRaw as OTBChangeRequestRecord[];
    const currentVersion = versions.find(item => item.versionId === settings.version) ?? versions.find(item => item.versionId === 'approved');
    const relatedRequests = changeRequests.filter(item => item.sourceVersionId === settings.version || item.targetVersionId === settings.version);
    const lockedFields = currentVersion?.lockedFields ?? [];
    const isLocked = currentVersion?.status === 'locked' || settings.approvalStatus === 'locked' || lockedFields.length > 0;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
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
                            🔒 {field}
                        </span>
                    ))}
                    {lockedFields.length > 8 && (
                        <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] text-slate-500">+{lockedFields.length - 8}</span>
                    )}
                </div>
            </div>

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
        </div>
    );
}
