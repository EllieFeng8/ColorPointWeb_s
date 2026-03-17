/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Waves,
  Cpu,
  LineChart,
  FileText,
  LogOut,
  ChevronRight,
  Bell,
  RotateCcw,
  Zap,
  FolderOpen,
  Settings2,
  Filter,
  Search,
  LayoutGrid,
  Download,
  CheckCircle2, BarChart3, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import NavBar from "@/src/components/NavBar.jsx";
import logoAeyeot from "@/src/image/onlyLogoW_big 3.png";

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
  const [baseline, setBaseline] = useState(true);
  const [snv, setSnv] = useState(true);
  const [sg, setSg] = useState(false);
  const [derivative, setDerivative] = useState(false);
  const [normalization, setNormalization] = useState(true);

  return (
      <div className="h-screen flex overflow-hidden font-display">
        {/* Sidebar */}
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-12 bg-white">
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
              <div className="flex gap-4">
                <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                  <RotateCcw size={18} /> 重置
                </button>
                <button className="px-8 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/30">
                  <Zap size={18} /> 套用設置
                </button>
              </div>
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
                      <select className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer">
                        <option>小麥蛋白質含量分析 (Batch-004)</option>
                        <option>玉米澱粉檢測 (Batch-001)</option>
                        <option>大豆含油量分析 (Batch-012)</option>
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
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">調整標準白 (Baseline)</span>
                        <Toggle checked={baseline} onChange={setBaseline} />
                      </div>

                      <div className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">SNV 變量校正</span>
                        <Toggle checked={snv} onChange={setSnv} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">SG 平滑處理 (Savitzky-Golay)</span>
                          <Toggle checked={sg} onChange={setSg} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pl-2">

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Order/Degree (次方)</label>
                            <input className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none" placeholder="2" type="number" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Derivative Processing (微分處理)</span>
                          <Toggle checked={derivative} onChange={setDerivative} />
                        </div>
                        <div className="pl-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Order (次方數)</label>
                            <input className="w-full bg-slate-50 border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary/20 outline-none" placeholder="1" type="number" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between group cursor-pointer">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">數據標準化</span>
                          <Toggle checked={normalization} onChange={setNormalization} />
                        </div>
                        <div className="pl-2 flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input defaultChecked name="norm_type" type="radio" className="w-4 h-4 text-primary border-slate-200 focus:ring-primary/20" />
                            <span className="text-xs font-semibold text-slate-600">Mean (平均值)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input name="norm_type" type="radio" className="w-4 h-4 text-primary border-slate-200 focus:ring-primary/20" />
                            <span className="text-xs font-semibold text-slate-600">Standard Deviation (標準差)</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Filter size={18} className="text-primary" /> 選波段 (NM)
                      </h3>
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          {['Manual Clipping', 'VIP', 'RF Importance', 'CARS'].map((tag, i) => (
                              <label key={tag} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                                <input defaultChecked={i === 0} type="checkbox" className="w-4 h-4 text-primary border-slate-200 rounded focus:ring-primary/20" />
                                <span className="text-[11px] font-bold text-slate-600 truncate">{tag}</span>
                              </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Visualization */}
              <div className="col-span-8 flex flex-col gap-8">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-subtle flex flex-col h-[600px] overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <LineChart size={18} className="text-primary" /> 光譜視覺化分析
                      </h3>
                      <div className="flex items-center gap-6 border-l border-slate-100 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-1 rounded-full bg-slate-200"></span>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">原始光譜</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(101,148,117,0.4)]"></span>
                          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">處理後光譜</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="size-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary/30 text-slate-400 hover:text-primary transition-all">
                        <Search size={18} />
                      </button>
                      <button className="size-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary/30 text-slate-400 hover:text-primary transition-all">
                        <LayoutGrid size={18} />
                      </button>
                      <button className="size-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary/30 text-slate-400 hover:text-primary transition-all">
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-8 relative flex flex-col">
                    <div className="flex-1 w-full bg-white rounded-2xl border border-slate-100 flex flex-col relative overflow-hidden">
                      <div className="absolute inset-0 p-10">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 400">
                          <g className="stroke-slate-50" strokeWidth="1">
                            <line x1="0" x2="1000" y1="0" y2="0" />
                            <line x1="0" x2="1000" y1="100" y2="100" />
                            <line x1="0" x2="1000" y1="200" y2="200" />
                            <line x1="0" x2="1000" y1="300" y2="300" />
                            <line x1="0" x2="1000" y1="400" y2="400" />
                          </g>
                          {/* Raw Spectrum (dashed) */}
                          <path
                              className="stroke-slate-200"
                              d="M0 350 Q 50 340, 100 345 T 200 320 T 300 280 T 400 310 T 500 200 T 600 250 T 700 150 T 800 200 T 900 120 T 1000 140"
                              fill="none"
                              strokeDasharray="6,4"
                              strokeWidth="2"
                          />
                          {/* Processed Spectrum */}
                          <path
                              className="stroke-primary"
                              d="M0 340 Q 50 330, 100 335 T 200 310 T 300 270 T 400 300 T 500 190 T 600 240 T 700 140 T 800 190 T 900 110 T 1000 130"
                              fill="none"
                              filter="drop-shadow(0px 4px 6px rgba(101,148,117,0.2))"
                              strokeLinecap="round"
                              strokeWidth="4"
                          />
                          {/* Indicator Line */}
                          <line className="stroke-primary/20" strokeWidth="2" x1="500" x2="500" y1="0" y2="400" />
                          <circle className="fill-white stroke-primary" cx="500" cy="190" r="6" strokeWidth="3" />
                        </svg>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute top-12 left-[52%] bg-white border border-slate-100 p-4 rounded-xl shadow-xl z-10 min-w-[140px]">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wavelength</p>
                        <p className="text-sm font-extrabold text-slate-800 mb-2">1250 nm</p>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-[10px] font-semibold text-slate-500">Raw</span>
                          <span className="text-xs font-bold text-slate-700">0.432</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] font-semibold text-primary">Processed</span>
                          <span className="text-xs font-bold text-primary">0.428</span>
                        </div>
                      </div>
                      <div className="absolute bottom-6 left-8">
                        <div className="bg-slate-50/80 backdrop-blur px-3 py-1 rounded-full border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Spectral Density Analysis</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Signal Noise', value: '42.8', unit: 'dB', color: 'bg-primary' },
                    { label: 'Mean Abs.', value: '0.824', unit: '', color: 'bg-blue-400' },
                    { label: 'Std. Dev.', value: '0.012', unit: '', color: 'bg-amber-400' },
                    { label: 'Samples', value: '128', unit: '', color: 'bg-indigo-400' },
                  ].map((metric) => (
                      <div key={metric.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-subtle flex flex-col justify-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <span className={`size-1.5 ${metric.color} rounded-full`}></span> {metric.label}
                        </p>
                        <p className="text-2xl font-black text-slate-800">
                          {metric.value} {metric.unit && <span className="text-xs font-bold text-slate-400">{metric.unit}</span>}
                        </p>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="h-10 bg-white border-t border-slate-100 px-10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">所有參數已保存</span>
              </div>
              <div className="h-3 w-px bg-slate-200"></div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">目前波段數量: 1204</span>
            </div>
            <div className="flex items-center gap-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <a className="hover:text-primary transition-colors" href="#">使用指南</a>
              <a className="hover:text-primary transition-colors" href="#">系統日誌</a>
              <span className="text-slate-300">Version 1.0.2 Stable</span>
            </div>
          </footer>
        </div>
      </div>
  );
}
