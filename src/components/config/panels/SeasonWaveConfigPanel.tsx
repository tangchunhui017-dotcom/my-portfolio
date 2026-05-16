'use client';
/**
 * src/components/config/panels/SeasonWaveConfigPanel.tsx
 * 季节&波段动态配置面板 V18 — 鞋类核心
 * 5个子Tab：季节配置 / 波段流转 / 季节×指标矩阵 / 上市甘特图 / 生命周期7阶段
 */
import { useState } from 'react';

type SubTab = 'seasons' | 'waves' | 'matrix' | 'gantt' | 'lifecycle';

const SUB_TABS: Array<{ key: SubTab; label: string; icon: string }> = [
    { key: 'seasons',   label: '季节配置',      icon: '🌸' },
    { key: 'waves',     label: '波段流转',      icon: '🌊' },
    { key: 'matrix',    label: '季节×指标矩阵',  icon: '📊' },
    { key: 'gantt',     label: '上市甘特图',    icon: '📅' },
    { key: 'lifecycle', label: '生命周期7阶段',  icon: '🔄' },
];

// ─── 默认数据 ─────────────────────────────────────────────────────────────────

const DEFAULT_SEASONS = [
    { id: 'spring', label: '春',  months: '3-5月',  categories: '板鞋/跑鞋',            color: '#22c55e', emoji: '🟢' },
    { id: 'summer', label: '夏',  months: '6-8月',  categories: '凉鞋/凉拖/透气跑鞋',   color: '#eab308', emoji: '🟡' },
    { id: 'autumn', label: '秋',  months: '9-11月', categories: '跑鞋/休闲/篮球',       color: '#f97316', emoji: '🟠' },
    { id: 'winter', label: '冬',  months: '12-2月', categories: '棉鞋/短靴/雪地靴',     color: '#3b82f6', emoji: '🔵' },
];

const DEFAULT_WAVES = [
    { id: 'SS-1A', label: '春季首波',  season: '春季', launchMonth: '2月底',  category: '板鞋+跑鞋',       role: '形象+主推' },
    { id: 'SS-1B', label: '春季加深',  season: '春季', launchMonth: '3月底',  category: '跑鞋+休闲',       role: '主推+走量' },
    { id: 'SS-2A', label: '夏季首波',  season: '夏季', launchMonth: '4月底',  category: '凉鞋+透气跑鞋',   role: '主推+形象' },
    { id: 'SS-2B', label: '夏季加深',  season: '夏季', launchMonth: '5月底',  category: '凉鞋+凉拖',       role: '走量' },
    { id: 'SS-3A', label: '夏末清货',  season: '夏季', launchMonth: '6月底',  category: '凉鞋（清货）',    role: '清尾' },
    { id: 'AW-1A', label: '秋季首波',  season: '秋季', launchMonth: '8月底',  category: '跑鞋+休闲',       role: '形象+主推' },
    { id: 'AW-1B', label: '秋季加深',  season: '秋季', launchMonth: '9月底',  category: '跑鞋+板鞋',       role: '主推+走量' },
    { id: 'AW-2A', label: '冬季首波',  season: '冬季', launchMonth: '10月底', category: '棉鞋+短靴',       role: '形象+主推' },
    { id: 'AW-2B', label: '冬季加深',  season: '冬季', launchMonth: '11月底', category: '棉鞋+雪地靴',     role: '主推+走量' },
    { id: 'AW-3A', label: '冬末清货',  season: '冬季', launchMonth: '1月底',  category: '冬鞋（清货）',    role: '清尾' },
    { id: 'AW-3B', label: '春前预热',  season: '春季', launchMonth: '2月初',  category: '板鞋+跑鞋',       role: '测试' },
];

const MATRIX_METRICS = [
    { id: 'sellThrough',     label: '售罄率目标',    unit: '%',  spring: 75,  summer: 78, autumn: 72, winter: 65 },
    { id: 'agedInventory',   label: '库龄警戒天数',  unit: '天', spring: 90,  summer: 75, autumn: 150, winter: 240 },
    { id: 'discountFloor',   label: '折扣率下限',    unit: '%',  spring: 75,  summer: 70, autumn: 72, winter: 78 },
    { id: 'newProductShare', label: '新品销售占比',  unit: '%',  spring: 45,  summer: 40, autumn: 42, winter: 38 },
    { id: 'clearanceRatio',  label: '清货比例上限',  unit: '%',  spring: 15,  summer: 12, autumn: 18, winter: 25 },
    { id: 'attachRate',      label: '连带率目标',    unit: '次', spring: 1.4, summer: 1.3, autumn: 1.5, winter: 1.6 },
    { id: 'fittingRate',     label: '试穿率目标',    unit: '%',  spring: 42,  summer: 38, autumn: 45, winter: 48 },
    { id: 'returnRate',      label: '退货率上限',    unit: '%',  spring: 18,  summer: 22, autumn: 18, winter: 15 },
];

