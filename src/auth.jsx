import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await api.get('/auth/me');
        if (active) setUser(me);
      } catch {
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const applySession = useCallback(({ token, user: u }) => {
    setToken(token);
    setUser(u);
    setAuthError('');
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    applySession(data);
    return data.user;
  }, [applySession]);

  const register = useCallback(async (name, email, password) => {
    const data = await api.post('/auth/register', { name, email, password });
    applySession(data);
    return data.user;
  }, [applySession]);

  const demo = useCallback(async () => {
    const data = await api.post('/auth/demo', {});
    applySession(data);
    return data.user;
  }, [applySession]);

  const updateUser = useCallback((patch) => {
    const next = { ...user, ...patch };
    setUser(next);
  }, [user]);

  const updateLimit = useCallback(async (dailyHoursLimit) => {
    const { user: me } = await api.patch('/auth/me', { dailyHoursLimit });
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, setUser, loading, authError, login, register, demo, logout, updateUser, updateLimit };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}