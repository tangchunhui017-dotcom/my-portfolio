'use client';
/**
 * ForecastActionCenter.tsx
 * 销售预测 — 行动闭环中心（6-8 条高优先级建议）
 */
import { useState } from 'react';

type RiskTag = '缺货' | '积压' | '预测偏高' | '预测偏低' | '毛利风险' | '现金风险';
type ActionType = '增加OTB' | '冻结OTB' | '追加采购' | '减少采购' | '门店调拨' | '电商补货' | '调整折扣' | '调整波段' | '优化价格带' | '复盘设计方向' | '调整新店首单铺货';
type ActionStatus = '建议中' | '待审批' | '执行中' | '已完成' | '已关闭';

interface ForecastAction {
  id: string;
  target: string;
  riskTag: RiskTag;
  reason: string;
  action: ActionType;
  salesImpact: string;
  marginImpact: string;
  inventoryImpact: string;
  relatedModules: string[];
  status: ActionStatus;
  priority: 'high' | 'medium' | 'low';
}

const MOCK_ACTIONS: ForecastAction[] = [
  {
    id: 'A1', target: '凉鞋 / W3波段 / 电商', riskTag: '缺货',
    reason: '凉鞋预测销量超出当前可售库存，未来8周面临断货风险',
    action: '电商补货', salesImpact: '+¥380万', marginImpact: '+¥171万', inventoryImpact: '-1,200双库存消耗',
    relatedModules: ['OTB预算', '库存健康'], status: '建议中', priority: 'high',
  },
  {
    id: 'A2', target: '靴子 / W4波段 / 实体店', riskTag: '积压',
    reason: '靴子实体店预测较去年同期下滑22%，当前OTB仍按增长计划执行',
    action: '冻结OTB', salesImpact: '-¥120万风险规避', marginImpact: '+¥54万', inventoryImpact: '+800双减少进货',
    relatedModules: ['OTB预算', '波段企划'], status: '待审批', priority: 'high',
  },
  {
    id: 'A3', target: '运动鞋 / 全渠道 / Q2', riskTag: '预测偏低',
    reason: '运动鞋MAPE连续2季度负偏差（预测偏低），建议上调预测基数+8%',
    action: '追加采购', salesImpact: '+¥280万', marginImpact: '+¥126万', inventoryImpact: '-900双风险',
    relatedModules: ['OTB预算', '品类运营'], status: '建议中', priority: 'high',
  },
  {
    id: 'A4', target: '时装鞋 / 500-699价格带 / 电商', riskTag: '毛利风险',
    reason: '当前预测折扣率41%，远超目标35%，净毛利率将跌破28%红线',
    action: '调整折扣', salesImpact: '-¥60万（折扣收缩）', marginImpact: '+¥90万', inventoryImpact: '无显著变化',
    relatedModules: ['损益', '品类运营'], status: '建议中', priority: 'medium',
  },
  {
    id: 'A5', target: '新店 / 华东区 / 5月开业', riskTag: '缺货',
    reason: '新店首铺尺码完整率仅84%，预计开业爆发期错失¥50万销售机会',
    action: '调整新店首单铺货', salesImpact: '+¥50万', marginImpact: '+¥22万', inventoryImpact: '+350双深度补充',
    relatedModules: ['OTB预算', '区域&门店'], status: '执行中', priority: 'high',
  },
  {
    id: 'A6', target: '休闲鞋 / W2波段 / 实体店', riskTag: '现金风险',
    reason: '休闲鞋W2波段库存超过20周WOS，占用现金¥680万，建议提前折扣清库',
    action: '调整波段', salesImpact: '-¥50万（折扣损失）', marginImpact: '-¥25万', inventoryImpact: '+1,500双去化',
    relatedModules: ['现金流', '波段企划'], status: '建议中', priority: 'medium',
  },
  {
    id: 'A7', target: '中高价格带 / 700+ / 全渠道', riskTag: '预测偏高',
    reason: '700+价格带预测增长18%，但历史承接率仅9%，存在预测过度乐观风险',
    action: '减少采购', salesImpact: '-¥180万目标下调', marginImpact: '-¥81万（减少毛利暴露）', inventoryImpact: '+600双减少积压',
    relatedModules: ['OTB预算', '品类运营'], status: '建议中', priority: 'medium',
  },
];

const RISK_TAG_STYLE: Record<RiskTag, string> = {
  '缺货': 'bg-rose-100 text-rose-700',
  '积压': 'bg-amber-100 text-amber-700',
  '预测偏高': 'bg-purple-100 text-purple-700',
  '预测偏低': 'bg-sky-100 text-sky-700',
  '毛利风险': 'bg-orange-100 text-orange-700',
  '现金风险': 'bg-red-100 text-red-700',
};

const STATUS_STYLE: Record<ActionStatus, string> = {
  '建议中': 'bg-slate-100 text-slate-600',
  '待审批': 'bg-amber-100 text-amber-700',
  '执行中': 'bg-sky-100 text-sky-700',
  '已完成': 'bg-emerald-100 text-emerald-700',
  '已关闭': 'bg-slate-100 text-slate-400',
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-slate-300',
};

interface Props {
  channel?: string;
  onJumpToModule?: (module: string) => void;
}

export default function ForecastActionCenter({ channel, onJumpToModule }: Props) {
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [collapsed, setCollapsed] = useState(true);

  const actions = MOCK_ACTIONS.slice(0, collapsed ? 4 : MOCK_ACTIONS.length);

  const setStatus = (id: string, status: ActionStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  return (
    <div className="space-y-3">
      {actions.map(action => {
        const currentStatus = statuses[action.id] ?? action.status;
        return (
          <div key={action.id}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-3">
            {/* 优先级指示 */}
            <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
              <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[action.priority]}`} />
              <div className="text-[9px] text-slate-300 -rotate-90 mt-4 whitespace-nowrap">
                {action.priority === 'high' ? 'P1' : action.priority === 'medium' ? 'P2' : 'P3'}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* 标题行 */}
              <div className="flex items-start gap-2 flex-wrap mb-2">
                <span className="font-semibold text-sm text-slate-800">{action.target}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${RISK_TAG_STYLE[action.riskTag]}`}>
                  {action.riskTag}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {action.action}
                </span>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${STATUS_STYLE[currentStatus]}`}>
                  {currentStatus}
                </span>
              </div>

              {/* 原因 */}
              <p className="text-xs text-slate-500 mb-2">{action.reason}</p>

              {/* 影响三列 */}
              <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                  <div className="text-slate-400 mb-0.5">销售影响</div>
                  <div className="font-semibold text-slate-700">{action.salesImpact}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                  <div className="text-slate-400 mb-0.5">毛利影响</div>
                  <div className="font-semibold text-slate-700">{action.marginImpact}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                  <div className="text-slate-400 mb-0.5">库存影响</div>
                  <div className="font-semibold text-slate-700">{action.inventoryImpact}</div>
                </div>
              </div>

              {/* 操作行 */}
              <div className="flex items-center gap-2 flex-wrap">
                {action.relatedModules.map(mod => (
                  <button key={mod}
                    onClick={() => onJumpToModule?.(mod)}
                    className="text-[10px] px-2.5 py-1 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors">
                    → {mod}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                  {(['待审批', '执行中', '已完成'] as ActionStatus[]).map(s => (
                    <button key={s}
                      onClick={() => setStatus(action.id, s)}
                      className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                        currentStatus === s ? STATUS_STYLE[s] + ' border-transparent' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
        {collapsed ? `查看全部 ${MOCK_ACTIONS.length} 条建议 ▼` : '折叠 ▲'}
      </button>
    </div>
  );
}
