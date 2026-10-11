import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse } from '@/utils/apiTypes';
import type { ReservationDetail, ReservationSummary } from '@/api/reservationApi';

export interface MyReservationQuery {
  page?: number;
  page_size?: number;
}

export const myReservationApi = {
  // đặt bàn của chính khách hàng, mới nhất trước
  getMyReservations: (params?: MyReservationQuery): Promise<ApiResponse<PageResponse<ReservationSummary>>> =>
    axiosClient.get('/me/reservations', { params }),

  getMyReservation: (id: string): Promise<ApiResponse<ReservationDetail>> => axiosClient.get(`/me/reservations/${id}`),

  // hủy được khi Chờ xác nhận hoặc Đã xác nhận và còn ít nhất 2 giờ đến giờ hẹn
  cancelMyReservation: (id: string): Promise<ApiResponse<ReservationDetail>> => axiosClient.put(`/me/reservations/${id}/cancel`),
};

export default myReservationApi;
