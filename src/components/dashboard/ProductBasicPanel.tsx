'use client';

import { useMemo, useState } from 'react';
import MerchSectionDivider from './MerchSectionDivider';
import FloatingModuleNav from '@/components/design-review-center/floating-module-nav';
import { buildMerchModuleLinks } from '@/config/dashboard/merch-module-links';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import { useProductAnalysis } from '@/hooks/useProductAnalysis';
import ConsumerPreferenceRadar from '@/components/dashboard/channel/ConsumerPreferenceRadar';

// ── 新增类型定义 ───────────────────────────────────────────────────────────────
type SegmentPriority = 'P0重点投入' | 'P1增长观察' | 'P2小批量测试' | 'P3收缩投入';
type ActionStatus = '建议中' | '待审批' | '执行中' | '已完成' | '已关闭';
type RiskLevel = 'low' | 'medium' | 'high';
type DesignDirection = '延续开发' | '加大开发' | '小批量测试' | '减少开发' | '停止开发';

interface SegmentValueRankingItem {
    segmentId: string;
    segmentName: string;
    salesAmount: number;
    salesContribution: number;
    grossMargin: number;
    repeatRate: number;
    averageOrderValue: number;
    returnRate: number;
    growthRate: number;
    inventoryRisk: RiskLevel;
    segmentPriority: SegmentPriority;
}

interface SegmentProductFitItem {
    segmentId: string;
    segmentName: string;
    recommendedCategory: string;
    recommendedShoeType: string;
    recommendedPriceBand: string;
    recommendedColor: string;
    recommendedMaterial: string;
    recommendedFunction: string;
    recommendedSkuCount: number;
    recommendedWave: string;
    recommendedChannel: string;
    fitScore: number; // 0-100
}

interface ConsumerAction {
    id: string;
    segment: string;
    issue: string;
    insight: string;
    productSuggestion: string;
    designSuggestion: string;
    priceSuggestion: string;
    channelSuggestion: string;
    expectedSalesImpact: string;
    expectedMarginImpact: string;
    expectedInventoryImpact: string;
    expectedOtbImpact: string;
    actionButtons: Array<{ label: string; tab: string }>;
    relatedModule: string;
    moduleTab: string;
    status: ActionStatus;
    priority: 'P0' | 'P1' | 'P2';
}

interface DesignInputItem {
    segmentId: string;
    segmentName: string;
    aestheticKeywords: string;
    shoeTypePreference: string;
    lastType: string;          // 楦型偏好
    soleStructure: string;     // 鞋底结构
    colorPreference: string;
    materialPreference: string;
    footFeel: string;          // 脚感诉求
    wearingMethod: string;     // 穿脱方式
    weightSense: string;       // 重量感
    funcTags: string[];        // 功能标签
    functionNeed: string;
    wearingScenario: string;
    competitorRef: string;
    designSuggestion: string;
    avoidDirection: string;
    direction: DesignDirection;
}

interface PainPointFeatureItem {
    painPoint: string;
    segment: string;
    scenario: string;
    feature: string;
    designImpl: string;
    productSuggestion: string;
    riskLevel: RiskLevel;
    priority: 'P0' | 'P1' | 'P2';
}

interface ConsumerJourneyItem {
    stage: string;
    keyQuestion: string;
    contentNeed: string;
    productCallout: string;
    mainChannel: string;
    conversionBarrier: string;
    optimizationSuggestion: string;
}

interface ContentChannelItem {
    segmentId: string;
    segmentName: string;
    preferredChannel: string;
    contentFormat: string;
    calloutFocus: string;
    platformPreference: string;
    touchCost: string;
    conversionRate: string;
    contentDirection: string;
}

// ── Mock 业务数据 ──────────────────────────────────────────────────────────────
const SEGMENT_VALUE_RANKING: SegmentValueRankingItem[] = [
    { segmentId: 'seg-26-35', segmentName: '品质通勤者', salesAmount: 4200000, salesContribution: 0.38, grossMargin: 0.52, repeatRate: 0.34, averageOrderValue: 689, returnRate: 0.08, growthRate: 0.12, inventoryRisk: 'low', segmentPriority: 'P0重点投入' },
    { segmentId: 'seg-18-25', segmentName: '新潮探索者', salesAmount: 3100000, salesContribution: 0.28, grossMargin: 0.44, repeatRate: 0.18, averageOrderValue: 428, returnRate: 0.14, growthRate: 0.22, inventoryRisk: 'medium', segmentPriority: 'P1增长观察' },
    { segmentId: 'seg-36-45', segmentName: '精致品味者', salesAmount: 2600000, salesContribution: 0.24, grossMargin: 0.58, repeatRate: 0.42, averageOrderValue: 912, returnRate: 0.05, growthRate: 0.07, inventoryRisk: 'low', segmentPriority: 'P0重点投入' },
    { segmentId: 'seg-46+', segmentName: '舒适健康者', salesAmount: 1100000, salesContribution: 0.10, grossMargin: 0.48, repeatRate: 0.38, averageOrderValue: 548, returnRate: 0.06, growthRate: 0.15, inventoryRisk: 'medium', segmentPriority: 'P2小批量测试' },
];

const SEGMENT_PRODUCT_FIT: SegmentProductFitItem[] = [
    { segmentId: 'seg-26-35', segmentName: '品质通勤者', recommendedCategory: '时装休闲鞋', recommendedShoeType: '乐福 / 简约运动', recommendedPriceBand: '599-799', recommendedColor: '黑 / 米 / 驼', recommendedMaterial: '真皮 / 反绒', recommendedFunction: '轻量 · 耐磨 · 易搭配', recommendedSkuCount: 24, recommendedWave: 'SS-2A / SS-2B', recommendedChannel: '线上线下并重', fitScore: 92 },
    { segmentId: 'seg-18-25', segmentName: '新潮探索者', recommendedCategory: '运动休闲鞋', recommendedShoeType: '板鞋 / 厚底', recommendedPriceBand: '399-599', recommendedColor: '鲜色 / 撞色', recommendedMaterial: '合成革 / 网布', recommendedFunction: '廓形辨识度 · 限量配色', recommendedSkuCount: 18, recommendedWave: 'SS-1B / SS-2A', recommendedChannel: '电商 / 直播', fitScore: 85 },
    { segmentId: 'seg-36-45', segmentName: '精致品味者', recommendedCategory: '精工休闲鞋', recommendedShoeType: '正装休闲 / 牛津', recommendedPriceBand: '800+', recommendedColor: '黑 / 棕 / 深灰', recommendedMaterial: '精品皮料 / 特殊材质', recommendedFunction: '精工细节 · 材质纹理', recommendedSkuCount: 16, recommendedWave: 'SS-3A / AW-4A', recommendedChannel: '品牌直营店', fitScore: 88 },
    { segmentId: 'seg-46+', segmentName: '舒适健康者', recommendedCategory: '功能健步鞋', recommendedShoeType: '宽楦气垫 / 健步鞋', recommendedPriceBand: '599-799', recommendedColor: '深色 / 中性色', recommendedMaterial: '轻量材料 / 舒适内里', recommendedFunction: '足弓支撑 · 防滑 · 轻量', recommendedSkuCount: 12, recommendedWave: 'AW-4B / AW-5A', recommendedChannel: '线下社区门店', fitScore: 78 },
];

const CONSUMER_ACTIONS: ConsumerAction[] = [
    { id: 'ca-01', segment: '品质通勤者 (26-35)', issue: '599-799 价格带缺乏差异化', insight: '该客群毛利最高（52%）、复购最强（34%），但主力价带 SKU 款深不足，流失率偏高', productSuggestion: '增加乐福 / 简约运动类型 4-6 款，主推 599-799 段', designSuggestion: '聚焦真皮材质 + 易搭配低饱和配色，加强楦型修饰脚型', priceSuggestion: '主力价 699，升级款 799，会员专享 750', channelSuggestion: '线下直营店首发，配合私域提前预热', expectedSalesImpact: '+¥80-120万', expectedMarginImpact: '+1.5-2pp', expectedInventoryImpact: '低风险（复购人群回购快）', expectedOtbImpact: '建议追加 OTB ¥80万，集中在 SS-2B 波段', actionButtons: [{ label: '调整品类结构', tab: 'category' }, { label: '调整OTB', tab: 'otb' }, { label: '生成设计Brief', tab: 'planning' }], relatedModule: '品类运营', moduleTab: 'category', status: '建议中', priority: 'P0' },
    { id: 'ca-02', segment: '新潮探索者 (18-25)', issue: '退货率 14% 偏高、首单转化不稳', insight: '该客群增长最快（22%），但受 KOL 种草驱动强，退货主因为"看图与实物有差距"', productSuggestion: '限量配色前置小批量（50-100双），跑通后追单，减少大货风险', designSuggestion: '提高产品展示图标准，鞋面纹理与配色实拍还原度提高', priceSuggestion: '限量款维持 499-599，基础款守住 399', channelSuggestion: '抖音 / 小红书预热，直播间专属首发', expectedSalesImpact: '+¥40-60万', expectedMarginImpact: '退货率降低至 10% 后毛利 +0.8pp', expectedInventoryImpact: '中风险（依赖快返机制）', expectedOtbImpact: '预留 10-15% 快返 OTB，避免大货压货', actionButtons: [{ label: '生成波段Brief', tab: 'planning' }, { label: '查看销售预测', tab: 'forecast' }, { label: '查看竞品趋势', tab: 'competitor' }], relatedModule: '波段企划', moduleTab: 'planning', status: '建议中', priority: 'P0' },
    { id: 'ca-03', segment: '精致品味者 (36-45)', issue: '高价带 800+ 款式数量不足', insight: '该客群毛利率最高（58%），复购率 42%，但 800+ 价位 SKU 仅 3 款，无法满足需求', productSuggestion: '增加精工休闲系列 3-4 款，设置年度形象款 1-2 款', designSuggestion: '导入特殊皮料纹理 + 五金件工艺，强化精工质感', priceSuggestion: '形象款不设折扣，维持全价销售', channelSuggestion: '线下直营旗舰首发，VIP 专属品鉴会', expectedSalesImpact: '+¥60-90万', expectedMarginImpact: '+2-3pp 高毛利贡献', expectedInventoryImpact: '低风险（小批量限定）', expectedOtbImpact: '形象款单款备货 ≤150双，OTB 约 ¥50-80万', actionButtons: [{ label: '生成设计Brief', tab: 'planning' }, { label: '调整OTB', tab: 'otb' }, { label: '生成波段Brief', tab: 'planning' }], relatedModule: '设计计划', moduleTab: 'planning', status: '待审批', priority: 'P0' },
    { id: 'ca-04', segment: '舒适健康者 (46+)', issue: '宽楦功能款覆盖不足', insight: '46+ 客群增速 15%，但现有宽楦 SKU 仅 2 款，大码（43+）经常断货', productSuggestion: '增加宽楦健步系列 4-6 款，电商专供大码快返', designSuggestion: '足弓支撑 + 宽前掌楦型开发，聚焦轻量减震功能', priceSuggestion: '功能款定价 599-699，不参与常规折扣', channelSuggestion: '线下社区门店陈列强化，老年客户口碑运营', expectedSalesImpact: '+¥30-50万', expectedMarginImpact: '+0.5pp', expectedInventoryImpact: '中风险（需跑通需求量）', expectedOtbImpact: 'AW-4B 新增 ¥30万 OTB，功能款为主', actionButtons: [{ label: '调整OTB', tab: 'otb' }, { label: '调整品类结构', tab: 'category' }, { label: '查看销售预测', tab: 'forecast' }], relatedModule: 'OTB预算', moduleTab: 'otb', status: '建议中', priority: 'P1' },
    { id: 'ca-05', segment: '全人群', issue: '黑色 / 白色 / 灰色基础色盘款深不足', insight: '基础色盘贡献约 55% 销售，但断货频次高于季末目标 2x', productSuggestion: '核心色增加 20% 款深备货，缩短补货周期至 2 周', designSuggestion: '简洁鞋面 + 经典楦型，控制工艺成本提升毛利', priceSuggestion: '基础款稳定定价，不做低价引流', channelSuggestion: '全渠道标配铺货，不限渠道', expectedSalesImpact: '减少断货损失 ¥50-80万', expectedMarginImpact: '+0.5pp', expectedInventoryImpact: '低风险', expectedOtbImpact: '核心色追加 20% 备货 OTB，约 ¥40-60万', actionButtons: [{ label: '调整品类结构', tab: 'category' }, { label: '调整OTB', tab: 'otb' }], relatedModule: '品类运营', moduleTab: 'category', status: '执行中', priority: 'P1' },
    { id: 'ca-06', segment: '新潮探索者 (18-25)', issue: '小红书 / 抖音内容种草与商品承接脱节', insight: '18-25 客群 72% 线上购买，但 KOL 种草后搜索转化率仅 18%', productSuggestion: '设置专属"直播首发"款，与 KOL 内容同步上架', designSuggestion: '强化辨识度卖点：廓形、配色、限量故事', priceSuggestion: '直播间专属折扣 9 折，但不做全网最低价', channelSuggestion: '抖音 / 小红书 KOL 矩阵，配合私域留存', expectedSalesImpact: '+¥25-40万', expectedMarginImpact: '持平（折扣中性）', expectedInventoryImpact: '中风险（需准备快返库存）', expectedOtbImpact: '快返库存预留 ¥20-30万，首批小单', actionButtons: [{ label: '查看销售预测', tab: 'forecast' }, { label: '查看竞品趋势', tab: 'competitor' }], relatedModule: '销售预测', moduleTab: 'forecast', status: '建议中', priority: 'P2' },
];

