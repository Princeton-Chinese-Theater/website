import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/production-dates.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { productionDateRange: range } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('combine repeated and unsorted show dates without times', () => {
  assert.equal(range({ performances: ['2025-12-13 20:00', '2025-12-11 20:00', '2025-12-13 14:00', '2025-12-12 20:00'] }, 'zh'), '2025年12月11日—13日');
});

test('read compact date ranges and partial dates in historical records', () => {
  for (const [value, expected] of [
    ['2024-12-06 20:00；12-07 14:00、20:00', '2024年12月6日—7日'],
    ['2024-04-25至27，每日20:00（角色海报）', '2024年4月25日—27日'],
    ['2021-12-02至04，20:00–22:00（节目册封面）', '2021年12月2日—4日'],
    ['2017-11-30至12-02日20:00', '2017年11月30日—12月2日'],
    ['2025-12-31至2026-01-02', '2025年12月31日—2026年1月2日'],
  ]) assert.equal(range({ performances: [value] }, 'zh'), expected);
});

test('single days, season fallback, and undated or invalid records', () => {
  assert.equal(range({ performances: ['2010-04-25 20:00'] }, 'zh'), '2010年4月25日');
  assert.equal(range({ season: '2026-04-24、25日19:00' }, 'zh'), '2026年4月24日—25日');
  assert.equal(range({ performances: ['2020年秋；10月23/24/25日为文案备选日期'] }, 'zh'), '');
  assert.equal(range({ performances: ['2025-02-30 19:00'] }, 'zh'), '');
  assert.equal(range({ performances: ['2024-02-29 19:00'] }, 'zh'), '2024年2月29日');
});

test('English dates omit show times as well', () => {
  const value = range({ performances: ['2025-12-11 20:00', '2025-12-13 14:00'] }, 'en');
  assert.match(value, /Dec.*11.*13.*2025/);
  assert.doesNotMatch(value, /20:00|14:00/);
});
