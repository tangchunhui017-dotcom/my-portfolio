'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ASSET_TYPE_LABELS } from '@/config/design-review-center/labels';
import { REVIEW_CONCLUSION_MAP, RISK_LEVEL_MAP, STAGE_MAP } from '@/config/design-review-center/status-map';
import type { DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type {
  DesignVersionChain,
  DesignVersionEntry,
  VersionDecisionStatus,
} from '@/lib/design-review-center/selectors/assets';
import {
  buildColorwayMatrix,
  buildDesignVsSample,
  buildSpecComparison,
  buildVersionTimeline,
} from '@/lib/design-review-center/version-preview-derivations';
import { ColorwayMatrix } from './version/ColorwayMatrix';
import { DesignVsSampleCompare } from './version/DesignVsSampleCompare';
import { SpecComparisonTable } from './version/SpecComparisonTable';
import { VersionTimeline } from './version/VersionTimeline';
import FloatingModuleNav from './floating-module-nav';

// ─── Local types ─────────────────────────────────────────────────────────────

type LocalFilter =
  | 'all'
  | 'pending_review'
  | 'missing_assets'
  | 'high_risk'
  | 'passed'
  | 'revision'
  | 'frozen'
  | 'cancelled';

interface TechItem {
  label: string;
  status: 'complete' | 'pending' | 'missing' | 'na';
  note?: string;
}

interface TechGroup {
  id: string;
  groupLabel: string;
  weight: number;
  items: TechItem[];
}

interface EnhancedDiff {
  field: string;
  prevValue: string;
  currValue: string;
  reason: string;
  impactScope: string[];
  requiresReReview: boolean;
  department: string;
}

interface MerchDim {
  id: string;
  label: string;
  currentJudgment: string;
  status: 'pass' | 'warning' | 'fail' | 'unknown';
  riskLevel: 'low' | 'medium' | 'high';
  deviation: string;
  recommendedAction: string;
}

interface SubmitCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string | null;
}

interface DecisionAct {
  id: string;
  label: string;
  desc: string;
  href: string;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: LocalFilter; label: string }[] = [
  { key: 'all',            label: '全部' },
  { key: 'pending_review', label: '待评审' },
  { key: 'missing_assets', label: '资料缺失' },
  { key: 'high_risk',      label: '高风险/阻塞' },
  { key: 'passed',         label: '已通过' },
  { key: 'revision',       label: '待修改' },
  { key: 'frozen',         label: '已冻结' },
  { key: 'cancelled',      label: '已取消' },
];

