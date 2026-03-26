import React from 'react';
import { ArrowRight, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';

const POLL_INTERVAL_MS = 3000;

function isPendingStatus(payload) {
  const status = String(
    payload?.status ??
    payload?.state ??
    payload?.job_status ??
    payload?.jobState ??
    ''
  ).toLowerCase();

  return ['pending', 'queued', 'running', 'processing', 'in_progress'].includes(status);
}

function extractTrainedModelId(payload) {
  return (
    payload?.trained_model_id ??
    payload?.trainedModelId ??
    payload?.model_id ??
    payload?.modelId ??
    payload?.result?.trained_model_id ??
    payload?.result?.trainedModelId ??
    payload?.data?.trained_model_id ??
    payload?.data?.trainedModelId ??
    null
  );
}

function extractStatus(payload) {
  return (
    payload?.status ??
    payload?.state ??
    payload?.job_status ??
    payload?.jobState ??
    null
  );
}

function formatModels(models) {
  if (Array.isArray(models)) {
    return models.join(', ');
  }

  if (models && typeof models === 'object') {
    return Object.keys(models).join(', ');
  }

  return models ? String(models) : '--';
}

export default function Loading({ open, onClose, trainingJobId, trainingSummary, onCompleted, onError }) {
  const [progress, setProgress] = React.useState(45);
  const [statusText, setStatusText] = React.useState('正在建立訓練任務...');
  const [modelInfo, setModelInfo] = React.useState(null);
  const [completionState, setCompletionState] = React.useState(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setProgress(45);
    setModelInfo({
      taskCategory: trainingSummary?.taskCategory ?? '--',
      models: trainingSummary?.models ?? '--',
      status: 'creating'
    });
    setCompletionState(null);

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + 3));
    }, 450);

    return () => window.clearInterval(timer);
  }, [open, trainingSummary]);

  React.useEffect(() => {
    if (!open) {
      setStatusText('正在建立訓練任務...');
      return;
    }

    if (!trainingJobId) {
      setStatusText('正在取得 trainingJobId...');
      setModelInfo((current) => current ? { ...current, status: 'creating' } : current);
      return;
    }

    let isCancelled = false;

    const fetchModelDetail = async (trainedModelId) => {
      const response = await fetch(`/api/evaluation/model/${trainedModelId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
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

      return body;
    };

    const fetchEvaluationResult = async () => {
      try {
        setStatusText('正在取得評估結果...');

        const response = await fetch(`/api/evaluation/results/${trainingJobId}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });

        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : await response.text().catch(() => '');

        if (isCancelled) {
          return;
        }

        if (response.ok) {
          const nextStatus = extractStatus(body);

          if (isPendingStatus(body)) {
            setStatusText('模型訓練中，等待評估完成...');
            setModelInfo((current) => current ? { ...current, status: nextStatus ?? 'running' } : current);
            return;
          }

          setProgress(100);
          setStatusText('評估完成，正在取得模型資訊...');

          const trainedModelId = extractTrainedModelId(body);
          let nextModelInfo = null;

          if (trainedModelId) {
            const modelDetail = await fetchModelDetail(trainedModelId);

            if (isCancelled) {
              return;
            }

            nextModelInfo = {
              trainedModelId: String(trainedModelId),
              taskCategory: modelDetail?.task_category ?? modelDetail?.taskCategory ?? trainingSummary?.taskCategory ?? '--',
              models: modelDetail?.models ?? trainingSummary?.models ?? '--',
              status: modelDetail?.status ?? nextStatus ?? 'completed'
            };

            setModelInfo(nextModelInfo);
            sessionStorage.setItem('evaluation_model_detail', JSON.stringify(modelDetail));
          } else {
            setModelInfo((current) => current ? {
              ...current,
              status: nextStatus ?? 'completed'
            } : current);
          }

          setStatusText('訓練完成，可以前往評估匯出。');
          sessionStorage.setItem('evaluation_result', JSON.stringify(body));
          const nextCompletionState = {
            evaluationResult: body,
            modelInfo: nextModelInfo
          };
          setCompletionState(nextCompletionState);
          onCompleted?.(nextCompletionState);
          return;
        }

        if ([202, 404, 409].includes(response.status)) {
          setStatusText('模型訓練中，等待評估完成...');
          setModelInfo((current) => current ? { ...current, status: 'running' } : current);
          return;
        }

        const detail = typeof body === 'string'
          ? body
          : body?.detail || body?.message || JSON.stringify(body);

        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        onError?.(error instanceof Error ? error : new Error('取得評估結果失敗'));
      }
    };

    fetchEvaluationResult();
    const pollTimer = window.setInterval(fetchEvaluationResult, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [open, trainingJobId, trainingSummary, onCompleted, onError]);

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

            {modelInfo ? (
              <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-left space-y-2">
                <p className="text-xs font-semibold text-gray-500">
                  task_category: <span className="text-gray-700">{modelInfo.taskCategory}</span>
                </p>
                <p className="text-xs font-semibold text-gray-500">
                  models: <span className="text-gray-700">{formatModels(modelInfo.models)}</span>
                </p>
                <p className="text-xs font-semibold text-gray-500">
                  status: <span className="text-gray-700">{modelInfo.status}</span>
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

              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
              >
                {completionState ? '返回模型建構' : '取消訓練'}
              </button>
            </div>
          </motion.div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
