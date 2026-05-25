/**
 * 品牌定位 · 市场调研数据
 * 源：2026 春季产品企划 PPT 第 17-23 页
 * - PEST 外部环境
 * - SWOT 内部环境（6 维度 × 4 象限）
 * - 内部能力雷达图（现状 vs 目标）
 * - TOWS 战略矩阵
 * - 六大核心对策
 */

/* ════════════════════════════════════════════════
   1. PEST · 外部市场环境
   ════════════════════════════════════════════════ */
export type PestDimensionKey = 'P' | 'E' | 'S' | 'T';

export interface PestDimension {
  key: PestDimensionKey;
  letter: string;
  title: string;
  subtitle: string;
  accent: 'indigo' | 'amber' | 'rose' | 'cyan';
  signals: { keyword: string; brief: string }[];
  responses: { keyword: string; action: string }[];
}

export const PEST_DATA: PestDimension[] = [
  {
    key: 'P',
    letter: 'P',
    title: '政策红利',
    subtitle: 'Political · 合规导向',
    accent: 'indigo',
    signals: [
      { keyword: '双碳目标', brief: '3060 国策推动 ESG 合规' },
      { keyword: '银发经济', brief: '老龄化人口持续增长' },
      { keyword: '新质生产力', brief: '产业升级 / 数实融合' },
      { keyword: '全民健身', brief: '露营 / 步道 / 口袋公园基建' },
    ],
    responses: [
      { keyword: '环保限定', action: '竹纤维 RPET 撬动绿色赛道流量' },
      { keyword: '宽楦健行', action: 'Wide-fit 概念占领健康政策风口' },
      { keyword: 'AI 数实融合', action: '全渠道库存通 / 会员通 / 服务通' },
      { keyword: 'Gorpcore 常态', action: '5+2 鞋履，多场景融合' },
    ],
  },
  {
    key: 'E',
    letter: 'E',
    title: '经济环境',
    subtitle: 'Economic · 增长压力',
    accent: 'amber',
    signals: [
      { keyword: '扩大内需', brief: '提振消费拉动经济' },
      { keyword: '经济下行', brief: '消费态度趋保守' },
      { keyword: '物价上涨', brief: '产品成本压利润' },
      { keyword: '贸易壁垒', brief: '关税推高出口成本' },
    ],
    responses: [
      { keyword: '文旅融合', action: '假日经济，轻旅系列开发' },
      { keyword: '耐穿叙事', action: '对抗 K 型分化，单品多场景' },
      { keyword: '高价值感', action: '降本增效，提升周转率' },
      { keyword: '供应链本土化', action: '非核心产能全球化' },
    ],
  },
  {
    key: 'S',
    letter: 'S',
    title: '社会与文化',
    subtitle: 'Social · 价值跃迁',
    accent: 'rose',
    signals: [
      { keyword: '价值跃迁', brief: '从功能穿着到精神社交' },
      { keyword: '决策重塑', brief: '种草到直播视觉导向' },
      { keyword: '地域差异', brief: '南北市场精细化需求' },
    ],
    responses: [
      { keyword: '圈层 KOL', action: '"意见领袖"塑造生活态度' },
      { keyword: '视觉前置', action: '种草关键词 + 直播显性卖点' },
      { keyword: '南北分波段', action: '北方冬绒 / 南方透气分发' },
    ],
  },
  {
    key: 'T',
    letter: 'T',
    title: '技术',
    subtitle: 'Tech · 智能赋能',
    accent: 'cyan',
    signals: [
      { keyword: 'AI 赋能', brief: '提效传统工作方式' },
      { keyword: '科技材料', brief: '高温湿热防寒痛点解决' },
      { keyword: '视觉零售', brief: '线上体验成转化关键' },
    ],
    responses: [
      { keyword: 'AI + 3D', action: '试错成本 -30% / 效率 +50%' },
      { keyword: 'PCM Coolmax', action: 'GORE-TEX Surround 透气科技' },
      { keyword: 'AR 试穿', action: '可视化科技演示降低退货' },
    ],
  },
];

/* ════════════════════════════════════════════════
   2. SWOT · 内部环境（6 维度 × 4 象限）
   ════════════════════════════════════════════════ */
export type SwotQuadrantKey = 'S' | 'W' | 'O' | 'T';
export type SwotDimensionKey = '产品' | '价格' | '服务' | '渠道' | '供应链' | '组织';

export interface SwotQuadrant {
  key: SwotQuadrantKey;
  letter: string;
  title: string;
  subtitle: string;
  accent: 'emerald' | 'amber' | 'sky' | 'rose';
  items: { dimension: SwotDimensionKey; keyword: string; description: string }[];
}

