'use client';

import { useMemo, useState } from 'react';
import type { ArchitectureSummary, DesignReviewOverview } from '@/lib/design-review-center/types';

/* ──────────────────────────────────────────────────────────────
   健康度公式与维度接口
   ────────────────────────────────────────────────────────────── */
interface HealthDimension {
  key: string;
  label: string;
  weight: number;
  score: number;
  alert: string | null;
  status: 'good' | 'warn' | 'danger';
}

interface SeasonHealthCardProps {
  overview: DesignReviewOverview;
}

function newToolingScore(rate: number, limit: number): number {
  if (rate <= limit) return 1;
  const maxOver = 0.35; // 超过limit 35% 分数归零
  if (rate >= limit + maxOver) return 0;
  return Math.max(0, 1 - (rate - limit) / maxOver);
}

function percent(v: number) {
  return `${Math.round(v * 100)}%`;
}

function getStatus(score: number): 'good' | 'warn' | 'danger' {
  if (score >= 0.8) return 'good';
  if (score >= 0.6) return 'warn';
  return 'danger';
}

function scoreColorClass(status: 'good' | 'warn' | 'danger') {
  if (status === 'good') return 'text-emerald-500';
  if (status === 'warn') return 'text-amber-500';
  return 'text-red-500';
}

function scoreColorHex(status: 'good' | 'warn' | 'danger') {
  if (status === 'good') return '#10B981';
  if (status === 'warn') return '#F59E0B';
  return '#EF4444';
}

/* ── 核心计算逻辑 ── */
function computeHealthDimensions(
  overview: DesignReviewOverview,
  arch: ArchitectureSummary | null,
  simulatedTarget: number,
  simulatedToolingLimit: number,
): HealthDimension[] {
  const activeStyles = overview.totalStyles - (overview.cancelledStyles ?? 0);
  
  // 1. 款数达成率
  const styleAchievementRate = simulatedTarget > 0 ? Math.min(activeStyles / simulatedTarget, 1) : 0;
  const styleAlert = styleAchievementRate < 0.7
    ? `缺口 ${simulatedTarget - activeStyles} 款`
    : null;

  // 2. 共用率
  const sharedRate = ((arch?.sharedOutsoleRate ?? 0) + (arch?.sharedLastRate ?? 0)) / 2;
  const sharedAlert = sharedRate < 0.5 ? `低于 50% 效率基线` : null;

  // 3. 新开模控制
  const toolingRate = arch?.newToolingRate ?? 0;
  const toolingControlScore = newToolingScore(toolingRate, simulatedToolingLimit);
  const toolingAlert = toolingRate > simulatedToolingLimit
    ? `超限 ${percent(toolingRate - simulatedToolingLimit)}`
    : null;

  // 4. 主推覆盖
  const leadStyleRate = arch?.leadStyleRate ?? overview.leadLockRate ?? 0;
  const leadAlert = leadStyleRate < 0.15 ? `偏低` : null;

  return [
    { key: 'style', label: '款数达成率', weight: 0.3, score: styleAchievementRate, alert: styleAlert, status: getStatus(styleAchievementRate) },
    { key: 'shared', label: '共底/共楦率', weight: 0.3, score: Math.min(sharedRate, 1), alert: sharedAlert, status: getStatus(Math.min(sharedRate, 1)) },
    { key: 'tooling', label: '新模控制', weight: 0.2, score: toolingControlScore, alert: toolingAlert, status: getStatus(toolingControlScore) },
    { key: 'lead', label: '主推覆盖', weight: 0.2, score: Math.min(leadStyleRate, 1), alert: leadAlert, status: getStatus(Math.min(leadStyleRate, 1)) },
  ];
}

