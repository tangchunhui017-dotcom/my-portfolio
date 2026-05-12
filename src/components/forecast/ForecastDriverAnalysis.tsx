'use client';
/**
 * ForecastDriverAnalysis.tsx
 * 预测驱动因素分析 — 14 个因子，影响方向 / 金额 / 权重
 */
import type { ForecastChannel } from '@/hooks/useForecast';

interface Driver {
  key: string;
  label: string;
  direction: 'positive' | 'negative' | 'neutral';
  impactAmt: number;   // 万元
  weight: number;      // 0-100
  note: string;
}

const DRIVERS_BY_CHANNEL: Record<ForecastChannel, Driver[]> = {
  physical: [
    { key: 'trend',       label: '历史趋势',   direction: 'positive', impactAmt: 220, weight: 28, note: '近3季度实体店均保持+8%增长' },
    { key: 'season',      label: '季节性',     direction: 'positive', impactAmt: 180, weight: 22, note: 'Q2旺季指数1.35，春夏品类拉动' },
    { key: 'newproduct',  label: '新品上市',   direction: 'positive', impactAmt: 140, weight: 18, note: 'W3波段新品22款，预计贡献42%' },
    { key: 'traffic',     label: '门店客流',   direction: 'negative', impactAmt: -60, weight: 8,  note: '华东区受竞品新店影响，客流-12%' },
    { key: 'conversion',  label: '转化率',     direction: 'positive', impactAmt: 80,  weight: 10, note: '导购培训后转化率从22%升至26%' },
    { key: 'size',        label: '尺码完整率', direction: 'negative', impactAmt: -45, weight: 6,  note: '断码率9%，预估缺货损失¥45万' },
    { key: 'weather',     label: '天气因素',   direction: 'positive', impactAmt: 30,  weight: 4,  note: '4-6月气温利好凉鞋销售' },
    { key: 'return',      label: '退货率',     direction: 'negative', impactAmt: -25, weight: 4,  note: '实体店退货率6%，基本正常' },
  ],
  ecommerce: [
    { key: 'traffic',     label: '电商流量',   direction: 'positive', impactAmt: 300, weight: 30, note: '天猫搜索流量YoY+25%，品牌热度提升' },
    { key: 'conversion',  label: '转化率',     direction: 'positive', impactAmt: 200, weight: 20, note: '详情页优化后转化率+1.2pp到4.8%' },
    { key: 'campaign',    label: '促销活动',   direction: 'positive', impactAmt: 260, weight: 26, note: '618大促预计拉动系数2.8×' },
    { key: 'return',      label: '退货率',     direction: 'negative', impactAmt: -120,weight: 12, note: '鞋类退货率28%，是最大负向因子' },
    { key: 'price',       label: '价格折扣',   direction: 'negative', impactAmt: -80, weight: 8,  note: '活动折扣率41%，压缩净销售额' },
    { key: 'content',     label: '内容流量',   direction: 'positive', impactAmt: 40,  weight: 4,  note: '直播贡献GMV 18%，同比+40%' },
  ],
  new_store: [
    { key: 'newproduct',  label: '新品上市',   direction: 'positive', impactAmt: 80,  weight: 25, note: '开业同期W3新品，配合爆发期' },
    { key: 'season',      label: '季节性',     direction: 'positive', impactAmt: 60,  weight: 18, note: '春季开业具有旺季加成' },
    { key: 'traffic',     label: '开业客流',   direction: 'positive', impactAmt: 120, weight: 35, note: '开业爆发期预计3倍客流' },
    { key: 'size',        label: '首铺尺码率', direction: 'negative', impactAmt: -50, weight: 14, note: '首铺完整率84%，影响成交率' },
    { key: 'weather',     label: '天气因素',   direction: 'neutral',  impactAmt: 0,   weight: 4,  note: '开业月份气温适宜，中性' },
    { key: 'competitor',  label: '竞品影响',   direction: 'negative', impactAmt: -30, weight: 4,  note: '商场内有2个竞品门店' },
  ],
};

const DIR_STYLE = {
  positive: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-400', icon: '↑' },
  negative: { bg: 'bg-rose-100',    text: 'text-rose-700',    bar: 'bg-rose-400',    icon: '↓' },
  neutral:  { bg: 'bg-slate-100',   text: 'text-slate-500',   bar: 'bg-slate-300',   icon: '→' },
};

interface Props { channel: ForecastChannel; }

export default function ForecastDriverAnalysis({ channel }: Props) {
  const drivers = DRIVERS_BY_CHANNEL[channel] ?? [];
  const maxWeight = Math.max(...drivers.map(d => d.weight));
  const totalPositive = drivers.filter(d => d.direction === 'positive').reduce((s, d) => s + d.impactAmt, 0);
  const totalNegative = drivers.filter(d => d.direction === 'negative').reduce((s, d) => s + d.impactAmt, 0);

  return (
    <div className="space-y-3">
      {/* 汇总 */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-500">正向驱动合计：</span>
          <span className="font-semibold text-emerald-700">+¥{totalPositive}万</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="text-slate-500">负向阻力合计：</span>
          <span className="font-semibold text-rose-700">¥{totalNegative}万</span>
        </div>
      </div>

      {/* 因子列表 */}
      <div className="space-y-2">
        {drivers.map(d => {
          const style = DIR_STYLE[d.direction];
          const barW = Math.round((d.weight / maxWeight) * 100);
          return (
            <div key={d.key} className="bg-white rounded-lg border border-slate-100 px-3 py-2.5 flex items-center gap-3">
              <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style.bg} ${style.text}`}>
                {style.icon}
              </div>
              <div className="w-20 shrink-0">
                <div className="text-xs font-medium text-slate-700">{d.label}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 ${style.bar} rounded-full`} style={{ width: barW + '%' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 w-8">{d.weight}%</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">{d.note}</div>
              </div>
              <div className={`shrink-0 text-xs font-semibold ${style.text} w-16 text-right`}>
                {d.impactAmt > 0 ? '+' : ''}¥{d.impactAmt}万
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
