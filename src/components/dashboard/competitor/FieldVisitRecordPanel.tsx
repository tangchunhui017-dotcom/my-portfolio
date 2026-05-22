'use client';

import { useMemo, useState } from 'react';
import type { FieldVisitRecord } from '@/types/competitorTrendTypes';
import { useFieldVisitRecords } from '@/hooks/useFieldVisitRecords';

const PRESET_TAGS = [
    '主推厚底', '价格下探', '折扣激进', '全价策略', '功能卖点强',
    '大地色系', '糖果色', '女性为主', '年轻化', '专业跑者',
    '高客单价', '主推户外', '买赠促销', '节点促销', '陈列创新',
];

const CURRENT_SEASON_START = '2026-01-01';
const CURRENT_SEASON_END = '2026-06-30';

function isCurrentSeason(dateStr: string) {
    return dateStr >= CURRENT_SEASON_START && dateStr <= CURRENT_SEASON_END;
}

function ExpandableText({ text, limit = 80 }: { text: string; limit?: number }) {
    const [expanded, setExpanded] = useState(false);
    if (text.length <= limit) return <span>{text}</span>;
    return (
        <span>
            {expanded ? text : `${text.slice(0, limit)}…`}
            <button
                onClick={() => setExpanded(!expanded)}
                className="ml-1 text-blue-500 hover:text-blue-700 underline text-[10px]"
            >
                {expanded ? '收起' : '展开'}
            </button>
        </span>
    );
}

interface FormState {
    visitDate: string;
    researcher: string;
    city: string;
    mall: string;
    competitorBrand: string;
    windowDisplay: string;
    storeProducts: string;
    colorMaterial: string;
    staffPushItem: string;
    staffPushKeywords: string;
    keyPrice: string;
    promotionActivity: string;
    summary: string;
    tags: string[];
}

const EMPTY_FORM: FormState = {
    visitDate: new Date().toISOString().split('T')[0],
    researcher: '',
    city: '',
    mall: '',
    competitorBrand: '',
    windowDisplay: '',
    storeProducts: '',
    colorMaterial: '',
    staffPushItem: '',
    staffPushKeywords: '',
    keyPrice: '',
    promotionActivity: '',
    summary: '',
    tags: [],
};

function RecordCard({ record, onDelete }: { record: FieldVisitRecord; onDelete: () => void }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow relative">
            {/* Delete button */}
            <button
                onClick={onDelete}
                aria-label="删除记录"
                className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 transition-colors text-lg leading-none"
            >
                ×
            </button>

            {/* Title row */}
            <div className="flex flex-wrap items-baseline gap-2 pr-6 mb-2">
                <span className="font-semibold text-slate-800">{record.competitorBrand}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-600">{record.mall}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{record.visitDate}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{record.researcher}</span>
                {isCurrentSeason(record.visitDate) && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">本季</span>
                )}
            </div>

            {/* Tags */}
            {record.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {record.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                </div>
            )}

            {/* Summary row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600 mb-2">
                <div>
                    <span className="text-slate-400">橱窗主推：</span>
                    {record.windowDisplay}
                </div>
                <div>
                    <span className="text-slate-400">主推价格：</span>
                    {record.keyPrice}
                </div>
                <div>
                    <span className="text-slate-400">促销活动：</span>
                    {record.promotionActivity || '无'}
                </div>
            </div>

            {/* Core summary */}
            <div className="text-xs text-slate-600 leading-[1.6]">
                <span className="text-slate-400">核心发现：</span>
                <ExpandableText text={record.summary} limit={80} />
            </div>
        </div>
    );
}

