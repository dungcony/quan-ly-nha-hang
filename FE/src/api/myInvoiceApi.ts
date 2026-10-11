import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse } from '@/utils/apiTypes';

export interface MyInvoiceResponse {
  id: string;
  code: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface MyInvoiceDetailResponse {
  id: string;
  code: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: Array<{
    dish_name: string;
    quantity: number;
    price: number;
  }>;
}

export const myInvoiceApi = {
  // Lấy danh sách hóa đơn của tôi
  getMyInvoices: (): Promise<ApiResponse<PageResponse<MyInvoiceResponse>>> => {
    return axiosClient.get('/me/invoices');
  },

  // Xem chi tiết hóa đơn
  getMyInvoiceDetail: (id: string): Promise<ApiResponse<MyInvoiceDetailResponse>> => {
    return axiosClient.get(`/me/invoices/${id}`);
  }
};

export default myInvoiceApi;

