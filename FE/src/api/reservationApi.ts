import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse, ReservationStatus, TableStatus, TableZone } from '@/utils/apiTypes';

export interface AvailabilityRequest {
  reserved_at: string; // ISO 8601, e.g. 2026-10-15T19:00:00Z
  guest_count: number;
}

export interface AvailabilityResponse {
  available: boolean;
  suggestions: string[]; // ISO 8601 strings
}

export interface ReservationCreateRequest {
  guest_name: string;
  phone: string;
  email?: string;
  reserved_at: string;
  guest_count: number;
  preferred_zone?: string;
  note?: string;
}

export interface ReservationResponse {
  id: string;
  code: string;
  status: string;
  reserved_at: string;
  guest_count: number;
  // ... other fields if needed
}

// bàn rút gọn đi kèm đặt bàn
export interface TableBrief {
  id: string;
  name: string;
  zone: TableZone;
  capacity: number;
  status: TableStatus;
}

export interface ReservationSummary {
  id: string;
  code: string;
  guest_name: string;
  phone: string;
  reserved_at: string;
  guest_count: number;
  status: ReservationStatus;
  table_name: string | null;
}

export interface ReservationDetail {
  id: string;
  code: string;
  status: ReservationStatus;
  guest_name: string;
  phone: string;
  email: string | null;
  reserved_at: string;
  reserved_end: string;
  guest_count: number;
  preferred_zone: TableZone | null;
  note: string | null;
  table: TableBrief | null;
  cancel_reason: string | null;
  created_at: string;
}

export interface ReservationCheckInResult {
  reservation: ReservationDetail;
  order_id: string;
}

export interface ReservationSearchQuery {
  keyword?: string;
  code?: string;
  date?: string;
  status?: ReservationStatus;
  page?: number;
  page_size?: number;
  sort_by?: 'reserved_at' | 'created_at' | 'guest_count';
  sort_order?: 'asc' | 'desc';
}

export const reservationApi = {
  checkAvailability: (params: AvailabilityRequest): Promise<ApiResponse<AvailabilityResponse>> => 
    axiosClient.get('/reservations/availability', { params }),
    
  createReservation: (data: ReservationCreateRequest): Promise<ApiResponse<ReservationResponse>> =>
    axiosClient.post('/reservations', data),

  // các hàm dưới đây dành cho Phục vụ và Quản lý
  search: (params: ReservationSearchQuery): Promise<ApiResponse<PageResponse<ReservationSummary>>> =>
    axiosClient.get('/reservations', { params }),

  get: (id: string): Promise<ApiResponse<ReservationDetail>> => axiosClient.get(`/reservations/${id}`),

  // bàn còn trống đủ chỗ trong khung giờ của đặt bàn, dùng để chọn bàn khi xác nhận
  availableTables: (id: string): Promise<ApiResponse<TableBrief[]>> => axiosClient.get(`/reservations/${id}/available-tables`),

  confirm: (id: string, tableId: string): Promise<ApiResponse<ReservationDetail>> =>
    axiosClient.put(`/reservations/${id}/confirm`, { table_id: tableId }),

  rejectOrCancel: (id: string, reason: string): Promise<ApiResponse<ReservationDetail>> =>
    axiosClient.put(`/reservations/${id}/reject-or-cancel`, { reason }),

  // tableId tùy chọn để đổi sang bàn khác khi nhận bàn; trả về mã đơn vừa mở
  checkIn: (id: string, tableId?: string): Promise<ApiResponse<ReservationCheckInResult>> =>
    axiosClient.put(`/reservations/${id}/check-in`, tableId ? { table_id: tableId } : {}),
};
