import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, CloudUpload, Trash2, CheckCircle2 } from 'lucide-react';
import swal from 'sweetalert';
import NavBar from '../components/NavBar.jsx';
import Footer from '../components/Footer.jsx';

const initialFiles = [];
const uploadEndpoint = '/api/upload/';

function getUploadRecordId(payload) {
  return payload?.id ?? payload?._id ?? payload?.data?.id ?? payload?.data?._id ?? null;
}

function getFileId(payload) {
  return payload?.fileId ?? payload?.file_id ?? payload?.data?.fileId ?? payload?.data?.file_id ?? null;
}

function normalizeUploadList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function getUploadRecordTimestamp(record) {
  const rawTimestamp =
    record?.uploaded_at ??
    record?.created_at ??
    record?.updated_at ??
    record?.timestamp ??
    null;

  if (!rawTimestamp) {
    return 0;
  }

  const parsed = new Date(rawTimestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getLatestUploadRecord(records) {
  return [...records].sort(
    (left, right) => getUploadRecordTimestamp(right) - getUploadRecordTimestamp(left)
  )[0] ?? null;
}

function getMatchedUploadRecord(records, uploadRecordId) {
  if (!uploadRecordId) {
    return null;
  }

  return records.find((record) => {
    const recordId = record?.id ?? record?._id ?? record?.data?.id ?? record?.data?._id ?? null;
    return recordId === uploadRecordId;
  }) ?? null;
}

function getMatchedFileId(record) {
  return record?.fileId ?? record?.file_id ?? record?.file?.id ?? record?.data?.fileId ?? null;
}

function formatMetricValue(value) {
  return value ?? '--';
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadTime(timestamp) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp));
}

function mapFilesToRows(fileList) {
  return Array.from(fileList).map((file) => ({
    id: `${file.name}-${file.lastModified}-${file.size}`,
    rawFile: file,
    name: file.name,
    size: formatFileSize(file.size),
    uploadTime: formatUploadTime(Date.now()),
    samples: '--',
    wavenumberMin: '--',
    wavenumberMax: '--',
    status: 'uploading',
    isDeleting: false,
    error: '',
    response: null,
    uploadRecordId: null,
    fileId: null
  }));
}

