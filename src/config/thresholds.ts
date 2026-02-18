/**
 * Dashboard 3.0 — 全局阈值与目标配置
 * 所有 KPI 目标值、警戒线、风险阈值统一在此管理，禁止在组件中写死。
 */

export const THRESHOLDS = {
    /** 售罄率 */
    sellThrough: {
        target: 0.80,    // 目标：80%
        warning: 0.65,   // 警戒：65%
        danger: 0.50,    // 风险：50%
    },
    /** 毛利率 */
    marginRate: {
        target: 0.45,    // 目标：45%
        warning: 0.40,   // 警戒：40%
        danger: 0.35,    // 风险：35%
    },
    /** 折扣深度（越低越好） */
    discountDepth: {
        good: 0.10,      // 健康：≤10%
        warning: 0.15,   // 警戒：15%
        danger: 0.20,    // 风险：20%
    },
    /** 剩余库存（双数） */
    onHandUnit: {
        high: 200,       // 高库存警戒线
        critical: 500,   // 严重积压线
    },
    /** Top10 SKU 集中度 */
    top10Concentration: {
        warning: 0.60,   // 警戒：60%
        danger: 0.75,    // 风险：75%
    },
    /** 渠道集中度 */
    channelConcentration: {
        warning: 0.60,   // 单渠道占比警戒
    },
} as const;

/** 风险优先级评分规则 */
export function calcRiskPriority(risks: string[]): 'P0' | 'P1' | 'P2' {
    if (risks.includes('低售罄') && risks.includes('高库存')) return 'P0';
    if (risks.includes('低售罄') || risks.includes('折扣异常')) return 'P1';
    if (risks.includes('低毛利') || risks.includes('高库存')) return 'P1';
    return 'P2';
}

/** 根据风险标签生成建议动作 */
export function getActionSuggestion(risks: string[], sellThrough: number, onHandUnit: number): string {
    if (risks.includes('低售罄') && risks.includes('高库存')) {
        return '渠道调拨 + 组合促销，目标清库';
    }
    if (risks.includes('低售罄') && sellThrough < 0.50) {
        return '立即降价 15-20%，加大电商投放';
    }
    if (risks.includes('低售罄')) {
        return '加大投放 / 降价 10%，关注渠道错配';
    }
    if (risks.includes('折扣异常')) {
        return '检查券叠加规则 / 价格体系，收敛折扣';
    }
    if (risks.includes('低毛利')) {
        return '收敛促销折扣，优化成本结构';
    }
    if (risks.includes('高库存') && onHandUnit > 500) {
        return '紧急调拨至高售罄渠道，避免季末甩货';
    }
    if (risks.includes('高库存')) {
        return '作为补深候选，控制新增采购';
    }
    return '健康款，可作为补深候选';
}

/** 预估收益文字（简单规则版） */
export function getEstimatedImpact(risks: string[], sellThrough: number, onHandUnit: number, msrp: number): string {
    if (risks.includes('低售罄') && risks.includes('高库存')) {
        const potentialRevenue = Math.round(onHandUnit * msrp * 0.7 / 10000);
        return `清库可回收约 ¥${potentialRevenue}万`;
    }
    if (risks.includes('低售罄')) {
        const gap = Math.round((0.80 - sellThrough) * 100);
        return `售罄提升 ${gap}pp 可减少库存积压`;
    }
    if (risks.includes('折扣异常')) {
        return '折扣收敛 5pp 可提升毛利约 2pp';
    }
    if (risks.includes('低毛利')) {
        return '折扣收敛可恢复毛利 3-5pp';
    }
    return '维持现状，关注库存深度';
}
