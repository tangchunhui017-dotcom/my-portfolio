'use client';
/**
 * ForecastRelatedLinks.tsx
 * 销售预测 — 跨模块联动入口（底部）
 */

interface Module {
  icon: string;
  label: string;
  relation: string;
  tab: string;
  tone: string;
}

const MODULES: Module[] = [
  { icon: '💰', label: 'OTB预算',  relation: '根据预测缺口调整采购预算',                 tab: 'otb',          tone: 'hover:border-sky-300 hover:bg-sky-50' },
  { icon: '📦', label: '库存健康', relation: '查看缺货、积压、WOS和尺码完整率',          tab: 'inventory',    tone: 'hover:border-emerald-300 hover:bg-emerald-50' },
  { icon: '📅', label: '波段企划', relation: '调整上市节奏、SKU结构和主推款',            tab: 'planning',     tone: 'hover:border-violet-300 hover:bg-violet-50' },
  { icon: '📋', label: '品类运营', relation: '调整品类结构、款宽款深和价格带',           tab: 'category',     tone: 'hover:border-amber-300 hover:bg-amber-50' },
  { icon: '💹', label: '损益',     relation: '查看预测销售对毛利和净利的影响',           tab: 'profit-loss',  tone: 'hover:border-pink-300 hover:bg-pink-50' },
  { icon: '💧', label: '现金流',   relation: '查看预测销售和采购对现金的影响',           tab: 'cashflow',     tone: 'hover:border-blue-300 hover:bg-blue-50' },
  { icon: '🏪', label: '区域&门店',relation: '查看门店销售、区域差异和新店爬坡',         tab: 'channel',      tone: 'hover:border-rose-300 hover:bg-rose-50' },
];

interface Props {
  onJumpToTab?: (tab: string) => void;
}

export default function ForecastRelatedLinks({ onJumpToTab }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {MODULES.map(mod => (
        <button
          key={mod.tab}
          onClick={() => onJumpToTab?.(mod.tab)}
          className={`flex flex-col items-start gap-2 bg-white rounded-xl border border-slate-100 px-3 py-3 text-left transition-all ${mod.tone} shadow-sm`}>
          <div className="text-2xl">{mod.icon}</div>
          <div>
            <div className="text-xs font-semibold text-slate-800">{mod.label}</div>
            <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{mod.relation}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
