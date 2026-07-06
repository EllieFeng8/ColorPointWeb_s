/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 純函式：時間序列輸入解析與驗證。
 * 自 src/pages/Timeseries.jsx 抽出（行為完全一致），無 React / echarts 依賴，
 * 可被 Node 直接匯入以做單元測試。
 */

export function coerceArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { error: 'data 不可為空陣列。' };
  }

  if (Array.isArray(arr[0])) {
    const width = arr[0].length;
    const data = [];
    for (const row of arr) {
      if (!Array.isArray(row) || row.length !== width) {
        return { error: '多變量資料每列（時間點）長度需一致。' };
      }
      const nums = row.map(Number);
      if (nums.some((n) => Number.isNaN(n))) {
        return { error: '多變量資料含非數字值。' };
      }
      data.push(nums);
    }
    return { data, shape: { T: data.length, C: width } };
  }

  const nums = arr.map(Number);
  if (nums.some((n) => Number.isNaN(n))) {
    return { error: '序列含非數字值。' };
  }
  return { data: nums, shape: { T: nums.length, C: 1 } };
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { error: 'CSV 無有效內容。' };
  }

  const firstCells = lines[0].split(',');
  const headerLikely = firstCells.some((cell) => cell.trim() !== '' && Number.isNaN(Number(cell.trim())));
  const bodyLines = headerLikely ? lines.slice(1) : lines;
  if (bodyLines.length === 0) {
    return { error: 'CSV 僅有標題列，沒有資料。' };
  }

  const rows = bodyLines.map((line) => line.split(',').map((cell) => Number(cell.trim())));
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width || row.some((n) => Number.isNaN(n)))) {
    return { error: 'CSV 需為數值矩陣，且每列欄數一致。' };
  }

  if (width === 1) {
    return { data: rows.map((row) => row[0]), shape: { T: rows.length, C: 1 } };
  }
  return { data: rows, shape: { T: rows.length, C: width } };
}

export function parseSeriesInput(text, fileName = '') {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { error: '請提供序列資料（data 不可為空）。' };
  }

  let json = null;
  try {
    json = JSON.parse(trimmed);
  } catch {
    json = null;
  }

  if (Array.isArray(json)) {
    return coerceArray(json);
  }
  if (json && typeof json === 'object' && Array.isArray(json.data)) {
    return coerceArray(json.data);
  }

  // 只有「多行」或明確的 .csv 檔才當成矩陣解析；單行（不論逗號或空白分隔）
  // 一律視為一維序列，避免把貼上的 "1, 2, 3, 4" 誤判成 1×4 的多變量。
  const looksCsv = fileName.toLowerCase().endsWith('.csv') || trimmed.includes('\n');
  if (looksCsv) {
    return parseCsv(trimmed);
  }

  const parts = trimmed.split(/[\s,]+/).filter(Boolean).map(Number);
  if (parts.length > 0 && parts.every((n) => !Number.isNaN(n))) {
    return coerceArray(parts);
  }

  return { error: '無法解析為數字序列。請貼上 JSON 陣列，或以逗號／換行分隔的數字。' };
}

export function toDisplaySeries(data, channel = 0) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  if (Array.isArray(data[0])) {
    return data.map((row) => Number(row[channel] ?? row[0]));
  }
  return data.map(Number);
}

export function parseAdvancedParams(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {};
  }
  try {
    const obj = JSON.parse(trimmed);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}
