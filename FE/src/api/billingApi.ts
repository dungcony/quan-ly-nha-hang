import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse, OrderItemStatus, PaymentMethod } from '@/utils/apiTypes';
import type { TableBrief } from '@/api/reservationApi';
import type { InvoiceDetail } from '@/api/invoiceApi';

export interface PaymentLine {
  dish_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  // trạng thái dòng món, dùng để cảnh báo món chưa phục vụ
  status: OrderItemStatus;
}

export interface PaymentSummary {
  order_id: string;
  table: TableBrief;
  opened_at: string;
  lines: PaymentLine[];
  subtotal: number;
  // tỷ lệ VAT dạng thập phân, ví dụ 0.08
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  unserved_count: number;
}

export interface InvoiceCreatePayload {
  order_id: string;
  payment_method: PaymentMethod;
  // chỉ gửi khi trả tiền mặt; thẻ và chuyển khoản BE tự lấy bằng tổng tiền
  amount_received?: number;
  note?: string;
  confirm_unserved: boolean;
}

export const billingApi = {
  // tóm tắt thanh toán của đơn đang mở, kèm VAT và tổng tiền
  getPaymentSummary: (orderId: string): Promise<ApiResponse<PaymentSummary>> => axiosClient.get(`/billing/orders/${orderId}`),

  // tạo hóa đơn và đóng đơn; mỗi đơn chỉ có một hóa đơn nên gửi trùng sẽ bị BE từ chối
  createInvoice: (data: InvoiceCreatePayload): Promise<ApiResponse<InvoiceDetail>> => axiosClient.post('/invoices', data),
};
