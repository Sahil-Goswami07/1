import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

async function fetchUniversities(token) {
  const res = await fetch('http://localhost:5000/api/universities', { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) return [];
  return res.json();
}

async function approveUniversity(id, token) {
  await fetch(`http://localhost:5000/api/universities/${id}/approve`, { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
}

const AdminDashboard = () => {
  const { token } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [loadingUnis, setLoadingUnis] = useState(false);
  const load = async () => {
    if (!token) return;
    setLoadingUnis(true);
    const data = await fetchUniversities(token);
    setUniversities(data);
    setLoadingUnis(false);
  };
  useEffect(() => { load(); }, [token]);
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-lg text-slate-600">Global overview of the EduAuth ecosystem.</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Total Universities</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">200+</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Certificates Verified</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">1.5M+</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Total Students</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">2.1M+</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Forgeries Detected</h3>
            <p className="mt-1 text-3xl font-semibold text-red-600">4,210</p>
          </div>
        </div>

        {/* Recent Activity & University List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Verification Activity</h2>
            {/* Placeholder for activity feed or chart */}
            <div className="h-64 bg-slate-100 rounded-md flex items-center justify-center">
              <p className="text-slate-500">Activity Chart Placeholder</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center justify-between">Universities
              <button onClick={load} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">Refresh</button>
            </h2>
            {loadingUnis && <p className="text-xs text-slate-500">Loading...</p>}
            <ul className="space-y-2 max-h-72 overflow-auto text-sm">
              {universities.map(u => (
                <li key={u._id} className="flex items-center justify-between gap-3 border border-slate-100 rounded px-2 py-1">
                  <div>
                    <p className="font-medium text-slate-700">{u.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{u.code} • {u.status}</p>
                  </div>
                  {u.status !== 'approved' && (
                    <button onClick={async ()=>{await approveUniversity(u._id, token); load();}} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Approve</button>
                  )}
                </li>
              ))}
              {!universities.length && !loadingUnis && <li className="text-slate-500 text-xs">No universities yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
