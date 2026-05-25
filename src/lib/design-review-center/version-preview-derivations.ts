/**
 * version-preview-derivations.ts
 * Builder functions for the 4 sub-sections in the design version preview workbench.
 * All data is derived from DesignVersionChain — no hardcoded mock data in components.
 */

import type { DesignVersionChain, DesignVersionEntry } from './selectors/assets';

// ─────────────────────────────────────────────
// Version Timeline
// ─────────────────────────────────────────────

export interface VersionTimelinePoint {
  versionNumber: number;
  uploadedAt: string;
  isLatest: boolean;
  thumbnailUrl: string;
  summary: string;
  deltaNote: string | null;
  reviewConclusion: string | null;
  riskLevel: string;
  changeDriver: 'design' | 'merch' | 'development' | 'cost' | 'cmf' | 'unknown';
  changeDriverNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalMeeting: string | null;
}

const CHANGE_DRIVER_LABEL: Record<string, string> = {
  design: '设计驱动',
  merch: '企划驱动',
  development: '开发驱动',
  cost: '成本驱动',
  cmf: 'CMF调整',
  unknown: '原因待定',
};

export const CHANGE_DRIVER_LABEL_MAP = CHANGE_DRIVER_LABEL;

function inferChangeDriver(v: DesignVersionEntry): 'design' | 'merch' | 'development' | 'cost' | 'cmf' | 'unknown' {
  if (v.changeDriver) return v.changeDriver;
  // Infer from changed context heuristics
  if (v.deltaNote?.includes('材料') || v.deltaNote?.includes('色彩') || v.deltaNote?.includes('CMF')) return 'cmf';
  if (v.deltaNote?.includes('成本') || v.deltaNote?.includes('cost')) return 'cost';
  if (v.deltaNote?.includes('企划') || v.deltaNote?.includes('波段')) return 'merch';
  if (v.deltaNote?.includes('开发') || v.deltaNote?.includes('工艺')) return 'development';
  if (v.deltaNote?.includes('设计') || v.deltaNote?.includes('造型')) return 'design';
  return 'unknown';
}

export function buildVersionTimeline(chain: DesignVersionChain): VersionTimelinePoint[] {
  return [...chain.versions]
    .sort((a, b) => a.versionNumber - b.versionNumber)
    .map((v) => ({
      versionNumber: v.versionNumber,
      uploadedAt: v.uploadedAt,
      isLatest: v.isLatest,
      thumbnailUrl: v.imageUrl,
      summary: v.summary,
      deltaNote: v.deltaNote,
      reviewConclusion: v.reviewConclusion,
      riskLevel: v.riskLevel,
      changeDriver: inferChangeDriver(v),
      changeDriverNote: v.changeDriverNote ?? null,
      approvedBy: v.approvedBy ?? null,
      approvedAt: v.approvedAt ?? null,
      approvalMeeting: v.approvalMeeting ?? null,
    }));
}

// ─────────────────────────────────────────────
// Colorway Matrix
// ─────────────────────────────────────────────

export interface ColorwayEntry {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColors: string[];
  status: 'active' | 'pending' | 'cancelled';
  costDelta: number | null; // relative to base version cost, in yuan
  sourceVersionNumber: number;
}

export function buildColorwayMatrix(chain: DesignVersionChain): ColorwayEntry[] {
  const entries: ColorwayEntry[] = [];
  const seen = new Set<string>();
  const baseTargetCost = chain.targetCost ?? null;

  for (const v of chain.versions) {
    if (!v.colorway) {
      // Synthesise from colorPlan strings
      const fallbackId = `syn-v${v.versionNumber}`;
      if (!seen.has(fallbackId)) {
        seen.add(fallbackId);
        entries.push({
          id: fallbackId,
          name: v.colorPlan.length > 0 ? v.colorPlan.join(' / ') : `配色方案 V${v.versionNumber}`,
          primaryColor: '#94a3b8',
          secondaryColors: [],
          status: v.reviewConclusion === 'cancel' ? 'cancelled' : v.isLatest ? 'active' : 'pending',
          costDelta: v.targetCost && baseTargetCost ? v.targetCost - baseTargetCost : null,
          sourceVersionNumber: v.versionNumber,
        });
      }
    } else {
      const cw = v.colorway;
      if (!seen.has(cw.id)) {
        seen.add(cw.id);
        entries.push({
          id: cw.id,
          name: cw.name,
          primaryColor: cw.primaryColor,
          secondaryColors: cw.secondaryColors,
          status: v.reviewConclusion === 'cancel' ? 'cancelled' : v.isLatest ? 'active' : 'pending',
          costDelta: v.targetCost && baseTargetCost ? v.targetCost - baseTargetCost : null,
          sourceVersionNumber: v.versionNumber,
        });
      }
    }
  }

  return entries;
}

// ─────────────────────────────────────────────
// Design vs Sample Compare
// ─────────────────────────────────────────────

export interface DesignVsSampleEntry {
  label: string;
  designValue: string | null; // from effect render / concept sketch
  sampleValue: string | null; // from sample photos
  hasGap: boolean;
  gapNote: string | null;
}

