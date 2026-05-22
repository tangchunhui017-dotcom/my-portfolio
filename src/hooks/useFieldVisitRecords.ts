'use client';

import { useEffect, useState } from 'react';
import type { FieldVisitRecord } from '@/types/competitorTrendTypes';

const LS_KEY = 'competitor_field_visit_records';

// ─── Seed Records ─────────────────────────────────────────────────────────────
const SEED_RECORDS: FieldVisitRecord[] = [
    {
        id: 'seed_001',
        createdAt: '2026-05-10T10:30:00.000Z',
        visitDate: '2026-05-10',
        researcher: '王晓琳',
        city: '上海',
        mall: '静安大悦城',
        competitorBrand: 'New Balance',
        windowDisplay: '厚底老爹鞋-米白色-绒面革',
        storeProducts: '老爹鞋45%/跑鞋30%/板鞋15%/其他10%',
        colorMaterial: '大地色系（米/灰/橄榄）+绒面革/猪皮拼接',
        staffPushItem: '990v6 灰米配色',
        staffPushKeywords: '宽楦不挤脚+全天候缓震+百搭低调',
        keyPrice: '吊牌价519，活动价469，约9折',
        promotionActivity: '满400减50，会员再享9.5折',
        summary: '橱窗主推990v6大地色系，陈列以复古感为主，店员强调宽楦舒适感和全天候穿搭场景。本品应尽快布局厚底老爹鞋，大地色系是安全入场配色。店内人流量高，老爹鞋区域驻留时间最长，消费者以25-35岁女性为主。',
        tags: ['主推厚底', '大地色系', '宽楦舒适', '年轻女性'],
    },
    {
        id: 'seed_002',
        createdAt: '2026-05-14T14:00:00.000Z',
        visitDate: '2026-05-14',
        researcher: '陈明远',
        city: '北京',
        mall: '三里屯太古里',
        competitorBrand: 'Salomon',
        windowDisplay: '越野跑鞋-电光蓝/警示橙-TPU骨架+工业织物',
        storeProducts: '越野跑鞋50%/公路跑鞋30%/休闲款20%',
        colorMaterial: '电光蓝/荧光绿/警示橙，高识别度配色为主',
        staffPushItem: 'XT-6 Advanced 夏季户外',
        staffPushKeywords: '全地形防滑+快穿Quicklace系统+防穿刺大底',
        keyPrice: '吊牌价849，无折扣，全价销售',
        promotionActivity: '无促销，全年不打折策略',
        summary: '品牌坚持全价策略，店员非常专业，能精准区分路跑和越野跑的不同需求。客群以30-45岁户外爱好者和都市跑者为主，购买决策周期较长但忠诚度高。本品切入越野跑鞋应重点突破快穿系统和功能卖点差异化，而非价格竞争。',
        tags: ['全价策略', '专业户外', '功能卖点强', '高客单价'],
    },
    {
        id: 'seed_003',
        createdAt: '2026-05-18T11:15:00.000Z',
        visitDate: '2026-05-18',
        researcher: '张美华',
        city: '成都',
        mall: 'IFS国际金融中心',
        competitorBrand: 'Hoka',
        windowDisplay: '厚底公路跑鞋-糖果粉/白-全长CMEVA超厚中底',
        storeProducts: '公路跑鞋55%/越野跑鞋25%/行走鞋20%',
        colorMaterial: '糖果色系（粉/蓝/绿）+中底高对比撞色',
        staffPushItem: 'Clifton 9 糖果粉配色',
        staffPushKeywords: '超轻190g+超厚缓震+减少下肢疲劳',
        keyPrice: '吊牌价699，买赠活动，赠跑步袜两双',
        promotionActivity: '买赠：购买任意款赠跑步袜2双',
        summary: '超厚中底的视觉冲击力强，糖果色系非常吸引年轻女性驻足。店员话术重点围绕"减轻疲劳感"，适合久站人群。成都门店女性占比超60%，价格接受度高。本品可借鉴超厚中底的视觉展示方式，糖果色系在成都市场验证可行。',
        tags: ['超厚中底', '糖果色', '女性为主', '买赠促销'],
    },
];

function loadFromStorage(): FieldVisitRecord[] {
    if (typeof window === 'undefined') return SEED_RECORDS;
    try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (!raw) return SEED_RECORDS;
        const parsed = JSON.parse(raw) as FieldVisitRecord[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_RECORDS;
    } catch {
        return SEED_RECORDS;
    }
}

function saveToStorage(records: FieldVisitRecord[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LS_KEY, JSON.stringify(records));
    } catch {
        // ignore quota errors
    }
}

export function useFieldVisitRecords() {
    const [records, setRecords] = useState<FieldVisitRecord[]>(() => loadFromStorage());

    useEffect(() => {
        saveToStorage(records);
    }, [records]);

    function addRecord(record: Omit<FieldVisitRecord, 'id' | 'createdAt'>): void {
        const newRecord: FieldVisitRecord = {
            ...record,
            id: `visit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            createdAt: new Date().toISOString(),
        };
        setRecords((prev) => [newRecord, ...prev]);
    }

    function deleteRecord(id: string): void {
        setRecords((prev) => prev.filter((r) => r.id !== id));
    }

    return { records, addRecord, deleteRecord };
}
