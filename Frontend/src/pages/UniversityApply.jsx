import React, { useState } from 'react';

export default function UniversityApply() {
  const [form, setForm] = useState({ email: '', password: '', universityCode: '', universityName: '', address: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('http://localhost:5000/api/auth/university/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Application failed');
      setStatus({ ok: true, msg: data.message });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">University Application</h1>
        <p className="text-xs text-slate-500 mb-6">Submit details to request onboarding. An administrator will review and approve your institution.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">University Code *</label>
              <input name="universityCode" required value={form.universityCode} onChange={update} className="w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">University Name</label>
              <input name="universityName" value={form.universityName} onChange={update} className="w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
            <input name="address" value={form.address} onChange={update} className="w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Admin Email *</label>
              <input type="email" name="email" required value={form.email} onChange={update} className="w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Admin Password *</label>
              <input type="password" name="password" required value={form.password} onChange={update} className="w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
        {status && <p className={`mt-4 text-sm ${status.ok ? 'text-green-600' : 'text-red-600'}`}>{status.msg}</p>}
        <p className="mt-6 text-[11px] text-slate-500 leading-relaxed">Fields marked * are required. After approval you can sign in via the University Login page to access your dashboard and bulk upload records.</p>
      </div>
    </div>
  );
}