const LIFECYCLE_STAGES = [
    { id: 'development', label: '开发期',   ssRange: '-120天', awRange: '-150天' },
    { id: 'sample',      label: '样品期',   ssRange: '-90天',  awRange: '-120天' },
    { id: 'warmup',      label: '预热期',   ssRange: '-30天',  awRange: '-45天'  },
    { id: 'rampup',      label: '爬坡期',   ssRange: '0~30天', awRange: '0~45天' },
    { id: 'peak',        label: '巅峰期',   ssRange: '30~90天',awRange: '45~120天'},
    { id: 'decline',     label: '衰退期',   ssRange: '90~150天',awRange: '120~180天'},
    { id: 'clearance',   label: '清货期',   ssRange: '150天+', awRange: '180天+' },
];

// 12个月份对应波段甘特（startMonth 1-indexed, span=持续月数）
const GANTT_DATA = [
    { waveId: 'SS-1A', startMonth: 2,  span: 3 },
    { waveId: 'SS-1B', startMonth: 3,  span: 2 },
    { waveId: 'SS-2A', startMonth: 4,  span: 2 },
    { waveId: 'SS-2B', startMonth: 5,  span: 2 },
    { waveId: 'SS-3A', startMonth: 6,  span: 2 },
    { waveId: 'AW-1A', startMonth: 8,  span: 2 },
    { waveId: 'AW-1B', startMonth: 9,  span: 2 },
    { waveId: 'AW-2A', startMonth: 10, span: 2 },
    { waveId: 'AW-2B', startMonth: 11, span: 2 },
    { waveId: 'AW-3A', startMonth: 12, span: 2 },
    { waveId: 'AW-3B', startMonth: 2,  span: 1 },
];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const ROLE_COLOR: Record<string, string> = {
    '形象+主推': 'bg-sky-100 text-sky-700',
    '主推+走量': 'bg-emerald-100 text-emerald-700',
    '走量':      'bg-blue-100 text-blue-700',
    '清尾':      'bg-rose-100 text-rose-700',
    '主推+形象': 'bg-purple-100 text-purple-700',
    '测试':      'bg-amber-100 text-amber-700',
};

