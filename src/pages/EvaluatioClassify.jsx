import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, Info, Tag } from 'lucide-react';
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLocation } from 'react-router-dom';
import NavBar from '@/src/components/NavBar.jsx';
import { useTraining } from '../context/TrainingContext.jsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function toCsv(rows) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getFilenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) {
    return '';
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] || '';
}

function downloadCsv(filename, rows) {
  downloadFile(filename, `\uFEFF${toCsv(rows)}`, 'text/csv;charset=utf-8;');
}

async function saveFile(filename, content, mimeType, types) {
  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types
    });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return;
  }

  downloadFile(filename, content, mimeType);
}

async function saveCsv(filename, rows) {
  const content = `\uFEFF${toCsv(rows)}`;

  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'CSV Files',
          accept: {
            'text/csv': ['.csv']
          }
        }
      ]
    });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return;
  }

  downloadCsv(filename, rows);
}

function normalizeScatterPoint(point, index) {
  const actual = Number(
    point?.actual ??
    point?.Actual ??
    point?.x ??
    point?.X ??
    point?.target ??
    point?.y_true ??
    point?.reference
  );
  const predicted = Number(
    point?.predicted ??
    point?.Predicted ??
    point?.y ??
    point?.Y ??
    point?.prediction ??
    point?.y_pred ??
    point?.estimate
  );

  if (!Number.isFinite(actual) || !Number.isFinite(predicted)) {
    return null;
  }

  return {
    id: index,
    actual,
    predicted,
  };
}

function normalizeScatterData(points) {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((point, index) => normalizeScatterPoint(point, index))
    .filter(Boolean);
}

function getMetricGroup(source) {
  return {
    rSquared: source?.r_squared,
    rmse: source?.rmse,
    rpd: source?.rpd,
  };
}

function formatMetricValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : '--';
}

function formatDisplayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(3) : '--';
  }

  return String(value);
}

function formatChartValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : '--';
}

function formatKeyLabel(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildChartCsvRows(points) {
  return [
    ['actual', 'predicted'],
    ...points.map(({ actual, predicted }) => [actual, predicted])
  ];
}

function getScatterDomain(points) {
  if (!points.length) {
    return [0, 1];
  }

  const values = points.flatMap((point) => [point.actual, point.predicted]);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const padding = min === 0 ? 1 : Math.abs(min) * 0.05;
    return [min - padding, max + padding];
  }

  const padding = (max - min) * 0.05;
  return [min - padding, max + padding];
}

const MetricCard = ({ label, value, isPrimary = false }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={cn('text-lg font-bold', isPrimary ? 'text-primary' : 'text-slate-700')}>{value}</p>
  </div>
);

const ChartContainer = ({ className = '', children }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return undefined;
    }

    const updateSizeState = () => {
      const { width, height } = element.getBoundingClientRect();
      const nextWidth = Math.floor(width);
      const nextHeight = Math.floor(height);

      setSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateSizeState();

    const observer = new ResizeObserver(updateSizeState);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
};

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">Actual: {formatChartValue(point?.actual)}</p>
      <p className="mt-1 font-semibold text-slate-700">Predicted: {formatChartValue(point?.predicted)}</p>
    </div>
  );
};

