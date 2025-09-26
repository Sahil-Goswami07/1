import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { apiGet } from '../lib/api.js';

// Minimal helper to format date
const fmt = d => new Date(d).toLocaleString();

export default function SuspiciousLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  async function load() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ anomaliesOnly: 'true' });
      if (minScore) params.append('minAnomaly', minScore);
      if (maxScore) params.append('maxAnomaly', maxScore);
      const data = await apiGet(`/logs?${params.toString()}`, token);
      setLogs(data);
    } catch (e) {
      setError(e.message || 'Failed to load logs');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); // initial
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Suspicious / Fake Certificates</h1>
          <p className="text-xs text-slate-500">Filtered verification logs flagged by rule or ML anomaly layer.</p>
        </div>
        <div className="flex items-end gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Min Anomaly %</label>
            <input value={minScore} onChange={e=>setMinScore(e.target.value)} placeholder="70" className="w-24 rounded border-slate-300 text-xs focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Max Anomaly %</label>
            <input value={maxScore} onChange={e=>setMaxScore(e.target.value)} placeholder="100" className="w-24 rounded border-slate-300 text-xs focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <button onClick={load} className="px-3 h-8 mt-auto rounded bg-blue-600 text-white text-xs font-medium disabled:opacity-50" disabled={loading}>{loading ? 'Loading...' : 'Apply'}</button>
          <a href={`${import.meta.env.VITE_API_BASE || ''}/logs/export/anomalies.csv`} target="_blank" rel="noopener" className="px-3 h-8 mt-auto rounded bg-emerald-600 text-white text-xs font-medium flex items-center">Download CSV</a>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold">
            <tr>
              <th className="px-3 py-2 text-left">Cert No</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Det Score</th>
              <th className="px-3 py-2 text-left">Anom %</th>
              <th className="px-3 py-2 text-left">Reasons</th>
              <th className="px-3 py-2 text-left">Verified At</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-1 font-mono text-[11px]">{l.certNo || '—'}</td>
                <td className="px-3 py-1">{(l.status||'').toUpperCase()}</td>
                <td className="px-3 py-1">{l.score}</td>
                <td className="px-3 py-1 font-semibold {l.anomalyScore>0.7?'text-red-600':l.anomalyScore>0.45?'text-orange-600':'text-green-600'}">{typeof l.anomalyScore==='number' ? (l.anomalyScore*100).toFixed(1) : '—'}</td>
                <td className="px-3 py-1 max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {(l.anomalyReasons||[]).slice(0,4).map(r => <span key={r} className="bg-slate-200 rounded px-1 py-0.5 text-[10px]" title={r}>{r.slice(0,22)}{r.length>22?'…':''}</span>)}
                  </div>
                </td>
                <td className="px-3 py-1 whitespace-nowrap">{l.verifiedAt ? fmt(l.verifiedAt) : '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center py-6 text-slate-500">No suspicious or fake certificates found for filters.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="text-center py-6 text-slate-500">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
