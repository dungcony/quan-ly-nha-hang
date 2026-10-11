import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse } from '@/utils/apiTypes';

// danh mục trong thực đơn công khai, dish_count chỉ đếm món đang bán và hết món
export interface MenuCategoryResponse {
  id: string;
  name: string;
  sort_order: number;
  dish_count: number;
}

export interface DishSummaryResponse {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  price: number;
  unit: string;
  description: string | null;
  image_url: string | null;
  status: 'AVAILABLE' | 'OUT_OF_STOCK';
}

export interface DishDetailResponse extends DishSummaryResponse {
  prep_time_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface MenuDishQuery {
  category_id?: string;
  name?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'price' | 'category' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export const menuApi = {
  // danh mục kèm số món đang hiển thị
  getCategories: (): Promise<ApiResponse<MenuCategoryResponse[]>> => axiosClient.get('/menu/categories'),

  // món của thực đơn công khai, mặc định sắp theo tên tăng dần
  getDishes: (params?: MenuDishQuery): Promise<ApiResponse<PageResponse<DishSummaryResponse>>> =>
    axiosClient.get('/menu/dishes', { params: { sort_order: 'asc', ...params } }),

  getDish: (id: string): Promise<ApiResponse<DishDetailResponse>> => axiosClient.get(`/menu/dishes/${id}`),
};
