import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Boxes, ChevronDown, List, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import swal from 'sweetalert';
import NavBar from '../components/NavBar.jsx';

function extractModelNames(payload) {
  if (Array.isArray(payload?.model_names)) {
    return payload.model_names;
  }

  if (Array.isArray(payload?.names)) {
    return payload.names;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}

function extractDefaultModelGroups(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function flattenDefaultModelOptions(payload) {
  return extractDefaultModelGroups(payload).flatMap((group) => {
    const models = Array.isArray(group?.models) ? group.models : [];

    return models.map((model, index) => ({
      key: `${group?._id ?? group?.name ?? 'group'}-${model?.trained_model_id ?? model?.trainedModelId ?? index}`,
      name: group?.name ?? '',
      description: group?.description ?? '',
      taskCategory: group?.task_category ?? group?.taskCategory ?? '',
      trainedModelId: model?.trained_model_id ?? model?.trainedModelId ?? '',
      modelName: model?.model_name ?? model?.modelName ?? '',
      preprocessingId: group?.preprocessing_id ?? group?.preprocessingId ?? ''
    }));
  });
}

function createEditableModel(name = '', modelName = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    modelName
  };
}

export default function MachineModelSetting() {
  const [modelNames, setModelNames] = useState([]);
  const [defaultModelOptions, setDefaultModelOptions] = useState([]);
  const [selectedDefaultModelKey, setSelectedDefaultModelKey] = useState('');
  const [selectedDefaultModel, setSelectedDefaultModel] = useState(null);
  const [selectedModelName, setSelectedModelName] = useState('');
  const [isLoadingNames, setIsLoadingNames] = useState(true);
  const [namesError, setNamesError] = useState('');
  const [isLoadingCurrentModel, setIsLoadingCurrentModel] = useState(true);
  const [currentModelError, setCurrentModelError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState('regression');
  const [currentModelId, setCurrentModelId] = useState('');
  const [currentPreprocessingId, setCurrentPreprocessingId] = useState('');
  const [editableModels, setEditableModels] = useState([createEditableModel()]);
  const [isSavingCurrentModel, setIsSavingCurrentModel] = useState(false);
  const syncSelectedDefaultModel = (nextModel) => {
    setSelectedDefaultModel(nextModel);
    setSelectedModelName(nextModel?.modelName ?? '');
    setGroupName(nextModel?.name ?? '');
    setDescription(nextModel?.description ?? '');
    setTaskCategory(nextModel?.taskCategory || 'regression');
    setCurrentModelId(nextModel?.trainedModelId ?? '');
    setCurrentPreprocessingId(nextModel?.preprocessingId ?? '');
    setEditableModels([
      createEditableModel(nextModel?.name ?? '', nextModel?.modelName ?? '')
    ]);
  };

  const loadModelNames = async () => {
    setIsLoadingNames(true);
    setNamesError('');

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

      const payload = await response.json().catch(() => null);
      const names = extractModelNames(payload)
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);

      setModelNames(names);

      if (names.length === 0) {
        setNamesError('目前沒有可用的模型名稱。');
      }
    } catch (error) {
      setModelNames([]);
      setNamesError(error instanceof Error ? `模型名稱讀取失敗：${error.message}` : '模型名稱讀取失敗。');
    } finally {
      setIsLoadingNames(false);
    }
  };

  const loadCurrentModels = async () => {
    setIsLoadingCurrentModel(true);
    setCurrentModelError('');

    try {
      const response = await fetch('/api/default-models/', {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json().catch(() => null);
      const nextOptions = flattenDefaultModelOptions(payload);
      const nextKey = (
        selectedDefaultModelKey && nextOptions.some((item) => item.key === selectedDefaultModelKey)
          ? selectedDefaultModelKey
          : (nextOptions[0]?.key ?? '')
      );
      const nextModel = nextOptions.find((item) => item.key === nextKey) ?? null;

      setDefaultModelOptions(nextOptions);
      setSelectedDefaultModelKey(nextKey);
      syncSelectedDefaultModel(nextModel);

      if (nextOptions.length === 0) {
        setCurrentModelError('目前沒有可用的預設模型群組。');
      }
    } catch (error) {
      setDefaultModelOptions([]);
      setSelectedDefaultModelKey('');
      syncSelectedDefaultModel(null);
      setCurrentModelError(
        error instanceof Error ? `目前模型讀取失敗：${error.message}` : '目前模型讀取失敗。'
      );
    } finally {
      setIsLoadingCurrentModel(false);
    }
  };

  useEffect(() => {
    loadModelNames();
    loadCurrentModels();
  }, []);

  const handleAddModel = () => {
    setEditableModels((current) => [...current, createEditableModel()]);
  };

  const handleEditableModelChange = (rowId, field, value) => {
    setEditableModels((current) => current.map((item) => (
      item.id === rowId ? { ...item, [field]: value } : item
    )));
  };

  const handleRemoveModel = (rowId) => {
    setEditableModels((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((item) => item.id !== rowId);
    });
  };

  const handleSaveCurrentModel = async () => {
    const normalizedModels = editableModels
      .map((item) => ({
        name: item.name.trim(),
        modelName: item.modelName.trim()
      }))
      .filter((item) => item.name || item.modelName);

    if (normalizedModels.length === 0) {
      setSubmitError('請至少新增一筆模型設定。');
      return;
    }

    if (normalizedModels.some((item) => !item.name)) {
      setSubmitError('每筆模型都必須填寫 name。');
      return;
    }

    if (normalizedModels.some((item) => !item.modelName)) {
      setSubmitError('每筆模型都必須選擇 model name。');
      return;
    }

    if (!currentPreprocessingId) {
      setSubmitError('缺少 preprocessing_id，請先完成前處理與訓練流程。');
      return;
    }

    const resolvedModelIds = normalizedModels.map((item) => {
      const matchedModel = defaultModelOptions.find((option) => option.modelName === item.modelName);
      return matchedModel?.trainedModelId ?? '';
    });

    if (resolvedModelIds.some((item) => !item)) {
      setSubmitError('部分 model name 無法對應到 trained_model_id。');
      return;
    }

    const dedupedModelIds = [...new Set(resolvedModelIds)];
    const mergedName = normalizedModels.map((item) => item.name).join(' / ');
    const mergedModelNames = normalizedModels.map((item) => item.modelName).join(' / ');

    setIsSavingCurrentModel(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/default-models/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name: mergedName,
          description: description.trim() || `${mergedModelNames} 預設模型群組`,
          task_category: taskCategory,
          model_ids: dedupedModelIds,
          preprocessing_id: currentPreprocessingId
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

      if (!response.ok) {
        const detail = typeof body === 'string'
          ? body
          : body?.detail || body?.message || JSON.stringify(body);
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      await swal(
        '已儲存目前模型',
        typeof body === 'string'
          ? body
          : JSON.stringify(body, null, 2),
        'success'
      );
      loadCurrentModels();
    } catch (error) {
      const message = error instanceof Error ? error.message : '建立預設模型群組失敗。';
      setSubmitError(message);
      await swal('儲存失敗', message, 'error');
    } finally {
      setIsSavingCurrentModel(false);
    }
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      setSubmitError('請填寫群組名稱。');
      return;
    }

    const message = '修改模型模組目前仍缺少可直接更新模型內容的後端 API。';
    setSubmitError(message);
    await swal('目前無法送出', message, 'warning');
  };

  return (
    <div className="flex h-screen overflow-hidden font-display">
      <NavBar />

      <main className="flex-1 overflow-y-auto bg-white px-12 pb-12 pt-12">
        <div className="mx-auto max-w-7xl space-y-10">
          <header className="space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-extrabold tracking-tight text-[#111827]"
            >
              機台模型設定
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-500"
            >
              查看目前模型，並整理後續可修改的模型設定資訊。
            </motion.p>
          </header>

          <div className="flex flex-col gap-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#82b091]/10 p-3">
                    <List className="h-6 w-6 text-[#82b091]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#111827]">目前模型</h3>
                    <p className="text-sm text-slate-500">
                      來源：`GET /api/default-models/`
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadCurrentModels}
                  disabled={isLoadingCurrentModel}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className={`h-4 w-4 ${isLoadingCurrentModel ? 'animate-spin' : ''}`} />
                  重新整理
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Current Model
                  </p>
                  <p className="mt-3 text-2xl font-bold text-[#111827]">
                    {selectedDefaultModel?.modelName || '--'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {isLoadingCurrentModel
                      ? '目前模型載入中...'
                      : currentModelError || `目前共 ${defaultModelOptions.length} 個可選 model_name`}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Model Source
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    目前模型直接來自預設模型群組 API。
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    用 `model_name` 當作篩選選項，選中後顯示對應內容。
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <Field label="model_name">
                  <div className="relative">
                    <select
                      value={selectedDefaultModelKey}
                      onChange={(event) => {
                        const nextKey = event.target.value;
                        setSelectedDefaultModelKey(nextKey);
                        const nextModel = defaultModelOptions.find((item) => item.key === nextKey) ?? null;
                        syncSelectedDefaultModel(nextModel);
                      }}
                      disabled={isLoadingCurrentModel || defaultModelOptions.length === 0}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {isLoadingCurrentModel ? '讀取中...' : '請選擇 model_name'}
                      </option>
                      {defaultModelOptions.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.modelName || '--'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <ReadonlyField
                    label="name"
                    value={selectedDefaultModel?.name || '--'}
                  />
                  <ReadonlyField
                    label="description"
                    value={selectedDefaultModel?.description || '--'}
                  />
                  <ReadonlyField
                    label="trained_model_id"
                    value={selectedDefaultModel?.trainedModelId || '--'}
                  />
                  <ReadonlyField
                    label="model_name"
                    value={selectedDefaultModel?.modelName || '--'}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#82b091]/10 p-3">
                  <Boxes className="h-6 w-6 text-[#82b091]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#111827]">修改模型</h3>
                  <p className="text-sm text-slate-500">
                    目前先整理可編輯欄位，送出功能仍受後端資料不足限制。
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-700">
                    可新增多筆模型，分別修改 `name` 與 `model name`。
                  </p>
                  <button
                    type="button"
                    onClick={handleAddModel}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
                  >
                    <Plus className="h-4 w-4" />
                    添加模型
                  </button>
                </div>

                <div className="space-y-4">
                  {editableModels.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-bold text-slate-700">
                          模型 {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveModel(item.id)}
                          disabled={editableModels.length === 1}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          移除
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Field label="name">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(event) => handleEditableModelChange(item.id, 'name', event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20"
                            placeholder="例如：生產線A預設"
                          />
                        </Field>

                        <Field label="model name">
                          <div className="relative">
                            <select
                              value={item.modelName}
                              onChange={(event) => handleEditableModelChange(item.id, 'modelName', event.target.value)}
                              disabled={isLoadingCurrentModel || isLoadingNames || modelNames.length === 0}
                              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              <option value="">
                                {isLoadingNames ? '讀取中...' : '請選擇模型名稱'}
                              </option>
                              {modelNames.map((modelName) => (
                                <option key={modelName} value={modelName}>
                                  {modelName}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>


                {submitError ? (
                  <p className="text-sm font-semibold text-red-600">{submitError}</p>
                ) : null}

                <button
                  type="button"
                  onClick={handleSaveCurrentModel}
                  disabled={isSavingCurrentModel || !selectedDefaultModel}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#82b091] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#82b091]/25 transition-all hover:bg-[#659475] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <Save className="h-4 w-4" />
                  {isSavingCurrentModel ? '儲存中...' : '儲存修改'}
                </button>

                <p className="text-xs text-amber-700">
                  會依照你選的多個 `model name` 對應 `trained_model_id`，再搭配目前的 `preprocessing_id` 建立預設模型群組。
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        {value}
      </div>
    </div>
  );
}