export default function FieldVisitRecordPanel() {
    const { records, addRecord, deleteRecord } = useFieldVisitRecords();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterCity, setFilterCity] = useState('all');

    const currentSeasonCount = useMemo(() => records.filter((r) => isCurrentSeason(r.visitDate)).length, [records]);
    const brandOptions = useMemo(() => ['all', ...Array.from(new Set(records.map((r) => r.competitorBrand)))], [records]);
    const cityOptions = useMemo(() => ['all', ...Array.from(new Set(records.map((r) => r.city)))], [records]);

    const filteredRecords = useMemo(() => {
        return records
            .filter((r) => filterBrand === 'all' || r.competitorBrand === filterBrand)
            .filter((r) => filterCity === 'all' || r.city === filterCity)
            .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    }, [records, filterBrand, filterCity]);

    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function toggleTag(tag: string) {
        setForm((prev) => ({
            ...prev,
            tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
        }));
    }

    function handleSave() {
        if (!form.visitDate || !form.researcher || !form.competitorBrand || !form.mall) return;
        addRecord(form);
        setForm(EMPTY_FORM);
        setShowForm(false);
    }

    const inputClass = 'w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100';

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>共 <strong className="text-slate-700">{records.length}</strong> 条记录</span>
                    <span>·</span>
                    <span>本季 <strong className="text-blue-600">{currentSeasonCount}</strong> 条</span>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                    {showForm ? '取消' : '+ 新增走访记录'}
                </button>
            </div>

            {/* Inline form */}
            {showForm && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                    <div className="text-sm font-semibold text-slate-700 mb-1">新增走访记录</div>

                    {/* Row 1 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {([
                            { label: '走访日期', key: 'visitDate' as const, type: 'date', placeholder: undefined },
                            { label: '调研人', key: 'researcher' as const, type: 'text', placeholder: '姓名' },
                            { label: '城市', key: 'city' as const, type: 'text', placeholder: '如：上海' },
                            { label: '商场/商圈', key: 'mall' as const, type: 'text', placeholder: '如：静安大悦城' },
                            { label: '竞品品牌', key: 'competitorBrand' as const, type: 'text', placeholder: '如：Nike' },
                        ]).map(({ label, key, type, placeholder }) => (
                            <div key={key}>
                                <label className="text-[11px] text-slate-400 mb-0.5 block">{label}<span className="text-rose-400">*</span></label>
                                <input
                                    type={type}
                                    value={form[key] as string}
                                    onChange={(e) => setField(key, e.target.value)}
                                    placeholder={placeholder}
                                    className={inputClass}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {([
                            { label: '橱窗主推（鞋型+颜色+材质）', key: 'windowDisplay', placeholder: '厚底老爹鞋-米白色-绒面革' },
                            { label: '店铺货品结构', key: 'storeProducts', placeholder: '跑鞋40%/休闲30%/靴类20%/其他10%' },
                            { label: '主推色+材质', key: 'colorMaterial', placeholder: '大地色系+绒面革/帆布' },
                        ] as const).map(({ label, key, placeholder }) => (
                            <div key={key}>
                                <label className="text-[11px] text-slate-400 mb-0.5 block">{label}</label>
                                <input
                                    type="text"
                                    value={form[key] as string}
                                    onChange={(e) => setField(key, e.target.value)}
                                    placeholder={placeholder}
                                    className={inputClass}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {([
                            { label: '店员主推款', key: 'staffPushItem', placeholder: '款式名称或描述' },
                            { label: '店员主推话术', key: 'staffPushKeywords', placeholder: '防滑大底+超轻190g' },
                            { label: '主推价格', key: 'keyPrice', placeholder: '吊牌699，实售599，约8.6折' },
                        ] as const).map(({ label, key, placeholder }) => (
                            <div key={key}>
                                <label className="text-[11px] text-slate-400 mb-0.5 block">{label}</label>
                                <input
                                    type="text"
                                    value={form[key] as string}
                                    onChange={(e) => setField(key, e.target.value)}
                                    placeholder={placeholder}
                                    className={inputClass}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Row 4 — promotion */}
                    <div>
                        <label className="text-[11px] text-slate-400 mb-0.5 block">促销活动</label>
                        <input
                            type="text"
                            value={form.promotionActivity}
                            onChange={(e) => setField('promotionActivity', e.target.value)}
                            placeholder="如：满500减80，叠加会员9折"
                            className={inputClass}
                        />
                    </div>

                    {/* Row 5 — summary textarea */}
                    <div>
                        <label className="text-[11px] text-slate-400 mb-0.5 block">本次走访核心发现与对本品启发</label>
                        <textarea
                            value={form.summary}
                            onChange={(e) => setField('summary', e.target.value)}
                            rows={3}
                            placeholder="2-4句核心发现，对本品的策略启发..."
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    {/* Row 6 — tag chips */}
                    <div>
                        <label className="text-[11px] text-slate-400 mb-1.5 block">快速标签（可多选）</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_TAGS.map((tag) => {
                                const active = form.tags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Form actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={!form.visitDate || !form.researcher || !form.competitorBrand || !form.mall}
                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-1.5 rounded-lg transition-colors"
                        >
                            保存记录
                        </button>
                        <button
                            onClick={() => { setForm(EMPTY_FORM); setShowForm(false); }}
                            className="text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-1.5 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs text-slate-400">筛选：</span>
                <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">竞品品牌</span>
                    <select
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                    >
                        {brandOptions.map((b) => (
                            <option key={b} value={b}>{b === 'all' ? '全部品牌' : b}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">城市</span>
                    <select
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                    >
                        {cityOptions.map((c) => (
                            <option key={c} value={c}>{c === 'all' ? '全部城市' : c}</option>
                        ))}
                    </select>
                </div>
                <span className="text-[11px] text-slate-400">按日期倒序（默认）</span>
            </div>

            {/* Record list */}
            <div className="space-y-3">
                {filteredRecords.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-8">暂无走访记录，点击「+ 新增走访记录」开始录入</div>
                ) : (
                    filteredRecords.map((record) => (
                        <RecordCard
                            key={record.id}
                            record={record}
                            onDelete={() => deleteRecord(record.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
