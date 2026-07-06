/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * L5 後端整合測試（需連線後端）。
 * 從 src/processing_data/process_score_dataset.csv 取出一條「製程曲線」（單一樣本列的 100 點），
 * 對 http://localhost:8000/api/timeseries/* 逐一打真 API，驗證回應形狀符合 §7。
 *
 * 執行：  npm run test:integration        （或 node scripts/ts-integration.mjs）
 * 環境：  TS_BASE 可覆寫後端位址（預設 http://localhost:8000）。
 *
 * 注意：這會實際呼叫後端、訓練與刪除模型；不屬於離線的 `npm test`。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.TS_BASE || 'http://localhost:8000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.resolve(__dirname, '../src/processing_data/process_score_dataset.csv');

/* ---------- 讀取製程曲線 ---------- */
// CSV 欄位：Time, Label, ProcessScore, Wavelength, 0..99（100 個曲線點）。
// 取第一筆非 White 樣本列的曲線點作為單變量序列。
function loadProcessCurve() {
  const text = fs.readFileSync(CSV, 'utf8');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = lines[0].split(',');
  const curveStart = 4; // Time,Label,ProcessScore,Wavelength 之後
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(',');
    if ((cells[1] || '').toLowerCase() === 'white') {
      continue;
    }
    const curve = cells.slice(curveStart).map(Number);
    if (curve.length > 0 && curve.every((n) => !Number.isNaN(n))) {
      return { curve, label: cells[1], score: cells[2], points: curve.length, headerCols: header.length };
    }
  }
  throw new Error('CSV 找不到有效的樣本曲線列');
}

/* ---------- HTTP ---------- */
async function call(method, path, body) {
  const init = { method, headers: { Accept: 'application/json' } };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, ok: res.ok, json };
}