const DESIGN_INPUT_DATA: DesignInputItem[] = [
    { segmentId: 'seg-26-35', segmentName: '品质通勤者', aestheticKeywords: '简约精致 / 高级感 / 低调奢华', shoeTypePreference: '乐福鞋 / 简约运动鞋 / 时装休闲', lastType: '修身中楦（标准 E 楦）/ 微尖头楦', soleStructure: 'TPR+EVA 复合底，耐磨橡胶贴底', colorPreference: '黑 / 白 / 米 / 驼 / 深灰', materialPreference: '头层牛皮 / 反绒 / 高质感合成革', footFeel: '软弹中底 · 全日舒适 · 脚踝贴合', wearingMethod: '系带 / 套脚乐福 / 侧拉链', weightSense: '目标重量 ≤280g（女） / ≤320g（男）', funcTags: ['轻量', '耐磨', '透气', '回弹'], functionNeed: '轻量 · 耐磨 · 透气 · 回弹中底', wearingScenario: '通勤上班 · 周末轻运动 · 客户见面', competitorRef: '万斯 Authentic / New Balance 990 / ECCO', designSuggestion: '精选 2-3 个主力楦型做深，配色以低饱和为主，强调材质质感与车线细节', avoidDirection: '过于运动 / 厚底夸张 / 鲜艳配色 / 复杂装饰', direction: '加大开发' },
    { segmentId: 'seg-18-25', segmentName: '新潮探索者', aestheticKeywords: '潮流先锋 / 廓形感 / 色彩碰撞', shoeTypePreference: '板鞋 / 厚底老爹鞋 / 复古运动', lastType: '宽头厚底楦 / 复古圆头楦', soleStructure: '厚EVA大底 / 异形外底 / 橡胶增高底', colorPreference: '鲜色 / 撞色 / 限量特殊配色', materialPreference: '合成革 / 纺织面料 / 环保材料', footFeel: '轻量上脚 · 有一定底感 · 不过软', wearingMethod: '系带（装饰性）/ 侧拉链', weightSense: '可接受 ≤320g，廓形重要性>轻量', funcTags: ['增高', '廓形辨识度', '防滑'], functionNeed: '廓形辨识度 · 限量感 · 轻量上脚', wearingScenario: '校园 · 潮流打卡 · 社交出行', competitorRef: 'Converse / Vans / Nike SB Dunk', designSuggestion: '每季推出 2-3 个限量配色故事，配合 KOL 共创，前置 100 双试水再追单', avoidDirection: '过于朴素 / 成熟稳重 / 无辨识度 / 大众常规款', direction: '小批量测试' },
    { segmentId: 'seg-36-45', segmentName: '精致品味者', aestheticKeywords: '考究精工 / 低调品味 / 商务休闲', shoeTypePreference: '正装休闲 / 牛津鞋 / 精工休闲鞋', lastType: '修身尖头楦 / 精工中楦（窄E）', soleStructure: '皮质贴底+橡胶防滑贴片 / 精品橡胶大底', colorPreference: '黑 / 棕 / 深棕 / 卡其 / 深灰', materialPreference: '精品皮料 / 特殊皮纹 / 高端内里', footFeel: '脚感贴合 · 不过软 · 精工脚弓承托', wearingMethod: '系带（正装）/ 孟克扣 / 切尔西拉链', weightSense: '目标重量 ≤350g，质感优先于轻量', funcTags: ['精工细节', '耐磨', '软弹'], functionNeed: '精工细节 · 楦型修饰脚型 · 全日舒适', wearingScenario: '商务见面 · 品质通勤 · 重要场合', competitorRef: 'Clarks / Cole Haan / Church\'s', designSuggestion: '引入 1-2 款年度形象款（不限折扣），每季配套精品礼盒，强化品牌精致感', avoidDirection: '过于运动 / 休闲随意 / 材质感弱 / 无设计细节', direction: '加大开发' },
    { segmentId: 'seg-46+', segmentName: '舒适健康者', aestheticKeywords: '舒适实用 / 经典稳重 / 功能至上', shoeTypePreference: '宽楦健步鞋 / 气垫休闲 / 易穿脱款', lastType: '宽楦圆头（EE-EEE 楦）/ 大码专用楦', soleStructure: '厚EVA减震中底 + 深纹防滑橡胶大底', colorPreference: '深色 / 中性色 / 低调彩色', materialPreference: '轻量 EVA 底 / 柔软内里 / 防水材料', footFeel: '软弹减震 · 足弓支撑 · 宽前掌无压迫', wearingMethod: '松紧带 / 魔术贴 / 套脚（易穿脱优先）', weightSense: '轻量优先，目标 ≤260g（女） / ≤310g（男）', funcTags: ['足弓支撑', '防滑', '轻量', '软弹', '透气'], functionNeed: '足弓支撑 · 防滑 · 轻量 · 宽前掌 · 易穿脱', wearingScenario: '日常健走 · 买菜社区 · 旅游出行', competitorRef: 'Skechers / Clarks / 李宁健步系列', designSuggestion: '独立开发宽楦楦型（前掌+5mm），配套足弓支撑鞋垫，开发大码电商专供款', avoidDirection: '过于时尚 / 鞋底过薄 / 穿脱复杂 / 重量超 350g', direction: '延续开发' },
];

const PAIN_POINT_FEATURES: PainPointFeatureItem[] = [
    { painPoint: '久站脚累 / 足底疼痛', segment: '品质通勤者、舒适健康者', scenario: '长时间通勤 / 站立工作', feature: '软弹中底 + 足弓支撑 + 回弹垫', designImpl: 'EVA/PU 复合中底，内置足弓支撑板，前掌减震槽', productSuggestion: '通勤鞋系列标配舒适技术，作为主要卖点', riskLevel: 'low', priority: 'P0' },
    { painPoint: '雨天打滑 / 湿地不防滑', segment: '舒适健康者、品质通勤者', scenario: '雨天 / 光滑地面', feature: '防滑橡胶大底 + 深纹路防水处理', designImpl: '定向防滑纹路大底，关键部位橡胶加固', productSuggestion: '健步鞋 / 通勤鞋系列标注防滑等级', riskLevel: 'low', priority: 'P0' },
    { painPoint: '通勤鞋不百搭 / 难搭配', segment: '品质通勤者 (26-35)', scenario: '通勤 / 日常穿搭', feature: '简洁鞋面 + 低饱和配色 + 经典楦型', designImpl: '简约鞋面设计，黑白米驼为主，避免过多装饰', productSuggestion: '主推"百搭通勤"系列，强化搭配场景图', riskLevel: 'low', priority: 'P1' },
    { painPoint: '鞋子太重 / 穿一天腿酸', segment: '新潮探索者、品质通勤者', scenario: '长时间步行 / 通勤', feature: '轻量材料 + 大底减重 + 镂空鞋底', designImpl: '泡棉中底减重，大底局部镂空，鞋面轻薄面料', productSuggestion: '列明鞋重（目标 <260g 女款，<300g 男款）作为卖点', riskLevel: 'medium', priority: 'P0' },
    { painPoint: '尺码不准 / 买错退换', segment: '全人群', scenario: '线上下单选码', feature: '精准楦型 + 半码可选 + AI 尺码推荐', designImpl: '标注楦型宽窄（标准/宽楦），提供脚长-推荐码对照表', productSuggestion: '商品详情页置顶尺码指南 + 真人穿着尺码参考', riskLevel: 'high', priority: 'P0' },
    { painPoint: '磨脚 / 脚背压迫', segment: '精致品味者、品质通勤者', scenario: '新鞋磨合期', feature: '柔软内里 + 弹力材质脚背区 + 圆弧收口', designImpl: '脚背高风险区使用弹力面料，内里加柔软衬垫', productSuggestion: '上市 2 周监控磨脚退换率，超 5% 即时预警', riskLevel: 'high', priority: 'P0' },
    { painPoint: '限量款买不到', segment: '新潮探索者 (18-25)', scenario: '新品发售', feature: '小批量预售 + 抽签购买 + 会员优先购', designImpl: '直播预售机制 + 会员积分优先购买权', productSuggestion: '每季设 1-2 款"会员专享"款，增强会员价值感知', riskLevel: 'medium', priority: 'P2' },
];

const CONSUMER_JOURNEY: ConsumerJourneyItem[] = [
    { stage: '种草', keyQuestion: '为什么会关注这双鞋？', contentNeed: 'KOL 穿搭种草 · 场景化生活方式', productCallout: '外观辨识度 / 配色故事 / 品牌调性', mainChannel: '小红书 / 抖音 / 微信朋友圈', conversionBarrier: '内容与产品脱节，看图与实物有差距', optimizationSuggestion: '提升产品拍摄标准，KOL 内容与商品页同步，减少预期差' },
    { stage: '搜索', keyQuestion: '在哪里找到更多信息？', contentNeed: '产品评测 / 对比内容 / 尺码指南', productCallout: '材质 / 舒适度 / 耐久性', mainChannel: '品牌官网 / 电商平台 / 百度搜索', conversionBarrier: '搜索结果品牌形象弱，被竞品截流', optimizationSuggestion: '强化品牌词 SEO，在搜索结果页投放精准关键词' },
    { stage: '试穿', keyQuestion: '穿上是否符合预期？', contentNeed: '试穿体验分享 / 脚型适配说明', productCallout: '脚感 / 重量 / 楦型贴合度', mainChannel: '线下门店', conversionBarrier: '门店导购引导不足，缺乏功能技术讲解', optimizationSuggestion: '导购培训：掌握核心卖点 + 脚型诊断 + 场景化推荐' },
    { stage: '比价', keyQuestion: '价格是否合理？', contentNeed: '品质对比 / 价值感知内容', productCallout: '材质工艺 / 品牌溢价 / 服务保障', mainChannel: '电商平台 / 比价 App', conversionBarrier: '缺乏品牌价值感建立，陷入价格战', optimizationSuggestion: '在商品页突出工艺细节和测试数据，建立价值锚点' },
    { stage: '购买', keyQuestion: '最终在哪里买？', contentNeed: '促销信息 / 会员权益说明', productCallout: '正品保障 / 服务政策 / 限量稀缺', mainChannel: '电商 / 直播 / 线下门店', conversionBarrier: '结账流程复杂，优惠门槛不清晰', optimizationSuggestion: '简化结账流程，会员折扣前置显示，减少购买决策摩擦' },
    { stage: '复购', keyQuestion: '下次还会再买吗？', contentNeed: '会员专属内容 / 新品预览', productCallout: '新款上市 / 会员积分 / 专属优惠', mainChannel: '微信私域 / 会员 App', conversionBarrier: '无会员体系沉淀，复购完全靠产品力', optimizationSuggestion: '建立分级会员体系，26-35 客群重点运营，提供专属新品预览' },
    { stage: '评价', keyQuestion: '这次购买值得吗？', contentNeed: '售后关怀 / 使用贴士分享', productCallout: '耐用性 / 实际穿着效果', mainChannel: '电商平台评价区 / 小红书 UGC', conversionBarrier: '差评未及时响应，影响新客转化', optimizationSuggestion: '48 小时内回复差评，提供补救方案，将差评转化为品牌口碑' },
    { stage: '退货', keyQuestion: '退货流程顺畅吗？', contentNeed: '退换政策说明 / 尺码重新建议', productCallout: '服务保障 / 品牌信任', mainChannel: '客服 / 门店 / 快递', conversionBarrier: '退货流程繁琐，降低下次购买意愿', optimizationSuggestion: '优化退货体验，退货同时推送尺码建议，减少永久流失' },
];

const CONTENT_CHANNEL_DATA: ContentChannelItem[] = [
    { segmentId: 'seg-18-25', segmentName: '新潮探索者', preferredChannel: '抖音 / 小红书 / 电商直播', contentFormat: '短视频穿搭 / KOL 种草图文 / 直播发售', calloutFocus: '廓形辨识度 / 限量配色 / 潮流联名', platformPreference: '抖音 72%，小红书 65%', touchCost: '中（KOL 费用高）', conversionRate: '18-22%', contentDirection: '限量故事 + 穿搭达人 + 直播专属首发' },
    { segmentId: 'seg-26-35', segmentName: '品质通勤者', preferredChannel: '电商平台 / 品牌官网 / 线下门店', contentFormat: '产品详情深度内容 / 对比评测 / 通勤穿搭', calloutFocus: '材质质感 / 脚感舒适 / 百搭易配', platformPreference: '电商 54%，线下 38%', touchCost: '低（精准搜索流量）', conversionRate: '35-42%', contentDirection: '材质工艺解析 + 真实通勤场景 + 专业评测' },
    { segmentId: 'seg-36-45', segmentName: '精致品味者', preferredChannel: '线下旗舰店 / 品牌直营 / 私域', contentFormat: 'VIP 品鉴 / 精品图文 / 门店活动', calloutFocus: '品牌故事 / 工艺精工 / 限定品质', platformPreference: '线下 63%，私域 28%', touchCost: '高（线下运营成本）', conversionRate: '55-65%', contentDirection: 'VIP 专属活动 + 精工工艺故事 + 会员先享服务' },
    { segmentId: 'seg-46+', segmentName: '舒适健康者', preferredChannel: '线下社区门店 / 口碑推荐 / 子女渠道', contentFormat: '功能演示 / 实用性内容 / 健康生活方式', calloutFocus: '舒适功能 / 防滑安全 / 轻便好穿', platformPreference: '线下 78%，微信 45%', touchCost: '低（口碑裂变）', conversionRate: '40-50%', contentDirection: '功能科普视频 + 老年生活方式 + 熟人推荐奖励' },
];

