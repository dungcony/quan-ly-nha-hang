import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCheck } from 'lucide-react';
import { orderApi } from '@/api/orderApi';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getErrorCode, getFormErrorMessage } from '@/utils/apiError';
import { formatTime, minutesSince } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function PosServePage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // hàng đợi món đã xong, làm tươi 5 giây; tối đa 200 dòng, cũ nhất lên trước
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ready-items'],
    queryFn: () => orderApi.readyItems().then((res) => res.data),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const serveMutation = useMutation({
    mutationFn: (itemId: string) => orderApi.markServed(itemId),
    onSuccess: () => {
      toast.success('Đã xác nhận phục vụ');
      queryClient.invalidateQueries({ queryKey: ['ready-items'] });
    },
    onError: (err) => {
      // món đã có người khác xác nhận phục vụ trước
      toast.error(
        getErrorCode(err) === 'ORDER_ITEM_STATUS_CONFLICT'
          ? 'Món này đã được nhân viên khác phục vụ.'
          : getFormErrorMessage(err, 'Không xác nhận được phục vụ')
      );
      queryClient.invalidateQueries({ queryKey: ['ready-items'] });
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <BellRing className="size-6 text-amber-500" />
          Món chờ phục vụ
        </h2>
        <p className="mt-1 text-sm text-slate-400">Bếp đã làm xong, mang ra bàn rồi bấm xác nhận. Danh sách tự làm tươi mỗi 5 giây.</p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message="Không tải được danh sách món chờ." />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Chưa có món nào chờ phục vụ." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((item) => {
            const waited = minutesSince(item.ready_at);
            return (
              <li key={item.id} className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-lg font-bold text-amber-400">Bàn {item.table_name}</span>
                    <span className={cn('text-xs font-medium', waited >= 5 ? 'text-red-400' : 'text-slate-400')}>
                      Xong lúc {formatTime(item.ready_at)} · {waited} phút trước
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-100">
                    {item.quantity} × {item.dish_name}
                  </p>
                  {item.note && <p className="mt-1 text-sm italic text-slate-400">Ghi chú: {item.note}</p>}
                </div>
                <button
                  type="button"
                  disabled={serveMutation.isPending}
                  onClick={() => serveMutation.mutate(item.id)}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCheck className="size-4" />
                  Đã phục vụ
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
