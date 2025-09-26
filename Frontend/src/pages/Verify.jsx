import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { apiVerify } from '../lib/api.js';

const statusStyles = (s) => {
  if (s === 'verified') return 'bg-green-100 text-green-800';
  if (s === 'partial') return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
};

export default function Verify() {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [certNo, setCertNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [marks, setMarks] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);
  const [history, setHistory] = useState([]); // array of {id, inputs, summary, result}
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const HISTORY_KEY = 'verificationHistory';

  // Load history on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (loading) {
      setProgress(5);
      progressTimer.current = setInterval(() => {
        setProgress(prev => {
          // Slow down near the end (cap at 90 until response)
          if (prev >= 90) return prev;
            const increment = prev < 40 ? 8 : prev < 70 ? 5 : 2;
          return Math.min(prev + increment, 90);
        });
      }, 400);
    } else if (!loading && progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null); setProgress(0);
    try {
      const r = await apiVerify({ file, certNo, rollNo, marks, graduationYear }, token);
      setProgress(100);
      setResult(r);
      // Persist to history
      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        inputs: { certNo, rollNo, marks, graduationYear },
        summary: { status: r.status, score: r.score, certNo: r.certificate?.certNo || certNo, rollNo: rollNo || r.certificate?.student?.rollNo },
        result: r
      };
      setHistory(prev => {
        const filtered = prev.filter(h => !(h.summary.certNo === entry.summary.certNo && h.summary.rollNo === entry.summary.rollNo));
        const next = [entry, ...filtered].slice(0, 10);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch(_) {}
        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  function handleHistoryClick(h) {
    setResult(h.result);
    setCertNo(h.inputs.certNo || '');
    setRollNo(h.inputs.rollNo || '');
    setMarks(h.inputs.marks || '');
    setGraduationYear(h.inputs.graduationYear || '');
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-48 h-2 rounded-full bg-slate-200 overflow-hidden mb-4">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: progress + '%' }} />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle className="opacity-25" cx="12" cy="12" r="10" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8" />
            </svg>
            <span>Running OCR & checks… {progress}%</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Large PDFs may take longer. Do not close.</p>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Certificate Verification</h1>
        <p className="text-sm text-slate-600 mb-6">Upload a marksheet image/PDF or enter details manually. OCR will auto-extract if possible.</p>
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5" onDragEnter={handleDrag}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Certificate File (optional)</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-md p-4 text-xs text-slate-600 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <>
                      <p className="font-medium text-slate-700 truncate max-w-full">{file.name}</p>
                      <button type="button" onClick={e => { e.stopPropagation(); clearFile(); }} className="text-[11px] text-red-600 hover:underline">Remove</button>
                    </>
                  ) : (
                    <>
                      <p>Drag & drop file here or click to browse</p>
                      <p className="text-[10px] text-slate-400">Images or PDF up to ~5MB</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cert / Enrollment No</label>
                  <input value={certNo} onChange={e=>setCertNo(e.target.value)} className="w-full rounded-md border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll No</label>
                  <input value={rollNo} onChange={e=>setRollNo(e.target.value)} className="w-full rounded-md border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marks (%) (optional)</label>
                  <input value={marks} onChange={e=>setMarks(e.target.value)} className="w-full rounded-md border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Graduation Year (optional)</label>
                  <input value={graduationYear} onChange={e=>setGraduationYear(e.target.value)} className="w-full rounded-md border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50">{loading ? 'Verifying...' : 'Verify'}</button>
            </form>

            {result && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Result</h2>
                      <p className="text-xs text-slate-500">Score: {result.score} / 100</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles(result.status)}`}>{result.status.toUpperCase()}</span>
                  </div>
                  {result.reasons && result.reasons.length > 0 && (
                    <ul className="mt-3 text-xs text-slate-600 list-disc list-inside">
                      {result.reasons.map(r => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                  {result.scoreBreakdown && (
                    <div className="mt-4 space-y-2">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 mb-1">Score Breakdown</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.scoreBreakdown)
                            .filter(([_,v]) => (typeof v === 'number' || typeof v === 'string'))
                            .map(([k,v]) => (
                              <span key={k} className="px-2 py-1 rounded bg-slate-100 text-[10px] font-medium text-slate-700">{k}:{v}</span>
                            ))}
                        </div>
                      </div>
                      {result.scoreBreakdown.nameTokens && (
                        <details className="text-[10px]">
                          <summary className="cursor-pointer text-blue-600">Name Token Diagnostics</summary>
                          <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 space-y-1">
                            <div><strong>OCR Tokens:</strong> {result.scoreBreakdown.nameTokens.o.join(' ')}</div>
                            <div><strong>Stored Tokens:</strong> {result.scoreBreakdown.nameTokens.s.join(' ')}</div>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-1">Matched Fields</h4>
                      <div className="flex flex-wrap gap-2">{(result.fieldsMatched||[]).map(f => <span key={f} className="px-2 py-1 rounded bg-green-100 text-green-800">{f}</span>)}</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-1">Mismatched Fields</h4>
                      <div className="flex flex-wrap gap-2">{(result.fieldsMismatched||[]).map(f => <span key={f} className="px-2 py-1 rounded bg-red-100 text-red-800">{f}</span>)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Certificate Data</h3>
                  {result.certificate ? (
                    <div className="text-xs text-slate-600 space-y-1">
                      <p><strong>Cert No:</strong> {result.certificate.certNo}</p>
                      <p><strong>Marks:</strong> {result.certificate.marks ?? '—'}</p>
                      <p><strong>Issue Date:</strong> {result.certificate.issueDate ? new Date(result.certificate.issueDate).toLocaleDateString() : '—'}</p>
                      {result.certificate.student && (
                        <div className="mt-2">
                          <p className="font-semibold text-slate-700">Student</p>
                          <p>Name: {result.certificate.student.name}</p>
                          <p>Roll: {result.certificate.student.rollNo}</p>
                          <p>Course: {result.certificate.student.course}</p>
                          <p>Graduation Year: {result.certificate.student.graduationYear}</p>
                        </div>
                      )}
                    </div>
                  ) : <p className="text-xs text-slate-500">No certificate record found.</p>}
                </div>
                {result.ocr && (
                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">OCR Extract</h3>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p><strong>OCR Name:</strong> {result.ocr.candidateName}</p>
                      <p><strong>OCR Roll:</strong> {result.ocr.rollNumber}</p>
                      <p><strong>OCR Enrollment:</strong> {result.ocr.enrollmentNumber}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">Full Text</summary>
                        <pre className="mt-2 whitespace-pre-wrap max-h-64 overflow-auto bg-slate-50 p-2 rounded border border-slate-200">{result.ocr.fullText?.slice(0,500) || ''}{result.ocr.fullText && result.ocr.fullText.length>500 ? '...' : ''}</pre>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className="bg-white border border-slate-200 rounded-lg p-4 h-full max-h-[780px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Recent Verifications</h3>
              {history.length > 0 && (
                <button type="button" className="text-[10px] text-slate-500 hover:text-red-600" onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }}>Clear</button>
              )}
            </div>
            {history.length === 0 && <p className="text-[11px] text-slate-500">No history yet. Run a verification.</p>}
            <ul className="space-y-2 overflow-auto pr-1 text-xs">
              {history.map(h => (
                <li key={h.id}>
                  <button type="button" onClick={() => handleHistoryClick(h)} className="w-full text-left border border-slate-200 rounded-md p-2 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${statusStyles(h.summary.status)}`}>{h.summary.status.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 truncate font-medium text-slate-700">{h.summary.certNo || '—'} {h.summary.rollNo && <span className="text-slate-400">• {h.summary.rollNo}</span>}</div>
                    <div className="text-[10px] text-slate-500">Score {h.summary.score}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}