'use client';
/**
 * src/components/charts/ChartCard.tsx
 * 统一图表卡片外壳 —— 标题 / actions / metric strip / 图表 / 结论 / footer 槽位。
 *
 * 不动业务图表内部代码：图表组件作为 children 透传，外壳只负责"装裱"统一。
 *
 * 用法：
 *   <ChartCard
 *      title="品类销售占比"
 *      subtitle="按品类拆解销售贡献"
 *      actions={<button>...</button>}      // 右上自定义控件（toggle / 筛选）
 *      metricStrip={<MetricChips items={...} />}
 *      conclusion={{ finding, decision, impact }}
 *      footer={<状态徽章组 />}
 *      span="full" | "half"
 *   >
 *      <ReactECharts ... />
 *   </ChartCard>
 */
import { forwardRef, type ReactNode } from 'react';
import ChartMenu from '@/components/dashboard/ChartMenu';

export interface ChartCardConclusion {
    finding: string;
    decision: string;
    impact: string;
}

interface ChartCardProps {
    title: string;
    subtitle?: string;
    /** 卡片右上方的自定义控件（toggle / 筛选 / 模式切换等） */
    actions?: ReactNode;
    /** 顶部 KPI 小卡条（推荐使用 MetricChips） */
    metricStrip?: ReactNode;
    /** 是否显示右上角下载/复制菜单（默认 true） */
    showMenu?: boolean;
    /** 透传给下载菜单的纯文本结论 */
    menuConclusion?: string;
    /** 底部三段式结论卡 */
    conclusion?: ChartCardConclusion;
    /** 底部状态徽章条（如"节奏健康 / 库存错配月"） */
    footer?: ReactNode;
    /** 占满一行还是半行 */
    span?: 'full' | 'half';
    /** 卡片整体类名（覆盖默认） */
    className?: string;
    /** body 容器追加类名（在默认 px-5 / pb-4 之后追加） */
    contentClassName?: string;
    /** body 容器**完全替代**类名（设置后不再使用默认 px-5 / pb-4） */
    bodyClassName?: string;
    children: ReactNode;
}

const ChartCard = forwardRef<HTMLDivElement, ChartCardProps>(function ChartCard(
    {
        title,
        subtitle,
        actions,
        metricStrip,
        showMenu = true,
        menuConclusion,
        conclusion,
        footer,
        span = 'half',
        className = '',
        contentClassName = '',
        bodyClassName,
        children,
    },
    ref
) {
    const resolvedConclusionText =
        menuConclusion ??
        (conclusion ? `${conclusion.finding} ${conclusion.decision} ${conclusion.impact}` : '');

    return (
        <div
            ref={ref}
            className={`group bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-shadow duration-200 overflow-hidden ${span === 'full' ? 'col-span-2' : ''} ${className}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold tracking-tight text-slate-800 truncate">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed line-clamp-1">
                            {subtitle}
                        </p>
                    )}
                </div>
                {(actions || showMenu) && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {actions}
                        {showMenu && (
                            <ChartMenu chartTitle={title} chartRef={{ current: null }} conclusion={resolvedConclusionText} />
                        )}
                    </div>
                )}
            </div>

            {/* Metric strip */}
            {metricStrip && (
                <div className="px-5 pb-3 pt-1 border-t border-slate-50">
                    {metricStrip}
                </div>
            )}

            {/* Chart body */}
            <div className={bodyClassName ?? `px-5 ${metricStrip ? 'pt-2' : 'pt-0'} pb-4 ${contentClassName}`}>
                {children}
            </div>

            {/* Conclusion */}
            {conclusion && (
                <div className="mx-5 mb-4 rounded-xl bg-slate-50/60 border border-slate-100 px-4 py-3 text-xs leading-relaxed space-y-2">
                    <ConclusionLine icon="🔍" label="发现" text={conclusion.finding} />
                    <ConclusionLine icon="⚡" label="决策" text={conclusion.decision} />
                    <ConclusionLine icon="📈" label="结果" text={conclusion.impact} />
                </div>
            )}

            {/* Footer badges */}
            {footer && (
                <div className="border-t border-slate-50 px-5 py-3 bg-slate-50/40">
                    {footer}
                </div>
            )}
        </div>
    );
});

function ConclusionLine({ icon, label, text }: { icon: string; label: string; text: string }) {
    return (
        <div className="flex gap-2 items-start">
            <span className="text-sm leading-5 flex-shrink-0">{icon}</span>
            <div className="text-slate-600">
                <span className="font-semibold text-slate-700 mr-1">{label}</span>
                {text}
            </div>
        </div>
    );
}

export default ChartCard;
