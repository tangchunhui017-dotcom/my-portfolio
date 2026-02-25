'use client';

import { useMemo } from 'react';
import type { CategoryOpsOtbSuggestionRow } from '@/hooks/useCategoryOps';

export interface CategoryOpsExpectedResult {
    positiveShift: number;
    negativeShift: number;
    discountImprovePp: number;
    gmImprovePp: number;
    sellThroughImprovePp: number;
}

export function useOtbInputSuggestion(otbSuggestions: CategoryOpsOtbSuggestionRow[]) {
    const otbSuggestionMap = useMemo(() => {
        const map = new Map<string, CategoryOpsOtbSuggestionRow>();
        otbSuggestions.forEach((row) => map.set(row.categoryId, row));
        return map;
    }, [otbSuggestions]);

    const expectedResult = useMemo<CategoryOpsExpectedResult>(() => {
        const positiveShift = otbSuggestions
            .filter((row) => row.deltaPp > 0)
            .reduce((sum, row) => sum + row.deltaPp, 0);
        const negativeShift = Math.abs(
            otbSuggestions
                .filter((row) => row.deltaPp < 0)
                .reduce((sum, row) => sum + row.deltaPp, 0),
        );
        const discountImprovePp = Math.min(3.5, positiveShift * 0.12);
        const gmImprovePp = Math.min(2.8, positiveShift * 0.09);
        const sellThroughImprovePp = Math.min(4.2, positiveShift * 0.15);

        return {
            positiveShift,
            negativeShift,
            discountImprovePp,
            gmImprovePp,
            sellThroughImprovePp,
        };
    }, [otbSuggestions]);

    return {
        otbSuggestionMap,
        expectedResult,
    };
}

