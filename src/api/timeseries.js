/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 通用時間序列 API client（對應後端 §7 `/api/timeseries/*`）。
 *
 * 這一組端點與 /api/upload、/api/preprocessing、/api/modeling 完全獨立，
 * 不進單一任務鎖、可與既有流程並行。共分兩種用法：
 *   A. 無狀態即算：送序列 → 直接拿結果（不進資料庫、不輪詢）。
 *   B. 訓練後持久化：train 一次存 Mongo，之後對新資料用 model_id 反覆推論。
 */

const BASE = '/api/timeseries';

/**
 * 統一讀取後端錯誤訊息。非 2xx 時 body 為
 * `{ "detail": { "error_message": "..." } }`（部分情況 detail 為字串）。
 */
async function readError(response) {
  const contentType = response.headers.get('content-type') || '';
  let body = null;

  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => null);
  } else {
    body = await response.text().catch(() => '');
  }

  let message = '';
  if (typeof body === 'string') {
    message = body;
  } else if (body && typeof body === 'object') {
    const detail = body.detail ?? body.message ?? body.error ?? null;
    if (typeof detail === 'string') {
      message = detail;
    } else if (detail && typeof detail === 'object') {
      message = detail.error_message || detail.message || JSON.stringify(detail);
    } else {
      message = JSON.stringify(body);
    }
  }

  const error = new Error(message || `HTTP ${response.status}`);
  error.status = response.status;
  error.body = body;
  return error;
}

