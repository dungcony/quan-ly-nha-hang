import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Receipt, TrendingUp } from 'lucide-react';
import { reportApi } from '@/api/reportApi';
import { reservationApi } from '@/api/reservationApi';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatVnd, monthStartIso, todayIso } from '@/utils/format';

function StatCard({
  title,
  value,
  note,
  tone,
  to,
}: {
  title: string;
  value: string;
  note?: string;
  tone: string;
  to?: string;
}) {
  const body = (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-2 font-medium text-slate-500">{title}</h3>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function AdminDashboard() {
  const today = todayIso();
  const monthStart = monthStartIso();

  // làm tươi mỗi phút để số liệu trong ngày không bị cũ
  const refetchInterval = 60_000;

  const todayRevenue = useQuery({
    queryKey: ['dashboard-revenue-today', today],
    queryFn: () => reportApi.dailyRevenue({ from_date: today, to_date: today }).then((res) => res.data.summary),
    refetchInterval,
    staleTime: 0,
  });

  const monthRevenue = useQuery({
    queryKey: ['dashboard-revenue-month', monthStart, today],
    queryFn: () => reportApi.dailyRevenue({ from_date: monthStart, to_date: today }).then((res) => res.data.summary),
    refetchInterval,
    staleTime: 0,
  });

  const pendingReservations = useQuery({
    queryKey: ['dashboard-pending-reservations'],
    queryFn: () => reservationApi.search({ status: 'PENDING', page: 1, page_size: 1 }).then((res) => res.data.meta.total_items),
    refetchInterval,
    staleTime: 0,
  });

  const topDishes = useQuery({
    queryKey: ['dashboard-top-dishes', monthStart, today],
    queryFn: () => reportApi.topDishes({ from_date: monthStart, to_date: today, top_n: 5 }).then((res) => res.data.items),
    refetchInterval,
    staleTime: 0,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Doanh thu hôm nay"
          value={todayRevenue.isLoading ? '...' : formatVnd(todayRevenue.data?.total_amount)}
          note="Đã gồm VAT"
          tone="text-slate-900"
          to="/admin/reports"
        />
        <StatCard
          title="Hóa đơn hôm nay"
          value={todayRevenue.isLoading ? '...' : String(todayRevenue.data?.invoice_count ?? 0)}
          tone="text-blue-600"
          to="/admin/invoices"
        />
        <StatCard
          title="Doanh thu tháng này"
          value={monthRevenue.isLoading ? '...' : formatVnd(monthRevenue.data?.total_amount)}
          note={`${monthRevenue.data?.invoice_count ?? 0} hóa đơn`}
          tone="text-emerald-600"
          to="/admin/reports"
        />
        <StatCard
          title="Đặt bàn chờ xác nhận"
          value={pendingReservations.isLoading ? '...' : String(pendingReservations.data ?? 0)}
          tone="text-amber-600"
          to="/admin/reservations"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
            <TrendingUp className="size-4 text-amber-600" />
            Món bán chạy trong tháng
          </h3>
          {topDishes.isLoading ? (
            <Spinner />
          ) : !topDishes.data || topDishes.data.length === 0 ? (
            <EmptyState message="Chưa có món nào được bán trong tháng này." />
          ) : (
            <ol className="space-y-2 text-sm">
              {topDishes.data.map((dish, index) => (
                <li key={dish.dish_id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                  <span>
                    <span className="mr-3 font-bold text-slate-400">{index + 1}</span>
                    <span className="font-medium text-slate-800">{dish.dish_name}</span>
                  </span>
                  <span className="text-slate-500">
                    {dish.quantity} phần · {formatVnd(dish.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800">Lối tắt</h3>
          <div className="space-y-2 text-sm">
            <Link to="/admin/reservations" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50">
              <CalendarCheck className="size-4 text-amber-600" />
              Xử lý đặt bàn
            </Link>
            <Link to="/admin/invoices" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50">
              <Receipt className="size-4 text-amber-600" />
              Tra cứu hóa đơn
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