// ── 原有类型 ─────────────────────────────────────────────────────────────────
type AgeHeatMetric = 'net_sales' | 'sell_through' | 'gm_rate';
type TreemapAreaMetric = 'net_sales' | 'pairs_sold';
type TreemapColorMetric = 'sell_through' | 'gm_rate';
type ColorQuadrantKey = 'highEffHighSt' | 'highEffLowSt' | 'lowEffHighSt' | 'lowEffLowSt';

// ── 业务参考数据 ──────────────────────────────────────────────────────────────
const AGE_COLORS: Record<string, string> = {
    '18-25': '#38BDF8',
    '26-35': '#2563EB',
    '36-45': '#7C3AED',
    '46+': '#C026D3',
    '未知': '#94A3B8',
};

const COLOR_FAMILY_COLORS: Record<string, string> = {
    '黑色': '#1E293B', '白色': '#F8FAFC', '灰色': '#94A3B8', '米色': '#D4C5B9',
    '棕色': '#92400E', '卡其': '#A16207', '驼色': '#C2A679', '红色': '#DC2626',
    '粉色': '#EC4899', '橙色': '#F97316', '黄色': '#EAB308', '绿色': '#16A34A',
    '蓝色': '#2563EB', '紫色': '#9333EA', '彩色·鲜': '#10B981', '彩色·柔': '#F472B6',
    '中性色': '#78716C', '金属色': '#A8A29E',
};

interface PersonaConfig {
    name: string;
    scenario: string;
    shoeType: string;
    colorHint: string;
    channelMain: string;
    onlineShare: number;
    buyTrigger: string;
    repurchaseHint: string;
    sizeFocus: string;
    designFocus: string;
    badgeColor: string;
}

const PERSONA_CONFIG: Record<string, PersonaConfig> = {
    '18-25': {
        name: '新潮探索者',
        scenario: '校园 · 社交 · 潮流运动',
        shoeType: '板鞋 / 厚底 / 运动休闲',
        colorHint: '鲜色 / 限量配色 / 撞色',
        channelMain: '电商 · 直播',
        onlineShare: 0.72,
        buyTrigger: 'KOL种草 / 短视频发现',
        repurchaseHint: '拉新为主，重首单体验',
        sizeFocus: '标准码（37-40 女 / 40-43 男）',
        designFocus: '廓形辨识度、限量配色、新楦型首发试水',
        badgeColor: 'border-sky-300 bg-sky-50 text-sky-800',
    },
    '26-35': {
        name: '品质通勤者',
        scenario: '通勤 · 周末 · 轻运动',
        shoeType: '乐福 / 简约运动 / 时装休闲',
        colorHint: '黑 / 白 / 米 / 驼色',
        channelMain: '线上线下并重',
        onlineShare: 0.54,
        buyTrigger: '口碑搜索 + 终端试穿',
        repurchaseHint: '高复购潜力，会员运营优先',
        sizeFocus: '宽楦 / 标准楦（38-42 女 / 41-44 男）',
        designFocus: '易搭配、显脚型、材质质感、轻量舒适',
        badgeColor: 'border-blue-300 bg-blue-50 text-blue-800',
    },
    '36-45': {
        name: '精致品味者',
        scenario: '品质通勤 · 时装 · 商务',
        shoeType: '正装休闲 / 牛津 / 精工休闲鞋',
        colorHint: '黑 / 棕 / 卡其 / 深灰',
        channelMain: '品牌直营店',
        onlineShare: 0.34,
        buyTrigger: '门店导购 + 会员推荐',
        repurchaseHint: '高忠诚度，专属新品预览',
        sizeFocus: '标准到宽楦（38-43 女 / 41-45 男）',
        designFocus: '精工细节、皮料纹理、楦型修饰',
        badgeColor: 'border-violet-300 bg-violet-50 text-violet-800',
    },
    '46+': {
        name: '舒适健康者',
        scenario: '日常健走 · 功能舒适',
        shoeType: '健步鞋 / 气垫 / 宽楦舒适鞋',
        colorHint: '深色 / 中性色 / 低调彩色',
        channelMain: '线下社区门店',
        onlineShare: 0.20,
        buyTrigger: '熟人推荐 + 陈列体验',
        repurchaseHint: '强口碑驱动，舒适体验复购',
        sizeFocus: '宽楦 + 大尺码（39-44 女 / 42-46 男）',
        designFocus: '足弓支撑、防滑减震、轻量、易穿脱',
        badgeColor: 'border-purple-300 bg-purple-50 text-purple-800',
    },
};

const SIZE_INSIGHTS = [
    {
        dimension: '核心码段',
        tag: '首配优先',
        tagColor: 'bg-emerald-100 text-emerald-700',
        insight: '女款 37-40、男款 40-43 为黄金区间，占备货量约 65-70%',
        action: '核心码保证不断货；41/42 男款、38/39 女款设首配系数最高',
    },
    {
        dimension: '断码风险',
        tag: '预警',
        tagColor: 'bg-rose-100 text-rose-700',
        insight: '尾季断码率通常 15-25%，小码（34-36）/ 大码（43+）最先断货',
        action: '小码缩量保款式多样性；大码作为电商专供快返补货',
    },
    {
        dimension: '宽楦需求',
        tag: '机会',
        tagColor: 'bg-amber-100 text-amber-700',
        insight: '36-45 岁客群宽楦需求高，尤其女款时装鞋类脚背压迫投诉集中',
        action: '核心款增加宽楦版型；楦型标注在商品页突出展示，降低退换',
    },
    {
        dimension: '退换主因',
        tag: '体验优化',
        tagColor: 'bg-orange-100 text-orange-700',
        insight: '磨脚/脚背压迫 28%、尺码偏大 22%、尺码偏小 19%、材质问题 14%',
        action: '上市前完善尺码指南；脚背高风险款增加弹力材质；上市 2 周监控退换率',
    },
    {
        dimension: '场景延伸',
        tag: '拓展',
        tagColor: 'bg-sky-100 text-sky-700',
        insight: '轻户外 / 健步 / 宽楦舒适场景增速高于品牌整体，46+ 客群贡献明显',
        action: '规划大码舒适系列独立品类；开发功能性楦型（足弓支撑+宽前掌）',
    },
];

const DESIGN_BRIEF_DIMS = [
    { label: '主力鞋型', hint: '围绕主力场景线配置楦型，保证 Top3 鞋型款深充足' },
    { label: '楦型策略', hint: '核心款增宽楦版本，18-25 探索新廓形，46+ 重工学楦' },
    { label: '材质工艺', hint: '入门款 PU/合成革，中档款真皮/反绒，形象款特殊材质+五金件' },
    { label: '核心配色', hint: '主色系（60%）+ 机会色（25%）+ 点缀色（15%）三层色盘' },
    { label: '价带梯度', hint: '核心款价带 → 升级款（+20-30%）→ 形象款（+50%+），三阶结构' },
    { label: '渠道适配', hint: '线上款强化辨识度和短图展示；线下款强化陈列质感与试穿脚感' },
    { label: '款深建议', hint: 'Top20% SKU 加深度，长尾收窄款宽，整体款宽不超过上季 +10%' },
    { label: '上市节奏', hint: '核心款首波 70%，追单机制预留 15-20% OTB 用于快返' },
];

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function safeDiv(n: number, d: number) { return d <= 0 ? 0 : n / d; }
function formatAmount(value: number) {
    if (!Number.isFinite(value)) return '--';
    const abs = Math.abs(value);
    if (abs >= 1e8) return `¥${(value / 1e8).toFixed(2)}亿`;
    if (abs >= 1e4) return `¥${(value / 1e4).toFixed(1)}万`;
    return `¥${Math.round(value).toLocaleString('zh-CN')}`;
}
function formatPct(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value * 100).toFixed(1)}%`;
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function blendColor(from: [number, number, number], to: [number, number, number], t: number): [number, number, number] {
    const r = clamp(t, 0, 1);
    return [Math.round(from[0] + (to[0] - from[0]) * r), Math.round(from[1] + (to[1] - from[1]) * r), Math.round(from[2] + (to[2] - from[2]) * r)];
}
function getHeatColor(value: number, min: number, max: number, metric: AgeHeatMetric | TreemapColorMetric) {
    if (max <= min) return 'rgba(148,163,184,0.35)';
    const ratio = clamp((value - min) / (max - min), 0, 1);
    if (metric === 'sell_through') { const rgb = blendColor([239, 68, 68], [16, 185, 129], ratio); return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`; }
    if (metric === 'gm_rate') { const rgb = blendColor([249, 115, 22], [37, 99, 235], ratio); return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`; }
    const rgb = blendColor([241, 245, 249], [37, 99, 235], ratio);
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`;
}

