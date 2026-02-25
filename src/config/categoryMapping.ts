import shoeCategoryMapRaw from '@/../data/taxonomy/shoe_category_map.json';

export type FootwearCategoryL1 = string;

export interface FootwearCategoryMeta {
    rawCategory: string;
    categoryL1: FootwearCategoryL1;
    categoryL2: string;
    matched: boolean;
}

type TaxonomySubCategory = {
    name: string;
};

type TaxonomyGroup = {
    group: string;
    sub_categories?: TaxonomySubCategory[];
};

type ShoeCategoryTaxonomy = {
    category_groups?: TaxonomyGroup[];
};

type L1Rule = {
    l1: FootwearCategoryL1;
    keywords: string[];
};

const taxonomy = shoeCategoryMapRaw as ShoeCategoryTaxonomy;
const taxonomyGroups = Array.isArray(taxonomy?.category_groups)
    ? taxonomy.category_groups
          .map((group) => ({
              group: String(group.group || '').trim(),
              subCategories: Array.isArray(group.sub_categories)
                  ? group.sub_categories
                        .map((sub) => String(sub.name || '').trim())
                        .filter(Boolean)
                  : [],
          }))
          .filter((group) => group.group.length > 0)
    : [];

const taxonomyCoreOrder = Array.from(new Set(taxonomyGroups.map((group) => group.group)));
const taxonomyCoreSet = new Set(taxonomyCoreOrder);

const defaultFallbackL1 = taxonomyCoreSet.has('休闲/街头')
    ? '休闲/街头'
    : taxonomyCoreOrder[0] || '其他';

const taxonomySubCategoryByL1: Record<string, string[]> = {};
taxonomyGroups.forEach((group) => {
    taxonomySubCategoryByL1[group.group] = Array.from(new Set(group.subCategories));
});

const legacyL1Alias: Record<string, string> = {
    运动鞋: defaultFallbackL1,
    户外鞋: taxonomyCoreSet.has('户外鞋') ? '户外鞋' : defaultFallbackL1,
    休闲鞋: taxonomyCoreSet.has('休闲/街头') ? '休闲/街头' : defaultFallbackL1,
    休闲: taxonomyCoreSet.has('休闲/街头') ? '休闲/街头' : defaultFallbackL1,
    通勤鞋: taxonomyCoreSet.has('正装/通勤') ? '正装/通勤' : defaultFallbackL1,
    皮鞋: taxonomyCoreSet.has('正装/通勤') ? '正装/通勤' : defaultFallbackL1,
    靴鞋: taxonomyCoreSet.has('靴类') ? '靴类' : defaultFallbackL1,
    凉鞋拖鞋: taxonomyCoreSet.has('凉拖鞋') ? '凉拖鞋' : defaultFallbackL1,
};

const productLineAlias: Record<string, { l1: string; l2: string }> = {
    户外机能: {
        l1: taxonomyCoreSet.has('户外鞋') ? '户外鞋' : defaultFallbackL1,
        l2: '潮流机能',
    },
    通勤轻商务: {
        l1: taxonomyCoreSet.has('正装/通勤') ? '正装/通勤' : defaultFallbackL1,
        l2: '乐福鞋',
    },
    专业跑步: {
        l1: taxonomyCoreSet.has('休闲/街头') ? '休闲/街头' : defaultFallbackL1,
        l2: '阿甘鞋',
    },
    竞技篮球: {
        l1: taxonomyCoreSet.has('休闲/街头') ? '休闲/街头' : defaultFallbackL1,
        l2: '板鞋',
    },
    轻运动训练: {
        l1: taxonomyCoreSet.has('休闲/街头') ? '休闲/街头' : defaultFallbackL1,
        l2: '德训鞋',
    },
};

const legacyL2Alias: Record<string, string> = {
    跑步: '阿甘鞋',
    竞速: '阿甘鞋',
    篮球: '板鞋',
    综训: '德训鞋',
    训练: '德训鞋',
};

const l1ExtraKeywords: Record<string, string[]> = {
    户外鞋: ['户外', '徒步', '登山', '溯溪', '越野', '机能', 'outdoor', 'hiking', 'trail'],
    '休闲/街头': [
        '休闲',
        '街头',
        '板鞋',
        '老爹',
        '德训',
        '阿甘',
        '帆布',
        '运动鞋',
        '跑步',
        '竞速',
        '篮球',
        '综训',
        'running',
        'basket',
    ],
    '时尚/通勤': ['时尚', '通勤', '浅口', '芭蕾', '玛丽珍', 'fashion'],
    '正装/通勤': ['正装', '商务', '乐福', '牛津', '德比', '豆豆', '穆勒', 'loafer', 'oxford', 'derby'],
    靴类: ['靴', '短靴', '切尔西', '马丁', '长筒', '雪地', 'boot'],
    凉拖鞋: ['凉鞋', '洞洞', '拖鞋', '前空', '中空', '后空', 'sandal', 'slipper'],
    童鞋: ['童鞋', '学步', '校园', '雨靴', 'kids', 'kid'],
    配件: ['鞋垫', '鞋带', '袜', '配件', 'accessory'],
};

const l2ExtraKeywords: Record<string, Record<string, string[]>> = {
    '休闲/街头': {
        阿甘鞋: ['跑步', '竞速', 'running', 'race'],
        板鞋: ['篮球', 'basket'],
        德训鞋: ['综训', '训练', 'training', 'cross'],
    },
    '正装/通勤': {
        乐福鞋: ['通勤轻商务', '通勤', '商务'],
    },
};

export const FOOTWEAR_CATEGORY_CORE_ORDER: FootwearCategoryL1[] = [...taxonomyCoreOrder];

