import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {BarChart3, FileText, User, CloudUpload, Trash2, CheckCircle2, Info} from 'lucide-react';
import Header from '../components/Header.jsx';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';
import logoAeyeot from "@/src/image/onlyLogoW_big 3.png";

export default function Home() {
  const [files, setFiles] = useState([
    {
      id: '1',
      name: 'sample_spectrum_01.csv',
      size: '2.4 MB',
      uploadTime: '2023-10-27 10:30',
      samples: 120,
      range: '400 - 2500 nm'
    }
  ]);

  const removeFile = (id) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  return (
    <div className="flex h-screen overflow-hidden font-display">
      <aside className="w-72 flex-shrink-0 border-r border-slate-100 bg-[#F9FAFB] flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#82b091] flex items-center justify-center shadow-lg shadow-[#82b091]/30 overflow-hidden">
              <img src={logoAeyeot} alt="AEYEOT" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="text-[24px] font-extrabold tracking-widest uppercase text-[#659475]">AEYEOT</h1>
              {/*<p className="text-[10px] text-[#659475] font-bold">DATA ANALYSIS PRO</p>*/}
            </div>
          </div>

          <NavBar />
        </div>

        <div className="mt-auto p-8 border-t border-slate-100">
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-50">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#111827] truncate">Lab Technician 01</p>
              <p className="text-[10px] text-slate-400 truncate">lab-01@inst.edu</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-white">
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
            <div className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-[#82b091]/10 text-[#659475] border border-[#82b091]/20">
              <Info size={14} />
              STEP 1 OF 4: DATA ACQUISITION
            </div>
          </header>

          <section>
            <motion.div
              whileHover={{ scale: 1.005 }}
              className="group relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl px-6 py-20 hover:border-[#82b091] hover:bg-[#82b091]/5 transition-all cursor-pointer"
            >
              <div className="relative flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#82b091] shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  <CloudUpload size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#111827]">拖放檔案至此處</h3>
                  <p className="text-slate-400">或點擊按鈕從您的電腦選取檔案</p>
                </div>
                <button className="bg-[#82b091] hover:bg-[#659475] text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#82b091]/25 transition-all active:scale-95">
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

          <Footer />
        </div>
      </main>
    </div>
  );
}
