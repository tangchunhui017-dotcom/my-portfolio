/**
 * src/utils/formulaEngine.ts
 * 基于 expr-eval 的公式引擎 — 支持缓存、安全降级、变量提取
 */
import { Parser } from 'expr-eval';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpressionType = any;

const cache = new Map<string, ExpressionType>();

const parser = new Parser({
    operators: {
        add: true,
        subtract: true,
        multiply: true,
        divide: true,
        power: true,
        factorial: false,
        comparison: true,
        conditional: true,
        logical: true,
    },
});

/**
 * 计算公式值，出错静默返回 null（不崩溃）
 */
export function evaluateFormula(
    formula: string,
    variables: Record<string, number | undefined>
): number | null {
    if (!formula?.trim()) return null;
    try {
        let expr = cache.get(formula);
        if (!expr) {
            expr = parser.parse(formula);
            cache.set(formula, expr);
        }
        const safeVars = Object.fromEntries(
            Object.entries(variables).map(([k, v]) => [k, typeof v === 'number' ? v : 0])
        );
        const result = expr.evaluate(safeVars) as unknown;
        return typeof result === 'number' && isFinite(result) ? result : null;
    } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[FormulaEngine] Error evaluating: "${formula}"`, e);
        }
        return null;
    }
}

/**
 * 提取公式中所有变量名
 */
export function extractVariables(formula: string): string[] {
    if (!formula?.trim()) return [];
    try {
        return (parser.parse(formula).variables() as string[]) ?? [];
    } catch {
        return [];
    }
}

/**
 * 校验公式语法
 */
export function validateFormula(formula: string): {
    ok: boolean;
    error?: string;
    variables?: string[];
} {
    if (!formula?.trim()) return { ok: false, error: '公式不能为空' };
    try {
        const expr = parser.parse(formula);
        return { ok: true, variables: expr.variables() as string[] };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}
