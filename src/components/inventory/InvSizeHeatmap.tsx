'use client';
/**
 * src/components/inventory/InvSizeHeatmap.tsx
 * S9增强: 核心尺码段热力图 + 补码建议 (V10)
 */

const MALE_SIZES   = ['39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43'];
const FEMALE_SIZES = ['35', '35.5', '36', '36.5', '37', '37.5', '38'];

type SizeStatus = 'full' | 'low' | 'broken' | 'overstock';

interface SizeCell {
  size: string;
  status: SizeStatus;
  qty: number;
  isCore: boolean;
}

interface Props {
  maleSizes: SizeCell[];
  femaleSizes: SizeCell[];
}

const STATUS_STYLES: Record<SizeStatus, { bg: string; text: string; label: string }> = {
  full:     { bg: 'bg-emerald-500', text: 'text-white',      label: '充足' },
  low:      { bg: 'bg-amber-400',   text: 'text-white',      label: '偏少' },
  broken:   { bg: 'bg-red-500',     text: 'text-white',      label: '断码' },
  overstock:{ bg: 'bg-blue-400',    text: 'text-white',      label: '积压' },
};

function SizeGrid({ sizes, title, gender }: { sizes: SizeCell[]; title: string; gender: 'M' | 'F' }) {
  const broken = sizes.filter(s => s.status === 'broken');
  const coreBreaking = broken.filter(s => s.isCore);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {coreBreaking.length > 0 && (
          <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
            ⚠️ 核心码断货: {coreBreaking.map(s => s.size).join(', ')}
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-wrap">
        {sizes.map(cell => {
          const st = STATUS_STYLES[cell.status];
          return (
            <div key={cell.size}
              className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-lg ${st.bg} ${cell.isCore ? 'ring-2 ring-offset-1 ring-gray-800/20' : ''}`}
              title={`${cell.size}: ${st.label} (${cell.qty}双)`}>
              <span className={`text-[11px] font-bold ${st.text}`}>{cell.size}</span>
              <span className={`text-[9px] ${st.text} opacity-80`}>{cell.qty}</span>
              {cell.isCore && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 默认模拟数据生成
function genDefaultSizes(sizeList: string[], gender: 'M' | 'F'): SizeCell[] {
  const coreM = ['40', '40.5', '41', '41.5', '42'];
  const coreF = ['36', '36.5', '37', '37.5', '38'];
  const core = gender === 'M' ? coreM : coreF;
  const brokenSizes = gender === 'M' ? ['41', '41.5'] : ['36.5', '37'];
  const lowSizes    = gender === 'M' ? ['40.5', '42'] : ['37.5'];
  const overstockSizes = gender === 'M' ? ['43'] : ['35'];

  return sizeList.map(size => {
    let status: SizeStatus = 'full';
    if (brokenSizes.includes(size)) status = 'broken';
    else if (lowSizes.includes(size)) status = 'low';
    else if (overstockSizes.includes(size)) status = 'overstock';
    const qty = status === 'broken' ? 0 : status === 'low' ? 8 : status === 'overstock' ? 120 : 35;
    return { size, status, qty, isCore: core.includes(size) };
  });
}

export default function InvSizeHeatmap({ maleSizes, femaleSizes }: Props) {
  const mData = maleSizes.length > 0 ? maleSizes : genDefaultSizes(MALE_SIZES, 'M');
  const fData = femaleSizes.length > 0 ? femaleSizes : genDefaultSizes(FEMALE_SIZES, 'F');

  const brokenM = mData.filter(s => s.status === 'broken' && s.isCore);
  const brokenF = fData.filter(s => s.status === 'broken' && s.isCore);
  const hasSuggestion = brokenM.length > 0 || brokenF.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">核心尺码段热力图</h3>
        <p className="text-xs text-gray-400 mt-0.5">黑色小点 = 核心码段 · 红色 = 断码 · 蓝色 = 积压</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <SizeGrid sizes={mData} title="男款 (39-43)" gender="M" />
        <SizeGrid sizes={fData} title="女款 (35-38)" gender="F" />

        {/* 图例 */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-50">
          {Object.entries(STATUS_STYLES).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${v.bg}`} />
              <span className="text-[10px] text-gray-500">{v.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-200 ring-1 ring-gray-800/30" />
            <span className="text-[10px] text-gray-500">核心码段</span>
          </div>
        </div>

        {/* 自动补码建议 */}
        {hasSuggestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="text-xs font-semibold text-blue-800 mb-2">🔧 自动补码建议</div>
            <div className="space-y-1.5 text-xs text-blue-700">
              {brokenM.length > 0 && (
                <p>男款核心码 <b>{brokenM.map(s => s.size).join(', ')}</b> 断货，建议补码 {brokenM.length * 30} 双，预计补货成本约 ¥{(brokenM.length * 30 * 210 / 10000).toFixed(1)}万</p>
              )}
              {brokenF.length > 0 && (
                <p>女款核心码 <b>{brokenF.map(s => s.size).join(', ')}</b> 断货，建议补码 {brokenF.length * 25} 双，预计补货成本约 ¥{(brokenF.length * 25 * 185 / 10000).toFixed(1)}万</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
