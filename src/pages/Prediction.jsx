import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileUp, FlaskConical } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import swal from 'sweetalert';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';
import predictionReferenceCsvUrl from '../../sample_data.csv?url';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '--';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createSelectedFile(file) {
  return {
    name: file.name,
    sizeLabel: formatFileSize(file.size)
  };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('檔案讀取失敗'));

    reader.readAsText(file);
  });
}

function parseCsvRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

function parsePredictionCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    throw new Error('CSV 內容不足。');
  }

  const header = rows[0];
  const normalizedHeader = header.map((cell) => cell.trim().toLowerCase());
  const labelIndex = normalizedHeader.indexOf('label');
  if (labelIndex === -1) {
    throw new Error('CSV 缺少 Label 欄位。');
  }

  const wavelengthMarkerIndex = normalizedHeader.indexOf('wavelength');
  const valueStartIndex = wavelengthMarkerIndex >= 0
    ? wavelengthMarkerIndex + 1
    : labelIndex + 1;

  if (valueStartIndex >= header.length) {
    throw new Error('CSV 缺少光譜數值欄位。');
  }

  const spectraByLabel = {};
  rows.slice(1).forEach((row) => {
    const label = row[labelIndex]?.trim();
    if (!label) {
      return;
    }

    const spectra = row
      .slice(valueStartIndex)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (spectra.length > 0) {
      spectraByLabel[label] = spectra;
    }
  });

  const whiteEntry = Object.entries(spectraByLabel).find(([label]) => label.toLowerCase() === 'white');
  if (!whiteEntry) {
    throw new Error('CSV 格式錯誤：Label 欄位必須包含 white 資料列。');
  }

  const sampleLabels = Object.keys(spectraByLabel).filter((label) => label.toLowerCase() !== 'white');
  if (sampleLabels.length === 0) {
    throw new Error('CSV 找不到可用的 sample 資料列。');
  }

  return {
    spectraByLabel,
    whiteLabel: whiteEntry[0],
    whiteSpectrum: whiteEntry[1],
    sampleLabels
  };
}

function formatPredictionResult(body) {
  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body, null, 2);
}

