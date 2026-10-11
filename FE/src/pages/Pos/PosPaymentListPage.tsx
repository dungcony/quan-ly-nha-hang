import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { orderApi } from '@/api/orderApi';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatTime, formatVnd, minutesSince } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function PosPaymentListPage() {
  // đơn đang mở của mọi bàn, cũ nhất lên trước; làm tươi 10 giây
  const { data, isLoading, isError } = useQuery({
    queryKey: ['open-orders'],
    queryFn: () => orderApi.search({ status: 'OPEN', page_size: 100, sort_by: 'opened_at', sort_order: 'asc' }).then((res) => res.data.items),
    refetchInterval: 10_000,
    staleTime: 0,
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Receipt className="size-6 text-amber-500" />
          Thanh toán
        </h2>
        <p className="mt-1 text-sm text-slate-400">Chọn đơn của bàn khách muốn thanh toán</p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message="Không tải được danh sách đơn." />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Hiện không có đơn nào đang mở." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.map((order) => {
            const empty = order.item_count === 0;
            const card = (
              <div
                className={cn(
                  'h-full rounded-xl border p-4 transition-colors',
                  empty ? 'border-slate-700 bg-slate-800/50 opacity-60' : 'border-slate-700 bg-slate-800 hover:border-amber-500'
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xl font-bold text-amber-400">Bàn {order.table.name}</span>
                  <span className="text-xs text-slate-400">
                    {formatTime(order.opened_at)} · {minutesSince(order.opened_at)} phút
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">Phục vụ: {order.waiter_name}</p>
                <p className="text-sm text-slate-300">{empty ? 'Chưa có món nào' : `${order.item_count} dòng món`}</p>
                <p className="mt-3 text-lg font-semibold text-slate-100">{formatVnd(order.subtotal)}</p>
              </div>
            );
            return (
              <li key={order.id}>
                {empty ? card : <Link to={`/pos/payment/${order.id}`}>{card}</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
