/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for the pure timeseries helpers.
 * Run: node --test scripts/ts-tests.mjs   (or: node scripts/ts-tests.mjs)
 *
 * Uses only Node built-ins (node:test, node:assert) — no install needed.
 * Imports the extracted pure modules directly (no React / echarts).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  coerceArray,
  parseCsv,
  parseSeriesInput,
  toDisplaySeries,
  parseAdvancedParams
} from '../src/utils/timeseriesParse.js';

import { normalizeCatalog, FALLBACK_CATALOG } from '../src/api/timeseries.js';

/* ------------------------------------------------------------------ */
/* parseSeriesInput                                                    */
/* ------------------------------------------------------------------ */

test('parseSeriesInput: JSON 1D array', () => {
  const r = parseSeriesInput('[1, 2, 3]');
  assert.deepEqual(r.data, [1, 2, 3]);
  assert.deepEqual(r.shape, { T: 3, C: 1 });
});

test('parseSeriesInput: JSON 2D array', () => {
  const r = parseSeriesInput('[[1, 2], [3, 4], [5, 6]]');
  assert.deepEqual(r.data, [[1, 2], [3, 4], [5, 6]]);
  assert.deepEqual(r.shape, { T: 3, C: 2 });
});

test('parseSeriesInput: JSON object {data:[...]}', () => {
  const r = parseSeriesInput('{"data": [1.2, 1.3, 1.1]}');
  assert.deepEqual(r.data, [1.2, 1.3, 1.1]);
  assert.deepEqual(r.shape, { T: 3, C: 1 });
});

test('parseSeriesInput: comma-delimited numbers (single line) -> 1D', () => {
  // A single line (no newline) is treated as a 1D series regardless of comma vs
  // space delimiter, so pasted "1, 2, 3, 4" is a length-4 series, not 1x4 2D.
  const r = parseSeriesInput('1, 2, 3, 4');
  assert.deepEqual(r.data, [1, 2, 3, 4]);
  assert.deepEqual(r.shape, { T: 4, C: 1 });
});

test('parseSeriesInput: space-delimited numbers -> 1D', () => {
  // No comma / newline -> falls through to the whitespace-split 1D branch.
  const r = parseSeriesInput('1 2 3 4');
  assert.deepEqual(r.data, [1, 2, 3, 4]);
  assert.deepEqual(r.shape, { T: 4, C: 1 });
});

test('parseSeriesInput: newline-delimited numbers', () => {
  // Contains newlines -> routed through parseCsv (single column).
  const r = parseSeriesInput('1\n2\n3');
  assert.deepEqual(r.data, [1, 2, 3]);
  assert.deepEqual(r.shape, { T: 3, C: 1 });
});

test('parseSeriesInput: empty input -> error', () => {
  const r = parseSeriesInput('');
  assert.ok(r.error);
  assert.equal(r.data, undefined);
});

test('parseSeriesInput: non-numeric -> error', () => {
  const r = parseSeriesInput('foo bar baz');
  assert.ok(r.error);
});

test('parseSeriesInput: ragged 2D rows -> error', () => {
  const r = parseSeriesInput('[[1, 2], [3]]');
  assert.ok(r.error);
});

/* ------------------------------------------------------------------ */
/* coerceArray                                                         */
/* ------------------------------------------------------------------ */

test('coerceArray: 1D happy path -> {T, C:1}', () => {
  const r = coerceArray([1, 2, 3]);
  assert.deepEqual(r.data, [1, 2, 3]);
  assert.deepEqual(r.shape, { T: 3, C: 1 });
});

