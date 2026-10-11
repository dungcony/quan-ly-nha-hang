import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Banknote, CreditCard, Landmark, Printer } from 'lucide-react';
import { billingApi, type InvoiceCreatePayload } from '@/api/billingApi';
import type { InvoiceDetail } from '@/api/invoiceApi';
import InvoiceReceipt from '@/components/features/InvoiceReceipt';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getErrorCode, getErrorDetail, getFormErrorMessage } from '@/utils/apiError';
import { formatVnd } from '@/utils/format';
import { ORDER_ITEM_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/utils/labels';
import { cn } from '@/utils/cn';
import type { OrderItemStatus, PaymentMethod } from '@/utils/apiTypes';

const ITEM_TONE: Record<OrderItemStatus, BadgeTone> = {
  PENDING: 'amber',
  COOKING: 'orange',
  READY: 'green',
  SERVED: 'slate',
  CANCELLED: 'red',
};

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  CARD: CreditCard,
  BANK_TRANSFER: Landmark,
};

// các mệnh giá gợi ý nhanh khi khách trả tiền mặt
const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

const darkInput =
  'w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

export default function PosPaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [received, setReceived] = useState('');
  const [note, setNote] = useState('');
  const [confirmUnservedOpen, setConfirmUnservedOpen] = useState(false);
  const [unservedCount, setUnservedCount] = useState(0);
  // hóa đơn vừa tạo, có thì chuyển sang màn in
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ['payment-summary', orderId],
    queryFn: () => billingApi.getPaymentSummary(orderId as string).then((res) => res.data),
    enabled: !!orderId && invoice === null,
    refetchInterval: invoice ? false : 10_000,
    staleTime: 0,
  });

  const total = summary?.total_amount ?? 0;
  const receivedAmount = Number(received) || 0;
  const change = Math.max(receivedAmount - total, 0);
  const cashShort = method === 'CASH' && receivedAmount < total;

  const payMutation = useMutation({
    mutationFn: (confirmUnserved: boolean) => {
      const payload: InvoiceCreatePayload = {
        order_id: orderId as string,
        payment_method: method,
        amount_received: method === 'CASH' ? receivedAmount : undefined,
        note: note.trim() || undefined,
        confirm_unserved: confirmUnserved,
      };
      return billingApi.createInvoice(payload);
    },
    onSuccess: (res) => {
      setConfirmUnservedOpen(false);
      setInvoice(res.data);
      toast.success(`Đã thanh toán, hóa đơn ${res.data.code}`);
      queryClient.invalidateQueries({ queryKey: ['open-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) => {
      const code = getErrorCode(err);
      if (code === 'INVOICE_UNSERVED_ITEMS') {
        // còn món chưa mang ra: hỏi lại Thu ngân trước khi thanh toán
        setUnservedCount(getErrorDetail<{ unserved_count?: number }>(err)?.unserved_count ?? summary?.unserved_count ?? 0);
        setConfirmUnservedOpen(true);
        return;
      }
      setConfirmUnservedOpen(false);
      toast.error(getFormErrorMessage(err, 'Không thanh toán được'));
      if (code === 'ORDER_NOT_OPEN' || code === 'INVOICE_ORDER_EMPTY') {
        queryClient.invalidateQueries({ queryKey: ['payment-summary', orderId] });
      }
    },
  });

  if (invoice) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-xl bg-white p-4 text-slate-900 shadow-xl">
          <InvoiceReceipt invoice={invoice} />
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700"
          >
            <Printer className="size-4" />
            In hóa đơn
          </button>
          <button
            type="button"
            onClick={() => navigate('/pos/payment')}
            className="flex-1 rounded-lg border border-slate-600 py-3 font-semibold text-slate-200 hover:bg-slate-800"
          >
            Xong
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link to="/pos/payment" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      {isLoading ? (
        <Spinner />
      ) : isError || !summary ? (
        <EmptyState error message={getFormErrorMessage(error, 'Không tải được thông tin thanh toán của đơn.')} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* chi tiết đơn */}
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-5 lg:col-span-3">
            <h2 className="text-xl font-bold text-slate-100">Bàn {summary.table.name}</h2>
            <ul className="mt-4 divide-y divide-slate-700 text-sm">
              {summary.lines.map((line, index) => (
                <li key={index} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium text-slate-100">
                      {line.quantity} × {line.dish_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatVnd(line.unit_price)} ·{' '}
                      <Badge tone={ITEM_TONE[line.status]}>{ORDER_ITEM_STATUS_LABELS[line.status]}</Badge>
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-semibold text-slate-100">{formatVnd(line.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-slate-700 pt-4 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span>{formatVnd(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({Math.round(summary.vat_rate * 10000) / 100}%)</span>
                <span>{formatVnd(summary.vat_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-amber-400">
                <span>Tổng cộng</span>
                <span>{formatVnd(summary.total_amount)}</span>
              </div>
            </div>
            {summary.unserved_count > 0 && (
              <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
                Còn {summary.unserved_count} món chưa phục vụ. Kiểm tra với nhân viên phục vụ trước khi thanh toán.
              </p>
            )}
          </section>

          {/* thanh toán */}
          <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5 lg:col-span-2">
            <h3 className="font-semibold text-slate-100">Phương thức thanh toán</h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => {
                const Icon = METHOD_ICON[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium',
                      method === m
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    <Icon className="size-5" />
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                );
              })}
            </div>

            {method === 'CASH' && (
              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Tiền khách đưa (VND)</label>
                <input
                  className={darkInput}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={received}
                  // VND không có phần thập phân (SRS 3.3) nên bỏ mọi ký tự không phải số
                  onChange={(e) => setReceived(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập số tiền"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-slate-700 px-3 py-1 text-xs text-slate-100 hover:bg-slate-600"
                    onClick={() => setReceived(String(total))}
                  >
                    Đủ tiền
                  </button>
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="rounded-md bg-slate-700 px-3 py-1 text-xs text-slate-100 hover:bg-slate-600"
                      onClick={() => setReceived(String(amount))}
                    >
                      {amount.toLocaleString('vi-VN')}
                    </button>
                  ))}
                </div>
                <div className={cn('flex justify-between text-sm', cashShort ? 'text-red-400' : 'text-emerald-400')}>
                  <span>{cashShort ? 'Còn thiếu' : 'Tiền thối'}</span>
                  <span className="font-semibold">{formatVnd(cashShort ? total - receivedAmount : change)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-slate-300">Ghi chú hóa đơn</label>
              <input
                className={darkInput}
                maxLength={255}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: xuất hóa đơn công ty"
              />
            </div>

            <button
              type="button"
              disabled={payMutation.isPending || cashShort || summary.lines.length === 0}
              onClick={() => payMutation.mutate(false)}
              className="w-full rounded-lg bg-emerald-600 py-3 text-base font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {payMutation.isPending ? 'Đang xử lý...' : `Thanh toán ${formatVnd(total)}`}
            </button>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmUnservedOpen}
        title="Còn món chưa phục vụ"
        message={`Còn ${unservedCount} món chưa được phục vụ. Vẫn thanh toán và đóng đơn?`}
        confirmLabel="Vẫn thanh toán"
        loading={payMutation.isPending}
        onConfirm={() => payMutation.mutate(true)}
        onCancel={() => setConfirmUnservedOpen(false)}
      />
    </div>
  );
}
