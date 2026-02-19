'use client';

import { useState, useMemo } from 'react';

type SkuWosItem = {
    skuId: string;
    name: string;
    category: string;
    wos: number;
    onHandUnits: number;
    sellThrough: number;
    lifecycle: string;
    msrp: number;
};

type ActionType = '紧急补货' | '适量补货' | '折扣促销' | '组合促销' | '清仓处置' | '调拨处理' | '补深追加' | '持续观察';
type StatusType = '待处理' | '进行中' | '已完成' | '已搁置';

const ACTION_OPTIONS: ActionType[] = ['紧急补货', '适量补货', '折扣促销', '组合促销', '清仓处置', '调拨处理', '补深追加', '持续观察'];
const STATUS_OPTIONS: StatusType[] = ['待处理', '进行中', '已完成', '已搁置'];

const STATUS_STYLE: Record<StatusType, string> = {
    '待处理': 'bg-red-50 text-red-700 border-red-200',
    '进行中': 'bg-blue-50 text-blue-700 border-blue-200',
    '已完成': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '已搁置': 'bg-slate-100 text-slate-500 border-slate-200',
};

const ACTION_STYLE: Record<ActionType, string> = {
    '紧急补货': 'text-red-600 font-bold',
    '适量补货': 'text-orange-600 font-semibold',
    '折扣促销': 'text-amber-600 font-semibold',
    '组合促销': 'text-amber-500 font-semibold',
    '清仓处置': 'text-purple-600 font-bold',
    '调拨处理': 'text-purple-500 font-semibold',
    '补深追加': 'text-emerald-600 font-semibold',
    '持续观察': 'text-slate-500',
};

// 自动推导动作类型
function inferAction(sku: SkuWosItem): { action: ActionType; params: string; impact: string } {
    const { wos, sellThrough, msrp } = sku;

    if (wos < 2 && sellThrough < 0.92) {
        return { action: '紧急补货', params: '补货量 = 4周安全库存 × 2', impact: '避免断货，维持销售动力' };
    }
    if (wos < 4 && sellThrough < 0.92) {
        return { action: '适量补货', params: '补货量 = 2-3周安全库存', impact: '稳定在售，防止短缺' };
    }
    if (wos > 16 && sellThrough < 0.45) {
        return { action: '清仓处置', params: `折扣 7折或以下，或调拨奥莱`, impact: '加速去化，回笼现金' };
    }
    if (wos > 12 && sellThrough < 0.60) {
        return { action: '调拨处理', params: '调拨至 B2B / 奥莱渠道', impact: '降低库龄，减少库存损耗' };
    }
    if (wos > 10 && msrp >= 600) {
        return { action: '折扣促销', params: `限时折扣 8.5-9折`, impact: '提升高价位转化，降低积压风险' };
    }
    if (wos > 8 && sellThrough < 0.65) {
        return { action: '折扣促销', params: '折扣 8-9折，配合主推推荐位', impact: '预计提升售罄 +3-5pp / 月' };
    }
    if (sellThrough > 0.88 && wos < 8) {
        return { action: '补深追加', params: '追加下期采购 Top 款深度', impact: '锁定强势款，延长贡献期' };
    }
    if (wos >= 4 && wos <= 8 && sellThrough < 0.65) {
        return { action: '组合促销', params: '搭赠或满额折扣，主推带动', impact: '提升连带率，加速售罄' };
    }
    return { action: '持续观察', params: '每周复盘，关注趋势变化', impact: '维持当前节奏' };
}

// 风险优先级排序权重
function riskScore(sku: SkuWosItem): number {
    if (sku.wos < 2) return 100;
    if (sku.wos < 4) return 80;
    if (sku.wos > 16 && sku.sellThrough < 0.45) return 90;
    if (sku.wos > 12) return 70 + (sku.wos - 12) * 0.5;
    if (sku.sellThrough < 0.50) return 60;
    return 10;
}

interface SkuRiskListProps {
    skuWosData?: SkuWosItem[];
    filterSummary?: string;
}

