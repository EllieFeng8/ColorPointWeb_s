import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileUp, FlaskConical } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import swal from 'sweetalert';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';

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

function convertJsonToArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value);
  }

  return [value];
}

function parseCsvToArray(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

export default function Prediction() {
  const location = useLocation();
  const standardWhiteInputRef = useRef(null);
  const dataInputRef = useRef(null);
  const routedFileName = location.state?.fileName ?? '';

  const [selectedModelName, setSelectedModelName] = useState('');
  const [modelNames, setModelNames] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [selectedStandardWhiteFile, setSelectedStandardWhiteFile] = useState(null);
  const [selectedDataFile, setSelectedDataFile] = useState(
    routedFileName
      ? {
          name: routedFileName,
          sizeLabel: '--'
        }
      : null
  );
  const [standardWhiteArray, setStandardWhiteArray] = useState([]);
  const [dataArray, setDataArray] = useState([]);

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
    setSelectedStandardWhiteFile(null);
    setSelectedDataFile(null);
    setStandardWhiteArray([]);
    setDataArray([]);
    if (standardWhiteInputRef.current) {
      standardWhiteInputRef.current.value = '';
    }
    if (dataInputRef.current) {
      dataInputRef.current.value = '';
    }
  };

  const openFilePicker = (type) => {
    if (type === 'standardWhite') {
      standardWhiteInputRef.current?.click();
      return;
    }

    dataInputRef.current?.click();
  };

  const handleFileChange = async (type, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const fileText = await readFileAsText(file);

      if (type === 'standardWhite') {
        const parsedJson = JSON.parse(fileText);
        setSelectedStandardWhiteFile(createSelectedFile(file));
        setStandardWhiteArray(convertJsonToArray(parsedJson));
      } else {
        setSelectedDataFile(createSelectedFile(file));
        setDataArray(parseCsvToArray(fileText));
      }
    } catch (error) {
      if (type === 'standardWhite') {
        setSelectedStandardWhiteFile(null);
        setStandardWhiteArray([]);
      } else {
        setSelectedDataFile(null);
        setDataArray([]);
      }

      await swal(
        '檔案格式錯誤',
        type === 'standardWhite' ? '請上傳可解析的 JSON 參數檔。' : '請上傳可解析的 CSV 檔案。',
        'error'
      );
    }

    event.target.value = '';
  };

  const handleRunPrediction = async () => {
    if (
      !selectedStandardWhiteFile ||
      !selectedDataFile ||
      !selectedModelName ||
      standardWhiteArray.length === 0 ||
      dataArray.length === 0
    ) {
      await swal('資料不足', '請先選擇標準白、資料 CSV 與模型。', 'warning');
      return;
    }

    await swal(
      '尚未串接預測 API',
      `已選擇 ${selectedModelName}，參數 array 筆數為 ${standardWhiteArray.length}，CSV array 筆數為 ${dataArray.length}。`,
      'info'
    );
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
              ref={standardWhiteInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => handleFileChange('standardWhite', event)}
            />
            <input
              ref={dataInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => handleFileChange('data', event)}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {[
                {
                  type: 'standardWhite',
                  title: '點擊選擇參數檔案',
                  description: '支援 .json 格式',
                  selectedFile: selectedStandardWhiteFile
                },
                {
                  type: 'data',
                  title: '點擊選擇資料 CSV',
                  description: '支援 .csv 資料格式',
                  selectedFile: selectedDataFile
                }
              ].map((uploadItem) => (
                <div key={uploadItem.type} className="space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    onClick={() => openFilePicker(uploadItem.type)}
                    className="group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center transition-all hover:border-[#82b091] hover:bg-[#82b091]/5"
                  >
                    <div className="relative z-10 flex flex-col items-center space-y-6">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-white text-[#82b091] shadow-sm transition-transform group-hover:scale-110">
                        <FileUp size={36} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-[#111827]">{uploadItem.title}</h3>
                        <p className="text-slate-400">{uploadItem.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openFilePicker(uploadItem.type);
                        }}
                        className="rounded-xl bg-[#82b091] px-10 py-3 text-sm font-bold text-white shadow-lg shadow-[#82b091]/25 transition-all hover:bg-[#659475] active:scale-95"
                      >
                        選擇檔案
                      </button>
                    </div>
                  </motion.div>

                  {uploadItem.selectedFile ? (
                    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                      <p className="text-sm font-bold text-[#111827]">
                        {uploadItem.selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        檔案大小: {uploadItem.selectedFile.sizeLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        陣列筆數:{' '}
                        {uploadItem.type === 'standardWhite'
                          ? standardWhiteArray.length
                          : dataArray.length}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
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
          </section>
        </div>
      </main>

      <Footer
        primaryLabel="執行預測"
        onPrimaryClick={handleRunPrediction}
        primaryDisabled={
          !selectedStandardWhiteFile ||
          !selectedDataFile ||
          !selectedModelName ||
          standardWhiteArray.length === 0 ||
          dataArray.length === 0
        }
        secondaryLabel="清除"
        onSecondaryClick={resetForm}
      />
    </div>
  );
}
