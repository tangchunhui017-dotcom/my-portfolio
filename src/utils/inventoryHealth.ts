/**
 * src/utils/inventoryHealth.ts
 * 库存健康诊断工具函数 — WOS / 售罄率 / 断码率 / 四象限 / 风险等级 / 动作推荐
 */

export type RiskType = 'stockout' | 'tight' | 'healthy' | 'high' | 'overstock';
export type SalesVelocity = 'high' | 'medium' | 'low';
export type StockLevel = 'low' | 'medium' | 'high';
export type QuadrantKey = 'high_sales_low_stock' | 'high_sales_high_stock' | 'low_sales_high_stock' | 'low_sales_low_stock';

export const CATEGORY_LABELS: Record<string, string> = {
    running: '跑鞋',
    casual: '休闲鞋',
    outdoor: '户外鞋',
    training: '训练鞋',
    slippers: '凉拖',
    boots: '靴类',
    kids: '童鞋',
};

export const CHANNEL_LABELS: Record<string, string> = {
    physical: '实体门店',
    ecommerce: '电商',
    new_store: '新店',
    outlet: '奥莱/清货',
};

export interface StyleRecord {
    styleId: string;
    name: string;
    category: string;
    waveKey: string;
    channel: string;
    region: string;
    onHandQty: number;
    availableQty: number;
    inTransitQty: number;
    reservedQty: number;
    last7dSales: number;
    last14dSales: number;
    last30dSales: number;
    stockAmount: number;
    grossMarginRate: number;
    msrp: number;
    launchDate: string;
    lifecycle: string;
    salesVelocity: SalesVelocity;
    stockLevel: StockLevel;
    wos: number;
    sellThrough: number;
    riskType: RiskType;
    action: string;
    actionLink: string | null;
    financialImpact: number;
    coreSize: { coverRate: number; brokenSizes: string[]; marginalOverstock: string[] };
}

export interface WosBucket {
    key: RiskType;
    label: string;
    desc: string;
    min: number;
    max: number;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
}

export const WOS_BUCKETS: WosBucket[] = [
    { key: 'stockout', label: '< 4 周', desc: '断货风险', min: 0, max: 4, color: '#ef4444', bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-200' },
    { key: 'tight', label: '4–6 周', desc: '库存偏紧', min: 4, max: 6, color: '#f97316', bgClass: 'bg-orange-50', textClass: 'text-orange-700', borderClass: 'border-orange-200' },
    { key: 'healthy', label: '6–8 周', desc: '健康区间', min: 6, max: 8, color: '#22c55e', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
    { key: 'high', label: '8–12 周', desc: '库存偏高', min: 8, max: 12, color: '#eab308', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
    { key: 'overstock', label: '> 12 周', desc: '积压风险', min: 12, max: Infinity, color: '#8b5cf6', bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-200' },
];

export function getWosBucket(wos: number): WosBucket {
    return WOS_BUCKETS.find(b => wos >= b.min && wos < b.max) ?? WOS_BUCKETS[4];
}

export type WosViewMode = 'sku' | 'qty' | 'amount';

export interface WosBucketStat {
    bucket: WosBucket;
    skuCount: number;
    totalQty: number;
    totalAmount: number;
}

export function calcWosDistribution(styles: StyleRecord[]): WosBucketStat[] {
    return WOS_BUCKETS.map(bucket => {
        const matched = styles.filter(s => s.wos >= bucket.min && s.wos < bucket.max);
        return {
            bucket,
            skuCount: matched.length,
            totalQty: matched.reduce((s, r) => s + r.availableQty, 0),
            totalAmount: matched.reduce((s, r) => s + r.stockAmount, 0),
        };
    });
}

export type QuadrantDef = {
    key: QuadrantKey;
    label: string;
    desc: string;
    icon: string;
    color: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    action: string;
};

export const QUADRANTS: QuadrantDef[] = [
    { key: 'high_sales_low_stock', label: '高销·缺货', desc: '立即补货/调拨', icon: '🚀', color: '#ef4444', bgClass: 'bg-red-50', borderClass: 'border-red-200', textClass: 'text-red-700', action: '紧急补货' },
    { key: 'high_sales_high_stock', label: '高销·充足', desc: '保持供应', icon: '✅', color: '#22c55e', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', textClass: 'text-emerald-700', action: '维持现状' },
    { key: 'low_sales_high_stock', label: '低销·积压', desc: '折扣/清货/换陈', icon: '⚠️', color: '#8b5cf6', bgClass: 'bg-purple-50', borderClass: 'border-purple-200', textClass: 'text-purple-700', action: '折扣清货' },
    { key: 'low_sales_low_stock', label: '低销·正常', desc: '停补/观察', icon: '⏸️', color: '#94a3b8', bgClass: 'bg-slate-50', borderClass: 'border-slate-200', textClass: 'text-slate-600', action: '停补观察' },
];

export function getQuadrant(style: StyleRecord): QuadrantKey {
    const highSales = style.salesVelocity === 'high' || style.salesVelocity === 'medium';
    const highStock = style.stockLevel === 'high' || style.wos > 12;
    if (highSales && !highStock) return 'high_sales_low_stock';
    if (highSales && highStock) return 'high_sales_high_stock';
    if (!highSales && highStock) return 'low_sales_high_stock';
    return 'low_sales_low_stock';
}

export function calcQuadrantGroups(styles: StyleRecord[]): Record<QuadrantKey, StyleRecord[]> {
    const groups: Record<QuadrantKey, StyleRecord[]> = {
        high_sales_low_stock: [], high_sales_high_stock: [], low_sales_high_stock: [], low_sales_low_stock: [],
    };
    styles.forEach(s => groups[getQuadrant(s)].push(s));
    return groups;
}

export function calcSellThrough(soldQty: number, initialQty: number): number {
    return initialQty > 0 ? Math.min(soldQty / initialQty, 1) : 0;
}

export function calcOpportunityLoss(dailySales: number, wos: number, msrp: number, grossMarginRate: number): number {
    if (wos >= 4) return 0;
    const missingDays = (4 - wos) * 7;
    return Math.round(missingDays * dailySales * msrp * grossMarginRate);
}

export function getRiskBadgeStyle(riskType: RiskType): string {
    const map: Record<RiskType, string> = {
        stockout: 'bg-red-100 text-red-700 border-red-200',
        tight: 'bg-orange-100 text-orange-700 border-orange-200',
        healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        high: 'bg-amber-100 text-amber-700 border-amber-200',
        overstock: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return map[riskType] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

export function getRiskLabel(riskType: RiskType): string {
    const map: Record<RiskType, string> = {
        stockout: '断货', tight: '偏紧', healthy: '健康', high: '偏高', overstock: '积压',
    };
    return map[riskType] ?? riskType;
}

export function getCategoryLabel(category: string): string {
    return CATEGORY_LABELS[category] ?? category;
}

export function getChannelLabel(channel: string): string {
    return CHANNEL_LABELS[channel] ?? channel;
}

export function fmtCny(v: number): string {
    const a = Math.abs(v); const sign = v < 0 ? '-' : '';
    if (a >= 1e8) return sign + '¥' + (a / 1e8).toFixed(2) + '亿';
    if (a >= 1e7) return sign + '¥' + (a / 1e7).toFixed(1) + '千万';
    if (a >= 1e4) return sign + '¥' + (a / 1e4).toFixed(0) + '万';
    return sign + '¥' + a.toLocaleString();
}