export default function SkuRiskList({ skuWosData, filterSummary = '全部数据' }: SkuRiskListProps) {
    const [actionOverrides, setActionOverrides] = useState<Record<string, ActionType>>({});
    const [statusMap, setStatusMap] = useState<Record<string, StatusType>>({});
    const [filter, setFilter] = useState<'all' | 'stockout' | 'overstock' | 'lowST'>('all');
    const [exported, setExported] = useState(false);

    // 构建行动列表（合并推导结果）
    const rows = useMemo(() => {
        if (!skuWosData || skuWosData.length === 0) return [];
        return [...skuWosData]
            .sort((a, b) => riskScore(b) - riskScore(a))
            .slice(0, 50) // 最多展示 50 行
            .map(sku => ({
                ...sku,
                ...inferAction(sku),
                action: actionOverrides[sku.skuId] ?? inferAction(sku).action,
                status: statusMap[sku.skuId] ?? '待处理' as StatusType,
            }));
    }, [skuWosData, actionOverrides, statusMap]);

    const filtered = useMemo(() => {
        if (filter === 'stockout') return rows.filter(r => r.wos < 4);
        if (filter === 'overstock') return rows.filter(r => r.wos > 12);
        if (filter === 'lowST') return rows.filter(r => r.sellThrough < 0.55);
        return rows;
    }, [rows, filter]);

    if (!skuWosData || skuWosData.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-slate-400">
                <div className="text-center"><div className="text-4xl mb-2">📋</div><div>无SKU数据</div></div>
            </div>
        );
    }

    // CSV 导出（带筛选条件 header）
    const handleExportCsv = () => {
        const now = new Date().toLocaleString('zh-CN');
        const header = [
            `# SKU 行动列表导出`,
            `# 导出时间：${now}`,
            `# 筛选条件：${filterSummary}`,
            `# 字段说明：SKU编号 | SKU名称 | 品类 | 生命周期 | 吊牌价 | WOS(周) | 售罄率 | 在库(双) | 动作类型 | 动作参数 | 预期影响 | 状态`,
            ``,
        ].join('\n');

        const csvRows = filtered.map(r =>
            [
                r.skuId,
                r.name,
                r.category,
                r.lifecycle,
                r.msrp,
                r.wos,
                `${(r.sellThrough * 100).toFixed(1)}%`,
                r.onHandUnits,
                r.action,
                r.params,
                r.impact,
                r.status,
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const csv = header + 'SKU编号,SKU名称,品类,生命周期,吊牌价,WOS(周),售罄率,在库数(双),动作类型,动作参数,预期影响,状态\n' + csvRows;
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SKU行动列表_${filterSummary}_${now.replace(/[/:\s]/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setExported(true);
        setTimeout(() => setExported(false), 2000);
    };

    const pendingCount = rows.filter(r => (statusMap[r.skuId] ?? '待处理') === '待处理').length;
    const doneCount = rows.filter(r => statusMap[r.skuId] === '已完成').length;

    return (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-slate-50 to-white px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">SKU 行动列表</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        共 {rows.length} 款 · 待处理 <strong className="text-red-600">{pendingCount}</strong> 款 · 已完成 <strong className="text-emerald-600">{doneCount}</strong> 款
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* 快速筛选 */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                        {([['all', '全部'], ['stockout', '断货'], ['overstock', '积压'], ['lowST', '低动销']] as const).map(([k, label]) => (
                            <button key={k} onClick={() => setFilter(k)}
                                className={`px-3 py-1.5 font-medium transition-colors ${filter === k ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {/* CSV 导出 */}
                    <button onClick={handleExportCsv}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${exported ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}>
                        {exported ? '✅ 已导出' : '⬇ 导出 CSV'}
                    </button>
                </div>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                            <th className="text-left px-4 py-3 font-semibold min-w-[160px]">SKU</th>
                            <th className="text-center px-3 py-3 font-semibold">WOS</th>
                            <th className="text-center px-3 py-3 font-semibold">售罄率</th>
                            <th className="text-center px-3 py-3 font-semibold">库存</th>
                            <th className="text-left px-3 py-3 font-semibold min-w-[100px]">动作类型</th>
                            <th className="text-left px-3 py-3 font-semibold min-w-[180px]">动作参数</th>
                            <th className="text-left px-3 py-3 font-semibold min-w-[160px]">预期影响</th>
                            <th className="text-center px-3 py-3 font-semibold min-w-[90px]">状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-xs">当前筛选条件无数据</td></tr>
                        )}
                        {filtered.map((row, i) => {
                            const currentAction = actionOverrides[row.skuId] ?? row.action;
                            const currentStatus = statusMap[row.skuId] ?? '待处理';
                            const derived = inferAction(row);
                            return (
                                <tr key={row.skuId} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                    {/* SKU 信息 */}
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-800 truncate max-w-[160px]" title={row.name}>{row.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{row.category} · {row.lifecycle} · ¥{row.msrp}</div>
                                    </td>
                                    {/* WOS */}
                                    <td className="px-3 py-3 text-center">
                                        <span className={`font-bold text-sm ${row.wos < 4 ? 'text-red-600' : row.wos > 12 ? 'text-purple-600' : 'text-slate-800'}`}>
                                            {row.wos}W
                                        </span>
                                    </td>
                                    {/* 售罄率 */}
                                    <td className="px-3 py-3 text-center">
                                        <span className={`text-sm font-semibold ${row.sellThrough < 0.55 ? 'text-red-500' : row.sellThrough > 0.85 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                            {(row.sellThrough * 100).toFixed(0)}%
                                        </span>
                                    </td>
                                    {/* 库存 */}
                                    <td className="px-3 py-3 text-center text-xs text-slate-600">
                                        {row.onHandUnits.toLocaleString()} 双
                                    </td>
                                    {/* 动作类型 - 可编辑 */}
                                    <td className="px-3 py-3">
                                        <select
                                            value={currentAction}
                                            onChange={e => setActionOverrides(prev => ({ ...prev, [row.skuId]: e.target.value as ActionType }))}
                                            className={`text-xs font-semibold bg-transparent border-b border-dashed border-slate-300 focus:outline-none cursor-pointer hover:border-blue-400 ${ACTION_STYLE[currentAction]}`}
                                        >
                                            {ACTION_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </td>
                                    {/* 动作参数 */}
                                    <td className="px-3 py-3 text-xs text-slate-600">{derived.params}</td>
                                    {/* 预期影响 */}
                                    <td className="px-3 py-3 text-xs text-slate-500">{derived.impact}</td>
                                    {/* 状态 - 可编辑 */}
                                    <td className="px-3 py-3 text-center">
                                        <select
                                            value={currentStatus}
                                            onChange={e => setStatusMap(prev => ({ ...prev, [row.skuId]: e.target.value as StatusType }))}
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${STATUS_STYLE[currentStatus]}`}
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 底部说明 */}
            <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 text-xs text-slate-400 flex flex-wrap items-center gap-4">
                <span>动作类型和状态均可手动修改</span>
                <span>·</span>
                <span>CSV 导出包含筛选条件注释</span>
                <span className="ml-auto">仅显示前 50 款高风险 SKU · 按风险优先级排序</span>
            </div>
        </div>
    );
}
