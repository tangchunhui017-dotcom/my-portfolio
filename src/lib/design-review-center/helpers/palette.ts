const PALETTE_KEYWORDS = [
  { keyword: '经典黑', hex: '#111827' },
  { keyword: '全黑', hex: '#111111' },
  { keyword: '白', hex: '#F8FAFC' },
  { keyword: '米白', hex: '#F2EEE3' },
  { keyword: '低饱和米白', hex: '#EFE8D6' },
  { keyword: '灰', hex: '#94A3B8' },
  { keyword: '深灰', hex: '#4B5563' },
  { keyword: '岩石灰', hex: '#78716C' },
  { keyword: '绿', hex: '#84CC16' },
  { keyword: '军绿', hex: '#556B2F' },
  { keyword: '橙', hex: '#F97316' },
  { keyword: '蓝', hex: '#1D4ED8' },
  { keyword: '棕', hex: '#7C4A2D' },
  { keyword: '驼', hex: '#C19A6B' },
  { keyword: '卡其', hex: '#B6A37A' },
] as const;

const SERIES_ROLE_FALLBACK_HEX = {
  hero: '#1D4ED8',
  image: '#0F766E',
  basic: '#7C3AED',
  traffic: '#F97316',
} as const;

const NEUTRAL_COLOR_KEYWORDS = ['黑', '白', '灰', '米白'] as const;
const ACCENT_COLOR_PRIORITY = ['荧光绿', '军绿', '橙', '蓝', '驼', '卡其', '棕'] as const;

function isNeutralPaletteValue(value: string) {
  return NEUTRAL_COLOR_KEYWORDS.some((keyword) => value.includes(keyword));
}

function getAccentPriority(value: string) {
  const accentIndex = ACCENT_COLOR_PRIORITY.findIndex((keyword) => value.includes(keyword));
  if (accentIndex >= 0) return 100 - accentIndex;
  if (!isNeutralPaletteValue(value)) return 20;
  return 0;
}

export function resolvePaletteHex(value: string | null | undefined, fallback = '#CBD5E1') {
  if (!value) return fallback;
  const matched = PALETTE_KEYWORDS.find((item) => value.includes(item.keyword));
  return matched?.hex ?? fallback;
}

export function resolveSeriesThemeHex(
  colorDirections: string[] | null | undefined,
  seriesRole?: keyof typeof SERIES_ROLE_FALLBACK_HEX,
) {
  const fallback = seriesRole ? SERIES_ROLE_FALLBACK_HEX[seriesRole] : '#CBD5E1';
  const preferredColor =
    [...(colorDirections ?? [])]
      .sort((left, right) => getAccentPriority(right) - getAccentPriority(left))[0] ?? '';

  return preferredColor ? resolvePaletteHex(preferredColor, fallback) : fallback;
}
