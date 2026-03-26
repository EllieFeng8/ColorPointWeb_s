/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';
import Loading from '../components/Loading.jsx';

export default function ModelSet() {
    const [activeTab, setActiveTab] = useState('regression');
    const [selectedRegressionModel, setSelectedRegressionModel] = useState('pls');
    const [selectedClassificationModel, setSelectedClassificationModel] = useState('svm');
    const [svrKernel, setSvrKernel] = useState('linear');
    const [svmKernel, setSvmKernel] = useState('linear');
    const [selectedHyperparameter, setSelectedHyperparameter] = useState('k_fold');
    const [showLoading, setShowLoading] = useState(false);

    const selectRegressionModel = (id) => {
        setSelectedRegressionModel(id);
    };

    const selectClassificationModel = (id) => {
        setSelectedClassificationModel(id);
    };

    return (
        <div className="flex h-screen overflow-hidden font-display">
            <NavBar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">

                {/* Main Scrollable Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
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
                                            selected={selectedRegressionModel === 'pls'}
                                            onToggle={() => selectRegressionModel('pls')}
                                            inputType="radio"
                                            inputName="regression_model"
                                        >
                                            <div className="space-y-4">
                                                <InputGroup label="Components:" defaultValue="12" />
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="svr"
                                            title="SVR"
                                            selected={selectedRegressionModel === 'svr'}
                                            onToggle={() => selectRegressionModel('svr')}
                                            inputType="radio"
                                            inputName="regression_model"
                                        >
                                            <div className="space-y-3">
                                                <div className="space-y-2">
                                                    <RadioOption
                                                        label="Linear"
                                                        name="svr_kernel"
                                                        checked={svrKernel === 'linear'}
                                                        onChange={() => setSvrKernel('linear')}
                                                    />
                                                    <RadioOption
                                                        label="RBF"
                                                        name="svr_kernel"
                                                        checked={svrKernel === 'rbf'}
                                                        onChange={() => setSvrKernel('rbf')}
                                                    />
                                                </div>
                                                {svrKernel === 'rbf' && (
                                                    <>
                                                        <InputGroup label="C:" placeholder="" />
                                                        <InputGroup label="tol:" placeholder="" />
                                                    </>
                                                )}
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="rf"
                                            title="RF"
                                            selected={selectedRegressionModel === 'rf'}
                                            onToggle={() => selectRegressionModel('rf')}
                                            inputType="radio"
                                            inputName="regression_model"
                                        >
                                            <InputGroup label="n_estimators:" defaultValue="100" />
                                        </ModelCard>
                                        <ModelCard
                                            id="xgboost"
                                            title="XGBoost"
                                            selected={selectedRegressionModel === 'xgboost'}
                                            onToggle={() => selectRegressionModel('xgboost')}
                                            inputType="radio"
                                            inputName="regression_model"
                                        >
                                            <div className="space-y-3">
                                                <InputGroup label="n_estimators:" defaultValue="100" />
                                                <InputGroup label="max_depth:" defaultValue="6" />
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="cnn"
                                            title="CNN"
                                            selected={selectedRegressionModel === 'cnn'}
                                            onToggle={() => selectRegressionModel('cnn')}
                                            inputType="radio"
                                            inputName="regression_model"
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
                                            selected={selectedClassificationModel === 'svm'}
                                            onToggle={() => selectClassificationModel('svm')}
                                            inputType="radio"
                                            inputName="classification_model"
                                        >
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <RadioOption
                                                        label="linear"
                                                        name="svm_kernel"
                                                        checked={svmKernel === 'linear'}
                                                        onChange={() => setSvmKernel('linear')}
                                                    />
                                                    <RadioOption
                                                        label="RBF"
                                                        name="svm_kernel"
                                                        checked={svmKernel === 'rbf'}
                                                        onChange={() => setSvmKernel('rbf')}
                                                    />
                                                </div>
                                                {svmKernel === 'rbf' && (
                                                    <>
                                                        <InputGroup label="C:" placeholder="" />
                                                        <InputGroup label="tol:" placeholder="" />
                                                    </>
                                                )}
                                            </div>
                                        </ModelCard>
                                        <ModelCard
                                            id="lda"
                                            title="LDA"
                                            selected={selectedClassificationModel === 'lda'}
                                            onToggle={() => selectClassificationModel('lda')}
                                            inputType="radio"
                                            inputName="classification_model"
                                        >
                                            <InputGroup label="n_estimators:" placeholder="" />
                                        </ModelCard>
                                        <ModelCard
                                            id="kmeans"
                                            title="K-means"
                                            selected={selectedClassificationModel === 'kmeans'}
                                            onToggle={() => selectClassificationModel('kmeans')}
                                            inputType="radio"
                                            inputName="classification_model"
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
                                    <input
                                        className="border-slate-300 text-[#659475] focus:ring-[#659475] h-5 w-5"
                                        id="grid_search"
                                        type="radio"
                                        name="hyperparameter_mode"
                                        checked={selectedHyperparameter === 'grid_search'}
                                        onChange={() => setSelectedHyperparameter('grid_search')}
                                    />
                                    <div className="flex flex-col">
                                        <label className="text-sm font-semibold text-slate-700 cursor-pointer" htmlFor="grid_search">Grid Search</label>

                                    </div>
                                    {selectedHyperparameter === 'grid_search' && (
                                        <div className="flex flex-1 flex-col items-end gap-3 ml-auto">
                                            <input className="w-full max-w-[120px] bg-slate-50 border border-slate-200 rounded-lg text-sm py-1.5 px-3 focus:ring-1 focus:ring-[#659475] outline-none" type="text" defaultValue="1" />
                                            <p className="max-w-[310px] text-[12px] leading-relaxed text-amber-600 text-right">
                                                Grid Search 會大幅增加運算時間，可能需要較長等待時間
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-8 hover:border-[#659475]/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <input
                                            className="border-slate-300 text-[#659475] focus:ring-[#659475] h-5 w-5"
                                            id="k_fold"
                                            type="radio"
                                            name="hyperparameter_mode"
                                            checked={selectedHyperparameter === 'k_fold'}
                                            onChange={() => setSelectedHyperparameter('k_fold')}
                                        />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-semibold text-slate-700 cursor-pointer" htmlFor="k_fold">K-fold Validation</label>
                                        </div>
                                    </div>
                                    {selectedHyperparameter === 'k_fold' && (
                                        <div className="flex items-center gap-3 flex-1 max-w-[120px] ml-auto">
                                            <input className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm py-1.5 px-3 focus:ring-1 focus:ring-[#659475] outline-none" type="text" defaultValue="10" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer
                    primaryLabel="下一步:確定訓練"
                    onPrimaryClick={() => setShowLoading(true)}
                    secondaryLabel="上一步"
                    secondaryTo="/preprocessing"
                />
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

function ModelCard({ id, title, selected, onToggle, children, inputType = 'checkbox', inputName }) {
    return (
        <div className={`p-6 border-r border-b lg:border-b-0 border-slate-100 flex flex-col min-h-[280px] transition-colors ${selected ? 'bg-white' : 'bg-slate-50/30'}`}>
            <div className="flex items-center gap-2 mb-4">
                <input
                    type={inputType}
                    id={id}
                    name={inputName}
                    checked={selected}
                    onChange={onToggle}
                    className="border-slate-300 text-[#659475] focus:ring-[#659475] h-4 w-4"
                />
                <label htmlFor={id} className="font-bold text-slate-700 cursor-pointer">{title}</label>
            </div>
            {selected && (
                <div className="mt-2 pt-4 border-t border-slate-50">
                    {children}
                </div>
            )}
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

function RadioOption({ label, name, checked = false, onChange }) {
    return (
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
                type="radio"
                name={name}
                checked={checked}
                onChange={onChange}
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
