import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { fetchStats, fetchRecentLogs } from '../lib/api.js';

async function uploadExcel(file, token, setStatus) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('http://localhost:5000/api/university/data/excel', { method: 'POST', body: form, headers: { Authorization: 'Bearer '+token } });
  if (!res.ok) {
    let msg = 'Upload failed';
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const UniversityDashboard = () => {
  const { token, universityName, universityCode } = useAuth();
  const [file, setFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loadingDash, setLoadingDash] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [s, r] = await Promise.all([fetchStats(token), fetchRecentLogs(token)]);
        if (mounted) { setStats(s); setRecent(r); }
      } catch (e) { /* ignore */ }
      finally { if (mounted) setLoadingDash(false); }
    }
    if (token) load();
    return () => { mounted = false; };
  }, [token]);
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setImportResult(null);
    try { const r = await uploadExcel(file, token); setImportResult(r); } catch (e) { setImportResult({ error: e.message }); } finally { setUploading(false); }
  };
  const downloadTemplate = (type) => {
    const url = type === 'xlsx' ? 'http://localhost:5000/api/templates/import/xlsx' : 'http://localhost:5000/api/templates/import/csv';
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'xlsx' ? 'bulk_import_template.xlsx' : 'bulk_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{universityName || 'University Dashboard'}</h1>
          <p className="mt-1 text-lg text-slate-600">Verification Dashboard</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Total Students</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{stats ? stats.students : '...'}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Total Certificates</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{stats ? stats.certificates : '...'}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Verification Success %</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{stats ? stats.verifiedRate + '%' : '...'}</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Bulk Import (Excel)</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e=>setFile(e.target.files[0])} className="text-sm" />
            <button disabled={uploading || !file} onClick={handleUpload} className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload & Import'}
            </button>
            <button type="button" onClick={()=>downloadTemplate('xlsx')} className="px-3 py-2 bg-slate-700 text-white rounded text-sm">Download XLSX Template</button>
            <button type="button" onClick={()=>downloadTemplate('csv')} className="px-3 py-2 bg-slate-500 text-white rounded text-sm">Download CSV Template</button>
      {importResult && <p className="text-xs text-slate-600">{importResult.error ? importResult.error : `Students: ${importResult.insertedStudents}/${importResult.students} (dup ${importResult.duplicateStudents}) | Certs: ${importResult.insertedCerts}/${importResult.certificates} (dup ${importResult.duplicateCerts})`}</p>}
          </div>
          <p className="mt-3 text-xs text-slate-500">Expected columns (XLSX or CSV): rollNo, enrollmentNo (optional), name, fatherName (optional), course, graduationYear, certNo, marks, issueDate. You can upload either format.</p>
          {importResult && importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-4 border border-amber-300 bg-amber-50 rounded p-3 max-h-48 overflow-auto">
              <p className="text-xs font-semibold text-amber-800 mb-2">Validation Errors ({importResult.errors.length}):</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-amber-700"><th className="text-left pr-2">Row</th><th className="text-left pr-2">Field</th><th className="text-left">Message</th></tr>
                </thead>
                <tbody>
                  {importResult.errors.slice(0,200).map((e,i)=>(
                    <tr key={i} className="odd:bg-amber-100/40">
                      <td className="pr-2">{e.row}</td>
                      <td className="pr-2">{e.field}</td>
                      <td>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importResult.errors.length > 200 && <p className="text-[10px] text-amber-700 mt-1">Showing first 200 errors… refine your file.</p>}
            </div>
          )}
        </div>

        {/* Recent Verifications Table */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Verifications</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Certificate No.</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {recent.map(r => (
                  <tr key={r.certNo + r.verifiedAt}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.certNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(r.verifiedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {!recent.length && !loadingDash && (
                  <tr><td className="px-6 py-4 text-sm text-slate-500" colSpan={4}>No verifications yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityDashboard;