export const SWOT_DATA: SwotQuadrant[] = [
  {
    key: 'S',
    letter: 'S',
    title: '优势',
    subtitle: 'Strengths',
    accent: 'emerald',
    items: [
      { dimension: '产品', keyword: 'ESG 先锋形象', description: '独家创意资产 + 极高艺术辨识度（Kobarah/Twins）' },
      { dimension: '价格', keyword: '稳定溢价体系', description: '高价值感 + 纯皮材质，1500+ 定价支撑' },
      { dimension: '服务', keyword: '2 年超长质保', description: '"耐用可靠"品牌信任基石 + 忠诚会员体系' },
      { dimension: '渠道', keyword: 'O2O 全渠道', description: '地标旗舰 + 完善电商 + 强叙事广告大片' },
      { dimension: '供应链', keyword: '欧洲原产地', description: '地中海沿岸生产符合"原产地溢价"逻辑' },
      { dimension: '组织', keyword: '设计审美在线', description: '内部团队对品牌 DNA 理解深刻，出品稳定' },
    ],
  },
  {
    key: 'W',
    letter: 'W',
    title: '劣势',
    subtitle: 'Weaknesses',
    accent: 'amber',
    items: [
      { dimension: '产品', keyword: '夏季痛点', description: '皮款"闷热/厚重"+ 欧洲楦对中国宽脚不友好' },
      { dimension: '价格', keyword: '入门门槛高', description: '缺 800-1000 元流量价位，难吸 Z 世代尝鲜' },
      { dimension: '服务', keyword: '电商退货率高', description: '线上无法感知皮质 + 售后维修响应慢' },
      { dimension: '渠道', keyword: '直播起步晚', description: '抖音/直播投入保守，缺"3 秒停留"视觉抓手' },
      { dimension: '供应链', keyword: '长交期通病', description: '补货 3-6 个月，难应中国快速爆款返单' },
      { dimension: '组织', keyword: '数字化人才缺', description: 'AIGC/直播分析掌握不足 + 跨部门选款视角冲突' },
    ],
  },
  {
    key: 'O',
    letter: 'O',
    title: '机会',
    subtitle: 'Opportunities',
    accent: 'sky',
    items: [
      { dimension: '产品', keyword: '都市机能', description: '足弓支撑/防滑需求爆发，市场 CAGR +9%' },
      { dimension: '价格', keyword: '理性溢价', description: '消费者愿为"穿 5 年"的耐用品买单' },
      { dimension: '服务', keyword: 'AR 试鞋', description: 'City Walk 活动 + 旧鞋回收抵用券' },
      { dimension: '渠道', keyword: '兴趣电商', description: '抖音/小红书内容带流量 + 私域精细复购' },
      { dimension: '供应链', keyword: 'AI 预测', description: '尤其优化断码严重的 37/38 码首单配比' },
      { dimension: '组织', keyword: '买手制转型', description: '一线店长参选款，提高订货准确率' },
    ],
  },
  {
    key: 'T',
    letter: 'T',
    title: '威胁',
    subtitle: 'Threats',
    accent: 'rose',
    items: [
      { dimension: '产品', keyword: '运动品时尚化', description: 'Salomon/Hoka 抢占"舒适走路鞋"市场份额' },
      { dimension: '价格', keyword: '供应链涨价', description: '国产高端品牌 600-900 元提供类似风格' },
      { dimension: '服务', keyword: '苛刻舒适预期', description: '"踩屎感"教育降低对皮鞋瑕疵容忍度' },
      { dimension: '渠道', keyword: '商场客流降', description: '渠道碎片化，公域 CAC 持续上涨' },
      { dimension: '供应链', keyword: '原料短缺', description: '顶级环保皮料（植物鞣革）产能受限' },
      { dimension: '组织', keyword: '复合人才流失', description: '"审美+数据"双能力人才被竞品高薪挖角' },
    ],
  },
];

/* ════════════════════════════════════════════════
   3. 内部能力雷达图（6 维度，当前 vs SS26 目标）
   ════════════════════════════════════════════════ */
export interface CapabilityRadarItem {
  dimension: string;
  enName: string;
  current: number;
  target: number;
  gap: number;
  note: string;
}