export default function Home() {
  const [files, setFiles] = useState(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const selectedFile = files[0] ?? null;



  const fetchUploadSummary = async (rowId, uploadRecordId) => {
    const response = await fetch(uploadEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`GET /api/upload/ failed with HTTP ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    const records = normalizeUploadList(payload);
    const matchedRecord =
      getMatchedUploadRecord(records, uploadRecordId) ?? getLatestUploadRecord(records);

    console.log('[upload] summary lookup', {
      uploadRecordId,
      totalRecords: records.length,
      matchedRecord
    });

    if (!matchedRecord) {
      throw new Error('No upload records found in GET /api/upload/');
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
          file.id === rowId
            ? {
                ...file,
                name: matchedRecord.filename ?? file.name,
                uploadTime: matchedRecord.uploaded_at
                  ? formatUploadTime(matchedRecord.uploaded_at)
                  : file.uploadTime,
                samples: formatMetricValue(matchedRecord.total_samples),
                wavenumberMin: formatMetricValue(matchedRecord.wavenumber_min),
                wavenumberMax: formatMetricValue(matchedRecord.wavenumber_max),
                uploadRecordId: matchedRecord.id ?? matchedRecord._id ?? file.uploadRecordId,
                fileId: getMatchedFileId(matchedRecord) ?? file.fileId
              }
            : file
        )
    );
  };

  const uploadFile = async (row) => {
    const formData = new FormData();
    formData.append('file', row.rawFile, row.rawFile.name);
    console.log('[upload] start', {
      endpoint: uploadEndpoint,
      name: row.rawFile.name,
      size: row.rawFile.size,
      type: row.rawFile.type,
      fields: Array.from(formData.keys())
    });

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData
      });
      const responseContentType = response.headers.get('content-type') || '';
      const responseBody = responseContentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');
      console.log('[upload] response', {
        name: row.rawFile.name,
        status: response.status,
        ok: response.ok,
        contentType: responseContentType,
        body: responseBody
      });

      if (!response.ok) {
        const detail = typeof responseBody === 'string'
          ? responseBody
          : responseBody?.detail || responseBody?.message || JSON.stringify(responseBody);
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      const data = responseBody;
      const uploadRecordId = getUploadRecordId(data);
      const fileId = getFileId(data);
      console.log('[upload] success', {
        name: row.rawFile.name,
        data,
        uploadRecordId,
        fileId
      });

      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === row.id
            ? {
                ...file,
                status: 'uploaded',
                error: '',
                response: data,
                uploadRecordId,
                fileId
              }
            : file
        )
      );

      await fetchUploadSummary(row.id, uploadRecordId);
    } catch (error) {
      console.log('[upload] error', {
        name: row.rawFile.name,
        error
      });
      const errorMessage = error instanceof TypeError
        ? 'Failed to fetch: check Vite proxy, backend address, or CORS.'
        : error instanceof Error
          ? error.message
          : 'Upload failed';
      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === row.id
            ? {
                ...file,
                status: 'error',
                error: errorMessage
              }
            : file
        )
      );
    }
  };

  const addFiles = (fileList) => {
    const [selectedFile] = Array.from(fileList);
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      console.log('[upload] rejected file', {
        name: selectedFile.name,
        reason: 'Only .csv files are allowed.'
      });
      swal('檔案格式錯誤', '目前只允許上傳 .csv 檔案。', 'warning');
      return;
    }

    const [nextFile] = mapFilesToRows([selectedFile]);
    console.log('[upload] selected file', nextFile.name);

    setFiles([nextFile]);
    uploadFile(nextFile);
  };

  const removeFile = async (id) => {
    const targetFile = files.find((file) => file.id === id);
    if (!targetFile) {
      return;
    }

    const shouldDelete = await swal({
      title: '確認刪除',
      text: `確定要刪除 ${targetFile.name} 嗎？`,
      icon: 'warning',
      buttons: ['取消', '刪除'],
      dangerMode: true
    });

    if (!shouldDelete) {
      return;
    }

    if (!targetFile.fileId) {
      setFiles((currentFiles) => currentFiles.filter((file) => file.id !== id));
      await swal('已刪除', '檔案已從列表移除。', 'success');
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === id
          ? {
              ...file,
              isDeleting: true,
              error: ''
            }
          : file
      )
    );

    try {
      const response = await fetch(`/api/upload/${targetFile.fileId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json'
        }
      });

      const responseContentType = response.headers.get('content-type') || '';
      const responseBody = responseContentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

      if (!response.ok) {
        const detail = typeof responseBody === 'string'
          ? responseBody
          : responseBody?.detail || responseBody?.message || JSON.stringify(responseBody);
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }

      setFiles((currentFiles) => currentFiles.filter((file) => file.id !== id));
      await swal('已刪除', '檔案已成功刪除。', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '刪除檔案失敗';
      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === id
            ? {
                ...file,
                isDeleting: false,
                error: errorMessage
              }
            : file
        )
      );
      await swal('刪除失敗', errorMessage, 'error');
    }
  };

  const resetForm = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const { files: selectedFiles } = event.target;
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    addFiles(selectedFiles);
    event.target.value = '';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = event.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) {
      return;
    }

    addFiles(droppedFiles);
  };

  return (
    <div className="flex h-screen overflow-hidden font-display">
      <NavBar />

      <main className="flex-1 overflow-y-auto bg-white px-12 pt-12 pb-32">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex justify-between items-start">
            <div className="space-y-2">
              <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-extrabold tracking-tight text-[#111827]"
              >
                匯入光譜檔案
              </motion.h2>
              <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-slate-500 text-lg"
              >
                請上傳或拖放單一 .csv 光譜數據檔案
              </motion.p>
            </div>
          </header>

          <section>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <motion.div
              whileHover={{ scale: 1.005 }}
              onClick={openFilePicker}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-20 transition-all cursor-pointer ${
                isDragging
                  ? 'border-[#82b091] bg-[#82b091]/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-[#82b091] hover:bg-[#82b091]/5'
              }`}
            >
              <div className="relative flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#82b091] shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  <CloudUpload size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#111827]">拖放檔案至此處</h3>
                  <p className="text-slate-400">或點擊按鈕從您的電腦選取檔案</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openFilePicker();
                  }}
                  className="bg-[#82b091] hover:bg-[#659475] text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#82b091]/25 transition-all active:scale-95"
                >
                  選擇檔案
                </button>
              </div>
            </motion.div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold flex items-center gap-3 text-[#111827]">
                <div className="w-8 h-8 rounded-lg bg-[#82b091]/10 flex items-center justify-center text-[#82b091]">
                  <FileText size={20} />
                </div>
                已選擇的檔案資訊
              </h3>
              <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#82b091]" />
                {files.length} 個檔案已就緒
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">檔名</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">檔案大小</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">上傳時間</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">狀態</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">樣本數</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">最小波數</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500">最大波數</th>
                      <th className="px-8 py-5 text-xs font-extrabold uppercase tracking-widest text-slate-500 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence>
                      {files.map((file) => (
                        <motion.tr
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded bg-[#82b091]/10 flex items-center justify-center text-[#82b091]">
                                <FileText size={16} />
                              </div>
                              <span className="text-sm font-bold text-[#111827]">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{file.size}</td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{file.uploadTime}</td>
                          <td className="px-8 py-5">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                file.status === 'uploaded'
                                  ? 'bg-[#82b091]/10 text-[#659475] border-[#82b091]/10'
                                  : file.status === 'error'
                                    ? 'bg-red-50 text-red-600 border-red-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}
                              title={file.error || undefined}
                            >
                              {file.status === 'uploaded'
                                ? '上傳成功'
                                : file.status === 'error'
                                  ? '上傳失敗'
                                  : '上傳中'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#82b091]/10 text-[#659475] border border-[#82b091]/10">
                              {file.samples}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{file.wavenumberMin}</td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{file.wavenumberMax}</td>
                          <td className="px-8 py-5 text-right">
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              disabled={file.isDeleting}
                              title={file.isDeleting ? '刪除中...' : '刪除檔案'}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                file.isDeleting
                                  ? 'cursor-not-allowed text-slate-200'
                                  : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                              }`}
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {files.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-8 py-12 text-center text-slate-400 italic">
                          尚未選擇任何檔案
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <Footer
            primaryLabel="下一步：前處理"
            primaryTo="/preprocessing"
            primaryState={{
              fileId: selectedFile?.fileId ?? '',
              uploadRecordId: selectedFile?.uploadRecordId ?? '',
              fileName: selectedFile?.name ?? ''
            }}
            secondaryLabel="取消"
            onSecondaryClick={resetForm}
          />
        </div>
      </main>
    </div>
  );
}
