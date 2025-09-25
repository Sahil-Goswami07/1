import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiLogin } from '../lib/api.js';

export default function Login({ targetRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-md">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
          {targetRole === 'superAdmin' ? 'Admin Login' : targetRole === 'universityAdmin' ? 'University Login' : 'Sign In'}
        </h1>
        {targetRole && (
          <p className="text-xs text-slate-500 mb-4">
            Use your {targetRole === 'superAdmin' ? 'super admin' : 'university admin'} credentials.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 hover:shadow-md disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-3 flex justify-between text-xs text-blue-600">
          <a href="/forgot-password" className="hover:underline">Forgot Password?</a>
        </div>

        {role && (
          <p className="mt-4 text-xs text-slate-500">You are already logged in as {role}.</p>
        )}
      </div>
    </div>
  );
}
