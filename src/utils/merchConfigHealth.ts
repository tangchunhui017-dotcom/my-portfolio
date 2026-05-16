/**
 * src/utils/merchConfigHealth.ts
 * 商品企划中台配置健康检查 — 纯逻辑层。
 *
 * UI 层（ConfigHealthCheck.tsx, MerchBusinessLoopPanel.tsx）调用 runMerchConfigHealthCheck()
 * 拿到结构化 issue 数组后再渲染。
 *
 * 检查覆盖：
 *   1. 阈值逻辑冲突（warning < default 但比较方向是 ≥）
 *   2. 未使用的指标（usedBy 为空）
 *   3. 空维度（values.length === 0）
 *   4. 公式引用未识别变量
 *   5. 闭环 requiredMetrics 是否在指标库里都能找到
 *   6. 阈值 appliedTo / 维度 scope / 指标 usedBy 是否引用了非法 TabKey
 *   7. tab override 引用了不存在的 section.id（暂跳过：override 现在是 deep-merge，未匹配 section 会被新增而非报错）
 */
import type {
    MergedMerchConfig,
    TabKey,
} from '@/types/merchConfig';
import { ALL_TABS } from '@/types/merchConfig';
import { MERCH_BUSINESS_MODULES } from '@/config/merchBusinessLoop';

export type HealthSeverity = 'error' | 'warning' | 'info';
export type HealthArea = 'metric' | 'dimension' | 'threshold' | 'tab' | 'loop' | 'encoding';

export interface MerchConfigHealthIssue {
    id: string;
    severity: HealthSeverity;
    area: HealthArea;
    targetId: string;
    title: string;
    description: string;
    suggestion: string;
}

const VALID_TAB_KEYS = new Set<TabKey>(ALL_TABS);
// 公式中允许的 SQL/数学/描述性关键字（小写匹配）。
// 注：长度 ≤ 3 的词（sum/avg/min/max/abs/if/and/or/not/age/tax 等）已经被长度过滤跳过，
// 这里只需要列出长度 > 3 的常用关键字。
const FORMULA_RESERVED = new Set([
    'count', 'else', 'where', 'distinct', 'true', 'false',
    // 描述性 prose（部分公式写成自然语言伪代码时出现）
    'outbound', 'planned', 'threshold',
]);

