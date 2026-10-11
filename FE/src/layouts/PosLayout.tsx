import { useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  ArrowLeft,
  MonitorPlay,
  LayoutGrid,
  BellRing,
  CalendarCheck,
  Receipt,
  History,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { orderApi } from '@/api/orderApi';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';
import { ROLE_LABELS } from '@/utils/labels';
import type { Role } from '@/utils/apiTypes';

interface PosNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  // các tiền tố đường dẫn làm sáng mục này, vì màn gọi món và thanh toán nằm dưới đường dẫn con
  activePrefixes: string[];
  // mục hiện huy hiệu số món đã xong chờ phục vụ
  showReadyBadge?: boolean;
}

const NAV_BY_ROLE: Partial<Record<Role, PosNavItem[]>> = {
  WAITER: [
    { label: 'Sơ đồ bàn', to: '/pos/tables', icon: LayoutGrid, activePrefixes: ['/pos/tables', '/pos/order'] },
    { label: 'Món chờ phục vụ', to: '/pos/serve', icon: BellRing, activePrefixes: ['/pos/serve'], showReadyBadge: true },
    { label: 'Đặt bàn', to: '/pos/reservations', icon: CalendarCheck, activePrefixes: ['/pos/reservations'] },
  ],
  CASHIER: [
    { label: 'Sơ đồ bàn', to: '/pos/tables', icon: LayoutGrid, activePrefixes: ['/pos/tables'] },
    { label: 'Thanh toán', to: '/pos/payment', icon: Receipt, activePrefixes: ['/pos/payment'] },
    { label: 'Hóa đơn hôm nay', to: '/pos/invoices', icon: History, activePrefixes: ['/pos/invoices'] },
  ],
};

// Phục vụ cần biết món đã xong ở bất kỳ màn nào, nên hỏi hàng đợi ở layout và báo khi có món mới (UC015)
function useReadyItemsAlert(enabled: boolean) {
  const toast = useToast();
  const seenIds = useRef<Set<string> | null>(null);

  const { data } = useQuery({
    queryKey: ['ready-items'],
    queryFn: () => orderApi.readyItems().then((res) => res.data),
    refetchInterval: 5000,
    staleTime: 0,
    enabled,
  });

  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.map((item) => item.id));
    // lần tải đầu chỉ ghi nhận, không báo những món đã xong từ trước
    if (seenIds.current) {
      const fresh = data.filter((item) => !seenIds.current!.has(item.id));
      if (fresh.length > 0) {
        const tables = [...new Set(fresh.map((item) => item.table_name))].join(', ');
        toast.success(`Có ${fresh.length} món vừa xong, mang ra bàn ${tables}`);
      }
    }
    seenIds.current = ids;
  }, [data, toast]);

  return data?.length ?? 0;
}

export default function PosLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItems = (user && NAV_BY_ROLE[user.role]) || [];
  const readyCount = useReadyItemsAlert(user?.role === 'WAITER');

  const isActive = (item: PosNavItem) => item.activePrefixes.some((prefix) => location.pathname.startsWith(prefix));

  const badge = (item: PosNavItem) =>
    item.showReadyBadge && readyCount > 0 ? (
      <span className="ml-auto rounded-full bg-red-600 px-1.5 text-xs font-bold text-white md:absolute md:right-1 md:top-1 lg:static" aria-label={`${readyCount} món chờ phục vụ`}>
        {readyCount}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row text-slate-100">
      {/* điện thoại: thanh trên cùng; máy tính bảng trở lên: sidebar trái (SRS 3.1) */}
      <header className="h-14 shrink-0 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 md:hidden">
        <div className="flex items-center gap-2 text-amber-500 font-bold">
          <MonitorPlay className="size-5" />
          <span>POS</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={cn(
                'relative rounded-md p-2.5',
                isActive(item) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <item.icon className="size-5" />
              {item.showReadyBadge && readyCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{readyCount}</span>
              )}
            </Link>
          ))}
          <button onClick={logout} className="p-2.5 text-slate-400 hover:text-red-400 rounded-md" title="Đăng xuất" aria-label="Đăng xuất">
            <LogOut className="size-5" />
          </button>
        </nav>
      </header>

      <aside className="hidden md:flex md:w-16 lg:w-60 shrink-0 flex-col bg-slate-950 border-r border-slate-800 md:h-screen md:sticky md:top-0">
        <div className="h-14 flex items-center justify-center lg:justify-start lg:px-4 gap-2 border-b border-slate-800 text-amber-500 font-bold text-lg">
          <MonitorPlay className="size-6 shrink-0" />
          <span className="hidden lg:inline">POS System</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1" aria-label="Chức năng">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={cn(
                'relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-3 text-sm font-medium',
                isActive(item) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
              {badge(item)}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-2 space-y-1">
          <Link
            to="/account/profile"
            title="Thông tin cá nhân và đổi mật khẩu"
            className="flex items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <UserRound className="size-5 shrink-0" />
            <span className="hidden lg:block min-w-0 text-left">
              <span className="block truncate font-semibold text-white">{user?.full_name}</span>
              <span className="block text-xs text-amber-500">{user ? ROLE_LABELS[user.role] : ''}</span>
            </span>
          </Link>
          <Link
            to="/"
            title="Về trang chủ"
            className="flex items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <ArrowLeft className="size-5 shrink-0" />
            <span className="hidden lg:inline">Về trang chủ</span>
          </Link>
          <button
            onClick={logout}
            title="Đăng xuất"
            className="w-full flex items-center justify-center lg:justify-start gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800/50"
          >
            <LogOut className="size-5 shrink-0" />
            <span className="hidden lg:inline">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* nội dung chức năng ở bên phải */}
      <main className="flex-1 min-w-0 overflow-auto relative">
        <Outlet />
      </main>
    </div>
  );
}
