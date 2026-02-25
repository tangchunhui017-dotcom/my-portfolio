'use client';

import { useMemo } from 'react';
import type { CategoryOpsCompareMeta, CategoryOpsHeatPoint, CategoryOpsOtbSuggestionRow } from '@/hooks/useCategoryOps';

export interface CategoryOpsHeatInsight {
    finding: string;
    decision: string;
    result: string;
}

function formatPct(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value * 100).toFixed(1)}%`;
}

export function useCategoryStructure(
    heatmapPoints: CategoryOpsHeatPoint[],
    selectedHeatPointId: string,
    compareMeta: CategoryOpsCompareMeta,
    otbSuggestionMap: Map<string, CategoryOpsOtbSuggestionRow>,
) {
    const heatPointMap = useMemo(() => {
        const map = new Map<string, CategoryOpsHeatPoint>();
        heatmapPoints.forEach((point) => map.set(point.id, point));
        return map;
    }, [heatmapPoints]);

    const selectedHeatPoint = useMemo(
        () => (selectedHeatPointId === 'all' ? null : heatPointMap.get(selectedHeatPointId) || null),
        [heatPointMap, selectedHeatPointId],
    );

    const selectedHeatInsight = useMemo<CategoryOpsHeatInsight | null>(() => {
        if (!selectedHeatPoint) return null;

        const cell = selectedHeatPoint.cell;
        const otbRow = otbSuggestionMap.get(cell.categoryId);
        const fillRisk = cell.fillGapPp <= -2;
        const reorderPressure = cell.reorderGapPp >= 1.5;
        const finding = `${cell.elementLabel}，${compareMeta.sellThroughLabel}${formatPct(cell.sellThrough)}，执行率${formatPct(cell.fillRate)}，补单率${formatPct(cell.reorderRate)}。`;
        const decision = fillRisk
            ? '优先补单与跨区调拨，先保核心尺码；同步收缩低动销 SKU 宽度。'
            : reorderPressure
                ? '前置补单节奏并提升主推款深度，避免旺季断货。'
                : '维持当前配货节奏，按周复盘售罄与补单偏离。';
        const result = otbRow
            ? `OTB 建议${otbRow.deltaPp >= 0 ? '上调' : '下调'} ${Math.abs(otbRow.deltaPp).toFixed(1)}pp，原因：${otbRow.reason}。`
            : '当前格子暂无对应 OTB 权重建议。';

        return { finding, decision, result };
    }, [compareMeta.sellThroughLabel, otbSuggestionMap, selectedHeatPoint]);

    return {
        heatPointMap,
        selectedHeatPoint,
        selectedHeatInsight,
    };
}
