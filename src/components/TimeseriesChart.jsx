/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 時間序列結果視覺化（對應後端 §7-4 畫圖建議）：
 *   - anomaly     ：原始序列 + 異常點紅點 + 分數副圖 + threshold 水平線
 *   - changepoint ：原始序列 + 變點垂直線
 *   - forecast    ：歷史序列 + 預測線 + lower/upper 風險帶
 */

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const BRAND = '#659475';
const BRAND_SOFT = 'rgba(101, 148, 117, 0.16)';
const DANGER = '#ef4444';
const GRID_LINE = '#f1f5f9';
const AXIS_LABEL = '#94a3b8';

function toSeriesArray(values) {
  return Array.isArray(values) ? values.map((v) => (v === null || v === undefined ? null : Number(v))) : [];
}

function buildAnomalyOption(data, result) {
  const series = toSeriesArray(data);
  const scores = toSeriesArray(result?.scores_normalized?.length ? result.scores_normalized : result?.scores);
  const anomalies = Array.isArray(result?.anomalies) ? result.anomalies : [];
  const threshold = Number(result?.threshold);
  const axis = series.map((_, index) => index);

  const anomalyPoints = anomalies
    .map((index) => (Number.isInteger(index) && index >= 0 && index < series.length
      ? [index, series[index]]
      : null))
    .filter(Boolean);

  const hasScores = scores.length > 0;

  return {
    grid: hasScores
      ? [
          { top: 24, left: 52, right: 24, height: '52%' },
          { left: 52, right: 24, top: '72%', bottom: 60 }
        ]
      : [{ top: 24, left: 52, right: 24, bottom: 60 }],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#111827' },
      extraCssText: 'box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); border-radius: 12px;'
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    xAxis: hasScores
      ? [
          { type: 'category', data: axis, gridIndex: 0, boundaryGap: false, axisLabel: { color: AXIS_LABEL, fontSize: 10 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
          { type: 'category', data: axis, gridIndex: 1, boundaryGap: false, axisLabel: { color: AXIS_LABEL, fontSize: 10 }, axisLine: { lineStyle: { color: '#e2e8f0' } } }
        ]
      : [{ type: 'category', data: axis, boundaryGap: false, axisLabel: { color: AXIS_LABEL, fontSize: 10 }, axisLine: { lineStyle: { color: '#e2e8f0' } } }],
    yAxis: hasScores
      ? [
          { type: 'value', gridIndex: 0, name: '序列值', nameTextStyle: { color: AXIS_LABEL, fontSize: 10 }, axisLabel: { color: AXIS_LABEL, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_LINE } } },
          { type: 'value', gridIndex: 1, name: '異常分數', nameTextStyle: { color: AXIS_LABEL, fontSize: 10 }, axisLabel: { color: AXIS_LABEL, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_LINE } } }
        ]
      : [{ type: 'value', axisLabel: { color: AXIS_LABEL, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_LINE } } }],
    dataZoom: [
      { type: 'inside', xAxisIndex: hasScores ? [0, 1] : [0], filterMode: 'none' },
      { type: 'slider', xAxisIndex: hasScores ? [0, 1] : [0], height: 18, bottom: 20, borderColor: '#e2e8f0', fillerColor: BRAND_SOFT }
    ],
    series: [
      {
        name: '序列',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: series,
        showSymbol: false,
        smooth: false,
        lineStyle: { color: BRAND, width: 1.6 }
      },
      {
        name: '異常點',
        type: 'scatter',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: anomalyPoints,
        symbolSize: 8,
        itemStyle: { color: DANGER }
      },
      ...(hasScores
        ? [
            {
              name: '異常分數',
              type: 'line',
              xAxisIndex: 1,
              yAxisIndex: 1,
              data: scores,
              showSymbol: false,
              lineStyle: { color: '#f59e0b', width: 1.4 },
              areaStyle: { color: 'rgba(245, 158, 11, 0.10)' },
              markLine: Number.isFinite(threshold)
                ? {
                    silent: true,
                    symbol: 'none',
                    lineStyle: { color: DANGER, type: 'dashed', width: 1.4 },
                    label: { formatter: `threshold ${threshold.toFixed(3)}`, color: DANGER, fontSize: 10 },
                    data: [{ yAxis: threshold }]
                  }
                : undefined
            }
          ]
        : [])
    ]
  };
}

