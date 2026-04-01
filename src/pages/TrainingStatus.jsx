import React from 'react';
import { Link } from 'react-router-dom';
import swal from 'sweetalert';
import NavBar from '../components/NavBar.jsx';
import Loading from '../components/Loading.jsx';
import { useTraining } from '../context/TrainingContext.jsx';

const RESET_TASK_PASSWORD = '1234';

export default function TrainingStatus() {
  const {
    hasTrainingSession,
    hasActiveTraining,
    trainingJobId,
    trainingSummary,
    progress,
    statusText,
    modelInfo,
    completionState,
    error,
    clearTrainingSession
  } = useTraining();
  const [isResettingTask, setIsResettingTask] = React.useState(false);
  const [resetTaskError, setResetTaskError] = React.useState('');

  const handleResetTask = async () => {
    if (isResettingTask) {
      return;
    }

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = '請輸入密碼';
    passwordInput.className =
      'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none';

    const confirmedPassword = await swal({
      title: '確認中斷訓練',
      text: '請輸入密碼後按確認，才會中斷目前訓練任務。',
      icon: 'warning',
      buttons: ['取消', '確認'],
      dangerMode: true,
      content: passwordInput
    });

    if (!confirmedPassword) {
      return;
    }

    if (passwordInput.value !== RESET_TASK_PASSWORD) {
      setResetTaskError('密碼錯誤，無法中斷訓練。');
      await swal('密碼錯誤', '輸入的密碼不正確。', 'error');
      return;
    }

    setIsResettingTask(true);
    setResetTaskError('');

    try {
      const response = await fetch('/api/task/reset', {
        method: 'POST',
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

      clearTrainingSession();
      await swal('已中斷', '訓練任務已成功中斷。', 'success');
    } catch (nextError) {
      const errorMessage = nextError instanceof Error ? nextError.message : '中斷訓練失敗';
      setResetTaskError(errorMessage);
      await swal('中斷失敗', errorMessage, 'error');
    } finally {
      setIsResettingTask(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-display">
      <NavBar />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {hasTrainingSession ? (
            <Loading
              open
              trainingJobId={trainingJobId}
              trainingSummary={trainingSummary}
              progress={progress}
              statusText={error || statusText}
              modelInfo={modelInfo}
              completionState={completionState}
              secondaryLabel="返回模型建構"
              secondaryTo="/modelSet"
            />
          ) : (
            <section className="flex min-h-full items-center justify-center p-8">
              <div className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-10 shadow-xl text-center">
                <h2 className="text-2xl font-bold text-gray-800">目前沒有進行中的訓練任務</h2>
                <p className="mt-3 text-sm text-gray-500">
                  你可以回到模型建構頁面建立新的訓練任務。
                </p>
                <Link
                  to="/modelSet"
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#82b091] px-5 py-3 font-semibold text-white transition-all hover:bg-[#659475]"
                >
                  前往模型建構
                </Link>
              </div>
            </section>
          )}
          {hasActiveTraining ? (
            <div className="px-8 pb-8">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
                <p className="text-center text-sm font-medium text-slate-500">
                  訓練進行中時，系統會持續輪詢狀態，但不允許再建立新的訓練。
                </p>
                {resetTaskError ? (
                  <p className="text-center text-sm font-medium text-red-600">{resetTaskError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleResetTask}
                  disabled={isResettingTask}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all active:scale-95 ${
                    isResettingTask
                      ? 'cursor-not-allowed bg-red-300'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {isResettingTask ? '中斷中...' : '中斷訓練'}
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