async function request(path, { method = 'GET', body } = {}) {
  const init = { method, headers: { Accept: 'application/json' } };

  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE}${path}`, init);
  } catch (networkError) {
    const error = new Error(
      networkError instanceof TypeError
        ? '無法連線後端：請確認 Vite proxy / 後端位址 / CORS。'
        : (networkError?.message || '網路請求失敗')
    );
    error.status = 0;
    throw error;
  }

  if (!response.ok) {
    throw await readError(response);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
}

/* ------------------------------------------------------------------ */
/* 共用                                                                */
/* ------------------------------------------------------------------ */

/** GET /catalog → 依回傳動態建立「任務 / 模型 / 參數」選單。 */
export function getCatalog() {
  return request('/catalog');
}

/** POST /preprocess → { data, applied, shape }（重取樣/補值/標準化/差分/去趨勢）。 */
export function preprocess(payload) {
  return request('/preprocess', { method: 'POST', body: payload });
}

/** POST /features → { features[], feature_names[] }。 */
export function extractFeatures(payload) {
  return request('/features', { method: 'POST', body: payload });
}

/* ------------------------------------------------------------------ */
/* 用法 A：無狀態即算                                                    */
/* ------------------------------------------------------------------ */

/** POST /anomaly → { scores, scores_normalized, threshold, labels, anomalies, n_anomalies }。 */
export function detectAnomaly(payload) {
  return request('/anomaly', { method: 'POST', body: payload });
}

/** POST /changepoint → { changepoints, n_changepoints, length }。 */
export function detectChangepoint(payload) {
  return request('/changepoint', { method: 'POST', body: payload });
}

/** POST /forecast → { forecast, lower, upper, horizon }。 */
export function forecast(payload) {
  return request('/forecast', { method: 'POST', body: payload });
}

/* ------------------------------------------------------------------ */
/* 用法 B：訓練後持久化（存 MongoDB，可重複推論）                          */
/* ------------------------------------------------------------------ */

/** POST /anomaly/train → { model_id, task, model_key, meta, train_result }。 */
export function trainAnomaly(payload) {
  return request('/anomaly/train', { method: 'POST', body: payload });
}

/** POST /anomaly/detect/{model_id} → 用已存模型對新序列偵測（門檻沿用訓練值）。 */
export function detectWithModel(modelId, payload) {
  return request(`/anomaly/detect/${encodeURIComponent(modelId)}`, {
    method: 'POST',
    body: payload
  });
}

/** POST /forecast/train → { model_id, ... }。 */
export function trainForecast(payload) {
  return request('/forecast/train', { method: 'POST', body: payload });
}

/** POST /forecast/predict/{model_id} → { forecast, lower, upper }（可帶最新 context）。 */
export function predictWithModel(modelId, payload) {
  return request(`/forecast/predict/${encodeURIComponent(modelId)}`, {
    method: 'POST',
    body: payload
  });
}

/** GET /models?task=anomaly|forecast → 已存模型清單。 */
export function listModels(task) {
  const query = task ? `?task=${encodeURIComponent(task)}` : '';
  return request(`/models${query}`);
}

/** GET /models/{model_id} → 單一模型中繼資料。 */
export function getModel(modelId) {
  return request(`/models/${encodeURIComponent(modelId)}`);
}

/** DELETE /models/{model_id} → 刪除（GridFS + 文件 + 快取）。 */
export function deleteModel(modelId) {
  return request(`/models/${encodeURIComponent(modelId)}`, { method: 'DELETE' });
}

/** 下載已存模型 .pkl 的 URL（直接給 <a href> 或 window.open 用）。 */
export function getModelDownloadUrl(modelId) {
  return `${BASE}/models/${encodeURIComponent(modelId)}/download`;
}

/* ------------------------------------------------------------------ */
/* Catalog 解析與備援                                                    */
/* ------------------------------------------------------------------ */

/**
 * 文件（§7-3）列出的已知模型；當 /catalog 尚未回應或格式不符時作為備援，
 * 使前台在後端未連線時仍可操作。實際以 catalog 回傳為準。
 */
export const FALLBACK_CATALOG = {
  anomaly: [
    { key: 'rule_based', label: 'Rule Based' },
    { key: 'isolation_forest', label: 'Isolation Forest' },
    { key: 'xgboost', label: 'XGBoost' },
    { key: 'minirocket', label: 'MiniRocket' },
    { key: 'tcn', label: 'TCN（深度）' },
    { key: 'tranad', label: 'TranAD（深度／多感測器）' },
    { key: 'anomaly_transformer', label: 'Anomaly Transformer（深度／多感測器）' },
    { key: 'timesnet', label: 'TimesNet（深度／週期性）' }
  ],
  changepoint: [
    { key: 'pelt', label: 'PELT' },
    { key: 'kernelcpd', label: 'KernelCPD' },
    { key: 'binseg', label: 'BinSeg' },
    { key: 'window', label: 'Window' },
    { key: 'cusum', label: 'CUSUM' },
    { key: 'bocpd', label: 'BOCPD' }
  ],
  forecast: [
    { key: 'naive', label: 'Naive' },
    { key: 'seasonal_naive', label: 'Seasonal Naive' },
    { key: 'xgboost_lag', label: 'XGBoost Lag' },
    { key: 'tcn', label: 'TCN（深度）' },
    { key: 'lag_llama', label: 'Lag-Llama（選配基礎模型）', optional: true },
    { key: 'moirai', label: 'Moirai（選配基礎模型）', optional: true }
  ]
};

const TASK_KEYS = ['anomaly', 'changepoint', 'forecast'];

function coerceModelEntry(key, value) {
  const entry = { key: String(key) };

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    entry.label = value.label || value.name || value.title || String(key);
    // 參數規格：容忍 params / parameters / param_spec 等不同命名。
    entry.params = value.params || value.parameters || value.param_spec || value.schema || null;
    // 選配基礎模型未安裝時：容忍多種旗標命名。
    entry.optional = Boolean(
      value.optional || value.is_optional || value.optional_unavailable || value.unavailable
    );
    entry.available = value.available === undefined ? !entry.optional : Boolean(value.available);
    if (value.optional_unavailable) {
      entry.available = false;
    }
    entry.description = value.description || value.desc || '';
  } else {
    entry.label = String(value ?? key);
    entry.params = null;
    entry.optional = false;
    entry.available = true;
  }

  return entry;
}

/**
 * 把 /catalog 各種可能的巢狀形狀，正規化成
 * `{ anomaly: Entry[], changepoint: Entry[], forecast: Entry[] }`。
 * Entry = { key, label, params, optional, available, description }。
 *
 * 支援的來源形狀（擇一命中即可）：
 *   { anomaly: { models: { iso: {...} } } }
 *   { anomaly: { iso: {...}, xgboost: {...} } }
 *   { anomaly: [ "iso", "xgboost" ] }
 *   { anomaly: [ { key/name: "iso", ... } ] }
 *   { tasks: { anomaly: ... } }
 */
export function normalizeCatalog(raw) {
  const result = { anomaly: [], changepoint: [], forecast: [] };
  const root = raw?.tasks && typeof raw.tasks === 'object' ? raw.tasks : (raw || {});

  for (const task of TASK_KEYS) {
    const node = root?.[task];
    if (!node) {
      continue;
    }

    // 可能包在 models / available 之下。
    const modelsNode = node.models ?? node.available ?? node.list ?? node;

    let entries = [];
    if (Array.isArray(modelsNode)) {
      entries = modelsNode.map((item) =>
        typeof item === 'object' && item
          ? coerceModelEntry(item.key ?? item.name ?? item.id, item)
          : coerceModelEntry(item, item)
      );
    } else if (modelsNode && typeof modelsNode === 'object') {
      entries = Object.entries(modelsNode).map(([key, value]) => coerceModelEntry(key, value));
    }

    result[task] = entries;
  }

  // 任何一個任務解析不到，就回退該任務的備援清單。
  for (const task of TASK_KEYS) {
    if (!result[task] || result[task].length === 0) {
      result[task] = FALLBACK_CATALOG[task].map((m) => coerceModelEntry(m.key, m));
    }
  }

  return result;
}

/** 取得已正規化的 catalog；失敗時回退到文件已知清單（不丟例外）。 */
export async function loadCatalog() {
  try {
    const raw = await getCatalog();
    return { catalog: normalizeCatalog(raw), source: 'backend', raw };
  } catch (error) {
    return {
      catalog: normalizeCatalog(null),
      source: 'fallback',
      error: error?.message || String(error)
    };
  }
}