function buildChangepointOption(data, result) {
  const series = toSeriesArray(data);
  const axis = series.map((_, index) => index);
  const changepoints = Array.isArray(result?.changepoints) ? result.changepoints : [];

  const markLineData = changepoints
    .filter((index) => Number.isInteger(index) && index >= 0 && index < series.length)
    .map((index) => ({ xAxis: index }));

  return {
    grid: { top: 24, left: 52, right: 24, bottom: 60 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#111827' },
      extraCssText: 'box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); border-radius: 12px;'
    },
    xAxis: { type: 'category', data: axis, boundaryGap: false, axisLabel: { color: AXIS_LABEL, fontSize: 10 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value', axisLabel: { color: AXIS_LABEL, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_LINE } } },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'slider', xAxisIndex: 0, height: 18, bottom: 20, borderColor: '#e2e8f0', fillerColor: BRAND_SOFT }
    ],
    series: [
      {
        name: '序列',
        type: 'line',
        data: series,
        showSymbol: false,
        lineStyle: { color: BRAND, width: 1.6 },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#6366f1', type: 'solid', width: 1.4, opacity: 0.7 },
          label: { show: false },
          data: markLineData
        }
      }
    ]
  };
}

function buildForecastOption(data, result) {
  const history = toSeriesArray(data);
  const forecast = toSeriesArray(result?.forecast);
  const lower = toSeriesArray(result?.lower);
  const upper = toSeriesArray(result?.upper);

  const T = history.length;
  const H = forecast.length;
  const axis = [];
  for (let i = 0; i < T + H; i += 1) {
    axis.push(i);
  }

  // 歷史線：0..T-1 有值，其後為 null。
  const historyData = history.concat(new Array(H).fill(null));

  // 預測線：從 T-1（接上歷史尾端）到 T+H-1。
  const forecastData = new Array(T + H).fill(null);
  if (T > 0 && H > 0) {
    forecastData[T - 1] = history[T - 1];
  }
  for (let i = 0; i < H; i += 1) {
    forecastData[T + i] = forecast[i];
  }

  // 風險帶：以 lower 為基線（透明），再堆疊 (upper - lower) 的面積。
  const hasBand = lower.length === H && upper.length === H && H > 0;
  const lowerData = new Array(T + H).fill(null);
  const bandData = new Array(T + H).fill(null);
  if (hasBand) {
    // 讓風險帶從歷史尾端（T-1）零寬度起步，視覺上與歷史線接上、不留缺口。
    if (T > 0) {
      lowerData[T - 1] = history[T - 1];
      bandData[T - 1] = 0;
    }
    for (let i = 0; i < H; i += 1) {
      const lo = lower[i];
      const up = upper[i];
      if (lo !== null && up !== null) {
        lowerData[T + i] = lo;
        bandData[T + i] = Math.max(0, up - lo);
      }
    }
  }

  return {
    grid: { top: 24, left: 52, right: 24, bottom: 60 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#111827' },
      extraCssText: 'box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); border-radius: 12px;'
    },
    legend: {
      top: 0,
      right: 16,
      textStyle: { color: AXIS_LABEL, fontSize: 11 },
      data: ['歷史', '預測']
    },
    xAxis: { type: 'category', data: axis, boundaryGap: false, axisLabel: { color: AXIS_LABEL, fontSize: 10 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value', axisLabel: { color: AXIS_LABEL, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_LINE } } },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'slider', xAxisIndex: 0, height: 18, bottom: 20, borderColor: '#e2e8f0', fillerColor: BRAND_SOFT }
    ],
    series: [
      // 風險帶（stack）：先 lower 基線（透明），再堆疊帶寬。
      {
        name: '__band_lower',
        type: 'line',
        data: lowerData,
        stack: 'confidence',
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        silent: true,
        tooltip: { show: false },
        legendHoverLink: false
      },
      {
        name: '95% 風險區間',
        type: 'line',
        data: bandData,
        stack: 'confidence',
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { color: BRAND_SOFT },
        silent: true,
        tooltip: { show: false },
        legendHoverLink: false
      },
      {
        name: '歷史',
        type: 'line',
        data: historyData,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { color: '#94a3b8', width: 1.6 }
      },
      {
        name: '預測',
        type: 'line',
        data: forecastData,
        showSymbol: false,
        connectNulls: true,
        lineStyle: { color: BRAND, width: 2, type: 'dashed' }
      }
    ]
  };
}

function buildOption(mode, data, result) {
  if (mode === 'anomaly') {
    return buildAnomalyOption(data, result);
  }
  if (mode === 'changepoint') {
    return buildChangepointOption(data, result);
  }
  if (mode === 'forecast') {
    return buildForecastOption(data, result);
  }
  return null;
}

export default function TimeseriesChart({ mode, data = [], result = null, height = 420 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const chart = echarts.getInstanceByDom(container) ?? echarts.init(container);
    const option = buildOption(mode, data, result);

    if (!option || !result || !Array.isArray(data) || data.length === 0) {
      chart.clear();
      chart.showLoading({
        text: '尚無結果',
        showSpinner: false,
        fontSize: 14,
        color: AXIS_LABEL,
        textColor: AXIS_LABEL,
        maskColor: 'rgba(255,255,255,0.8)'
      });
    } else {
      chart.hideLoading();
      chart.setOption(option, true);
    }

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [mode, data, result]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
