import { FOOTWEAR_CATEGORY_HIERARCHY } from '@/config/footwearTaxonomy';

export interface ResolvedFootwearCategory {
  categoryL1: string;
  categoryL2: string;
}

const CATEGORY_ALIAS_RULES: Array<{ match: string[]; categoryL1: string; categoryL2: string }> = [
  { match: ['休闲鞋'], categoryL1: '休闲/街头', categoryL2: '休闲鞋' },
  { match: ['板鞋'], categoryL1: '休闲/街头', categoryL2: '板鞋' },
  { match: ['德训鞋'], categoryL1: '休闲/街头', categoryL2: '德训鞋' },
  { match: ['阿甘鞋'], categoryL1: '休闲/街头', categoryL2: '阿甘鞋' },
  { match: ['徒步鞋', '徒步登山'], categoryL1: '户外鞋', categoryL2: '徒步鞋' },
  { match: ['户外鞋', '潮流机能', '溯溪鞋', '越野鞋'], categoryL1: '户外鞋', categoryL2: '户外鞋' },
  { match: ['乐福鞋'], categoryL1: '正装/通勤', categoryL2: '乐福鞋' },
  { match: ['德比鞋'], categoryL1: '正装/通勤', categoryL2: '德比鞋' },
  { match: ['牛津鞋'], categoryL1: '正装/通勤', categoryL2: '牛津鞋' },
  { match: ['玛丽珍鞋', '浅口单鞋', '芭蕾舞鞋'], categoryL1: '时尚/通勤', categoryL2: '玛丽珍鞋' },
  { match: ['凉鞋', '拖鞋', '洞洞鞋'], categoryL1: '凉拖鞋', categoryL2: '凉鞋' },
  { match: ['靴', '短靴', '长靴', '切尔西靴', '马丁靴', '雪地靴'], categoryL1: '靴类', categoryL2: '短靴' },
];

const CATEGORY_INDEX = FOOTWEAR_CATEGORY_HIERARCHY.flatMap((group) =>
  group.items.flatMap((item) => [
    {
      categoryL1: item.l2,
      categoryL2: item.l2,
      matchers: [item.l2],
    },
    ...item.l3.map((leaf) => ({
      categoryL1: item.l2,
      categoryL2: leaf,
      matchers: [leaf],
    })),
  ]),
);

function normalizeCategoryName(categoryName: string) {
  return categoryName.trim();
}

export function resolveFootwearCategoryLevels(categoryName: string): ResolvedFootwearCategory {
  const normalized = normalizeCategoryName(categoryName);

  const exact = CATEGORY_INDEX.find((item) => item.matchers.some((matcher) => matcher === normalized));
  if (exact) {
    return { categoryL1: exact.categoryL1, categoryL2: exact.categoryL2 };
  }

  const fuzzy = CATEGORY_INDEX.find((item) => item.matchers.some((matcher) => normalized.includes(matcher) || matcher.includes(normalized)));
  if (fuzzy) {
    return { categoryL1: fuzzy.categoryL1, categoryL2: fuzzy.categoryL2 };
  }

  const alias = CATEGORY_ALIAS_RULES.find((rule) => rule.match.some((keyword) => normalized.includes(keyword)));
  if (alias) {
    return { categoryL1: alias.categoryL1, categoryL2: alias.categoryL2 };
  }

  return {
    categoryL1: normalized,
    categoryL2: normalized,
  };
}
