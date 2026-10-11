import type { InvoiceDetail } from '@/api/invoiceApi';
import { formatDateTime, formatVnd } from '@/utils/format';
import { PAYMENT_METHOD_LABELS } from '@/utils/labels';
import { RESTAURANT_INFO } from '@/utils/restaurantInfo';

// khung hóa đơn; phần có id print-area là phần duy nhất được in (xem index.css)
export default function InvoiceReceipt({ invoice }: { invoice: InvoiceDetail }) {
  const vatPercent = Math.round(invoice.vat_rate * 10000) / 100;

  return (
    <div id="print-area" className="mx-auto w-full max-w-sm bg-white p-4 font-mono text-xs text-slate-900">
      <div className="text-center">
        <h3 className="text-base font-bold">{RESTAURANT_INFO.name}</h3>
        <p className="font-bold">HÓA ĐƠN THANH TOÁN</p>
        {invoice.reprint && <p className="mt-1 font-bold">*** BẢN IN LẠI ***</p>}
      </div>

      <div className="mt-3 space-y-0.5">
        <p>Số: {invoice.code}</p>
        <p>Bàn: {invoice.table_name}</p>
        <p>Thu ngân: {invoice.cashier_name}</p>
        <p>Thời gian: {formatDateTime(invoice.paid_at)}</p>
      </div>

      <table className="mt-3 w-full border-y border-dashed border-slate-400">
        <thead>
          <tr className="text-left">
            <th className="py-1">Món</th>
            <th className="py-1 text-right">SL</th>
            <th className="py-1 text-right">Đơn giá</th>
            <th className="py-1 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index} className="align-top">
              <td className="py-0.5 pr-1">{item.dish_name}</td>
              <td className="py-0.5 text-right">{item.quantity}</td>
              <td className="py-0.5 text-right">{item.unit_price.toLocaleString('vi-VN')}</td>
              <td className="py-0.5 text-right">{item.line_total.toLocaleString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 space-y-0.5">
        <div className="flex justify-between">
          <span>Tạm tính</span>
          <span>{formatVnd(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT ({vatPercent}%)</span>
          <span>{formatVnd(invoice.vat_amount)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
          <span>TỔNG CỘNG</span>
          <span>{formatVnd(invoice.total_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Thanh toán</span>
          <span>{PAYMENT_METHOD_LABELS[invoice.payment_method]}</span>
        </div>
        {/* thẻ và chuyển khoản thanh toán đúng số tiền nên không có tiền khách đưa và tiền thối */}
        {invoice.payment_method === 'CASH' && (
          <>
            <div className="flex justify-between">
              <span>Tiền khách đưa</span>
              <span>{formatVnd(invoice.amount_received)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tiền thối</span>
              <span>{formatVnd(invoice.change_amount)}</span>
            </div>
          </>
        )}
      </div>

      {invoice.note && <p className="mt-3">Ghi chú: {invoice.note}</p>}
      <p className="mt-4 text-center">Cảm ơn quý khách và hẹn gặp lại!</p>
    </div>
  );
}