export const CAPABILITY_RADAR: CapabilityRadarItem[] = [
  { dimension: '产品力',  enName: 'Product',      current: 3.5, target: 4.5, gap: +1.0, note: '夏季痛点 + 宽楦缺位' },
  { dimension: '价格力',  enName: 'Price',        current: 4.0, target: 4.5, gap: +0.5, note: '需补 800-1000 元流量带' },
  { dimension: '服务力',  enName: 'Service',      current: 2.0, target: 4.5, gap: +2.5, note: 'AR 试鞋 + 退货率攻坚' },
  { dimension: '销售模式', enName: 'Sales',       current: 3.0, target: 4.5, gap: +1.5, note: '直播 + 私域转型缺位' },
  { dimension: '供应链',  enName: 'Supply Chain', current: 2.0, target: 4.0, gap: +2.0, note: '柔性快返 + AI 配货' },
  { dimension: '组织能力', enName: 'Org',         current: 3.0, target: 4.5, gap: +1.5, note: '数字化人才 + 买手制' },
];

/* ════════════════════════════════════════════════
   4. TOWS 战略矩阵（6 维度 × 4 战略象限）
   ════════════════════════════════════════════════ */
export type TowsQuadrantKey = 'SO' | 'WO' | 'ST' | 'WT';
export interface TowsCell {
  dimension: SwotDimensionKey;
  area: 'front' | 'back';
  quadrant: TowsQuadrantKey;
  title: string;
  detail: string;
}

export const TOWS_MATRIX: TowsCell[] = [
  // 产品
  { dimension: '产品', area: 'front', quadrant: 'SO', title: '都市机能化', detail: 'Gorpcore 趋势下 City Walk 衍生系列' },
  { dimension: '产品', area: 'front', quadrant: 'WO', title: 'Camper Air 透气', detail: '凉感内里 + 物理打孔，补齐夏季短板' },
  { dimension: '产品', area: 'front', quadrant: 'ST', title: '工艺护城河', detail: '强化"手作感"，抵御工业化竞品' },
  { dimension: '产品', area: 'front', quadrant: 'WT', title: 'AI 降本增效', detail: '宽楦减少挤脚 + 算法降本' },
  // 价格
  { dimension: '价格', area: 'front', quadrant: 'SO', title: 'ESG 道德溢价', detail: '环保叙事 + 长期价值定价' },
  { dimension: '价格', area: 'front', quadrant: 'WO', title: 'Wabi 入门款', detail: '800-1000 元引流款圈粉 Z 世代' },
  { dimension: '价格', area: 'front', quadrant: 'ST', title: 'CPW 价值战', detail: '单次穿着成本对标快时尚' },
  { dimension: '价格', area: 'front', quadrant: 'WT', title: '严控折扣率', detail: '积分代替降价，保护品牌价值' },
  // 服务
  { dimension: '服务', area: 'front', quadrant: 'SO', title: '社群行走计划', detail: 'City Walk 把服务延伸到"带客户玩"' },
  { dimension: '服务', area: 'front', quadrant: 'WO', title: 'AR 试穿工程', detail: '辅助尺码决策，降低退货率 20%' },
  { dimension: '服务', area: 'front', quadrant: 'ST', title: '无忧承诺', detail: '2 年质保 + 旧鞋回收抵用' },
  { dimension: '服务', area: 'front', quadrant: 'WT', title: '预期管理前置', detail: '随箱"磨合包" + 抑制差评' },
  // 渠道
  { dimension: '渠道', area: 'front', quadrant: 'SO', title: '策展式零售', detail: 'Showroom 联名艺术家做网红打卡' },
  { dimension: '渠道', area: 'front', quadrant: 'WO', title: '直播视觉工程', detail: '专业剪辑团队 + 关键词精准投放' },
  { dimension: '渠道', area: 'front', quadrant: 'ST', title: '私域蓄水池', detail: 'LTV 优先，企微 1v1 高净值复购' },
  { dimension: '渠道', area: 'front', quadrant: 'WT', title: '精准圈层投放', detail: '场景词 + 圈层定向，降 CAC' },
  // 供应链
  { dimension: '供应链', area: 'back', quadrant: 'SO', title: '原产地叙事', detail: 'Made in EU 作为高端卖点包装' },
  { dimension: '供应链', area: 'back', quadrant: 'WO', title: 'AI 智能配货', detail: 'Size Opt. 优化断码 37/38 配比' },
  { dimension: '供应链', area: 'back', quadrant: 'ST', title: '战略备料', detail: 'Material Booking 提前锁定经典款皮料' },
  { dimension: '供应链', area: 'back', quadrant: 'WT', title: 'Drop System', detail: '分波段调拨，南北时差消死货' },
  // 组织
  { dimension: '组织', area: 'back', quadrant: 'SO', title: '设计师 IP 化', detail: 'KOL 化设计师，打造"最懂鞋"团队' },
  { dimension: '组织', area: 'back', quadrant: 'WO', title: '买手制改革', detail: '店长投票，一线参与选款' },
  { dimension: '组织', area: 'back', quadrant: 'ST', title: '人才护城河', detail: '文化留人 + 复合人才阶梯培养' },
  { dimension: '组织', area: 'back', quadrant: 'WT', title: 'AI 全员培训', detail: 'Midjourney 等工具普及，提人效' },
];

