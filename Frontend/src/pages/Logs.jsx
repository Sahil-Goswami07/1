import React, { useEffect, useState } from 'react';
import { fetchRecentLogs, fetchLogs } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

const statusStyle = (s) => {
  const v = (s||'').toLowerCase();
  if (v==='verified') return 'bg-green-100 text-green-700';
  if (v==='suspicious') return 'bg-amber-100 text-amber-700';
  if (v==='fake') return 'bg-red-100 text-red-700';
  if (v==='partial') return 'bg-orange-100 text-orange-700';
  return 'bg-slate-200 text-slate-600';
};

export default function Logs() {
  const { token } = useAuth();
  const [recent, setRecent] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetchRecentLogs(token);
      setRecent(r);
      const params = [];
      if (filter) params.push('status='+encodeURIComponent(filter));
      if (anomaliesOnly) params.push('anomaliesOnly=true');
      const q = params.length ? ('?'+params.join('&')) : '';
      const full = await fetch(`${(import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:5000'}/api/logs${q}`, { headers: { Authorization: 'Bearer '+token }});
      if (!full.ok) throw new Error('Failed to load logs');
      const fullJson = await full.json();
      setAll(fullJson);
    } catch(e){
      setError(e.message);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Verification Logs</h1>
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Status Filter</label>
            <select value={filter} onChange={e=>setFilter(e.target.value)} className="text-sm border rounded px-2 py-1">
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="suspicious">Suspicious</option>
              <option value="fake">Fake</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anomaliesOnly} onChange={e=>setAnomaliesOnly(e.target.checked)} />
            Anomalies only
          </label>
          <button onClick={load} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded shadow hover:bg-blue-700 disabled:opacity-50" disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">Recent (10)<span className="text-[10px] text-slate-400">Auto-limited</span></h2>
          <div className="overflow-auto border border-slate-200 rounded-md max-h-96">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left font-medium">Status</th>
                  <th className="px-2 py-1 text-left font-medium">Cert</th>
                  <th className="px-2 py-1 text-left font-medium">Score</th>
                  <th className="px-2 py-1 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.certNo + (r.verifiedAt||'')} className="border-t">
                    <td className="px-2 py-1"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle(r.status)}`}>{(r.status||'').toUpperCase()}</span></td>
                    <td className="px-2 py-1 font-mono text-[11px]">{r.certNo}</td>
                    <td className="px-2 py-1">{r.score}</td>
                    <td className="px-2 py-1 text-slate-500 whitespace-nowrap">{new Date(r.verifiedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {recent.length === 0 && !loading && <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">No recent logs</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">All (filtered)<span className="text-[10px] text-slate-400">Top 500</span></h2>
          <div className="overflow-auto border border-slate-200 rounded-md max-h-96">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left font-medium">Status</th>
                  <th className="px-2 py-1 text-left font-medium">Cert</th>
                  <th className="px-2 py-1 text-left font-medium">Score</th>
                  <th className="px-2 py-1 text-left font-medium">Anom%</th>
                  <th className="px-2 py-1 text-left font-medium">Reasons</th>
                  <th className="px-2 py-1 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {all.map(l => (
                  <tr key={l._id} className="border-t align-top">
                    <td className="px-2 py-1"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle(l.status)}`}>{(l.status||'').toUpperCase()}</span></td>
                    <td className="px-2 py-1 font-mono text-[11px] max-w-[120px] truncate" title={l.certNo}>{l.certNo}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{l.score}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{typeof l.anomalyScore==='number' ? (l.anomalyScore*100).toFixed(1) : '—'}</td>
                    <td className="px-2 py-1 text-slate-500 max-w-[220px] truncate" title={(l.reasons||[]).join('; ')}>{(l.reasons||[]).slice(0,2).join('; ')}</td>
                    <td className="px-2 py-1 text-slate-500 whitespace-nowrap">{new Date(l.verifiedAt || l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {all.length === 0 && !loading && <tr><td colSpan={6} className="px-2 py-4 text-center text-slate-400">No logs match filter</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="mt-6 text-[11px] text-slate-400">Demo view: not paginated; fetch limited server-side.</p>
    </div>
  );
}