const ScatterPanel = ({
  title,
  subtitle,
  data,
  metrics,
  loading = false,
  error = '',
  exportLabel = 'CSV 匯出',
  onExport,
  exportDisabled = false,
}) => {
  const domain = useMemo(() => getScatterDomain(data), [data]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-slate-800">{title}</h3>
            <p className="mt-1 text-[11px] font-bold text-slate-400">{subtitle}: {data.length}</p>
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors',
              exportDisabled
                ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            )}
          >
            <Download className="size-3.5" />
            {loading ? '載入中...' : exportLabel}
          </button>
        </div>

        {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

        <ChartContainer className="h-56 min-h-[14rem] w-full overflow-hidden rounded border border-slate-100 bg-slate-50/30">
          {({ width, height }) => (
            <ScatterChart width={width} height={height} margin={{ top: 20, right: 24, bottom: 28, left: 6 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="actual"
                domain={domain}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatChartValue}
                label={{ value: 'Actual', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="predicted"
                domain={domain}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatChartValue}
                label={{ value: 'Predicted', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
              />
              <ZAxis type="number" range={[48, 48]} />
              <ReferenceLine
                segment={[
                  { x: domain[0], y: domain[0] },
                  { x: domain[1], y: domain[1] }
                ]}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter data={data} fill="#659475" opacity={0.72} />
            </ScatterChart>
          )}
        </ChartContainer>

        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="R²" value={formatMetricValue(metrics.rSquared)} isPrimary />
          <MetricCard label="RMSE" value={formatMetricValue(metrics.rmse)} />
          <MetricCard label="RPD" value={formatMetricValue(metrics.rpd)} />
        </div>
      </div>
    </motion.div>
  );
};

export default function EvaluatioClassify() {
  const location = useLocation();
  const { trainingJobId: contextTrainingJobId, bestModelId: contextBestModelId } = useTraining();
  const routedTrainingJobId = location.state?.trainingJobId ?? '';
  const routedModelId = location.state?.modelId ?? '';
  const activeTrainingJobId = String(
    routedTrainingJobId || contextTrainingJobId || sessionStorage.getItem('training_job_id') || ''
  );
  const activeModelId = String(
    routedModelId || contextBestModelId || sessionStorage.getItem('best_model_id') || ''
  );

  const [fileName, setFileName] = useState('Spectro_Model_Alpha');
  const [version, setVersion] = useState('v2.1.0');
  const [notes, setNotes] = useState('');
  const [trainingCsvContent, setTrainingCsvContent] = useState('');
  const [isTrainingCsvLoading, setIsTrainingCsvLoading] = useState(false);
  const [trainingCsvError, setTrainingCsvError] = useState('');
  const [trainingJobDetail, setTrainingJobDetail] = useState(null);
  const [trainingJobDetailError, setTrainingJobDetailError] = useState('');
  const [modelDetail, setModelDetail] = useState(null);
  const [isModelDetailLoading, setIsModelDetailLoading] = useState(false);
  const [modelDetailError, setModelDetailError] = useState('');
  const [modelExportError, setModelExportError] = useState('');
  const [isModelExporting, setIsModelExporting] = useState(false);

  useEffect(() => {
    if (!activeTrainingJobId) {
      setTrainingCsvContent('');
      setTrainingCsvError('缺少 training_job_id，無法取得訓練匯出檔。');
      return;
    }

    let cancelled = false;

    async function fetchTrainingCsv() {
      setIsTrainingCsvLoading(true);
      setTrainingCsvError('');

      try {
        const response = await fetch(
          `/api/evaluation/export/training-csv?training_job_id=${encodeURIComponent(activeTrainingJobId)}`,
          {
            method: 'GET',
            headers: { Accept: 'text/csv' }
          }
        );

        const csvContent = await response.text();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}${csvContent ? `: ${csvContent}` : ''}`);
        }

        setTrainingCsvContent(csvContent);
      } catch (error) {
        if (!cancelled) {
          setTrainingCsvError(error instanceof Error ? error.message : '取得訓練 CSV 失敗');
        }
      } finally {
        if (!cancelled) {
          setIsTrainingCsvLoading(false);
        }
      }
    }

    fetchTrainingCsv();

    return () => {
      cancelled = true;
    };
  }, [activeTrainingJobId]);

  useEffect(() => {
    if (!activeModelId) {
      setModelDetail(null);
      setModelDetailError('缺少 modelId，無法取得模型詳細資訊。');
      return;
    }

    let cancelled = false;

    async function fetchModelDetail() {
      setIsModelDetailLoading(true);
      setModelDetailError('');

      try {
        const response = await fetch(`/api/evaluation/model/${encodeURIComponent(activeModelId)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });

        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : await response.text().catch(() => '');

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const detail = typeof body === 'string'
            ? body
            : body?.detail || body?.message || JSON.stringify(body);
          throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
        }

        setModelDetail(body);
      } catch (error) {
        if (!cancelled) {
          setModelDetail(null);
          setModelDetailError(error instanceof Error ? error.message : '取得模型詳細資訊失敗');
        }
      } finally {
        if (!cancelled) {
          setIsModelDetailLoading(false);
        }
      }
    }

    fetchModelDetail();

    return () => {
      cancelled = true;
    };
  }, [activeModelId]);

  useEffect(() => {
    if (!activeTrainingJobId) {
      setTrainingJobDetail(null);
      setTrainingJobDetailError('缺少 training_job_id，無法取得訓練任務詳細資訊。');
      return;
    }

    let cancelled = false;

    async function fetchTrainingJobDetail() {
      setTrainingJobDetailError('');

      try {
        const response = await fetch(`/api/modeling/${encodeURIComponent(activeTrainingJobId)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });

        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : await response.text().catch(() => '');

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const detail = typeof body === 'string'
            ? body
            : body?.detail || body?.message || JSON.stringify(body);
          throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
        }

        setTrainingJobDetail(body);
      } catch (error) {
        if (!cancelled) {
          setTrainingJobDetail(null);
          setTrainingJobDetailError(error instanceof Error ? error.message : '取得訓練任務詳細資訊失敗');
        }
      }
    }

    fetchTrainingJobDetail();

    return () => {
      cancelled = true;
    };
  }, [activeTrainingJobId]);

  const trainingChartData = useMemo(
    () => normalizeScatterData(modelDetail?.evaluation?.training_chart_data),
    [modelDetail]
  );
  const testingChartData = useMemo(
    () => normalizeScatterData(modelDetail?.evaluation?.testing_chart_data),
    [modelDetail]
  );
  const trainingMetrics = useMemo(() => getMetricGroup(modelDetail?.evaluation?.training_metrics), [modelDetail]);
  const testingMetrics = useMemo(() => getMetricGroup(modelDetail?.evaluation?.testing_metrics), [modelDetail]);
  const modelSummary = useMemo(() => modelDetail?.model || null, [modelDetail]);
  const modelParamsUsed = useMemo(() => Object.entries(modelSummary?.params_used || {}), [modelSummary]);
  const hyperparameterTuning = useMemo(
    () => trainingJobDetail?.hyperparameter_tuning || trainingJobDetail?.job?.hyperparameter_tuning || null,
    [trainingJobDetail]
  );
  const hyperparameterConfig = useMemo(() => Object.entries(hyperparameterTuning || {}), [hyperparameterTuning]);

  const handleTrainingExport = async () => {
    if (!trainingCsvContent) {
      return;
    }

    const filename = `training-results-${activeTrainingJobId || 'latest'}.csv`;

    try {
      await saveFile(filename, `\uFEFF${trainingCsvContent}`, 'text/csv;charset=utf-8;', [
        {
          description: 'CSV Files',
          accept: {
            'text/csv': ['.csv']
          }
        }
      ]);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        downloadFile(filename, `\uFEFF${trainingCsvContent}`, 'text/csv;charset=utf-8;');
      }
    }
  };

  const handleTestingExport = async () => {
    const rows = buildChartCsvRows(testingChartData);

    try {
      await saveCsv(`testing-results-${activeModelId || 'latest'}.csv`, rows);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        downloadCsv(`testing-results-${activeModelId || 'latest'}.csv`, rows);
      }
    }
  };

  const handleModelExport = async () => {
    if (!activeModelId) {
      setModelExportError('缺少 best_model_id，無法下載模型檔案。');
      return;
    }

    setIsModelExporting(true);
    setModelExportError('');

    const safeName = (fileName || 'model-export').trim().replace(/[\\/:*?"<>|]/g, '_');
    const fallbackFilename = `${safeName || 'model-export'}-${version || 'v1.0.0'}.pkl`;

    try {
      const response = await fetch(`/api/modeling/models/${encodeURIComponent(activeModelId)}/download`, {
        method: 'GET',
        headers: { Accept: 'application/octet-stream' }
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const filename = getFilenameFromContentDisposition(contentDisposition) || fallbackFilename;

      downloadFile(filename, blob, blob.type || 'application/octet-stream');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setModelExportError(error instanceof Error ? error.message : '下載模型檔案失敗');
      }
    } finally {
      setIsModelExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light">
      <NavBar />

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <main className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] p-8">
            <header className="mb-12 flex justify-between items-start">
              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-extrabold tracking-tight text-[#111827]"
                >
                  評估分析
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg text-slate-500"
                >
                  模型性能評估與結果匯出
                </motion.p>
                {activeTrainingJobId ? (
                  <p className="text-[11px] font-bold text-slate-400">training_job_id: {activeTrainingJobId}</p>
                ) : null}
                {activeModelId ? (
                  <p className="text-[11px] font-bold text-slate-400">model_id: {activeModelId}</p>
                ) : null}
                {trainingCsvError ? (
                  <p className="text-xs font-medium text-red-600">{trainingCsvError}</p>
                ) : null}
                {trainingJobDetailError ? (
                  <p className="text-xs font-medium text-red-600">{trainingJobDetailError}</p>
                ) : null}
                {modelDetailError ? (
                  <p className="text-xs font-medium text-red-600">{modelDetailError}</p>
                ) : null}
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ScatterPanel
                title="訓練結果 (Training Results)"
                subtitle="樣本總數"
                data={trainingChartData}
                metrics={trainingMetrics}
                loading={isTrainingCsvLoading}
                onExport={handleTrainingExport}
                exportDisabled={!trainingCsvContent || isTrainingCsvLoading}
              />

              <ScatterPanel
                title="測試結果 (Testing Results)"
                subtitle="獨立驗證集"
                data={testingChartData}
                metrics={testingMetrics}
                loading={isModelDetailLoading}
                onExport={handleTestingExport}
                exportDisabled={!testingChartData.length || isModelDetailLoading}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800">模型匯出 (Model Export)</h3>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-tight text-slate-400">
                    配置並匯出最終預測模型
                  </p>
                  {!activeModelId ? (
                    <p className="mt-2 text-xs font-medium text-red-600">缺少 best_model_id，暫時無法匯出模型詳情。</p>
                  ) : null}
                  {modelExportError ? (
                    <p className="mt-2 text-xs font-medium text-red-600">{modelExportError}</p>
                  ) : null}
                </div>

                <form
                  className="flex flex-1 flex-col gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleModelExport();
                  }}
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      文件名字 (File Name)
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(event) => setFileName(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      版本號 (Version)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={version}
                        onChange={(event) => setVersion(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pl-10 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      備註 (Notes)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="描述模型的主要更動與測試條件..."
                      className="h-32 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isModelExporting || !activeModelId}
                    className={cn(
                      'mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white shadow-sm transition-all active:scale-[0.98]',
                      isModelExporting || !activeModelId
                        ? 'cursor-not-allowed bg-slate-300'
                        : 'bg-primary hover:bg-primary-hover'
                    )}
                  >
                    <ExternalLink className="size-5" />
                    {isModelExporting ? '匯出中...' : '匯出 (Export)'}
                  </button>
                </form>
              </motion.div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 pb-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800">模型資訊 (Model Summary)</h3>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-tight text-slate-400">
                      來自模型詳細資訊 API 的 model 區塊
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model Name</p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {formatDisplayValue(modelSummary?.model_name)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Category</p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {formatDisplayValue(modelSummary?.task_category)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Params Used</p>
                        <div className="mt-3 rounded-lg bg-white p-4">
                          {modelParamsUsed.length ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {modelParamsUsed.map(([key, value]) => (
                                <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {formatKeyLabel(key)}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {formatDisplayValue(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-slate-400">--</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hyperparameter Tuning</p>
                      <div className="mt-3 rounded-lg bg-white p-4">
                        {hyperparameterConfig.length ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {hyperparameterConfig.map(([key, value]) => (
                              <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {formatKeyLabel(key)}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {formatDisplayValue(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-slate-400">--</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Accuracy" value={formatMetricValue(modelSummary?.accuracy)} isPrimary />
                    <MetricCard label="F1 Score" value={formatMetricValue(modelSummary?.f1_score)} />
                    <MetricCard label="R²" value={formatMetricValue(modelSummary?.r_squared)} />
                    <MetricCard label="RMSE" value={formatMetricValue(modelSummary?.rmse)} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-4 rounded-xl border border-primary/10 bg-primary/5 p-6"
              >
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Info className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-tight text-primary">系統提示</h4>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    Scatter 圖資料來自模型詳細資訊 API。若圖上沒有點，請先確認 `training_chart_data`
                    與 `testing_chart_data` 是否包含可解析的 `actual` / `predicted` 欄位。
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
