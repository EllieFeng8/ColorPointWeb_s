import React from 'react';

const STORAGE_KEY = 'training_session_state';
const POLL_INTERVAL_MS = 3000;

const TrainingContext = React.createContext(null);

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

function extractBestModelId(payload) {
  return (
    payload?.best_model_id ??
    payload?.bestModelId ??
    payload?.result?.best_model_id ??
    payload?.result?.bestModelId ??
    payload?.data?.best_model_id ??
    payload?.data?.bestModelId ??
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

function extractTaskCategory(payload) {
  return (
    payload?.task_category ??
    payload?.taskCategory ??
    payload?.result?.task_category ??
    payload?.result?.taskCategory ??
    payload?.data?.task_category ??
    payload?.data?.taskCategory ??
    null
  );
}

function extractModels(payload) {
  return (
    payload?.models ??
    payload?.result?.models ??
    payload?.data?.models ??
    null
  );
}

function getInitialState() {
  if (typeof window === 'undefined') {
    return {
      trainingJobId: '',
      trainingSummary: null,
      progress: 0,
      statusText: '目前沒有進行中的訓練任務。',
      modelInfo: null,
      bestModelId: '',
      completionState: null,
      error: ''
    };
  }

  const persistedRaw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!persistedRaw) {
    return {
      trainingJobId: '',
      trainingSummary: null,
      progress: 0,
      statusText: '目前沒有進行中的訓練任務。',
      modelInfo: null,
      bestModelId: '',
      completionState: null,
      error: ''
    };
  }

  try {
    return JSON.parse(persistedRaw);
  } catch {
    return {
      trainingJobId: '',
      trainingSummary: null,
      progress: 0,
      statusText: '目前沒有進行中的訓練任務。',
      modelInfo: null,
      bestModelId: '',
      completionState: null,
      error: ''
    };
  }
}

export function TrainingProvider({ children }) {
  const [trainingState, setTrainingState] = React.useState(getInitialState);

  React.useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trainingState));
  }, [trainingState]);

  React.useEffect(() => {
    if (!trainingState.trainingJobId || trainingState.completionState || trainingState.error) {
      return undefined;
    }

    let isCancelled = false;

    const fetchTrainingStatus = async (trainingJobId) => {
      const response = await fetch(`/api/modeling/status/${trainingJobId}`, {
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

    const fetchTrainingDetail = async (trainingJobId) => {
      const response = await fetch(`/api/modeling/${trainingJobId}`, {
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
        setTrainingState((current) => ({
          ...current,
          statusText: '正在取得評估結果...'
        }));

        const response = await fetch(`/api/evaluation/results/${trainingState.trainingJobId}`, {
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
            setTrainingState((current) => ({
              ...current,
              progress: current.progress >= 92 ? current.progress : current.progress + 3,
              statusText: '模型訓練中，等待評估完成...',
              modelInfo: current.modelInfo
                ? { ...current.modelInfo, status: nextStatus ?? 'running' }
                : {
                    taskCategory: current.trainingSummary?.taskCategory ?? '--',
                    models: current.trainingSummary?.models ?? '--',
                    status: nextStatus ?? 'running'
                  }
            }));
            return;
          }

          const trainedModelId = extractTrainedModelId(body);
          let nextModelInfo = null;

          if (trainingState.trainingJobId) {
            const trainingStatus = await fetchTrainingStatus(trainingState.trainingJobId);

            if (isCancelled) {
              return;
            }

            const trainingDetail = await fetchTrainingDetail(trainingState.trainingJobId);

            if (isCancelled) {
              return;
            }

            const bestModelId = extractBestModelId(trainingDetail);
            console.log('[TrainingContext] training detail loaded', {
              trainingJobId: trainingState.trainingJobId,
              bestModelId,
              trainingStatus,
              trainingDetail
            });
            nextModelInfo = {
              trainedModelId: trainedModelId ? String(trainedModelId) : '',
              bestModelId: bestModelId ? String(bestModelId) : '',
              taskCategory: extractTaskCategory(trainingDetail) ?? extractTaskCategory(trainingStatus) ?? trainingState.trainingSummary?.taskCategory ?? '--',
              models: extractModels(trainingDetail) ?? trainingState.trainingSummary?.models ?? '--',
              status: extractStatus(trainingStatus) ?? extractStatus(trainingDetail) ?? nextStatus ?? 'completed'
            };

            window.sessionStorage.setItem('training_status_detail', JSON.stringify(trainingStatus));
            window.sessionStorage.setItem('evaluation_model_detail', JSON.stringify(trainingDetail));
            if (bestModelId) {
              console.log('[TrainingContext] persist best_model_id', String(bestModelId));
              window.sessionStorage.setItem('best_model_id', String(bestModelId));
            } else {
              console.log('[TrainingContext] best_model_id missing in training detail response');
              window.sessionStorage.removeItem('best_model_id');
            }
          }

          window.sessionStorage.setItem('evaluation_result', JSON.stringify(body));
          setTrainingState((current) => ({
            ...current,
            progress: 100,
            statusText: '訓練完成，可以前往評估匯出。',
            modelInfo: nextModelInfo ?? (
              current.modelInfo
                ? { ...current.modelInfo, status: nextStatus ?? 'completed' }
                : {
                    taskCategory: current.trainingSummary?.taskCategory ?? '--',
                    models: current.trainingSummary?.models ?? '--',
                    status: nextStatus ?? 'completed'
                  }
            ),
            bestModelId: nextModelInfo?.bestModelId ?? current.bestModelId ?? '',
            completionState: {
              evaluationResult: body,
              modelInfo: nextModelInfo
            },
            error: ''
          }));
          return;
        }

        if ([202, 404, 409].includes(response.status)) {
          setTrainingState((current) => ({
            ...current,
            progress: current.progress >= 92 ? current.progress : current.progress + 3,
            statusText: '模型訓練中，等待評估完成...',
            modelInfo: current.modelInfo
              ? { ...current.modelInfo, status: 'running' }
              : {
                  taskCategory: current.trainingSummary?.taskCategory ?? '--',
                  models: current.trainingSummary?.models ?? '--',
                  status: 'running'
                }
          }));
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

        setTrainingState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : '取得評估結果失敗'
        }));
      }
    };

    fetchEvaluationResult();
    const pollTimer = window.setInterval(fetchEvaluationResult, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [trainingState.trainingJobId, trainingState.trainingSummary, trainingState.completionState, trainingState.error]);

  const beginTraining = React.useCallback((trainingSummary) => {
    window.sessionStorage.removeItem('training_job_id');
    window.sessionStorage.removeItem('evaluation_result');
    window.sessionStorage.removeItem('evaluation_model_detail');
    window.sessionStorage.removeItem('training_status_detail');
    window.sessionStorage.removeItem('best_model_id');

    setTrainingState({
      trainingJobId: '',
      trainingSummary,
      progress: 45,
      statusText: '正在取得 trainingJobId...',
      modelInfo: {
        taskCategory: trainingSummary?.taskCategory ?? '--',
        models: trainingSummary?.models ?? '--',
        status: 'creating'
      },
      bestModelId: '',
      completionState: null,
      error: ''
    });
  }, []);

  const setTrainingJobId = React.useCallback((trainingJobId) => {
    window.sessionStorage.setItem('training_job_id', String(trainingJobId));

    setTrainingState((current) => ({
      ...current,
      trainingJobId: String(trainingJobId),
      statusText: '模型訓練中，等待評估完成...',
      modelInfo: current.modelInfo ? { ...current.modelInfo, status: 'running' } : current.modelInfo,
      error: ''
    }));
  }, []);

  const setTrainingError = React.useCallback((message) => {
    setTrainingState((current) => ({
      ...current,
      error: message,
      statusText: message
    }));
  }, []);

  const clearTrainingSession = React.useCallback(() => {
    window.sessionStorage.removeItem('training_job_id');
    window.sessionStorage.removeItem('evaluation_result');
    window.sessionStorage.removeItem('evaluation_model_detail');
    window.sessionStorage.removeItem('training_status_detail');
    window.sessionStorage.removeItem('best_model_id');
    window.sessionStorage.removeItem(STORAGE_KEY);

    setTrainingState({
      trainingJobId: '',
      trainingSummary: null,
      progress: 0,
      statusText: '目前沒有進行中的訓練任務。',
      modelInfo: null,
      bestModelId: '',
      completionState: null,
      error: ''
    });
  }, []);

  const value = React.useMemo(() => ({
    ...trainingState,
    hasActiveTraining: Boolean(trainingState.trainingSummary) && !trainingState.completionState,
    hasTrainingSession: Boolean(trainingState.trainingSummary || trainingState.trainingJobId || trainingState.completionState),
    beginTraining,
    setTrainingJobId,
    setTrainingError,
    clearTrainingSession
  }), [trainingState, beginTraining, setTrainingJobId, setTrainingError, clearTrainingSession]);

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = React.useContext(TrainingContext);

  if (!context) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }

  return context;
}
