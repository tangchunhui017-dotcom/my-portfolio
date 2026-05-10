/**
 * src/utils/otbCsvImport.ts
 * OTB CSV 数据导入工具 — 原生字符串解析，不依赖第三方库
 */

export type ImportType = 'execution' | 'monthly_sales' | 'wave_plan' | 'product_master';

export interface ColumnDef {
    key: string;
    label: string;
    required: boolean;
    type: 'number' | 'string' | 'date';
    validate?: (v: unknown) => string | null;
}

export interface ImportError {
    rowIndex: number;
    column: string;
    message: string;
}

export interface ParseResult<T> {
    rows: T[];
    errors: ImportError[];
    totalRows: number;
}

// ─── CSV 解析器：支持 BOM、带引号字段、CRLF/LF ───────────────────────────────

export function parseCsvText(text: string): string[][] {
    const content = text
        .replace(/^\uFEFF/, '')           // 去除 BOM
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    return content
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            const cells: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (ch === ',' && !inQuotes) {
                    cells.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            cells.push(current.trim());
            return cells;
        });
}

// ─── 泛型解析器 ───────────────────────────────────────────────────────────────

export function parseOtbCsv<T>(
    csvText: string,
    columns: ColumnDef[],
): ParseResult<T> {
    const grid = parseCsvText(csvText);

    if (grid.length < 2) {
        return {
            rows: [],
            errors: [{ rowIndex: 0, column: '', message: 'CSV 文件为空或只有表头行' }],
            totalRows: 0,
        };
    }

    const headers = grid[0].map(h => h.toLowerCase().trim());
    const errors: ImportError[] = [];
    const rows: T[] = [];

    grid.slice(1).forEach((cells, rowIdx) => {
        const obj: Record<string, unknown> = {};
        let rowHasError = false;

        for (const col of columns) {
            const colIdx = headers.indexOf(col.key.toLowerCase());
            const raw = colIdx >= 0 ? cells[colIdx]?.trim() : undefined;

            if (col.required && (raw === undefined || raw === '')) {
                errors.push({
                    rowIndex: rowIdx + 2,
                    column: col.key,
                    message: `必填项「${col.label}」为空`,
                });
                rowHasError = true;
                continue;
            }

            if (raw === undefined || raw === '') {
                obj[col.key] = col.type === 'number' ? 0 : '';
                continue;
            }

            if (col.type === 'number') {
                const num = parseFloat(raw.replace(/,/g, ''));
                if (isNaN(num)) {
                    errors.push({
                        rowIndex: rowIdx + 2,
                        column: col.key,
                        message: `「${col.label}」不是有效数值：${raw}`,
                    });
                    rowHasError = true;
                } else {
                    const validationError = col.validate?.(num);
                    if (validationError) {
                        errors.push({ rowIndex: rowIdx + 2, column: col.key, message: validationError });
                        rowHasError = true;
                    } else {
                        obj[col.key] = num;
                    }
                }
            } else {
                const validationError = col.validate?.(raw);
                if (validationError) {
                    errors.push({ rowIndex: rowIdx + 2, column: col.key, message: validationError });
                    rowHasError = true;
                } else {
                    obj[col.key] = raw;
                }
            }
        }

        if (!rowHasError) {
            rows.push(obj as T);
        }
    });

    return { rows, errors, totalRows: grid.length - 1 };
}

// ─── 模板下载 ─────────────────────────────────────────────────────────────────

const TEMPLATES: Record<ImportType, { filename: string; headers: string[]; example?: string[] }> = {
    execution: {
        filename: 'otb-执行跟踪导入模板.csv',
        headers: [
            'season', 'wave', 'category', 'categoryLabel', 'launchDate',
            'plannedStyleCount', 'developedStyleCount', 'pricedStyleCount',
            'orderedStyleCount', 'orderedAmount', 'arrivedAmount',
            'plannedPurchaseAmount', 'status',
        ],
        example: [
            'SS', '3A', 'running', '跑步鞋', '2026-03-15',
            '12', '10', '8', '8', '1200000', '800000', '1500000', '已下单',
        ],
    },
    monthly_sales: {
        filename: 'otb-月度销售导入模板.csv',
        headers: ['month', 'actualSales', 'salesForecast', 'originalPurchaseBudget'],
        example: ['1', '3500000', '3800000', '4000000'],
    },
    wave_plan: {
        filename: 'otb-波段计划导入模板.csv',
        headers: [
            'id', 'season', 'seasonLabel', 'wave', 'launchDate', 'launchMonth',
            'promotion', 'salesRatio', 'newProductRatio', 'repeatOrderRatio',
            'carryoverRatio', 'sellThroughTarget', 'plannedStyleCount', 'averageDepth', 'mainCategory',
        ],
        example: [
            'SS-3A', 'SS', '春夏', '3A', '2026-03-15', '3',
            '开季上新', '0.15', '0.85', '0.10', '0.05', '0.82', '30', '720', 'running',
        ],
    },
    product_master: {
        filename: 'otb-商品主数据导入模板.csv',
        headers: [
            'styleId', 'styleName', 'category', 'categoryLabel',
            'priceBandId', 'season', 'wave', 'retailPrice', 'costPrice',
            'sizeGroupId', 'plannedColorCount', 'productRoleId',
        ],
        example: [
            'RUN-001', '极速跑鞋', 'running', '跑步鞋',
            'volume', 'SS', '3A', '699', '210',
            'men', '2', 'main',
        ],
    },
};

