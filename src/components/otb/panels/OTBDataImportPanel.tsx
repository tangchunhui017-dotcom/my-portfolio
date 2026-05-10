'use client';
/**
 * src/components/otb/panels/OTBDataImportPanel.tsx
 * OTB 数据导入工作台 — CSV 上传、解析预览、确认导入
 */
import { useState, useCallback, useRef } from 'react';
import {
    parseOtbCsv, downloadTemplateCsv, COLUMN_DEFS,
    type ImportType, type ImportError, type ParseResult,
} from '@/utils/otbCsvImport';
import type { ExecutionTrackingInput, WaveOTBInput } from '@/utils/otbCalculations';
import type { CurrencyUnit } from '@/utils/otbCalculations';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    currencyUnit: CurrencyUnit;
    onExecutionImport: (rows: ExecutionTrackingInput[]) => void;
    onWavePlanImport:  (rows: WaveOTBInput[]) => void;
    onMonthlySalesImport: (data: Array<{ month: number; actualSales: number }>) => void;
}

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

const IMPORT_TYPES: { key: ImportType; label: string; desc: string; icon: string }[] = [
    { key: 'execution',     label: '执行跟踪',   icon: '✅', desc: '导入订单下单、到货、执行状态数据' },
    { key: 'wave_plan',     label: '波段计划',   icon: '🌊', desc: '导入波段销售占比、款数、均深计划' },
    { key: 'monthly_sales', label: '月度销售',   icon: '📆', desc: '导入各月实际销售额，触发滚动重算' },
    { key: 'product_master', label: '商品主数据', icon: '📦', desc: '导入 SKU 零售价、成本价、尺码组' },
];

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function OTBDataImportPanel({
    onExecutionImport, onWavePlanImport, onMonthlySalesImport,
}: Props) {
    const [importType, setImportType] = useState<ImportType>('execution');
    const [isDragOver, setIsDragOver] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [parseResult, setParseResult] = useState<ParseResult<any> | null>(null);
    const [importDone, setImportDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleText = useCallback((text: string) => {
        setImportDone(false);
        const cols = COLUMN_DEFS[importType];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = parseOtbCsv<any>(text, cols);
        setParseResult(result);
    }, [importType]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => handleText(ev.target?.result as string ?? '');
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    }, [handleText]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.name.match(/\.(csv|txt)$/i)) return;
        const reader = new FileReader();
        reader.onload = ev => handleText(ev.target?.result as string ?? '');
        reader.readAsText(file, 'UTF-8');
    }, [handleText]);

    const handleConfirmImport = useCallback(() => {
        if (!parseResult || parseResult.errors.length > 0) return;
        switch (importType) {
            case 'execution':
                onExecutionImport(parseResult.rows as ExecutionTrackingInput[]);
                break;
            case 'wave_plan':
                onWavePlanImport(parseResult.rows as WaveOTBInput[]);
                break;
            case 'monthly_sales':
                onMonthlySalesImport(parseResult.rows as Array<{ month: number; actualSales: number }>);
                break;
            default:
                break;
        }
        setImportDone(true);
    }, [parseResult, importType, onExecutionImport, onWavePlanImport, onMonthlySalesImport]);

    const selectedType = IMPORT_TYPES.find(t => t.key === importType)!;
    const canImport = parseResult !== null && parseResult.errors.length === 0 && parseResult.rows.length > 0;
    const importSupported = importType !== 'product_master';

    return (
        <div className="space-y-4">
            {/* 标题 */}
            <div>
                <h3 className="text-sm font-bold text-slate-800">数据导入工作台</h3>
                <p className="text-xs text-slate-400 mt-0.5">通过 CSV 文件批量导入执行数据、波段计划、月度销售</p>
            </div>

            {/* 类型选择 */}
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {IMPORT_TYPES.map(t => (
                    <button key={t.key} onClick={() => { setImportType(t.key); setParseResult(null); setImportDone(false); }}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            importType === t.key
                                ? 'border-sky-400 bg-sky-50'
                                : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50'
                        }`}>
                        <div className="text-sm font-semibold text-slate-700">{t.icon} {t.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{t.desc}</div>
                    </button>
                ))}
            </div>

            {/* 模板下载 */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                <div>
                    <p className="text-xs font-semibold text-slate-700">📋 {selectedType.label} 导入模板</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedType.desc}</p>
                </div>
                <button onClick={() => downloadTemplateCsv(importType)}
                    className="px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 whitespace-nowrap">
                    下载模板 CSV
                </button>
            </div>

            {/* 字段说明 */}
            <div className="overflow-x-auto">
                <div className="flex gap-1.5 flex-wrap">
                    {COLUMN_DEFS[importType].map(col => (
                        <span key={col.key}
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                col.required
                                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                                    : 'border-slate-200 bg-white text-slate-500'
                            }`}>
                            {col.key}
                            {col.required && <span className="ml-0.5 text-rose-500">*</span>}
                        </span>
                    ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">蓝色=必填，白色=选填；列名须与模板一致（不区分大小写）</p>
            </div>

            {/* 拖拽上传区 */}
            <div
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDrop={handleDrop}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
                    isDragOver
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                }`}>
                <div className="text-2xl mb-2">📂</div>
                <p className="text-sm text-slate-500">拖拽 CSV 文件到此处，或点击选择</p>
                <p className="text-[10px] text-slate-400 mt-1">支持 .csv / .txt 格式，UTF-8 编码</p>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
            </div>

            {/* 解析结果 */}
            {parseResult && (
                <div className="space-y-3">
                    {/* 统计汇总 */}
                    <div className={`rounded-xl border px-4 py-3 ${
                        parseResult.errors.length > 0
                            ? 'border-rose-200 bg-rose-50'
                            : 'border-emerald-200 bg-emerald-50'
                    }`}>
                        <div className="flex items-center gap-3 text-sm font-semibold">
                            {parseResult.errors.length > 0 ? (
                                <span className="text-rose-700">
                                    🚨 解析发现 {parseResult.errors.length} 处错误（共 {parseResult.totalRows} 行）
                                </span>
                            ) : (
                                <span className="text-emerald-700">
                                    ✅ 解析成功：{parseResult.rows.length} 行（共 {parseResult.totalRows} 行）
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 错误列表 */}
                    {parseResult.errors.length > 0 && (
                        <div className="rounded-xl border border-rose-100 overflow-hidden">
                            <div className="bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 border-b border-rose-100">
                                错误详情（最多显示 10 条）
                            </div>
                            <div className="divide-y divide-slate-50">
                                {(parseResult.errors as ImportError[]).slice(0, 10).map((err, i) => (
                                    <div key={i} className="flex items-start gap-3 px-4 py-2 text-xs">
                                        <span className="text-slate-400 whitespace-nowrap">第 {err.rowIndex} 行</span>
                                        <span className="font-mono text-sky-700 whitespace-nowrap">{err.column}</span>
                                        <span className="text-rose-700">{err.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 数据预览 */}
                    {parseResult.rows.length > 0 && (
                        <div>
                            <p className="text-[11px] text-slate-400 mb-1.5">数据预览（前 3 行）</p>
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full text-[10px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            {COLUMN_DEFS[importType].map(col => (
                                                <th key={col.key} className="py-1.5 px-2 text-left text-slate-500 font-medium whitespace-nowrap">
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parseResult.rows.slice(0, 3).map((row, i) => (
                                            <tr key={i} className="border-b border-slate-50">
                                                {COLUMN_DEFS[importType].map(col => (
                                                    <td key={col.key} className="py-1.5 px-2 text-slate-600 whitespace-nowrap">
                                                        {String(row[col.key] ?? '--')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {parseResult.rows.length > 3 && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                    ... 还有 {parseResult.rows.length - 3} 行
                                </p>
                            )}
                        </div>
                    )}

                    {/* 确认导入 */}
                    {importSupported ? (
                        <div className="flex items-center gap-3">
                            <button
                                disabled={!canImport}
                                onClick={handleConfirmImport}
                                className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors">
                                确认导入 {canImport ? `（${parseResult.rows.length} 行）` : ''}
                            </button>
                            <button
                                onClick={() => { setParseResult(null); setImportDone(false); }}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                                清除
                            </button>
                            {importDone && (
                                <span className="text-sm text-emerald-600 font-medium">✅ 已导入成功</span>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                            ⚠️ 商品主数据导入需要与 ERP/PLM 系统对接，当前版本仅支持解析预览，不直接覆盖业务数据。
                        </div>
                    )}
                </div>
            )}

            {/* 使用说明 */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">使用说明</p>
                <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                    <li>先下载对应类型的模板 CSV，按格式填写后上传</li>
                    <li>列名不区分大小写；数值字段无需去除千分符</li>
                    <li>有错误时会显示具体行号和列名，修改后重新上传</li>
                    <li>执行跟踪导入会覆盖当前执行跟踪面板数据</li>
                    <li>波段计划导入会覆盖当前波段拆解面板数据</li>
                    <li>月度销售导入只更新对应月份的实际销售，触发预算重算</li>
                </ul>
            </div>
        </div>
    );
}