export function runMerchConfigHealthCheck(config: MergedMerchConfig): MerchConfigHealthIssue[] {
    const result: MerchConfigHealthIssue[] = [];
    const { metrics, dimensions, thresholds, tabs } = config;

    // 1. 阈值逻辑冲突
    for (const t of thresholds.values()) {
        if (
            t.warningValue !== undefined && t.warningValue !== null &&
            t.comparator === 'gte' &&
            Number(t.warningValue) < Number(t.defaultValue)
        ) {
            result.push({
                id: `threshold-conflict-${t.thresholdId}`,
                severity: 'error',
                area: 'threshold',
                targetId: t.thresholdId,
                title: `阈值逻辑冲突：${t.label}`,
                description: `正常线 ${t.defaultValue} 大于警示线 ${t.warningValue}（比较方向 ≥），阈值层级无效`,
                suggestion: '检查正常线/警示线/危险线的大小顺序是否符合比较方向',
            });
        }
    }

    // 2. 未使用的指标（reference 类型是数据层原子变量，usedBy 为空属正常）
    const unusedMetrics = Array.from(metrics.values()).filter(
        (m) => m.usedBy.length === 0 && m.defaultMetricType !== 'reference'
    );
    if (unusedMetrics.length > 0) {
        result.push({
            id: 'unused-metrics',
            severity: 'warning',
            area: 'metric',
            targetId: unusedMetrics.map((m) => m.metricId).join(','),
            title: `${unusedMetrics.length} 个指标未被任何业务模块使用`,
            description: `未使用指标：${unusedMetrics.slice(0, 3).map((m) => m.label).join('、')}${unusedMetrics.length > 3 ? ' 等' : ''}`,
            suggestion: '可考虑删除冗余指标，或在 usedBy 中添加对应的业务模块',
        });
    }

    // 3. 空维度
    for (const d of dimensions.values()) {
        if (d.values.length === 0) {
            result.push({
                id: `empty-dimension-${d.dimensionId}`,
                severity: 'warning',
                area: 'dimension',
                targetId: d.dimensionId,
                title: `维度"${d.label}"无任何值`,
                description: '该维度未配置任何可选值，可能导致筛选面板异常',
                suggestion: '在维度定义面板中添加至少一个维度值',
            });
        }
    }

    // 4. 公式引用未识别变量
    const metricIds = new Set(metrics.keys());
    for (const m of metrics.values()) {
        if (!m.formula) continue;
        const refs = m.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
        const unknown = refs.filter(
            (ref) => ref.length > 3 && !metricIds.has(ref) && !FORMULA_RESERVED.has(ref.toLowerCase())
        );
        if (unknown.length > 0) {
            result.push({
                id: `formula-ref-${m.metricId}`,
                severity: 'info',
                area: 'metric',
                targetId: m.metricId,
                title: `指标"${m.label}"公式引用了未识别变量`,
                description: `未识别引用：${Array.from(new Set(unknown)).slice(0, 5).join(', ')}`,
                suggestion: '检查公式中的变量名是否拼写正确，或补充对应指标定义',
            });
        }
    }

    // 5. 闭环 requiredMetrics 缺失
    for (const tabKey of ALL_TABS) {
        const loop = MERCH_BUSINESS_MODULES[tabKey];
        if (!loop) continue;
        const missing = loop.requiredMetrics.filter((id) => !metricIds.has(id));
        if (missing.length > 0) {
            result.push({
                id: `loop-missing-${tabKey}`,
                severity: 'error',
                area: 'loop',
                targetId: tabKey,
                title: `「${loop.label}」模块缺失 ${missing.length} 个必备指标`,
                description: `缺失：${missing.slice(0, 5).join(', ')}`,
                suggestion: '在「指标定义」中补齐这些指标，或调整 merchBusinessLoop.ts 的 requiredMetrics',
            });
        }
    }

    // 6. 非法 TabKey 引用
    for (const m of metrics.values()) {
        const illegal = m.usedBy.filter((t) => !VALID_TAB_KEYS.has(t));
        if (illegal.length > 0) {
            result.push({
                id: `illegal-tabkey-metric-${m.metricId}`,
                severity: 'error',
                area: 'metric',
                targetId: m.metricId,
                title: `指标"${m.label}"的 usedBy 引用了非法 TabKey`,
                description: `非法值：${illegal.join(', ')}（合法 TabKey 见 src/types/merchConfig.ts）`,
                suggestion: '确认未误用 dashboard key（如 category/profit-loss/competitor/inventory），统一使用 TabKey 体系',
            });
        }
    }
    for (const t of thresholds.values()) {
        const illegal = t.appliedTo.filter((tab) => !VALID_TAB_KEYS.has(tab));
        if (illegal.length > 0) {
            result.push({
                id: `illegal-tabkey-threshold-${t.thresholdId}`,
                severity: 'error',
                area: 'threshold',
                targetId: t.thresholdId,
                title: `阈值"${t.label}"的 appliedTo 引用了非法 TabKey`,
                description: `非法值：${illegal.join(', ')}`,
                suggestion: '统一使用 TabKey 体系（见 src/types/merchConfig.ts）',
            });
        }
    }
    for (const d of dimensions.values()) {
        if (!d.scope) continue;
        const illegal = d.scope.filter((tab) => !VALID_TAB_KEYS.has(tab));
        if (illegal.length > 0) {
            result.push({
                id: `illegal-tabkey-dimension-${d.dimensionId}`,
                severity: 'error',
                area: 'dimension',
                targetId: d.dimensionId,
                title: `维度"${d.label}"的 scope 引用了非法 TabKey`,
                description: `非法值：${illegal.join(', ')}`,
                suggestion: '统一使用 TabKey 体系（见 src/types/merchConfig.ts）',
            });
        }
    }

    // 7. Tab 配置缺失
    for (const tabKey of ALL_TABS) {
        if (!tabs.has(tabKey)) {
            result.push({
                id: `missing-tab-${tabKey}`,
                severity: 'error',
                area: 'tab',
                targetId: tabKey,
                title: `Tab"${tabKey}"在配置中缺失`,
                description: '所有 12 个业务 Tab 都应至少有一份默认配置（行业模板提供）',
                suggestion: '在行业模板的 tabs.json 中添加该 Tab 的默认配置',
            });
        }
    }

    return result;
}

export interface HealthSummary {
    error: number;
    warning: number;
    info: number;
    total: number;
}

export function summarizeHealth(issues: MerchConfigHealthIssue[]): HealthSummary {
    return {
        error: issues.filter((i) => i.severity === 'error').length,
        warning: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
        total: issues.length,
    };
}
