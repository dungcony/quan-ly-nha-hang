import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse } from '@/utils/apiTypes';

// dish_count đếm món ở mọi trạng thái, kể cả ngừng bán
export interface CategoryResponse {
  id: string;
  name: string;
  sort_order: number;
  dish_count: number;
}

export interface CategoryPayload {
  name: string;
  sort_order: number;
}

export const categoryApi = {
  list: (): Promise<ApiResponse<CategoryResponse[]>> => axiosClient.get('/categories'),

  create: (data: CategoryPayload): Promise<ApiResponse<CategoryResponse>> => axiosClient.post('/categories', data),

  update: (id: string, data: CategoryPayload): Promise<ApiResponse<CategoryResponse>> =>
    axiosClient.put(`/categories/${id}`, data),

  // chặn xóa khi danh mục còn món (CATEGORY_IN_USE)
  remove: (id: string): Promise<ApiResponse<null>> => axiosClient.delete(`/categories/${id}`),
};
