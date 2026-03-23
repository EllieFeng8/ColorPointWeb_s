import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, CloudUpload, Trash2, CheckCircle2 } from 'lucide-react';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';

const initialFiles = [];

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadTime(timestamp) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp));
}

function mapFilesToRows(fileList) {
  return Array.from(fileList).map((file) => ({
    id: `${file.name}-${file.lastModified}-${file.size}`,
    name: file.name,
    size: formatFileSize(file.size),
    uploadTime: formatUploadTime(file.lastModified || Date.now()),
    samples: '--',
    range: '待分析'
  }));
}

export default function Home() {
  const [files, setFiles] = useState(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = (fileList) => {
    const nextFiles = mapFilesToRows(fileList);

    setFiles((prevFiles) => {
      const existingIds = new Set(prevFiles.map((file) => file.id));
      return [...prevFiles, ...nextFiles.filter((file) => !existingIds.has(file.id))];
    });
  };

  const removeFile = (id) => {
    setFiles((currentFiles) => currentFiles.filter((file) => file.id !== id));
  };

  const resetForm = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const { files: selectedFiles } = event.target;
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    addFiles(selectedFiles);
    event.target.value = '';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = event.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) {
      return;
    }

    addFiles(droppedFiles);
  };

  return (
    <div className="flex h-screen overflow-hidden font-display">
      <NavBar />

      <main className="flex-1 overflow-y-auto bg-white px-12 pt-12 pb-32">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex justify-between items-start">
            <div className="space-y-2">
              <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-extrabold tracking-tight text-[#111827]"
              >
                匯入光譜檔案
              </motion.h2>
              <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-slate-500 text-lg"
              >
                請上傳或拖放您的光譜數據檔案（支持 .csv, .spc, .jdx 格式）
              </motion.p>
            </div>
          </header>

          <section>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.spc,.jdx"
              className="hidden"
              onChange={handleFileChange}
            />
            <motion.div
              whileHover={{ scale: 1.005 }}
              onClick={openFilePicker}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-20 transition-all cursor-pointer ${
                isDragging
                  ? 'border-[#82b091] bg-[#82b091]/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-[#82b091] hover:bg-[#82b091]/5'
              }`}
            >
              <div className="relative flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#82b091] shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  <CloudUpload size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#111827]">拖放檔案至此處</h3>
                  <p className="text-slate-400">或點擊按鈕從您的電腦選取檔案</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openFilePicker();
                  }}
                  className="bg-[#82b091] hover:bg-[#659475] text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#82b091]/25 transition-all active:scale-95"
                >
                  選擇檔案
                </button>
              </div>
            </motion.div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold flex items-center gap-3 text-[#111827]">
                <div className="w-8 h-8 rounded-lg bg-[#82b091]/10 flex items-center justify-center text-[#82b091]">
                  <FileText size={20} />
                </div>
                已選擇的檔案資訊
              </h3>
              <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#82b091]" />
                {files.length} 個檔案已就緒
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">檔名</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">檔案大小</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">上傳時間</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">樣本數</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500 text-center">光譜範圍</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence>
                      {files.map((file) => (
                        <motion.tr
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded bg-[#82b091]/10 flex items-center justify-center text-[#82b091]">
                                <FileText size={16} />
                              </div>
                              <span className="text-sm font-bold text-[#111827]">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{file.size}</td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{file.uploadTime}</td>
                          <td className="px-8 py-5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#82b091]/10 text-[#659475] border border-[#82b091]/10">
                              {file.samples} Samples
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">
                              {file.range}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {files.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-8 py-12 text-center text-slate-400 italic">
                          尚未選擇任何檔案
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <Footer
            primaryLabel="下一步：前處理"
            primaryTo="/preprocessing"
            secondaryLabel="取消"
            onSecondaryClick={resetForm}
          />
        </div>
      </main>
    </div>
  );
}
