'use client';

import { useState, useMemo, useEffect } from 'react';
import { SERIES_ROLE_LABELS } from '@/config/design-review-center/labels';
import type { ThemeStrategyRecord } from '@/lib/design-review-center/types';

interface ThemeDirectionPanelProps {
  strategies: ThemeStrategyRecord[];
}

type ChipTone = 'slate' | 'emerald' | 'amber' | 'rose';
type ColorCardMeta = {
  bgClass: string;
  textClass: string;
  mutedClass: string;
  hex: string;
};
type DirectionBoardDefinition = {
  key: 'material' | 'sole' | 'last' | 'craft';
  label: string;
  subtitle: string;
  summary: string;
  reviewHint: string;
  items: string[];
  tone: ChipTone;
  canvasBg: string;
  frame: string;
  accent: string;
  glow: string;
  imageUrl?: string | null;
};

function SectionEyebrow({ label }: { label: string }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>;
}

function ChipGroup({ items, tone = 'amber' }: { items: string[]; tone?: ChipTone }) {
  if (!items.length) {
    return <div className="text-sm text-slate-400">待补充</div>;
  }

  const getChipStyle = (item: string, defaultTone: ChipTone) => {
    // 自动判定是否为"技术参数/部件词"
    const isTech = /cupsole|EVA|TPU|mm|拼接|包边|织带|网布|橡胶|碳板/i.test(item);
    const resolvedTone = isTech ? 'slate' : defaultTone;

    return resolvedTone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : resolvedTone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : resolvedTone === 'rose'
          ? 'border-rose-100 bg-rose-50 text-rose-700'
          : 'border-slate-800 bg-slate-900 text-slate-100 tracking-wide shadow-sm';
  };

  const isCostly = (item: string) => /进口|牛皮|真皮|大面|电镀|全掌|碳板|气垫|黑科技/i.test(item);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-3 py-1 flex items-center gap-1 text-xs font-medium ${getChipStyle(item, tone)}`}>
          {item}
          {isCostly(item) && <span className="text-[10px] font-bold text-rose-400">$$$</span>}
        </span>
      ))}
    </div>
  );
}

function getColorCardMeta(value: string): ColorCardMeta {
  const paletteMap: Array<{ keyword: string; meta: ColorCardMeta }> = [
    {
      keyword: '经典黑',
      meta: { bgClass: 'bg-[#131827]', textClass: 'text-white', mutedClass: 'text-white/70', hex: '#111827' },
    },
    {
      keyword: '全黑',
      meta: { bgClass: 'bg-[#111111]', textClass: 'text-white', mutedClass: 'text-white/70', hex: '#111111' },
    },
    {
      keyword: '白',
      meta: { bgClass: 'bg-[#F8FAFC]', textClass: 'text-slate-900', mutedClass: 'text-slate-500', hex: '#F8FAFC' },
    },
    {
      keyword: '米白',
      meta: { bgClass: 'bg-[#F2EEE3]', textClass: 'text-slate-900', mutedClass: 'text-slate-500', hex: '#F2EEE3' },
    },
    {
      keyword: '低饱和米白',
      meta: { bgClass: 'bg-[#EFE8D6]', textClass: 'text-slate-900', mutedClass: 'text-slate-500', hex: '#EFE8D6' },
    },
    {
      keyword: '灰',
      meta: { bgClass: 'bg-[#94A3B8]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#94A3B8' },
    },
    {
      keyword: '深灰',
      meta: { bgClass: 'bg-[#4B5563]', textClass: 'text-white', mutedClass: 'text-white/70', hex: '#4B5563' },
    },
    {
      keyword: '岩石灰',
      meta: { bgClass: 'bg-[#78716C]', textClass: 'text-white', mutedClass: 'text-white/70', hex: '#78716C' },
    },
    {
      keyword: '绿',
      meta: { bgClass: 'bg-[#84CC16]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#84CC16' },
    },
    {
      keyword: '军绿',
      meta: { bgClass: 'bg-[#556B2F]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#556B2F' },
    },
    {
      keyword: '橙',
      meta: { bgClass: 'bg-[#F97316]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#F97316' },
    },
    {
      keyword: '蓝',
      meta: { bgClass: 'bg-[#1D4ED8]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#1D4ED8' },
    },
    {
      keyword: '棕',
      meta: { bgClass: 'bg-[#7C4A2D]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#7C4A2D' },
    },
    {
      keyword: '驼',
      meta: { bgClass: 'bg-[#C19A6B]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#C19A6B' },
    },
    {
      keyword: '卡其',
      meta: { bgClass: 'bg-[#B6A37A]', textClass: 'text-white', mutedClass: 'text-white/75', hex: '#B6A37A' },
    },
  ];

  const matched = paletteMap.find((item) => value.includes(item.keyword));
  return matched?.meta ?? { bgClass: 'bg-slate-100', textClass: 'text-slate-900', mutedClass: 'text-slate-500', hex: '#E2E8F0' };
}

function getDirectionBoards(record: ThemeStrategyRecord): DirectionBoardDefinition[] {
  return [
    {
      key: 'material',
      label: '材料方向板',
      subtitle: '先统一主材料、辅料和支撑件的触感与功能判断。',
      summary: '材料板先定气质和功能边界，后面版本差异应当是在表达深化，而不是材料逻辑反复摇摆。',
      reviewHint: '先看材料主次关系、功能件占比和触感是否统一。',
      items: record.materialDirections,
      tone: 'emerald',
      canvasBg: 'bg-[#EEF7F1]',
      frame: 'border-emerald-400',
      accent: 'bg-emerald-300',
      glow: 'bg-emerald-100/70',
      imageUrl: null,
    },
    {
      key: 'sole',
      label: '底型方向板',
      subtitle: '把中底体量、外底抓地和底墙语言先统一。',
      summary: '底型是整组货第一眼的体量识别，底墙、侧边包裹和抓地表达需要先收口，后面开模才不会反复。',
      reviewHint: '先看中底量感、底墙轮廓和外底功能语言是否统一。',
      items: record.soleDirections,
      tone: 'slate',
      canvasBg: 'bg-[#EEF4FF]',
      frame: 'border-blue-500',
      accent: 'bg-blue-300',
      glow: 'bg-blue-100/70',
      imageUrl: null,
    },
    {
      key: 'last',
      label: '楦型方向板',
      subtitle: '楦型决定整组货的轮廓识别和上脚感受。',
      summary: '楦型不仅影响造型，也影响穿着体验和帮面比例，必须和底型一起提前建立一致的判断标准。',
      reviewHint: '先看前掌、后跟和开口比例是否符合目标脚感。',
      items: record.lastDirections,
      tone: 'slate',
      canvasBg: 'bg-[#F4F5F7]',
      frame: 'border-slate-400',
      accent: 'bg-slate-300',
      glow: 'bg-slate-100/80',
      imageUrl: null,
    },
    {
      key: 'craft',
      label: '工艺 / 细节方向板',
      subtitle: '把帮面结构、包边、织带和功能细节做成统一语言。',
      summary: '真正让系列看起来不像拼货的，是细节语法是否一致。工艺层次要先讲清楚，再进入具体款式差异。',
      reviewHint: '先看拼接、包边、织带和功能细节是否形成统一语法。',
      items: record.designLanguages,
      tone: 'amber',
      canvasBg: 'bg-[#FFF7E9]',
      frame: 'border-amber-400',
      accent: 'bg-amber-300',
      glow: 'bg-amber-100/80',
      imageUrl: null,
    },
  ];
}

function DirectionBoardShowcase({ board, relatedSole, relatedLast }: { board: DirectionBoardDefinition; relatedSole?: string; relatedLast?: string }) {
  const [decision, setDecision] = useState<'pending' | 'revising' | 'confirmed'>('pending');

  const cycleDecision = () => {
    setDecision((prev) => (prev === 'pending' ? 'revising' : prev === 'revising' ? 'confirmed' : 'pending'));
  };

  return (
    <div className="relative overflow-hidden rounded-b-[30px] border border-slate-200/80 border-t-0 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)]">
      <div className="grid gap-0 xl:grid-cols-[1.3fr_0.7fr]">
        <div className={`relative min-h-[560px] overflow-hidden ${board.imageUrl ? 'bg-slate-100' : board.canvasBg}`}>
          {board.imageUrl ? (
            <img src={board.imageUrl} alt={board.label} className="h-full w-full object-cover mix-blend-multiply opacity-90" />
          ) : (
            <>
              <div className={`absolute left-14 top-14 h-11 w-11 rounded-full ${board.accent} opacity-55 saturate-150 blur-sm`} />
              <div className={`absolute right-20 top-20 h-8 w-8 rounded-full ${board.accent} opacity-35 saturate-200 blur-sm`} />
              <div className={`absolute bottom-16 left-12 h-[66%] w-[78%] rounded-[42px] border-[10px] border-dashed ${board.frame} opacity-85`} />
              <div className={`absolute bottom-24 left-[16%] h-28 w-[54%] rounded-[999px] border-[8px] ${board.frame} opacity-95`} />
              <div className={`absolute bottom-14 left-[28%] h-12 w-[34%] rounded-[999px] border-4 ${board.frame} opacity-55`} />
            </>
          )}
        </div>

        <div className="flex h-full flex-col bg-white border-l border-slate-100 p-8 xl:p-10 relative">
          {/* 决策印章区域 */}
          <div className="absolute right-8 top-8 z-10">
            <button
              onClick={cycleDecision}
              className={`group flex items-center gap-2 rounded-2xl border p-1 pl-3 pr-4 text-[13px] font-bold tracking-wide transition-all duration-300 ${
                decision === 'pending'
                  ? 'border-slate-200 bg-white text-slate-500 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md'
                  : decision === 'revising'
                    ? 'border-amber-200 bg-amber-50 text-amber-700 shadow-[0_8px_24px_rgba(251,191,36,0.15)] hover:shadow-[0_12px_32px_rgba(251,191,36,0.2)]'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_8px_24px_rgba(16,185,129,0.15)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.2)]'
              }`}
            >
              <span className={`relative flex h-3 w-3 items-center justify-center rounded-full ${decision === 'pending' ? 'bg-slate-300' : decision === 'revising' ? 'bg-amber-400' : 'bg-emerald-400'}`}>
                {decision === 'revising' && <span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>}
              </span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] uppercase tracking-widest opacity-60">Status</span>
                <span>{decision === 'pending' ? '待评议' : decision === 'revising' ? '需修改' : '已定案'}</span>
              </div>
            </button>
          </div>

          <SectionEyebrow label="板位详情" />
          <h5 className="mt-3 text-3xl tracking-tight text-slate-900 font-black">
            {board.label.replace('方向板', '')}
            <span className="text-xl font-bold text-slate-400 ml-2 tracking-normal">方向板</span>
          </h5>
          <p className="mt-4 text-[15px] font-semibold text-indigo-900/60 leading-relaxed border-l-2 border-indigo-200 pl-3">{board.subtitle}</p>
          <p className="mt-6 text-sm leading-8 text-slate-600">{board.summary}</p>

          <div className="mt-8 flex-1">
            <div className="mb-4 flex items-center gap-2">
               <svg className={`h-4 w-4 ${board.accent.replace('bg-', 'text-')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
               <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">核对锚点</span>
            </div>
            <ChipGroup items={board.items} tone={board.tone} />
          </div>

          <div className="mt-8 rounded-2xl overflow-hidden border border-rose-100 bg-gradient-to-br from-rose-50/50 to-orange-50/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,1)] relative">
            <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
               <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <div className="relative flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500">评审通过条件</span>
            </div>
            <p className="relative mt-3 text-sm font-medium leading-6 text-rose-950/80">{board.reviewHint}</p>
            
            {/* 联动提示信息 */}
            {board.key === 'sole' && relatedLast && (
              <div className="relative mt-4 border-t border-rose-200/50 pt-3 text-xs flex items-center gap-2">
                <span className="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-600">联动</span>
                <span className="text-rose-900/70">当前底型建议匹配『{relatedLast}』</span>
              </div>
            )}
            {board.key === 'last' && relatedSole && (
              <div className="relative mt-4 border-t border-rose-200/50 pt-3 text-xs flex items-center gap-2">
                <span className="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-600">联动</span>
                <span className="text-rose-900/70">前置确认配底『{relatedSole}』</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategyCard({ record }: { record: ThemeStrategyRecord }) {
  const directionBoards = getDirectionBoards(record);
  const [activeBoardKey, setActiveBoardKey] = useState<DirectionBoardDefinition['key']>(directionBoards[0]?.key ?? 'material');
  const activeBoard = directionBoards.find((board) => board.key === activeBoardKey) ?? directionBoards[0];
  const colorCards = record.colorDirections.slice(0, 5);

  const StatusPill = () => {
    const s = record.reviewDecisionStatus;
    return (
      <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-md ${
        s === 'pending' ? 'border-slate-400/50 bg-slate-900/40 text-slate-300' :
        s === 'in_progress' ? 'border-amber-400/50 bg-amber-900/40 text-amber-300' :
        'border-emerald-400/50 bg-emerald-900/40 text-emerald-300'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor] ${s === 'pending' ? 'bg-slate-400' : s === 'in_progress' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        {s === 'pending' ? '待评' : s === 'in_progress' ? '进行中' : '定案'}
      </div>
    );
  };

  return (
    <article id={`series-${record.seriesId}`} className="space-y-6 pt-6">
      <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Card 1 */}
          <div className="group relative flex items-center gap-4 p-5 transition-all hover:bg-slate-50/80">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-[#bd1e59]/10 group-hover:text-[#bd1e59]">
               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">目标人群 (Consumer)</div>
              <div className="mt-0.5 text-lg font-bold text-slate-900 line-clamp-1">{record.targetConsumer}</div>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="group relative flex items-center gap-4 p-5 transition-all hover:bg-slate-50/80">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-[#bd1e59]/10 group-hover:text-[#bd1e59]">
               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">目标波段 (Wave)</div>
              <div className="mt-0.5 text-lg font-bold text-slate-900">{record.targetWave.toUpperCase()}</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group relative flex items-center gap-4 p-5 transition-all hover:bg-slate-50/80">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-[#bd1e59]/10 group-hover:text-[#bd1e59]">
               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">系列角色 (Role)</div>
              <div className="mt-0.5 text-lg font-bold text-slate-900">{SERIES_ROLE_LABELS[record.seriesRole]}</div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="group relative flex items-center gap-4 p-5 transition-all hover:bg-slate-50/80">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-[#bd1e59]/10 group-hover:text-[#bd1e59]">
               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">品类矩阵 (Categories)</div>
              <div className="mt-1 flex flex-wrap gap-1.5"><ChipGroup items={record.categories} /></div>
            </div>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] shadow-[0_16px_36px_rgba(15,23,42,0.06)] [transform:translateZ(0)]">
        <div className="grid gap-0 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="relative min-h-[460px] bg-slate-900 rounded-t-[30px] rounded-b-none xl:rounded-t-none xl:rounded-r-none xl:rounded-l-[30px]">
            {record.heroAsset ? (
              <img src={record.heroAsset.imageUrl} alt={`${record.seriesName} 总情绪板`} className="h-full w-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
            ) : (
              <div className="flex h-full min-h-[460px] items-center justify-center bg-slate-800 text-sm text-slate-500">
                当前系列暂无总情绪板
              </div>
            )}
            
            {/* 顶端标签栏 */}
            <div className="absolute inset-x-6 top-6 flex items-start justify-between">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold tracking-wider text-white backdrop-blur-md shadow-sm">
                  <span className="opacity-75 mr-1.5 uppercase font-medium text-[10px]">Board</span>
                  {record.seriesName}
                </div>
                <StatusPill />
              </div>
              
              {record.costDriftAlert && (
                <div className="flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/90 px-3 py-1.5 text-[11px] font-bold tracking-widest text-white backdrop-blur-xl shadow-[0_0_32px_rgba(225,29,72,0.8)] xl:translate-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                  </span>
                  成本警报 {record.costDriftAlert}
                </div>
              )}
            </div>

            {/* 底部仪表盘排版 */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-6 sm:p-8">
              <div className="flex w-full flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="mb-2 text-[10px] uppercase font-bold tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <span>{record.brandName}</span>
                    <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                    <span>{record.year}{record.quarter}</span>
                    <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                    <span className="text-white/80">负责人: {record.owner ?? '待定'}</span>
                  </div>
                  <h3 className="text-4xl font-bold tracking-tight text-white mb-2">{record.seriesName}</h3>
                  <div className="text-[11px] font-bold tracking-[0.24em] text-white/70">
                    {record.targetWave.toUpperCase()} / {SERIES_ROLE_LABELS[record.seriesRole]} 
                  </div>
                </div>
                
                <div className="flex gap-4 sm:gap-6 border-l border-white/20 pl-4 sm:pl-6 text-white text-left">
                   {record.skuTarget > 0 && (
                     <div className="flex flex-col">
                       <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Target SKU</span>
                       <span className="text-2xl font-bold font-mono leading-none">{record.skuTarget}<span className="text-[11px] font-sans font-medium text-white/50 ml-1 drop-shadow-sm">款</span></span>
                     </div>
                   )}
                   {record.targetCostBand && (
                     <div className="flex flex-col">
                       <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Cost Band</span>
                       <span className="text-2xl font-bold font-mono leading-none"><span className="text-[11px] font-sans font-medium text-white/50 mr-1 drop-shadow-sm">¥</span>{record.targetCostBand}</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧面板 */}
          <div className="grid min-h-[460px] grid-rows-[auto_1fr] gap-0 border-t border-slate-200 xl:border-l xl:border-t-0 bg-white">
            <div className="p-6 xl:p-8">
              <SectionEyebrow label="主打色卡 (Palette)" />
              {colorCards.length > 0 ? (
                <>
                  <div className="mt-5 flex gap-1.5 w-full">
                    <div className="h-1 bg-slate-800 rounded-l-full" style={{ width: '60%' }} title="主色分配 60%" />
                    <div className="h-1 bg-slate-400" style={{ width: '30%' }} title="辅色分配 30%" />
                    <div className="h-1 bg-slate-200 rounded-r-full" style={{ width: '10%' }} title="点缀色分配 10%" />
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {colorCards.map((colorName) => {
                      const meta = getColorCardMeta(colorName);
                      return (
                        <div key={colorName} className={`relative flex flex-col justify-end overflow-hidden rounded-xl border border-black/5 shadow-[inset_0_1px_4px_rgba(255,255,255,0.4)] transition hover:scale-105 h-20 sm:h-24 p-2 ${meta.bgClass}`}>
                           <div className={`text-[11px] font-bold leading-tight line-clamp-1 ${meta.textClass}`}>{colorName}</div>
                           <div className={`text-[9px] font-mono tracking-wide mt-0.5 opacity-60 ${meta.textClass}`}>{meta.hex}</div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-8 text-center text-xs text-slate-400">暂无主打色卡</div>
              )}
            </div>

            <div className="flex flex-col space-y-6 border-t border-slate-100 bg-slate-50/50 p-6 xl:p-8">
              <div className="flex-1">
                <SectionEyebrow label="主题情绪 (Theme Direction)" />
                <div className="mt-3 relative">
                  <div className="absolute left-0 top-1 bottom-1 w-1 bg-indigo-500 rounded-full"></div>
                  <p className="pl-4 text-sm leading-7 text-slate-700 italic font-medium">围绕 {record.targetConsumer} 的使用情境，建立适配 {record.targetWave.toUpperCase()} 波段的系列表达，先用主色和主轮廓把识别度立起来，再通过材料和细节把这组货做出层次。</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">核心语法</div>
                  <ChipGroup items={record.designLanguages} tone="amber" />
                </div>
                <div>
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">场景设定</div>
                  <ChipGroup items={record.usageScenarios} tone="emerald" />
                </div>
              </div>
              
              {/* Benchmark 竞品/标杆对照区 */}
              {record.benchmarkReferences?.length > 0 && (
                <div className="mt-2 flex flex-col gap-3 rounded-[20px] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)] bg-gradient-to-br from-indigo-50/80 to-purple-50/40 p-5 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22l10-3 10 3L12 2z"/></svg>
                  </div>
                  <div className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-400">标杆参照 / Benchmark</div>
                  <div className="relative flex flex-wrap gap-2">
                    {record.benchmarkReferences.map(ref => (
                      <span key={ref} className="flex items-center gap-1.5 rounded-full bg-white/60 shadow-sm border border-indigo-100/50 px-3 py-1.5 text-xs font-semibold text-indigo-900 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        {ref}
                      </span>
                    ))}
                  </div>
                  <p className="relative text-xs leading-5 text-indigo-950/70 mt-1">
                    <span className="font-bold text-indigo-900 border-b border-indigo-200 pb-0.5 mr-1">拆解优势</span>根据标杆特性优化结构，更贴合我们的品牌调性和楦型开发逻辑。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 四块板展示区 - 带吸顶支持 */}
      <section className="relative mt-8 shadow-[0_16px_36px_rgba(15,23,42,0.06)] rounded-[30px]">
        <div className="sticky top-[56px] w-full z-20 rounded-t-[30px] bg-white/95 backdrop-blur-2xl border border-slate-200/80 border-b-slate-100 overflow-hidden">
          <div className="grid gap-0 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="flex items-center gap-4 text-left px-6 py-4 xl:px-8 xl:py-5 border-b border-slate-100 xl:border-b-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] shadow-sm border border-slate-100">
                 <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">The 4-Board Framework</div>
                <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">专题方向板矩阵</h4>
              </div>
            </div>
            
            <div className="flex items-center w-full overflow-x-auto px-6 py-4 xl:pl-0 xl:pr-8 xl:py-5">
              <div className="flex w-max rounded-xl bg-slate-100/80 p-1.5 shadow-inner">
                {directionBoards.map((board) => {
                  const isActive = board.key === activeBoardKey;
                  return (
                    <button
                      key={board.key}
                      type="button"
                      onClick={() => setActiveBoardKey(board.key)}
                      className={[
                        'relative whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-bold transition-all duration-300',
                        isActive
                          ? 'bg-white text-indigo-600 shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                          : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800',
                      ].join(' ')}
                    >
                      <span className="text-[15px] font-extrabold tracking-tight">{board.label.replace('方向板', '')}</span>
                      <span className={`text-[11px] font-semibold ml-1 tracking-wider ${isActive ? 'text-indigo-400/80' : 'text-slate-400'}`}>方向板</span>
                      {isActive && <div className="absolute inset-x-0 -bottom-[1px] mx-auto h-[3px] w-8 rounded-t-full bg-indigo-500 shadow-[0_-2px_8px_rgba(99,102,241,0.5)]"></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {activeBoard ? (
          <div className="w-full">
            <DirectionBoardShowcase board={activeBoard} relatedSole={record.soleDirections[0]} relatedLast={record.lastDirections[0]} />
          </div>
        ) : null}
      </section>
    </article>
  );
}

export default function ThemeDirectionPanel({ strategies }: ThemeDirectionPanelProps) {
  if (!strategies.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无主题与系列策略内容。
      </div>
    );
  }

  const waveGroups = useMemo(() => {
    const groups = new Map<string, ThemeStrategyRecord[]>();
    strategies.forEach((s) => {
      const wave = s.targetWave.toUpperCase();
      if (!groups.has(wave)) groups.set(wave, []);
      groups.get(wave)!.push(s);
    });

    const waveOrder = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
    const sortedWaves = Array.from(groups.entries()).sort((a, b) => {
      const idxA = waveOrder.indexOf(a[0]);
      const idxB = waveOrder.indexOf(b[0]);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a[0].localeCompare(b[0]);
    });

    return sortedWaves.map(([wave, strats]) => {
      const skuTotal = strats.reduce((sum, s) => sum + s.skuTarget, 0);
      const alertCount = strats.filter(s => !!s.costDriftAlert).length;
      
      const stats = {
        approved: strats.filter(s => s.reviewDecisionStatus === 'approved').length,
        in_progress: strats.filter(s => s.reviewDecisionStatus === 'in_progress').length,
        pending: strats.filter(s => s.reviewDecisionStatus === 'pending').length,
        total: strats.length,
      };

      let totalCostQuote = 0;
      let totalCostTarget = 0;
      let costCalculatedStyles = 0;

      strats.forEach(s => {
        if (s.quotedCostAverage && s.targetCostBand && !s.costDriftAlert?.includes("无数据")) {
          const parts = s.targetCostBand.split('-');
          const maxTarget = parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
          if (!isNaN(maxTarget) && !isNaN(s.quotedCostAverage)) {
            totalCostQuote += s.quotedCostAverage;
            totalCostTarget += maxTarget;
            costCalculatedStyles++;
          }
        }
      });

      let costSurplusPercent = 0;
      let avgQuote = 0;
      let avgTarget = 0;
      if (costCalculatedStyles > 0 && totalCostTarget > 0) {
        avgQuote = Math.round(totalCostQuote / costCalculatedStyles);
        avgTarget = Math.round(totalCostTarget / costCalculatedStyles);
        costSurplusPercent = ((totalCostQuote - totalCostTarget) / totalCostTarget) * 100;
      }
      
      // Color coding
      const colorMap: Record<string, 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'indigo'> = {
        'W1': 'emerald',
        'W2': 'amber',
        'W3': 'blue',
        'W4': 'purple',
        'W5': 'rose',
        'W6': 'indigo'
      };
      const themeTone = colorMap[wave] || 'slate';

      return {
        wave,
        strategies: strats,
        skuTotal,
        alertCount,
        stats,
        avgQuote,
        avgTarget,
        costSurplusPercent,
        themeTone,
      };
    });
  }, [strategies]);

  const [activeWave, setActiveWave] = useState<string | null>(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const focusedGroup = useMemo(() => {
    return activeWave ? waveGroups.find(g => g.wave === activeWave) : null;
  }, [waveGroups, activeWave]);

  useEffect(() => {
    if (activeWave) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeWave]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveWave(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="space-y-12">
      {waveGroups.length > 0 && (
        <div className="relative flex items-start gap-8 xl:gap-12">
          {/* 左侧主要波段抽屉区 (Main Left Timeline) */}
          <div className="flex-1 min-w-0 pb-24">
            <div className="mb-10">
              <h2 className="text-[28px] font-black text-slate-950 tracking-tight">主题与系列策略</h2>
              <p className="mt-2 text-sm text-slate-500 font-medium">从系列角色、目标人群、使用场景、材料颜色和底楦方向统一判断本季主题策略。</p>
            </div>
            {waveGroups.map((group) => {
              // Determine Tone Colors
              const toneBg = group.themeTone === 'emerald' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                             group.themeTone === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                             group.themeTone === 'blue' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                             group.themeTone === 'purple' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                             group.themeTone === 'rose' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                             group.themeTone === 'indigo' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                             'bg-slate-50 text-slate-800 border-slate-200';
              
              const toneDot = group.themeTone === 'emerald' ? 'bg-emerald-500' :
                              group.themeTone === 'amber' ? 'bg-amber-500' :
                              group.themeTone === 'blue' ? 'bg-blue-500' :
                              group.themeTone === 'purple' ? 'bg-purple-500' :
                              group.themeTone === 'rose' ? 'bg-rose-500' :
                              group.themeTone === 'indigo' ? 'bg-indigo-500' :
                              'bg-slate-500';

              return (
                <div key={group.wave} id={`wave-${group.wave}`} className="relative transition-all duration-300 ease-in-out scroll-mt-24 mb-6">
                  {/* 波段司令台 Header (Always Collapsed in Global View) */}
                  <div 
                     className="sticky top-[80px] z-30 -mx-6 px-6 lg:mx-0 lg:px-0 cursor-pointer"
                     onDoubleClick={() => setActiveWave(group.wave)}
                  >
                    <div className="flex items-stretch overflow-hidden bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 rounded-[20px] ring-1 ring-slate-200/60 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
                      {/* Color Accent Bar */}
                      <div className={`w-3 flex-shrink-0 ${toneBg.replace('text-', 'bg-').replace('border-', '')} opacity-80`} />
                      
                      {/* Contents */}
                      <div className="flex flex-1 items-center justify-between p-5 pr-6">
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">{group.wave} 波段</h3>
                              <span className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-widest ${toneBg}`}>
                                核心主推盘
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-4 text-[13px] font-medium text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                包含 {group.strategies.length} 个系列 / 共 {group.skuTotal} 款式
                              </span>
                            </div>
                          </div>
                          
                          {/* Cost Penetration Dashboard */}
                          {group.avgTarget > 0 && (
                            <div className="hidden h-10 w-px bg-slate-200 md:block" />
                          )}
                          {group.avgTarget > 0 && (
                            <div className="hidden flex-col items-start md:flex w-[160px]">
                              <div className="flex w-full justify-between items-end mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">成本进度</span>
                                {group.costSurplusPercent > 1 && (
                                  <span className="text-[10px] font-bold text-rose-600">超额 {group.costSurplusPercent.toFixed(1)}%</span>
                                )}
                              </div>
                              <div className="w-full h-1.5 bg-slate-100/80 rounded-full overflow-hidden relative ring-1 ring-inset ring-slate-200/50">
                                <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${group.costSurplusPercent > 1 ? 'bg-rose-500' : 'bg-emerald-400'}`} style={{ width: `${Math.min((group.avgQuote / group.avgTarget) * 100, 100)}%` }}></div>
                                {group.costSurplusPercent > 1 && (
                                   <div className="absolute right-0 top-0 h-full w-[10%] bg-rose-600"></div>
                                )}
                              </div>
                              <div className="flex w-full justify-between items-center mt-1.5">
                                <span className={`text-[11px] font-extrabold ${group.costSurplusPercent > 1 ? 'text-rose-600' : 'text-slate-700'}`}>¥{group.avgQuote}</span>
                                <span className="text-[10px] text-slate-400 font-medium">额度 ¥{group.avgTarget}</span>
                              </div>
                            </div>
                          )}

                          {/* Radar Stats */}
                          <div className="hidden h-10 w-px bg-slate-200 xl:block" />
                          <div className="hidden flex-col items-start xl:flex w-[180px]">
                            <div className="flex w-full justify-between items-end mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">状态分布</span>
                            </div>
                            <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-slate-100 ring-1 ring-inset ring-slate-200/50">
                               <div className="h-full bg-emerald-400 transition-all duration-1000" title="已定案" style={{ width: `${(group.stats.approved / group.stats.total) * 100}%` }}></div>
                               <div className="h-full bg-amber-400 transition-all duration-1000" title="需修改" style={{ width: `${(group.stats.in_progress / group.stats.total) * 100}%` }}></div>
                               <div className="h-full bg-slate-300 transition-all duration-1000" title="待评审" style={{ width: `${(group.stats.pending / group.stats.total) * 100}%` }}></div>
                            </div>
                            <div className="flex w-full justify-between items-center mt-1.5 text-[9px] font-bold text-slate-500">
                               <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{group.stats.approved} 定案</span>
                               <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>{group.stats.in_progress} 退回</span>
                               <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{group.stats.pending} 待审</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <button className="group hidden items-center justify-center rounded-xl bg-slate-50 p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 sm:flex" title={`导出 ${group.wave} 企划案`} onClick={(e) => e.stopPropagation()}>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveWave(group.wave);
                            }}
                            className="group flex flex-col items-center justify-center rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-[#1e1b4b] hover:text-white hover:shadow-lg transition-all"
                            title="进入全屏沉浸审查"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 右侧树状电梯 (Tree-View Minimap) - 仅大屏显示 */}
          <div className={`sticky top-[80px] hidden flex-shrink-0 xl:flex flex-col xl:self-start transition-all duration-500 ease-in-out ${isNavCollapsed ? 'w-12 items-end' : 'w-72'}`}>
            {isNavCollapsed ? (
              <button 
                onClick={() => setIsNavCollapsed(false)}
                className="group flex h-12 w-12 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all duration-300"
                title="展开控制台导航"
              >
                <svg className="h-5 w-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              </button>
            ) : (
              <div className="w-full relative shadow-[0_12px_40px_rgba(15,23,42,0.04)] bg-white/70 backdrop-blur-2xl rounded-[24px] p-5 border border-slate-100 ring-1 ring-white/50">
                <div className="mb-6 flex items-center justify-between">
                  <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    控制台导航
                  </h5>
                  <div className="flex items-center gap-2">
                     <button onClick={() => setActiveWave(null)} className={`text-[10px] font-bold transition-colors ${!activeWave ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="返回大盘视图">大盘</button>
                     <span className="text-slate-200">|</span>
                     <button onClick={() => setIsNavCollapsed(true)} className="group flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors" title="收起控制台">
                        <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                     </button>
                  </div>
                </div>
                
                <nav className="relative flex flex-col space-y-5">
                  {waveGroups.map(group => {
                    const textTone = group.themeTone === 'emerald' ? 'text-emerald-600' :
                                   group.themeTone === 'amber' ? 'text-amber-600' :
                                   group.themeTone === 'blue' ? 'text-blue-600' :
                                   group.themeTone === 'purple' ? 'text-purple-600' :
                                   group.themeTone === 'rose' ? 'text-rose-600' :
                                   group.themeTone === 'indigo' ? 'text-indigo-600' :
                                   'text-slate-600';
                                   
                    return (
                      <div key={`tree-${group.wave}`} className="flex flex-col">
                        {/* Folder Header */}
                        <button 
                          onClick={() => {
                            if (activeWave !== group.wave) setActiveWave(group.wave);
                            setTimeout(() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 50);
                          }}
                          className={`group flex items-center gap-2 text-left mb-2 px-2 py-1.5 rounded-lg transition-colors ${activeWave === group.wave ? 'bg-indigo-50/80' : 'hover:bg-slate-50'}`}
                        >
                          <svg className={`h-4 w-4 transition-colors ${textTone}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          <span className={`text-sm font-extrabold transition-colors ${textTone}`}>{group.wave} 包含 {group.strategies.length} 个系列</span>
                        </button>
                        
                        {/* Series Tree Nodes (Only show fully when active) */}
                        {(activeWave === group.wave || !activeWave) && (
                          <div className="relative flex flex-col pl-2 ml-3.5 border-l-2 border-slate-100/80 space-y-1">
                            {group.strategies.map(record => {
                              const hasAlert = !!record.costDriftAlert;
                              const status = record.reviewDecisionStatus;
                              return (
                                <button
                                  key={`tree-node-${record.seriesId}`}
                                  onClick={() => {
                                    if (activeWave !== group.wave) setActiveWave(group.wave);
                                    setTimeout(() => {
                                      const el = document.getElementById(`series-${record.seriesId}`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                  }}
                                  className="group flex flex-col items-start py-1.5 pl-3 pr-2 text-left hover:bg-white rounded-r-lg border-l-2 -ml-[2px] border-transparent hover:border-indigo-400 hover:shadow-sm transition-all"
                                >
                                <div className="flex items-center justify-between w-full">
                                  <span className={`text-[12px] font-bold truncate pr-2 ${hasAlert ? 'text-rose-500' : 'text-slate-600 group-hover:text-slate-900'}`}>{record.seriesName}</span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {hasAlert && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" title="成本预警" />}
                                    {status === 'in_progress' ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="修改中" /> : 
                                     status === 'approved' ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="已定案" /> : null}
                                  </div>
                                </div>
                                <span className="text-[9px] font-medium text-slate-400 tracking-wider">SKU: {record.skuTarget}</span>
                              </button>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
                
                <div className="mt-8 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">💡 操作提示</div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    波段按设定季度流转，多级横幅具备 <span className="text-slate-700 font-bold border-b border-indigo-200">物理推叠</span> 响应。<br/>
                    带红点项建议<span className="text-rose-500 font-bold">优先决策</span>成本阻断点。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 全屏沉浸式钻取视图 (Full Screen Drill-Down Modal) */}
      {activeWave && focusedGroup && (
        <div className="fixed inset-0 z-[150] bg-slate-50/95 backdrop-blur-3xl overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Modal Header */}
          <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-200/80 shadow-sm flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-8">
               <div className="flex items-center gap-4">
                 <div className="h-12 w-3 rounded-full bg-indigo-500" />
                 <div>
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight">{focusedGroup.wave} 沉浸审查</h1>
                   <div className="mt-1 flex items-center gap-4 text-sm font-bold text-slate-500">
                     <span>包含 {focusedGroup.strategies.length} 个系列</span>
                     <span>|</span>
                     <span>共 {focusedGroup.skuTotal} 个 SKU</span>
                   </div>
                 </div>
               </div>
               
               {/* Context Stats Summary */}
               {focusedGroup.avgTarget > 0 && (
                 <div className="pl-6 ml-2 border-l border-slate-200 hidden md:flex min-w-[200px]">
                   <div className="flex flex-col w-full">
                     <div className="flex justify-between items-center mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                       成本大盘 
                       {focusedGroup.costSurplusPercent > 1 && <span className="text-rose-500 bg-rose-50 px-1.5 rounded-sm">超额 {(focusedGroup.costSurplusPercent - 1).toFixed(1)}%</span>}
                     </div>
                     <span className={`text-xl font-extrabold flex items-baseline gap-1 ${focusedGroup.costSurplusPercent > 1 ? 'text-rose-600' : 'text-slate-800'}`}>
                        <span className="text-sm">¥</span>{focusedGroup.avgQuote} <span className="text-sm font-medium text-slate-400 ml-1">/ {focusedGroup.avgTarget} 额度</span>
                     </span>
                   </div>
                 </div>
               )}
            </div>

            <button 
              onClick={() => setActiveWave(null)} 
              className="group flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-colors px-5 py-3 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)] hover:shadow-none"
            >
               <span className="text-sm font-bold opacity-80 group-hover:opacity-100">退出沉浸模式 (Esc)</span>
               <svg className="h-6 w-6 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Modal Main Content Container */}
          <div className="flex-1 w-full max-w-[1800px] mx-auto p-8 xl:px-12 xl:py-24 pb-32">
             <div className="flex flex-col gap-28 xl:gap-36">
               {focusedGroup.strategies.map((record, index) => (
                 <div key={`modal-series-${record.seriesId}`} id={`series-${record.seriesId}`} className="relative scroll-mt-[140px] animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both" style={{ animationDelay: `${index * 150}ms` }}>
                   
                   {/* 大号编辑级系列分割线 (Editorial Separator) */}
                   <div className="absolute -top-14 xl:-top-20 left-0 right-0 flex items-center gap-6">
                     <span className="text-6xl xl:text-7xl font-black italic tracking-tighter text-slate-200/50 pointer-events-none select-none">
                       {(index + 1).toString().padStart(2, '0')}
                     </span>
                     <div className="flex flex-col gap-2 w-full mt-2">
                       <h6 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Series Breakdown</h6>
                       <div className="h-[1px] w-full bg-gradient-to-r from-slate-200 via-slate-200/40 to-transparent"></div>
                     </div>
                   </div>

                   <StrategyCard record={record} />
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}








