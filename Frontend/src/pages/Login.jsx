import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiLogin } from '../lib/api.js';

export default function Login({ targetRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login, loading, setLoading, role } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data);
      if (data.role === 'superAdmin') navigate('/admin');
      else if (data.role === 'universityAdmin') navigate('/university');
      else navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
          {targetRole === 'superAdmin' ? 'Admin Login' : targetRole === 'universityAdmin' ? 'University Login' : 'Sign In'}
        </h1>
        {targetRole && <p className="text-xs text-slate-500 mb-4">Use your {targetRole === 'superAdmin' ? 'super admin' : 'university admin'} credentials.</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {role && <p className="mt-4 text-xs text-slate-500">You are already logged in as {role}.</p>}
      </div>
    </div>
  );
}
