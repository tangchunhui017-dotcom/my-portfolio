export const AUDIENCE_TO_AGE_GROUP: Record<string, string[]> = {
    '18-23岁 GenZ': ['18-25'],
    '24-28岁 职场新人': ['26-35'],
    '29-35岁 资深中产': ['26-35'],
    '35岁以上': ['36-45', '46+'],
};

export function matchesAudienceFilter(
    skuTargetAudience: string | undefined,
    skuTargetAgeGroup: string | undefined,
    selectedAudience: string | 'all',
) {
    if (selectedAudience === 'all') return true;
    if (skuTargetAudience === selectedAudience) return true;
    if (skuTargetAgeGroup === selectedAudience) return true;
    if (!skuTargetAgeGroup) return false;
    return Boolean(AUDIENCE_TO_AGE_GROUP[selectedAudience]?.includes(skuTargetAgeGroup));
}