/* ---------- 斷言框架 ---------- */
const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: Boolean(cond), detail });
  const tag = cond ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? `  — ${detail}` : ''}`);
  return Boolean(cond);
}
const isArr = (x) => Array.isArray(x);
const num = (x) => typeof x === 'number' && Number.isFinite(x);

async function main() {
  const { curve, label, score, points, headerCols } = loadProcessCurve();
  console.log(`# 後端：${BASE}`);
  console.log(`# 曲線：label=${label} ProcessScore=${score} 長度=${points}（CSV 欄數=${headerCols}）\n`);
  check('CSV 曲線長度為 100 點', points === 100, `points=${points}`);

  /* 1. catalog */
  {
    const r = await call('GET', '/api/timeseries/catalog');
    check('catalog 200 且含三任務',
      r.status === 200 && r.json?.anomaly && r.json?.changepoint && r.json?.forecast,
      `status=${r.status}`);
    check('catalog optional_unavailable 標出 lag_llama/moirai',
      isArr(r.json?.optional_unavailable) && r.json.optional_unavailable.includes('lag_llama'),
      JSON.stringify(r.json?.optional_unavailable));
  }

  /* 2. preprocess（steps 為含 op 的清單） */
  {
    const body = { data: curve, steps: [{ op: 'normalize', method: 'zscore' }] };
    const r = await call('POST', '/api/timeseries/preprocess', body);
    const okShape = r.status === 200 && isArr(r.json?.data) && r.json.data.length === points
      && isArr(r.json?.applied) && r.json.applied.includes('normalize');
    check('preprocess normalize(zscore) 回傳同長度序列', okShape,
      `status=${r.status} applied=${JSON.stringify(r.json?.applied)} len=${r.json?.data?.length}`);
  }

  /* 3. anomaly（無狀態） */
  {
    const body = { data: curve, model: 'isolation_forest', contamination: 0.05, params: { window: 32 } };
    const r = await call('POST', '/api/timeseries/anomaly', body);
    const ok = r.status === 200 && isArr(r.json?.scores) && num(r.json?.threshold)
      && isArr(r.json?.labels) && isArr(r.json?.anomalies);
    check('anomaly isolation_forest 回傳 scores/threshold/labels/anomalies', ok,
      `status=${r.status} n_anomalies=${r.json?.n_anomalies} scoresLen=${r.json?.scores?.length}`);
    check('anomaly labels 長度對齊序列', r.json?.labels?.length === points,
      `labelsLen=${r.json?.labels?.length}`);
  }

  /* 4. changepoint（無狀態） */
  {
    const body = { data: curve, model: 'pelt', params: { penalty: null } };
    const r = await call('POST', '/api/timeseries/changepoint', body);
    const ok = r.status === 200 && isArr(r.json?.changepoints) && num(r.json?.n_changepoints ?? r.json?.changepoints?.length);
    check('changepoint pelt 回傳 changepoints', ok,
      `status=${r.status} n=${r.json?.n_changepoints} cps=${JSON.stringify(r.json?.changepoints)}`);
  }

  /* 5. forecast（無狀態） */
  {
    const H = 12;
    const body = { data: curve, model: 'xgboost_lag', horizon: H, params: { n_lags: 24 } };
    const r = await call('POST', '/api/timeseries/forecast', body);
    const ok = r.status === 200 && isArr(r.json?.forecast) && r.json.forecast.length === H
      && isArr(r.json?.lower) && r.json.lower.length === H
      && isArr(r.json?.upper) && r.json.upper.length === H;
    check('forecast xgboost_lag 回傳 forecast/lower/upper 長度=horizon', ok,
      `status=${r.status} fLen=${r.json?.forecast?.length}`);
  }

  /* 6. 用法 B：anomaly 訓練→偵測→清單→刪除 */
  {
    const train = await call('POST', '/api/timeseries/anomaly/train',
      { data: curve, model: 'isolation_forest', contamination: 0.05, params: { window: 32 }, name: 'itest-anomaly' });
    const modelId = train.json?.model_id || train.json?.id;
    check('anomaly/train 回傳 model_id', train.status === 200 && Boolean(modelId), `status=${train.status} id=${modelId}`);

    if (modelId) {
      const detect = await call('POST', `/api/timeseries/anomaly/detect/${encodeURIComponent(modelId)}`, { data: curve });
      check('anomaly/detect/{id} 用已存模型偵測',
        detect.status === 200 && isArr(detect.json?.scores) && isArr(detect.json?.anomalies),
        `status=${detect.status} n_anomalies=${detect.json?.n_anomalies}`);

      const list = await call('GET', '/api/timeseries/models?task=anomaly');
      const arr = isArr(list.json) ? list.json : (list.json?.models || list.json?.data || list.json?.results || []);
      check('models?task=anomaly 清單含剛訓練的模型',
        list.status === 200 && arr.some((m) => (m.model_id || m.id || m._id) === modelId),
        `status=${list.status} count=${arr.length}`);

      const del = await call('DELETE', `/api/timeseries/models/${encodeURIComponent(modelId)}`);
      check('DELETE models/{id} 刪除成功', del.status === 200 || del.status === 204, `status=${del.status}`);
    }
  }

  /* 7. 用法 B：forecast 訓練→外推→刪除 */
  {
    const train = await call('POST', '/api/timeseries/forecast/train',
      { data: curve, model: 'xgboost_lag', params: { n_lags: 24 }, name: 'itest-forecast' });
    const modelId = train.json?.model_id || train.json?.id;
    check('forecast/train 回傳 model_id', train.status === 200 && Boolean(modelId), `status=${train.status} id=${modelId}`);

    if (modelId) {
      const predict = await call('POST', `/api/timeseries/forecast/predict/${encodeURIComponent(modelId)}`, { horizon: 12 });
      check('forecast/predict/{id} 外推 12 步',
        predict.status === 200 && isArr(predict.json?.forecast) && predict.json.forecast.length === 12,
        `status=${predict.status} fLen=${predict.json?.forecast?.length}`);
      await call('DELETE', `/api/timeseries/models/${encodeURIComponent(modelId)}`);
    }
  }

  /* 8. 選配基礎模型未安裝 → 501 */
  {
    const r = await call('POST', '/api/timeseries/forecast', { data: curve, model: 'lag_llama', horizon: 12 });
    check('lag_llama（未安裝）回 501', r.status === 501,
      `status=${r.status} msg=${r.json?.detail?.error_message || r.json?.detail || ''}`);
  }

  /* 9. 空資料 → 422 */
  {
    const r = await call('POST', '/api/timeseries/anomaly', { data: [], model: 'isolation_forest' });
    check('空 data 回 422', r.status === 422, `status=${r.status}`);
  }

  /* 摘要 */
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\n# 整合測試結果：${pass}/${results.length} 通過，${fail} 失敗`);
  if (fail > 0) {
    console.log('# 失敗項：');
    results.filter((r) => !r.pass).forEach((r) => console.log(`  - ${r.name} (${r.detail})`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('整合測試執行錯誤：', err?.message || err);
  process.exitCode = 1;
});
