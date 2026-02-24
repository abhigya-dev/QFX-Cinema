/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, api, CUSTOMER_TOKEN_KEY, USE_DUMMY_DATA } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminLoggingOut, setAdminLoggingOut] = useState(false);
  const logoutPromiseRef = useRef(null);
  const adminLogoutPromiseRef = useRef(null);

  const refreshUser = async () => {
    try {
      const me = await api.get('/auth/me');
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  };

  const refreshAdminUser = async () => {
    try {
      const me = await api.get('/auth/admin/me');
      setAdminUser(me);
      return me;
    } catch {
      setAdminUser(null);
      return null;
    }
  };

  useEffect(() => {
    const hydrate = async () => {
      await Promise.allSettled([refreshUser(), refreshAdminUser()]);
      setLoading(false);
    };
    hydrate();
  }, []);

  const login = async (email, password) => {
    const payload = await api.post('/auth/signin', { email, password });
    if (payload?.token) {
      window.localStorage.setItem(CUSTOMER_TOKEN_KEY, payload.token);
    }
    setUser(payload);
    return payload;
  };

  const googleLogin = async () => {
    if (!USE_DUMMY_DATA) {
      window.location.href = `${API_BASE_URL}/auth/google`;
      return null;
    }
    const payload = await api.post('/auth/google', {});
    setUser(payload);
    return payload;
  };

  const signup = async (name, email, password) => {
    return api.post('/auth/signup', { name, email, password });
  };

  const verifySignupOtp = async (email, otp) => {
    const payload = await api.post('/auth/verify-email', { email, otp });
    if (payload?.token) {
      window.localStorage.setItem(CUSTOMER_TOKEN_KEY, payload.token);
    }
    setUser(payload);
    return payload;
  };

  const resendSignupOtp = async (email) => {
    return api.post('/auth/resend-otp', { email });
  };

  const logout = async () => {
    if (logoutPromiseRef.current) {
      return false;
    }

    logoutPromiseRef.current = (async () => {
      setLoggingOut(true);
      await api.post('/auth/logout', {});
      window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      setUser(null);
      return true;
    })();

    try {
      return await logoutPromiseRef.current;
    } finally {
      logoutPromiseRef.current = null;
      setLoggingOut(false);
    }
  };

  const updateProfile = async ({ name, profileImage }) => {
    const payload = await api.put('/auth/me', { name, profileImage });
    setUser(payload);
    return payload;
  };

  const adminLogin = async (email, password) => {
    const payload = await api.post('/auth/admin/signin', { email, password });
    setAdminUser(payload);
    return payload;
  };

  const adminLogout = async () => {
    if (adminLogoutPromiseRef.current) {
      return false;
    }

    adminLogoutPromiseRef.current = (async () => {
      setAdminLoggingOut(true);
      await api.post('/auth/admin/logout', {});
      setAdminUser(null);
      return true;
    })();

    try {
      return await adminLogoutPromiseRef.current;
    } finally {
      adminLogoutPromiseRef.current = null;
      setAdminLoggingOut(false);
    }
  };

  const value = {
    user,
    adminUser,
    loading,
    login,
    adminLogin,
    googleLogin,
    signup,
    verifySignupOtp,
    resendSignupOtp,
    logout,
    updateProfile,
    adminLogout,
    refreshUser,
    refreshAdminUser,
    isAuthenticated: Boolean(user),
    isClientAuthenticated: Boolean(user),
    isAdminAuthenticated: Boolean(adminUser),
    loggingOut,
    adminLoggingOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
