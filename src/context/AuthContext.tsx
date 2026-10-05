import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserLifetimeStats } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken, isValidTokenType, getStoredUser } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  userStats: UserLifetimeStats | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  registerRequest: (data: {
    fullName: string;
    phone: string;
    email?: string;
    gender: string;
    age?: number;
    dateOfBirth?: string;
    maritalStatus?: string;
    district?: string;
    upazila?: string;
    address?: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; message: string; devOtp?: string; identifier: string }>;
  registerVerify: (identifier: string, code: string) => Promise<boolean>;
  forgotPasswordRequest: (identifier: string) => Promise<{ success: boolean; message: string; devOtp?: string; identifier: string }>;
  forgotPasswordVerify: (identifier: string, code: string, newPassword: string, confirmPassword: string) => Promise<boolean>;
  requestOtp: (phone: string, fullName?: string) => Promise<{ success: boolean; message: string; isExistingUser: boolean; devOtp?: string; phone: string }>;
  verifyOtp: (phone: string, code: string, fullName?: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: {
    fullName?: string;
    photoUrl?: string;
    address?: string;
    district?: string;
    upazila?: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    gender?: string;
  } | string, photoUrl?: string, address?: string) => Promise<boolean>;
  deleteAccount: (password?: string, confirmText?: string) => Promise<{ success: boolean; message: string }>;
  loginWithTokenAndUser: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser() as any);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Only show full-page blocking spinner if token exists but user object is not yet loaded in cache
    return !getStoredUser() && !!getStoredToken();
  });
  const [userStats, setUserStats] = useState<UserLifetimeStats | null>(null);

  const fetchCurrentUser = async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const localUser = getStoredUser();
    if (localUser && !user) {
      setUser(localUser as any);
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setUserStats(data.stats);
    } catch (err: any) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const isNetworkOrTimeout = isOffline || err.isNetworkError || err.isTimeout || (err.message && (
        err.message.includes('নেটওয়ার্ক') || 
        err.message.includes('সংযোগ') || 
        err.message.includes('fetch') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('AbortError') ||
        err.message.includes('timeout')
      ));

      if (isNetworkOrTimeout) {
        console.log('[AuthContext] Network or timeout error during user refresh, keeping current session:', err);
        if (localUser && !user) {
          setUser(localUser as any);
        }
      } else {
        console.warn('Session validation failed (user logged out or not found):', err);
        removeStoredToken();
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      const response = await api.login(identifier, password);
      if (response.success && response.token) {
        setStoredToken(response.token);
        setToken(response.token);
        setUser(response.user);
        
        try {
          await fetchCurrentUser();
        } catch (meErr) {
          console.warn('[AuthContext] fetchCurrentUser non-fatal warning:', meErr);
        }

        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('[AuthContext] User login error:', err.message);
      throw err;
    }
  };

  const registerRequest = async (data: {
    fullName: string;
    phone: string;
    email?: string;
    gender: string;
    age?: number;
    maritalStatus?: string;
    address?: string;
    password: string;
    confirmPassword: string;
  }) => {
    return await api.registerRequest(data);
  };

  const registerVerify = async (identifier: string, code: string): Promise<boolean> => {
    try {
      const response = await api.registerVerify(identifier, code);
      if (response.success && response.token) {
        setStoredToken(response.token);
        setToken(response.token);
        setUser(response.user);
        await fetchCurrentUser();
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const forgotPasswordRequest = async (identifier: string) => {
    return await api.forgotPasswordRequest(identifier);
  };

  const forgotPasswordVerify = async (
    identifier: string,
    code: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> => {
    try {
      const response = await api.forgotPasswordVerify(identifier, code, newPassword, confirmPassword);
      return response.success;
    } catch (err) {
      throw err;
    }
  };

  const requestOtp = async (phone: string, fullName?: string) => {
    return await api.requestOtp(phone, fullName);
  };

  const verifyOtp = async (phone: string, code: string, fullName?: string): Promise<boolean> => {
    try {
      const response = await api.verifyOtp(phone, code, fullName);
      if (response.success && response.token) {
        setStoredToken(response.token);
        setToken(response.token);
        setUser(response.user);
        await fetchCurrentUser();
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const updateProfile = async (
    data: {
      fullName?: string;
      photoUrl?: string;
      address?: string;
      district?: string;
      upazila?: string;
      dateOfBirth?: string;
      maritalStatus?: string;
      gender?: string;
    } | string,
    photoUrl?: string,
    address?: string
  ): Promise<boolean> => {
    try {
      const response = await api.updateProfile(data as any, photoUrl, address);
      if (response.success && response.user) {
        setUser(response.user);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const deleteAccount = async (password?: string, confirmText?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.deleteAccount(password, confirmText);
      if (res.success) {
        removeStoredToken();
        setToken(null);
        setUser(null);
        setUserStats(null);
        localStorage.removeItem('cave_companions_offline_queue');
      }
      return res;
    } catch (err: any) {
      console.error('[AuthContext] deleteAccount error:', err);
      throw err;
    }
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
    setUserStats(null);
  };

  const loginWithTokenAndUser = (newToken: string, newUser: User) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const contextValue = React.useMemo(() => ({
    user,
    token,
    isLoading,
    userStats,
    login,
    registerRequest,
    registerVerify,
    forgotPasswordRequest,
    forgotPasswordVerify,
    requestOtp,
    verifyOtp,
    logout,
    refreshUser,
    updateProfile,
    deleteAccount,
    loginWithTokenAndUser
  }), [user, token, isLoading, userStats]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
