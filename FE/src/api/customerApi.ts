import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse, UserStatus } from '@/utils/apiTypes';
import type { UserDetail, UserSearchQuery, UserSummary } from '@/api/staffApi';

export const customerApi = {
  // role bị bỏ qua ở nhóm khách hàng
  search: (params: UserSearchQuery): Promise<ApiResponse<PageResponse<UserSummary>>> =>
    axiosClient.get('/admin/customers', { params }),

  get: (id: string): Promise<ApiResponse<UserDetail>> => axiosClient.get(`/admin/customers/${id}`),

  changeStatus: (id: string, status: UserStatus): Promise<ApiResponse<UserDetail>> =>
    axiosClient.put(`/admin/customers/${id}/status`, { status }),

  // chặn xóa khi khách còn đặt bàn chờ hoặc đã xác nhận (USER_HAS_ACTIVITY)
  remove: (id: string): Promise<ApiResponse<null>> => axiosClient.delete(`/admin/customers/${id}`),
};
