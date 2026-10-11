import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, Search, Send, Trash2, UtensilsCrossed } from 'lucide-react';
import { menuApi, type DishSummaryResponse } from '@/api/menuApi';
import { orderApi, type OrderDetail } from '@/api/orderApi';
import { tableApi } from '@/api/tableApi';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getErrorCode, getErrorDetail, getFormErrorMessage } from '@/utils/apiError';
import { formatTime, formatVnd } from '@/utils/format';
import { ORDER_ITEM_STATUS_LABELS, TABLE_STATUS_LABELS } from '@/utils/labels';
import { assetUrl } from '@/utils/assetUrl';
import { cn } from '@/utils/cn';
import type { OrderItemStatus } from '@/utils/apiTypes';

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

const ITEM_TONE: Record<OrderItemStatus, BadgeTone> = {
  PENDING: 'amber',
  COOKING: 'orange',
  READY: 'green',
  SERVED: 'slate',
  CANCELLED: 'red',
};

interface CartLine {
  dish: DishSummaryResponse;
  quantity: number;
  note: string;
}

const darkInput =
  'w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

export default function PosOrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  // món vừa bị BE từ chối vì hết hoặc ngừng bán, tô đỏ trong thực đơn và giỏ
  const [blockedDishIds, setBlockedDishIds] = useState<string[]>([]);

  const orderKey = ['open-order', tableId];

  const tableQuery = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => tableApi.getTable(tableId as string).then((res) => res.data),
    enabled: !!tableId,
    staleTime: 0,
  });

  // đơn đang mở của bàn; làm tươi 5 giây để thấy Bếp đổi trạng thái món
  const orderQuery = useQuery({
    queryKey: orderKey,
    queryFn: async (): Promise<OrderDetail | null> => {
      const list = await orderApi.search({ status: 'OPEN', table_id: tableId, page_size: 1 });
      const first = list.data.items[0];
      return first ? (await orderApi.get(first.id)).data : null;
    },
    enabled: !!tableId,
    refetchInterval: 5000,
    staleTime: 0,
  });

  const categoriesQuery = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => menuApi.getCategories().then((res) => res.data),
  });

  const dishesQuery = useQuery({
    queryKey: ['menu-dishes', activeCategory, search],
    queryFn: () =>
      menuApi
        .getDishes({ category_id: activeCategory || undefined, name: search.trim() || undefined, page_size: 100 })
        .then((res) => res.data.items),
    staleTime: 30_000,
  });

  const order = orderQuery.data ?? null;
  const table = tableQuery.data;

  const openMutation = useMutation({
    mutationFn: () => orderApi.open(tableId as string),
    onSuccess: (res) => {
      queryClient.setQueryData(orderKey, res.data);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table', tableId] });
      toast.success('Đã mở đơn cho bàn');
    },
    onError: (err) => {
      toast.error(getFormErrorMessage(err, 'Không mở được đơn'));
      queryClient.invalidateQueries({ queryKey: ['table', tableId] });
      queryClient.invalidateQueries({ queryKey: orderKey });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (current: OrderDetail) => {
      const items = Object.values(cart).map((line) => ({
        dish_id: line.dish.id,
        quantity: line.quantity,
        note: line.note.trim() || undefined,
      }));
      return orderApi.addItems(current.id, items);
    },
    onSuccess: (res) => {
      setCart({});
      setBlockedDishIds([]);
      queryClient.setQueryData(orderKey, res.data);
      toast.success('Đã gửi món xuống bếp');
    },
    onError: (err) => {
      const code = getErrorCode(err);
      if (code === 'DISH_NOT_ORDERABLE') {
        const ids = getErrorDetail<{ dish_ids?: string[] }>(err)?.dish_ids ?? [];
        setBlockedDishIds(ids);
        const names = ids.map((id) => cart[id]?.dish.name).filter(Boolean);
        toast.error(names.length ? `Món đã hết hoặc ngừng bán: ${names.join(', ')}` : getFormErrorMessage(err, 'Có món không gọi được'));
        queryClient.invalidateQueries({ queryKey: ['menu-dishes'] });
      } else {
        toast.error(getFormErrorMessage(err, 'Không gửi được món'));
        if (code === 'ORDER_NOT_OPEN') queryClient.invalidateQueries({ queryKey: orderKey });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => orderApi.cancelEmpty(id),
    onSuccess: () => {
      toast.success('Đã hủy đơn trống');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      navigate('/pos/tables');
    },
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không hủy được đơn')),
  });

  const addDish = (dish: DishSummaryResponse) => {
    if (dish.status !== 'AVAILABLE') return;
    if (!cart[dish.id] && Object.keys(cart).length >= MAX_LINES) {
      toast.error(`Mỗi lần gửi tối đa ${MAX_LINES} dòng món`);
      return;
    }
    setBlockedDishIds((prev) => prev.filter((id) => id !== dish.id));
    setCart((prev) => {
      const line = prev[dish.id];
      return { ...prev, [dish.id]: { dish, note: line?.note ?? '', quantity: Math.min((line?.quantity ?? 0) + 1, MAX_QUANTITY) } };
    });
  };

  const changeQuantity = (dishId: string, delta: number) => {
    setCart((prev) => {
      const line = prev[dishId];
      if (!line) return prev;
      const quantity = line.quantity + delta;
      if (quantity < 1) {
        const { [dishId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dishId]: { ...line, quantity: Math.min(quantity, MAX_QUANTITY) } };
    });
  };

  const changeNote = (dishId: string, note: string) => {
    setCart((prev) => (prev[dishId] ? { ...prev, [dishId]: { ...prev[dishId], note } } : prev));
  };

  const cartLines = Object.values(cart);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.dish.price * line.quantity, 0);

  if (!tableId) {
    return <EmptyState message="Chưa chọn bàn." />;
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem)] lg:flex-row">
      {/* thực đơn */}
      <section className="flex min-h-0 flex-1 flex-col border-b border-slate-800 lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <Link to="/pos/tables" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Về sơ đồ bàn">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Bàn {table?.name ?? '...'}</h2>
              {table && <p className="text-xs text-slate-400">{TABLE_STATUS_LABELS[table.status]}</p>}
            </div>
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input className={cn(darkInput, 'pl-9')} placeholder="Tìm món..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory('')}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
                activeCategory === '' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              Tất cả
            </button>
            {categoriesQuery.data?.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
                  activeCategory === category.id ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {dishesQuery.isLoading ? (
            <Spinner />
          ) : dishesQuery.isError ? (
            <EmptyState error message="Không tải được thực đơn." />
          ) : !dishesQuery.data || dishesQuery.data.length === 0 ? (
            <EmptyState message="Không có món nào phù hợp." />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {dishesQuery.data.map((dish) => {
                const soldOut = dish.status !== 'AVAILABLE';
                const blocked = blockedDishIds.includes(dish.id);
                const inCart = cart[dish.id]?.quantity;
                return (
                  <button
                    key={dish.id}
                    type="button"
                    disabled={soldOut || !order}
                    onClick={() => addDish(dish)}
                    className={cn(
                      'relative overflow-hidden rounded-xl border text-left transition-colors',
                      soldOut || blocked ? 'border-red-500/40 bg-slate-800/40 opacity-70' : 'border-slate-700 bg-slate-800 hover:border-amber-500',
                      !order && 'cursor-not-allowed'
                    )}
                  >
                    {dish.image_url ? (
                      <img src={assetUrl(dish.image_url)} alt={dish.name} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-slate-700/50 text-slate-500">
                        <UtensilsCrossed className="size-6" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-100">{dish.name}</p>
                      <p className="mt-1 text-sm text-amber-400">
                        {formatVnd(dish.price)}
                        <span className="text-xs text-slate-400"> / {dish.unit}</span>
                      </p>
                    </div>
                    {soldOut && (
                      <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">Hết món</span>
                    )}
                    {inCart && (
                      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900">
                        {inCart}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* đơn hàng và giỏ */}
      <aside className="flex min-h-0 w-full flex-col bg-slate-950 lg:w-[26rem]">
        {orderQuery.isLoading ? (
          <Spinner />
        ) : orderQuery.isError ? (
          <EmptyState error message="Không tải được đơn của bàn." />
        ) : !order ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-slate-300">
              {table?.status === 'AVAILABLE'
                ? 'Bàn này chưa có đơn. Mở đơn để bắt đầu gọi món.'
                : table?.status === 'RESERVED'
                  ? 'Bàn đã được đặt trước. Nhận bàn ở mục Đặt bàn khi khách đến.'
                  : 'Bàn này hiện không mở được đơn.'}
            </p>
            {table?.status === 'AVAILABLE' && (
              <button
                type="button"
                onClick={() => openMutation.mutate()}
                disabled={openMutation.isPending}
                className="rounded-lg bg-amber-600 px-6 py-2.5 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {openMutation.isPending ? 'Đang mở đơn...' : 'Mở đơn'}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {/* giỏ nháp chưa gửi bếp */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-500">Chờ gửi bếp</h3>
                {cartLines.length === 0 ? (
                  <p className="text-sm text-slate-500">Chọn món ở bên trái để thêm vào đơn.</p>
                ) : (
                  <ul className="space-y-3">
                    {cartLines.map((line) => (
                      <li
                        key={line.dish.id}
                        className={cn(
                          'rounded-lg border p-3',
                          blockedDishIds.includes(line.dish.id) ? 'border-red-500 bg-red-500/10' : 'border-slate-700 bg-slate-900'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-slate-100">{line.dish.name}</span>
                          <span className="whitespace-nowrap text-sm text-slate-300">{formatVnd(line.dish.price * line.quantity)}</span>
                        </div>
                        {blockedDishIds.includes(line.dish.id) && (
                          <p className="mt-1 text-xs text-red-400">Món đã hết hoặc ngừng bán, hãy bỏ khỏi đơn.</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded bg-slate-700 p-1 text-slate-200 hover:bg-slate-600"
                            onClick={() => changeQuantity(line.dish.id, -1)}
                            aria-label="Giảm"
                          >
                            {line.quantity === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-slate-100">{line.quantity}</span>
                          <button
                            type="button"
                            className="rounded bg-slate-700 p-1 text-slate-200 hover:bg-slate-600"
                            onClick={() => changeQuantity(line.dish.id, 1)}
                            aria-label="Tăng"
                          >
                            <Plus className="size-4" />
                          </button>
                          <input
                            className={cn(darkInput, 'ml-2 py-1')}
                            placeholder="Ghi chú (không hành, ít cay...)"
                            maxLength={255}
                            value={line.note}
                            onChange={(e) => changeNote(line.dish.id, e.target.value)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* các món đã gửi bếp */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Đã gọi</h3>
                {order.items.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có món nào được gửi bếp.</p>
                ) : (
                  <ul className="space-y-2">
                    {order.items.map((item) => (
                      <li key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn('font-medium text-slate-100', item.status === 'CANCELLED' && 'line-through opacity-60')}>
                            {item.quantity} × {item.dish_name}
                          </span>
                          <Badge tone={ITEM_TONE[item.status]}>{ORDER_ITEM_STATUS_LABELS[item.status]}</Badge>
                        </div>
                        {item.note && <p className="mt-1 text-xs italic text-slate-400">Ghi chú: {item.note}</p>}
                        <p className="mt-1 text-xs text-slate-500">
                          Gửi {formatTime(item.sent_at)} · {formatVnd(item.line_total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-800 p-4">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Tạm tính đơn ({order.unserved_count} món chưa phục vụ)</span>
                <span className="font-semibold text-slate-100">{formatVnd(order.subtotal)}</span>
              </div>
              {cartLines.length > 0 && (
                <div className="flex justify-between text-sm text-amber-400">
                  <span>Đang chờ gửi</span>
                  <span className="font-semibold">+ {formatVnd(cartTotal)}</span>
                </div>
              )}
              <button
                type="button"
                disabled={cartLines.length === 0 || sendMutation.isPending}
                onClick={() => sendMutation.mutate(order)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="size-4" />
                {sendMutation.isPending ? 'Đang gửi...' : `Gửi bếp (${cartLines.length} món)`}
              </button>
              {order.items.length === 0 && (
                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(order.id)}
                  className="w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Hủy đơn trống
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