// ── 组件主体 ──────────────────────────────────────────────────────────────────
const ic = 'w-2.5 h-2.5';
const CONSUMER_PAGE_SECTIONS = [
  { anchor: '#consumer-overview', label: '洞察总览', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1.5" /><line x1="1" y1="7" x2="15" y2="7" /></svg>) },
  { anchor: '#consumer-summary', label: '决策摘要', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="4" x2="13" y2="4" /><line x1="3" y1="8" x2="11" y2="8" /><line x1="3" y1="12" x2="9" y2="12" /></svg>) },
  { anchor: '#consumer-actions', label: '行动中心', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,8 6.5,12 14,4" /></svg>) },
  { anchor: '#consumer-persona', label: '人群画像', icon: (<svg viewBox="0 0 16 16" fill="none" className={ic} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="5.5" r="2.5" /><circle cx="11" cy="5.5" r="2.5" /><path d="M1 14c0-2.5 2-4.5 4.5-4.5h5c2.5 0 4.5 2 4.5 4.5" /></svg>) },
];

export default function ProductBasicPanel({
    filters,
    setFilters,
    onJumpToTab,
}: {
    filters: DashboardFilters;
    setFilters: (next: DashboardFilters) => void;
    onJumpToTab?: (tab: string) => void;
}) {
    const {
        totals, ageLineCells, agePriceCells, colorStats, colorCategoryCells,
        ageGroups, productLines, priceBands, categories, colorFamilies,
        ageGroupTotals, skuDrillRows,
    } = useProductAnalysis(filters);

    const [ageHeatMetric, setAgeHeatMetric] = useState<AgeHeatMetric>('net_sales');
    const [treemapAreaMetric, setTreemapAreaMetric] = useState<TreemapAreaMetric>('net_sales');
    const [treemapColorMetric, setTreemapColorMetric] = useState<TreemapColorMetric>('sell_through');
    const [skuExpanded, setSkuExpanded] = useState(false);
    const [skuShowAll, setSkuShowAll] = useState(false);
    const [skuFilter, setSkuFilter] = useState<'top_sales' | 'high_gm' | 'high_st' | 'low_eff' | 'growth'>('top_sales');
    const [designInputExpanded, setDesignInputExpanded] = useState(false);
    const [journeyExpanded, setJourneyExpanded] = useState(false);
    const [planningOutputExpanded, setPlanningOutputExpanded] = useState(false);
    const [actionFilter, setActionFilter] = useState<'all' | 'P0' | 'P1' | 'P2'>('all');

    // ── 衍生数据 ────────────────────────────────────────────────────────────────
    const audienceRanking = useMemo(() => {
        return Object.entries(ageGroupTotals)
            .map(([ageGroup, val]) => ({
                ageGroup,
                sales: val.net_sales,
                pairs: val.pairs_sold,
                salesShare: safeDiv(val.net_sales, totals.net_sales),
                pairsShare: safeDiv(val.pairs_sold, totals.pairs_sold),
                asp: safeDiv(val.net_sales, val.pairs_sold),
                sellThrough: safeDiv(
                    ageLineCells.filter((c) => c.age_group === ageGroup).reduce((s, c) => s + c.sell_through * c.pairs_sold, 0),
                    ageLineCells.filter((c) => c.age_group === ageGroup).reduce((s, c) => s + c.pairs_sold, 0),
                ),
                gmRate: safeDiv(
                    ageLineCells.filter((c) => c.age_group === ageGroup).reduce((s, c) => s + c.gm_rate * c.net_sales, 0),
                    ageLineCells.filter((c) => c.age_group === ageGroup).reduce((s, c) => s + c.net_sales, 0),
                ),
            }))
            .sort((a, b) => b.sales - a.sales);
    }, [ageGroupTotals, ageLineCells, totals]);

    const topAudience = audienceRanking[0] ?? null;
    const avgSellThrough = safeDiv(
        audienceRanking.reduce((s, r) => s + r.sellThrough * r.sales, 0),
        audienceRanking.reduce((s, r) => s + r.sales, 0),
    );

    const topProductLine = useMemo(() => {
        const pltotals: Record<string, number> = {};
        ageLineCells.forEach((c) => { pltotals[c.product_line] = (pltotals[c.product_line] || 0) + c.net_sales; });
        return Object.entries(pltotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '--';
    }, [ageLineCells]);

    const secondProductLine = useMemo(() => {
        const pltotals: Record<string, number> = {};
        ageLineCells.forEach((c) => { pltotals[c.product_line] = (pltotals[c.product_line] || 0) + c.net_sales; });
        const sorted = Object.entries(pltotals).sort((a, b) => b[1] - a[1]);
        return sorted[1]?.[0] ?? '--';
    }, [ageLineCells]);

    const topPriceBand = useMemo(() => {
        return [...agePriceCells].sort((a, b) => b.net_sales - a.net_sales)[0]?.price_band ?? '--';
    }, [agePriceCells]);

    const colorRanking = useMemo(() => [...colorStats].sort((a, b) => b.net_sales - a.net_sales), [colorStats]);

    const colorStrategySummary = useMemo(() => {
        if (!colorRanking.length) return { topColor: null, oppColor: null, riskColor: null, sellThroughMedian: 0, quadrants: { highEffHighSt: [], highEffLowSt: [], lowEffHighSt: [], lowEffLowSt: [] } as Record<ColorQuadrantKey, typeof colorRanking> };
        const totalSales = colorRanking.reduce((s, c) => s + c.net_sales, 0);
        const totalPairs = colorRanking.reduce((s, c) => s + c.pairs_sold, 0);
        const totalSkc = colorRanking.reduce((s, c) => s + c.skc_cnt, 0);
        const stValues = colorRanking.map((c) => c.sell_through).sort((a, b) => a - b);
        const sellThroughMedian = stValues[Math.floor(stValues.length / 2)] ?? 0;
        const enriched = colorRanking.map((c) => ({
            ...c,
            salesShare: safeDiv(c.net_sales, totalSales),
            pairsShare: safeDiv(c.pairs_sold, totalPairs),
            skcShare: safeDiv(c.skc_cnt, totalSkc),
            structureGap: safeDiv(c.pairs_sold, totalPairs) - safeDiv(c.skc_cnt, totalSkc),
            riskScore: (1 - c.sell_through) * 0.5 + (safeDiv(c.skc_cnt, totalSkc) - safeDiv(c.pairs_sold, totalPairs)) * 0.5,
        }));
        const topColor = [...enriched].sort((a, b) => b.net_sales - a.net_sales)[0] ?? null;
        const oppColor = [...enriched].filter((c) => c.sell_through >= sellThroughMedian).sort((a, b) => b.structureGap - a.structureGap)[0] ?? enriched[0] ?? null;
        const riskColor = [...enriched].sort((a, b) => b.riskScore - a.riskScore)[0] ?? null;
        return {
            topColor, oppColor, riskColor, sellThroughMedian,
            quadrants: {
                highEffHighSt: enriched.filter((c) => c.structureGap >= 0 && c.sell_through >= sellThroughMedian).sort((a, b) => b.structureGap - a.structureGap),
                highEffLowSt: enriched.filter((c) => c.structureGap >= 0 && c.sell_through < sellThroughMedian).sort((a, b) => b.structureGap - a.structureGap),
                lowEffHighSt: enriched.filter((c) => c.structureGap < 0 && c.sell_through >= sellThroughMedian).sort((a, b) => b.sell_through - a.sell_through),
                lowEffLowSt: enriched.filter((c) => c.structureGap < 0 && c.sell_through < sellThroughMedian).sort((a, b) => b.riskScore - a.riskScore),
            } as Record<ColorQuadrantKey, typeof enriched>,
        };
    }, [colorRanking]);

    // 人群 Persona 卡数据
    const personaCardRows = useMemo(() => {
        return audienceRanking
            .filter((r) => r.ageGroup !== '未知')
            .map((r) => {
                const config = PERSONA_CONFIG[r.ageGroup];
                const topLinForAge = [...ageLineCells]
                    .filter((c) => c.age_group === r.ageGroup)
                    .sort((a, b) => b.net_sales - a.net_sales)[0];
                const topBandForAge = [...agePriceCells]
                    .filter((c) => c.age_group === r.ageGroup)
                    .sort((a, b) => b.net_sales - a.net_sales)[0];
                const growthSignal = r.sellThrough > avgSellThrough * 1.05 ? 'growth'
                    : r.sellThrough < avgSellThrough * 0.92 ? 'risk' : 'stable';
                const merchAction = growthSignal === 'growth'
                    ? `加深 ${topLinForAge?.product_line ?? topProductLine} 核心款，扩价带上探`
                    : growthSignal === 'risk'
                    ? `收缩低动销款，加强售罄管理，优先清货`
                    : `保持现有款宽，优化主推款深度配置`;
                const designAction = config?.designFocus ?? '强化产品差异化表达';
                return {
                    ageGroup: r.ageGroup,
                    name: config?.name ?? r.ageGroup,
                    scenario: config?.scenario ?? '--',
                    shoeType: config?.shoeType ?? '--',
                    colorHint: config?.colorHint ?? '--',
                    channelMain: config?.channelMain ?? '--',
                    onlineShare: config?.onlineShare ?? 0.5,
                    buyTrigger: config?.buyTrigger ?? '--',
                    priceBand: topBandForAge?.price_band ?? '--',
                    productLine: topLinForAge?.product_line ?? '--',
                    salesShare: r.salesShare,
                    asp: r.asp,
                    sellThrough: r.sellThrough,
                    gmRate: r.gmRate,
                    growthSignal,
                    badgeColor: config?.badgeColor ?? 'border-slate-300 bg-slate-50 text-slate-700',
                    sizeFocus: config?.sizeFocus ?? '--',
                    repurchaseHint: config?.repurchaseHint ?? '--',
                    merchAction,
                    designAction,
                };
            });
    }, [audienceRanking, ageLineCells, agePriceCells, avgSellThrough, topProductLine]);

    // 人群机会矩阵
    const segmentOpportunityRows = useMemo(() => {
        return audienceRanking.filter((r) => r.ageGroup !== '未知').map((r) => {
            const oppScore = Math.round(r.sellThrough * 50 + r.gmRate * 30 + r.salesShare * 20);
            const priority = r.salesShare >= 0.3 && r.sellThrough >= avgSellThrough ? '加码' : r.sellThrough < avgSellThrough * 0.9 ? '收缩' : '维持';
            const priorityColor = priority === '加码' ? 'text-emerald-700 bg-emerald-100' : priority === '收缩' ? 'text-rose-700 bg-rose-100' : 'text-amber-700 bg-amber-100';
            return { ...r, oppScore, priority, priorityColor };
        });
    }, [audienceRanking, avgSellThrough]);

    // 决策摘要
    const decisionSummary = useMemo(() => {
        const coreAudience = topAudience ? `${topAudience.ageGroup}（${formatPct(topAudience.salesShare)}）` : '--';
        const growthAudience = audienceRanking.find((r) => r.sellThrough > avgSellThrough * 1.05 && r.ageGroup !== topAudience?.ageGroup)?.ageGroup ?? '暂无明显增长客群';
        const riskAudience = [...audienceRanking].sort((a, b) => a.sellThrough - b.sellThrough)[0];
        const riskLabel = riskAudience && riskAudience.sellThrough < avgSellThrough * 0.92
            ? `${riskAudience.ageGroup}（售罄${formatPct(riskAudience.sellThrough)}，低于均值 ${formatPct(avgSellThrough)}）` : '当前口径暂无高风险客群';
        const topColor = colorStrategySummary.topColor?.color_family ?? '--';
        const oppColor = colorStrategySummary.oppColor?.color_family ?? '--';
        const designOpp = `${oppColor} 机会色结构扩张，${topProductLine} 场景线款深不足，建议加深配货`;
        const channelOpp = `${personaCardRows[0]?.channelMain ?? '线上线下并重'} 为主力渠道，年轻客群线上占比 ${formatPct(personaCardRows[0]?.onlineShare ?? 0.5)} 需重点运营`;
        return [
            { label: '核心客群', value: coreAudience, desc: `主力场景线：${topProductLine} · 主力价带：${topPriceBand}`, color: 'border-blue-200 bg-blue-50', labelColor: 'text-blue-600' },
            { label: '增长客群', value: growthAudience, desc: `售罄高于均值，建议加码配货与场景运营`, color: 'border-emerald-200 bg-emerald-50', labelColor: 'text-emerald-600' },
            { label: '风险客群', value: riskLabel, desc: '售罄低于均值，优先清货或收缩款宽', color: 'border-rose-200 bg-rose-50', labelColor: 'text-rose-600' },
            { label: '设计机会', value: designOpp, desc: `主色盘：${topColor}；建议锁定机会色 ${oppColor} 小步扩张`, color: 'border-amber-200 bg-amber-50', labelColor: 'text-amber-600' },
            { label: '渠道机会', value: channelOpp, desc: `次主力客群 ${audienceRanking[1]?.ageGroup ?? '--'} 线下体验优先，建议差异化陈列`, color: 'border-violet-200 bg-violet-50', labelColor: 'text-violet-600' },
        ];
    }, [topAudience, audienceRanking, avgSellThrough, colorStrategySummary, topProductLine, topPriceBand, personaCardRows]);

    // 年龄堆叠条
    const ageStackRows = useMemo(() => productLines.map((line) => {
        const lineCells = ageLineCells.filter((c) => c.product_line === line);
        const lineSales = lineCells.reduce((s, c) => s + c.net_sales, 0);
        return { line, ageValues: ageGroups.map((age) => +(safeDiv((lineCells.find((c) => c.age_group === age)?.net_sales || 0), lineSales) * 100).toFixed(2)) };
    }), [ageGroups, ageLineCells, productLines]);

    const ageStackOption = useMemo<EChartsOption>(() => ({
        animationDuration: 400,
        legend: { top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#64748B', fontSize: 11 } },
        grid: { left: 84, right: 18, top: 30, bottom: 26 },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: unknown) => {
            const rows = (Array.isArray(params) ? params : [params]) as Array<{ axisValueLabel?: string; marker?: string; seriesName?: string; value?: number }>;
            const title = rows[0]?.axisValueLabel ?? '';
            return `<div style="font-weight:600;margin-bottom:4px;">${title}</div>${rows.map((r) => `${r.marker ?? ''}${r.seriesName ?? ''}：${Number(r.value ?? 0).toFixed(1)}%`).join('<br/>')}`;
        } },
        xAxis: { type: 'value', max: 100, axisLabel: { color: '#6B7280', formatter: (v: number) => `${Math.round(v)}%` }, splitLine: { lineStyle: { color: '#E5E7EB', type: 'dashed' } }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
        yAxis: { type: 'category', data: ageStackRows.map((r) => r.line), axisLabel: { color: '#475569', fontSize: 11 }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
        series: ageGroups.map((age, i) => ({
            name: age, type: 'bar', stack: 'age',
            data: ageStackRows.map((r) => r.ageValues[i]),
            itemStyle: { color: AGE_COLORS[age] ?? '#94A3B8', borderRadius: i === ageGroups.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0] },
        })),
    }), [ageGroups, ageStackRows]);

    const ageStackEvents = useMemo(() => ({
        click: (params: { seriesName?: string }) => {
            const age = params?.seriesName;
            if (!age) return;
            setFilters({ ...filters, target_audience: filters.target_audience === age ? 'all' : age });
        },
    }), [filters, setFilters]);

    // 年龄×价格带热力图
    const agePriceCellMap = useMemo(() => {
        const m = new Map<string, (typeof agePriceCells)[number]>();
        agePriceCells.forEach((c) => m.set(`${c.age_group}__${c.price_band}`, c));
        return m;
    }, [agePriceCells]);

    const ageHeatData = useMemo(() => {
        const values: number[] = [];
        const points = ageGroups.flatMap((age, yi) => priceBands.map((band, xi) => {
            const cell = agePriceCellMap.get(`${age}__${band}`) ?? null;
            const raw = cell ? cell[ageHeatMetric] : 0;
            const value = ageHeatMetric === 'net_sales' ? raw / 1e4 : raw * 100;
            values.push(value);
            return { id: `${age}__${band}`, xIndex: xi, yIndex: yi, value, age, priceBand: band, cell };
        }));
        return { points, min: Math.min(...values, 0), max: Math.max(...values, 1) };
    }, [ageGroups, ageHeatMetric, agePriceCellMap, priceBands]);

    const ageHeatOption = useMemo<EChartsOption>(() => ({
        animationDuration: 400,
        grid: { left: 64, right: 16, top: 16, bottom: 80 },
        tooltip: { trigger: 'item', borderColor: '#E5E7EB', formatter: (params: unknown) => {
            const cell = ((params as { data?: Record<string, unknown> }).data?.cell) as (typeof agePriceCells)[number] | null;
            if (!cell) return '暂无数据';
            return [`<div style="font-weight:600;margin-bottom:4px;">${cell.age_group} × ${cell.price_band}</div>`, `销售额：${formatAmount(cell.net_sales)}`, `售罄率：${formatPct(cell.sell_through)}`, `毛利率：${formatPct(cell.gm_rate)}`].join('<br/>');
        } },
        xAxis: { type: 'category', data: priceBands, axisLabel: { color: '#64748B', fontSize: 10 }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
        yAxis: { type: 'category', data: ageGroups, axisLabel: { color: '#64748B', fontSize: 10 }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
        visualMap: {
            min: ageHeatData.min, max: ageHeatData.max, orient: 'horizontal', left: 'center', bottom: 10,
            text: ['高', '低'], textStyle: { color: '#64748B', fontSize: 10 },
            inRange: { color: ageHeatMetric === 'sell_through' ? ['#FEE2E2', '#FCA5A5', '#EF4444', '#DC2626', '#10B981'] : ageHeatMetric === 'gm_rate' ? ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#2563EB'] : ['#F1F5F9', '#CBD5E1', '#64748B', '#475569', '#1E293B'] },
            calculable: false,
        },
        series: [{ type: 'heatmap', data: ageHeatData.points.map((p) => ({ id: p.id, value: [p.xIndex, p.yIndex, p.value], age: p.age, priceBand: p.priceBand, cell: p.cell })), label: { show: true, color: '#0F172A', fontSize: 10, formatter: (params: unknown) => { const v = Number(((params as { data?: { value?: number[] } }).data?.value)?.[2] ?? 0); return ageHeatMetric === 'net_sales' ? `${v.toFixed(1)}万` : `${v.toFixed(1)}%`; } } }],
    }), [ageGroups, ageHeatData, ageHeatMetric, priceBands]);

    const ageHeatEvents = useMemo(() => ({
        click: (params: { data?: { age?: string; priceBand?: string } }) => {
            const age = params?.data?.age; const priceBand = params?.data?.priceBand;
            if (!age || !priceBand) return;
            const isSame = filters.target_audience === age && filters.price_band === priceBand;
            setFilters({ ...filters, target_audience: isSame ? 'all' : age, price_band: isSame ? 'all' : priceBand });
        },
    }), [filters, setFilters]);

    // 色系 Treemap
    const treemapColorRange = useMemo(() => {
        const vals = colorStats.map((c) => c[treemapColorMetric]).filter(Number.isFinite);
        if (!vals.length) return { min: 0, max: 1 };
        const lo = Math.min(...vals); const hi = Math.max(...vals);
        if (hi - lo < 0.03) { const mid = (lo + hi) / 2; return { min: clamp(mid - 0.04, 0, 1), max: clamp(mid + 0.04, 0, 1) }; }
        return { min: lo, max: hi };
    }, [colorStats, treemapColorMetric]);

    const treemapOption = useMemo<EChartsOption>(() => ({
        animationDuration: 400,
        tooltip: { trigger: 'item', borderColor: '#E5E7EB', formatter: (params: unknown) => {
            const d = (params as { data?: Record<string, unknown> }).data ?? {};
            return [`<div style="font-weight:600;margin-bottom:4px;">${d.name ?? '-'}</div>`, `销量：${Math.round(Number(d.pairsSold ?? 0)).toLocaleString('zh-CN')}双`, `销售额：${formatAmount(Number(d.netSales ?? 0))}`, `售罄率：${formatPct(Number(d.sellThrough ?? 0))}`, `毛利率：${formatPct(Number(d.gmRate ?? 0))}`, `SKC：${Math.round(Number(d.skcCnt ?? 0))}`].join('<br/>');
        } },
        series: [{ type: 'treemap', roam: false, breadcrumb: { show: false }, itemStyle: { borderColor: '#ffffff', borderWidth: 1 }, label: { show: true, formatter: (p: { data?: { name?: string } }) => p?.data?.name ?? '', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }, upperLabel: { show: false },
            data: colorStats.map((c) => {
                const opacity = treemapColorRange.max > treemapColorRange.min ? 0.5 + 0.5 * clamp((c[treemapColorMetric] - treemapColorRange.min) / (treemapColorRange.max - treemapColorRange.min), 0, 1) : 0.85;
                return { name: c.color_family, value: treemapAreaMetric === 'net_sales' ? c.net_sales : c.pairs_sold, pairsSold: c.pairs_sold, netSales: c.net_sales, sellThrough: c.sell_through, gmRate: c.gm_rate, skcCnt: c.skc_cnt, itemStyle: { color: COLOR_FAMILY_COLORS[c.color_family] ?? '#94A3B8', opacity, borderColor: c[treemapColorMetric] >= (treemapColorRange.min + treemapColorRange.max) / 2 ? '#10B981' : '#F59E0B', borderWidth: 2 } };
            }),
        }] as EChartsOption['series'],
    }), [colorStats, treemapAreaMetric, treemapColorMetric, treemapColorRange]);

    const treemapEvents = useMemo(() => ({
        click: (params: { data?: { name?: string } }) => {
            const colorFamily = params?.data?.name;
            if (!colorFamily) return;
            setFilters({ ...filters, color: filters.color === colorFamily ? 'all' : colorFamily });
        },
    }), [filters, setFilters]);

    // 色系×品类热力图
    const colorCategoryCellMap = useMemo(() => {
        const m = new Map<string, (typeof colorCategoryCells)[number]>();
        colorCategoryCells.forEach((c) => m.set(`${c.color_family}__${c.category}`, c));
        return m;
    }, [colorCategoryCells]);

    const colorHeatData = useMemo(() => {
        const values: number[] = [];
        const points = colorFamilies.flatMap((cf, yi) => categories.map((cat, xi) => {
            const cell = colorCategoryCellMap.get(`${cf}__${cat}`) ?? null;
            const value = cell ? (cell.net_sales / 1e4) : 0;
            values.push(value);
            return { id: `${cf}__${cat}`, xIndex: xi, yIndex: yi, value, colorFamily: cf, category: cat, cell };
        }));
        return { points, min: Math.min(...values, 0), max: Math.max(...values, 1) };
    }, [categories, colorCategoryCellMap, colorFamilies]);

    const colorHeatOption = useMemo<EChartsOption>(() => ({
        animationDuration: 400,
        grid: { left: 72, right: 16, top: 16, bottom: 80 },
        tooltip: { trigger: 'item', borderColor: '#E5E7EB', formatter: (params: unknown) => {
            const cell = ((params as { data?: Record<string, unknown> }).data?.cell) as (typeof colorCategoryCells)[number] | null;
            if (!cell) return '暂无数据';
            return [`<div style="font-weight:600;margin-bottom:4px;">${cell.color_family} × ${cell.category}</div>`, `销售额：${formatAmount(cell.net_sales)}`, `售罄率：${formatPct(cell.sell_through)}`, `毛利率：${formatPct(cell.gm_rate)}`].join('<br/>');
        } },
        xAxis: { type: 'category', data: categories, axisLabel: { color: '#64748B', fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
        yAxis: { type: 'category', data: colorFamilies, axisLabel: { color: '#64748B', fontSize: 10 }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
        visualMap: { min: colorHeatData.min, max: colorHeatData.max, orient: 'horizontal', left: 'center', bottom: 10, text: ['高', '低'], textStyle: { color: '#64748B', fontSize: 10 }, inRange: { color: ['#F1F5F9', '#CBD5E1', '#64748B', '#475569', '#1E293B'] }, calculable: false },
        series: [{ type: 'heatmap', data: colorHeatData.points.map((p) => ({ id: p.id, value: [p.xIndex, p.yIndex, p.value], colorFamily: p.colorFamily, category: p.category, cell: p.cell })), label: { show: true, color: '#F8FAFC', fontSize: 9, formatter: (params: unknown) => { const v = Number(((params as { data?: { value?: number[] } }).data?.value)?.[2] ?? 0); return v > 0 ? `${v.toFixed(1)}万` : ''; } } }],
    }), [categories, colorFamilies, colorHeatData]);

    // SKU 视图过滤
    const filteredSkuRows = useMemo(() => {
        const sorted = [...skuDrillRows];
        if (skuFilter === 'top_sales') return sorted.sort((a, b) => b.net_sales - a.net_sales).slice(0, 20);
        if (skuFilter === 'high_gm') return sorted.sort((a, b) => b.gm_rate - a.gm_rate).slice(0, 20);
        if (skuFilter === 'high_st') return sorted.sort((a, b) => b.sell_through - a.sell_through).slice(0, 20);
        if (skuFilter === 'low_eff') return sorted.filter((r) => r.sell_through < 0.5 && r.net_sales > 0).sort((a, b) => a.sell_through - b.sell_through).slice(0, 20);
        // growth: high sell_through + asp above median
        const aspMedian = safeDiv(sorted.reduce((s, r) => s + r.asp, 0), sorted.length);
        return sorted.filter((r) => r.sell_through >= 0.75 && r.asp >= aspMedian).sort((a, b) => b.sell_through - a.sell_through).slice(0, 20);
    }, [skuDrillRows, skuFilter]);

    // 设计 Brief 行
    const designBriefRows = useMemo(() => {
        const topColor = colorStrategySummary.topColor?.color_family ?? '--';
        const oppColor = colorStrategySummary.oppColor?.color_family ?? '--';
        const riskColor = colorStrategySummary.riskColor?.color_family ?? '--';
        const topAge = topAudience?.ageGroup ?? '--';
        const config = PERSONA_CONFIG[topAge];
        return DESIGN_BRIEF_DIMS.map((dim) => {
            let value = '';
            if (dim.label === '主力鞋型') value = config?.shoeType ?? `${topProductLine} 场景线主推鞋型`;
            else if (dim.label === '楦型策略') value = config?.sizeFocus ?? '核心码段宽楦+标准楦双版本';
            else if (dim.label === '核心配色') value = `主色 ${topColor}（60%）· 机会色 ${oppColor}（25%）· 风险色 ${riskColor}（收缩）`;
            else if (dim.label === '价带梯度') value = `${topPriceBand} 为核心价带 · 向上预留形象款价带`;
            else if (dim.label === '渠道适配') value = `${config?.channelMain ?? '线上线下'} 差异化表达，${config?.buyTrigger ?? ''}`;
            else value = dim.hint;
            return { label: dim.label, value, hint: dim.hint };
        });
    }, [colorStrategySummary, topAudience, topProductLine, topPriceBand]);

    // 行动中心过滤
    const filteredActions = useMemo(() =>
        actionFilter === 'all' ? CONSUMER_ACTIONS : CONSUMER_ACTIONS.filter((a) => a.priority === actionFilter),
        [actionFilter]);

    return (
        <div className="space-y-5">
            <section id="consumer-overview" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="A" title="消费者洞察总览" />

            {/* ── 0. 页头 ─────────────────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">消费者洞察驱动的商品企划决策工作台</h2>
                        <p className="mt-0.5 text-xs text-slate-500">人群是谁 · 哪些人群最值得投入 · 怎么匹配商品 · 设计怎么做 · 如何输出到企划 · 跨模块联动</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            净销 {formatAmount(totals.net_sales)} ｜ 销量 {Math.round(totals.pairs_sold).toLocaleString('zh-CN')} 双
                        </div>
                        {filters.target_audience !== 'all' && (
                            <button onClick={() => setFilters({ ...filters, target_audience: 'all' })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                                ✕ 清除客群筛选
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* ── 1. 消费者洞察总览（8 KPI） ──────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">消费者洞察总览</h3>
                    <p className="text-xs text-slate-400 mt-0.5">8 个核心人群 KPI · 快速判断哪些人群值得投入</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                    {[
                        { label: '核心人群数', value: `${personaCardRows.filter((r) => r.ageGroup !== '未知').length}`, sub: '活跃消费分群', color: 'bg-blue-50 border-blue-200', lc: 'text-blue-600', tone: '' },
                        { label: '主力人群销售占比', value: formatPct(audienceRanking[0]?.salesShare ?? 0), sub: audienceRanking[0]?.ageGroup ?? '--', color: 'bg-emerald-50 border-emerald-200', lc: 'text-emerald-600', tone: '' },
                        { label: '高价值人群占比', value: formatPct(safeDiv(audienceRanking.filter((r) => r.gmRate >= 0.50).reduce((s, r) => s + r.sales, 0), totals.net_sales)), sub: '毛利率≥50%', color: 'bg-violet-50 border-violet-200', lc: 'text-violet-600', tone: '' },
                        { label: '高增长人群数', value: `${audienceRanking.filter((r) => r.sellThrough > avgSellThrough * 1.05 && r.ageGroup !== '未知').length} 个`, sub: '售罄高于均值 5%+', color: 'bg-sky-50 border-sky-200', lc: 'text-sky-600', tone: '' },
                        { label: '平均客单价', value: formatAmount(safeDiv(totals.net_sales, totals.pairs_sold)), sub: '全人群均值', color: 'bg-amber-50 border-amber-200', lc: 'text-amber-600', tone: '' },
                        { label: '复购率', value: formatPct(SEGMENT_VALUE_RANKING.reduce((s, r) => s + r.repeatRate * r.salesContribution, 0)), sub: '加权均值', color: 'bg-teal-50 border-teal-200', lc: 'text-teal-600', tone: '' },
                        { label: '退货率', value: formatPct(SEGMENT_VALUE_RANKING.reduce((s, r) => s + r.returnRate * r.salesContribution, 0)), sub: '加权均值', color: 'bg-rose-50 border-rose-200', lc: 'text-rose-600', tone: '' },
                        { label: '价格接受中位数', value: formatAmount(SEGMENT_VALUE_RANKING.reduce((s, r) => s + r.averageOrderValue * r.salesContribution, 0)), sub: '销售额加权 ASP', color: 'bg-orange-50 border-orange-200', lc: 'text-orange-600', tone: '' },
                    ].map((kpi) => (
                        <div key={kpi.label} className={`rounded-xl border p-3 ${kpi.color}`}>
                            <div className={`text-[10px] font-medium mb-1 ${kpi.lc}`}>{kpi.label}</div>
                            <div className="text-base font-bold text-slate-900">{kpi.value}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{kpi.sub}</div>
                        </div>
                    ))}
                </div>
            </section>
            </section>

            <section id="consumer-summary" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="B" title="决策摘要" />

            {/* ── 1.5 本页决策摘要 ────────────────────────────────────────── */}
            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-indigo-900">本页决策摘要</h3>
                    <p className="text-xs text-indigo-500 mt-0.5">7 条核心结论 · 直接指向品类 / 波段 / OTB / 设计动作</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'P0 重点投入人群', value: SEGMENT_VALUE_RANKING.filter((r) => r.segmentPriority === 'P0重点投入').map((r) => r.segmentName).join('、'), desc: '高毛利 + 高复购 + 低退货，加大 SKU 深度与 OTB 投入', color: 'border-rose-200 bg-rose-50', lc: 'text-rose-700', badge: 'P0' },
                        { label: 'P1 增长观察人群', value: SEGMENT_VALUE_RANKING.filter((r) => r.segmentPriority === 'P1增长观察' || r.segmentPriority === 'P2小批量测试').map((r) => `${r.segmentName}（${r.segmentPriority}）`).join('、'), desc: '增速快但复购待沉淀，小批量快返验证后追单', color: 'border-amber-200 bg-amber-50', lc: 'text-amber-700', badge: 'P1' },
                        { label: '建议减少投入人群', value: SEGMENT_VALUE_RANKING.filter((r) => r.segmentPriority === 'P3收缩投入').map((r) => r.segmentName).join('、') || '当前无需收缩人群', desc: '低贡献低增速，收缩款宽优先清货', color: 'border-slate-200 bg-slate-50', lc: 'text-slate-500', badge: 'P3' },
                        { label: '下一波商品方向', value: `${SEGMENT_PRODUCT_FIT[0].recommendedShoeType} / ${SEGMENT_PRODUCT_FIT[2].recommendedShoeType}`, desc: `主力价带 ${SEGMENT_PRODUCT_FIT[0].recommendedPriceBand}，兼顾 ${SEGMENT_PRODUCT_FIT[2].recommendedPriceBand} 高毛利段`, color: 'border-blue-200 bg-blue-50', lc: 'text-blue-700', badge: '商品' },
                        { label: '价格带建议', value: `核心 ${SEGMENT_PRODUCT_FIT[0].recommendedPriceBand} · 升级 ${SEGMENT_PRODUCT_FIT[2].recommendedPriceBand} · 测试 ${SEGMENT_PRODUCT_FIT[1].recommendedPriceBand}`, desc: '三价带梯度 · 核心款守住毛利 · 形象款不打折', color: 'border-violet-200 bg-violet-50', lc: 'text-violet-700', badge: '价格' },
                        { label: 'OTB 倾斜建议', value: `${SEGMENT_PRODUCT_FIT[0].segmentName} +20% · 快返预留 15%`, desc: '高价值人群追加款深，快返机制覆盖新潮客群', color: 'border-emerald-200 bg-emerald-50', lc: 'text-emerald-700', badge: 'OTB' },
                        { label: '设计方向建议', value: `楦型：${DESIGN_INPUT_DATA[0].lastType.split('/')[0].trim()} + ${DESIGN_INPUT_DATA[3].lastType.split('/')[0].trim()}`, desc: `主色：黑/米/驼 · 功能重点：${DESIGN_INPUT_DATA[0].funcTags.join('、')}`, color: 'border-teal-200 bg-teal-50', lc: 'text-teal-700', badge: '设计' },
                    ].map((item) => (
                        <div key={item.label} className={`rounded-xl border p-3 ${item.color}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.lc} bg-white/60 border border-current border-opacity-30`}>{item.badge}</span>
                                <span className={`text-xs font-semibold ${item.lc}`}>{item.label}</span>
                            </div>
                            <div className="text-sm font-bold text-slate-900 leading-snug mb-1">{item.value}</div>
                            <div className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </section>
            </section>

            <section id="consumer-actions" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="C" title="消费者行动中心" />

            {/* ── 2. 消费者行动中心 ────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">消费者行动中心</h3>
                        <p className="text-xs text-slate-400 mt-0.5">高优先级洞察建议 · 每条可直接导向商品、设计、渠道动作</p>
                    </div>
                    <div className="flex gap-1">
                        {(['all', 'P0', 'P1', 'P2'] as const).map((f) => (
                            <button key={f} onClick={() => setActionFilter(f)} className={`text-xs px-3 py-1 rounded-full border ${actionFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                {f === 'all' ? '全部' : f}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-3">
                    {filteredActions.map((action) => (
                        <div key={action.id} className={`rounded-xl border p-4 ${action.priority === 'P0' ? 'border-rose-200 bg-rose-50/60' : action.priority === 'P1' ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.priority === 'P0' ? 'bg-rose-600 text-white' : action.priority === 'P1' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'}`}>{action.priority}</span>
                                    <span className="text-xs font-semibold text-slate-800">{action.segment}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${action.status === '执行中' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : action.status === '待审批' ? 'bg-amber-100 text-amber-700 border-amber-200' : action.status === '已完成' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{action.status}</span>
                                </div>
                            </div>
                            <div className="text-xs font-semibold text-slate-900 mb-1">{action.issue}</div>
                            <div className="text-[11px] text-slate-500 mb-2 italic">洞察依据：{action.insight}</div>
                            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4 text-xs mb-2.5">
                                <div><span className="text-slate-400">商品：</span><span className="text-slate-800">{action.productSuggestion}</span></div>
                                <div><span className="text-slate-400">设计：</span><span className="text-slate-800">{action.designSuggestion}</span></div>
                                <div><span className="text-slate-400">价格：</span><span className="text-slate-800">{action.priceSuggestion}</span></div>
                                <div><span className="text-slate-400">渠道：</span><span className="text-slate-800">{action.channelSuggestion}</span></div>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-2.5 py-2 border-t border-b border-current border-opacity-10">
                                <span className="text-emerald-700">📈 销售 {action.expectedSalesImpact}</span>
                                <span className="text-blue-700">◎ 毛利 {action.expectedMarginImpact}</span>
                                <span className="text-amber-700">📦 库存 {action.expectedInventoryImpact}</span>
                                <span className="text-violet-700">💰 OTB {action.expectedOtbImpact}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {action.actionButtons.map((btn) => (
                                    <button key={btn.label} onClick={() => onJumpToTab?.(btn.tab)}
                                        className={`text-[11px] font-medium px-3 py-1 rounded-full border ${action.priority === 'P0' ? 'border-rose-300 bg-white text-rose-700 hover:bg-rose-50' : action.priority === 'P1' ? 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
                                        {btn.label} →
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            </section>

            <section id="consumer-persona" className="scroll-mt-24 space-y-5">
            <MerchSectionDivider label="D" title="人群画像" />

            {/* ── 3. 核心人群 Persona 卡 ────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900">核心人群 Persona</h3>
                    <p className="text-xs text-slate-400 mt-0.5">每个客群的购买场景 · 偏好 · 商品 & 设计动作</p>
                </div>
                {personaCardRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-xs text-slate-500">当前口径下暂无客群数据</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {personaCardRows.map((p) => (
                            <div key={p.ageGroup} className={`rounded-xl border p-4 ${p.badgeColor}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="text-base font-bold text-slate-900">{p.name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{p.ageGroup}</div>
                                    </div>
                                    <div className={`text-xs rounded-full px-2 py-0.5 font-medium border ${p.badgeColor}`}>
                                        {p.growthSignal === 'growth' ? '↑ 增长' : p.growthSignal === 'risk' ? '⚠ 风险' : '→ 稳定'}
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-xs text-slate-700">
                                    <div className="flex gap-1"><span className="text-slate-400 shrink-0">场景</span><span className="font-medium">{p.scenario}</span></div>
                                    <div className="flex gap-1"><span className="text-slate-400 shrink-0">鞋型</span><span>{p.shoeType}</span></div>
                                    <div className="flex gap-1"><span className="text-slate-400 shrink-0">配色</span><span>{p.colorHint}</span></div>
                                    <div className="flex gap-1"><span className="text-slate-400 shrink-0">价带</span><span className="font-medium">{p.priceBand}</span></div>
                                    <div className="flex gap-1"><span className="text-slate-400 shrink-0">渠道</span><span>{p.channelMain}（线上{formatPct(p.onlineShare)}）</span></div>
                                    <div className="flex gap-1"><span className="text-slate-400 shrink-0">购买</span><span>{p.buyTrigger}</span></div>
                                </div>
                                <div className="mt-2.5 border-t border-current border-opacity-20 pt-2.5 space-y-1 text-xs">
                                    <div className="flex gap-2">
                                        <span className="text-slate-400 shrink-0">售罄</span><span className={p.sellThrough >= avgSellThrough ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>{formatPct(p.sellThrough)}</span>
                                        <span className="text-slate-400">ASP</span><span>{formatAmount(p.asp)}</span>
                                        <span className="text-slate-400">毛利</span><span>{formatPct(p.gmRate)}</span>
                                    </div>
                                    <div className="flex gap-1 flex-wrap mt-1">
                                        <span className="shrink-0 text-slate-400">商品→</span><span className="text-slate-800">{p.merchAction}</span>
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                        <span className="shrink-0 text-slate-400">设计→</span><span className="text-slate-800">{p.designAction}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── 4. 人群价值排序 ──────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">人群价值排序</h3>
                    <p className="text-xs text-slate-400 mt-0.5">销售额 · 毛利率 · 复购率 · 退货率 · 增速 · 投入优先级</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200">
                                {['人群', '销售额', '销售占比', '毛利率', '复购率', '客单价', '退货率', '增长率', '库存风险', '投入优先级'].map((h) => (
                                    <th key={h} className="text-left py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SEGMENT_VALUE_RANKING.map((r) => (
                                <tr key={r.segmentId} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{r.segmentName}</td>
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">{formatAmount(r.salesAmount)}</td>
                                    <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-14 bg-slate-100 rounded-full h-1.5"><div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(r.salesContribution * 100).toFixed(0)}%` }} /></div>
                                            <span>{formatPct(r.salesContribution)}</span>
                                        </div>
                                    </td>
                                    <td className={`py-2.5 px-3 font-semibold ${r.grossMargin >= 0.50 ? 'text-emerald-700' : r.grossMargin >= 0.45 ? 'text-amber-700' : 'text-rose-600'}`}>{formatPct(r.grossMargin)}</td>
                                    <td className="py-2.5 px-3 text-slate-700">{formatPct(r.repeatRate)}</td>
                                    <td className="py-2.5 px-3 text-slate-700">{formatAmount(r.averageOrderValue)}</td>
                                    <td className={`py-2.5 px-3 font-semibold ${r.returnRate <= 0.08 ? 'text-emerald-700' : r.returnRate <= 0.12 ? 'text-amber-700' : 'text-rose-600'}`}>{formatPct(r.returnRate)}</td>
                                    <td className={`py-2.5 px-3 font-semibold ${r.growthRate >= 0.15 ? 'text-emerald-700' : r.growthRate >= 0.05 ? 'text-slate-700' : 'text-rose-600'}`}>{r.growthRate > 0 ? '+' : ''}{formatPct(r.growthRate)}</td>
                                    <td className="py-2.5 px-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.inventoryRisk === 'low' ? 'bg-emerald-100 text-emerald-700' : r.inventoryRisk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {r.inventoryRisk === 'low' ? '低风险' : r.inventoryRisk === 'medium' ? '中风险' : '高风险'}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.segmentPriority === 'P0重点投入' ? 'bg-rose-100 text-rose-700' : r.segmentPriority === 'P1增长观察' ? 'bg-amber-100 text-amber-700' : r.segmentPriority === 'P2小批量测试' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {r.segmentPriority}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5">P0 重点投入：毛利高 + 复购强 + 增速稳</span>
                    <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">P1 增长观察：高增速但复购待沉淀</span>
                    <span className="rounded-full bg-sky-100 text-sky-700 px-2 py-0.5">P2 小批量测试：潜力赛道 待验证</span>
                    <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5">P3 收缩投入：低贡献低增速</span>
                </div>
            </section>

            {/* ── 5. 人群 × 商品匹配 ───────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">人群 × 商品匹配</h3>
                    <p className="text-xs text-slate-400 mt-0.5">不同人群适合的品类、鞋型、价格带、颜色、材质、功能和波段策略</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SEGMENT_PRODUCT_FIT.map((fit) => (
                        <div key={fit.segmentId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-bold text-slate-900">{fit.segmentName}</div>
                                <div className="flex items-center gap-2">
                                    <div className="text-[10px] text-slate-400">匹配度</div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${fit.fitScore}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-700">{fit.fitScore}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                <div><span className="text-slate-400">品类</span> <span className="font-medium text-slate-800">{fit.recommendedCategory}</span></div>
                                <div><span className="text-slate-400">鞋型</span> <span className="font-medium text-slate-800">{fit.recommendedShoeType}</span></div>
                                <div><span className="text-slate-400">价格带</span> <span className="font-semibold text-blue-700">{fit.recommendedPriceBand}</span></div>
                                <div><span className="text-slate-400">颜色</span> <span className="text-slate-800">{fit.recommendedColor}</span></div>
                                <div><span className="text-slate-400">材质</span> <span className="text-slate-800">{fit.recommendedMaterial}</span></div>
                                <div><span className="text-slate-400">功能</span> <span className="text-slate-800">{fit.recommendedFunction}</span></div>
                                <div><span className="text-slate-400">建议 SKU</span> <span className="font-bold text-slate-900">{fit.recommendedSkuCount} 款</span></div>
                                <div><span className="text-slate-400">建议波段</span> <span className="text-slate-700">{fit.recommendedWave}</span></div>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-slate-200 text-xs">
                                <span className="text-slate-400">建议渠道：</span><span className="text-slate-800">{fit.recommendedChannel}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 6. 年龄 × 价格 × 场景热力图 ─────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">年龄 × 价格带热力图</h3>
                        <p className="text-xs text-slate-400 mt-0.5">哪个年龄段在哪个价格带买了多少 · 用于核心款定价与价带梯度</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
                        {(['net_sales', 'sell_through', 'gm_rate'] as AgeHeatMetric[]).map((m) => (
                            <button key={m} onClick={() => setAgeHeatMetric(m)} className={`text-xs px-2 py-1 rounded ${ageHeatMetric === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                {m === 'net_sales' ? '销售额' : m === 'sell_through' ? '售罄率' : '毛利率'}
                            </button>
                        ))}
                    </div>
                </div>
                <ReactECharts option={ageHeatOption} onEvents={ageHeatEvents} style={{ height: 280 }} notMerge />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-slate-600">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="font-semibold text-slate-700">业务洞察：</span>颜色最深格子 = 主力价带；点击格子可联动全局筛选；高售罄+高毛利格子 = 加深机会
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
                        <span className="font-semibold text-blue-700">核心价带：</span>{topPriceBand}（全客群最高销售贡献）· 建议作为首配主价带
                    </div>
                </div>

                {/* 风格/场景线结构 */}
                <div className="mt-4">
                    <div className="mb-2">
                        <div className="text-xs font-semibold text-slate-700">风格 / 场景线年龄结构</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">各场景线的客群年龄结构 · 判断场景与目标客群的匹配度</p>
                    </div>
                    <ReactECharts option={ageStackOption} onEvents={ageStackEvents} style={{ height: Math.max(200, productLines.length * 40) }} notMerge />
                </div>
            </section>

            {/* ── 7. 设计输入板 ────────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">设计输入板</h3>
                        <p className="text-xs text-slate-400 mt-0.5">基于人群洞察的设计方向 · 面向设计总监的结构化输入</p>
                    </div>
                    <button onClick={() => setDesignInputExpanded((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                        {designInputExpanded ? '▲ 收起' : '▼ 展开全部'}
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(designInputExpanded ? DESIGN_INPUT_DATA : DESIGN_INPUT_DATA.slice(0, 2)).map((item) => (
                        <div key={item.segmentId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-bold text-slate-900">{item.segmentName}</div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.direction === '加大开发' ? 'bg-emerald-100 text-emerald-700' : item.direction === '延续开发' ? 'bg-blue-100 text-blue-700' : item.direction === '小批量测试' ? 'bg-amber-100 text-amber-700' : item.direction === '减少开发' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {item.direction}
                                </span>
                            </div>
                            {/* 功能标签 */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                {item.funcTags.map((tag) => (
                                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-white">{tag}</span>
                                ))}
                            </div>
                            {/* 鞋类专业字段 */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3 rounded-lg border border-slate-200 bg-white p-2.5">
                                <div><span className="text-slate-400">楦型：</span><span className="font-medium text-slate-800">{item.lastType}</span></div>
                                <div><span className="text-slate-400">鞋底：</span><span className="text-slate-800">{item.soleStructure}</span></div>
                                <div><span className="text-slate-400">脚感：</span><span className="text-slate-800">{item.footFeel}</span></div>
                                <div><span className="text-slate-400">穿脱：</span><span className="text-slate-800">{item.wearingMethod}</span></div>
                                <div className="col-span-2"><span className="text-slate-400">重量：</span><span className="font-medium text-emerald-700">{item.weightSense}</span></div>
                            </div>
                            <div className="space-y-1 text-xs">
                                <div><span className="text-slate-400">审美关键词：</span><span className="font-medium text-slate-800">{item.aestheticKeywords}</span></div>
                                <div><span className="text-slate-400">鞋型偏好：</span><span className="text-slate-800">{item.shoeTypePreference}</span></div>
                                <div><span className="text-slate-400">颜色偏好：</span><span className="text-slate-800">{item.colorPreference}</span></div>
                                <div><span className="text-slate-400">材质偏好：</span><span className="text-slate-800">{item.materialPreference}</span></div>
                                <div><span className="text-slate-400">穿着场景：</span><span className="text-slate-800">{item.wearingScenario}</span></div>
                                <div><span className="text-slate-400">竞品参考：</span><span className="text-slate-600 italic">{item.competitorRef}</span></div>
                                <div className="pt-1 border-t border-slate-200 mt-1"><span className="text-emerald-700 font-medium">设计建议：</span><span className="text-slate-800">{item.designSuggestion}</span></div>
                                <div><span className="text-rose-600 font-medium">避免方向：</span><span className="text-slate-700">{item.avoidDirection}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
                {!designInputExpanded && DESIGN_INPUT_DATA.length > 2 && (
                    <div className="mt-2 text-center text-xs text-slate-400">还有 {DESIGN_INPUT_DATA.length - 2} 个人群 · 点击「展开全部」查看</div>
                )}
            </section>

            {/* ── 8. 痛点到功能卖点 ────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">痛点到功能卖点</h3>
                    <p className="text-xs text-slate-400 mt-0.5">用户痛点 → 产品功能 → 设计实现方式 · 每条痛点都对应明确商品动作</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200">
                                {['优先级', '痛点', '对应人群', '发生场景', '功能卖点', '设计实现', '商品建议', '风险'].map((h) => (
                                    <th key={h} className="text-left py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PAIN_POINT_FEATURES.map((item) => (
                                <tr key={item.painPoint} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-2.5 px-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.priority === 'P0' ? 'bg-rose-100 text-rose-700' : item.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{item.priority}</span>
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.painPoint}</td>
                                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.segment}</td>
                                    <td className="py-2.5 px-3 text-slate-600">{item.scenario}</td>
                                    <td className="py-2.5 px-3 font-medium text-emerald-700">{item.feature}</td>
                                    <td className="py-2.5 px-3 text-slate-700">{item.designImpl}</td>
                                    <td className="py-2.5 px-3 text-slate-700">{item.productSuggestion}</td>
                                    <td className="py-2.5 px-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700' : item.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {item.riskLevel === 'low' ? '低' : item.riskLevel === 'medium' ? '中' : '高'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── 9. 消费者决策路径 ────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">消费者决策路径</h3>
                        <p className="text-xs text-slate-400 mt-0.5">从种草到复购的完整路径 · 识别各阶段转化阻力和优化方向</p>
                    </div>
                    <button onClick={() => setJourneyExpanded((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                        {journeyExpanded ? '▲ 收起' : '▼ 展开全部'}
                    </button>
                </div>
                {/* 阶段条 */}
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                    {CONSUMER_JOURNEY.map((j, i) => (
                        <div key={j.stage} className="flex items-center gap-1 shrink-0">
                            <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${i === 0 ? 'bg-blue-600 text-white' : i === CONSUMER_JOURNEY.length - 1 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{j.stage}</div>
                            {i < CONSUMER_JOURNEY.length - 1 && <span className="text-slate-300 text-xs">›</span>}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(journeyExpanded ? CONSUMER_JOURNEY : CONSUMER_JOURNEY.slice(0, 4)).map((item) => (
                        <div key={item.stage} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-bold text-slate-900 mb-2">{item.stage}</div>
                            <div className="space-y-1 text-xs">
                                <div><span className="text-slate-400">关键问题：</span><span className="text-slate-800">{item.keyQuestion}</span></div>
                                <div><span className="text-slate-400">内容需求：</span><span className="text-slate-700">{item.contentNeed}</span></div>
                                <div><span className="text-slate-400">卖点：</span><span className="text-slate-700">{item.productCallout}</span></div>
                                <div><span className="text-slate-400">主渠道：</span><span className="text-slate-700">{item.mainChannel}</span></div>
                                <div className="pt-1 border-t border-slate-200"><span className="text-rose-600">阻力：</span><span className="text-slate-700">{item.conversionBarrier}</span></div>
                                <div><span className="text-emerald-700">优化：</span><span className="text-slate-800">{item.optimizationSuggestion}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
                {!journeyExpanded && CONSUMER_JOURNEY.length > 4 && (
                    <div className="mt-2 text-center text-xs text-slate-400">还有 {CONSUMER_JOURNEY.length - 4} 个阶段 · 点击「展开全部」查看</div>
                )}
            </section>

            {/* ── 10. 内容与渠道偏好 ───────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">内容与渠道偏好</h3>
                    <p className="text-xs text-slate-400 mt-0.5">每个客群的渠道选择 · 内容形式 · 触达成本 · 转化率和推荐内容方向</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200">
                                {['人群', '偏好渠道', '内容形式', '关注卖点', '平台偏好', '触达成本', '转化率', '推荐内容方向'].map((h) => (
                                    <th key={h} className="text-left py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {CONTENT_CHANNEL_DATA.map((item) => (
                                <tr key={item.segmentId} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{item.segmentName}</td>
                                    <td className="py-2.5 px-3 text-slate-700">{item.preferredChannel}</td>
                                    <td className="py-2.5 px-3 text-slate-700">{item.contentFormat}</td>
                                    <td className="py-2.5 px-3 text-slate-700">{item.calloutFocus}</td>
                                    <td className="py-2.5 px-3 text-slate-600">{item.platformPreference}</td>
                                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${item.touchCost.startsWith('低') ? 'bg-emerald-100 text-emerald-700' : item.touchCost.startsWith('高') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{item.touchCost}</span></td>
                                    <td className="py-2.5 px-3 font-semibold text-emerald-700">{item.conversionRate}</td>
                                    <td className="py-2.5 px-3 text-slate-700 max-w-[200px]">{item.contentDirection}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-slate-700">
                    <span className="font-semibold text-amber-700">渠道策略建议：</span>
                    线上主攻 18-35 岁客群，强化 KOL + 直播带货；
                    线下聚焦 36+ 客群体验，强化陈列质感与导购专业度；
                    会员体系打通线上线下，提升 26-35 高价值客群复购率。
                </div>

                {/* 颜色偏好与色系策略 */}
                <div className="mt-5">
                    <div className="mb-3">
                        <div className="text-xs font-semibold text-slate-700">颜色偏好与色系策略</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">面积=销售体量 · 颜色深浅=售罄/毛利 · 点击色块联动筛选</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <div className="mb-2 flex flex-wrap gap-1">
                                <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                                    {(['net_sales', 'pairs_sold'] as TreemapAreaMetric[]).map((m) => (
                                        <button key={m} onClick={() => setTreemapAreaMetric(m)} className={`text-xs px-2 py-1 rounded ${treemapAreaMetric === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            {m === 'net_sales' ? '面积=销售额' : '面积=销量'}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                                    {(['sell_through', 'gm_rate'] as TreemapColorMetric[]).map((m) => (
                                        <button key={m} onClick={() => setTreemapColorMetric(m)} className={`text-xs px-2 py-1 rounded ${treemapColorMetric === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            {m === 'sell_through' ? '颜色=售罄' : '颜色=毛利'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <ReactECharts option={treemapOption} onEvents={treemapEvents} style={{ height: 260 }} notMerge />
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-500 mb-1">色系排行（Top6）</div>
                            {colorRanking.slice(0, 6).map((item, i) => (
                                <div key={item.color_family} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                                    <div className="w-3 h-3 rounded-full shrink-0 border border-slate-300" style={{ background: COLOR_FAMILY_COLORS[item.color_family] ?? '#94A3B8' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-slate-900 truncate">{item.color_family}</div>
                                        <div className="text-[10px] text-slate-500">售罄 {formatPct(item.sell_through)} · 毛利 {formatPct(item.gm_rate)}</div>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 shrink-0">{formatAmount(item.net_sales)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 11. 画像到企划输出 ───────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">画像到商品企划输出</h3>
                        <p className="text-xs text-slate-400 mt-0.5">消费者洞察 → 品类 · 波段 · OTB · 设计 · 销售预测的结构化输出</p>
                    </div>
                    <button onClick={() => setPlanningOutputExpanded((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                        {planningOutputExpanded ? '▲ 收起详情' : '▼ 展开详情'}
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'A. 品类运营', icon: '📦', tab: 'category', items: [`增加：${SEGMENT_PRODUCT_FIT[0].recommendedCategory} · ${SEGMENT_PRODUCT_FIT[2].recommendedCategory}`, `鞋型：${SEGMENT_PRODUCT_FIT[0].recommendedShoeType}`, `价格带：${SEGMENT_PRODUCT_FIT[0].recommendedPriceBand}`], color: 'border-blue-200 bg-blue-50/50', lc: 'text-blue-700' },
                        { label: 'B. 波段企划', icon: '🌊', tab: 'planning', items: ['SS-2A/2B：通勤精致主题', 'AW-4A：品质工装 × 精工材质', '主推人群：品质通勤者 + 精致品味者'], color: 'border-violet-200 bg-violet-50/50', lc: 'text-violet-700' },
                        { label: 'C. OTB预算', icon: '💰', tab: 'otb', items: [`599-799 预算占比提升至 40%`, `宽楦功能款新增 ¥80-120万`, 'SKU 深度：通勤线 +4 款'], color: 'border-amber-200 bg-amber-50/50', lc: 'text-amber-700' },
                        { label: 'D. 设计计划', icon: '✏️', tab: 'planning', items: [`主题：精工 · 轻量 · 功能`, `鞋型：乐福 / 宽楦健步 / 精工休闲`, `颜色：黑米驼 + ${colorStrategySummary.oppColor?.color_family ?? '--'}机会色`], color: 'border-emerald-200 bg-emerald-50/50', lc: 'text-emerald-700' },
                        { label: 'E. 销售预测', icon: '📈', tab: 'forecast', items: [`26-35 增长潜力 +12%`, `18-25 高风险，快返管控`, `46+ 宽楦功能验证期 +15%`], color: 'border-rose-200 bg-rose-50/50', lc: 'text-rose-700' },
                    ].map((output) => (
                        <div key={output.label} className={`rounded-xl border p-4 ${output.color}`}>
                            <div className={`flex items-center justify-between mb-3`}>
                                <div className={`text-xs font-bold ${output.lc}`}>{output.icon} {output.label}</div>
                                <button onClick={() => onJumpToTab?.(output.tab)} className={`text-[10px] ${output.lc} hover:underline`}>→ 跳转</button>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                                {output.items.map((item, i) => (
                                    <li key={i} className="flex gap-1"><span className="text-slate-400 shrink-0">·</span><span>{item}</span></li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                {planningOutputExpanded && (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-bold text-slate-900 mb-3">尺码脚型洞察</div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {SIZE_INSIGHTS.map((item) => (
                                    <div key={item.dimension} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={`rounded-full text-[10px] px-1.5 py-0.5 font-semibold ${item.tagColor}`}>{item.tag}</span>
                                            <span className="text-xs font-semibold text-slate-900">{item.dimension}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-600 mb-1">{item.insight}</div>
                                        <div className="text-[11px] text-slate-800 font-medium">→ {item.action}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-bold text-slate-900 mb-2">颜色 × 品类适配热力图</div>
                            <ReactECharts option={colorHeatOption} style={{ height: Math.max(220, colorFamilies.length * 24) }} notMerge />
                        </div>
                    </div>
                )}
            </section>

            {/* ── 12. 跨模块联动入口 ───────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">跨模块联动入口</h3>
                    <p className="text-xs text-slate-400 mt-0.5">消费者画像数据与其他模块的关系 · 点击直接跳转</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { icon: '📦', label: '品类运营', tab: 'category', desc: '根据人群偏好调整品类、鞋型和价格带', color: 'hover:border-blue-300 hover:bg-blue-50/30' },
                        { icon: '🌊', label: '波段企划', tab: 'planning', desc: '根据人群场景和设计关键词生成波段主题', color: 'hover:border-violet-300 hover:bg-violet-50/30' },
                        { icon: '💰', label: 'OTB预算', tab: 'otb', desc: '根据高价值人群调整品类和价格带预算', color: 'hover:border-amber-300 hover:bg-amber-50/30' },
                        { icon: '📈', label: '销售预测', tab: 'forecast', desc: '根据人群增长和价格接受度修正预测', color: 'hover:border-rose-300 hover:bg-rose-50/30' },
                        { icon: '🔍', label: '竞品&趋势', tab: 'competitor', desc: '验证人群偏好的鞋型、颜色、材质趋势', color: 'hover:border-teal-300 hover:bg-teal-50/30' },
                        { icon: '✏️', label: '设计计划', tab: 'planning', desc: '输出设计 Brief、颜色故事、材质和功能卖点', color: 'hover:border-emerald-300 hover:bg-emerald-50/30' },
                        { icon: '💹', label: '损益', tab: 'profit-loss', desc: '评估不同人群的毛利、退货率和利润贡献', color: 'hover:border-pink-300 hover:bg-pink-50/30' },
                        { icon: '💧', label: '现金流', tab: 'cashflow', desc: '评估高价值人群投入对库存和现金占用的影响', color: 'hover:border-sky-300 hover:bg-sky-50/30' },
                    ].map((link) => (
                        <button
                            key={link.tab + link.label}
                            onClick={() => onJumpToTab?.(link.tab)}
                            className={`text-left rounded-xl border border-slate-200 bg-white p-3 transition-all duration-150 ${link.color}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">{link.icon}</span>
                                <span className="text-xs font-bold text-slate-900">{link.label}</span>
                                <span className="ml-auto text-slate-300 text-xs">→</span>
                            </div>
                            <div className="text-[11px] text-slate-500">{link.desc}</div>
                        </button>
                    ))}
                </div>
            </section>

            {/* ── 13. SKU 验证明细（可折叠） ───────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">SKU 验证明细</h3>
                        <p className="text-xs text-slate-400 mt-0.5">高机会 · 高风险 · 设计验证 · 低效 SKU · 点击「查看全部」展开完整列表</p>
                    </div>
                    <button onClick={() => setSkuExpanded((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                        {skuExpanded ? '▲ 收起' : '▼ 展开明细'}
                    </button>
                </div>

                {skuExpanded && (
                    <>
                        {/* 默认 4 分类视图 */}
                        {!skuShowAll && (
                            <div className="space-y-4">
                                {[
                                    { key: 'high_opp', label: '高机会 SKU', desc: '售罄≥75% + 毛利≥50%，加深备货', color: 'border-emerald-200 bg-emerald-50/50', hc: 'text-emerald-700', rows: [...skuDrillRows].filter((r) => r.sell_through >= 0.75 && r.gm_rate >= 0.5).sort((a, b) => b.sell_through - a.sell_through).slice(0, 8) },
                                    { key: 'high_risk', label: '高风险 SKU', desc: '售罄<40% 且有库存，优先清货', color: 'border-rose-200 bg-rose-50/50', hc: 'text-rose-700', rows: [...skuDrillRows].filter((r) => r.sell_through < 0.4 && r.net_sales > 0).sort((a, b) => a.sell_through - b.sell_through).slice(0, 8) },
                                    { key: 'design_validate', label: '设计验证 SKU', desc: '新款小批量上市，销量低但毛利健康，观察追单', color: 'border-sky-200 bg-sky-50/50', hc: 'text-sky-700', rows: [...skuDrillRows].filter((r) => r.pairs_sold <= 50 && r.gm_rate >= 0.45).sort((a, b) => b.gm_rate - a.gm_rate).slice(0, 8) },
                                    { key: 'low_eff', label: '低效 SKU', desc: '售罄<50% 且毛利<45%，建议收缩或停止开发', color: 'border-amber-200 bg-amber-50/50', hc: 'text-amber-700', rows: [...skuDrillRows].filter((r) => r.sell_through < 0.5 && r.gm_rate < 0.45 && r.net_sales > 0).sort((a, b) => a.sell_through - b.sell_through).slice(0, 8) },
                                ].map((cat) => (
                                    <div key={cat.key} className={`rounded-xl border p-3 ${cat.color}`}>
                                        <div className={`text-xs font-bold mb-1 ${cat.hc}`}>{cat.label} <span className="font-normal text-slate-500">({cat.rows.length} 款)</span> · <span className="font-normal text-[11px] text-slate-500">{cat.desc}</span></div>
                                        {cat.rows.length === 0 ? (
                                            <div className="text-[11px] text-slate-400 py-2 text-center">当前口径下暂无此类 SKU</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-xs">
                                                    <thead><tr className="border-b border-current border-opacity-20">
                                                        {['SKU名称', '年龄', '场景线', '价格带', '色系', '销售额', '售罄', '毛利'].map((h) => (
                                                            <th key={h} className="text-left py-1.5 px-2 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr></thead>
                                                    <tbody>
                                                        {cat.rows.map((row) => (
                                                            <tr key={row.sku_id} className="border-b border-current border-opacity-10 hover:bg-white/50">
                                                                <td className="py-1.5 px-2 font-medium text-slate-900 max-w-[160px] truncate" title={row.sku_name}>{row.sku_name}</td>
                                                                <td className="py-1.5 px-2"><span style={{ color: AGE_COLORS[row.age_group] }} className="font-semibold">{row.age_group}</span></td>
                                                                <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">{row.product_line}</td>
                                                                <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">{row.price_band}</td>
                                                                <td className="py-1.5 px-2 text-slate-600">{row.color_family}</td>
                                                                <td className="py-1.5 px-2 font-bold text-slate-900 whitespace-nowrap">{formatAmount(row.net_sales)}</td>
                                                                <td className={`py-1.5 px-2 font-semibold whitespace-nowrap ${row.sell_through >= 0.75 ? 'text-emerald-700' : row.sell_through >= 0.5 ? 'text-amber-700' : 'text-rose-600'}`}>{formatPct(row.sell_through)}</td>
                                                                <td className="py-1.5 px-2 text-slate-700 whitespace-nowrap">{formatPct(row.gm_rate)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => setSkuShowAll(true)} className="w-full rounded-xl border border-dashed border-slate-300 bg-white py-2.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700">
                                    查看全部 SKU 完整列表 ({skuDrillRows.length} 款) ▼
                                </button>
                            </div>
                        )}

                        {/* 全部 SKU 列表 */}
                        {skuShowAll && (
                            <div>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <div className="flex flex-wrap gap-1">
                                        {([
                                            { key: 'top_sales', label: 'Top 销售' },
                                            { key: 'high_gm', label: '高毛利' },
                                            { key: 'high_st', label: '高售罄' },
                                            { key: 'low_eff', label: '低效 SKU' },
                                            { key: 'growth', label: '增长潜力' },
                                        ] as Array<{ key: typeof skuFilter; label: string }>).map((item) => (
                                            <button key={item.key} onClick={() => setSkuFilter(item.key)} className={`rounded-full px-3 py-1 text-[11px] font-medium border ${skuFilter === item.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setSkuShowAll(false)} className="ml-auto text-[11px] text-slate-500 hover:text-slate-700 underline">← 返回分类视图</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3 text-xs">
                                    {[
                                        { label: '展示 SKU 数', value: `${filteredSkuRows.length} 款` },
                                        { label: '平均售罄', value: formatPct(safeDiv(filteredSkuRows.reduce((s, r) => s + r.sell_through * r.net_sales, 0), filteredSkuRows.reduce((s, r) => s + r.net_sales, 0))) },
                                        { label: '平均毛利', value: formatPct(safeDiv(filteredSkuRows.reduce((s, r) => s + r.gm_rate * r.net_sales, 0), filteredSkuRows.reduce((s, r) => s + r.net_sales, 0))) },
                                        { label: '合计销售额', value: formatAmount(filteredSkuRows.reduce((s, r) => s + r.net_sales, 0)) },
                                    ].map((c) => (
                                        <div key={c.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <div className="text-slate-400">{c.label}</div>
                                            <div className="font-bold text-slate-900 text-sm mt-0.5">{c.value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                {['#', 'SKU名称', '年龄段', '场景线', '品类', '价格带', '色系', '销售额', '售罄率', '毛利率', 'ASP'].map((h) => (
                                                    <th key={h} className="text-left py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSkuRows.map((row, i) => (
                                                <tr key={row.sku_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                                                    <td className="py-2 px-3 font-medium text-slate-900 max-w-[180px] truncate" title={row.sku_name}>{row.sku_name}</td>
                                                    <td className="py-2 px-3"><span style={{ color: AGE_COLORS[row.age_group] }} className="font-semibold">{row.age_group}</span></td>
                                                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{row.product_line}</td>
                                                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{row.category}</td>
                                                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{row.price_band}</td>
                                                    <td className="py-2 px-3 text-slate-700">{row.color_family}</td>
                                                    <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">{formatAmount(row.net_sales)}</td>
                                                    <td className={`py-2 px-3 font-semibold whitespace-nowrap ${row.sell_through >= 0.75 ? 'text-emerald-700' : row.sell_through >= 0.5 ? 'text-amber-700' : 'text-rose-600'}`}>{formatPct(row.sell_through)}</td>
                                                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{formatPct(row.gm_rate)}</td>
                                                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{formatAmount(row.asp)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
            </section>

            <FloatingModuleNav
                moduleLinks={buildMerchModuleLinks('consumer')}
                pageSections={CONSUMER_PAGE_SECTIONS}
            />
        </div>
    );
}
