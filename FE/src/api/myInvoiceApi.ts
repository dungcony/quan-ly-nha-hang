import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse } from '@/utils/apiTypes';
import type { InvoiceDetail, InvoiceSummary } from '@/api/invoiceApi';

export interface MyInvoiceQuery {
  page?: number;
  page_size?: number;
}

export const myInvoiceApi = {
  // hóa đơn đã thanh toán của chính khách hàng, mới nhất trước
  getMyInvoices: (params?: MyInvoiceQuery): Promise<ApiResponse<PageResponse<InvoiceSummary>>> =>
    axiosClient.get('/me/invoices', { params }),

  // chi tiết hóa đơn: món, số lượng, VAT, tổng tiền, phương thức thanh toán
  getMyInvoiceDetail: (id: string): Promise<ApiResponse<InvoiceDetail>> => axiosClient.get(`/me/invoices/${id}`),
};

export default myInvoiceApi;
