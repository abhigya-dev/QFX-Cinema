/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL, api, USE_DUMMY_DATA } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    setUser(payload);
    return payload;
  };

  const resendSignupOtp = async (email) => {
    return api.post('/auth/resend-otp', { email });
  };

  const logout = async () => {
    await api.post('/auth/logout', {});
    setUser(null);
  };

  const adminLogin = async (email, password) => {
    const payload = await api.post('/auth/admin/signin', { email, password });
    setAdminUser(payload);
    return payload;
  };

  const adminLogout = async () => {
    await api.post('/auth/admin/logout', {});
    setAdminUser(null);
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
    adminLogout,
    refreshUser,
    refreshAdminUser,
    isAuthenticated: Boolean(user),
    isClientAuthenticated: Boolean(user),
    isAdminAuthenticated: Boolean(adminUser),
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
