export interface FootwearCategoryHierarchyItem {
    l2: string;
    l3: string[];
}

export interface FootwearCategoryHierarchy {
    l1: '男鞋' | '女鞋' | '童鞋';
    items: FootwearCategoryHierarchyItem[];
}

const COMMON_ITEMS: FootwearCategoryHierarchyItem[] = [
    { l2: '户外鞋', l3: ['徒步登山', '溯溪鞋', '越野鞋', '潮流机能'] },
    { l2: '休闲/街头', l3: ['板鞋', '老爹鞋', '德训鞋', '阿甘鞋', '帆布鞋'] },
    { l2: '时尚/通勤', l3: ['浅口单鞋', '芭蕾舞鞋', '玛丽珍鞋'] },
    { l2: '正装/通勤', l3: ['乐福鞋', '牛津鞋', '德比鞋', '豆豆鞋', '穆勒鞋'] },
    { l2: '靴类', l3: ['裸靴', '切尔西靴', '马丁靴', '长筒靴', '雪地靴', '短靴'] },
    { l2: '凉拖鞋', l3: ['凉鞋', '洞洞鞋', '拖鞋', '前空鞋', '中空鞋', '后空鞋'] },
    { l2: '配件', l3: ['鞋垫', '鞋带', '袜品'] },
];

export const FOOTWEAR_CATEGORY_HIERARCHY: FootwearCategoryHierarchy[] = [
    {
        l1: '男鞋',
        items: COMMON_ITEMS,
    },
    {
        l1: '女鞋',
        items: COMMON_ITEMS,
    },
    {
        l1: '童鞋',
        items: [
            { l2: '休闲/街头', l3: ['板鞋', '德训鞋', '帆布鞋'] },
            { l2: '户外鞋', l3: ['徒步登山', '越野鞋'] },
            { l2: '靴类', l3: ['短靴', '雨靴', '雪地靴'] },
            { l2: '凉拖鞋', l3: ['凉鞋', '洞洞鞋', '拖鞋'] },
            { l2: '配件', l3: ['鞋垫', '鞋带', '袜品'] },
        ],
    },
];

export interface FootwearAttributeTagGroup {
    group: string;
    tags: string[];
}

export const FOOTWEAR_PUBLIC_ATTRIBUTE_TAGS: FootwearAttributeTagGroup[] = [
    { group: '帮面高度', tags: ['低帮', '中帮', '高帮'] },
    { group: '闭合方式', tags: ['绑带', '魔术贴', '一脚蹬', '侧拉链', '旋钮'] },
    { group: '底型/跟型', tags: ['平底', '厚底', '坡跟', '粗跟', '细跟', '异形跟'] },
    { group: '鞋头形状', tags: ['圆头', '方头', '尖头'] },
    { group: '鞋跟高度', tags: ['低跟', '中跟', '高跟'] },
];

export interface FootwearSceneCategoryPick {
    scene: string;
    l1Focus: Array<'男鞋' | '女鞋' | '童鞋'>;
    l2Recommended: string[];
    l3Recommended: string[];
    notes: string;
}

export const FOOTWEAR_SCENE_CATEGORY_PICKS: FootwearSceneCategoryPick[] = [
    {
        scene: '通勤上班',
        l1Focus: ['男鞋', '女鞋'],
        l2Recommended: ['时尚/通勤', '正装/通勤', '休闲/街头'],
        l3Recommended: ['浅口单鞋', '玛丽珍鞋', '乐福鞋', '牛津鞋', '德比鞋'],
        notes: '优先轻量、耐走、易打理，主推中价格带。',
    },
    {
        scene: '周末休闲/城市漫步',
        l1Focus: ['男鞋', '女鞋'],
        l2Recommended: ['休闲/街头', '户外鞋'],
        l3Recommended: ['板鞋', '老爹鞋', '德训鞋', '阿甘鞋', '徒步登山'],
        notes: '强调百搭与舒适，黑白灰基础色占比要稳定。',
    },
    {
        scene: '运动训练',
        l1Focus: ['男鞋', '女鞋', '童鞋'],
        l2Recommended: ['休闲/街头', '户外鞋'],
        l3Recommended: ['阿甘鞋', '德训鞋', '板鞋', '越野鞋'],
        notes: '按功能分层配货，避免训练与通勤错投。',
    },
    {
        scene: '户外轻徒步/露营',
        l1Focus: ['男鞋', '女鞋'],
        l2Recommended: ['户外鞋'],
        l3Recommended: ['徒步登山', '越野鞋', '潮流机能', '溯溪鞋'],
        notes: '重点关注抓地、防滑、防泼水与耐磨。',
    },
    {
        scene: '夏季清凉',
        l1Focus: ['男鞋', '女鞋', '童鞋'],
        l2Recommended: ['凉拖鞋'],
        l3Recommended: ['凉鞋', '洞洞鞋', '拖鞋', '前空鞋', '中空鞋', '后空鞋'],
        notes: '提升透气材质占比，控制慢销色库存。',
    },
    {
        scene: '秋冬保暖',
        l1Focus: ['男鞋', '女鞋'],
        l2Recommended: ['靴类'],
        l3Recommended: ['切尔西靴', '马丁靴', '雪地靴', '短靴'],
        notes: '北方区域前置上市节奏，优先深度而非过宽SKU。',
    },
    {
        scene: '校园通学',
        l1Focus: ['童鞋'],
        l2Recommended: ['休闲/街头', '靴类', '凉拖鞋'],
        l3Recommended: ['板鞋', '德训鞋', '短靴', '凉鞋'],
        notes: '强调轻便耐穿与防滑，尺码结构完整优先。',
    },
    {
        scene: '商务会务/正装',
        l1Focus: ['男鞋', '女鞋'],
        l2Recommended: ['正装/通勤'],
        l3Recommended: ['牛津鞋', '德比鞋', '乐福鞋', '穆勒鞋'],
        notes: '保证核心色与基础楦型不断码，控制折扣深度。',
    },
];
