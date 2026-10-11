import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, Hourglass, ChefHat, Check } from 'lucide-react';
import { kitchenApi, type KitchenItem } from '@/api/kitchenApi';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getErrorCode, getFormErrorMessage } from '@/utils/apiError';
import { formatTime, minutesSince } from '@/utils/format';
import { cn } from '@/utils/cn';

// quá ngưỡng này thì thẻ chuyển màu để Bếp ưu tiên
const WARN_MINUTES = 8;
const LATE_MINUTES = 15;

function KitchenCard({
  item,
  busy,
  onAction,
}: {
  item: KitchenItem;
  busy: boolean;
  onAction: (item: KitchenItem) => void;
}) {
  const cooking = item.status === 'COOKING';
  const waited = minutesSince(item.sent_at);
  const border = waited >= LATE_MINUTES ? 'border-l-red-500' : waited >= WARN_MINUTES ? 'border-l-amber-500' : 'border-l-emerald-500';

  return (
    <div className={cn('overflow-hidden rounded-xl border-l-4 bg-white shadow-sm', border)}>
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <span className="text-lg font-bold text-slate-800 2xl:text-3xl">Bàn {item.table_name}</span>
        <span
          className={cn(
            'text-sm font-medium 2xl:text-xl',
            waited >= LATE_MINUTES ? 'text-red-600' : waited >= WARN_MINUTES ? 'text-amber-600' : 'text-slate-500'
          )}
        >
          {waited} phút · gửi {formatTime(item.sent_at)}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-lg font-semibold text-slate-800 2xl:text-3xl">
          {item.quantity} × {item.dish_name}
        </p>
        {item.note && <p className="rounded bg-amber-50 px-2 py-1 text-sm italic text-amber-800 2xl:text-xl">Ghi chú: {item.note}</p>}
        {cooking && item.started_at && <p className="text-xs text-slate-500">Bắt đầu làm lúc {formatTime(item.started_at)}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(item)}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold transition-colors disabled:opacity-50 2xl:py-4 2xl:text-2xl',
            cooking ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          )}
        >
          {cooking ? <Check className="size-4" /> : <Flame className="size-4" />}
          {cooking ? 'Xong' : 'Nhận làm'}
        </button>
      </div>
    </div>
  );
}

export default function KitchenDashboard() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // làm tươi 5 giây để món mới của Phục vụ hiện lên ngay
  const { data, isLoading, isError } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: () => kitchenApi.getQueue().then((res) => res.data),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const actionMutation = useMutation({
    mutationFn: (item: KitchenItem) => (item.status === 'PENDING' ? kitchenApi.start(item.id) : kitchenApi.ready(item.id)),
    onSuccess: (_res, item) => {
      toast.success(item.status === 'PENDING' ? `Đã nhận làm: ${item.dish_name}` : `Đã xong: ${item.dish_name}`);
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
    },
    onError: (err) => {
      toast.error(
        getErrorCode(err) === 'ORDER_ITEM_STATUS_CONFLICT'
          ? 'Món này đã có người xử lý.'
          : getFormErrorMessage(err, 'Không cập nhật được món')
      );
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
    },
  });

  const pending = data?.filter((i) => i.status === 'PENDING') ?? [];
  const cooking = data?.filter((i) => i.status === 'COOKING') ?? [];

  const column = (title: string, icon: ReactNode, items: KitchenItem[], emptyText: string) => (
    <section>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-orange-900 2xl:text-3xl">
        {icon}
        {title}
        <span className="rounded-full bg-orange-200 px-2.5 py-0.5 text-sm text-orange-800">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-orange-200 bg-white/60 p-6 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-6">
          {items.map((item) => (
            <KitchenCard key={item.id} item={item} busy={actionMutation.isPending} onAction={(i) => actionMutation.mutate(i)} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-orange-900">
        <ChefHat className="size-6" />
        <h2 className="text-2xl font-bold 2xl:text-4xl">Đơn hàng chờ xử lý</h2>
        <span className="ml-2 text-sm text-slate-500">Tự làm tươi mỗi 5 giây</span>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message="Không tải được hàng đợi bếp." />
      ) : pending.length === 0 && cooking.length === 0 ? (
        <EmptyState message="Không có món nào cần chế biến." />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {column('Chờ chế biến', <Hourglass className="size-5" />, pending, 'Không có món nào đang chờ.')}
          {column('Đang chế biến', <Flame className="size-5" />, cooking, 'Chưa có món nào đang làm.')}
        </div>
      )}
    </div>
  );
}
