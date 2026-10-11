import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ErrorResponse } from '@/utils/apiTypes';

// sự kiện phát ra khi token bị server từ chối, AuthContext lắng nghe để đăng xuất
export const AUTH_EXPIRED_EVENT = 'auth:expired';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// đính kèm token xác thực jwt vào header nếu đã đăng nhập
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// chuẩn hóa dữ liệu trả về và bắt lỗi từ backend
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: AxiosError<ErrorResponse>) => {
    // bóc tách dữ liệu lỗi trả về từ GlobalExceptionHandler
    const errorData = error.response?.data;
    const status = error.response?.status;
    const code = errorData?.error?.code;
    // 401: phiên hết hạn hoặc token không hợp lệ; 403 AUTH_ACCOUNT_BLOCKED: tài khoản vừa bị khóa hoặc xóa khi đang đăng nhập
    if (status === 401 || (status === 403 && code === 'AUTH_ACCOUNT_BLOCKED')) {
      if (localStorage.getItem('access_token')) {
        localStorage.removeItem('access_token');
        // báo cho AuthContext đưa giao diện về trạng thái chưa đăng nhập
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
    }
    return Promise.reject(errorData || error);
  }
);

export default axiosClient;
