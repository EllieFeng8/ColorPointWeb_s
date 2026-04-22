/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  RotateCcw,
  Zap,
  FolderOpen,
  Settings2,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import NavBar from "@/src/components/NavBar.jsx";
import Footer from "@/src/components/Footer.jsx";
import SpectralChart from "@/src/components/SpectralChart.jsx";

function toNumberArray(values) {
  return Array.isArray(values) ? values.map((value) => Number(value)) : [];
}

function extractSpectralDataset(payload) {
  const source = payload ?? {};
  const wavelengths = toNumberArray(source?.wavelengths);
  const samples = Array.isArray(source?.data)
    ? source.data.map((sample, index) => ({
        label: sample?.label || `Sample ${index + 1}`,
        spectra: toNumberArray(sample?.spectra),
        components: sample?.components ?? {}
      }))
    : [];

  return {
    wavelengths,
    totalSamples: Number(source?.total_samples ?? samples.length),
    samples,
    componentOptions: Array.from(new Set(samples.flatMap((sample) => Object.keys(sample.components || {}))))
  };
}

function extractPreprocessingId(payload) {
  return (
    payload?.preprocessing_id ??
    payload?.preprocessingId ??
    payload?.id ??
    payload?.config?.id ??
    null
  );
}

function createEmptySpectralDataset() {
  return { wavelengths: [], totalSamples: 0, samples: [], componentOptions: [] };
}

function extractPreprocessingDataset(payload) {
  const source = payload ?? {};
  const wavelengths = toNumberArray(source?.wavelengths);
  const samples = Array.isArray(source?.data)
    ? source.data.map((sample, index) => ({
        label: sample?.label || `Sample ${index + 1}`,
        spectra: toNumberArray(sample?.spectra),
        components: sample?.components ?? {}
      }))
    : [];

  return {
    wavelengths,
    totalSamples: Number(source?.config?.result_samples_count ?? samples.length),
    samples,
    componentOptions: Array.from(new Set(samples.flatMap((sample) => Object.keys(sample.components || {}))))
  };
}

function normalizeUploadList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function getUploadRecordTimestamp(record) {
  const rawTimestamp =
    record?.uploaded_at ??
    record?.created_at ??
    record?.updated_at ??
    record?.timestamp ??
    null;

  if (!rawTimestamp) {
    return 0;
  }

  const parsed = new Date(rawTimestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getLatestUploadRecord(records) {
  return [...records].sort(
    (left, right) => getUploadRecordTimestamp(right) - getUploadRecordTimestamp(left)
  )[0] ?? null;
}

const Toggle = ({ checked, onChange }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
            checked ? 'bg-primary' : 'bg-slate-200'
        }`}
    >
    <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
        }`}
    />
    </button>
);

