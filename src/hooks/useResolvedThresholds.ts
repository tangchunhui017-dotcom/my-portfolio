/**
 * src/hooks/useResolvedThresholds.ts
 * 中台阈值 → 业务侧消费桥接 Hook。
 *
 * 返回与 src/config/thresholds.ts 的 THRESHOLDS 完全同构的对象，方便业务组件
 * 渐进迁移：把 `THRESHOLDS.sellThrough.target` 直接换成
 * `useResolvedThresholds().sellThrough.target`，行为一致但值改为从中台读取。
 *
 * 取数顺序（每个字段独立判断）：
 *   1. 中台对应 thresholdId 存在 → 用中台值（含品牌 override）
 *   2. 缺失 → 兜底硬编码 THRESHOLDS 值（保证 UI 不出 NaN/undefined）
 */
import { useMemo } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import { THRESHOLDS } from '@/config/thresholds';
import type { ThresholdDefinition } from '@/types/merchConfig';

export interface ResolvedThresholds {
    sellThrough: { target: number; warning: number; danger: number };
    marginRate:  { target: number; warning: number; danger: number };
    discountDepth: { good: number; warning: number; danger: number };
    onHandUnit:  { high: number; critical: number };
    top10Concentration: { warning: number; danger: number };
    channelConcentration: { warning: number };
    wos: { stockout: number; healthy: number; overstocked: number };
}

function pick(t: ThresholdDefinition | undefined, key: 'defaultValue' | 'warningValue' | 'criticalValue'): number | undefined {
    if (!t) return undefined;
    const v = t[key];
    return typeof v === 'number' ? v : undefined;
}

function coalesce(value: number | undefined, fallback: number): number {
    return value ?? fallback;
}

export function useResolvedThresholds(): ResolvedThresholds {
    const { thresholds } = useMerchConfig();

    return useMemo<ResolvedThresholds>(() => {
        const sellThrough  = thresholds.get('sellThroughRate_health');
        const margin       = thresholds.get('grossMarginRate_health');
        const wosMax       = thresholds.get('weeksOfSupply_max');
        const wosMin       = thresholds.get('weeksOfSupply_min');
        const discount     = thresholds.get('discountDepth_max');
        const channelConc  = thresholds.get('channelConcentration_max');
        const top10Conc    = thresholds.get('top10Concentration_max');

        return {
            sellThrough: {
                target:  coalesce(pick(sellThrough, 'defaultValue'),  THRESHOLDS.sellThrough.target),
                warning: coalesce(pick(sellThrough, 'warningValue'),  THRESHOLDS.sellThrough.warning),
                danger:  coalesce(pick(sellThrough, 'criticalValue'), THRESHOLDS.sellThrough.danger),
            },
            marginRate: {
                target:  coalesce(pick(margin, 'defaultValue'),  THRESHOLDS.marginRate.target),
                warning: coalesce(pick(margin, 'warningValue'),  THRESHOLDS.marginRate.warning),
                danger:  coalesce(pick(margin, 'criticalValue'), THRESHOLDS.marginRate.danger),
            },
            discountDepth: {
                good:    coalesce(pick(discount, 'defaultValue'),  THRESHOLDS.discountDepth.good),
                warning: coalesce(pick(discount, 'warningValue'),  THRESHOLDS.discountDepth.warning),
                danger:  coalesce(pick(discount, 'criticalValue'), THRESHOLDS.discountDepth.danger),
            },
            onHandUnit: {
                high:     THRESHOLDS.onHandUnit.high,
                critical: THRESHOLDS.onHandUnit.critical,
            },
            top10Concentration: {
                warning: coalesce(pick(top10Conc, 'defaultValue'),  THRESHOLDS.top10Concentration.warning),
                danger:  coalesce(pick(top10Conc, 'warningValue'),  THRESHOLDS.top10Concentration.danger),
            },
            channelConcentration: {
                warning: coalesce(pick(channelConc, 'defaultValue'), THRESHOLDS.channelConcentration.warning),
            },
            wos: {
                stockout:    coalesce(pick(wosMin, 'defaultValue'),  THRESHOLDS.wos.stockout),
                healthy:     coalesce(pick(wosMax, 'defaultValue'),  THRESHOLDS.wos.healthy),
                overstocked: coalesce(pick(wosMax, 'warningValue'),  THRESHOLDS.wos.overstocked),
            },
        };
    }, [thresholds]);
}
