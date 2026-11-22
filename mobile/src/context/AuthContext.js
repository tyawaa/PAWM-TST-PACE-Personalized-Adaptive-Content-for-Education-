import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Api from '../services/ApiService';

/** @typedef {import('../types').AuthState} AuthState */
/** @typedef {import('../types').Session} Session */
/** @typedef {import('../types').Credentials} Credentials */
/** @typedef {import('../types').Registration} Registration */

const AuthContext = createContext(/** @type {AuthState | null} */ (null));

/** @param {import('../types').ChildrenProps} props @returns {import('react').JSX.Element} */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(/** @type {Session | null} */ (null));
  const [notice, setNotice] = useState(/** @type {string | null} */ (null));

  /** @type {(values: Credentials) => Promise<void>} */
  const signIn = useCallback(async (values) => {
    const next = await Api.login(values);
    setNotice(null);
    setSession(next);
  }, []);

  /** @type {(values: Registration) => Promise<void>} */
  const register = useCallback(async (values) => {
    const next = await Api.register(values);
    setNotice(null);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    setNotice(null);
    setSession(null);
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      setNotice('Sesi sudah berakhir. Silakan masuk kembali.');
      setSession(null);
    }, session.expires_in * 1000);
    return () => clearTimeout(timer);
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, notice, signIn, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** @returns {AuthState} */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  return context;
}