export default function Preprocessing() {
  const location = useLocation();
  const routedFileId = location.state?.fileId ?? '';
  const routedTaskCategory = location.state?.taskCategory ?? 'regression';
  const [baseline, setBaseline] = useState(true);
  const [snv, setSnv] = useState(true);
  const [sg, setSg] = useState(false);
  const [derivative, setDerivative] = useState(false);
  const [normalization, setNormalization] = useState(true);
  const [sgWindowSize, setSgWindowSize] = useState('11');
  const [sgPolynomialOrder, setSgPolynomialOrder] = useState('2');
  const [derivativeOrder, setDerivativeOrder] = useState('1');
  const [normalizationType, setNormalizationType] = useState('mean');
  const [wavelengthMethod, setWavelengthMethod] = useState('manual_clip');
  const [manualStart, setManualStart] = useState('900');
  const [manualEnd, setManualEnd] = useState('1698');
  const [vipThreshold, setVipThreshold] = useState('1.2');
  const [rfTopN, setRfTopN] = useState('20');
  const [carsIterations, setCarsIterations] = useState('20');
  const [carsKFold, setCarsKFold] = useState('3');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [componentOptions, setComponentOptions] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [chartVisibleSeries, setChartVisibleSeries] = useState('raw');
  const [preprocessingId, setPreprocessingId] = useState('');
  const [spectralDatasets, setSpectralDatasets] = useState({
    raw: createEmptySpectralDataset(),
    processed: createEmptySpectralDataset()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (routedFileId) {
      setSelectedFileId(routedFileId);
      return undefined;
    }

    const loadLatestUpload = async () => {
      try {
        const response = await fetch('/api/upload/', {
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`GET /api/upload/ failed with HTTP ${response.status}`);
        }

        const uploads = await response.json().catch(() => null);
        const latestUpload = getLatestUploadRecord(normalizeUploadList(uploads));
        const nextFileId = latestUpload?.id;

        console.log('[preprocessing] latest upload', {
          uploads,
          nextFileId
        });

        if (nextFileId) {
          setSelectedFileId(nextFileId);
        }
      } catch (error) {
        console.log('[preprocessing] latest upload error', error);
      }
    };

    loadLatestUpload();
    return undefined;
  }, [routedFileId]);

  useEffect(() => {
    const loadSpectralDatasets = async () => {
      if (!selectedFileId) {
        setComponentOptions([]);
        setSelectedComponent('');
        setChartVisibleSeries('raw');
        setPreprocessingId('');
        setSpectralDatasets({
          raw: createEmptySpectralDataset(),
          processed: createEmptySpectralDataset()
        });
        return;
      }

      try {
        const rawEndpoint = baseline
          ? `/api/upload/${selectedFileId}/absorbance`
          : `/api/upload/${selectedFileId}/preview`;
        const rawResponse = await fetch(rawEndpoint, {
          headers: {
            Accept: 'application/json'
          }
        });

        if (!rawResponse.ok) {
          throw new Error(`GET ${rawEndpoint} failed with HTTP ${rawResponse.status}`);
        }

        const rawPayload = await rawResponse.json().catch(() => null);

        const rawDataset = extractSpectralDataset(rawPayload);
        const nextComponents = rawDataset.componentOptions;

        console.log('[preprocessing] spectral datasets', {
          fileId: selectedFileId,
          baseline,
          rawEndpoint,
          rawDataset,
          nextComponents
        });

        setSpectralDatasets({
          raw: rawDataset,
          processed: createEmptySpectralDataset()
        });
        setChartVisibleSeries('raw');
        setComponentOptions(nextComponents);
        setSelectedComponent((current) =>
          nextComponents.includes(current) ? current : (nextComponents[0] || '')
        );
      } catch (error) {
        console.log('[preprocessing] spectral datasets error', error);
        setComponentOptions([]);
        setSelectedComponent('');
        setChartVisibleSeries('raw');
        setPreprocessingId('');
        setSpectralDatasets({
          raw: createEmptySpectralDataset(),
          processed: createEmptySpectralDataset()
        });
      }
    };

    loadSpectralDatasets();
  }, [selectedFileId, baseline]);

  const resetSettings = () => {
    setBaseline(true);
    setSnv(true);
    setSg(false);
    setDerivative(false);
    setNormalization(true);
    setSgWindowSize('11');
    setSgPolynomialOrder('2');
    setDerivativeOrder('1');
    setNormalizationType('mean');
    setWavelengthMethod('manual_clip');
    setManualStart('1000');
    setManualEnd('1500');
    setVipThreshold('1.2');
    setRfTopN('20');
    setCarsIterations('20');
    setCarsKFold('3');
    setPreprocessingId('');
    setSpectralDatasets((current) => ({
      ...current,
      processed: createEmptySpectralDataset()
    }));
    setChartVisibleSeries('raw');
    setSubmitError('');
  };

  useEffect(() => {
    setPreprocessingId('');
    setSpectralDatasets((current) => {
      if (
        current.processed.wavelengths.length === 0 &&
        current.processed.samples.length === 0 &&
        current.processed.componentOptions.length === 0
      ) {
        return current;
      }

      return {
        ...current,
        processed: createEmptySpectralDataset()
      };
    });
    setChartVisibleSeries((current) => current === 'processed' ? 'raw' : current);
  }, [
    selectedFileId,
    selectedComponent,
    baseline,
    snv,
    sg,
    derivative,
    normalization,
    sgWindowSize,
    sgPolynomialOrder,
    derivativeOrder,
    normalizationType,
    wavelengthMethod,
    manualStart,
    manualEnd,
    vipThreshold,
    rfTopN,
    carsIterations,
    carsKFold
  ]);

  const handleApplySettings = async () => {
    if (!selectedFileId) {
      setSubmitError('缺少 file_id，請先上傳檔案。');
      return;
    }

    if (!selectedComponent) {
      setSubmitError('缺少 component，請先選擇 component。');
      return;
    }

    if (wavelengthMethod === 'manual_clip') {
      const start = Number(manualStart);
      const end = Number(manualEnd);

      if (!manualStart || !manualEnd || Number.isNaN(start) || Number.isNaN(end)) {
        setSubmitError('Manual Clipping 需要填寫有效的 manual_start 與 manual_end。');
        return;
      }

      if (start >= end) {
        setSubmitError('manual_start 必須小於 manual_end。');
        return;
      }
    }

    if (wavelengthMethod === 'VIP') {
      const threshold = Number(vipThreshold);

      if (!vipThreshold || Number.isNaN(threshold)) {
        setSubmitError('VIP 需要填寫有效的 vip_threshold。');
        return;
      }
    }

    if (wavelengthMethod === 'RF_Feature_Importance') {
      const topN = Number(rfTopN);

      if (!rfTopN || Number.isNaN(topN) || !Number.isInteger(topN)) {
        setSubmitError('RF Feature Importance 需要填寫有效的整數 top_n。');
        return;
      }

      if (topN < 1 || topN > 20) {
        setSubmitError('RF Feature Importance 的 top_n 只能介於 1 到 20。');
        return;
      }
    }

    const methods = {};

    if (baseline) {
      methods.standard_white = true;
    }

    if (snv) {
      methods.snv = true;
    }

    if (sg) {
      methods.sg = {
        window_size: Number(sgWindowSize),
        polynomial_order: Number(sgPolynomialOrder)
      };
    }

    if (derivative) {
      methods.derivative = {
        order: Number(derivativeOrder)
      };
    }

    if (normalization) {
      methods.normalization = {
        type: normalizationType
      };
    }

    methods.wavelength_selection = {
      method: wavelengthMethod
    };

    if (wavelengthMethod === 'manual_clip') {
      methods.wavelength_selection.manual_start = Number(manualStart);
      methods.wavelength_selection.manual_end = Number(manualEnd);
    }

    if (wavelengthMethod === 'VIP') {
      methods.wavelength_selection.vip_threshold = Number(vipThreshold);
    }

    if (wavelengthMethod === 'RF_Feature_Importance') {
      methods.wavelength_selection.top_n = Number(rfTopN);
    }

    if (wavelengthMethod === 'CARS') {
      methods.wavelength_selection.n_iters = Number(carsIterations);
      methods.wavelength_selection.k_fold = Number(carsKFold);
    }

    const payload = {
      file_id: selectedFileId,
      component: selectedComponent,
      methods
    };

    console.log('[preprocessing] current state', {
      selectedFileId,
      selectedComponent,
      baseline,
      snv,
      sg,
      sgWindowSize,
      sgPolynomialOrder,
      derivative,
      derivativeOrder,
      normalization,
      normalizationType,
      wavelengthMethod,
      manualStart,
      manualEnd,
      vipThreshold,
      rfTopN,
      carsIterations,
      carsKFold
    });
    console.log('[preprocessing] payload keys', {
      rootKeys: Object.keys(payload),
      methodKeys: Object.keys(payload.methods),
      sgKeys: payload.methods.sg ? Object.keys(payload.methods.sg) : [],
      derivativeKeys: payload.methods.derivative ? Object.keys(payload.methods.derivative) : [],
      normalizationKeys: payload.methods.normalization ? Object.keys(payload.methods.normalization) : [],
      wavelengthSelectionKeys: payload.methods.wavelength_selection
        ? Object.keys(payload.methods.wavelength_selection)
        : []
    });
    console.log('[preprocessing] execute payload', payload);
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/preprocessing/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseContentType = response.headers.get('content-type') || '';
      const responseBody = responseContentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

      console.log('[preprocessing] execute response', {
        status: response.status,
        ok: response.ok,
        fileId: selectedFileId,
        component: selectedComponent,
        body: responseBody
      });

      if (!response.ok) {
        const detail = typeof responseBody === 'string'
          ? responseBody
          : responseBody?.detail || responseBody?.message || JSON.stringify(responseBody);
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      const nextPreprocessingId = extractPreprocessingId(responseBody);
      if (!nextPreprocessingId) {
        throw new Error('前處理回應缺少 preprocessing_id');
      }

      setPreprocessingId(nextPreprocessingId);
    } catch (error) {
      console.log('[preprocessing] execute error', error);
      setSubmitError(error instanceof Error ? error.message : '套用設置失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!preprocessingId) {
      return undefined;
    }

    let isActive = true;
    let pollTimeoutId = null;

    const loadPreprocessingResult = async () => {
      try {
        const response = await fetch(`/api/preprocessing/${preprocessingId}`, {
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`GET /api/preprocessing/${preprocessingId} failed with HTTP ${response.status}`);
        }

        const payload = await response.json().catch(() => null);
        if (!isActive) {
          return;
        }

        const status = payload?.config?.status ?? payload?.status ?? '';
        console.log('[preprocessing] result payload', {
          preprocessingId,
          status,
          payload
        });

        if (status === 'running' || status === 'pending') {
          pollTimeoutId = window.setTimeout(loadPreprocessingResult, 1200);
          return;
        }

        if (status && status !== 'completed') {
          throw new Error(`前處理狀態異常: ${status}`);
        }

        const processedDataset = extractPreprocessingDataset(payload);
        const nextComponents = Array.from(new Set([
          ...spectralDatasets.raw.componentOptions,
          ...processedDataset.componentOptions
        ]));

        setSpectralDatasets((current) => ({
          ...current,
          processed: processedDataset
        }));
        setChartVisibleSeries('processed');
        setComponentOptions(nextComponents);
        setSelectedComponent((current) =>
          nextComponents.includes(current) ? current : (nextComponents[0] || '')
        );
      } catch (error) {
        console.log('[preprocessing] result load error', error);
        if (isActive) {
          setSubmitError(error instanceof Error ? error.message : '取得前處理結果失敗');
        }
      }
    };

    loadPreprocessingResult();

    return () => {
      isActive = false;
      if (pollTimeoutId) {
        window.clearTimeout(pollTimeoutId);
      }
    };
  }, [preprocessingId, spectralDatasets.raw.componentOptions]);

  const rawSamples = selectedComponent
    ? spectralDatasets.raw.samples
      .filter((sample) => sample.components?.[selectedComponent] !== undefined)
      .map((sample) => ({
        ...sample,
        componentsValue: sample.components?.[selectedComponent]
      }))
    : [];
  const processedSamples = selectedComponent
    ? spectralDatasets.processed.samples
      .filter((sample) => sample.components?.[selectedComponent] !== undefined)
      .map((sample) => ({
        ...sample,
        componentsValue: sample.components?.[selectedComponent]
      }))
    : [];
  const spectralSummaries = [
    {
      key: 'raw',
      title: '原始光譜',
      labelCount: rawSamples.length,
      component: selectedComponent || '--',
      wavelengthCount: spectralDatasets.raw.wavelengths.length
    },
    {
      key: 'processed',
      title: '前處理結果',
      labelCount: processedSamples.length,
      component: selectedComponent || '--',
      wavelengthCount: spectralDatasets.processed.wavelengths.length
    }
  ];
  const canProceedToModelSet = Boolean(preprocessingId) && spectralDatasets.processed.wavelengths.length > 0;

  return (
      <div className="h-screen flex overflow-hidden font-display">
        <NavBar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto bg-white px-12 pt-12 pb-32">
            <div className="flex justify-between items-end ">
              <header className="flex justify-between items-start mb-12">
                <div className="space-y-2">
                  <motion.h2
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-4xl font-extrabold tracking-tight text-[#111827]"
                  >
                    光譜前處理
                  </motion.h2>
                  <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-slate-500 text-lg"
                  >
                    調整算法與參數以優化數據特徵品質</motion.p>
                </div>
              </header>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Left Column Controls */}
              <div className="col-span-4 space-y-8">
                {/* Dataset Selection */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-subtle overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FolderOpen size={18} className="text-primary" />
                      數據集選擇
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="relative">
                      <select
                        value={selectedComponent}
                        onChange={(event) => setSelectedComponent(event.target.value)}
                        className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                      >
                        {componentOptions.length === 0 && (
                          <option value="">暫無 components 資料</option>
                        )}
                        {componentOptions.map((component) => (
                          <option key={component} value={component}>
                            {component}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                        <ChevronRight size={20} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preprocessing Algorithms */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-subtle">
                  <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Settings2 size={18} className="text-primary" />
                      預處理演算法
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">調整標準白</span>
                        <Toggle checked={baseline} onChange={setBaseline} />
                      </div>

                      <div className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">SNV 變量校正</span>
                        <Toggle checked={snv} onChange={setSnv} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">SG 平滑處理</span>
                          <Toggle checked={sg} onChange={setSg} />
                        </div>
                        {sg && (
                          <div className="grid grid-cols-2 gap-3 pl-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Window size</label>
                                <span className="text-[10px] font-medium text-amber-500">1&lt;window size&lt;=21</span>
                              </div>
                              <input
                                value={sgWindowSize}
                                onChange={(event) => setSgWindowSize(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="2"
                                type="number"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">次方</label>
                                <span className="text-[10px] font-medium text-amber-500">0&lt;次方&lt;=5</span>
                              </div>
                              <input
                                value={sgPolynomialOrder}
                                onChange={(event) => setSgPolynomialOrder(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="2"
                                type="number"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">微分處理</span>
                          <Toggle checked={derivative} onChange={setDerivative} />
                        </div>
                        {derivative && (
                          <div className="pl-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">次方</label>
                              <input
                                value={derivativeOrder}
                                onChange={(event) => setDerivativeOrder(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="1"
                                type="number"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">數據標準化</span>
                          <Toggle checked={normalization} onChange={setNormalization} />
                        </div>
                        {normalization && (
                          <div className="pl-2 flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                checked={normalizationType === 'mean'}
                                onChange={() => setNormalizationType('mean')}
                                name="norm_type"
                                type="radio"
                                className="w-4 h-4 text-primary border-slate-200 focus:ring-primary/20"
                              />
                              <span className="text-xs font-semibold text-slate-600">平均值</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                checked={normalizationType === 'z-score'}
                                onChange={() => setNormalizationType('z-score')}
                                name="norm_type"
                                type="radio"
                                className="w-4 h-4 text-primary border-slate-200 focus:ring-primary/20"
                              />
                              <span className="text-xs font-semibold text-slate-600">標準差</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Filter size={18} className="text-primary" /> 選波段 (NM)
                      </h3>
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          {[
                            { label: 'Manual Clipping', value: 'manual_clip' },
                            { label: 'VIP', value: 'VIP' },
                            { label: 'RF Importance', value: 'RF_Feature_Importance' },
                            { label: 'CARS', value: 'CARS' }
                          ].map((tag) => (
                              <label key={tag.value} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                                <input
                                  checked={wavelengthMethod === tag.value}
                                  onChange={() => setWavelengthMethod(tag.value)}
                                  type="radio"
                                  name="wavelength_method"
                                  className="w-4 h-4 text-primary border-slate-200 focus:ring-primary/20"
                                />
                                <span className="text-[11px] font-bold text-slate-600 truncate">{tag.label}</span>
                              </label>
                          ))}
                        </div>
                        {wavelengthMethod === 'CARS' && (
                          <div className="grid grid-cols-2 gap-3 pl-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">n_iters</label>
                              <input
                                value={carsIterations}
                                onChange={(event) => setCarsIterations(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="10"
                                type="number"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">k_fold</label>
                              <input
                                value={carsKFold}
                                onChange={(event) => setCarsKFold(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="3"
                                type="number"
                              />
                            </div>
                          </div>
                        )}
                        {wavelengthMethod === 'VIP' && (
                          <div className="pl-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">vip_threshold</label>
                              <input
                                value={vipThreshold}
                                onChange={(event) => setVipThreshold(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="1.2"
                                type="number"
                                step="any"
                              />
                            </div>
                          </div>
                        )}
                        {wavelengthMethod === 'RF_Feature_Importance' && (
                          <div className="pl-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">top_n</label>
                                <span className="text-[10px] font-semibold text-amber-600">上限 20</span>
                              </div>
                              <input
                                value={rfTopN}
                                onChange={(event) => setRfTopN(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="20"
                                type="number"
                                min="1"
                                max="20"
                                step="1"
                              />
                            </div>
                          </div>
                        )}
                        {wavelengthMethod === 'manual_clip' && (
                          <div className="grid grid-cols-2 gap-3 pl-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">manual_start</label>
                              <input
                                value={manualStart}
                                onChange={(event) => setManualStart(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="900"
                                type="number"
                                step="any"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">manual_end</label>
                              <input
                                value={manualEnd}
                                onChange={(event) => setManualEnd(event.target.value)}
                                className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none"
                                placeholder="1698"
                                type="number"
                                step="any"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
                <div className="flex gap-4">
                  {/*<button*/}
                  {/*  type="button"*/}
                  {/*  onClick={resetSettings}*/}
                  {/*  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"*/}
                  {/*>*/}
                  {/*  <RotateCcw size={18} /> 重置*/}
                  {/*</button>*/}
                  <button
                    type="button"
                    onClick={handleApplySettings}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/30"
                  >
                    <Zap size={18} /> {isSubmitting ? '套用中...' : '套用設置'}
                  </button>
                </div>
                {submitError && (
                  <p className="text-sm font-semibold text-red-600">{submitError}</p>
                )}
              </div>

              {/* Right Column Visualization */}
              <div className="col-span-8 flex flex-col gap-8">
                <SpectralChart
                  rawSeries={{
                    wavelengths: spectralDatasets.raw.wavelengths,
                    samples: rawSamples
                  }}
                  processedSeries={{
                    wavelengths: spectralDatasets.processed.wavelengths,
                    samples: processedSamples
                  }}
                  selectedComponent={selectedComponent}
                  visibleSeries={chartVisibleSeries}
                  onVisibleSeriesChange={setChartVisibleSeries}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {spectralSummaries.map((summary) => (
                    <div
                      key={summary.key}
                      className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-subtle"
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        {summary.title}
                      </p>
                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-900">Label 數量：</span>
                          {summary.labelCount}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Component：</span>
                          {summary.component}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">wavelengths：</span>
                          {summary.wavelengthCount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>

            <Footer
              primaryLabel="下一步：模型設定"
              primaryTo="/modelSet"
              primaryDisabled={!canProceedToModelSet}
              primaryState={{
              preprocessingId,
              fileId: selectedFileId,
              component: selectedComponent,
              wavelengthsLength: spectralDatasets.processed.wavelengths.length,
              taskCategory: routedTaskCategory
            }}
            secondaryLabel="上一步"
            secondaryTo="/"
            secondaryState={{
              fileId: selectedFileId,
              taskCategory: routedTaskCategory
            }}
          />
        </div>
      </div>
  );
}