/* ════════════════════════════════════════════════
   5. 六大核心对策（行动卡）
   ════════════════════════════════════════════════ */
export interface CoreStrategy {
  id: string;
  number: string;
  dimension: SwotDimensionKey;
  accent: 'indigo' | 'amber' | 'rose' | 'cyan' | 'emerald' | 'violet';
  thesis: string;
  description: string;
  actions: { tag: string; tagTone: 'attack' | 'improve' | 'defend' | 'stoploss'; title: string; detail: string }[];
  target: string;
}

export const CORE_STRATEGIES: CoreStrategy[] = [
  {
    id: 'product',
    number: '01',
    dimension: '产品',
    accent: 'indigo',
    thesis: '攻克夏季痛点，抢占增量市场',
    description: '透气科技 + City Walk 衍生系列，双向突破"皮鞋夏季无穿"困境',
    actions: [
      { tag: 'S+O 进攻', tagTone: 'attack', title: 'City Walk 衍生系列', detail: '将 Karst 打造为轻户外主推款，强化防滑/包裹' },
      { tag: 'W+O 改良', tagTone: 'improve', title: 'Camper Air 透气系统', detail: '凉感内里 + 物理打孔，让皮鞋也能透气' },
    ],
    target: '源头降低 20% 退货率',
  },
  {
    id: 'price',
    number: '02',
    dimension: '价格',
    accent: 'amber',
    thesis: '守住中产价位，降低获客门槛',
    description: '电商基本款做入门钩子，先圈粉 Z 世代再做高客单转化',
    actions: [
      { tag: 'S+O 进攻', tagTone: 'attack', title: '800-1000 元 Wabi 引流款', detail: '研发电商平台基本款作为获客入口' },
    ],
    target: '圈粉 Z 世代，完成首单',
  },
  {
    id: 'service',
    number: '03',
    dimension: '服务',
    accent: 'rose',
    thesis: '科技赋能体验，建立信任壁垒',
    description: 'AR 虚拟试鞋 + 磨合教育，从"硬服务"延伸到"心理预期管理"',
    actions: [
      { tag: 'W+O 改良', tagTone: 'improve', title: 'AR 虚拟试鞋', detail: '部署 AR 试鞋功能，辅助尺码决策' },
      { tag: 'W+T 止损', tagTone: 'stoploss', title: '无忧磨合包', detail: '附赠"磨合指南"+ 试穿袜，抑制差评' },
    ],
    target: '解决尺码不准，提升信任',
  },
  {
    id: 'channel',
    number: '04',
    dimension: '渠道',
    accent: 'cyan',
    thesis: '视觉内容种草，全域流量闭环',
    description: '策展式零售 + 专业直播 + 私域蓄水，三段式构建全域流量飞轮',
    actions: [
      { tag: 'S+O 进攻', tagTone: 'attack', title: '策展型零售', detail: '核心门店 / 露营节 / 美术馆"快闪策展"' },
      { tag: 'W+O 改良', tagTone: 'improve', title: '直播视觉工程', detail: '成立专业剪辑团队，小红书 / 抖音流量玩法' },
    ],
    target: '提升直播 / 小红书 CTR',
  },
  {
    id: 'supply-chain',
    number: '05',
    dimension: '供应链',
    accent: 'emerald',
    thesis: '柔性快反，平衡效率与风险',
    description: '经典款战略备料锁价格 + 时尚款分波段快反，对冲长交期硬伤',
    actions: [
      { tag: 'S+T 防御', tagTone: 'defend', title: '战略备料', detail: '经典基本款皮料提前锁定，规避成本上涨' },
      { tag: 'W+T 止损', tagTone: 'stoploss', title: '分波段上市 + 30% 快反', detail: '南北分波段，区域气候时间差调拨' },
    ],
    target: '利用时差调拨，消灭死货',
  },
  {
    id: 'org',
    number: '06',
    dimension: '组织',
    accent: 'violet',
    thesis: '数字化转型，激活个体战力',
    description: '设计师 KOL 化做品牌势能 + AI 工具普及做基础人效',
    actions: [
      { tag: 'S+O 进攻', tagTone: 'attack', title: '设计师 IP 化', detail: '设计师/买手前台化做小红书博主' },
      { tag: 'W+T 止损', tagTone: 'stoploss', title: 'AI 全员培训', detail: '推广 Midjourney 等 AI 工具，提升人效' },
    ],
    target: '缩短研发周期，降低成本',
  },
];
