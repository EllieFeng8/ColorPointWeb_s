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

  if (Array.isArray(payload?.models)) {
    return payload.models;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}

function normalizeModelNameOptions(payload) {
  const rawItems = extractModelNames(payload);
  const uniqueOptions = new Map();

  rawItems.forEach((item, index) => {
    if (typeof item === 'string') {
      const modelName = item.trim();

      if (!modelName) {
        return;
      }

      uniqueOptions.set(`name:${modelName}`, {
        key: `name-${index}-${modelName}`,
        modelId: '',
        modelName
      });
      return;
    }

    const modelName = String(item?.model_name ?? item?.modelName ?? item?.name ?? '').trim();
    const modelId = String(
      item?.model_id ??
      item?.modelId ??
      item?.trained_model_id ??
      item?.trainedModelId ??
      item?._id ??
      ''
    ).trim();

    if (!modelName) {
      return;
    }

    const uniqueKey = modelId ? `id:${modelId}` : `name:${modelName}`;

    if (!uniqueOptions.has(uniqueKey)) {
      uniqueOptions.set(uniqueKey, {
        key: modelId || `name-${index}-${modelName}`,
        modelId,
        modelName
      });
    }
  });

  return Array.from(uniqueOptions.values());
}

function extractDefaultModelGroups(payload) {
  let groups = [];

  if (Array.isArray(payload)) {
    groups = payload;
  } else if (Array.isArray(payload?.results)) {
    groups = payload.results;
  } else if (Array.isArray(payload?.data)) {
    groups = payload.data;
  }

  return groups.filter((group) => group?.is_active === true);
}

function flattenDefaultModelOptions(payload) {
  return extractDefaultModelGroups(payload).flatMap((group) => {
    const models = Array.isArray(group?.models) ? group.models : [];

    return models.map((model, index) => ({
      key: `${group?._id ?? group?.name ?? 'group'}-${model?.trained_model_id ?? model?.trainedModelId ?? index}`,
      name: group?.name ?? '',
      itemName: model?.item_name ?? model?.itemName ?? '',
      description: group?.description ?? '',
      taskCategory: group?.task_category ?? group?.taskCategory ?? '',
      trainedModelId: model?.trained_model_id ?? model?.trainedModelId ?? '',
      modelName: model?.model_name ?? model?.modelName ?? '',
      preprocessingId: group?.preprocessing_id ?? group?.preprocessingId ?? ''
    }));
  });
}

function buildCurrentModelList(payload) {
  const uniqueModels = new Map();

  flattenDefaultModelOptions(payload).forEach((item) => {
    const modelName = item.modelName?.trim() || '';
    const itemName = item.itemName?.trim() || '';
    const description = item.description?.trim() || '';
    const uniqueKey = `${modelName}__${itemName}__${description}`;

    if (!uniqueModels.has(uniqueKey)) {
      uniqueModels.set(uniqueKey, {
        key: item.key,
        modelName: modelName || '--',
        itemName: itemName || '--',
        description: description || '--'
      });
    }
  });

  return Array.from(uniqueModels.values());
}

function createEditableModel(name = '', modelName = '', modelId = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    modelName,
    modelId
  };
}

