import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse } from '@/utils/apiTypes';

export interface MyReservationResponse {
  id: string;
  code: string;
  guest_name: string;
  phone: string;
  reserved_at: string;
  guest_count: number;
  status: string;
  note: string;
}

export const myReservationApi = {
  // Lấy danh sách đặt bàn của tôi
  getMyReservations: (): Promise<ApiResponse<PageResponse<MyReservationResponse>>> => {
    return axiosClient.get('/me/reservations');
  },

  // Hủy đặt bàn của tôi
  cancelMyReservation: (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.put(`/me/reservations/${id}/cancel`);
  },
};

export default myReservationApi;

