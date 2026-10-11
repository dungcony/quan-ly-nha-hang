import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCheck, ChevronLeft, ChevronRight, Copy, Minus, Plus, Search, Send, Trash2, UtensilsCrossed } from 'lucide-react';
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

// mỗi dòng giỏ có khóa riêng để cùng một món có thể gọi nhiều dòng với ghi chú khác nhau (backend cho phép)
interface CartLine {
  key: string;
  dish: DishSummaryResponse;
  quantity: number;
  note: string;
}

const MENU_PAGE_SIZE = 100;
let lineSeq = 0;
const nextLineKey = () => `line-${++lineSeq}`;

const darkInput =
  'w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

export default function PosOrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [menuPage, setMenuPage] = useState(1);
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
    queryKey: ['menu-dishes', activeCategory, search, menuPage],
    queryFn: () =>
      menuApi
        .getDishes({ category_id: activeCategory || undefined, name: search.trim() || undefined, page: menuPage, page_size: MENU_PAGE_SIZE })
        .then((res) => res.data),
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
      const items = cart.map((line) => ({
        dish_id: line.dish.id,
        quantity: line.quantity,
        note: line.note.trim() || undefined,
      }));
      return orderApi.addItems(current.id, items);
    },
    onSuccess: (res) => {
      setCart([]);
      setBlockedDishIds([]);
      queryClient.setQueryData(orderKey, res.data);
      toast.success('Đã gửi món xuống bếp');
    },
    onError: (err) => {
      const code = getErrorCode(err);
      if (code === 'DISH_NOT_ORDERABLE') {
        const ids = getErrorDetail<{ dish_ids?: string[] }>(err)?.dish_ids ?? [];
        setBlockedDishIds(ids);
        const names = [...new Set(cart.filter((line) => ids.includes(line.dish.id)).map((line) => line.dish.name))];
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

  // chạm vào món: cộng thêm vào dòng cùng món chưa ghi chú, chưa có thì mở dòng mới
  const addDish = (dish: DishSummaryResponse) => {
    if (dish.status !== 'AVAILABLE') return;
    const existing = cart.find((line) => line.dish.id === dish.id && line.note.trim() === '');
    if (!existing && cart.length >= MAX_LINES) {
      toast.error(`Mỗi lần gửi tối đa ${MAX_LINES} dòng món`);
      return;
    }
    setBlockedDishIds((prev) => prev.filter((id) => id !== dish.id));
    setCart((prev) => {
      const index = prev.findIndex((line) => line.dish.id === dish.id && line.note.trim() === '');
      if (index < 0) return [...prev, { key: nextLineKey(), dish, note: '', quantity: 1 }];
      return prev.map((line, i) => (i === index ? { ...line, quantity: Math.min(line.quantity + 1, MAX_QUANTITY) } : line));
    });
  };

  // tách thêm một dòng cùng món để ghi chú khác (VD một phần không hành, một phần ít cay)
  const splitLine = (key: string) => {
    if (cart.length >= MAX_LINES) {
      toast.error(`Mỗi lần gửi tối đa ${MAX_LINES} dòng món`);
      return;
    }
    setCart((prev) => {
      const index = prev.findIndex((line) => line.key === key);
      if (index < 0) return prev;
      const copy: CartLine = { key: nextLineKey(), dish: prev[index].dish, quantity: 1, note: '' };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((line) => {
        if (line.key !== key) return [line];
        const quantity = line.quantity + delta;
        return quantity < 1 ? [] : [{ ...line, quantity: Math.min(quantity, MAX_QUANTITY) }];
      })
    );
  };

  const changeNote = (key: string, note: string) => {
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, note } : line)));
  };

  const serveMutation = useMutation({
    mutationFn: (itemId: string) => orderApi.markServed(itemId),
    onSuccess: () => {
      toast.success('Đã xác nhận phục vụ');
      queryClient.invalidateQueries({ queryKey: orderKey });
      queryClient.invalidateQueries({ queryKey: ['ready-items'] });
    },
    onError: (err) => {
      toast.error(
        getErrorCode(err) === 'ORDER_ITEM_STATUS_CONFLICT'
          ? 'Món này đã được nhân viên khác phục vụ.'
          : getFormErrorMessage(err, 'Không xác nhận được phục vụ')
      );
      queryClient.invalidateQueries({ queryKey: orderKey });
    },
  });

  const cartLines = cart;
  const cartTotal = cartLines.reduce((sum, line) => sum + line.dish.price * line.quantity, 0);

  if (!tableId) {
    return <EmptyState message="Chưa chọn bàn." />;
  }

  return (
    <div className="flex flex-col md:h-screen md:flex-row">
      {/* thực đơn */}
      <section className="flex min-h-0 flex-1 flex-col border-b border-slate-800 md:border-b-0 md:border-r">
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
              <input className={cn(darkInput, 'pl-9')} placeholder="Tìm món..." value={search} onChange={(e) => { setSearch(e.target.value); setMenuPage(1); }} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => { setActiveCategory(''); setMenuPage(1); }}
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
                onClick={() => { setActiveCategory(category.id); setMenuPage(1); }}
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
          ) : !dishesQuery.data || dishesQuery.data.items.length === 0 ? (
            <EmptyState message="Không tìm thấy món ăn nào thỏa mãn điều kiện tìm kiếm." />
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {dishesQuery.data.items.map((dish) => {
                const soldOut = dish.status !== 'AVAILABLE';
                const blocked = blockedDishIds.includes(dish.id);
                const inCart = cart.filter((line) => line.dish.id === dish.id).reduce((sum, line) => sum + line.quantity, 0);
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
                    {inCart > 0 && (
                      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900">
                        {inCart}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {dishesQuery.data && dishesQuery.data.meta.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-300">
              <button
                type="button"
                disabled={menuPage <= 1}
                onClick={() => setMenuPage((p) => p - 1)}
                className="rounded-lg bg-slate-800 p-2.5 hover:bg-slate-700 disabled:opacity-40"
                aria-label="Trang món trước"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span>
                Trang {dishesQuery.data.meta.page}/{dishesQuery.data.meta.total_pages}
              </span>
              <button
                type="button"
                disabled={menuPage >= dishesQuery.data.meta.total_pages}
                onClick={() => setMenuPage((p) => p + 1)}
                className="rounded-lg bg-slate-800 p-2.5 hover:bg-slate-700 disabled:opacity-40"
                aria-label="Trang món sau"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* đơn hàng và giỏ */}
      <aside className="flex min-h-0 w-full flex-col bg-slate-950 md:w-[22rem] lg:w-[26rem]">
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
                        key={line.key}
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
                            className="rounded-lg bg-slate-700 p-2.5 text-slate-200 hover:bg-slate-600"
                            onClick={() => changeQuantity(line.key, -1)}
                            aria-label={line.quantity === 1 ? 'Bỏ món' : 'Giảm'}
                          >
                            {line.quantity === 1 ? <Trash2 className="size-5" /> : <Minus className="size-5" />}
                          </button>
                          <span className="w-8 text-center text-base font-semibold text-slate-100">{line.quantity}</span>
                          <button
                            type="button"
                            className="rounded-lg bg-slate-700 p-2.5 text-slate-200 hover:bg-slate-600"
                            onClick={() => changeQuantity(line.key, 1)}
                            aria-label="Tăng"
                          >
                            <Plus className="size-5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-slate-700 p-2.5 text-slate-200 hover:bg-slate-600"
                            onClick={() => splitLine(line.key)}
                            aria-label="Thêm dòng cùng món với ghi chú khác"
                            title="Thêm dòng cùng món với ghi chú khác"
                          >
                            <Copy className="size-5" />
                          </button>
                        </div>
                        <input
                          className={cn(darkInput, 'mt-2')}
                          placeholder="Ghi chú (không hành, ít cay...)"
                          maxLength={255}
                          value={line.note}
                          onChange={(e) => changeNote(line.key, e.target.value)}
                        />
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
                        {item.status === 'READY' && (
                          <button
                            type="button"
                            disabled={serveMutation.isPending}
                            onClick={() => serveMutation.mutate(item.id)}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCheck className="size-4" />
                            Đã phục vụ
                          </button>
                        )}
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
