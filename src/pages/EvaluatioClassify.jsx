import React, { useState } from 'react';
import { Download, Tag, Info, History, ExternalLink } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Line,
  ZAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import NavBar from '@/src/components/NavBar.jsx';
import Header from "@/src/components/Header.jsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const trainingData = [
  { name: 'A', value: 40 },
  { name: 'B', value: 60 },
  { name: 'C', value: 85 },
  { name: 'D', value: 98 },
  { name: 'E', value: 75 },
];

const testingData = [
  { x: 10, y: 10 },
  { x: 16, y: 20 },
  { x: 24, y: 14 },
  { x: 30, y: 28 },
  { x: 40, y: 36 },
  { x: 48, y: 32 },
  { x: 60, y: 48 },
  { x: 72, y: 54 },
  { x: 80, y: 68 },
  { x: 96, y: 80 },
];

function toCsv(rows) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadCsv(filename, rows) {
  const csvContent = `\uFEFF${toCsv(rows)}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function saveCsv(filename, rows) {
  const csvContent = `\uFEFF${toCsv(rows)}`;

  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'CSV Files',
          accept: {
            'text/csv': ['.csv']
          }
        }
      ]
    });

    const writable = await handle.createWritable();
    await writable.write(csvContent);
    await writable.close();
    return;
  }

  downloadCsv(filename, rows);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function saveFile(filename, content, mimeType, types) {
  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types
    });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return;
  }

  downloadFile(filename, content, mimeType);
}

const SidebarItem = ({ icon: Icon, label, active = false }) => (
  <a
    href="#"
    className={cn(
      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group',
      active
        ? 'bg-primary/10 text-primary border-r-4 border-primary rounded-r-none'
        : 'text-slate-600 hover:bg-slate-100'
    )}
  >
    <Icon className={cn('size-5', active ? 'text-primary' : 'text-slate-400 group-hover:text-primary')} />
    <span className={cn('text-sm', active ? 'font-bold' : 'font-medium')}>{label}</span>
  </a>
);

const MetricCard = ({ label, value, isPrimary = false }) => (
  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{label}</p>
    <p className={cn('text-lg font-bold', isPrimary ? 'text-primary' : 'text-slate-700')}>{value}</p>
  </div>
);

export default function EvaluatioClassify() {
  const [fileName, setFileName] = useState('Spectro_Model_Alpha');
  const [version, setVersion] = useState('v2.1.0');
  const [notes, setNotes] = useState('');

  const handleTrainingExport = async () => {
    const rows = [
      ['sample', 'value'],
      ...trainingData.map(({ name, value }) => [name, value])
    ];

    try {
      await saveCsv('training-results.csv', rows);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        downloadCsv('training-results.csv', rows);
      }
    }
  };

  const handleTestingExport = async () => {
    const rows = [
      ['predicted', 'actual'],
      ...testingData.map(({ x, y }) => [x, y])
    ];

    try {
      await saveCsv('testing-results.csv', rows);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        downloadCsv('testing-results.csv', rows);
      }
    }
  };

  const handleModelExport = async () => {
    const exportPayload = {
      fileName,
      version,
      notes,
      metrics: {
        training: {
          r2: 0.985,
          rmse: 0.042,
          rpd: 5.24
        },
        testing: {
          r2: 0.942,
          rmse: 0.058,
          rpd: 4.18
        }
      },
      trainingData,
      testingData,
      exportedAt: new Date().toISOString()
    };

    const content = JSON.stringify(exportPayload, null, 2);
    const safeName = (fileName || 'model-export').trim().replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${safeName || 'model-export'}-${version || 'v1.0.0'}.json`;

    try {
      await saveFile(filename, content, 'application/json;charset=utf-8;', [
        {
          description: 'JSON Files',
          accept: {
            'application/json': ['.json']
          }
        }
      ]);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        downloadFile(filename, content, 'application/json;charset=utf-8;');
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light">
      <NavBar />

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-[1440px] mx-auto">
            <header className="flex justify-between items-start mb-12">
              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-extrabold tracking-tight text-[#111827]"
                >
                  評估分析
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-slate-500 text-lg"
                >
                  模型性能評估與結果匯出
                </motion.p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">訓練結果 (Training Results)</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">樣本總數: 1,240</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTrainingExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold transition-colors border border-slate-200"
                  >
                    <Download className="size-3.5" />
                    CSV 匯出
                  </button>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trainingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar dataKey="value" fill="#659475" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="R²" value="0.985" isPrimary />
                  <MetricCard label="RMSE" value="0.042" />
                  <MetricCard label="RPD" value="5.24" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">測試結果 (Testing Results)</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">獨立驗證集: 310</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestingExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold transition-colors border border-slate-200"
                  >
                    <Download className="size-3.5" />
                    CSV 匯出
                  </button>
                </div>

                <div className="h-48 w-full bg-slate-50/30 border border-slate-100 rounded overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" dataKey="x" hide />
                      <YAxis type="number" dataKey="y" hide />
                      <ZAxis type="number" range={[50, 50]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Testing" data={testingData} fill="#659475" opacity={0.6} />
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke="#659475"
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                        strokeOpacity={0.4}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="R²" value="0.942" isPrimary />
                  <MetricCard label="RMSE" value="0.058" />
                  <MetricCard label="RPD" value="4.18" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-full"
              >
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800">模型匯出 (Model Export)</h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                    配置並匯出最終預測模型
                  </p>
                </div>

                <form
                  className="flex-1 flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleModelExport();
                  }}
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      文件名字 (File Name)
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      版本號 (Version)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        className="w-full pl-10 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      備註 (Notes)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="描述模型的主要更動與測試條件..."
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all mt-4 active:scale-[0.98]"
                  >
                    <ExternalLink className="size-5" />
                    匯出 (Export)
                  </button>
                </form>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-6 pb-4 mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-4"
              >
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Info className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-primary text-sm uppercase tracking-tight">系統提示</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                    匯出的模型將包含所有預處理步驟與權重。建議在匯出前再次檢查測試結果是否符合生產標準。
                  </p>
                </div>
              </motion.div>


            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
