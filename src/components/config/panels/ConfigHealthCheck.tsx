'use client';
/**
 * src/components/config/panels/ConfigHealthCheck.tsx
 * 配置健康度检测 UI — 消费 utils/merchConfigHealth.ts 的纯逻辑结果。
 */
import { useMemo, useState } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import { runMerchConfigHealthCheck, summarizeHealth, type HealthSeverity } from '@/utils/merchConfigHealth';

const SEVERITY_META: Record<HealthSeverity, { label: string; icon: string; bg: string; text: string; border: string }> = {
    error:   { label: '错误',   icon: '❌', bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
    warning: { label: '警告',   icon: '⚠️', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    info:    { label: '建议',   icon: 'ℹ️', bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
};

export default function ConfigHealthCheck() {
    const config = useMerchConfig();
    const [scanning, setScanning] = useState(false);
    const [scanned, setScanned] = useState(false);

    const issues = useMemo(() => (scanned ? runMerchConfigHealthCheck(config) : []), [scanned, config]);
    const summary = summarizeHealth(issues);

    function runScan() {
        setScanning(true);
        setTimeout(() => {
            setScanning(false);
            setScanned(true);
        }, 600);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button
                    onClick={runScan}
                    disabled={scanning}
                    className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                    {scanning ? (
                        <>
                            <span className="animate-spin inline-block">⚙️</span>
                            扫描中...
                        </>
                    ) : (
                        <>🩺 运行健康检测</>
                    )}
                </button>
                {scanned && (
                    <div className="flex items-center gap-3 text-sm">
                        {summary.error > 0 && (
                            <span className="flex items-center gap-1 text-rose-600">
                                ❌ {summary.error} 个错误
                            </span>
                        )}
                        {summary.warning > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                                ⚠️ {summary.warning} 个警告
                            </span>
                        )}
                        {summary.info > 0 && (
                            <span className="flex items-center gap-1 text-sky-600">
                                ℹ️ {summary.info} 个建议
                            </span>
                        )}
                        {summary.total === 0 && (
                            <span className="text-emerald-600">✅ 配置正常，无任何告警</span>
                        )}
                    </div>
                )}
            </div>

            {!scanned && (
                <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
                    点击「运行健康检测」扫描当前配置
                </div>
            )}

            {scanned && issues.length === 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 py-8 text-center text-sm text-emerald-700">
                    ✅ 配置健康度检测通过，未发现问题
                </div>
            )}

            {scanned && issues.length > 0 && (
                <div className="space-y-2">
                    {issues.map((issue) => {
                        const meta = SEVERITY_META[issue.severity];
                        return (
                            <div
                                key={issue.id}
                                className={`rounded-xl border p-4 ${meta.bg} ${meta.border}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-lg flex-shrink-0 mt-0.5">{meta.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-semibold ${meta.text}`}>{issue.title}</div>
                                        <div className="mt-1 text-xs text-slate-600">{issue.description}</div>
                                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                                            <span>💡</span>
                                            <span>{issue.suggestion}</span>
                                        </div>
                                    </div>
                                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.bg} ${meta.text} ${meta.border}`}>
                                        {meta.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="text-[10px] text-slate-400">
                检测项目：阈值逻辑冲突 / 未使用指标 / 空维度 / 公式引用异常 / 闭环必备指标缺失 / TabKey 合法性 / Tab 配置完整性
            </div>
        </div>
    );
}
