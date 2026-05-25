export interface TrendSourceFactor {
    id: string;
    name: string;          // 政治/科技/艺术/文化思潮/经济/生活行为/哲学/宗教
    icon: string;
    footwearImpact: string; // 本季对鞋类的影响
    heatScore: number;      // 1-10
}

export type TrendStatus = '主推' | '辅助' | '快反测试' | '观望' | '放弃';

export interface MacroTrend {
    id: string;
    name: string;           // e.g. 城市自然主义
    subtitle: string;
    tagColor: string;       // Tailwind bg class e.g. 'bg-emerald-100'
    tagTextColor: string;   // Tailwind text class
    coverImage?: string;
    moodImages?: TrendVisualImage[];
    keyWords: string[];
    shoeTypeApplication: string[];
    designSuggestion: string;
    defaultStatus: TrendStatus;
    priority: 'H' | 'M' | 'L';
}

export interface TrendVisualImage {
    url: string;
    label: string;
    layer: '趋势证据' | '色彩情绪' | '材料肌理' | '鞋类转译' | '生活方式' | '竞品参考';
    note?: string;
}

export type ColorRole = '主推色' | '基础色' | '撞色' | '点缀色';

export interface ColorSwatch {
    id: string;
    hex: string;
    name: string;
    role: ColorRole;
    usageSuggestion: string;  // 上鞋色/外底色/配件色
}

export interface SilhouetteDirection {
    id: string;
    dimension: string;     // 底厚 | 楦型 | 帮高 | 整体廓形
    trendDirection: string;
    keyPoints: string[];
    brandRecommendation: string;
}

export interface MaterialDirection {
    id: string;
    materialType: string;
    trendSignal: '上升' | '稳定' | '下降';
    description: string;
    brandApplication: string;
}

export interface PatternDetail {
    id: string;
    category: '图案' | '工艺细节' | '功能件';
    name: string;
    description: string;
    keyBrands: string[];
    shoeApplication: string;
}

export interface ShortTermHotspot {
    id: string;
    name: string;
    platform: string;
    heatLevel: '爆款' | '上升' | '观察';
    peakWindow: string;
    footwearOpportunity: string;
    referenceKeyword: string;
}

export interface TrendInfoSource {
    id: string;
    name: string;
    type: '展会' | '时装周' | '杂志' | '社媒平台' | '数据工具';
    lastChecked: string;
    note: string;
}

// ─── 趋势转译工作台扩展类型 ──────────────────────────────────────────────────────

export interface VisualLanguage {
    styleKeywords: string[];
    colors: string[];
    colorRatio: string;
    materials: string[];
    silhouettes: string[];
    structures: string[];
    patterns: string[];
    details: string[];
    functions: string[];
    emotions: string[];
}

export interface FootwearTranslation {
    categories: string[];
    lastShapes: string[];
    toeShapes: string[];
    outsoleDirections: string[];
    outsolePatterns: string[];
    midsoleMaterials: string[];
    upperMaterials: string[];
    upperStructures: string[];
    laceAndClosure: string[];
    detailApplications: string[];
    productRoles: string[];
}

export interface TrendPlanningItem {
    brand: string;
    season: string;
    category: string;
    wave: string;
    productRole: string;
    suggestedStyleCount: number;
    priceBand: string;
    channel: string;
    skuDepth: string;
    enterOtb: boolean;
    risk: 'low' | 'medium' | 'high';
    action: string;
}

export interface TrendDesignOutput {
    themeStory: string;
    keywords: string[];
    colorDirection: string[];
    materialDirection: string[];
    silhouetteDirection: string[];
    outsoleDirection: string[];
    detailDirection: string[];
    aiPrompt: string;
    tasks: string[];
    reviewCriteria: string[];
}

export interface TrendFitScore {
    brandFit: number;           // 0-10
    conversionPotential: number; // 0-10
    designInnovation: number;    // 0-10
    landingRisk: number;         // 0-10（越高越险）
    overall: number;             // 综合分
    recommendation: TrendStatus;
}

export type TrendCycle = '季节性' | '跨季' | '年度' | '快反';
export type TrendType = '宏观趋势' | '短时流行' | '材料趋势' | '设计细节';
export type TrendSourceType = '展会' | '社媒平台' | '数据工具' | '时装周' | '杂志';

export interface TrendVisualElement {
    id: string;
    title: string;
    image: string;
    tags: string[];
    description: string;
    visualSignal: string;
    footwearApplication: string;
    suitableCategories: string[];
    productRole: string;
    risk?: 'low' | 'medium' | 'high';
}

export interface TrendTheme extends MacroTrend {
    trendType: TrendType;
    trendCycle: TrendCycle;
    sourceType: TrendSourceType;
    adaptStatus: TrendStatus;
    visualLanguage: VisualLanguage;
    footwearTranslation: FootwearTranslation;
    planningOutput: TrendPlanningItem[];
    designOutput: TrendDesignOutput;
    fitScores: TrendFitScore;
    colorElements?: TrendVisualElement[];
    materialElements?: TrendVisualElement[];
    patternElements?: TrendVisualElement[];
    silhouetteElements?: TrendVisualElement[];
    detailElements?: TrendVisualElement[];
}

export interface TrendFilterState {
    trendSource: TrendSourceType | '';
    trendCycle: TrendCycle | '';
    trendType: TrendType | '';
    adaptStatus: TrendStatus | '';
}
