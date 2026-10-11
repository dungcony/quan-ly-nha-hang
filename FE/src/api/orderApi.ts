import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, OrderItemStatus, OrderStatus, PageResponse } from '@/utils/apiTypes';
import type { TableBrief } from '@/api/reservationApi';

export interface OrderSummary {
  id: string;
  table: TableBrief;
  status: OrderStatus;
  waiter_name: string;
  opened_at: string;
  item_count: number;
  subtotal: number;
}

export interface OrderItem {
  id: string;
  dish_id: string;
  dish_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  note: string | null;
  status: OrderItemStatus;
  sent_at: string;
  started_at: string | null;
  ready_at: string | null;
  served_at: string | null;
}

export interface OrderDetail {
  id: string;
  table: TableBrief;
  status: OrderStatus;
  reservation_id: string | null;
  waiter: { id: string; full_name: string; email: string; phone: string | null; role: string };
  opened_at: string;
  closed_at: string | null;
  items: OrderItem[];
  // tổng tiền các dòng không bị hủy
  subtotal: number;
  // số dòng chưa được phục vụ (chờ, đang làm, đã xong)
  unserved_count: number;
}

export interface OrderSearchQuery {
  status?: OrderStatus;
  table_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'opened_at' | 'closed_at';
  sort_order?: 'asc' | 'desc';
}

export interface OrderItemLine {
  dish_id: string;
  quantity: number;
  note?: string;
}

// món đã chế biến xong đang chờ phục vụ mang ra bàn
export interface ReadyItem {
  id: string;
  order_id: string;
  table_name: string;
  dish_name: string;
  quantity: number;
  note: string | null;
  ready_at: string;
}

export const orderApi = {
  // mở đơn mới cho bàn trống; mỗi bàn chỉ có một đơn đang mở nên gửi trùng sẽ bị BE từ chối
  open: (tableId: string): Promise<ApiResponse<OrderDetail>> => axiosClient.post('/orders', { table_id: tableId }),

  // mặc định BE chỉ trả đơn OPEN
  search: (params: OrderSearchQuery): Promise<ApiResponse<PageResponse<OrderSummary>>> =>
    axiosClient.get('/orders', { params }),

  get: (id: string): Promise<ApiResponse<OrderDetail>> => axiosClient.get(`/orders/${id}`),

  // gửi tối đa 50 dòng món xuống bếp
  addItems: (id: string, items: OrderItemLine[]): Promise<ApiResponse<OrderDetail>> =>
    axiosClient.post(`/orders/${id}/items`, { items }),

  // chỉ hủy được đơn chưa có dòng món nào
  cancelEmpty: (id: string): Promise<ApiResponse<null>> => axiosClient.delete(`/orders/${id}`),

  readyItems: (): Promise<ApiResponse<ReadyItem[]>> => axiosClient.get('/order-items/ready'),

  markServed: (itemId: string): Promise<ApiResponse<OrderItem>> => axiosClient.put(`/order-items/${itemId}/served`),
};