export default function SeasonWaveConfigPanel() {
    const [activeTab, setActiveTab] = useState<SubTab>('seasons');

    return (
        <div className="space-y-4">
            {/* 子Tab栏 */}
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
                {SUB_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                            activeTab === t.key
                                ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-600'
                        }`}
                    >
                        <span>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'seasons' && <SeasonsTab />}
            {activeTab === 'waves'   && <WavesTab />}
            {activeTab === 'matrix'  && <MatrixTab />}
            {activeTab === 'gantt'   && <GanttTab />}
            {activeTab === 'lifecycle' && <LifecycleTab />}
        </div>
    );
}

// ─── 1. 季节配置 ──────────────────────────────────────────────────────────────
function SeasonsTab() {
    const [seasons, setSeasons] = useState(DEFAULT_SEASONS);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState({ months: '', categories: '' });

    function startEdit(s: typeof seasons[number]) {
        setEditingId(s.id);
        setDraft({ months: s.months, categories: s.categories });
    }
    function saveEdit(id: string) {
        setSeasons((prev) => prev.map((s) => s.id === id ? { ...s, ...draft } : s));
        setEditingId(null);
    }

    return (
        <div>
            <div className="mb-3 text-xs text-slate-400">配置春/夏/秋/冬四季的月份范围和主导品类</div>
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs w-16">季节</th>
                        <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">月份范围</th>
                        <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">主导品类</th>
                        <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs w-16">色标</th>
                        <th className="text-right px-4 py-2.5 text-slate-500 font-medium text-xs w-24">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {seasons.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-800 text-base">{s.label}</td>
                            <td className="px-4 py-3 text-slate-600">
                                {editingId === s.id ? (
                                    <input
                                        value={draft.months}
                                        onChange={(e) => setDraft((p) => ({ ...p, months: e.target.value }))}
                                        className="border border-sky-300 rounded px-2 py-1 text-xs w-24 outline-none"
                                    />
                                ) : s.months}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                                {editingId === s.id ? (
                                    <input
                                        value={draft.categories}
                                        onChange={(e) => setDraft((p) => ({ ...p, categories: e.target.value }))}
                                        className="border border-sky-300 rounded px-2 py-1 text-xs w-48 outline-none"
                                    />
                                ) : s.categories}
                            </td>
                            <td className="px-4 py-3 text-xl">{s.emoji}</td>
                            <td className="px-4 py-3 text-right">
                                {editingId === s.id ? (
                                    <span className="flex items-center justify-end gap-2">
                                        <button onClick={() => saveEdit(s.id)} className="text-xs text-emerald-600 font-medium">✓</button>
                                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">↶</button>
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-end gap-2">
                                        <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-sky-600">✏️</button>
                                        <button className="text-slate-400 hover:text-amber-600">📋</button>
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── 2. 波段流转 ──────────────────────────────────────────────────────────────
function WavesTab() {
    const [waves] = useState(DEFAULT_WAVES);

    return (
        <div>
            <div className="mb-3 text-xs text-slate-400">11个波段的完整配置，每波段可编辑归属季节、上市月份、主推品类和波段角色</div>
            <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">波段ID</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">标签</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">归属季节</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">上市月</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">主推品类</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">波段角色</th>
                            <th className="text-right px-4 py-2.5 text-slate-500 font-medium text-xs w-20">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {waves.map((w) => (
                            <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">{w.id}</td>
                                <td className="px-4 py-2.5 text-slate-800 font-medium">{w.label}</td>
                                <td className="px-4 py-2.5 text-slate-600">{w.season}</td>
                                <td className="px-4 py-2.5 text-slate-600 text-xs">{w.launchMonth}</td>
                                <td className="px-4 py-2.5 text-slate-600 text-xs">{w.category}</td>
                                <td className="px-4 py-2.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLOR[w.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {w.role}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <span className="flex items-center justify-end gap-2">
                                        <button className="text-slate-400 hover:text-sky-600">✏️</button>
                                        <button className="text-slate-400 hover:text-rose-500">🗑️</button>
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button className="mt-3 flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-sky-300 hover:text-sky-600 transition-colors">
                + 新增波段
            </button>
        </div>
    );
}

// ─── 3. 季节×指标矩阵 ─────────────────────────────────────────────────────────
function MatrixTab() {
    const [matrix, setMatrix] = useState(MATRIX_METRICS);
    const seasons: Array<{ key: 'spring' | 'summer' | 'autumn' | 'winter'; label: string }> = [
        { key: 'spring', label: '春季' },
        { key: 'summer', label: '夏季' },
        { key: 'autumn', label: '秋季' },
        { key: 'winter', label: '冬季' },
    ];

    function updateCell(metricId: string, season: 'spring'|'summer'|'autumn'|'winter', val: number) {
        setMatrix((prev) => prev.map((m) => m.id === metricId ? { ...m, [season]: val } : m));
    }

    return (
        <div>
            <div className="mb-3 text-xs text-slate-400">
                各季节对同一指标设置独立目标值 / 红线，勾选"继承全局"则使用全局阈值配置
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs sticky left-0 bg-slate-50">指标名称</th>
                            {seasons.map((s) => (
                                <th key={s.key} className="text-center px-4 py-2.5 text-slate-500 font-medium text-xs min-w-[100px]">
                                    {s.label}
                                </th>
                            ))}
                            <th className="text-center px-4 py-2.5 text-slate-400 font-medium text-xs">继承全局</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.map((m) => (
                            <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/30">
                                <td className="px-4 py-2.5 font-medium text-slate-800 sticky left-0 bg-white">
                                    {m.label}
                                    <span className="ml-1 text-[10px] text-slate-400">({m.unit})</span>
                                </td>
                                {seasons.map((s) => (
                                    <td key={s.key} className="px-2 py-2 text-center">
                                        <input
                                            type="number"
                                            value={m[s.key]}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                if (!isNaN(v)) updateCell(m.id, s.key, v);
                                            }}
                                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-sky-300 focus:ring-1 focus:ring-sky-100"
                                        />
                                    </td>
                                ))}
                                <td className="px-4 py-2.5 text-center">
                                    <input type="checkbox" className="rounded border-slate-300 text-sky-500 accent-sky-500" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-3 flex items-center gap-2">
                <button className="rounded-xl bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600 transition-colors">
                    保存矩阵配置
                </button>
                <span className="text-[10px] text-slate-400">修改后点击保存，变更将写入品牌季节覆盖配置</span>
            </div>
        </div>
    );
}

// ─── 4. 上市甘特图 ────────────────────────────────────────────────────────────
function GanttTab() {
    const SEASON_BG: Record<string, string> = {
        'SS-1A': '#22c55e', 'SS-1B': '#4ade80', 'SS-2A': '#eab308', 'SS-2B': '#facc15',
        'SS-3A': '#fb923c', 'AW-1A': '#f97316', 'AW-1B': '#fb923c',
        'AW-2A': '#3b82f6', 'AW-2B': '#60a5fa', 'AW-3A': '#818cf8', 'AW-3B': '#86efac',
    };

    return (
        <div>
            <div className="mb-3 text-xs text-slate-400">11波段全年上市节奏可视化，横轴为月份</div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="min-w-[700px]">
                    {/* 月份表头 */}
                    <div className="flex mb-2">
                        <div className="w-28 flex-shrink-0 text-xs text-slate-400 font-medium">波段</div>
                        <div className="flex-1 grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                            {MONTHS.map((m) => (
                                <div key={m} className="text-center text-[10px] text-slate-400 border-l border-slate-200 py-1">
                                    {m}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* 波段行 */}
                    {DEFAULT_WAVES.map((wave) => {
                        const gantt = GANTT_DATA.find((g) => g.waveId === wave.id);
                        const bg = SEASON_BG[wave.id] ?? '#94a3b8';
                        return (
                            <div key={wave.id} className="flex items-center mb-1">
                                <div className="w-28 flex-shrink-0 text-xs text-slate-600 font-medium pr-2 truncate">
                                    {wave.id} <span className="text-slate-400 font-normal">{wave.label}</span>
                                </div>
                                <div className="flex-1 grid relative h-7" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                                    {/* 网格线 */}
                                    {MONTHS.map((m) => (
                                        <div key={m} className="border-l border-slate-200 h-full" />
                                    ))}
                                    {/* 甘特条 */}
                                    {gantt && (
                                        <div
                                            className="absolute top-1 bottom-1 rounded-full flex items-center px-2 text-[10px] font-medium text-white shadow-sm"
                                            style={{
                                                left: `${((gantt.startMonth - 1) / 12) * 100}%`,
                                                width: `${(gantt.span / 12) * 100}%`,
                                                backgroundColor: bg,
                                            }}
                                        >
                                            {wave.role.includes('清') ? '清货' : wave.id}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {/* 季节切换点标注 */}
                    <div className="flex mt-3 border-t border-slate-200 pt-2">
                        <div className="w-28 flex-shrink-0 text-[10px] text-slate-400">季节分界</div>
                        <div className="flex-1 grid text-center" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                            {[null,'春→夏',null,null,null,'夏→秋',null,null,null,'秋→冬',null,null].map((label, i) => (
                                <div key={i} className={`text-[10px] ${label ? 'text-amber-600 font-semibold' : 'text-slate-200'}`}>
                                    {label ?? '·'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── 5. 生命周期7阶段 ─────────────────────────────────────────────────────────
function LifecycleTab() {
    const [stages, setStages] = useState(LIFECYCLE_STAGES);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState({ ssRange: '', awRange: '' });

    function startEdit(s: typeof stages[number]) {
        setEditingId(s.id);
        setDraft({ ssRange: s.ssRange, awRange: s.awRange });
    }
    function saveEdit(id: string) {
        setStages((prev) => prev.map((s) => s.id === id ? { ...s, ...draft } : s));
        setEditingId(null);
    }

    const STAGE_COLORS = [
        'bg-slate-100', 'bg-slate-200', 'bg-amber-100',
        'bg-sky-100', 'bg-emerald-100', 'bg-orange-100', 'bg-rose-100',
    ];

    return (
        <div>
            <div className="mb-3 text-xs text-slate-400">
                鞋类专属7阶段生命周期，每阶段可按春夏秋冬分别配置时间窗口（天数为相对于上市日的偏移量）
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">阶段</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">春夏 (SS)</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">秋冬 (AW)</th>
                            <th className="text-right px-4 py-2.5 text-slate-500 font-medium text-xs w-24">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stages.map((s, i) => (
                            <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                <td className="px-4 py-2.5">
                                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold text-slate-700 ${STAGE_COLORS[i]}`}>
                                        {s.label}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                                    {editingId === s.id ? (
                                        <input
                                            value={draft.ssRange}
                                            onChange={(e) => setDraft((p) => ({ ...p, ssRange: e.target.value }))}
                                            className="border border-sky-300 rounded px-2 py-1 text-xs w-28 outline-none"
                                        />
                                    ) : s.ssRange}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                                    {editingId === s.id ? (
                                        <input
                                            value={draft.awRange}
                                            onChange={(e) => setDraft((p) => ({ ...p, awRange: e.target.value }))}
                                            className="border border-sky-300 rounded px-2 py-1 text-xs w-28 outline-none"
                                        />
                                    ) : s.awRange}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    {editingId === s.id ? (
                                        <span className="flex items-center justify-end gap-2">
                                            <button onClick={() => saveEdit(s.id)} className="text-xs text-emerald-600 font-medium">✓</button>
                                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">↶</button>
                                        </span>
                                    ) : (
                                        <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-sky-600">✏️</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
