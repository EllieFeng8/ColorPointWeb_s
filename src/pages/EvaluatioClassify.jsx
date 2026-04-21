import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Save, Tag } from 'lucide-react';
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

function downloadCsv(filename, rows) {
  downloadFile(filename, `\uFEFF${toCsv(rows)}`, 'text/csv;charset=utf-8;');
}

function parseResponseBody(rawText, contentType) {
  if (!rawText) {
    return null;
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawText);
    } catch {
      return rawText;
    }
  }

  return rawText;
}

function extractErrorDetail(body) {
  if (!body) {
    return '';
  }

  if (typeof body === 'string') {
    return body.trim();
  }

  return (
    body.detail ||
    body.message ||
    body.error ||
    body.errors?.join?.(', ') ||
    JSON.stringify(body)
  );
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

function normalizeEvaluationResults(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return payload ? [payload] : [];
}

function extractPreprocessingId(payload) {
  return (
    payload?.preprocessing_id ??
    payload?.preprocessingId ??
    payload?.job?.preprocessing_id ??
    payload?.job?.preprocessingId ??
    payload?.result?.preprocessing_id ??
    payload?.result?.preprocessingId ??
    payload?.data?.preprocessing_id ??
    payload?.data?.preprocessingId ??
    ''
  );
}

function pickEvaluationResultRecord(records, activeModelId, activeTrainingJobId) {
  if (!records.length) {
    return null;
  }

  if (activeModelId) {
    const matchedModelRecord = records.find((record) =>
      String(record?.trained_model_id ?? record?._id ?? '') === String(activeModelId)
    );

    if (matchedModelRecord) {
      return matchedModelRecord;
    }
  }

  if (activeTrainingJobId) {
    const matchedTrainingRecord = records.find((record) =>
      String(record?.training_job_id ?? '') === String(activeTrainingJobId)
    );

    if (matchedTrainingRecord) {
      return matchedTrainingRecord;
    }
  }

  return records[0] ?? null;
}

const REGRESSION_METRICS = [
  { key: 'r_squared', label: 'R Squared' },
  { key: 'rmse', label: 'RMSE' },
  { key: 'rpd', label: 'RPD' },
  { key: 'mean_absolute_error', label: 'Mean Absolute Error' },
  { key: 'max_error', label: 'Max Error' },
  { key: 'mean_absolute_percentage_error', label: 'Mean Absolute Percentage Error' },
  { key: 'cv_folds_used', label: 'CV Folds Used' },
];

const CLASSIFICATION_METRICS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision_score', label: 'Precision Score' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1 Score' },
];

