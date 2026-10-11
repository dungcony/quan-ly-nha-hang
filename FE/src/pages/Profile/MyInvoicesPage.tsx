import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Printer, ReceiptText } from 'lucide-react';
import { myInvoiceApi } from '@/api/myInvoiceApi';
import InvoiceReceipt from '@/components/features/InvoiceReceipt';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';
import { btnSecondary, iconBtn, tableHeadClass } from '@/components/ui/forms';
import { formatDateTime, formatVnd } from '@/utils/format';
import { PAYMENT_METHOD_LABELS } from '@/utils/labels';

const PAGE_SIZE = 10;

export default function MyInvoicesPage() {
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-invoices', page],
    queryFn: () => myInvoiceApi.getMyInvoices({ page, page_size: PAGE_SIZE }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: ['my-invoice', detailId],
    queryFn: () => myInvoiceApi.getMyInvoiceDetail(detailId as string).then((res) => res.data),
    enabled: !!detailId,
  });

  const invoices = data?.items ?? [];

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Lịch sử hóa đơn</h2>
          <p className="text-sm text-slate-500 mt-1">Danh sách các hóa đơn bạn đã thanh toán</p>
        </div>

        {isLoading ? (
          <Spinner label="Đang tải danh sách hóa đơn..." />
        ) : isError ? (
          <EmptyState error message="Không tải được danh sách hóa đơn. Vui lòng thử lại sau." />
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 px-6">
            <ReceiptText className="size-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Chưa có hóa đơn nào</h3>
            <p className="text-slate-500 text-sm">Bạn chưa có hóa đơn nào gắn với tài khoản này.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Mã hóa đơn</th>
                    <th className="px-4 py-3">Bàn</th>
                    <th className="px-4 py-3">Thanh toán lúc</th>
                    <th className="px-4 py-3">Phương thức</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                    <th className="px-4 py-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">{inv.code}</td>
                      <td className="px-4 py-3 text-slate-600">{inv.table_name}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(inv.paid_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{PAYMENT_METHOD_LABELS[inv.payment_method]}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700">{formatVnd(inv.total_amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" className={iconBtn} onClick={() => setDetailId(inv.id)} aria-label={`Xem hóa đơn ${inv.code}`}>
                          <Eye className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={!!detailId}
        title="Chi tiết hóa đơn"
        onClose={() => setDetailId(null)}
        footer={
          <button type="button" className={btnSecondary} onClick={() => window.print()} disabled={!detail.data}>
            <Printer className="size-4" />
            In hóa đơn
          </button>
        }
      >
        {detail.isLoading ? (
          <Spinner />
        ) : detail.isError || !detail.data ? (
          <EmptyState error message="Không tải được chi tiết hóa đơn." />
        ) : (
          <InvoiceReceipt invoice={detail.data} />
        )}
      </Modal>
    </div>
  );
}
