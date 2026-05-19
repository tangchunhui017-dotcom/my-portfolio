/**
 * src/config/chartTheme.ts
 * 商品企划图表设计令牌（design tokens）—— 集中维护配色 / tooltip / 轴线样式。
 *
 * 用途：
 * - 各业务面板 echarts option 不再硬编码颜色，从这里 import
 * - 后续要改全局风格，只改这一个文件
 * - Tailwind utility 颜色与 echarts hex 在此对齐，避免 UI 卡片与图表配色"飘"
 *
 * 颜色值与 Tailwind 默认 slate / emerald / amber / sky / rose / violet 完全对齐：
 * - slate-900 #0F172A · slate-700 #334155 · slate-600 #475569 · slate-500 #64748B
 * - slate-400 #94A3B8 · slate-300 #CBD5E1 · slate-200 #E2E8F0 · slate-100 #F1F5F9 · slate-50 #F8FAFC
 * - emerald-500 #10B981 · amber-500 #F59E0B · red-500 #EF4444
 * - sky-500 #0EA5E9 · sky-400 #38BDF8 · violet-500 #8B5CF6 · rose-500 #F43F5E
 */

// ─── 中性色（文字 / 边框 / 背景） ───────────────────────────────────
export const CHART_INK = '#0F172A';        // tooltip 标题 / 强调字
export const CHART_TEXT = '#475569';       // 常规正文
export const CHART_TEXT_MUTED = '#64748B'; // axisLabel / 弱化文字
export const CHART_TEXT_FAINT = '#94A3B8'; // 注脚 / 占位
export const CHART_LINE = '#E2E8F0';       // axisLine / 边框
export const CHART_LINE_DASHED = '#E5E7EB'; // splitLine
export const CHART_BG_CARD = '#FFFFFF';
export const CHART_BG_MUTED = '#F8FAFC';
export const CHART_BG_SUBTLE = '#F1F5F9';

// ─── 语义色（业务含义） ───────────────────────────────────────────
export const CHART_POSITIVE = '#10B981';  // emerald-500 — 达成 / 正向
export const CHART_WARNING = '#F59E0B';   // amber-500   — 警示
export const CHART_DANGER = '#EF4444';    // red-500     — 风险 / 不达
export const CHART_NEUTRAL = '#64748B';   // slate-500
export const CHART_HIGHLIGHT = '#0EA5E9'; // sky-500     — 主突出
export const CHART_HIGHLIGHT_LIGHT = '#38BDF8'; // sky-400 — 次要突出
export const CHART_ACCENT = '#8B5CF6';    // violet-500  — 次突出 / 第二系列
export const CHART_ROSE = '#F43F5E';      // rose-500    — 警示用第二色

// 兼容旧代码常用的 amber-400 / red-400
export const CHART_WARNING_LIGHT = '#FBBF24';
export const CHART_DANGER_LIGHT = '#F87171';

// ─── 多系列调色板（饼图 / 多 brand 对比时按顺序取） ─────────────────
export const CHART_PALETTE = [
    CHART_HIGHLIGHT,       // #0EA5E9 sky
    CHART_POSITIVE,        // #10B981 emerald
    CHART_ACCENT,          // #8B5CF6 violet
    CHART_WARNING,         // #F59E0B amber
    CHART_DANGER,          // #EF4444 red
    '#06B6D4',             // cyan-500
    '#84CC16',             // lime-500
    '#EC4899',             // pink-500
    '#6366F1',             // indigo-500
    '#14B8A6',             // teal-500
];

// ─── 状态徽章配色（与 Tailwind 卡片样式对齐） ───────────────────────
export const STATUS_TONES = {
    positive: { fg: CHART_POSITIVE, bg: '#ECFDF5', border: '#A7F3D0' },
    warning:  { fg: CHART_WARNING,  bg: '#FFFBEB', border: '#FDE68A' },
    danger:   { fg: CHART_DANGER,   bg: '#FEF2F2', border: '#FECACA' },
    neutral:  { fg: CHART_TEXT,     bg: CHART_BG_SUBTLE, border: CHART_LINE },
    info:     { fg: CHART_HIGHLIGHT,bg: '#F0F9FF', border: '#BAE6FD' },
} as const;

// ─── 通用 echarts option 片段 ─────────────────────────────────────
// 直接展开到 option：`...CHART_TOOLTIP_BASE` / `axisLine: CHART_AXIS_BASE.axisLine` 等

export const CHART_TOOLTIP_BASE = {
    borderColor: CHART_LINE,
    backgroundColor: CHART_BG_CARD,
    textStyle: { color: CHART_INK, fontSize: 12 },
    extraCssText: 'box-shadow: 0 4px 12px rgba(15,23,42,0.06); border-radius: 8px;',
} as const;

export const CHART_AXIS_BASE = {
    axisLine: { lineStyle: { color: CHART_LINE } },
    axisLabel: { color: CHART_TEXT_MUTED, fontSize: 11 },
    splitLine: { lineStyle: { color: CHART_LINE_DASHED, type: 'dashed' as const } },
    axisTick: { lineStyle: { color: CHART_LINE } },
    nameTextStyle: { color: CHART_TEXT_MUTED, fontSize: 11 },
} as const;

export const CHART_LEGEND_BASE = {
    textStyle: { color: CHART_TEXT_MUTED, fontSize: 11 },
    icon: 'circle' as const,
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 14,
};

// ─── 通用卡片容器 className（业务面板包裹层用） ─────────────────────
// 建议替代各处手写的 `bg-white rounded-2xl border border-slate-100 shadow-sm p-5`
export const CHART_CARD_CLASS = 'bg-white rounded-2xl border border-slate-100 shadow-sm';
export const CHART_CARD_CLASS_PADDED = 'bg-white rounded-2xl border border-slate-100 shadow-sm p-5';