test('coerceArray: 2D happy path -> {T, C=width}', () => {
  const r = coerceArray([[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(r.data, [[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(r.shape, { T: 2, C: 3 });
});

test('coerceArray: empty array -> error', () => {
  const r = coerceArray([]);
  assert.ok(r.error);
});

test('coerceArray: NaN (non-numeric) -> error', () => {
  const r = coerceArray([1, 'x', 3]);
  assert.ok(r.error);
});

/* ------------------------------------------------------------------ */
/* parseCsv                                                            */
/* ------------------------------------------------------------------ */

test('parseCsv: with header row (first row non-numeric, skipped)', () => {
  const r = parseCsv('value\n1\n2\n3');
  assert.deepEqual(r.data, [1, 2, 3]);
  assert.deepEqual(r.shape, { T: 3, C: 1 });
});

test('parseCsv: without header', () => {
  const r = parseCsv('1\n2\n3');
  assert.deepEqual(r.data, [1, 2, 3]);
  assert.deepEqual(r.shape, { T: 3, C: 1 });
});

test('parseCsv: single column -> 1D', () => {
  const r = parseCsv('10\n20\n30\n40');
  assert.deepEqual(r.data, [10, 20, 30, 40]);
  assert.deepEqual(r.shape, { T: 4, C: 1 });
});

test('parseCsv: multi-column -> 2D', () => {
  const r = parseCsv('a,b\n1,2\n3,4');
  assert.deepEqual(r.data, [[1, 2], [3, 4]]);
  assert.deepEqual(r.shape, { T: 2, C: 2 });
});

test('parseCsv: ragged -> error', () => {
  const r = parseCsv('1,2\n3');
  assert.ok(r.error);
});

test('parseCsv: non-numeric body -> error', () => {
  const r = parseCsv('1,2\nx,4');
  assert.ok(r.error);
});

/* ------------------------------------------------------------------ */
/* toDisplaySeries                                                     */
/* ------------------------------------------------------------------ */

test('toDisplaySeries: 1D passthrough', () => {
  assert.deepEqual(toDisplaySeries([1, 2, 3]), [1, 2, 3]);
});

test('toDisplaySeries: 2D picks the chosen channel', () => {
  assert.deepEqual(toDisplaySeries([[1, 10], [2, 20], [3, 30]], 1), [10, 20, 30]);
});

test('toDisplaySeries: out-of-range channel falls back to col 0', () => {
  assert.deepEqual(toDisplaySeries([[1, 10], [2, 20]], 5), [1, 2]);
});

/* ------------------------------------------------------------------ */
/* parseAdvancedParams                                                 */
/* ------------------------------------------------------------------ */

test('parseAdvancedParams: empty -> {}', () => {
  assert.deepEqual(parseAdvancedParams(''), {});
});

test('parseAdvancedParams: valid JSON object -> object', () => {
  assert.deepEqual(parseAdvancedParams('{"penalty": 10}'), { penalty: 10 });
});

test('parseAdvancedParams: invalid JSON -> null', () => {
  assert.equal(parseAdvancedParams('{not json}'), null);
});

test('parseAdvancedParams: array -> null', () => {
  assert.equal(parseAdvancedParams('[1, 2, 3]'), null);
});

/* ------------------------------------------------------------------ */
/* normalizeCatalog                                                    */
/* ------------------------------------------------------------------ */

test('normalizeCatalog: (a) shape {anomaly:{models:{iso:{...}}}}', () => {
  const raw = { anomaly: { models: { iso: { label: 'Iso Forest' } } } };
  const cat = normalizeCatalog(raw);
  const iso = cat.anomaly.find((m) => m.key === 'iso');
  assert.ok(iso, 'iso entry present');
  assert.equal(iso.label, 'Iso Forest');
  // other tasks fall back
  assert.ok(cat.changepoint.length > 0);
  assert.ok(cat.forecast.length > 0);
});

test('normalizeCatalog: (b) shape {anomaly:[{key,...}]}', () => {
  const raw = { anomaly: [{ key: 'iso', label: 'Iso' }, { key: 'xgb', label: 'XGB' }] };
  const cat = normalizeCatalog(raw);
  assert.deepEqual(cat.anomaly.map((m) => m.key), ['iso', 'xgb']);
  assert.equal(cat.anomaly[0].label, 'Iso');
});

test('normalizeCatalog: (c) shape {anomaly:["iso","xgboost"]}', () => {
  const raw = { anomaly: ['iso', 'xgboost'] };
  const cat = normalizeCatalog(raw);
  assert.deepEqual(cat.anomaly.map((m) => m.key), ['iso', 'xgboost']);
  assert.deepEqual(cat.anomaly.map((m) => m.label), ['iso', 'xgboost']);
});

test('normalizeCatalog: (d) null -> falls back to FALLBACK_CATALOG for all three tasks', () => {
  const cat = normalizeCatalog(null);
  assert.deepEqual(
    cat.anomaly.map((m) => m.key),
    FALLBACK_CATALOG.anomaly.map((m) => m.key)
  );
  assert.deepEqual(
    cat.changepoint.map((m) => m.key),
    FALLBACK_CATALOG.changepoint.map((m) => m.key)
  );
  assert.deepEqual(
    cat.forecast.map((m) => m.key),
    FALLBACK_CATALOG.forecast.map((m) => m.key)
  );
});

test('normalizeCatalog: (d) empty object -> falls back for all three tasks', () => {
  const cat = normalizeCatalog({});
  assert.deepEqual(
    cat.anomaly.map((m) => m.key),
    FALLBACK_CATALOG.anomaly.map((m) => m.key)
  );
  assert.deepEqual(
    cat.changepoint.map((m) => m.key),
    FALLBACK_CATALOG.changepoint.map((m) => m.key)
  );
  assert.deepEqual(
    cat.forecast.map((m) => m.key),
    FALLBACK_CATALOG.forecast.map((m) => m.key)
  );
});

test('normalizeCatalog: (e) optional_unavailable entry -> available:false', () => {
  const raw = { anomaly: { models: { lag_llama: { label: 'Lag-Llama', optional_unavailable: true } } } };
  const cat = normalizeCatalog(raw);
  const entry = cat.anomaly.find((m) => m.key === 'lag_llama');
  assert.ok(entry);
  assert.equal(entry.available, false);
});
