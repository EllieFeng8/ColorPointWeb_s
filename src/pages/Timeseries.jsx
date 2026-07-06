/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 通用時間序列分析頁（後端 §7 `/api/timeseries/*`）。
 * 與既有 upload→preprocessing→modeling 流程完全獨立。
 *
 * 三個任務：異常偵測 / 變點偵測 / 預測。
 * 兩種用法：A 無狀態即算、B 訓練後持久化（存 Mongo，可重複推論）。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  GitBranch,
  TrendingUp,
  Zap,
  Upload,
  RefreshCw,
  Trash2,
  Download,
  Database,
  Wand2
} from 'lucide-react';
import NavBar from '@/src/components/NavBar.jsx';
import Footer from '@/src/components/Footer.jsx';
import TimeseriesChart from '@/src/components/TimeseriesChart.jsx';
import * as ts from '@/src/api/timeseries.js';
import {
  coerceArray,
  parseSeriesInput,
  toDisplaySeries,
  parseAdvancedParams
} from '@/src/utils/timeseriesParse.js';
import processCsvRaw from '@/src/processing_data/process_score_dataset.csv?raw';

/* ------------------------------------------------------------------ */
/* 製程範例曲線：從 processing_data 的建模格式 CSV 取一條樣本曲線          */
/* CSV 欄位：Time, Label, ProcessScore, Wavelength, 0..99（100 點）。     */
/* 取第一筆非 White 樣本列的曲線點，作為單變量序列（長度 100）。          */
/* ------------------------------------------------------------------ */
function extractProcessCurve(csvText) {
  const lines = (csvText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(',');
    if ((cells[1] || '').toLowerCase() === 'white') {
      continue;
    }
    const curve = cells.slice(4).map(Number);
    if (curve.length > 0 && curve.every((n) => !Number.isNaN(n))) {
      return { curve, label: cells[1] || `sample ${i}`, score: cells[2] };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 任務定義                                                            */
/* ------------------------------------------------------------------ */

const TASKS = [
  { key: 'anomaly', label: '異常偵測', icon: Activity, persist: true, hint: '找出異常時間點' },
  { key: 'changepoint', label: '變點偵測', icon: GitBranch, persist: false, hint: '找階段切換 / 異常開始時間' },
  { key: 'forecast', label: '預測', icon: TrendingUp, persist: true, hint: '外推未來值 + 風險區間' }
];

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-subtle';
const CARD_HEAD = 'px-6 py-4 border-b border-slate-50 bg-slate-50/30';
const CARD_TITLE = 'text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2';
const FIELD = 'w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none';
const LABEL = 'text-[11px] font-bold text-slate-400 uppercase tracking-wide';

/* ------------------------------------------------------------------ */
/* 主元件                                                              */
/* ------------------------------------------------------------------ */

export default function Timeseries() {
  // --- 序列輸入 ---
  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState(null); // { data, shape } | null
  const [parseError, setParseError] = useState('');
  const [channel, setChannel] = useState(0);
  const fileInputRef = useRef(null);

  // --- catalog ---
  const [catalog, setCatalog] = useState(ts.normalizeCatalog(null));
  const [catalogSource, setCatalogSource] = useState('loading'); // loading | backend | fallback
  const [catalogError, setCatalogError] = useState('');

  // --- 任務 / 模型 / 參數 ---
  const [activeTask, setActiveTask] = useState('anomaly');
  const [selectedModel, setSelectedModel] = useState({ anomaly: '', changepoint: '', forecast: '' });
  const [contamination, setContamination] = useState('0.05');
  const [anomalyWindow, setAnomalyWindow] = useState('32');
  const [cpPenalty, setCpPenalty] = useState('');
  const [horizon, setHorizon] = useState('12');
  const [nLags, setNLags] = useState('24');
  const [advancedParams, setAdvancedParams] = useState({ anomaly: '', changepoint: '', forecast: '' });

  // --- 用法 A/B ---
  const [mode, setMode] = useState('stateless'); // stateless | persist
  const [modelName, setModelName] = useState('');
  const [useContext, setUseContext] = useState(true);

  // --- 前處理（選用）---
  const [showPreprocess, setShowPreprocess] = useState(false);
  const [ppStandardize, setPpStandardize] = useState(false);
  const [ppDetrend, setPpDetrend] = useState(false);
  const [ppDifference, setPpDifference] = useState('0');

  // --- 執行狀態 / 結果 ---
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [chartState, setChartState] = useState(null); // { mode, series, result }
  const [resultMeta, setResultMeta] = useState(null); // 指標摘要

  // --- 已存模型（用法 B）---
  const [savedModels, setSavedModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const activeTaskDef = TASKS.find((t) => t.key === activeTask);
  const persistSupported = Boolean(activeTaskDef?.persist);
  const effectiveMode = persistSupported ? mode : 'stateless';

  const displaySeries = useMemo(
    () => (parsed ? toDisplaySeries(parsed.data, channel) : []),
    [parsed, channel]
  );

  /* ---------------- catalog 載入 ---------------- */
  useEffect(() => {
    let active = true;
    ts.loadCatalog().then(({ catalog: normalized, source, error: err }) => {
      if (!active) {
        return;
      }
      setCatalog(normalized);
      setCatalogSource(source);
      setCatalogError(err || '');
      setSelectedModel((current) => {
        const next = { ...current };
        for (const task of ['anomaly', 'changepoint', 'forecast']) {
          if (!next[task]) {
            const firstAvailable = (normalized[task] || []).find((m) => m.available !== false);
            next[task] = firstAvailable?.key || normalized[task]?.[0]?.key || '';
          }
        }
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, []);

  /* ---------------- 已存模型清單（切到用法 B 時）---------------- */
  useEffect(() => {
    if (effectiveMode !== 'persist' || !persistSupported) {
      return;
    }
    refreshModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode, activeTask]);

  const refreshModels = async () => {
    if (!persistSupported) {
      return;
    }
    setModelsLoading(true);
    try {
      const payload = await ts.listModels(activeTask);
      const list = Array.isArray(payload)
        ? payload
        : (payload?.models || payload?.data || payload?.results || []);
      setSavedModels(Array.isArray(list) ? list : []);
    } catch (err) {
      setSavedModels([]);
      setError(err?.message ? formatRunError(err) : '取得已存模型清單失敗');
    } finally {
      setModelsLoading(false);
    }
  };

  /* ---------------- 序列輸入處理 ---------------- */
  const applyParsed = (result) => {
    if (result.error) {
      setParsed(null);
      setParseError(result.error);
      return false;
    }
    setParsed({ data: result.data, shape: result.shape });
    setParseError('');
    setChannel((current) => (current < result.shape.C ? current : 0));
    setChartState(null);
    setResultMeta(null);
    return true;
  };

  const handleParseText = () => {
    applyParsed(parseSeriesInput(inputText));
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setInputText(text);
    applyParsed(parseSeriesInput(text, file.name));
    event.target.value = '';
  };

  const handleLoadSample = () => {
    const sample = extractProcessCurve(processCsvRaw);
    if (!sample) {
      setParseError('製程範例曲線解析失敗。');
      return;
    }
    setInputText(JSON.stringify(sample.curve));
    applyParsed(coerceArray(sample.curve));
    setInfo(`已載入製程範例曲線（${sample.label}，ProcessScore=${sample.score}，長度 ${sample.curve.length}）。`);
  };

  /* ---------------- 組 params ---------------- */
  const buildParams = () => {
    const advanced = parseAdvancedParams(advancedParams[activeTask]);
    if (advanced === null) {
      throw new Error('進階參數 JSON 格式錯誤。');
    }

    if (activeTask === 'anomaly') {
      const params = { ...advanced };
      const w = Number(anomalyWindow);
      if (anomalyWindow !== '' && !Number.isNaN(w)) {
        params.window = w;
      }
      return params;
    }
    if (activeTask === 'changepoint') {
      const params = { ...advanced };
      if (cpPenalty === '') {
        if (!('penalty' in params)) {
          params.penalty = null;
        }
      } else {
        params.penalty = Number(cpPenalty);
      }
      return params;
    }
    // forecast
    const params = { ...advanced };
    const lags = Number(nLags);
    if (nLags !== '' && !Number.isNaN(lags)) {
      params.n_lags = lags;
    }
    return params;
  };

  const ensureData = () => {
    if (!parsed || !Array.isArray(parsed.data) || parsed.data.length === 0) {
      throw new Error('請先載入有效的序列資料。');
    }
    return parsed.data;
  };

  /* ---------------- 前處理（選用，§7-2）---------------- */
  const handleRunPreprocess = async () => {
    setError('');
    setInfo('');
    try {
      const data = ensureData();
      const diff = Number(ppDifference);
      // 後端要求 steps 為含 op 判別鍵的清單（op: normalize | detrend | difference | impute | resample）。
      const steps = [];
      if (ppStandardize) {
        steps.push({ op: 'normalize', method: 'zscore' });
      }
      if (ppDetrend) {
        steps.push({ op: 'detrend', method: 'stl', period: null });
      }
      if (!Number.isNaN(diff) && diff > 0) {
        steps.push({ op: 'difference', order: diff });
      }
      if (steps.length === 0) {
        throw new Error('請至少勾選一項前處理步驟。');
      }
      const payload = { data, steps };
      setBusy(true);
      const res = await ts.preprocess(payload);
      const nextData = res?.data;
      const coerced = coerceArray(nextData);
      if (coerced.error) {
        throw new Error(`前處理回傳格式無法解析：${coerced.error}`);
      }
      setParsed({ data: coerced.data, shape: coerced.shape });
      setChannel(0);
      setChartState(null);
      setResultMeta(null);
      const applied = Array.isArray(res?.applied) ? res.applied.join('、') : '';
      setInfo(`前處理完成${applied ? `（已套用：${applied}）` : ''}，序列已更新。`);
    } catch (err) {
      setError(err?.message ? formatRunError(err) : '前處理失敗');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- 執行（用法 A 無狀態）---------------- */
  const handleRunStateless = async () => {
    setError('');
    setInfo('');
    try {
      const data = ensureData();
      const model = selectedModel[activeTask];
      if (!model) {
        throw new Error('請選擇模型。');
      }
      const params = buildParams();
      setBusy(true);

      if (activeTask === 'anomaly') {
        const res = await ts.detectAnomaly({
          data,
          model,
          contamination: Number(contamination),
          params
        });
        setChartState({ mode: 'anomaly', series: displaySeries, result: res });
        setResultMeta({
          type: 'anomaly',
          n_anomalies: res?.n_anomalies ?? (res?.anomalies?.length ?? 0),
          threshold: res?.threshold
        });
      } else if (activeTask === 'changepoint') {
        const res = await ts.detectChangepoint({ data, model, params });
        setChartState({ mode: 'changepoint', series: displaySeries, result: res });
        setResultMeta({ type: 'changepoint', n_changepoints: res?.n_changepoints ?? (res?.changepoints?.length ?? 0) });
      } else {
        const res = await ts.forecast({ data, model, horizon: Number(horizon), params });
        setChartState({ mode: 'forecast', series: displaySeries, result: res });
        setResultMeta({ type: 'forecast', horizon: res?.horizon ?? Number(horizon) });
      }
    } catch (err) {
      setError(formatRunError(err));
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- 用法 B：訓練 ---------------- */
  const handleTrain = async () => {
    setError('');
    setInfo('');
    try {
      const data = ensureData();
      const model = selectedModel[activeTask];
      if (!model) {
        throw new Error('請選擇模型。');
      }
      const params = buildParams();
      setBusy(true);

      let res;
      if (activeTask === 'anomaly') {
        res = await ts.trainAnomaly({
          data,
          model,
          contamination: Number(contamination),
          params,
          name: modelName || undefined
        });
      } else {
        res = await ts.trainForecast({
          data,
          model,
          params,
          name: modelName || undefined
        });
      }

      const modelId = res?.model_id || res?.id;
      setInfo(`訓練完成，已存模型 model_id：${modelId ?? '(未回傳)'}`);
      await refreshModels();
    } catch (err) {
      setError(formatRunError(err));
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- 用法 B：用已存模型推論 ---------------- */
  const handleUseModel = async (modelId) => {
    setError('');
    setInfo('');
    try {
      const data = ensureData();
      setBusy(true);

      if (activeTask === 'anomaly') {
        const res = await ts.detectWithModel(modelId, { data });
        setChartState({ mode: 'anomaly', series: displaySeries, result: res });
        setResultMeta({
          type: 'anomaly',
          n_anomalies: res?.n_anomalies ?? (res?.anomalies?.length ?? 0),
          threshold: res?.threshold,
          modelId
        });
      } else {
        const body = { horizon: Number(horizon) };
        if (useContext) {
          body.context = data;
        }
        const res = await ts.predictWithModel(modelId, body);
        setChartState({ mode: 'forecast', series: displaySeries, result: res });
        setResultMeta({ type: 'forecast', horizon: res?.horizon ?? Number(horizon), modelId });
      }
    } catch (err) {
      setError(formatRunError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteModel = async (modelId) => {
    setError('');
    setInfo('');
    try {
      setBusy(true);
      await ts.deleteModel(modelId);
      setInfo(`已刪除模型 ${modelId}`);
      await refreshModels();
    } catch (err) {
      setError(err?.message ? formatRunError(err) : '刪除模型失敗');
    } finally {
      setBusy(false);
    }
  };

  const modelOptions = catalog[activeTask] || [];

  return (
    <div className="h-screen flex overflow-hidden font-display">
      <NavBar />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto bg-white px-12 pt-12 pb-32">
          <header className="mb-10 space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-extrabold tracking-tight text-[#111827]"
            >
              時間序列分析
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500 text-lg"
            >
              異常偵測 / 變點偵測 / 預測 — 獨立子系統，與建模流程互不影響
            </motion.p>
          </header>

          <div className="grid grid-cols-12 gap-8">
            {/* 左欄：輸入與設定 */}
            <div className="col-span-5 space-y-8">
              {/* 序列輸入 */}
              <div className={CARD}>
                <div className={CARD_HEAD}>
                  <h3 className={CARD_TITLE}>
                    <Upload size={18} className="text-primary" /> 序列資料
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    貼上 JSON 陣列（單變量 <code>[1.2, 1.3, …]</code> 或多變量 <code>[[1.2, 9.8], …]</code>），
                    或上傳 <code>.json</code> / <code>.csv</code>。
                  </p>
                  <textarea
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    rows={5}
                    placeholder='[1.2, 1.3, 1.1, ...]'
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleParseText}
                      className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <Zap size={14} /> 解析序列
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Upload size={14} /> 上傳檔案
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Database size={14} /> 載入製程範例曲線
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.csv,text/csv,application/json"
                      className="hidden"
                      onChange={handleFile}
                    />
                  </div>

                  {parseError && <p className="text-xs font-semibold text-red-600">{parseError}</p>}

                  {parsed && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-2">
                      <p>
                        <span className="font-bold text-slate-800">已載入：</span>
                        {parsed.shape.C > 1
                          ? `多變量，時間點 ${parsed.shape.T} × 通道 ${parsed.shape.C}`
                          : `單變量，長度 ${parsed.shape.T}`}
                      </p>
                      {parsed.shape.C > 1 && (
                        <div className="flex items-center gap-2">
                          <span className={LABEL}>顯示通道</span>
                          <select
                            value={channel}
                            onChange={(event) => {
                              setChannel(Number(event.target.value));
                              setChartState(null);
                              setResultMeta(null);
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                          >
                            {Array.from({ length: parsed.shape.C }, (_, index) => (
                              <option key={index} value={index}>通道 {index}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 前處理（選用） */}
              <div className={CARD}>
                <button
                  type="button"
                  onClick={() => setShowPreprocess((v) => !v)}
                  aria-expanded={showPreprocess}
                  className={`${CARD_HEAD} w-full flex items-center justify-between`}
                >
                  <h3 className={CARD_TITLE}>
                    <Wand2 size={18} className="text-primary" /> 前處理（選用）
                  </h3>
                  <span className="text-xs font-bold text-slate-400">{showPreprocess ? '收合' : '展開'}</span>
                </button>
                {showPreprocess && (
                  <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      依後端流程視需要先做前處理（標準化 / 去趨勢 / 差分）再進模型。
                      套用後會以回傳序列取代目前資料。
                    </p>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <input type="checkbox" checked={ppStandardize} onChange={(e) => setPpStandardize(e.target.checked)} className="w-4 h-4 accent-primary" />
                      標準化 standardize
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <input type="checkbox" checked={ppDetrend} onChange={(e) => setPpDetrend(e.target.checked)} className="w-4 h-4 accent-primary" />
                      去趨勢 detrend（CUSUM 用在週期資料前建議先做）
                    </label>
                    <div className="space-y-1">
                      <span className={LABEL}>差分 difference（0 = 不做）</span>
                      <input value={ppDifference} onChange={(e) => setPpDifference(e.target.value)} type="number" min="0" step="1" className={FIELD} />
                    </div>
                    <button
                      type="button"
                      onClick={handleRunPreprocess}
                      disabled={busy || !parsed}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                    >
                      套用前處理
                    </button>
                  </div>
                )}
              </div>

              {/* 模型與參數 */}
              <div className={CARD}>
                <div className={CARD_HEAD}>
                  <h3 className={CARD_TITLE}>
                    <Database size={18} className="text-primary" /> 模型與參數
                  </h3>
                </div>
                <div className="p-6 space-y-5">
                  <div className="space-y-1">
                    <span className={LABEL}>模型</span>
                    <select
                      value={selectedModel[activeTask] || ''}
                      onChange={(event) =>
                        setSelectedModel((current) => ({ ...current, [activeTask]: event.target.value }))
                      }
                      className={FIELD}
                    >
                      {modelOptions.length === 0 && <option value="">（無可用模型）</option>}
                      {modelOptions.map((m) => (
                        <option key={m.key} value={m.key} disabled={m.available === false}>
                          {m.label}{m.available === false ? '（未安裝）' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      模型清單來源：{catalogSource === 'backend' ? '後端 catalog' : catalogSource === 'fallback' ? '備援清單（後端未連線）' : '載入中…'}
                    </p>
                    {catalogSource === 'fallback' && catalogError && (
                      <p className="text-[10px] text-amber-500">catalog 載入失敗：{catalogError}</p>
                    )}
                  </div>

                  {/* 任務專屬參數 */}
                  {activeTask === 'anomaly' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className={LABEL}>contamination</span>
                        <input value={contamination} onChange={(e) => setContamination(e.target.value)} type="number" step="0.01" min="0" max="0.5" className={FIELD} />
                      </div>
                      <div className="space-y-1">
                        <span className={LABEL}>window</span>
                        <input value={anomalyWindow} onChange={(e) => setAnomalyWindow(e.target.value)} type="number" step="1" min="1" className={FIELD} />
                      </div>
                    </div>
                  )}
                  {activeTask === 'changepoint' && (
                    <div className="space-y-1">
                      <span className={LABEL}>penalty（留空 = null 由後端決定）</span>
                      <input value={cpPenalty} onChange={(e) => setCpPenalty(e.target.value)} type="number" step="any" className={FIELD} />
                    </div>
                  )}
                  {activeTask === 'forecast' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className={LABEL}>horizon（預測步數）</span>
                        <input value={horizon} onChange={(e) => setHorizon(e.target.value)} type="number" step="1" min="1" className={FIELD} />
                      </div>
                      <div className="space-y-1">
                        <span className={LABEL}>n_lags</span>
                        <input value={nLags} onChange={(e) => setNLags(e.target.value)} type="number" step="1" min="1" className={FIELD} />
                      </div>
                    </div>
                  )}

                  <details className="text-xs">
                    <summary className="cursor-pointer font-bold text-slate-400 uppercase tracking-wide">進階參數 (JSON)</summary>
                    <textarea
                      value={advancedParams[activeTask]}
                      onChange={(event) =>
                        setAdvancedParams((current) => ({ ...current, [activeTask]: event.target.value }))
                      }
                      rows={3}
                      placeholder='{ "penalty": 10 }'
                      className="mt-2 w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">會合併進該任務的 params（覆寫上面欄位）。</p>
                  </details>

                  {/* 用法 A / B */}
                  <div className="pt-4 border-t border-slate-50 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('stateless')}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
                          effectiveMode === 'stateless' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        A 無狀態即算
                      </button>
                      <button
                        type="button"
                        onClick={() => persistSupported && setMode('persist')}
                        disabled={!persistSupported}
                        title={!persistSupported ? '變點偵測不支援訓練持久化' : undefined}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
                          effectiveMode === 'persist' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                        } ${!persistSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        B 訓練持久化
                      </button>
                    </div>
                    {!persistSupported && (
                      <p className="text-[10px] text-slate-400">變點偵測無學習參數，僅支援無狀態即算。</p>
                    )}

                    {effectiveMode === 'stateless' ? (
                      <button
                        type="button"
                        onClick={handleRunStateless}
                        disabled={busy || !parsed}
                        className="w-full px-6 py-3 bg-primary hover:bg-primary-light disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                      >
                        <Zap size={16} /> {busy ? '執行中…' : '執行分析'}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className={LABEL}>模型名稱（選填）</span>
                          <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="例：產線A-振動" className={FIELD} />
                        </div>
                        {activeTask === 'forecast' && (
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} className="w-4 h-4 accent-primary" />
                            推論時以目前序列作為 context
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={handleTrain}
                          disabled={busy || !parsed}
                          className="w-full px-6 py-3 bg-primary hover:bg-primary-light disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                        >
                          <Database size={16} /> {busy ? '訓練中…' : '訓練並存檔'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 右欄：任務分頁 + 結果 */}
            <div className="col-span-7 space-y-8">
              {/* 任務分頁 */}
              <div className="flex gap-3">
                {TASKS.map((task) => {
                  const Icon = task.icon;
                  const active = activeTask === task.key;
                  return (
                    <button
                      key={task.key}
                      type="button"
                      onClick={() => {
                        setActiveTask(task.key);
                        setChartState(null);
                        setResultMeta(null);
                        setError('');
                        setInfo('');
                      }}
                      className={`flex-1 rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={18} className={active ? 'text-primary' : 'text-slate-400'} />
                        <span className={`text-sm font-bold ${active ? 'text-slate-900' : 'text-slate-600'}`}>{task.label}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{task.hint}</p>
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-semibold text-slate-700">
                  {info}
                </div>
              )}

              {/* 結果圖 */}
              <div className={CARD}>
                <div className={`${CARD_HEAD} flex items-center justify-between`}>
                  <h3 className={CARD_TITLE}>
                    <Activity size={18} className="text-primary" /> 結果視覺化
                  </h3>
                  {resultMeta && (
                    <div className="flex gap-4 text-[11px] font-bold text-slate-500">
                      {resultMeta.type === 'anomaly' && (
                        <>
                          <span>異常點：<span className="text-red-500">{resultMeta.n_anomalies}</span></span>
                          {Number.isFinite(Number(resultMeta.threshold)) && <span>threshold：{Number(resultMeta.threshold).toFixed(3)}</span>}
                        </>
                      )}
                      {resultMeta.type === 'changepoint' && <span>變點數：<span className="text-indigo-500">{resultMeta.n_changepoints}</span></span>}
                      {resultMeta.type === 'forecast' && <span>預測步數：{resultMeta.horizon}</span>}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <TimeseriesChart
                    mode={chartState?.mode || activeTask}
                    data={chartState?.series || displaySeries}
                    result={chartState?.result || null}
                    height={440}
                  />
                </div>
              </div>

              {/* 已存模型（用法 B） */}
              {effectiveMode === 'persist' && persistSupported && (
                <div className={CARD}>
                  <div className={`${CARD_HEAD} flex items-center justify-between`}>
                    <h3 className={CARD_TITLE}>
                      <Database size={18} className="text-primary" /> 已存模型（{activeTaskDef.label}）
                    </h3>
                    <button
                      type="button"
                      onClick={refreshModels}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      <RefreshCw size={14} className={modelsLoading ? 'animate-spin' : ''} /> 重新整理
                    </button>
                  </div>
                  <div className="p-4">
                    {savedModels.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-slate-400">尚無已存模型</p>
                    ) : (
                      <div className="space-y-2">
                        {savedModels.map((m) => {
                          const id = m.model_id || m.id || m._id;
                          return (
                            <div key={id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">{m.name || m.model_name || id}</p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {(m.model_key || m.model || '')}{id ? ` · ${id}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUseModel(id)}
                                  disabled={busy || !parsed}
                                  className="px-3 py-1.5 bg-primary hover:bg-primary-light disabled:opacity-50 text-white rounded-lg text-[11px] font-bold"
                                >
                                  {activeTask === 'anomaly' ? '偵測' : '預測'}
                                </button>
                                <a
                                  href={ts.getModelDownloadUrl(id)}
                                  download
                                  className="p-1.5 text-slate-400 hover:text-slate-700"
                                  title="下載 .pkl"
                                >
                                  <Download size={16} />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteModel(id)}
                                  disabled={busy}
                                  className="p-1.5 text-slate-300 hover:text-red-500"
                                  title="刪除"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer
          secondaryLabel="回匯入檔案"
          secondaryTo="/"
          primaryLabel="完成"
          primaryTo="/"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 錯誤訊息（§7-5）                                                     */
/* ------------------------------------------------------------------ */

function formatRunError(err) {
  const status = err?.status;
  const base = err?.message || '執行失敗';
  if (status === 501) {
    return `此為選配基礎模型，後端未安裝權重（501）。請改選其他模型。${base ? ` — ${base}` : ''}`;
  }
  if (status === 422) {
    return `請求格式錯誤（422）：${base}`;
  }
  if (status === 400) {
    return `參數錯誤（400）：${base}`;
  }
  return base;
}
