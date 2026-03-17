/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
    Database,
    BarChart3,
    ArrowRight,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import NavBar from '../components/NavBar.jsx';
import Loading from '../components/Loading.jsx';
import logoAeyeot from "@/src/image/onlyLogoW_big 3.png";

export default function ModelSet() {
    const [activeTab, setActiveTab] = useState('regression');
    const [selectedModels, setSelectedModels] = useState(['pls']);
    const [showLoading, setShowLoading] = useState(false);

    const toggleModel = (id) => {
        setSelectedModels(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">

                {/* Main Scrollable Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 max-w-[1440px] mx-auto">
                        <header className="flex justify-between items-start mb-12">
                        <div className="space-y-2">
                        <motion.h2
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-extrabold tracking-tight text-[#111827]"
                        >
                            資料與模型
                        </motion.h2>
                        </div>
                        </header>
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 mb-8">
                            <TabButton
                                active={activeTab === 'regression'}
                                onClick={() => setActiveTab('regression')}
                                label="回歸 (Regression)"
                            />
                            <TabButton
                                active={activeTab === 'classification'}
                                onClick={() => setActiveTab('classification')}
                                label="分類 (Classification)"
                            />
                            <TabButton
                                active={activeTab === 'pca'}
                                onClick={() => setActiveTab('pca')}
                                label="主成分分析 (PCA)"
                            />
                        </div>

                        {/* Model Selection Section */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="mb-10"
                            >
                                {activeTab === 'regression' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <ModelCard
                                            id="pls"
                                            title="PLS"
                                            selected={selectedModels.includes('pls')}
                                            onToggle={() => toggleModel('pls')}
                                        >
                                            <div className="space-y-4">
                                                <InputGroup label="Components:" defaultValue="12" />
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="svr"
                                            title="SVR"
                                            selected={selectedModels.includes('svr')}
                                            onToggle={() => toggleModel('svr')}
                                        >
                                            <div className="space-y-3">
                                                <div className="space-y-2">
                                                    <RadioOption label="Linear" name="svr_kernel" checked />
                                                    <RadioOption label="RBF" name="svr_kernel" />
                                                </div>
                                                <InputGroup label="C:" placeholder="" />
                                                <InputGroup label="tol:" placeholder="" />
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="rf"
                                            title="RF"
                                            selected={selectedModels.includes('rf')}
                                            onToggle={() => toggleModel('rf')}
                                        >
                                            <InputGroup label="n_estimators:" defaultValue="100" />
                                        </ModelCard>
                                        <ModelCard
                                            id="xgboost"
                                            title="XGBoost"
                                            selected={selectedModels.includes('xgboost')}
                                            onToggle={() => toggleModel('xgboost')}
                                        >
                                            <div className="space-y-3">
                                                <InputGroup label="n_estimators:" defaultValue="100" />
                                                <InputGroup label="max_depth:" defaultValue="6" />
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="cnn"
                                            title="CNN"
                                            selected={selectedModels.includes('cnn')}
                                            onToggle={() => toggleModel('cnn')}
                                        >
                                            <span className="text-sm text-slate-400 italic">Auto-configured</span>
                                        </ModelCard>
                                    </div>
                                )}

                                {activeTab === 'classification' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <ModelCard
                                            id="svm"
                                            title="SVM"
                                            selected={selectedModels.includes('svm')}
                                            onToggle={() => toggleModel('svm')}
                                        >
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <RadioOption label="linear" name="svm_kernel" />
                                                    <RadioOption label="RBF" name="svm_kernel" checked />
                                                </div>
                                                <InputGroup label="C:" placeholder="" />
                                                <InputGroup label="tol:" placeholder="" />
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="lda"
                                            title="LDA"
                                            selected={selectedModels.includes('lda')}
                                            onToggle={() => toggleModel('lda')}
                                        >
                                            <InputGroup label="n_estimators:" placeholder="" />
                                        </ModelCard>
                                        <ModelCard
                                            id="kmeans"
                                            title="K-means"
                                            selected={selectedModels.includes('kmeans')}
                                            onToggle={() => toggleModel('kmeans')}
                                        >
                                            <InputGroup label="n_neighbors:" placeholder="" />
                                        </ModelCard>
                                    </div>
                                )}

                                {activeTab === 'pca' && (
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-slate-800">內容 (內容)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                            <div className="p-6 border-r border-slate-100 flex flex-col">
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Number of Components</label>
                                                        <input
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm py-2.5 px-4 focus:ring-1 focus:ring-[#659475] focus:border-[#659475] outline-none"
                                                            placeholder="e.g. 5"
                                                            type="number"
                                                        />
                                                        <p className="text-[11px] text-slate-400 mt-2 italic">Select the dimensionality of output space</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2 tracking-wider">SVD Solver</label>
                                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm py-2.5 px-4 focus:ring-1 focus:ring-[#659475] focus:border-[#659475] outline-none appearance-none">
                                                            <option>Auto</option>
                                                            <option>Full</option>
                                                            <option>Arpack</option>
                                                            <option>Randomized</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6 flex flex-col justify-between">
                                                <div className="space-y-6">
                                                    <ToggleGroup label="Whiten" defaultChecked />
                                                    <ToggleGroup label="Iterative Power" />
                                                    <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-50 pt-6">
                                                        Principal component analysis (PCA) is used to simplify complexity in high-dimensional data while retaining trends and patterns.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Hyperparameters Section */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-6">超參數</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-[#659475]/30 transition-colors">
                                    <input className="rounded border-slate-300 text-[#659475] focus:ring-[#659475] h-5 w-5" id="grid_search" type="checkbox" />
                                    <div className="flex flex-col">
                                        <label className="text-sm font-semibold text-slate-700 cursor-pointer" htmlFor="grid_search">Grid Search</label>
                                        <span className="text-[11px] text-slate-400">Exhaustive search over parameters</span>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-8 hover:border-[#659475]/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <input defaultChecked className="rounded border-slate-300 text-[#659475] focus:ring-[#659475] h-5 w-5" id="k_fold" type="checkbox" />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-semibold text-slate-700 cursor-pointer" htmlFor="k_fold">K-fold Validation</label>
                                            <span className="text-[11px] text-slate-400">K=5 folds configured</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-1 max-w-[120px] ml-auto">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase">C / K:</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm py-1.5 px-3 focus:ring-1 focus:ring-[#659475] outline-none" type="text" defaultValue="10" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="h-16 border-t border-slate-200 bg-white flex items-center justify-between px-8">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="size-2 bg-[#659475] rounded-full"></span>
                            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">系統狀態: 運行中</span>
                        </div>
                        <div className="flex items-center gap-2 border-l border-slate-100 pl-6">
                            <Database size={14} className="text-slate-400" />
                            <span className="text-[11px] text-slate-500 font-medium">1,240 Samples Loaded</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">

                        <div className="h-4 w-px bg-slate-100"></div>

                        <button
                            onClick={() => setShowLoading(true)}
                            className="ml-4 px-8 py-2 text-sm font-bold bg-[#659475] text-white rounded-lg hover:bg-[#547c61] transition-all shadow-sm flex items-center gap-2"
                        >
                            下一步
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </footer>
            </div>
            <Loading open={showLoading} onClose={() => setShowLoading(false)} />
        </div>
    );
}

function SidebarItem({ icon, label, active = false }) {
    return (
        <a
            href="#"
            className={`flex items-center gap-3 px-4 py-2.5 transition-colors group ${
                active
                    ? 'bg-[#f0f5f2] text-[#659475] border-r-4 border-[#659475]'
                    : 'text-slate-600 hover:bg-slate-100 rounded-lg'
            }`}
        >
      <span className={`${active ? 'text-[#659475]' : 'text-slate-400 group-hover:text-[#659475]'}`}>
        {icon}
      </span>
            <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
        </a>
    );
}

function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-8 py-3 text-sm transition-all border-b-2 ${
                active
                    ? 'font-bold border-[#659475] text-[#659475]'
                    : 'font-medium text-slate-400 hover:text-slate-600 border-transparent'
            }`}
        >
            {label}
        </button>
    );
}

function ModelCard({ id, title, selected, onToggle, children }) {
    return (
        <div className={`p-6 border-r border-b lg:border-b-0 border-slate-100 flex flex-col min-h-[280px] transition-colors ${selected ? 'bg-white' : 'bg-slate-50/30'}`}>
            <div className="flex items-center gap-2 mb-4">
                <input
                    type="checkbox"
                    id={id}
                    checked={selected}
                    onChange={onToggle}
                    className="rounded border-slate-300 text-[#659475] focus:ring-[#659475] h-4 w-4"
                />
                <label htmlFor={id} className="font-bold text-slate-700 cursor-pointer">{title}</label>
            </div>
            <div className="mt-2 pt-4 border-t border-slate-50">
                {children}
            </div>
        </div>
    );
}

function InputGroup({ label, defaultValue, placeholder }) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">{label}</label>
            <input
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm py-2 px-3 focus:ring-1 focus:ring-[#659475] focus:border-[#659475] outline-none"
                type="text"
                defaultValue={defaultValue}
                placeholder={placeholder}
            />
        </div>
    );
}

function RadioOption({ label, name, checked = false }) {
    return (
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
                type="radio"
                name={name}
                defaultChecked={checked}
                className="text-[#659475] focus:ring-[#659475] h-3 w-3"
            />
            <span>{label}</span>
        </label>
    );
}

function ToggleGroup({ label, defaultChecked = false }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">{label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#659475]"></div>
            </label>
        </div>
    );
}