export const FOOTWEAR_CATEGORY_L1_ORDER: FootwearCategoryL1[] = [
    ...taxonomyCoreOrder,
    '其他',
];

export const FOOTWEAR_CATEGORY_OPTIONS = FOOTWEAR_CATEGORY_CORE_ORDER.map((category) => ({
    value: category,
    label: category,
}));

export const FOOTWEAR_SUB_CATEGORY_BY_L1: Record<FootwearCategoryL1, string[]> = {
    ...taxonomySubCategoryByL1,
    其他: ['其他'],
};

export const FOOTWEAR_SUB_CATEGORY_OPTIONS = Array.from(
    new Set(
        FOOTWEAR_CATEGORY_L1_ORDER.flatMap(
            (category) => FOOTWEAR_SUB_CATEGORY_BY_L1[category] || [],
        ),
    ),
);

const l2ToL1Map = new Map<string, FootwearCategoryL1>();
Object.entries(taxonomySubCategoryByL1).forEach(([categoryL1, subCategories]) => {
    subCategories.forEach((subCategory) => {
        l2ToL1Map.set(subCategory, categoryL1);
    });
});

const l1Rules: L1Rule[] = taxonomyCoreOrder.map((categoryL1) => ({
    l1: categoryL1,
    keywords: Array.from(
        new Set([
            categoryL1,
            ...(taxonomySubCategoryByL1[categoryL1] || []),
            ...(l1ExtraKeywords[categoryL1] || []),
        ]),
    ),
}));

const defaultL2ByL1: Record<string, string> = {};
Object.entries(taxonomySubCategoryByL1).forEach(([categoryL1, subCategories]) => {
    defaultL2ByL1[categoryL1] = subCategories[0] || '其他';
});
defaultL2ByL1.其他 = '其他';

function normalizeText(value: unknown) {
    return String(value || '')
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/[-_/]/g, '');
}

function findL1ByText(text: string): FootwearCategoryL1 | null {
    const normalized = normalizeText(text);
    if (!normalized) return null;

    const matched = l1Rules.find((rule) =>
        rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
    );
    return matched?.l1 ?? null;
}

function resolveL2ByL1(
    categoryL1: FootwearCategoryL1,
    sourceText: string,
    preferredL2?: string,
): string {
    const options = FOOTWEAR_SUB_CATEGORY_BY_L1[categoryL1] || [];
    if (options.length === 0) return '其他';

    const preferred = String(preferredL2 || '').trim();
    if (preferred && options.includes(preferred)) return preferred;

    const normalized = normalizeText(sourceText);
    const extraMap = l2ExtraKeywords[categoryL1] || {};

    const matched = options.find((option) => {
        const keywords = [option, ...(extraMap[option] || [])];
        return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
    });

    return matched || defaultL2ByL1[categoryL1] || '其他';
}

export function resolveFootwearCategory(
    categoryName?: string,
    categoryId?: string,
    skuName?: string,
    categoryL2Raw?: string,
    productLine?: string,
): FootwearCategoryMeta {
    const rawCategory = String(categoryName || categoryId || '未定义品类').trim() || '未定义品类';

    const explicitL2Raw = String(categoryL2Raw || '').trim();
    const explicitL2 = legacyL2Alias[explicitL2Raw] || explicitL2Raw;
    const l1FromExplicitL2 = explicitL2 ? l2ToL1Map.get(explicitL2) || null : null;

    const rawL1 = String(categoryName || categoryId || '').trim();
    const normalizedL1 = legacyL1Alias[rawL1] || (taxonomyCoreSet.has(rawL1) ? rawL1 : '');

    const productLineKey = String(productLine || '').trim();
    const productLineMeta = productLineAlias[productLineKey];

    const source = `${categoryName || ''} ${categoryId || ''} ${skuName || ''} ${productLine || ''}`;
    const l1FromText = findL1ByText(source);

    const categoryL1 =
        l1FromExplicitL2 ||
        normalizedL1 ||
        l1FromText ||
        productLineMeta?.l1 ||
        defaultFallbackL1 ||
        '其他';

    const hasExplicitL2 = explicitL2.length > 0 && (FOOTWEAR_SUB_CATEGORY_BY_L1[categoryL1] || []).includes(explicitL2);
    const categoryL2 = hasExplicitL2
        ? explicitL2
        : resolveL2ByL1(categoryL1, source, productLineMeta?.l2);

    return {
        rawCategory,
        categoryL1,
        categoryL2,
        matched: Boolean(l1FromExplicitL2 || normalizedL1 || l1FromText || productLineMeta),
    };
}

export function matchCategoryL1(
    filterCategory: string | 'all',
    categoryName?: string,
    categoryId?: string,
    skuName?: string,
    categoryL2Raw?: string,
    productLine?: string,
) {
    if (filterCategory === 'all') return true;
    const resolved = resolveFootwearCategory(
        categoryName,
        categoryId,
        skuName,
        categoryL2Raw,
        productLine,
    );
    return resolved.categoryL1 === filterCategory;
}

export function matchCategoryL2(
    filterSubCategory: string | 'all',
    categoryName?: string,
    categoryId?: string,
    skuName?: string,
    categoryL2Raw?: string,
    productLine?: string,
) {
    if (filterSubCategory === 'all') return true;

    const directRaw = String(categoryL2Raw || '').trim();
    const directL2 = legacyL2Alias[directRaw] || directRaw;
    if (directL2 === filterSubCategory) return true;

    const resolved = resolveFootwearCategory(
        categoryName,
        categoryId,
        skuName,
        categoryL2Raw,
        productLine,
    );
    return resolved.categoryL2 === filterSubCategory;
}