/* ── Gauge 仪表盘 SVG ── */
function HealthGauge({ score }: { score: number }) {
  const radius = 62;
  const stroke = 10;
  const cx = 80;
  const cy = 80;
  const startAngle = 135;
  const arcSpan = 270;
  const endAngle = startAngle + arcSpan * score;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const bgStart = polarToCartesian(startAngle);
  const bgEnd = polarToCartesian(startAngle + arcSpan);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${arcSpan > 180 ? 1 : 0} 1 ${bgEnd.x} ${bgEnd.y}`;

  const fgStart = polarToCartesian(startAngle);
  const fgEnd = polarToCartesian(endAngle);
  const fgPath = `M ${fgStart.x} ${fgStart.y} A ${radius} ${radius} 0 ${arcSpan * score > 180 ? 1 : 0} 1 ${fgEnd.x} ${fgEnd.y}`;

  const status = getStatus(score);
  const color = scoreColorHex(status);

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="drop-shadow-sm">
      <defs>
        <filter id="gauge-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d={bgPath} fill="none" stroke="#E2E8F0" strokeWidth={stroke} strokeLinecap="round" />
      <path d={fgPath} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" filter="url(#gauge-glow)" style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }} />
      <text x={cx} y={cy - 2} textAnchor="middle" className="text-[36px] font-bold tracking-tight" fill="#0F172A">{Math.round(score * 100)}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="text-[12px] font-bold tracking-widest" fill={color}>{status === 'good' ? '健康' : status === 'warn' ? '关注' : '预警'}</text>
    </svg>
  );
}

/* ── 主组件 ── */
export default function SeasonHealthCard({ overview }: SeasonHealthCardProps) {
  // 仿真状态 (Simulation State)
  const defaultTarget = overview.architectureSummary?.styleTarget ?? overview.totalStyles;
  const [simTarget, setSimTarget] = useState(defaultTarget);
  const [simToolingLimit, setSimToolingLimit] = useState(0.25);

  const dimensions = useMemo(
    () => computeHealthDimensions(overview, overview.architectureSummary, simTarget, simToolingLimit),
    [overview, simTarget, simToolingLimit]
  );
  const totalScore = useMemo(() => dimensions.reduce((s, d) => s + d.score * d.weight, 0), [dimensions]);

  // 智能诊断生成
  const diagnosis = useMemo(() => {
    const issues = dimensions.filter(d => d.status !== 'good');
    if (issues.length === 0) return "当前产品架构处于极佳健康状态，资源配比合理。";
    const advices = issues.map(d => {
      if (d.key === 'tooling') return `压缩新模具立项（控制在${percent(simToolingLimit)}内）`;
      if (d.key === 'style') return `补充 ${defaultTarget - overview.totalStyles} 款设计`;
      if (d.key === 'shared') return `提升底台共用深度`;
      return `聚焦主推爆款`;
    });
    return `目前面临 ${issues.length} 项架构风险，建议重点：${advices.join('，')}。`;
  }, [dimensions, simToolingLimit, defaultTarget, overview.totalStyles]);

  return (
    <section className="drc-glass-panel rounded-[30px] p-8 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12">
        
        {/* 左侧：输入与上下文 */}
        <div className="flex flex-col">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400/80 mb-2">Season Health Lab</div>
            <h3 className="text-[28px] font-semibold text-slate-900 tracking-tight">架构健康与仿真推演</h3>
            <p className="mt-3 text-[14px] text-slate-500 leading-relaxed max-w-md">
              基于<span className="font-medium text-slate-700">款数达成、底楦共享、新模抑制、主推占比</span>的四源动态重算模型。左右拖动下方参数块进行压力前瞻测试。
            </p>
          </div>

          <div className="mt-8 space-y-7 rounded-[20px] bg-white/60 p-6 border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md">
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              What-if 仿真调节
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-600">目标验证款数 <span className="text-slate-400 font-normal ml-1">Target</span></span>
                <span className="font-mono font-bold text-slate-900">{simTarget}</span>
              </div>
              <input type="range" min={Math.max(10, defaultTarget - 50)} max={defaultTarget + 50} value={simTarget} onChange={(e) => setSimTarget(Number(e.target.value))} className="drc-slider" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-600">新开模容忍阈值 <span className="text-slate-400 font-normal ml-1">Limit</span></span>
                <span className="font-mono font-bold text-slate-900">{percent(simToolingLimit)}</span>
              </div>
              <input type="range" min="0.1" max="0.5" step="0.05" value={simToolingLimit} onChange={(e) => setSimToolingLimit(Number(e.target.value))} className="drc-slider" />
            </div>
          </div>

          {/* 智能诊断建议 */}
          <div className="mt-auto pt-8">
            <div className="flex gap-4 text-sm text-slate-700">
              <div className="bg-violet-100/50 rounded-full p-2 h-fit flex-shrink-0">
                <svg className="w-5 h-5 text-violet-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="pt-0.5">
                <strong className="font-bold text-slate-900 block mb-1.5 tracking-wide text-[13px] uppercase">AI 诊断建议</strong>
                <p className="leading-relaxed font-medium text-slate-600">{diagnosis}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：推演结果 */}
        <div className="relative rounded-[24px] bg-slate-50/60 p-8 border border-slate-200/50 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className="text-[18px] font-bold text-slate-900 tracking-tight">综合健康度评估</h4>
              <p className="text-[13px] text-slate-500 mt-1 font-medium">四大维度动态重算结果</p>
            </div>
            <div className="flex-shrink-0 -mt-4 -mr-4">
              <HealthGauge score={totalScore} />
            </div>
          </div>

          <div className="space-y-7">
            {dimensions.map(dim => (
              <div key={dim.key} className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    {dim.label}
                    {dim.status === 'good' && (
                      <svg className="w-4 h-4 text-emerald-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                    {dim.alert && (
                      <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${dim.status === 'warn' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {dim.alert}
                      </span>
                    )}
                  </span>
                  <span className={`font-mono font-bold text-lg ${scoreColorClass(dim.status)} tracking-tight`}>
                    {Math.round(dim.score * 100)}<span className="text-xs ml-[2px] opacity-60 font-sans">%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200/60 overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${dim.status === 'good' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : dim.status === 'warn' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                    style={{ width: `${dim.score * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
