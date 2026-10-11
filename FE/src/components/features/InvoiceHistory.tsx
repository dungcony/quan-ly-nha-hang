import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Eye } from 'lucide-react';
import { invoiceApi, type InvoiceDetail, type InvoiceSearchQuery } from '@/api/invoiceApi';
import InvoiceReceipt from '@/components/features/InvoiceReceipt';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { btnPrimary, btnSecondary, iconBtn, inputClass, tableHeadClass } from '@/components/ui/forms';
import { getErrorMessage, getFormErrorMessage } from '@/utils/apiError';
import { formatDateTime, formatVnd } from '@/utils/format';
import { PAYMENT_METHOD_LABELS } from '@/utils/labels';
import type { PaymentMethod } from '@/utils/apiTypes';

const PAGE_SIZE = 10;

interface InvoiceHistoryProps {
  // Thu ngân chỉ thấy hóa đơn trong ngày nên không có bộ lọc ngày
  scope: 'today' | 'all';
}

export default function InvoiceHistory({ scope }: InvoiceHistoryProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState<InvoiceSearchQuery>({});
  const [draft, setDraft] = useState({ code: '', table: '', from_date: '', to_date: '', payment_method: '' });
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  // bản in lại thay thế bản đang xem để khung in hiện dòng "BẢN IN LẠI"
  const [reprinted, setReprinted] = useState<InvoiceDetail | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoices', scope, filters, page],
    queryFn: () => invoiceApi.search({ ...filters, page, page_size: PAGE_SIZE, sort_by: 'paid_at', sort_order: 'desc' }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['invoice', viewingId],
    queryFn: () => invoiceApi.get(viewingId as string).then((res) => res.data),
    enabled: viewingId !== null,
  });

  const reprintMutation = useMutation({
    mutationFn: (id: string) => invoiceApi.reprint(id),
    onSuccess: (res) => {
      setReprinted(res.data);
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      // chờ khung bản in lại hiển thị xong mới mở hộp thoại in
      window.setTimeout(() => window.print(), 150);
    },
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không in lại được hóa đơn')),
  });

  const closeDetail = () => {
    setViewingId(null);
    setReprinted(null);
  };

  const invalidRange = !!draft.from_date && !!draft.to_date && draft.from_date > draft.to_date;

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    if (invalidRange) return;
    setPage(1);
    setFilters({
      code: draft.code.trim() || undefined,
      table: draft.table.trim() || undefined,
      from_date: draft.from_date || undefined,
      to_date: draft.to_date || undefined,
      payment_method: (draft.payment_method as PaymentMethod) || undefined,
    });
  };

  const shown = reprinted ?? detail;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-xl font-bold">{scope === 'today' ? 'Hóa đơn hôm nay' : 'Lịch sử hóa đơn'}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {scope === 'today' ? 'Thu ngân chỉ xem và in lại hóa đơn trong ngày' : 'Toàn bộ hóa đơn đã thanh toán'}
        </p>
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <input
          className={`${inputClass} w-44`}
          placeholder="Mã hóa đơn"
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value })}
        />
        <input
          className={`${inputClass} w-36`}
          placeholder="Tên bàn"
          value={draft.table}
          onChange={(e) => setDraft({ ...draft, table: e.target.value })}
        />
        {scope === 'all' && (
          <>
            <input
              className={`${inputClass} w-40`}
              type="date"
              title="Từ ngày"
              value={draft.from_date}
              onChange={(e) => setDraft({ ...draft, from_date: e.target.value })}
            />
            <input
              className={`${inputClass} w-40`}
              type="date"
              title="Đến ngày"
              value={draft.to_date}
              onChange={(e) => setDraft({ ...draft, to_date: e.target.value })}
            />
          </>
        )}
        <select
          className={`${inputClass} w-44`}
          value={draft.payment_method}
          onChange={(e) => setDraft({ ...draft, payment_method: e.target.value })}
        >
          <option value="">Mọi phương thức</option>
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
        <button type="submit" className={btnSecondary} disabled={invalidRange}>
          <Search className="size-4" />
          Tìm
        </button>
      </form>
      {invalidRange && <p className="border-b border-slate-200 px-6 py-2 text-sm text-red-600">Ngày bắt đầu không được sau ngày kết thúc.</p>}

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message={getErrorMessage(error, 'Không tải được danh sách hóa đơn.')} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          message={
            Object.values(filters).some(Boolean)
              ? 'Không tìm thấy hóa đơn nào thỏa mãn tiêu chí tìm kiếm.'
              : scope === 'today'
                ? 'Hôm nay chưa có hóa đơn nào.'
                : 'Chưa có hóa đơn nào.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Mã hóa đơn</th>
                <th className="px-6 py-3">Bàn</th>
                <th className="px-6 py-3">Thanh toán lúc</th>
                <th className="px-6 py-3">Phương thức</th>
                <th className="px-6 py-3 text-right">Tổng tiền</th>
                <th className="px-6 py-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs">{invoice.code}</td>
                  <td className="px-6 py-3">{invoice.table_name}</td>
                  <td className="px-6 py-3">{formatDateTime(invoice.paid_at)}</td>
                  <td className="px-6 py-3">{PAYMENT_METHOD_LABELS[invoice.payment_method]}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatVnd(invoice.total_amount)}</td>
                  <td className="px-6 py-3 text-right">
                    <button type="button" className={iconBtn} onClick={() => setViewingId(invoice.id)} aria-label="Xem hóa đơn">
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} />

      <Modal
        open={viewingId !== null}
        title="Hóa đơn"
        onClose={closeDetail}
        size="md"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={closeDetail}>
              Đóng
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={!shown || reprintMutation.isPending}
              onClick={() => viewingId && reprintMutation.mutate(viewingId)}
            >
              {reprintMutation.isPending ? 'Đang xử lý...' : 'In lại hóa đơn'}
            </button>
          </>
        }
      >
        {isDetailLoading || !shown ? (
          <Spinner />
        ) : (
          <>
            <InvoiceReceipt invoice={shown} />
            <p className="mt-3 text-center text-xs text-slate-500">Đã in lại {shown.print_count} lần</p>
          </>
        )}
      </Modal>
    </div>
  );
}
