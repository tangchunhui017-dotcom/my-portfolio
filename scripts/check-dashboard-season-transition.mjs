import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const factSalesPath = path.join(repoRoot, 'data', 'dashboard', 'fact_sales.json');
const ruleModulePath = pathToFileURL(path.join(repoRoot, 'src', 'config', 'dashboardSeasonTransitionRules.ts')).href;

const factSales = JSON.parse(fs.readFileSync(factSalesPath, 'utf8'));
const { formatTransitionSeasonKey, resolveTransitionWindow } = await import(ruleModulePath);

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function getSeasonCode(record) {
    const season = String(record.sales_season || record.season || '').toUpperCase();
    return season === 'Q1' || season === 'Q2' || season === 'Q3' || season === 'Q4' ? season : null;
}

function getSeasonYear(record) {
    const year = Number(record.sales_season_year || record.season_year || 0);
    return Number.isFinite(year) && year > 0 ? year : null;
}

function classifyRecord(record, anchorYear, month) {
    const season = getSeasonCode(record);
    const seasonYear = getSeasonYear(record);
    const window = resolveTransitionWindow(anchorYear, month);

    if (season === window.prev.season && seasonYear === window.prev.seasonYear) return 'prev';
    if (season === window.current.season && seasonYear === window.current.seasonYear) return 'current';
    if (season === window.next.season && seasonYear === window.next.seasonYear) return 'next';
    return 'non_main';
}

function sumSales(records) {
    return records.reduce((sum, record) => sum + toNumber(record.net_sales_amt), 0);
}

const targetYear = 2024;
const yearRows = factSales.filter((record) => Number(record.sale_year || record.season_year) === targetYear);
assert(yearRows.length > 0, `未找到 ${targetYear} 年销售记录`);

const monthlyChecks = [];
for (let month = 1; month <= 12; month += 1) {
    const monthRows = yearRows.filter((record) => Number(record.sale_month) === month);
    if (monthRows.length === 0) continue;

    const buckets = {
        prev: [],
        current: [],
        next: [],
        non_main: [],
    };
    monthRows.forEach((record) => {
        buckets[classifyRecord(record, targetYear, month)].push(record);
    });

    const total = sumSales(monthRows);
    const reconstructed =
        sumSales(buckets.prev) +
        sumSales(buckets.current) +
        sumSales(buckets.next) +
        sumSales(buckets.non_main);

    assert.equal(
        Math.round(reconstructed),
        Math.round(total),
        `${targetYear}/${month} 承接拆分加总与月 GMV 不一致`,
    );

    monthlyChecks.push({
        month,
        totalWan: Number((total / 10000).toFixed(1)),
        prevWan: Number((sumSales(buckets.prev) / 10000).toFixed(1)),
        currentWan: Number((sumSales(buckets.current) / 10000).toFixed(1)),
        nextWan: Number((sumSales(buckets.next) / 10000).toFixed(1)),
        nonMainWan: Number((sumSales(buckets.non_main) / 10000).toFixed(1)),
    });
}

const janAprWinter23 = yearRows.filter((record) => {
    const month = Number(record.sale_month);
    return month >= 1 && month <= 4 && getSeasonCode(record) === 'Q4' && getSeasonYear(record) === 2023;
});
const janAprWinter23Total = sumSales(janAprWinter23);
assert(janAprWinter23Total > 0, '2024年1-4月未找到冬23销售');

const aprilWindow = resolveTransitionWindow(targetYear, 4);
const aprilCheck = monthlyChecks.find((item) => item.month === 4);
assert(aprilCheck, '未生成 2024/4 校验结果');

console.log('season transition checks passed');
console.log(
    JSON.stringify(
        {
            targetYear,
            aprilWindow: {
                prev: formatTransitionSeasonKey(aprilWindow.prev.season, aprilWindow.prev.seasonYear),
                current: formatTransitionSeasonKey(aprilWindow.current.season, aprilWindow.current.seasonYear),
                next: formatTransitionSeasonKey(aprilWindow.next.season, aprilWindow.next.seasonYear),
            },
            aprilBreakdownWan: aprilCheck,
            janAprWinter23Wan: Number((janAprWinter23Total / 10000).toFixed(1)),
        },
        null,
        2,
    ),
);