export default function MachineModelSetting() {
  const [modelNames, setModelNames] = useState([]);
  const [defaultModelOptions, setDefaultModelOptions] = useState([]);
  const [currentModelList, setCurrentModelList] = useState([]);
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
      console.log('[MachineModelSetting] model names payload', payload);
      const names = normalizeModelNameOptions(payload);
      console.log('[MachineModelSetting] normalized model name options', names);
      console.log('[MachineModelSetting] model name select disabled state', {
        isLoadingNames: false,
        modelNamesLength: names.length
      });

      setModelNames(names);

      if (names.length === 0) {
        setNamesError('目前沒有可用的模型名稱。');
      }
    } catch (error) {
      console.log('[MachineModelSetting] load model names failed', error);
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
      console.log('[MachineModelSetting] default models payload', payload);
      const nextOptions = flattenDefaultModelOptions(payload);
      const nextModelList = buildCurrentModelList(payload);
      console.log('[MachineModelSetting] active default model options', nextOptions);
      console.log('[MachineModelSetting] current model list', nextModelList);
      const nextModel = nextOptions[0] ?? null;

      setDefaultModelOptions(nextOptions);
      setCurrentModelList(nextModelList);
      setGroupName(nextModel?.name ?? '');
      setDescription(nextModel?.description ?? '');
      setTaskCategory(nextModel?.taskCategory || 'regression');
      setCurrentModelId(nextModel?.trainedModelId ?? '');
      setCurrentPreprocessingId(nextModel?.preprocessingId ?? '');
      setEditableModels([
        createEditableModel(nextModel?.itemName ?? '', nextModel?.modelName ?? '', nextModel?.trainedModelId ?? '')
      ]);

      if (nextOptions.length === 0) {
        setCurrentModelError('目前沒有可用的預設模型群組。');
      }
    } catch (error) {
      setDefaultModelOptions([]);
      setCurrentModelList([]);
      setGroupName('');
      setDescription('');
      setTaskCategory('regression');
      setCurrentModelId('');
      setCurrentPreprocessingId('');
      setEditableModels([createEditableModel()]);
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
    if (!groupName.trim()) {
      setSubmitError('請填寫 group name。');
      return;
    }

    const normalizedModels = editableModels
      .map((item) => ({
        name: item.name.trim(),
        modelName: item.modelName.trim(),
        modelId: item.modelId.trim()
      }))
      .filter((item) => item.name || item.modelName || item.modelId);

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

    if (normalizedModels.some((item) => !item.modelId)) {
      setSubmitError('部分 model name 無法對應到 model_id。');
      return;
    }

    const mergedModelNames = normalizedModels.map((item) => item.modelName).join(' / ');
    const requestBody = {
      name: groupName.trim(),
      description: description.trim() || `${mergedModelNames} 預設模型群組`,
      model_set: normalizedModels.map((item) => ({
        model_id: item.modelId,
        item_name: item.name
      }))
    };

    console.log('[MachineModelSetting] save current model payload', requestBody);

    setIsSavingCurrentModel(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/default-models/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(requestBody)
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

      console.log('[MachineModelSetting] save current model response', body);

      await swal(
        '已儲存目前模型',
        '預設模型群組已更新。',
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
                    Current Models
                  </p>
                  <p className="mt-3 text-2xl font-bold text-[#111827]">
                    {isLoadingCurrentModel ? '--' : currentModelList.length}
                  </p>
                </div>


              </div>

              <div className="mt-6 space-y-5">
                {isLoadingCurrentModel ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">
                    目前模型載入中...
                  </div>
                ) : null}

                {!isLoadingCurrentModel && currentModelError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-600">
                    {currentModelError}
                  </div>
                ) : null}

                {!isLoadingCurrentModel && !currentModelError && currentModelList.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">
                    目前沒有可用的模型資料。
                  </div>
                ) : null}

                {!isLoadingCurrentModel && !currentModelError && currentModelList.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {currentModelList.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-5">
                        <ReadonlyField label="model_name" value={item.modelName} />
                        <div className="mt-4">
                          <ReadonlyField label="item_name" value={item.itemName} />
                        </div>
                        <div className="mt-4">
                          <ReadonlyField label="description" value={item.description} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#82b091]/10 p-3">
                  <Boxes className="h-6 w-6 text-[#82b091]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#111827]">修改模型</h3>

                </div>
              </div>

              <div className="mt-6 space-y-5">
                <Field label="group name">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20"
                    placeholder="例如：water"
                  />
                </Field>

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
                        <Field label="item_name">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(event) => handleEditableModelChange(item.id, 'name', event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20"
                            placeholder="例如：water"
                          />
                        </Field>

                        <Field label="model name">
                          <div className="relative">
                            <select
                              value={item.modelId || item.modelName}
                              onChange={(event) => {
                                const selectedOption = modelNames.find((option) => (
                                  (option.modelId || option.modelName) === event.target.value
                                ));
                                handleEditableModelChange(item.id, 'modelName', selectedOption?.modelName ?? '');
                                handleEditableModelChange(item.id, 'modelId', selectedOption?.modelId ?? '');
                              }}
                              disabled={isLoadingNames || modelNames.length === 0}
                              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              <option value="">
                                {isLoadingNames ? '讀取中...' : '請選擇模型名稱'}
                              </option>
                              {modelNames.map((modelOption) => (
                                <option key={modelOption.key} value={modelOption.modelId || modelOption.modelName}>
                                  {modelOption.modelName}
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

                {namesError ? (
                  <p className="text-sm font-semibold text-red-600">{namesError}</p>
                ) : null}

                <button
                  type="button"
                  onClick={handleSaveCurrentModel}
                  disabled={isSavingCurrentModel || isLoadingNames || modelNames.length === 0}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#82b091] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#82b091]/25 transition-all hover:bg-[#659475] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <Save className="h-4 w-4" />
                  {isSavingCurrentModel ? '儲存中...' : '儲存修改'}
                </button>


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