function getMetricDefinitions(taskCategory) {
  if (isRegressionTask(taskCategory)) {
    return REGRESSION_METRICS;
  }

  if (normalizeTaskCategory(taskCategory) === 'classification') {
    return CLASSIFICATION_METRICS;
  }

  return [];
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  return Number.isInteger(number) ? String(number) : number.toFixed(3);
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

function hasDisplayContent(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.some(hasDisplayContent);
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

function normalizeWarningMessages(warnings) {
  if (!hasDisplayContent(warnings)) {
    return [];
  }

  const warningItems = Array.isArray(warnings) ? warnings : [warnings];
  return warningItems
    .filter(hasDisplayContent)
    .map((warning) => (typeof warning === 'object' ? JSON.stringify(warning) : String(warning)));
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

function normalizeTaskCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function isRegressionTask(value) {
  return normalizeTaskCategory(value) === 'regression';
}

function isClassificationTask(value) {
  return normalizeTaskCategory(value) === 'classification';
}

function buildChartCsvRows(points) {
  return [
    ['actual', 'predicted'],
    ...points.map(({ actual, predicted }) => [actual, predicted])
  ];
}

function buildConfusionMatrixCsvRows(confusionMatrix) {
  const labels = confusionMatrix?.labels || [];
  const rows = confusionMatrix?.rows || [];

  return [
    ['actual \\ predicted', ...labels],
    ...rows.map((row, index) => [labels[index] || `Class ${index}`, ...row])
  ];
}

function getConfusionMatrixTotal(confusionMatrix) {
  return (confusionMatrix?.rows || [])
    .flat()
    .reduce((total, value) => total + (Number(value) || 0), 0);
}

function normalizeConfusionMatrix(source, fallbackLabels = []) {
  if (!source) {
    return { labels: [], rows: [] };
  }

  const matrix = Array.isArray(source)
    ? source
    : source.matrix || source.confusion_matrix || source.data || source.values;
  const labels = Array.isArray(source)
    ? fallbackLabels
    : source.labels || source.classes || source.class_labels || source.target_names || fallbackLabels;

  if (Array.isArray(matrix) && matrix.every((row) => Array.isArray(row))) {
    const rows = matrix.map((row) => row.map((cell) => Number(cell) || 0));
    const normalizedLabels = labels.length
      ? labels.map(String)
      : rows.map((_, index) => `Class ${index}`);

    return { labels: normalizedLabels, rows };
  }

  if (typeof source === 'object' && !Array.isArray(source)) {
    const actualLabels = Object.keys(source);
    const predictedLabels = Array.from(
      new Set(actualLabels.flatMap((actualLabel) => Object.keys(source[actualLabel] || {})))
    );
    const normalizedLabels = labels.length
      ? labels.map(String)
      : Array.from(new Set([...actualLabels, ...predictedLabels]));

    if (normalizedLabels.length) {
      return {
        labels: normalizedLabels,
        rows: normalizedLabels.map((actualLabel) => (
          normalizedLabels.map((predictedLabel) => Number(source[actualLabel]?.[predictedLabel]) || 0)
        )),
      };
    }
  }

  return { labels: [], rows: [] };
}

function getEvaluationLabels(evaluation) {
  const labels = (
    evaluation?.class_labels ||
    evaluation?.classes ||
    evaluation?.labels ||
    evaluation?.target_names ||
    []
  );

  return Array.isArray(labels) ? labels : [];
}

function getConfusionMatrixSource(evaluation, phase) {
  if (!evaluation) {
    return null;
  }

  if (phase === 'training') {
    return (
      evaluation.training_confusion_matrix ||
      evaluation.training_confusion_matrix_data ||
      evaluation.training_metrics?.confusion_matrix ||
      null
    );
  }

  return (
    evaluation.testing_confusion_matrix ||
    evaluation.testing_confusion_matrix_data ||
    evaluation.confusion_matrix ||
    evaluation.testing_metrics?.confusion_matrix ||
    null
  );
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
    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={cn('text-xl font-bold', isPrimary ? 'text-primary' : 'text-slate-700')}>{value}</p>
  </div>
);

const MetricsSection = ({ title, metrics, metricDefinitions }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
    <div className="mt-3 rounded-lg bg-white p-4">
      {metricDefinitions.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metricDefinitions.map(({ key, label }, index) => (
            <MetricCard
              key={key}
              label={label}
              value={formatMetricValue(metrics?.[key])}
              isPrimary={index === 0}
            />
          ))}
        </div>
      ) : (
        <p className="text-base font-medium text-slate-400">--</p>
      )}
    </div>
  </div>
);

const ConfusionMatrix = ({ labels, rows }) => {
  const maxValue = Math.max(...rows.flat(), 0);

  if (!labels.length || !rows.length) {
    return (
      <div className="flex h-56 min-h-[14rem] items-center justify-center rounded border border-slate-100 bg-slate-50/30 text-sm font-medium text-slate-400">
        No confusion matrix data
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded border border-slate-100 bg-slate-50/30 p-4">
      <div
        className="grid min-w-max gap-1"
        style={{ gridTemplateColumns: `minmax(5rem, auto) repeat(${labels.length}, minmax(4.5rem, 1fr))` }}
      >
        <div />
        {labels.map((label) => (
          <div key={`predicted-${label}`} className="px-2 py-1 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
            Pred {label}
          </div>
        ))}

        {rows.map((row, rowIndex) => (
          <React.Fragment key={`actual-${labels[rowIndex]}`}>
            <div className="flex items-center px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Actual {labels[rowIndex]}
            </div>
            {row.map((value, columnIndex) => {
              const intensity = maxValue ? value / maxValue : 0;

              return (
                <div
                  key={`${labels[rowIndex]}-${labels[columnIndex]}`}
                  className={cn(
                    'rounded-lg border px-3 py-4 text-center text-base font-bold',
                    rowIndex === columnIndex ? 'border-primary/30 text-primary' : 'border-slate-100 text-slate-700'
                  )}
                  style={{ backgroundColor: `rgba(101, 148, 117, ${0.08 + intensity * 0.32})` }}
                >
                  {formatDisplayValue(value)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

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
  taskCategory,
  confusionMatrix = { labels: [], rows: [] },
  loading = false,
  exportLabel = 'CSV 匯出',
  onExport,
  exportDisabled = false,
}) => {
  const domain = useMemo(() => getScatterDomain(data), [data]);
  const showConfusionMatrix = isClassificationTask(taskCategory);
  const resultCount = showConfusionMatrix ? getConfusionMatrixTotal(confusionMatrix) : data.length;

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
            <p className="mt-1 text-[11px] font-bold text-slate-400">{subtitle}: {resultCount}</p>
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

        {showConfusionMatrix ? (
          <ConfusionMatrix labels={confusionMatrix.labels} rows={confusionMatrix.rows} />
        ) : (
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
        )}

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
    routedTrainingJobId || contextTrainingJobId || ''
  );
  const activeModelId = String(routedModelId || contextBestModelId || '');

  const [fileName, setFileName] = useState('');
  const [version, setVersion] = useState('');
  const [trainingCsvContent, setTrainingCsvContent] = useState('');
  const [isTrainingCsvLoading, setIsTrainingCsvLoading] = useState(false);
  const [trainingCsvError, setTrainingCsvError] = useState('');
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isEvaluationResultLoading, setIsEvaluationResultLoading] = useState(false);
  const [evaluationResultError, setEvaluationResultError] = useState('');
  const [trainingJobDetail, setTrainingJobDetail] = useState(null);
  const [trainingJobDetailError, setTrainingJobDetailError] = useState('');
  const [modelDetail, setModelDetail] = useState(null);
  const [isModelDetailLoading, setIsModelDetailLoading] = useState(false);
  const [modelDetailError, setModelDetailError] = useState('');
  const [modelExportError, setModelExportError] = useState('');
  const [isModelExporting, setIsModelExporting] = useState(false);
  const [modelExportSuccess, setModelExportSuccess] = useState('');

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
    if (!activeTrainingJobId) {
      setEvaluationResult(null);
      setEvaluationResultError('缺少 training_job_id，無法取得評估結果。');
      return;
    }

    let cancelled = false;

    async function fetchEvaluationResult() {
      setIsEvaluationResultLoading(true);
      setEvaluationResultError('');

      try {
        const response = await fetch(`/api/evaluation/results/${encodeURIComponent(activeTrainingJobId)}`, {
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

        setEvaluationResult(body);
      } catch (error) {
        if (!cancelled) {
          setEvaluationResult(null);
          setEvaluationResultError(error instanceof Error ? error.message : '取得評估結果失敗');
        }
      } finally {
        if (!cancelled) {
          setIsEvaluationResultLoading(false);
        }
      }
    }

    fetchEvaluationResult();

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
      const requestUrl = `/api/evaluation/model/${encodeURIComponent(activeModelId)}`;

      try {
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });

        const contentType = response.headers.get('content-type') || '';
        const rawText = await response.text().catch(() => '');
        const body = parseResponseBody(rawText, contentType);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const detail = extractErrorDetail(body);
          throw new Error(
            `模型詳細資訊載入失敗 (${response.status} ${response.statusText})${detail ? `: ${detail}` : ''}`
          );
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

  const selectedEvaluationResult = useMemo(
    () => pickEvaluationResultRecord(
      normalizeEvaluationResults(evaluationResult),
      activeModelId,
      activeTrainingJobId
    ),
    [evaluationResult, activeModelId, activeTrainingJobId]
  );
  const trainingChartData = useMemo(
    () => normalizeScatterData(selectedEvaluationResult?.training_chart_data),
    [selectedEvaluationResult]
  );
  const testingChartData = useMemo(
    () => normalizeScatterData(selectedEvaluationResult?.testing_chart_data),
    [selectedEvaluationResult]
  );
  const trainingMetrics = useMemo(() => selectedEvaluationResult?.training_metrics || {}, [selectedEvaluationResult]);
  const testingMetrics = useMemo(() => selectedEvaluationResult?.testing_metrics || {}, [selectedEvaluationResult]);
  const modelSummary = useMemo(() => modelDetail?.model || modelDetail || null, [modelDetail]);
  const modelNote = useMemo(() => modelSummary?.note ?? modelDetail?.note ?? null, [modelDetail, modelSummary]);
  const modelWarnings = useMemo(
    () => normalizeWarningMessages(modelSummary?.warnings ?? modelDetail?.warnings),
    [modelDetail, modelSummary]
  );
  const preprocessingId = useMemo(
    () => (
      location.state?.preprocessingId ||
      extractPreprocessingId(trainingJobDetail) ||
      extractPreprocessingId(modelDetail) ||
      extractPreprocessingId(selectedEvaluationResult)
    ),
    [location.state?.preprocessingId, trainingJobDetail, modelDetail, selectedEvaluationResult]
  );
  const taskCategory = useMemo(
    () => selectedEvaluationResult?.task_category || modelSummary?.task_category || '',
    [selectedEvaluationResult, modelSummary]
  );
  const metricDefinitions = useMemo(() => getMetricDefinitions(taskCategory), [taskCategory]);
  const evaluationLabels = useMemo(() => getEvaluationLabels(selectedEvaluationResult), [selectedEvaluationResult]);
  const trainingConfusionMatrix = useMemo(
    () => normalizeConfusionMatrix(getConfusionMatrixSource(selectedEvaluationResult, 'training'), evaluationLabels),
    [evaluationLabels, selectedEvaluationResult]
  );
  const testingConfusionMatrix = useMemo(
    () => normalizeConfusionMatrix(getConfusionMatrixSource(selectedEvaluationResult, 'testing'), evaluationLabels),
    [evaluationLabels, selectedEvaluationResult]
  );
  const isClassification = useMemo(() => isClassificationTask(taskCategory), [taskCategory]);
  const hasTestingConfusionMatrix = useMemo(
    () => testingConfusionMatrix.labels.length > 0 && testingConfusionMatrix.rows.length > 0,
    [testingConfusionMatrix]
  );
  const modelParamsUsed = useMemo(() => Object.entries(modelSummary?.params_used || {}), [modelSummary]);
  const hyperparameterTuning = useMemo(
    () => trainingJobDetail?.hyperparameter_tuning || trainingJobDetail?.job?.hyperparameter_tuning || null,
    [trainingJobDetail]
  );
  const hyperparameterConfig = useMemo(() => Object.entries(hyperparameterTuning || {}), [hyperparameterTuning]);

  useEffect(() => {
    setFileName(modelSummary?.model_name ?? '');
  }, [activeModelId, modelSummary?.model_name]);

  useEffect(() => {
    setVersion(modelNote ?? '');
  }, [activeModelId, modelNote]);

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
    const rows = isClassification
      ? buildConfusionMatrixCsvRows(testingConfusionMatrix)
      : buildChartCsvRows(testingChartData);

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
      setModelExportError('缺少 best_model_id，無法儲存模型。');
      setModelExportSuccess('');
      return;
    }

    if (!preprocessingId) {
      setModelExportError('缺少 preprocessing_id，無法儲存模型。');
      setModelExportSuccess('');
      return;
    }

    if (!fileName.trim()) {
      setModelExportError('請填寫 Model Name。');
      setModelExportSuccess('');
      return;
    }

    setIsModelExporting(true);
    setModelExportError('');
    setModelExportSuccess('');

    try {
      const payload = {
        name: fileName.trim(),
        description: version.trim(),
        task_category: taskCategory || 'regression',
        model_ids: [activeModelId],
        preprocessing_id: preprocessingId
      };
      console.log('[EvaluatioClassify] Saving default model payload:', payload);

      const response = await fetch('/api/default-models/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text().catch(() => '');
      const body = parseResponseBody(rawText, contentType);
      console.log('[EvaluatioClassify] Save default model response:', {
        status: response.status,
        ok: response.ok,
        body
      });

      if (!response.ok) {
        const detail = extractErrorDetail(body);
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }
      const successMessage = typeof body === 'string'
        ? body
        : body?.message || body?.detail || '模型已儲存。';
      setModelExportSuccess(successMessage);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.log('[EvaluatioClassify] Save default model failed:', error);
        setModelExportError(error instanceof Error ? error.message : '儲存模型失敗');
        setModelExportSuccess('');
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
                {evaluationResultError ? (
                  <p className="text-xs font-medium text-red-600">{evaluationResultError}</p>
                ) : null}
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ScatterPanel
                title="訓練結果 (Training Results)"
                subtitle="樣本總數"
                data={trainingChartData}
                taskCategory={taskCategory}
                confusionMatrix={trainingConfusionMatrix}
                loading={isEvaluationResultLoading}
                onExport={handleTrainingExport}
                exportDisabled={!trainingCsvContent || isTrainingCsvLoading}
              />

              <ScatterPanel
                title="測試結果 (Testing Results)"
                subtitle="獨立驗證集"
                data={testingChartData}
                taskCategory={taskCategory}
                confusionMatrix={testingConfusionMatrix}
                loading={isEvaluationResultLoading}
                onExport={handleTestingExport}
                exportDisabled={(isClassification ? !hasTestingConfusionMatrix : !testingChartData.length) || isEvaluationResultLoading}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800">模型儲存</h3>

                  {!activeModelId ? (
                    <p className="mt-2 text-xs font-medium text-red-600">缺少 best_model_id，暫時無法儲存模型。</p>
                  ) : null}
                  {!preprocessingId ? (
                    <p className="mt-2 text-xs font-medium text-red-600">缺少 preprocessing_id，暫時無法儲存模型。</p>
                  ) : null}
                  {modelExportError ? (
                    <p className="mt-2 text-xs font-medium text-red-600">{modelExportError}</p>
                  ) : null}
                  {modelExportSuccess ? (
                    <p className="mt-2 text-xs font-medium text-emerald-600">{modelExportSuccess}</p>
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
                      Model Name
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
                      Note
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

                  <button
                    type="submit"
                    disabled={isModelExporting || !activeModelId || !preprocessingId}
                    className={cn(
                      'mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white shadow-sm transition-all active:scale-[0.98]',
                      isModelExporting || !activeModelId || !preprocessingId
                        ? 'cursor-not-allowed bg-slate-300'
                        : 'bg-primary hover:bg-primary-hover'
                    )}
                  >
                    <Save className="size-5" />
                    {isModelExporting ? '儲存中...' : '儲存模型'}
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

                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Model Name</p>
                          <p className="mt-2 text-base font-semibold text-slate-700">
                            {formatDisplayValue(modelSummary?.model_name)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Category</p>
                          <p className="mt-2 text-base font-semibold text-slate-700">
                            {formatDisplayValue(modelSummary?.task_category)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Params Used</p>
                        <div className="mt-3 rounded-lg bg-white p-4">
                          {modelParamsUsed.length ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {modelParamsUsed.map(([key, value]) => (
                                <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    {formatKeyLabel(key)}
                                  </p>
                                  <p className="mt-1 text-base font-semibold text-slate-700">
                                    {formatDisplayValue(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-base font-medium text-slate-400">--</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {(hasDisplayContent(modelNote) || modelWarnings.length) ? (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                        {hasDisplayContent(modelNote) ? (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Note</p>
                            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm font-medium text-slate-700">
                              {formatDisplayValue(modelNote)}
                            </p>
                          </div>
                        ) : null}

                        {modelWarnings.length ? (
                          <div className={hasDisplayContent(modelNote) ? 'mt-4' : ''}>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Warnings</p>
                            <ul className="mt-2 space-y-2 rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-800">
                              {modelWarnings.map((warning, index) => (
                                <li key={`${warning}-${index}`} className="flex gap-2">
                                  <span aria-hidden="true">-</span>
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Hyperparameter Tuning</p>
                      <div className="mt-3 rounded-lg bg-white p-4">
                        {hyperparameterConfig.length ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {hyperparameterConfig.map(([key, value]) => (
                              <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  {formatKeyLabel(key)}
                                </p>
                                <p className="mt-1 text-base font-semibold text-slate-700">
                                  {formatDisplayValue(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-base font-medium text-slate-400">--</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <MetricsSection
                      title="Training Results"
                      metrics={trainingMetrics}
                      metricDefinitions={metricDefinitions}
                    />
                    <MetricsSection
                      title="Testing Results"
                      metrics={testingMetrics}
                      metricDefinitions={metricDefinitions}
                    />
                  </div>
                </div>
              </motion.div>


            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
