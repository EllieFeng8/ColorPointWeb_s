import React from 'react';
import { ArrowRight, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';

function formatModels(models) {
  if (Array.isArray(models)) {
    return models.join(', ');
  }

  if (models && typeof models === 'object') {
    return Object.keys(models).join(', ');
  }

  return models ? String(models) : '--';
}

export default function Loading({
  open,
  onClose,
  trainingJobId,
  trainingSummary,
  progress = 45,
  statusText = '正在建立訓練任務...',
  modelInfo = null,
  completionState = null,
  secondaryLabel,
  secondaryTo
}) {
  const resolvedModelInfo = modelInfo ?? (trainingSummary ? {
    taskCategory: trainingSummary.taskCategory ?? '--',
    models: trainingSummary.models ?? '--',
    status: trainingJobId ? 'running' : 'creating'
  } : null);

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
            className="w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-10 shadow-xl text-center"
          >
            <div className="mb-6 relative inline-block">
              <div className="w-20 h-20 rounded-full border-4 border-gray-100 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <Settings size={32} className="text-primary" />
                </motion.div>
              </div>
              <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                {progress}%
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <h4 className="text-xl font-bold text-gray-800">模型訓練中...</h4>
              <p className="text-sm text-gray-500">{statusText}</p>
            </div>

            {resolvedModelInfo ? (
              <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-left space-y-2">
                <p className="text-xs font-semibold text-gray-500">
                  task_category: <span className="text-gray-700">{resolvedModelInfo.taskCategory}</span>
                </p>
                <p className="text-xs font-semibold text-gray-500">
                  models: <span className="text-gray-700">{formatModels(resolvedModelInfo.models)}</span>
                </p>
                <p className="text-xs font-semibold text-gray-500">
                  status: <span className="text-gray-700">{resolvedModelInfo.status}</span>
                </p>
              </div>
            ) : null}

            <div className="w-full bg-gray-100 h-2 rounded-full mb-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {completionState ? (
                <Link
                  to="/evaluatioClassify"
                  state={{
                    trainingJobId,
                    evaluationResult: completionState.evaluationResult,
                    modelInfo: completionState.modelInfo
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#82b091] px-4 py-3 font-semibold text-white transition-all hover:bg-[#659475]"
                >
                  前往評估匯出
                  <ArrowRight size={18} />
                </Link>
              ) : null}

              {secondaryTo ? (
                <Link
                  to={secondaryTo}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 inline-flex items-center justify-center"
                >
                  {secondaryLabel ?? (completionState ? '返回模型建構' : '返回模型建構')}
                </Link>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
                >
                  {secondaryLabel ?? (completionState ? '返回模型建構' : '返回模型建構')}
                </button>
              )}
            </div>
          </motion.div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
