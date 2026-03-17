import { ListFilter, SlidersHorizontal, Filter } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

export default function PreprocessingControls() {
    const [methods, setMethods] = useState([
        { id: 'baseline', label: '調整標準白 (Baseline)', enabled: true },
        { id: 'snv', label: 'SNV 變量校正', enabled: true },
        { id: 'sg', label: 'SG 平滑處理', enabled: false },
        { id: 'derivative', label: '一階微分處理', enabled: false },
        { id: 'normalization', label: '數據標準化', enabled: true },
    ]);

    const toggleMethod = (id) => {
        setMethods(methods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
    };

    return (
        <div className="w-80 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
            {/* Project Selection */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ListFilter className="text-primary size-4" /> 項目選擇
                </h3>
                <div className="relative">
                    <select className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer">
                        <option>小麥蛋白質含量分析 (Batch-004)</option>
                        <option>玉米澱粉檢測 (Batch-001)</option>
                        <option>大豆含油量分析 (Batch-012)</option>
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                        <SlidersHorizontal className="size-4" />
                    </div>
                </div>
            </div>

            {/* Preprocessing Methods */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <SlidersHorizontal className="text-primary size-4" /> 預處理方法
                </h3>
                <div className="space-y-4">
                    {methods.map((method) => (
                        <label
                            key={method.id}
                            className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                {method.label}
              </span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={method.enabled}
                                    onChange={() => toggleMethod(method.id)}
                                />
                                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Wavelength Range */}
                <div className="mt-10 pt-8 border-t border-slate-50">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <Filter className="text-primary size-4" /> 選波段 (nm)
                    </h3>
                    <div className="px-2">
                        <div className="relative h-6 flex items-center">
                            <div className="absolute w-full h-2 bg-slate-100 rounded-full"></div>
                            <div className="absolute left-[20%] right-[30%] h-2 bg-primary/40 rounded-full"></div>
                            <div className="absolute left-[20%] size-5 bg-white border-2 border-primary rounded-full shadow-lg cursor-pointer transform -translate-x-1/2 hover:scale-110 transition-transform"></div>
                            <div className="absolute right-[30%] size-5 bg-white border-2 border-primary rounded-full shadow-lg cursor-pointer transform translate-x-1/2 hover:scale-110 transition-transform"></div>
                        </div>
                        <div className="flex justify-between mt-6">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-primary shadow-sm">
                                820 nm
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-primary shadow-sm">
                                1870 nm
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-3 font-bold px-1 uppercase tracking-tighter">
                            <span>Min: 400nm</span>
                            <span>Max: 2500nm</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