export function downloadTemplateCsv(importType: ImportType): void {
    const t = TEMPLATES[importType];
    const headerLine = t.headers.join(',');
    const exampleLine = t.example ? t.example.join(',') : t.headers.map(() => '').join(',');
    const csv = `\uFEFF${headerLine}\n${exampleLine}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t.filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── 各类型字段定义 ───────────────────────────────────────────────────────────

export const COLUMN_DEFS: Record<ImportType, ColumnDef[]> = {
    execution: [
        { key: 'season',               label: '季节',     required: true,  type: 'string' },
        { key: 'wave',                 label: '波段',     required: true,  type: 'string' },
        { key: 'category',             label: '品类ID',   required: true,  type: 'string' },
        { key: 'categoryLabel',        label: '品类名称', required: false, type: 'string' },
        { key: 'launchDate',           label: '上市日期', required: true,  type: 'string' },
        { key: 'plannedStyleCount',    label: '计划款数', required: true,  type: 'number',
            validate: v => (v as number) < 0 ? '款数不能为负数' : null },
        { key: 'developedStyleCount',  label: '已开发款', required: false, type: 'number' },
        { key: 'pricedStyleCount',     label: '已定价款', required: false, type: 'number' },
        { key: 'orderedStyleCount',    label: '已下单款', required: false, type: 'number' },
        { key: 'orderedAmount',        label: '实际下单额', required: false, type: 'number' },
        { key: 'arrivedAmount',        label: '实际到货额', required: false, type: 'number' },
        { key: 'plannedPurchaseAmount', label: '计划采购额', required: true, type: 'number',
            validate: v => (v as number) < 0 ? '采购额不能为负数' : null },
        { key: 'status',               label: '执行状态', required: false, type: 'string' },
    ],
    monthly_sales: [
        { key: 'month', label: '月份(1-12)', required: true, type: 'number',
            validate: v => ((v as number) < 1 || (v as number) > 12) ? '月份须在 1~12 之间' : null },
        { key: 'actualSales',            label: '实际销售额', required: true,  type: 'number' },
        { key: 'salesForecast',          label: '销售预测',   required: false, type: 'number' },
        { key: 'originalPurchaseBudget', label: '原预算',     required: false, type: 'number' },
    ],
    wave_plan: [
        { key: 'id',               label: '波段ID',      required: true,  type: 'string' },
        { key: 'season',           label: '季节(SS/AW)', required: true,  type: 'string',
            validate: v => (!['SS', 'AW'].includes((v as string).toUpperCase())) ? '季节须为 SS 或 AW' : null },
        { key: 'seasonLabel',      label: '季节标签',    required: false, type: 'string' },
        { key: 'wave',             label: '波段名',      required: true,  type: 'string' },
        { key: 'launchDate',       label: '上市日期',    required: true,  type: 'string' },
        { key: 'launchMonth',      label: '上市月份',    required: true,  type: 'number',
            validate: v => ((v as number) < 1 || (v as number) > 12) ? '月份须在 1~12 之间' : null },
        { key: 'promotion',        label: '促销节点',    required: false, type: 'string' },
        { key: 'salesRatio',       label: '销售占比(0-1)', required: true, type: 'number',
            validate: v => ((v as number) < 0 || (v as number) > 1) ? '占比须在 0~1 之间' : null },
        { key: 'newProductRatio',  label: '新品占比(0-1)', required: false, type: 'number' },
        { key: 'repeatOrderRatio', label: '翻单占比(0-1)', required: false, type: 'number' },
        { key: 'carryoverRatio',   label: '旧品占比(0-1)', required: false, type: 'number' },
        { key: 'sellThroughTarget', label: '售罄目标(0-1)', required: false, type: 'number' },
        { key: 'plannedStyleCount', label: '计划款数', required: false, type: 'number' },
        { key: 'averageDepth',      label: '均深(双)',  required: false, type: 'number' },
        { key: 'mainCategory',      label: '主推品类', required: false, type: 'string' },
    ],
    product_master: [
        { key: 'styleId',          label: '款号',       required: true,  type: 'string' },
        { key: 'styleName',        label: '款名',       required: false, type: 'string' },
        { key: 'category',         label: '品类ID',     required: true,  type: 'string' },
        { key: 'categoryLabel',    label: '品类名',     required: false, type: 'string' },
        { key: 'priceBandId',      label: '价格带ID',   required: false, type: 'string' },
        { key: 'season',           label: '季节',       required: false, type: 'string' },
        { key: 'wave',             label: '波段',       required: false, type: 'string' },
        { key: 'retailPrice',      label: '零售价',     required: true,  type: 'number',
            validate: v => (v as number) <= 0 ? '零售价须大于 0' : null },
        { key: 'costPrice',        label: '成本价',     required: true,  type: 'number',
            validate: v => (v as number) <= 0 ? '成本价须大于 0' : null },
        { key: 'sizeGroupId',      label: '尺码组ID',   required: false, type: 'string' },
        { key: 'plannedColorCount', label: '计划色数',  required: false, type: 'number' },
        { key: 'productRoleId',    label: '货品角色ID', required: false, type: 'string' },
    ],
};
