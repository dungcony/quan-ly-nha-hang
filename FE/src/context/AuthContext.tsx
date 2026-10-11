import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  AuthUserResponse,
  ProfileResponse,
  UserLoginRequest,
  AuthResponse,
} from '@/utils/apiTypes';
import { authApi } from '@/api/authApi';
import { userApi } from '@/api/userApi';
import { AUTH_EXPIRED_EVENT } from '@/helpers/axiosClient';

interface AuthContextType {
  user: AuthUserResponse | null;
  profile: ProfileResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: UserLoginRequest) => Promise<AuthResponse>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // lấy thông tin hồ sơ chi tiết từ server
  const fetchCurrentProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile();
      const profileData = response.data;
      setProfile(profileData);
      setUser({
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        role: profileData.role,
        must_change_password: profileData.must_change_password,
      });
    } catch {
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // khởi tạo thông tin người dùng khi ứng dụng tải lại nếu có token
  useEffect(() => {
    if (token) {
      fetchCurrentProfile();
    } else {
      setIsLoading(false);
    }
  }, [token, fetchCurrentProfile]);

  // token bị server từ chối (hết hạn, tài khoản bị khóa) thì đăng xuất ngay thay vì để giao diện vẫn báo đã đăng nhập
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setUser(null);
      setProfile(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  // xử lý đăng nhập tài khoản
  const login = async (data: UserLoginRequest): Promise<AuthResponse> => {
    const response = await authApi.login(data);
    const authData = response.data;
    const tokenStr = authData.access_token;
    localStorage.setItem('access_token', tokenStr);
    setToken(tokenStr);
    setUser(authData.user);
    // đồng bộ thông tin hồ sơ
    try {
      const profileRes = await userApi.getProfile();
      setProfile(profileRes.data);
    } catch {
      // nếu lấy hồ sơ thất bại vẫn giữ auth user cơ bản
    }
    return authData;
  };

  // xử lý đăng xuất tài khoản
  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  // làm mới dữ liệu hồ sơ cá nhân
  const refreshProfile = async () => {
    await fetchCurrentProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

