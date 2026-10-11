import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, DishStatus, PageResponse } from '@/utils/apiTypes';

export interface DishSummary {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  price: number;
  unit: string;
  image_url: string | null;
  status: DishStatus;
}

export interface DishDetail extends DishSummary {
  description: string | null;
  prep_time_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface DishSearchQuery {
  name?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  status?: DishStatus;
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'price' | 'category' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// dùng chung cho thêm và sửa món, ảnh tải riêng qua uploadImage
export interface DishPayload {
  name: string;
  category_id: string;
  price: number;
  unit: string;
  description?: string;
  prep_time_minutes?: number;
  status: DishStatus;
}

export const dishApi = {
  // quản lý thấy cả món ngừng bán
  search: (params: DishSearchQuery): Promise<ApiResponse<PageResponse<DishSummary>>> =>
    axiosClient.get('/dishes', { params }),

  get: (id: string): Promise<ApiResponse<DishDetail>> => axiosClient.get(`/dishes/${id}`),

  create: (data: DishPayload): Promise<ApiResponse<DishDetail>> => axiosClient.post('/dishes', data),

  update: (id: string, data: DishPayload): Promise<ApiResponse<DishDetail>> => axiosClient.put(`/dishes/${id}`, data),

  uploadImage: (id: string, file: File): Promise<ApiResponse<DishDetail>> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.put(`/dishes/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  remove: (id: string): Promise<ApiResponse<null>> => axiosClient.delete(`/dishes/${id}`),
};
