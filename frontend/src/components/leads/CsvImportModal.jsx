import React, { useState, useEffect, useRef } from 'react';
import {
  X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle,
  RefreshCw, Database, ArrowRight, FileText, Check
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CsvImportModal({ isOpen, onClose, onImportComplete }) {
  const { success, error: toastError, info } = useToast();

  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'workspace'
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);

  // Workspace files
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [loadingWorkspaceFiles, setLoadingWorkspaceFiles] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFileContent('');
      setPreviewRows([]);
      setPreviewColumns([]);
      setResultSummary(null);
      return;
    }
    fetchWorkspaceFiles();
  }, [isOpen]);

  const fetchWorkspaceFiles = async () => {
    setLoadingWorkspaceFiles(true);
    try {
      const res = await fetch('/api/chennai-leads/available-csv-files');
      if (res.ok) {
        const data = await res.json();
        setWorkspaceFiles(data.files || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingWorkspaceFiles(false);
    }
  };

  const parseCsvPreview = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    setPreviewColumns(headers);

    const rows = lines.slice(1, 4).map((line) => {
      const vals = parseLine(line);
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = vals[idx] || '';
      });
      return rowObj;
    });
    setPreviewRows(rows);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      toastError('Please select a valid .csv file.');
      return;
    }

    setFile(selected);
    setResultSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setFileContent(text);
      parseCsvPreview(text);
    };
    reader.readAsText(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;

    if (!dropped.name.toLowerCase().endsWith('.csv')) {
      toastError('Please drop a valid .csv file.');
      return;
    }

    setFile(dropped);
    setResultSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setFileContent(text);
      parseCsvPreview(text);
    };
    reader.readAsText(dropped);
  };

  const handleUploadSubmit = async () => {
    if (!fileContent) {
      toastError('Please select a CSV file first.');
      return;
    }

    setIsImporting(true);
    info(`Importing leads from ${file?.name || 'CSV'}...`);

    try {
      const res = await fetch('/api/chennai-leads/import-raw-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: fileContent,
          filename: file?.name || 'Uploaded_Leads.csv'
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to import CSV');
      }

      const json = await res.json();
      setResultSummary(json.data);
      success(json.message || `Imported ${json.data.imported} new leads!`);
      onImportComplete?.();
    } catch (err) {
      console.error(err);
      toastError(err.message || 'Error processing CSV file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadWorkspaceFile = async (item) => {
    setIsImporting(true);
    info(`Loading ${item.filename} into pipeline...`);
    try {
      const res = await fetch('/api/chennai-leads/import-workspace-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: item.path, filename: item.filename })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to import file');
      }

      const json = await res.json();
      setResultSummary(json.data);
      success(json.message || `Loaded ${json.data.imported} leads!`);
      onImportComplete?.();
    } catch (err) {
      console.error(err);
      toastError(err.message || 'Error loading file');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-[760px] max-h-[90vh] bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--text)]">
                Import Leads Dataset (CSV)
              </h3>
              <p className="text-[12px] text-[var(--muted)]">
                Load new SMB leads, auto-mapped and deduplicated directly into your pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-[var(--border)] flex gap-4">
          <button
            type="button"
            onClick={() => { setActiveTab('upload'); setResultSummary(null); }}
            className={`py-3 text-[13px] font-medium border-b-2 cursor-pointer transition-colors ${
              activeTab === 'upload'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Upload CSV File
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('workspace'); setResultSummary(null); }}
            className={`py-3 text-[13px] font-medium border-b-2 cursor-pointer transition-colors ${
              activeTab === 'workspace'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Pre-loaded Workspace Datasets ({workspaceFiles.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {resultSummary && (
            <div className="p-4 rounded-[10px] bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[var(--text)]">
                  Dataset Import Successful
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2 text-center">
                  <div className="p-2 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[16px] font-bold text-[var(--success)] tabular-nums">{resultSummary.imported}</div>
                    <div className="text-[11px] text-[var(--muted)]">New Leads Added</div>
                  </div>
                  <div className="p-2 rounded-[6px] bg-[var(--warn)]/10 border border-[var(--warn)]/30">
                    <div className="text-[16px] font-bold text-[var(--warn)] tabular-nums">{resultSummary.duplicates}</div>
                    <div className="text-[11px] text-[var(--muted)]">Duplicates Skipped</div>
                  </div>
                  <div className="p-2 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[16px] font-bold text-[var(--text)] tabular-nums">{resultSummary.total}</div>
                    <div className="text-[11px] text-[var(--muted)]">Total Rows Read</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)]/60 rounded-[12px] p-8 text-center cursor-pointer transition-colors bg-[var(--surface-2)]/20 hover:bg-[var(--surface-2)]/40 flex flex-col items-center justify-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-1">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-[14px] font-medium text-[var(--text)]">
                  {file ? file.name : 'Click to select or drag and drop a CSV file'}
                </div>
                <div className="text-[12px] text-[var(--muted)] max-w-sm">
                  Supports standard CSV formats with headers for Company, Area, Sector, Email, Phone, and Owner.
                </div>
                {file && (
                  <div className="mt-2 text-[11px] font-mono px-2.5 py-1 rounded-[999px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--primary)]">
                    {(file.size / 1024).toFixed(1)} KB • Ready to load
                  </div>
                )}
              </div>

              {/* Column Mapping Guide */}
              <div className="p-3.5 rounded-[8px] bg-[var(--surface-2)]/40 border border-[var(--border)] text-[11px] text-[var(--muted)] space-y-1">
                <div className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                  Auto-Detected Columns:
                </div>
                <div>
                  <span className="text-[var(--text)] font-medium">Company:</span> Company, Name, Business Name • <span className="text-[var(--text)] font-medium">Location:</span> Area, Location, City • <span className="text-[var(--text)] font-medium">Sector:</span> Sector, Industry, Category • <span className="text-[var(--text)] font-medium">Contact:</span> Email, Phone • <span className="text-[var(--text)] font-medium">Director:</span> Owner, Director, Promoter
                </div>
              </div>

              {/* Preview Table */}
              {previewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[12px] font-semibold text-[var(--text)] flex items-center justify-between">
                    <span>Data Preview (First 3 rows)</span>
                    <span className="text-[11px] text-[var(--muted)]">{previewColumns.length} columns detected</span>
                  </div>
                  <div className="rounded-[8px] border border-[var(--border)] overflow-x-auto max-h-[160px]">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-[var(--surface-2)] text-[var(--muted)] uppercase border-b border-[var(--border)]">
                        <tr>
                          {previewColumns.slice(0, 6).map((col, i) => (
                            <th key={i} className="px-3 py-2 font-medium truncate max-w-[140px]">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-mono">
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[var(--surface-2)]/30">
                            {previewColumns.slice(0, 6).map((col, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 truncate max-w-[140px] text-[var(--text)]">
                                {row[col] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Workspace Files Tab */
            <div className="space-y-3">
              <div className="text-[12px] text-[var(--muted)]">
                Select an existing dataset from the Clickfield workspace to re-index or synchronize into the active database:
              </div>

              {loadingWorkspaceFiles ? (
                <div className="p-8 text-center text-[var(--muted)] text-[12px] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
                  Scanning workspace for CSVs...
                </div>
              ) : workspaceFiles.length === 0 ? (
                <div className="p-6 text-center text-[var(--muted)] text-[12px]">
                  No pre-loaded CSV files found in workspace root.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] rounded-[10px] border border-[var(--border)] overflow-hidden">
                  {workspaceFiles.map((f, i) => (
                    <div
                      key={i}
                      className="p-3.5 flex items-center justify-between hover:bg-[var(--surface-2)]/60 transition-colors bg-[var(--surface)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-[var(--primary)] shrink-0" />
                        <div className="truncate">
                          <div className="text-[13px] font-medium text-[var(--text)] truncate">
                            {f.filename}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            {f.size_kb} KB • CSV Lead Registry
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isImporting}
                        onClick={() => handleLoadWorkspaceFile(f)}
                        className="px-3 py-1.5 rounded-[6px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[12px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {isImporting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                        <span>Load Dataset</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] text-[12px] font-medium transition-colors cursor-pointer"
          >
            Close
          </button>

          {activeTab === 'upload' && (
            <button
              type="button"
              disabled={!fileContent || isImporting}
              onClick={handleUploadSubmit}
              className="px-5 py-2 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[13px] font-medium transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Leads...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Import {file ? file.name : 'Dataset'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