const DECISION_STATUS_META: Record<VersionDecisionStatus, { label: string; color: string; bg: string; border: string }> = {
  ready_for_review:  { label: '可提交评审', color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-300' },
  missing_assets:    { label: '资料缺失',   color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-300' },
  revision_required: { label: '待修改',     color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-300' },
  blocked:           { label: '阻塞',       color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-300' },
  approved:          { label: '已通过',     color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-300' },
  frozen:            { label: '已冻结',     color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-300' },
  rejected:          { label: '已驳回',     color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-300' },
};

const TECH_STATUS_STYLE = {
  complete: { icon: '✓', text: 'text-emerald-600', bg: 'bg-emerald-50',  badge: 'bg-emerald-100 text-emerald-700' },
  pending:  { icon: '○', text: 'text-amber-600',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700' },
  missing:  { icon: '✗', text: 'text-rose-600',    bg: 'bg-rose-50',    badge: 'bg-rose-100 text-rose-700' },
  na:       { icon: '—', text: 'text-slate-400',   bg: 'bg-slate-50',   badge: 'bg-slate-100 text-slate-500' },
};

const MERCH_STATUS_STYLE = {
  pass:    { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: '匹配' },
  warning: { dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',     label: '预警' },
  fail:    { dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-700',       label: '不匹配' },
  unknown: { dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-500',     label: '待核查' },
};

const ACTION_STYLE = {
  primary:   'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger:    'bg-rose-600 text-white hover:bg-rose-700',
  ghost:     'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent',
};

const IMPACT_SCOPE_COLOR: Record<string, string> = {
  '外观': 'bg-sky-100 text-sky-700',
  '材料': 'bg-violet-100 text-violet-700',
  '成本': 'bg-amber-100 text-amber-700',
  '开模': 'bg-rose-100 text-rose-700',
  '交期': 'bg-orange-100 text-orange-700',
  '上市': 'bg-pink-100 text-pink-700',
  '毛利': 'bg-amber-100 text-amber-800',
  '供应商': 'bg-teal-100 text-teal-700',
};

const VP_MODULE_LINKS: DesignPlanningRelatedModuleLink[] = [
  { linkId: 'vp-overview',  label: '设计企划总览',  description: '季度健康度与关键决策',     actionLabel: '查看总览',     relatedRoute: '/design-review-center?tab=overview',              category: 'internal', icon: '📊' },
  { linkId: 'vp-theme',     label: '主题与系列策略', description: '系列方向与设计语言',       actionLabel: '查看主题',     relatedRoute: '/design-review-center?tab=themeStrategy',         category: 'internal', icon: '🎨' },
  { linkId: 'vp-arch',      label: '产品架构',      description: '品类 / 系列 / 款型架构',   actionLabel: '查看架构',     relatedRoute: '/design-review-center?tab=productArchitecture',   category: 'internal', icon: '🧱' },
  { linkId: 'vp-dev-pool',  label: '开发任务池',    description: '单款设计 brief 与下发',    actionLabel: '查看任务',     relatedRoute: '/design-review-center?tab=developmentTaskPool',   category: 'internal', icon: '📁' },
  { linkId: 'vp-gate',      label: '波段研发节点',  description: '波段节点跟踪',             actionLabel: '查看节点',    relatedRoute: '/design-review-center?tab=developmentGateTable',  category: 'internal', icon: '🗓️' },
  { linkId: 'vp-review',    label: '评审决议',  description: '决议与动作闭环',           actionLabel: '查看评审',     relatedRoute: '/design-review-center?tab=reviewDecisionCenter',  category: 'internal', icon: '✅' },
];

const VP_PAGE_SECTIONS = [
  { anchor: '#vp-overview',      label: '版本决策总览',  icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" /><rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.7" /><rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" /></svg> },
  { anchor: '#vp-visual',        label: '主视觉对比',    icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="14" rx="1" /><rect x="9" y="1" width="6" height="14" rx="1" /></svg> },
  { anchor: '#vp-timeline',      label: '版本时间线',    icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="8" x2="15" y2="8" /><circle cx="4" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" /></svg> },
  { anchor: '#vp-design-sample', label: '设计vs实物',    icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="14" rx="1" /><rect x="9" y="1" width="6" height="14" rx="1" /><line x1="7.5" y1="8" x2="8.5" y2="8" /></svg> },
  { anchor: '#vp-colorways',     label: '配色矩阵',      icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="5" r="3" /><circle cx="11" cy="5" r="3" /><circle cx="5" cy="11" r="3" /><circle cx="11" cy="11" r="3" /></svg> },
  { anchor: '#vp-specs',         label: '参数对比',      icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="4" x2="15" y2="4" /><line x1="1" y1="8" x2="15" y2="8" /><line x1="1" y1="12" x2="15" y2="12" /><line x1="5" y1="1" x2="5" y2="15" /></svg> },
  { anchor: '#vp-tech',          label: '技术完整度',    icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,8 6,12 14,4" /></svg> },
  { anchor: '#vp-merch',         label: '商品企划校验',  icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="14" height="14" rx="2" /><line x1="5" y1="5" x2="11" y2="5" /><line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="11" x2="9" y2="11" /></svg> },
  { anchor: '#vp-submit-action', label: '提交 + 决策',   icon: <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg> },
];

const REAL_VISUAL_ASSET_TYPES = new Set([
  'effect_render',
  'rendering',
  'first_sample_photo',
  'second_sample_photo',
  'final_sample_photo',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPlaceholderImageUrl(imageUrl: string | null | undefined): boolean {
  const normalized = imageUrl?.trim();
  return !normalized || normalized.endsWith('.svg') || normalized.includes('placeholder');
}

function getVersionPackageCount(chain: DesignVersionChain): number {
  return new Set(chain.versions.map((version) => version.versionNumber)).size;
}

function hasRealVisualAsset(chain: DesignVersionChain): boolean {
  const versionNumber = chain.latestVersion?.versionNumber;
  if (!versionNumber) return false;
  return chain.versions.some((version) => (
    version.versionNumber === versionNumber
    && REAL_VISUAL_ASSET_TYPES.has(version.assetType)
    && !isPlaceholderImageUrl(version.imageUrl)
  ));
}

function hasRealAsset(chain: DesignVersionChain, assetType: string): boolean {
  return chain.versions.some((version) => version.assetType === assetType && !isPlaceholderImageUrl(version.imageUrl));
}

function filterChains(chains: DesignVersionChain[], f: LocalFilter): DesignVersionChain[] {
  switch (f) {
    case 'pending_review': return chains.filter((c) => !c.reviewConclusion || c.reviewConclusion === 'next_round');
    case 'missing_assets': return chains.filter((c) => c.missingRequiredAssets.length > 0);
    case 'high_risk':      return chains.filter((c) => c.riskLevel === 'high' || c.riskLevel === 'blocking' || c.blocked);
    case 'passed':         return chains.filter((c) => c.reviewConclusion === 'pass' || c.reviewConclusion === 'pass_with_changes');
    case 'revision':       return chains.filter((c) => c.versionDecisionStatus === 'revision_required');
    case 'frozen':         return chains.filter((c) => c.versionDecisionStatus === 'frozen');
    case 'cancelled':      return chains.filter((c) => c.versionDecisionStatus === 'rejected');
    default:               return chains;
  }
}

function buildTechGroups(chain: DesignVersionChain): TechGroup[] {
  const lv = chain.latestVersion;
  const hasAsset = (t: string) => chain.versions.some((v) => v.assetType === t);
  const hasRealVisual = hasRealVisualAsset(chain);

  return [
    {
      id: 'visual', groupLabel: '视觉资料', weight: 15,
      items: [
        { label: '概念草图',  status: hasAsset('concept_sketch') ? 'complete' : 'pending' },
        { label: '效果图/样鞋图', status: hasRealVisual ? 'complete' : 'missing', note: hasRealVisual ? undefined : '评审必备，请上传真实效果图或样鞋照片' },
        { label: '配色板',    status: hasAsset('color_board') ? 'complete' : (lv?.colorPlan.length ?? 0) > 0 ? 'pending' : 'missing' },
        { label: '材料板',    status: hasAsset('material_board') ? 'complete' : (lv?.materialPlan.length ?? 0) > 0 ? 'pending' : 'missing' },
      ],
    },
    {
      id: 'dev', groupLabel: '开发资料', weight: 20,
      items: [
        { label: '底台图', status: hasAsset('outsole_board') ? 'complete' : lv?.outsole ? 'pending' : 'missing', note: !lv?.outsole && !hasAsset('outsole_board') ? '底台信息缺失，可能影响开模决策' : undefined },
        { label: '楦型图', status: hasAsset('last_board') ? 'complete' : lv?.last ? 'pending' : 'missing' },
        { label: '结构说明', status: 'pending', note: '待设计师补充' },
        { label: 'Tech Pack', status: 'pending', note: '开发阶段需提供' },
      ],
    },
    {
      id: 'cost', groupLabel: '成本资料', weight: 20,
      items: [
        { label: '目标成本', status: lv?.targetCost !== null && lv?.targetCost !== undefined ? 'complete' : 'missing', note: !lv?.targetCost ? '请与商品企划确认目标成本' : undefined },
        { label: '报价成本', status: 'pending', note: '待工厂报价后填写' },
        { label: 'BOM 清单', status: (lv?.materialPlan.length ?? 0) > 0 && lv?.outsole ? 'pending' : 'missing' },
      ],
    },
    {
      id: 'sample', groupLabel: '样品资料', weight: 20,
      items: [
        { label: '首样照片', status: hasRealAsset(chain, 'first_sample_photo') ? 'complete' : 'pending' },
        { label: '二样照片', status: hasRealAsset(chain, 'second_sample_photo') ? 'complete' : 'pending' },
        { label: '试穿反馈', status: 'pending' },
        { label: '测试报告', status: 'pending', note: '耐磨/防滑/色牢度' },
      ],
    },
    {
      id: 'launch', groupLabel: '上市资料', weight: 10,
      items: [
        { label: '定样图',   status: hasRealAsset(chain, 'final_sample_photo') ? 'complete' : 'pending' },
        { label: '拍摄样',   status: 'pending' },
        { label: '吊牌/包装', status: 'pending' },
      ],
    },
  ];
}

function buildEnhancedDiff(curr: DesignVersionEntry, prev: DesignVersionEntry | null): EnhancedDiff[] {
  if (!prev) return [];
  const diffs: EnhancedDiff[] = [];

  const currMat = curr.materialPlan.join(' / ');
  const prevMat = prev.materialPlan.join(' / ');
  if (currMat !== prevMat) diffs.push({
    field: '材料方案', prevValue: prevMat || '—', currValue: currMat || '—',
    reason: '材料成本/外观/功能调整', impactScope: ['外观', '材料', '成本', '供应商'],
    requiresReReview: true, department: '设计 / 材料开发',
  });

  const currColor = curr.colorPlan.join(' / ');
  const prevColor = prev.colorPlan.join(' / ');
  if (currColor !== prevColor) diffs.push({
    field: '配色方案', prevValue: prevColor || '—', currValue: currColor || '—',
    reason: '配色调整或客群对应', impactScope: ['外观'],
    requiresReReview: false, department: '设计',
  });

  if (curr.outsole !== prev.outsole) diffs.push({
    field: '底台', prevValue: prev.outsole || '—', currValue: curr.outsole || '—',
    reason: '底型/外观/成本调整', impactScope: ['外观', '成本', '开模', '交期'],
    requiresReReview: true, department: '设计 / 开发',
  });

  if (curr.last !== prev.last) diffs.push({
    field: '楦型', prevValue: prev.last || '—', currValue: curr.last || '—',
    reason: '版型/舒适性调整', impactScope: ['材料', '成本', '开模'],
    requiresReReview: true, department: '开发 / 品控',
  });

  if (curr.targetCost !== null && prev.targetCost !== null && curr.targetCost !== prev.targetCost) diffs.push({
    field: '目标成本',
    prevValue: `¥${prev.targetCost}`,
    currValue: `¥${curr.targetCost}`,
    reason: '结构/材料变化引起成本变动',
    impactScope: ['成本', '毛利', '上市'],
    requiresReReview: true, department: '商品企划 / 财务',
  });

  if (curr.currentStage !== prev.currentStage) diffs.push({
    field: '开发阶段',
    prevValue: STAGE_MAP[prev.currentStage]?.label ?? prev.currentStage,
    currValue: STAGE_MAP[curr.currentStage]?.label ?? curr.currentStage,
    reason: '版本推进阶段更新', impactScope: ['交期'],
    requiresReReview: false, department: '开发',
  });

  return diffs;
}

function buildMerchDimensions(chain: DesignVersionChain): MerchDim[] {
  const blocked  = chain.blocked;
  const high     = chain.riskLevel === 'high' || chain.riskLevel === 'blocking';
  const costDown = chain.reviewConclusion === 'cost_down';
  const struct   = chain.reviewConclusion === 'structure_adjust';
  const matRework = chain.reviewConclusion === 'material_rework';
  const cancelled = chain.reviewConclusion === 'cancel';

  return [
    {
      id: 'brandDna', label: '品牌 DNA 匹配',
      currentJudgment: cancelled ? '版本已驳回' : blocked ? '阻塞中，品牌方向待确认' : '与品牌DNA方向一致',
      status: cancelled ? 'fail' : blocked ? 'warning' : 'pass',
      riskLevel: cancelled ? 'high' : blocked ? 'medium' : 'low',
      deviation: cancelled ? '版本驳回，品牌DNA合规性待重审' : blocked ? '阻塞未解除，品牌委员会待确认' : '无偏差',
      recommendedAction: cancelled ? '重新校准品牌DNA，对照品牌定位重新设计' : blocked ? '提交品牌委员会审核' : '保持当前方向',
    },
    {
      id: 'consumerFit', label: '目标客群匹配',
      currentJudgment: high ? '目标客群匹配存在争议' : '客群画像匹配',
      status: high ? 'warning' : 'pass',
      riskLevel: high ? 'medium' : 'low',
      deviation: high ? '高风险款，目标人群画像有争议' : '与目标客群画像一致',
      recommendedAction: high ? '召开消费者研究会议，对齐设计方向' : '继续推进',
    },
    {
      id: 'seriesRole', label: '系列角色匹配',
      currentJudgment: `当前系列: ${chain.seriesName}`,
      status: struct ? 'warning' : 'pass',
      riskLevel: struct ? 'medium' : 'low',
      deviation: struct ? '结构调整可能影响系列主推/形象/基础款定位' : '系列角色明确',
      recommendedAction: struct ? '与商品企划确认系列角色是否变更' : '按原计划推进',
    },
    {
      id: 'categoryFit', label: '品类定位匹配',
      currentJudgment: `${chain.categoryName} 品类`,
      status: struct ? 'warning' : 'pass',
      riskLevel: struct ? 'medium' : 'low',
      deviation: struct ? '结构调整影响品类定位' : '品类定位一致',
      recommendedAction: struct ? '评估结构调整对品类定位的影响' : '保持当前方向',
    },
    {
      id: 'waveFit', label: '波段任务匹配',
      currentJudgment: `${chain.waveId.toUpperCase()} 波段`,
      status: blocked ? 'fail' : 'pass',
      riskLevel: blocked ? 'high' : 'low',
      deviation: blocked ? '阻塞项影响波段上市节点，需立即处理' : '符合波段任务',
      recommendedAction: blocked ? '立即解除阻塞，重新评估上市排期' : '按节点推进',
    },
    {
      id: 'priceBand', label: '价格带匹配',
      currentJudgment: costDown ? '可能触发价格带偏离' : '价格带匹配',
      status: costDown ? 'warning' : 'pass',
      riskLevel: costDown ? 'medium' : 'low',
      deviation: costDown ? '成本超标可能影响零售定价策略' : '零售定价符合目标价格带',
      recommendedAction: costDown ? '确认降本方案对零售价格的影响' : '按目标价格带推进',
    },
    {
      id: 'costGross', label: '目标成本/毛利匹配',
      currentJudgment: costDown ? `目标成本 ¥${chain.targetCost ?? '—'} 超标` : chain.targetCost ? `目标成本 ¥${chain.targetCost}，在控` : '目标成本待补充',
      status: costDown ? 'fail' : chain.targetCost !== null ? 'pass' : 'unknown',
      riskLevel: costDown ? 'high' : 'low',
      deviation: costDown ? '成本超出目标带，需降本以保护毛利' : chain.targetCost !== null ? `目标成本 ¥${chain.targetCost}，在预算内` : '目标成本未设置',
      recommendedAction: costDown ? '提交成本重审，明确降本路径（换料/改结构/调毛利）' : '按目标成本推进',
    },
    {
      id: 'otb', label: 'OTB 约束匹配',
      currentJudgment: costDown ? 'OTB 预算预警' : 'OTB 约束正常',
      status: costDown ? 'warning' : 'pass',
      riskLevel: costDown ? 'medium' : 'low',
      deviation: costDown ? '成本超标可能触发OTB预算预警' : 'OTB约束正常',
      recommendedAction: costDown ? '同步OTB负责人，重新测算OTB影响' : '按预算推进',
    },
    {
      id: 'channel', label: '渠道适配度',
      currentJudgment: high ? '渠道适配性待评估' : '渠道匹配',
      status: high ? 'warning' : 'pass',
      riskLevel: high ? 'medium' : 'low',
      deviation: high ? '高风险款需评估渠道适配性' : '渠道适配度良好',
      recommendedAction: high ? '明确线上/线下/特殊渠道分配策略' : '按渠道策略推进',
    },
    {
      id: 'trend', label: '趋势输入匹配',
      currentJudgment: matRework ? '材料方向调整可能影响趋势呈现' : cancelled ? '版本已驳回' : '与趋势方向一致',
      status: matRework ? 'warning' : cancelled ? 'fail' : 'pass',
      riskLevel: matRework ? 'medium' : 'low',
      deviation: matRework ? '材料调整可能影响趋势呈现效果' : '与当季趋势研究输入一致',
      recommendedAction: matRework ? '对照趋势研究确认替代材料方向' : '继续推进',
    },
  ];
}

function buildSubmitCheck(chain: DesignVersionChain): { items: SubmitCheckItem[]; verdict: 'can_submit' | 'needs_data' | 'must_not_submit' } {
  const lv = chain.latestVersion;
  const hasRealVisual = hasRealVisualAsset(chain);
  const versionCount = getVersionPackageCount(chain);
  const items: SubmitCheckItem[] = [
    {
      id: 'has-version', label: '最新版本存在',
      status: lv ? 'pass' : 'fail',
      detail: lv ? null : '请先上传设计版本资产',
    },
    {
      id: 'has-image', label: '效果图/样鞋图已上传',
      status: hasRealVisual ? 'pass' : 'fail',
      detail: hasRealVisual ? null : '请上传最新真实效果图或样鞋照片（评审必备，占位图不计入完成）',
    },
    {
      id: 'has-material', label: '材料方案完整',
      status: (lv?.materialPlan.length ?? 0) > 0 ? 'pass' : 'warn',
      detail: (lv?.materialPlan.length ?? 0) > 0 ? null : '补充材料方案（主料/里料/底材）',
    },
    {
      id: 'has-color', label: '配色方案完整',
      status: (lv?.colorPlan.length ?? 0) > 0 ? 'pass' : 'warn',
      detail: (lv?.colorPlan.length ?? 0) > 0 ? null : '补充配色方案',
    },
    {
      id: 'has-outsole-last', label: '底型/楦型信息完整',
      status: (lv?.outsole && lv?.last) ? 'pass' : 'warn',
      detail: (!lv?.outsole || !lv?.last) ? '补充底型和楦型信息，影响开模决策' : null,
    },
    {
      id: 'has-cost', label: '目标成本已设置',
      status: (lv?.targetCost !== null && lv?.targetCost !== undefined) ? 'pass' : 'fail',
      detail: (lv?.targetCost === null || lv?.targetCost === undefined) ? '目标成本未设置，请与商品企划确认' : null,
    },
    {
      id: 'has-delta', label: '本轮修改说明完整',
      status: (versionCount <= 1 || lv?.deltaNote) ? 'pass' : 'fail',
      detail: (!lv?.deltaNote && versionCount > 1) ? '多版本款式必须提供本轮变更说明' : null,
    },
    {
      id: 'has-conclusion', label: '已获评审结论或处于待评审状态',
      status: chain.reviewConclusion ? 'pass' : 'warn',
      detail: chain.reviewConclusion ? null : '尚未提交评审，建议提交至评审决议',
    },
    {
      id: 'blocking-clear', label: '阻塞项已说明',
      status: chain.blocked ? 'fail' : 'pass',
      detail: chain.blocked ? '请说明阻塞原因并制定解除方案' : null,
    },
  ];

  const failCount = items.filter((i) => i.status === 'fail').length;
  const warnCount = items.filter((i) => i.status === 'warn').length;
  const verdict = failCount > 0 ? 'must_not_submit' : warnCount > 1 ? 'needs_data' : 'can_submit';
  return { items, verdict };
}

function buildDecisionActions(chain: DesignVersionChain): DecisionAct[] {
  const { styleId, waveId, versionDecisionStatus: ds } = chain;
  const lvId = chain.latestVersion?.assetId ?? '';
  const isBlocked  = ds === 'blocked';
  const isRejected = ds === 'rejected';
  const isFrozen   = ds === 'frozen';
  const isApproved = ds === 'approved';

  const actions: DecisionAct[] = [
    {
      id: 'submit', label: '提交评审',
      desc: '将当前版本提交至评审决议',
      href: `/design-review-center?tab=reviewDecisionCenter&styleId=${styleId}&versionId=${lvId}`,
      variant: (!isBlocked && !isFrozen && !isRejected) ? 'primary' : 'ghost',
    },
    {
      id: 'gen-task', label: '生成开发任务',
      desc: '同步至开发任务池，分配责任人',
      href: `/design-review-center?tab=developmentTaskPool&styleId=${styleId}`,
      variant: isApproved ? 'primary' : 'secondary',
    },
    {
      id: 'feedback-merch', label: '反馈商品企划',
      desc: '将版本偏差和阻塞信息反馈至波段企划',
      href: `/dashboard?tab=planning&waveId=${waveId}&styleId=${styleId}`,
      variant: 'secondary',
    },
    {
      id: 'gate', label: '查看波段研发节点',
      desc: '查看当前波段研发节点和进度',
      href: `/design-review-center?tab=developmentGateTable&styleId=${styleId}&waveId=${waveId}`,
      variant: 'ghost',
    },
    {
      id: 'otb', label: '查看 OTB 影响',
      desc: '校准成本超标影响，查看OTB预算',
      href: `/dashboard?tab=otb&styleId=${styleId}&waveId=${waveId}`,
      variant: chain.reviewConclusion === 'cost_down' ? 'secondary' : 'ghost',
    },
    {
      id: 'freeze', label: '冻结当前版本',
      desc: '暂缓此款开发，等待方向确认',
      href: `/design-review-center?tab=reviewDecisionCenter&action=freeze&styleId=${styleId}`,
      variant: 'ghost',
    },
    {
      id: 'reject', label: '驳回并要求重提',
      desc: '驳回当前版本，触发重新上版流程',
      href: `/design-review-center?tab=reviewDecisionCenter&action=reject&styleId=${styleId}`,
      variant: 'danger',
    },
    {
      id: 'final', label: '标记为终样版本',
      desc: '将当前版本标记为终样，推进上市准备',
      href: `/design-review-center?tab=developmentTaskPool&action=final&styleId=${styleId}`,
      variant: isApproved ? 'primary' : 'secondary',
    },
  ];

  return actions.filter((a) => {
    // Hide actions that don't make sense for current state
    if (a.id === 'final' && !isApproved) return false;
    if (a.id === 'freeze' && (isFrozen || isApproved || isRejected)) return false;
    if (a.id === 'reject' && (isRejected || isFrozen)) return false;
    return true;
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  tag,
  title,
  subtitle,
  count,
}: {
  tag: string;
  title: string;
  subtitle?: string;
  count?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          {tag}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {count && <span className="shrink-0 text-xs text-slate-400">{count}</span>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
      {message}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EffectPreviewPanelProps {
  chains: DesignVersionChain[];
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function EffectPreviewPanel({ chains }: EffectPreviewPanelProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<string>(chains[0]?.styleId ?? '');
  const [localFilter, setLocalFilter] = useState<LocalFilter>('all');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const filteredChains = useMemo(() => filterChains(chains, localFilter), [chains, localFilter]);
  const effectiveSelectedStyleId = useMemo(() => {
    if (!chains.length) return '';
    return chains.some((c) => c.styleId === selectedStyleId) ? selectedStyleId : chains[0].styleId;
  }, [chains, selectedStyleId]);
  const selectedChain = useMemo(() => (
    chains.find((c) => c.styleId === effectiveSelectedStyleId) ?? null
  ), [chains, effectiveSelectedStyleId]);

  // ── Global KPIs ──
  const kpiLatest   = useMemo(() => chains.filter((c) => c.versions.some((v) => v.isLatest)).length, [chains]);
  const kpiPending  = useMemo(() => chains.filter((c) => !c.reviewConclusion || c.reviewConclusion === 'next_round').length, [chains]);
  const kpiMissing  = useMemo(() => chains.filter((c) => c.missingRequiredAssets.length > 0).length, [chains]);
  const kpiHighRisk = useMemo(() => chains.filter((c) => c.riskLevel === 'high' || c.riskLevel === 'blocking' || c.blocked).length, [chains]);
  const kpiReReview = useMemo(() => chains.filter((c) => c.reviewConclusion === 'material_rework' || c.reviewConclusion === 'next_round').length, [chains]);
  const kpiFrozen   = useMemo(() => chains.filter((c) => c.versionDecisionStatus === 'frozen').length, [chains]);
  const kpiCostHit  = useMemo(() => chains.filter((c) => c.reviewConclusion === 'cost_down' || c.changedFields.includes('outsole') || c.changedFields.includes('last')).length, [chains]);

  // ── Selected chain derived data ──
  const latestVer      = selectedChain?.latestVersion ?? null;
  const prevVer        = selectedChain?.previousVersion ?? null;
  const decisionStatus = selectedChain?.versionDecisionStatus ?? 'ready_for_review';
  const techGroups     = useMemo(() => selectedChain ? buildTechGroups(selectedChain) : [], [selectedChain]);
  const enhancedDiff   = useMemo(() => (latestVer && prevVer) ? buildEnhancedDiff(latestVer, prevVer) : [], [latestVer, prevVer]);
  const merchDims      = useMemo(() => selectedChain ? buildMerchDimensions(selectedChain) : [], [selectedChain]);
  const submitCheck    = useMemo(() => selectedChain ? buildSubmitCheck(selectedChain) : { items: [], verdict: 'needs_data' as const }, [selectedChain]);
  const decisionActs   = useMemo(() => selectedChain ? buildDecisionActions(selectedChain) : [], [selectedChain]);
  const readinessScore = selectedChain?.versionReadinessScore ?? 0;
  const selectedVersionCount = selectedChain ? getVersionPackageCount(selectedChain) : 0;

  // ── New section derivations ──
  const versionTimeline    = useMemo(() => selectedChain ? buildVersionTimeline(selectedChain) : [], [selectedChain]);
  const colorwayEntries    = useMemo(() => selectedChain ? buildColorwayMatrix(selectedChain) : [], [selectedChain]);
  const designVsSampleRows = useMemo(() => selectedChain ? buildDesignVsSample(selectedChain) : [], [selectedChain]);
  const specRows           = useMemo(() => selectedChain ? buildSpecComparison(selectedChain) : [], [selectedChain]);

  const dsMeta = DECISION_STATUS_META[decisionStatus];

  if (!chains.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下暂无设计版本资产。
      </div>
    );
  }

  return (
    <>
      {/* ── Image enlarge overlay ─────────────────────────────────────── */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setEnlargedImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={enlargedImage}
            alt="放大查看"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setEnlargedImage(null)}
            className="absolute right-6 top-6 rounded-full bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30"
          >
            关闭
          </button>
        </div>
      )}

      <div className="space-y-5">

        {/* ══ A. 版本决策总览 ══════════════════════════════════════════════════ */}
        <section id="vp-overview" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">A · 版本决策总览</div>
            <h3 className="mt-1 text-base font-semibold text-slate-950">设计版本评审工作台</h3>
          </div>

          {/* Hero KPI layout: red hero (高风险/阻塞) + 4 secondary + 2 chip */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1.5fr_3fr_2fr]">
            {/* Hero card — 高风险/阻塞 */}
            <button
              type="button"
              onClick={() => setLocalFilter('high_risk')}
              className={[
                'rounded-xl border p-4 text-left transition hover:shadow-sm col-span-1',
                localFilter === 'high_risk' ? 'border-rose-400 bg-rose-50' : 'border-rose-200 bg-rose-50/60 hover:border-rose-300',
              ].join(' ')}
            >
              <div className="text-xs font-semibold text-rose-500">高风险 / 阻塞</div>
              <div className={['mt-1 font-black tabular-nums leading-none', kpiHighRisk > 0 ? 'text-5xl text-rose-600' : 'text-4xl text-slate-300'].join(' ')}>{kpiHighRisk}</div>
              <div className="mt-1.5 text-[11px] text-rose-400">需立即处理</div>
            </button>

            {/* 4 secondary cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {([
                { label: '最新版本',  value: kpiLatest,   color: 'text-slate-900',                                         filter: 'all' as LocalFilter,            note: '含最新版' },
                { label: '待评审',    value: kpiPending,  color: kpiPending  > 0 ? 'text-amber-600' : 'text-slate-400',   filter: 'pending_review' as LocalFilter, note: '等待评审结论' },
                { label: '资料缺失',  value: kpiMissing,  color: kpiMissing  > 0 ? 'text-rose-600'  : 'text-slate-400',   filter: 'missing_assets' as LocalFilter, note: '需补充资料' },
                { label: '需复审',    value: kpiReReview, color: kpiReReview > 0 ? 'text-violet-600' : 'text-slate-400',   filter: 'revision' as LocalFilter,       note: '材料/结构' },
              ] as const).map((kpi) => (
                <button
                  key={kpi.label}
                  type="button"
                  onClick={() => setLocalFilter(kpi.filter)}
                  className={[
                    'rounded-xl border p-3 text-left transition hover:shadow-sm',
                    localFilter === kpi.filter ? 'border-slate-400 bg-slate-50' : 'border-slate-100 bg-slate-50/60 hover:border-slate-200',
                  ].join(' ')}
                >
                  <div className="text-[10px] text-slate-400">{kpi.label}</div>
                  <div className={['mt-1 text-2xl font-semibold tabular-nums', kpi.color].join(' ')}>{kpi.value}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{kpi.note}</div>
                </button>
              ))}
            </div>

            {/* 2 chip cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { label: '已冻结',        value: kpiFrozen,  color: kpiFrozen  > 0 ? 'text-slate-600' : 'text-slate-400', filter: 'frozen' as LocalFilter,   note: '等待方向确认' },
                { label: '成本/开模影响', value: kpiCostHit, color: kpiCostHit > 0 ? 'text-amber-600' : 'text-slate-400', filter: 'revision' as LocalFilter, note: '成本或开模变更' },
              ] as const).map((kpi) => (
                <button
                  key={kpi.label}
                  type="button"
                  onClick={() => setLocalFilter(kpi.filter)}
                  className={[
                    'rounded-xl border p-3 text-left transition hover:shadow-sm',
                    localFilter === kpi.filter ? 'border-slate-400 bg-slate-50' : 'border-slate-100 bg-slate-50/60 hover:border-slate-200',
                  ].join(' ')}
                >
                  <div className="text-[10px] text-slate-400">{kpi.label}</div>
                  <div className={['mt-1 text-2xl font-semibold tabular-nums', kpi.color].join(' ')}>{kpi.value}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{kpi.note}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Version conclusion bar for selected chain */}
          {selectedChain && (
            <div className={['mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', dsMeta.border, dsMeta.bg].join(' ')}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900">{selectedChain.skuCode}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-medium text-slate-800">{selectedChain.styleName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{selectedChain.seriesName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{selectedChain.waveId.toUpperCase()}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">v{selectedChain.latestVersionNumber}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={['rounded-full px-2.5 py-0.5 text-xs font-semibold', STAGE_MAP[selectedChain.currentStage].bgColor, STAGE_MAP[selectedChain.currentStage].textColor].join(' ')}>
                  {STAGE_MAP[selectedChain.currentStage].label}
                </span>
                <span className={['rounded-full px-2.5 py-0.5 text-xs font-bold', dsMeta.color, dsMeta.bg, 'border', dsMeta.border].join(' ')}>
                  {dsMeta.label}
                </span>
                <span className="text-xs text-slate-500">→ {selectedChain.recommendedNextAction}</span>
              </div>
            </div>
          )}
        </section>

        {/* ══ B+C-I. Main two-column layout ══════════════════════════════════════ */}
        <div className="grid gap-5 xl:grid-cols-[288px_1fr]">

          {/* ── B. Left: filter + chain list ──────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLocalFilter(key)}
                  className={[
                    'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                    localFilter === key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400">{filteredChains.length} / {chains.length} 款</div>

            {filteredChains.length === 0 ? (
              <EmptyState message="当前筛选无结果" />
            ) : (
              filteredChains.map((chain) => {
                const rMeta   = RISK_LEVEL_MAP[chain.riskLevel];
                const active  = chain.styleId === effectiveSelectedStyleId;
                const dStatus = chain.versionDecisionStatus;
                const dMeta   = DECISION_STATUS_META[dStatus];
                return (
                  <button
                    key={chain.styleId}
                    type="button"
                    onClick={() => setSelectedStyleId(chain.styleId)}
                    className={[
                      'w-full rounded-xl border px-4 py-3.5 text-left transition',
                      active
                        ? 'border-indigo-300 bg-indigo-50/60 text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50/30',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{chain.styleName}</div>
                        <div className={['mt-0.5 text-xs', active ? 'text-indigo-600' : 'text-slate-500'].join(' ')}>
                          {chain.skuCode}
                        </div>
                      </div>
                      <span className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        active ? `${rMeta.bgColor} ${rMeta.textColor} ring-1 ring-white` : `${rMeta.bgColor} ${rMeta.textColor}`,
                      ].join(' ')}>
                        {chain.blocked ? '阻塞' : rMeta.label}
                      </span>
                    </div>
                    <div className={['mt-2 flex flex-wrap items-center gap-x-2 text-[10px]', active ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                      <span>{chain.seriesName}</span>
                      <span>·</span>
                      <span>{chain.waveId.toUpperCase()}</span>
                      <span>·</span>
                      <span>{getVersionPackageCount(chain)} 个版本包</span>
                    </div>
                    <div className={['mt-2 flex items-center gap-1.5 text-[10px]', active ? 'text-indigo-600' : 'text-slate-500'].join(' ')}>
                      <span>v{chain.latestVersionNumber}</span>
                      <span>·</span>
                      <span>更新 {formatDate(chain.latestUpdatedAt)}</span>
                      {!active && (
                        <span className={['ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold', dMeta.bg, dMeta.color].join(' ')}>
                          {dMeta.label}
                        </span>
                      )}
                    </div>
                    {!active && chain.missingRequiredAssets.length > 0 && (
                      <div className="mt-1.5 text-[10px] text-amber-600">
                        缺: {chain.missingRequiredAssets.slice(0, 3).join(' · ')}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* ── Right: C-I sections ──────────────────────────────────────── */}
          {selectedChain ? (
            <div className="space-y-5">

              {/* ══ C. 主视觉版本对比 ═══════════ CORE ═══════════════════════════ */}
              <section id="vp-visual" className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm scroll-mt-24">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 opacity-70" />
                <div className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_0_4px_rgba(238,242,255,0.9)]" />
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 pt-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">C · 主视觉版本对比</span>
                    <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
                      最新版 vs 上一版本 — {selectedChain.styleName}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">点击图片可放大</span>
                </div>
                <div className="p-5">
                  {!latestVer ? (
                    <EmptyState message="当前款式暂无版本资产" />
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      {([latestVer, prevVer] as (DesignVersionEntry | null)[]).filter(Boolean).map((ver, idx) => {
                        const v = ver!;
                        const isLatest  = idx === 0;
                        const stageMeta = STAGE_MAP[v.currentStage];
                        const riskMeta  = RISK_LEVEL_MAP[v.riskLevel];
                        const isPlaceholder = isPlaceholderImageUrl(v.imageUrl);
                        return (
                          <article
                            key={v.assetId}
                            className={[
                              'overflow-hidden rounded-xl border bg-white',
                              isLatest ? 'border-indigo-200' : 'border-slate-200',
                            ].join(' ')}
                          >
                            {isLatest && (
                              <div className="bg-indigo-50 border-b border-indigo-100 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                ★ 当前最新版本
                              </div>
                            )}
                            {!isLatest && (
                              <div className="bg-slate-100 py-1.5 text-center text-[10px] font-medium text-slate-500">
                                上一版本 (v{v.versionNumber})
                              </div>
                            )}

                            {/* Image */}
                            <div
                              className="relative cursor-zoom-in overflow-hidden bg-slate-100"
                              style={{ aspectRatio: '3 / 2' }}
                              onClick={() => { if (!isPlaceholder) setEnlargedImage(v.imageUrl); }}
                              role={isPlaceholder ? undefined : 'button'}
                            >
                              {isPlaceholder ? (
                                <div className="flex size-full flex-col items-center justify-center gap-2 bg-slate-50">
                                  <div className="text-2xl text-slate-300">□</div>
                                  <div className="text-xs text-slate-400">待上传真实效果图 / 样鞋图</div>
                                </div>
                              ) : (
                                <img
                                  src={v.imageUrl}
                                  alt={`${selectedChain.styleName} v${v.versionNumber}`}
                                  className="size-full object-cover transition hover:scale-105"
                                />
                              )}
                              <div className="absolute bottom-2 left-2 flex gap-1">
                                <span className={['rounded px-1.5 py-0.5 text-[10px] font-semibold', stageMeta.bgColor, stageMeta.textColor].join(' ')}>
                                  {stageMeta.label}
                                </span>
                                {(v.riskLevel === 'high' || v.riskLevel === 'blocking') && (
                                  <span className={['rounded px-1.5 py-0.5 text-[10px] font-semibold', riskMeta.bgColor, riskMeta.textColor].join(' ')}>
                                    {riskMeta.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card body */}
                            <div className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    v{v.versionNumber} · {ASSET_TYPE_LABELS[v.assetType]}
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-slate-400">上传 {formatDate(v.uploadedAt)}</div>
                                </div>
                                {v.reviewConclusion ? (
                                  <span className={['shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', REVIEW_CONCLUSION_MAP[v.reviewConclusion].bgColor, REVIEW_CONCLUSION_MAP[v.reviewConclusion].textColor].join(' ')}>
                                    {REVIEW_CONCLUSION_MAP[v.reviewConclusion].label}
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">待评审</span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div>
                                  <div className="text-slate-400">材料方案</div>
                                  <div className="mt-0.5 font-medium leading-4 text-slate-900">
                                    {v.materialPlan.length > 0 ? v.materialPlan.join(' / ') : <span className="text-rose-400">未填写</span>}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-400">配色方案</div>
                                  <div className="mt-0.5 font-medium leading-4 text-slate-900">
                                    {v.colorPlan.length > 0 ? v.colorPlan.join(' / ') : <span className="text-rose-400">未填写</span>}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-400">底台</div>
                                  <div className="mt-0.5 font-medium text-slate-900">
                                    {v.outsole || <span className="text-amber-500">待确认</span>}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-400">楦型</div>
                                  <div className="mt-0.5 font-medium text-slate-900">
                                    {v.last || <span className="text-amber-500">待确认</span>}
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <div className="text-slate-400">目标成本</div>
                                  <div className="mt-0.5 font-medium text-slate-900">
                                    {v.targetCost !== null && v.targetCost !== undefined ? `¥${v.targetCost}` : <span className="text-rose-400">未设置</span>}
                                  </div>
                                </div>
                              </div>

                              {v.deltaNote ? (
                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                                  <span className="font-medium text-slate-500">变更说明：</span>{v.deltaNote}
                                </div>
                              ) : isLatest && selectedVersionCount > 1 ? (
                                <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                                  缺少本版变更说明 — 提交前必须补充
                                </div>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                  {selectedVersionCount > 1 && (
                    <p className="mt-3 text-center text-xs text-slate-400">
                      共 {selectedVersionCount} 个版本包 · 当前展示最新版与上一版
                    </p>
                  )}
                </div>
              </section>

              {/* ══ D. 版本变更影响 ═══════════════════════════════════════════════ */}
              {selectedChain.versions.length >= 2 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  tag="D"
                  title="版本变更影响"
                  subtitle={`v${selectedChain.latestVersionNumber} vs v${prevVer ? prevVer.versionNumber : '—'} — 变更字段、影响范围与责任部门`}
                  count={enhancedDiff.length > 0 ? `${enhancedDiff.length} 项变更` : undefined}
                />

                {/* Business impact badges */}
                {selectedChain.changedFields.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {selectedChain.businessImpact.visualImpact   && <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">外观影响</span>}
                    {selectedChain.businessImpact.materialImpact && <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">材料影响</span>}
                    {selectedChain.businessImpact.costImpact     && <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">成本影响</span>}
                    {selectedChain.businessImpact.toolingImpact  && <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">开模影响</span>}
                    {selectedChain.businessImpact.launchImpact   && <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">上市影响</span>}
                    {selectedChain.businessImpact.supplierImpact && <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">供应商影响</span>}
                  </div>
                )}

                {!prevVer ? (
                  <EmptyState message="仅一个版本，暂无变更记录" />
                ) : enhancedDiff.length === 0 ? (
                  <EmptyState message="与上一版本字段一致，无差异记录" />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">变更字段</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">上一版</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">当前版</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">变更原因</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">影响范围</th>
                          <th className="px-4 py-2.5 text-center font-semibold text-slate-500">需复审</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500">责任部门</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {enhancedDiff.map((d) => (
                          <tr key={d.field} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{d.field}</td>
                            <td className="px-4 py-2.5 text-slate-400 line-through">{d.prevValue}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-900">{d.currValue}</td>
                            <td className="px-4 py-2.5 text-slate-500">{d.reason}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {d.impactScope.map((s) => (
                                  <span key={s} className={['rounded px-1.5 py-0.5 text-[10px] font-semibold', IMPACT_SCOPE_COLOR[s] ?? 'bg-slate-100 text-slate-600'].join(' ')}>
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {d.requiresReReview
                                ? <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">是</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{d.department}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              )}

              {/* ══ C2. 版本时间线 ══════════════════════════════════════════════════ */}
              {versionTimeline.length > 1 && (
              <section id="vp-timeline" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader tag="C2" title="版本时间线" subtitle={`共 ${versionTimeline.length} 个版本 · 点击节点可切换视图`} />
                <VersionTimeline
                  points={versionTimeline}
                  selectedVersion={latestVer?.versionNumber ?? null}
                />
              </section>
              )}

              {/* ══ C3. 设计 vs 实物 ════════════════════════════════════════════════ */}
              <section id="vp-design-sample" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader tag="C3" title="设计 vs 实物对比" subtitle="效果图与实物样品的差异核查 — 左侧为设计，右侧为实物" />
                <DesignVsSampleCompare
                  entries={designVsSampleRows}
                  designImageUrl={latestVer?.imageUrl ?? null}
                  sampleImageUrl={
                    selectedChain.versions.find((v) =>
                      ['final_sample_photo', 'second_sample_photo', 'first_sample_photo'].includes(v.assetType),
                    )?.imageUrl ?? null
                  }
                />
              </section>

              {/* ══ C4. 配色矩阵 ═════════════════════════════════════════════════════*/}
              <section id="vp-colorways" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader tag="C4" title="配色矩阵" subtitle={`${colorwayEntries.length} 个配色方案 · 显示状态与成本偏差`} />
                <ColorwayMatrix entries={colorwayEntries} />
              </section>

              {/* ══ C5. 规格参数对比 ══════════════════════════════════════════════════*/}
              <section id="vp-specs" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader tag="C5" title="规格参数对比" subtitle="帮高 · 楦围 · 底厚 · 针距 · 重量 — 与规格标准的合规性验证" />
                <SpecComparisonTable rows={specRows} />
              </section>

              {/* ══ E. 鞋类技术完整度 ══════════════════════════════════════════════ */}
              <section id="vp-tech" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  tag="E"
                  title="鞋类技术完整度"
                  subtitle="评审资料按权重计算完整度 — 效果图15% · 材料/配色15% · 大底/楦型20% · 成本/BOM20% · 样品/测试20% · 变更说明10%"
                />

                {/* Weighted score bar */}
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span>评审准备度</span>
                      <span className="font-semibold text-slate-800">{readinessScore}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={['h-full rounded-full transition-all', readinessScore >= 80 ? 'bg-emerald-500' : readinessScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'].join(' ')}
                        style={{ width: `${readinessScore}%` }}
                      />
                    </div>
                  </div>
                  <span className={[
                    'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                    readinessScore >= 80 ? 'bg-emerald-100 text-emerald-700' : readinessScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700',
                  ].join(' ')}>
                    {readinessScore >= 80 ? '资料充分' : readinessScore >= 50 ? '资料基本齐全' : '资料不足'}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {techGroups.map((group) => {
                    const done    = group.items.filter((i) => i.status === 'complete').length;
                    const missing = group.items.filter((i) => i.status === 'missing').length;
                    return (
                      <div key={group.id} className={['rounded-xl border p-3', missing > 0 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-slate-50/40'].join(' ')}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">{group.groupLabel}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">{done}/{group.items.filter((i) => i.status !== 'na').length}</span>
                            <span className="text-[10px] text-slate-400">权重 {group.weight}%</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {group.items.map((item) => {
                            const s = TECH_STATUS_STYLE[item.status];
                            return (
                              <div key={item.label} className={['flex items-start gap-2 rounded-lg px-2 py-1.5', s.bg].join(' ')}>
                                <span className={['mt-0.5 text-xs font-bold', s.text].join(' ')}>{s.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-slate-700">{item.label}</div>
                                  {item.note && item.status !== 'complete' && (
                                    <div className="mt-0.5 text-[10px] text-slate-500">{item.note}</div>
                                  )}
                                </div>
                                <span className={['shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold', s.badge].join(' ')}>
                                  {item.status === 'complete' ? '已完成' : item.status === 'pending' ? '待上传' : item.status === 'missing' ? '缺失' : '不适用'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ══ F. 商品企划匹配校验 ═════════════════════════════════════════════ */}
              <section id="vp-merch" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  tag="F"
                  title="商品企划匹配校验"
                  subtitle="当前版本是否符合商品企划输入的 10 个核心维度"
                  count={`${merchDims.filter((m) => m.status === 'pass').length}/${merchDims.length} 通过`}
                />

                {/* Summary banner */}
                {(() => {
                  const issues = merchDims.filter((m) => m.status !== 'pass');
                  return (
                    <div className={[
                      'mb-4 flex items-center gap-3 rounded-xl border px-4 py-2.5',
                      issues.length === 0 ? 'border-emerald-200 bg-emerald-50' : issues.some((m) => m.status === 'fail') ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50',
                    ].join(' ')}>
                      <span className={['text-lg font-bold tabular-nums', issues.length === 0 ? 'text-emerald-600' : issues.some((m) => m.status === 'fail') ? 'text-rose-600' : 'text-amber-600'].join(' ')}>
                        {merchDims.filter((m) => m.status === 'pass').length}/{merchDims.length}
                      </span>
                      <span className="text-sm text-slate-700">
                        {issues.length === 0 ? '所有维度匹配，商品企划校验通过' : `${issues.length} 个维度需要关注`}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid gap-2 sm:grid-cols-2">
                  {merchDims.map((dim) => {
                    const s = MERCH_STATUS_STYLE[dim.status];
                    return (
                      <div key={dim.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={['size-2 rounded-full', s.dot].join(' ')} />
                            <span className="text-xs font-semibold text-slate-800">{dim.label}</span>
                          </div>
                          <span className={['rounded px-1.5 py-0.5 text-[10px] font-bold', s.badge].join(' ')}>{s.label}</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-500">{dim.currentJudgment}</div>
                        {dim.status !== 'pass' && (
                          <>
                            <div className="mt-1 text-[11px] text-slate-600">{dim.deviation}</div>
                            <div className={['mt-1 text-[11px] font-medium', dim.status === 'fail' ? 'text-rose-600' : 'text-amber-600'].join(' ')}>
                              → {dim.recommendedAction}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ══ G+H. 提交评审 + 版本决策 ══════════════════════════════════════ */}
              <section id="vp-submit-action" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  tag="G"
                  title="提交评审 + 版本决策"
                  subtitle="核查 9 项提交条件 · 确认后提交至评审决议"
                  count={`当前状态: ${dsMeta.label}`}
                />

                {/* Verdict banner */}
                {(() => {
                  const v = submitCheck.verdict;
                  const vStyle = v === 'can_submit'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : v === 'needs_data'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800';
                  const vText = v === 'can_submit' ? '✓ 可提交评审' : v === 'needs_data' ? '⚠ 建议补充资料后提交' : '✗ 必须补充资料后提交';
                  const passCount = submitCheck.items.filter((i) => i.status === 'pass').length;
                  return (
                    <div className={['mb-4 flex items-center justify-between rounded-xl border px-4 py-3', vStyle].join(' ')}>
                      <span className="text-sm font-semibold">{vText}</span>
                      <span className="text-xs opacity-70">{passCount}/{submitCheck.items.length} 项通过</span>
                    </div>
                  );
                })()}

                <div className="mb-5 grid gap-2 sm:grid-cols-2">
                  {submitCheck.items.map((item) => {
                    const icon  = item.status === 'pass' ? '✓' : item.status === 'fail' ? '✗' : '○';
                    const color = item.status === 'pass' ? 'text-emerald-600' : item.status === 'fail' ? 'text-rose-600' : 'text-amber-600';
                    const bg    = item.status === 'pass' ? 'bg-emerald-50' : item.status === 'fail' ? 'bg-rose-50' : 'bg-amber-50';
                    return (
                      <div key={item.id} className={['flex items-start gap-3 rounded-xl px-3 py-2.5', bg].join(' ')}>
                        <span className={['mt-0.5 text-sm font-bold', color].join(' ')}>{icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-800">{item.label}</div>
                          {item.detail && (
                            <div className={['mt-0.5 text-[11px] font-medium', color].join(' ')}>{item.detail}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hero submit button + secondary decision links */}
                <div className="flex flex-col gap-3">
                  {/* Primary hero button */}
                  <Link
                    href={`/design-review-center?tab=reviewDecisionCenter&styleId=${selectedChain.styleId}&versionId=${selectedChain.latestVersion?.assetId ?? ''}`}
                    className={[
                      'flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-bold transition',
                      submitCheck.verdict === 'must_not_submit'
                        ? 'cursor-not-allowed bg-slate-200 text-slate-400 pointer-events-none'
                        : submitCheck.verdict === 'needs_data'
                        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200'
                        : 'bg-slate-900 text-white hover:bg-slate-700 shadow-md shadow-slate-300',
                    ].join(' ')}
                  >
                    <span>→ 提交评审</span>
                    <span className="text-sm font-normal opacity-70">{selectedChain.skuCode} · v{selectedChain.latestVersionNumber}</span>
                  </Link>

                  {/* Secondary action links */}
                  <div className="grid gap-2 sm:grid-cols-3">
                    {decisionActs.filter((a) => a.id !== 'submit').slice(0, 3).map((action) => (
                      <Link
                        key={action.id}
                        href={action.href}
                        className={['flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition', ACTION_STYLE[action.variant]].join(' ')}
                      >
                        <div className="min-w-0 flex-1">
                          <div>{action.label}</div>
                          <div className={['text-[11px] font-normal', action.variant === 'primary' || action.variant === 'danger' ? 'opacity-70' : 'text-slate-400'].join(' ')}>
                            {action.desc}
                          </div>
                        </div>
                        <span className={action.variant === 'primary' || action.variant === 'danger' ? 'opacity-50' : 'text-slate-300'}>›</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-sm text-slate-400">
              从左侧选择一个款式版本链
            </div>
          )}
        </div>

      </div>

      {/* ── FloatingModuleNav ──────────────────────────────────────────────── */}
      <FloatingModuleNav
        moduleLinks={VP_MODULE_LINKS}
        pageSections={VP_PAGE_SECTIONS}
      />
    </>
  );
}
