/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';
import Loading from '../components/Loading.jsx';
import { useTraining } from '../context/TrainingContext.jsx';

function extractTrainingJobId(payload) {
    return (
        payload?.training_job_id ??
        payload?.trainingJobId ??
        payload?.job_id ??
        payload?.jobId ??
        payload?.id ??
        null
    );
}

function parseNumberList(value) {
    return String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => Number(item))
        .filter((item) => !Number.isNaN(item));
}

function getParamValue(rawValue, useGridSearch) {
    const values = parseNumberList(rawValue);
    return useGridSearch ? values : (values[0] ?? Number(rawValue));
}

function getArrayOrFallback(values, fallbackValue) {
    return values.length > 0 ? values : [fallbackValue];
}

export default function ModelSet() {
    const location = useLocation();
    const routedPreprocessingId = location.state?.preprocessingId ?? '';
    const routedFileId = location.state?.fileId ?? '';
    const routedComponent = location.state?.component ?? '';
    const routedWavelengthsLength = Number(location.state?.wavelengthsLength ?? 0);
    const [activeTab, setActiveTab] = useState('regression');
    const [selectedRegressionModel, setSelectedRegressionModel] = useState('pls');
    const [selectedClassificationModel, setSelectedClassificationModel] = useState('svm');
    const [svrKernel, setSvrKernel] = useState('linear');
    const [svmKernel, setSvmKernel] = useState('linear');
    const [enableGridSearch, setEnableGridSearch] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [preprocessingId] = useState(routedPreprocessingId);
    const [selectedFileId] = useState(routedFileId);
    const [selectedComponent] = useState(routedComponent);
    const [wavelengthsLength] = useState(routedWavelengthsLength);
    const [plsComponents, setPlsComponents] = useState('12');
    const [svrC, setSvrC] = useState('1.0');
    const [svrTol, setSvrTol] = useState('0.001');
    const [rfEstimators, setRfEstimators] = useState('100');
    const [xgboostEstimators, setXgboostEstimators] = useState('100');
    const [xgboostMaxDepth, setXgboostMaxDepth] = useState('6');
    const [svmC, setSvmC] = useState('1.0');
    const [svmTol, setSvmTol] = useState('0.001');
    const [ldaEstimators, setLdaEstimators] = useState('');
    const [kmeansNeighbors, setKmeansNeighbors] = useState('');
    const [nClasses, setNClasses] = useState('');
    const [kFoldValue, setKFoldValue] = useState('10');
    const {
        trainingJobId,
        trainingSummary,
        progress,
        statusText,
        modelInfo,
        completionState,
        error: trainingError,
        hasActiveTraining,
        beginTraining,
        setTrainingJobId,
        setTrainingError
    } = useTraining();
    const isGridSearch = enableGridSearch;
    const showRegressionGridSearchParams =
        activeTab === 'regression' &&
        isGridSearch &&
        ['pls', 'svr', 'rf', 'xgboost'].includes(selectedRegressionModel);
    const showClassificationGridSearchParams =
        activeTab === 'classification' &&
        isGridSearch &&
        ['svm', 'lda', 'kmeans'].includes(selectedClassificationModel);
    const regressionGridSearchCombinationCount =
        selectedRegressionModel === 'pls'
            ? Math.max(parseNumberList(plsComponents).length, 1)
            : selectedRegressionModel === 'svr'
                ? (svrKernel === 'rbf'
                    ? Math.max(parseNumberList(svrC).length, 1) * Math.max(parseNumberList(svrTol).length, 1)
                    : 1)
                : selectedRegressionModel === 'rf'
                    ? Math.max(parseNumberList(rfEstimators).length, 1)
                : selectedRegressionModel === 'xgboost'
                        ? Math.max(parseNumberList(xgboostEstimators).length, 1) * Math.max(parseNumberList(xgboostMaxDepth).length, 1)
                        : 0;
    const classificationGridSearchCombinationCount =
        selectedClassificationModel === 'svm'
            ? (svmKernel === 'rbf'
                ? Math.max(parseNumberList(svmC).length, 1) * Math.max(parseNumberList(svmTol).length, 1)
                : 1)
            : selectedClassificationModel === 'lda'
                ? Math.max(parseNumberList(ldaEstimators).length, 1)
                : selectedClassificationModel === 'kmeans'
                    ? Math.max(parseNumberList(kmeansNeighbors).length, 1)
                    : 0;

    const selectRegressionModel = (id) => {
        setSelectedRegressionModel(id);
    };

    const selectClassificationModel = (id) => {
        setSelectedClassificationModel(id);
    };

    const toggleKernelOption = (currentValues, setter, nextValue, fallbackValue, singleSetter) => {
        const nextValues = currentValues.includes(nextValue)
            ? currentValues.filter((value) => value !== nextValue)
            : [...currentValues, nextValue];
        const safeValues = nextValues.length > 0 ? nextValues : [fallbackValue];
        setter(safeValues);
        singleSetter(safeValues[0]);
    };

    const handleTrain = async () => {
        if (hasActiveTraining) {
            setSubmitError('目前已有模型訓練進行中，請至「模型訓練中」頁面查看狀態。');
            return;
        }

        if (!selectedFileId) {
            setSubmitError('缺少 file_id，無法啟動模型訓練。');
            return;
        }

        if (!preprocessingId) {
            setSubmitError('缺少 preprocessing_id，無法啟動模型訓練。');
            return;
        }

        if (activeTab === 'pca') {
            setSubmitError('目前尚未支援 PCA 訓練 API。');
            return;
        }

        const regressionModels = {
            PLS: {
                enabled: selectedRegressionModel === 'pls',
                params: {
                    n_components: getParamValue(plsComponents, isGridSearch)
                }
            },
            SVR: {
                enabled: selectedRegressionModel === 'svr',
                params: {
                    kernel: svrKernel,
                    C: getParamValue(svrC, isGridSearch),
                    tol: getParamValue(svrTol, isGridSearch)
                }
            },
            RF: {
                enabled: selectedRegressionModel === 'rf',
                params: {
                    n_estimators: getParamValue(rfEstimators, isGridSearch)
                }
            },
            XGBoost: {
                enabled: selectedRegressionModel === 'xgboost',
                params: {
                    n_estimators: getParamValue(xgboostEstimators, isGridSearch),
                    max_depth: getParamValue(xgboostMaxDepth, isGridSearch)
                }
            },
            CNN: {
                enabled: selectedRegressionModel === 'cnn',
                params: {}
            }
        };
        const classificationParams = nClasses ? { n_classes: Number(nClasses) } : {};
        const classificationModels = {
            SVM: {
                enabled: selectedClassificationModel === 'svm',
                params: {
                    ...classificationParams,
                    kernel: svmKernel,
                    C: getParamValue(svmC, isGridSearch),
                    tol: getParamValue(svmTol, isGridSearch)
                }
            },
            LDA: {
                enabled: selectedClassificationModel === 'lda',
                params: {
                    ...classificationParams,
                    ...(ldaEstimators ? { n_estimators: getParamValue(ldaEstimators, isGridSearch) } : {})
                }
            },
            'K-means': {
                enabled: selectedClassificationModel === 'kmeans',
                params: {
                    ...classificationParams,
                    ...(kmeansNeighbors ? { n_neighbors: getParamValue(kmeansNeighbors, isGridSearch) } : {})
                }
            }
        };

        const allModels = activeTab === 'regression' ? regressionModels : classificationModels;
        const selectedModelKey = activeTab === 'regression'
            ? Object.keys(regressionModels).find((key) => regressionModels[key].enabled)
            : Object.keys(classificationModels).find((key) => classificationModels[key].enabled);
        const models = isGridSearch
            ? allModels
            : (selectedModelKey ? { [selectedModelKey]: allModels[selectedModelKey] } : {});

        const payload = {
            file_id: selectedFileId,
            preprocessing_id: preprocessingId,
            task_category: activeTab,
            models,
            hyperparameter_tuning: {
                grid_search: isGridSearch,
                k_fold: Number(kFoldValue)
            }
        };

        console.log('[model-set] train payload', payload);
        const nextTrainingSummary = {
            taskCategory: payload.task_category,
            models: Object.entries(payload.models)
                .filter(([, config]) => config?.enabled === true)
                .map(([name]) => name)
        };
        beginTraining(nextTrainingSummary);
        setShowLoading(true);
        setSubmitError('');

        try {
            const response = await fetch('/api/modeling/train', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseContentType = response.headers.get('content-type') || '';
            const responseBody = responseContentType.includes('application/json')
                ? await response.json().catch(() => null)
                : await response.text().catch(() => '');

            console.log('[model-set] train response', {
                status: response.status,
                ok: response.ok,
                body: responseBody
            });

            if (!response.ok) {
                const detail = typeof responseBody === 'string'
                    ? responseBody
                    : responseBody?.detail || responseBody?.message || JSON.stringify(responseBody);
                throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
            }

            const nextTrainingJobId = extractTrainingJobId(responseBody);
            if (!nextTrainingJobId) {
                throw new Error('模型訓練回應缺少 training_job_id');
            }

            setTrainingJobId(String(nextTrainingJobId));
        } catch (error) {
            console.log('[model-set] train error', error);
            const message = error instanceof Error ? error.message : '模型訓練失敗';
            setSubmitError(message);
            setTrainingError(message);
            setShowLoading(false);
        }
    };

    if (showLoading) {
        return (
            <div className="flex h-screen overflow-hidden font-display">
                <NavBar />
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    <main className="flex-1 overflow-y-auto custom-scrollbar">
                        <Loading
                            open={showLoading}
                            trainingJobId={trainingJobId}
                            trainingSummary={trainingSummary}
                            progress={progress}
                            statusText={trainingError || statusText}
                            modelInfo={modelInfo}
                            completionState={completionState}
                            onClose={() => setShowLoading(false)}
                            secondaryLabel="返回模型建構"
                        />
                    </main>
                </div>
            </div>
        );
    }

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
                                            {!isGridSearch && (
                                                <InputGroup
                                                    label="Components:"
                                                    value={plsComponents}
                                                    onChange={setPlsComponents}
                                                    hint="1 < components < 50"
                                                />
                                            )}
                                        </ModelCard>
                                        <ModelCard
                                            id="svr"
                                            title="SVR"
                                            selected={selectedRegressionModel === 'svr'}
                                            onToggle={() => selectRegressionModel('svr')}
                                            inputType="radio"
                                            inputName="regression_model"
                                        >
                                            {!isGridSearch && (
                                                <div className="space-y-3">
                                                    <div className="space-y-2">
                                                        <CheckboxOption
                                                            label="Linear"
                                                            checked={svrKernel === 'linear'}
                                                            onChange={() => setSvrKernel('linear')}
                                                        />
                                                        <CheckboxOption
                                                            label="RBF"
                                                            checked={svrKernel === 'rbf'}
                                                            onChange={() => setSvrKernel('rbf')}
                                                        />
                                                    </div>
                                                    {svrKernel === 'rbf' && (
                                                        <>
                                                            <InputGroup
                                                                label="C:"
                                                                value={svrC}
                                                                onChange={setSvrC}
                                                                hint="1.0 < C < 100"
                                                            />
                                                            <InputGroup
                                                                label="tol:"
                                                                value={svrTol}
                                                                onChange={setSvrTol}
                                                                hint="1e⁻⁵ < tol < 1e⁻¹"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </ModelCard>
                                        <ModelCard
                                            id="rf"
                                            title="RF"
                                            selected={selectedRegressionModel === 'rf'}
                                            onToggle={() => selectRegressionModel('rf')}
                                            inputType="radio"
                                            inputName="regression_model"
                                        >
                                            {!isGridSearch && (
                                                <InputGroup
                                                    label="n_estimators:"
                                                    value={rfEstimators}
                                                    onChange={setRfEstimators}
                                                    hint="10 <= n_estimators <= 200"
                                                />
                                            )}
                                        </ModelCard>
                                        <ModelCard
                                            id="xgboost"
                                            title="XGBoost"
                                            selected={selectedRegressionModel === 'xgboost'}
                                            onToggle={() => selectRegressionModel('xgboost')}
                                            inputType="radio"
                                            inputName="regression_model"
                                        >
                                            {!isGridSearch && (
                                                <div className="space-y-3">
                                                    <InputGroup
                                                        label="n_estimators:"
                                                        value={xgboostEstimators}
                                                        onChange={setXgboostEstimators}
                                                        hint="10 <= n_estimators <= 200"
                                                    />
                                                    <InputGroup
                                                        label="max_depth:"
                                                        value={xgboostMaxDepth}
                                                        onChange={setXgboostMaxDepth}
                                                        hint="1 <= max_depth <= 12"
                                                    />
                                                </div>
                                            )}
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
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                            <div className="max-w-xs">
                                                <InputGroup
                                                    label="n_classes:"
                                                    value={nClasses}
                                                    onChange={setNClasses}
                                                    placeholder=""
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                            <ModelCard
                                                id="svm"
                                                title="SVM"
                                                selected={selectedClassificationModel === 'svm'}
                                                onToggle={() => selectClassificationModel('svm')}
                                                inputType="radio"
                                                inputName="classification_model"
                                            >
                                                {!isGridSearch && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <CheckboxOption
                                                                label="linear"
                                                                checked={svmKernel === 'linear'}
                                                                onChange={() => setSvmKernel('linear')}
                                                            />
                                                            <CheckboxOption
                                                                label="RBF"
                                                                checked={svmKernel === 'rbf'}
                                                                onChange={() => setSvmKernel('rbf')}
                                                            />
                                                        </div>
                                                        {svmKernel === 'rbf' && (
                                                            <>
                                                                <InputGroup
                                                                    label="C:"
                                                                    value={svmC}
                                                                    onChange={setSvmC}
                                                                    hint="1.0 < C < 100"
                                                                />
                                                                <InputGroup
                                                                    label="tol:"
                                                                    value={svmTol}
                                                                    onChange={setSvmTol}
                                                                    hint="1e⁻⁵ < tol < 1e⁻¹"
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </ModelCard>
                                            <ModelCard
                                                id="lda"
                                                title="LDA"
                                                selected={selectedClassificationModel === 'lda'}
                                                onToggle={() => selectClassificationModel('lda')}
                                                inputType="radio"
                                                inputName="classification_model"
                                            >
                                                {!isGridSearch && (
                                                    <div className="space-y-3">
                                                        <InputGroup
                                                            label="n_estimators:"
                                                            value={ldaEstimators}
                                                            onChange={setLdaEstimators}
                                                            hint="min(n_classes - 1, wavelengths.length) < n_components <= 10"
                                                        />
                                                        <p className="text-[11px] font-medium text-amber-600">
                                                            wavelengths.length: {wavelengthsLength}
                                                        </p>
                                                    </div>
                                                )}
                                            </ModelCard>
                                            <ModelCard
                                                id="kmeans"
                                                title="K-means"
                                                selected={selectedClassificationModel === 'kmeans'}
                                                onToggle={() => selectClassificationModel('kmeans')}
                                                inputType="radio"
                                                inputName="classification_model"
                                            >
                                                {!isGridSearch && (
                                                    <InputGroup
                                                        label="n_neighbors:"
                                                        value={kmeansNeighbors}
                                                        onChange={setKmeansNeighbors}
                                                        hint="2 <= n_neighbors <= 10"
                                                    />
                                                )}
                                            </ModelCard>
                                        </div>
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
                                        type="checkbox"
                                        checked={isGridSearch}
                                        onChange={(event) => setEnableGridSearch(event.target.checked)}
                                    />
                                    <div className="flex flex-col">
                                        <label className="text-sm font-semibold text-slate-700 cursor-pointer" htmlFor="grid_search">Grid Search</label>
                                        <span className="text-xs text-slate-400">可選</span>
                                    </div>
                                    {isGridSearch && (
                                        <div className="flex flex-1 flex-col items-end gap-3 ml-auto">
                                            <div className="w-full max-w-[360px] space-y-3">
                                                {showRegressionGridSearchParams && (
                                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 text-left">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            {selectedRegressionModel.toUpperCase()} 參數設定
                                                        </p>
                                                        <p className="text-xs font-medium text-emerald-700">
                                                            參數組合數: {regressionGridSearchCombinationCount} 組
                                                        </p>
                                                        {selectedRegressionModel === 'pls' && (
                                                            <InputGroup
                                                                label="Components:"
                                                                value={plsComponents}
                                                                onChange={setPlsComponents}
                                                                hint="1<components<50 逗號分隔，例如 8,12,16"
                                                            />
                                                        )}
                                                        {selectedRegressionModel === 'svr' && (
                                                            <div className="space-y-3">
                                                                <div className="space-y-2">
                                                                    <CheckboxOption
                                                                        label="Linear"
                                                                        checked={svrKernel === 'linear'}
                                                                        onChange={() => setSvrKernel('linear')}
                                                                    />
                                                                    <CheckboxOption
                                                                        label="RBF"
                                                                        checked={svrKernel === 'rbf'}
                                                                        onChange={() => setSvrKernel('rbf')}
                                                                    />
                                                                </div>
                                                                <p className="text-[10px] font-medium text-amber-500">
                                                                    kernel 單選
                                                                </p>
                                                                {svrKernel === 'rbf' && (
                                                                    <>
                                                                        <InputGroup
                                                                            label="C:"
                                                                            value={svrC}
                                                                            onChange={setSvrC}
                                                                            placeholder=""
                                                                            hint="1.0<C<100 逗號分隔，例如 1,2,3"
                                                                        />
                                                                        <InputGroup
                                                                            label="tol:"
                                                                            value={svrTol}
                                                                            onChange={setSvrTol}
                                                                            placeholder=""
                                                                            hint="1e⁻⁵<tol<1e⁻¹,逗號分隔,例如 0.1,0.01"
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        {selectedRegressionModel === 'rf' && (
                                                            <InputGroup
                                                                label="n_estimators:"
                                                                value={rfEstimators}
                                                                onChange={setRfEstimators}
                                                                hint="10<=n_estimators<=200,逗號分隔,例如 5,10,15"
                                                            />
                                                        )}
                                                        {selectedRegressionModel === 'xgboost' && (
                                                            <div className="space-y-3">
                                                                <InputGroup
                                                                    label="n_estimators:"
                                                                    value={xgboostEstimators}
                                                                    onChange={setXgboostEstimators}
                                                                    hint="10<=n_estimators<=200,逗號分隔,例如 5,10,15"
                                                                />
                                                                <InputGroup
                                                                    label="max_depth:"
                                                                    value={xgboostMaxDepth}
                                                                    onChange={setXgboostMaxDepth}
                                                                    hint="1<= max_depth<=12,逗號分隔,例如 3,6,9"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {showClassificationGridSearchParams && (
                                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 text-left">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            {selectedClassificationModel === 'kmeans' ? 'K-means' : selectedClassificationModel.toUpperCase()} 參數設定
                                                        </p>
                                                        <p className="text-xs font-medium text-emerald-700">
                                                            參數組合數: {classificationGridSearchCombinationCount} 組
                                                        </p>
                                                        {selectedClassificationModel === 'svm' && (
                                                            <div className="space-y-3">
                                                                <div className="space-y-2">
                                                                    <CheckboxOption
                                                                        label="linear"
                                                                        checked={svmKernel === 'linear'}
                                                                        onChange={() => setSvmKernel('linear')}
                                                                    />
                                                                    <CheckboxOption
                                                                        label="RBF"
                                                                        checked={svmKernel === 'rbf'}
                                                                        onChange={() => setSvmKernel('rbf')}
                                                                    />
                                                                </div>
                                                                <p className="text-[10px] font-medium text-amber-500">
                                                                    kernel 單選
                                                                </p>
                                                                {svmKernel === 'rbf' && (
                                                                    <>
                                                                        <InputGroup
                                                                            label="C:"
                                                                            value={svmC}
                                                                            onChange={setSvmC}
                                                                            placeholder=""
                                                                            hint="1.0<C<100 逗號分隔，例如 1,2,3"
                                                                        />
                                                                        <InputGroup
                                                                            label="tol:"
                                                                            value={svmTol}
                                                                            onChange={setSvmTol}
                                                                            placeholder=""
                                                                            hint="1e⁻⁵<tol<1e⁻¹,逗號分隔,例如 0.1,0.01"
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        {selectedClassificationModel === 'lda' && (
                                                            <>
                                                                <InputGroup
                                                                    label="n_estimators:"
                                                                    value={ldaEstimators}
                                                                    onChange={setLdaEstimators}
                                                                    placeholder=""
                                                                    hint="min(n_classes-1, wavelengths.length)< n_components<=10,逗號分隔,例如 2,4,6"
                                                                />
                                                                <p className="text-[11px] font-medium text-amber-600">
                                                                    wavelengths.length: {wavelengthsLength}
                                                                </p>
                                                            </>
                                                        )}
                                                        {selectedClassificationModel === 'kmeans' && (
                                                            <InputGroup
                                                                label="n_neighbors:"
                                                                value={kmeansNeighbors}
                                                                onChange={setKmeansNeighbors}
                                                                placeholder=""
                                                                hint="2<=n_neighbors<=10,逗號分隔,例如 3,5,7"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                                            type="checkbox"
                                            checked
                                            readOnly
                                        />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-semibold text-slate-700 cursor-pointer" htmlFor="k_fold">K-fold Validation</label>
                                            <span className="text-xs text-slate-400">必選</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 flex-1 max-w-[200px] ml-auto">
                                        <span className="text-[10px] font-medium text-amber-500 whitespace-nowrap">1 &lt;= k-fold &lt;= 10</span>
                                        <input
                                            className="w-full min-w-[90px] bg-slate-50 border border-slate-200 rounded-lg text-right text-sm py-2.5 px-4 focus:ring-1 focus:ring-[#659475] outline-none"
                                            type="text"
                                            value={kFoldValue}
                                            onChange={(event) => setKFoldValue(event.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {submitError && (
                            <p className="mt-6 text-sm font-semibold text-red-600">{submitError}</p>
                        )}
                        {trainingJobId && (
                            <p className="mt-3 text-sm font-semibold text-slate-600">
                                training_job_id: {trainingJobId}
                            </p>
                        )}
                        {hasActiveTraining && (
                            <p className="mt-3 text-sm font-semibold text-amber-700">
                                目前已有訓練進行中，不能再加入新的訓練。請至「模型訓練中」頁面查看狀態。
                            </p>
                        )}
                        {completionState && (
                            <p className="mt-3 text-sm font-semibold text-emerald-700">
                                最新訓練任務已完成，可前往評估匯出頁面查看結果。
                            </p>
                        )}
                    </div>
                </main>

                <Footer
                    primaryLabel={hasActiveTraining ? '模型訓練中' : '下一步:確定訓練'}
                    onPrimaryClick={handleTrain}
                    primaryDisabled={hasActiveTraining}
                    secondaryLabel="上一步"
                    secondaryTo="/preprocessing"
                    secondaryState={{
                        preprocessingId,
                        fileId: selectedFileId,
                        component: selectedComponent,
                        wavelengthsLength
                    }}
                />
            </div>
        </div>
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
        <div
            className={`p-6 border-r border-b border-slate-100 flex flex-col transition-colors lg:border-b-0 ${
                selected ? 'bg-white' : 'bg-slate-50/30'
            }`}
        >
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

function InputGroup({ label, value, onChange, placeholder, hint }) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">{label}</label>
                {hint ? <span className="text-[10px] font-medium text-amber-500">{hint}</span> : null}
            </div>
            <input
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm py-2 px-3 focus:ring-1 focus:ring-[#659475] focus:border-[#659475] outline-none"
                type="text"
                value={value ?? ''}
                onChange={(event) => onChange?.(event.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}

function CheckboxOption({ label, checked = false, onChange }) {
    return (
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
                type="checkbox"
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
