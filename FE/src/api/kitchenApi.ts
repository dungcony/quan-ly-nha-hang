import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse } from '@/utils/apiTypes';

export interface KitchenItem {
  id: string;
  order_id: string;
  table_name: string;
  dish_name: string;
  quantity: number;
  note: string | null;
  status: 'PENDING' | 'COOKING';
  sent_at: string;
  started_at: string | null;
}

export const kitchenApi = {
  // hàng đợi tối đa 200 dòng, cũ nhất lên trước; bỏ trống status để lấy cả chờ và đang làm
  getQueue: (status?: 'PENDING' | 'COOKING'): Promise<ApiResponse<KitchenItem[]>> =>
    axiosClient.get('/kitchen/items', { params: status ? { status } : undefined }),

  // nhận chế biến; có người nhận trước thì BE trả ORDER_ITEM_STATUS_CONFLICT
  start: (id: string): Promise<ApiResponse<KitchenItem>> => axiosClient.put(`/kitchen/items/${id}/start`),

  // báo món đã xong để Phục vụ mang ra bàn
  ready: (id: string): Promise<ApiResponse<KitchenItem>> => axiosClient.put(`/kitchen/items/${id}/ready`),
};
