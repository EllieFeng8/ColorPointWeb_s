import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Boxes, ChevronDown, List, RefreshCcw, Save } from 'lucide-react';
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

export default function MachineModelSetting() {
  const [modelNames, setModelNames] = useState([]);
  const [selectedModelName, setSelectedModelName] = useState('');
  const [isLoadingNames, setIsLoadingNames] = useState(true);
  const [namesError, setNamesError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [groupName, setGroupName] = useState('');

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
      setSelectedModelName((current) => current || names[0] || '');

      if (names.length === 0) {
        setNamesError('目前沒有可用的模型名稱。');
      }
    } catch (error) {
      setModelNames([]);
      setSelectedModelName('');
      setNamesError(error instanceof Error ? `模型名稱讀取失敗：${error.message}` : '模型名稱讀取失敗。');
    } finally {
      setIsLoadingNames(false);
    }
  };

  useEffect(() => {
    loadModelNames();
  }, []);

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      setSubmitError('請填寫群組名稱。');
      return;
    }

    const message = '目前前端只有模型名稱 API，缺少 model_id 與 preprocessing_id，暫時無法送出建立模型群組。';
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
              列出目前所有模型名稱，並建立預設模型群組設定。
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
                    <h3 className="text-2xl font-bold text-[#111827]">所有模型名稱</h3>
                    <p className="text-sm text-slate-500">
                      來源：`GET /api/modeling/models/names/all`
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadModelNames}
                  disabled={isLoadingNames}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className={`h-4 w-4 ${isLoadingNames ? 'animate-spin' : ''}`} />
                  重新整理
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">
                  {isLoadingNames
                    ? '模型名稱載入中...'
                    : namesError || `目前共 ${modelNames.length} 個模型名稱`}
                </p>
              </div>

              <div className="mt-6">
                <div className="relative">
                  <select
                    value={selectedModelName}
                    onChange={(event) => setSelectedModelName(event.target.value)}
                    disabled={isLoadingNames || modelNames.length === 0}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
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
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#82b091]/10 p-3">
                  <Boxes className="h-6 w-6 text-[#82b091]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#111827]">設定模型群組</h3>
                  <p className="text-sm text-slate-500">
                    送出至 `POST /api/default-models/`
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <Field label="群組名稱">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-[#82b091] focus:ring-2 focus:ring-[#82b091]/20"
                    placeholder="例如：生產線A預設"
                  />
                </Field>

                <ReadonlyField
                  label="模型名稱"
                  value={selectedModelName || '尚未選擇模型名稱'}
                />

                <ReadonlyField
                  label="Task Category"
                  value="regression"
                />

                <ReadonlyField
                  label="描述"
                  value={selectedModelName ? `${selectedModelName} 預設模型群組` : '請先選擇模型名稱'}
                />

                <ReadonlyField
                  label="model_ids"
                  value="目前僅有模型名稱清單，尚未取得 model_id"
                />

                <ReadonlyField
                  label="preprocessing_id"
                  value="尚未指定 preprocessing_id"
                />

                {submitError ? (
                  <p className="text-sm font-semibold text-red-600">{submitError}</p>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#82b091] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#82b091]/25 transition-all hover:bg-[#659475] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <Save className="h-4 w-4" />
                  建立預設模型群組
                </button>

                <p className="text-xs text-amber-700">
                  目前只有群組名稱可編輯。若要真的建立群組，前端還需要可取得 `model_id` 與 `preprocessing_id` 的 API 或來源。
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
