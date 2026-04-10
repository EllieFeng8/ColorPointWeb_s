import React, { useRef, useState } from 'react';
import { FileUp, Filter, FlaskConical, Search, Sprout, Waves } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import swal from 'sweetalert';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';

const MODELS = [
  {
    id: 1,
    title: 'Soil Organic Carbon Model v1.0',
    description: 'Optimized for high-clay content soils in temperate climates. High sensitivity to organic matter signatures.',
    r2: '0.985',
    rmse: '0.02',
    tag: 'Verified',
    icon: Sprout,
    colorClassName: 'bg-emerald-50 text-emerald-600'
  },
  {
    id: 2,
    title: 'Nitrogen Content Model v2.1',
    description: 'Precision nitrogen detection utilizing broad-spectrum normalization techniques for foliage and soil.',
    r2: '0.942',
    rmse: '0.11',
    tag: 'Public',
    icon: FlaskConical,
    colorClassName: 'bg-rose-50 text-rose-600'
  },
  {
    id: 3,
    title: 'Moisture Level Calibration v3.4',
    description: 'Standard industrial moisture prediction for raw granular samples. Real-time temperature compensation enabled.',
    r2: '0.991',
    rmse: '0.005',
    tag: 'Selected',
    icon: Waves,
    colorClassName: 'bg-blue-50 text-blue-600'
  }
];

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

export default function Prediction() {
  const location = useLocation();
  const standardWhiteInputRef = useRef(null);
  const dataInputRef = useRef(null);
  const routedFileName = location.state?.fileName ?? '';

  const [selectedModelId, setSelectedModelId] = useState(3);
  const [selectedStandardWhiteFile, setSelectedStandardWhiteFile] = useState(null);
  const [selectedDataFile, setSelectedDataFile] = useState(
    routedFileName
      ? {
          name: routedFileName,
          sizeLabel: '--'
        }
      : null
  );

  const selectedModel = MODELS.find((model) => model.id === selectedModelId) ?? null;

  const resetForm = () => {
    setSelectedStandardWhiteFile(null);
    setSelectedDataFile(null);
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

  const handleFileChange = (type, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (type === 'standardWhite') {
      setSelectedStandardWhiteFile(createSelectedFile(file));
    } else {
      setSelectedDataFile(createSelectedFile(file));
    }
    event.target.value = '';
  };

  const handleRunPrediction = async () => {
    if (!selectedStandardWhiteFile || !selectedDataFile || !selectedModel) {
      await swal('資料不足', '請先選擇標準白、資料 CSV 與模型。', 'warning');
      return;
    }

    await swal(
      '尚未串接預測 API',
      `已選擇 ${selectedModel.title}，標準白為 ${selectedStandardWhiteFile.name}，資料 CSV 為 ${selectedDataFile.name}。`,
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
              accept=".csv,.spc,.txt,text/plain,text/csv"
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
                  title: '點擊選擇標準白檔案',
                  description: '支援 .csv、.spc、.txt 標準白光譜格式',
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
                        className="rounded-xl bg-[#82b091] px-10 py-3 text-sm font-bold text-white shadow-lg shadow-[#82b091]/25 transition-all active:scale-95 hover:bg-[#659475]"
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
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#82b091]/10 p-2">
                  <FlaskConical className="h-5 w-5 text-[#82b091]" />
                </div>
                <h3 className="text-2xl font-bold text-[#111827]">模型選擇</h3>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200"
                >
                  <Filter className="h-5 w-5" />
                </button>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜尋模型..."
                    className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#82b091] focus:ring-1 focus:ring-[#82b091]"
                  />
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {MODELS.map((model) => {
                const Icon = model.icon;
                const isSelected = selectedModelId === model.id;

                return (
                  <motion.div
                    key={model.id}
                    whileHover={{ y: -4 }}
                    className={`rounded-2xl border bg-white p-6 transition-all ${
                      isSelected
                        ? 'border-transparent ring-2 ring-[#82b091] shadow-xl'
                        : 'border-slate-200 shadow-sm hover:border-[#82b091]/30'
                    }`}
                  >
                    <div className="mb-6 flex items-start justify-between">
                      <div className={`rounded-xl p-3 ${model.colorClassName}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#82b091]">
                          <span className="h-2 w-2 rounded-full bg-[#82b091]" />
                          Selected
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {model.tag}
                        </span>
                      )}
                    </div>

                    <h4 className="mb-2 font-bold leading-tight text-[#111827]">{model.title}</h4>
                    <p className="mb-8 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {model.description}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                      <div className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
                        R²: {model.r2} | RMSE: {model.rmse}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedModelId(model.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[#82b091] text-white shadow-md'
                            : 'bg-[#82b091]/10 text-[#659475] hover:bg-[#82b091]/20'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer
        primaryLabel="執行預測"
        onPrimaryClick={handleRunPrediction}
        primaryDisabled={!selectedStandardWhiteFile || !selectedDataFile || !selectedModel}
        secondaryLabel="清除"
        onSecondaryClick={resetForm}
      />
    </div>
  );
}
