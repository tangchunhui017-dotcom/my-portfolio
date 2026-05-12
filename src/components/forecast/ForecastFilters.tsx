'use client';
/**
 * ForecastFilters.tsx
 * 销售预测通用筛选器（15 个维度）
 */
import { useState } from 'react';

export interface ForecastFilterState {
  year: string;
  month: string;
  season: string;
  wave: string;
  category: string;
  channel: string;
  region: string;
  storeType: string;
  platform: string;
  priceBand: string;
  lifecycle: string;
  forecastVersion: string;
  forecastPeriod: string;
}

const DEFAULTS: ForecastFilterState = {
  year: '2026', month: '全部', season: '全部', wave: '全部',
  category: '全部', channel: '全部', region: '全部',
  storeType: '全部', platform: '全部', priceBand: '全部',
  lifecycle: '全部', forecastVersion: '预测', forecastPeriod: '未来12周',
};

const OPTIONS = {
  year:           ['2024', '2025', '2026'],
  month:          ['全部', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  season:         ['全部', '2026SS', '2026FW'],
  wave:           ['全部', 'W1', 'W2', 'W3', 'W4'],
  category:       ['全部', '运动鞋', '凉鞋', '靴子', '休闲鞋', '时装鞋'],
  channel:        ['全部', '直营', '加盟', '电商', 'KA'],
  region:         ['全部', '华东', '华南', '华北', '西南', '华中'],
  storeType:      ['全部', '旗舰店', '标准店', '奥特莱斯', '购物中心'],
  platform:       ['全部', '天猫', '京东', '抖音', '微信小程序'],
  priceBand:      ['全部', '199-399', '399-599', '599-799', '800+'],
  lifecycle:      ['全部', '新品', '延续款', '清货'],
  forecastVersion:['计划', '预测', '实际', '差异'],
  forecastPeriod: ['未来4周', '未来8周', '未来12周', '季末', '年度'],
};

const LABELS: Record<keyof ForecastFilterState, string> = {
  year: '年份', month: '月份', season: '季节', wave: '波段',
  category: '品类', channel: '渠道', region: '区域', storeType: '店型',
  platform: '平台', priceBand: '价格带', lifecycle: '生命周期',
  forecastVersion: '预测版本', forecastPeriod: '预测周期',
};

interface Props {
  filters: ForecastFilterState;
  onChange: (filters: ForecastFilterState) => void;
}

export default function ForecastFilters({ filters, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const set = (key: keyof ForecastFilterState, val: string) => {
    onChange({ ...filters, [key]: val });
  };

  const primaryKeys: (keyof ForecastFilterState)[] = ['year', 'season', 'wave', 'category', 'channel', 'forecastVersion', 'forecastPeriod'];
  const secondaryKeys: (keyof ForecastFilterState)[] = ['month', 'region', 'storeType', 'platform', 'priceBand', 'lifecycle'];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 space-y-3">
      {/* 主筛选器 */}
      <div className="flex flex-wrap items-center gap-2">
        {primaryKeys.map(key => (
          <div key={key} className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 whitespace-nowrap">{LABELS[key]}</span>
            <select
              value={filters[key]}
              onChange={e => set(key, e.target.value)}
              className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white focus:outline-none focus:border-sky-400 cursor-pointer">
              {OPTIONS[key].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button
          onClick={() => setExpanded(e => !e)}
          className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? '折叠 ▲' : '更多筛选 ▼'}
        </button>
        <button
          onClick={() => onChange(DEFAULTS)}
          className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors">
          重置
        </button>
      </div>

      {/* 次级筛选器 */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-50">
          {secondaryKeys.map(key => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{LABELS[key]}</span>
              <select
                value={filters[key]}
                onChange={e => set(key, e.target.value)}
                className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 text-slate-700 bg-white focus:outline-none focus:border-sky-400 cursor-pointer">
                {OPTIONS[key].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
