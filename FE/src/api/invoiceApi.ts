import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, PageResponse, PaymentMethod } from '@/utils/apiTypes';

export interface InvoiceSummary {
  id: string;
  code: string;
  table_name: string;
  paid_at: string;
  total_amount: number;
  payment_method: PaymentMethod;
}

export interface InvoiceItem {
  dish_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface InvoiceDetail {
  id: string;
  code: string;
  status: 'PAID';
  table_name: string;
  cashier_name: string;
  paid_at: string;
  items: InvoiceItem[];
  subtotal: number;
  // tỷ lệ VAT dạng thập phân, ví dụ 0.08
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  amount_received: number;
  change_amount: number;
  note: string | null;
  print_count: number;
  // chỉ true ở kết quả của lần in lại
  reprint: boolean;
}

export interface InvoiceSearchQuery {
  code?: string;
  from_date?: string;
  to_date?: string;
  table?: string;
  payment_method?: PaymentMethod;
  page?: number;
  page_size?: number;
  sort_by?: 'paid_at' | 'total_amount' | 'code';
  sort_order?: 'asc' | 'desc';
}

export const invoiceApi = {
  // Thu ngân chỉ thấy hóa đơn trong ngày, Quản lý thấy toàn bộ
  search: (params: InvoiceSearchQuery): Promise<ApiResponse<PageResponse<InvoiceSummary>>> =>
    axiosClient.get('/invoices', { params }),

  get: (id: string): Promise<ApiResponse<InvoiceDetail>> => axiosClient.get(`/invoices/${id}`),

  // in lại làm tăng print_count nên dùng POST
  reprint: (id: string): Promise<ApiResponse<InvoiceDetail>> => axiosClient.post(`/invoices/${id}/reprint`),
};
