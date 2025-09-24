import React, { createContext, useEffect, useState, useCallback } from 'react';

export const AuthContext = createContext(null);

const STORAGE_KEY = 'eduauth_auth';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { token: null, role: null, email: null, universityId: null, universityName: null, universityCode: null };
    } catch {
      return { token: null, role: null, email: null, universityId: null, universityName: null, universityCode: null };
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }, [auth]);

  const login = useCallback((data) => {
    setAuth({
      token: data.token,
      role: data.role,
      email: data.email,
      universityId: data.universityId || null,
      universityName: data.universityName || null,
      universityCode: data.universityCode || null
    });
  }, []);

  const logout = useCallback(() => {
    setAuth({ token: null, role: null, email: null, universityId: null, universityName: null, universityCode: null });
  }, []);

  const value = { ...auth, login, logout, loading, setLoading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