export default function Prediction() {
  const location = useLocation();
  const dataInputRef = useRef(null);
  const resultSectionRef = useRef(null);
  const routedFileName = location.state?.fileName ?? '';

  const [selectedModelName, setSelectedModelName] = useState('');
  const [modelNames, setModelNames] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [selectedDataFile, setSelectedDataFile] = useState(
    routedFileName
      ? {
          name: routedFileName,
          sizeLabel: '--'
        }
      : null
  );
  const [parsedCsv, setParsedCsv] = useState(null);
  const [selectedSampleLabel, setSelectedSampleLabel] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadModelNames = async () => {
      setIsLoadingModels(true);
      setModelsError('');

      try {
        const response = await fetch('/api/modeling/models/names/all', {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const names = Array.isArray(result?.model_names)
          ? result.model_names.filter((name) => typeof name === 'string' && name.trim() !== '')
          : [];

        if (!isMounted) {
          return;
        }

        setModelNames(names);
        setSelectedModelName((currentName) => currentName || names[0] || '');

        if (names.length === 0) {
          setModelsError('目前沒有可選擇的模型。');
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setModelNames([]);
        setSelectedModelName('');
        setModelsError('模型清單讀取失敗。');
      } finally {
        if (isMounted) {
          setIsLoadingModels(false);
        }
      }
    };

    loadModelNames();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetForm = () => {
    setSelectedDataFile(null);
    setParsedCsv(null);
    setSelectedSampleLabel('');
    setPredictionResult(null);
    if (dataInputRef.current) {
      dataInputRef.current.value = '';
    }
  };

  const openFilePicker = () => {
    dataInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const fileText = await readFileAsText(file);
      const nextParsedCsv = parsePredictionCsv(fileText);

      setSelectedDataFile(createSelectedFile(file));
      setParsedCsv(nextParsedCsv);
      setSelectedSampleLabel(nextParsedCsv.sampleLabels[0] || '');
    } catch (error) {
      setSelectedDataFile(null);
      setParsedCsv(null);
      setSelectedSampleLabel('');

      await swal(
        '檔案格式錯誤',
        error instanceof Error ? error.message : '請上傳可解析的 CSV 檔案。',
        'error'
      );
    }

    event.target.value = '';
  };

  const handleRunPrediction = async () => {
    if (
      !selectedDataFile ||
      !selectedModelName ||
      !parsedCsv?.whiteSpectrum?.length ||
      !selectedSampleLabel
    ) {
      await swal('資料不足', '請先選擇資料 CSV、樣本 label 與模型。', 'warning');
      return;
    }

    const sampleSpectrum = parsedCsv.spectraByLabel[selectedSampleLabel];
    if (!Array.isArray(sampleSpectrum) || sampleSpectrum.length === 0) {
      await swal('資料不足', `找不到樣本 ${selectedSampleLabel} 的光譜資料。`, 'warning');
      return;
    }

    if (parsedCsv.whiteSpectrum.length !== sampleSpectrum.length) {
      await swal('資料錯誤', 'White 與 sample 光譜長度不一致，無法送出預測。', 'error');
      return;
    }

    try {
      const response = await fetch('/api/modeling/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          model_name: selectedModelName,
          white: parsedCsv.whiteSpectrum,
          sample: sampleSpectrum
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

      if (!response.ok) {
        const detail = typeof body === 'string'
          ? body
          : body?.detail || body?.message || JSON.stringify(body);
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      setPredictionResult({
        modelName: selectedModelName,
        sampleLabel: selectedSampleLabel,
        fileName: selectedDataFile.name,
        content: formatPredictionResult(body)
      });

      requestAnimationFrame(() => {
        resultSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    } catch (error) {
      await swal(
        '預測失敗',
        error instanceof Error ? error.message : '呼叫預測 API 失敗。',
        'error'
      );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-display">
      <NavBar />

      <main className="flex-1 overflow-y-auto bg-white px-12 pb-32 pt-12">
        <div className="mx-auto max-w-6xl space-y-12">
          <header className="space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-extrabold tracking-tight text-[#111827]"
            >
              模型預測
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-500"
            >
              上傳光譜檔案並選擇模型，準備執行預測。
            </motion.p>
          </header>

          <section className="space-y-4">
            <input
              ref={dataInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="space-y-3">
              <motion.div
                whileHover={{ scale: 1.005 }}
                onClick={openFilePicker}
                className="group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center transition-all hover:border-[#82b091] hover:bg-[#82b091]/5"
              >
                <div className="relative z-10 flex flex-col items-center space-y-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-white text-[#82b091] shadow-sm transition-transform group-hover:scale-110">
                    <FileUp size={36} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[#111827]">點擊選擇資料 CSV</h3>
                    <p className="text-slate-400">
                      由 CSV 的 `Label` 欄位解析 White 與樣本光譜
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openFilePicker();
                      }}
                      className="rounded-xl bg-[#82b091] px-10 py-3 text-sm font-bold text-white shadow-lg shadow-[#82b091]/25 transition-all hover:bg-[#659475] active:scale-95"
                    >
                      選擇檔案
                    </button>
                    <a
                      href={predictionReferenceCsvUrl}
                      download="prediction_reference_format.csv"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#82b091]/30 bg-white px-6 py-3 text-sm font-bold text-[#4d7259] shadow-sm transition-all hover:border-[#82b091] hover:bg-[#82b091]/5 active:scale-95"
                    >
                      <Download size={16} />
                      參考格式
                    </a>
                  </div>
                </div>
              </motion.div>

              {selectedDataFile ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                  <p className="text-sm font-bold text-[#111827]">
                    {selectedDataFile.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    檔案大小: {selectedDataFile.sizeLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    White label: {parsedCsv?.whiteLabel || '--'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    可選樣本數: {parsedCsv?.sampleLabels?.length || 0}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#82b091]/10 p-2">
                <FlaskConical className="h-5 w-5 text-[#82b091]" />
              </div>
              <h3 className="text-2xl font-bold text-[#111827]">模型選擇</h3>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <label
                htmlFor="prediction-model-select"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                選擇模型名稱
              </label>

              <div className="relative">
                <select
                  id="prediction-model-select"
                  value={selectedModelName}
                  onChange={(event) => setSelectedModelName(event.target.value)}
                  disabled={isLoadingModels || modelNames.length === 0}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {isLoadingModels ? '模型載入中...' : '請選擇模型'}
                  </option>
                  {modelNames.map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {modelsError || `目前共載入 ${modelNames.length} 個模型名稱。`}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <label
                htmlFor="prediction-sample-select"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                選擇 sample label
              </label>

              <div className="relative">
                <select
                  id="prediction-sample-select"
                  value={selectedSampleLabel}
                  onChange={(event) => setSelectedSampleLabel(event.target.value)}
                  disabled={!parsedCsv?.sampleLabels?.length}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {parsedCsv?.sampleLabels?.length ? '請選擇 sample' : '請先上傳 CSV'}
                  </option>
                  {(parsedCsv?.sampleLabels || []).map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                `white` 會自動使用 Label=`{parsedCsv?.whiteLabel || 'White'}` 的資料列；`sample` 使用目前選取的 label。
              </p>
            </div>
          </section>

          {predictionResult ? (
            <section
              ref={resultSectionRef}
              className="space-y-5 rounded-[2rem] border border-[#82b091]/20 bg-gradient-to-br from-[#f7fbf8] via-white to-[#edf6f0] p-8 shadow-sm"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#82b091]">
                  Prediction Result
                </p>
                <h3 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                  預測完成
                </h3>
                <p className="text-sm text-slate-500">
                  模型 `{predictionResult.modelName}` 已完成對樣本 `{predictionResult.sampleLabel}` 的預測。
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    資料檔案
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#111827]">
                    {predictionResult.fileName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    使用模型
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#111827]">
                    {predictionResult.modelName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Sample Label
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#111827]">
                    {predictionResult.sampleLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-inner">

                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
                  {predictionResult.content}
                </pre>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <Footer
        primaryLabel="執行預測"
        onPrimaryClick={handleRunPrediction}
        primaryDisabled={
          !selectedDataFile ||
          !selectedModelName ||
          !parsedCsv?.whiteSpectrum?.length ||
          !selectedSampleLabel
        }
        secondaryLabel="清除"
        onSecondaryClick={resetForm}
      />
    </div>
  );
}
