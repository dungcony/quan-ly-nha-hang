import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, Gender, PageResponse, Role, UserStatus } from '@/utils/apiTypes';

export interface UserSummary {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  email_verified: boolean;
}

export interface UserDetail extends UserSummary {
  gender: Gender | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  created_at: string;
}

export interface UserSearchQuery {
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  status?: UserStatus;
  email_verified?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'full_name' | 'email';
  sort_order?: 'asc' | 'desc';
}

// thông tin chung của nhân viên khi thêm và sửa
export interface StaffUpdatePayload {
  full_name: string;
  email: string;
  role: Role;
  date_of_birth?: string;
  phone?: string;
  gender?: Gender;
}

// mật khẩu và trạng thái chỉ nhập khi thêm mới
export interface StaffCreatePayload extends StaffUpdatePayload {
  password: string;
  status: UserStatus;
}

export const staffApi = {
  search: (params: UserSearchQuery): Promise<ApiResponse<PageResponse<UserSummary>>> =>
    axiosClient.get('/admin/staff', { params }),

  get: (id: string): Promise<ApiResponse<UserDetail>> => axiosClient.get(`/admin/staff/${id}`),

  create: (data: StaffCreatePayload): Promise<ApiResponse<UserDetail>> => axiosClient.post('/admin/staff', data),

  update: (id: string, data: StaffUpdatePayload): Promise<ApiResponse<UserDetail>> =>
    axiosClient.put(`/admin/staff/${id}`, data),

  uploadAvatar: (id: string, file: File): Promise<ApiResponse<UserDetail>> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.put(`/admin/staff/${id}/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  changeStatus: (id: string, status: UserStatus): Promise<ApiResponse<UserDetail>> =>
    axiosClient.put(`/admin/staff/${id}/status`, { status }),

  remove: (id: string): Promise<ApiResponse<null>> => axiosClient.delete(`/admin/staff/${id}`),
};