export function buildDesignVsSample(chain: DesignVersionChain): DesignVsSampleEntry[] {
  const lv = chain.latestVersion;
  if (!lv) return [];

  const hasSample =
    chain.versions.some((v) =>
      ['first_sample_photo', 'second_sample_photo', 'final_sample_photo'].includes(v.assetType),
    );

  const sampleVersion =
    chain.versions.find((v) =>
      ['final_sample_photo', 'second_sample_photo', 'first_sample_photo'].includes(v.assetType),
    ) ?? null;

  const fitFeedback = sampleVersion?.fitFeedback ?? lv.fitFeedback ?? null;

  return [
    {
      label: '主视觉',
      designValue: lv.imageUrl ? '设计效果图已上传' : null,
      sampleValue: sampleVersion ? '实物照片已上传' : null,
      hasGap: !sampleVersion,
      gapNote: !sampleVersion ? '尚未上传实物样品照片' : null,
    },
    {
      label: '材料方案',
      designValue: lv.materialPlan.length > 0 ? lv.materialPlan.join(' · ') : null,
      sampleValue: sampleVersion?.materialPlan.join(' · ') ?? null,
      hasGap: !hasSample || (sampleVersion ? JSON.stringify(sampleVersion.materialPlan) !== JSON.stringify(lv.materialPlan) : false),
      gapNote:
        sampleVersion && JSON.stringify(sampleVersion.materialPlan) !== JSON.stringify(lv.materialPlan)
          ? '实物材料与设计方案存在差异'
          : !hasSample
            ? '实物样品材料未记录'
            : null,
    },
    {
      label: '外底方案',
      designValue: lv.outsole || null,
      sampleValue: sampleVersion?.outsole ?? null,
      hasGap: !!sampleVersion && sampleVersion.outsole !== lv.outsole,
      gapNote:
        sampleVersion && sampleVersion.outsole !== lv.outsole
          ? `外底实物 (${sampleVersion.outsole}) 与设计 (${lv.outsole}) 不符`
          : null,
    },
    {
      label: '楦型',
      designValue: lv.last || null,
      sampleValue: sampleVersion?.last ?? null,
      hasGap: !!sampleVersion && sampleVersion.last !== lv.last,
      gapNote:
        sampleVersion && sampleVersion.last !== lv.last
          ? `实物楦型 (${sampleVersion.last}) 与设计 (${lv.last}) 不符`
          : null,
    },
    {
      label: '穿着反馈',
      designValue: null,
      sampleValue: fitFeedback
        ? `综合评分 ${fitFeedback.score}/10 · ${fitFeedback.comfort} · 由 ${fitFeedback.tester} 测试`
        : null,
      hasGap: !fitFeedback,
      gapNote: !fitFeedback ? '试穿反馈尚未录入' : null,
    },
    {
      label: '成本对比',
      designValue: lv.targetCost ? `目标成本 ¥${lv.targetCost}` : null,
      sampleValue: sampleVersion?.targetCost ? `实物报价 ¥${sampleVersion.targetCost}` : null,
      hasGap:
        !!lv.targetCost &&
        !!sampleVersion?.targetCost &&
        Math.abs((sampleVersion.targetCost - lv.targetCost) / lv.targetCost) > 0.05,
      gapNote:
        lv.targetCost && sampleVersion?.targetCost && Math.abs((sampleVersion.targetCost - lv.targetCost) / lv.targetCost) > 0.05
          ? `实物成本超出目标 ${(((sampleVersion.targetCost - lv.targetCost) / lv.targetCost) * 100).toFixed(1)}%`
          : null,
    },
  ];
}

// ─────────────────────────────────────────────
// Spec Comparison Table
// ─────────────────────────────────────────────

export interface SpecCompareRow {
  label: string;
  unit: string;
  designValue: number | null;
  sampleValue: number | null;
  standardMin: number | null;
  standardMax: number | null;
  isCompliant: boolean | null; // null = cannot evaluate
  delta: number | null;
  deltaPercent: number | null;
}

const DEFAULT_SPECS = {
  upperHeight: 75,
  lastGirth: 245,
  soleThickness: 28,
  stitchDensity: 8,
  weight: 320,
};

const SPEC_STANDARDS: Record<
  keyof typeof DEFAULT_SPECS,
  { min: number; max: number; label: string; unit: string }
> = {
  upperHeight:    { label: '帮高',   unit: 'mm', min: 60,  max: 90  },
  lastGirth:      { label: '楦围',   unit: 'mm', min: 230, max: 260 },
  soleThickness:  { label: '底厚',   unit: 'mm', min: 20,  max: 35  },
  stitchDensity:  { label: '针距',   unit: '针/cm', min: 6, max: 12 },
  weight:         { label: '重量',   unit: 'g',  min: 250, max: 450 },
};

export function buildSpecComparison(chain: DesignVersionChain): SpecCompareRow[] {
  const lv = chain.latestVersion;
  const pv = chain.previousVersion;
  const designSpecs = lv?.specs ?? {};
  const sampleSpecs = pv?.specs ?? {};

  return (Object.keys(SPEC_STANDARDS) as Array<keyof typeof DEFAULT_SPECS>).map((key) => {
    const std = SPEC_STANDARDS[key];
    const designVal = designSpecs[key] ?? DEFAULT_SPECS[key];
    const sampleVal = sampleSpecs[key] ?? null;
    const evalVal = sampleVal ?? designVal;
    const isCompliant = evalVal !== null ? evalVal >= std.min && evalVal <= std.max : null;
    const delta = sampleVal !== null && designVal !== null ? sampleVal - designVal : null;
    const deltaPercent = delta !== null && designVal ? (delta / designVal) * 100 : null;

    return {
      label: std.label,
      unit: std.unit,
      designValue: designVal,
      sampleValue: sampleVal,
      standardMin: std.min,
      standardMax: std.max,
      isCompliant,
      delta,
      deltaPercent,
    };
  });
}
