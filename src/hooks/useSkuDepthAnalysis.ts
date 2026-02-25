'use client';

import { useMemo } from 'react';
import type {
    CategoryOpsDepthBin,
    CategoryOpsDepthScatterPoint,
    CategoryOpsDepthSummary,
} from '@/hooks/useCategoryOps';

export type DepthGroupBy = 'all' | 'category' | 'price_band' | 'lifecycle';

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function quantile(values: number[], q: number) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * q;
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    if (low === high) return sorted[low];
    const ratio = idx - low;
    return sorted[low] * (1 - ratio) + sorted[high] * ratio;
}

function buildDepthBins(points: CategoryOpsDepthScatterPoint[]): CategoryOpsDepthBin[] {
    const bins: CategoryOpsDepthBin[] = [
        { label: '<100双', count: 0, share: 0 },
        { label: '100-299双', count: 0, share: 0 },
        { label: '300-599双', count: 0, share: 0 },
        { label: '600-999双', count: 0, share: 0 },
        { label: '1000+双', count: 0, share: 0 },
    ];
    points.forEach((row) => {
        if (row.pairsSold < 100) bins[0].count += 1;
        else if (row.pairsSold < 300) bins[1].count += 1;
        else if (row.pairsSold < 600) bins[2].count += 1;
        else if (row.pairsSold < 1000) bins[3].count += 1;
        else bins[4].count += 1;
    });
    bins.forEach((bin) => {
        bin.share = safeDiv(bin.count, Math.max(points.length, 1));
    });
    return bins;
}

function buildDepthSummary(points: CategoryOpsDepthScatterPoint[]): CategoryOpsDepthSummary {
    const values = points.map((row) => row.pairsSold);
    const mainThreshold = quantile(values, 0.4);
    const sThreshold = quantile(values, 0.8);
    const summary: CategoryOpsDepthSummary = {
        sCount: 0,
        mainCount: 0,
        tailCount: 0,
        sThreshold,
        mainThreshold,
    };
    points.forEach((row) => {
        if (row.pairsSold >= sThreshold) summary.sCount += 1;
        else if (row.pairsSold >= mainThreshold) summary.mainCount += 1;
        else summary.tailCount += 1;
    });
    return summary;
}

export function useSkuDepthAnalysis(
    scatterPoints: CategoryOpsDepthScatterPoint[],
    depthGroupBy: DepthGroupBy,
    depthGroupValue: string,
) {
    const depthGroupOptions = useMemo(() => {
        if (depthGroupBy === 'category') {
            return Array.from(new Set(scatterPoints.map((row) => row.category)))
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'zh-CN'));
        }
        if (depthGroupBy === 'price_band') {
            return Array.from(new Set(scatterPoints.map((row) => row.priceBand))).filter(Boolean);
        }
        if (depthGroupBy === 'lifecycle') {
            return Array.from(new Set(scatterPoints.map((row) => row.lifecycleLabel)))
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'zh-CN'));
        }
        return [] as string[];
    }, [depthGroupBy, scatterPoints]);

    const activeDepthGroupValue = useMemo(() => {
        if (depthGroupBy === 'all') return 'all';
        return depthGroupOptions.includes(depthGroupValue) ? depthGroupValue : 'all';
    }, [depthGroupBy, depthGroupOptions, depthGroupValue]);

    const filteredDepthPoints = useMemo(() => {
        if (depthGroupBy === 'all' || activeDepthGroupValue === 'all') return scatterPoints;
        if (depthGroupBy === 'category') return scatterPoints.filter((row) => row.category === activeDepthGroupValue);
        if (depthGroupBy === 'price_band') return scatterPoints.filter((row) => row.priceBand === activeDepthGroupValue);
        if (depthGroupBy === 'lifecycle') return scatterPoints.filter((row) => row.lifecycleLabel === activeDepthGroupValue);
        return scatterPoints;
    }, [activeDepthGroupValue, depthGroupBy, scatterPoints]);

    const filteredDepthBins = useMemo(() => buildDepthBins(filteredDepthPoints), [filteredDepthPoints]);
    const filteredDepthSummary = useMemo(() => buildDepthSummary(filteredDepthPoints), [filteredDepthPoints]);

    return {
        depthGroupOptions,
        activeDepthGroupValue,
        filteredDepthPoints,
        filteredDepthBins,
        filteredDepthSummary,
    };
}
