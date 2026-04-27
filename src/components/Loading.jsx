import { useMemo } from 'react';
import { AlertCircle, ArrowRight, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';

function formatModels(models) {
  if (typeof models === 'string') {
    return models || '--';
  }

  if (!models || typeof models !== 'object') {
    return '--';
  }

  const enabledModels = Object.entries(models)
    .filter(([, config]) => config?.enabled === true)
    .map(([name]) => name);

  return enabledModels.length ? enabledModels.join(', ') : '--';
}

function normalizeTrainingDetail(detail) {
  return {
    taskCategory: detail?.taskCategory ?? detail?.task_category ?? '--',
    models: formatModels(detail?.models),
    status: detail?.status ?? '--',
    bestModelId: detail?.bestModelId ?? detail?.best_model_id ?? '',
    errorMessage: detail?.errorMessage ?? (detail?.status === 'error' ? (detail?.error_message ?? '') : ''),
  };
}

const secondaryActionClassName =
  'inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-95';

export default function Loading({
  open,
  onClose,
  trainingJobId,
  progress = 45,
  statusText = '正在建立訓練任務...',
  modelInfo = null,
  completionState = null,
  secondaryLabel,
  secondaryTo,
}) {
  const detail = useMemo(() => normalizeTrainingDetail(modelInfo), [modelInfo]);
  const canGoToEvaluation = detail.status === 'completed';

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="flex min-h-full items-center justify-center p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-xl"
          >
            <div className="relative mb-6 inline-block">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-gray-100">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <Settings size={32} className="text-primary" />
                </motion.div>
              </div>
              <div className="absolute -top-2 -right-2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                {progress}%
              </div>
            </div>

            <div className="mb-8 space-y-2">
              <h4 className="text-xl font-bold text-gray-800">模型訓練中...</h4>
              <p className="text-sm text-gray-500">{statusText}</p>
              {trainingJobId ? (
                <p className="text-xs font-semibold text-slate-400">training_job_id: {trainingJobId}</p>
              ) : null}
            </div>

            <div className="mb-8 space-y-2 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-left">
              <p className="text-xs font-semibold text-gray-500">
                task_category: <span className="text-gray-700">{detail.taskCategory}</span>
              </p>
              <p className="text-xs font-semibold text-gray-500">
                models: <span className="text-gray-700">{detail.models}</span>
              </p>
              <p className="text-xs font-semibold text-gray-500">
                status: <span className="text-gray-700">{detail.status}</span>
              </p>
              {detail.bestModelId ? (
                <p className="text-xs font-semibold text-gray-500">
                  best_model_id: <span className="text-gray-700">{detail.bestModelId}</span>
                </p>
              ) : null}
              {detail.errorMessage ? (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">error_message</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-red-600">{detail.errorMessage}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {completionState ? (
                canGoToEvaluation ? (
                  <Link
                    to="/evaluatioClassify"
                    state={{ trainingJobId, modelId: detail.bestModelId }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#82b091] px-4 py-3 font-semibold text-white transition-all hover:bg-[#659475]"
                  >
                    前往評估匯出
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <span className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-3 font-semibold text-white">
                    前往評估匯出
                    <ArrowRight size={18} />
                  </span>
                )
              ) : null}

              {secondaryTo ? (
                <Link
                  to={secondaryTo}
                  className={secondaryActionClassName}
                >
                  {secondaryLabel ?? '返回模型建構'}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className={secondaryActionClassName}
                >
                  {secondaryLabel ?? '返回模型建構'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
